import assert from 'node:assert/strict';
import { makeSimWorld, bootSimEngine } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { ITEM_BASES } from '../src/data/itembases';
import { forgeItem } from '../src/engine/itemgen';
import { makeSkillInstance, instanceDelivery, type SkillInstance } from '../src/engine/skills';
import { projectileArtsOf, projectileArtsErrors } from '../src/engine/projectileArtsSpec';
import { mod } from '../src/engine/stats';
import { satelliteItemCount, satelliteCountStat } from '../src/engine/satelliteSpec';
import { ailmentWoundBasis, rollSkillDamage } from '../src/engine/damage';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { serializeCharacter, rebuildSkill } from '../src/meta/character';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
import { dist } from '../src/core/math';
import { previewSkill } from '../src/engine/skillPreview';

bootSimEngine();
let seed = 15467;
const restore = seedGlobalRandom(seed);
const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const check = (label: string, run: () => void) => { run(); console.log(`PASS ${label}`); };
const internals = (w: World) => w as unknown as {
  updateProjectiles(dt: number): void; updateZones(dt: number): void;
  clearTreeFields(c: Actor, s: SkillInstance): void;
  resolveHit(c: Actor, s: SkillInstance, t: Actor, mult: number, depth: number): void;
};
function rig(nodes: string[], ignite = true) {
  const w = makeSimWorld('warrior', seed++), p = w.player;
  w.actors = [p]; w.projectiles = []; w.zones = []; w.doodads = []; w.walk = null; w.markDoodadsChanged();
  p.pos = { x: 800, y: 600 };
  p.sheet.setSource('firebolt-probe', [mod('accuracy', 'flat', 100000), mod('critChance', 'override', 0),
    mod('statusChance', 'override', ignite ? 1 : -10), mod('effectDuration', 'override', 1),
    mod('projectileSpeed', 'override', 1), mod('aoeRadius', 'override', 1), mod('pierce', 'override', 0),
    mod('knockback', 'override', 0),
    mod('life', 'flat', 100000), mod('mana', 'flat', 10000)]);
  p.fillResources();
  const inst = makeSkillInstance({ ...SKILLS.firebolt, baseDamage: { fire: [100, 100] }, leveling: { perLevel: [] } }, 20);
  inst.treeNodes = nodes; w.meta.knownSkills.set('firebolt', inst); p.skills[0] = inst;
  return { w, p, inst };
}
function body(w: World, dx = 100, dy = 0, hp = 100000) {
  const a = w.createMonster('zombie', 1, 'enemy'); a.skills = []; a.brain = undefined;
  a.pos = { x: w.player.pos.x + dx, y: w.player.pos.y + dy }; a.tier = w.player.tier;
  a.sheet.setSource('firebolt-probe', [mod('life', 'flat', hp), mod('armor', 'override', 0),
    mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('energyShield', 'override', 0)]);
  a.fillResources(); w.actors.push(a); return a;
}
function step(w: World, seconds: number, hz = 120) {
  for (let i = 0; i < Math.round(seconds * hz); i++) {
    w.time += 1 / hz; internals(w).updateProjectiles(1 / hz); internals(w).updateZones(1 / hz);
  }
}
function cast(w: World, inst: SkillInstance) { w.executeSkill(w.player, inst, { x: w.player.pos.x + 500, y: w.player.pos.y }); }
function hit(w: World, inst: SkillInstance, a: Actor) {
  const captured = w.projectileArts.prepare(w.player, inst, true);
  internals(w).resolveHit(w.player, captured, a, 1, 0); return captured;
}
const orbit = ['ember_satellites'], lance = ['cinder_lance'];

try {
check('tree specs validate, allocation order composes, save IDs and unmodified Firebolt remain stable', () => {
  const { w, inst } = rig([...lance, 'white_heat', 'focused_flame', 'incandescent_point', 'slow_combustion', 'lasting_cinders', 'far_flight']);
  assert.deepEqual(projectileArtsErrors(projectileArtsOf(inst)!), []);
  const before = JSON.stringify(projectileArtsOf(inst)); inst.treeNodes!.reverse();
  assert.equal(JSON.stringify(projectileArtsOf(inst)), before);
  inst.treeNodes!.reverse();
  inst.treeNodes = inst.treeNodes!.slice(0, 4); // ordinary level-20 allocation budget for the save round trip
  const saved = serializeCharacter(w).knownSkills.find(s => s.skillId === 'firebolt')!;
  assert.deepEqual(rebuildSkill(saved)?.treeNodes, inst.treeNodes);
  const plain = makeSkillInstance(SKILLS.firebolt); assert.equal(instanceDelivery(plain), SKILLS.firebolt.delivery);
  assert.equal(projectileArtsOf(plain), undefined);
});
check('slow six-second orbs pierce, hit on a per-target clock, follow the caster, and keep satellite visuals in snapshots', () => {
  const { w, p, inst } = rig(orbit, false); cast(w, inst);
  assert.equal(w.projectiles.length, 2);
  const q = w.projectiles[0], angle = q.angle;
  assert.equal(q.maxAge, 6); assert.equal(q.pierce, Infinity); assert.equal(q.skillVisualId, 'ember_satellite');
  const a = body(w); a.pos = { ...q.pos }; const life = a.life;
  step(w, .1); assert.ok(a.life < life); const once = a.life;
  step(w, .1); near(a.life, once); near(q.angle - angle, .65 * .2);
  assert.ok(w.projectiles.includes(q)); p.pos.x += 40; step(w, .1);
  near(dist(q.pos, p.pos), p.radius + 64);
  const replica = makeSimWorld('warrior', 991); applySnapshot(replica, serializeSnapshot(w, 1));
  assert.equal(replica.projectiles[0].skillVisualId, 'ember_satellite');
  step(w, 5.7); assert.equal(w.projectiles.length, 0);
});
check('Dense Constellation counts equipped pieces once and removes their contribution on unequip', () => {
  const { w, inst } = rig([...orbit, 'dense_constellation']);
  assert.equal(satelliteItemCount([[mod(satelliteCountStat('iron_wake'), 'flat', 3), mod(satelliteCountStat('iron_wake'), 'flat', 2)], [mod('satelliteCount', 'flat', 4)]]), 1);
  const base = Object.values(ITEM_BASES).find(b => b.category === 'ring' && b.dropWeight > 0)!;
  const mint = () => forgeItem({ baseId: base.id, ilvl: 8, rarity: 'magic', affixes: [{ id: 'satellite_iron_wake' }], quality: 1 })!;
  Object.assign(w.meta.equipped, { ring1: mint(), ring2: mint() }); w.recalcPlayer();
  cast(w, inst); assert.equal(w.projectiles.length, 4);
  assert.equal(previewSkill(w.player, inst).rows.find(r => r.key === 'projectiles')?.value, '4');
  assert.equal(previewSkill(w.player, inst).rows.find(r => r.key === 'pierce')?.value, 'Unlimited');
  delete w.meta.equipped.ring1; w.recalcPlayer(); w.projectiles = []; cast(w, inst); assert.equal(w.projectiles.length, 3);
});
check('fast satellites sweep their true arc, leave the center safe and never sweep a caster teleport', () => {
  const { w, p, inst } = rig(orbit, false);
  p.sheet.setSource('fast-orbit', [mod('orbitPower', 'override', 100)]); cast(w, inst);
  const radius = w.projectiles[0].orbRadius;
  const arc = body(w, Math.cos(1.8) * radius, Math.sin(1.8) * radius), center = body(w, 0, 0);
  step(w, .2, 5); assert.ok(arc.life < arc.maxLife()); near(center.life, center.maxLife());
  w.projectiles = []; p.sheet.removeSource('fast-orbit'); cast(w, inst);
  const between = body(w, 300, 0); p.pos.x += 600; step(w, .02);
  near(between.life, between.maxLife());
});
check('true satellites scale count/radius/speed, launch small targeted bolts and stagger their nova clocks', () => {
  const { w, p, inst } = rig([...orbit, 'dense_constellation', 'passing_embers', 'searing_orbit']);
  p.sheet.setSource('satellite-investment', [mod('satelliteCount', 'flat', 1), mod('satelliteSpeed', 'more', 1), mod('satelliteOrbit', 'more', .5)]);
  const a = body(w, 240); cast(w, inst);
  assert.equal(w.projectiles.length, 3); const q = w.projectiles[0]; near(q.projectileOrbit!.turn, 1.3);
  near(q.orbRadius, p.radius + 96);
  const clocks = w.projectiles.map(p => p.projectileOrbit!.novaAt); assert.equal(new Set(clocks).size, 3);
  step(w, 1.15); assert.ok(w.projectiles.some(p => p.inst.projectileRole === 'payload' && !p.projectileOrbit && p.radius < q.radius));
  step(w, 1); assert.ok(a.life < a.maxLife()); assert.ok(w.flashes.some(f => f.fx === 'ember_nova'));
  for (let i = 0; i < 10; i++) cast(w, inst);
  step(w, .01); assert.ok(w.projectiles.filter(p => p.projectileOrbit).length <= 8);
  p.sheet.setSource('many-projectiles', [mod('projectileCount', 'flat', 20)]); w.projectiles = []; cast(w, inst);
  assert.equal(w.projectiles.length, 8);
  assert.equal(previewSkill(p, inst).rows.find(r => r.key === 'projectiles')?.value, '8');
});
check('orbit growth integrates consistently, expiry can both explode and release, quiet retirement pays neither', () => {
  const run = (hz: number) => { const r = rig([...orbit, 'dense_constellation', 'broad_embers', 'searing_orbit', 'clinging_cinders'], false); cast(r.w, r.inst); step(r.w, 2, hz); return r; };
  const a = run(30), b = run(120); near(a.w.projectiles[0].angle, b.w.projectiles[0].angle, 1e-5);
  assert.ok(a.w.projectiles[0].angle > .65 * 2);
  step(a.w, 4); assert.equal(a.w.projectiles.filter(p => p.projectileOrbit).length, 0);
  assert.equal(a.w.projectiles.length, 2); assert.ok(a.w.flashes.some(f => f.fx === 'ember_nova'));
  for (const p of a.w.projectiles) {
    assert.equal(p.maxAge, undefined); assert.equal(p.pierce, 0);
    assert.ok((p.pos.x - a.p.pos.x) * Math.cos(p.dir) + (p.pos.y - a.p.pos.y) * Math.sin(p.dir) > 0);
  }
  b.w.flashes = []; internals(b.w).clearTreeFields(b.p, b.inst); step(b.w, 7);
  assert.equal(b.w.projectiles.length, 0); assert.equal(b.w.flashes.length, 0);
});
check('Wildfire remains leashed to its moving orbital home, excludes other stories and retires on caster death', () => {
  const { w, p, inst } = rig([...orbit, 'searing_orbit', 'wildfire_sparks']); body(w, 170);
  cast(w, inst); step(w, 1); const q = w.projectiles[0];
  assert.ok(Math.hypot(q.projectileOrbit!.offset.x, q.projectileOrbit!.offset.y) > 1);
  assert.ok(Math.hypot(q.projectileOrbit!.offset.x, q.projectileOrbit!.offset.y) <= 110);
  assert.ok(q.projectileOrbit && q.orbit > 0); p.dead = true; step(w, .1); assert.equal(w.projectiles.length, 0);
});
check('Cinder Lance pierces exactly two extra targets and cast chance resets only on an accepted ignite', () => {
  const { w, p, inst } = rig(lance, false); cast(w, inst); assert.equal(w.projectiles[0].pierce, 2);
  near(w.projectiles[0].inst.projectileCast!.bonus, 0); cast(w, inst); near(w.projectiles[2 - 1].inst.projectileCast!.bonus, .15);
  for (let i = 0; i < 9; i++) cast(w, inst);
  assert.equal(w.projectiles.at(-1)!.inst.projectileCast!.bonus, 1);
  const a = body(w); p.sheet.setSource('chance', [mod('statusChance', 'override', 1)]); hit(w, inst, a);
  assert.ok(a.statuses.some(s => s.id === 'burn')); cast(w, inst); assert.equal(w.projectiles.at(-1)!.inst.projectileCast!.bonus, 0);
});
check('Lance reaches three bodies and stops at the third; ordinary launched bolts outlive a fallen caster', () => {
  const { w, p, inst } = rig(lance, false);
  const victims = [70, 140, 210, 280].map(x => body(w, x));
  cast(w, inst); p.dead = true; step(w, 1);
  assert.ok(victims.slice(0, 3).every(a => a.life < a.maxLife()));
  near(victims[3].life, victims[3].maxLife()); assert.equal(w.projectiles.length, 0);
});
check('white ignite ignores positive resistance, benefits from strips, leaves the hit resisted and replicates its appearance', () => {
  const { w, p, inst } = rig([...lance, 'white_heat']); const a = body(w);
  a.sheet.setSource('resist', [mod('fireRes', 'flat', .75)]);
  const raw = ailmentWoundBasis(a, { fire: 100 }, p, new Set(['spell', 'fire']), [], 'fire');
  const payload = { ...w.projectileArts.prepare(p, inst, true), projectileRole: 'payload' as const };
  near(w.projectileArts.basis(p, payload, a, rollSkillDamage(p, inst), 5, 'burn'), 20);
  near(raw, 100); a.sheet.setSource('strip', [mod('fireRes', 'flat', -.2)]);
  near(ailmentWoundBasis(a, { fire: 100 }, p, new Set(['spell', 'fire']), [], 'fire'), 120);
  a.sheet.removeSource('strip'); const life = a.life; hit(w, inst, a);
  const burn = a.statuses.find(s => s.id === 'burn')!; assert.equal(burn.visual, 'white_heat');
  assert.ok(burn.dps > (life - a.life) * .3 * 3);
  const replica = makeSimWorld('warrior', 992); applySnapshot(replica, serializeSnapshot(w, 1));
  assert.equal(replica.actors[w.actors.indexOf(a)].statuses.find(s => s.id === 'burn')!.visual, 'white_heat');
  a.applyStatus('burn', burn.dps * 2, 1, 'replacement'); assert.equal(burn.visual, undefined);
});
check('Pyreheart selects the strongest struck body and conserves transferred wounds and original source', () => {
  const { w, p, inst } = rig([...lance, 'white_heat', 'focused_flame'], false);
  const weak = body(w, 80), strong = body(w, 120, 0, 200000), donor = body(w, 150, 30), upstairs = body(w, 130, 20); upstairs.tier++;
  donor.applyStatus('burn', 20, 1, 'original caster', { casterId: 9123, leech: .2 });
  upstairs.applyStatus('burn', 20, 1, 'upstairs'); hit(w, inst, weak); hit(w, inst, strong); hit(w, inst, weak);
  w.projectileArts.update(.01);
  const moved = strong.statuses.find(s => s.gathered)!;
  assert.ok(moved); near(moved.dps * moved.remaining * moved.stacks, 80); assert.equal(moved.casterId, 9123); near(moved.leech!, .2);
  assert.equal(donor.statuses.length, 0); assert.ok(upstairs.statuses.some(s => s.id === 'burn'));
  assert.ok(!weak.statuses.some(s => s.id === 'ignite_attractor'));
  internals(w).clearTreeFields(p, inst); assert.ok(!strong.statuses.some(s => s.id === 'ignite_attractor'));
  assert.ok(strong.statuses.includes(moved));
});
check('pillars require an earlier ignite, share cooldown across contacts, persist at the struck location and clean on respec', () => {
  const { w, p, inst } = rig([...lance, 'white_heat', 'incandescent_point']); const a = body(w);
  hit(w, inst, a); assert.equal(w.zones.length, 0); hit(w, inst, a); assert.equal(w.zones.length, 1);
  hit(w, inst, a); assert.equal(w.zones.length, 1); const z = w.zones[0]; a.pos.x += 20;
  assert.notEqual(z.pos.x, a.pos.x); assert.equal(z.skillVisualId, 'incandescent_pillar');
  const life = a.life; step(w, 1); assert.ok(a.life < life);
  internals(w).clearTreeFields(p, inst); assert.equal(w.zones.length, 0);
});
check('rupture spends a quarter of the remaining bank, pays nearby enemies once, and respects story/hostility', () => {
  const { w, p, inst } = rig([...lance, 'slow_combustion'], false);
  const a = body(w), nearBody = body(w, 125), upstairs = body(w, 125); upstairs.tier++;
  a.applyStatus('burn', 40, 1, 'caster', { casterId: p.id });
  const life = nearBody.life, upperLife = upstairs.life; hit(w, inst, a);
  near(a.statuses.find(s => s.id === 'burn')!.dps, 30); near(life - nearBody.life, 40); near(upstairs.life, upperLife);
});
check('each pierced hit sprouts two onward children, descendants share a bounded budget and cannot hit their parent body', () => {
  const { w, inst } = rig([...lance, 'slow_combustion', 'lasting_cinders'], false);
  const a = body(w, 100), b = body(w, 200); cast(w, inst); step(w, .65);
  const castState = w.projectiles[0]?.inst.projectileCast;
  assert.ok(a.life < a.maxLife() && b.life < b.maxLife());
  assert.ok(w.projectiles.filter(p => p.depth > 0).length >= 4);
  assert.ok(w.projectiles.filter(p => p.depth > 0).every(p => p.hits.has(a.id)));
  assert.ok(castState && castState.childrenLeft < 96 && castState.childrenLeft >= 0);
});
check('Unbound Comet accelerates, pierces infinitely, grows damage on view rebound and expires on its original clock', () => {
  const { w, inst } = rig([...lance, 'slow_combustion', 'far_flight'], false); cast(w, inst);
  const q = w.projectiles[0], start = { ...q.pos }; assert.equal(q.pierce, Infinity); assert.equal(q.maxAge, 5);
  step(w, .5); const early = dist(start, q.pos), middle = { ...q.pos };
  step(w, .5); assert.ok(dist(middle, q.pos) > early); step(w, 3);
  assert.ok(w.projectiles.includes(q)); assert.ok(q.mult > 1); assert.equal(q.maxAge, 5);
  step(w, 1.01); assert.equal(w.projectiles.length, 0);
});
console.log('PASS Firebolt disciplines');
} finally { restore(); }
