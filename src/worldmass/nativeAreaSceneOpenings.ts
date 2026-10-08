/** Complete local opening dispatch over genuine mutable geometry and population.
 * Reward execution and campaign ledgers remain mandatory live authorities. */
import type {World} from '../engine/world';
import type {NativeSceneActorContext,NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import {openNativeHollow,revealNativeAnnex,furnishNativeAnnex,activateNativeAnnex,type NativeSceneOpeningHost} from '../engine/nativeSceneOpenings';
export type NativeSceneOpeningGeometry=Pick<NativeAreaSceneGeometry,
 'state'|'openedHollows'|'zoneHollows'|'walk'|'doodads'|'flashes'|'caveEntrances'|'arena'|'zoneAnnexSpecs'|'markDoodadsChanged'|'clampPos'> & {arenaHull:World['arenaHull']};
export interface NativeSceneOpeningState {annexOpen:World['annexOpen']}
export interface NativeSceneOpeningCampaign extends Pick<World,'annexFound'|'zoneMap'|'caveMap'> {zoneMemory:World['zoneMemory']}
export interface NativeSceneOpeningRewards extends Pick<World,'dropGemAt'|'shedOrb'|'text'> {}
export interface NativeSceneOpeningInput {
 scene:NativeSceneActorContext;
 geometry:NativeSceneOpeningGeometry;
 population:NativeAreaScenePopulation;
 state:NativeSceneOpeningState;
 campaign:NativeSceneOpeningCampaign;
 rewards:NativeSceneOpeningRewards;
}
export class NativeAreaSceneOpenings {
 readonly input:NativeSceneOpeningInput;
 readonly host:NativeSceneOpeningHost;
 constructor(raw:NativeSceneOpeningInput){
  const roots=Object.create(null);
  for(const key of ['scene','geometry','population','state','campaign','rewards']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native openings need own object binding: '+key);
   roots[key]=d.value;
  }
  const input:NativeSceneOpeningInput=this.input=Object.freeze(roots);
  const same=(o:object,k:string,v:unknown)=>{const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value')||d.value!==v)throw Error('Native openings need identical '+k+' owner');};
  same(input.geometry,'state',input.scene);
  const pi=Object.getOwnPropertyDescriptor(input.population,'input');
  if(!pi||!Object.hasOwn(pi,'value')||!pi.value)throw Error('Native openings need actual population input');
  same(pi.value,'scene',input.scene);same(pi.value,'geometry',input.geometry);
  const hull=Object.getOwnPropertyDescriptor(input.geometry,'arenaHull');
  if(!hull||!Object.hasOwn(hull,'value')||!hull.writable)throw Error('Native annex openings need writable geometry hull');
  const state=Object.getOwnPropertyDescriptor(input.state,'annexOpen');
  if(!state||!Object.hasOwn(state,'value')||!(state.value instanceof Set))throw Error('Native openings need explicit native annex ledger');
  const host={} as NativeSceneOpeningHost;
  const fields=(o:()=>object,keys:readonly string[],write=false)=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){return (o() as Record<string,unknown>)[key];},...(write?{set(v:unknown){(o() as Record<string,unknown>)[key]=v;}}:{})});};
  const methods=(o:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){const owner=o() as Record<string,Function>,fn=owner[key];if(typeof fn!=='function')throw Error('Missing native opening capability: '+key);return (...args:unknown[])=>fn.apply(owner,args);}});};
  fields(()=>input.scene,['zone','actors']);
  fields(()=>input.geometry,['openedHollows','zoneHollows','walk','doodads','flashes','caveEntrances','arena','zoneAnnexSpecs']);fields(()=>input.geometry,['arenaHull'],true);
  fields(()=>input.state,['annexOpen']);fields(()=>input.campaign,['annexFound','zoneMap','caveMap','zoneMemory']);
  methods(()=>input.geometry,['markDoodadsChanged','clampPos']);methods(()=>input.population,['createMonster']);
  methods(()=>input.population.input.sources.ambient,['weightedPick']);methods(()=>input.rewards,['dropGemAt','shedOrb','text']);
  methods(()=>this,['annexFurnish','annexReveal']);
  this.host=Object.freeze(host);
  for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false,enumerable:false});
 }
 openHollow(...args:Parameters<World['openHollow']>){return openNativeHollow(this.host,...args);}
 annexReveal(...args:Parameters<NativeSceneOpeningHost['annexReveal']>){return revealNativeAnnex(this.host,...args);}
 annexFurnish(...args:Parameters<NativeSceneOpeningHost['annexFurnish']>){return furnishNativeAnnex(this.host,...args);}
 annexActivate(...args:Parameters<World['annexActivate']>){return activateNativeAnnex(this.host,...args);}
}
