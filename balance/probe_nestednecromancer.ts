import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { MONSTERS } from '../src/data/monsters';
import { NECROMANCER_TREES } from '../src/data/necromancerTrees';
import { makeSkillInstance, instanceDelivery, instanceMods, instanceBaseTags, treeNodeRefusal,
  skillContextTags, supportFitsInstOrCrew, skillCooldownSeconds, type SkillInstance } from '../src/engine/skills';
import { treeGraph } from '../src/engine/skilltree';
import { replenishShape } from '../src/engine/replenishment';
import { updateAI } from '../src/engine/ai';
import { mod, STAT_DEFS } from '../src/engine/stats';
import { SIM_TAP } from '../src/engine/tap';
import { rebuildSkill } from '../src/meta/character';
import { previewSkill } from '../src/engine/skillPreview';
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
    const { w, inst } = setup('summon_bone_golem', ['osseous_might', 'drilled_bones', 'bone_cohort']);
    cast(w, inst); step(w, 2);
    check('cohort creates two golems with paid reservation per slot', crew(w, inst).length === 2 && w.player.reservedMana >= 64);
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

  {
    const base = setup('summon_skeleton_archer'), sorcery = setup('summon_skeleton_archer', ['unstrung_sorcery']);
    const baseD = instanceDelivery(base.inst), mageD = instanceDelivery(sorcery.inst);
    check('Sorcery preserves base population', baseD.type === 'summon' && mageD.type === 'summon' && baseD.count === mageD.count && baseD.maxActive === mageD.maxActive);
    const more = setup('summon_skeleton_archer', ['unstrung_sorcery', 'volatile_souls']);
    const md = instanceDelivery(more.inst);
    check('Volatile Souls adds exactly one cast body and one slot', md.type === 'summon' && baseD.type === 'summon'
      && replenishShape(more.p, more.inst, md).count === baseD.count + 1 && replenishShape(more.p, more.inst, md).cap === baseD.maxActive + 1);
    const { w, inst } = setup('summon_skeleton_archer', ['rattling_bows', 'rain_of_bones', 'cruel_rain', 'drumming_rain']);
    cast(w, inst); const archer = crew(w, inst)[0], arrow = archer.skills.find(k => k?.def.id === 'bone_arrow')!;
    const before = w.projectiles.length;
    w.useSkill(archer, arrow, {x: archer.pos.x + 350, y: archer.pos.y}, true);
    for(let i=0;i<180 && archer.casting;i++) w.update(1/60);
    check('Forked Quivers emits two real baseline arrows', w.projectiles.filter(p => p.caster === archer).length === 2 && w.projectiles.length >= before + 2);
    const rain = archer.skills.find(k => k?.def.id === 'skeletal_arrowfall')!;
    check('merged rain owns damage and actual bleed chance', archer.sheet.get('damage', skillContextTags(rain), instanceMods(rain)) > 1.4
      && archer.sheet.get('apply_bleed', skillContextTags(rain), instanceMods(rain)) >= 0.3);
  }
  {
    const { w, inst } = setup('summon_bone_golem', ['osseous_might', 'drilled_bones', 'great_bones', 'marrow_bruiser']);
    cast(w, inst); const a = crew(w, inst)[0], sweep = a.skills.find(k => k?.def.id === 'marrow_sweep')!;
    check('Drilled Bones can accelerate Marrow Bruiser within four points', inst.treeNodes?.length === 4 && skillCooldownSeconds(a, sweep) / a.sheet.get('cooldownRecovery') < 4);
  }
  {
    const { w, p, inst } = setup('summon_bone_golem', ['osseous_might', 'drilled_bones', 'assembled_legion']);
    inst.sockets[0] = { def: SUPPORTS.resonance, level: 1 };
    inst.sockets[1] = { def: SUPPORTS.widening, level: 1 };
    cast(w, inst); const parent = crew(w, inst)[0], reserve = p.reservedMana;
    w.kill(parent, false, p);
    const heirs = crew(w, inst);
    check('golem death leaves two owned temporary heirs', heirs.length === 2 && heirs.every(a => a.summonOffspring && a.summonInst === inst && Math.abs(a.lifespan - 8 * p.sheet.get('effectDuration',skillContextTags(inst),instanceMods(inst))) < 1e-6));
    check('heirs are smaller and weaker with no reservation', heirs.every(a => a.radius < parent.radius * 0.6 && a.maxLife() < parent.maxLife() * 0.4 && a.manaReserved === 0) && p.reservedMana === reserve);
    check('heirs keep support forwarding and death resources', heirs.some(a => a.skills.some(k => k?.sockets.some(g => g?.forwarded))) && heirs.every(a => a.owner === p && a.sourceSkillId === inst.def.id));
    const queued = w.pendingRespawns.length;
    w.kill(heirs[0], false, p);
    check('lesser golem death neither divides nor queues a contract', crew(w, inst).length === 1 && w.pendingRespawns.length === queued);
    step(w, Math.max(9, heirs[1].lifespan + 0.1));
    check('temporary heirs expire while the parent contract returns', crew(w, inst).length === 1 && !crew(w, inst)[0].summonOffspring && p.reservedMana === reserve);
    // Exercise repeated deaths with long-lived test heirs to isolate cap behavior.
    for(let i=0;i<5;i++) {
      const adult=crew(w,inst).find(a=>!a.summonOffspring)!;
      if(!adult) break;
      w.kill(adult,false,p);
      for(const heir of crew(w,inst)) if(heir.summonOffspring) heir.lifespan=100;
      step(w,9);
    }
    check('repeated divisions respect six-heir cap and retain parent slot', crew(w,inst).filter(a=>a.summonOffspring).length === 6 && crew(w,inst).some(a=>!a.summonOffspring));
    cast(w,inst);
    check('toggling off retires adults and heirs without division', crew(w,inst).length === 0 && p.reservedMana === 0);
  }
  {
    const small = setup('summon_bone_golem', ['keepers_bulwark','close_guard','bone_stand','warding_reach']);
    const big = setup('summon_bone_golem', ['keepers_bulwark','close_guard','bone_stand','warding_reach']);
    big.p.sheet.setSource('size-thorns', [mod('minionSize','increased',0.8),mod('thorns','flat',40)]);
    cast(small.w,small.inst); cast(big.w,big.inst);
    const a=crew(small.w,small.inst)[0], b=crew(big.w,big.inst)[0];
    const sw=b.skills.find(k=>k?.def.id==='warding_sweep')!;
    check('size grows shell capacity and footprint without closing rear gap', b.shellGuard!.max > a.shellGuard!.max * 1.6 && b.radius > a.radius * 1.6 && b.shellGuard!.arcDeg === 300);
    check('size grows Warding and Stand strike reach', b.sheet.get('aoeRadius',skillContextTags(sw),instanceMods(sw)) > a.sheet.get('aoeRadius',skillContextTags(sw),instanceMods(sw)) * 1.6);
    check('Close Guard inherits half keeper Thorns plus splinters', b.sheet.get('thorns') === 28 && a.sheet.get('thorns') === 8);
    const foe=big.w.createMonster('zombie',1,'enemy'); foe.pos={x:big.p.pos.x+250,y:big.p.pos.y};
    foe.sheet.setSource('probe',[mod('life','flat',10000),mod('moveSpeed','more',-1),mod('critChance','more',-1)]);foe.fillResources(); big.w.actors.push(foe);
    const hit=makeSkillInstance({...SKILLS.skeletal_grave_thunder,id:'thorns_probe',cooldown:0,useTime:0,delivery:{type:'nova',radius:600}},1,0);
    big.p.facing=0; const life=foe.life;
    big.w.useSkill(foe,hit,big.p.pos); check('absorbed hit retaliates from attached shell', foe.life < life);
    foe.pos={x:big.p.pos.x-100,y:big.p.pos.y}; const rearLife=foe.life;
    foe.useLock=0;big.w.useSkill(foe,hit,big.p.pos); check('rear-gap hit only receives keeper Thorns', Math.abs(rearLife - foe.life - 40 * foe.sheet.get('damageTaken')) < 1e-6);
    foe.pos={x:big.p.pos.x+250,y:big.p.pos.y};
    // Only Warding available: AI must recognize size-expanded reach beyond its base 150.
    b.skills=[sw]; let casts=0;SIM_TAP.current={onCast:(actor,skill)=>{if(actor===b&&skill.def.id==='warding_sweep')casts++;}};
    for(let i=0;i<180 && casts===0;i++){updateAI(b,big.w,1/60);big.w.update(1/60);}SIM_TAP.current=null;
    check('Warding AI casts at expanded reach',casts>0);
    check('Warding applies bleed and taunts toward shell keeper',foe.statuses.some(s=>s.id==='bleed') && foe.statuses.some(s=>s.id==='taunted' && s.casterId===big.p.id));
    check('Warding applies an outward shove owned by the minion',!!foe.push && foe.push.vx>0 && foe.push.caster===b && foe.push.inst===sw);
    foe.statuses=[];foe.life=1;foe.pos={x:big.p.pos.x+100,y:big.p.pos.y};big.p.facing=0;
    let credited=false;SIM_TAP.current={onDeath:(dead,killer)=>{if(dead===foe)credited=killer===b;}};
    foe.casting=null;foe.useLock=0;foe.cooldowns.clear();big.w.useSkill(foe,hit,big.p.pos);SIM_TAP.current=null;
    check('shell splinter kill credits the retaliating minion',foe.dead && credited);
  }
  {
    const {w,inst}=setup('summon_skeleton_mage',['lich_ascendant','fused_intellect','winter_crown','storm_crown']);cast(w,inst);
    const lich=crew(w,inst)[0], ids=lich.skills.flatMap(k=>k?[k.def.id]:[]);
    check('Lich uses Fireball with devastating learned repertoire',crew(w,inst).length===1 && lich.defId==='ossuary_lich' && ['skeletal_lich_fireball','skeletal_cinder_rain','skeletal_winter_ring','skeletal_grave_thunder'].every(id=>ids.includes(id)) && !ids.some(id=>id.endsWith('_bolt')));
    const crown=setup('summon_skeleton_mage',['lich_ascendant','deathless_regent','court_of_one','plague_crown']);cast(crown.w,crown.inst);
    check('regent keeps aura and empowered plague ring',crew(crown.w,crown.inst)[0].activeAuras.has('ossuary_command') && crew(crown.w,crown.inst)[0].skills.some(k=>k?.def.id==='skeletal_plague_ring'));
  }
  for (const [mid, leaf, form, art] of [
    ['winter_curriculum','deep_winter','skeletal_cryomancer','skeletal_greater_ice_spear'],
    ['winter_curriculum','plague_curriculum','skeletal_venomancer','skeletal_essence_drain'],
    ['storm_curriculum','rolling_thunder','skeletal_stormcaller','skeletal_chain_lightning'],
    ['storm_curriculum','expanded_faculty','skeletal_pyromancer','skeletal_ignite'],
  ]) {
    const {w,inst}=setup('summon_skeleton_mage',['grave_academy',mid,leaf]);
    const seen=new Set<string>();let caster: ReturnType<typeof crew>[number] | undefined;
    for(let i=0;i<16;i++) {cast(w,inst);for(const a of crew(w,inst)){
      seen.add(a.defId!);
      check(form+': lesson only reaches its own element',a.skills.some(k=>k?.def.id===art)===(a.defId===form));
    }caster=crew(w,inst).find(a=>a.defId===form);if(caster&&seen.size===4)break;}
    check(form+': all four schools remain available',seen.size===4 && !!caster);
    const known=w.summonCrewSkills(inst);
    check(form+': support census includes exact replacement and lesson',Array.isArray(known) && known.some(k=>k.id===art)
      && !known.some(k=>k.id==='skeletal_cinder_rain'||k.id==='skeletal_winter_ring'||k.id==='skeletal_plague_ring')
      && (form!=='skeletal_cryomancer' || !known.some(k=>k.id==='skeletal_ice_spear'||k.id==='skeletal_cold_bolt')));
    if(caster){
      const foe=w.createMonster('zombie',1,'enemy');foe.pos={x:caster.pos.x+300,y:caster.pos.y};foe.skills=[];foe.sheet.setSource('still',[mod('moveSpeed','more',-1),mod('life','flat',100000)]);foe.fillResources();w.actors.push(foe);
      let casts=0,hits=0;SIM_TAP.current={onCast:(a,k)=>{if(a===caster&&k.def.id===art)casts++;},onHit:(a,target,result,packet)=>{if(a===caster&&target===foe&&result.total>0&&packet.sourceName===SKILLS[art].name)hits++;}};step(w,12,true);SIM_TAP.current=null;
      check(form+': AI casts and lands its matching lesson',casts>0 && hits>0);
    }
    if(form==='skeletal_cryomancer') {
      const preview=JSON.stringify(previewSkill(w.player,inst));
      check('cryomancer preview lists the final spear without the replaced lesson',preview.includes('Greater Skeletal Ice Spear') && !preview.includes('"Skeletal Ice Spear"'));
    }
    const loaded=rebuildSkill({skillId:inst.def.id,level:20,rarity:'common',sockets:[],treeNodes:inst.treeNodes});
    check(form+': lessons survive save repair',loaded?.treeNodes?.join()===inst.treeNodes?.join());
  }

} finally { restore(); SIM_TAP.current = null; }
console.log(failed ? `${failed} CHECK(S) FAILED` : 'ALL CHECKS PASSED'); process.exit(failed ? 2 : 0);
