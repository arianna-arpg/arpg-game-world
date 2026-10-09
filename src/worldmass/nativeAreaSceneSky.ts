/** Sky over a complete native area. The actual environment root is available
 * before geometry/ecology construction, closing their radiance dependency
 * without a temporary clear-sky callback or a borrowed standing World. */
import type {World} from '../engine/world';
import type {Vec2} from '../core/math';
import type {RadianceCond} from '../world/radiance';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import type {NativeSceneEnvironmentState} from './nativeAreaSceneEnvironment';
import {sceneGeyserSurge} from '../engine/nativeSceneEcology';
import {nativeSkyFront,nativeRadiance,nativeRadianceCondHeld,type NativeSceneSkyHost} from '../engine/nativeSceneSky';
export interface NativeSceneSkyInput {
 scene:NativeSceneCensus;
 environment:NativeSceneEnvironmentState;
 campaign:Pick<World,'sim'|'time'>;
}
export class NativeAreaSceneSky {
 readonly input:NativeSceneSkyInput;readonly host:NativeSceneSkyHost;
 constructor(raw:NativeSceneSkyInput){
  const roots=Object.create(null);
  for(const key of ['scene','environment','campaign']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native sky needs own object binding: '+key);
   roots[key]=d.value;
  }
  const input:NativeSceneSkyInput=this.input=Object.freeze(roots);
  for(const [owner,keys]of [[input.scene,['zone','player','actors']],[input.environment,['geysers']],[input.campaign,['sim','time']]] as const)
   for(const key of keys)if(!Object.hasOwn(owner,key))throw Error('Native sky needs explicit live field: '+key);
  const surge={get geysers(){return input.environment.geysers;},get time(){return input.campaign.time;}};
  this.host=Object.freeze({
   get player(){return input.scene.player;},get zone(){return input.scene.zone;},
   get sim(){return input.campaign.sim;},get time(){return input.campaign.time;},
   // This owner belongs to a complete native definition. Geographic World sky
   // retains its own early-return branch in the shared operation.
   massRuntime:null,
   localZoneAt:()=>input.scene.zone,
   geyserSurge:()=>sceneGeyserSurge(surge),
   get skyFront(){const owner=thisOwner,fn=owner.skyFront;return(...args:Parameters<typeof fn>)=>fn.apply(owner,args);},
  });
  const thisOwner=this;
  for(const key of ['input','host'])Object.defineProperty(this,key,{enumerable:false,writable:false,configurable:false});
 }
 skyFront(pos:Vec2=this.input.scene.player.pos){return nativeSkyFront(this.host,pos);}
 radiance(){return nativeRadiance(this.host);}
 radianceCondHeld(cond:RadianceCond|undefined){return nativeRadianceCondHeld(this.host,cond);}
}

const skyBindings=new WeakMap<object,NativeAreaSceneSky>();
/** Install real local sky before dependent owners. Keep native method selection. */
export function bindNativeSceneSky<T extends object>(services:T,sky:NativeAreaSceneSky):T&Pick<World,'radianceCondHeld'> {
 if(Object.hasOwn(services,'radianceCondHeld'))throw Error('Native sky binding would replace an existing service');
 Object.defineProperty(services,'radianceCondHeld',{enumerable:true,get(){const fn=sky.radianceCondHeld;return(...args:Parameters<typeof fn>)=>fn.apply(sky,args);}});
 skyBindings.set(services,sky);return services as T&Pick<World,'radianceCondHeld'>;
}
export function hasNativeSceneSkyBinding(services:object,sky:NativeAreaSceneSky):boolean{return skyBindings.get(services)===sky;}
