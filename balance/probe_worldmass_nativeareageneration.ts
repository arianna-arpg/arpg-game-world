import assert from 'node:assert/strict';
import { Rng,withSeededRandom } from '../src/core/rng';
import { rand } from '../src/core/math';
import { PUZZLES,COURT_SHRINE_PRESET_PREFIX } from '../src/data/puzzles';
import { captureNativeAmbientResolvedInputs } from '../src/engine/nativeAmbient';
import { makeSimWorld } from '../src/sim/arena';
import { placeZoneAt } from '../src/engine/worldgen';
import { generateLayout,doodadRuleOf,type Doodad } from '../src/engine/levelgen';
import { captureNativeGeneration } from '../src/worldmass/nativeGeneration';
import { captureNativeAreaGeometry } from '../src/worldmass/nativeAreaGeometryCapture';
import { serializeNativeAreaData } from '../src/worldmass/nativeAreaGeometry';
import { captureNativeGeographySource } from '../src/world/captureGeography';
import { createNativeGeographyReader } from '../src/world/geographySource';
import { MassNativeGeography,makeMassNativeGeographySpec,type MassNativeMapping } from '../src/worldmass/nativeGeography';
import { compileNativeArea,compileNativeAreaGeneration,type NativeAreaCompileInput,type NativeAreaCompilerLease } from '../src/worldmass/nativeAreaCompiler';
import { NativeAreaRandom } from '../src/worldmass/nativeAreaRandom';
import { captureNativeAreaGeneration,serializeNativeAreaGeneration,restoreNativeAreaGeneration,type NativeAreaGenerationReceipt } from '../src/worldmass/nativeAreaGeneration';
import { assessNativeArea } from '../src/worldmass/nativeArea';
import type { MapCoord } from '../src/world/coords';
const clone=<T>(v:T):T=>structuredClone(v);
const equal=(a:unknown,b:unknown,message?:string)=>assert.equal(serializeNativeAreaData(a),serializeNativeAreaData(b),message??'native generation data differs');
const certificate={schema:1 as const,policy:'caller-attested-same-build-and-source-v1' as const,buildIdentity:'probe/current-native-compiler',installedSourceIdentity:'probe/actual-installed-native-sources'};
const lease:NativeAreaCompilerLease={certificate,readRevision:()=> 'probe-same-source',assertCurrent:()=>true};
// This is the actual rule-effect attach operation immediately after native
// generateLayout (8dcfa9e1 World.loadZone). It consumes the ambient stream;
// the layout Rng below remains distinct. No intervening birth stages skipped
// by this immediate-stage comparison, and no full load admission is claimed.
function nextNativeStage(doodads:Doodad[],rng:Rng){
 for(const d of doodads){if(d.effect)continue;const rEff=doodadRuleOf(d.kind).effect;if(rEff)d.effect={...rEff,cd:rand(0,rEff.interval)};}
 return {doodads,geometryNext:Array.from({length:8},()=>rng.next()),ambientNext:Array.from({length:8},()=>Math.random())};
}
const fixtures=[
  {label:'open-land',seed:713,target:{x:6765,y:160},mintSeed:2229205504,index:810064,face:'meadow',layout:'plains'},
  {label:'whole-woods',seed:991,target:{x:2165,y:160},mintSeed:1062175204,index:810143,face:'heartwood',layout:'forest'},
  {label:'whole-districts',seed:991,target:{x:-55,y:160},mintSeed:2468017101,index:810156,face:'forest',layout:'districts'},
  {label:'whole-dunes',seed:713,target:{x:-67.5,y:-8745},mintSeed:924637573,index:810108,face:'saltflat',layout:'dunefield'},
  {label:'isolated-downs',seed:991,target:{x:-35,y:1280},mintSeed:1015847609,index:810204,face:'downs',layout:'massif'},
  {label:'whole-tableland',seed:713,target:{x:785,y:160},mintSeed:2919711994,index:810014,face:'tableland',layout:'massif'},
  {label:'resolved-atlas',seed:713,target:{x:9747.5,y:-6145},mintSeed:2073016533,index:810112,face:'hallowfield',layout:'districts'},
].filter((_,i)=>[0,2,3].includes(i));

let pairs=0;let control:NativeAreaGenerationReceipt|undefined;
for(const f of fixtures){
  const world=withSeededRandom(f.seed,()=>makeSimWorld('warrior',f.seed));world.sim.bindGeographyPolicies();
  const source=captureNativeGeographySource(f.seed),reader=createNativeGeographyReader(source);
  let resolvedTarget:MapCoord|undefined;
  const zone=placeZoneAt(f.target,null,clone(world.zoneMap),f.index,{seed:f.mintSeed,level:10,fieldBiome:true,biomeFor:reader.biomeAt,biomeDepthFor:reader.biomeDepth,climateFor:(at,dim)=>{resolvedTarget={...at};return reader.climateAt(at,dim);}});
  assert.equal(zone.tileset,f.face);assert.equal(zone.layoutType??'plains',f.layout);assert.ok(resolvedTarget);
  const mapping:MassNativeMapping={schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:{dimension:'surface',cx:'0',cy:'0',x:0,y:0},nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'1',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-20000,minY:-20000,maxX:20000,maxY:20000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'};
  const geography=new MassNativeGeography(makeMassNativeGeographySpec(JSON.stringify(source),mapping));
  const request=geography.ownerContext('candidate/'+f.label,geography.physicalAnchor(f.target));
  // Explicit, source-selected native seeds are fixed probe fixtures, not a new
  // production area distribution. The actual resolver may replace seed/id/seat.
  const context=geography.resolveOwnerContext(request,{resolvedOwnerId:'area/'+zone.id,resolutionKey:'probe/actual-placeZoneAt/'+f.label,nativeId:zone.id,resolvedTarget:resolvedTarget!,resolvedSeed:zone.seed!});
  if(f.label==='resolved-atlas'){assert.notEqual(zone.id,'gen_'+f.index);assert.notDeepEqual(context.resolvedTarget,request.requestedTarget);assert.notEqual(zone.seed,f.mintSeed);}
  const exits=zone.exits.map(definition=>{const at=definition.at??.5;const point=definition.side==='n'?{x:zone.size.w*at,y:0}:definition.side==='s'?{x:zone.size.w*at,y:zone.size.h}:definition.side==='w'?{x:0,y:zone.size.h*at}:{x:zone.size.w,y:zone.size.h*at};return {definition:clone(definition),generationPoint:point,physicalPoint:{...point}};});
  const entry={x:zone.size.w/2,y:zone.size.h/2};
  const seams=zone.shape==='rect'&&exits.length?[{exitIndex:0,port:{owner:context.resolvedOwnerId,neighbor:'adjacent-substrate-proof-pending',side:exits[0].definition.side,point:{...exits[0].physicalPoint},approach:{...entry}}}]:[];
  const input:NativeAreaCompileInput={id:context.resolvedOwnerId,geography:clone(geography.spec),context:clone(context),mintedZone:zone,entry,exits,seams,boundary:{schema:1,policy:'explicit-native-boundary-context-v1',sourceIdentity:'probe/isolated-open-neighborhood-v1',exitBoundaries:undefined,exitRoads:undefined,exitMelds:undefined}};

 for(const ambientSeed of [0,991,0xffffffff]){
  const initial=new NativeAreaRandom(zone.seed!,ambientSeed).snapshot();
  const outer=Math.random,receipt=compileNativeAreaGeneration(input,lease,initial);assert.equal(Math.random,outer);
  if(f===fixtures[0]&&ambientSeed===0){
   for(const driftAt of [1,2]){let checks=0;const drifting={...lease,assertCurrent:()=>{if(++checks===driftAt)Math.random();return true;}};
    assert.throws(()=>compileNativeAreaGeneration(input,drifting,initial),/consumed/);assert.equal(Math.random,outer);}
  }
  if(f===fixtures[0]&&ambientSeed===0){
   const key=COURT_SHRINE_PRESET_PREFIX+zone.id,previous=Object.getOwnPropertyDescriptor(PUZZLES,key);
   try{Object.defineProperty(PUZZLES,key,{configurable:true,get(){Math.random();return undefined;}});
    assert.throws(()=>compileNativeAreaGeneration(input,lease,initial),/before layout/);assert.equal(Math.random,outer);}
   finally{delete PUZZLES[key];if(previous)Object.defineProperty(PUZZLES,key,previous);}
   let getterReads=0,borrowed=0;const accessorLease:any={certificate};
   Object.defineProperty(accessorLease,'readRevision',{enumerable:true,get(){getterReads++;return lease.readRevision;}});
   Object.defineProperty(accessorLease,'assertCurrent',{enumerable:true,get(){getterReads++;return lease.assertCurrent;}});
   const prior=Object.getOwnPropertyDescriptor(Object.prototype,'value');
   try{Object.defineProperty(Object.prototype,'value',{configurable:true,value:(...args:unknown[])=>{borrowed++;return args.length?true:'revision';}});
    assert.throws(()=>compileNativeAreaGeneration(input,accessorLease,initial));}
   finally{delete(Object.prototype as any).value;if(prior)Object.defineProperty(Object.prototype,'value',prior);}
   assert.equal(getterReads,0);assert.equal(borrowed,0);
   const accessorInput=clone(input);Object.defineProperty(accessorInput,'extraFixtures',{enumerable:true,get(){getterReads++;return [];}});
   const ambient={packs:{sourceIdentity:'source',table:[],countMul:1,inject:[]},wildlife:{sourceIdentity:'source',table:undefined,verminPressure:1}};
   Object.defineProperty(ambient.wildlife,'verminPressure',{enumerable:true,get(){getterReads++;return 1;}});
   try{Object.defineProperty(Object.prototype,'value',{configurable:true,value:[]});
    assert.throws(()=>compileNativeAreaGeneration(accessorInput,lease,initial));assert.throws(()=>captureNativeAmbientResolvedInputs(ambient));}
   finally{delete(Object.prototype as any).value;if(prior)Object.defineProperty(Object.prototype,'value',prior);}
   assert.equal(getterReads,0);assert.equal(Math.random,outer);
  }
  const legacy=withSeededRandom(ambientSeed,()=>compileNativeArea(input,lease));equal(receipt.area,legacy,'existing complete-area descriptor unchanged');
  const directStreams=NativeAreaRandom.fromState(initial),original={...clone(zone),exitBoundaries:undefined,exitRoads:undefined,exitMelds:undefined};
  const direct=directStreams.run(rng=>captureNativeGeneration(original,()=>generateLayout(original,receipt.area.geometry.bounds,rng,clone(entry),exits.map(e=>clone(e.generationPoint)),[])));
  equal(receipt.randomAfterGeneration,directStreams.snapshot(),'cursor is at actual layout boundary');
  equal(receipt.area.zone,original);equal(receipt.area.sidechannels,direct.sidechannels);
  equal(receipt.area.geometry,captureNativeAreaGeometry({sourceIdentity:receipt.area.geometry.sourceIdentity,bounds:receipt.area.geometry.bounds,layout:direct.value}));
  const bytes=serializeNativeAreaGeneration(receipt),cold=restoreNativeAreaGeneration(bytes,{certificate,geography:input.geography});assert.equal(serializeNativeAreaGeneration(cold),bytes);
  const resumed=NativeAreaRandom.fromState(cold.randomAfterGeneration);
  equal(resumed.run(rng=>nextNativeStage(clone(cold.area.geometry.layout.doodads),rng)),directStreams.run(rng=>nextNativeStage(direct.value.doodads,rng)),'native next-stage effects and both streams survive cold continuation');
  equal(resumed.snapshot(),directStreams.snapshot());
  assert.equal(assessNativeArea(cold.area,new Set(cold.area.requirements)).ok,false);
  const replay=compileNativeAreaGeneration(input,lease,initial);equal(replay,receipt,'A/B/A compilation');
  pairs++;control=receipt;
 }
 console.log('PASS native compiler dual-stream continuation',f.label);
}
assert.ok(control);let refusals=0;
const reject=(change:(r:any)=>void)=>{const bad=clone(control!);change(bad);assert.throws(()=>captureNativeAreaGeneration(bad));refusals++;};
for(const key of ['randomStart','randomAfterGeneration','randomAfterCapture'])reject(v=>delete v[key]);
reject(v=>v.randomStart.geometry=(v.randomStart.geometry+1)>>>0);reject(v=>v.randomAfterGeneration.geometry=(v.randomAfterGeneration.geometry+1)>>>0);reject(v=>v.randomAfterCapture.geometry=(v.randomAfterCapture.geometry+1)>>>0);reject(v=>v.randomAfterCapture.ambient=(v.randomAfterCapture.ambient+1)>>>0);
for(const cursor of [-1,.5,4294967296,-0])reject(v=>v.randomAfterGeneration.ambient=cursor);
let getterReads=0;const executable=clone(control);Object.defineProperty(executable,'randomStart',{enumerable:true,get(){getterReads++;return control!.randomStart;}});assert.throws(()=>captureNativeAreaGeneration(executable));assert.equal(getterReads,0);
const bytes=serializeNativeAreaGeneration(control);assert.throws(()=>restoreNativeAreaGeneration(bytes,{certificate:{...certificate,buildIdentity:'foreign'},geography:control.area.geography}));
console.log('PASS compiled native generation continuation receipt',{pairs,refusals});
