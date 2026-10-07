import assert from 'node:assert/strict';
import { address, localOffset, moveAddress } from '../src/worldmass/address';
import { canonical } from '../src/worldmass/random';
import { nativeAreaSeamCurrent, nativeAreaSeamPorts, planNativeAreaSeam, validateNativeAreaSeam,
  verifyNativeAreaSeam, routeNativeAreaSeam, restoreNativeAreaSeamReceipt, type NativeAreaSeamPhysical, type NativeAreaSeamPlan,
  type NativeAreaSeamPolicy, type NativeSeamOwner } from '../src/worldmass/nativeAreaSeams';

const policy: NativeAreaSeamPolicy = { version: 1, addressSpan: 960, bodyRadius: 15, approach: 180, maxGap: 1200, maxLength: 1800 };
const origin = address('surface', '-4294967301', '4294967300', 91.25, 57.5, 960);
const owner = (id: string, x: number, y: number, w = 3284, h = 2561): NativeSeamOwner => ({
  id, source: 'complete-area/' + id, origin: moveAddress(origin, { x, y }, 960), bounds: { w, h, shape: 'rect' },
});
const a = owner('a', 0, 0), b = owner('b', a.bounds.w + 240, 100, 4200, 3583);
const requirePlan = (a: NativeSeamOwner, b: NativeSeamOwner, p = policy): Readonly<NativeAreaSeamPlan> => {
  const result = planNativeAreaSeam(a, b, p); assert.ok(result.ok, JSON.stringify(result)); return result.plan;
};
const plan = requirePlan(a, b);
assert.equal(canonical(plan), canonical(requirePlan(b, a)), 'discovery order changes no bytes');
assert.equal(plan.ports[0].side, 'e'); assert.equal(plan.ports[1].side, 'w');
assert.equal(plan.ports[0].point.x, a.bounds.w); assert.equal(plan.ports[1].point.x, 0);
assert.equal(plan.length, 600); assert.equal(plan.path.length, 4);
const nativeA = nativeAreaSeamPorts(a, [plan])[0], nativeB = nativeAreaSeamPorts(b, [plan])[0];
assert.equal(nativeA.point.y, nativeB.point.y + 100, 'both generation mouths share the physical tangent');
assert.ok(Object.isFrozen(plan) && Object.isFrozen(plan.path[0]) && Object.isFrozen(nativeA.point));
validateNativeAreaSeam(JSON.parse(JSON.stringify(plan)));
const ab = JSON.stringify(plan), detached = JSON.parse(ab); detached.ports[0].point.y++;
assert.throws(() => validateNativeAreaSeam(detached), /does not match/);
detached.ports = JSON.parse(ab).ports; detached.owners[1].source = 'changed';
assert.throws(() => nativeAreaSeamPorts(b, [detached]), /owner conflict/);
assert.throws(() => nativeAreaSeamPorts(a, [plan, plan]), /owner conflict/);
assert.throws(() => nativeAreaSeamPorts({ ...a, source: 'other' }, [plan]), /owner conflict/);
assert.throws(() => planNativeAreaSeam(a, a, policy), /distinct/);
assert.throws(() => planNativeAreaSeam(a, b, { ...policy, bodyRadius: NaN }), /policy|finite/);
assert.throws(() => planNativeAreaSeam(a, b, { ...policy, bodyRadius: Number.MIN_VALUE, approach: 2 * Number.MIN_VALUE }), /policy/);
assert.throws(() => planNativeAreaSeam({ ...a, origin: { ...a.origin, x: 960 } }, b, policy), /owner/);
const rejected: [NativeSeamOwner, string][] = [
  [owner('overlap', 50, 50), 'overlapping-owners'],
  [owner('diagonal', 3400, 3000), 'no-facing-boundaries'],
  [owner('sliver', 3400, a.bounds.h - 20), 'insufficient-throat'],
  [owner('far', a.bounds.w + 1300, 0), 'gap-exceeds-budget'],
  [{ ...b, origin: { ...b.origin, dimension: 'underworld' } }, 'different-dimensions'],
  [{ ...b, bounds: { ...b.bounds, shape: 'ellipse' } }, 'unsupported-boundary'],
  [{ ...b, bounds: { ...b.bounds, pieces: [{ id: 'annex' }] } }, 'unsupported-boundary'],
  [{ ...b, bounds: { ...b.bounds, boundless: true } }, 'unsupported-boundary'],
  [{ ...b, origin: address('surface', '0', '0', 0, 0, 960) }, 'outside-local-envelope'],
];
for (const [other, reason] of rejected) assert.deepEqual(planNativeAreaSeam(a, other, policy), { ok: false, reason });
assert.deepEqual(planNativeAreaSeam(a, b, { ...policy, maxLength: 500 }), { ok: false, reason: 'length-exceeds-budget' });
const touch = requirePlan(a, owner('touch', a.bounds.w, 0)); assert.equal(touch.path.length, 3);
assert.equal(touch.length, policy.approach * 2);
for (const [id, x, y, side] of [['east', 3450, 0, 'e'], ['west', -3450, 0, 'w'], ['south', 0, 2700, 's'], ['north', 0, -2700, 'n']] as const) {
  const p = requirePlan(a, owner(id, x, y)); assert.equal(p.ports[0].side, side);
  assert.equal(canonical(p), canonical(requirePlan(owner(id, x, y), a)));
  const points = p.path.map(at => localOffset(at, origin, 960));
  assert.ok(points.every(pt => Number.isFinite(pt.x) && Number.isFinite(pt.y)));
}
console.log('PASS bilateral full-address mouths, signed/fractional origins, four directions, shared-border identity and truthful boundary refusals');

const overlapA = owner('overlap-a', 0, 0, 1000, 1000), overlapB = owner('overlap-b', 1100, 0, 1000, 600), overlapC = owner('overlap-c', 1100, 400, 1000, 600);
assert.throws(() => nativeAreaSeamPorts(overlapA, [requirePlan(overlapA, overlapB), requirePlan(overlapA, overlapC)]), /neighbors overlap/);
let revision = 'ground-and-bodies-v1', calls = 0;
const physical: NativeAreaSeamPhysical = {
  get revision() { return revision; }, ownerSource: id => id === a.id ? a.source : id === b.id ? b.source : undefined,
  sweep(from, to, radius) { calls++; assert.equal(radius, 15); assert.notEqual(canonical(from), canonical(to)); return true; },
};
const proof = verifyNativeAreaSeam(plan, physical); assert.ok(proof.ok); assert.equal(calls, 6, 'both directions of all three segments');
assert.ok(nativeAreaSeamCurrent(proof.receipt, physical, 15)); assert.ok(nativeAreaSeamCurrent(proof.receipt, physical, 12));
assert.equal(nativeAreaSeamCurrent(proof.receipt, physical, 16), false);
const savedReceipt = JSON.parse(JSON.stringify(proof.receipt));
assert.equal(nativeAreaSeamCurrent(savedReceipt, physical, 15), false, 'serialized data is not trusted proof');
const rechecked = restoreNativeAreaSeamReceipt(savedReceipt, physical); assert.ok(rechecked.ok);
assert.ok(nativeAreaSeamCurrent(rechecked.receipt, physical, 15));
assert.deepEqual(restoreNativeAreaSeamReceipt(savedReceipt, { ...physical, sweep: () => false }), { ok: false, reason: 'blocked-connection' });
const oldDetour = Object.getOwnPropertyDescriptor(Object.prototype, 'maxDetour');
Object.defineProperty(Object.prototype, 'maxDetour', { value: 120, configurable: true });
try { assert.equal(canonical(requirePlan(a, b)), canonical(plan)); }
finally { if (oldDetour) Object.defineProperty(Object.prototype, 'maxDetour', oldDetour); else delete (Object.prototype as { maxDetour?: number }).maxDetour; }
revision = 'door-closed-v2'; assert.equal(nativeAreaSeamCurrent(proof.receipt, physical, 15), false);
const changed = { ...physical, ownerSource: () => 'new-source' };
assert.deepEqual(verifyNativeAreaSeam(plan, changed), { ok: false, reason: 'owner-source-mismatch' });
assert.deepEqual(verifyNativeAreaSeam(plan, { ...physical, sweep: () => false }), { ok: false, reason: 'blocked-connection' });
for (const value of ['yes', {}, Promise.resolve(false)])
  assert.deepEqual(verifyNativeAreaSeam(plan, { ...physical, sweep: () => value as unknown as boolean }), { ok: false, reason: 'blocked-connection' });
let sourceCalls = 0;
assert.deepEqual(verifyNativeAreaSeam(plan, { get revision() { return revision; },
  ownerSource(id) { if (++sourceCalls === 3) revision = 'changed-by-source-read'; return physical.ownerSource(id); },
  sweep: () => true }), { ok: false, reason: 'geometry-changed-during-proof' });
let n = 0;
assert.deepEqual(verifyNativeAreaSeam(plan, { ...physical, sweep: () => ++n % 2 === 1 }), { ok: false, reason: 'blocked-connection' }, 'one-way clear claim is insufficient');
assert.deepEqual(verifyNativeAreaSeam(plan, { get revision() { return revision; }, ownerSource: physical.ownerSource,
  sweep() { revision = 'changed-during-sweep'; return true; } }), { ok: false, reason: 'geometry-changed-during-proof' });
assert.equal(JSON.stringify(plan), ab, 'proofs and refusals never mutate input geometry');
// No public saved-data boundary may invoke an accessor, even one returning a
// valid first value and different publication value on a later read.
let accessorReads = 0;
const accessor = <T extends object>(value: T, key: keyof T): T => {
  const raw = structuredClone(value);
  Object.defineProperty(raw, key, { enumerable: true, get() { accessorReads++; return value[key]; } });
  return raw;
};
const unsafePlan = accessor(plan, 'path');
for (const run of [
  () => planNativeAreaSeam(accessor(a, 'bounds'), b, policy),
  () => planNativeAreaSeam(a, b, accessor(policy, 'bodyRadius')),
  () => validateNativeAreaSeam(unsafePlan),
  () => nativeAreaSeamPorts(a, [unsafePlan]),
  () => nativeAreaSeamPorts(accessor(a, 'id'), [plan]),
  () => verifyNativeAreaSeam(unsafePlan, physical),
  () => verifyNativeAreaSeam(plan, physical, accessor([...plan.path], 0)),
  () => routeNativeAreaSeam(unsafePlan, physical),
  () => restoreNativeAreaSeamReceipt(accessor(savedReceipt, 'plan'), physical),
]) assert.throws(run, /own enumerable data/);
assert.equal(accessorReads, 0, 'saved input accessors never execute');
console.log('PASS complete bidirectional sweep protocol, source/revision recheck, closed/unknown/one-way refusals, no mutation and body-size receipt limits');

// Actual naturally selected whole native recipes, with bilateral mouths passed
// before generation. This verifies physical generation integration, not live
// ambient population, objectives or a browser traversal of the area.
const { makeSimWorld } = await import('../src/sim/arena');
const { withSeededRandom, Rng } = await import('../src/core/rng');
const { placeZoneAt } = await import('../src/engine/worldgen');
const { captureNativeGeographySource } = await import('../src/world/captureGeography');
const { createNativeGeographyReader } = await import('../src/world/geographySource');
const { generateLayout } = await import('../src/engine/levelgen');
const { captureNativeGeneration } = await import('../src/worldmass/nativeGeneration');
const { captureNativeAreaGeometry } = await import('../src/worldmass/nativeAreaGeometryCapture');
const { createNativeAreaGeometry, restoreNativeAreaGeometry, serializeNativeAreaGeometry } = await import('../src/worldmass/nativeAreaGeometry');
const mint = (seed: number, target: { x: number; y: number }, mintSeed: number, index: number) => {
  const world = withSeededRandom(seed, () => makeSimWorld('warrior', seed)); world.sim.bindGeographyPolicies();
  const reader = createNativeGeographyReader(captureNativeGeographySource(seed));
  return placeZoneAt(target, null, JSON.parse(JSON.stringify(world.zoneMap)), index, {
    seed: mintSeed, level: 10, fieldBiome: true, biomeFor: reader.biomeAt,
    biomeDepthFor: reader.biomeDepth, climateFor: reader.climateAt,
  });
};
const forest = mint(991, { x: -55, y: 160 }, 2468017101, 810156);
const desert = mint(713, { x: -67.5, y: -8745 }, 924637573, 810108);
assert.equal(forest.tileset, 'forest'); assert.equal(forest.layoutType, 'districts');
assert.equal(desert.tileset, 'saltflat'); assert.equal(desert.layoutType, 'dunefield');
assert.equal(forest.shape, 'rect'); assert.equal(desert.shape, 'rect');
const fa: NativeSeamOwner = { id: 'native-forest', source: JSON.stringify(forest), origin, bounds: { ...forest.size, shape: 'rect' } };
const da: NativeSeamOwner = { id: 'native-desert', source: JSON.stringify(desert),
  origin: moveAddress(origin, { x: forest.size.w + 240, y: 0 }, 960), bounds: { ...desert.size, shape: 'rect' } };
const naturalPlan = requirePlan(fa, da, { ...policy, maxDetour: 180 });
const generated = [[fa, forest], [da, desert]].map(([rawOwner, rawZone]) => {
  const own = rawOwner as NativeSeamOwner, zone = rawZone as typeof forest;
  const ports = nativeAreaSeamPorts(own, [naturalPlan]);
  const def = JSON.parse(JSON.stringify(zone)) as typeof forest;
  def.exits = ports.map(p => ({ to: p.neighbor, side: p.side,
    at: p.side === 'e' || p.side === 'w' ? p.point.y / def.size.h : p.point.x / def.size.w }));
  const captured = captureNativeGeneration(def, () => generateLayout(def, def.size, new Rng(def.seed!), ports[0].approach, ports.map(p => p.point)));
  const geometry = createNativeAreaGeometry(captureNativeAreaGeometry({ sourceIdentity: own.source,
    bounds: { ...def.size, shape: def.shape ?? 'rect' }, layout: captured.value }));
  assert.deepEqual(geometry.source.layout.doodads, captured.value.doodads, 'every native doodad survives');
  for (const key of Object.keys(captured.value)) if (key !== 'walk')
    assert.deepEqual(geometry.source.layout[key as keyof typeof geometry.source.layout], captured.value[key as keyof typeof captured.value], 'all layout output survives: ' + key);
  return { own, geometry, sidechannels: captured.sidechannels };
});
const sceneIdentity = generated.map(row => row.geometry.identity).join('\n');
// A real closed native slab across the connecting substrate, kept in its own
// complete source. Opening it resolves fresh native movement facts.
let obstruction = false;
const doorOrigin = moveAddress(fa.origin, { x: forest.size.w, y: 0 }, 960);
const doorY = naturalPlan.ports.find(p => p.owner === fa.id)!.point.y;
const doorGeometry = (open: boolean) => createNativeAreaGeometry(captureNativeAreaGeometry({
 sourceIdentity: 'door/' + open, bounds: { w: 240, h: Math.max(forest.size.h, desert.size.h), shape: 'rect' },
 layout: { doodads: [{ kind: 'door', pos: { x: 120, y: doorY }, radius: 30,
   hitbox: { kind: 'rect', hw: 12, hh: 240 }, door: { id: 'crossing-door', mode: 'dwell', dwell: 1, open } }],
   pois: [], camps: [], breakables: [], npcs: [], garrisons: [], caveSeeds: [] },
}));
const closedDoor = doorGeometry(false), openDoor = doorGeometry(true);
const completeScene: NativeAreaSeamPhysical = {
  get revision() { return sceneIdentity + '/door=' + obstruction; },
  ownerSource(id) { return generated.find(row => row.own.id === id)?.own.source; },
  sweep(from, to, radius) {
    // This declared fixture has neutral exterior substrate, no unexamined
    // third owner. Each area's exact source geometry participates in the sweep.
    const door = obstruction ? closedDoor : openDoor;
    if (!door.sweepClear(localOffset(from, doorOrigin, 960), localOffset(to, doorOrigin, 960), radius, 0, { sweepClear: () => true })) return false;
    return generated.every(({ own, geometry }) => geometry.sweepClear(localOffset(from, own.origin, 960),
      localOffset(to, own.origin, 960), radius, 0, { sweepClear: () => true }));
  },
};
assert.deepEqual(verifyNativeAreaSeam(naturalPlan, completeScene), { ok: false, reason: 'blocked-connection' }, 'native district wall is retained: clear endpoints cannot certify a straight connection');
const naturalProof = routeNativeAreaSeam(naturalPlan, completeScene);
assert.ok(naturalProof.ok, 'naturally chosen full native recipes must admit the planned physical mouths: ' + JSON.stringify(naturalProof));
for (const row of generated) {
  const restored = createNativeAreaGeometry(restoreNativeAreaGeometry(serializeNativeAreaGeometry(row.geometry.source)));
  assert.equal(restored.identity, row.geometry.identity);
  for (let i = 1; i < naturalProof.receipt.path.length; i++) {
    const p = localOffset(naturalProof.receipt.path[i - 1], row.own.origin, 960), q = localOffset(naturalProof.receipt.path[i], row.own.origin, 960);
    assert.equal(restored.sweepClear(q, p, 15, 0, { sweepClear: () => true }), true, 'cold reversed geometry still admits seam');
  }
}
obstruction = true;
assert.equal(nativeAreaSeamCurrent(naturalProof.receipt, completeScene, 15), false);
assert.deepEqual(verifyNativeAreaSeam(naturalPlan, completeScene), { ok: false, reason: 'blocked-connection' });
assert.deepEqual(routeNativeAreaSeam(naturalPlan, completeScene), { ok: false, reason: 'no-clear-route' });
obstruction = false; assert.ok(routeNativeAreaSeam(naturalPlan, completeScene).ok, 'native door opening restores real collision passage');
console.log('PASS complete natural forest/districts + saltflat/dunefield generation, edge inputs, all output retained, actual 15px capsule both ways and cold restoration',
  JSON.stringify(generated.map(row => ({ id: row.own.id, doodads: row.geometry.source.layout.doodads.length,
    walk: row.geometry.source.walk.kind, sidechannels: row.sidechannels.occurrences.length + row.sidechannels.puzzles.length }))));
