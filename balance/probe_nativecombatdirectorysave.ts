import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {loadCharacter} from '../src/meta/character';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
const result=withSeededRandom(44601,()=>{const setup=nativeCampaignFixture(),defB=mintAdditionalNativeArea(setup);return refuseWorldCombat([setup.writer],calls=>{
 const all=birthActualNativeArea(setup),{ongoing:a,coordinator,writer}=all;
 coordinator.runFrom(a,()=>coordinator.loadZone(defB.id,a.assembly.input.scene.zone.id));const b=coordinator.current;
 assert.deepEqual(coordinator.residentAreas(),[a,b]);assert.deepEqual(coordinator.occupiedAreas(),[b]);assert.equal(coordinator.nativeWorldReady(),true);const view=coordinator.simView();assert.equal(view.currentZoneId,defB.id);assert.deepEqual(view.presentZoneIds,[defB.id]);
 const counts=new Map([[a.assembly.input.scene.zone.id,0],[defB.id,0]]);for(const area of [a,b]){const memory=coordinator.departureFor(area.combat).memory,original=memory.snapshot;Object.defineProperty(memory,'snapshot',{configurable:true,value:function(this:typeof memory){counts.set(area.assembly.input.scene.zone.id,counts.get(area.assembly.input.scene.zone.id)!+1);return Reflect.apply(original,this,[]);}});}
 assert.equal(writer.companionBonds,b.progression.companionBonds);coordinator.saveCharacter();const saved=loadCharacter();assert.ok(saved?.world,'real writer creates same-process character mirror');assert.ok(saved.companions);assert.equal(saved.world.player?.zoneId,defB.id);for(const id of counts.keys())assert.equal(counts.get(id),1,'each actual memory owner captured exactly once');assert.ok(saved.world.memory?.some(row=>row.zoneId===defB.id));assert.ok(saved.world.memory?.some(row=>row.zoneId===a.assembly.input.scene.zone.id));
 return{resident:coordinator.residentAreas().map(area=>area.assembly.input.scene.zone.id),occupied:coordinator.occupiedAreas().map(area=>area.assembly.input.scene.zone.id),savedZone:saved.world.player?.zoneId,memoryCaptures:Object.fromEntries(counts),companions:saved.companions.length,worldDrivers:calls};
});});const report={mode:'Actual writer same-process storage mirror after two retained-area births/travel; exact once-per-owner memory capture. No disk/browser restart or cold Continue claim.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-combat-directory-save.json',report);console.log(JSON.stringify(report));
