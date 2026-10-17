/** Exact terrain transport/reconstruction and mutable-source binding.
 * This is a correctness component probe, not a background-worker performance
 * result. Actual stream ordering/lifecycle belongs to the queue integration. */
import assert from 'node:assert/strict';
import { address, moveAddress, type MassAddress } from '../src/worldmass/address';
import type { MassSpec, MassTerrain } from '../src/worldmass/contracts';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { MassTerrainPatches } from '../src/worldmass/terrainPatches';
import { massAdventure } from '../src/worldmass/preset';
import { installTerrainBasePreparation } from '../src/worldmass/terrainBasePreparation';
import { canonical, freezeData, isMassFrozenData } from '../src/worldmass/random';
import { isOwnedTerrainRecord, ownedBaseTerrain, ownedTerrainSource } from '../src/worldmass/ownedTerrain';
import { regionIds, regionKind, registerRegion } from '../src/world/regions';
import { captureTerrainPreparationSource, createTerrainPreparationCompiler, createTerrainPreparationGenerator, prepareTerrainPacket,
  restoreTerrainPacket, terrainPreparationGeneratorMatches,
  validateTerrainPreparationReply, TERRAIN_PREPARATION_MAX_ADDRESSES, TERRAIN_PREPARATION_MAX_FIELDS,
  TERRAIN_PREPARATION_MAX_STRING, TERRAIN_PREPARATION_MAX_FIELD_KEY,
  type TerrainPreparationJob, type TerrainPreparationReply } from '../src/worldmass/terrainPreparation';

let checks = 0;
const clone = <T>(v: T): T => structuredClone(v);
function signature(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const keys = Reflect.ownKeys(value);
  return { prototype: Object.getPrototypeOf(value) === null ? 'null' : Object.getPrototypeOf(value) === Object.prototype ? 'object' : 'other',
    frozen: Object.isFrozen(value), extensible: Object.isExtensible(value),
    massFrozen: isMassFrozenData(value), owned: isOwnedTerrainRecord(value),
    entries: keys.map(key => {
      const d = Object.getOwnPropertyDescriptor(value, key)!;
      return { key, enumerable: d.enumerable, writable: d.writable, configurable: d.configurable,
        value: 'value' in d ? signature(d.value) : 'accessor' };
    }) };
}
function roundtrip(terrain: MassTerrain): void {
  const packet = prepareTerrainPacket(terrain); assert.ok(packet, 'supported original value');
  for (const wire of [clone(packet), JSON.parse(JSON.stringify(packet))]) {
    const restored = restoreTerrainPacket(wire); assert.ok(restored);
    assert.notEqual(restored, terrain); assert.notEqual(restored.fields, terrain.fields); assert.notEqual(restored.source, terrain.source);
    assert.deepEqual(signature(restored), signature(terrain), 'full ordered descriptor/prototype/brand/value equivalence'); checks++;
  }
}
function fields(nullProto = true): Record<string, number> {
  const result: Record<string, number> = Object.create(nullProto ? null : Object.prototype);
  for (const [key, value] of [['2', 2], ['1', -0], ['__proto__', 1.25], ['constructor', -3], ['temperature', .75]] as const)
    Object.defineProperty(result, key, { value, writable: true, configurable: true, enumerable: true });
  return result;
}
function source() { return { generator: 'generator', version: 19, rule: 'rule', source: 'source', stream: '雪\ud800/\0' }; }
// Independent original construction forms: do not derive these from packet flags.
for (const nullProto of [false, true]) {
  roundtrip({ region: 'ground', color: '#abcdef', biome: 'forest', fields: fields(nullProto), source: source() });
  roundtrip(Object.freeze({ region: 'ground', color: '#abcdef', biome: 'forest', fields: Object.freeze(fields(nullProto)), source: Object.freeze(source()) }));
  roundtrip(freezeData({ region: 'ground', color: '#abcdef', biome: 'forest', fields: fields(nullProto), source: source() }));
  roundtrip(ownedBaseTerrain('ground', '#abcdef', 'forest', Object.freeze(fields(nullProto)), ownedTerrainSource('generator', 19, 'rule', 'source', 'stream')));
  roundtrip(freezeData(ownedBaseTerrain('ground', '#abcdef', 'forest', freezeData(fields(nullProto)), ownedTerrainSource('generator', 19, 'rule', 'source', 'stream'))));
}
// NativeRegional emits mutable terrain/source in this different own-key order.
roundtrip({ region: 'wall', color: '#abcdef', biome: 'forest', fields: Object.freeze(fields()),
  source: { generator: 'native', version: 1, source: 'main/adventureLocales/x', rule: 'x/wall', stream: 'native-plan' } });
const special = Object.freeze({ zero: -0, nan: NaN, high: Infinity, low: -Infinity, smallest: Number.MIN_VALUE, largest: Number.MAX_VALUE });
roundtrip(Object.freeze({ region: 'ground', color: '#abcdef', biome: 'forest', fields: special, source: Object.freeze(source()) }));
const reordered = Object.create(null) as MassTerrain;
for (const [k, v] of [['source', Object.freeze(source())], ['fields', Object.freeze(fields())], ['biome', 'forest'], ['color', '#abcdef'], ['region', 'ground']] as const)
  Object.defineProperty(reordered, k, { value: v, writable: true, enumerable: true, configurable: true });
roundtrip(reordered);

const standard = (): MassTerrain => ({ region: 'ground', color: '#abcdef', biome: 'forest', fields: Object.freeze(fields()), source: source() });
for (const mutate of [
  (v: MassTerrain) => Object.assign(v, { ownerId: 42 }),
  (v: MassTerrain) => Object.assign(v.source, { extra: 'source property' }),
  (v: MassTerrain) => Object.defineProperty(v, 'hidden', { value: 7 }),
  (v: MassTerrain) => Object.defineProperty(v, Symbol('symbol'), { value: 7 }),
  (v: MassTerrain) => Object.seal(v),
  (v: MassTerrain) => Object.setPrototypeOf(v, { custom: true }),
  (v: MassTerrain) => Object.defineProperty(v, 'biome', { value: 'forest', writable: false }),
  (v: MassTerrain) => Object.assign(v, { region: 'x'.repeat(TERRAIN_PREPARATION_MAX_STRING + 1) }),
  (v: MassTerrain) => Object.assign(v, { fields: Object.fromEntries(Array.from({ length: TERRAIN_PREPARATION_MAX_FIELDS + 1 }, (_, i) => [String(i), i])) }),
  (v: MassTerrain) => Object.assign(v, { fields: { ['x'.repeat(TERRAIN_PREPARATION_MAX_FIELD_KEY + 1)]: 1 } }),
]) { assert.equal(prepareTerrainPacket(mutate(standard())), null); checks++; }
let getterReads = 0;
const getter = Object.defineProperty(standard(), 'biome', { get() { getterReads++; throw Error('must not read'); }, enumerable: true });
assert.equal(prepareTerrainPacket(getter), null); assert.equal(getterReads, 0); checks++;

const packet = prepareTerrainPacket(standard())!;
for (const mutate of [
  (v: any) => { v.extra = 1; },
  (v: any) => { v.values.length = TERRAIN_PREPARATION_MAX_FIELDS + 1; },
  (v: any) => { delete v.values[0]; },
  (v: any) => { v.values[0] = Infinity; },
  (v: any) => { v.fields.keys.reverse(); }, // integer own-key ordering cannot be reversed
  (v: any) => { v.source.owned = true; v.source.frozen = false; },
  (v: any) => { v.fields.owned = true; },
  (v: any) => { v.shape.massFrozen = true; v.shape.frozen = true; }, // children would acquire certificates
  (v: any) => { v.fields.keys.push('__proto__'); },
  (v: any) => { Object.defineProperty(v, 'region', { get() { getterReads++; return 'ground'; } }); },
  (v: any) => { Object.setPrototypeOf(v.values, { toJSON() { throw Error('custom array'); } }); },
]) { const raw = clone(packet); mutate(raw); assert.equal(restoreTerrainPacket(raw), null); checks++; }
assert.equal(getterReads, 0);

const spec: MassSpec = { id: 'terrain-preparation-probe', version: 1, addressSpan: 960, terrainCell: 30,
  fields: [{ id: 'elevation', base: .2, layers: [{ id: 'detail', period: 370, amplitude: .7 }] },
    { id: '__proto__', base: 1.5, layers: [] }, { id: 'constructor', base: -0, layers: [] }],
  surfaces: [{ id: 'default', priority: 0, when: [], region: 'ground', color: '#123456', biome: 'forest' }], places: [] };
const run = makeMassRun(0x11223344, 'preparation/雪', spec), generator = createTerrainPreparationGenerator(run, spec);
assert.equal(captureTerrainPreparationSource(new MassGenerator(run, spec)), null, 'unissued constructors cannot claim a background capability'); checks++;
const binding = captureTerrainPreparationSource(generator); assert.ok(binding);
assert.equal(binding.spec, generator.spec); assert.equal(binding.run, generator.run);
assert.ok(terrainPreparationGeneratorMatches(generator, binding)); checks++;
const transferred = clone(binding), compiler = createTerrainPreparationCompiler(transferred);
(transferred.spec as MassSpec).terrainCell = 60;
const addresses: MassAddress[] = [
  address('surface', '0', '0', 15, 15, 960), address('surface', '-1', '-1', 945, 945, 960),
  address('surface', '-9223372036854775808', '9223372036854775807', 15, 945, 960),
  address('dimension/雪\ud800', '9007199254740993', '-9007199254740993', 225, 465, 960),
];
function job(token: number, rows = addresses): TerrainPreparationJob { return { protocol: 1, sourceId: binding!.sourceId, token, addresses: rows }; }
for (const request of [job(1), job(2, [...addresses].reverse()), job(3, [addresses[0], addresses[0]]), job(4, [])]) {
  const reply = compiler.prepare(clone(request)), ready = validateTerrainPreparationReply(binding, request, clone(reply));
  assert.ok(ready); assert.equal(reply.bytes, JSON.stringify(reply.rows).length * 2);
  ready.forEach((value, i) => { assert.ok(value); assert.deepEqual(signature(value), signature(generator.baseTerrainAt(request.addresses[i]))); checks++; });
}
// A baseline clone alone loses observable shape/certification; packet reconstruction must not.
const baselineTerrain = generator.terrainAt(addresses[0]);
assert.notDeepEqual(signature(clone(baselineTerrain)), signature(baselineTerrain)); checks++;
const request = job(10), reply = compiler.prepare(request);
for (const mutate of [
  (v: any) => { v.token++; }, (v: any) => { v.sourceId += 'different'; },
  (v: any) => { v.bytes++; }, (v: any) => { v.rows.pop(); },
  (v: any) => { v.rows.length = TERRAIN_PREPARATION_MAX_ADDRESSES + 1; },
  (v: any) => { v.rows[0].source.keys.push('extra'); },
]) { const malformed = clone(reply); mutate(malformed); assert.equal(validateTerrainPreparationReply(binding, request, malformed), null); checks++; }
const misses: TerrainPreparationReply = { ...reply, rows: addresses.map(() => null), bytes: JSON.stringify(addresses.map(() => null)).length * 2 };
assert.deepEqual(validateTerrainPreparationReply(binding, request, misses), addresses.map(() => null)); checks++;
for (const bad of [job(0), job(20, Array(TERRAIN_PREPARATION_MAX_ADDRESSES + 1).fill(addresses[0])),
  job(21, [{ ...addresses[0], x: 0 }]), job(22, [{ ...addresses[0], cx: '01' }]), job(23, [{ ...addresses[0], cy: '9223372036854775808' }]),
  job(24, [{ ...addresses[0], cx: '1'.repeat(10000) }]), job(25, [{ ...addresses[0], dimension: 'x'.repeat(129) }])]) {
  assert.throws(() => compiler.prepare(bad)); checks++;
}
assert.throws(() => createTerrainPreparationCompiler({ ...clone(binding), sourceId: 'different' })); checks++;
assert.throws(() => createTerrainPreparationCompiler({ ...clone(binding), compiler: 'terrain-generator-v1' } as unknown as Parameters<typeof createTerrainPreparationCompiler>[0])); checks++;

// Host guards reject direct overrides and replacement before a prepared hit.
const oldTerrain = generator.baseTerrainAt;
generator.baseTerrainAt = () => { throw Error('custom'); };
assert.equal(terrainPreparationGeneratorMatches(generator, binding), false); assert.equal(captureTerrainPreparationSource(generator), null);
delete (generator as unknown as Record<string, unknown>).baseTerrainAt;
assert.equal(generator.baseTerrainAt, oldTerrain); assert.ok(terrainPreparationGeneratorMatches(generator, binding)); checks++;
const proto = MassGenerator.prototype, oldFields = proto.fieldsAt;
try {
  proto.fieldsAt = () => Object.freeze({ changed: 1 });
  assert.equal(terrainPreparationGeneratorMatches(generator, binding), false); assert.equal(captureTerrainPreparationSource(generator), null); checks++;
} finally { proto.fieldsAt = oldFields; }
const oldFieldsDescriptor = Object.getOwnPropertyDescriptor(proto, 'fieldsAt')!;
try {
  Object.defineProperty(proto, 'fieldsAt', { configurable: true, get: oldFields as () => unknown });
  assert.equal(terrainPreparationGeneratorMatches(generator, binding), false, 'method-to-getter substitution'); checks++;
} finally { Object.defineProperty(proto, 'fieldsAt', oldFieldsDescriptor); }
class CustomGenerator extends MassGenerator {}
assert.equal(captureTerrainPreparationSource(new CustomGenerator(run, spec)), null); checks++;

const patchSpec: MassSpec = { ...spec, patches: { source: 'preparation/patch', version: 1, spacing: 960, jitter: .2, bypass: 60,
  recipes: [{ id: 'wet', onSurfaces: ['default'], when: [], chance: 1,
    choices: [{ id: 'mud', weight: 1, region: 'mud', color: '#554433', radius: [40, 60], scale: 1.2, wobble: .3, pieces: [2, 4] }] }] } };
const patchRun = makeMassRun(713, 'preparation/patch', patchSpec);
const patchGenerator = createTerrainPreparationGenerator(patchRun, patchSpec), patchBinding = captureTerrainPreparationSource(patchGenerator);
assert.ok(patchBinding);
const originalPatchSample = MassTerrainPatches.prototype.sample;
try {
  MassTerrainPatches.prototype.sample = (_at, base) => ({ ...base, biome: 'changed' });
  assert.ok(captureTerrainPreparationSource(patchGenerator), 'host-only patch method does not change pure base');
  assert.ok(terrainPreparationGeneratorMatches(patchGenerator, patchBinding));
  assert.ok(captureTerrainPreparationSource(createTerrainPreparationGenerator(patchRun, patchSpec))); checks++;
} finally { MassTerrainPatches.prototype.sample = originalPatchSample; }
const patchObject = patchGenerator.patches as unknown as Record<string, unknown>, oldRead = patchObject.baseAt;
try {
  patchObject.baseAt = () => standard();
  assert.ok(captureTerrainPreparationSource(patchGenerator), 'host-only patch callback remains on the host');
  assert.ok(terrainPreparationGeneratorMatches(patchGenerator, patchBinding)); checks++;
} finally { patchObject.baseAt = oldRead; }
const oldPatchOwner = patchGenerator.patches;
try {
  (patchGenerator as unknown as Record<string, unknown>).patches = { sample: originalPatchSample };
  assert.ok(captureTerrainPreparationSource(patchGenerator), 'composition child replacement does not change pure base'); checks++;
} finally { (patchGenerator as unknown as Record<string, unknown>).patches = oldPatchOwner; }
assert.ok(terrainPreparationGeneratorMatches(patchGenerator, patchBinding));
const patchCompiler = createTerrainPreparationCompiler(clone(patchBinding));
const patchJob: TerrainPreparationJob = { protocol: 1, sourceId: patchBinding.sourceId, token: 1,
  addresses: [address('surface', '0', '0', 465, 465, 960), address('surface', '-1', '-1', 495, 495, 960)] };
const patchReply = patchCompiler.prepare(patchJob), patchReady = validateTerrainPreparationReply(patchBinding, patchJob, patchReply);
assert.ok(patchReady);
patchReady.forEach((value, i) => { assert.ok(value); assert.deepEqual(signature(value), signature(patchGenerator.baseTerrainAt(patchJob.addresses[i]))); checks++; });

// A genuine signed-boundary generator failure becomes only that row's miss.
// The synchronous caller retains its own original exception on fallback.
const edgeSpec: MassSpec = { ...spec, places: [{ id: 'surface-place', version: 1, content: 'surface-place', priority: 1,
  period: 960, radius: 30, jitter: 0, chance: 1, when: [], surface: { region: 'ground', color: '#234567' } }] };
const edgeGenerator = createTerrainPreparationGenerator(makeMassRun(713, 'preparation/edge', edgeSpec), edgeSpec);
const edgeBinding = captureTerrainPreparationSource(edgeGenerator); assert.ok(edgeBinding);
const edgeAddress = address('surface', '-9223372036854775808', '0', 15, 15, 960);
assert.throws(() => edgeGenerator.baseTerrainAt(edgeAddress), RangeError);
const edgeJob: TerrainPreparationJob = { protocol: 1, sourceId: edgeBinding.sourceId, token: 1,
  addresses: [addresses[0], edgeAddress, addresses[1]] };
const edgeReply = createTerrainPreparationCompiler(clone(edgeBinding)).prepare(edgeJob);
const edgeReady = validateTerrainPreparationReply(edgeBinding, edgeJob, edgeReply); assert.ok(edgeReady);
assert.equal(edgeReady[1], null);
for (const index of [0, 2]) { assert.ok(edgeReady[index]); assert.deepEqual(signature(edgeReady[index]), signature(edgeGenerator.baseTerrainAt(edgeJob.addresses[index]))); checks++; }

const ground = regionKind('ground')!, originalWalkable = ground.walkable;
try {
  ground.walkable = !originalWalkable;
  assert.ok(terrainPreparationGeneratorMatches(generator, binding));
  assert.ok(validateTerrainPreparationReply(binding, job(30), compiler.prepare(job(30)))); checks++;
} finally { ground.walkable = originalWalkable; }
const before = Object.getOwnPropertyDescriptor(ground, 'standStatusDeep');
try {
  Object.defineProperty(ground, 'standStatusDeep', { enumerable: true, configurable: true, get() { getterReads++; return undefined; } });
  assert.ok(captureTerrainPreparationSource(generator)); compiler.prepare(job(31)); assert.equal(getterReads, 0); checks++;
} finally { if (before) Object.defineProperty(ground, 'standStatusDeep', before); else delete ground.standStatusDeep; }
try {
  registerRegion({ ...ground });
  assert.ok(terrainPreparationGeneratorMatches(generator, binding), 'material replacement cannot invalidate immutable base'); checks++;
} finally { registerRegion(ground); }
const visual = regionIds().map(id => regionKind(id)!.visual).find(v => v && Object.hasOwn(v, 'fill'))!;
const fill = Object.getOwnPropertyDescriptor(visual, 'fill')!;
try {
  Object.defineProperty(visual, 'fill', { configurable: true, enumerable: true, get() { getterReads++; return fill.value; } });
  compiler.prepare(job(32)); assert.equal(getterReads, 0); checks++;
} finally { Object.defineProperty(visual, 'fill', fill); }
assert.ok(terrainPreparationGeneratorMatches(generator, binding));
assert.equal(canonical(generator.run), canonical(run));

// Material A -> B(query) -> A: the original host caches a rejected native plan
// under B. Full-terrain substitution from a fresh worker under A would be wrong;
// prepared immutable bases must still run the host's original composition.
{
  const policy = clone(massAdventure().terrain.nativeRegional!);
  const abaSpec: MassSpec = { id: 'preparation/material-history', version: 1, addressSpan: 960, terrainCell: 30,
    fields: [], surfaces: [{ id: 'flat', priority: 0, when: [], region: 'ground', color: '#445533', biome: 'downs' }], places: [],
    nativeRegional: { ...policy, chance: 1, seats: 1 } };
  const abaRun = makeMassRun(713, 'preparation/material-history', abaSpec);
  const witness = new MassGenerator(abaRun, abaSpec), original = new MassGenerator(abaRun, abaSpec);
  const prepared = createTerrainPreparationGenerator(abaRun, abaSpec), abaSource = captureTerrainPreparationSource(prepared); assert.ok(abaSource);
  const plan = witness.nativeRegional!.candidate('surface', -3n, 4n); assert.ok(plan, 'A admits the original complete source');
  const targets = plan.source.terminals.slice(0, 3).map(terminal => {
    const at = moveAddress(plan.origin, terminal, 960);
    return address(at.dimension, at.cx, at.cy, Math.floor(at.x / 30) * 30 + 15, Math.floor(at.y / 30) * 30 + 15, 960);
  });
  const abaJob: TerrainPreparationJob = { protocol: 1, sourceId: abaSource.sourceId, token: 1, addresses: targets };
  const abaReply = createTerrainPreparationCompiler(clone(abaSource)).prepare(abaJob);
  const bases = validateTerrainPreparationReply(abaSource, abaJob, abaReply); assert.ok(bases); assert.ok(bases.every(Boolean));
  const originalDeep = Object.getOwnPropertyDescriptor(ground, 'standStatusDeep');
  try {
    Object.defineProperty(ground, 'standStatusDeep', { value: 'swimming', configurable: true, enumerable: true, writable: true });
    assert.equal(original.nativeRegional!.candidate('surface', -3n, 4n), null);
    assert.equal(prepared.nativeRegional!.candidate('surface', -3n, 4n), null);
    assert.ok(original.nativeRegional!.counters.water > 0); assert.ok(prepared.nativeRegional!.counters.water > 0);
  } finally { if (originalDeep) Object.defineProperty(ground, 'standStatusDeep', originalDeep); else delete ground.standStatusDeep; }
  const ready = new Map(targets.map((at, i) => [canonical(at), bases[i]!])); let hits = 0;
  installTerrainBasePreparation(prepared, at => {
    const key = canonical(at), value = ready.get(key); if (value) { ready.delete(key); hits++; } return value;
  });
  try {
    let distinguishesWholeTerrain = false;
    for (const at of targets) {
      const expected = original.terrainAt(at), actual = prepared.terrainAt(at);
      assert.deepEqual(signature(actual), signature(expected), 'prepared base preserves original host B-cache history after A restoration');
      if (canonical(witness.terrainAt(at)) !== canonical(expected)) distinguishesWholeTerrain = true;
      checks++;
    }
    assert.ok(distinguishesWholeTerrain, 'negative control: fresh A whole terrain differs from the original B-populated cache');
    assert.equal(hits, new Set(targets.map(canonical)).size); assert.ok(hits > 0);
    assert.ok(terrainPreparationGeneratorMatches(prepared, abaSource)); checks++;
  } finally { installTerrainBasePreparation(prepared); }
}

// Real current policy, independent original synchronous base outputs. Regional,
// native and landform planning remains host-owned and may warm base caches; query
// errors at exact signed rims must remain misses rather than guessed terrain.
for (const seed of [99, 901743, 0xddba11]) {
  const current = massAdventure().terrain, realRun = makeMassRun(seed, 'preparation/current/' + seed, current);
  const real = createTerrainPreparationGenerator(realRun, current), realSource = captureTerrainPreparationSource(real);
  assert.ok(realSource, 'current policy must issue a preparation source');
  const worker = createTerrainPreparationCompiler(clone(realSource)), span = current.addressSpan, cell = current.terrainCell;
  const centered = (at: MassAddress) => address(at.dimension, at.cx, at.cy,
    Math.floor(at.x / cell) * cell + cell / 2, Math.floor(at.y / cell) * cell + cell / 2, span);
  const point = (x: number, y: number) => centered(address('surface', '0', '0', x, y, span));
  const rows = [point(0, 0), point(-1, -1), point(2880 * 2.5, -2880 * 1.5),
    point(current.nativeRegional!.spacing * 5.5, current.nativeRegional!.spacing * -7.5),
    point(current.landforms!.regional!.spacing * -1.5, current.landforms!.regional!.spacing * 2.5),
    address('surface', '9007199254740993', '-9007199254741009', cell / 2, cell / 2, span),
    address('surface', '-9223372036854775808', '9223372036854775807', cell / 2, span - cell / 2, span)];
  let successes = 0, misses = 0, nativePlans = 0;
  const checkBatch = (token: number, batch: MassAddress[]) => {
    const request: TerrainPreparationJob = { protocol: 1, sourceId: realSource.sourceId, token, addresses: batch };
    const reply = worker.prepare(clone(request)), restored = validateTerrainPreparationReply(realSource, request, clone(reply));
    assert.ok(restored);
    for (let i = 0; i < batch.length; i++) {
      let expected: MassTerrain | undefined, threw = false;
      try { expected = real.baseTerrainAt(batch[i]); } catch { threw = true; }
      if (threw) { assert.equal(restored[i], null); misses++; }
      else { assert.ok(restored[i], 'ordinary current terrain is transferable'); assert.deepEqual(signature(restored[i]), signature(expected)); successes++; }
      assert.ok(terrainPreparationGeneratorMatches(real, realSource), 'ordinary terrain query must retain source capability'); checks++;
    }
  };
  checkBatch(1, rows);
  const nativePoints: MassAddress[] = [];
  for (const [gx, gy] of [[5n, -8n], [2n, -4n], [-1n, -1n]]) {
    const plan = real.nativeRegional!.candidate('surface', gx, gy);
    if (plan) {
      nativePlans++;
      for (const terminal of plan.source.terminals.slice(0, 2)) nativePoints.push(centered(moveAddress(plan.origin, terminal, span)));
    }
    assert.ok(terrainPreparationGeneratorMatches(real, realSource), 'native admission may update counters/cache without losing capability'); checks++;
  }
  for (const at of rows.slice(0, 3)) {
    real.terrainAt(at);
    real.placesInCell(at); real.regionalPlacesInCell(at);
    real.nativeRegional!.reserves(at, 45); real.landforms!.reserves(at, 45); real.patches?.reserves(at, 45);
    assert.ok(terrainPreparationGeneratorMatches(real, realSource), 'ordinary content/reservation queries must retain capability'); checks++;
  }
  checkBatch(2, [...nativePoints, ...rows].reverse());
  assert.ok(successes > 0);
  console.log('Current terrain source seed=' + seed + ' exact=' + successes + ' expected-misses=' + misses + ' accepted-native-plans=' + nativePlans);
}
console.log('PASS worldmass terrain preparation: ' + checks + ' exact shape/value/source checks; no worker latency claim');
