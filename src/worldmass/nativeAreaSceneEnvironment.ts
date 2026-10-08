/** Mutable native environment state. Birth resets the same collections at the
 * same sites as classic World; callers keep the owner across later updates. */
import type { World } from '../engine/world';
import type { NativeSceneCensus } from './nativeAreaScenePopulation';
import * as native from '../engine/nativeSceneEnvironment';
export type NativeSceneEnvironmentState=Pick<native.NativeSceneEnvironmentHost,
 'puzzles'|'puzzleKnocks'|'puzzleHostCache'|'harvestSessions'|'harvestDwell'|'harvestOffer'|'harvestNodes'|'geysers'|'geyserSweepAcc'|'geyserPocks'>;
export function freshSceneEnvironmentState():NativeSceneEnvironmentState {
 return {puzzles:[],puzzleKnocks:[],puzzleHostCache:null,harvestSessions:[],harvestDwell:new Map(),harvestOffer:new Map(),harvestNodes:[],geysers:null,geyserSweepAcc:0,geyserPocks:[]};
}
export type NativeSceneEnvironmentGeometry=Pick<native.NativeSceneEnvironmentHost,
 'currentZoneSeed'|'interactSpot'|'clampPos'|'doodads'|'walk'|'pointInSolid'|'markDoodadsChanged'|'creep'|'arena'|'flashes'>;
export interface NativeSceneEnvironmentServices {
 readonly time:number;
 readonly objectiveDone:boolean;
 readonly timeflow:Pick<World['timeflow'],'release'>;
 /** Real puzzle rewards/controller owner. Deferred by the exact puzzle closure;
  * birth neither substitutes an empty handler nor borrows a standing World. */
 completePuzzle:World['completePuzzle'];
}
export interface NativeSceneEnvironmentInput {
 scene:NativeSceneCensus;
 geometry:NativeSceneEnvironmentGeometry;
 population:Pick<native.NativeSceneEnvironmentHost,'createMonster'>;
 services:NativeSceneEnvironmentServices;
 sources:native.NativeSceneEnvironmentSources;
 state:NativeSceneEnvironmentState;
}
/** Exact birth operations over one mutable native census and geometry owner.
 * No implicit merging of these stages: the full birth spine decides their order. */
export class NativeAreaSceneEnvironment {
 readonly host:native.NativeSceneEnvironmentHost;
 readonly input:NativeSceneEnvironmentInput;
 constructor(raw:NativeSceneEnvironmentInput) {
  const bindings=Object.create(null);
  for(const key of ['scene','geometry','population','services','sources','state']) {
   const descriptor=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.value||typeof descriptor.value!=='object')
    throw Error('Native environment needs an own object binding: '+key);
   bindings[key]=descriptor.value;
  }
  const input:NativeSceneEnvironmentInput=this.input=Object.freeze(bindings);
  const host={} as native.NativeSceneEnvironmentHost, self=this;
  function fields(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,
   get(){return (provider() as Record<string,unknown>)[key];},set(value){(provider() as Record<string,unknown>)[key]=value;}});}
  function methods(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){
   const owner=provider() as Record<string,Function>,fn=owner[key];return (...args:unknown[])=>fn.apply(owner,args);
  }});}
  fields(()=>input.state,['puzzles','puzzleKnocks','puzzleHostCache','harvestSessions','harvestDwell','harvestOffer','harvestNodes','geysers','geyserSweepAcc','geyserPocks']);
  fields(()=>input.scene,['zone','actors','player']);
  fields(()=>input.geometry,['currentZoneSeed','doodads','walk','creep','arena','flashes']);
  fields(()=>input.services,['time','objectiveDone','timeflow']);
  methods(()=>input.geometry,['interactSpot','clampPos','pointInSolid','markDoodadsChanged']);
  methods(()=>input.population,['createMonster']);methods(()=>input.services,['completePuzzle']);
  methods(()=>self,['puzzleHost','setPuzzleTone','harvestRowPick']);
  this.host=Object.freeze(host);
  Object.defineProperty(this,'host',{writable:false,configurable:false});
  Object.defineProperty(this,'input',{writable:false,configurable:false});
 }
 bootScenery(...args:Parameters<World['bootScenery']>){return native.sceneBootScenery(this.host,this.input.sources,...args);}
 bootPuzzles(...args:Parameters<World['bootPuzzles']>){return native.sceneBootPuzzles(this.host,...args);}
 bootHarvest(...args:Parameters<World['bootHarvest']>){return native.sceneBootHarvest(this.host,...args);}
 bootGeysers(...args:Parameters<World['bootGeysers']>){return native.sceneBootGeysers(this.host,...args);}
 bootEscapeChase(){return native.sceneBootEscapeChase(this.host);}
 harvestRowPick(...args:Parameters<World['harvestRowPick']>){return native.sceneHarvestRowPick(this.host,...args);}
 puzzleHost(...args:Parameters<World['puzzleHost']>){return native.scenePuzzleHost(this.host,...args);}
 setPuzzleTone(...args:Parameters<World['setPuzzleTone']>){return native.sceneSetPuzzleTone(this.host,...args);}
}
