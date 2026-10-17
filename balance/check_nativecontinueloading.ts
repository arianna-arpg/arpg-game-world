import '../src/engine/world';
import assert from 'node:assert/strict';
import {World} from '../src/engine/world';
import {bootSimEngine} from '../src/sim/arena';
import {makeAccount,serializeAccount} from '../src/meta/account';
import {readCharacterResume,writeCharacterMirrorRaw,charKeyFor,CHAR_SLOT,serializeCharacter} from '../src/meta/character';
import {prepareNativeCharacterContinue} from '../src/worldmass/nativeClientContinue';
import {NativeClientStart,type NativeClientStartRequest} from '../src/worldmass/nativeClientStart';
import {NativeAreaCharacterCreation,assertNativeCharacterReceipt,type NativeCharacterCreationReceipt} from '../src/worldmass/nativeAreaCharacterCreation';
import {NativeAreaScenePreparation} from '../src/worldmass/nativeAreaScenePreparation';
import {assertNativeCharacterResume,type NativeCharacterResumeReceipt} from '../src/worldmass/nativeAreaCharacterResume';
import {NativeAreaSceneCombat} from '../src/worldmass/nativeAreaSceneCombat';
import {NativeAreaSceneTransitionCoordinator} from '../src/worldmass/nativeAreaSceneTransitionCoordinator';
import {assertNativeRetainedWriterLive} from '../src/worldmass/nativeAreaRetainedLifetime';
import {CLASSES} from '../src/data/classes';
import {buildManifest} from '../src/packages/manifest';
import {seedGlobalRandom} from '../src/sim/rng';
import {recordedContinueSave,refuseWorldContinue} from './nativeClientContinueFixture';

// Genuine storage leases and native owners; no substituted installation or
// accepted-state snapshots. Every cancellation point is discovered from the
// successful course and re-exercised with a new account and a fresh real lease.
bootSimEngine();
const restoreRandom=seedGlobalRandom(48161),memory=new Map<string,string>();
Object.defineProperty(globalThis,'window',{value:{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);},removeItem:(k:string)=>memory.delete(k)}},configurable:true});
Object.defineProperty(globalThis,'fetch',{value:async()=>new Response('',{status:404}),configurable:true});
const accountBytes=(a:ReturnType<typeof makeAccount>)=>JSON.stringify(serializeAccount(a));
const ambientWorld=()=>{const account=makeAccount();return new World(account,Object.freeze(buildManifest(account,777)));};
let observedWriter:World|undefined;
const policyOwner=()=>Reflect.get(World,'policyOwner') as World|undefined;
const results:unknown[]=[];
const tokens:{token:NativeCharacterResumeReceipt;stage:'shell'|'fields'|'graph'|'arrival'}[]=[];
const wrappers:{target:object;key:string;descriptor:PropertyDescriptor}[]=[];
const birthTokens:{token:NativeCharacterCreationReceipt;preparation:NativeAreaScenePreparation;area:NonNullable<ReturnType<typeof assertNativeCharacterReceipt>['area']>;finished:boolean;phase:string}[]=[];
function observePreparation(){const target=NativeAreaScenePreparation.prototype,key='advanceInitialCharacterLoading',descriptor=Object.getOwnPropertyDescriptor(target,key)!;wrappers.push({target,key,descriptor});Object.defineProperty(target,key,{...descriptor,value:function(this:NativeAreaScenePreparation,token:NativeCharacterCreationReceipt){const r=assertNativeCharacterReceipt(token,'birth');assert(r.area);observedWriter=r.writer;const result=Reflect.apply(descriptor.value,this,[token]);assert.equal(typeof result,'boolean');birthTokens.push({token,preparation:this,area:r.area,finished:result as boolean,phase:r.area.assembly.phase});return result;}});}
function observe(target:object,key:string,stage:'shell'|'fields'|'graph'|'arrival'){
 const descriptor=Object.getOwnPropertyDescriptor(target,key)!;assert.equal(typeof descriptor.value,'function');wrappers.push({target,key,descriptor});
 Object.defineProperty(target,key,{...descriptor,value:function(this:object,token:NativeCharacterResumeReceipt,...args:unknown[]){observedWriter=assertNativeCharacterResume(token,stage).writer;tokens.push({token,stage});return Reflect.apply(descriptor.value,this,[token,...args]);}});
}
const expired=()=>{for(const {token,stage}of tokens)assert.throws(()=>assertNativeCharacterResume(token,stage),/expired|foreign/);for(const {token}of birthTokens)assert.throws(()=>assertNativeCharacterReceipt(token,'birth'),/expired|foreign/);};
async function lease(raw:string){await writeCharacterMirrorRaw(CHAR_SLOT,raw);const read=await readCharacterResume();assert.equal(read.status,'ready');if(read.status!=='ready')throw Error('Expected actual storage lease');return read.resume;}
try{
 const raw=recordedContinueSave();
 observePreparation();
 observe(NativeAreaCharacterCreation.prototype,'advanceResumeLoading','shell');
 observe(NativeAreaSceneCombat.prototype,'restoreCharacterFields','fields');
 observe(NativeAreaSceneTransitionCoordinator.prototype,'restoreCharacterGraph','graph');
 observe(NativeAreaSceneTransitionCoordinator.prototype,'resumeCharacterArrival','arrival');
 const account=makeAccount(),baseline=accountBytes(account),ambient=ambientWorld(),stages:string[]=[];
 const resume=await lease(raw);
 const prepared=await refuseWorldContinue(async calls=>{
  const prepared=await prepareNativeCharacterContinue(account,resume,{spawn:'exact',isCurrent:()=>true,loadingStage:async label=>{
   stages.push(label);expired();if(birthTokens.length===1){const row=birthTokens[0];assert.equal(row.finished,false);assert.equal(row.phase,'fresh');assert.throws(()=>row.preparation.input.session.current,/no selected actual area/);row.preparation.input.authority.assertUnclaimed(row.area.assembly.input.scene.player);}assert.equal(policyOwner(),ambient,'No borrowed World policy survives a pause');assert.equal(accountBytes(account),baseline);assert.equal(memory.get(charKeyFor(CHAR_SLOT)),raw);
   await Promise.resolve();expired();assert.equal(policyOwner(),ambient);
  }});assert.deepEqual(calls,[]);return prepared;
 });
 expired();assert.equal(birthTokens.length,2);assert.notEqual(birthTokens[0].token,birthTokens[1].token);assert.equal(birthTokens[0].area,birthTokens[1].area);assert.deepEqual(birthTokens.map(r=>({finished:r.finished,phase:r.phase})),[{finished:false,phase:'fresh'},{finished:true,phase:'prepared'}]);assert(stages.length>=9);assert(tokens.some(r=>r.stage==='shell')&&tokens.some(r=>r.stage==='fields')&&tokens.some(r=>r.stage==='graph')&&tokens.some(r=>r.stage==='arrival'));
 assert.equal(accountBytes(account),baseline);assert.equal(memory.get(charKeyFor(CHAR_SLOT)),raw);
 const published=prepared.publish();assert.equal(published.writer.account,account);assert(published.runtime.ready);
 const saved=serializeCharacter(published.writer);assert.equal(saved.world!.player!.vitals!.life,.37);assert.equal(saved.world!.player!.vitals!.mana,.43);assert.equal(saved.companions?.length,1);
 assert.throws(()=>prepared.publish(),/superseded/);published.runtime.retire();prepared.discard();
 results.push({course:'real staged Continue and expired receipts at every pause',stages,receipts:tokens.length,birthReceipts:birthTokens.length,life:.37,mana:.43,companions:1});
 for(const change of ['account','lease'] as const){
  for(let target=0;target<stages.length;target++){
   const account=makeAccount(),baseline=accountBytes(account),resume=await lease(raw),controller=new AbortController();let seen=0;observedWriter=undefined;
   await assert.rejects(prepareNativeCharacterContinue(account,resume,{spawn:'exact',signal:controller.signal,isCurrent:()=>true,loadingStage:async label=>{
    assert.equal(label,stages[seen]);expired();if(seen++!==target)return;
    if(change==='account')account.ledger.loading_external_change=1;else await writeCharacterMirrorRaw(CHAR_SLOT,raw+' ');
   }}),/superseded|cancelled|lease/i);
   assert.equal(seen,target+1,'No later native phase after failed pause');expired();
   if(change!=='account')assert.equal(accountBytes(account),baseline);
   assert.equal(memory.get(charKeyFor(CHAR_SLOT)),change==='lease'?raw+' ':raw,'Saved bytes only reflect the intentional competing write');
   if(observedWriter)assert.throws(()=>assertNativeRetainedWriterLive(observedWriter!),/retired/);
  }
  results.push({course:'Continue '+change+' at every real pause',cases:stages.length});
 }
 // Final publication has its own fresh account/lease check after preparation.
 for(const change of ['account','lease'] as const){const account=makeAccount(),resume=await lease(raw),prepared=await prepareNativeCharacterContinue(account,resume,{spawn:'exact',isCurrent:()=>true,loadingStage:async()=>{}});
  if(change==='account')account.ledger.loading_after_prepare=1;else await writeCharacterMirrorRaw(CHAR_SLOT,raw+' ');
  assert.throws(()=>prepared.publish(),/superseded/);prepared.discard();assert(!prepared.runtime.ready);
 }
 results.push({course:'publication refuses later account or lease replacement',cases:2});
 // Begin's new loading entry owns its selected account, and adoption stays
 // synchronous through persistence. Mu also adopts the actual completed owner.
 for(const kind of ['run','mu'] as const){
  const account=makeAccount(),start=new NativeClientStart(account),ambient=ambientWorld(),pauses:string[]=[];let ready=0;
  const common={manifest:buildManifest(account,713),onReady:(made:NonNullable<ReturnType<NativeClientStart['begin']>>)=>{ready++;assert.equal(policyOwner(),made.writer);assert(made.runtime.ready);made.writer.bindGlobalPolicies();}};
  const request:NativeClientStartRequest=kind==='mu'?{kind,...common}:{kind,...common,classDef:CLASSES.find(c=>c.id==='warrior')!,prologue:'skip'};
  const made=await start.beginLoading(request,async label=>{pauses.push(label);assert(start.pending);assert.equal(policyOwner(),ambient);await assert.rejects(start.beginLoading(request,async()=>{}),/reenter/);});
  assert(made);assert.equal(ready,1);assert.equal(start.current,made);assert.equal(policyOwner(),made.writer);assert.equal(made.provisional,kind==='mu');start.cancel();assert(!made.runtime.ready);
  results.push({course:'real '+kind+' loading adoption and reentry refusal',pauses});
 }
 for(const point of ['pause-account','ready-getter-cancel','ready-cancel','queued-cancel'] as const){
  const account=makeAccount(),start=new NativeClientStart(account);let ready=0;
  const request:NativeClientStartRequest={kind:'run',classDef:CLASSES.find(c=>c.id==='warrior')!,manifest:buildManifest(account,713),prologue:'skip',onReady:()=>{ready++;if(point==='ready-cancel')start.cancel();if(point==='queued-cancel')queueMicrotask(()=>start.cancel());}};
  if(point==='ready-getter-cancel')Object.defineProperty(request,'onReady',{get(){start.cancel();return()=>{ready++;};}});
  const promise=start.beginLoading(request,async()=>{if(point==='pause-account')account.ledger.loading_mutation=1;});
  if(point==='queued-cancel'){const made=await promise;assert(made);assert.equal(start.current,undefined);assert(!made.runtime.ready);}
  else await assert.rejects(promise,/cancelled|account changed/);
  assert.equal(start.pending,false);assert.equal(start.current,undefined);assert.equal(ready,point==='ready-cancel'||point==='queued-cancel'?1:0);
 }
 results.push({course:'account changes and selected/queued cancellation cannot publish a stale owner',cases:4});
 console.log('PASS native Continue/loading boundaries',JSON.stringify(results));
}finally{for(const {target,key,descriptor}of wrappers.reverse())Object.defineProperty(target,key,descriptor);restoreRandom();}
