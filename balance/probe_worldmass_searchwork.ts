import assert from 'node:assert/strict';
import type { Vec2 } from '../src/core/math';
import type { PathProfile, RegionGrid } from '../src/world/walk';
import { regionKind } from '../src/world/regions';
import { address } from '../src/worldmass/address';
import type { MassSpec } from '../src/worldmass/contracts';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { MassState } from '../src/worldmass/state';
import { MassStream } from '../src/worldmass/stream';
import { MassWalk, MASS_NAVIGATION, type MassNavigationConfig } from '../src/worldmass/walk';
import { MassNativeResidency, type NativeFeaturePlacement } from '../src/worldmass/nativeResidency';
import { resolveNativeFeature } from '../src/worldmass/nativeFeatures';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';

interface SearchPort {
  stream: MassStream; config: Readonly<MassNavigationConfig>; version: number;
  cacheVersion: string; cache: Map<string, Vec2 | null>; searches: number;
  overlay: MassWalk['overlay']; obstacles: MassWalk['obstacles'];
  regionAt(x: number, y: number): string; isWalkable(x: number, y: number): boolean;
}
interface Node { x: number; y: number; cost: number; first: Vec2 }
// Preserved verbatim search body from f9bef84d: this reference deliberately
// retains every pre-rejection query, heap tie, pop-budget and cache operation.
// Do not port production optimizations into the oracle.
function originalSearch(this: SearchPort, from: Vec2, to: Vec2, profile: PathProfile | undefined): Vec2 | null {
    const version = this.version + ':' + (this.obstacles?.revision() ?? '');
    if (this.cacheVersion !== version) { this.cache.clear(); this.cacheVersion = version; }
    if (this.overlay?.contains(from.x, from.y) && this.overlay.contains(to.x, to.y))
      return this.overlay.grid.pathStep?.(from, to, profile) ?? null;
    const cs = this.stream.generator.spec.terrainCell, fx = Math.floor(from.x / cs), fy = Math.floor(from.y / cs);
    const tx = Math.floor(to.x / cs), ty = Math.floor(to.y / cs);
    if (Math.max(Math.abs(tx - fx), Math.abs(ty - fy)) > this.config.searchRadius) return null;
    const key = JSON.stringify([fx, fy, tx, ty, profile?.key ?? '']);
    if (this.cache.has(key)) { const hit = this.cache.get(key)!; return hit ? { ...hit } : null; }
    if (this.searches >= this.config.searchesPerFrame) return null;
    this.searches++;
    if (!this.isWalkable(from.x, from.y) || !this.isWalkable(to.x, to.y)) return null;
    const heap: Node[] = [];
    const push = (n: Node): void => {
      let i = heap.length; heap.push(n);
      while (i) { const p = (i - 1) >> 1; if (heap[p].cost <= n.cost) break; heap[i] = heap[p]; i = p; }
      heap[i] = n;
    };
    const pop = (): Node => {
      const result = heap[0], tail = heap.pop()!;
      if (heap.length) {
        let i = 0;
        while (i * 2 + 1 < heap.length) {
          let c = i * 2 + 1;
          if (c + 1 < heap.length && heap[c + 1].cost < heap[c].cost) c++;
          if (tail.cost <= heap[c].cost) break;
          heap[i] = heap[c]; i = c;
        }
        heap[i] = tail;
      }
      return result;
    };
    const costs = new Map<string, number>([[fx + ',' + fy, 0]]);
    push({ x: fx, y: fy, cost: 0, first: { ...from } });
    let result: Vec2 | null = null;
    for (let visited = 0; heap.length && visited < this.config.maxNodes; visited++) {
      const n = pop();
      if (n.cost !== costs.get(n.x + ',' + n.y)) continue;
      if (n.x === tx && n.y === ty) { result = n.first; break; }
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const x = n.x + dx, y = n.y + dy;
        if (Math.max(Math.abs(x - fx), Math.abs(y - fy)) > this.config.searchRadius) continue;
        const q = { x: (x + .5) * cs, y: (y + .5) * cs }, id = this.regionAt(q.x, q.y);
        if (!regionKind(id)?.walkable || this.obstacles?.blocked(q.x, q.y)) continue;
        const price = profile?.costOf(id) ?? 1;
        if (!Number.isFinite(price) || price <= 0) continue;
        const cost = n.cost + price, k = x + ',' + y;
        if (cost >= (costs.get(k) ?? Infinity)) continue;
        costs.set(k, cost); push({ x, y, cost, first: n.cost === 0 ? q : n.first });
      }
    }
    this.cache.set(key, result);
    if (this.cache.size > this.config.cacheEntries) this.cache.delete(this.cache.keys().next().value!);
    return result ? { ...result } : null;
}

const spec: MassSpec = { id: 'search-work', version: 1, addressSpan: 960, terrainCell: 24, fields: [],
  surfaces: [{ id: 'base', priority: 0, when: [], region: 'ground', color: '#445522', biome: 'field' }], places: [] };
const origin = address('surface', '-4294967296', '4294967297', 0, 0, 960);
const internals = (walk: MassWalk) => walk as unknown as SearchPort;
const fresh = (reference: boolean, config: Partial<MassNavigationConfig> = {}) => {
  const generator = new MassGenerator(makeMassRun(713, 'search-work', spec), spec);
  const state = new MassState(generator.run, spec.terrainCell);
  const stream = new MassStream(generator, state, { maxPages: 2, maxSamples: 256 });
  const walk = new MassWalk(stream, origin, { ...MASS_NAVIGATION, searchRadius: 8, maxNodes: 256, ...config });
  if (reference) Reflect.set(walk, 'search', originalSearch);
  return { walk, state, stream };
};
const center = (x: number, y: number): Vec2 => ({ x: x * 24 + 12, y: y * 24 + 12 });
const invokeSearch = (walk: MassWalk, from: Vec2, to: Vec2, profile?: PathProfile): Vec2 | null =>
  Reflect.get(walk, 'search').call(walk, from, to, profile) as Vec2 | null;
const uniform: PathProfile = { key: 'priced', costOf: () => 2 };
let comparisons = 0, originalQueries = 0, candidateQueries = 0;
const orderedCache = (walk: MassWalk) => [...internals(walk).cache].map(([key, value]) => [key, value && { ...value }]);
const equalSearchState = (a: MassWalk, b: MassWalk, label: string) => {
  assert.equal(internals(b).searches, internals(a).searches, label + ': frame search budget');
  assert.deepEqual(orderedCache(b), orderedCache(a), label + ': exact FIFO cache contents and order');
  assert.equal(internals(b).cacheVersion, internals(a).cacheVersion, label + ': cache revision');
};

const synthetic = (reference: boolean, seed: number, config: Partial<MassNavigationConfig> = {}, sourceBlocked = false) => {
  const f = fresh(reference, config); let revision = 0, calls = 0;
  const seen = new Set<string>(), first: string[] = [];
  const hash = (x: number, y: number) => (Math.imul(x + seed * 19, 73856093) ^ Math.imul(y - seed, 19349663)) >>> 0;
  f.walk.regionAt = (x, y) => {
    const gx = Math.floor(x / 24), gy = Math.floor(y / 24), h = hash(gx, gy);
    if (Math.abs(gx) > 8 || Math.abs(gy) > 8) return 'wall';
    if (seed && h % 13 === 0 && gx !== 0 && gy !== 0) return 'wall';
    return ['ground', 'sand', 'water'][h % 3];
  };
  f.walk.obstacles = {
    blocked(x, y) {
      calls++; const key = x + ',' + y;
      if (!seen.has(key)) { seen.add(key); first.push(key); }
      const gx = Math.floor(x / 24), gy = Math.floor(y / 24);
      return (sourceBlocked && gx === 0 && gy === 0) || !!(seed && hash(gx, gy) % 19 === 0);
    }, revision: () => String(revision),
  };
  return { ...f, first, calls: () => calls, invalidate: () => { revision++; } };
};
const compare = (a: ReturnType<typeof synthetic>, b: ReturnType<typeof synthetic>, from: Vec2, to: Vec2,
  profile: PathProfile | undefined, label: string, direct = false) => {
  const run = direct ? invokeSearch : (w: MassWalk, f: Vec2, t: Vec2, p?: PathProfile) => w.pathStep(f, t, p);
  const expected = run(a.walk, from, to, profile), actual = run(b.walk, from, to, profile);
  assert.deepEqual(actual, expected, label + ': first step'); equalSearchState(a.walk, b.walk, label);
  assert.deepEqual(b.first, a.first, label + ': every first obstacle observation retained in order');
  comparisons++;
  return actual;
};

// Tiny exhaustive seed/budget courses retain bounded-work failures and tie order.
for (const seed of [0, 1, 7, 91]) for (const maxNodes of [1, 2, 3, 8, 31, 256]) {
  const a = synthetic(true, seed, { maxNodes }), b = synthetic(false, seed, { maxNodes });
  for (const [x, y] of [[4, 3], [-4, 3], [4, -3], [-4, -3], [0, 0], [9, 0]]) {
    a.walk.beginFrame(); b.walk.beginFrame();
    compare(a, b, center(0, 0), center(x, y), uniform, `seed ${seed}, pops ${maxNodes}, ${x}/${y}`, true);
  }
  originalQueries += a.calls(); candidateQueries += b.calls();
}
assert.ok(candidateQueries < originalQueries, 'search rejects repeated geometry work without reducing search budgets');
console.log('PASS preserved search oracle: ties, bounded pop work, signed coordinates and search radius',
  JSON.stringify({ comparisons, originalQueries, candidateQueries }));

const prices = [0.1, 0.5, 1, 9, Number.MIN_VALUE, 2 ** 53, Number.MAX_VALUE, 0, -0, -3, NaN, Infinity, -Infinity];
for (let i = 0; i < prices.length; i++) {
  const a = synthetic(true, 7), b = synthetic(false, 7);
  const profile: PathProfile = { key: 'price-' + i, costOf: id => id === 'sand' ? prices[i] : id === 'water' ? 0.5 : 2 };
  compare(a, b, center(0, 0), center(5, 4), profile, 'weighted/invalid ' + i, true);
  // Uniform huge prices exercise finite addition overflow; subnormal prices
  // and near-2^53 mixtures exercise rounded equality without changing ties.
  compare(a, b, center(-1, -1), center(4, 4), { key: 'uniform-' + i, costOf: () => prices[i] }, 'uniform ' + i, true);
}
{
  const a = synthetic(true, 0), b = synthetic(false, 0);
  for (const f of [a, b]) f.walk.regionAt = (x, y) => {
    const gx = Math.floor(x / 24), gy = Math.floor(y / 24);
    return gy !== 0 || gx < 0 || gx > 4 ? 'wall' : gx === 1 ? 'sand' : 'ground';
  };
  const rounded: PathProfile = { key: 'forced-rounded-addition', costOf: id => id === 'sand' ? 2 ** 53 : 0.5 };
  assert.deepEqual(compare(a, b, center(0, 0), center(4, 0), rounded, 'forced rounded cumulative cost', true), center(1, 0));
  assert.equal(compare(a, b, center(0, 0), center(4, 0), { key: 'forced-overflow', costOf: () => Number.MAX_VALUE },
    'forced infinite sum', true), null, 'finite edge prices must not enqueue an infinite cumulative cost');
}
console.log('PASS positive, fractional, subnormal, rounded, overflow, zero, negative and non-finite prices');

{
  const a = synthetic(true, 0, { cacheEntries: 2 }), b = synthetic(false, 0, { cacheEntries: 2 });
  const check = (x: number, y: number, profile: PathProfile = uniform) =>
    compare(a, b, center(0, 0), center(x, y), profile, `lifecycle ${x}/${y}`, true);
  check(4, 3); const spent = internals(a.walk).searches; check(4, 3);
  assert.equal(internals(a.walk).searches, spent, 'cache hits consume no search allowance');
  check(-4, 3); check(4, -3); check(-4, -3);
  assert.equal(internals(a.walk).searches, 4);
  assert.equal(check(3, 4), null, 'fifth distinct search keeps the unchanged frame ceiling');
  a.walk.beginFrame(); b.walk.beginFrame(); check(3, 4);
  a.invalidate(); b.invalidate(); check(3, 4);
  for (const f of [a, b]) f.state.paint({ address: origin, region: 'sand', color: '#abcdef', cause: 'oracle revision' });
  check(3, 4); check(3, 4, { key: 'other-prices', costOf: id => id === 'water' ? 9 : 2 });
  for (const f of [a, b]) f.walk.native = { cellSize: 30, revision: 11, regionAt: () => undefined };
  a.walk.beginFrame(); b.walk.beginFrame(); check(3, 4);
  const grid = { cellSize: 24, version: 3, regionAt: () => 'ground', pathStep: () => ({ x: -77, y: 88 }) } as unknown as RegionGrid;
  for (const f of [a, b]) f.walk.overlay = { grid, contains: x => x < 0 };
  assert.deepEqual(compare(a, b, center(-2, 0), center(-4, 2), uniform, 'overlay delegation', true), { x: -77, y: 88 });
  compare(a, b, center(-2, 0), center(4, 2), uniform, 'cross-overlay search', true);
  // Public pathStep keeps the direct-ray path and the original search fallback.
  a.walk.beginFrame(); b.walk.beginFrame(); compare(a, b, center(0, 0), center(5, 4), uniform, 'public search');
  compare(a, b, center(0, 0), center(1, 0), undefined, 'public clear ray');
}
{
  const a = synthetic(true, 0, {}, true), b = synthetic(false, 0, {}, true);
  compare(a, b, center(0, 0), center(4, 3), uniform, 'blocked source', true);
  assert.ok(b.first.includes('12,12'), 'the seeded source retains its first obstacle observation');
}
console.log('PASS frame, FIFO cache, terrain/native/obstacle revisions, profiles, overlays and blocked-source observations');

{
  const f = fresh(false); let overlaySize = 20, nativeSize = 30, overlayReads = 0, nativeReads = 0;
  const grid = { get cellSize() { overlayReads++; return overlaySize; }, version: 0, regionAt: () => 'ground' } as unknown as RegionGrid;
  f.walk.overlay = { grid, contains: () => false };
  f.walk.native = { get cellSize() { nativeReads++; return nativeSize; }, revision: 0, regionAt: () => undefined };
  const oldLattice = (terrain: number, overlay: number, native: number) => {
    let a = terrain; for (let b of [overlay, native]) while (b) { const r = a % b; a = b; b = r; } return a;
  };
  for (const sizes of [[20, 30], [20, 30], [12, 30], [12, 18], [30, 18], [30, 18], [24, 24]]) {
    [overlaySize, nativeSize] = sizes;
    assert.equal(f.walk.cellSize, oldLattice(24, overlaySize, nativeSize));
  }
  assert.equal(overlayReads, 7); assert.equal(nativeReads, 7, 'memo hits still read both live numeric inputs');
  f.walk.native = undefined; assert.equal(f.walk.cellSize, 24);
  f.walk.overlay = undefined; assert.equal(f.walk.cellSize, 24);
}
console.log('PASS lattice memo matches original Euclid result and keeps live getter reads without revision changes');

const restore = seedGlobalRandom(713);
try {
  makeSimWorld('warrior', 713);
  const placement: NativeFeaturePlacement = { id: 'search-work-native', origin,
    request: { id: 'search-work-native', seed: 42, source: { kind: 'structure', id: 'marble_monastery', tileset: 'downs' } } };
  const descriptor = resolveNativeFeature(placement.request), caps = new Set(descriptor.requirements);
  const native = (reference: boolean) => {
    const f = fresh(reference); let queries = 0, sourceQueries = 0;
    const features = new MassNativeResidency({ run: 'search-work', addressSpan: 960, maxBlueprints: 4, maxResidents: 1, maxCandidates: 2 },
      () => [placement], caps, () => origin);
    f.walk.native = { cellSize: 30, get revision() { return features.version; }, regionAt: at => features.regionAt(at) };
    f.stream.overlay = { get revision() { return features.version; }, revisionAt: cell => features.revisionAt(cell), sample: (at, base) => features.sample(at, base) };
    f.walk.obstacles = { revision: () => String(features.version), blocked(x, y) {
      queries++; const result = features.obstacleAt(f.walk.at(x, y), f.walk.cellSize / 2);
      if (x === -36 && y === -36) sourceQueries++;
      return !!result || (x === -36 && y === -36); // source is walkable terrain with a physical obstruction
    } };
    return { ...f, features, queries: () => queries, sourceQueries: () => sourceQueries };
  };
  const a = native(true), b = native(false);
  assert.equal(a.features.snapshot(0).born.length, 0); assert.equal(b.features.snapshot(0).born.length, 0);
  for (const [from, to] of [[center(-2, -2), center(3, -2)], [center(-2, -2), center(-2, 4)], [center(-3, -3), center(2, -3)]]) {
    a.walk.beginFrame(); b.walk.beginFrame();
    assert.deepEqual(b.walk.pathStep(from, to, uniform), a.walk.pathStep(from, to, uniform));
    equalSearchState(a.walk, b.walk, 'cold native search');
    assert.deepEqual(b.features.snapshot(1), a.features.snapshot(1), 'same exact cold born ownership and sparse state');
    comparisons++;
  }
  assert.equal(a.features.snapshot(1).born.length, 1, 'actual native source hydrated during the cold course');
  assert.equal(a.features.stats.resident, 0); assert.equal(b.features.stats.resident, 0);
  assert.ok(b.sourceQueries() > 0, 'cold search really queries the blocked coarse source center');
  assert.equal(b.sourceQueries(), a.sourceQueries(), 'source observation count stays unchanged');
  assert.ok(b.queries() < a.queries(), 'real cold-native navigation also avoids repeated obstacle work');
  console.log('PASS cold native source hydration, blocked source, born snapshots and no scene admission',
    JSON.stringify({ originalQueries: a.queries(), candidateQueries: b.queries() }));
} finally { restore(); }
console.log('PASS search-work oracle complete', JSON.stringify({ comparisons }));
