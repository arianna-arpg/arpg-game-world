/** Exact native continent extraction: independent pinned-source oracle, read/call tapes and immutable-reader isolation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import ts from 'typescript';
import * as core from '../src/world/continentCore';
import * as wrapper from '../src/world/continents';
import { CONTINENT_CFG as liveConfig } from '../src/world/continents';
import { CLIMATE_CFG, setClimateOrigin } from '../src/world/climate';
import type { MapCoord } from '../src/world/coords';

// Complete original native file, pinned before extraction. The baseline has no runtime Git or local-scratch dependency.
const sourceMeta = {
  "pin": "67d9c290684f06ba2bda8a7694def1e9e4448381",
  "sourcePath": "src/world/continents.ts",
  "sourceSha256": "51a77fde91a35b68524f8fa5c9d490bcab86e6efaf8372aa01301f35aee118d4"
} as const;
const source = "// ---------------------------------------------------------------------------\n// CONTINENTS — the world's LANDMASS field: a low-frequency jittered Voronoi\n// over node space (the biome field's idiom, an octave up) that partitions the\n// infinite map into continents separated by OCEAN, with occasional LAND\n// BRIDGES tying neighbours together. Pure + deterministic per (coord, seed):\n// the same coordinate is the same shore on every machine, every reload.\n//\n//   land    zones mint normally (a continent holds many biome regions)\n//   ocean   zones DON'T mint — a frontier reaching in becomes a PORT, and\n//           travel onward is by SEA (the Sail menu; Lost Ark port-hopping)\n//   bridge  a rare tested isthmus through the ocean between two landmasses —\n//           the walkable back door\n//\n// Every knob is data (CONTINENT_CFG): ocean spans, landmass scale, bridge\n// frequency — the \"configurable size spans of flexible ocean\" lever.\n// ---------------------------------------------------------------------------\n\nimport type { MapCoord } from './coords';\n\nexport interface ContinentCfg {\n  /** Macro-cell span in node units — the landmass scale (biome cells are 260;\n   *  a continent spans several biome regions). */\n  cellSpan: number;\n  /** Voronoi seed jitter (0..0.5) — organic coastlines, not squares. */\n  jitter: number;\n  /** Fraction of macro cells that are OCEAN — the sea-span lever. */\n  oceanFrac: number;\n  /** Chance an ocean cell wedged between two land cells firms into a BRIDGE. */\n  bridgeChance: number;\n}\n\nexport const CONTINENT_CFG: ContinentCfg = {\n  cellSpan: 1150,\n  jitter: 0.42,\n  oceanFrac: 0.38,\n  bridgeChance: 0.3,\n};\n\nexport interface ContinentInfo {\n  kind: 'land' | 'ocean' | 'bridge';\n  /** Stable landmass label (`cont_<gx>_<gy>` of the winning land seed) — the\n   *  port-routing key. null on open ocean. */\n  landmass: string | null;\n}\n\n/** THE one derivation of the continent seed from the biome-field seed — the\n *  landmass and biome layers are independent layouts of the same world, and\n *  every sampler (world, biomes, panels) must salt identically. */\nexport function continentSeedFrom(fieldSeed: number): number {\n  return (fieldSeed ^ 0x0cea11) >>> 0;\n}\n\nfunction hashCell(a: number, b: number, seed: number): number {\n  let h = (seed ^ 0x9e3779b9) >>> 0;\n  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;\n  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;\n  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;\n  return h >>> 0;\n}\n\nfunction cellIsLand(gx: number, gy: number, seed: number): boolean {\n  // The HOME NEIGHBORHOOD is always land — the town must never sit mid-ocean.\n  // The town's canonical coord lives near the corner of macro-cells\n  // (-1..0, -1..0) (cellSpan 1150, jitter 0.42), so ANY of those four can win\n  // the Voronoi at its coordinate depending on the seed; pinning only (0,0)\n  // left seeds where the town's actual winning cell rolled OCEAN (the map\n  // washed the town blue, frontiers gated into ports at the doorstep).\n  if (gx >= -1 && gx <= 0 && gy >= -1 && gy <= 0) return true;\n  return (hashCell(gx, gy, (seed ^ 0x51ed270b) >>> 0) / 0x100000000) >= CONTINENT_CFG.oceanFrac;\n}\n\n/** The WINNING macro cell at a coordinate — the landmass field's raw unit,\n *  exposed so sibling fields (climate's coastal/landmass-flavor layers) can\n *  key stable per-continent values without parsing label strings. */\nexport interface ContinentCell {\n  gx: number;\n  gy: number;\n  kind: 'land' | 'ocean' | 'bridge';\n}\n\n/** The RAW kind of one macro cell by its lattice address — the SEA FABRIC's\n *  fill substrate (world/seas.ts): continentCellAt answers \"which cell wins\n *  at a coordinate\"; this answers \"what is cell (gx,gy)\". Identical rolls to\n *  the winner path (one source of truth — continentCellAt delegates here).\n *  A bridge counts as NOT-water for sailing: its span blocks the boat, so\n *  two waters joined only under a bridge are separate SEAS. */\nexport function cellKind(gx: number, gy: number, seed: number): 'land' | 'ocean' | 'bridge' {\n  if (cellIsLand(gx, gy, seed)) return 'land';\n  // Bridge test: an ocean cell with land on OPPOSITE sides (either axis) may\n  // firm into an isthmus — hashed per cell so the bridge is stable world-wide.\n  const flanked =\n    (cellIsLand(gx - 1, gy, seed) && cellIsLand(gx + 1, gy, seed))\n    || (cellIsLand(gx, gy - 1, seed) && cellIsLand(gx, gy + 1, seed));\n  if (flanked && (hashCell(gx, gy, (seed ^ 0x2545f491) >>> 0) / 0x100000000) < CONTINENT_CFG.bridgeChance) {\n    return 'bridge';\n  }\n  return 'ocean';\n}\n\n/** The JITTERED SITE of a macro cell (its Voronoi seed point) — exported so\n *  the sea fabric's centroids/orderings share the exact geometry the winner\n *  search uses. */\nexport function cellSite(gx: number, gy: number, seed: number): MapCoord {\n  const span = CONTINENT_CFG.cellSpan, jit = CONTINENT_CFG.jitter;\n  const h = hashCell(gx, gy, seed);\n  return {\n    x: (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span,\n    y: (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span,\n  };\n}\n\n/** The landmass field's winning cell at a node-space coordinate. Same 3×3\n *  jittered-Voronoi search as biomeAt; the winning seed's land/ocean roll\n *  decides (cellKind — the one source of truth). */\nexport function continentCellAt(coord: MapCoord, seed: number): ContinentCell {\n  const span = CONTINENT_CFG.cellSpan;\n  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);\n  let bestD = Infinity, bestGx = 0, bestGy = 0;\n  for (let dx = -1; dx <= 1; dx++) {\n    for (let dy = -1; dy <= 1; dy++) {\n      const gx = cx + dx, gy = cy + dy;\n      const s = cellSite(gx, gy, seed);\n      const d = (s.x - coord.x) ** 2 + (s.y - coord.y) ** 2;\n      if (d < bestD) { bestD = d; bestGx = gx; bestGy = gy; }\n    }\n  }\n  return { gx: bestGx, gy: bestGy, kind: cellKind(bestGx, bestGy, seed) };\n}\n\n/** The landmass field at a node-space coordinate (label form of the cell). */\nexport function continentAt(coord: MapCoord, seed: number): ContinentInfo {\n  const cell = continentCellAt(coord, seed);\n  switch (cell.kind) {\n    case 'land': return { kind: 'land', landmass: `cont_${cell.gx}_${cell.gy}` };\n    case 'bridge': return { kind: 'bridge', landmass: `bridge_${cell.gx}_${cell.gy}` };\n    case 'ocean': return { kind: 'ocean', landmass: null };\n  }\n}\n\n/** March from a port coordinate across the ocean along a bearing until LAND —\n *  the \"chart a course\" landfall picker. Returns the first land coord (a\n *  little inland), or null if no land within `maxSteps`. Pure. */\nexport function landfallFrom(\n  from: MapCoord, angle: number, seed: number, maxSteps = 30,\n): MapCoord | null {\n  const step = CONTINENT_CFG.cellSpan * 0.45;\n  let sawOcean = false;\n  for (let i = 1; i <= maxSteps; i++) {\n    const c = { x: from.x + Math.cos(angle) * step * i, y: from.y + Math.sin(angle) * step * i };\n    const info = continentAt(c, seed);\n    if (info.kind !== 'land') { sawOcean = true; continue; }\n    if (sawOcean) {\n      // One more step inland so the landfall zone isn't itself a shoreline\n      // sliver — but only if the nudged point is STILL land (a thin island's\n      // far side is ocean again; landing on the verified coast beats sailing\n      // clean over the isle).\n      const inland = { x: c.x + Math.cos(angle) * step * 0.5, y: c.y + Math.sin(angle) * step * 0.5 };\n      return continentAt(inland, seed).kind === 'land' ? inland : c;\n    }\n  }\n  return null;\n}\n";
// Instrument the actual tracked implementation as well as importing its public API.
const candidate=fs.readFileSync(new URL('../src/world/continentCore.ts',import.meta.url),'utf8');
const sha=(v:string)=>crypto.createHash('sha256').update(v).digest('hex');
assert.equal(sha(source),sourceMeta.sourceSha256,'pinned original source checksum');
const names:Record<string,string>={nativeContinentSeedFrom:'continentSeedFrom',nativeContinentHash:'hashCell',nativeContinentCellIsLand:'cellIsLand',nativeContinentCellKind:'cellKind',nativeContinentCellSite:'cellSite',nativeContinentCellAt:'continentCellAt',nativeContinentAt:'continentAt',nativeContinentLandfallFrom:'landfallFrom'};
type Tape=unknown[][];
function load(text:string,tape?:Tape):any{
  const sf=ts.createSourceFile('archive.ts',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),changes:{at:number;text:string}[]=[];
  if(tape)for(const node of sf.statements)if(ts.isFunctionDeclaration(node)&&node.name&&node.body){
    const raw=node.name.text,name=names[raw]??raw;if(name==='createNativeContinentReader')continue;
    const params=node.parameters.map(p=>p.name.getText(sf)).filter(n=>n!=='config');
    changes.push({at:node.body.getStart(sf)+1,text:'\n__tap('+JSON.stringify(name)+',['+params.join(',')+']);\n'});
  }
  for(const change of changes.sort((a,b)=>b.at-a.at))text=text.slice(0,change.at)+change.text+text.slice(change.at);
  if(!text.includes('nativeContinentSeedFrom'))text+='\nexport const __nativeProbe={hashCell,cellIsLand};';
  const result=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,exports={};
  new Function('exports','__tap',result)(exports,(name:string,args:unknown[])=>tape?.push([name,...args.map(v=>v&&typeof v==='object'?{...v}:v)]));return exports;
}
const oracle=load(source),defaults:core.ContinentCfg={...oracle.CONTINENT_CFG};
const stats={hash:0,seed:0,rawCells:0,sites:0,winners:0,info:0,landfalls:0,readTapes:0,callTapes:0,wrapperPairs:0,aba:0};
const kinds:Record<string,number>={land:0,ocean:0,bridge:0};
const originalConfig={...liveConfig},initialClimateOrigin={...CLIMATE_CFG.origin};
const originalRandom=Math.random;Math.random=()=>{throw Error('native continent consumed ambient RNG');};
const configs:core.ContinentCfg[]=[defaults,{...defaults,jitter:0},{...defaults,oceanFrac:0},{...defaults,oceanFrac:1},
  {...defaults,bridgeChance:0},{...defaults,bridgeChance:1},{cellSpan:260,jitter:.5,oceanFrac:.5,bridgeChance:.75},
  {cellSpan:.25,jitter:.12,oceanFrac:.83,bridgeChance:.01}];
const seeds=[0,1,42,713,-1,0x7fffffff,0x80000000,0xffffffff,0x100000001,-0x100000001,.75,NaN,Infinity];
const cells=[-0x100000001,-0x80000001,-0x80000000,-17,-1,-.25,0,.25,1,17,0x7fffffff,0x80000000,0x100000011,Number.MAX_SAFE_INTEGER];
const coordCases=(span:number):MapCoord[]=>{
 const out:MapCoord[]=[];for(const x of [-span-1e-8,-span,-span+1e-8,-1e-8,-0,1e-8,span-1e-8,span,span+1e-8])for(const y of [-span,-1e-8,0,span*.5,span])out.push({x,y});
 for(const n of [-0x100000001,-0x80000000,0x7fffffff,0x100000011,Number.MAX_SAFE_INTEGER])out.push({x:n*span+span*.37,y:-n*span+span*.63});
 let state=93271;for(let i=0;i<50;i++){state=Math.imul(state,1664525)+1013904223|0;const x=(state/0x80000000)*span*19;state=Math.imul(state,1664525)+1013904223|0;out.push({x,y:(state/0x80000000)*span*19});}return out;
};
try{
 for(const seed of seeds){assert.equal(core.nativeContinentSeedFrom(seed),oracle.continentSeedFrom(seed));stats.seed++;
  for(const gx of cells)for(const gy of [-0x100000001,-1,0,.5,1,0x80000000]){assert.equal(core.nativeContinentHash(gx,gy,seed),oracle.__nativeProbe.hashCell(gx,gy,seed));stats.hash++;}
 }
 for(const config of configs){Object.assign(oracle.CONTINENT_CFG,config);const reader=core.createNativeContinentReader(config);
  for(const seed of seeds){
   for(const gx of cells)for(const gy of [-17,-1,-.25,0,1,17]){
    const kind=oracle.cellKind(gx,gy,seed);assert.equal(reader.cellKind(gx,gy,seed),kind);stats.rawCells++;kinds[kind]++;
    assert.deepEqual(reader.cellSite(gx,gy,seed),oracle.cellSite(gx,gy,seed));stats.sites++;
   }
   for(const coord of coordCases(config.cellSpan)){
    assert.deepEqual(reader.continentCellAt(coord,seed),oracle.continentCellAt(coord,seed));stats.winners++;
    assert.deepEqual(reader.continentAt(coord,seed),oracle.continentAt(coord,seed));stats.info++;
   }
   for(const from of [{x:0,y:0},{x:-4400,y:3100},{x:config.cellSpan*.37,y:-config.cellSpan*4.75}])for(const angle of [-Math.PI,-.00001,0,Math.PI/2,Math.PI,Math.PI*2])for(const steps of [0,1,7,30]){
    assert.deepEqual(reader.landfallFrom(from,angle,seed,steps),oracle.landfallFrom(from,angle,seed,steps));stats.landfalls++;
   }
   assert.deepEqual(reader.landfallFrom({x:0,y:0},.73,seed),oracle.landfallFrom({x:0,y:0},.73,seed));stats.landfalls++;
  }
 }
 for(const n of Object.values(kinds))assert.ok(n>0);

 // Getter tape checks preserve every original policy/coordinate read and order.
 const tapeOld:Tape=[],tapeNew:Tape=[];const getterOracle=load(source);let values={...defaults};
 for(const key of Object.keys(defaults) as (keyof core.ContinentCfg)[])Object.defineProperty(getterOracle.CONTINENT_CFG,key,{configurable:true,get(){tapeOld.push(['cfg',key,values[key]]);return values[key];}});
 const tracedConfig=new Proxy({} as core.ContinentCfg,{get(_target,key:keyof core.ContinentCfg){tapeNew.push(['cfg',key,values[key]]);return values[key];}});
 const tracedCoord=(value:MapCoord,tape:Tape)=>new Proxy(value,{get(target,key:keyof MapCoord){tape.push(['coord',key,target[key]]);return target[key];}});
 for(const config of configs){values=config;for(const seed of [0,713,-1])for(const coord of coordCases(config.cellSpan).slice(0,12)){
  tapeOld.length=0;tapeNew.length=0;assert.deepEqual(core.nativeContinentCellAt(tracedConfig,tracedCoord(coord,tapeNew),seed),getterOracle.continentCellAt(tracedCoord(coord,tapeOld),seed));assert.deepEqual(tapeNew,tapeOld);stats.readTapes++;
  tapeOld.length=0;tapeNew.length=0;assert.deepEqual(core.nativeContinentAt(tracedConfig,tracedCoord(coord,tapeNew),seed),getterOracle.continentAt(tracedCoord(coord,tapeOld),seed));assert.deepEqual(tapeNew,tapeOld);stats.readTapes++;
  tapeOld.length=0;tapeNew.length=0;assert.deepEqual(core.nativeContinentLandfallFrom(tracedConfig,tracedCoord(coord,tapeNew),.73,seed,6),getterOracle.landfallFrom(tracedCoord(coord,tapeOld),.73,seed,6));assert.deepEqual(tapeNew,tapeOld);stats.readTapes++;
 }}

 // Trace actual original/candidate function-entry tapes, normalizing only the
 // added policy parameter and extracted names. This checks site visitation,
 // hash salts, short-circuit bridge neighbor order and landfall reader order.
 const callsOld:Tape=[],callsNew:Tape=[],instrumentOld=load(source,callsOld),instrumentNew=load(candidate,callsNew);
 const callDigests:string[]=[];
 for(const config of configs){Object.assign(instrumentOld.CONTINENT_CFG,config);for(const seed of [0,713,-1])for(const coord of coordCases(config.cellSpan).slice(0,12)){
  for(const method of ['continentCellAt','continentAt','landfallFrom'] as const){
   callsOld.length=0;callsNew.length=0;const args=method==='landfallFrom'?[coord,.73,seed,6]:[coord,seed];
   const next=method==='continentCellAt'?'nativeContinentCellAt':method==='continentAt'?'nativeContinentAt':'nativeContinentLandfallFrom';
   assert.deepEqual(instrumentNew[next](config,...args),instrumentOld[method](...args));assert.deepEqual(callsNew,callsOld);callDigests.push(sha(JSON.stringify(callsOld)));stats.callTapes++;
  }
 }}

 // Direct raw-cell call tapes also exercise both flanking axes and native
 // short-circuit behavior away from the pinned home neighborhood.
 for(const config of configs){Object.assign(instrumentOld.CONTINENT_CFG,config);for(const seed of [0,713])for(const gx of [-30,-17,-2,-1,0,1,17])for(const gy of [-30,-17,-2,-1,0,1,17]){
  callsOld.length=0;callsNew.length=0;assert.equal(instrumentNew.nativeContinentCellKind(config,gx,gy,seed),instrumentOld.cellKind(gx,gy,seed));
  assert.deepEqual(callsNew,callsOld);callDigests.push(sha(JSON.stringify(callsOld)));stats.callTapes++;
 }}
 // Zero jitter exact ties retain the first dx-major/dy-minor site. Nearby
 // representable sides flip only as the native squared-distance rule dictates.
 const regular=core.createNativeContinentReader({...defaults,jitter:0}),sp=defaults.cellSpan;
 assert.deepEqual(regular.continentCellAt({x:0,y:0},713),{gx:-1,gy:-1,kind:'land'});
 assert.deepEqual(regular.continentCellAt({x:1e-7,y:1e-7},713),{gx:0,gy:0,kind:'land'});
 assert.deepEqual(regular.continentCellAt({x:-1e-7,y:1e-7},713),{gx:-1,gy:0,kind:'land'});
 assert.equal(regular.continentCellAt({x:sp*.5,y:sp},713).gy,0);

 // Threshold boundary witnesses use the pinned hash as an independent roll.
 const oceanRoll=oracle.__nativeProbe.hashCell(17,19,(713^0x51ed270b)>>>0)/0x100000000;
 assert.equal(core.nativeContinentCellKind({...defaults,oceanFrac:oceanRoll,bridgeChance:0},17,19,713),'land');
 assert.equal(core.nativeContinentCellKind({...defaults,oceanFrac:oceanRoll+Number.EPSILON,bridgeChance:0},17,19,713),'ocean');
 Object.assign(oracle.CONTINENT_CFG,defaults);let bridgeWitness:{gx:number;gy:number;roll:number}|undefined;
 for(let gx=-30;gx<=30&&!bridgeWitness;gx++)for(let gy=-30;gy<=30;gy++)if(oracle.cellKind(gx,gy,713)==='bridge'){bridgeWitness={gx,gy,roll:oracle.__nativeProbe.hashCell(gx,gy,(713^0x2545f491)>>>0)/0x100000000};break;}
 assert.ok(bridgeWitness);const {gx,gy,roll}=bridgeWitness;
 assert.equal(core.nativeContinentCellKind({...defaults,bridgeChance:roll},gx,gy,713),'ocean');
 assert.equal(core.nativeContinentCellKind({...defaults,bridgeChance:roll+Number.EPSILON},gx,gy,713),'bridge');
 assert.equal(core.createNativeContinentReader(defaults).continentAt(core.nativeContinentCellSite(defaults,gx,gy,713),713).landmass,`bridge_${gx}_${gy}`);
 for(const x of [-0x80000000,-17,17,0x7fffffff])for(const seed of [0,713,-1]){
  assert.equal(core.nativeContinentHash(x,19,seed),core.nativeContinentHash(x+0x100000000,19,seed));
  assert.equal(core.nativeContinentCellKind(defaults,x,19,seed),core.nativeContinentCellKind(defaults,x+0x100000000,19,seed));
 }

 // Reader sources are private immutable copies, with no cache or shared result
 // identity. Every A/B/A call must be independent of live native mutations.
 const inputA={...defaults},inputB={cellSpan:400,jitter:.5,oceanFrac:.9,bridgeChance:1};
 const originalB={...inputB},A=core.createNativeContinentReader(inputA),B=core.createNativeContinentReader(inputB);
 assert.notEqual(A.config,inputA);assert.notEqual(A.config,B.config);assert.ok(Object.isFrozen(A)&&Object.isFrozen(A.config));
 assert.throws(()=>{(A.config as core.ContinentCfg).cellSpan=88;});
 Object.assign(inputA,{cellSpan:1,jitter:0,oceanFrac:1,bridgeChance:0});Object.assign(inputB,{cellSpan:999,jitter:0,oceanFrac:0,bridgeChance:0});
 const originalLive={...liveConfig},originalClimateOrigin={...CLIMATE_CFG.origin};let different=0;
 try{
  Object.assign(liveConfig,{cellSpan:99,jitter:0,oceanFrac:1,bridgeChance:0});setClimateOrigin({x:918273,y:-637281});
  for(const seed of [0,713,-1])for(const coord of coordCases(defaults.cellSpan)){
   const a=A.continentCellAt(coord,seed),b=B.continentCellAt(coord,seed);if(JSON.stringify(a)!==JSON.stringify(b))different++;
   Object.assign(oracle.CONTINENT_CFG,originalB);assert.deepEqual(b,oracle.continentCellAt(coord,seed));
   assert.deepEqual(A.continentCellAt(coord,seed),a);Object.assign(oracle.CONTINENT_CFG,defaults);assert.deepEqual(a,oracle.continentCellAt(coord,seed));stats.aba++;
  }
  const fixed=core.createNativeContinentReader({...defaults,oceanFrac:1,bridgeChance:0});
  for(const x of [-1,0])for(const y of [-1,0])assert.equal(fixed.cellKind(x,y,713),'land');
  assert.equal(fixed.continentAt(CLIMATE_CFG.origin,713).kind,'ocean','moving climate origin must not relocate native land pin');
 }finally{Object.assign(liveConfig,originalLive);setClimateOrigin(originalClimateOrigin);}
 assert.ok(different>0);
 const sample={x:2200,y:-4800},one=A.continentCellAt(sample,713),two=A.continentCellAt(sample,713);assert.notEqual(one,two);assert.deepEqual(one,two);one.gx=12345;assert.deepEqual(A.continentCellAt(sample,713),two);
 const siteA=A.cellSite(7,-8,713),siteB=A.cellSite(7,-8,713);assert.notEqual(siteA,siteB);siteA.x=0;assert.notEqual(A.cellSite(7,-8,713).x,0);

 // Classic wrappers still read their actual live config on EVERY call and
 // deliberately do not turn the classic API into an immutable snapshot.
 for(const config of [configs[0],configs[6],configs[0]]){Object.assign(wrapper.CONTINENT_CFG,config);Object.assign(oracle.CONTINENT_CFG,config);
  for(const seed of [0,713,-1]){
   assert.equal(wrapper.continentSeedFrom(seed),oracle.continentSeedFrom(seed));stats.wrapperPairs++;
   for(const gx of [-17,-1,0,17])for(const gy of [-17,-1,0,17]){
    assert.equal(wrapper.cellKind(gx,gy,seed),oracle.cellKind(gx,gy,seed));
    assert.deepEqual(wrapper.cellSite(gx,gy,seed),oracle.cellSite(gx,gy,seed));stats.wrapperPairs+=2;
   }
   for(const coord of coordCases(config.cellSpan)){
    assert.deepEqual(wrapper.continentCellAt(coord,seed),oracle.continentCellAt(coord,seed));
    assert.deepEqual(wrapper.continentAt(coord,seed),oracle.continentAt(coord,seed));
    assert.deepEqual(wrapper.landfallFrom(coord,.73,seed,6),oracle.landfallFrom(coord,.73,seed,6));stats.wrapperPairs+=3;
   }
   assert.deepEqual(wrapper.landfallFrom({x:0,y:0},.73,seed),oracle.landfallFrom({x:0,y:0},.73,seed));stats.wrapperPairs++;
  }
 }
 const report={pass:true,source:sourceMeta,stats,kinds,bridgeWitness,callTapeDigest:sha(callDigests.join('\n')),homePin:'Fixed raw cells (-1..0,-1..0), independent of shifted climate origin',isolation:'Complete config snapshots; A/B/A; live config mutation; no memo; fresh mutable result objects',scope:'Exact native number-domain extraction only. Native 32-bit cell/seed coercion is retained, not a BigInt address mapping or unbounded spatial uniqueness claim.'};
 console.log(JSON.stringify(report,null,2));
 console.log('PASS continentcore: exact pinned native results, read/call tapes, classic live wrappers and immutable-reader isolation');
}finally{Math.random=originalRandom;Object.assign(liveConfig,originalConfig);setClimateOrigin(initialClimateOrigin);}
