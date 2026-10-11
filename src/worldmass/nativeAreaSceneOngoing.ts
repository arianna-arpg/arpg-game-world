/** Complete ongoing quest/progression/objective composition over one born area.
 * Combat, movement and the campaign writer remain required real runtime owners.
 * Construction is not physical publication, scheduling or save registration. */
import type {World} from '../engine/world';
import type {Actor} from '../engine/actor';
import {NativeAreaSceneAssembly,type NativeAreaAssemblyInput,type NativeAreaAssemblyCampaign} from './nativeAreaSceneAssembly';
import {NativeAreaActorAuthority,type NativeAreaAuthorityBinding} from './nativeAreaActorAuthority';
import {NativeAreaSceneProgression,freshSceneProgressionState,type NativeSceneProgressionCampaign,type NativeSceneProgressionCombat,type NativeSceneProgressionRuntime,type NativeSceneProgressionState} from './nativeAreaSceneProgression';
import {NativeAreaSceneQuests,freshSceneQuestState,type NativeQuestCampaign,type NativeSceneQuestState,type NativeSceneQuestRewardRuntime} from './nativeAreaSceneQuests';
import {NativeAreaSceneQuestInteraction,freshSceneQuestInteractionState,type NativeQuestInteractionCampaign,type NativeSceneQuestInteractionState} from './nativeAreaSceneQuestInteraction';
import {NativeAreaSceneObjectiveWatching,freshSceneObjectiveWatchingState,type NativeSceneObjectiveWatchingInput,type NativeSceneObjectiveWatchingState} from './nativeAreaSceneObjectiveWatching';

export type NativeAreaOngoingCampaign=NativeAreaAssemblyCampaign & NativeQuestCampaign & NativeQuestInteractionCampaign & NativeSceneProgressionCampaign & NativeSceneObjectiveWatchingInput['campaign'];
export type NativeAreaOngoingRuntime=NativeSceneProgressionRuntime & NativeSceneQuestRewardRuntime;
export interface NativeAreaOngoingInput extends Omit<NativeAreaAssemblyInput,'campaign'|'services'> {
 campaign:NativeAreaOngoingCampaign;
 services:Omit<NativeAreaAssemblyInput['services'],'objectiveProgression'|'objectiveQuests'|'residents'> & {residents:Omit<NativeAreaAssemblyInput['services']['residents'],'scene'>};
 authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>;
 /** Construct the actual area combat owner. It must retain these same native queues. */
 combatFor:(assembly:NativeAreaSceneAssembly,progression:NativeAreaSceneProgression)=>NativeSceneProgressionCombat;
 /** The campaign's real writer, with whole-area publication/save registration supplied externally. */
 characterWriter:World;
 progressionState:NativeSceneProgressionState;
 questState:NativeSceneQuestState;
 interactionState:NativeSceneQuestInteractionState;
 watchingState:NativeSceneObjectiveWatchingState;
}
/** Fresh state is allocated once per complete area, never per visibility change. */
export function freshAreaOngoingState(enteredAt:number){return {progressionState:freshSceneProgressionState(),questState:freshSceneQuestState(),interactionState:freshSceneQuestInteractionState(),watchingState:freshSceneObjectiveWatchingState(enteredAt)};}
export class NativeAreaSceneOngoing {
 readonly assembly:NativeAreaSceneAssembly;
 readonly progression:NativeAreaSceneProgression;
 readonly quests:NativeAreaSceneQuests;
 readonly questInteraction:NativeAreaSceneQuestInteraction;
 readonly watching:NativeAreaSceneObjectiveWatching;
 readonly combat:NativeSceneProgressionCombat;
 readonly authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>;
 readonly binding:NativeAreaAuthorityBinding<NativeAreaOngoingRuntime>;
 constructor(raw:NativeAreaOngoingInput){
  if(raw.authority.campaign!==raw.campaign)throw Error('Native ongoing owners need identical campaign authority');
  this.authority=raw.authority;
  const campaign=raw.campaign,questState=raw.questState,residentServices=raw.services.residents;
  // These closures resolve the actual owners built below before any birth or tick.
  const services:NativeAreaAssemblyInput['services']={...raw.services,
   residents:{get scene(){return questState.scene;},get clientActionHook(){return residentServices.clientActionHook;},viewRectFor:(...args)=>residentServices.viewRectFor(...args)},
   objectiveProgression:{recalcSeat:seat=>this.progression.recalcSeat(seat),resyncMercenary:()=>this.progression.resyncMercenary()},
   objectiveQuests:{questLedgerOf:seat=>campaign.questLedgerOf(seat),onQuestZoneFieldCleared:(...args)=>this.quests.onQuestZoneFieldCleared(...args)}};
  const assembly=this.assembly=new NativeAreaSceneAssembly({...raw,services});
  const {scene,geometry,population,physical,bounty,coast,registry,objectives,state,environment,theater,adoption}=assembly.input;
  this.progression=new NativeAreaSceneProgression({scene,population,geometry,ecology:assembly.input.ecology,runtime:registry.input.birth,loot:assembly.lootController,campaign:raw.campaign,state:raw.progressionState,authority:raw.authority});
  this.quests=new NativeAreaSceneQuests({authority:raw.authority,scene,geometry,population,physical,loot:assembly.lootController,bounty,graph:assembly.graph,coast,runtimeBirth:registry.input.birth,
   campaign:raw.campaign,state:raw.questState,scenePresence:assembly.scenePresence,objective:assembly.objectiveController,progression:this.progression,interaction:geometry,characterWriter:raw.characterWriter});
  this.questInteraction=new NativeAreaSceneQuestInteraction({quests:this.quests,campaign:raw.campaign,state:raw.interactionState});
  this.watching=new NativeAreaSceneObjectiveWatching({authority:raw.authority,scene,geometry,population,objectives,state:raw.watchingState,birthState:state,
   environment,physical,completion:assembly.objectiveController,loot:assembly.lootController,graph:assembly.graph,coast,theater,adoption,objectiveServices:assembly.objectiveServices,
   campaign:raw.campaign,quests:this.quests,movement:raw.services.theater});
  this.combat=raw.combatFor(assembly,this.progression);
  if(this.combat.scene!==scene||this.combat.state!==raw.progressionState)throw Error('Native ongoing combat needs identical scene and retained queues');
  this.binding=raw.authority.register(scene,{progression:this.progression,combat:this.combat,loot:assembly.lootController,objective:assembly.objectiveController});
  for(const key of ['assembly','progression','quests','questInteraction','watching','combat','authority','binding'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 /** The publisher supplies the exact physical census after removing borrowed
  * observers and performing any explicitly authorized transfers. No bodies move here. */
 admit(physicalActors:readonly Actor[]):void{
  if(this.assembly.phase!=='born')throw Error('Native ongoing admission needs completed area birth');
  const scene=this.assembly.input.scene;
  if(physicalActors.length!==scene.actors.length||physicalActors.some((a,i)=>a!==scene.actors[i]))throw Error('Native ongoing admission needs the exact physical census');
  const relayBodies=new Set(physicalActors);
  for(const seat of this.authority.campaign.seats)if(physicalActors.includes(seat.actor)&&seat.home&&seat.home!==seat.actor&&seat.actor.possession?.huskMode==='carried'){
   if(seat.actor.possession.seatId!==seat.id)throw Error('Native ongoing admission has a stale carried hero');
   relayBodies.add(seat.home);
  }
  for(const actor of relayBodies){const d=Object.getOwnPropertyDescriptor(actor,'statusRelay');if(d?(!Object.hasOwn(d,'value')||!d.writable):!Object.isExtensible(actor))throw Error('Native ongoing admission needs transferable status routing');}
  this.authority.claim(this.binding,physicalActors);
  // Preparation preserves the previous owner. Only explicit admission takes routing.
  for(const actor of relayBodies)actor.statusRelay=this.assembly.input.population.factory.relayStatus;
  this.assembly.activatePresence(this.authority);
 }
 /** The external scheduler calls the native giver loop only after physical admission.
  * The interaction owner selects actual local hands and owns their native dwell state. */
 updateQuestGiver(dt:number):void{
  if(!this.assembly.scenePresence.active)throw Error('Native quest interaction needs admitted attendance');
  this.questInteraction.updateQuestGiver(dt);
 }
 /** Called by the area scheduler only with its actual representative present. */
 updateObjective(dt:number):void{
  if(!this.assembly.scenePresence.active)throw Error('Native objective watching needs admitted attendance');
  this.watching.updateObjective(dt);
 }
}
