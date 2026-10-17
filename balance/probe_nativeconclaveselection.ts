import assert from 'node:assert/strict';
import {actualConclave} from './nativeConclaveLifetimeFixture';
import {CLASSES} from '../src/data/classes';
import {RemoteInput} from '../src/net/remote';
import type {Seat} from '../src/engine/world';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const rows=['getterPeer','bodyPeer','snapshotMeta'].map(mode=>actualConclave(c=>{
 const {w,cf,n,b,area,state,site,bodies,departure,travel}=c;let selectedCalls=0,peer:Seat|undefined;const counter=cf.incubationCounter,meta=w.localSeat.meta;
 const add=()=>area.combat.party.addSeat('callback-peer',CLASSES.find(x=>x.id==='warrior')!,new RemoteInput('callback-peer'),{startingCompanions:false,startingFlasks:false});
 const target=mode==='snapshotMeta'?departure.memory:cf,key=mode==='snapshotMeta'?'snapshot':'incubate',old=Object.getOwnPropertyDescriptor(target,key),original=Reflect.get(target,key);
 if(mode==='getterPeer')Object.defineProperty(target,key,{configurable:true,get(){peer=add();return function(this:unknown,...args:unknown[]){selectedCalls++;return Reflect.apply(original,this,args);};}});
 if(mode==='bodyPeer')Object.defineProperty(target,key,{configurable:true,value:function(this:unknown,...args:unknown[]){selectedCalls++;const result=Reflect.apply(original,this,args);peer=add();return result;}});
 if(mode==='snapshotMeta')Object.defineProperty(target,key,{configurable:true,get(){w.localSeat.meta={...meta};return function(this:unknown,...args:unknown[]){selectedCalls++;return Reflect.apply(original,this,args);};}});
 try{assert.throws(()=>travel(b),/changed|selection|seat|departure/i);}finally{if(old)Object.defineProperty(target,key,old);else Reflect.deleteProperty(target,key);w.localSeat.meta=meta;}
 assert.equal(selectedCalls,mode==='bodyPeer'?1:0);assert.equal(cf.incubationCounter,counter+(mode==='bodyPeer'?1:0));assert.equal(state.ritualSite,site);assert(bodies.every(x=>area.combat.scene.actors.includes(x)));
 if(peer){area.combat.campaignFrame.enableHostedRoads();const move=(seat:Seat)=>{const from=n.coordinator.areaFor(n.authority.require(seat.actor).combat);n.coordinator.roadsFor(from.combat).shardWorld!.enqueue({seatId:seat.id,dest:b});const result=from.combat.campaignFrame.drainShardRoads()[0];if(result?.outcome==='failed')throw result.error;assert.equal(result?.outcome,'moved');};move(w.localSeat);assert.equal(state.ritualSite,site);move(peer);}else travel(b);
 assert.equal(cf.incubationCounter,counter+1);assert.equal(state.ritualSite,null);assert.deepEqual(c.calls,[]);n.coordinator.retire();return{mode,selectedCalls,completedNativeEffect:mode==='bodyPeer',eventuallyCleaned:true,worldDrivers:c.calls};
}));writeCombatProof('native-conclave-selection.json',{rows,receipt:combatHash(JSON.stringify(rows))});console.log(JSON.stringify(rows));
