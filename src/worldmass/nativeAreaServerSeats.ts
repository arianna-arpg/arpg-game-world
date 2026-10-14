import {assertNativeRetainedWriterLive} from './nativeAreaRetainedLifetime';
import {sceneDealVeteranFlasks} from '../engine/nativeCharacterCreation';
/** Server vessel setup in the selected seat's real retained area. */
import type {World,Seat} from '../engine/world';
import type {Actor} from '../engine/actor';
import {sceneRestoreCompanions} from '../engine/nativeSceneFrameTravel';
import {sceneRestoreThrong} from '../engine/nativeCharacterRestoration';
import {sceneDealTravellerFlasks,sceneAdoptQuestLedger,type NativeServerVesselHost} from '../engine/nativeSceneServerVessel';
import {packQuestLedger} from '../engine/questLedger';
import {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
type Host=NativeServerVesselHost&Parameters<typeof sceneRestoreCompanions>[0]&Parameters<typeof sceneRestoreThrong>[0]&Parameters<typeof sceneDealVeteranFlasks>[0];
function own<T>(o:object,k:PropertyKey):T{const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value'))throw Error('Native vessel needs ordinary selected data: '+String(k));return d.value as T;}
export class NativeAreaServerSeats {
 readonly host:Host;readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;
 readonly #binding=NativeAreaActorAuthority.prototype.bindingFor;readonly #final=NativeAreaActorAuthority.prototype.assertFinalPhysical;
 #provisioning:{selection:object;view:Host['provisioningFlaskSlots']}|undefined;
 #selected:{seat:Seat;id:string;body:Actor;meta:Seat['meta'];hero:Actor}|undefined;
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,base:Host){if(!isNativeAreaSceneCombat(combat))throw Error('Native vessel needs its actual aggregate');assertNativeCombatOwnerEntry(combat,entry);this.#combat=combat;this.#entry=entry;
 const host={} as Host;for(const key of ['ledger','account','grantSkillGemItem','learnSkill','bindSkill','rememberSkillSlots','markMetaDirty','localSeat','massRuntime','zoneMap','withQuestHand','questDefOf','handState','player','meta','stashedCompanions','createMonster','tameCompanion','clampPos','actors','liteKindOf','liteKinds','liteOpenAt','minionNeedsFullDurability','mintThrongBody','throngRecruitCap','throngRosterCount','wornThrongAnchorsOf'] as const)Object.defineProperty(host,key,{enumerable:true,get:()=>{this.#check();const value=base[key];this.#check();if(typeof value!=='function')return value;const selected=this.#selected;return(...args:unknown[])=>{if(selected!==this.#selected)throw Error('Expired native vessel method');this.#check();const result=Reflect.apply(value,base,args);this.#check();return result;};}});
 Object.defineProperty(host,'charDirty',{get:()=>{this.#check();const value=base.charDirty;this.#check();return value;},set:value=>{this.#check();base.charDirty=value;this.#check();}});
 Object.defineProperty(host,'dealVeteranFlasks',{value:(...args:Parameters<World['dealVeteranFlasks']>)=>{this.#check();sceneDealVeteranFlasks(host,...args);this.#check();}});
 const nested=(key:'companionBonds'|'lite',method:'refresh'|'spawn')=>Object.defineProperty(host,key,{get:()=>{this.#check();const receiver=base[key];this.#check();const selection=this.#selected;return Object.freeze(Object.defineProperty({},method,{get:()=>{if(selection!==this.#selected)throw Error('Expired native vessel controller');this.#check();const fn=Reflect.get(receiver,method);this.#check();return(...args:unknown[])=>{if(selection!==this.#selected)throw Error('Expired native vessel controller');this.#check();const result=Reflect.apply(fn,receiver,args);this.#check();return result;};}}));}});
 nested('companionBonds','refresh');nested('lite','spawn');
 const collection=(key:'veteranFlaskDeals'|'seatQuests',methods:readonly string[])=>Object.defineProperty(host,key,{get:()=>{this.#check();const receiver=base[key];this.#check();const selection=this.#selected,view={};for(const method of methods)Object.defineProperty(view,method,{get:()=>{if(selection!==this.#selected)throw Error('Expired native vessel collection');this.#check();const fn=Reflect.get(receiver,method);this.#check();return(...args:unknown[])=>{if(selection!==this.#selected)throw Error('Expired native vessel collection');this.#check();const result=Reflect.apply(fn,receiver,args);this.#check();return result;};}});return Object.freeze(view);}});
 collection('veteranFlaskDeals',['has','add']);collection('seatQuests',['set']);
 Object.defineProperty(host,'provisioningFlaskSlots',{get:()=>{const selection=this.#selected;if(!selection)throw Error('Expired native vessel provisioning');if(this.#provisioning?.selection===selection)return this.#provisioning.view;this.#check();const raw=base.provisioningFlaskSlots;this.#check();const view={} as Host['provisioningFlaskSlots'];for(const key of ['add','delete'] as const)Object.defineProperty(view,key,{get:()=>{if(this.#selected!==selection)throw Error('Expired native vessel provisioning');if(key==='add')this.#check();const fn=raw[key];if(this.#selected!==selection)throw Error('Expired native vessel provisioning');if(key==='add')this.#check();return(seat:Seat)=>{if(this.#selected!==selection||seat!==selection.seat)throw Error('Native vessel provisioning needs its original seat');if(key==='add')this.#check();return Reflect.apply(fn,raw,[seat]);};}});this.#provisioning={selection,view:Object.freeze(view)};return view;}});
 this.host=Object.freeze(host);Object.defineProperty(this,'host',{writable:false,configurable:false});}
 /** A check cannot mint a selection or admit a body. */
 assertCharacter():void{this.#character();}
 #character():void{const r=this.#selected,c=this.#combat;if(!r||c.serverSeats!==this)throw Error('Native vessel needs its active selected seat');assertNativeRetainedWriterLive(c.input.characterWriter);const rows=own<Seat[]>(c.input.characterWriter,'seats');let matches=0;for(let i=0;i<own<number>(rows,'length');i++)if(own(rows,i)===r.seat)matches++;if(matches!==1||own(r.seat,'id')!==r.id||own(r.seat,'actor')!==r.body||own(r.seat,'meta')!==r.meta||(Object.getOwnPropertyDescriptor(r.seat,'home')?.value??r.body)!==r.hero)throw Error('Native vessel selected character changed');Reflect.apply(this.#binding,c.input.authority,[c.scene]);}
 assertSelection():void{this.#check();}
 #check():void{this.#character();const c=this.#combat;Reflect.apply(this.#final,c.input.authority,[Reflect.apply(this.#binding,c.input.authority,[c.scene]),[this.#selected!.body]]);}
 #run<T>(seat:Seat,action:()=>T):T{if(this.#selected)throw Error('Native vessel setup cannot reenter');const id=own<string>(seat,'id'),body=own<Actor>(seat,'actor'),meta=own<Seat['meta']>(seat,'meta'),hero=Object.getOwnPropertyDescriptor(seat,'home')?.value??body;return this.#entry(this,{permission:'physical',physical:[body],carried:hero!==body?[hero]:[]},()=>{this.#selected={seat,id,body,meta,hero};try{this.#check();const result=action();this.#check();return result;}finally{this.#selected=undefined;this.#provisioning=undefined;}});}
 /** Rebuild this exact present character through the native stats operation. */
 recalcSeat(seat:Seat):void{return this.#run(seat,()=>{const owner=this.#combat.input.progression,fn=owner.recalcSeat;this.#check();Reflect.apply(fn,owner,[seat]);this.#check();});}
 dealTravellerFlasks(seat:Seat,ledger:Record<string,number>):boolean{return this.#run(seat,()=>sceneDealTravellerFlasks(this.host,seat,ledger));}
 adoptQuestLedger(...args:Parameters<World['adoptQuestLedger']>):void{return this.#run(args[0],()=>sceneAdoptQuestLedger(this.host,...args));}
 restoreCompanions(seat:Seat,...args:Parameters<World['restoreCompanions']>):void{return this.#run(seat,()=>{if(args[1]!==this.#selected!.hero)throw Error('Native vessel restoration needs its exact hero');sceneRestoreCompanions(this.host,...args);});}
 restoreThrong(seat:Seat,...args:Parameters<World['restoreThrong']>):void{return this.#run(seat,()=>{if(args[1]!==this.#selected!.hero)throw Error('Native vessel roster needs its exact hero');sceneRestoreThrong(this.host,...args);});}
 packQuestLedger(...args:Parameters<World['packQuestLedger']>):ReturnType<World['packQuestLedger']>{return this.#run(args[0],()=>packQuestLedger(this.#combat.input.campaign.questLedgerOf(args[0]),args[1]));}
}
