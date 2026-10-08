import assert from 'node:assert/strict';
import { captureNativeGeographySource } from '../src/world/captureGeography';
import { createNativeGeographyReader } from '../src/world/geographySource';
import { makeMassNativeGeographySpec, MassNativeGeography, type MassNativeMapping } from '../src/worldmass/nativeGeography';
import { address, moveAddress } from '../src/worldmass/address';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import type { MassSpec } from '../src/worldmass/contracts';
import { MassStream } from '../src/worldmass/stream';
import { validateMassPatches } from '../src/worldmass/terrainPatches';
import { MassState } from '../src/worldmass/state';
import { MassWalk } from '../src/worldmass/walk';
import { canonical } from '../src/worldmass/random';
const source = captureNativeGeographySource(713), reader = createNativeGeographyReader(source);
const mapping: MassNativeMapping = { schema: 1, algorithm: 'bigint-relative-native-map-v1', addressSpan: 960,
  physicalOrigin: address('surface', '9007199254740993', '-9007199254740993', 0, 0, 960), nativeOrigin: { x: -35, y: 160 },
  physicalUnitsPerNativeUnit: { numerator: '20', denominator: '1' }, nativeDimension: 'surface',
  nativeBounds: { minX: -20000, minY: -20000, maxX: 20000, maxY: 20000 }, outsideDomain: 'refuse', rounding: 'nearest-binary64-ties-even-once' };
const geography = makeMassNativeGeographySpec(JSON.stringify(source), mapping), field = new MassNativeGeography(geography);
// Explicit test substrate vocabulary. Ground outside complete area layouts is
// authored policy, not a fabricated native face or full main generation claim.
const spec: MassSpec = { id: 'probe-native-substrate', version: 1, addressSpan: 960, terrainCell: 30,
  nativeSubstrate: { schema: 1, policy: 'native-field-substrate-v1', geography },
  fields: [...new Set(source.climate.axes.map(([, axis]) => axis.id)), 'nativeDepth'].map(id => ({ id, base: 0, layers: [] })),
  surfaces: source.biomes.map(([biome, row]) => ({ id: biome, biome, source: 'captured-biome/' + biome + '/test-substrate',
    priority: 0, when: [], region: row.marine || row.virtual ? 'water' : biome === 'desert' ? 'sand' : 'ground', color: row.mapColor })),
  places: [], patches: { source: 'native-substrate-local-wetness', version: 1, spacing: 960, jitter: .1, bypass: 60,
    recipes: [{ id: 'marsh-mire', onSurfaces: ['marsh'], when: [], chance: 1, choices: [{ id: 'mire', weight: 1,
      region: 'swamp', color: '#30483d', radius: [60, 90], scale: 1.2, wobble: .3, pieces: [2, 4] }] }] },
};
const run = makeMassRun(713, 'native-substrate', spec), generator = new MassGenerator(run, spec);
assert.ok(generator.nativeSubstrate);
const cold = new MassGenerator(JSON.parse(canonical(run)), JSON.parse(canonical(spec)));
const biomeCounts = new Map<string, number>(); let count = 0, wetAnchor: ReturnType<typeof address> | undefined;
for (let y = -8400; y <= 8400; y += 700) for (let x = -8400; x <= 8400; x += 700) {
  const at = field.physicalAnchor({ x, y }), native = reader.biomeAt({ x, y });
  const sample = generator.terrainAt(at), context = field.pointAt(at);
  assert.equal(sample.biome, native); assert.deepEqual(sample.fields, { ...context.climate, nativeDepth: context.depth });
  assert.deepEqual(cold.terrainAt(at), sample);
  biomeCounts.set(native, (biomeCounts.get(native) ?? 0) + 1); count++;
  if (native === 'marsh' && context.depth > .5 && !wetAnchor) wetAnchor = at;
}
assert.ok(biomeCounts.size >= 8, 'natural predeclared domain must include differentiated native biomes');
assert.ok(wetAnchor, 'actual native marsh interior must occur in fixed domain');
const state = new MassState(run, 30), stream = new MassStream(generator, state, { maxPages: 4, maxSamples: 8192 });
const walkOrigin = { dimension: wetAnchor.dimension, cx: wetAnchor.cx, cy: wetAnchor.cy }, walk = new MassWalk(stream, walkOrigin);
let plan = generator.patches!.at(wetAnchor);
for (let y = -2; y <= 2 && !plan; y++) for (let x = -2; x <= 2 && !plan; x++) plan = generator.patches!.at(moveAddress(wetAnchor, { x: x * 960, y: y * 960 }, 960));
assert.ok(plan, 'naturally native marsh must admit a complete localized mire');
const cols = 960 / 30;
for (const i of plan.cells) {
  const at = moveAddress(plan.origin, { x: (i % cols + .5) * 30, y: (Math.floor(i / cols) + .5) * 30 }, 960);
  assert.equal(generator.terrainAt(at).region, 'swamp'); assert.equal(stream.sample(at).region, 'swamp');
}
let dryCells = 0;
for (const box of plan.bypasses) for (let y = box.minY + 15; y < box.maxY; y += 30) for (let x = box.minX + 15; x < box.maxX; x += 30) {
  const at = moveAddress(plan.origin, { x, y }, 960); assert.equal(generator.terrainAt(at).region, 'ground');
  assert.equal(stream.sample(at).region, 'ground'); assert.equal(generator.patches!.reserves(at, 15), true); dryCells++;
}
const cell = { dimension: plan.origin.dimension, cx: plan.origin.cx, cy: plan.origin.cy };
stream.request([cell]); const published = stream.step(1024); assert.equal(published.published, 1);
const page = stream.page(cell)!; assert.equal(page.samples.length, 1024);
for (let i = 0; i < page.samples.length; i += 17) {
  const at = address(cell.dimension, cell.cx, cell.cy, (i % 32 + .5) * 30, (Math.floor(i / 32) + .5) * 30, 960);
  assert.deepEqual(page.samples[i], generator.terrainAt(at));
}
// Collision consumes the same stream. The local frame is independent of huge
// durable coordinates; no absolute address was narrowed to Number.
for (let y = 15; y < 960; y += 90) for (let x = 15; x < 960; x += 90)
  assert.equal(walk.regionAt(x, y), stream.sample(walk.at(x, y)).region);
const wire = canonical(spec);
for (const mutate of [
  (s: MassSpec) => { s.fields = [{ id: 'temperature', base: .5, layers: [] }]; },
  (s: MassSpec) => { s.fields = s.fields.map((f, i) => i ? f : { ...f, layers: [{ id: 'unrelated-noise', period: 900, amplitude: 1 }] }); },
  (s: MassSpec) => { s.surfaces = s.surfaces.filter(s => s.biome !== 'jungle'); },
  (s: MassSpec) => { s.surfaces = s.surfaces.map(s => s.biome === 'marsh' ? { ...s, region: 'bog' } : s); },
  (s: MassSpec) => { s.addressSpan = 480; },
]) { const bad = JSON.parse(wire) as MassSpec; mutate(bad); assert.throws(() => makeMassRun(713, 'bad', bad)); }
assert.throws(() => makeMassRun(714, 'wrong-seed', spec), /seed/);
assert.throws(() => generator.terrainAt(address('other', '0', '0', 0, 0, 960)), /dimension/i);
assert.throws(() => generator.terrainAt(moveAddress(mapping.physicalOrigin, { x: 1e8, y: 0 }, 960)), /envelope/i);
const beforeInherited = generator.nativeSubstrate.sample(wetAnchor);
// Two immutable planners precede the prototype change; one is queried cold
// afterward so a warm cache cannot conceal inherited patch-range defaults.
const protoSpec = JSON.parse(canonical(spec)) as MassSpec;
protoSpec.surfaces = protoSpec.surfaces.map(row => ({ ...row, region: 'ground' }));
protoSpec.patches!.recipes[0].onSurfaces = protoSpec.surfaces.map(row => row.id);
protoSpec.patches!.recipes[0].when = [{ field: 'nativeDepth' }];
const protoRun = makeMassRun(713, 'patch-source-isolation', protoSpec);
const protoBefore = new MassGenerator(protoRun, protoSpec), protoAfter = new MassGenerator(protoRun, protoSpec);
const patchAnchor = field.physicalAnchor({ x: 0, y: 0 }), savedPatch = protoBefore.patches!.at(patchAnchor);
assert.ok(savedPatch);
const oldMin = Object.getOwnPropertyDescriptor(Object.prototype, 'min');
try { Object.defineProperty(Object.prototype, 'min', { configurable: true, value: 2 }); assert.deepEqual(generator.nativeSubstrate.sample(wetAnchor), beforeInherited);
  assert.deepEqual(protoAfter.patches!.at(patchAnchor), savedPatch); }
finally { if (oldMin) Object.defineProperty(Object.prototype, 'min', oldMin); else Reflect.deleteProperty(Object.prototype, 'min'); }
const marshRule = spec.surfaces.find(r => r.biome === 'marsh')!, oldColor = marshRule.color; marshRule.color = '#ff00ff';
assert.deepEqual(generator.nativeSubstrate.sample(wetAnchor), beforeInherited); marshRule.color = oldColor;
assert.equal(canonical(spec), wire);
for (const x of [-20000, -19999, 19999, 20000]) {
  const edge = field.physicalAnchor({ x, y: 0 });
  assert.deepEqual(generator.terrainAt(edge), generator.nativeSubstrate.sample(edge), 'out-of-domain optional patch refuses without changing valid base ground');
}
const savedRegion = Object.getOwnPropertyDescriptor(Object.prototype, 'region');
try {
  Object.defineProperty(Object.prototype, 'region', { configurable: true, value: 'ground' });
  const missing = JSON.parse(wire) as MassSpec;
  Reflect.deleteProperty(missing.surfaces[0], 'region');
  assert.throws(() => makeMassRun(713, 'missing-material', missing), /explicit material/);
} finally { if (savedRegion) Object.defineProperty(Object.prototype, 'region', savedRegion); else Reflect.deleteProperty(Object.prototype, 'region'); }
// Every required patch execution field must belong to the saved record. A
// prototype default must never become mutable material after publication.
const requiredPatchRows = [
  ['policy', ['source', 'version', 'spacing', 'jitter', 'bypass', 'recipes']],
  ['recipe', ['id', 'onSurfaces', 'chance', 'choices', 'when']],
  ['choice', ['id', 'region', 'color', 'weight', 'radius', 'scale', 'wobble', 'pieces']],
  ['range', ['field']], ['exclusion', ['source', 'origin', 'bounds']],
  ['origin', ['dimension', 'cx', 'cy', 'x', 'y']], ['bounds', ['minX', 'minY', 'maxX', 'maxY']],
] as const;
let inheritedPatchRefusals = 0;
for (const [kind, keys] of requiredPatchRows) for (const key of keys) {
  const bad = JSON.parse(wire) as MassSpec, p = bad.patches!;
  p.recipes[0].when = [{ field: 'nativeDepth' }];
  p.exclusions = [{ source: 'test-reservation', origin: { ...mapping.physicalOrigin }, bounds: { minX: 0, minY: 0, maxX: 30, maxY: 30 } }];
  const rows = { policy: p, recipe: p.recipes[0], choice: p.recipes[0].choices[0], range: p.recipes[0].when[0],
    exclusion: p.exclusions[0], origin: p.exclusions[0].origin, bounds: p.exclusions[0].bounds };
  const row = rows[kind] as unknown as Record<string, unknown>, value = row[key];
  const prior = Object.getOwnPropertyDescriptor(Object.prototype, key);
  Reflect.deleteProperty(row, key);
  try { Object.defineProperty(Object.prototype, key, { configurable: true, writable: true, value });
    assert.throws(() => validateMassPatches(bad), /Invalid terrain patch/, kind + '.' + key); inheritedPatchRefusals++;
  } finally { if (prior) Object.defineProperty(Object.prototype, key, prior); else Reflect.deleteProperty(Object.prototype, key); }
}
// New substrate alone cannot activate beside old independent populations.
const { WorldMassRuntime } = await import('../src/worldmass/runtime');
const { massAdventure } = await import('../src/worldmass/preset');
assert.throws(() => new WorldMassRuntime(713, 'not-ready', { ...massAdventure(), terrain: spec }), /complete native area and population/);
const switched = { ...massAdventure() }, legacyTerrain = switched.terrain; let terrainReads = 0;
Object.defineProperty(switched, 'terrain', { enumerable: true, get: () => ++terrainReads === 1 ? legacyTerrain : spec });
const detachedRuntime = new WorldMassRuntime(713, 'detached-config', switched);
assert.equal(terrainReads, 1); assert.equal(detachedRuntime.generator.nativeSubstrate, null);
// Omitted binding remains byte-identical to the original noise-policy fixture.
const legacy: MassSpec = { id: 'legacy', version: 8, addressSpan: 960, terrainCell: 30, fields: [{ id: 'moisture', base: .7, layers: [] }],
  surfaces: [{ id: 'marsh', source: 'original', priority: 0, when: [], region: 'ground', color: '#334433', biome: 'marsh' }], places: [] };
const old = new MassGenerator(makeMassRun(713, 'legacy', legacy), legacy); assert.equal(old.nativeSubstrate, null);
assert.deepEqual({ ...old.fieldsAt(mapping.physicalOrigin) }, { moisture: .7 }); assert.equal(old.terrainAt(mapping.physicalOrigin).source.source, 'original');
console.log('PASS source-owned native substrate through generator, stream and collision; exact cold fields/materials, complete neutral bypasses and legacy path',
  JSON.stringify({ samples: count, biomes: [...biomeCounts].sort(), mireCells: plan.cells.length, dryCells, inheritedPatchRefusals, published: published.published }));
