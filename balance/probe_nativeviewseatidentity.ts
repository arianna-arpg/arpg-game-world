import assert from 'node:assert/strict';
import type {Seat} from '../src/engine/world';
import {withSeededRandom} from '../src/core/rng';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,combatHash,writeCombatProof} from './probe_nativecombatcycle';
const result=withSeededRandom(45925,()=>{const setup=nativeCampaignFixture(45925);return refuseWorldCombat([setup.writer],calls=>{const {writer,ongoing:a}=birthActualNativeArea(setup),seat=writer.localSeat,hero=seat.actor,leaf=a.combat.restoration,before=hero.absorb,flashes=a.assembly.input.geometry.flashes.length;let metaReads=0,refusals=0;
 assert.throws(()=>leaf.grantAbsorb(hero,before+31,7),/not active|Expired or nested native combat operation/);
 const fake=Object.assign({},seat) as Seat;Object.defineProperty(fake,'meta',{enumerable:true,configurable:true,get(){metaReads++;leaf.grantAbsorb(hero,before+31,7);return seat.meta;}});assert.equal(writer.seats.includes(fake),false);
 for(const key of ['seatModeDef','seatStageDef','speechFocusTarget'] as const){assert.throws(()=>writer[key](fake),/actual physical seat/);refusals++;assert.equal(metaReads,0);assert.equal(hero.absorb,before);assert.equal(a.assembly.input.geometry.flashes.length,flashes);}
 assert.ok(writer.seatModeDef(seat));writer.seatStageDef(seat);writer.speechFocusTarget(seat);
 writer.localSeat=fake;try{assert.throws(()=>writer.objectiveText(),/actual physical seat/);refusals++;}finally{writer.localSeat=seat;}
 assert.equal(metaReads,0);assert.equal(hero.absorb,before);assert.equal(a.assembly.input.geometry.flashes.length,flashes);assert.deepEqual(calls,[]);
 return{refusals,actualSeatQueries:3,fakeSeatInRoster:false,actorGenuineAndPhysical:a.combat.scene.actors.includes(hero),forgedMetaReads:metaReads,absorbBefore:before,absorbAfter:hero.absorb,flashesAdded:0,worldDrivers:calls};});});
const report={scope:'Actual forged Seat callback is rejected before native operation scope, including an ordinary forged localSeat slot. Genuine physical seat queries remain callable.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-view-seat-identity.json',report);console.log(JSON.stringify(report));
