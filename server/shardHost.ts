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
import { serializeSnapshot, serializeZone } from '../src/net/snapshot';
import type { PeerInfo, SessionMsg } from '../src/net/transport';
import type { MetaAction } from '../src/net/intent';
import { sanitizeCosmeticLoadout } from '../src/meta/cosmetics';
import { WORLD_SCHEMA_VERSION, type WorldStateSave } from '../src/meta/worldstate';
import { ShardTransport, type ShardJoin } from './shardTransport';
import { VesselDesk } from './vessel';
import { ShardCorpses, shardRecordsPath } from './corpses';

export const SHARD_CFG = {
  /** The fixed engine step (the sim harness's cadence; the live host's cap is 0.05). */
  tickHz: 60,
  /** Snapshot cadence (main.ts STATE_HZ). */
  stateHz: 20,
  /** Re-dirty every seat's meta this often (main.ts META_HEARTBEAT). */
  metaHeartbeatSec: 1.5,
  /** Write the world half of the save this often (main.ts's autosave beat). */
  persistSec: 20,
  /** A stalled process catches up at most this many ticks per pump, then drops the rest. */
  maxCatchUpTicks: 5,
  /** THE KEEPER SEAT. reviveSec = THE MERCY: seconds a downed seat waits with
   *  no standing ally before the keeper stands it up where it fell. */
  keeper: { classId: 'warrior', name: 'The Keeper', reviveSec: 8 },
  /** The shard save's own schema (wraps WorldStateSave's). */
  saveSchema: 1,
  /** Where shard saves land by default (gitignored beside the game's). */
  saveDir: 'saves',
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
   *  continuous surface. Its persistence is the mass lane's own save shape,
   *  not WorldStateSave, so a wilds shard runs EPHEMERAL until M2 adopts it. */
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
  readonly world: World;
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

  private snapTick = 0;
  private stateTimer = 0;
  private metaHeartbeat = SHARD_CFG.metaHeartbeatSec;
  private persistTimer = SHARD_CFG.persistSec;
  private lastSentZone = '';
  private readonly pendingActions: { seat: string; action: MetaAction }[] = [];
  private timer: NodeJS.Timeout | null = null;
  private lastWall = 0;
  private accum = 0;

  constructor(opts: ShardOptions = {}) {
    bootShardEngine();
    this.log = opts.log ?? ((line) => console.log(line));
    this.seed = (opts.seed ?? rollSeed()) >>> 0;
    this.account = makeAccount();
    if (opts.open) openAccount(this.account);
    const manifest = buildManifest(this.account, this.seed);
    this.world = new World(this.account, Object.freeze(manifest));
    // A hosted world never freezes for one hand (the pause/harvest holds are solo policy).
    this.world.timeflow.allowHold = () => false;
    const cls = this.classById(opts.keeperClass ?? SHARD_CFG.keeper.classId);
    this.world.createPlayer(cls, { name: SHARD_CFG.keeper.name, startingCompanions: false, startingFlasks: false });
    const keeper = this.world.localSeat;
    keeper.keeper = { reviveSec: SHARD_CFG.keeper.reviveSec };
    keeper.actor.untargetable = true;
    keeper.actor.passive = true;
    this.worldmass = !!opts.worldmass;
    if (this.worldmass) {
      // THE WILDS: the classic hearth boot above stands the keeper; the mass
      // runtime then re-seats the world as the one boundless surface (main.ts's
      // own order: createPlayer, then startWorldMass). No classic save applies.
      this.savePath = null;
      this.world.startWorldMass(this.seed);
      this.log(`[shard] the Unbroken Wilds stand (seed 0x${this.seed.toString(16)}) — ephemeral until the mass lane's save is adopted`);
    } else {
      this.savePath = opts.saveDir === null ? null
        : join(opts.saveDir ?? SHARD_CFG.saveDir, `shard_${this.seed.toString(16).padStart(8, '0')}.json`);
      if (this.savePath && existsSync(this.savePath)) this.restore();
      else this.world.scrubStaleObjectives();
    }
    this.net = new ShardTransport();
    this.net.worldmass = this.worldmass;
    this.net.setSeedSource(() => this.world.manifest.seed);
    // THE VESSEL + THE CORPSE records: the records file lives beside the world
    // save but never with it, so an ephemeral or worldmass world still
    // remembers its dead (absent only when the shard writes nothing at all).
    const toSeat = (msg: SessionMsg, to: string): void => this.net.sendSession(msg, to);
    const recordsDir = opts.saveDir === null ? null : opts.saveDir ?? SHARD_CFG.saveDir;
    this.corpses = new ShardCorpses(this.world, toSeat, shardRecordsPath(recordsDir, this.seed), this.seed, this.log);
    this.vessels = new VesselDesk(this.world, toSeat, this.corpses, { beatSec: SHARD_CFG.persistSec, log: this.log });
    this.net.onPeerJoin((p, join) => this.onJoin(p, join));
    this.net.onPeerLeave(id => { this.vessels.leave(id); this.world.removeSeat(id); });
    this.net.onSession((m, from) => this.onSession(m, from));
  }

  private classById(id: string): ClassDef {
    return CLASSES.find(c => c.id === id) ?? CLASSES[0];
  }

  /** The keeper's seat (p0). */
  get keeper(): Seat { return this.world.localSeat; }

  /** Open the socket; resolves the bound port (0 = any free port). */
  listen(port: number, host = '0.0.0.0'): Promise<number> { return this.net.listen(port, host); }

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
    const w = this.world;
    for (const seat of w.seats) {
      const intent = seat.input.poll(seat.actor, w, dt); // RemoteInput polls null — its intent arrives via the wire
      if (intent) this.net.sendInput(seat.id, intent);
    }
    w.applyInputs(this.net.drainInputs(), dt);
    this.drainMetaActions();
    if (!w.gameOver) for (const a of w.actors) updateAI(a, w, dt);
    w.update(dt);
    this.ticks++;
    this.vessels.tick(dt); // THE VESSEL: THE DEATH COVENANT (before THE MERCY could answer) + the mirror beat
    this.corpses.tick(dt); // THE CORPSE RETURNS: each seat's own standing bodies + the reclaim dwell

    if (this.net.connectionCount() > 0) {
      if (w.zone.id !== this.lastSentZone) {
        this.lastSentZone = w.zone.id;
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
    this.vessels.mirrorAll(); // THE MIRROR: every vessel home before the wire closes
    await this.net.close();
  }

  // ---- persistence ----------------------------------------------------------
  /** Write the world half (WorldStateSave) under the shard's own wrapper. */
  persist(): void {
    if (!this.savePath) return;
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
