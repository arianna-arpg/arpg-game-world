import assert from 'node:assert/strict';
import { planNativeAreaRoutes, restoreNativeAreaRouteProof } from '../src/worldmass/nativeAreaRoutes';
import { captureNativeAreaGeometry } from '../src/worldmass/nativeAreaGeometryCapture';
import { serializeNativeAreaData, restoreNativeAreaData, type NativeAreaGeometrySource } from '../src/worldmass/nativeAreaGeometry';
import type { Doodad } from '../src/engine/levelgen';
const fixture = (name: string, doodads: Doodad[], shape: 'rect' | 'ellipse' = 'rect', w = 600, h = 600): NativeAreaGeometrySource => captureNativeAreaGeometry({
  sourceIdentity: name, bounds: { w, h, shape }, layout: { doodads, pois: [], camps: [], breakables: [], npcs: [], garrisons: [], caveSeeds: [] },
});
const door = (open: boolean, hh: number): Doodad => ({ kind: 'door', pos: { x: 300, y: 300 }, radius: 30,
  hitbox: { kind: 'rect', hw: 12, hh }, door: { id: 'gate', mode: 'dwell', dwell: 1, open } });
const request = { bodyRadius: 15, from: { x: 60, y: 300 }, targets: [{ id: 'east-mouth-approach', point: { x: 540, y: 300 } }] };
const obstacle = fixture('retained-wall', [door(false, 180)]), before = serializeNativeAreaData(obstacle);
const detour = planNativeAreaRoutes(obstacle, request);
assert.ok(detour.ok, JSON.stringify(detour)); assert.ok(detour.proof.routes[0].length > 480);
assert.ok(detour.proof.routes[0].path.some(p => p.y <= 90 || p.y >= 510));
assert.equal(serializeNativeAreaData(obstacle), before);
const cold = restoreNativeAreaRouteProof(restoreNativeAreaData(before), restoreNativeAreaData(serializeNativeAreaData(detour.proof)));
assert.deepEqual(cold, detour.proof);
assert.ok(Object.isFrozen(cold.request.targets[0].point));
const forged = structuredClone(detour.proof); forged.routes[0].path = [request.from, request.targets[0].point]; forged.routes[0].length = 480;
assert.throws(() => restoreNativeAreaRouteProof(obstacle, forged), /blocked/);
assert.throws(() => restoreNativeAreaRouteProof(fixture('different', []), detour.proof), /proof/);
const closed = planNativeAreaRoutes(fixture('closed-full-gate', [door(false, 300)]), request);
assert.equal(closed.ok, false); if (!closed.ok) assert.equal(closed.reason, 'no-clear-route');
const opened = planNativeAreaRoutes(fixture('opened-full-gate', [door(true, 300)]), request);
assert.ok(opened.ok); assert.equal(opened.proof.routes[0].length, 480);
const blocked = planNativeAreaRoutes(obstacle, { ...request, from: { x: 300, y: 300 } });
assert.equal(blocked.ok, false); if (!blocked.ok) assert.equal(blocked.reason, 'blocked-origin');
const ellipse = planNativeAreaRoutes(fixture('ellipse', [], 'ellipse'), { ...request, from: { x: 80, y: 300 }, targets: [{ id: 'far', point: { x: 520, y: 300 } }] });
assert.ok(ellipse.ok);
const outside = planNativeAreaRoutes(fixture('ellipse-corners', [], 'ellipse'), { ...request, targets: [{ id: 'outside', point: { x: 25, y: 25 } }] });
assert.equal(outside.ok, false); if (!outside.ok) assert.equal(outside.reason, 'blocked-target');
const max = planNativeAreaRoutes(fixture('budget', [], 'rect', 16384, 16384), request);
assert.equal(max.ok, false); if (!max.ok) assert.equal(max.reason, 'route-work-budget');
let reads = 0; const accessor = structuredClone(request); Object.defineProperty(accessor, 'from', { enumerable: true, get() { reads++; return request.from; } });
assert.throws(() => planNativeAreaRoutes(obstacle, accessor), /Non-data/); assert.equal(reads, 0);
assert.throws(() => planNativeAreaRoutes(obstacle, { ...request, targets: [request.targets[0], request.targets[0]] }), /target/);
const oldPieces = Object.getOwnPropertyDescriptor(Object.prototype, 'pieces');
const oldX = Object.getOwnPropertyDescriptor(Object.prototype, 'x'), oldY = Object.getOwnPropertyDescriptor(Object.prototype, 'y');
try {
  Object.defineProperty(Object.prototype, 'pieces', { configurable: true, value: [{ x: 1e6, y: 1e6, w: 900, h: 900, active: true }] });
  const inheritedBounds = planNativeAreaRoutes(obstacle, request); assert.ok(inheritedBounds.ok);
  assert.deepEqual(inheritedBounds.proof, detour.proof, 'inherited annexes never change search');
  Object.defineProperty(Object.prototype, 'x', { configurable: true, value: 300 });
  Object.defineProperty(Object.prototype, 'y', { configurable: true, value: 90 });
  const inheritedPoint = structuredClone(detour.proof);
  inheritedPoint.routes[0].path = [request.from, {} as { x: number; y: number }, request.targets[0].point];
  inheritedPoint.routes[0].length = 2 * Math.hypot(240, 210);
  assert.throws(() => restoreNativeAreaRouteProof(obstacle, inheritedPoint), /endpoints/);
} finally {
  for (const [key, descriptor] of [['pieces', oldPieces], ['x', oldX], ['y', oldY]] as const) {
    if (descriptor) Object.defineProperty(Object.prototype, key, descriptor); else Reflect.deleteProperty(Object.prototype, key);
  }
}

console.log('PASS retained-wall detour, closed/open native gate, exact stands, no exterior ellipse shortcut, full source restore/reproof, accessor refusal and bounded work');

// Naturally minted, complete native layouts. These exact entry/approach points
// are generation inputs, not nearest-clear replacements after seeing geometry.
const { makeSimWorld } = await import('../src/sim/arena');
const { withSeededRandom, Rng } = await import('../src/core/rng');
const { placeZoneAt } = await import('../src/engine/worldgen');
const { captureNativeGeographySource } = await import('../src/world/captureGeography');
const { createNativeGeographyReader } = await import('../src/world/geographySource');
const { generateLayout } = await import('../src/engine/levelgen');
const { captureNativeGeneration } = await import('../src/worldmass/nativeGeneration');
const counts: unknown[] = [];
for (const [seed, x, y, mintSeed, index] of [[991, -55, 160, 2468017101, 810156], [713, -67.5, -8745, 924637573, 810108]]) {
  const world = withSeededRandom(seed, () => makeSimWorld('warrior', seed)); world.sim.bindGeographyPolicies();
  const field = createNativeGeographyReader(captureNativeGeographySource(seed));
  const zone = placeZoneAt({ x, y }, null, structuredClone(world.zoneMap), index, { seed: mintSeed, level: 10,
    fieldBiome: true, biomeFor: field.biomeAt, biomeDepthFor: field.biomeDepth, climateFor: field.climateAt });
  const entry = { x: 180, y: zone.size.h / 2 }, goal = { x: zone.size.w - 180, y: zone.size.h / 2 };
  const bounds = { ...zone.size, shape: zone.shape! };
  const { value: layout } = captureNativeGeneration(zone, () => generateLayout(zone, bounds, new Rng(zone.seed!), entry, [goal]));
  const source = captureNativeAreaGeometry({ sourceIdentity: serializeNativeAreaData(zone), bounds: { ...zone.size, shape: zone.shape! }, layout });
  const result = planNativeAreaRoutes(source, { bodyRadius: 15, from: layout.spawnAt ?? entry, targets: [{ id: 'recorded-approach', point: goal }] });
  assert.ok(result.ok, zone.tileset + '/' + zone.layoutType + ': ' + JSON.stringify(result));
  restoreNativeAreaRouteProof(source, restoreNativeAreaData(serializeNativeAreaData(result.proof)));
  counts.push({ face: zone.tileset, layout: zone.layoutType, doodads: layout.doodads.length, expanded: result.expanded, sweeps: result.sweeps, length: result.proof.routes[0].length });
}
console.log('PASS whole natural native area spawn/entry to recorded approach with full-radius routes and cold reproof', JSON.stringify(counts));
