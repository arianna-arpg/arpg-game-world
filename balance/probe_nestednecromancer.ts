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
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
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
    const passive = nodes.find(n => !n.links?.length && !n.excludes?.length)!;
    const plain = setup(id), invested = setup(id, Array(4).fill(passive.id));
    check(id + ': four passive ranks retain the base delivery and tags', invested.inst.treeNodes?.length === 4
      && instanceDelivery(invested.inst) === invested.inst.def.delivery
      && instanceBaseTags(invested.inst).join() === instanceBaseTags(plain.inst).join());
    const m = passive.mods![0];
    check(id + ': passive ranks actually strengthen the skill', invested.p.sheet.get(m.stat, skillContextTags(invested.inst), instanceMods(invested.inst))
      > plain.p.sheet.get(m.stat, skillContextTags(plain.inst), instanceMods(plain.inst)));
    const loaded = rebuildSkill({ skillId: id, level: 20, rarity: 'common', sockets: [], treeNodes: invested.inst.treeNodes });
    check(id + ': four passive ranks survive saving', loaded?.treeNodes?.length === 4);
    const mix = setup(id, [passive.id, passive.id, trunks[0].id, nodes.find(n => n.links?.includes(trunks[0].id))!.id]);
    check(id + ': passive ranks freely mix with a trunk and branch', mix.inst.treeNodes?.length === 4);
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
    cast(w, inst); step(w, 0.5);
    const golem = crew(w, inst)[0], shell = golem.shellGuard!;
    check('Stand is an attached shell with a separate absorption pool', !!golem.summonShell && shell.max > 0 && !golem.activeAuras.has('ossuary_aegis'));
    const foe = w.createMonster('zombie', 1, 'enemy');
    foe.pos = { x: p.pos.x + 400, y: p.pos.y }; foe.invulnerable = true;
    foe.sheet.setSource('stationary', [mod('moveSpeed', 'more', -1), mod('critChance', 'more', -1)]); w.actors.push(foe);
    p.facing = 0;
    const hit = makeSkillInstance({ ...SKILLS.skeletal_grave_thunder, id: 'probe_shell_hit',
      manaCost: 0, cooldown: 0, useTime: 0, tags: ['spell', 'aoe', 'physical'], baseDamage: { physical: [20, 20] },
      delivery: { type: 'nova', radius: 600 } }, 1, 0);
    const strike = () => { foe.casting = null; foe.useLock = 0; foe.cooldowns.clear(); w.useSkill(foe, hit, p.pos); };
    const life = p.life, pool = shell.pool;
    strike(); check('front hit consumes the shell instead of keeper life', shell.pool < pool && p.life === life);
    foe.pos = { x: p.pos.x, y: p.pos.y + 100 }; const sidePool = shell.pool;
    strike(); check('shell covers side angles too', shell.pool < sidePool && p.life === life);
    foe.pos = { x: p.pos.x - 100, y: p.pos.y }; const rearPool = shell.pool;
    strike(); check('rear opening lets damage through without spending shell', p.life < life && shell.pool === rearPool);
    p.fillResources(); foe.pos = { x: p.pos.x + 100, y: p.pos.y };
    shell.pool = 1; const beforeBreak = p.life;
    strike(); check('breaking blow spends only remaining shell and leaks overflow', shell.broken && shell.pool === 0 && p.life < beforeBreak);
    let lashes = 0; SIM_TAP.current = { onCast: a => { if (a === golem) lashes++; } };
    step(w, 3, true);
    check('broken shell offers no strikes or premature regeneration', lashes === 0 && shell.broken && shell.pool === 0);
    step(w, 3.2, true);
    check('shell knits after its delay and reforms at its threshold', !shell.broken && shell.pool >= shell.max * 0.4);
    step(w, 6, true); SIM_TAP.current = null;
    check('reformed shell strikes nearby foes through its owned skill', lashes > 0 && golem.skills.some(k => k?.def.id === 'marrow_sweep'));
    const keeperPos = { ...p.pos }; step(w, 1, true);
    check('attached shell never shoulders its keeper', p.pos.x === keeperPos.x && p.pos.y === keeperPos.y && golem.pos.x === p.pos.x && golem.pos.y === p.pos.y);
    w.teleportActor(p, { x: p.pos.x + 200, y: p.pos.y + 150 }); step(w, 0.1);
    check('attached shell follows teleports exactly', golem.pos.x === p.pos.x && golem.pos.y === p.pos.y && golem.tier === p.tier);
    const snap = serializeSnapshot(w, 1), replica = makeSimWorld('necromancer', 0xb0ae);
    applySnapshot(replica, snap);
    const mirror = replica.actors.find(a => a.summonShell);
    check('co-op snapshot carries shell coverage and break state', !!mirror?.summonShell && mirror.shellGuard?.pool === shell.pool && mirror.shellGuard?.arcDeg === 300);
    // Other shell sources retain independent pools; the worn golem must never
    // replace an existing aura or remove it during a respec.
    p.shellGuard = { ...shell, max: 10, pool: 10, broken: false, side: 'all', fromAura: 'probe_other' };
    const other = p.shellGuard;
    w.fonts.push({ pos: { ...p.pos } }); w.meta.abilityEssences.ability4 = 999; p.casting = null;
    w.fontResetTree(inst.def.id); step(w, 0.2);
    check('respec retires attached body while preserving other shell sources', golem.dead && !crew(w, inst).some(a => a.summonShell) && p.shellGuard === other);
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
