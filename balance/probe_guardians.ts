import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { guardianCountStat, guardianErrors, GUARDIAN_CFG } from '../src/engine/guardianSpec';
import { satelliteCountStat, satelliteErrors } from '../src/engine/satelliteSpec';
import { SKILLS } from '../src/data/skills';
import { MAGIC_PACKS } from '../src/data/magicPacks';
import { ITEM_BASES } from '../src/data/itembases';
import { forgeItem } from '../src/engine/itemgen';
import { makeSkillInstance, type SkillDef } from '../src/engine/skills';
import { mod, type Modifier } from '../src/engine/stats';
import { SIM_TAP } from '../src/engine/tap';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { START_ZONE } from '../src/data/zones';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
const check = (label: string, run: () => void) => { run(); console.log(`PASS ${label}`); };
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const cold = satelliteCountStat('rime_wake'), ward = guardianCountStat('graveglass');
const internal = (w: World) => w as unknown as { updateProjectiles(dt: number): void };
function dress(a: Actor) {
  a.sheet.setSource('rig', [mod('life', 'override', 100000), mod('accuracy', 'override', 100000),
    ...['critChance', 'armor', 'evasion', 'blockChance', 'poise', 'insight', 'energyShield', 'endurance', 'coldRes', 'fireRes'].map(s => mod(s, 'override', 0))]);
  a.fillResources(); a.skills = []; a.casting = null;
}
function fixture() { const w = makeSimWorld('warrior', 72461); w.actors = [w.player]; w.player.pos = { x: 800, y: 600 }; dress(w.player); return w; }
function body(w: World, x = 1050, y = 600, owner?: Actor) {
  const a = w.createMonster('skeleton_warrior', 12, owner ? owner.team : 'enemy', owner); dress(a);
  a.pos = { x, y }; w.actors.push(a); return a;
}
function advance(w: World, seconds: number, hz = 60, fly = true) {
  for (let left = seconds; left > 1e-8; left -= 1 / hz) {
    const dt = Math.min(left, 1 / hz); w.time += dt; w.refreshSatellites(dt); w.refreshGuardians(dt);
    if (fly) internal(w).updateProjectiles(dt);
  }
}
function grantCold(a: Actor, mods: Modifier[] = []) { a.sheet.setSource('cold', [mod(cold, 'flat', 1), mod('satelliteSpeed', 'more', -1), ...mods]); }
function ready(count = 1) { const w = fixture(); w.player.sheet.setSource('ward', [mod(ward, 'flat', count)]); advance(w, 5); return w; }
function shoot(w: World, caster: Actor, target: Actor, extra: Partial<SkillDef> = {}) {
  const inst = makeSkillInstance({ id: 'guard_test', name: 'Guard test', description: '', color: '#f77', noDrop: true,
    tags: ['fire', 'projectile'], manaCost: 0, cooldown: 0, useTime: 0, baseDamage: { fire: [40, 40] },
    delivery: { type: 'projectile', speed: 300, radius: 5, range: 700 }, effects: [{ type: 'damage' }], ...extra });
  w.spawnProjectile(caster, inst, caster.pos, Math.atan2(target.pos.y - caster.pos.y, target.pos.x - caster.pos.x));
}
check('cold/guardian data validates, and jewelry grants remain outside magic packs', () => {
  fixture(); assert.deepEqual(guardianErrors(), []); assert.deepEqual(satelliteErrors(id => !!SKILLS[id], id => SKILLS[id]?.delivery.type), []);
  assert.ok(Object.values(MAGIC_PACKS).every(d => !/guardianCount_|rime_wake/.test(JSON.stringify(d))));
});
check('cold commits the far target for a full aim window at 30/60/120 Hz', () => {
  for (const hz of [30, 60, 120]) {
    const w = fixture(); grantCold(w.player); body(w, 900, 700); const far = body(w, 1170, 550);
    advance(w, 0.9, hz, false); const v = w.satellites.visuals[0];
    near(v.aimX!, far.pos.x); near(v.aimY!, far.pos.y); assert.equal(w.projectiles.length, 0);
    advance(w, 0.2, hz, false); assert.equal(w.projectiles.length, 0);
    const before = JSON.stringify(w.satellites.visuals); w.refreshSatellites(); assert.equal(JSON.stringify(w.satellites.visuals), before);
    advance(w, 0.12, hz, false); assert.equal(w.projectiles.length, 1);
    const p = w.projectiles[0]; assert.equal(p.shape, 'line'); near(p.radius, 3); near(p.speed, 920); near(p.pierce, 1);
  }
});
check('fixed aim permits dodging; dead, occluded, removed and changed-story targets cancel the shot', () => {
  const w = fixture(), e = body(w); grantCold(w.player); advance(w, 1, 60, false);
  const v = w.satellites.visuals[0], at = { x: v.aimX, y: v.aimY }; e.pos.y += 120;
  const before = e.life; advance(w, 0.7); near(e.life, before);
  assert.equal(at.y, 600); assert.equal(w.projectiles.length, 1);
  for (const mode of ['death', 'wall', 'removed', 'tier', 'grant', 'teleport']) {
    const w = fixture(), e = body(w); grantCold(w.player); advance(w, 1, 60, false);
    if (mode === 'death') e.dead = true;
    if (mode === 'wall') w.lineOfSight = () => false;
    if (mode === 'removed') w.actors = [w.player];
    if (mode === 'tier') e.tier = 1;
    if (mode === 'grant') w.player.sheet.removeSource('cold');
    if (mode === 'teleport') w.player.pos.x -= 500;
    advance(w, 0.5, 60, false); assert.equal(w.projectiles.length, 0, mode);
    assert.ok(w.satellites.visuals.every(v => v.aimX === undefined));
  }
});
check('cold precision pierces two aligned bodies and uses cold/projectile/family scaling', () => {
  const sample = (mods: Modifier[], hz = 60) => {
    const w = fixture(); grantCold(w.player, mods); w.refreshSatellites(); const v = w.satellites.visuals[0];
    const nearEnemy = body(w, v.x + 160, v.y), farEnemy = body(w, v.x + 330, v.y);
    const packets: number[] = []; const victims: Actor[] = [];
    SIM_TAP.current = { onHit: (a, b, _r, p) => { assert.equal(a, w.player); victims.push(b); packets.push(p.amounts.cold ?? 0); } };
    try { seedGlobalRandom(34721); advance(w, 1.7, hz); } finally { SIM_TAP.current = null; }
    assert.deepEqual(victims, [nearEnemy, farEnemy]); return packets;
  };
  const base = sample([]); assert.ok(base.every(n => n > 0));
  for (const hz of [30, 120]) sample([], hz).forEach((n, i) => near(n, base[i]));
  for (const tag of ['cold', 'projectile', 'satellite', 'satellite:rime_wake'] as const)
    sample([mod('damage', 'more', 1, [tag])]).forEach((n, i) => near(n, base[i] * 2));
  sample([mod('damage', 'more', 1, ['fire']), mod('minionDamage', 'more', 1)]).forEach((n, i) => near(n, base[i]));
});
check('real jewelry stacks ward charges, caps them, resets on equipment change, and saves grants only', () => {
  const w = fixture(), base = Object.values(ITEM_BASES).find(b => b.category === 'ring' && b.dropWeight > 0)!;
  const mint = (id: string) => forgeItem({ baseId: base.id, ilvl: 20, rarity: 'magic', quality: 1, affixes: [{ id }] })!;
  w.meta.equipped.ring1 = mint('guardian_graveglass'); w.meta.equipped.ring2 = mint('guardian_graveglass'); w.recalcSeat(w.localSeat); advance(w, 5);
  assert.equal(w.guardians.visuals.length, 2); assert.ok(w.guardians.visuals.every(v => v.progress === 1));
  const r = fixture(); applySavedCharacter(r, JSON.parse(JSON.stringify(serializeCharacter(w)))); r.refreshGuardians();
  assert.equal(r.guardians.visuals.length, 2); assert.ok(r.guardians.visuals.every(v => v.progress === 0));
  w.meta.equipped.ring2 = mint('satellite_rime_wake'); w.recalcSeat(w.localSeat); w.refreshGuardians(); w.refreshSatellites();
  assert.equal(w.guardians.visuals.length, 1); near(w.guardians.visuals[0].progress, 0); assert.equal(w.satellites.visuals[0].family, 'rime_wake');
  w.player.sheet.setSource('extra', [mod(ward, 'flat', 100)]); advance(w, 5); assert.equal(w.guardians.visuals.length, GUARDIAN_CFG.maxPerActor);
});
check('one pane catches one incoming shot; a second hits while it rebuilds', () => {
  for (const hz of [30, 60, 120]) {
    const w = ready(), e = body(w); const before = w.player.life; shoot(w, e, w.player); advance(w, 1, hz);
    near(w.player.life, before); assert.equal(w.projectiles.length, 0); assert.ok(w.guardians.visuals[0].progress < 0.2);
    shoot(w, e, w.player); advance(w, 1, hz); assert.ok(w.player.life < before);
    advance(w, 4, hz); near(w.guardians.visuals[0].progress, 1);
  }
});
check('swept interception stops a fast explosive emitter before body hits, trails, children or end zones', () => {
  const w = ready(), e = body(w, 1000, 600), before = w.player.life;
  shoot(w, e, w.player, { delivery: { type: 'projectile', speed: 1800, radius: 5, range: 900,
    explode: { radius: 150 }, emit: { skillId: 'fireball', interval: 0.01 },
    trail: { every: 1, blast: { radius: 150 }, zone: { radius: 100, duration: 2, tickInterval: 0.2 } },
    endZone: { radius: 120, duration: 2, tickInterval: 0.2 } } });
  const p = w.projectiles[0]; internal(w).updateProjectiles(0.15);
  assert.ok(p.dissolved); near(w.player.life, before); assert.equal(w.projectiles.length, 0); assert.equal(w.zones.length, 0);
  assert.ok(w.guardians.visuals.some(v => v.kind === 'catch'));
  assert.ok(p.pos.x > w.player.pos.x + w.player.radius);
});
check('friendly, outbound, inside-born and cross-story projectiles do not spend panes', () => {
  for (const mode of ['ally', 'outbound', 'inside', 'tier', 'occluded']) {
    const w = ready(), e = body(w);
    if (mode === 'ally') { e.owner = w.player; e.team = 'player'; }
    if (mode === 'outbound') { e.pos.x = 700; }
    if (mode === 'inside') e.pos.x = 810;
    if (mode === 'tier') e.tier = 1;
    if (mode === 'occluded') w.lineOfSight = () => false;
    const target = mode === 'outbound' ? body(w, 500, 600) : w.player;
    shoot(w, e, target); advance(w, 1);
    assert.ok(w.guardians.visuals.filter(v => v.kind === 'reserve').every(v => v.progress === 1), mode);
  }
});
check('the first ward along a path catches it, with ally and monster symmetry', () => {
  const w = ready(), ally = body(w, 930, 600, w.player), enemy = body(w, 1200, 600);
  ally.sheet.setSource('ward', [mod(ward, 'flat', 1)]); advance(w, 5);
  shoot(w, enemy, w.player, { delivery: { type: 'projectile', speed: 2000, radius: 5, range: 900 } });
  internal(w).updateProjectiles(0.2);
  assert.ok(w.guardians.visuals.some(v => v.kind === 'catch' && v.owner === ally.id));
  assert.ok(w.guardians.visuals.some(v => v.kind === 'reserve' && v.owner === w.player.id && v.progress === 1));
  enemy.sheet.setSource('ward', [mod(ward, 'flat', 1)]); advance(w, 5);
  const life = enemy.life; shoot(w, w.player, enemy); advance(w, 2); near(enemy.life, life);
});
check('guardian recharge scales, pauses with timeflow, and zero-time reads cannot refill it', () => {
  const w = fixture(); w.player.sheet.setSource('ward', [mod(ward, 'flat', 1), mod('guardianRecharge', 'more', 1)]);
  advance(w, 2); near(w.guardians.visuals[0].progress, 0.8);
  const original = w.timeflow.actorScale; w.timeflow.actorScale = () => 0; advance(w, 10); near(w.guardians.visuals[0].progress, 0.8);
  w.timeflow.actorScale = original; w.refreshGuardians(); near(w.guardians.visuals[0].progress, 0.8);
  advance(w, 0.5); near(w.guardians.visuals[0].progress, 1);
});
check('death, grant loss, removal, allegiance, tier and travel clear guardian readiness', () => {
  for (const mode of ['death', 'grant', 'removed', 'allegiance', 'tier', 'downed', 'teleport']) {
    const w = ready(), a = w.player;
    if (mode === 'death') a.dead = true;
    if (mode === 'grant') a.sheet.removeSource('ward');
    if (mode === 'removed') w.actors = [];
    if (mode === 'allegiance') a.team = 'enemy';
    if (mode === 'tier') a.tier = 1;
    if (mode === 'downed') a.downed = true;
    if (mode === 'teleport') a.pos.x += 500;
    w.refreshGuardians(); assert.ok(w.guardians.visuals.every(v => v.progress === 0), mode);
  }
  const w = ready(); w.loadZone(START_ZONE); assert.equal(w.guardians.visuals.length, 0);
});
check('co-op copies cold aim and guardian depletion; omitted fields clear old visuals', () => {
  const w = ready(), e = body(w, 1000); grantCold(w.player); advance(w, 1, 60, false);
  shoot(w, e, w.player, { delivery: { type: 'projectile', speed: 2000, radius: 5, range: 900 } });
  internal(w).updateProjectiles(0.1);
  assert.ok(w.guardians.visuals.some(v => v.kind === 'catch'));
  assert.equal(w.guardians.visuals.find(v => v.kind === 'reserve')!.progress, 0);
  const c = fixture(), snap = serializeSnapshot(w, 1); applySnapshot(c, snap);
  assert.deepEqual(c.satellites.visuals, w.satellites.visuals); assert.deepEqual(c.guardians.visuals, w.guardians.visuals);
  assert.notEqual(c.guardians.visuals[0], w.guardians.visuals[0]);
  delete snap.guardians; delete snap.satellites; applySnapshot(c, snap);
  assert.equal(c.guardians.visuals.length, 0); assert.equal(c.satellites.visuals.length, 0);
});
console.log('PASS cold and guardian integration');
