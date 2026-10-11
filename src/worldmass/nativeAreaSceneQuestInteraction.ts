/** Retained quest interaction; exact native rules with physical hand admission. */
import type {World,Seat} from '../engine/world';
import type {Actor} from '../engine/actor';
import {NativeAreaSceneQuests,type NativeQuestCampaign} from './nativeAreaSceneQuests';
import * as native from '../engine/nativeSceneQuestInteraction';
type Host=native.NativeSceneQuestInteractionHost;
export type NativeQuestInteractionCampaign=NativeQuestCampaign & Pick<Host,'journalDirty'|'netJournal'|'heroKnown'|'bagItem'>;
export interface NativeSceneQuestInteractionState {
 questGiverDwell:number;questGiverDwells:WeakMap<Seat,number>;
 vocationOfferRequested:boolean;vocationOfferDeclined:boolean;
}
export function freshSceneQuestInteractionState():NativeSceneQuestInteractionState {
 return {questGiverDwell:0,questGiverDwells:new WeakMap(),vocationOfferRequested:false,vocationOfferDeclined:false};
}
export interface NativeSceneQuestInteractionInput {
 quests:NativeAreaSceneQuests;campaign:NativeQuestInteractionCampaign;state:NativeSceneQuestInteractionState;
}
export class NativeAreaSceneQuestInteraction {
 readonly input:NativeSceneQuestInteractionInput;readonly host:Host;
 #attendance=new WeakMap<Seat,{actor:Actor;revision:number}>();
 constructor(raw:NativeSceneQuestInteractionInput){
  const bindings=Object.create(null);
  for(const key of ['quests','campaign','state']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native quest interaction needs own object binding: '+key);
   bindings[key]=d.value;
  }
  const input:NativeSceneQuestInteractionInput=this.input=Object.freeze(bindings),quests=input.quests;
  if(!(quests instanceof NativeAreaSceneQuests)||input.campaign!==quests.input.campaign)
   throw Error('Native quest interaction needs identical area and campaign owners');
  const host=Object.create(quests.host) as Host,self=this;
  const fields=(provider:()=>object,keys:readonly string[],write=false)=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,
   get(){return (provider() as Record<string,unknown>)[key];},...(write?{set(v:unknown){(provider() as Record<string,unknown>)[key]=v;}}:{})});};
  const methods=(provider:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){
   const owner=provider() as Record<string,Function>,fn=owner[key];if(typeof fn!=='function')throw Error('Missing native quest interaction capability: '+key);
   return (...args:unknown[])=>fn.apply(owner,args);
  }});};
  fields(()=>input.state,['questGiverDwell','questGiverDwells','vocationOfferRequested','vocationOfferDeclined'],true);
  fields(()=>input.campaign,['journalDirty','netJournal']);fields(()=>input.campaign,['actingSeat'],true);
  Object.defineProperty(host,'player',{get:()=>input.campaign.localSeat.actor});
  Object.defineProperty(host,'odyssey',{value:quests.odyssey});
  methods(()=>input.campaign,['heroKnown','bagItem']);methods(()=>self,['seatIdle','playerIdle']);
  Object.defineProperty(host,'ensureQuestCargo',{value:()=>input.campaign.localSeat.keeper?quests.ensureQuestCargo():quests.ensureSoloInteractionQuestCargo()});
  methods(()=>self,["nearQuestGiver","nearAnyQuestGiver","questGiverPrompt","activeCategoryCounts","questGateCtx","questOfferLevel","acceptableQuests","eligibleQuestCandidates","vocationEngaged","isVocationChoice","vocationChoiceOffers","nextAcceptableQuest","updateQuestGiver","questGiverStep","questOfferChoices","acceptQuestOffer","acceptVocationQuest","vocationMenuOffers","declineVocationOffer","acceptQuest","questRewardOffers","questImbueOffers","claimQuestImbue","reliquaryLesson"]);
  // Whole native areas have no partition-cell settlement loop. The shared
  // native body retains its original branch for the World integration.
  Object.defineProperty(host,'settleHeroMassQuests',{value:()=>{throw Error('Whole native area has no mass quest policy');}});
  this.host=Object.freeze(host);
  for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 #present(seat:Seat):boolean {const {authority,scene}=this.input.quests.input;return authority.seatsFor(authority.bindingFor(scene)).includes(seat);}
 #reset(seat:Seat):void {
  this.input.state.questGiverDwells.delete(seat);
  if(seat===this.input.campaign.localSeat){this.input.state.questGiverDwell=0;this.input.state.vocationOfferDeclined=false;this.input.state.vocationOfferRequested=false;}
 }
 #sync(seat:Seat):boolean {
  if(!this.#present(seat)){this.#reset(seat);this.#attendance.delete(seat);return false;}
  const {authority}=this.input.quests.input,actor=seat.actor,revision=authority.attendanceRevision(actor),prior=this.#attendance.get(seat);
  if(!prior||prior.actor!==actor||prior.revision!==revision)this.#reset(seat);
  this.#attendance.set(seat,{actor,revision});return true;
 }
 /** Read the actual seat clock and body's native quiescence; movement writers remain external. */
 seatIdle:World['seatIdle']=(seat)=>{
  if(!this.#present(seat))return false;
  this.input.quests.input.authority.assertAdmitted(this.input.quests.input.scene);
  return native.sceneSeatIdle(this.host,seat);
 };
 playerIdle:World['playerIdle']=(...args)=>native.scenePlayerIdle(this.host,...args);
 nearAnyQuestGiver:World['nearAnyQuestGiver']=(...args)=>{
  const hand=this.input.quests.questHand();
  if(!this.#present(hand))return false;
  this.input.quests.input.authority.assertAdmitted(this.input.quests.input.scene);
  const localHost=Object.create(this.host) as Host;Object.defineProperty(localHost,'questHand',{value:()=>hand});
  return native.sceneNearAnyQuestGiver(localHost,...args);
 };
 updateQuestGiver:World['updateQuestGiver']=(...args)=>{
  const {authority,scene}=this.input.quests.input;authority.assertAdmitted(scene);
  const local=this.input.campaign.localSeat;
  if(!local.keeper&&!this.#sync(local))return;
  return native.sceneUpdateQuestGiver(this.host,...args);
 };
 questGiverStep:World['questGiverStep']=(seat,...args)=>{
  const {authority,scene}=this.input.quests.input;
  if(this.#present(seat))authority.assertAdmitted(scene);
  if(!this.#sync(seat))return;
  return native.sceneQuestGiverStep(this.host,seat,...args);
 };
nearQuestGiver:World['nearQuestGiver']=(...args)=>native.sceneNearQuestGiver(this.host,...args);
questGiverPrompt:World['questGiverPrompt']=(...args)=>native.sceneQuestGiverPrompt(this.host,...args);
activeCategoryCounts:World['activeCategoryCounts']=(...args)=>native.sceneActiveCategoryCounts(this.host,...args);
questGateCtx:World['questGateCtx']=(...args)=>native.sceneQuestGateCtx(this.host,...args);
questOfferLevel:World['questOfferLevel']=(...args)=>native.sceneQuestOfferLevel(this.host,...args);
acceptableQuests:World['acceptableQuests']=(...args)=>native.sceneAcceptableQuests(this.host,...args);
eligibleQuestCandidates:World['eligibleQuestCandidates']=(...args)=>native.sceneEligibleQuestCandidates(this.host,...args);
vocationEngaged:World['vocationEngaged']=(...args)=>native.sceneVocationEngaged(this.host,...args);
isVocationChoice:World['isVocationChoice']=(...args)=>native.sceneIsVocationChoice(this.host,...args);
vocationChoiceOffers:World['vocationChoiceOffers']=(...args)=>native.sceneVocationChoiceOffers(this.host,...args);
nextAcceptableQuest:World['nextAcceptableQuest']=(...args)=>native.sceneNextAcceptableQuest(this.host,...args);
questOfferChoices:World['questOfferChoices']=(...args)=>native.sceneQuestOfferChoices(this.host,...args);
acceptQuestOffer:World['acceptQuestOffer']=(...args)=>native.sceneAcceptQuestOffer(this.host,...args);
acceptVocationQuest:World['acceptVocationQuest']=(...args)=>native.sceneAcceptVocationQuest(this.host,...args);
vocationMenuOffers:World['vocationMenuOffers']=(...args)=>native.sceneVocationMenuOffers(this.host,...args);
declineVocationOffer:World['declineVocationOffer']=(...args)=>native.sceneDeclineVocationOffer(this.host,...args);
acceptQuest:World['acceptQuest']=(...args)=>{
 const hand=this.input.quests.questHand();if(!this.#present(hand))return;
 this.input.quests.input.authority.assertAdmitted(this.input.quests.input.scene);
 return native.sceneAcceptQuest(this.host,...args);
};
questRewardOffers:World['questRewardOffers']=(...args)=>native.sceneQuestRewardOffers(this.host,...args);
questImbueOffers:World['questImbueOffers']=(...args)=>native.sceneQuestImbueOffers(this.host,...args);
claimQuestImbue:World['claimQuestImbue']=(...args)=>native.sceneClaimQuestImbue(this.host,...args);
reliquaryLesson:World['reliquaryLesson']=(...args)=>native.sceneReliquaryLesson(this.host,...args);
}
