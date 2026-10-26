import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { SKELETAL_SCHOOLS } from '../src/data/skeletonArcherSkills';
import { makeSkillInstance, instanceDelivery, instanceCastMode, instanceChannel, supportFitsInstOrCrew } from '../src/engine/skills';
import { summonCapacity } from '../src/engine/summonContracts';
import { mod } from '../src/engine/stats';
import { updateAI } from '../src/engine/ai';
import { SIM_TAP } from '../src/engine/tap';
import { rebuildSkill } from '../src/meta/character';
import type { World } from '../src/engine/world';

let checks = 0;
const check = (label: string, ok: unknown) => { assert.ok(ok, label); console.log('PASS ' + label); checks++; };
const step = (w: World, seconds: number, minds = false) => { for (let n = 0; n < Math.ceil(seconds * 60); n++) { if (minds) for (const a of [...w.actors]) updateAI(a, w, 1 / 60); w.update(1 / 60); } };
function rig(nodes: string[]) {
  const w = makeSimWorld('necromancer', 7331), p = w.player;
  for (const key of ['intelligence', 'willpower', 'wisdom'] as const) w.meta.baseAttrs[key] = 100;
  w.recalcPlayer();
  const inst = makeSkillInstance(SKILLS.summon_skeleton_archer, 20, 4);
  w.meta.knownSkills.set(inst.def.id, inst); p.skills.fill(null); p.skills[0] = inst;
  for (const node of nodes) { w.pickTreeNode(inst.def.id, node); assert.ok(inst.treeNodes?.includes(node), 'allocate ' + node); }
  p.sheet.setSource('archer-rig', [mod('mana', 'flat', 100000), mod('accuracy', 'flat', 100000), mod('critChance', 'override', 0)]); p.fillResources();
  const aim = { x: p.pos.x + 400, y: p.pos.y };
  const bodies = () => w.actors.filter(a => !a.dead && a.owner === p && a.summonInst === inst);
  return { w, p, inst, aim, bodies };
}
function target(w: World, x: number, y: number) {
  const a = w.createMonster('zombie', 1, 'enemy'); a.pos = { x, y }; a.skills = []; a.brain = undefined;
  a.sheet.setSource('archer-rig', [mod('life', 'flat', 100000), mod('evasion', 'override', 0), mod('armor', 'override', 0), mod('blockChance', 'override', 0), mod('moveSpeed', 'override', 0), mod('lifeRegen', 'override', 0)]);
  a.fillResources(); w.actors.push(a); return a;
}
const restore = seedGlobalRandom(7331);
try {
  {
    const { w, p, inst, bodies, aim } = rig(['rattling_bows', 'rain_of_bones']);
    const d = instanceDelivery(inst); assert.equal(d.type, 'summon'); if (d.type !== 'summon') throw Error();
    p.sheet.setSource('capacity', [mod('minionMaxCount', 'flat', 3)]);
    check('Grave Legion doubles the entire invested cap', summonCapacity(p, inst, d) === 10);
    w.useSkill(p, inst, aim, true); step(w, 1.3);
    check('cap investment still births just one archer', bodies().length === 1);
    const archer = bodies()[0], foe = target(w, p.pos.x + 250, p.pos.y);
    const arrow = makeSkillInstance({ ...SKILLS.skeletal_rattling_arrow, useTime: 0, cooldown: 0,
      delivery: { type: 'nova', radius: 500 }, targeting: undefined, baseDamage: { physical: [20, 20] } });
    archer.sheet.setSource('exact', [mod('critChance', 'override', 0), mod('accuracy', 'flat', 100000)]);
    const before = foe.life; w.executeSkill(archer, arrow, foe.pos); const first = before - foe.life;
    step(w, 1); const before2 = foe.life; w.executeSkill(archer, arrow, foe.pos); const second = before2 - foe.life;
    check('later arrows benefit from existing stacks', second > first * 1.039 && second < first * 1.041);
    const ordinary = makeSkillInstance({ ...arrow.def, id: 'bone_arrow', effects: [{ type: 'damage' }] });
    const ordinaryLife = foe.life; w.executeSkill(archer, ordinary, foe.pos);
    check('vulnerability does not amplify unrelated physical attacks', Math.abs((ordinaryLife - foe.life) - first) < 0.001);
    const status = foe.statuses.find(s => s.id === 'rattled_bones')!;
    check('applications keep separate clocks', status.stackTimes?.length === 2 && status.stackTimes[0] < status.stackTimes[1]);
    for (let n = 0; n < 60; n++) foe.applyStatus('rattled_bones', 0, 1, 'test');
    check('independent bank caps at thirty without refreshing the oldest', status.stacks === 30 && status.stackTimes![0] < 4.1);
    step(w, 4.05); check('first stack expires while later stacks remain', status.stacks === 29);
    step(w, 1); check('every stack expires despite later applications', !foe.statuses.some(s => s.id === 'rattled_bones'));
    for (let n = 0; n < 10; n++) foe.applyStatus('rattled_bones', 0, 1, 'test');
    w['ringAfflictions'](foe, 0.5); step(w, 0.1);
    check('partial cleanse removes independent timers permanently', foe.statuses.find(s => s.id === 'rattled_bones')?.stacks === 5);
    w['ringAfflictions'](foe, 1); foe.applyStatus('rattled_bones', 0, 1, 'test');
    w['ringAfflictions'](foe, 0.5); step(w, 2.6);
    check('duration cleanse shortens the last independent stack', !foe.statuses.some(s => s.id === 'rattled_bones'));
  }
  {
    const { w, p, inst, aim, bodies } = rig(['rattling_bows', 'ranked_bows', 'endless_quivers', 'rain_of_bones']);
    check('tree exposes a real uncapped channel', instanceCastMode(inst) === 'channel' && instanceChannel(inst)?.maxHold === undefined);
    check('channel starts', w.useSkill(p, inst, aim, true)); step(w, 0.15);
    check('first beat raises one flank archer', bodies().length === 1);
    step(w, 0.75); check('held channel grows to doubled cap within one second', bodies().length === 4);
    const ids = bodies().map(a => a.id).join(); step(w, 10);
    check('full formation never evicts or stops the channel', p.casting?.mode === 'channel' && bodies().map(a => a.id).join() === ids);
    p.casting!.aim = { x: p.pos.x, y: p.pos.y + 400 }; step(w, 1.5);
    check('both flanks turn with the caster', bodies().some(a => a.pos.x < p.pos.x) && bodies().some(a => a.pos.x > p.pos.x) && bodies().every(a => Math.abs(a.facing - Math.PI / 2) < 0.01));
    check('squad shoots without requiring an AI target', w.projectiles.some(pr => pr.caster.channelFormation && Math.abs(pr.dir - Math.PI / 2) < 0.01));
    p.casting!.held = false; step(w, 1 / 60);
    const released = w.projectiles.filter(pr => pr.caster.channelFormation && pr.radius >= 12);
    check('release fires one large arrow per full-cap body before retirement', released.length === 4 && bodies().length === 0 && released.every(pr => pr.caster.dead && pr.caster.owner === p));
    check('release captures triple damage without changing the catalog', released.every(pr => pr.inst.def.innateMods?.some(m => m.stat === 'damage' && m.kind === 'more' && m.value === 2)) && !SKILLS.skeletal_rattling_arrow.innateMods);
    const foe = target(w, released[0].pos.x, released[0].pos.y + 100), life = foe.life;
    step(w, 0.5); check('final arrows still hit after their skeletons crumble', foe.life < life);
    const saved = rebuildSkill({ skillId: inst.def.id, level: 20, rarity: 'common', sockets: [], treeNodes: inst.treeNodes });
    check('tree conversion survives save rebuild', !!saved && instanceCastMode(saved) === 'channel');
  }
  {
    const { w, p, inst, aim, bodies } = rig(['rattling_bows', 'ranked_bows', 'endless_quivers']);
    for (let n = 0; n < 150; n++) {
      w.applyInputs(new Map([[w.localSeat.id, { dx: 0, dy: 0, aim, held: [true], edge: [n === 0] }]]), 1 / 60);
      w.update(1 / 60);
    }
    check('ordinary held-slot input grows and maintains the channel', bodies().length === 2 && p.casting?.inst === inst);
    w.applyInputs(new Map([[w.localSeat.id, { dx: 0, dy: 0, aim, held: [false], edge: [false] }]]), 1 / 60); w.update(1 / 60);
    check('ordinary button release fires the full squad and retires it', bodies().length === 0 && w.projectiles.filter(pr => pr.radius >= 12).length === 2);
  }
  for (const speed of [1, 2]) {
    const squad = rig(['rattling_bows', 'ranked_bows', 'rain_of_bones']);
    const ordinary = rig(['rattling_bows', 'rain_of_bones']);
    for (const r of [squad, ordinary]) {
      r.p.sheet.setSource('cadence', [mod('castSpeed', 'override', speed), mod('manaRegen', 'override', 0)]);
      check('cadence comparison starts at speed ' + speed, r.w.useSkill(r.p, r.inst, r.aim, true));
    }
    step(squad.w, 0.9 / speed); step(ordinary.w, 0.9 / speed);
    check('four ranks rise before one ordinary summon completes at speed ' + speed,
      squad.bodies().length === 4 && ordinary.bodies().length === 0);
    step(ordinary.w, 0.2 / speed);
    check('ordinary casting still raises one persistent archer at speed ' + speed,
      ordinary.bodies().length === 1 && !ordinary.bodies()[0].channelFormation);
    const before = squad.p.mana, ids = squad.bodies().map(a => a.id).join();
    step(squad.w, 3 / speed);
    check('faster paid beats sustain full ranks without replacing them at speed ' + speed,
      squad.p.casting?.mode === 'channel' && squad.bodies().map(a => a.id).join() === ids
      && before - squad.p.mana >= 11 && before - squad.p.mana <= 13);
  }
  for (const stop of ['early', 'interrupt', 'unseat', 'death'] as const) {
    const { w, p, inst, aim, bodies } = rig(['rattling_bows', 'ranked_bows', 'endless_quivers']);
    w.useSkill(p, inst, aim, true); step(w, stop === 'early' ? 0.2 : 2);
    if (stop === 'early') p.casting!.held = false;
    if (stop === 'interrupt') p.casting = null;
    if (stop === 'unseat') p.skills[0] = null;
    if (stop === 'death') p.dead = true;
    step(w, 0.1);
    check(stop + ' clears the squad without a finale', bodies().length === 0 && !w.projectiles.some(pr => pr.radius >= 12));
  }
  {
    const { w, p, inst, aim, bodies } = rig(['rattling_bows', 'ranked_bows', 'piercing_bones', 'endless_quivers']);
    w.useSkill(p, inst, aim, true); step(w, 2);
    check('Bone Mortars raises actual mortarmen', bodies().length === 2 && bodies().every(a => a.defId === 'skeletal_mortarman' && a.skills.some(s => s?.def.id === 'skeletal_bombardment')));
    p.casting!.held = false; step(w, 1 / 60);
    const mortar = w.zones.filter(z => z.inst.def.id === 'skeletal_bombardment' && z.radius >= 130);
    check('full mortar release launches empowered lobbed areas', mortar.length === 2 && bodies().length === 0);
    const foe = target(w, mortar[0].pos.x, mortar[0].pos.y), life = foe.life;
    step(w, 0.9); check('released mortars land after retirement', foe.life < life);
  }
  {
    const { w, p, inst, aim, bodies } = rig(['rattling_bows', 'ranked_bows', 'rain_of_bones', 'drumming_rain']);
    inst.sockets[0] = { def: SUPPORTS.resonance, level: 1 };
    check('Rain admits an area support through its own component', supportFitsInstOrCrew(SUPPORTS.widening, inst, w.summonCrewSkills(inst)));
    inst.sockets[1] = { def: SUPPORTS.widening, level: 1 };
    w.useSkill(p, inst, aim, true); step(w, 1.3);
    const a = bodies()[0], rain = a.skills.find(s => s?.def.id === 'skeletal_arrowfall')!, arrow = a.skills.find(s => s?.def.id === 'skeletal_rattling_arrow')!;
    check('area support forwards to rain alone', rain.sockets.some(s => s?.def.id === 'widening') && !arrow.sockets.some(s => s?.def.id === 'widening'));
    check('channeled archers really cast Rain of Bones', w.zones.some(z => z.inst.def.id === 'skeletal_arrowfall'));
    const foe = target(w, aim.x, aim.y); foe.radius = 120;
    w.executeSkill(a, rain, foe.pos); step(w, 1);
    check('Rain strikes participate in Barbed Bones wounds', foe.statuses.some(s => s.id === 'rattled_bones' && s.stacks > 0));
    const bare = rig(['rattling_bows']); bare.inst.sockets[0] = { def: SUPPORTS.resonance, level: 1 };
    check('bare arrows do not admit area-only support', !supportFitsInstOrCrew(SUPPORTS.widening, bare.inst, bare.w.summonCrewSkills(bare.inst)));
  }
  {
    const { w, p, inst, aim, bodies } = rig(['rattling_bows', 'rain_of_bones', 'cruel_rain']);
    w.executeSkill(p, inst, aim); const a = bodies()[0], arrow = a.skills[0]!;
    w.executeSkill(a, arrow, { x: a.pos.x + 400, y: a.pos.y });
    const shots = w.projectiles.filter(pr => pr.caster === a);
    check('Fanned Volley fires three arrows including a straight center shot', shots.length === 3 && shots.some(pr => Math.abs(pr.dir) < 0.001));
  }
  for (const school of SKELETAL_SCHOOLS) {
    const { w, p, inst, aim, bodies } = rig(['unstrung_sorcery', 'volatile_souls']);
    // Force one selected school in this test without altering the catalog.
    inst.def = { ...inst.def, delivery: { ...inst.def.delivery, type: 'summon', monsterId: school.monster, count: 1, maxActive: 2 } };
    inst.treeNodes = ['volatile_souls']; w.executeSkill(p, inst, aim);
    const mage = bodies()[0], bolt = mage.skills[0]!;
    const widths: number[] = [];
    for (let n = 0; n < 8; n++) { w.projectiles = []; w.executeSkill(mage, bolt, aim); widths.push(w.projectiles[0].radius); }
    check(school.type + ' empowers exactly every fourth completed bolt', widths.every((v, n) => Math.abs(v - ((n + 1) % 4 ? 7 : 12.6)) < 0.001));
    const shot = w.projectiles[0], foe = target(w, mage.pos.x + 100, mage.pos.y);
    shot.dir = 0; const before = foe.life; step(w, 0.4);
    check(school.type + ' empowered bolt applies its own damage-over-time status', foe.life < before && foe.statuses.some(s => s.id === school.status && s.dps > 0 && s.casterId === mage.id));
    const weather = makeSkillInstance(SKILLS['skeletal_weather_' + school.type]); mage.skills.push(weather); mage.casting = null; mage.cooldowns.clear(); mage.useLock = 0;
    check(school.type + ' weather begins a real channel', w.useSkill(mage, weather, foe.pos) && (mage.casting as import('../src/engine/actor').CastingState | null)?.mode === 'channel');
    step(w, 1); check(school.type + ' channel sustains actual bombardments', w.zones.some(z => z.inst.def.id === weather.def.id));
    step(w, 2.3); check(school.type + ' weather ends and recovers', !mage.casting && mage.cooldowns.has(weather.def.id));
  }
  for (const [fork, leaf, type] of [['volatile_souls','ember_souls','fire'], ['volatile_souls','rime_souls','cold'], ['unstable_current','storm_souls','lightning'], ['unstable_current','venom_souls','chaos']]) {
    const { w, p, inst, aim, bodies } = rig(['unstrung_sorcery', fork, leaf]); w.executeSkill(p, inst, aim);
    const mage = bodies()[0]; target(w, mage.pos.x + 70, mage.pos.y);
    let novas = 0; SIM_TAP.current = { onCast: (a,s) => { if (a === mage && s.def.id === 'skeletal_nova_' + type) novas++; } };
    step(w, 10, true); SIM_TAP.current = null;
    check(type + ' selection teaches and AI casts its matching nova', novas > 0 && mage.skills.some(s => s?.def.id === 'skeletal_nova_' + type));
  }
  console.log('PASS Skeleton Archer: ' + checks + ' checks');
} finally { SIM_TAP.current = null; restore(); }
