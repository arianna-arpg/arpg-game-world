import type {NativeSceneCensus,NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaSceneSettlement} from './nativeAreaSceneSettlement';
import * as native from '../engine/nativeSceneSites';
export interface NativeSceneSiteInput {
 scene:NativeSceneCensus;geometry:NativeAreaSceneGeometry;population:NativeAreaScenePopulation;settlement:NativeAreaSceneSettlement;
 campaign:Pick<native.NativeSceneSiteHost,'sim'|'manifest'|'account'>;
 state:Pick<native.NativeSceneSiteHost,'vocationSites'>;
}
/** Binds the native optional site births to the same physical scene and stock
 * owner. Actual source gates decide absence; no site/offer registry is filtered. */
export class NativeAreaSceneSites {
 readonly input:NativeSceneSiteInput;readonly host:native.NativeSceneSiteHost;
 constructor(raw:NativeSceneSiteInput){
  const roots=Object.create(null);
  for(const key of ['scene','geometry','population','settlement','campaign','state']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native sites need own object binding: '+key);
   roots[key]=d.value;
  }
  const input:NativeSceneSiteInput=this.input=Object.freeze(roots);
  if(input.geometry.state!==input.scene||input.population.input.scene!==input.scene||input.population.input.geometry!==input.geometry
   ||input.settlement.input.scene!==input.scene||input.settlement.input.geometry!==input.geometry)throw Error('Native sites need identical scene, geometry, population and settlement');
  const host={} as native.NativeSceneSiteHost,self=this;
  function fields(provider:()=>object,keys:readonly string[],write=false){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,
   get(){return(provider() as Record<string,unknown>)[key];},...(write?{set(v:unknown){(provider() as Record<string,unknown>)[key]=v;}}:{})});}
  function methods(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){
   const p=provider() as Record<string,Function>,fn=p[key];return(...args:unknown[])=>fn.apply(p,args);
  }});}
  fields(()=>input.scene,['zone','actors','player']);fields(()=>input.geometry,['arena','doodads']);
  fields(()=>input.campaign,['sim','manifest','account']);fields(()=>input.state,['vocationSites']);
  fields(()=>input.settlement.host,['mercOutpost'],true);
  methods(()=>input.geometry,['findFreeSpot']);methods(()=>input.population,['createMonster']);
  methods(()=>input.settlement,['mercSheetFor','dealTemplateOffers']);methods(()=>self,['zoneMatchesSiteFilter','spawnVocationSite','buildMercOffers']);
  this.host=Object.freeze(host);
  for(const key of ['input','host'])Object.defineProperty(this,key,{enumerable:false,writable:false,configurable:false});
 }
 zoneMatchesSiteFilter(...args:Parameters<native.NativeSceneSiteHost['zoneMatchesSiteFilter']>){return native.siteZoneMatchesSiteFilter(this.host,...args);}
 placeVocationSites(...args:Parameters<typeof native.sitePlaceVocationSites> extends [unknown,...infer A]?A:never){return native.sitePlaceVocationSites(this.host,...args);}
 spawnVocationSite(...args:Parameters<native.NativeSceneSiteHost['spawnVocationSite']>){return native.siteSpawnVocationSite(this.host,...args);}
 placeMercOutpost(...args:Parameters<typeof native.sitePlaceMercOutpost> extends [unknown,...infer A]?A:never){return native.sitePlaceMercOutpost(this.host,...args);}
 buildMercOffers(...args:Parameters<native.NativeSceneSiteHost['buildMercOffers']>){return native.siteBuildMercOffers(this.host,...args);}
}
