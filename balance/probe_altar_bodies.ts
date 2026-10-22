import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { ALTAR_BODY, syncAltarBodies } from '../src/engine/altarBodies';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';

const restore = seedGlobalRandom(92714);
try {
  const w = makeSimWorld('warrior', 42);
  const def = { ...w.zone, id: 'altar_reliability', seed: 713,
    objective: { kind: 'offering' as const, altarId: 'wrath_altar', need: [2, 2] as [number, number] } };
  w.zoneMap[def.id] = def; w.loadZone(def.id);
  assert.ok(w.altars.length > 0); const count = w.altars.length;
  const altar = w.altars[0], center = { x: altar.pos.x, y: altar.pos.y + ALTAR_BODY.offsetY };
  assert.equal(w.pointInSolid(center.x, center.y)?.kind, ALTAR_BODY.kind);
  for (const direction of [-1, 1]) {
    let from = { x: center.x + direction * 80, y: center.y };
    for (let i = 0; i < 80; i++) from = w.clampPos({ x: from.x - direction * 2, y: from.y }, 12, from);
    assert.ok(direction * (from.x - center.x) >= ALTAR_BODY.halfWidth + 10);
    assert.equal(w.pointInSolid(center.x + direction * 50, center.y, 12), null);
  }
  assert.equal(w.pointInSolid(center.x, center.y, 0, 1), null, 'floor isolation');
  syncAltarBodies(w); syncAltarBodies(w);
  assert.equal(w.doodads.filter(d => d.kind === ALTAR_BODY.kind).length, count);
  w.player.pos = { x: center.x + 50, y: center.y };
  const saved = JSON.parse(JSON.stringify(serializeCharacter(w))), next = makeSimWorld('warrior', 43);
  assert.ok(applySavedCharacter(next, saved)); assert.ok(next.adoptWorldState(saved.world));
  next.resumeSpawn('exact', saved.world.player);
  assert.equal(next.zone.id, def.id);
  assert.equal(next.pointInSolid(center.x, center.y)?.kind, ALTAR_BODY.kind, 'Continue restores slab');
  next.loadZone('lastlight');
  assert.ok(!next.doodads.some(d => d.kind === ALTAR_BODY.kind && d.pos.x === center.x && d.pos.y === center.y));
  next.loadZone(def.id);
  assert.equal(next.pointInSolid(center.x, center.y)?.kind, ALTAR_BODY.kind, 'revisit restores slab');
  assert.equal(next.doodads.filter(d => d.kind === ALTAR_BODY.kind).length, count);
  next.altars = []; syncAltarBodies(next);
  assert.equal(next.doodads.filter(d => d.kind === ALTAR_BODY.kind).length, 0);
  console.log('PASS generated finite-zone altars: body walking, side clearance, tiers, Continue, revisit and cleanup');
} finally { restore(); }
