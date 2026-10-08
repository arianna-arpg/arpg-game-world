/** Local coast birth over shared geometry, census and campaign graphs. Source installation and later sailing controllers remain explicit. */
import type {World} from '../engine/world';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeExitPreparationHost,NativeExitPreparationSources} from '../engine/nativeExitPreparation';
import {nativeProcessionDestination} from '../engine/nativeExitPreparation';
import {nativeSimView,type NativePopulationHost} from '../engine/nativePopulationResolution';
import * as native from '../engine/nativeSceneCoast';
export interface NativeCoastSources extends native.NativeSceneCoastSources {
 climateAt:typeof import('../world/climate').climateAt;
 continentAt:typeof import('../world/continents').continentAt;
 continentSeedFrom:typeof import('../world/continents').continentSeedFrom;
 ZONE_MEMORY_CFG:typeof import('../engine/zonecontents').ZONE_MEMORY_CFG;
 exitPreparation:NativeExitPreparationSources;
}
export interface NativeCoastCampaign {
 zoneMap:World['zoneMap'];caveMap:World['caveMap'];sim:World['sim'];manifest:World['manifest'];nextGenId:World['nextGenId'];
 surveyed:World['surveyed'];visited:World['visited'];crossDimWarned:World['crossDimWarned'];zoneMemory:World['zoneMemory'];time:number;
}
export interface NativeCoastState {voyage:World['voyage'];inCave:World['inCave'];entryFrom:World['entryFrom']}
export interface NativeSceneCoastInput {scene:NativeSceneCensus;geometry:NativeAreaSceneGeometry;campaign:NativeCoastCampaign;state:NativeCoastState;sources:NativeCoastSources}
export class NativeAreaSceneCoast {
 readonly input:NativeSceneCoastInput;readonly host:native.NativeSceneCoastHost;
 private readonly population:NativePopulationHost;private readonly exits:NativeExitPreparationHost;
 readonly biomeFor:World['biomeFor'];readonly levelFor:World['levelFor'];readonly biomeDepthFor:World['biomeDepthFor'];
 readonly climateFor:World['climateFor'];readonly continentFor:World['continentFor'];
 constructor(raw:NativeSceneCoastInput){
  const roots=Object.create(null);for(const key of ['scene','geometry','campaign','state','sources']){const d=raw&&Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native coast needs own object binding: '+key);roots[key]=d.value;}
  const input:NativeSceneCoastInput=this.input=Object.freeze(roots),owner=this,geometry=input.geometry,campaign=input.campaign,scene=input.scene,state=input.state,sources=input.sources;
  const gd=Object.getOwnPropertyDescriptor(geometry,'state');if(!gd||!Object.hasOwn(gd,'value')||gd.value!==scene)throw Error('Native coast needs identical local geometry/census');
  for(const [o,keys]of [[campaign,['zoneMap','caveMap','sim','manifest','nextGenId','surveyed','visited','crossDimWarned','zoneMemory','time']],[state,['voyage','inCave','entryFrom']]] as const)for(const k of keys)if(!Object.hasOwn(o,k))throw Error('Native coast needs explicit carried field: '+k);
  this.biomeFor=c=>campaign.sim.biomeField.sampleBiome(c);this.levelFor=c=>campaign.sim.levelField.sampleLevel(c);this.biomeDepthFor=c=>campaign.sim.biomeField.sampleDepth(c);
  this.climateFor=(c,dimension)=>(0,sources.climateAt)(c,campaign.sim.biomeField.fieldSeed,dimension??'surface');
  this.continentFor=c=>(0,sources.continentAt)(c,(0,sources.continentSeedFrom)(campaign.sim.biomeField.fieldSeed));
  this.population={get actors(){return scene.actors;},get player(){return scene.player;},get zone(){return scene.zone;},get zoneMap(){return campaign.zoneMap;},get time(){return campaign.time;},get sim(){return campaign.sim;},get visited(){return campaign.visited;},get surveyed(){return campaign.surveyed;},continentFor:c=>owner.continentFor(c),simView:()=>owner.simView()};
  this.exits={get zone(){return scene.zone;},get arena(){return geometry.arena;},get exits(){return geometry.exits;},get zoneMap(){return campaign.zoneMap;},get caveMap(){return campaign.caveMap;},get sim(){return campaign.sim;},get entryFrom(){return state.entryFrom;},get zoneMemory(){return campaign.zoneMemory;},get biomeFor(){return owner.biomeFor;},dimensionBiomeFor:d=>owner.dimensionBiomeFor(d),zoneMemoryFresh:id=>owner.zoneMemoryFresh(id),fieldExitPos:e=>owner.fieldExitPos(e),pickProcessionDest:z=>nativeProcessionDestination(owner.exits,z)};
  const host={} as native.NativeSceneCoastHost;
  const fields=(get:()=>object,keys:readonly string[],write=false)=>{for(const k of keys)Object.defineProperty(host,k,{enumerable:true,get(){return(get() as Record<string,unknown>)[k];},...(write?{set(v:unknown){(get() as Record<string,unknown>)[k]=v;}}:{})});};
  const methods=(get:()=>object,keys:readonly string[])=>{for(const k of keys)Object.defineProperty(host,k,{enumerable:true,get(){const o=get() as Record<string,Function>,fn=o[k];if(typeof fn!=='function')throw Error('Missing native coast capability: '+k);return(...args:unknown[])=>fn.apply(o,args);}});};
  fields(()=>scene,['zone','player']);fields(()=>geometry,['doodads'],true);fields(()=>geometry,['exits']);
  fields(()=>campaign,['sim','zoneMap','caveMap','surveyed','visited','manifest','crossDimWarned']);fields(()=>campaign,['nextGenId'],true);fields(()=>state,['voyage','inCave']);
  fields(()=>this,['biomeFor','levelFor','biomeDepthFor','climateFor','continentFor']);
  methods(()=>this,['nodeFromSea','seaFromNode','mintIslandZone','ensureSeaPorts','refreshExitLabels','eventLevel','simView','notarizeRoad','placeExit','linkBackTo','roadIsWet','landRoute','nativeExitPreparationHost','nativeExitPreparationSources','boundaryGateFor','meldFor','isIllegalCrossDim','warnCrossDim','liveCourses','courseAnchor']);
  this.host=Object.freeze(host);for(const k of ['input','host','population','exits','biomeFor','levelFor','biomeDepthFor','climateFor','continentFor'])Object.defineProperty(this,k,{enumerable:false,writable:false,configurable:false});
 }
 simView(){return nativeSimView(this.population);}
 nativeExitPreparationHost(){return this.exits;}
 nativeExitPreparationSources(){return this.input.sources.exitPreparation;}
 /** Exact nativeZoneMemoryFresh leaf read; shared source ttl remains explicit. */
 zoneMemoryFresh(zoneId:string){const m=this.input.campaign.zoneMemory.get(zoneId);return !!m&&this.input.campaign.time-m.savedAt<this.input.sources.ZONE_MEMORY_CFG.ttl;}
 seaFromNode(...args:Parameters<World['seaFromNode']>){return native.coastSeaFromNode(this.host,this.input.sources,...args);}
 nodeFromSea(...args:Parameters<World['nodeFromSea']>){return native.coastNodeFromSea(this.host,this.input.sources,...args);}
 streamCoast(...args:Parameters<World['streamCoast']>){return native.coastStreamCoast(this.host,this.input.sources,...args);}
 mintIslandZone(...args:Parameters<World['mintIslandZone']>){return native.coastMintIslandZone(this.host,this.input.sources,...args);}
 ensureSeaPorts(...args:Parameters<World['ensureSeaPorts']>){return native.coastEnsureSeaPorts(this.host,this.input.sources,...args);}
 refreshExitLabels(...args:Parameters<World['refreshExitLabels']>){return native.coastRefreshExitLabels(this.host,this.input.sources,...args);}
 eventLevel(...args:Parameters<World['eventLevel']>){return native.coastEventLevel(this.host,this.input.sources,...args);}
 notarizeRoad(...args:Parameters<World['notarizeRoad']>){return native.coastNotarizeRoad(this.host,this.input.sources,...args);}
 linkBackTo(...args:Parameters<World['linkBackTo']>){return native.coastLinkBackTo(this.host,this.input.sources,...args);}
 roadIsWet(...args:Parameters<World['roadIsWet']>){return native.coastRoadIsWet(this.host,this.input.sources,...args);}
 landRoute(...args:Parameters<World['landRoute']>){return native.coastLandRoute(this.host,this.input.sources,...args);}
 placeExit(...args:Parameters<World['placeExit']>){return native.coastPlaceExit(this.host,this.input.sources,...args);}
 isIllegalCrossDim(...args:Parameters<World['isIllegalCrossDim']>){return native.coastIsIllegalCrossDim(this.host,this.input.sources,...args);}
 warnCrossDim(...args:Parameters<World['warnCrossDim']>){return native.coastWarnCrossDim(this.host,this.input.sources,...args);}
 dimensionBiomeFor(...args:Parameters<World['dimensionBiomeFor']>){return native.coastDimensionBiomeFor(this.host,this.input.sources,...args);}
 liveCourses(...args:Parameters<World['liveCourses']>){return native.coastLiveCourses(this.host,this.input.sources,...args);}
 courseAnchor(...args:Parameters<World['courseAnchor']>){return native.coastCourseAnchor(this.host,this.input.sources,...args);}
 fieldExitPos(...args:Parameters<World['fieldExitPos']>){return native.coastFieldExitPos(this.host,this.input.sources,...args);}
 boundaryGateFor(...args:Parameters<World['boundaryGateFor']>){return native.coastBoundaryGateFor(this.host,this.input.sources,...args);}
 meldFor(...args:Parameters<World['meldFor']>){return native.coastMeldFor(this.host,this.input.sources,...args);}
}
