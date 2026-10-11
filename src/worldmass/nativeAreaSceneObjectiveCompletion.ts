/** Retained native objective completion and XP. Does not provide an objective
 * watcher, progression/combat owner, quest payout owner or runtime publication. */
import type {World} from '../engine/world';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import type {NativeSceneObjectiveState} from './nativeSceneState';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaSceneHistory} from './nativeAreaSceneHistory';
import * as native from '../engine/nativeSceneObjectiveCompletion';
type Host=native.NativeSceneObjectiveCompletionHost;
export type NativeSceneObjectiveCampaign=Pick<Host,'account'|'completedObjectives'|'localSeat'|'actingSeat'|'seats'|'mireilleSeatBuff'|'time'|'mireilleXpBuff'|'ledger'|'seatHero'|'sameParty'|'markMetaDirty'|'accountSeat'>;
export type NativeSceneObjectiveProgression=Pick<Host,'recalcSeat'|'resyncMercenary'>;
export type NativeSceneObjectiveQuests=Pick<Host,'activeQuests'|'questLedgerOf'|'onQuestZoneFieldCleared'>;
export interface NativeSceneObjectiveCompletionState {objectiveFallAt:Host['objectiveFallAt'];texts:Host['texts']}
export function freshSceneObjectiveCompletionState():NativeSceneObjectiveCompletionState{return {objectiveFallAt:null,texts:[]};}
export interface NativeSceneObjectiveCompletionInput {
 scene:NativeSceneCensus;
 geometry:Pick<NativeAreaSceneGeometry,'state'|'flashes'>;
 objectives:NativeSceneObjectiveState;
 state:NativeSceneObjectiveCompletionState;
 campaign:NativeSceneObjectiveCampaign;
 history:Pick<NativeAreaSceneHistory,'modeStageDef'>;
 /** REQUIRED area-aware progression authority. recalcSeat may route statuses,
  * kill/relevel companions or remove workings; resyncMercenary reads local level.
  * Active-World methods cannot stand in for either neighboring-area service. */
 progression:NativeSceneObjectiveProgression;
 /** REQUIRED retained quest authority. Selection reads live real ledgers; the
  * field callback still owns cargo, rescue, choice and complete quest rewards.
  * It must read this area's ground/census/drop state and shared seat ledgers. */
 quests:NativeSceneObjectiveQuests;
}
export class NativeAreaSceneObjectiveCompletion {
 readonly input:NativeSceneObjectiveCompletionInput;
 readonly host:Host;
 constructor(raw:NativeSceneObjectiveCompletionInput){
  const bindings=Object.create(null);
  for(const key of ['scene','geometry','objectives','state','campaign','history','progression','quests']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native objective completion needs an own object binding: '+key);
   bindings[key]=d.value;
  }
  const input:NativeSceneObjectiveCompletionInput=this.input=Object.freeze(bindings),host={} as Host,self=this;
  const gd=Object.getOwnPropertyDescriptor(input.geometry,'state');
  if(!gd||!Object.hasOwn(gd,'value')||gd.value!==input.scene)throw Error('Native objective completion needs identical geometry and scene');
  const td=Object.getOwnPropertyDescriptor(input.state,'texts');
  if(!td||!Object.hasOwn(td,'value')||!Array.isArray(td.value))throw Error('Native objective completion needs its retained text array');
  const fields=(provider:()=>object,keys:readonly string[],write=false)=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,
   get(){return (provider() as Record<string,unknown>)[key];},...(write?{set(v:unknown){(provider() as Record<string,unknown>)[key]=v;}}:{})});};
  const methods=(provider:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){
   const owner=provider() as Record<string,Function>,fn=owner[key];
   if(typeof fn!=='function')throw Error('Missing native objective capability: '+key);
   return (...args:unknown[])=>fn.apply(owner,args);
  }});};
  fields(()=>input.scene,['zone','player','actors']);fields(()=>input.geometry,['flashes']);
  fields(()=>input.objectives,['objectiveDone','spires','rifts','pyres','digs'],true);
  fields(()=>input.state,['objectiveFallAt','texts'],true);
  fields(()=>input.campaign,['account','completedObjectives','localSeat','actingSeat','seats','mireilleSeatBuff','time','mireilleXpBuff','ledger']);
  methods(()=>input.campaign,['seatHero','sameParty','markMetaDirty','accountSeat']);
  fields(()=>input.quests,['activeQuests']);methods(()=>input.quests,['questLedgerOf','onQuestZoneFieldCleared']);
  methods(()=>input.progression,['recalcSeat','resyncMercenary']);
  methods(()=>self,['grantXp','grantSeatXp','objectivePlaces','questOnZone','text','metaProgressionActive']);
  this.host=Object.freeze(host);for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 metaProgressionActive(){return this.input.history.modeStageDef().metaProgression;}
 completeObjective(...a:Parameters<World['completeObjective']>){return native.sceneCompleteObjective(this.host,...a);}
 objectivePlaces(){return native.sceneObjectivePlaces(this.host);}
 grantXp(...a:Parameters<World['grantXp']>){return native.sceneGrantXp(this.host,...a);}
 grantSeatXp(...a:Parameters<World['grantSeatXp']>){return native.sceneGrantSeatXp(this.host,...a);}
 questOnZone(...a:Parameters<World['questOnZone']>){return native.sceneQuestOnZone(this.host,...a);}
 text(...a:Parameters<World['text']>){return native.sceneText(this.host,...a);}
}
