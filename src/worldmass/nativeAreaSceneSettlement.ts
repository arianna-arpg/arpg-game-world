/** Bounded stock, recruiter and town seating owner. No purchases, director,
 * theater, live restock dispatcher or whole-settlement admission is supplied. */
import type { World } from '../engine/world';
import type { NativeSceneCensus } from './nativeAreaScenePopulation';
import * as native from '../engine/nativeSettlementServices';
export type NativeSettlementCampaign=Pick<native.NativeSettlementHost,
 'manifest'|'time'|'account'|'vendorHolds'|'mercSheets'|'charDirty'|'seats'|'sim'>;
export type NativeSettlementState=Pick<native.NativeSettlementHost,'townTierIdx'|'mercOutpost'>;
export interface NativeSettlementInput {
 scene:Pick<NativeSceneCensus,'zone'|'player'>;
 geometry:{readonly state:Pick<NativeSceneCensus,'zone'|'player'>;readonly arena:World['arena']};
 campaign:NativeSettlementCampaign;
 /** Resolved adopted town tier, not a fresh account projection mid-visit. */
 state:NativeSettlementState;
}
/** Caller retains campaign holds/sheets and native item allocation namespace.
 * Source registries are the installed native sources, never a rerolled subset.
 * This owner does not install a dialogue director: appearanceFor and leaveZone
 * must share one real director/session across resident births; leaveZone retains
 * visit counters. It also does not own retained ActiveTheaterRun callbacks. */
export class NativeAreaSceneSettlement {
 readonly input:NativeSettlementInput;
 readonly host:native.NativeSettlementHost;
 constructor(raw:NativeSettlementInput) {
  const bindings=Object.create(null);
  for(const key of ['scene','geometry','campaign','state']) {
   const descriptor=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.value||typeof descriptor.value!=='object')
    throw Error('Native settlement needs own object binding: '+key);
   bindings[key]=descriptor.value;
  }
  const input:NativeSettlementInput=this.input=Object.freeze(bindings);
  if(input.geometry.state!==input.scene)throw Error('Native settlement geometry/census identity differs');
  const host={} as native.NativeSettlementHost,self=this;
  function fields(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,
   get(){return (provider() as Record<string,unknown>)[key];},set(value){(provider() as Record<string,unknown>)[key]=value;}});}
  function methods(keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){
   const owner=self as unknown as Record<string,Function>,fn=owner[key];return (...args:unknown[])=>fn.apply(owner,args);
  }});}
  fields(()=>input.scene,['zone','player']);fields(()=>input.geometry,['arena']);
  fields(()=>input.state,['townTierIdx','mercOutpost']);
  fields(()=>input.campaign,['manifest','time','account','vendorHolds','mercSheets','charDirty','seats','sim']);
  methods(["resolveCommission","restockOrdinal","overlayHold","buildVendorStock","vendorEntryAllowed","curateVendorStock","restockSeconds","commissionOdds","mintCommissionEntry","vendorMemoryCeiling","vendorGemLevel","vendorStockPolicy","vendorGemsOpen","vendorSize","rollSupportDropGated","rollSkillGem","waresBonus","vendorQualityPieces","carriedGemIds","skillDropPool","gemWeights","supportDropPool","pickGem","mercSheetFor","dealTemplateOffers"]);
  this.host=Object.freeze(host);
  Object.defineProperty(this,'host',{writable:false,configurable:false});
  Object.defineProperty(this,'input',{writable:false,configurable:false});
 }
 armVendorStock:World['armVendorStock']=(...args)=>native.settlementArmVendorStock(this.host,...args);
 restockOrdinal:World['restockOrdinal']=(...args)=>native.settlementRestockOrdinal(this.host,...args);
 restockSeconds:World['restockSeconds']=(...args)=>native.settlementRestockSeconds(this.host,...args);
 syncHoldIdx:World['syncHoldIdx']=(...args)=>native.settlementSyncHoldIdx(this.host,...args);
 resolveCommission:World['resolveCommission']=(...args)=>native.settlementResolveCommission(this.host,...args);
 overlayHold:World['overlayHold']=(...args)=>native.settlementOverlayHold(this.host,...args);
 buildVendorStock:World['buildVendorStock']=(...args)=>native.settlementBuildVendorStock(this.host,...args);
 vendorEntryAllowed:World['vendorEntryAllowed']=(...args)=>native.settlementVendorEntryAllowed(this.host,...args);
 curateVendorStock:World['curateVendorStock']=(...args)=>native.settlementCurateVendorStock(this.host,...args);
 commissionOdds:World['commissionOdds']=(...args)=>native.settlementCommissionOdds(this.host,...args);
 mintCommissionEntry:World['mintCommissionEntry']=(...args)=>native.settlementMintCommissionEntry(this.host,...args);
 vendorMemoryCeiling:World['vendorMemoryCeiling']=(...args)=>native.settlementVendorMemoryCeiling(this.host,...args);
 vendorGemLevel:World['vendorGemLevel']=(...args)=>native.settlementVendorGemLevel(this.host,...args);
 vendorStockPolicy:World['vendorStockPolicy']=(...args)=>native.settlementVendorStockPolicy(this.host,...args);
 vendorGemsOpen:World['vendorGemsOpen']=(...args)=>native.settlementVendorGemsOpen(this.host,...args);
 vendorSize:World['vendorSize']=(...args)=>native.settlementVendorSize(this.host,...args);
 rollSupportDropGated:World['rollSupportDropGated']=(...args)=>native.settlementRollSupportDropGated(this.host,...args);
 rollSkillGem:World['rollSkillGem']=(...args)=>native.settlementRollSkillGem(this.host,...args);
 waresBonus:World['waresBonus']=(...args)=>native.settlementWaresBonus(this.host,...args);
 vendorQualityPieces:World['vendorQualityPieces']=(...args)=>native.settlementVendorQualityPieces(this.host,...args);
 carriedGemIds:World['carriedGemIds']=(...args)=>native.settlementCarriedGemIds(this.host,...args);
 skillDropPool:World['skillDropPool']=(...args)=>native.settlementSkillDropPool(this.host,...args);
 gemWeights:World['gemWeights']=(...args)=>native.settlementGemWeights(this.host,...args);
 supportDropPool:World['supportDropPool']=(...args)=>native.settlementSupportDropPool(this.host,...args);
 pickGem:World['pickGem']=(...args)=>native.settlementPickGem(this.host,...args);
 armLastlightRecruiter:World['armLastlightRecruiter']=(...args)=>native.settlementArmLastlightRecruiter(this.host,...args);
 townSeat:World['townSeat']=(...args)=>native.settlementTownSeat(this.host,...args);
 mercSheetFor:World['mercSheetFor']=(...args)=>native.settlementMercSheetFor(this.host,...args);
 dealTemplateOffers:World['dealTemplateOffers']=(...args)=>native.settlementDealTemplateOffers(this.host,...args);
}
