import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
/** These are the four actual local phases, not a replacement campaign clock or
 * scheduler. The true campaign time is advanced once per test frame. */
const result=withSeededRandom(44770,()=>{const setup=nativeCampaignFixture(),defB=mintAdditionalNativeArea(setup);return refuseWorldCombat([setup.writer],calls=>{
 const all=birthActualNativeArea(setup),{ongoing:a,coordinator,authority,campaign}=all;
 const tick=(area:typeof a,label:string)=>{for(const stage of ['framePreActors','frameActors','frameEffects','frameLateBodies'] as const){console.log('RUN '+label+' '+stage);if(stage==='frameActors')area.combat[stage](1/60,1/60);else area.combat[stage](1/60);authority.assertAdmitted(area.assembly.input.scene);}};
 campaign.time+=1/60;tick(a,'occupied A');
 const hero=a.assembly.input.scene.player,sourceQueues={projectiles:a.progression.input.state.projectiles,zones:a.progression.input.state.zones},sourceId=a.assembly.input.scene.zone.id;
 coordinator.runFrom(a,()=>coordinator.loadZone(defB.id,sourceId));const b=coordinator.current;
 assert.notEqual(a,b);assert.equal(a.combat.isPresentLocalPlayer(),false);assert.equal(a.combat.frameSeats().length,0);assert.equal(b.combat.isPresentLocalPlayer(),true);
 const destinationBefore={life:hero.life,mana:hero.mana,pos:{...hero.pos},actors:b.assembly.input.scene.actors,projectiles:b.progression.input.state.projectiles,zones:b.progression.input.state.zones};
 campaign.time+=1/60;tick(a,'empty A');
 assert.equal(hero.life,destinationBefore.life,'empty source does not tick destination hero');assert.equal(hero.mana,destinationBefore.mana);assert.deepEqual(hero.pos,destinationBefore.pos);
 assert.equal(b.assembly.input.scene.actors,destinationBefore.actors);assert.equal(b.progression.input.state.projectiles,destinationBefore.projectiles);assert.equal(b.progression.input.state.zones,destinationBefore.zones);
 assert.equal(a.progression.input.state.projectiles,sourceQueues.projectiles);assert.equal(a.progression.input.state.zones,sourceQueues.zones);
 tick(b,'occupied B');assert.equal(authority.require(hero).combat,b.combat);assert.deepEqual(calls,[]);
 return{source:sourceId,destination:defB.id,sourceActors:a.assembly.input.scene.actors.length,destinationActors:b.assembly.input.scene.actors.length,stages:12,worldDrivers:calls};
});});const report={mode:'Actual four local frame phases in occupied A, departed A and occupied B. Campaign scheduler, hosted roads and native bootstrap remain separate.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-combat-local-frame.json',report);console.log(JSON.stringify(report));
