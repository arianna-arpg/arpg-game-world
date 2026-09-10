import assert from 'node:assert/strict';
import { atlasBudget, AtlasRevealIndex } from '../src/ui/atlasBudget';
import { AtlasInputCache } from '../src/ui/atlasInputCache';
import { atlasChart, atlasChartReset, atlasChartBusy, atlasKeep, atlasStats, type AtlasChartInput } from '../src/ui/atlasPaint';
import { ATLAS_CFG } from '../src/world/atlas';
import { WorldSim } from '../src/world/sim';

let paints = 0, extents = 0;
const overlays = [{ id: 'terrain', mapLabel: 'Terrain', renderMap: () => { paints++; return { under: 'ground', over: 'mark' }; },
  mapExtent: () => { extents++; return [{ x: 1, y: 2 }]; } }];
const sim = { overlays } as unknown as WorldSim;
const muted = WorldSim.prototype.mapLayers.call(sim, [], 'surface', new Set(['terrain']));
assert.equal(muted[0].label, 'Terrain'); assert.equal(muted[0].under, '');
assert.equal(paints + extents, 0, 'hidden layers retain controls without executing their painters');
assert.equal(WorldSim.prototype.mapLayers.call(sim, [])[0].under, 'ground');
assert.equal(paints, 1); assert.equal(extents, 1);

for (const [w, h] of [[520, 520], [50000, 120000], [1e8, 1000], [1, 1]]) {
  const b = atlasBudget(w, h, ATLAS_CFG.raster, ATLAS_CFG.reveal.cell);
  assert.ok(b.W <= 720 && b.H <= 720 && b.W >= 1 && b.H >= 1);
  const mask = (Math.ceil(w / b.rcell) + 2) * (Math.ceil(h / b.rcell) + 2);
  assert.ok(mask <= (720 / ATLAS_CFG.raster.lattice + 2) ** 2, 'reveal mask shares the pixel bound');
}
const memo = new AtlasInputCache<object>(2), a = {}, b = {};
const reveal = new AtlasRevealIndex(240, 240);
reveal.add({ x: 0, y: 0 }); reveal.add({ x: 1e8, y: -1e8 });
assert.equal(reveal.at(0, 0), 1);
assert.equal(reveal.at(360, 0), 0.5);
assert.equal(reveal.at(481, 0), 0, 'huge chart cells cannot spread knowledge outside the reveal disc');
assert.equal(reveal.at(1e8, -1e8), 1);
const first = memo.get(a, 'same', () => ({}));
assert.equal(memo.get(a, 'same', () => { throw Error('cache miss'); }), first);
memo.get(a, 'other', () => ({})); memo.get(a, 'third', () => ({}));
assert.notEqual(memo.get(a, 'same', () => ({})), first, 'old inputs are evicted');
assert.notEqual(memo.get(b, 'same', () => ({})), memo.get(a, 'same', () => ({})), 'new worlds cannot retain old sampler closures');

// Controlled canvas encoder: hold asynchronous completion to exercise cancellation
// and resource lifetime. Pixel shading is real; vector draw calls are unused here.
const oldDoc = globalThis.document, oldCreate = URL.createObjectURL, oldRevoke = URL.revokeObjectURL;
let serial = 0, samples = 0;
const live = new Set<string>(), callbacks: (() => void)[] = [];
let pixels = new Uint8ClampedArray();
globalThis.document = { createElement: () => ({
  width: 0, height: 0,
  getContext: () => ({ createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (img: ImageData) => { pixels = img.data.slice(); } }),
  toBlob: (cb: BlobCallback) => { callbacks.push(() => cb(new Blob())); },
}) } as unknown as Document;
URL.createObjectURL = () => { const id = `blob:qa/${++serial}`; live.add(id); return id; };
URL.revokeObjectURL = id => { live.delete(id); };
const inp = (key: string): AtlasChartInput => ({ key, maxPx: 64,
  box: { minX: 0, minY: 0, maxX: 520, maxY: 520 }, reveal: [{ x: 260, y: 260 }],
  biomeAt: () => { samples++; return 'forest'; }, kindAt: () => 'land', elevAt: null,
  rivers: [], features: [], layers: { relief: false, rivers: false, features: false, glyphs: false }, seed: 71,
});
const finish = (input: AtlasChartInput, budget: number) => {
  for (let n = 0; n < 10000; n++) {
    const r = atlasChart(input, budget);
    if (r.raster) return r.raster;
    callbacks.splice(0).forEach(f => f());
  }
  throw new Error('painter failed to complete');
};
try {
  atlasChartReset();
  const small = finish(inp('small'), 0.1), expected = pixels.slice();
  assert.ok(samples > 0 && small.href.startsWith('blob:'));
  finish(inp('large-budget'), 100);
  assert.deepEqual(pixels, expected, 'yielding preserves every shaded pixel');
  const beforeFog = samples; finish({ ...inp('fog'), reveal: [] }, 100);
  assert.equal(samples, beforeFog, 'unknown terrain is never sampled');
  assert.ok(pixels.every((v, i) => i % 4 !== 3 || v === 0), 'unknown terrain stays transparent');
  atlasChartReset(); atlasChart(inp('cancel'), 100);
  assert.ok(atlasChartBusy()); atlasKeep([]); callbacks.splice(0).forEach(f => f());
  assert.equal(live.size, 0, 'canceled encodes never publish a URL');
  for (let n = 0; n < 12; n++) finish(inp(`cache-${n}`), 100);
  assert.equal(live.size, ATLAS_CFG.raster.cacheEntries, 'eviction releases encoded images');
  assert.equal(atlasStats().cached.length, live.size);
  atlasChartReset(); assert.equal(live.size, 0, 'reset releases all encoded images');
} finally {
  globalThis.document = oldDoc; URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke;
}
console.log('PASS bounded images/masks, owner-scoped inputs, deterministic progressive pixels, veil, async cancellation and URL lifetime');
