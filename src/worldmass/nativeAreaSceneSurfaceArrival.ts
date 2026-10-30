/** Arrival-only services keep their completed native writes on retained ground. */
import type {World} from '../engine/world';
import * as sites from '../engine/nativeSceneSites';
import * as ascent from '../engine/nativeSceneRuntimeBirth';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
export class NativeAreaSceneSurfaceArrival {
 readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #select:NativeAreaSceneTransitionCoordinator['delayedArrivalBody'];
 readonly host:sites.NativeSceneSiteHost;
 readonly #ascentHost:ascent.NativeSceneRuntimeBirthHost;
 #merc:sites.NativeMercPlacement|undefined;#ascent:ascent.NativeAscentPlacement|undefined;#vent:ascent.NativeGeyserVent|undefined;
 #mercInstalled=false;#ascentInstalled=false;#busy=false;
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry){
  if(!isNativeAreaSceneCombat(combat))throw Error('Native surface arrivals need their actual aggregate');assertNativeCombatOwnerEntry(combat,entry);this.#combat=combat;this.#entry=entry;this.#select=NativeAreaSceneTransitionCoordinator.prototype.delayedArrivalBody;
  const live=combat.siteBirths.host,merc=Object.create(live) as sites.NativeSceneSiteHost;
  for(const key of ['zone','actors','player','arena','doodads','sim','manifest','account','vocationSites','mercOutpost'] as const)Object.defineProperty(merc,key,{enumerable:true,get:()=>{const value=Reflect.get(live,key);this.#definition('merc');return value;},...(key==='mercOutpost'?{set:(value:unknown)=>{this.#definition('merc');if(!Reflect.set(live,key,value))throw Error('Native merc stock write refused');}}:{})});
  for(const key of ['createMonster','findFreeSpot','mercSheetFor','dealTemplateOffers'] as const)Object.defineProperty(merc,key,{enumerable:true,get:()=>{const fn=Reflect.get(live,key);return(...args:unknown[])=>{this.#definition('merc');const value=Reflect.apply(fn,live,args);this.#definition('merc');return value;};}});
  Object.defineProperties(merc,{zoneMatchesSiteFilter:{enumerable:true,value:(...args:Parameters<sites.NativeSceneSiteHost['zoneMatchesSiteFilter']>)=>{this.#definition('merc');return sites.siteZoneMatchesSiteFilter(merc,...args);}},buildMercOffers:{enumerable:true,value:(...args:Parameters<sites.NativeSceneSiteHost['buildMercOffers']>)=>{this.#definition('merc');return sites.siteBuildMercOffers(merc,...args);}}});
  this.host=Object.freeze(merc);Object.defineProperty(this,'host',{writable:false,configurable:false});
  const owner=combat.input.assembly.input.registry.input.birth,host=Object.create(owner.host) as ascent.NativeSceneRuntimeBirthHost;
  const fields=(provider:object,keys:readonly (keyof ascent.NativeSceneRuntimeBirthHost)[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get:()=>{const value=Reflect.get(provider,key);this.#definition('ascent');return value;}});};
  fields(owner.input.scene,['player']);fields(owner.input.geometry,['arena','zoneEntry','doodads','grounds','caveEntrances']);fields(owner.input.campaign,['sim','ledger']);fields(owner.input.generation.input.state,['inCave']);
  const methods=(provider:object,keys:readonly (keyof ascent.NativeSceneRuntimeBirthHost)[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get:()=>{const fn=Reflect.get(provider,key);return(...args:unknown[])=>{this.#definition('ascent');const value=Reflect.apply(fn,provider,args);if(key!=='text')this.#definition('ascent');return value;};}});};
  // Completed text advances its native step; the following ledger read revalidates before discovery.
  methods(owner.input.geometry,['clampPos','clearTransitSpot']);methods(owner.input.campaign,['text']);
  Object.defineProperty(host,'ventGeyser',{enumerable:true,value:(at:Parameters<World['ventGeyser']>[0],seed:number)=>{this.#definition('ascent');this.#vent??=ascent.birthPrepareGeyserVent(host,owner.input.sources,at,seed);ascent.birthResumeGeyserVent(host,this.#vent);}});this.#ascentHost=Object.freeze(host);
 }
 #definition(kind:'merc'|'ascent'):World['zone']{const combat=this.#combat,definition=combat.scene.zone;Reflect.apply(this.#select,combat.input.coordinator,[combat,kind]);if(combat.scene.zone!==definition)throw Error('Native surface arrival definition changed');return definition;}
 arriveMerc():void {this.#entry(this,{permission:'physical'},()=>{const def=this.#definition('merc');if(this.#busy)throw Error('Native surface arrival cannot reenter');if(this.#mercInstalled)return;const host=this.host;if(!this.#merc&&host.mercOutpost){this.#mercInstalled=true;return;}if(this.#combat.input.assembly.input.registry.input.birth.input.generation.input.state.inCave)return;this.#busy=true;try{this.#merc??=sites.sitePrepareMercPlacement(host,def);if(!this.#merc)return;sites.siteResumeMercPlacement(host,this.#merc);this.#mercInstalled=true;}catch(error){if(this.#merc&&!sites.siteMercPlacementRetryable(host,this.#merc))this.#merc=undefined;throw error;}finally{this.#busy=false;}});}
 arriveAscent():void {this.#entry(this,{permission:'physical'},()=>{const def=this.#definition('ascent');if(this.#busy)throw Error('Native surface arrival cannot reenter');if(this.#ascentInstalled)return;const birth=this.#combat.input.assembly.input.registry.input.birth,host=this.#ascentHost;if(!this.#ascent&&host.caveEntrances.some(m=>m.kind==='sky_geyser')){this.#ascentInstalled=true;return;}this.#busy=true;try{this.#ascent??=ascent.birthPrepareAscentPlacement(host,birth.input.sources,def);if(!this.#ascent)return;ascent.birthResumeAscentPlacement(host,this.#ascent);this.#ascentInstalled=true;}finally{this.#busy=false;}});}
}
