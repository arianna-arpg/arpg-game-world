/** Live native site births use this actual area's admitted factory and stock.
 * Initial layout keeps its original preparation host and native timing. */
import * as native from '../engine/nativeSceneSites';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
export class NativeAreaSceneSiteBirths {
 readonly host:native.NativeSceneSiteHost;
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,physical:Pick<native.NativeSceneSiteHost,'createMonster'>){
  if(!isNativeAreaSceneCombat(combat))throw Error('Native site births need their actual aggregate');assertNativeCombatOwnerEntry(combat,entry);
  const sites=combat.input.assembly.input.sites,host=Object.create(sites.host) as native.NativeSceneSiteHost;
  const methods=(provider:object,keys:readonly (keyof native.NativeSceneSiteHost)[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){const fn=Reflect.get(provider,key);return(...args:unknown[])=>Reflect.apply(fn,provider,args);}});};
  methods(physical,['createMonster']);methods(sites.input.geometry,['findFreeSpot']);methods(sites.input.settlement,['mercSheetFor','dealTemplateOffers']);
  Object.defineProperties(host,{
   zoneMatchesSiteFilter:{enumerable:true,value:(...args:Parameters<native.NativeSceneSiteHost['zoneMatchesSiteFilter']>)=>native.siteZoneMatchesSiteFilter(host,...args)},
   spawnVocationSite:{enumerable:true,value:(...args:Parameters<native.NativeSceneSiteHost['spawnVocationSite']>)=>native.siteSpawnVocationSite(host,...args)},
   buildMercOffers:{enumerable:true,value:(...args:Parameters<native.NativeSceneSiteHost['buildMercOffers']>)=>native.siteBuildMercOffers(host,...args)},
  });
  this.host=Object.freeze(host);Object.defineProperty(this,'host',{writable:false,configurable:false});
 }
}
