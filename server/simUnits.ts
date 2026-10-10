// ---------------------------------------------------------------------------
// THE UNIT REGISTRY (shard M1, W1 THE UNIT FABRIC): the host half of the sim
// units (docs/design/shard-m1-plan.md section 2; docs/engine/shard.md "THE SIM
// UNITS, W1"). One World per live zone: THE KEEPER (the World a shard always
// had: the chart, the WorldSim, the clock, the account, the world sweeps) and
// a UNIT per other live zone, each a fresh World booted into its zone with
// the keeper's world-level fields pinned onto it (engine/shardUnits.ts).
//
//   THE SEAT LEDGER    one answer to "where is this seat": a seat in a unit
//                      has a row; a seat with none stands in the keeper (a
//                      join lands at the hearth). A hand-off moves the row, a
//                      leave deletes it.
//   THE HEARTH ALIAS   the keeper hosts whatever zone it stands in; on the
//   THE WILDS LAW      Unbroken Wilds it hosts the whole surface (MASS_ZONE,
//                      START_ZONE, every zoneMap id) and only pockets wake.
//   THE WAKE           a ticket whose destination has no unit boots one: a
//                      staged World under a throwaway account, its parked
//                      warden, the host's published fields, THE PIN in, then
//                      the zone load under THE WAKE CONTEXT.
//   THE SLEEP          a unit seatless for UNIT_CFG.unitLinger runs the
//                      departure's leave verbs (its zone memory captured as a
//                      departure captures it) and drops; THE SOFT CAP sleeps
//                      the longest-seatless one at once past maxUnits.
//   THE HAND-OFF QUEUE roads, intents and the muster enqueue tickets; the
//                      host drains them after every unit ticked: detach in
//                      the source, attach in the destination.
//   THE UNIT BREAKER   a unit (never the keeper) faulting faultBreakerTicks
//                      ticks in a row hands its seats to the hearth and drops
//                      without a capture (its state is suspect).
//   TENANCY            (W4, card 25 RULED 2026-10-10) a pocket is shared by
//                      default; one whose def says `tenancy: 'party'` wakes a
//                      unit per party (`${zoneId}#${partyId}`, an ungrouped
//                      seat's `seat:<id>`), resolved here from the pocket's
//                      own word for every road into it. THE INSTANCE FORGETS:
//                      an instance pins neither the shared memory map nor the
//                      world's clears (engine/shardUnits.ts INSTANCE_OWN_FIELDS),
//                      so it wakes fresh, captures nothing at its sleep or for
//                      the world save, and keeps its clears its own.
//
// Node side (server/), owned whole by W1; W2 fills the ticket makers, W3 the
// dispatch, W4 instances (THE MUSTER RING is server/muster.ts).
// ---------------------------------------------------------------------------

import { World, type Seat } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import type { ClassDef } from '../src/data/classes';
import { START_ZONE } from '../src/data/zones';
import { MASS_ZONE } from '../src/worldmass/preset';
import { makeAccount } from '../src/meta/account';
import {
  INSTANCE_OWN_FIELDS, UNIT_CFG, attachSeat, detachSeat, pinIn, pinOut, unitClocks,
  type RoadLanding, type RoadTicket, type SeatPacket, type UnitClocks, type UnitKey,
} from '../src/engine/shardUnits';
import { shardRoadArrive, shardRoadDepart } from '../src/engine/shardRoads';

/** One live World of the shard (plan section 2). */
export interface SimUnit {
  key: UnitKey;
  world: World;
  role: 'keeper' | 'unit';
  /** TENANCY's instance key (W4: the party's id, or `seat:<id>`); absent = the zone's shared unit. */
  instance?: string;
  /** THE LINGER's clock: world time the unit last became seatless (null = seated). */
  emptySince: number | null;
  /** World time the unit woke (the keeper: its boot). */
  awakeSince: number;
  /** The wire per unit (moved off ShardHost): the zone message and THE DRESS BEAT. */
  lastSentZone: string;
  lastSentDoodadRev: number;
  dressTimer: number;
  /** THE UNIT SHADOW's hysteresis (the focus seat's id). */
  focusId: string | null;
  /** THE UNIT BREAKER: consecutive faulting ticks, and the trip. */
  faults: number;
  broken: boolean;
}

/** What the registry needs from its host. */
export interface UnitHooks {
  /** THE UNIT WARDEN: the parked p0 every unit stands (the keeper's class and name). */
  wardenClass: ClassDef;
  wardenName: string;
  /** THE MERCY's clock on every warden. */
  reviveSec: number;
  /** HOST class: publish the host's fields into a World it runs (the timeflow
   *  policies, the party, the link) at boot, at wake and on change. */
  publish(w: World, u: SimUnit): void;
  /** THE HEARTH SEAT (THE UNIT BREAKER lands its seats there). */
  hearth(): { x: number; y: number; tier: number };
  /** THE UNIT BREAKER's threshold (SHARD_CFG.faultBreakerTicks). */
  breakerTicks(): number;
  /** TENANCY (W4): the instance a seat walks into a party pocket under (its
   *  party's id; an ungrouped seat's own `seat:<id>`). */
  instanceOf(seatId: string): string;
  log(line: string): void;
}

/** THE DESKS PER UNIT (plan 3.6): how the vessel and corpse desks reach the
 *  World a seat stands in. Every read that was `this.world` reads the seat's own. */
export interface SeatWorlds {
  /** The keeper's World: the hearth, the clock, the account (a join lands here). */
  keeperWorld(): World;
  worldOf(seatId: string): World | undefined;
  seatOf(seatId: string): Seat | undefined;
  allSeats(): Seat[];
  /** Two seats in one unit (positions comparable). */
  together(a: string, b: string): boolean;
  /** Run inside the seat's own unit, under THE PIN. */
  within<T>(seatId: string, fn: (w: World) => T): T | undefined;
}

/** A hand-off that landed: the host's grace, zone message and log. */
export type ArrivalHook = (seat: Seat, to: SimUnit, from: SimUnit, woke: boolean, ticket: RoadTicket) => void;

export class UnitRegistry implements SeatWorlds {
  readonly keeper: SimUnit;
  /** Awake units by key (the keeper not among them). */
  private readonly units = new Map<UnitKey, SimUnit>();
  /** THE SEAT LEDGER: seats standing in a unit (absent = the keeper's, or nowhere). */
  private readonly ledger = new Map<string, UnitKey>();
  /** THE HAND-OFF QUEUE. */
  private readonly queue: RoadTicket[] = [];
  /** THE PIN's guard: the unit a run is inside (runs never nest across units). */
  private active: SimUnit | null = null;
  private order: SimUnit[] | null = null;
  /** THE ONE CLOCK's reading of the tick in flight (beginTick; cleared once every
   *  unit ran): a dispatch into a unit that has not stepped yet enters there. */
  private tickClocks: UnitClocks | null = null;
  /** THE SPLIT DISPATCH's deferrals: work one unit sent to another World's zone,
   *  run at the drain (never a pin inside a pin). */
  private readonly deferred: { zoneId: string; fn: (w: World) => unknown }[] = [];
  /** The executor's word to the host (set by ShardHost). */
  onArrive: ArrivalHook | null = null;
  /** Ledgers since boot (the status page's and the probe's read). */
  handoffs = 0;
  wakes = 0;
  sleeps = 0;
  breaks = 0;
  refusals = 0;

  constructor(keeperWorld: World, private readonly hooks: UnitHooks) {
    this.keeper = {
      key: 'keeper', world: keeperWorld, role: 'keeper', emptySince: null, awakeSince: keeperWorld.time,
      lastSentZone: '', lastSentDoodadRev: -1, dressTimer: 0, focusId: null, faults: 0, broken: false,
    };
  }

  /** The keeper's World was replaced before any socket opened (THE WILDS SAVE's fallback). */
  rebindKeeper(world: World): void {
    this.keeper.world = world;
    this.keeper.awakeSince = world.time;
    this.hooks.publish(world, this.keeper);
  }

  // ---- reads --------------------------------------------------------------
  keeperWorld(): World { return this.keeper.world; }
  /** Every live unit: the keeper first (it drains every world queue first), then by key. */
  each(): readonly SimUnit[] {
    return this.order ??= [this.keeper, ...[...this.units.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))];
  }
  /** Awake units, the keeper not counted. */
  get size(): number { return this.units.size; }
  unit(key: UnitKey): SimUnit | undefined { return key === 'keeper' ? this.keeper : this.units.get(key); }
  /** THE SEAT LEDGER's answer. */
  unitOf(seatId: string): SimUnit | undefined {
    const key = this.ledger.get(seatId);
    if (key !== undefined) return this.units.get(key);
    return this.keeper.world.seats.some(s => s.id === seatId) ? this.keeper : undefined;
  }
  worldOf(seatId: string): World | undefined { return this.unitOf(seatId)?.world; }
  /** A player seat by id, in whichever unit it stands (never a warden). */
  seatOf(seatId: string): Seat | undefined { return this.worldOf(seatId)?.seats.find(s => s.id === seatId && !s.keeper); }
  /** A unit's player seats (its warden excluded). */
  seatsOf(u: SimUnit): Seat[] { return u.world.seats.filter(s => !s.keeper); }
  /** Every player seat in every unit (the desks read this). */
  allSeats(): Seat[] { return this.each().flatMap(u => this.seatsOf(u)); }
  /** Are two seats in the same unit (positions comparable, a kneel possible)? */
  together(a: string, b: string): boolean { const u = this.unitOf(a); return !!u && u === this.unitOf(b); }
  /** THE OCCUPIED LAW's source (W3): every live World, the keeper's first, then
   *  each awake unit's by key (a broken unit is no ground). */
  worlds(): readonly World[] { return this.each().filter(u => !u.broken).map(u => u.world); }
  /** THE LINGER FREEZE (W3): a seatless unit stands still through its linger
   *  (UNIT_CFG.freezeLinger); the keeper never freezes. */
  frozen(u: SimUnit): boolean { return UNIT_CFG.freezeLinger && u.role === 'unit' && u.emptySince !== null; }

  /** THE HEARTH ALIAS + THE WILDS LAW: the awake unit hosting `zoneId`, read
   *  off each World's LIVE zone (a probe's direct loadZone moves its unit). */
  unitFor(zoneId: string, instance?: string): SimUnit | undefined {
    if (instance !== undefined) return this.units.get(`${zoneId}#${instance}`);
    const k = this.keeper.world;
    if (k.massRuntime ? zoneId === MASS_ZONE || zoneId === START_ZONE || !!k.zoneMap[zoneId] : zoneId === k.zone.id) return this.keeper;
    for (const u of this.units.values()) if (!u.broken && !u.instance && u.world.zone.id === zoneId) return u;
    return undefined;
  }

  /** THE ROADS PER PLAYER: the live seed of the awake unit hosting `zoneId`,
   *  undefined when none is awake (the town portal's faded check: an awake
   *  zone's stored memory row is stale until it sleeps). TENANCY: for a seat,
   *  a party pocket answers with that seat's party's own instance. */
  liveSeedOf(zoneId: string, seatId?: string): number | undefined {
    const u = this.unitFor(zoneId, seatId !== undefined ? this.instanceFor(seatId, zoneId) : undefined);
    return u ? u.world.shardRoadHost().currentZoneSeed : undefined;
  }

  /** TENANCY (W4, card 25): the instance a seat walking into `zoneId` lands in,
   *  read off the pocket's own word (ZoneDef.tenancy 'party' = its party's own;
   *  anything else = undefined, the shared unit). */
  private instanceFor(seatId: string, zoneId: string): string | undefined {
    const k = this.keeper.world;
    return (k.caveMap[zoneId] ?? k.zoneMap[zoneId])?.tenancy === 'party' ? this.hooks.instanceOf(seatId) : undefined;
  }

  // ---- THE PIN around every entry into a unit -----------------------------
  /** Run `fn` inside a unit: THE PIN in (the clocks at `clocks`, default the
   *  keeper's now), the unit as the global policy owner, THE PIN out in a
   *  finally (a throw never strands a reassigned reference). The keeper runs
   *  bare: it is the canonical owner. */
  run<T>(u: SimUnit, fn: (w: World) => T, clocks?: UnitClocks): T {
    if (u.role === 'keeper' || this.active === u) return fn(u.world);
    if (this.active) throw new Error(`THE PIN: unit ${u.key} entered inside unit ${this.active.key}`);
    const k = this.keeper.world, w = u.world;
    // THE INSTANCE FORGETS: an instance keeps its own memory map and clears (never pinned).
    const entry = pinIn(k, w, clocks ?? unitClocks(k), u.instance !== undefined ? INSTANCE_OWN_FIELDS : undefined);
    this.active = u;
    try { return w.withGlobalPolicies(() => fn(w)); }
    finally { this.active = null; pinOut(k, w, entry); }
  }
  /** Run `fn` in the unit a seat stands in (undefined when it stands nowhere). */
  within<T>(seatId: string, fn: (w: World) => T): T | undefined {
    const u = this.unitOf(seatId);
    return u ? this.run(u, fn) : undefined;
  }
  /** THE SPLIT DISPATCH's host: the World standing in `zoneId` itself, the
   *  keeper's live zone first, else an awake shared unit's. THE WILDS LAW's
   *  travel alias never answers here: zone-local work belongs to the World
   *  that stands in the zone (on the wilds the keeper stands in the surface,
   *  never in a graph zone a road ticket would alias to it). An instanced unit
   *  (TENANCY, W4) hosts no zone's dispatch: its ground is its party's alone, so
   *  a world sweep's zone half lands in the shared World standing there (or
   *  nowhere), while THE OCCUPIED LAW still counts the instance as occupied. */
  private hostOf(zoneId: string): SimUnit | undefined {
    if (this.keeper.world.zone.id === zoneId) return this.keeper;
    for (const u of this.units.values()) if (!u.broken && !u.instance && u.world.zone.id === zoneId) return u;
    return undefined;
  }
  /** THE ONE CLOCK's reading for this tick (the keeper's, before any World
   *  stepped): every unit enters its step at it, and so does a dispatch into a
   *  unit before that unit's step. */
  beginTick(): UnitClocks {
    return (this.tickClocks = unitClocks(this.keeper.world));
  }
  /** THE SPLIT DISPATCH (W3, World.atZone's shard branch): run `fn` on the World
   *  hosting `zoneId` and return its answer; undefined when none is awake. The
   *  keeper's sweeps call it from the keeper's bare run, so the unit enters
   *  under its own pin at THE ONE CLOCK's reading (a frozen unit included: its
   *  zone is awake ground, and the work waits there for a seat's return). From
   *  inside another unit's run the work is deferred to the drain (a pin never
   *  opens inside a pin, and the keeper is never entered with a unit's stale
   *  alias fields) and answers undefined. */
  dispatch<T>(zoneId: string, fn: (w: World) => T): T | undefined {
    const u = this.hostOf(zoneId);
    if (!u) return undefined;
    if (this.active && this.active !== u) { this.deferred.push({ zoneId, fn }); return undefined; }
    return this.run(u, fn, this.tickClocks ?? undefined);
  }

  // ---- THE HAND-OFF QUEUE -------------------------------------------------
  enqueue(t: RoadTicket): void { this.queue.push(t); }
  /** Execute every queued ticket (after all units ticked). One faulting
   *  hand-off never stops the rest. THE SPLIT DISPATCH's deferrals run first,
   *  in the Worlds hosting their zones now (every World reads the keeper's
   *  clocks again: the tick's units all stepped). */
  drain(): void {
    this.tickClocks = null;
    while (this.deferred.length) {
      const d = this.deferred.shift()!;
      try { this.dispatch(d.zoneId, d.fn); }
      catch (e) { this.hooks.log(`[shard] a deferred dispatch to ${d.zoneId} faulted: ${e instanceof Error ? e.stack ?? e.message : String(e)}`); }
    }
    // THE ROADS PER PLAYER: one road per seat per drain. A second ticket for a
    // seat already moved this drain was decided in the unit it just left.
    const moved = new Set<string>();
    while (this.queue.length) {
      const t = this.queue.shift()!;
      if (moved.has(t.seatId)) { this.hooks.log(`[shard] ${t.seatId}'s second road this tick (to ${t.dest}) dropped`); continue; }
      try { if (this.execute(t)) moved.add(t.seatId); }
      catch (e) { this.hooks.log(`[shard] the hand-off of ${t.seatId} to ${t.dest} faulted: ${e instanceof Error ? e.stack ?? e.message : String(e)}`); }
    }
  }
  /** THE DIRECT ROAD (the probes' and the dev lane's door; W2's roads emit
   *  tickets instead): move a seat to `dest` now. Between ticks only. Returns
   *  the unit it landed in, or null (refused, unknown, nothing to do). */
  travel(seatId: string, dest: string, landing?: RoadLanding): SimUnit | null {
    return this.execute({ seatId, dest, ...(landing ? { landing } : {}) });
  }

  private execute(t: RoadTicket): SimUnit | null {
    const src = this.unitOf(t.seatId);
    const k = this.keeper.world;
    if (!src || (!k.zoneMap[t.dest] && !k.caveMap[t.dest])) { this.refusals++; return null; }
    // TENANCY (W4): a party pocket is the traveller's party's own instance, whichever road leads in.
    const instance = t.instance ?? this.instanceFor(t.seatId, t.dest);
    if (instance !== undefined && t.instance === undefined) t = { ...t, instance };
    let dest = this.unitFor(t.dest, instance);
    if (dest === src) return src; // already there: a road into its own unit moves nothing
    // THE ROADS PER PLAYER: an absent edge is the source zone; null is none (a waypoint, a portal).
    const from = t.from === undefined ? src.world.zone.id : t.from;
    const now = k.time;
    const packet = this.run(src, w => detachSeat(w, t.seatId));
    if ('refused' in packet) {
      this.refusals++;
      this.hooks.log(`[shard] ${t.seatId} cannot travel to ${t.dest}: ${packet.refused}`);
      return null;
    }
    this.run(src, w => shardRoadDepart(w, t.seatId)); // the seat's door, ladder, grace and dwell leave with it
    let woke = false;
    try {
      if (!dest) { dest = this.wake({ ...t, from }); woke = true; }
    } catch (e) {
      // A wake that will not stand never strands the traveller: it walks back in where it stood.
      this.run(src, w => attachSeat(w, packet, { at: { x: packet.hero.pos.x, y: packet.hero.pos.y } }));
      throw e;
    }
    const warden = dest.world.localSeat.actor;
    const landing: RoadLanding = t.landing ?? (woke ? { at: { x: warden.pos.x, y: warden.pos.y } } : 'entry');
    this.land(dest, { ...packet, from }, landing, t, woke);
    if (src.role === 'unit' && !this.seatsOf(src).length) src.emptySince ??= now;
    this.handoffs++;
    this.onArrive?.(packet.seat, dest, src, woke, t);
    return dest;
  }

  /** Attach a packet in its destination and move THE SEAT LEDGER's row. THE
   *  ROADS PER PLAYER: a landing function resolves in the destination (after
   *  its wake), the road's per-seat rows install there (THE SEAT'S DOOR, THE
   *  SEAT'S LADDER, THE EXIT GRACE), then the road's own after-word runs. */
  private land(dest: SimUnit, packet: SeatPacket, landing: RoadLanding, t?: RoadTicket, woke = false): void {
    this.run(dest, w => {
      attachSeat(w, packet, typeof landing === 'function' ? landing(w) : landing);
      if (!t) return;
      shardRoadArrive(w, packet.seat, t, packet.from);
      t.after?.(w, packet.seat, woke);
    });
    if (dest.role === 'keeper') this.ledger.delete(packet.seat.id);
    else this.ledger.set(packet.seat.id, dest.key);
    dest.emptySince = null;
  }

  // ---- THE WAKE / THE SLEEP -------------------------------------------------
  /** Boot a unit for a ticket's destination (plan section 2, THE WAKE). */
  private wake(t: RoadTicket): SimUnit {
    const k = this.keeper.world;
    // 1. Staged: the keeper stays the global policy owner; the throwaway
    //    account keeps the constructor's reliquary rebuild off the shard's.
    const w = World.staged(makeAccount(), k.manifest);
    // 2. THE UNIT WARDEN, standing without generating the hearth.
    w.createPlayer(this.hooks.wardenClass, { name: this.hooks.wardenName, startingCompanions: false, startingFlasks: false, load: false });
    const warden = w.localSeat;
    warden.keeper = { reviveSec: this.hooks.reviveSec };
    const wa = warden.actor;
    wa.untargetable = true; wa.passive = true; wa.invulnerable = true; wa.levitates = true;
    const key = t.instance !== undefined ? `${t.dest}#${t.instance}` : t.dest;
    const u: SimUnit = {
      key, world: w, role: 'unit', ...(t.instance !== undefined ? { instance: t.instance } : {}),
      emptySince: null, awakeSince: k.time, lastSentZone: '', lastSentDoodadRev: -1, dressTimer: 0,
      focusId: null, faults: 0, broken: false,
    };
    // 3. The host's fields (THE PRIMARY GATE reads the link from the first frame).
    this.hooks.publish(w, u);
    // 4-7. THE PIN in, THE WAKE CONTEXT, the load, the first wake.
    this.run(u, uw => {
      const view = uw.shardUnitHost();
      view.adoptedZonePending = true; // the placeholder hearth is never captured into the shared memory
      if (t.ladder) { uw.caveReturn = t.ladder.caveReturn; view.caveStack = [...t.ladder.caveStack]; }
      uw.loadZone(t.dest, t.from ?? undefined);
      t.onFirstWake?.(uw);
    });
    u.lastSentZone = w.zone.id; // the arrival hears its zone directly (sendZoneTo); the unit's own beat starts here
    u.lastSentDoodadRev = w.doodadsVersion();
    this.units.set(key, u);
    this.order = null;
    this.wakes++;
    return u;
  }

  /** THE SLEEP: the departure's leave verbs under the pin (an instance and a
   *  broken unit skip the capture), then the unit drops. Never the keeper. */
  sleep(u: SimUnit): void {
    if (u.role === 'keeper' || !this.units.has(u.key)) return;
    if (!u.instance && !u.broken) this.run(u, w => w.sleepZone());
    this.units.delete(u.key);
    this.order = null;
    this.sleeps++;
  }

  /** THE LINGER and THE SOFT CAP, on the keeper's clock. */
  sweep(now: number): void {
    for (const u of this.units.values()) {
      if (this.seatsOf(u).length) u.emptySince = null;
      else u.emptySince ??= now;
    }
    for (const u of [...this.units.values()]) {
      if (u.emptySince !== null && now - u.emptySince >= UNIT_CFG.unitLinger) this.sleep(u);
    }
    while (this.units.size > UNIT_CFG.maxUnits) {
      let idle: SimUnit | null = null;
      for (const u of this.units.values()) if (u.emptySince !== null && (!idle || u.emptySince < idle.emptySince!)) idle = u;
      if (!idle) break;
      this.sleep(idle);
    }
  }

  /** THE PERSIST CAPTURE: every awake, shared unit writes its live memory row
   *  into the shared map before the keeper serializes (plan section 6). */
  captureAll(): void {
    for (const u of this.units.values()) if (!u.instance && !u.broken) this.run(u, w => w.captureLiveMemory());
  }

  // ---- THE UNIT BREAKER -----------------------------------------------------
  /** A unit's simulate phase threw this tick. */
  noteFault(u: SimUnit): void {
    if (u.role === 'keeper' || u.broken) return;
    if (++u.faults < this.hooks.breakerTicks()) return;
    u.broken = true;
    this.breaks++;
    const seats = this.seatsOf(u);
    this.hooks.log(`[shard] THE UNIT BREAKER: unit ${u.key} faulted ${u.faults} ticks running; ${seats.length} seat(s) go to the hearth and it drops uncaptured`);
    const h = this.hooks.hearth();
    for (const seat of seats) {
      let home: SimUnit | null = null;
      try { home = this.execute({ seatId: seat.id, dest: this.keeper.world.zone.id, landing: { at: { x: h.x, y: h.y }, tier: h.tier } }); }
      catch { home = null; }
      if (!home) this.rescue(u, seat, h);
    }
    this.sleep(u);
  }
  /** The breaker's last resort: a seat whose detach itself faults leaves its
   *  broken World by hand (the hero alone), and walks into the keeper. */
  private rescue(u: SimUnit, seat: Seat, at: { x: number; y: number; tier: number }): void {
    const w = u.world, hero = w.seatHero(seat);
    const at0 = w.seats.indexOf(seat);
    if (at0 >= 0) w.seats.splice(at0, 1);
    w.actors = w.actors.filter(a => a !== hero && a !== seat.actor);
    if (seat.home) { seat.actor = hero; seat.home = undefined; }
    const packet: SeatPacket = { seat, hero, carry: [hero] as Actor[], from: w.zone.id, rows: [], bonds: [], grants: [], clocks: [], buffSources: [], traceRests: [], lite: [] };
    this.land(this.keeper, packet, { at: { x: at.x, y: at.y }, tier: at.tier });
    this.onArrive?.(seat, this.keeper, u, false, { seatId: seat.id, dest: this.keeper.world.zone.id });
  }

  /** A seat left the shard (its leave path ran in its unit). */
  forget(seatId: string): void {
    const key = this.ledger.get(seatId);
    this.ledger.delete(seatId);
    const u = key !== undefined ? this.units.get(key) : undefined;
    if (u && !this.seatsOf(u).length) u.emptySince ??= this.keeper.world.time;
  }

  /** THE STATUS PAGE's units: key, zone, seats, awake since, empty since. */
  status(): Record<string, unknown>[] {
    return this.each().map(u => ({
      key: u.key, zone: u.world.zone.id, seats: this.seatsOf(u).map(s => s.id),
      awakeSince: +u.awakeSince.toFixed(1), ...(u.emptySince !== null ? { emptySince: +u.emptySince.toFixed(1) } : {}),
      ...(this.frozen(u) ? { frozen: true } : {}), ...(u.broken ? { broken: true } : {}),
    }));
  }
}
