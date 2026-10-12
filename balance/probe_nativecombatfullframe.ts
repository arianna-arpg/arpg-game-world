import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
const result=withSeededRandom(44771,()=>{const setup=nativeCampaignFixture(),defB=mintAdditionalNativeArea(setup);return refuseWorldCombat([setup.writer],calls=>{
 const all=birthActualNativeArea(setup),{ongoing:a,coordinator,authority,campaign}=all;
 const tick=(label:string)=>{console.log('RUN '+label);const before=campaign.time;coordinator.published.combat.campaignFrame.tick(1/60);assert.equal(campaign.time,before+1/60,'one campaign clock advance');for(const area of coordinator.residentAreas())authority.assertAdmitted(area.assembly.input.scene);};
 tick('occupied A complete frame');
 const sourceId=a.assembly.input.scene.zone.id,hero=a.assembly.input.scene.player;
 coordinator.runFrom(a,()=>coordinator.loadZone(defB.id,sourceId));const b=coordinator.current;
 assert.notEqual(a,b);assert.equal(a.combat.isPresentLocalPlayer(),false);assert.equal(b.combat.isPresentLocalPlayer(),true);
 tick('empty A and occupied B complete frame');assert.equal(authority.require(hero).combat,b.combat);assert.deepEqual(calls,[]);
 return{source:sourceId,destination:defB.id,sourceActors:a.assembly.input.scene.actors.length,destinationActors:b.assembly.input.scene.actors.length,time:campaign.time,frames:2,worldDrivers:calls};
});});const report={mode:'Actual complete campaign tick on authentic installed null-Mass areas; new native bootstrap ports remain separately unresolved.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-combat-full-frame.json',report);console.log(JSON.stringify(report));
