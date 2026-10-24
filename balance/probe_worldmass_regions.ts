import assert from 'node:assert/strict';
import { ZONES } from '../src/data/zones';
import { TILESETS } from '../src/data/tilesets';
import { address, moveAddress, localOffset } from '../src/worldmass/address';
import { makeMassRun, MassGenerator } from '../src/worldmass/generator';
import type { MassSpec } from '../src/worldmass/contracts';
import { canonical } from '../src/worldmass/random';
import { MassRegions, nativeMassRegionCatalog, verifyMassRoute, massRouteCurrent, type MassRegionSpec } from '../src/worldmass/regions';
import { createMassWorldContext, massContextPosition, massContextLocal, admitMassWorldContext, MassActivityState } from '../src/worldmass/worldContexts';

const spec: MassSpec = {
  id: 'region-proof', version: 1, addressSpan: 960, terrainCell: 30,
  fields: [{ id: 'elevation', base: 0, layers: [] }],
  surfaces: [{ id: 'land', priority: 0, when: [], region: 'ground', color: '#123456', biome: 'downs' }],
  places: [{ id: 'native-site', version: 1, content: 'camp', period: 480, chance: 1, radius: 30, jitter: .3, when: [], priority: 0 }],
};
const generator = new MassGenerator(makeMassRun(71, 'region-life', spec), spec);
const policy: MassRegionSpec = { source: 'probe/regions', version: 1, cellsPerRegion: 2, maxQueryRegions: 9, maxPlaces: 128, cacheSize: 2 };
const source = { id: 'crossroads', source: 'data/zones', biomes: ['downs'], zone: structuredClone(ZONES.crossroads) };
const regions = new MassRegions(generator, policy, [source]);
const origin = address('surface', '0', '0', 0, 0, 960), initial = canonical(regions.at(origin));
source.zone.name = 'mutated registry lookalike';
assert.equal(regions.at(origin).native!.zone.name, ZONES.crossroads.name);
assert.ok(Object.isFrozen(regions.at(origin).native!.zone.theme));
assert.throws(() => { regions.at(origin).native!.zone.name = 'illegal edit'; });
const near = regions.near(origin, 1), ids = near.flatMap(r => r.places.map(p => p.id));
assert.equal(new Set(ids).size, ids.length, 'cross-boundary footprints have exactly one center owner');
for (const region of near) for (const place of region.places) assert.equal(regions.at(place.center).id, region.id);
assert.equal(regions.at(address('surface', '-1', '-1', 959, 959, 960)).rx, '-1', 'negative cells floor rather than truncate');
assert.equal(regions.at(address('surface', '2', '0', 0, 0, 960)).rx, '1');
for (const region of [...near].reverse()) regions.at(region.center);
assert.equal(canonical(regions.at(origin)), initial, 'cache eviction/query order cannot rewrite geographic truth');
assert.throws(() => regions.near(origin, 2), /budget/);
assert.throws(() => new MassRegions(generator, { ...policy, maxPlaces: 1 }).at(origin), /place budget/);
assert.throws(() => regions.at({ ...origin, x: 960 }), /Noncanonical/);
const far = regions.at(address('surface', '9007199254741000', '-9007199254741000', 0, 0, 960));
assert.equal(far.rx, '4503599627370500');
assert.notEqual(regions.at({ ...origin, dimension: 'cave' }).id, regions.at(origin).id);
const differentLife = new MassRegions(new MassGenerator(makeMassRun(71, 'other-life', spec), spec), policy);
assert.notEqual(differentLife.at(origin).id, regions.at(origin).id);
assert.equal(differentLife.at(origin).native, undefined, 'missing native context stays unsupported');
console.log('PASS bounded deterministic region ownership, negative/large addresses, dimensions, eviction and immutable native contexts');

const catalogue = nativeMassRegionCatalog();
assert.ok(catalogue.length > 5, 'full native inventory exceeds the five prototype climates');
for (const row of catalogue) {
  assert.notEqual(row.definition.frontier, false); assert.ok(!row.definition.realm && !row.definition.boundless);
  assert.equal(canonical(row.definition), canonical(JSON.parse(JSON.stringify(TILESETS[row.id]))));
}
assert.ok(Object.isFrozen(catalogue[0].definition.theme));
console.log(`PASS ${catalogue.length} native surface recipe snapshots retain their complete content without claiming runtime support`);

const a = { run: 'region-life', id: 'a', center: moveAddress(origin, { x: 100, y: 100 }, 960) };
const b = { run: 'region-life', id: 'b', center: moveAddress(origin, { x: 500, y: 100 }, 960) };
const routePolicy = { source: 'probe/corridor', addressSpan: 960, bodyRadius: 18, maxLength: 1000, maxSegments: 8 };
let calls = 0;
// A narrow solid vertical wall crosses the middle of the route. Both ends are
// standable: endpoint-only "validation" would incorrectly admit this edge.
const wall = { revision: 'wall-1', sweep: (from: typeof origin, to: typeof origin, radius: number) => {
  calls++;
  const p = localOffset(from, origin, 960), q = localOffset(to, origin, 960);
  return Math.max(p.x, q.x) + radius < 299 || Math.min(p.x, q.x) - radius > 301
    || Math.min(p.y, q.y) - radius > 140 || Math.max(p.y, q.y) + radius < 60;
} };
assert.equal(verifyMassRoute(a, b, [a.center, b.center], routePolicy, wall), null);
const path = [a.center, moveAddress(a.center, { x: 0, y: 100 }, 960), moveAddress(b.center, { x: 0, y: 100 }, 960), b.center];
const route = verifyMassRoute(a, b, path, routePolicy, wall)!; assert.ok(route);
assert.equal(route.length, 600); assert.equal(route.mode, 'walk');
assert.equal(canonical(verifyMassRoute(b, a, [...path].reverse(), routePolicy, wall)), canonical(route));
assert.ok(massRouteCurrent(route, 'wall-1', 18));
assert.equal(massRouteCurrent(route, 'wall-2', 18), false);
assert.equal(massRouteCurrent(route, 'wall-1', 19), false);
const before = calls;
assert.equal(verifyMassRoute(a, { ...b, run: 'other-life' }, path, routePolicy, wall), null);
assert.equal(verifyMassRoute(a, { ...b, center: { ...b.center, dimension: 'cave' } }, path, routePolicy, wall), null);
assert.equal(verifyMassRoute(a, b, path, { ...routePolicy, maxLength: 300 }, wall), null);
assert.equal(verifyMassRoute(a, b, path, { ...routePolicy, maxSegments: 2 }, wall), null);
assert.equal(calls, before, 'invalid/unbounded routes never invoke geometry');
console.log('PASS routes require complete physical clearance; obstructed, foreign, cross-dimension, stale and oversized edges refuse');

const contextSpec = { id: 'native-camp', owner: a, source: { registry: 'data/zones', id: 'crossroads', version: 1 },
  origin, addressSpan: 960, zone: structuredClone(ZONES.crossroads), requirements: ['terrain', 'doors'],
  anchors: [{ id: 'entry', position: { x: 100, y: 100 }, tier: 0 }] };
const context = createMassWorldContext(contextSpec);
assert.equal(canonical(context.zone), canonical(ZONES.crossroads));
assert.ok(context.requirements.includes('objective:' + context.zone.objective.kind));
assert.ok(context.requirements.includes('state'));
assert.deepEqual(massContextLocal(context, massContextPosition(context, { x: -20, y: 2050 })), { x: -20, y: 2050 });
assert.throws(() => massContextLocal(context, { ...origin, dimension: 'cave' }));
assert.equal(admitMassWorldContext(context, []).admissible, false);
const partial = { id: 'terrain-owner', provides: ['terrain', 'doors'], refuses: () => null };
assert.ok(admitMassWorldContext(context, [partial]).missing.includes('state'));
const full = { id: 'native-controller', provides: context.requirements, refuses: () => null };
assert.equal(admitMassWorldContext(context, [full]).admissible, true);
assert.equal(admitMassWorldContext(context, [{ ...full, refuses: () => 'unimplemented variant' }]).admissible, false);
assert.throws(() => admitMassWorldContext(context, [full, full]));
contextSpec.zone.name = 'changed after snapshot'; assert.equal(context.zone.name, ZONES.crossroads.name);
const state = new MassActivityState(context), receipt = { run: context.owner.run, context: context.id,
  id: 'guardian/1', source: 'native/kill', subject: 'camp/original/1', kind: 'defeated' };
assert.equal(state.record(receipt, 0), false, 'unadmitted activity cannot write facts');
assert.equal(state.transition('complete', 0), false, 'unvisited empty scenes cannot complete');
assert.ok(state.transition('active', 0)); assert.ok(state.record(receipt, 1));
assert.equal(state.record({ ...receipt, id: 'foreign', context: 'other-camp' }, 2), false);
assert.equal(state.record({ ...receipt, id: 'foreign', run: 'other-life' }, 2), false);
assert.equal(state.record(receipt, 2), false, 'one native event only has one receipt');
assert.equal(state.transition('dormant', 1), false, 'stale writers cannot change lifecycle');
assert.ok(state.transition('dormant', 2));
const saved = state.snapshot(), continued = new MassActivityState(context, saved);
assert.equal(canonical(continued.snapshot()), canonical(saved));
assert.equal(continued.record({ ...receipt, id: 'guardian/2' }, continued.revision), false);
assert.ok(continued.transition('active', continued.revision));
assert.ok(continued.transition('complete', continued.revision));
assert.equal(continued.transition('active', continued.revision), false, 'finished activity cannot reset on residency');
assert.throws(() => new MassActivityState(context, { ...saved, run: 'other-life' }));
assert.throws(() => new MassActivityState(context, { ...saved, definitionHash: 'other-layout' }));
assert.throws(() => new MassActivityState(context, { ...saved, receipts: [receipt, receipt] }));
assert.equal(state.has(receipt.id), true);
console.log('PASS exact native context preservation, explicit capability refusals and once-only ownership receipts across dormancy/Continue');
