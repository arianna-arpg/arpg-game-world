import {VOYAGE_ZONE_ID} from '../world/voyage';
import {sceneAbandonVoyageAtSurface} from '../engine/nativeSceneVoyageArrival';
import {sceneNecropolisSurfaceArrival} from '../engine/nativeSceneRealmArrival';
import {installNativeHostedCoordinator} from './nativeHostedSerialization';
import {extendNativeAreaUIActions} from './nativeAreaUIActions';
import {extendNativeAreaMenuQueries} from './nativeAreaMenuQueries';
import {extendNativeAreaMenuPublication} from './nativeAreaMenuPublication';
import {extendNativeAreaViewQueries} from './nativeAreaViewQueries';
import {extendNativeAreaPublication} from './nativeAreaScenePublication';
import {NativeAreaSceneEcology} from './nativeAreaSceneEcology';
import {LitePool} from '../engine/lite';
import {sceneCaptureLiteCarry,type NativeLiteCarryRow} from '../engine/nativeSceneEcology';
import {assertNativeCharacterResume,type NativeCharacterResumeReceipt,type NativeAreaCharacterResume} from './nativeAreaCharacterResume';
import {sceneCaptureZoneMemory} from '../engine/nativeSceneDepartureMemory';
/** Retained-area selection and synchronous physical handoff. Unlike legacy
 * World.loadZone, revisits retain the area's actual stores and controllers.
 * Destination creation and complete frame/UI publication are separate duties. */
import {World,isNativeWorld,type Seat} from '../engine/world';
import {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';
import {saveCharacter as saveNativeCharacter} from '../meta/character';
import {nativeSimView,type NativePopulationHost} from '../engine/nativePopulationResolution';
import type {Actor} from '../engine/actor';
import type {TraversalState} from '../engine/traversal';
import type {RoadTicket,ShardWorldLink,LandingSpot} from '../engine/shardUnits';
import type {NativeAreaRoadDestination} from './nativeAreaRoadDestination';
import {assertNativeCombatOwnerEntry,assertNativeCombatOperationsIdle,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
import {retireNativeRetainedWriter} from './nativeAreaRetainedLifetime';
import {angleTo,vec,rand,type Vec2} from '../core/math';
import {NativeAreaScenePreparation,isNativeAreaScenePreparation} from './nativeAreaScenePreparation';
import {nativeBirthAsyncResult,NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import {NativeAreaSceneCombatCampaign} from './nativeAreaSceneCombatCampaign';
import {harborLandPartyAt,type NativeSceneHarborHost} from '../engine/nativeSceneHarbor';
import {NativeAreaSceneOngoing,type NativeAreaOngoingCampaign} from './nativeAreaSceneOngoing';
import {NativeAreaSceneCombat,isNativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {NativeAreaActorAuthority,type NativeAreaAuthorityBinding} from './nativeAreaActorAuthority';
import {NativeAreaSceneMemory} from './nativeAreaSceneMemory';
import {NativeAreaSceneDepartureMemory} from './nativeAreaSceneDepartureMemory';
import {NativeAreaMemoryRegistry} from './nativeAreaMemoryRegistry';
import {NativeAreaRoadContext,installNativeRoadLink} from './nativeAreaRoadContext';
import {NativeAreaSceneDirectory} from './nativeAreaSceneDirectory';
import type {NativeAreaDirectoryView} from './nativeAreaDirectoryView';
export interface NativeAreaTransitionInput {campaign:NativeAreaOngoingCampaign;characterWriter:World;authority:NativeAreaActorAuthority<object>;memoryRegistry:NativeAreaMemoryRegistry}
export interface NativeRoadDrainResult {readonly seatId:string;readonly dest:string;readonly outcome:'moved'|'same-area'|'duplicate'|'failed';readonly error?:unknown}
interface RoadReceipt {readonly ticket:RoadTicket<NativeAreaRoadDestination>;readonly source:Registered;readonly capture:SeatCapture;readonly seat:Seat;readonly id:string;readonly dest:string;readonly instance:string|undefined;readonly origin:NativeAreaTransitionFrame|null;used:boolean}
interface ActiveRoad {readonly receipt:RoadReceipt;readonly frame:Frame;body:Actor;destination:Registered|null;readonly woke:boolean}
export interface NativeRoadQueueBridge {enableHosted():void;enqueue(ticket:RoadTicket<NativeAreaRoadDestination>):void;drain():readonly NativeRoadDrainResult[]}
const roadQueueIssuers=new WeakMap<NativeAreaSceneTransitionCoordinator,(owner:object,combat:NativeAreaSceneCombat)=>NativeRoadQueueBridge>();
const roadQueueBridges=new WeakMap<NativeAreaSceneCombat,NativeRoadQueueBridge>();
export function issueNativeRoadQueueBridge(coordinator:NativeAreaSceneTransitionCoordinator,owner:object,combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry):NativeRoadQueueBridge{
 if(!isNativeAreaSceneTransitionCoordinator(coordinator)||!isNativeAreaSceneCombat(combat)||!owner||typeof owner!=='object')throw Error('Native road queue needs actual owners');assertNativeCombatOwnerEntry(combat,entry);
 for(const key of ['campaign','characterWriter','authority'] as const)if(combat.input[key]!==coordinator.input[key])throw Error('Native road queue roots differ: '+key);
 if(roadQueueBridges.has(combat))throw Error('Native road queue bridge already issued');const bridge=roadQueueIssuers.get(coordinator)!(owner,combat);roadQueueBridges.set(combat,bridge);return bridge;
}
export type NativeRealmContextKey='realmContext'|'crusadeRealmContext'|'necropolisRealmContext'|'fractureRealmContext';
export interface NativeRealmEntryBridge {enter<T>(key:NativeRealmContextKey,destination:string,action:()=>T):T;wake(action:()=>void):void}
const realmEntryIssuers=new WeakMap<NativeAreaSceneTransitionCoordinator,(owner:object,combat:NativeAreaSceneCombat)=>NativeRealmEntryBridge>();
const realmEntryBridges=new WeakMap<NativeAreaSceneCombat,NativeRealmEntryBridge>();
/** This bridge is retained only by the genuine CampaignFrame with its private
 * operation entry. A plan's original context write and stamp still run first. */
export function issueNativeRealmEntryBridge(coordinator:NativeAreaSceneTransitionCoordinator,owner:object,combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry):NativeRealmEntryBridge{
 if(!isNativeAreaSceneTransitionCoordinator(coordinator)||!isNativeAreaSceneCombat(combat)||!owner||typeof owner!=='object')throw Error('Native realm entry needs actual owners');assertNativeCombatOwnerEntry(combat,entry);
 for(const key of ['campaign','characterWriter','authority'] as const)if(combat.input[key]!==coordinator.input[key])throw Error('Native realm entry roots differ');
 if(realmEntryBridges.has(combat))throw Error('Native realm entry bridge already issued');const bridge=realmEntryIssuers.get(coordinator)!(owner,combat);realmEntryBridges.set(combat,bridge);return bridge;
}
interface RealmEntry {readonly frame:Frame;readonly source:Registered;readonly key:NativeRealmContextKey;readonly value:NonNullable<World[NativeRealmContextKey]>;readonly destination:string;prepared:NativeAreaSceneCombat|null;definition:World['zone']|null;previous:unknown;revisit:boolean;completed:boolean;wakeCalled:boolean;consumed:boolean}
interface Registered {readonly ongoing:NativeAreaSceneOngoing;readonly combat:NativeAreaSceneCombat;readonly memory:NativeAreaSceneMemory;readonly departure:NativeAreaSceneDepartureMemory;readonly roads:NativeAreaRoadContext;readonly binding:NativeAreaAuthorityBinding<object>;readonly id:string}
export interface NativeAreaTransitionFrame {readonly source:NativeAreaSceneOngoing;readonly current:NativeAreaSceneOngoing;readonly seats:readonly Seat[];readonly active:boolean}
interface Frame {source:Registered;current:Registered;seats:readonly Seat[];active:boolean;view:NativeAreaTransitionFrame}
const arrayPush=Array.prototype.push,arraySplice=Array.prototype.splice,arrayIncludes=Array.prototype.includes,arrayIndexOf=Array.prototype.indexOf;
const authorityTransfer=NativeAreaActorAuthority.prototype.transfer,authorityFinalPhysical=NativeAreaActorAuthority.prototype.assertFinalPhysical,authorityFinalClaimed=NativeAreaActorAuthority.prototype.assertFinalClaimed;
const partySelectActors=NativeAreaActorAuthority.prototype.selectActors,partyFinalSelections=NativeAreaActorAuthority.prototype.assertFinalSelections;
const coordinatedWriters=new WeakMap<World,NativeAreaSceneTransitionCoordinator>();
const actualCoordinators=new WeakSet<object>();
export interface NativeTransitionOwnerBridge {selectDescentRecovery(run:NonNullable<World['descentRun']>):{combat:NativeAreaSceneCombat;player:Actor};partySeats():readonly Seat[];loadPartyZone(zoneId:string,from?:string):void;bindTraversal(record:TraversalState):void;finishTraversal(record:TraversalState):void;runTraversalStep(action:()=>void):void}
const bridgeIssuers=new WeakMap<NativeAreaSceneTransitionCoordinator,(owner:object,combat:NativeAreaSceneCombat)=>NativeTransitionOwnerBridge>();
const combatBridges=new WeakMap<NativeAreaSceneCombat,NativeTransitionOwnerBridge>();
/** The privately issued operation entry, not structural shape, authorizes this
 * one bridge. Only the actual transition owner retains its resulting object. */
export function issueNativeTransitionOwnerBridge(coordinator:NativeAreaSceneTransitionCoordinator,owner:object,combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry):NativeTransitionOwnerBridge {
 if(!isNativeAreaSceneTransitionCoordinator(coordinator)||!isNativeAreaSceneCombat(combat)||!owner||typeof owner!=='object')throw Error('Native transition bridge needs actual runtime owners');assertNativeCombatOwnerEntry(combat,entry);
 for(const key of ['campaign','characterWriter','authority'] as const)if(combat.input[key]!==coordinator.input[key])throw Error('Native transition bridge roots differ: '+key);
 if(combatBridges.has(combat))throw Error('Native combat already issued its transition bridge');const bridge=bridgeIssuers.get(coordinator)!(owner,combat);combatBridges.set(combat,bridge);return bridge;
}
export function hasNativeAreaSceneTransitionCoordinator(writer:World):boolean{return coordinatedWriters.has(writer);}
export function isNativeAreaSceneTransitionCoordinator(value:unknown):value is NativeAreaSceneTransitionCoordinator{return !!value&&typeof value==='object'&&actualCoordinators.has(value);}
function own<T>(value:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native transition requires an ordinary own-data field: '+String(key));return d.value as T;}
function optionalOwn<T>(value:object,key:PropertyKey):T|undefined {const d=Object.getOwnPropertyDescriptor(value,key);if(!d)return undefined;if(!Object.hasOwn(d,'value'))throw Error('Native transition refuses an accessor field: '+String(key));return d.value as T;}
function writable(value:object,key:PropertyKey):void {const d=Object.getOwnPropertyDescriptor(value,key);if(d?(!Object.hasOwn(d,'value')||!d.writable):!Object.isExtensible(value))throw Error('Native transition needs writable ordinary field: '+String(key));}
function mutableCensus(value:unknown):asserts value is Actor[]{if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||Object.hasOwn(value,'includes')||Object.getOwnPropertyDescriptor(Array.prototype,'includes')?.value!==arrayIncludes)throw Error('Native transition needs an ordinary raw census');const length=Object.getOwnPropertyDescriptor(value,'length');if(!length?.writable||!Object.isExtensible(value))throw Error('Native transition needs a mutable raw census');for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,i);if(!d||!Object.hasOwn(d,'value')||!d.writable||!d.configurable)throw Error('Native transition needs mutable census elements');}}
interface SeatCapture {readonly campaign:NativeAreaOngoingCampaign;readonly seats:readonly Seat[];readonly rows:readonly {seat:Seat;id:string;body:Actor}[]}
interface TraversalContinuation {readonly origin:NativeAreaTransitionFrame;readonly record:TraversalState;readonly source:Registered;current:Registered;seats:readonly Seat[];readonly swap:(()=>void)|undefined;readonly done:(()=>void)|undefined;swapWrapper:(()=>void)|undefined;doneWrapper:(()=>void)|undefined;swapUsed:boolean;doneUsed:boolean;expired:boolean}
function rawValues<T>(value:unknown):T[]{if(!Array.isArray(value))throw Error('Native transition needs a raw array');const n=own<number>(value,'length'),out:T[]=[];for(let i=0;i<n;i++)out.push(own<T>(value,i));return out;}
function captureSeats(campaign:NativeAreaOngoingCampaign,seats?:readonly Seat[]):SeatCapture {const original=campaign.seats,all=rawValues<Seat>(original),ids=new Set<string>(),selected=seats??all,rows:{seat:Seat;id:string;body:Actor}[]=[];for(const seat of all){const id=own<string>(seat,'id');if(typeof id!=='string'||ids.has(id))throw Error('Native transition needs unique actual seat IDs');ids.add(id);}for(const seat of selected){if(!all.includes(seat))throw Error('Native transition cohort seat left campaign');rows.push({seat,id:own<string>(seat,'id'),body:own<Actor>(seat,'actor')});}return {campaign,seats:original,rows};}
function finalSeats(capture:SeatCapture):void {if(capture.campaign.seats!==capture.seats)throw Error('Native transition campaign seats replaced during admission');const members=rawValues<Seat>(capture.seats);for(const row of capture.rows)if(!members.includes(row.seat)||own(row.seat,'id')!==row.id||own(row.seat,'actor')!==row.body)throw Error('Native transition seat changed during admission');}
/** One coordinator is retained beside the one real character writer. */
declare const packedTravelReceipt:unique symbol;
export interface NativePackedTravelReceipt {readonly [packedTravelReceipt]:true}
interface PackedTravel {active:boolean;consumed:boolean;source:NativeAreaSceneEcology;destination:NativeAreaSceneEcology;actors:readonly Actor[];ids:readonly number[];authority:NativeAreaTransitionInput['authority'];binding:Registered['binding']}
const packedTravel=new WeakMap<object,PackedTravel>();
const freePacked=LitePool.prototype.free;
export function assertNativePackedTravel(token:NativePackedTravelReceipt,destination:NativeAreaSceneEcology):void{const r=packedTravel.get(token);if(!r?.active||r.consumed||r.destination!==destination)throw Error('Native packed arrival is foreign or expired');}
export function consumeNativePackedTravel(token:NativePackedTravelReceipt,destination:NativeAreaSceneEcology):NativeLiteCarryRow[]{const r=packedTravel.get(token);if(!r?.active||r.consumed||r.destination!==destination)throw Error('Native packed arrival is foreign or expired');Reflect.apply(authorityFinalClaimed,r.authority,[r.binding,r.actors]);for(let i=0;i<r.actors.length;i++)if(own(r.actors[i],'id')!==r.ids[i])throw Error('Native packed keeper identity changed');const state=r.source.input.state,pool=own<LitePool>(state,'lite'),kinds=own<World['liteKinds']>(state,'liteKinds');if(pool===own(destination.input.state,'lite')||kinds===own(destination.input.state,'liteKinds'))throw Error('Native packed areas cannot share source stores');if(!(pool instanceof LitePool)||!Array.isArray(kinds)||Object.getPrototypeOf(kinds)!==Array.prototype)throw Error('Native packed source stores differ');const selected=new Set(r.ids),rows=sceneCaptureLiteCarry(r.source.host,pool).filter(row=>selected.has(row.owner));Reflect.apply(authorityFinalClaimed,r.authority,[r.binding,r.actors]);if(own(state,'lite')!==pool||own(state,'liteKinds')!==kinds)throw Error('Native packed source changed during capture');for(let i=0;i<r.actors.length;i++)if(own(r.actors[i],'id')!==r.ids[i])throw Error('Native packed keeper changed during capture');r.consumed=true;for(let i=0;i<pool.used;i++)if(pool.alive[i]&&selected.has(pool.owner[i]))Reflect.apply(freePacked,pool,[i]);return rows;}
export class NativeAreaSceneTransitionCoordinator {
 readonly input:Readonly<NativeAreaTransitionInput>;
 readonly #lifecycle={packed:NativeAreaSceneEcology.prototype.withPackedArrival,release:NativeAreaActorAuthority.prototype.release,unregister:NativeAreaActorAuthority.prototype.unregister,discardRestore:NativeAreaMemoryRegistry.prototype.discardProvisionalRestore,setRestore:NativeAreaScenePreparation.prototype.setProvisionalRestore,finishRestore:NativeAreaScenePreparation.prototype.finishProvisionalRestore,preparation:NativeAreaScenePreparation.prototype.retire,authority:NativeAreaActorAuthority.prototype.retire,memory:NativeAreaMemoryRegistry.prototype.retire,memoryIdle:NativeAreaMemoryRegistry.prototype.assertRetirable,memoryUnregister:NativeAreaMemoryRegistry.prototype.unregister,releaseVoyage:NativeAreaScenePreparation.prototype.releaseVoyage,population:NativeAreaScenePopulation.prototype.retire,deeds:NativeAreaSceneCombatCampaign.prototype.retireCallbacks};
 #voyageArea:Registered|null=null;#voyageCompleted:Registered|null=null;#retiringVoyage:Registered|null=null;readonly #retiredVoyages=new WeakSet<NativeAreaSceneCombat>();
 #voyageCrossing:{source:Registered;destinationId:string;run:World['voyage'];stash:World['wraithsailSeaStash'];surface:boolean;surfaceHandled:boolean}|null=null;#voyageArrival:NativeAreaSceneCombat|null=null;
 readonly #areas=new Map<string,Registered>();readonly #combats=new WeakMap<NativeAreaSceneCombat,Registered>();
 readonly #projection=new Map<string,PropertyDescriptor>();
 readonly #previousProjection=new Map<string,PropertyDescriptor|undefined>();
 #retired=false;#retirement:readonly string[]=Object.freeze([]);
 readonly #directories=new WeakMap<NativeAreaSceneCombat,NativeAreaSceneDirectory>();
 #restore:{owner:NativeAreaCharacterResume;source:Registered;arriving:boolean;token?:NativeCharacterResumeReceipt}|null=null;
 #realmEntry:RealmEntry|null=null;
 readonly #realmContexts=new WeakMap<NativeAreaSceneCombat,{key:NativeRealmContextKey;definition:World['zone'];value:unknown}>();
 #published:Registered|null=null;#frame:Frame|null=null;#moving=false;#partyMoving=false;#preparation:NativeAreaScenePreparation|null=null;
 readonly #traversals=new WeakMap<TraversalState,TraversalContinuation>();
 #executingTraversalCallback:TraversalContinuation|null=null;
 #traversalStep:{continuation:TraversalContinuation;finished:boolean}|null=null;
 #traversalValue:TraversalState|null=null;
 readonly #roadQueue:RoadReceipt[]=[];readonly #deferredRoadDispatch:{source:Registered;zoneId:string;fn:(view:NativeAreaDirectoryView)=>unknown}[]=[];
 readonly #roadLinks=new WeakMap<NativeAreaSceneCombat,ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>>();readonly #roadInstances=new Map<string,string|undefined>();
 #hostedRoads=false;#roadKeeper:Registered|null=null;#roadDraining=false;#activeRoad:ActiveRoad|null=null;#roadCallback:ActiveRoad|null=null;
 constructor(raw:NativeAreaTransitionInput){
  const campaign=own<NativeAreaOngoingCampaign>(raw,'campaign'),characterWriter=own<World>(raw,'characterWriter'),authority=own<NativeAreaActorAuthority<object>>(raw,'authority'),memoryRegistry=own<NativeAreaMemoryRegistry>(raw,'memoryRegistry');
  if(!isNativeWorld(characterWriter)||!(authority instanceof NativeAreaActorAuthority)||!(memoryRegistry instanceof NativeAreaMemoryRegistry)||memoryRegistry.writer!==characterWriter||authority.campaign!==campaign)throw Error('Native transition needs the actual writer, memory registry and campaign authority');
  assertNativeRetainedMassState(characterWriter);
  if(characterWriter.account!==campaign.account||characterWriter.localSeat!==campaign.localSeat||characterWriter.sim!==campaign.sim||characterWriter.zoneMap!==campaign.zoneMap||characterWriter.caveMap!==campaign.caveMap)throw Error('Native transition campaign differs from its character writer');
  if(coordinatedWriters.has(characterWriter))throw Error('Native campaign already has a transition coordinator');
  this.input=Object.freeze({campaign,characterWriter,authority,memoryRegistry});Object.defineProperty(this,'input',{writable:false,configurable:false});coordinatedWriters.set(characterWriter,this);actualCoordinators.add(this);
  realmEntryIssuers.set(this,(owner,combat)=>Object.freeze({enter:<T>(key:NativeRealmContextKey,destination:string,action:()=>T):T=>{if(own(combat,"campaignFrame")!==owner)throw Error("Native realm entry owner changed");const source=this.#combat(combat),frame=this.#frame;if(!frame?.active||frame.current!==source||this.#realmEntry)throw Error("Native realm entry needs its exact current frame");const value=own<World[NativeRealmContextKey]>(source.combat.campaignOwner.state,key);if(!value)throw Error("Native realm entry lost its original context");const receipt:RealmEntry={frame,source,key,value,destination,prepared:null,definition:null,previous:null,revisit:false,completed:false,wakeCalled:false,consumed:false};this.#realmEntry=receipt;try{return action();}finally{this.#realmEntry=null;}},wake:(action:()=>void):void=>{if(own(combat,"campaignFrame")!==owner)throw Error("Native realm wake owner changed");const r=this.#realmEntry;if(!r){action();return;}if(this.#frame!==r.frame||r.frame.current.combat!==combat||!r.consumed||r.wakeCalled||own(combat.campaignOwner.state,r.key)!==(r.completed?null:r.value))throw Error("Native realm wake differs from its exact arrival");r.wakeCalled=true;if(!r.revisit)action();}}));
  roadQueueIssuers.set(this,(owner,combat)=>{const current=()=>{if(own(combat,'campaignFrame')!==owner)throw Error('Native road queue owner changed');return this.#combat(combat);};return Object.freeze({enableHosted:()=>{current();this.#enableHostedRoads();},enqueue:(ticket:RoadTicket<NativeAreaRoadDestination>)=>this.#enqueueRoad(current(),ticket),drain:()=>{current();return this.#drainRoads();}});});
  bridgeIssuers.set(this,(owner,combat)=>{const current=()=>{if(own(combat,'campaignTransitions')!==owner||this.#combats.get(combat)?.combat!==combat)throw Error('Native transition bridge owner was replaced or unregistered');};return Object.freeze({selectDescentRecovery:(run:NonNullable<World['descentRun']>)=>{current();return this.#selectDescentRecovery(run);},partySeats:()=>{current();return this.#partySeats();},loadPartyZone:(zoneId:string,from?:string)=>{current();this.#loadPartyZone(zoneId,from);},bindTraversal:(record:TraversalState)=>{current();this.#bindTraversal(record);},finishTraversal:(record:TraversalState)=>{current();this.#finishTraversal(record);},runTraversalStep:(action:()=>void):void=>{current();this.#runTraversalStep(action);}});});
 }
 attachPreparation(preparation:NativeAreaScenePreparation):(area:NativeAreaSceneOngoing)=>void {
  if(!isNativeAreaScenePreparation(preparation)||preparation.input.coordinator!==this||preparation.input.session.campaign!==this.input.campaign||preparation.input.authority!==this.input.authority||this.#preparation)throw Error('Native transition needs its one actual campaign preparer');this.#preparation=preparation;
  // The constructor receives this private callback once. It stages context on
  // the authentic unresolved destination before layout, without moving authority.
  return area=>{const r=this.#realmEntry;if(!r)return;if(this.#preparation!==preparation||!this.#moving||this.#frame!==r.frame||r.frame.current!==r.source||r.prepared||area.assembly.input.scene.zone!==r.definition||area.assembly.input.scene.zone.id!==r.destination||area.assembly.phase!=='fresh'||!isNativeAreaSceneCombat(area.combat)||area.combat.input.coordinator!==this)throw Error('Native realm preparation differs from its exact entry');if(own(r.source.combat.campaignOwner.state,r.key)!==r.value)throw Error('Native realm context changed before preparation');const state=area.combat.campaignOwner.state;writable(state,r.key);if(own(state,r.key)!==null)throw Error('Native prepared realm already owns context');Reflect.set(state,r.key,r.value);r.prepared=area.combat;};
 }
 /** Scheduler preflight is callback-free and runs before any clock write. */
 assertIdleFrame():void{this.#finishVoyage();if(this.#retired)throw Error('Native coordinator is retired');assertNativeRetainedMassState(this.input.characterWriter);if(this.#frame||this.#moving||this.#traversalStep||this.#roadDraining)throw Error('Native campaign frame is busy');}
 get current():NativeAreaSceneOngoing{const r=this.#frame?.current??this.#published;if(!r)throw Error('Native transition has no selected actual area');return r.ongoing;}
 get published():NativeAreaSceneOngoing{if(!this.#published)throw Error('Native transition has no published actual area');return this.#published.ongoing;}
 /** Terminal retirement: no save/capture and no native gameplay rollback. */
 retire():readonly string[] {
  if(this.#retired)return this.#retirement;
  if(this.#frame||this.#moving||this.#traversalStep||this.#roadDraining)throw Error('Native campaign frame is busy');assertNativeCombatOperationsIdle();Reflect.apply(this.#lifecycle.memoryIdle,this.input.memoryRegistry,[]);
  const writer=this.input.characterWriter;
  // Retire even if publication was corrupted. Restore only our still-installed
  // configurable views; report newer/locked slots without overwriting them.
  const restore=new Map<string,PropertyDescriptor|undefined>(),unrestored:string[]=[];
  for(const [key,expected]of this.#projection){const current=Object.getOwnPropertyDescriptor(writer,key);if(current?.configurable&&current.get===expected.get&&current.set===expected.set)restore.set(key,this.#previousProjection.get(key));else unrestored.push(key);}
  const areas=this.#preparation?Reflect.apply(this.#lifecycle.preparation,this.#preparation,[]):Object.freeze([...this.#areas.values()].map(row=>row.ongoing));
  // No callback executes after this terminal revocation begins.
  this.#retired=true;retireNativeRetainedWriter(writer);Reflect.apply(this.#lifecycle.authority,this.input.authority,[]);Reflect.apply(this.#lifecycle.memory,this.input.memoryRegistry,[]);
  const traversal=this.#traversalValue;if(traversal){const continuation=this.#traversals.get(traversal);if(continuation)continuation.expired=true;}this.#traversalValue=null;
  this.#roadQueue.length=0;this.#deferredRoadDispatch.length=0;this.#roadInstances.clear();this.#hostedRoads=false;this.#roadKeeper=null;
  for(const area of areas){Reflect.apply(this.#lifecycle.population,area.assembly.input.population,[]);Reflect.apply(this.#lifecycle.deeds,area.combat.campaignOwner,[]);}
  for(const [key,previous]of restore){if(previous)Object.defineProperty(writer,key,previous);else Reflect.deleteProperty(writer,key);}
  this.#projection.clear();this.#previousProjection.clear();this.#areas.clear();this.#published=null;this.#preparation=null;this.#retirement=Object.freeze(unrestored);return this.#retirement;
 }
 /** Only exact completed sea owners may be skipped by a previously captured barrier. */
 isRetiredVoyage(combat:NativeAreaSceneCombat):boolean{return this.#retiredVoyages.has(combat);}
 assertVoyageRetirement(area:NativeAreaSceneOngoing):void {if(this.#retiringVoyage?.ongoing!==area||this.#frame||this.#moving)throw Error('Native voyage retirement needs its exact completed episode');}
 assertVoyageArrival(combat:NativeAreaSceneCombat):void {if(!this.#moving||!this.#frame?.active||this.#voyageArrival!==combat||this.#frame.current.combat!==combat)throw Error('Native voyage arrival needs its exact selected destination');}
 /** Surface consequences precede preparation as one retained phase: native
  * stash abandonment first, then Necropolis cull. Later layout only validates. */
 #abandonVoyageSurface():void {
  const crossing=this.#voyageCrossing;if(!crossing?.surface)return;
  if(!this.#moving||!this.#frame?.active||this.#frame.current!==crossing.source||crossing.surfaceHandled)throw Error('Native voyage surface crossing changed');
  if(own(crossing.source.ongoing.assembly.transition,'voyage')!==crossing.run||own(crossing.source.ongoing.assembly.input.state,'wraithsailSeaStash')!==crossing.stash)throw Error('Native voyage changed before surface abandonment');
  crossing.surfaceHandled=true;sceneAbandonVoyageAtSurface(crossing.source.ongoing.assembly.host);
  crossing.stash=own(crossing.source.ongoing.assembly.input.state,'wraithsailSeaStash');
 }
 prepareVoyageSurface(area:NativeAreaSceneOngoing):void {
  Reflect.apply(NativeAreaScenePreparation.prototype.assertVoyagePreparation,this.#preparation!,[area]);const crossing=this.#voyageCrossing;if(!crossing?.surface)return;
  if(!this.#moving||!this.#frame?.active||this.#frame.current!==crossing.source||!crossing.surfaceHandled||area.assembly.input.scene.zone.id!==crossing.destinationId||area.assembly.input.campaign!==this.input.campaign)throw Error('Native voyage surface preparation changed');
  if(own(crossing.source.ongoing.assembly.transition,'voyage')!==crossing.run||own(crossing.source.ongoing.assembly.input.state,'wraithsailSeaStash')!==crossing.stash)throw Error('Native voyage changed after surface abandonment');
 }
 #finishVoyage():void {const row=this.#voyageCompleted;if(!row||this.#frame||this.#moving)return;if(this.#retiringVoyage)throw Error('Native voyage retirement cannot reenter');this.#retiringVoyage=row;try{assertNativeCombatOperationsIdle();this.#ready(row);if(this.#published===row||this.#voyageArea!==row)throw Error('Native voyage is still published or replaced');const captured=captureSeats(this.input.campaign),census=own<Actor[]>(row.binding.scene,'actors'),actors=rawValues<Actor>(census);if(captured.rows.some(r=>actors.includes(r.body)))throw Error('Native voyage retirement refuses occupied sea');mutableCensus(census);finalSeats(captured);Reflect.apply(authorityFinalPhysical,this.input.authority,[row.binding,actors]);
  // Native boundless sea has no memory row; unregister before revoking the actual binding.
  Reflect.apply(this.#lifecycle.memoryUnregister,this.input.memoryRegistry,[row.memory,()=>{finalSeats(captured);const finalRoster=rawValues<Seat>(captured.seats);if(finalRoster.length!==captured.rows.length||finalRoster.some((seat,i)=>seat!==captured.rows[i].seat))throw Error('Native voyage retirement cohort changed during final capture');Reflect.apply(authorityFinalPhysical,this.input.authority,[row.binding,actors]);if(own(row.binding.scene,'actors')!==census||rawValues<Actor>(census).some((a,i)=>a!==actors[i])||census.length!==actors.length)throw Error('Native voyage census changed during final capture');}]);
  Reflect.apply(this.#lifecycle.releaseVoyage,this.#preparation!,[row.ongoing]);Reflect.apply(this.#lifecycle.release,this.input.authority,[row.binding,actors]);Reflect.apply(this.#lifecycle.unregister,this.input.authority,[row.binding]);Reflect.apply(this.#lifecycle.population,row.ongoing.assembly.input.population,[]);this.#areas.delete(row.id);this.#combats.delete(row.combat);this.#roadInstances.delete(row.id);this.#retiredVoyages.add(row.combat);this.#voyageArea=null;this.#voyageCompleted=null;}finally{this.#retiringVoyage=null;}
 }
 /** All real resident areas, including those continuing without an avatar. */
 residentAreas():readonly NativeAreaSceneOngoing[]{const rows=[...this.#areas.values()];for(const row of rows)this.#ready(row);return Object.freeze(rows.map(row=>row.ongoing));}
 /** Occupied audience and campaign-origin scans use actual controlled bodies. */
 occupiedAreas():readonly NativeAreaSceneOngoing[]{
  const capture=captureSeats(this.input.campaign),rows=[...this.#areas.values()];if(this.#published){const i=rows.indexOf(this.#published);if(i>=0)rows.unshift(...rows.splice(i,1));}
  const result:NativeAreaSceneOngoing[]=[];for(const row of rows){this.#ready(row);const actors=rawValues<Actor>(own(row.binding.scene,'actors'));if(capture.rows.some(s=>actors.includes(s.body)))result.push(row.ongoing);}
  finalSeats(capture);for(const row of rows)this.input.authority.assertFinalPhysical(row.binding);return Object.freeze(result);
 }
 /** State dispatch reaches every retained resident; audience enumeration only
  * exposes areas with actual controlled bodies, including downed/dormant seats. */
 atZone<T>(zoneId:string,fn:(area:NativeAreaDirectoryView)=>T):T|undefined {const row=this.#areas.get(zoneId);if(!row)return undefined;this.#ready(row);const result=fn(this.#directory(row));if(nativeBirthAsyncResult(result))throw Error('Native directory dispatch must be synchronous');return result;}
 presentWorlds():readonly NativeAreaDirectoryView[]{return Object.freeze(this.occupiedAreas().map(area=>this.#directory(this.#combat(area.combat))));}
 #directory(row:Registered):NativeAreaDirectoryView{this.#ready(row);let directory=this.#directories.get(row.combat);if(!directory){directory=new NativeAreaSceneDirectory(this,row.combat);this.#directories.set(row.combat,directory);}return directory.view;}
 occupiedAudience(where:Parameters<World['occupiedAudience']>[0]):ReturnType<World['occupiedAudience']>{
  if(!this.#hostedRoads&&!this.input.characterWriter.shardWorld){const area=this.#published;if(!area||!this.presentationActorFor(area.combat))return null;return where(area.ongoing.assembly.input.scene.zone)?undefined:null;}
  let any=false;const to:string[]=[];for(const area of this.presentWorlds()){if(!where(area.zone))continue;any=true;for(const seat of area.seats)if(!seat.keeper)to.push(seat.id);}return any?to:null;
 }
 noticeOccupied(to:string[]|undefined,text:string,color?:string,size?:number,channel?:string):void {if(to&&!to.length)return;const writer=this.input.characterWriter,fn=writer.notice;Reflect.apply(fn,writer,[text,color,size,channel]);if(to)writer.notices[writer.notices.length-1].to=to;}
 /** Read-only physical audience; never a departed preparation observer. */
 seatsFor(combat:NativeAreaSceneCombat):readonly Seat[]{return this.#presence(this.#combat(combat)).seats;}
 presentationActorFor(combat:NativeAreaSceneCombat):Actor|null{return this.#presence(this.#combat(combat)).actor;}
 #presence(row:Registered):{seats:readonly Seat[];actor:Actor|null}{
  const capture=captureSeats(this.input.campaign),census=rawValues<Actor>(own(row.binding.scene,'actors')),present=capture.rows.filter(s=>census.includes(s.body));
  const representative=own<Actor>(row.binding.scene,'player'),selected=present.find(s=>s.body===representative)??present[0];
  finalSeats(capture);this.input.authority.assertFinalPhysical(row.binding,present.map(s=>s.body));
  return{seats:Object.freeze(present.map(s=>s.seat)),actor:selected?.body??null};
 }
 nativeWorldReady():boolean {if(this.#retired)return false;if(!this.#published||this.#moving)return false;this.#ready(this.#published);this.#assertProjection();return true;}
 simView():ReturnType<World['devOverlayView']>{
  const area=this.current,row=this.#combat(area.combat),population=area.assembly.input.population.population,self=this;
  const host:NativePopulationHost={get zone(){return population.zone;},get actors(){return population.actors;},get player(){return population.player;},get zoneMap(){return population.zoneMap;},get time(){return population.time;},get sim(){return population.sim;},get visited(){return population.visited;},get surveyed(){return population.surveyed;},get continentFor(){const fn=population.continentFor;return(...args:Parameters<NativePopulationHost['continentFor']>)=>Reflect.apply(fn,population,args);},simView:()=>self.simView(),presence:()=>self.occupiedAreas().map(a=>({zone:a.assembly.input.scene.zone,actors:a.assembly.input.scene.actors}))};
  this.#ready(row);return nativeSimView(host);
 }
 /** The existing native writer performs its one registry capture while serializing.
  * No pre-capture, second writer, or scene-local World driver is introduced. */
 saveCharacter():void {
  if(!this.#published||this.#moving)throw Error('Native character save needs a completed published area');this.#assertProjection();this.#ready(this.#published);
  const capture=captureSeats(this.input.campaign,[this.input.campaign.localSeat]),body=capture.rows[0].body,selected=this.input.authority.selectActors([body]);
  if(selected[0].binding!==this.#published.binding)throw Error('Native character save local seat left the published area');finalSeats(capture);this.input.authority.assertFinalSelections(selected);
  saveNativeCharacter(this.input.characterWriter);
 }
 /** Only the selected genuine swap/done callback can resume its originating
  * dynamic host. A traversal step, later frame, or forged view grants nothing. */
 allowsTraversalContinuation(originalFrame:NativeAreaTransitionFrame):boolean {const c=this.#executingTraversalCallback;return !!c&&c.origin===originalFrame&&!c.expired&&this.#traversalStep?.continuation===c&&this.#frame?.active===true;}
 /** The exact originating dynamic host may resume only inside its selected
  * real queued ticket callback, never during a whole drain or unrelated road. */
 allowsRoadContinuation(originalFrame:NativeAreaTransitionFrame):boolean {const road=this.#roadCallback;return !!road&&road===this.#activeRoad&&road.receipt.origin===originalFrame&&road.frame===this.#frame&&road.frame.active;}
 get frame():NativeAreaTransitionFrame{if(!this.#frame?.active)throw Error('Native transition frame is expired');return this.#frame.view;}
 areaFor(combat:NativeAreaSceneCombat):NativeAreaSceneOngoing{return this.#combat(combat).ongoing;}
 roadsFor(combat:NativeAreaSceneCombat):NativeAreaRoadContext{return this.#combat(combat).roads;}
 departureFor(combat:NativeAreaSceneCombat):NativeAreaSceneDepartureMemory{return this.#combat(combat).departure;}
 #combat(combat:NativeAreaSceneCombat):Registered{const r=this.#combats.get(combat);if(!r||r.combat!==combat)throw Error('Unregistered native transition combat owner');this.#ready(r);return r;}
 #ready(r:Registered):void{
  if(this.#retired)throw Error('Native coordinator is retired');
  assertNativeRetainedMassState(this.input.characterWriter);
  const a=r.ongoing.assembly,input=a.input,authority=this.input.authority;
  if(a.phase!=='born'||input.scene.zone.id!==r.id||((this.input.campaign.zoneMap[r.id]??this.input.campaign.caveMap[r.id])!==input.scene.zone&&this.#restore?.source!==r)||r.ongoing.authority!==authority||authority.bindingFor(input.scene)!==r.binding||own(r.binding.services,'combat')!==r.combat)throw Error('Native transition registration changed');
  if(this.#restore?.source!==r)r.memory.assertReady();r.roads.assertReady();authority.assertFinalPhysical(r.binding);assertNativeRetainedMassState(this.input.characterWriter);
 }
 register(ongoing:NativeAreaSceneOngoing,memory:NativeAreaSceneMemory,roads?:NativeAreaRoadContext):void{
  if(this.#moving)throw Error('Native transition registration is busy');
  if(!(ongoing instanceof NativeAreaSceneOngoing)||!isNativeAreaSceneCombat(ongoing.combat)||!(memory instanceof NativeAreaSceneMemory))throw Error('Native transition needs actual runtime owners');
  const id=ongoing.assembly.input.scene.zone.id,prior=this.#areas.get(id);roads??=prior?.roads??new NativeAreaRoadContext(ongoing.assembly,this.input.authority,this.input.campaign);if(!(roads instanceof NativeAreaRoadContext))throw Error('Native transition needs actual area roads');
  const combat=ongoing.combat,assembly=ongoing.assembly,{authority,campaign,characterWriter}=this.input;
  if(combat.input.assembly!==assembly||combat.input.authority!==authority||combat.input.campaign!==campaign||combat.input.characterWriter!==characterWriter||ongoing.authority!==authority||memory.assembly!==assembly||memory.authority!==authority||roads.input.assembly!==assembly||roads.input.authority!==authority||roads.input.campaign!==campaign)throw Error('Native transition owner roots differ');
  
  if(prior){if(prior.ongoing!==ongoing||prior.memory!==memory||prior.roads!==roads)throw Error('Native transition area ID already belongs to another owner');this.#ready(prior);return;}
  const departure=new NativeAreaSceneDepartureMemory(ongoing,memory),row=Object.freeze({ongoing,combat,memory,departure,roads,binding:ongoing.binding,id});this.#ready(row);
  this.input.memoryRegistry.register(memory);this.#ready(row);this.#areas.set(id,row);this.#combats.set(combat,row);this.#roadInstances.set(id,undefined);if(this.#hostedRoads)this.#installRoadLink(row);
 }
 publishInitial(ongoing:NativeAreaSceneOngoing):void{
  if(this.#published||this.#frame||this.#moving)throw Error('Native initial publication already occurred or is busy');
  const row=this.#areas.get(ongoing.assembly.input.scene.zone.id);if(!row||row.ongoing!==ongoing)throw Error('Native initial publication requires registered area');this.#ready(row);
  const local=this.input.campaign.localSeat,capture=captureSeats(this.input.campaign,[local]),body=capture.rows[0].body,selected=this.input.authority.selectActors([body]);
  if(selected[0].binding!==row.binding)throw Error('Native initial publication must contain the real local seat');
  const w=this.input.characterWriter;
  // Adopt the real writer's initial solo ladder before installing live views.
  const caveReturn=w.caveReturn,caveStack=w['caveStack'],caveExitGrace=Reflect.get(w,'caveExitGrace') as boolean,adoptedZonePending=own<boolean>(w,'adoptedZonePending'),forgetMemoryOnLeave=own<boolean>(w,'forgetMemoryOnLeave');
  this.#prepareProjection();finalSeats(capture);this.input.authority.assertFinalSelections(selected);this.input.authority.assertFinalPhysical(row.binding,[body]);
  row.ongoing.assembly.input.scene.player=body;row.roads.caveReturn=caveReturn;row.roads.caveStack=caveStack;row.roads.caveExitGrace=caveExitGrace;row.departure.adoptedZonePending=adoptedZonePending;row.departure.forgetMemoryOnLeave=forgetMemoryOnLeave;
  this.#published=row;for(const [key,d]of this.#projection)Object.defineProperty(w,key,d);
 }
 #prepareProjection():void{
  const bindings=new Map<string,{get:()=>unknown;set?:(v:unknown)=>void}>();
  const field=(key:string,provider:()=>object,slot=key)=>bindings.set(key,{get:()=>Reflect.get(provider(),slot),set:v=>{if(!Reflect.set(provider(),slot,v))throw new TypeError('Native published field is not writable: '+key);}});
  const area=()=>this.published,assembly=()=>area().assembly;
  field('zone',()=>assembly().input.scene);field('actors',()=>assembly().input.scene);
  for(const key of ['arena','arenaHull','walk','zoneEntry','currentZoneSeed','exits','flashes'])field(key,()=>assembly().input.geometry);
  for(const key of ['objectiveDone','objectiveLost','objectiveLatch'])field(key,()=>assembly().input.objectives);
  field('drops',()=>assembly().input.physical.input.state);field('orbs',()=>assembly().lootController.input.state);field('texts',()=>assembly().objectiveController.input.state);
  for(const key of ['projectiles','zones'])field(key,()=>area().progression.input.state);
  field('tethers',()=>this.#published!.combat.tethers.input.state);
  bindings.set('companionBonds',{get:()=>area().progression.companionBonds});
  extendNativeAreaPublication(bindings,area);
  extendNativeAreaViewQueries(bindings,area);
  extendNativeAreaMenuPublication(bindings,area);
  extendNativeAreaMenuQueries(bindings,area);
  extendNativeAreaUIActions(bindings,area);
  for(const key of ['reckonRunEssence','recordDeath'] as const){if(bindings.has(key))throw Error('Duplicate native death publication: '+key);bindings.set(key,{get:()=>{const selected=area(),owner=selected.combat.campaignTransitions,fn=owner[key];return(...args:unknown[])=>{this.#assertProjection();this.#ready(this.#combat(selected.combat));if(this.#published?.ongoing!==selected)throw Error('Native death publication selection expired');return Reflect.apply(fn,owner,args);};}});}
  field('adoptedZonePending',()=>this.#published!.departure);field('forgetMemoryOnLeave',()=>this.#published!.departure);
  field('caveExitGrace',()=>this.#published!.roads);field('entryFrom',()=>this.#published!.roads);field('caveReturn',()=>this.#published!.roads);field('caveStack',()=>this.#published!.roads);
  bindings.set('inCave',{get:()=>assembly().transition.inCave});field('scene',()=>area().quests.input.state);
  // Definition and arena identities are selected, never reassigned through the writer.
  for(const key of ['zone','arena']){const b=bindings.get(key)!;bindings.set(key,{get:b.get,set:v=>{if(v!==b.get())throw Error('Native published identity cannot be reassigned: '+key);}});}
  const writer=this.input.characterWriter,prepared=new Map<string,PropertyDescriptor>();
  this.#traversalValue=own<TraversalState|null>(writer,'traversal');bindings.set('traversal',{get:()=>this.#traversalValue,set:value=>this.#replaceTraversal(value as TraversalState|null)});
  for(const [key,b]of bindings){const d=Object.getOwnPropertyDescriptor(writer,key);if(d?(!d.configurable||!Object.hasOwn(d,'value')):!Object.isExtensible(writer))throw Error('Native publication requires configurable ordinary writer slots: '+key);prepared.set(key,{enumerable:d?.enumerable??false,configurable:true,...b});}
  this.#projection.clear();for(const [key,value]of prepared){this.#previousProjection.set(key,Object.getOwnPropertyDescriptor(writer,key));this.#projection.set(key,value);}
 }
 #assertProjection():void{if(!this.#published)return;for(const [key,expected]of this.#projection){const actual=Object.getOwnPropertyDescriptor(this.input.characterWriter,key);if(!actual||actual.get!==expected.get||actual.set!==expected.set)throw Error('Native writer publication changed: '+key);}}
 runFrom<T>(source:NativeAreaSceneOngoing,action:()=>T):T{
  if(this.#retiringVoyage)throw Error('Native voyage retirement cannot enter gameplay');if(!this.#frame)this.#finishVoyage();
  assertNativeRetainedMassState(this.input.characterWriter);
  const row=this.#areas.get(source.assembly.input.scene.zone.id);if(!row||row.ongoing!==source)throw Error('Native transition source is not registered');this.#ready(row);this.#assertProjection();
  if(this.#frame){if(!this.#frame.active||this.#frame.current!==row||(this.#moving&&this.#roadCallback?.frame!==this.#frame))throw Error('Native transition cannot enter a foreign or moving frame');const result=action();if(nativeBirthAsyncResult(result))throw Error('Native transition must be synchronous');return result;}
  const capture=captureSeats(this.input.campaign),census=rawValues<Actor>(own(row.binding.scene,'actors')),local=capture.rows.filter(r=>census.includes(r.body)),seats=Object.freeze(local.map(r=>r.seat));
  finalSeats(capture);this.input.authority.assertFinalPhysical(row.binding,local.map(r=>r.body));
  const state={source:row,current:row,seats,active:true} as Frame;state.view=Object.freeze({get source(){return state.source.ongoing;},get current(){if(!state.active)throw Error('Native transition frame is expired');return state.current.ongoing;},get seats(){if(!state.active)throw Error('Native transition frame is expired');return state.seats;},get active(){return state.active;}});this.#frame=state;
  let result:T;try{result=action();if(nativeBirthAsyncResult(result))throw Error('Native transition must be synchronous');}finally{state.active=false;this.#frame=null;}this.#finishVoyage();return result;
 }
 #bountyArrival:{combat:NativeAreaSceneCombat;from:string|undefined}|null=null;
 bountyArrivalFrom(combat:NativeAreaSceneCombat):string|undefined {if(!this.#moving||!this.#frame?.active||this.#frame.current.combat!==combat||this.#bountyArrival?.combat!==combat)throw Error('Native bounty arrival needs its selected genuine revisit');return this.#bountyArrival.from;}
 #furnishArrival:NativeAreaSceneCombat|null=null;
 #townArrival:NativeAreaSceneCombat|null=null;
 assertFurnishArrival(combat:NativeAreaSceneCombat):void {if(!this.#moving||!this.#frame?.active||this.#furnishArrival!==combat)throw Error('Native furnishing needs its selected arrival');}
 assertTownArrival(combat:NativeAreaSceneCombat):void {if(!this.#moving||!this.#frame?.active||this.#townArrival!==combat)throw Error('Native town refresh needs its selected genuine arrival');}
 /** Campaign death policy sees every genuine admitted hand. The returned roster
  * is a finite identity snapshot; native alive/merc/account rules still decide. */
 /** The shared dive identifies its actual source even when the final down was elsewhere.
  * Its one player cleanup still belongs to the genuine campaign-local controlled body. */
 #selectDescentRecovery(run:NonNullable<World['descentRun']>):{combat:NativeAreaSceneCombat;player:Actor}{
  const frame=this.#frame,writer=this.input.characterWriter;if(!frame?.active||this.#moving||this.#partyMoving||this.#activeRoad||own(writer,'descentRun')!==run)throw Error('Native descent recovery needs its actual active campaign run');
  const caveId=own<string>(run,'caveId'),source=this.#areas.get(caveId);if(!source)throw Error('Native descent recovery needs its registered abyss');this.#ready(source);
  const capture=captureSeats(this.input.campaign),local=own<Seat>(writer,'localSeat'),selections=Reflect.apply(partySelectActors,this.input.authority,[capture.rows.map(r=>r.body)]);
  for(const selected of selections){const area=[...this.#areas.values()].find(row=>row.binding===selected.binding);if(!area)throw Error('Native descent party has no registered physical owner');this.#ready(area);}
  const hero=capture.rows.find(row=>row.seat===local)?.body;if(!hero)throw Error('Native descent lost the actual local hand');finalSeats(capture);Reflect.apply(partyFinalSelections,this.input.authority,[selections]);
  if(own(writer,'descentRun')!==run||own(run,'caveId')!==caveId||own(writer,'localSeat')!==local)throw Error('Native descent run changed during selection');
  frame.current=source;frame.seats=Object.freeze(capture.rows.filter((_,i)=>selections[i].binding===source.binding).map(row=>row.seat));return{combat:source.combat,player:hero};
 }
 #partySeats():readonly Seat[]{
  const frame=this.#frame;if(!frame?.active||this.#moving)throw Error('Native party policy needs its active transition');
  const capture=captureSeats(this.input.campaign);if(new Set(capture.rows.map(r=>r.body)).size!==capture.rows.length)throw Error('Native party has duplicate controlled bodies');const selected=Reflect.apply(partySelectActors,this.input.authority,[capture.rows.map(r=>r.body)]);
  for(const row of selected){const registered=[...this.#areas.values()].find(area=>area.binding===row.binding);if(!registered||registered.binding!==row.binding)throw Error('Native party seat lacks its actual registered area');this.#ready(registered);}
  finalSeats(capture);Reflect.apply(partyFinalSelections,this.input.authority,[selected]);
  return Object.freeze(capture.rows.map(r=>r.seat));
 }
 /** Death/respawn uses the ordinary physical handoff for each actual source.
  * This private bridge neither creates road tickets nor borrows another frame. */
 #loadPartyZone(zoneId:string,from?:string):void{
  const frame=this.#frame;if(!frame?.active||this.#moving||this.#partyMoving||this.#activeRoad)throw Error('Native party handoff needs an idle current transition');
  const seats=this.#partySeats(),capture=captureSeats(this.input.campaign,seats),selected=Reflect.apply(partySelectActors,this.input.authority,[capture.rows.map(r=>r.body)]);
  if(new Set(capture.rows.map(r=>r.body)).size!==capture.rows.length)throw Error('Native party handoff has duplicate bodies');const groups=new Map<Registered,Seat[]>();for(let i=0;i<capture.rows.length;i++){const row=[...this.#areas.values()].find(area=>area.binding===selected[i].binding)!;const group=groups.get(row)??[];group.push(capture.rows[i].seat);groups.set(row,group);}
  finalSeats(capture);Reflect.apply(partyFinalSelections,this.input.authority,[selected]);this.#partyMoving=true;
  try{
   for(const [source,cohort]of groups){this.#ready(source);const now=captureSeats(this.input.campaign,cohort),current=Reflect.apply(partySelectActors,this.input.authority,[now.rows.map(r=>r.body)]);finalSeats(now);Reflect.apply(partyFinalSelections,this.input.authority,[current]);if(current.some(r=>r.binding!==source.binding))throw Error('Native party handoff source changed');frame.current=source;frame.seats=Object.freeze([...cohort]);this.loadZone(zoneId,from??source.id);}
   const destination=this.#areas.get(zoneId);if(!destination)throw Error('Native party handoff has no completed destination');
   const now=captureSeats(this.input.campaign,seats),current=Reflect.apply(partySelectActors,this.input.authority,[now.rows.map(r=>r.body)]);finalSeats(now);Reflect.apply(partyFinalSelections,this.input.authority,[current]);if(current.some(r=>r.binding!==destination.binding))throw Error('Native party did not reach its destination');
   const local=own<Seat>(this.input.characterWriter,'localSeat'),hero=now.rows.find(r=>r.seat===local)?.body;if(!hero)throw Error('Native party handoff lost its local hand');writable(destination.binding.scene,'player');
   destination.binding.scene.player=hero;frame.current=destination;frame.seats=Object.freeze([...seats]);this.#published=destination;
  }finally{this.#partyMoving=false;}
 }

 /** A Continue shell alone may replace its entire recorded graph. Its old row
  * stays physically scoped until native arrival transfers the real cohort. */
 restoreCharacterGraph(token:NativeCharacterResumeReceipt,world:Parameters<World['adoptWorldState']>[0]):void {
  const r=assertNativeCharacterResume(token,'graph');this.assertIdleFrame();const source=this.#published;if(!source||source.ongoing!==r.area||r.preparation!==this.#preparation||r.writer!==this.input.characterWriter||this.#areas.size!==1||this.#restore||this.#hostedRoads||this.#roadQueue.length)throw Error('Native Continue requires its only provisional local area');this.#ready(source);this.#restore={owner:r.owner,source,arriving:false};Reflect.apply(this.#lifecycle.setRestore,this.#preparation!,[token]);
  if(!source.combat.restoreCharacterGraph(token,world))throw Error('Native recorded world could not be restored');
 }
 resumeCharacterArrival(token:NativeCharacterResumeReceipt,...args:Parameters<World['resumeSpawn']>):void {
  const r=assertNativeCharacterResume(token,'arrival'),restore=this.#restore;this.assertIdleFrame();if(!restore||restore.owner!==r.owner||restore.source.ongoing!==r.area||r.preparation!==this.#preparation||restore.arriving)throw Error('Native Continue arrival lost its provisional receipt');restore.arriving=true;restore.token=token;
  restore.source.combat.campaignFrame.resumeSpawn(...args);
  if(this.#published===restore.source)throw Error('Native Continue did not replace its provisional area');
  // The original source operation must finish its native finally before its
  // binding can be revoked. No source driver remains active beyond this point.
  assertNativeCombatOperationsIdle();const source=restore.source,remaining=rawValues<Actor>(own(source.binding.scene,'actors'));Reflect.apply(authorityFinalPhysical,this.input.authority,[source.binding]);Reflect.apply(this.#lifecycle.release,this.input.authority,[source.binding,remaining]);Reflect.apply(this.#lifecycle.unregister,this.input.authority,[source.binding]);Reflect.apply(this.#lifecycle.population,source.ongoing.assembly.input.population,[]);Reflect.apply(this.#lifecycle.deeds,source.combat.campaignOwner,[]);this.#combats.delete(source.combat);if(this.#areas.get(source.id)===source)this.#areas.delete(source.id);Reflect.apply(this.#lifecycle.finishRestore,this.#preparation!,[source.ongoing,token]);this.#restore=null;
 }
 assertProvisionalRestoreSource(owner:NativeAreaCharacterResume,area:NativeAreaSceneOngoing):void {if(this.#restore?.owner!==owner||this.#restore.source.ongoing!==area||!this.#restore.arriving)throw Error('Native provisional restore source is not selected');}
 loadZone(zoneId:string,from?:string):void{
  assertNativeRetainedMassState(this.input.characterWriter);
  const frame=this.#frame;if(!frame?.active||this.#moving)throw Error('Native area handoff needs its current synchronous transition frame');
  const realm=this.#realmEntry;if(realm&&(realm.frame!==frame||realm.source!==frame.current||realm.destination!==zoneId||realm.consumed))throw Error('Native realm handoff differs from its selected entry');
  const source=frame.current,restoring=this.#restore?.source===frame.current&&this.#restore.arriving;let destination=this.#areas.get(zoneId);if(restoring&&destination===source)destination=undefined;
  this.#ready(source);if(destination)this.#ready(destination);this.#assertProjection();if(source===destination)return;
  if(realm){realm.definition=own<World['zone']>(this.input.campaign.caveMap,zoneId);if(!realm.definition||realm.definition.id!==zoneId)throw Error('Native realm entry lost its minted definition');}
  if(!destination&&!this.#preparation)throw Error('Native destination needs the actual campaign preparation owner');
  this.#moving=true;
  try{
   this.input.characterWriter['townLayoutChangedOnLoad']=false;if(destination)destination.combat.runtimeState.frame.townLayoutChangedOnLoad=false;
   for(const seat of frame.seats)if(optionalOwn<Actor>(seat,'home'))source.combat.control.seatEject(seat,'travel');
   const capture=captureSeats(this.input.campaign,frame.seats),bodies=capture.rows.map(r=>r.body),seatBodies=new Set(bodies),localSeat=this.input.campaign.localSeat,scene=source.ongoing.assembly.input.scene;
   const activeRoad=this.#activeRoad;if(activeRoad){if(activeRoad.frame!==frame||activeRoad.receipt.dest!==zoneId||frame.seats.length!==1||frame.seats[0]!==activeRoad.receipt.seat)throw Error('Native road handoff changed its exact ticket');activeRoad.body=bodies[0];}
   const onGraph=!!this.input.campaign.zoneMap[zoneId],publish=frame.seats.includes(localSeat),sourceCensus=own<Actor[]>(scene,'actors');mutableCensus(sourceCensus);
   const cohort=rawValues<Actor>(sourceCensus).filter(a=>seatBodies.has(a)||!!optionalOwn<Actor>(a,'owner')&&seatBodies.has(optionalOwn<Actor>(a,'owner')!)&&!own<boolean>(a,'dead')&&!optionalOwn<boolean>(a,'construct'));
   if(!bodies.length||bodies.some(body=>!cohort.includes(body)))throw Error('Native transition lost a selected controlled body');
   Object.freeze(cohort);const selected=this.input.authority.selectActors(cohort),incoming=capture.rows.find(r=>r.seat===localSeat)?.body??bodies[0];
   if(selected.some(s=>s.binding!==source.binding))throw Error('Native transition cohort is foreign');
   const carriedScene=publish?own<World['scene']>(source.ongoing.quests.input.state,'scene'):null;
   const run=own<World['voyage']>(source.ongoing.assembly.transition,'voyage'),stash=own<World['wraithsailSeaStash']>(source.ongoing.assembly.input.state,'wraithsailSeaStash');
   if((run||stash||zoneId===VOYAGE_ZONE_ID||source===this.#voyageArea)&&!publish)throw Error('Native solo voyage needs its genuine campaign-local crossing');
   const crossing=publish&&(run||stash||zoneId===VOYAGE_ZONE_ID||source===this.#voyageArea||onGraph&&this.#voyageArea)?{source,destinationId:zoneId,run,stash,surface:onGraph,surfaceHandled:false}:null;this.#voyageCrossing=crossing;
   const ladder={caveReturn:source.roads.caveReturn,caveStack:[...source.roads.caveStack]};
   source.combat.transitionDeparture(cohort);if(restoring){if(!source.departure.adoptedZonePending)throw Error('Native restored departure lost its adopted-world suppression');sceneCaptureZoneMemory(source.departure.host);}else source.departure.captureZoneMemory();
   if(onGraph){this.#abandonVoyageSurface();sceneNecropolisSurfaceArrival(this.input.campaign);}
   // Native pre-layout cancellation. The source queues remain retained, while
   // actor-carried casting and marks cannot migrate into the destination.
   incoming.dash=null;incoming.casting=null;
   const meta=capture.rows.find(r=>r.body===incoming)!.seat.meta;
   for(const inst of meta.knownSkills.values())if(inst.state?.markPos)inst.state.markPos=null;
   const firstBirth=!destination;if(realm)realm.revisit=!firstBirth;
   if(!destination){
    const ongoing=this.#preparation!.prepareDestination(source.ongoing,zoneId,from,incoming),memory=new NativeAreaSceneMemory(ongoing.assembly,this.input.authority),roads=new NativeAreaRoadContext(ongoing.assembly,this.input.authority,this.input.campaign),departure=new NativeAreaSceneDepartureMemory(ongoing,memory);
    destination=Object.freeze({ongoing,combat:ongoing.combat,memory,roads,departure,binding:ongoing.binding,id:zoneId});
    const observers=ongoing.assembly.input.scene.actors;mutableCensus(observers);if(observers.length!==1||observers[0]!==incoming)throw Error('Native prepared destination observer changed');Reflect.apply(arraySplice,observers,[0,1]);
   }
   const destinationVoyage=crossing?own<World['voyage']>(destination.ongoing.assembly.transition,'voyage'):null,destinationStash=crossing?own<World['wraithsailSeaStash']>(destination.ongoing.assembly.input.state,'wraithsailSeaStash'):null;
   if(crossing&&((destinationVoyage&&destinationVoyage!==crossing.run)||(destinationStash&&destinationStash!==crossing.stash)))throw Error('Native destination already owns a distinct voyage');
   if(crossing){writable(source.ongoing.assembly.transition,'voyage');writable(source.ongoing.assembly.input.state,'wraithsailSeaStash');writable(destination.ongoing.assembly.transition,'voyage');writable(destination.ongoing.assembly.input.state,'wraithsailSeaStash');if(!firstBirth&&crossing.surface)this.prepareVoyageSurface(destination.ongoing);}
   if(!firstBirth){this.#furnishArrival=destination.combat;try{destination.combat.refreshSidezoneFurnish();}finally{this.#furnishArrival=null;}}
   if(!firstBirth){this.#townArrival=destination.combat;try{destination.combat.refreshTownStations(incoming);}finally{this.#townArrival=null;}}
   const destScene=destination.ongoing.assembly.input.scene,destCensus=own<Actor[]>(destScene,'actors'),relay=destination.ongoing.assembly.input.population.factory.relayStatus;mutableCensus(destCensus);
   const destinationScene=own<World['scene']>(destination.ongoing.quests.input.state,'scene');
   if(realm){writable(source.combat.campaignOwner.state,realm.key);writable(destination.combat.campaignOwner.state,realm.key);const existing=own(destination.combat.campaignOwner.state,realm.key),issued=this.#realmContexts.get(destination.combat);if(issued&&(issued.key!==realm.key||issued.definition!==realm.definition))throw Error('Native realm destination receipt differs');if(existing!==(realm.prepared===destination.combat?realm.value:null)&&!(issued&&issued.value===existing))throw Error('Native realm destination already owns an unissued or replaced context');realm.previous=existing;realm.completed=!!issued&&existing===null;}
   if(carriedScene){if(destinationScene&&destinationScene!==carriedScene)throw Error('Native destination already owns a distinct running scene');writable(source.ongoing.quests.input.state,'scene');writable(destination.ongoing.quests.input.state,'scene');}
   if(cohort.some(a=>Reflect.apply(arrayIncludes,destCensus,[a])))throw Error('Native transition destination already contains moving body');
   writable(destScene,'player');for(const a of cohort)writable(a,'statusRelay');
   this.#ready(source);if(!firstBirth)this.#ready(destination);this.#assertProjection();finalSeats(capture);this.input.authority.assertFinalSelections(selected);this.input.authority.assertFinalPhysical(destination.binding);
   if(own(scene,'actors')!==sourceCensus||own(destScene,'actors')!==destCensus)throw Error('Native transition census replaced before commit');
   mutableCensus(sourceCensus);mutableCensus(destCensus);
   const geometry=destination.ongoing.assembly.input.geometry,prepared=destination.ongoing.assembly.preparedPlacement;if(!prepared)throw Error('Native destination lost its actual prepared placement');
   const back=from?geometry.exits.find(e=>e.to===from):undefined,center=vec(geometry.arena.w/2,geometry.arena.h/2);let entry:Vec2=vec(prepared.entry.x,prepared.entry.y);if(back){const angle=angleTo(back.pos,center);entry=vec(back.pos.x+Math.cos(angle)*120,back.pos.y+Math.sin(angle)*120);}const landing=!back&&prepared.spawnAt?prepared.spawnAt:entry;
   // Exact native motion/tier reset statements, before destination birth. Quiet
   // carom teardown uses the real source operation while the body is still
   // physically source-owned; that native branch touches only the actor.
   incoming.pos=geometry.clampPos(vec(landing.x,landing.y),incoming.radius);incoming.push=null;incoming.dash=null;
   incoming.tier=0;incoming.onTierLink=false;incoming.aiTierGoal=undefined;source.combat.endCarom(incoming,{quiet:true});incoming.frameLockRect=null;
   for(const a of cohort){if(a===incoming)continue;a.dash=null;a.casting=null;a.push=null;if(a.caromRun)source.combat.endCarom(a,{quiet:true});a.frameLockRect=null;a.tier=0;a.onTierLink=false;a.aiTierGoal=undefined;a.pos=geometry.clampPos(vec(landing.x+rand(-80,80),landing.y+rand(-80,80)),a.radius);}
   // Native callbacks above may fail after their earlier motion writes. Recheck
   // all authority before committing raw census transfer; never roll them back.
   finalSeats(capture);this.input.authority.assertFinalSelections(selected);this.input.authority.assertFinalPhysical(destination.binding);
   if(own(scene,'actors')!==sourceCensus||own(destScene,'actors')!==destCensus)throw Error('Native transition census changed during landing');mutableCensus(sourceCensus);mutableCensus(destCensus);
   if(carriedScene&&(own(source.ongoing.quests.input.state,'scene')!==carriedScene||own(destination.ongoing.quests.input.state,'scene')!==destinationScene))throw Error('Native scene identity changed during handoff');
   if(crossing&&(own(source.ongoing.assembly.transition,'voyage')!==crossing.run||own(source.ongoing.assembly.input.state,'wraithsailSeaStash')!==crossing.stash))throw Error('Native voyage crossing state changed before transfer');
   if(crossing&&(own(destination.ongoing.assembly.transition,'voyage')!==destinationVoyage||own(destination.ongoing.assembly.input.state,'wraithsailSeaStash')!==destinationStash))throw Error('Native destination voyage changed before transfer');
   if(realm){
    if(own(source.combat.campaignOwner.state,realm.key)!==realm.value||own(destination.combat.campaignOwner.state,realm.key)!==realm.previous)throw Error('Native realm context changed during handoff');
    if(own(this.input.campaign.caveMap,zoneId)!==realm.definition||destScene.zone!==realm.definition)throw Error('Native realm destination definition changed during handoff');
    writable(source.combat.campaignOwner.state,realm.key);writable(destination.combat.campaignOwner.state,realm.key);
   }
   for(const a of cohort){const index=Reflect.apply(arrayIndexOf,sourceCensus,[a]);Reflect.apply(arraySplice,sourceCensus,[index,1]);Reflect.apply(arrayPush,destCensus,[a]);Reflect.apply(authorityTransfer,this.input.authority,[a,source.binding,destination.binding]);}
   // World.loadZone retains its exact scene record. Only the actual local
   // presentation cohort carries that record; remote travel cannot steal it.
   if(carriedScene){destination.ongoing.quests.input.state.scene=carriedScene;source.ongoing.quests.input.state.scene=null;}
   if(crossing){destination.ongoing.assembly.transition.voyage=crossing.run;destination.ongoing.assembly.input.state.wraithsailSeaStash=crossing.stash;source.ongoing.assembly.transition.voyage=null;source.ongoing.assembly.input.state.wraithsailSeaStash=null;}
   // The exact realm entry belongs to its destination, including during native
   // birth. Empty source areas retain neither the reward nor its portal gate.
   if(realm){const value=realm.completed?null:realm.value;if(!Reflect.set(destination.combat.campaignOwner.state,realm.key,value)||!Reflect.set(source.combat.campaignOwner.state,realm.key,null))throw Error('Native realm context is no longer writable');this.#realmContexts.set(destination.combat,{key:realm.key,definition:realm.definition!,value});realm.consumed=true;}
   destScene.player=incoming;for(const a of cohort)a.statusRelay=relay;frame.current=destination;if(publish)this.#published=destination;
   destination.roads.entryFrom=from??null;destination.roads.caveReturn=onGraph?null:ladder.caveReturn;destination.roads.caveStack=onGraph?[]:ladder.caveStack;
   if(activeRoad){activeRoad.destination=destination;const selectedLadder=activeRoad.receipt.ticket.ladder;if(selectedLadder){destination.roads.caveReturn=selectedLadder.caveReturn;destination.roads.caveStack=[...selectedLadder.caveStack];}}
   const arriving=destination;
   const packedToken=Object.freeze({}) as NativePackedTravelReceipt,packed:PackedTravel={active:true,consumed:false,source:source.ongoing.assembly.input.ecology,destination:arriving.ongoing.assembly.input.ecology,actors:cohort,ids:cohort.map(actor=>own<number>(actor,'id')),authority:this.input.authority,binding:arriving.binding};packedTravel.set(packedToken,packed);
   try{Reflect.apply(this.#lifecycle.packed,packed.destination,[packedToken,firstBirth,()=>{if(firstBirth){this.#preparation!.birthTransferred(arriving.ongoing);this.#ready(arriving);if(restoring)Reflect.apply(this.#lifecycle.discardRestore,this.input.memoryRegistry,[source.memory,this.#restore!.token!]);this.input.memoryRegistry.register(arriving.memory);this.#ready(arriving);this.#areas.set(zoneId,arriving);this.#combats.set(arriving.combat,arriving);this.#roadInstances.set(zoneId,activeRoad?.receipt.instance);if(this.#hostedRoads)this.#installRoadLink(arriving);}}]);if(!packed.consumed)throw Error('Native destination did not consume its packed arrival');}finally{packed.active=false;}
   if(crossing&&zoneId===VOYAGE_ZONE_ID){if(this.#voyageArea&&this.#voyageArea!==destination)throw Error('Native voyage episode already owns another sea');this.#voyageArea=destination;if(!firstBirth){this.#voyageArrival=destination.combat;try{destination.combat.resumeVoyageArrival();}finally{this.#voyageArrival=null;}}}
   if(crossing?.surface&&this.#voyageArea&&this.#voyageArea!==destination)this.#voyageCompleted=this.#voyageArea;
   if(activeRoad)this.#roadBeforeArrival(activeRoad,firstBirth);
   for(const seat of frame.seats){source.roads.depart(seat);destination.roads.arrive(seat,activeRoad?activeRoad.receipt.ticket:{seatId:own<string>(seat,'id'),dest:zoneId,...(!onGraph?{ladder}:{})},from??null);}
   destination.combat.transitionArrival(cohort);
   if(!firstBirth){this.#bountyArrival={combat:destination.combat,from};try{destination.combat.arriveBounties();}finally{this.#bountyArrival=null;}}


   if(activeRoad){const after=activeRoad.receipt.ticket.after;if(after!==undefined)this.#invokeRoad(activeRoad,after,activeRoad.receipt.ticket,[activeRoad.receipt.seat,firstBirth]);this.#roadCheck(activeRoad);}
  }finally{this.#voyageCrossing=null;this.#moving=false;}
 }

 /** Query only: an external structural link cannot acquire installation rights. */
 ownsRoadLink(combat:NativeAreaSceneCombat,link:ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>):boolean{return this.#roadLinks.get(combat)===link;}
 #enableHostedRoads():void{
  this.assertIdleFrame();this.#assertProjection();if(this.#hostedRoads)return;if(!this.#published)throw Error('Native hosted roads need a published campaign');
  for(const row of this.#areas.values())this.#ready(row);this.#hostedRoads=true;this.#roadKeeper=this.#published;for(const row of this.#areas.values())this.#installRoadLink(row);
 }
 #installRoadLink(row:Registered):void{
  if(this.#roadLinks.has(row.combat))return;const self=this;
  const link:ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>=Object.freeze({role:row===this.#roadKeeper?'keeper':'unit',key:row.id,
   enqueue(ticket:RoadTicket<NativeAreaRoadDestination>){self.#enqueueRoad(row,ticket);},
   dispatch<T>(zoneId:string,fn:(view:NativeAreaDirectoryView)=>T):T|undefined{self.#ready(row);if(self.#frame||self.#moving){self.#deferredRoadDispatch.push({source:row,zoneId,fn});return undefined;}return self.atZone(zoneId,fn);},
   worlds(){self.#ready(row);return Object.freeze(self.residentAreas().map(area=>self.#directory(self.#combat(area.combat))));},
   liveSeed(zoneId:string,seatId?:string){self.#ready(row);const dest=self.#areas.get(zoneId);if(!dest)return undefined;if(seatId!==undefined){const capture=captureSeats(self.input.campaign);if(!capture.rows.some(r=>r.id===seatId))return undefined;finalSeats(capture);}self.#ready(dest);return dest.ongoing.assembly.input.geometry.currentZoneSeed;},
  });
  this.#roadLinks.set(row.combat,link);installNativeRoadLink(this,row.combat,link);
 }
 #ticketIdentity(receipt:RoadReceipt):void{const t=receipt.ticket;if(own(t,'seatId')!==receipt.id||own(t,'dest')!==receipt.dest||optionalOwn(t,'instance')!==receipt.instance)throw Error('Native queued ticket identity changed');}
 #enqueueRoad(source:Registered,ticket:RoadTicket<NativeAreaRoadDestination>):void{
  if(!this.#hostedRoads)throw Error('Native hosted roads are not enabled');if(!ticket||typeof ticket!=='object')throw Error('Native road needs an actual ticket');
  const id=own<string>(ticket,'seatId'),dest=own<string>(ticket,'dest'),instance=optionalOwn<string>(ticket,'instance');if(typeof id!=='string'||typeof dest!=='string'||(instance!==undefined&&typeof instance!=='string'))throw Error('Native road needs primitive ticket identity');
  const campaignCapture=captureSeats(this.input.campaign),selectedSeat=campaignCapture.rows.find(row=>row.id===id);if(!selectedSeat||optionalOwn(selectedSeat.seat,'keeper'))throw Error('Native road needs an actual travelling seat');
  this.#ready(source);const capture=captureSeats(this.input.campaign,[selectedSeat.seat]),body=capture.rows[0].body,selections=this.input.authority.selectActors([body]);
  if(selections[0].binding!==source.binding)throw Error('Native ticket seat is not in its source');finalSeats(campaignCapture);finalSeats(capture);this.input.authority.assertFinalSelections(selections);
  const receipt:RoadReceipt={ticket,source,capture,seat:selectedSeat.seat,id,dest,instance,origin:this.#frame?.view??null,used:false};this.#ticketIdentity(receipt);this.#roadQueue.push(receipt);
 }
 #drainRoads():readonly NativeRoadDrainResult[]{
  this.assertIdleFrame();if(!this.#hostedRoads)throw Error('Native hosted roads are not enabled');this.#roadDraining=true;const out:NativeRoadDrainResult[]=[],moved=new Set<Seat>();
  try{
   while(this.#deferredRoadDispatch.length){const d=this.#deferredRoadDispatch.shift()!;try{this.#ready(d.source);this.atZone(d.zoneId,d.fn);}catch(error){out.push({seatId:'',dest:d.zoneId,outcome:'failed',error});}}
   while(this.#roadQueue.length){const receipt=this.#roadQueue.shift()!;if(receipt.used)throw Error('Native road receipt already consumed');receipt.used=true;
    if(moved.has(receipt.seat)){out.push({seatId:receipt.id,dest:receipt.dest,outcome:'duplicate'});continue;}
    try{const outcome=this.#executeRoad(receipt);moved.add(receipt.seat);out.push({seatId:receipt.id,dest:receipt.dest,outcome});}catch(error){out.push({seatId:receipt.id,dest:receipt.dest,outcome:'failed',error});}
   }
   return Object.freeze(out.map(row=>Object.freeze(row)));
  }finally{this.#roadDraining=false;}
 }
 #executeRoad(receipt:RoadReceipt):'moved'|'same-area'{
  this.#ready(receipt.source);this.#assertProjection();this.#ticketIdentity(receipt);finalSeats(receipt.capture);
  const body=receipt.capture.rows[0].body,selections=this.input.authority.selectActors([body]);if(selections[0].binding!==receipt.source.binding)throw Error('Native queued seat left its original area');finalSeats(receipt.capture);this.#ticketIdentity(receipt);this.input.authority.assertFinalSelections(selections);
  if(!(this.input.campaign.zoneMap[receipt.dest]??this.input.campaign.caveMap[receipt.dest]))throw Error('Native road destination is unknown');
  const dest=this.#areas.get(receipt.dest);if(dest&&this.#roadInstances.get(receipt.dest)!==receipt.instance)throw Error('Native retained zone already belongs to a different instance');if(dest===receipt.source)return 'same-area';
  const frame={source:receipt.source,current:receipt.source,seats:Object.freeze([receipt.seat]),active:true} as Frame;frame.view=Object.freeze({get source(){return frame.source.ongoing;},get current(){if(!frame.active)throw Error('Native road frame expired');return frame.current.ongoing;},get seats(){if(!frame.active)throw Error('Native road frame expired');return frame.seats;},get active(){return frame.active;}});
  const active:ActiveRoad={receipt,frame,body,destination:null,woke:!dest};this.#frame=frame;this.#activeRoad=active;
  try{const from=receipt.ticket.from;this.#ticketIdentity(receipt);finalSeats(receipt.capture);this.input.authority.assertFinalSelections(selections);this.loadZone(receipt.dest,from===undefined?receipt.source.id:from??undefined);return 'moved';}
  finally{frame.active=false;this.#frame=null;this.#activeRoad=null;this.#roadCallback=null;}
 }
 #roadCheck(active:ActiveRoad):Registered{
  if(this.#activeRoad!==active||this.#frame!==active.frame||!active.frame.active||!active.destination||active.frame.current!==active.destination)throw Error('Native road destination scope is expired');
  const row=active.destination,capture=captureSeats(this.input.campaign,[active.receipt.seat]);this.#ready(row);finalSeats(capture);this.#ticketIdentity(active.receipt);
  if(capture.seats!==active.receipt.capture.seats||capture.rows[0].body!==active.body||own(active.receipt.seat,'id')!==active.receipt.id)throw Error('Native road traveller changed during callback');Reflect.apply(authorityFinalPhysical,this.input.authority,[row.binding,[active.body]]);return row;
 }
 #roadDestination(active:ActiveRoad):NativeAreaRoadDestination{
  const self=this,row=this.#roadCheck(active),directory=this.#directory(row),view=Object.create(null) as NativeAreaRoadDestination;
  const check=()=>{if(self.#roadCallback!==active)throw Error('Native road callback capability expired');return self.#roadCheck(active);};
  for(const key of Reflect.ownKeys(directory))Object.defineProperty(view,key,{enumerable:true,get(){check();const value=Reflect.get(directory,key);check();return typeof value==='function'?(...args:unknown[])=>{check();return Reflect.apply(value,directory,args);}:value;}});
  for(const key of ['waypointPos','caveEntrances'] as const)Object.defineProperty(view,key,{enumerable:true,get(){return check().ongoing.assembly.input.geometry[key];}});
  Object.defineProperty(view,'massRuntime',{enumerable:true,get(){check();return null;}});Object.defineProperty(view,'shardWorld',{enumerable:true,get(){return check().roads.shardWorld;}});
  Object.defineProperty(view,'findFreeSpot',{enumerable:true,get(){const geometry=check().ongoing.assembly.input.geometry,fn=geometry.findFreeSpot;check();return(...args:Parameters<World['findFreeSpot']>)=>{check();return Reflect.apply(fn,geometry,args);};}});
  Object.defineProperty(view,'seatHero',{enumerable:true,get(){check();const campaign=self.input.campaign,fn=campaign.seatHero;check();return(seat:Seat)=>{check();if(seat!==active.receipt.seat)throw Error('Native road cannot select another seat');return Reflect.apply(fn,campaign,[seat]);};}});
  for(const key of ['realmContext','crusadeRealmContext','necropolisRealmContext','fractureRealmContext'] as const)Object.defineProperty(view,key,{enumerable:true,get(){return check().combat.campaignOwner.state[key];},set(value:unknown){const selected=check(),state=selected.combat.campaignOwner.state;if(!Reflect.set(state,key,value))throw new TypeError('Native realm context is not writable');self.#realmContexts.set(selected.combat,{key,definition:selected.ongoing.assembly.input.scene.zone,value});}});
  return Object.freeze(view);
 }
 #invokeRoad(active:ActiveRoad,fn:unknown,receiver:unknown,rest:unknown[]=[]):unknown{
  if(typeof fn!=='function')throw new TypeError('Native road selected a noncallable callback');this.#roadCheck(active);const previous=this.#roadCallback;this.#roadCallback=active;
  try{const destination=this.#roadDestination(active);this.#roadCheck(active);const result=Reflect.apply(fn,receiver,[destination,...rest]);if(nativeBirthAsyncResult(result))throw Error('Native road callback must be synchronous');this.#roadCheck(active);return result;}
  finally{this.#roadCallback=previous;}
 }
 #roadBeforeArrival(active:ActiveRoad,woke:boolean):void{
  if(woke){const callback=active.receipt.ticket.onFirstWake;if(callback!==undefined)this.#invokeRoad(active,callback,active.receipt.ticket);}
  this.#roadCheck(active);const requested=active.receipt.ticket.landing;this.#roadCheck(active);
  const landing=(typeof requested==='function'?this.#invokeRoad(active,requested,undefined):requested) as LandingSpot|undefined;this.#roadCheck(active);
  if(landing&&landing!=='entry'){const at=landing.at,opts={...(landing.spread!==undefined?{spread:landing.spread}:{}),...(landing.band?{band:landing.band}:{}),...(landing.tier!==undefined?{tier:landing.tier}:{})};this.#roadCheck(active);this.landPartyAt(at,opts);}
 }

 /** The real global removeSeat calls this only after it removes and releases
  * the actual bodies. A captured cohort can shrink, never acquire new seats. */
 retireSeat(seat:Seat):void {
  const seats=rawValues<Seat>(this.input.campaign.seats);if(seats.includes(seat))throw Error('Native retired seat still belongs to campaign');
  const body=own<Actor>(seat,'actor');this.input.authority.assertUnclaimed(body);
  const without=(rows:readonly Seat[])=>Object.freeze(rows.filter(row=>row!==seat));if(this.#frame?.active)this.#frame.seats=without(this.#frame.seats);
  const pending=this.#traversalValue&&this.#traversals.get(this.#traversalValue);if(pending)pending.seats=without(pending.seats);
  const step=this.#traversalStep?.continuation;if(step&&step!==pending)step.seats=without(step.seats);
 }
 #replaceTraversal(next:TraversalState|null):void {
  const previous=this.#traversalValue;
  if(previous!==next&&previous){const continuation=this.#traversals.get(previous);if(continuation&&!(next===null&&this.#traversalStep?.continuation===continuation&&this.#traversalStep.finished))continuation.expired=true;}
  this.#traversalValue=next;
 }
 /** Called only at the shared native assignment seam. The record keeps its
  * real callbacks; these wrappers add an exact, synchronous continuation. */
 #bindTraversal(record:TraversalState):void {
  const frame=this.#frame;if(!frame?.active||!this.#published)throw Error('Native traversal binding needs an active actual transition');this.#assertProjection();
  if(this.#traversalValue!==record||this.#traversals.has(record))throw Error('Native traversal binding needs the newly installed exact record');
  const swap=optionalOwn<(()=>void)>(record,'swap'),done=optionalOwn<(()=>void)>(record,'done');
  if((swap!==undefined&&typeof swap!=='function')||(done!==undefined&&typeof done!=='function'))throw Error('Native traversal callbacks must be ordinary callable fields');
  if(swap)writable(record,'swap');if(done)writable(record,'done');
  const continuation:TraversalContinuation={origin:frame.view,record,source:frame.source,current:frame.current,seats:frame.seats,swap,done,swapWrapper:undefined,doneWrapper:undefined,swapUsed:false,doneUsed:false,expired:false},self=this;
  if(swap)continuation.swapWrapper=function(this:TraversalState){return self.#invokeTraversal(continuation,'swap',this);};
  if(done)continuation.doneWrapper=function(this:TraversalState){return self.#invokeTraversal(continuation,'done',this);};
  this.#traversals.set(record,continuation);if(swap)Object.defineProperty(record,'swap',{value:continuation.swapWrapper,writable:false,configurable:false});if(done)Object.defineProperty(record,'done',{value:continuation.doneWrapper,writable:false,configurable:false});
 }
 /** Actual updateTraversal owner calls this around its exact shared body.
  * It is reachable only through the privately issued actual owner bridge. */
 #runTraversalStep(action:()=>void):void {
  if(this.#frame||this.#traversalStep||this.#moving)throw Error('Native traversal step is already active');this.#assertProjection();
  const record=this.#traversalValue;if(record===null)return;const continuation=this.#traversals.get(record);if(!continuation||continuation.expired)throw Error('Native traversal step has no live bound record');
  if(optionalOwn(record,'swap')!==continuation.swapWrapper||optionalOwn(record,'done')!==continuation.doneWrapper)throw Error('Native traversal callback identity changed');
  this.#ready(continuation.current);const capture=captureSeats(this.input.campaign,continuation.seats),subjects=capture.rows.map(row=>row.body),selected=this.input.authority.selectActors(subjects);
  if(selected.some(row=>row.binding!==continuation.current.binding))throw Error('Native traversal cohort left its selected area');finalSeats(capture);this.input.authority.assertFinalSelections(selected);
  if(this.#traversalValue!==record||continuation.expired)throw Error('Native traversal record changed during admission');
  const state={source:continuation.source,current:continuation.current,seats:continuation.seats,active:true} as Frame;
  state.view=Object.freeze({get source(){return state.source.ongoing;},get current(){if(!state.active)throw Error('Native transition frame is expired');return state.current.ongoing;},get seats(){if(!state.active)throw Error('Native transition frame is expired');return state.seats;},get active(){return state.active;}});
  const step={continuation,finished:false};this.#frame=state;this.#traversalStep=step;
  try{const result=action();if(nativeBirthAsyncResult(result))throw Error('Native traversal step must be synchronous');}
  finally{continuation.current=state.current;if(this.#traversalValue!==record)continuation.expired=true;state.active=false;this.#frame=null;this.#traversalStep=null;}
 }
 /** Exact pre-null hook in the real native completion branch. Permission is
  * consumed by done and expires at the end of this very same native step. */
 #finishTraversal(record:TraversalState):void {
  const step=this.#traversalStep;if(!step||step.finished||step.continuation.record!==record||step.continuation.expired||this.#traversalValue!==record||own(record,'phase')!=='land')throw Error('Native traversal finish needs its exact selected native step');
  step.finished=true;
 }
 #invokeTraversal(continuation:TraversalContinuation,kind:'swap'|'done',receiver:TraversalState):void {
  const step=this.#traversalStep,frame=this.#frame,record=continuation.record;
  if(!step||step.continuation!==continuation||!frame?.active||continuation.expired||receiver!==record)throw Error('Native traversal callback is expired or foreign');
  if(kind==='swap'){
   if(step.finished||continuation.swapUsed||continuation.doneUsed||this.#traversalValue!==record||optionalOwn(record,'swap')!==continuation.swapWrapper)throw Error('Native traversal swap is stale or repeated');continuation.swapUsed=true;
  }else{
   if(!step.finished||continuation.doneUsed||this.#traversalValue!==null||optionalOwn(record,'done')!==continuation.doneWrapper||(continuation.swap!==undefined&&!continuation.swapUsed))throw Error('Native traversal completion is stale or out of order');continuation.doneUsed=true;
  }
  const callback=kind==='swap'?continuation.swap:continuation.done;
  const previous=this.#executingTraversalCallback;this.#executingTraversalCallback=continuation;
  try{const result=Reflect.apply(callback!,receiver,[]);if(nativeBirthAsyncResult(result))throw Error('Native traversal callback must be synchronous');}
  finally{this.#executingTraversalCallback=previous;continuation.current=frame.current;if(kind==='done')continuation.expired=true;}
 }
 landPartyAt(at:Vec2,opts?:Parameters<World['landPartyAt']>[1]):void{
  const frame=this.#frame;if(!frame?.active)throw Error('Native party landing needs its exact transition cohort');const row=frame.current;this.#ready(row);
  const capture=captureSeats(this.input.campaign,frame.seats),subjects=capture.rows.map(r=>r.body),selected=this.input.authority.selectActors(subjects);
  if(selected.some(s=>s.binding!==row.binding))throw Error('Native transition landing contains a foreign seat');finalSeats(capture);this.input.authority.assertFinalSelections(selected);
  const host=Object.create(row.ongoing.assembly.input.harbor.host) as NativeSceneHarborHost;
  Object.defineProperty(host,'seats',{get:()=>frame.seats});harborLandPartyAt(host,at,opts);
 }
}

installNativeHostedCoordinator({is:isNativeAreaSceneTransitionCoordinator,idle:NativeAreaSceneTransitionCoordinator.prototype.assertIdleFrame,ready:NativeAreaSceneTransitionCoordinator.prototype.nativeWorldReady,areaFor:NativeAreaSceneTransitionCoordinator.prototype.areaFor});
