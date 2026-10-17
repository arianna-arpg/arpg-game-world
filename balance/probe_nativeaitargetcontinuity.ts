import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {SKILLS} from '../src/data/skills';
import {makeSkillInstance} from '../src/engine/skills';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
const results=['travel','xray-travel','carried'].map(mode=>withSeededRandom(46137,()=>{
 const setup=nativeCampaignFixture(),defB=mintAdditionalNativeArea(setup);
 return refuseWorldCombat([setup.writer],worldDrivers=>{
  const {ongoing:a,coordinator,authority}=birthActualNativeArea(setup),writer=setup.writer,hero=writer.player,time=writer.time;
  const enemy=a.assembly.input.scene.actors.find(x=>x.team==='enemy'&&!x.dead&&!x.passive&&!x.construct&&!x.owner);assert(enemy);
  enemy.brain=mode==='xray-travel'?{type:'basic',perception:{xray:true}}:{type:'basic'};enemy.ambushArmed=false;enemy.emergeUntil=undefined;enemy.aiAwakened=true;enemy.burrow=undefined;enemy.leap=undefined;enemy.pos={x:hero.pos.x+40,y:hero.pos.y};enemy.tier=hero.tier;
  coordinator.runFrom(a,()=>a.combat.updateAIActor(enemy,1/60));assert.equal(enemy.aiTargetRef,hero);assert.equal(enemy.aiTargetId,hero.id);assert(enemy.aiRescanAt>time);const nativeRescan=enemy.aiRescanAt;
  coordinator.runFrom(a,()=>a.combat.updateAIActor(enemy,1/60));assert.equal(enemy.aiTargetRef,hero);assert.equal(enemy.aiRescanAt,nativeRescan,'same-area lock keeps native cadence');
  let replacement:typeof hero|undefined;
  if(mode==='carried'){const fx=SKILLS.form_of_the_dire_wolf.effects.find(fx=>fx.type==='shapeshift');assert(fx?.type==='shapeshift');a.combat.shapeshiftPress(hero,makeSkillInstance(SKILLS.form_of_the_dire_wolf,1),fx.shift);replacement=writer.localSeat.actor;assert.equal(writer.localSeat.home,hero);assert.notEqual(replacement,hero);assert(!a.assembly.input.scene.actors.includes(hero));}
  else {coordinator.runFrom(a,()=>coordinator.loadZone(defB.id,a.assembly.input.scene.zone.id));assert.notEqual(coordinator.current,a);assert.equal(authority.require(hero).combat,coordinator.current.combat);}
  assert.equal(enemy.aiTargetRef,hero,'native held ref survives physical departure until next AI');assert.equal(enemy.aiRescanAt,nativeRescan);assert.equal(writer.time,time);
  // Controlled overlapping local coordinates, not target/cadence/instance reinjection.
  enemy.pos={x:(replacement??hero).pos.x+40,y:(replacement??hero).pos.y};
  const before={life:hero.life,useLock:hero.useLock,casting:hero.casting,swarmN:hero.aiSwarmN,swarmedAt:hero.aiSwarmedAt},sheet=hero.sheet,get=sheet.get;
  let departedReads=0,attendanceCallbacks=0;const oldPresent=Object.getOwnPropertyDescriptor(authority,'isPresentActor');
  Object.defineProperty(authority,'isPresentActor',{configurable:true,value:()=>{attendanceCallbacks++;throw Error('shadowed public attendance');}});
  sheet.get=function(...args:Parameters<typeof get>){departedReads++;return Reflect.apply(get,this,args);};
  try{coordinator.runFrom(a,()=>a.combat.updateAIActor(enemy,1/60));}finally{sheet.get=get;if(oldPresent)Object.defineProperty(authority,'isPresentActor',oldPresent);else Reflect.deleteProperty(authority,'isPresentActor');}
  assert.equal(departedReads,0,'departed target stats are not consulted');assert.equal(attendanceCallbacks,0,'exact physical observer ignores public override');assert.notEqual(enemy.aiTargetRef,hero);assert.notEqual(enemy.aiTargetId,hero.id);assert.deepEqual({life:hero.life,useLock:hero.useLock,casting:hero.casting,swarmN:hero.aiSwarmN,swarmedAt:hero.aiSwarmedAt},before);assert.equal(writer.time,time);
  if(replacement)assert.equal(enemy.aiTargetRef,replacement,'native roster acquires actual controlled form');
  assert.throws(()=>coordinator.runFrom(a,()=>a.combat.ai.losCached(enemy,hero)),mode==='carried'?/Missing native actor authority/:/actual local subject authority/,'foreign/hidden LOS still refuses');assert.deepEqual(worldDrivers,[]);
  return {mode,acquired:true,sameAreaHeld:true,departedReads,attendanceCallbacks,departedLockLost:true,carriedBodyAcquired:!!replacement,foreignLosRefused:true,worldDrivers};
 });
}));const report={scope:'Actual acquired held references across genuine area travel or carried withdrawal. Only overlapping local coordinates are staged after travel; native target/cadence remain unchanged. Ordinary World behavior remains covered separately.',results,receipt:combatHash(JSON.stringify(results))};writeCombatProof('native-ai-target-continuity.json',report);console.log(JSON.stringify(report));
