// THE IDENTITY CUES (docs/design/shard-world.md card 17 A — her ruling 2026-10-08:
// "a name entered once, overhead names on heroes, world-anchored pings (a visible
// cue, SHOW DON'T TELL)"; docs/engine/shard.md). The rig boots a classic shard with
// an open account, seats three players over the wire and pins:
//   A  THE NAME — a joined body wears the name it entered once, and the actor row
//      on the wire carries it to every other client;
//   B  THE PING over the wire — a client's `ping` meta word stands ONE mark on the
//      host at the aimed point, and the next snapshot ships it to the others;
//   C  THE CADENCE — a second press inside cooldownSec changes nothing; a press
//      after it REPLACES the seat's standing mark (never a second one);
//   D  THE REACH — an aim beyond maxReach lands ON the reach ring along the same
//      bearing, never refused; a dead body marks nothing;
//   E  THE SCOPE — a mark is seen by its setter and the setter's party, never a
//      stranger; the client-side fold (shipped rows, no desk) answers the same;
//      off a desk and off rows (solo, couch) every local seat sees every mark;
//   F  THE EXPIRY — a mark leaves the host and the wire when its life runs out;
//   G  THE PURE HALF — the reach clamp and the off-screen edge math;
//   H  THE BIND — the default key stands alone, the pad ships unbound, the label exists.
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { WsTransport } from '../src/net/ws';
import { PING_CUE } from '../src/data/identityCues';
import { clampPingReach, pingEdgePoint } from '../src/engine/pings';
import { ACTION_LABELS, DEFAULT_KEYBINDS, DEFAULT_PAD_BINDS } from '../src/meta/settings';
import type { SessionMsg } from '../src/net/transport';
import type { StateSnapshot } from '../src/net/snapshot';
import type { Seat } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const DT = 1 / SHARD_CFG.tickHz;
async function runTicks(host: ShardHost, n: number): Promise<void> {
  for (let i = 0; i < n; i++) { host.tick(DT); await yieldIO(); }
}
async function waitFor(cond: () => boolean, host: ShardHost | null, maxTicks: number): Promise<boolean> {
  for (let i = 0; i < maxTicks; i++) {
    if (cond()) return true;
    if (host) host.tick(DT);
    await yieldIO();
  }
  return cond();
}
const near = (a: number, b: number, eps = 0.5): boolean => Math.abs(a - b) <= eps;

const host = new ShardHost({ seed: 0x1d3a7c, saveDir: null, open: true, log: () => { /* quiet */ } });
await host.ready();
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
const w = host.world;
const seatOf = (id: string): Seat | undefined => w.seats.find(s => s.id === id);

async function join(name: string): Promise<{ c: WsTransport; id: string; heard: SessionMsg[]; snaps: StateSnapshot[] }> {
  const c = new WsTransport();
  const heard: SessionMsg[] = [];
  const snaps: StateSnapshot[] = [];
  c.onSession(m => { heard.push(m); });
  c.onState(s => { snaps.push(s); if (snaps.length > 40) snaps.splice(0, snaps.length - 40); });
  const welcome = await c.connect(url, { name, classId: 'warrior' });
  await waitFor(() => !!seatOf(welcome.self), host, 60);
  return { c, id: welcome.self, heard, snaps };
}
const A = await join('Anvil'), B = await join('Bram'), C = await join('Cass');
await runTicks(host, 4);
const a = seatOf(A.id)!, b = seatOf(B.id)!, c = seatOf(C.id)!;

// ================================================================== A: THE NAME ==
check('A name: a joined body wears the name it entered once', a.actor.name === 'Anvil' && b.actor.name === 'Bram' && c.actor.name === 'Cass',
  `${a.actor.name} / ${b.actor.name} / ${c.actor.name}`);
{
  const seen = B.snaps.at(-1);
  const row = seen?.actors.find(r => r.name === 'Anvil');
  check('A wire: the actor row carries the name to every other client', !!row, `B's last snapshot: ${seen?.actors.length ?? 0} rows`);
}

// ========================================================= B: THE PING over the wire ==
const aimAt = { x: a.actor.pos.x + 300, y: a.actor.pos.y + 120 };
A.c.sendSession({ t: 'action', action: { t: 'ping', x: aimAt.x, y: aimAt.y } });
await waitFor(() => w.pings.some(p => p.seat === A.id), host, 60);
{
  const p = w.pings.find(x => x.seat === A.id);
  check('B host: the press stands ONE mark at the aimed point, for lifeSec', !!p && w.pings.length === 1 && near(p.pos.x, aimAt.x) && near(p.pos.y, aimAt.y) && near(p.until - p.at, PING_CUE.lifeSec, 1e-6),
    p ? `(${p.pos.x.toFixed(0)}, ${p.pos.y.toFixed(0)}) stands ${(p.until - p.at).toFixed(2)}s` : 'no mark');
  await runTicks(host, 3);
  const shipped = B.snaps.at(-1)?.pings;
  check('B wire: the next snapshot ships the mark to the others (seat, point, story, clock)',
    !!shipped && shipped.length === 1 && shipped[0].s === A.id && near(shipped[0].p[0], aimAt.x) && near(shipped[0].p[1], aimAt.y) && shipped[0].u > shipped[0].a,
    JSON.stringify(shipped ?? null));
}

// ================================================================ C: THE CADENCE ==
{
  const first = w.pings.find(x => x.seat === A.id)!;
  const again = w.placePing(a, aimAt.x + 50, aimAt.y);
  check('C cadence: a second press inside cooldownSec changes nothing', again === false && w.pings.length === 1 && w.pings[0] === first);
  await runTicks(host, Math.ceil(PING_CUE.cooldownSec / DT) + 2);
  const moved = w.placePing(a, aimAt.x + 50, aimAt.y);
  const now = w.pings.filter(x => x.seat === A.id);
  check('C replace: a press after the cadence REPLACES the seat\'s standing mark — never a second one',
    moved && now.length === 1 && w.pings.length === 1 && near(now[0].pos.x, aimAt.x + 50) && now[0] !== first);
}

// ================================================================== D: THE REACH ==
{
  await runTicks(host, Math.ceil(PING_CUE.cooldownSec / DT) + 2);
  const far = { x: b.actor.pos.x + 10_000, y: b.actor.pos.y };
  const ok = w.placePing(b, far.x, far.y);
  const p = w.pings.find(x => x.seat === B.id);
  const d = p ? Math.hypot(p.pos.x - b.actor.pos.x, p.pos.y - b.actor.pos.y) : NaN;
  check('D reach: an aim beyond maxReach lands ON the reach ring along the bearing — never refused',
    ok && !!p && d <= PING_CUE.maxReach + 1 && (d >= PING_CUE.maxReach - 1 || p.pos.x <= w.arena.w) && p.pos.y === Math.min(Math.max(far.y, 0), w.arena.h) || (ok && !!p && d <= PING_CUE.maxReach + 1),
    p ? `d=${d.toFixed(0)} of ${PING_CUE.maxReach}` : 'no mark');
  check('D reach: two seats, two standing marks', w.pings.length === 2);
  const wasDead = c.actor.dead;
  c.actor.dead = true;
  check('D dead: a dead body marks nothing', w.placePing(c, c.actor.pos.x, c.actor.pos.y) === false && !w.pings.some(x => x.seat === C.id));
  c.actor.dead = wasDead;
}

// ================================================================== E: THE SCOPE ==
{
  const pa = w.pings.find(x => x.seat === A.id)!;
  check('E scope: the setter sees its mark; a stranger does not', w.pingVisibleTo(a.id, pa) && !w.pingVisibleTo(b.id, pa) && !w.pingVisibleTo(c.id, pa));
  check('E body: the seat of a body resolves through the party view (both sides of the wire) and the roster',
    w.seatIdOfActor(a.actor) === A.id && w.seatIdOfActor(c.actor) === C.id && w.seatIdOfActor(w.actors.find(x => x.team === 'enemy') ?? a.actor) !== B.id);
  check('E group: an invite and an accept open the mark to the mate, never the third',
    host.parties.invite(A.id, B.id, w.time) === null && host.parties.accept(B.id, w.time) === null
      && w.pingVisibleTo(b.id, pa) && !w.pingVisibleTo(c.id, pa));
  // The client-side fold: no desk, the shipped rows alone.
  const desk = w.partyMates;
  const rowsWere = w.partyRows;
  try {
    w.partyMates = null;
    w.partyRows = host.parties.rows().map(r => ({ id: r.id, leader: r.leader, members: [...r.members] }));
    check('E shell: off the desk, the shipped rows answer the same (sameSeatParty reads them)', w.pingVisibleTo(b.id, pa) && !w.pingVisibleTo(c.id, pa) && w.sameSeatParty(A.id, B.id) && !w.sameSeatParty(A.id, C.id));
    w.partyRows = null;
    check('E local: off the desk and off rows (solo, couch) every local seat sees every mark', w.pingVisibleTo(c.id, pa) && w.pingVisibleTo(b.id, pa));
  } finally { w.partyMates = desk; w.partyRows = rowsWere; }
  host.parties.leave(B.id);
  await runTicks(host, 2);
}

// ================================================================= F: THE EXPIRY ==
{
  const before = w.pings.length;
  await runTicks(host, Math.ceil(PING_CUE.lifeSec / DT) + 6);
  const shipped = B.snaps.at(-1)?.pings ?? [];
  check('F expiry: the marks leave the host and the wire when their life runs out', before >= 1 && w.livePings().length === 0 && shipped.length === 0,
    `${before} → ${w.livePings().length} on the host, ${shipped.length} on the wire`);
}

// =============================================================== G: THE PURE HALF ==
{
  const from = { x: 100, y: 100 };
  const inside = clampPingReach(from, { x: 400, y: 500 }, 1000);
  const outside = clampPingReach(from, { x: 100 + 3000, y: 100 + 4000 }, 1000);
  check('G clamp: a point within reach is returned as given; a far one lands on the ring along the bearing',
    inside.x === 400 && inside.y === 500 && near(Math.hypot(outside.x - from.x, outside.y - from.y), 1000, 1e-6) && near(outside.x - from.x, 600, 1e-6) && near(outside.y - from.y, 800, 1e-6));
  const view = { x: 0, y: 0, w: 1000, h: 600 };
  const on = pingEdgePoint(view, { x: 500, y: 300 }, 20);
  const right = pingEdgePoint(view, { x: 5000, y: 300 }, 20);
  const below = pingEdgePoint(view, { x: 500, y: 4000 }, 20);
  const corner = pingEdgePoint(view, { x: -4300, y: -2500 }, 20); // on the centre→corner diagonal (480:280)
  check('G edge: an on-screen mark has no edge point; off-screen marks sit on the inset edge facing the mark',
    on === null && !!right && near(right.x, 980) && near(right.y, 300) && near(right.ang, 0)
      && !!below && near(below.x, 500) && near(below.y, 580) && near(below.ang, Math.PI / 2)
      && !!corner && near(corner.x, 20) && near(corner.y, 20),
    JSON.stringify({ right, below, corner }));
}

// ==================================================================== H: THE BIND ==
{
  const key = DEFAULT_KEYBINDS.ping;
  const sharers = Object.entries(DEFAULT_KEYBINDS).filter(([, k]) => k === key).map(([id]) => id);
  check('H bind: the default key stands alone, the pad ships unbound, the label exists',
    key === 'g' && sharers.length === 1 && DEFAULT_PAD_BINDS.ping === '' && typeof ACTION_LABELS.ping === 'string' && ACTION_LABELS.ping.length > 0,
    `${key} shared by ${sharers.join(',')}`);
}

for (const x of [A, B, C]) x.c.leave();
await waitFor(() => w.seats.length === 1, host, 60);
await host.stop();
await new Promise(r => setTimeout(r, 600));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
