import {nativeCombatActorEntry} from './nativeAreaCombatOperation';
/** Area-local record construction over actual progression queues. No tick,
 * damage, detached payload execution or actor retirement is supplied here. */
import type {World} from '../engine/world';
import type {Actor} from '../engine/actor';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import {NativeAreaSceneProgression} from './nativeAreaSceneProgression';
import {NativeAreaSceneCastingPreparation,type NativeCastingPreparationRuntime} from './nativeAreaSceneCastingPreparation';
import {NativeAreaMaddenLedger,assertNativeMaddenLedger} from './nativeAreaMaddenLedger';
import * as native from '../engine/nativeSceneGroundFollowUps';
export interface NativeGroundFollowUpsRuntime extends NativeCastingPreparationRuntime {readonly groundFollowUps:NativeAreaSceneGroundFollowUps;readonly progression:NativeAreaSceneProgression;readonly maddenLedger:NativeAreaMaddenLedger}
export type NativeGroundFollowUpsAuthority=Pick<NativeAreaActorAuthority<NativeGroundFollowUpsRuntime>,'campaign'|'require'|'bindingFor'|'assertAdmitted'>;
export interface NativeGroundFollowUpsInput {scene:NativeSceneCensus;campaign:Pick<World,'time'|'seats'>;authority:NativeGroundFollowUpsAuthority;progression:NativeAreaSceneProgression;castingPreparation:NativeAreaSceneCastingPreparation;ledger:NativeAreaMaddenLedger}
export class NativeAreaSceneGroundFollowUps implements native.NativeSceneGroundFollowUpsApi {
 readonly input:NativeGroundFollowUpsInput;readonly host:native.NativeSceneGroundFollowUpsHost;
 constructor(raw:NativeGroundFollowUpsInput){
  const b=Object.create(null);for(const key of ['scene','campaign','authority','progression','castingPreparation','ledger']){const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native ground construction needs own object binding: '+key);b[key]=d.value;}
  const input:NativeGroundFollowUpsInput=this.input=Object.freeze(b),p=input.progression,c=input.castingPreparation,l=input.ledger;
  if(!(input.authority instanceof NativeAreaActorAuthority)||!(p instanceof NativeAreaSceneProgression)||!(c instanceof NativeAreaSceneCastingPreparation)||!(l instanceof NativeAreaMaddenLedger))throw Error('Native ground construction needs concrete owners');
  if(p.input.scene!==input.scene||c.input.scene!==input.scene||!Object.is(p.input.campaign,input.campaign)||!Object.is(c.input.campaign,input.campaign)||l.input.campaign!==input.campaign||input.authority.campaign!==input.campaign||!Object.is(p.input.authority,input.authority)||!Object.is(c.input.authority,input.authority)||l.input.authority!==input.authority)throw Error('Native ground construction needs identical scene campaign authority and owners');
  assertNativeMaddenLedger(l,input.campaign,input.authority);
  if(!('time' in input.campaign))throw Error('Native ground construction needs the actual campaign clock');
  const host={} as native.NativeSceneGroundFollowUpsHost;
  for(const key of ['zones','pendingFollowUps'] as const)Object.defineProperty(host,key,{enumerable:true,get(){return input.progression.input.state[key];}});
  Object.defineProperty(host,'time',{enumerable:true,get(){return input.campaign.time;}});
  Object.defineProperty(host,'maddenBanks',{enumerable:true,get(){return input.ledger.input.banks;}});
  Object.defineProperty(host,'maddenBankOf',{enumerable:true,get:()=>{const owner=this,fn=owner.maddenBankOf;return(...args:Parameters<typeof fn>)=>Reflect.apply(fn,owner,args);}});
  Object.defineProperty(host,'mintMetaInstance',{enumerable:true,get(){const owner=input.castingPreparation,fn=owner.mintMetaInstance;return(...args:Parameters<typeof fn>)=>Reflect.apply(fn,owner,args);}});
  this.host=Object.freeze(host);for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false,enumerable:false});
 }
 #registered(){const {authority,scene,progression,castingPreparation,ledger}=this.input,binding=authority.bindingFor(scene),s=binding.services;if(s.groundFollowUps!==this||s.progression!==progression||s.castingPreparation!==castingPreparation||s.maddenLedger!==ledger||s.restoration!==castingPreparation.input.restoration||s.tethers!==castingPreparation.input.restoration.input.tethers)throw Error('Native ground construction needs exact registered owners');return binding;}
 #admit(actor:Actor):void{if(nativeCombatActorEntry(this,actor,'proc'))return;const {scene,authority}=this.input;this.#registered();if(!scene.actors.includes(actor)||authority.require(actor).scene!==scene)throw Error('Native ground construction needs actual physical actor');this.#registered();if(!scene.actors.includes(actor))throw Error('Native ground construction needs actual physical actor');authority.assertAdmitted(scene);}
 maddenBankOf(...args:Parameters<native.NativeSceneGroundFollowUpsApi['maddenBankOf']>):ReturnType<native.NativeSceneGroundFollowUpsApi['maddenBankOf']>{this.#registered();this.input.authority.assertAdmitted(this.input.scene);return native.sceneMaddenBankOf(this.host,...args);}
 statTrailSpec(...args:Parameters<native.NativeSceneGroundFollowUpsApi['statTrailSpec']>):ReturnType<native.NativeSceneGroundFollowUpsApi['statTrailSpec']>{return native.sceneStatTrailSpec(this.host,...args);}
 mintAftermath(...args:Parameters<native.NativeSceneGroundFollowUpsApi['mintAftermath']>):void{this.#admit(args[0]);native.sceneMintAftermath(this.host,...args);}
 dropLingerField(...args:Parameters<native.NativeSceneGroundFollowUpsApi['dropLingerField']>):void{this.#admit(args[0]);native.sceneDropLingerField(this.host,...args);}
 mintTrailPatch(...args:Parameters<native.NativeSceneGroundFollowUpsApi['mintTrailPatch']>):void{this.#admit(args[0]);native.sceneMintTrailPatch(this.host,...args);}
 queueFollowUps(...args:Parameters<native.NativeSceneGroundFollowUpsApi['queueFollowUps']>):void{this.#admit(args[0]);native.sceneQueueFollowUps(this.host,...args);}
}
