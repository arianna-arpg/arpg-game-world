/** Area-local complete registry. Its scene state survives chunk residency changes. */

import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaSceneRuntimeBirth} from './nativeAreaSceneRuntimeBirth';
import type {NativeAreaSceneTitans} from './nativeAreaSceneTitans';
import type {NativeSceneDescentState} from './nativeAreaSceneDescent';
import {buildNativeSceneRuntimes,materializeNativeLiveZoneEvents,type NativeSceneRuntimeRegistryHost,type NativeSceneRuntimeRow} from '../engine/nativeSceneRuntimeRegistry';
const stateKeys=["materializedDeadwakes","deadwakeStreamTimer","materializedDocks","materializedMigrations","migrationStreamTimer","wbWalls","wbPassing","wbPassingKey","wbPassingGoal","materializedHaunts","hauntStreamTimer","materializedStrayings","strayScene","materializedDroves","droveScene","droveDressChecked","materializedWisplights","wispScene","materializedLongNights","longNightStreamTimer","extractionDepartures","holdDefense","holdDwellRequested","boroughRefugees","boroughArmRequested","boroughArmFolkId","materializedBrigands","brigandLingerLeft","brigandsDrifting","swarmStreamTimer","holdfastDwellKey","huntFootprintDwell","amalgamNecroDwell","amalgamPickDwell","descentShaftDwell"] as const;
export type NativeSceneRuntimeRegistryState=Pick<NativeSceneRuntimeRegistryHost,typeof stateKeys[number]>;
/** First construction only. Carry these same roots into controllers and restores. */
export function freshSceneRuntimeRegistryState():NativeSceneRuntimeRegistryState{return {
materializedDeadwakes:new Set(),
deadwakeStreamTimer:0,
materializedDocks:new Set(),
materializedMigrations:new Set(),
migrationStreamTimer:0,
wbWalls:new Map(),
wbPassing:null,
wbPassingKey:'',
wbPassingGoal:null,
materializedHaunts:new Set(),
hauntStreamTimer:0,
materializedStrayings:new Set(),
strayScene:null,
materializedDroves:new Set(),
droveScene:null,
droveDressChecked:null,
materializedWisplights:new Set(),
wispScene:null,
materializedLongNights:new Set(),
longNightStreamTimer:0,
extractionDepartures:[],
holdDefense:null,
holdDwellRequested:false,
boroughRefugees:[],
boroughArmRequested:false,
boroughArmFolkId:-1,
materializedBrigands:new Set(),
brigandLingerLeft:0,
brigandsDrifting:false,
swarmStreamTimer:0,
holdfastDwellKey:'',
huntFootprintDwell:0,
amalgamNecroDwell:0,
amalgamPickDwell:[],
descentShaftDwell:0
};}
export interface NativeSceneRuntimeRegistryInput {scene:NativeSceneCensus;geometry:NativeAreaSceneGeometry;birth:NativeAreaSceneRuntimeBirth;titans:NativeAreaSceneTitans;descentState:NativeSceneDescentState;state:NativeSceneRuntimeRegistryState}
export class NativeAreaSceneRuntimeRegistry {
 readonly input:NativeSceneRuntimeRegistryInput;readonly host:NativeSceneRuntimeRegistryHost;readonly rows:NativeSceneRuntimeRow[];
 constructor(raw:NativeSceneRuntimeRegistryInput){
  const roots=Object.create(null);for(const key of ['scene','geometry','birth','titans','descentState','state']){const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native runtime registry needs own object binding: '+key);roots[key]=d.value;}
  const input:NativeSceneRuntimeRegistryInput=this.input=Object.freeze(roots);
  const same=(o:object,k:string,value:unknown)=>{const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value')||d.value!==value)throw Error('Native runtime registry needs identical '+k+' owner');};
  same(input.geometry,'state',input.scene);for(const part of [input.birth,input.titans]){const d=Object.getOwnPropertyDescriptor(part,'input');if(!d||!Object.hasOwn(d,'value')||!d.value)throw Error('Native runtime registry needs genuine owner input');same(d.value,'scene',input.scene);same(d.value,'geometry',input.geometry);}
  same(input.titans.input,'population',input.birth.input.population);
  if(input.titans.input.campaign.sim!==input.birth.input.campaign.sim||input.titans.input.campaign.ledger!==input.birth.input.campaign.ledger)throw Error('Native runtime registry needs identical campaign simulation and ledger');
  for(const key of stateKeys){const d=Object.getOwnPropertyDescriptor(input.state,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native runtime registry needs carried state: '+key);}
  for(const key of ['inCave','descentStock','descentSpawnTimer']){const d=Object.getOwnPropertyDescriptor(input.descentState,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native runtime registry needs carried descent state: '+key);}
  const host={} as NativeSceneRuntimeRegistryHost;
  const fields=(get:()=>object,keys:readonly string[],write=false)=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){return(get() as Record<string,unknown>)[key];},...(write?{set(value:unknown){(get() as Record<string,unknown>)[key]=value;}}:{})});};
  const methods=(get:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){const provider=get() as Record<string,Function>,fn=provider[key];return(...args:unknown[])=>fn.apply(provider,args);}});};
  fields(()=>input.scene,['zone']);fields(()=>input.birth.host,['sim','inCave']);
  fields(()=>input.birth.input.state,["materializedHosts","warbandMarches","materializedEpicenters","materializedCrusades","materializedHellWar","materializedWorldBoss","wbBoss","wbBossKey","materializedContagion","materializedDeepwinter","materializedInfestation","materializedBroods","materializedSwarmWake","materializedCandle","materializedStarfall","materializedMycelia","materializedHoldfasts","holdfastSite","materializedUnsealing","unsealingSite","huntFootprint","huntBeast","materializedHunts","fractureRun","materializedFractures","ritualSite","materializedRituals","amalgamSite","materializedAmalgam","materializedAmalgamMobs","materializedObservers","materializedWrits"],true);
  methods(()=>input.birth,["placeAscentGeyser","spawnWarband","spawnEpicenter","materializeCrusade","spawnHellCourt","spawnHellMarshal","materializeWorldBossFight","materializeContagion","materializeDeepwinter","materializeInfestation","materializeBrood","materializeSwarmWake","materializeCandle","materializeStarfall","materializeMycelia","placeHoldfast","materializeUnsealing","placeHuntContent","placeFractureContent","placeFractureRiftContent","placeRitualSite","placeAmalgamation","placeAmalgamMiniboss","materializeObserver","springVendettaAmbush","placeCaravanReturn"]);
  fields(()=>input.geometry,["demonPortals","crusadePortals","necropolisPortals","fractureRifts","descentSite","eventAnchors"],true);fields(()=>input.state,stateKeys,true);fields(()=>input.descentState,['descentSpawnTimer'],true);
  Object.defineProperty(host,'titans',{enumerable:true,get(){return input.titans.runtime;}});Object.defineProperty(host,'zoneRuntimes',{enumerable:true,get:()=>this.rows});
  this.host=Object.freeze(host);this.rows=buildNativeSceneRuntimes(host);for(const key of ['input','host','rows'])Object.defineProperty(this,key,{enumerable:false,writable:false,configurable:false});
 }
 materializeLiveZoneEvents(){return materializeNativeLiveZoneEvents(this.host);}
}
