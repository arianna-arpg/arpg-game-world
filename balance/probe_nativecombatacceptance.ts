/** First actual retained NPC combat acceptance over a genuinely born/admitted area.
 * Ordinary World oracle comparison is a separate course, never a runtime provider. */
import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {vec} from '../src/core/math';
import {mod} from '../src/engine/stats';
import {makeSkillInstance} from '../src/engine/skills';
import {SKILLS} from '../src/data/skills';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,NATIVE_COMBAT_COURSES,writeCombatProof,combatHash} from './probe_nativecombatcycle';
const results=[];
for(const [index,course]of NATIVE_COMBAT_COURSES.entries()){
 if(process.env.COMBAT_COURSE&&!course.name.includes(process.env.COMBAT_COURSE))continue;
 const result=withSeededRandom(44991+index,()=>{const setup=nativeCampaignFixture();if(course.objective)setup.definition.objective={kind:'clear'};return refuseWorldCombat([setup.writer],calls=>{
  const all=birthActualNativeArea(setup),{ongoing,authority,campaign}=all,combat=ongoing.combat,{scene,population,geometry}=ongoing.assembly.input;
  const caster=population.createMonster('skeleton_warrior',12,'player'),target=population.createMonster('skeleton_warrior',12,'enemy');
  caster.pos=geometry.findFreeSpot(vec(geometry.arena.w/2,geometry.arena.h/2),caster.radius)??geometry.clampPos(vec(geometry.arena.w/2,geometry.arena.h/2),caster.radius);
  target.pos=geometry.findFreeSpot(vec(caster.pos.x+course.distance,caster.pos.y),target.radius)??geometry.clampPos(vec(caster.pos.x+course.distance,caster.pos.y),target.radius);
  caster.facing=0;caster.sheet.setSource('controlled proof budget',[mod('maxMana','flat',10000),mod('strength','flat',200),mod('dexterity','flat',200),mod('intelligence','flat',200)]);caster.mana=caster.maxMana();
  if(course.proc)caster.sheet.setSource('controlled installed proc chance',[mod('proc_'+course.proc,'flat',100)]);
  if(course.status)caster.sheet.setSource('controlled installed ailment chance',[mod('apply_'+course.status,'flat',1)]);
  target.life=course.lethal?1:target.maxLife();scene.actors.push(caster,target);authority.claim(ongoing.binding,[caster,target]);
  const inst=makeSkillInstance(SKILLS[course.skill],12);caster.skills=[inst];
  if(course.objective){for(const body of [...scene.actors])if(body!==target&&body.team==='enemy'&&!body.dead)combat.kill(body,false,caster);assert.equal(scene.actors.filter(body=>body.team==='enemy'&&!body.dead).length,1,'controlled clear course leaves only actual cast target');}
  const initialLife=target.life,trace:string[]=[],saved=new Map<string,PropertyDescriptor|undefined>();
  for(const name of ['executeSkill','resolveHit','kill','spawnProjectile','spawnMinion','spawnConstruct','executeProc']){saved.set(name,Object.getOwnPropertyDescriptor(combat,name));const fn=Reflect.get(combat,name) as Function;Object.defineProperty(combat,name,{configurable:true,value:function(...args:unknown[]){trace.push(name);return Reflect.apply(fn,combat,args);}});}
  // Use the already recorded ordinary-oracle action seed after independent native birth.
  return withSeededRandom((44001+index)^0x44cc,()=>{try{
   const accepted=combat.useSkill(caster,inst,{...target.pos});assert.equal(accepted,true,'actual NPC cast accepted: '+course.name);const casting=!!caster.casting;
   for(let i=0;i<Math.ceil(course.seconds*60);i++){const dt=1/60;campaign.time+=dt;combat.updateCasting(caster,dt);combat.updateProjectiles(dt);combat.updateZones(dt);combat.updateFollowUps(dt);combat.updateDeathBursts(dt);}
   assert.ok(trace.includes('executeSkill'),'actual native execution: '+course.name);
   if(['cleave','fireball','earthquake'].includes(course.skill))assert.ok(target.life<initialLife||target.dead,'actual native impact: '+course.name);
   if(course.proc){console.log(JSON.stringify({diagnostic:'actual proc course',trace,initialLife,targetLife:target.life,dead:target.dead,casterPos:caster.pos,targetPos:target.pos}));assert.ok(trace.includes('executeProc'),'actual proc executes');}
   if(course.status)assert.ok(target.statuses.some(s=>s.id===course.status),'actual installed status');
   if(course.lethal)assert.equal(target.dead,true,'actual native death');
   if(course.objective){ongoing.updateObjective(1/60);assert.equal(ongoing.assembly.input.objectives.objectiveDone,true,'actual watcher completes native last death');assert.ok(campaign.completedObjectives.has(scene.zone.id));}
   if(course.skill==='summon_skeleton')assert.ok(scene.actors.some(a=>a.owner===caster),'real native summon inserted');
   if(course.skill==='flame_totem')assert.ok(scene.actors.some(a=>a.owner===caster&&a.construct),'real native construct inserted');
   authority.assertAdmitted(scene);
   return{name:course.name,accepted,casting,trace,targetLife:target.life,targetDead:target.dead,spawned:scene.actors.filter(a=>a.owner===caster).map(a=>({def:a.defId,construct:!!a.construct})),objectiveDone:ongoing.assembly.input.objectives.objectiveDone,queues:{projectiles:ongoing.progression.input.state.projectiles.length,zones:ongoing.progression.input.state.zones.length},worldDrivers:calls};
  }finally{for(const[name,d]of saved){if(d)Object.defineProperty(combat,name,d);else Reflect.deleteProperty(combat,name);}}});
 });});results.push(result);console.log('PASS retained '+course.name);
}
const report={mode:'Actual retained NPC skill/cast/consumer/hit/proc/death execution, actual factory insertion and authority. An explicitly authored clear objective completes via actual last cast death and watcher; full frame and oracle equivalence remain separate.',courses:results.length,results,receipt:combatHash(JSON.stringify(results))};writeCombatProof('native-combat-actual-acceptance.json',report);console.log(JSON.stringify({courses:report.courses,receipt:report.receipt}));

