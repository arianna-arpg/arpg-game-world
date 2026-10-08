import type {World} from '../engine/world';
import type {NativeSceneActorContext,NativeAreaSceneGeometry} from '../worldmass/nativeAreaSceneGeometry';
import type {NativeAreaScenePopulation} from '../worldmass/nativeAreaScenePopulation';
import * as native from '../engine/nativeSceneEncounterBirth';
export interface NativeSceneEncounterBirthState { encounters:World['encounters']; encRng:World['encRng']; inCave:World['inCave'] }
export interface NativeSceneEncounterBirthInput {
 scene:NativeSceneActorContext; geometry:NativeAreaSceneGeometry; population:NativeAreaScenePopulation;
 campaign:Pick<World,'sim'|'manifest'>; state:NativeSceneEncounterBirthState;
}
/** Complete original placement and materialization with genuine local geometry,
 * census and factory. The retained winner RNG belongs to subsequent controllers;
 * this owner does not run those controllers or supply their reward execution. */
export class NativeAreaSceneEncounterBirth {
 readonly input:NativeSceneEncounterBirthInput;
 readonly host:native.NativeSceneEncounterBirthHost;
 constructor(raw:NativeSceneEncounterBirthInput){
  const roots=Object.create(null);
  for(const key of ['scene','geometry','population','campaign','state']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native encounter birth needs own object binding: '+key);
   roots[key]=d.value;
  }
  const input:NativeSceneEncounterBirthInput=this.input=Object.freeze(roots);
  const same=(o:object,k:string,v:unknown)=>{const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value')||d.value!==v)throw Error('Native encounter birth needs identical '+k+' owner');};
  same(input.geometry,'state',input.scene);
  const pi=Object.getOwnPropertyDescriptor(input.population,'input');
  if(!pi||!Object.hasOwn(pi,'value')||!pi.value)throw Error('Native encounter birth needs actual population input');
  same(pi.value,'scene',input.scene);same(pi.value,'geometry',input.geometry);
  for(const key of ['encounters','encRng','inCave']){const d=Object.getOwnPropertyDescriptor(input.state,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native encounter birth needs explicit '+key+' state');}
  const host={} as native.NativeSceneEncounterBirthHost;
  const fields=(o:()=>object,keys:readonly string[],write=false)=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){return(o() as Record<string,unknown>)[key];},...(write?{set(v:unknown){(o() as Record<string,unknown>)[key]=v;}}:{})});};
  const methods=(o:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){const owner=o() as Record<string,Function>,fn=owner[key];return(...args:unknown[])=>fn.apply(owner,args);}});};
  fields(()=>input.scene,['zone','actors','player']);fields(()=>input.geometry,['doodads']);
  fields(()=>input.campaign,['sim','manifest']);fields(()=>input.state,['encounters','inCave']);fields(()=>input.state,['encRng'],true);
  methods(()=>input.geometry,['clampPos','farPoint','findFreeSpot']);methods(()=>input.population,['createMonster']);
  methods(()=>input.population.input.sources.ambient,['weightedPick']);methods(()=>this,['eventDensityFor','materializeExtractionNode','materializeBorough','rollExtractTemper']);
  this.host=Object.freeze(host);for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false,enumerable:false});
 }
 placeEncounters(...args:Parameters<World['placeEncounters']>){return native.encounterBirthPlaceEncounters(this.host,...args);}
 eventDensityFor(...args:Parameters<World['eventDensityFor']>){return native.encounterBirthEventDensityFor(this.host,...args);}
 materializeExtractionNode(...args:Parameters<World['materializeExtractionNode']>){return native.encounterBirthMaterializeExtractionNode(this.host,...args);}
 materializeBorough(...args:Parameters<World['materializeBorough']>){return native.encounterBirthMaterializeBorough(this.host,...args);}
 rollExtractTemper(...args:Parameters<World['rollExtractTemper']>){return native.encounterBirthRollExtractTemper(this.host,...args);}
}
