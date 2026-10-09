// ---------------------------------------------------------------------------
// THE SOAK — a headless load and endurance harness for THE SHARD
// (docs/engine/shard.md "THE SOAK"; the host's laws are
// docs/design/shard-world.md §3, its receipts §8).
//
//   npm run soak:shard -- --bots 10 --seconds 120
//
// Boots a REAL ShardHost in this process (the Unbroken Wilds on the open
// account, ephemeral), listens on a free loopback port and runs the host's
// own wall-clock pump (ShardHost.start(), the CLI's), so pacing is honest,
// never probe-stepped. A FLEET of bot players (balance/soak_bots.ts) is
// forked into a process of its own and joins over real WebSockets, staggered
// so THE HEARTH WAKE and THE SPAWN GRACE run as in play; two bots form a party
// over the session wire (THE GROUP LAW rides the soak), and at the window's
// midpoint one bot's socket is cut raw and takes its seat back with THE
// RECONNECT TOKEN (THE DORMANT SEAT).
//
//   warm-up   the joins and the party (measured apart, never gated)
//   window    --seconds of steady load, opened and closed by a forced full
//             GC (the live heap at both edges), sampled every sampleSec
//   teardown  the fleet leaves with its word; the host stops
//
//   --bots <n>          bot players (default 10)
//   --seconds <s>       the measured window (default 120)
//   --seed <hex|dec>    THE HOSTED SEED (default SOAK_CFG.seed: one fixed world, so runs compare)
//   --classic           a classic world (the hearth) instead of the Unbroken Wilds
//   --no-drop           skip THE DORMANT SEAT's cut (also --drop off)
//   --spread <px>       THE SPREAD: each bot roams around its own anchor on a ring of this radius
//                       about the hearth (0 = everyone around the hearth) — the split-party case
//   --rove <sec>        THE ROVING SHADOW's visit length (SHARD_CFG.rove.sec; 0 = the focus alone)
//   --report <path>     the JSON report (default balance/reports/soak_<stamp>.json, gitignored)
//   --thresholds <path> the gates (default balance/soak.config.json)
//
// Exit 0 = every gate held, 2 = a breach (each one named), 1 = the harness failed.
// ---------------------------------------------------------------------------

import { fork, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, release, totalmem } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PerformanceObserver, constants as perfConst } from 'node:perf_hooks';
import { getHeapStatistics, setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { SHARD_WIRE_CFG } from '../server/shardTransport';
import { deriveSeed, seedGlobalRandom } from '../src/sim/rng';
import type { FleetBotStats, FleetCommand, FleetEvent } from './soak_bots';

export const SOAK_CFG = {
  bots: 10,
  seconds: 120,
  /** One fixed default world so two runs compare (the shard probe's wilds seed). */
  seed: 0x0ddba11,
  /** The sample beat, and the window the worst-window tick p95 is read over. */
  sampleSec: 5,
  /** The live heap is polled this often inside the window; each sample keeps its trough. */
  heapPollMs: 250,
  /** Ticks closer than this to the previous tick's end ran inside the same pump wake. */
  wakeGapMs: 0.5,
  /** The slowest ticks listed (with when they landed) for the window and the warm-up. */
  slowestTicks: 5,
  /** THE SHADOW (the wilds): a keeper moved farther than this in one tick jumped to a new focus seat. */
  shadowJumpPx: 300,
  /** The fleet's joins, this far apart (THE HEARTH WAKE and THE SPAWN GRACE as in play). */
  staggerMs: 200,
  /** The bots' classes, dealt round-robin: a melee swing, a missile, a stealth striker, a nova. */
  classes: ['warrior', 'magician', 'rogue', 'necromancer'],
  /** After the last seat and the party, the world settles this long before the window opens. */
  settleSec: 2,
  /** The warm-up stops waiting for seats after this, and for the party this long after the seats. */
  warmupTimeoutSec: 45,
  partyWaitSec: 12,
  /** The fleet's leaves + stats, and the host's drain of seats, are given this long. */
  teardownTimeoutSec: 15,
  thresholds: 'balance/soak.config.json',
  reportDir: 'balance/reports',
  /** Node on Windows asserts inside libuv when process.exit lands mid-close (the probes' settle). */
  exitSettleMs: 600,
};

/** balance/soak.config.json's gates (each documented there). */
interface SoakGates {
  tickP95Ms: { max: number };
  droppedShare: { max: number };
  heapGrowthMB: { max: number; perSeconds: number };
  faults: { max: number };
  errors: { max: number };
  resume: { require: boolean };
  party: { require: boolean };
}

function readGates(path: string): SoakGates {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { gates?: Record<string, Record<string, unknown>> };
  const g = raw.gates ?? {};
  const num = (k: string, f: string): number => {
    const v = g[k]?.[f];
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${path}: gates.${k}.${f} must be a number`);
    return v;
  };
  const req = (k: string): boolean => {
    const v = g[k]?.require;
    if (typeof v !== 'boolean') throw new Error(`${path}: gates.${k}.require must be true or false`);
    return v;
  };
  return {
    tickP95Ms: { max: num('tickP95Ms', 'max') },
    droppedShare: { max: num('droppedShare', 'max') },
    heapGrowthMB: { max: num('heapGrowthMB', 'max'), perSeconds: num('heapGrowthMB', 'perSeconds') },
    faults: { max: num('faults', 'max') },
    errors: { max: num('errors', 'max') },
    resume: { require: req('resume') },
    party: { require: req('party') },
  };
}

function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq > 0) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) { out[a.slice(2)] = next; i++; }
    else out[a.slice(2)] = true;
  }
  return out;
}

const MB = 1024 * 1024;
const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));
async function until(cond: () => boolean, ms: number): Promise<boolean> {
  const end = performance.now() + ms;
  while (!cond()) { if (performance.now() >= end) return false; await sleep(50); }
  return true;
}
/** The status page's own percentile rule (ShardHost.status). */
const pct = (sorted: ArrayLike<number>, p: number): number => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0;
const sorted = (xs: ArrayLike<number>): Float64Array => Float64Array.from(xs).sort();
const mean = (xs: readonly number[]): number => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const r2 = (x: number): number => Math.round(x * 100) / 100;
/** One V8 collection as the perf timeline saw it (performance.now() clock). */
interface GcPause { start: number; dur: number; kind: number }
const GC_KIND: Record<number, string> = {
  [perfConst.NODE_PERFORMANCE_GC_MINOR]: 'minor', [perfConst.NODE_PERFORMANCE_GC_MAJOR]: 'major',
  [perfConst.NODE_PERFORMANCE_GC_INCREMENTAL]: 'incremental', [perfConst.NODE_PERFORMANCE_GC_WEAKCB]: 'weakcb',
};
/** Milliseconds of collection inside [a, b). */
const gcWithin = (gcs: readonly GcPause[], a: number, b: number): number =>
  gcs.reduce((n, g) => n + Math.max(0, Math.min(b, g.start + g.dur) - Math.max(a, g.start)), 0);
/** A tick in which THE SHADOW moved the keeper to another focus seat (performance.now() clock). */
interface ShadowJump { at: number; px: number }
/** The n slowest ticks, when they started (seconds from `from`), how much of each was
 *  collection, and how far the keeper jumped in it (0 = no jump). */
function slowest(ms: readonly number[], at: readonly number[], from: number, n: number, gcs: readonly GcPause[], jumps: readonly ShadowJump[]): { atSec: number; ms: number; gcMs: number; jumpPx: number }[] {
  return ms.map((v, i) => ({ i, v })).sort((a, b) => b.v - a.v).slice(0, n)
    .map(({ i, v }) => ({ atSec: r2((at[i] - from) / 1000), ms: r2(v), gcMs: r2(gcWithin(gcs, at[i], at[i] + v)), jumpPx: Math.round(jumps.find(j => j.at === at[i])?.px ?? 0) }));
}
/** Least-squares slope of y over x, per minute of x seconds. */
function slopePerMin(xs: readonly number[], ys: readonly number[]): number {
  if (xs.length < 3) return 0;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  return sxx ? (sxy / sxx) * 60 : 0;
}

/** A full collection on demand (--expose-gc raised at runtime): heap readings at
 *  the window's edges are LIVE memory, never where the last collection fell. */
const fullGc: (() => void) | null = (() => {
  try {
    setFlagsFromString('--expose-gc');
    const g = runInNewContext('gc') as unknown;
    return typeof g === 'function' ? g as () => void : null;
  } catch { return null; }
})();
function liveHeapMB(): number {
  if (fullGc) { fullGc(); fullGc(); }
  return getHeapStatistics().used_heap_size / MB;
}

interface StatusView {
  seats: { id: string; dormant?: boolean }[];
  connections: number; actors: number;
  tickMsP50: number; tickMsP95: number;
}
interface Sample {
  t: number; seats: number; dormant: number; connections: number; actors: number;
  ticks: number; wakes: number; tickP50: number; tickP95: number; tickMax: number;
  statusP50: number; statusP95: number; dropped: number;
  fed: number; snaps: number; snapKBp95: number; outKBps: number; outKBpsPerClient: number;
  heapTroughMB: number; heapPeakMB: number; rssMB: number; party: boolean;
  /** THE LIVING RADIUS: live foes within the population radius of each standing seat — the least and the mean. */
  livingMin: number; livingMean: number;
  /** THE SPREAD as it stands: the widest distance between two standing seats (px). */
  fleetSpreadPx: number;
}
type Stamped = FleetEvent & { at: number };

let fleetRef: ChildProcess | null = null;
let hostRef: ShardHost | null = null;

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const num = (v: string | true | undefined): number | undefined => {
    if (typeof v !== 'string') return undefined;
    const n = v.startsWith('0x') ? parseInt(v, 16) : Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const bots = Math.max(1, Math.floor(num(args.bots) ?? SOAK_CFG.bots));
  const seconds = Math.max(1, num(args.seconds) ?? SOAK_CFG.seconds);
  const seed = (num(args.seed) ?? SOAK_CFG.seed) >>> 0;
  const classic = args.classic === true;
  const dropOn = !(args['no-drop'] === true || (typeof args.drop === 'string' && /^(0|off|false|no)$/i.test(args.drop)));
  const spread = Math.max(0, num(args.spread) ?? 0); // THE SPREAD (the fleet's anchors)
  const roveArg = num(args.rove);
  if (roveArg !== undefined) SHARD_CFG.rove.sec = Math.max(0, roveArg); // THE ROVING SHADOW's dial, before the host stands
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportPath = typeof args.report === 'string' ? args.report : `${SOAK_CFG.reportDir}/soak_${stamp}.json`;
  const gatesPath = typeof args.thresholds === 'string' ? args.thresholds : SOAK_CFG.thresholds;
  const gates = readGates(gatesPath);
  const seedHex = '0x' + seed.toString(16).padStart(8, '0');

  // ---- the host -------------------------------------------------------------
  const hostLog: string[] = [];
  const log = (line: string): void => {
    hostLog.push(line);
    if (/fault|BREAKER|uncaught|persist failed/i.test(line)) console.error(line); // engine faults print as they land
  };
  // Every bot arrives from one loopback address (a forwarder's case: the CLI's --per-ip 0);
  // the door caps grow to the fleet so the soak measures load, never the doorman.
  SHARD_WIRE_CFG.maxPerIp = Number.POSITIVE_INFINITY;
  SHARD_WIRE_CFG.maxSeats = Math.max(SHARD_WIRE_CFG.maxSeats, bots);
  SHARD_WIRE_CFG.maxConnections = Math.max(SHARD_WIRE_CFG.maxConnections, bots + 4);
  const restoreRandom = seedGlobalRandom(deriveSeed(seed, 0x50a4)); // the boot draws the same world each run
  const bootT0 = performance.now();
  const host = new ShardHost({ seed, saveDir: null, open: true, worldmass: !classic, log });
  hostRef = host;
  await host.ready();
  const port = await host.listen(0, '127.0.0.1');
  const bootSec = (performance.now() - bootT0) / 1000;
  const url = `ws://127.0.0.1:${port}`;
  const hearth = host.hearthSeat();
  const net = host.net;
  const world = host.worldmass ? 'the Unbroken Wilds' : 'classic';
  console.log(`[soak] ${world} ${seedHex} stood in ${bootSec.toFixed(1)} s on ${url}; ${bots} bots, a ${seconds} s window`);

  // ---- the meters (on the instances: the pump calls this.tick, the host this.net.*) ----
  const win = {
    open: false, t0: 0,
    tickMs: [] as number[], tickAt: [] as number[], wakes: 0,
    snapBytes: [] as number[], bytesSnap: 0, bytesZone: 0, zoneSends: 0, zoneToSends: 0,
    inputs: 0, seatTicks: 0,
  };
  const warm = { on: false, t0: 0, tickMs: [] as number[], tickAt: [] as number[], wakes: 0 };
  const realTick = host.tick.bind(host);
  let lastTickEnd = 0;
  const jumps: ShadowJump[] = [];
  host.tick = (dt: number): void => {
    const t0 = performance.now();
    const wake = t0 - lastTickEnd > SOAK_CFG.wakeGapMs; // a fresh pump wake (ticks inside one run back to back)
    const k = host.keeper.actor.pos, kx = k.x, ky = k.y;
    try { realTick(dt); } finally {
      const t1 = performance.now();
      lastTickEnd = t1;
      const lane = win.open ? win : warm.on ? warm : null;
      if (lane) {
        lane.tickMs.push(t1 - t0); lane.tickAt.push(t0); if (wake) lane.wakes++;
        const kp = host.keeper.actor.pos, px = Math.hypot(kp.x - kx, kp.y - ky);
        if (px > SOAK_CFG.shadowJumpPx) jumps.push({ at: t0, px });
      }
    }
  };
  // Per-snapshot size from the transport's own counters around the send: the
  // frame is written once per socket, so bytes ÷ frames is one snapshot's size.
  const metered = <A extends unknown[]>(fn: (...a: A) => void, sink: (bytes: number, frames: number) => void) => (...a: A): void => {
    const b0 = net.bytesOut, f0 = net.framesOut;
    fn(...a);
    if (win.open) sink(net.bytesOut - b0, net.framesOut - f0);
  };
  net.sendState = metered(net.sendState.bind(net), (b, f) => { win.bytesSnap += b; if (f > 0) win.snapBytes.push(b / f); });
  net.sendZone = metered(net.sendZone.bind(net), b => { win.bytesZone += b; win.zoneSends++; });
  net.sendZoneTo = metered(net.sendZoneTo.bind(net), b => { win.bytesZone += b; win.zoneToSends++; });
  // FED: of the seats that could act this tick, how many had a client input to act on
  // (World.applyInputs steps a seat with no input this tick not at all).
  const realDrain = net.drainInputs.bind(net);
  net.drainInputs = () => {
    const m = realDrain();
    if (win.open) {
      win.inputs += m.size;
      for (const s of host.world.seats) if (!s.keeper && !net.isDormant(s.id)) win.seatTicks++;
    }
    return m;
  };
  // THE COLLECTOR: every V8 pause, so a slow tick can say whether it was the world or the heap.
  const gcs: GcPause[] = [];
  const gcObs = new PerformanceObserver(list => {
    for (const e of list.getEntries()) gcs.push({ start: e.startTime, dur: e.duration, kind: (e as unknown as { detail?: { kind?: number } }).detail?.kind ?? 0 }); // node's entry (the DOM lib's type lacks detail)
  });
  gcObs.observe({ entryTypes: ['gc'] });
  // THE DORMANT SEAT, as the shard saw it (the host's own ears run first).
  const dormantSeen: { id: string; at: number; held: boolean }[] = [];
  const resumeSeen: { id: string; at: number }[] = [];
  net.onPeerDormant(id => { dormantSeen.push({ id, at: performance.now(), held: net.isDormant(id) }); });
  net.onPeerResume(id => { resumeSeen.push({ id, at: performance.now() }); });

  // ---- the fleet ------------------------------------------------------------
  const errors: { at: number; message: string }[] = [];
  const err = (message: string): void => { errors.push({ at: performance.now(), message }); console.error(`[soak] ${message}`); };
  const seated = new Map<number, string>();
  const partyWords: string[] = [];
  // Holders, not lets: a closure's assignments are invisible to TS's flow analysis.
  const ev = {
    party: null as { seats: [string, string]; at: number; server: boolean } | null,
    drop: null as (Extract<Stamped, { t: 'dropped' }> & { rt: number }) | null,
    dropSkip: null as string | null,
    resume: null as (Extract<Stamped, { t: 'resumed' }> & { rt: number }) | null,
    stats: null as { bots: FleetBotStats[]; stepHz: number; clock: string } | null,
    deaths: 0, rejoins: 0, fleetExited: false, ending: false,
  };
  const fleetPath = fileURLToPath(new URL('./soak_bots.ts', import.meta.url));
  const fleet = fork(fleetPath, [
    '--url', url, '--bots', String(bots), '--hearth', `${hearth.x},${hearth.y}`, '--seed', String(seed), '--spread', String(spread),
    '--classes', SOAK_CFG.classes.join(','), '--stagger-ms', String(SOAK_CFG.staggerMs),
    '--drop-bot', String(dropOn ? bots - 1 : -1),
    '--life-sec', String(Math.ceil(seconds + SOAK_CFG.warmupTimeoutSec + SOAK_CFG.partyWaitSec + 120)),
  ], { execArgv: process.execArgv, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  fleetRef = fleet;
  const tell = (c: FleetCommand): void => { try { fleet.send(c); } catch (e) { err(`the fleet did not hear '${c.t}': ${String(e)}`); } };
  fleet.on('message', (raw: unknown) => {
    const e = raw as Stamped, rt = performance.now();
    switch (e.t) {
      case 'seated': {
        seated.set(e.bot, e.seat);
        if (spread > 0) {
          // THE SPREAD: the harness seats each bot at its own anchor on the ring (a party
          // that split up), and the bot roams around that anchor from then on.
          const seat = host.world.seats.find(x => x.id === e.seat);
          if (seat) {
            const ang = 2 * Math.PI * e.bot / bots;
            const want = { x: hearth.x + Math.cos(ang) * spread, y: hearth.y + Math.sin(ang) * spread };
            const at = host.world.clampPos(host.world.findFreeSpot(want, seat.actor.radius + 2) ?? want, seat.actor.radius);
            seat.actor.pos.x = at.x; seat.actor.pos.y = at.y;
          }
        }
        break;
      }
      case 'party': ev.party = { seats: e.seats, at: rt, server: host.parties.rows().some(r => r.members.includes(e.seats[0]) && r.members.includes(e.seats[1])) }; break;
      case 'partyWord': partyWords.push(`bot ${e.bot}: ${e.word}`); break;
      case 'dropped': ev.drop = { ...e, rt }; break;
      case 'dropSkipped': ev.dropSkip = e.why; break;
      case 'resumed': ev.resume = { ...e, rt }; break;
      case 'death': ev.deaths++; break;
      case 'rejoined': ev.rejoins++; break;
      case 'lost': err(`bot ${e.bot} (${e.seat}) lost the shard without a cut`); break;
      case 'error': err(`fleet${e.bot === null ? '' : ` bot ${e.bot}`}: ${e.message}`); break;
      case 'stats': ev.stats = { bots: e.bots, stepHz: e.stepHz, clock: e.clock }; break;
    }
  });
  fleet.on('exit', code => { ev.fleetExited = true; if (!ev.ending) err(`the fleet exited before the end (code ${code})`); });

  // ---- warm-up: the joins and the party ---------------------------------------
  warm.on = true;
  warm.t0 = performance.now();
  const warmDropped0 = host.droppedTicks;
  host.start();
  if (!await until(() => seated.size >= bots || ev.fleetExited, SOAK_CFG.warmupTimeoutSec * 1000))
    err(`the warm-up seated ${seated.size} of ${bots} bots in ${SOAK_CFG.warmupTimeoutSec} s`);
  if (bots >= 2) await until(() => ev.party !== null || ev.fleetExited, SOAK_CFG.partyWaitSec * 1000);
  await sleep(SOAK_CFG.settleSec * 1000);
  warm.on = false;
  const warmSec = (performance.now() - warm.t0) / 1000, warmDropped = host.droppedTicks - warmDropped0;

  // ---- the window -----------------------------------------------------------
  // The forced collection stalls the loop; the pump's catch-up (and any drop it
  // books) settles before the window opens, so the soak never bills its own GC.
  const heapStartMB = liveHeapMB();
  await sleep(100);
  win.t0 = performance.now();
  win.open = true;
  const base = { ticks: host.ticks, dropped: host.droppedTicks, bytes: net.bytesOut, frames: net.framesOut };
  const heap = { lo: Infinity, hi: 0 };
  const pollHeap = (): void => { const u = getHeapStatistics().used_heap_size / MB; if (u < heap.lo) heap.lo = u; if (u > heap.hi) heap.hi = u; };
  const heapPoller = setInterval(pollHeap, SOAK_CFG.heapPollMs);
  const samples: Sample[] = [];
  const prev = { ms: 0, tick: 0, wakes: 0, snap: 0, dropped: base.dropped, bytes: base.bytes, inputs: 0, seatTicks: 0 };
  // THE LIVING RADIUS: how alive the world is around EACH player (the premise the
  // focus law breaks: a seat far from the shadow meets no births).
  const popRadius = host.world.massRuntime?.config.populationRadius ?? 1300;
  const livingRadius = (): { min: number; mean: number } => {
    const standing = host.world.seats.filter(s => !s.keeper && !s.actor.dead && !s.actor.downed && !net.isDormant(s.id));
    if (!standing.length) return { min: 0, mean: 0 };
    const counts = standing.map(s => host.world.actors.filter(a => a.team === 'enemy' && !a.dead
      && Math.hypot(a.pos.x - s.actor.pos.x, a.pos.y - s.actor.pos.y) <= popRadius).length);
    return { min: Math.min(...counts), mean: counts.reduce((a, b) => a + b, 0) / counts.length };
  };
  const partyStands = (): boolean => {
    const p = ev.party;
    return !!p && host.parties.rows().some(r => r.members.includes(p.seats[0]) && r.members.includes(p.seats[1]));
  };
  const sample = (): void => {
    const ms = performance.now() - win.t0, sec = Math.max(1e-3, (ms - prev.ms) / 1000);
    const ticks = sorted(win.tickMs.slice(prev.tick)), snaps = sorted(win.snapBytes.slice(prev.snap));
    const st = host.status() as unknown as StatusView;
    pollHeap();
    const dormant = st.seats.filter(s => s.dormant).length;
    const bytes = net.bytesOut - prev.bytes, seatTicks = win.seatTicks - prev.seatTicks;
    const living = livingRadius();
    const standingNow = host.world.seats.filter(x => !x.keeper && !x.actor.dead && !x.actor.downed);
    let fleetSpreadPx = 0;
    for (const a of standingNow) for (const b of standingNow) fleetSpreadPx = Math.max(fleetSpreadPx, Math.hypot(a.actor.pos.x - b.actor.pos.x, a.actor.pos.y - b.actor.pos.y));
    samples.push({
      livingMin: living.min, livingMean: r2(living.mean), fleetSpreadPx: Math.round(fleetSpreadPx),
      t: r2(ms / 1000), seats: st.seats.length, dormant, connections: st.connections, actors: st.actors,
      ticks: ticks.length, wakes: win.wakes - prev.wakes,
      tickP50: r2(pct(ticks, 0.5)), tickP95: r2(pct(ticks, 0.95)), tickMax: r2(ticks[ticks.length - 1] ?? 0),
      statusP50: st.tickMsP50, statusP95: st.tickMsP95, dropped: host.droppedTicks - prev.dropped,
      fed: seatTicks ? r2((win.inputs - prev.inputs) / seatTicks) : 0,
      snaps: snaps.length, snapKBp95: r2(pct(snaps, 0.95) / 1000),
      outKBps: r2(bytes / 1000 / sec), outKBpsPerClient: r2(st.connections ? bytes / 1000 / sec / st.connections : 0),
      heapTroughMB: r2(heap.lo), heapPeakMB: r2(heap.hi), rssMB: r2(process.memoryUsage.rss() / MB), party: partyStands(),
    });
    heap.lo = Infinity; heap.hi = 0;
    Object.assign(prev, { ms, tick: win.tickMs.length, wakes: win.wakes, snap: win.snapBytes.length, dropped: host.droppedTicks, bytes: net.bytesOut, inputs: win.inputs, seatTicks: win.seatTicks });
  };
  let dropAt: number | null = null;
  for (let edge = SOAK_CFG.sampleSec; ; edge += SOAK_CFG.sampleSec) {
    const b = Math.min(edge, seconds);
    for (;;) {
      const t = (performance.now() - win.t0) / 1000;
      if (dropOn && dropAt === null && t >= seconds / 2) { dropAt = performance.now(); tell({ t: 'drop' }); }
      if (t >= b || ev.fleetExited) break;
      await sleep(Math.max(1, Math.min(50, (b - t) * 1000)));
    }
    sample();
    if (b >= seconds || ev.fleetExited) break;
  }
  win.open = false;
  clearInterval(heapPoller);
  const winEnd = performance.now();
  const windowSec = (winEnd - win.t0) / 1000;
  const fin = { ticks: host.ticks, dropped: host.droppedTicks, bytes: net.bytesOut, frames: net.framesOut };
  const partyAtEnd = partyStands();
  const heapEndMB = liveHeapMB();
  if (host.broken) err('THE BREAKER tripped: the simulate phase faulted every tick');

  // ---- teardown -------------------------------------------------------------
  ev.ending = true;
  tell({ t: 'end' });
  if (!await until(() => ev.fleetExited, SOAK_CFG.teardownTimeoutSec * 1000)) { err('the fleet did not finish its leaves'); fleet.kill(); }
  if (!ev.stats) err('the fleet sent no stats');
  // THE ACTING SEAT: a word said mid-fight sleeps like a lost socket (VESSEL_CFG.combatLeaveSec),
  // so a bot that left in a fight leaves its seat DORMANT; that seat is the law's, and stop() ends it.
  if (!await until(() => host.world.seats.every(s => !!s.keeper || host.net.isDormant(s.id)), 5000))
    err(`${host.world.seats.filter(s => !s.keeper && !host.net.isDormant(s.id)).length} seat(s) still stood after every bot left`);
  await host.stop({ persist: false });
  gcObs.disconnect();
  restoreRandom();
  const faults = host.faults + net.faults;

  // ---- the verdict ----------------------------------------------------------
  const { party: partyEv, drop: dropEv, resume: resumeEv, stats: fleetStats } = ev;
  const ticks = sorted(win.tickMs);
  const worst = samples.reduce<Sample | null>((w, s) => !w || s.tickP95 > w.tickP95 ? s : w, null);
  const dTicks = fin.ticks - base.ticks, dDropped = fin.dropped - base.dropped;
  const droppedShare = dDropped / Math.max(1, dTicks + dDropped);
  const snaps = sorted(win.snapBytes);
  const bytes = fin.bytes - base.bytes;
  const meanConns = mean(samples.map(s => s.connections)) || 1;
  const perClient = (b: number): number => r2(b / 1000 / windowSec / meanConns);
  const fed = win.seatTicks ? win.inputs / win.seatTicks : 0;
  const warmTicks = sorted(warm.tickMs);
  const heapGrowth = heapEndMB - heapStartMB;
  const heapAllowance = gates.heapGrowthMB.max * Math.max(1, seconds / gates.heapGrowthMB.perSeconds);
  const troughSlope = slopePerMin(samples.map(s => s.t), samples.map(s => s.heapTroughMB));
  const rel = (at: number): number => r2((at - win.t0) / 1000);
  const winGcs = gcs.filter(g => g.start >= win.t0 && g.start < winEnd);
  const winJumps = jumps.filter(j => j.at >= win.t0 && j.at < winEnd);
  const gcSummary = {
    pauses: winGcs.length, totalMs: r2(winGcs.reduce((n, g) => n + g.dur, 0)), maxMs: r2(winGcs.reduce((m, g) => Math.max(m, g.dur), 0)),
    byKind: Object.fromEntries(Object.values(GC_KIND).map(k => {
      const of = winGcs.filter(g => GC_KIND[g.kind] === k);
      return [k, { n: of.length, ms: r2(of.reduce((n, g) => n + g.dur, 0)), maxMs: r2(of.reduce((m, g) => Math.max(m, g.dur), 0)) }];
    })),
    inTicksMs: r2(win.tickMs.reduce((n, ms, i) => n + gcWithin(winGcs, win.tickAt[i], win.tickAt[i] + ms), 0)),
  };
  const dropSeat = dropEv?.seat ?? null;
  const heldDormant = dropSeat ? dormantSeen.find(d => d.id === dropSeat && d.held) ?? null : null;
  const resumedHere = dropSeat ? resumeSeen.find(r => r.id === dropSeat) ?? null : null;
  const resumeOk = !!dropEv && !!heldDormant && !!resumedHere && !!resumeEv && resumeEv.resumed && resumeEv.resumedSeat === dropSeat;
  const resumeNote = !dropOn ? 'off (--no-drop)'
    : !dropEv ? `never cut: ${ev.dropSkip ?? 'the window ended before a quiet moment'}`
    : !heldDormant ? `${dropSeat} was cut but the shard never held it dormant`
    : !resumeEv ? `${dropSeat} lay dormant; the window ended before the resume`
    : !resumeEv.resumed ? `${dropSeat} came back as a fresh seat ${resumeEv.resumedSeat || '(none)'}${resumeEv.error ? `: ${resumeEv.error}` : ''}`
    : !resumedHere ? `the client says resumed, the shard never re-bound ${dropSeat}`
    : `${dropSeat} cut at ${rel(dropEv.rt)} s (${dropEv.quiet ? 'quiet' : 'a foe in sight'}), took its seat back at ${rel(resumeEv.rt)} s`;
  const partyFormed = !!partyEv && partyEv.server;
  const partyNote = bots < 2 ? 'n/a (one bot)'
    : !partyEv ? `never formed${partyWords.length ? ` (${partyWords.join('; ')})` : ''}`
    : `${partyEv.seats.join(' + ')} formed ${partyEv.at < win.t0 ? 'in the warm-up' : `at ${rel(partyEv.at)} s`}${partyEv.server ? '' : ' (the shard disagrees)'}, ${partyAtEnd ? 'standing at the end' : 'broken by the end (a member fell)'}`;

  type Gate = { gate: string; value: string; limit: string; status: 'ok' | 'BREACH' | 'n/a' };
  const gate = (name: string, value: string, limit: string, ok: boolean, applies = true): Gate =>
    ({ gate: name, value, limit, status: !applies ? 'n/a' : ok ? 'ok' : 'BREACH' });
  const p95 = pct(ticks, 0.95);
  const gateRows: Gate[] = [
    gate('tick p95', `${r2(p95)} ms`, `<= ${gates.tickP95Ms.max} ms`, ticks.length > 0 && p95 <= gates.tickP95Ms.max),
    gate('dropped ticks', `${r2(droppedShare * 100)}%`, `<= ${r2(gates.droppedShare.max * 100)}%`, droppedShare <= gates.droppedShare.max),
    gate('heap growth', `${heapGrowth >= 0 ? '+' : ''}${r2(heapGrowth)} MB`, `<= ${r2(heapAllowance)} MB`, heapGrowth <= heapAllowance),
    gate('faults', String(faults), `<= ${gates.faults.max}`, faults <= gates.faults.max),
    gate('errors', String(errors.length), `<= ${gates.errors.max}`, errors.length <= gates.errors.max),
    gate('resume', resumeOk ? 'same seat' : dropOn ? 'failed' : 'off', gates.resume.require ? 'required' : 'report only', resumeOk, gates.resume.require && dropOn),
    gate('party', partyFormed ? 'formed' : bots < 2 ? 'one bot' : 'never', gates.party.require ? 'required' : 'report only', partyFormed, gates.party.require && bots >= 2),
  ];
  const breaches = gateRows.filter(g => g.status === 'BREACH');

  const cpu = cpus();
  const report = {
    soak: { version: 1, at: new Date().toISOString(), world, seed: seedHex, bots, seconds, windowSec: r2(windowSec), classes: SOAK_CFG.classes, drop: dropOn },
    machine: { platform: process.platform, release: release(), node: process.version, cpus: cpu.length, cpuModel: cpu[0]?.model.trim() ?? '?', memGB: Math.round(totalmem() / 1024 ** 3) },
    host: { bootSec: r2(bootSec), tickHz: SHARD_CFG.tickHz, stateHz: SHARD_CFG.stateHz, wireCaps: { maxSeats: SHARD_WIRE_CFG.maxSeats, maxConnections: SHARD_WIRE_CFG.maxConnections, maxPerIp: 'unbounded' } },
    warmup: {
      sec: r2(warmSec), ticks: warm.tickMs.length, wakes: warm.wakes, dropped: warmDropped,
      tickP95: r2(pct(warmTicks, 0.95)), tickMax: r2(warmTicks[warmTicks.length - 1] ?? 0),
      slowest: slowest(warm.tickMs, warm.tickAt, warm.t0, SOAK_CFG.slowestTicks, gcs, jumps),
    },
    tick: {
      count: ticks.length, p50: r2(pct(ticks, 0.5)), p95: r2(p95), p99: r2(pct(ticks, 0.99)), max: r2(ticks[ticks.length - 1] ?? 0),
      budgetMs: r2(1000 / SHARD_CFG.tickHz),
      worstWindow: worst ? { endSec: worst.t, p50: worst.tickP50, p95: worst.tickP95, max: worst.tickMax, dropped: worst.dropped } : null,
      slowest: slowest(win.tickMs, win.tickAt, win.t0, SOAK_CFG.slowestTicks, winGcs, jumps),
    },
    living: { radiusPx: popRadius, spreadPx: spread, roveSec: SHARD_CFG.rove.sec, minOfMins: samples.length ? Math.min(...samples.map(x => x.livingMin)) : 0, meanOfMeans: r2(mean(samples.map(x => x.livingMean))) }, // THE LIVING RADIUS
    shadow: { jumps: winJumps.length, jumpTicksMeanMs: r2(mean(winJumps.map(j => win.tickMs[win.tickAt.indexOf(j.at)] ?? 0))), at: winJumps.map(j => ({ sec: rel(j.at), px: Math.round(j.px) })) },
    gc: gcSummary,
    pump: { wakesPerSec: r2(win.wakes / windowSec), ticksPerWake: r2(win.tickMs.length / Math.max(1, win.wakes)) },
    dropped: { ticks: dDropped, stepped: dTicks, share: r2(droppedShare * 1e4) / 1e4 },
    snapshot: { count: snaps.length, bytesP50: Math.round(pct(snaps, 0.5)), bytesP95: Math.round(pct(snaps, 0.95)), bytesMax: Math.round(snaps[snaps.length - 1] ?? 0) },
    wire: {
      bytesOut: bytes, framesOut: fin.frames - base.frames, meanClients: r2(meanConns),
      kBpsPerClient: perClient(bytes),
      byKind: { snapshots: perClient(win.bytesSnap), zone: perClient(win.bytesZone), other: perClient(bytes - win.bytesSnap - win.bytesZone) },
      zoneBroadcasts: win.zoneSends, zoneToOne: win.zoneToSends,
    },
    inputs: { fed: r2(fed), hostSeenHzPerSeat: r2(fed * SHARD_CFG.tickHz), fleetStepHz: fleetStats?.stepHz ?? null, fleetClock: fleetStats?.clock ?? null },
    heap: { startMB: r2(heapStartMB), endMB: r2(heapEndMB), growthMB: r2(heapGrowth), allowanceMB: r2(heapAllowance), forcedGc: !!fullGc, troughSlopeMBPerMin: r2(troughSlope) },
    faults,
    dormant: {
      enabled: dropOn, ok: resumeOk, note: resumeNote, seat: dropSeat,
      cutSec: dropEv ? rel(dropEv.rt) : null, quiet: dropEv?.quiet ?? null, dormantHeld: !!heldDormant,
      resumedSec: resumeEv ? rel(resumeEv.rt) : null, resumedSeat: resumeEv?.resumedSeat ?? null, clientResumed: resumeEv?.resumed ?? null, shardRebound: !!resumedHere,
    },
    party: { formed: partyFormed, note: partyNote, seats: partyEv?.seats ?? null, standingAtEnd: partyAtEnd, words: partyWords },
    bots: { seated: seated.size, deaths: ev.deaths, rejoins: ev.rejoins, perBot: fleetStats?.bots ?? [] },
    errors: errors.map(e => ({ sec: rel(e.at), message: e.message })),
    gates: gateRows,
    breaches: breaches.map(b => b.gate),
    verdict: breaches.length ? 'BREACH' : 'PASS',
    thresholds: gatesPath,
    samples,
    hostLog,
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // ---- the table ------------------------------------------------------------
  const L = (s: string | number, w: number): string => String(s).padStart(w);
  const R = (s: string | number, w: number): string => String(s).padEnd(w);
  const out: string[] = [];
  out.push('', `THE SOAK  ${world} ${seedHex}  ·  ${bots} bots${spread ? ` spread ${spread} px` : ''}${host.worldmass ? `  ·  rove ${SHARD_CFG.rove.sec ? SHARD_CFG.rove.sec + ' s' : 'off'}` : ''}  ·  ${r2(windowSec)} s window  ·  warm-up ${r2(warmSec)} s  ·  boot ${r2(bootSec)} s`);
  out.push(`  ${report.machine.cpuModel} × ${cpu.length}  ·  ${process.platform} ${release()}  ·  node ${process.version}  ·  the fleet in its own process`);
  out.push('', `${L('t s', 6)} ${L('seats', 5)} ${L('conn', 4)} ${L('actors', 6)}   ${L('tick p50', 8)} ${L('p95', 6)} ${L('max', 6)} ${L('drop', 4)} ${L('wake/s', 6)} ${L('fed', 4)}   ${L('snap kB p95', 11)} ${L('out kB/s/cl', 11)}   ${L('heap MB', 7)}   ${L('living', 9)} ${L('spread', 6)}`);
  for (const s of samples)
    out.push(`${L(s.t.toFixed(1), 6)} ${L(s.seats + (s.dormant ? '*' : ''), 5)} ${L(s.connections, 4)} ${L(s.actors, 6)}   ${L(s.tickP50.toFixed(2), 8)} ${L(s.tickP95.toFixed(2), 6)} ${L(s.tickMax.toFixed(1), 6)} ${L(s.dropped, 4)} ${L((s.wakes / SOAK_CFG.sampleSec).toFixed(1), 6)} ${L(Math.round(s.fed * 100) + '%', 4)}   ${L(s.snapKBp95.toFixed(1), 11)} ${L(s.outKBpsPerClient.toFixed(1), 11)}   ${L(s.heapTroughMB.toFixed(1), 7)}   ${L(s.livingMin + '/' + s.livingMean.toFixed(1), 9)} ${L(s.fleetSpreadPx, 6)}`);
  out.push(`  (heap MB = the window's trough; fed = seat-ticks that had a client input; living = live foes within ${popRadius} px of each standing seat, least / mean${samples.some(s => s.dormant) ? '; * a seat lay dormant' : ''})`);
  const k = report.wire.byKind;
  const slow = report.tick.slowest.map(x => `${x.ms} ms @ ${x.atSec} s${x.jumpPx ? ` (shadow jump ${x.jumpPx} px)` : ''}${x.gcMs >= 1 ? ` (gc ${x.gcMs})` : ''}`).join(', ');
  const rows: [string, string][] = [
    ['tick p50 / p95 / p99 / max', `${report.tick.p50} / ${report.tick.p95} / ${report.tick.p99} / ${report.tick.max} ms over ${ticks.length} ticks (budget ${report.tick.budgetMs} ms)`],
    ['worst 5 s window', worst ? `p95 ${worst.tickP95} ms, max ${worst.tickMax} ms, ${worst.dropped} dropped (window ending ${worst.t} s)` : 'none'],
    ['slowest ticks', slow || 'none'],
    ['dropped ticks', `${dDropped} of ${dTicks + dDropped} (${r2(droppedShare * 100)}%)`],
    ['gc pauses', `${gcSummary.pauses} (${gcSummary.byKind.major.n} major, max ${gcSummary.maxMs} ms); ${gcSummary.totalMs} ms in all, ${gcSummary.inTicksMs} ms of it inside ticks (${r2(gcSummary.inTicksMs / Math.max(1, win.tickMs.reduce((a, b) => a + b, 0)) * 100)}% of tick time)`],
    ['the pump', `${report.pump.wakesPerSec} wakes/s, ${report.pump.ticksPerWake} ticks per wake`],
    ['shadow jumps', host.worldmass ? `${report.shadow.jumps} (the keeper moved to another focus seat; those ticks averaged ${report.shadow.jumpTicksMeanMs} ms)` : 'n/a (classic)'],
    ['the living radius', `least ${report.living.minOfMins}, mean ${report.living.meanOfMeans} foes within ${popRadius} px of a standing seat${spread ? ` (bots spread ${spread} px)` : ''}${host.worldmass ? ` · rove ${SHARD_CFG.rove.sec ? SHARD_CFG.rove.sec + ' s, ' + ((host.status() as { rove?: { hops: number } }).rove?.hops ?? 0) + ' hops' : 'off'}` : ''}`],
    ['inputs fed', `${r2(fed * 100)}% of seat-ticks (${report.inputs.hostSeenHzPerSeat} Hz per seat; the fleet sent ${fleetStats?.stepHz ?? '?'} Hz on a ${fleetStats?.clock ?? '?'} clock)`],
    ['warm-up (not gated)', `${warm.tickMs.length} ticks, p95 ${report.warmup.tickP95} ms, max ${report.warmup.tickMax} ms, ${warmDropped} dropped`],
    ['snapshot bytes p50 / p95 / max', `${r2(pct(snaps, 0.5) / 1000)} / ${r2(pct(snaps, 0.95) / 1000)} / ${r2((snaps[snaps.length - 1] ?? 0) / 1000)} kB over ${snaps.length} snapshots`],
    ['outbound per client', `${report.wire.kBpsPerClient} kB/s (snapshots ${k.snapshots}, zone ${k.zone}, other ${k.other}); ${win.zoneSends} zone re-ships`],
    ['heap (live, forced GC)', `${r2(heapStartMB)} -> ${r2(heapEndMB)} MB (${heapGrowth >= 0 ? '+' : ''}${r2(heapGrowth)} MB; trough slope ${r2(troughSlope)} MB/min)${fullGc ? '' : ' [no forced GC: raw readings]'}`],
    ['faults', String(faults)],
    ['dormant seat', resumeNote],
    ['party', partyNote],
    ['bots', `${seated.size} of ${bots} seated · ${ev.deaths} deaths · ${ev.rejoins} rejoins · ${fleetStats?.bots.filter(b => b.downedAtEnd).length ?? '?'} down at the end`],
    ['errors', errors.length ? errors.map(e => e.message).join(' | ') : 'none'],
  ];
  out.push('');
  for (const [a, b] of rows) out.push(`  ${R(a, 32)} ${b}`);
  out.push('', `  ${R('gate', 16)} ${R('value', 14)} ${R('limit', 14)} verdict`);
  for (const g of gateRows) out.push(`  ${R(g.gate, 16)} ${R(g.value, 14)} ${R(g.limit, 14)} ${g.status}`);
  out.push('', breaches.length
    ? `  BREACH: ${breaches.map(b => `${b.gate} (${b.value}, limit ${b.limit})`).join('; ')}  —  report: ${reportPath}`
    : `  PASS  —  report: ${reportPath}`);
  console.log(out.join('\n'));
  return breaches.length ? 2 : 0;
}

process.on('SIGINT', () => {
  console.error('[soak] interrupted');
  fleetRef?.kill();
  void (hostRef?.stop({ persist: false }) ?? Promise.resolve()).finally(() => process.exit(1));
});

main().then(async code => {
  await sleep(SOAK_CFG.exitSettleMs);
  process.exit(code);
}, async e => {
  console.error('[soak] the harness failed:', e instanceof Error ? e.stack ?? e.message : String(e));
  fleetRef?.kill();
  try { await hostRef?.stop({ persist: false }); } catch { /* already down */ }
  await sleep(SOAK_CFG.exitSettleMs);
  process.exit(1);
});
