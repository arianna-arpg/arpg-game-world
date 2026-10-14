import {nativeReadyPresence} from './nativeAreaScenePresence';
import {nativeReadyAuthority} from './nativeAreaActorAuthority';
/** Pure native cold-memory ownership over one actual born and admitted area. */
import type {World} from '../engine/world';
import {sceneZoneMemorySnapshot,sceneCaptureLiveMemory,type NativeZoneMemory,type NativeSceneMemorySnapshotHost,type NativeSceneMemoryCaptureHost} from '../engine/nativeSceneMemory';
import type {NativeAreaSceneAssembly} from './nativeAreaSceneAssembly';
import type {NativeAreaActorAuthority,NativeAreaAuthorityBinding} from './nativeAreaActorAuthority';
const nativeMemoryInputs=new WeakMap<object,Readonly<{definition:World['zone'];id:string;inCave:boolean}>>();
export function nativeReadyMemoryInputs(memory:object){return nativeMemoryInputs.get(memory);}
export class NativeAreaSceneMemory {
 readonly assembly:NativeAreaSceneAssembly;
 readonly authority:NativeAreaActorAuthority<object>;
 readonly host:NativeSceneMemorySnapshotHost;
 readonly captureHost:NativeSceneMemoryCaptureHost;
 readonly #definition:World['zone'];
 readonly #id:string;readonly #inCave:boolean;
 #binding?:NativeAreaAuthorityBinding<object>;
 constructor(assembly:NativeAreaSceneAssembly,authority:NativeAreaActorAuthority<object>){
  const input=assembly.input,campaign=input.coast.input.campaign;
  if(!Object.is(authority.campaign,input.campaign)||!Object.is(assembly.graph.input.campaign,campaign)||!Object.is(input.campaign,campaign))throw Error('Native memory needs identical campaign owners');
  this.assembly=assembly;this.authority=authority;this.#definition=input.scene.zone;this.#id=input.scene.zone.id;this.#inCave=assembly.transition.inCave;nativeMemoryInputs.set(this,Object.freeze({definition:this.#definition,id:this.#id,inCave:this.#inCave}));
  const host={} as NativeSceneMemorySnapshotHost;
  const fields=(get:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){return(get() as Record<string,unknown>)[key];}});};
  fields(()=>input.scene,['zone','actors']);
  fields(()=>assembly.transition,['inCave','charBorn']);
  fields(()=>campaign,['visited','time']);
  fields(()=>input.geometry,['doodads','currentZoneSeed','openedHollows']);
  fields(()=>input.objectives,['objectiveDone','objectiveLost','procession','wave','waveActive','spires','rifts','pyres','digs','offering','cull']);
  fields(()=>input.occurrences.input.state,['occs']);
  fields(()=>input.environment.input.state,['harvestNodes','puzzles']);
  fields(()=>input.openings.input.state,['annexOpen']);
  fields(()=>input.physical.input.state,['chests','shrines','altars','drops']);
  Object.defineProperty(host,'actorById',{enumerable:true,get(){const owner=input.registry.input.birth;return(...args:Parameters<World['actorById']>)=>owner.actorById(...args);}});
  this.host=Object.freeze(host);
  this.captureHost=Object.freeze({get zone(){return input.scene.zone;},get zoneMemory(){return campaign.zoneMemory;},zoneMemorySnapshot:()=>this.snapshot()});
  Object.defineProperties(this,{id:{enumerable:true,get:()=>this.#id},definition:{enumerable:true,get:()=>this.#definition},inCave:{enumerable:true,get:()=>this.#inCave}});
  for(const key of ['assembly','authority','host','captureHost'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 get definition(){return this.#definition;}
 get id(){return this.#id;}
 get inCave(){return this.#inCave;}
 /** Checking admission never acquires it or substitutes an active World scene. */
 assertReady():void{
  const {assembly,authority}=this,input=assembly.input,definition=this.#definition,campaign=input.coast.input.campaign;
  if(assembly.phase!=='born'||!assembly.scenePresence.active)throw Error('Native memory requires completed birth and explicit physical admission');
  if(definition.id!==this.#id||assembly.transition.inCave!==this.#inCave||input.scene.zone!==definition||(this.#inCave?campaign.caveMap:campaign.zoneMap)[this.#id]!==definition||([campaign.zoneMap[this.#id],campaign.caveMap[this.#id]].some(z=>z&&z!==definition)))throw Error('Native memory source identity changed');
  assembly.scenePresence.assertAuthority(authority);
  const binding=authority.bindingFor(input.scene);if(this.#binding&&this.#binding!==binding)throw Error('Native memory authority binding changed');
  authority.assertAdmitted(input.scene);this.#binding=binding;
 }
 /** Exact identity/binding write with one census, only under the coordinator
  * ordinary-read proof. No cached validity survives this synchronous call. */
 assertReadyFinal():void{
  const {assembly,authority}=this,input=assembly.input,definition=this.#definition,campaign=input.coast.input.campaign;
  if(assembly.phase!=='born'||!assembly.scenePresence.active)throw Error('Native memory requires completed birth and explicit physical admission');
  if(definition.id!==this.#id||assembly.transition.inCave!==this.#inCave||input.scene.zone!==definition||(this.#inCave?campaign.caveMap:campaign.zoneMap)[this.#id]!==definition||([campaign.zoneMap[this.#id],campaign.caveMap[this.#id]].some(z=>z&&z!==definition)))throw Error('Native memory source identity changed');
  const binding=authority.bindingFor(input.scene);Reflect.apply(nativeReadyPresence.identity,assembly.scenePresence,[authority,binding]);
  Reflect.apply(nativeReadyAuthority.physical,authority,[binding]);if(this.#binding&&this.#binding!==binding)throw Error('Native memory authority binding changed');this.#binding=binding;
 }
 snapshot():NativeZoneMemory|null{this.assertReady();return sceneZoneMemorySnapshot(this.host);}
 captureLiveMemory():void{this.assertReady();sceneCaptureLiveMemory(this.captureHost);}
}

export const nativeReadyMemory=NativeAreaSceneMemory.prototype.assertReady;

export const nativeReadyMemoryFinal=NativeAreaSceneMemory.prototype.assertReadyFinal;
