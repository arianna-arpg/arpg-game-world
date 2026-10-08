// ---------------------------------------------------------------------------
// ShardHost — THE HEADLESS HOST (docs/design/shard-world.md §3.1, M0): the
// game's own co-op host with no renderer and no couch, running the REAL
// engine in Node and serving players over WebSocket. It is main.ts's host
// branch transcribed: the same boot registrations (via src/sim/arena's
// import list), a real expedition manifest, one World, the host frame
// verbatim (poll seats → applyInputs → drain meta intents → updateAI →
// update), the zone message on change, the meta heartbeat, 20 Hz snapshots,
// and a persistence beat that writes the WORLD HALF of a save on its own
// (the shard's world belongs to nobody's character).
//
// THE KEEPER SEAT (§3.2): a World cannot stand without its p0, so the shard
// parks one — a tagged, untargetable, passive hero at the hearth's bedside
// that the world-level reads address, exempt from party scale / XP / the
// wire, and THE MERCY that stands a downed seat back up when no ally can.
//
// M0 semantics are the co-op lane's, unchanged and documented as such: the
// party travels together, a joiner is a fresh level-1 hero, and every
// account-gated read rides the shard's own account (THE KEEPER'S GATE). The
// milestones that lift those are the charter's M1-M3.
// ---------------------------------------------------------------------------

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { installHeadlessShims } from '../src/sim/shims';
// The sim arena's import list IS the boot registration set main.ts performs
// (stamps, landmarks, layouts, kits …) — importing the module runs it; its
// bootSimEngine() is NOT called (it would park a probe arena in the chart
// and pin the forechart's wall-clock governor).
import '../src/sim/arena';
import { validateContent } from '../src/data/validate';
import { registerAllPackageFactions } from '../src/packages/factionGen';
import { buildManifest } from '../src/packages/manifest';
import { FEATURE, makeAccount, type Account } from '../src/meta/account';
import { POWER_PROGRESSION, odysseyMilestoneKey } from '../src/data/powerProgression';
import { SKILLS } from '../src/data/skills';
import { World, type Seat } from '../src/engine/world';
import { COOP_SCALING } from '../src/data/coop';
import { updateAI } from '../src/engine/ai';
import { CLASSES, type ClassDef } from '../src/data/classes';
import { rollSeed } from '../src/core/rng';
import { serializeSnapshot, serializeZone } from '../src/net/snapshot';
import type { PeerInfo, SessionMsg } from '../src/net/transport';
import type { MetaAction, PlayerInput } from '../src/net/intent';
import { sanitizeCosmeticLoadout } from '../src/meta/cosmetics';
import { WORLD_SCHEMA_VERSION, type WorldStateSave } from '../src/meta/worldstate';
import { ShardTransport, type ShardJoin } from './shardTransport';
import { VesselDesk } from './vessel';
import { ShardCorpses, shardRecordsPath } from './corpses';
import { readWildsSave, resumeWilds, setAsideWildsSave } from './wildsSave';

export const SHARD_CFG = {
  /** The fixed engine step (the sim harness's cadence; the live host's cap is 0.05). */
  tickHz: 60,
  /** Snapshot cadence (main.ts STATE_HZ). */
  stateHz: 20,
  /** Re-dirty every seat's meta this often (main.ts META_HEARTBEAT). */
  metaHeartbeatSec: 1.5,
  /** Write the world half of the save this often (main.ts's autosave beat). */
  persistSec: 20,
  /** THE DRESS BEAT: the zone message is the one-shot carrier of doodads and
   *  structures, and the wilds GROW them as the focus walks (ecology, sites,
   *  native scenery). When the doodad roster changed since the last send, the
   *  shard re-ships the zone message, at most once per dressSec. */
  dressSec: 4,
  /** A stalled process catches up at most this many ticks per pump, then drops the rest. */
  maxCatchUpTicks: 5,
  /** Engine faults print one stack per this many seconds; the rest are counted. */
  faultLogSec: 5,
  /** Meta intents a seat may land per tick; the rest of a burst is dropped. */
  actionsPerSeatPerTick: 16,
  /** THE BREAKER: this many consecutive faulting ticks mark the shard broken —
   *  the wire and the beats keep running, the pump reports it (onBroken), a
   *  supervisor restarts it, and the last good save stands untouched. */
  faultBreakerTicks: 600,
  /** THE HEARTH WAKE: a joiner stands up at the hearth (never beside the
   *  shadowed keeper, wherever that is) and is untargetable until its first
   *  willed input or spawnGraceSec, whichever comes first. */
  spawnGraceSec: 20,
  /** THE FOCUS: the keeper shadows the standing seat that acted most recently;
   *  the current focus keeps it unless another seat has been newer by this many seconds. */
  focusSwapSec: 3,
  /** Tick-time ring for the status page's p50/p95 (ticks). */
  telemetryTicks: 600,
  /** THE KEEPER SEAT. reviveSec = THE MERCY: seconds a downed seat waits with
   *  no standing ally before the keeper stands it up where it fell.
   *  shadowOffset = THE SHADOW (the wilds): the mass runtime streams, births
   *  and dwells around `world.player`, which on a shard is the keeper — so on
   *  the surface the keeper's body shadows the FOCUS SEAT (the first standing
   *  player) this many px behind it, every tick. One focus, one keeper: the
   *  sim-unit gap M1 closes; players far from the focus meet cold ground. */
  keeper: { classId: 'warrior', name: 'The Keeper', reviveSec: 8, shadowOffset: 0 },
  /** THE NEAR LAW (data/coop.ts shareRadius): seats within this many px of
   *  a kill share its XP, count as party for an enemy's scale and may kneel
   *  for the mercy. A continent apart is no party. */
  nearRadius: 1600,
  /** The shard save's own schema (wraps WorldStateSave's). */
  saveSchema: 1,
  /** Where shard saves land by default (gitignored beside the game's). */
  saveDir: 'saves',
  /** THE WILDS SAVE (server/wildsSave.ts): a --worldmass shard writes its own
   *  file, `shard_<seed><wildsSaveSuffix>.json`, beside the classic one — the
   *  two lanes never adopt, or overwrite, each other's world. */
  wildsSaveSuffix: '_wilds',
};

export interface ShardOptions {
  /** Manifest seed — THE HOSTED SEED. Absent: a fresh roll. */
  seed?: number;
  /** The keeper's class (any; it never fights). */
  keeperClass?: string;
  /** OPEN ACCOUNT: unlock every class, station feature and memory on the
   *  shard account — the keeper's gate opened wide for a play-test server.
   *  Default false: a fresh hamlet with nothing earned (the honest world). */
  open?: boolean;
  /** Save directory, or null for an ephemeral world (never written). */
  saveDir?: string | null;
  /** THE UNBROKEN WILDS: start the seamless foundation's worldmass runtime
   *  (World.startWorldMass) under the keeper — the hosted world is the one
   *  continuous surface. It persists like a classic shard, to its own file,
   *  and a saved one stands back up in the mass lane's resume order before
   *  the shard answers a socket (THE WILDS SAVE, server/wildsSave.ts). */
  worldmass?: boolean;
  /** Log sink (default console). */
  log?: (line: string) => void;
}

export interface ShardSave {
  schemaVersion: number;
  seed: number;
  savedAt: number;
  world: WorldStateSave;
}

/** The seed of the newest `shard_<seed>.json` in a save dir, or undefined. */
export function newestSavedSeed(dir: string, wilds = false): number | undefined {
  try {
    let best: { seed: number; mtime: number } | null = null;
    for (const name of readdirSync(dir)) {
      const m = (wilds ? /^shard_([0-9a-f]{8})_wilds\.json$/ : /^shard_([0-9a-f]{8})\.json$/).exec(name); // each kind finds its own file
      if (!m) continue;
      const mtime = statSync(join(dir, name)).mtimeMs;
      if (!best || mtime > best.mtime) best = { seed: parseInt(m[1], 16) >>> 0, mtime };
    }
    return best?.seed;
  } catch { return undefined; }
}

let booted = false;
/** One-time engine boot for a shard process: shims, the package factions,
 *  the content census. Idempotent. */
export function bootShardEngine(): void {
  if (booted) return;
  booted = true;
  installHeadlessShims();
  registerAllPackageFactions();
  validateContent();
}

/** THE OPEN ACCOUNT: everything the Vault sells, pre-owned (play-test servers). */
export function openAccount(account: Account): void {
  for (const c of CLASSES) account.unlockedClasses.add(c.id);
  for (const f of Object.values(FEATURE)) account.features.add(f);
  for (const id of Object.keys(SKILLS)) account.memorySecondary.add(`skill:${id}`);
  for (const gate of Object.values(POWER_PROGRESSION)) account.ledger[odysseyMilestoneKey(gate.odysseyStage)] = 1;
}

export class ShardHost {
  readonly seed: number;
  readonly account: Account;
  /** The hosted World. Replaced at most once, before any socket opens: a saved
   *  wilds that will not stand gives way to a fresh keeper world (THE WILDS
   *  SAVE, server/wildsSave.ts). */
  world: World;
  readonly net: ShardTransport;
  readonly savePath: string | null;
  /** THE VESSEL desk + THE CORPSE records (docs/engine/shard.md "The vessel
   *  and the corpse"): uploaded heroes, their mirrors, THE DEATH COVENANT,
   *  and the bodies a fall leaves behind, keyed by account. */
  readonly vessels: VesselDesk;
  readonly corpses: ShardCorpses;
  /** True when the hosted world is the seamless foundation's continuous surface. */
  readonly worldmass: boolean;
  readonly log: (line: string) => void;
  /** Ticks stepped since boot (the probe's clock). */
  ticks = 0;
  /** Engine throws caught by the pump (a server never dies on one frame). */
  faults = 0;
  /** Ticks the pump DROPPED to bound a stall (the world ran slow for everyone). */
  droppedTicks = 0;
  /** Consecutive ticks whose simulate phase threw (THE BREAKER's count). */
  consecutiveFaults = 0;
  /** THE BREAKER tripped: the simulate phase has faulted faultBreakerTicks ticks running. */
  broken = false;
  /** Called once when THE BREAKER trips (the CLI exits non-zero for a supervisor). */
  onBroken: (() => void) | null = null;
  private focusId: string | null = null;
  /** THE HEARTH: where the keeper first stood (the bedside, the hearth's spawn) — every joiner wakes here. */
  private hearth: { x: number; y: number; tier: number } = { x: 0, y: 0, tier: 0 };
  /** THE SPAWN GRACE: seat id → world time the grace ends. */
  private readonly graces = new Map<string, number>();
  private readonly bootAt = Date.now();
  private readonly tickMs: number[] = [];
  private tickMsAt = 0;
  private lastFaultLogAt = 0;
  private faultsSinceLog = 0;

  private snapTick = 0;
  private metaHeartbeat = SHARD_CFG.metaHeartbeatSec;
  private persistTimer = SHARD_CFG.persistSec;
  private lastSentZone = '';
  private lastSentDoodadRev = -1;
  private dressTimer = 0;
  private readonly pendingActions: { seat: string; action: MetaAction }[] = [];
  private timer: NodeJS.Timeout | null = null;
  private lastWall = 0;
  private accum = 0;
  private readonly keeperClass: ClassDef;
  /** THE RESUME LAW (server/wildsSave.ts): true while a saved wilds stands back
   *  up — no tick steps, no persist writes and no socket opens until ready(). */
  private wildsResuming = false;
  private resuming: Promise<void> = Promise.resolve();

  constructor(opts: ShardOptions = {}) {
    bootShardEngine();
    this.log = opts.log ?? ((line) => console.log(line));
    // THE HOSTED SEED: given, else the NEWEST world in the save dir (a restart
    // with no flag brings the same world back), else a fresh roll.
    const saveDir = opts.saveDir === null ? null : (opts.saveDir ?? SHARD_CFG.saveDir);
    this.seed = (opts.seed ?? (saveDir ? newestSavedSeed(saveDir, !!opts.worldmass) : undefined) ?? rollSeed()) >>> 0;
    this.account = makeAccount();
    if (opts.open) openAccount(this.account);
    this.keeperClass = this.classById(opts.keeperClass ?? SHARD_CFG.keeper.classId);
    this.world = this.standKeeperWorld();
    COOP_SCALING.shareRadius = SHARD_CFG.nearRadius; // THE NEAR LAW, the shard's own
    this.worldmass = !!opts.worldmass;
    this.savePath = opts.saveDir === null ? null
      : join(opts.saveDir ?? SHARD_CFG.saveDir, `shard_${this.seed.toString(16).padStart(8, '0')}${this.worldmass ? SHARD_CFG.wildsSaveSuffix : ''}.json`);
    if (this.worldmass) {
      // THE WILDS: the classic hearth boot above stands the keeper; the mass
      // runtime then re-seats the world as the one boundless surface (main.ts's
      // own order: createPlayer, then startWorldMass) — or THE WILDS SAVE stands
      // a saved surface back up in the mass lane's own resume order (wildsSave).
      const saved = this.savePath ? readWildsSave(this.savePath, SHARD_CFG.saveSchema, this.seed) : null;
      if (saved && 'ws' in saved) this.resuming = this.resumeWildsSave(saved.ws);
      else this.standFreshWilds(saved?.refused);
    } else {
      if (this.savePath && existsSync(this.savePath)) this.restore();
      else this.world.scrubStaleObjectives();
    }
    this.hearth = { x: this.keeper.actor.pos.x, y: this.keeper.actor.pos.y, tier: this.keeper.actor.tier };
    this.net = new ShardTransport();
    this.net.worldmass = this.worldmass;
    this.net.features = [...this.account.features];
    this.net.setSeedSource(() => this.world.manifest.seed);
    this.net.statusSource = () => this.status();
    // THE VESSEL + THE CORPSE records: the records file lives beside the world
    // save but never with it, so an ephemeral or worldmass world still
    // remembers its dead (absent only when the shard writes nothing at all).
    const toSeat = (msg: SessionMsg, to: string): void => this.net.sendSession(msg, to);
    const recordsDir = opts.saveDir === null ? null : opts.saveDir ?? SHARD_CFG.saveDir;
    this.corpses = new ShardCorpses(this.world, toSeat, shardRecordsPath(recordsDir, this.seed), this.seed, this.log);
    this.vessels = new VesselDesk(this.world, toSeat, this.corpses, { beatSec: SHARD_CFG.persistSec, log: this.log });
    this.net.onPeerJoin((p, join) => this.onJoin(p, join));
    this.net.onPeerLeave(id => { this.vessels.leave(id); this.graces.delete(id); this.world.removeSeat(id); });
    this.net.onSession((m, from) => this.onSession(m, from));
  }

  private classById(id: string): ClassDef {
    return CLASSES.find(c => c.id === id) ?? CLASSES[0];
  }

  /** The keeper's world: a real expedition manifest, one World, and THE KEEPER
   *  SEAT parked at the hearth's bedside. The boot's first half, and the fresh
   *  world a saved wilds that will not stand gives way to (wildsSave). */
  private standKeeperWorld(): World {
    const world = new World(this.account, Object.freeze(buildManifest(this.account, this.seed)));
    // A hosted world never freezes for one hand (the pause/harvest holds are solo policy).
    world.timeflow.allowHold = () => false;
    world.createPlayer(this.keeperClass, { name: SHARD_CFG.keeper.name, startingCompanions: false, startingFlasks: false });
    const keeper = world.localSeat;
    keeper.keeper = { reviveSec: SHARD_CFG.keeper.reviveSec };
    keeper.actor.untargetable = true;
    keeper.actor.passive = true;
    keeper.actor.invulnerable = true; // the warden stands in lava and water unharmed (THE SHADOW walks it anywhere)
    return world;
  }

  /** A fresh Unbroken Wilds under the keeper: no save, or one refused (the
   *  refused file is set aside first — THE WILDS SAVE's one log line). */
  private standFreshWilds(refused?: string): void {
    const aside = refused && this.savePath ? setAsideWildsSave(this.savePath) : null;
    this.world.startWorldMass(this.seed);
    this.log(`[shard] the Unbroken Wilds stand (seed 0x${this.seed.toString(16)}) — a fresh surface`
      + (refused ? `: the saved wilds would not stand (${refused})${aside ? `; set aside as ${aside}` : ''}` : ''));
  }

  /** THE WILDS SAVE (server/wildsSave.ts): the mass lane's resume order on the
   *  keeper's world. resumeWilds runs steps 1-4 inside the constructor and
   *  resolves after the neighborhood + finish; a world that will not stand is
   *  discarded for a fresh keeper world and a fresh wilds. */
  private async resumeWildsSave(ws: WorldStateSave): Promise<void> {
    this.wildsResuming = true;
    const t0 = performance.now();
    try {
      const r = await resumeWilds(this.world, ws, this.keeper);
      this.log(`[shard] resumed the Unbroken Wilds 0x${this.seed.toString(16)} (t=${Math.round(this.world.time)}s, ${r.natives} natives, `
        + `${r.pockets} pockets${r.wasInPocket ? ', the keeper back from a pocket' : ''}) in ${Math.round(performance.now() - t0)} ms`);
    } catch (e) {
      this.world.massRuntime?.dispose();
      this.world = this.standKeeperWorld();
      this.standFreshWilds(e instanceof Error ? e.message : String(e));
    } finally {
      this.wildsResuming = false;
    }
  }

  /** The keeper's seat (p0). */
  get keeper(): Seat { return this.world.localSeat; }

  /** THE RESUME LAW (server/wildsSave.ts): resolves once the hosted world
   *  stands — at once for a classic or a fresh shard, after the mass lane's
   *  neighborhood + finish for a saved wilds. A saved wilds that will not stand
   *  resolves as a fresh one; it rejects only when even a fresh wilds cannot
   *  stand (a fresh boot's own failure). Await it before the first tick. */
  ready(): Promise<void> { return this.resuming; }

  /** Open the socket; resolves the bound port (0 = any free port). THE RESUME
   *  LAW: a saved wilds answers no socket until it stood back up (wildsSave). */
  async listen(port: number, host = '0.0.0.0'): Promise<number> {
    await this.ready();
    return this.net.listen(port, host);
  }

  // ---- the session desk -----------------------------------------------------
  private onJoin(peer: PeerInfo, join?: ShardJoin): void {
    if (this.world.seats.some(s => s.id === peer.id)) return;
    // THE VESSEL: an uploaded hero grafts when the judgment allows; else the
    // fresh hero of the chosen class (M0's join, unchanged).
    const seat = this.vessels.seat(peer, join?.vessel);
    if (!seat) return; // THE LATE WORD: a fallen vessel's client hears its death; its class pick rejoins
    const vessel = this.vessels.vesselOf(peer.id);
    seat.actor.cosmeticLoadout = sanitizeCosmeticLoadout(peer.cosmeticLoadout);
    if (!vessel) seat.actor.name = peer.name || seat.actor.name;
    // THE HEARTH WAKE + THE SPAWN GRACE: up at the hearth, unseen by foes until
    // the first willed input (or the grace runs out).
    const hearth = this.hearthSeat(), r = seat.actor.radius;
    const at = this.world.clampPos(this.world.findFreeSpot({ x: hearth.x, y: hearth.y }, r + 2) ?? { x: hearth.x, y: hearth.y }, r);
    seat.actor.pos.x = at.x; seat.actor.pos.y = at.y; seat.actor.tier = hearth.tier;
    seat.actor.untargetable = true;
    this.graces.set(seat.id, this.world.time + SHARD_CFG.spawnGraceSec);
    // The joiner needs the standing terrain NOW, not at the next zone change.
    this.net.sendZoneTo(peer.id, serializeZone(this.world));
    this.lastSentZone = this.world.zone.id;
    this.log(`[shard] ${peer.id} joined as ${seat.meta.classDef.id}${vessel ? ` (the vessel ${seat.meta.name}, level ${this.world.seatHero(seat).level})` : ''} (${this.net.connectionCount()} connected)`);
  }

  private onSession(msg: SessionMsg, from: string): void {
    if (msg.t === 'action') {
      this.pendingActions.push({ seat: from, action: msg.action });
    } else if (msg.t === 'cosmetics') {
      const loadout = sanitizeCosmeticLoadout(msg.loadout);
      const peer = this.net.peers().find(p => p.id === from);
      if (peer) peer.cosmeticLoadout = loadout;
      const seat = this.world.seats.find(s => s.id === from);
      if (seat) (seat.home ?? seat.actor).cosmeticLoadout = loadout;
    } else if (msg.t === 'rejoin') {
      // A shard's run never ends, so a rejoin only ever re-seats a peer whose
      // seat is somehow gone (the co-op lane's reseatPeer, minus the new run).
      if (this.world.seats.some(s => s.id === from)) return;
      const peer = this.net.peers().find(p => p.id === from);
      // newRun FIRST: the client's render shell (and its zone subscription)
      // stands up on it, so the zone message the re-seat sends must follow it.
      this.net.sendSession({ t: 'newRun', seat: from, seed: this.world.manifest.seed }, from);
      // The account the connection named at its join rides the rejoin (THE
      // CORPSE RETURNS: a fallen vessel's player wakes beside its own dead).
      this.onJoin({ id: from, name: peer?.name ?? 'Joiner', classId: msg.classId, isHost: false, cosmeticLoadout: peer?.cosmeticLoadout, accountId: this.vessels.accountOf(from) });
    } else if (msg.t === 'leaving') {
      this.vessels.requestMirror(from); // THE FAREWELL: the vessel's last mirror before its socket closes
    }
  }

  /** HOST: apply this frame's queued client meta intents to their OWN seats.
   *  A malformed or hostile action must never throw out of the frame
   *  (main.ts drainMetaActions, verbatim). */
  private drainMetaActions(): void {
    if (!this.pendingActions.length) return;
    const landed = new Map<string, number>();
    for (const { seat: seatId, action } of this.pendingActions) {
      const seat = this.world.seats.find(s => s.id === seatId);
      if (!seat) continue;
      // THE ACTION BUDGET: a seat lands at most actionsPerSeatPerTick intents a
      // tick; a flood past it is dropped, never queued (a 20,000-row burst used
      // to apply whole in one tick).
      const n = (landed.get(seatId) ?? 0) + 1;
      landed.set(seatId, n);
      if (n > SHARD_CFG.actionsPerSeatPerTick) continue;
      if (!action || typeof action !== 'object' || typeof (action as { t?: unknown }).t !== 'string') continue;
      // THE SEALED ROADS: intents that move the WHOLE party stay shut on a
      // keeper world until per-seat travel exists (card 15).
      if (action.t === 'caravanTo' || action.t === 'townPortal') continue;
      try { this.world.applyAction(seat, action); }
      catch (e) { this.noteFault(`meta action from ${seatId}`, e); }
    }
    this.pendingActions.length = 0;
  }

  /** One fault ledger for every lane: counted always, printed at most once
   *  per faultLogSec (a fault every tick would otherwise fill the disk). */
  private noteFault(where: string, e: unknown): void {
    this.faults++;
    this.faultsSinceLog++;
    const now = Date.now();
    if (now - this.lastFaultLogAt >= SHARD_CFG.faultLogSec * 1000) {
      this.lastFaultLogAt = now;
      this.log(`[shard] fault in ${where} at tick ${this.ticks} (${this.faultsSinceLog} since the last line): ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
      this.faultsSinceLog = 0;
    }
  }

  /** THE WARDEN STANDS, every tick, both lanes: the engine may strip the
   *  keeper's flags (a traversal's landing clears invulnerable/untargetable),
   *  a stray blow may down or kill it, and its level is the world's own
   *  "character level" in forty-one reads (event gates, vendor shelves, bounty
   *  work, sidezone mints) — so it wears the flags again, stands up, and
   *  mirrors the highest standing player's level. It also acted this very
   *  frame, so THE SEALED ROADS hold (a dwell reads an idle seat). */
  private wardenStand(): void {
    const w = this.world;
    const keeper = this.keeper;
    const k = keeper.actor;
    k.invulnerable = true; k.untargetable = true; k.passive = true;
    if (k.downed || k.dead) { k.downed = false; k.dead = false; }
    if (k.life <= 0) k.life = k.maxLife();
    keeper.lastActedAt = w.time;
    let level = 0;
    for (const s of w.seats) if (!s.keeper && !s.actor.dead) level = Math.max(level, s.actor.level);
    if (level > 0 && k.level !== level) { k.level = level; w.recalcSeat(keeper); }
  }

  // ---- the host frame -------------------------------------------------------
  /** One engine step: the host frame verbatim, then the wire, then the beats. */
  tick(dt: number): void {
    if (this.wildsResuming) return; // THE RESUME LAW: no frame meets a half-stood world (wildsSave)
    const w = this.world;
    // THE GUARDED PHASES: a throw in the simulate phase never skips the wire
    // or the beats (clients used to freeze and saves to stop), and THE
    // BREAKER counts the run of faulting ticks.
    try {
      this.wardenStand();
      if (this.worldmass) this.shadowFocus();
      for (const seat of w.seats) {
        const intent = seat.input.poll(seat.actor, w, dt); // RemoteInput polls null — its intent arrives via the wire
        if (intent) this.net.sendInput(seat.id, intent);
      }
      const inputs = this.net.drainInputs();
      this.endGraces(inputs);
      w.applyInputs(inputs, dt);
      this.drainMetaActions();
      if (!w.gameOver) for (const a of w.actors) updateAI(a, w, dt);
      w.update(dt);
      this.consecutiveFaults = 0;
    } catch (e) {
      this.noteFault('the simulate phase', e);
      this.consecutiveFaults++;
      if (!this.broken && this.consecutiveFaults >= SHARD_CFG.faultBreakerTicks) {
        this.broken = true;
        this.log(`[shard] THE BREAKER: ${this.consecutiveFaults} faulting ticks running — the world is held; a supervisor should restart it`);
        this.onBroken?.();
      }
    }
    this.ticks++;
    this.vessels.tick(dt); // THE VESSEL: THE DEATH COVENANT (before THE MERCY could answer) + the mirror beat
    this.corpses.tick(dt); // THE CORPSE RETURNS: each seat's own standing bodies + the reclaim dwell

    if (this.net.connectionCount() > 0) {
      this.dressTimer -= dt;
      if (w.zone.id !== this.lastSentZone) {
        this.lastSentZone = w.zone.id;
        this.lastSentDoodadRev = w.doodadsVersion();
        this.dressTimer = SHARD_CFG.dressSec;
        this.net.sendZone(serializeZone(w));
      } else if (this.dressTimer <= 0 && w.doodadsVersion() !== this.lastSentDoodadRev) {
        // THE DRESS BEAT: the roster moved (the wilds grew, a tree fell, a swap
        // kept the count) — the engine's own doodad revision is the signal.
        this.lastSentDoodadRev = w.doodadsVersion();
        this.dressTimer = SHARD_CFG.dressSec;
        this.net.sendZone(serializeZone(w));
      }
      this.metaHeartbeat -= dt;
      if (this.metaHeartbeat <= 0) {
        this.metaHeartbeat = SHARD_CFG.metaHeartbeatSec;
        for (const s of w.seats) w.markMetaDirty(s);
      }
      // THE WIRE RATE on integer ticks (60 / 20 = every 3rd): a reset timer
      // under a fixed step fired every 4th tick — 15 Hz wearing a 20 Hz name.
      if (this.ticks % Math.max(1, Math.round(SHARD_CFG.tickHz / SHARD_CFG.stateHz)) === 0) {
        this.net.sendState(serializeSnapshot(w, ++this.snapTick));
        w.metaDirty.clear();
      }
    }
    if (this.savePath) {
      this.persistTimer -= dt;
      if (this.persistTimer <= 0) { this.persistTimer = SHARD_CFG.persistSec; this.persist(); }
    }
  }

  /** THE SHADOW: the keeper's body follows the focus seat on the wilds (see
   *  SHARD_CFG.keeper.shadowOffset). The first standing non-keeper seat is
   *  the focus; with none connected the keeper stays where it last stood. */
  private shadowFocus(): void {
    const focus = this.focusSeat();
    if (!focus) return;
    const k = this.keeper.actor;
    k.pos.x = focus.actor.pos.x;
    k.pos.y = focus.actor.pos.y + SHARD_CFG.keeper.shadowOffset;
    k.tier = focus.actor.tier;
  }

  /** THE HEARTH SEAT: the wilds' native settlement keeps its own bedside
   *  (MassSettlement.spawn — the same spot on a fresh or a resumed surface);
   *  a classic world's is where the keeper first stood. */
  hearthSeat(): { x: number; y: number; tier: number } {
    const s = this.world.massRuntime?.settlement?.spawn;
    return s ? { x: s.x, y: s.y, tier: this.hearth.tier } : this.hearth;
  }

  /** THE SPAWN GRACE ends at the first willed input or at its clock. */
  private endGraces(inputs: Map<string, PlayerInput>): void {
    if (!this.graces.size) return;
    for (const [id, until] of this.graces) {
      const inp = inputs.get(id);
      const willed = !!inp && (inp.dx !== 0 || inp.dy !== 0 || inp.held.some(Boolean) || inp.edge.some(Boolean) || (inp.metaEdge?.some(Boolean) ?? false));
      if (!willed && this.world.time < until) continue;
      this.graces.delete(id);
      const seat = this.world.seats.find(s => s.id === id);
      if (seat && !seat.keeper) seat.actor.untargetable = false;
    }
  }

  /** THE FOCUS: the standing seat that acted most recently, with hysteresis —
   *  the current focus keeps it unless another standing seat has been newer
   *  by focusSwapSec (an idle or downed first joiner no longer pins the
   *  world's life to itself; a jump across the map costs a cold tick, so it
   *  is never flapped). Null = none connected. */
  focusSeat(): Seat | null {
    const standing = this.world.seats.filter(s => !s.keeper && !s.actor.dead && !s.actor.downed);
    if (!standing.length) { this.focusId = null; return null; }
    const score = (s: Seat): number => Math.max(s.lastActedAt, s.lastMovedAt);
    let best = standing[0];
    for (const s of standing) if (score(s) > score(best)) best = s;
    const current = standing.find(s => s.id === this.focusId);
    if (current && score(best) - score(current) < SHARD_CFG.focusSwapSec) return current;
    this.focusId = best.id;
    return best;
  }

  /** Start the wall-clock pump (fixed steps, bounded catch-up). */
  start(): void {
    if (this.timer) return;
    this.lastWall = performance.now();
    this.accum = 0;
    this.timer = setInterval(() => this.pump(), 1000 / SHARD_CFG.tickHz);
  }

  private pump(): void {
    const now = performance.now();
    this.accum += (now - this.lastWall) / 1000;
    this.lastWall = now;
    const dt = 1 / SHARD_CFG.tickHz;
    let n = 0;
    while (this.accum >= dt && n < SHARD_CFG.maxCatchUpTicks) {
      const t0 = performance.now();
      try { this.tick(dt); }
      catch (e) {
        this.faults++;
        this.faultsSinceLog++;
        // One stack per faultLogSec; a fault every tick would otherwise drown the log.
        if (now - this.lastFaultLogAt >= SHARD_CFG.faultLogSec * 1000) {
          this.lastFaultLogAt = now;
          this.log(`[shard] engine fault at tick ${this.ticks} (${this.faultsSinceLog} since the last line): ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
          this.faultsSinceLog = 0;
        }
      }
      const ms = performance.now() - t0;
      if (this.tickMs.length < SHARD_CFG.telemetryTicks) this.tickMs.push(ms);
      else { this.tickMs[this.tickMsAt] = ms; this.tickMsAt = (this.tickMsAt + 1) % SHARD_CFG.telemetryTicks; }
      this.accum -= dt;
      n++;
    }
    if (n >= SHARD_CFG.maxCatchUpTicks && this.accum >= dt) {
      // A long stall is dropped, never replayed — and counted, so the status
      // page shows a world that ran slow for everyone.
      this.droppedTicks += Math.floor(this.accum / dt);
      this.accum = 0;
    }
  }

  /** THE STATUS PAGE (served by the transport on a plain GET): what the world is doing. */
  status(): Record<string, unknown> {
    const sorted = [...this.tickMs].sort((a, b) => a - b);
    const q = (p: number): number => sorted.length ? +sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))].toFixed(2) : 0;
    const w = this.world;
    return {
      world: this.worldmass ? 'the Unbroken Wilds' : 'classic',
      seed: '0x' + this.seed.toString(16).padStart(8, '0'),
      zone: w.zone.id,
      clock: +w.time.toFixed(1),
      uptimeSec: Math.round((Date.now() - this.bootAt) / 1000),
      seats: w.seats.filter(s => !s.keeper).map(s => ({ id: s.id, name: s.actor.name, level: s.actor.level, alive: !s.actor.dead && !s.actor.downed })),
      connections: this.net.connectionCount(),
      ticks: this.ticks,
      tickMsP50: q(0.5), tickMsP95: q(0.95),
      droppedTicks: this.droppedTicks,
      faults: this.faults + this.net.faults,
      actors: w.actors.length,
      saving: this.savePath ? basename(this.savePath) : 'ephemeral',
      broken: this.broken,
    };
  }

  /** Stop the pump, write the world, close the wire. */
  async stop(opts: { persist?: boolean } = {}): Promise<void> {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.savePath && opts.persist !== false) this.persist();
    this.vessels.mirrorAll(); // THE MIRROR: every vessel home before the wire closes (a broken world's heroes are not broken)
    await this.net.close();
  }

  // ---- persistence ----------------------------------------------------------
  /** Write the world half (WorldStateSave) under the shard's own wrapper — on
   *  the wilds the mass half rides it (`worldmass` + `massSideareas`, wildsSave). */
  persist(): void {
    if (!this.savePath || this.wildsResuming || this.broken) return; // THE RESUME LAW; and a broken world never overwrites its last good save
    try {
      const save: ShardSave = { schemaVersion: SHARD_CFG.saveSchema, seed: this.seed, savedAt: Date.now(), world: this.world.serializeWorldState() };
      mkdirSync(dirname(this.savePath), { recursive: true });
      const tmp = this.savePath + '.tmp';
      writeFileSync(tmp, JSON.stringify(save));
      renameSync(tmp, this.savePath);
    } catch (e) {
      this.log(`[shard] persist failed: ${String(e)}`);
    }
  }

  /** Adopt a prior shard save (main.ts restoreWorldState's order): the world
   *  stands up around the keeper, the reconcile trio heals old roads, and
   *  the keeper wakes in the hearth. A save that will not stand resumes fresh. */
  private restore(): void {
    let save: ShardSave | null = null;
    try { save = JSON.parse(readFileSync(this.savePath!, 'utf-8')) as ShardSave; } catch { save = null; }
    const ws = save?.world;
    if (!save || save.schemaVersion !== SHARD_CFG.saveSchema || !ws || ws.schemaVersion !== WORLD_SCHEMA_VERSION
      || ws.worldmass // a wilds world half is THE WILDS SAVE's (wildsSave), never a classic world's
      || !this.world.adoptWorldState(ws)) {
      this.world.scrubStaleObjectives();
      // THE REFUSED SAVE IS KEPT: set aside under its own name, never
      // overwritten by the fresh world's first beat (a build bump used to wipe
      // every classic shard twenty seconds after it restarted).
      const aside = setAsideWildsSave(this.savePath!);
      this.log(`[shard] no usable save at ${this.savePath} — a fresh world${aside ? `; the old file set aside as ${basename(aside)}` : ''}`);
      return;
    }
    this.world.reconcileSoulrivers();
    this.world.reconcileSeaPorts();
    this.world.reconcileWebLaws();
    this.world.resumeSpawn('town', ws.player);
    this.log(`[shard] resumed world ${this.seed.toString(16)} (${ws.zones.length} zones, t=${Math.round(ws.time)}s)`);
  }
}
