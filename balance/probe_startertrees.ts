import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SUPPORTS } from '../src/data/supports';
import { SKILLS } from '../src/data/skills';
import { STARTER_SKILL_TREES } from '../src/data/starterSkillTrees';
import { STARTER_CLASSES, STARTER_SKILLS } from '../src/meta/account';
import { CLASSES } from '../src/data/classes';
import { makeSkillInstance, instanceDelivery, instanceBaseTags, instanceEffects, instanceMods, skillContextTags, treeNodeRefusal, supportFitsInst, type SkillInstance, type BuffEffect } from '../src/engine/skills';
import { mod, STAT_DEFS } from '../src/engine/stats';
import { previewSkill } from '../src/engine/skillPreview';
import { serializeCharacter, rebuildSkill } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
import type { World } from '../src/engine/world';
let failed = 0;
const check = (name: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failed++; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.00001;
function setup(id: string, nodes: string[] = []) {
  const klass = CLASSES.find(c => STARTER_CLASSES.includes(c.id) && c.bar.includes(id))!;
  const w = makeSimWorld(klass.id, 0xc1a55), p = w.player;
  for (const attr of ['willpower', 'intelligence', 'strength', 'dexterity'] as const) w.meta.baseAttrs[attr] = 100;
  w.recalcPlayer(); const inst = makeSkillInstance(SKILLS[id], 20, 3);
  w.meta.knownSkills.set(id, inst); p.skills.fill(null); p.skills[0] = inst;
  for (const n of nodes) w.pickTreeNode(id, n);
  p.sheet.setSource('rig', [mod('mana', 'flat', 10000), mod('accuracy', 'flat', 100000), mod('lifeRegen', 'override', 0)]);
  p.fillResources(); return { w, p, inst };
}
function step(w: World, seconds: number) { for (let i = 0; i < Math.ceil(seconds * 60); i++) w.update(1 / 60); }
function cast(w: World, inst: SkillInstance, aim = { x: w.player.pos.x + 45, y: w.player.pos.y }) {
  const p = w.player; p.casting = null; p.useLock = 0; p.cooldowns.clear();
  const ok = w.useSkill(p, inst, aim, true);
  for (let i = 0; i < 150 && p.casting && !inst.def.guard; i++) step(w, 1 / 60);
  return ok;
}
function body(w: World, x = 45, team: 'player' | 'enemy' = 'enemy', owner = false) {
  const a = w.createMonster('zombie', 1, team, owner ? w.player : undefined); a.skills = []; a.pos = { x: w.player.pos.x + x, y: w.player.pos.y }; a.tier = w.player.tier;
  a.sheet.setSource('rig', [mod('life', 'flat', 100000), mod('moveSpeed', 'override', 0), mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]);
  a.fillResources(); w.actors.push(a); return a;
}
function reset(w: World, inst: SkillInstance) { w.fonts.push({ pos: { ...w.player.pos } }); w.meta.abilityEssences.ability4 = 999; return w.fontResetTree(inst.def.id); }
function getBuff(inst: SkillInstance, id: string) { return instanceEffects(inst).find(f => f.type === 'buff' && f.id === id) as BuffEffect; }
const restore = seedGlobalRandom(0xc1a55);
try {
  check('every fresh-account starting bar now has a full tree', STARTER_SKILLS.every(id => !!STARTER_SKILL_TREES[id]));
  for (const [id, tree] of Object.entries(STARTER_SKILL_TREES)) {
    const nodes = tree.nodes!, roots = nodes.filter(n => n.excludes?.length), neutral = nodes.find(n => !n.links?.length && !n.excludes?.length)!;
    const plain = setup(id), passive = setup(id, Array(4).fill(neutral.id)), m = neutral.mods![0];
    check(id + ': four neutral ranks preserve base effects, tags and delivery', passive.inst.treeNodes?.length === 4 && instanceDelivery(passive.inst) === plain.inst.def.delivery && instanceEffects(passive.inst) === plain.inst.def.effects && instanceBaseTags(passive.inst).join() === instanceBaseTags(plain.inst).join());
    check(id + ': four neutral ranks increase the intended stat', passive.p.sheet.get(m.stat, new Set([...skillContextTags(passive.inst), ...(m.tags ?? [])]), instanceMods(passive.inst)) > plain.p.sheet.get(m.stat, new Set([...skillContextTags(plain.inst), ...(m.tags ?? [])]), instanceMods(plain.inst)));
    check(id + ': 15 nodes, two exclusive roots, four forks and eight leaves', nodes.length === 15 && roots.length === 2 && roots.every(r => nodes.filter(n => n.links?.includes(r.id)).length === 2) && nodes.filter(n => n.links?.length && !nodes.some(other => other.links?.includes(n.id))).length === 8);
    check(id + ': every modifier names a registered finite stat', nodes.every(n => [...(n.mods ?? []), ...(n.buffs ?? []).flatMap(b => b.mods ?? [])].every(m => !!STAT_DEFS[m.stat] && Number.isFinite(m.value))));
    for (const root of roots) {
      const mids = nodes.filter(n => n.links?.includes(root.id)), s = setup(id, [root.id, ...mids.map(n => n.id), neutral.id]);
      check(id + '/' + root.id + ': both forks mix with neutral while rival locks', s.inst.treeNodes?.length === 4 && !!treeNodeRefusal(s.inst, root.excludes![0]));
      const opposite = setup(id, [root.id, ...mids.map(n => n.id).reverse(), neutral.id]);
      const normalize = (i: SkillInstance) => instanceEffects(i).filter(f => f.type === 'buff').map(f => ({ ...f, mods: f.mods.map(m => JSON.stringify(m)).sort() }));
      check(id + '/' + root.id + ': fork order preserves buff composition', JSON.stringify(normalize(s.inst)) === JSON.stringify(normalize(opposite.inst)));
    }
    for (const leaf of nodes.filter(n => n.links?.length && !nodes.some(other => other.links?.includes(n.id)))) {
      const mid = nodes.find(n => n.id === leaf.links![0])!, s = setup(id, [mid.links![0], mid.id, leaf.id]), a = body(s.w, mid.links![0] === 'unbound_cleave' ? 180 : 45);
      const used = cast(s.w, s.inst, a.pos);
      step(s.w, 0.8);
      const worked = id === 'shield_up' ? s.p.casting?.mode === 'guard'
        : id === 'war_cry' || id === 'cloak' ? s.p.buffs.has(id)
        : id === 'shadow_step' ? s.p.pos.x !== a.pos.x && s.p.buffs.size > 0
        : a.life < a.maxLife();
      check(id + '/' + leaf.id + ': real route casts and performs its role', used && worked);
      const saved = serializeCharacter(s.w).knownSkills.find(k => k.skillId === id)!;
      check(id + '/' + leaf.id + ': save round trip preserves effects and picks', rebuildSkill(saved)?.treeNodes?.join() === s.inst.treeNodes?.join() && JSON.stringify(instanceEffects(rebuildSkill(saved)!)) === JSON.stringify(instanceEffects(s.inst)));
    }
  }
  {
    const { w, p, inst } = setup('war_cry', ['warband_call', 'carrying_voice', 'hold_the_line']);
    const ally = body(w, 220, 'player'), minion = body(w, -80, 'player', true), far = body(w, 400, 'player'), enemy = body(w, 30), upstairs = body(w, 30, 'player'), dead = body(w, 40, 'player'), construct = body(w, 50, 'player');
    upstairs.tier++; dead.dead = true; construct.construct = { kind: 'totem', range: 100, timer: 0 };
    const armor = ally.sheet.get('armor'); cast(w, inst);
    check('warband radius really reaches extended allies and minions', [p, ally, minion].every(a => a.buffs.has('war_cry')) && near(ally.sheet.get('armor'), armor + 40));
    check('warband excludes distant, enemy, other-story, dead and construct bodies', [far, enemy, upstairs, dead, construct].every(a => !a.buffs.has('war_cry')));
    const late = body(w, 10, 'player'); step(w, 0.2); check('warband grants at cast time rather than following as an aura', !late.buffs.has('war_cry'));
    check('preview resolves ally radius from the same invested stat', previewSkill(p, inst).rows.some(r => r.key === 'buffRadius_war_cry' && r.value === String(Math.round(180 * p.sheet.get('aoeRadius', skillContextTags(inst), instanceMods(inst))))));
    ally.pos = { x: p.pos.x + 150, y: p.pos.y }; minion.pos = { x: p.pos.x - 170, y: p.pos.y };
    const otherInst = makeSkillInstance(SKILLS.war_cry, 20); otherInst.treeNodes = ['warband_call'];
    w.executeSkill(ally, otherInst, ally.pos);
    check('another caster can refresh the same named blessing', p.buffs.has('war_cry'));
    const refreshed = p.buffs.get('war_cry')!.def;
    check('respec preserves another caster refresh but removes this caster remaining recipients', reset(w, inst) && p.buffs.get('war_cry')?.def === refreshed && !minion.buffs.has('war_cry'));
    check('tree patches never mutate the authored buff', SKILLS.war_cry.effects.filter(f => f.type === 'buff').every(f => f.affects === undefined && f.mods.every(m => m.stat !== 'armor')));
  }
  {
    const { w, p, inst } = setup('war_cry', ['measured_fury', 'sure_hand', 'blood_repaid']); const a = body(w);
    const attack = makeSkillInstance({ ...SKILLS.backstab, useTime: 0, cooldown: 0, effects: [{ type: 'damage' }], baseDamage: { physical: [20, 20] }, innateMods: [mod('critChance', 'override', 0)] });
    cast(w, inst); const boosted = p.sheet.get('damage', new Set(['attack'])); const spell = makeSkillInstance({ ...SKILLS.frost_nova, useTime: 0, baseDamage: { cold: [1, 1] }, effects: [{ type: 'damage' }] });
    cast(w, spell); check('prepared attack survives a spell hit', p.buffs.has('war_cry'));
    const before = a.life; cast(w, attack, a.pos); const first = before - a.life;
    check('first landed attack receives and spends the prepared buff', !p.buffs.has('war_cry') && boosted > p.sheet.get('damage', new Set(['attack'])) && first > 0);
    const secondBefore = a.life; cast(w, attack, a.pos); check('later attacks lose the preparation multiplier', first > secondBefore - a.life);
  }
  {
    const { w, p, inst } = setup('cloak', ['vanishing_cloak', 'patient_shadow', 'unseen_stride']); body(w);
    const baseMove = p.sheet.get('moveSpeed'); cast(w, inst);
    check('vanishing cloak grants actual invisibility and temporary stride', p.sheet.get('invisible') > 0 && p.sheet.get('moveSpeed') > baseMove);
    cast(w, makeSkillInstance(SKILLS.backstab)); check('an offensive act breaks vanishing cloak', !p.buffs.has('cloak') && p.sheet.get('invisible') === 0);
    cast(w, inst); check('cloak respec removes its remaining buff', reset(w, inst) && !p.buffs.has('cloak'));
  }
  {
    const { w, p, inst } = setup('cloak', ['skirmisher_veil', 'slippery_silhouette', 'veil_of_iron']); const a = body(w);
    cast(w, inst); cast(w, makeSkillInstance(SKILLS.backstab)); check('skirmisher veil permits offensive acts', p.buffs.has('cloak'));
    p.sheet.setSource('defender', [mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]); p.es = 0;
    const enemyHit = makeSkillInstance({ ...SKILLS.frost_nova, effects: [{ type: 'damage' }], baseDamage: { chaos: [20, 20] }, innateMods: [mod('critChance', 'override', 0)] });
    const before = p.life; w.executeSkill(a, enemyHit, p.pos); const first = before - p.life;
    check('a landed hit breaks skirmisher veil', first > 0 && !p.buffs.has('cloak'));
    const secondBefore = p.life; w.executeSkill(a, enemyHit, p.pos); check('veil reduction protects the hit that breaks it', first < secondBefore - p.life);
  }
  {
    const { w, p, inst } = setup('shadow_step', ['assassins_arrival', 'poised_blade', 'open_back']);
    check('an empty destination cannot grant preparation', !cast(w, inst) && !p.buffs.has('step_preparation'));
    const a = body(w, 160); a.facing = Math.PI; const before = p.pos.x; cast(w, inst, a.pos);
    check('targeted step moves behind and grants preparation', p.pos.x !== before && p.pos.x > a.pos.x && p.buffs.has('step_preparation'));
    cast(w, makeSkillInstance(SKILLS.backstab), a.pos); check('arrival empowers another skill and spends on its landed hit', a.life < a.maxLife() && !p.buffs.has('step_preparation'));
    const wire = serializeSeatMeta(w.localSeat), other = setup('shadow_step'); applySeatMeta(other.w, other.w.localSeat, wire);
    check('new route and added buff rebuild on the network seat', JSON.stringify(instanceEffects(other.w.meta.knownSkills.get('shadow_step')!)) === JSON.stringify(instanceEffects(inst)));
  }
  {
    const { w, p, inst } = setup('shadow_step', ['smoke_passage', 'fading_steps', 'hidden_mending']); const a = body(w, 160); cast(w, inst, a.pos);
    check('smoke passage grants actual invisibility and healing', p.sheet.get('invisible') > 0 && getBuff(inst, 'step_smoke').mods.some(m => m.stat === 'lifeRegen' && m.value === 3));
    step(w, 3); check('smoke passage expires normally', !p.buffs.has('step_smoke'));
  }

  {
    const { w, p, inst } = setup('shield_up', ['iron_shelter', 'reinforced_plate', 'broad_shelter']);
    cast(w, inst); step(w, 0.05);
    check('iron shelter creates a real rear shell scaled by guard strength', !!p.shellGuard && p.shellGuard.pool > 55 && p.shellGuard.arcDeg === 200);
    check('respec retires a held stance and its captured shell', reset(w, inst) && !p.casting && !p.shellGuard);
  }
  {
    const { w, p, inst } = setup('shield_up', ['measured_riposte', 'patient_hand', 'punishing_reply']); const a = body(w);
    cast(w, inst); step(w, 0.35);
    const shield = p.casting?.shield, life = p.life, enemyLife = a.life;
    w.executeSkill(a, makeSkillInstance({ ...SKILLS.frost_nova, effects: [{ type: 'damage' }], baseDamage: { chaos: [20, 20] }, innateMods: [mod('critChance', 'override', 0)] }), p.pos);
    check('invested parry window counters a real hit without spending shield', a.life < enemyLife && p.casting?.shield === shield && p.life === life);
  }
  {
    const { w, inst } = setup('frost_nova', ['winter_footprint', 'winter_borders', 'lingering_winter']); const a = body(w);
    cast(w, inst); const life = a.life; const z = w.zones.find(z => z.inst === inst);
    check('winter footprint creates the invested persistent ground', !!z && z.radius > 80 && z.linger > 5 && z.tickInterval === 0.5);
    step(w, 1.1); check('winter ground keeps hitting after its initial nova', a.life < life);
    check('respec retires the previous cold field', reset(w, inst) && !w.zones.some(z => z.inst === inst));
  }
  {
    const { w, inst } = setup('firebolt', ['ember_satellites', 'dense_constellation']); cast(w, inst);
    check('satellite route launches three genuinely orbiting flames', w.projectiles.length === 3 && w.projectiles.every(p => p.orbit > 0));
  }
  {
    const plain = setup('war_cry'), shared = setup('war_cry', ['warband_call']);
    check('area support follows the mutated ally blessing tag', !supportFitsInst(SUPPORTS.widening, plain.inst) && supportFitsInst(SUPPORTS.widening, shared.inst));
    const { w, p, inst } = shared; inst.sockets[0] = { def: SUPPORTS.time_fuse, level: 1 }; cast(w, inst);
    check('fused blessing waits for its fuse', !p.buffs.has('war_cry'));
    reset(w, inst); step(w, 2.2); check('respec cancels a pending blessing fuse', !p.buffs.has('war_cry'));
  }
} finally { restore(); }
if (failed) process.exitCode = 1;
console.log(`Starter trees: ${failed} failures`);
