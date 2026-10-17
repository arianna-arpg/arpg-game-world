/** Complete ongoing quest/progression/objective composition over one born area.
 * Combat, movement and the campaign writer remain required real runtime owners.
 * Construction is not physical publication, scheduling or save registration. */
import {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';
import type {World} from '../engine/world';
import {NativeAreaSceneCombat,type NativeAreaCombatServices} from './nativeAreaSceneCombat';
import type {NativeAreaMaddenLedger} from './nativeAreaMaddenLedger';
import type {NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
import type {Actor} from '../engine/actor';
import {NativeAreaScenePresence} from './nativeAreaScenePresence';
import {NativeAreaSceneAssembly,type NativeAreaAssemblyInput,type NativeAreaAssemblyCampaign} from './nativeAreaSceneAssembly';
import {NativeAreaActorAuthority,type NativeAreaAuthorityBinding} from './nativeAreaActorAuthority';
import {NativeAreaSceneProgression,freshSceneProgressionState,type NativeSceneProgressionCampaign,type NativeSceneProgressionState} from './nativeAreaSceneProgression';
import {NativeAreaSceneQuests,freshSceneQuestState,type NativeQuestCampaign,type NativeSceneQuestState,type NativeSceneQuestRewardRuntime} from './nativeAreaSceneQuests';
import {NativeAreaSceneQuestInteraction,freshSceneQuestInteractionState,type NativeQuestInteractionCampaign,type NativeSceneQuestInteractionState} from './nativeAreaSceneQuestInteraction';
import {NativeAreaSceneObjectiveWatching,freshSceneObjectiveWatchingState,type NativeSceneObjectiveWatchingInput,type NativeSceneObjectiveWatchingState} from './nativeAreaSceneObjectiveWatching';

function liveServices<T extends object,K extends keyof T>(owner:T,keys:readonly K[]):Pick<T,K>{const view={} as Pick<T,K>;for(const key of keys)Object.defineProperty(view,key,{enumerable:true,get(){const value=owner[key];return typeof value==='function'?(...args:unknown[])=>Reflect.apply(value,owner,args):value;}});return view;}
export type NativeAreaOngoingCampaign=Pick<World,'seatOfRoot'|'partyRows'> & NativeAreaAssemblyCampaign & NativeQuestCampaign & NativeQuestInteractionCampaign & NativeSceneProgressionCampaign & NativeSceneObjectiveWatchingInput['campaign'];
export type NativeAreaOngoingRuntime=NativeAreaCombatServices & NativeSceneQuestRewardRuntime;
export interface NativeAreaOngoingInput extends Omit<NativeAreaAssemblyInput,'campaign'|'services'> {
 campaign:NativeAreaOngoingCampaign;
 services:Omit<NativeAreaAssemblyInput['services'],'objectiveProgression'|'objectiveQuests'|'residents'|'population'|'puzzleEffects'|'geometry'|'theater'> & {geometry:Omit<NativeAreaAssemblyInput['services']['geometry'],'drainSurvival'>;theater:Pick<NativeAreaAssemblyInput['services']['theater'],'notice'>;residents:Omit<NativeAreaAssemblyInput['services']['residents'],'scene'|'viewRectFor'|'questStanding'|'questDefOf'>};
 authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>;
 /** The actual session ledger and concrete transition coordinator are shared. */
 maddenLedger:NativeAreaMaddenLedger;
 coordinator:NativeAreaSceneTransitionCoordinator;
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
 readonly #characterWriter:World;
 readonly #relay:NonNullable<Actor['statusRelay']>;
 readonly #phase:()=>NativeAreaSceneAssembly['phase'];
 readonly #claimFinal:NativeAreaActorAuthority<NativeAreaOngoingRuntime>['claimFinal'];
 readonly #presence:Readonly<Pick<NativeAreaScenePresence,'assertFinalActivation'|'activateFinal'>>;
 readonly #activation:Readonly<Pick<NativeAreaSceneCombat,'prepareActivation'|'assertActivation'|'activate'>>;
 readonly assembly:NativeAreaSceneAssembly;
 readonly progression:NativeAreaSceneProgression;
 readonly quests:NativeAreaSceneQuests;
 readonly questInteraction:NativeAreaSceneQuestInteraction;
 readonly watching:NativeAreaSceneObjectiveWatching;
 readonly combat:NativeAreaSceneCombat;
 readonly authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>;
 readonly binding:NativeAreaAuthorityBinding<NativeAreaOngoingRuntime>;
 constructor(raw:NativeAreaOngoingInput){
  const writerSlot=raw&&Object.getOwnPropertyDescriptor(raw,'characterWriter');if(!writerSlot||!Object.hasOwn(writerSlot,'value'))throw Error('Native ongoing needs its own actual character writer');const characterWriter:World=writerSlot.value;assertNativeRetainedMassState(characterWriter);this.#characterWriter=characterWriter;
  if(raw.authority.campaign!==raw.campaign)throw Error('Native ongoing owners need identical campaign authority');
  this.authority=raw.authority;
  const self=this,campaign=raw.campaign,questState=raw.questState,residentServices=raw.services.residents;
  // These closures resolve the actual owners built below before any birth or tick.
  const services:NativeAreaAssemblyInput['services']={...raw.services,
   geometry:Object.assign(liveServices(raw.services.geometry,['seasSeen','oceanBearing','seaNameOf','notice','seatOf']),{drainSurvival:(...args:Parameters<World['drainSurvival']>)=>this.combat.drainSurvival(...args)}),
   theater:{get notice(){const owner=raw.services.theater,fn=owner.notice;return(...args:Parameters<World['notice']>)=>Reflect.apply(fn,owner,args);},get geyserMode(){return self.combat.runtimeState.motion.geyserMode;},imminentThreatTo:(...args)=>this.combat.imminentThreatTo(...args),plantDressAt:(...args)=>this.combat.plantDressAt(...args),moveActor:(...args)=>this.combat.moveActor(...args),slipAway:(...args)=>this.combat.slipAway(...args)},
   residents:{get questStanding(){const owner=self.quests,fn=owner.questStanding;return(...args:Parameters<World['questStanding']>)=>Reflect.apply(fn,owner,args);},get questDefOf(){const owner=self.quests,fn=owner.questDefOf;return(...args:Parameters<World['questDefOf']>)=>Reflect.apply(fn,owner,args);},get scene(){return questState.scene;},get clientActionHook(){return residentServices.clientActionHook;},viewRectFor:(...args)=>this.combat.viewRectFor(...args)},
   population:{resolveHit:(...args)=>this.combat.resolveHit(...args)},
   puzzleEffects:{executeSkill:(...args)=>this.combat.executeSkill(...args)},
   objectiveProgression:{recalcSeat:seat=>this.progression.recalcSeat(seat),resyncMercenary:()=>this.progression.resyncMercenary()},
   objectiveQuests:{questLedgerOf:seat=>campaign.questLedgerOf(seat),onQuestZoneFieldCleared:(...args)=>this.quests.onQuestZoneFieldCleared(...args)}};
  const assembly=this.assembly=new NativeAreaSceneAssembly({...raw,services});
  const phase=Object.getOwnPropertyDescriptor(NativeAreaSceneAssembly.prototype,'phase')!.get!;
  this.#phase=()=>Reflect.apply(phase,assembly,[]);this.#relay=assembly.input.population.factory.relayStatus;
  this.#claimFinal=NativeAreaActorAuthority.prototype.claimFinal;
  this.#presence=Object.freeze({assertFinalActivation:NativeAreaScenePresence.prototype.assertFinalActivation,activateFinal:NativeAreaScenePresence.prototype.activateFinal});
  const {scene,geometry,population,physical,bounty,coast,registry,objectives,state,environment,theater,adoption}=assembly.input;
  this.progression=new NativeAreaSceneProgression({scene,population,geometry,ecology:assembly.input.ecology,runtime:registry.input.birth,loot:assembly.lootController,campaign:raw.campaign,state:raw.progressionState,authority:raw.authority});
  this.quests=new NativeAreaSceneQuests({authority:raw.authority,scene,geometry,population,physical,loot:assembly.lootController,bounty,graph:assembly.graph,coast,runtimeBirth:registry.input.birth,
   campaign:raw.campaign,state:raw.questState,scenePresence:assembly.scenePresence,objective:assembly.objectiveController,progression:this.progression,interaction:geometry,characterWriter});
  this.questInteraction=new NativeAreaSceneQuestInteraction({quests:this.quests,campaign:raw.campaign,state:raw.interactionState});
  this.watching=new NativeAreaSceneObjectiveWatching({authority:raw.authority,scene,geometry,population,objectives,state:raw.watchingState,birthState:state,
   environment,physical,completion:assembly.objectiveController,loot:assembly.lootController,graph:assembly.graph,coast,theater,adoption,objectiveServices:assembly.objectiveServices,
   campaign:raw.campaign,quests:this.quests,movement:services.theater});
  this.combat=new NativeAreaSceneCombat({assembly,progression:this.progression,quests:this.quests,questInteraction:this.questInteraction,watching:this.watching,authority:raw.authority,campaign,characterWriter,maddenLedger:raw.maddenLedger,coordinator:raw.coordinator});
  this.#activation=Object.freeze({prepareActivation:NativeAreaSceneCombat.prototype.prepareActivation,assertActivation:NativeAreaSceneCombat.prototype.assertActivation,activate:NativeAreaSceneCombat.prototype.activate});
  if(this.combat.scene!==scene||this.combat.state!==raw.progressionState)throw Error('Native ongoing combat needs identical scene and retained queues');
  this.binding=raw.authority.register(scene,this.combat.services);
  this.combat.register(this.binding);
  for(const key of ['assembly','progression','quests','questInteraction','watching','combat','authority','binding'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 /** The publisher supplies the exact physical census after removing borrowed
  * observers and performing any explicitly authorized transfers. No bodies move here. */
 admit(physicalActors:readonly Actor[]):void{
  assertNativeRetainedMassState(this.#characterWriter);
  if(this.#phase()!=='born')throw Error('Native ongoing admission needs completed area birth');
  const activation=Reflect.apply(this.#activation.prepareActivation,this.combat,[physicalActors]),relayBodies=activation.relayBodies;
  for(const actor of relayBodies){const d=Object.getOwnPropertyDescriptor(actor,'statusRelay');if(d?(!Object.hasOwn(d,'value')||!d.writable):!Object.isExtensible(actor))throw Error('Native ongoing admission needs transferable status routing');}
  assertNativeRetainedMassState(this.#characterWriter);
  Reflect.apply(this.#presence.assertFinalActivation,this.assembly.scenePresence,[this.authority,this.binding]);
  Reflect.apply(this.#activation.assertActivation,this.combat,[activation,physicalActors]);
  Reflect.apply(this.#claimFinal,this.authority,[this.binding,physicalActors]);
  // Preparation preserves the previous owner. Only explicit admission takes routing.
  for(const actor of relayBodies){const slot=Object.getOwnPropertyDescriptor(actor,'statusRelay');Object.defineProperty(actor,'statusRelay',slot?{...slot,value:this.#relay}:{value:this.#relay,writable:true,enumerable:true,configurable:true});}
  Reflect.apply(this.#presence.activateFinal,this.assembly.scenePresence,[this.authority,this.binding]);
  Reflect.apply(this.#activation.activate,this.combat,[physicalActors,activation]);
 }
 /** The external scheduler calls the native giver loop only after physical admission.
  * The interaction owner selects actual local hands and owns their native dwell state. */
 updateQuestGiver(dt:number):void{
  if(!this.assembly.scenePresence.active)throw Error('Native quest interaction needs admitted attendance');
  this.combat.updateQuestGiver(dt);
 }
 /** Called by the area scheduler only with its actual representative present. */
 updateObjective(dt:number):void{
  if(!this.assembly.scenePresence.active)throw Error('Native objective watching needs admitted attendance');
  this.combat.updateObjective(dt);
 }
}

