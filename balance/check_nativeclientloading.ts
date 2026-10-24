/** Independent same-model candidate test. Production remains unmodified.
 * Promotion: change ../src/ to ../src/ and ./ to ./.
 * Actual owners/fixtures exercise semantic equivalence; VM tests only inspect
 * private bounded digest admission without adding a production inspection API. */
import '../src/engine/world';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {World} from '../src/engine/world';
import {WorldSim} from '../src/world/sim';
import {bootSimEngine} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {CLASSES} from '../src/data/classes';
import {START_ZONE} from '../src/data/zones';
import {makeAccount,serializeAccount,LEDGER_FLASK_LESSON,LEDGER_ZONES_EXPLORED} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {CHAR_SLOT,charKeyFor,readCharacterResume,writeCharacterMirrorRaw,serializeCharacter} from '../src/meta/character';
import {NativeClientStart} from '../src/worldmass/nativeClientStart';
import {NativeClientRuntime,nativeClientRuntimeFor} from '../src/worldmass/nativeClientRuntime';
import {NativeAreaCharacterCreation,assertNativeCharacterReceipt,type NativeCharacterCreationReceipt} from '../src/worldmass/nativeAreaCharacterCreation';
import {assertNativeCharacterResume,type NativeCharacterResumeReceipt} from '../src/worldmass/nativeAreaCharacterResume';
import {NativeAreaScenePreparation} from '../src/worldmass/nativeAreaScenePreparation';
import {NativeAreaSceneProgression} from '../src/worldmass/nativeAreaSceneProgression';
import {NativeAreaSceneCombat} from '../src/worldmass/nativeAreaSceneCombat';
import {NativeAreaSceneTransitionCoordinator} from '../src/worldmass/nativeAreaSceneTransitionCoordinator';
import {assertNativeRetainedWriterLive} from '../src/worldmass/nativeAreaRetainedLifetime';
import {prepareNativeCharacterContinue} from '../src/worldmass/nativeClientContinue';
import {copyNativeLoadingCharacter} from '../src/worldmass/nativeCharacterLoading';
import {snapshotNativeGeographyData,copyNativeGeographyData} from '../src/world/geographySource';
import {nativeSourceDigest} from '../src/worldmass/nativeSourceDigest';
import {massDigest} from '../src/worldmass/random';
import {freshClientSetup,characterFacts} from './nativeClientStartFixture';
import {recordedContinueSave,refuseWorldContinue} from './nativeClientContinueFixture';

bootSimEngine();
const results:unknown[]=[];
const memory=new Map<string,string>();
const storage={getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>{memory.set(key,value);},removeItem:(key:string)=>{memory.delete(key);}};
const savedGlobals=['window','fetch'].map(key=>({key,descriptor:Object.getOwnPropertyDescriptor(globalThis,key)}));
Object.defineProperty(globalThis,'window',{value:{localStorage:storage},configurable:true});
Object.defineProperty(globalThis,'fetch',{value:async()=>new Response('',{status:404}),configurable:true});
const sentinel=freshClientSetup(1190,false).writer;
const mapping=freshClientSetup(1191,false).geography.spec.mapping;
sentinel.bindGlobalPolicies();
const owner=()=>Object.getOwnPropertyDescriptor(World,'policyOwner')?.value;
const geographyOwner=()=>Object.getOwnPropertyDescriptor(WorldSim,'geographyOwner')?.value;
function globalsAtPause(){assert.equal(owner(),sentinel,'prior World policies restored at pause');assert.equal(geographyOwner(),sentinel.sim,'prior geography policies restored at pause');}
function report(name:string,details:unknown={}){results.push({name,details});console.log(JSON.stringify({pass:name,details}));}
async function seeded<T>(seed:number,action:()=>Promise<T>):Promise<T>{const restore=seedGlobalRandom(seed);try{return await action();}finally{restore();}}

// Capture authentic receipts at their genuine consumers, without replacing any
// native body or weakening any check. All wrappers delegate synchronously.
type CreationStage=Parameters<typeof assertNativeCharacterReceipt>[1];
type ResumeStage=Parameters<typeof assertNativeCharacterResume>[1];
const captured:{token:object;kind:'creation'|'resume';stage:CreationStage|ResumeStage}[]=[];
const restoredMethods:{target:object;key:string;descriptor:PropertyDescriptor}[]=[];
let observedWriter:World|undefined,observedFactory:NativeAreaCharacterCreation|undefined;
type SplitPreparation={token:NativeCharacterCreationReceipt;preparation:NativeAreaScenePreparation;area:NonNullable<ReturnType<typeof assertNativeCharacterReceipt>['area']>;writer:World;visitedBefore:boolean;exploredBefore:number;finished?:boolean;phaseAfter?:string;visitedAfter?:boolean;exploredAfter?:number};
const splitPreparations:SplitPreparation[]=[];let initialBirths=0;
function wrap(target:object,key:string,before:(receiver:unknown,args:unknown[])=>void,after?:(receiver:unknown,args:unknown[],result:unknown)=>void){
 const descriptor=Object.getOwnPropertyDescriptor(target,key)!;assert.equal(typeof descriptor.value,'function');restoredMethods.push({target,key,descriptor});
 Object.defineProperty(target,key,{...descriptor,value:function(this:unknown,...args:unknown[]){before(this,args);const result=Reflect.apply(descriptor.value,this,args);after?.(this,args,result);return result;}});
}
function creationReceipt(stage:CreationStage){return (_receiver:unknown,args:unknown[])=>{const token=args[0] as NativeCharacterCreationReceipt,row=assertNativeCharacterReceipt(token,stage);observedWriter=row.writer;captured.push({token,kind:'creation',stage});const runtime=nativeClientRuntimeFor(row.writer);if(runtime)assert.throws(()=>runtime.retire(),/during dispatch/,'active cooperative operation cannot retire runtime');if(observedFactory?.loadingActive)assert.throws(()=>observedFactory!.retire(),/during loading dispatch/,'active factory cannot retire itself');};}
function resumeReceipt(stage:ResumeStage){return (_receiver:unknown,args:unknown[])=>{const token=args[0] as NativeCharacterResumeReceipt,row=assertNativeCharacterResume(token,stage);observedWriter=row.writer;captured.push({token,kind:'resume',stage});};}
wrap(NativeAreaScenePreparation.prototype,'constructInitialCharacter',creationReceipt('construct'));
wrap(NativeAreaScenePreparation.prototype,'prepareInitialCharacter',creationReceipt('birth'));
wrap(NativeAreaScenePreparation.prototype,'advanceInitialCharacterLoading',(receiver,args)=>{
 creationReceipt('birth')(receiver,args);const token=args[0] as NativeCharacterCreationReceipt,r=assertNativeCharacterReceipt(token,'birth');assert(r.area);
 splitPreparations.push({token,preparation:r.preparation,area:r.area,writer:r.writer,visitedBefore:r.writer.visited.has(r.area.assembly.input.scene.zone.id),exploredBefore:r.writer.account.ledger[LEDGER_ZONES_EXPLORED]??0});
},(_receiver,_args,result)=>{const row=splitPreparations.at(-1)!;assert.equal(typeof result,'boolean');row.finished=result as boolean;row.phaseAfter=row.area.assembly.phase;row.visitedAfter=row.writer.visited.has(row.area.assembly.input.scene.zone.id);row.exploredAfter=row.writer.account.ledger[LEDGER_ZONES_EXPLORED]??0;});
wrap(NativeAreaScenePreparation.prototype,'birthInitial',()=>{initialBirths++;});
wrap(NativeAreaSceneProgression.prototype,'recalcInitialCharacter',creationReceipt('stats'));
wrap(NativeAreaSceneCombat.prototype,'grantInitialCharacterCompanions',creationReceipt('gifts'));
wrap(NativeAreaCharacterCreation.prototype,'createLoading',(receiver)=>{observedFactory=receiver as NativeAreaCharacterCreation;});
wrap(NativeAreaCharacterCreation.prototype,'advanceResumeLoading',(receiver,args)=>{observedFactory=receiver as NativeAreaCharacterCreation;resumeReceipt('shell')(receiver,args);});
wrap(NativeAreaSceneCombat.prototype,'restoreCharacterFields',resumeReceipt('fields'));
wrap(NativeAreaSceneProgression.prototype,'recalcRestoredSeat',resumeReceipt('seat'));
wrap(NativeAreaSceneTransitionCoordinator.prototype,'restoreCharacterGraph',resumeReceipt('graph'));
wrap(NativeAreaSceneTransitionCoordinator.prototype,'resumeCharacterArrival',resumeReceipt('arrival'));
function resetObserved(){captured.length=0;splitPreparations.length=0;initialBirths=0;observedWriter=undefined;observedFactory=undefined;}
function receiptsExpired(){for(const row of captured){if(row.kind==='creation')assert.throws(()=>assertNativeCharacterReceipt(row.token as NativeCharacterCreationReceipt,row.stage as CreationStage),/expired|foreign/);else assert.throws(()=>assertNativeCharacterResume(row.token as NativeCharacterResumeReceipt,row.stage as ResumeStage),/expired|foreign/);}if(observedFactory)assert.equal(observedFactory.loadingActive,false);}
function splitPreparationPaused():void {
 const row=splitPreparations.at(-1);if(!row||row.area.assembly.phase==='born')return;
 assert.throws(()=>row.preparation.input.session.current,/no selected actual area/,'borrowed preparation selection must end before a pause');
 row.preparation.input.authority.assertUnclaimed(row.area.assembly.input.scene.player);
 if(splitPreparations.length===1){assert.equal(row.finished,false);assert.equal(row.area.assembly.phase,'fresh');assert.equal(row.visitedAfter,row.visitedBefore);assert.equal(row.exploredAfter,row.exploredBefore);assert.equal(initialBirths,0);}
}
function splitPreparationComplete():void {
 assert.equal(splitPreparations.length,2,'exactly two authentic loading preparation advances');const [source,layout]=splitPreparations;
 assert.notEqual(source.token,layout.token,'each preparation advance receives a fresh birth receipt');assert.equal(source.area,layout.area);assert.equal(source.writer,layout.writer);
 assert.equal(source.finished,false);assert.equal(source.phaseAfter,'fresh');assert.equal(layout.finished,true);assert.equal(layout.phaseAfter,'prepared');
 assert.equal(source.visitedAfter,source.visitedBefore,'issuing source must not publish a visit');assert.equal(source.exploredAfter,source.exploredBefore,'issuing source must not award a deed');
 assert.equal(layout.visitedBefore,source.visitedBefore);assert.equal(layout.visitedAfter,true);assert.equal(initialBirths,1,'one native initial birth after completed preparation');
}
function initialPreparationFacts(runtime:NativeClientRuntime){const writer=runtime.writer;return JSON.stringify({visited:[...writer.visited],explored:writer.account.ledger[LEDGER_ZONES_EXPLORED]??0,accountDirty:writer.accountDirty,zone:writer.zone,arena:writer.arena,placement:runtime.current.assembly.preparedPlacement});}
function pendingRuntime(runtime:NativeClientRuntime){assert.equal(runtime.ready,false);assert.throws(()=>runtime.current,/not ready/);assert.throws(()=>runtime.readLocalInput(()=>null),/admitted publication/);assert.equal(runtime.dispatch({dt:0,wallSeconds:0,inputs:new Map()}).ready,false);assert.throws(()=>runtime.install(),/already attempted/);}

try {
 // Hold deterministic ambient randomness only in the isolated test process;
 // production borrowed RNG closures must still be restored before every pause.
 const classRows=[['warrior',false,undefined],['tamer',false,undefined],['guardian',true,undefined],['magician',true,'fireball']] as const;
 let runtimeLabels:string[]=[];
 for(const [id,flasks,graft]of classRows){const classDef=CLASSES.find(c=>c.id===id)!;
  const run=async(loading:boolean)=>seeded(45101,async()=>{resetObserved();const {writer,geography}=freshClientSetup(1103,flasks);writer.account.skillGraft=!!graft;const runtime=new NativeClientRuntime({writer,definition:writer.zoneMap[START_ZONE],geography:geography.spec,fresh:{classDef,graft}});sentinel.bindGlobalPolicies();const random=Math.random,labels:string[]=[];
   try{if(loading)await refuseWorldContinue(async()=>runtime.installLoading(async label=>{labels.push(label);globalsAtPause();receiptsExpired();splitPreparationPaused();assert.equal(Math.random,random,'no native borrowed RNG survives pause');pendingRuntime(runtime);await Promise.resolve();globalsAtPause();receiptsExpired();}));else writer.withGlobalPolicies(()=>runtime.install());assert(runtime.ready);assert.equal(runtime.current.assembly.phase,'born');receiptsExpired();globalsAtPause();if(loading)splitPreparationComplete();return {facts:characterFacts(writer),preparation:initialPreparationFacts(runtime),labels,receipts:captured.length};}finally{runtime.retire();}});
  const sync=await run(false),loading=await run(true);assert.deepEqual(loading.facts,sync.facts,id+' actual synchronous/cooperative character facts');assert.equal(loading.preparation,sync.preparation,id+' exact visit/deed/concealment/geometry preparation');assert(loading.receipts>0);runtimeLabels=loading.labels;report('character-equivalence-'+id,{pauses:loading.labels,receipts:loading.receipts});
 }
 assert(runtimeLabels.length>=3);
 for(const cancelAt of runtimeLabels.keys())await seeded(45110+cancelAt,async()=>{resetObserved();const {writer,geography}=freshClientSetup(1110,false),controller=new AbortController(),runtime=new NativeClientRuntime({writer,definition:writer.zoneMap[START_ZONE],geography:geography.spec,fresh:{classDef:CLASSES[0]}});sentinel.bindGlobalPolicies();let index=0;
  await assert.rejects(runtime.installLoading(async()=>{globalsAtPause();receiptsExpired();pendingRuntime(runtime);if(index++===cancelAt)controller.abort();},controller.signal),/cancelled/);assert.equal(index,cancelAt+1);assert.equal(runtime.ready,false);assert.throws(()=>assertNativeRetainedWriterLive(writer),/retired/);assert.throws(()=>runtime.current,/retired/);globalsAtPause();report('runtime-cancel-pause-'+cancelAt);
 });
 // The newly exposed source/layout pause cannot lend publication or replay a
 // completed native prefix after cancellation, stale identity, or callback failure.
 for(const change of ['visited','graph','actor','abort','pause-throw','native-throw'] as const)await seeded(45150,async()=>{
  resetObserved();const {writer,geography}=freshClientSetup(1114,false),controller=new AbortController(),runtime=new NativeClientRuntime({writer,definition:writer.zoneMap[START_ZONE],geography:geography.spec,fresh:{classDef:CLASSES[0]}});
  sentinel.bindGlobalPolicies();let atSource=false,pauses=0,explored=0;let cleanup:()=>void=()=>{};
  try {await assert.rejects(runtime.installLoading(async()=>{
   pauses++;globalsAtPause();receiptsExpired();splitPreparationPaused();if(splitPreparations.length!==1)return;
   assert(!atSource,'the source-only stage must not replay');atSource=true;const row=splitPreparations[0];explored=writer.account.ledger[LEDGER_ZONES_EXPLORED]??0;
   assert.equal(row.area.assembly.phase,'fresh');assert.equal(initialBirths,0);assert.equal(writer.zone,row.area.assembly.input.scene.zone);assert.equal(writer.arena,row.area.assembly.input.geometry.arena);
   if(change==='visited'){if(writer.visited.has(START_ZONE))writer.visited.delete(START_ZONE);else writer.visited.add(START_ZONE);}
   else if(change==='graph'){const original=writer.zoneMap[START_ZONE];writer.zoneMap[START_ZONE]={...original};cleanup=()=>{writer.zoneMap[START_ZONE]=original;};}
   else if(change==='actor'){const original=writer.localSeat.actor;writer.localSeat.actor={...original} as World['localSeat']['actor'];cleanup=()=>{writer.localSeat.actor=original;};}
   else if(change==='abort')controller.abort();
   else if(change==='pause-throw')throw Error('independent source pause failure');
   else {const target=row.area.assembly.objectiveController,key='metaProgressionActive',descriptor=Object.getOwnPropertyDescriptor(target,key);Object.defineProperty(target,key,{configurable:true,value:()=>{throw Error('independent selected preparation callback failure');}});cleanup=()=>{if(descriptor)Object.defineProperty(target,key,descriptor);else Reflect.deleteProperty(target,key);};}
  },controller.signal),/changed|foreign|cancelled|independent .* failure/);
   assert(atSource);assert.equal(pauses,2,'no later pause after source-stage refusal');receiptsExpired();globalsAtPause();assert.equal(initialBirths,0,'failed layout must not admit or birth an area');
   assert.equal(writer.account.ledger[LEDGER_ZONES_EXPLORED]??0,explored,'no deed may be added before identity refusal or failed native callback');
   if(change==='graph'||change==='actor'||change==='abort'||change==='pause-throw')assert.equal(writer.visited.has(START_ZONE),splitPreparations[0].visitedBefore,'refusal cannot add the visit');
   if(change==='native-throw')assert(writer.visited.has(START_ZONE),'completed native visited prefix survives callback failure');
   assert(!runtime.ready);assert.throws(()=>assertNativeRetainedWriterLive(writer),/retired/);await assert.rejects(runtime.installLoading(async()=>{}),/retired/);assert.equal(initialBirths,0);
   report('split-preparation-'+change,{advances:splitPreparations.length,pauses});
  }finally{cleanup();runtime.retire();}
 });
 // Real owner supplies all early geography/catalog pauses and final publication.
 let startLabels:string[]=[];
 const makeStart=()=>{const account=makeAccount();account.ledger[LEDGER_FLASK_LESSON]=1;return {account,start:new NativeClientStart(account,mapping)};};
 await seeded(45200,async()=>{resetObserved();const {account,start}=makeStart();let ready=0;sentinel.bindGlobalPolicies();const made=await start.beginLoading({kind:'run',classDef:CLASSES[0],manifest:buildManifest(account,1210),prologue:'skip',onReady:result=>{ready++;assert.equal(owner(),result.writer);assert.equal(geographyOwner(),result.writer.sim);assert(result.runtime.ready);assert(start.pending);assert.equal(start.current,undefined);}},async label=>{startLabels.push(label);assert(start.pending);assert.equal(start.current,undefined);globalsAtPause();receiptsExpired();await assert.rejects(start.beginLoading({kind:'mu'},async()=>{}),/reenter/);assert.throws(()=>start.begin({kind:'mu'}),/reenter/);});assert(made);assert.equal(ready,1);assert.equal(start.current,made);assert.equal(start.pending,false);assert.equal(owner(),made.writer,'successful adoption is permanent');start.cancel();assert.equal(start.current,undefined);assert.equal(made.runtime.ready,false);report('start-publication',{pauses:startLabels});});
 for(const cancelAt of startLabels.keys())await seeded(45220+cancelAt,async()=>{resetObserved();const {account,start}=makeStart();sentinel.bindGlobalPolicies();let index=0,ready=0;await assert.rejects(start.beginLoading({kind:'run',classDef:CLASSES[0],manifest:buildManifest(account,1210),prologue:'skip',onReady:()=>{ready++;}},async()=>{assert(start.pending);assert.equal(start.current,undefined);globalsAtPause();receiptsExpired();if(index++===cancelAt)start.cancel();}),/cancelled/);assert.equal(index,cancelAt+1);assert.equal(ready,0);assert.equal(start.pending,false);assert.equal(start.current,undefined);if(observedWriter)assert.throws(()=>assertNativeRetainedWriterLive(observedWriter!),/retired/);globalsAtPause();report('start-cancel-pause-'+cancelAt);});
 await seeded(45240,async()=>{const {account,start}=makeStart();sentinel.bindGlobalPolicies();await assert.rejects(start.beginLoading({kind:'run',classDef:CLASSES[0],manifest:buildManifest(account,1210),prologue:'skip'},async()=>{account.skillGraft=!account.skillGraft;}),/account changed/);assert(!start.pending);assert.equal(start.current,undefined);report('start-account-mutation-refused');});
 await seeded(45241,async()=>{const {account,start}=makeStart();sentinel.bindGlobalPolicies();let ready=0;const made=await start.beginLoading({kind:'mu',manifest:buildManifest(account,1213),onReady:result=>{ready++;assert.equal(owner(),result.writer);assert(result.runtime.ready);}},async()=>{globalsAtPause();receiptsExpired();});assert(made);assert.equal(ready,1);assert.equal(made.writer.scene?.def.id,'mu');assert.equal(account.roster.length,0);assert.equal(made.writer.ledger.mireille_flasks_given,undefined);start.cancel();report('mu-onReady-once-no-roster-or-gifts');});
 await seeded(45242,async()=>{const {account,start}=makeStart();sentinel.bindGlobalPolicies();const made=await start.beginLoading({kind:'mu',manifest:buildManifest(account,1213),onReady:()=>{queueMicrotask(()=>start.cancel());}},async()=>{});assert(made);assert.equal(start.current,undefined,'queued onReady cancellation beats consumer continuation');assert.equal(made.runtime.ready,false);report('queued-onReady-cancellation-stays-retired');});

 // Real retained save and storage lease; no ignored save artifact or hand-built authority.
 if(process.env.NATIVE_LOADING_CONTINUE==='1'){
 const raw=await seeded(45300,async()=>recordedContinueSave());let continueLabels:string[]=[];
 const continueRun=async(loading:boolean)=>seeded(45301,async()=>{resetObserved();await writeCharacterMirrorRaw(CHAR_SLOT,raw);const read=await readCharacterResume();assert.equal(read.status,'ready');if(read.status!=='ready')throw Error('Actual resume lease missing');const account=makeAccount(),before=JSON.stringify(serializeAccount(account));sentinel.bindGlobalPolicies();const labels:string[]=[];
  const prepared=await refuseWorldContinue(async()=>prepareNativeCharacterContinue(account,read.resume,{spawn:'exact',isCurrent:()=>true,...loading?{loadingStage:async(label:string)=>{labels.push(label);globalsAtPause();receiptsExpired();splitPreparationPaused();assert.equal(JSON.stringify(serializeAccount(account)),before);await Promise.resolve();}}:{}}));
  try{assert(prepared.runtime.ready);globalsAtPause();receiptsExpired();if(loading)splitPreparationComplete();assert.equal(JSON.stringify(serializeAccount(account)),before);assert.equal(memory.get(charKeyFor(CHAR_SLOT)),raw);const made=prepared.publish();assert.equal(made.writer.account,account);const facts=characterFacts(made.writer),saved=serializeCharacter(made.writer);assert.equal(saved.world!.player!.vitals!.life,.37);assert.equal(saved.companions?.length,1);return{facts,labels};}finally{prepared.runtime.retire();prepared.discard();}
 });
 const syncContinue=await continueRun(false),asyncContinue=await continueRun(true);assert.deepEqual(asyncContinue.facts,syncContinue.facts);continueLabels=asyncContinue.labels;assert(continueLabels.length>=8);report('continue-equivalence-and-expired-receipts',{pauses:continueLabels});
 for(const cancelAt of continueLabels.keys())await seeded(45320+cancelAt,async()=>{resetObserved();await writeCharacterMirrorRaw(CHAR_SLOT,raw);const read=await readCharacterResume();if(read.status!=='ready')throw Error('Actual resume lease missing');const account=makeAccount(),before=JSON.stringify(serializeAccount(account)),controller=new AbortController();let index=0;sentinel.bindGlobalPolicies();await assert.rejects(prepareNativeCharacterContinue(account,read.resume,{spawn:'exact',isCurrent:()=>true,signal:controller.signal,loadingStage:async()=>{globalsAtPause();receiptsExpired();assert.equal(JSON.stringify(serializeAccount(account)),before);if(index++===cancelAt)controller.abort();}}),/cancelled|superseded/);assert.equal(index,cancelAt+1);assert.equal(JSON.stringify(serializeAccount(account)),before);assert.equal(memory.get(charKeyFor(CHAR_SLOT)),raw);if(observedWriter)assert.throws(()=>assertNativeRetainedWriterLive(observedWriter!),/retired/);globalsAtPause();report('continue-cancel-pause-'+cancelAt);});

 }
 // Inherited optional fields cannot execute while the owned loading input is copied.
 for(const key of ['options','labArts','graft','scene','provisionalMu','modeId','charId','name','kit']){const old=Object.getOwnPropertyDescriptor(Object.prototype,key);let calls=0;Object.defineProperty(Object.prototype,key,{configurable:true,get(){calls++;return 'polluted';}});try{const plain=copyNativeLoadingCharacter({classDef:CLASSES[0]}),nested=copyNativeLoadingCharacter({classDef:CLASSES[0],options:{}});for(const copied of [plain,nested]){assert(Object.isFrozen(copied));for(const field of ['options','labArts','graft','scene','provisionalMu'])assert(Object.hasOwn(copied,field));for(const field of ['modeId','charId','name','kit'])assert(Object.hasOwn(copied.options!,field));}assert.equal(calls,0);}finally{if(old)Object.defineProperty(Object.prototype,key,old);else Reflect.deleteProperty(Object.prototype,key);}}
 let reads=0;assert.throws(()=>copyNativeLoadingCharacter({classDef:CLASSES[0],get options(){reads++;return{};}}),/own data/);assert.equal(reads,0);report('inherited-and-own-optional-getters-refused');
 const original={classDef:CLASSES[0],options:{name:'Original',kit:['slash',null] as (string|null)[]}},copied=copyNativeLoadingCharacter(original);original.options.name='Changed';original.options.kit[0]='fireball';assert.equal(copied.options!.name,'Original');assert.equal(copied.options!.kit![0],'slash');assert(Object.isFrozen(copied.options!.kit));
 const hostile=new Proxy({classDef:CLASSES[0]},{getOwnPropertyDescriptor(target,key){if(key==='classDef')throw Error('descriptor refusal');return Reflect.getOwnPropertyDescriptor(target,key);}});assert.throws(()=>copyNativeLoadingCharacter(hostile),/descriptor refusal/);report('owned-copy-refuses-proxy-failure-and-isolates-mutation');
 // Inherited enumeration retains own shadow semantics without calling values.
 const inheritedKey='__loadingInheritedProbe',shadow:Record<string,number>={};Object.defineProperty(shadow,inheritedKey,{value:3,enumerable:true,configurable:true});let inheritedReads=0;
 Object.defineProperty(Object.prototype,inheritedKey,{configurable:true,enumerable:true,get(){inheritedReads++;return 4;}});
 try{assert.throws(()=>snapshotNativeGeographyData({a:1}),/inherited enumerable/);const safe=snapshotNativeGeographyData(shadow);assert.equal(Object.getOwnPropertyDescriptor(safe,inheritedKey)!.value,3);assert.equal(inheritedReads,0);}finally{Reflect.deleteProperty(Object.prototype,inheritedKey);}
 report('geography-inherited-state-and-own-shadow');
 for(const copy of [copyNativeGeographyData,snapshotNativeGeographyData]){
  const parent:{child?:object}={};parent.child=new Proxy({value:1},{getOwnPropertyDescriptor(target,key){if(key==='value')Object.setPrototypeOf(parent,{changed:true});return Reflect.getOwnPropertyDescriptor(target,key);}});
  assert.throws(()=>copy(parent),/prototype changed|non-plain prototype/,'child descriptor cannot persistently replace its parent prototype');
  const mutationKey='__loadingChildPollution';const child=new Proxy({value:1},{getOwnPropertyDescriptor(target,key){if(key==='value')Object.defineProperty(Object.prototype,mutationKey,{configurable:true,enumerable:true,value:4});return Reflect.getOwnPropertyDescriptor(target,key);}});
  try{assert.throws(()=>copy({child}),/inherited enumerable/,'child descriptor cannot persistently introduce inherited enumerable data');}finally{Reflect.deleteProperty(Object.prototype,mutationKey);}
 }
 report('geography-child-trap-persistent-prototype-changes-refused');
 // Reusing an immutable prefix must not consult Array species or constructor.
 const source=[{value:1},{value:2}],first=snapshotNativeGeographyData(source);source[1].value=3;const constructor=Object.getOwnPropertyDescriptor(Array.prototype,'constructor')!;let speciesReads=0;
 Object.defineProperty(Array.prototype,'constructor',{configurable:true,enumerable:false,get(){speciesReads++;throw Error('Unexpected Array species lookup');}});
 try{const second=snapshotNativeGeographyData(source);assert.equal(second[0],first[0]);assert.equal(second[1].value,3);assert.notEqual(second[1],first[1]);assert(Object.isFrozen(second));assert.equal(speciesReads,0);}finally{Object.defineProperty(Array.prototype,'constructor',constructor);}
 assert.deepEqual(copyNativeGeographyData(source),source);report('geography-prefix-copy-no-species');
 const samples=['','{}',' { }','"quoted"','\u0000','😀','\ud800',...Array.from({length:8},(_,i)=>'candidate-'+i), 'x'.repeat(1024*1024+1)];for(const text of [...samples,...[...samples].reverse()])assert.equal(nativeSourceDigest(text),massDigest(text));
 // Instrument the exact implementation in a fresh VM to observe only calls to
 // its pure checksum dependency; no production state or export is modified.
 const digestSource=readFileSync(new URL('../src/worldmass/nativeSourceDigest.ts',import.meta.url),'utf8');let digestCalls=0;
 const context=vm.createContext({exports:{},require:(id:string)=>{assert.equal(id,'./random');return{massDigest:(text:string)=>{digestCalls++;return massDigest(text);}};}});
 vm.runInContext(ts.transpileModule(digestSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context);
 const digest=(context.exports as {nativeSourceDigest:(text:string)=>string}).nativeSourceDigest;
 for(const text of ['a','b','c','d'])digest(text);assert.equal(digestCalls,4);digest('a');assert.equal(digestCalls,4);digest('e');assert.equal(digestCalls,5);digest('b');assert.equal(digestCalls,6,'least recently used fifth entry evicts b');
 const oversized='z'.repeat(1024*1024+1);digest(oversized);digest(oversized);assert.equal(digestCalls,8,'oversized bytes are never retained');
 const large1='1'.repeat(600000),large2='2'.repeat(600000);digest(large1);digest(large2);const before=digestCalls;digest(large1);assert.equal(digestCalls,before+1,'aggregate byte bound evicts the prior large entry');report('digest-exact-pure-equivalence-and-bounded-eviction',{samples:samples.length});
 console.log(JSON.stringify({scope:'Independent same-model candidate loading validation; actual native owners and fixture; no timing claim',cases:results.length,results}));
}finally{for(const row of [...restoredMethods].reverse())Object.defineProperty(row.target,row.key,row.descriptor);for(const row of savedGlobals){if(row.descriptor)Object.defineProperty(globalThis,row.key,row.descriptor);else Reflect.deleteProperty(globalThis,row.key);}}