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
import {installedNativeAreaSources,installedNativeAreaConfig} from './nativeAreaInstalledSources';
export interface NativeAreaPreparationInput {session:NativeAreaCampaignSession;coordinator:NativeAreaSceneTransitionCoordinator;authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>;maddenLedger:NativeAreaMaddenLedger}
const preparations=new WeakSet<object>();
export function isNativeAreaScenePreparation(value:unknown):value is NativeAreaScenePreparation{return !!value&&typeof value==='object'&&preparations.has(value);}
export class NativeAreaScenePreparation {
 readonly input:Readonly<NativeAreaPreparationInput>;readonly #areas=new Map<string,NativeAreaSceneOngoing>();readonly #geography=new WeakMap<NativeAreaSceneOngoing,MassNativeGeography>();
 constructor(raw:NativeAreaPreparationInput){
  const {session,coordinator,authority,maddenLedger}=raw;if(!isNativeAreaCampaignSession(session)||!isNativeAreaSceneTransitionCoordinator(coordinator)||coordinator.input.campaign!==session.campaign||coordinator.input.characterWriter!==session.writer||coordinator.input.authority!==authority||authority.campaign!==session.campaign)throw Error('Native preparation needs actual shared campaign roots');
  assertNativeRetainedMassState(session.writer);assertNativeMaddenLedger(maddenLedger,session.campaign,authority);this.input=Object.freeze({session,coordinator,authority,maddenLedger});Object.defineProperty(this,'input',{writable:false,configurable:false});preparations.add(this);coordinator.attachPreparation(this);
 }
 /** Select only an actual campaign definition and recorded geography. No callback
  * can substitute a prebirthed scene, area, population, or landing coordinate. */
 prepare(zoneId:string,geography:MassNativeGeography,from?:string,representative?:Actor):NativeAreaSceneOngoing {
  const {session,coordinator,authority,maddenLedger}=this.input,campaign=session.campaign,writer=session.writer;assertNativeRetainedMassState(writer);
  const definition=campaign.zoneMap[zoneId]??campaign.caveMap[zoneId];if(!definition||definition.id!==zoneId||this.#areas.has(zoneId)||!(geography instanceof MassNativeGeography))throw Error('Native preparation needs one actual unresolved area');
  const player=representative??campaign.localSeat.actor;
  const services:NativeAreaOngoingInput['services']={
   geometry:{get seasSeen(){return writer['seasSeen'];},oceanBearing:at=>sceneCampaignOceanBearing(campaign,at),seaNameOf:z=>sceneCampaignSeaNameOf(campaign,z),get notice(){return campaign.notice;},get seatOf(){return campaign.seatOf;}},
   residents:{get clientActionHook(){return campaign.clientActionHook;}},timeflow:campaign.timeflow,
   ecology:{get throngClaimed(){return writer.throngClaimed;}},theater:{get notice(){return campaign.notice;}},
   history:{get notice(){return campaign.notice;},get events(){return writer.events;}},
  };
  const carry={inCave:!campaign.zoneMap[zoneId],entryFrom:from??null,voyage:null,charBorn:writer['charBorn'],charRegrowAcc:writer['charRegrowAcc'],townTierIdx:writer['townTierIdx']};
  const area=new NativeAreaSceneOngoing({definition,player,initialActors:[player],campaign,sources:installedNativeAreaSources(campaign),services,carry,config:installedNativeAreaConfig(),...freshAreaOngoingState(campaign.time),authority,maddenLedger,coordinator,characterWriter:writer});
  this.#areas.set(zoneId,area);this.#geography.set(area,geography);
  session.duringPreparation(area,()=>{
   const source=area.assembly.sourceSession(geography),ticket=source.issue(zoneId),firstVisit=!carry.inCave&&!campaign.visited.has(zoneId);
   // Exact visit/deed/concealment statements at the original pre-layout point.
   // Existing retained-area controller/realm handoff is a separate operation.
   if(!carry.inCave){campaign.visited.add(zoneId);if(firstVisit&&area.assembly.objectiveController.metaProgressionActive()){campaign.account.ledger[LEDGER_ZONES_EXPLORED]=(campaign.account.ledger[LEDGER_ZONES_EXPLORED]??0)+1;campaign.accountDirty=true;}if(definition.concealed)definition.concealed=false;if(definition.veiled)definition.veiled=false;}
   area.assembly.prepare(source,ticket,vec(definition.size.w/2,definition.size.h/2),firstVisit);
  });
  return area;
 }
 /** The coordinator selects this same source's recorded geography. Preparation
  * returns its exact real area; no caller supplies a prebirthed destination. */
 prepareDestination(source:NativeAreaSceneOngoing,zoneId:string,from:string|undefined,representative:Actor):NativeAreaSceneOngoing {
  const geography=this.#geography.get(source);if(!geography||this.#areas.get(source.assembly.input.scene.zone.id)!==source||this.input.coordinator.current!==source)throw Error('Native destination requires this preparer and exact current source');
  return this.prepare(zoneId,geography,from,representative);
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
