import assert from 'node:assert/strict';
import { address, cellInteger, cellKey, latticeAt, localOffset, moveAddress, neighborCell } from '../src/worldmass/address';
import { canonical, massRandom } from '../src/worldmass/random';
import type { MassSpec } from '../src/worldmass/contracts';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { MassState } from '../src/worldmass/state';
import { MassStream } from '../src/worldmass/stream';
import { MassWalk } from '../src/worldmass/walk';
import { castRay } from '../src/engine/los';

let passed = 0;
function test(name: string, fn: () => void): void { fn(); passed++; console.log('PASS ' + name); }
const spec: MassSpec = {
  id: 'probe:land', version: 1, addressSpan: 240, terrainCell: 30,
  fields: [
    { id: 'elevation', base: 0.5, layers: [{ id: 'hills', period: 913, amplitude: 0.45 }] },
    { id: 'moisture', base: 0.5, layers: [{ id: 'rain', period: 557, amplitude: 0.4 }] },
  ],
  surfaces: [
    { id: 'stone', priority: 2, when: [{ field: 'elevation', min: 0.6 }], region: 'wall', color: '#555555', biome: 'highland' },
    { id: 'wet', priority: 1, when: [{ field: 'moisture', min: 0.6 }], region: 'water', color: '#334477', biome: 'marsh' },
    { id: 'land', priority: 0, when: [], region: 'ground', color: '#557744', biome: 'field' },
  ],
  places: [{ id: 'camp', version: 1, content: 'probe:camp', period: 350, chance: 1,
    radius: 130, jitter: 0.7, when: [], priority: 1 }],
};
const run = makeMassRun(123456, 'test-run', spec), gen = new MassGenerator(run, spec);
const origin = address('surface', '0', '0', 0, 0, spec.addressSpan);
const at = (x: number, y: number) => moveAddress(origin, { x, y }, spec.addressSpan);

test('signed addresses, extreme precision, and input rejection', () => {
  const p = address('surface', '9007199254740993', '-9007199254740993', -0.25, 481.5, 240);
  assert.equal(p.cx, '9007199254740992'); assert.equal(p.x, 239.75);
  assert.equal(p.cy, '-9007199254740991'); assert.equal(p.y, 1.5);
  const q = moveAddress(p, { x: 501.125, y: -720.25 }, 240);
  assert.deepEqual(localOffset(q, p, 240), { x: 501.125, y: -720.25 });
  assert.deepEqual(moveAddress(q, { x: -501.125, y: 720.25 }, 240), p);
  for (const s of ['01', '-0', '1e4', '', '9223372036854775808']) assert.throws(() => cellInteger(s));
  assert.throws(() => address('surface', '9223372036854775807', '0', 240, 0, 240));
  assert.throws(() => localOffset(at(2400000, 0), origin, 240));
  assert.throws(() => localOffset({ ...origin, dimension: 'cave' }, origin, 240));
  assert.throws(() => at(NaN, 0));
  assert.notEqual(cellKey({ ...origin, dimension: 'a,0' }), cellKey({ ...origin, dimension: 'a' }));
});
test('generation lattice does not depend on address-page representation', () => {
  for (const x of [-9781.25, -240, -0.125, 0, 240, 1478.375]) {
    const a = address('surface', '0', '0', x, -x, 240), b = address('surface', '0', '0', x, -x, 960);
    assert.deepEqual(latticeAt(a, 240, 557), latticeAt(b, 960, 557));
  }
});
test('manifest validation and stream isolation', () => {
  assert.equal(canonical({ b: 1, a: [2, 3] }), canonical({ a: [2, 3], b: 1 }));
  for (const v of [undefined, NaN, Infinity, new Map(), { a: undefined }, [undefined]]) assert.throws(() => canonical(v));
  const loop: { self?: unknown } = {}; loop.self = loop; assert.throws(() => canonical(loop));
  assert.throws(() => makeMassRun(1, 'x', { ...spec, terrainCell: 31 }));
  assert.throws(() => makeMassRun(1, 'x', { ...spec, surfaces: [] }));
  assert.throws(() => makeMassRun(1, 'x', { ...spec, fields: [...spec.fields, spec.fields[0]] }));
  assert.throws(() => new MassGenerator({ ...run, manifest: 'changed' }, spec));
  assert.throws(() => new MassGenerator(run, { ...spec, version: 2 }));
  const first = massRandom(8, ['place', 'camp', '-1', '2']), expected = Array.from({ length: 12 }, () => first.next());
  const other = massRandom(8, ['decoration', 'tree']); for (let i = 0; i < 900; i++) other.next();
  const again = massRandom(8, ['place', 'camp', '-1', '2']);
  assert.deepEqual(Array.from({ length: 12 }, () => again.next()), expected);
});
test('order-independent, continuous terrain and isolated concurrent worlds', () => {
  const points = Array.from({ length: 50 }, (_, i) => at(i * 109.13 - 1800, i * -59.23));
  const before = points.map(p => canonical(gen.terrainAt(p)));
  const second = new MassGenerator(makeMassRun(999, 'other-run', spec), spec);
  for (const p of [...points].reverse()) { second.terrainAt(p); gen.terrainAt(p); }
  assert.deepEqual(points.map(p => canonical(gen.terrainAt(p))), before);
  assert.notDeepEqual(points.map(p => second.fieldsAt(p)), points.map(p => gen.fieldsAt(p)));
  const edge = at(240, -480);
  const a = gen.fieldsAt(moveAddress(edge, { x: -1e-5, y: 0 }, 240)), b = gen.fieldsAt(moveAddress(edge, { x: 1e-5, y: 0 }, 240));
  for (const id of Object.keys(a)) assert.ok(Math.abs(a[id] - b[id]) < 1e-6, id + ' continuity');
  const huge = address('surface', '9007199254740993', '9007199254740992', 17.5, 0, 240);
  assert.notDeepEqual(gen.fieldsAt(huge), gen.fieldsAt({ ...huge, cx: '9007199254740992' }));
  assert.notDeepEqual(gen.fieldsAt(origin), gen.fieldsAt({ ...origin, dimension: 'underworld' }));
  const mutable = JSON.parse(canonical(spec)) as MassSpec, frozen = new MassGenerator(run, mutable);
  (mutable.fields[0] as { base: number }).base = 900;
  assert.deepEqual(frozen.fieldsAt(origin), gen.fieldsAt(origin));
});
test('cross-page places retain ownership, non-overlap, and stable discovery', () => {
  const cells = Array.from({ length: 25 }, (_, i) => neighborCell(origin, i % 5 - 2, Math.floor(i / 5) - 2));
  const before = new Map(cells.map(c => [cellKey(c), canonical(gen.placesInCell(c))]));
  const all = new Map<string, ReturnType<MassGenerator['placesInCell']>[number]>(); let repeats = 0;
  for (const c of [...cells].reverse()) {
    assert.equal(canonical(gen.placesInCell(c)), before.get(cellKey(c)));
    for (const p of gen.placesInCell(c)) { if (all.has(p.id)) repeats++; all.set(p.id, p); }
  }
  assert.ok(all.size >= 3, 'nonempty roster'); assert.ok(repeats > 0, 'footprints cross page edges');
  const list = [...all.values()];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const d = localOffset(list[i].center, list[j].center, 240);
    assert.ok(Math.hypot(d.x, d.y) >= list[i].radius + list[j].radius, 'accepted footprints do not overlap');
  }
});
test('stream cancellation, work budgets, atomic publication, and bounded caches', () => {
  const state = new MassState(gen.run, 30), stream = new MassStream(gen, state, { maxPages: 4, maxSamples: 100 });
  stream.request([origin, neighborCell(origin, 1, 0)]);
  assert.equal(stream.step(1).sampled, 1); assert.equal(stream.page(origin), undefined);
  const far = neighborCell(origin, 70, -30); stream.request([far]); stream.step(64);
  assert.equal(stream.page(origin), undefined, 'cancelled job never publishes'); assert.equal(stream.page(far)?.samples.length, 64);
  for (let i = 0; i < 30; i++) { stream.request([neighborCell(origin, i, -i)]); stream.step(64); }
  assert.ok(stream.stats.resident <= 4); assert.ok(stream.stats.samples <= 100);
  assert.throws(() => stream.request(Array.from({ length: 5 }, (_, i) => neighborCell(origin, i, 0))));
  assert.throws(() => stream.step(Infinity));
  const sample = canonical(stream.sample(at(721, -64))); stream.request([origin]); stream.step(64);
  assert.equal(canonical(stream.sample(at(721, -64))), sample, 'eviction never rerolls terrain');
});
test('saved changes and single claims survive eviction; failed restore is atomic', () => {
  const state = new MassState(gen.run, 30), stream = new MassStream(gen, state, { maxPages: 4, maxSamples: 100 });
  stream.request([origin]); stream.step(64);
  state.paint({ address: at(13, 14), region: 'ground', color: '#123456', cause: 'player:bridge:one' });
  assert.equal(stream.sample(at(1, 1)).color, '#123456'); assert.equal(stream.page(origin), undefined);
  stream.step(64); assert.equal(stream.page(origin)?.samples[0].source.source, 'player:bridge:one');
  assert.equal(state.claim('loot', 'camp:one:chest'), true); assert.equal(state.claim('loot', 'camp:one:chest'), false);
  const save = JSON.parse(JSON.stringify(state.snapshot())), restored = new MassState(gen.run, 30); restored.restore(save);
  assert.equal(restored.claim('loot', 'camp:one:chest'), false); assert.equal(restored.patchAt(at(29, 29))?.color, '#123456');
  const before = canonical(restored.snapshot());
  assert.throws(() => restored.restore({ ...save, claims: [['loot', 'duplicate'], ['loot', 'duplicate']] }));
  assert.equal(canonical(restored.snapshot()), before);
  assert.throws(() => restored.restore({ ...save, run: { ...save.run, seed: 7 } }));
  assert.equal(canonical(restored.snapshot()), before);
  save.terrain[0].color = '#ffffff'; assert.equal(restored.patchAt(at(1, 1))?.color, '#123456');
});
test('worldmass movement, weighted routes, and shared rays cross negative page boundaries', () => {
  const flat: MassSpec = { ...spec, surfaces: [{ id: 'land', priority: 0, when: [], region: 'ground', color: '#557744', biome: 'field' }] };
  const g = new MassGenerator(makeMassRun(123, 'navigation', flat), flat), state = new MassState(g.run, 30);
  const stream = new MassStream(g, state, { maxPages: 4, maxSamples: 4096 });
  const walk = new MassWalk(stream, origin);
  const paint = (x: number, y: number, region: string): void => state.paint({ address: at(x, y), region, color: '#334455', cause: 'probe' });
  for (let y = -90; y <= 60; y += 30) paint(-30, y, 'wall');
  const from = { x: -75, y: -15 }, to = { x: 45, y: -15 };
  assert.equal(walk.lineWalkable(from, to), false);
  const step = walk.pathStep(from, to); assert.ok(step); assert.ok(walk.isWalkable(step.x, step.y));
  assert.ok(walk.reachable(from, to), 'can route around the finite outcrop');
  const hit = castRay({ walk, doodadsAt: () => [] }, from, to, 'shot');
  assert.ok(hit); assert.equal(hit.x, -30); assert.equal(hit.kind, 'region');
  assert.ok(castRay({ walk, doodadsAt: () => [] }, from, to, 'sight'));
  paint(-30, -30, 'ground'); walk.beginFrame();
  assert.equal(walk.lineWalkable(from, to), true);
  assert.equal(castRay({ walk, doodadsAt: () => [] }, from, to, 'shot'), null, 'terrain edits update rays immediately');
  paint(-30, -30, 'mud');
  assert.equal(walk.linePreferred(from, to, { key: 'dry', costOf: id => id === 'mud' ? 8 : 1 }), false);
  assert.equal(walk.linePreferred(from, to, { key: 'mud-lover', costOf: () => 1 }), true);
  const ready = state.terrainRevision; state.claim('explored', 'test'); assert.equal(state.terrainRevision, ready);
  assert.ok(walk.isWalkable(-15, -15), 'mud keeps native walkability');
});
console.log(`PASS worldmass: ${passed} contract groups`);
