import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import type {TraversalState} from '../src/engine/traversal';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
const result=withSeededRandom(44701,()=>{const setup=nativeCampaignFixture(),defB=mintAdditionalNativeArea(setup);return refuseWorldCombat([setup.writer],calls=>{
 const all=birthActualNativeArea(setup),{ongoing:a,coordinator,writer}=all,hero=writer.localSeat.actor,events:string[]=[];
 const owner=a.combat.campaignTransitions;
 owner.updateTraversal(.1);assert.equal(writer.traversal,null,'native null traversal remains an actor-free no-op');
 function swap(this:TraversalState){assert.equal(this,writer.traversal);events.push('swap:'+coordinator.current.assembly.input.scene.zone.id);coordinator.loadZone(defB.id,a.assembly.input.scene.zone.id);}
 function done(this:TraversalState){assert.equal(writer.traversal,null,'native clear happens before done');assert.equal(this,record);events.push('done:'+coordinator.current.assembly.input.scene.zone.id);}
 Object.defineProperty(swap,'apply',{get(){throw Error('selected callback own apply must not be read');}});Object.defineProperty(done,'call',{get(){throw Error('selected callback own call must not be read');}});
 assert.equal(owner.beginTraversal('sky_launch',{swap,done}),true);const record=writer.traversal!;
 assert.throws(()=>record.swap!(),/expired|foreign/,'only the native selected traversal step may invoke swap');
 assert.throws(()=>record.done!(),/expired|foreign/,'done cannot be manually issued before completion');
 assert.equal(owner.beginTraversal('sky_launch'),false,'native already-running return stays false');
 owner.updateTraversal(record.def.windup);assert.equal(record.phase,'rise');owner.updateTraversal(record.def.rise);const b=coordinator.current;assert.notEqual(b,a);assert.equal(record.phase,'land');assert.equal(all.authority.require(hero).scene,b.assembly.input.scene);assert.equal(events.length,1);
 b.combat.campaignTransitions.updateTraversal(record.def.land);assert.equal(writer.traversal,null);assert.equal(hero.invulnerable,false);assert.equal(hero.untargetable,false);assert.ok(hero.statuses.some(s=>s.id==='windswept'));assert.deepEqual(events,['swap:'+a.assembly.input.scene.zone.id,'done:'+defB.id]);
 assert.throws(()=>record.swap!(),/expired|foreign/);assert.throws(()=>record.done!(),/expired|foreign/);b.combat.campaignTransitions.updateTraversal(9);assert.equal(events.length,2);
 const cancelEvents:string[]=[];assert.equal(b.combat.campaignTransitions.beginTraversal('sky_launch',{swap:()=>cancelEvents.push('swap'),done:()=>cancelEvents.push('done')}),true);const canceled=writer.traversal!;writer.traversal=null;assert.throws(()=>canceled.swap!(),/expired|foreign/);assert.throws(()=>canceled.done!(),/expired|foreign/);b.combat.campaignTransitions.updateTraversal(9);assert.deepEqual(cancelEvents,[]);
 const marker=Error('actual done callback failure');let entered=0;assert.equal(b.combat.campaignTransitions.beginTraversal('sky_launch',{done(){entered++;throw marker;}}),true);const partial=writer.traversal!;b.combat.campaignTransitions.updateTraversal(partial.def.windup);b.combat.campaignTransitions.updateTraversal(partial.def.rise);assert.throws(()=>b.combat.campaignTransitions.updateTraversal(partial.def.land),e=>e===marker);assert.equal(entered,1);assert.equal(writer.traversal,null);assert.equal(hero.invulnerable,false);assert.equal(hero.untargetable,false);assert.throws(()=>partial.done!(),/expired|foreign/);assert.equal(entered,1);
 return{events,canceledCallbacks:cancelEvents.length,partialFailureCalls:entered,finalZone:coordinator.current.assembly.input.scene.zone.id,worldDrivers:calls};
});});const report={mode:'Actual retained shared native begin/update traversal with labeled callback fixtures, genuine first-visit swap, private continuation receipt, cancellation and native late failure. Not an authored gate or complete scheduler course.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-combat-traversal.json',report);console.log(JSON.stringify(report));
