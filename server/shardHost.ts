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
// THE SIM UNITS (M1, server/simUnits.ts + engine/shardUnits.ts): one World per
// live zone. The keeper's World stays `this.world` (the chart, the clock, the
// account, the world sweeps); every other live zone is a UNIT the registry
// wakes and sleeps, a seat moves between them by THE HAND-OFF, each unit ticks
// under THE PIN and ships its own snapshot to its own seats. A joiner is a
// fresh level-1 hero (or its vessel) and every account-gated read rides the
// shard's own account (THE KEEPER'S GATE) until M2.
// ---------------------------------------------------------------------------

import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, statSync, writeSync } from 'node:fs';
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
import { noteActionEcho, resetActionEcho, serializeSnapshot, serializeZone } from '../src/net/snapshot';
import { stampAudiences } from '../src/net/seatView';
import type { PeerInfo, SessionMsg } from '../src/net/transport';
import type { MetaAction, PlayerInput } from '../src/net/intent';
import { massDigest } from '../src/worldmass/random';
import { PartyDesk } from './party';
import { sanitizeCosmeticLoadout } from '../src/meta/cosmetics';
import { WORLD_SCHEMA_VERSION, type WorldStateSave } from '../src/meta/worldstate';
import { ShardTransport, type ShardJoin } from './shardTransport';
import { VesselDesk } from './vessel';
import { ShardCorpses, shardRecordsPath } from './corpses';
import { UnitRegistry, type SimUnit } from './simUnits';
import { UNIT_CFG, unitClocks } from '../src/engine/shardUnits';
import { readWildsSave, resumeWilds, setAsideWildsSave } from './wildsSave';

export const SHARD_CFG = {
  /** The fixed engine step (the sim harness's cadence; the live host's cap is 0.05). */
  tickHz: 60,
  /** Snapshot cadence (main.ts STATE_HZ). */
  stateHz: 20,
  /** Re-dirty every seat's meta this often (main.ts META_HEARTBEAT). */
  metaHeartbeatSec: 1.5,
  /** THE MIRROR BEAT: the vessels mirror home this often (VesselDesk.beatSec); a few KB each. */
  persistSec: 20,
  /** THE WORLD SAVE BEAT: write the world half this often. Measured 2026-10-09 on the wilds:
   *  serializeWorldState() alone costs 150-200 ms (3.9 of its 6.5 MB is THE LAND, a pure
   *  function of the seed), a stall every beat — so the world writes a third as often as the
   *  mirrors until the seamless lane's save omits the land (charter §6.6). A crash loses at
   *  most this much of the world; the heroes lose at most persistSec. */
  worldSaveSec: 60,
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
  /** THE SCOPED FREEZE (card 18 B with C): a time stop on a shard bends this radius
   *  around its caster and never the caster's own team. */
  chronoRadius: 900,
  /** THE HEARTH WAKE: a joiner stands up at the hearth (never beside the
   *  shadowed keeper, wherever that is) and is untargetable until its first
   *  willed input or spawnGraceSec, whichever comes first. */
  spawnGraceSec: 20,
  /** THE DORMANT SEAT (card 16 B): a socket that closes without its client's
   *  word (`session leaving`) leaves its hero standing in the world, input-less
   *  and fully targetable, this many world seconds before the leave path runs;
   *  a join carrying THE RECONNECT TOKEN takes the seat back meanwhile. Never a
   *  free escape: a hero that dies dormant dies by the ordinary law. */
  dormantSec: 30,
  /** THE FOCUS: the keeper shadows the standing seat that acted most recently;
   *  the current focus keeps it unless another seat has been newer by this many seconds. */
  focusSwapSec: 3,
  /** THE ROVING SHADOW (the wilds; docs/engine/shard.md): when the standing seats
   *  form more than one CLUSTER (bodies farther apart than clusterPx; 0 = the mass
   *  runtime's populationRadius), the keeper's shadow visits each cluster in turn
   *  for `sec` seconds of world time, so the runtime's one position (its pages,
   *  births, discovery, survey and ecology) reaches every player over time instead
   *  of the focus alone. One cluster = THE SHADOW exactly as before (no hop ever).
   *  sec 0 = off (the focus alone, the pre-rove law). SHIPS OFF: measured 2026-10-09
   *  with 6 bots spread 3,500 px (balance/soak_shard.ts --spread 3500 --rove N), a 2 s
   *  cadence lifted the living radius (foes within reach of each player) from a mean of
   *  3.2 to 8.1 but every hop re-keyed the runtime (pages, places, scenery, ecology) at
   *  ~135 ms a tick and the sustained load dropped 68% of ticks; the honest fix is THE
   *  MANY SHADOWS inside the runtime (several foci, no re-keying), charter §7d. */
  rove: { sec: 0, clusterPx: 0 },
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
  /** THE RUN ROW (shard M1, plan section 6): the keeper's character-save half
   *  that is world-level in function, which a shard never persisted before.
   *  Optional and read tolerantly: absent = a restart forgets them, as before. */
  run?: ShardRunRow;
}

/** The run row's shape (each field tolerant on read). */
export interface ShardRunRow {
  completedObjectives: string[];
  ledger: Record<string, number>;
  throngClaimed: string[];
  annexFound: string[];
}

/** THE RUN ROW, captured off the keeper's World. */
export function captureRunRow(w: World): ShardRunRow {
  return {
    completedObjectives: [...w.completedObjectives], ledger: { ...w.ledger },
    throngClaimed: [...w.throngClaimed], annexFound: [...w.annexFound],
  };
}

/** THE RUN ROW, adopted onto the keeper's World after its world half stood:
 *  every field optional, every value checked; a clear whose ground the world
 *  half no longer carries drops (the character save's own law: kept zones and
 *  the stable cave_ namespace). */
export function adoptRunRow(w: World, raw: unknown): void {
  if (!raw || typeof raw !== 'object') return;
  const run = raw as Partial<Record<keyof ShardRunRow, unknown>>;
  const strs = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  if (Array.isArray(run.completedObjectives)) {
    w.completedObjectives = new Set(strs(run.completedObjectives).filter(id => !!w.zoneMap[id] || id.startsWith('cave_')));
  }
  if (run.ledger && typeof run.ledger === 'object' && !Array.isArray(run.ledger)) {
    w.ledger = Object.fromEntries(Object.entries(run.ledger as Record<string, unknown>)
      .filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1])));
  }
  if (Array.isArray(run.throngClaimed)) w.throngClaimed = new Set(strs(run.throngClaimed));
  if (Array.isArray(run.annexFound)) w.annexFound = new Set(strs(run.annexFound));
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
  /** THE SIM UNITS (server/simUnits.ts): the keeper and every live unit, THE SEAT
   *  LEDGER, THE HAND-OFF QUEUE and the direct `travel` door. */
  readonly units: UnitRegistry;
  /** THE ROVING SHADOW's seat (the most recent seat of the cluster being visited), the
   *  world time its visit ends, and the hops taken (the status page's `rove`). */
  private roveAnchorId: string | null = null;
  private roveUntil = 0;
  roveHops = 0;
  /** THE HEARTH: where the keeper first stood (the bedside, the hearth's spawn) — every joiner wakes here. */
  private hearth: { x: number; y: number; tier: number } = { x: 0, y: 0, tier: 0 };
  /** THE SPAWN GRACE: seat id → world time the grace ends. */
  private readonly graces = new Map<string, number>();
  /** THE PARTY (server/party.ts). */
  readonly parties: PartyDesk;
  private partyRevSeen = -1;
  /** THE DORMANT SEAT: seat id → world time its dormancy ends (the leave path runs then). */
  private readonly dormancy = new Map<string, number>();
  private readonly bootAt = Date.now();
  private readonly tickMs: number[] = [];
  private tickMsAt = 0;
  private lastFaultLogAt = 0;
  private faultsSinceLog = 0;

  private snapTick = 0;
  private metaHeartbeat = SHARD_CFG.metaHeartbeatSec;
  private persistTimer = SHARD_CFG.worldSaveSec; // THE WORLD SAVE BEAT
  private readonly pendingActions: { seat: string; action: MetaAction; seq?: unknown }[] = []; // seq: THE ECHO LAW
  private timer: NodeJS.Timeout | null = null;
  private lastWall = 0;
  private accum = 0;
  private readonly keeperClass: ClassDef;
  /** THE RESUME LAW (server/wildsSave.ts): true while a saved wilds stands back
   *  up — no tick steps, no persist writes and no socket opens until ready(). */
  private wildsResuming = false;
  private resuming: Promise<void> = Promise.resolve();
  /** THE RUN ROW a saved wilds carried (adopted once the surface stood). */
  private wildsRun: unknown = undefined;

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
    this.units = new UnitRegistry(this.world, {
      wardenClass: this.keeperClass, wardenName: SHARD_CFG.keeper.name, reviveSec: SHARD_CFG.keeper.reviveSec,
      publish: (w, u) => this.publishInto(w, u),
      hearth: () => this.hearthSeat(),
      breakerTicks: () => SHARD_CFG.faultBreakerTicks,
      log: line => this.log(line),
    });
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
      if (saved && 'ws' in saved) { this.wildsRun = saved.run; this.resuming = this.resumeWildsSave(saved.ws); }
      else this.standFreshWilds(saved?.refused);
    } else {
      if (this.savePath && existsSync(this.savePath)) this.restore();
      else this.world.scrubStaleObjectives();
    }
    this.hearth = { x: this.keeper.actor.pos.x, y: this.keeper.actor.pos.y, tier: this.keeper.actor.tier };
    this.net = new ShardTransport();
    this.net.log = this.log;
    this.net.worldmass = this.worldmass;
    this.net.features = [...this.account.features];
    this.net.land = this.world.massRuntime ? massDigest(this.world.massRuntime.config) : null; // THE LAND DIGEST (wildsSave.shellLandDigest)
    this.net.setSeedSource(() => this.world.manifest.seed);
    this.net.statusSource = () => this.status();
    // THE VESSEL + THE CORPSE records: the records file lives beside the world
    // save but never with it, so an ephemeral or worldmass world still
    // remembers its dead (absent only when the shard writes nothing at all).
    const toSeat = (msg: SessionMsg, to: string): void => this.net.sendSession(msg, to);
    const recordsDir = opts.saveDir === null ? null : opts.saveDir ?? SHARD_CFG.saveDir;
    this.corpses = new ShardCorpses(this.units, toSeat, shardRecordsPath(recordsDir, this.seed), this.seed, this.log);
    // THE PARTY (server/party.ts, card 23): the explicit social unit; the keeper is never seated in one.
    this.parties = new PartyDesk(id => !!this.units.seatOf(id));
    this.publishInto(this.world, this.units.keeper); // HOST class: the link, the party, the corpse marks, the timeflow policies
    this.vessels = new VesselDesk(this.units, toSeat, this.corpses, {
      beatSec: SHARD_CFG.persistSec, log: this.log,
      party: id => this.parties.membersOf(id), // THE GROUP LAW
      onSeatGone: id => { this.parties.dropSeat(id); this.units.forget(id); },
    });
    this.units.onArrive = (seat, to, from, woke) => this.onArrive(seat, to, from, woke);
    // THE IDENTITY (THE SMOOTH SHELL): a join carrying a dormant vessel's account and character
    // takes that seat back without its token, never the twin refusal.
    this.net.reclaim = (accountId, charId) => this.vessels.dormantSeatOf(accountId, charId, id => this.net.isDormant(id));
    this.net.onPeerJoin((p, join) => this.onJoin(p, join));
    this.net.onPeerLeave(id => {
      this.dormancy.delete(id); // THE DORMANT SEAT: the word, a clock run out or a closing shard ends any dormancy
      this.vessels.leave(id); this.graces.delete(id);
      // THE SEAT LEDGER: the leave runs in the unit the seat stands in.
      this.units.within(id, w => { w.removeSeat(id); w.settleNearScale(true); }); // keeperSeat: THE NEAR LAW re-read after the leave
      this.units.forget(id);
      this.parties.dropSeat(id); // THE PARTY: out of its party and its invites
    });
    this.net.onPeerDormant((id, worded) => this.onDormant(id, worded)); // THE DORMANT SEAT: a lost socket's hero stays, on a clock
    this.net.leaveHolds = id => this.vessels.inCombat(id); // THE ACTING SEAT: a word said mid-fight sleeps like a lost socket
    this.net.onPeerResume(id => this.onResume(id)); // THE RECONNECT TOKEN: the clock stops, the seat's world re-ships
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
    world.timeflow.chronoScope = { radius: SHARD_CFG.chronoRadius }; // keeperSeat: THE SCOPED FREEZE
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
      adoptRunRow(this.world, this.wildsRun); // THE RUN ROW (absent = today)
      this.log(`[shard] resumed the Unbroken Wilds 0x${this.seed.toString(16)} (t=${Math.round(this.world.time)}s, ${r.natives} natives, `
        + `${r.pockets} pockets${r.wasInPocket ? ', the keeper back from a pocket' : ''}) in ${Math.round(performance.now() - t0)} ms`);
    } catch (e) {
      this.world.massRuntime?.dispose();
      this.world = this.standKeeperWorld();
      this.units.rebindKeeper(this.world); // THE SIM UNITS: the keeper unit follows the world that stands
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
    if (this.units.unitOf(peer.id)) return; // THE SEAT LEDGER: the seat already stands somewhere
    // THE VESSEL: an uploaded hero grafts when the judgment allows; else the
    // fresh hero of the chosen class (M0's join, unchanged).
    const seat = this.vessels.seat(peer, join?.vessel);
    if (!seat) return; // THE LATE WORD: a fallen vessel's client hears its death; its class pick rejoins
    const vessel = this.vessels.vesselOf(peer.id);
    seat.actor.cosmeticLoadout = sanitizeCosmeticLoadout(peer.cosmeticLoadout);
    // THE NAME (card 17 A): the body wears the name entered once — the vessel's own, else the join's.
    seat.actor.name = (vessel ? seat.meta.name : peer.name) || seat.actor.name;
    // THE HEARTH WAKE + THE SPAWN GRACE: up at the hearth, unseen by foes until
    // the first willed input (or the grace runs out).
    const hearth = this.hearthSeat(), r = seat.actor.radius;
    const at = this.world.clampPos(this.world.findFreeSpot({ x: hearth.x, y: hearth.y }, r + 2) ?? { x: hearth.x, y: hearth.y }, r);
    seat.actor.pos.x = at.x; seat.actor.pos.y = at.y; seat.actor.tier = hearth.tier;
    seat.actor.untargetable = true;
    this.graces.set(seat.id, this.world.time + SHARD_CFG.spawnGraceSec);
    this.world.settleNearScale(true); // keeperSeat: addSeat scaled every body beside the shadowed keeper; the hearth is where the joiner stands
    // The joiner needs the standing terrain NOW, not at the next zone change.
    this.net.sendZoneTo(peer.id, serializeZone(this.world));
    this.units.keeper.lastSentZone = this.world.zone.id;
    this.log(`[shard] ${peer.id} joined as ${seat.meta.classDef.id}${vessel ? ` (the vessel ${seat.meta.name}, level ${this.world.seatHero(seat).level})` : ''} (${this.net.connectionCount()} connected)`);
  }

  /** THE DORMANT SEAT (card 16 B): a socket was lost without its client's
   *  word. The hero stays in the world, standing, input-less and fully
   *  targetable, for dormantSec (dying meanwhile is the ordinary death: the
   *  covenant or the mercy), its vessel and corpse records kept. THE UNTRIED
   *  SEAT (still under THE SPAWN GRACE: unseen by foes, it never willed a
   *  step) has nothing to escape and leaves at once, and a seat with no body
   *  left (a fall took it) has nothing to wake. */
  private onDormant(id: string, worded = false): void {
    const seat = this.units.seatOf(id);
    if (!seat || this.graces.has(id)) { this.net.release(id); return; }
    this.dormancy.set(id, this.world.time + SHARD_CFG.dormantSec);
    this.corpses.sleep(id); // a body with no hand reclaims nothing
    this.log(`[shard] ${id} ${worded ? 'left mid-fight' : 'lost its connection'}; its hero lies dormant ${SHARD_CFG.dormantSec}s (${this.net.connectionCount()} connected)`);
  }

  /** THE RECONNECT TOKEN: a dormant seat's player is back on a new
   *  connection. The clock stops, and the fresh shell gets what a joiner gets:
   *  the terrain now, the seat's whole meta on the next snapshot, its own
   *  bodies' rows, and an input ack counted from zero again. */
  private onResume(id: string): void {
    this.dormancy.delete(id);
    const u = this.units.unitOf(id), seat = this.units.seatOf(id);
    if (!u || !seat) return; // (never: a seat with no body is released at once, so it cannot be resumed)
    const w = u.world; // THE DORMANT SEAT per unit: the seat's own unit re-ships
    w.lastInputSeq.delete(id); // the new shell counts its inputs from zero
    resetActionEcho(seat); // THE ECHO LAW: and its actions too
    w.markMetaDirty(seat);
    w.journalDirty.add(id); // THE COUNTERS AND THE JOURNAL: the new shell hears its journal on its first snapshot
    this.corpses.wake(id);
    this.net.sendZoneTo(id, serializeZone(w));
    u.lastSentZone = w.zone.id;
    this.log(`[shard] ${id} resumed its dormant hero (${this.net.connectionCount()} connected)`);
  }

  /** THE DORMANT SEAT's clock: a seat whose dormancy ran out, or whose body a
   *  fall already took (THE DEATH COVENANT reads a dormant vessel as any), is
   *  released: the peers hear `pleave`, then the leave path runs. */
  private sweepDormancy(): void {
    if (!this.dormancy.size) return;
    const now = this.world.time; // THE ONE CLOCK
    for (const [id, until] of [...this.dormancy]) {
      if (now < until && this.units.seatOf(id)) continue;
      this.dormancy.delete(id);
      this.net.release(id);
    }
  }

  private onSession(msg: SessionMsg, from: string): void {
    if (msg.t === 'action') {
      this.pendingActions.push({ seat: from, action: msg.action, seq: msg.seq }); // THE ECHO LAW: the client's seq rides along
    } else if (msg.t === 'cosmetics') {
      const loadout = sanitizeCosmeticLoadout(msg.loadout);
      const peer = this.net.peers().find(p => p.id === from);
      if (peer) peer.cosmeticLoadout = loadout;
      const seat = this.units.seatOf(from);
      if (seat) (seat.home ?? seat.actor).cosmeticLoadout = loadout;
    } else if (msg.t === 'rejoin') {
      // A shard's run never ends, so a rejoin only ever re-seats a peer whose
      // seat is somehow gone (the co-op lane's reseatPeer, minus the new run).
      if (this.units.unitOf(from)) return;
      const peer = this.net.peers().find(p => p.id === from);
      // newRun FIRST: the client's render shell (and its zone subscription)
      // stands up on it, so the zone message the re-seat sends must follow it.
      this.net.sendSession({ t: 'newRun', seat: from, seed: this.world.manifest.seed }, from);
      // The account the connection named at its join rides the rejoin (THE
      // CORPSE RETURNS: a fallen vessel's player wakes beside its own dead).
      this.onJoin({ id: from, name: peer?.name ?? 'Joiner', classId: msg.classId, isHost: false, cosmeticLoadout: peer?.cosmeticLoadout, accountId: this.vessels.accountOf(from) });
    } else if (msg.t === 'leaving') {
      // THE FAREWELL: the vessel's last mirror before its socket closes. THE ACTING
      // SEAT: never mid-fight (that leave sleeps like a lost socket; the beat's mirror stands).
      if (!this.vessels.inCombat(from)) this.vessels.requestMirror(from);
    } else if (msg.t === 'party') {
      this.onPartyWord(msg, from);
    }
  }

  /** HOST: apply this frame's queued client meta intents to their OWN seats.
   *  A malformed or hostile action must never throw out of the frame
   *  (main.ts drainMetaActions, verbatim). */
  private drainMetaActions(u: SimUnit, w: World, actions: readonly { seat: string; action: MetaAction; seq?: unknown }[]): void {
    if (!actions.length) return;
    const landed = new Map<string, number>();
    for (const { seat: seatId, action, seq } of actions) {
      // THE SEAT LEDGER: an action applies inside its own seat's unit, under its pin.
      if (this.units.unitOf(seatId) !== u) continue;
      const seat = w.seats.find(s => s.id === seatId && !s.keeper);
      if (!seat) continue;
      // THE ECHO LAW (net/shell.ts): every action of a standing seat is JUDGED here (applied,
      // refused, or dropped below), and its seq echoes home on the seat's build, so the
      // client's optimistic state yields to this tick's truth.
      noteActionEcho(w, seat, seq);
      // THE ACTION BUDGET: a seat lands at most actionsPerSeatPerTick intents a
      // tick; a flood past it is dropped, never queued (a 20,000-row burst used
      // to apply whole in one tick).
      const n = (landed.get(seatId) ?? 0) + 1;
      landed.set(seatId, n);
      if (n > SHARD_CFG.actionsPerSeatPerTick) continue;
      if (!action || typeof action !== 'object' || typeof (action as { t?: unknown }).t !== 'string') continue;
      // THE ROADS PER PLAYER (shard M1 W2): caravanTo, townPortal and the
      // waypoint are judged for the acting seat inside its own unit and move
      // that seat alone (a ticket the hand-off queue drains after every unit).
      try { w.applyAction(seat, action); }
      catch (e) { this.noteFault(`meta action from ${seatId}`, e); }
    }
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
   *  frame, so the solo road block (which reads only its World's own player)
   *  never carries a warden anywhere; every seat's roads are THE SHARD
   *  SCANNER's (THE ROADS PER PLAYER, engine/shardRoads.ts). */
  private wardenStand(u: SimUnit): void {
    const w = u.world;
    const keeper = w.localSeat;
    const k = keeper.actor;
    // THE UNIT WARDEN: every warden levitates too (out of the sky-fall and the pit,
    // which travel only the world's player), whoever it shadows.
    k.invulnerable = true; k.untargetable = true; k.passive = true; k.levitates = true;
    if (k.downed || k.dead) { k.downed = false; k.dead = false; }
    if (k.life <= 0) k.life = k.maxLife();
    keeper.lastActedAt = w.time;
    // The keeper mirrors the highest standing level SHARD-WIDE (the world's own
    // character level: event gates, package draws); a unit, the highest in it.
    let level = 0;
    for (const s of u.role === 'keeper' ? this.units.allSeats() : w.seats) if (!s.keeper && !s.actor.dead) level = Math.max(level, s.actor.level);
    if (level > 0 && k.level !== level) { k.level = level; w.recalcSeat(keeper); }
  }

  /** HOST class (shard M1): the host's fields published into a World it runs, at
   *  boot, at every wake and when a refused wilds save replaces the keeper's
   *  World: the timeflow policies, the party, the corpse marks, and the link. */
  private publishInto(w: World, u: SimUnit): void {
    w.timeflow.allowHold = () => false; // a hosted world never freezes for one hand
    w.timeflow.chronoScope = { radius: SHARD_CFG.chronoRadius }; // keeperSeat: THE SCOPED FREEZE
    w.partyMates = id => this.parties.membersOf(id); // keeperSeat lane: THE KILLER'S DUE pays the party
    // THE COUNTERS AND THE JOURNAL: a seat's own remembered bodies ride its journal row's pins (the corpse on the chart).
    w.seatCorpseMarks = seat => this.corpses.forAccount(this.vessels.accountOf(seat.id))
      .map(c => ({ zoneId: c.zoneId, ...(c.map ? { map: { ...c.map } } : {}), name: c.name, classId: c.classId, level: c.level }));
    if (this.partyRevSeen >= 0) { w.partyRows = this.parties.rows(); w.partyRev++; }
    w.shardWorld = {
      role: u.role, key: u.key,
      enqueue: t => this.units.enqueue(t),
      dispatch: (zoneId, fn) => this.units.dispatch(zoneId, fn),
      // THE ROADS PER PLAYER: an awake zone's live seed (the town portal's faded check) and THE HEARTH SEAT.
      liveSeed: zoneId => this.units.liveSeedOf(zoneId),
      hearth: () => this.hearthSeat(),
    };
  }

  /** THE HAND-OFF landed (server/simUnits.ts): THE SPAWN GRACE at the arrival, and
   *  the seat's new terrain at once (the client's standing zone lane). */
  private onArrive(seat: Seat, to: SimUnit, from: SimUnit, woke: boolean): void {
    if (woke) to.dressTimer = SHARD_CFG.dressSec; // THE DRESS BEAT: a fresh unit's zone just shipped, as at any zone change
    if (!seat.keeper) {
      seat.actor.untargetable = true;
      this.graces.set(seat.id, Math.max(this.graces.get(seat.id) ?? 0, this.world.time + UNIT_CFG.arrivalGraceSec));
    }
    this.net.sendZoneTo(seat.id, serializeZone(to.world));
    this.log(`[shard] ${seat.id} walked from ${from.world.zone.id} to ${to.world.zone.id}${woke ? ' (a unit woke)' : ''} (${this.units.size} unit(s) awake)`);
  }

  // ---- the host frame -------------------------------------------------------
  /** One engine step: the host frame verbatim, then the wire, then the beats. */
  tick(dt: number): void {
    if (this.wildsResuming) return; // THE RESUME LAW: no frame meets a half-stood world (wildsSave)
    const k = this.world;
    // THE ONE CLOCK (shard M1): every unit enters its step at the keeper's
    // tick-start readings, so each lands where the keeper lands.
    const clocks = unitClocks(k);
    // THE GUARDED PHASES: a throw in a simulate phase never skips the wire or
    // the beats (clients used to freeze and saves to stop); THE BREAKER counts
    // the keeper's run of faulting ticks, THE UNIT BREAKER each unit's.
    let inputs = new Map<string, PlayerInput>();
    const actions = this.pendingActions.splice(0);
    try {
      for (const u of this.units.each()) {
        for (const seat of u.world.seats) {
          const intent = seat.input.poll(seat.actor, u.world, dt); // RemoteInput polls null — its intent arrives via the wire
          if (intent) this.net.sendInput(seat.id, intent);
        }
      }
      inputs = this.net.drainInputs(); // one drain: a World reads only its own seats' rows
      this.endGraces(inputs);
    } catch (e) { this.noteFault('the input phase', e); }
    for (const u of this.units.each()) {
      if (u.broken) continue;
      try {
        this.units.run(u, w => {
          this.wardenStand(u);
          if (u.role === 'keeper') { if (this.worldmass) this.shadowFocus(); } else this.unitShadow(u);
          w.applyInputs(inputs, dt);
          this.drainMetaActions(u, w, actions);
          if (!w.gameOver) for (const a of w.actors) updateAI(a, w, dt);
          w.update(dt);
          w.settleNearScale(); // keeperSeat: THE NEAR LAW where this tick's mints stand
        }, clocks);
        if (u.role === 'keeper') this.consecutiveFaults = 0; else u.faults = 0;
      } catch (e) {
        this.noteFault(u.role === 'keeper' ? 'the simulate phase' : `unit ${u.key}`, e);
        if (u.role !== 'keeper') this.units.noteFault(u); // THE UNIT BREAKER: its seats to the hearth, the unit dropped
        else {
          this.consecutiveFaults++;
          if (!this.broken && this.consecutiveFaults >= SHARD_CFG.faultBreakerTicks) {
            this.broken = true;
            this.log(`[shard] THE BREAKER: ${this.consecutiveFaults} faulting ticks running — the world is held; a supervisor should restart it`);
            this.onBroken?.();
          }
        }
      }
    }
    try {
      this.units.drain(); // THE HAND-OFF QUEUE: every ticket after every unit ticked
      this.parties.sweep(k.time); // THE PARTY: lapsed invites fall away
      this.publishParties();
    } catch (e) { this.noteFault('the hand-off queue', e); }
    this.ticks++;
    this.vessels.tick(dt); // THE VESSEL: THE DEATH COVENANT (before THE MERCY could answer) + the mirror beat
    this.corpses.tick(dt); // THE CORPSE RETURNS: each seat's own standing bodies + the reclaim dwell
    this.sweepDormancy(); // THE DORMANT SEAT: a clock run out (or a fall that took the body) ends the seat

    if (this.net.connectionCount() > 0) {
      this.metaHeartbeat -= dt;
      const heartbeat = this.metaHeartbeat <= 0;
      if (heartbeat) this.metaHeartbeat = SHARD_CFG.metaHeartbeatSec;
      // THE WIRE RATE on integer ticks (60 / 20 = every 3rd): a reset timer
      // under a fixed step fired every 4th tick — 15 Hz wearing a 20 Hz name.
      // ONE snapTick per beat stamps every unit's snapshot (a client's tick
      // stays monotonic across a hand-off).
      const beat = this.ticks % Math.max(1, Math.round(SHARD_CFG.tickHz / SHARD_CFG.stateHz)) === 0;
      if (beat) this.snapTick++;
      for (const u of this.units.each()) this.wire(u, dt, heartbeat, beat);
    }
    if (this.savePath) {
      this.persistTimer -= dt;
      if (this.persistTimer <= 0) { this.persistTimer = SHARD_CFG.worldSaveSec; this.persist(); } // THE WORLD SAVE BEAT (the mirrors keep persistSec)
    }
    this.units.sweep(k.time); // THE LINGER and THE SOFT CAP
  }

  /** THE WIRE PER UNIT (plan 5.1-5.3): a unit's zone message (a change, THE DRESS
   *  BEAT), the meta heartbeat and its snapshot, to its own seats alone. */
  private wire(u: SimUnit, dt: number, heartbeat: boolean, beat: boolean): void {
    const ids = this.units.seatsOf(u).map(s => s.id);
    const w = u.world;
    u.dressTimer -= dt;
    if (!ids.length) { u.lastSentZone = w.zone.id; u.lastSentDoodadRev = w.doodadsVersion(); return; }
    if (w.zone.id !== u.lastSentZone) {
      u.lastSentZone = w.zone.id;
      u.lastSentDoodadRev = w.doodadsVersion();
      u.dressTimer = SHARD_CFG.dressSec;
      this.net.sendZoneToMany(serializeZone(w), ids);
    } else if (u.dressTimer <= 0 && w.doodadsVersion() !== u.lastSentDoodadRev) {
      // THE DRESS BEAT: the roster moved (the wilds grew, a tree fell, a swap
      // kept the count) — the engine's own doodad revision is the signal.
      u.lastSentDoodadRev = w.doodadsVersion();
      u.dressTimer = SHARD_CFG.dressSec;
      this.net.sendZoneToMany(serializeZone(w), ids);
    }
    if (heartbeat) for (const s of w.seats) w.markMetaDirty(s);
    if (!beat) return;
    this.units.run(u, uw => {
      const snap = serializeSnapshot(uw, this.snapTick);
      stampAudiences(uw, snap); // THE ACTING SEAT: the notices' and the eyecatch's audiences (the transport ships each to its own)
      this.net.sendStateTo(snap, ids);
      uw.metaDirty.clear();
    });
  }

  /** THE SHADOW: the keeper's body follows the focus seat on the wilds (see
   *  SHARD_CFG.keeper.shadowOffset). The first standing non-keeper seat is
   *  the focus; with none connected the keeper stays where it last stood. */
  private shadowFocus(): void {
    const focus = this.focusSeat();
    if (!focus) return;
    const target = this.roveTarget(focus);
    const k = this.keeper.actor;
    k.pos.x = target.actor.pos.x;
    k.pos.y = target.actor.pos.y + SHARD_CFG.keeper.shadowOffset;
    k.tier = target.actor.tier;
  }

  /** THE UNIT SHADOW (shard M1): a unit's warden stands on its unit's focus seat
   *  each tick (offset 0), so the world's player reads that are not roads (spawns
   *  far from the player, proximity triggers, the floats) center on a real player
   *  of that unit. With no standing seat it stays where it last stood. */
  private unitShadow(u: SimUnit): void {
    const focus = this.focusSeatOf(u);
    if (!focus) return;
    const k = u.world.localSeat.actor;
    k.pos.x = focus.actor.pos.x;
    k.pos.y = focus.actor.pos.y;
    k.tier = focus.actor.tier;
  }

  /** THE ROVING SHADOW (SHARD_CFG.rove): the seat the keeper shadows THIS tick.
   *  Standing seats cluster greedily by recency (a seat joins the first cluster
   *  whose anchor stands within the radius, else founds one); one cluster answers
   *  the focus, as THE SHADOW always did; several are visited round-robin, the
   *  focus's cluster first, each for rove.sec of world time, the keeper standing
   *  on the visited cluster's most recent seat. A hop is a real teleport of the
   *  keeper, so the mass runtime's page requests and places re-key to the new
   *  cell (its pages stay cached around every observer; dormancy and native
   *  paging read all observers already). */
  private roveTarget(focus: Seat): Seat {
    const cfg = SHARD_CFG.rove;
    if (!(cfg.sec > 0)) { this.roveAnchorId = null; return focus; }
    const standing = this.world.seats.filter(s => !s.keeper && !s.actor.dead && !s.actor.downed);
    const radius = cfg.clusterPx > 0 ? cfg.clusterPx : (this.world.massRuntime?.config.populationRadius ?? 1300);
    const score = (s: Seat): number => Math.max(s.lastActedAt, s.lastMovedAt);
    const ordered = [...standing].sort((a, b) => score(b) - score(a));
    const clusters: Seat[][] = [];
    for (const s of ordered) {
      const c = clusters.find(cl => Math.hypot(cl[0].actor.pos.x - s.actor.pos.x, cl[0].actor.pos.y - s.actor.pos.y) <= radius);
      if (c) c.push(s); else clusters.push([s]);
    }
    if (clusters.length <= 1) { this.roveAnchorId = null; return focus; }
    const now = this.world.time;
    const current = this.roveAnchorId ? clusters.find(cl => cl.some(x => x.id === this.roveAnchorId)) : undefined;
    if (current && now < this.roveUntil) { this.roveAnchorId = current[0].id; return current[0]; }
    const focusIdx = Math.max(0, clusters.findIndex(cl => cl.includes(focus)));
    const ring = [...clusters.slice(focusIdx), ...clusters.slice(0, focusIdx)];
    const curIdx = current ? ring.indexOf(current) : -1;
    const next = ring[(curIdx + 1) % ring.length];
    if (current && next !== current) this.roveHops++;
    this.roveAnchorId = next[0].id;
    this.roveUntil = now + cfg.sec;
    return next[0];
  }

  /** THE HEARTH SEAT: the wilds' native settlement keeps its own bedside
   *  (MassSettlement.spawn — the same spot on a fresh or a resumed surface);
   *  a classic world's is where the keeper first stood. */
  hearthSeat(): { x: number; y: number; tier: number } {
    const s = this.world.massRuntime?.settlement?.spawn;
    return s ? { x: s.x, y: s.y, tier: this.hearth.tier } : this.hearth;
  }

  /** THE PARTY's words (card 23): invite, accept, decline, leave, kick — every refusal
   *  answers the asker with one line; an invite lands on its target. */
  private onPartyWord(msg: Extract<SessionMsg, { t: 'party' }>, from: string): void {
    const now = this.world.time;
    const seat = typeof msg.seat === 'string' ? msg.seat : '';
    let word: string | null = null;
    switch (msg.op) {
      case 'invite': {
        word = this.parties.invite(from, seat, now);
        if (!word) {
          const party = this.parties.partyOf(from)!;
          const name = this.units.seatOf(from)?.actor.name ?? from;
          this.net.sendSession({ t: 'partyInvite', from, name, party: party.id }, seat);
        }
        break;
      }
      case 'accept': word = this.parties.accept(from, now); break;
      case 'decline': word = this.parties.decline(from); break;
      case 'leave': word = this.parties.leave(from); break;
      case 'kick': word = this.parties.kick(from, seat); break;
      default: word = 'no such word';
    }
    if (word) this.net.sendSession({ t: 'partyWord', word }, from);
  }

  /** THE PARTY on the wire: when the desk changed, the world's rows change with it. */
  private publishParties(): void {
    if (this.partyRevSeen === this.parties.rev) return;
    this.partyRevSeen = this.parties.rev;
    // THE WIRE PER UNIT: the party rows are world-wide, published into every unit.
    for (const u of this.units.each()) { u.world.partyRows = this.parties.rows(); u.world.partyRev++; }
  }

  /** THE SPAWN GRACE ends at the first willed input or at its clock. */
  private endGraces(inputs: Map<string, PlayerInput>): void {
    if (!this.graces.size) return;
    for (const [id, until] of this.graces) {
      const inp = inputs.get(id);
      const willed = !!inp && (inp.dx !== 0 || inp.dy !== 0 || inp.held.some(Boolean) || inp.edge.some(Boolean) || (inp.metaEdge?.some(Boolean) ?? false)
        || (inp.moves?.some(m => m[0] !== 0 || m[1] !== 0) ?? false)); // THE HONEST INPUT: a step anywhere in the tick's batch is willed
      if (!willed && this.world.time < until) continue;
      this.graces.delete(id);
      const seat = this.units.seatOf(id);
      if (seat) seat.actor.untargetable = false;
    }
  }

  /** THE FOCUS: the standing seat that acted most recently, with hysteresis —
   *  the current focus keeps it unless another standing seat has been newer
   *  by focusSwapSec (an idle or downed first joiner no longer pins the
   *  world's life to itself; a jump across the map costs a cold tick, so it
   *  is never flapped). Null = none connected. */
  focusSeat(): Seat | null { return this.focusSeatOf(this.units.keeper); }
  /** THE FOCUS of one unit (THE UNIT SHADOW's rule): its standing seats alone. */
  focusSeatOf(u: SimUnit): Seat | null {
    const standing = u.world.seats.filter(s => !s.keeper && !s.actor.dead && !s.actor.downed);
    if (!standing.length) { u.focusId = null; return null; }
    const score = (s: Seat): number => Math.max(s.lastActedAt, s.lastMovedAt);
    let best = standing[0];
    for (const s of standing) if (score(s) > score(best)) best = s;
    const current = standing.find(s => s.id === u.focusId);
    if (current && score(best) - score(current) < SHARD_CFG.focusSwapSec) return current;
    u.focusId = best.id;
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
    // THE TIME BUDGET runs on the wall (World.passInputTime): the seconds this wake is
    // about to DROP still passed for the players' hands, credited before the catch-up
    // so the frames a client sent through the stall walk in full (the world runs none).
    const dropping = this.accum - SHARD_CFG.maxCatchUpTicks * dt;
    if (dropping >= dt) this.world.passInputTime(dropping);
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
      parties: this.parties.rows(),
      seats: this.units.allSeats().map(s => {
        const until = this.dormancy.get(s.id); // THE DORMANT SEAT on the page: marked, with its seconds left
        return { id: s.id, name: s.actor.name, level: s.actor.level, alive: !s.actor.dead && !s.actor.downed,
          unit: this.units.unitOf(s.id)?.key ?? 'keeper', // THE SEAT LEDGER on the page
          ...(until !== undefined ? { dormant: true, dormantLeftSec: +Math.max(0, until - w.time).toFixed(1) } : {}) };
      }),
      units: this.units.status(), // THE SIM UNITS: key, zone, seats, awake since, empty since
      connections: this.net.connectionCount(),
      ticks: this.ticks,
      tickMsP50: q(0.5), tickMsP95: q(0.95),
      droppedTicks: this.droppedTicks,
      faults: this.faults + this.net.faults,
      actors: this.units.each().reduce((n, u) => n + u.world.actors.length, 0),
      rove: { on: this.worldmass && SHARD_CFG.rove.sec > 0, hops: this.roveHops, visiting: this.roveAnchorId }, // THE ROVING SHADOW
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
      this.units.captureAll(); // THE PERSIST CAPTURE: every awake unit's live memory row first
      const save: ShardSave = { schemaVersion: SHARD_CFG.saveSchema, seed: this.seed, savedAt: Date.now(), world: this.world.serializeWorldState(),
        run: captureRunRow(this.world) }; // THE RUN ROW
      mkdirSync(dirname(this.savePath), { recursive: true });
      // THE DURABLE WRITE: the whole file lands in a sibling, is FSYNCED, then renamed
      // over the last good save — a process kill never leaves a half-written save, and
      // a machine loss after the rename never leaves a zero-filled one (2026-10-09: a
      // 4.8 MB file of NULs met the reader's refusal and cost the wilds their state).
      const tmp = this.savePath + '.tmp';
      const fd = openSync(tmp, 'w');
      try { writeSync(fd, JSON.stringify(save)); fsyncSync(fd); } finally { closeSync(fd); }
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
    adoptRunRow(this.world, save.run); // THE RUN ROW (absent = today)
    this.world.reconcileSoulrivers();
    this.world.reconcileSeaPorts();
    this.world.reconcileWebLaws();
    this.world.resumeSpawn('town', ws.player);
    this.log(`[shard] resumed world ${this.seed.toString(16)} (${ws.zones.length} zones, t=${Math.round(ws.time)}s)`);
  }
}
