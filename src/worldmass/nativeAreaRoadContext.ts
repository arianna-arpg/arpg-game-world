import {nativeReadyPresence} from './nativeAreaScenePresence';
/** Actual retained area's door and cave-ladder context. The native World-keyed
 * road directory is not reused with a structural facade. */
import type {World,Seat} from '../engine/world';
import type {RoadTicket,CaveRung,ShardWorldLink} from '../engine/shardUnits';
import type {SeatLadder} from '../engine/shardRoads';
import {NativeAreaSceneAssembly} from './nativeAreaSceneAssembly';
import type {NativeAreaOngoingCampaign} from './nativeAreaSceneOngoing';
import {NativeAreaActorAuthority,type NativeAreaAuthorityBinding} from './nativeAreaActorAuthority';
import * as native from '../engine/nativeSceneRoadContext';
import type {ShardRoadHost} from '../engine/shardRoads';
import type {NativeAreaRoadDestination} from './nativeAreaRoadDestination';
import type {NativeAreaDirectoryView} from './nativeAreaDirectoryView';
import {issueNativeRoadQueueBridge,type NativeRoadDrainResult} from './nativeAreaSceneTransitionCoordinator';
import {scanNativeSceneRoads,type NativeSceneRoadScanHost} from '../engine/nativeSceneRoadScan';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {isNativeAreaSceneTransitionCoordinator,type NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
export interface NativeRoadOwnerBridge {
 enableHosted():void;
 enqueue(ticket:RoadTicket<NativeAreaRoadDestination>):void;
 drain():readonly NativeRoadDrainResult[];
 readonly link:ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>|undefined;
 readonly view:ShardRoadHost<NativeAreaRoadDestination>|undefined;
 cache(host:ShardRoadHost<NativeAreaRoadDestination>):void;
 scan(host:NativeSceneRoadScanHost):void;
}
interface RoadAccess {install(link:ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>):void;link():ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>|undefined;view():ShardRoadHost<NativeAreaRoadDestination>|undefined;cache(host:ShardRoadHost<NativeAreaRoadDestination>):void;scan(host:NativeSceneRoadScanHost):void}
const roadAccess=new WeakMap<NativeAreaRoadContext,RoadAccess>();
const roadBridges=new WeakMap<NativeAreaSceneCombat,NativeRoadOwnerBridge>();
/** Only an actual owner's private aggregate entry may acquire this bridge.
 * The resulting closures never expose the native per-seat maps. */
export function issueNativeRoadOwnerBridge(coordinator:NativeAreaSceneTransitionCoordinator,owner:object,combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry):NativeRoadOwnerBridge {
 if(!isNativeAreaSceneTransitionCoordinator(coordinator)||!isNativeAreaSceneCombat(combat)||!owner||typeof owner!=='object')throw Error('Native road bridge needs actual runtime owners');
 assertNativeCombatOwnerEntry(combat,entry);
 for(const key of ['campaign','characterWriter','authority'] as const)if(combat.input[key]!==coordinator.input[key])throw Error('Native road bridge roots differ: '+key);
 if(roadBridges.has(combat))throw Error('Native combat already issued its road bridge');
 const select=():RoadAccess=>{
  assertNativeCombatOwnerEntry(combat,entry);
  const d=Object.getOwnPropertyDescriptor(combat,'campaignFrame');
  if(!d||!Object.hasOwn(d,'value')||d.value!==owner)throw Error('Native road bridge owner changed');
  const roads=coordinator.roadsFor(combat),access=roadAccess.get(roads);
  if(!access||roads.input.assembly!==combat.input.assembly||roads.input.authority!==coordinator.input.authority||roads.input.campaign!==coordinator.input.campaign)throw Error('Native road bridge area changed');
  return access;
 };
 const queue=issueNativeRoadQueueBridge(coordinator,owner,combat,entry);
 const bridge:NativeRoadOwnerBridge=Object.freeze({enableHosted(){select();queue.enableHosted();},enqueue(ticket:RoadTicket<NativeAreaRoadDestination>){select();queue.enqueue(ticket);},drain(){select();return queue.drain();},get link(){return select().link();},get view(){return select().view();},cache(host:ShardRoadHost<NativeAreaRoadDestination>){select().cache(host);},scan(host:NativeSceneRoadScanHost){entry(owner,{permission:'physical'},()=>select().scan(host));}});
 roadBridges.set(combat,bridge);return bridge;
}
/** Installation is nominal: only the coordinator's own private link object is accepted. */
export function installNativeRoadLink(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat,link:ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>):void{if(!isNativeAreaSceneTransitionCoordinator(coordinator)||!coordinator.ownsRoadLink(combat,link))throw Error('Native road link was not issued by its coordinator');const roads=coordinator.roadsFor(combat),access=roadAccess.get(roads);if(!access)throw Error('Native road context is unavailable');access.install(link);}
export class NativeAreaRoadContext {
 readonly input:Readonly<{assembly:NativeAreaSceneAssembly;authority:NativeAreaActorAuthority<object>;campaign:NativeAreaOngoingCampaign}>;
 readonly #binding:NativeAreaAuthorityBinding<object>;
 readonly #state=native.freshNativeSceneRoadState();
 readonly #host:native.NativeSceneRoadHost;
 #roadView:ShardRoadHost<NativeAreaRoadDestination>|undefined;
 #shardWorld:ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>|undefined;
 #scanHost:NativeSceneRoadScanHost|undefined;
 caveExitGrace=false;
 caveReturn:World['caveReturn']=null;
 caveStack:CaveRung[]=[];
 constructor(assembly:NativeAreaSceneAssembly,authority:NativeAreaActorAuthority<object>,campaign:NativeAreaOngoingCampaign){
  if(!(assembly instanceof NativeAreaSceneAssembly)||!(authority instanceof NativeAreaActorAuthority)||(assembly.input.campaign as object)!==campaign||authority.campaign!==campaign)throw Error('Native road context needs its actual area and campaign authority');
  if(assembly.phase!=='born'&&assembly.phase!=='prepared')throw Error('Native road context needs an actual prepared or born area');
  // Construction owns state only. Every public road operation still requires
  // completed birth and actual presence through assertReady.
  if(assembly.phase==='born')assembly.scenePresence.assertAuthority(authority);
  this.input=Object.freeze({assembly,authority,campaign});this.#binding=authority.bindingFor(assembly.input.scene);
  const self=this;
  this.#host=Object.freeze({get zone(){return assembly.input.scene.zone;},get zoneMap(){return campaign.zoneMap;},get caveMap(){return campaign.caveMap;},get entryFrom(){return self.entryFrom;},get caveReturn(){return self.caveReturn;},get time(){return campaign.time;},shardRoadHost:()=>({get caveStack(){return self.caveStack;}})});
  Object.defineProperty(this,'input',{writable:false,configurable:false,enumerable:false});
  roadAccess.set(this,{install:link=>{if(this.#shardWorld&&this.#shardWorld!==link)throw Error('Native hosted road link cannot be replaced');this.#shardWorld=link;},link:()=>this.#shardWorld,view:()=>this.#roadView,cache:host=>{if(!host||typeof host!=='object')throw Error('Native road view needs the actual owner host');if(this.#roadView&&this.#roadView!==host)throw Error('Native road view cannot be replaced');this.#roadView=host;},scan:host=>{if(!host||typeof host!=='object')throw Error('Native road scan needs the actual owner host');if(this.#scanHost&&this.#scanHost!==host)throw Error('Native road scan host cannot be replaced');this.#scanHost=host;scanNativeSceneRoads(host,this.#state);}});
 }
 /** Solo remains actual undefined until the genuine retained host installs its link. */
 get shardWorld():ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>|undefined{return this.#shardWorld;}
 get entryFrom():World['entryFrom']{return this.input.assembly.transition.entryFrom;}
 set entryFrom(value:World['entryFrom']){this.input.assembly.transition.entryFrom=value;}
 assertReady():void{
  const {assembly,authority}=this.input;
  if(assembly.phase!=='born'||authority.bindingFor(assembly.input.scene)!==this.#binding)throw Error('Native road context registration changed');
  assembly.scenePresence.assertAuthority(authority);
 }
 /** Identity half of readiness; its caller must perform the census check. */
 assertReadyIdentity():void{
  const {assembly,authority}=this.input;
  if(assembly.phase!=='born'||authority.bindingFor(assembly.input.scene)!==this.#binding)throw Error('Native road context registration changed');
  Reflect.apply(nativeReadyPresence.identity,assembly.scenePresence,[authority,this.#binding]);
 }
 #seat(seat:Seat,physical:boolean):void{
  // Entry policy inspects identity descriptors only. It does not invoke a seat
  // accessor before the unchanged native road derivation reads that seat.
  const id=seat&&Object.getOwnPropertyDescriptor(seat,'id'),body=seat&&Object.getOwnPropertyDescriptor(seat,'actor');
  if(!id||!Object.hasOwn(id,'value')||typeof id.value!=='string'||!body||!Object.hasOwn(body,'value'))throw Error('Native roads need an actual own-data seat identity');
  const {assembly,authority}=this.input,scene=assembly.input.scene;
  const seats=this.input.campaign.seats;
  if(!Array.isArray(seats))throw Error('Native road campaign needs actual seats');let present=false;
  const length=Object.getOwnPropertyDescriptor(seats,'length')?.value;
  for(let i=0;i<length;i++){const d=Object.getOwnPropertyDescriptor(seats,i);if(!d||!Object.hasOwn(d,'value'))throw Error('Native roads refuse accessor or sparse campaign seats');const candidate=d.value,otherId=Object.getOwnPropertyDescriptor(candidate,'id');if(!otherId||!Object.hasOwn(otherId,'value'))throw Error('Native roads need actual seat identities');if(candidate===seat)present=true;else if(otherId.value===id.value)throw Error('Native road seat identity is ambiguous');}
  if(!present)throw Error('Native road seat is foreign');
  if(physical){const owner=authority.require(body.value);if(owner.scene!==scene)throw Error('Native road seat belongs to another physical area');}
  this.assertReady();
  // The actual authority callback may replace the campaign array or remove a
  // seat without moving its still-physical body. Recheck that original party
  // identity before any native keyed road write; inspect raw descriptors only.
  if(this.input.campaign.seats!==seats)throw Error('Native road campaign seats replaced during admission');
  let finalPresent=false;const finalLength=Object.getOwnPropertyDescriptor(seats,'length')?.value;
  for(let i=0;i<finalLength;i++){const d=Object.getOwnPropertyDescriptor(seats,i);if(!d||!Object.hasOwn(d,'value'))throw Error('Native roads refuse changed campaign seat elements');const candidate=d.value,otherId=Object.getOwnPropertyDescriptor(candidate,'id');if(!otherId||!Object.hasOwn(otherId,'value'))throw Error('Native roads need final actual seat identities');if(candidate===seat)finalPresent=true;else if(otherId.value===id.value)throw Error('Native final road seat identity is ambiguous');}
  if(!finalPresent)throw Error('Native road seat left campaign during admission');
  const finalBody=Object.getOwnPropertyDescriptor(seat,'actor'),finalId=Object.getOwnPropertyDescriptor(seat,'id');
  if(!finalBody||!Object.hasOwn(finalBody,'value')||finalBody.value!==body.value||!finalId||!Object.hasOwn(finalId,'value')||finalId.value!==id.value)throw Error('Native road seat changed during admission');
  if(physical)authority.assertFinalPhysical(this.#binding,[body.value]);
 }
 seatDoorOf(seat:Seat):string|null{this.#seat(seat,true);return native.nativeRoadSeatDoorOf(this.#host,this.#state,seat);}
 seatLadderOf(seat:Seat):SeatLadder{this.#seat(seat,true);return native.nativeRoadSeatLadderOf(this.#host,this.#state,seat);}
 shardSpotOf(seat:Seat){this.#seat(seat,true);return native.nativeRoadShardSpotOf(this.#host,this.#state,seat);}
 roadDwellRow(seat:Seat){this.#seat(seat,true);return native.nativeRoadRoadDwellRow(this.#host,this.#state,seat);}
 arrive<T extends Pick<RoadTicket,'seatId'|'ladder'|'grace'>>(seat:Seat,ticket:T,from:string|null):void{this.#seat(seat,true);native.nativeRoadShardRoadArrive(this.#host,this.#state,seat,ticket,from);}
 /** Called after exact physical transfer. Clearing this area's own keyed rows
  * does not authorize touching the seat or its new area. */
 depart(seat:Seat):void{this.#seat(seat,false);native.nativeRoadShardRoadDepart(this.#host,this.#state,seat.id);}
}

export const nativeReadyRoadContext=NativeAreaRoadContext.prototype.assertReady;

export const nativeReadyRoadIdentity=NativeAreaRoadContext.prototype.assertReadyIdentity;
