import assert from 'node:assert/strict';
import {withDelayedDelver} from './nativeDelayedArrivalFixture';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const result=withDelayedDelver(c=>{
 const geometry=c.cave.assembly.input.geometry,owner=c.cave.assembly.input.descent,selected=geometry.clearTransitSpot,prior=Object.getOwnPropertyDescriptor(geometry,'clearTransitSpot'),marker=Error('actual transit completion followed by failure');
 Object.defineProperty(geometry,'clearTransitSpot',{configurable:true,value:function(this:typeof geometry,...args:Parameters<typeof selected>){Reflect.apply(selected,this,args);throw marker;}});
 try{assert.throws(()=>c.enter(),e=>e===marker);}finally{if(prior)Object.defineProperty(geometry,'clearTransitSpot',prior);else Reflect.deleteProperty(geometry,'clearTransitSpot');}
 const keeper=c.cave.combat.scene.actors.find(a=>a.tag==='descent_delver');assert(keeper);assert.equal(c.native.authority.require(keeper).combat,c.cave.combat);
 const before={platforms:geometry.doodads.filter(d=>d.kind==='descent_platform').length,site:geometry.descentSite,ledger:c.writer.ledger.delvers_seen??0,stock:owner.input.state.descentStock};
 let error:unknown;try{owner.arriveDelayedDelver(c.cave.combat.scene.zone);}catch(e){error=e;}
 const after={platforms:geometry.doodads.filter(d=>d.kind==='descent_platform').length,site:geometry.descentSite,ledger:c.writer.ledger.delvers_seen??0,stock:owner.input.state.descentStock};
 const facts={error:error instanceof Error?error.message:null,platformsBefore:before.platforms,platformsAfter:after.platforms,ledgerBefore:before.ledger,ledgerAfter:after.ledger,siteChanged:after.site!==before.site,worldDrivers:c.calls};
 console.log(JSON.stringify(facts));assert(error instanceof Error,'unissued owner continuation must refuse');assert.deepEqual(after,before,'unissued continuation must preserve existing native partial effects');
 c.exit();c.enter();assert.equal(c.cave.combat.scene.actors.filter(a=>a.tag==='descent_delver').length,1);assert(geometry.descentSite);return facts;
});writeCombatProof('native-delayed-unissued-review.json',{result,receipt:combatHash(JSON.stringify(result))});
