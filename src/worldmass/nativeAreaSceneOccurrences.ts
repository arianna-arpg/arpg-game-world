/** One area's actual occurrence census, terrain and deferred native callbacks. */
import type { World } from '../engine/world';
import type { NativeSceneCensus, NativeAreaScenePopulation } from './nativeAreaScenePopulation';
import type { NativeAreaSceneGeometry } from './nativeAreaSceneGeometry';
import { sceneOccurrenceHost, sceneOccurrenceSpawnTable, sceneAbortTraces, type NativeSceneOccurrenceHost, type NativeSceneTraceResetHost } from '../engine/nativeSceneOccurrences';
export interface NativeSceneOccurrenceState {
 occs:World['occs']; occDisturbs:World['occDisturbs'];
}
export function freshSceneOccurrenceState():NativeSceneOccurrenceState {
 return {occs:[],occDisturbs:[]};
}
export interface NativeSceneOccurrenceServices extends NativeSceneTraceResetHost {
 readonly time:number;
}
export interface NativeSceneOccurrenceInput {
 scene:NativeSceneCensus; geometry:NativeAreaSceneGeometry; population:NativeAreaScenePopulation;
 services:NativeSceneOccurrenceServices; state:NativeSceneOccurrenceState;
}
export class NativeAreaSceneOccurrences {
 #occHostObj:World['occHostObj'];
 readonly input:NativeSceneOccurrenceInput;
 readonly host:NativeSceneOccurrenceHost;
 constructor(raw:NativeSceneOccurrenceInput) {
  const bindings=Object.create(null);
  for(const key of ['scene','geometry','population','services','state']) {
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native occurrences require own object binding: '+key);
   bindings[key]=d.value;
  }
  const input:NativeSceneOccurrenceInput=this.input=Object.freeze(bindings);
  if(input.geometry.state!==input.scene||input.population.input.scene!==input.scene||input.population.input.geometry!==input.geometry)
   throw Error('Native occurrences require the same mutable scene, geometry and population');
  const cache=Object.getOwnPropertyDescriptor(input.state,'occHostObj');
  if(cache&&(!Object.hasOwn(cache,'value')||cache.value!==undefined))throw Error('Native occurrence callback cache cannot transfer between owners');
  const host={} as NativeSceneOccurrenceHost,self=this;
  Object.defineProperty(host,'occHostObj',{enumerable:true,get(){return self.#occHostObj;},set(value){self.#occHostObj=value;}});
  function fields(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,
   get(){return (provider() as Record<string,unknown>)[key];},set(value){(provider() as Record<string,unknown>)[key]=value;}});}
  function methods(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){
   const owner=provider() as Record<string,Function>,fn=owner[key];return (...args:unknown[])=>fn.apply(owner,args);
  }});}
  fields(()=>input.state,['occDisturbs']);fields(()=>input.scene,['zone','player','actors']);
  fields(()=>input.geometry,['doodads','shake','flashes']);fields(()=>input.services,['time']);
  methods(()=>input.geometry,['markDoodadsChanged','clampPos']);methods(()=>input.population,['createMonster']);
  methods(()=>input.population.input.sources.ambient,['weightedPick']);methods(()=>this,['massOccurrenceSpawnTable']);
  this.host=Object.freeze(host);
  for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false,enumerable:false});
 }
 get occs(){return this.input.state.occs;} set occs(value:World['occs']){this.input.state.occs=value;}
 occHost(){return sceneOccurrenceHost(this.host);}
 massOccurrenceSpawnTable(...args:Parameters<World['massOccurrenceSpawnTable']>){return sceneOccurrenceSpawnTable(...args);}
 traceAbortAll(){return sceneAbortTraces(this.input.services);}
}
