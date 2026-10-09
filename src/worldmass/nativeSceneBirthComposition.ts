/** Complete birth wiring over concrete native owners. This is not an installed
 * source issuer or permission to publish/stream the prepared scene. */
import type {NativeAreaBirthHost} from '../engine/nativeAreaBirth';
import {birthNativeArea,type NativeAreaBirthArguments} from '../engine/nativeAreaBirth';
import type {NativeSceneCensus,NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaSceneEnvironment} from './nativeAreaSceneEnvironment';
import type {NativeAreaSceneEcology} from './nativeAreaSceneEcology';
import type {NativeAreaSceneSettlement} from './nativeAreaSceneSettlement';
import type {NativeAreaSceneOccurrences} from './nativeAreaSceneOccurrences';
import type {NativeAreaSceneBounty} from './nativeAreaSceneBounty';
import type {NativeAreaScenePhysical} from './nativeAreaScenePhysical';
import type {NativeResidentSession} from './nativeResidentSession';
import type {NativeSceneObjectiveState} from './nativeSceneState';
import {sceneObjectiveServices,hasNativeSceneObjectiveBinding,hasNativeSceneObjectiveState} from './nativeSceneObjectives';
import {spawnSceneContest,sceneRollCullNeed} from '../engine/nativeScenePopulation';
import type {NativeAreaSceneHarbor} from './nativeAreaSceneHarbor';
import type {NativeAreaSceneOpenings} from './nativeAreaSceneOpenings';
import type {NativeAreaSceneTheater} from './nativeAreaSceneTheater';
import type {NativeAreaSceneEncounterBirth} from './nativeAreaSceneEncounterBirth';
import type {NativeAreaSceneSites} from './nativeAreaSceneSites';
import type {NativeAreaSceneHistory} from './nativeAreaSceneHistory';
import type {NativeAreaSceneDescent} from './nativeAreaSceneDescent';
import type {NativeAreaSceneCoast} from './nativeAreaSceneCoast';
import type {NativeAreaSceneArrival} from './nativeAreaSceneArrival';
import type {NativeAreaSceneAdoption} from './nativeAreaSceneAdoption';
import type {NativeAreaSceneRuntimeRegistry} from './nativeAreaSceneRuntimeRegistry';
import type {NativeAreaSceneSky} from './nativeAreaSceneSky';
import {hasNativeSceneSkyBinding} from './nativeAreaSceneSky';

const stateKeys=["vendorStock","packageAskEngaged","fonts","theaterVisitSeq","theaterQuiet","mercDwell","mercDwellFired","skyBelow","spans","wraithsailSeaStash"] as const;
export type NativeSceneBirthState=Pick<NativeAreaBirthHost,typeof stateKeys[number]>;
/** First construction only; retain these roots on revisit and restore. */
export function freshSceneBirthState():NativeSceneBirthState{return {
 vendorStock:[],packageAskEngaged:false,fonts:[],theaterVisitSeq:new Map(),theaterQuiet:true,
 mercDwell:0,mercDwellFired:false,skyBelow:null,spans:null,wraithsailSeaStash:null,
};}
export interface NativeSceneBirthCompositionInput {
 scene:NativeSceneCensus;geometry:NativeAreaSceneGeometry;population:NativeAreaScenePopulation;
 environment:NativeAreaSceneEnvironment;ecology:NativeAreaSceneEcology;settlement:NativeAreaSceneSettlement;
 occurrences:NativeAreaSceneOccurrences;bounty:NativeAreaSceneBounty;physical:NativeAreaScenePhysical;
 residents:NativeResidentSession;objectives:NativeSceneObjectiveState;
 sources:Pick<NativeAreaBirthHost,'nativeInhabitantSources'>;
 campaign:Pick<NativeAreaBirthHost,'account'|'annexFound'|'time'|'zoneMemory'|'completedObjectives'|'stationArmed'|'discoveredWaypoints'|'sim'|'text'>;
 state:NativeSceneBirthState;
 harbor:NativeAreaSceneHarbor;
 openings:NativeAreaSceneOpenings;
 theater:NativeAreaSceneTheater;
 encounters:NativeAreaSceneEncounterBirth;
 sites:NativeAreaSceneSites;
 history:NativeAreaSceneHistory;
 descent:NativeAreaSceneDescent;
 coast:NativeAreaSceneCoast;
 arrival:NativeAreaSceneArrival;
 adoption:NativeAreaSceneAdoption;
 registry:NativeAreaSceneRuntimeRegistry;
 sky:NativeAreaSceneSky;
}
const composedBirths=new WeakMap<object,NativeSceneBirthCompositionInput>();
export function composeNativeSceneBirth(raw:NativeSceneBirthCompositionInput):NativeAreaBirthHost {
 const roots=Object.create(null);
 for(const key of ["scene","geometry","population","environment","ecology","settlement","occurrences","bounty","physical","residents","objectives","sources","campaign","state","harbor","openings","theater","encounters","sites","history","descent","coast","arrival","adoption","registry","sky"]){const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native birth composition needs own object binding: '+key);roots[key]=d.value;}
 const input:NativeSceneBirthCompositionInput=Object.freeze(roots);
 const {scene,geometry,population,environment,ecology,settlement,occurrences,bounty,physical,residents}=input;
 const same=(o:object,k:string,value:unknown)=>{const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value')||d.value!==value)throw Error('Native birth composition needs identical '+k+' owner');};
 same(geometry,'state',scene);
 for(const owner of [population,environment,ecology,settlement,occurrences,bounty,physical,input.harbor,input.openings,input.theater,input.encounters,input.sites,input.history,input.descent,input.coast,input.arrival,input.adoption,input.registry]){
  const d=Object.getOwnPropertyDescriptor(owner,'input');if(!d||!Object.hasOwn(d,'value')||!d.value)throw Error('Native birth composition needs actual owner input');
  same(d.value,'scene',scene);same(d.value,'geometry',geometry);
 }
 for(const owner of [environment,ecology,bounty,physical,input.harbor,input.openings,input.theater,input.encounters,input.sites,input.history,input.descent])same(owner.input,'population',population);
 for(const owner of [physical,input.harbor,input.sites,input.descent])same(owner.input,'settlement',settlement);
 same(ecology.input,'environment',environment.input.state);same(bounty.input,'environment',environment);same(input.theater.input,'environment',environment);same(input.theater.input,'ecology',ecology);
 if(!hasNativeSceneObjectiveState(environment.input.services,input.objectives))throw Error('Native birth composition needs live environment objective state');
 for(const owner of [population,settlement,bounty,physical,input.openings,input.theater,input.encounters,input.sites,input.history,input.descent,input.coast,input.arrival,input.adoption,input.registry.input.birth,input.registry.input.titans,input.registry.input.birth.input.generation])same(owner.input,'campaign',input.campaign);
 same(input.harbor.input,'run',input.campaign);
 same(residents,'campaign',input.campaign);
 for(const owner of [input.coast,input.encounters,input.harbor,input.registry.input.birth.input.generation])same(owner.input,'state',input.descent.input.state);
 same(input.sky.input,'scene',scene);same(input.sky.input,'environment',environment.input.state);same(input.sky.input,'campaign',input.campaign);
 for(const services of [geometry.campaign,ecology.input.services,input.theater.input.services])if(!hasNativeSceneSkyBinding(services,input.sky))throw Error('Native birth composition needs genuine local sky binding');
 if(!hasNativeSceneObjectiveBinding(bounty.input.objectives,population,input.objectives))throw Error('Native birth composition needs identical bounty objective state');
 same(input.adoption.input,'state',input.registry.input.birth.input.state);
 same(input.registry.input.birth.input,'population',population);same(input.registry.input.birth.input,'theater',input.theater);
 same(input.registry.input,'descentState',input.descent.input.state);
 if(!residents.ownsBirthPopulation(population))throw Error('Native birth composition needs identical resident factory');
 for(const key of stateKeys){const d=Object.getOwnPropertyDescriptor(input.state,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native birth composition needs carried state: '+key);}
 for(const key of ['account','annexFound','time','zoneMemory','completedObjectives','stationArmed','discoveredWaypoints','sim','text'])if(!Object.hasOwn(input.campaign,key))throw Error('Native birth composition needs campaign field: '+key);
 const objective=sceneObjectiveServices(population,input.objectives,{
  get pathField(){const fn=geometry.pathField;return(...args:Parameters<typeof fn>)=>fn.apply(geometry,args);},
  get zoneEntry(){return geometry.zoneEntry;},get sim(){return input.campaign.sim;},
  get farPoint(){const fn=geometry.farPoint;return(...args:Parameters<typeof fn>)=>fn.apply(geometry,args);},
  get notice(){const fn=geometry.campaign.notice;return(...args:Parameters<typeof fn>)=>fn.apply(geometry.campaign,args);},
  get walk(){return geometry.walk;},get structures(){return geometry.structures;},get arena(){return geometry.arena;},get time(){return input.campaign.time;},
  get pointInSolid(){const fn=geometry.pointInSolid;return(...args:Parameters<typeof fn>)=>fn.apply(geometry,args);},
  get text(){const fn=input.campaign.text;return(...args:Parameters<typeof fn>)=>fn.apply(input.campaign,args);},
  get farthestStand(){const fn=geometry.farthestStand;return(...args:Parameters<typeof fn>)=>fn.apply(geometry,args);},
 });
 const derived={zoneRuntimes:input.registry.rows,
  get nativeInhabitantHost(){const fn=residents.inhabitants;return()=>fn.call(residents,population);},
  spawnContest:(...args:Parameters<NativeAreaBirthHost['spawnContest']>)=>spawnSceneContest(objective,...args),
  rollCullNeed:(...args:Parameters<NativeAreaBirthHost['rollCullNeed']>)=>sceneRollCullNeed(objective,...args),
 };
 const host=Object.create(null);
 function fields(provider:()=>object,names:readonly string[]){for(const name of names)Object.defineProperty(host,name,{enumerable:true,get(){return (provider() as Record<string,unknown>)[name];},set(value){(provider() as Record<string,unknown>)[name]=value;}});}
 function methods(provider:()=>object,names:readonly string[]){for(const name of names)Object.defineProperty(host,name,{enumerable:true,get(){const owner=provider() as Record<string,Function>,fn=owner[name];return(...args:unknown[])=>fn.apply(owner,args);}});}
 fields(()=>geometry,["doodads"]);
 fields(()=>input.campaign,["account"]);
 fields(()=>input.campaign,["annexFound"]);
 fields(()=>input.harbor.input.state,["zoneHasVendorCounter"]);
 fields(()=>input.harbor.input.run,["vendorArmedBeat"]);
 fields(()=>input.state,["vendorStock"]);
 fields(()=>input.harbor.input.run,["vendorRestockAt"]);
 fields(()=>input.state,["packageAskEngaged"]);
 fields(()=>population.input.state,["zoneGenTagging"]);
 fields(()=>geometry,["arena"]);
 fields(()=>scene,["actors"]);
 fields(()=>input.objectives,["objectiveDone"]);
 fields(()=>geometry,["bossRun"]);
 fields(()=>input.objectives,["spires"]);
 fields(()=>input.objectives,["rifts"]);
 fields(()=>input.objectives,["pyres"]);
 fields(()=>input.objectives,["digs"]);
 fields(()=>input.objectives,["objectiveLost"]);
 fields(()=>geometry,["exits"]);
 fields(()=>geometry,["zoneEntry"]);
 fields(()=>input.objectives,["procession"]);
 fields(()=>occurrences,["occs"]);
 fields(()=>input.campaign,["time"]);
 fields(()=>input.campaign,["zoneMemory"]);
 fields(()=>input.objectives,["wave"]);
 fields(()=>input.objectives,["waveActive"]);
 fields(()=>input.objectives,["cull"]);
 fields(()=>physical.input.state,["shrines"]);
 fields(()=>physical.input.state,["altars"]);
 fields(()=>input.objectives,["offering"]);
 fields(()=>physical.input.state,["chests"]);
 fields(()=>input.campaign,["completedObjectives"]);
 fields(()=>input.campaign,["stationArmed"]);
 fields(()=>input.state,["fonts"]);
 fields(()=>input.campaign,["discoveredWaypoints"]);
 fields(()=>geometry,["waypointPos"]);
 fields(()=>settlement.input.state,["townTierIdx"]);
 fields(()=>residents,["speakerRows"]);
 fields(()=>input.campaign,["sim"]);
 fields(()=>input.theater.input.state,["theaterSpots"]);
 fields(()=>input.theater.input.state,["theaterAmbientBudget"]);
 fields(()=>input.theater.input.state,["theaterVisit"]);
 fields(()=>input.state,["theaterVisitSeq"]);
 fields(()=>input.state,["theaterQuiet"]);
 fields(()=>settlement.input.state,["mercOutpost"]);
 fields(()=>input.state,["mercDwell"]);
 fields(()=>input.state,["mercDwellFired"]);
 fields(()=>input.state,["skyBelow"]);
 fields(()=>geometry,["collapse"]);
 fields(()=>scene,["zone"]);
 fields(()=>geometry,["walk"]);
 fields(()=>geometry,["currentZoneSeed"]);
 fields(()=>geometry,["flux"]);
 fields(()=>input.state,["spans"]);
 fields(()=>geometry,["conjured"]);
 fields(()=>derived,["zoneRuntimes"]);
 fields(()=>input.descent.input.campaign,["descentRun"]);
 fields(()=>input.state,["wraithsailSeaStash"]);
 fields(()=>input.coast.input.state,["voyage"]);
 fields(()=>scene,["player"]);
 methods(()=>geometry,["setDoorState"]);
 methods(()=>input.harbor,["bootHarborhold"]);
 methods(()=>input.harbor,["bootQuay"]);
 methods(()=>input.openings,["openHollow"]);
 methods(()=>input.openings,["annexReveal"]);
 methods(()=>derived,["nativeInhabitantHost"]);
 methods(()=>settlement,["restockOrdinal"]);
 methods(()=>settlement,["armVendorStock"]);
 methods(()=>settlement,["syncHoldIdx"]);
 methods(()=>settlement,["restockSeconds"]);
 methods(()=>population,["effectiveSpawn"]);
 methods(()=>population,["baseTable"]);
 methods(()=>population,["spawnPacks"]);
 methods(()=>derived,["spawnContest"]);
 methods(()=>geometry,["farPoint"]);
 methods(()=>population.input.sources.ambient,["weightedPick"]);
 methods(()=>population,["createMonster"]);
 methods(()=>geometry,["clampPos"]);
 methods(()=>input.campaign,["text"]);
 methods(()=>input.arrival,["uberDefeated"]);
 methods(()=>population,["promoteRarityStacked"]);
 methods(()=>geometry,["seededDraw"]);
 methods(()=>geometry,["interactSpot"]);
 methods(()=>geometry,["findFreeSpot"]);
 methods(()=>environment,["bootScenery"]);
 methods(()=>environment,["bootPuzzles"]);
 methods(()=>ecology,["bootThrong"]);
 methods(()=>ecology,["bootLite"]);
 methods(()=>environment,["bootHarvest"]);
 methods(()=>occurrences,["traceAbortAll"]);
 methods(()=>environment,["bootGeysers"]);
 methods(()=>ecology,["bootLiteVentSeats"]);
 methods(()=>environment,["bootEscapeChase"]);
 methods(()=>objective,["spawnPoint"]);
 methods(()=>objective,["countedEnemies"]);
 methods(()=>population,["spawnWildlife"]);
 methods(()=>input.arrival,["enforceArrivalGrace"]);
 methods(()=>population,["restoreZoneEnemies"]);
 methods(()=>bounty,["seedCullMarks"]);
 methods(()=>bounty,["seedGatherNodes"]);
 methods(()=>bounty,["noteBountyArrivals"]);
 methods(()=>occurrences,["occHost"]);
 methods(()=>derived,["rollCullNeed"]);
 methods(()=>settlement,["townSeat"]);
 methods(()=>settlement,["armLastlightRecruiter"]);
 methods(()=>input.theater,["theaterRunBeat"]);
 methods(()=>input.encounters,["placeEncounters"]);
 methods(()=>input.sites,["placeVocationSites"]);
 methods(()=>input.sites,["placeMercOutpost"]);
 methods(()=>input.history,["manifestNemeses"]);
 methods(()=>input.history,["applyGrudgeEffects"]);
 methods(()=>input.history,["spawnPlayerCorpses"]);
 methods(()=>input.arrival,["nearestZoneOf"]);
 methods(()=>input.sky,["radianceCondHeld"]);
 methods(()=>population,["hostileTo"]);
 methods(()=>input.descent,["placeDescentDelver"]);
 methods(()=>input.descent,["enterDescentZone"]);
 methods(()=>input.coast,["streamCoast"]);
 methods(()=>ecology,["attachZoneWells"]);
 fields(()=>input.sources,["nativeInhabitantSources"]);
 methods(()=>input.adoption,["maybeAdoptObjective"]);
 methods(()=>physical,["syncAltarBodies"]);
 methods(()=>physical,["restoreZoneContents"]);
 methods(()=>physical,["syncTrainingYard"]);
 composedBirths.set(host,input);
 return Object.freeze(host) as NativeAreaBirthHost;
}
export function runComposedNativeBirth(host:NativeAreaBirthHost,...args:NativeAreaBirthArguments):void {
 const input=composedBirths.get(host);if(!input)throw Error('Birth requires a composed native owner');
 if(!input.residents.ownsBirthPopulation(input.population))throw Error('Birth resident session changed area');
 if(input.descent.input.state.inCave!==args[7]||input.coast.input.state.entryFrom!==(args[6]??null))throw Error('Birth transition does not match local cave/arrival state');
 if(host.zone!==args[0]||host.player!==args[8]||host.zone.id!==args[2])throw Error('Birth arguments do not match scene owner');
 return birthNativeArea(host,...args);
}
