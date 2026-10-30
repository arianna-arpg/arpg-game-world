import assert from 'node:assert/strict';
import type { Actor } from '../src/engine/actor';
import type { Vec2 } from '../src/core/math';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure } from '../src/worldmass/preset';
import type { MassPlace } from '../src/worldmass/contracts';
import type { MassJourney } from '../src/worldmass/journey';
import type { MassFocus } from '../src/worldmass/foci';
import { localOffset } from '../src/worldmass/address';
import { canonical, freezeData } from '../src/worldmass/random';
import { massFormation } from '../src/worldmass/encounters';
import { ambientCohort } from '../src/worldmass/ambientPacks';
import { nativeMassPuzzle } from '../src/worldmass/puzzles';

// Keep the pre-optimization calculation as an independent oracle. In particular,
// it rebuilds candidates and re-reads all mutable owners on every query.
type Internals = {
  natives: Map<string, Actor>; paged: Map<string, string>;
  places: Map<string, readonly MassPlace[]>; massFociInitialized: boolean;
  nextPopulation: number;
  reservedPopulation(except: string, at?: Vec2): number;
  populationReservations(): ReadonlyMap<string, MassPlace>;
};
const guts = (m: WorldMassRuntime) => m as unknown as Internals;
function candidates(m: WorldMassRuntime): Map<string, MassPlace> {
  const result = new Map((m.journey?.spec.reservePopulation ? m.journey.places : []).map(p => [p.id, p]));
  if (m.journey?.spec.nearbyReservations) for (const rows of guts(m).places.values()) for (const p of rows)
    if (m.config.content.find(c => c.id === p.content)?.site) result.set(p.id, p);
  return result;
}
function baselineReserved(m: WorldMassRuntime, except: string, at?: Vec2): number {
  let missing = at && m.massFoci.groups.length > 1
    ? m.massFoci.populationAt(at, m.geography?.massReservationSlots(except) ?? [])
    : m.geography?.reservedPopulation(except) ?? 0;
  const rows = candidates(m), current = m.journey?.spec.nearbyReservations ? rows.get(except) : undefined;
  const local = (p: MassPlace) => localOffset(p.center, { ...m.origin, x: 0, y: 0 }, m.config.terrain.addressSpan);
  const distance = (p: MassPlace) => Math.max(0, m.massFoci.distance(local(p)) - p.radius);
  if (m.journey?.spec.nearbyReservations && except && !current) return missing;
  for (const p of rows.values()) {
    if (p.id === except) continue;
    const pos = local(p);
    if (at && m.massFoci.groups.length > 1 && m.massFoci.groupAt(at) !== m.massFoci.groupAt(pos)) continue;
    if (current && m.massFoci.groupAt(pos) === m.massFoci.groupAt(local(current))
      && (distance(p) > distance(current) || distance(p) === distance(current) && p.id > current.id)) continue;
    if (m.journey?.spec.nearbyReservations && m.massFoci.distance(local(p))
      > (m.dormancy?.policy.sleepRadius ?? m.config.populationRadius) + m.config.populationRadius + p.radius) continue;
    const content = m.config.content.find(c => c.id === p.content)!;
    const count = massFormation(m.populationFor(p).encounters, m.generator.run.seed, p.id)?.seats.length
      ?? ambientCohort(content.ambientPack, m.populationFor(p), m.generator.run.seed, p.id)?.length ?? content.count;
    const ids = [...Array.from({ length: count }, (_, i) => canonical([p.id, i])),
      ...(content.site?.fixtures ?? []).map((_, i) => canonical([p.id, 'fixture', i]))];
    missing += ids.filter(id => !guts(m).natives.has(id) && !guts(m).paged.has(id) && !m.state.claimed('fallen', id)).length
      + m.puzzles.missing(p, content.site?.puzzles ?? [])
      - (m.journey?.spec.nearbyReservations ? m.puzzles.retainedSeats(p, content.site?.puzzles ?? []) : 0);
  }
  return missing;
}
function baselineLimit(m: WorldMassRuntime, except: string, at?: Vec2): number {
  const groups = guts(m).massFociInitialized ? m.massFoci.groups.length : 1, total = m.population;
  const global = m.config.maxPopulation * groups;
  if (groups <= 1 || !at) return global - baselineReserved(m, except);
  const slots = m.massPopulationSlots(), unlocated = Math.max(0, total - slots.reduce((n, r) => n + r.count, 0));
  return Math.min(global, total + m.config.maxPopulation - m.massFoci.populationAt(at, slots) - unlocated - baselineReserved(m, except, at));
}
let comparisons = 0;
function compare(m: WorldMassRuntime, label: string, positions: readonly Vec2[], extraOwners: readonly string[] = []): void {
  const owners = ['', 'absent-geographic-owner', ...candidates(m).keys(), ...extraOwners];
  for (const except of new Set(owners)) for (const at of [undefined, ...positions]) {
    assert.equal(guts(m).reservedPopulation(except, at), baselineReserved(m, except, at), label + ': reserved ' + except);
    assert.equal(m.populationLimit(except, at), baselineLimit(m, except, at), label + ': limit ' + except);
    assert.equal(m.availablePopulation(except, at), Math.max(0, baselineLimit(m, except, at) - m.population), label + ': available ' + except);
    comparisons += 3;
  }
  assert.deepEqual([...guts(m).populationReservations()], [...candidates(m)], label + ': exact candidate identity and order');
}
function fixtureConfig() {
  const cfg = structuredClone(massAdventure());
  delete cfg.settlement; delete cfg.journey; delete cfg.ecology; delete cfg.progression;
  delete cfg.nativeCountry; delete cfg.geography; delete cfg.wildernessPaths;
  delete cfg.terrain.patches; delete cfg.terrain.landforms; delete cfg.terrain.regionalDiscoveries; delete cfg.terrain.nativeRegional;
  cfg.terrain.fields = [];
  cfg.terrain.surfaces = [{ id: 'land', priority: 0, when: [], region: 'ground', color: '#445522', biome: 'downs' }];
  cfg.terrain.places = [{ id: 'focus', version: 1, content: 'focus', period: 1800, radius: 250, jitter: 0, chance: 1, when: [], priority: 1 }];
  cfg.content = [{ id: 'focus', source: 'probe/reservation-work', count: 4, level: 1, table: [{ id: 'skeleton_warrior', weight: 1 }],
    site: { name: 'Focus clearing', source: 'probe/reservation-work', doodads: [], fixtures: [] } },
  { id: 'board', source: 'probe/reservation-board', count: 0, level: 1, table: [{ id: 'skeleton_warrior', weight: 1 }],
    site: { name: 'Retained board', source: 'probe/reservation-board', doodads: [], fixtures: [],
      puzzles: [nativeMassPuzzle('charged_lattice', 0, 0, 'Strike the lattice.')] } }];
  cfg.startRadius = 0; cfg.populationRadius = 600; cfg.maxPopulation = 32; cfg.pageRadius = 1;
  return cfg;
}

const undo = seedGlobalRandom(817243), config = fixtureConfig();
const w = makeSimWorld('warrior', 19), m = new WorldMassRuntime(19, 'reservation-work:19', config);
const left: MassFocus = { id: 'a', pos: { x: 900, y: 900 }, tier: 0 };
const right: MassFocus = { id: 'b', pos: { x: 6300, y: 900 }, tier: 0 };
const positions = [left.pos, right.pos, { x: 3600, y: 900 }];
const focus = (rows: readonly MassFocus[]) => { m.massFoci.set(rows, config.populationRadius); guts(m).massFociInitialized = true; };
const place = (id: string, x: number, content = 'focus'): MassPlace => freezeData({
  id, recipe: 'probe-reservation', content, center: m.walk.at(x, 900), radius: 250,
  source: { generator: m.generator.spec.id, version: m.generator.spec.version, rule: id, source: 'probe/reservation-work', stream: id },
});
// The query-only journey fixture supplies immutable descriptors. No journey
// generation methods are called here; the second course uses a real journey.
const journey = (places: readonly MassPlace[], nearby = true, reserve = true): MassJourney => ({
  spec: { nearbyReservations: nearby, reservePopulation: reserve }, places: Object.freeze([...places]),
}) as unknown as MassJourney;
try {
  m.attach(w);
  guts(m).places.clear(); // Establish the query fixture before its first cached query.
  m.journey = journey([]); focus([left, right]);
  compare(m, 'empty candidate set', positions);
  const a = place('a-tied', 700), b = place('b-tied', 1100), distant = place('distant', 6300);
  m.journey = journey([b, a, distant]);
  compare(m, 'journey installed after an empty query', positions);
  assert.equal(guts(m).reservedPopulation(a.id, left.pos), 0, 'lexically earlier tied destination has first claim');
  assert.equal(guts(m).reservedPopulation(b.id, left.pos), 4, 'equal distance retains lexical identity priority, regardless of insertion order');
  assert.equal(guts(m).reservedPopulation('', left.pos), 8);
  for (const rows of [[right, left], [left, { ...right, pos: { x: 950, y: 900 } }], [], [left], [left, right]]) {
    focus(rows); compare(m, 'reversed/merged/empty/single/split foci', positions);
  }
  const sameTime = w.time, nativeId = canonical([a.id, 0]);
  const body = w.createMonster('skeleton_warrior', 1, 'enemy'); body.pos = { ...left.pos }; body.fillResources();
  guts(m).natives.set(nativeId, body);
  assert.equal(guts(m).reservedPopulation('', left.pos), 7); compare(m, 'same-tick live birth', positions);
  body.pos = { ...right.pos }; compare(m, 'same-tick body crosses group boundary', positions);
  body.dead = true; body.life = 0;
  compare(m, 'same-tick casualty before owner cleanup', positions);
  guts(m).natives.delete(nativeId); m.state.claim('fallen', nativeId);
  assert.equal(guts(m).reservedPopulation('', left.pos), 7); compare(m, 'casualty cleanup does not reserve a respawn', positions);
  const sleepingId = canonical([a.id, 1]), sleeper = w.createMonster('skeleton_warrior', 1, 'enemy');
  sleeper.pos = { ...left.pos }; sleeper.fillResources(); guts(m).natives.set(sleepingId, sleeper);
  m.dormancy!.adoptSleeping([sleeper]);
  assert.equal(m.population, 0); assert.equal(guts(m).reservedPopulation('', left.pos), 6);
  compare(m, 'sleeping owner retains its seat identity', positions);
  m.dormancy!.release([sleeper]); guts(m).natives.delete(sleepingId); guts(m).paged.set(sleepingId, 'probe/native-page');
  compare(m, 'parked page retains ownership after resident release', positions);
  assert.equal(guts(m).reservedPopulation('', left.pos), 6);
  guts(m).paged.delete(sleepingId);
  assert.equal(guts(m).reservedPopulation('', left.pos), 7); compare(m, 'removed unclaimed owner is immediately missing', positions);
  assert.equal(w.time, sameTime, 'ownership comparisons occur without a new tick');
  console.log('PASS exact baseline accounting through live, moved, dead, sleeping and parked same-tick owners, ties and focus transitions');

  m.journey = journey([distant], false); compare(m, 'legacy finite journey reservations', positions);
  m.journey = journey([distant], true, false); compare(m, 'reserve flag omitted/disabled', positions);
  m.journey = journey([a, b]); compare(m, 'journey identity replacement', positions);
  const replacement = m.journey as unknown as { places: readonly MassPlace[]; spec: { reservePopulation: boolean; nearbyReservations: boolean } };
  replacement.places = Object.freeze([distant]); compare(m, 'journey descriptor-array replacement', positions);
  replacement.spec.reservePopulation = false; compare(m, 'journey reservation flag change', positions);
  replacement.spec.reservePopulation = true; replacement.spec.nearbyReservations = false;
  compare(m, 'journey proximity flag change', positions);

  const board = place('retained-board', 900, 'board'), boardRows = m.config.content.find(c => c.id === 'board')!.site!.puzzles!;
  m.journey = journey([board]); focus([left, right]);
  assert.equal(guts(m).reservedPopulation('', left.pos), 9);
  m.puzzles.admit(w, board, { rows: boardRows, center: left.pos, level: 1 });
  assert.equal(m.puzzles.population, 9); assert.equal(guts(m).reservedPopulation('', left.pos), 0);
  compare(m, 'real complete native puzzle admitted', positions);
  const checkpoint = m.puzzles.snapshot(w)[0]; assert.ok(checkpoint);
  w.player.pos = { x: -18000, y: -18000 }; focus([{ ...left, pos: w.player.pos }]);
  m.puzzles.sync(w);
  assert.equal(m.puzzles.population, 0); assert.equal(m.puzzles.snapshot(w)[0].resident, false);
  focus([left, right]);
  assert.equal(m.puzzles.missing(board, boardRows), 9); assert.equal(m.puzzles.retainedSeats(board, boardRows), 9);
  assert.equal(guts(m).reservedPopulation('', left.pos), 0, 'dormant saved board is retained, not newly funded');
  compare(m, 'retained puzzle seats before restoration', positions);
  m.puzzles.admit(w, board, { rows: boardRows, center: left.pos, level: 1 });
  assert.equal(m.puzzles.population, 9);
  assert.deepEqual(m.puzzles.snapshot(w)[0].progress, checkpoint.progress, 'return preserves exact native puzzle state');
  compare(m, 'restored native puzzle accounting', positions);
  w.player.pos = { x: -18000, y: -18000 }; focus([{ ...left, pos: w.player.pos }]); m.puzzles.sync(w); focus([left, right]);
  console.log('PASS real nine-node native puzzle admission, retained dormancy and exact return across repeated capacity queries');

  const reserved = [{ owner: 'geo-left', pos: left.pos, count: 6 }, { owner: 'geo-right', pos: right.pos, count: 5 }];
  const slots = [{ pos: { ...left.pos }, count: 2 }, { pos: { ...right.pos }, count: 3 }];
  let total = 9;
  m.geography = {
    get population() { return total; }, massPopulationSlots: () => slots,
    massReservationSlots: (except?: string) => reserved.filter(r => r.owner !== except),
    reservedPopulation: (except?: string) => reserved.filter(r => r.owner !== except).reduce((n, r) => n + r.count, 0),
  } as unknown as NonNullable<WorldMassRuntime['geography']>;
  compare(m, 'geographic owners with four unlocated seats', positions, ['geo-left', 'geo-right']);
  assert.equal(guts(m).reservedPopulation('absent-geographic-owner', left.pos), 6,
    'absent destination owner bypasses ordinary sites while retaining geographic promises');
  assert.equal(m.availablePopulation('geo-left', left.pos), config.maxPopulation - 2 - 4,
    'own promise is excluded; local bodies and all unlocated seats remain charged');
  total = 11; compare(m, 'new same-tick in-flight unlocated reservation', positions, ['geo-left', 'geo-right']);
  assert.equal(m.availablePopulation('geo-left', left.pos), config.maxPopulation - 2 - 6);
  slots[0].pos = { ...right.pos }; compare(m, 'same-tick geographic body movement', positions, ['geo-left', 'geo-right']);
  reserved.splice(0, 1); compare(m, 'geographic promise completed or lost', positions, ['geo-left', 'geo-right']);
  m.geography = null;
  console.log('PASS geographic owner exclusion, absent-owner priority, moving bodies and fresh conservative unlocated reservations');
} finally { m.geography = null; m.dispose(); }

// Drive real page deletion/insertion/empty-focus clearing, with a real installed
// journey. Skip unrelated births while exercising the actual update boundary.
const pageConfig = fixtureConfig(), nativeTown = massAdventure().settlement!;
pageConfig.settlement = { zone: nativeTown.zone, source: nativeTown.source, apron: nativeTown.apron, blend: nativeTown.blend };
pageConfig.journey = { source: 'probe/reservation-pages', width: 90, color: '#665544', clearingColor: '#665544',
  reservePopulation: true, nearbyReservations: true,
  destinations: [{ id: 'opening', content: 'focus', edge: 'east', distance: 1800, radius: 250, jitter: 0 }] };
const pw = makeSimWorld('warrior', 24), pm = new WorldMassRuntime(19, 'reservation-pages:19', pageConfig);
try {
  pm.attach(pw); guts(pm).nextPopulation = Infinity;
  const near = { ...left, pos: { x: 9900, y: 9900 } }, far = { ...right, pos: { x: 15300, y: 9900 } };
  compare(pm, 'actual journey boot', [near.pos, far.pos]);
  pm.update(pw, false, [near, far]); compare(pm, 'actual distant page insertion', [near.pos, far.pos]);
  const first = new Set(candidates(pm).keys());
  assert.ok(first.size > pm.journey!.places.length, 'actual terrain pages contribute reservation candidates');
  pm.update(pw, false, [far, near]); compare(pm, 'actual reversed page order', [near.pos, far.pos]);
  pm.update(pw, false, [near, { ...far, pos: { x: 9950, y: 9900 } }]);
  compare(pm, 'actual merged page deletion', [near.pos, far.pos]);
  assert.ok([...first].some(id => !candidates(pm).has(id)), 'merge removes distant page candidates');
  const moved = { ...near, pos: { x: 24300, y: 15300 } };
  pm.update(pw, false, [moved]); compare(pm, 'actual page replacement', [near.pos, moved.pos]);
  assert.ok([...candidates(pm).keys()].some(id => !first.has(id)), 'travel installs new candidate identities');
  pm.update(pw, false, []); compare(pm, 'actual empty-focus page clear', [near.pos, far.pos]);
  assert.equal(guts(pm).places.size, 0);
  assert.deepEqual([...candidates(pm).keys()], pm.journey!.places.map(p => p.id));
  pm.update(pw, false, [near, far]); compare(pm, 'actual split after empty shard', [near.pos, far.pos]);
  assert.deepEqual(new Set(candidates(pm).keys()), first);
  console.log('PASS real journey and terrain-page insertion, replacement, merge, empty clearing and split invalidate reservation candidates');
} finally { pm.dispose(); undo(); }
console.log('PASS ' + comparisons + ' reservation, population-limit and available-seat comparisons against the pre-optimization oracle');
