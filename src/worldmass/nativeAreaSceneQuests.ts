/** Native field completion and quest rewards over retained area state.
 * Campaign ledger scope and writer identity are shared; physical payout effects follow their actual recipient. */
import type {World,Seat} from '../engine/world';
import type {Actor} from '../engine/actor';
import type {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import {NativeAreaSceneBirthAdmission} from './nativeAreaSceneBirthAdmission';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import type {NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaScenePhysical} from './nativeAreaScenePhysical';
import type {NativeAreaSceneObjectiveCompletion} from './nativeAreaSceneObjectiveCompletion';
import type {NativeAreaSceneLoot} from './nativeAreaSceneLoot';
import type {NativeAreaSceneBounty} from './nativeAreaSceneBounty';
import type {NativeAreaSceneGraph} from './nativeAreaSceneGraph';
import type {NativeAreaSceneCoast} from './nativeAreaSceneCoast';
import type {NativeAreaSceneRuntimeBirth} from './nativeAreaSceneRuntimeBirth';
import {NativeQuestOdyssey,type NativeQuestOdysseyHost} from '../engine/nativeQuestOdyssey';
import {QuestRescues,type NativeQuestRescueHost} from '../engine/questRescues';
import * as native from '../engine/nativeSceneQuests';
import {sceneNoteBountyReady,sceneHandState,sceneQuestDefOf} from '../engine/nativeSceneBounty';
type Host=native.NativeSceneQuestHost;
export type NativeQuestCampaign=Pick<Host,'account'|'accountDirty'|'actingSeat'|'charDirty'|'clientActionHook'|'ledger'|'localSeat'|'manifest'|'meta'|'ownQuestLedger'|'questLedgerOverride'|'questSeat'|'time'|'zoneMap'|'zoneMemory'|'nextGenId'|'sim'|'surveyed'|'visited'|'notice'|'markMetaDirty'|'sameParty'|'seatHero'|'seatHudOf'|'seatNoteAt'|'seatOf'|'questLedgerOf'|'forechartSounding'|'invalidateZonesSaveMemo'>
 & Pick<World,'presentWorlds'|'odyssey'|'keeperCampaign'|'odysseyLeads'|'completedObjectives'>;
export interface NativeSceneQuestState {
 questRewardShown:Host['questRewardShown'];questRewardRequested:Host['questRewardRequested'];failNoteAt:Host['failNoteAt'];
 /** This area's scripted-scene controller, shared with its other native services. */
 scene:World['scene'];
}
export function freshSceneQuestState():NativeSceneQuestState{return {questRewardShown:null,questRewardRequested:false,failNoteAt:new Map(),scene:null};}
/** Actual recipient-owned sinks carried by the same physical actor authority. */
export interface NativeSceneQuestRewardRuntime {loot:NativeAreaSceneLoot;objective:NativeAreaSceneObjectiveCompletion}
export interface NativeSceneQuestInput {
 authority:NativeAreaActorAuthority<NativeSceneQuestRewardRuntime>;
 scene:NativeSceneCensus;geometry:NativeAreaSceneGeometry;population:NativeAreaScenePopulation;
 physical:NativeAreaScenePhysical;loot:NativeAreaSceneLoot;bounty:NativeAreaSceneBounty;
 graph:NativeAreaSceneGraph;coast:NativeAreaSceneCoast;runtimeBirth:NativeAreaSceneRuntimeBirth;
 campaign:NativeQuestCampaign;state:NativeSceneQuestState;
 /** Exact currently present controlled actors. Ledger lookup remains campaign-wide. */
 scenePresence:{scene:NativeSceneCensus;readonly seats:World['seats']};
 objective:NativeAreaSceneObjectiveCompletion;
 progression:Pick<Host,'recalcSeat'>;
 interaction:NativeAreaSceneGeometry;
 /** Real campaign writer with the retained-area publication lifecycle already bound. */
 characterWriter:World;
}
export class NativeAreaSceneQuests {
 readonly input:NativeSceneQuestInput;readonly host:Host;
 readonly odyssey:NativeQuestOdyssey;readonly rescues:QuestRescues;
 #rewardSubject:(()=>Actor)|null=null;
 #failHost!:Host;
 #odysseyReward:{hand?:Seat}|null=null;
 constructor(raw:NativeSceneQuestInput){
  const bindings=Object.create(null);
  for(const key of ['authority','scene','geometry','population','physical','loot','bounty','graph','coast','runtimeBirth','campaign','state','scenePresence','objective','progression','interaction','characterWriter']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native quests require own object binding: '+key);
   bindings[key]=d.value;
  }
  const input:NativeSceneQuestInput=this.input=Object.freeze(bindings),host={} as Host,self=this;
  if(input.geometry.state!==input.scene||input.population.input.scene!==input.scene||input.population.input.geometry!==input.geometry
   ||input.physical.input.scene!==input.scene||input.physical.input.geometry!==input.geometry||input.loot.input.scene!==input.scene
   ||input.loot.input.physical!==input.physical||input.bounty.input.scene!==input.scene||input.bounty.input.geometry!==input.geometry
   ||input.coast.input.scene!==input.scene||input.coast.input.geometry!==input.geometry||input.graph.input.coast!==input.coast
   ||input.objective.input.scene!==input.scene||input.objective.input.geometry!==input.geometry||input.interaction!==input.geometry
   ||input.runtimeBirth.input.scene!==input.scene||input.runtimeBirth.input.geometry!==input.geometry||input.scenePresence.scene!==input.scene)
   throw Error('Native quests require identical retained area owners');
  if((input.objective.input.campaign as object)!==input.campaign||(input.loot.input.campaign as object)!==input.campaign||(input.bounty.input.campaign as object)!==input.campaign||(input.coast.input.campaign as object)!==input.campaign||(input.graph.input.campaign as object)!==input.campaign)
   throw Error('Native quests require identical campaign bindings');
  if(input.authority.campaign as object!==input.campaign)throw Error('Native quests require identical campaign authority');
  if(input.population.input.campaign as object!==input.campaign)throw Error('Native quests require identical population campaign');
  const birthAdmission=new NativeAreaSceneBirthAdmission({authority:input.authority,scene:input.scene,population:input.population});
  if(input.characterWriter.account!==input.campaign.account||input.characterWriter.localSeat!==input.campaign.localSeat)
   throw Error('Native quests require the actual campaign character writer');
  const fields=(provider:()=>object,keys:readonly string[],write=false)=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,
   get(){return (provider() as Record<string,unknown>)[key];},...(write?{set(v:unknown){(provider() as Record<string,unknown>)[key]=v;}}:{})});};
  const methods=(provider:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){
   const owner=provider() as Record<string,Function>,fn=owner[key];if(typeof fn!=='function')throw Error('Missing native quest capability: '+key);
   return (...args:unknown[])=>fn.apply(owner,args);
  }});};
  fields(()=>input.scene,['zone','actors','player']);fields(()=>input.scenePresence,['seats']);
  fields(()=>input.campaign,['clientActionHook','account','actingSeat','ledger','localSeat','manifest','meta','ownQuestLedger','time','zoneMap','zoneMemory','sim','surveyed','visited','seatNoteAt']);
  fields(()=>input.campaign,['accountDirty','charDirty','questLedgerOverride','questSeat','nextGenId'],true);
  fields(()=>input.state,['questRewardShown','questRewardRequested','failNoteAt'],true);
  fields(()=>input.physical.input.state,['drops']);
  for(const [key,bookKey] of Object.entries({activeQuests:'active',bountyHands:'hands',completedQuests:'completed',questImbues:'imbues',questRewardItems:'rewardItems'}))Object.defineProperty(host,key,{enumerable:true,
   get(){return (self.questLedger() as unknown as Record<string,unknown>)[bookKey];},set(v){(self.questLedger() as unknown as Record<string,unknown>)[bookKey]=v;}});
  Object.defineProperty(host,'characterWriter',{enumerable:true,value:input.characterWriter});
  // These are whole native areas; partition-cell expedition authority is absent.
  Object.defineProperty(host,'massRuntime',{enumerable:true,value:null});Object.defineProperty(host,'massAway',{enumerable:true,value:null});
  methods(()=>input.campaign,['notice','markMetaDirty','sameParty','seatHero','seatHudOf','seatOf','questLedgerOf','forechartSounding','invalidateZonesSaveMemo']);
  // Cargo stays on the source ground. Only an actual payout selects a recipient sink.
  methods(()=>input.loot,['dropGearAt']);methods(()=>input.objective,['objectivePlaces','metaProgressionActive']);
  host.dropEssenceAt=(...args)=>self.#lootEffect('dropEssenceAt',args);
  host.dropGemAt=(...args)=>self.#lootEffect('dropGemAt',args);
  host.grantXp=(...args)=>self.#objectiveEffect('grantXp',args);
  host.text=(...args)=>self.#objectiveEffect('text',args);
  methods(()=>input.progression,['recalcSeat']);methods(()=>input.interaction,['dwellReachable','storyPair']);methods(()=>input.runtimeBirth,['hasNpcRole']);
  methods(()=>input.coast,['eventLevel','notarizeRoad','refreshExitLabels','roadIsWet','simView']);fields(()=>input.coast,['biomeFor','biomeDepthFor','levelFor','climateFor']);
  methods(()=>input.graph,['pullToLand']);
  host.handState=(p)=>sceneHandState(self.bountyHost,p);host.questDefOf=(id)=>sceneQuestDefOf(self.bountyHost,id);
  methods(()=>self,["onQuestZoneFieldCleared","deedHand","completeQuestField","ensureQuestCargo","ensureSeatCargo","onQuestZoneCleared","questRewardItem","claimQuestReward","questStanding","pendingTurnIns","giverPresent","getQuestGiver","grantVocation","questHand","withQuestHand","questLedger","questStamp","questRunLedger","creditedHands","handSeats","nearestHand","localHumanSeats","failNote","learnQuestDirections","prepareOdysseyGround","enrollOdysseyQuest","acceptOdysseyCompatibleQuest","questLocalAnchor","findBandCoord","revealQuestGround","graphWorkAvailable"]);
  methods(()=>self,['noteBountyReady']);
  // The live original bounty host must read the same hand scope as this owner.
  const bountyHost=Object.create(input.bounty.host);
  for(const key of ['activeQuests','bountyHands'])Object.defineProperty(bountyHost,key,{get(){return (host as unknown as Record<string,unknown>)[key];},set(v){(host as unknown as Record<string,unknown>)[key]=v;}});
  Object.defineProperties(bountyHost,{handState:{value:(p:Parameters<World['handState']>[0])=>sceneHandState(bountyHost,p)},questDefOf:{value:(id:string)=>sceneQuestDefOf(bountyHost,id)}});
  Object.defineProperty(this,'bountyHost',{value:bountyHost});
  // Native refusal policy distinguishes the campaign hero from guests. The
  // area's physical representative is not a replacement for that identity.
  const failHost=this.#failHost=Object.create(host) as Host;
  Object.defineProperty(failHost,'player',{get:()=>input.campaign.localSeat.actor});
  const odysseyHost=Object.create(host) as NativeQuestOdysseyHost;
  Object.defineProperties(odysseyHost,{
   player:{get:()=>self.#odysseyReward?.hand?.actor??input.campaign.localSeat.actor},
   meta:{get(){if(self.#odysseyReward&&!self.#odysseyReward.hand)self.#odysseyReward.hand=input.campaign.localSeat;return input.campaign.meta;}},
   questHand:{value:()=>{const hand=self.questHand();if(self.#odysseyReward)self.#odysseyReward.hand=hand;return hand;}}
  });
  // The campaign's non-hosted leader bonus belongs to its local character; the
  // hosted bonus belongs to its scoped hand. Both keep the actual state owner.
  Object.defineProperties(odysseyHost,{
   grantXp:{value:(...args:Parameters<World['grantXp']>)=>self.#objectiveEffect('grantXp',args)},
   dropGemAt:{value:(...args:Parameters<World['dropGemAt']>)=>self.#lootEffect('dropGemAt',args)},
   text:{value:(...args:Parameters<World['text']>)=>self.#objectiveEffect('text',args)}
  });
  for(const key of ['keeperCampaign','odysseyLeads'])Object.defineProperty(odysseyHost,key,{get(){const provider=input.campaign,fn=provider[key as 'keeperCampaign'];return (...args:unknown[])=>fn.apply(provider,args as []);}});
  this.odyssey=new NativeQuestOdyssey(odysseyHost,input.campaign.odyssey);
  // Keep the native methods and actual state owner. Each callback carries its
  // own selected hand across nested effects, including a hosted leader callback.
  const questCompleted=this.odyssey.questCompleted,leaderQuestDone=this.odyssey.leaderQuestDone;
  this.odyssey.questCompleted=(...args)=>self.#withOdysseyReward(()=>questCompleted.apply(self.odyssey,args));
  this.odyssey.leaderQuestDone=(...args)=>self.#withOdysseyReward(()=>leaderQuestDone.apply(self.odyssey,args));
  Object.defineProperty(host,'odyssey',{enumerable:true,value:this.odyssey});
  const rescueHost=Object.create(host) as NativeQuestRescueHost;
  for(const key of ['scene'])Object.defineProperty(rescueHost,key,{get(){return input.state.scene;}});
  Object.defineProperty(rescueHost,'completedObjectives',{get(){return input.campaign.completedObjectives;}});
  Object.defineProperty(rescueHost,'createMonster',{get:()=>birthAdmission.createMonster});
  Object.defineProperty(rescueHost,'findFreeSpot',{get(){const provider=input.geometry,fn=provider.findFreeSpot;return (...a:Parameters<typeof fn>)=>fn.apply(provider,a);}});
  this.rescues=new AdmittedQuestRescues(rescueHost,birthAdmission);Object.defineProperty(host,'questRescues',{enumerable:true,value:this.rescues});
  this.host=Object.freeze(host);
  for(const key of ['input','host','odyssey','rescues'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 /** Resolve at the first physical effect, preserving native partial failure order. */
 #rewardEffects():NativeSceneQuestRewardRuntime {
  const subject=this.#rewardSubject;
  if(!subject)return {loot:this.input.loot,objective:this.input.objective};
  const owner=this.input.authority.require(subject());
  this.input.authority.assertAdmitted(owner.scene);
  if(!owner.loot||!owner.objective||owner.loot.input.scene!==owner.scene||owner.objective.input.scene!==owner.scene
   ||(owner.loot.input.campaign as object)!==this.input.campaign||(owner.objective.input.campaign as object)!==this.input.campaign)
   throw Error('Native quest payout needs actual recipient reward owners');
  return owner;
 }
 #withOdysseyReward<T>(fn:()=>T):T {
  const previous=this.#odysseyReward,frame:{hand?:Seat}={};this.#odysseyReward=frame;
  try{return this.#withRewardSubject(()=>{if(!frame.hand)throw Error('Native Odyssey payout has no selected hand');return frame.hand.actor;},fn);}
  finally{this.#odysseyReward=previous;}
 }
 #withRewardSubject<T>(subject:()=>Actor,fn:()=>T):T {
  const previous=this.#rewardSubject;this.#rewardSubject=subject;
  try{return fn();}finally{this.#rewardSubject=previous;}
 }
 #lootEffect<K extends 'dropEssenceAt'|'dropGemAt'>(name:K,args:Parameters<World[K]>):ReturnType<World[K]> {
  const owner=this.#rewardEffects().loot;return Reflect.apply(owner[name],owner,args) as ReturnType<World[K]>;
 }
 #objectiveEffect<K extends 'grantXp'|'text'>(name:K,args:Parameters<World[K]>):ReturnType<World[K]> {
  const owner=this.#rewardEffects().objective;return Reflect.apply(owner[name],owner,args) as ReturnType<World[K]>;
 }
 private readonly bountyHost!:NativeAreaSceneBounty['host'];
 noteBountyReady(p:Parameters<World['noteBountyReady']>[0]):void {
  const holder=p.holder&&this.input.campaign.localSeat.keeper?this.input.campaign.presentWorlds().flatMap(w=>w.seats).find(s=>s.id===p.holder):undefined;
  if(!holder)return sceneNoteBountyReady(this.bountyHost,p);
  const was=this.input.campaign.actingSeat;this.input.campaign.actingSeat=holder;
  try{sceneNoteBountyReady(this.bountyHost,p);}finally{this.input.campaign.actingSeat=was;}
 }
onQuestZoneFieldCleared:World['onQuestZoneFieldCleared']=(...args)=>native.sceneOnQuestZoneFieldCleared(this.host,...args);
deedHand<T>(places:()=>readonly import('../core/math').Vec2[],fn:()=>T):T{return native.sceneDeedHand(this.host,places,fn);}
completeQuestField:World['completeQuestField']=(...args)=>native.sceneCompleteQuestField(this.host,...args);
ensureQuestCargo:World['ensureQuestCargo']=(...args)=>native.sceneEnsureQuestCargo(this.host,...args);
ensureSeatCargo:World['ensureSeatCargo']=(...args)=>native.sceneEnsureSeatCargo(this.host,...args);
onQuestZoneCleared:World['onQuestZoneCleared']=(...args)=>{
 // Capture the exact native lookup after its row/Odyssey/definition work.
 // Later effects follow that seat's live controlled body, not a new quest hand.
 let hand:Seat|undefined;const payoutHost=Object.create(this.host) as Host;
 Object.defineProperty(payoutHost,'questHand',{value:()=>{hand=this.questHand();return hand;}});
 return this.#withRewardSubject(()=>{if(!hand)throw Error('Native quest payout has no selected hand');return hand.actor;},()=>native.sceneOnQuestZoneCleared(payoutHost,...args));
};
questRewardItem:World['questRewardItem']=(...args)=>native.sceneQuestRewardItem(this.host,...args);
claimQuestReward:World['claimQuestReward']=(...args)=>native.sceneClaimQuestReward(this.host,...args);
questStanding:World['questStanding']=(...args)=>native.sceneQuestStanding(this.host,...args);
pendingTurnIns:World['pendingTurnIns']=(...args)=>native.scenePendingTurnIns(this.host,...args);
giverPresent:World['giverPresent']=(...args)=>native.sceneGiverPresent(this.host,...args);
getQuestGiver:World['getQuestGiver']=(...args)=>{
 // This is the native method's first hand read. An identical coordinate in a
 // neighboring scene never supplies local interaction presence.
 const hand=this.questHand(),binding=this.input.authority.bindingFor(this.input.scene);
 if(!this.input.authority.seatsFor(binding).includes(hand))return null;
 this.input.authority.assertAdmitted(this.input.scene);
 const localHost=Object.create(this.host) as Host;
 Object.defineProperty(localHost,'questHand',{value:()=>hand});
 return native.sceneGetQuestGiver(localHost,...args);
};
grantVocation:World['grantVocation']=(...args)=>{const seat=args[1]??this.input.campaign.localSeat;return this.#withRewardSubject(()=>seat.actor,()=>native.sceneGrantVocation(this.host,...args));};
questHand:World['questHand']=(...args)=>native.sceneQuestHand(this.host,...args);
withQuestHand<T>(seat:World['localSeat'],fn:()=>T):T{return native.sceneWithQuestHand(this.host,seat,fn);}
questLedger:World['questLedger']=(...args)=>native.sceneQuestLedger(this.host,...args);
questStamp:World['questStamp']=(...args)=>native.sceneQuestStamp(this.host,...args);
questRunLedger:World['questRunLedger']=(...args)=>native.sceneQuestRunLedger(this.host,...args);
creditedHands:World['creditedHands']=(...args)=>native.sceneCreditedHands(this.host,...args);
handSeats:World['handSeats']=(...args)=>native.sceneHandSeats(this.host,...args);
nearestHand:World['nearestHand']=(...args)=>native.sceneNearestHand(this.host,...args);
localHumanSeats:World['localHumanSeats']=(...args)=>native.sceneLocalHumanSeats(this.host,...args);
failNote:World['failNote']=(...args)=>this.#withRewardSubject(()=>args[0],()=>native.sceneFailNote(this.#failHost,...args));
learnQuestDirections:World['learnQuestDirections']=(...args)=>native.sceneLearnQuestDirections(this.host,...args);
prepareOdysseyGround:World['prepareOdysseyGround']=(...args)=>native.scenePrepareOdysseyGround(this.host,...args);
enrollOdysseyQuest:World['enrollOdysseyQuest']=(...args)=>this.input.graph.withGenerationPolicies(()=>native.sceneEnrollOdysseyQuest(this.host,...args));
acceptOdysseyCompatibleQuest:World['acceptOdysseyCompatibleQuest']=(...args)=>this.input.graph.withGenerationPolicies(()=>native.sceneAcceptOdysseyCompatibleQuest(this.host,...args));
questLocalAnchor:World['questLocalAnchor']=(...args)=>this.input.graph.withGenerationPolicies(()=>native.sceneQuestLocalAnchor(this.host,...args));
findBandCoord:World['findBandCoord']=(...args)=>this.input.graph.withGenerationPolicies(()=>native.sceneFindBandCoord(this.host,...args));
revealQuestGround:World['revealQuestGround']=(...args)=>native.sceneRevealQuestGround(this.host,...args);
graphWorkAvailable:World['graphWorkAvailable']=(...args)=>native.sceneGraphWorkAvailable(this.host,...args);
}

/** Keep the original rescue algorithms, including their nested hand scope. */
class AdmittedQuestRescues extends QuestRescues {
 constructor(host:NativeQuestRescueHost,private readonly admission:NativeAreaSceneBirthAdmission){super(host);}
 override update():void{this.admission.run(()=>{
  const {authority,scene}=this.admission.input;
  if(authority.require(scene.player).scene!==scene)throw Error('Rescue attendance needs a present area player');
  super.update();
 });}
}
