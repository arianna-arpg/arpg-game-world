/** One exact saved-character hydration. Tokens never grant general actor or factory authority. */
import {isNativeWorld,type World,type Seat} from '../engine/world';
import {CLASSES,type ClassDef} from '../data/classes';
import {bindCharacterResumePages,characterResumeAuthority,type CharacterSave} from '../meta/character';
import type {CharacterResume} from '../meta/characterResume';
import type {ResumeSpawn} from '../meta/worldstate';
import {sceneMakePlayerSeat} from '../engine/nativeCharacterCreation';
import {readNativeRetainedSave,type NativeRetainedResumeRecord} from './nativeRetainedSave';
import {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';
import {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import {isNativeAreaScenePreparation,type NativeAreaScenePreparation} from './nativeAreaScenePreparation';
import {NativeAreaCharacterCreation} from './nativeAreaCharacterCreation';
import type {NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';
import {NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {NativeAreaSceneProgression} from './nativeAreaSceneProgression';
import {NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
import type {Actor} from '../engine/actor';
import {canonical,freezeData} from './random';
type Stage='shell'|'fields'|'seat'|'graph'|'arrival';
declare const restoreReceipt:unique symbol;
export interface NativeCharacterResumeReceipt {readonly [restoreReceipt]:true}
interface Receipt {owner:NativeAreaCharacterResume;writer:World;preparation:NativeAreaScenePreparation;area:NativeAreaSceneOngoing|undefined;stage:Stage;seat:Seat|undefined;seatBody:Actor|undefined;seatId:string|undefined;active:boolean}
function own<T>(o:object,key:PropertyKey):T{const d=Object.getOwnPropertyDescriptor(o,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native saved-seat requires ordinary data: '+String(key));return d.value as T;}
const receipts=new WeakMap<object,Receipt>(),owners=new WeakSet<object>(),writers=new WeakSet<World>();
export function isNativeAreaCharacterResume(value:unknown):value is NativeAreaCharacterResume{return !!value&&typeof value==='object'&&owners.has(value);}
export function assertNativeCharacterResume(token:NativeCharacterResumeReceipt,stage:Stage):Readonly<Receipt>{const r=receipts.get(token);if(!r?.active||r.stage!==stage)throw Error('Native saved-character stage is foreign or expired');assertNativeRetainedMassState(r.writer);if(stage==='seat'&&(!r.seat||own(r.seat,'actor')!==r.seatBody||own(r.seat,'id')!==r.seatId))throw Error('Native saved-seat factory relation changed');if(r.preparation.input.session.writer!==r.writer)throw Error('Native saved-character roots changed');return r;}
export class NativeAreaCharacterResume {
 readonly #advanceCreation=NativeAreaCharacterCreation.prototype.advanceResumeLoading;
 readonly #calls={create:NativeAreaCharacterCreation.prototype.createResume,fields:NativeAreaSceneCombat.prototype.restoreCharacterFields,graph:NativeAreaSceneTransitionCoordinator.prototype.restoreCharacterGraph,reconcile:NativeAreaSceneCombat.prototype.reconcileRestoredGraph,arrival:NativeAreaSceneTransitionCoordinator.prototype.resumeCharacterArrival,recalc:NativeAreaSceneProgression.prototype.recalcRestoredSeat,claim:NativeAreaActorAuthority.prototype.claimInserted};
 readonly writer:World;readonly classDef:ClassDef;readonly record:NativeRetainedResumeRecord;readonly #save:CharacterSave;readonly #lease:CharacterResume|undefined;#rollback:(()=>void)|undefined;
 #preparation:NativeAreaScenePreparation|undefined;#area:NativeAreaSceneOngoing|undefined;#running=false;#attempted=false;#seat:Seat|undefined;#seatBody:Actor|undefined;#seatId:string|undefined;
 constructor(writer:World,save:CharacterSave,lease?:CharacterResume){if(lease&&(!characterResumeAuthority(lease)||lease.kind!=='inline'||lease.save!==save))throw Error('Native saved character needs its exact live storage lease');this.#lease=lease;if(!isNativeWorld(writer)||writers.has(writer))throw Error('Native resume needs its actual unused writer');assertNativeRetainedMassState(writer);const copied=JSON.parse(JSON.stringify(save)) as CharacterSave,record=readNativeRetainedSave(copied),classDef=CLASSES.find(c=>c.id===copied.classId);if(!classDef||canonical(record.manifest)!==canonical(writer.manifest))throw Error('Native resume class or recorded manifest differs');if(writer.seats.length||writer.actors.length||writer.localSeat!==undefined)throw Error('Native resume needs the genuine empty staged writer');this.writer=writer;this.classDef=classDef;this.record=Object.freeze({...record,manifest:freezeData(record.manifest),world:freezeData(record.world)});this.#save=copied;for(const key of ['writer','classDef','record'])Object.defineProperty(this,key,{writable:false,configurable:false});owners.add(this);writers.add(writer);}
 #with<T>(stage:Stage,action:(token:NativeCharacterResumeReceipt)=>T):T {if(!this.#running||!this.#preparation)throw Error('Native resume is not active');const token=Object.freeze({}) as NativeCharacterResumeReceipt,row:Receipt={owner:this,writer:this.writer,preparation:this.#preparation,area:this.#area,stage,seat:this.#seat,seatBody:this.#seatBody,seatId:this.#seatId,active:true};receipts.set(token,row);try{return action(token);}finally{row.active=false;}}
 install(preparation:NativeAreaScenePreparation,creation:NativeAreaCharacterCreation,policy:ResumeSpawn,signal?:AbortSignal):NativeAreaSceneOngoing {
  if(this.#attempted||!isNativeAreaScenePreparation(preparation)||preparation.input.session.writer!==this.writer||creation.preparation!==preparation)throw Error('Native resume needs its exact one-time real preparation');this.#attempted=true;this.#preparation=preparation;this.#running=true;
  const check=()=>{assertNativeRetainedMassState(this.writer);if(signal?.aborted)throw Error('Native Continue cancelled');};
  try{check();this.#area=this.#with('shell',token=>Reflect.apply(this.#calls.create,creation,[token,signal]));check();this.#with('fields',token=>{if(!Reflect.apply(this.#calls.fields,this.#area!.combat,[token,this.#save]))throw Error('Saved character fields could not be restored');});check();this.#with('graph',token=>{Reflect.apply(this.#calls.graph,preparation.input.coordinator,[token,structuredClone(this.record.world)]);if(this.#lease)this.#rollback=bindCharacterResumePages(this.writer,this.#lease);Reflect.apply(this.#calls.reconcile,this.#area!.combat,[token]);});check();this.#with('arrival',token=>Reflect.apply(this.#calls.arrival,preparation.input.coordinator,[token,policy,this.record.world.player]));check();return preparation.input.coordinator.published;}finally{this.#running=false;}
 }

 get loadingActive():boolean {return this.#running;}
 /** Advance only between completed, synchronously revoked native receipts. */
 async installLoading(preparation:NativeAreaScenePreparation,creation:NativeAreaCharacterCreation,policy:ResumeSpawn,pause:(label:string)=>Promise<void>,signal?:AbortSignal):Promise<NativeAreaSceneOngoing> {
  if(this.#attempted||!isNativeAreaScenePreparation(preparation)||preparation.input.session.writer!==this.writer||creation.preparation!==preparation)throw Error('Native resume needs its exact one-time real preparation');
  this.#attempted=true;this.#preparation=preparation;
  const check=()=>{assertNativeRetainedMassState(this.writer);if(signal?.aborted||this.#lease&&!characterResumeAuthority(this.#lease))throw Error('Native Continue cancelled');};
  const stage=<T>(action:()=>T):T=>{check();if(this.#running)throw Error('Native resume cannot reenter');this.#running=true;try{return this.writer.withGlobalPolicies(action);}finally{this.#running=false;}};
  const wait=async(label:string)=>{check();await pause(label);check();};
  for(;;){const step=stage(()=>this.#with('shell',token=>Reflect.apply(this.#advanceCreation,creation,[token,signal])));check();if(step.done){this.#area=step.value;break;}await wait(step.value);}
  await wait('Restoring your vessel');
  stage(()=>this.#with('fields',token=>{if(!Reflect.apply(this.#calls.fields,this.#area!.combat,[token,this.#save]))throw Error('Saved character fields could not be restored');}));
  await wait('Restoring your journey');
  stage(()=>this.#with('graph',token=>{Reflect.apply(this.#calls.graph,preparation.input.coordinator,[token,structuredClone(this.record.world)]);if(this.#lease)this.#rollback=bindCharacterResumePages(this.writer,this.#lease);Reflect.apply(this.#calls.reconcile,this.#area!.combat,[token]);}));
  await wait('Returning to your recorded ground');
  stage(()=>this.#with('arrival',token=>Reflect.apply(this.#calls.arrival,preparation.input.coordinator,[token,policy,this.record.world.player])));
  check();return preparation.input.coordinator.published;
 }

 discard():void {const rollback=this.#rollback;this.#rollback=undefined;rollback?.();}
 makeSeat(token:NativeCharacterResumeReceipt,...args:Parameters<World['makePlayerSeat']>):Seat {const r=assertNativeCharacterResume(token,'fields');if(r.owner!==this||!r.area||this.#seat)throw Error('Native saved-seat factory is busy or foreign');let created:Seat|undefined;try{const seat=sceneMakePlayerSeat({recalcSeat:row=>{if(created&&created!==row)throw Error('Native saved-seat identity changed');created=row;this.#seat=row;this.#seatBody=own<Actor>(row,'actor');this.#seatId=own<string>(row,'id');this.#with('seat',proof=>Reflect.apply(this.#calls.recalc,r.area!.progression,[proof]));}},...args);if(seat!==created||own(seat,'actor')!==this.#seatBody||own(seat,'id')!==this.#seatId)throw Error('Native saved-seat factory changed its result');return seat;}catch(error){this.#seat=undefined;this.#seatBody=undefined;this.#seatId=undefined;throw error;}}
 admitSeat(token:NativeCharacterResumeReceipt,seat:Seat):void {const r=assertNativeCharacterResume(token,'fields'),area=r.area;if(r.owner!==this||!area||seat!==this.#seat)throw Error('Native saved-seat insertion is foreign');const authority=r.preparation.input.authority,body=this.#seatBody,relay=area.assembly.input.population.factory.relayStatus;if(!body)throw Error('Native saved-seat factory body is absent');const rows=own<Seat[]>(r.writer,'seats');if(!Array.isArray(rows)||Object.getPrototypeOf(rows)!==Array.prototype)throw Error('Native saved-seat needs its raw roster');let member=false;for(let i=0;i<own<number>(rows,'length');i++)if(own(rows,i)===seat)member=true;if(!member||own(seat,'actor')!==body||own(seat,'id')!==this.#seatId)throw Error('Native saved-seat insertion lost the exact roster row');const descriptor=Object.getOwnPropertyDescriptor(body,'statusRelay');if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.writable)throw Error('Native saved-seat relay is not writable');assertNativeCharacterResume(token,'fields');Reflect.apply(this.#calls.claim,authority,[area.binding,body]);body.statusRelay=relay;this.#seat=undefined;this.#seatBody=undefined;this.#seatId=undefined;}
}
