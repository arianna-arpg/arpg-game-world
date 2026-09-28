import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { guardArtsOf, guardArtAbsorb, guardCapacity, guardArtsErrors } from '../src/engine/guardArtsSpec';
import { makeSkillInstance, instanceCastMode, castScopeTag, instanceMods, skillContextTags, skillCooldownSeconds, type SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { applyDot, landLifeDamage } from '../src/engine/damage';
import { spendAbsorbLayers } from '../src/engine/absorb';
import { SIM_TAP } from '../src/engine/tap';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { previewSkill } from '../src/engine/skillPreview';
import type { World } from '../src/engine/world';

const restore = seedGlobalRandom(819271);
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
let checks = 0;
function test(name: string, run: () => void) { run(); checks++; console.log('PASS ' + name); }
function setup(nodes: string[] = []) {
  const w = makeSimWorld('warrior', 819271), p = w.player;
  w.actors = [p]; w.walk = null; w.doodads = []; w.markDoodadsChanged();
  for (const stat of ['strength', 'dexterity', 'willpower', 'intelligence'] as const) w.meta.baseAttrs[stat] = 100;
  const inst = makeSkillInstance(SKILLS.shield_up, 20, 3);
  inst.treeNodes = nodes; p.skills.fill(null); p.skills[0] = inst; w.meta.knownSkills.set(inst.def.id, inst); w.recalcPlayer();
  p.sheet.setSource('shield-up-rig', [mod('mana', 'flat', 10000), mod('life', 'flat', 10000), mod('armor', 'override', 100),
    mod('critChance', 'override', 0), mod('blockChance', 'override', 0), mod('lifeRegen', 'override', 0), mod('thorns', 'override', 0)]);
  p.fillResources(); return { w, p, inst };
}
function enemy(w: World, x = 40, team: 'player' | 'enemy' = 'enemy') {
  const a = w.createMonster('zombie', 1, team); a.skills = []; a.brain = undefined; a.aiCooldown = 99999;
  a.pos = { x: w.player.pos.x + x, y: w.player.pos.y }; a.tier = w.player.tier;
  a.sheet.setSource('shield-up-rig', [mod('life', 'flat', 100000), mod('blockChance', 'override', 0), mod('evasion', 'override', 0), mod('armor', 'override', 0), mod('lifeRegen', 'override', 0), mod('moveSpeed', 'override', 0)]);
  a.fillResources(); w.actors.push(a); return a;
}
function cast(w: World, inst: SkillInstance) {
  w.player.useLock = 0; w.player.cooldowns.clear(); w.player.mana = w.player.maxMana();
  assert.ok(w.useSkill(w.player, inst, { x: w.player.pos.x + 100, y: w.player.pos.y }, true));
}
/** Isolate mechanic clocks from encounter spawning and autonomous movement. */
function advance(w: World, seconds: number, hz = 60) {
  for (let t = 0; t < seconds - 1e-9; t += 1 / hz) {
    const dt = Math.min(1 / hz, seconds - t); w.time += dt; w.guardArts.update(dt);
    for (const a of w.actors) a.updateTimers(dt);
    w.refreshSatellites(dt);
  }
}
function block(w: World, damage: number) {
  const e = enemy(w);
  return (w as any).tryGuardBlock(w.player, e, e.pos, damage) as boolean;
}

try {
  test('unallocated guard remains held; Iron Shelter adds armor without grafting a support', () => {
    const plain = setup(); cast(plain.w, plain.inst);
    near(plain.p.casting!.maxShield!, 60 * plain.p.sheet.get('guardStrength', skillContextTags(plain.inst), instanceMods(plain.inst)));
    const { w, p, inst } = setup(['iron_shelter']); cast(w, inst);
    near(p.casting!.maxShield!, guardCapacity(p, inst)); assert.ok(p.casting!.maxShield! > plain.p.casting!.maxShield!);
    assert.equal(p.shellGuard, undefined); assert.ok(!inst.grafts?.length); assert.equal(inst.sockets.length, 3);
    const before = p.casting!.shield!; block(w, 20); near(before - p.casting!.shield!, 20);
    p.sheet.setSource('block', [mod('blockChance', 'override', 0.75)]);
    const random = Math.random; Math.random = () => 0;
    try { const left = p.casting!.shield!; block(w, 20); near(left - p.casting!.shield!, 10); } finally { Math.random = random; }
  });
  test('plates cap, reduce hits once, replenish missing guard and pulse even at cap', () => {
    const { w, p, inst } = setup(['iron_shelter', 'reinforced_plate', 'broad_shelter', 'shared_shelter']);
    const ally = enemy(w, -60, 'player'), foe = enemy(w, 70), far = enemy(w, -500, 'player'), above = enemy(w, -50, 'player'); above.tier++;
    for (const a of [p, ally, foe, far, above]) a.life = a.maxLife() / 2;
    cast(w, inst); advance(w, 6); near(p.sheet.get('damageTaken'), 0.76);
    const life = ally.life; advance(w, 2); assert.ok(ally.life > life); near(p.sheet.get('damageTaken'), 0.76);
    near(foe.life, foe.maxLife() / 2); near(far.life, far.maxLife() / 2); near(above.life, above.maxLife() / 2);
    const cs = p.casting!, before = cs.shield!; block(w, 100);
    near(cs.shield!, before - 76 + 76 * 0.12); near(p.sheet.get('damageTaken'), 0.84);
    const noDamage = cs.shield!; block(w, 0); near(cs.shield!, noDamage); near(p.sheet.get('damageTaken'), 0.84);
    block(w, 100000); assert.equal(p.casting, null); near(p.sheet.get('damageTaken'), 1);
  });
  test('ram needs intent, respects front/story/contact, and cannot be spammed by recontact', () => {
    const { w, p, inst } = setup(['iron_shelter', 'ready_watch']); const e = enemy(w, p.radius + 12), rear = enemy(w, -25), above = enemy(w, 25); above.tier++;
    cast(w, inst); const before = e.life; advance(w, 1); near(e.life, before);
    w.guardArts.ram(p, -1, 0); near(e.life, before);
    w.moveActor(p, 1, 0, 1 / 60); assert.ok(e.life < before); const after = e.life;
    for (let i = 0; i < 50; i++) { w.guardArts.ram(p, 0, 0); w.guardArts.ram(p, 1, 0); }
    near(e.life, after); near(rear.life, rear.maxLife()); near(above.life, above.maxLife());
    advance(w, 0.3); w.guardArts.ram(p, 1, 0); assert.ok(e.life < after);
  });
  test('ram cadence is stable at 30, 60 and 120 updates per second', () => {
    const counts = [30, 60, 120].map(hz => {
      const { w, p, inst } = setup(['iron_shelter', 'ready_watch']); const e = enemy(w, 25); cast(w, inst);
      let hits = 0; SIM_TAP.current = { onHit: (a, b) => { if (a === p && b === e) hits++; } };
      for (let i = 0; i < hz * 2; i++) { w.time = i / hz; w.guardArts.ram(p, 1, 0); }
      SIM_TAP.current = null; return hits;
    });
    assert.deepEqual(counts, [7, 7, 7]);
  });
  test('raising and releasing give separate bashes and each projects one wave', () => {
    const { w, p, inst } = setup(['iron_shelter', 'ready_watch', 'sheltered_thrust', 'shield_pump']); const e = enemy(w);
    const before = e.life, mana = p.mana; cast(w, inst);
    assert.ok(e.life < before && p.mana < mana); assert.equal(w.projectiles.filter(p => p.inst.guardArtsHost === inst).length, 1);
    const cs = p.casting!; cs.channelTime = 1.2; cs.held = false; const left = p.mana;
    (w as any).updateCasting(p, 0.01); near(p.mana, left); assert.equal(w.projectiles.filter(p => p.inst.guardArtsHost === inst).length, 2);
    assert.equal(p.casting, null);
  });
  test('absorb conversion has an actual cast cooldown, leaves movement free, and doubles with patience', () => {
    const { w, p, inst } = setup(['measured_riposte', 'patient_hand']);
    const base = guardArtAbsorb(p, inst)!; cast(w, inst);
    assert.equal(instanceCastMode(inst), 'cast'); assert.equal(castScopeTag(inst), 'cast:instant'); assert.equal(p.casting, null);
    near(p.absorbTotal, base.amount * 2); near(p.absorbLayers.values().next().value!.remaining, base.duration * 2);
    near(p.cooldowns.get('shield_up')!, skillCooldownSeconds(p, inst)); assert.ok(!w.useSkill(p, inst, p.pos, true));
    assert.ok(previewSkill(p, inst).rows.some(r => r.key === 'guardArtAbsorb'));
    const x = p.pos.x; w.moveActor(p, 1, 0, 0.1); assert.ok(p.pos.x > x);
    advance(w, 8); cast(w, inst); near(p.absorbTotal, base.amount);
    advance(w, 12); cast(w, inst); near(p.absorbTotal, base.amount * 2);
  });
  test('independent absorb pool coexists with other shields, drains to zero and does not count replacement as intact', () => {
    const { w, p, inst } = setup(['measured_riposte', 'patient_hand', 'punishing_reply']);
    p.absorb = 50; p.absorbTimer = 99; cast(w, inst); const layer = p.absorbTotal - 50;
    spendAbsorbLayers(p, layer / 2); near(p.absorb, 50); near(p.absorbTotal, layer / 2 + 50);
    cast(w, inst); assert.equal(p.sheet.get('satelliteCount_shelter_barrier'), 0);
    advance(w, 3.1); assert.equal(p.sheet.get('satelliteCount_shelter_barrier'), 1); near(p.absorb, 50);
  });
  test('intact outcomes stack to three and expire independently after 25 seconds', () => {
    const { w, p, inst } = setup(['measured_riposte', 'patient_hand', 'punishing_reply']);
    for (let i = 0; i < 4; i++) { cast(w, inst); advance(w, i === 0 ? 6.1 : 3.1); }
    assert.equal(p.sheet.get('satelliteCount_shelter_barrier'), 3);
    advance(w, 25.1); assert.equal(p.sheet.get('satelliteCount_shelter_barrier'), 0);
  });
  test('broken shields burst, retain the delayed explosion, and grant source-attributed thorns satellites', () => {
    const { w, p, inst } = setup(['measured_riposte', 'loaded_bash', 'unbroken_answer', 'hollow_counter']); const e = enemy(w);
    cast(w, inst); advance(w, 0.5); assert.ok(w.guardArts.visuals.length);
    const life = e.life; spendAbsorbLayers(p, p.absorbTotal + 1); assert.ok(e.life < life);
    assert.equal(p.sheet.get('satelliteCount_shelter_thorns'), 1);
    const after = e.life; advance(w, 1.55); assert.ok(e.life < after); assert.equal(w.guardArts.visuals.length, 0);
    const payload = w.guardArts.satellitePayload(p, 'satellite_shelter_thorns'); assert.equal(payload?.guardArtsHost, inst);
    for (let i = 0; i < 4; i++) { cast(w, inst); spendAbsorbLayers(p, p.absorbTotal); }
    assert.equal(p.sheet.get('satelliteCount_shelter_thorns'), 3);
  });
  test('real damage-over-time breaks the tracked shield through the common soak chain', () => {
    const { w, p, inst } = setup(['measured_riposte', 'loaded_bash', 'unbroken_answer']); cast(w, inst);
    p.applyStatus('warded', 0, 1, 'shield-up-rig'); assert.ok(p.statuses.some(s => s.id === 'warded'));
    applyDot(p, p.absorbTotal + 10, 'chaos'); assert.equal(p.absorbLayers.size, 0); assert.equal(p.sheet.get('satelliteCount_shelter_thorns'), 1);
    assert.ok(!p.statuses.some(s => s.id === 'warded'), 'absorb-bound armor must break with the final layer');
  });
  test('satellite contacts preserve each outcome potency and source skill credit', () => {
    const { w, p, inst } = setup(['measured_riposte', 'patient_hand', 'loaded_bash', 'unbroken_answer']);
    cast(w, inst); spendAbsorbLayers(p, p.absorbTotal); cast(w, inst); spendAbsorbLayers(p, p.absorbTotal);
    const first = w.guardArts.satellitePayload(p, 'satellite_shelter_thorns', 0)!;
    const second = w.guardArts.satellitePayload(p, 'satellite_shelter_thorns', 1)!;
    near(first.def.baseDamage!.physical![0], second.def.baseDamage!.physical![0] * 2);
    advance(w, 0.4); const orb = w.satellites.visuals.find(v => v.family === 'shelter_thorns')!;
    const e = enemy(w); e.pos = { x: orb.x, y: orb.y }; let hit = false;
    SIM_TAP.current = { onHit: (a, b, _r, packet) => { if (a === p && b === e) { hit = true; assert.ok(packet.amounts.physical! > 0); } } };
    w.refreshSatellites(1 / 60); SIM_TAP.current = null; assert.ok(hit); assert.equal(first.guardArtsHost, inst);
  });
  test('defensive capability validation catches invalid clocks and accepts authored nodes', () => {
    for (const node of SKILLS.shield_up.tree!.nodes!) if (node.guardArts) assert.deepEqual(guardArtsErrors(node.guardArts), []);
    assert.ok(guardArtsErrors({ plates: { interval: 0, max: 3, reduction: 0.08, label: 'Plate' } }).length);
    assert.ok(guardArtsErrors({ absorb: { duration: NaN, fraction: 0.4, cooldown: 8 } }).length);
  });
  test('barrier satellite reflects an actual projectile with defender ownership and preserves its typed wound', () => {
    const { w, p, inst } = setup(['measured_riposte', 'patient_hand', 'punishing_reply']); const e = enemy(w, 200);
    cast(w, inst); advance(w, 6.5);
    const orb = w.satellites.visuals.find(v => v.family === 'shelter_barrier' && v.armed)!; assert.ok(orb);
    e.pos = { x: orb.x + 100, y: orb.y };
    const bolt = makeSkillInstance({ ...SKILLS.firebolt, baseDamage: { fire: [20, 20] }, delivery: { type: 'projectile', speed: 500, radius: 3, range: 500 }, innateMods: [mod('critChance', 'override', 0)] });
    w.spawnProjectile(e, bolt, { x: orb.x + 25, y: orb.y }, Math.PI);
    (w as any).updateProjectiles(0.05);
    const reflected = w.projectiles.find(p => p.parryDamage); assert.ok(reflected); assert.equal(reflected.caster, p);
    assert.ok(reflected.parryDamage!.packet.amounts.fire! > 0);
  });
  test('lethal intervention spends a finite shield, works on cooldown, and cannot repeat or reset through respec/save', () => {
    const { w, p, inst } = setup(['measured_riposte', 'patient_hand', 'resetting_stance']);
    p.life = 10; p.mana = 0; p.cooldowns.set('shield_up', 999); w.guardArts.sync(p);
    near(landLifeDamage(p, 20), 0); near(p.life, 10); near(p.guardIntervention.shield_up, 300); near(p.mana, 0);
    p.absorbLayers.clear(); near(landLifeDamage(p, 11), 11); assert.ok(p.life <= 0);
    p.life = 10; w.guardArts.clear(p, inst); inst.treeNodes = ['measured_riposte']; w.guardArts.sync(p);
    inst.treeNodes = ['measured_riposte', 'patient_hand', 'resetting_stance']; w.guardArts.sync(p); near(p.guardIntervention.shield_up, 300);
    const saved = serializeCharacter(w); near(saved.guardIntervention!.shield_up, 300);
    const loaded = setup(); assert.ok(applySavedCharacter(loaded.w, saved)); near(loaded.p.guardIntervention.shield_up, 300);
    p.guardIntervention.shield_up = 0; p.life = 10; landLifeDamage(p, 100000); assert.ok(p.life < 0, 'intervention must not grant immunity');
  });
  test('respec/death/zone cleanup retires shields, waves, warnings and grants without rewards; wire carries visuals', () => {
    const { w, p, inst } = setup(['measured_riposte', 'loaded_bash', 'unbroken_answer', 'hollow_counter']); cast(w, inst); advance(w, 0.1);
    const client = setup().w, snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
    assert.deepEqual(client.guardArts.visuals, w.guardArts.visuals); near(client.player.absorbTotal, Math.round(p.absorbTotal));
    delete snap.guardArts; applySnapshot(client, snap); assert.equal(client.guardArts.visuals.length, 0);
    const e = enemy(w), before = e.life; (w as any).clearTreeFields(p, inst); advance(w, 3);
    near(e.life, before); assert.equal(p.absorbLayers.size, 0); assert.equal(p.sheet.get('satelliteCount_shelter_thorns'), 0);
    cast(w, inst); p.dead = true; w.guardArts.update(0); assert.equal(p.absorbLayers.size, 0); assert.equal(w.guardArts.visuals.length, 0);
    p.dead = false; cast(w, inst); w.guardArts.clearAll(); assert.equal(p.absorbLayers.size, 0);
  });
  test('sibling order is deterministic and socket modifiers remain available', () => {
    const { w, p, inst } = setup(['iron_shelter', 'ready_watch', 'sheltered_thrust', 'shield_pump']);
    const a = JSON.stringify(guardArtsOf(inst)); inst.treeNodes!.reverse(); assert.equal(JSON.stringify(guardArtsOf(inst)), a);
    inst.sockets[0] = { def: SUPPORTS.widening, level: 1 }; w.recalcPlayer();
    assert.equal(inst.sockets[0].def.id, 'widening'); assert.ok(!inst.grafts?.length);
    cast(w, inst); assert.ok(p.casting); assert.equal(w.projectiles.length, 1);
    inst.sockets[1] = { def: SUPPORTS.volley, level: 1 }; w.recalcPlayer();
    p.casting = null; w.projectiles = []; cast(w, inst);
    assert.equal(w.projectiles.length, 3, 'Bash Wake must honor the shared projectile-count support path');
    const e = enemy(w, 130); const before = e.life;
    for (let i = 0; i < 35; i++) (w as any).updateProjectiles(1 / 60);
    assert.ok(e.life < before, 'the supported waves must carry real bash damage');
  });
  console.log(`Shield Up: ${checks} behavior groups passed`);
} finally { SIM_TAP.current = null; restore(); }
