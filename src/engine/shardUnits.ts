// ---------------------------------------------------------------------------
// THE SIM UNITS (shard M1, W1 THE UNIT FABRIC): one World per live zone on a
// hosted world. The plan is docs/design/shard-m1-plan.md; the contract is
// docs/engine/shard.md "THE SIM UNITS, W1". This file is the engine half and
// stays browser-safe (no node imports): the dials, the contract types the host
// (server/simUnits.ts) and the waves after it share, THE ALIAS CENSUS as data
// (SHARD_UNIT_FIELDS, pinned by balance/probe_shardunits.ts A), THE PIN, and
// THE HAND-OFF's two halves (detachSeat in the unit a seat leaves, attachSeat
// in the unit it enters).
//
//   THE KEEPER     the World a shard always had: the chart, the WorldSim, the
//                  clock, the account and the world sweeps are its own.
//   A UNIT         a fresh World booted into one zone, the keeper's
//                  world-level fields PINNED onto it, its own parked warden
//                  as p0. THE PRIMARY GATE (World.update) skips the keeper's
//                  world sweeps in a unit.
//   THE PIN        world-level fields are copied keeper to unit at every
//                  entry into a unit and back at its exit (counters both
//                  ways, clocks in only), so a runtime reassignment in either
//                  World is never lost and one counter never collides.
//   THE HAND-OFF   a seat moves between units as the SAME Actor objects:
//                  detachSeat lifts the hero, its carried court and the
//                  seat's own rows out of one World; attachSeat lands them
//                  in another through the one landing law.
//
// Off a shard nothing here runs: a World with no `shardWorld` link never reads
// these tables, and every seam it touches is a no-op (THE SOLO INVARIANT).
// ---------------------------------------------------------------------------

import { angleTo, vec, type Vec2 } from '../core/math';
import type { Actor } from './actor';
import type { BuffEffect } from './skills';
import type { Seat, World } from './world';

/** The unit fabric's dials (unblessed; docs/engine/shard.md "THE SIM UNITS, W1"). */
export const UNIT_CFG = {
  /** THE LINGER: world seconds a unit with no seat stays awake before it sleeps,
   *  its zone memory captured exactly as a departure captures it. A seat that
   *  turns back within the linger walks into the same live zone. The keeper
   *  (the hearth) never sleeps. */
  unitLinger: 30,
  /** THE LINGER FREEZE (W3): a seatless unit stops ticking for its whole linger
   *  (no update, no wire), its bodies and flights standing still where the last
   *  seat left them; a seat's return resumes it under THE ONE CLOCK's re-pin of
   *  `time` and `inputClock`, the same semantics as a sleep and a wake (the world
   *  moved on while nobody watched). A dormant or downed seat is a seat: its unit
   *  keeps ticking. False = every awake unit ticks through its linger (W1). */
  freezeLinger: true,
  /** THE SOFT CAP: awake units (the keeper not counted) past this many put the
   *  longest-seatless unit to sleep at once. A wake is never refused. */
  maxUnits: 32,
  /** THE SPAWN GRACE at a hand-off arrival: seconds a hero that walked into a
   *  unit stands untargetable, unless its first willed input ends it sooner.
   *  A join keeps SHARD_CFG.spawnGraceSec. */
  arrivalGraceSec: 3,
};

/** 'keeper' | a zone id | `${zoneId}#${instance}` (instances are W4's). */
export type UnitKey = string;

/** One rung of a pocket's way home (World.caveReturn's own shape). */
export type CaveRung = NonNullable<World['caveReturn']>;

/** Where a hand-off lands a seat. 'entry' applies loadZone's back-portal rule
 *  to the destination's live exits (the arrival edge is the ticket's `from`). */
export type RoadLanding = 'entry' | { at: Vec2; spread?: number; band?: [number, number]; tier?: number };

/** THE TICKET (plan 3.1): a road's decision for ONE seat, carried to the host.
 *  Roads, intents and the muster enqueue; the host executes every ticket after
 *  all units ticked (THE HAND-OFF QUEUE). W1 builds the executor and the direct
 *  `travel` door; the roads that emit tickets are W2's. */
export interface RoadTicket {
  seatId: string;
  /** A zoneMap or caveMap id (the host resolves its unit). */
  dest: string;
  /** The arrival edge: loadZone's back-portal rule. Absent = the source zone. */
  from?: string;
  /** Card 25 B's instance key (W4). */
  instance?: string;
  /** A pocket's way home, installed on the unit a wake boots. */
  ladder?: { caveReturn: CaveRung | null; caveStack: CaveRung[] };
  /** A realm arena's context (W4). */
  context?: unknown;
  landing?: RoadLanding;
  /** The per-seat re-descent grace (W2's scanner). */
  grace?: 'caveExit';
  /** Runs once, in the destination, after a wake's load (W4: the realm's boss). */
  onFirstWake?: (w: World) => void;
  /** THE MUSTER RING (W4). */
  muster?: { party: string; at: Vec2 };
}

/** THE LINK (World.shardWorld, HOST class): published by the host into every
 *  World a shard runs. Its role is THE PRIMARY GATE's read. */
export interface ShardWorldLink {
  role: 'keeper' | 'unit';
  key: UnitKey;
  /** THE HAND-OFF QUEUE's door: a road enqueues a ticket, never travels. */
  enqueue(t: RoadTicket): void;
  /** THE SPLIT DISPATCH's door (W3, World.atZone's shard branch): run `fn` on the
   *  World hosting `zoneId` under its pin and return its answer; undefined when
   *  no World is awake there. Called from inside another unit it is deferred to
   *  THE HAND-OFF QUEUE's drain (and answers undefined). */
  dispatch<T>(zoneId: string, fn: (w: World) => T): T | undefined;
  /** THE OCCUPIED LAW's source (W3): every live World of the shard, the
   *  keeper's own first, then each awake unit's by key (a lingering unit, frozen
   *  or not, is awake ground). Read-only: a World read through it is never
   *  pinned, so it serves bodies, seats and zones, never the alias fields. */
  worlds(): readonly World[];
}

/** The clocks THE ONE CLOCK pins into a unit at every entry. */
export interface UnitClocks { time: number; inputClock: number }

// ---------------------------------------------------------------------------
// THE ALIAS CENSUS (plan section 1): every World field a detector finds (its
// own container is a string-keyed Map/Set/Record, a WorldSim, a Ledger or an
// Account; THE SAVE LAW, the fields serializeWorldState/adoptWorldState touch;
// THE SWEEP LAW, the fields the gated sweeps write one call deep) carries a
// row here, and so does every field a mechanism moves. Everything else is
// UNIT by default (it dies with its unit). The probe (balance/probe_shardunits
// A) derives all three detectors from the source each run: a field added next
// month is aliased, marked or named unit-local the day it is written.
// ---------------------------------------------------------------------------

/** The seven classes. alias / counter / clock ride THE PIN; seat rides THE
 *  HAND-OFF; keeper, host and unit are documentation the probe holds honest. */
export type UnitFieldClass = 'alias' | 'counter' | 'clock' | 'keeper' | 'host' | 'seat' | 'unit';
/** Why a field is per unit (the closed vocabulary). `shell` is a render
 *  shell's mirror, never set on a host World. */
export type UnitReason = 'per-visit' | 'zone-local' | 'memo' | 'seat-keyed' | 'warden-only' | 'dev' | 'shell';
/** How THE HAND-OFF treats a seat row: MOVE it into the destination or DROP it
 *  in the source, keyed by the seat id, the Seat object, each carried actor's
 *  id or each carried Actor object; `custom` rows have their own code below. */
export type SeatHand =
  | 'move-seat-id' | 'move-seat' | 'move-actor-id' | 'move-actor'
  | 'drop-seat-id' | 'drop-seat' | 'drop-actor-id' | 'drop-actor' | 'custom';

export type UnitFieldRow =
  | { cls: 'alias' | 'counter' | 'clock' | 'keeper' | 'host'; note?: string }
  | { cls: 'seat'; hand: SeatHand; note?: string }
  | { cls: 'unit'; why: UnitReason; note?: string };

const A = (note?: string): UnitFieldRow => ({ cls: 'alias', ...(note ? { note } : {}) });
const K = (note?: string): UnitFieldRow => ({ cls: 'keeper', ...(note ? { note } : {}) });
const S = (hand: SeatHand, note?: string): UnitFieldRow => ({ cls: 'seat', hand, ...(note ? { note } : {}) });
const U = (why: UnitReason, note?: string): UnitFieldRow => ({ cls: 'unit', why, ...(note ? { note } : {}) });

/** THE ALIAS CENSUS as data. Field names are World's own (THE PIN and THE
 *  HAND-OFF reach them through an index cast; the probe proves every name). */
export const SHARD_UNIT_FIELDS: Readonly<Record<string, UnitFieldRow>> = {
  // ---- ALIAS: one truth for the shard (THE PIN copies in, and back when reassigned)
  zoneMap: A('the chart'), caveMap: A('every pocket def'), visited: A(), surveyed: A(),
  discoveredWaypoints: A(), zoneMemory: A('the shared memory rows (THE PERSIST CAPTURE writes into it)'),
  sim: A('the WorldSim: nothing in it reaches back into a World'), manifest: A('the same frozen object by construction'),
  accountSource: A('THE KEEPER\'S GATE until M2'), activeQuests: A(), completedQuests: A(),
  questImbues: A('reassigned by claimQuestImbue'), questRewardItems: A('the reward menu is the counters wave\'s'),
  completedObjectives: A(), mercSheets: A(), vendorHolds: A(),
  bountyOffers: A('reassigned by armBountyBoard and reconcileBounties'),
  bountyHands: A('reassigned by the slate verbs'), bountyBoardState: A(), chartsBought: A(),
  townPortals: A('reassigned by the portal verbs; a seat\'s own row rides it'), townPortalDestination: A(),
  ledger: A('the run ledger'), throngClaimed: A(), annexFound: A(),
  discoveredDimensions: A('a per-run once-latch'), seasSeen: A('a per-run once-latch (seas_found)'),
  manifestedThisRun: A('a per-run once-latch (one grudge per run)'), descentSpent: A('a per-run once-latch'),
  materializedSwarmings: A('run-long, never cleared: a unit copy would re-bulletin and re-ledger each flight'),
  soundings: A(), omenWhisperedAt: A(), omenWhisperN: A(), omenRevealed: A(),
  notices: A('THE NOTICE FEED: one feed, its audiences decide who hears'), pickupFeed: A(),
  newsLog: A('the speech grammar\'s world news'), slainLog: A('the speech grammar\'s credited kills'),
  massSideareaRoots: A('keeper-meaningful'), massCaveIds: A('keeper-meaningful'),
  descentStocks: A('the Descent stays sealed in M1'), descentDeepest: A('the Descent stays sealed in M1'),
  theaterVisitSeq: A('PLAUSIBLE world-level: the per-zone visit ordinal salts the theater\'s draws'),
  // ---- COUNTER: one shared scalar, pinned both ways
  nextGenId: { cls: 'counter', note: 'gen_<n>: two units minting in one tick never collide' },
  accountDirty: { cls: 'counter', note: 'a shared dirty flag, pinned both ways' },
  // ---- CLOCK: the keeper owns it; units enter at the keeper's tick-start reading
  time: { cls: 'clock' }, inputClock: { cls: 'clock', note: 'THE TIME BUDGET refills from it' },
  // ---- KEEPER: the keeper's own copy is the one its sweeps and its save read;
  //      a unit's copy is its own and the pin never copies it
  forechartNextAt: K(), mintVeil: K(), omenNextAt: K(), webSettleNextAt: K(), webSettleSeenSeq: K(),
  classClaimNextAt: K(), warpSweepAcc: K(), holdSweepAt: K(), bountyWatchAccum: K(), quickenSweepAcc: K(),
  deepwinterWarped: K(), deepwinterEyeWarped: K(), longNightWarped: K(),
  gloamPrevPhase: K('each World tracks its own edge; the gloaming_survived bump is the keeper\'s alone (W3)'),
  forechartTurn: K('THE OCCUPIED LAW: the halo\'s round-robin over the occupied zones (W3)'),
  odyssey: K('a this-bound runtime whose update never runs in a unit'),
  zonesSaveMemo: K(), zonesRowMemo: K(), memorySaveMemo: K(), memoryRowMemo: K(),
  zonesSaveRowDerives: K('the save memo\'s own tally'), memorySaveRowDerives: K('the save memo\'s own tally'),
  zone: K('the save\'s own place: a unit\'s zone is its own and is saved through THE PERSIST CAPTURE'),
  caveReturn: K('the save\'s own place (a unit\'s ladder is its own)'), caveStack: K('the save\'s own place'),
  entryFrom: K('the save\'s own place'), massRuntime: K('the wilds\' surface is the keeper\'s'),
  massAway: K('the wilds\' surface is the keeper\'s'),
  adoptedZonePending: K('the adopt\'s latch; THE WAKE sets a unit\'s own'),
  questRescues: K('the adopt reconciles the keeper\'s; each unit updates its own'),
  townTierIdx: K('the hearth\'s tier; a unit never hosts the hearth'), townStationKey: K('the hearth\'s station fold'),
  vendorArmedBeat: K('the adopt clears the keeper\'s; a unit\'s copy arms its own shelf (the plan\'s zone-local)'),
  // ---- HOST: published by the host into every World the shard runs
  shardWorld: { cls: 'host', note: 'the link and THE PRIMARY GATE' },
  partyMates: { cls: 'host' }, partyRows: { cls: 'host' }, partyRev: { cls: 'host' },
  timeflow: { cls: 'host', note: 'each World\'s own; the host sets allowHold and chronoScope' },
  seatCorpseMarks: { cls: 'host', note: 'THE CORPSE ON THE CHART: a seat\'s own remembered bodies for its journal row' },
  // ---- SEAT: moved or dropped by THE HAND-OFF (the seat-keyed reason)
  lastInputSeq: S('move-seat-id', 'the ack continues'), spentPresses: S('move-seat-id', 'a press a gate spent never fires in B'),
  seatKillTally: S('move-seat', 'the fall\'s reckoning'), townPortalArrival: S('move-seat-id'),
  pendingTreePips: S('move-seat-id'), wornThrongInsts: S('move-actor-id'),
  chillTimers: S('move-actor-id'), douseTimers: S('move-actor-id'), gazeTimers: S('move-actor-id'),
  strikeReleaseBodies: S('move-actor'),
  companionBonds: S('custom', 'exportBond / importBond'), companionGrants: S('custom', 'lift / seat'),
  replenishment: S('custom', 'lift / seat'), treeBuffSources: S('custom', 'keyed by the carried bodies\' buffs'),
  traceRests: S('custom', 'keyed by the seat\'s own writ uids'),
  engageTokens: S('custom', 'the leaver\'s ids pruned'), ringClaims: S('custom', 'the leaver\'s ids pruned'),
  losMemo: S('custom', 'the leaver\'s pairs pruned'),
  metaDirty: S('drop-seat-id', 'marked dirty again in B'), moveBudget: S('drop-seat-id', 'a fresh row at graceSec'),
  townPortalDwell: S('drop-seat-id'), pingClocks: S('drop-seat-id', 'pings stay unit-local'),
  harvestDwell: S('drop-seat-id'), harvestOffer: S('drop-seat-id'),
  seatHud: S('drop-seat'), seatNoteAt: S('drop-seat'), speechFocus: S('drop-seat'),
  dotAccum: S('drop-actor-id'), comboCursors: S('drop-actor'),
  journalDirty: S('drop-seat-id', 'THE JOURNAL ROW: marked again in B, so the arrival hears its new zone at once'),
  questGiverDwells: S('drop-seat', 'a giver linger never crosses Worlds'),
  // ---- UNIT: dies with its unit (a row only where a detector looks)
  openedHollows: U('zone-local'), annexOpen: U('zone-local'), lures: U('zone-local'), theaterPour: U('zone-local'),
  holdMissingWarned: U('zone-local'), crossDimWarned: U('zone-local'), brittleWarnAt: U('zone-local'),
  failNoteAt: U('zone-local', 'the unit\'s world floats'), liteKills: U('zone-local', 'flushed by its own sweep'),
  doorPressIntents: U('zone-local', 'one frame\'s door presses'), structures: U('zone-local'),
  encRng: U('zone-local', 'the zone\'s encounter stream'),
  wbWalls: U('per-visit'), stationArmed: U('per-visit'),
  massNativeEffectOwners: U('per-visit'), massNativeBrittleOwners: U('per-visit'),
  materializedEpicenters: U('per-visit'), materializedHellWar: U('per-visit'), materializedCrusades: U('per-visit'),
  materializedDeadwakes: U('per-visit'), materializedHaunts: U('per-visit'), materializedStrayings: U('per-visit'),
  materializedDroves: U('per-visit'), materializedWisplights: U('per-visit'), materializedLongNights: U('per-visit'),
  materializedMigrations: U('per-visit'), materializedWorldBoss: U('per-visit'), materializedBrigands: U('per-visit'),
  materializedContagion: U('per-visit'), materializedInfestation: U('per-visit'), materializedBroods: U('per-visit'),
  materializedSwarmWake: U('per-visit'), materializedCandle: U('per-visit'), materializedStarfall: U('per-visit'),
  materializedMycelia: U('per-visit'), materializedDeepwinter: U('per-visit'), materializedHoldfasts: U('per-visit'),
  materializedUnsealing: U('per-visit'), materializedHunts: U('per-visit'), materializedFractures: U('per-visit'),
  materializedRituals: U('per-visit'), materializedAmalgam: U('per-visit'), materializedAmalgamMobs: U('per-visit'),
  materializedObservers: U('per-visit'), materializedDocks: U('per-visit'), materializedWrits: U('per-visit'),
  soulriverLaneMemo: U('memo'), grantedPocketCache: U('memo'), pathProfiles: U('memo'),
  terrainDrainScratch: U('memo'), liteKindIdxMap: U('memo'),
  approachPass: U('memo', 'one journal pass\'s board approaches, dropped at its end'),
  stashedCompanions: U('warden-only', 'the local resume\'s stash'), kills: U('warden-only', 'the objective latch\'s delta'),
  combatDeeds: U('warden-only', 'the local hero\'s deed tracker'),
  netContainerBoards: U('shell'), netStationAnchors: U('shell', 'THE CLIENT\'S COUNTERS: the shell\'s station pieces'),
};

/** Fields THE PIN copies both ways (alias + counter), in table order. */
export const PINNED_FIELDS: readonly string[] = Object.entries(SHARD_UNIT_FIELDS)
  .filter(([, r]) => r.cls === 'alias' || r.cls === 'counter').map(([f]) => f);

// ---------------------------------------------------------------------------
// THE PIN (plan D1, D4): ~40 reference copies per entry, exact under the
// shard's single thread. Reached through an index cast (`sim` is readonly at
// compile time only); the census proves every name is a World field.
// ---------------------------------------------------------------------------

type Fields = Record<string, unknown>;
const fields = (w: World): Fields => w as unknown as Fields;

/** THE PIN's entry ledger: the keeper's values a unit entered with. */
export interface PinEntry { readonly at: unknown[] }

/** THE ONE CLOCK's reading of a World (the keeper's, at tick start). */
export function unitClocks(w: World): UnitClocks {
  return { time: w.time, inputClock: fields(w).inputClock as number };
}

/** THE PIN in: the keeper's world-level values onto the unit, the clocks at
 *  the given reading (never copied back). */
export function pinIn(keeper: World, unit: World, clocks: UnitClocks): PinEntry {
  const k = fields(keeper), u = fields(unit);
  const at: unknown[] = new Array(PINNED_FIELDS.length);
  for (let i = 0; i < PINNED_FIELDS.length; i++) {
    const f = PINNED_FIELDS[i], v = k[f];
    at[i] = v;
    u[f] = v;
  }
  u.time = clocks.time;
  u.inputClock = clocks.inputClock;
  return { at };
}

/** THE PIN out: every pinned field the unit reassigned (or counted on) goes
 *  back to the keeper; one the unit left alone is never written. */
export function pinOut(keeper: World, unit: World, entry: PinEntry): void {
  const k = fields(keeper), u = fields(unit);
  for (let i = 0; i < PINNED_FIELDS.length; i++) {
    const f = PINNED_FIELDS[i], v = u[f];
    if (v !== entry.at[i]) k[f] = v;
  }
}

// ---------------------------------------------------------------------------
// THE UNIT HOST VIEW (World.shardUnitHost, beside the native host views): the
// private reaches THE HAND-OFF and THE WAKE need, typed.
// ---------------------------------------------------------------------------

export interface ShardUnitHost {
  indexSeats(): void;
  grabRelease(a: Actor): void;
  releaseContract(minion: Actor, scheduleRespawn: boolean): void;
  liteOpenAt(x: number, y: number): boolean;
  readonly relayStatus: NonNullable<Actor['statusRelay']>;
  readonly zoneEntry: Vec2;
  adoptedZonePending: boolean;
  caveStack: CaveRung[];
  readonly harvestSessions: readonly { seatId: string }[];
  readonly traceRuns: readonly { seatId: string }[];
  readonly pendingBursts: { owner: Actor }[];
  readonly pendingContagions: { caster: Actor; host: Actor }[];
  readonly companionGrants: { lift(owner: Actor): unknown; seat(owner: Actor, rows: unknown): void };
  readonly replenishment: { lift(actor: Actor): unknown; seat(actor: Actor, clocks: unknown): void };
}

// ---------------------------------------------------------------------------
// THE HAND-OFF (plan section 3)
// ---------------------------------------------------------------------------

/** One moved row: a field, its key in the source, its value. */
export interface MovedRow { field: string; key: unknown; value: unknown }

/** THE SEAT PACKET (plan 3.3): what leaves one World for another. */
export interface SeatPacket {
  seat: Seat;
  /** The seat's own hero (seatHero after the eject). */
  hero: Actor;
  /** THE CARRY SET: the hero first, then its court (the same objects, ids kept). */
  carry: Actor[];
  /** The zone the seat left: the arrival edge for an 'entry' landing. */
  from: string;
  rows: MovedRow[];
  bonds: [Actor, unknown][];
  grants: [Actor, unknown][];
  clocks: [Actor, unknown][];
  buffSources: [BuffEffect, unknown][];
  traceRests: [number, number][];
  /** Lite-tier throng rows, freed in the source and re-spawned in the
   *  destination (pool rows never move: they hold owner ids, never bodies). */
  lite: { defId: string; plies: number }[];
}

/** The arrays THE HAND-OFF purges of the carried casters' rows (step 4), each
 *  with the Actor-valued keys that tie a row to its caster. */
const PURGED_ROWS: readonly [field: string, keys: readonly string[]][] = [
  ['projectiles', ['caster']], ['pendingSummons', ['caster']], ['pendingRespawns', ['caster']],
  ['pendingDetonations', ['mine']], ['pendingFollowUps', ['caster']], ['pendingBlinks', ['actor', 'faceTarget']],
  ['pendingRepeats', ['caster']], ['pendingSteps', ['caster']], ['pendingSalvos', ['caster']],
  ['pendingAmbushes', ['caster']], ['pendingMetas', ['caster']], ['pendingPersists', ['caster']],
  ['pendingFuses', ['caster']], ['tethers', ['a', 'b', 'owner']],
];

/** Keyed store access for the table-driven rows (Map, Set and their weak kin). */
type Store = { has(k: unknown): boolean; delete(k: unknown): boolean; get?(k: unknown): unknown; set?(k: unknown, v: unknown): unknown; add?(k: unknown): unknown };
const isSetLike = (s: Store): boolean => typeof s.add === 'function' && typeof s.set !== 'function';

/** Remove an Actor-keyed array's rows in place. */
function prune<T>(arr: T[], drop: (x: T) => boolean): void {
  for (let i = arr.length - 1; i >= 0; i--) if (drop(arr[i])) arr.splice(i, 1);
}

/** loadZone's back-portal rule on a live World: 120 px in from the exit that
 *  leads back to `from`, else the zone's own entry. */
export function entryLanding(w: World, from?: string | null): Vec2 {
  const back = from ? w.exits.find(e => e.to === from) : undefined;
  if (!back) { const e = w.shardUnitHost().zoneEntry; return vec(e.x, e.y); }
  const ang = angleTo(back.pos, vec(w.arena.w / 2, w.arena.h / 2));
  return vec(back.pos.x + Math.cos(ang) * 120, back.pos.y + Math.sin(ang) * 120);
}

/** THE CARRY SET (plan 3.2, the M1 rule): the hero, then every living,
 *  non-construct body whose whole owner chain up to the hero is carried. */
export function carrySetOf(w: World, hero: Actor): Actor[] {
  const carried = new Set<Actor>([hero]);
  for (let grew = true; grew;) {
    grew = false;
    for (const a of w.actors) {
      if (carried.has(a) || a.dead || a.construct || !a.owner || !carried.has(a.owner)) continue;
      carried.add(a);
      grew = true;
    }
  }
  return [...carried];
}

/** DETACH (plan 3.4), run in the unit the seat leaves, under its pin. Lifts
 *  the seat, its hero and its court out whole and leaves the source World
 *  holding nothing that names them; or refuses with a reason. */
export function detachSeat(w: World, seatId: string): SeatPacket | { refused: string } {
  const host = w.shardUnitHost();
  const seat = w.seats.find(s => s.id === seatId && !s.keeper);
  if (!seat) return { refused: 'no such seat here' };
  // 1. The refusals, then the eject (a borrowed body belongs to its zone).
  if (seat.actor.heldBy !== undefined || w.seatHero(seat).heldBy !== undefined) return { refused: 'held' };
  if (host.harvestSessions.some(h => h.seatId === seatId)) return { refused: 'mid-harvest' };
  if (host.traceRuns.some(r => r.seatId === seatId)) return { refused: 'mid-trace' };
  if (seat.home) w.seatEject(seat, 'travel');
  const hero = w.seatHero(seat);
  if (hero.dead) return { refused: 'fallen' };
  // 3 (first, so the teardown knows whom it serves). THE CARRY SET; the rest
  // of the hero's chain is culled quietly, as a single World's zone change
  // drops it (constructs and broken chains never walk on).
  const carry = carrySetOf(w, hero);
  const carried = new Set(carry);
  const carriedIds = new Set(carry.map(a => a.id));
  const culled = w.actors.filter(a => !carried.has(a) && !a.dead && a.ownedBy(hero));
  for (const a of culled) { host.releaseContract(a, false); a.dead = true; }
  const gone = new Set<Actor>([...carry, ...culled]);
  // 2. TEARDOWN ON ABSENCE, now: the controllers that clean up after an actor
  // missing from their World would otherwise mutate a body that walks another.
  const bonds: [Actor, unknown][] = [];
  for (const a of carry) {
    const bond = w.companionBonds.exportBond(a);
    if (bond) bonds.push([a, bond]);
    w.assaults.clearOwner(a);
    w.challenges.clearOwner(a);
    w.attackSequences.clearOwner(a);
    w.guardArts.clearOwner(a);
    w.satellites.retire(a);
    w.auroras.retire(a);
    w.guardians.retire(a);
    w.creepers.retire(a);
  }
  // 4. Purge every flight, field, band and pending row the chain owns (a
  // toggled field refunds its reservation through expireZone).
  const f = fields(w);
  for (const [field, keys] of PURGED_ROWS) {
    const arr = f[field] as Record<string, unknown>[] | undefined;
    if (Array.isArray(arr)) prune(arr, row => keys.some(k => gone.has(row[k] as Actor)));
  }
  prune(host.pendingBursts, row => gone.has(row.owner));
  prune(host.pendingContagions, row => gone.has(row.caster) || gone.has(row.host));
  for (const z of [...w.zones]) if (gone.has(z.caster) || (!!z.anchor && gone.has(z.anchor))) w.retireOwnedZone(z);
  // 5. THE CROSS-WORLD LEAKS: sources keyed by this World's own counters and
  // stripped only by this World's own sweeps.
  for (const z of w.zones) {
    if (!z.domainAffected || !z.domainKey) continue;
    for (const a of carry) if (z.domainAffected.delete(a)) a.sheet.removeSource(z.domainKey);
  }
  const auraOf = (name: string): number => Number(name.slice(name.lastIndexOf(':') + 1));
  for (const a of w.actors) {
    if (a.dead) continue;
    const mine = carried.has(a);
    for (const name of a.sheet.sourceNames()) {
      if (name.startsWith('aura:')) {
        // A carried body sheds the auras of bearers that stay; a body that
        // stays sheds the carried bearers' auras.
        if (mine !== carriedIds.has(auraOf(name))) a.sheet.removeSource(name);
      } else if (mine && name.startsWith('altar:')) a.sheet.removeSource(name);
    }
  }
  for (const a of carry) for (const aura of a.activeAuras.values()) {
    for (const id of [...aura.affected]) if (!carriedIds.has(id)) aura.affected.delete(id);
  }
  for (const al of w.altars) for (const id of carriedIds) al.affected.delete(id);
  for (const a of carry) if (a.gripping) host.grabRelease(a);
  for (const a of w.actors) {
    if (carried.has(a)) continue;
    if (a.gripping && carriedIds.has(a.gripping.id)) host.grabRelease(a);
    if (a.aiTargetId !== undefined && carriedIds.has(a.aiTargetId)) { a.aiTargetId = undefined; a.aiTargetRef = undefined; }
  }
  for (const s of w.seats) s.reviveDwellBy.delete(seatId);
  seat.reviveDwellBy.clear();
  // 6. THE SEAT PACKET: the MOVE rows lifted, the DROP rows purged.
  const rows: MovedRow[] = [];
  const keysOf = (hand: SeatHand): unknown[] => hand.endsWith('-seat-id') ? [seat.id] : hand.endsWith('-seat') ? [seat]
    : hand.endsWith('-actor-id') ? [...carriedIds] : hand.endsWith('-actor') ? carry : [];
  for (const [field, row] of Object.entries(SHARD_UNIT_FIELDS)) {
    if (row.cls !== 'seat' || row.hand === 'custom') continue;
    const store = f[field] as Store | undefined;
    if (!store) continue;
    for (const key of keysOf(row.hand)) {
      if (!store.has(key)) continue;
      if (row.hand.startsWith('move')) rows.push({ field, key, value: isSetLike(store) ? true : store.get!(key) });
      store.delete(key);
    }
  }
  const grants: [Actor, unknown][] = [], clocks: [Actor, unknown][] = [];
  for (const a of carry) {
    const g = host.companionGrants.lift(a); if (g) grants.push([a, g]);
    const c = host.replenishment.lift(a); if (c) clocks.push([a, c]);
  }
  const buffSources: [BuffEffect, unknown][] = [];
  const treeBuffs = f.treeBuffSources as WeakMap<BuffEffect, unknown>;
  for (const a of carry) for (const b of a.buffs.values()) {
    const src = treeBuffs.get(b.def);
    if (src !== undefined) { buffSources.push([b.def, src]); treeBuffs.delete(b.def); }
  }
  const traceRests: [number, number][] = [];
  const rests = f.traceRests as Map<number, number>;
  for (const it of seat.meta.items) {
    const at = rests.get(it.uid);
    if (at !== undefined) { traceRests.push([it.uid, at]); rests.delete(it.uid); }
  }
  // The leaver's ids out of the self-healing ledgers (the plan's prune).
  const tokens = f.engageTokens as Map<string, number[]>;
  for (const [key, held] of [...tokens]) {
    const target = Number(key.slice(key.indexOf(':') + 1));
    const live = held.filter(id => !carriedIds.has(id));
    if (carriedIds.has(target) || !live.length) tokens.delete(key);
    else if (live.length !== held.length) tokens.set(key, live);
  }
  const claims = f.ringClaims as Map<number, { actorId: number }[]>;
  for (const [tid, list] of [...claims]) {
    const live = list.filter(c => !carriedIds.has(c.actorId));
    if (carriedIds.has(tid) || !live.length) claims.delete(tid);
    else if (live.length !== list.length) claims.set(tid, live);
  }
  const los = f.losMemo as Map<number, unknown>;
  for (const key of [...los.keys()]) {
    if (carriedIds.has(Math.floor(key / 1_000_000)) || carriedIds.has(key % 1_000_000)) los.delete(key);
  }
  const lite: { defId: string; plies: number }[] = [];
  const pool = w.lite;
  for (let i = 0; i < pool.used; i++) {
    if (!pool.alive[i] || !carriedIds.has(pool.owner[i])) continue;
    const kind = w.liteKinds[pool.kind[i]];
    if (kind) lite.push({ defId: kind.defId, plies: pool.plies[i] });
    pool.free(i);
  }
  // 7. Out of the World: never removeSeat (it culls the whole court).
  const at0 = w.seats.indexOf(seat);
  if (at0 >= 0) w.seats.splice(at0, 1);
  w.actors = w.actors.filter(a => !gone.has(a));
  host.indexSeats();
  if (fields(w).actingSeat === seat) fields(w).actingSeat = null;
  w.events.emit('party/leave', { actor: seat.actor, seat: seat.id });
  w.settleNearScale(true);
  return { seat, hero, carry, from: w.zone.id, rows, bonds, grants, clocks, buffSources, traceRests, lite };
}

/** ATTACH (plan 3.5), run in the unit the seat enters, under its pin: the
 *  carried bodies cross the door the way loadZone's own carry does, then land
 *  through THE FILTERED HOST (World.landSeatAt) and the seat's rows install. */
export function attachSeat(w: World, packet: SeatPacket, landing: RoadLanding): void {
  const host = w.shardUnitHost();
  const { seat, hero, carry } = packet;
  // 2. loadZone's per-actor door reset (the cue arrays, THE BLINK LAW).
  for (const a of carry) {
    a.procCuePulses.length = 0; a.procPopEvents.length = 0;
    a.restoreGains.length = 0; a.feedingMeal = undefined;
    a.dash = null; a.casting = null; a.push = null;
    if (a.caromRun) w.endCarom(a, { quiet: true });
    a.frameLockRect = null;
    a.tier = 0; a.onTierLink = false; a.aiTierGoal = undefined;
    if (a !== hero) {
      a.aiTargetId = undefined; a.aiTargetRef = undefined; a.aiLastSeen = undefined;
      a.aiCommand = undefined; a.aiTokenKey = undefined; a.aiRingTarget = undefined;
    }
    // 3. Status relays close over their own World.
    a.statusRelay = host.relayStatus;
  }
  for (const inst of seat.meta.knownSkills.values()) if (inst.state?.markPos) inst.state.markPos = null;
  for (const inst of seat.grantedInsts?.values() ?? []) if (inst.state?.markPos) inst.state.markPos = null;
  // 4. In, then landed by the one landing law.
  w.seats.push(seat);
  for (const a of carry) if (!w.actors.includes(a)) w.actors.push(a);
  host.indexSeats();
  const at = landing === 'entry' ? entryLanding(w, packet.from) : landing.at;
  const opts = landing === 'entry' ? undefined
    : { ...(landing.spread !== undefined ? { spread: landing.spread } : {}), ...(landing.band ? { band: landing.band } : {}),
      ...(landing.tier !== undefined ? { tier: landing.tier } : {}) };
  w.landSeatAt(seat, carry, at, opts);
  // 5. The rows install, then the build re-derives in its new World.
  const f = fields(w);
  for (const r of packet.rows) {
    const store = f[r.field] as Store | undefined;
    if (!store) continue;
    if (isSetLike(store)) store.add!(r.key); else store.set!(r.key, r.value);
  }
  for (const [beast, bond] of packet.bonds) w.companionBonds.importBond(beast, bond);
  for (const [owner, rows] of packet.grants) host.companionGrants.seat(owner, rows);
  for (const [actor, c] of packet.clocks) host.replenishment.seat(actor, c);
  const treeBuffs = f.treeBuffSources as WeakMap<BuffEffect, unknown>;
  for (const [def, src] of packet.buffSources) treeBuffs.set(def, src);
  const rests = f.traceRests as Map<number, number>;
  for (const [uid, until] of packet.traceRests) rests.set(uid, until);
  w.recalcSeat(seat);
  w.companionBonds.refresh();
  for (const a of carry) if (a !== hero) w.guardArts.sync(a);
  for (let c = 0; c < packet.lite.length; c++) {
    const row = packet.lite[c];
    if (!hero.skills.some(s => s?.def.throng?.tier === 'lite' && s.def.throng.monsterId === row.defId)) continue;
    const kindIdx = w.liteKindOf(row.defId);
    if (kindIdx < 0) continue;
    const ang = (c / Math.max(1, packet.lite.length)) * Math.PI * 2;
    const bx = hero.pos.x + Math.cos(ang) * 46, by = hero.pos.y + Math.sin(ang) * 46;
    const open = host.liteOpenAt(bx, by);
    w.lite.spawn(kindIdx, open ? bx : hero.pos.x, open ? by : hero.pos.y, 1, hero.id, row.plies);
  }
  // 6. The roster hears it; the near law re-reads where every body stands.
  w.markMetaDirty(seat);
  w.journalDirty.add(seat.id); // THE JOURNAL ROW: the arrival hears its new zone's boards and pins at once
  w.events.emit('party/join', { actor: seat.actor, seat: seat.id });
  w.settleNearScale(true);
}
