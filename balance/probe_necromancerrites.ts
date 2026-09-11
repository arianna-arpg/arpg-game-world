import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { NECROMANCER_RITES } from '../src/data/necromancerRites';
import { makeSkillInstance, instanceDelivery, instanceBaseTags, instanceMods, skillContextTags, treeNodeRefusal, hostSockets, instanceCurseField, grantedTags } from '../src/engine/skills';
import type { World } from '../src/engine/world';
import type { SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { SIM_TAP } from '../src/engine/tap';
import { rebuildSkill } from '../src/meta/character';
import { dist } from '../src/core/math';
let failed=0;
function check(name:string,ok:boolean){console.log((ok?'PASS ':'FAIL ')+name);if(!ok)failed++;}
function setup(id:string,nodes:string[]=[]){
 const w=makeSimWorld('necromancer',0x717e),p=w.player;
 for(const attr of ['willpower','intelligence','strength'] as const)w.meta.baseAttrs[attr]=100;
 w.recalcPlayer();const inst=makeSkillInstance(SKILLS[id],20,3);w.meta.knownSkills.set(id,inst);p.skills.fill(null);p.skills[0]=inst;
 for(const n of nodes)w.pickTreeNode(id,n);
 p.sheet.setSource('rig',[mod('mana','flat',10000),mod('accuracy','flat',100000)]);p.fillResources();return{w,p,inst};
}
function step(w:World,t:number){for(let i=0;i<Math.ceil(t*60);i++)w.update(1/60);}
function cast(w:World,inst:SkillInstance,aim={x:w.player.pos.x+100,y:w.player.pos.y}){
 const p=w.player;p.casting=null;p.useLock=0;p.cooldowns.clear();p.mana=p.availableMaxMana();const ok=w.useSkill(p,inst,aim,true);
 for(let i=0;i<240&&p.casting;i++)step(w,1/60);step(w,1/60);return ok;
}
function foe(w:World,range=80){const a=w.createMonster('zombie',1,'enemy');a.skills=[];a.pos={x:w.player.pos.x+range,y:w.player.pos.y};a.sheet.setSource('rig',[mod('life','flat',100000),mod('moveSpeed','more',-1)]);a.fillResources();w.actors.push(a);return a;}
const zones=(w:World,inst:SkillInstance)=>w.zones.filter(z=>z.inst===inst&&z.caster===w.player);
const shots=(w:World,inst:SkillInstance)=>w.projectiles.filter(p=>p.inst===inst&&p.caster===w.player);
const restore=seedGlobalRandom(0x717e);
try{
 for(const [id,tree]of Object.entries(NECROMANCER_RITES)){
  const ns=tree.nodes!,roots=ns.filter(n=>n.excludes?.length),neutral=ns.find(n=>!n.links?.length&&!n.excludes?.length)!;
  const plain=setup(id),passive=setup(id,Array(4).fill(neutral.id));
  check(id+': full neutral investment preserves base form',passive.inst.treeNodes?.length===4&&instanceDelivery(passive.inst)===plain.inst.def.delivery&&instanceBaseTags(passive.inst).join()===instanceBaseTags(plain.inst).join());
  const m=neutral.mods![0];check(id+': neutral ranks strengthen the underlying skill',passive.p.sheet.get(m.stat,skillContextTags(passive.inst),instanceMods(passive.inst))>plain.p.sheet.get(m.stat,skillContextTags(plain.inst),instanceMods(plain.inst)));
  check(id+': binary tree with exactly two exclusive trunks',ns.length===15&&roots.length===2&&roots.every(r=>ns.filter(n=>n.links?.includes(r.id)).length===2));
  for(const root of roots){const mids=ns.filter(n=>n.links?.includes(root.id));const mixed=setup(id,[root.id,...mids.map(n=>n.id),neutral.id]);check(id+'/'+root.id+': both forks mix with neutral while rival locks',mixed.inst.treeNodes?.length===4&&!!treeNodeRefusal(mixed.inst,root.excludes![0]));}
  for(const leaf of ns.filter(n=>n.links?.length&&!ns.some(other=>other.links?.includes(n.id)))){
   const mid=ns.find(n=>n.id===leaf.links![0])!,root=mid.links![0],s=setup(id,[root,mid.id,leaf.id]);const a=foe(s.w,id==='whirling_reap'?(root==='unbound_wheel'?180:45):80);
   check(id+'/'+leaf.id+': live cast applies its damage or curse',cast(s.w,s.inst)&&(()=>{step(s.w,1.5);return a.life<a.maxLife()||a.statuses.some(s=>s.id==='despair');})());
   const loaded=rebuildSkill({skillId:id,level:20,rarity:'common',sockets:[],treeNodes:s.inst.treeNodes});
   check(id+'/'+leaf.id+': allocation survives save repair',loaded?.treeNodes?.join()===s.inst.treeNodes?.join());
  }
 }
 {
  const {w,p,inst}=setup('poison_nova',['plague_lineage','deep_infection','parasitic_rot']);const a=foe(w);cast(w,inst);step(w,0.5);
  const poison=a.statuses.find(s=>s.id==='poison');check('plague poison carries its applier, propagation and leech',!!poison&&poison.casterId===p.id&&!!poison.propagates&&poison.leech===0.04);
  p.life=p.maxLife()/2;p.sheet.setSource('no_regen',[mod('lifeRegen','override',0)]);const life=p.life;step(w,1);check('parasitic poison heals its living applier',p.life>life);
  const next=foe(w,85);w.kill(a,false,p);step(w,0.05);check('death spreads attributable poison to a fresh carrier',next.statuses.some(s=>s.id==='poison'&&s.casterId===p.id&&s.propagates&&s.leech===0.04&&s.total===11));
 }
 {
  const {w,inst}=setup('poison_nova',['plague_lineage','erupting_blight','concentrated_culture']);const a=foe(w);const appliedDps:number[]=[];const apply=a.applyStatus.bind(a);a.applyStatus=(...args)=>{if(args[0]==='poison')appliedDps.push(args[1]);apply(...args);};cast(w,inst);const count=shots(w,inst).length;step(w,0.6);const poison=a.statuses.find(s=>s.id==='poison');
  check('concentrated nova trades eight bolts for a real rupture',count===16&&!!poison&&!!poison.rupture&&poison.rupture>0&&poison.ruptureType==='chaos');
  check('rupture banks the actual fixed poison clock',!!poison&&Math.abs(poison.rupture!-appliedDps.reduce((a,b)=>a+b,0)*11*0.35)<0.0001);
  const next=foe(w,85);w.kill(a,false,w.player);step(w,0.05);check('death rupture does not erase the plague propagation clause',next.statuses.some(s=>s.id==='poison'&&s.propagates&&s.casterId===w.player.id));
 }
 {
  const {w,inst}=setup('poison_nova',['returning_venom','swift_circulation','loose_fangs','perforating_venom']);const a=foe(w,130);let hits=0;SIM_TAP.current={onHit:(p,t,r)=>{if(p===w.player&&t===a&&r.total>0)hits++;}};
  cast(w,inst);check('return nova births 32 piercing returning bolts',shots(w,inst).length===32&&shots(w,inst).every(p=>p.returnMode>0&&p.pierce>=2));let returned=false;for(let i=0;i<240;i++){step(w,1/60);returned ||= shots(w,inst).some(p=>!!p.returnPhase);}SIM_TAP.current=null;
  check('return flight actually turns and lands hits',returned&&hits>=2);
  inst.sockets[0]={def:SUPPORTS.returning,level:1};w.recalcPlayer();check('tree and socket copies deduplicate the same return support',hostSockets(inst).filter(s=>s.def.id==='returning').length===1);
 }
 {
  const {w}=setup('despair');const applier=w.createMonster('skeleton_warrior',1,'player');w.actors.push(applier);const victim=foe(w,150);let credited=false;victim.applyStatus('despair',0,0.01,'sentinel',{rupture:victim.maxLife()*10,ruptureType:'chaos',casterId:applier.id});SIM_TAP.current={onDeath:(a,k)=>{if(a===victim)credited=k===applier;}};step(w,0.2);SIM_TAP.current=null;check('curse rupture kills retain a non-player applier',victim.dead&&credited);
 }
 for(const root of ['worn_grief','profane_ground']){
  const nodes=root==='worn_grief'?[root,'parting_sentence','brief_suffering']:[root,'sentence_of_ruin','inevitable_end'];const {w,p,inst}=setup('despair',nodes);const a=foe(w,90);const reserve=p.reservedMana;
  cast(w,inst,a.pos);step(w,0.8);check(root+': field repeatedly lays attributable curses',a.statuses.some(s=>s.id==='despair'&&s.casterId===p.id&&!!s.rupture)&&zones(w,inst).length===1);
  const whileInside=a.life;step(w,6);check(root+': renewal feeds a fixed fuse instead of delaying it forever',a.life<whileInside);
  if(root==='worn_grief'){
   check('worn grief reserves exactly one quarter of maximum mana',Math.abs(p.reservedMana-reserve-p.maxMana()*0.25)<0.01);
   w.teleportActor(p,{x:p.pos.x-250,y:p.pos.y});step(w,0.1);check('worn grief follows its moving caster',dist(zones(w,inst)[0].pos,p.pos)<1);
   cast(w,inst);check('second press releases haze and its reservation',zones(w,inst).length===0&&p.reservedMana===reserve);
  }else{const old=zones(w,inst)[0];cast(w,inst,{x:p.pos.x-200,y:p.pos.y});check('profane ground relocates its sole patch',zones(w,inst).length===1&&zones(w,inst)[0]!==old&&p.reservedMana===reserve);}
  const before=a.life;step(w,12);check(root+': abandoned curse expires into a damaging rupture',a.life<before&&!a.statuses.some(s=>s.id==='despair'));
  cast(w,inst);w.fonts.push({pos:{...p.pos}});w.meta.abilityEssences.ability4=999;const reset=w.fontResetTree(inst.def.id);
  check(root+': respec removes fields, reservations and derived mutator',reset&&zones(w,inst).length===0&&p.reservedMana===reserve&&!instanceCurseField(inst)&&!inst.grafts?.length);
 }
 {
  const {w,p,inst}=setup('reap',['grave_procession','long_procession','wide_mourning']);cast(w,inst);const z=zones(w,inst)[0];check('carried Reap remains a single-hit following crescent',!!z&&!!z.follow&&!!z.struck);
  w.teleportActor(p,{x:p.pos.x,y:p.pos.y+180});step(w,0.1);check('the carried crescent stays with the moving reaper',!!z&&dist(z.pos,p.pos)<15);
  w.pickTreeNode('reap','practiced_reaping');check('further investment retires the old snapshotted crescent',zones(w,inst).length===0);
 }
 {
  const {w,inst}=setup('reap',['echoes_of_reaping','restless_harvest','certain_stroke']);let echoes=0;SIM_TAP.current={onCast:(_a,s)=>{if(s.def.id==='follow_sweep')echoes++;}};
  for(let i=0;i<20;i++){cast(w,inst);step(w,0.7);}SIM_TAP.current=null;check('echo route creates bounded real phantom sweeps',echoes>0&&echoes<=20);
 }
 {
  const {w,inst}=setup('whirling_reap',['unbound_wheel','far_harvest','broad_horizon']);const a=foe(w,180);let hits=0;SIM_TAP.current={onHit:(p,t,r)=>{if(p===w.player&&t===a&&r.total>0)hits++;}};
  cast(w,inst);step(w,0.3);check('unbound wheel emits six distinct traveling crescents',zones(w,inst).length===6&&zones(w,inst).every(z=>!!z.drift&&!!z.struck));step(w,1);SIM_TAP.current=null;check('unbound wheel reaches enemies beyond the base melee circle',hits>0);
  check('wave conversion supplies duration support identity',grantedTags(inst).includes('duration'));
 }
 {
  const {w,p,inst}=setup('whirling_reap',['bloodwheel','unbroken_turn','blood_paid']);const a=foe(w,40);p.life=p.maxLife()/2;const life=p.life;for(let i=0;i<8&&!a.statuses.some(s=>s.id==='bleed');i++){cast(w,inst);step(w,0.4);}
  check('bloodwheel keeps close strokes, bleeds and restores life',zones(w,inst).length===0&&a.statuses.some(s=>s.id==='bleed')&&p.life>life);
 }
}finally{restore();SIM_TAP.current=null;}
console.log(failed?failed+' CHECK(S) FAILED':'ALL CHECKS PASSED');process.exit(failed?2:0);
