/** Native seed and held-settlement layout owner; does not admit a complete area. */
import type { NativeSceneActorContext, NativeAreaSceneGeometry } from './nativeAreaSceneGeometry';
import type { Vec2 } from '../core/math';
import * as native from '../engine/nativeLayoutGeneration';
export type NativeLayoutGenerationState=Pick<native.NativeLayoutGenerationHost,'inCave'|'charBorn'|'charRegrowAcc'|'crusadeWorksAt'>;
export type NativeLayoutGenerationCampaign=Pick<native.NativeLayoutGenerationHost,'zoneMemory'|'time'|'sim'>;
export interface NativeLayoutGenerationInput {
 scene:NativeSceneActorContext;
 geometry:Pick<NativeAreaSceneGeometry,'state'|'arena'|'exits'|'currentZoneSeed'|'farPointDraws'>;
 state:NativeLayoutGenerationState;
 campaign:NativeLayoutGenerationCampaign;
}
export class NativeAreaSceneGeneration {
 readonly input:NativeLayoutGenerationInput;
 readonly host:native.NativeLayoutGenerationHost;
 constructor(raw:NativeLayoutGenerationInput){
  const bindings=Object.create(null);
  for(const key of ['scene','geometry','state','campaign']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native generation needs own object binding: '+key);
   bindings[key]=d.value;
  }
  const input:NativeLayoutGenerationInput=this.input=Object.freeze(bindings);
  const identity=Object.getOwnPropertyDescriptor(input.geometry,'state');
  if(!identity||!Object.hasOwn(identity,'value')||identity.value!==input.scene)throw Error('Native generation geometry/census identity differs');
  const host={} as native.NativeLayoutGenerationHost,self=this;
  function fields(provider:()=>object,keys:readonly string[],writable=false){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,
   get(){return(provider() as Record<string,unknown>)[key];},...(writable?{set(value:unknown){(provider() as Record<string,unknown>)[key]=value;}}:{})});}
  fields(()=>input.geometry,['arena','exits']);fields(()=>input.geometry,['currentZoneSeed','farPointDraws'],true);
  fields(()=>input.campaign,['zoneMemory','time','sim']);fields(()=>input.state,['inCave']);
  fields(()=>input.state,['charBorn','charRegrowAcc','crusadeWorksAt'],true);
  for(const key of ['zoneMemoryFresh','crusadeFixtureSpecs'])Object.defineProperty(host,key,{enumerable:true,get(){
   const owner=self as unknown as Record<string,Function>,fn=owner[key];return(...args:unknown[])=>fn.apply(owner,args);
  }});
  this.host=Object.freeze(host);
  Object.defineProperty(this,'host',{enumerable:false,writable:false,configurable:false});
  Object.defineProperty(this,'input',{enumerable:false,writable:false,configurable:false});
 }
 zoneMemoryFresh(...args:Parameters<typeof native.nativeZoneMemoryFresh> extends [unknown,...infer A]?A:never){return native.nativeZoneMemoryFresh(this.host,...args);}
 crusadeFixtureSpecs(...args:Parameters<typeof native.nativeCrusadeFixtureSpecs> extends [unknown,...infer A]?A:never){return native.nativeCrusadeFixtureSpecs(this.host,...args);}
 generate(entry:Vec2){const def=this.input.scene.zone;return native.generateNativeAreaLayout(this.host,def,entry,def.id);}
}
