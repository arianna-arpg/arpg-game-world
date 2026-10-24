/** Native graph preparation on the campaign's actual zones, allocator and registered events. */
import {withRouteGuard,footprintBars} from '../engine/worldgen';
import type {World} from '../engine/world';
import type {NativeAreaSceneCoast,NativeCoastCampaign} from './nativeAreaSceneCoast';
import * as native from '../engine/nativeSceneGraph';
export interface NativeGraphCampaign extends NativeCoastCampaign {mintVeil:World['mintVeil']}
export interface NativeSceneGraphInput {coast:NativeAreaSceneCoast;campaign:NativeGraphCampaign}
export class NativeAreaSceneGraph {
 readonly input:NativeSceneGraphInput;readonly host:native.NativeSceneGraphHost;
 constructor(raw:NativeSceneGraphInput){
  const roots=Object.create(null);
  for(const key of ['coast','campaign']){const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native graph needs own object binding: '+key);roots[key]=d.value;}
  const input:NativeSceneGraphInput=this.input=Object.freeze(roots),coast=input.coast,campaign=input.campaign;
  if(coast.input.campaign!==campaign)throw Error('Native graph needs identical coast campaign');
  for(const key of ['zoneMap','sim','manifest','visited','nextGenId','mintVeil'])if(!Object.hasOwn(campaign,key))throw Error('Native graph needs explicit carried field: '+key);
  const host={} as native.NativeSceneGraphHost;
  const fields=(get:()=>object,keys:readonly string[],write=false)=>{for(const k of keys)Object.defineProperty(host,k,{enumerable:true,get(){return(get() as Record<string,unknown>)[k];},...(write?{set(v:unknown){(get() as Record<string,unknown>)[k]=v;}}:{})});};
  const methods=(get:()=>object,keys:readonly string[])=>{for(const k of keys)Object.defineProperty(host,k,{enumerable:true,get(){const owner=get() as Record<string,Function>,fn=owner[k];if(typeof fn!=='function')throw Error('Missing native graph capability: '+k);return(...args:unknown[])=>fn.apply(owner,args);}});};
  fields(()=>campaign,['zoneMap','sim','manifest','visited']);fields(()=>campaign,['nextGenId','mintVeil'],true);
  fields(()=>coast,['biomeFor','continentFor','biomeDepthFor','levelFor','climateFor']);
  methods(()=>coast,['ensureSeaPorts','roadIsWet','linkBackTo','dimensionBiomeFor','simView','liveCourses']);
  methods(()=>this,["rollHoldfast","eagerChartNeighbors","chartNeighborsOf","chartWithin","chartFrontier","fieldFrontierTarget","nearestLinkable","mintGroundTaken","roadlessGateHub","mintHoldfastPocket","mintSoulriverZone","nearestRiverPort","fieldifyZone","underSpanPass","rollPocketForm","applyPocketSpec","pullToLand","mintSpanPartner","severFootprintCrossers","soulriverPorts","dimensionBiomeDepthFor","courseMintFor"]);
  this.host=Object.freeze(host);for(const k of ['input','host'])Object.defineProperty(this,k,{enumerable:false,writable:false,configurable:false});
 }
 /** All native source work in this scope must finish synchronously. No campaign policy escapes, even after partial publication. */
 withGenerationPolicies<T>(operation:()=>T):T {
  const {campaign,coast}=this.input;
  return campaign.sim.withGeographyPolicies(()=>withRouteGuard((a,b)=>!footprintBars(a,b,campaign.zoneMap)&&coast.landRoute(a,b),operation));
 }
 rollHoldfast(...args:Parameters<World['rollHoldfast']>){return this.withGenerationPolicies(()=>native.nativeGraphRollHoldfast(this.host,...args));}
 eagerChartNeighbors(...args:Parameters<World['eagerChartNeighbors']>){return this.withGenerationPolicies(()=>native.nativeGraphEagerChartNeighbors(this.host,...args));}
 chartNeighborsOf(...args:Parameters<World['chartNeighborsOf']>){return this.withGenerationPolicies(()=>native.nativeGraphChartNeighborsOf(this.host,...args));}
 chartWithin(...args:Parameters<World['chartWithin']>){return this.withGenerationPolicies(()=>native.nativeGraphChartWithin(this.host,...args));}
 chartFrontier(...args:Parameters<World['chartFrontier']>){return this.withGenerationPolicies(()=>native.nativeGraphChartFrontier(this.host,...args));}
 fieldFrontierTarget(...args:Parameters<World['fieldFrontierTarget']>){return this.withGenerationPolicies(()=>native.nativeGraphFieldFrontierTarget(this.host,...args));}
 nearestLinkable(...args:Parameters<World['nearestLinkable']>){return this.withGenerationPolicies(()=>native.nativeGraphNearestLinkable(this.host,...args));}
 mintGroundTaken(...args:Parameters<World['mintGroundTaken']>){return this.withGenerationPolicies(()=>native.nativeGraphMintGroundTaken(this.host,...args));}
 roadlessGateHub(...args:Parameters<World['roadlessGateHub']>){return this.withGenerationPolicies(()=>native.nativeGraphRoadlessGateHub(this.host,...args));}
 mintHoldfastPocket(...args:Parameters<World['mintHoldfastPocket']>){return this.withGenerationPolicies(()=>native.nativeGraphMintHoldfastPocket(this.host,...args));}
 mintSoulriverZone(...args:Parameters<World['mintSoulriverZone']>){return this.withGenerationPolicies(()=>native.nativeGraphMintSoulriverZone(this.host,...args));}
 nearestRiverPort(...args:Parameters<World['nearestRiverPort']>){return this.withGenerationPolicies(()=>native.nativeGraphNearestRiverPort(this.host,...args));}
 fieldifyZone(...args:Parameters<World['fieldifyZone']>){return this.withGenerationPolicies(()=>native.nativeGraphFieldifyZone(this.host,...args));}
 underSpanPass(...args:Parameters<World['underSpanPass']>){return this.withGenerationPolicies(()=>native.nativeGraphUnderSpanPass(this.host,...args));}
 rollPocketForm(...args:Parameters<World['rollPocketForm']>){return this.withGenerationPolicies(()=>native.nativeGraphRollPocketForm(this.host,...args));}
 applyPocketSpec(...args:Parameters<World['applyPocketSpec']>){return this.withGenerationPolicies(()=>native.nativeGraphApplyPocketSpec(this.host,...args));}
 pullToLand(...args:Parameters<World['pullToLand']>){return this.withGenerationPolicies(()=>native.nativeGraphPullToLand(this.host,...args));}
 mintSpanPartner(...args:Parameters<World['mintSpanPartner']>){return this.withGenerationPolicies(()=>native.nativeGraphMintSpanPartner(this.host,...args));}
 severFootprintCrossers(...args:Parameters<World['severFootprintCrossers']>){return this.withGenerationPolicies(()=>native.nativeGraphSeverFootprintCrossers(this.host,...args));}
 soulriverPorts(...args:Parameters<World['soulriverPorts']>){return this.withGenerationPolicies(()=>native.nativeGraphSoulriverPorts(this.host,...args));}
 dimensionBiomeDepthFor(...args:Parameters<World['dimensionBiomeDepthFor']>){return this.withGenerationPolicies(()=>native.nativeGraphDimensionBiomeDepthFor(this.host,...args));}
 courseMintFor(...args:Parameters<World['courseMintFor']>){return this.withGenerationPolicies(()=>native.nativeGraphCourseMintFor(this.host,...args));}
}
