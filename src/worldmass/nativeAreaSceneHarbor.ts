/** Mutable harbor/quay birth owner. Siege controllers, transactions and rewards remain external. */
import type {World} from '../engine/world';
import type {NativeSceneCensus,NativeAreaScenePopulation} from './nativeAreaScenePopulation';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaSceneSettlement} from './nativeAreaSceneSettlement';
import * as native from '../engine/nativeSceneHarbor';
export type NativeSceneHarborRun=Pick<native.NativeSceneHarborHost,'zoneMap'|'holdMissingWarned'|'vendorArmedBeat'|'chandlerStock'|'vendorRestockAt'>;
export type NativeSceneHarborState=Pick<native.NativeSceneHarborHost,'entryFrom'|'zoneHasVendorCounter'>;
export interface NativeSceneHarborInput {
 scene:NativeSceneCensus;geometry:NativeAreaSceneGeometry;population:NativeAreaScenePopulation;settlement:NativeAreaSceneSettlement;
 /** Shared with all visit owners: standing counter shelves and warning memory are not reset per area. */
 run:NativeSceneHarborRun;state:NativeSceneHarborState;
 services:Pick<native.NativeSceneHarborHost,'notice'|'text'>;
 config:{partyLand:typeof import('../engine/world').PARTY_LAND_CFG};
}
export class NativeAreaSceneHarbor {
 readonly input:NativeSceneHarborInput;readonly host:native.NativeSceneHarborHost;
 constructor(raw:NativeSceneHarborInput){
  const roots=Object.create(null);
  for(const k of ['scene','geometry','population','settlement','run','state','services','config']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,k);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native harbor needs own object binding: '+k);
   roots[k]=d.value;
  }
  const input:NativeSceneHarborInput=this.input=Object.freeze(roots);
  const same=(o:object,k:string,v:unknown)=>{const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value')||d.value!==v)throw Error('Native harbor needs identical '+k+' owner');};
  same(input.geometry,'state',input.scene);
  for(const owner of [input.population,input.settlement]){const d=Object.getOwnPropertyDescriptor(owner,'input');if(!d||!Object.hasOwn(d,'value')||!d.value)throw Error('Native harbor needs real owner input');same(d.value,'scene',input.scene);same(d.value,'geometry',input.geometry);}
  for(const [provider,keys]of [[input.state,['entryFrom','zoneHasVendorCounter']],[input.run,['zoneMap','holdMissingWarned','vendorArmedBeat','chandlerStock','vendorRestockAt']],[input.config,['partyLand']]] as const){
   for(const k of keys)if(!Object.hasOwn(provider,k))throw Error('Native harbor needs explicit carried field: '+k);
  }
  const host={} as native.NativeSceneHarborHost;
  const fields=(owner:()=>object,keys:readonly string[],write=false)=>{for(const k of keys)Object.defineProperty(host,k,{enumerable:true,get(){return(owner() as Record<string,unknown>)[k];},...(write?{set(v:unknown){(owner() as Record<string,unknown>)[k]=v;}}:{})});};
  const methods=(owner:()=>object,keys:readonly string[])=>{for(const k of keys)Object.defineProperty(host,k,{enumerable:true,get(){const p=owner() as Record<string,Function>,fn=p[k];if(typeof fn!=='function')throw Error('Missing native harbor capability: '+k);return(...args:unknown[])=>fn.apply(p,args);}});};
  fields(()=>input.scene,['zone','player','actors']);
  fields(()=>input.geometry,['structures','doodads','exits','evaporating','grounds','arena','tierViews'],true);
  fields(()=>input.run,['zoneMap','holdMissingWarned','vendorArmedBeat','chandlerStock','vendorRestockAt'],true);
  fields(()=>input.state,['entryFrom','zoneHasVendorCounter'],true);fields(()=>input.config,['partyLand']);
  fields(()=>input.settlement.host,['manifest','seats']);fields(()=>input.settlement.host,['mercOutpost'],true);
  methods(()=>input.geometry,['setDoorState','findFreeSpot','markDoodadsChanged','clampPos','nativeGridAt']);
  methods(()=>input.population,['createMonster']);methods(()=>input.population.input.sources.ambient,['weightedPick']);
  methods(()=>input.settlement,['restockOrdinal','armVendorStock','syncHoldIdx','restockSeconds','mercSheetFor','dealTemplateOffers']);
  methods(()=>input.services,['notice','text']);
  methods(()=>this,['holdStateFor','refreshHoldServices','resealDoor','landPartyAt','refreshHoldDress','holdDressSpotOk','armPortMercs']);
  this.host=Object.freeze(host);for(const k of ['input','host'])Object.defineProperty(this,k,{enumerable:false,writable:false,configurable:false});
 }
 holdStateFor(...a:Parameters<World['holdStateFor']>){return native.harborHoldStateFor(this.host,...a);}
 bootQuay(...a:Parameters<World['bootQuay']>){return native.harborBootQuay(this.host,...a);}
 bootHarborhold(...a:Parameters<World['bootHarborhold']>){return native.harborBootHarborhold(this.host,...a);}
 resealDoor(...a:Parameters<World['resealDoor']>){return native.harborResealDoor(this.host,...a);}
 refreshHoldDress(...a:Parameters<World['refreshHoldDress']>){return native.harborRefreshHoldDress(this.host,...a);}
 holdDressSpotOk(...a:Parameters<World['holdDressSpotOk']>){return native.harborHoldDressSpotOk(this.host,...a);}
 refreshHoldServices(...a:Parameters<World['refreshHoldServices']>){return native.harborRefreshHoldServices(this.host,...a);}
 armPortMercs(...a:Parameters<World['armPortMercs']>){return native.harborArmPortMercs(this.host,...a);}
 landPartyAt(...a:Parameters<World['landPartyAt']>){return native.harborLandPartyAt(this.host,...a);}
}
