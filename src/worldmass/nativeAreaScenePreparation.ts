import {makeNativeAreaArena} from '../engine/nativeAreaArena';
import {hullOf} from '../world/shape';
import {assertNativeCharacterResume,type NativeCharacterResumeReceipt,type NativeAreaCharacterResume} from './nativeAreaCharacterResume';
import {assertNativeCharacterReceipt,type NativeCharacterCreationReceipt} from './nativeAreaCharacterCreation';
import {foldNativeTownStations} from './nativeAreaTownStations';
import {START_ZONE} from '../data/zones';
/** Concrete native source preparation. A prepared area has no physical runtime authority. */
import {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';
import {vec} from '../core/math';
import type {Actor} from '../engine/actor';
import {LEDGER_ZONES_EXPLORED} from '../meta/account';
import {sceneCampaignOceanBearing,sceneCampaignSeaNameOf} from '../engine/nativeSceneCampaignQueries';
import {NativeAreaCampaignSession,isNativeAreaCampaignSession} from './nativeAreaCampaignSession';
import {NativeAreaSceneTransitionCoordinator,isNativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
import {NativeAreaSceneOngoing,freshAreaOngoingState,type NativeAreaOngoingRuntime,type NativeAreaOngoingInput} from './nativeAreaSceneOngoing';
import {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import {NativeAreaMaddenLedger,assertNativeMaddenLedger} from './nativeAreaMaddenLedger';
import {NativeAreaSceneMemory} from './nativeAreaSceneMemory';
import {MassNativeGeography} from './nativeGeography';
import {NativeGeographyCatalog} from './nativeGeographyCatalog';
import {installedNativeAreaSources,installedNativeAreaConfig} from './nativeAreaInstalledSources';
export interface NativeAreaPreparationInput {session:NativeAreaCampaignSession;coordinator:NativeAreaSceneTransitionCoordinator;authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>;maddenLedger:NativeAreaMaddenLedger;catalog?:NativeGeographyCatalog}
const preparations=new WeakSet<object>();
export function isNativeAreaScenePreparation(value:unknown):value is NativeAreaScenePreparation{return !!value&&typeof value==='object'&&preparations.has(value);}
export class NativeAreaScenePreparation {
 readonly #prepareRealm:(area:NativeAreaSceneOngoing)=>void;
 #resumeOwner:NativeAreaCharacterResume|undefined;
 setProvisionalRestore(token:NativeCharacterResumeReceipt):void {const r=assertNativeCharacterResume(token,'graph');if(r.preparation!==this||this.#resumeOwner)throw Error('Native preparer already has a restore owner');this.#resumeOwner=r.owner;}
 finishProvisionalRestore(source:NativeAreaSceneOngoing,token:NativeCharacterResumeReceipt):void {const r=assertNativeCharacterResume(token,'arrival');if(r.preparation!==this||r.area!==source)throw Error('Foreign provisional restore completion');this.input.coordinator.assertProvisionalRestoreSource(r.owner,source);if(this.#areas.get(source.assembly.input.scene.zone.id)===source)this.#areas.delete(source.assembly.input.scene.zone.id);this.#geography.delete(source);}
 readonly input:Readonly<NativeAreaPreparationInput>;readonly #areas=new Map<string,NativeAreaSceneOngoing>();readonly #geography=new WeakMap<NativeAreaSceneOngoing,MassNativeGeography>();
 constructor(raw:NativeAreaPreparationInput){
  const {session,coordinator,authority,maddenLedger}=raw;if(!isNativeAreaCampaignSession(session)||!isNativeAreaSceneTransitionCoordinator(coordinator)||coordinator.input.campaign!==session.campaign||coordinator.input.characterWriter!==session.writer||coordinator.input.authority!==authority||authority.campaign!==session.campaign)throw Error('Native preparation needs actual shared campaign roots');
  assertNativeRetainedMassState(session.writer);assertNativeMaddenLedger(maddenLedger,session.campaign,authority);const catalogSlot=Object.getOwnPropertyDescriptor(raw,'catalog');if(catalogSlot&&!Object.hasOwn(catalogSlot,'value'))throw Error('Native preparation catalog needs actual data');const catalog=catalogSlot?.value as NativeGeographyCatalog|undefined;if(catalog!==undefined){if(!(catalog instanceof NativeGeographyCatalog)||catalog.initial.seed!==session.writer.manifest.seed)throw Error('Native preparation catalog belongs to another campaign');}this.input=Object.freeze({session,coordinator,authority,maddenLedger,...catalog?{catalog}:{}});Object.defineProperty(this,'input',{writable:false,configurable:false});preparations.add(this);this.#prepareRealm=coordinator.attachPreparation(this);
 }
 assertVoyagePreparation(area:NativeAreaSceneOngoing):void {if(this.#areas.get(area.assembly.input.scene.zone.id)!==area||!this.#geography.has(area))throw Error('Native voyage needs its actual prepared owner');}
 releaseVoyage(area:NativeAreaSceneOngoing):void {Reflect.apply(NativeAreaSceneTransitionCoordinator.prototype.assertVoyageRetirement,this.input.coordinator,[area]);if(this.#areas.get(area.assembly.input.scene.zone.id)!==area)throw Error('Native voyage preparation owner changed');this.#areas.delete(area.assembly.input.scene.zone.id);this.#geography.delete(area);}
 /** Close preparation, including a failed destination never registered for play. */
 retire():readonly NativeAreaSceneOngoing[]{const areas=Object.freeze([...this.#areas.values()]);this.#areas.clear();return areas;}
 /** Select only an actual campaign definition and recorded geography. No callback
  * can substitute a prebirthed scene, area, population, or landing coordinate. */
 prepare(zoneId:string,geography:MassNativeGeography,from?:string,representative?:Actor):NativeAreaSceneOngoing {
  const {session}=this.input,campaign=session.campaign,writer=session.writer;assertNativeRetainedMassState(writer);
  const definition=campaign.zoneMap[zoneId]??campaign.caveMap[zoneId];if(!definition||definition.id!==zoneId||this.#areas.has(zoneId)||!(geography instanceof MassNativeGeography))throw Error('Native preparation needs one actual unresolved area');
  if(this.input.catalog){const selected=this.input.catalog.select(definition.dimension??'surface');selected.assertCompatible(geography.spec);geography=selected;}
  if(zoneId===START_ZONE){writer['townLayoutChangedOnLoad']=false;foldNativeTownStations(writer);}
  const player=representative??campaign.localSeat.actor;
  const area=this.#construct(zoneId,geography,from,player);this.#layout(area,geography);return area;
 }
 #construct(zoneId:string,geography:MassNativeGeography,from:string|undefined,player:Actor,characterConstruction?:NativeCharacterCreationReceipt):NativeAreaSceneOngoing {
  const {session,coordinator,authority,maddenLedger}=this.input,campaign=session.campaign,writer=session.writer,definition=campaign.zoneMap[zoneId]??campaign.caveMap[zoneId];
  if(this.input.catalog){const selected=this.input.catalog.select(definition.dimension??'surface');selected.assertCompatible(geography.spec);geography=selected;}
  const services:NativeAreaOngoingInput['services']={
   geometry:{get seasSeen(){return writer['seasSeen'];},oceanBearing:at=>sceneCampaignOceanBearing(campaign,at),seaNameOf:z=>sceneCampaignSeaNameOf(campaign,z),get notice(){return campaign.notice;},get seatOf(){return campaign.seatOf;}},
   residents:{get clientActionHook(){return campaign.clientActionHook;}},timeflow:campaign.timeflow,
   ecology:{get throngClaimed(){return writer.throngClaimed;}},theater:{get notice(){return campaign.notice;}},
   history:{get notice(){return campaign.notice;},get events(){return writer.events;}},
  };
  const carry={inCave:!campaign.zoneMap[zoneId],entryFrom:from??null,voyage:null,charBorn:writer['charBorn'],charRegrowAcc:writer['charRegrowAcc'],townTierIdx:writer['townTierIdx']};
  const area=new NativeAreaSceneOngoing({definition,player,initialActors:characterConstruction?writer.actors:[player],characterConstruction,campaign,sources:installedNativeAreaSources(campaign),services,carry,config:installedNativeAreaConfig(),...freshAreaOngoingState(campaign.time),authority,maddenLedger,coordinator,characterWriter:writer});
  area.combat.runtimeState.frame.townLayoutChangedOnLoad=zoneId===START_ZONE&&writer['townLayoutChangedOnLoad'];
  this.#areas.set(zoneId,area);this.#geography.set(area,geography);
  this.#prepareRealm(area);
  return area;
 }
 #layout(area:NativeAreaSceneOngoing,geography:MassNativeGeography):void {
  const {session}=this.input,campaign=session.campaign,definition=area.assembly.input.scene.zone,zoneId=definition.id,carry=area.assembly.transition;
  session.duringPreparation(area,()=>{
   const source=area.assembly.sourceSession(geography),ticket=source.issue(zoneId),firstVisit=!carry.inCave&&!campaign.visited.has(zoneId);
   // Exact visit/deed/concealment statements at the original pre-layout point.
   // Existing retained-area controller/realm handoff is a separate operation.
   if(!carry.inCave){campaign.visited.add(zoneId);if(firstVisit&&area.assembly.objectiveController.metaProgressionActive()){campaign.account.ledger[LEDGER_ZONES_EXPLORED]=(campaign.account.ledger[LEDGER_ZONES_EXPLORED]??0)+1;campaign.accountDirty=true;}if(definition.concealed)definition.concealed=false;if(definition.veiled)definition.veiled=false;}
   Reflect.apply(NativeAreaSceneTransitionCoordinator.prototype.prepareVoyageSurface,this.input.coordinator,[area]);
   area.assembly.prepare(source,ticket,vec(definition.size.w/2,definition.size.h/2),firstVisit);
  });
 }
 constructInitialCharacter(token:NativeCharacterCreationReceipt,zoneId:string,geography:MassNativeGeography):NativeAreaSceneOngoing {const r=assertNativeCharacterReceipt(token,'construct');if(r.preparation!==this||this.#areas.size||zoneId!==r.writer.zoneMap[zoneId]?.id||geography.seed!==r.writer.manifest.seed)throw Error('Native character needs its exact unprepared first area');return this.#construct(zoneId,geography,undefined,r.seat.actor,token);}
 prepareInitialCharacter(token:NativeCharacterCreationReceipt):void {const r=assertNativeCharacterReceipt(token,'birth'),area=r.area;if(r.preparation!==this||!area||this.#areas.get(area.assembly.input.scene.zone.id)!==area||area.assembly.phase!=='fresh')throw Error('Native character preparation differs');
  // The original load follows party/join; account rewards acquired there belong in this first layout.
  r.writer['townLayoutChangedOnLoad']=false;foldNativeTownStations(r.writer);assertNativeCharacterReceipt(token,'birth');
  const {geometry,settlement,scene}=area.assembly.input;geometry.arena=makeNativeAreaArena(scene.zone);geometry.arenaHull=hullOf(geometry.arena);
  settlement.input.state.townTierIdx=r.writer['townTierIdx'];area.combat.runtimeState.frame.townLayoutChangedOnLoad=r.writer['townLayoutChangedOnLoad'];
  area.assembly.scenePresence.includeInitialCharacter(token);area.assembly.input.population.includeInitialCharacter(token);r.writer.zone=area.assembly.input.scene.zone;r.writer.zoneEnteredAt=r.writer.time;r.writer.arena=area.assembly.input.geometry.arena;this.#layout(area,this.#geography.get(area)!);}

 /** The coordinator selects this same source's recorded geography. Preparation
  * returns its exact real area; no caller supplies a prebirthed destination. */
 prepareDestination(source:NativeAreaSceneOngoing,zoneId:string,from:string|undefined,representative:Actor):NativeAreaSceneOngoing {
  const geography=this.#geography.get(source);if(!geography||this.#areas.get(source.assembly.input.scene.zone.id)!==source||this.input.coordinator.current!==source)throw Error('Native destination requires this preparer and exact current source');
  if(this.#areas.has(zoneId)&&this.#areas.get(zoneId)!==source)throw Error('Native destination already has another prepared owner');
  const same=this.#areas.get(zoneId)===source;if(same)this.input.coordinator.assertProvisionalRestoreSource(this.#resumeOwner!,source);
  const definition=this.input.session.campaign.zoneMap[zoneId]??this.input.session.campaign.caveMap[zoneId];if(!definition||definition.id!==zoneId)throw Error('Native destination definition is absent');
  const selected=this.input.catalog?this.input.catalog.select(definition.dimension??'surface'):geography;
  if(same)this.#areas.delete(zoneId);return this.prepare(zoneId,selected,from,representative);
 }
 birthTransferred(area:NativeAreaSceneOngoing):void {
  assertNativeRetainedMassState(this.input.session.writer);
  if(this.#areas.get(area.assembly.input.scene.zone.id)!==area||area.assembly.phase!=='prepared'||this.input.coordinator.current!==area)throw Error('Native transferred birth needs its exact current prepared destination');
  this.input.authority.assertFinalPhysical(area.binding);
  this.input.session.duringPreparation(area,()=>area.assembly.birth());
  area.admit([...area.assembly.input.scene.actors]);
 }
 /** Initial local hero only. Moving an admitted cohort into a new area must use
  * the coordinator's explicit provisional transfer before native birth. */
 birthInitial(area:NativeAreaSceneOngoing):void {
  assertNativeRetainedMassState(this.input.session.writer);
  const {session,coordinator,authority}=this.input,scene=area.assembly.input.scene;
  if(this.#areas.get(scene.zone.id)!==area||area.assembly.phase!=='prepared'||scene.player!==session.campaign.localSeat.actor||scene.actors.length!==1||scene.actors[0]!==scene.player)throw Error('Native initial birth needs its exact prepared local hero');
  authority.assertUnclaimed(scene.player);const placement=area.assembly.preparedPlacement;if(!placement)throw Error('Native prepared area lost placement');
  session.duringPreparation(area,()=>{scene.player.pos=area.assembly.input.geometry.clampPos({...placement.spawnAt??placement.entry},scene.player.radius);area.assembly.birth();});
  area.admit([...scene.actors]);const memory=new NativeAreaSceneMemory(area.assembly,authority);coordinator.register(area,memory);coordinator.publishInitial(area);
 }
}
