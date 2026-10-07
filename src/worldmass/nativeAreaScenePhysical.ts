import type {World} from '../engine/world';
import type {NativeSceneCensus,NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaSceneSettlement} from './nativeAreaSceneSettlement';
import {syncAltarBodies,type NativeAltarBodyHost} from '../engine/altarBodies';
import {syncTrainingYard,type NativeTrainingYardHost} from '../engine/trainingYard';
import {captureZoneContents,restoreZoneContents,type NativeZoneContentsHost,type ZoneContents} from '../engine/zonecontents';
export interface NativeScenePhysicalState extends NativeZoneContentsHost {}
export function freshScenePhysicalState():NativeScenePhysicalState{return {chests:[],shrines:[],altars:[],drops:[]};}
export interface NativeScenePhysicalInput {
 scene:NativeSceneCensus;geometry:NativeAreaSceneGeometry;population:NativeAreaScenePopulation;settlement:NativeAreaSceneSettlement;
 campaign:Pick<World,'account'|'clientActionHook'>;state:NativeScenePhysicalState;
}
export interface NativeScenePhysicalHost extends NativeAltarBodyHost,NativeTrainingYardHost,NativeZoneContentsHost {}
/** One stable identity for the original altar/backstop WeakMaps. Data arrays stay
 * live and replaceable; memory replay occurs only when native birth requests it.
 * The caller supplies the real scene content state and real campaign account. */
export class NativeAreaScenePhysical {
 readonly input:NativeScenePhysicalInput;readonly host:NativeScenePhysicalHost;
 constructor(raw:NativeScenePhysicalInput){
  const bindings=Object.create(null);
  for(const key of ['scene','geometry','population','settlement','campaign','state']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native physical birth requires own object binding: '+key);
   bindings[key]=d.value;
  }
  const input:NativeScenePhysicalInput=this.input=Object.freeze(bindings);
  if(input.geometry.state!==input.scene||input.population.input.scene!==input.scene||input.population.input.geometry!==input.geometry
   ||input.settlement.input.scene!==input.scene||input.settlement.input.geometry!==input.geometry)
   throw Error('Native physical birth requires identical scene, geometry, population and seating');
  const host={} as NativeScenePhysicalHost;
  function fields(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,
   get(){return (provider() as Record<string,unknown>)[key];},set(value){(provider() as Record<string,unknown>)[key]=value;}});}
  function methods(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){
   const owner=provider() as Record<string,Function>,fn=owner[key];return (...args:unknown[])=>fn.apply(owner,args);
  }});}
  fields(()=>input.scene,['zone','player','actors']);fields(()=>input.geometry,['doodads']);
  fields(()=>input.state,['chests','shrines','altars','drops']);fields(()=>input.campaign,['account','clientActionHook']);
  methods(()=>input.population,['createMonster']);methods(()=>input.geometry,['clampPos','markDoodadsChanged']);methods(()=>input.settlement,['townSeat']);
  this.host=Object.freeze(host);
  for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false,enumerable:false});
 }
 syncAltarBodies(){return syncAltarBodies(this.host);}
 captureZoneContents(){return captureZoneContents(this.host);}
 restoreZoneContents(contents:ZoneContents){return restoreZoneContents(this.host,contents);}
 syncTrainingYard(){return syncTrainingYard(this.host);}
}
