import assert from 'node:assert/strict';
import { MassWalk, MASS_NAVIGATION } from '../src/worldmass/walk';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { MassState } from '../src/worldmass/state';
import { MassStream } from '../src/worldmass/stream';
import { address, moveAddress, localOffset } from '../src/worldmass/address';
import type { MassSpec } from '../src/worldmass/contracts';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { resolveNativeFeature } from '../src/worldmass/nativeFeatures';
import { MassNativeResidency, type NativeFeaturePlacement } from '../src/worldmass/nativeResidency';
import { regionKind } from '../src/world/regions';

const spec:MassSpec={id:'native-walk-cache',version:1,addressSpan:960,terrainCell:24,fields:[],
 surfaces:[{id:'base',priority:0,when:[],region:'ground',color:'#445522',biome:'field'}],places:[]};
const origin=address('surface','-4294967296','4294967297',0,0,960);
const make=(terrain:MassSpec=spec)=>{
 const generator=new MassGenerator(makeMassRun(713,'native-walk-cache',terrain),terrain),state=new MassState(generator.run,terrain.terrainCell);
 const stream=new MassStream(generator,state,{maxPages:2,maxSamples:128});
 return{generator,state,stream,walk:new MassWalk(stream,origin,{...MASS_NAVIGATION,regionCacheEntries:32})};
};
{
 const {walk,stream,state}=make();let calls=0,revision=0,open=false;
 walk.native={cellSize:30,get revision(){return revision;},regionAt(at){calls++;const p=localOffset(at,origin,960);return p.x>=-30&&p.x<30?(open?'ground':'crag'):undefined;}};
 assert.equal(walk.cellSize,6);
 for(let n=0;n<2000;n++)assert.equal(walk.regionAt(28+n%2,5),'crag');
 assert.equal(calls,1,'repeated hot native cell resolves physical source exactly once');
 assert.equal(walk.regionAt(31,5),'ground','native edge inside a geographic24 cell remains exact');
 assert.equal(walk.regionAt(-.1,5),'crag');assert.equal(walk.regionAt(-30.1,5),'ground','negative boundary is not rounded toward zero');
 walk.overlay={grid:{cellSize:20,version:0,regionAt:()=> 'drystone'} as unknown as NonNullable<MassWalk['overlay']>['grid'],contains:x=>x>10000};
 assert.equal(walk.cellSize,2,'all present native/settlement/base grids participate in the common lattice');
 assert.equal(walk.regionAt(29.99,5),'crag');assert.equal(walk.regionAt(30.01,5),'ground','20-unit settlement cannot erase30-unit native edges outside it');
 walk.overlay=undefined;
 const before=walk.version;open=true;revision++;
 assert.equal(walk.regionAt(29,5),'ground','standalone native grid revision invalidates before the next query');assert.ok(walk.version>before,'path caches see standalone native edits too');
 state.paint({address:moveAddress(origin,{x:48,y:0},960),region:'wall',color:'#123456',cause:'probe'});
 assert.equal(walk.regionAt(49,5),'wall','transparent native support preserves immediately edited base');
 const save=state.snapshot();state.paint({address:moveAddress(origin,{x:48,y:0},960),region:'ground',color:'#445522',cause:'probe'});
 assert.equal(walk.regionAt(49,5),'ground');state.restore(save);assert.equal(walk.regionAt(49,5),'wall');
 walk.native={cellSize:30,revision,regionAt:()=> 'sandstone'};assert.equal(walk.regionAt(29,5),'sandstone','replacing native provider at equal revision cannot retain old geography');
 walk.native=undefined;assert.equal(walk.regionAt(29,5),'ground');assert.equal(walk.cellSize,24);
 assert.equal(stream.stats.resident,0,'cache never requires streamed pages');
 console.log('PASS bounded hot native queries, exact mixed24/30 and negative edges, native/base revisions, restore and equal-revision provider replacement');
}
const restore=seedGlobalRandom(713);
try{
 makeSimWorld('warrior',713);
 const {walk,stream}=make({...spec,terrainCell:30});
 const p:NativeFeaturePlacement={id:'cold-native-walk',origin,request:{id:'cold-native-walk',seed:42,source:{kind:'structure',id:'marble_monastery',tileset:'downs'}}};
 const descriptor=resolveNativeFeature(p.request),caps=new Set(descriptor.requirements),cfg={run:'native-walk-cache',addressSpan:960,maxBlueprints:4,maxResidents:1,maxCandidates:2};
 let providerCalls=0;
 let features=new MassNativeResidency(cfg,()=>{providerCalls++;return[p];},caps,()=>origin);
 const bind=()=>{
  const owner=features;
  walk.native={cellSize:30,get revision(){return owner.version;},regionAt:at=>owner.regionAt(at)};
  stream.overlay={get revision(){return owner.version;},revisionAt:cell=>owner.revisionAt(cell),sample:(at,base)=>owner.sample(at,base)};
 };
 bind();let solid:{x:number;y:number}|undefined;
 for(let y=15;y<1800&&!solid;y+=30)for(let x=15;x<1800&&!solid;x+=30)if(regionKind(features.regionAt(moveAddress(origin,{x,y},960)))?.blocks)solid={x,y};
 assert.ok(solid);const before=providerCalls;
 for(let i=0;i<1000;i++)assert.equal(regionKind(walk.regionAt(solid.x,solid.y))!.blocks,true);
 assert.equal(providerCalls-before,1);assert.equal(features.stats.resident,0,'real native blockers exist before any scene admission');
 const grid=features.gridAt(solid)!.grid;
 grid.fillRegion(solid.x,solid.y,solid.x,solid.y,'ground');
 assert.equal(walk.regionAt(solid.x,solid.y),'ground','real sparse native edits invalidate cached blockers synchronously');
 const saved=features.snapshot(1);features=new MassNativeResidency(cfg,()=>[p],caps,()=>origin,JSON.parse(JSON.stringify(saved)));bind();
 assert.equal(walk.regionAt(solid.x,solid.y),'ground','cold Continue retains the same native terrain mutation');
 const reference=walk.regionAt(15,15);
 for(let i=0;i<100;i++)walk.regionAt(1905+i*30,15);
 assert.equal(walk.regionAt(15,15),reference,'bounded eviction and query order preserve transparent/native truth');
 assert.ok((walk as unknown as {regions:Map<string,string>}).regions.size<=32);
 console.log('PASS actual cold native structure, no scene admission, native grid mutation, Continue and bounded cache eviction');
}finally{restore();}
