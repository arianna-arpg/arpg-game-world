/** Floor regressions through a genuinely born native area and its combat owners. */
import assert from 'node:assert/strict';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
import {makeSkillInstance} from '../src/engine/skills';
import {SKILLS} from '../src/data/skills';
import {mod} from '../src/engine/stats';
import {withSeededRandom} from '../src/core/rng';
import {skillToLoot,type DeathRecord} from '../src/meta/death';

function fixture() {
 const setup=nativeCampaignFixture(1971),all=birthActualNativeArea(setup);
 const {ongoing,authority}=all,{scene,population,geometry}=ongoing.assembly.input;
 scene.zone.tiers={kind:'over',levels:1,exposure:'covered'};
 geometry.doodads=[];geometry.walk=null;geometry.tierViews=null;
 const caster=population.createMonster('skeleton_warrior',12,'player');
 caster.pos={x:geometry.arena.w/2,y:geometry.arena.h/2};caster.tier=0;
 caster.sheet.setSource('layer course',[mod('accuracy','override',100000),mod('critChance','override',0)]);
 const foes=[0,1].map(tier=>{
  const actor=population.createMonster('zombie',1,'enemy');actor.tier=tier;
  actor.pos={x:caster.pos.x+60,y:caster.pos.y};actor.skills=[];
  actor.sheet.setSource('layer course',[mod('life','override',10000),mod('armor','override',0),mod('evasion','override',0),mod('blockChance','override',0),mod('energyShield','override',0)]);
  actor.fillResources();return actor;
 });
 scene.actors.push(caster,...foes);authority.claim(ongoing.binding,[caster,...foes]);
 return {...all,combat:ongoing.combat,scene,caster,lower:foes[0],upper:foes[1],queues:ongoing.progression.input.state};
}
const checks:Record<string,()=>void>={
 'native free shot retains its launch floor after ascent':()=>{
  const {combat,caster,lower,upper,queues}=fixture();
  const inst=makeSkillInstance({...SKILLS.fireball,baseDamage:{fire:[25,25]},effects:[{type:'damage'}],delivery:{type:'projectile',speed:200,range:500,radius:10}});
  combat.spawnProjectile(caster,inst,{...caster.pos},0);assert.equal(queues.projectiles[0].tier,0);
  caster.tier=1;const hp=[lower.life,upper.life];combat.updateProjectiles(.3);
  assert.ok(lower.life<hp[0]);assert.equal(upper.life,hp[1]);
 },
 'native field birth and tick keep the impact floor':()=>{
  const {combat,caster,lower,upper,queues,campaign}=fixture();caster.tier=1;
  combat.executeSkill(caster,makeSkillInstance(SKILLS.toxic_cloud),lower.pos,{tier:0,noCooldown:true,noRepeat:true});
  assert.ok(queues.zones.length);assert.ok(queues.zones.every(z=>z.tier===0));
  const hp=[lower.life,upper.life];
  for(let i=0;i<10;i++){campaign.time+=.1;combat.updateZones(.1);}
  assert.ok(lower.life<hp[0]);assert.equal(upper.life,hp[1]);
 },
 'native secondary burst and aftermath keep the impact floor':()=>{
  const {combat,caster,lower,upper,queues}=fixture();caster.tier=1;
  caster.sheet.setSource('layer pulse',[mod('pulseCount','flat',1)]);
  const inst=makeSkillInstance({...SKILLS.fireball,baseDamage:{fire:[25,25]},effects:[{type:'damage'}],delivery:{type:'nova',radius:100}});
  const hp=[lower.life,upper.life];
  combat.executeSkill(caster,inst,lower.pos,{targetInfo:{pos:{...lower.pos}},tier:0,noCooldown:true,noRepeat:true});
  assert.ok(lower.life<hp[0]);assert.equal(upper.life,hp[1]);
  assert.ok(queues.zones.length);assert.ok(queues.zones.every(z=>z.tier===0));
 },
 'native terminal fields and shards inherit the shot floor':()=>{
  const {combat,caster,queues}=fixture();
  caster.sheet.setSource('layer shards',[mod('returnShrapnel','flat',2)]);
  const inst=makeSkillInstance({...SKILLS.fireball,effects:[{type:'damage'}],delivery:{type:'projectile',speed:200,range:20,radius:5,endZone:{radius:40,duration:2}}});
  combat.spawnProjectile(caster,inst,{...caster.pos},Math.PI);caster.tier=1;combat.updateProjectiles(.2);
  assert.ok(queues.zones.length);assert.ok(queues.zones.every(z=>z.tier===0));
  assert.ok(queues.projectiles.length);assert.ok(queues.projectiles.every(p=>p.tier===0));
 },
 'native following fields and orbiting shots change floors with their anchor':()=>{
  const {combat,caster,queues}=fixture();
  combat.executeSkill(caster,makeSkillInstance(SKILLS.toxic_cloud),caster.pos,{noCooldown:true,noRepeat:true});
  const zone=queues.zones[0];zone.follow=true;
  combat.spawnProjectile(caster,makeSkillInstance(SKILLS.fireball),caster.pos,0);
  const shot=queues.projectiles[0];shot.orbit=1;shot.orbRadius=50;shot.orbitR0=50;
  caster.tier=1;combat.updateZones(.01);combat.updateProjectiles(.01);
  assert.equal(zone.tier,1);assert.equal(shot.tier,1);
 },
 'native corpse history restores its saved floor':()=>{
  const {ongoing,scene,caster}=fixture();
  const history=ongoing.assembly.input.history;
  const record:DeathRecord={schema:1,mapX:scene.zone.map.x,mapY:scene.zone.map.y,pos:{...caster.pos},tier:1,
   zoneId:scene.zone.id,loot:{items:[skillToLoot(makeSkillInstance(SKILLS.fireball))]},classId:'warrior',charLevel:1,
   zoneName:scene.zone.name,owner:'p0',timestamp:1};
  history.corpseRecords().push(record);history.spawnPlayerCorpses(scene.zone);
  assert.equal(history.input.state.playerCorpses.at(-1)?.tier,1);
  delete record.tier;history.spawnPlayerCorpses(scene.zone);
  assert.equal(history.input.state.playerCorpses.at(-1)?.tier,0);
 }
};
let failures=0;
for(const [name,run] of Object.entries(checks)){
 try{withSeededRandom(1971,run);console.log('PASS '+name);}
 catch(error){failures++;console.error('FAIL '+name,error);}
}
if(failures)process.exitCode=1;
