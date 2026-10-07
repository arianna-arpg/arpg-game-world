import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import type { ZoneDef } from '../src/data/zones';
import type { Bounds } from '../src/world/shape';
import { GridWalkField } from '../src/world/gridWalk';
import type { Vec2 } from '../src/core/math';
import { Rng,withSeededRandom } from '../src/core/rng';
import { makeSimWorld } from '../src/sim/arena';
import { placeZoneAt } from '../src/engine/worldgen';
import { generateLayout,doodadRuleOf } from '../src/engine/levelgen';
import { captureNativeGeneration } from '../src/worldmass/nativeGeneration';
import { captureNativeEffectSources } from '../src/worldmass/nativeEffectSources';
import { captureNativeBrittleSources } from '../src/worldmass/nativeBrittleSources';
import { captureNativeAreaGeometry } from '../src/worldmass/nativeAreaGeometryCapture';
import { serializeNativeAreaData,copyNativeAreaData } from '../src/worldmass/nativeAreaGeometry';
import { captureNativeGeographySource } from '../src/world/captureGeography';
import { createNativeGeographyReader } from '../src/world/geographySource';
import { MassNativeGeography,makeMassNativeGeographySpec,type MassNativeMapping } from '../src/worldmass/nativeGeography';
import { compileNativeArea,type NativeAreaCompileInput,type NativeAreaCompilerLease } from '../src/worldmass/nativeAreaCompiler';
import { serializeNativeArea,restoreNativeArea,assessNativeArea,validateNativeAreaDescriptor,nativeAreaRequirements,validateNativeAreaInputs,nativeAreaMouthSeed,type NativeAreaDescriptor } from '../src/worldmass/nativeArea';
import { massDigest } from '../src/worldmass/random';
import { TILESETS } from '../src/data/tilesets';
import { SIDEZONES } from '../src/data/sidezones';
import { STATUS_DEFS } from '../src/engine/status';
import type { MapCoord } from '../src/world/coords';
const clone=<T>(value:T):T=>structuredClone(value);
const equal=(a:unknown,b:unknown,message?:string)=>assert.equal(serializeNativeAreaData(a),serializeNativeAreaData(b),message??'native output differs');
const certificate={schema:1 as const,policy:'caller-attested-same-build-and-source-v1' as const,buildIdentity:'probe/current-native-compiler',installedSourceIdentity:'probe/actual-installed-native-sources'};
let revision='probe-source-1',checks=0;
const lease:NativeAreaCompilerLease={certificate,readRevision:()=>revision,assertCurrent:c=>{checks++;equal(c,certificate);assert.ok(Object.isFrozen(c));return true;}};
const fixtures=[
  {label:'open-land',seed:713,target:{x:6765,y:160},mintSeed:2229205504,index:810064,face:'meadow',layout:'plains'},
  {label:'whole-woods',seed:991,target:{x:2165,y:160},mintSeed:1062175204,index:810143,face:'heartwood',layout:'forest'},
  {label:'whole-districts',seed:991,target:{x:-55,y:160},mintSeed:2468017101,index:810156,face:'forest',layout:'districts'},
  {label:'whole-dunes',seed:713,target:{x:-67.5,y:-8745},mintSeed:924637573,index:810108,face:'saltflat',layout:'dunefield'},
  {label:'isolated-downs',seed:991,target:{x:-35,y:1280},mintSeed:1015847609,index:810204,face:'downs',layout:'massif'},
  {label:'whole-tableland',seed:713,target:{x:785,y:160},mintSeed:2919711994,index:810014,face:'tableland',layout:'massif'},
  {label:'resolved-atlas',seed:713,target:{x:9747.5,y:-6145},mintSeed:2073016533,index:810112,face:'hallowfield',layout:'districts'},
];
const descriptors:Readonly<NativeAreaDescriptor>[]=[],inputs:NativeAreaCompileInput[]=[];
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
  const before=serializeNativeAreaData(input);
  const descriptor=withSeededRandom(zone.seed!,()=>compileNativeArea(input,lease));equal(input,copyNativeAreaData(input));assert.equal(serializeNativeAreaData(input),before);
  const original={...clone(zone),exitBoundaries:undefined,exitRoads:undefined,exitMelds:undefined},rng=new Rng(zone.seed!);
  const direct=withSeededRandom(zone.seed!,()=>captureNativeGeneration(original,()=>generateLayout(original,descriptor.geometry.bounds,rng,clone(entry),exits.map(e=>clone(e.generationPoint)),[])));
  const next=Array.from({length:4},()=>rng.next());
  const geometry=captureNativeAreaGeometry({sourceIdentity:descriptor.geometry.sourceIdentity,bounds:descriptor.geometry.bounds,layout:direct.value});
  equal(descriptor.geometry,geometry,'whole native layout/grid/bounds must survive without cropping');
  equal(descriptor.zone,original);equal(descriptor.sidechannels,direct.sidechannels);equal(descriptor.generationNext,next);
  equal(descriptor.effectSources,captureNativeEffectSources(direct.value.doodads));equal(descriptor.brittleSources,captureNativeBrittleSources(direct.value.doodads));
  assert.ok(descriptor.requirements.includes('native-area-ambient-packs'));assert.ok(descriptor.requirements.includes('objective:'+zone.objective.kind));
  assert.equal(assessNativeArea(descriptor,new Set(descriptor.requirements)).ok,false,'metadata is not runtime admission');
  const bytes=serializeNativeArea(descriptor),restored=restoreNativeArea(bytes,{certificate,geography:input.geography});assert.equal(serializeNativeArea(restored),bytes);
  descriptors.push(descriptor);inputs.push(input);
  console.log('PASS whole native output',JSON.stringify({label:f.label,face:zone.tileset,layout:zone.layoutType??'plains',shape:zone.shape,doodads:descriptor.geometry.layout.doodads.length,structures:descriptor.geometry.layout.structures?.length??0,entrances:descriptor.entrances.length,bytes:bytes.length,requirements:descriptor.requirements.length}));
}
assert.equal(checks,fixtures.length*2);

// Three real World.loadZone generation taps recorded before shared mint
// extraction (40af53d2). Complete generated layout/grid SHA pins include every
// collection and structure, not merely a count. The archive uses native JSON
// projection; the direct pair below separately checks exact own-data/RNG state.
// Original native preparation may extend/prune exits; preserve that completed
// definition, ordered native ports and boundary/meld annotations together.
const archiveJson=gunzipSync(Buffer.from('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','base64')).toString('utf8');
assert.equal(createHash('sha256').update(archiveJson).digest('hex'),'7a63567eaf7c75ed9fb91fd4207f658ce9ba5b070bccda646d2f1462fa58d0a0');
const fullLoads=JSON.parse(archiveJson) as {seed:number;target:MapCoord;zone:ZoneDef;arena:Bounds;entry:Vec2;exits:Vec2[];outputHash:string;sidechannelsHash:string;structures:string[];doodads:number}[];
const jsonHash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
for(const f of fullLoads){
  const world=withSeededRandom(f.seed,()=>makeSimWorld('warrior',f.seed));world.sim.bindGeographyPolicies();
  const source=captureNativeGeographySource(f.seed),zone=clone(f.zone);
  // JSON's null array seats are the archive representation of native absent
  // annotation rows. Restore the explicit native undefined rows before use.
  zone.exitBoundaries=zone.exitBoundaries?.map(v=>v??undefined);
  zone.exitRoads=zone.exitRoads?.map(v=>v??undefined);
  zone.exitMelds=zone.exitMelds?.map(v=>v??undefined);
  const mapping=clone(inputs[0].geography.mapping);
  const geography=new MassNativeGeography(makeMassNativeGeographySpec(JSON.stringify(source),mapping));
  const request=geography.ownerContext('full-load/'+zone.id,geography.physicalAnchor(f.target));
  const context=geography.resolveOwnerContext(request,{resolvedOwnerId:'area/'+zone.id,resolutionKey:'archived-native-load/'+zone.id,nativeId:zone.id,resolvedTarget:f.target,resolvedSeed:zone.seed!});
  const exits=zone.exits.map((definition,i)=>({definition:clone(definition),generationPoint:clone(f.exits[i]),physicalPoint:definition.side==='n'?{x:f.exits[i].x,y:0}:definition.side==='s'?{x:f.exits[i].x,y:zone.size.h}:definition.side==='w'?{x:0,y:f.exits[i].y}:{x:zone.size.w,y:f.exits[i].y}}));
  const boundary={schema:1 as const,policy:'explicit-native-boundary-context-v1' as const,sourceIdentity:'archived-40af53d2-load/'+zone.id,exitBoundaries:clone(zone.exitBoundaries),exitRoads:clone(zone.exitRoads),exitMelds:clone(zone.exitMelds)};
  const input:NativeAreaCompileInput={id:context.resolvedOwnerId,geography:clone(geography.spec),context:clone(context),mintedZone:zone,entry:clone(f.entry),exits,boundary,seams:[{exitIndex:0,port:{owner:context.resolvedOwnerId,neighbor:'outside-owner-pending',side:exits[0].definition.side,point:clone(exits[0].physicalPoint),approach:clone(exits[0].generationPoint)}}]};
  const compiled=withSeededRandom(zone.seed!,()=>compileNativeArea(input,lease));
  assert.equal(jsonHash({layout:compiled.geometry.layout,grid:compiled.geometry.walk.kind==='grid'?compiled.geometry.walk.packed:null}),f.outputHash,'complete original native load output '+zone.id);
  assert.equal(jsonHash(compiled.sidechannels),f.sidechannelsHash);assert.deepEqual(compiled.geometry.layout.structures?.map(v=>v.id),f.structures);assert.equal(compiled.geometry.layout.doodads.length,f.doodads);
  const original=clone(zone),rng=new Rng(zone.seed!);
  const direct=withSeededRandom(zone.seed!,()=>captureNativeGeneration(original,()=>generateLayout(original,clone(f.arena),rng,clone(f.entry),clone(f.exits),[])));
  equal(compiled.geometry,captureNativeAreaGeometry({sourceIdentity:compiled.geometry.sourceIdentity,bounds:f.arena,layout:direct.value}));
  equal(compiled.zone,original);equal(compiled.sidechannels,direct.sidechannels);equal(compiled.generationNext,Array.from({length:4},()=>rng.next()));
  equal(compiled.effectSources,captureNativeEffectSources(direct.value.doodads));equal(compiled.brittleSources,captureNativeBrittleSources(direct.value.doodads));
  assert.ok(direct.value.walk instanceof GridWalkField);assert.notDeepEqual(compiled.exits[0].generationPoint,compiled.exits[0].physicalPoint);equal(compiled.exits[0].physicalPoint,compiled.seams[0].port.point);
  const bytes=serializeNativeArea(compiled);equal(restoreNativeArea(bytes,{certificate,geography:input.geography}),compiled);
  descriptors.push(compiled);inputs.push(input);
  console.log('PASS archived full native load',JSON.stringify({id:zone.id,face:zone.tileset,doodads:f.doodads,structures:f.structures,orderedExits:exits.length,distinctGenerationAndPhysicalPorts:true}));
}

const base=inputs[0],saved=descriptors[0];
for(const result of [false,'truthy',{},Promise.resolve(true)])assert.throws(()=>compileNativeArea(base,{certificate,readRevision:()=>revision,assertCurrent:()=>result as boolean}),/attestation refused/);
let readCalls=0;assert.throws(()=>compileNativeArea(base,{certificate,readRevision:()=>++readCalls===1?'before':'after',assertCurrent:()=>true}),/sources changed/);
let checkCalls=0;assert.throws(()=>compileNativeArea(base,{certificate,readRevision:()=>revision,assertCurrent:()=>{if(++checkCalls===2)revision='changed-after-native-generation';return true;}}),/sources changed/);revision='probe-source-1';
const mutable=clone(base),expectedName=mutable.mintedZone.name;
const detached=compileNativeArea(mutable,{certificate,readRevision:()=>revision,assertCurrent:()=>{mutable.mintedZone.name='caller changed';mutable.entry.x=0;return true;}});assert.equal(detached.sourceZone.name,expectedName);equal(detached.entry,base.entry);
for(const mutate of [(d:NativeAreaCompileInput)=>{d.mintedZone.id='foreign';},(d:NativeAreaCompileInput)=>{d.exits.reverse();},(d:NativeAreaCompileInput)=>{d.exits[0].definition.to='foreign';},(d:NativeAreaCompileInput)=>{d.mintedZone.geo!.biomeDepth=0;},(d:NativeAreaCompileInput)=>{d.context.resolvedSeed^=1;},(d:NativeAreaCompileInput)=>{d.seams[0].port.owner='foreign';}]){const input=clone(base);mutate(input);assert.throws(()=>compileNativeArea(input,lease));}
const bad:NativeAreaDescriptor=clone(saved);bad.requirements=bad.requirements.filter(r=>!r.startsWith('objective:'));assert.throws(()=>validateNativeAreaDescriptor(bad),/required native owner/);
assert.throws(()=>restoreNativeArea(serializeNativeArea(saved),{certificate:{...certificate,buildIdentity:'other-build'},geography:base.geography}),/exact recorded/);
assert.throws(()=>restoreNativeArea(serializeNativeArea(saved),{certificate,geography:{...base.geography,sourceHash:'different'}}),/exact recorded/);
const mouthArea=descriptors.find(d=>d.entrances.length);assert.ok(mouthArea,'course must exercise actual native entrance seeds');
const badMouth=clone(mouthArea);badMouth.entrances[0].seed=(badMouth.entrances[0].seed^1)>>>0;assert.throws(()=>validateNativeAreaDescriptor(badMouth),/seed/);
const nonCave=mouthArea.entrances.find(e=>e.kind!=='cave_entrance');if(nonCave)assert.equal(nonCave.seed,nativeAreaMouthSeed(mouthArea.zone.id,nonCave.kind,nonCave.sourcePosition));

// Saved descriptors must refuse malformed mechanisms before any native owner
// can consume them. These are shape/invariant checks, not source authentication.
let refusals=0;
const rejectsSaved=(d:NativeAreaDescriptor)=>{assert.throws(()=>restoreNativeArea(serializeNativeAreaData(d),{certificate,geography:d.geography}));refusals++;};
for(const key of ['pois','camps','breakables','npcs','garrisons'] as const){const bad=clone(saved);delete (bad.geometry.layout as Partial<typeof bad.geometry.layout>)[key];rejectsSaved(bad);const populated=descriptors.find(d=>d.geometry.layout[key].length);if(populated){const bad=clone(populated);(bad.geometry.layout[key] as unknown[])[0]={};rejectsSaved(bad);}}
const cave=descriptors.find(d=>d.entrances.some(e=>e.kind==='cave_entrance'))!;
for(const seed of [-1,.5,2**32]){const bad=clone(cave);bad.geometry.layout.caveSeeds[0]=seed;bad.entrances.find(e=>e.kind==='cave_entrance')!.seed=seed;rejectsSaved(bad);}
for(const key of ['effectSources','brittleSources'] as const){const bad:NativeAreaDescriptor=clone(saved);if(key==='effectSources')bad.effectSources={...bad.effectSources,registryHash:'not-a-hash'};else bad.brittleSources={...bad.brittleSources,registryHash:'not-a-hash'};rejectsSaved(bad);}
const malformed:NativeAreaDescriptor=clone(saved),body={protocol:'wrong',kind:'burial_urn',wake:{},rule:{},dissolve:null,debris:null};malformed.brittleSources={...malformed.brittleSources,definitions:[{...body,hash:massDigest(body)} as unknown as NativeAreaDescriptor['brittleSources']['definitions'][number]]};rejectsSaved(malformed);
const channel:NativeAreaDescriptor=clone(saved);channel.sidechannels={...channel.sidechannels,occurrences:[{site:{id:'site-a',x:1,y:1,floorR:1},definition:{id:'definition-b',trigger:{kind:'approach'},spring:{}}} as unknown as NativeAreaDescriptor['sidechannels']['occurrences'][number]]};channel.requirements=nativeAreaRequirements(channel.zone,channel.geometry.layout,channel.doodadRules,channel.entrances,channel.sidechannels,channel.effectSources,channel.brittleSources);rejectsSaved(channel);
for(const call of [validateNativeAreaDescriptor,serializeNativeArea,(d:NativeAreaDescriptor)=>assessNativeArea(d,new Set())]){const bad=clone(saved),zone=bad.zone;let reads=0;Object.defineProperty(bad,'zone',{enumerable:true,get(){reads++;return zone;}});assert.throws(()=>call(bad));assert.equal(reads,0);refusals++;}
for(const mutate of [(d:NativeAreaCompileInput)=>{delete (d.boundary as Partial<typeof d.boundary>).exitRoads;},(d:NativeAreaCompileInput)=>{d.boundary.exitMelds=[];},(d:NativeAreaCompileInput)=>{d.mintedZone.size={w:1e9,h:1e9};}]){const bad=clone(base);mutate(bad);assert.throws(()=>validateNativeAreaInputs({...bad,sourceZone:bad.mintedZone}));refusals++;}
console.log('PASS saved mechanism, accessor and pre-generation refusals',refusals);


// Malformed saved schemas, not authored/naturally generated content coverage.
// No positioned output may borrow prototype coordinates or a pos container.
const positionMutations:[string,(d:NativeAreaDescriptor)=>void][]=[
  ['pois',d=>{d.geometry.layout.pois=[{} as Vec2];}],
  ['camps',d=>{d.geometry.layout.camps=[{} as Vec2];}],
  ['breakables',d=>{d.geometry.layout.breakables=[{id:'fixture',pos:{} as Vec2}];}],
  ['npcs',d=>{d.geometry.layout.npcs=[{id:'fixture',pos:{} as Vec2}];}],
  ['landmarkSpawns',d=>{d.geometry.layout.landmarkSpawns=[{id:'fixture',pos:{} as Vec2}];}],
  ['garrisons',d=>{d.geometry.layout.garrisons=[{faction:'fixture',size:[1,1],pos:{} as Vec2}];}],
  ['folk',d=>{d.geometry.layout.folk=[{pool:'fixture',key:'fixture',pos:{} as Vec2}];}],
  ['airPockets',d=>{d.geometry.layout.airPockets=[{r:2} as {x:number;y:number;r:number}];}],
  ['pockets',d=>{d.geometry.layout.pockets=[{r:2} as {x:number;y:number;r:number}];}],
  ['spawnAt',d=>{d.geometry.layout.spawnAt={} as Vec2;}],
  ['bossSeat',d=>{d.geometry.layout.bossSeat={} as Vec2;}],
  ['hollow rect',d=>{d.geometry.layout.hollows=[{id:'fixture',kind:'fixture',rect:{} as {x:number;y:number;w:number;h:number},seams:[{x:1,y:1}],seed:1}];}],
  ['hollow seams',d=>{d.geometry.layout.hollows=[{id:'fixture',kind:'fixture',rect:{x:1,y:1,w:2,h:2},seams:[{} as Vec2],seed:1}];}],
  ['annex face',d=>{d.geometry.layout.annexes=[{piece:'fixture',kind:'fixture',face:{} as Vec2,rect:{x:1,y:1,w:2,h:2}}];}],
  ['annex carve',d=>{d.geometry.layout.annexes=[{piece:'fixture',kind:'fixture',face:{x:1,y:1},rect:{x:1,y:1,w:2,h:2},carve:[{} as {x:number;y:number;w:number;h:number}]}];}],
  ['track path',d=>{d.geometry.layout.tracks=[{path:[{} as Vec2,{x:2,y:2}],speed:10,riders:[]}];}],
  ['authored vent',d=>{d.geometry.layout.authoredVents=[{pos:{} as Vec2,cls:'great'}];}],
  ['inherited pos',d=>{d.geometry.layout.breakables=[{id:'fixture'} as {id:string;pos:Vec2}];}],
];
const structureCase=descriptors.find(d=>d.geometry.layout.structures?.length)!;
for(const key of ['rect','roofs','floors','courtyards'] as const)positionMutations.push(['structure '+key,d=>{d.geometry.layout.structures=clone(structureCase.geometry.layout.structures);const structure=d.geometry.layout.structures![0];if(key==='rect')structure.rect={} as typeof structure.rect;else structure[key]=[{} as typeof structure.rect];}]);
const poisoned={x:1,y:1,w:2,h:2,pos:{x:1,y:1},factionWar:{}};
const originals=Object.fromEntries(Object.keys(poisoned).map(key=>[key,Object.getOwnPropertyDescriptor(Object.prototype,key)]));
try{
  for(const [key,value]of Object.entries(poisoned))Object.defineProperty(Object.prototype,key,{value,writable:true,configurable:true,enumerable:false});
  const bytes=serializeNativeArea(saved);assert.equal(serializeNativeArea(restoreNativeArea(bytes,{certificate,geography:saved.geography})),bytes,'valid saved source is independent of inherited optional defaults');
  for(const [name,mutate]of positionMutations){const bad:NativeAreaDescriptor=clone(saved);mutate(bad);assert.throws(()=>restoreNativeArea(serializeNativeAreaData(bad),{certificate,geography:bad.geography}),/Invalid native (layout|entity|garrison|folk|pocket|arrival|hollow|annex|track|vent|structure)/,name);}
}finally{for(const key of Object.keys(poisoned)){const original=originals[key];if(original)Object.defineProperty(Object.prototype,key,original);else Reflect.deleteProperty(Object.prototype,key);}}
console.log('PASS inherited coordinate/container refusal schemas and unchanged valid restore',positionMutations.length);

// Restore is independent of live terrain/sidezone/status sources. These exact
// saved complete outputs remain readable after their live rules disappear.
const face=saved.sourceZone.tileset!,oldFace=TILESETS[face],oldStatus=STATUS_DEFS.cloudhaven,oldSidezones={...SIDEZONES};
const kinds=[...new Set(saved.geometry.layout.doodads.map(d=>d.kind))];const rule=(kind:string)=>doodadRuleOf(kind);
const firstRule=rule(kinds[0]),oldBlocks=firstRule.blocksMove;
try{delete TILESETS[face];delete STATUS_DEFS.cloudhaven;for(const k of Object.keys(SIDEZONES))delete SIDEZONES[k];firstRule.blocksMove=!oldBlocks;
  const bytes=serializeNativeArea(saved);equal(restoreNativeArea(bytes,{certificate,geography:base.geography}),saved);
}finally{TILESETS[face]=oldFace;STATUS_DEFS.cloudhaven=oldStatus;Object.assign(SIDEZONES,oldSidezones);if(oldBlocks===undefined)delete firstRule.blocksMove;else firstRule.blocksMove=oldBlocks;}
console.log('PASS exact native source context, real atlas reseating, full ordered exits, source/read revision refusals, immutable inputs, missing capability refusals and saved-output restore without live source reads');
console.log('LIMIT caller-provided certificate only; no bootstrap issuer, body/objective/environment host, final mouth seating, seam reachability or runtime publication is claimed');
