import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { withSeededRandom, Rng } from '../src/core/rng';
import { generateLayout, ResolvedStructureSeatError, type GeneratedLayout } from '../src/engine/levelgen';
import { RequiredStructureSeatError } from '../src/engine/nativeStructureProof';
import { GridWalkField } from '../src/world/gridWalk';
import type { ZoneDef } from '../src/data/zones';

withSeededRandom(713, () => {
  const w = makeSimWorld('warrior', 42);
  const base: ZoneDef = { ...w.zone, id: 'structure_reliability', size: { w: 1200, h: 1200 }, layout: [] };
  const generate = (def: ZoneDef, seed = 713, entry = { x: 600, y: 600 }) =>
    generateLayout(structuredClone(def), def.size, new Rng(seed), entry, []);
  const physical = (layout: GeneratedLayout, width: number, height: number) => {
    assert.ok(layout.walk instanceof GridWalkField);
    const open = GridWalkField.unpack(layout.walk.pack());
    for (const s of layout.structures ?? []) for (const d of s.doors) {
      const c = d.door.cells; if (c) open.fillRegion(c.x, c.y, c.x+c.w-.01, c.y+c.h-.01, 'ground');
    }
    for (const s of layout.structures ?? []) {
      assert.ok(s.rect.x >= 0 && s.rect.y >= 0 && s.rect.x+s.rect.w <= width && s.rect.y+s.rect.h <= height);
      for (const d of s.doors) assert.ok(open.isWalkable(d.pos.x + d.normal.x * 30, d.pos.y + d.normal.y * 30), 'door apron stands on physical ground');
    }
  };
  const edge = { ...base, fixtures: [{ structure: 'watchtower', x: 1190, y: 600 }] };
  const moved = generate(edge); physical(moved, 1200, 1200);
  assert.equal(moved.structures?.length, 1); assert.equal(moved.fixturePlacements?.[0].reseated, true);
  assert.equal(edge.fixtures[0].x, 1190, 'authored data remains unchanged');
  assert.deepEqual(generate(edge), moved, 'same saved seed repeats exact placement');
  const valid = generate({ ...base, fixtures: [{ structure: 'watchtower', x: 500, y: 500 }] });
  assert.equal(valid.fixturePlacements?.[0].reseated, false, 'valid authored fixture stays put');
  assert.deepEqual(valid.structures?.[0].rect, { x: 420, y: 420, w: 150, h: 150 });
  physical(valid, 1200, 1200);
  assert.throws(() => generate({ ...edge, size: { w: 100, h: 100 } }), ResolvedStructureSeatError);
  for (const seed of [1, 42, 713, 1031]) {
    const grave = generate({ ...base, size: { w: 1800, h: 1800 },
      layout: [{ kind: 'structure', structure: 'sealed_grave', count: [1, 1] }] }, seed, { x: 900, y: 900 });
    assert.equal(grave.structures?.filter(s => s.defId === 'sealed_grave').length, 1);
    assert.equal(grave.doodads.filter(d => d.kind === 'lone_crypt_door').length, 1);
    physical(grave, 1800, 1800);
  }
  for (const seed of [1, 42, 713, 1031]) {
    const winding = generate({ ...base, layoutType: 'winding', size: { w: 1800, h: 1800 },
      structures: [{ structure: 'sealed_grave', chance: 1 }] }, seed, { x: 900, y: 900 });
    assert.equal(winding.structures?.filter(s => s.defId === 'sealed_grave').length, 1);
    assert.equal(winding.doodads.filter(d => d.kind === 'lone_crypt_door').length, 1);
    physical(winding, 1800, 1800);
  }
  const optional = generate({ ...base, structures: [{ structure: 'sealed_grave', chance: 0 }] });
  assert.ok(!optional.structures?.some(s => s.defId === 'sealed_grave'), 'optional chance remains optional');
  assert.throws(() => generate({ ...base, size: { w: 100, h: 100 },
    layout: [{ kind: 'structure', structure: 'sealed_grave', count: [1, 1] }] }), RequiredStructureSeatError);
  console.log('PASS whole fixture relocation, exact replay, valid seats, physical aprons, required entrances and explicit refusal');
});
