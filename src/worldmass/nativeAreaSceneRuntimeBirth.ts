import type {World} from '../engine/world';
import {Rng} from '../core/rng';
import type {NativeSceneCensus,NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaSceneGeneration} from './nativeAreaSceneGeneration';
import type {NativeAreaSceneTheater} from './nativeAreaSceneTheater';
import * as native from '../engine/nativeSceneRuntimeBirth';
const stateKeys=["materializedHosts","warbandMarches","materializedEpicenters","materializedCrusades","materializedHellWar","materializedWorldBoss","wbBoss","wbBossKey","materializedContagion","materializedDeepwinter","materializedInfestation","materializedBroods","materializedSwarmWake","materializedCandle","materializedStarfall","materializedMycelia","materializedHoldfasts","holdfastSite","materializedUnsealing","unsealingSite","huntFootprint","materializedFractures","fractureRng","fractureRun","materializedRituals","ritualSite","materializedAmalgam","amalgamSite","materializedAmalgamMobs","materializedObservers","materializedWrits","contagionLeans","dwIceArr","dwIceLen","dwIceRev","materializedHunts","huntBeast"] as const;
export type NativeSceneRuntimeBirthState=Pick<native.NativeSceneRuntimeBirthHost,typeof stateKeys[number]>;
/** Exact fresh World roots; transitions must carry their prior objects and random cursor. */
export function freshSceneRuntimeBirthState():NativeSceneRuntimeBirthState {return {
materializedHosts:new Set(),
warbandMarches:[],
materializedEpicenters:new Set(),
materializedCrusades:new Set(),
materializedHellWar:new Set(),
materializedWorldBoss:new Set(),
wbBoss:null,
wbBossKey:'',
materializedContagion:new Set(),
materializedDeepwinter:new Set(),
materializedInfestation:new Set(),
materializedBroods:new Set(),
materializedSwarmWake:new Set(),
materializedCandle:new Set(),
materializedStarfall:new Set(),
materializedMycelia:new Set(),
materializedHoldfasts:new Set(),
holdfastSite:null,
materializedUnsealing:new Set(),
unsealingSite:null,
huntFootprint:null,
materializedFractures:new Set(),
fractureRng:new Rng(1),
fractureRun:null,
materializedRituals:new Set(),
ritualSite:null,
materializedAmalgam:new Set(),
amalgamSite:null,
materializedAmalgamMobs:new Set(),
materializedObservers:new Set(),
materializedWrits:new Set(),
contagionLeans:new Map(),
dwIceArr:null,
dwIceLen:-1,
dwIceRev:-1,
materializedHunts:new Set(),
huntBeast:null
};}
export interface NativeSceneRuntimeBirthInput {
 scene:NativeSceneCensus;geometry:NativeAreaSceneGeometry;population:NativeAreaScenePopulation;generation:NativeAreaSceneGeneration;theater:NativeAreaSceneTheater;
 campaign:Pick<World,'sim'|'ledger'|'manifest'|'zoneMap'|'text'|'notice'>;
 state:NativeSceneRuntimeBirthState;sources:native.NativeSceneRuntimeBirthSources;
}
export class NativeAreaSceneRuntimeBirth {
 readonly input:NativeSceneRuntimeBirthInput;readonly host:native.NativeSceneRuntimeBirthHost;
 constructor(raw:NativeSceneRuntimeBirthInput){
  const roots=Object.create(null);for(const key of ['scene','geometry','population','generation','theater','campaign','state','sources']){const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native event birth needs own object binding: '+key);roots[key]=d.value;}
  const input:NativeSceneRuntimeBirthInput=this.input=Object.freeze(roots),owner=this;
  const same=(o:object,k:string,value:unknown)=>{const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value')||d.value!==value)throw Error('Native event birth needs identical '+k+' owner');};
  same(input.geometry,'state',input.scene);
  for(const part of [input.population,input.generation,input.theater]){const d=Object.getOwnPropertyDescriptor(part,'input');if(!d||!Object.hasOwn(d,'value')||!d.value)throw Error('Native event birth needs genuine owner input');same(d.value,'scene',input.scene);same(d.value,'geometry',input.geometry);}
  same(input.theater.input,'population',input.population);
  for(const key of stateKeys)if(!Object.hasOwn(input.state,key))throw Error('Native event birth needs carried state: '+key);
  for(const key of ['sim','ledger','manifest','zoneMap','text','notice'])if(!Object.hasOwn(input.campaign,key))throw Error('Native event birth needs campaign field: '+key);
  const host={} as native.NativeSceneRuntimeBirthHost;
  const fields=(get:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){return(get() as Record<string,unknown>)[key];},set(value:unknown){(get() as Record<string,unknown>)[key]=value;}});};
  const methods=(get:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){const provider=get() as Record<string,Function>,fn=provider[key];if(typeof fn!=='function')throw Error('Missing native event capability: '+key);return(...args:unknown[])=>fn.apply(provider,args);}});};
  fields(()=>input.scene,["zone","actors","player"]);fields(()=>input.geometry,["arena","zoneEntry","flashes","doodads","snowCover","snowFloor","tracks","exits","walk","fractureRifts","doodadsRev","fog","currentZoneSeed","grounds","caveEntrances"]);fields(()=>input.generation.input.state,["inCave","crusadeWorksAt"]);fields(()=>input.campaign,["sim","ledger","manifest","zoneMap"]);fields(()=>input.state,stateKeys);
  methods(()=>input.geometry,['clampPos','clearTransitSpot','farPoint','markDoodadsChanged']);methods(()=>input.population,['createMonster','promoteRarity']);methods(()=>input.population.input.sources.ambient,['weightedPick']);methods(()=>input.theater,['spawnEventActor','clampNear']);methods(()=>input.campaign,['text','notice']);methods(()=>owner,["ventGeyser","warbandEntryPoint","warbandDestination","compassFrom","infectActorWith","spawnPatientZero","freezeStandingWater","fogEnsure","findUnsealingSpot","spawnHuntBeast","beginFissure","bearingOf","riseAmalgamation","hasNpcRole","graftPart","fracturePoint","actorById"]);
  this.host=Object.freeze(host);for(const key of ['input','host'])Object.defineProperty(this,key,{enumerable:false,writable:false,configurable:false});
 }
 placeAscentGeyser(...args:Parameters<World['placeAscentGeyser']>):ReturnType<World['placeAscentGeyser']>{return native.birthPlaceAscentGeyser(this.host,this.input.sources,...args);}
 spawnWarband(...args:Parameters<World['spawnWarband']>):ReturnType<World['spawnWarband']>{return native.birthSpawnWarband(this.host,this.input.sources,...args);}
 spawnEpicenter(...args:Parameters<World['spawnEpicenter']>):ReturnType<World['spawnEpicenter']>{return native.birthSpawnEpicenter(this.host,this.input.sources,...args);}
 materializeCrusade(...args:Parameters<World['materializeCrusade']>):ReturnType<World['materializeCrusade']>{return native.birthMaterializeCrusade(this.host,this.input.sources,...args);}
 spawnHellCourt(...args:Parameters<World['spawnHellCourt']>):ReturnType<World['spawnHellCourt']>{return native.birthSpawnHellCourt(this.host,this.input.sources,...args);}
 spawnHellMarshal(...args:Parameters<World['spawnHellMarshal']>):ReturnType<World['spawnHellMarshal']>{return native.birthSpawnHellMarshal(this.host,this.input.sources,...args);}
 materializeWorldBossFight(...args:Parameters<World['materializeWorldBossFight']>):ReturnType<World['materializeWorldBossFight']>{return native.birthMaterializeWorldBossFight(this.host,this.input.sources,...args);}
 materializeContagion(...args:Parameters<World['materializeContagion']>):ReturnType<World['materializeContagion']>{return native.birthMaterializeContagion(this.host,this.input.sources,...args);}
 materializeDeepwinter(...args:Parameters<World['materializeDeepwinter']>):ReturnType<World['materializeDeepwinter']>{return native.birthMaterializeDeepwinter(this.host,this.input.sources,...args);}
 materializeInfestation(...args:Parameters<World['materializeInfestation']>):ReturnType<World['materializeInfestation']>{return native.birthMaterializeInfestation(this.host,this.input.sources,...args);}
 materializeBrood(...args:Parameters<World['materializeBrood']>):ReturnType<World['materializeBrood']>{return native.birthMaterializeBrood(this.host,this.input.sources,...args);}
 materializeSwarmWake(...args:Parameters<World['materializeSwarmWake']>):ReturnType<World['materializeSwarmWake']>{return native.birthMaterializeSwarmWake(this.host,this.input.sources,...args);}
 materializeCandle(...args:Parameters<World['materializeCandle']>):ReturnType<World['materializeCandle']>{return native.birthMaterializeCandle(this.host,this.input.sources,...args);}
 materializeStarfall(...args:Parameters<World['materializeStarfall']>):ReturnType<World['materializeStarfall']>{return native.birthMaterializeStarfall(this.host,this.input.sources,...args);}
 materializeMycelia(...args:Parameters<World['materializeMycelia']>):ReturnType<World['materializeMycelia']>{return native.birthMaterializeMycelia(this.host,this.input.sources,...args);}
 placeHoldfast(...args:Parameters<World['placeHoldfast']>):ReturnType<World['placeHoldfast']>{return native.birthPlaceHoldfast(this.host,this.input.sources,...args);}
 materializeUnsealing(...args:Parameters<World['materializeUnsealing']>):ReturnType<World['materializeUnsealing']>{return native.birthMaterializeUnsealing(this.host,this.input.sources,...args);}
 placeHuntContent(...args:Parameters<World['placeHuntContent']>):ReturnType<World['placeHuntContent']>{return native.birthPlaceHuntContent(this.host,this.input.sources,...args);}
 placeFractureContent(...args:Parameters<World['placeFractureContent']>):ReturnType<World['placeFractureContent']>{return native.birthPlaceFractureContent(this.host,this.input.sources,...args);}
 placeFractureRiftContent(...args:Parameters<World['placeFractureRiftContent']>):ReturnType<World['placeFractureRiftContent']>{return native.birthPlaceFractureRiftContent(this.host,this.input.sources,...args);}
 placeRitualSite(...args:Parameters<World['placeRitualSite']>):ReturnType<World['placeRitualSite']>{return native.birthPlaceRitualSite(this.host,this.input.sources,...args);}
 placeAmalgamation(...args:Parameters<World['placeAmalgamation']>):ReturnType<World['placeAmalgamation']>{return native.birthPlaceAmalgamation(this.host,this.input.sources,...args);}
 placeAmalgamMiniboss(...args:Parameters<World['placeAmalgamMiniboss']>):ReturnType<World['placeAmalgamMiniboss']>{return native.birthPlaceAmalgamMiniboss(this.host,this.input.sources,...args);}
 materializeObserver(...args:Parameters<World['materializeObserver']>):ReturnType<World['materializeObserver']>{return native.birthMaterializeObserver(this.host,this.input.sources,...args);}
 springVendettaAmbush(...args:Parameters<World['springVendettaAmbush']>):ReturnType<World['springVendettaAmbush']>{return native.birthSpringVendettaAmbush(this.host,this.input.sources,...args);}
 placeCaravanReturn(...args:Parameters<World['placeCaravanReturn']>):ReturnType<World['placeCaravanReturn']>{return native.birthPlaceCaravanReturn(this.host,this.input.sources,...args);}
 ventGeyser(...args:Parameters<World['ventGeyser']>):ReturnType<World['ventGeyser']>{return native.birthVentGeyser(this.host,this.input.sources,...args);}
 warbandEntryPoint(...args:Parameters<World['warbandEntryPoint']>):ReturnType<World['warbandEntryPoint']>{return native.birthWarbandEntryPoint(this.host,this.input.sources,...args);}
 warbandDestination(...args:Parameters<World['warbandDestination']>):ReturnType<World['warbandDestination']>{return native.birthWarbandDestination(this.host,this.input.sources,...args);}
 compassFrom(...args:Parameters<World['compassFrom']>):ReturnType<World['compassFrom']>{return native.birthCompassFrom(this.host,this.input.sources,...args);}
 infectActorWith(...args:Parameters<World['infectActorWith']>):ReturnType<World['infectActorWith']>{return native.birthInfectActorWith(this.host,this.input.sources,...args);}
 spawnPatientZero(...args:Parameters<World['spawnPatientZero']>):ReturnType<World['spawnPatientZero']>{return native.birthSpawnPatientZero(this.host,this.input.sources,...args);}
 freezeStandingWater(...args:Parameters<World['freezeStandingWater']>):ReturnType<World['freezeStandingWater']>{return native.birthFreezeStandingWater(this.host,this.input.sources,...args);}
 fogEnsure(...args:Parameters<World['fogEnsure']>):ReturnType<World['fogEnsure']>{return native.birthFogEnsure(this.host,this.input.sources,...args);}
 findUnsealingSpot(...args:Parameters<World['findUnsealingSpot']>):ReturnType<World['findUnsealingSpot']>{return native.birthFindUnsealingSpot(this.host,this.input.sources,...args);}
 spawnHuntBeast(...args:Parameters<World['spawnHuntBeast']>):ReturnType<World['spawnHuntBeast']>{return native.birthSpawnHuntBeast(this.host,this.input.sources,...args);}
 beginFissure(...args:Parameters<World['beginFissure']>):ReturnType<World['beginFissure']>{return native.birthBeginFissure(this.host,this.input.sources,...args);}
 bearingOf(...args:Parameters<World['bearingOf']>):ReturnType<World['bearingOf']>{return native.birthBearingOf(this.host,this.input.sources,...args);}
 riseAmalgamation(...args:Parameters<World['riseAmalgamation']>):ReturnType<World['riseAmalgamation']>{return native.birthRiseAmalgamation(this.host,this.input.sources,...args);}
 hasNpcRole(...args:Parameters<World['hasNpcRole']>):ReturnType<World['hasNpcRole']>{return native.birthHasNpcRole(this.host,this.input.sources,...args);}
 graftPart(...args:Parameters<World['graftPart']>):ReturnType<World['graftPart']>{return native.birthGraftPart(this.host,this.input.sources,...args);}
 fracturePoint(...args:Parameters<World['fracturePoint']>):ReturnType<World['fracturePoint']>{return native.birthFracturePoint(this.host,this.input.sources,...args);}
 actorById(...args:Parameters<World['actorById']>):ReturnType<World['actorById']>{return native.birthActorById(this.host,this.input.sources,...args);}
}
