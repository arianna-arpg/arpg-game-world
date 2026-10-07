import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { Rng, withSeededRandom } from '../src/core/rng';
import { BIOMES, BIOME_FIELD, BIOME_FIELD_CFG, BIOME_FIELD_BANDS, BIOME_FLOORS, regionWinner, biomeAt, biomeDepth, resetFieldPickMemo } from '../src/world/biomes';
import { CLIMATE_AXES, CLIMATE_BANDS, CLIMATE_CFG, climateAt, climateAxisAt, captureNativeClimateSource, dimensionClimateOf } from '../src/world/climate';
import { CONTINENT_CFG, continentSeedFrom, continentAt, continentCellAt } from '../src/world/continents';
import { dimensionIds, dimensionDef, dimensionBiomeAt, dimensionBiomeDepth } from '../src/world/dimensions';
import { TILESETS, TILESETS_BY_BIOME, REALM_TILESETS_BY_BIOME, pickTilesetForBiome } from '../src/data/tilesets';
import { captureNativeGeographySource } from '../src/world/captureGeography';
import { createNativeGeographyReader, restoreNativeGeographySource, type NativeGeographySource } from '../src/world/geographySource';

const clone = <T>(v:T):T => JSON.parse(JSON.stringify(v));
const points = [
  {x:-35,y:160}, {x:0,y:0}, {x:-.5,y:.25},
  {x:30,y:-8810}, {x:-67.5,y:-8745},
  {x:9715,y:-6275}, {x:9747.5,y:-6145},
  {x:6010,y:-490}, {x:6075,y:-392.5},
  ...Array.from({length:121},(_,i)=>({x:(i%11-5)*575+31.5,y:(Math.floor(i/11)-5)*575-27.25})),
];
type Reader = ReturnType<typeof createNativeGeographyReader>;
const read = (r:Reader) => points.map(at=>({
  region:r.regionWinner(at), biome:r.biomeAt(at), depth:r.biomeDepth(at), climate:r.climateAt(at),
  cell:r.continentCellAt(at), continent:r.continentAt(at),
  realms: [...dimensionIds(),'unknown-realm'].map(dim=>({dim,biome:r.dimensionBiomeAt(dim,at),depth:r.dimensionBiomeDepth(dim,at),climate:r.climateAt(at,dim)})),
}));
let nativePairs=0, facePairs=0;
const sources:NativeGeographySource[]=[];
for(const seed of [0,713,991,0xffffffff]) {
  const w=withSeededRandom(seed,()=>makeSimWorld('warrior',seed));
  w.sim.bindGeographyPolicies(); resetFieldPickMemo();
  const source=captureNativeGeographySource(seed), r=createNativeGeographyReader(source);
  sources.push(source);
  assert.equal(r.identity,JSON.stringify(source));
  assert.deepEqual(source.biomes,Object.entries(BIOMES));
  assert.deepEqual(source.tilesets,Object.entries(TILESETS));
  assert.deepEqual(source.dimensions,dimensionIds().map(id=>[id,dimensionDef(id)]));
  assert.deepEqual(source.field.table,BIOME_FIELD); assert.deepEqual(source.field.bands,BIOME_FIELD_BANDS); assert.deepEqual(source.field.floors,BIOME_FLOORS);
  assert.deepEqual(source.field.geometry,BIOME_FIELD_CFG); assert.deepEqual(source.climate,captureNativeClimateSource());
  assert.deepEqual(source.pools.shared,Object.entries(TILESETS_BY_BIOME));
  assert.deepEqual(source.pools.realms,Object.entries(REALM_TILESETS_BY_BIOME).map(([dim,pools])=>[dim,Object.entries(pools)]));
  const originalRandom=Math.random; Math.random=()=>{throw Error('geography borrowed ambient RNG');};
  try {
    for(const at of points) {
      assert.deepEqual(r.regionWinner(at),regionWinner(at,seed));
      assert.equal(r.biomeAt(at),biomeAt(at,seed)); assert.equal(r.biomeDepth(at),biomeDepth(at,seed));
      assert.deepEqual(r.climateAt(at),climateAt(at,seed));
      assert.deepEqual(r.continentCellAt(at),continentCellAt(at,continentSeedFrom(seed)));
      assert.deepEqual(r.continentAt(at),continentAt(at,continentSeedFrom(seed)));
      for(const dim of [...dimensionIds(),'unknown-realm']) {
        assert.equal(r.dimensionBiomeAt(dim,at),dimensionBiomeAt(dim,at,seed));
        assert.equal(r.dimensionBiomeDepth(dim,at),dimensionBiomeDepth(dim,at,seed));
        assert.deepEqual(r.climateAt(at,dim),climateAt(at,seed,dim));
        for(const axis of Object.keys(CLIMATE_AXES)) assert.equal(r.climateAxisAt(at,axis,dim),climateAxisAt(at,seed,axis,dim));
      }
      nativePairs++;
    }
    for(const biome of [...Object.keys(TILESETS_BY_BIOME),'missing-biome']) for(const realm of [undefined,...Object.keys(REALM_TILESETS_BY_BIOME)]) {
      for(const depth of [undefined,0,.25,.75,1]) {
        const a=new Rng(seed),b=new Rng(seed),climate=climateAt(points[4],seed,realm);
        assert.equal(r.pickTilesetForBiome(biome,a,depth,realm,climate),pickTilesetForBiome(biome,b,depth,realm,climate));
        assert.equal(a.next(),b.next());facePairs++;
      }
    }
    const round=createNativeGeographyReader(restoreNativeGeographySource(r.identity));
    assert.equal(round.identity,r.identity); assert.deepEqual(read(round),read(r));
  } finally {Math.random=originalRandom;}
}
console.log('PASS',nativePairs,'composed native field/realm/climate/continent tuples and',facePairs,'face/RNG pairs over complete captured sources');

const source713=sources[1], a=createNativeGeographyReader(source713), baseline=read(a), bytes=a.identity;
// The actual native source witnesses from the archived depth-gate survey.
for(const [fringe,inner,biome,minDepth] of [[3,4,'desert',.35],[5,6,'jungle',.45],[7,8,'rift',.15]] as const) {
  const f=a.regionWinner(points[fringe]),i=a.regionWinner(points[inner]);
  assert.equal(f.biome,biome); assert.equal(i.biome,biome); assert.equal(f.gx,i.gx); assert.equal(f.gy,i.gy);
  assert.ok(f.depth<minDepth && i.depth>minDepth); assert.equal(a.biomeAt(points[inner]),biome);
}
withSeededRandom(887,()=>makeSimWorld('warrior',887));
assert.deepEqual(read(a),baseline); assert.equal(a.identity,bytes);
assert.deepEqual(read(createNativeGeographyReader(restoreNativeGeographySource(bytes))),baseline);
console.log('PASS real native fringe/interior witnesses and a second World cannot rewrite the captured field');

// Mutate each live dependency in isolation. A frozen reader must remain exactly
// stable while a newly captured source must own the actual changed bytes.
const restoreRecord=(target:Record<string,any>,saved:Record<string,any>)=>{for(const k of Object.keys(target))delete target[k];Object.assign(target,saved);};
let mutations=0;
const mutation=(name:string,apply:()=>()=>void)=>{
  const before=captureNativeGeographySource(713),beforeText=JSON.stringify(before),undo=apply();
  try {
    const b=createNativeGeographyReader(captureNativeGeographySource(713));
    assert.notEqual(b.identity,beforeText,name+' must change full source identity');
    if (['continent','origin','anchor','axis layers','dimension overrides'].includes(name)) {
      assert.notDeepEqual(read(b),read(createNativeGeographyReader(before)),name+' must also change a relevant sampled value');
    }
    assert.deepEqual(read(a),baseline,name+' leaked into old reader');
    assert.equal(a.identity,bytes);
    const round=createNativeGeographyReader(restoreNativeGeographySource(bytes));
    assert.deepEqual(read(round),baseline,name+' leaked into restored source');
    mutations++;
  } finally {undo();resetFieldPickMemo();}
  assert.equal(JSON.stringify(captureNativeGeographySource(713)),beforeText,name+' fixture failed to restore live state');
};
mutation('continent',()=>{const old=CONTINENT_CFG.oceanFrac;CONTINENT_CFG.oceanFrac=.99;return()=>{CONTINENT_CFG.oceanFrac=old;};});
mutation('origin',()=>{const old=CLIMATE_CFG.origin;CLIMATE_CFG.origin={x:old.x+515,y:old.y-770};return()=>{CLIMATE_CFG.origin=old;};});
mutation('anchor',()=>{const old=CLIMATE_CFG.anchors.capital;CLIMATE_CFG.anchors.capital={x:8000,y:-9000};return()=>{CLIMATE_CFG.anchors.capital=old;};});
mutation('axis layers',()=>{const row=CLIMATE_AXES.temperature,old=row.layers;row.layers=[{kind:'const',value:100}];return()=>{row.layers=old;};});
mutation('named band',()=>{const row=CLIMATE_BANDS.temperature,old=row.mild;row.mild={from:2};return()=>{row.mild=old;};});
mutation('dimension overrides',()=>{const id=Object.keys(Object.fromEntries(captureNativeClimateSource().dimensions))[0];const row=dimensionClimateOf(id)!;const old=clone(row);row.temperature={base:1,layers:[]};return()=>restoreRecord(row,old);});
mutation('biome affinity and source',()=>{const row=BIOMES.grove,old=clone(row);row.climate={temperature:{from:2}};row.regionScale=[.6,.6];row.label='Captured source witness';return()=>restoreRecord(row,old);});
mutation('ordered field rows',()=>{const old=BIOME_FIELD.slice();BIOME_FIELD.reverse();return()=>{BIOME_FIELD.splice(0,BIOME_FIELD.length,...old);};});
mutation('ordered bands',()=>{const old=BIOME_FIELD_BANDS.slice();BIOME_FIELD_BANDS.reverse();return()=>{BIOME_FIELD_BANDS.splice(0,BIOME_FIELD_BANDS.length,...old);};});
mutation('floor discs',()=>{const row=BIOME_FLOORS[0],old=row.discs;row.discs=[{anchor:'origin',r:1}];return()=>{row.discs=old;};});
mutation('realm palette',()=>{const row=dimensionDef(dimensionIds().find(id=>dimensionDef(id).biomes?.length)!);const old=row.biomes;row.biomes=[{biome:'grove',weight:1}];return()=>{row.biomes=old;};});
mutation('face pool order/duplicates',()=>{const row=TILESETS_BY_BIOME.desert,old=row.slice();row.reverse();row.push(row[0]);return()=>{row.splice(0,row.length,...old);};});
mutation('full face data/envelopes',()=>{const row=TILESETS.tableland,old=clone(row);row.depthAffinity={from:2};row.geoAffinity={temperature:{from:2}};row.nameFirst=['Frozen whole face'];return()=>restoreRecord(row,old);});
console.log('PASS',mutations,'independent live source mutations preserve A/B/A and cold restored identity');

let refusals=0;
const refuse=(name:string,change:(source:any)=>void)=>{const bad=clone(source713);change(bad);assert.throws(()=>createNativeGeographyReader(bad),name);refusals++;};
refuse('schema',s=>{s.schema=9;});refuse('algorithm',s=>{s.algorithm='unknown';});
refuse('signed zero',s=>{s.continent.oceanFrac=-0;});refuse('nonfinite',s=>{s.continent.cellSpan=Infinity;});
refuse('invalid span',s=>{s.continent.cellSpan=0;});refuse('invalid field span',s=>{s.field.geometry.cellSpan=0;});
refuse('undefined',s=>{s.field.unknown=undefined;});refuse('symbol',s=>{s.field[Symbol('lost')]=1;});
refuse('cycle',s=>{s.field.loop=s.field;});refuse('sparse',s=>{delete s.field.table[0];});
refuse('duplicate biome',s=>{s.biomes.push(s.biomes[0]);});refuse('malformed pool',s=>{s.pools.shared[0][1]=42;});
let getters=0;
refuse('accessor',s=>{Object.defineProperty(s.field,'derived',{enumerable:true,get(){getters++;return 1;}});});
assert.equal(getters,0,'source validation must refuse accessors without executing them');
assert.throws(()=>restoreNativeGeographySource(bytes+' '));refusals++;
assert.ok(Object.isFrozen(a.source));assert.ok(Object.isFrozen(a.source.biomes[0][1]));
assert.throws(()=>{(a.source.biomes[0][1] as any).label='changed';});
console.log('PASS',refusals,'malformed or lossy source refusals before publication; complete source is deeply immutable');

const detachedInput=clone(source713),detached=createNativeGeographyReader(detachedInput);
detachedInput.continent.oceanFrac=0;
detachedInput.biomes[0][1].climate={temperature:{from:2}};
detachedInput.tilesets[0][1].nameFirst=['Changed input'];
assert.deepEqual(read(detached),baseline);assert.equal(detached.identity,bytes);

// Preserve the native mixed-table memo contract if custom content supplies a
// surface realm palette. The shipping surface has no palette; this deliberate
// custom case is query-order dependent in native code and must stay so here.
withSeededRandom(713,()=>makeSimWorld('warrior',713));
const oldTable=BIOME_FIELD.slice(),oldBands=BIOME_FIELD_BANDS.slice(),oldFloors=BIOME_FLOORS.slice();
const surface=dimensionDef('surface'),oldPalette=surface.biomes;
const memoWitnesses:unknown[][]=[];let memoPairs=0;
try {
  BIOME_FIELD.splice(0,BIOME_FIELD.length,{biome:'grove'});
  BIOME_FIELD_BANDS.splice(0);BIOME_FLOORS.splice(0);surface.biomes=[{biome:'desert',weight:1}];
  const mixedSource=captureNativeGeographySource(713);
  for(const order of ['region-first','realm-first'] as const) {
    resetFieldPickMemo();const r=createNativeGeographyReader(mixedSource),lane:unknown[]=[];
    for(const at of [{x:1,y:1},{x:130,y:130},{x:-520,y:780},{x:30,y:-8810}]) {
      if(order==='region-first') {
        const region=r.regionWinner(at);assert.deepEqual(region,regionWinner(at,713));
        const realm=r.dimensionBiomeAt('surface',at);assert.equal(realm,dimensionBiomeAt('surface',at,713));lane.push({region,realm});
      } else {
        const realm=r.dimensionBiomeAt('surface',at);assert.equal(realm,dimensionBiomeAt('surface',at,713));
        const region=r.regionWinner(at);assert.deepEqual(region,regionWinner(at,713));lane.push({region,realm});
      }
      memoPairs++;
    }
    memoWitnesses.push(lane);
  }
  assert.notDeepEqual(memoWitnesses[0],memoWitnesses[1],'fixture must witness the actual native table/cache interaction');
} finally {
  BIOME_FIELD.splice(0,BIOME_FIELD.length,...oldTable);BIOME_FIELD_BANDS.splice(0,BIOME_FIELD_BANDS.length,...oldBands);
  BIOME_FLOORS.splice(0,BIOME_FLOORS.length,...oldFloors);
  if(oldPalette===undefined)delete surface.biomes;else surface.biomes=oldPalette;
  resetFieldPickMemo();
}
console.log('PASS',memoPairs,'custom surface-palette pairs preserve the native sequence-dependent memo contract');

// Cross the native 16,384-key field cache boundary with distinct realm sites.
// Alternate another source, then revisit the first source in reverse order.
withSeededRandom(713,()=>makeSimWorld('warrior',713));resetFieldPickMemo();
const realm=dimensionIds().find(id=>dimensionDef(id).biomes?.length)!;
const bSource=clone(source713),axis=bSource.climate.axes.find(([key])=>key==='temperature')![1];
axis.base=1;axis.layers=[];
const b=createNativeGeographyReader(bSource),span=source713.field.geometry.cellSpan;
let churn=0;const oldRandom=Math.random;Math.random=()=>{throw Error('cache churn consumed ambient RNG');};
try {
  for(let i=0;i<16420;i++) {
    const at={x:(i%129+.5)*span,y:(Math.floor(i/129)+.5)*span};
    assert.equal(a.dimensionBiomeAt(realm,at),dimensionBiomeAt(realm,at,713));
    if(i%257===0)b.dimensionBiomeAt(realm,at);
    churn++;
  }
  for(const at of points.slice().reverse()) {
    assert.deepEqual(a.regionWinner(at),regionWinner(at,713));
    assert.equal(a.dimensionBiomeAt(realm,at),dimensionBiomeAt(realm,at,713));
  }
  assert.deepEqual(read(a),baseline);assert.equal(a.identity,bytes);
} finally {Math.random=oldRandom;}
console.log('PASS',churn,'distinct realm cells cross the native memo cap; detached inputs, interleaved sources and reverse revisits retain exact results');

// Persist the specific review regressions in the ordinary repository gate.
refuse('subnormal floor divisor',s=>{s.field.geometry.cellSpan=Number.MIN_VALUE;});
refuse('finite oversized floor scan',s=>{s.field.floors[0].discs[0].r=1e9;});
refuse('unrepresentable origin',s=>{s.climate.origin.x=Number.MAX_VALUE;});
refuse('excessive region search',s=>{s.field.geometry.regionScale.search=17;});
refuse('absent pooled face',s=>{s.pools.shared[0][1].push('not-a-complete-face-source');});
refuse('missing face payload',s=>{delete s.tilesets[0][1].packs;});
refuse('null prototype source',s=>{Object.setPrototypeOf(s.continent,null);});
assert.throws(()=>a.regionWinner({x:Infinity,y:0}));
assert.throws(()=>a.landfallFrom({x:0,y:0},0,4097));
assert.throws(()=>a.dimensionDef('__proto__'));
const inheritedAxis='reviewUnknownAxis',unknownBand='review-unknown-band';
const inheritedBefore=Object.getOwnPropertyDescriptor(Object.prototype,inheritedAxis),mulBefore=Object.getOwnPropertyDescriptor(Object.prototype,'mul');
try {
  assert.equal(a.climateAxisAt({x:0,y:0},inheritedAxis),0);
  assert.equal(a.climateAffinity({temperature:unknownBand},{temperature:.5}),1);
  Object.defineProperty(Object.prototype,inheritedAxis,{configurable:true,enumerable:false,value:{id:inheritedAxis,label:'Inherited',base:.75,layers:[]}});
  Object.defineProperty(Object.prototype,'mul',{configurable:true,enumerable:false,value:0});
  assert.equal(a.climateAxisAt({x:0,y:0},inheritedAxis),0);
  assert.equal(a.climateAffinity({temperature:unknownBand},{temperature:.5}),1);
  assert.equal(a.identity,bytes);assert.deepEqual(read(a),baseline);
} finally {
  if(inheritedBefore)Object.defineProperty(Object.prototype,inheritedAxis,inheritedBefore);else delete (Object.prototype as any)[inheritedAxis];
  if(mulBefore)Object.defineProperty(Object.prototype,'mul',mulBefore);else delete (Object.prototype as any).mul;
}
console.log('PASS unsafe scan/source bounds refuse before sampling; private lookup and unknown-band fallback resist inherited property drift');

const tiny:any=clone(source713);
tiny.field.floors=[];tiny.climate.origin={x:0,y:0};tiny.climate.anchors=[];tiny.climate.dimensions=[];
tiny.climate.axes=[['temperature',{id:'temperature',label:'Temperature',base:0,layers:[{kind:'noise',cell:Number.MIN_VALUE,amp:1}]}]];
const tinyReader=createNativeGeographyReader(tiny);
assert.ok(Number.isFinite(tinyReader.climateAt({x:0,y:0}).temperature));
assert.throws(()=>tinyReader.regionWinner({x:0,y:0}),'derived native site must be checked before its climate read');
assert.throws(()=>tinyReader.dimensionBiomeAt(realm,{x:0,y:0}),'realm derived site must receive the same domain check');
const alias=2**32;
assert.equal(a.cellKind(alias+11,13),a.cellKind(11,13),'native signed-32 cell hash alias remains explicit');
for(const at of [{x:(alias+.5)*260,y:1730},{x:(-alias+.5)*260,y:-1730}]) {
  assert.deepEqual(a.regionWinner(at),regionWinner(at,713));
  assert.deepEqual(a.climateAt(at),climateAt(at,713));
}
console.log('PASS derived-site numeric refusal and exact large-coordinate native arithmetic; native hash aliases remain a declared limitation');
