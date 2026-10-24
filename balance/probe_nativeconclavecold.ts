import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const mode=process.argv.find(x=>x.startsWith('--conclave-cold='))?.split('=')[1];
if(mode){
 let substituted=0;const watched=new WeakSet<object>();
 if(mode==='field'){const {ConclaveField}=await import('../src/packages/overlays/conclave');for(const key of ['nativeRitualEpoch','nativeRitualSettled'] as const)Object.defineProperty(ConclaveField.prototype,key,{configurable:true,value(){substituted++;throw Error('preempted '+key);}});}
 if(mode==='population'){const {NativeAreaScenePopulation}=await import('../src/worldmass/nativeAreaScenePopulation');const original=NativeAreaScenePopulation.prototype.factoryOwnerOf;Object.defineProperty(NativeAreaScenePopulation.prototype,'factoryOwnerOf',{configurable:true,value:function(this:InstanceType<typeof NativeAreaScenePopulation>,body:Parameters<typeof original>[0]){if(watched.has(body)){substituted++;throw Error('preempted ritual factory receipt');}return Reflect.apply(original,this,[body]);}});}
 if(mode==='birth'){const {nativeConclaveBirthCalls}=await import('../src/engine/nativeSceneRuntimeBirth');assert(Object.isFrozen(nativeConclaveBirthCalls));assert.equal(nativeConclaveBirthCalls.read({}),undefined);assert.throws(()=>Object.defineProperty(nativeConclaveBirthCalls,'read',{value(){return{};}}));}
 const {actualConclave}=await import('./nativeConclaveLifetimeFixture');actualConclave(c=>{for(const body of c.bodies)watched.add(body);const before=c.cf.incubationCounter;c.travel(c.b);assert.equal(c.state.ritualSite,null);c.travel(c.a);c.travel(c.b);assert.equal(c.cf.incubationCounter,before+1);assert.deepEqual(c.calls,[]);c.n.coordinator.retire();});assert.equal(substituted,0);console.log('Conclave cold '+mode+' passed');
}else{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),rows=[];for(const name of ['field','population','birth']){const result=spawnSync(process.execPath,[path.join(root,'node_modules/tsx/dist/cli.mjs'),fileURLToPath(import.meta.url),'--conclave-cold='+name],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});fs.mkdirSync(path.join(root,'balance/reports'),{recursive:true});fs.writeFileSync(path.join(root,'balance/reports/conclave-cold-'+name+'.log'),result.stdout+result.stderr);assert.equal(result.status,0,'fresh '+name+' import: '+result.stderr.slice(-3000));rows.push({name,exit:result.status});}fs.writeFileSync(path.join(root,'balance/reports/native-conclave-cold.json'),JSON.stringify({rows},null,2));console.log(JSON.stringify(rows));
}
