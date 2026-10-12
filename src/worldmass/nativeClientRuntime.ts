/** A writer-bound retained client installation and authoritative frame dispatcher.
 * Character creation/gifts, renderer publication, network shell and Continue are
 * explicit client integration steps; none are simulated by this owner. */
import {isNativeWorld,type World,type Seat} from '../engine/world';
import type {Actor} from '../engine/actor';
import type {ZoneDef} from '../data/zones';
import type {MetaAction,PlayerInput,PlayerInputQuery,PlayerInputSource} from '../net/intent';
import {NullInput} from '../net/intent';
import {MercInput} from '../engine/mercbrain';
import {ScriptedInput,LocalCoopInput} from '../net/scripted';
import {PadSeatInput} from '../net/couch';
import {RemoteInput} from '../net/remote';
import {noteActionEcho} from '../net/snapshot';
import {MassNativeGeography,type MassNativeGeographySpec} from './nativeGeography';
import {retireNativeRetainedWriter} from './nativeAreaRetainedLifetime';
import {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';
import {NativeAreaCampaignSession,hasNativeAreaCampaignSession} from './nativeAreaCampaignSession';
import {NativeAreaActorAuthority,type NativeAreaActorSelection} from './nativeAreaActorAuthority';
import {NativeAreaMaddenLedger} from './nativeAreaMaddenLedger';
import {NativeAreaMemoryRegistry,hasNativeAreaMemoryRegistry} from './nativeAreaMemoryRegistry';
import {NativeAreaSceneTransitionCoordinator,hasNativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
import {NativeAreaScenePreparation} from './nativeAreaScenePreparation';
import type {NativeAreaOngoingRuntime,NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';
const installed=new WeakMap<World,NativeClientRuntime>(),handles=new WeakSet<object>();
const select=NativeAreaActorAuthority.prototype.selectActors,final=NativeAreaActorAuthority.prototype.assertFinalSelections,present=NativeAreaActorAuthority.prototype.isPresentActor;
function own<T>(o:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(o,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native client needs ordinary actual data: '+String(key));return d.value as T;}
function assertAuthorityRole(writer:World):void {for(const key of ['clientActionHook','shardWorld']){const d=Object.getOwnPropertyDescriptor(writer,key);if(!d||!Object.hasOwn(d,'value')||d.value!==undefined)throw Error('Native client authority cannot install or dispatch on a network render shell or legacy shard unit');}}
function roster(writer:World):readonly Seat[]{const rows=own<Seat[]>(writer,'seats');if(!Array.isArray(rows)||Object.getPrototypeOf(rows)!==Array.prototype)throw Error('Native client needs the actual raw roster');const n=own<number>(rows,'length');for(let i=0;i<n;i++)own(rows,i);return rows;}
function member(rows:readonly Seat[],seat:Seat):boolean {for(let i=0;i<own<number>(rows,'length');i++)if(own(rows,i)===seat)return true;return false;}
function time(value:number):void {if(!Number.isFinite(value)||value<0)throw Error('Native client frame time must be finite and nonnegative');}
export interface NativeClientInstallation {readonly writer:World;readonly geography:MassNativeGeographySpec;readonly definition:ZoneDef}
export interface NativeClientMetaAction {readonly seatId:string;readonly action:MetaAction;readonly seq?:number}
export interface NativeClientFrame {readonly dt:number;readonly wallSeconds:number;readonly inputs:Map<string,PlayerInput>;readonly actions?:readonly NativeClientMetaAction[];readonly gearVacuum?:boolean}
export interface NativeClientFrameResult {readonly ready:boolean;readonly aiAreas:readonly string[];readonly droppedActions:readonly {seatId:string;error:unknown}[]}
interface SeatSelection {readonly seat:Seat;readonly id:string;readonly body:Actor;readonly rows:readonly Seat[];readonly selection:readonly NativeAreaActorSelection<NativeAreaOngoingRuntime>[];readonly area:NativeAreaSceneOngoing}
export function nativeClientRuntimeFor(writer:World):NativeClientRuntime|undefined {return installed.get(writer);}
export function isNativeClientRuntime(value:unknown):value is NativeClientRuntime{return !!value&&typeof value==='object'&&handles.has(value);}
export class NativeClientRuntime {
 readonly #retireAuthority=NativeAreaActorAuthority.prototype.retire;readonly #retireMemory=NativeAreaMemoryRegistry.prototype.retire;
 readonly #close=NativeAreaSceneTransitionCoordinator.prototype.retire;readonly #assertIdle=NativeAreaSceneTransitionCoordinator.prototype.assertIdleFrame;
 readonly writer:World;readonly geography:MassNativeGeography;readonly definition:ZoneDef;
 readonly #session:NativeAreaCampaignSession;readonly #authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>;readonly #coordinator:NativeAreaSceneTransitionCoordinator;readonly #preparation:NativeAreaScenePreparation;
 #state:'prepared'|'installing'|'ready'|'retired'='prepared';#busy=false;
 constructor(input:NativeClientInstallation){
  const writer=own<World>(input,'writer'),definition=own<ZoneDef>(input,'definition'),spec=own<MassNativeGeographySpec>(input,'geography');
  if(!isNativeWorld(writer)||installed.has(writer))throw Error('Native client runtime needs its one actual writer');assertNativeRetainedMassState(writer);
  if(hasNativeAreaCampaignSession(writer)||hasNativeAreaMemoryRegistry(writer)||hasNativeAreaSceneTransitionCoordinator(writer))throw Error('Native client cannot adopt already-owned campaign roots');
  assertAuthorityRole(writer);
  if((writer.zoneMap[definition.id]??writer.caveMap[definition.id])!==definition)throw Error('Native client definition must be the exact recorded campaign definition');
  const geography=new MassNativeGeography(spec);if(geography.seed!==writer.manifest.seed)throw Error('Native client geography belongs to a different campaign seed');
  const rows=roster(writer),seat=own<Seat>(writer,'localSeat'),body=own<Actor>(seat,'actor'),actors=own<Actor[]>(writer,'actors');
  if(rows.length!==1||rows[0]!==seat||actors.length!==1||actors[0]!==body)throw Error('Native client initial installation requires the genuine unplaced local character; companion/cohort hydration is a separate bootstrap step');
  const banks=own<World['maddenBanks']>(writer,'maddenBanks');try{Reflect.apply(WeakMap.prototype.has,banks,[{}]);}catch{throw Error('Native client needs the actual madness ledger');}
  this.writer=writer;this.geography=geography;this.definition=definition;
  let acquired=false,coordinator:NativeAreaSceneTransitionCoordinator|undefined,memoryRegistry:NativeAreaMemoryRegistry|undefined,authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>|undefined;
  try{
  const session=this.#session=new NativeAreaCampaignSession(writer),campaign=session.campaign;acquired=true;authority=this.#authority=new NativeAreaActorAuthority<NativeAreaOngoingRuntime>(campaign);memoryRegistry=new NativeAreaMemoryRegistry(writer);
  coordinator=this.#coordinator=new NativeAreaSceneTransitionCoordinator({campaign,characterWriter:writer,authority,memoryRegistry});session.bindCoordinator(coordinator);
  const maddenLedger=new NativeAreaMaddenLedger({campaign,authority,banks});
  this.#preparation=new NativeAreaScenePreparation({session,coordinator,authority,maddenLedger});
  for(const key of ['writer','geography','definition'])Object.defineProperty(this,key,{writable:false,configurable:false});installed.set(writer,this);handles.add(this);
  }catch(error){if(!acquired)throw error;if(coordinator)Reflect.apply(this.#close,coordinator,[]);else{retireNativeRetainedWriter(writer);if(authority)Reflect.apply(this.#retireAuthority,authority,[]);if(memoryRegistry)Reflect.apply(this.#retireMemory,memoryRegistry,[]);}throw error;}
 }
 #live():void {if(this.#state==='retired')throw Error('Native client runtime is retired');if(installed.get(this.writer)!==this)throw Error('Native client runtime registration changed');assertNativeRetainedMassState(this.writer);assertAuthorityRole(this.writer);}
 #idle():void {this.#live();if(this.#busy)throw Error('Native client runtime cannot reenter');Reflect.apply(this.#assertIdle,this.#coordinator,[]);}
 #isReady():boolean {const ready=this.#state==='ready'&&this.#coordinator.nativeWorldReady();this.#live();return ready;}
 get ready():boolean {if(this.#state==='retired')return false;this.#idle();this.#busy=true;try{return this.#isReady();}finally{this.#busy=false;}}
 get current():NativeAreaSceneOngoing {this.#idle();this.#busy=true;try{if(!this.#isReady())throw Error('Native client runtime is not ready');return this.#coordinator.published;}finally{this.#busy=false;}}
 /** Final publication is synchronous. Caller checks loading generation before
  * this entry; AbortSignal is rechecked after each native preparation boundary. */
 install(signal?:AbortSignal):void {
  this.#idle();if(this.#state!=='prepared')throw Error('Native client initial installation was already attempted');
  this.#busy=true;this.#state='installing';
  try{if(signal?.aborted)throw Error('Native client installation cancelled');this.#live();const area=this.#preparation.prepare(this.definition.id,this.geography);if(signal?.aborted)throw Error('Native client installation cancelled');this.#live();this.#preparation.birthInitial(area);if(signal?.aborted)throw Error('Native client installation cancelled');this.#live();this.#state='ready';}
  catch(error){this.#busy=false;this.#retire();throw error;}finally{this.#busy=false;}
 }
 /** Terminal: retained bindings, tickets, callbacks and memory registrations are
  * revoked by their owners. Raw native gameplay state is not rolled back. */
 retire():readonly string[] {return this.#retire();}
 #retire():readonly string[] {if(this.#state==='retired')return Reflect.apply(this.#close,this.#coordinator,[]);if(this.#busy)throw Error('Native client runtime cannot retire during dispatch');const unrestored=Reflect.apply(this.#close,this.#coordinator,[]);this.#state='retired';return unrestored;}
 #seat(seat:Seat):SeatSelection {
  this.#live();const rows=roster(this.writer);if(!member(rows,seat))throw Error('Native client input seat left campaign');const body=own<Actor>(seat,'actor'),id=own<string>(seat,'id');
  const selection=Reflect.apply(select,this.#authority,[[body],false]);if(selection.length!==1)throw Error('Native client input requires one physical owner');const area=this.#coordinator.areaFor(selection[0].owner.combat);
  const capture={seat,id,body,rows,selection,area};this.#final(capture);return capture;
 }
 #final(c:SeatSelection):void {this.#live();if(roster(this.writer)!==c.rows||!member(c.rows,c.seat)||own(c.seat,'id')!==c.id||own(c.seat,'actor')!==c.body)throw Error('Native client input seat changed during selection');Reflect.apply(final,this.#authority,[c.selection]);}
 /** This finite query view exists only during the genuine input source call. */
 pollSeat(seat:Seat,dt:number):PlayerInput|null {
  this.#idle();this.#busy=true;
  try{time(dt);if(!this.#isReady())throw Error('Native client polling needs admitted publication');const capture=this.#seat(seat),source=own<PlayerInputSource>(seat,'input');
   if(!(source instanceof NullInput||source instanceof RemoteInput||source instanceof MercInput||source instanceof ScriptedInput||source instanceof LocalCoopInput||source instanceof PadSeatInput))throw Error('Native client input source needs a reviewed area query contract');
   let active=true;const check=()=>{if(!active)throw Error('Native input query has expired');this.#final(capture);};const {population,ecology}=capture.area.assembly.input,combat=capture.area.combat,self=this;
   const query:PlayerInputQuery={get player(){check();const representative=own<Actor>(capture.area.assembly.input.scene,'player');return Reflect.apply(present,self.#authority,[capture.area.assembly.input.scene,representative])?representative:capture.body;},
    get enemiesOf(){check();const fn=population.enemiesOf;return(...args:Parameters<PlayerInputQuery['enemiesOf']>)=>{check();return Reflect.apply(fn,population,args);};},
    get actorById(){check();const fn=ecology.actorById;return(...args:Parameters<PlayerInputQuery['actorById']>)=>{check();return Reflect.apply(fn,ecology,args);};},
    get hostileTo(){check();const fn=population.hostileTo;return(...args:Parameters<PlayerInputQuery['hostileTo']>)=>{check();return Reflect.apply(fn,population,args);};},
    get isConcealedFrom(){check();const fn=combat.isConcealedFrom;return(...args:Parameters<PlayerInputQuery['isConcealedFrom']>)=>{check();return Reflect.apply(fn,combat,args);};},
    get losCached(){check();const receiver=combat.ai,fn=receiver.losCached;return(...args:Parameters<PlayerInputQuery['losCached']>)=>{check();return Reflect.apply(fn,receiver,args);};}};
   const poll=source.poll;try{const result=Reflect.apply(poll,source,[capture.body,Object.freeze(query),dt]);this.#final(capture);return result;}finally{active=false;}
  }finally{this.#busy=false;}
 }
 /** Transport draining happens at the client boundary, including not-ready
  * frames. The already-drained map is never queued or replayed by this handle. */
 dispatch(frame:NativeClientFrame):NativeClientFrameResult {
  this.#idle();this.#busy=true;
  try{
   const dt=own<number>(frame,'dt'),wallSeconds=own<number>(frame,'wallSeconds'),inputs=own<Map<string,PlayerInput>>(frame,'inputs');
   const option=<T>(key:string):T|undefined=>Object.hasOwn(frame,key)?own<T>(frame,key):undefined;
   const actions=option<readonly NativeClientMetaAction[]>('actions'),gearVacuum=option<boolean>('gearVacuum');
   time(dt);time(wallSeconds);if(wallSeconds<dt)throw Error('Native client wall budget is shorter than its clamped frame');if(!this.#isReady())return {ready:false,aiAreas:[],droppedActions:[]};
   let area=this.#coordinator.published;area.combat.inputFrame.passInputTime(wallSeconds-dt);this.#live();area.combat.inputFrame.applyInputs(inputs,dt);this.#live();
   const droppedActions:{seatId:string;error:unknown}[]=[];
   for(const row of actions??[]){this.#live();const seat=roster(this.writer).find(s=>s.id===row.seatId);if(!seat)continue;noteActionEcho(this.#session.campaign,seat,row.seq);try{const selected=this.#seat(seat);selected.area.combat.campaignFrame.applyAction(seat,row.action);}catch(error){droppedActions.push({seatId:row.seatId,error});}}
   this.#live();const residents=this.#coordinator.residentAreas(),aiAreas:string[]=[];
   if(!this.writer.gameOver)for(const resident of residents){this.#live();this.#coordinator.runFrom(resident,()=>resident.combat.updateAI(dt));aiAreas.push(resident.assembly.input.scene.zone.id);}
   this.#live();if(gearVacuum!==undefined)this.writer.gearVacuum=gearVacuum;
   this.#live();area=this.#coordinator.published;area.combat.campaignFrame.tick(dt);this.#live();
   return {ready:true,aiAreas:Object.freeze(aiAreas),droppedActions:Object.freeze(droppedActions)};
  }finally{this.#busy=false;}
 }
}
export function installNativeClientRuntime(input:NativeClientInstallation,signal?:AbortSignal):NativeClientRuntime {const runtime=new NativeClientRuntime(input);runtime.install(signal);return runtime;}
