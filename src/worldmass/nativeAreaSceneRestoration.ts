import {nativeCombatActorEntry} from './nativeAreaCombatOperation';
import {sceneShowSkillArrival,type NativeSceneSkillArrivalHost} from '../engine/nativeSceneSkillArrival';
/** Physical native restoration and local presentation over the area's actual
 * actor state, objective text store and exclusively owned tether slot. */
import type {World} from '../engine/world';
import type {Actor} from '../engine/actor';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaSceneObjectiveCompletion} from './nativeAreaSceneObjectiveCompletion';
import type {NativeAreaSceneTethers} from './nativeAreaSceneTethers';
import type {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import * as native from '../engine/nativeSceneRestoration';
export interface NativeSceneRestorationRuntime {readonly restoration:NativeAreaSceneRestoration;readonly tethers:NativeAreaSceneTethers}
export type NativeSceneRestorationAuthority=Pick<NativeAreaActorAuthority<NativeSceneRestorationRuntime>,'campaign'|'require'|'assertAdmitted'|'bindingFor'>;
export interface NativeAreaSceneRestorationInput {
 scene:NativeSceneCensus;geometry:NativeAreaSceneGeometry;objective:NativeAreaSceneObjectiveCompletion;tethers:NativeAreaSceneTethers;
 campaign:Pick<World,'seats'|'partyRows'|'seatOfRoot'|'account'|'localSeat'>;authority:NativeSceneRestorationAuthority;
}
export class NativeAreaSceneRestoration implements native.NativeSceneRestorationApi {
 readonly input:NativeAreaSceneRestorationInput;readonly host:native.NativeSceneRestorationHost;
 constructor(raw:NativeAreaSceneRestorationInput){
  const bindings=Object.create(null);
  for(const key of ['scene','geometry','objective','tethers','campaign','authority']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native restoration needs own object binding: '+key);
   bindings[key]=d.value;
  }
  const input:NativeAreaSceneRestorationInput=this.input=Object.freeze(bindings),self=this;
  if(input.geometry.state!==input.scene||input.objective.input.scene!==input.scene||input.objective.input.geometry!==input.geometry||input.tethers.input.scene!==input.scene)throw Error('Native restoration needs identical local owners');
  if(!Object.is(input.objective.input.campaign,input.campaign)||input.tethers.input.campaign!==input.campaign||input.authority.campaign!==input.campaign||!Object.is(input.tethers.input.authority,input.authority))throw Error('Native restoration needs identical campaign authority and tether owner');
  for(const key of ['seats','partyRows','seatOfRoot','account','localSeat'])if(!(key in input.campaign))throw Error('Native restoration needs actual campaign capability: '+key);
  const host={} as native.NativeSceneRestorationHost;
  const arrival:NativeSceneSkillArrivalHost=Object.freeze({get flashes(){return input.geometry.flashes;},get seats(){return input.campaign.seats;},get localSeat(){return input.campaign.localSeat;},get account(){return input.campaign.account;}});
  Object.defineProperty(host,'showSkillArrival',{enumerable:true,value:(...args:Parameters<native.NativeSceneRestorationHost['showSkillArrival']>)=>sceneShowSkillArrival(arrival,...args)});
  const fields=(provider:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){return(provider() as Record<string,unknown>)[key];}});};
  const methods=(provider:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){const owner=provider() as Record<string,Function>,fn=owner[key];return(...args:unknown[])=>fn.apply(owner,args);}});};
  fields(()=>input.scene,['actors']);fields(()=>input.geometry,['flashes']);fields(()=>input.objective.input.state,['texts']);fields(()=>input.tethers.input.state,['tethers']);fields(()=>input.campaign,['partyRows','seats']);
  methods(()=>input.objective,['text']);methods(()=>self,["grantAbsorb","applyRestore","startRestoreStream","critMendMult","applyHeal","applyHealChained","cleanseActor","ringAfflictions","healAlliesInArea","seatText","creditFloat"]);
  // Native creditFloat may never inspect by (solo, empty text or explicit seat).
  // Validate the source body only at its original campaign root-lookup point.
  Object.defineProperty(host,'seatOfRoot',{enumerable:true,get(){const c=input.campaign,fn=c.seatOfRoot;return(...args:Parameters<World['seatOfRoot']>)=>{if(args[0])self.#admit([args[0]]);return fn.apply(c,args);};}});
  this.host=Object.freeze(host);for(const key of ['input','host'])Object.defineProperty(this,key,{enumerable:false,writable:false,configurable:false});
 }
 #admit(actors:readonly Actor[]):void{
  const {scene,authority,tethers}=this.input,binding=authority.bindingFor(scene);
  if(binding.services.restoration!==this||binding.services.tethers!==tethers)throw Error('Native restoration needs its exact registered owners');
  for(const actor of actors){if(nativeCombatActorEntry(this,actor,'refund'))continue;if(!scene.actors.includes(actor)||authority.require(actor).scene!==scene)throw Error('Native restoration needs actual physical source and target bodies');}
  authority.assertAdmitted(scene);
 }
 grantAbsorb(...args:Parameters<native.NativeSceneRestorationApi['grantAbsorb']>):ReturnType<native.NativeSceneRestorationApi['grantAbsorb']>{this.#admit([args[0]]);return native.sceneGrantAbsorb(this.host,...args);}
 applyRestore(...args:Parameters<native.NativeSceneRestorationApi['applyRestore']>):ReturnType<native.NativeSceneRestorationApi['applyRestore']>{this.#admit([args[0]]);return native.sceneApplyRestore(this.host,...args);}
 startRestoreStream(...args:Parameters<native.NativeSceneRestorationApi['startRestoreStream']>):ReturnType<native.NativeSceneRestorationApi['startRestoreStream']>{this.#admit([args[0],args[1]]);return native.sceneStartRestoreStream(this.host,...args);}
 critMendMult(...args:Parameters<native.NativeSceneRestorationApi['critMendMult']>):ReturnType<native.NativeSceneRestorationApi['critMendMult']>{this.#admit([args[0]]);return native.sceneCritMendMult(this.host,...args);}
 applyHeal(...args:Parameters<native.NativeSceneRestorationApi['applyHeal']>):ReturnType<native.NativeSceneRestorationApi['applyHeal']>{this.#admit([args[0],args[2]]);return native.sceneApplyHeal(this.host,...args);}
 applyHealChained(...args:Parameters<native.NativeSceneRestorationApi['applyHealChained']>):ReturnType<native.NativeSceneRestorationApi['applyHealChained']>{this.#admit([args[0],args[2]]);return native.sceneApplyHealChained(this.host,...args);}
 cleanseActor(...args:Parameters<native.NativeSceneRestorationApi['cleanseActor']>):ReturnType<native.NativeSceneRestorationApi['cleanseActor']>{this.#admit([args[0]]);return native.sceneCleanseActor(this.host,...args);}
 ringAfflictions(...args:Parameters<native.NativeSceneRestorationApi['ringAfflictions']>):ReturnType<native.NativeSceneRestorationApi['ringAfflictions']>{this.#admit([args[0]]);return native.sceneRingAfflictions(this.host,...args);}
 healAlliesInArea(...args:Parameters<native.NativeSceneRestorationApi['healAlliesInArea']>):ReturnType<native.NativeSceneRestorationApi['healAlliesInArea']>{this.#admit([args[0]]);return native.sceneHealAlliesInArea(this.host,...args);}
 seatText(...args:Parameters<native.NativeSceneRestorationApi['seatText']>):ReturnType<native.NativeSceneRestorationApi['seatText']>{this.#admit([]);return native.sceneSeatText(this.host,...args);}
 creditFloat(...args:Parameters<native.NativeSceneRestorationApi['creditFloat']>):ReturnType<native.NativeSceneRestorationApi['creditFloat']>{this.#admit([]);return native.sceneCreditFloat(this.host,...args);}
}
