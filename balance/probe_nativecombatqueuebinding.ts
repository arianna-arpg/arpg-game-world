import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withSeededRandom} from '../src/core/rng';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat} from './probe_nativecombatcycle';
const result=withSeededRandom(44661,()=>{const setup=nativeCampaignFixture(),other=mintAdditionalNativeArea(setup);return refuseWorldCombat([setup.writer],calls=>{
 const a=birthActualNativeArea(setup),first=a.ongoing.combat,otherId=other.id;assert.notEqual(otherId,first.scene.zone.id);
 const second=a.preparation.prepare(otherId,a.geography).combat;
 // These are the actual stable hosts captured by the real Assaults controller;
 // this test inspects their live queue slots without manufacturing a provider.
 const hostA=Reflect.get(first.runtimeState.assaults,'w'),hostB=Reflect.get(second.runtimeState.assaults,'w');
 const aProjectiles=first.state.projectiles,bZones=second.state.zones;
 assert.throws(()=>Reflect.set(hostA,'projectiles',bZones),/belongs|storage|store/i);
 assert.equal(first.state.projectiles,aProjectiles);assert.equal(Reflect.get(hostB,'zones'),bZones,'refused assignment must not poison peer record-storage identity');
 const aZones=first.state.zones;const replacement:typeof aZones=[];assert.equal(Reflect.set(hostA,'zones',replacement),true);assert.equal(first.state.zones,replacement);
 assert.throws(()=>Reflect.set(hostA,'pendingBursts',aZones),/belongs|storage|store/i);assert.equal(Reflect.set(hostA,'zones',aZones),true);assert.equal(Reflect.get(hostA,'zones'),aZones,'own same-slot historical storage remains valid');
 const bReward=second.killAftermath.input.state.deathBursts,aBursts=first.runtimeState.pendingBursts;
 assert.throws(()=>Reflect.set(hostA,'pendingBursts',bReward),/belongs|storage|store/i);assert.equal(first.runtimeState.pendingBursts,aBursts);assert.equal(Reflect.get(hostB,'deathBursts'),bReward);
 assert.equal(calls.length,0);return{worldDrivers:calls.length,firstBorn:a.ongoing.assembly.phase,secondPhase:second.input.assembly.phase,refusedCrossOwners:2,refusedCrossKinds:1,sameSlotHistoricalRestore:true,peerGettersPreserved:true};
 });});fs.writeFileSync(new URL('../../QUEUE-ENTRY-RESULT.v5.json',import.meta.url),JSON.stringify({status:'PASS',boundary:'Actual born A and actually prepared/registered B raw storage ownership; no B gameplay activation claim',result},null,2)+'\n');console.log(JSON.stringify(result,null,2));
