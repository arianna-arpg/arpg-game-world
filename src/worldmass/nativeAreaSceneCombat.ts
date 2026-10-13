import {NativeAreaSceneEncounterArrival} from './nativeAreaSceneEncounterArrival';
import {NativeAreaSceneSurfaceArrival} from './nativeAreaSceneSurfaceArrival';
import {sceneResumeVoyageArrival} from '../engine/nativeSceneVoyageArrival';
import {NativeAreaSceneOdyssey} from './nativeAreaSceneOdyssey';
import {NativeAreaSceneHistoryArrival} from './nativeAreaSceneHistoryArrival';
import {NativeAreaSceneHarborServices} from './nativeAreaSceneHarborServices';
import {NativeAreaSceneSiteBirths} from './nativeAreaSceneSiteBirths';
import {installNativeHostedSerializer} from './nativeHostedSerialization';
import * as wireCore from '../engine/nativeSceneWireQueries';
import type {NativeSnapshotHost} from '../net/nativeSnapshotHost';
import {serializeSnapshot,serializeZone,type StateSnapshot,type ZoneMsg} from '../net/snapshot';
import {stampAudiences} from '../net/seatView';
import {encounterCueOf} from '../engine/encounterCombat';
import {NativeAreaParty,type NativeAreaPartyBaseHost} from './nativeAreaParty';
import * as uiCore from '../engine/nativeSceneUIActions';
import type {NativeSceneUIActionHost} from '../engine/nativeSceneUIActionHost';
import {isNativeAreaUIAction,nativeAreaUISeatArgument,type NativeAreaUIAction,type NativeAreaUIActionMethods} from './nativeAreaUIActions';
import * as menuCore from '../engine/nativeSceneMenuQueries';
import type {NativeSceneMenuHost} from '../engine/nativeSceneMenuHost';
import {isNativeAreaMenuQuery,nativeAreaMenuSeatArgument,type NativeAreaMenuQuery,type NativeAreaMenuQueryMethods} from './nativeAreaMenuQueries';
import {refreshNativeTownStations} from './nativeAreaTownStationRefresh';
import * as viewCore from '../engine/nativeSceneViewQueries';
import type {NativeSceneViewHost} from '../engine/nativeSceneViewHost';
import {isNativeAreaViewQuery,nativeAreaViewActorArgument,type NativeAreaViewQuery,type NativeAreaViewQueryMethods} from './nativeAreaViewQueries';
import * as characterRestore from '../engine/nativeCharacterRestoration';
import {applyCharacterFields,type NativeCharacterRestoreHost} from '../meta/character';
import type {CharacterFields} from '../meta/characterResume';
import {sceneIndexSeats} from '../engine/nativeSceneCombatControl';
import {sceneRestoreAccountRelics} from '../engine/nativeSceneCampaignLifecycle';
import {NativeAreaCharacterResume,assertNativeCharacterResume,type NativeCharacterResumeReceipt} from './nativeAreaCharacterResume';
import * as characterCreation from '../engine/nativeCharacterCreation';
import {assertNativeCharacterReceipt,type NativeCharacterCreationReceipt} from './nativeAreaCharacterCreation';
import {NativeAreaSceneAI} from './nativeAreaSceneAI';
import type {NativeSceneAIHost} from '../engine/nativeSceneAIHost';
import type {NativeSceneAIPreparationHost} from '../engine/nativeSceneAIPreparation';
import type {Seat} from '../engine/world';
import * as inputCore from '../engine/nativeSceneInput';
import {NativeAreaSceneInput} from './nativeAreaSceneInput';
import {NativeAreaCampaignInputState} from './nativeAreaCampaignInputState';
import {assertNativeRetainedMassState,readNativeRetainedMassRuntime,readNativeRetainedMassAway} from './nativeAreaRetainedMassState';
import * as localControllers from '../engine/nativeSceneLocalControllers';
import * as actorTick from '../engine/nativeSceneActorTick';
import * as effectsTick from '../engine/nativeSceneEffectsTick';
import * as frameCallbacks from '../engine/nativeSceneFrameCallbacks';
import * as frameServices from '../engine/nativeSceneFrameServices';
import * as frameAreaEvents from '../engine/nativeSceneFrameAreaEvents';
import * as campaignEvents from '../engine/nativeSceneCampaignEvents';
import * as frameTravel from '../engine/nativeSceneFrameTravel';
import * as frameCore from '../engine/nativeSceneFrame';
import * as directoryCore from '../engine/nativeSceneDirectory';
import type {NativeSceneFrameHost} from '../engine/nativeSceneFrameHost';
import {NativeAreaCampaignFrameState} from './nativeAreaCampaignFrameState';
import {sceneIsAmbientTag,scenePartyScaleCount,type NativeSceneServiceHost} from '../engine/nativeScenePopulation';
import * as motion from '../engine/nativeSceneCombatMotion';
import {observeNativeSource} from '../engine/nativeCombatRecordObservation';
/** The actual retained combat composition. Queue stepping and publication are explicit. */
import {isNativeWorld,type World} from '../engine/world';
import type {Actor} from '../engine/actor';
import {NativeAreaSceneAssembly} from './nativeAreaSceneAssembly';
import {NativeAreaScenePresence} from './nativeAreaScenePresence';
import {NativeAreaSceneProgression} from './nativeAreaSceneProgression';
import {NativeAreaSceneQuests} from './nativeAreaSceneQuests';
import {NativeAreaSceneQuestInteraction} from './nativeAreaSceneQuestInteraction';
import {NativeAreaSceneObjectiveWatching} from './nativeAreaSceneObjectiveWatching';
import {NativeAreaActorAuthority,type NativeAreaAuthorityBinding} from './nativeAreaActorAuthority';
import {NativeAreaMaddenLedger,assertNativeMaddenLedger} from './nativeAreaMaddenLedger';
import type {NativeAreaOngoingCampaign} from './nativeAreaSceneOngoing';
import {NativeAreaSceneCombatCampaign} from './nativeAreaSceneCombatCampaign';
import {NativeAreaSceneCombatArena} from './nativeAreaSceneCombatArena';
import {NativeAreaSceneCombatControl} from './nativeAreaSceneCombatControl';
import {NativeAreaSceneCampaignTransitions} from './nativeAreaSceneCampaignTransitions';
import {NativeAreaSceneCampaignFrame,type NativeAreaCampaignFrameHost} from './nativeAreaSceneCampaignFrame';
import {isNativeAreaSceneTransitionCoordinator,NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
import {NativeAreaSceneCombatRuntimeState} from './nativeAreaSceneCombatRuntimeState';
import {createNativeAreaCombatOperation,type NativeAreaCombatOperation,type NativeCombatActivation} from './nativeAreaCombatOperation';
import type {NativeSceneCombatHost} from '../engine/nativeSceneCombatHost';
import type {NativeAssaultHost} from '../engine/nativeAssaultHost';
import type {NativeSceneCombatContextHost} from '../engine/nativeSceneCombatContext';
import {sceneForwardSummonSockets} from '../engine/nativeSceneSummonPreparation';
import {sceneShowSkillArrival} from '../engine/nativeSceneSkillArrival';
import {NativeAreaSceneTethers} from "./nativeAreaSceneTethers";
import {NativeAreaSceneRestoration} from "./nativeAreaSceneRestoration";
import {NativeAreaSceneCastingPreparation} from "./nativeAreaSceneCastingPreparation";
import {NativeAreaSceneDisplacement} from "./nativeAreaSceneDisplacement";
import {NativeAreaSceneCombatState} from "./nativeAreaSceneCombatState";
import {NativeAreaSceneDefensePreparation} from "./nativeAreaSceneDefensePreparation";
import {NativeAreaSceneProjectiles} from "./nativeAreaSceneProjectiles";
import {NativeAreaSceneKillAftermath} from "./nativeAreaSceneKillAftermath";
import {NativeAreaSceneGroundFollowUps} from "./nativeAreaSceneGroundFollowUps";
import {NativeAreaSceneSummonPreparation} from "./nativeAreaSceneSummonPreparation";
import * as core0 from '../engine/nativeSceneCombatCasting';
import * as core1 from '../engine/nativeSceneCombatResolution';
import * as core2 from '../engine/nativeSceneCombatSpawning';
import * as core3 from '../engine/nativeSceneCombatContext';
import * as core4 from '../engine/nativeSceneCombatEvents';
import {NativeAreaSceneWarlordArrival} from './nativeAreaSceneWarlordArrival';
export interface NativeAreaSceneCombatInput {assembly:NativeAreaSceneAssembly;progression:NativeAreaSceneProgression;quests:NativeAreaSceneQuests;questInteraction:NativeAreaSceneQuestInteraction;watching:NativeAreaSceneObjectiveWatching;authority:NativeAreaActorAuthority<NativeAreaCombatServices>;campaign:NativeAreaOngoingCampaign;characterWriter:World;maddenLedger:NativeAreaMaddenLedger;coordinator:NativeAreaSceneTransitionCoordinator}
export interface NativeAreaCombatServices {readonly warlordArrival:NativeAreaSceneWarlordArrival;readonly encounterArrival:NativeAreaSceneEncounterArrival;readonly surfaceArrival:NativeAreaSceneSurfaceArrival;readonly harborServices:NativeAreaSceneHarborServices;readonly siteBirths:NativeAreaSceneSiteBirths;readonly historyArrival:NativeAreaSceneHistoryArrival;readonly odyssey:NativeAreaSceneOdyssey;readonly ai:NativeAreaSceneAI;readonly inputFrame:NativeAreaSceneInput;readonly combat:NativeAreaSceneCombat;readonly progression:NativeAreaSceneProgression;readonly loot:NativeAreaSceneAssembly['lootController'];readonly objective:NativeAreaSceneAssembly['objectiveController'];readonly geometry:NativeAreaSceneAssembly['input']['geometry'];readonly maddenLedger:NativeAreaMaddenLedger;readonly campaignOwner:NativeAreaSceneCombatCampaign;readonly combatArena:NativeAreaSceneCombatArena;readonly control:NativeAreaSceneCombatControl;readonly campaignTransitions:NativeAreaSceneCampaignTransitions;readonly campaignFrame:NativeAreaSceneCampaignFrame;readonly tethers:NativeAreaSceneTethers;readonly restoration:NativeAreaSceneRestoration;readonly castingPreparation:NativeAreaSceneCastingPreparation;readonly displacement:NativeAreaSceneDisplacement;readonly combatState:NativeAreaSceneCombatState;readonly defensePreparation:NativeAreaSceneDefensePreparation;readonly projectiles:NativeAreaSceneProjectiles;readonly killAftermath:NativeAreaSceneKillAftermath;readonly groundFollowUps:NativeAreaSceneGroundFollowUps;readonly summonPreparation:NativeAreaSceneSummonPreparation;}
type TransferredBuff=Parameters<World['treeBuffSources']['get']>[0];
interface ActorControllerPacket {source:NativeAreaSceneCombat;bond:unknown;grants:unknown;clocks:unknown;buffs:[TransferredBuff,NonNullable<ReturnType<World['treeBuffSources']['get']>>][];strike:ReturnType<World['strikeReleaseBodies']['get']>}
const controllerTransfers=new WeakMap<object,WeakMap<Actor,ActorControllerPacket>>();
type Host=wireCore.NativeSceneWireQueryHost&Pick<World,"frostHeld"|"gloom"|"harvestHolds"|"livePings"|"seatHudWire"|"smithCounterHere"|"vendorEntryHold"|"withApproachPass"|"seatHarvestView"|"vendorGemsOpen">&Pick<World,'addSeat'|'adoptSeatMeta'|'hireMercenary'>&NativeSceneUIActionHost&Pick<characterCreation.NativeCharacterCreationHost,'veteranFlaskDeals'>&NativeSceneMenuHost&NativeSceneViewHost&NativeSceneAIHost&NativeSceneAIPreparationHost&NativeSceneCombatHost&NativeSceneCombatContextHost&NativeAssaultHost&motion.NativeSceneCombatMotionHost&NativeSceneFrameHost&NativeAreaCampaignFrameHost&directoryCore.NativeSceneDirectoryHost&inputCore.NativeSceneInputHost;
type Binding<T>={get:()=>T;set?:(value:T)=>void};type Bindings={[K in keyof Host]:Binding<Host[K]>};
function field<O extends object,K extends keyof O>(owner:()=>O,key:K):Binding<O[K]>{return {get:()=>owner()[key],set:value=>{owner()[key]=value;}};}
function method<O extends object,K extends keyof O>(owner:()=>O,key:K):{get:()=>O[K]}{return {get:()=>{const receiver=owner(),fn=receiver[key];return typeof fn==='function'?((...args:unknown[])=>Reflect.apply(fn,receiver,args)) as O[K]:fn;}};}
function wireAbsent<K extends 'musterRings'|'seatCorpseMarks'>(writer:World,key:K):World[K]{const value=presentationData(writer,key);if(value!==null)throw Error('Native hosted wire cannot adopt a legacy shard-only provider: '+key);return value;}
function wireValues<T>(rows:readonly T[]):T[]{if(!Array.isArray(rows))throw Error('Native wire needs an ordinary array');const length=Object.getOwnPropertyDescriptor(rows,'length');if(!length||!Object.hasOwn(length,'value'))throw Error('Native wire needs ordinary length');const out:T[]=[];for(let i=0;i<length.value;i++){const d=Object.getOwnPropertyDescriptor(rows,i);if(!d||!Object.hasOwn(d,'value'))throw Error('Native wire needs actual own array entries');out.push(d.value as T);}return out;}
let wireSerializing=false;
const wireFinalPhysical=NativeAreaActorAuthority.prototype.assertFinalPhysical;
const wireBindingFor=NativeAreaActorAuthority.prototype.bindingFor;
const actualCombats=new WeakSet<object>();
const exactPlayerAttendance=NativeAreaActorAuthority.prototype.isPresentPlayer;
const exactActorAttendance=NativeAreaActorAuthority.prototype.isPresentActor;
function presentationData(owner:object,key:PropertyKey):unknown{const d=Object.getOwnPropertyDescriptor(owner,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native presentation needs actual ordinary writer/seat fields');return d.value;}
const exactPhysicalSeats=NativeAreaActorAuthority.prototype.physicalSeats;
export function isNativeAreaSceneCombat(value:unknown):value is NativeAreaSceneCombat{return !!value&&typeof value==='object'&&actualCombats.has(value);}
export class NativeAreaSceneCombat {
 readonly warlordArrival:NativeAreaSceneWarlordArrival;
 readonly harborServices:NativeAreaSceneHarborServices;
 readonly encounterArrival:NativeAreaSceneEncounterArrival;
 readonly surfaceArrival:NativeAreaSceneSurfaceArrival;
 readonly siteBirths:NativeAreaSceneSiteBirths;
 readonly historyArrival:NativeAreaSceneHistoryArrival;
 readonly odyssey:NativeAreaSceneOdyssey;
 readonly party:NativeAreaParty;
 readonly inputFrame:NativeAreaSceneInput;
 readonly input:Readonly<NativeAreaSceneCombatInput>;readonly runtimeState:NativeAreaSceneCombatRuntimeState;
 readonly services:NativeAreaCombatServices;readonly campaignOwner:NativeAreaSceneCombatCampaign;readonly combatArena:NativeAreaSceneCombatArena;readonly control:NativeAreaSceneCombatControl;readonly campaignTransitions:NativeAreaSceneCampaignTransitions;readonly campaignFrame:NativeAreaSceneCampaignFrame;
  readonly tethers:NativeAreaSceneTethers;
 readonly restoration:NativeAreaSceneRestoration;
 readonly castingPreparation:NativeAreaSceneCastingPreparation;
 readonly displacement:NativeAreaSceneDisplacement;
 readonly combatState:NativeAreaSceneCombatState;
 readonly defensePreparation:NativeAreaSceneDefensePreparation;
 readonly projectiles:NativeAreaSceneProjectiles;
 readonly killAftermath:NativeAreaSceneKillAftermath;
 readonly groundFollowUps:NativeAreaSceneGroundFollowUps;
 readonly summonPreparation:NativeAreaSceneSummonPreparation;
 readonly #publishedArea:Function;
 readonly ai:NativeAreaSceneAI;
 readonly #resumeFactory={make:NativeAreaCharacterResume.prototype.makeSeat,admit:NativeAreaCharacterResume.prototype.admitSeat};
 #restoreToken:NativeCharacterResumeReceipt|undefined;
 readonly #operation:NativeAreaCombatOperation;readonly #host:Host;readonly #viewHost:NativeSceneViewHost&NativeSceneUIActionHost;readonly #menuHost:NativeSceneMenuHost;
 readonly #wireHost:NativeSnapshotHost;
 #wireSeats:Seat[]|undefined;
 readonly #activationReady:()=>boolean;
 readonly #frameCallbacks:Pick<Host,'collectDeedDot'|'doodadEffects'|'incursionEvents'>;
 readonly #populationHost:NativeSceneServiceHost;
 /** Serialize the exact retained area, without changing the published writer. */
 serializeHostedArea(tick:number):{zone:ZoneMsg;snapshot:StateSnapshot}{
  if(wireSerializing||this.#wireSeats||!Number.isSafeInteger(tick)||tick<0)throw Error('Native wire needs a non-reentrant finite tick');
  wireSerializing=true;try{
  const {authority}=this.input,scene=this.scene,raw=presentationData(scene,'actors') as Actor[],actors=wireValues(raw),initial=Reflect.apply(exactPhysicalSeats,authority,[scene]) as Seat[],rows=initial.map(seat=>({seat,actor:presentationData(seat,'actor')}));
  if(!initial.length)throw Error('Native wire area needs a physical audience');
  const check=()=>{if(presentationData(scene,'actors')!==raw)throw Error('Native wire census changed');const live=wireValues(raw);if(live.length!==actors.length||live.some((actor,i)=>actor!==actors[i]))throw Error('Native wire physical cohort changed');for(const row of rows)if(presentationData(row.seat,'actor')!==row.actor)throw Error('Native wire Seat body changed');const binding=Reflect.apply(wireBindingFor,authority,[scene]);Reflect.apply(wireFinalPhysical,authority,[binding,actors]);};
  return this.#operation.enter({permission:'proc',physical:actors,sources:[]},()=>{
   const selected=Reflect.apply(exactPhysicalSeats,authority,[scene]) as Seat[];if(selected.length!==initial.length||selected.some((seat,i)=>seat!==initial[i]))throw Error('Native wire seats changed');check();this.#wireSeats=initial;Object.freeze(initial);
   try{const zone=serializeZone(this.#wireHost),snapshot=serializeSnapshot(this.#wireHost,tick);stampAudiences(this.#wireHost,snapshot);check();return{zone,snapshot};}finally{this.#wireSeats=undefined;}
  });
  }finally{wireSerializing=false;}
 }
 /** Actor-independent retained layout read, also valid for an empty keeper area. */
 stationAnchor(...args:Parameters<World['stationAnchor']>):ReturnType<World['stationAnchor']>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>frameServices.sceneStationAnchor(this.#host,...args));}
 /** Display queries use their published physical audience; a selected old-area
  * query never borrows the departed representative. The original query may
  * mutate its actual local dialogue, cache, boss-bar or frame state. */
 queryView<K extends NativeAreaViewQuery>(key:K,...args:Parameters<NativeAreaViewQueryMethods[K]>):ReturnType<NativeAreaViewQueryMethods[K]> {
  if(!isNativeAreaViewQuery(key)||!this.isPresentationArea())throw Error('Native view query needs its actual published physical area');
  const seat=presentationData(this.input.characterWriter,'localSeat') as Seat,actor=presentationData(seat,'actor') as Actor;
  const physical=[actor],seats=[{seat,actor}];if(nativeAreaViewActorArgument(key))physical.push(args[0] as Actor);
  if((key==='seatModeDef'||key==='seatStageDef'||key==='speechFocusTarget')&&args[0]!==undefined){const selected=args[0] as Seat,body=presentationData(selected,'actor') as Actor;seats.push({seat:selected,actor:body});physical.push(body);}
  const present=()=>{const roster=Reflect.apply(exactPhysicalSeats,this.input.authority,[this.scene]);return seats.every(row=>roster.includes(row.seat)&&presentationData(row.seat,'actor')===row.actor);};
  if(!present())throw Error('Native view query needs its actual physical seat');
  return this.#operation.enter({permission:'proc',physical,sources:[]},()=>{const fn=this.#viewHost[key],physicalSeats=present(),published=Reflect.apply(this.#publishedArea,this.input.coordinator,[]),attending=physical.every(body=>Reflect.apply(exactActorAttendance,this.input.authority,[this.scene,body]));if(!physicalSeats||published.combat!==this||!attending||presentationData(this.input.characterWriter,'localSeat')!==seat||seats.some(row=>presentationData(row.seat,'actor')!==row.actor))throw Error('Native view presentation changed during admission');return Reflect.apply(fn,this.#viewHost,args) as ReturnType<NativeAreaViewQueryMethods[K]>;});
 }
 /** Menu reads preserve actual physical seat records and the selected native owner. */
 queryMenu<K extends NativeAreaMenuQuery>(key:K,...args:Parameters<NativeAreaMenuQueryMethods[K]>):ReturnType<NativeAreaMenuQueryMethods[K]> {
  if(!isNativeAreaMenuQuery(key)||!this.isPresentationArea())throw Error('Native menu query needs its actual published physical area');
  const local=presentationData(this.input.characterWriter,'localSeat') as Seat,actor=presentationData(local,'actor') as Actor;
  const seatIndex=nativeAreaMenuSeatArgument(key),selected=seatIndex===undefined||args[seatIndex]===undefined?local:args[seatIndex] as Seat,body=presentationData(selected,'actor') as Actor;
  const present=()=>{const roster=Reflect.apply(exactPhysicalSeats,this.input.authority,[this.scene]);return roster.includes(local)&&roster.includes(selected);};if(!present())throw Error('Native menu query needs its actual physical seat');
  return this.#operation.enter({permission:'proc',physical:[actor,body],sources:[]},()=>{const fn=this.#menuHost[key],physicalSeats=present(),published=Reflect.apply(this.#publishedArea,this.input.coordinator,[]),attending=[actor,body].every(selectedBody=>Reflect.apply(exactActorAttendance,this.input.authority,[this.scene,selectedBody]));if(!physicalSeats||published.combat!==this||!attending||presentationData(this.input.characterWriter,'localSeat')!==local||presentationData(local,'actor')!==actor||presentationData(selected,'actor')!==body)throw Error('Native menu presentation changed during admission');return Reflect.apply(fn,this.#menuHost,args) as ReturnType<NativeAreaMenuQueryMethods[K]>;});
 }
 /** Published UI commands route to the current admitted local owners. */
 applyUIAction<K extends NativeAreaUIAction>(key:K,...args:Parameters<NativeAreaUIActionMethods[K]>):ReturnType<NativeAreaUIActionMethods[K]> {
  if(!isNativeAreaUIAction(key)||!this.isPresentationArea())throw Error('Native UI action query needs its actual published physical area');
  const local=presentationData(this.input.characterWriter,'localSeat') as Seat,actor=presentationData(local,'actor') as Actor;
  const seatIndex=nativeAreaUISeatArgument(key),selected=seatIndex===undefined||args[seatIndex]===undefined?local:args[seatIndex] as Seat,body=presentationData(selected,'actor') as Actor;
  const present=()=>{const roster=Reflect.apply(exactPhysicalSeats,this.input.authority,[this.scene]);return roster.includes(local)&&roster.includes(selected);};if(!present())throw Error('Native UI action query needs its actual physical seat');
  return this.#operation.enter({permission:'proc',physical:[actor,body],sources:[]},()=>{const fn=(this.#viewHost)[key],physicalSeats=present(),published=Reflect.apply(this.#publishedArea,this.input.coordinator,[]),attending=[actor,body].every(selectedBody=>Reflect.apply(exactActorAttendance,this.input.authority,[this.scene,selectedBody]));if(!physicalSeats||published.combat!==this||!attending||presentationData(this.input.characterWriter,'localSeat')!==local||presentationData(local,'actor')!==actor||presentationData(selected,'actor')!==body)throw Error('Native UI action presentation changed during admission');return Reflect.apply(fn,this.#viewHost,args) as ReturnType<NativeAreaUIActionMethods[K]>;});
 }
 applyInputs(...args:Parameters<World['applyInputs']>):void{this.inputFrame.applyInputs(...args);}
 passInputTime(...args:Parameters<World['passInputTime']>):void{this.inputFrame.passInputTime(...args);}
 useMetaSkill(...args:Parameters<World['useMetaSkill']>):boolean{return this.#operation.enter({permission:'proc',sources:[args[0]]},()=>inputCore.sceneUseMetaSkill(this.#host,...args));}
 get scene(){return this.input.assembly.input.scene;}get state(){return this.input.progression.input.state;}
 constructor(raw:NativeAreaSceneCombatInput){
  const writerSlot=raw&&Object.getOwnPropertyDescriptor(raw,'characterWriter');if(!writerSlot||!Object.hasOwn(writerSlot,'value'))throw Error('Native combat needs its own actual character writer');assertNativeRetainedMassState(writerSlot.value);
  const roots=Object.create(null);for(const key of ['assembly','progression','quests','questInteraction','watching','authority','campaign','characterWriter','maddenLedger','coordinator']){const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native combat needs own actual root: '+key);roots[key]=d.value;}
  const input=this.input=Object.freeze(roots) as Readonly<NativeAreaSceneCombatInput>,{assembly,progression,quests,questInteraction,watching,authority,campaign,maddenLedger}=input;
  if(!(assembly instanceof NativeAreaSceneAssembly)||!(progression instanceof NativeAreaSceneProgression)||!(quests instanceof NativeAreaSceneQuests)||!(watching instanceof NativeAreaSceneObjectiveWatching)||!(authority instanceof NativeAreaActorAuthority))throw Error('Native combat needs actual area owners');
  if(!(questInteraction instanceof NativeAreaSceneQuestInteraction)||questInteraction.input.quests!==quests||questInteraction.input.campaign!==campaign)throw Error('Native combat needs its actual area quest interaction');
  const {scene,geometry,population,registry}=assembly.input;
  if(progression.input.scene!==scene||quests.input.scene!==scene||watching.input.scene!==scene||progression.input.authority!==authority||quests.input.authority!==authority||watching.input.authority!==authority||authority.campaign!==campaign||assembly.input.campaign!==campaign||progression.input.campaign!==campaign||quests.input.campaign!==campaign||watching.input.campaign!==campaign)throw Error('Native combat needs identical scene and campaign roots');
  if(!isNativeWorld(input.characterWriter))throw Error('Native combat needs the actual character writer');
  if(!isNativeAreaSceneTransitionCoordinator(input.coordinator)||input.coordinator.input.authority!==authority||input.coordinator.input.campaign!==campaign||input.coordinator.input.characterWriter!==input.characterWriter)throw Error('Native combat needs its actual campaign coordinator');
  this.#publishedArea=Object.getOwnPropertyDescriptor(NativeAreaSceneTransitionCoordinator.prototype,'published')!.get!;
  assertNativeMaddenLedger(maddenLedger,campaign,authority);
  assertNativeRetainedMassState(input.characterWriter);
  const phase=Object.getOwnPropertyDescriptor(NativeAreaSceneAssembly.prototype,'phase')!.get!,active=Object.getOwnPropertyDescriptor(NativeAreaScenePresence.prototype,'active')!.get!;
  this.#activationReady=()=>Reflect.apply(phase,input.assembly,[])==='born'&&Reflect.apply(active,input.assembly.scenePresence,[]);
  actualCombats.add(this);this.#operation=createNativeAreaCombatOperation(this);
  const self=this,host=this.#host={} as Host;
  this.runtimeState=new NativeAreaSceneCombatRuntimeState(host,campaign);
  const serviceHost=Object.create(assembly.objectiveServices) as NativeSceneServiceHost;
  Object.defineProperty(serviceHost,'seats',{get:()=>assembly.scenePresence.seats});
  Object.defineProperty(serviceHost,'partyScaleCount',{value:(at?:Parameters<World['partyScaleCount']>[0])=>scenePartyScaleCount(serviceHost,at)});
  this.#populationHost=Object.freeze(serviceHost);
  this.#frameCallbacks={collectDeedDot:frameCallbacks.createNativeFrameCollectDeedDot(host),doodadEffects:frameCallbacks.createNativeFrameDoodadEffects(host),incursionEvents:frameCallbacks.createNativeFrameIncursionEvents(host)};
  this.tethers=new NativeAreaSceneTethers({scene,campaign,authority,state:{tethers:[]}});
  this.restoration=new NativeAreaSceneRestoration({scene,geometry,objective:assembly.objectiveController,tethers:this.tethers,campaign,authority});
  this.castingPreparation=new NativeAreaSceneCastingPreparation({scene,campaign,authority,restoration:this.restoration,state:{comboCursors:new WeakMap(),relocationHosts:new WeakMap()}});
  this.displacement=new NativeAreaSceneDisplacement({scene,geometry,runtimeBirth:registry.input.birth,campaign,authority});
  this.combatState=new NativeAreaSceneCombatState({scene,population,progression,campaign,authority});
  this.defensePreparation=new NativeAreaSceneDefensePreparation({scene,geometry,campaign,authority});
  this.projectiles=new NativeAreaSceneProjectiles({scene,population,progression,campaign,authority});
  this.killAftermath=new NativeAreaSceneKillAftermath({scene,geometry,loot:assembly.lootController,campaign,authority,state:{remnants:[],deathBursts:[]}});
  this.groundFollowUps=new NativeAreaSceneGroundFollowUps({scene,progression,castingPreparation:this.castingPreparation,campaign,authority,ledger:maddenLedger});
  this.summonPreparation=new NativeAreaSceneSummonPreparation({scene,population,progression,campaign,authority});
  this.campaignOwner=new NativeAreaSceneCombatCampaign({...input,combat:this,entry:this.#operation.ownerEntry(),hooks:this.#operation.ownerHooks()});
  this.combatArena=new NativeAreaSceneCombatArena({combat:this,campaignOwner:this.campaignOwner,entry:this.#operation.ownerEntry(),hooks:this.#operation.ownerHooks()});
  this.control=new NativeAreaSceneCombatControl({combat:this,campaignOwner:this.campaignOwner,coordinator:input.coordinator,entry:this.#operation.ownerEntry(),hooks:this.#operation.ownerHooks()});
  this.campaignTransitions=new NativeAreaSceneCampaignTransitions({combat:this,coordinator:input.coordinator,entry:this.#operation.ownerEntry()});
  this.campaignFrame=new NativeAreaSceneCampaignFrame({combat:this,coordinator:input.coordinator,entry:this.#operation.ownerEntry(),fixedHost:host});
  this.inputFrame=new NativeAreaSceneInput(this,this.#operation.ownerEntry(),host);
  this.ai=new NativeAreaSceneAI(this,this.#operation.ownerEntry(),host);
  this.odyssey=new NativeAreaSceneOdyssey(this,this.#operation.ownerEntry(),host);
  this.historyArrival=new NativeAreaSceneHistoryArrival(this,this.#operation.ownerEntry(),host);
  this.siteBirths=new NativeAreaSceneSiteBirths(this,this.#operation.ownerEntry(),host);
  this.harborServices=new NativeAreaSceneHarborServices(this,this.#operation.ownerEntry(),host);
  this.surfaceArrival=new NativeAreaSceneSurfaceArrival(this,this.#operation.ownerEntry());
  this.warlordArrival=new NativeAreaSceneWarlordArrival(this,this.#operation.ownerEntry(),this.#operation.ownerHooks(),host);
  this.encounterArrival=new NativeAreaSceneEncounterArrival(this,this.#operation.ownerEntry(),host as unknown as NativeSceneFrameHost);
  const partyHost=Object.create(host) as NativeAreaPartyBaseHost;
  Object.defineProperties(partyHost,{
   charDeaths:{get:()=>input.characterWriter.charDeaths},
   indexSeats:{value:()=>sceneIndexSeats({get seatByActor(){return input.characterWriter['seatByActor'];},get seats(){return input.characterWriter.seats;}})},
   restoreAccountRelics:{value:(seat:Seat)=>sceneRestoreAccountRelics(host,seat)},
   grantStartingCompanions:{value:(...args:Parameters<World['grantStartingCompanions']>)=>characterCreation.sceneGrantStartingCompanions(host,...args)},
   dealVeteranFlasks:{value:(...args:Parameters<World['dealVeteranFlasks']>)=>characterCreation.sceneDealVeteranFlasks(host,...args)},
  });
  this.party=new NativeAreaParty(this,this.#operation.ownerEntry(),Object.freeze(partyHost));
  this.services=Object.freeze({warlordArrival:this.warlordArrival,encounterArrival:this.encounterArrival,surfaceArrival:this.surfaceArrival,harborServices:this.harborServices,siteBirths:this.siteBirths,historyArrival:this.historyArrival,odyssey:this.odyssey,ai:this.ai,inputFrame:this.inputFrame,campaignFrame:this.campaignFrame,control:this.control,campaignTransitions:this.campaignTransitions,combatArena:this.combatArena,combat:this,progression,loot:assembly.lootController,objective:assembly.objectiveController,geometry,maddenLedger,campaignOwner:this.campaignOwner,tethers:this.tethers,restoration:this.restoration,castingPreparation:this.castingPreparation,displacement:this.displacement,combatState:this.combatState,defensePreparation:this.defensePreparation,projectiles:this.projectiles,killAftermath:this.killAftermath,groundFollowUps:this.groundFollowUps,summonPreparation:this.summonPreparation});
  const bindings=this.bindings();
  for(const key of Object.keys(bindings) as (keyof Bindings)[])Object.defineProperty(host,key,{enumerable:true,...bindings[key]});
  const viewDescriptors=Object.getOwnPropertyDescriptors(host);
  viewDescriptors.seats={enumerable:true,get:()=>Reflect.apply(exactPhysicalSeats,authority,[scene])};
  const presentationHost=Object.freeze(Object.defineProperties({},viewDescriptors)) as NativeSceneViewHost&NativeSceneMenuHost&NativeSceneUIActionHost;
  this.#viewHost=presentationHost;this.#menuHost=presentationHost;
  this.#wireHost=Object.freeze({get account(){return method(()=>host,"account").get();},
get activeQuests(){return method(()=>host,"activeQuests").get();},
get actorById(){return method(()=>host,"actorById").get();},
get actors(){return method(()=>host,"actors").get();},
get annexOpen(){return assembly.input.openings.input.state.annexOpen;},
get arena(){return method(()=>host,"arena").get();},
get auroras(){return method(()=>host,"auroras").get();},
get bossBarInfo(){return method(()=>host,"bossBarInfo").get();},
get bountyBoardView(){return method(()=>host,"bountyBoardView").get();},
get bountyBoardsHere(){return method(()=>host,"bountyBoardsHere").get();},
get bountyHands(){return method(()=>host,"bountyHands").get();},
get clientActionHook(){return method(()=>host,"clientActionHook").get();},
get completedQuests(){return method(()=>host,"completedQuests").get();},
get creepers(){return method(()=>host,"creepers").get();},
get deathBurstsView(){return method(()=>host,"deathBurstsView").get();},
get devOverlayView(){return method(()=>host,"devOverlayView").get();},
get doodads(){return method(()=>host,"doodads").get();},
get drops(){return method(()=>host,"drops").get();},
get dwellReachable(){return method(()=>host,"dwellReachable").get();},
get emergences(){return method(()=>host,"emergences").get();},
get exits(){return method(()=>host,"exits").get();},
get eyecatch(){return method(()=>host,"eyecatch").get();},
get flashes(){return method(()=>host,"flashes").get();},
get fonts(){return method(()=>host,"fonts").get();},
get frostHeld(){return method(()=>host,"frostHeld").get();},
get gameOver(){return method(()=>host,"gameOver").get();},
get gloom(){return method(()=>host,"gloom").get();},
get grantedPocketsFor(){return method(()=>host,"grantedPocketsFor").get();},
get guardArts(){return method(()=>host,"guardArts").get();},
get guardians(){return method(()=>host,"guardians").get();},
get handOwns(){return method(()=>host,"handOwns").get();},
get handState(){return method(()=>host,"handState").get();},
get harvestHolds(){return method(()=>host,"harvestHolds").get();},
get hostileTo(){return method(()=>host,"hostileTo").get();},
get journalDirty(){return method(()=>host,"journalDirty").get();},
get lastInputSeq(){return method(()=>host,"lastInputSeq").get();},
get ledger(){return method(()=>host,"ledger").get();},
get lightwellDoodads(){return method(()=>host,"lightwellDoodads").get();},
get lineOfSight(){return method(()=>host,"lineOfSight").get();},
get lite(){return method(()=>host,"lite").get();},
get liteKinds(){return method(()=>host,"liteKinds").get();},
get livePings(){return method(()=>host,"livePings").get();},
get localSeat(){return method(()=>host,"localSeat").get();},
get magicPackEffects(){return assembly.input.population.input.state.magicPackEffects;},
get manifest(){return method(()=>host,"manifest").get();},
get massRuntime(){return method(()=>host,"massRuntime").get();},
get metaDirty(){return method(()=>host,"metaDirty").get();},
get minionsOfSkill(){return method(()=>host,"minionsOfSkill").get();},
get mintAuthoredZone(){return method(()=>host,"mintAuthoredZone").get();},
get movementLocked(){return method(()=>host,"movementLocked").get();},
get musterRings(){return wireAbsent(input.characterWriter,'musterRings');},
get netJournal(){return method(()=>host,"netJournal").get();},
get notices(){return method(()=>host,"notices").get();},
get objectiveDoneAt(){return method(()=>host,"objectiveDoneAt").get();},
get openedHollows(){return geometry.openedHollows;},
get orbs(){return method(()=>host,"orbs").get();},
get partyDowns(){return method(()=>host,"partyDowns").get();},
get partyRows(){return method(()=>host,"partyRows").get();},
get pendingAmbushes(){return method(()=>host,"pendingAmbushes").get();},
get pickupFeed(){return method(()=>host,"pickupFeed").get();},
get player(){return method(()=>host,"player").get();},
get projectiles(){return method(()=>host,"projectiles").get();},
get questDefOf(){return method(()=>host,"questDefOf").get();},
get questHandLevel(){return method(()=>host,"questHandLevel").get();},
get questHome(){return method(()=>host,"questHome").get();},
get questImbueOffers(){return method(()=>host,"questImbueOffers").get();},
get questLog(){return method(()=>host,"questLog").get();},
get questOfferChoices(){return method(()=>host,"questOfferChoices").get();},
get questRewardOffers(){return method(()=>host,"questRewardOffers").get();},
get questStanding(){return method(()=>host,"questStanding").get();},
get rampageActive(){return method(()=>host,"rampageActive").get();},
get roadIsWet(){return method(()=>host,"roadIsWet").get();},
get sameParty(){return method(()=>host,"sameParty").get();},
get satellites(){return method(()=>host,"satellites").get();},
get seatCorpseMarks(){return wireAbsent(input.characterWriter,'seatCorpseMarks');},
get seatHarvestView(){return method(()=>host,"seatHarvestView").get();},
get seatHero(){return method(()=>host,"seatHero").get();},
get seatHudWire(){return method(()=>host,"seatHudWire").get();},
get seatOf(){return method(()=>host,"seatOf").get();},
get seatOfRoot(){return method(()=>host,"seatOfRoot").get();},
get sim(){return method(()=>host,"sim").get();},
get smithCounterHere(){return method(()=>host,"smithCounterHere").get();},
get stationAnchor(){return method(()=>host,"stationAnchor").get();},
get storyPair(){return method(()=>host,"storyPair").get();},
get structures(){return method(()=>host,"structures").get();},
get tethers(){return method(()=>host,"tethers").get();},
get texts(){return method(()=>host,"texts").get();},
get throngRosterCount(){return method(()=>host,"throngRosterCount").get();},
get time(){return method(()=>host,"time").get();},
get timeflow(){return method(()=>host,"timeflow").get();},
get titans(){return method(()=>host,"titans").get();},
get townPortalViews(){return method(()=>host,"townPortalViews").get();},
get tracks(){return method(()=>host,"tracks").get();},
get trapworks(){return method(()=>host,"trapworks").get();},
get vendorEntryHold(){return method(()=>host,"vendorEntryHold").get();},
get vendorGemsOpen(){return method(()=>host,"vendorGemsOpen").get();},
get vendorLockCap(){return method(()=>host,"vendorLockCap").get();},
get vendorRestockAt(){return method(()=>host,"vendorRestockAt").get();},
get vendorStock(){return method(()=>host,"vendorStock").get();},
get vendorTradeRefusal(){return method(()=>host,"vendorTradeRefusal").get();},
get visited(){return method(()=>host,"visited").get();},
get walk(){return method(()=>host,"walk").get();},
get waypointPos(){return method(()=>host,"waypointPos").get();},
get withApproachPass(){return method(()=>host,"withApproachPass").get();},
get withBuyer(){return method(()=>host,"withBuyer").get();},
get withQuestHand(){return method(()=>host,"withQuestHand").get();},
get zone(){return method(()=>host,"zone").get();},
get zoneAnnexSpecs(){return geometry.zoneAnnexSpecs;},
get zoneHollows(){return geometry.zoneHollows;},
get zoneMap(){return method(()=>host,"zoneMap").get();},
get zones(){return method(()=>host,"zones").get();},
get seats(){if(!self.#wireSeats)throw Error('Native wire cohort is outside serialization');return self.#wireSeats;},
get shardWorld(){return host.shardWorld;},
nativeWireQueries:Object.freeze({encounterCue:(actor:Actor)=>encounterCueOf(actor,host),roadDwell:(seat:Seat)=>input.coordinator.roadsFor(self).roadDwellRow(seat)})});
  Object.freeze(host);for(const key of ['warlordArrival','encounterArrival','surfaceArrival','harborServices','siteBirths','historyArrival','odyssey','party','ai','input','runtimeState','services','campaignOwner','combatArena','control','campaignTransitions','campaignFrame','inputFrame',"tethers","restoration","castingPreparation","displacement","combatState","defensePreparation","projectiles","killAftermath","groundFollowUps","summonPreparation"])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 register(binding:NativeAreaAuthorityBinding<NativeAreaCombatServices>):void{if(binding.scene!==this.scene)throw Error('Native combat registration has foreign scene');for(const key of Object.keys(this.services) as (keyof NativeAreaCombatServices)[])if(binding.services[key]!==this.services[key])throw Error('Native combat registration has mismatched actual owner');this.#operation.bind(binding,[this.warlordArrival,this.encounterArrival,this.surfaceArrival,this.harborServices,this.siteBirths,this.historyArrival,this.odyssey,this.party,this.ai,this,this.inputFrame,this.input.progression,this.input.assembly.lootController,this.input.assembly.objectiveController,this.campaignOwner,this.combatArena,this.control,this.campaignTransitions,this.campaignFrame,this.tethers,this.restoration,this.castingPreparation,this.displacement,this.combatState,this.defensePreparation,this.projectiles,this.killAftermath,this.groundFollowUps,this.summonPreparation,this.input.assembly.input.ecology]);}
 prepareActivation(cohort:readonly Actor[]):NativeCombatActivation {return this.#operation.prepareActivation(cohort);}
 assertActivation(token:NativeCombatActivation,cohort:readonly Actor[]):void {this.#operation.assertActivation(token,cohort);}
 activate(cohort:readonly Actor[],token:NativeCombatActivation):void {if(!this.#activationReady())throw Error('Native combat activation needs actual born admitted area');const admitted=this.#operation.activate(this.#host,cohort,token);if(admitted.includes(this.input.campaign.localSeat.actor))this.campaignOwner.bindCombatDeeds();}
 /** Actual scheduler endpoints supply operation context to their retained leaves.
  * Initial activation replaces native boot callbacks only for the admitted local hero;
  * adoption of an already wounded World tracker is not implemented here. */
 /** Exact native canopy query, under the actual area's physical admission. */
 isConcealedFrom(viewer:Actor,target:Actor):boolean {return this.#operation.enter({physical:[viewer,target],permission:'physical'},()=>this.#host.veilIndex().concealedFrom(viewer.pos,target.pos));}
 rescaleEnemies():void {this.#operation.enter({permission:'physical'},()=>frameTravel.sceneRescaleEnemies(this.#host));}

 #restoreHost(token:NativeCharacterResumeReceipt,stage:'fields'|'graph'):characterRestore.NativeCharacterRestorationHost & NativeCharacterRestoreHost {
  const r=assertNativeCharacterResume(token,stage);if(r.area?.combat!==this||r.writer!==this.input.characterWriter)throw Error('Native restore host belongs to another area');
  const host=Object.create(this.#host) as characterRestore.NativeCharacterRestorationHost & NativeCharacterRestoreHost,writer=r.writer,check=()=>{assertNativeCharacterResume(token,stage);this.#operation.assertActiveScope();};
  const method=(key:keyof typeof host,provider:()=>object,name:string)=>Object.defineProperty(host,key,{enumerable:true,get:()=>{check();const receiver=provider(),fn=Reflect.get(receiver,name);return typeof fn==='function'?(...args:unknown[])=>{check();return Reflect.apply(fn,receiver,args);}:fn;}});
  const bind=<K extends keyof typeof host>(key:K,value:typeof host[K])=>Object.defineProperty(host,key,{enumerable:true,value});
  const field=<K extends keyof typeof host>(key:K)=>Object.defineProperty(host,key,{enumerable:true,get:()=>{check();return Reflect.get(writer,key);},set:(value:(typeof host)[K])=>{check();if(!Reflect.set(writer,key,value))throw new TypeError('Native restore writer field refused: '+String(key));}});
  for(const key of ['charDeaths','charVendorHolds','mercSheets','townStationKey','townPortalDestination','ledger','annexFound','throngClaimed'] as const)field(key);
  Object.defineProperty(host,'adoptedZonePending',{enumerable:true,get:()=>this.input.coordinator.departureFor(this).adoptedZonePending,set:value=>{this.input.coordinator.departureFor(this).adoptedZonePending=value;}});
  Object.defineProperty(host,'completedQuests',{enumerable:true,get:()=>this.input.quests.questLedger().completed,set:value=>{this.input.quests.questLedger().completed=value;}});
  Object.defineProperty(host,'questImbues',{enumerable:true,get:()=>this.input.quests.questLedger().imbues,set:value=>{this.input.quests.questLedger().imbues=value;}});
  method('questDefOf',()=>this.input.quests,'questDefOf');
  method('spawnPlayerCorpses',()=>this.input.assembly.input.history,'spawnPlayerCorpses');
  bind('restoreAccountRelics',seat=>sceneRestoreAccountRelics(this.#host,seat));
  bind('indexSeats',()=>sceneIndexSeats({get seatByActor(){return writer['seatByActor'];},get seats(){return writer.seats;}}));
  method('applyMercNormalization',()=>this.input.progression,'applyMercNormalization');
  method('removeSeat',()=>this.campaignTransitions,'removeSeat');
  bind('grantStartingCompanions',(...args)=>characterCreation.sceneGrantStartingCompanions(this.#host,...args));
  bind('dealVeteranFlasks',(...args)=>characterCreation.sceneDealVeteranFlasks(this.#host,...args));
  bind('makePlayerSeat',(...args)=>Reflect.apply(this.#resumeFactory.make,r.owner,[token,...args]));
  bind('admitRestoredSeat',seat=>Reflect.apply(this.#resumeFactory.admit,r.owner,[token,seat]));
  bind('addSeat',(...args)=>characterRestore.sceneAddSeat(host,...args));
  method('linkBackTo',()=>this.input.assembly.input.coast,'linkBackTo');
  method('nearestRiverPort',()=>this.input.assembly.graph,'nearestRiverPort');
  method('soulriverPorts',()=>this.input.assembly.graph,'soulriverPorts');
  method('severFootprintCrossers',()=>this.input.assembly.graph,'severFootprintCrossers');
  bind('adoptSavedMeta',(...args:Parameters<World['adoptSavedMeta']>)=>characterRestore.sceneAdoptSavedMeta(host,...args));
  bind('adoptSeatMeta',(...args:Parameters<World['adoptSeatMeta']>)=>characterRestore.sceneAdoptSeatMeta(host,...args));
  bind('reconcileContainers',(...args:Parameters<World['reconcileContainers']>)=>characterRestore.sceneReconcileContainers(host,...args));
  bind('spawnMercSeat',(...args:Parameters<World['spawnMercSeat']>)=>characterRestore.sceneSpawnMercSeat(host,...args));
  bind('restoreHiredMerc',(...args:Parameters<World['restoreHiredMerc']>)=>characterRestore.sceneRestoreHiredMerc(host,...args));
  bind('restoreThrong',(...args:Parameters<World['restoreThrong']>)=>characterRestore.sceneRestoreThrong(host,...args));
  bind('scrubStaleObjectives',(...args:Parameters<World['scrubStaleObjectives']>)=>characterRestore.sceneScrubStaleObjectives(host,...args));
  bind('rebuildVendorHolds',(...args:Parameters<World['rebuildVendorHolds']>)=>characterRestore.sceneRebuildVendorHolds(host,...args));
  bind('vendorLootToEntry',(...args:Parameters<World['vendorLootToEntry']>)=>characterRestore.sceneVendorLootToEntry(host,...args));
  return Object.freeze(host);
 }
 restoreCharacterFields(token:NativeCharacterResumeReceipt,save:CharacterFields):boolean {const r=assertNativeCharacterResume(token,'fields');if(r.area?.combat!==this)throw Error('Native saved fields need their actual provisional area');if(this.scene.actors.some(a=>a.companion&&a.owner===r.writer.player))throw Error('Native resume shell unexpectedly received fresh companions');return this.#operation.enter({permission:'physical',physical:[r.writer.player]},()=>{if(this.#restoreToken)throw Error('Native saved fields cannot reenter');this.#restoreToken=token;try{return applyCharacterFields(this.#restoreHost(token,'fields'),save);}finally{this.#restoreToken=undefined;}});}
 restoreCharacterGraph(token:NativeCharacterResumeReceipt,world:Parameters<World['adoptWorldState']>[0]):boolean {const r=assertNativeCharacterResume(token,'graph');if(r.area?.combat!==this)throw Error('Native saved graph needs its actual provisional area');return this.#operation.enter({permission:'physical',physical:[r.writer.player]},()=>{const host=this.#restoreHost(token,'graph');return characterRestore.sceneAdoptWorldState(host,world);});}
 reconcileRestoredGraph(token:NativeCharacterResumeReceipt):void {const r=assertNativeCharacterResume(token,'graph');if(r.area?.combat!==this)throw Error('Native restored graph reconciliation is foreign');this.#operation.enter({permission:'physical',physical:[r.writer.player]},()=>{const host=this.#restoreHost(token,'graph');characterRestore.sceneReconcileSoulrivers(host);characterRestore.sceneReconcileSeaPorts(host);characterRestore.sceneReconcileWebLaws(host);});}
 rescaleInitialCharacter(token:NativeCharacterCreationReceipt):void {const r=assertNativeCharacterReceipt(token,'stats');if(r.area?.combat!==this||this.scene.actors.length!==1||this.scene.actors[0]!==r.seat.actor)throw Error('Native initial party event must contain only its created hero');frameTravel.sceneRescaleEnemies(this.#host);}
 #initialGift<T>(token:NativeCharacterCreationReceipt,run:()=>T):T {const r=assertNativeCharacterReceipt(token,'gifts');if(r.area?.combat!==this||r.writer!==this.input.characterWriter||r.seat!==this.input.campaign.localSeat)throw Error('Native initial gift has a foreign area');return this.#operation.enter({physical:[r.seat.actor],permission:'physical'},run);}
 grantInitialCharacterCompanions(token:NativeCharacterCreationReceipt):void {this.#initialGift(token,()=>characterCreation.sceneGrantStartingCompanions(this.#host));}
 dealInitialCharacterFlasks(token:NativeCharacterCreationReceipt):void {this.#initialGift(token,()=>characterCreation.sceneDealVeteranFlasks(this.#host));}
 dealInitialCharacterLabArts(token:NativeCharacterCreationReceipt,force:boolean):number {return this.#initialGift(token,()=>characterCreation.sceneDealLabArts(this.#host,force));}
 applyInitialCharacterGraft(token:NativeCharacterCreationReceipt,id:string):boolean {return this.#initialGift(token,()=>characterCreation.sceneApplySkillGraft(this.#host,id));}
 updateAI(dt:number):void {this.ai.update(dt);}
 updateAIActor(actor:Actor,dt:number):void {this.ai.updateActor(actor,dt);}
 updateObjective(dt:number):void {this.#operation.enter({physical:[],permission:'physical'},()=>this.input.watching.updateObjective(dt));}
 /** Single-writer presentation follows its physically present published audience. */
 isPresentationArea():boolean {const seat=presentationData(this.input.characterWriter,'localSeat') as Seat,actor=presentationData(seat,'actor') as Actor;return Reflect.apply(this.#publishedArea,this.input.coordinator,[]).combat===this&&Reflect.apply(exactActorAttendance,this.input.authority,[this.scene,actor]);}
 isLocalPresentationActor(actor:Actor):boolean {const seat=presentationData(this.input.characterWriter,'localSeat') as Seat;return actor===presentationData(seat,'actor')&&this.isPresentationArea();}
 isPresentLocalPlayer():boolean {return Reflect.apply(exactPlayerAttendance,this.input.authority,[this.scene]);}
 isPresentActor(actor:Actor):boolean {return Reflect.apply(exactActorAttendance,this.input.authority,[this.scene,actor]);}
 frameSeats():World['seats'] {return Reflect.apply(exactPhysicalSeats,this.input.authority,[this.scene]);}
 updateQuestGiver(dt:number):void {this.#operation.enter({permission:'physical'},()=>this.input.questInteraction.updateQuestGiver(dt));}
 /** The coordinator passes the exact post-ejection physical cohort to both
  * ends. Only actor-specific controller rows move; native queues stay local. */
 transitionDeparture(cohort:readonly Actor[]):void {this.#operation.enter({physical:cohort,permission:'physical'},()=>{
  let packets=controllerTransfers.get(this.input.authority);if(!packets)controllerTransfers.set(this.input.authority,packets=new WeakMap());
  if(cohort.includes(this.input.campaign.localSeat.actor))this.odyssey.leaveZone();
  const p=this.input.progression,r=this.runtimeState;
  for(const actor of cohort){const prior=packets.get(actor);if(prior&&prior.source!==this)throw Error('Native controller transfer already belongs to another departure');
   const bond=p.companionBonds.exportBond(actor),grants=p.companionGrants.lift(actor),clocks=r.replenishment.lift(actor);
   const packet:ActorControllerPacket=prior??{source:this,bond:undefined,grants:undefined,clocks:undefined,buffs:[],strike:undefined};if(bond!==undefined)packet.bond=bond;if(grants!==undefined)packet.grants=grants;if(clocks!==undefined)packet.clocks=clocks;
   packets.set(actor,packet);
   r.assaults.clearOwner(actor);p.challenges.clearOwner(actor);p.attackSequences.clearOwner(actor);p.guardArts.clearOwner(actor);
   r.satellites.retire(actor);r.auroras.retire(actor);r.guardians.retire(actor);r.creepers.retire(actor);
   for(const buff of actor.buffs.values()){const source=p.input.state.treeBuffSources.get(buff.def);if(source!==undefined){packet.buffs.push([buff.def,source]);p.input.state.treeBuffSources.delete(buff.def);}}
   if(r.strikeReleaseBodies.has(actor)){packet.strike=r.strikeReleaseBodies.get(actor);r.strikeReleaseBodies.delete(actor);}
   // Native travel clears queued meta commands. Retention cancels only the
   // departing body's commands while other local actors keep their own queues.
   this.#operation.discardPendingMetaCommands(actor);
   this.castingPreparation.input.state.comboCursors.delete(actor);r.dotAccum.delete(actor.id);
   
  }
 });}
 /** Arrival-owned station growth; no arbitrary callback or factory capability is exposed. */
 refreshTownStations(representative:Actor):boolean {Reflect.apply(NativeAreaSceneTransitionCoordinator.prototype.assertTownArrival,this.input.coordinator,[this]);const thisHost=this.#host;return this.#operation.enter({permission:'physical',physical:[],sources:[]},()=>refreshNativeTownStations(this.input.assembly,this.input.characterWriter,this.input.authority,{
  get createMonster(){return thisHost.createMonster;},admit:body=>this.#operation.admitCombatBirth(body),retire:body=>this.#operation.retireCombatBody(body),layoutChanged:value=>{this.runtimeState.frame.townLayoutChangedOnLoad=value;}
 },representative));}
 /** Separate native revisit operations; each requires its exact selected character. */
 arrivePlayerCorpses():void {const select=NativeAreaSceneTransitionCoordinator.prototype.delayedArrivalBody,body=Reflect.apply(select,this.input.coordinator,[this,'corpse']);this.#operation.enter({permission:'physical',physical:[body]},()=>{const owner=this.input.assembly.input.history,fn=owner.spawnPlayerCorpses,def=this.scene.zone;if(Reflect.apply(select,this.input.coordinator,[this,'corpse'])!==body)throw Error('Native corpse arrival changed');Reflect.apply(fn,owner,[def]);});}
 arriveDelver():void {const select=NativeAreaSceneTransitionCoordinator.prototype.delayedArrivalBody,body=Reflect.apply(select,this.input.coordinator,[this,'delver']);this.#operation.enter({permission:'physical',physical:[body]},()=>{const owner=this.input.assembly.input.descent,fn=owner.arriveDelayedDelver,def=this.scene.zone,spent=NativeAreaCampaignFrameState.forWriter(this.input.characterWriter).descentSpent,consumed=Reflect.apply(Set.prototype.has,spent,[def.id]);if(Reflect.apply(select,this.input.coordinator,[this,'delver'])!==body)throw Error('Native Delver arrival changed');if(!consumed)Reflect.apply(fn,owner,[def]);});}
 /** Bounty arrival is issued only by the actual destination handoff. */
 arriveBounties():void {const from=Reflect.apply(NativeAreaSceneTransitionCoordinator.prototype.bountyArrivalFrom,this.input.coordinator,[this]);this.#operation.enter({permission:'physical'},()=>this.input.assembly.arriveBounties(from));}
 resumeVoyageArrival():void {Reflect.apply(NativeAreaSceneTransitionCoordinator.prototype.assertVoyageArrival,this.input.coordinator,[this]);this.#operation.enter({permission:'physical',physical:[],sources:[]},()=>sceneResumeVoyageArrival(this.#host,this.scene.zone.id));}
 refreshSidezoneFurnish():void {Reflect.apply(NativeAreaSceneTransitionCoordinator.prototype.assertFurnishArrival,this.input.coordinator,[this]);this.#operation.enter({permission:'physical'},()=>this.input.assembly.refreshSidezoneFurnish());}
 transitionArrival(cohort:readonly Actor[]):void {this.#operation.enter({physical:cohort,permission:'physical'},()=>{
  const packets=controllerTransfers.get(this.input.authority),p=this.input.progression,r=this.runtimeState;
  for(const actor of cohort){const packet=packets?.get(actor);if(!packet||packet.source===this)throw Error('Native controller arrival needs an exact foreign departure receipt');
   p.companionBonds.importBond(actor,packet.bond);p.companionGrants.seat(actor,packet.grants);r.replenishment.seat(actor,packet.clocks);
   for(const [def,source]of packet.buffs)p.input.state.treeBuffSources.set(def,source);
   if(packet.strike!==undefined)r.strikeReleaseBodies.set(actor,packet.strike);packets!.delete(actor);
  }
  const seats=this.input.authority.seatsFor(this.input.authority.bindingFor(this.scene));
  for(const seat of seats)if(cohort.includes(seat.actor))p.recalcSeat(seat);
  p.companionBonds.refresh();for(const actor of cohort)p.guardArts.sync(actor);
  if(cohort.includes(this.input.campaign.localSeat.actor))this.campaignOwner.bindCombatDeeds();
 });}
 castReqRefusal(...args:Parameters<World['castReqRefusal']>):ReturnType<World['castReqRefusal']>{const owner=this.control,fn=owner.castReqRefusal;return Reflect.apply(fn,owner,args);}
 grabHandoff(...args:Parameters<World['grabHandoff']>):ReturnType<World['grabHandoff']>{const owner=this.control,fn=owner.grabHandoff;return Reflect.apply(fn,owner,args);}
 grabSeize(...args:Parameters<World['grabSeize']>):ReturnType<World['grabSeize']>{const owner=this.control,fn=owner.grabSeize;return Reflect.apply(fn,owner,args);}
 possessSeize(...args:Parameters<World['possessSeize']>):ReturnType<World['possessSeize']>{const owner=this.control,fn=owner.possessSeize;return Reflect.apply(fn,owner,args);}
 shapeshiftPress(...args:Parameters<World['shapeshiftPress']>):ReturnType<World['shapeshiftPress']>{const owner=this.control,fn=owner.shapeshiftPress;return Reflect.apply(fn,owner,args);}
 openTownPortal(...args:Parameters<World['openTownPortal']>):ReturnType<World['openTownPortal']>{const owner=this.control,fn=owner.openTownPortal;return Reflect.apply(fn,owner,args);}
 seatEject(...args:Parameters<World['seatEject']>):ReturnType<World['seatEject']>{const owner=this.control,fn=owner.seatEject;return Reflect.apply(fn,owner,args);}
 onPlayerDown(...args:Parameters<World['onPlayerDown']>):ReturnType<World['onPlayerDown']>{const owner=this.campaignTransitions,fn=owner.onPlayerDown;return Reflect.apply(fn,owner,args);}
 routePitFall(...args:Parameters<World['routePitFall']>):ReturnType<World['routePitFall']>{const owner=this.campaignTransitions,fn=owner.routePitFall;return Reflect.apply(fn,owner,args);}
 routeSkyFalls(...args:Parameters<World['routeSkyFalls']>):ReturnType<World['routeSkyFalls']>{const owner=this.campaignTransitions,fn=owner.routeSkyFalls;return Reflect.apply(fn,owner,args);}
 drainSurvival(...args:Parameters<World['drainSurvival']>):ReturnType<World['drainSurvival']>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[]},()=>motion.sceneDrainSurvival(this.#host,...args));}
 imminentThreatTo(...args:Parameters<World['imminentThreatTo']>):ReturnType<World['imminentThreatTo']>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[]},()=>motion.sceneImminentThreatTo(this.#host,...args));}
 plantDressAt(...args:Parameters<World['plantDressAt']>):ReturnType<World['plantDressAt']>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>motion.scenePlantDressAt(this.#host,...args));}
 moveActor(...args:Parameters<World['moveActor']>):ReturnType<World['moveActor']>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[]},()=>motion.sceneMoveActor(this.#host,...args));}
 slipAway(...args:Parameters<World['slipAway']>):ReturnType<World['slipAway']>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[]},()=>motion.sceneSlipAway(this.#host,...args));}
 survivalDrainRate(...args:Parameters<World['survivalDrainRate']>):ReturnType<World['survivalDrainRate']>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>motion.sceneSurvivalDrainRate(this.#host,...args));}
 despawnPartsOf(...args:Parameters<World['despawnPartsOf']>):ReturnType<World['despawnPartsOf']>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[]},()=>motion.sceneDespawnPartsOf(this.#host,...args));}
 markSeatMoved(...args:Parameters<World['markSeatMoved']>):ReturnType<World['markSeatMoved']>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[]},()=>motion.sceneMarkSeatMoved(this.#host,...args));}
 steppedClamp(...args:Parameters<World['steppedClamp']>):ReturnType<World['steppedClamp']>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[]},()=>motion.sceneSteppedClamp(this.#host,...args));}
 resolveBoundary(...args:Parameters<World['resolveBoundary']>):ReturnType<World['resolveBoundary']>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[]},()=>motion.sceneResolveBoundary(this.#host,...args));}
 windAt(...args:Parameters<World['windAt']>):ReturnType<World['windAt']>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>motion.sceneWindAt(this.#host,...args));}
 zoneWind(...args:Parameters<World['zoneWind']>):ReturnType<World['zoneWind']>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>motion.sceneZoneWind(this.#host,...args));}
 snowCoverAt(...args:Parameters<World['snowCoverAt']>):ReturnType<World['snowCoverAt']>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>motion.sceneSnowCoverAt(this.#host,...args));}
 voyageShip(...args:Parameters<World['voyageShip']>):ReturnType<World['voyageShip']>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>motion.sceneVoyageShip(this.#host,...args));}
 get sailing():World['sailing']{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>motion.sceneSailing(this.#host));}
 noteActorInsertion(_body:Actor):void{this.runtimeState.actorGridRev++;}
 castSealed(...args:Parameters<World["castSealed"]>):ReturnType<World["castSealed"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneCastSealed(this.#host,...args));}
 resolveTargeting(...args:Parameters<World["resolveTargeting"]>):ReturnType<World["resolveTargeting"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneResolveTargeting(this.#host,...args));}
 useSkill(...args:Parameters<World["useSkill"]>):ReturnType<World["useSkill"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneUseSkill(this.#host,...args));}
 plantSpiritTotem(...args:Parameters<World["plantSpiritTotem"]>):ReturnType<World["plantSpiritTotem"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.scenePlantSpiritTotem(this.#host,...args));}
 castPress(...args:Parameters<World["castPress"]>):ReturnType<World["castPress"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneCastPress(this.#host,...args));}
 executeSkill(...args:Parameters<World["executeSkill"]>):ReturnType<World["executeSkill"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>this.#operation.withCastSource(args[0],()=>core0.sceneExecuteSkill(this.#host,...args)));}
 recordCast(...args:Parameters<World["recordCast"]>):ReturnType<World["recordCast"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneRecordCast(this.#host,...args));}
 clampGroundTarget(...args:Parameters<World["clampGroundTarget"]>):ReturnType<World["clampGroundTarget"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneClampGroundTarget(this.#host,...args));}
 echoToClones(...args:Parameters<World["echoToClones"]>):ReturnType<World["echoToClones"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneEchoToClones(this.#host,...args));}
 activateAura(...args:Parameters<World["activateAura"]>):ReturnType<World["activateAura"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneActivateAura(this.#host,...args));}
 aiHoldOf(...args:Parameters<World["aiHoldOf"]>):ReturnType<World["aiHoldOf"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core0.sceneAiHoldOf(this.#host,...args));}
 releasePrimedPours(...args:Parameters<World["releasePrimedPours"]>):ReturnType<World["releasePrimedPours"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneReleasePrimedPours(this.#host,...args));}
 conjureGrantsFor(...args:Parameters<World["conjureGrantsFor"]>):ReturnType<World["conjureGrantsFor"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneConjureGrantsFor(this.#host,...args));}
 affordedDest(...args:Parameters<World["affordedDest"]>):ReturnType<World["affordedDest"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneAffordedDest(this.#host,...args));}
 aiNeedsFireLine(...args:Parameters<World["aiNeedsFireLine"]>):ReturnType<World["aiNeedsFireLine"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneAiNeedsFireLine(this.#host,...args));}
 actorTurnRate(...args:Parameters<World["actorTurnRate"]>):ReturnType<World["actorTurnRate"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneActorTurnRate(this.#host,...args));}
 castTurnRate(...args:Parameters<World["castTurnRate"]>):ReturnType<World["castTurnRate"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneCastTurnRate(this.#host,...args));}
 updateCasting(...args:Parameters<World["updateCasting"]>):ReturnType<World["updateCasting"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneUpdateCasting(this.#host,...args));}
 tickChannelSupports(...args:Parameters<World["tickChannelSupports"]>):ReturnType<World["tickChannelSupports"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneTickChannelSupports(this.#host,...args));}
 triggerEligible(...args:Parameters<World["triggerEligible"]>):ReturnType<World["triggerEligible"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core0.sceneTriggerEligible(this.#host,...args));}
 endCarom(...args:Parameters<World["endCarom"]>):ReturnType<World["endCarom"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneEndCarom(this.#host,...args));}
 weightedPick(...args:Parameters<World["weightedPick"]>):ReturnType<World["weightedPick"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core1.sceneWeightedPick(this.#host,...args));}
 throngEvolutionHit(...args:Parameters<World["throngEvolutionHit"]>):ReturnType<World["throngEvolutionHit"]>{return this.#operation.enter({permission:'proc',physical:[args[1]],sources:[args[0]]},()=>core1.sceneThrongEvolutionHit(this.#host,...args));}
 throngEvolutionBurst(...args:Parameters<World["throngEvolutionBurst"]>):ReturnType<World["throngEvolutionBurst"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0],...(args[4]?[args[4]]:[])]},()=>core1.sceneThrongEvolutionBurst(this.#host,...args));}
 assaultDoomCull(...args:Parameters<World["assaultDoomCull"]>):ReturnType<World["assaultDoomCull"]>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[]},()=>core1.sceneAssaultDoomCull(this.#host,...args));}
 throngOnHit(...args:Parameters<World["throngOnHit"]>):ReturnType<World["throngOnHit"]>{return this.#operation.enter({permission:'proc',physical:[args[1]],sources:[args[0]]},()=>core1.sceneThrongOnHit(this.#host,...args));}
 throngOnKill(...args:Parameters<World["throngOnKill"]>):ReturnType<World["throngOnKill"]>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[...(args[1]?[args[1]]:[])]},()=>core1.sceneThrongOnKill(this.#host,...args));}
 liteCarve(...args:Parameters<World["liteCarve"]>):ReturnType<World["liteCarve"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[...(args[0]?[args[0]]:[])]},()=>core1.sceneLiteCarve(this.#host,...args));}
 litePromoteNearest(...args:Parameters<World["litePromoteNearest"]>):ReturnType<World["litePromoteNearest"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core1.sceneLitePromoteNearest(this.#host,...args));}
 litePourAt(...args:Parameters<World["litePourAt"]>):ReturnType<World["litePourAt"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneLitePourAt(this.#host,...args));}
 grabThrowRelease(...args:Parameters<World["grabThrowRelease"]>):ReturnType<World["grabThrowRelease"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneGrabThrowRelease(this.#host,...args));}
 layFissure(...args:Parameters<World["layFissure"]>):ReturnType<World["layFissure"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneLayFissure(this.#host,...args));}
 ringBell(...args:Parameters<World["ringBell"]>):ReturnType<World["ringBell"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneRingBell(this.#host,...args));}
 strikeSurfaces(...args:Parameters<World["strikeSurfaces"]>):ReturnType<World["strikeSurfaces"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[...(args[0]?[args[0]]:[])]},()=>core1.sceneStrikeSurfaces(this.#host,...args));}
 attuneCrystal(...args:Parameters<World["attuneCrystal"]>):ReturnType<World["attuneCrystal"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0],...(args[2]?[args[2]]:[])]},()=>core1.sceneAttuneCrystal(this.#host,...args));}
 knockFixtures(...args:Parameters<World["knockFixtures"]>):ReturnType<World["knockFixtures"]>{return this.#operation.enter({permission:'proc',physical:[args[1]],sources:[args[0]]},()=>core1.sceneKnockFixtures(this.#host,...args));}
 spawnAftershocks(...args:Parameters<World["spawnAftershocks"]>):ReturnType<World["spawnAftershocks"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneSpawnAftershocks(this.#host,...args));}
 tryShellBlock(...args:Parameters<World["tryShellBlock"]>):ReturnType<World["tryShellBlock"]>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[...(args[3]?[args[3]]:[])]},()=>core1.sceneTryShellBlock(this.#host,...args));}
 resolveParryDamage(...args:Parameters<World["resolveParryDamage"]>):ReturnType<World["resolveParryDamage"]>{return this.#operation.enter({permission:'proc',physical:[args[1]],sources:[args[0]]},()=>core1.sceneResolveParryDamage(this.#host,...args));}
 tryGuardBlock(...args:Parameters<World["tryGuardBlock"]>):ReturnType<World["tryGuardBlock"]>{if(args[4])this.#operation.assertSelectedCombatRecord('projectiles',args[4]);return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[args[1]]},()=>core1.sceneTryGuardBlock(this.#host,...args));}
 guardBash(...args:Parameters<World["guardBash"]>):ReturnType<World["guardBash"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneGuardBash(this.#host,...args));}
 addTempGround(...args:Parameters<World["addTempGround"]>):ReturnType<World["addTempGround"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core1.sceneAddTempGround(this.#host,...args));}
 moveBlast(...args:Parameters<World["moveBlast"]>):ReturnType<World["moveBlast"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneMoveBlast(this.#host,...args));}
 applyThorns(...args:Parameters<World["applyThorns"]>):ReturnType<World["applyThorns"]>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[args[1]]},()=>core1.sceneApplyThorns(this.#host,...args));}
 explodeActor(...args:Parameters<World["explodeActor"]>):ReturnType<World["explodeActor"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneExplodeActor(this.#host,...args));}
 burstDamage(...args:Parameters<World["burstDamage"]>):ReturnType<World["burstDamage"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[...(args[7]?[args[7]]:[])]},()=>core1.sceneBurstDamage(this.#host,...args));}
 resolveHit(...args:Parameters<World["resolveHit"]>):ReturnType<World["resolveHit"]>{return this.#operation.enter({permission:'proc',physical:[args[2]],sources:[args[0]]},()=>core1.sceneResolveHit(this.#host,...args));}
 rollStatusProcs(...args:Parameters<World["rollStatusProcs"]>):ReturnType<World["rollStatusProcs"]>{return this.#operation.enter({permission:'proc',physical:[args[2]],sources:[args[0]]},()=>core1.sceneRollStatusProcs(this.#host,...args));}
 rollOwnProcs(...args:Parameters<World["rollOwnProcs"]>):ReturnType<World["rollOwnProcs"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneRollOwnProcs(this.#host,...args));}
 sweepDefenseEvents(...args:Parameters<World["sweepDefenseEvents"]>):ReturnType<World["sweepDefenseEvents"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneSweepDefenseEvents(this.#host,...args));}
 executeProc(...args:Parameters<World["executeProc"]>):ReturnType<World["executeProc"]>{return this.#operation.enter({permission:'proc',physical:[...(args[3]?[args[3]]:[])],sources:[args[1]]},()=>core1.sceneExecuteProc(this.#host,...args));}
 castProcPayload(...args:Parameters<World["castProcPayload"]>):ReturnType<World["castProcPayload"]>{return this.#operation.enter({permission:'proc',physical:[...(args[2]?[args[2]]:[])],sources:[args[0]]},()=>core1.sceneCastProcPayload(this.#host,...args));}
 fireProcRiders(...args:Parameters<World["fireProcRiders"]>):ReturnType<World["fireProcRiders"]>{return this.#operation.enter({permission:'proc',physical:[...(args[3]?[args[3]]:[])],sources:[args[1]]},()=>core1.sceneFireProcRiders(this.#host,...args));}
 ruptureBank(...args:Parameters<World["ruptureBank"]>):ReturnType<World["ruptureBank"]>{return this.#operation.enter({permission:'proc',physical:[args[1]],sources:[args[0]]},()=>core1.sceneRuptureBank(this.#host,...args));}
 ruptureStatus(...args:Parameters<World["ruptureStatus"]>):ReturnType<World["ruptureStatus"]>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[]},()=>core1.sceneRuptureStatus(this.#host,...args));}
 killCtx(...args:Parameters<World["killCtx"]>):ReturnType<World["killCtx"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0],...(args[1]?[args[1]]:[])]},()=>core1.sceneKillCtx(this.#host,...args));}
 kill(...args:Parameters<World["kill"]>):ReturnType<World["kill"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0],...(args[2]?[args[2]]:[])]},()=>this.#operation.withKillEvent(()=>core1.sceneKill(this.#host,...args)));}
 onPartBroken(...args:Parameters<World["onPartBroken"]>):ReturnType<World["onPartBroken"]>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[...(args[1]?[args[1]]:[])]},()=>core1.sceneOnPartBroken(this.#host,...args));}
 triggerAmbush(...args:Parameters<World["triggerAmbush"]>):ReturnType<World["triggerAmbush"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core1.sceneTriggerAmbush(this.#host,...args));}
 rollTriggers(...args:Parameters<World["rollTriggers"]>):ReturnType<World["rollTriggers"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneRollTriggers(this.#host,...args));}
 bankStatusTriggers(...args:Parameters<World["bankStatusTriggers"]>):ReturnType<World["bankStatusTriggers"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneBankStatusTriggers(this.#host,...args));}
 bankDamageTakenTriggers(...args:Parameters<World["bankDamageTakenTriggers"]>):ReturnType<World["bankDamageTakenTriggers"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0],...(args[2]?[args[2]]:[])]},()=>core1.sceneBankDamageTakenTriggers(this.#host,...args));}
 explodeProjectile(...args:Parameters<World["explodeProjectile"]>):ReturnType<World["explodeProjectile"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core1.sceneExplodeProjectile(this.#host,...args));}
 rollSurfaceProcs(...args:Parameters<World["rollSurfaceProcs"]>):ReturnType<World["rollSurfaceProcs"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneRollSurfaceProcs(this.#host,...args));}
 popBrittle(...args:Parameters<World["popBrittle"]>):ReturnType<World["popBrittle"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[...(args[1]?[args[1]]:[])]},()=>core1.scenePopBrittle(this.#host,...args));}
 popBrittleNative(...args:Parameters<World["popBrittleNative"]>):ReturnType<World["popBrittleNative"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[...(args[1]?[args[1]]:[])]},()=>core1.scenePopBrittleNative(this.#host,...args));}
 dissolveBreak(...args:Parameters<World["dissolveBreak"]>):ReturnType<World["dissolveBreak"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core1.sceneDissolveBreak(this.#host,...args));}
 applyRecovery(...args:Parameters<World["applyRecovery"]>):ReturnType<World["applyRecovery"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneApplyRecovery(this.#host,...args));}
 applyEnvDamage(...args:Parameters<World["applyEnvDamage"]>):ReturnType<World["applyEnvDamage"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core1.sceneApplyEnvDamage(this.#host,...args));}
 minionsOf(...args:Parameters<World["minionsOf"]>):ReturnType<World["minionsOf"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneMinionsOf(this.#host,...args));}
 minionsOfGroup(...args:Parameters<World["minionsOfGroup"]>):ReturnType<World["minionsOfGroup"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneMinionsOfGroup(this.#host,...args));}
 removeCorpse(...args:Parameters<World["removeCorpse"]>):ReturnType<World["removeCorpse"]>{this.#operation.assertSelectedCombatRecord('corpses',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core2.sceneRemoveCorpse(this.#host,...args));}
 companionsOfSkill(...args:Parameters<World["companionsOfSkill"]>):ReturnType<World["companionsOfSkill"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneCompanionsOfSkill(this.#host,...args));}
 companionBondsOfSkill(...args:Parameters<World["companionBondsOfSkill"]>):ReturnType<World["companionBondsOfSkill"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneCompanionBondsOfSkill(this.#host,...args));}
 minionServes(...args:Parameters<World["minionServes"]>):ReturnType<World["minionServes"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneMinionServes(this.#host,...args));}
 tryTame(...args:Parameters<World["tryTame"]>):ReturnType<World["tryTame"]>{return this.#operation.enter({permission:'proc',physical:[args[2]],sources:[args[0]]},()=>core2.sceneTryTame(this.#host,...args));}
 tameCompanion(...args:Parameters<World["tameCompanion"]>):ReturnType<World["tameCompanion"]>{if(this.#restoreToken&&this.#operation.isRestoredCompanionPending(this.#restoreToken,args[1]))return this.#operation.withRestoredCompanion(this.#restoreToken,args[0],args[1],()=>core2.sceneTameCompanion(this.#host,...args));return this.#operation.enter({permission:'proc',physical:[args[1]],sources:[args[0]]},()=>core2.sceneTameCompanion(this.#host,...args));}
 throngRecruitCap(...args:Parameters<World["throngRecruitCap"]>):ReturnType<World["throngRecruitCap"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneThrongRecruitCap(this.#host,...args));}
 throngGain(...args:Parameters<World["throngGain"]>):ReturnType<World["throngGain"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneThrongGain(this.#host,...args));}
 throngKeepMinimum(...args:Parameters<World["throngKeepMinimum"]>):ReturnType<World["throngKeepMinimum"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneThrongKeepMinimum(this.#host,...args));}
 hivecallRoster(...args:Parameters<World["hivecallRoster"]>):ReturnType<World["hivecallRoster"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneHivecallRoster(this.#host,...args));}
 hivecallCap(...args:Parameters<World["hivecallCap"]>):ReturnType<World["hivecallCap"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneHivecallCap(this.#host,...args));}
 hivecallPayload(...args:Parameters<World["hivecallPayload"]>):ReturnType<World["hivecallPayload"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneHivecallPayload(this.#host,...args));}
 hivecallDeath(...args:Parameters<World["hivecallDeath"]>):ReturnType<World["hivecallDeath"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneHivecallDeath(this.#host,...args));}
 hivecallTransform(...args:Parameters<World["hivecallTransform"]>):ReturnType<World["hivecallTransform"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneHivecallTransform(this.#host,...args));}
 hivecallReturn(...args:Parameters<World["hivecallReturn"]>):ReturnType<World["hivecallReturn"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneHivecallReturn(this.#host,...args));}
 syncHivecallFormDamage(...args:Parameters<World["syncHivecallFormDamage"]>):ReturnType<World["syncHivecallFormDamage"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneSyncHivecallFormDamage(this.#host,...args));}
 hivecallMeta(...args:Parameters<World["hivecallMeta"]>):ReturnType<World["hivecallMeta"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneHivecallMeta(this.#host,...args));}
 throngBodiesOf(...args:Parameters<World["throngBodiesOf"]>):ReturnType<World["throngBodiesOf"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneThrongBodiesOf(this.#host,...args));}
 throngRosterCount(...args:Parameters<World["throngRosterCount"]>):ReturnType<World["throngRosterCount"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneThrongRosterCount(this.#host,...args));}
 throngCapOf(...args:Parameters<World["throngCapOf"]>):ReturnType<World["throngCapOf"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneThrongCapOf(this.#host,...args));}
 mintThrongFind(...args:Parameters<World["mintThrongFind"]>):ReturnType<World["mintThrongFind"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneMintThrongFind(this.#host,...args));}
 mintThrongBody(...args:Parameters<World["mintThrongBody"]>):ReturnType<World["mintThrongBody"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneMintThrongBody(this.#host,...args));}
 throngYieldCount(...args:Parameters<World["throngYieldCount"]>):ReturnType<World["throngYieldCount"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneThrongYieldCount(this.#host,...args));}
 throngStandNear(...args:Parameters<World["throngStandNear"]>):ReturnType<World["throngStandNear"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core2.sceneThrongStandNear(this.#host,...args));}
 throngDirect(...args:Parameters<World["throngDirect"]>):ReturnType<World["throngDirect"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneThrongDirect(this.#host,...args));}
 liteNoteDeath(...args:Parameters<World["liteNoteDeath"]>):ReturnType<World["liteNoteDeath"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[...(args[2]?[args[2]]:[])]},()=>core2.sceneLiteNoteDeath(this.#host,...args));}
 promoteLite(...args:Parameters<World["promoteLite"]>):ReturnType<World["promoteLite"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core2.scenePromoteLite(this.#host,...args));}
 promoteCommandThrong(...args:Parameters<World["promoteCommandThrong"]>):ReturnType<World["promoteCommandThrong"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.scenePromoteCommandThrong(this.#host,...args));}
 litePocketDisturb(...args:Parameters<World["litePocketDisturb"]>):ReturnType<World["litePocketDisturb"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core2.sceneLitePocketDisturb(this.#host,...args));}
 conjurationLifeline(...args:Parameters<World["conjurationLifeline"]>):ReturnType<World["conjurationLifeline"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneConjurationLifeline(this.#host,...args));}
 birthAt(...args:Parameters<World["birthAt"]>):ReturnType<World["birthAt"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneBirthAt(this.#host,...args));}
 clutchOnDeath(...args:Parameters<World["clutchOnDeath"]>):ReturnType<World["clutchOnDeath"]>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[]},()=>core2.sceneClutchOnDeath(this.#host,...args));}
 corpseSpawn(...args:Parameters<World["corpseSpawn"]>):ReturnType<World["corpseSpawn"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneCorpseSpawn(this.#host,...args));}
 hatchPod(...args:Parameters<World["hatchPod"]>):ReturnType<World["hatchPod"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneHatchPod(this.#host,...args));}
 dismissExclusiveSummons(...args:Parameters<World["dismissExclusiveSummons"]>):ReturnType<World["dismissExclusiveSummons"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneDismissExclusiveSummons(this.#host,...args));}
 minionAreaAvoidanceOf(...args:Parameters<World["minionAreaAvoidanceOf"]>):ReturnType<World["minionAreaAvoidanceOf"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneMinionAreaAvoidanceOf(this.#host,...args));}
 spawnMinion(...args:Parameters<World["spawnMinion"]>):ReturnType<World["spawnMinion"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneSpawnMinion(this.#host,...args));}
 spawnEchoRiders(...args:Parameters<World["spawnEchoRiders"]>):ReturnType<World["spawnEchoRiders"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneSpawnEchoRiders(this.#host,...args));}
 mirageSource(...args:Parameters<World["mirageSource"]>):ReturnType<World["mirageSource"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core2.sceneMirageSource(this.#host,...args));}
 hoverSlotPos(...args:Parameters<World["hoverSlotPos"]>):ReturnType<World["hoverSlotPos"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneHoverSlotPos(this.#host,...args));}
 buildEchoRider(...args:Parameters<World["buildEchoRider"]>):ReturnType<World["buildEchoRider"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneBuildEchoRider(this.#host,...args));}
 spawnConstruct(...args:Parameters<World["spawnConstruct"]>):ReturnType<World["spawnConstruct"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneSpawnConstruct(this.#host,...args));}
 guardianFor(...args:Parameters<World["guardianFor"]>):ReturnType<World["guardianFor"]>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[]},()=>core2.sceneGuardianFor(this.#host,...args));}
 springAmbush(...args:Parameters<World["springAmbush"]>):ReturnType<World["springAmbush"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneSpringAmbush(this.#host,...args));}
 releaseStruckSummons(...args:Parameters<World["releaseStruckSummons"]>):ReturnType<World["releaseStruckSummons"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core2.sceneReleaseStruckSummons(this.#host,...args));}
 guardArtHit(...args:Parameters<World["guardArtHit"]>):ReturnType<World["guardArtHit"]>{return this.#operation.enter({permission:'proc',physical:[args[2]],sources:[args[0]]},()=>core3.sceneGuardArtHit(this.#host,...args));}
 companionPulseHit(...args:Parameters<World["companionPulseHit"]>):ReturnType<World["companionPulseHit"]>{return this.#operation.enter({permission:'proc',physical:[args[0],args[2]],sources:[]},()=>core3.sceneCompanionPulseHit(this.#host,...args));}
 attackSequenceBurst(...args:Parameters<World["attackSequenceBurst"]>):ReturnType<World["attackSequenceBurst"]>{return this.#operation.enter({permission:'proc',physical:[args[2]],sources:[args[0]]},()=>core3.sceneAttackSequenceBurst(this.#host,...args));}
 challengeBurst(...args:Parameters<World["challengeBurst"]>):ReturnType<World["challengeBurst"]>{return this.#operation.enter({permission:'proc',physical:[args[1]],sources:[args[0]]},()=>core3.sceneChallengeBurst(this.#host,...args));}
 challengeHit(...args:Parameters<World["challengeHit"]>):ReturnType<World["challengeHit"]>{return this.#operation.enter({permission:'proc',physical:[args[2]],sources:[args[0]]},()=>core3.sceneChallengeHit(this.#host,...args));}
 assaultBladeHit(...args:Parameters<World["assaultBladeHit"]>):ReturnType<World["assaultBladeHit"]>{return this.#operation.enter({permission:'proc',physical:[args[2]],sources:[args[0]]},()=>core3.sceneAssaultBladeHit(this.#host,...args));}
 carriedEffectContext(...args:Parameters<World["carriedEffectContext"]>):ReturnType<World["carriedEffectContext"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneCarriedEffectContext(this.#host,...args));}
 refreshSatellites(...args:Parameters<World["refreshSatellites"]>):ReturnType<World["refreshSatellites"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneRefreshSatellites(this.#host,...args));}
 refreshGuardians(...args:Parameters<World["refreshGuardians"]>):ReturnType<World["refreshGuardians"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneRefreshGuardians(this.#host,...args));}
 refreshAuroras(...args:Parameters<World["refreshAuroras"]>):ReturnType<World["refreshAuroras"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneRefreshAuroras(this.#host,...args));}
 refreshCreepers(...args:Parameters<World["refreshCreepers"]>):ReturnType<World["refreshCreepers"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneRefreshCreepers(this.#host,...args));}
 actorsNear(...args:Parameters<World["actorsNear"]>):ReturnType<World["actorsNear"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneActorsNear(this.#host,...args));}
 castChrono(...args:Parameters<World["castChrono"]>):ReturnType<World["castChrono"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core3.sceneCastChrono(this.#host,...args));}
 conjureCloud(...args:Parameters<World["conjureCloud"]>):ReturnType<World["conjureCloud"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneConjureCloud(this.#host,...args));}
 creepEnsure(...args:Parameters<World["creepEnsure"]>):ReturnType<World["creepEnsure"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneCreepEnsure(this.#host,...args));}
 cycleCompanionStance(...args:Parameters<World["cycleCompanionStance"]>):ReturnType<World["cycleCompanionStance"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneCycleCompanionStance(this.#host,...args));}
 frontSplash(...args:Parameters<World["frontSplash"]>):ReturnType<World["frontSplash"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[...(args[0]?[args[0]]:[])]},()=>core3.sceneFrontSplash(this.#host,...args));}
 markMetaDirty(...args:Parameters<World["markMetaDirty"]>):ReturnType<World["markMetaDirty"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneMarkMetaDirty(this.#host,...args));}
 markSeatActed(...args:Parameters<World["markSeatActed"]>):ReturnType<World["markSeatActed"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core3.sceneMarkSeatActed(this.#host,...args));}
 mintHazardCloud(...args:Parameters<World["mintHazardCloud"]>):ReturnType<World["mintHazardCloud"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneMintHazardCloud(this.#host,...args));}
 movementMoment(...args:Parameters<World["movementMoment"]>):ReturnType<World["movementMoment"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core3.sceneMovementMoment(this.#host,...args));}
 noiseAt(...args:Parameters<World["noiseAt"]>):ReturnType<World["noiseAt"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[...(args[2]?[args[2]]:[])]},()=>core3.sceneNoiseAt(this.#host,...args));}
 pitPolicyFor(...args:Parameters<World["pitPolicyFor"]>):ReturnType<World["pitPolicyFor"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.scenePitPolicyFor(this.#host,...args));}
 plantKindle(...args:Parameters<World["plantKindle"]>):ReturnType<World["plantKindle"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core3.scenePlantKindle(this.#host,...args));}
 plantVent(...args:Parameters<World["plantVent"]>):ReturnType<World["plantVent"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.scenePlantVent(this.#host,...args));}
 presenceArrival(...args:Parameters<World["presenceArrival"]>):ReturnType<World["presenceArrival"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0],args[1]]},()=>core3.scenePresenceArrival(this.#host,...args));}
 presenceMoment(...args:Parameters<World["presenceMoment"]>):ReturnType<World["presenceMoment"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core3.scenePresenceMoment(this.#host,...args));}
 reflectParriedProjectile(...args:Parameters<World["reflectParriedProjectile"]>):ReturnType<World["reflectParriedProjectile"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[args[1]]},()=>core3.sceneReflectParriedProjectile(this.#host,...args));}
 releaseGarrison(...args:Parameters<World["releaseGarrison"]>):ReturnType<World["releaseGarrison"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core3.sceneReleaseGarrison(this.#host,...args));}
 resonate(...args:Parameters<World["resonate"]>):ReturnType<World["resonate"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneResonate(this.#host,...args));}
 rouseOnWound(...args:Parameters<World["rouseOnWound"]>):ReturnType<World["rouseOnWound"]>{return this.#operation.enter({permission:'proc',physical:[args[0]],sources:[]},()=>core3.sceneRouseOnWound(this.#host,...args));}
 sanctuaryBlocksCombat(...args:Parameters<World["sanctuaryBlocksCombat"]>):ReturnType<World["sanctuaryBlocksCombat"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0],args[1]]},()=>core3.sceneSanctuaryBlocksCombat(this.#host,...args));}
 seatHudOf(...args:Parameters<World["seatHudOf"]>):ReturnType<World["seatHudOf"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneSeatHudOf(this.#host,...args));}
 seatOfRoot(...args:Parameters<World["seatOfRoot"]>):ReturnType<World["seatOfRoot"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[...(args[0]?[args[0]]:[])]},()=>core3.sceneSeatOfRoot(this.#host,...args));}
 showSelfRelease(...args:Parameters<World["showSelfRelease"]>):ReturnType<World["showSelfRelease"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core3.sceneShowSelfRelease(this.#host,...args));}
 spawnLightwell(...args:Parameters<World["spawnLightwell"]>):ReturnType<World["spawnLightwell"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneSpawnLightwell(this.#host,...args));}
 spoilStoryAt(...args:Parameters<World["spoilStoryAt"]>):ReturnType<World["spoilStoryAt"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneSpoilStoryAt(this.#host,...args));}
 stampSpoils(...args:Parameters<World["stampSpoils"]>):ReturnType<World["stampSpoils"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneStampSpoils(this.#host,...args));}
 ultimateFlash(...args:Parameters<World["ultimateFlash"]>):ReturnType<World["ultimateFlash"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core3.sceneUltimateFlash(this.#host,...args));}
 withMassReward<T>(level:number,action:()=>T):T{return this.#operation.enter({permission:"proc"},()=>core3.sceneWithMassReward(this.#host,level,action));}
 companionStanceOf(...args:Parameters<World["companionStanceOf"]>):ReturnType<World["companionStanceOf"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneCompanionStanceOf(this.#host,...args));}
 setCompanionStance(...args:Parameters<World["setCompanionStance"]>):ReturnType<World["setCompanionStance"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneSetCompanionStance(this.#host,...args));}
 holdfastRouseRule(...args:Parameters<World["holdfastRouseRule"]>):ReturnType<World["holdfastRouseRule"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneHoldfastRouseRule(this.#host,...args));}
 holdfastGuardian(...args:Parameters<World["holdfastGuardian"]>):ReturnType<World["holdfastGuardian"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneHoldfastGuardian(this.#host,...args));}
 massOccurrencePitContext(...args:Parameters<World["massOccurrencePitContext"]>):ReturnType<World["massOccurrencePitContext"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core3.sceneMassOccurrencePitContext(this.#host,...args));}
 viewRectFor(...args:Parameters<World["viewRectFor"]>):ReturnType<World["viewRectFor"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core4.sceneViewRectFor(this.#host,...args));}
 plantImpactDress(...args:Parameters<World["plantImpactDress"]>):ReturnType<World["plantImpactDress"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.scenePlantImpactDress(this.#host,...args));}
 liteProjectileSweep(...args:Parameters<World["liteProjectileSweep"]>):ReturnType<World["liteProjectileSweep"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneLiteProjectileSweep(this.#host,...args));}
 zoneHas(...args:Parameters<World["zoneHas"]>):ReturnType<World["zoneHas"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneZoneHas(this.#host,...args));}
 strikeZoneSurfaces(...args:Parameters<World["strikeZoneSurfaces"]>):ReturnType<World["strikeZoneSurfaces"]>{this.#operation.assertSelectedCombatRecord('zones',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneStrikeZoneSurfaces(this.#host,...args));}
 detonateFissureSegment(...args:Parameters<World["detonateFissureSegment"]>):ReturnType<World["detonateFissureSegment"]>{this.#operation.assertSelectedCombatRecord('zones',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneDetonateFissureSegment(this.#host,...args));}
 nearestSeatPos(...args:Parameters<World["nearestSeatPos"]>):ReturnType<World["nearestSeatPos"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneNearestSeatPos(this.#host,...args));}
 burstContact(...args:Parameters<World["burstContact"]>):ReturnType<World["burstContact"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneBurstContact(this.#host,...args));}
 updateDeathBursts(...args:Parameters<World["updateDeathBursts"]>):ReturnType<World["updateDeathBursts"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneUpdateDeathBursts(this.#host,...args));}
 underRoofAt(...args:Parameters<World["underRoofAt"]>):ReturnType<World["underRoofAt"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneUnderRoofAt(this.#host,...args));}
 updateFollowUps(...args:Parameters<World["updateFollowUps"]>):ReturnType<World["updateFollowUps"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneUpdateFollowUps(this.#host,...args));}
 updatePendingSummons(...args:Parameters<World["updatePendingSummons"]>):ReturnType<World["updatePendingSummons"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneUpdatePendingSummons(this.#host,...args));}
 accumulateDotText(...args:Parameters<World["accumulateDotText"]>):ReturnType<World["accumulateDotText"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core4.sceneAccumulateDotText(this.#host,...args));}
 afflictionSeat(...args:Parameters<World["afflictionSeat"]>):ReturnType<World["afflictionSeat"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[args[0]]},()=>core4.sceneAfflictionSeat(this.#host,...args));}
 returnTarget(...args:Parameters<World["returnTarget"]>):ReturnType<World["returnTarget"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneReturnTarget(this.#host,...args));}
 enterReturn(...args:Parameters<World["enterReturn"]>):ReturnType<World["enterReturn"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneEnterReturn(this.#host,...args));}
 forkProjectile(...args:Parameters<World["forkProjectile"]>):ReturnType<World["forkProjectile"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneForkProjectile(this.#host,...args));}
 guidePointOf(...args:Parameters<World["guidePointOf"]>):ReturnType<World["guidePointOf"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneGuidePointOf(this.#host,...args));}
 nearestProjTarget(...args:Parameters<World["nearestProjTarget"]>):ReturnType<World["nearestProjTarget"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneNearestProjTarget(this.#host,...args));}
 kinkProjectile(...args:Parameters<World["kinkProjectile"]>):ReturnType<World["kinkProjectile"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneKinkProjectile(this.#host,...args));}
 advanceProjectile(...args:Parameters<World["advanceProjectile"]>):ReturnType<World["advanceProjectile"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneAdvanceProjectile(this.#host,...args));}
 projTouches(...args:Parameters<World["projTouches"]>):ReturnType<World["projTouches"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneProjTouches(this.#host,...args));}
 projTouchesBody(...args:Parameters<World["projTouchesBody"]>):ReturnType<World["projTouchesBody"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[args[1]]},()=>core4.sceneProjTouchesBody(this.#host,...args));}
 projNose(...args:Parameters<World["projNose"]>):ReturnType<World["projNose"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneProjNose(this.#host,...args));}
 shedFlightShrapnel(...args:Parameters<World["shedFlightShrapnel"]>):ReturnType<World["shedFlightShrapnel"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneShedFlightShrapnel(this.#host,...args));}
 interceptProjectileDomes(...args:Parameters<World["interceptProjectileDomes"]>):ReturnType<World["interceptProjectileDomes"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneInterceptProjectileDomes(this.#host,...args));}
 noteLightningTravel(...args:Parameters<World["noteLightningTravel"]>):ReturnType<World["noteLightningTravel"]>{this.#operation.assertSelectedCombatRecord('projectiles',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneNoteLightningTravel(this.#host,...args));}
 updateProjectiles(...args:Parameters<World["updateProjectiles"]>):ReturnType<World["updateProjectiles"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneUpdateProjectiles(this.#host,...args));}
 updateZones(...args:Parameters<World["updateZones"]>):ReturnType<World["updateZones"]>{return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneUpdateZones(this.#host,...args));}
 updateZoneDomain(...args:Parameters<World["updateZoneDomain"]>):ReturnType<World["updateZoneDomain"]>{this.#operation.assertSelectedCombatRecord('zones',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneUpdateZoneDomain(this.#host,...args));}
 zoneVictims(...args:Parameters<World["zoneVictims"]>):ReturnType<World["zoneVictims"]>{this.#operation.assertSelectedCombatRecord('zones',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneZoneVictims(this.#host,...args));}
 zoneSees(...args:Parameters<World["zoneSees"]>):ReturnType<World["zoneSees"]>{this.#operation.assertSelectedCombatRecord('zones',args[0]);return this.#operation.enter({permission:'proc',physical:[],sources:[]},()=>core4.sceneZoneSees(this.#host,...args));}
 addTether(...args:Parameters<NativeAreaSceneTethers["addTether"]>):ReturnType<NativeAreaSceneTethers["addTether"]>{const owner=this.tethers,fn=owner.addTether;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 attachObjectTethers(...args:Parameters<NativeAreaSceneTethers["attachObjectTethers"]>):ReturnType<NativeAreaSceneTethers["attachObjectTethers"]>{const owner=this.tethers,fn=owner.attachObjectTethers;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 grantAbsorb(...args:Parameters<NativeAreaSceneRestoration["grantAbsorb"]>):ReturnType<NativeAreaSceneRestoration["grantAbsorb"]>{const owner=this.restoration,fn=owner.grantAbsorb;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 applyRestore(...args:Parameters<NativeAreaSceneRestoration["applyRestore"]>):ReturnType<NativeAreaSceneRestoration["applyRestore"]>{const owner=this.restoration,fn=owner.applyRestore;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 startRestoreStream(...args:Parameters<NativeAreaSceneRestoration["startRestoreStream"]>):ReturnType<NativeAreaSceneRestoration["startRestoreStream"]>{const owner=this.restoration,fn=owner.startRestoreStream;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 critMendMult(...args:Parameters<NativeAreaSceneRestoration["critMendMult"]>):ReturnType<NativeAreaSceneRestoration["critMendMult"]>{const owner=this.restoration,fn=owner.critMendMult;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 applyHeal(...args:Parameters<NativeAreaSceneRestoration["applyHeal"]>):ReturnType<NativeAreaSceneRestoration["applyHeal"]>{const owner=this.restoration,fn=owner.applyHeal;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 applyHealChained(...args:Parameters<NativeAreaSceneRestoration["applyHealChained"]>):ReturnType<NativeAreaSceneRestoration["applyHealChained"]>{const owner=this.restoration,fn=owner.applyHealChained;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 cleanseActor(...args:Parameters<NativeAreaSceneRestoration["cleanseActor"]>):ReturnType<NativeAreaSceneRestoration["cleanseActor"]>{const owner=this.restoration,fn=owner.cleanseActor;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 ringAfflictions(...args:Parameters<NativeAreaSceneRestoration["ringAfflictions"]>):ReturnType<NativeAreaSceneRestoration["ringAfflictions"]>{const owner=this.restoration,fn=owner.ringAfflictions;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 healAlliesInArea(...args:Parameters<NativeAreaSceneRestoration["healAlliesInArea"]>):ReturnType<NativeAreaSceneRestoration["healAlliesInArea"]>{const owner=this.restoration,fn=owner.healAlliesInArea;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 seatText(...args:Parameters<NativeAreaSceneRestoration["seatText"]>):ReturnType<NativeAreaSceneRestoration["seatText"]>{const owner=this.restoration,fn=owner.seatText;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 creditFloat(...args:Parameters<NativeAreaSceneRestoration["creditFloat"]>):ReturnType<NativeAreaSceneRestoration["creditFloat"]>{const owner=this.restoration,fn=owner.creditFloat;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 paySkillCost(...args:Parameters<NativeAreaSceneCastingPreparation["paySkillCost"]>):ReturnType<NativeAreaSceneCastingPreparation["paySkillCost"]>{const owner=this.castingPreparation,fn=owner.paySkillCost;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 consumeChargeCost(...args:Parameters<NativeAreaSceneCastingPreparation["consumeChargeCost"]>):ReturnType<NativeAreaSceneCastingPreparation["consumeChargeCost"]>{const owner=this.castingPreparation,fn=owner.consumeChargeCost;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 refundCooldown(...args:Parameters<NativeAreaSceneCastingPreparation["refundCooldown"]>):ReturnType<NativeAreaSceneCastingPreparation["refundCooldown"]>{const owner=this.castingPreparation,fn=owner.refundCooldown;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 consumeAmmunition(...args:Parameters<NativeAreaSceneCastingPreparation["consumeAmmunition"]>):ReturnType<NativeAreaSceneCastingPreparation["consumeAmmunition"]>{const owner=this.castingPreparation,fn=owner.consumeAmmunition;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 consumeRemnants(...args:Parameters<NativeAreaSceneCastingPreparation["consumeRemnants"]>):ReturnType<NativeAreaSceneCastingPreparation["consumeRemnants"]>{const owner=this.castingPreparation,fn=owner.consumeRemnants;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 consumeStealth(...args:Parameters<NativeAreaSceneCastingPreparation["consumeStealth"]>):ReturnType<NativeAreaSceneCastingPreparation["consumeStealth"]>{const owner=this.castingPreparation,fn=owner.consumeStealth;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 comboCursorOf(...args:Parameters<NativeAreaSceneCastingPreparation["comboCursorOf"]>):ReturnType<NativeAreaSceneCastingPreparation["comboCursorOf"]>{const owner=this.castingPreparation,fn=owner.comboCursorOf;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 comboStepOf(...args:Parameters<NativeAreaSceneCastingPreparation["comboStepOf"]>):ReturnType<NativeAreaSceneCastingPreparation["comboStepOf"]>{const owner=this.castingPreparation,fn=owner.comboStepOf;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 heldSkillInst(...args:Parameters<NativeAreaSceneCastingPreparation["heldSkillInst"]>):ReturnType<NativeAreaSceneCastingPreparation["heldSkillInst"]>{const owner=this.castingPreparation,fn=owner.heldSkillInst;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 relocationTarget(...args:Parameters<NativeAreaSceneCastingPreparation["relocationTarget"]>):ReturnType<NativeAreaSceneCastingPreparation["relocationTarget"]>{const owner=this.castingPreparation,fn=owner.relocationTarget;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 mintMetaInstance(...args:Parameters<NativeAreaSceneCastingPreparation["mintMetaInstance"]>):ReturnType<NativeAreaSceneCastingPreparation["mintMetaInstance"]>{const owner=this.castingPreparation,fn=owner.mintMetaInstance;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 pushActor(...args:Parameters<NativeAreaSceneDisplacement["pushActor"]>):ReturnType<NativeAreaSceneDisplacement["pushActor"]>{const owner=this.displacement,fn=owner.pushActor;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 grabRelease(...args:Parameters<NativeAreaSceneDisplacement["grabRelease"]>):ReturnType<NativeAreaSceneDisplacement["grabRelease"]>{const owner=this.displacement,fn=owner.grabRelease;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 clingRelease(...args:Parameters<NativeAreaSceneDisplacement["clingRelease"]>):ReturnType<NativeAreaSceneDisplacement["clingRelease"]>{const owner=this.displacement,fn=owner.clingRelease;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 teleportActor(...args:Parameters<NativeAreaSceneDisplacement["teleportActor"]>):ReturnType<NativeAreaSceneDisplacement["teleportActor"]>{const owner=this.displacement,fn=owner.teleportActor;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 mountFreeSeat(...args:Parameters<NativeAreaSceneDisplacement["mountFreeSeat"]>):ReturnType<NativeAreaSceneDisplacement["mountFreeSeat"]>{const owner=this.displacement,fn=owner.mountFreeSeat;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 mountSeatRider(...args:Parameters<NativeAreaSceneDisplacement["mountSeatRider"]>):ReturnType<NativeAreaSceneDisplacement["mountSeatRider"]>{const owner=this.displacement,fn=owner.mountSeatRider;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 mountUnlink(...args:Parameters<NativeAreaSceneDisplacement["mountUnlink"]>):ReturnType<NativeAreaSceneDisplacement["mountUnlink"]>{const owner=this.displacement,fn=owner.mountUnlink;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 mountUnhorse(...args:Parameters<NativeAreaSceneDisplacement["mountUnhorse"]>):ReturnType<NativeAreaSceneDisplacement["mountUnhorse"]>{const owner=this.displacement,fn=owner.mountUnhorse;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 mountWidowed(...args:Parameters<NativeAreaSceneDisplacement["mountWidowed"]>):ReturnType<NativeAreaSceneDisplacement["mountWidowed"]>{const owner=this.displacement,fn=owner.mountWidowed;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 movementLocked(...args:Parameters<NativeAreaSceneDisplacement["movementLocked"]>):ReturnType<NativeAreaSceneDisplacement["movementLocked"]>{const owner=this.displacement,fn=owner.movementLocked;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 castMoveFactor(...args:Parameters<NativeAreaSceneDisplacement["castMoveFactor"]>):ReturnType<NativeAreaSceneDisplacement["castMoveFactor"]>{const owner=this.displacement,fn=owner.castMoveFactor;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 channelMobility(...args:Parameters<NativeAreaSceneDisplacement["channelMobility"]>):ReturnType<NativeAreaSceneDisplacement["channelMobility"]>{const owner=this.displacement,fn=owner.channelMobility;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 levitating(...args:Parameters<NativeAreaSceneDisplacement["levitating"]>):ReturnType<NativeAreaSceneDisplacement["levitating"]>{const owner=this.displacement,fn=owner.levitating;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 applyBuffEffect(...args:Parameters<NativeAreaSceneCombatState["applyBuffEffect"]>):ReturnType<NativeAreaSceneCombatState["applyBuffEffect"]>{const owner=this.combatState,fn=owner.applyBuffEffect;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 grantTreeBuff(...args:Parameters<NativeAreaSceneCombatState["grantTreeBuff"]>):ReturnType<NativeAreaSceneCombatState["grantTreeBuff"]>{const owner=this.combatState,fn=owner.grantTreeBuff;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 transplantStatus(...args:Parameters<NativeAreaSceneCombatState["transplantStatus"]>):ReturnType<NativeAreaSceneCombatState["transplantStatus"]>{const owner=this.combatState,fn=owner.transplantStatus;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 tapCharges(...args:Parameters<NativeAreaSceneCombatState["tapCharges"]>):ReturnType<NativeAreaSceneCombatState["tapCharges"]>{const owner=this.combatState,fn=owner.tapCharges;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 tapFires(...args:Parameters<NativeAreaSceneCombatState["tapFires"]>):ReturnType<NativeAreaSceneCombatState["tapFires"]>{const owner=this.combatState,fn=owner.tapFires;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 isEliteVictim(...args:Parameters<NativeAreaSceneCombatState["isEliteVictim"]>):ReturnType<NativeAreaSceneCombatState["isEliteVictim"]>{const owner=this.combatState,fn=owner.isEliteVictim;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 bankPools(...args:Parameters<NativeAreaSceneCombatState["bankPools"]>):ReturnType<NativeAreaSceneCombatState["bankPools"]>{const owner=this.combatState,fn=owner.bankPools;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 victimGate(...args:Parameters<NativeAreaSceneCombatState["victimGate"]>):ReturnType<NativeAreaSceneCombatState["victimGate"]>{const owner=this.combatState,fn=owner.victimGate;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 procReady(...args:Parameters<NativeAreaSceneCombatState["procReady"]>):ReturnType<NativeAreaSceneCombatState["procReady"]>{const owner=this.combatState,fn=owner.procReady;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 procGates(...args:Parameters<NativeAreaSceneCombatState["procGates"]>):ReturnType<NativeAreaSceneCombatState["procGates"]>{const owner=this.combatState,fn=owner.procGates;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 procDepthAllowed(...args:Parameters<NativeAreaSceneCombatState["procDepthAllowed"]>):ReturnType<NativeAreaSceneCombatState["procDepthAllowed"]>{const owner=this.combatState,fn=owner.procDepthAllowed;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 rollTopMet(...args:Parameters<NativeAreaSceneCombatState["rollTopMet"]>):ReturnType<NativeAreaSceneCombatState["rollTopMet"]>{const owner=this.combatState,fn=owner.rollTopMet;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 procChance(...args:Parameters<NativeAreaSceneCombatState["procChance"]>):ReturnType<NativeAreaSceneCombatState["procChance"]>{const owner=this.combatState,fn=owner.procChance;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 tryShellPool(...args:Parameters<NativeAreaSceneDefensePreparation["tryShellPool"]>):ReturnType<NativeAreaSceneDefensePreparation["tryShellPool"]>{const owner=this.defensePreparation,fn=owner.tryShellPool;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 showCombatOutcome(...args:Parameters<NativeAreaSceneDefensePreparation["showCombatOutcome"]>):ReturnType<NativeAreaSceneDefensePreparation["showCombatOutcome"]>{const owner=this.defensePreparation,fn=owner.showCombatOutcome;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 refreshGuardBash(...args:Parameters<NativeAreaSceneDefensePreparation["refreshGuardBash"]>):ReturnType<NativeAreaSceneDefensePreparation["refreshGuardBash"]>{const owner=this.defensePreparation,fn=owner.refreshGuardBash;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 isBurstTarget(...args:Parameters<NativeAreaSceneDefensePreparation["isBurstTarget"]>):ReturnType<NativeAreaSceneDefensePreparation["isBurstTarget"]>{const owner=this.defensePreparation,fn=owner.isBurstTarget;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 resolveDeathBurst(...args:Parameters<NativeAreaSceneDefensePreparation["resolveDeathBurst"]>):ReturnType<NativeAreaSceneDefensePreparation["resolveDeathBurst"]>{const owner=this.defensePreparation,fn=owner.resolveDeathBurst;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 bankRune(...args:Parameters<NativeAreaSceneDefensePreparation["bankRune"]>):ReturnType<NativeAreaSceneDefensePreparation["bankRune"]>{const owner=this.defensePreparation,fn=owner.bankRune;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 bumpDrives(...args:Parameters<NativeAreaSceneDefensePreparation["bumpDrives"]>):ReturnType<NativeAreaSceneDefensePreparation["bumpDrives"]>{const owner=this.defensePreparation,fn=owner.bumpDrives;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 skillOcclusion(...args:Parameters<NativeAreaSceneProjectiles["skillOcclusion"]>):ReturnType<NativeAreaSceneProjectiles["skillOcclusion"]>{const owner=this.projectiles,fn=owner.skillOcclusion;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 spawnProjectile(...args:Parameters<NativeAreaSceneProjectiles["spawnProjectile"]>):ReturnType<NativeAreaSceneProjectiles["spawnProjectile"]>{const owner=this.projectiles,fn=owner.spawnProjectile;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 rollKillOrbs(...args:Parameters<NativeAreaSceneKillAftermath["rollKillOrbs"]>):ReturnType<NativeAreaSceneKillAftermath["rollKillOrbs"]>{const owner=this.killAftermath,fn=owner.rollKillOrbs;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 rollKillRemnants(...args:Parameters<NativeAreaSceneKillAftermath["rollKillRemnants"]>):ReturnType<NativeAreaSceneKillAftermath["rollKillRemnants"]>{const owner=this.killAftermath,fn=owner.rollKillRemnants;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 spawnDeathBurst(...args:Parameters<NativeAreaSceneKillAftermath["spawnDeathBurst"]>):ReturnType<NativeAreaSceneKillAftermath["spawnDeathBurst"]>{const owner=this.killAftermath,fn=owner.spawnDeathBurst;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 maddenBankOf(...args:Parameters<NativeAreaSceneGroundFollowUps["maddenBankOf"]>):ReturnType<NativeAreaSceneGroundFollowUps["maddenBankOf"]>{const owner=this.groundFollowUps,fn=owner.maddenBankOf;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 statTrailSpec(...args:Parameters<NativeAreaSceneGroundFollowUps["statTrailSpec"]>):ReturnType<NativeAreaSceneGroundFollowUps["statTrailSpec"]>{const owner=this.groundFollowUps,fn=owner.statTrailSpec;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 mintAftermath(...args:Parameters<NativeAreaSceneGroundFollowUps["mintAftermath"]>):ReturnType<NativeAreaSceneGroundFollowUps["mintAftermath"]>{const owner=this.groundFollowUps,fn=owner.mintAftermath;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 dropLingerField(...args:Parameters<NativeAreaSceneGroundFollowUps["dropLingerField"]>):ReturnType<NativeAreaSceneGroundFollowUps["dropLingerField"]>{const owner=this.groundFollowUps,fn=owner.dropLingerField;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 mintTrailPatch(...args:Parameters<NativeAreaSceneGroundFollowUps["mintTrailPatch"]>):ReturnType<NativeAreaSceneGroundFollowUps["mintTrailPatch"]>{const owner=this.groundFollowUps,fn=owner.mintTrailPatch;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 queueFollowUps(...args:Parameters<NativeAreaSceneGroundFollowUps["queueFollowUps"]>):ReturnType<NativeAreaSceneGroundFollowUps["queueFollowUps"]>{const owner=this.groundFollowUps,fn=owner.queueFollowUps;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 rollSummonType(...args:Parameters<NativeAreaSceneSummonPreparation["rollSummonType"]>):ReturnType<NativeAreaSceneSummonPreparation["rollSummonType"]>{const owner=this.summonPreparation,fn=owner.rollSummonType;return this.#operation.enter({permission:'proc'},()=>Reflect.apply(fn,owner,args));}
 forwardSummonSockets(...args:Parameters<World['forwardSummonSockets']>):ReturnType<World['forwardSummonSockets']>{return sceneForwardSummonSockets(...args);}
 showSkillArrival(...args:Parameters<World['showSkillArrival']>):void{return this.#operation.enter({permission:'proc',sources:[args[0]]},()=>sceneShowSkillArrival(this.#host,...args));}
 private native<A extends unknown[],R>(fn:(host:Host,...args:A)=>R):Binding<(...args:A)=>R>{return {get:()=> (...args:A)=>{this.#operation.assertActiveScope();return fn(this.#host,...args);}};}
 get holdDefense():World['holdDefense'] {return this.input.assembly.input.registry.input.state.holdDefense;}
 get seatQuests():World['seatQuests'] {return NativeAreaCampaignFrameState.forWriter(this.input.characterWriter).seatQuests;}
 resealDoor(...args:Parameters<World['resealDoor']>):ReturnType<World['resealDoor']>{return this.#operation.enter({physical:[],permission:'proc'},()=>this.input.assembly.input.harbor.resealDoor(...args));}
 refreshHoldDress(...args:Parameters<World['refreshHoldDress']>):ReturnType<World['refreshHoldDress']>{return this.#operation.enter({physical:[],permission:'proc'},()=>this.input.assembly.input.harbor.refreshHoldDress(...args));}
 refreshHoldServices(...args:Parameters<World['refreshHoldServices']>):ReturnType<World['refreshHoldServices']>{return this.#operation.enter({physical:[],permission:'proc'},()=>this.input.assembly.input.harbor.refreshHoldServices(...args));}
 spawnWarband(...args:Parameters<World['spawnWarband']>):ReturnType<World['spawnWarband']>{return this.#operation.enter({physical:[],permission:'proc'},()=>this.input.assembly.input.registry.input.birth.spawnWarband(...args));}
 dissipateHauntSpawns(...args:Parameters<World['dissipateHauntSpawns']>):ReturnType<World['dissipateHauntSpawns']>{return this.#operation.enter({physical:[],permission:'proc'},()=>directoryCore.sceneDissipateHauntSpawns(this.#host,...args));}
 clearWaypointLanding(...args:Parameters<World['clearWaypointLanding']>):ReturnType<World['clearWaypointLanding']>{return this.#operation.enter({physical:[args[0]],permission:'physical'},()=>directoryCore.sceneClearWaypointLanding(this.#host,...args));}
 nearBountyBoard(...args:Parameters<World['nearBountyBoard']>):ReturnType<World['nearBountyBoard']>{return this.#operation.enter({physical:[],permission:'proc'},()=>frameServices.sceneNearBountyBoard(this.#host,...args));}
 realmArenaWake(...args:Parameters<NativeAreaSceneCampaignFrame['realmArenaWake']>):ReturnType<NativeAreaSceneCampaignFrame['realmArenaWake']>{return this.campaignFrame.realmArenaWake(...args);}
 framePreActors(dt:number):void {this.#operation.enter({physical:[],permission:'proc'},()=>frameCore.sceneFramePreActors(this.#host,dt));}
 frameActors(dt:number,rawDt:number):void {this.#operation.enter({physical:[],permission:'proc'},()=>frameCore.sceneFrameActors(this.#host,dt,rawDt));}
 frameEffects(dt:number):void {this.#operation.enter({physical:[],permission:'proc'},()=>frameCore.sceneFrameEffects(this.#host,dt));}
 frameLateBodies(dt:number):void {this.#operation.enter({physical:[],permission:'proc'},()=>frameCore.sceneFrameLateBodies(this.#host,dt));}
 private bindings():Bindings {const {assembly,progression,campaign,quests,watching}=this.input;const bindings={
  addSeat:method(()=>this.party,'addSeat'),
  adoptSeatMeta:method(()=>this.party,'adoptSeatMeta'),
  hireMercenary:method(()=>this.party,'hireMercenary'),

  endRun:method(()=>this.campaignTransitions,'endRun'),
  retireCharacter:method(()=>this.campaignTransitions,'retireCharacter'),
  chartCourse:method(()=>this.campaignFrame,"chartCourse"),
  sailTo:method(()=>this.campaignFrame,"sailTo"),
  declineVocationOffer:method(()=>this.input.questInteraction,"declineVocationOffer"),
  dismissMercenary:method(()=>this.campaignTransitions,"dismissMercenary"),
  ensureOpenRealmRoots:this.native(uiCore.sceneEnsureOpenRealmRoots),
  frostHeld:{get:()=> (...args:Parameters<World["frostHeld"]>)=>{this.#operation.assertActiveScope();return wireCore.sceneFrostHeld(this.#host,...args);}},
gloom:{get:()=> (...args:Parameters<World["gloom"]>)=>{this.#operation.assertActiveScope();return wireCore.sceneGloom(this.#host,...args);}},
harvestHolds:{get:()=> (...args:Parameters<World["harvestHolds"]>)=>{this.#operation.assertActiveScope();return wireCore.sceneHarvestHolds(this.#host,...args);}},
livePings:{get:()=> (...args:Parameters<World["livePings"]>)=>{this.#operation.assertActiveScope();return wireCore.sceneLivePings(this.#host,...args);}},
seatHudWire:{get:()=> (...args:Parameters<World["seatHudWire"]>)=>{this.#operation.assertActiveScope();return wireCore.sceneSeatHudWire(this.#host,...args);}},
smithCounterHere:{get:()=> (...args:Parameters<World["smithCounterHere"]>)=>{this.#operation.assertActiveScope();return wireCore.sceneSmithCounterHere(this.#host,...args);}},
vendorEntryHold:{get:()=> (...args:Parameters<World["vendorEntryHold"]>)=>{this.#operation.assertActiveScope();return wireCore.sceneVendorEntryHold(this.#host,...args);}},
withApproachPass:{get:()=> <T>(fn:()=>T):T=>{this.#operation.assertActiveScope();return wireCore.sceneWithApproachPass(this.#host,fn);}},
seatHarvestView:{get:()=> (...args:Parameters<World["seatHarvestView"]>)=>{this.#operation.assertActiveScope();return wireCore.sceneSeatHarvestView(this.#host,...args);}},
vendorGemsOpen:method(()=>this.input.assembly.input.settlement,'vendorGemsOpen'),
  harvestPauseRefused:{get:()=>()=>{this.#operation.assertActiveScope();return uiCore.sceneHarvestPauseRefused(this.#viewHost);}},
  questDefOf:method(()=>this.input.quests,"questDefOf"),
  questStanding:method(()=>this.input.quests,"questStanding"),
  questOfferChoices:method(()=>this.input.questInteraction,"questOfferChoices"),
  questRewardOffers:method(()=>this.input.questInteraction,"questRewardOffers"),
  vocationMenuOffers:method(()=>this.input.questInteraction,"vocationMenuOffers"),
  questImbueOffers:method(()=>this.input.questInteraction,"questImbueOffers"),
  mercTargetLevel:method(()=>this.input.progression,"mercTargetLevel"),
  bearingOf:method(()=>assembly.input.registry.input.birth,"bearingOf"),
  completedQuests:{get:()=>this.input.quests.questLedger().completed},
  boroughArmView:{get:()=> (...args:Parameters<World['boroughArmView']>)=>{this.#operation.assertActiveScope();return menuCore.sceneBoroughArmView(this.#menuHost,...args);}},
  bountyBoardView:{get:()=> (...args:Parameters<World['bountyBoardView']>)=>{this.#operation.assertActiveScope();return menuCore.sceneBountyBoardView(this.#menuHost,...args);}},
  canRetireHere:{get:()=> (...args:Parameters<World['canRetireHere']>)=>{this.#operation.assertActiveScope();return menuCore.sceneCanRetireHere(this.#menuHost,...args);}},
  caravanMenuBands:{get:()=> (...args:Parameters<World['caravanMenuBands']>)=>{this.#operation.assertActiveScope();return menuCore.sceneCaravanMenuBands(this.#menuHost,...args);}},
  continentAtMap:{get:()=> (...args:Parameters<World['continentAtMap']>)=>{this.#operation.assertActiveScope();return menuCore.sceneContinentAtMap(this.#menuHost,...args);}},
  dimensionBiomeAtMap:{get:()=> (...args:Parameters<World['dimensionBiomeAtMap']>)=>{this.#operation.assertActiveScope();return menuCore.sceneDimensionBiomeAtMap(this.#menuHost,...args);}},
  forgeWrits:{get:()=> (...args:Parameters<World['forgeWrits']>)=>{this.#operation.assertActiveScope();return menuCore.sceneForgeWrits(this.#menuHost,...args);}},
  harborHearsay:{get:()=> (...args:Parameters<World['harborHearsay']>)=>{this.#operation.assertActiveScope();return menuCore.sceneHarborHearsay(this.#menuHost,...args);}},
  harvestPauseLocked:{get:()=> (...args:Parameters<World['harvestPauseLocked']>)=>{this.#operation.assertActiveScope();return menuCore.sceneHarvestPauseLocked(this.#menuHost,...args);}},
  holdPanelInfo:{get:()=> (...args:Parameters<World['holdPanelInfo']>)=>{this.#operation.assertActiveScope();return menuCore.sceneHoldPanelInfo(this.#menuHost,...args);}},
  memoryRecallLesson:{get:()=> (...args:Parameters<World['memoryRecallLesson']>)=>{this.#operation.assertActiveScope();return menuCore.sceneMemoryRecallLesson(this.#menuHost,...args);}},
  memoryRecallView:{get:()=> (...args:Parameters<World['memoryRecallView']>)=>{this.#operation.assertActiveScope();return menuCore.sceneMemoryRecallView(this.#menuHost,...args);}},
  mercHireCap:{get:()=> (...args:Parameters<World['mercHireCap']>)=>{this.#operation.assertActiveScope();return menuCore.sceneMercHireCap(this.#menuHost,...args);}},
  mercHireCost:{get:()=> (...args:Parameters<World['mercHireCost']>)=>{this.#operation.assertActiveScope();return menuCore.sceneMercHireCost(this.#menuHost,...args);}},
  mercOfferBlocked:{get:()=> (...args:Parameters<World['mercOfferBlocked']>)=>{this.#operation.assertActiveScope();return menuCore.sceneMercOfferBlocked(this.#menuHost,...args);}},
  mireilleLessonSkills:{get:()=> (...args:Parameters<World['mireilleLessonSkills']>)=>{this.#operation.assertActiveScope();return menuCore.sceneMireilleLessonSkills(this.#menuHost,...args);}},
  nearAnyVendor:{get:()=> (...args:Parameters<World['nearAnyVendor']>)=>{this.#operation.assertActiveScope();return menuCore.sceneNearAnyVendor(this.#menuHost,...args);}},
  questLog:{get:()=> (...args:Parameters<World['questLog']>)=>{this.#operation.assertActiveScope();return menuCore.sceneQuestLog(this.#menuHost,...args);}},
  questHome:{get:()=> (...args:Parameters<World['questHome']>)=>{this.#operation.assertActiveScope();return menuCore.sceneQuestHome(this.#menuHost,...args);}},
  sailMenuPorts:{get:()=> (...args:Parameters<World['sailMenuPorts']>)=>{this.#operation.assertActiveScope();return menuCore.sceneSailMenuPorts(this.#menuHost,...args);}},
  seaNameOf:{get:()=> (...args:Parameters<World['seaNameOf']>)=>{this.#operation.assertActiveScope();return menuCore.sceneSeaNameOf(this.#menuHost,...args);}},
  traceActive:{get:()=> (...args:Parameters<World['traceActive']>)=>{this.#operation.assertActiveScope();return menuCore.sceneTraceActive(this.#menuHost,...args);}},
  radiance:method(()=>assembly.sky,"radiance"),
  sightClipD:method(()=>assembly.input.geometry,"sightClipD"),
  getQuestGiver:method(()=>this.input.quests,"getQuestGiver"),
  questGiverPrompt:method(()=>this.input.questInteraction,"questGiverPrompt"),
  lairAskView:method(()=>this.input.watching,"lairAskView"),
  packageAskView:method(()=>this.input.watching,"packageAskView"),
  ventureAskView:method(()=>this.input.watching,"ventureAskView"),
  livingSpawners:method(()=>this.input.watching,"livingSpawners"),
  questGiverDwell:field(()=>this.input.questInteraction.input.state,"questGiverDwell"),
  netRevive:field(()=>this.input.characterWriter,"netRevive"),
  netRoadDwell:field(()=>this.input.characterWriter,"netRoadDwell"),
  spires:field(()=>assembly.input.objectives,"spires"),
  rifts:field(()=>assembly.input.objectives,"rifts"),
  pyres:field(()=>assembly.input.objectives,"pyres"),
  digs:field(()=>assembly.input.objectives,"digs"),
  procession:field(()=>assembly.input.objectives,"procession"),
  objectiveLost:field(()=>assembly.input.objectives,"objectiveLost"),
  netHarvest:field(()=>this.input.characterWriter,"netHarvest"),
  npcDialogues:field(()=>assembly.input.residents,"npcDialogues"),
  speakerRows:field(()=>assembly.input.residents,"speakerRows"),
  speechMemory:field(()=>assembly.input.residents,"speechMemory"),
  speechFocus:field(()=>assembly.input.residents,"speechFocus"),
  speechFocusSpeaker:field(()=>assembly.input.residents,"speechFocusSpeaker"),
  newsLog:{get:()=>this.input.characterWriter['newsLog'],set:(value:World['newsLog'])=>{this.input.characterWriter['newsLog']=value;}},
  slainLog:field(()=>this.campaignOwner.shared,"slainLog"),
  objectiveLatch:field(()=>assembly.input.objectives,"objectiveLatch"),
  cull:field(()=>assembly.input.objectives,"cull"),
  wave:field(()=>assembly.input.objectives,"wave"),
  heldFixture:field(()=>assembly.input.objectives,"heldFixture"),
  offering:field(()=>assembly.input.objectives,"offering"),
  party:field(()=>this.input.characterWriter,"party"),
  clientSeatId:field(()=>this.input.characterWriter,"clientSeatId"),
  skyBelow:field(()=>assembly.input.state,"skyBelow"),
  amalgamPickView:{get:()=> (...args:Parameters<World['amalgamPickView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneAmalgamPickView(this.#viewHost,...args);}},
  boardIntroduction:{get:()=> (...args:Parameters<World['boardIntroduction']>)=>{this.#operation.assertActiveScope();return viewCore.sceneBoardIntroduction(this.#viewHost,...args);}},
  bountyLessonLive:{get:()=> (...args:Parameters<World['bountyLessonLive']>)=>{this.#operation.assertActiveScope();return viewCore.sceneBountyLessonLive(this.#viewHost,...args);}},
  boroughHint:{get:()=> (...args:Parameters<World['boroughHint']>)=>{this.#operation.assertActiveScope();return viewCore.sceneBoroughHint(this.#viewHost,...args);}},
  bossBarInfo:{get:()=> (...args:Parameters<World['bossBarInfo']>)=>{this.#operation.assertActiveScope();return viewCore.sceneBossBarInfo(this.#viewHost,...args);}},
  bountyBoardHint:{get:()=> (...args:Parameters<World['bountyBoardHint']>)=>{this.#operation.assertActiveScope();return viewCore.sceneBountyBoardHint(this.#viewHost,...args);}},
  campfireHint:{get:()=> (...args:Parameters<World['campfireHint']>)=>{this.#operation.assertActiveScope();return viewCore.sceneCampfireHint(this.#viewHost,...args);}},
  couchActive:{get:()=> (...args:Parameters<World['couchActive']>)=>{this.#operation.assertActiveScope();return viewCore.sceneCouchActive(this.#viewHost,...args);}},
  couchHeroes:{get:()=> (...args:Parameters<World['couchHeroes']>)=>{this.#operation.assertActiveScope();return viewCore.sceneCouchHeroes(this.#viewHost,...args);}},
  couchSeats:{get:()=> (...args:Parameters<World['couchSeats']>)=>{this.#operation.assertActiveScope();return viewCore.sceneCouchSeats(this.#viewHost,...args);}},
  deathBurstsView:{get:()=> (...args:Parameters<World['deathBurstsView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneDeathBurstsView(this.#viewHost,...args);}},
  descentView:{get:()=> (...args:Parameters<World['descentView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneDescentView(this.#viewHost,...args);}},
  dimGatesView:{get:()=> (...args:Parameters<World['dimGatesView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneDimGatesView(this.#viewHost,...args);}},
  dwellRingsView:{get:()=> (...args:Parameters<World['dwellRingsView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneDwellRingsView(this.#viewHost,...args);}},
  dwellTargetsView:{get:()=> (...args:Parameters<World['dwellTargetsView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneDwellTargetsView(this.#viewHost,...args);}},
  reviveTargetsView:{get:()=> (...args:Parameters<World['reviveTargetsView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneReviveTargetsView(this.#viewHost,...args);}},
  corpseTargetsView:{get:()=> (...args:Parameters<World['corpseTargetsView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneCorpseTargetsView(this.#viewHost,...args);}},
  exitDwellView:{get:()=> (...args:Parameters<World['exitDwellView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneExitDwellView(this.#viewHost,...args);}},
  caveDwellView:{get:()=> (...args:Parameters<World['caveDwellView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneCaveDwellView(this.#viewHost,...args);}},
  realmDwellView:{get:()=> (...args:Parameters<World['realmDwellView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneRealmDwellView(this.#viewHost,...args);}},
  doorDwellView:{get:()=> (...args:Parameters<World['doorDwellView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneDoorDwellView(this.#viewHost,...args);}},
  holdfastDwellView:{get:()=> (...args:Parameters<World['holdfastDwellView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneHoldfastDwellView(this.#viewHost,...args);}},
  descentDwellView:{get:()=> (...args:Parameters<World['descentDwellView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneDescentDwellView(this.#viewHost,...args);}},
  wardDwellView:{get:()=> (...args:Parameters<World['wardDwellView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneWardDwellView(this.#viewHost,...args);}},
  extractionDwellView:{get:()=> (...args:Parameters<World['extractionDwellView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneExtractionDwellView(this.#viewHost,...args);}},
  boroughDwellView:{get:()=> (...args:Parameters<World['boroughDwellView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneBoroughDwellView(this.#viewHost,...args);}},
  huntDwellView:{get:()=> (...args:Parameters<World['huntDwellView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneHuntDwellView(this.#viewHost,...args);}},
  processionView:{get:()=> (...args:Parameters<World['processionView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneProcessionView(this.#viewHost,...args);}},
  encountersView:{get:()=> (...args:Parameters<World['encountersView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneEncountersView(this.#viewHost,...args);}},
  extractionHint:{get:()=> (...args:Parameters<World['extractionHint']>)=>{this.#operation.assertActiveScope();return viewCore.sceneExtractionHint(this.#viewHost,...args);}},
  fractureView:{get:()=> (...args:Parameters<World['fractureView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneFractureView(this.#viewHost,...args);}},
  frameLockFocus:{get:()=> (...args:Parameters<World['frameLockFocus']>)=>{this.#operation.assertActiveScope();return viewCore.sceneFrameLockFocus(this.#viewHost,...args);}},
  gloamingView:{get:()=> (...args:Parameters<World['gloamingView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneGloamingView(this.#viewHost,...args);}},
  harvestView:{get:()=> (...args:Parameters<World['harvestView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneHarvestView(this.#viewHost,...args);}},
  holdfastTollPrompt:{get:()=> (...args:Parameters<World['holdfastTollPrompt']>)=>{this.#operation.assertActiveScope();return viewCore.sceneHoldfastTollPrompt(this.#viewHost,...args);}},
  holdfastPocketPitch:{get:()=> (...args:Parameters<World['holdfastPocketPitch']>)=>{this.#operation.assertActiveScope();return viewCore.sceneHoldfastPocketPitch(this.#viewHost,...args);}},
  huntFootprintView:{get:()=> (...args:Parameters<World['huntFootprintView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneHuntFootprintView(this.#viewHost,...args);}},
  leylineView:{get:()=> (...args:Parameters<World['leylineView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneLeylineView(this.#viewHost,...args);}},
  npcSpeechView:{get:()=> (...args:Parameters<World['npcSpeechView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneNpcSpeechView(this.#viewHost,...args);}},
  speechCandidates:{get:()=> (...args:Parameters<World['speechCandidates']>)=>{this.#operation.assertActiveScope();return viewCore.sceneSpeechCandidates(this.#viewHost,...args);}},
  innkeepPrompt:{get:()=> (...args:Parameters<World['innkeepPrompt']>)=>{this.#operation.assertActiveScope();return viewCore.sceneInnkeepPrompt(this.#viewHost,...args);}},
  nearMireille:{get:()=> (...args:Parameters<World['nearMireille']>)=>{this.#operation.assertActiveScope();return viewCore.sceneNearMireille(this.#viewHost,...args);}},
  heroKnown:{get:()=> (...args:Parameters<World['heroKnown']>)=>{this.#operation.assertActiveScope();return viewCore.sceneHeroKnown(this.#viewHost,...args);}},
  mireilleGiftLesson:{get:()=> (...args:Parameters<World['mireilleGiftLesson']>)=>{this.#operation.assertActiveScope();return viewCore.sceneMireilleGiftLesson(this.#viewHost,...args);}},
  caravanPrompt:{get:()=> (...args:Parameters<World['caravanPrompt']>)=>{this.#operation.assertActiveScope();return viewCore.sceneCaravanPrompt(this.#viewHost,...args);}},
  amalgamPrompt:{get:()=> (...args:Parameters<World['amalgamPrompt']>)=>{this.#operation.assertActiveScope();return viewCore.sceneAmalgamPrompt(this.#viewHost,...args);}},
  delverPrompt:{get:()=> (...args:Parameters<World['delverPrompt']>)=>{this.#operation.assertActiveScope();return viewCore.sceneDelverPrompt(this.#viewHost,...args);}},
  residentPrompt:{get:()=> (...args:Parameters<World['residentPrompt']>)=>{this.#operation.assertActiveScope();return viewCore.sceneResidentPrompt(this.#viewHost,...args);}},
  composeSpeakerLine:{get:()=> (...args:Parameters<World['composeSpeakerLine']>)=>{this.#operation.assertActiveScope();return viewCore.sceneComposeSpeakerLine(this.#viewHost,...args);}},
  speechContext:{get:()=> (...args:Parameters<World['speechContext']>)=>{this.#operation.assertActiveScope();return viewCore.sceneSpeechContext(this.#viewHost,...args);}},
  objectiveText:{get:()=> (...args:Parameters<World['objectiveText']>)=>{this.#operation.assertActiveScope();return viewCore.sceneObjectiveText(this.#viewHost,...args);}},
  spireView:{get:()=> (...args:Parameters<World['spireView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneSpireView(this.#viewHost,...args);}},
  holdFixturesView:{get:()=> (...args:Parameters<World['holdFixturesView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneHoldFixturesView(this.#viewHost,...args);}},
  riftsView:{get:()=> (...args:Parameters<World['riftsView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneRiftsView(this.#viewHost,...args);}},
  pyresView:{get:()=> (...args:Parameters<World['pyresView']>)=>{this.#operation.assertActiveScope();return viewCore.scenePyresView(this.#viewHost,...args);}},
  digsView:{get:()=> (...args:Parameters<World['digsView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneDigsView(this.#viewHost,...args);}},
  oracleHint:{get:()=> (...args:Parameters<World['oracleHint']>)=>{this.#operation.assertActiveScope();return viewCore.sceneOracleHint(this.#viewHost,...args);}},
  pingVisibleTo:{get:()=> (...args:Parameters<World['pingVisibleTo']>)=>{this.#operation.assertActiveScope();return viewCore.scenePingVisibleTo(this.#viewHost,...args);}},
  publishViewFrame:{get:()=> (...args:Parameters<World['publishViewFrame']>)=>{this.#operation.assertActiveScope();return viewCore.scenePublishViewFrame(this.#viewHost,...args);}},
  rampageActive:{get:()=> (...args:Parameters<World['rampageActive']>)=>{this.#operation.assertActiveScope();return viewCore.sceneRampageActive(this.#viewHost,...args);}},
  realmGatesView:{get:()=> (...args:Parameters<World['realmGatesView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneRealmGatesView(this.#viewHost,...args);}},
  reviveHint:{get:()=> (...args:Parameters<World['reviveHint']>)=>{this.#operation.assertActiveScope();return viewCore.sceneReviveHint(this.#viewHost,...args);}},
  salvageHint:{get:()=> (...args:Parameters<World['salvageHint']>)=>{this.#operation.assertActiveScope();return viewCore.sceneSalvageHint(this.#viewHost,...args);}},
  seatIdOfActor:{get:()=> (...args:Parameters<World['seatIdOfActor']>)=>{this.#operation.assertActiveScope();return viewCore.sceneSeatIdOfActor(this.#viewHost,...args);}},
  seatStageDef:{get:()=> (...args:Parameters<World['seatStageDef']>)=>{this.#operation.assertActiveScope();return viewCore.sceneSeatStageDef(this.#viewHost,...args);}},
  selfStacksOf:{get:()=> (...args:Parameters<World['selfStacksOf']>)=>{this.#operation.assertActiveScope();return viewCore.sceneSelfStacksOf(this.#viewHost,...args);}},
  skillUsable:{get:()=> (...args:Parameters<World['skillUsable']>)=>{this.#operation.assertActiveScope();return viewCore.sceneSkillUsable(this.#viewHost,...args);}},
  slotFaceOf:{get:()=> (...args:Parameters<World['slotFaceOf']>)=>{this.#operation.assertActiveScope();return viewCore.sceneSlotFaceOf(this.#viewHost,...args);}},
  speechApproachHint:{get:()=> (...args:Parameters<World['speechApproachHint']>)=>{this.#operation.assertActiveScope();return viewCore.sceneSpeechApproachHint(this.#viewHost,...args);}},
  speechDwellTargetsView:{get:()=> (...args:Parameters<World['speechDwellTargetsView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneSpeechDwellTargetsView(this.#viewHost,...args);}},
  speechFocusTarget:{get:()=> (...args:Parameters<World['speechFocusTarget']>)=>{this.#operation.assertActiveScope();return viewCore.sceneSpeechFocusTarget(this.#viewHost,...args);}},
  storeyedStructures:{get:()=> (...args:Parameters<World['storeyedStructures']>)=>{this.#operation.assertActiveScope();return viewCore.sceneStoreyedStructures(this.#viewHost,...args);}},
  survivalRowVisible:{get:()=> (...args:Parameters<World['survivalRowVisible']>)=>{this.#operation.assertActiveScope();return viewCore.sceneSurvivalRowVisible(this.#viewHost,...args);}},
  traceView:{get:()=> (...args:Parameters<World['traceView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneTraceView(this.#viewHost,...args);}},
  trackerHint:{get:()=> (...args:Parameters<World['trackerHint']>)=>{this.#operation.assertActiveScope();return viewCore.sceneTrackerHint(this.#viewHost,...args);}},
  unleashSealsOf:{get:()=> (...args:Parameters<World['unleashSealsOf']>)=>{this.#operation.assertActiveScope();return viewCore.sceneUnleashSealsOf(this.#viewHost,...args);}},
  casterMidCastOf:{get:()=> (...args:Parameters<World['casterMidCastOf']>)=>{this.#operation.assertActiveScope();return viewCore.sceneCasterMidCastOf(this.#viewHost,...args);}},
  voyageLandingView:{get:()=> (...args:Parameters<World['voyageLandingView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneVoyageLandingView(this.#viewHost,...args);}},
  finishNpcDialogue:{get:()=> (...args:Parameters<World['finishNpcDialogue']>)=>{this.#operation.assertActiveScope();return viewCore.sceneFinishNpcDialogue(this.#viewHost,...args);}},
  npcDialogueReachable:{get:()=> (...args:Parameters<World['npcDialogueReachable']>)=>{this.#operation.assertActiveScope();return viewCore.sceneNpcDialogueReachable(this.#viewHost,...args);}},
  dissolveCrackView:{get:()=> (...args:Parameters<World['dissolveCrackView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneDissolveCrackView(this.#viewHost,...args);}},
  dissolveFloorCrackView:{get:()=> (...args:Parameters<World['dissolveFloorCrackView']>)=>{this.#operation.assertActiveScope();return viewCore.sceneDissolveFloorCrackView(this.#viewHost,...args);}},
  emergeOf:{get:()=> (...args:Parameters<World['emergeOf']>)=>{this.#operation.assertActiveScope();return viewCore.sceneEmergeOf(this.#viewHost,...args);}},
  gloomDarkness:{get:()=> (...args:Parameters<World['gloomDarkness']>)=>{this.#operation.assertActiveScope();return viewCore.sceneGloomDarkness(this.#viewHost,...args);}},
  sailPrompt:{get:()=> (...args:Parameters<World['sailPrompt']>)=>{this.#operation.assertActiveScope();return viewCore.sceneSailPrompt(this.#viewHost,...args);}},
  skyBelowDef:{get:()=> (...args:Parameters<World['skyBelowDef']>)=>{this.#operation.assertActiveScope();return viewCore.sceneSkyBelowDef(this.#viewHost,...args);}},
  account:field(()=>campaign,"account"),
  accountDirty:field(()=>campaign,"accountDirty"),
  accumulateDotText:method(()=>this,"accumulateDotText"),
  actingSeat:field(()=>campaign,"actingSeat"),
  activateAura:method(()=>this,"activateAura"),
  actorById:method(()=>assembly.input.ecology,"actorById"),
  actors:field(()=>this.scene,"actors"),
  actorsNear:method(()=>this,"actorsNear"),
  actorTurnRate:method(()=>this,"actorTurnRate"),
  addTempGround:method(()=>this,"addTempGround"),
  addTether:method(()=>this,"addTether"),
  advanceProjectile:method(()=>this,"advanceProjectile"),
  afflictionSeat:method(()=>this,"afflictionSeat"),
  affordedDest:method(()=>this,"affordedDest"),
  aiHoldOf:method(()=>this,"aiHoldOf"),
  aiNeedsFireLine:method(()=>this,"aiNeedsFireLine"),
  annexReveal:method(()=>assembly.input.openings,"annexReveal"),
  applyBuffEffect:method(()=>this,"applyBuffEffect"),
  applyEnvDamage:method(()=>this,"applyEnvDamage"),
  applyHeal:method(()=>this,"applyHeal"),
  applyHealChained:method(()=>this,"applyHealChained"),
  applyRecovery:method(()=>this,"applyRecovery"),
  applyRestore:method(()=>this,"applyRestore"),
  applyThorns:method(()=>this,"applyThorns"),
  arena:field(()=>assembly.input.geometry,"arena"),
  assaultDoomCull:method(()=>this,"assaultDoomCull"),
  assaultBladeHit:method(()=>this,"assaultBladeHit"),
  assaults:field(()=>this.runtimeState,"assaults"),
  attachObjectTethers:method(()=>this,"attachObjectTethers"),
  attackSequences:field(()=>progression,"attackSequences"),
  attuneCrystal:method(()=>this,"attuneCrystal"),
  attuneScratch:field(()=>this.runtimeState,"attuneScratch"),
  auroras:field(()=>this.runtimeState,"auroras"),
  bakeMinionOwnerStats:method(()=>progression,"bakeMinionOwnerStats"),
  bankDamageTakenTriggers:method(()=>this,"bankDamageTakenTriggers"),
  bankEssenceSpill:method(()=>this.campaignOwner,"bankEssenceSpill"),
  bankPools:method(()=>this,"bankPools"),
  bankRune:method(()=>this,"bankRune"),
  bankStatusTriggers:method(()=>this,"bankStatusTriggers"),
  bindCombatDeeds:method(()=>this.campaignOwner,"bindCombatDeeds"),
  birthAt:method(()=>this,"birthAt"),
  blastPocks:field(()=>this.runtimeState,"blastPocks"),
  blastPocksKey:field(()=>this.runtimeState,"blastPocksKey"),
  bossRun:field(()=>assembly.input.geometry,"bossRun"),
  bridges:field(()=>assembly.input.geometry,"bridges"),
  buildEchoRider:method(()=>this,"buildEchoRider"),
  bumpDrives:method(()=>this,"bumpDrives"),
  burstContact:method(()=>this,"burstContact"),
  burstDamage:method(()=>this,"burstDamage"),
  carriedEffectContext:method(()=>this,"carriedEffectContext"),
  castChrono:method(()=>this,"castChrono"),
  castPress:method(()=>this,"castPress"),
  castProcPayload:method(()=>this,"castProcPayload"),
  castSealed:method(()=>this,"castSealed"),
  castTurnRate:method(()=>this,"castTurnRate"),
  challenges:field(()=>progression,"challenges"),
  charDirty:field(()=>campaign,"charDirty"),
  clampGroundTarget:method(()=>this,"clampGroundTarget"),
  clampPos:method(()=>assembly.input.geometry,"clampPos"),
  cleanseActor:method(()=>this,"cleanseActor"),
  clingRelease:method(()=>this,"clingRelease"),
  clipShot:method(()=>assembly.input.geometry,"clipShot"),
  clutchOnDeath:method(()=>this,"clutchOnDeath"),
  combatDeeds:field(()=>this.campaignOwner,"combatDeeds"),
  comboCursorOf:method(()=>this,"comboCursorOf"),
  comboStepOf:method(()=>this,"comboStepOf"),
  companionBonds:field(()=>progression,"companionBonds"),
  companionBondsOfSkill:method(()=>this,"companionBondsOfSkill"),
  companionCapOf:method(()=>progression,"companionCapOf"),
  companionsOfSkill:method(()=>this,"companionsOfSkill"),
  conjurationLifeline:method(()=>this,"conjurationLifeline"),
  conjureCloud:method(()=>this,"conjureCloud"),
  conjureGrantsFor:method(()=>this,"conjureGrantsFor"),
  consumeAmmunition:method(()=>this,"consumeAmmunition"),
  consumeChargeCost:method(()=>this,"consumeChargeCost"),
  consumeRemnants:method(()=>this,"consumeRemnants"),
  consumeStealth:method(()=>this,"consumeStealth"),
  corpses:{get:()=>this.#operation.captureRecordStorage("corpses",this.runtimeState.corpses),set:value=>{this.#operation.checkRecordStorage("corpses",value);this.runtimeState.corpses=value;this.#operation.captureRecordStorage("corpses",value);}},
  corpseSpawn:method(()=>this,"corpseSpawn"),
  createMonster:{get:()=>this.#operation.createMonster},
  creditFloat:method(()=>this,"creditFloat"),
  creep:field(()=>assembly.input.geometry,"creep"),
  creepEnsure:method(()=>this,"creepEnsure"),
  creepers:field(()=>this.runtimeState,"creepers"),
  critMendMult:method(()=>this,"critMendMult"),
  cycleCompanionStance:method(()=>this,"cycleCompanionStance"),
  deactivateAura:method(()=>progression,"deactivateAura"),
  deathBursts:{get:()=>this.#operation.captureRecordStorage("deathBursts",this.killAftermath.input.state.deathBursts),set:value=>{this.#operation.checkRecordStorage("deathBursts",value);this.killAftermath.input.state.deathBursts=value;this.#operation.captureRecordStorage("deathBursts",value);}},
  deedEnemy:method(()=>this.campaignOwner,"deedEnemy"),
  deedOwned:method(()=>this.campaignOwner,"deedOwned"),
  detonateFissureSegment:method(()=>this,"detonateFissureSegment"),
  dismissExclusiveSummons:method(()=>this,"dismissExclusiveSummons"),
  dismissSummonToggle:method(()=>progression,"dismissSummonToggle"),
  dissolveBreak:method(()=>this,"dissolveBreak"),
  dissolveCracks:field(()=>this.runtimeState,"dissolveCracks"),
  dissolveOverride:field(()=>this.runtimeState,"dissolveOverride"),
  dissolves:field(()=>this.runtimeState,"dissolves"),
  domainSeq:field(()=>this.runtimeState,"domainSeq"),
  doodads:field(()=>assembly.input.geometry,"doodads"),
  doodadsAt:method(()=>assembly.input.geometry,"doodadsAt"),
  doodadsNear:method(()=>assembly.input.geometry,"doodadsNear"),
  dotAccum:field(()=>this.runtimeState,"dotAccum"),
  dropEssenceAt:method(()=>assembly.lootController,"dropEssenceAt"),
  dropGemAt:method(()=>assembly.lootController,"dropGemAt"),
  dropLingerField:method(()=>this,"dropLingerField"),
  dropRuleOf:field(()=>campaign,"dropRuleOf"),
  drops:field(()=>assembly.input.physical.input.state,"drops"),
  echoToClones:method(()=>this,"echoToClones"),
  emergeBody:method(()=>progression,"emergeBody"),
  encounters:field(()=>assembly.transition,"encounters"),
  endCarom:method(()=>this,"endCarom"),
  enemiesOf:method(()=>assembly.input.population,"enemiesOf"),
  enterReturn:method(()=>this,"enterReturn"),
  evaporating:field(()=>assembly.input.geometry,"evaporating"),
  executeProc:method(()=>this,"executeProc"),
  executeSkill:method(()=>this,"executeSkill"),
  expireZone:method(()=>progression,"expireZone"),
  explodeActor:method(()=>this,"explodeActor"),
  explodeProjectile:method(()=>this,"explodeProjectile"),
  failNote:method(()=>quests,"failNote"),
  feedEncounters:method(()=>this.campaignOwner,"feedEncounters"),
  findFreeSpot:method(()=>assembly.input.geometry,"findFreeSpot"),
  fireProcRiders:method(()=>this,"fireProcRiders"),
  flashes:field(()=>assembly.input.geometry,"flashes"),
  flightScratch:field(()=>this.runtimeState,"flightScratch"),
  forkProjectile:method(()=>this,"forkProjectile"),
  forwardSummonSockets:method(()=>this,"forwardSummonSockets"),
  frontSplash:method(()=>this,"frontSplash"),
  grabRelease:method(()=>this,"grabRelease"),
  grabThrowRelease:method(()=>this,"grabThrowRelease"),
  grantAbsorb:method(()=>this,"grantAbsorb"),
  grantTreeBuff:method(()=>this,"grantTreeBuff"),
  grantXp:method(()=>assembly.objectiveController,"grantXp"),
  groundAt:method(()=>assembly.input.geometry,"groundAt"),
  grounds:field(()=>assembly.input.geometry,"grounds"),
  guardArts:field(()=>progression,"guardArts"),
  guardBash:method(()=>this,"guardBash"),
  guardianFor:method(()=>this,"guardianFor"),
  guardians:field(()=>this.runtimeState,"guardians"),
  guidePointOf:method(()=>this,"guidePointOf"),
  hatchPod:method(()=>this,"hatchPod"),
  healAlliesInArea:method(()=>this,"healAlliesInArea"),
  heldSkillInst:method(()=>this,"heldSkillInst"),
  hivecallCap:method(()=>this,"hivecallCap"),
  hivecallDeath:method(()=>this,"hivecallDeath"),
  hivecallMeta:method(()=>this,"hivecallMeta"),
  hivecallPayload:method(()=>this,"hivecallPayload"),
  hivecallRoster:method(()=>this,"hivecallRoster"),
  hivecallTransform:method(()=>this,"hivecallTransform"),
  hostileTo:method(()=>assembly.input.population,"hostileTo"),
  hoverSlotPos:method(()=>this,"hoverSlotPos"),
  inheritedFlight:method(()=>progression,"inheritedFlight"),
  interceptProjectileDomes:method(()=>this,"interceptProjectileDomes"),
  isBurstTarget:method(()=>this,"isBurstTarget"),
  kill:method(()=>this,"kill"),
  killCtx:method(()=>this,"killCtx"),
  kills:field(()=>campaign,"kills"),
  kinkProjectile:method(()=>this,"kinkProjectile"),
  knockFixtures:method(()=>this,"knockFixtures"),
  lastCombatAt:field(()=>this.runtimeState,"lastCombatAt"),
  lastPlayerKiller:field(()=>this.campaignOwner.shared,"lastPlayerKiller"),
  layFissure:method(()=>this,"layFissure"),
  ledger:field(()=>campaign,"ledger"),
  levitating:method(()=>this,"levitating"),
  lightningFlashes:field(()=>this.runtimeState,"lightningFlashes"),
  lineOfFire:method(()=>assembly.input.geometry,"lineOfFire"),
  lineOfSight:method(()=>assembly.input.geometry,"lineOfSight"),
  lite:field(()=>progression,"lite"),
  liteCarve:method(()=>this,"liteCarve"),
  liteKills:field(()=>assembly.input.ecology.input.state,"liteKills"),
  liteKindOf:method(()=>assembly.input.ecology,"liteKindOf"),
  liteKinds:field(()=>assembly.input.ecology.input.state,"liteKinds"),
  liteMaxR:field(()=>assembly.input.ecology.input.state,"liteMaxR"),
  liteNoteDeath:method(()=>this,"liteNoteDeath"),
  liteOpenAt:method(()=>assembly.input.ecology,"liteOpenAt"),
  liteOrders:field(()=>assembly.input.ecology.input.state,"liteOrders"),
  litePocketDisturb:method(()=>this,"litePocketDisturb"),
  litePockets:field(()=>assembly.input.ecology.input.state,"litePockets"),
  litePourAt:method(()=>this,"litePourAt"),
  liteProjectileSweep:method(()=>this,"liteProjectileSweep"),
  litePromoteNearest:method(()=>this,"litePromoteNearest"),
  liteVec:field(()=>this.runtimeState,"liteVec"),
  liteXpAcc:field(()=>assembly.input.ecology.input.state,"liteXpAcc"),
  localSeat:field(()=>campaign,"localSeat"),
  lootLevelAt:method(()=>assembly.lootController,"lootLevelAt"),
  lowLifeHitFlash:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"lowLifeHitFlash"),
  maddenBankOf:method(()=>this,"maddenBankOf"),
  markDoodadsChanged:method(()=>assembly.input.geometry,"markDoodadsChanged"),
  markMetaDirty:method(()=>this,"markMetaDirty"),
  markSeatActed:method(()=>this,"markSeatActed"),
  massNativeBrittles:field(()=>this.runtimeState,"massNativeBrittles"),
  massRuntime:{get:()=>readNativeRetainedMassRuntime(this.input.characterWriter,assembly.input.geometry)},
  metaProgressionActive:method(()=>assembly.objectiveController,"metaProgressionActive"),
  minionAreaAvoidanceOf:method(()=>this,"minionAreaAvoidanceOf"),
  minionServes:method(()=>this,"minionServes"),
  minionsOf:method(()=>this,"minionsOf"),
  minionsOfGroup:method(()=>this,"minionsOfGroup"),
  minionsOfSkill:method(()=>progression,"minionsOfSkill"),
  mintAftermath:method(()=>this,"mintAftermath"),
  mintHazardCloud:method(()=>this,"mintHazardCloud"),
  mintLootResult:method(()=>assembly.lootController,"mintLootResult"),
  mintMetaInstance:method(()=>this,"mintMetaInstance"),
  mintThrongBody:method(()=>this,"mintThrongBody"),
  mintThrongFind:method(()=>this,"mintThrongFind"),
  mintThrongHusk:method(()=>assembly.input.ecology,"mintThrongHusk"),
  mintTrailPatch:method(()=>this,"mintTrailPatch"),
  mirageSource:method(()=>this,"mirageSource"),
  moveBlast:method(()=>this,"moveBlast"),
  movementFlashes:field(()=>this.runtimeState,"movementFlashes"),
  movementMoment:method(()=>this,"movementMoment"),
  nativeGridAt:method(()=>assembly.input.geometry,"nativeGridAt"),
  nearestProjTarget:method(()=>this,"nearestProjTarget"),
  nearestSeatPos:method(()=>this,"nearestSeatPos"),
  noiseAt:method(()=>this,"noiseAt"),
  noteLightningTravel:method(()=>this,"noteLightningTravel"),
  noteNemesisKill:method(()=>this.campaignOwner,"noteNemesisKill"),
  noteSeatKill:method(()=>this.campaignOwner,"noteSeatKill"),
  noteSlain:method(()=>this.campaignOwner,"noteSlain"),
  notice:method(()=>assembly.input.geometry,"notice"),
  occDisturbs:field(()=>assembly.input.occurrences.input.state,"occDisturbs"),
  occs:field(()=>assembly.input.occurrences,"occs"),
  odyssey:{get:()=>this.odyssey},
  onPartBroken:method(()=>this,"onPartBroken"),
  onSquadDeath:method(()=>this.campaignOwner,"onSquadDeath"),
  openHollow:method(()=>assembly.input.openings,"openHollow"),
  orbs:field(()=>assembly.lootController.input.state,"orbs"),
  ownSpoils:method(()=>assembly.lootController,"ownSpoils"),
  parryDamageWindow:field(()=>this.runtimeState,"parryDamageWindow"),
  partyRows:field(()=>this.campaignOwner.shared,"partyRows"),
  paySkillCost:method(()=>this,"paySkillCost"),
  pendingAmbushes:{get:()=>this.#operation.captureRecordStorage("pendingAmbushes",this.runtimeState.pendingAmbushes),set:value=>{this.#operation.checkRecordStorage("pendingAmbushes",value);this.runtimeState.pendingAmbushes=value;this.#operation.captureRecordStorage("pendingAmbushes",value);}},
  pendingBlinks:{get:()=>this.#operation.captureRecordStorage("pendingBlinks",progression.input.state.pendingBlinks),set:value=>{this.#operation.checkRecordStorage("pendingBlinks",value);progression.input.state.pendingBlinks=value;this.#operation.captureRecordStorage("pendingBlinks",value);}},
  pendingBursts:{get:()=>this.#operation.captureRecordStorage("pendingBursts",this.runtimeState.pendingBursts),set:value=>{this.#operation.checkRecordStorage("pendingBursts",value);this.runtimeState.pendingBursts=value;this.#operation.captureRecordStorage("pendingBursts",value);}},
  pendingContagions:{get:()=>this.#operation.captureRecordStorage("pendingContagions",this.runtimeState.pendingContagions),set:value=>{this.#operation.checkRecordStorage("pendingContagions",value);this.runtimeState.pendingContagions=value;this.#operation.captureRecordStorage("pendingContagions",value);}},
  pendingDetonations:{get:()=>this.#operation.captureRecordStorage("pendingDetonations",this.runtimeState.pendingDetonations),set:value=>{this.#operation.checkRecordStorage("pendingDetonations",value);this.runtimeState.pendingDetonations=value;this.#operation.captureRecordStorage("pendingDetonations",value);}},
  pendingFollowUps:{get:()=>this.#operation.captureRecordStorage("pendingFollowUps",progression.input.state.pendingFollowUps),set:value=>{this.#operation.checkRecordStorage("pendingFollowUps",value);progression.input.state.pendingFollowUps=value;this.#operation.captureRecordStorage("pendingFollowUps",value);}},
  pendingFuses:{get:()=>this.#operation.captureRecordStorage("pendingFuses",progression.input.state.pendingFuses),set:value=>{this.#operation.checkRecordStorage("pendingFuses",value);progression.input.state.pendingFuses=value;this.#operation.captureRecordStorage("pendingFuses",value);}},
  pendingPersists:{get:()=>this.#operation.captureRecordStorage("pendingPersists",this.runtimeState.pendingPersists),set:value=>{this.#operation.checkRecordStorage("pendingPersists",value);this.runtimeState.pendingPersists=value;this.#operation.captureRecordStorage("pendingPersists",value);}},
  pendingRepeats:{get:()=>this.#operation.captureRecordStorage("pendingRepeats",progression.input.state.pendingRepeats),set:value=>{this.#operation.checkRecordStorage("pendingRepeats",value);progression.input.state.pendingRepeats=value;this.#operation.captureRecordStorage("pendingRepeats",value);}},
  pendingRespawn:field(()=>this.campaignOwner.shared,"pendingRespawn"),
  pendingRespawns:{get:()=>this.#operation.captureRecordStorage("pendingRespawns",progression.input.state.pendingRespawns),set:value=>{this.#operation.checkRecordStorage("pendingRespawns",value);progression.input.state.pendingRespawns=value;this.#operation.captureRecordStorage("pendingRespawns",value);}},
  pendingSalvos:{get:()=>this.#operation.captureRecordStorage("pendingSalvos",progression.input.state.pendingSalvos),set:value=>{this.#operation.checkRecordStorage("pendingSalvos",value);progression.input.state.pendingSalvos=value;this.#operation.captureRecordStorage("pendingSalvos",value);}},
  pendingSteps:{get:()=>this.#operation.captureRecordStorage("pendingSteps",progression.input.state.pendingSteps),set:value=>{this.#operation.checkRecordStorage("pendingSteps",value);progression.input.state.pendingSteps=value;this.#operation.captureRecordStorage("pendingSteps",value);}},
  pendingSummons:{get:()=>this.#operation.captureRecordStorage("pendingSummons",progression.input.state.pendingSummons),set:value=>{this.#operation.checkRecordStorage("pendingSummons",value);progression.input.state.pendingSummons=value;this.#operation.captureRecordStorage("pendingSummons",value);}},
  pitPolicyFor:method(()=>this,"pitPolicyFor"),
  plantImpactDress:method(()=>this,"plantImpactDress"),
  plantKindle:method(()=>this,"plantKindle"),
  plantSpiritTotem:method(()=>this,"plantSpiritTotem"),
  plantVent:method(()=>this,"plantVent"),
  player:field(()=>this.scene,"player"),
  pointInSolid:method(()=>assembly.input.geometry,"pointInSolid"),
  popBrittle:method(()=>this,"popBrittle"),
  popBrittleNative:method(()=>this,"popBrittleNative"),
  presenceArrival:method(()=>this,"presenceArrival"),
  presenceMoment:method(()=>this,"presenceMoment"),
  procChance:method(()=>this,"procChance"),
  procDepthAllowed:method(()=>this,"procDepthAllowed"),
  procGates:method(()=>this,"procGates"),
  procReady:method(()=>this,"procReady"),
  projectiles:{get:()=>this.#operation.captureRecordStorage("projectiles",progression.input.state.projectiles),set:value=>{this.#operation.checkRecordStorage("projectiles",value);progression.input.state.projectiles=value;this.#operation.captureRecordStorage("projectiles",value);}},
  projNose:method(()=>this,"projNose"),
  projTouches:method(()=>this,"projTouches"),
  projTouchesBody:method(()=>this,"projTouchesBody"),
  promoteCommandThrong:method(()=>this,"promoteCommandThrong"),
  promoteLite:method(()=>this,"promoteLite"),
  provenanceOf:method(()=>this.campaignOwner,"provenanceOf"),
  pushActor:method(()=>this,"pushActor"),
  puzzles:field(()=>assembly.puzzleController.host,"puzzles"),
  puzzleStruck:method(()=>assembly.puzzleController,"puzzleStruck"),
  puzzleTuned:method(()=>assembly.puzzleController,"puzzleTuned"),
  queueFollowUps:method(()=>this,"queueFollowUps"),
  recallTreeSpears:field(()=>progression.input.state,"recallTreeSpears"),
  recordCast:method(()=>this,"recordCast"),
  recordDeed:method(()=>this.campaignOwner,"recordDeed"),
  recordIndirectDamage:method(()=>this.campaignOwner,"recordIndirectDamage"),
  recordSelfDamage:method(()=>this.campaignOwner,"recordSelfDamage"),
  recoverCompanion:method(()=>progression,"recoverCompanion"),
  reflectParriedProjectile:method(()=>this,"reflectParriedProjectile"),
  refreshGuardBash:method(()=>this,"refreshGuardBash"),
  refreshMagicPacks:method(()=>assembly.input.population,"refreshMagicPacks"),
  refundCooldown:method(()=>this,"refundCooldown"),
  releaseContract:method(()=>progression,"releaseContract"),
  releaseGarrison:method(()=>this,"releaseGarrison"),
  releasePrimedPours:method(()=>this,"releasePrimedPours"),
  releaseStruckSummons:method(()=>this,"releaseStruckSummons"),
  relocationHosts:field(()=>this.castingPreparation.input.state,"relocationHosts"),
  relocationTarget:method(()=>this,"relocationTarget"),
  remnants:{get:()=>this.#operation.captureRecordStorage("remnants",this.killAftermath.input.state.remnants),set:value=>{this.#operation.checkRecordStorage("remnants",value);this.killAftermath.input.state.remnants=value;this.#operation.captureRecordStorage("remnants",value);}},
  removeCorpse:method(()=>this,"removeCorpse"),
  replenishment:field(()=>this.runtimeState,"replenishment"),
  resolveDeathBurst:method(()=>this,"resolveDeathBurst"),
  resolveHit:method(()=>this,"resolveHit"),
  resolveParryDamage:method(()=>this,"resolveParryDamage"),
  resolveTargeting:method(()=>this,"resolveTargeting"),
  resonate:method(()=>this,"resonate"),
  returnTarget:method(()=>this,"returnTarget"),
  reviveCompanion:method(()=>progression,"reviveCompanion"),
  ringAfflictions:method(()=>this,"ringAfflictions"),
  ringBell:method(()=>this,"ringBell"),
  rollDrops:method(()=>this.campaignOwner,"rollDrops"),
  rollKillOrbs:method(()=>this,"rollKillOrbs"),
  rollKillRemnants:method(()=>this,"rollKillRemnants"),
  rollOwnProcs:method(()=>this,"rollOwnProcs"),
  rollStatusProcs:method(()=>this,"rollStatusProcs"),
  rollSummonType:method(()=>this,"rollSummonType"),
  rollSurfaceProcs:method(()=>this,"rollSurfaceProcs"),
  rollTopMet:method(()=>this,"rollTopMet"),
  rollTriggers:method(()=>this,"rollTriggers"),
  roofedStructureAt:method(()=>assembly.input.geometry,"roofedStructureAt"),
  rouseOnWound:method(()=>this,"rouseOnWound"),
  ruptureBank:method(()=>this,"ruptureBank"),
  ruptureStatus:method(()=>this,"ruptureStatus"),
  sanctuaryBlocksCombat:method(()=>this,"sanctuaryBlocksCombat"),
  satellites:field(()=>this.runtimeState,"satellites"),
  scrambleLatch:field(()=>this.runtimeState,"scrambleLatch"),
  seatHudOf:method(()=>this,"seatHudOf"),
  seatOf:method(()=>assembly.input.geometry,"seatOf"),
  seatOfRoot:method(()=>this,"seatOfRoot"),
  seats:field(()=>campaign,"seats"),
  seatText:method(()=>this,"seatText"),
  setDoorState:method(()=>assembly.input.geometry,"setDoorState"),
  setLure:method(()=>watching,"setLure"),
  shake:field(()=>assembly.input.geometry,"shake"),
  shedFlightShrapnel:method(()=>this,"shedFlightShrapnel"),
  shedOrb:method(()=>assembly.lootController,"shedOrb"),
  shotElev:method(()=>assembly.input.geometry,"shotElev"),
  showCombatOutcome:method(()=>this,"showCombatOutcome"),
  showCompanionCue:method(()=>progression,"showCompanionCue"),
  showRecoveryCue:method(()=>progression,"showRecoveryCue"),
  showSelfRelease:method(()=>this,"showSelfRelease"),
  showSkillArrival:method(()=>this,"showSkillArrival"),
  sim:field(()=>assembly.input.registry.input.birth.host,"sim"),
  simView:method(()=>assembly.input.coast,"simView"),
  skillOcclusion:method(()=>this,"skillOcclusion"),
  sparkSeq:field(()=>this.runtimeState,"sparkSeq"),
  spawnAftershocks:method(()=>this,"spawnAftershocks"),
  spawnConstruct:method(()=>this,"spawnConstruct"),
  spawnDeathBurst:method(()=>this,"spawnDeathBurst"),
  spawnEchoRiders:method(()=>this,"spawnEchoRiders"),
  spawnLightwell:method(()=>this,"spawnLightwell"),
  spawnMinion:method(()=>this,"spawnMinion"),
  spawnProjectile:method(()=>this,"spawnProjectile"),
  spoilsSealed:method(()=>assembly.lootController,"spoilsSealed"),
  spoilStory:field(()=>assembly.lootController.input.state,"spoilStory"),
  spoilStoryAt:method(()=>this,"spoilStoryAt"),
  springAmbush:method(()=>this,"springAmbush"),
  stampSkillCooldown:method(()=>progression,"stampSkillCooldown"),
  stampSpoils:method(()=>this,"stampSpoils"),
  startRestoreStream:method(()=>this,"startRestoreStream"),
  statTrailSpec:method(()=>this,"statTrailSpec"),
  strikeReleaseBodies:field(()=>this.runtimeState,"strikeReleaseBodies"),
  strikeSurfaces:method(()=>this,"strikeSurfaces"),
  strikeZoneSurfaces:method(()=>this,"strikeZoneSurfaces"),
  surfaceScratch:field(()=>this.runtimeState,"surfaceScratch"),
  sweepDefenseEvents:method(()=>this,"sweepDefenseEvents"),
  syncHivecallFormDamage:method(()=>this,"syncHivecallFormDamage"),
  tameCompanion:method(()=>this,"tameCompanion"),
  tapCharges:method(()=>this,"tapCharges"),
  teleportActor:method(()=>this,"teleportActor"),
  tempGrounds:field(()=>assembly.input.geometry,"tempGrounds"),
  text:method(()=>assembly.input.geometry,"text"),
  throngBodiesOf:method(()=>this,"throngBodiesOf"),
  throngCapOf:method(()=>this,"throngCapOf"),
  throngDirect:method(()=>this,"throngDirect"),
  throngEvolutionBites:field(()=>this.runtimeState,"throngEvolutionBites"),
  throngEvolutionBurst:method(()=>this,"throngEvolutionBurst"),
  throngEvolutionHit:method(()=>this,"throngEvolutionHit"),
  throngGain:method(()=>this,"throngGain"),
  throngKeepMinimum:method(()=>this,"throngKeepMinimum"),
  throngLastKill:field(()=>this.runtimeState,"throngLastKill"),
  throngOnHit:method(()=>this,"throngOnHit"),
  throngOnKill:method(()=>this,"throngOnKill"),
  throngRecruitCap:method(()=>this,"throngRecruitCap"),
  throngRosterCount:method(()=>this,"throngRosterCount"),
  throngSources:method(()=>assembly.input.ecology,"throngSources"),
  throngStandNear:method(()=>this,"throngStandNear"),
  throngYieldCount:method(()=>this,"throngYieldCount"),
  tickChannelSupports:method(()=>this,"tickChannelSupports"),
  tierViews:field(()=>assembly.input.geometry,"tierViews"),
  time:field(()=>campaign,"time"),
  timeflow:field(()=>campaign,"timeflow"),
  transplantStatus:method(()=>this,"transplantStatus"),
  traversal:field(()=>this.campaignOwner.shared,"traversal"),
  treeBuffSources:field(()=>progression.input.state,"treeBuffSources"),
  triggerAmbush:method(()=>this,"triggerAmbush"),
  triggerEligible:method(()=>this,"triggerEligible"),
  tryGuardBlock:method(()=>this,"tryGuardBlock"),
  tryShellBlock:method(()=>this,"tryShellBlock"),
  tryShellPool:method(()=>this,"tryShellPool"),
  tryTame:method(()=>this,"tryTame"),
  ultimateFlash:method(()=>this,"ultimateFlash"),
  underRoofAt:method(()=>this,"underRoofAt"),
  updateZoneDomain:method(()=>this,"updateZoneDomain"),
  useSkill:method(()=>this,"useSkill"),
  victimGate:method(()=>this,"victimGate"),
  viewFrame:field(()=>this.runtimeState,"viewFrame"),
  viewFrameAt:field(()=>this.runtimeState,"viewFrameAt"),
  viewRectFor:method(()=>this,"viewRectFor"),
  walk:field(()=>assembly.input.geometry,"walk"),
  waypointPos:field(()=>assembly.input.geometry,"waypointPos"),
  weightedPick:method(()=>this,"weightedPick"),
  withMassReward:method(()=>this,"withMassReward"),
  withQuestHand:method(()=>quests,"withQuestHand"),
  worldKillRules:field(()=>this.campaignOwner,"worldKillRules"),
  zone:field(()=>this.scene,"zone"),
  zoneHas:method(()=>this,"zoneHas"),
  zones:{get:()=>this.#operation.captureRecordStorage("zones",progression.input.state.zones),set:value=>{this.#operation.checkRecordStorage("zones",value);progression.input.state.zones=value;this.#operation.captureRecordStorage("zones",value);}},
  zoneSees:method(()=>this,"zoneSees"),
  zoneVictims:method(()=>this,"zoneVictims"),
  admitCombatBirth:method(()=>this.#operation,"admitCombatBirth"),
  constructCombatActor:method(()=>this.#operation,"constructCombatActor"),
  withCombatStatusSource:method(()=>this.#operation,"withCombatStatusSource"),
  withCombatInheritedStatus:method(()=>this.#operation,"withCombatInheritedStatus"),
  selectCombatStatusSource:method(()=>this.#operation,"selectCombatStatusSource"),
  issueCombatRecord:method(()=>this.#operation,"issueCombatRecord"),
  prepareCombatRecord:method(()=>this.#operation,"prepareCombatRecord"),
  issuePreparedCombatRecord:method(()=>this.#operation,"issuePreparedCombatRecord"),
  retireCombatBody:method(()=>this.#operation,"retireCombatBody"),
  castMoveFactor:method(()=>this.displacement,"castMoveFactor"),
  channelMobility:method(()=>this.displacement,"channelMobility"),
  cScratch:field(()=>this.runtimeState.motion,"cScratch"),
  devNoclip:field(()=>this.input.characterWriter,"devNoclip"),
  geyserMode:field(()=>this.runtimeState.motion,"geyserMode"),
  geysers:field(()=>assembly.input.environment.input.state,"geysers"),
  movementLocked:method(()=>this.displacement,"movementLocked"),
  ownWalk:field(()=>this.runtimeState.motion,"ownWalk"),
  sailing:field(()=>this,"sailing"),
  skyFront:method(()=>assembly.sky,"skyFront"),
  snowCover:field(()=>assembly.input.geometry,"snowCover"),
  tierCrossings:field(()=>assembly.input.geometry,"tierCrossings"),
  tracks:field(()=>assembly.input.geometry,"tracks"),
  voyage:field(()=>assembly.transition,"voyage"),
  windCache:field(()=>this.runtimeState.motion,"windCache"),
  survivalDrainRate:method(()=>this,"survivalDrainRate"),
  despawnPartsOf:method(()=>this,"despawnPartsOf"),
  markSeatMoved:method(()=>this,"markSeatMoved"),
  steppedClamp:method(()=>this,"steppedClamp"),
  resolveBoundary:method(()=>this,"resolveBoundary"),
  windAt:method(()=>this,"windAt"),
  zoneWind:method(()=>this,"zoneWind"),
  snowCoverAt:method(()=>this,"snowCoverAt"),
  voyageShip:method(()=>this,"voyageShip"),
  combatEventCallback:method(()=>this.#operation,"combatEventCallback"),
  createCombatKillContext:method(()=>this.#operation,"createCombatKillContext"),
  assignCombatBirthOwner:method(()=>this.#operation,"assignCombatBirthOwner"),
  withCombatRecord:method(()=>this.#operation,"withCombatRecord"),
  reassignCombatRecordSource:method(()=>this.#operation,"reassignCombatRecordSource"),
  beginCombatRecord:method(()=>this.#operation,"beginCombatRecord"),
  endCombatRecord:method(()=>this.#operation,"endCombatRecord"),
  arenaWash:field(()=>assembly.input.geometry,"arenaWash"),
  claimGarrisonSlot:method(()=>this.combatArena,"claimGarrisonSlot"),
  conjured:field(()=>assembly.input.geometry,"conjured"),
  crackArena:method(()=>this.combatArena,"crackArena"),
  flux:field(()=>assembly.input.geometry,"flux"),
  fog:field(()=>assembly.input.geometry,"fog"),
  mountFreeSeat:method(()=>this,"mountFreeSeat"),
  mountSeatRider:method(()=>this,"mountSeatRider"),
  mountUnlink:method(()=>this,"mountUnlink"),
  onBrainPhaseEnter:method(()=>this.combatArena,"onBrainPhaseEnter"),
  promoteMonster:method(()=>assembly.input.population,"promoteRarityStacked"),
  restoreArena:method(()=>this.combatArena,"restoreArena"),
  shrinkArenaPockets:method(()=>this.combatArena,"shrinkArenaPockets"),
  sinkArena:method(()=>this.combatArena,"sinkArena"),
  spawnSummonOffspring:method(()=>this.combatArena,"spawnSummonOffspring"),
  castReqRefusal:method(()=>this,"castReqRefusal"),
  grabHandoff:method(()=>this,"grabHandoff"),
  grabSeize:method(()=>this,"grabSeize"),
  possessSeize:method(()=>this,"possessSeize"),
  shapeshiftPress:method(()=>this,"shapeshiftPress"),
  openTownPortal:method(()=>this,"openTownPortal"),
  seatEject:method(()=>this,"seatEject"),
  onPlayerDown:method(()=>this,"onPlayerDown"),
  routePitFall:method(()=>this,"routePitFall"),
  routeSkyFalls:method(()=>this,"routeSkyFalls"),
  startBurrow:method(()=>this.combatArena,"startBurrow"),
  opaqueAt:method(()=>assembly.input.geometry,"opaqueAt"),
  actorGrid:field(()=>this.runtimeState,"actorGrid"),
  actorGridBuiltFor:field(()=>this.runtimeState,"actorGridBuiltFor"),
  actorGridBuiltRev:field(()=>this.runtimeState,"actorGridBuiltRev"),
  actorGridRev:field(()=>this.runtimeState,"actorGridRev"),
  companionStanceOf:method(()=>this,"companionStanceOf"),
  currentZoneSeed:field(()=>assembly.input.geometry,"currentZoneSeed"),
  eyecatch:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"eyecatch"),
  fogEnsure:method(()=>assembly.input.registry.input.birth,"fogEnsure"),
  hazardCaster:{get:()=>observeNativeSource(this.#host,assembly.puzzleController.host.hazardCaster),set:value=>{assembly.puzzleController.host.hazardCaster=value;}},
  holdfastGuardian:method(()=>this,"holdfastGuardian"),
  holdfastRouseRule:method(()=>this,"holdfastRouseRule"),
  holdfastSite:field(()=>assembly.input.registry.input.birth.host,"holdfastSite"),
  installCreepFront:method(()=>assembly.input.geometry,"installCreepFront"),
  massOccurrenceDecorSources:field(()=>this.runtimeState,"massOccurrenceDecorSources"),
  massOccurrencePitContext:method(()=>this,"massOccurrencePitContext"),
  massRewardLevel:field(()=>this.campaignOwner.shared,"massRewardLevel"),
  metaDirty:field(()=>this.campaignOwner.shared,"metaDirty"),
  pathField:method(()=>assembly.input.geometry,"pathField"),
  presencePulseAt:field(()=>this.runtimeState,"presencePulseAt"),
  resonanceRang:field(()=>this.runtimeState,"resonanceRang"),
  rouseRules:field(()=>this.campaignOwner,"rouseRules"),
  seatByActor:field(()=>this.campaignOwner.shared,"seatByActor"),
  seatHero:method(()=>campaign,"seatHero"),
  seatHud:field(()=>this.campaignOwner.shared,"seatHud"),
  setCompanionStance:method(()=>this,"setCompanionStance"),
  structures:field(()=>assembly.input.geometry,"structures"),
  ultFlashAt:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"ultFlashAt"),
  ultFlashLastAt:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"ultFlashLastAt"),
  wellSeq:field(()=>assembly.input.ecology.input.state,"wellSeq"),

  syncZoneExits:this.native(localControllers.sceneSyncZoneExits),
  updateOccurrences:this.native(localControllers.sceneUpdateOccurrences),
  updateEncounters:this.native((host,dt:number)=>{if(this.encounterArrival.canUpdateFrame())localControllers.sceneUpdateEncounters(host,dt);else{host.updateExtractionDepartures(dt);host.updateBoroughRefugees(dt);}}),
  updateHunt:this.native(localControllers.sceneUpdateHunt),
  updateFractures:this.native(localControllers.sceneUpdateFractures),
  updateBoss:this.native(localControllers.sceneUpdateBoss),
  updateRitualSite:this.native(localControllers.sceneUpdateRitualSite),
  updateHoldfastSite:this.native(localControllers.sceneUpdateHoldfastSite),
  updateIncursionEvents:this.native(localControllers.sceneUpdateIncursionEvents),
  updateRampage:this.native(localControllers.sceneUpdateRampage),
  updateDoodadEffects:this.native(localControllers.sceneUpdateDoodadEffects),
  updateArenaCrowd:this.native(localControllers.sceneUpdateArenaCrowd),
  updateAttunements:this.native(localControllers.sceneUpdateAttunements),
  updateTerraforms:this.native(localControllers.sceneUpdateTerraforms),
  updateTheater:this.native(localControllers.sceneUpdateTheater),
  updateRepeats:this.native(localControllers.sceneUpdateRepeats),
  updateAmbushes:this.native(localControllers.sceneUpdateAmbushes),
  updatePendingMetas:this.native(localControllers.sceneUpdatePendingMetas),
  updatePendingPersists:this.native(localControllers.sceneUpdatePendingPersists),
  updateMinionMeta:this.native(localControllers.sceneUpdateMinionMeta),
  updateThrongEvolution:this.native(localControllers.sceneUpdateThrongEvolution),
  updateHivecall:this.native(localControllers.sceneUpdateHivecall),
  updateThrong:this.native(localControllers.sceneUpdateThrong),
  updateLite:this.native(localControllers.sceneUpdateLite),
  separateOverlappingExits:this.native(localControllers.sceneSeparateOverlappingExits),
  updateExtraction:this.native(localControllers.sceneUpdateExtraction),
  updateBorough:this.native(localControllers.sceneUpdateBorough),
  updateVeilCollapse:this.native(localControllers.sceneUpdateVeilCollapse),
  updateVeil:this.native(localControllers.sceneUpdateVeil),
  insideCount:this.native(localControllers.sceneInsideCount),
  spawnInRadius:this.native(localControllers.sceneSpawnInRadius),
  beginCollapse:this.native(localControllers.sceneBeginCollapse),
  closeEncounter:this.native(localControllers.sceneCloseEncounter),
  updateExtractionDepartures:this.native(localControllers.sceneUpdateExtractionDepartures),
  updateBoroughRefugees:this.native(localControllers.sceneUpdateBoroughRefugees),
  pickHuntDest:this.native(localControllers.scenePickHuntDest),
  touchers:this.native(localControllers.sceneTouchers),
  advanceFissure:this.native(localControllers.sceneAdvanceFissure),
  fractureFoeCount:this.native(localControllers.sceneFractureFoeCount),
  spawnFractureFoes:this.native(localControllers.sceneSpawnFractureFoes),
  failFracture:this.native(localControllers.sceneFailFracture),
  sealChasm:this.native(localControllers.sceneSealChasm),
  openHoldfastExit:this.native(localControllers.sceneOpenHoldfastExit),
  rampageCauseOf:this.native(localControllers.sceneRampageCauseOf),
  rampageCrush:this.native(localControllers.sceneRampageCrush),
  rampageBlockedStand:this.native(localControllers.sceneRampageBlockedStand),
  wornThrongAnchored:this.native(localControllers.sceneWornThrongAnchored),
  wornThrongAnchorsOf:this.native(localControllers.sceneWornThrongAnchorsOf),
  minionNeedsFullDurability:this.native(localControllers.sceneMinionNeedsFullDurability),
  claimThrongHusk:this.native(localControllers.sceneClaimThrongHusk),
  throngMoteSpot:this.native(localControllers.sceneThrongMoteSpot),
  driveUntamedThrong:this.native(localControllers.sceneDriveUntamedThrong),
  liteDemoteSweep:this.native(localControllers.sceneLiteDemoteSweep),
  liteRegenSweep:this.native(localControllers.sceneLiteRegenSweep),
  liteSteerAndBite:this.native(localControllers.sceneLiteSteerAndBite),
  liteFlushKills:this.native(localControllers.sceneLiteFlushKills),
  armExtraction:this.native(localControllers.sceneArmExtraction),
  settleExtraction:method(()=>this.encounterArrival,'settleExtraction'),
  extractionSwarmAlive:this.native(localControllers.sceneExtractionSwarmAlive),
  spawnExtractionSwarm:this.native(localControllers.sceneSpawnExtractionSwarm),
  extractTemperOf:this.native(localControllers.sceneExtractTemperOf),
  startBoroughMuster:this.native(localControllers.sceneStartBoroughMuster),
  boroughFolkAlive:this.native(localControllers.sceneBoroughFolkAlive),
  settleBorough:method(()=>this.encounterArrival,'settleBorough'),
  updateBoroughArming:this.native(localControllers.sceneUpdateBoroughArming),
  beginBoroughAssault:this.native(localControllers.sceneBeginBoroughAssault),
  boroughSwarmAlive:this.native(localControllers.sceneBoroughSwarmAlive),
  spawnBoroughWave:this.native(localControllers.sceneSpawnBoroughWave),
  heroWithin:this.native(localControllers.sceneHeroWithin),
  sealVeiled:this.native(localControllers.sceneSealVeiled),
  activateKnot:this.native(localControllers.sceneActivateKnot),
  openChasm:this.native(localControllers.sceneOpenChasm),
  clearFractureRun:this.native(localControllers.sceneClearFractureRun),
  removeFractureChasmDoodad:this.native(localControllers.sceneRemoveFractureChasmDoodad),
  divertOrEndFracture:this.native(localControllers.sceneDivertOrEndFracture),
  litePocketBirth:this.native(localControllers.sceneLitePocketBirth),
  litePocketExtinct:this.native(localControllers.sceneLitePocketExtinct),
  litePocketRecede:this.native(localControllers.sceneLitePocketRecede),
  liteBiteVictim:this.native(localControllers.sceneLiteBiteVictim),
  payExtraction:this.native(localControllers.scenePayExtraction),
  disperseSwarmBodies:this.native(localControllers.sceneDisperseSwarmBodies),
  extractionEntryPoint:this.native(localControllers.sceneExtractionEntryPoint),
  nearestExitPos:this.native(localControllers.sceneNearestExitPos),
  swarmEntryPoint:this.native(localControllers.sceneSwarmEntryPoint),
  pickRovingDest:this.native(localControllers.scenePickRovingDest),
  openFractureRift:this.native(localControllers.sceneOpenFractureRift),
  litePooledHit:this.native(localControllers.sceneLitePooledHit),
  syncPocketGrants:this.native(actorTick.sceneSyncPocketGrants),
  updateGrantedTrails:this.native(actorTick.sceneUpdateGrantedTrails),
  applyDeedDot:this.native(actorTick.sceneApplyDeedDot),
  sweepTalentEvents:this.native(actorTick.sceneSweepTalentEvents),
  rollGainProcs:this.native(actorTick.sceneRollGainProcs),
  echoSympathy:this.native(actorTick.sceneEchoSympathy),
  stepBurrow:this.native(actorTick.sceneStepBurrow),
  updateActorLedgers:this.native(actorTick.sceneUpdateActorLedgers),
  noteMovementTravel:this.native(actorTick.sceneNoteMovementTravel),
  sweepBodySlam:this.native(actorTick.sceneSweepBodySlam),
  rollCollisionProcs:this.native(actorTick.sceneRollCollisionProcs),
  resolveImpactHit:this.native(actorTick.sceneResolveImpactHit),
  grantedPocketsFor:this.native(actorTick.sceneGrantedPocketsFor),
  insideGrantedPocket:this.native(actorTick.sceneInsideGrantedPocket),
  sympathyPotency:this.native(actorTick.sceneSympathyPotency),
  applySympathyEcho:this.native(actorTick.sceneApplySympathyEcho),
  updateSummonShells:this.native(effectsTick.sceneUpdateSummonShells),
  updateTempGrounds:this.native(effectsTick.sceneUpdateTempGrounds),
  updateEvaporation:this.native(effectsTick.sceneUpdateEvaporation),
  updatePendingBursts:this.native(effectsTick.sceneUpdatePendingBursts),
  updatePendingContagions:this.native(effectsTick.sceneUpdatePendingContagions),
  updateTerrainEffects:this.native(effectsTick.sceneUpdateTerrainEffects),
  updateScorch:this.native(effectsTick.sceneUpdateScorch),
  updateWindchill:this.native(effectsTick.sceneUpdateWindchill),
  updateGaze:this.native(effectsTick.sceneUpdateGaze),
  updateFog:this.native(effectsTick.sceneUpdateFog),
  updateWetSky:this.native(effectsTick.sceneUpdateWetSky),
  updateCreep:this.native(effectsTick.sceneUpdateCreep),
  updateCollapse:this.native(effectsTick.sceneUpdateCollapse),
  updateFlux:this.native(effectsTick.sceneUpdateFlux),
  updateSpans:this.native(effectsTick.sceneUpdateSpans),
  updateTracks:this.native(effectsTick.sceneUpdateTracks),
  updateGeysers:this.native(effectsTick.sceneUpdateGeysers),
  updateVentDwellers:this.native(effectsTick.sceneUpdateVentDwellers),
  updateScaldHeat:this.native(effectsTick.sceneUpdateScaldHeat),
  updateCharRegrowth:this.native(effectsTick.sceneUpdateCharRegrowth),
  updateSoulriver:this.native(effectsTick.sceneUpdateSoulriver),
  updateTrapworks:this.native(effectsTick.sceneUpdateTrapworks),
  updateShrines:this.native(effectsTick.sceneUpdateShrines),
  updateAltars:this.native(effectsTick.sceneUpdateAltars),
  updateChests:this.native(effectsTick.sceneUpdateChests),
  updateLeaps:this.native(effectsTick.sceneUpdateLeaps),
  updateWorms:this.native(effectsTick.sceneUpdateWorms),
  updateParts:this.native(effectsTick.sceneUpdateParts),
  updateCreepHearts:this.native(effectsTick.sceneUpdateCreepHearts),
  updateEnemyTethers:this.native(effectsTick.sceneUpdateEnemyTethers),
  updateTethers:this.native(effectsTick.sceneUpdateTethers),
  updateVents:this.native(effectsTick.sceneUpdateVents),
  updateDischarges:this.native(effectsTick.sceneUpdateDischarges),
  updateConstructs:this.native(effectsTick.sceneUpdateConstructs),
  updateAuras:this.native(effectsTick.sceneUpdateAuras),
  updateStrobes:this.native(effectsTick.sceneUpdateStrobes),
  updateDetonations:this.native(effectsTick.sceneUpdateDetonations),
  updatePendingRespawns:this.native(effectsTick.sceneUpdatePendingRespawns),
  updateSummonContracts:this.native(effectsTick.sceneUpdateSummonContracts),
  updateSummonReforms:this.native(effectsTick.sceneUpdateSummonReforms),
  updateCompanionGrants:this.native(effectsTick.sceneUpdateCompanionGrants),
  updateReplenishment:this.native(effectsTick.sceneUpdateReplenishment),
  updatePendingBlinks:this.native(effectsTick.sceneUpdatePendingBlinks),
  checkMinionDetonations:this.native(effectsTick.sceneCheckMinionDetonations),
  separateActors:this.native(effectsTick.sceneSeparateActors),
  updateSquish:this.native(effectsTick.sceneUpdateSquish),
  updateWindPush:this.native(effectsTick.sceneUpdateWindPush),
  updateBrittle:this.native(effectsTick.sceneUpdateBrittle),
  updateSnow:this.native(effectsTick.sceneUpdateSnow),
  updateWeatherDress:this.native(effectsTick.sceneUpdateWeatherDress),
  updateDrops:this.native(effectsTick.sceneUpdateDrops),
  updateOrbs:this.native(effectsTick.sceneUpdateOrbs),
  updateRemnants:this.native(effectsTick.sceneUpdateRemnants),
  updateCarriers:this.native(effectsTick.sceneUpdateCarriers),
  updateClings:this.native(effectsTick.sceneUpdateClings),
  updateGrabs:this.native(effectsTick.sceneUpdateGrabs),
  updateMounts:this.native(effectsTick.sceneUpdateMounts),
  updatePossessions:this.native(effectsTick.sceneUpdatePossessions),
  updateWatch:this.native(effectsTick.sceneUpdateWatch),
  updateReserves:this.native(effectsTick.sceneUpdateReserves),
  updatePack:this.native(effectsTick.sceneUpdatePack),
  updateTells:this.native(effectsTick.sceneUpdateTells),
  applyCouchConfine:this.native(effectsTick.sceneApplyCouchConfine),
  updateEmergences:this.native(effectsTick.sceneUpdateEmergences),
  veilIndex:this.native(effectsTick.sceneVeilIndex),
  douseSweep:this.native(effectsTick.sceneDouseSweep),
  regenSurvival:this.native(effectsTick.sceneRegenSurvival),
  applyRegionEffects:this.native(effectsTick.sceneApplyRegionEffects),
  isShaded:this.native(effectsTick.sceneIsShaded),
  douseRowAt:this.native(effectsTick.sceneDouseRowAt),
  feedSurvival:this.native(effectsTick.sceneFeedSurvival),
  syncSurvivalBands:this.native(effectsTick.sceneSyncSurvivalBands),
  localZoneAt:this.native(effectsTick.sceneLocalZoneAt),
  shedStatusStack:this.native(effectsTick.sceneShedStatusStack),
  updateCreepRiders:this.native(effectsTick.sceneUpdateCreepRiders),
  groundFallEligible:this.native(effectsTick.sceneGroundFallEligible),
  wakeBodies:this.native(effectsTick.sceneWakeBodies),
  sweepHazardSurface:this.native(effectsTick.sceneSweepHazardSurface),
  geyserBurstFx:this.native(effectsTick.sceneGeyserBurstFx),
  scorchFeed:this.native(effectsTick.sceneScorchFeed),
  updateBask:this.native(effectsTick.sceneUpdateBask),
  scorchOf:this.native(effectsTick.sceneScorchOf),
  springTrapwork:this.native(effectsTick.sceneSpringTrapwork),
  fireStrikeAt:this.native(effectsTick.sceneFireStrikeAt),
  chestObjectiveDone:this.native(effectsTick.sceneChestObjectiveDone),
  openChest:this.native(effectsTick.sceneOpenChest),
  creepPumpBearing:this.native(effectsTick.sceneCreepPumpBearing),
  tetherSees:this.native(effectsTick.sceneTetherSees),
  brittleAccrue:this.native(effectsTick.sceneBrittleAccrue),
  dressSpotOk:this.native(effectsTick.sceneDressSpotOk),
  dropHolder:this.native(effectsTick.sceneDropHolder),
  pickupSeat:this.native(effectsTick.scenePickupSeat),
  grantVestige:this.native(effectsTick.sceneGrantVestige),
  grantAbilityEssence:this.native(effectsTick.sceneGrantAbilityEssence),
  tryMergeMemoryItem:this.native(effectsTick.sceneTryMergeMemoryItem),
  noteMemoryPickup:this.native(effectsTick.sceneNoteMemoryPickup),
  isBankedRelicEcho:this.native(effectsTick.sceneIsBankedRelicEcho),
  pourOrb:this.native(effectsTick.scenePourOrb),
  grabSpitDir:this.native(effectsTick.sceneGrabSpitDir),
  mountPairSpawn:this.native(effectsTick.sceneMountPairSpawn),
  watchScent:this.native(effectsTick.sceneWatchScent),
  openVent:this.native(effectsTick.sceneOpenVent),
  levelAt:this.native(effectsTick.sceneLevelAt),
  inGrantedRefuge:this.native(effectsTick.sceneInGrantedRefuge),
  syncBandSheet:this.native(effectsTick.sceneSyncBandSheet),
  burnRain:this.native(effectsTick.sceneBurnRain),
  pourRunoff:this.native(effectsTick.scenePourRunoff),
  trapHost:this.native(effectsTick.sceneTrapHost),
  chestOpener:this.native(effectsTick.sceneChestOpener),
  tetherOcclusion:this.native(effectsTick.sceneTetherOcclusion),
  refundOnOrb:this.native(effectsTick.sceneRefundOnOrb),
  mountCrewSpawn:this.native(effectsTick.sceneMountCrewSpawn),
  rainScorch:this.native(effectsTick.sceneRainScorch),
  tracksEnsure:this.native(effectsTick.sceneTracksEnsure),
  setTracksArmed:this.native(effectsTick.sceneSetTracksArmed),
  collapseFloor:this.native(effectsTick.sceneCollapseFloor),
  clearDoodadsNear:this.native(effectsTick.sceneClearDoodadsNear),
  effectTentacleSwing:this.native(frameCallbacks.sceneEffectTentacleSwing),
  effectCrystalBeam:this.native(frameCallbacks.sceneEffectCrystalBeam),
  effectLavaOrb:this.native(frameCallbacks.sceneEffectLavaOrb),
  effectHeatWash:this.native(frameCallbacks.sceneEffectHeatWash),
  effectDescentTrap:this.native(frameCallbacks.sceneEffectDescentTrap),
  effectSporePuff:this.native(frameCallbacks.sceneEffectSporePuff),
  effectGrowthLash:this.native(frameCallbacks.sceneEffectGrowthLash),
  effectThicketHeal:this.native(frameCallbacks.sceneEffectThicketHeal),
  effectStatusWash:this.native(frameCallbacks.sceneEffectStatusWash),
  effectMawReel:this.native(frameCallbacks.sceneEffectMawReel),
  effectOrbSpring:this.native(frameCallbacks.sceneEffectOrbSpring),
  eldritchCorruptMonsters:this.native(frameCallbacks.sceneEldritchCorruptMonsters),
  eldritchTentacleField:this.native(frameCallbacks.sceneEldritchTentacleField),
  eldritchMutateDoodads:this.native(frameCallbacks.sceneEldritchMutateDoodads),
  eldritchSpawn:this.native(frameCallbacks.sceneEldritchSpawn),
  nearestInReach:this.native(frameCallbacks.sceneNearestInReach),
  isEffectTarget:this.native(frameCallbacks.sceneIsEffectTarget),
  corruptActor:this.native(frameCallbacks.sceneCorruptActor),
  updateHarvest:this.native(frameServices.sceneUpdateHarvest),
  armBuyerShelves:this.native(frameServices.sceneArmBuyerShelves),
  restockVendor:this.native(frameServices.sceneRestockVendor),
  updateCampfire:this.native(frameServices.sceneUpdateCampfire),
  updateCaravan:this.native(frameServices.sceneUpdateCaravan),
  updateFont:this.native(frameServices.sceneUpdateFont),
  updateHarborBoard:this.native(frameServices.sceneUpdateHarborBoard),
  updateHoldDefense:this.native(frameServices.sceneUpdateHoldDefense),
  updateMireille:this.native(frameServices.sceneUpdateMireille),
  updateMusterHorn:this.native(frameServices.sceneUpdateMusterHorn),
  updateOracle:this.native(frameServices.sceneUpdateOracle),
  updateSalvage:this.native(frameServices.sceneUpdateSalvage),
  updateTraces:this.native(frameServices.sceneUpdateTraces),
  updateTracker:this.native(frameServices.sceneUpdateTracker),
  updateTreePips:this.native(frameServices.sceneUpdateTreePips),
  updateVendors:this.native(frameServices.sceneUpdateVendors),
  updateAmalgamation:this.native(frameServices.sceneUpdateAmalgamation),
  updateDescent:this.native(frameServices.sceneUpdateDescent),
  updateDownedCompanions:this.native(frameServices.sceneUpdateDownedCompanions),
  updateDownedSeats:this.native(frameServices.sceneUpdateDownedSeats),
  updateGloaming:this.native(frameServices.sceneUpdateGloaming),
  updateLightwells:this.native(frameServices.sceneUpdateLightwells),
  updateMercOutpost:this.native(frameServices.sceneUpdateMercOutpost),
  updatePlayerCorpses:this.native(frameServices.sceneUpdatePlayerCorpses),
  updateVocationSites:this.native(frameServices.sceneUpdateVocationSites),
  updateContagionInfection:this.native(frameServices.sceneUpdateContagionInfection),
  updateWarbandMarches:this.native(frameServices.sceneUpdateWarbandMarches),
  harvestSettle:this.native(frameServices.sceneHarvestSettle),
  pressingFoeNear:this.native(frameServices.scenePressingFoeNear),
  harvestArm:this.native(frameServices.sceneHarvestArm),
  restockOrdinal:this.native(frameServices.sceneRestockOrdinal),
  withBuyer:{get:()=> <T>(seat:Parameters<World['withBuyer']>[0],fn:()=>T):T=>{this.#operation.assertActiveScope();return frameServices.sceneWithBuyer(this.#host,seat,fn);}},
  syncHoldIdx:this.native(frameServices.sceneSyncHoldIdx),
  armVendorStock:this.native(frameServices.sceneArmVendorStock),
  restockSeconds:this.native(frameServices.sceneRestockSeconds),
  nearBountyBoard:this.native(frameServices.sceneNearBountyBoard),
  watchBountyHands:this.native(frameServices.sceneWatchBountyHands),
  bountyBoardsHere:this.native(frameServices.sceneBountyBoardsHere),
  boardStateOf:this.native(frameServices.sceneBoardStateOf),
  bountyBeat:this.native(frameServices.sceneBountyBeat),
  armBountyBoard:this.native(frameServices.sceneArmBountyBoard),
  stationDwellArmed:this.native(frameServices.sceneStationDwellArmed),
  resolvedHandsAt:this.native(frameServices.sceneResolvedHandsAt),
  nearCampfire:this.native(frameServices.sceneNearCampfire),
  refreshZones:this.native(frameServices.sceneRefreshZones),
  nearCaravan:this.native(frameServices.sceneNearCaravan),
  nearFont:this.native(frameServices.sceneNearFont),
  nearHarborBoard:this.native(frameServices.sceneNearHarborBoard),
  resolveHoldDefense:this.native(frameServices.sceneResolveHoldDefense),
  spawnHoldBesieger:this.native(frameServices.sceneSpawnHoldBesieger),
  getMireille:this.native(frameServices.sceneGetMireille),
  mireilleLessonLived:this.native(frameServices.sceneMireilleLessonLived),
  mireilleLessonStep:this.native(frameServices.sceneMireilleLessonStep),
  mireilleStampLived:this.native(frameServices.sceneMireilleStampLived),
  mireilleSeatStep:this.native(frameServices.sceneMireilleSeatStep),
  mireilleUnlocked:this.native(frameServices.sceneMireilleUnlocked),
  mireilleGiftOwed:this.native(frameServices.sceneMireilleGiftOwed),
  mireilleService:this.native(frameServices.sceneMireilleService),
  nearMusterHorn:this.native(frameServices.sceneNearMusterHorn),
  nearOracle:this.native(frameServices.sceneNearOracle),
  portDock:this.native(frameServices.scenePortDock),
  canSail:this.native(frameServices.sceneCanSail),
  nearSalvage:this.native(frameServices.sceneNearSalvage),
  nearTracker:this.native(frameServices.sceneNearTracker),
  swapRefusal:this.native(frameServices.sceneSwapRefusal),
  memorySecondaryRefusal:this.native(frameServices.sceneMemorySecondaryRefusal),
  acceptAmalgamHunt:this.native(frameServices.sceneAcceptAmalgamHunt),
  amalgamPickSpots:this.native(frameServices.sceneAmalgamPickSpots),
  graftAmalgamPart:this.native(frameServices.sceneGraftAmalgamPart),
  spawnDepthkin:this.native(frameServices.sceneSpawnDepthkin),
  streamDescentTerrain:this.native(frameServices.sceneStreamDescentTerrain),
  sameParty:this.native(frameServices.sceneSameParty),
  reviveSeat:this.native(frameServices.sceneReviveSeat),
  lightwellDoodads:this.native(frameServices.sceneLightwellDoodads),
  lightCoverAt:this.native(frameServices.sceneLightCoverAt),
  lightMeterHeld:this.native(frameServices.sceneLightMeterHeld),
  mercParley:this.native(frameServices.sceneMercParley),
  canReclaim:this.native(frameServices.sceneCanReclaim),
  reclaimCorpse:this.native(frameServices.sceneReclaimCorpse),
  updateWraithsailAtSea:this.native(frameServices.sceneUpdateWraithsailAtSea),
  nearestShore:this.native(frameServices.sceneNearestShore),
  landingSiteFor:this.native(frameServices.sceneLandingSiteFor),
  witherGrafts:this.native(frameServices.sceneWitherGrafts),
  isPressingFoe:this.native(frameServices.sceneIsPressingFoe),
  buyerSettlementHost:this.native(frameServices.sceneBuyerSettlementHost),
  reconcileBounties:this.native(frameServices.sceneReconcileBounties),
  bountyBoardUnlocked:this.native(frameServices.sceneBountyBoardUnlocked),
  townPresent:this.native(frameServices.sceneTownPresent),
  stationAnchor:this.native(frameServices.sceneStationAnchor),
  bountyBoardRoster:this.native(frameServices.sceneBountyBoardRoster),
  bountyBeatSeconds:this.native(frameServices.sceneBountyBeatSeconds),
  pickBountyGemId:this.native(frameServices.scenePickBountyGemId),
  bountyApproaches:this.native(frameServices.sceneBountyApproaches),
  bountyAppropriate:this.native(frameServices.sceneBountyAppropriate),
  questCharKey:this.native(frameServices.sceneQuestCharKey),
  gateAccountOf:this.native(frameServices.sceneGateAccountOf),
  bountyBroaderBonus:this.native(frameServices.sceneBountyBroaderBonus),
  bountyReach:this.native(frameServices.sceneBountyReach),
  handOwns:this.native(frameServices.sceneHandOwns),
  counterOwned:this.native(frameServices.sceneCounterOwned),
  refreshHoldDress:this.native(frameServices.sceneRefreshHoldDress),
  refreshHoldServices:this.native(frameServices.sceneRefreshHoldServices),
  placeVocationSites:this.native(frameServices.scenePlaceVocationSites),
  fillOrbFounts:this.native(frameServices.sceneFillOrbFounts),
  grantSkillGemItem:this.native(frameServices.sceneGrantSkillGemItem),
  hasOracle:this.native(frameServices.sceneHasOracle),
  voyageZoneDef:this.native(frameServices.sceneVoyageZoneDef),
  hasSalvage:this.native(frameServices.sceneHasSalvage),
  swapReadiness:this.native(frameServices.sceneSwapReadiness),
  pickAmalgamMinibossZone:this.native(frameServices.scenePickAmalgamMinibossZone),
  sameSeatParty:this.native(frameServices.sceneSameSeatParty),
  dropSavedLoot:this.native(frameServices.sceneDropSavedLoot),
  islandDefIdOf:this.native(frameServices.sceneIslandDefIdOf),
  shelfCharKey:this.native(frameServices.sceneShelfCharKey),
  townSite:this.native(frameServices.sceneTownSite),
  skillDropPool:this.native(frameServices.sceneSkillDropPool),
  gemWeights:this.native(frameServices.sceneGemWeights),
  seatNote:this.native(frameServices.sceneSeatNote),
  salvageUnlocked:this.native(frameServices.sceneSalvageUnlocked),
  isSafeAt:this.native(frameServices.sceneIsSafeAt),
  maybeOpenCrusadePortal:this.native(frameAreaEvents.sceneMaybeOpenCrusadePortal),
  maybeOpenDemonPortal:this.native(frameAreaEvents.sceneMaybeOpenDemonPortal),
  pruneEngageTokens:this.native(frameAreaEvents.scenePruneEngageTokens),
  updateBombardment:this.native(frameAreaEvents.sceneUpdateBombardment),
  updateBrigandRaid:this.native(frameAreaEvents.sceneUpdateBrigandRaid),
  updateClutch:this.native(frameAreaEvents.sceneUpdateClutch),
  updateDeadwakeStream:this.native(frameAreaEvents.sceneUpdateDeadwakeStream),
  updateDemonStorm:this.native(frameAreaEvents.sceneUpdateDemonStorm),
  updateDroveScene:this.native(frameAreaEvents.sceneUpdateDroveScene),
  updateHauntStream:this.native(frameAreaEvents.sceneUpdateHauntStream),
  updateLongNight:this.native(frameAreaEvents.sceneUpdateLongNight),
  updateLooters:this.native(frameAreaEvents.sceneUpdateLooters),
  updateMigrationStream:this.native(frameAreaEvents.sceneUpdateMigrationStream),
  updateNecropolis:this.native(frameAreaEvents.sceneUpdateNecropolis),
  updateNeutralCooldown:this.native(frameAreaEvents.sceneUpdateNeutralCooldown),
  updateQuickening:this.native(frameAreaEvents.sceneUpdateQuickening),
  updateStorm:this.native(frameAreaEvents.sceneUpdateStorm),
  updateStrayingScene:this.native(frameAreaEvents.sceneUpdateStrayingScene),
  updateSwarmStream:this.native(frameAreaEvents.sceneUpdateSwarmStream),
  updateWispScene:this.native(frameAreaEvents.sceneUpdateWispScene),
  updateWorldBosses:this.native(frameAreaEvents.sceneUpdateWorldBosses),
  updateWraithsailDock:this.native(frameAreaEvents.sceneUpdateWraithsailDock),
  bombardTarget:this.native(frameAreaEvents.sceneBombardTarget),
  spawnBrigandPack:this.native(frameAreaEvents.sceneSpawnBrigandPack),
  updateBrigands:this.native(frameAreaEvents.sceneUpdateBrigands),
  spawnDeadwakeLeader:this.native(frameAreaEvents.sceneSpawnDeadwakeLeader),
  deadwakeHeadcount:this.native(frameAreaEvents.sceneDeadwakeHeadcount),
  spawnDeadwakeStreamer:this.native(frameAreaEvents.sceneSpawnDeadwakeStreamer),
  fireMeteor:this.native(frameAreaEvents.sceneFireMeteor),
  evapDroveDress:this.native(frameAreaEvents.sceneEvapDroveDress),
  pastureAnchor:this.native(frameAreaEvents.scenePastureAnchor),
  plantDrovePen:this.native(frameAreaEvents.scenePlantDrovePen),
  droveGapDir:this.native(frameAreaEvents.sceneDroveGapDir),
  droveGathered:this.native(frameAreaEvents.sceneDroveGathered),
  hauntHeadcount:this.native(frameAreaEvents.sceneHauntHeadcount),
  longNightWorldChores:this.native(frameAreaEvents.sceneLongNightWorldChores),
  longNightHeadcount:this.native(frameAreaEvents.sceneLongNightHeadcount),
  updateMigrants:this.native(frameAreaEvents.sceneUpdateMigrants),
  migrantHeadcount:this.native(frameAreaEvents.sceneMigrantHeadcount),
  spawnMigrant:this.native(frameAreaEvents.sceneSpawnMigrant),
  nearestSeatDist:this.native(frameAreaEvents.sceneNearestSeatDist),
  fireLightning:this.native(frameAreaEvents.sceneFireLightning),
  strayingRallySeat:this.native(frameAreaEvents.sceneStrayingRallySeat),
  strayingRelief:this.native(frameAreaEvents.sceneStrayingRelief),
  swarmHeadcount:this.native(frameAreaEvents.sceneSwarmHeadcount),
  spawnSwarmFlier:this.native(frameAreaEvents.sceneSpawnSwarmFlier),
  mintWispBody:this.native(frameAreaEvents.sceneMintWispBody),
  kindleWisp:this.native(frameAreaEvents.sceneKindleWisp),
  applyWispRide:this.native(frameAreaEvents.sceneApplyWispRide),
  wispRideLands:this.native(frameAreaEvents.sceneWispRideLands),
  wispSeekTarget:this.native(frameAreaEvents.sceneWispSeekTarget),
  mintWorldBossZone:this.native(frameAreaEvents.sceneMintWorldBossZone),
  updateWorldBossWalls:this.native(frameAreaEvents.sceneUpdateWorldBossWalls),
  updateWorldBossPassing:this.native(frameAreaEvents.sceneUpdateWorldBossPassing),
  bandFlow:this.native(frameAreaEvents.sceneBandFlow),
  brigandWanderPoint:this.native(frameAreaEvents.sceneBrigandWanderPoint),
  deadwakeEntryPoint:this.native(frameAreaEvents.sceneDeadwakeEntryPoint),
  onMeteorImpact:this.native(frameAreaEvents.sceneOnMeteorImpact),
  droveHash:this.native(frameAreaEvents.sceneDroveHash),
  reconcileLongNightWarps:this.native(frameAreaEvents.sceneReconcileLongNightWarps),
  wispRoute:this.native(frameAreaEvents.sceneWispRoute),
  wyrmWallSpots:this.native(frameAreaEvents.sceneWyrmWallSpots),
  demonHeadcount:this.native(frameAreaEvents.sceneDemonHeadcount),
  updateHarborholds:this.native(campaignEvents.sceneUpdateHarborholds),
  feedMyceliaActivity:this.native(campaignEvents.sceneFeedMyceliaActivity),
  drainMyceliaLedger:this.native(campaignEvents.sceneDrainMyceliaLedger),
  sweepClassClaims:this.native(campaignEvents.sceneSweepClassClaims),
  updateDeedRecovery:this.native(campaignEvents.sceneUpdateDeedRecovery),
  updateForechart:this.native(campaignEvents.sceneUpdateForechart),
  updateOmens:this.native(campaignEvents.sceneUpdateOmens),
  updateWebSettle:this.native(campaignEvents.sceneUpdateWebSettle),
  reconcileDeepwinter:this.native(campaignEvents.sceneReconcileDeepwinter),
  relocateToFactionBiome:this.native(campaignEvents.sceneRelocateToFactionBiome),
  surfaceAnchor:this.native(campaignEvents.sceneSurfaceAnchor),
  visible:this.native(campaignEvents.sceneVisible),
  fellHold:this.native(campaignEvents.sceneFellHold),
  eventActivityAt:this.native(campaignEvents.sceneEventActivityAt),
  ledgerView:this.native(campaignEvents.sceneLedgerView),
  forechartSounding:this.native(campaignEvents.sceneForechartSounding),
  growSoundings:this.native(campaignEvents.sceneGrowSoundings),
  breakArenaSeal:this.native(frameTravel.sceneBreakArenaSeal),
  exitLockHint:this.native(frameTravel.sceneExitLockHint),
  exitUnder:this.native(frameTravel.sceneExitUnder),
  gateUnder:this.native(frameTravel.sceneGateUnder),
  holdfastNear:this.native(frameTravel.sceneHoldfastNear),
  mintSidezone:this.native(frameTravel.sceneMintSidezone),
  mouthRefusalUnder:this.native(frameTravel.sceneMouthRefusalUnder),
  mouthUnder:this.native(frameTravel.sceneMouthUnder),
  openEncounter:this.native(frameTravel.sceneOpenEncounter),
  triggerFracture:this.native(frameTravel.sceneTriggerFracture),
  wardSealUnder:this.native(frameTravel.sceneWardSealUnder),
  waypointBesieged:this.native(frameTravel.sceneWaypointBesieged),
  applyWaveFrenzy:this.native(frameTravel.sceneApplyWaveFrenzy),
  recalcPlayer:this.native(frameTravel.sceneRecalcPlayer),
  shardRoadHost:this.native(frameTravel.sceneShardRoadHost),
  shardMouthRoad:this.native(frameTravel.sceneShardMouthRoad),
  shardExitRoad:this.native(frameTravel.sceneShardExitRoad),
  sealedRoadUnder:this.native(frameTravel.sceneSealedRoadUnder),
  bountyOmens:this.native(frameTravel.sceneBountyOmens),
  harborholdOmens:this.native(frameTravel.sceneHarborholdOmens),
  devOverlayView:this.native(frameTravel.sceneDevOverlayView),
  vendorQualityPieces:this.native(frameTravel.sceneVendorQualityPieces),
  mintAuthoredZone:this.native(frameTravel.sceneMintAuthoredZone),
  questHandLevel:this.native(frameTravel.sceneQuestHandLevel),
  spawnArenaBoss:this.native(frameTravel.sceneSpawnArenaBoss),
  applySidezoneFurnish:this.native(frameTravel.sceneApplySidezoneFurnish),
  isExitLocked:this.native(frameTravel.sceneIsExitLocked),
  holdfastKeeper:this.native(frameTravel.sceneHoldfastKeeper),
  mintMassSidearea:this.native(frameTravel.sceneMintMassSidearea),
  sidezoneSealHolds:this.native(frameTravel.sceneSidezoneSealHolds),
  onMouth:this.native(frameTravel.sceneOnMouth),
  seedVeil:this.native(frameTravel.sceneSeedVeil),
  spawnPartyEchoes:this.native(frameTravel.sceneSpawnPartyEchoes),
  dimensionRoad:this.native(frameTravel.sceneDimensionRoad),
  realmRoad:this.native(frameTravel.sceneRealmRoad),
  shardRealmRoad:this.native(frameTravel.sceneShardRealmRoad),
  demonRealmPlan:this.native(frameTravel.sceneDemonRealmPlan),
  crusadeRealmPlan:this.native(frameTravel.sceneCrusadeRealmPlan),
  necropolisRealmPlan:this.native(frameTravel.sceneNecropolisRealmPlan),
  fractureRealmPlan:this.native(frameTravel.sceneFractureRealmPlan),
  courtRealmPlan:this.native(frameTravel.sceneCourtRealmPlan),
  landPartyAt:this.native(frameTravel.sceneLandPartyAt),
  townPortalViews:this.native(frameTravel.sceneTownPortalViews),
  allQuestHands:this.native(frameTravel.sceneAllQuestHands),
  questLedgerOf:this.native(frameTravel.sceneQuestLedgerOf),
  dimensionCrossing:this.native(frameTravel.sceneDimensionCrossing),
  shardDimensionRoad:this.native(frameTravel.sceneShardDimensionRoad),
  realmArenaMint:this.native(frameTravel.sceneRealmArenaMint),
  castTownPortal:this.native(frameTravel.sceneCastTownPortal),
  learnSkill:this.native(frameTravel.sceneLearnSkill),
  unlearnSkill:this.native(frameTravel.sceneUnlearnSkill),
  attuneSpectre:this.native(frameTravel.sceneAttuneSpectre),
  mimicSelectFor:this.native(frameTravel.sceneMimicSelectFor),
  pickTreeNode:this.native(frameTravel.scenePickTreeNode),
  releaseCompanion:this.native(frameTravel.sceneReleaseCompanion),
  placePing:this.native(frameTravel.scenePlacePing),
  fontMergeSkill:this.native(frameTravel.sceneFontMergeSkill),
  fontConvertEssence:this.native(frameTravel.sceneFontConvertEssence),
  fontResetTree:this.native(frameTravel.sceneFontResetTree),
  buyAbilityEssence:this.native(frameTravel.sceneBuyAbilityEssence),
  buyVendorGem:this.native(frameTravel.sceneBuyVendorGem),
  buyChandlerGem:this.native(frameTravel.sceneBuyChandlerGem),
  buyDelverGem:this.native(frameTravel.sceneBuyDelverGem),
  setVendorLock:this.native(frameTravel.sceneSetVendorLock),
  setVendorCommission:this.native(frameTravel.sceneSetVendorCommission),
  levelUpSkill:this.native(frameTravel.sceneLevelUpSkill),
  bagItem:this.native(frameTravel.sceneBagItem),
  levelUpSupport:this.native(frameTravel.sceneLevelUpSupport),
  resyncMinionSupports:this.native(frameTravel.sceneResyncMinionSupports),
  reacquireSkill:this.native(frameTravel.sceneReacquireSkill),
  socketSupport:this.native(frameTravel.sceneSocketSupport),
  unsocketSupport:this.native(frameTravel.sceneUnsocketSupport),
  unsocketBagSkill:this.native(frameTravel.sceneUnsocketBagSkill),
  allocateNode:this.native(frameTravel.sceneAllocateNode),
  refundPassiveNode:this.native(frameTravel.sceneRefundPassiveNode),
  bindGraft:this.native(frameTravel.sceneBindGraft),
  bindSkill:this.native(frameTravel.sceneBindSkill),
  swapSkillSlots:this.native(frameTravel.sceneSwapSkillSlots),
  recallMemory:this.native(frameTravel.sceneRecallMemory),
  buyHarborChart:this.native(frameTravel.sceneBuyHarborChart),
  acceptBounty:this.native(frameTravel.sceneAcceptBounty),
  abandonBounty:this.native(frameTravel.sceneAbandonBounty),
  turnInBounty:this.native(frameTravel.sceneTurnInBounty),
  setBountyLock:this.native(frameTravel.sceneSetBountyLock),
  forgeBegin:this.native(frameTravel.sceneForgeBegin),
  forgeCancel:this.native(frameTravel.sceneForgeCancel),
  postHoldWrits:this.native(frameTravel.scenePostHoldWrits),
  beginHoldMuster:this.native(frameTravel.sceneBeginHoldMuster),
  buyHoldRestore:this.native(frameTravel.sceneBuyHoldRestore),
  payHoldfastToll:this.native(frameTravel.scenePayHoldfastToll),
  equipItem:this.native(frameTravel.sceneEquipItem),
  unequipItem:this.native(frameTravel.sceneUnequipItem),
  moveBagItem:this.native(frameTravel.sceneMoveBagItem),
  sortBag:this.native(frameTravel.sceneSortBag),
  dropGearFromBag:this.native(frameTravel.sceneDropGearFromBag),
  oracleRelic:this.native(frameTravel.sceneOracleRelic),
  reliquaryToggle:this.native(frameTravel.sceneReliquaryToggle),
  withdrawRelic:this.native(frameTravel.sceneWithdrawRelic),
  relicStashMove:this.native(frameTravel.sceneRelicStashMove),
  personalStash:this.native(frameTravel.scenePersonalStash),
  oracleAttune:this.native(frameTravel.sceneOracleAttune),
  containerPlace:this.native(frameTravel.sceneContainerPlace),
  containerTake:this.native(frameTravel.sceneContainerTake),
  containerMove:this.native(frameTravel.sceneContainerMove),
  harvestConsent:this.native(frameTravel.sceneHarvestConsent),
  pickupNearestGear:this.native(frameTravel.scenePickupNearestGear),
  salvageItem:this.native(frameTravel.sceneSalvageItem),
  salvageBulk:this.native(frameTravel.sceneSalvageBulk),
  salvageLockSet:this.native(frameTravel.sceneSalvageLockSet),
  craftAffix:this.native(frameTravel.sceneCraftAffix),
  rerollAffix:this.native(frameTravel.sceneRerollAffix),
  socketVestige:this.native(frameTravel.sceneSocketVestige),
  craftSocket:this.native(frameTravel.sceneCraftSocket),
  armFolkWithItem:this.native(frameTravel.sceneArmFolkWithItem),
  armFolkWithEssence:this.native(frameTravel.sceneArmFolkWithEssence),
  meetsRequirements:this.native(frameTravel.sceneMeetsRequirements),
  unlearnRefusal:this.native(frameTravel.sceneUnlearnRefusal),
  rebindWornGrafts:this.native(frameTravel.sceneRebindWornGrafts),
  restoreCompanions:this.native(frameTravel.sceneRestoreCompanions),
  rememberSkillSlots:this.native(frameTravel.sceneRememberSkillSlots),
  clearSummonTreeBodies:this.native(frameTravel.sceneClearSummonTreeBodies),
  grantSupportGemItem:this.native(frameTravel.sceneGrantSupportGemItem),
  spendAbilityEssence:this.native(frameTravel.sceneSpendAbilityEssence),
  vendorTradeRefusal:this.native(frameTravel.sceneVendorTradeRefusal),
  abilityEssTierRefusal:this.native(frameTravel.sceneAbilityEssTierRefusal),
  canAffordEssence:this.native(frameTravel.sceneCanAffordEssence),
  buysAsOwn:this.native(frameTravel.sceneBuysAsOwn),
  nearSmith:this.native(frameTravel.sceneNearSmith),
  vendorEntryAllowed:this.native(frameTravel.sceneVendorEntryAllowed),
  vendorPrice:this.native(frameTravel.sceneVendorPrice),
  vendorBought:this.native(frameTravel.sceneVendorBought),
  nearChandler:this.native(frameTravel.sceneNearChandler),
  delverShopOpen:this.native(frameTravel.sceneDelverShopOpen),
  delverEntryRefusal:this.native(frameTravel.sceneDelverEntryRefusal),
  vendorHoldKey:this.native(frameTravel.sceneVendorHoldKey),
  vendorHoldFor:this.native(frameTravel.sceneVendorHoldFor),
  vendorLockCap:this.native(frameTravel.sceneVendorLockCap),
  commissionOdds:this.native(frameTravel.sceneCommissionOdds),
  ensureRealmRoots:this.native(frameTravel.sceneEnsureRealmRoots),
  refreshPassiveCompany:this.native(frameTravel.sceneRefreshPassiveCompany),
  passiveRefundRefusal:this.native(frameTravel.scenePassiveRefundRefusal),
  seatSkillById:this.native(frameTravel.sceneSeatSkillById),
  resolveMemoryCut:this.native(frameTravel.sceneResolveMemoryCut),
  caravanBandUnlocked:this.native(frameTravel.sceneCaravanBandUnlocked),
  mintCaravanRoute:this.native(frameTravel.sceneMintCaravanRoute),
  mortalValueOf:this.native(frameTravel.sceneMortalValueOf),
  spendMortalValue:this.native(frameTravel.sceneSpendMortalValue),
  refreshBountySlate:this.native(frameTravel.sceneRefreshBountySlate),
  payBountyLanes:this.native(frameTravel.scenePayBountyLanes),
  bountyLockCapacity:this.native(frameTravel.sceneBountyLockCapacity),
  forgeBases:this.native(frameTravel.sceneForgeBases),
  holdStateFor:this.native(frameTravel.sceneHoldStateFor),
  spendEssence:this.native(frameTravel.sceneSpendEssence),
  wornSlotOf:this.native(frameTravel.sceneWornSlotOf),
  dropGemFromBag:this.native(frameTravel.sceneDropGemFromBag),
  canManageAccountRelics:this.native(frameTravel.sceneCanManageAccountRelics),
  seatAccountRelic:this.native(frameTravel.sceneSeatAccountRelic),
  persistAccountRelics:this.native(frameTravel.scenePersistAccountRelics),
  reliquaryRefusal:this.native(frameTravel.sceneReliquaryRefusal),
  seatModeDef:this.native(frameTravel.sceneSeatModeDef),
  containerHeld:this.native(frameTravel.sceneContainerHeld),
  salvageLane:this.native(frameTravel.sceneSalvageLane),
  lockedRefusal:this.native(frameTravel.sceneLockedRefusal),
  breakOneGemItem:this.native(frameTravel.sceneBreakOneGemItem),
  breakOneItem:this.native(frameTravel.sceneBreakOneItem),
  stationReach:this.native(frameTravel.sceneStationReach),
  craftSlots:this.native(frameTravel.sceneCraftSlots),
  boroughOf:this.native(frameTravel.sceneBoroughOf),
  boroughArmsOf:this.native(frameTravel.sceneBoroughArmsOf),
  armBoroughFolk:this.native(frameTravel.sceneArmBoroughFolk),
  raiseArenaWards:this.native(frameTravel.sceneRaiseArenaWards),
  vendorMemoryServicesOpen:this.native(frameTravel.sceneVendorMemoryServicesOpen),
  waresRungsOwned:this.native(frameTravel.sceneWaresRungsOwned),
  nearDelver:this.native(frameTravel.sceneNearDelver),
  delverDepthReached:this.native(frameTravel.sceneDelverDepthReached),
  rescaleEnemies:this.native(frameTravel.sceneRescaleEnemies),
  supportDropPool:this.native(frameTravel.sceneSupportDropPool),
  memoryLeanOf:this.native(frameTravel.sceneMemoryLeanOf),
  caravanDestName:this.native(frameTravel.sceneCaravanDestName),
  payBountyComponent:this.native(frameTravel.scenePayBountyComponent),
  nearScrapVendor:this.native(frameTravel.sceneNearScrapVendor),
  stationNear:this.native(frameTravel.sceneStationNear),
  suiteSummons:this.native(frameTravel.sceneSuiteSummons),
  applyPartyScale:this.native(frameTravel.sceneApplyPartyScale),
  suitesAt:this.native(frameTravel.sceneSuitesAt),
  stationStands:this.native(frameTravel.sceneStationStands),
  addTrack:method(()=>this.input.assembly.input.geometry,"addTrack"),
  altars:field(()=>this.input.assembly.input.physical.input.state,"altars"),
  arenaCrowd:field(()=>this.runtimeState.frame,"arenaCrowd"),
  attuneTimer:field(()=>this.runtimeState.frame,"attuneTimer"),
  baseTable:method(()=>this.input.assembly.input.population,"baseTable"),
  boroughArmFolkId:field(()=>this.input.assembly.input.registry.input.state,"boroughArmFolkId"),
  boroughArmRequested:field(()=>this.input.assembly.input.registry.input.state,"boroughArmRequested"),
  boroughRefugees:field(()=>this.input.assembly.input.registry.input.state,"boroughRefugees"),
  brittleDwell:field(()=>this.runtimeState.frame,"brittleDwell"),
  brittleWarnAt:field(()=>this.runtimeState.frame,"brittleWarnAt"),
  caveMap:field(()=>this.input.campaign,"caveMap"),
  charBorn:field(()=>this.input.assembly.transition,"charBorn"),
  charRegrowAcc:field(()=>this.input.assembly.transition,"charRegrowAcc"),
  chartFrontier:method(()=>this.input.assembly.graph,"chartFrontier"),
  chests:field(()=>this.input.assembly.input.physical.input.state,"chests"),
  chillTimers:field(()=>this.runtimeState.frame,"chillTimers"),
  clearOfDoors:method(()=>this.input.assembly.input.geometry,"clearOfDoors"),
  clearTransitSpot:method(()=>this.input.assembly.input.geometry,"clearTransitSpot"),
  clientActionHook:method(()=>this.input.campaign,"clientActionHook"),
  collapse:field(()=>this.input.assembly.input.geometry,"collapse"),
  companionGrants:field(()=>this.input.progression,"companionGrants"),
  contactHazards:field(()=>this.input.assembly.input.geometry,"contactHazards"),
  couchConfine:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"couchConfine"),
  deedDotAmounts:field(()=>this.runtimeState.frame,"deedDotAmounts"),
  dissolveFloorCracks:field(()=>this.runtimeState.frame,"dissolveFloorCracks"),
  doodadFamilyRev:method(()=>this.input.assembly.input.geometry,"doodadFamilyRev"),
  doodadsRev:field(()=>this.input.assembly.input.geometry,"doodadsRev"),
  douseTimers:field(()=>this.runtimeState.frame,"douseTimers"),
  drainSurvival:method(()=>this,"drainSurvival"),
  dropGearAt:method(()=>this.input.assembly.lootController,"dropGearAt"),
  dwellReachable:method(()=>this.input.assembly.input.geometry,"dwellReachable"),
  effectiveSpawn:method(()=>this.input.assembly.input.population,"effectiveSpawn"),
  emergences:field(()=>this.input.progression.input.state,"emergences"),
  encRng:field(()=>this.input.assembly.transition,"encRng"),
  enemyTetherScan:field(()=>this.runtimeState.frame,"enemyTetherScan"),
  exits:field(()=>this.input.assembly.input.geometry,"exits"),
  extractionDepartures:field(()=>this.input.assembly.input.registry.input.state,"extractionDepartures"),
  farPoint:method(()=>this.input.assembly.input.geometry,"farPoint"),
  farthestStand:method(()=>this.input.assembly.input.geometry,"farthestStand"),
  fellDoodad:method(()=>this.input.assembly.input.geometry,"fellDoodad"),
  fracturePoint:method(()=>this.input.assembly.input.registry.input.birth,"fracturePoint"),
  fractureRng:field(()=>this.input.assembly.input.registry.input.birth.input.state,"fractureRng"),
  fractureRun:field(()=>this.input.assembly.input.registry.input.birth.input.state,"fractureRun"),
  frontRiders:field(()=>this.input.assembly.input.geometry,"frontRiders"),
  gameOver:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"gameOver"),
  gazeEyes:field(()=>this.runtimeState.frame,"gazeEyes"),
  gazeEyesArr:field(()=>this.runtimeState.frame,"gazeEyesArr"),
  gazeEyesLen:field(()=>this.runtimeState.frame,"gazeEyesLen"),
  gazeEyesRev:field(()=>this.runtimeState.frame,"gazeEyesRev"),
  gazeTimers:field(()=>this.runtimeState.frame,"gazeTimers"),
  gearVacuum:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"gearVacuum"),
  geyserPocks:field(()=>this.input.assembly.input.environment.input.state,"geyserPocks"),
  geyserSweepAcc:field(()=>this.input.assembly.input.environment.input.state,"geyserSweepAcc"),
  grabScratch:field(()=>this.runtimeState.frame,"grabScratch"),
  graftPart:method(()=>this.input.assembly.input.registry.input.birth,"graftPart"),
  grantedPocketCache:field(()=>this.input.assembly.input.geometry,"grantedPocketCache"),
  grantedPocketZone:field(()=>this.runtimeState.frame,"grantedPocketZone"),
  grantedTrailMemory:field(()=>this.input.assembly.input.geometry,"grantedTrailMemory"),
  grantEssence:method(()=>this.campaignTransitions,"grantEssence"),
  groundInsured:method(()=>this.input.assembly.input.geometry,"groundInsured"),
  hasDeedEnemyNearby:method(()=>this.campaignOwner,"hasDeedEnemyNearby"),
  hivecallHooks:field(()=>this.runtimeState.frame,"hivecallHooks"),
  hivecallRedirecting:field(()=>this.runtimeState.frame,"hivecallRedirecting"),
  huntBeast:field(()=>this.input.assembly.input.registry.input.birth.input.state,"huntBeast"),
  huntFootprint:field(()=>this.input.assembly.input.registry.input.birth.input.state,"huntFootprint"),
  huntFootprintDwell:field(()=>this.input.assembly.input.registry.input.state,"huntFootprintDwell"),
  inCave:field(()=>this.input.assembly.transition,"inCave"),
  incursionEventAcc:field(()=>this.runtimeState.frame,"incursionEventAcc"),
  liteBeatAt:field(()=>this.input.assembly.input.ecology.input.state,"liteBeatAt"),
  liteBurrows:field(()=>this.input.assembly.input.ecology.input.state,"liteBurrows"),
  liteColonySeen:field(()=>this.input.assembly.input.ecology.input.state,"liteColonySeen"),
  liteCondHeld:method(()=>this.input.assembly.input.ecology,"liteCondHeld"),
  liteCounts:field(()=>this.runtimeState.frame,"liteCounts"),
  liteDemoteClock:field(()=>this.runtimeState.frame,"liteDemoteClock"),
  liteHasTrample:field(()=>this.input.assembly.input.ecology.input.state,"liteHasTrample"),
  liteKeeperScratch:field(()=>this.runtimeState.frame,"liteKeeperScratch"),
  liteMinTrampleSpeed:field(()=>this.input.assembly.input.ecology.input.state,"liteMinTrampleSpeed"),
  litePocketPush:method(()=>this.input.assembly.input.ecology,"litePocketPush"),
  litePromoteBudget:field(()=>this.input.assembly.input.ecology.input.state,"litePromoteBudget"),
  liteRegenClock:field(()=>this.input.assembly.input.ecology.input.state,"liteRegenClock"),
  liteVictimScratch:field(()=>this.runtimeState.frame,"liteVictimScratch"),
  liteWhenCueDraws:field(()=>this.input.assembly.input.ecology.input.state,"liteWhenCueDraws"),
  localHumanSeats:method(()=>this.input.quests,"localHumanSeats"),
  lockHint:field(()=>this.runtimeState.frame,"lockHint"),
  manifest:field(()=>this.input.campaign,"manifest"),
  massNativeEffectInvokers:field(()=>this.runtimeState.frame,"massNativeEffectInvokers"),
  materializeLiveZoneEvents:method(()=>this.input.assembly.input.registry,"materializeLiveZoneEvents"),
  meta:field(()=>this.input.campaign,"meta"),
  minionMetaScan:field(()=>this.runtimeState.frame,"minionMetaScan"),
  modeStageDef:method(()=>this.input.assembly.input.history,"modeStageDef"),
  mountUnhorse:method(()=>this,"mountUnhorse"),
  moveActor:method(()=>this,"moveActor"),
  nativeExitPreparationHost:method(()=>this.input.assembly.input.coast,"nativeExitPreparationHost"),
  nativeExitPreparationSources:method(()=>this.input.assembly.input.coast,"nativeExitPreparationSources"),
  notices:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"notices"),
  objectiveDone:field(()=>this.input.assembly.input.objectives,"objectiveDone"),
  occHost:method(()=>this.input.assembly.input.occurrences,"occHost"),
  packNextAt:field(()=>this.runtimeState.frame,"packNextAt"),
  pendingMetas:{get:()=>this.#operation.captureRecordStorage("pendingMetas",this.runtimeState.pendingMetas),set:value=>{this.#operation.checkRecordStorage("pendingMetas",value);this.runtimeState.pendingMetas=value;this.#operation.captureRecordStorage("pendingMetas",value);}},
  pickupFeed:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"pickupFeed"),
  placeExit:method(()=>this.input.assembly.input.coast,"placeExit"),
  placeFractureRiftContent:method(()=>this.input.assembly.input.registry.input.birth,"placeFractureRiftContent"),
  playerIdle:method(()=>this.input.questInteraction,"playerIdle"),
  promoteRarity:method(()=>this.input.assembly.input.population,"promoteRarity"),
  radianceCondHeld:method(()=>this.input.assembly.sky,"radianceCondHeld"),
  rampageTimer:field(()=>this.input.assembly.input.geometry,"rampageTimer"),
  refreshAuroras:method(()=>this,"refreshAuroras"),
  refreshCreepers:method(()=>this,"refreshCreepers"),
  refreshExitLabels:method(()=>this.input.assembly.input.coast,"refreshExitLabels"),
  refreshGuardians:method(()=>this,"refreshGuardians"),
  refreshSatellites:method(()=>this,"refreshSatellites"),
  regrowing:field(()=>this.input.assembly.input.geometry,"regrowing"),
  relayStatus:method(()=>this.input.assembly.input.population.factory,"relayStatus"),
  ritualSite:field(()=>this.input.assembly.input.registry.input.birth.input.state,"ritualSite"),
  scaldHeatAcc:field(()=>this.runtimeState.frame,"scaldHeatAcc"),
  separateScratch:field(()=>this.runtimeState.frame,"separateScratch"),
  settleLedger:method(()=>this.input.progression,"settleLedger"),
  shrines:field(()=>this.input.assembly.input.physical.input.state,"shrines"),
  slamScratch:field(()=>this.runtimeState.frame,"slamScratch"),
  slipAway:method(()=>this,"slipAway"),
  snowFloor:field(()=>this.input.assembly.input.geometry,"snowFloor"),
  soulriverAcc:field(()=>this.runtimeState.frame,"soulriverAcc"),
  spans:field(()=>this.input.assembly.input.state,"spans"),
  squishScratch:field(()=>this.runtimeState.frame,"squishScratch"),
  stormCaster:{get:()=>observeNativeSource(this.#host,this.runtimeState.frame.stormCaster),set:value=>{this.runtimeState.frame.stormCaster=value;}},
  storyPair:method(()=>this.input.assembly.input.geometry,"storyPair"),
  surveyed:field(()=>this.input.campaign,"surveyed"),
  syncedGrantedPockets:field(()=>this.input.assembly.input.geometry,"syncedGrantedPockets"),
  terrainDrainScratch:field(()=>this.runtimeState.frame,"terrainDrainScratch"),
  terrainTick:field(()=>this.runtimeState.frame,"terrainTick"),
  tethers:{get:()=>this.#operation.captureRecordStorage("tethers",this.tethers.input.state.tethers),set:value=>{this.#operation.checkRecordStorage("tethers",value);this.tethers.input.state.tethers=value;this.#operation.captureRecordStorage("tethers",value);}},
  texts:field(()=>this.input.assembly.objectiveController.input.state,"texts"),
  theaterBeatIdx:field(()=>this.runtimeState.frame,"theaterBeatIdx"),
  theaterDwellSec:field(()=>this.runtimeState.frame,"theaterDwellSec"),
  theaterQuiet:field(()=>this.input.assembly.input.state,"theaterQuiet"),
  theaterRunBeat:method(()=>this.input.assembly.input.theater,"theaterRunBeat"),
  theaterRuns:field(()=>this.input.assembly.input.theater.input.state,"theaterRuns"),
  throngClaimed:field(()=>this.input.assembly.input.ecology.input.services,"throngClaimed"),
  throngEvolutionActive:field(()=>this.runtimeState.frame,"throngEvolutionActive"),
  throngRebake:field(()=>this.runtimeState.frame,"throngRebake"),
  throngScan:field(()=>this.runtimeState.frame,"throngScan"),
  trackSweepAcc:field(()=>this.input.assembly.input.geometry,"trackSweepAcc"),
  transientDoodads:field(()=>this.runtimeState.frame,"transientDoodads"),
  trapDeferred:field(()=>this.input.assembly.input.geometry,"trapDeferred"),
  trapSweepAcc:field(()=>this.input.assembly.input.geometry,"trapSweepAcc"),
  trapworks:field(()=>this.input.assembly.input.geometry,"trapworks"),
  updateCasting:method(()=>this,"updateCasting"),
  updateDeathBursts:method(()=>this,"updateDeathBursts"),
  updateFollowUps:method(()=>this,"updateFollowUps"),
  updateObjective:method(()=>this,"updateObjective"),
  updatePendingSummons:method(()=>this,"updatePendingSummons"),
  updateProjectiles:method(()=>this,"updateProjectiles"),
  updatePuzzles:method(()=>this.input.assembly.puzzleController,"updatePuzzles"),
  updateZones:method(()=>this,"updateZones"),
  veilIdx:field(()=>this.runtimeState.frame,"veilIdx"),
  veilIdxArr:field(()=>this.runtimeState.frame,"veilIdxArr"),
  veilIdxLen:field(()=>this.runtimeState.frame,"veilIdxLen"),
  veilIdxRev:field(()=>this.runtimeState.frame,"veilIdxRev"),
  ventDwellAcc:field(()=>this.runtimeState.frame,"ventDwellAcc"),
  ventDwellers:field(()=>this.runtimeState.frame,"ventDwellers"),
  watchNextAt:field(()=>this.runtimeState.frame,"watchNextAt"),
  weatherDressAcc:field(()=>this.input.assembly.input.geometry,"weatherDressAcc"),
  wetSkyAcc:field(()=>this.runtimeState.frame,"wetSkyAcc"),
  wetSkyStood:field(()=>this.runtimeState.frame,"wetSkyStood"),
  wornThrongInsts:field(()=>this.runtimeState.frame,"wornThrongInsts"),
  zoneMap:field(()=>this.input.campaign,"zoneMap"),
  heatWashScratch:field(()=>this.runtimeState.frame,"heatWashScratch"),
  statusWashScratch:field(()=>this.runtimeState.frame,"statusWashScratch"),
  orbSpringScratch:field(()=>this.runtimeState.frame,"orbSpringScratch"),
  orbSpringBreath:field(()=>this.runtimeState.frame,"orbSpringBreath"),
  acceptQuestOffer:method(()=>this.input.questInteraction,"acceptQuestOffer"),
  acceptVocationQuest:method(()=>this.input.questInteraction,"acceptVocationQuest"),
  activeQuests:field(()=>this.input.campaign,"activeQuests"),
  amalgamNecroDwell:field(()=>this.input.assembly.input.registry.input.state,"amalgamNecroDwell"),
  amalgamPickDwell:field(()=>this.input.assembly.input.registry.input.state,"amalgamPickDwell"),
  amalgamSite:field(()=>this.input.assembly.input.registry.input.birth.input.state,"amalgamSite"),
  approachPass:field(()=>this.runtimeState.frame,"approachPass"),
  arenaWard:field(()=>this.runtimeState.frame,"arenaWard"),
  beginFissure:method(()=>this.input.assembly.input.registry.input.birth,"beginFissure"),
  beginTraversal:method(()=>this.campaignTransitions,"beginTraversal"),
  biomeDepthFor:method(()=>this.input.assembly.input.coast,"biomeDepthFor"),
  biomeFor:method(()=>this.input.assembly.input.coast,"biomeFor"),
  bombardKey:field(()=>this.runtimeState.frame,"bombardKey"),
  bombardMintRev:field(()=>this.input.assembly.input.population.factory,"bombardMintRev"),
  bombardPresent:field(()=>this.runtimeState.frame,"bombardPresent"),
  bountyDwellBoardId:field(()=>this.runtimeState.frame,"bountyDwellBoardId"),
  bountyDwellRequested:field(()=>this.runtimeState.frame,"bountyDwellRequested"),
  bountyDwellSeatId:field(()=>this.runtimeState.frame,"bountyDwellSeatId"),
  bountyGate:field(()=>this.runtimeState.frame,"bountyGate"),
  bountyHands:field(()=>this.input.campaign,"bountyHands"),
  bountyReceipt:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"bountyReceipt"),
  bountyWatchAccum:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"bountyWatchAccum"),
  breachPos:field(()=>this.input.assembly.input.geometry,"breachPos"),
  brigandLingerLeft:field(()=>this.input.assembly.input.registry.input.state,"brigandLingerLeft"),
  brigandsDrifting:field(()=>this.input.assembly.input.registry.input.state,"brigandsDrifting"),
  campfireCd:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"campfireCd"),
  campfireDwell:field(()=>this.runtimeState.frame,"campfireDwell"),
  caravanDwellRequested:field(()=>this.runtimeState.frame,"caravanDwellRequested"),
  caravanDwellSeatId:field(()=>this.runtimeState.frame,"caravanDwellSeatId"),
  caravanGate:field(()=>this.runtimeState.frame,"caravanGate"),
  caravanReturnRequested:field(()=>this.runtimeState.frame,"caravanReturnRequested"),
  caveDwellIdx:field(()=>this.runtimeState.frame,"caveDwellIdx"),
  caveDwellStart:field(()=>this.runtimeState.frame,"caveDwellStart"),
  caveEntrances:field(()=>this.input.assembly.input.geometry,"caveEntrances"),
  caveExitGrace:field(()=>this.input.coordinator.roadsFor(this),"caveExitGrace"),
  caveReturn:field(()=>this.input.coordinator.roadsFor(this),"caveReturn"),
  caveStack:field(()=>this.input.coordinator.roadsFor(this),"caveStack"),
  chandlerStock:field(()=>this.input.campaign,"chandlerStock"),
  chartNeighborsOf:method(()=>this.input.assembly.graph,"chartNeighborsOf"),
  chartsBought:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"chartsBought"),
  claimQuestImbue:method(()=>this.input.questInteraction,"claimQuestImbue"),
  claimQuestReward:method(()=>this.input.quests,"claimQuestReward"),
  clampNear:method(()=>this.input.assembly.input.theater,"clampNear"),
  classClaimNextAt:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"classClaimNextAt"),
  clearSummonReleaseFields:method(()=>this.input.progression,"clearSummonReleaseFields"),
  clearTreeFields:method(()=>this.input.progression,"clearTreeFields"),
  clientOptimistic:method(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"clientOptimistic"),
  climateFor:method(()=>this.input.assembly.input.coast,"climateFor"),
  clutchScan:field(()=>this.runtimeState.frame,"clutchScan"),
  compassFrom:method(()=>this.input.assembly.input.registry.input.birth,"compassFrom"),
  completedObjectives:field(()=>this.input.campaign,"completedObjectives"),
  concludeWipe:method(()=>this.campaignTransitions,"concludeWipe"),
  contagionLeans:field(()=>this.input.assembly.input.registry.input.birth.input.state,"contagionLeans"),
  contagionSweepAt:field(()=>this.runtimeState.frame,"contagionSweepAt"),
  continentFor:method(()=>this.input.assembly.input.coast,"continentFor"),
  convexNav:field(()=>this.input.assembly.input.geometry,"convexNav"),
  corpseRecords:method(()=>this.input.assembly.input.history,"corpseRecords"),
  couchDirty:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"couchDirty"),
  crusadePortals:field(()=>this.input.assembly.input.geometry,"crusadePortals"),
  crusadeRealmContext:field(()=>this.campaignOwner.state,"crusadeRealmContext"),
  deadwakeStreamTimer:field(()=>this.input.assembly.input.registry.input.state,"deadwakeStreamTimer"),
  deathPresentation:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"deathPresentation"),
  deepwinterEyeWarped:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"deepwinterEyeWarped"),
  deepwinterWarped:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"deepwinterWarped"),
  demonCaster:field(()=>this.runtimeState.frame,"demonCaster"),
  demonPortals:field(()=>this.input.assembly.input.geometry,"demonPortals"),
  descentDeepest:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"descentDeepest"),
  descentRun:field(()=>this.input.campaign,"descentRun"),
  descentShaftDwell:field(()=>this.input.assembly.input.registry.input.state,"descentShaftDwell"),
  descentSite:field(()=>this.input.assembly.input.geometry,"descentSite"),
  descentSpawnTimer:field(()=>this.input.assembly.transition,"descentSpawnTimer"),
  descentSpent:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"descentSpent"),
  descentStock:field(()=>this.input.assembly.transition,"descentStock"),
  dimensionBiomeDepthFor:method(()=>this.input.assembly.graph,"dimensionBiomeDepthFor"),
  dimensionBiomeFor:method(()=>this.input.assembly.input.coast,"dimensionBiomeFor"),
  dimGates:field(()=>this.input.assembly.input.geometry,"dimGates"),
  discoveredDimensions:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"discoveredDimensions"),
  discoveredWaypoints:field(()=>this.input.campaign,"discoveredWaypoints"),
  doorDwellId:field(()=>this.runtimeState.frame,"doorDwellId"),
  doorDwellPos:field(()=>this.runtimeState.frame,"doorDwellPos"),
  doorDwellStart:field(()=>this.runtimeState.frame,"doorDwellStart"),
  doorPressIntents:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"doorPressIntents"),
  doorRefusalAt:field(()=>this.runtimeState.frame,"doorRefusalAt"),
  droveDressChecked:field(()=>this.input.assembly.input.registry.input.state,"droveDressChecked"),
  droveScene:field(()=>this.input.assembly.input.registry.input.state,"droveScene"),
  engageTokens:field(()=>this.runtimeState.frame,"engageTokens"),
  ensureSeaPorts:method(()=>this.input.assembly.input.coast,"ensureSeaPorts"),
  entryFrom:field(()=>this.input.coordinator.roadsFor(this),"entryFrom"),
  eventLevel:method(()=>this.input.assembly.input.coast,"eventLevel"),
  events:field(()=>this.campaignOwner.shared,"events"),
  exitDwellIdx:field(()=>this.runtimeState.frame,"exitDwellIdx"),
  exitDwellStart:field(()=>this.runtimeState.frame,"exitDwellStart"),
  findBandCoord:method(()=>this.input.quests,"findBandCoord"),
  fontDwellRequested:field(()=>this.runtimeState.frame,"fontDwellRequested"),
  fontDwellSeatId:field(()=>this.runtimeState.frame,"fontDwellSeatId"),
  fontGate:field(()=>this.runtimeState.frame,"fontGate"),
  fonts:field(()=>this.input.assembly.input.state,"fonts"),
  forechartNextAt:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"forechartNextAt"),
  forechartTurn:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"forechartTurn"),
  fractureRifts:field(()=>this.input.assembly.input.geometry,"fractureRifts"),
  gloamPrevPhase:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"gloamPrevPhase"),
  gloamWellTimer:field(()=>this.runtimeState.frame,"gloamWellTimer"),
  gloomCur:field(()=>this.runtimeState.frame,"gloomCur"),
  gloomZone:field(()=>this.runtimeState.frame,"gloomZone"),
  graphWorkAvailable:method(()=>this.input.quests,"graphWorkAvailable"),
  handSeats:method(()=>this.input.quests,"handSeats"),
  handState:method(()=>this.input.assembly.input.bounty,"handState"),
  harborDwellRequested:field(()=>this.runtimeState.frame,"harborDwellRequested"),
  harborGate:field(()=>this.runtimeState.frame,"harborGate"),
  harvestDwell:field(()=>this.input.assembly.input.environment.input.state,"harvestDwell"),
  harvestNodes:field(()=>this.input.assembly.input.environment.input.state,"harvestNodes"),
  harvestOffer:field(()=>this.input.assembly.input.environment.input.state,"harvestOffer"),
  harvestSessions:field(()=>this.input.assembly.input.environment.input.state,"harvestSessions"),
  hasNpcRole:method(()=>this.input.assembly.input.registry.input.birth,"hasNpcRole"),
  hauntStreamTimer:field(()=>this.input.assembly.input.registry.input.state,"hauntStreamTimer"),
  hiredMercs:field(()=>this.input.campaign,"hiredMercs"),
  holdDefense:field(()=>this.input.assembly.input.registry.input.state,"holdDefense"),
  holdDwellRequested:field(()=>this.input.assembly.input.registry.input.state,"holdDwellRequested"),
  holdfastDwellKey:field(()=>this.input.assembly.input.registry.input.state,"holdfastDwellKey"),
  holdfastDwellPos:field(()=>this.runtimeState.frame,"holdfastDwellPos"),
  holdfastDwellStart:field(()=>this.runtimeState.frame,"holdfastDwellStart"),
  holdGate:field(()=>this.runtimeState.frame,"holdGate"),
  holdSweepAt:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"holdSweepAt"),
  infectActorWith:method(()=>this.input.assembly.input.registry.input.birth,"infectActorWith"),
  isIllegalCrossDim:method(()=>this.input.assembly.input.coast,"isIllegalCrossDim"),
  journalDirty:field(()=>this.input.campaign,"journalDirty"),
  lastRespawnPayout:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"lastRespawnPayout"),
  levelFor:method(()=>this.input.assembly.input.coast,"levelFor"),
  lightningTimer:field(()=>this.runtimeState.frame,"lightningTimer"),
  loadZone:method(()=>this.input.coordinator,"loadZone"),
  longNightStreamTimer:field(()=>this.input.assembly.input.registry.input.state,"longNightStreamTimer"),
  longNightWarped:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"longNightWarped"),
  massAway:{get:()=>readNativeRetainedMassAway(this.input.characterWriter)},
  massCaveIds:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"massCaveIds"),
  massSideareaRoots:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"massSideareaRoots"),
  materializedBrigands:field(()=>this.input.assembly.input.registry.input.state,"materializedBrigands"),
  materializedDeadwakes:field(()=>this.input.assembly.input.registry.input.state,"materializedDeadwakes"),
  materializedDocks:field(()=>this.input.assembly.input.registry.input.state,"materializedDocks"),
  materializedDroves:field(()=>this.input.assembly.input.registry.input.state,"materializedDroves"),
  materializedHaunts:field(()=>this.input.assembly.input.registry.input.state,"materializedHaunts"),
  materializedLongNights:field(()=>this.input.assembly.input.registry.input.state,"materializedLongNights"),
  materializedMigrations:field(()=>this.input.assembly.input.registry.input.state,"materializedMigrations"),
  materializedStrayings:field(()=>this.input.assembly.input.registry.input.state,"materializedStrayings"),
  materializedSwarmings:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"materializedSwarmings"),
  materializedWisplights:field(()=>this.input.assembly.input.registry.input.state,"materializedWisplights"),
  materializedWorldBoss:field(()=>this.input.assembly.input.registry.input.birth.input.state,"materializedWorldBoss"),
  memoryRecallLast:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"memoryRecallLast"),
  mercDwell:field(()=>this.input.assembly.input.state,"mercDwell"),
  mercDwellFired:field(()=>this.input.assembly.input.state,"mercDwellFired"),
  mercHintAt:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"mercHintAt"),
  mercOutpost:field(()=>this.input.assembly.input.settlement.input.state,"mercOutpost"),
  mercOutpostRequested:field(()=>this.runtimeState.frame,"mercOutpostRequested"),
  meteorTimer:field(()=>this.runtimeState.frame,"meteorTimer"),
  migrantSquadId:field(()=>this.input.assembly.input.geometry,"migrantSquadId"),
  migrationStreamTimer:field(()=>this.input.assembly.input.registry.input.state,"migrationStreamTimer"),
  mintIslandZone:method(()=>this.input.assembly.input.coast,"mintIslandZone"),
  mintVeil:field(()=>this.input.campaign,"mintVeil"),
  mireilleAfterglow:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"mireilleAfterglow"),
  mireilleCd:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"mireilleCd"),
  mireilleDwell:field(()=>this.runtimeState.frame,"mireilleDwell"),
  mireilleSeatBuff:field(()=>this.input.campaign,"mireilleSeatBuff"),
  mireilleSeats:field(()=>this.runtimeState.frame,"mireilleSeats"),
  mireilleXpBuff:field(()=>this.input.campaign,"mireilleXpBuff"),
  modeDef:method(()=>this.campaignTransitions,"modeDef"),
  nativeWorldReady:method(()=>this.input.coordinator,"nativeWorldReady"),
  nearScaleDue:field(()=>this.runtimeState.frame,"nearScaleDue"),
  necropolisPortals:field(()=>this.input.assembly.input.geometry,"necropolisPortals"),
  necropolisRealmContext:field(()=>this.campaignOwner.state,"necropolisRealmContext"),
  netCounters:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"netCounters"),
  netJournal:field(()=>this.input.campaign,"netJournal"),
  netMemoryAccess:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"netMemoryAccess"),
  netStationAnchors:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"netStationAnchors"),
  nextGenId:field(()=>this.input.campaign,"nextGenId"),
  nextSquadId:method(()=>this.input.assembly.input.population,"nextSquadId"),
  nodeFromSea:method(()=>this.input.assembly.input.coast,"nodeFromSea"),
  notarizeRoad:method(()=>this.input.assembly.input.coast,"notarizeRoad"),
  noteBountyReady:method(()=>this.input.quests,"noteBountyReady"),
  noteGemDrop:method(()=>this.input.assembly.lootController,"noteGemDrop"),
  objectiveDoneAt:method(()=>this.input.assembly.input.bounty,"objectiveDoneAt"),
  oceanBearing:method(()=>this.input.assembly.input.geometry,"oceanBearing"),
  omenNextAt:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"omenNextAt"),
  omenRevealed:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"omenRevealed"),
  omenWhisperedAt:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"omenWhisperedAt"),
  omenWhisperN:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"omenWhisperN"),
  onQuestZoneCleared:method(()=>this.input.quests,"onQuestZoneCleared"),
  onQuestZoneFieldCleared:method(()=>this.input.quests,"onQuestZoneFieldCleared"),
  openWritHand:method(()=>this.campaignOwner,"openWritHand"),
  oracleDwellRequested:field(()=>this.runtimeState.frame,"oracleDwellRequested"),
  oracleDwellSeatId:field(()=>this.runtimeState.frame,"oracleDwellSeatId"),
  oracleGate:field(()=>this.runtimeState.frame,"oracleGate"),
  ownQuestLedger:field(()=>this.input.campaign,"ownQuestLedger"),
  partyDowns:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"partyDowns"),
  partyMates:method(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"partyMates"),
  pendingTreePips:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"pendingTreePips"),
  pingClocks:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"pingClocks"),
  pings:field(()=>this.runtimeState.frame,"pings"),
  playerCorpses:field(()=>this.input.assembly.input.history.input.state,"playerCorpses"),
  presentWorlds:method(()=>this.input.coordinator,"presentWorlds"),
  atZone:{get:()=> <T>(zoneId:string,fn:(area:import('./nativeAreaDirectoryView').NativeAreaDirectoryView)=>T):T|undefined=>this.input.coordinator.atZone(zoneId,fn)},
  occupiedAudience:method(()=>this.input.coordinator,"occupiedAudience"),
  noticeOccupied:method(()=>this.input.coordinator,"noticeOccupied"),
  fractureRealmContext:field(()=>this.campaignOwner.state,"fractureRealmContext"),
  zoneEntry:field(()=>this.input.assembly.input.geometry,"zoneEntry"),
  ambientCamShift:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"ambientCamShift"),
  scanShardRoads:method(()=>this.campaignFrame,"scanShardRoads"),
  promoteRarityStacked:method(()=>this.input.assembly.input.population,"promoteRarityStacked"),
  veteranFlaskDeals:{get:()=>this.input.characterWriter['veteranFlaskDeals']},
  provisioningFlaskSlots:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"provisioningFlaskSlots"),
  pullToLand:method(()=>this.input.assembly.graph,"pullToLand"),
  questHand:method(()=>this.input.quests,"questHand"),
  questOnZone:method(()=>this.input.assembly.objectiveController,"questOnZone"),
  questRunLedger:method(()=>this.input.quests,"questRunLedger"),
  questStamp:method(()=>this.input.quests,"questStamp"),
  quickenPulseAcc:field(()=>this.runtimeState.frame,"quickenPulseAcc"),
  quickenSweepAcc:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"quickenSweepAcc"),
  realmContext:field(()=>this.campaignOwner.state,"realmContext"),
  realmDwellKey:field(()=>this.runtimeState.frame,"realmDwellKey"),
  realmDwellKind:field(()=>this.runtimeState.frame,"realmDwellKind"),
  realmDwellPos:field(()=>this.runtimeState.frame,"realmDwellPos"),
  realmDwellStart:field(()=>this.runtimeState.frame,"realmDwellStart"),
  recalcSeat:method(()=>this.input.progression,"recalcSeat"),
  reliquaryLesson:method(()=>this.input.campaign,"reliquaryLesson"),
  reqShortfall:method(()=>this.control,"reqShortfall"),
  resurfaceFromDescent:method(()=>this.campaignTransitions,"resurfaceFromDescent"),
  ringClaims:field(()=>this.runtimeState.frame,"ringClaims"),
  riseAmalgamation:method(()=>this.input.assembly.input.registry.input.birth,"riseAmalgamation"),
  roadIsWet:method(()=>this.input.assembly.input.coast,"roadIsWet"),
  sailGate:field(()=>this.runtimeState.frame,"sailGate"),
  salvageDwellRequested:field(()=>this.runtimeState.frame,"salvageDwellRequested"),
  salvageDwellSeatId:field(()=>this.runtimeState.frame,"salvageDwellSeatId"),
  salvageGate:field(()=>this.runtimeState.frame,"salvageGate"),
  screenFade:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"screenFade"),
  seaFromNode:method(()=>this.input.assembly.input.coast,"seaFromNode"),
  seatIdle:method(()=>this.input.questInteraction,"seatIdle"),
  seatQuests:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"seatQuests"),
  shardRoadView:{get:()=>this.campaignFrame.shardRoadView},
  shardWorld:{get:()=>this.input.coordinator.roadsFor(this).shardWorld},
  shelfBuyer:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"shelfBuyer"),
  sidezoneIdFor:method(()=>this.input.watching,"sidezoneIdFor"),
  soundings:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"soundings"),
  spawnEventActor:method(()=>this.input.assembly.input.theater,"spawnEventActor"),
  spawnPatientZero:method(()=>this.input.assembly.input.registry.input.birth,"spawnPatientZero"),
  spoilClamp:method(()=>this.input.assembly.lootController,"spoilClamp"),
  stashedCompanions:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"stashedCompanions"),
  stationArmed:field(()=>this.input.campaign,"stationArmed"),
  strayScene:field(()=>this.input.assembly.input.registry.input.state,"strayScene"),
  streamCoast:method(()=>this.input.assembly.input.coast,"streamCoast"),
  summonCrewSkills:method(()=>this.input.progression,"summonCrewSkills"),
  surveyAround:method(()=>this.input.watching,"surveyAround"),
  swarmStreamTimer:field(()=>this.input.assembly.input.registry.input.state,"swarmStreamTimer"),
  townLayoutChangedOnLoad:field(()=>this.runtimeState.frame,"townLayoutChangedOnLoad"),
  townPortalArrival:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"townPortalArrival"),
  townPortalClientViews:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"townPortalClientViews"),
  townPortalDwell:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"townPortalDwell"),
  townPortalRefusal:method(()=>this.control,"townPortalRefusal"),
  townPortals:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"townPortals"),
  townTierIdx:field(()=>this.input.assembly.input.settlement.input.state,"townTierIdx"),
  traceRests:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"traceRests"),
  traceRuns:field(()=>this.input.assembly.input.occurrences.input.services,"traceRuns"),
  trackerDwellRequested:field(()=>this.runtimeState.frame,"trackerDwellRequested"),
  trackerDwellSeatId:field(()=>this.runtimeState.frame,"trackerDwellSeatId"),
  trackerGate:field(()=>this.runtimeState.frame,"trackerGate"),
  treePopupRequested:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"treePopupRequested"),
  treePopupSeatId:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"treePopupSeatId"),
  treePopupSkillId:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"treePopupSkillId"),
  uiActionSeatId:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"uiActionSeatId"),
  updateQuestGiver:method(()=>this,"updateQuestGiver"),
  updateTraversal:method(()=>this.campaignTransitions,"updateTraversal"),
  vendorArmedBeat:field(()=>this.input.campaign,"vendorArmedBeat"),
  vendorDwellRequested:field(()=>this.runtimeState.frame,"vendorDwellRequested"),
  vendorDwellSeatId:field(()=>this.runtimeState.frame,"vendorDwellSeatId"),
  vendorGate:field(()=>this.runtimeState.frame,"vendorGate"),
  vendorHolds:field(()=>this.input.campaign,"vendorHolds"),
  vendorRestockAt:field(()=>this.input.campaign,"vendorRestockAt"),
  vendorStock:field(()=>this.input.assembly.input.state,"vendorStock"),
  visited:field(()=>this.input.campaign,"visited"),
  vocationSites:field(()=>this.input.assembly.input.sites.input.state,"vocationSites"),
  warbandMarches:field(()=>this.input.assembly.input.registry.input.birth.input.state,"warbandMarches"),
  wardDwellSeal:field(()=>this.runtimeState.frame,"wardDwellSeal"),
  wardDwellStart:field(()=>this.runtimeState.frame,"wardDwellStart"),
  warpSweepAcc:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"warpSweepAcc"),
  wbBoss:field(()=>this.input.assembly.input.registry.input.birth.input.state,"wbBoss"),
  wbBossKey:field(()=>this.input.assembly.input.registry.input.birth.input.state,"wbBossKey"),
  wbPassing:field(()=>this.input.assembly.input.registry.input.state,"wbPassing"),
  wbPassingGoal:field(()=>this.input.assembly.input.registry.input.state,"wbPassingGoal"),
  wbPassingKey:field(()=>this.input.assembly.input.registry.input.state,"wbPassingKey"),
  wbWalls:field(()=>this.input.assembly.input.registry.input.state,"wbWalls"),
  webSettleNextAt:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"webSettleNextAt"),
  webSettleSeenSeq:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"webSettleSeenSeq"),
  wellArr:field(()=>this.runtimeState.frame,"wellArr"),
  wellLen:field(()=>this.runtimeState.frame,"wellLen"),
  wellRev:field(()=>this.runtimeState.frame,"wellRev"),
  wells:field(()=>this.runtimeState.frame,"wells"),
  wispScene:field(()=>this.input.assembly.input.registry.input.state,"wispScene"),
  wpRefusedAt:field(()=>this.runtimeState.frame,"wpRefusedAt"),
  wraithsailSeaStash:field(()=>this.input.assembly.input.state,"wraithsailSeaStash"),
  wraithsailSighted:field(()=>NativeAreaCampaignFrameState.forWriter(this.input.characterWriter),"wraithsailSighted"),
  zoneHasVendorCounter:field(()=>this.input.assembly.transition,"zoneHasVendorCounter"),
  zoneMemory:field(()=>this.input.campaign,"zoneMemory"),
  collectDeedDot:field(()=>this.#frameCallbacks,'collectDeedDot'),
  doodadEffects:field(()=>this.#frameCallbacks,'doodadEffects'),
  incursionEvents:field(()=>this.#frameCallbacks,'incursionEvents'),
  bountyOffers:{get:()=>quests.questLedger().offers,set:value=>{quests.questLedger().offers=value;}},
  bountyBoardState:{get:()=>quests.questLedger().boards,set:value=>{quests.questLedger().boards=value;}},
  countedEnemies:method(()=>assembly.objectiveServices,'countedEnemies'),
  isAmbientTag:{get:()=> (tag)=>sceneIsAmbientTag(assembly.objectiveServices,tag)},
  nativeScenePopulationHost:{get:()=> ()=>this.#populationHost},
  nativeSceneHarborHost:{get:()=> ()=>{this.#operation.assertActiveScope();return this.harborServices.host;}},
  nativeSceneSiteHost:{get:()=> ()=>{this.#operation.assertActiveScope();return this.siteBirths.host;}},
  nativeSettlementHost:{get:()=> ()=>assembly.input.settlement.host},
  questRescues:{get:()=>quests.rescues},
  titans:{get:()=>assembly.input.registry.input.titans.runtime},
  forgetMemoryOnLeave:field(()=>this.input.coordinator.departureFor(this),'forgetMemoryOnLeave'),
  scene:field(()=>quests.input.state,'scene'),
  isPresentLocalPlayer:method(()=>this,'isPresentLocalPlayer'),
  beginCombatActor:method(()=>this.#operation,"beginCombatActor"),
  endCombatActor:method(()=>this.#operation,"endCombatActor"),
  beginCombatStatus:method(()=>this.#operation,"beginCombatStatus"),
  endCombatStatus:method(()=>this.#operation,"endCombatStatus"),
  prepareCombatRetirement:method(()=>this.#operation,"prepareCombatRetirement"),
  finishCombatRetirement:method(()=>this.#operation,"finishCombatRetirement"),
  cancelCombatRetirement:method(()=>this.#operation,"cancelCombatRetirement"),
  constructCombatSource:method(()=>this.#operation,"constructCombatSource"),
  finishCombatExpiredStatuses:method(()=>this.#operation,"finishCombatExpiredStatuses"),
  updateModeRespawn:method(()=>this.campaignFrame,"updateModeRespawn"),
  updateBountyBoard:method(()=>this.campaignFrame,"updateBountyBoard"),
  updateSail:method(()=>this.campaignFrame,"updateSail"),
  updateDelver:method(()=>this.campaignFrame,"updateDelver"),
  updateSailing:method(()=>this.campaignFrame,"updateSailing"),
  performModeRespawn:method(()=>this.campaignFrame,"performModeRespawn"),
  requestMeta:method(()=>this.campaignFrame,"requestMeta"),
  enterSailing:method(()=>this.campaignFrame,"enterSailing"),
  descend:method(()=>this.campaignFrame,"descend"),
  landAshore:method(()=>this.campaignFrame,"landAshore"),
  enterSidezone:method(()=>this.campaignFrame,"enterSidezone"),
  onHoldfastDwell:method(()=>this.campaignFrame,"onHoldfastDwell"),
  realmGates:method(()=>this.campaignFrame,"realmGates"),
  travelThrough:method(()=>this.campaignFrame,"travelThrough"),
  updateTownPortals:method(()=>this.campaignFrame,"updateTownPortals"),
  applyAction:method(()=>this.campaignFrame,"applyAction"),
  enterDimension:method(()=>this.campaignFrame,"enterDimension"),
  enterDemonRealm:method(()=>this.campaignFrame,"enterDemonRealm"),
  enterCrusadeSanctum:method(()=>this.campaignFrame,"enterCrusadeSanctum"),
  enterNecropolis:method(()=>this.campaignFrame,"enterNecropolis"),
  enterFractureRift:method(()=>this.campaignFrame,"enterFractureRift"),
  enterCourtDomain:method(()=>this.campaignFrame,"enterCourtDomain"),
  beginWraithsailBoarding:method(()=>this.campaignFrame,"beginWraithsailBoarding"),
  resumeSpawn:method(()=>this.campaignFrame,"resumeSpawn"),
  applyActionAs:method(()=>this.campaignFrame,"applyActionAs"),
  enterRealmArena:method(()=>this.campaignFrame,"enterRealmArena"),
  resumeCaveLadder:method(()=>this.campaignFrame,"resumeCaveLadder"),
  startCaravan:method(()=>this.campaignFrame,"startCaravan"),
  travelToWaypoint:method(()=>this.campaignFrame,"travelToWaypoint"),
  realmArenaWake:method(()=>this.campaignFrame,"realmArenaWake"),
  isPresentActor:method(()=>this,'isPresentActor'),
  isPresentationArea:method(()=>this,'isPresentationArea'),
  isLocalPresentationActor:method(()=>this,'isLocalPresentationActor'),
  frameSeats:method(()=>this,'frameSeats'),
  isCampaignFrameOwner:method(()=>this.campaignFrame,'isCampaignFrameOwner'),
  cacheShardRoadHost:method(()=>this.campaignFrame,'cacheShardRoadHost'),
  seatDoorOf:method(()=>this.input.coordinator.roadsFor(this),'seatDoorOf'),
  seatLadderOf:method(()=>this.input.coordinator.roadsFor(this),'seatLadderOf'),
  saveCharacter:method(()=>this.input.coordinator,'saveCharacter'),
  nativeSceneGeometryHost:{get:()=> ()=>assembly.input.geometry},
  claimRingSlot:method(()=>this.ai,"claimRingSlot"),
  fallHazardAt:method(()=>this.ai,"fallHazardAt"),
  fleeIntoRefuge:method(()=>this.ai,"fleeIntoRefuge"),
  losCached:method(()=>this.ai,"losCached"),
  lureFor:method(()=>this.ai,"lureFor"),
  onFleeArrive:method(()=>this.ai,"onFleeArrive"),
  pathProfileFor:method(()=>this.ai,"pathProfileFor"),
  pressUsable:method(()=>this.ai,"pressUsable"),
  recentTierCrossing:method(()=>this.ai,"recentTierCrossing"),
  requestEngage:method(()=>this.ai,"requestEngage"),
  sanctuaryRetreat:method(()=>this.ai,"sanctuaryRetreat"),
  seekLoot:method(()=>this.ai,"seekLoot"),
  tierLinkToward:method(()=>this.ai,"tierLinkToward"),
  onBeastEscape:method(()=>this.ai,"onBeastEscape"),
  comboQueuedStep:method(()=>this.ai,"comboQueuedStep"),
  tierLinkSeats:method(()=>this.ai,"tierLinkSeats"),
  seekPrey:method(()=>this.ai,"seekPrey"),
  finalizeGarrison:method(()=>this.combatArena,"finalizeGarrison"),
  garrisonSlotById:method(()=>this.combatArena,"garrisonSlotById"),
  zonePits:method(()=>this.input.assembly.input.geometry,"zonePits"),
  pitHomeKinds:method(()=>this.input.assembly.input.geometry,"pitHomeKinds"),
  nativeSettlementGrid:method(()=>this.input.assembly.input.geometry,"nativeSettlementGrid"),
  tierSeats:field(()=>this.input.assembly.input.geometry,"tierSeats"),
  lures:field(()=>this.input.watching.input.state,"lures"),
  imminentThreatTo:method(()=>this,"imminentThreatTo"),
  losMemo:{get:()=>this.ai.losMemo},
  pathProfiles:{get:()=>this.ai.pathProfiles},
  farPointFrom:this.native(directoryCore.sceneFarPointFrom),
  inputClock:field(()=>NativeAreaCampaignInputState.forWriter(this.input.characterWriter),'inputClock'),
  lastInputSeq:field(()=>NativeAreaCampaignInputState.forWriter(this.input.characterWriter),'lastInputSeq'),
  moveBudget:field(()=>NativeAreaCampaignInputState.forWriter(this.input.characterWriter),'moveBudget'),
  spentPresses:field(()=>NativeAreaCampaignInputState.forWriter(this.input.characterWriter),'spentPresses'),
  skillInputOrder:field(()=>NativeAreaCampaignInputState.forWriter(this.input.characterWriter),'skillInputOrder'),
  noHeld:field(()=>NativeAreaCampaignInputState.forWriter(this.input.characterWriter),'noHeld'),
  improvisedInst:field(()=>NativeAreaCampaignInputState.forWriter(this.input.characterWriter),'improvisedInst'),
  improvisedHinted:field(()=>NativeAreaCampaignInputState.forWriter(this.input.characterWriter),'improvisedHinted'),
  unspentHeld:this.native(inputCore.sceneUnspentHeld),
  spendPresses:this.native(inputCore.sceneSpendPresses),
  spendPress:this.native(inputCore.sceneSpendPress),
  walkFrames:this.native(inputCore.sceneWalkFrames),
  improvisedFor:this.native(inputCore.sceneImprovisedFor),
  harvestFeed:this.native(inputCore.sceneHarvestFeed),
  traceFeed:this.native(inputCore.sceneTraceFeed),
  traceSettle:this.native(inputCore.sceneTraceSettle),
  useMetaSkill:method(()=>this,'useMetaSkill'),
 } satisfies Bindings;return bindings;}
}

installNativeHostedSerializer(NativeAreaSceneCombat.prototype.serializeHostedArea);
