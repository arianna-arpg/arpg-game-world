import {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
const exactPlayerAttendance=NativeAreaActorAuthority.prototype.isPresentPlayer;
import {NativeAreaSceneBirthAdmission} from './nativeAreaSceneBirthAdmission';
import {hasNativeSceneObjectiveBinding} from './nativeSceneObjectives';
/** Native objective watching on retained physical state and actual local services. */
import type {World} from '../engine/world';
import type {NativeSceneCensus,NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import type {NativeSceneObjectiveState} from './nativeSceneState';
import type {NativeSceneBirthState} from './nativeSceneBirthComposition';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaSceneEnvironment} from './nativeAreaSceneEnvironment';
import type {NativeAreaScenePhysical} from './nativeAreaScenePhysical';
import type {NativeAreaSceneObjectiveCompletion} from './nativeAreaSceneObjectiveCompletion';
import type {NativeAreaSceneLoot} from './nativeAreaSceneLoot';
import type {NativeAreaSceneGraph} from './nativeAreaSceneGraph';
import type {NativeAreaSceneCoast} from './nativeAreaSceneCoast';
import type {NativeAreaSceneTheater} from './nativeAreaSceneTheater';
import type {NativeAreaSceneAdoption} from './nativeAreaSceneAdoption';
import type {NativeSceneServiceHost} from '../engine/nativeScenePopulation';
import {sceneLivingSpawners,spawnSceneWave} from '../engine/nativeScenePopulation';
import {sidezonePocketId} from '../data/sidezones';
import * as native from '../engine/nativeSceneObjectiveWatching';
type Host=native.NativeSceneObjectiveWatchingHost;
export type NativeSceneObjectiveWatchingState=Pick<Host,'escapeTimer'|'zoneEnteredAt'|'lures'>;
export function freshSceneObjectiveWatchingState(enteredAt:number):NativeSceneObjectiveWatchingState {
 return {escapeTimer:2.5,zoneEnteredAt:enteredAt,lures:new Map()};
}
export interface NativeSceneObjectiveWatchingInput {
 authority:NativeAreaActorAuthority<object>;
 scene:NativeSceneCensus;geometry:NativeAreaSceneGeometry;population:NativeAreaScenePopulation;
 objectives:NativeSceneObjectiveState;state:NativeSceneObjectiveWatchingState;
 birthState:Pick<NativeSceneBirthState,'packageAskEngaged'>;
 environment:NativeAreaSceneEnvironment;physical:NativeAreaScenePhysical;
 completion:NativeAreaSceneObjectiveCompletion;loot:NativeAreaSceneLoot;
 graph:NativeAreaSceneGraph;coast:NativeAreaSceneCoast;theater:NativeAreaSceneTheater;
 adoption:NativeAreaSceneAdoption;objectiveServices:Omit<NativeSceneServiceHost,'seats'|'partyScaleCount'>;
 campaign:Pick<Host,'time'|'kills'|'ledger'|'completedObjectives'|'zoneMap'|'visited'|'surveyed'|'mintVeil'|'dropRuleOf'>;
 quests:Pick<Host,'nearestHand'>;
 /** The physical mover belongs to this area; an active World is not a substitute. */
 movement:Pick<Host,'moveActor'>;
}
export class NativeAreaSceneObjectiveWatching {
 readonly input:NativeSceneObjectiveWatchingInput;readonly host:Host;
 private readonly waveHost:NativeSceneObjectiveWatchingInput['objectiveServices'];
 private readonly birthAdmission:NativeAreaSceneBirthAdmission;
 constructor(raw:NativeSceneObjectiveWatchingInput){
  const roots=Object.create(null);
  for(const key of ['authority','scene','geometry','population','objectives','state','birthState','environment','physical','completion','loot','graph','coast','theater','adoption','objectiveServices','campaign','quests','movement']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native objective watching needs an own object binding: '+key);
   roots[key]=d.value;
  }
  const input:NativeSceneObjectiveWatchingInput=this.input=Object.freeze(roots),host={} as Host;
  if(input.geometry.state!==input.scene)throw Error('Native objective watching needs identical geometry/census');
  for(const owner of [input.population,input.environment,input.physical,input.completion,input.loot,input.coast,input.theater,input.adoption])
   if(owner.input.scene!==input.scene||owner.input.geometry!==input.geometry)throw Error('Native objective watching needs identical local owners');
  if(!hasNativeSceneObjectiveBinding(input.objectiveServices,input.population,input.objectives)||input.completion.input.objectives!==input.objectives||input.graph.input.coast!==input.coast)throw Error('Native objective watching needs its existing objective and graph state');
  if(input.loot.input.physical!==input.physical||input.environment.input.population!==input.population||input.physical.input.population!==input.population||input.theater.input.population!==input.population||input.theater.input.environment!==input.environment)throw Error('Native watcher needs identical physical and environment stores');
  for(const owner of [input.population,input.physical,input.completion,input.loot,input.coast,input.theater,input.adoption,input.graph])if(owner.input.campaign as object!==input.campaign)throw Error('Native watcher needs identical campaign owners');
  this.birthAdmission=new NativeAreaSceneBirthAdmission({authority:input.authority,scene:input.scene,population:input.population});
  for(const key of ['escapeTimer','zoneEnteredAt','lures'])if(!Object.hasOwn(input.state,key))throw Error('Native objective watching needs retained '+key);
  const fields=(provider:()=>object,keys:readonly string[],write=false)=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){return(provider() as Record<string,unknown>)[key];},...(write?{set(v:unknown){(provider() as Record<string,unknown>)[key]=v;}}:{})});};
  const methods=(provider:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){const p=provider() as Record<string,Function>,fn=p[key];if(typeof fn!=='function')throw Error('Missing native objective watching capability: '+key);return(...a:unknown[])=>fn.apply(p,a);}});};
  fields(()=>input.scene,['zone','actors','player']);
  Object.defineProperty(host,'isPresentLocalPlayer',{enumerable:true,value:()=>Reflect.apply(exactPlayerAttendance,input.authority,[input.scene])});
  fields(()=>input.geometry,['flashes','caveEntrances','waypointPos','walk','exits']);
  methods(()=>input.geometry,['clampPos','findFreeSpot','farPoint','pathField','roofedStructureAt','rayElev','doodadsAt','opaqueAt','markDoodadsChanged']);
  fields(()=>input.objectives,['objectiveDone','objectiveLost','spires','rifts','pyres','digs','cull','offering','procession','heldFixture','objectiveLatch','wave','waveActive','waveTimer','spireReinforceAt'],true);
  fields(()=>input.state,['escapeTimer','zoneEnteredAt','lures'],true);
  fields(()=>input.birthState,['packageAskEngaged'],true);
  fields(()=>input.environment.input.state,['puzzles']);fields(()=>input.physical.input.state,['altars','drops']);
  fields(()=>input.campaign,['time','kills','ledger','completedObjectives','zoneMap','visited','surveyed','dropRuleOf']);fields(()=>input.campaign,['mintVeil'],true);
  fields(()=>input.adoption.context,['sim']);methods(()=>input.adoption.context,['fractureView']);
  Object.defineProperty(host,'createMonster',{enumerable:true,get:()=>this.birthAdmission.createMonster});
  Object.defineProperty(host,'admitBirth',{enumerable:true,value:(body:Parameters<NativeAreaSceneBirthAdmission['admitInserted']>[0])=>this.birthAdmission.admitInserted(body)});
  methods(()=>input.population,['effectiveSpawn','baseTable','enemiesOf']);
  methods(()=>input.population.input.sources.ambient,['weightedPick']);
  methods(()=>input.theater,['clampNear']);methods(()=>input.theater.input.ecology,['actorById']);
  methods(()=>input.objectiveServices,['countedEnemies','objectiveCountable']);
  methods(()=>input.completion,['completeObjective']);methods(()=>input.loot,['dropGemAt','ownSpoils']);
  methods(()=>input.graph,['chartNeighborsOf']);methods(()=>input.coast,['refreshExitLabels']);
  methods(()=>input.quests,['nearestHand']);methods(()=>input.movement,['moveActor']);
  Object.defineProperty(host,'massRuntime',{enumerable:true,value:null});
  methods(()=>this,OWN_METHODS);
  this.waveHost=Object.create(input.objectiveServices);Object.defineProperty(this.waveHost,'createMonster',{get:()=>host.createMonster});Object.defineProperty(this.waveHost,'admitBirth',{value:host.admitBirth});Object.freeze(this.waveHost);
  this.host=Object.freeze(host);for(const key of ['input','host','waveHost','birthAdmission'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 livingSpawners(){return sceneLivingSpawners(this.host);}
 spawnWave(){return this.birthAdmission.run(()=>spawnSceneWave(this.waveHost));}
 sidezoneIdFor(...a:Parameters<World['sidezoneIdFor']>){return sidezonePocketId(...a);}
 updateObjective(...a:Parameters<World['updateObjective']>){
  return this.birthAdmission.run(()=>native.sceneUpdateObjective(this.host,...a));
 }

 lairAskView(...a:Parameters<World['lairAskView']>){return native.sceneLairAskView(this.host,...a);}
 packageAskView(...a:Parameters<World['packageAskView']>){return native.scenePackageAskView(this.host,...a);}
 ventureAskView(...a:Parameters<World['ventureAskView']>){return native.sceneVentureAskView(this.host,...a);}
 massHoldHost(...a:Parameters<World['massHoldHost']>){return native.sceneMassHoldHost(this.host,...a);}
 massProcessionReachable(...a:Parameters<World['massProcessionReachable']>){return native.sceneMassProcessionReachable(this.host,...a);}
 nativeBeaconHost(...a:Parameters<World['nativeBeaconHost']>){
  const host=native.sceneNativeBeaconHost(this.host,...a),spawn=host.spawn;
  return {...host,spawn:(...args:Parameters<typeof spawn>)=>this.birthAdmission.run(()=>spawn.apply(host,args))};
 }
 contestPressers(...a:Parameters<World['contestPressers']>){return native.sceneContestPressers(this.host,...a);}
 resolveContest(...a:Parameters<World['resolveContest']>){return native.sceneResolveContest(this.host,...a);}
 setLure(...a:Parameters<World['setLure']>){return native.sceneSetLure(this.host,...a);}
 spawnProcessionAmbush(...a:Parameters<World['spawnProcessionAmbush']>){return this.birthAdmission.run(()=>native.sceneSpawnProcessionAmbush(this.host,...a));}
 nativeProcessionBodies(...a:Parameters<World['nativeProcessionBodies']>){return this.birthAdmission.run(()=>native.sceneNativeProcessionBodies(this.host,...a));}
 surveyAround(...a:Parameters<World['surveyAround']>){return native.sceneSurveyAround(this.host,...a);}
 updateRiftPours(...a:Parameters<World['updateRiftPours']>){return this.birthAdmission.run(()=>native.sceneUpdateRiftPours(this.host,...a));}
 driveHoldFixtures(...a:Parameters<World['driveHoldFixtures']>){return this.birthAdmission.run(()=>native.sceneDriveHoldFixtures(this.host,...a));}
 dwellReachable(...a:Parameters<World['dwellReachable']>){return native.sceneDwellReachable(this.host,...a);}
 storyPair(...a:Parameters<World['storyPair']>){return native.sceneStoryPair(this.host,...a);}
 massObjectiveBeaconTables(...a:Parameters<World['massObjectiveBeaconTables']>){return native.sceneMassObjectiveBeaconTables(this.host,...a);}
 massObjectiveSpawnTable(...a:Parameters<World['massObjectiveSpawnTable']>){return native.sceneMassObjectiveSpawnTable(this.host,...a);}
}
const OWN_METHODS=["lairAskView","packageAskView","ventureAskView","massHoldHost","massProcessionReachable","nativeBeaconHost","contestPressers","resolveContest","setLure","spawnProcessionAmbush","nativeProcessionBodies","surveyAround","updateRiftPours","driveHoldFixtures","dwellReachable","storyPair","massObjectiveBeaconTables","massObjectiveSpawnTable","livingSpawners","spawnWave","sidezoneIdFor"] as const;
