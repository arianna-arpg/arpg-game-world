import {assertNativeCharacterResume,type NativeCharacterResumeReceipt} from './nativeAreaCharacterResume';
/** Actual native character construction. Receipts exist only at the private synchronous factory boundaries. */
import type {World,Seat} from '../engine/world';
import type {Actor} from '../engine/actor';
import {saveAccount} from '../meta/persistence';
import {CLASSES,type ClassDef} from '../data/classes';
import {START_ZONE,type ZoneDef} from '../data/zones';
import * as creation from '../engine/nativeCharacterCreation';
import {sceneIndexSeats} from '../engine/nativeSceneCombatControl';
import {sceneRestoreAccountRelics} from '../engine/nativeSceneCampaignLifecycle';
import {isNativeAreaScenePreparation,type NativeAreaScenePreparation} from './nativeAreaScenePreparation';
import type {MassNativeGeography} from './nativeGeography';
import type {NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';
import {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';
export type NativeFreshCharacterOptions=Omit<NonNullable<Parameters<World['createPlayer']>[1]>,'load'|'startingCompanions'|'startingFlasks'>;
export interface NativeFreshCharacter {readonly classDef:ClassDef;readonly options?:NativeFreshCharacterOptions;readonly labArts?:boolean;readonly graft?:string;readonly scene?:string;readonly provisionalMu?:true}
type Stage='construct'|'stats'|'deeds'|'birth'|'gifts';
declare const characterReceipt:unique symbol;
export interface NativeCharacterCreationReceipt {readonly [characterReceipt]:true}
interface Receipt {readonly writer:World;readonly seat:Seat;readonly actor:Actor;readonly preparation:NativeAreaScenePreparation;readonly area:NativeAreaSceneOngoing|undefined;readonly stage:Stage;active:boolean}
const receipts=new WeakMap<object,Receipt>(),factories=new WeakSet<NativeAreaScenePreparation>();
function own<T>(o:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(o,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native character needs ordinary data: '+String(key));return d.value as T;}
export function assertNativeCharacterReceipt(token:NativeCharacterCreationReceipt,stage:Stage):Readonly<Receipt>{const row=receipts.get(token);if(!row?.active||row.stage!==stage)throw Error('Native character factory receipt is expired or foreign');assertNativeRetainedMassState(row.writer);if(own(row.seat,'actor')!==row.actor||(row.area&&row.area.assembly.input.scene.player!==row.actor))throw Error('Native character body changed');if(stage!=='construct'&&own(row.writer,'localSeat')!==undefined&&own(row.writer,'localSeat')!==row.seat)throw Error('Native character local seat changed');return row;}
export function assertNativeEmptyCharacterCensus(token:NativeCharacterCreationReceipt,campaign:object,player:Actor,actors:readonly Actor[]):void {const r=assertNativeCharacterReceipt(token,'construct');if(r.preparation.input.session.campaign!==campaign||own(r.seat,'actor')!==player||own(r.writer,'actors')!==actors||actors.length!==0||own<Seat[]>(r.writer,'seats').length!==0||own(r.writer,'localSeat')!==undefined)throw Error('Native character construction must retain its actual empty census');r.preparation.input.authority.assertUnclaimed(player);}
export class NativeAreaCharacterCreation {
 readonly preparation:NativeAreaScenePreparation;readonly definition:ZoneDef;readonly geography:MassNativeGeography;
 readonly #writer:World;readonly #previousScale:PropertyDescriptor|undefined;
 readonly #scale:()=>void;
 #resume=false;#seat:Seat|undefined;#actor:Actor|undefined;#area:NativeAreaSceneOngoing|undefined;#running=false;#attempted=false;#retired=false;#signal:AbortSignal|undefined;
 constructor(preparation:NativeAreaScenePreparation,definition:ZoneDef,geography:MassNativeGeography){
  if(!isNativeAreaScenePreparation(preparation)||factories.has(preparation))throw Error('Native character needs one actual preparation owner');this.preparation=preparation;this.definition=definition;this.geography=geography;this.#writer=preparation.input.session.writer;
  if(definition.id!==START_ZONE||this.#writer.zoneMap[START_ZONE]!==definition)throw Error('Native fresh character requires the actual recorded starting town');this.#empty();
  this.#previousScale=Object.getOwnPropertyDescriptor(this.#writer,'rescaleEnemies');if(this.#previousScale&&!this.#previousScale.configurable)throw Error('Native character event service cannot replace a locked slot');
  this.#scale=()=>{this.#live();const area=this.#area;if(!area)throw Error('Native party event has no actual character area');if(area.assembly.phase==='born')this.preparation.input.coordinator.current.combat.rescaleEnemies();else this.#with('stats',token=>area.combat.rescaleInitialCharacter(token));};
  Object.defineProperty(this.#writer,'rescaleEnemies',{configurable:true,enumerable:false,writable:false,value:this.#scale});factories.add(preparation);
 }
 #empty():void {if(own<Seat[]>(this.#writer,'seats').length||own<Actor[]>(this.#writer,'actors').length||own(this.#writer,'localSeat')!==undefined)throw Error('Native character factory needs the actual empty writer');}
 #live():void {if(this.#retired)throw Error('Native character factory is retired');assertNativeRetainedMassState(this.#writer);if(this.#signal?.aborted)throw Error('Native character creation cancelled');}
 #with<T>(stage:Stage,action:(token:NativeCharacterCreationReceipt)=>T):T {this.#live();if(!this.#running||!this.#seat)throw Error('Native character factory is not active');const token=Object.freeze({}) as NativeCharacterCreationReceipt,row:Receipt={writer:this.#writer,seat:this.#seat,actor:this.#actor!,preparation:this.preparation,area:this.#area,stage,active:true};receipts.set(token,row);try{return action(token);}finally{row.active=false;}}
 #recalc(seat:Seat):void {
  if(!this.#running)throw Error('Native character stats escaped creation');
  if(!this.#seat){this.#seat=seat;this.#actor=own<Actor>(seat,'actor');this.#area=this.#with('construct',token=>this.preparation.constructInitialCharacter(token,this.definition.id,this.geography));}
  if(this.#seat!==seat)throw Error('Native character stats selected a different seat');
  this.#with('stats',token=>this.#area!.progression.recalcInitialCharacter(token));
 }
 createResume(token:NativeCharacterResumeReceipt,signal?:AbortSignal):NativeAreaSceneOngoing {const r=assertNativeCharacterResume(token,'shell');if(r.preparation!==this.preparation||r.writer!==this.#writer)throw Error('Native resume shell belongs to another factory');this.#resume=true;try{return this.#create({classDef:r.owner.classDef},signal);}finally{this.#resume=false;}}
 create(spec:NativeFreshCharacter,signal?:AbortSignal):NativeAreaSceneOngoing {return this.#create(spec,signal);}
 #create(spec:NativeFreshCharacter,signal?:AbortSignal):NativeAreaSceneOngoing {
  this.#live();if(this.#attempted||!CLASSES.includes(spec.classDef))throw Error('Native character creation needs a fresh catalog class');this.#empty();if(spec.provisionalMu&&spec.scene!=='mu')throw Error('Native provisional character belongs to Mu');this.#attempted=true;this.#running=true;this.#signal=signal;
  const self=this,writer=this.#writer;
  const host:Parameters<typeof creation.sceneCreatePlayer>[0]={
   get localSeat(){return writer.localSeat;},set localSeat(value){writer.localSeat=value;},get seats(){return writer.seats;},set seats(value){writer.seats=value;},get actors(){return writer.actors;},get arena(){return writer.arena;},get events(){return writer.events;},
   makePlayerSeat:(...args)=>creation.sceneMakePlayerSeat({recalcSeat:seat=>self.#recalc(seat)},...args),
   recalcSeat:seat=>self.#recalc(seat),bindCombatDeeds:()=>self.#with('deeds',token=>self.#area!.combat.campaignOwner.bindInitialCharacterDeeds(token)),
   indexSeats:()=>sceneIndexSeats({get seatByActor(){return writer['seatByActor'];},get seats(){return writer.seats;}}),
   restoreAccountRelics:seat=>sceneRestoreAccountRelics({get localSeat(){return writer.localSeat;},get clientActionHook(){return writer.clientActionHook;},get account(){return writer.account;},get manifest(){return writer.manifest;}},seat),
   loadZone:zoneId=>{if(zoneId!==self.definition.id)throw Error('Native character load differs from recorded start');self.#with('birth',token=>self.preparation.prepareInitialCharacter(token));self.preparation.birthInitial(self.#area!);},
   grantStartingCompanions:()=>self.#with('gifts',token=>self.#area!.combat.grantInitialCharacterCompanions(token)),
   dealVeteranFlasks:()=>self.#with('gifts',token=>self.#area!.combat.dealInitialCharacterFlasks(token)),
  };
  try{creation.sceneCreatePlayer(host,spec.classDef,(spec.provisionalMu||this.#resume)?{...spec.options,startingCompanions:false,startingFlasks:false}:spec.options);if(!this.#area||this.#area.assembly.phase!=='born')throw Error('Native character did not complete its real birth');if(!spec.provisionalMu&&!this.#resume){const labArts=spec.labArts??false;this.#with('gifts',token=>this.#area!.combat.dealInitialCharacterLabArts(token,labArts));if(spec.graft&&writer.account.skillGraft&&this.#with('gifts',token=>this.#area!.combat.applyInitialCharacterGraft(token,spec.graft!))){writer.account.skillGraft=false;saveAccount(writer.account);}}if(spec.scene)this.#area.combat.campaignFrame.beginScene(spec.scene);this.#live();return this.#area;}finally{this.#running=false;this.#signal=undefined;}
 }
 retire():void {if(this.#retired)return;this.#retired=true;const current=Object.getOwnPropertyDescriptor(this.#writer,'rescaleEnemies');if(current?.configurable&&current.value===this.#scale){if(this.#previousScale)Object.defineProperty(this.#writer,'rescaleEnemies',this.#previousScale);else Reflect.deleteProperty(this.#writer,'rescaleEnemies');}}
}
