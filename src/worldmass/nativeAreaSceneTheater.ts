import type {World} from '../engine/world';
import type {NativeSceneActorContext,NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import type {NativeAreaSceneEnvironment} from './nativeAreaSceneEnvironment';
import type {NativeAreaSceneEcology} from './nativeAreaSceneEcology';
import * as native from '../engine/nativeSceneTheater';
export type NativeSceneTheaterState=Pick<World,'theaterVisit'|'theaterSpots'|'theaterRuns'|'theaterPour'|'theaterAmbientBudget'>;
export type NativeSceneTheaterServices=Pick<World,'radianceCondHeld'|'geyserMode'|'imminentThreatTo'|'plantDressAt'|'dropGemAt'|'notice'|'moveActor'|'slipAway'>;
export interface NativeSceneTheaterInput {
 scene:NativeSceneActorContext; geometry:NativeAreaSceneGeometry; population:NativeAreaScenePopulation;
 environment:NativeAreaSceneEnvironment; ecology:NativeAreaSceneEcology;
 campaign:Pick<World,'sim'|'zoneMap'|'manifest'|'time'>;
 state:NativeSceneTheaterState; services:NativeSceneTheaterServices;
}
/** Complete original theater birth plus its full native controller contract.
 * Controller, reward, threat and movement services are required genuine owners;
 * this class does not replace them or borrow another standing World. */
export class NativeAreaSceneTheater {
 readonly input:NativeSceneTheaterInput;
 readonly host:native.NativeSceneTheaterHost;
 constructor(raw:NativeSceneTheaterInput){
  const roots=Object.create(null);
  for(const key of ['scene','geometry','population','environment','ecology','campaign','state','services']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native theater needs own object binding: '+key);
   roots[key]=d.value;
  }
  const input:NativeSceneTheaterInput=this.input=Object.freeze(roots);
  const same=(o:object,k:string,v:unknown)=>{const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value')||d.value!==v)throw Error('Native theater needs identical '+k+' owner');};
  same(input.geometry,'state',input.scene);
  for(const owner of [input.population,input.environment,input.ecology]){
   const d=Object.getOwnPropertyDescriptor(owner,'input');
   if(!d||!Object.hasOwn(d,'value')||!d.value)throw Error('Native theater needs actual owner input');
   same(d.value,'scene',input.scene);same(d.value,'geometry',input.geometry);
  }
  same(input.environment.input,'population',input.population);
  same(input.ecology.input,'population',input.population);
  same(input.ecology.input,'environment',input.environment.input.state);
  for(const key of ['theaterVisit','theaterSpots','theaterRuns','theaterPour','theaterAmbientBudget']){
   const d=Object.getOwnPropertyDescriptor(input.state,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native theater needs explicit '+key+' state');
  }
  const host={} as native.NativeSceneTheaterHost;
  const fields=(o:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){return(o() as Record<string,unknown>)[key];}});};
  const methods=(o:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){const owner=o() as Record<string,Function>,fn=owner[key];return(...args:unknown[])=>fn.apply(owner,args);}});};
  fields(()=>input.scene,['zone','actors']);fields(()=>input.geometry,['arena','walk','doodads','zoneEntry','exits']);
  fields(()=>input.campaign,['sim','zoneMap','manifest','time']);fields(()=>input.state,['theaterVisit','theaterSpots','theaterRuns','theaterPour','theaterAmbientBudget']);
  fields(()=>input.environment.input.state,['geysers']);fields(()=>input.services,['geyserMode']);
  methods(()=>input.geometry,['clampPos','pathField']);methods(()=>input.population,['createMonster']);
  methods(()=>input.population.input.sources.ambient,['weightedPick']);methods(()=>input.ecology,['actorById']);
  methods(()=>input.services,['radianceCondHeld','imminentThreatTo','plantDressAt','dropGemAt','notice','moveActor','slipAway']);
  methods(()=>this,['theaterContextNow','theaterConcurrencyNow','theaterPourRoom','theaterSpawn','spawnEventActor','clampNear','anyAliveWithTag','zoneEntryPos']);
  this.host=Object.freeze(host);for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false,enumerable:false});
 }
 theaterContextNow(...args:Parameters<World['theaterContextNow']>){return native.nativeTheaterContextNow(this.host,...args);}
 theaterConcurrencyNow(...args:Parameters<World['theaterConcurrencyNow']>){return native.nativeTheaterConcurrencyNow(this.host,...args);}
 theaterRunBeat(...args:Parameters<World['theaterRunBeat']>){return native.nativeTheaterRunBeat(this.host,...args);}
 theaterPourRoom(...args:Parameters<World['theaterPourRoom']>){return native.nativeTheaterPourRoom(this.host,...args);}
 theaterSpawn(...args:Parameters<World['theaterSpawn']>){return native.nativeTheaterSpawn(this.host,...args);}
 spawnEventActor(...args:Parameters<World['spawnEventActor']>){return native.nativeSpawnEventActor(this.host,...args);}
 clampNear(...args:Parameters<World['clampNear']>){return native.nativeClampNear(this.host,...args);}
 anyAliveWithTag(...args:Parameters<World['anyAliveWithTag']>){return native.nativeAnyAliveWithTag(this.host,...args);}
 zoneEntryPos(...args:Parameters<World['zoneEntryPos']>){return native.nativeZoneEntryPos(this.host,...args);}
}
