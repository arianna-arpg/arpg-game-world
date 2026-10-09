// THE SIM UNITS, W1 THE UNIT FABRIC (docs/design/shard-m1-plan.md; docs/engine/shard.md
// "THE SIM UNITS, W1"): one World per live zone on a hosted world. The rig pins the
// plan's W1 sections on a classic shard (open account, ephemeral) with clients over the
// real wire:
//   B  THE SOLO INVARIANT (first, before any shard host touches a process dial): no sim
//      or co-op World ever carries a shard link, World.atZone is the conditional it
//      replaces, and THE ROAD-WALK DIGEST (a seeded solo hero through an exit, a cave
//      mouth, the climb-out and a town portal round trip) equals the constant W1
//      committed before any road was lifted (W2 must reproduce it);
//   A  THE DERIVED CENSUS (static): World's fields parsed from source, three detectors
//      (shape, THE SAVE LAW, THE SWEEP LAW one call deep from THE PRIMARY GATE), every
//      hit carries a SHARD_UNIT_FIELDS row, a saved field is never per-unit, a unit row
//      names its reason, a row naming a missing field fails;
//   C  two seats in two zones at once through the registry's direct road: the keeper
//      never moves, each client hears only its own unit, the zone message lands before
//      the first snapshot of the new zone, a frontier minted in a unit lands in the
//      keeper's chart, two units minting in one tick never collide; a woken unit wears
//      the host's hooks (the party, THE CORPSE ON THE CHART's marks) and a hand-off marks
//      the arrival's journal in its new unit, where its first beat judges it;
//   D  THE HAND-OFF keeps identity: the same objects and ids for the hero, a minion, a
//      second-hop minion, a companion and a throng body (lite rows re-spawned), a
//      construct culled in the source, the party desk, the ack, the kill tally; the
//      source keeps nothing that names the court (domain and aura sources, a toggled
//      field refunded, flights, target refs, the four teardown-on-absence controllers);
//      THE SPAWN GRACE holds until the first willed input;
//   E  THE SLEEP and THE WAKE: THE PERSIST CAPTURE writes an awake unit's live row, a
//      seatless unit sleeps after unitLinger with its survivors and wounds in memory, a
//      re-entry meets the same ground and survivors, the hearth never sleeps, no empty
//      hearth row appears, THE UNIT BREAKER sends a faulting unit's seats home;
//   I  THE DESKS PER UNIT: a mortal vessel's body records its unit's zone and spot, a
//      vessel in a pocket mirrors home with its companion, a dormant seat keeps its unit
//      awake past the linger and resumes with that unit's zone, a grouped down whose
//      only mate stands in another unit falls (no kneel across Worlds), THE MERCY
//      raises an Immortal inside a unit;
//   R  THE RUN ROW: a classic shard's save carries its clears and run ledger, and a
//      save without the row still stands.
import ts from 'typescript';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as joinPath, resolve } from 'node:path';
import { ShardHost, SHARD_CFG, bootShardEngine, type ShardSave } from '../server/shardHost';
import { VESSEL_CFG } from '../server/vessel';
import { SHARD_WIRE_CFG } from '../server/shardTransport';
import type { SimUnit } from '../server/simUnits';
import { WsTransport, shardResumeFor, type ShardResume } from '../src/net/ws';
import type { StateSnapshot, ZoneMsg } from '../src/net/snapshot';
import type { SessionMsg } from '../src/net/transport';
import { NullInput, type PlayerInput } from '../src/net/intent';
import { World, type Seat } from '../src/engine/world';
import type { Actor, ConstructState } from '../src/engine/actor';
import { resetActorIdCounter } from '../src/engine/actor';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { mintCave } from '../src/engine/worldgen';
import { rollItem } from '../src/engine/itemgen';
import { PINNED_FIELDS, SHARD_UNIT_FIELDS, UNIT_CFG } from '../src/engine/shardUnits';
import { makeAccount, ensureAccountId, type Account } from '../src/meta/account';
import { serializeCouchGuest, type CharacterSave } from '../src/meta/character';
import { buildManifest } from '../src/packages/manifest';
import { CLASSES } from '../src/data/classes';
import { SKILLS } from '../src/data/skills';
import { COOP_SCALING } from '../src/data/coop';
import { START_ZONE } from '../src/data/zones';
import { FORECHART_CFG } from '../src/world/forechart';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { dist, vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' : ' + detail : ''}`);
  if (!ok) failed++;
};
type Priv = Record<string, unknown>;
const priv = (o: object): Priv => o as unknown as Priv;

// ======================================================= B: THE SOLO INVARIANT ==
// THE ROAD-WALK DIGEST, committed by W1 at shard-world 917702e5 BEFORE any road was
// lifted: the same seeded solo walk must print it after every wave (W2's lift included).
const ROAD_WALK_HASH = 'cadf869b';
const ROAD_WALK_SEED = 0x40adca7;
// The walk runs FIRST in this file: a sim world's boot (makeSimWorld below) adds its arena to
// the static chart every later World clones, and a shard host widens THE NEAR LAW; either
// would deal the walk another world.
bootShardEngine();
function roadWalk(): { digest: string; hash: string; legs: Record<string, boolean> } {
  const radius0 = COOP_SCALING.shareRadius, budget0 = FORECHART_CFG.beatBudgetMs;
  COOP_SCALING.shareRadius = 0; FORECHART_CFG.beatBudgetMs = Infinity; // a solo world, the pinned governor
  const restore = seedGlobalRandom(ROAD_WALK_SEED);
  const seeded = Math.random;
  let draws = 0;
  Math.random = () => { draws++; return seeded(); };
  try {
    resetActorIdCounter();
    const account = makeAccount();
    const manifest = buildManifest(account, ROAD_WALK_SEED);
    for (const p of manifest.packages) p.enabled = false; // a QUIET expedition: the roads alone
    const w = new World(account, Object.freeze(manifest));
    w.createPlayer(CLASSES.find(c => c.id === 'warrior')!, { name: 'Walker', startingCompanions: false, startingFlasks: false });
    const hops: string[] = [w.zone.id];
    const hero = (): Actor => w.player;
    hero().invulnerable = true;
    const idle = (): void => { w.localSeat.lastActedAt = -1e3; w.localSeat.lastMovedAt = -1e3; hero().push = null; hero().casting = null; };
    const step = (secs: number, done?: () => boolean): boolean => {
      for (let t = 0; t < secs; t += 1 / 60) {
        w.update(1 / 60);
        if (hops[hops.length - 1] !== w.zone.id) hops.push(w.zone.id);
        if (done?.()) return true;
      }
      return !!done?.();
    };
    const stand = (x: number, y: number): void => { const at = w.clampPos(vec(x, y), hero().radius); hero().pos.x = at.x; hero().pos.y = at.y; idle(); };
    // 1. THE EXIT: the hearth's road out.
    const out = w.exits.find(e => e.to !== '?')!;
    stand(out.pos.x, out.pos.y);
    const hearth = w.zone.id;
    const exited = step(10, () => w.zone.id !== hearth);
    const field = w.zone.id;
    // 2. THE CAVE MOUTH: a classic cave entrance at the field's heart.
    stand(w.arena.w / 2, w.arena.h / 2);
    const mouthAt = vec(hero().pos.x, hero().pos.y);
    (priv(w).caveEntrances as { pos: { x: number; y: number }; seed: number; kind: string }[])
      .push({ pos: vec(mouthAt.x, mouthAt.y), seed: 0x5eed1, kind: 'cave_entrance' });
    idle();
    const descended = step(10, () => w.inCave);
    // 3. THE CLIMB-OUT: the cave's road home.
    const home = w.caveReturn?.zoneId;
    const back = w.exits.find(e => e.to === home);
    if (back) stand(back.pos.x, back.pos.y);
    const climbed = !!back && step(10, () => w.zone.id === field && !w.inCave);
    // 4. THE TOWN PORTAL, out and back.
    stand(mouthAt.x + 260, mouthAt.y + 60);
    step(0.3);
    const cast = w.castTownPortal();
    step(2.5);
    const view = w.townPortalViews()[0];
    if (view) stand(view.pos.x, view.pos.y);
    const toTown = !!view && step(10, () => w.zone.id === START_ZONE);
    stand(hero().pos.x + 160, hero().pos.y);
    step(0.3);
    const ret = w.townPortalViews()[0];
    if (ret) stand(ret.pos.x, ret.pos.y);
    const returned = !!ret && step(10, () => w.zone.id === field);
    step(1);
    const p = hero().pos;
    const digest = [hops.join('>'), `${Math.round(p.x)},${Math.round(p.y)}`, `actors ${w.actors.length}`, `draws ${draws}`, `t ${w.time.toFixed(2)}`].join(' | ');
    let h = 0x811c9dc5;
    for (let i = 0; i < digest.length; i++) { h ^= digest.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return { digest, hash: h.toString(16).padStart(8, '0'), legs: { exited, descended, climbed, cast, toTown, returned } };
  } finally {
    Math.random = seeded; restore();
    COOP_SCALING.shareRadius = radius0; FORECHART_CFG.beatBudgetMs = budget0;
  }
}
{
  const walk = roadWalk();
  check('B road walk: the solo hero takes an exit, a cave mouth, the climb-out and a town portal there and back',
    Object.values(walk.legs).every(Boolean), JSON.stringify(walk.legs));
  check('B road walk: THE ROAD-WALK DIGEST is the constant W1 committed before any road was lifted',
    walk.hash === ROAD_WALK_HASH, `${walk.hash} ← ${walk.digest}`);
  const sim = makeSimWorld('warrior', 0x51a0);
  const coop = new World(makeAccount(), Object.freeze(buildManifest(makeAccount(), 0x51a1)));
  coop.createPlayer(CLASSES[0], { startingCompanions: false, startingFlasks: false });
  coop.addSeat('p1', CLASSES[1], new NullInput(), { startingCompanions: false, startingFlasks: false });
  check('B solo: no sim World and no co-op World ever carries a shard link (THE PRIMARY GATE never closes off a shard)',
    sim.shardWorld === undefined && coop.shardWorld === undefined);
  let here = 0, there = 0;
  coop.atZone(coop.zone.id, () => { here++; });
  coop.atZone('nowhere_' + coop.zone.id, () => { there++; });
  check('B solo: World.atZone is the conditional it replaces (this zone runs, any other is nothing)', here === 1 && there === 0);
}

// ====================================================== A: THE DERIVED CENSUS ==
{
  const path = resolve('src/engine/world.ts');
  const sf = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  let cls: ts.ClassDeclaration | undefined;
  sf.forEachChild(n => { if (ts.isClassDeclaration(n) && n.name?.text === 'World') cls = n; });
  const props = new Map<string, ts.PropertyDeclaration>(), methods = new Map<string, ts.MethodDeclaration | ts.GetAccessorDeclaration>();
  for (const m of cls?.members ?? []) {
    const statik = !!(ts.getCombinedModifierFlags(m) & ts.ModifierFlags.Static);
    if (ts.isPropertyDeclaration(m) && !statik) props.set(m.name.getText(sf), m);
    if ((ts.isMethodDeclaration(m) || ts.isGetAccessorDeclaration(m)) && m.body && !statik) methods.set(m.name.getText(sf), m);
  }
  // THE SHAPE: the field's OWN container is a string-keyed Map/Set/Record (a handler
  // table of functions is code, not state), a WorldSim, a Ledger or an Account.
  const KEYED = new Set(['Map', 'Set', 'Record']), NAMED = new Set(['WorldSim', 'Ledger', 'Account']);
  const typeHit = (t: ts.TypeNode | undefined): boolean => {
    if (!t) return false;
    if (ts.isUnionTypeNode(t)) return t.types.some(typeHit);
    if (ts.isParenthesizedTypeNode(t)) return typeHit(t.type);
    if (!ts.isTypeReferenceNode(t)) return false;
    const n = t.typeName.getText(sf);
    if (NAMED.has(n)) return true;
    const [k, v] = t.typeArguments ?? [];
    return KEYED.has(n) && !!k && k.kind === ts.SyntaxKind.StringKeyword && !(n === 'Record' && !!v && ts.isFunctionTypeNode(v));
  };
  const initHit = (e: ts.Expression | undefined): boolean => {
    if (!e || !ts.isNewExpression(e)) return false;
    const n = e.expression.getText(sf);
    if (NAMED.has(n)) return true;
    return (n === 'Map' || n === 'Set') && !!e.typeArguments?.length && e.typeArguments[0].kind === ts.SyntaxKind.StringKeyword;
  };
  const shape = [...props].filter(([, m]) => typeHit(m.type) || initHit(m.initializer)).map(([n]) => n);
  /** Fields a node touches (`this.x` reads), or WRITES: an assignment, ++/--, a call on
   *  it, a member assignment through it, or the field handed to a helper (which may write). */
  const touched = (node: ts.Node, writes: boolean): Set<string> => {
    const out = new Set<string>();
    const visit = (n: ts.Node): void => {
      if (ts.isPropertyAccessExpression(n) && n.expression.kind === ts.SyntaxKind.ThisKeyword && props.has(n.name.text)) {
        const name = n.name.text, p = n.parent;
        if (!writes) out.add(name);
        else if (ts.isBinaryExpression(p) && p.left === n && p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && p.operatorToken.kind <= ts.SyntaxKind.LastAssignment) out.add(name);
        else if ((ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) && (p.operator === ts.SyntaxKind.PlusPlusToken || p.operator === ts.SyntaxKind.MinusMinusToken)) out.add(name);
        else if (ts.isPropertyAccessExpression(p) && p.expression === n && ts.isCallExpression(p.parent) && p.parent.expression === p) out.add(name);
        else if (ts.isPropertyAccessExpression(p) && p.expression === n && ts.isBinaryExpression(p.parent) && p.parent.left === p && p.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) out.add(name);
        else if (ts.isCallExpression(p) && p.arguments.includes(n as ts.Expression)) out.add(name);
      }
      ts.forEachChild(n, visit);
    };
    visit(node);
    return out;
  };
  const calls = (node: ts.Node): Set<string> => {
    const out = new Set<string>();
    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.expression.kind === ts.SyntaxKind.ThisKeyword
        && methods.has(n.expression.name.text)) out.add(n.expression.name.text);
      ts.forEachChild(n, visit);
    };
    visit(node);
    return out;
  };
  // THE SAVE LAW: every field the world half's writer and reader touch.
  const saveLaw = new Set<string>();
  for (const m of ['serializeWorldState', 'adoptWorldState']) for (const f of touched(methods.get(m)!, false)) saveLaw.add(f);
  // THE SWEEP LAW: the statements under THE PRIMARY GATE in update() (an if whose test is
  // `!unitWorld`, a conditional on `unitWorld`) and every method that opens on the gate,
  // with the fields their bodies write one call deep.
  const gated: ts.Node[] = [];
  const update = methods.get('update');
  const visitU = (n: ts.Node): void => {
    if (ts.isIfStatement(n) && /!unitWorld\b/.test(n.expression.getText(sf))) gated.push(n.thenStatement);
    if (ts.isConditionalExpression(n) && n.condition.getText(sf) === 'unitWorld') gated.push(n.whenFalse);
    ts.forEachChild(n, visitU);
  };
  if (update?.body) visitU(update.body);
  const gateMethods = [...methods].filter(([, m]) => {
    const first = m.body?.statements[0];
    return !!first && ts.isIfStatement(first) && /this\.shardWorld\?\.role === 'unit'/.test(first.expression.getText(sf));
  }).map(([n]) => n);
  for (const n of gateMethods) gated.push(methods.get(n)!.body!);
  const sweep = new Set<string>();
  const oneDeep = new Set<string>();
  for (const g of gated) {
    for (const f of touched(g, true)) sweep.add(f);
    for (const c of calls(g)) oneDeep.add(c);
  }
  for (const c of oneDeep) { const body = methods.get(c)?.body; if (body) for (const f of touched(body, true)) sweep.add(f); }
  const rows = SHARD_UNIT_FIELDS;
  check('A census: the source parses and the three detectors see what they were born from',
    props.size >= 600 && shape.length >= 90 && ['zoneMap', 'zoneMemory', 'nextGenId', 'sim'].every(f => saveLaw.has(f))
    && gated.length >= 20 && gateMethods.includes('updateHarborholds') && ['forechartNextAt', 'warpSweepAcc', 'notices'].every(f => sweep.has(f)),
    `${props.size} fields; ${shape.length} shaped, ${saveLaw.size} saved, ${gated.length} gated statements + ${gateMethods.join(', ')}, ${oneDeep.size} sweeps one call deep writing ${sweep.size}`);
  const missing = Object.keys(rows).filter(f => !props.has(f));
  check('A census: every SHARD_UNIT_FIELDS row names a World field (a row naming a missing field fails)', missing.length === 0, missing.join(', '));
  const unshaped = shape.filter(f => !rows[f]);
  check('A census: THE SHAPE LAW: every string-keyed, sim, ledger or account field carries a row', unshaped.length === 0, unshaped.join(', '));
  const unsaved = [...saveLaw].filter(f => !rows[f] || rows[f].cls === 'unit');
  check('A census: THE SAVE LAW: every field the world save touches carries a row, and none is per-unit', unsaved.length === 0, unsaved.join(', '));
  const unswept = [...sweep].filter(f => !rows[f]);
  check('A census: THE SWEEP LAW: every field the gated sweeps write, one call deep, carries a row', unswept.length === 0, unswept.join(', '));
  const REASONS = new Set(['per-visit', 'zone-local', 'memo', 'seat-keyed', 'warden-only', 'dev', 'shell']);
  const HANDS = new Set(['move-seat-id', 'move-seat', 'move-actor-id', 'move-actor', 'drop-seat-id', 'drop-seat', 'drop-actor-id', 'drop-actor', 'custom']);
  const bad = Object.entries(rows).filter(([, r]) => (r.cls === 'unit' && !REASONS.has(r.why)) || (r.cls === 'seat' && !HANDS.has(r.hand))).map(([f]) => f);
  check('A census: every unit row names its reason from the closed vocabulary, every seat row its hand', bad.length === 0, bad.join(', '));
  const pinned = Object.entries(rows).filter(([, r]) => r.cls === 'alias' || r.cls === 'counter').map(([f]) => f);
  const clocks = Object.entries(rows).filter(([, r]) => r.cls === 'clock').map(([f]) => f).sort();
  check('A pin: THE PIN copies exactly the alias and counter rows, and THE ONE CLOCK is time and inputClock',
    JSON.stringify(pinned) === JSON.stringify(PINNED_FIELDS) && JSON.stringify(clocks) === '["inputClock","time"]',
    `${PINNED_FIELDS.length} pinned; ${Object.values(rows).filter(r => r.cls === 'unit').length} unit rows, ${Object.values(rows).filter(r => r.cls === 'seat').length} seat rows`);
}

// ================================================================= the shard ==
const restoreRandom = seedGlobalRandom(0x5170);
SHARD_WIRE_CFG.maxPerIp = Number.POSITIVE_INFINITY; // every client of this rig arrives from one address
const DT = 1 / SHARD_CFG.tickHz;
const sec = (s: number): number => Math.ceil(s * SHARD_CFG.tickHz);
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const logs: string[] = [];
const host = new ShardHost({ seed: 0x5e4a71e, saveDir: null, open: true, log: line => { logs.push(line); } });
await host.ready();
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
const k = host.world;
const units = host.units;
async function runTicks(n: number, each?: () => void): Promise<void> {
  for (let i = 0; i < n; i++) { each?.(); host.tick(DT); await yieldIO(); }
}
async function waitFor(cond: () => boolean, maxTicks: number): Promise<boolean> {
  for (let i = 0; i < maxTicks; i++) { if (cond()) return true; host.tick(DT); await yieldIO(); }
  return cond();
}
const seatOf = (id: string): Seat | undefined => units.seatOf(id);
/** Real charted ground near a zone, nearest first (never the hearth, a cave, the sim arena or the given zones). */
const nearZones = (from: string, ...not: string[]): string[] => {
  const at = k.zoneMap[from].map;
  return Object.keys(k.zoneMap).filter(id => id !== from && id !== START_ZONE && !id.startsWith('cave_') && id !== 'sim_arena'
    && !not.includes(id) && !k.zoneMap[id].concealed && k.zoneMap[id].objective.kind !== 'safe' && !k.zoneMap[id].special)
    .sort((a, b) => dist(k.zoneMap[a].map, at) - dist(k.zoneMap[b].map, at) || (a < b ? -1 : 1));
};
/** The keeper's shared memory map (THE PIN's alias; World keeps it private). */
const memoryOf = (): Map<string, { seed: number; enemies: { defId: string; x: number; y: number; life: number }[] }> => priv(k).zoneMemory as Map<string, { seed: number; enemies: { defId: string; x: number; y: number; life: number }[] }>;
const worldOf = (id: string): World => units.worldOf(id)!;

interface Client { c: WsTransport; id: string; heard: SessionMsg[]; snaps: StateSnapshot[]; zones: ZoneMsg[]; order: string[]; resume: ShardResume | null }
async function join(name: string, opts: { classId?: string; accountId?: string; vessel?: CharacterSave } = {}): Promise<Client> {
  const c = new WsTransport();
  const cl: Client = { c, id: '', heard: [], snaps: [], zones: [], order: [], resume: null };
  c.onSession(m => { cl.heard.push(m); cl.order.push('session:' + m.t); });
  c.onState(s => { cl.snaps.push(s); cl.order.push('snap:' + s.zoneId); if (cl.snaps.length > 600) cl.snaps.splice(0, 300); });
  c.onZone(z => { cl.zones.push(z); cl.order.push('zone:' + z.zoneId); });
  const welcome = await c.connect(url, { name, classId: opts.classId ?? 'warrior', ...(opts.accountId ? { accountId: opts.accountId } : {}) }, opts.vessel);
  cl.id = welcome.self;
  cl.resume = shardResumeFor(url); // THE REMEMBERED SESSION is one per page: read it right after this welcome
  await waitFor(() => !!seatOf(cl.id) || cl.heard.some(m => m.t === 'refused' || m.t === 'runEnd'), 60);
  return cl;
}
let seqs = 1;
/** A willed step over the wire (ends THE SPAWN GRACE). */
const step = (cl: Client, dx = 1): void => {
  const a = seatOf(cl.id)!.actor;
  const input: PlayerInput = { dx, dy: 0, aim: { x: a.pos.x + 80, y: a.pos.y }, held: [], edge: [], seq: seqs++ };
  cl.c.sendInput(cl.id, input);
};
const place = (s: Seat, x: number, y: number): void => {
  const w = worldOf(s.id), p = w.clampPos(vec(x, y), s.actor.radius);
  s.actor.pos.x = p.x; s.actor.pos.y = p.y;
};
const claimedAccount = (): Account => { const a = makeAccount(); ensureAccountId(a); return a; };
/** Forge a vessel on a scratch keeper seat (the couch guest's shape, as the wire carries it). */
function forgeVessel(o: { classId?: string; name: string; charId: string; worn?: ('helmet' | 'boots' | 'gloves')[] }): CharacterSave {
  const seat = k.addSeat('forge', CLASSES.find(c => c.id === (o.classId ?? 'warrior'))!, new NullInput(), { startingCompanions: false, startingFlasks: false });
  seat.meta.name = o.name; seat.meta.charId = o.charId;
  k.seatHero(seat).level = 12; // the worn gear's own requirement
  for (const slot of o.worn ?? []) {
    const it = rollItem({ ilvl: 12, rarity: 'rare', category: slot });
    if (it) { seat.meta.items.push(it); k.equipItem(seat, it.uid, slot); }
  }
  const save = serializeCouchGuest(k, seat, {});
  k.removeSeat('forge');
  const out = JSON.parse(JSON.stringify(save)) as CharacterSave;
  out.ledger = { mireille_flasks_given: 1 };
  return out;
}

// ================================================ C: TWO SEATS, TWO ZONES ==
const A = await join('Aster'), B = await join('Bryn', { classId: 'tamer' });
await runTicks(3);
const hearth = k.zone.id;
const road = k.exits.find(e => e.to !== '?' && !!k.zoneMap[e.to])!;
const cross = road.to;
let u: SimUnit;
{
  const kx = host.keeper.actor.pos.x, ky = host.keeper.actor.pos.y, t0 = k.time;
  const nB = B.order.length, nA = A.snaps.length;
  const landed = units.travel(B.id, cross);
  u = landed!;
  check('C travel: the direct road lands p2 in a woken unit hosting the Crossroads while p1 stays at the hearth',
    !!landed && landed.role === 'unit' && landed.world.zone.id === cross && units.unitOf(B.id) === landed
    && units.unitOf(A.id) === units.keeper && !k.seats.some(s => s.id === B.id) && landed.world.seats.some(s => s.id === B.id),
    `${hearth} + ${landed?.key}`);
  check('C wake: the unit stands its own parked warden as p0 (keeper-tagged, carrying the link)',
    !!landed?.world.localSeat.keeper && landed.world.localSeat.actor.invulnerable && landed.world.shardWorld?.role === 'unit'
    && k.shardWorld?.role === 'keeper' && landed.world.zoneMap === k.zoneMap && landed.world.sim === k.sim);
  // THE COUNTERS AND THE JOURNAL across units: the host's hooks stand on every World it runs, and the
  // arrival's journal is marked in its new unit (never the source), so its new zone rides its first beat there.
  const bSeat = landed?.world.seats.find(s => s.id === B.id);
  check('C hooks: a woken unit wears the host\'s party and corpse-marks hooks, as the keeper does',
    !!landed && typeof landed.world.partyMates === 'function' && typeof landed.world.seatCorpseMarks === 'function'
    && typeof k.seatCorpseMarks === 'function' && !!bSeat && Array.isArray(landed.world.seatCorpseMarks(bSeat)));
  check('C journal: the hand-off marks the arrival\'s journal in its new unit, never in the source',
    !!landed && landed.world.journalDirty.has(B.id) && !k.journalDirty.has(B.id));
  await runTicks(300);
  check('C journal: the arrival\'s journal was judged in its own unit on its first beat there',
    !u.world.journalDirty.has(B.id) && !k.journalDirty.has(B.id));
  check('C tick: the keeper never moved and both units stepped on THE ONE CLOCK',
    host.keeper.actor.pos.x === kx && host.keeper.actor.pos.y === ky && k.zone.id === hearth
    && Math.abs(u.world.time - k.time) < 1e-9 && k.time - t0 >= 300 / SHARD_CFG.tickHz - 1e-6, `keeper t ${k.time.toFixed(3)}, unit t ${u.world.time.toFixed(3)}`);
  const aSnaps = A.snaps.slice(Math.max(0, nA));
  const bSnaps = B.snaps.filter(s => s.zoneId === cross);
  const unitIds = new Set(u.world.actors.map(a => a.id)), keeperIds = new Set(k.actors.map(a => a.id));
  check('C wire: p1 hears only the hearth (its zone, its seats, its bodies)',
    aSnaps.length >= 60 && aSnaps.every(s => s.zoneId === hearth && !s.seats[B.id] && !!s.seats[A.id] && s.actors.every(a => !unitIds.has(a.id) || keeperIds.has(a.id))),
    `${aSnaps.length} snapshots`);
  const lastB = bSnaps.slice(-40);
  check('C wire: p2 hears only the Crossroads (its zone, its seats, its bodies)',
    lastB.length >= 30 && lastB.every(s => !!s.seats[B.id] && !s.seats[A.id] && s.actors.every(a => !keeperIds.has(a.id) || unitIds.has(a.id))),
    `${bSnaps.length} Crossroads snapshots`);
  const order = B.order.slice(nB);
  const zi = order.indexOf('zone:' + cross), si = order.indexOf('snap:' + cross);
  check('C wire: p2\'s zone message lands before its first Crossroads snapshot', zi >= 0 && si > zi, `zone@${zi} snap@${si}`);
  const ticks = B.snaps.map(s => s.tick);
  check('C wire: one snapTick per beat keeps p2\'s ticks monotonic across the hand-off', ticks.every((t, i) => i === 0 || t > ticks[i - 1]));
  // A frontier minted in the unit lands in the keeper's chart (THE PIN carries zoneMap and nextGenId).
  /** A FRESH frontier mint from inside a unit (a frontier that consolidates onto standing
   *  ground mints nothing, so the next one is tried). */
  const mint = (unit: SimUnit): { id: string; def: unknown } | null => units.run(unit, w => {
    for (const z of [w.zone, ...Object.values(w.zoneMap)]) {
      for (const def of z.exits) {
        if (def.to !== '?') continue;
        const before = new Set(Object.keys(w.zoneMap));
        const gen = (priv(w).chartFrontier as (z: unknown, d: unknown) => { id: string }).call(w, z, def);
        if (!gen || gen.id === z.id) continue;
        def.to = gen.id;
        if (!before.has(gen.id)) return { id: gen.id, def: gen };
      }
    }
    return null;
  });
  const g1 = mint(u);
  check('C chart: a frontier minted in a unit appears in the keeper\'s zoneMap', !!g1 && k.zoneMap[g1.id] === g1.def, g1?.id ?? 'no frontier');
  // Two units minting in one tick: p1 walks to a second unit, then each unit mints in turn.
  const second = nearZones(cross)[0];
  const u2 = units.travel(A.id, second)!;
  const n0 = priv(k).nextGenId as number;
  const m1 = mint(u), m2 = mint(u2);
  const maxGen = Math.max(0, ...Object.keys(k.zoneMap).map(id => /^gen_(\d+)$/.exec(id)).filter((m): m is RegExpExecArray => !!m).map(m => Number(m[1])));
  check('C chart: two units minting in one tick never share a gen_ id (one counter, pinned both ways)',
    !!m1 && !!m2 && m1.id !== m2.id && k.zoneMap[m1.id] === m1.def && k.zoneMap[m2.id] === m2.def
    && (priv(k).nextGenId as number) > maxGen && (priv(k).nextGenId as number) >= n0 + 2,
    `${m1?.id} / ${m2?.id}, counter ${n0} → ${String(priv(k).nextGenId)}, highest gen_${maxGen}`);
  check('C ledger: the status page lists the units and each seat\'s unit',
    (() => { const st = host.status() as { units: { key: string; zone: string; seats: string[] }[]; seats: { id: string; unit: string }[] };
      return st.units.length === 3 && st.units[0].key === 'keeper' && st.seats.find(s => s.id === B.id)?.unit === u.key
        && st.seats.find(s => s.id === A.id)?.unit === u2.key; })());
  units.travel(A.id, hearth);
}

// ================================================ D: THE HAND-OFF KEEPS IDENTITY ==
const foeOf = (w: World): Actor | undefined => w.actors.find(a => a.team === 'enemy' && !a.dead && !a.passive && a.fromZoneGen && !!a.defId && !a.untargetable);
let wounded: Actor | null = null;
let crossSeed = 0;
{
  const uw = u.world, sb = seatOf(B.id)!, hero = sb.actor;
  host.parties.invite(A.id, B.id, k.time); host.parties.accept(B.id, k.time);
  for (let i = 0; i < 5; i++) await runTicks(1, () => step(B));
  await runTicks(3); // the last frame lands
  const ack = uw.lastInputSeq.get(B.id);
  const companion = uw.actors.find(a => a.companion && a.owner === hero);
  const minion = uw.createMonster('skeleton_warrior', 1, 'player', hero);
  minion.pos = vec(hero.pos.x + 40, hero.pos.y); uw.actors.push(minion);
  const sub = uw.createMonster('skeleton_warrior', 1, 'player', minion); // a second hop of the chain
  sub.pos = vec(hero.pos.x + 60, hero.pos.y); uw.actors.push(sub);
  const totem = uw.createMonster('skeleton_warrior', 1, 'player', hero);
  totem.construct = { kind: 'totem', range: 200, timer: 1 } as unknown as ConstructState;
  totem.pos = vec(hero.pos.x - 40, hero.pos.y); uw.actors.push(totem);
  const totemKid = uw.createMonster('skeleton_warrior', 1, 'player', totem); // a chain broken by a construct
  totemKid.pos = vec(hero.pos.x - 60, hero.pos.y); uw.actors.push(totemKid);
  hero.skills[3] = makeSkillInstance(SKILLS.gather_cinderkin, 1, 0);
  hero.skills[4] = makeSkillInstance(SKILLS.raise_gnatveil, 1, 0);
  units.run(u, w => w.restoreThrong([{ skillId: 'gather_cinderkin', defId: 'cinderkin', level: 1, count: 1 },
    { skillId: 'raise_gnatveil', defId: 'gnatling', level: 1, count: 3 }], hero));
  const throngBody = uw.actors.find(a => a.owner === hero && a.sourceSkillId === '__throng:gather_cinderkin');
  const liteOwned = (w: World): number => { let n = 0; for (let i = 0; i < w.lite.used; i++) if (w.lite.alive[i] && w.lite.owner[i] === hero.id) n++; return n; };
  const lite0 = liteOwned(uw);
  // The source's own ties to the court.
  const foe = foeOf(uw)!;
  foe.aiTargetId = hero.id; foe.aiTargetRef = hero;
  hero.sheet.setSource(`aura:probe_ward:${foe.id}`, [mod('armor', 'flat', 5)]);
  foe.sheet.setSource(`aura:probe_ward:${hero.id}`, [mod('armor', 'flat', 5)]);
  minion.sheet.setSource(`aura:probe_ward:${hero.id}`, [mod('armor', 'flat', 5)]);
  hero.sheet.setSource('altar:0', [mod('armor', 'flat', 5)]);
  (priv(uw).seatKillTally as WeakMap<Seat, number>).set(sb, 7);
  crossSeed = priv(uw).currentZoneSeed as number;
  // A toggled field the hero laid (its reservation on the hero) and a flight in the air.
  const feed = (a: Actor): void => { a.sheet.setBase('mana', 5000); a.fillResources(); a.useLock = 0; };
  const groundArt = Object.values(SKILLS).find(d => {
    const g = d.delivery as { type: string; delay?: number; lingerDuration?: number; follow?: boolean; noImpact?: boolean; marker?: unknown; line?: unknown };
    return g.type === 'ground' && (g.lingerDuration ?? 0) >= 1 && !g.follow && !g.noImpact && !g.marker && !g.line && !d.requirements;
  })!;
  const bolt = Object.values(SKILLS).find(d => {
    const p = d.delivery as { type: string; speed?: number; range?: number; homing?: number; trajectory?: unknown; count?: number; explode?: unknown };
    return p.type === 'projectile' && (p.speed ?? 0) >= 200 && (p.range ?? 0) >= 600 && !p.homing && !p.trajectory && !p.count && !p.explode && !d.requirements && d.cooldown === 0;
  })!;
  let field: (typeof uw.zones)[number] | undefined;
  for (let i = 0; i < 4 && !field; i++) {
    feed(hero); uw.useSkill(hero, makeSkillInstance(groundArt, 1, 0), vec(hero.pos.x, hero.pos.y + 90), false);
    await waitFor(() => (field = uw.zones.find(z => z.caster === hero)) !== undefined, sec(2));
  }
  const reserved0 = hero.reservedMana;
  if (field) { field.toggled = true; field.reserved = 40; hero.reservedMana += 40; }
  // A foe's domain the hero stands in (its occupants dressed by this World's own key).
  const domainZone = field ? { ...field } as typeof field : null;
  if (domainZone && field) {
    domainZone.caster = foe; domainZone.toggled = false; domainZone.reserved = 0; domainZone.fieldCue = undefined;
    domainZone.domainKey = 'domain:probe'; domainZone.domainAffected = new Set([hero]);
    hero.sheet.setSource('domain:probe', [mod('armor', 'flat', 5)]);
    uw.zones.push(domainZone);
  }
  let flew = false;
  for (let i = 0; i < 4 && !flew; i++) {
    feed(hero); uw.useSkill(hero, makeSkillInstance(bolt, 1, 0), vec(hero.pos.x + 600, hero.pos.y), false);
    flew = await waitFor(() => uw.projectiles.some(p => p.caster === hero), sec(1.5));
  }
  const ids = { hero: hero.id, minion: minion.id, sub: sub.id, companion: companion?.id, throng: throngBody?.id };
  const bondsA = priv(uw.companionBonds).states as Map<Actor, unknown>;
  const bonded = !!companion && bondsA.has(companion);
  // THE HAND-OFF: out of the Crossroads unit, into the keeper's hearth.
  const home = units.travel(B.id, hearth);
  const kw = k;
  check('D hand-off: p2 walks home into the keeper (the hearth alias)', home === units.keeper && units.unitOf(B.id) === units.keeper && seatOf(B.id) === sb);
  check('D identity: the same Actor objects and ids for the hero, a minion, its second hop, a companion and a throng body',
    !!companion && !!throngBody && [hero, minion, sub, companion, throngBody].every(a => kw.actors.includes(a) && !uw.actors.includes(a))
    && hero.id === ids.hero && minion.id === ids.minion && sub.id === ids.sub && companion.id === ids.companion && throngBody.id === ids.throng,
    JSON.stringify(ids));
  check('D identity: the lite-tier throng rows are freed in the source and re-spawned beside the keeper',
    lite0 === 3 && liteOwned(uw) === 0 && liteOwned(kw) === lite0, `${lite0} → source ${liteOwned(uw)}, hearth ${liteOwned(kw)}`);
  check('D cull: a construct (and the chain it broke) stays in neither World', totem.dead && totemKid.dead
    && ![totem, totemKid].some(a => uw.actors.includes(a) || kw.actors.includes(a)));
  check('D desk: the party desk still lists both seats, and both units\' worlds carry its rows',
    host.parties.rows().some(r => r.members.includes(A.id) && r.members.includes(B.id)) && !!kw.partyRows?.length && kw.partyRev > 0);
  check('D ack: the input ack moved with the seat (SeatW.seq continues)', ack === seqs - 1 && kw.lastInputSeq.get(B.id) === ack && !uw.lastInputSeq.has(B.id), `ack ${ack}`);
  check('D tally: the seat\'s kills travel with it (the fall\'s reckoning)', kw.seatKills(sb) === 7 && uw.seatKills(sb) === 0);
  check('D leaks: no flight of the court remains in the source', flew && !uw.projectiles.some(p => p.caster === hero || p.caster === minion));
  check('D leaks: the toggled field the hero cast expired, its reservation refunded', !!field && !uw.zones.includes(field) && hero.reservedMana === reserved0,
    `${reserved0} → ${hero.reservedMana}`);
  check('D leaks: the domain and aura sources of the source are stripped from the court, and the court\'s from the source',
    !hero.sheet.hasSource('domain:probe') && !domainZone?.domainAffected?.has(hero) && !hero.sheet.hasSource(`aura:probe_ward:${foe.id}`)
    && !foe.sheet.hasSource(`aura:probe_ward:${hero.id}`) && minion.sheet.hasSource(`aura:probe_ward:${hero.id}`) && !hero.sheet.hasSource('altar:0'));
  check('D leaks: the source\'s monsters drop their target ref on the court', foe.aiTargetId === undefined && foe.aiTargetRef === undefined);
  const ctl = (w: World): boolean => [hero, minion, companion!].some(a => (priv(w.guardArts).states as Map<Actor, unknown>).has(a)
    || (priv(w.assaults).courts as Map<Actor, unknown>).has(a));
  check('D leaks: the bond state moved whole (the source holds none), and the source\'s guard arts and courts hold no carried body',
    bonded && !bondsA.has(companion!) && (priv(kw.companionBonds).states as Map<Actor, unknown>).has(companion!) && !ctl(uw));
  const sheet0 = companion!.sheet.hasSource('companionBond'), radius0 = companion!.radius, kit0 = companion!.skills.length;
  const graced = hero.untargetable;
  await runTicks(30);
  check('D leaks: both Worlds tick on and the source never tears the companion down (its bond dress stands)',
    sheet0 && companion!.sheet.hasSource('companionBond') && companion!.radius === radius0 && companion!.skills.length === kit0);
  check('D grace: THE SPAWN GRACE holds the arrival untargetable without a willed input', graced && hero.untargetable);
  await runTicks(2, () => step(B));
  check('D grace: and the first willed input ends it', !hero.untargetable);
  const di = domainZone ? uw.zones.indexOf(domainZone) : -1;
  if (di >= 0) uw.zones.splice(di, 1);
}

// ===================================================== E: THE SLEEP AND THE WAKE ==
{
  const linger0 = UNIT_CFG.unitLinger;
  check('E linger: the emptied unit starts its linger clock and is still awake', !!units.unit(u.key) && u.emptySince !== null);
  // A half-fought zone: a survivor the seat left wounded (struck once the court is gone, so nothing finishes it).
  wounded = u.world.actors.find(a => a.team === 'enemy' && !a.dead && a.fromZoneGen && !!a.defId && !a.doorId && !a.passive) ?? null;
  if (wounded) wounded.life = Math.max(1, Math.round(wounded.maxLife() * 0.5));
  await runTicks(2);
  /** A memory row carries the wounded survivor as it stands (its spot, its wound). */
  const holds = (enemies: { defId: string; x: number; y: number; life: number }[] | undefined): boolean => !!wounded && !!enemies
    && enemies.some(e => e.defId === wounded!.defId && Math.abs(e.x - wounded!.pos.x) < 1 && Math.abs(e.y - wounded!.pos.y) < 1
      && Math.abs(e.life - wounded!.life) < 1e-6 && e.life < wounded!.maxLife());
  units.captureAll();
  const live = k.serializeWorldState().memory?.find(m => m.zoneId === cross);
  check('E capture: THE PERSIST CAPTURE writes the awake unit\'s live row into the world save (seed and survivors)',
    !!live && live.seed === crossSeed && holds(live.enemies), `seed ${live?.seed} vs ${crossSeed}, ${live?.enemies.length ?? 0} survivors`);
  UNIT_CFG.unitLinger = 2; // the law's clock, shortened for the rig (the dial is the law's, not its number)
  const sleeps0 = units.sleeps;
  await runTicks(sec(2.5));
  const row = memoryOf().get(cross);
  check('E sleep: a seatless unit sleeps after unitLinger and drops', !units.unit(u.key) && units.sleeps >= sleeps0 + 1 && !units.each().includes(u),
    `${units.sleeps - sleeps0} slept`);
  check('E sleep: its row carries the seed and the survivors with their wounds (the departure\'s capture)',
    !!row && row.seed === crossSeed && holds(row.enemies),
    `row ${row?.seed}; wounded ${wounded?.defId} ${wounded?.pos.x.toFixed(1)},${wounded?.pos.y.toFixed(1)} life ${wounded?.life.toFixed(1)}/${wounded?.maxLife().toFixed(1)} dead ${wounded?.dead}; ${JSON.stringify(row?.enemies.filter(e => e.defId === wounded?.defId).map(e => [Math.round(e.x), Math.round(e.y), +e.life.toFixed(1)]))}`);
  check('E hearth: the hearth never sleeps', units.unitFor(hearth) === units.keeper && units.each()[0] === units.keeper);
  const wakes0 = units.wakes;
  const u3 = units.travel(B.id, cross);
  const back = u3?.world.actors.find(a => !!wounded && a.defId === wounded.defId && Math.abs(a.pos.x - wounded.pos.x) < 1 && Math.abs(a.pos.y - wounded.pos.y) < 1);
  check('E wake: re-entry wakes the same ground (its seed) and the same survivors with their wounds',
    !!u3 && u3 !== u && units.wakes === wakes0 + 1 && priv(u3.world).currentZoneSeed === crossSeed && !!back && back !== wounded
    && Math.abs(back.life - wounded!.life) < 1 && back.life < back.maxLife(), back ? `${back.defId} at ${back.life.toFixed(1)}` : 'no survivor');
  check('E hearth: no empty hearth row ever appears (THE WAKE CONTEXT never captures the placeholder town)', !memoryOf().has(START_ZONE));
  units.travel(B.id, hearth);
  UNIT_CFG.unitLinger = linger0;
  // THE UNIT BREAKER: a unit whose simulate phase faults faultBreakerTicks in a row sends its
  // seats to the hearth and drops without a capture.
  const target = nearZones(cross).find(id => !memoryOf().has(id) && !units.unitFor(id))!;
  const ub = units.travel(A.id, target)!;
  const breaker0 = SHARD_CFG.faultBreakerTicks, faults0 = host.faults;
  SHARD_CFG.faultBreakerTicks = 3;
  ub.world.update = (): void => { throw new Error('probe: the unit faults'); };
  await runTicks(4);
  SHARD_CFG.faultBreakerTicks = breaker0;
  check('E breaker: a faulting unit hands its seats to the hearth and drops uncaptured (the keeper keeps THE BREAKER)',
    units.unitOf(A.id) === units.keeper && !units.unit(ub.key) && units.breaks === 1 && !memoryOf().has(target)
    && !host.broken && host.faults >= faults0 + 3, `faults ${host.faults - faults0}`);
}

// ================================================================= I: THE DESKS ==
{
  const zoneA = nearZones(cross)[0];
  // I1: a mortal vessel falls in a unit: its body records the unit's zone and spot.
  const acct = claimedAccount();
  const V = await join('Vane', { accountId: acct.accountId, vessel: forgeVessel({ name: 'Vane', charId: 'c-units-vane', worn: ['helmet', 'boots'] }) });
  await runTicks(2, () => step(V));
  const vu = units.travel(V.id, zoneA)!;
  const vs = seatOf(V.id)!;
  await runTicks(3);
  const spot = { x: vs.actor.pos.x, y: vs.actor.pos.y };
  vu.world.kill(vs.actor);
  await waitFor(() => host.vessels.falls >= 1, 30);
  const body = host.corpses.forAccount(acct.accountId).at(-1);
  check('I fall: a mortal vessel falling in a unit leaves its body in that unit\'s zone, at its spot',
    host.vessels.falls === 1 && !!body && body.zoneId === zoneA && dist(body.pos, spot) < 1,
    body ? `${body.zoneId} @ ${body.pos.x.toFixed(0)},${body.pos.y.toFixed(0)}` : `no body (falls ${host.vessels.falls}, fresh ${host.vessels.freshFalls}, heard ${V.heard.map(m => m.t).join(' ')}, worn ${Object.values(vs.meta.equipped).filter(Boolean).length})`);
  await waitFor(() => !seatOf(V.id), sec(VESSEL_CFG.deathBeatSec) + 30);
  check('I fall: then the seat leaves its unit and THE SEAT LEDGER', !seatOf(V.id) && !units.unitOf(V.id) && !vu.world.seats.some(s => s.id === V.id));
  // I2: a vessel in a pocket mirrors home with its companion.
  const T = await join('Tove', { classId: 'tamer', accountId: claimedAccount().accountId, vessel: forgeVessel({ classId: 'tamer', name: 'Tove', charId: 'c-units-tove' }) });
  const ts0 = seatOf(T.id)!;
  k.grantStartingCompanions(ts0);
  const caveId = `cave_probe_units_${0x51ab}`;
  k.caveMap[caveId] = mintCave(k.zoneMap[cross], 0x51ab, caveId);
  units.enqueue({ seatId: T.id, dest: caveId, ladder: { caveReturn: { zoneId: cross, pos: { x: 400, y: 400 }, entryFrom: null, kind: 'cave_entrance', seed: 0x51ab }, caveStack: [] } });
  units.drain();
  const pu = units.unitOf(T.id);
  await runTicks(3);
  const mirrored = host.vessels.serialize(T.id);
  check('I pocket: a vessel in a pocket unit mirrors home WITH its companion (the desk reads the seat\'s own unit)',
    !!pu && pu.world.zone.id === caveId && pu.world.inCave && (mirrored?.companions?.length ?? 0) === 1 && mirrored?.companions?.[0]?.skillId === 'tame_beast',
    `${pu?.world.zone.id}, ${mirrored?.companions?.length ?? 0} companion(s)`);
  T.c.leave();
  await waitFor(() => !seatOf(T.id), 60);
  // I3: a dormant seat keeps its unit awake past the linger and resumes with that unit's zone.
  const linger0 = UNIT_CFG.unitLinger;
  UNIT_CFG.unitLinger = 2;
  const D = await join('Drift');
  await runTicks(3, () => step(D));
  const du = units.travel(D.id, zoneA)!;
  await runTicks(2, () => step(D));
  const tok = D.resume;
  const sock = (priv(host.net).bySeat as Map<string, { sock: { destroy(): void } }>).get(D.id);
  sock?.sock.destroy();
  const slept = await waitFor(() => host.net.isDormant(D.id), 60);
  await runTicks(sec(3));
  check('I dormant: a dormant seat keeps its unit awake past unitLinger', slept && units.unitOf(D.id) === du && !!units.unit(du.key));
  const back = new WsTransport();
  const zonesHeard: string[] = [];
  back.onZone(z => { zonesHeard.push(z.zoneId); });
  const bw = tok ? await back.connect(url, { name: 'Drift', classId: 'warrior' }, undefined, tok) : null;
  await waitFor(() => zonesHeard.length > 0, 60);
  check('I dormant: its resume ships that unit\'s zone message', !!bw && bw.resumed && bw.self === D.id && zonesHeard[0] === zoneA, zonesHeard.join(','));
  back.leave();
  await waitFor(() => !seatOf(D.id), sec(SHARD_CFG.dormantSec) + 60);
  UNIT_CFG.unitLinger = linger0;
  // I4: no kneel across Worlds: a grouped down whose only mate stands in another unit falls;
  // the same pair in one unit holds the down.
  const P = await join('Pax'), Q = await join('Quill'), R = await join('Rook'), S2 = await join('Sable');
  for (const [x, y] of [[P, Q], [R, S2]]) { host.parties.invite(x.id, y.id, k.time); host.parties.accept(y.id, k.time); }
  await runTicks(2, () => { for (const cl of [P, Q, R, S2]) step(cl); });
  units.travel(P.id, zoneA); units.travel(R.id, zoneA); units.travel(S2.id, zoneA);
  const p = seatOf(P.id)!, r = seatOf(R.id)!, s2 = seatOf(S2.id)!, q = seatOf(Q.id)!;
  place(p, 600, 600); place(r, 700, 600); place(s2, 740, 600); place(q, 600, 600); // p and q stand on the same numbers, a World apart
  const fresh0 = host.vessels.freshFalls;
  worldOf(P.id).kill(p.actor);
  worldOf(R.id).kill(r.actor);
  await runTicks(2);
  check('I group: a grouped down whose only mate stands in ANOTHER unit falls (positions in two Worlds are not comparable)',
    host.vessels.freshFalls === fresh0 + 1 && p.actor.dead, `the mate ${Math.round(dist(p.actor.pos, q.actor.pos))} px off by the numbers`);
  check('I group: the same pair in one unit holds it (a DOWN)', r.actor.downed && !r.actor.dead && !!seatOf(R.id));
  // I5: THE MERCY raises an Immortal inside a unit (its warden's clock, no mate standing).
  const M = await join('Mott');
  await runTicks(2, () => step(M));
  const mu = units.travel(M.id, zoneA)!;
  const m = seatOf(M.id)!;
  m.meta.modeId = 'immortal';
  place(m, 1500, 1200);
  mu.world.kill(m.actor);
  await runTicks(2);
  const downed = m.actor.downed;
  await runTicks(sec(SHARD_CFG.keeper.reviveSec) + 20);
  check('I mercy: THE MERCY raises an Immortal downed inside a unit (every unit stands a keeper-tagged warden)',
    downed && !m.actor.downed && !m.actor.dead && units.unitOf(M.id) === mu);
  for (const cl of [A, B, P, Q, R, S2, M]) cl.c.leave();
  await waitFor(() => units.allSeats().length === 0, sec(VESSEL_CFG.deathBeatSec) + 120);
}

await host.stop({ persist: false });

// =================================================================== R: THE RUN ROW ==
{
  const dir = mkdtempSync(joinPath(tmpdir(), 'shardunits-'));
  try {
    const seed = 0x5e4a7aa;
    const h1 = new ShardHost({ seed, saveDir: dir, open: true, log: () => { /* quiet */ } });
    await h1.ready();
    const clear = h1.world.exits.find(e => e.to !== '?')!.to;
    h1.world.completedObjectives.add(clear);
    h1.world.completedObjectives.add('gen_999999'); // ground the world half no longer carries
    h1.world.ledger.probe_units = 3;
    h1.world.throngClaimed.add('probe:pocket');
    h1.world.annexFound.add('probe:annex');
    h1.persist();
    await h1.stop({ persist: false });
    const file = joinPath(dir, `shard_${seed.toString(16).padStart(8, '0')}.json`);
    const saved = JSON.parse(readFileSync(file, 'utf-8')) as ShardSave;
    check('R save: the shard save carries THE RUN ROW', !!saved.run && saved.run.completedObjectives.includes(clear) && saved.run.ledger.probe_units === 3);
    const h2 = new ShardHost({ seed, saveDir: dir, open: true, log: () => { /* quiet */ } });
    await h2.ready();
    check('R resume: a restarted shard remembers its clears, run ledger, claims and annex finds (a clear off the chart drops)',
      h2.world.completedObjectives.has(clear) && !h2.world.completedObjectives.has('gen_999999') && h2.world.ledger.probe_units === 3
      && h2.world.throngClaimed.has('probe:pocket') && h2.world.annexFound.has('probe:annex'));
    await h2.stop({ persist: false });
    delete saved.run;
    writeFileSync(file, JSON.stringify(saved));
    const h3 = new ShardHost({ seed, saveDir: dir, open: true, log: () => { /* quiet */ } });
    await h3.ready();
    check('R tolerance: a save without the row still stands (absent = today)', h3.world.zone.id === START_ZONE && !h3.world.completedObjectives.has(clear));
    await h3.stop({ persist: false });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

restoreRandom();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
