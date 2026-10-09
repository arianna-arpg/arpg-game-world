// ---------------------------------------------------------------------------
// THE SOAK's FLEET — the bot players `balance/soak_shard.ts` forks into a
// process of their own (docs/engine/shard.md "THE SOAK"). Every bot is the
// client the game ships (WsTransport over Node's native WebSocket) driven by
// a small brain: a random walk around the hearth that aims at the nearest foe
// it can see and stands to hold slot 0 while one is within striking reach.
//
// The fleet lives APART from the host on purpose: N clients parsing every
// snapshot would otherwise share the server's event loop, heap and GC, and
// the soak's tick, pacing and memory numbers would be the bots' as much as
// the world's. In its own process the host holds only what a shard holds.
//
//   parent → fleet (IPC)  { t: 'drop' }  arm THE DORMANT SEAT's raw cut
//                         { t: 'end' }   every bot leaves with its word
//   fleet → parent (IPC)  FleetEvent rows as they happen, then { t: 'stats' }
//
// Not run by hand: `npm run soak:shard` forks it with the shard's address.
// ---------------------------------------------------------------------------

import { WsTransport, shardResumeFor, type ShardResume } from '../src/net/ws';
import { deriveSeed, mulberry32 } from '../src/sim/rng';
import type { PlayerInput } from '../src/net/intent';
import type { SessionMsg } from '../src/net/transport';
import type { StateSnapshot } from '../src/net/snapshot';

export const FLEET_CFG = {
  /** Inputs each bot sends a second: THE FLEET'S CLOCK (below) steps every bot on each frame boundary. */
  inputHz: 60,
  /** THE FLEET'S CLOCK spins when a 1 ms timer comes back later than this (Windows: ~15 ms). */
  coarseTimerMs: 3,
  /** A foe this close is SEEN: the bot aims at the nearest one (px). */
  sightPx: 400,
  /** A foe this close is STRUCK: the bot stands and holds slot 0 (px). */
  strikePx: 160,
  /** The walk's box: ±roamPx around the hearth on each axis; past it a bot heading out turns home. */
  roamPx: 1500,
  /** Seconds between fresh headings, uniform in [min, max]. */
  turnSec: [1, 3] as const,
  /** THE FRESH HERO'S END: seconds a fallen bot spends at its class pick before it sends `rejoin`. */
  rejoinSec: 3,
  /** THE DORMANT SEAT: seconds between the raw cut and the reconnect carrying the token. */
  resumeSec: 5,
  /** The cut waits up to this long for a quiet moment (standing, no foe in sight), then cuts anyway;
   *  twice this with the bot never standing and the drop is skipped (reported, never silent). */
  dropQuietWaitSec: 15,
  /** THE PARTY: the invite is re-sent this often until the party stands, at most partyTries times. */
  partyRetrySec: 3,
  partyTries: 3,
  /** After every leave(), the sockets get this long to close before the stats ship. */
  leaveSettleMs: 1000,
  /** Node on Windows asserts inside libuv when an exit lands mid-close (the probes' settle). */
  exitSettleMs: 600,
};

/** What the fleet tells the soak. Every row also carries `at` (Date.now() when it was sent). */
export type FleetEvent =
  | { t: 'seated'; bot: number; seat: string; classId: string }
  | { t: 'party'; seats: [string, string] }
  | { t: 'partyWord'; bot: number; word: string }
  | { t: 'dropped'; bot: number; seat: string; quiet: boolean; waitedSec: number }
  | { t: 'dropSkipped'; bot: number; why: string }
  | { t: 'resumed'; bot: number; seat: string; resumedSeat: string; resumed: boolean; error?: string }
  | { t: 'death'; bot: number; seat: string }
  | { t: 'rejoined'; bot: number; seat: string }
  | { t: 'lost'; bot: number; seat: string }
  | { t: 'error'; bot: number | null; message: string }
  | { t: 'stats'; bots: FleetBotStats[]; stepHz: number; clock: 'spin' | 'timer' };
export type FleetCommand = { t: 'drop' } | { t: 'end' };
export interface FleetBotStats {
  bot: number; seat: string; classId: string;
  inputs: number; snaps: number; zones: number;
  deaths: number; rejoins: number; lost: number;
  downedAtEnd: boolean;
}

interface Bot {
  i: number; name: string; classId: string;
  t: WsTransport | null; self: string; resume: ShardResume | null;
  rng: () => number; seq: number; heading: number; turnAt: number;
  pos: { x: number; y: number } | null; down: boolean; seatedOnce: boolean;
  foe: { x: number; y: number; d: number } | null;
  awaitingRejoin: boolean; cutting: boolean;
  inputs: number; snaps: number; zones: number; deaths: number; rejoins: number; lost: number;
  timers: Set<ReturnType<typeof setTimeout>>;
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

const args = parseArgs(process.argv.slice(2));
const str = (k: string, d: string): string => typeof args[k] === 'string' ? args[k] as string : d;
const url = str('url', '');
const n = Math.max(1, Math.floor(Number(str('bots', '1'))) || 1);
const [hx, hy] = str('hearth', '0,0').split(',').map(Number);
const hearth = { x: Number.isFinite(hx) ? hx : 0, y: Number.isFinite(hy) ? hy : 0 };
const seed = (Number(str('seed', '1')) || 1) >>> 0;
const classes = str('classes', 'warrior').split(',').filter(Boolean);
const staggerMs = Math.max(0, Number(str('stagger-ms', '200')) || 0);
const dropBot = Math.floor(Number(str('drop-bot', '-1')));
const lifeSec = Math.max(30, Number(str('life-sec', '900')) || 900);

const msg = (e: unknown): string => e instanceof Error ? e.message : String(e);
function emit(e: FleetEvent): void {
  try { process.send?.({ ...e, at: Date.now() }); } catch { /* the soak is gone; the disconnect ear ends us */ }
}

const bots: Bot[] = [];
const party = { tries: 0, lastAt: 0, formed: false };
const drop = { armed: false, armedAt: 0, done: false };
let ending = false;
let steps = 0;
let clockT0 = 0;

function later(b: Bot, sec: number, fn: () => void): void {
  const h = setTimeout(() => { b.timers.delete(h); fn(); }, sec * 1000);
  b.timers.add(h);
}

function turn(b: Bot, now: number, heading: number): void {
  b.heading = heading;
  const [lo, hi] = FLEET_CFG.turnSec;
  b.turnAt = now + (lo + b.rng() * (hi - lo)) * 1000;
}

/** One bot's frame: the walk, the aim, the strike. A bot with no seat in hand sends nothing. */
function step(b: Bot, now: number): void {
  const t = b.t, at = b.pos;
  if (!t || !at || b.awaitingRejoin || b.cutting || ending) return;
  if (now >= b.turnAt) turn(b, now, b.rng() * Math.PI * 2);
  const ox = at.x - hearth.x, oy = at.y - hearth.y;
  // Past the box and still heading out: home, give or take half a radian.
  if ((Math.abs(ox) > FLEET_CFG.roamPx || Math.abs(oy) > FLEET_CFG.roamPx) && Math.cos(b.heading) * ox + Math.sin(b.heading) * oy > 0)
    turn(b, now, Math.atan2(-oy, -ox) + (b.rng() - 0.5));
  const foe = b.foe;
  const cx = Math.cos(b.heading), cy = Math.sin(b.heading);
  const input: PlayerInput = foe && foe.d <= FLEET_CFG.strikePx
    ? { dx: 0, dy: 0, aim: { x: foe.x, y: foe.y }, held: [true], edge: [], seq: ++b.seq }
    : { dx: cx, dy: cy, aim: foe ? { x: foe.x, y: foe.y } : { x: at.x + cx * 100, y: at.y + cy * 100 }, held: [false], edge: [], seq: ++b.seq };
  t.sendInput(b.self, input);
  b.inputs++;
}

function onSnap(b: Bot, s: StateSnapshot): void {
  b.snaps++;
  const row = s.seats[b.self];
  if (!row) { b.pos = null; return; } // not seated yet, or fallen and waiting on the class pick
  const at = { x: row.pos[0], y: row.pos[1] };
  b.pos = at;
  b.down = row.dead || row.downed;
  if (!b.seatedOnce) { b.seatedOnce = true; emit({ t: 'seated', bot: b.i, seat: b.self, classId: b.classId }); }
  let best: { x: number; y: number; d: number } | null = null;
  for (const a of s.actors) {
    if (a.team !== 'enemy' || a.dead || a.downed || a.ut) continue;
    const d = Math.hypot(a.p[0] - at.x, a.p[1] - at.y);
    if (d <= (best?.d ?? FLEET_CFG.sightPx)) best = { x: a.p[0], y: a.p[1], d };
  }
  b.foe = best;
  // THE PARTY stands once the wire's own rows hold both founders.
  const mate = bots[1];
  if (b.i === 0 && mate && !party.formed && s.parties?.some(r => r.members.includes(b.self) && r.members.includes(mate.self))) {
    party.formed = true;
    emit({ t: 'party', seats: [b.self, mate.self] });
  }
}

function onWord(b: Bot, t: WsTransport, m: SessionMsg): void {
  if (m.t === 'runEnd') {
    // THE FRESH HERO'S END: the seat left the world; the class pick's `rejoin` re-seats it.
    if (b.awaitingRejoin) return;
    b.awaitingRejoin = true; b.deaths++; b.pos = null; b.foe = null;
    emit({ t: 'death', bot: b.i, seat: b.self });
    later(b, FLEET_CFG.rejoinSec, () => { if (b.t === t && !ending) t.sendSession({ t: 'rejoin', classId: b.classId }); });
  } else if (m.t === 'newRun') {
    b.self = m.seat; b.awaitingRejoin = false; b.rejoins++;
    emit({ t: 'rejoined', bot: b.i, seat: m.seat });
  } else if (m.t === 'partyInvite') {
    if (b.i === 1 && m.from === bots[0]?.self) t.sendSession({ t: 'party', op: 'accept' });
  } else if (m.t === 'partyWord') {
    emit({ t: 'partyWord', bot: b.i, word: m.word });
  }
}

function attach(b: Bot, t: WsTransport): void {
  t.onState(s => { if (b.t === t) onSnap(b, s); });
  t.onZone(() => { if (b.t === t) b.zones++; });
  t.onSession(m => { if (b.t === t) onWord(b, t, m); });
  t.onHostLost(() => {
    if (b.t !== t || ending) return; // a transport the bot let go of, or the run's own end
    if (b.cutting) return; // THE DORMANT SEAT's own cut (the resume is already on its clock)
    b.lost++; b.t = null; b.pos = null;
    emit({ t: 'lost', bot: b.i, seat: b.self });
  });
}

/** THE DORMANT SEAT's cut: the transport's own socket (a private field — the
 *  game never cuts itself) closed WITHOUT leave(), so no `session leaving` is
 *  said and the shard reads a lost connection. */
function cutRaw(b: Bot): boolean {
  const ws = (b.t as unknown as { ws?: unknown } | null)?.ws;
  if (typeof WebSocket === 'undefined' || !(ws instanceof WebSocket)) return false;
  b.cutting = true;
  ws.close();
  return true;
}

/** THE RECONNECT TOKEN: a new transport asks for the dormant seat back. */
async function resume(b: Bot): Promise<void> {
  if (ending) return;
  const seat = b.self;
  const t = new WsTransport();
  b.t = t;
  attach(b, t);
  try {
    const r = await t.connect(url, { name: b.name, classId: b.classId }, undefined, b.resume ?? undefined);
    b.self = r.self; b.cutting = false;
    b.seq = 0; // the new shell counts its inputs from zero (the shard forgot the old count)
    const mem = shardResumeFor(url);
    b.resume = mem && mem.seat === r.self ? mem : null; // the resume minted a fresh token
    emit({ t: 'resumed', bot: b.i, seat, resumedSeat: r.self, resumed: r.resumed });
  } catch (e) {
    b.cutting = false; b.t = null; b.pos = null;
    emit({ t: 'resumed', bot: b.i, seat, resumedSeat: '', resumed: false, error: msg(e) });
  }
}

/** THE PARTY: the first bot invites the second once both stand seated. */
function partyStep(now: number): void {
  if (n < 2 || party.formed || party.tries >= FLEET_CFG.partyTries) return;
  const [a, b] = bots;
  if (!a?.t || !b?.t || !a.pos || !b.pos) return;
  if (party.tries > 0 && now - party.lastAt < FLEET_CFG.partyRetrySec * 1000) return;
  party.tries++; party.lastAt = now;
  a.t.sendSession({ t: 'party', op: 'invite', seat: b.self });
}

/** THE DORMANT SEAT: once armed, the drop bot is cut at its first quiet moment. */
function dropStep(now: number): void {
  if (!drop.armed || drop.done) return;
  const b = bots[dropBot];
  if (!b) { drop.done = true; emit({ t: 'dropSkipped', bot: dropBot, why: 'no such bot' }); return; }
  const waited = (now - drop.armedAt) / 1000;
  const standing = !!b.t && !!b.pos && !b.down && !b.awaitingRejoin && !b.cutting;
  const quiet = standing && !b.foe;
  if (!quiet && !(standing && waited >= FLEET_CFG.dropQuietWaitSec)) {
    if (waited >= FLEET_CFG.dropQuietWaitSec * 2) { drop.done = true; emit({ t: 'dropSkipped', bot: b.i, why: 'the drop bot never stood to be cut' }); }
    return;
  }
  drop.done = true;
  const seat = b.self;
  if (!cutRaw(b)) { emit({ t: 'dropSkipped', bot: b.i, why: 'the cut found no socket on the transport' }); return; }
  emit({ t: 'dropped', bot: b.i, seat, quiet, waitedSec: +waited.toFixed(2) });
  later(b, FLEET_CFG.resumeSec, () => { void resume(b); }); // timed from the cut, not from the close's echo
}

// THE FLEET'S CLOCK: a browser sends one input per animation frame, a steady
// 60 Hz. Node's timers on Windows wake on the 15.6 ms system tick (a 16.7 ms
// interval runs at ~36 Hz) — and how coarse they are shifts with the machine's
// state — so on Windows, or wherever a 1 ms timer comes back late, the fleet
// SPINS on setImmediate (one core busy in the fleet's own process, never the
// host's); where timers are fine (a Linux codespace's two cores) it sleeps to a
// millisecond short of each frame and spins only the rest. A stall skips
// frames; it never replays a burst (the shard would merge one into one input).
const frameMs = 1000 / FLEET_CFG.inputHz;
let nextFrame = 0;
let spin = true;
function clock(): void {
  if (ending) return;
  const now = performance.now();
  if (!clockT0) { clockT0 = now; nextFrame = now; }
  if (now >= nextFrame) {
    steps++;
    const wall = Date.now();
    for (const b of bots) step(b, wall);
    partyStep(wall);
    dropStep(wall);
    nextFrame += frameMs;
    if (now - nextFrame > frameMs * 4) nextFrame = now + frameMs;
  }
  const wait = nextFrame - performance.now();
  if (spin || wait <= 1.5) setImmediate(clock); else setTimeout(clock, wait - 1);
}
void (async () => {
  const late: number[] = [];
  for (let i = 0; i < 5; i++) { const t = performance.now(); await new Promise(r => setTimeout(r, 1)); late.push(performance.now() - t - 1); }
  spin = process.platform === 'win32' || late.sort((a, b) => a - b)[2] > FLEET_CFG.coarseTimerMs;
  clock();
})();

function end(): void {
  if (ending) return;
  ending = true; // the clock stops spinning
  for (const b of bots) {
    for (const h of b.timers) clearTimeout(h);
    b.timers.clear();
    b.t?.leave(); // THE DELIBERATE LEAVE: the word, then the close (the seat ends at once)
  }
  setTimeout(() => {
    const stats: FleetBotStats[] = bots.map(b => ({
      bot: b.i, seat: b.self, classId: b.classId, inputs: b.inputs, snaps: b.snaps, zones: b.zones,
      deaths: b.deaths, rejoins: b.rejoins, lost: b.lost, downedAtEnd: b.down,
    }));
    const bye = (): void => { setTimeout(() => process.exit(0), FLEET_CFG.exitSettleMs); };
    const row = { t: 'stats', bots: stats, stepHz: +(steps / Math.max(1e-3, (performance.now() - clockT0) / 1000)).toFixed(1), clock: spin ? 'spin' : 'timer', at: Date.now() };
    if (process.send) process.send(row, () => bye()); else bye();
  }, FLEET_CFG.leaveSettleMs);
}

process.on('message', (raw: unknown) => {
  const m = raw as FleetCommand | null;
  if (m?.t === 'drop') { if (!drop.armed) { drop.armed = true; drop.armedAt = Date.now(); } }
  else if (m?.t === 'end') end();
});
process.on('disconnect', () => { if (!ending) process.exit(1); }); // the soak is gone: nobody to report to
setTimeout(() => { if (!ending) { emit({ t: 'error', bot: null, message: `the soak never said end within ${lifeSec}s` }); end(); } }, lifeSec * 1000).unref();

async function main(): Promise<void> {
  if (!url) { emit({ t: 'error', bot: null, message: 'no --url' }); end(); return; }
  for (let i = 0; i < n && !ending; i++) {
    const b: Bot = {
      i, name: `Soak ${String(i + 1).padStart(2, '0')}`, classId: classes[i % classes.length] ?? 'warrior',
      t: null, self: '', resume: null, rng: mulberry32(deriveSeed(seed, i + 1)), seq: 0, heading: 0, turnAt: 0,
      pos: null, down: false, seatedOnce: false, foe: null, awaitingRejoin: false, cutting: false,
      inputs: 0, snaps: 0, zones: 0, deaths: 0, rejoins: 0, lost: 0, timers: new Set(),
    };
    bots.push(b);
    const t = new WsTransport();
    b.t = t;
    attach(b, t);
    try {
      const r = await t.connect(url, { name: b.name, classId: b.classId });
      b.self = r.self;
      // THE REMEMBERED SESSION is one per page; N bots share this module, so each
      // keeps the copy its own welcome left (the connects are sequential).
      const mem = shardResumeFor(url);
      b.resume = mem && mem.seat === r.self ? mem : null;
      if (!b.resume) emit({ t: 'error', bot: i, message: `the welcome for ${r.self} carried no reconnect token` });
    } catch (e) {
      b.t = null;
      emit({ t: 'error', bot: i, message: `connect failed: ${msg(e)}` });
    }
    if (i < n - 1) await new Promise(r => setTimeout(r, staggerMs));
  }
}

void main().catch(e => { emit({ t: 'error', bot: null, message: `the fleet threw: ${msg(e)}` }); end(); });
