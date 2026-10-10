import {makeNativeAreaArena} from '../engine/nativeAreaArena';
/** Fresh native area ownership and staged complete preparation. No World scene
 * transfer, arrival teleport, runtime publication or implicit service fallback. */
import type {World} from '../engine/world';
import type {Actor} from '../engine/actor';
import type {Vec2} from '../core/math';
import type {ZoneDef} from '../data/zones';
import {Rng} from '../core/rng';
import {applyScenePartyScale,scenePartyScaleCount} from '../engine/nativeScenePopulation';
import {runComposedNativeBirth,type NativeSceneBirthCompositionInput} from './nativeSceneBirthComposition';
import {NativeAreaSceneGraph,type NativeGraphCampaign} from './nativeAreaSceneGraph';
import {NativeAreaSceneBoundaries} from './nativeAreaSceneBoundaries';
import {NativeAreaSourceSession,type NativeAreaSource} from './nativeAreaSourceSession';
import type {MassNativeGeography} from './nativeGeography';
import {serializeNativeAreaData} from './nativeAreaGeometry';
import {NativeResidentSession} from './nativeResidentSession';
import {NativeAreaSceneSky,bindNativeSceneSky} from './nativeAreaSceneSky';
import {sceneObjectiveServices,bindNativeSceneObjectives} from './nativeSceneObjectives';
import {freshSceneObjectiveState} from './nativeSceneState';
import {freshSceneBirthState,composeNativeSceneBirth} from './nativeSceneBirthComposition';
import {freshSceneEnvironmentState} from './nativeAreaSceneEnvironment';
import {freshSceneEcologyState} from './nativeAreaSceneEcology';
import {freshSceneOccurrenceState} from './nativeAreaSceneOccurrences';
import {freshScenePhysicalState} from './nativeAreaScenePhysical';
import {freshSceneRuntimeBirthState} from './nativeAreaSceneRuntimeBirth';
import {freshSceneRuntimeRegistryState} from './nativeAreaSceneRuntimeRegistry';
import {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import {NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import {NativeAreaSceneEnvironment} from './nativeAreaSceneEnvironment';
import {NativeAreaSceneEcology} from './nativeAreaSceneEcology';
import {NativeAreaSceneSettlement} from './nativeAreaSceneSettlement';
import {NativeAreaSceneOccurrences} from './nativeAreaSceneOccurrences';
import {NativeAreaSceneBounty} from './nativeAreaSceneBounty';
import {NativeAreaScenePhysical} from './nativeAreaScenePhysical';
import {NativeAreaSceneHarbor} from './nativeAreaSceneHarbor';
import {NativeAreaSceneOpenings} from './nativeAreaSceneOpenings';
import {NativeAreaSceneTheater} from './nativeAreaSceneTheater';
import {NativeAreaSceneEncounterBirth} from './nativeAreaSceneEncounterBirth';
import {NativeAreaSceneSites} from './nativeAreaSceneSites';
import {NativeAreaSceneHistory} from './nativeAreaSceneHistory';
import {NativeAreaSceneDescent} from './nativeAreaSceneDescent';
import {NativeAreaSceneCoast} from './nativeAreaSceneCoast';
import {NativeAreaSceneArrival} from './nativeAreaSceneArrival';
import {NativeAreaSceneAdoption} from './nativeAreaSceneAdoption';
import {NativeAreaSceneGeneration} from './nativeAreaSceneGeneration';
import {NativeAreaSceneRuntimeBirth} from './nativeAreaSceneRuntimeBirth';
import {NativeAreaSceneTitans} from './nativeAreaSceneTitans';
import {NativeAreaSceneRuntimeRegistry} from './nativeAreaSceneRuntimeRegistry';

type Input<C extends new (...args:never[])=>unknown>=ConstructorParameters<C>[0];
type Campaign<C extends new (...args:never[])=>{input:{campaign:object}}>=Input<C>['campaign'];
export type NativeAreaAssemblyCampaign=NativeGraphCampaign
 & Campaign<typeof NativeAreaScenePopulation> & Campaign<typeof NativeAreaSceneSettlement>
 & Campaign<typeof NativeAreaSceneBounty> & Campaign<typeof NativeAreaScenePhysical>
 & Campaign<typeof NativeAreaSceneOpenings> & Campaign<typeof NativeAreaSceneTheater>
 & Campaign<typeof NativeAreaSceneSites> & Campaign<typeof NativeAreaSceneHistory>
 & Campaign<typeof NativeAreaSceneDescent> & Campaign<typeof NativeAreaSceneArrival>
 & Campaign<typeof NativeAreaSceneAdoption> & Campaign<typeof NativeAreaSceneRuntimeBirth>
 & Campaign<typeof NativeAreaSceneTitans> & Input<typeof NativeResidentSession>['campaign']
 & Input<typeof NativeAreaSceneHarbor>['run'] & NativeSceneBirthCompositionInput['campaign'] & {squadSeq:number;vendorStock:World['vendorStock'];theaterVisitSeq:World['theaterVisitSeq'];nativeResidentHistory:import('./nativeResidentSession').NativeResidentHistory};
type Transition=Input<typeof NativeAreaSceneCoast>['state'] & Input<typeof NativeAreaSceneHarbor>['state']
 & Input<typeof NativeAreaSceneGeneration>['state'] & Input<typeof NativeAreaSceneDescent>['state']
 & Input<typeof NativeAreaSceneEncounterBirth>['state'];
export interface NativeAreaAssemblySources {
 population:Input<typeof NativeAreaScenePopulation>['sources'];
 populationResolution:Input<typeof NativeAreaScenePopulation>['populationSources'];
 environment:Input<typeof NativeAreaSceneEnvironment>['sources'];
 ecology:Input<typeof NativeAreaSceneEcology>['sources'];
 coast:Input<typeof NativeAreaSceneCoast>['sources'];
 runtime:Input<typeof NativeAreaSceneRuntimeBirth>['sources'];
 inhabitants:NativeSceneBirthCompositionInput['sources'];
}
/** Deferred controllers/rewards must be supplied by their actual owners.
 * No no-op or throwing replacement services are installed by this factory. */
export interface NativeAreaAssemblyServices {
 geometry:Omit<ConstructorParameters<typeof NativeAreaSceneGeometry>[2],'radianceCondHeld'|'createMonster'|'time'|'seats'|'ledger'>;
 population:Pick<Input<typeof NativeAreaScenePopulation>['context'],'resolveHit'>;
 residents:Pick<Input<typeof NativeResidentSession>['area']['local'],'viewRectFor'|'scene'|'clientActionHook'>;
 environment:Pick<Input<typeof NativeAreaSceneEnvironment>['services'],'timeflow'|'completePuzzle'>;
 ecology:Pick<Input<typeof NativeAreaSceneEcology>['services'],'throngClaimed'>;
 occurrences:Omit<Input<typeof NativeAreaSceneOccurrences>['services'],'time'>;
 theater:Omit<Input<typeof NativeAreaSceneTheater>['services'],'radianceCondHeld'>;
 openings:Input<typeof NativeAreaSceneOpenings>['rewards'];
 history:Input<typeof NativeAreaSceneHistory>['services'];
}
export interface NativeAreaAssemblyInput {
 definition:ZoneDef;player:Actor;initialActors:readonly Actor[];
 campaign:NativeAreaAssemblyCampaign;sources:NativeAreaAssemblySources;
 services:NativeAreaAssemblyServices;
 carry:Pick<Transition,'inCave'|'entryFrom'|'voyage'|'charBorn'|'charRegrowAcc'> & {townTierIdx:World['townTierIdx']};
 config:ConstructorParameters<typeof NativeAreaSceneGeometry>[3] & Input<typeof NativeAreaSceneHarbor>['config'] & Input<typeof NativeAreaSceneArrival>['policy'];
}
/** Preserve live fields and the selected provider receiver, including prototype methods. */
function servicesView<T extends object,K extends keyof T>(owner:T,keys:readonly K[]):Pick<T,K>{
 const view={} as Pick<T,K>;for(const key of keys)Object.defineProperty(view,key,{enumerable:true,get(){const value=owner[key];return typeof value==='function'?(...args:unknown[])=>Reflect.apply(value,owner,args):value;},set(value){owner[key]=value;}});return view;
}
function extendView<T extends object,U extends object>(view:T,own:U):T&U {Object.defineProperties(view,Object.getOwnPropertyDescriptors(own));return view as T&U;}
type Layout=ReturnType<NativeAreaSceneGeneration['generate']>;
export interface NativeAreaPreparedPlacement {readonly entry:Readonly<Vec2>;readonly spawnAt?:Readonly<Vec2>;readonly layoutSeed:number}
/** Retain one assembly through its area's lifetime. Chunk residency never
 * calls preparation or birth again. Runtime publication remains separate. */
export class NativeAreaSceneAssembly {
 readonly input:NativeSceneBirthCompositionInput;
 readonly host:ReturnType<typeof composeNativeSceneBirth>;
 readonly graph:NativeAreaSceneGraph;
 readonly boundaries:NativeAreaSceneBoundaries;
 readonly generation:NativeAreaSceneGeneration;
 readonly transition:Transition;
 #phase:'fresh'|'preparing'|'prepared'|'birthing'|'born'|'failed'='fresh';
 #prepared?:{source:NativeAreaSource;session:NativeAreaSourceSession;layout:Readonly<Layout>;fingerprint:string;firstVisit:boolean;rngState:number;memoryState:string};
 constructor(raw:NativeAreaAssemblyInput){
  const {definition,campaign,sources,services,config}=raw;
  if(!(campaign.theaterVisitSeq instanceof Map)||!Array.isArray(campaign.vendorStock)||!campaign.nativeResidentHistory)throw Error('Native assembly needs retained campaign histories and stock');
  if(campaign.manifest!==campaign.sim.manifest)throw Error('Native assembly needs identical campaign manifest');
  if((campaign.zoneMap[definition.id]??campaign.caveMap[definition.id])!==definition)throw Error('Native assembly needs an actual campaign definition');
  if(!raw.initialActors.includes(raw.player)||new Set(raw.initialActors).size!==raw.initialActors.length)throw Error('Native assembly needs one complete initial census');
  if(raw.carry.inCave!==!campaign.zoneMap[definition.id])throw Error('Native assembly cave identity differs');
  const scene={zone:definition,player:raw.player,actors:[...raw.initialActors]};
  const environmentState=freshSceneEnvironmentState(),objectives=freshSceneObjectiveState(definition.id,campaign.completedObjectives);
  const sky=new NativeAreaSceneSky({scene,environment:environmentState,campaign});
  let population:NativeAreaScenePopulation;
  const geometryCampaign=bindNativeSceneSky(extendView(servicesView(services.geometry,['seasSeen','oceanBearing','seaNameOf','notice','text','seatOf','drainSurvival']),{ledger:campaign.ledger,
   get time(){return campaign.time;},get seats(){return campaign.seats;},
   createMonster:(...args:Parameters<World['createMonster']>)=>population.createMonster(...args)}),sky);
  const arena=makeNativeAreaArena(definition);
  const geometry=new NativeAreaSceneGeometry(scene,arena,geometryCampaign,config);
  const local=extendView(servicesView(services.residents,['viewRectFor','scene','clientActionHook']),{census:scene,get exits(){return geometry.exits;},massRuntime:null,
   localZoneAt:()=>scene.zone,isSafeAt:()=>scene.zone.objective.kind==='safe',lineOfSight:geometry.lineOfSight.bind(geometry)});
  const residents=new NativeResidentSession({campaign,area:{census:scene,local},history:campaign.nativeResidentHistory});
  const populationState={squadSequence:campaign.squadSeq,bombardMintRev:0,zoneGenTagging:false,magicPackEffects:[] as World['magicPackEffects'],magicPackResolving:false,magicPackRefreshPending:false};
  population=new NativeAreaScenePopulation({scene,geometry,campaign,sources:sources.population,populationSources:sources.populationResolution,
   context:{get time(){return campaign.time;},npcDialogues:residents.npcDialogues,
    applyPartyScale:a=>applyScenePartyScale({partyScaleCount:()=>scenePartyScaleCount({player:scene.player,seats:campaign.seats})},a),
    opaqueAt:(x,y)=>geometry.opaqueAt(x,y),sanctuaryBlocksCombat:()=>scene.zone.objective.kind==='safe',
    resolveHit:(...args)=>services.population.resolveHit(...args)},
   state:populationState});
  // Keep the native numeric squad namespace shared by every retained area.
  Object.defineProperty(populationState,'squadSequence',{enumerable:true,get:()=>campaign.squadSeq,set:(v:number)=>{campaign.squadSeq=v;}});
  const environment=new NativeAreaSceneEnvironment({scene,geometry,population,
   services:bindNativeSceneObjectives(extendView(servicesView(services.environment,['timeflow','completePuzzle']),{get time(){return campaign.time;}}),objectives),sources:sources.environment,state:environmentState});
  const ecology=new NativeAreaSceneEcology({scene,geometry,population,environment:environmentState,
   services:bindNativeSceneSky(extendView(servicesView(services.ecology,['throngClaimed']),{get time(){return campaign.time;},get seats(){return campaign.seats;}}),sky),sources:sources.ecology,state:freshSceneEcologyState()});
  const settlement=new NativeAreaSceneSettlement({scene,geometry,campaign,state:{townTierIdx:raw.carry.townTierIdx,mercOutpost:null}});
  const occurrences=new NativeAreaSceneOccurrences({scene,geometry,population,services:extendView(servicesView(services.occurrences,['traceRuns','timeflow']),{get time(){return campaign.time;}}),state:freshSceneOccurrenceState()});
  const objectiveHost=sceneObjectiveServices(population,objectives,{
   get zoneEntry(){return geometry.zoneEntry;},get sim(){return campaign.sim;},get walk(){return geometry.walk;},
   get structures(){return geometry.structures;},get arena(){return geometry.arena;},get time(){return campaign.time;},
   notice:(...a)=>geometry.notice(...a),text:(...a)=>geometry.text(...a),pathField:geometry.pathField.bind(geometry),
   farPoint:geometry.farPoint.bind(geometry),pointInSolid:geometry.pointInSolid.bind(geometry),farthestStand:geometry.farthestStand.bind(geometry)});
  const bounty=new NativeAreaSceneBounty({scene,geometry,population,environment,campaign,objectives:objectiveHost});
  const physical=new NativeAreaScenePhysical({scene,geometry,population,settlement,campaign,state:freshScenePhysicalState()});
  const transition:Transition=this.transition={inCave:raw.carry.inCave,entryFrom:raw.carry.entryFrom,voyage:raw.carry.voyage,
   charBorn:raw.carry.charBorn,charRegrowAcc:raw.carry.charRegrowAcc,zoneHasVendorCounter:false,crusadeWorksAt:null,
   descentStock:[],descentSpawnTimer:0,encounters:[],encRng:new Rng(1)};
  const harbor=new NativeAreaSceneHarbor({scene,geometry,population,settlement,run:campaign,state:transition,services:campaign,config});
  const openings=new NativeAreaSceneOpenings({scene,geometry,population,campaign,state:{annexOpen:new Set()},rewards:services.openings});
  const theater=new NativeAreaSceneTheater({scene,geometry,population,environment,ecology,campaign,
   state:{theaterVisit:0,theaterSpots:{camps:[],pois:[]},theaterRuns:[],theaterPour:new Map(),theaterAmbientBudget:0},
   services:bindNativeSceneSky(servicesView(services.theater,['geyserMode','imminentThreatTo','plantDressAt','dropGemAt','notice','moveActor','slipAway']),sky)});
  const encounters=new NativeAreaSceneEncounterBirth({scene,geometry,population,campaign,state:transition});
  const sites=new NativeAreaSceneSites({scene,geometry,population,settlement,campaign,state:{vocationSites:[]}});
  const history=new NativeAreaSceneHistory({scene,geometry,population,campaign,services:services.history,state:{playerCorpses:[]}});
  const descent=new NativeAreaSceneDescent({scene,geometry,population,settlement,campaign,state:transition,services:campaign});
  const coast=new NativeAreaSceneCoast({scene,geometry,campaign,state:transition,sources:sources.coast});
  const arrival=new NativeAreaSceneArrival({scene,geometry,campaign,policy:config});
  const runtimeState=freshSceneRuntimeBirthState();
  const adoption=new NativeAreaSceneAdoption({scene,geometry,campaign,state:runtimeState});
  this.generation=new NativeAreaSceneGeneration({scene,geometry,campaign,state:transition});
  const runtimeBirth=new NativeAreaSceneRuntimeBirth({scene,geometry,population,generation:this.generation,theater,campaign,state:runtimeState,sources:sources.runtime});
  const titans=new NativeAreaSceneTitans({scene,geometry,population,campaign});
  const registry=new NativeAreaSceneRuntimeRegistry({scene,geometry,birth:runtimeBirth,titans,descentState:transition,state:freshSceneRuntimeRegistryState()});
  this.input=Object.freeze({scene,geometry,population,environment,ecology,settlement,occurrences,bounty,physical,residents,objectives,
   sources:sources.inhabitants,campaign,state:{...freshSceneBirthState(),vendorStock:campaign.vendorStock,theaterVisitSeq:campaign.theaterVisitSeq},harbor,openings,theater,encounters,sites,history,descent,coast,arrival,adoption,registry,sky});
  this.host=composeNativeSceneBirth(this.input);
  // Brandt's once-armed shelf is run state, including between counter areas.
  Object.defineProperty(this.input.state,'vendorStock',{enumerable:true,get:()=>campaign.vendorStock,set:(v:World['vendorStock'])=>{campaign.vendorStock=v;}});
  this.graph=new NativeAreaSceneGraph({coast,campaign});this.boundaries=new NativeAreaSceneBoundaries(this.graph);
  for(const key of ['input','host','graph','boundaries','generation','transition'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 get phase(){return this.#phase;}
 sourceSession(geography:MassNativeGeography){return new NativeAreaSourceSession(this.graph,geography);}
 /** The campaign owns visit marks; native boundary knowledge changes remain native.
  * Establish the real player stand on the adopted grounds before birth. */
 prepare(session:NativeAreaSourceSession,source:NativeAreaSource,entry:Vec2,firstVisit:boolean):Readonly<NativeAreaPreparedPlacement> {
  if(this.#phase!=='fresh')throw Error('Native assembly has already started preparation');
  if(session.graph!==this.graph||session.read(source).definition!==this.input.scene.zone)throw Error('Native assembly source belongs to another owner');
  if(!Number.isFinite(entry.x)||!Number.isFinite(entry.y)||typeof firstVisit!=='boolean')throw Error('Native assembly needs explicit preparation inputs');
  this.#phase='preparing';
  try{return this.graph.withGenerationPolicies(()=>{
   this.boundaries.prepare(this.input.scene.zone,firstVisit,this.transition.inCave);
   const layout=this.generation.generate({...entry});
   this.input.geometry.adopt(layout.layout,entry);
   const fingerprint=serializeNativeAreaData(session.read(source).members);
   Object.freeze(layout);
   this.#prepared={source,session,layout,fingerprint,firstVisit,rngState:layout.rng.snapshot(),memoryState:serializeNativeAreaData(layout.memory)};this.#phase='prepared';
   return Object.freeze({entry:Object.freeze({...entry}),layoutSeed:layout.layoutSeed,...(layout.layout.spawnAt?{spawnAt:Object.freeze({...layout.layout.spawnAt})}:{})});
  });}catch(error){this.#phase='failed';throw error;}
 }
 birth():void {
  if(this.#phase!=='prepared'||!this.#prepared)throw Error('Native assembly needs its one prepared layout');
  const prepared=this.#prepared;
  if(serializeNativeAreaData(prepared.session.read(prepared.source).members)!==prepared.fingerprint)throw Error('Native assembly source changed after layout preparation');
  if(prepared.layout.rng.snapshot()!==prepared.rngState||serializeNativeAreaData(prepared.layout.memory)!==prepared.memoryState)throw Error('Native assembly generation continuation changed');
  this.#phase='birthing';
  try{this.graph.withGenerationPolicies(()=>{
   const {scene}=this.input,{layout}=prepared;
   runComposedNativeBirth(this.host,scene.zone,layout.layout,scene.zone.id,layout.memory,layout.rng,
    prepared.firstVisit,this.transition.entryFrom??undefined,this.transition.inCave,scene.player);
  });this.#phase='born';}catch(error){this.#phase='failed';throw error;}
 }
}
