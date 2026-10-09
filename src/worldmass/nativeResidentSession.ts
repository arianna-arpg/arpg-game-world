import type {World} from '../engine/world';
import type {NativeSceneCensus,NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import type {NativeAreaResidentContext} from './nativeAreaAmbient';
import type {NativeNpcDialogueHost} from '../engine/nativeNpcDialogueHost';
import {NpcDialogueDirector} from '../engine/npcDialogues';
export type NativeResidentCampaign=Pick<NativeNpcDialogueHost,
 'account'|'ledger'|'activeQuests'|'questStanding'|'questDefOf'|'manifest'|'metaProgressionActive'|'accountDirty'|'charDirty'|'time'|'localSeat'|'questImbues'|'reliquaryLesson'|'mireilleLessonLived'|'mireilleGiftOwed'|'mireilleGiftLesson'> & {massSettlementDay:World['massSettlementDay']};
export type NativeResidentLocal=Pick<NativeNpcDialogueHost,
 'localZoneAt'|'isSafeAt'|'viewRectFor'|'lineOfSight'|'exits'|'massRuntime'|'scene'|'clientActionHook'> & {readonly census:NativeSceneCensus};
export interface NativeResidentArea {census:NativeSceneCensus;local:NativeResidentLocal}
/** One native run/session owner, retained through sequential area entries.
 * bindArea changes the live local providers only. The complete native resident
 * birth operation performs its original resets/leaveZone at the original stage.
 * This is not a serialized director or a simultaneous multi-area controller. */
export class NativeResidentSession {
 readonly campaign:NativeResidentCampaign;
 private area:NativeResidentArea;
 readonly host:NativeNpcDialogueHost;
 readonly npcDialogues:NpcDialogueDirector;
 readonly speakerRows:World['speakerRows']=new Map();
 readonly speechMemory:World['speechMemory']=new Map();
 readonly speechFocus:World['speechFocus']=new Map();
 speechFocusSpeaker:World['speechFocusSpeaker'];
 dialogueScene=0;
 readonly residentContext:NativeAreaResidentContext;
 readonly factoryService:{readonly npcDialogues:Pick<NpcDialogueDirector,'appearanceFor'>};
 constructor(raw:{campaign:NativeResidentCampaign;area:NativeResidentArea}){
  const roots=Object.create(null);for(const key of ['campaign','area']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native residents need own object '+key);
   roots[key]=d.value;
  }
  this.campaign=roots.campaign;this.area=this.checkedArea(roots.area);
  const self=this,host={} as NativeNpcDialogueHost;
  function fields(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){return (provider() as Record<string,unknown>)[key];},set(v){(provider() as Record<string,unknown>)[key]=v;}});}
  function methods(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){const owner=provider() as Record<string,Function>,fn=owner[key];return (...args:unknown[])=>fn.apply(owner,args);}});}
  fields(()=>self.campaign,['account','ledger','activeQuests','manifest','accountDirty','charDirty','time','localSeat','questImbues']);
  fields(()=>self.area.census,['actors','player']);
  fields(()=>self.area.local,['exits','massRuntime','scene','clientActionHook']);
  methods(()=>self.campaign,['questStanding','questDefOf','metaProgressionActive','reliquaryLesson','mireilleLessonLived','mireilleGiftOwed','mireilleGiftLesson']);
  methods(()=>self.area.local,['localZoneAt','isSafeAt','viewRectFor','lineOfSight']);
  this.host=Object.freeze(host);this.npcDialogues=new NpcDialogueDirector(host);
  this.residentContext=Object.freeze({
   get account(){return self.campaign.account;},get ledger(){return self.campaign.ledger;},get massSettlementDay(){return self.campaign.massSettlementDay;},
   get speakerRows(){return self.speakerRows;},get speechMemory(){return self.speechMemory;},get speechFocus(){return self.speechFocus;},
   get speechFocusSpeaker(){return self.speechFocusSpeaker;},set speechFocusSpeaker(v:number|undefined){self.speechFocusSpeaker=v;},
   get dialogueScene(){return self.dialogueScene;},set dialogueScene(v:number){self.dialogueScene=v;},
   get npcDialogues(){return self.npcDialogues;},
  });
  this.factoryService=Object.freeze({npcDialogues:this.npcDialogues});
  for(const key of ['campaign','host','npcDialogues','residentContext','factoryService','speakerRows','speechMemory','speechFocus'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 private checkedArea(raw:NativeResidentArea):NativeResidentArea {
  const out=Object.create(null);for(const key of ['census','local']){const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native resident area needs own object '+key);out[key]=d.value;}
  if(out.local.census!==out.census)throw Error('Native resident local/census identity differs');
  if(out.census.player!==this.campaign.localSeat.actor)throw Error('Native resident shopper/seat identity differs');
  return Object.freeze(out);
 }
 /** Birth composition checks this before any door or harbor mutation. */
 ownsBirthPopulation(population:NativeAreaScenePopulation):boolean {
  return population.input.scene===this.area.census&&population.input.context.npcDialogues===this.npcDialogues;
 }
 bindArea(area:NativeResidentArea):void {this.area=this.checkedArea(area);}
 inhabitants(population:NativeAreaScenePopulation) {
  if(population.input.scene!==this.area.census||population.input.context.npcDialogues!==this.npcDialogues)
   throw Error('Native residents require the same local census and factory dialogue director');
  return population.inhabitants(this.residentContext);
 }
}
