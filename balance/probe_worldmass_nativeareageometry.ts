import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import '../src/engine/world';
import { nativeSceneGroundAt, type NativeSceneGeometryHost } from '../src/engine/nativeSceneGeometry';
import { hitSurfaceOf, blocksMovement, type Doodad, type GeneratedLayout } from '../src/engine/levelgen';
import { shapeContains, shapeDistance } from '../src/engine/shapes';
import { insideBounds, type Bounds } from '../src/world/shape';
import { GridWalkField } from '../src/world/gridWalk';
import { regionKind, LIQUID_CFG } from '../src/world/regions';
import { captureNativeAreaGeometry } from '../src/worldmass/nativeAreaGeometryCapture';
import { createNativeAreaGeometry, restoreNativeAreaGeometry, serializeNativeAreaGeometry, nativeAreaShapeIntervals } from '../src/worldmass/nativeAreaGeometry';

const layout = (doodads: Doodad[], walk?: GridWalkField): GeneratedLayout => ({ doodads, walk, pois: [], camps: [], breakables: [], npcs: [], garrisons: [], caveSeeds: [] });
const body = (kind: string, x = 300, y = 300, radius = 65, other: Partial<Doodad> = {}): Doodad => ({ kind, pos: { x, y }, radius, ...other });
const bounds: Bounds = { w: 1200, h: 900, shape: 'rect' };
const capture = (l: GeneratedLayout, b = bounds) => captureNativeAreaGeometry({ sourceIdentity: 'fixture/native-area-geometry-v1', bounds: b, layout: l });
let comparisons = 0;
const eq = (a: unknown, b: unknown, label: string) => { assert.deepEqual(a, b, label); comparisons++; };

// The native methods remain an independent live oracle. Source hashes make the
// exact comparison target explicit without any runtime Git/ignored dependency.
const files = ['src/engine/world.ts', 'src/engine/nativeSceneGeometry.ts', 'src/engine/levelgen.ts', 'src/engine/shapes.ts', 'src/world/shape.ts', 'src/world/gridWalk.ts'];
const nativeHashes = Object.fromEntries(files.map(f => [f, createHash('sha256').update(readFileSync(f)).digest('hex')]));
const oldRandom = Math.random;
Math.random = () => { throw Error('Geometry consumed ambient random'); };
try {
  const variants = [
    [body('mud'), body('road')], [body('road'), body('mud'), body('bog')],
    [body('swamp'), body('ice')], [body('ice'), body('swamp')],
    [body('water'), body('mud')], [body('water'), body('swamp')],
    [body('water'), body('road')], [body('road', 300, 300, 65, { wild: true }), body('mud')],
    [body('water'), body('water', 330, 300, 42, { shallow: true })],
    [body('brine_sink'), body('brine_sink', 330, 300, 42, { shallow: true })],
    [body('mud'), body('bridge', 300, 300, 28, { tier: 2 })],
    [body('mud', 300, 300, 65, { tier: 1 }), body('swamp')],
  ];
  for (const doodads of variants) {
    const geometry = createNativeAreaGeometry(capture(layout(doodads)));
    // These are the complete ports read by native ground folding. The separate
    // nativescenegeometry probe exercises actual World adapters and their cache.
    const nativeGroundHost: Pick<NativeSceneGeometryHost, 'bridges' | 'doodadsAt'> = { bridges: doodads.filter(d => d.kind === 'bridge'), doodadsAt: () => doodads };
    for (let y = 210; y <= 390; y += 15) for (let x = 210; x <= 390; x += 15) for (const tier of [0, 1, 2])
      eq(geometry.groundAt({ x, y }, tier), nativeSceneGroundAt(nativeGroundHost as NativeSceneGeometryHost, { x, y }, tier), 'native ordered ground fold');
  }
  const analytic = createNativeAreaGeometry(capture(layout([]), { ...bounds, shape: 'ellipse', pieces: [
    { id: 'east', x: 1100, y: 200, w: 500, h: 400, active: true },
    { id: 'sealed', x: 1600, y: 200, w: 300, h: 300, active: false },
  ] }));
  for (let y = -30; y <= 930; y += 30) for (let x = -30; x <= 1950; x += 30) {
    const expected = insideBounds({ x, y }, 0, { ...bounds, shape: 'ellipse' }) || x >= 1100 && x < 1600 && y >= 200 && y < 600;
    eq(analytic.contains({ x, y }), expected, 'native analytic silhouette with half-open rect ownership');
    eq(analytic.regionAt(x, y), expected ? 'ground' : undefined, 'analytic neutral ground owned');
  }
  const grid = new GridWalkField(1200, 900, 30);
  grid.fillRegion(0, 0, 1199, 899, 'ground'); grid.fillRegion(570, 120, 599, 779, 'wall');
  grid.fillRegion(720, 240, 839, 359, 'mud'); grid.fillRegion(720, 390, 839, 509, 'swamp');
  const g = createNativeAreaGeometry(capture(layout([], grid)));
  for (let y = 0; y < 900; y += 15) for (let x = 0; x < 1200; x += 15) eq(g.regionAt(x, y), grid.regionAt(x, y), 'full native grid material');
  assert(!g.sweepClear({ x: 300, y: 450 }, { x: 900, y: 450 }, 15), 'thin wall cannot be skipped');
  assert(g.sweepClear({ x: 300, y: 75 }, { x: 900, y: 75 }, 15), 'actual top route stays clear');
  assert(g.sweepClear({ x: 300, y: 825 }, { x: 900, y: 825 }, 15), 'actual bottom route stays clear');
  assert(g.sweepClear({ x: 700, y: 300 }, { x: 880, y: 300 }, 15), 'mud remains walkable, not wall');
  assert(!g.sweepClear({ x: -60, y: 75 }, { x: 300, y: 75 }, 15), 'unknown exterior refuses');
  let exteriorCalls = 0;
  assert(g.sweepClear({ x: -60, y: 75 }, { x: 300, y: 75 }, 15, 0, { sweepClear(a, b, r, tier, owns) {
    exteriorCalls++; eq([a.x, b.x, r, tier, owns(-1, 75), owns(1, 75)], [-60, 300, 15, 0, false, true], 'full exterior capsule contract'); return true;
  } }));
  assert.equal(exteriorCalls, 1);
  eq(grid.regionAt(1200, 75), 'wall', 'native packed field off-grid sentinel');
  eq(g.regionAt(1200, 75), undefined, 'exact right edge belongs to exterior');
  eq(g.regionAt(100, 900), undefined, 'exact bottom edge belongs to exterior');
  assert(!g.discClear({ x: 1200, y: 75 }, 0), 'even a zero-radius exterior point needs proof');
  assert(g.discClear({ x: 1200, y: 75 }, 15, 0, { sweepClear: () => true }));
  assert(!g.discClear({ x: 1185, y: 75 }, 15), 'full capsule tangency at half-open edge needs exterior ownership');
  assert(g.discClear({ x: 1185, y: 75 }, 15, 0, { sweepClear: () => true }));
  const adjacentGrid = new GridWalkField(1200, 900, 30); adjacentGrid.fillRegion(0, 0, 1199, 899, 'ground');
  const adjacent = createNativeAreaGeometry(capture(layout([], adjacentGrid)));
  for (const x of [1199.999, 1200, 1200.001]) eq([g.regionAt(x, 75), adjacent.regionAt(x - 1200, 75)], x < 1200 ? ['ground', undefined] : [undefined, 'ground'], 'adjacent ownership exactly once');
  assert(g.sweepClear({ x: 1100, y: 75 }, { x: 1300, y: 75 }, 15, 0, { sweepClear(a, b, r) {
    return adjacent.sweepClear({ x: a.x - 1200, y: a.y }, { x: b.x - 1200, y: b.y }, r, 0, { sweepClear: () => true });
  } }), 'two actual grid owners cross the exact right edge');
  adjacentGrid.fillRegion(0, 0, 29, 149, 'wall');
  const blockedAdjacent = createNativeAreaGeometry(capture(layout([], adjacentGrid)));
  assert(!g.sweepClear({ x: 1100, y: 75 }, { x: 1300, y: 75 }, 15, 0, { sweepClear(a, b, r) {
    return blockedAdjacent.sweepClear({ x: a.x - 1200, y: a.y }, { x: b.x - 1200, y: b.y }, r, 0, { sweepClear: () => true });
  } }), 'actual adjacent wall remains blocking at a seam');
  assert(!g.sweepClear({ x: -60, y: 75 }, { x: 300, y: 75 }, 15, 0, { sweepClear: () => false }));
  const separated = createNativeAreaGeometry(capture(layout([]), { w: 100, h: 100, shape: 'rect', pieces: [{ id: 'island', x: 200, y: 0, w: 100, h: 100, active: true }] }));
  assert(!separated.sweepClear({ x: 50, y: 50 }, { x: 250, y: 50 }, 10), 'endpoints in different pieces do not bridge an unknown gap');
  assert(!analytic.discClear({ x: 0, y: 0 }, 15), 'ellipse corner is not a rectangular floor');
  const narrowEllipse = createNativeAreaGeometry(capture(layout([]), { w: 200, h: 100, shape: 'ellipse' }));
  const rim = { x: 100 + 90 / Math.sqrt(2), y: 50 + 40 / Math.sqrt(2) };
  assert(insideBounds(rim, 10, narrowEllipse.source.bounds), 'native center clamp witness');
  assert(!narrowEllipse.discClear(rim, 10), 'whole-disc proof catches curved-rim overhang');
  for (let y = 10; y < 100; y += 10) for (let x = 10; x < 200; x += 10) if (narrowEllipse.discClear({ x, y }, 10))
    for (let k = 0; k < 360; k++) assert(narrowEllipse.contains({ x: x + 10 * Math.cos(k * Math.PI / 180), y: y + 10 * Math.sin(k * Math.PI / 180) }), 'accepted disc crosses analytic ellipse');

  const scenery = [body('sunken_log', 300, 300, 45, { rot: Math.PI / 4 }), body('rock', 550, 300, 50, { rot: 1.723 }),
    body('door', 850, 300, 25, { hitbox: { kind: 'rect', hw: 14, hh: 95, rot: .3 } }),
    body('mud', 750, 700, 75)];
  const physical = createNativeAreaGeometry(capture(layout(scenery)));
  scenery.forEach((d, i) => eq(physical.source.bodies[i].move, hitSurfaceOf(d, 'move'), 'captured actual native move shape'));
  assert.equal(physical.source.bodies[1].move.kind, 'multi', 'real rock satellites captured');
  for (let y = 150; y <= 450; y += 9) for (let x = 150; x <= 1000; x += 9) {
    const clear = !scenery.some(d => blocksMovement(d) && shapeContains(hitSurfaceOf(d, 'move'), d.pos.x, d.pos.y, x, y, 15));
    if (scenery.every(d => Math.abs(shapeDistance(hitSurfaceOf(d, 'move'), d.pos.x, d.pos.y, x, y) - 15) > 1e-8))
      eq(physical.discClear({ x, y }, 15), clear, 'native movement surface disc comparison');
  }
  assert(nativeAreaShapeIntervals({ kind: 'circle', r: 1 }, { x: 8765.43211, y: 0 }, { x: 0, y: 15.9999999999 }, { x: 10000, y: 15.9999999999 }, 15).length,
    'long near-tangent capsule must not lose a real circle intersection');
  for (const length of [100, 10000, 1e7]) for (const penetration of [1e-4, 1e-6, 1e-10]) {
    const a = { x: 0, y: 16 - penetration }, b = { x: length, y: 16 - penetration }, center = { x: length * .876543211, y: 0 };
    assert(nativeAreaShapeIntervals({ kind: 'circle', r: 1 }, center, a, b, 15).length);
    assert(nativeAreaShapeIntervals({ kind: 'circle', r: 1 }, center, b, a, 15).length);
  }
  const shapes = physical.source.bodies.map(b => b.move);
  for (let k = 0; k < 140; k++) {
    const a = { x: 170 + (k * 71) % 800, y: 160 + (k * 53) % 320 }, b = { x: 170 + (k * 137) % 800, y: 160 + (k * 89) % 320 };
    for (let i = 0; i < shapes.length; i++) {
      const hits = nativeAreaShapeIntervals(shapes[i], scenery[i].pos, a, b, 15);
      for (let step = 0; step <= 70; step++) {
        const t = step / 70, p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        const native = shapeContains(shapes[i], scenery[i].pos.x, scenery[i].pos.y, p.x, p.y, 15);
        assert(!native || hits.some(([lo, hi]) => t >= lo - 1e-10 && t <= hi + 1e-10), 'continuous capsule missed original surface');
      }
      eq(hits.length > 0, nativeAreaShapeIntervals(shapes[i], scenery[i].pos, b, a, 15).length > 0, 'sweep reversal');
    }
  }
  const bridged = createNativeAreaGeometry(capture(layout([body('chasm', 600, 450, 150), body('bridge', 600, 450, 190)])));
  assert(bridged.sweepClear({ x: 300, y: 450 }, { x: 900, y: 450 }, 15), 'original bridge suppresses covered chasm');
  const shortBridge = createNativeAreaGeometry(capture(layout([body('chasm', 600, 450, 150), body('bridge', 600, 450, 100)])));
  assert(!shortBridge.sweepClear({ x: 300, y: 450 }, { x: 900, y: 450 }, 15), 'partial bridge cannot erase rest of chasm');
  const bridgeRock = createNativeAreaGeometry(capture(layout([body('chasm', 600, 450, 150), body('bridge', 600, 450, 190), body('rock', 600, 700, 45)])));
  assert(!bridgeRock.sweepClear({ x: 600, y: 20 }, { x: 600, y: 880 }, 15), 'bridge must not suppress an unrelated solid');

  const exactLayout = layout([body('mud', -0, 200)]); exactLayout.spawnAt = undefined;
  const source = capture(exactLayout), bytes = serializeNativeAreaGeometry(source), restored = restoreNativeAreaGeometry(bytes);
  const { walk: ignoredWalk, ...exactData } = exactLayout;
  eq(restored.layout, exactData, 'full layout including undefined and signed zero');
  assert(Object.hasOwn(restored.layout, 'spawnAt') && Object.is(restored.layout.doodads[0].pos.x, -0));
  eq(serializeNativeAreaGeometry(restored), bytes, 'wire exact identity');
  const frozen = createNativeAreaGeometry(source), before = frozen.groundAt({ x: 0, y: 200 });
  exactLayout.doodads[0].radius = 1; exactLayout.doodads[0].pos.y = 800;
  const mud = regionKind('mud')!, severity = mud.severity, inset = LIQUID_CFG.deepInset;
  try { mud.severity = 999; LIQUID_CFG.deepInset = 999; eq(frozen.groundAt({ x: 0, y: 200 }), before, 'no mutable source/live registry reads'); }
  finally { mud.severity = severity; LIQUID_CFG.deepInset = inset; }
  assert(Object.isFrozen(frozen.source.layout.doodads[0].pos));
  const rock = createNativeAreaGeometry(capture(layout([body('rock', 600, 450, 60)])));
  const originalBlocked = rock.discClear({ x: 600, y: 450 }, 15);
  assert.equal(originalBlocked, false);
  Object.defineProperty(Object.prototype, 'tier', { value: 1, configurable: true });
  Object.defineProperty(Object.prototype, 'rot', { value: 2.3, configurable: true });
  try { eq(rock.discClear({ x: 600, y: 450 }, 15), originalBlocked, 'captured optional defaults isolated from later prototype data'); }
  finally { delete (Object.prototype as { tier?: number }).tier; delete (Object.prototype as { rot?: number }).rot; }
  for (const result of ['yes', {}, Promise.resolve(false)]) assert(!rock.sweepClear({ x: -30, y: 100 }, { x: 120, y: 100 }, 15, 0,
    { sweepClear: (() => result) as unknown as () => boolean }), 'exterior must return literal true');
  let mutationRefused = false;
  assert(!rock.sweepClear({ x: -30, y: 450 }, { x: 900, y: 450 }, 15, 0, { sweepClear(a, b) {
    try { a.y = 100; b.y = 100; } catch { mutationRefused = true; } return true;
  } }), 'exterior cannot redirect original blocked capsule');
  assert(mutationRefused);
  const copy = <T>(x: T): T => structuredClone(x);
  for (const mutate of [
    (s: typeof source) => { s.bodies.pop(); }, (s: typeof source) => { (s as unknown as { sourceIdentity: unknown }).sourceIdentity = 123; }, (s: typeof source) => { s.bounds.boundless = true; },
    (s: typeof source) => { s.bodies[0].move = { kind: 'circle', r: Infinity }; },
    (s: typeof source) => { s.materials = s.materials.filter(m => m.id !== 'ground'); },
  ]) { const bad = copy(source); mutate(bad); assert.throws(() => createNativeAreaGeometry(bad)); }
  for (const bad of [
    { ...copy(source), materials: [...copy(source.materials), { id: 123, walkable: true, deep: false }] },
    { ...copy(source), materials: copy(source.materials).map(m => m.id === 'mud' ? { ...m, overruns: 'yes' } : m) },
    { ...copy(source), layout: { ...copy(source.layout), doodads: [{ ...copy(source.layout.doodads[0]), kind: 123 }] } },
    ...['shallow', 'wild'].map(k => ({ ...copy(source), layout: { ...copy(source.layout), doodads: [{ ...copy(source.layout.doodads[0]), [k]: 'yes' }] } })),
    { ...copy(source), bounds: { ...copy(source.bounds), pieces: [{ id: 'bad-active', x: 0, y: 0, w: 20, h: 20, active: 'yes' }] } },
  ]) assert.throws(() => createNativeAreaGeometry(bad as unknown as typeof source));
  const badGrid = copy(g.source); if (badGrid.walk.kind === 'grid') badGrid.walk.packed.kbits = ''; assert.throws(() => createNativeAreaGeometry(badGrid));
  assert.throws(() => captureNativeAreaGeometry({ sourceIdentity: 'unknown-walk', bounds, layout: { ...layout([]), walk: { isWalkable: () => true, snapToWalkable: p => p } } }));
  assert.throws(() => physical.discClear({ x: Infinity, y: 0 }, 15));
  assert.throws(() => physical.sweepClear({ x: 10, y: 10 }, { x: 20, y: 20 }, -1));
  const many = Array.from({ length: 5000 }, (_, i) => body('rock', 50 + i % 100 * 50, 50 + Math.floor(i / 100) * 50, 8));
  const indexed = createNativeAreaGeometry(capture(layout(many), { w: 5100, h: 2600, shape: 'rect' }));
  assert(indexed.candidates({ minX: 48, minY: 48, maxX: 52, maxY: 52 }).length < 25, 'local queries do not scan thousands of doodads');
  eq(createNativeAreaGeometry(restoreNativeAreaGeometry(serializeNativeAreaGeometry(g.source))).regionAt(750, 300), 'mud', 'worker-style restored material');
} finally { Math.random = oldRandom; }
console.log(JSON.stringify({ probe: 'worldmass_nativeareageometry', comparisons, nativeHashes, status: 'PASS' }));
