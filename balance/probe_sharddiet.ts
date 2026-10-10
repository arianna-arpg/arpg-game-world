// ---------------------------------------------------------------------------
// PROBE: THE WIRE DIET (shard sync pass C, items 8, 14, 15 and 20;
// docs/engine/shard.md "THE WIRE DIET"): a hosted world's frames per audience.
//
//   npx tsx balance/probe_sharddiet.ts
//
// Boots a REAL ShardHost (open account, saveDir null, quiet) on a free port with
// a wide flat floor (9,600 px: the default reach, twice the near radius, cuts
// it), seats three WsTransport clients and ticks the host by hand, reading what
// each client RECEIVES (inflated by its own transport) against the host's own
// canonical snapshots. Pins:
//   A  INTEREST: two seats standing together share ONE encoded body per snapshot
//      (the encodings counted), a far seat its own; a foe near the far seat rides
//      its frames and never the others'; every far seat rides as a FAR ROSTER row
//      (place, name, pools) and a shell's party view keeps all three names
//   B  a party mate's surroundings ride (the foe reaches the mate's frames), the
//      party shares one body, and the own court rides wherever it stands
//   C  THE LITE IDS: a lite body keeps its wire id across snapshots, rides only
//      near frames, and a shell glides it (midway, flown on, THE FORWARD LAW)
//   D  QUANTIZATION: every inflated row equals the host's canonical row field for
//      field, the quantized ones within their grids (0.25 px, 1/512 turn, the hit
//      flash and the poses), and a shell draws both alike within the grid
//   E  THE DRESS DELTA: a doodad added, one removed, one swapped in place (a husk)
//      ride the next snapshot's `dd` rows; one felled rides its `fell` row; no zone
//      message re-ships; a shell laying the deltas holds the host's ground, the
//      ledger's row twin equals serializeZone's, and a zone change ships the zone
//   F  FLOW CONTROL: a client that stops acking gets at most maxUnacked + 1 frames
//      past its ack, its changed build and dress carry into the frame that resumes
//      it, and it resumes when it acks
//   G  the hit flash glides on a hosted shell (a fall eases, a rise stands)
// ---------------------------------------------------------------------------

import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { dressRowOf } from '../server/wireDiet';
import { WsTransport } from '../src/net/ws';
import { ZONES, type ZoneDef } from '../src/data/zones';
import { CLASSES } from '../src/data/classes';
import { World, type Seat } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import type { Doodad } from '../src/engine/levelgen';
import { registerDoodadRule } from '../src/engine/levelgen';
import { makeAccount } from '../src/meta/account';
import { buildManifest } from '../src/packages/manifest';
import { seedGlobalRandom } from '../src/sim/rng';
import { applySnapshot, applyZone, interpolateSnapshot, serializeZone, type ActorW, type StateSnapshot, type ZoneMsg } from '../src/net/snapshot';
import { WIRE_DIET_CFG, dressKey, glideLite } from '../src/net/wireDiet';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' : ' + detail : ''}`);
  if (!ok) failed++;
};
const info = (line: string): void => console.log(`INFO  ${line}`);
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const DT = 1 / SHARD_CFG.tickHz;
const BEAT = Math.round(SHARD_CFG.tickHz / SHARD_CFG.stateHz);

// THE FLOOR: flat, empty, quiet, and wider than the reach (9,600 px against 3,200).
const FLOOR = 'probe_sharddiet_floor';
ZONES[FLOOR] = {
  id: FLOOR, name: 'The Long Floor', level: 1, size: { w: 9600, h: 2400 },
  theme: { floor: '#101010', grid: '#181818', border: '#3a3a3a', obstacle: '#2a2a2a', obstacleEdge: '#444444', accent: '#888888' },
  seed: 0xd1e7f1, layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9400, y: 9400 },
} as ZoneDef;
// A plain blocking post the rampage may fell (probe_rampage's qa_picket idiom).
registerDoodadRule('qa_diet_post', { overlap: 'inert', blocksMove: true, blocksShot: true, blocksSight: true });

const restoreRandom = seedGlobalRandom(0xd1e7);
const host = new ShardHost({ seed: 0xd1e75eed, saveDir: null, open: true, log: () => { /* quiet */ } });
await host.ready();
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
const w = host.world;
const hearthZone = w.zone.id;
const seatOf = (id: string): Seat => host.units.seatOf(id)!;

// The host's canonical snapshots (before the diet), by zone and tick.
const sent = new Map<string, StateSnapshot>();
{
  const send = host.net.sendStateTo.bind(host.net);
  host.net.sendStateTo = (s: StateSnapshot, ids: Iterable<string>): void => { sent.set(s.zoneId + '@' + s.tick, s); send(s, ids); };
}
const canonical = (s: StateSnapshot): StateSnapshot | undefined => sent.get(s.zoneId + '@' + s.tick);

interface Client { c: WsTransport; id: string; got: StateSnapshot[]; zones: ZoneMsg[] }
async function tick(n: number): Promise<void> { for (let i = 0; i < n; i++) { host.tick(DT); await yieldIO(); } }
async function join(name: string): Promise<Client> {
  const c = new WsTransport();
  const cl: Client = { c, id: '', got: [], zones: [] };
  c.onState(s => { cl.got.push(s); });
  c.onZone(z => { cl.zones.push(z); });
  cl.id = (await c.connect(url, { name, classId: 'warrior' })).self;
  for (let i = 0; i < 120 && !host.units.seatOf(cl.id); i++) await tick(1);
  return cl;
}
const A = await join('Aster'), B = await join('Bryn'), C = await join('Cass');
w.loadZone(FLOOR);
for (let i = 0; i < 200 && [A, B, C].some(cl => cl.zones.at(-1)?.zoneId !== FLOOR); i++) await tick(1);
const place = (s: Seat, x: number, y: number): void => { s.actor.pos.x = x; s.actor.pos.y = y; s.actor.vel.x = 0; s.actor.vel.y = 0; };
const sA = seatOf(A.id), sB = seatOf(B.id), sC = seatOf(C.id);
// Willed steps end THE SPAWN GRACE; then the three stand still: A and B together, C far east.
for (let i = 0; i < 4; i++) {
  for (const cl of [A, B, C]) cl.c.sendInput(cl.id, { dx: 0, dy: 1, aim: { x: 0, y: 0 }, held: [], edge: [], seq: i + 1, dt: DT });
  await tick(1);
}
place(sA, 800, 1200); place(sB, 900, 1200); place(sC, 8000, 1200);
await tick(BEAT * 4);
check('rig: three seats on the long floor (A and B together, C 7,100 px east)',
  w.zone.id === FLOOR && Math.hypot(sA.actor.pos.x - sC.actor.pos.x, sA.actor.pos.y - sC.actor.pos.y) > 6000 && Math.abs(sA.actor.pos.x - sB.actor.pos.x) < 200,
  `zone ${w.zone.id}, reach ${WIRE_DIET_CFG.reachPx || 'derived'}`);
const ids = (s: StateSnapshot): Set<number> => new Set(s.actors.map(a => a.id));
const rowOf = (s: StateSnapshot, id: number): ActorW | undefined => s.actors.find(a => a.id === id);

// ================================================== A: interest, one body per audience ==
{
  const e0 = host.diet.encodings, beats0 = A.got.length;
  await tick(BEAT * 10);
  const beats = A.got.length - beats0, encs = host.diet.encodings - e0;
  check('A share: A and B standing together share ONE encoded body a snapshot, C its own (two a snapshot)',
    beats >= 9 && encs === beats * 2, `${encs} encodings over ${beats} snapshots`);
  const foe = w.createMonster('zombie', 1, 'enemy');
  foe.pos.x = sC.actor.pos.x + 160; foe.pos.y = sC.actor.pos.y; foe.passive = true; foe.sheet.setBase('moveSpeed', 0);
  if (!w.actors.includes(foe)) w.actors.push(foe);
  const n = { a: A.got.length, b: B.got.length, c: C.got.length };
  await tick(BEAT * 4);
  const fa = A.got.slice(n.a), fb = B.got.slice(n.b), fc = C.got.slice(n.c);
  check('A interest: a foe near the far seat rides its frames and never the near pair\'s',
    fc.length >= 3 && fc.every(s => ids(s).has(foe.id)) && [...fa, ...fb].every(s => !ids(s).has(foe.id)),
    `C ${fc.filter(s => ids(s).has(foe.id)).length}/${fc.length}, A ${fa.filter(s => ids(s).has(foe.id)).length}, B ${fb.filter(s => ids(s).has(foe.id)).length}`);
  const lastA = A.got.at(-1)!, lastC = C.got.at(-1)!;
  const cRow = rowOf(lastA, sC.actor.id), aRow = rowOf(lastC, sA.actor.id);
  check('A far roster: each far seat\'s hero rides as a far row (its place, its name, its pools; no look)',
    cRow?.fr === 1 && cRow.name === 'Cass' && cRow.seat === C.id && Math.abs(cRow.p[0] - sC.actor.pos.x) <= 0.13 && cRow.maxLife > 0 && cRow.lk === undefined
      && aRow?.fr === 1 && aRow.name === 'Aster' && rowOf(lastA, sB.actor.id)?.fr === undefined,
    JSON.stringify(cRow ?? null));
  // A shell's party view (the strip and the overhead names) keeps every seat.
  const acct = makeAccount();
  const shell = new World(acct, Object.freeze(buildManifest(acct, w.manifest.seed)));
  shell.createPlayer(CLASSES[0], { startingCompanions: false, startingFlasks: false });
  shell.clientSeatId = A.id;
  applyZone(shell, A.zones.at(-1)!);
  applySnapshot(shell, lastA);
  const names = shell.party.members.map(m => m.actor.name).sort().join(',');
  check('A far roster: a shell\'s party view keeps all three seats by name', names === 'Aster,Bryn,Cass', names);
  w.actors.splice(w.actors.indexOf(foe), 1);
}

// =================================== B: a party mate's surroundings, and the own court ==
{
  const foe = w.createMonster('zombie', 1, 'enemy');
  foe.pos.x = sC.actor.pos.x + 160; foe.pos.y = sC.actor.pos.y; foe.passive = true; foe.sheet.setBase('moveSpeed', 0);
  if (!w.actors.includes(foe)) w.actors.push(foe);
  const word = host.parties.invite(A.id, C.id, w.time) ?? host.parties.accept(C.id, w.time);
  await tick(BEAT * 3);
  const e0 = host.diet.encodings, n = { a: A.got.length, b: B.got.length };
  await tick(BEAT * 6);
  const fa = A.got.slice(n.a), fb = B.got.slice(n.b), encs = host.diet.encodings - e0;
  check('B party: a mate\'s surroundings ride (the foe by C reaches A\'s frames, never B\'s)',
    word === null && fa.length >= 5 && fa.every(s => ids(s).has(foe.id)) && fb.every(s => !ids(s).has(foe.id)),
    `word ${word}, A ${fa.filter(s => ids(s).has(foe.id)).length}/${fa.length}`);
  check('B party: the party shares one body (A and C), B its own: two a snapshot', encs === fa.length * 2, `${encs} encodings over ${fa.length}`);
  check('B party: the mate rides whole in its party\'s frames (no far row)', fa.every(s => rowOf(s, sC.actor.id)?.fr === undefined));
  // THE OWN COURT: A's minion stands 3,900 px from everyone; it rides A's (and its party's) frames alone.
  const imp = w.createMonster('zombie', 1, 'player', sA.actor);
  imp.owner = sA.actor; imp.passive = true; imp.sheet.setBase('moveSpeed', 0);
  imp.pos.x = 4600; imp.pos.y = 2200;
  if (!w.actors.includes(imp)) w.actors.push(imp);
  const m = { a: A.got.length, b: B.got.length, c: C.got.length };
  await tick(BEAT * 4);
  const far = Math.min(...[sA, sB, sC].map(s => Math.hypot(s.actor.pos.x - imp.pos.x, s.actor.pos.y - imp.pos.y)));
  check('B court: the own court rides wherever it stands (A\'s minion, 3,900 px out, rides A and its party, never B)',
    far > 3200 && A.got.slice(m.a).every(s => ids(s).has(imp.id)) && C.got.slice(m.c).every(s => ids(s).has(imp.id)) && B.got.slice(m.b).every(s => !ids(s).has(imp.id)),
    `nearest seat ${Math.round(far)} px`);
  w.actors.splice(w.actors.indexOf(imp), 1);
  w.actors.splice(w.actors.indexOf(foe), 1);
  host.parties.leave(A.id);
  await tick(BEAT * 2);
}

// ================================================================= C: THE LITE IDS ==
{
  const poured = w.devLitePour('vermin_tide', 6, { x: sC.actor.pos.x, y: sC.actor.pos.y + 420 });
  const n = { b: B.got.length, c: C.got.length };
  await tick(BEAT * 8);
  const fc = C.got.slice(n.c).filter(s => s.lt?.i);
  const idSets = fc.map(s => s.lt!.i!.slice().sort((x, y) => x - y).join(','));
  check('C lite: a lite body rides the near frames with a wire id, one per body',
    poured === 6 && fc.length >= 6 && fc.every(s => s.lt!.i!.length * 3 === s.lt!.b.length && new Set(s.lt!.i).size === s.lt!.i!.length), `poured ${poured}, ${fc.length} frames`);
  check('C lite: each body keeps its id across snapshots', idSets.length >= 6 && idSets.every(x => x === idSets[0]), idSets[0]);
  check('C lite: the far pair never hears the horde', B.got.slice(n.b).every(s => !s.lt));
  // The glide on a shell (synthetic rows, the flights' own timing): midway, flown on, held.
  const acct = makeAccount();
  const shell = new World(acct, Object.freeze(buildManifest(acct, w.manifest.seed)));
  shell.partyRows = [];
  const lt = (t: number, x: number): StateSnapshot => ({ time: t, lt: { k: ['vermin_tide'], b: [0, x, 50], i: [77] } }) as unknown as StateSnapshot;
  const s0 = lt(1, 100), s1 = lt(1.05, 110), s2 = lt(1.1, 115); // s2: still forward, short of where it flew on
  glideLite(shell, null, s0, 1, 0, 0.1);
  glideLite(shell, s0, s1, 0.5, 0, 0.1);
  const mid = shell.liteWire!.b[1];
  glideLite(shell, s0, s1, 1, 0.05, 0.1);
  const on = shell.liteWire!.b[1];
  glideLite(shell, s1, s2, 0.3, 0, 0.1);
  const held = shell.liteWire!.b[1];
  check('C glide: a body glides midway by its id, flies on along its pace past the newest row, and never runs back (THE FORWARD LAW)',
    Math.abs(mid - 105) < 1e-9 && Math.abs(on - 120) < 1e-9 && held === on && shell.liteWire!.i?.[0] === 77, `mid ${mid}, on ${on}, held ${held}`);
}

// ============================================================ D: QUANTIZATION ==
{
  const grid = 1 / WIRE_DIET_CFG.posSteps, turn = Math.PI * 2 / WIRE_DIET_CFG.turnSteps;
  const QUANT = new Set(['p', 'f', 'hf', 'bodyWalkPose', 'bodyActionPose', 'worm', 'st', 'concealmentExposedUntil']);
  let rows = 0, off = 0, dp = 0, df = 0, dh = 0, dpose = 0;
  const offKeys = new Set<string>();
  for (const cl of [A, B, C]) for (const s of cl.got) {
    const h = canonical(s);
    if (!h) continue;
    for (const r of s.actors) {
      if (r.fr) continue;
      const c = h.actors.find(x => x.id === r.id);
      if (!c) { off++; offKeys.add('a row the host never held'); continue; }
      rows++;
      dp = Math.max(dp, Math.abs(r.p[0] - c.p[0]), Math.abs(r.p[1] - c.p[1]));
      let d = Math.abs(r.f - c.f) % (Math.PI * 2); d = Math.min(d, Math.PI * 2 - d); df = Math.max(df, d);
      dh = Math.max(dh, Math.abs(r.hf - c.hf));
      if (c.bodyWalkPose && r.bodyWalkPose) dpose = Math.max(dpose, Math.abs(r.bodyWalkPose.travel - c.bodyWalkPose.travel), Math.abs(r.bodyWalkPose.weight - c.bodyWalkPose.weight));
      for (const k of new Set([...Object.keys(r), ...Object.keys(c)])) {
        if (QUANT.has(k)) continue;
        if (JSON.stringify((r as unknown as Record<string, unknown>)[k]) !== JSON.stringify((c as unknown as Record<string, unknown>)[k])) { off++; offKeys.add(k); }
      }
      if (!!c.bodyWalkPose !== !!r.bodyWalkPose || !!c.bodyActionPose !== !!r.bodyActionPose || !!c.worm !== !!r.worm) { off++; offKeys.add('a pose or worm'); }
    }
  }
  check('D codec: every inflated row equals the host\'s canonical row field for field (the quantized ones aside)',
    rows > 200 && off === 0, `${rows} rows, ${off} off ${JSON.stringify([...offKeys])}`);
  check('D grid: positions within half the 0.25 px grid, facing within half a 1/512 turn, the hit flash within a hundredth, the walk within its grid',
    dp <= grid / 2 + 1e-9 && df <= turn / 2 + 1e-9 && dh <= 0.01 + 1e-9 && dpose <= 0.005 + 1e-9,
    `pos ${dp.toFixed(4)} px, facing ${df.toFixed(5)} rad, flash ${dh.toFixed(4)}, walk ${dpose.toFixed(4)}`);
  // A shell draws the inflated frame and the canonical rows alike within the grid: the same frame
  // adopted twice, once with the host's own rows in place of the inflated ones.
  const frame = [...A.got].reverse().find(s => !!canonical(s) && s.actors.filter(a => !a.fr).length >= 2)!;
  const h = canonical(frame)!;
  const twin: StateSnapshot = { ...frame, actors: frame.actors.map(r => (r.fr ? r : JSON.parse(JSON.stringify(h.actors.find(x => x.id === r.id)!)) as ActorW)) };
  const acct = makeAccount();
  const shell = new World(acct, Object.freeze(buildManifest(acct, w.manifest.seed)));
  shell.createPlayer(CLASSES[0], { startingCompanions: false, startingFlasks: false });
  shell.clientSeatId = A.id;
  applyZone(shell, A.zones.at(-1)!);
  const drawn = (): Map<number, { x: number; y: number; f: number; hf: number; rest: string }> => new Map(shell.actors.map((a: Actor) => [a.id, {
    x: a.pos.x, y: a.pos.y, f: a.facing, hf: a.hitFlash,
    rest: JSON.stringify([a.radius, a.color, a.shape, a.team, a.name, a.life, a.es, a.downed, a.dead, a.passive, a.untargetable, a.look, a.material, a.defId,
      a.adorn, a.rarity, a.faction, a.isMinion(), a.statuses.map(s => [s.id, s.stacks]), a.sheet.get('life')]),
  }]));
  applySnapshot(shell, JSON.parse(JSON.stringify(frame)) as StateSnapshot);
  const one = drawn();
  applySnapshot(shell, twin);
  const two = drawn();
  let same = one.size === two.size && one.size >= 2, worst = 0;
  for (const [id, a] of one) {
    const b = two.get(id);
    if (!b || a.rest !== b.rest) { same = false; continue; }
    worst = Math.max(worst, Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    let d = Math.abs(a.f - b.f) % (Math.PI * 2); d = Math.min(d, Math.PI * 2 - d);
    if (d > turn / 2 + 1e-9 || Math.abs(a.hf - b.hf) > 0.01 + 1e-9) same = false;
  }
  check('D draw: a shell draws the inflated frame as it draws the canonical rows (every drawn field equal, each body within the grid)',
    same && worst <= grid / 2 + 1e-9, `${one.size} bodies, worst ${worst.toFixed(4)} px`);
}

// ======================================================= E: THE DRESS DELTA ==
{
  // A shell that lays A's arrivals in order (the shell's own adopt, every frame).
  const acct = makeAccount();
  const shell = new World(acct, Object.freeze(buildManifest(acct, w.manifest.seed)));
  shell.createPlayer(CLASSES[0], { startingCompanions: false, startingFlasks: false });
  shell.clientSeatId = A.id;
  applyZone(shell, A.zones.at(-1)!);
  let prev: StateSnapshot | null = null;
  const off = A.c.onState(s => { applySnapshot(shell, s, prev); prev = s; });
  await tick(BEAT * 2);
  const z0 = { a: A.zones.length, b: B.zones.length, c: C.zones.length };
  const at = (dx: number, dy: number): { x: number; y: number } => ({ x: sA.actor.pos.x + dx, y: sA.actor.pos.y + dy });
  const keyOf = (d: Doodad): string => dressKey(Math.round(d.pos.x * 100) / 100, Math.round(d.pos.y * 100) / 100, d.kind);
  const nextFrames = async (): Promise<StateSnapshot[]> => { const n = A.got.length; await tick(BEAT); return A.got.slice(n); };
  // An addition.
  const post: Doodad = { pos: at(220, -160), radius: 14, kind: 'qa_diet_post' as Doodad['kind'] };
  const v0 = shell.doodadsVersion();
  w.doodads.push(post); w.markDoodadsChanged(post);
  const f1 = await nextFrames();
  check('E add: a doodad added rides the next snapshot\'s dd rows (keyed by its place and kind)',
    f1.length === 1 && !!f1[0].dd?.a?.some(r => dressKey(r.p[0], r.p[1], r.kind) === keyOf(post)) && shell.doodads.some(d => keyOf(d) === keyOf(post)) && shell.doodadsVersion() !== v0,
    JSON.stringify(f1[0]?.dd ?? null));
  // A removal (a pop: spliced).
  const crate: Doodad = { pos: at(-260, 140), radius: 12, kind: 'qa_diet_post' as Doodad['kind'] };
  w.doodads.push(crate); w.markDoodadsChanged(crate);
  await tick(BEAT);
  w.doodads.splice(w.doodads.indexOf(crate), 1); w.markDoodadsChanged(crate);
  const f2 = await nextFrames();
  check('E remove: a doodad spliced away rides the next snapshot\'s dd removals, and the shell drops it',
    f2.length === 1 && !!f2[0].dd?.r?.includes(keyOf(crate)) && !shell.doodads.some(d => keyOf(d) === keyOf(crate)), JSON.stringify(f2[0]?.dd ?? null));
  // A felled piece stays standing in the list: its own `fell` row rides, no dd row.
  const felled = w.fellDoodad(post, 'qa');
  const f3 = await nextFrames();
  check('E fell: a felled doodad rides the next snapshot\'s fell row (it stays in the roster: no dd row)',
    felled && f3.length === 1 && !!f3[0].fell?.some(r => Math.abs(r.x - post.pos.x) <= 1 && Math.abs(r.y - post.pos.y) <= 1) && !f3[0].dd
      && !!shell.doodads.find(d => keyOf(d) === keyOf(post))?.felled, `felled ${felled}, ${JSON.stringify(f3[0]?.fell ?? null)}`);
  // An in-place swap (the harvest husk's grammar): the piece as it stood goes, the piece as it stands arrives.
  const node: Doodad = { pos: at(120, 220), radius: 13, kind: 'qa_diet_post' as Doodad['kind'] };
  w.doodads.push(node); w.markDoodadsChanged(node);
  await tick(BEAT);
  const was = keyOf(node);
  node.kind = 'rock' as Doodad['kind']; w.markDoodadsChanged();
  const f4 = await nextFrames();
  check('E swap: a piece changed in place rides as its old key removed and its new row added',
    f4.length === 1 && !!f4[0].dd?.r?.includes(was) && !!f4[0].dd?.a?.some(r => r.kind === 'rock' && dressKey(r.p[0], r.p[1], r.kind) === keyOf(node))
      && shell.doodads.some(d => keyOf(d) === keyOf(node)) && !shell.doodads.some(d => keyOf(d) === was), JSON.stringify(f4[0]?.dd ?? null));
  // Past the dress beat: still no zone message for any client (the dress rode the snapshots).
  await tick(Math.ceil(SHARD_CFG.dressSec * SHARD_CFG.tickHz) + BEAT);
  check('E beat: no zone message re-ships for the churn, past the dress beat', A.zones.length === z0.a && B.zones.length === z0.b && C.zones.length === z0.c,
    `zones A ${A.zones.length - z0.a}, B ${B.zones.length - z0.b}, C ${C.zones.length - z0.c}`);
  // The shell holds the host's ground (the shipped rows as a multiset of keys), and the ledger's twin is serializeZone's row.
  const zrows = serializeZone(w).doodads;
  const hostKeys = zrows.map(r => dressKey(r.p[0], r.p[1], r.kind)).sort().join('|');
  const shellKeys = shell.doodads.filter(d => !d.well).map(d => dressKey(d.pos.x, d.pos.y, d.kind)).sort().join('|');
  check('E converge: the shell laying the deltas holds exactly the host\'s ground', hostKeys === shellKeys, `${zrows.length} host rows`);
  const twins = w.doodads.filter(d => !d.well && !w.titans.owns(d)).map(d => JSON.stringify(dressRowOf(d)));
  check('E twin: the ledger\'s row is serializeZone\'s row, piece for piece', twins.length === zrows.length && twins.every((t, i) => t === JSON.stringify(zrows[i])));
  off();
}

// ========================================================= F: FLOW CONTROL ==
{
  (host as unknown as { metaHeartbeat: number }).metaHeartbeat = 1e9; // no heartbeat re-dirties a build inside the window
  B.c.setAcking(false);
  await tick(BEAT * 2);
  const n0 = B.got.length, a0 = A.got.length, k0 = host.diet.skipped;
  await tick(BEAT * 20);
  const gotB = B.got.length - n0, gotA = A.got.length - a0;
  check('F cap: a client that stops acking gets at most maxUnacked + 1 frames past its ack, then none (the others unthrottled)',
    gotB <= WIRE_DIET_CFG.maxUnacked + 1 && gotA >= 19 && host.diet.skipped > k0, `B ${gotB}, A ${gotA}, skipped ${host.diet.skipped - k0}`);
  // While it starves: its build changes (the dirty beat ships once) and the ground moves.
  const ess = Object.keys(sB.meta.essences)[0] as keyof typeof sB.meta.essences;
  const purse = sB.meta.essences[ess] + 11;
  sB.meta.essences[ess] = purse; w.markMetaDirty(sB);
  const stone: Doodad = { pos: { x: sB.actor.pos.x - 200, y: sB.actor.pos.y + 200 }, radius: 11, kind: 'qa_diet_post' as Doodad['kind'] };
  w.doodads.push(stone); w.markDoodadsChanged(stone);
  await tick(BEAT * 4);
  const starved = B.got.length - n0;
  B.c.setAcking(true);
  const n1 = B.got.length;
  await tick(BEAT * 6);
  const back = B.got.slice(n1), first = back[0];
  const hostFirst = first ? canonical(first) : undefined;
  check('F resume: it resumes once it acks', starved === gotB && back.length >= 5, `starved ${starved}, then ${back.length}`);
  check('F carry: the build that changed while it starved rides the frame that resumes it (the host\'s own snapshot carried none)',
    !!first?.seatMeta?.[B.id] && first.seatMeta[B.id].ess?.[ess] === purse && !!hostFirst && hostFirst.seatMeta?.[B.id] === undefined,
    `tick ${first?.tick}: meta ${first?.seatMeta?.[B.id] ? 'carried' : 'none'}`);
  check('F carry: the ground that moved while it starved rides that frame\'s dd rows',
    !!first?.dd?.a?.some(r => r.kind === 'qa_diet_post' && Math.abs(r.p[0] - stone.pos.x) < 0.01), JSON.stringify(first?.dd ?? null));
  (host as unknown as { metaHeartbeat: number }).metaHeartbeat = SHARD_CFG.metaHeartbeatSec;
}

// ===================================================== E2: a zone change ships the zone ==
{
  const z0 = A.zones.length;
  const u = host.units.travel(A.id, hearthZone);
  await tick(BEAT * 4);
  const fresh = A.got.filter(s => s.zoneId === hearthZone);
  check('E zone: a zone change ships the whole zone (the one road it still rides), and the new ground\'s frames follow',
    !!u && A.zones.length === z0 + 1 && A.zones.at(-1)!.zoneId === hearthZone && fresh.length >= 3, `zones +${A.zones.length - z0}, frames ${fresh.length}`);
}

// ======================================================= G: the hit flash glides ==
{
  const acct = makeAccount();
  const shell = new World(acct, Object.freeze(buildManifest(acct, w.manifest.seed)));
  shell.createPlayer(CLASSES[0], { startingCompanions: false, startingFlasks: false });
  shell.clientSeatId = 'p99';
  const base = C.got.at(-1)!;
  const row = JSON.parse(JSON.stringify(base.actors.find(a => !a.seat && !a.fr) ?? base.actors[0])) as ActorW;
  const at = (t: number, hf: number): StateSnapshot => ({ ...JSON.parse(JSON.stringify(base)), time: t, parties: [], actors: [{ ...row, hf }] }) as StateSnapshot;
  const s0 = at(10, 0.15), s1 = at(10.05, 0.05), s2 = at(10.1, 0.15);
  applySnapshot(shell, s0);
  applySnapshot(shell, s1, s0, 0.5);
  const fall = shell.actors.find(a => a.name === row.name)?.hitFlash ?? -1;
  applySnapshot(shell, s2, s1, 0.25);
  const rise = shell.actors.find(a => a.name === row.name)?.hitFlash ?? -1;
  check('G flash: on a hosted shell the hit flash eases down between the pair, and a fresh blow stands at once',
    Math.abs(fall - 0.1) < 1e-9 && rise === 0.15, `fall ${fall}, rise ${rise}`);
  void interpolateSnapshot;
}

// ===================================================================== bytes ==
{
  const frames = [...A.got, ...B.got, ...C.got].slice(-60);
  const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  info(`bytes: the diet's shared bodies were encoded ${host.diet.encodings} times; ${host.diet.skipped} frames skipped under flow control; ${frames.length} recent frames inflated to ${Math.round(mean(frames.map(s => JSON.stringify(s).length)))} B mean (canonical form)`);
}

for (const cl of [A, B, C]) cl.c.leave();
await tick(60);
await host.stop();
restoreRandom();
await new Promise(r => setTimeout(r, 600));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
