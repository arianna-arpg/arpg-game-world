import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {sceneBegin} from '../src/engine/scenes';
import {makeSimWorld} from '../src/sim/arena';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
function actualScene(seed:number){const w=makeSimWorld('warrior',seed);assert.equal(sceneBegin(w,'prologue'),true);assert.ok(w.scene);const scene=w.scene;w.loadZone(w.zone.id);assert.equal(w.scene,scene,'ordinary native loadZone preserves the exact actual scene');return scene;}
const first=withSeededRandom(44921,()=>actualScene(992)),other=withSeededRandom(44922,()=>actualScene(993));
const result=withSeededRandom(44923,()=>{const setup=nativeCampaignFixture(),defB=mintAdditionalNativeArea(setup);return refuseWorldCombat([setup.writer],calls=>{
 const {ongoing:a,coordinator,authority,writer}=birthActualNativeArea(setup),hero=writer.localSeat.actor,idA=a.assembly.input.scene.zone.id;
 // Explicit record adoption fixture: the runtime is genuinely created by native sceneBegin;
 // actual retained director initiation is separately gated on the real composed owner.
 a.quests.input.state.scene=first;assert.equal(writer.scene,first);coordinator.runFrom(a,()=>coordinator.loadZone(defB.id,idA));const b=coordinator.current;
 assert.equal(b.quests.input.state.scene,first);assert.equal(writer.scene,first);assert.equal(a.quests.input.state.scene,null);assert.equal(authority.require(hero).combat,b.combat);
 coordinator.runFrom(b,()=>coordinator.loadZone(idA,defB.id));assert.equal(a.quests.input.state.scene,first);assert.equal(b.quests.input.state.scene,null);assert.equal(writer.scene,first);
 b.quests.input.state.scene=other;const sourceCensus=a.assembly.input.scene.actors,destCensus=b.assembly.input.scene.actors;
 assert.throws(()=>coordinator.runFrom(a,()=>coordinator.loadZone(defB.id,idA)),/distinct running scene/);assert.equal(coordinator.current,a);assert.equal(coordinator.published,a);assert.equal(sourceCensus.includes(hero),true);assert.equal(destCensus.includes(hero),false);assert.equal(authority.require(hero).combat,a.combat);assert.equal(a.quests.input.state.scene,first);assert.equal(b.quests.input.state.scene,other);
 b.quests.input.state.scene=null;coordinator.runFrom(a,()=>coordinator.loadZone(defB.id,idA));assert.equal(writer.scene,first);assert.equal(a.quests.input.state.scene,null);assert.equal(b.quests.input.state.scene,first);authority.assertAdmitted(a.assembly.input.scene);authority.assertAdmitted(b.assembly.input.scene);
 return{sceneId:first.def.id,nativeScenePreserved:true,distinctDestinationRefused:true,validRetry:true,source:idA,destination:defB.id,worldDrivers:calls};
 });});const report={mode:'Native World-created prologue SceneRuntime explicitly adopted as fixture metadata; actual retained A→B→A handoff preserves the same reference and rejects a distinct destination before physical transfer, then valid retry. Full retained sceneBegin/Mu and remote-only travel remain separate.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-combat-scene-carry.json',report);console.log(JSON.stringify(report));
