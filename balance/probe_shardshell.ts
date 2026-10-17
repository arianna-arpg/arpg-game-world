// ---------------------------------------------------------------------------
// PROBE: THE SMOOTH SHELL (docs/engine/shard.md "The pieces"; the shard sync
// pass B, items 9, 11, 5 and 6): a render shell adopts each snapshot ONCE and
// only places it per frame, renders remote bodies on a jitter-buffered clock,
// glides its own corrections out, holds optimistic actions against older
// snapshots until the host echoes them, strains and returns in place when the
// link fails, and predicts the root of its own casts.
//
//   npx tsx balance/probe_shardshell.ts
//
// The pure laws first, then a wire rig: a REAL ShardHost (classic, open account,
// saveDir null, quiet) on a free port, WsTransport clients each driving the
// shipped WireShell on a render-shell World (main.ts startAsClient's order), the
// host ticked by hand on a shared clock. Pins:
//   A  THE JITTER BUFFER's ring: host-time order, duplicates and the cap; the
//      pick (the bracketing pair and the fraction), the run-on past the newest
//      (capped), the oldest standing before the ring
//   B  the render clock: jittered arrivals hold the depth at delayMs, the bend
//      never past +-dilation, the clock never backward; starved it runs on to
//      the cap and holds; far behind it re-seats forward
//   C  THE SOFT CORRECTION: under offsetSnapPx the offset is 95% gone by
//      offsetDecayMs and glides there smoothly; at or above it, a snap
//   D  THE ECHO LAW (pure): a lane held until its echo, the hold cap, the lanes apart
//   E  the camera spring: critically damped (no overshoot), settled, a far jump
//      re-seats, omega 0 is the hard lock
//   F  THE WATCHDOG (pure): live, strained, lost, and the strain's rise
//   G  an arrival adopts once: one adoption per snapshot across three frames each
//   H  THE ECHO LAW on the wire: an optimistic action survives a stale build and
//      yields to the newer one that echoes it (the host's truth wins); an action
//      never echoed stops holding at the cap
//   I  a bunched pair of snapshots never jumps a remote body: its drawn positions
//      run monotone in time (the old lane, on the same arrivals, jumps)
//   J  a stalled link: a remote body runs on to the cap and holds, the frame
//      strains, the walk stills, the link reads lost; then THE RETURN takes the
//      same seat back in place (the same shell, its snapshots adopted again)
//   K  THE RETURN over a link the shard never heard die (its own token supersedes
//      the live seat); THE IDENTITY re-binds a dormant vessel seat without the
//      token; a resumeOnly join with nothing to return to is refused, never seated
//   L  THE PREDICTED ROOT: a rooting press stands a local cast at once, stops the
//      replay of the moves after it, and reconciles against the host's cast row;
//      a press the host never casts ends after the RTT plus the grace
//   M  the own hero's mobile cast and held mobile channel ride their real
//      instances (CastW.sk): the shell's replay walks them at the host's factor
//      (a bare stub threw inside moveActor, freezing the client)
//   N  a reload inside the window: the page-surviving session takes the same
//      seat back resumeOnly (a fresh page, a fresh module); past the window, none
// ---------------------------------------------------------------------------

import { randomBytes } from 'node:crypto';
import { connect as tcpConnect, type Socket } from 'node:net';
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { WsTransport, WS_TRANSPORT_CFG, shardResumeFor } from '../src/net/ws';
import { WS_OP, decodeFrames, encodeFrame } from '../src/net/wsframe';
import { SHARD_REFUSAL, shardBuildStamp } from '../src/net/shardBuild';
import { applySnapshot, applyZone, isWireCast, type StateSnapshot, type ZoneMsg } from '../src/net/snapshot';
import {
  WIRE_SHELL_CFG, WireShell, clockAdvance, clockSample, echoHear, echoHolds, echoNote, linkPhaseOf, linkStrainOf,
  newEchoLedger, newRenderClock, offsetCorrect, offsetDecay, ringBracket, ringPush,
} from '../src/net/shell';
import { CAMERA_FOLLOW_CFG, newCameraFollow, springFollow } from '../src/render/camera';
import { ZONES, type ZoneDef } from '../src/data/zones';
import { CLASSES } from '../src/data/classes';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { World, type Seat } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { ensureAccountId, makeAccount } from '../src/meta/account';
import { buildManifest } from '../src/packages/manifest';
import { serializeCouchGuest, type CharacterSave } from '../src/meta/character';
import { NullInput, type MetaAction, type PlayerInput } from '../src/net/intent';
import { seedGlobalRandom } from '../src/sim/rng';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' : ' + detail : ''}`);
  if (!ok) failed++;
};
const info = (line: string): void => console.log(`INFO  ${line}`);
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) <= eps;
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
async function waitMs(cond: () => boolean, ms = 5000): Promise<boolean> {
  const t0 = Date.now();
  while (!cond()) { if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 5)); }
  return true;
}
const CFG = WIRE_SHELL_CFG;

// THE REMEMBERED SESSION's page-surviving copy lives in sessionStorage: a Node rig stands one in (N).
const store = new Map<string, string>();
(globalThis as { sessionStorage?: unknown }).sessionStorage = {
  getItem: (k: string): string | null => store.get(k) ?? null,
  setItem: (k: string, v: string): void => { store.set(k, String(v)); },
  removeItem: (k: string): void => { store.delete(k); },
  clear: (): void => store.clear(), key: (): null => null, get length(): number { return store.size; },
};

// ====================================================== A: the ring ==
/** A bare snapshot at host time `t` (only the rows the ring and the clock read). */
const bare = (t: number): StateSnapshot => ({ tick: Math.round(t * 20), time: t, zoneId: 'z', arena: { w: 100, h: 100 }, seats: {},
  actors: [], projectiles: [], tethers: [], drops: [], orbs: [], texts: [], flashes: [], deathBursts: [] });
{
  const ring: StateSnapshot[] = [];
  for (const t of [0.1, 0, 0.05, 0.15]) ringPush(ring, bare(t), CFG.ring);
  const dup = ringPush(ring, bare(0.05), CFG.ring);
  check('A ring: snapshots keep host-time order whatever order they land in; a duplicate time is refused',
    ring.map(s => s.time).join() === '0,0.05,0.1,0.15' && !dup, ring.map(s => s.time).join());
  for (let k = 4; k < 14; k++) ringPush(ring, bare(k * 0.05), CFG.ring);
  check('A ring: the ring keeps the newest `ring` snapshots', ring.length === CFG.ring && near(ring[0].time, 0.3) && near(ring.at(-1)!.time, 0.65));
  const mid = ringBracket(ring, 0.47, 0.1)!;
  check('A pick: a render time between two snapshots picks that pair and the fraction between them',
    near(mid.prev!.time, 0.45) && near(mid.snap.time, 0.5) && near(mid.alpha, 0.4) && mid.ahead === 0, `${mid.prev?.time}..${mid.snap.time} @ ${mid.alpha.toFixed(3)}`);
  const past = ringBracket(ring, 0.65 + 0.3, CFG.extrapolateMs / 1000)!, edge = ringBracket(ring, 0.68, CFG.extrapolateMs / 1000)!;
  check('A pick: past the newest, the newest with the run-on seconds, capped at extrapolateMs',
    past.snap === ring.at(-1) && near(past.ahead, CFG.extrapolateMs / 1000) && near(edge.ahead, 0.03) && past.prev === ring.at(-2));
  const early = ringBracket(ring, 0.1, 0.1)!;
  check('A pick: before the oldest, the oldest stands alone', early.snap === ring[0] && early.prev === null && early.ahead === 0);
}

// ================================================= B: the render clock ==
{
  // Jittered arrivals (a deterministic +-20 ms wobble on a 60 ms path), frames at 60 fps.
  const c = newRenderClock();
  const arrive = (k: number): number => k * 0.05 + 0.06 + 0.02 * Math.sin(k * 2.39) * Math.cos(k * 0.71);
  let next = 0, newest = 0, last = -Infinity, back = false, maxBend = 0;
  const depths: number[] = [];
  for (let f = 0; f < 60 * 12; f++) {
    const local = f / 60;
    while (arrive(next) <= local) { clockSample(c, next * 0.05, arrive(next)); newest = next * 0.05; next++; }
    clockAdvance(c, 1 / 60, local, newest, CFG);
    if (c.seated) { if (c.t < last - 1e-12) back = true; last = c.t; }
    if (local > 4) { depths.push(newest - c.t); maxBend = Math.max(maxBend, Math.abs(c.bend)); }
  }
  const mean = depths.reduce((x, y) => x + y, 0) / depths.length;
  // The served depth: the newest snapshot runs ahead of the render clock by the delay less the
  // line's mean lag (the earliest arrival sets it), so remote bodies always bracket, never starve.
  const starved = depths.filter(d => d < 0).length;
  check('B clock: jittered arrivals hold the buffer: the render clock trails the newest snapshot, never starved',
    starved === 0 && mean > 0.02 && mean < CFG.delayMs / 1000 + 0.02, `mean depth ${(mean * 1000).toFixed(1)} ms, starved frames ${starved}`);
  check('B clock: the bend stays within +-dilation and the clock never runs backward', maxBend <= CFG.dilation + 1e-12 && !back, `max bend ${(maxBend * 100).toFixed(2)}%`);
  // A stall: no arrival for 3 s. The clock runs on to the cap past the newest and holds there.
  const stalledAt = newest;
  const held: number[] = [];
  for (let f = 0; f < 180; f++) { clockAdvance(c, 1 / 60, 12 + f / 60, stalledAt, CFG); held.push(c.t); }
  check('B stall: starved, the clock runs on to extrapolateMs past the newest snapshot and holds there, never past it',
    near(held.at(-1)!, stalledAt + CFG.extrapolateMs / 1000) && held.every((t, i) => i === 0 || t >= held[i - 1] - 1e-12) && held.every(t => t <= stalledAt + CFG.extrapolateMs / 1000 + 1e-12),
    `held at newest + ${((held.at(-1)! - stalledAt) * 1000).toFixed(1)} ms`);
  // The link resumes far ahead: the clock re-seats FORWARD to its target at once.
  const before = c.t, resumeK = next + 60;
  clockSample(c, resumeK * 0.05, 15);
  clockAdvance(c, 1 / 60, 15, resumeK * 0.05, CFG);
  check('B re-seat: past reseatMs behind its target the clock re-seats forward at once (never backward)',
    c.t > before + CFG.reseatMs / 1000 && c.t <= resumeK * 0.05 + 1e-9, `${before.toFixed(3)} -> ${c.t.toFixed(3)} (newest ${(resumeK * 0.05).toFixed(3)})`);
}

// ============================================ C: THE SOFT CORRECTION ==
{
  const o = { x: 0, y: 0 };
  offsetCorrect(o, 30, 40, CFG); // a 50 px correction glides
  const start = Math.hypot(o.x, o.y), path: number[] = [];
  for (let t = 0; t < CFG.offsetDecayMs - 1e-9; t += 1000 / 60) { offsetDecay(o, 1 / 60, CFG); path.push(Math.hypot(o.x, o.y)); }
  const half = path[Math.floor(path.length / 2)];
  check('C offset: a correction under offsetSnapPx is carried, 95% gone by offsetDecayMs, gliding down each frame',
    near(start, 50) && path.at(-1)! <= 0.05 * 50 + 1e-6 && half > path.at(-1)! && half < 50 && path.every((m, i) => i === 0 || m <= path[i - 1]),
    `50 px -> ${half.toFixed(1)} px midway -> ${path.at(-1)!.toFixed(2)} px at ${CFG.offsetDecayMs} ms`);
  const s = { x: 10, y: 0 };
  offsetCorrect(s, CFG.offsetSnapPx, 0, CFG);
  check('C offset: a correction at or above offsetSnapPx snaps (no offset is carried)', s.x === 0 && s.y === 0);
}

// ================================================ D: THE ECHO LAW (pure) ==
{
  const l = newEchoLedger();
  const s1 = echoNote(l, 'meta', 1000);
  const held = echoHolds(l, 'meta', 1010, CFG);
  echoHear(l, 0);
  const stillHeld = echoHolds(l, 'meta', 1020, CFG);
  echoHear(l, s1);
  const lifted = !echoHolds(l, 'meta', 1030, CFG);
  const s2 = echoNote(l, 'meta', 2000), sNone = echoNote(l, 'none', 2001);
  check('D echo: an optimistic action holds its lane until the host echoes it (an older echo lifts nothing)',
    s1 === 1 && held && stillHeld && lifted && s2 === 2 && sNone === 3);
  check('D echo: an action never echoed stops holding at echoHoldMs (a lost action, an older host)',
    echoHolds(l, 'meta', 2000 + CFG.echoHoldMs - 1, CFG) && !echoHolds(l, 'meta', 2000 + CFG.echoHoldMs, CFG));
  const p = echoNote(l, 'ping', 3000);
  check('D echo: the lanes stand apart (a ping holds its marks, never the build)', echoHolds(l, 'ping', 3001, CFG) && !echoHolds(l, 'meta', 3001 + CFG.echoHoldMs, CFG) && p === 4);
}

// ================================================== E: the camera spring ==
{
  const s = newCameraFollow();
  springFollow(s, { x: 0, y: 0 }, 0);
  const xs: number[] = [];
  for (let f = 1; f <= 60; f++) xs.push(springFollow(s, { x: 100, y: 0 }, f * 1000 / 60).x);
  const settledAt = xs.findIndex(x => x > 99.5);
  check('E spring: critically damped: it chases a moved target without overshoot and settles',
    xs.every((x, i) => (i === 0 || x >= xs[i - 1] - 1e-9) && x <= 100 + 1e-9) && settledAt >= 0 && settledAt < 20,
    `99.5% by frame ${settledAt} (omega ${CAMERA_FOLLOW_CFG.omega})`);
  const jump = springFollow(s, { x: 100 + CAMERA_FOLLOW_CFG.snapPx, y: 0 }, 61 * 1000 / 60);
  check('E spring: a jump past snapPx re-seats the frame at once (a zone change never swoops)', jump.x === 100 + CAMERA_FOLLOW_CFG.snapPx);
  const lock = newCameraFollow(), off = { ...CAMERA_FOLLOW_CFG, omega: 0 };
  springFollow(lock, { x: 0, y: 0 }, 0, off);
  const locked = springFollow(lock, { x: 37, y: -12 }, 16, off);
  check('E spring: omega 0 is the hard lock (the focus itself, every frame)', locked.x === 37 && locked.y === -12);
}

// ===================================================== F: THE WATCHDOG ==
check('F watchdog: live under stallMs, strained to reconnectMs, then lost',
  linkPhaseOf(0) === 'live' && linkPhaseOf(CFG.stallMs - 1) === 'live' && linkPhaseOf(CFG.stallMs) === 'strained' && linkPhaseOf(CFG.reconnectMs) === 'lost');
check('F watchdog: the strain rises from nothing at stallMs to full over strainRiseMs',
  linkStrainOf(CFG.stallMs) === 0 && near(linkStrainOf(CFG.stallMs + CFG.strainRiseMs / 2), 0.5) && linkStrainOf(CFG.stallMs + CFG.strainRiseMs) === 1);

// ===================================================================== the rig ==
// THE FLOOR: a flat, empty, quiet zone (probe_shardinput's idiom), so a walk is a straight line.
const FLOOR = 'probe_shardshell_floor';
ZONES[FLOOR] = {
  id: FLOOR, name: 'The Smooth Floor', level: 1, size: { w: 3200, h: 2400 },
  theme: { floor: '#101010', grid: '#181818', border: '#3a3a3a', obstacle: '#2a2a2a', obstacleEdge: '#444444', accent: '#888888' },
  seed: 0x5e11f1, layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9300, y: 9300 },
} as ZoneDef;
const restoreRandom = seedGlobalRandom(0x5e115);
const logs: string[] = [];
const host = new ShardHost({ seed: 0x5e115e11, saveDir: null, open: true, log: line => { logs.push(line); } });
await host.ready();
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
const w = host.world;
const DT = 1 / SHARD_CFG.tickHz;
const seatOf = (id: string): Seat | undefined => w.seats.find(s => s.id === id);

/** The shells' wall clock (ms), stepped with the host's ticks (one tick = one 60 fps frame). */
let nowMs = 1_000_000;
interface Cl {
  c: WsTransport; id: string; got: StateSnapshot[]; zone: ZoneMsg | null; lost: number; seq: number;
  shell: WireShell | null; world: World | null; adopts: Map<number, number>;
  /** THE ECHO LAW's rig lever: while set, an action is queued here instead of sent. */
  queue: { action: MetaAction; seq: number }[] | null;
  drive: (() => PlayerInput | null) | null;
}
const clients: Cl[] = [];
async function join(name: string, opts: { accountId?: string; vessel?: CharacterSave } = {}): Promise<Cl> {
  const cl: Cl = { c: new WsTransport(), id: '', got: [], zone: null, lost: 0, seq: 0, shell: null, world: null, adopts: new Map(), queue: null, drive: null };
  cl.c.onState(s => { cl.got.push(s); if (cl.got.length > 600) cl.got.splice(0, 300); cl.shell?.arrive(s, nowMs); });
  cl.c.onZone(z => { cl.zone = z; if (cl.world) applyZone(cl.world, z); });
  cl.c.onHostLost(() => { cl.lost++; });
  cl.id = (await cl.c.connect(url, { name, classId: 'warrior', ...(opts.accountId ? { accountId: opts.accountId } : {}) }, opts.vessel)).self;
  for (let i = 0; i < 200 && !seatOf(cl.id); i++) { host.tick(DT); await yieldIO(); }
  clients.push(cl);
  return cl;
}
/** The render shell, in main.ts startAsClient's order, and its WireShell attached. */
function shellOn(cl: Cl): World {
  const acct = makeAccount();
  const shellWorld = new World(acct, Object.freeze(buildManifest(acct, w.manifest.seed)));
  const shell = cl.shell ?? new WireShell();
  shellWorld.clientActionHook = (action) => {
    const seq = shell.noteAction(nowMs);
    if (cl.queue) cl.queue.push({ action, seq }); else cl.c.sendSession({ t: 'action', action, seq });
  };
  shellWorld.clientOptimistic = (action) => shell.noteOptimistic(action, nowMs);
  shellWorld.clientSeatId = cl.id;
  shellWorld.createPlayer(CLASSES.find(c => c.id === 'warrior') ?? CLASSES[0], { startingCompanions: false, startingFlasks: false });
  if (cl.zone) applyZone(shellWorld, cl.zone);
  shell.onAdopt = s => { cl.adopts.set(s.tick, (cl.adopts.get(s.tick) ?? 0) + 1); };
  cl.shell = shell; cl.world = shellWorld;
  shell.attach(shellWorld);
  return shellWorld;
}
/** One frame for everyone: the clock steps, each driven client sends its frame (a shell stamps
 *  it), the host ticks (unless stalled), the snapshots land and every shell draws a frame. */
async function step(n: number, opts: { host?: boolean } = {}): Promise<void> {
  for (let i = 0; i < n; i++) {
    nowMs += 1000 / 60;
    for (const cl of clients) {
      const li = cl.drive?.();
      if (!li) continue;
      cl.c.sendInput(cl.id, cl.shell?.world ? cl.shell.stampInput(li, DT, nowMs) : { ...li, seq: ++cl.seq, dt: DT });
    }
    await yieldIO(); await yieldIO();
    if (opts.host !== false) host.tick(DT);
    await yieldIO(); await yieldIO();
    for (const cl of clients) if (cl.shell?.world) cl.shell.frame(DT, nowMs);
  }
}
const aimOf = (cl: Cl, dx = 120, dy = 0): { x: number; y: number } => { const a = seatOf(cl.id)!.actor; return { x: a.pos.x + dx, y: a.pos.y + dy }; };
const walkRight = (cl: Cl) => (): PlayerInput => ({ dx: 1, dy: 0, aim: aimOf(cl), held: [], edge: [] });
/** Stand a seat's hero at a spot on the floor, still. */
function place(cl: Cl, x: number, y: number): Actor {
  const a = seatOf(cl.id)!.actor; a.pos.x = x; a.pos.y = y; a.vel.x = 0; a.vel.y = 0; return a;
}
/** THE CUT CABLE: the shard's own socket under a seat destroyed with no closing handshake. */
function cut(seat: string): boolean {
  const c = (host.net as unknown as { bySeat: Map<string, { sock: { destroy(): void } }> }).bySeat.get(seat);
  c?.sock.destroy();
  return !!c;
}
/** A remote body as a shell draws it: the party member pooled for that seat. */
const drawn = (world: World, seat: string): Actor | undefined => world.party.members.find(m => m.seat === seat)?.actor;

const A = await join('Aster');
shellOn(A);
const B = await join('Bryn');
w.loadZone(FLOOR);
for (let i = 0; i < 200 && (A.zone?.zoneId !== FLOOR || B.zone?.zoneId !== FLOOR); i++) { host.tick(DT); await yieldIO(); }
place(A, 1200, 1000); place(B, 900, 1300);
// Willed steps end THE SPAWN GRACE (a dormant seat needs one, J and K).
A.drive = () => ({ dx: 0, dy: 1, aim: aimOf(A), held: [], edge: [] });
B.drive = () => ({ dx: 0, dy: 1, aim: aimOf(B), held: [], edge: [] });
await step(8);
A.drive = null; B.drive = null;
await step(20);
check('rig: two seated clients stand on the flat floor, the shell world on it too',
  w.zone.id === FLOOR && A.world?.appliedZoneId === FLOOR && !!seatOf(A.id) && !!seatOf(B.id) && !seatOf(A.id)!.actor.untargetable);

// ==================================================== G: one adoption per arrival ==
{
  A.adopts.clear();
  const n0 = A.got.length;
  await step(90);
  const fresh = A.got.slice(n0);
  const once = fresh.length > 20 && fresh.every(s => A.adopts.get(s.tick) === 1) && A.adopts.size === fresh.length;
  check('G split: every arriving snapshot is adopted exactly once across many frames (three frames a snapshot)',
    once, `${fresh.length} snapshots over 90 frames, adoptions ${[...A.adopts.values()].reduce((x, y) => x + y, 0)}`);
}

// ======================================================== H: THE ECHO LAW (wire) ==
{
  const sA = seatOf(A.id)!;
  const ids = (skills: readonly ({ def: { id: string } } | null)[]): string => skills.slice(0, 3).map(s => s?.def.id ?? '-').join(',');
  const shellBar = (): string => ids(A.world!.player.skills), hostBar = (): string => ids(w.seatHero(sA).skills);
  const host0 = hostBar(), shell0 = shellBar();
  // The optimistic swap stands on the shell; the action waits in the rig's queue (the host has not heard it).
  A.queue = [];
  A.world!.requestMeta({ t: 'swapSkillSlots', a: 0, b: 1 });
  const optimistic = shellBar();
  const q = A.queue[0];
  // A STALE build: the host re-ships the seat's build (as the heartbeat would) before it judges the action.
  w.markMetaDirty(sA);
  const n0 = A.got.length;
  await step(4);
  const stale = A.got.slice(n0).find(s => !!s.seatMeta?.[A.id])?.seatMeta?.[A.id];
  check('H echo: an optimistic action survives a stale build (one the host shipped before it judged the action)',
    host0 === shell0 && optimistic !== shell0 && !!q && !!stale && stale.bar.slice(0, 3).map(b => b ?? '-').join(',') === host0 && (stale.as ?? 0) < q.seq && shellBar() === optimistic,
    `host ${host0}, optimistic ${optimistic}, stale build ${stale?.bar.slice(0, 3).join()} (as ${stale?.as}), shell now ${shellBar()}`);
  // The host judges the action, a DIFFERENT swap (0 with 2) under the same seq: its build echoes the seq.
  A.queue = null;
  A.c.sendSession({ t: 'action', action: { t: 'swapSkillSlots', a: 0, b: 2 }, seq: q.seq });
  const n1 = A.got.length;
  await step(6);
  const echoed = A.got.slice(n1).find(s => s.seatMeta?.[A.id]?.as !== undefined)?.seatMeta?.[A.id];
  check('H echo: the host echoes the judged seq on the seat\'s own build, on the next snapshot',
    !!echoed && echoed.as === q.seq, `as ${echoed?.as}, seq ${q.seq}`);
  const hostNow = hostBar();
  check('H echo: the newer build that echoes the action is adopted: the host\'s truth replaces the optimistic state',
    shellBar() === hostNow && hostNow !== optimistic && hostNow !== host0, `host ${hostNow}, shell ${shellBar()}, optimistic was ${optimistic}`);
  // The cap: an optimistic action the host never hears holds the build for echoHoldMs, no longer.
  A.queue = [];
  A.world!.requestMeta({ t: 'swapSkillSlots', a: 1, b: 2 });
  const held2 = shellBar();
  w.markMetaDirty(sA);
  await step(4);
  const heldOn = shellBar() === held2 && held2 !== hostNow;
  nowMs += CFG.echoHoldMs; // the wall clock passes the cap
  w.markMetaDirty(sA);
  await step(4);
  check('H echo: an action the host never echoes holds the build until echoHoldMs, then the wire wins again',
    heldOn && shellBar() === hostNow, `held ${held2} (${heldOn}), after the cap ${shellBar()}`);
  A.queue = null;
}

// ============================================== I: bunched snapshots (the buffer) ==
let tape: StateSnapshot[] = [];
let walkSpeed = 0; // px/s, B's walk as measured off the tape (I), read by J
{
  place(B, 600, 1300);
  B.drive = walkRight(B);
  await step(12);
  const n0 = A.got.length;
  await step(120);
  tape = A.got.slice(n0);
  B.drive = null;
  await step(6);
  // A fresh shell takes the recorded run BUNCHED: two snapshots land together every 100 ms.
  const run = (lane: 'shell' | 'old'): { xs: number[]; steps: number[] } => {
    const acct = makeAccount();
    const wd = new World(acct, Object.freeze(buildManifest(acct, w.manifest.seed)));
    wd.clientSeatId = A.id;
    wd.createPlayer(CLASSES.find(c => c.id === 'warrior') ?? CLASSES[0], { startingCompanions: false, startingFlasks: false });
    if (A.zone) applyZone(wd, A.zone);
    const sh = new WireShell();
    if (lane === 'shell') sh.attach(wd);
    let t = 5_000_000, latest: StateSnapshot | null = null, prev: StateSnapshot | null = null, accum = 0, k = 0;
    const xs: number[] = [];
    for (let f = 0; f < 6 * 60 && k < tape.length; f++) {
      t += 1000 / 60;
      // Two snapshots at once, every sixth frame (a 100 ms beat for 100 ms of wire).
      if (f % 6 === 0) for (let j = 0; j < 2 && k < tape.length; j++, k++) {
        if (lane === 'shell') sh.arrive(tape[k], t);
        else { prev = latest ?? tape[k]; latest = tape[k]; accum = 0; }
      }
      if (lane === 'shell') sh.frame(1 / 60, t);
      else if (latest) {
        accum += 1 / 60;
        applySnapshot(wd, latest, prev, Math.min(1, accum / 0.05), Math.max(0, accum - 0.05)); // the old lane: the newest pair, re-applied each frame
      }
      const b = drawn(wd, B.id);
      if (b && f > 30) xs.push(b.pos.x);
    }
    const steps = xs.slice(1).map((x, i) => x - xs[i]);
    return { xs, steps };
  };
  const nu = run('shell'), old = run('old');
  const speed = walkSpeed = (tape.at(-1)!.actors.find(a => a.seat === B.id)!.p[0] - tape[0].actors.find(a => a.seat === B.id)!.p[0]) / (tape.at(-1)!.time - tape[0].time);
  const frameStep = speed / 60;
  const back = nu.steps.filter(s => s < -1e-6).length, jumpNew = Math.max(...nu.steps), jumpOld = Math.max(...old.steps);
  const oldStill = old.steps.filter(st => Math.abs(st) < 1e-6).length, newStill = nu.steps.filter(st => Math.abs(st) < 1e-6).length;
  info(`bunched arrivals (two snapshots every 100 ms): the shell drew ${nu.steps.length} steps, ${newStill} still; the old lane froze ${oldStill} of ${old.steps.length} frames and leapt up to ${jumpOld.toFixed(1)} px`);
  check('I bunched: a remote body\'s drawn x runs monotone in time under bunched arrivals (never backward)',
    nu.xs.length > 60 && back === 0, `${back} backward steps over ${nu.steps.length} frames`);
  check('I bunched: and never jumps: its largest frame step stays within the dilated walk (the old lane jumps)',
    jumpNew <= frameStep * (1 + CFG.dilation) + 0.5 && jumpOld > frameStep * 2,
    `walk ${speed.toFixed(0)} px/s = ${frameStep.toFixed(2)} px/frame; largest step: shell ${jumpNew.toFixed(2)} px, old lane ${jumpOld.toFixed(2)} px`);
}

// ================================================ J: the stall and THE RETURN ==
{
  place(B, 600, 1300);
  B.drive = walkRight(B);
  await step(30);
  // THE STALL: the host falls silent (no tick, no snapshot); the shell keeps drawing frames.
  const newest = A.shell!.latest!;
  const xs: number[] = [];
  let strained = -1, lost = -1, stilled = false;
  for (let f = 0; f < 60 * 6; f++) {
    await step(1, { host: false });
    const b = drawn(A.world!, B.id)!;
    xs.push(b.pos.x);
    const ms = nowMs - A.shell!.lastArrivalMs;
    if (strained < 0 && A.shell!.phase(nowMs) === 'strained') strained = ms;
    if (lost < 0 && A.shell!.phase(nowMs) === 'lost') lost = ms;
    if (strained >= 0 && !stilled) {
      const li = A.shell!.stampInput({ dx: 1, dy: 0, aim: { x: 0, y: 0 }, held: [], edge: [] }, DT, nowMs);
      stilled = li.dx === 0 && li.dy === 0;
    }
  }
  B.drive = null;
  const rowB = newest.actors.find(a => a.seat === B.id)!;
  const capAt = xs.findIndex((x, i) => i > 0 && x === xs[i - 1]);
  const runOn = xs.at(-1)! - rowB.p[0];
  const flat = capAt >= 0 && xs.slice(capAt).every(x => x === xs[capAt]);
  check('J stall: a remote body runs on along its velocity at most extrapolateMs past the newest snapshot, then holds still',
    flat && runOn >= 0 && runOn <= walkSpeed * CFG.extrapolateMs / 1000 + 2, `held after ${capAt} frames, ${runOn.toFixed(1)} px past its newest row`);
  check('J stall: the frame strains at stallMs (a drawn cue) and the hero\'s walk stills; the link reads lost at reconnectMs',
    near(strained, CFG.stallMs, 20) && near(lost, CFG.reconnectMs, 20) && stilled && A.shell!.strain(nowMs) === 1,
    `strained at ${strained.toFixed(0)} ms, lost at ${lost.toFixed(0)} ms, walk stilled ${stilled}`);
  // THE RETURN: the socket goes; the same transport reconnects in place with THE RECONNECT TOKEN.
  const shellWorld = A.world, seatBefore = seatOf(A.id), actorBefore = seatBefore?.actor;
  const lost0 = A.lost;
  cut(A.id);
  await waitMs(() => A.lost > lost0 && host.net.isDormant(A.id));
  const r = await A.c.resumeInPlace();
  if (r.ok) A.shell!.resumed(nowMs);
  A.adopts.clear();
  await step(9);
  check('J return: the same transport takes the same seat back in place, the shell and its world untouched (no start-menu detour)',
    r.ok && A.c.self === A.id && A.world === shellWorld && A.shell!.world === shellWorld && seatOf(A.id) === seatBefore && seatOf(A.id)?.actor === actorBefore && !host.net.isDormant(A.id),
    r.ok ? 'resumed' : `refused: ${r.word}`);
  check('J return: snapshots flow and are adopted again, the strain released',
    A.adopts.size >= 2 && A.shell!.strain(nowMs) === 0 && A.shell!.phase(nowMs) === 'live', `${A.adopts.size} adoptions after the return`);
}

// ============================================ K: THE RETURN unheard, THE IDENTITY ==
{
  // K1: a link that died without the shard hearing it. C's own token comes back over a NEW
  // socket (a raw one: C's transport still holds its old socket open) asking for the seat alone.
  const C = await join('Cass');
  C.drive = () => ({ dx: 0, dy: 1, aim: aimOf(C), held: [], edge: [] });
  await step(6);
  C.drive = null;
  const tok = shardResumeFor(url)!; // C joined last: the remembered session is its own
  const mark = logs.length;
  const raw = await rawJoin({ t: 'join', classId: 'warrior', name: 'Cass', resume: { seat: C.id, token: tok.token }, resumeOnly: true, build: shardBuildStamp() });
  await waitMs(() => C.lost > 0, 3000);
  const welcome = raw.msgs.find(m => m.t === 'welcome') as { self?: string; resumed?: boolean } | undefined;
  check('K unheard: a resumeOnly join with a LIVE seat\'s own token takes it over (the old socket is let go, the seat stays)',
    tok.seat === C.id && welcome?.self === C.id && welcome.resumed === true && !!seatOf(C.id) && !host.net.isDormant(C.id) && C.lost === 1
      && logs.slice(mark).some(l => l.includes(`${C.id} returned over a new socket`)),
    `welcome ${JSON.stringify(welcome ?? {})}, old transport lost ${C.lost}`);
  raw.closeClean();
  // K2: THE IDENTITY: a vessel's player comes back to its DORMANT seat with no token (a new tab).
  const acct = makeAccount(); ensureAccountId(acct);
  const vessel = forgeVessel('Dora', 'c-shell-dora');
  const D = await join('Dora', { accountId: acct.accountId, vessel });
  D.drive = () => ({ dx: 0, dy: 1, aim: aimOf(D), held: [], edge: [] });
  await step(6);
  D.drive = null;
  cut(D.id);
  await waitMs(() => host.net.isDormant(D.id));
  const mark2 = logs.length, seatsBefore = w.seats.length;
  const D2 = new WsTransport();
  const back = await D2.connect(url, { name: 'Dora', classId: 'warrior', accountId: acct.accountId }, vessel);
  await step(3);
  check('K identity: a join carrying a dormant vessel\'s account and character takes that seat back without its token (never the twin refusal)',
    back.self === D.id && back.resumed && !host.net.isDormant(D.id) && w.seats.length === seatsBefore
      && logs.slice(mark2).some(l => l.includes(`${D.id} came back by its account and vessel`)) && !logs.slice(mark2).some(l => l.includes('vessel refused')),
    `self ${back.self} (dormant was ${D.id}), resumed ${back.resumed}, seats ${seatsBefore} -> ${w.seats.length}`);
  // K3: a resumeOnly join with nothing to return to is refused at the door, never seated.
  const seats0 = w.seats.length;
  const E = new WsTransport();
  let word = '';
  try { await E.connect(url, { name: 'Nobody', classId: 'warrior' }, undefined, { seat: 'p404', token: '0'.repeat(32) }, { resumeOnly: true }); }
  catch (e) { word = e instanceof Error ? e.message : String(e); }
  await step(2);
  check('K refused: a resumeOnly join with no seat to return to hears one word and is never seated',
    word === SHARD_REFUSAL.resume && w.seats.length === seats0, word);
  D2.leave(); C.c.leave();
  await step(6);
}

// ============================================== L: THE PREDICTED ROOT ==
{
  const a = place(A, 1200, 1000);
  a.sheet.setBase('mana', 5000); a.fillResources();
  await step(12);
  const p = A.world!.player;
  const slot = p.skills.findIndex(s => s?.def.id === 'cleave');
  check('L setup: the shell\'s bar carries the warrior\'s cleave (a rooting cast)', slot >= 0 && !SKILLS.cleave.castMove && !SKILLS.cleave.cooldown, `slot ${slot}`);
  // The press, mid-walk: cleave's slot down for one frame, the move key held throughout.
  const keys = (on: boolean): boolean[] => p.skills.map((_, i) => on && i === slot);
  let pressed = false;
  A.drive = () => { const li: PlayerInput = { dx: 1, dy: 0, aim: aimOf(A, 160, 0), held: keys(!pressed), edge: keys(!pressed) }; pressed = true; return li; };
  await step(1, { host: false });
  const root = A.shell!.root;
  const stub = p.casting;
  check('L press: the press stands a local cast stub at once (the bar and its prepare pose), its own instance',
    !!root && stub === root.stub && stub?.inst.def.id === 'cleave' && stub.mode === 'cast' && p.bodyActionPose === undefined && !isWireCast(stub),
    `root ${!!root}, cast ${stub?.inst.def.id}`);
  const xs: number[] = [];
  for (let f = 0; f < 3; f++) { await step(1, { host: false }); xs.push(p.pos.x - A.shell!.offset.x); }
  check('L press: the moves after a rooting press replay rooted: the predicted hero stops at the press while the key is held',
    xs.every(x => near(x, xs[0], 1e-6)), `predicted x ${xs.map(x => x.toFixed(2)).join(', ')}`);
  // The wire: the host hears the press, casts, and its cast row reconciles the stub.
  let reconciled = false, elapsed: number[] = [];
  for (let f = 0; f < 20 && !reconciled; f++) {
    await step(1);
    reconciled = A.shell!.root === null && !!p.casting && isWireCast(p.casting);
  }
  for (let f = 0; f < 6; f++) { await step(1); if (p.casting) elapsed.push(p.casting.elapsed); }
  const hostCast = seatOf(A.id)!.actor.casting;
  check('L reconcile: the host\'s cast row replaces the stub (its real instance), the bar never running backward',
    reconciled && p.casting?.inst.def.id === 'cleave' && hostCast?.inst.def.id === 'cleave' && elapsed.every((e, i) => i === 0 || e >= elapsed[i - 1] - 1e-9),
    `bar ${elapsed.map(e => e.toFixed(3)).join(' ')}`);
  A.drive = null;
  for (let f = 0; f < 90 && (seatOf(A.id)!.actor.casting || p.casting); f++) await step(1);
  // A press the host never hears: the stub stands RTT + rootGraceMs, then goes.
  await step(20);
  const lim = A.shell!.rttMs + CFG.rootGraceMs;
  const press: PlayerInput = { dx: 0, dy: 0, aim: aimOf(A, 160, 0), held: keys(true), edge: keys(true) };
  A.shell!.stampInput(press, DT, nowMs); // stamped, never sent
  const t0 = nowMs;
  const standing = !!A.shell!.root;
  let goneAt = -1;
  for (let f = 0; f < 60 && goneAt < 0; f++) {
    nowMs += 1000 / 60;
    A.shell!.frame(DT, nowMs);
    if (!A.shell!.root) goneAt = nowMs - t0;
  }
  check('L expiry: a press the host never casts stands its stub for the RTT plus rootGraceMs, then the stub goes',
    standing && goneAt > lim - 1000 / 60 && goneAt <= lim + 1000 / 60 && p.casting === null,
    `rtt ${A.shell!.rttMs.toFixed(0)} ms, stub gone at ${goneAt.toFixed(0)} ms (limit ${lim.toFixed(0)})`);
}

// ======================================================== M: the mobile cast ==
{
  const sA = seatOf(A.id)!, a = place(A, 1200, 1000);
  await step(8); // the shell anchors where the hero now stands
  const p = A.world!.player, x0 = p.pos.x - A.shell!.offset.x;
  // A cast that walks (castMove > 0): the first of the catalog's mobile casts the warrior can loose.
  let mobileId = '', inst = null as ReturnType<typeof makeSkillInstance> | null;
  for (const id of Object.values(SKILLS).filter(d => (d.castMove ?? 0) > 0).map(d => d.id)) {
    const tryInst = makeSkillInstance(SKILLS[id], 1, 0);
    tryInst.devGift = true; // THE DEV GIFT: the warrior's attributes never refuse the rig's cast
    sA.meta.knownSkills.set(id, tryInst);
    a.skills[3] = tryInst;
    a.sheet.setBase('mana', 5000); a.fillResources(); a.cooldowns.clear(); a.useLock = 0;
    if (w.useSkill(a, tryInst, aimOf(A, 160, 0), true) && a.casting && !w.movementLocked(a)) { mobileId = id; inst = tryInst; break; }
    a.casting = null; sA.meta.knownSkills.delete(id);
  }
  w.markMetaDirty(sA);
  let threw = '', rode = false, castFrames = 0;
  A.drive = () => ({ dx: 1, dy: 0, aim: aimOf(A, 160, 0), held: [], edge: [] });
  try {
    for (let f = 0; f < 12; f++) {
      await step(1);
      const cs = p.casting;
      if (cs && isWireCast(cs)) { castFrames++; rode ||= cs.inst === p.skills[3] && cs.inst.def.id === mobileId; }
    }
    A.drive = null;
    await step(9); // every frame acked: the prediction and the host agree
  } catch (e) { threw = e instanceof Error ? e.message : String(e); }
  A.drive = null;
  const walked = p.pos.x - A.shell!.offset.x - x0, hostWalked = a.pos.x - 1200;
  check('M mobile: the own hero\'s mobile cast rides its real instance (CastW.sk) and the shell\'s replay walks it as the host does, no throw',
    !!inst && !threw && rode && castFrames > 0 && walked > 1 && near(walked, hostWalked, 1),
    threw || `${mobileId}: ${castFrames} cast frames on its own bar instance ${rode}; walked ${walked.toFixed(1)} px, the host ${hostWalked.toFixed(1)} px`);
  await step(30);
  // A HELD channel that walks (Whirlwind): the hand holds its slot, the host keeps it up, and the
  // shell's replay strides through it on the real instance (a bare stub threw here too).
  const ww = makeSkillInstance(SKILLS.whirlwind, 1, 0);
  ww.devGift = true;
  sA.meta.knownSkills.set('whirlwind', ww);
  a.skills[4] = ww;
  a.sheet.setBase('mana', 5000); a.fillResources(); a.cooldowns.clear(); a.useLock = 0;
  place(A, 1200, 1000);
  w.markMetaDirty(sA);
  await step(8);
  const wx0 = p.pos.x - A.shell!.offset.x;
  const held = (): boolean[] => p.skills.map((_, i) => i === 4);
  let first = true, chanFrames = 0, wThrew = '';
  A.drive = () => { const li: PlayerInput = { dx: 1, dy: 0, aim: aimOf(A, 160, 0), held: held(), edge: held().map(h => h && first) }; first = false; return li; };
  try {
    for (let f = 0; f < 30; f++) { await step(1); const cs = p.casting; if (cs && isWireCast(cs) && cs.mode === 'channel' && cs.inst === p.skills[4]) chanFrames++; }
    A.drive = () => ({ dx: 0, dy: 0, aim: aimOf(A, 160, 0), held: [], edge: [] });
    await step(9);
  } catch (e) { wThrew = e instanceof Error ? e.message : String(e); }
  A.drive = null;
  const wWalked = p.pos.x - A.shell!.offset.x - wx0, wHost = a.pos.x - 1200;
  check('M channel: a held mobile channel (Whirlwind) rides its real instance and the shell\'s replay strides through it as the host does, no throw',
    !wThrew && chanFrames > 10 && wWalked > 1 && near(wWalked, wHost, 1.5),
    wThrew || `${chanFrames} channel frames on the bar's own instance; walked ${wWalked.toFixed(1)} px, the host ${wHost.toFixed(1)} px`);
  await step(30);
}

// ===================================================== N: a reload in the window ==
{
  const F = await join('Fen');
  F.drive = () => ({ dx: 0, dy: 1, aim: aimOf(F), held: [], edge: [] });
  await step(8);
  F.drive = null;
  await step(25); // snapshots keep the page-surviving copy fresh (once a second)
  const kept = [...store.values()].some(v => v.includes(F.id));
  cut(F.id);
  await waitMs(() => host.net.isDormant(F.id));
  // THE RELOAD: a fresh page is a fresh module (its page memory empty), the tab's storage kept.
  const fresh = await import('../src/net/ws.ts' + '?reload=1') as typeof import('../src/net/ws');
  const remembered = fresh.rememberedShardSession();
  const expired = fresh.rememberedShardSession(Date.now() + WS_TRANSPORT_CFG.resumeWindowMs + 1500);
  const resume = fresh.shardResumeFor(url);
  const T = new fresh.WsTransport();
  const back = resume ? await T.connect(url, { name: 'Fen', classId: 'warrior' }, undefined, resume, { resumeOnly: true }) : null;
  await step(3);
  check('N reload: inside the window a reloaded page finds its session and takes the same seat back, resumeOnly (never a fresh join)',
    kept && remembered?.url === url && resume?.seat === F.id && back?.self === F.id && !!back?.resumed && !host.net.isDormant(F.id),
    `remembered ${remembered?.url}, seat ${resume?.seat}, back ${back?.self}`);
  check('N reload: past the window the page-surviving session is too old to offer', !!remembered && expired === null);
  T.leave();
  await step(4);
  const fresh2 = await import('../src/net/ws.ts' + '?reload=2') as typeof import('../src/net/ws');
  check('N reload: a deliberate leave forgets the page-surviving session too', fresh2.rememberedShardSession() === null && fresh2.shardResumeFor(url) === null);
}

// =================================================================== the end ==
for (const cl of clients) cl.c.leave();
await step(60);
await host.stop();
restoreRandom();
await new Promise(r => setTimeout(r, 400));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);

// ======================================================================= helpers ==
/** Forge a vessel on a scratch seat: the couch guest's shape, as the wire carries it. */
function forgeVessel(name: string, charId: string): CharacterSave {
  const seat = w.addSeat('forge', CLASSES.find(c => c.id === 'warrior')!, new NullInput(), { startingCompanions: false, startingFlasks: false });
  seat.meta.name = name; seat.meta.charId = charId;
  const save = serializeCouchGuest(w, seat, {});
  w.removeSeat('forge');
  return JSON.parse(JSON.stringify(save)) as CharacterSave;
}

/** A RAW socket client (probe_sharddormant's): the upgrade by hand, masked frames out, the
 *  shard's frames in (its pings answered, its snapshots counted). */
interface Raw { sock: Socket; msgs: Record<string, unknown>[]; snaps: number; send(m: unknown): void; closeClean(): void }
async function rawJoin(join: Record<string, unknown>): Promise<Raw> {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const masked = (opcode: number, payload: Uint8Array): Uint8Array => {
    const plain = encodeFrame(opcode, payload, true);
    const hdr = plain.length - payload.length;
    const out = new Uint8Array(plain.length + 4);
    out.set(plain.subarray(0, hdr));
    out[1] |= 0x80;
    const key = [0x5a, 0x17, 0xc3, 0x9e];
    out.set(key, hdr);
    for (let i = 0; i < payload.length; i++) out[hdr + 4 + i] = payload[i] ^ key[i & 3];
    return out;
  };
  const sock = tcpConnect(port, '127.0.0.1');
  sock.on('error', () => { /* a reset is part of the point */ });
  await new Promise<void>(res => { sock.once('connect', () => res()); });
  sock.write(`GET / HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n`
    + `Sec-WebSocket-Key: ${randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
  const raw: Raw = {
    sock, msgs: [], snaps: 0,
    send: m => { sock.write(masked(WS_OP.text, enc.encode(JSON.stringify(m)))); },
    closeClean: () => { sock.write(masked(WS_OP.close, new Uint8Array([0x03, 0xe8]))); sock.end(); },
  };
  let buf = new Uint8Array(0), upgraded = false;
  sock.on('data', (chunk: Buffer) => {
    const grown = new Uint8Array(buf.length + chunk.length);
    grown.set(buf); grown.set(chunk, buf.length); buf = grown;
    if (!upgraded) {
      const end = Buffer.from(buf).indexOf('\r\n\r\n');
      if (end < 0) return;
      upgraded = true; buf = buf.slice(end + 4);
    }
    const r = decodeFrames(buf, 1 << 26, false);
    buf = r.rest.slice();
    for (const f of r.frames) {
      if (f.opcode === WS_OP.ping) { sock.write(masked(WS_OP.pong, f.payload)); continue; }
      if (f.opcode !== WS_OP.text) continue;
      let m: Record<string, unknown>;
      try { m = JSON.parse(dec.decode(f.payload)) as Record<string, unknown>; } catch { continue; }
      if (m.t === 'snap') raw.snaps++; else raw.msgs.push(m);
    }
  });
  raw.send(join);
  await waitMs(() => raw.msgs.some(m => m.t === 'welcome' || m.t === 'refused'));
  return raw;
}
