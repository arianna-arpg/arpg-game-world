/** One canonical Odyssey state controller. Physical pressure belongs to its exact retained area. */
import {OdysseyRuntime,type NativeOdysseyHost} from '../engine/odyssey';
import type {OdysseyState} from '../world/odyssey';
import {isNativeAreaCampaignSession,type NativeAreaCampaignSession} from './nativeAreaCampaignSession';
import {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';
import {isNativeAreaSceneOdyssey,type NativeAreaSceneOdyssey} from './nativeAreaSceneOdyssey';
const actual=new WeakSet<object>(),writers=new WeakSet<object>();
export function isNativeAreaCampaignOdyssey(value:unknown):value is NativeAreaCampaignOdyssey{return !!value&&typeof value==='object'&&actual.has(value);}
export class NativeAreaCampaignOdyssey extends OdysseyRuntime {
 readonly #session:NativeAreaCampaignSession;
 constructor(session:NativeAreaCampaignSession){
  if(!isNativeAreaCampaignSession(session))throw Error('Native Odyssey needs its genuine campaign session');
  const writer=session.writer;if(writers.has(writer))throw Error('Native Odyssey writer already has its canonical controller');const old=Object.getOwnPropertyDescriptor(writer,'odyssey');if(!old||!Object.hasOwn(old,'value')||!(old.value instanceof OdysseyRuntime)||isNativeAreaCampaignOdyssey(old.value)||!old.configurable)throw Error('Native Odyssey needs the original ordinary writer controller');
  const prior=Object.getOwnPropertyDescriptor(old.value,'state');if(!prior||!Object.hasOwn(prior,'value'))throw Error('Native Odyssey initial state must be ordinary data');
  let self:NativeAreaCampaignOdyssey;const host={} as NativeOdysseyHost;
  for(const key of ["account","accountDirty","activeQuests","actors","arena","clientActionHook","completedQuests","createMonster","doodadsNear","dropGemAt","enrollOdysseyQuest","exits","findFreeSpot","flashes","gateAccountOf","grantXp","graphWorkAvailable","inCave","keeperCampaign","learnQuestDirections","ledger","localSeat","losCached","manifest","markMetaDirty","meta","metaProgressionActive","notice","odysseyLeads","pathField","player","prepareOdysseyGround","presentWorlds","questHand","questLedger","questRescues","questRunLedger","scene","seatHero","seats","sim","slipAway","text","time","withQuestHand","zone","zoneMap"] as const)Object.defineProperty(host,key,{enumerable:true,get(){self.#live();const provider=Object.hasOwn(session.campaign,key)?session.campaign:self.#selected().host;const value=Reflect.get(provider,key);return typeof value==='function'?(...args:unknown[])=>{self.#live();return Reflect.apply(value,provider,args);}:value;},set(value){self.#live();const provider=Object.hasOwn(session.campaign,key)?session.campaign:self.#selected().host;if(!Reflect.set(provider,key,value))throw new TypeError('Native Odyssey field refused: '+key);}});
  super(Object.freeze(host));self=this;this.#session=session;this.state=prior.value;actual.add(this);writers.add(writer);Object.defineProperty(writer,'odyssey',{...old,value:this});
 }
 #live():void{assertNativeRetainedMassState(this.#session.writer);const d=Object.getOwnPropertyDescriptor(this.#session.writer,'odyssey');if(!d||!Object.hasOwn(d,'value')||d.value!==this)throw Error('Native Odyssey writer binding changed');}
 assertOwner(owner:NativeAreaSceneOdyssey):void{this.#live();if(!isNativeAreaSceneOdyssey(owner)||owner.canonical!==this)throw Error('Native Odyssey local owner differs');}
 #selected():NativeAreaSceneOdyssey{this.#live();const area=this.#session.current,owner=area.combat.odyssey;if(!isNativeAreaSceneOdyssey(owner)||owner.canonical!==this)throw Error('Native Odyssey selected area owner differs');return owner;}
 #areas():readonly NativeAreaSceneOdyssey[]{this.#live();return this.#session.residentAreas().map(area=>{const owner=area.combat.odyssey;if(!isNativeAreaSceneOdyssey(owner)||owner.canonical!==this)throw Error('Native Odyssey resident owner differs');return owner;});}
 override restore(raw:OdysseyState|undefined):void{this.#live();const owners=this.#areas();for(const owner of owners)owner.clearWarnings();super.restore(raw);for(const owner of owners)owner.clearBodyCache();}
 override snapshot():OdysseyState|undefined{this.#live();for(const owner of this.#areas())owner.capture();return this.state?structuredClone(this.state):undefined;}
 override hasLocalLeads(...args:Parameters<OdysseyRuntime['hasLocalLeads']>):ReturnType<OdysseyRuntime['hasLocalLeads']>{return this.#selected().hasLocalLeads(...args);}
 override localLeads(...args:Parameters<OdysseyRuntime['localLeads']>):ReturnType<OdysseyRuntime['localLeads']>{return this.#selected().localLeads(...args);}
 override reveal(...args:Parameters<OdysseyRuntime['reveal']>):ReturnType<OdysseyRuntime['reveal']>{return this.#selected().reveal(...args);}
 override questCompleted(...args:Parameters<OdysseyRuntime['questCompleted']>):ReturnType<OdysseyRuntime['questCompleted']>{return this.#selected().questCompleted(...args);}
 override leaderQuestDone(...args:Parameters<OdysseyRuntime['leaderQuestDone']>):ReturnType<OdysseyRuntime['leaderQuestDone']>{return this.#selected().leaderQuestDone(...args);}
 override expandBanditTurf(...args:Parameters<OdysseyRuntime['expandBanditTurf']>):ReturnType<OdysseyRuntime['expandBanditTurf']>{return this.#selected().expandBanditTurf(...args);}
 override killed(...args:Parameters<OdysseyRuntime['killed']>):ReturnType<OdysseyRuntime['killed']>{return this.#selected().killed(...args);}
 override escaped(...args:Parameters<OdysseyRuntime['escaped']>):ReturnType<OdysseyRuntime['escaped']>{return this.#selected().escaped(...args);}
 override tradeRefusal(...args:Parameters<OdysseyRuntime['tradeRefusal']>):ReturnType<OdysseyRuntime['tradeRefusal']>{return this.#selected().tradeRefusal(...args);}
 override pressureText(...args:Parameters<OdysseyRuntime['pressureText']>):ReturnType<OdysseyRuntime['pressureText']>{return this.#selected().pressureText(...args);}
 override status(...args:Parameters<OdysseyRuntime['status']>):ReturnType<OdysseyRuntime['status']>{return this.#selected().status(...args);}
 override clues(...args:Parameters<OdysseyRuntime['clues']>):ReturnType<OdysseyRuntime['clues']>{return this.#selected().clues(...args);}
 override capture(...args:Parameters<OdysseyRuntime['capture']>):ReturnType<OdysseyRuntime['capture']>{return this.#selected().capture(...args);}
 override leaveZone(...args:Parameters<OdysseyRuntime['leaveZone']>):ReturnType<OdysseyRuntime['leaveZone']>{return this.#selected().leaveZone(...args);}
 override update(...args:Parameters<OdysseyRuntime['update']>):ReturnType<OdysseyRuntime['update']>{return this.#selected().update(...args);}
}
