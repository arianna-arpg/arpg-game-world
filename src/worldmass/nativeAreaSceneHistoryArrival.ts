/** A retained revisit applies the native remembered-enemy entry effects through
 * the actual area's factory. Only its selected local story arrival may issue it. */
import type {NativeSceneHistoryHost} from '../engine/nativeSceneHistory';
import {historyManifestNemeses,historySpawnNemesisActor,historyApplyGrudgeEffects} from '../engine/nativeSceneHistory';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
export class NativeAreaSceneHistoryArrival {
 readonly host:NativeSceneHistoryHost;
 readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #assertArrival:NativeAreaSceneTransitionCoordinator['assertHistoryArrival'];
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,physical:Pick<NativeSceneHistoryHost,'createMonster'|'promoteRarity'>){
  if(!isNativeAreaSceneCombat(combat))throw Error('Native history arrival needs its actual aggregate');assertNativeCombatOwnerEntry(combat,entry);
  this.#combat=combat;this.#entry=entry;this.#assertArrival=NativeAreaSceneTransitionCoordinator.prototype.assertHistoryArrival;
  const history=combat.input.assembly.input.history,host=Object.create(history.host) as NativeSceneHistoryHost;
  const methods=(provider:object,keys:readonly (keyof NativeSceneHistoryHost)[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){const fn=Reflect.get(provider,key);return(...args:unknown[])=>Reflect.apply(fn,provider,args);}});};
  methods(history.input.geometry,['findFreeSpot','clampPos']);methods(history.input.services,['notice','text']);
  methods(history,['modeStageDef','corpseRecords','nemesisActive','watchedSagas','sagaDirty']);
  for(const key of ['createMonster','promoteRarity'] as const)Object.defineProperty(host,key,{enumerable:true,get(){const fn=physical[key];return(...args:unknown[])=>Reflect.apply(fn,physical,args);}});
  Object.defineProperty(host,'spawnNemesisActor',{enumerable:true,value:(...args:Parameters<NativeSceneHistoryHost['spawnNemesisActor']>)=>historySpawnNemesisActor(host,...args)});
  this.host=Object.freeze(host);Object.defineProperty(this,'host',{writable:false,configurable:false});
 }
 arrive():void{this.#entry(this,{permission:'physical'},()=>{const definition=Reflect.apply(this.#assertArrival,this.#combat.input.coordinator,[this.#combat]);historyManifestNemeses(this.host,definition);historyApplyGrudgeEffects(this.host,definition);});}
}
