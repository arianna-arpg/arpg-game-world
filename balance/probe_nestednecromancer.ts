import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { MONSTERS } from '../src/data/monsters';
import { NECROMANCER_TREES } from '../src/data/necromancerTrees';
import { makeSkillInstance, instanceDelivery, instanceMods, instanceBaseTags, treeNodeRefusal,
  skillContextTags, supportFitsInstOrCrew, summonCrewOf, skillCooldownSeconds, type SkillInstance } from '../src/engine/skills';
import { treeGraph } from '../src/engine/skilltree';
import { replenishShape } from '../src/engine/replenishment';
import { updateAI } from '../src/engine/ai';
import { mod, STAT_DEFS } from '../src/engine/stats';
import { SIM_TAP } from '../src/engine/tap';
import { rebuildSkill } from '../src/meta/character';
import type { World } from '../src/engine/world';
let failed = 0;
function check(label: string, ok: boolean) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
function setup(id: string, nodes: string[] = []) {
  const w = makeSimWorld('necromancer', 0xb0ae), p = w.player;
  w.meta.baseAttrs.intelligence = 100; w.meta.baseAttrs.willpower = 100; w.recalcPlayer();
  const inst = makeSkillInstance(SKILLS[id], 20, 3);
  w.meta.knownSkills.set(id, inst); p.skills.fill(null); p.skills[0] = inst;
  for (const n of nodes) w.pickTreeNode(id, n);
  p.sheet.setSource('probe', [mod('mana', 'flat', 10000)]);
  p.fillResources(); return { w, p, inst };
}
function step(w: World, seconds: number, minds = false) {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    if (minds) for (const a of [...w.actors]) updateAI(a, w, 1 / 60);
    w.update(1 / 60);
  }
}
const crew = (w: World, inst: SkillInstance) => w.actors.filter(a => !a.dead && a.owner === w.player && a.summonInst === inst);
function cast(w: World, inst: SkillInstance) {
  w.player.casting = null; w.player.cooldowns.clear(); w.player.fillResources();
  const ok = w.useSkill(w.player, inst, w.player.pos, true); step(w, 1.3); return ok;
}
const restore = seedGlobalRandom(0xb0ae);
try {
  for (const id of Object.keys(NECROMANCER_TREES)) {
    const nodes = [...treeGraph(SKILLS[id])!.nodes.values()].map(n => n.node);
    const trunks = nodes.filter(n => n.excludes?.length);
    check(`${id}: 15 nodes and exactly two exclusive trunks`, nodes.length === 15 && trunks.length === 2);
    for (const trunk of trunks) {
      const mids = nodes.filter(n => n.links?.includes(trunk.id));
      check(`${id}/${trunk.id}: two forks each with two mixable leaves`, mids.length === 2 && mids.every(m =>
        !m.excludes?.length && nodes.filter(n => n.links?.includes(m.id)).length === 2));
      const { inst } = setup(id, [trunk.id, ...mids.map(n => n.id)]);
      const leaf = nodes.find(n => n.links?.includes(mids[0].id))!;
      check(`${id}/${trunk.id}: both forks coexist and a leaf remains open`, inst.treeNodes?.length === 3 && !treeNodeRefusal(inst, leaf.id));
    }
    check(`${id}: every host and body modifier is registered`, nodes.every(n => [...(n.mods ?? []), ...(n.over?.summon?.crewMods ?? [])].every(m => !!STAT_DEFS[m.stat])));
  }
  {
    const { w, p, inst } = setup('shambler_horde', ['commanded_dead', 'grave_rush', 'corpse_engine', 'funeral_charge']);
    check('mixed heavy rush spends four legal points', inst.treeNodes?.length === 4);
    cast(w, inst); const bodies = crew(w, inst);
    check('mixed heavy rush births three brief heavy bodies', bodies.length === 3 && bodies.every(a => a.lifespan > 2 && a.lifespan < 5));
    const before = p.sheet.get('minionLife', skillContextTags(inst), instanceMods(inst));
    inst.treeNodes = ['commanded_dead', 'corpse_engine', 'grave_rush', 'funeral_charge'];
    const d = instanceDelivery(inst);
    check('mixed routes retain life and count in either order', before === p.sheet.get('minionLife', skillContextTags(inst), instanceMods(inst)) && d.type === 'summon' && replenishShape(p, inst, d).count === 3);
    const passive = setup('shambler_horde', ['wandering_dead']).inst;
    check('permanent passive drops duration identity without editing the base', !instanceBaseTags(passive).includes('duration') && SKILLS.shambler_horde.tags.includes('duration'));
  }
  {
    const { w, inst } = setup('summon_skeleton_archer', ['unstrung_sorcery', 'volatile_souls', 'ember_souls', 'rime_souls']);
    const before = JSON.stringify(instanceDelivery(inst));
    inst.treeNodes = ['unstrung_sorcery', 'volatile_souls', 'rime_souls', 'ember_souls'];
    check('element choices union independent of pick order', before === JSON.stringify(instanceDelivery(inst)));
    check('host elemental tags follow selected pool', instanceBaseTags(inst).includes('fire') && instanceBaseTags(inst).includes('cold') && !instanceBaseTags(inst).includes('lightning'));
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) { cast(w, inst); for (const a of crew(w, inst)) seen.add(a.defId!); }
    check('births roll both selected elements and no others', seen.size === 2 && seen.has('skeletal_pyromancer') && seen.has('skeletal_cryomancer'));
    check('transformed archers lose their arrow kit', crew(w, inst).every(a => !a.skills.some(s => s?.def.id === 'bone_arrow')));
    inst.sockets[0] = { def: SUPPORTS.resonance, level: 1 };
    check('attack-only supports cannot board the transformed mage kit', !supportFitsInstOrCrew(SUPPORTS.echoing_might, inst, w.summonCrewSkills(inst)));
    const saved = rebuildSkill({ skillId: inst.def.id, level: 20, rarity: 'common', sockets: [], treeNodes: inst.treeNodes });
    check('selected pool survives save rebuild', !!saved && JSON.stringify(instanceDelivery(saved)) === JSON.stringify(instanceDelivery(inst)));
  }
  {
    const { w, inst } = setup('summon_skeleton_archer', ['rattling_bows', 'rain_of_bones', 'drumming_rain']);
    inst.sockets[0] = { def: SUPPORTS.resonance, level: 1 };
    const gem = Object.values(SUPPORTS).find(s => s.requiresTags?.includes('projectile') && !s.excludeTags?.includes('attack'))!;
    const census = w.summonCrewSkills(inst);
    check('crew census includes taught Rain of Bones', Array.isArray(census) && census.some(s => s.id === 'skeletal_arrowfall'));
    check('projectile support can board archer kit through Resonance', supportFitsInstOrCrew(gem, inst, census));
    inst.sockets[1] = { def: gem, level: 1 };
    cast(w, inst); const archer = crew(w, inst)[0];
    const rain = archer.skills.find(s => s?.def.id === 'skeletal_arrowfall')!;
    check('native rain receives scoped cooldown investment', !!rain && skillCooldownSeconds(archer, rain) < 5.1);
    check('the accepted projectile support really forwards onto Rain of Bones', rain.sockets.some(s => s?.forwarded && s.def.id === gem.id));
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.pos = { x: archer.pos.x + 300, y: archer.pos.y }; foe.invulnerable = true; foe.sheet.setSource('stationary', [mod('moveSpeed', 'more', -1)]); w.actors.push(foe);
    let rains = 0; SIM_TAP.current = { onCast: (a, s) => { if (a === archer && s.def.id === 'skeletal_arrowfall') rains++; } };
    step(w, 10, true); SIM_TAP.current = null;
    check('archer AI actually casts its cooldown rain', rains > 0);
  }
  {
    const { w, p, inst } = setup('summon_bone_golem', ['osseous_might', 'great_bones', 'ossuary_commander']);
    const base = p.sheet.get('damage'); cast(w, inst); step(w, 0.5);
    const golem = crew(w, inst)[0];
    check('giant commander is one large golem with active aura', crew(w, inst).length === 1 && golem.radius > MONSTERS.bone_golem.radius && golem.activeAuras.has('ossuary_command'));
    check('commander aura buffs the keeper', p.sheet.get('damage') > base);
    const auraRadius = golem.activeAuras.get('ossuary_command')!.radius;
    inst.sockets[0] = { def: SUPPORTS.resonance, level: 1 };
    inst.sockets[1] = { def: SUPPORTS.widening, level: 1 };
    w.resyncMinionSupports(inst);
    check('changing crew supports refreshes the living command aura', golem.activeAuras.get('ossuary_command')!.radius > auraRadius);
    w.pickTreeNode(inst.def.id, 'marrow_bruiser'); step(w, 9);
    check('tree mutation rebuilds a toggled contract', golem.dead && crew(w, inst).length === 1 && crew(w, inst)[0].skills.some(s => s?.def.id === 'marrow_sweep'));
  }
  {
    const { w, inst } = setup('summon_bone_golem', ['osseous_might', 'assembled_legion', 'bone_cohort']);
    cast(w, inst); step(w, 2);
    check('cohort creates three golems with paid reservation per slot', crew(w, inst).length === 3 && w.player.reservedMana >= 96);
  }
  {
    const { w, p, inst } = setup('summon_bone_golem', ['keepers_bulwark', 'close_guard', 'bone_stand']);
    const base = p.sheet.get('damageTaken'); cast(w, inst); step(w, 0.5);
    const golem = crew(w, inst)[0];
    check('Stand carries a live protective aura', !!golem.summonEscort && p.sheet.get('damageTaken') < base);
    step(w, 2, true);
    const parked = { ...golem.pos }; let heldPost = true;
    for (let i = 0; i < 720; i++) {
      step(w, 1 / 60, true);
      if (Math.hypot(golem.pos.x - parked.x, golem.pos.y - parked.y) > 1) heldPost = false;
    }
    check('a parked Stand does not repeatedly recall as though stuck', heldPost);
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.pos = { x: p.pos.x + 400, y: p.pos.y }; foe.invulnerable = true; foe.sheet.setSource('stationary', [mod('moveSpeed', 'more', -1)]); w.actors.push(foe);
    step(w, 5, true);
    check('Stand holds keeper rather than pursuing distant enemies', Math.hypot(golem.pos.x - p.pos.x, golem.pos.y - p.pos.y) < 90);
    foe.pos = { x: p.pos.x + 100, y: p.pos.y }; let lashes = 0;
    SIM_TAP.current = { onCast: a => { if (a === golem) lashes++; } }; step(w, 4, true); SIM_TAP.current = null;
    check('Stand lashes out through ordinary casts', lashes > 0);
    w.fonts.push({ pos: { ...p.pos } }); w.meta.abilityEssences.ability4 = 999; p.casting = null;
    w.fontResetTree(inst.def.id); step(w, 1.5);
    check('respec removes old protective aura and escort', golem.dead && !crew(w, inst).some(a => a.summonEscort) && Math.abs(p.sheet.get('damageTaken') - base) < 0.001);
  }
  for (const [root, path, leaf] of [['lich_ascendant', 'fused_intellect', 'winter_crown'], ['grave_academy', 'winter_curriculum', 'plague_curriculum']]) {
    const { w, inst } = setup('summon_skeleton_mage', [root, path, leaf]); cast(w, inst);
    const bodies = crew(w, inst), lich = root === 'lich_ascendant';
    check(`${root}: casts intended count and form`, bodies.length === (lich ? 1 : 2) && bodies.every(a => lich === (a.defId === 'ossuary_lich')));
    check(`${root}: taught spells survive birth`, bodies.every(a => a.skills.some(s => s?.def.id === 'skeletal_cinder_rain') && a.skills.some(s => s?.def.id === 'skeletal_winter_ring')));
    const d = instanceDelivery(inst);
    const known = summonCrewOf(d.type === 'summon' ? d : undefined, id => MONSTERS[id], id => SKILLS[id]);
    check(`${root}: socket census agrees with actual spell kit`, Array.isArray(known) && bodies.every(a => a.skills.every(s => !s || known.some(k => k.id === s.def.id))));
  }
} finally { restore(); SIM_TAP.current = null; }
console.log(failed ? `${failed} CHECK(S) FAILED` : 'ALL CHECKS PASSED'); process.exit(failed ? 2 : 0);
