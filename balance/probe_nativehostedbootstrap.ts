import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const mode=process.argv.find(x=>x.startsWith('--hosted-cold='))?.split('=')[1];
if(mode){
 const bridge=await import('../src/worldmass/nativeHostedSerialization');
 if(mode==='preempt-serializer'){
  let selected=0;bridge.installNativeHostedSerializer(()=>{selected++;throw Error('forged selected callback');});
  await assert.rejects(import('../src/worldmass/nativeClientRuntime'),/already installed/);assert.equal(selected,0);
 }else if(mode==='preempt-coordinator'){
  let selected=0;const bad=()=>{selected++;throw Error('forged selected callback');};
  bridge.installNativeHostedCoordinator({is:(_value):_value is import('../src/worldmass/nativeAreaSceneTransitionCoordinator').NativeAreaSceneTransitionCoordinator=>{selected++;return false;},idle:bad,ready:bad,areaFor:bad});
  await assert.rejects(import('../src/worldmass/nativeClientRuntime'),/already installed/);assert.equal(selected,0);
 }else{
  const entry=mode==='runtime'?'../src/worldmass/nativeClientRuntime':mode==='snapshots'?'../src/worldmass/nativeAreaHostedSnapshots':'../src/engine/world';await import(entry);await import('../src/worldmass/nativeClientRuntime');
  assert.throws(()=>bridge.installNativeHostedSerializer(()=>{throw Error('replacement');}),/already installed/);
  const ops=bridge.nativeHostedCoordinator();assert.equal(ops.is({}),false);assert.throws(()=>bridge.installNativeHostedCoordinator(ops),/already installed/);
 }
 console.log('PASS hosted cold '+mode);
}else{
 for(const childMode of ['runtime','snapshots','world','preempt-serializer','preempt-coordinator']){const r=spawnSync(process.execPath,['--import','tsx',fileURLToPath(import.meta.url),'--hosted-cold='+childMode],{encoding:'utf8',maxBuffer:20e6});assert.equal(r.status,0,r.stdout+'\n'+r.stderr);assert(r.stdout.includes('PASS hosted cold '+childMode));}
 console.log(JSON.stringify({coldEntryPaths:3,preemptedRegistrations:2,selectedForgedCallbacks:0,replayRefused:true}));
}
