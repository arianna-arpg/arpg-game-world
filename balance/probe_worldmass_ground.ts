import assert from 'node:assert/strict';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { MassGround, validateMassGround } from '../src/worldmass/ground';
import { address } from '../src/worldmass/address';
import { canonical } from '../src/worldmass/random';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { TILESETS } from '../src/data/tilesets';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';

const restore = seedGlobalRandom(65042), config = massAdventure(), spec = config.ground!;
assert.deepEqual(spec.rules.map(r => r.surface), ['downs', 'forest', 'desert', 'marsh']);
for (const r of spec.rules) {
  assert.deepEqual(r.palette, TILESETS[r.surface].theme.ground!.palette);
  assert.notEqual(r.palette, TILESETS[r.surface].theme.ground!.palette);
}
console.log('PASS new expeditions snapshot four native palettes without aliasing; palette-less snow remains unchanged');
const mass = new WorldMassRuntime(42, 'ground-probe', config), ground = new MassGround(spec, 42, 960);
const downs = config.terrain.surfaces.find(s => s.id === 'downs')!;
const sample = { region: downs.region, color: downs.color, biome: downs.biome, fields: {},
  source: { generator: config.terrain.id, version: config.terrain.version, rule: downs.id, source: downs.source!, stream: 'probe' } };
const colors: number[][] = [];
for (let y = -1020; y <= 1020; y += 60) for (let x = -1020; x <= 1020; x += 60)
  colors.push(ground.color(sample, address('surface', '0', '0', x, y, 960)));
const shades = new Set(colors.map(c => c.map(v => Math.round(v)).join(','))).size;
assert.ok(shades > 16, 'Palette collapsed to a flat or coarsely stepped face');
console.log('Observed ' + shades + ' distinct rounded shades across the fixed survey');
assert.ok(Math.max(...colors.map(c => c[1])) - Math.min(...colors.map(c => c[1])) > 20);
const p = address('surface', '0', '0', 120, 310, 960);
assert.notDeepEqual(ground.color(sample, p), new MassGround(spec, 43, 960).color(sample, p));
const base = [49, 57, 28];
assert.deepEqual(new MassGround(undefined, 42, 960).color(sample, p), base);
assert.deepEqual(ground.color({ ...sample, source: { ...sample.source, rule: 'terrain-change' } }, p), base);
assert.deepEqual(ground.color({ ...sample, source: { ...sample.source, source: 'author/replaced-ground' } }, p), base);
assert.deepEqual(ground.color({ ...sample, source: { ...sample.source, rule: 'wayside-camp/surface' } }, p), base);
console.log('PASS coherent seeded color variation; omission, terrain edits, source changes and authored clearings retain their own color');
for (const cx of ['-2', '0', '9007199254740991', '-9007199254740991']) {
  const a = { dimension: 'surface', cx, cy: '-1', x: 975.125, y: -15.75 };
  const b = address(a.dimension, cx, a.cy, a.x, a.y, 960);
  assert.deepEqual(ground.color(sample, a), ground.color(sample, b));
  assert.notDeepEqual(ground.color(sample, a), ground.color(sample, { ...a, dimension: 'cavern' }));
  const left = ground.color(sample, { ...a, x: 959.999 }), right = ground.color(sample, { ...a, x: 960.001 });
  assert.ok(left.every((v, i) => Math.abs(v - right[i]) < .01));
}
console.log('PASS identical geographic samples and smooth joins across negative and distant cell boundaries');
const w = makeSimWorld('warrior', 42); mass.attach(w);
const point = mass.walk.at(-721, 483), before = canonical([mass.state.snapshot(), mass.stream.sample(point)]);
const random = Math.random; Math.random = () => { throw new Error('Painter used simulation randomness'); };
try { for (let i = 0; i < 100; i++) ground.color(mass.stream.sample(point), point); } finally { Math.random = random; }
assert.equal(canonical([mass.state.snapshot(), mass.stream.sample(point)]), before);
const saved = mass.snapshot(w), resumedWorld = makeSimWorld('warrior', 43);
const resumed = new WorldMassRuntime(42, 'ground-probe', saved.config, saved); resumed.attach(resumedWorld, saved);
assert.equal(canonical(resumed.config.ground), canonical(spec));
assert.deepEqual(new MassGround(resumed.config.ground, 42, 960).color(sample, p), ground.color(sample, p));
const oldConfig: MassAdventure = JSON.parse(canonical(config)); delete oldConfig.ground;
const old = new WorldMassRuntime(42, 'legacy-ground', oldConfig); const oldWorld = makeSimWorld('warrior', 44); old.attach(oldWorld);
const oldSave = old.snapshot(oldWorld), oldResume = new WorldMassRuntime(42, 'legacy-ground', oldSave.config, oldSave);
assert.equal(oldResume.config.ground, undefined);
assert.deepEqual(new MassGround(oldResume.config.ground, 42, 960).color(sample, p), base);
console.log('PASS read-only painting, isolated RNG, exact saved appearance and unchanged legacy descriptors');
for (const mutate of [
 (s: typeof spec) => { s.rules[0].period.x = 0; },
 (s: typeof spec) => { s.rules[0].bias = 1; },
 (s: typeof spec) => { s.rules[0].alpha = -1; },
 (s: typeof spec) => { s.rules[0].palette = ['red', '#000000']; },
 (s: typeof spec) => { s.rules.push(s.rules[0]); },
 (s: typeof spec) => { s.rules[0].contrast = Infinity; },
]) {
  const bad = JSON.parse(canonical(spec)) as typeof spec; mutate(bad);
  assert.throws(() => validateMassGround(bad), /ground palette/);
}
console.log('PASS invalid palettes, duplicate surfaces and unbounded sampling controls are rejected');
restore();
