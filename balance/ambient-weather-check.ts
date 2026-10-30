// Focused camera/identity regression; no engine state or canvas required.
import assert from 'node:assert/strict';
import { ambientField, AMBIENT_FIELDS, type AmbientWorldView } from '../src/render/vis/ambientField';

const view: AmbientWorldView = { x: 600, y: 400, w: 1280, h: 850, zoom: 1.3, seed: 739 };
for (const [name, def] of Object.entries(AMBIENT_FIELDS)) {
  const cfg = { chance: 1, period: 20, lifetime: 20, count: 8 };
  const sample = (v = view, t = 31.5) => ambientField(v, t, def, cfg);
  const first = sample(); assert.ok(first.length, name);
  const moved = sample({ ...view, x: view.x + 137, y: view.y - 83 });
  const byId = new Map(moved.map(p => [p.id, p]));
  const shared = first.filter(p => byId.has(p.id));
  assert.ok(shared.length, `${name}: overlapping views share particles`);
  for (const p of shared) assert.deepEqual(byId.get(p.id), p, `${name}: pan cannot change a particle`);
  const resized = new Map(sample({ ...view, w: view.w * 2, h: view.h * 2 }).map(p => [p.id, p]));
  for (const p of first) assert.deepEqual(resized.get(p.id), p, `${name}: resize cannot redistribute particles`);
  assert.deepEqual(sample({ ...view, w: view.w * 2, h: view.h * 2, zoom: view.zoom * 2 }), first,
    `${name}: same world rectangle at another zoom has the same population`);
  sample({ ...view, x: -4000, y: 15000 }, 38);
  assert.deepEqual(sample(), first, `${name}: looking elsewhere leaves no particle history`);
  assert.notDeepEqual(sample({ ...view, seed: 740 }), first, `${name}: zone identity changes the field`);
  const later = new Map(sample(view, 31.501).map(p => [p.id, p]));
  for (const p of first) {
    const next = later.get(p.id); if (!next) continue;
    assert.ok(Math.abs(next.x - p.x - def.velocity[0] * 0.001) < 1e-6, `${name}: actual x travel`);
    assert.ok(Math.abs(next.y - p.y - def.velocity[1] * 0.001) < 1e-6, `${name}: actual y travel`);
  }
  assert.equal(ambientField(view, 31.5, def, { count: 0 }).length, 0);
  assert.equal(ambientField(view, 31.5, def, { chance: 0 }).length, 0);
  assert.equal(sample({ ...view, w: 0 }).length, 0);
  assert.equal(sample({ ...view, zoom: 0 }).length, 0);
  assert.equal(sample({ ...view, x: NaN }).length, 0);
}

const heat = ambientField(view, 0, AMBIENT_FIELDS.heat, { chance: 1 });
assert.ok(heat.length);
assert.deepEqual(ambientField(view, 10000, AMBIENT_FIELDS.heat, { chance: 1 }), heat, 'terrain heat never drifts');
const bounds = { w: 1000, h: 700 };
assert.ok(ambientField({ ...view, bounds }, 31.5, AMBIENT_FIELDS.sand)
  .every(p => p.x >= 0 && p.y >= 0 && p.x <= bounds.w && p.y <= bounds.h));
// A wind-borne grain born outside a narrow view must agree with a broad view
// that could see its birth. This catches culling only by birth cell.
const narrow = { ...view, w: 80, h: 250 };
const wide = { ...view, x: -5000, y: -5000, w: 15000, h: 15000 };
const wideRows = ambientField(wide, 7.5, AMBIENT_FIELDS.sand);
const expected = wideRows.filter(p => p.x + p.radius >= narrow.x && p.x - p.radius <= narrow.x + narrow.w / narrow.zoom
  && p.y + p.radius >= narrow.y && p.y - p.radius <= narrow.y + narrow.h / narrow.zoom);
assert.ok(expected.length);
assert.deepEqual(ambientField(narrow, 7.5, AMBIENT_FIELDS.sand), expected, 'offscreen births travel into view');
console.log('PASS world identity, pan, resize, zoom, return, travel, offscreen births, heat, bounds and disabled fields');
