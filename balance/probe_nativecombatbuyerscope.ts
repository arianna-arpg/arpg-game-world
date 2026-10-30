import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {CLASSES} from '../src/data/classes';
import {VENDORS} from '../src/data/vendors';
import {NullInput} from '../src/net/intent';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
const result=withSeededRandom(44774,()=>{const setup=nativeCampaignFixture();const remote=setup.writer.addSeat('buyer-peer',CLASSES.find(c=>c.id==='warrior')!,new NullInput(),{startingCompanions:false,startingFlasks:false});return refuseWorldCombat([setup.writer],calls=>{
 const all=birthActualNativeArea(setup),{ongoing:a,writer}=all,scene=a.assembly.input.scene;scene.actors.push(remote.actor);remote.actor.pos={...scene.player.pos};a.admit([...scene.actors]);const previousKeeper=writer.localSeat.keeper;writer.localSeat.keeper={reviveSec:0};
 const vendor=VENDORS.find(v=>v.holds?.locks)!;assert(vendor);const original=vendor.near,sentinel=Error('selected native vendor callback failure');let selected=0;const previous=Reflect.get(writer,'shelfBuyer');
 vendor.near=function(...args:Parameters<typeof original>){selected++;assert.equal(Reflect.get(writer,'shelfBuyer')===remote,true,'actual writer getters use selected buyer');Reflect.apply(original,this,args);throw sentinel;};
 try{let caught:unknown;try{a.combat.campaignFrame.applyActionAs(remote,{t:'vendorLock',vendor:vendor.id,index:0,on:true});}catch(error){caught=error;}if(caught!==sentinel)throw caught??Error('native vendor did not invoke selected callback');assert.equal(selected,1);assert.equal(Reflect.get(writer,'shelfBuyer'),previous,'native finally restores exact previous selector');}finally{vendor.near=original;writer.localSeat.keeper=previousKeeper;}
 assert.deepEqual(calls,[]);return{actualBuyerSelected:true,nativeCallbackOnce:true,exactCallbackFailure:true,nativeFinallyRestored:true,worldDrivers:calls};
});});const report={result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-combat-buyer-scope.json',report);console.log(JSON.stringify(report));
