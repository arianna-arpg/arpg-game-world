import assert from 'node:assert/strict';
import {actualConclave} from './nativeConclaveLifetimeFixture';
import {NativeAreaCombatOperation} from '../src/worldmass/nativeAreaCombatOperation';
import {nativeUnclaimedActor} from '../src/worldmass/nativeAreaActorAuthority';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const rows=['beforeRelease','afterRelease','paintBefore','paintAfter'].map(mode=>actualConclave(c=>{
 const {cf,n,b,area,state,site,bodies,travel}=c,marker=Error('Conclave retry '+mode),counter=cf.incubationCounter,geometry=area.combat.input.assembly.input.geometry;let calls=0;
 const target=mode.startsWith('paint')?geometry:NativeAreaCombatOperation.prototype,key=mode.startsWith('paint')?'markDoodadsChanged':'retireCombatBody';const original=Object.getOwnPropertyDescriptor(target,key);const fn=Reflect.get(target,key);assert.equal(typeof fn,'function');
 Object.defineProperty(target,key,{configurable:true,value:function(this:unknown,...args:unknown[]){if(key==='retireCombatBody'&&args[0]!==bodies[0])return Reflect.apply(fn,this,args);calls++;if(mode==='afterRelease'||mode==='paintAfter')Reflect.apply(fn,this,args);throw marker;}});
 try{assert.throws(()=>travel(b),e=>e===marker);assert.equal(cf.incubationCounter,counter+1);assert.equal(state.ritualSite,site);assert.equal(area.combat.scene.actors.includes(bodies[0]),false);
  if(mode==='beforeRelease')assert.throws(()=>Reflect.apply(nativeUnclaimedActor,n.authority,[bodies[0]]));else Reflect.apply(nativeUnclaimedActor,n.authority,[bodies[0]]);
 }finally{if(original)Object.defineProperty(target,key,original);else Reflect.deleteProperty(target,key);}
 travel(b);assert.equal(state.ritualSite,null);assert.equal(cf.incubationCounter,counter+1);assert.equal(bodies.some(x=>area.combat.scene.actors.includes(x)),false);for(const body of bodies)Reflect.apply(nativeUnclaimedActor,n.authority,[body]);assert.deepEqual(c.calls,[]);n.coordinator.retire();return{mode,calls,realPartialRemoval:true,retryCompletes:true,noRepeatedIncubation:true,worldDrivers:c.calls};
}));writeCombatProof('native-conclave-retirement.json',{rows,receipt:combatHash(JSON.stringify(rows))});console.log(JSON.stringify(rows));
