import { strict as assert } from 'node:assert';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateEncounterCombat, encounterCueOf, encounterOrderTuning } from '../src/engine/encounterCombat';
import { ENCOUNTER_GROUPS } from '../src/data/encounterGroups';
import { ENCOUNTER_TACTICS } from '../src/data/encounterTactics';
import { encounterCueStyle, ENCOUNTER_CUE_STYLES } from '../src/data/warningCues';
import { guardReleaseCue, guardBashGeometry } from '../src/engine/warningCues';
import { drawGuardReleaseGround, drawEncounterCue, warningCueLean } from '../src/render/vis/warningCueLayer';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance, guardBashSpec, BASH_CFG } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';

seedGlobalRandom(0x77112);
let count=0;
const check=(name:string,ok:boolean)=>{assert.ok(ok,name);console.log('PASS '+name);count++;};
const near=(a:number,b:number)=>Math.abs(a-b)<1e-7;
function guardFixture() {
  const w=makeSimWorld('guardian',0x77112),p=w.player;
  p.pos={x:900,y:600};p.sheet.setSource('cue-rig',[mod('life','override',10000),
    ...['armor','blockChance','evasion','lifeRegen','energyShield','endurance'].map(s=>mod(s,'override',0))]);p.fillResources();
  const a=w.createMonster('sylvan_warden',1,'enemy');a.pos={x:855,y:600};a.facing=a.facingPrev=0;
  w.actors=[p,a];const inst=a.skills.find(s=>s?.def.id==='shield_up')!;
  assert.ok(w.useSkill(a,inst,p.pos));const cs=a.casting!;
  cs.aiHold=2;cs.aiGuardWindup=0.55;
  const untilWarning=()=>{for(let i=0;i<180&&cs.aiGuardReleaseAt===undefined;i++)w.update(1/60);assert.ok(cs.aiGuardReleaseAt!==undefined);};
  return {w,p,a,cs,inst,untilWarning};
}
for(const hz of [30,60,120]) {
  const {w,p,a,cs,inst}=guardFixture();const before=p.life;
  check(`${hz} Hz: ordinary hold has no threatened release`,!guardReleaseCue(a,w.time));
  while(cs.aiGuardReleaseAt===undefined)w.update(1/hz);
  const cue=guardReleaseCue(a,w.time)!;
  check(`${hz} Hz: visible warning begins before damage`,!!cue&&p.life===before&&near(cue.progress,0));
  const geo=guardBashGeometry(a,guardBashSpec(inst)!);
  check(`${hz} Hz: warning uses actual release arc and reach`,cue.radius===geo.radius&&cue.arc===geo.arc&&cue.facing===cs.aiGuardFacing);
  check(`${hz} Hz: warning loads the body backward`,warningCueLean(cue,undefined)<0);
  while(w.time+1/hz<cs.aiGuardReleaseAt!-1e-8)w.update(1/hz);
  check(`${hz} Hz: same footprint intensifies to its deadline`,guardReleaseCue(a,w.time)!.progress>0.9&&guardReleaseCue(a,w.time)!.radius===cue.radius&&p.life===before);
  while(a.casting)w.update(1/hz);
  check(`${hz} Hz: actual release wounds and clears warning`,p.life<before&&!guardReleaseCue(a,w.time));
  check(`${hz} Hz: committed bash emits no instruction caption`,!w.texts.some(t=>t.text==='Bash incoming!'));
}
for(const reason of ['pressure','stun','death','cancel','behind'] as const) {
  const f=guardFixture();f.untilWarning();const {w,p,a,cs}=f,before=p.life;
  if(reason==='pressure')cs.shield=cs.maxShield!*0.05;
  if(reason==='stun'){a.poise=0;a.applyStatus('stun',0,2,'probe');}
  if(reason==='death')a.dead=true;
  if(reason==='cancel')a.casting=null;
  if(reason==='behind'){p.pos.x=a.pos.x-45;cs.aim={...p.pos};}
  if(reason!=='behind')check(`${reason}: no stale footprint before another frame`,!guardReleaseCue(a,w.time));
  else check('target movement cannot redirect committed geometry',guardReleaseCue(a,w.time)?.facing===0);
  for(let i=0;i<50;i++)w.update(1/60);
  check(`${reason}: interruption or escape prevents delayed damage`,p.life===before&&!guardReleaseCue(a,w.time));
}
{
  const f=guardFixture();f.untilWarning();const {w,a,cs}=f;
  const snap=serializeSnapshot(w,1),client=makeSimWorld('guardian',1);applySnapshot(client,snap);
  const mirror=()=>client.actors[snap.actors.findIndex(x=>x.id===a.id)];
  check('co-op has the exact host warning geometry/progress',JSON.stringify(guardReleaseCue(mirror(),w.time))===JSON.stringify(guardReleaseCue(a,w.time)));
  cs.shield=cs.maxShield!*0.01;applySnapshot(client,serializeSnapshot(w,2));
  check('pressure clears remote warning while preserving the live guard',!!mirror().casting&&!guardReleaseCue(mirror(),w.time));
  a.casting=null;applySnapshot(client,serializeSnapshot(w,3));
  check('guard cancellation clears remote pose and footprint',!mirror().casting&&!guardReleaseCue(mirror(),w.time));
}
{
  const f=guardFixture();f.untilWarning();const {a,cs,w,inst}=f;
  const original=inst.def;
  // Instance-authored radial/inverted/grafted geometry must not assume Warden anatomy.
  inst.def={...original,guard:{...original.guard!,bash:{range:150,arcDeg:350,mult:1}}};
  let cue=guardReleaseCue(a,w.time)!;
  check('radial bash uses the real full-circle threshold',cue.fullCircle&&cue.arc===Math.PI*2&&cue.radius===a.radius+150);
  cs.bashLow=true;cs.bashAt=0.75;cs.shield=cs.maxShield!*0.1;
  check('inverted payload stays threatening on the low side',!!guardReleaseCue(a,w.time));
  cs.shield=cs.maxShield!;
  check('inverted empty payload cannot show a fake burst',!guardReleaseCue(a,w.time));
  cs.bashLow=false;cs.shield=cs.maxShield!;cs.bashArmAt=(cs.channelTime??0)+10;
  check('a newly delayed arm clock removes an impossible warning',!guardReleaseCue(a,w.time));
  cs.bashArmAt=BASH_CFG.armTime;inst.def=original;
  cue=guardReleaseCue(a,w.time)!;
  a.pos.x+=55;check('external displacement keeps geometry body-relative',guardReleaseCue(a,w.time)!.radius===cue.radius);
}

const w=makeSimWorld('warrior',0x77112);
function groupFixture(recipe='wayward_expedition') {
  w.actors=[w.player];w.doodads=[];w.texts=[];w.flashes=[];w.walk=null;w.markDoodadsChanged();
  w.zone={...w.zone,tileset:ENCOUNTER_GROUPS[recipe].habitats!.tilesets![0],level:18};
  w.player.casting=null;w.player.statuses=[];w.player.tier=0;w.player.dead=false;
  w.player.sheet.setBase('invisible',0);
  const members=w.spawnEncounterGroup(recipe,18,{x:800,y:600},{facing:Math.PI/2});
  const leader=members.find(a=>a.encounterGroup?.leader)!;assert.ok(leader);
  w.player.pos={x:leader.pos.x,y:leader.pos.y+350};
  for(const a of members){a.emergeUntil=undefined;a.aiTargetId=w.player.id;a.aggroed=true;}
  updateEncounterCombat(w);return {members,leader};
}
const think=(dt:number)=>{w.time+=dt;updateEncounterCombat(w);};
for(const plan of Object.keys(ENCOUNTER_TACTICS)) {
  const recipe=plan==='pincer'?'pipers_ambush':plan==='root_barrage'?'snare_nursery':plan==='countercast'?'rift_observatory':'wayward_expedition';
  const {members,leader}=groupFixture(recipe),p=ENCOUNTER_TACTICS[plan];
  if(plan==='protect_support'){const support=members.find(a=>a.defId==='wayward_mender')!;w.player.pos={x:support.pos.x+100,y:support.pos.y};support.life*=0.4;}
  if(plan==='pincer')w.player.pos={x:leader.pos.x,y:leader.pos.y+300};
  if(plan==='covered_withdrawal')leader.life*=0.3;
  if(plan==='countercast')w.player.casting={inst:makeSkillInstance(SKILLS.firebolt),mode:'cast',aim:leader.pos,elapsed:0,total:5,held:true,baseMult:1};
  const before=JSON.stringify(members.map(a=>({pos:a.pos,life:a.life,mana:a.mana})));
  think(1.3);
  const cue=encounterCueOf(leader,w)!;
  check(`${plan}: conductor shows selected plan from warning start`,cue?.plan===plan&&cue.phase==='warning'&&cue.conductor&&near(cue.progress,0));
  check(`${plan}: no instant move, damage, bonus or premature assignment`,before===JSON.stringify(members.map(a=>({pos:a.pos,life:a.life,mana:a.mana})))&&members.every(a=>!encounterOrderTuning(a,w)));
  if(plan==='pincer')check('unassigned piper still visibly conducts the flankers',!leader.encounterOrder&&!!encounterCueOf(leader,w));
  think(p.warning*0.6);
  check(`${plan}: progress follows actual warning clock`,near(encounterCueOf(leader,w)!.progress,0.6));
  const snap=serializeSnapshot(w,1),client=makeSimWorld('warrior',1);applySnapshot(client,snap);
  const mirror=client.actors[snap.actors.findIndex(a=>a.id===leader.id)];
  check(`${plan}: co-op keeps identity, conductor and live phase`,JSON.stringify(encounterCueOf(mirror,client))===JSON.stringify(encounterCueOf(leader,w)));
  think(p.warning*0.4+0.01);
  check(`${plan}: commitment swaps to the actual maneuver phase`,encounterCueOf(leader,w)?.phase==='commit'&&members.some(a=>encounterOrderTuning(a,w)));
  think(p.duration+0.01);
  check(`${plan}: recovery lowers gestures on the true interval`,encounterCueOf(leader,w)?.phase==='recover'&&warningCueLean(undefined,encounterCueOf(leader,w))>0);
  think(p.recovery+0.01);
  check(`${plan}: recovery expiry clears every body`,members.every(a=>!encounterCueOf(a,w)));
  applySnapshot(client,serializeSnapshot(w,2));
  check(`${plan}: expired plan clears remote presentation`,client.actors.every(a=>!a.encounterCue));
  check(`${plan}: no caption or detached leader flash`,w.texts.length===0&&w.flashes.length===0);
}
for(const reason of ['stun','death','capture','wall','range','command','zone'] as const) {
  const {members,leader}=groupFixture();think(1.3);
  const follower=members.find(a=>a!==leader&&a.encounterOrder)!;
  const sight=w.lineOfSight;
  if(reason==='stun'){leader.poise=0;leader.applyStatus('stun',0,2,'probe');}
  if(reason==='death')leader.dead=true;
  if(reason==='capture'){leader.owner=w.player;leader.team='player';}
  if(reason==='wall')w.lineOfSight=()=>false;
  if(reason==='range')follower.pos.x+=1000;
  if(reason==='command')follower.aiCommand={kind:'move',pos:{...follower.pos},until:w.time+10} as typeof follower.aiCommand;
  if(reason==='zone')w.zone={...w.zone};
  think(0.4);
  if(reason==='range'||reason==='command')check(`${reason}: ineffective assignment has no misleading gesture`,!encounterCueOf(follower,w));
  else if(reason==='zone')check('zone change clears every old gesture',members.every(a=>!encounterCueOf(a,w)));
  else check(`${reason}: disruption replaces warning with surviving recovery`,members.filter(a=>(a.encounterOrder||a===leader)&&!a.dead&&a.team==='enemy'&&!a.isStunned()).every(a=>encounterCueOf(a,w)?.phase==='recover'));
  w.lineOfSight=sight;
}
{
  const def=ENCOUNTER_GROUPS.wayward_expedition.encounterCombat!,saved=def.cues;
  def.cues={...saved,crossfire:{style:'mod-missing',color:'#123456'}};
  const {leader}=groupFixture();think(1.3);
  const cue=encounterCueOf(leader,w)!;
  check('encounter data can override visual profile and material',cue.style==='mod-missing'&&cue.color==='#123456');
  def.cues=saved;
}
for(const style of [...Object.keys(ENCOUNTER_CUE_STYLES),'missing','constructor','__proto__']) {
  let depth=0,paths=0;
  const ctx=new Proxy({save:()=>{depth++;},restore:()=>{depth--;},beginPath:()=>{paths++;}},
    {get:(o,k)=>k in o?o[k as keyof typeof o]:()=>{}}) as unknown as CanvasRenderingContext2D;
  for(const phase of ['warning','commit','recover'] as const)for(const progress of [0,0.5,0.99])
    drawEncounterCue(ctx,{style,plan:'test',group:1,leader:2,phase,progress,conductor:true,facing:1,color:'#888'},16);
  drawGuardReleaseGround(ctx,{facing:1,radius:90,arc:1.8,fullCircle:false,progress:0.5,color:'#888'});
  check(`${style}: monochrome gesture geometry and canvas isolation`,paths>0&&depth===0);
  if(!Object.hasOwn(ENCOUNTER_CUE_STYLES,style))check(`${style}: unknown profile uses shared preparation fallback`,encounterCueStyle(style)===ENCOUNTER_CUE_STYLES.gather);
}
console.log(`ALL PASS (${count} assertions)`);
