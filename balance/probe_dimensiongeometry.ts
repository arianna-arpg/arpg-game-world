import { BIOME_FIELD_CFG, fieldBiomePick, resetFieldPickMemo } from '../src/world/biomes';
import { dimensionIds, dimensionDef, dimensionBiomeAt, dimensionBiomeDepth } from '../src/world/dimensions';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';
import { nativeDimensionSite, nativeDimensionDepth } from '../src/world/dimensionGeometry';
const source="// Pinned native source from 67d9c290684f06ba2bda8a7694def1e9e4448381\nfunction hashCell(a: number, b: number, seed: number): number {\n  let h = (seed ^ 0x9e3779b9) >>> 0;\n  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;\n  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;\n  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;\n  return h >>> 0;\n}\n\n/** A dimension's biome at a coordinate — the same jittered-Voronoi idiom as\n *  the surface heat map, drawn over the DIMENSION'S palette and picked through\n *  the SHARED weight × climate-affinity machinery (fieldBiomePick), under the\n *  dimension's own axis overrides. Pure/deterministic. */\nexport function dimensionBiomeAt(dimId: string, coord: MapCoord, seed: number): string {\n  const def = dimensionDef(dimId);\n  const table = def.biomes;\n  if (!table?.length) return 'grove';\n  const span = BIOME_FIELD_CFG.cellSpan, jit = BIOME_FIELD_CFG.jitter;\n  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);\n  let bestGx = cx, bestGy = cy, bestPx = coord.x, bestPy = coord.y, bd = Infinity;\n  for (let dx = -1; dx <= 1; dx++) {\n    for (let dy = -1; dy <= 1; dy++) {\n      const gx = cx + dx, gy = cy + dy;\n      const h = hashCell(gx, gy, seed);\n      const px = (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span;\n      const py = (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span;\n      const d = (px - coord.x) ** 2 + (py - coord.y) ** 2;\n      if (d < bd) { bd = d; bestGx = gx; bestGy = gy; bestPx = px; bestPy = py; }\n    }\n  }\n  return fieldBiomePick(table, bestGx, bestGy, { x: bestPx, y: bestPy }, seed, dimId);\n}\n\n/** How DEEP into its region a coordinate sits on a DIMENSION's own field —\n *  1 at the jittered Voronoi seat, →0 at the boundary: the surface\n *  biomeDepth mirrored over dimensionBiomeAt's exact cell math, so a realm\n *  COUNTRY can stage its faces (the High Bastion rim → Seraphal heart)\n *  through the same depthAffinity envelopes the desert and the marine\n *  shelves read below. Pure + deterministic. */\nexport function dimensionBiomeDepth(dimId: string, coord: MapCoord, seed: number): number {\n  const def = dimensionDef(dimId);\n  if (!def.biomes?.length) return 0;\n  const span = BIOME_FIELD_CFG.cellSpan, jit = BIOME_FIELD_CFG.jitter;\n  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);\n  let bd = Infinity;\n  for (let dx = -1; dx <= 1; dx++) {\n    for (let dy = -1; dy <= 1; dy++) {\n      const gx = cx + dx, gy = cy + dy;\n      const h = hashCell(gx, gy, seed);\n      const px = (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span;\n      const py = (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span;\n      const d = (px - coord.x) ** 2 + (py - coord.y) ** 2;\n      if (d < bd) bd = d;\n    }\n  }\n  return Math.max(0, Math.min(1, 1 - Math.sqrt(bd) / (span * 0.5)));\n}\n";
assert.equal(createHash('sha256').update(source).digest('hex'),'79828aa2a3570f7947432196e7fc10148d8a5b06dd40f762995a1fd4ae0fb12e');
const start=source.indexOf('function hashCell(');assert.ok(start>0);
const compiled=transpileModule(source.slice(start).replaceAll('export function','function'),{compilerOptions:{module:ModuleKind.CommonJS,target:ScriptTarget.ES2022}}).outputText;
let pairs=0;
for(const cellSpan of [1,260,1000])for(const jitter of [0,.42,1])for(const seed of [0,1,713,0xffffffff])for(const x of [-1000001,-520,-260,-.00001,0,.00001,260,520,1000001,2**32*cellSpan])for(const y of [-7777,-130,0,130,99999]) {
 const policy={cellSpan,jitter},coord={x,y},calls:unknown[][]=[];
 const native=new Function('BIOME_FIELD_CFG','dimensionDef','fieldBiomePick',compiled+';return {at:dimensionBiomeAt,depth:dimensionBiomeDepth};')(policy,()=>({biomes:[{biome:'x'}]}),(...args:unknown[])=>{calls.push(args);return 'x';});
 native.at('test',coord,seed);const depth=native.depth('test',coord,seed),a=nativeDimensionSite(coord,seed,policy);
 assert.equal(nativeDimensionDepth(coord,seed,policy),depth);assert.deepEqual(calls,[[[{biome:'x'}],a.gx,a.gy,a.site,seed,'test']]);pairs++;
}
console.log('PASS',pairs,'exact realm sites, depth and field-selection input tuples');
for(const kind of ['at','depth'] as const) {
 const make=(tape:string[])=>{const p={cellSpan:260,jitter:.42},coord={x:57,y:-133};const proxy=<T extends object>(v:T,name:string)=>new Proxy(v,{get(o,k){tape.push(name+'.'+String(k));return Reflect.get(o,k);}});return {policy:proxy(p,'policy'),coord:proxy(coord,'coord')};};
 const a:string[]=[],b:string[]=[],pa=make(a),pb=make(b);
 const native=new Function('BIOME_FIELD_CFG','dimensionDef','fieldBiomePick',compiled+';return {at:dimensionBiomeAt,depth:dimensionBiomeDepth};')(pa.policy,()=>({biomes:[{biome:'x'}]}),()=> 'x');
 native[kind]('test',pa.coord,713);
 if(kind==='at')nativeDimensionSite(pb.coord,713,pb.policy);else nativeDimensionDepth(pb.coord,713,pb.policy);
 assert.deepEqual(b,a);
}
console.log('PASS native coordinate/policy read tapes for separate realm site and depth operations');

const nativeWrappers = new Function('BIOME_FIELD_CFG', 'dimensionDef', 'fieldBiomePick',
  compiled + ';return {at:dimensionBiomeAt,depth:dimensionBiomeDepth};')(
  BIOME_FIELD_CFG, dimensionDef, fieldBiomePick,
) as {at: typeof dimensionBiomeAt; depth: typeof dimensionBiomeDepth};
let wrappers = 0;
for (const seed of [0, 713, 991, 0xffffffff]) for (const dimension of [...dimensionIds(), 'unknown-realm']) {
  for (const coord of [{x:0,y:0}, {x:-35,y:160}, {x:-1500,y:920}, {x:730.5,y:-1880.25}, {x:2200,y:1900}]) {
    resetFieldPickMemo();
    const expected = {biome:nativeWrappers.at(dimension,coord,seed),depth:nativeWrappers.depth(dimension,coord,seed)};
    resetFieldPickMemo();
    assert.deepEqual({biome:dimensionBiomeAt(dimension,coord,seed),depth:dimensionBiomeDepth(dimension,coord,seed)},expected);
    wrappers++;
  }
}
resetFieldPickMemo();
console.log('PASS', wrappers, 'actual classic realm wrappers, registered palettes and empty/unknown realm fallbacks');
