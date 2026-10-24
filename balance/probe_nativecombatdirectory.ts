import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash,COMBAT_WORLD_METHODS} from './probe_nativecombatcycle';
// Actual scene directory methods are forbidden on the ordinary writer too.
for(const name of ['presentWorlds','atZone','occupiedAudience','noticeOccupied'])if(!COMBAT_WORLD_METHODS.includes(name))COMBAT_WORLD_METHODS.push(name);
const result=withSeededRandom(44821,()=>{const setup=nativeCampaignFixture(),defB=mintAdditionalNativeArea(setup);return refuseWorldCombat([setup.writer],calls=>{
 const {ongoing:a,coordinator,campaign,writer}=birthActualNativeArea(setup),idA=a.assembly.input.scene.zone.id,hero=writer.localSeat.actor;
 const av=coordinator.atZone(idA,view=>view)!;assert.equal(av.actors,a.assembly.input.scene.actors);assert.equal(av.player,hero);assert.deepEqual(campaign.presentWorlds(),[av]);assert.equal(Object.isFrozen(av),true);
 let absentCalled=false;assert.equal(coordinator.atZone('unregistered-native-destination',()=>{absentCalled=true;}),undefined);assert.equal(absentCalled,false);
 coordinator.runFrom(a,()=>coordinator.loadZone(defB.id,idA));const b=coordinator.current,bv=coordinator.atZone(defB.id,view=>view)!;
 assert.equal(coordinator.atZone(idA,view=>view),av,'actual resident view stable across departure');assert.equal(av.presentationActor,null);assert.throws(()=>av.player,/no physical/);assert.deepEqual(av.seats,[]);assert.equal(bv.player,hero);assert.deepEqual(bv.seats,[writer.localSeat]);assert.deepEqual(coordinator.presentWorlds(),[bv]);assert.deepEqual(campaign.presentWorlds(),[bv]);assert.equal(av.encounters,a.assembly.transition.encounters);assert.equal(av.theaterRuns,a.assembly.input.theater.input.state.theaterRuns);
 assert.equal(coordinator.occupiedAudience(z=>z.id===idA),null);assert.equal(coordinator.occupiedAudience(z=>z.id===defB.id),undefined);
 const before=writer.notices.length;coordinator.noticeOccupied([],'must not mint');assert.equal(writer.notices.length,before);const to=[writer.localSeat.id];coordinator.noticeOccupied(to,'actual retained audience','#123456',17,'events');assert.equal(writer.notices.length,before+1);assert.equal(writer.notices.at(-1)!.to,to);
 coordinator.runFrom(b,()=>coordinator.loadZone(idA,defB.id));assert.equal(av.presentationActor,hero);assert.equal(bv.presentationActor,null);assert.throws(()=>bv.player,/no physical/);assert.deepEqual(campaign.presentWorlds(),[av]);assert.equal(coordinator.atZone(defB.id,view=>view),bv);
 return{source:idA,destination:defB.id,registeredResidents:coordinator.residentAreas().length,occupied:coordinator.presentWorlds().map(v=>v.zone.id),absentCallback:absentCalled,noticeDelta:writer.notices.length-before,worldDrivers:calls};
 });});const report={mode:'Actual stable resident directory, physical audience after A→B→A, native global notice writes, and campaign quest-seat reader. No acceptance of not-yet-composed aggregate mutation endpoints or hosted ticket execution.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-combat-directory.json',report);console.log(JSON.stringify(report));
