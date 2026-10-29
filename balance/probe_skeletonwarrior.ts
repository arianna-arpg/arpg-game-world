import assert from 'node:assert/strict';
import { angleDiff } from '../src/core/math';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { SPELLSWORD_SCHOOLS } from '../src/data/skeletonWarriorTree';
import { instanceDelivery, instanceMetas, instanceMods, skillContextTags, makeSkillInstance, supportFitsInstOrCrew, type SkillInstance } from '../src/engine/skills';
import { summonCapacity } from '../src/engine/summonContracts';
import { previewSkill } from '../src/engine/skillPreview';
import { replenishShape } from '../src/engine/replenishment';
import { mod } from '../src/engine/stats';
import { applyHit, landLifeDamage } from '../src/engine/damage';
import { updateAI } from '../src/engine/ai';
import { SIM_TAP } from '../src/engine/tap';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
let checks=0;
function check(label:string,ok:unknown){assert.ok(ok,label);checks++;console.log('PASS '+label);}
function step(w:World,seconds:number,minds=false){for(let n=0;n<Math.ceil(seconds*60);n++){if(minds)for(const a of [...w.actors])if(a.owner)updateAI(a,w,1/60);w.update(1/60);}}
function rig(nodes:string[]){
 const w=makeSimWorld('necromancer',7318),p=w.player;w.devIgnoreSkillAttributes=true;
 const inst=makeSkillInstance(SKILLS.summon_skeleton,20,4);w.meta.knownSkills.set(inst.def.id,inst);p.skills.fill(null);p.skills[0]=inst;
 for(const node of nodes){w.pickTreeNode(inst.def.id,node);check('legal investment '+node,inst.treeNodes?.includes(node));}
 p.sheet.setSource('warrior-rig',[mod('mana','flat',100000),mod('critChance','override',0),mod('lifeRegen','override',0),mod('lifeRegenPct','override',0)]);p.fillResources();
 const aim={x:p.pos.x+160,y:p.pos.y};
 const bodies=()=>w.actors.filter(a=>!a.dead&&a.owner===p&&a.summonInst===inst);
 const raise=(n=1)=>{for(let i=0;i<n;i++)w.executeSkill(p,inst,aim);return bodies();};
 return {w,p,inst,aim,bodies,raise};
}
function exact(a:Actor){a.sheet.setSource('exact',[mod('accuracy','flat',100000),mod('critChance','override',0),mod('lifeRegen','override',0),mod('lifeRegenPct','override',0)]);}
function target(w:World,x:number,y:number){
 const a=w.createMonster('zombie',1,'enemy');a.pos={x,y};a.skills=[];a.brain=undefined;
 a.sheet.setSource('target',[mod('life','flat',1000000),mod('evasion','override',0),mod('armor','override',0),mod('blockChance','override',0),mod('lifeRegen','override',0),mod('moveSpeed','override',0)]);a.fillResources();w.actors.push(a);return a;
}
function quiet(a:Actor){a.cooldowns.clear();a.useLock=0;a.casting=null;a.fillResources();}
const restore=seedGlobalRandom(7318);
try{
 // Empty-ground Pursue and assembly walks must turn even without a combat target.
 for (const nodes of [['ossuary_duelists'], ['grave_phalanx', 'barbed_lattice', 'oath_banner']]) {
  const {w,p,inst,raise}=rig(nodes),a=raise()[0];
  a.pos={...p.pos};a.facing=a.facingPrev=0;
  const start={...a.pos};
  quiet(p);check('movement order is accepted',w.useMetaSkill(p,inst,{x:p.pos.x,y:p.pos.y-350}));
  step(w,.05,true);
  check('ordered infantry turns toward its actual travel without a foe',
    a.pos.y<start.y&&a.facing<0&&Math.abs(a.facing)<=a.turnSpeed*.05+.001);
 }
 // A committed lunge keeps its travel bearing while a target crosses behind.
 {
  const {w,p,raise}=rig(['ossuary_duelists','line_breakers']),a=raise()[0];
  a.pos={...p.pos};a.facing=a.facingPrev=-Math.PI/2;
  const foe=target(w,a.pos.x,a.pos.y-260),lunge=a.cohortState!.kit.find(s=>s.def.id==='court_bone_lunge')!;
  quiet(a);check('Duelist can launch its supported Bone Lunge',w.useSkill(a,lunge,foe.pos));
  for(let n=0;n<120&&!a.dash;n++)step(w,1/60);
  check('Bone Lunge has begun moving',!!a.dash);
  if(a.dash){
   const heading=a.dash.dir;
   foe.pos={x:a.pos.x+150,y:a.pos.y+100};a.facing=0;
   step(w,1/60);
   check('lunging Duelist retains committed travel heading',Math.abs(angleDiff(a.facing,heading))<.01);
  }
 }

 // Grouping uses the final modified capacity; unallocated trees retain odd caps.
 {
  const {p,inst,raise,bodies}=rig(['ossuary_duelists','line_breakers','dueling_pairs']);
  let d=instanceDelivery(inst);
  if(d.type!=='summon')throw Error('summon');
  for(const [extra,want] of [[-2,2],[-1,4],[0,4],[1,6],[2,6],[3,8],[4,8]]) {
   p.sheet.setSource('cap-tuning',[mod('minionMaxCount','flat',extra)]);
   check('pairs round final capacity upward: extra '+extra,summonCapacity(p,inst,d)===want);
  }
  p.sheet.setSource('cap-tuning',[mod('minionMaxCount','increased',.1)]);
  check('fractional caps group upward without prior nearest-body rounding',summonCapacity(p,inst,d)===6);
  p.sheet.setSource('cap-tuning',[mod('minionMaxCount','flat',1),mod('minionMaxCount','more',-.5)]);
  check('multiplicative cap reductions precede pair grouping',summonCapacity(p,inst,d)===4);
  p.sheet.setSource('cap-tuning',[mod('minionMaxCount','flat',1,['minion:skeleton'])]);
  check('family-scoped capacity participates in final grouping',summonCapacity(p,inst,d)===6);
  check('preview and replenishment report the real six-body limit',
   replenishShape(p,inst,d).cap===6&&previewSkill(p,inst).rows.find(row=>row.key==='minionCap')?.value==='6');
  check('pair cap investment never grants extra bodies per cast',raise().length===1);
  raise(5);
  check('odd cap investment produces six real active warriors',bodies().length===6);
  const oldIds=new Set(bodies().map(a=>a.id));raise();
  check('a seventh cast replaces exactly one at the even cap',bodies().length===6&&bodies().filter(a=>!oldIds.has(a.id)).length===1);
  inst.treeNodes=['ossuary_duelists','line_breakers'];
  d=instanceDelivery(inst);
  if(d.type!=='summon')throw Error('summon');
  p.sheet.setSource('cap-tuning',[mod('minionMaxCount','flat',2)]);
  check('removing pairs restores an ordinary odd capacity',d.capacityMultiple===undefined&&summonCapacity(p,inst,d)===5);
 }
 // A missing or distant partner never blocks ordinary engagement.
 for(const distant of [false,true]) {
  const {w,p,raise}=rig(['ossuary_duelists','line_breakers','dueling_pairs']);
  const bodies=raise(distant?2:1),a=bodies[0];
  a.pos={x:p.pos.x+160,y:p.pos.y};exact(a);
  if(distant){bodies[1].pos={x:p.pos.x-200,y:p.pos.y};bodies[1].sheet.setSource('fixed-partner',[mod('moveSpeed','override',0)]);}
  target(w,p.pos.x+280,p.pos.y);
  let lunges=0,cuts=0,pincers=0;
  SIM_TAP.current={onCast:(actor,s)=>{
   if(actor===a&&s.def.id==='court_bone_lunge')lunges++;
   if(actor===a&&s.def.id==='court_twin_cut')cuts++;
   if(s.def.id==='court_pincer_strike')pincers++;
  }};
  step(w,4,true);SIM_TAP.current=null;
  check(distant?'out-of-range pair retains solo engagement':'unpaired Duelist retains solo engagement',lunges>0&&cuts>0&&pincers===0);
 }

 {
  for(const nodes of [[],['grave_phalanx'],['ossuary_duelists'],['ossuary_duelists','flensing_edges','merciless_measure'],['ossuary_duelists','line_breakers','relentless_footwork']]){
   const {p,inst,raise}=rig(nodes),d=instanceDelivery(inst);assert.equal(d.type,'summon');if(d.type!=='summon')throw Error();
   check('base or trunk cap is three: '+nodes.join(','),summonCapacity(p,inst,d)===3);
   check('one body per summon',raise().length===1);check('fourth summon preserves the three-body cap',raise(3).length===3);
  }
 }
 {
  const {w,inst}=rig(['grave_phalanx','barbed_lattice','interlocking_shields','oath_banner']);
  check('Rally replaces the generic assault command',instanceMetas(inst)[0]?.skillId==='court_rally');
  w.pickTreeNode(inst.def.id,'veteran_watch');check('fifth point is refused',inst.treeNodes?.length===4&&!inst.treeNodes.includes('veteran_watch'));
 }
 {
  const {w,p,raise}=rig(['grave_phalanx','barbed_lattice','interlocking_shields']);
  p.sheet.setSource('thorns',[mod('thorns','flat',100)]);const [a,b]=raise(2);exact(a);exact(b);
  a.pos={...p.pos};b.pos={x:p.pos.x,y:p.pos.y+30};
  const foe=target(w,p.pos.x+25,p.pos.y),before=foe.life;w.cohortArts.update(0.01);
  check('linked sentinels gain neighbor block chance',a.sheet.get('blockChance')>=0.2);
  check('sentinels inherit configured caster thorns',a.sheet.get('thorns')>=35);
  check('shield contact deals real damage',foe.life<before);
  const contact=foe.life;w.cohortArts.update(0.01);check('contact does not repeat inside its per-enemy clock',foe.life===contact);
  b.pos.y+=500;w.cohortArts.update(0.01);check('shield link is removed when the neighbor leaves',a.sheet.get('blockChance')<0.2);
  const casts:string[]=[];SIM_TAP.current={onCast:(_a,s)=>casts.push(s.def.id)};w.cohortArts.block(a,foe);w.cohortArts.update(0);
  check('blocking fires a real reprisal ability',casts.includes('court_reprisal'));SIM_TAP.current=null;
 }
 {
  const {w,p,inst,raise,bodies}=rig(['grave_phalanx','veteran_watch','last_watch','relief_guard']);
  const [low,high]=raise(2);low.pos={x:p.pos.x+25,y:p.pos.y};high.pos={x:p.pos.x-25,y:p.pos.y};
  for(const a of [p,low,high]){exact(a);a.sheet.setSource('no-defense',[mod('armor','override',0),mod('blockChance','override',0),mod('evasion','override',0),mod('damageTaken','override',1)]);}
  low.life=low.maxLife()*.2;high.life=high.maxLife()*.8;
  const enemy=target(w,p.pos.x+80,p.pos.y);exact(enemy);const l=low.life,h=high.life,life=p.life;
  w.cohortArts.update(0);applyHit(enemy,p,{amounts:{physical:10},tags:new Set(['spell','physical']),crit:false,sourceName:'interception test'});
  check('lowest percentage-health sentinel takes the redirected wound',low.life<l&&high.life===h);
  check('the protected ally loses only its retained wound',Math.abs(life-p.life-7)<0.01);
  check('redirected hits cannot recurse through the other sentinel',high.life===h);
  check('interception earns a bounded relief reserve',low.cohortState!.reliefBank>0&&low.cohortState!.reliefBank<=low.maxLife()*.12);
  const before=low.life;landLifeDamage(p,1);check('damage over time does not become an intercepted hit',low.life===before);
  const beforePulse=p.life;w.cohortArts.update(0);check('earned Relief Pulse heals the nearby ally',p.life>beforePulse);
  check('Relief Guard owns a separately supported healing aura',low.activeAuras.has('court_relief_aura'));
  const ownerLife=p.life;step(w,1.1);check('quiet vigil heals without a fresh interception',p.life>ownerLife);
  w.kill(low,false,enemy);const ghost=bodies().find(a=>a.summonOffspring)!;
  check('combat death raises one mobile spectral heir',!!ghost&&ghost.sheet.get('moveSpeed')>0&&!!ghost.spectralVeil);
  check('spectral heir retains interception and Relief Guard',!!ghost.cohortState&&ghost.activeAuras.has('court_relief_aura'));
  check('spectral heir is outside the three-body adult cap',raise(2).filter(a=>!a.summonOffspring).length===3);
  const client=makeSimWorld('necromancer',7319);applySnapshot(client,serializeSnapshot(w,0));
  check('spectral overlay survives replication',client.actors.some(a=>a.defId===ghost.defId&&!!a.spectralVeil&&a.spectralVeil.alpha===ghost.spectralVeil?.alpha));
  w.kill(ghost,false,enemy);check('spectral heirs never create recursive heirs',bodies().every(a=>!a.summonOffspring));
  const survivor=bodies()[0];w.kill(survivor,true);check('silent dismissal cannot raise an heir',bodies().every(a=>!a.summonOffspring));
  w.cohortArts.clear(p,inst);check('tree cleanup removes all bodies and interception hooks',bodies().length===0&&!p.lifeDamageInterceptors?.has('cohort'));
 }
 {
  const {w,p,inst,raise}=rig(['grave_phalanx','barbed_lattice','oath_banner']);
  const [a,b]=raise(2);a.pos={x:p.pos.x+60,y:p.pos.y-20};b.pos={x:p.pos.x+60,y:p.pos.y+20};
  quiet(p);check('Rally is cast through the ordinary meta input',w.useMetaSkill(p,inst,{x:p.pos.x+300,y:p.pos.y}));step(w,.1);
  check('Rally launches all assembled sentinels together',!!a.dash&&!!b.dash);
  check('the charge shares one requested direction',Math.abs(a.dash!.dir-b.dash!.dir)<0.001);
  step(w,.7);check('completed shield charges leave protective banners',w.zones.filter(z=>z.inst.def.id==='court_oath_standard').length===2);
  const before=a.sheet.get('blockChance');step(w,.2);check('overlapping banners do not multiply block protection',a.sheet.get('blockChance')<=before+.08001&&a.sheet.get('blockChance')<=.23001);
  quiet(p);w.useMetaSkill(p,inst,{x:p.pos.x+300,y:p.pos.y});step(w,.1);check('command repetition cannot bypass the shared charge recovery',!a.dash&&!b.dash);
 }
 {
  const {w,p,inst,raise}=rig(['ossuary_duelists','flensing_edges','open_veins']);
  const a=raise()[0];a.pos={...p.pos};exact(a);const foe=target(w,a.pos.x+40,a.pos.y);foe.facing=Math.PI;
  quiet(p);check('Pursue marks through the ordinary meta input',w.useMetaSkill(p,inst,foe.pos));step(w,.1);
  check('commanded enemy carries a distinct warrant status',foe.statuses.some(s=>s.id==='death_warrant')&&p.cohortMarks.has(inst));
  const casts:string[]=[];SIM_TAP.current={onCast:(who,s,repeat)=>{if(who===a&&!repeat)casts.push(s.def.id);}};
  const primary=a.skills[0]!;
  for(let n=0;n<3;n++){quiet(a);a.facing=0;check('primary attack is usable '+n,w.useSkill(a,primary,foe.pos));step(w,1.1);}
  check('cadence is Twin Cut, Twin Cut, Rending Cut',casts.join(',')==='court_twin_cut,court_twin_cut,court_rending_cut');
  check('one Rending Cut consumes the warrant',!p.cohortMarks.has(inst)&&!foe.statuses.some(s=>s.id==='death_warrant'));
  check('the two native Twin Cut swings count as one primary use',a.cohortState!.primaryUses===3);
  SIM_TAP.current=null;
 }
 {
  const {w,p,raise}=rig(['ossuary_duelists','flensing_edges','merciless_measure']);
  const a=raise()[0];a.pos={...p.pos};exact(a);const foe=target(w,a.pos.x+40,a.pos.y);foe.facing=0;
  check('the node creates an Assassin body',a.defId==='skeletal_assassin');
  const casts:string[]=[];SIM_TAP.current={onCast:(who,s)=>{if(who===a)casts.push(s.def.id);}};
  w.cohortArts.act(a,foe,1/60,()=>{});step(w,.8);check('an actual rear opportunity selects Backstab',casts.includes('court_backstab'));
  quiet(a);a.life=a.maxLife()*.2;let retreat=false,safer=false;w.cohortArts.act(a,foe,1/60,goal=>{retreat=true;safer=Math.hypot(goal.x-foe.pos.x,goal.y-foe.pos.y)>Math.hypot(a.pos.x-foe.pos.x,a.pos.y-foe.pos.y);});
  check('low-life Assassin cloaks and disengages',a.sheet.get('invisible')>0&&retreat);
  check('retreat creates distance even when the owner is beside the threat',safer);
  SIM_TAP.current=null;
 }
 {
  const {w,p,inst,raise}=rig(['ossuary_duelists','line_breakers','dueling_pairs']);
  check('pairs add one to the cap while preserving one summon per cast',raise(4).length===4);
  const d=instanceDelivery(inst);if(d.type!=='summon')throw Error();check('Dueling Pairs resolves cap four',summonCapacity(p,inst,d)===4&&d.count===1);
  const a=raise()[0];a.pos={...p.pos};const foe=target(w,a.pos.x+160,a.pos.y);quiet(a);
  const casts:string[]=[];SIM_TAP.current={onCast:(who,s)=>{if(who===a)casts.push(s.def.id);}};
  w.cohortArts.act(a,foe,1/60,()=>{});step(w,.3);check('Line Breakers prefers the melee lunge',casts.includes('court_bone_lunge')&&!casts.includes('court_bone_shuriken'));
  a.dash=null;quiet(a);a.pos={...p.pos};a.cooldowns.set('court_bone_lunge',5);w.cohortArts.act(a,foe,1/60,()=>{});
  check('recovering lunge permits instant covering shuriken',casts.includes('court_bone_shuriken'));SIM_TAP.current=null;
 }
 {
  for(const school of SPELLSWORD_SCHOOLS){
   const {w,p,inst,raise}=rig(['ossuary_duelists','line_breakers','relentless_footwork','flensing_edges']);
   w.setSummonSchools(inst.def.id,[school.id]);
   inst.sockets[0]={def:SUPPORTS.volley,level:1};inst.sockets[1]={def:SUPPORTS.widening,level:1};inst.sockets[2]={def:SUPPORTS.resonance,level:1};
   check('projectile support is admitted by the individual ranged abilities '+school.id,supportFitsInstOrCrew(SUPPORTS.volley,inst,w.summonCrewSkills(inst)));
   const a=raise()[0];check('selected element controls the Spellsword form '+school.id,a.defId===school.monster);
   check('Spellsword has its own elemental art '+school.id,a.skills.some(s=>s?.def.id===school.signature));
   const blades=[...a.skills,...a.cohortState!.kit].filter((s):s is SkillInstance=>!!s);
   for(const id of ['court_twin_cut','court_rending_cut','court_bone_lunge','court_bone_shuriken']){
    const skill=blades.find(s=>s.def.id===id)!;check('conversion and color reach '+school.id+'/'+id,skill.def.tags.includes(school.id)&&skill.def.color===school.color&&skill.def.innateMods?.some(m=>m.stat==='convert_physical_'+school.id&&m.value===.6));
   }
   const shuriken=blades.find(s=>s.def.id==='court_bone_shuriken')!;
   check('Volley reaches shuriken, not the melee primary '+school.id,shuriken.sockets.some(s=>s?.def.id==='volley')&&!a.skills[0]!.sockets.some(s=>s?.def.id==='volley'));
   a.pos={...p.pos};exact(a);const foe=target(w,a.pos.x+120,a.pos.y);
   w.executeSkill(a,shuriken,foe.pos);check('supported shuriken launches three real projectiles '+school.id,w.projectiles.filter(q=>q.caster===a&&q.inst.def.id===shuriken.def.id).length===3);
   inst.sockets[0]=null;w.resyncMinionSupports(inst);check('live support removal reaches the auxiliary kit '+school.id,!shuriken.sockets.some(s=>s?.def.id==='volley'));
   w.setSummonSchools(inst.def.id,[school.id==='fire'?'cold':'fire']);check('changing schools retires the old cohort '+school.id,a.dead);
  }
 }

 {
  const {w,p,inst,raise}=rig(['ossuary_duelists','flensing_edges','open_veins']);
  const a=raise()[0];a.pos={...p.pos};a.facing=0;exact(a);const foe=target(w,a.pos.x+40,a.pos.y);
  const base=a.cohortState!.kit.find(s=>s.def.id==='court_rending_cut')!;
  const cut:SkillInstance={...base,def:{...base.def,baseDamage:{physical:[10,10]},effects:[{type:'damage'}]}};
  let hit=0,used:SkillInstance|undefined;
  SIM_TAP.current={onHit:(who,victim,result)=>{if(who===a&&victim===foe)hit=result.total;},onCast:(who,s)=>{if(who===a)used=s;}};
  w.executeSkill(a,cut,foe.pos);const plain=hit;
  p.sheet.setSource('warrant-power',[mod('statusMagnitude','increased',1,['curse']),mod('effectDuration','increased',1,['curse'])]);
  w.cohortArts.command(p,inst,foe.pos);const mark=p.cohortMarks.get(inst)!;
  const tags=skillContextTags(mark.inst),mods=instanceMods(mark.inst);
  check('curse-scoped potency scales Death Warrant',Math.abs(mark.power-1.5*p.sheet.get('statusMagnitude',tags,mods))<.001&&mark.power>3);
  check('duration investment scales the actual mark status',Math.abs(mark.status.remaining-8*p.sheet.get('effectDuration',tags,mods))<.001);
  w.executeSkill(a,cut,foe.pos);check('the actual Rending Cut hit gains the invested warrant multiplier',plain>0&&Math.abs(hit/plain-(1+mark.power))<.001);
  const oldCast=used!;w.cohortArts.command(p,inst,foe.pos);
  w.executeSkill(a,oldCast,foe.pos,{noRepeat:true,noCooldown:true});
  check('a repeated empowered cut cannot consume a newly applied warrant',p.cohortMarks.has(inst));
  foe.statuses=[];w.cohortArts.update(0);check('cleansing the real status removes its damage promise',!p.cohortMarks.has(inst));
  foe.sheet.setSource('immunity',[mod('debuffImmunity','override',1)]);w.cohortArts.command(p,inst,foe.pos);
  check('status immunity refuses the mark and its hidden bonus',!p.cohortMarks.has(inst));
  foe.sheet.removeSource('immunity');
  const ally=w.createMonster('zombie',1,p.team),other=makeSkillInstance(SKILLS.summon_skeleton,20,4);other.treeNodes=[...inst.treeNodes!];ally.skills=[other];ally.pos={x:p.pos.x,y:p.pos.y+40};w.actors.push(ally);
  w.cohortArts.command(p,inst,foe.pos);w.cohortArts.command(ally,other,foe.pos);
  check('two allied owners hold independent marks',foe.statuses.filter(s=>s.id==='death_warrant').length===2);
  w.executeSkill(a,cut,foe.pos);
  check('one cohort consumes only its own owner’s mark',!p.cohortMarks.has(inst)&&ally.cohortMarks.has(other)&&foe.statuses.filter(s=>s.id==='death_warrant').length===1);
  SIM_TAP.current=null;
 }
 {
  const {w,p,inst,raise}=rig(['ossuary_duelists','flensing_edges']);
  inst.sockets[0]={def:SUPPORTS.resonance,level:1};inst.sockets[1]={def:SUPPORTS.widening,level:1};inst.sockets[2]={def:SUPPORTS.multistrike,level:1};
  const a=raise()[0];a.pos={...p.pos};a.facing=0;exact(a);const foe=target(w,a.pos.x+40,a.pos.y);
  const rend=a.cohortState!.kit.find(s=>s.def.id==='court_rending_cut')!;
  check('area supports route to Rending Cut independently of Twin Cut',rend.sockets.some(s=>s?.def.id==='widening')&&!a.skills[0]!.sockets.some(s=>s?.def.id==='widening'));
  for(let n=0;n<3;n++){quiet(a);w.useSkill(a,a.skills[0]!,foe.pos);step(w,2.4);}
  check('supported repeats do not accelerate Flensing Cadence',a.cohortState!.primaryUses===3);
 }
 {
  const {w,p,raise}=rig(['ossuary_duelists','line_breakers','dueling_pairs']);
  const bodies=raise(2);bodies.forEach((a,i)=>{a.pos={x:p.pos.x,y:p.pos.y+(i-.5)*40};exact(a);});
  target(w,p.pos.x+150,p.pos.y);let pincers=0;
  SIM_TAP.current={onCast:(_a,s)=>{if(s.def.id==='court_pincer_strike')pincers++;}};
  step(w,2,true);check('a real landed lunge invites its paired Pincer Strike',pincers===1);
  step(w,1,true);check('the paired response cannot chain or bypass its shared recovery',pincers===1);SIM_TAP.current=null;
 }
 {
  const {w,p,inst,raise}=rig(['ossuary_duelists','line_breakers','relentless_footwork']);
  w.setSummonSchools(inst.def.id,['fire']);const a=raise()[0];w.setSummonSchools(inst.def.id,['fire']);
  check('applying unchanged schools preserves living minions',!a.dead);
  w.setSummonSchools(inst.def.id,[]);check('empty school choices are refused by the host',!a.dead&&inst.summonSchools?.join(',')==='fire');
  a.pos={...p.pos};a.facing=0;exact(a);const foe=target(w,a.pos.x+40,a.pos.y);let physical=0,fire=0;
  SIM_TAP.current={onHit:(who,victim,_r,packet)=>{if(who===a&&victim===foe){physical=packet.amounts.physical??0;fire=packet.amounts.fire??0;}}};
  w.executeSkill(a,a.skills[0]!,foe.pos);check('Spellsword conversion changes the actual hit packet',physical>0&&fire>0&&Math.abs(fire/(fire+physical)-.6)<.001);SIM_TAP.current=null;
 }
 {
  const {w,p,raise}=rig(['ossuary_duelists','flensing_edges','merciless_measure']);
  const a=raise()[0];a.pos={...p.pos};exact(a);const foe=target(w,a.pos.x+40,a.pos.y);foe.facing=Math.PI;
  const casts:string[]=[];SIM_TAP.current={onCast:(who,s)=>{if(who===a)casts.push(s.def.id);}};
  for(let n=0;n<8*60;n++){a.pos={...p.pos};foe.pos={x:p.pos.x+40,y:p.pos.y};foe.facing=foe.facingPrev=Math.PI;w.cohortArts.act(a,foe,1/60,()=>{});w.update(1/60);}
  check('an obstructed flank yields to Twin Cut and Rending Cut',casts.includes('court_twin_cut')&&casts.includes('court_rending_cut'));
  check('Assassins do not backstab without an actual rear opportunity',!casts.includes('court_backstab'));SIM_TAP.current=null;
 }
 console.log('Skeleton Warrior: '+checks+' checks PASS');
}finally{SIM_TAP.current=null;restore();}
