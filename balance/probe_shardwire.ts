// ---------------------------------------------------------------------------
// PROBE: THE WIRE'S EYES (docs/engine/shard.md "THE WIRE'S EYES"): the rows a
// hosted world's client draws from that rode no wire before, and the shelf on
// its beat.
//
//   npx tsx balance/probe_shardwire.ts
//
// Boots a REAL ShardHost (open account, saveDir null, quiet) on a free port,
// seats two WsTransport clients and ticks the host by hand, reading what each
// client RECEIVES (never a second direct serialization: the wire's ledgers are
// per world). Pins:
//   A  a ground telegraph cast on the host reaches a client's `zones`: its fill
//      rises across snapshots, then it explodes (ex) and lingers, then it is gone
//   B  a telegraphed leap ships its landing ring (dest, radius, telegraph)
//   C  a projectile keeps one wire id across snapshots and its `v` is its
//      displacement over the snapshot interval
//   D  THE OWN ENTRY: the own seat's `cd` row appears after a cooldown cast and
//      counts down; `gg` reports a gauge's fill; neither row reaches OTHER seats
//   E  a combat float carries `o` = the striking seat; a non-combat float none
//   F  size discipline: with nothing to show, the snapshot carries none of the
//      new rows (the pre-pass shape, key for key)
//   G  THE SHELF BEAT: the vendor rows ride the beat in a quiet stretch, a
//      purchase and a restock ship on the next snapshot
//   H  the client's stubs: zones, own clocks (anchor + local countdown), gauge
//      banks, a flight's glide and fly-on, a band's ends, float owners
//   I  THE OWN META: a client hears its own seat's build and never another's,
//      on a change and on the heartbeat, and a resumed dormant seat hears its
//      own on its first snapshot; the spliced frame is the per-socket view's JSON
// and prints the measured snapshot bytes with and without the new rows.
// ---------------------------------------------------------------------------

import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { WsTransport, shardResumeFor } from '../src/net/ws';
import { SKILLS } from '../src/data/skills';
import { CLASSES } from '../src/data/classes';
import { makeSkillInstance } from '../src/engine/skills';
import { gaugeFill, gaugeReady } from '../src/engine/gauge';
import { World, type Seat } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { makeAccount } from '../src/meta/account';
import { buildManifest } from '../src/packages/manifest';
import { floatOwnerShown } from '../src/world/bulletins';
import { JOURNAL_WIRE_CFG } from '../src/net/journalWire'; // THE COUNTERS AND THE JOURNAL: the journal row's own beat
import {
  applySnapshot, applyZone, ownEntryJson, tickNetClocks, WIRE_CFG, SEAT_OWN_ROWS,
  type StateSnapshot, type ZoneMsg,
} from '../src/net/snapshot';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' : ' + detail : ''}`);
  if (!ok) failed++;
};
const info = (line: string): void => console.log(`INFO  ${line}`);
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const DT = 1 / SHARD_CFG.tickHz;
async function runTicks(host: ShardHost, n: number): Promise<void> {
  for (let i = 0; i < n; i++) { host.tick(DT); await yieldIO(); }
}
async function waitFor(cond: () => boolean, host: ShardHost, maxTicks: number): Promise<boolean> {
  for (let i = 0; i < maxTicks; i++) {
    if (cond()) return true;
    host.tick(DT);
    await yieldIO();
  }
  return cond();
}
const bytes = (x: unknown): number => Buffer.byteLength(JSON.stringify(x));
/** THE OWN ENTRY's per-socket view, built here by hand (independent of snapshot.ts): every
 *  other seat's own rows struck, and the meta map holding `mine`'s build alone or no key. */
function viewOf(s: StateSnapshot, mine: string): StateSnapshot {
  const c = JSON.parse(JSON.stringify(s)) as StateSnapshot;
  for (const [id, e] of Object.entries(c.seats)) if (id !== mine) for (const k of SEAT_OWN_ROWS) delete e[k];
  if (c.seatMeta !== undefined) c.seatMeta = c.seatMeta[mine] ? { [mine]: c.seatMeta[mine] } : undefined;
  return c;
}

const host = new ShardHost({ seed: 0x3e7e5, saveDir: null, open: true, log: () => { /* quiet */ } });
await host.ready();
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
const w = host.world;
const seatOf = (id: string): Seat => w.seats.find(s => s.id === id)!;
// The host's own snapshot objects (the shared body, before THE OWN ENTRY splits it per socket).
const sent: StateSnapshot[] = [];
{
  const send = host.net.sendStateTo.bind(host.net); // THE WIRE PER UNIT (shard M1): each unit's snapshot rides sendStateTo
  host.net.sendStateTo = (s: StateSnapshot, ids: Iterable<string>): void => { sent.push(s); send(s, ids); };
}

interface Client { c: WsTransport; id: string; got: StateSnapshot[]; zones: ZoneMsg[] }
async function join(name: string): Promise<Client> {
  const c = new WsTransport();
  const got: StateSnapshot[] = [], zones: ZoneMsg[] = [];
  c.onState(s => { got.push(s); });
  c.onZone(z => { zones.push(z); });
  const welcome = await c.connect(url, { name, classId: 'warrior' });
  await waitFor(() => w.seats.some(s => s.id === welcome.self), host, 60);
  return { c, id: welcome.self, got, zones };
}
const A = await join('Aster'), B = await join('Bryn');
await runTicks(host, 6);
const seatA = seatOf(A.id), seatB = seatOf(B.id);
// Two heroes a little apart in the hearth's open ground, fed and unhurried.
seatB.actor.pos.x = seatA.actor.pos.x + 140; seatB.actor.pos.y = seatA.actor.pos.y;
const feed = (a: Actor): void => { a.sheet.setBase('mana', 5000); a.fillResources(); };
feed(seatA.actor); feed(seatB.actor);
const at = (a: Actor, dx: number, dy = 0): { x: number; y: number } => ({ x: a.pos.x + dx, y: a.pos.y + dy });
const cast = (seat: Seat, id: string, aim: { x: number; y: number }): boolean => {
  feed(seat.actor);
  seat.actor.useLock = 0;
  return w.useSkill(seat.actor, makeSkillInstance(SKILLS[id], 1, 0), aim, false);
};
const since = (cl: Client, n: number): StateSnapshot[] => cl.got.slice(n);

// ============================================ F + G: the quiet stretch ==
// Nothing to show: no ground telegraph, no flight, no clock. The snapshot carries the
// pre-pass shape key for key, and the shelf rides only its beat.
const PRE_TOP = new Set(['satellites', 'guardArts', 'satelliteFlights', 'auroras', 'guardians', 'creepers',
  'magicPackEffects', 'grantedPockets', 'tick', 'time', 'zoneId', 'arena', 'seats', 'parties', 'pings', 'seatMeta',
  'vendor', 'vendorRestockAt', 'vendorCap', 'memoryAccess', 'vendorTradeOpen', 'vendorGemsOpen', 'bagBoard',
  'containerBoards', 'actors', 'projectiles', 'tethers', 'drops', 'townPortalViews', 'orbs', 'texts', 'no', 'pfd',
  'flashes', 'recoveryCues', 'ec', 'deathBursts', 'doors', 'hollows', 'annexes', 'wells', 'titans', 'gloom',
  'laneArm', 'laneOnce', 'trapState', 'lt', 'fell', 'ev', 'dwf']);
const PRE_SEAT = new Set(['pos', 'life', 'maxLife', 'mana', 'maxMana', 'es', 'maxEs', 'dead', 'downed', 'seq', 'rooted', 'slippery', 'survival']);
let quietBytes = 0, beatBytes = 0;
{
  const n0 = A.got.length;
  await runTicks(host, 3 * (WIRE_CFG.vendorBeat * 2 + 4));
  const quiet = since(A, n0);
  const strays = quiet.flatMap(s => Object.keys(s).filter(k => !PRE_TOP.has(k)));
  // THE COUNTERS AND THE JOURNAL: a held journal (the world's own quests) rides its beat in a quiet
  // stretch, as the shelf and the account view ride theirs; on no other snapshot.
  const seatStrays = quiet.flatMap(s => Object.values(s.seats).flatMap(e => Object.keys(e)
    .filter(k => !PRE_SEAT.has(k) && !(k === 'jn' && s.tick % JOURNAL_WIRE_CFG.beat === 1))));
  check('F shape: a quiet snapshot is the pre-pass shape (no zones row, no new seat rows)',
    quiet.length >= WIRE_CFG.vendorBeat * 2 && strays.length === 0 && seatStrays.length === 0 && quiet.every(s => s.zones === undefined),
    `${quiet.length} snapshots; strays ${JSON.stringify([...new Set([...strays, ...seatStrays])])}`);
  check('F shape: no flight, no band, no owned float rides a quiet snapshot',
    quiet.every(s => s.projectiles.length === 0 && s.tethers.length === 0 && s.texts.every(t => t.o === undefined)));
  const withShelf = quiet.filter(s => s.vendor !== undefined);
  check('G beat: in a quiet stretch the shelf rides only the beat (tick % vendorBeat === 1)',
    withShelf.length >= 2 && withShelf.every(s => s.tick % WIRE_CFG.vendorBeat === 1)
      && quiet.filter(s => s.tick % WIRE_CFG.vendorBeat === 1).every(s => s.vendor !== undefined),
    `${withShelf.length} of ${quiet.length} carried it, at ticks ${withShelf.map(s => s.tick).join(',')}`);
  check('G beat: the three vendor rows ride together', quiet.every(s => (s.vendor === undefined) === (s.vendorRestockAt === undefined)
    && (s.vendor === undefined) === (s.vendorCap === undefined)));
  const plain = quiet.find(s => s.vendor === undefined && s.memoryAccess === undefined);
  const beat = withShelf[0];
  quietBytes = plain ? bytes(plain) : 0;
  beatBytes = beat ? bytes(beat) : 0;
  const shelfBytes = beat ? bytes({ vendor: beat.vendor, vendorRestockAt: beat.vendorRestockAt, vendorCap: beat.vendorCap }) : 0;
  info(`G bytes: a quiet snapshot ${quietBytes} B; the shelf rows ${shelfBytes} B (${beat?.vendor?.length ?? 0} wares) now ride 1 snapshot in ${WIRE_CFG.vendorBeat}, not all of them`);
}

// ============================================== A + D: the ground and the clocks ==
// The catalog's own delayed, lingering ground art (registry-picked, pitcher_spill first):
// cast on seat A's hero through world.useSkill; seat B lays another with its own cooldown.
const groundArts = Object.values(SKILLS).filter(d => {
  const g = d.delivery as { type: string; delay?: number; lingerDuration?: number; follow?: boolean; noImpact?: boolean; marker?: unknown; line?: unknown };
  return g.type === 'ground' && (g.delay ?? 0) >= 0.4 && (g.lingerDuration ?? 0) >= 1 && !g.follow && !g.noImpact && !g.marker && !g.line
    && d.cooldown >= 2 && !d.requirements;
}).sort((a, b) => (a.id === 'pitcher_spill' ? -1 : b.id === 'pitcher_spill' ? 1 : 0));
const artA = groundArts[0], artB = groundArts[1] ?? groundArts[0];
check('A setup: the catalog holds a delayed, lingering ground art', !!artA, artA ? `${artA.id} / ${artB.id}` : 'none');
// THE GAUGE on seat A's bar (the book and the bar, as a learned skill sits): a gauge art banked to 40%.
const gaugeDef = Object.values(SKILLS).find(d => d.gauge && d.gauge.need >= 10)!;
const gaugeInst = makeSkillInstance(gaugeDef, 1, 0);
{
  seatA.meta.knownSkills.set(gaugeDef.id, gaugeInst);
  const slot = seatA.actor.skills.findIndex(s => !s);
  seatA.actor.skills[slot < 0 ? seatA.actor.skills.length - 1 : slot] = gaugeInst;
  gaugeInst.state = { gauge: Math.round(gaugeDef.gauge!.need * 0.4) };
  w.markMetaDirty(seatA);
}
let zoneId = -1;
{
  const n0 = A.got.length, nb0 = B.got.length;
  const okA = cast(seatA, artA.id, at(seatA.actor, 0, -120));
  const okB = cast(seatB, artB.id, at(seatB.actor, 0, 120));
  check('A cast: both seats\' ground arts were accepted by useSkill', okA && okB, `${okA}/${okB}`);
  // Through the telegraph, the detonation, the linger and past it.
  const span = (((artA.delivery as { delay?: number }).delay ?? 1) + ((artA.delivery as { lingerDuration?: number }).lingerDuration ?? 3) + (artA.useTime ?? 1) + 1.5);
  await runTicks(host, Math.ceil(span * SHARD_CFG.tickHz));
  const seen = since(A, n0);
  const mine = seen.flatMap(s => (s.zones ?? []).filter(z => z.sk === artA.id && z.ci === seatA.actor.id).map(z => ({ s, z })));
  zoneId = mine[0]?.z.id ?? -1;
  const life = seen.map(s => (s.zones ?? []).find(z => z.id === zoneId));
  const fills = life.flatMap(z => (z && !z.ex && z.fill !== undefined ? [z.fill] : []));
  const firstLive = life.findIndex(z => !!z?.ex), lastSeen = life.map(z => !!z).lastIndexOf(true);
  check('A telegraph: the zone reaches the client with its countdown fill rising across snapshots',
    zoneId > 0 && fills.length >= 3 && fills.every((f, i) => i === 0 || f >= fills[i - 1]) && fills[fills.length - 1] > fills[0],
    `fills ${fills.slice(0, 4).join(',')}…${fills.slice(-2).join(',')}`);
  check('A explode: the same zone turns live (ex) and lingers as a field, its telegraph rows gone',
    firstLive > 0 && life.slice(firstLive, lastSeen + 1).every(z => !!z?.ex && z.fill === undefined), `live from snapshot ${firstLive} to ${lastSeen}`);
  check('A gone: once the field lapses its row is absent (absent = none stand)', lastSeen >= 0 && lastSeen < life.length - 3 && life.slice(lastSeen + 1).every(z => !z));
  const row = mine[0]?.z;
  check('A row: the painter\'s fields ride (pos, radius, color) with the hotbar\'s own (caster, skill)',
    !!row && row.r > 0 && typeof row.c === 'string' && row.p.length === 2 && row.sk === artA.id && row.ci === seatA.actor.id,
    JSON.stringify(row ?? null));
  // D: THE OWN ENTRY. A's cooldown row on A's own wire, B's on B's; neither crosses.
  const cdA = seen.flatMap(s => (s.seats[A.id]?.cd?.[artA.id] ? [s.seats[A.id].cd![artA.id]] : []));
  check('D cooldown: the own seat\'s cd row appears after the cast and counts down on the clock grid',
    cdA.length >= 5 && cdA[cdA.length - 1][0] < cdA[0][0] && cdA.every(([r, t]) => r > 0 && t >= r && Math.abs(r * 20 - Math.round(r * 20)) < 1e-6),
    `first ${JSON.stringify(cdA[0])}, last ${JSON.stringify(cdA[cdA.length - 1])} (${cdA.length} rows)`);
  const ggA = seen.map(s => s.seats[A.id]?.gg?.[gaugeDef.id]).find(Boolean);
  check('D gauge: the own seat\'s gg row reports the gauge\'s fill, lock and readiness',
    !!ggA && Math.abs(ggA[0] - 0.4) < 0.011 && ggA[1] === 0 && ggA[2] === (gaugeReady(gaugeInst, seatA.actor.gaugeEff(gaugeInst)!, gaugeDef.gauge) ? 1 : 0),
    `${gaugeDef.id} ${JSON.stringify(ggA ?? null)}`);
  const seenB = since(B, nb0);
  const hostSide = sent.slice(-seen.length).some(s => !!s.seats[B.id]?.cd && !!s.seats[A.id]?.cd);
  check('D own entry: the host held both seats\' clocks, yet A never hears B\'s rows nor B A\'s',
    hostSide && seen.every(s => SEAT_OWN_ROWS.every(k => s.seats[B.id]?.[k] === undefined))
      && seenB.every(s => SEAT_OWN_ROWS.every(k => s.seats[A.id]?.[k] === undefined))
      && seenB.some(s => !!s.seats[B.id]?.cd?.[artB.id]),
    `A heard B's rows in ${seen.filter(s => s.seats[B.id]?.cd).length}, B heard A's in ${seenB.filter(s => s.seats[A.id]?.cd || s.seats[A.id]?.gg).length}`);
  // The split itself, against a plain stringify: each seat's frame is the snapshot with every
  // OTHER seat's own rows struck; a seat that carries none takes the shared bare frame.
  const both = sent.slice(-seen.length).find(s => !!s.seats[B.id]?.cd && !!s.seats[A.id]?.cd)!;
  const split = ownEntryJson(both)!;
  const expect = (mine: string): string => JSON.stringify(viewOf(both, mine));
  check('D own entry: the spliced frames equal a plain stringify of each seat\'s view, and the bare frame strikes them all',
    !!both && split.forSeat(A.id) === expect(A.id) && split.forSeat(B.id) === expect(B.id) && split.forSeat('p99') === null
      && split.bare === expect('p99') && ownEntryJson({ ...both, seats: JSON.parse(expect('p99')).seats, seatMeta: undefined }) === null);
}

// ===================================================== B: the dive's landing ring ==
{
  const dive = Object.values(SKILLS).find(d => d.delivery.type === 'leap' && (d.delivery as { telegraph?: unknown }).telegraph && !d.requirements);
  check('B setup: the catalog holds a telegraphed leap', !!dive, dive?.id ?? 'none');
  const n0 = A.got.length;
  const aim = at(seatA.actor, 220, 0);
  const ok = !!dive && cast(seatA, dive.id, aim);
  let held: NonNullable<StateSnapshot['actors'][number]['leap']> | undefined;
  await waitFor(() => !!seatA.actor.leap, host, 90);
  const L = seatA.actor.leap;
  await runTicks(host, Math.ceil(((dive?.delivery as { airTime?: number })?.airTime ?? 1) * SHARD_CFG.tickHz) + 12);
  const rows = since(A, n0).map(s => s.actors.find(a => a.seat === A.id)?.leap).filter(Boolean);
  held = rows.find(r => r!.telegraph !== undefined);
  check('B leap: while the dive stands its row carries dest, radius and the ring\'s color',
    ok && !!L?.telegraph && !!held && !!held.dest && Math.abs(held.dest[0] - L.dest.x) < 1 && Math.abs(held.dest[1] - L.dest.y) < 1
      && held.radius === Math.round(L.radius * 10) / 10 && held.telegraph === L.telegraph.color,
    held ? JSON.stringify(held) : `cast ${ok}, rows ${rows.length}`);
  check('B leap: the ring rides every snapshot of the flight, and none after it lands',
    rows.length >= 3 && rows.every(r => r!.telegraph !== undefined) && !seatA.actor.leap
      && since(A, n0).slice(-3).every(s => !s.actors.find(a => a.seat === A.id)?.leap));
}

// ========================================================= C: a flight's identity ==
{
  const bolt = Object.values(SKILLS).find(d => {
    const p = d.delivery as { type: string; speed?: number; range?: number; homing?: number; trajectory?: unknown; accel?: number; count?: number; spreadDeg?: number; explode?: unknown; pierce?: number };
    return p.type === 'projectile' && (p.speed ?? 0) >= 300 && (p.range ?? 0) >= 450 && !p.homing && !p.trajectory && !p.accel
      && !p.count && !p.spreadDeg && !p.explode && !p.pierce && !d.requirements && d.cooldown === 0;
  })!;
  // Loosed toward open ground (the hearth's walls stop some bearings early): bearing by
  // bearing until the flights have crossed enough consecutive snapshots.
  const pairs: { d: number; vErr: number; same: boolean }[] = [];
  const flight = Math.ceil((((bolt.delivery as { range: number }).range / (bolt.delivery as { speed: number }).speed) + (bolt.useTime ?? 0.5) + 0.3) * SHARD_CFG.tickHz);
  let ok = true;
  for (const [dx, dy] of [[0, 600], [600, 0], [-600, 0], [0, -600]]) {
    if (pairs.length >= 6) break;
    const n0 = A.got.length;
    ok = cast(seatA, bolt.id, at(seatA.actor, dx, dy)) && ok;
    await runTicks(host, flight);
    const seen = since(A, n0).filter(s => s.projectiles.length);
    for (let i = 1; i < seen.length; i++) {
      for (const p2 of seen[i].projectiles) {
        const p1 = seen[i - 1].projectiles.find(p => p.id === p2.id);
        if (!p1 || !p2.v) continue;
        const dt = seen[i].time - seen[i - 1].time;
        const vx = (p2.p[0] - p1.p[0]) / dt, vy = (p2.p[1] - p1.p[1]) / dt;
        pairs.push({ d: Math.hypot(p2.p[0] - p1.p[0], p2.p[1] - p1.p[1]), vErr: Math.hypot(p2.v[0] - vx, p2.v[1] - vy), same: !!p1.v && Math.hypot(p1.v[0] - p2.v[0], p1.v[1] - p2.v[1]) < 2 });
      }
    }
  }
  check('C flight: a projectile keeps one wire id across consecutive snapshots', ok && pairs.length >= 3 && pairs.every(p => p.d > 1),
    `${bolt.id}: ${pairs.length} id-matched pairs`);
  check('C flight: its v is its displacement over the snapshot interval (px/s, the straight flight\'s own speed)',
    pairs.length >= 3 && pairs.every(p => p.vErr < 2 && p.same), `worst error ${Math.max(...pairs.map(p => p.vErr)).toFixed(2)} px/s`);
}

// ================================================== E: whose number is it ==
{
  // A rooted, deep-lived foe (the probe_shard mint) at arm's length from A (no wall between);
  // A's own bolt strikes it.
  const foe = w.createMonster('zombie', 2, 'enemy');
  foe.pos.x = seatA.actor.pos.x + seatA.actor.radius + 30; foe.pos.y = seatA.actor.pos.y;
  if (!w.actors.includes(foe)) w.actors.push(foe);
  foe.sheet.setBase('life', 99999); foe.fillResources(); foe.sheet.setBase('moveSpeed', 0);
  const bolt = SKILLS['skeletal_fire_bolt'] ?? Object.values(SKILLS).find(d => d.delivery.type === 'projectile' && !d.requirements && d.cooldown === 0)!;
  const n0 = A.got.length;
  w.text(seatA.actor.pos, 'a quiet word', '#cfcfcf', 12, 'gains');
  const castOk = cast(seatA, bolt.id, foe.pos);
  const struck = castOk && await waitFor(() => since(A, n0).some(s => s.texts.some(t => t.k === 'dmg' && t.o === A.id)), host, 360);
  const texts = since(A, n0).flatMap(s => s.texts);
  check('E owner: the struck foe\'s damage number carries o = the striking seat', struck,
    `${bolt.id}: ${JSON.stringify(texts.filter(t => t.k === 'dmg').slice(0, 2))}`);
  check('E owner: a non-combat float carries no owner', texts.some(t => t.text === 'a quiet word' && t.o === undefined));
  check('E owner: no number of A\'s blow names any other seat', texts.filter(t => t.k === 'dmg').every(t => t.o === A.id || t.o === undefined));
  check('E owner: the floatOwners dial keeps all, the party\'s, or the viewer\'s own numbers',
    floatOwnerShown('all', 'p1', 'p2', () => false) && !floatOwnerShown('mine', 'p1', 'p2', () => true)
      && floatOwnerShown('mine', 'p1', 'p1', () => false) && floatOwnerShown('party', 'p1', 'p2', () => true)
      && !floatOwnerShown('party', 'p1', 'p2', () => false) && floatOwnerShown('mine', 'p1', undefined, () => false)
      && floatOwnerShown(undefined, 'p1', 'p2', () => false));
  w.actors.splice(w.actors.indexOf(foe), 1);
}

// ======================================== G: the shelf on a change ==
{
  // A purchase at the counter (the real buyVendorGem: Brandt's reach, the trade gate, the
  // price, the bag) ships the shelf on the very next snapshot, off the beat.
  const smith = w.actors.find(a => (w as unknown as { hasNpcRole(a: Actor, r: string): boolean }).hasNpcRole(a, 'vendor'));
  for (const id of Object.keys(seatA.meta.essences)) seatA.meta.essences[id as keyof typeof seatA.meta.essences] = 99999;
  // Stand A at the counter: the first spot around Brandt the dwell itself admits (nearSmith).
  if (smith) {
    seatA.actor.tier = smith.tier;
    search: for (let r = smith.radius + seatA.actor.radius + 2; r < 160; r += 6) {
      for (let k = 0; k < 16; k++) {
        seatA.actor.pos.x = smith.pos.x + Math.cos(k * Math.PI / 8) * r; seatA.actor.pos.y = smith.pos.y + Math.sin(k * Math.PI / 8) * r;
        if (w.nearSmith(seatA)) break search;
      }
    }
  }
  // Settle onto a beat-free stretch, then buy between beats.
  await waitFor(() => (A.got.at(-1)?.tick ?? 0) % WIRE_CFG.vendorBeat === 6, host, 200);
  const n0 = A.got.length, wares = w.vendorStock.length;
  const bought = w.vendorStock.length > 0 && w.buyVendorGem(0, seatA);
  await runTicks(host, 6);
  const next = since(A, n0)[0];
  check('G change: a purchase ships the shelf on the next snapshot, off the beat',
    bought && !!next && next.tick % WIRE_CFG.vendorBeat !== 1 && next.vendor?.length === wares - 1,
    `bought ${bought} (smith ${!!smith}, near ${w.nearSmith(seatA)}), next tick ${next?.tick}, wares ${wares} -> ${next?.vendor?.length}`);
  const after = since(A, n0 + 1).filter(s => s.tick % WIRE_CFG.vendorBeat !== 1);
  check('G change: and then holds its tongue until the beat', after.length >= 1 && after.every(s => s.vendor === undefined));
  // The counter's own restock (the beat law's function) re-arms the shelf: it ships next.
  await waitFor(() => (A.got.at(-1)?.tick ?? 0) % WIRE_CFG.vendorBeat === 9, host, 200);
  const n1 = A.got.length, mark = w.vendorRestockAt;
  w.restockVendor();
  await runTicks(host, 6);
  const re = since(A, n1)[0];
  check('G restock: a restock ships the shelf on the next snapshot (the new mark with it)',
    !!re && re.vendor !== undefined && re.vendorRestockAt === w.vendorRestockAt && re.tick % WIRE_CFG.vendorBeat !== 1,
    `mark ${mark} -> ${w.vendorRestockAt}, next tick ${re?.tick}`);
  // The beat re-ships an unchanged shelf, so a client that missed a change heals.
  await waitFor(() => (A.got.at(-1)?.tick ?? 0) % WIRE_CFG.vendorBeat === 1, host, 200);
  const beat = A.got.at(-1)!;
  check('G heal: the beat re-ships the unchanged shelf', beat.vendor !== undefined && JSON.stringify(beat.vendor) === JSON.stringify(re?.vendor));
}

// ===================================================== H: the client's stubs ==
// A render shell (the client's world: no sim) applies what client A received.
{
  const acct = makeAccount();
  const shell = new World(acct, Object.freeze(buildManifest(acct, w.manifest.seed)));
  shell.createPlayer(CLASSES.find(c => c.id === 'warrior') ?? CLASSES[0], { startingCompanions: false, startingFlasks: false });
  shell.clientSeatId = A.id;
  applyZone(shell, A.zones.at(-1)!);
  const got = A.got;
  const tele = got.find(s => s.zones?.some(z => z.id === zoneId && !z.ex));
  const live = got.find(s => s.zones?.some(z => z.id === zoneId && z.ex));
  if (tele) applySnapshot(shell, tele);
  const tz = tele?.zones?.find(z => z.id === zoneId);
  const ts = shell.zones.find(z => z.inst.def.id === tz?.sk && !z.exploded);
  check('H zones: a telegraph row stands as a render stub (the countdown on the painter\'s own clock)',
    !!tz && !!ts && Math.abs(ts.pos.x - tz.p[0]) < 0.01 && ts.radius === tz.r && Math.abs(ts.delay - (1 - (tz.fill ?? 0))) < 1e-9 && ts.caster === shell.player,
    tz ? `fill ${tz.fill}` : 'no telegraph row');
  if (live) applySnapshot(shell, live);
  check('H zones: the live row is a lingering field; a snapshot without the row clears it',
    shell.zones.some(z => z.exploded && z.linger > 0) && (applySnapshot(shell, got.at(-1)!), shell.zones.length === (got.at(-1)!.zones?.length ?? 0)));
  // THE OWN CLOCKS: a new snapshot anchors, tickNetClocks runs them down, a re-apply of the
  // same snapshot never re-anchors, the next snapshot does.
  const cdi = got.findIndex(s => !!s.seats[A.id]?.cd);
  const s1 = got[cdi];
  const [id1, row1] = s1 ? Object.entries(s1.seats[A.id].cd!)[0] : ['', [0, 0] as [number, number]];
  const s2 = got.slice(cdi + 1).find(s => !!s.seats[A.id]?.cd?.[id1]);
  if (s1) applySnapshot(shell, s1);
  const anchored = shell.player.cooldowns.get(id1), total = shell.player.cooldownTotals.get(id1);
  tickNetClocks(shell, 0.2);
  const ran = shell.player.cooldowns.get(id1) ?? -1;
  if (s1) applySnapshot(shell, s1);
  const held = shell.player.cooldowns.get(id1) ?? -1;
  if (s2) applySnapshot(shell, s2);
  const re = shell.player.cooldowns.get(id1);
  check('H clocks: the own cooldown anchors to the row, runs down locally, re-anchors only on a NEW snapshot',
    anchored === row1[0] && total === row1[1] && Math.abs(anchored - ran - 0.2 * shell.player.sheet.get('cooldownRecovery')) < 1e-9
      && held === ran && re === s2?.seats[A.id].cd?.[id1]?.[0],
    `${id1}: anchor ${anchored}/${total}, ran ${ran.toFixed(3)}, same snapshot ${held.toFixed(3)}, next ${re}`);
  // THE GAUGE: once the bar carries the gauge art (seatMeta), its bank reads the host's.
  const gs = got.find(s => s.seatMeta?.[A.id]?.bar.includes(gaugeDef.id) && s.seats[A.id]?.gg?.[gaugeDef.id]);
  if (gs) applySnapshot(shell, gs);
  const gi = shell.player.skills.find(s => s?.def.id === gaugeDef.id);
  const geff = gi ? shell.player.gaugeEff(gi)! : null;
  check('H gauge: the bar\'s own instance wears the host\'s bank (fill, readiness, open)',
    !!gi && !!geff && Math.abs(gaugeFill(gi) / geff.need - gs!.seats[A.id].gg![gaugeDef.id][0]) < 1e-9
      && gaugeReady(gi, geff, gaugeDef.gauge) === (gs!.seats[A.id].gg![gaugeDef.id][2] === 1) && !gi.state?.gaugeLock,
    gi ? `${gaugeDef.id} bank ${gaugeFill(gi)} of ${geff?.need}` : 'the gauge art never reached the bar');
  // A FLIGHT: glides by id between snapshots, flies on past the newest one (capped), and the
  // next window resumes from where it flew: forward when the wire is ahead of it, held (never
  // backward) when it flew on past where the next snapshot found it (THE FORWARD LAW).
  const fi = got.findIndex((s, i) => i > 0 && s.projectiles.some(p => got[i - 1].projectiles.some(q => q.id === p.id)) && !!got[i + 1]?.projectiles.length);
  const sa = got[fi - 1], sb = got[fi], sc = got[fi + 1];
  const pid = sb?.projectiles.find(p => sa.projectiles.some(q => q.id === p.id) && sc?.projectiles.some(q => q.id === p.id))?.id;
  if (pid !== undefined) {
    const pa = sa.projectiles.find(p => p.id === pid)!, pb = sb.projectiles.find(p => p.id === pid)!, pc = sc.projectiles.find(p => p.id === pid)!;
    const pos = (s: StateSnapshot): { x: number; y: number } => ({ ...shell.projectiles[s.projectiles.findIndex(p => p.id === pid)].pos });
    const dist = (a: { x: number; y: number }, x: number, y: number): number => Math.hypot(a.x - x, a.y - y);
    const cap = WIRE_CFG.eyes.projAheadSec, gap = sc.time - sb.time;
    applySnapshot(shell, sa);
    applySnapshot(shell, sb, sa, 0.5);
    const mid = pos(sb);
    applySnapshot(shell, sb, sa, 1, gap * 0.4);
    const on = pos(sb);
    applySnapshot(shell, sc, sb, 0.5);
    const fwd = pos(sc);
    // A second window, late past the cap: flies on to the cap, then holds when the next row lands behind it.
    applySnapshot(shell, sb, sa, 1, 5);
    const capped = pos(sb);
    applySnapshot(shell, sc, sb, 0.3);
    const held = pos(sc);
    check('H flight: the client glides a flight by id and flies it on along v past the newest snapshot (capped)',
      dist(mid, (pa.p[0] + pb.p[0]) / 2, (pa.p[1] + pb.p[1]) / 2) < 0.01 && dist(on, pb.p[0] + pb.v![0] * gap * 0.4, pb.p[1] + pb.v![1] * gap * 0.4) < 0.01
        && dist(capped, pb.p[0] + pb.v![0] * cap, pb.p[1] + pb.v![1] * cap) < 0.01,
      `mid ${mid.x.toFixed(1)},${mid.y.toFixed(1)} on ${on.x.toFixed(1)},${on.y.toFixed(1)} capped ${capped.x.toFixed(1)},${capped.y.toFixed(1)}`);
    check('H flight: the next window resumes from where it flew: on toward the wire, never back against v',
      dist(fwd, on.x + (pc.p[0] - on.x) * 0.5, on.y + (pc.p[1] - on.y) * 0.5) < 0.01 && dist(held, capped.x, capped.y) < 1e-9,
      `resumed ${fwd.x.toFixed(1)},${fwd.y.toFixed(1)}; held ${held.x.toFixed(1)},${held.y.toFixed(1)} (the next row ${pc.p[0]},${pc.p[1]})`);
  } else check('H flight: two consecutive snapshots shared a flight', false);
  // A BAND's ends ride the pooled bodies at draw time (here a synthetic row on a real snapshot).
  const last = got.at(-1)!;
  const ra = last.actors.find(a => a.seat === A.id)!, rb = last.actors.find(a => a.seat === B.id)!;
  applySnapshot(shell, { ...last, tethers: [{ ax: 1, ay: 2, bx: 3, by: 4, c: '#ffffff', w: 2, ai: ra.id, bi: rb.id }, { ax: 7, ay: 8, bx: 9, by: 10, c: '#ffffff', w: 2, ai: -5, bi: -6 }] });
  shell.player.pos.x += 37; // the prediction moves the own hero after the apply
  const t0 = shell.tethers[0], t1 = shell.tethers[1];
  check('H band: a band\'s ends follow the client\'s own (interpolated, predicted) bodies; coords stand in for an unknown end',
    t0.ax === shell.player.pos.x && t0.bx === rb.p[0] && t1.ax === 7 && t1.by === 10, `ax ${t0.ax} vs ${shell.player.pos.x}`);
  const owned = got.find(s => s.texts.some(t => t.o === A.id));
  if (owned) applySnapshot(shell, owned);
  check('H floats: a number\'s owner seat lands on the client\'s float', !!owned && shell.texts.some(t => t.seat === A.id));
}

// ===================================================== I: THE OWN META ==
// A seat's whole build (the book, bag, doll, wallets) is its own business: a socket hears its
// own seat's seatMeta and never another's, on a change and on the heartbeat, and a dormant
// seat that comes back hears its own on its first snapshot after the resume.
let resumed: WsTransport | null = null;
{
  const othersMeta = (cl: Client): number => cl.got.filter(s => s.seatMeta && Object.keys(s.seatMeta).some(id => id !== cl.id)).length;
  const ownMeta = (cl: Client, from: number): number => cl.got.slice(from).filter(s => !!s.seatMeta?.[cl.id]).length;
  // The beat: a quiet stretch past two heartbeats. The host's body holds every seat's build
  // on the beat; each socket hears its own.
  const nA = A.got.length, nB = B.got.length, nS = sent.length;
  await runTicks(host, Math.ceil(SHARD_CFG.metaHeartbeatSec * 2.2 * SHARD_CFG.tickHz));
  const beatsHost = sent.slice(nS).filter(s => !!s.seatMeta?.[A.id] && !!s.seatMeta?.[B.id]).length;
  check('I beat: the heartbeat still ships each seat its own build (twice in 2.2 beats), the host body holding both',
    beatsHost >= 2 && ownMeta(A, nA) >= 2 && ownMeta(B, nB) >= 2, `host ${beatsHost}, A ${ownMeta(A, nA)}, B ${ownMeta(B, nB)}`);
  check('I own: across the whole run neither client ever heard the other\'s build',
    othersMeta(A) === 0 && othersMeta(B) === 0 && A.got.some(s => !!s.seatMeta) && B.got.some(s => !!s.seatMeta),
    `A heard another's in ${othersMeta(A)}, B in ${othersMeta(B)}`);
  // The change: just past a beat, A's wallet moves (the dirty-flag beat). A's next snapshot
  // carries its build; B's, for the same tick, carries no meta at all.
  await waitFor(() => !!A.got.at(-1)?.seatMeta?.[A.id], host, 200);
  await runTicks(host, 3);
  const ess = Object.keys(seatA.meta.essences)[0] as keyof typeof seatA.meta.essences;
  const purse = seatA.meta.essences[ess] + 7;
  seatA.meta.essences[ess] = purse;
  w.markMetaDirty(seatA);
  const cA = A.got.length, cB = B.got.length;
  await waitFor(() => A.got.length > cA && B.got.length > cB, host, 12);
  const nextA = A.got[cA], nextB = B.got.find((s, i) => i >= cB && s.tick === nextA?.tick);
  check('I change: a changed build ships on the next snapshot, to its own socket alone',
    !!nextA?.seatMeta?.[A.id] && nextA.seatMeta[A.id].ess?.[ess] === purse && Object.keys(nextA.seatMeta).length === 1
      && !!nextB && nextB.seatMeta === undefined,
    `tick ${nextA?.tick}: A ${JSON.stringify(Object.keys(nextA?.seatMeta ?? {}))}, B ${nextB?.seatMeta === undefined ? 'none' : JSON.stringify(Object.keys(nextB.seatMeta))}`);
  // The resume: B wills a step (its grace is over), its socket is cut raw (THE DORMANT SEAT),
  // and a new transport takes the seat back with THE RECONNECT TOKEN.
  for (let i = 0; i < 6; i++) {
    B.c.sendInput(B.id, { dx: 0, dy: 1, aim: at(seatB.actor, 0, 60), held: [], edge: [], seq: 500 + i });
    await runTicks(host, 1);
  }
  const tok = shardResumeFor(url);
  (host.net as unknown as { bySeat: Map<string, { sock: { destroy(): void } }> }).bySeat.get(B.id)?.sock.destroy();
  const dormant = await waitFor(() => host.net.isDormant(B.id), host, 60);
  const firsts: StateSnapshot[] = [];
  resumed = new WsTransport();
  resumed.onState(s => { firsts.push(s); });
  const back = await resumed.connect(url, { name: 'Bryn', classId: 'warrior' }, undefined, tok ?? undefined);
  await waitFor(() => firsts.length > 0, host, 30);
  const first = firsts[0];
  check('I resume: a dormant seat taken back hears its own build on its first snapshot, and only its own',
    dormant && tok?.seat === B.id && back.self === B.id && !!back.resumed && !!first?.seatMeta?.[B.id] && Object.keys(first.seatMeta!).length === 1,
    `dormant ${dormant}, token seat ${tok?.seat}, resumed ${back.resumed}, first snapshot meta ${JSON.stringify(Object.keys(first?.seatMeta ?? {}))}`);
  // The split against a plain stringify of each socket's view, on a beat body (both builds).
  const beat = sent.slice(nS).find(s => !!s.seatMeta?.[A.id] && !!s.seatMeta?.[B.id])!;
  const cut = ownEntryJson(beat)!;
  check('I view: on a beat body each spliced frame is its socket\'s view (its own build, its own rows), the bare frame neither',
    !!beat && cut.forSeat(A.id) === JSON.stringify(viewOf(beat, A.id)) && cut.forSeat(B.id) === JSON.stringify(viewOf(beat, B.id))
      && cut.forSeat('p99') === null && cut.bare === JSON.stringify(viewOf(beat, 'p99')) && !cut.bare.includes('"seatMeta"'));
  const metaBytes = beat ? bytes(beat.seatMeta) : 0;
  info(`bytes: a beat body's seatMeta is ${metaBytes} B for ${Object.keys(beat?.seatMeta ?? {}).length} seats; each socket now hears its own (~${Math.round(metaBytes / Math.max(1, Object.keys(beat?.seatMeta ?? {}).length))} B), not all of them`);
}

// ================================================== the bytes, measured ==
{
  // The host's own body (before THE OWN ENTRY splits it), one serialize each way: as shipped,
  // and with every new row struck (what this snapshot weighed before THE WIRE'S EYES).
  const strip = (s: StateSnapshot): StateSnapshot => {
    const c = JSON.parse(JSON.stringify(s)) as StateSnapshot;
    delete c.zones;
    for (const e of Object.values(c.seats)) { delete e.cd; delete e.gg; }
    for (const p of c.projectiles) { delete p.id; delete p.v; }
    for (const t of c.tethers) { delete t.ai; delete t.bi; }
    for (const t of c.texts) delete t.o;
    for (const a of c.actors) if (a.leap) { delete a.leap.dest; delete a.leap.radius; delete a.leap.telegraph; }
    return c;
  };
  const busy = sent.filter(s => s.zones?.length && Object.values(s.seats).some(e => e.cd));
  const pick = busy.sort((x, y) => bytes(y) - bytes(x))[0];
  if (pick) {
    const own = bytes(pick), was = bytes(strip(pick));
    const rows = { zones: bytes(pick.zones), cd: bytes(Object.values(pick.seats).map(e => e.cd ?? null)), gg: bytes(Object.values(pick.seats).map(e => e.gg ?? null)) };
    info(`bytes: the busiest snapshot ${own} B with the new rows, ${was} B without (+${own - was} B: ${pick.zones!.length} zones ${rows.zones} B, clocks ${rows.cd + rows.gg} B, flights/bands/floats the rest)`);
  }
  const quietSent = sent.find(s => !s.zones && !s.projectiles.length && Object.values(s.seats).every(e => !e.cd && !e.gg) && s.vendor === undefined && s.memoryAccess === undefined);
  if (quietSent) info(`bytes: a quiet snapshot ${bytes(quietSent)} B with the new rows, ${bytes(strip(quietSent))} B without (byte-identical: ${bytes(quietSent) === bytes(strip(quietSent))})`);
  const beatSent = sent.find(s => s.vendor !== undefined && s.tick > 1);
  if (beatSent) info(`bytes: the shelf on its beat costs ${bytes({ vendor: beatSent.vendor, vendorRestockAt: beatSent.vendorRestockAt, vendorCap: beatSent.vendorCap })} B (it rode every snapshot before: ${quietBytes} B quiet vs ${beatBytes} B on the beat)`);
  const aBytes = A.got.map(bytes), bBytes = B.got.map(bytes);
  info(`bytes: client frames A mean ${(aBytes.reduce((x, y) => x + y, 0) / aBytes.length).toFixed(0)} B, B mean ${(bBytes.reduce((x, y) => x + y, 0) / bBytes.length).toFixed(0)} B over ${aBytes.length}/${bBytes.length} snapshots`);
  check('F size: a quiet snapshot is byte-identical with and without the new rows', !!quietSent && bytes(quietSent) === bytes(strip(quietSent)));
}

for (const x of [A, B]) x.c.leave();
resumed?.leave();
await waitFor(() => w.seats.length === 1, host, 120);
await host.stop();
await new Promise(r => setTimeout(r, 600));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
