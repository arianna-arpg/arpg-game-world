/** Real event-local kill/deed binding. Construct once with the actual aggregate;
 * source scene owners remain distinct from the campaign's single writer. */
import {isNativeWorld,type World} from '../engine/world';
import type {NativeAreaOngoingCampaign} from './nativeAreaSceneOngoing';
import {NativeAreaSceneAssembly} from './nativeAreaSceneAssembly';
import {NativeAreaSceneProgression} from './nativeAreaSceneProgression';
import {NativeAreaSceneQuests} from './nativeAreaSceneQuests';
import {NativeAreaSceneObjectiveWatching} from './nativeAreaSceneObjectiveWatching';
import {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import {NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import * as native from '../engine/nativeSceneCombatCampaign';
import {assertNativeCombatOwnerEntry,assertNativeCombatOwnerHooks,type NativeAreaCombatOwnerEntry,type NativeAreaCombatOwnerHooks} from './nativeAreaCombatOperation';
import type {Actor} from '../engine/actor';
type DeedCallbackSlot='onLifeHealed'|'onLifeSpent';
interface DeedCallbackReceipt {readonly callback:Function;active:boolean}
interface CampaignDeeds {
 readonly characterWriter:World;
 readonly tracker:World['combatDeeds'];
 readonly callbacks:WeakMap<Actor,Partial<Record<DeedCallbackSlot,DeedCallbackReceipt>>>;
 actor:Actor|null;
 owner:NativeAreaSceneCombatCampaign|null;
}
// Native deeds follow the campaign's controlled hero across ordinary travel.
// Areas keep their own combat/reward hosts and share only this personal history.
const campaignDeeds=new WeakMap<NativeAreaOngoingCampaign,CampaignDeeds>();

export interface NativeAreaSceneCombatCampaignInput {
 assembly:NativeAreaSceneAssembly;progression:NativeAreaSceneProgression;
 quests:NativeAreaSceneQuests;watching:NativeAreaSceneObjectiveWatching;
 authority:NativeAreaActorAuthority<object>;campaign:NativeAreaOngoingCampaign;
 characterWriter:World;combat:NativeAreaSceneCombat;entry:NativeAreaCombatOwnerEntry;hooks:NativeAreaCombatOwnerHooks;
}
export interface NativeCombatCampaignShared {
 lastPlayerKiller:World['lastPlayerKiller'];partyRows:World['partyRows'];pendingRespawn:World['pendingRespawn'];traversal:World['traversal'];
 seatByActor:World['seatByActor'];seatHud:World['seatHud'];metaDirty:World['metaDirty'];
 massRewardLevel:World['massRewardLevel'];events:World['events'];
 abilityDropRng:World['abilityDropRng'];seatKills:World['seatKills'];seatKillTally:World['seatKillTally'];
 slainLog:World['slainLog'];objectiveFallAt:World['objectiveFallAt'];
}
type Binding<T>={get:()=>T;set?:(value:T)=>void};
function field<O extends object,K extends keyof O>(owner:()=>O,key:K):Binding<O[K]>{return{get:()=>owner()[key],set:value=>{owner()[key]=value;}};}
function method<O extends object,K extends keyof O>(owner:()=>O,key:K):Binding<O[K]>{return{get:()=>{const receiver=owner(),fn=receiver[key];return((...args:unknown[])=>Reflect.apply(fn as Function,receiver,args)) as O[K];}};}
const sharedKeys=['lastPlayerKiller','partyRows','pendingRespawn','traversal','seatByActor','seatHud','metaDirty','massRewardLevel','events','abilityDropRng','seatKills','seatKillTally','slainLog','objectiveFallAt'] as const;
export class NativeAreaSceneCombatCampaign {
 readonly input:Readonly<Omit<NativeAreaSceneCombatCampaignInput,'entry'|'hooks'>>;
 readonly #entry:NativeAreaCombatOwnerEntry;readonly #hooks:NativeAreaCombatOwnerHooks;
 readonly #deeds:CampaignDeeds;
 readonly shared:NativeCombatCampaignShared;
 readonly #host:native.NativeSceneCombatCampaignHost;
 readonly #deedHost:native.NativeSceneCombatCampaignHost;
 readonly combatDeeds:World['combatDeeds'];
 readonly worldKillRules:World['worldKillRules'];
 readonly rouseRules:World['rouseRules'];
 readonly state:{deedActor:World['deedActor'];realmContext:World['realmContext'];crusadeRealmContext:World['crusadeRealmContext'];fractureRealmContext:World['fractureRealmContext'];necropolisRealmContext:World['necropolisRealmContext']}={deedActor:null,realmContext:null,crusadeRealmContext:null,fractureRealmContext:null,necropolisRealmContext:null};
 constructor(raw:NativeAreaSceneCombatCampaignInput){
  const roots=Object.create(null);
  for(const key of ['assembly','progression','quests','watching','authority','campaign','characterWriter','combat']){const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native combat campaign needs own concrete root: '+key);roots[key]=d.value;}
  const entry=raw&&Object.getOwnPropertyDescriptor(raw,'entry');if(!entry||!Object.hasOwn(entry,'value')||typeof entry.value!=='function')throw Error('Native combat campaign needs its private owner entry');this.#entry=entry.value;
  const input=this.input=Object.freeze(roots) as Readonly<Omit<NativeAreaSceneCombatCampaignInput,'entry'|'hooks'>>,{assembly,progression,quests,watching,authority,campaign,characterWriter,combat}=input;
  if(!(assembly instanceof NativeAreaSceneAssembly)||!(progression instanceof NativeAreaSceneProgression)||!(quests instanceof NativeAreaSceneQuests)||!(watching instanceof NativeAreaSceneObjectiveWatching)||!(authority instanceof NativeAreaActorAuthority)||!isNativeWorld(characterWriter)||!(combat instanceof NativeAreaSceneCombat))throw Error('Native combat campaign needs actual runtime owners');
  assertNativeCombatOwnerEntry(combat,this.#entry);
  const hooks=Object.getOwnPropertyDescriptor(raw,'hooks');if(!hooks||!Object.hasOwn(hooks,'value'))throw Error('Native combat campaign needs its private owner hooks');assertNativeCombatOwnerHooks(combat,hooks.value);this.#hooks=hooks.value;
  for(const key of ['assembly','progression','quests','watching','authority','campaign','characterWriter'] as const)if(combat.input[key]!==input[key])throw Error('Native combat campaign needs identical aggregate roots: '+key);
  const {scene,physical,registry,history,objectives,geometry}=assembly.input;
  if(progression.input.scene!==scene||quests.input.scene!==scene||watching.input.scene!==scene||quests.input.progression!==progression||quests.input.characterWriter!==characterWriter||authority.campaign!==campaign||assembly.input.campaign!==campaign||progression.input.campaign!==campaign||quests.input.campaign!==campaign||watching.input.campaign!==campaign)throw Error('Native combat campaign needs identical area and campaign roots');
  if(characterWriter.account!==campaign.account||characterWriter.localSeat!==campaign.localSeat||characterWriter.sim!==campaign.sim)throw Error('Native combat campaign needs the actual shared character writer');
  let deeds=campaignDeeds.get(campaign);
  if(deeds&&deeds.characterWriter!==characterWriter)throw Error('Native campaign deeds need the identical character writer');
  if(!deeds){deeds={characterWriter,tracker:native.createNativeCombatDeeds(),callbacks:new WeakMap(),actor:null,owner:null};campaignDeeds.set(campaign,deeds);}
  this.#deeds=deeds;this.combatDeeds=deeds.tracker;
  Object.defineProperty(this.state,'deedActor',{enumerable:true,configurable:false,get:()=>this.#deeds.actor,set:(actor:Actor|null)=>{this.#deeds.actor=actor;}});
  const shared={} as NativeCombatCampaignShared;
  for(const key of sharedKeys)Object.defineProperty(shared,key,{enumerable:true,get:()=>Reflect.get(characterWriter,key),set:value=>{if(!Reflect.set(characterWriter,key,value))throw new TypeError('Cannot assign native campaign field: '+key);}});
  this.shared=Object.freeze(shared);
  const bindings:{[K in keyof native.NativeSceneCombatCampaignHost]:Binding<native.NativeSceneCombatCampaignHost[K]>}={
   zone:field(()=>scene,'zone'),
   actors:field(()=>scene,'actors'),
   player:field(()=>campaign.localSeat,'actor'),
   altars:field(()=>physical.input.state,'altars'),
   objectiveDone:field(()=>objectives,'objectiveDone'),
   cull:field(()=>objectives,'cull'),
   offering:field(()=>objectives,'offering'),
   amalgamSite:field(()=>registry.input.birth.input.state,'amalgamSite'),
   huntBeast:field(()=>registry.input.birth.input.state,'huntBeast'),
   encounters:field(()=>assembly.transition,'encounters'),
   spoilStory:field(()=>assembly.lootController.input.state,'spoilStory'),
   deedActor:field(()=>this.state,'deedActor'),
   realmContext:field(()=>this.state,'realmContext'),
   crusadeRealmContext:field(()=>this.state,'crusadeRealmContext'),
   fractureRealmContext:field(()=>this.state,'fractureRealmContext'),
   necropolisRealmContext:field(()=>this.state,'necropolisRealmContext'),
   abilityDropRng:field(()=>this.shared,'abilityDropRng'),
   events:field(()=>this.shared,'events'),
   seatKills:method(()=>characterWriter,'seatKills'),
   seatKillTally:field(()=>this.shared,'seatKillTally'),
   slainLog:field(()=>this.shared,'slainLog'),
   objectiveFallAt:field(()=>this.shared,'objectiveFallAt'),
   account:field(()=>campaign,'account'),
   accountDirty:field(()=>campaign,'accountDirty'),
   charDirty:field(()=>campaign,'charDirty'),
   descentRun:field(()=>campaign,'descentRun'),
   localSeat:field(()=>campaign,'localSeat'),
   manifest:field(()=>campaign,'manifest'),
   meta:field(()=>campaign,'meta'),
   sim:field(()=>campaign,'sim'),
   time:field(()=>campaign,'time'),
   massRuntime:field(()=>geometry,'massRuntime'),
   combatDeeds:field(()=>this,'combatDeeds'),
   actorById:method(()=>registry.input.birth,'actorById'),
   nemesisActive:method(()=>history,'nemesisActive'),
   sagaDirty:method(()=>history,'sagaDirty'),
   text:method(()=>assembly.objectiveController,'text'),
   metaProgressionActive:method(()=>assembly.objectiveController,'metaProgressionActive'),
   objectiveCountable:method(()=>assembly.objectiveServices,'objectiveCountable'),
   dropAbilityEssenceAt:method(()=>assembly.lootController,'dropAbilityEssenceAt'),
   dropEssenceAt:method(()=>assembly.lootController,'dropEssenceAt'),
   dropGearAt:method(()=>assembly.lootController,'dropGearAt'),
   dropGemAt:method(()=>assembly.lootController,'dropGemAt'),
   dropVestigeAt:method(()=>assembly.lootController,'dropVestigeAt'),
   lootLevelAt:method(()=>assembly.lootController,'lootLevelAt'),
   mintLootResult:method(()=>assembly.lootController,'mintLootResult'),
   spoilsSealed:method(()=>assembly.lootController,'spoilsSealed'),
   noteBountyReady:method(()=>quests,'noteBountyReady'),
   withQuestHand:method(()=>quests,'withQuestHand'),
   handSeats:method(()=>quests,'handSeats'),
   questLedgerOf:method(()=>campaign,'questLedgerOf'),
   bumpDrives:method(()=>combat,'bumpDrives'),
   seatOfRoot:method(()=>combat,'seatOfRoot'),
   grantEventKillReward:method(()=>this,'grantEventKillReward'),
   deedEnemy:method(()=>this,'deedEnemy'),
   deedOwned:method(()=>this,'deedOwned'),
   hasDeedEnemyNearby:method(()=>this,'hasDeedEnemyNearby'),
   dropAmalgamPart:method(()=>this,'dropAmalgamPart'),
   openWritHand:method(()=>this,'openWritHand'),
   deedHands:method(()=>this,'deedHands'),
   provenanceOf:method(()=>this,'provenanceOf'),
   recordDeed:method(()=>this,'recordDeed'),
   recordSelfDamage:method(()=>this,'recordSelfDamage'),
   rollAbilityEssenceDrop:method(()=>this,'rollAbilityEssenceDrop'),
   deedCallback:{get:()=> <A extends unknown[],R>(hero:Actor,slot:DeedCallbackSlot,callback:(...args:A)=>R)=>this.#deedCallback(hero,slot,callback)},
   clearDeedCallbacks:{get:()=> (hero:Actor)=>this.#clearDeedCallbacks(hero)},
  };
  const host={} as native.NativeSceneCombatCampaignHost;
  for(const key of Object.keys(bindings) as (keyof native.NativeSceneCombatCampaignHost)[])Object.defineProperty(host,key,{enumerable:true,...bindings[key]});
  this.#host=Object.freeze(host);
  // The native bind body creates stable callbacks. Their host follows the hero's
  // admitted area; ordinary source-area event hosts stay fixed to their area.
  const deedBindings={...bindings,
   recordSelfDamage:method(()=>this.#deedOwner(),'recordSelfDamage'),
   recordDeed:method(()=>this.#deedOwner(),'recordDeed'),
   metaProgressionActive:method(()=>this.#deedOwner().input.assembly.objectiveController,'metaProgressionActive'),
  };
  const deedHost={} as native.NativeSceneCombatCampaignHost;
  for(const key of Object.keys(deedBindings) as (keyof native.NativeSceneCombatCampaignHost)[])Object.defineProperty(deedHost,key,{enumerable:true,...deedBindings[key]});
  this.#deedHost=Object.freeze(deedHost);
  this.worldKillRules=native.createNativeWorldKillRules(this.#host);this.rouseRules=native.createNativeRouseRules(this.#host);
  for(const key of ['input','shared','state','combatDeeds','worldKillRules','rouseRules'])Object.defineProperty(this,key,{writable:false,configurable:false,enumerable:false});
 }

 #deedOwner():NativeAreaSceneCombatCampaign {const owner=this.#deeds.owner;if(!owner)throw Error('Native deeds need an admitted controlled hero');return owner;}
 /** A campaign callback receipt authorizes only its installed observation slot.
  * Ordinary travel preserves the callback and the native wound/combo history. */
 #clearDeedCallbacks(hero:Actor):void {
  const own=this.#deeds.callbacks.get(hero);if(!own)return;
  for(const slot of ['onLifeHealed','onLifeSpent'] as const){
   const receipt=own[slot];if(!receipt)continue;
   const descriptor=Object.getOwnPropertyDescriptor(hero,slot);
   if(descriptor&&Object.hasOwn(descriptor,'value')&&descriptor.value===receipt.callback){
    if(!Reflect.set(hero,slot,undefined))throw new TypeError('Cannot clear native deed callback');
   }
   receipt.active=false;delete own[slot];
  }
 }
 #deedCallback<A extends unknown[],R>(hero:Actor,slot:DeedCallbackSlot,callback:(...args:A)=>R):(...args:A)=>R {
  let own=this.#deeds.callbacks.get(hero);if(!own)this.#deeds.callbacks.set(hero,own={});
  const deeds=this.#deeds;
  const current=()=>{const descriptor=Object.getOwnPropertyDescriptor(hero,slot);if(!receipt.active||deeds.actor!==hero||own![slot]!==receipt||!descriptor||!Object.hasOwn(descriptor,'value')||descriptor.value!==wrapped)throw Error('Expired native deed callback');};
  function wrapped(this:unknown,...args:A):R {current();const receiver=this,owner=deeds.owner;if(!owner)throw Error('Native deed callback has no admitted owner');return owner.#entry(owner,slot==='onLifeHealed'?{sources:[hero],permission:'attribution'}:{physical:[hero],permission:'physical'},()=>{current();if(deeds.owner!==owner)throw Error('Native deed owner changed during admission');return Reflect.apply(callback,receiver,args);});}
  const receipt:DeedCallbackReceipt={callback:wrapped,active:true};
  own[slot]=receipt;return wrapped;
 }
 grantEventKillReward(...args:Parameters<World["grantEventKillReward"]>):ReturnType<World["grantEventKillReward"]>{const actor=Object.getOwnPropertyDescriptor(args[0],'actor');if(!actor||!Object.hasOwn(actor,'value'))throw Error('Native kill reward needs an ordinary actual context actor');return this.#entry(this,{physical:[actor.value],permission:'physical'},()=>{this.#hooks.assertCombatKillContext(this,args[0]);return native.sceneGrantEventKillReward(this.#host,...args);});}
 rollDrops(...args:Parameters<World["rollDrops"]>):ReturnType<World["rollDrops"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneRollDrops(this.#host,...args));}
 provenanceOf(...args:Parameters<World["provenanceOf"]>):ReturnType<World["provenanceOf"]>{return this.#entry(this,{sources:args[0]?[args[0]]:[],permission:'attribution'},()=>native.sceneProvenanceOf(this.#host,...args));}
 noteSeatKill(...args:Parameters<World["noteSeatKill"]>):ReturnType<World["noteSeatKill"]>{return this.#entry(this,{sources:args[0]?[args[0]]:[],permission:'attribution'},()=>native.sceneNoteSeatKill(this.#host,...args));}
 noteSlain(...args:Parameters<World["noteSlain"]>):ReturnType<World["noteSlain"]>{return this.#entry(this,{permission:'attribution'},()=>native.sceneNoteSlain(this.#host,...args));}
 noteNemesisKill(...args:Parameters<World["noteNemesisKill"]>):ReturnType<World["noteNemesisKill"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneNoteNemesisKill(this.#host,...args));}
 onSquadDeath(...args:Parameters<World["onSquadDeath"]>):ReturnType<World["onSquadDeath"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneOnSquadDeath(this.#host,...args));}
 feedEncounters(...args:Parameters<World["feedEncounters"]>):ReturnType<World["feedEncounters"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneFeedEncounters(this.#host,...args));}
 bindCombatDeeds(...args:Parameters<World["bindCombatDeeds"]>):ReturnType<World["bindCombatDeeds"]>{
  const campaign=this.input.campaign,seat=campaign.localSeat,selected=Object.getOwnPropertyDescriptor(seat,'actor');
  if(!selected||!Object.hasOwn(selected,'value'))throw Error('Native deeds need an ordinary controlled hero');
  return this.#entry(this,{physical:[selected.value],permission:'physical'},()=>{
   const current=Object.getOwnPropertyDescriptor(seat,'actor');
   if(campaign.localSeat!==seat||!current||!Object.hasOwn(current,'value')||current.value!==selected.value)throw Error('Native deed controlled hero changed during admission');
   this.#deeds.owner=this;
   return native.sceneBindCombatDeeds(this.#deedHost,...args);
  });
 }
 recordDeed(...args:Parameters<World["recordDeed"]>):ReturnType<World["recordDeed"]>{return this.#entry(this,{permission:'attribution'},()=>native.sceneRecordDeed(this.#host,...args));}
 recordIndirectDamage(...args:Parameters<World["recordIndirectDamage"]>):ReturnType<World["recordIndirectDamage"]>{return this.#entry(this,{physical:[args[0]],sources:args[1]?[args[1]]:[],permission:'attribution'},()=>native.sceneRecordIndirectDamage(this.#host,...args));}
 recordSelfDamage(...args:Parameters<World["recordSelfDamage"]>):ReturnType<World["recordSelfDamage"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneRecordSelfDamage(this.#host,...args));}
 bankEssenceSpill(...args:Parameters<World["bankEssenceSpill"]>):ReturnType<World["bankEssenceSpill"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneBankEssenceSpill(this.#host,...args));}
 deedEnemy(...args:Parameters<World["deedEnemy"]>):ReturnType<World["deedEnemy"]>{return this.#entry(this,{physical:[args[0]],permission:'physical'},()=>native.sceneDeedEnemy(this.#host,...args));}
 deedOwned(...args:Parameters<World["deedOwned"]>):ReturnType<World["deedOwned"]>{return this.#entry(this,{sources:[args[0]],permission:'attribution'},()=>native.sceneDeedOwned(this.#host,...args));}
 hasDeedEnemyNearby(...args:Parameters<World["hasDeedEnemyNearby"]>):ReturnType<World["hasDeedEnemyNearby"]>{return this.#entry(this,{permission:'attribution'},()=>native.sceneHasDeedEnemyNearby(this.#host,...args));}
 rollAbilityEssenceDrop(...args:Parameters<World["rollAbilityEssenceDrop"]>):ReturnType<World["rollAbilityEssenceDrop"]>{return this.#entry(this,{permission:'attribution'},()=>native.sceneRollAbilityEssenceDrop(this.#host,...args));}
 dropAmalgamPart(...args:Parameters<World["dropAmalgamPart"]>):ReturnType<World["dropAmalgamPart"]>{return this.#entry(this,{permission:'attribution'},()=>native.sceneDropAmalgamPart(this.#host,...args));}
 deedHands(...args:Parameters<World["deedHands"]>):ReturnType<World["deedHands"]>{return this.#entry(this,{sources:args[0]?[args[0]]:[],permission:'attribution'},()=>native.sceneDeedHands(this.#host,...args));}
 openWritHand(...args:Parameters<World["openWritHand"]>):ReturnType<World["openWritHand"]>{return this.#entry(this,{sources:args[1]?[args[1]]:[],permission:'attribution'},()=>native.sceneOpenWritHand(this.#host,...args));}
}
