import {nativeCombatActorEntry} from './nativeAreaCombatOperation';
/** Physical-area entry to native kill pickups and deferred burst construction.
 * Death attribution, other remnant writers, ticking and retirement remain external. */
import type {Actor} from '../engine/actor';
import type {World} from '../engine/world';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import {NativeAreaSceneLoot} from './nativeAreaSceneLoot';
import type {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import {ownNativeRewardStorage} from './nativeAreaSceneRewardStorage';
import * as native from '../engine/nativeSceneKillAftermath';
export interface NativeKillAftermathState {remnants:World['remnants'];deathBursts:World['deathBursts']}
export function freshKillAftermathState():NativeKillAftermathState{return {remnants:[],deathBursts:[]};}
export interface NativeKillAftermathRuntime {readonly killAftermath:NativeAreaSceneKillAftermath;readonly loot:NativeAreaSceneLoot;readonly geometry:NativeAreaSceneGeometry}
export type NativeKillAftermathAuthority=Pick<NativeAreaActorAuthority<NativeKillAftermathRuntime>,'campaign'|'require'|'assertAdmitted'|'bindingFor'>;
export interface NativeKillAftermathInput {
 scene:NativeSceneCensus;geometry:NativeAreaSceneGeometry;loot:NativeAreaSceneLoot;
 campaign:NativeAreaSceneLoot['input']['campaign']&Pick<World,'seats'>;
 authority:NativeKillAftermathAuthority;state:NativeKillAftermathState;
}
type Args<F extends (...a:any[])=>unknown>=Parameters<F> extends [unknown,...infer A]?A:never;
/** Only a static own-data construct can prove that native code never reads prey.
 * No getter, prototype lookup or value conversion is run by this entry check. */
function staticConstruct(actor:Actor):boolean {const d=Object.getOwnPropertyDescriptor(actor,'construct');return !!d&&Object.hasOwn(d,'value')&&!!d.value;}
export class NativeAreaSceneKillAftermath implements native.NativeSceneKillAftermathApi {
 readonly input:NativeKillAftermathInput;readonly host:native.NativeSceneKillAftermathHost;
 constructor(raw:NativeKillAftermathInput){
  const b=Object.create(null);for(const key of ['scene','geometry','loot','campaign','authority','state']){const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native kill aftermath needs own object binding: '+key);b[key]=d.value;}
  const input:NativeKillAftermathInput=this.input=Object.freeze(b),{scene,geometry,loot,campaign,authority}=input;
  if(!(geometry instanceof NativeAreaSceneGeometry)||!(loot instanceof NativeAreaSceneLoot)||geometry.state!==scene||loot.input.scene!==scene||loot.input.geometry!==geometry||loot.input.campaign!==campaign||authority.campaign!==campaign)throw Error('Native kill aftermath needs identical actual geometry, loot and campaign authority');
  const host={} as native.NativeSceneKillAftermathHost;
  Object.defineProperties(host,{
   orbs:{enumerable:true,get:()=>input.loot.input.state.orbs},
   remnants:{enumerable:true,get:()=>input.state.remnants},deathBursts:{enumerable:true,get:()=>input.state.deathBursts},
   shedOrb:{enumerable:true,get(){const provider=input.loot,fn=provider.shedOrb;return (...args:Parameters<World['shedOrb']>)=>Reflect.apply(fn,provider,args);}},
   clampPos:{enumerable:true,get(){const provider=input.geometry,fn=provider.clampPos;return (...args:Parameters<World['clampPos']>)=>Reflect.apply(fn,provider,args);}},
  });
  this.host=Object.freeze(host);
  // One shared lifetime registry covers these slots and the real loot/physical
  // queues. Preserve raw arrays, native methods, enumeration and frozen failures.
  ownNativeRewardStorage(input.state,['remnants','deathBursts']);
  for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 #actors(...actors:Actor[]):void {const {scene,authority,loot,geometry}=this.input;for(const actor of actors){if(nativeCombatActorEntry(this,actor,'attribution'))continue;if(!scene.actors.includes(actor))throw Error('Native kill aftermath needs actual physical actor');const registered=authority.require(actor);if(registered.scene!==scene||registered.killAftermath!==this||registered.loot!==loot||registered.geometry!==geometry)throw Error('Native kill aftermath needs exact registered owners');}authority.assertAdmitted(scene);}
 /** No campaign callback may follow this final ownership check. A live seats
  * read while admitting a later subject can transfer an earlier subject. */
 #final(...actors:Actor[]):void {const {scene,authority,loot,geometry}=this.input,binding=authority.bindingFor(scene);if(binding.services.killAftermath!==this||binding.services.loot!==loot||binding.services.geometry!==geometry)throw Error('Native kill aftermath needs exact registered owners');for(const actor of actors)if(!nativeCombatActorEntry(this,actor,'attribution')&&!scene.actors.includes(actor))throw Error('Native kill aftermath needs actual physical actor');authority.assertAdmitted(scene);}
 rollKillOrbs(...a:Args<typeof native.sceneRollKillOrbs>):void {this.#actors(a[0]);const subjects=staticConstruct(a[0])?[a[0]]:[a[0],a[2]];if(subjects.length===2)this.#actors(a[2]);this.#final(...subjects);native.sceneRollKillOrbs(this.host,...a);}
 rollKillRemnants(...a:Args<typeof native.sceneRollKillRemnants>):void {this.#actors(a[0]);this.#final(a[0]);native.sceneRollKillRemnants(this.host,...a);}
 spawnDeathBurst(...a:Args<typeof native.sceneSpawnDeathBurst>):void {this.#actors(a[0]);this.#final(a[0]);native.sceneSpawnDeathBurst(this.host,...a);}
}
