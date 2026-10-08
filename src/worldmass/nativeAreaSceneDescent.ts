/** Birth-time cave keeper, its immutable-once shelf and entry lamp. */
import type {World} from '../engine/world';
import type {NativeSceneCensus,NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaSceneSettlement,NativeSettlementCampaign} from './nativeAreaSceneSettlement';
import * as native from '../engine/nativeSceneDescent';
export interface NativeSceneDescentCampaign extends NativeSettlementCampaign {
 ledger:World['ledger'];descentRun:World['descentRun'];descentStocks:World['descentStocks'];
}
export interface NativeSceneDescentState {inCave:World['inCave'];descentStock:World['descentStock'];descentSpawnTimer:World['descentSpawnTimer']}
export interface NativeSceneDescentInput {
 scene:NativeSceneCensus;geometry:NativeAreaSceneGeometry;population:NativeAreaScenePopulation;settlement:NativeAreaSceneSettlement;
 campaign:NativeSceneDescentCampaign;state:NativeSceneDescentState;services:Pick<World,'notice'|'text'>;
}
/** Campaign owns the live run and once-minted shelves across loads; geometry owns
 * the one current descentSite. No duplicate site, copied stock or per-area run. */
export class NativeAreaSceneDescent {
 readonly input:NativeSceneDescentInput;readonly host:native.NativeSceneDescentHost;
 constructor(raw:NativeSceneDescentInput){
  const roots=Object.create(null);
  for(const key of ['scene','geometry','population','settlement','campaign','state','services']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native descent needs own object binding: '+key);roots[key]=d.value;
  }
  const input:NativeSceneDescentInput=this.input=Object.freeze(roots);
  const same=(o:object,key:string,value:unknown)=>{const d=Object.getOwnPropertyDescriptor(o,key);if(!d||!Object.hasOwn(d,'value')||d.value!==value)throw Error('Native descent needs identical '+key+' owner');};
  same(input.geometry,'state',input.scene);
  for(const provider of [input.population,input.settlement]){const d=Object.getOwnPropertyDescriptor(provider,'input');if(!d||!Object.hasOwn(d,'value')||!d.value)throw Error('Native descent needs actual owner input');same(d.value,'scene',input.scene);same(d.value,'geometry',input.geometry);}
  same(input.settlement.input,'campaign',input.campaign);
  for(const key of ['inCave','descentStock','descentSpawnTimer']){const d=Object.getOwnPropertyDescriptor(input.state,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native descent needs explicit '+key+' state');}
  const host={} as native.NativeSceneDescentHost;
  const fields=(provider:()=>object,keys:readonly string[],write=false)=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){return(provider() as Record<string,unknown>)[key];},...(write?{set(value){(provider() as Record<string,unknown>)[key]=value;}}:{})});};
  const methods=(provider:()=>object,keys:readonly string[])=>{for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){const p=provider() as Record<string,Function>,f=p[key];return(...args:unknown[])=>f.apply(p,args);}});};
  fields(()=>input.scene,['zone','actors','player']);fields(()=>input.geometry,['doodads']);fields(()=>input.geometry,['descentSite'],true);
  fields(()=>input.campaign,['sim','manifest','account','ledger','descentRun','descentStocks']);fields(()=>input.state,['inCave']);fields(()=>input.state,['descentStock','descentSpawnTimer'],true);
  methods(()=>input.geometry,['clampPos','farPoint','clearTransitSpot']);methods(()=>input.population,['createMonster']);
  methods(()=>input.settlement,['vendorGemLevel','vendorGemsOpen','rollSupportDropGated','rollSkillGem']);methods(()=>input.services,['text','notice']);methods(()=>this,['mintDelverStock']);
  this.host=Object.freeze(host);for(const key of ['input','host'])Object.defineProperty(this,key,{enumerable:false,writable:false,configurable:false});
 }
 placeDescentDelver(...a:Parameters<World['placeDescentDelver']>){return native.descentPlaceDescentDelver(this.host,...a);}
 mintDelverStock(...a:Parameters<World['mintDelverStock']>){return native.descentMintDelverStock(this.host,...a);}
 enterDescentZone(){return native.descentEnterDescentZone(this.host);}
}
