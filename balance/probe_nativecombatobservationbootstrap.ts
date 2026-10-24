/** Boot-safe observation keeps actual registration nominal and one-use. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import type {Actor} from '../src/engine/actor';
const cold=process.argv.find(s=>s.startsWith('--observation-cold='))?.split('=')[1];
if(cold){
 const observation=await import('../src/engine/nativeCombatRecordObservation');
 const token=Object.freeze({});
 assert.throws(()=>observation.bindNativeCombatRecordObservation(token),/registration is not installed/);
 let consumed=0;
 const marker=new Error('selected registration failure');
 observation.installNativeCombatRecordRegistration(()=>{consumed++;throw marker;});
 assert.throws(()=>observation.installNativeCombatRecordRegistration(()=>{throw Error('replacement ran');}),/already installed/);
 if(cold==='preempted'){
  await assert.rejects(import('../src/worldmass/nativeAreaCombatOperation'),/already installed/);
  await assert.rejects(import('../src/worldmass/nativeAreaSceneCombat'));
  assert.equal(consumed,0,'real operation refuses before any callback or aggregate activation');
 }else{
  assert.equal(cold,'callback-error');
  const host={},actor={} as Actor;
  assert.throws(()=>observation.bindNativeCombatRecordObservation(token),error=>error===marker);
  assert.equal(consumed,1);
  assert.equal(observation.observeNativeSource(host,actor),actor,'failed binding leaves no observer');
  let fallback=0;assert.equal(observation.observeNativePresentPlayer(host,()=>{fallback++;return false;}),false);assert.equal(fallback,1);
 }
 console.log('PASS observation cold '+cold);
}else{
 for(const mode of ['preempted','callback-error']){
  const child=spawnSync(process.execPath,['--import','tsx',fileURLToPath(import.meta.url),'--observation-cold='+mode],{encoding:'utf8',maxBuffer:20e6});
  assert.equal(child.status,0,child.stderr+'\n'+child.stdout);assert(child.stdout.includes('PASS observation cold '+mode));
 }
 const {withSeededRandom}=await import('../src/core/rng');
 const {nativeCampaignFixture,birthActualNativeArea}=await import('./nativeCombatRetainedFixture');
 const observation=await import('../src/engine/nativeCombatRecordObservation');
 const {nativeCombatRecordRegistration}=await import('../src/worldmass/nativeAreaCombatOperation');
 const result=withSeededRandom(45151,()=>{const actual=birthActualNativeArea(nativeCampaignFixture());
  assert.throws(()=>observation.installNativeCombatRecordRegistration(()=>{throw Error('replacement ran');}),/already installed/);
  assert.throws(()=>observation.bindNativeCombatRecordObservation(Object.freeze({})),/Foreign native combat record host registration/);
  assert.throws(()=>nativeCombatRecordRegistration(Object.freeze({})),/Foreign native combat record host registration/);
  const host=actual.ongoing.assembly.input.registry.input.titans.host;
  assert.throws(()=>observation.observeNativeSource(host,actual.writer.player),/Expired or nested native combat operation/);
  actual.ongoing.combat.campaignFrame.tick(1/60);
  actual.authority.assertAdmitted(actual.ongoing.assembly.input.scene);
  return{preemptedInitializationRefuses:true,callbackFailureLeavesUnbound:true,realOwnerStillRequiresIssuedToken:true,realBoundHostNeedsActiveFrame:true,actualFrame:true};
 });
 console.log(JSON.stringify({result,scope:'One-time registration bootstrap and actual bound owner; unchanged installed-source probe separately verifies standalone dependency graph and cold registration parity.'}));
}
