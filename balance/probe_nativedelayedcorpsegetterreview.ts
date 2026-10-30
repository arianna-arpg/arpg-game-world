import assert from 'node:assert/strict';
import {withSplitParty} from './nativePartyDeathFixture';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const rows:unknown[]=[];
rows.push(withSplitParty(c=>{const provider=c.a.assembly.input.history,selected=provider.corpseRecords,prior=Object.getOwnPropertyDescriptor(provider,'corpseRecords');let calls=0,applyReads=0;
 const fn=function(this:typeof provider,...args:Parameters<typeof selected>){assert.equal(this,provider);calls++;return Reflect.apply(selected,this,args);};Object.defineProperty(fn,'apply',{get(){applyReads++;throw Error('selected corpseRecords own apply must not run');}});Object.defineProperty(provider,'corpseRecords',{configurable:true,value:fn});
 let error:unknown;try{c.coordinator.runFrom(c.a,()=>c.coordinator.loadZone(c.b.combat.scene.zone.id,c.a.combat.scene.zone.id));c.coordinator.runFrom(c.b,()=>c.coordinator.loadZone(c.a.combat.scene.zone.id,c.b.combat.scene.zone.id));}catch(e){error=e;}finally{if(prior)Object.defineProperty(provider,'corpseRecords',prior);else Reflect.deleteProperty(provider,'corpseRecords');}
 const facts={kind:'actual history corpseRecords',calls,applyReads,error:error instanceof Error?error.message:null,worldDrivers:c.calls};console.log(JSON.stringify(facts));assert.equal(applyReads,0);assert.equal(error,undefined);assert.equal(calls,1);return facts;}));
writeCombatProof('native-delayed-corpse-getter-review.json',{rows,receipt:combatHash(JSON.stringify(rows))});
