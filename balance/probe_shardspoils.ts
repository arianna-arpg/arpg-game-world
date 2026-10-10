// THE SPOILS' OWNER (charter card 27, RULED 2026-10-10: A as the default, a drop belongs to one
// player, with the FOUNDATION for B: a party sets its own drop rule; docs/engine/shard.md "THE
// SPOILS' OWNER"). The rig runs THE SOLO DIGEST first (before any host widens a process dial),
// then boots a classic shard with an open account, seats players over the wire and pins:
//   S  THE SOLO DIGEST: a seeded solo kill-and-pickup walk (every kill pays, half the spoils are
//      walked over, half stay lying for the zone's capture) prints the hash its walk printed at
//      shard-world fc661190, before the owner existed; no drop record, lying or captured, ever
//      carries `owner` or `freeAt`; and the same walk with a rule hook installed that stamps
//      nothing ('free') prints the same bytes;
//   K  THE KILLER'S DUE: a kill's drops wear the credited seat ('owner' forever: no free time);
//      a stranger standing on one is refused while the owner's touch takes it;
//   A  THE OWNER'S ABSENCE: a drop whose owner left the world is anyone's;
//   D  a discard wears its dropper beside droppedBy, and no other hand takes it;
//   L  THE PARTY'S RULE: the PartyRow carries the rule, its timer and the allocation (the ruled
//      defaults 'owner', 20 s, 'killer'); the leader alone sets it over the session wire (a
//      member hears 'not the leader', an unknown value 'no such rule', the ungrouped 'not a
//      member'); the panel's model reads it, live for the leader alone;
//   T  'timed': the drop is its owner's until freeAfterSec, then anyone's (a stranger takes it);
//   F  'free': nothing is stamped and a stranger takes it at once;
//   R  'rotate': successive kills deal round-robin among the members within THE NEAR LAW's
//      reach of the kill, never to one out of reach, and a member come into reach joins the turn;
//   W  THE WIRE: `DropW.o` / `fa` ride the hosted wire (and the shell ghosts another seat's held
//      drop), and never the co-op broadcast (serializeSnapshot alone, or a world with no rule).
import { ShardHost, SHARD_CFG, bootShardEngine } from '../server/shardHost';
import { PARTY_CFG } from '../server/party';
import { SHARD_WIRE_CFG } from '../server/shardTransport';
import { WsTransport } from '../src/net/ws';
import { serializeSnapshot, type StateSnapshot } from '../src/net/snapshot';
import type { SessionMsg } from '../src/net/transport';
import { SPOILS_CFG, adoptDropOwners, dropAlpha, stampDropOwners } from '../src/net/spoils';
import { partyPanelModel } from '../src/net/partyReads';
import { PARTY_WIRE_CFG } from '../src/net/partyWire';
import { World, type GemDrop, type Seat } from '../src/engine/world';
import { resetActorIdCounter } from '../src/engine/actor';
import { captureZoneContents } from '../src/engine/zonecontents';
import { DROP_CFG } from '../src/engine/loot';
import { rollItem } from '../src/engine/itemgen';
import { autoPlace } from '../src/engine/inventory';
import { makeAccount } from '../src/meta/account';
import { buildManifest } from '../src/packages/manifest';
import { CLASSES } from '../src/data/classes';
import { COOP_SCALING } from '../src/data/coop';
import { FORECHART_CFG } from '../src/world/forechart';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec, type Vec2 } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' : ' + detail : ''}`);
  if (!ok) failed++;
};

// =========================================================== S: THE SOLO DIGEST ==
// THE SPOILS-WALK DIGEST, computed at shard-world fc661190 (W10's base, before GemDrop wore an
// owner): the same seeded solo walk must print it after W10 (THE SOLO INVARIANT). It runs FIRST:
// a shard host widens THE NEAR LAW, which would deal the walk another world.
const SPOILS_WALK_HASH = '38e81367';
const SPOILS_WALK_SEED = 0x5b0115;
bootShardEngine();
function spoilsWalk(hook: boolean): { digest: string; hash: string; owned: number; minted: number; picked: number } {
  const radius0 = COOP_SCALING.shareRadius, budget0 = FORECHART_CFG.beatBudgetMs;
  const drop0 = { killGemChance: DROP_CFG.killGemChance, killItemChance: DROP_CFG.killItemChance, vestigeChance: DROP_CFG.vestigeChance };
  COOP_SCALING.shareRadius = 0; FORECHART_CFG.beatBudgetMs = Infinity; // a solo world, the pinned governor
  DROP_CFG.killGemChance = 1; DROP_CFG.killItemChance = 1; DROP_CFG.vestigeChance = 1; // every kill pays: the walk is about spoils
  const restore = seedGlobalRandom(SPOILS_WALK_SEED);
  const seeded = Math.random;
  let draws = 0;
  Math.random = () => { draws++; return seeded(); };
  try {
    resetActorIdCounter();
    const account = makeAccount();
    const manifest = buildManifest(account, SPOILS_WALK_SEED);
    for (const p of manifest.packages) p.enabled = false; // a QUIET expedition
    const w = new World(account, Object.freeze(manifest));
    w.createPlayer(CLASSES.find(c => c.id === 'warrior')!, { name: 'Walker', startingCompanions: false, startingFlasks: false });
    if (hook) (w as unknown as { dropRuleOf: unknown }).dropRuleOf = () => ({ rule: 'free', freeAfterSec: 20, allocation: 'killer' });
    const hero = w.player;
    hero.invulnerable = true;
    let owned = 0, minted = 0;
    const note = (): void => { for (const d of w.drops) if ('owner' in d || 'freeAt' in d) owned++; };
    const step = (secs: number): void => { for (let t = 0; t < secs; t += 1 / 60) { w.update(1 / 60); note(); } };
    const at0 = { x: hero.pos.x, y: hero.pos.y };
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const m = w.createMonster('zombie', 3, 'enemy');
      const p = w.clampPos(vec(at0.x + Math.cos(a) * 140, at0.y + Math.sin(a) * 140), m.radius);
      m.pos.x = p.x; m.pos.y = p.y;
      if (!w.actors.includes(m)) w.actors.push(m);
      const before = w.drops.length;
      w.kill(m, false, hero);
      minted += Math.max(0, w.drops.length - before);
      note();
      if (i % 2 === 0) for (const d of [...w.drops]) { hero.pos.x = d.pos.x; hero.pos.y = d.pos.y; step(0.25); }
      else step(0.25); // the odd kills' spoils stay lying: the capture carries them
    }
    step(1);
    const contents = captureZoneContents(w);
    for (const d of contents.drops) if ('owner' in d || 'freeAt' in d) owned++;
    const shape = (k: string, p: { x: number; y: number }): string => `${k}@${Math.round(p.x)},${Math.round(p.y)}`;
    const bag = w.meta.items.map(i => `${i.baseId}:${i.rarity}:${i.mem ? i.mem.length : 0}`).join(',');
    const digest = [
      `drops ${w.drops.map(d => shape(d.item.kind, d.pos)).join(',')}`,
      `kept ${JSON.stringify(contents.drops, (k, v) => (k === 'uid' ? undefined : v))}`,
      `bag ${bag}`, `ess ${JSON.stringify(w.meta.essences)}`, `vest ${JSON.stringify(w.meta.vestiges)}`,
      `minted ${minted}`, `hero ${Math.round(hero.pos.x)},${Math.round(hero.pos.y)}`,
      `actors ${w.actors.length}`, `draws ${draws}`, `t ${w.time.toFixed(2)}`,
    ].join(' | ');
    let h = 0x811c9dc5;
    for (let i = 0; i < digest.length; i++) { h ^= digest.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return { digest, hash: h.toString(16).padStart(8, '0'), owned, minted, picked: w.meta.items.length };
  } finally {
    Math.random = seeded; restore();
    COOP_SCALING.shareRadius = radius0; FORECHART_CFG.beatBudgetMs = budget0;
    Object.assign(DROP_CFG, drop0);
  }
}
{
  const plain = spoilsWalk(false);
  console.log(`INFO  the spoils walk: ${plain.hash} (${plain.minted} minted, ${plain.picked} carried)`);
  check('S solo: the seeded solo kill-and-pickup walk prints the digest its walk printed before W10 (THE SOLO INVARIANT)',
    plain.hash === SPOILS_WALK_HASH && plain.minted > 6, `${plain.hash} vs ${SPOILS_WALK_HASH}`);
  check('S solo: no solo drop record, lying or captured into the zone\'s memory, ever carries owner or freeAt', plain.owned === 0, `${plain.owned} owned`);
  const hooked = spoilsWalk(true);
  check('S solo: a rule hook that stamps nothing (\'free\') leaves the walk\'s bytes as they were', hooked.digest === plain.digest && hooked.owned === 0, hooked.hash);
}

// ===================================================================== the shard ==
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const DT = 1 / SHARD_CFG.tickHz;
const sec = (s: number): number => Math.ceil(s * SHARD_CFG.tickHz);
async function runTicks(n: number): Promise<void> { for (let i = 0; i < n; i++) { host.tick(DT); await yieldIO(); } }
async function waitFor(cond: () => boolean, maxTicks: number): Promise<boolean> {
  for (let i = 0; i < maxTicks; i++) { if (cond()) return true; host.tick(DT); await yieldIO(); }
  return cond();
}

SHARD_WIRE_CFG.maxPerIp = Number.POSITIVE_INFINITY; // every client of this rig arrives from one address
const host = new ShardHost({ seed: 0x5b0127, saveDir: null, open: true, log: () => { /* quiet */ } });
await host.ready();
const url = `ws://127.0.0.1:${await host.listen(0, '127.0.0.1')}`;
const w = host.world;
const seatOf = (id: string): Seat | undefined => w.seats.find(s => s.id === id);

interface Client { c: WsTransport; id: string; heard: SessionMsg[]; snaps: StateSnapshot[] }
async function join(name: string): Promise<Client> {
  const c = new WsTransport();
  const cl: Client = { c, id: '', heard: [], snaps: [] };
  c.onSession(m => { cl.heard.push(m); });
  c.onState(s => { cl.snaps.push(s); if (cl.snaps.length > 120) cl.snaps.splice(0, 60); });
  const welcome = await c.connect(url, { name, classId: 'warrior' });
  cl.id = welcome.self;
  await waitFor(() => !!seatOf(cl.id), 60);
  return cl;
}
const latest = (cl: Client): StateSnapshot | undefined => cl.snaps.at(-1);
const words = (cl: Client): string[] => cl.heard.flatMap(m => (m.t === 'partyWord' ? [m.word] : []));
const hearth = host.hearthSeat();
const anchor = w.clampPos(w.findFreeSpot(vec(hearth.x, hearth.y), 22) ?? vec(hearth.x, hearth.y), 18);
const place = (s: Seat, x: number, y: number): void => { const p = w.clampPos(vec(x, y), s.actor.radius); s.actor.pos.x = p.x; s.actor.pos.y = p.y; };
const at = (s: Seat, dx: number, dy = 0): void => place(s, anchor.x + dx, anchor.y + dy);
/** A kill credited to `killer`'s seat at a spot; every credited kill pays one gem (a Memory). */
function killFor(killer: Seat, spot: Vec2): GemDrop[] {
  const m = w.createMonster('zombie', 2, 'enemy');
  const p = w.clampPos(vec(spot.x, spot.y), m.radius);
  m.pos.x = p.x; m.pos.y = p.y;
  if (!w.actors.includes(m)) w.actors.push(m);
  const before = w.drops.length;
  w.kill(m, false, killer.actor);
  return w.drops.slice(before);
}
const lying = (d: GemDrop): boolean => w.drops.includes(d);
const bagCount = (s: Seat): number => s.meta.items.reduce((n, i) => n + (i.mem ? i.mem.length : 1), 0);
const drop0 = { killGemChance: DROP_CFG.killGemChance, killItemChance: DROP_CFG.killItemChance, vestigeChance: DROP_CFG.vestigeChance };
DROP_CFG.killGemChance = 1; DROP_CFG.killItemChance = 0; DROP_CFG.vestigeChance = 0; // one gem a kill: the rig reads whose it is
const spot = vec(anchor.x + 260, anchor.y);

const A = await join('Anvil'), B = await join('Bram'), C = await join('Cass');
await runTicks(3);
const a = seatOf(A.id)!, b = seatOf(B.id)!, c = seatOf(C.id)!;

// ============================================================ K: THE KILLER'S DUE ==
{
  at(a, -400); at(b, -400, 200); at(c, -400, -200);
  await runTicks(2);
  const got = killFor(a, spot);
  check('K stamp: a kill\'s drops wear the credited seat, its own forever (no free time)',
    got.length >= 1 && got.every(d => d.owner === A.id && d.freeAt === undefined), JSON.stringify(got.map(d => [d.owner, d.freeAt])));
  const d = got[0];
  place(c, d.pos.x, d.pos.y);
  await runTicks(20);
  check('K touch: a stranger standing on it is refused (THE TOUCH LAW)', !!d && lying(d) && w.dropHolder(d) === A.id);
  const before = bagCount(a);
  place(a, d.pos.x, d.pos.y);
  await waitFor(() => !lying(d), 30);
  check('K touch: the owner\'s touch takes it', !lying(d) && bagCount(a) > before, `${before} → ${bagCount(a)}`);
}

// ========================================================= A: THE OWNER'S ABSENCE ==
{
  const E = await join('Ebb');
  await runTicks(3);
  const e = seatOf(E.id)!;
  at(e, -400, 400); at(c, -400, -200);
  const got = killFor(e, spot);
  const d = got[0];
  check('A stamp: the drop wears its killer', !!d && d.owner === E.id);
  E.c.leave();
  await waitFor(() => !seatOf(E.id), 120);
  check('A absence: a drop whose owner left the world is anyone\'s', !!d && w.dropHolder(d) === undefined);
  const before = bagCount(c);
  place(c, d.pos.x, d.pos.y);
  await waitFor(() => !lying(d), 30);
  check('A absence: a stranger takes it', !lying(d) && bagCount(c) > before);
}

// ================================================================ D: THE DISCARD ==
{
  at(c, 300, 300); at(a, -400);
  await runTicks(2);
  const it = rollItem({ ilvl: 5, rarity: 'magic', category: 'boots' })!;
  autoPlace(c.meta.items, it);
  C.c.sendSession({ t: 'action', action: { t: 'dropItem', uid: it.uid } });
  await waitFor(() => w.drops.some(d => d.item.kind === 'gear' && d.item.item.uid === it.uid), 60);
  const d = w.drops.find(x => x.item.kind === 'gear' && x.item.item.uid === it.uid);
  check('D discard: a discard wears its dropper beside droppedBy', !!d && d.droppedBy === C.id && d.owner === C.id && d.freeAt === undefined,
    JSON.stringify(d && { by: d.droppedBy, owner: d.owner }));
  if (d) {
    place(a, d.pos.x, d.pos.y);
    await runTicks(sec(1.5)); // past its pickup grace
    check('D discard: another hand never takes it (THE TOUCH LAW, after the grace)', lying(d) && !a.meta.items.some(i => i.uid === it.uid));
    at(a, -400);
    await runTicks(2);
  }
}

// ============================================================ L: THE PARTY'S RULE ==
{
  check('L dials: the ruled defaults (owner, 20 s, the killer; the ungrouped read the shard\'s own)',
    PARTY_CFG.dropRule === 'owner' && PARTY_CFG.freeAfterSec === 20 && PARTY_CFG.allocation === 'killer'
    && SHARD_CFG.spoils.rule === 'owner' && SHARD_CFG.spoils.allocation === 'killer');
  C.c.sendSession({ t: 'party', op: 'rule', rule: 'free' });
  await waitFor(() => words(C).includes('not a member'), 60);
  check('L ungrouped: a word from a seat in no party is refused (\'not a member\')', words(C).includes('not a member'));
  A.c.sendSession({ t: 'party', op: 'invite', seat: B.id });
  await waitFor(() => B.heard.some(m => m.t === 'partyInvite'), 60);
  B.c.sendSession({ t: 'party', op: 'accept' });
  await waitFor(() => host.parties.partyOf(B.id)?.members.length === 2, 60);
  await runTicks(6);
  const row0 = (latest(B)?.parties ?? []).find(r => r.members.includes(B.id));
  check('L row: the PartyRow carries the rule, its timer and the allocation (the defaults)',
    !!row0 && row0.rule === 'owner' && row0.freeAfterSec === 20 && row0.allocation === 'killer', JSON.stringify(row0));
  B.c.sendSession({ t: 'party', op: 'rule', rule: 'timed' });
  await waitFor(() => words(B).includes('not the leader'), 60);
  check('L leader: a member\'s word is refused (\'not the leader\') and changes nothing',
    words(B).includes('not the leader') && host.parties.partyOf(A.id)?.dropRule === 'owner');
  A.c.sendSession({ t: 'party', op: 'rule', rule: 'loot-for-all' as unknown as 'free' });
  await waitFor(() => words(A).includes('no such rule'), 60);
  check('L leader: an unknown value is refused (\'no such rule\')', words(A).includes('no such rule') && host.parties.partyOf(A.id)?.dropRule === 'owner');
  A.c.sendSession({ t: 'party', op: 'rule', rule: 'timed' });
  await waitFor(() => host.parties.partyOf(A.id)?.dropRule === 'timed', 60);
  await runTicks(6);
  const row = (latest(B)?.parties ?? []).find(r => r.members.includes(B.id));
  check('L leader: the leader sets it; every member\'s row carries it', host.parties.partyOf(A.id)?.dropRule === 'timed' && row?.rule === 'timed', JSON.stringify(row));
  const model = (cl: Client) => partyPanelModel({ me: cl.id, at: null, bodies: [], peers: [], rows: latest(cl)?.parties ?? null, invites: [], word: null, radius: PARTY_WIRE_CFG.nearRadius });
  const ma = model(A).party?.spoils, mb = model(B).party?.spoils;
  check('L panel: the model reads the standing rule for every member, live for the leader alone',
    ma?.rule === 'timed' && ma.lead === true && mb?.rule === 'timed' && mb.lead === false && mb.freeAfterSec === 20, JSON.stringify({ ma, mb }));
}

// ===================================================================== T: 'timed' ==
const free0 = PARTY_CFG.freeAfterSec;
PARTY_CFG.freeAfterSec = 1.5; // the dial is pinned above; the law runs here at a short timer
{
  at(a, -400); at(b, -400, 200); at(c, -400, -200);
  await runTicks(2);
  const got = killFor(a, spot);
  const d = got[0];
  check('T stamp: under \'timed\' the drop is its owner\'s until freeAfterSec', !!d && d.owner === A.id && d.freeAt !== undefined
    && Math.abs(d.freeAt - (w.time + PARTY_CFG.freeAfterSec)) < 0.05, JSON.stringify(d && [d.owner, d.freeAt, w.time]));
  place(c, d.pos.x, d.pos.y);
  await runTicks(sec(0.5));
  check('T held: before its time a stranger is refused', lying(d) && w.dropHolder(d) === A.id);
  await runTicks(4);
  const row = latest(C)?.drops.find(r => Math.abs(r.p[0] - d.pos.x) < 1 && Math.abs(r.p[1] - d.pos.y) < 1);
  check('W wire: the held drop\'s row names its owner and its whole seconds until free, on the hosted wire',
    row?.o === A.id && row.fa === 1, JSON.stringify(row && { o: row.o, fa: row.fa }));
  const before = bagCount(c);
  await waitFor(() => !lying(d), sec(PARTY_CFG.freeAfterSec) + 30);
  check('T free: once its time runs out the stranger standing on it takes it', !lying(d) && bagCount(c) > before);
}
PARTY_CFG.freeAfterSec = free0;

// ====================================================================== F: 'free' ==
{
  A.c.sendSession({ t: 'party', op: 'rule', rule: 'free' });
  await waitFor(() => host.parties.partyOf(A.id)?.dropRule === 'free', 60);
  at(a, -400); at(c, -400, -200);
  const got = killFor(a, spot);
  check('F stamp: under \'free\' nothing is stamped at all', got.length >= 1 && got.every(d => d.owner === undefined && d.freeAt === undefined));
  const d = got[0];
  const before = bagCount(c);
  place(c, d.pos.x, d.pos.y);
  await waitFor(() => !lying(d), 30);
  check('F free: a stranger takes it at once', !lying(d) && bagCount(c) > before);
}

// ==================================================================== R: 'rotate' ==
{
  const D = await join('Dace');
  await runTicks(3);
  const dd = seatOf(D.id)!;
  A.c.sendSession({ t: 'party', op: 'invite', seat: D.id });
  await waitFor(() => D.heard.some(m => m.t === 'partyInvite'), 60);
  D.c.sendSession({ t: 'party', op: 'accept' });
  await waitFor(() => host.parties.partyOf(D.id)?.members.length === 3, 60);
  A.c.sendSession({ t: 'party', op: 'rule', rule: 'owner', allocation: 'rotate' });
  await waitFor(() => host.parties.partyOf(A.id)?.allocation === 'rotate' && host.parties.partyOf(A.id)?.dropRule === 'owner', 60);
  const r0 = COOP_SCALING.shareRadius;
  COOP_SCALING.shareRadius = 500; // THE NEAR LAW's reach, short enough for the town to hold one out of it
  try {
    at(a, 0); at(b, 120); at(dd, -400, 0);
    // Well out of reach of the kills at `spot`: the farthest standing spot the town's clamp allows.
    let far = spot, farD = 0;
    for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2, p = w.clampPos(vec(spot.x + Math.cos(ang) * 1100, spot.y + Math.sin(ang) * 1100), dd.actor.radius);
      const dist2 = Math.hypot(p.x - spot.x, p.y - spot.y);
      if (dist2 > farD) { farD = dist2; far = p; }
    }
    place(dd, far.x, far.y);
    await runTicks(2);
    const out: string[] = [];
    for (let i = 0; i < 4; i++) out.push(killFor(a, spot)[0]?.owner ?? '?');
    check('R rotate: successive kills deal round-robin among the members within reach of the kill, never to one out of it',
      out.join() === [A.id, B.id, A.id, B.id].join(), `${out.join()} (D ${Math.round(Math.hypot(dd.actor.pos.x - spot.x, dd.actor.pos.y - spot.y))} px off, A ${Math.round(Math.hypot(a.actor.pos.x - spot.x, a.actor.pos.y - spot.y))}, B ${Math.round(Math.hypot(b.actor.pos.x - spot.x, b.actor.pos.y - spot.y))}, arena ${w.arena.w}x${w.arena.h})`);
    place(dd, spot.x + 150, spot.y);
    await runTicks(1);
    const more: string[] = [];
    for (let i = 0; i < 3; i++) more.push(killFor(a, spot)[0]?.owner ?? '?');
    check('R rotate: a member come into reach joins the turn where the cursor stands', more.join() === [dd.id, A.id, B.id].join(), more.join());
  } finally { COOP_SCALING.shareRadius = r0; }
  for (const d of [...w.drops]) w.drops.splice(w.drops.indexOf(d), 1); // the rig's own spoils go
  D.c.leave();
  await waitFor(() => !seatOf(D.id), 120);
}

// ======================================================================= W: THE WIRE ==
{
  A.c.sendSession({ t: 'party', op: 'rule', rule: 'owner', allocation: 'killer' });
  await waitFor(() => host.parties.partyOf(A.id)?.allocation === 'killer', 60);
  at(a, -400); at(c, -400, -200);
  const d = killFor(a, spot)[0];
  await runTicks(6);
  const rowC = latest(C)?.drops.find(r => Math.abs(r.p[0] - d.pos.x) < 1 && Math.abs(r.p[1] - d.pos.y) < 1);
  check('W wire: an \'owner\' drop\'s row names its owner with no timer', rowC?.o === A.id && rowC.fa === undefined, JSON.stringify(rowC && { o: rowC.o, fa: rowC.fa }));
  const coop = serializeSnapshot(w, 1);
  check('W co-op: the co-op broadcast (serializeSnapshot alone, the WebRTC host\'s frame) carries no owner row',
    coop.drops.length > 0 && coop.drops.every(r => r.o === undefined && r.fa === undefined));
  const solo = new World(makeAccount(), Object.freeze(buildManifest(makeAccount(), 0x5b0128)));
  solo.drops.push({ pos: vec(0, 0), item: { kind: 'vestige', id: 'thal', count: 1 }, bob: 0, owner: 'p9' });
  const soloSnap = { drops: [{ p: [0, 0], bob: 0, kind: 'vestige', color: '#fff' }] } as unknown as StateSnapshot;
  stampDropOwners(solo, soloSnap);
  check('W co-op: a world with no rule hook stamps no row, whatever its drops wear', soloSnap.drops[0].o === undefined);
  // THE DRAW: a shell adopts the rows; another seat's held drop is ghosted, its own and a free one full.
  const shell = { drops: [{ pos: vec(0, 0), item: { kind: 'vestige' }, bob: 0 }, { pos: vec(1, 0), item: { kind: 'vestige' }, bob: 0 },
    { pos: vec(2, 0), item: { kind: 'vestige' }, bob: 0 }, { pos: vec(3, 0), item: { kind: 'vestige' }, bob: 0 }],
    time: 100, clientSeatId: C.id, dropRuleOf: null, dropHolder: World.prototype.dropHolder } as unknown as World;
  const rows = { time: 100, drops: [{ o: A.id }, { o: C.id }, {}, { o: A.id, fa: 2 }] } as unknown as StateSnapshot;
  adoptDropOwners(shell, rows);
  const alphas = shell.drops.map(x => dropAlpha(shell, x));
  check('W draw: another seat\'s held drop draws ghosted, its own and a free one full',
    alphas[0] === SPOILS_CFG.ghostAlpha && alphas[1] === 1 && alphas[2] === 1 && alphas[3] === SPOILS_CFG.ghostAlpha, alphas.join());
  (shell as unknown as { time: number }).time = 102.5;
  check('W draw: when its seconds run out the drop draws full for everyone', dropAlpha(shell, shell.drops[3]) === 1);
}

Object.assign(DROP_CFG, drop0);
for (const x of [A, B, C]) x.c.leave();
await waitFor(() => w.seats.length === 1, 120);
await host.stop();
await new Promise(r => setTimeout(r, 600)); // in-flight socket closes settle before the exit (the shard rigs' law)
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
