/** One real writer supplies campaign state. Local effects resolve their actual
 * retained owner; no World combat or local scene adapter is a fallback. */
import {NativeAreaCampaignOdyssey} from './nativeAreaCampaignOdyssey';
import {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';
import {isNativeWorld,type World} from '../engine/world';
import {sceneSeatOf,sceneSeatOfRoot,sceneMarkMetaDirty} from '../engine/nativeSceneCombatContext';
import {sceneQuestHand} from '../engine/nativeSceneQuests';
import {sceneReliquaryLesson} from '../engine/nativeSceneQuestInteraction';
import {sceneCampaignOdysseyLeads,sceneCampaignModeStageDef,sceneCampaignMetaProgressionActive} from '../engine/nativeSceneCampaignQueries';
import type {NativeAreaOngoingCampaign,NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';
import {isNativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {isNativeAreaSceneTransitionCoordinator,type NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
import {nativeBirthAsyncResult} from './nativeAreaScenePopulation';
const writers=new WeakSet<World>(),actualSessions=new WeakSet<object>();
export function hasNativeAreaCampaignSession(writer:World):boolean{return writers.has(writer);}
export function isNativeAreaCampaignSession(value:unknown):value is NativeAreaCampaignSession{return !!value&&typeof value==='object'&&actualSessions.has(value);}
export class NativeAreaCampaignSession {
 readonly writer:World;readonly campaign:NativeAreaOngoingCampaign;readonly odyssey:NativeAreaCampaignOdyssey;
 #coordinator:NativeAreaSceneTransitionCoordinator|null=null;#preparing:NativeAreaSceneOngoing|null=null;
 constructor(writer:World){
  if(!isNativeWorld(writer)||writers.has(writer))throw Error('Native campaign session requires its one actual writer');assertNativeRetainedMassState(writer);this.writer=writer;
  const view={} as NativeAreaOngoingCampaign,self=this;
  const fields=["partyRows","mintVeil","zoneMap","caveMap","sim","manifest","nextGenId","surveyed","visited","crossDimWarned","zoneMemory","time","account","accountDirty","dropRuleOf","questSeat","completedObjectives","localSeat","actingSeat","mireilleSeatBuff","mireilleXpBuff","ledger","vendorHolds","mercSheets","charDirty","seats","bountyHands","activeQuests","clientActionHook","massRuntime","annexFound","meta","charDeaths","hiredMercs","lastSagaFlushAt","manifestedThisRun","descentRun","descentStocks","questImbues","massSettlementDay","holdMissingWarned","vendorArmedBeat","chandlerStock","vendorRestockAt","stationArmed","discoveredWaypoints","squadSeq","vendorStock","theaterVisitSeq","ownQuestLedger","questLedgerOverride","seatNoteAt","journalDirty","netJournal","timeflow","mercSyncedLevel","kills"] as const;
  for(const key of fields)Object.defineProperty(view,key,{enumerable:true,get:()=>{assertNativeRetainedMassState(writer);return Reflect.get(writer,key);},set:value=>{assertNativeRetainedMassState(writer);if(!Reflect.set(writer,key,value))throw new TypeError('Native campaign field is not writable: '+key);}});
  // These original callables read campaign/writer state only. Selection stays
  // live and invocation preserves the real selected writer receiver.
  const globals=["sameParty","seatHero","accountSeat","continentFor","notice","mireilleLessonLived","mireilleGiftOwed","mireilleGiftLesson","seatHudOf","questLedgerOf","forechartSounding","invalidateZonesSaveMemo","keeperCampaign","heroKnown","bagItem"] as const;
  for(const key of globals)Object.defineProperty(view,key,{enumerable:true,get(){assertNativeRetainedMassState(writer);const method=writer[key];return(...args:unknown[])=>{assertNativeRetainedMassState(writer);return Reflect.apply(method as Function,writer,args);};}});
  const method=<O extends object,K extends keyof O>(name:PropertyKey,owner:()=>O,key:K)=>Object.defineProperty(view,name,{enumerable:true,get(){assertNativeRetainedMassState(writer);const receiver=owner(),fn=receiver[key];return(...args:unknown[])=>{assertNativeRetainedMassState(writer);return Reflect.apply(fn as Function,receiver,args);};}});
  const queryHost=Object.freeze({get seatByActor(){assertNativeRetainedMassState(writer);return Reflect.get(writer,'seatByActor') as World['seatByActor'];},get metaDirty(){assertNativeRetainedMassState(writer);return Reflect.get(writer,'metaDirty') as World['metaDirty'];}});
  Object.defineProperties(view,{
   presentWorlds:{enumerable:true,value:()=>{if(!self.#coordinator)throw Error('Native campaign has no actual directory');return self.#coordinator.presentWorlds();}},
   seatOf:{enumerable:true,value:(...args:Parameters<World['seatOf']>)=>sceneSeatOf(queryHost,...args)},
   seatOfRoot:{enumerable:true,value:(...args:Parameters<World['seatOfRoot']>)=>sceneSeatOfRoot(queryHost,...args)},
   markMetaDirty:{enumerable:true,value:(...args:Parameters<World['markMetaDirty']>)=>sceneMarkMetaDirty(queryHost,...args)},
   metaProgressionActive:{enumerable:true,value:()=>sceneCampaignMetaProgressionActive({modeStageDef:()=>sceneCampaignModeStageDef(view)})},
   questHand:{enumerable:true,value:()=>sceneQuestHand(view)},
   reliquaryLesson:{enumerable:true,value:()=>sceneReliquaryLesson(view)},
   odysseyLeads:{enumerable:true,value:(...args:Parameters<World['odysseyLeads']>)=>sceneCampaignOdysseyLeads(view,...args)},
   // Preserve the actual campaign Odyssey state owner. Local quest effects
   // use their separate scoped facade; native saving still uses this controller.
   odyssey:{enumerable:true,get:()=>self.odyssey},
   nativeResidentHistory:{enumerable:true,value:{dialogueVisits:writer.npcDialogues['visits'],get dialogueScene(){return writer.dialogueScene;},set dialogueScene(value:number){writer.dialogueScene=value;}}},
  });
  method('text',()=>self.current.assembly.objectiveController,'text');
  method('questStanding',()=>self.current.quests,'questStanding');
  method('questDefOf',()=>self.current.assembly.input.bounty,'questDefOf');
  const expected=["account","accountDirty","accountSeat","actingSeat","activeQuests","annexFound","bagItem","bountyHands","caveMap","chandlerStock","charDeaths","charDirty","clientActionHook","completedObjectives","continentFor","crossDimWarned","descentRun","descentStocks","discoveredWaypoints","dropRuleOf","forechartSounding","heroKnown","hiredMercs","holdMissingWarned","invalidateZonesSaveMemo","journalDirty","keeperCampaign","kills","lastSagaFlushAt","ledger","localSeat","manifest","manifestedThisRun","markMetaDirty","massRuntime","massSettlementDay","mercSheets","mercSyncedLevel","meta","metaProgressionActive","mintVeil","mireilleGiftLesson","mireilleGiftOwed","mireilleLessonLived","mireilleSeatBuff","mireilleXpBuff","nativeResidentHistory","netJournal","nextGenId","notice","odyssey","odysseyLeads","ownQuestLedger","partyRows","presentWorlds","questDefOf","questHand","questImbues","questLedgerOf","questLedgerOverride","questSeat","questStanding","reliquaryLesson","sameParty","seatHero","seatHudOf","seatNoteAt","seatOf","seatOfRoot","seats","sim","squadSeq","stationArmed","surveyed","text","theaterVisitSeq","time","timeflow","vendorArmedBeat","vendorHolds","vendorRestockAt","vendorStock","visited","zoneMap","zoneMemory"];if(JSON.stringify(Object.keys(view).sort())!==JSON.stringify(expected))throw Error('Native campaign projection does not cover its exact audited contract');
  this.campaign=Object.freeze(view);for(const key of ['writer','campaign'])Object.defineProperty(this,key,{writable:false,configurable:false});writers.add(writer);actualSessions.add(this);try{this.odyssey=new NativeAreaCampaignOdyssey(this);}catch(error){writers.delete(writer);actualSessions.delete(this);throw error;}Object.defineProperty(this,'odyssey',{writable:false,configurable:false});
 }
 residentAreas():readonly NativeAreaSceneOngoing[]{if(!this.#coordinator)return [];return this.#coordinator.residentAreas();}
 bindCoordinator(coordinator:NativeAreaSceneTransitionCoordinator):void {if(this.#coordinator||!isNativeAreaSceneTransitionCoordinator(coordinator)||coordinator.input.campaign!==this.campaign||coordinator.input.characterWriter!==this.writer)throw Error('Native campaign selection needs its identical actual coordinator');this.#coordinator=coordinator;}
 get current():NativeAreaSceneOngoing {if(this.#preparing)return this.#preparing;if(!this.#coordinator)throw Error('Native campaign has no selected actual area');return this.#coordinator.current;}
 /** The concrete preparation owner selects its newly constructed actual local
  * services while native birth runs. This grants no physical combat authority. */
 duringPreparation<T>(area:NativeAreaSceneOngoing,action:()=>T):T {
  assertNativeRetainedMassState(this.writer);
  if(!isNativeAreaSceneCombat(area.combat)||area.combat.input.campaign!==this.campaign||area.combat.input.assembly!==area.assembly||area.combat.input.characterWriter!==this.writer)throw Error('Native preparation campaign needs actual area roots');
  if(this.#preparing&&this.#preparing!==area)throw Error('Native campaign preparation cannot borrow another area context');const prior=this.#preparing;this.#preparing=area;
  try{const result=action();if(nativeBirthAsyncResult(result))throw Error('Native campaign preparation must be synchronous');return result;}finally{this.#preparing=prior;}
 }
}
