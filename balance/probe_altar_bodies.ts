import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { ALTAR_BODY, syncAltarBodies } from '../src/engine/altarBodies';
import { ALTARS } from '../src/data/shrines';
import { serializeCharacter } from '../src/meta/character';
import { localOffset } from '../src/worldmass/address';
import type { MassPlace } from '../src/worldmass/contracts';

const restore = seedGlobalRandom(92714);
try {
  const w = makeSimWorld('warrior', 42); w.startWorldMass(42);
  const mass = w.massRuntime!, span = mass.config.terrain.addressSpan;
  let place: MassPlace | undefined;
  for (let r = 1; r <= 20 && !place; r++) for (let y = -r; y <= r && !place; y++) for (let x = -r; x <= r && !place; x++) {
    if (Math.max(Math.abs(x), Math.abs(y)) !== r) continue;
    place = mass.placesInCell(mass.walk.at(x * span, y * span)).find(p => p.content === 'red-cairn');
  }
  assert.ok(place, 'trace the actual generated Red Cairn');
  const at = localOffset(place.center, { ...mass.origin, x: 0, y: 0 }, span);
  w.landPartyAt(at); mass.update(w, true);
  const altar = w.altars.find(a => a.def.id === 'blood_altar')!; assert.ok(altar);
  const center = { x: altar.pos.x, y: altar.pos.y + ALTAR_BODY.offsetY };
  assert.equal(w.pointInSolid(center.x, center.y)?.kind, ALTAR_BODY.kind);
  for (const direction of [-1, 1]) {
    let from = { x: center.x + direction * 80, y: center.y };
    for (let step = 0; step < 80; step++) from = w.clampPos({ x: from.x - direction * 2, y: from.y }, 12, from);
    assert.ok(direction * (from.x - center.x) >= ALTAR_BODY.halfWidth + 10, 'native walking cannot tunnel through the slab');
    assert.ok(!w.pointInSolid(center.x + direction * 50, center.y, 12), 'body can pass beside altar');
  }
  assert.equal(w.pointInSolid(center.x, center.y, 0, 1), null, 'another floor has no phantom slab');
  const count = w.doodads.filter(d => d.kind === ALTAR_BODY.kind).length;
  syncAltarBodies(w); syncAltarBodies(w);
  assert.equal(w.doodads.filter(d => d.kind === ALTAR_BODY.kind).length, count);
  const saved = serializeCharacter(w), next = makeSimWorld('warrior', 43);
  assert.ok(next.adoptWorldState(saved.world)); next.startWorldMass(42, saved.world!.worldmass);
  assert.equal(next.pointInSolid(center.x, center.y)?.kind, ALTAR_BODY.kind, 'Continue restores physical altar');
  for (const actor of next.actors) actor.pos = { x: 50000, y: 50000 };
  next.massRuntime!.fields.sync(next);
  assert.ok(!next.altars.some(a => a.def.id === 'blood_altar'));
  assert.ok(!next.doodads.some(d => d.kind === ALTAR_BODY.kind && d.pos.x === center.x && d.pos.y === center.y), 'eviction removes its solid');
  next.player.pos = at; next.massRuntime!.update(next, true);
  assert.equal(next.pointInSolid(center.x, center.y)?.kind, ALTAR_BODY.kind, 'revisit remounts the exact slab');
  console.log('PASS actual Red Cairn native walking, body clearance, tier, eviction and Continue');
  const ordinary = makeSimWorld('warrior', 81);
  ordinary.altars = [{ pos: { x: 0, y: 0 }, def: ALTARS[0], affected: new Set() }];
  syncAltarBodies(ordinary);
  assert.equal(ordinary.pointInSolid(0, ALTAR_BODY.offsetY)?.kind, ALTAR_BODY.kind);
  ordinary.altars = []; syncAltarBodies(ordinary);
  assert.equal(ordinary.doodads.filter(d => d.kind === ALTAR_BODY.kind).length, 0);
  console.log('PASS shared finite-zone altar ownership and cleanup');
} finally { restore(); }
