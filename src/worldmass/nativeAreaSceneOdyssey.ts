/** Native local pressure algorithms over the real area's admitted factory and stores. */
import {OdysseyRuntime,type NativeOdysseyHost} from '../engine/odyssey';
import {isNativeAreaCampaignOdyssey,NativeAreaCampaignOdyssey} from './nativeAreaCampaignOdyssey';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
const actual=new WeakSet<object>();
export function isNativeAreaSceneOdyssey(value:unknown):value is NativeAreaSceneOdyssey{return !!value&&typeof value==='object'&&actual.has(value);}
export class NativeAreaSceneOdyssey extends OdysseyRuntime {
 readonly host:NativeOdysseyHost;readonly canonical:NativeAreaCampaignOdyssey;
 readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #checkCanonical:NativeAreaCampaignOdyssey['assertOwner'];
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,fixedHost:Omit<NativeOdysseyHost,'enrollOdysseyQuest'|'learnQuestDirections'|'prepareOdysseyGround'|'questLedger'|'keeperCampaign'|'odysseyLeads'>){
  if(!isNativeAreaSceneCombat(combat))throw Error('Native Odyssey needs its actual aggregate');assertNativeCombatOwnerEntry(combat,entry);const campaign=combat.input.campaign.odyssey;
  if(!isNativeAreaCampaignOdyssey(campaign)||combat.input.characterWriter.odyssey!==campaign)throw Error('Native Odyssey needs one canonical writer/campaign state');
  const host=Object.create(fixedHost) as NativeOdysseyHost;Object.defineProperty(host,'seats',{enumerable:true,get:()=>combat.frameSeats()});
  for(const key of ['enrollOdysseyQuest','learnQuestDirections','prepareOdysseyGround','questLedger'] as const)Object.defineProperty(host,key,{enumerable:true,get(){const receiver=combat.input.quests,fn=receiver[key];return(...args:unknown[])=>Reflect.apply(fn,receiver,args);}});
  for(const key of ['keeperCampaign','odysseyLeads'] as const)Object.defineProperty(host,key,{enumerable:true,get(){const receiver=combat.input.campaign,fn=receiver[key];return(...args:unknown[])=>Reflect.apply(fn,receiver,args);}});
  super(Object.freeze(host),campaign);this.host=host;this.canonical=campaign;this.#combat=combat;this.#entry=entry;this.#checkCanonical=NativeAreaCampaignOdyssey.prototype.assertOwner;actual.add(this);for(const key of ['host','canonical'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 clearWarnings():void{this.#entry(this,{permission:'physical'},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);this.clearLocalWarnings();});}
 clearBodyCache():void{this.#entry(this,{permission:'physical'},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);this.clearLocalBodyCache();});}
 override restore(raw:Parameters<OdysseyRuntime['restore']>[0]):void{this.canonical.restore(raw);}
 override snapshot():ReturnType<OdysseyRuntime['snapshot']>{return this.canonical.snapshot();}
 override leaveZone():void{this.#entry(this,{permission:'physical'},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);super.capture();this.clearLocalWarnings();});}
 override hasLocalLeads(...args:Parameters<OdysseyRuntime['hasLocalLeads']>):ReturnType<OdysseyRuntime['hasLocalLeads']>{return this.#entry(this,{permission:'physical',},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);const receiver=this.#combat.input.quests.odyssey,fn=receiver.hasLocalLeads;return Reflect.apply(fn,receiver,args);});}
 override localLeads(...args:Parameters<OdysseyRuntime['localLeads']>):ReturnType<OdysseyRuntime['localLeads']>{return this.#entry(this,{permission:'physical',},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);const receiver=this.#combat.input.quests.odyssey,fn=receiver.localLeads;return Reflect.apply(fn,receiver,args);});}
 override reveal(...args:Parameters<OdysseyRuntime['reveal']>):ReturnType<OdysseyRuntime['reveal']>{return this.#entry(this,{permission:'physical',},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);const receiver=this.#combat.input.quests.odyssey,fn=receiver.reveal;return Reflect.apply(fn,receiver,args);});}
 override questCompleted(...args:Parameters<OdysseyRuntime['questCompleted']>):ReturnType<OdysseyRuntime['questCompleted']>{return this.#entry(this,{permission:'physical',},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);const receiver=this.#combat.input.quests.odyssey,fn=receiver.questCompleted;return Reflect.apply(fn,receiver,args);});}
 override leaderQuestDone(...args:Parameters<OdysseyRuntime['leaderQuestDone']>):ReturnType<OdysseyRuntime['leaderQuestDone']>{return this.#entry(this,{permission:'physical',},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);const receiver=this.#combat.input.quests.odyssey,fn=receiver.leaderQuestDone;return Reflect.apply(fn,receiver,args);});}
 override expandBanditTurf(...args:Parameters<OdysseyRuntime['expandBanditTurf']>):ReturnType<OdysseyRuntime['expandBanditTurf']>{return this.#entry(this,{permission:'physical',},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);const receiver=this.#combat.input.quests.odyssey,fn=receiver.expandBanditTurf;return Reflect.apply(fn,receiver,args);});}
 override killed(...args:Parameters<OdysseyRuntime['killed']>):ReturnType<OdysseyRuntime['killed']>{return this.#entry(this,{permission:'physical',physical:[args[0]],},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);return super.killed(...args);});}
 override escaped(...args:Parameters<OdysseyRuntime['escaped']>):ReturnType<OdysseyRuntime['escaped']>{return this.#entry(this,{permission:'physical',physical:[args[0]],},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);return super.escaped(...args);});}
 override tradeRefusal(...args:Parameters<OdysseyRuntime['tradeRefusal']>):ReturnType<OdysseyRuntime['tradeRefusal']>{return this.#entry(this,{permission:'physical',},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);return super.tradeRefusal(...args);});}
 override pressureText(...args:Parameters<OdysseyRuntime['pressureText']>):ReturnType<OdysseyRuntime['pressureText']>{return this.#entry(this,{permission:'physical',},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);return super.pressureText(...args);});}
 override status(...args:Parameters<OdysseyRuntime['status']>):ReturnType<OdysseyRuntime['status']>{return this.#entry(this,{permission:'physical',},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);return super.status(...args);});}
 override clues(...args:Parameters<OdysseyRuntime['clues']>):ReturnType<OdysseyRuntime['clues']>{return this.#entry(this,{permission:'physical',},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);return super.clues(...args);});}
 override capture(...args:Parameters<OdysseyRuntime['capture']>):ReturnType<OdysseyRuntime['capture']>{return this.#entry(this,{permission:'physical',},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);return super.capture(...args);});}
 override update(...args:Parameters<OdysseyRuntime['update']>):ReturnType<OdysseyRuntime['update']>{return this.#entry(this,{permission:'physical',},()=>{Reflect.apply(this.#checkCanonical,this.canonical,[this]);if(!this.#combat.isPresentLocalPlayer()){this.clearLocalWarnings();return;}return super.update(...args);});}
}
