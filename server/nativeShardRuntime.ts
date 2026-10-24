/** Dedicated retained keeper ownership. Socket admission, server desks, interest
 * scheduling and persistence are separate integration stages. */
import {World,isNativeWorld,type Seat} from '../src/engine/world';
import type {PlayerInput,MetaAction} from '../src/net/intent';
import {noteActionEcho} from '../src/net/snapshot';
import {serializeAccount,type Account,type AccountSave} from '../src/meta/account';
import {serializeCharacter,type CharacterSave} from '../src/meta/character';
import {NativeAreaCharacterResume} from '../src/worldmass/nativeAreaCharacterResume';
import {readNativeRetainedSave} from '../src/worldmass/nativeRetainedSave';
import {QUEST_GROUND_LEDGER} from '../src/engine/questLedger';
import {CLASSES,type ClassDef} from '../src/data/classes';
import {START_ZONE,type ZoneDef} from '../src/data/zones';
import {buildManifest} from '../src/packages/manifest';
import {createNativeGeographyReader} from '../src/world/geographySource';
import {captureNativeGeographySource} from '../src/world/captureGeography';
import {makeNativeGeographyCatalogSpec,NativeGeographyCatalog} from '../src/worldmass/nativeGeographyCatalog';
import type {MassNativeGeography} from '../src/worldmass/nativeGeography';
import {NativeAreaCampaignSession,hasNativeAreaCampaignSession} from '../src/worldmass/nativeAreaCampaignSession';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaMemoryRegistry,hasNativeAreaMemoryRegistry} from '../src/worldmass/nativeAreaMemoryRegistry';
import {NativeAreaMaddenLedger} from '../src/worldmass/nativeAreaMaddenLedger';
import {NativeAreaSceneTransitionCoordinator,hasNativeAreaSceneTransitionCoordinator} from '../src/worldmass/nativeAreaSceneTransitionCoordinator';
import {NativeAreaScenePreparation} from '../src/worldmass/nativeAreaScenePreparation';
import {NativeAreaCharacterCreation} from '../src/worldmass/nativeAreaCharacterCreation';
import {NativeAreaHostedSnapshots} from '../src/worldmass/nativeAreaHostedSnapshots';
import {NativeAreaSceneInput} from '../src/worldmass/nativeAreaSceneInput';
import {NativeAreaSceneCombat} from '../src/worldmass/nativeAreaSceneCombat';
import {NativeAreaSceneCampaignFrame} from '../src/worldmass/nativeAreaSceneCampaignFrame';
import type {NativeAreaOngoingRuntime,NativeAreaSceneOngoing} from '../src/worldmass/nativeAreaSceneOngoing';
import {assertNativeRetainedMassState} from '../src/worldmass/nativeAreaRetainedMassState';
import {retireNativeRetainedWriter,bindNativeRetainedWriterCancellation} from '../src/worldmass/nativeAreaRetainedLifetime';
import {bootShardEngine,SHARD_CFG} from './shardHost';
export interface NativeShardStart {readonly account:Account;readonly seed:number;readonly keeperClass?:ClassDef;readonly resume?:CharacterSave}
export interface NativeShardState {readonly account:AccountSave;readonly keeper:CharacterSave}
export interface NativeShardStep {readonly ready:boolean;readonly aiAreas:readonly string[]}
export interface NativeShardAction {readonly seatId:string;readonly action:unknown;readonly seq?:unknown;readonly current?:()=>boolean}
export interface NativeShardFrame {readonly dt:number;readonly wallSeconds:number;readonly inputs:Map<string,PlayerInput>;readonly actions:readonly NativeShardAction[];readonly deferRoadDrain?:boolean}
export interface NativeShardFrameResult extends NativeShardStep {readonly droppedActions:readonly {seatId:string;error:unknown}[];readonly appliedActions:number}
const installed=new WeakMap<World,NativeShardRuntime>(),handles=new WeakSet<object>();
function own<T>(object:object,key:PropertyKey):T{const d=Object.getOwnPropertyDescriptor(object,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native shard needs ordinary actual data: '+String(key));return d.value as T;}
function member(rows:readonly Seat[],seat:Seat):boolean{if(!Array.isArray(rows)||Object.getPrototypeOf(rows)!==Array.prototype)throw Error('Native shard needs its actual raw roster');let found=false;for(let i=0;i<own<number>(rows,'length');i++)if(own(rows,i)===seat)found=true;return found;}
export function nativeShardRuntimeFor(writer:World):NativeShardRuntime|undefined{return installed.get(writer);}
export function isNativeShardRuntime(value:unknown):value is NativeShardRuntime{return !!value&&typeof value==='object'&&handles.has(value);}
export class NativeShardRuntime {
 readonly writer:World;readonly geography:MassNativeGeography;readonly catalog:NativeGeographyCatalog;readonly definition:ZoneDef;readonly hosted:NativeAreaHostedSnapshots;
 readonly #session:NativeAreaCampaignSession;readonly #authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>;readonly #coordinator:NativeAreaSceneTransitionCoordinator;readonly #creation:NativeAreaCharacterCreation;
 readonly #preparation:NativeAreaScenePreparation;readonly #resume:NativeAreaCharacterResume|undefined;readonly #startupGround:unknown;readonly #restore=NativeAreaCharacterResume.prototype.install;readonly #discardResume=NativeAreaCharacterResume.prototype.discard;
 readonly #keeperClass:ClassDef;readonly #keeperName:string;readonly #reviveSec:number;readonly #controller=new AbortController();
 readonly #allowHold=()=>false;readonly #chronoScope:{radius:number};readonly #timeflow:World['timeflow'];readonly #previousHold:PropertyDescriptor|undefined;readonly #previousScope:PropertyDescriptor|undefined;
 readonly #close=NativeAreaSceneTransitionCoordinator.prototype.retire;readonly #retireAuthority=NativeAreaActorAuthority.prototype.retire;readonly #retireMemory=NativeAreaMemoryRegistry.prototype.retire;
 readonly #createKeeper=NativeAreaCharacterCreation.prototype.createKeeper;readonly #retireCreation=NativeAreaCharacterCreation.prototype.retire;
 readonly #idleFrame=NativeAreaSceneTransitionCoordinator.prototype.assertIdleFrame;readonly #policies=World.prototype.withGlobalPolicies;
 readonly #requireActor=NativeAreaActorAuthority.prototype.require;readonly #binding=NativeAreaActorAuthority.prototype.bindingFor;readonly #physical=NativeAreaActorAuthority.prototype.assertFinalPhysical;
 readonly #passInputTime=NativeAreaSceneInput.prototype.passInputTime;readonly #applyInputs=NativeAreaSceneInput.prototype.applyInputs;readonly #updateAI=NativeAreaSceneCombat.prototype.updateAI;readonly #tick=NativeAreaSceneCampaignFrame.prototype.tick;
 #state:'prepared'|'installing'|'ready'|'retired'='prepared';#busy=false;#keeper:Seat|undefined;#keeperBody:Seat['actor']|undefined;#keeperTag:Seat['keeper'];
 constructor(input:NativeShardStart){
  const account=own<Account>(input,'account'),seed=own<number>(input,'seed'),save=Object.hasOwn(input,'resume')?own<CharacterSave>(input,'resume'):undefined,record=save?readNativeRetainedSave(save):undefined,keeperClass=Object.hasOwn(input,'keeperClass')?own<ClassDef>(input,'keeperClass'):(CLASSES.find(c=>c.id===(save?.classId??SHARD_CFG.keeper.classId))??CLASSES[0]);
  if(record&&(!record.catalog||record.manifest.seed!==seed||save!.classId!==keeperClass.id))throw Error('Native shard resume needs its recorded catalog, seed and keeper class');
  if(!account||typeof account!=='object'||!Number.isInteger(seed)||seed<0||seed>0xffffffff||!CLASSES.includes(keeperClass))throw Error('Native shard needs its actual account, uint32 seed and catalog keeper class');
  bootShardEngine();const writer=World.staged(account,Object.freeze(record?record.manifest:buildManifest(account,seed)));
  if(!isNativeWorld(writer)||installed.has(writer)||hasNativeAreaCampaignSession(writer)||hasNativeAreaMemoryRegistry(writer)||hasNativeAreaSceneTransitionCoordinator(writer))throw Error('Native shard needs its one empty actual campaign writer');assertNativeRetainedMassState(writer);
  if(own(writer,'clientActionHook')!==undefined||own(writer,'shardWorld')!==undefined||own<Seat[]>(writer,'seats').length||own<unknown[]>(writer,'actors').length||own(writer,'localSeat')!==undefined)throw Error('Native shard cannot adopt a render shell, legacy unit or already-created character');
  bindNativeRetainedWriterCancellation(writer,this.#controller.signal);
  this.writer=writer;this.#resume=save?new NativeAreaCharacterResume(writer,save):undefined;this.#startupGround=this.#resume?structuredClone(this.#resume.record.world.overlays?.[QUEST_GROUND_LEDGER]):undefined;this.#keeperClass=keeperClass;this.#keeperName=SHARD_CFG.keeper.name;this.#reviveSec=SHARD_CFG.keeper.reviveSec;
  this.catalog=record?.catalog??Reflect.apply(this.#policies,writer,[()=>new NativeGeographyCatalog(makeNativeGeographyCatalogSpec(createNativeGeographyReader(captureNativeGeographySource(seed)).identity))]);this.geography=this.catalog.initial;this.definition=writer.zoneMap[START_ZONE];
  this.#timeflow=own<World['timeflow']>(writer,'timeflow');this.#previousHold=Object.getOwnPropertyDescriptor(this.#timeflow,'allowHold');this.#previousScope=Object.getOwnPropertyDescriptor(this.#timeflow,'chronoScope');this.#chronoScope=Object.freeze({radius:SHARD_CFG.chronoRadius});
  if(this.#previousHold&&!this.#previousHold.configurable||this.#previousScope&&!this.#previousScope.configurable)throw Error('Native shard timeflow policy slots must be replaceable');
  let acquired=false,coordinator:NativeAreaSceneTransitionCoordinator|undefined,memory:NativeAreaMemoryRegistry|undefined,authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>|undefined,creation:NativeAreaCharacterCreation|undefined;
  try{
   this.#session=new NativeAreaCampaignSession(writer);acquired=true;authority=this.#authority=new NativeAreaActorAuthority<NativeAreaOngoingRuntime>(this.#session.campaign);memory=new NativeAreaMemoryRegistry(writer);memory.bindRecordedGeography(this.geography,this.catalog);
   coordinator=this.#coordinator=new NativeAreaSceneTransitionCoordinator({campaign:this.#session.campaign,characterWriter:writer,authority,memoryRegistry:memory});this.#session.bindCoordinator(coordinator);
   const maddenLedger=new NativeAreaMaddenLedger({campaign:this.#session.campaign,authority,banks:own<World['maddenBanks']>(writer,'maddenBanks')}),preparation=this.#preparation=new NativeAreaScenePreparation({session:this.#session,coordinator,authority,maddenLedger,catalog:this.catalog});
   creation=this.#creation=new NativeAreaCharacterCreation(preparation,this.definition,this.geography);this.hosted=new NativeAreaHostedSnapshots({writer,coordinator,authority});
   Object.defineProperties(this.#timeflow,{allowHold:{value:this.#allowHold,configurable:true,writable:true,enumerable:true},chronoScope:{value:this.#chronoScope,configurable:true,writable:true,enumerable:true}});
   for(const key of ['writer','geography','catalog','definition','hosted'])Object.defineProperty(this,key,{writable:false,configurable:false});installed.set(writer,this);handles.add(this);
  }catch(error){if(acquired){if(coordinator)Reflect.apply(this.#close,coordinator,[]);else{retireNativeRetainedWriter(writer);if(authority)Reflect.apply(this.#retireAuthority,authority,[]);if(memory)Reflect.apply(this.#retireMemory,memory,[]);}if(creation)Reflect.apply(this.#retireCreation,creation,[]);this.#restoreTimeflow();}throw error;}
 }
 #live(checkKeeperPolicy=true):void{if(this.#state==='retired')throw Error('Native shard runtime is retired');if(installed.get(this.writer)!==this)throw Error('Native shard runtime registration changed');assertNativeRetainedMassState(this.writer);if(this.#controller.signal.aborted)throw Error('Native shard operation cancelled');
  if(own(this.writer,'clientActionHook')!==undefined||own(this.writer,'shardWorld')!==undefined)throw Error('Native shard cannot dispatch a render shell or legacy unit');
  if(own(this.writer,'timeflow')!==this.#timeflow||own(this.#timeflow,'allowHold')!==this.#allowHold||own(this.#timeflow,'chronoScope')!==this.#chronoScope)throw Error('Native shard timeflow policy changed');
  if(this.#keeper){if(own(this.writer,'localSeat')!==this.#keeper||own(this.#keeper,'actor')!==this.#keeperBody||own(this.#keeper,'keeper')!==this.#keeperTag||!member(own<Seat[]>(this.writer,'seats'),this.#keeper))throw Error('Native shard keeper identity changed');
   const body=this.#keeperBody!,owner=Reflect.apply(this.#requireActor,this.#authority,[body]);Reflect.apply(this.#physical,this.#authority,[Reflect.apply(this.#binding,this.#authority,[owner.scene]),[body]]);
   if(own(this.#keeperTag!,'reviveSec')!==this.#reviveSec||(checkKeeperPolicy&&(own(body,'untargetable')!==true||own(body,'passive')!==true||own(body,'baseInvulnerable')!==true)))throw Error('Native shard keeper policy changed');
  }
 }
 #idle():void{this.#live();if(this.#busy)throw Error('Native shard runtime cannot reenter');Reflect.apply(this.#idleFrame,this.#coordinator,[]);}
 get ready():boolean{if(this.#state==='retired')return false;this.#idle();this.#busy=true;try{const result=this.#state==='ready'&&this.#coordinator.nativeWorldReady();this.#live();return result;}finally{this.#busy=false;}}
 get current():NativeAreaSceneOngoing{this.#idle();this.#busy=true;try{if(this.#state!=='ready'||!this.#coordinator.nativeWorldReady())throw Error('Native shard runtime is not ready');const area=this.#coordinator.published;this.#live();return area;}finally{this.#busy=false;}}
 get keeper():Seat{this.#idle();if(this.#state!=='ready'||!this.#keeper)throw Error('Native shard keeper is not ready');return this.#keeper;}
 install(signal?:AbortSignal):void{
  this.#idle();if(this.#state!=='prepared')throw Error('Native shard initial installation was already attempted');if(signal!==undefined&&!(signal instanceof AbortSignal))throw Error('Native shard needs an actual cancellation signal');
  const abort=()=>this.#controller.abort(),aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted')!.get!;if(signal){Reflect.apply(EventTarget.prototype.addEventListener,signal,['abort',abort,{once:true}]);if(Reflect.apply(aborted,signal,[]))abort();}
  this.#busy=true;this.#state='installing';
  try{this.#live();Reflect.apply(this.#policies,this.writer,[()=>this.#resume?Reflect.apply(this.#restore,this.#resume,[this.#preparation,this.#creation,'town',this.#controller.signal]):Reflect.apply(this.#createKeeper,this.#creation,[this.#keeperClass,this.#keeperName,this.#controller.signal])]);this.#live();
   const keeper=own<Seat>(this.writer,'localSeat'),body=own<Seat['actor']>(keeper,'actor');if(own<Seat[]>(this.writer,'seats').length!==1||own<Seat[]>(this.writer,'seats')[0]!==keeper||this.#coordinator.published.assembly.input.scene.player!==body)throw Error('Native shard keeper birth differs');
   // Match the original server: tag only after all native creation statements.
   const tag={reviveSec:this.#reviveSec};keeper.keeper=tag;body.untargetable=true;body.passive=true;body.invulnerable=true;this.#keeper=keeper;this.#keeperBody=body;this.#keeperTag=tag;this.#live();this.#state='ready';
  }catch(error){this.#busy=false;this.#retire();throw error;}finally{this.#busy=false;if(signal)Reflect.apply(EventTarget.prototype.removeEventListener,signal,['abort',abort]);}
 }
 /** THE OFFLINE HERO'S GROUND (shard W12): the reserved ground row of the startup record alone
  * (NativeAreaCharacterResume.record, the one validated record the graph restore reads), read once at
  * construction, never from the file again, never from the rebuilt overlay registry; undefined on a
  * fresh world. A copy each read: the record stays private. The host adopts it into its vessel desk. */
 get startupQuestGround():unknown{return structuredClone(this.#startupGround);}
 /** Capture the real native world memories and keeper build under one idle owner. */
 capture():NativeShardState{this.#idle();this.#busy=true;try{if(this.#state!=='ready')throw Error('Native shard capture needs an installed keeper');return Reflect.apply(this.#policies,this.writer,[()=>{this.#live();const keeper=serializeCharacter(this.writer);this.#live();const account=serializeAccount(this.writer.account);this.#live();return structuredClone({account,keeper});}]);}finally{this.#busy=false;if(this.#controller.signal.aborted)this.#retire();}}
 /** Original server warden maintenance, restricted to this actual idle keeper. */
 maintainKeeper():void{
  this.#live(false);if(this.#busy||this.#state!=='ready'||!this.#keeper||!this.#keeperBody)throw Error('Native keeper maintenance requires its idle installed owner');Reflect.apply(this.#idleFrame,this.#coordinator,[]);
  const keeper=this.#keeper,body=this.#keeperBody,id=own<string>(keeper,'id'),meta=own<Seat['meta']>(keeper,'meta'),hero=Object.getOwnPropertyDescriptor(keeper,'home')?.value??body;
  const check=()=>{this.#live();if(own(keeper,'id')!==id||own(keeper,'meta')!==meta||(Object.getOwnPropertyDescriptor(keeper,'home')?.value??body)!==hero)throw Error('Native keeper selected character changed');};
  this.#busy=true;
  try{Reflect.apply(this.#policies,this.writer,[()=>{
   body.invulnerable=true;body.untargetable=true;body.passive=true;body.levitates=true;if(body.downed||body.dead){body.downed=false;body.dead=false;}check();
   if(body.life<=0){const max=body.maxLife;check();const life=Reflect.apply(max,body,[]);check();body.life=life;}keeper.lastActedAt=this.writer.time;
   let level=0;const roster=own<Seat[]>(this.writer,'seats');for(let i=0;i<own<number>(roster,'length');i++){const seat=own<Seat>(roster,i),actor=own<Seat['actor']>(seat,'actor');if(!Object.getOwnPropertyDescriptor(seat,'keeper')?.value&&!own<boolean>(actor,'dead'))level=Math.max(level,own<number>(actor,'level'));}
   check();if(own(this.writer,'seats')!==roster)throw Error('Native keeper roster changed');
   if(level>0&&body.level!==level){body.level=level;const area=this.#coordinator.areaFor(Reflect.apply(this.#requireActor,this.#authority,[body]).combat),owner=area.combat.serverSeats,fn=owner.recalcSeat;check();Reflect.apply(fn,owner,[keeper]);check();}
  }]);}finally{this.#busy=false;if(this.#controller.signal.aborted)this.#retire();}
 }
 /** Compatibility entry for an idle keeper. Actual transport frames use dispatch. */
 step(dt:number):NativeShardStep{const result=this.dispatch({dt,wallSeconds:dt,inputs:new Map(),actions:[]});return Object.freeze({ready:result.ready,aiAreas:result.aiAreas});}
 /** One already-drained server frame. The shared input clock and campaign clock
  * each advance once; actions resolve through their current physical area. */
 dispatch(frame:NativeShardFrame):NativeShardFrameResult{
  this.#idle();this.#busy=true;
  try{const dt=own<number>(frame,'dt'),wallSeconds=own<number>(frame,'wallSeconds'),inputs=own<Map<string,PlayerInput>>(frame,'inputs'),actions=own<readonly NativeShardAction[]>(frame,'actions');
   if(!Number.isFinite(dt)||dt<0||!Number.isFinite(wallSeconds)||wallSeconds<dt)throw Error('Native shard frame time must be finite, nonnegative and within its wall budget');
   if(!(inputs instanceof Map)||Object.getPrototypeOf(inputs)!==Map.prototype||!Array.isArray(actions)||Object.getPrototypeOf(actions)!==Array.prototype)throw Error('Native shard needs actual drained input and action collections');
   if(this.#state!=='ready')return Object.freeze({ready:false,aiAreas:Object.freeze([]),droppedActions:Object.freeze([]),appliedActions:0});
   return Reflect.apply(this.#policies,this.writer,[()=>{
    this.#live();let area=this.#coordinator.published;
    const remoteInputs=new Map<string,PlayerInput>(),roster=own<Seat[]>(this.writer,'seats');member(roster,this.#keeper!);for(let i=0;i<own<number>(roster,'length');i++){const seat=own<Seat>(roster,i);if(seat===this.#keeper||Object.getOwnPropertyDescriptor(seat,'keeper')?.value)continue;const id=own<string>(seat,'id'),input=Reflect.apply(Map.prototype.get,inputs,[id]);if(input)remoteInputs.set(id,input);}
    Reflect.apply(this.#passInputTime,area.combat.inputFrame,[wallSeconds-dt]);this.#live();Reflect.apply(this.#applyInputs,area.combat.inputFrame,[remoteInputs,dt]);this.#live();
    const landed=new Map<string,number>(),droppedActions:{seatId:string;error:unknown}[]=[];let appliedActions=0;
    for(let index=0;index<own<number>(actions,'length');index++){
     this.#live();const row=own<NativeShardAction>(actions,index),id=own<string>(row,'seatId'),rows=own<Seat[]>(this.writer,'seats');let seat:Seat|undefined;
     for(let i=0;i<own<number>(rows,'length');i++){const candidate=own<Seat>(rows,i);if(own(candidate,'id')===id){if(seat)throw Error('Native shard action seat is ambiguous');seat=candidate;}}
     if(!seat||seat===this.#keeper||Object.getOwnPropertyDescriptor(seat,'keeper')?.value)continue;
     const body=own<Seat['actor']>(seat,'actor'),current=Object.hasOwn(row,'current')?own<()=>boolean>(row,'current'):undefined;if(current!==undefined&&typeof current!=='function')throw Error('Native shard action restriction must be callable');if(current&&!Reflect.apply(current,undefined,[]))continue;this.#live();if(own(this.writer,'seats')!==rows||!member(rows,seat)||own(seat,'actor')!==body||own(seat,'id')!==id)throw Error('Native shard action seat changed before echo');noteActionEcho(this.#session.campaign,seat,Object.hasOwn(row,'seq')?own(row,'seq'):undefined);this.#live();
     const n=(landed.get(id)??0)+1;landed.set(id,n);if(n>SHARD_CFG.actionsPerSeatPerTick)continue;
     const action=own<unknown>(row,'action');if(!action||typeof action!=='object'||typeof Object.getOwnPropertyDescriptor(action,'t')?.value!=='string')continue;
     try{
      const owner=Reflect.apply(this.#requireActor,this.#authority,[body]),binding=Reflect.apply(this.#binding,this.#authority,[owner.scene]),target=this.#coordinator.areaFor(owner.combat),receiver=own<NativeAreaSceneCampaignFrame>(target.combat,'campaignFrame'),apply=receiver.applyAction;
      if(current&&!Reflect.apply(current,undefined,[]))continue;this.#live();if(own(this.writer,'seats')!==rows||!member(rows,seat)||own(seat,'actor')!==body||own(seat,'id')!==id)throw Error('Native shard action seat changed during selection');Reflect.apply(this.#physical,this.#authority,[binding,[body]]);
      Reflect.apply(apply,receiver,[seat,action as MetaAction]);this.#live();appliedActions++;
     }catch(error){droppedActions.push({seatId:id,error});}
    }
    this.#live();const aiAreas:string[]=[];if(!this.writer.gameOver)for(const resident of this.#coordinator.residentAreas()){this.#live();this.#coordinator.runFrom(resident,()=>Reflect.apply(this.#updateAI,resident.combat,[dt]));this.#live();aiAreas.push(resident.assembly.input.scene.zone.id);}
    area=this.#coordinator.published;Reflect.apply(this.#tick,area.combat.campaignFrame,[dt,Object.hasOwn(frame,'deferRoadDrain')?{deferRoadDrain:own<boolean>(frame,'deferRoadDrain')}:undefined]);this.#live();return Object.freeze({ready:true,aiAreas:Object.freeze(aiAreas),droppedActions:Object.freeze(droppedActions),appliedActions});
   }]);
  }finally{this.#busy=false;if(this.#controller.signal.aborted)this.#retire();}
 }
 cancel():void{if(this.#state==='retired')return;this.#controller.abort();if(!this.#busy)this.#retire();}
 retire():readonly string[]{if(this.#busy)throw Error('Native shard cannot retire during an operation');return this.#retire();}
 #restoreTimeflow():string[]{const unrestored:string[]=[];for(const [key,expected,previous]of [['allowHold',this.#allowHold,this.#previousHold],['chronoScope',this.#chronoScope,this.#previousScope]] as const){const current=Object.getOwnPropertyDescriptor(this.#timeflow,key);if(current?.configurable&&current.value===expected){if(previous)Object.defineProperty(this.#timeflow,key,previous);else Reflect.deleteProperty(this.#timeflow,key);}else if(current?.value!==previous?.value)unrestored.push('timeflow.'+key);}return unrestored;}
 #retire():readonly string[]{const unrestored=Reflect.apply(this.#close,this.#coordinator,[]);this.#state='retired';Reflect.apply(this.#retireCreation,this.#creation,[]);if(this.#resume)Reflect.apply(this.#discardResume,this.#resume,[]);return Object.freeze([...unrestored,...this.#restoreTimeflow()]);}
}
export function installNativeShardRuntime(input:NativeShardStart,signal?:AbortSignal):NativeShardRuntime{const runtime=new NativeShardRuntime(input);runtime.install(signal);return runtime;}
