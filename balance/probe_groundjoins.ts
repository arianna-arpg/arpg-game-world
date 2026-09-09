// A real generated seam that stayed dry because a partial earlier weld
// prematurely joined the components. This must fail on the old algorithm.
import assert from 'node:assert/strict';
import { bootSimEngine } from '../src/sim/arena';
import { Rng } from '../src/core/rng';
import { vec, dist } from '../src/core/math';
import { generateLayout } from '../src/engine/levelgen';
import { composeBlendLayout } from '../src/engine/blend';
import { TILESETS } from '../src/data/tilesets';
import type { ZoneDef } from '../src/data/zones';

bootSimEngine();
const base = TILESETS.beach, partner = TILESETS.brine_flats;
const def: ZoneDef = {
  id: 'qa_blend_radial_plains', name: 'Ground join regression', level: 8,
  size: { w: 2000, h: 1500 }, seed: 3000026, theme: base.theme,
  layout: composeBlendLayout([...(base.common ?? []), ...base.layout], partner),
  layoutType: 'plains', blend: { with: partner.id, field: { kind: 'radial' } },
  objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
};
const generate = () => generateLayout(def, def.size, new Rng(def.seed!), vec(120, 750), [vec(1880, 750), vec(1000, 120)]);
const out = generate(), water = out.doodads.filter(d => d.kind === 'water');
const a = water.findIndex(d => d.pos.x === 1425 && d.pos.y === 615);
const b = water.findIndex(d => d.pos.x === 1485 && d.pos.y === 645);
assert.ok(a >= 0 && b >= 0, 'the two original seam bodies must actually stand');
const reached = new Set([a]), queue = [a];
for (let i = 0; i < queue.length; i++) {
  const current = water[queue[i]];
  for (let j = 0; j < water.length; j++) {
    if (!reached.has(j) && dist(current.pos, water[j].pos) < current.radius + water[j].radius) {
      reached.add(j); queue.push(j);
    }
  }
}
assert.ok(reached.has(b), 'a blocked partial weld must not suppress the later valid connection');
console.log('PASS the two formerly separated water bodies form one actual connected body');

const pillar = out.doodads.find(d => d.kind === 'salt_pillar' && dist(d.pos, vec(1441.292, 686.202)) < 1);
assert.ok(pillar, 'the solid that prevented a direct weld still stands');
for (const d of water) assert.ok(dist(d.pos, pillar.pos) >= d.radius + pillar.radius - 0.01,
  'the repaired join must go around the pillar without flooding its reserved ground');
assert.deepEqual(generate().doodads, out.doodads);
console.log('PASS the join preserves the solid-ground exclusion and deterministic generation');
