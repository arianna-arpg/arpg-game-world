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

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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
import { updateAI } from '../src/engine/ai';
import { CLASSES, type ClassDef } from '../src/data/classes';
import { rollSeed } from '../src/core/rng';
import { RemoteInput } from '../src/net/remote';
import { serializeSnapshot, serializeZone } from '../src/net/snapshot';
import type { PeerInfo, SessionMsg } from '../src/net/transport';
import type { MetaAction } from '../src/net/intent';
import { sanitizeCosmeticLoadout } from '../src/meta/cosmetics';
import { WORLD_SCHEMA_VERSION, type WorldStateSave } from '../src/meta/worldstate';
import { ShardTransport } from './shardTransport';
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
  /** THE KEEPER SEAT. reviveSec = THE MERCY: seconds a downed seat waits with
   *  no standing ally before the keeper stands it up where it fell.
   *  shadowOffset = THE SHADOW (the wilds): the mass runtime streams, births
   *  and dwells around `world.player`, which on a shard is the keeper — so on
   *  the surface the keeper's body shadows the FOCUS SEAT (the first standing
   *  player) this many px behind it, every tick. One focus, one keeper: the
   *  sim-unit gap M1 closes; players far from the focus meet cold ground. */
  keeper: { classId: 'warrior', name: 'The Keeper', reviveSec: 8, shadowOffset: 48 },
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
  /** True when the hosted world is the seamless foundation's continuous surface. */
  readonly worldmass: boolean;
  readonly log: (line: string) => void;
  /** Ticks stepped since boot (the probe's clock). */
  ticks = 0;
  /** Engine throws caught by the pump (a server never dies on one frame). */
  faults = 0;

  private snapTick = 0;
  private stateTimer = 0;
  private metaHeartbeat = SHARD_CFG.metaHeartbeatSec;
  private persistTimer = SHARD_CFG.persistSec;
  private lastSentZone = '';
  private lastSentDoodads = -1;
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
    this.seed = (opts.seed ?? rollSeed()) >>> 0;
    this.account = makeAccount();
    if (opts.open) openAccount(this.account);
    this.keeperClass = this.classById(opts.keeperClass ?? SHARD_CFG.keeper.classId);
    this.world = this.standKeeperWorld();
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
    this.net = new ShardTransport();
    this.net.worldmass = this.worldmass;
    this.net.features = [...this.account.features];
    this.net.setSeedSource(() => this.world.manifest.seed);
    this.net.onPeerJoin(p => this.onJoin(p));
    this.net.onPeerLeave(id => this.world.removeSeat(id));
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
  private onJoin(peer: PeerInfo): void {
    if (this.world.seats.some(s => s.id === peer.id)) return;
    const seat = this.world.addSeat(peer.id, this.classById(peer.classId), new RemoteInput(peer.id));
    seat.actor.cosmeticLoadout = sanitizeCosmeticLoadout(peer.cosmeticLoadout);
    seat.actor.name = peer.name || seat.actor.name;
    // The joiner needs the standing terrain NOW, not at the next zone change.
    this.net.sendZoneTo(peer.id, serializeZone(this.world));
    this.lastSentZone = this.world.zone.id;
    this.lastSentDoodads = this.world.doodads.length;
    this.log(`[shard] ${peer.id} joined as ${peer.classId} (${this.net.connectionCount()} connected)`);
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
      this.onJoin({ id: from, name: peer?.name ?? 'Joiner', classId: msg.classId, isHost: false, cosmeticLoadout: peer?.cosmeticLoadout });
      this.net.sendSession({ t: 'newRun', seat: from, seed: this.world.manifest.seed }, from);
    }
  }

  /** HOST: apply this frame's queued client meta intents to their OWN seats.
   *  A malformed or hostile action must never throw out of the frame
   *  (main.ts drainMetaActions, verbatim). */
  private drainMetaActions(): void {
    if (!this.pendingActions.length) return;
    for (const { seat: seatId, action } of this.pendingActions) {
      const seat = this.world.seats.find(s => s.id === seatId);
      if (!seat) continue;
      try { this.world.applyAction(seat, action); }
      catch (e) { this.faults++; this.log(`[shard] dropped malformed meta action from ${seatId}: ${String(e)}`); }
    }
    this.pendingActions.length = 0;
  }

  // ---- the host frame -------------------------------------------------------
  /** One engine step: the host frame verbatim, then the wire, then the beats. */
  tick(dt: number): void {
    if (this.wildsResuming) return; // THE RESUME LAW: no frame meets a half-stood world (wildsSave)
    const w = this.world;
    if (this.worldmass) this.shadowFocus();
    for (const seat of w.seats) {
      const intent = seat.input.poll(seat.actor, w, dt); // RemoteInput polls null — its intent arrives via the wire
      if (intent) this.net.sendInput(seat.id, intent);
    }
    w.applyInputs(this.net.drainInputs(), dt);
    this.drainMetaActions();
    if (!w.gameOver) for (const a of w.actors) updateAI(a, w, dt);
    w.update(dt);
    this.ticks++;

    if (this.net.connectionCount() > 0) {
      this.dressTimer -= dt;
      if (w.zone.id !== this.lastSentZone) {
        this.lastSentZone = w.zone.id;
        this.lastSentDoodads = w.doodads.length;
        this.dressTimer = SHARD_CFG.dressSec;
        this.net.sendZone(serializeZone(w));
      } else if (this.dressTimer <= 0 && w.doodads.length !== this.lastSentDoodads) {
        // THE DRESS BEAT: the roster moved (the wilds grew, a tree fell) — re-ship.
        this.lastSentDoodads = w.doodads.length;
        this.dressTimer = SHARD_CFG.dressSec;
        this.net.sendZone(serializeZone(w));
      }
      this.metaHeartbeat -= dt;
      if (this.metaHeartbeat <= 0) {
        this.metaHeartbeat = SHARD_CFG.metaHeartbeatSec;
        for (const s of w.seats) w.markMetaDirty(s);
      }
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.stateTimer = 1 / SHARD_CFG.stateHz;
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
    const focus = this.world.seats.find(s => !s.keeper && !s.actor.dead);
    if (!focus) return;
    const k = this.keeper.actor;
    k.pos.x = focus.actor.pos.x;
    k.pos.y = focus.actor.pos.y + SHARD_CFG.keeper.shadowOffset;
    k.tier = focus.actor.tier;
  }

  /** The focus seat THE SHADOW follows (null = none connected). */
  focusSeat(): Seat | null { return this.world.seats.find(s => !s.keeper && !s.actor.dead) ?? null; }

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
      try { this.tick(dt); }
      catch (e) {
        this.faults++;
        this.log(`[shard] engine fault at tick ${this.ticks}: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
      }
      this.accum -= dt;
      n++;
    }
    if (n >= SHARD_CFG.maxCatchUpTicks) this.accum = 0; // a long stall is dropped, never replayed
  }

  /** Stop the pump, write the world, close the wire. */
  async stop(): Promise<void> {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.savePath) this.persist();
    await this.net.close();
  }

  // ---- persistence ----------------------------------------------------------
  /** Write the world half (WorldStateSave) under the shard's own wrapper — on
   *  the wilds the mass half rides it (`worldmass` + `massSideareas`, wildsSave). */
  persist(): void {
    if (!this.savePath || this.wildsResuming) return; // THE RESUME LAW: never write a half-stood world over its own save
    const save: ShardSave = { schemaVersion: SHARD_CFG.saveSchema, seed: this.seed, savedAt: Date.now(), world: this.world.serializeWorldState() };
    try {
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
      this.log(`[shard] no usable save at ${this.savePath} — a fresh world`);
      return;
    }
    this.world.reconcileSoulrivers();
    this.world.reconcileSeaPorts();
    this.world.reconcileWebLaws();
    this.world.resumeSpawn('town', ws.player);
    this.log(`[shard] resumed world ${this.seed.toString(16)} (${ws.zones.length} zones, t=${Math.round(ws.time)}s)`);
  }
}
