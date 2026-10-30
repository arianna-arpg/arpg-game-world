import assert from 'node:assert/strict';
import {actualConclave} from './nativeConclaveLifetimeFixture';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const modes=['snapshotThrow','incubateThrow','incubateLate','memoryLate','retirementSelection','sameIdRestore','borrowedSite'] as const;
const rows=modes.map(mode=>actualConclave(c=>{
 const {w,cf,n,a,b,area,state,site,bodies,departure,travel}=c,marker=Error('Conclave '+mode),old=cf.incubationCounter,ledger=w.ledger.rituals_incubated??0;
 let calls=0,restore=()=>{};
 const override=(object:object,key:PropertyKey,descriptor:PropertyDescriptor)=>{const before=Object.getOwnPropertyDescriptor(object,key);Object.defineProperty(object,key,{configurable:true,...descriptor});restore=()=>{if(before)Object.defineProperty(object,key,before);else Reflect.deleteProperty(object,key);};};
 if(mode==='snapshotThrow')override(departure.memory,'snapshot',{get(){throw marker;}});
 if(mode==='incubateThrow')override(cf,'incubate',{get(){throw marker;}});
 if(mode==='incubateLate'){const original=cf.incubate;override(cf,'incubate',{value:function(this:typeof cf,id:string){calls++;Reflect.apply(original,this,[id]);throw marker;}});}
 if(mode==='memoryLate'){const memory=n.campaign.zoneMemory,original=memory.set;override(memory,'set',{value:function(this:typeof memory,...args:Parameters<typeof original>){calls++;Reflect.apply(original,this,args);throw marker;}});}
 if(mode==='retirementSelection')override(area.combat.scene.actors,'splice',{get(){throw marker;}});
 if(mode==='sameIdRestore'){const original=departure.memory.snapshot;override(departure.memory,'snapshot',{get(){cf.restore(cf.snapshot());return function(this:typeof departure.memory){calls++;return Reflect.apply(original,this,[]);};}});}
 if(mode==='borrowedSite'){state.ritualSite={...site,cultistIds:[...site.cultistIds]};}
 let error:unknown;try{travel(b);}catch(e){error=e;}assert(error,'expected native departure refusal');
 if(mode!=='sameIdRestore'&&mode!=='borrowedSite')assert.equal(error,marker,'original selected error preserved');
 if(mode==='sameIdRestore')assert.equal(calls,0,'replaced epoch refuses selected snapshot before invocation');
 const spent=['incubateLate','memoryLate','retirementSelection'].includes(mode);assert.equal(cf.incubationCounter,old+(spent?1:0));assert.equal(w.ledger.rituals_incubated??0,ledger+(['memoryLate','retirementSelection'].includes(mode)?1:0));assert.equal(w.zone.id,a,'failed handoff has not moved actual local seat');
 const physicallyRemaining=bodies.filter(x=>area.combat.scene.actors.includes(x)).length;
 assert.equal(physicallyRemaining,['incubateLate','memoryLate'].includes(mode)?0:5);
 restore();
 if(!['sameIdRestore','borrowedSite'].includes(mode)){travel(b);assert.equal(cf.incubationCounter,old+1);assert.equal(state.ritualSite,null);assert.equal(bodies.some(x=>area.combat.scene.actors.includes(x)),false);assert.equal(w.ledger.rituals_incubated??0,ledger+(mode==='incubateLate'?0:1),'missed native ledger write is never synthesized');}
 assert.deepEqual(c.calls,[]);n.coordinator.retire();return{mode,calls,spent,physicallyRemaining,originalErrorPreserved:mode!=='sameIdRestore'&&mode!=='borrowedSite',worldDrivers:c.calls};
}));writeCombatProof('native-conclave-boundaries.json',{rows,receipt:combatHash(JSON.stringify(rows))});console.log(JSON.stringify(rows));
