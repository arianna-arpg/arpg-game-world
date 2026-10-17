import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {NativeAreaCampaignFrameState} from '../src/worldmass/nativeAreaCampaignFrameState';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
const result=withSeededRandom(44775,()=>{const setup=nativeCampaignFixture(),defB=mintAdditionalNativeArea(setup);return refuseWorldCombat([setup.writer],calls=>{
 const all=birthActualNativeArea(setup),{ongoing:a,coordinator,writer}=all,state=NativeAreaCampaignFrameState.forWriter(writer);
 state.campfireCd=10;state.bountyWatchAccum=.1;state.traceRests.set(771,123);state.pingClocks.set('p0',456);state.wraithsailSighted=true;state.bountyReceipt={boardId:'proof-board',title:'actual receipt data',pay:'',failed:false,at:0};const receipt=state.bountyReceipt,rests=state.traceRests,pings=state.pingClocks;
 a.combat.campaignFrame.tick(1/60);assert.equal(state.campfireCd,10-1/60);
 coordinator.runFrom(a,()=>coordinator.loadZone(defB.id,a.assembly.input.scene.zone.id));const b=coordinator.current;
 assert.equal(NativeAreaCampaignFrameState.forWriter(writer),state);b.combat.campaignFrame.tick(1/60);assert.equal(state.campfireCd,10-1/60-1/60,'one cooldown decrement with two retained areas');
 assert.equal(state.traceRests,rests);assert.equal(state.pingClocks,pings);assert.equal(state.traceRests.get(771),123);assert.equal(state.pingClocks.get('p0'),456);assert.equal(state.bountyReceipt,receipt);assert.equal(state.wraithsailSighted,true);
 for(const field of ['campfireCd','bountyWatchAccum','traceRests','pingClocks','bountyReceipt','wraithsailSighted','shelfBuyer'])for(const area of [a,b])assert.equal(Object.hasOwn(area.combat.runtimeState.frame,field),false,'no duplicate local slot '+field);
 assert.deepEqual(calls,[]);return{cooldown:state.campfireCd,sharedRawMaps:true,sameReceipt:true,sameVoyageMarker:true,noDuplicatedSlots:true,worldDrivers:calls};
});});const report={result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-combat-shared-state.json',report);console.log(JSON.stringify(report));
