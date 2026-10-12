import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof} from './probe_nativecombatcycle';
const result=withSeededRandom(440991,()=>{const setup=nativeCampaignFixture();return refuseWorldCombat([setup.writer],calls=>{const all=birthActualNativeArea(setup),{ongoing,authority,writer}=all;assert.equal(ongoing.assembly.phase,'born');authority.assertAdmitted(ongoing.assembly.input.scene);assert.ok(ongoing.assembly.input.scene.actors.length>1);assert.equal(writer.actors,ongoing.assembly.input.scene.actors);return{mode:'Actual installed native birth, admission and initial publication; no complete frame/tick claim',actors:writer.actors.length,zone:writer.zone.id,phase:ongoing.assembly.phase,worldDrivers:calls};});});writeCombatProof('native-combat-actual-construction.json',result);console.log(JSON.stringify(result));
