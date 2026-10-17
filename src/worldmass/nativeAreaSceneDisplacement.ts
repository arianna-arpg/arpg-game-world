import {nativeCombatActorEntry,type NativeCombatPermission} from './nativeAreaCombatOperation';
/** Physical native displacement on one admitted scene. Detached/staged bodies,
 * continuous movement, recovery and ticking are deliberately outside this owner. */
import type {World} from '../engine/world';
import type {Actor} from '../engine/actor';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaSceneRuntimeBirth} from './nativeAreaSceneRuntimeBirth';
import type {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import * as native from '../engine/nativeSceneDisplacement';
export interface NativeSceneDisplacementRuntime {readonly displacement:NativeAreaSceneDisplacement}
export type NativeSceneDisplacementAuthority=Pick<NativeAreaActorAuthority<NativeSceneDisplacementRuntime>,'campaign'|'require'|'assertAdmitted'>;
export interface NativeAreaSceneDisplacementInput {
 scene:NativeSceneCensus;geometry:NativeAreaSceneGeometry;runtimeBirth:NativeAreaSceneRuntimeBirth;
 campaign:Pick<World,'seats'|'time'>;authority:NativeSceneDisplacementAuthority;
}
export class NativeAreaSceneDisplacement implements native.NativeSceneDisplacementApi {
 readonly input:NativeAreaSceneDisplacementInput;readonly host:native.NativeSceneDisplacementHost;
 constructor(raw:NativeAreaSceneDisplacementInput){
  const bindings=Object.create(null);
  for(const key of ['scene','geometry','runtimeBirth','campaign','authority']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native displacement needs own object binding: '+key);
   bindings[key]=d.value;
  }
  const input:NativeAreaSceneDisplacementInput=this.input=Object.freeze(bindings);
  if(input.authority.campaign!==input.campaign)throw Error('Native displacement needs identical campaign authority');
  if(!Object.is(input.runtimeBirth.input.campaign,input.campaign))throw Error('Native displacement needs its actual local campaign provider');
  if(input.geometry.state!==input.scene||input.runtimeBirth.input.scene!==input.scene||input.runtimeBirth.input.geometry!==input.geometry)throw Error('Native displacement needs identical local scene providers');
  const host={} as native.NativeSceneDisplacementHost;
  for(const [key,get]of Object.entries({actors:()=>input.scene.actors,flashes:()=>input.geometry.flashes,time:()=>input.campaign.time}))Object.defineProperty(host,key,{enumerable:true,get});
  const methods=(provider:object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){const fn=(provider as Record<string,Function>)[key];if(typeof fn!=='function')throw Error('Missing native displacement capability: '+key);return(...args:unknown[])=>fn.apply(provider,args);}});};
  methods(input.geometry,['clampPos']);methods(input.runtimeBirth,['actorById']);methods(this,["pushActor","grabRelease","clingRelease","teleportActor","mountFreeSeat","mountSeatRider","mountUnlink","mountUnhorse","mountWidowed","movementLocked","castMoveFactor","channelMobility","levitating"]);
  this.host=Object.freeze(host);for(const key of ['input','host'])Object.defineProperty(this,key,{enumerable:false,writable:false,configurable:false});
 }
 #admit(actors:readonly Actor[],permission:NativeCombatPermission='physical'):void{
  const {scene,authority}=this.input;
  for(const actor of actors){
   if(nativeCombatActorEntry(this,actor,permission))continue;
   if(!scene.actors.includes(actor))throw Error('Native displacement needs an actual physical body');
   const registered=authority.require(actor);
   if(registered.scene!==scene)throw Error('Native displacement needs an actual physical body');
   if(registered.displacement!==this)throw Error('Native displacement needs its registered owner');
  }
  authority.assertAdmitted(scene);
 }
 pushActor(...args:Parameters<native.NativeSceneDisplacementApi['pushActor']>):ReturnType<native.NativeSceneDisplacementApi['pushActor']>{this.#admit([args[0]]);if(args[3])this.#admit([args[3]],'attribution');return native.scenePushActor(this.host,...args);}
 grabRelease(...args:Parameters<native.NativeSceneDisplacementApi['grabRelease']>):ReturnType<native.NativeSceneDisplacementApi['grabRelease']>{this.#admit([args[0]]);return native.sceneGrabRelease(this.host,...args);}
 clingRelease(...args:Parameters<native.NativeSceneDisplacementApi['clingRelease']>):ReturnType<native.NativeSceneDisplacementApi['clingRelease']>{this.#admit([args[0]]);return native.sceneClingRelease(this.host,...args);}
 teleportActor(...args:Parameters<native.NativeSceneDisplacementApi['teleportActor']>):ReturnType<native.NativeSceneDisplacementApi['teleportActor']>{this.#admit([args[0]]);return native.sceneTeleportActor(this.host,...args);}
 mountFreeSeat(...args:Parameters<native.NativeSceneDisplacementApi['mountFreeSeat']>):ReturnType<native.NativeSceneDisplacementApi['mountFreeSeat']>{this.#admit([args[0]]);return native.sceneMountFreeSeat(this.host,...args);}
 mountSeatRider(...args:Parameters<native.NativeSceneDisplacementApi['mountSeatRider']>):ReturnType<native.NativeSceneDisplacementApi['mountSeatRider']>{this.#admit([args[0],args[1]]);return native.sceneMountSeatRider(this.host,...args);}
 mountUnlink(...args:Parameters<native.NativeSceneDisplacementApi['mountUnlink']>):ReturnType<native.NativeSceneDisplacementApi['mountUnlink']>{this.#admit([args[0]]);return native.sceneMountUnlink(this.host,...args);}
 mountUnhorse(...args:Parameters<native.NativeSceneDisplacementApi['mountUnhorse']>):ReturnType<native.NativeSceneDisplacementApi['mountUnhorse']>{this.#admit([args[0],args[1]]);return native.sceneMountUnhorse(this.host,...args);}
 mountWidowed(...args:Parameters<native.NativeSceneDisplacementApi['mountWidowed']>):ReturnType<native.NativeSceneDisplacementApi['mountWidowed']>{this.#admit([args[0]]);return native.sceneMountWidowed(this.host,...args);}
 movementLocked(...args:Parameters<native.NativeSceneDisplacementApi['movementLocked']>):ReturnType<native.NativeSceneDisplacementApi['movementLocked']>{this.#admit([args[0]],'stats');return native.sceneMovementLocked(this.host,...args);}
 castMoveFactor(...args:Parameters<native.NativeSceneDisplacementApi['castMoveFactor']>):ReturnType<native.NativeSceneDisplacementApi['castMoveFactor']>{this.#admit([args[0]],'stats');return native.sceneCastMoveFactor(this.host,...args);}
 channelMobility(...args:Parameters<native.NativeSceneDisplacementApi['channelMobility']>):ReturnType<native.NativeSceneDisplacementApi['channelMobility']>{this.#admit([args[0]],'stats');return native.sceneChannelMobility(this.host,...args);}
 levitating(...args:Parameters<native.NativeSceneDisplacementApi['levitating']>):ReturnType<native.NativeSceneDisplacementApi['levitating']>{this.#admit([args[0]],'stats');return native.sceneLevitating(this.host,...args);}
}
