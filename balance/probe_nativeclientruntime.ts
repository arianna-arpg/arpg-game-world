import '../src/engine/world';
import assert from 'node:assert/strict';
import {NativeClientRuntime,nativeClientRuntimeFor} from '../src/worldmass/nativeClientRuntime';
import {withSeededRandom} from '../src/core/rng';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
import {clientSetup} from './nativeClientRuntimeFixture';
const result=withSeededRandom(450991,()=>{const setup=clientSetup(),{writer,definition,destination,geography}=setup,original=Object.getOwnPropertyDescriptors(writer);return refuseWorldCombat([writer],worldDrivers=>{
 const runtime=new NativeClientRuntime({writer,definition,geography:geography.spec});assert.equal(nativeClientRuntimeFor(writer),runtime);assert.equal(runtime.ready,false);const initialTime=writer.time;assert.equal(runtime.dispatch({dt:1/60,wallSeconds:1/60,inputs:new Map()}).ready,false);assert.equal(writer.time,initialTime);
 runtime.install();const a=runtime.current,coordinator=a.combat.input.coordinator;assert.equal(runtime.ready,true);assert.equal(a.assembly.phase,'born');assert(writer.actors.length>1);
 const t=writer.time,r1=runtime.dispatch({dt:1/60,wallSeconds:1/60,inputs:new Map()});assert.equal(writer.time,t+1/60);assert.deepEqual(r1.aiAreas,[definition.id]);
 coordinator.runFrom(a,()=>coordinator.loadZone(destination.id));const b=runtime.current;assert.notEqual(a,b);assert.equal(a.combat.isPresentLocalPlayer(),false);assert.equal(b.combat.isPresentLocalPlayer(),true);
 const t2=writer.time,r2=runtime.dispatch({dt:1/60,wallSeconds:1/60,inputs:new Map()});assert.equal(writer.time,t2+1/60);assert.deepEqual(r2.aiAreas,[definition.id,destination.id]);
 const callbacks={heal:writer.player.onLifeHealed,relay:writer.player.statusRelay};const authority=a.authority,population=a.assembly.input.population;
 runtime.retire();assert.equal(runtime.ready,false);assert.throws(()=>runtime.dispatch({dt:0,wallSeconds:0,inputs:new Map()}),/retired/);assert.throws(()=>a.combat.updateAI(0),/retired|Unregistered|authority/);assert.throws(()=>b.combat.campaignFrame.tick(0),/retired/);assert.throws(()=>authority.assertAdmitted(b.assembly.input.scene),/retired|authority|Unregistered/);assert.throws(()=>population.createMonster('wolf',1,'enemy'),/retired/);
 const relay=callbacks.relay;if(relay)assert.throws(()=>Reflect.apply(relay,writer.player,[writer.player,['burning',1,1,'retired-proof']]),/retired/);
 for(const key of ['actors','zone','player','projectiles','zones','traversal'])assert.deepEqual(Object.getOwnPropertyDescriptor(writer,key),original[key],key+' original publication restored');
 assert.deepEqual(worldDrivers,[]);return{initialActors:a.assembly.input.scene.actors.length,areas:r2.aiAreas,frames:2,clock:writer.time,retired:true,worldDrivers};
});});const report={scope:'Actual fresh warrior creation with native defaults, recorded geography, genuine retained installation, AI-before-frame dispatch, first-visit travel and terminal authority retirement. No browser, Continue, default companion classes, remote shell or rendered acceptance.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-client-runtime.json',report);console.log(JSON.stringify(report));
