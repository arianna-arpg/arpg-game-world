import {NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
import {assertNativeCharacterResume,type NativeCharacterResumeReceipt} from './nativeAreaCharacterResume';
/** Private, nominal lifetimes for the actual retained combat aggregate. */
import {installNativeCombatRecordRegistration,bindNativeCombatRecordObservation,nativeHiddenSourceCreationHost,type NativeCombatRecordObserver} from '../engine/nativeCombatRecordObservation';
import type {Actor} from '../engine/actor';
import type {NativeCombatActorScope,NativeCombatStatusScope,NativeCombatRetirement} from '../engine/nativeSceneFrameHost';
import {nativeStatusOrigin,retireNativeExpiredStatus,assertNativeStatusSelection,beginNativeStatusIteration,endNativeStatusIteration,type NativeStatusIteration} from '../engine/nativeStatusProvenance';
import type {Seat,World} from '../engine/world';
import type {SkillInstance} from '../engine/skills';
import type {ActiveStatus} from '../engine/status';
import type {NativeCombatRecordKind,NativeCombatRecordTypes,NativeCombatRecordPreparation,NativeCombatRecordScope,NativeCombatEventCallbackKind} from '../engine/nativeSceneCombatHost';
import {captureNativeActorConstruction} from '../engine/nativeActorConstruction';
import {withNativeStatusProvenance,type NativeStatusProvenanceObserver} from '../engine/nativeStatusProvenance';
import {NativeAreaActorAuthority,type NativeAreaAuthorityBinding,type NativeAreaActorSelection} from './nativeAreaActorAuthority';
import {NativeAreaSceneBirthAdmission} from './nativeAreaSceneBirthAdmission';
import {NativeAreaScenePopulation,nativeBirthAsyncResult} from './nativeAreaScenePopulation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat,type NativeAreaCombatServices} from './nativeAreaSceneCombat';
export type {NativeCombatRecordKind} from '../engine/nativeSceneCombatHost';
declare const activationBrand:unique symbol;
export interface NativeCombatActivation {readonly [activationBrand]:true;readonly relayBodies:readonly Actor[]}
interface ActivationSeat {readonly seat:Seat;readonly id:unknown;readonly body:Actor;readonly home:Actor|undefined;readonly ride:object|undefined;readonly mode:unknown;readonly seatId:unknown;readonly vacancy:object|undefined;readonly homeSeatId:unknown}
interface ActivationCapture {readonly census:Actor[];readonly cohort:readonly Actor[];readonly seats:readonly Seat[];readonly selected:readonly ActivationSeat[];readonly writerSeats:PropertyDescriptor;readonly initial:boolean;used:boolean}
function rawRows<T>(value:unknown):readonly T[] {if(!Array.isArray(value))throw Error('Native activation needs an ordinary raw array');const rows:T[]=[];for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,i);if(!d||!Object.hasOwn(d,'value'))throw Error('Native activation refuses sparse or accessor rows');rows.push(d.value);}return rows;}
function activationSeats(seats:readonly Seat[]):readonly ActivationSeat[] {return rawRows<Seat>(seats).map(seat=>{if(!seat||typeof seat!=='object')throw Error('Native activation needs actual seats');const body=ownData(seat,'actor') as Actor,home=ownData(seat,'home') as Actor|undefined;if(!body||typeof body!=='object'||(home!==undefined&&(!home||typeof home!=='object')))throw Error('Native activation needs actual controlled bodies');const ride=ownData(body,'possession') as object|undefined,vacancy=home&&ownData(home,'vacated') as object|undefined;return {seat,id:ownData(seat,'id'),body,home,ride,vacancy,homeSeatId:vacancy&&ownData(vacancy,'seatId'),mode:ride&&ownData(ride,'huskMode'),seatId:ride&&ownData(ride,'seatId')};});}
export type NativeCombatPermission='stats'|'status'|'proc'|'charge'|'refund'|'attribution'|'prepare'|'physical';
export interface NativeCombatSubjects {readonly physical?:readonly Actor[];readonly sources?:readonly Actor[];readonly carried?:readonly Actor[];readonly permission:NativeCombatPermission}
export type NativeAreaCombatOwnerEntry=<T>(owner:object,subjects:NativeCombatSubjects,action:()=>T)=>T;
export interface NativeAreaCombatOwnerHooks {
 createMonster(owner:object):NativeAreaSceneBirthAdmission['createMonster'];
 admitCombatBirth(owner:object,body:Actor):void;
 constructCombatActor(owner:object,create:()=>Actor):Actor;
 withdrawCarried(owner:object,seat:Seat,hero:Actor,body:Actor):void;
 restoreCarried(owner:object,seat:Seat,hero:Actor,body:Actor):void;
 selectCombatBirthOwner(owner:object,parent:Actor,selectedOwner:Actor|undefined):Actor|undefined;
 assertCombatKillContext(owner:object,ctx:ReturnType<World['killCtx']>):void;
}
type EventCallbackKind=NativeCombatEventCallbackKind;
interface CastEvent {readonly operation:NativeAreaCombatOperation;readonly frame:Frame;readonly actor:Actor;readonly parent:CastEvent|null;active:boolean}
interface KillEvent {readonly operation:NativeAreaCombatOperation;readonly frame:Frame;active:boolean}
interface Source {readonly actor:Actor;readonly instance:SkillInstance|null|undefined;readonly origin:NativeAreaAuthorityBinding<NativeAreaCombatServices>;readonly detached:boolean;readonly carried?:NativeAreaActorSelection<NativeAreaCombatServices>;readonly continuation?:Frame}
interface RecordReceipt {readonly source:Source|null;readonly kind:NativeCombatRecordKind;readonly owner:NativeAreaCombatOperation;readonly storage:object}
interface Frame {readonly operation:NativeAreaCombatOperation;readonly parent:Frame|null;readonly sources:readonly Source[];readonly selected?:Readonly<{kind:NativeCombatRecordKind;record:object}>;readonly binding:NativeAreaAuthorityBinding<NativeAreaCombatServices>;active:boolean}
interface Preparation {readonly frame:Frame;readonly kind:NativeCombatRecordKind;readonly record:object;readonly source:Source|null;used:boolean}
interface StatusFrame {readonly operation:NativeAreaCombatOperation;readonly frame:Frame;readonly target:Actor;readonly instance:SkillInstance|null|undefined;source:Source|null;active:boolean}
const create=Symbol('actual combat operation'),operations=new WeakMap<NativeAreaSceneCombat,NativeAreaCombatOperation>(),leafOperations=new WeakMap<object,NativeAreaCombatOperation>();
const ownerHooks=new WeakMap<NativeAreaCombatOwnerHooks,NativeAreaCombatOperation>();
const carriedReceipts=new WeakMap<NativeAreaActorAuthority<object>,WeakMap<Actor,{seat:Seat;body:Actor}>>();
const recordRegistrations=new WeakMap<object,{host:object;observer:NativeCombatRecordObserver}>();
export function nativeCombatRecordRegistration(token:object):{host:object;observer:NativeCombatRecordObserver} {const receipt=recordRegistrations.get(token);if(!receipt)throw Error('Foreign native combat record host registration');recordRegistrations.delete(token);return receipt;}
// Fail before the actual operation class can initialize if registration was
// preempted. Only this module can mint the consumed private WeakMap tokens.
installNativeCombatRecordRegistration(nativeCombatRecordRegistration);
const entries=new WeakMap<NativeAreaCombatOwnerEntry,NativeAreaCombatOperation>();
const storageOwners=new WeakMap<object,{operation:NativeAreaCombatOperation;kind:NativeCombatRecordKind}>();
const statusReceipts=new WeakMap<NativeAreaActorAuthority<object>,WeakMap<ActiveStatus,Source|null>>();
let top:Frame|null=null,statusTop:StatusFrame|null=null,killTop:KillEvent|null=null,castTop:CastEvent|null=null;
const unclaimed=NativeAreaActorAuthority.prototype.assertUnclaimed,presentPlayer=NativeAreaActorAuthority.prototype.isPresentPlayer,presentActor=NativeAreaActorAuthority.prototype.isPresentActor;
const bindingForActivation=NativeAreaActorAuthority.prototype.bindingFor;
const select=NativeAreaActorAuthority.prototype.selectActors,final=NativeAreaActorAuthority.prototype.assertFinalPhysical,finalSelections=NativeAreaActorAuthority.prototype.assertFinalSelections;
function ownData(object:object,key:PropertyKey):unknown {const d=Object.getOwnPropertyDescriptor(object,key);if(d&&!Object.hasOwn(d,'value'))throw Error('Native combat receipt needs an ordinary data field');return d?.value;}
/** Callable shape is not a constructor capability. This check grants no scope. */
export function assertNativeCombatOwnerEntry(combat:NativeAreaSceneCombat,entry:unknown):asserts entry is NativeAreaCombatOwnerEntry {if(typeof entry!=='function'||!operations.has(combat)||entries.get(entry as NativeAreaCombatOwnerEntry)!==operations.get(combat))throw Error('Native combat owner needs its privately issued aggregate entry');}
export function assertNativeCombatOwnerHooks(combat:NativeAreaSceneCombat,hooks:unknown):asserts hooks is NativeAreaCombatOwnerHooks {if(!hooks||typeof hooks!=='object'||!operations.has(combat)||ownerHooks.get(hooks as NativeAreaCombatOwnerHooks)!==operations.get(combat))throw Error('Native combat owner needs its privately issued aggregate hooks');}
/** A leaf may use only an already active exact source/birth exception. */
export function nativeCombatActorEntry(owner:object,actor:Actor,permission:NativeCombatPermission):boolean {const operation=leafOperations.get(owner);return operation?operation.acceptLeaf(owner,actor,permission):false;}
export class NativeAreaCombatOperation {
 readonly #owner:NativeAreaSceneCombat;readonly #birth:NativeAreaSceneBirthAdmission;
 readonly #records=new WeakMap<object,RecordReceipt>();readonly #prepared=new WeakMap<object,Preparation>();readonly #scopes=new WeakMap<object,Frame>();readonly #leaves=new Set<object>();
 #seatStorage:readonly Seat[];
 readonly #activations=new WeakMap<NativeCombatActivation,ActivationCapture>();
 readonly #carried:WeakMap<Actor,{seat:Seat;body:Actor}>;
 readonly #expiredSelections=new WeakMap<ActiveStatus[],{target:Actor;rows:Set<ActiveStatus>}>();
 readonly #actorScopes=new WeakMap<object,{frame:Frame;iteration:NativeStatusIteration}>();readonly #statusScopes=new WeakMap<object,Frame>();readonly #retirements=new WeakMap<object,{frame:Frame;bodies:readonly Actor[];used:boolean}>();
 readonly #castContinuations=new WeakMap<Frame,Map<Actor,Source>>();
 readonly #contexts=new WeakMap<object,{event:KillEvent;fields:PropertyDescriptorMap}>();
 readonly #statuses:WeakMap<ActiveStatus,Source|null>;readonly #birthSources=new WeakMap<Actor,Source>();readonly #hiddenSources=new WeakMap<Actor,Source>();readonly #observedSources=new WeakMap<Frame,Source[]>();
 readonly #observationHosts=new WeakSet<object>();
 #activated=false;
 #binding:NativeAreaAuthorityBinding<NativeAreaCombatServices>|null=null;
 constructor(key:symbol,owner:NativeAreaSceneCombat){
  if(key!==create||!isNativeAreaSceneCombat(owner)||operations.has(owner))throw Error('Native combat operation needs its unique actual aggregate');
  this.#owner=owner;const {assembly,authority}=owner.input;this.#seatStorage=ownData(owner.input.characterWriter,'seats') as readonly Seat[];rawRows<Seat>(this.#seatStorage);
  this.#birth=new NativeAreaSceneBirthAdmission({authority,scene:assembly.input.scene,population:assembly.input.population});
  let statuses=statusReceipts.get(authority);if(!statuses)statusReceipts.set(authority,statuses=new WeakMap());this.#statuses=statuses;
  let carried=carriedReceipts.get(authority);if(!carried)carriedReceipts.set(authority,carried=new WeakMap());this.#carried=carried;
  operations.set(owner,this);
 }
 /** Only a real executeSkill invocation owns the synchronous post-withdrawal tail. */
 withCastSource<T>(actor:Actor,action:()=>T):T {const frame=this.#active(),prior=castTop,event:CastEvent={operation:this,frame,actor,parent:prior,active:true};castTop=event;try{return action();}finally{event.active=false;castTop=prior;this.#castContinuations.delete(frame);}}
 /** Returned rule callbacks belong to their surrounding native kill event, not
  * the shorter killCtx lookup or any later operation that happens to be active. */
 withKillEvent<T>(action:()=>T):T {const frame=this.#active(),prior=killTop,event:KillEvent={operation:this,frame,active:true};killTop=event;try{return action();}finally{event.active=false;killTop=prior;}}
 combatEventCallback<K extends EventCallbackKind>(_kind:K,callback:ReturnType<World['killCtx']>[K]):ReturnType<World['killCtx']>[K] {
  const event=killTop,operation=this;this.#active();if(!event?.active||event.operation!==this)throw Error('Native kill callback needs its surrounding event');
  const check=()=>{let frame:Frame|null=operation.#active();if(killTop!==event||!event.active)throw Error('Expired or foreign native kill callback');while(frame&&frame!==event.frame)frame=frame.parent;if(frame!==event.frame||!event.frame.active)throw Error('Native kill callback escaped its event');};check();
  return function(this:unknown,...args:unknown[]){check();return Reflect.apply(callback as Function,this,args);} as ReturnType<World['killCtx']>[K];
 }
 createCombatKillContext(ctx:ReturnType<World['killCtx']>):ReturnType<World['killCtx']> {const event=killTop;this.#active();if(!event?.active||event.operation!==this||this.#contexts.has(ctx))throw Error('Native kill context needs its exact surrounding creation event');const fields=Object.getOwnPropertyDescriptors(ctx);for(const d of Object.values(fields))if(!Object.hasOwn(d,'value'))throw Error('Native kill context needs original ordinary fields');this.#contexts.set(ctx,{event,fields});return ctx;}
 assertCombatKillContext(ctx:ReturnType<World['killCtx']>):void {const receipt=this.#contexts.get(ctx);let frame:Frame|null=this.#active();if(!receipt||receipt.event!==killTop||!receipt.event.active)throw Error('Expired or foreign native kill context');while(frame&&frame!==receipt.event.frame)frame=frame.parent;if(!frame||!frame.active)throw Error('Native kill context escaped its event');const fields=Object.getOwnPropertyDescriptors(ctx);if(Reflect.ownKeys(fields).length!==Reflect.ownKeys(receipt.fields).length)throw Error('Native kill context fields changed');for(const key of Reflect.ownKeys(receipt.fields)){const current=Object.getOwnPropertyDescriptor(ctx,key),prior=receipt.fields[key as string];if(!current||!Object.hasOwn(current,'value')||current.value!==prior.value||current.writable!==prior.writable||current.enumerable!==prior.enumerable||current.configurable!==prior.configurable)throw Error('Native kill context selection changed');}}
 ownerEntry():NativeAreaCombatOwnerEntry {const entry:NativeAreaCombatOwnerEntry=(owner,subjects,action)=>{if(!this.#leaves.has(owner))throw Error('Foreign native combat owner entry');return this.enter(subjects,action);};entries.set(entry,this);return entry;}
 ownerHooks():NativeAreaCombatOwnerHooks {
  const check=(owner:object)=>{if(!this.#leaves.has(owner))throw Error('Foreign native combat hook owner');this.#active();};
  const hooks:NativeAreaCombatOwnerHooks=Object.freeze<NativeAreaCombatOwnerHooks>({
   createMonster:owner=>{check(owner);return this.createMonster;},
   selectCombatBirthOwner:(owner,parent,selected)=>{check(owner);return this.selectCombatBirthOwner(parent,selected);},
   assertCombatKillContext:(owner,ctx)=>{check(owner);this.assertCombatKillContext(ctx);},
   admitCombatBirth:(owner,body)=>{check(owner);this.admitCombatBirth(body);},
   constructCombatActor:(owner,create)=>{check(owner);return this.constructCombatActor(create);},
   withdrawCarried:(owner,seat,hero,body)=>{check(owner);const frame=this.#active();if(!this.#source(hero))throw Error('Native carried withdrawal needs its original physical hero receipt');this.#final(frame.binding,[body]);
    if(ownData(seat,'home')!==hero||ownData(seat,'actor')!==body)throw Error('Native carried withdrawal needs actual seat relation');const ride=ownData(body,'possession');if(!ride||typeof ride!=='object'||ownData(ride,'huskMode')!=='carried'||ownData(ride,'seatId')!==ownData(seat,'id'))throw Error('Native carried withdrawal needs actual possession');
    const actors=ownData(frame.binding.scene,'actors') as Actor[];for(let i=0;i<actors.length;i++)if(ownData(actors,i)===hero)throw Error('Native carried withdrawal must follow native removal');
    this.#owner.input.authority.release(frame.binding,[hero]);this.#carried.set(hero,{seat,body});
    for(let event=castTop;event?.active&&event.operation===this;event=event.parent){if(event.actor!==hero)continue;let ancestor:Frame|null=frame;while(ancestor&&ancestor!==event.frame)ancestor=ancestor.parent;if(!ancestor||!event.frame.active)throw Error('Native carried continuation escaped its originating cast');const selected=Reflect.apply(select,this.#owner.input.authority,[[hero],true]);if(selected.length!==1||selected[0].physical!==body||selected[0].binding!==frame.binding)throw Error('Native carried continuation needs its actual withdrawn body');Reflect.apply(finalSelections,this.#owner.input.authority,[selected]);Reflect.apply(unclaimed,this.#owner.input.authority,[hero]);const continuations=this.#castContinuations.get(event.frame)??new Map<Actor,Source>();continuations.set(hero,{actor:hero,instance:undefined,origin:frame.binding,detached:false,carried:selected[0],continuation:event.frame});this.#castContinuations.set(event.frame,continuations);break;}
   },
   restoreCarried:(owner,seat,hero,body)=>{check(owner);const frame=this.#active(),receipt=this.#carried.get(hero);if(!receipt||receipt.seat!==seat||receipt.body!==body||ownData(seat,'actor')!==hero||ownData(seat,'home')!==undefined)throw Error('Native carried restoration needs exact withdrawal receipt and native seat swap');
    // The one just-inserted hero is deliberately not yet admitted; validate its
    // actual body and binding without accepting an arbitrary census sweep.
    const authority=this.#owner.input.authority;Reflect.apply(NativeAreaActorAuthority.prototype.claimInserted,authority,[frame.binding,hero,[body]]);this.#carried.delete(hero);this.#owner.noteActorInsertion(hero);
   },
  });ownerHooks.set(hooks,this);return hooks;
 }
 bind(binding:NativeAreaAuthorityBinding<NativeAreaCombatServices>,leaves:readonly object[]):void {
  if(this.#binding)throw Error('Native combat operation already registered');
  if(binding.scene!==this.#owner.input.assembly.input.scene||binding.services.combat!==this.#owner)throw Error('Native combat operation needs exact registered aggregate');
  for(const leaf of leaves)if(leafOperations.has(leaf))throw Error('Native combat owner already has an operation binding');
  this.#binding=binding;for(const leaf of leaves){this.#leaves.add(leaf);leafOperations.set(leaf,this);}

 }
 /** Select the one actual admission cohort before claims or routing writes.
  * A token is restoration provenance only: it grants no combat/source authority. */
 prepareActivation(cohort:readonly Actor[]):NativeCombatActivation {
  const {assembly,authority,characterWriter}=this.#owner.input,census=ownData(assembly.input.scene,'actors') as Actor[],bodies=rawRows<Actor>(cohort),physical=rawRows<Actor>(census);
  if(bodies.length!==physical.length||bodies.some((body,i)=>body!==physical[i])||new Set(bodies).size!==bodies.length)throw Error('Native activation needs its exact physical census');
  const before=Object.getOwnPropertyDescriptor(characterWriter,'seats');if(!before)throw Error('Native activation needs its actual writer seats');
  // Capture ordinary live seat fields before the one campaign getter whenever
  // the writer has its native data slot. An accessor must return the exact
  // previously captured writer array; it cannot substitute a new roster.
  const expectedSeats=Object.hasOwn(before,'value')?before.value:this.#seatStorage,prior=activationSeats(expectedSeats);
  const bodyRides=bodies.map(body=>{const ride=ownData(body,'possession') as object|undefined;return {body,ride,mode:ride&&ownData(ride,'huskMode'),seatId:ride&&ownData(ride,'seatId')};});
  const seats=authority.campaign.seats,selected=prior,writerSeats=Object.getOwnPropertyDescriptor(characterWriter,'seats');
  if(seats!==expectedSeats||!writerSeats||before.value!==writerSeats.value||before.get!==writerSeats.get||before.set!==writerSeats.set||(Object.hasOwn(writerSeats,'value')&&writerSeats.value!==seats))throw Error('Native activation writer seat selection changed');
  for(const row of bodyRides)if(ownData(row.body,'possession')!==row.ride||(row.ride&&(ownData(row.ride,'huskMode')!==row.mode||ownData(row.ride,'seatId')!==row.seatId)))throw Error('Native activation carried body changed during selection');
  const relayBodies=new Set(bodies);for(const row of selected)if(bodies.includes(row.body)&&row.home&&row.home!==row.body&&row.mode==='carried')relayBodies.add(row.home);
  const token=Object.freeze({relayBodies:Object.freeze([...relayBodies])}) as NativeCombatActivation;
  this.#activations.set(token,{census,cohort:Object.freeze(bodies),seats,selected,writerSeats,initial:!this.#activated,used:false});return token;
 }
 /** No getters, iterators or caller-selected methods run at this last check. */
 assertActivation(token:NativeCombatActivation,cohort:readonly Actor[]):void {
  const capture=this.#activations.get(token);if(!capture||capture.used||capture.initial===this.#activated)throw Error('Expired or foreign native activation receipt');
  const {assembly,authority,characterWriter}=this.#owner.input,physical=rawRows<Actor>(ownData(assembly.input.scene,'actors')),requested=rawRows<Actor>(cohort),seats=rawRows<Seat>(capture.seats),slot=Object.getOwnPropertyDescriptor(characterWriter,'seats');
  if(ownData(assembly.input.scene,'actors')!==capture.census||physical.length!==capture.cohort.length||requested.length!==physical.length||physical.some((body,i)=>body!==capture.cohort[i]||requested[i]!==body))throw Error('Native activation census selection changed');
  if(!slot||slot.value!==capture.writerSeats.value||slot.get!==capture.writerSeats.get||slot.set!==capture.writerSeats.set||(Object.hasOwn(slot,'value')&&slot.value!==capture.seats)||seats.length!==capture.selected.length)throw Error('Native activation seat storage changed');
  const homes=new Set<Actor>();for(let i=0;i<capture.selected.length;i++){const row=capture.selected[i];if(seats[i]!==row.seat||ownData(row.seat,'actor')!==row.body||ownData(row.seat,'home')!==row.home||ownData(row.seat,'id')!==row.id||ownData(row.body,'possession')!==row.ride||(row.ride&&(ownData(row.ride,'huskMode')!==row.mode||ownData(row.ride,'seatId')!==row.seatId)))throw Error('Stale native activation seat selection');
   if(!row.home||row.home===row.body||row.mode!=='carried')continue;
   if(homes.has(row.home))throw Error('Ambiguous native carried bootstrap');homes.add(row.home);
   if(!physical.includes(row.body))continue;
   if(row.seatId!==row.id||row.homeSeatId!==row.id||ownData(row.home,'vacated')!==row.vacancy||!row.vacancy||ownData(row.vacancy,'seatId')!==row.homeSeatId||physical.includes(row.home))throw Error('Stale native carried bootstrap');Reflect.apply(unclaimed,authority,[row.home]);
   const prior=this.#carried.get(row.home);if(prior?(prior.seat!==row.seat||prior.body!==row.body):!capture.initial)throw Error('Native carried bootstrap conflicts with its original receipt');
  }
 }
 activate(host:object,cohort:readonly Actor[],token:NativeCombatActivation):readonly Actor[] {this.assertActivation(token,cohort);const capture=this.#activations.get(token)!,binding=this.#binding;if(!binding||Reflect.apply(bindingForActivation,this.#owner.input.authority,[this.#owner.input.assembly.input.scene])!==binding||binding.services.combat!==this.#owner)throw Error('Native activation needs its exact registered aggregate');this.#final(binding,capture.cohort);this.assertActivation(token,cohort);capture.used=true;this.#seatStorage=capture.seats;if(this.#activated)return capture.cohort;

  // Only concrete factory attestations on the explicit admitted cohort establish
  // initial relationships. An arbitrary owner field never creates a receipt.
  for(const body of capture.cohort){const receipt=Reflect.apply(NativeAreaScenePopulation.prototype.factoryOwnerOf,this.#owner.input.assembly.input.population,[body]);if(receipt?.owner&&ownData(body,'owner')===receipt.owner){this.#final(binding,[receipt.owner]);this.#birthSources.set(body,{actor:receipt.owner,instance:undefined,origin:binding,detached:true});}}
  for(const leaf of [this.#owner.harborServices,this.#owner.surfaceArrival,this.#owner.siteBirths,this.#owner.historyArrival,this.#owner.odyssey,this.#owner.tethers,this.#owner.restoration,this.#owner.displacement,this.#owner.projectiles,this.#owner.groundFollowUps,this.#owner.killAftermath,this.#owner.input.progression,this.#owner.input.assembly.puzzleController,this.#owner.input.assembly.input.ecology,this.#owner.input.assembly.input.bounty,this.#owner.input.assembly.input.descent,this.#owner.input.assembly.input.registry.input.birth,this.#owner.input.assembly.input.theater,this.#owner.input.assembly.input.registry.input.titans])this.bindObservationHost(leaf.host);
  this.bindObservationHost(host);
  for(const row of capture.selected)if(capture.cohort.includes(row.body)&&row.home&&row.home!==row.body&&row.mode==='carried'&&!this.#carried.has(row.home))this.#carried.set(row.home,{seat:row.seat,body:row.body});
  this.#activated=true;return capture.cohort;
 }
 private bindObservationHost(host:object):void {
  const arrival=NativeAreaSceneTransitionCoordinator.prototype.delayedArrivalBody;
  const observer:NativeCombatRecordObserver={delverArrival:()=>{this.#active();if(host!==this.#owner.input.assembly.input.descent.host)throw Error('Native Delver continuation needs its exact descent host');Reflect.apply(arrival,this.#owner.input.coordinator,[this.#owner,'delver']);return ownData(this.#owner.input.assembly.input.scene,'zone') as import('../data/zones').ZoneDef;},isPresentActor:actor=>Reflect.apply(presentActor,this.#owner.input.authority,[this.#owner.input.assembly.input.scene,actor]),selected:(kind,record,action)=>this.withCombatRecord(kind,record,action),isPresentPlayer:()=>Reflect.apply(presentPlayer,this.#owner.input.authority,[this.#owner.input.assembly.input.scene]),prepareRetirement:selected=>this.prepareCombatRetirement(selected),finishRetirement:token=>this.finishCombatRetirement(token),cancelRetirement:token=>this.cancelCombatRetirement(token),status:(target,action)=>this.withCombatStatusSource(target,undefined,undefined,action),statusSource:source=>this.selectCombatStatusSource(source),reassign:(kind,record,source,via)=>this.reassignCombatRecordSource(kind,record,source,via),reassignInstance:(kind,record,instance)=>this.reassignCombatRecordInstance(kind,record,instance),factory:()=>this.createMonster,admit:body=>this.admitCombatBirth(body),storage:(kind,storage)=>{this.#active();return this.captureRecordStorage(kind,storage);},issued:(kind,storage,row,source,inst)=>this.issueCombatRecord(kind,storage,row,source,inst),hidden:create=>{
   const frame=this.#active(),born=captureNativeActorConstruction(create);if(nativeBirthAsyncResult(born.value))throw Error('Native hidden source requires synchronous construction');if(!born.created.has(born.value))throw Error('Native hidden source needs actual exact constructor identity');Reflect.apply(unclaimed,this.#owner.input.authority,[born.value]);
   this.#hiddenSources.set(born.value,{actor:born.value,instance:undefined,origin:frame.binding,detached:true});return born.value;
  },source:actor=>{if(actor==null)return actor;const frame=this.#active();let receipt=this.#hiddenSources.get(actor);if(!receipt){const creationHost=nativeHiddenSourceCreationHost(actor);if(!creationHost||!this.#observationHosts.has(creationHost))throw Error('Native hidden source needs this actual area constructor receipt');Reflect.apply(unclaimed,this.#owner.input.authority,[actor]);receipt={actor,instance:undefined,origin:frame.binding,detached:true};this.#hiddenSources.set(actor,receipt);}if(receipt.origin!==frame.binding)throw Error('Native hidden source belongs to another area');Reflect.apply(unclaimed,this.#owner.input.authority,[actor]);const sources=this.#observedSources.get(frame)??[];if(!sources.some(row=>row.actor===actor))sources.push(receipt);this.#observedSources.set(frame,sources);return actor;}};
  const token=Object.freeze({});recordRegistrations.set(token,{host,observer});bindNativeCombatRecordObservation(token);this.#observationHosts.add(host);
 }
 #registered():NativeAreaAuthorityBinding<NativeAreaCombatServices>{const {authority,assembly}=this.#owner.input,binding=this.#binding;if(!binding||Reflect.apply(bindingForActivation,authority,[assembly.input.scene])!==binding||binding.services.combat!==this.#owner)throw Error('Native combat needs its exact registered aggregate');return binding;}
 #active():Frame {const frame=top;if(!frame?.active||frame.operation!==this||frame.binding!==this.#registered())throw Error('Expired or nested native combat operation');return frame;}
 #native<T>(frame:Frame,action:()=>T):T{const prior=top;top=frame;try{const result=action();if(nativeBirthAsyncResult(result))throw Error('Native combat requires a synchronous operation');return result;}finally{frame.active=false;top=prior;}}
 #source(actor:Actor):Source|undefined {
  // An inherited casting receipt cannot bypass the newer exact withdrawal relation.
  for(let frame=top;frame?.active&&frame.operation===this;frame=frame.parent){const source=this.#castContinuations.get(frame)?.get(actor);if(source)return source;}
  for(let frame=top;frame?.active&&frame.operation===this;frame=frame.parent){const source=frame.sources.find(source=>source.actor===actor)??this.#observedSources.get(frame)?.find(source=>source.actor===actor);if(source)return source;}return undefined;
 }
 #final(binding:NativeAreaAuthorityBinding<NativeAreaCombatServices>,actors:readonly Actor[]=[]):void{Reflect.apply(final,this.#owner.input.authority,[binding,actors]);}
 #checkCastContinuation(source:Source):void {if(!source.continuation?.active||!source.carried)throw Error('Expired native carried cast source');Reflect.apply(finalSelections,this.#owner.input.authority,[[source.carried]]);Reflect.apply(unclaimed,this.#owner.input.authority,[source.actor]);}
 #capture(source:Actor|null|undefined,instance:SkillInstance|null|undefined):Source|null {if(!source)return null;const frame=this.#active(),prior=this.#source(source);if(prior?.continuation){this.#checkCastContinuation(prior);return {actor:prior.actor,instance:instance??prior.instance,origin:prior.origin,detached:true};}if(prior)return {...prior,instance:instance??prior.instance,detached:true};this.#final(frame.binding,[source]);return {actor:source,instance,origin:frame.binding,detached:true};}
 #restoredCompanion:{body:Actor;frame:Frame}|null=null;
 isRestoredCompanionPending(token:NativeCharacterResumeReceipt,body:Actor):boolean {const r=assertNativeCharacterResume(token,'fields');if(r.area?.combat!==this.#owner)throw Error('Saved companion belongs to another area');this.#active();return this.#birth.isPending(body);}
 withRestoredCompanion<T>(token:NativeCharacterResumeReceipt,keeper:Actor,body:Actor,action:()=>T):T {const frame=this.#active();if(!this.isRestoredCompanionPending(token,body)||this.#restoredCompanion)throw Error('Saved companion needs its exact new body');this.#final(frame.binding,[keeper]);const before=this.#restoredCompanion;this.#restoredCompanion={body,frame};try{return action();}finally{this.#restoredCompanion=before;}}
 enter<T>(subjects:NativeCombatSubjects,action:()=>T):T {
  if(!this.#activated)throw Error('Native combat needs completed physical activation');const binding=this.#registered(),authority=this.#owner.input.authority,physical=[...(subjects.physical??[])],sources:Source[]=top?.active&&top.operation===this?top.sources.filter(source=>source.detached):[];
  for(const actor of subjects.sources??[]){const prior=this.#source(actor);if(prior?.continuation&&subjects.permission!=='physical'&&subjects.permission!=='prepare'){this.#checkCastContinuation(prior);sources.push(prior);}else if(prior?.detached&&subjects.permission!=='physical'&&subjects.permission!=='prepare')sources.push(prior);else physical.push(actor);}
  const physicalSelection=Reflect.apply(select,authority,[physical,false]);const carriedSelection=Reflect.apply(select,authority,[subjects.carried??[],true]);
  for(const selection of [...physicalSelection,...carriedSelection]){if(selection.binding!==binding)throw Error('Native combat needs actual local subject authority');sources.push({actor:selection.actor,instance:undefined,origin:binding,detached:false,carried:selection.actor!==selection.physical?selection:undefined});}
  Reflect.apply(finalSelections,authority,[physicalSelection]);Reflect.apply(finalSelections,authority,[carriedSelection]);for(const source of sources){const current=this.#source(source.actor)??source;if(current.continuation){this.#checkCastContinuation(current);}}this.#final(binding);
  const frame:Frame={operation:this,parent:top,sources,binding,active:true};return this.#native(frame,()=>this.#birth.runFinal(action));
 }
 acceptLeaf(owner:object,actor:Actor,permission:NativeCombatPermission):boolean {if(!this.#leaves.has(owner))return false;const frame=this.#active();this.#final(frame.binding);if(permission==='prepare'&&this.#birth.isPending(actor))return true;if(owner===this.#owner.input.progression&&permission==='stats'&&this.#restoredCompanion?.body===actor&&this.#restoredCompanion.frame===frame&&this.#birth.isPending(actor))return true;const source=this.#source(actor);if(source?.carried&&permission!=='physical'&&permission!=='prepare'){if(source.continuation)this.#checkCastContinuation(source);else Reflect.apply(finalSelections,this.#owner.input.authority,[[source.carried]]);return true;}if(source?.detached&&permission!=='physical'&&permission!=='prepare')return true;if(owner===this.#owner.input.progression&&permission==='stats'){const selected=Reflect.apply(select,this.#owner.input.authority,[[actor],true]);if(selected.length!==1||selected[0].binding!==frame.binding)throw Error('Native progression stats need their actual local physical or carried body');Reflect.apply(finalSelections,this.#owner.input.authority,[selected]);return true;}this.#final(frame.binding,[actor]);return true;}
 get createMonster():NativeAreaSceneBirthAdmission['createMonster']{this.#active();const frame=top,fn=this.#birth.createMonster,birth=this.#birth;return(...args)=>{if(top!==frame)throw Error('Expired or nested native combat factory');this.#active();return Reflect.apply(fn,birth,args);};}
 constructCombatActor(create:()=>Actor):Actor {this.#active();return this.#birth.constructActor(create);}
 admitCombatBirth(body:Actor):void {this.#active();this.#birth.admitInserted(body);this.#owner.noteActorInsertion(body);const owner=ownData(body,'owner');if(owner&&typeof owner==='object'){const source=this.#source(owner as Actor);if(source)this.#birthSources.set(body,{...source,detached:true});}}
 /** Successful native post-assignment attestation for taming an actual body. */
 assignCombatBirthOwner(body:Actor,owner:Actor):void {const frame=this.#active();if(this.#restoredCompanion?.body===body&&this.#restoredCompanion.frame===frame){if(!this.#birth.isPending(body))throw Error('Saved companion creation expired');this.#final(frame.binding,[owner]);}else this.#final(frame.binding,[body]);if(ownData(body,'owner')!==owner)throw Error('Native owner assignment needs its exact completed write');const source=this.#capture(owner,undefined);if(!source)throw Error('Native owner assignment needs an actual source');this.#birthSources.set(body,source);}
 selectCombatBirthOwner(parent:Actor,owner:Actor|undefined):Actor|undefined {const frame=this.#active();if(owner===undefined)return owner;this.#final(frame.binding,[parent]);const source=this.#birthSources.get(parent);if(!source||source.actor!==owner||ownData(parent,'owner')!==owner)throw Error('Native owner selection needs its exact issued birth relation');const observed=this.#observedSources.get(frame)??[];if(!observed.some(row=>row.actor===owner))observed.push(source);this.#observedSources.set(frame,observed);return owner;}
 /** A successful original splice retires only that exact formerly owned body. */
 retireCombatBody(body:Actor):void {const frame=this.#active();this.#final(frame.binding);const census=ownData(frame.binding.scene,'actors') as Actor[];for(let i=0;i<census.length;i++)if(ownData(census,i)===body)throw Error('Native retirement must follow actual body removal');Reflect.apply(NativeAreaActorAuthority.prototype.release,this.#owner.input.authority,[frame.binding,[body]]);this.#owner.noteActorInsertion(body);}
 /** Validate a replacement without consuming its raw storage identity. */
 checkRecordStorage(kind:Exclude<NativeCombatRecordKind,'casting'|'push'>,storage:unknown):void {if(!Array.isArray(storage))throw Error('Native combat needs an actual raw record queue');const prior=storageOwners.get(storage);if(prior&&(prior.operation!==this||prior.kind!==kind))throw Error('Native combat record storage already belongs to another owner or slot');}
 /** Called by the private live host at native queue selection, never a census scan. */
 captureRecordStorage<K extends Exclude<NativeCombatRecordKind,'casting'|'push'>>(kind:K,storage:NativeCombatRecordTypes[K]['storage']):NativeCombatRecordTypes[K]['storage'] {
  this.checkRecordStorage(kind,storage);if(!storageOwners.has(storage))storageOwners.set(storage,{operation:this,kind});return storage;
 }
 #storage(kind:NativeCombatRecordKind,storage:object,record:object):void {if(kind==='casting'||kind==='push'){this.#final(this.#active().binding,[storage as Actor]);if(ownData(storage,kind)!==record)throw Error('Native cast receipt needs the exact successful actor assignment');return;}const prior=storageOwners.get(storage);if(prior?.operation!==this||prior.kind!==kind)throw Error('Native combat record needs its exact selected raw storage');}
 issueCombatRecord<K extends NativeCombatRecordKind>(kind:K,storage:NativeCombatRecordTypes[K]['storage'],record:NativeCombatRecordTypes[K]['record'],source:Actor|null|undefined,instance:SkillInstance|null|undefined):void {
  this.#active();this.#storage(kind,storage,record);if(this.#records.has(record))throw Error('Native combat record was already issued');const receipt=this.#capture(source,instance);this.#records.set(record,{kind,storage,owner:this,source:receipt});
 }
 prepareCombatRecord<K extends NativeCombatRecordKind>(kind:K,record:NativeCombatRecordTypes[K]['record'],sourceKey:'caster'|'owner'|'mine',instanceKey?:'inst'):NativeCombatRecordPreparation {
  const frame=this.#active(),source=ownData(record,sourceKey) as Actor|null|undefined,instance=instanceKey?ownData(record,instanceKey) as SkillInstance|undefined:undefined;
  const token=Object.freeze({}) as NativeCombatRecordPreparation;this.#prepared.set(token,{frame,kind,record,source:this.#capture(source,instance),used:false});return token;
 }
 issuePreparedCombatRecord<K extends NativeCombatRecordKind>(kind:K,storage:NativeCombatRecordTypes[K]['storage'],record:NativeCombatRecordTypes[K]['record'],preparation:NativeCombatRecordPreparation):void {
  const frame=this.#active(),pending=this.#prepared.get(preparation);if(!pending||pending.used||pending.frame!==frame||pending.kind!==kind||pending.record!==record)throw Error('Expired or foreign native record preparation');this.#storage(kind,storage,record);if(this.#records.has(record))throw Error('Native combat record was already issued');pending.used=true;this.#records.set(record,{kind,storage,owner:this,source:pending.source});
 }
 reassignCombatRecordSource(kind:NativeCombatRecordKind,record:object,source:Actor,via?:Actor):void {
  const frame=this.#active(),receipt=this.#records.get(record);if(!receipt||receipt.owner!==this||receipt.kind!==kind)throw Error('Native source reassignment needs its exact local record');let captured:Source|null;
  if(via){this.#final(frame.binding,[via]);const birth=this.#birthSources.get(via);captured=birth?.actor===source?{...birth,instance:receipt.source?.instance,detached:true}:this.#capture(source,receipt.source?.instance);}
  else captured=this.#capture(source,receipt.source?.instance);this.#records.set(record,{...receipt,source:captured});
 }

 reassignCombatRecordInstance(kind:NativeCombatRecordKind,record:object,instance:SkillInstance):void {this.#active();const receipt=this.#records.get(record);if(!receipt||receipt.owner!==this||receipt.kind!==kind||!receipt.source)throw Error('Native instance reassignment needs its exact attributed local record');if(ownData(record,'inst')!==instance)throw Error('Native instance reassignment must follow its exact successful write');this.#records.set(record,{...receipt,source:{...receipt.source,instance}});}
 /** Non-granting check for private native helper/callback selection. */
 assertActiveScope():void {this.#active();}
 constructCombatSource(create:()=>Actor):Actor {const frame=this.#active(),born=captureNativeActorConstruction(create);if(nativeBirthAsyncResult(born.value))throw Error('Native contextual source requires synchronous construction');if(!born.created.has(born.value))throw Error('Native contextual source needs its actual constructor receipt');Reflect.apply(unclaimed,this.#owner.input.authority,[born.value]);const receipt:Source={actor:born.value,instance:undefined,origin:frame.binding,detached:true};this.#hiddenSources.set(born.value,receipt);const sources=this.#observedSources.get(frame)??[];sources.push(receipt);this.#observedSources.set(frame,sources);return born.value;}
 beginCombatActor(actor:Actor,allowCarried=false):NativeCombatActorScope {const parent=this.#active();let carried:NativeAreaActorSelection<NativeAreaCombatServices>|undefined;if(allowCarried){const selected=Reflect.apply(select,this.#owner.input.authority,[[actor],true]);if(selected.length!==1||selected[0].binding!==parent.binding)throw Error('Native actor step needs this area physical or carried body');Reflect.apply(finalSelections,this.#owner.input.authority,[selected]);if(selected[0].actor!==selected[0].physical)carried=selected[0];}else this.#final(parent.binding,[actor]);const source:Source={actor,instance:undefined,origin:parent.binding,detached:false,carried},frame:Frame={operation:this,parent,sources:[source,...parent.sources.filter(row=>row.actor!==actor)],binding:parent.binding,active:true};const token=Object.freeze({}) as NativeCombatActorScope;top=frame;const iteration=beginNativeStatusIteration(actor,{begin:(target,status)=>this.beginCombatStatus(target,status),end:scope=>this.endCombatStatus(scope as NativeCombatStatusScope)});this.#actorScopes.set(token,{frame,iteration});return token;}
 endCombatActor(scope:NativeCombatActorScope):void {const receipt=this.#actorScopes.get(scope);if(!receipt?.frame.active||receipt.frame!==top)throw Error('Expired or nested native actor step');endNativeStatusIteration(receipt.iteration);receipt.frame.active=false;top=receipt.frame.parent;this.#actorScopes.delete(scope);}
 beginCombatStatus(target:Actor,status:ActiveStatus):NativeCombatStatusScope {const parent=this.#active();this.#final(parent.binding,[target]);const phase=assertNativeStatusSelection(target,status);if(phase==='expired'){const array=ownData(target,'expiredStatuses') as ActiveStatus[];let selected=this.#expiredSelections.get(array);if(selected&&selected.target!==target)throw Error('Native expired status storage belongs to another target');if(!selected)this.#expiredSelections.set(array,selected={target,rows:new Set()});selected.rows.add(status);}if(!this.#statuses.has(status))this.#statuses.set(status,null);const source=this.#statuses.get(status),frame:Frame={operation:this,parent,sources:source?[source,...parent.sources.filter(row=>row.actor!==source.actor)]:parent.sources,binding:parent.binding,active:true};const token=Object.freeze({}) as NativeCombatStatusScope;this.#statusScopes.set(token,frame);top=frame;return token;}
 finishCombatExpiredStatuses(target:Actor,array:ActiveStatus[]):void {const frame=this.#active();this.#final(frame.binding,[target]);if(ownData(target,'expiredStatuses')!==array||ownData(array,'length')!==0)throw Error('Native expired status cleanup needs its successful original clear');const selected=this.#expiredSelections.get(array);if(selected&&selected.target!==target)throw Error('Native expired status cleanup has a foreign target');if(selected){for(const row of selected.rows)retireNativeExpiredStatus(target,row);this.#expiredSelections.delete(array);}}
 endCombatStatus(scope:NativeCombatStatusScope):void {const frame=this.#statusScopes.get(scope);if(!frame?.active||frame!==top)throw Error('Expired or nested native status selection');frame.active=false;top=frame.parent;this.#statusScopes.delete(scope);}
 /** The selected native RHS array is captured before its original filter call.
  * Only successful assignment allows release; failure preserves earlier native writes. */
 prepareCombatRetirement(selectedRawActors:Actor[]):NativeCombatRetirement {const frame=this.#active();this.#final(frame.binding);if(ownData(frame.binding.scene,'actors')!==selectedRawActors)throw Error('Native retirement needs its exact original raw census');const bodies:Actor[]=[];for(let i=0;i<selectedRawActors.length;i++){const body=ownData(selectedRawActors,i);if(!body||typeof body!=='object')throw Error('Native retirement needs ordinary physical bodies');bodies.push(body as Actor);}const token=Object.freeze({}) as NativeCombatRetirement;this.#retirements.set(token,{frame,bodies:Object.freeze(bodies),used:false});return token;}
 finishCombatRetirement(token:NativeCombatRetirement):void {const frame=this.#active(),receipt=this.#retirements.get(token);if(!receipt||receipt.used||receipt.frame!==frame)throw Error('Expired or nested native census retirement');this.#final(frame.binding);const census=ownData(frame.binding.scene,'actors');if(!Array.isArray(census))throw Error('Native retirement needs its successful raw census assignment');const live=new Set<Actor>();for(let i=0;i<census.length;i++)live.add(ownData(census,i) as Actor);const removed=receipt.bodies.filter(body=>!live.has(body));Reflect.apply(NativeAreaActorAuthority.prototype.release,this.#owner.input.authority,[frame.binding,removed]);receipt.used=true;for(const actor of removed)this.#owner.noteActorInsertion(actor);}
 cancelCombatRetirement(token:NativeCombatRetirement):void {const receipt=this.#retirements.get(token);if(!receipt||receipt.frame!==this.#active())throw Error('Expired or nested native census retirement');this.#retirements.delete(token);}
 /** A helper may consume only the actual row selected by its native caller.
  * A nested row of the same kind shadows an outer selection. */
 assertSelectedCombatRecord(kind:NativeCombatRecordKind,record:object):void {let frame:Frame|null=this.#active();const receipt=this.#records.get(record);if(!receipt||receipt.owner!==this||receipt.kind!==kind)throw Error('Native combat helper needs its exact issued record');for(;frame?.active&&frame.operation===this;frame=frame.parent)if(frame.selected?.kind===kind){if(frame.selected.record!==record)throw Error('Native combat helper borrowed a different selected record');return;}throw Error('Native combat helper needs an active native record selection');}
 /** Cancel only commands actually issued for the departing actor. The raw
  * row cannot counterfeit its owner or execute a getter during departure. */
 discardPendingMetaCommands(actor:Actor):void {
  const frame=this.#active();this.#final(frame.binding,[actor]);const state=this.#owner.runtimeState,storage=state.pendingMetas;this.checkRecordStorage('pendingMetas',storage);
  const kept:typeof storage=[];const length=ownData(storage,'length') as number;
  for(let i=0;i<length;i++){
   const row=ownData(storage,i) as typeof storage[number],receipt=row&&this.#records.get(row),source=receipt?.source;
   if(!receipt||receipt.owner!==this||receipt.kind!=='pendingMetas'||!source||ownData(row,'caster')!==source.actor||ownData(row,'host')!==source.instance)throw Error('Native meta departure needs its exact issued command');
   if(source.actor!==actor)kept[kept.length]=row;
  }
  this.#final(frame.binding,[actor]);if(kept.length!==length){this.checkRecordStorage('pendingMetas',kept);state.pendingMetas=kept;this.captureRecordStorage('pendingMetas',kept);}
 }
 beginCombatRecord(kind:NativeCombatRecordKind,record:object):NativeCombatRecordScope {
  const parent=this.#active(),receipt=this.#records.get(record);if(!receipt||receipt.owner!==this||receipt.kind!==kind)throw Error('Native combat record selection needs its nominal local issuance');this.#final(parent.binding);
  if(kind==='pendingMetas'){
   const source=receipt.source;if(!source||ownData(record,'caster')!==source.actor||ownData(record,'host')!==source.instance)throw Error('Native pending meta needs its exact issued caster and host');
   // A queued input command belongs to its still-local controlled body. Dead
   // sources retain the original early removal; carried local homes use only
   // their genuine live seat/body relationship, never remote effect authority.
   if(!ownData(source.actor,'dead')){const selected=Reflect.apply(select,this.#owner.input.authority,[[source.actor],true]);if(selected.length!==1||selected[0].binding!==parent.binding)throw Error('Native pending meta command left its physical area');Reflect.apply(finalSelections,this.#owner.input.authority,[selected]);}
   if(ownData(record,'caster')!==source.actor||ownData(record,'host')!==source.instance)throw Error('Native pending meta changed during source validation');
  }
  const sources=receipt.source?[receipt.source,...parent.sources.filter(source=>source.actor!==receipt.source!.actor)]:parent.sources;const frame:Frame={operation:this,parent,sources,selected:Object.freeze({kind,record}),binding:parent.binding,active:true};const token=Object.freeze({}) as NativeCombatRecordScope;this.#scopes.set(token,frame);top=frame;return token;
 }
 endCombatRecord(scope:NativeCombatRecordScope):void {const frame=this.#scopes.get(scope);if(!frame?.active||frame!==top||frame.operation!==this)throw Error('Expired or nested native record scope');frame.active=false;top=frame.parent;this.#scopes.delete(scope);}
 withCombatRecord<T>(kind:NativeCombatRecordKind,record:object,action:()=>T):T {const scope=this.beginCombatRecord(kind,record);try{const result=action();if(nativeBirthAsyncResult(result))throw Error('Native combat record requires synchronous execution');return result;}finally{this.endCombatRecord(scope);}}
 #statusTarget(target:Actor):void {const frame=this.#active();if(this.#birth.isPending(target))return;this.#final(frame.binding,[target]);}
 #status<T>(target:Actor,source:Source|null,instance:SkillInstance|null|undefined,action:()=>T):T {
  const frame=this.#active();this.#statusTarget(target);const prior=statusTop,current:StatusFrame={operation:this,frame,target,source,instance,active:true};statusTop=current;
  const selected=()=>{if(statusTop!==current||!current.active||top!==frame)throw Error('Expired or nested native status source');this.#statusTarget(target);return current.source;};
  const observer:NativeStatusProvenanceObserver={created:(actor,status)=>{const receipt=selected();if(actor!==target)throw Error('Foreign native status target');this.#statuses.set(status,ownData(status,'casterId')===undefined?null:receipt);},attributed:(actor,status)=>{const receipt=selected();if(actor!==target)throw Error('Foreign native status target');this.#statuses.set(status,receipt);},relay:(next,owner,call)=>this.withCombatStatusSource(next,owner,undefined,call)};
  try{return withNativeStatusProvenance(target,observer,action);}finally{current.active=false;statusTop=prior;}
 }
 withCombatStatusSource<T>(target:Actor,source:Actor|null|undefined,instance:SkillInstance|null|undefined,action:()=>T):T {return this.#status(target,this.#capture(source,instance),instance,action);}
 selectCombatStatusSource(source:Actor):Actor {const frame=statusTop;if(!frame?.active||frame.operation!==this||frame.frame!==this.#active())throw Error('Native status selection needs its exact source scope');frame.source=this.#capture(source,frame.instance);return source;}
 withCombatInheritedStatus<T>(target:Actor,status:ActiveStatus,action:()=>T):T {const frame=this.#active(),origin=nativeStatusOrigin(status);if(!origin)throw Error('Native inherited status needs its exact creation receipt');this.#final(frame.binding,[origin]);assertNativeStatusSelection(origin,status);return this.#status(target,this.#statuses.get(status)??null,undefined,action);}
 prepareBirth<T>(body:Actor,action:()=>T):T{const frame=this.#active();if(!this.#birth.isPending(body))throw Error('Native combat preparation needs its exact pending birth');const next:Frame={operation:this,parent:frame,sources:frame.sources,binding:frame.binding,active:true};return this.#native(next,action);}
}
export function createNativeAreaCombatOperation(owner:NativeAreaSceneCombat):NativeAreaCombatOperation{return new NativeAreaCombatOperation(create,owner);}

/** Non-granting terminal-lifecycle preflight. Retirement never interrupts a native operation. */
export function assertNativeCombatOperationsIdle():void {if(top)throw Error('Native combat operation is active');}
