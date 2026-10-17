import {nativeAreaStoreClaims} from './nativeAreaStorageClaims';
import {nativeCombatActorEntry} from './nativeAreaCombatOperation';
/** Area-owned native casting preparation. Exact native algorithms remain in core;
 * descriptor-only entry checks permit only proven actor-free no-op branches. */
import type {World} from '../engine/world';
import type {Actor} from '../engine/actor';
import type {SkillInstance} from '../engine/skills';
import {SKILLS} from '../data/skills';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import type {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import {NativeAreaSceneRestoration} from './nativeAreaSceneRestoration';
import type {NativeAreaSceneTethers} from './nativeAreaSceneTethers';
import * as native from '../engine/nativeSceneCastingPreparation';
export interface NativeSceneCastingPreparationState {
 readonly comboCursors:WeakMap<Actor,Map<string,native.ComboCursor>>;
 readonly relocationHosts:WeakMap<SkillInstance,SkillInstance>;
}
export function freshSceneCastingPreparationState():NativeSceneCastingPreparationState{return {comboCursors:new WeakMap(),relocationHosts:new WeakMap()};}
export interface NativeCastingPreparationRuntime {readonly castingPreparation:NativeAreaSceneCastingPreparation;readonly restoration:NativeAreaSceneRestoration;readonly tethers:NativeAreaSceneTethers}
export type NativeCastingPreparationAuthority=Pick<NativeAreaActorAuthority<NativeCastingPreparationRuntime>,'campaign'|'require'|'assertAdmitted'|'bindingFor'>;
export interface NativeCastingPreparationInput {scene:NativeSceneCensus;campaign:Pick<World,'seats'|'time'|'seatOf'>;state:NativeSceneCastingPreparationState;restoration:NativeAreaSceneRestoration;authority:NativeCastingPreparationAuthority}
const ownedStates=new WeakSet<object>(),ownedMaps=nativeAreaStoreClaims;
const unknown=Symbol('non-static casting metadata');
const nativeSome=Array.prototype.some,nativeFilter=Array.prototype.filter,nativeIterator=Array.prototype[Symbol.iterator],nativeWeakGet=WeakMap.prototype.get,nativeWeakHas=WeakMap.prototype.has;
/** Never invoke optional metadata getters or coerce a value in owner preflight.
 * Unknown prototypes/accessors require admission; admitted core reads them once. */
function data(value:unknown,key:PropertyKey):any {
 if(!value||typeof value!=='object')return unknown;
 const proto=Object.getPrototypeOf(value);if(proto!==null&&proto!==Object.prototype)return unknown;
 const d=Object.getOwnPropertyDescriptor(value,key);if(d)return Object.hasOwn(d,'value')?d.value:unknown;
 return proto===null||!Object.getOwnPropertyDescriptor(Object.prototype,key)?undefined:unknown;
}
function array(value:unknown,method?:'some'|'filter'|typeof Symbol.iterator):value is unknown[]{
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)return false;
 const ctor=Object.getOwnPropertyDescriptor(value,'constructor')??Object.getOwnPropertyDescriptor(Array.prototype,'constructor');if(!ctor||!Object.hasOwn(ctor,'value')||ctor.value!==Array)return false;
 if(method){const d=Object.getOwnPropertyDescriptor(value,method)??Object.getOwnPropertyDescriptor(Array.prototype,method),fn=method==='some'?nativeSome:method==='filter'?nativeFilter:nativeIterator;if(!d||!Object.hasOwn(d,'value')||d.value!==fn)return false;}
 return true;
}
function elements(value:unknown,accept:(v:unknown)=>boolean,method?:'some'|'filter'|typeof Symbol.iterator):boolean {
 if(!array(value,method))return false;for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,i);if(!d||!Object.hasOwn(d,'value')||!accept(d.value))return false;}return true;
}
function emptyOptional(value:unknown):boolean{return value===undefined||value===null||(array(value,Symbol.iterator)&&value.length===0);}
function noChargeCost(inst:SkillInstance):boolean {
 const def=data(inst,'def'),sockets=data(inst,'sockets'),grafts=data(inst,'grafts'),tree=data(inst,'treeNodes'),role=data(inst,'sequenceRole');
 if(!elements(sockets,v=>v===null||v===undefined)||!emptyOptional(grafts)||!emptyOptional(tree)||role===unknown)return false;
 if(!elements(data(def,'tags'),v=>typeof v==='string','filter'))return false;
 const attack=data(def,'attackSequence');if(!role&&(attack===unknown||attack))return false;
 if(data(def,'tree')===unknown)return false;
 const delivery=data(def,'delivery'),kind=data(delivery,'type');if(typeof kind!=='string'||kind==='summon')return false;
 const cost=data(def,'chargeCost');return cost!==unknown&&!cost;
}
function quietStealth(def:Parameters<native.NativeSceneCastingPreparationApi['consumeStealth']>[1]):boolean {
 const effects=data(def,'effects');if(!array(effects,'some'))return false;
 const types:string[]=[];
 for(let i=0;i<effects.length;i++){const d=Object.getOwnPropertyDescriptor(effects,i);if(!d||!Object.hasOwn(d,'value'))return false;const type=data(d.value,'type');if(typeof type!=='string')return false;types.push(type);if(type==='gainCharge'){const charge=data(d.value,'charge');if(charge===unknown)return false;if(charge===native.STEALTH_CHARGE)return true;}}
 const explicit=data(def,'breaksStealth');if(explicit===unknown)return false;if(explicit!==undefined&&explicit!==null)return !explicit;
 const damage=data(def,'baseDamage');return damage!==unknown&&!damage&&!types.some(type=>type==='damage'||type==='knockback'||type==='pull');
}
function noComboStep(inst:SkillInstance,index:number):boolean {
 const def=data(inst,'def'),chain=data(def,'comboChain');if(chain===unknown)return false;if(!chain)return true;
 if(typeof index!=='number')return false;if(index<=0)return true;
 const steps=data(chain,'skills');if(!array(steps))return false;if(index>steps.length)return true;
 if(!Number.isInteger(index))return false;const d=Object.getOwnPropertyDescriptor(steps,index-1);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='string')return false;
 const id=data(def,'id');if(id===unknown)return false;if(d.value===id)return true;
 const installed=data(SKILLS,d.value);return installed!==unknown&&!installed;
}
function missingRelocation(map:WeakMap<SkillInstance,SkillInstance>,inst:SkillInstance):boolean {
 if(Object.getPrototypeOf(map)!==WeakMap.prototype)return false;const get=Object.getOwnPropertyDescriptor(map,'get')??Object.getOwnPropertyDescriptor(WeakMap.prototype,'get');
 return !!get&&Object.hasOwn(get,'value')&&get.value===nativeWeakGet&&!nativeWeakHas.call(map,inst);
}
export class NativeAreaSceneCastingPreparation implements native.NativeSceneCastingPreparationApi {
 readonly input:NativeCastingPreparationInput;readonly host:native.NativeSceneCastingPreparationHost;
 constructor(raw:NativeCastingPreparationInput){
  const b=Object.create(null);for(const key of ['scene','campaign','state','restoration','authority']){const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native casting preparation needs own object binding: '+key);b[key]=d.value;}
  const input:NativeCastingPreparationInput=this.input=Object.freeze(b),r=input.restoration;
  if(!(r instanceof NativeAreaSceneRestoration)||r.input.scene!==input.scene||!Object.is(r.input.campaign,input.campaign)||!Object.is(r.input.authority,input.authority)||input.authority.campaign!==input.campaign)throw Error('Native casting preparation needs identical concrete restoration and campaign authority');
  if(!('time' in input.campaign)||!('seatOf' in input.campaign))throw Error('Native casting preparation needs real campaign clock and seat lookup');
  if(ownedStates.has(input.state))throw Error('Native casting preparation needs fresh local map state');
  const maps=['comboCursors','relocationHosts'].map(key=>{const d=Object.getOwnPropertyDescriptor(input.state,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native casting preparation needs own raw WeakMap: '+key);try{nativeWeakHas.call(d.value,{});}catch{throw Error('Native casting preparation needs actual WeakMap: '+key);}if(ownedMaps.has(d.value))throw Error('Native casting preparation map already belongs to an area');return {key,d,map:d.value};});
  if(maps[0].map===maps[1].map)throw Error('Native casting preparation needs distinct native maps');
  const host={} as native.NativeSceneCastingPreparationHost;
  for(const [key,provider] of [['actors',()=>input.scene],['time',()=>input.campaign],['comboCursors',()=>input.state],['relocationHosts',()=>input.state]] as const)Object.defineProperty(host,key,{enumerable:true,get(){return (provider() as any)[key];}});
  Object.defineProperty(host,'seatOf',{enumerable:true,get(){const c=input.campaign,fn=c.seatOf;return(...args:Parameters<World['seatOf']>)=>Reflect.apply(fn,c,args);}});
  Object.defineProperty(host,'grantAbsorb',{enumerable:true,get(){const owner=input.restoration,fn=owner.grantAbsorb;return(...args:Parameters<typeof fn>)=>Reflect.apply(fn,owner,args);}});
  this.host=Object.freeze(host);for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false,enumerable:false});
  // No native operation replaces these maps. Pin the exact supplied slots; map
  // contents and keys stay raw and native. A failed constructor claims neither.
  for(const {key,d}of maps)Object.defineProperty(input.state,key,{...d,writable:false,configurable:false});
  for(const {map}of maps)ownedMaps.set(map,{});ownedStates.add(input.state);
 }
 #admit(actor:Actor):void {if(nativeCombatActorEntry(this,actor,'charge'))return;const {scene,authority,restoration}=this.input,binding=authority.bindingFor(scene);if(binding.services.castingPreparation!==this||binding.services.restoration!==restoration||binding.services.tethers!==restoration.input.tethers)throw Error('Native casting preparation needs exact registered owners');if(!scene.actors.includes(actor)||authority.require(actor).scene!==scene)throw Error('Native casting preparation needs actual physical actor');authority.assertAdmitted(scene);}
 paySkillCost(...args:Parameters<native.NativeSceneCastingPreparationApi['paySkillCost']>):void{this.#admit(args[0]);native.scenePaySkillCost(this.host,...args);}
 consumeChargeCost(...args:Parameters<native.NativeSceneCastingPreparationApi['consumeChargeCost']>):ReturnType<native.NativeSceneCastingPreparationApi['consumeChargeCost']>{if(!noChargeCost(args[1]))this.#admit(args[0]);return native.sceneConsumeChargeCost(this.host,...args);}
 refundCooldown(...args:Parameters<native.NativeSceneCastingPreparationApi['refundCooldown']>):void{this.#admit(args[0]);native.sceneRefundCooldown(this.host,...args);}
 consumeAmmunition(...args:Parameters<native.NativeSceneCastingPreparationApi['consumeAmmunition']>):void{this.#admit(args[0]);native.sceneConsumeAmmunition(this.host,...args);}
 consumeRemnants(...args:Parameters<native.NativeSceneCastingPreparationApi['consumeRemnants']>):void{this.#admit(args[0]);native.sceneConsumeRemnants(this.host,...args);}
 consumeStealth(...args:Parameters<native.NativeSceneCastingPreparationApi['consumeStealth']>):void{if(!quietStealth(args[1]))this.#admit(args[0]);native.sceneConsumeStealth(this.host,...args);}
 comboCursorOf(...args:Parameters<native.NativeSceneCastingPreparationApi['comboCursorOf']>):ReturnType<native.NativeSceneCastingPreparationApi['comboCursorOf']>{this.#admit(args[0]);return native.sceneComboCursorOf(this.host,...args);}
 comboStepOf(...args:Parameters<native.NativeSceneCastingPreparationApi['comboStepOf']>):ReturnType<native.NativeSceneCastingPreparationApi['comboStepOf']>{if(!noComboStep(args[1],args[2]))this.#admit(args[0]);return native.sceneComboStepOf(this.host,...args);}
 heldSkillInst(...args:Parameters<native.NativeSceneCastingPreparationApi['heldSkillInst']>):ReturnType<native.NativeSceneCastingPreparationApi['heldSkillInst']>{this.#admit(args[0]);return native.sceneHeldSkillInst(this.host,...args);}
 relocationTarget(...args:Parameters<native.NativeSceneCastingPreparationApi['relocationTarget']>):ReturnType<native.NativeSceneCastingPreparationApi['relocationTarget']>{if(!missingRelocation(this.input.state.relocationHosts,args[1]))this.#admit(args[0]);return native.sceneRelocationTarget(this.host,...args);}
 mintMetaInstance(...args:Parameters<native.NativeSceneCastingPreparationApi['mintMetaInstance']>):ReturnType<native.NativeSceneCastingPreparationApi['mintMetaInstance']>{this.#admit(args[0]);return native.sceneMintMetaInstance(this.host,...args);}
}
