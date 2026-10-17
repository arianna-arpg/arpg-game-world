/** Real pre-layout boundaries from one local graph/coast/geometry binding. Does not publish a source. */
import type {ZoneDef} from '../data/zones';
import type {NativeAreaSceneGraph} from './nativeAreaSceneGraph';
import {prepareNativeAreaBoundaries,type NativeAreaBoundaryHost} from '../engine/nativeAreaBoundaries';
import {nativeExitRoadAnnotations,separateNativeExits} from '../engine/nativeExitPreparation';
export class NativeAreaSceneBoundaries {
 readonly graph:NativeAreaSceneGraph;readonly host:NativeAreaBoundaryHost;
 constructor(graph:NativeAreaSceneGraph){
  const {coast,campaign}=graph.input,{scene,geometry}=coast.input;
  if(geometry.state!==scene||coast.input.campaign!==campaign)throw Error('Native boundaries need identical graph/coast/geometry/census');
  const host:NativeAreaBoundaryHost={
   get zoneMap(){return campaign.zoneMap;},get visited(){return campaign.visited;},get sim(){return campaign.sim;},
   get exits(){return geometry.exits;},set exits(value){geometry.exits=value;},
   get rollHoldfast(){const fn=graph.rollHoldfast;return(...args:Parameters<typeof fn>)=>fn.apply(graph,args);},
   get eagerChartNeighbors(){const fn=graph.eagerChartNeighbors;return(...args:Parameters<typeof fn>)=>fn.apply(graph,args);},
   get chartWithin(){const fn=graph.chartWithin;return(...args:Parameters<typeof fn>)=>fn.apply(graph,args);},
   get landRoute(){const fn=coast.landRoute;return(...args:Parameters<typeof fn>)=>fn.apply(coast,args);},
   get placeExit(){const fn=coast.placeExit;return(...args:Parameters<typeof fn>)=>fn.apply(coast,args);},
   exitRoadAnnotations:def=>nativeExitRoadAnnotations(coast.nativeExitPreparationHost(),def,coast.nativeExitPreparationSources()),
   separateOverlappingExits:()=>separateNativeExits(coast.nativeExitPreparationHost(),coast.nativeExitPreparationSources()),
  };
  this.graph=graph;this.host=Object.freeze(host);
  for(const key of ['graph','host'])Object.defineProperty(this,key,{enumerable:false,writable:false,configurable:false});
 }
 /** Caller retains loadZone's first-visit/visit-mark ordering. Cave and source identity are carried, never guessed. */
 prepare(def:ZoneDef,firstVisit:boolean,isCave:boolean):void {
  const {coast,campaign}=this.graph.input,{scene,state}=coast.input;
  if(scene.zone!==def||(campaign.zoneMap[def.id]!==def&&campaign.caveMap[def.id]!==def))throw Error('Native boundaries need the campaign-owned local zone');
  if(state.inCave!==isCave)throw Error('Native boundaries need the carried cave transition');
  this.graph.withGenerationPolicies(()=>prepareNativeAreaBoundaries(this.host,def,firstVisit,isCave));
 }
}
