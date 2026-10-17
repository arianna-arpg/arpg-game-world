/** Later party insertion has its own synchronous factory receipt; saved-character
 * stages and generic combat preparation cannot manufacture this permission. */
import type {Actor} from '../engine/actor';
import type {World,Seat} from '../engine/world';
import {sceneMakePlayerSeat} from '../engine/nativeCharacterCreation';
import {sceneAddSeat,sceneAdoptSeatMeta,sceneReconcileContainers,sceneSpawnMercSeat} from '../engine/nativeCharacterRestoration';
import {sceneHireMercenary,sceneTemplateSnapshot,type NativeSceneSeatHiringHost} from '../engine/nativeSceneSeatHiring';
import {NativeAreaActorAuthority,type NativeAreaActorSelection} from './nativeAreaActorAuthority';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat,type NativeAreaCombatServices} from './nativeAreaSceneCombat';
import {NativeAreaSceneProgression} from './nativeAreaSceneProgression';
import {NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
type Host=Parameters<typeof sceneAddSeat>[0]&Parameters<typeof sceneAdoptSeatMeta>[0]&Parameters<typeof sceneReconcileContainers>[0]&Parameters<typeof sceneSpawnMercSeat>[0]&NativeSceneSeatHiringHost;
export type NativeAreaPartyBaseHost=Omit<Host,'makePlayerSeat'|'admitRestoredSeat'|'addSeat'|'spawnMercSeat'|'templateSnapshot'|'reconcileContainers'|'applyMercNormalization'|'removeSeat'>;
interface Member {seat:Seat;body:Actor;home:Actor|undefined;id:string}
interface Frame {members:readonly Member[];rows:Seat[];selected:readonly NativeAreaActorSelection<NativeAreaCombatServices>[];active:boolean}
declare const addedSeatBrand:unique symbol;
export interface NativeAddedSeatReceipt {readonly [addedSeatBrand]:true}
interface Factory {owner:NativeAreaParty;combat:NativeAreaSceneCombat;frame:Frame;seat:Seat;body:Actor;id:string;active:boolean;inserted:boolean}
const receipts=new WeakMap<object,Factory>();
const calls={select:NativeAreaActorAuthority.prototype.selectActors,final:NativeAreaActorAuthority.prototype.assertFinalSelections,binding:NativeAreaActorAuthority.prototype.bindingFor,claim:NativeAreaActorAuthority.prototype.claimInserted,unclaimed:NativeAreaActorAuthority.prototype.assertUnclaimed,claimed:NativeAreaActorAuthority.prototype.assertFinalClaimed};
function own<T>(value:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native party needs ordinary own data: '+String(key));return d.value as T;}
function optional<T>(value:object,key:PropertyKey):T|undefined {const d=Object.getOwnPropertyDescriptor(value,key);if(d&&!Object.hasOwn(d,'value'))throw Error('Native party refuses accessor relation');return d?.value;}
function rows(value:unknown):Seat[]{if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw Error('Native party needs its actual raw roster');for(let i=0;i<own<number>(value,'length');i++)own(value,i);return value;}
function member(seat:Seat):Member{return {seat,body:own(seat,'actor'),home:optional(seat,'home'),id:own(seat,'id')};}
export function assertNativeAddedSeat(token:NativeAddedSeatReceipt):Readonly<Factory>{const r=receipts.get(token);if(!r?.active||r.inserted||!r.frame.active||own(r.seat,'actor')!==r.body||own(r.seat,'id')!==r.id||optional(r.seat,'home')!==undefined)throw Error('Native added-seat factory is foreign or expired');Reflect.apply(finalFactory,r.owner,[token]);return r;}
export class NativeAreaParty {
 readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #host:Host;
 readonly #published=Object.getOwnPropertyDescriptor(NativeAreaSceneTransitionCoordinator.prototype,'published')!.get!;
 readonly #recalc=NativeAreaSceneProgression.prototype.recalcAddedSeat;
 readonly #inserted=new WeakMap<Seat,{frame:Frame;body:Actor;id:string}>();
 #pendingSeat:Seat|undefined;
 #running=false;#frame:Frame|undefined;#factory:Factory|undefined;#token:NativeAddedSeatReceipt|undefined;
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,base:NativeAreaPartyBaseHost){
  if(!isNativeAreaSceneCombat(combat))throw Error('Native party needs its actual combat owner');assertNativeCombatOwnerEntry(combat,entry);this.#combat=combat;this.#entry=entry;
  const host=this.#host=Object.create(base) as Host;
  const bind=<K extends keyof Host>(key:K,value:Host[K])=>Object.defineProperty(host,key,{enumerable:true,value});
  bind('makePlayerSeat',(...args)=>this.#make(...args));bind('admitRestoredSeat',seat=>this.#admit(seat));
  bind('addSeat',(...args)=>this.#add(...args));
  bind('spawnMercSeat',(...args)=>{this.#check();return sceneSpawnMercSeat(host,...args);});
  bind('templateSnapshot',sceneTemplateSnapshot);
  bind('reconcileContainers',(...args)=>{this.#check();return sceneReconcileContainers(host,...args);});
  Object.defineProperty(host,'applyMercNormalization',{enumerable:true,get:()=>{this.#check();const owner=combat.input.progression,fn=owner.applyMercNormalization;return(...args:Parameters<World['applyMercNormalization']>)=>{this.#check();return Reflect.apply(fn,owner,args);};}});
  Object.defineProperty(host,'removeSeat',{enumerable:true,get:()=>{this.#check();const owner=combat.campaignTransitions,fn=owner.removeSeat;return(...args:Parameters<World['removeSeat']>)=>{this.#check();return Reflect.apply(fn,owner,args);};}});
  const selectedMethods=['clampPos','dealVeteranFlasks','grantStartingCompanions','indexSeats','markMetaDirty','restoreAccountRelics','seatHero','seatSkillById','recalcSeat','dropGearAt','grantEssence','mercHireCap','mercHireCost','mercOfferBlocked','mercTargetLevel','mortalValueOf','spendEssence','spendMortalValue','text','saveCharacter'] as const;
  for(const key of selectedMethods)Object.defineProperty(host,key,{enumerable:true,get:()=>{this.#check();const fn=base[key];return(...args:unknown[])=>{this.#check();const result=Reflect.apply(fn,base,args);this.#check();return result;};}});
  Object.freeze(host);
 }
 #check():Frame {
  const frame=this.#frame,combat=this.#combat;if(!frame?.active)throw Error('Native party operation is expired');
  const writer=combat.input.characterWriter;if(own(writer,'seats')!==frame.rows||own(writer,'localSeat')!==frame.members[0].seat||Reflect.apply(this.#published,combat.input.coordinator,[]).combat!==combat)throw Error('Native party publication or roster changed');
  for(const m of frame.members){let found=false;for(let i=0;i<own<number>(frame.rows,'length');i++)if(own(frame.rows,i)===m.seat)found=true;if(!found||own(m.seat,'actor')!==m.body||optional(m.seat,'home')!==m.home||own(m.seat,'id')!==m.id)throw Error('Native party selected seat changed');}
  if(this.#pendingSeat){const r=this.#inserted.get(this.#pendingSeat);if(!r||r.frame!==frame||own(this.#pendingSeat,'actor')!==r.body||own(this.#pendingSeat,'id')!==r.id||optional(this.#pendingSeat,'home')!==undefined)throw Error('Native added seat changed before factory return');let found=false;for(let i=0;i<own<number>(frame.rows,'length');i++)if(own(frame.rows,i)===this.#pendingSeat)found=true;if(!found)throw Error('Native added seat left its roster');}
  const binding=Reflect.apply(calls.binding,combat.input.authority,[combat.scene]);if(frame.selected.some(row=>row.binding!==binding))throw Error('Native party binding changed');
  Reflect.apply(calls.claimed,combat.input.authority,[binding,frame.members.map(m=>m.body)]);if(this.#pendingSeat)Reflect.apply(calls.claimed,combat.input.authority,[binding,[this.#inserted.get(this.#pendingSeat)!.body]]);
  for(const m of frame.members)if(m.home){const possession=optional<object>(m.body,'possession');if(!possession||optional(possession,'huskMode')!=='carried'||optional(possession,'seatId')!==m.id)throw Error('Native party carried relation changed');Reflect.apply(calls.unclaimed,combat.input.authority,[m.home]);}
  return frame;
 }
 #run<T>(seat:Seat|undefined,action:()=>T):T {
  if(this.#running)throw Error('Native party insertion cannot reenter');this.#running=true;try{const combat=this.#combat,writer=combat.input.characterWriter,local=own<Seat>(writer,'localSeat'),roster=rows(own(writer,'seats'));
  const members=[member(local),...(seat&&seat!==local?[member(seat)]:[])],actors=members.flatMap(m=>m.home?[m.body,m.home]:[m.body]);
  const selected=Reflect.apply(calls.select,combat.input.authority,[actors,true]) as readonly NativeAreaActorSelection<NativeAreaCombatServices>[];if(selected.some(r=>r.owner.combat!==combat))throw Error('Native party cannot borrow another area seat');
  const frame:Frame={members,rows:roster,selected,active:true};this.#frame=frame;
  try{return this.#entry(this,{permission:'physical',physical:members.map(m=>m.body)},()=>{Reflect.apply(calls.final,combat.input.authority,[selected]);this.#check();return action();});}
  finally{frame.active=false;if(this.#factory)this.#factory.active=false;this.#factory=undefined;this.#token=undefined;this.#frame=undefined;this.#pendingSeat=undefined;}
  }finally{this.#running=false;}
 }
 assertFactory(token:NativeAddedSeatReceipt):void {const r=receipts.get(token);if(!r||r.owner!==this||this.#token!==token||this.#factory!==r||this.#check()!==r.frame)throw Error('Native added-seat receipt belongs to another factory');Reflect.apply(calls.unclaimed,this.#combat.input.authority,[r.body]);}
 #make(...args:Parameters<World['makePlayerSeat']>):Seat {
  const frame=this.#check();if(this.#factory)throw Error('Native player factory cannot nest');let created:Seat|undefined;
  const seat=sceneMakePlayerSeat({recalcSeat:row=>{if(created)throw Error('Native player factory recalculated twice');created=row;const token=Object.freeze({}) as NativeAddedSeatReceipt,r:Factory={owner:this,combat:this.#combat,frame,seat:row,body:own(row,'actor'),id:own(row,'id'),active:true,inserted:false};this.#factory=r;this.#token=token;receipts.set(token,r);assertNativeAddedSeat(token);Reflect.apply(this.#recalc,this.#combat.input.progression,[token]);}},...args);
  if(seat!==created||!this.#token)throw Error('Native player factory changed its seat');assertNativeAddedSeat(this.#token);return seat;
 }
 #admit(seat:Seat):void {
  const token=this.#token;if(!token)throw Error('Native party insertion lacks its private factory');assertNativeAddedSeat(token);const r=this.#factory!,combat=this.#combat;if(seat!==r.seat)throw Error('Native party inserted a different seat');
  // Select callback-capable infrastructure before final raw identity checks.
  const relay=combat.input.assembly.input.population.factory.relayStatus,binding=Reflect.apply(calls.binding,combat.input.authority,[combat.scene]);
  assertNativeAddedSeat(token);let found=false;for(let i=0;i<own<number>(r.frame.rows,'length');i++)if(own(r.frame.rows,i)===seat)found=true;if(!found)throw Error('Native party insertion lost its roster row');
  const d=Object.getOwnPropertyDescriptor(r.body,'statusRelay');if(!d||!Object.hasOwn(d,'value')||!d.writable)throw Error('Native party relay is not writable');
  Reflect.apply(calls.claim,combat.input.authority,[binding,r.body,r.frame.members.map(m=>m.body)]);r.body.statusRelay=relay;this.#inserted.set(seat,{frame:r.frame,body:r.body,id:r.id});this.#pendingSeat=seat;r.inserted=true;r.active=false;this.#factory=undefined;this.#token=undefined;
 }
 #add(...args:Parameters<World['addSeat']>):Seat {this.#check();try{const seat=sceneAddSeat(this.#host,...args),r=this.#inserted.get(seat),frame=this.#check();if(!r||r.frame!==frame||own(seat,'actor')!==r.body||own(seat,'id')!==r.id||optional(seat,'home')!==undefined)throw Error('Native added seat changed before factory return');let member=false;for(let i=0;i<own<number>(frame.rows,'length');i++)if(own(frame.rows,i)===seat)member=true;if(!member)throw Error('Native added seat left its roster');const authority=this.#combat.input.authority,binding=Reflect.apply(calls.binding,authority,[this.#combat.scene]);Reflect.apply(calls.claimed,authority,[binding,[r.body]]);return seat;}finally{this.#pendingSeat=undefined;}}
 addSeat(...args:Parameters<World['addSeat']>):Seat{return this.#run(undefined,()=>this.#add(...args));}
 adoptSeatMeta(...args:Parameters<World['adoptSeatMeta']>):void{return this.#run(args[0],()=>sceneAdoptSeatMeta(this.#host,...args));}
 hireMercenary(...args:Parameters<World['hireMercenary']>):boolean{return this.#run(args[1],()=>sceneHireMercenary(this.#host,...args));}
}

const finalFactory=NativeAreaParty.prototype.assertFactory;
