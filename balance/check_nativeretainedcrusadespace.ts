import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {realmSetup,stageRealm} from './nativeRealmEntryFixture';
import {birthActualNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat} from './probe_nativecombatcycle';
import {GridWalkField} from '../src/world/gridWalk';
import {serializeNativeAreaData} from '../src/worldmass/nativeAreaGeometry';
import {ResolvedStructureSeatError} from '../src/engine/levelgen';

const result=withSeededRandom(46115,()=>{
 const setup=realmSetup(),w=setup.writer;
 return refuseWorldCombat([w],drivers=>{
  const r=birthActualNativeArea(setup),source=r.ongoing,s=stageRealm(setup,'crusade',source);
  const enter=()=>r.coordinator.runFrom(source,()=>source.combat.campaignFrame.realmGates().find(g=>g.key===s.gate)!.enter());
  enter();const realm=r.coordinator.current,exit=w.exits.find(e=>e.to===setup.definition.id)!;assert(exit);
  const g=source.assembly.input.geometry,actors=source.combat.scene.actors,originals=[...actors];
  const wound=originals.find(a=>!a.dead&&a.team==='enemy'&&a.maxLife()>1)!;assert(wound);wound.life=Math.max(1,wound.life-7);
  const resources=originals.map(a=>[a,a.life,a.mana,a.es,a.dead] as const),roots=[g.walk,g.doodads,g.structures,g.fog];
  const geometry=()=>serializeNativeAreaData({walk:g.walk instanceof GridWalkField?g.walk.pack():null,doodads:g.doodads,structures:g.structures});
  const before=geometry(),field=w.sim.crusadeField!,query=field.crusadeOn;
  const leave=()=>realm.combat.campaignFrame.travelThrough(exit);
  // Matching text and even a publicly constructed error must still propagate
  // from the selected event query; only the actual spatial fit is deferrable.
  for(const sentinel of [Error('resolved structure has no whole admissible seat'),new ResolvedStructureSeatError('selected query sentinel')]){
   field.crusadeOn=function(id){if(id===setup.definition.id)throw sentinel;return Reflect.apply(query,this,[id]);};
   try{assert.throws(leave,e=>e===sentinel);}finally{field.crusadeOn=query;}
   assert.equal(r.coordinator.current,realm);assert.equal(geometry(),before);
  }
  const refresh=source.combat.refreshCrusadeTerrain;let calls=0,fit:boolean|undefined;
  source.combat.refreshCrusadeTerrain=function(){calls++;return fit=Reflect.apply(refresh,this,[]);};
  try{leave();}finally{source.combat.refreshCrusadeTerrain=refresh;}
  assert.equal(calls,1);assert.equal(fit,false);assert.equal(r.coordinator.current,source);
  assert.deepEqual([g.walk,g.doodads,g.structures,g.fog],roots);assert.equal(geometry(),before);
  for(const [a,life,mana,es,dead]of resources){assert(actors.includes(a));assert.equal(a.life,life);assert.equal(a.mana,mana);assert.equal(a.es,es);assert.equal(a.dead,dead);}
  r.authority.assertAdmitted(source.assembly.input.scene);r.authority.assertAdmitted(realm.assembly.input.scene);
  enter();assert.equal(r.coordinator.current,realm);assert.deepEqual(drivers,[]);
  return{blockedWorksDeferred:true,originalGeometry:true,originalBodies:resources.length,originalResources:true,selectedQueryErrorsPropagate:2,realReturnAndReentry:true,worldDrivers:drivers};
 });
});
console.log('PASS retained Crusade spatial refusal',JSON.stringify(result));

