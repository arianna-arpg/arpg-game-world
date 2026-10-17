/** Late first discovery keeps one native winner per warm area lifetime.
 * Extract/Borough renew only through their actual completed spent epoch. */
import type {World} from '../engine/world';
import type {ActiveEncounter} from '../engine/encounter';
import type {NativeSceneFrameHost} from '../engine/nativeSceneFrameHost';
import * as native from '../engine/nativeSceneEncounterBirth';
import {sceneSettleExtraction,sceneSettleBorough} from '../engine/nativeSceneLocalControllers';
import {ExtractionField} from '../packages/overlays/extraction';
import {BoroughField} from '../packages/overlays/borough';
import {NativeAreaSceneEncounterBirth} from './nativeAreaSceneEncounterBirth';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
type Renewal={field:ExtractionField|BoroughField;kind:'extraction'|'borough';epoch:object;at:number;encounter:ActiveEncounter};
const initialDiscovery=NativeAreaSceneEncounterBirth.prototype.initialDiscovery;
const spent={extraction:ExtractionField.prototype.nativeSpentEpoch,borough:BoroughField.prototype.nativeSpentEpoch};
const renewed={extraction:ExtractionField.prototype.nativeSpentEpochRenewed,borough:BoroughField.prototype.nativeSpentEpochRenewed};
export class NativeAreaSceneEncounterArrival {
 readonly host:native.NativeSceneEncounterBirthHost;
 readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #frameHost:NativeSceneFrameHost;
 readonly #definition:World['zone'];readonly #encounters:World['encounters'];readonly #birth:NativeAreaSceneEncounterBirth;
 readonly #select=NativeAreaSceneTransitionCoordinator.prototype.delayedArrivalBody;
 #initialRead=false;#winner:ActiveEncounter|undefined;#renewal:Renewal|undefined;#busy=false;#arriving=false;#failed=false;
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,physical:NativeSceneFrameHost){
  if(!isNativeAreaSceneCombat(combat))throw Error('Native encounter arrival needs its actual aggregate');assertNativeCombatOwnerEntry(combat,entry);
  this.#combat=combat;this.#entry=entry;this.#frameHost=physical;this.#definition=combat.scene.zone;
  const birth=this.#birth=combat.input.assembly.input.encounters;this.#encounters=birth.input.state.encounters;
  const host={} as native.NativeSceneEncounterBirthHost;
  const fields=(provider:object,keys:readonly (keyof native.NativeSceneEncounterBirthHost)[],write=false)=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get:()=>{this.#arrival();const value=Reflect.get(provider,key);this.#arrival();return value;},...(write?{set:(value:unknown)=>{this.#arrival();if(!Reflect.set(provider,key,value))throw Error('Native encounter state write refused');this.#arrival();}}:{})});};
  const methods=(provider:object,keys:readonly (keyof native.NativeSceneEncounterBirthHost)[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get:()=>{this.#arrival();const fn=Reflect.get(provider,key);this.#arrival();return(...args:unknown[])=>{this.#arrival();const value=Reflect.apply(fn,provider,args);this.#arrival();return value;};}});};
  fields(birth.input.scene,['zone','actors','player']);fields(birth.input.geometry,['doodads']);fields(birth.input.campaign,['sim','manifest']);fields(birth.input.state,['encounters','inCave']);fields(birth.input.state,['encRng'],true);
  methods(physical,['createMonster']);methods(birth.input.geometry,['clampPos','farPoint','findFreeSpot']);methods(birth.input.population.input.sources.ambient,['weightedPick']);
  Object.defineProperties(host,{
   eventDensityFor:{enumerable:true,value:(...args:Parameters<World['eventDensityFor']>)=>{this.#arrival();return native.encounterBirthEventDensityFor(host,...args);}},
   materializeExtractionNode:{enumerable:true,value:(...args:Parameters<World['materializeExtractionNode']>)=>{this.#arrival();return native.encounterBirthMaterializeExtractionNode(host,...args);}},
   materializeBorough:{enumerable:true,value:(...args:Parameters<World['materializeBorough']>)=>{this.#arrival();return native.encounterBirthMaterializeBorough(host,...args);}},
   rollExtractTemper:{enumerable:true,value:(...args:Parameters<World['rollExtractTemper']>)=>{this.#arrival();return native.encounterBirthRollExtractTemper(host,...args);}},
  });this.host=Object.freeze(host);Object.defineProperty(this,'host',{writable:false,configurable:false});
 }
 #ready():void {if(this.#combat.scene.zone!==this.#definition||this.#birth.input.state.encounters!==this.#encounters)throw Error('Native encounter area identity changed');if(this.#failed)throw Error('Native encounter partial native effects cannot replay');}
 #initial():void {this.#ready();if(this.#initialRead)return;const state=Reflect.apply(initialDiscovery,this.#birth,[]);if(!state.attempted)throw Error('Native encounter arrival precedes actual initial birth');this.#initialRead=true;this.#winner=state.winner;if(state.failed){this.#failed=true;throw Error('Native encounter initial partial effects cannot replay');}}
 #arrival():void {this.#ready();if(!this.#arriving)throw Error('Native encounter helper needs its actual active arrival');Reflect.apply(this.#select,this.#combat.input.coordinator,[this.#combat,'encounter']);if(this.#combat.scene.zone!==this.#definition)throw Error('Native encounter selected definition changed');}
 canUpdateFrame():boolean {if(this.#combat.scene.zone!==this.#definition||this.#birth.input.state.encounters!==this.#encounters)throw Error('Native encounter area identity changed');if(this.#failed||this.#busy)return false;this.#initial();return true;}
 arrive():void {this.#entry(this,{permission:'physical'},()=>{
  if(this.#busy)throw Error('Native encounter arrival cannot reenter');this.#initial();this.#arriving=true;
  try{this.#arrival();if(this.#encounters.length)return;if(this.#winner){const r=this.#renewal;if(!r||r.encounter!==this.#winner)return;const field=r.kind==='extraction'?this.#combat.input.campaign.sim.extractionField:this.#combat.input.campaign.sim.boroughField;if(field!==r.field||!Reflect.apply(renewed[r.kind],r.field,[r.epoch,this.#definition.id,r.at]))return;this.#arrival();this.#winner=undefined;this.#renewal=undefined;}
   const previousRng=this.#birth.input.state.encRng;this.#busy=true;
   try{native.encounterBirthPlaceEncounters(this.host,this.#definition);this.#arrival();if(this.#encounters.length>1||!this.#encounters.length&&this.#birth.input.state.encRng!==previousRng)throw Error('Native encounter placement lost its exact winner');this.#winner=this.#encounters[0];}
   catch(error){this.#failed=true;throw error;}finally{this.#busy=false;}
  }finally{this.#arriving=false;}
 });}
 #settle(kind:'extraction'|'borough',e:ActiveEncounter,action:()=>void):void {this.#entry(this,{permission:'physical'},()=>{
  this.#initial();if(this.#busy)throw Error('Native encounter settlement cannot reenter placement');if(!this.#encounters.includes(e))throw Error('Native encounter settlement requires its actual local row');
  const alreadySettled=kind==='extraction'?e.ex?.settled:e.bo?.settled;this.#busy=true;try{action();this.#ready();if(e!==this.#winner||alreadySettled)return;const field=kind==='extraction'?this.#combat.input.campaign.sim.extractionField:this.#combat.input.campaign.sim.boroughField;if(!field)return;const at=this.#frameHost.time,epoch=Reflect.apply(spent[kind],field,[this.#definition.id,at]);if(!epoch)throw Error('Native encounter settlement lost its actual spent epoch');this.#renewal={field,kind,epoch,at,encounter:e};}
  catch(error){if(e===this.#winner)this.#failed=true;throw error;}finally{this.#busy=false;}
 });}
 settleExtraction(e:ActiveEncounter,outcome:'depleted'|'shattered'):void {this.#settle('extraction',e,()=>sceneSettleExtraction(this.#frameHost,e,outcome));}
 settleBorough(e:ActiveEncounter,outcome:'held'|'lost'):void {this.#settle('borough',e,()=>sceneSettleBorough(this.#frameHost,e,outcome));}
}
