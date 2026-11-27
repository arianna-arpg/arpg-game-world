import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { SKILLS } from '../src/data/skills';
import { COSMETIC_PROJECTILES } from '../src/data/cosmeticStyles';
import { PROJECTILE_ART_FLIGHTS } from '../src/data/projectileArtVisuals';
import { PROJECTILE_ENDINGS, projectileEndFlash, projectileEndKind } from '../src/data/projectileEndings';
import { makeSkillInstance } from '../src/engine/skills';
import { hitVoiceOf } from '../src/engine/bodyVoices';
import { GridWalkField } from '../src/world/gridWalk';
import { applySnapshot, serializeSnapshot } from '../src/net/snapshot';
import { PALISADE_FACE, type Doodad } from '../src/engine/levelgen';

const w = makeSimWorld('warrior', 217), hero = w.player;
w.actors = [hero]; w.doodads = []; w.markDoodadsChanged(); w.walk = null;
const at = { x: 600, y: 600 };
function launch(id: string, pos = at, heading = 0) {
  w.projectiles = []; w.flashes = [];
  w.spawnProjectile(hero, makeSkillInstance(SKILLS[id]), { ...pos }, heading);
  return w.projectiles[0];
}
const step = (dt = .02) => (w as unknown as { updateProjectiles(dt: number): void }).updateProjectiles(dt);
const ends = () => w.flashes.filter(f => f.projectileEnd);
const shots = Object.values(SKILLS).filter(s => s.delivery.type === 'projectile');
const kinds = new Map<string, number>();
for (const s of shots) {
  const p = launch(s.id), cue = projectileEndFlash(p, 'spent');
  assert.ok(Object.hasOwn(PROJECTILE_ENDINGS, cue.projectileEnd.kind), s.id);
  assert.equal(cue.life, PROJECTILE_ENDINGS[cue.projectileEnd.kind].seconds, s.id);
  assert.ok(cue.life > 0 && Number.isFinite(cue.life + cue.facing + cue.radius), s.id);
  assert.equal(cue.projectileEnd.source, s.id);
  kinds.set(cue.projectileEnd.kind, (kinds.get(cue.projectileEnd.kind) ?? 0) + 1);
}
assert.deepEqual([...kinds.keys()].sort(), Object.keys(PROJECTILE_ENDINGS).sort());
for (const id of Object.keys(PROJECTILE_ART_FLIGHTS)) {
  const p = launch('firebolt'); p.skillVisualId = id;
  assert.equal(projectileEndFlash(p, 'spent').projectileEnd.source, id);
}
for (const [skin, art] of Object.entries(COSMETIC_PROJECTILES)) {
  const p = launch('firebolt'); p.cosmeticProjectile = skin;
  assert.equal(projectileEndKind(p), art.ending);
}
const mod = launch('firebolt');
const delivery = mod.inst.def.delivery;
assert.ok(delivery.type === 'projectile');
mod.inst.def = { ...mod.inst.def, id: 'unlisted_test_flight', delivery: { ...delivery, ending: 'spatter' } };
assert.equal(projectileEndKind(mod), 'spatter');
mod.ending = 'discharge';
assert.equal(projectileEndKind(mod), 'discharge');
delete mod.ending;
mod.inst.def = { ...mod.inst.def, delivery, baseDamage: { cold: [1, 2] } };
assert.equal(projectileEndKind(mod), 'shatter');
console.log('PASS', shots.length, 'catalogue flights, component and wardrobe identities, author override and uncatalogued fallback', Object.fromEntries(kinds));

for (const [id, kind] of [['piercing_arrow', 'lodge'], ['firebolt', 'cinder'], ['ice_spear', 'shatter']]) {
  for (const limit of ['age', 'range']) {
    const p = launch(id);
    if (limit === 'age') p.maxAge = .01; else p.range = 1;
    p.tier = 1; p.color = '#659aff'; step();
    assert.equal(w.projectiles.length, 0); assert.equal(ends().length, 1);
    const f = ends()[0];
    assert.ok(f.projectileEnd); assert.equal(f.projectileEnd.kind, kind); assert.equal(f.projectileEnd.surface, 'spent');
    assert.equal(f.recoveryCueTier, 1); assert.equal(f.color, p.color); assert.equal(f.facing, p.dir);
    assert.deepEqual(f.pos, p.pos); assert.notEqual(f.pos, p.pos);
    step(); assert.equal(ends().length, 1, 'no repeated endpoint from a retired flight');
  }
}
const mote = launch('firebolt'); mote.range = 1; mote.orbPaint = { fill: .35, rim: .65, spark: true }; step();
assert.deepEqual(ends()[0].projectileEnd?.orbPaint, mote.orbPaint);
const snap = serializeSnapshot(w, 1), client = makeSimWorld('warrior', 218);
applySnapshot(client, JSON.parse(JSON.stringify(snap)));
assert.deepEqual(client.flashes.find(f => f.projectileEnd)?.projectileEnd, ends()[0].projectileEnd);
assert.equal(client.projectiles.length, 0);
const fading = ends()[0];
for (let i = 0; i < 60; i++) w.update(1 / 60);
assert.ok(!w.flashes.includes(fading));
applySnapshot(client, serializeSnapshot(w, 2));
assert.ok(!client.flashes.some(f => f.projectileEnd));
const edge = launch('firebolt', { x: w.arena.w - 8, y: 600 }, Math.PI / 4);
edge.speed = 1000; step(.05);
assert.equal(ends()[0]?.projectileEnd?.surface, 'spent');
assert.ok(Math.abs(ends()[0].pos.x - w.arena.w) < .001 && Math.abs(ends()[0].pos.y - 608) < .001);
const grid = new GridWalkField(1200, 1200, 20);
grid.fillRegion(0, 0, 1199, 1199, 'ground'); grid.fillRegion(640, 540, 659, 660, 'wall');
w.walk = grid;
for (const bounce of [false, true]) {
  const p = launch('firebolt'); p.speed = 1000; p.bounces = bounce ? 1 : 0;
  step(.06);
  if (bounce) { assert.ok(w.projectiles.includes(p)); assert.equal(ends().length, 0); }
  else { assert.equal(ends()[0]?.projectileEnd?.surface, 'wall'); assert.equal(ends()[0].pos.x, 640); }
}
w.walk = null;
w.doodads = [{ kind: 'tree', pos: { x: 648, y: 600 }, radius: 18, hitbox: { kind: 'circle', r: 18 } } as Doodad];
w.markDoodadsChanged();
const shaft = launch('piercing_arrow'); shaft.speed = 1000; shaft.bounces = 0; step(.04);
assert.equal(ends()[0]?.projectileEnd?.surface, 'wall'); assert.equal(ends()[0].pos.x, 630);
assert.equal(ends()[0].maxLife, PROJECTILE_ENDINGS.lodge.wallSeconds);
const graze = launch('piercing_arrow', { x: 600, y: 619 }); graze.speed = 1000; step(.048);
assert.equal(ends()[0]?.projectileEnd?.surface, 'wall');
assert.deepEqual(ends()[0].pos, { x: 648, y: 618 }, 'the grazing shaft anchors on the obstacle');
assert.equal(graze.pos.y, 619, 'the art anchor does not move the damage payload');
w.doodads = [{ kind: 'wall', pos: { x: 648, y: 600 }, radius: 20 }]; w.markDoodadsChanged();
const timber = launch('snipe'); timber.speed = 1000; step(.025);
assert.equal(ends()[0]?.projectileEnd?.surface, 'wall');
assert.equal(ends()[0].pos.x, 648 - 20 * PALISADE_FACE.hw, 'visible shaft meets the painted timber face');
assert.equal(timber.pos.x, 625, 'palisade hit still uses its gameplay collider');
applySnapshot(client, JSON.parse(JSON.stringify(serializeSnapshot(w, 3))));
const peerShaft = client.flashes.find(f => f.projectileEnd);
assert.ok(peerShaft); assert.deepEqual(peerShaft.pos, ends()[0].pos);
assert.equal(peerShaft.facing, timber.dir); assert.equal(peerShaft.maxLife, PROJECTILE_ENDINGS.lodge.wallSeconds);
assert.deepEqual(peerShaft.projectileEnd, ends()[0].projectileEnd);
w.doodads = []; w.markDoodadsChanged();
const boomerang = launch('firebolt');
boomerang.speed = 1000; boomerang.range = 45; boomerang.returnMode = 1; step(.05);
assert.ok(boomerang.returnPhase && w.projectiles.includes(boomerang)); assert.equal(ends().length, 0);
const plant = launch('pinning_spear'); plant.range = 1; step();
assert.equal(ends().length, 0); assert.ok(w.actors.some(a => a.construct), 'real planted weapon owns the landing');
w.actors = [hero];
const reflected = launch('frostbolt'); reflected.range = 1;
reflected.parryDamage = { packet: { amounts: { cold: 1 }, tags: new Set(), crit: false, sourceName: 'test' }, power: 1, reflections: 1 };
step(); assert.equal(ends()[0]?.projectileEnd?.kind, 'shatter');
for (const pierce of [0, 1]) {
  const shot = launch('firebolt'); shot.speed = 1000; shot.pierce = pierce;
  const enemy = w.createMonster('zombie', 1, 'enemy'); enemy.pos = { x: 640, y: 600 };
  w.actors = [hero, enemy]; step(.04);
  assert.ok(shot.hits.has(enemy.id)); assert.equal(w.projectiles.includes(shot), !!pierce);
  assert.ok(w.flashes.some(f => f.fx === hitVoiceOf('fire', 'body')));
  assert.equal(ends().length, 0, 'a body hit never gets a miss cue');
  if (pierce) { shot.range = shot.traveled; step(); assert.equal(ends()[0].projectileEnd?.surface, 'spent'); }
}
console.log('PASS lifetime, range, spent piercing flight, body hit, wall, masonry, bounce, return, plant, reflected flight and replica');
