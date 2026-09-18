import {bootSimEngine,makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {PASSIVE_NODES as N,PASSIVE_ADJACENCY as A} from '../src/data/passives';
import {PASSIVE_SPECIALIZATIONS as S,SPECIALIZATION_PROCS as PROCS,SPECIALIZATION_BANDS} from '../src/data/passiveSpecializations';
import {MINION_FAMILIES} from '../src/data/minionFamilies';
import {MONSTERS} from '../src/data/monsters';
import {SKILLS} from '../src/data/skills';
import {SUPPORTS} from '../src/data/supports';
import {auditPassiveRoutes,passiveWalkingGraph} from '../src/data/passiveTopology';
import {validatePassiveLayout} from '../src/data/validatePassiveLayout';
import {STAT_DEFS,CONDITION_IDS,StatSheet,mod,type SkillTag} from '../src/engine/stats';
import {VICTIM_CONDITIONS,victimConditionKnown,victimTags} from '../src/engine/victim';
import {skillContextTags,castScopeTag,makeSkillInstance,type SkillInstance} from '../src/engine/skills';
import {summonScopeTags} from '../src/engine/skillScopes';
import type {Actor} from '../src/engine/actor';
import {serializeCharacter,applySavedCharacter} from '../src/meta/character';
import {serializeSeatMeta,applySeatMeta} from '../src/net/snapshot';
let checks=0,failures=0;
function check(name:string,ok:boolean,detail=''){checks++;if(!ok)failures++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail?' — '+detail:''}`);}
const near=(a:number,b:number)=>Math.abs(a-b)<1e-6;
seedGlobalRandom(1234);bootSimEngine();
const added=Object.values(N).filter(n=>n.id.startsWith('spec_')),caps=added.filter(n=>n.kind!=='small');
check('25 specific schools add 75 payoffs and 225 useful smalls',S.length===25&&caps.length===75&&added.length===300&&added.filter(n=>n.kind==='small').every(n=>!!n.mods?.length));
check('specializations include consequential keystones',caps.filter(n=>n.kind==='keystone').length===11);
check('no passive grafts, menus or unstable authoring metadata',added.every(n=>!n.graft&&!n.choice&&!('keystone' in n)));
check('every modifier and scope is registered',added.every(n=>n.mods?.every(m=>STAT_DEFS[m.stat]&&(!m.when||CONDITION_IDS.includes(m.when))&&(m.tags??[]).every(t=>!t.startsWith('vs:')||victimConditionKnown(t.slice(3))))));
check('all family members exist',Object.values(MINION_FAMILIES).flat().every(id=>!!MONSTERS[id]));
check('explicit editor rows match the authored payloads',S.every(s=>s.powers.every(p=>{
  const n=N[`spec_${s.id}_${p.id}`];return n&&JSON.stringify(n.mods)===JSON.stringify(p.mods)&&n.description===p.description&&n.kind===(p.keystone?'keystone':'notable');
})));
const geo:string[]=[];validatePassiveLayout(s=>geo.push(s));check('complete layout has no collisions, missing links or long corridors',!geo.length,geo.slice(0,5).join('; '));
for(const menus of [false,true]){const audit=auditPassiveRoutes(N,menus);check(`fork within two allocations with menus ${menus}`,!audit.corridors.length&&!audit.unreachable.length);}
const prior=passiveWalkingGraph(Object.fromEntries(Object.entries(N).filter(([id])=>!id.startsWith('spec_'))));
function distance(a:string,b:string){const q=[a],depth:Record<string,number>={[a]:0};for(let i=0;i<q.length;i++){if(q[i]===b)return depth[b];for(const id of prior[q[i]])if(depth[id]===undefined){depth[id]=depth[q[i]]+1;q.push(id);}}return Infinity;}
const sim=makeSimWorld('warrior',1234),owner=sim.player;
const radii={start:13,small:9,notable:14,keystone:17,attr:11,vocation:15,choice:15};
const occupied=Object.values(N).filter(n=>!n.realm),obscured:string[]=[];
for(const n of added)for(const id of A[n.id]){const b=N[id],dx=b.x-n.x,dy=b.y-n.y,sq=dx*dx+dy*dy;for(const o of occupied){if(o.id===n.id||o.id===id)continue;const t=Math.max(0,Math.min(1,((o.x-n.x)*dx+(o.y-n.y)*dy)/(sq||1)));if(Math.hypot(o.x-n.x-t*dx,o.y-n.y-t*dy)<radii[o.kind]+2)obscured.push(`${n.id}/${id}/${o.id}`);}}
check('new edges never obscure another node disc',!obscured.length,obscured.slice(0,3).join('; '));
for(const cap of caps){
  const entry=N[cap.id+'_entry'];
  check(`${cap.name}: useful crossing without bypass`,entry.links.length===2&&distance(...entry.links as [string,string])>2&&A[cap.id].length===2&&A[cap.id].every(id=>id===cap.id+'_a'||id===cap.id+'_b'));
  for(const anchor of entry.links)for(const feeder of ['_a','_b']){
    sim.meta.allocated=new Set(['str_start',anchor]);sim.meta.choices={};sim.meta.passivePoints=3;sim.recalcSeat(sim.localSeat);
    const locked=!sim.allocateNode(cap.id),enter=sim.allocateNode(entry.id)&&!sim.allocateNode(cap.id);
    const train=sim.allocateNode(cap.id+feeder),take=sim.allocateNode(cap.id);
    check(`${cap.name}: ${anchor}/${feeder} pays three allocations`,locked&&enter&&train&&take&&sim.meta.passivePoints===0);
  }
}
// Casting context survives tree variants and admitted support conversions.
const timed=makeSkillInstance(SKILLS.fireball),instant=makeSkillInstance({...SKILLS.fireball,id:'probe_instant',useTime:0}),channel=makeSkillInstance({...SKILLS.fireball,id:'probe_channel',castMode:'channel',channel:{interval:.4,move:'normal'}});
check('cast modes distinguish real commitment',castScopeTag(timed)==='cast:timed'&&castScopeTag(instant)==='cast:instant'&&castScopeTag(channel)==='cast:channel');
for(const [support,expected] of [['gathered_casting','cast:channel'],['overcharge','cast:held'],['guarded_casting','cast:instant']] as const){const i=makeSkillInstance(SKILLS.fireball);i.sockets[0]={def:SUPPORTS[support],level:1};check(`${support} changes the context`,castScopeTag(i)===expected,castScopeTag(i));}
const pooled=makeSkillInstance(SKILLS.summon_skeleton_archer);pooled.treeNodes=['unstrung_sorcery'];
check('mixed mage pool shares family but not individual body',skillContextTags(pooled).has('minion:skeleton')&&skillContextTags(pooled).has('minion:skeletal_mage')&&![...skillContextTags(pooled)].some(t=>t.startsWith('body:')));
check('mixed unrelated bodies cannot borrow family caps',!summonScopeTags(['skeleton_warrior','zombie']).includes('minion:skeleton'));
check('tree replacement changes family/variant context',(()=>{const i=makeSkillInstance(SKILLS.summon_skeleton);i.treeNodes=['grave_phalanx'];return skillContextTags(i).has('body:skeletal_sentinel')&&!skillContextTags(i).has('body:skeleton_warrior');})());
// Exact boundaries partition the entire plane without overlap or a missing seam.
const victim=sim.createMonster('zombie',1,'enemy');owner.pos={x:0,y:0};
for(const [d,expected] of [[0,'closeRing'],[119.999,'closeRing'],[120,'middleRing'],[299.999,'middleRing'],[300,'farRing'],[1000,'farRing']] as const){victim.pos={x:d,y:0};const hits=SPECIALIZATION_BANDS.filter(b=>VICTIM_CONDITIONS[b.id].test(victim,owner,{time:0}));check(`range ${d} belongs only to ${expected}`,hits.length===1&&hits[0].id===expected);}
// The owner's family bonuses reach actual bodies, without leaking into a
// sibling variant selected from the same summon pool.
for(const [family,bodies] of Object.entries(MINION_FAMILIES)){
  const summon=makeSkillInstance(SKILLS.summon_skeleton);
  owner.sheet.setSource('scope-fixture',[mod('minionDamage','increased',.25,[`minion:${family}`]),mod('minionLife','increased',.30,[`minion:${family}`]),mod('minionMoveSpeed','increased',.20,[`minion:${family}`])]);
  for(const id of bodies){const pet=sim.createMonster(id,1,'player',owner);const baseLife=pet.maxLife(),baseSpeed=pet.sheet.get('moveSpeed'),baseDamage=pet.sheet.get('damage');sim.bakeMinionOwnerStats(pet,owner,summon);check(`${id} inherits ${family} damage/life/movement`,near(pet.maxLife()/baseLife,1.30)&&near(pet.sheet.get('moveSpeed')/baseSpeed,1.20)&&near(pet.sheet.get('damage')/baseDamage,1.25));}
  const outsider=sim.createMonster('zombie',1,'player',owner),base=outsider.maxLife();sim.bakeMinionOwnerStats(outsider,owner,summon);check(`${family} does not leak into unrelated bodies`,near(outsider.maxLife(),base));
}
owner.sheet.setSource('scope-fixture',[mod('minionDamage','increased',.40,['body:skeletal_pyromancer'])]);
for(const id of ['skeletal_pyromancer','skeletal_cryomancer']){const pet=sim.createMonster(id,1,'player',owner),base=pet.sheet.get('damage');sim.bakeMinionOwnerStats(pet,owner,pooled);check(`${id} receives only its own variant bonus`,near(pet.sheet.get('damage')/base,id==='skeletal_pyromancer'?1.4:1));}
owner.sheet.removeSource('scope-fixture');
type Runtime={spawnMinion(a:Actor,i:SkillInstance):Actor|null;resolveHit(a:Actor,i:SkillInstance,t:Actor,mult?:number,depth?:number):void};
{
  const w=makeSimWorld('warrior',1234),p=w.player,rt=w as unknown as Runtime,i=makeSkillInstance(SKILLS.summon_skeleton);
  p.skills=[i];p.sheet.setSource('cap',[mod('minionMaxCount','flat',1,['minion:skeleton']),mod('mana','flat',1000)]);p.mana=p.maxMana();
  for(let n=0;n<6;n++)rt.spawnMinion(p,i);
  check('family limit grants a real fourth skeleton, evicting overflow',w.actors.filter(a=>a.owner===p&&!a.dead&&a.sourceSkillId===i.def.id).length===4);
  p.sheet.removeSource('cap');rt.spawnMinion(p,i);
  check('removing family limit restores replacement cap',w.actors.filter(a=>a.owner===p&&!a.dead&&a.sourceSkillId===i.def.id).length===3);
}
// Every relay refuses wrong contexts, observes its clock, and disappears on
// refund. Both derived-mode preparations are spent by a REAL resolved hit.
for(const proc of PROCS){
  const w=makeSimWorld('warrior',1234),p=w.player,node=caps.find(n=>n.mods?.some(m=>m.stat==='proc_'+proc.id))!;
  w.meta.allocated.add(node.id);w.recalcSeat(w.localSeat);
  const tag=proc.tags![0],source=tag==='cast:instant'?instant:tag==='cast:timed'?timed:makeSkillInstance(Object.values(SKILLS).find(s=>skillContextTags(s).has(tag))!);
  w.rollOwnProcs(p,'cast',{});check(`${proc.name} refuses missing context`,!p.buffs.has(proc.id));
  seedGlobalRandom(1234);w.rollOwnProcs(p,'cast',{inst:source,tags:skillContextTags(source)});check(`${proc.name} prepares on its actual scope`,p.buffs.has(proc.id));
  p.buffs.delete(proc.id);w.rollOwnProcs(p,'cast',{inst:source});check(`${proc.name} respects internal cooldown`,!p.buffs.has(proc.id));
  w.time=3;seedGlobalRandom(1234);w.rollOwnProcs(p,'cast',{inst:source,tags:skillContextTags(source)});
  if(proc.effect.type==='buff'){
    const to=proc.effect.buff.consumeOn!.tags![0];
    const blow=to==='cast:instant'?instant:to==='cast:timed'?timed:makeSkillInstance(Object.values(SKILLS).find(s=>skillContextTags(s).has(to)&&!!s.baseDamage)!);
    const t=w.createMonster('zombie',1,'enemy');t.brain=undefined;t.pos={x:p.pos.x+30,y:p.pos.y};t.sheet.setSource('fixture',[mod('life','override',100000),mod('evasion','override',0)]);t.life=t.maxLife();w.actors.push(t);
    p.sheet.setSource('fixture',[mod('accuracy','flat',1e6)]);(w as unknown as Runtime).resolveHit(p,blow,t);
    check(`${proc.name} is consumed by the matching real hit`,!p.buffs.has(proc.id));
  }
  w.time=6;w.meta.allocated.delete(node.id);w.recalcSeat(w.localSeat);w.rollOwnProcs(p,'cast',{inst:source});check(`${proc.name} stops after refund`,!p.buffs.has(proc.id));
}
// Scoped passives act in damage queries with live victim context and reverse.
{
  const w=makeSimWorld('warrior',1234),p=w.player,rt=w as unknown as Runtime;
  const i=makeSkillInstance({...SKILLS.fireball,id:'scope_hit',tags:['spell','aoe'],baseDamage:{physical:[100,100]},effects:[{type:'damage'}]});
  p.sheet.setSource('fixture',[mod('critChance','override',0),mod('accuracy','flat',1e6)]);
  const hit=(range:number,allocated:boolean)=>{
    if(allocated)w.meta.allocated.add('spec_middle_focus');else w.meta.allocated.delete('spec_middle_focus');w.recalcSeat(w.localSeat);
    const t=w.createMonster('zombie',1,'enemy');t.brain=undefined;t.pos={x:p.pos.x+range,y:p.pos.y};t.sheet.setSource('fixture',[mod('life','override',100000),mod('armor','override',0),mod('evasion','override',0)]);t.life=t.maxLife();w.actors.push(t);
    const before=t.life;seedGlobalRandom(1234);rt.resolveHit(p,i,t);return before-t.life;
  };
  for(const d of [119,120,299,300]){const base=hit(d,false),boosted=hit(d,true);check(`real area hit respects distance ${d}`,base>0&&near(boosted/base,d>=120&&d<300?1.25:1));}
  w.meta.allocated.add('spec_timed_long_recital');w.recalcSeat(w.localSeat);
  const duration=p.skillUseTime(i);w.meta.allocated.delete('spec_timed_long_recital');w.recalcSeat(w.localSeat);
  check('Long Recital charges its actual slower-cast price',near(duration/p.skillUseTime(i),1.25));
}
for(const distance of [60,200,400]){victim.pos={x:distance,y:0};const tags=skillContextTags(timed,victimTags(victim,owner,{time:0}));const sheet=new StatSheet();sheet.setSource('focus',N.spec_middle_focus.mods!);check(`middle focus damage at ${distance}`,near(sheet.get('damage',new Set([...tags,'aoe'])),distance===200?1.25:1));check(`radius trade is independent of victim at ${distance}`,near(sheet.get('aoeRadius'),.8));}
for(const n of caps)for(const m of n.mods??[])if(m.gaugeAt!==undefined){const sheet=new StatSheet(),tags=new Set<SkillTag>(m.tags??[]);sheet.setSource('base',[mod('armor','flat',20)]);sheet.setSource('node',[m]);const before=sheet.get(m.stat,tags);sheet.setGauges([[m.gauge!,m.gaugeAt]]);const active=sheet.get(m.stat,tags);sheet.setGauges([[m.gauge!,0]]);check(`${n.name} threshold resets`,active!==before&&near(sheet.get(m.stat,tags),before));}
{
  const w=makeSimWorld('warrior',1234);for(const cap of caps)w.meta.allocated.add(cap.id);w.recalcSeat(w.localSeat);
  const saved=serializeCharacter(w),copy=makeSimWorld('warrior',1234);applySavedCharacter(copy,saved);copy.recalcSeat(copy.localSeat);
  check('all specialization ids survive saves',caps.every(n=>copy.meta.allocated.has(n.id)));
  const wire=serializeSeatMeta(w.localSeat);applySeatMeta(copy,copy.localSeat,wire);check('all specialization ids survive co-op metadata',caps.every(n=>copy.meta.allocated.has(n.id)));
}
console.log(`${checks} checks, ${failures} failures`);if(failures)process.exitCode=1;
