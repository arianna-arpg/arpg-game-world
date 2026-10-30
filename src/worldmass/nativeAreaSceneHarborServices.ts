/** Live harbor counters retain their actual area and use its admitted factory. */
import * as native from '../engine/nativeSceneHarbor';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
export class NativeAreaSceneHarborServices {
 readonly host:native.NativeSceneHarborHost;
 #arriving=false;
 readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #arrival:NativeAreaSceneTransitionCoordinator['assertHarborArrival'];
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,physical:Pick<native.NativeSceneHarborHost,'createMonster'>){
  if(!isNativeAreaSceneCombat(combat))throw Error('Native harbor services need their actual aggregate');assertNativeCombatOwnerEntry(combat,entry);this.#combat=combat;this.#entry=entry;this.#arrival=NativeAreaSceneTransitionCoordinator.prototype.assertHarborArrival;
  const owner=combat.input.assembly.input.harbor,host=Object.create(owner.host) as native.NativeSceneHarborHost;
  const check=()=>{if(this.#arriving)Reflect.apply(this.#arrival,this.#combat.input.coordinator,[this.#combat]);};
  const methods=(provider:object,keys:readonly (keyof native.NativeSceneHarborHost)[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){const fn=Reflect.get(provider,key);check();return(...args:unknown[])=>{check();const result=Reflect.apply(fn,provider,args);check();return result;};}});};
  methods(physical,['createMonster']);methods(owner.input.geometry,['setDoorState','findFreeSpot','markDoodadsChanged','clampPos','nativeGridAt']);methods(owner.input.population.input.sources.ambient,['weightedPick']);
  methods(owner.input.settlement,['restockOrdinal','armVendorStock','syncHoldIdx','restockSeconds','mercSheetFor','dealTemplateOffers']);methods(owner.input.services,['notice','text']);
  const helpers={holdStateFor:native.harborHoldStateFor,refreshHoldServices:native.harborRefreshHoldServices,resealDoor:native.harborResealDoor,landPartyAt:native.harborLandPartyAt,refreshHoldDress:native.harborRefreshHoldDress,holdDressSpotOk:native.harborHoldDressSpotOk,armPortMercs:native.harborArmPortMercs};
  for(const [key,fn]of Object.entries(helpers))Object.defineProperty(host,key,{enumerable:true,value:(...args:unknown[])=>{check();const result=Reflect.apply(fn,undefined,[host,...args]);check();return result;}});
  this.host=Object.freeze(host);Object.defineProperty(this,'host',{writable:false,configurable:false});
 }
 arrive():void{if(this.#arriving)throw Error('Native harbor arrival cannot reenter');this.#arriving=true;try{this.#entry(this,{permission:'physical'},()=>{const def=Reflect.apply(this.#arrival,this.#combat.input.coordinator,[this.#combat]);if(def.harborhold||def.holdAnchor)native.harborRefreshHoldServices(this.host,def);});}finally{this.#arriving=false;}}
}
