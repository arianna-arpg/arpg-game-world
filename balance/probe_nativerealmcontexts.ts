import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {NativeAreaSceneAssembly} from '../src/worldmass/nativeAreaSceneAssembly';
import {realmSetup,stageRealm,enterRealm,realmKinds,type RealmKind} from './nativeRealmEntryFixture';
import {birthActualNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,combatHash,writeCombatProof} from './probe_nativecombatcycle';
type Mode='native'|'solo'|'hosted';
function run(kind:RealmKind,mode:Mode){return withSeededRandom(46115,()=>{
 const setup=realmSetup(),w=setup.writer;
 const action=(r?:ReturnType<typeof birthActualNativeArea>)=>{
  const source=r?.ongoing,staged=stageRealm(setup,kind,source),sourceId=w.zone.id,key=staged.key,prepared:unknown[]=[];
  const originalPrepare=NativeAreaSceneAssembly.prototype.prepare;
  if(r)NativeAreaSceneAssembly.prototype.prepare=function(...args){if(this.input.scene.zone.id!==sourceId){const context=r.authority.bindingFor(this.input.scene).services.campaignOwner.state[key];if(mode==='solo')assert(context,'destination layout sees original realm context');else assert.equal(context,null,'hosted onFirstWake remains after birth');prepared.push({id:this.input.scene.zone.id,context:structuredClone(context)});}return Reflect.apply(originalPrepare,this,args);};
  try{
   withSeededRandom(88123,()=>{if(mode==='hosted'){assert(r&&source);source.combat.campaignFrame.enableHostedRoads();r.coordinator.runFrom(source,()=>{const gate=source.combat.campaignFrame.realmGates().find(g=>g.key===staged.gate);assert(gate?.road);const ticket=gate.road(w.localSeat);assert(ticket);r.coordinator.roadsFor(source.combat).shardWorld!.enqueue(ticket);});const drained=source.combat.campaignFrame.drainShardRoads();assert.equal(drained.length,1);if(drained[0].error)throw drained[0].error;assert.equal(drained[0].outcome,'moved');}else enterRealm(r?source!.combat.campaignFrame:w,staged);});
  }finally{NativeAreaSceneAssembly.prototype.prepare=originalPrepare;}
  const realm=r?.coordinator.current,state=realm?.combat.campaignOwner.state??w,context=structuredClone(Reflect.get(state,key));assert(context);if(source)assert.equal(source.combat.campaignOwner.state[key],null);
  const realmId=w.zone.id;
  let ward=realm?.combat.runtimeState.frame.arenaWard??w['arenaWard'],ticks=0;while(ward&&ticks++<250){w.player.pos={...ward.seals[0].pos};w.player.push=null;if(r)realm!.combat.campaignFrame.tick(.1);else w.update(.1);ward=realm?realm.combat.runtimeState.frame.arenaWard:w['arenaWard'];}assert(!ward,'genuine frame dwell opens every ward');
  const boss=w.actors.find(a=>a.tag===staged.tag);assert(boss,'native authored realm boss');const grants:number[]=[],completion=realm?.assembly.objectiveController??w,selected=completion.grantXp;
  completion.grantXp=function(...args:Parameters<typeof selected>){grants.push(args[0]);return Reflect.apply(selected,this,args);};
  const dropsBefore=w.drops.length,levelBefore=w.player.level,xpBefore=w.localSeat.meta.xp;
  try{withSeededRandom(99881,()=>{if(realm)realm.combat.kill(boss,false,w.player);else w.kill(boss,false,w.player);});}finally{completion.grantXp=selected;}
  const reward={grants,dropDelta:w.drops.length-dropsBefore,contextConsumed:Reflect.get(state,key)===null,levelBefore,xpBefore,levelAfter:w.player.level,xpAfter:w.localSeat.meta.xp};assert(reward.contextConsumed);
  for(const actor of [...w.actors])if(actor.team==='enemy'&&!actor.dead){if(realm)realm.combat.kill(actor,true);else w.kill(actor,true);}
  if(realm)realm.combat.updateObjective(1/60);else w['updateObjective'](1/60);
  const objective={done:realm?realm.assembly.input.objectives.objectiveDone:w.objectiveDone,remembered:w.completedObjectives.has(realmId)};
  const exit=w.exits.find(e=>e.to===sourceId);assert(exit,'actual return exit');if(realm)realm.combat.campaignFrame.travelThrough(exit);else w['travelThrough'](exit);assert.equal(w.zone.id,sourceId);assert.equal(w.sim.deadwakeField?.necropolisInfo()?.defeated,undefined);
  if(r){assert.equal(r.coordinator.current,source);assert.equal(Reflect.get(state,key),null);assert.equal(source!.combat.campaignOwner.state[key],null);r.authority.assertAdmitted(source!.assembly.input.scene);r.authority.assertAdmitted(realm!.assembly.input.scene);}
  return{kind,mode,realmId,context,boss:{tag:boss.tag,defId:boss.defId,level:boss.level},wardTicks:ticks,reward,objective,returned:w.zone.id,preparedCount:prepared.length};
 };
 if(mode==='native')return action();return refuseWorldCombat([w],drivers=>{const result=action(birthActualNativeArea(setup));assert.deepEqual(drivers,[]);return{...result,worldDrivers:drivers};});
});}
const results=[];for(const kind of realmKinds){const native=run(kind,'native');for(const mode of ['solo','hosted'] as const){const retained=run(kind,mode);assert.deepEqual(retained.context,native.context,kind+' context');assert.deepEqual(retained.boss,native.boss,kind+' actual boss');assert.deepEqual(retained.reward.grants,native.reward.grants,kind+' raw native XP requests');assert.equal(retained.reward.dropDelta,native.reward.dropDelta,kind+' seeded native kill drops');assert.deepEqual(retained.objective,native.objective,kind+' native objective');results.push(retained);}results.push(native);}
const report={scope:'Actual four native realm plans, private solo context transfer, hosted onFirstWake, native ward dwell/boss/reward/objective/exit. Journey RNG differs before the separately seeded kill boundary; raw grants and kill drops compare at that boundary.',results,receipt:combatHash(JSON.stringify(results))};writeCombatProof('native-realm-contexts.json',report);console.log(JSON.stringify(report));
