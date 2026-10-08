/** Birth-only mutable ecology owner. Local geometry and full actor census are
 * genuine owners; installed source and live campaign services remain explicit. */
import type { World } from '../engine/world';
import type { NativeSceneCensus, NativeAreaScenePopulation } from './nativeAreaScenePopulation';
import { LitePool } from '../engine/lite';
import * as native from '../engine/nativeSceneEcology';
const stateKeys=['lite','liteKinds','liteKindIdxMap','liteMaxR','liteBeatAt','liteOrders','liteXpAcc','liteKills','litePromoteBudget','litePockets','liteBurrows','liteWhenCueDraws','liteColonySeen','liteRegenClock','liteHasTrample','liteMinTrampleSpeed','liteVentRows','wellSeq'] as const;
export type NativeSceneEcologyState=Pick<native.NativeSceneEcologyHost,typeof stateKeys[number]>;
/** Exact fresh World field initializers. A transition carries the existing
 * state (especially the pool and monotonic well sequence), not this reset. */
export function freshSceneEcologyState():NativeSceneEcologyState {
 return {lite:new LitePool(),liteKinds:[],liteKindIdxMap:new Map(),liteMaxR:0,liteBeatAt:new Map(),liteOrders:new Map(),
  liteXpAcc:0,liteKills:new Map(),litePromoteBudget:0,litePockets:[],liteBurrows:[],liteWhenCueDraws:[],liteColonySeen:new Set(),
  liteRegenClock:0,liteHasTrample:false,liteMinTrampleSpeed:Infinity,liteVentRows:[],wellSeq:0};
}
export type NativeSceneEcologyGeometry=Pick<native.NativeSceneEcologyHost,
 'arena'|'arenaHull'|'walk'|'currentZoneSeed'|'doodads'|'interactSpot'|'clampPos'|'markDoodadsChanged'>;
export interface NativeSceneEcologyServices {
 readonly seats:World['seats']; readonly time:number;
 /** The actual run-long ledger, shared across all local areas and saves. */
 readonly throngClaimed:World['throngClaimed'];
 /** Area's true radiance context (local zone shelter/sky and campaign time). */
 radianceCondHeld:World['radianceCondHeld'];
}
export interface NativeSceneEcologyInput {
 scene:NativeSceneCensus; geometry:NativeSceneEcologyGeometry;
 population:NativeAreaScenePopulation; environment:Pick<World,'geysers'>;
 services:NativeSceneEcologyServices; sources:native.NativeSceneEcologySources; state:NativeSceneEcologyState;
}
export class NativeAreaSceneEcology {
 readonly input:NativeSceneEcologyInput;
 readonly host:native.NativeSceneEcologyHost;
 constructor(raw:NativeSceneEcologyInput) {
  const bindings=Object.create(null);
  for(const key of ['scene','geometry','population','environment','services','sources','state']) {
   const descriptor=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!descriptor||!Object.hasOwn(descriptor,'value'))throw Error('Native ecology requires own-data binding: '+key);
   bindings[key]=descriptor.value;
  }
  const input:NativeSceneEcologyInput=this.input=Object.freeze(bindings);
  if(input.population.input.scene!==input.scene || (input.population.input.geometry as object)!==input.geometry)
   throw Error('Ecology requires the same mutable scene and geometry as population');
  const host={} as native.NativeSceneEcologyHost,self=this;
  function fields(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,
   get(){return (provider() as Record<string,unknown>)[key];},set(value){(provider() as Record<string,unknown>)[key]=value;}});}
  function methods(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){
   const owner=provider() as Record<string,Function>,fn=owner[key];
   if(typeof fn!=='function')throw Error('Missing native ecology capability: '+key);
   return (...args:unknown[])=>fn.apply(owner,args);
  }});}
  fields(()=>input.state,stateKeys);fields(()=>input.scene,['zone','actors']);
  fields(()=>input.geometry,['arena','arenaHull','walk','currentZoneSeed','doodads']);
  fields(()=>input.environment,['geysers']);fields(()=>input.services,['time','seats','throngClaimed']);
  methods(()=>input.geometry,['interactSpot','clampPos','markDoodadsChanged']);
  methods(()=>input.population,['createMonster']);methods(()=>input.services,['radianceCondHeld']);
  methods(()=>self,['throngSources','mintThrongPocket','mintThrongHusk','liteKindOf','litePocketEnsure','liteOpenAt','liteCondHeld','litePocketPush','litePlantBurrow','geyserSurge','actorById']);
  this.host=Object.freeze(host);
  Object.defineProperty(this,'input',{value:input,writable:false,configurable:false,enumerable:false});
  Object.defineProperty(this,'host',{value:this.host,writable:false,configurable:false,enumerable:false});
 }
 bootThrong(...a:Parameters<World['bootThrong']>){return native.sceneBootThrong(this.host,...a);}
 throngSources(...a:Parameters<World['throngSources']>){return native.sceneThrongSources(this.host,...a);}
 mintThrongPocket(...a:Parameters<World['mintThrongPocket']>){return native.sceneMintThrongPocket(this.host,...a);}
 mintThrongHusk(...a:Parameters<World['mintThrongHusk']>){return native.sceneMintThrongHusk(this.host,...a);}
 bootLite(...a:Parameters<World['bootLite']>){return native.sceneBootLite(this.host,...a);}
 liteKindOf(...a:Parameters<World['liteKindOf']>){return native.sceneLiteKindOf(this.host,this.input.sources,...a);}
 liteOpenAt(...a:Parameters<World['liteOpenAt']>){return native.sceneLiteOpenAt(this.host,...a);}
 litePocketEnsure(...a:Parameters<World['litePocketEnsure']>){return native.sceneLitePocketEnsure(this.host,...a);}
 liteCondHeld(...a:Parameters<World['liteCondHeld']>){return native.sceneLiteCondHeld(this.host,...a);}
 bootLiteVentSeats(){return native.sceneBootLiteVentSeats(this.host);}
 litePlantBurrow(...a:Parameters<World['litePlantBurrow']>){return native.sceneLitePlantBurrow(this.host,...a);}
 litePocketPush(...a:Parameters<World['litePocketPush']>){return native.sceneLitePocketPush(this.host,...a);}
 attachZoneWells(){return native.sceneAttachZoneWells(this.host);}
 geyserSurge(){return native.sceneGeyserSurge(this.host);}
 actorById(...a:Parameters<World['actorById']>){return native.sceneActorById(this.host,...a);}
}
