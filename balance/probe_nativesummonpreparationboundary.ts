/** Rejected asynchronous misuse must expire the real preparation scope without
 * leaving an unhandled rejection. No full spawn or runtime admission is implied. */
import '../src/engine/world';
import {beforeNativeMainVisualSource} from './nativeMainVisualSourceFixture';
import {beforeNativeSceneKillAftermath} from './nativeSceneKillAftermathIntegrationFixture';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {setImmediate as nextTurn} from 'node:timers/promises';
import {makeSimWorld} from '../src/sim/arena';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaSceneProgression,freshSceneProgressionState,type NativeSceneProgressionAuthority} from '../src/worldmass/nativeAreaSceneProgression';
import {NativeAreaSceneSummonPreparation,type NativeSummonPreparationRuntime,type NativeSummonPreparationScope} from '../src/worldmass/nativeAreaSceneSummonPreparation';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import type {Actor} from '../src/engine/actor';
import {execFileSync} from 'node:child_process';
import {nativeSummonAsyncBoundaryArchive as archive,beforeNativeSummonAsyncBoundary} from './nativeSummonAsyncBoundaryArchive';
function sourceProof(){
 const current=fs.readFileSync(new URL('../'+archive.file,import.meta.url),'utf8'),restored=beforeNativeSummonAsyncBoundary(current);
 for(const pin of [archive.pin,archive.originalOwnerPin])assert.equal(restored,execFileSync('git',['show',pin+':'+archive.file],{encoding:'utf8',maxBuffer:20e6}));
 assert.equal(createHash('sha256').update(current).digest('hex'),archive.afterSha256);assert.equal(createHash('sha256').update(restored).digest('hex'),archive.beforeSha256);
 for(const [name,from,to] of [['import','NativeAreaScenePopulation,nativeBirthAsyncResult','NativeAreaScenePopulation'],['observer','if(nativeBirthAsyncResult(result))','if(false)'],['error','requires a synchronous operation','unexpected asynchronous success'],['lifetime','frame.active=false','frame.active=true'],['unrelated','Creation-scoped native preparation','Changed unrelated preparation']] as const){assert(current.includes(from));assert.throws(()=>beforeNativeSummonAsyncBoundary(current.replace(from,to)),/source changed/,name);}
 const world=beforeNativeSceneKillAftermath(beforeNativeMainVisualSource('src/engine/world.ts',fs.readFileSync(new URL('../src/engine/world.ts',import.meta.url),'utf8')));assert.equal(world,execFileSync('git',['show',archive.pin+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:20e6}),'World unchanged after exact later kill aftermath reversal');
 console.log('PASS summon async boundary source: exact complete owner reversal, five mutation refusals, unchanged World');
}
if(!process.argv.includes('--runtime-only'))sourceProof();
const w=makeSimWorld('warrior',19381),raw=freshAssemblyInput(w,w.zone),campaign=Object.assign(raw.campaign,{seatOf:w.seatOf.bind(w),timeflow:w.timeflow,mercSyncedLevel:(w as unknown as {mercSyncedLevel:number}).mercSyncedLevel});
const area=new NativeAreaSceneAssembly(raw),scene=area.input.scene,population=area.input.population;
const authority=new NativeAreaActorAuthority<NativeSummonPreparationRuntime>(campaign);
// This is the same explicit preparation-only constructor annotation as the
// native four-lane proof; it does not install substitute combat providers.
const progression=new NativeAreaSceneProgression({scene,population,ecology:area.input.ecology,geometry:area.input.geometry,runtime:area.input.registry.input.birth,loot:area.lootController,campaign,state:freshSceneProgressionState(),authority:authority as unknown as NativeSceneProgressionAuthority});
const owner=new NativeAreaSceneSummonPreparation({scene,population,campaign,progression,authority}),binding=authority.register(scene,{progression});authority.claim(binding,scene.actors);

const caster=scene.player,rawActors=scene.actors,census=[...rawActors],events:unknown[]=[],checks:string[]=[],bodies:Actor[]=[];let cases=0;
const selected=process.argv.find(a=>a.startsWith('--only='))?.slice('--only='.length);
const listener=(reason:unknown)=>events.push(reason);process.on('unhandledRejection',listener);
const flush=async()=>{await nextTurn();await new Promise<void>(r=>setTimeout(r,15));await nextTurn();};
const expired=(scope:NativeSummonPreparationScope)=>assert.throws(()=>scope.createMonster('skeleton_warrior',9,caster.team,caster),/Expired or nested/);
const mint=(scope:NativeSummonPreparationScope)=>{const body=scope.createMonster('skeleton_warrior',9,caster.team,caster);body.life=1;bodies.push(body);return body;};
const unchanged=()=>{assert.equal(scene.actors,rawActors);assert.deepEqual(rawActors,census);authority.assertAdmitted(scene);for(const actor of census)assert.equal(authority.require(actor).scene,scene);for(const body of bodies){assert(!rawActors.includes(body));authority.assertUnclaimed(body);assert.equal(body.life,1);}};
async function course(name:string,fn:()=>Promise<void>|void){if(selected&&!name.includes(selected))return;const start=events.length;let failure:unknown;try{await fn();}catch(error){failure=error;}await flush();if(failure)throw failure;unchanged();assert.deepEqual(events.slice(start),[],'caught summon async refusal must not emit unhandledRejection');checks.push(name);console.log('PASS summon async boundary: '+name);}
function promise(crossRealm:boolean):Promise<unknown>{return crossRealm?runInNewContext('Promise.reject(new Error("hidden summon boundary rejection"))') as Promise<unknown>:Promise.reject(Error('hidden summon boundary rejection'));}
async function hidden(shape:'throwing'|'noncallable'|'own-delete'|'inherited-delete'|'prototype-replace',crossRealm:boolean,altered:boolean,throws:boolean,hiddenValue:unknown=undefined){
 const p=promise(crossRealm),proto={},exact=Error('exact summon then getter error');let reads=0,constructorReads=0,scope!:NativeSummonPreparationScope;
 if(altered)Object.setPrototypeOf(p,proto);
 Object.defineProperty(p,'constructor',{get(){constructorReads++;expired(scope);return Promise;}});
 const target=shape==='inherited-delete'||shape==='prototype-replace'?proto:p;
 Object.defineProperty(target,'then',{configurable:true,get(){reads++;if(shape==='own-delete'||shape==='inherited-delete')Reflect.deleteProperty(target,'then');if(shape==='prototype-replace')Object.setPrototypeOf(p,null);if(throws)throw exact;return hiddenValue;}});
 assert.throws(()=>owner.run(caster,s=>{scope=s;mint(s);return p;}),throws?(error:unknown)=>error===exact:/requires a synchronous operation/);
 assert.equal(reads,1);assert.equal(constructorReads,0);expired(scope);await flush();assert.deepEqual(events,[],'caught summon async refusal must not emit unhandledRejection');assert.equal(reads,1);assert.equal(constructorReads,1);cases++;
}
try{
 await course('throwing public then preserves exact error and observes actual rejected promises',async()=>{for(const cross of [false,true])for(const altered of [false,true])await hidden('throwing',cross,altered,true);});
 await course('noncallable public then refuses actual rejected promises synchronously',async()=>{for(const cross of [false,true])for(const altered of [false,true])for(const value of [undefined,null,7])await hidden('noncallable',cross,altered,false,value);});
 await course('self-removing own and inherited then descriptors cannot hide entered promises',async()=>{for(const shape of ['own-delete','inherited-delete','prototype-replace'] as const)for(const cross of [false,true])for(const throws of [false,true])await hidden(shape,cross,true,throws);});
 await course('selected-call and apply shadows do not replace the captured then callable',async()=>{
  for(const key of ['call','apply'])for(const getter of [false,true]){
   let reads=0,selectedCalls=0,shadowReads=0,shadowCalls=0,scope!:NativeSummonPreparationScope;
   const then=function(this:unknown,_fulfilled:()=>void,rejected:(error:unknown)=>void){assert.equal(this,result);selectedCalls++;expired(scope);rejected(Error('selected then rejection'));return Promise.reject(Error('selected returned rejection'));};
   Object.defineProperty(then,key,getter?{get(){shadowReads++;throw Error('shadow getter');}}:{value:()=>{shadowCalls++;return Promise.reject(Error('shadow function'));}});
   const result={get then(){reads++;return then;}};
   assert.throws(()=>owner.run(caster,s=>{scope=s;mint(s);return result;}),/requires a synchronous operation/);assert.equal(reads,1);assert.equal(selectedCalls,0);await flush();assert.equal(selectedCalls,1);assert.equal(reads,1);assert.equal(shadowReads,0);assert.equal(shadowCalls,0);cases++;
  }
 });
 await course('nested constructor and species observation waits for child and outer scope expiry',async()=>{
  let outer!:NativeSummonPreparationScope,child!:NativeSummonPreparationScope,constructorReads=0,speciesReads=0,speciesCalls=0;
  const bothExpired=()=>{expired(outer);expired(child);};
  class Species extends Promise<unknown>{constructor(executor:ConstructorParameters<typeof Promise<unknown>>[0]){bothExpired();speciesCalls++;super(executor);}}
  const p=Promise.reject(Error('nested summon rejection'));Object.defineProperty(p,'then',{value:undefined});Object.defineProperty(p,'constructor',{get(){bothExpired();constructorReads++;return{get [Symbol.species](){bothExpired();speciesReads++;return Species;}};}});
  owner.run(caster,s=>{outer=s;mint(s);assert.throws(()=>owner.run(caster,c=>{child=c;mint(c);return p;}),/requires a synchronous operation/);expired(child);mint(outer);assert.equal(constructorReads,0);assert.equal(speciesReads,0);assert.equal(speciesCalls,0);});
  bothExpired();await flush();assert.equal(constructorReads,1);assert.equal(speciesReads,1);assert.equal(speciesCalls,1);cases++;
 });
 await course('native synchronous results preserve identity and descriptor-policy limits stay explicit',()=>{
  for(const result of [[],{filled:0,contested:0},undefined,null,0,false,'native']){assert.equal(owner.run(caster,()=>result),result);cases++;}
  const body=owner.run(caster,s=>mint(s));assert.equal(body,bodies[bodies.length-1]);authority.assertUnclaimed(body);cases++;
  // Conservative descriptor presence is refusal policy, not universal branding.
  assert.throws(()=>owner.run(caster,()=>({then:undefined})),/requires a synchronous operation/);cases++;
  // Completely stripped Promises with no descriptor at entry remain unsupported.
  // This fulfilled control documents the limit without manufacturing a leak.
  const stripped=Promise.resolve(1);Object.setPrototypeOf(stripped,null);assert.equal(owner.run(caster,()=>stripped),stripped);cases++;
 });
}finally{await flush();process.off('unhandledRejection',listener);}
const result={groups:checks.length,cases,receipt:createHash('sha256').update(JSON.stringify(checks)).digest('hex'),checks,unhandledRejections:events.length};fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/nativesummonpreparationboundary.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
