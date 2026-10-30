import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';
import { Rng } from '../src/core/rng';
import { TILESETS, TILESETS_BY_BIOME, REALM_TILESETS_BY_BIOME, pickTilesetForBiome } from '../src/data/tilesets';
import { climateAt, climateAffinity } from '../src/world/climate';
import { presenceMul } from '../src/engine/presence';
import { nativeTilesetChoice, type NativeTilesetChoicePolicy } from '../src/world/tilesetChoice';
const source="// Pinned native source from 67d9c290684f06ba2bda8a7694def1e9e4448381\nexport function pickTilesetForBiome(\n  biome: string, rng: Rng, depth?: number, realm?: string,\n  climate?: Record<string, number>,\n): string | undefined {\n  // A realm caller (spec.dimension mints, the gate mint) widens the pool with\n  // its OWN tilesets (TilesetDef.realm) — the surface pool alone starved any\n  // biome whose faces are all realm-locked (the wasteland-Firmament defect).\n  const shared = TILESETS_BY_BIOME[biome];\n  const owned = realm ? REALM_TILESETS_BY_BIOME[realm]?.[biome] : undefined;\n  const c = owned?.length ? (shared?.length ? [...shared, ...owned] : owned) : shared;\n  if (!c || !c.length) return undefined;\n  const staged = depth !== undefined && c.some(id => TILESETS[id].depthAffinity);\n  const geoed = !!climate && c.some(id => TILESETS[id].geoAffinity);\n  if (!staged && !geoed) return rng.pick(c);\n  const weights = c.map(id => {\n    const t = TILESETS[id];\n    const dAff = t.depthAffinity && depth !== undefined ? presenceMul(t.depthAffinity, depth) : 1;\n    const gAff = t.geoAffinity && climate ? climateAffinity(t.geoAffinity, climate) : 1;\n    return dAff * gAff;\n  });\n  let total = 0;\n  for (const w of weights) total += w;\n  // Degenerate staging (every envelope zero here) never starves the biome.\n  if (total <= 0) return rng.pick(c);\n  let roll = rng.range(0, total);\n  for (let i = 0; i < c.length; i++) {\n    roll -= weights[i];\n    if (roll <= 0) return c[i];\n  }\n  return c[c.length - 1];\n}\n\n";
assert.equal(createHash('sha256').update(source).digest('hex'),'70eb5ebb18622022d3bf656606c5d4bbc34da6a18f977eed926864ba98306941');
const start = source.indexOf('export function pickTilesetForBiome('), end = source.length;
assert.ok(start>0&&end>start);
const compiled = transpileModule(source.slice(start,end).replace('export function','function'), {compilerOptions:{module:ModuleKind.CommonJS,target:ScriptTarget.ES2022}}).outputText;
const makeOracle = (p:NativeTilesetChoicePolicy) => new Function('TILESETS_BY_BIOME','REALM_TILESETS_BY_BIOME','TILESETS','climateAffinity','presenceMul',compiled+';return pickTilesetForBiome;')(p.shared,p.realms,p.definitions,p.climateAffinity,presenceMul) as typeof pickTilesetForBiome;
const live:NativeTilesetChoicePolicy={shared:TILESETS_BY_BIOME,realms:REALM_TILESETS_BY_BIOME,definitions:TILESETS,climateAffinity};
let pairs=0;
for(const seed of [0,1,713,991,0xffffffff])for(const biome of [...Object.keys(TILESETS_BY_BIOME),'missing'])for(const realm of [undefined,...Object.keys(REALM_TILESETS_BY_BIOME)])for(const depth of [undefined,-.1,0,.25,.5,.75,1,1.1]) {
 const climate=climateAt({x:seed%2000-1000,y:depth===undefined?0:depth*1000},713,realm),a=new Rng(seed),b=new Rng(seed),c=new Rng(seed);
 const expected=makeOracle(live)(biome,a,depth,realm,climate);
 assert.equal(nativeTilesetChoice(live,biome,b,depth,realm,climate),expected);
 assert.equal(pickTilesetForBiome(biome,c,depth,realm,climate),expected);
 const after=a.next();assert.equal(b.next(),after);assert.equal(c.next(),after);
 pairs++;
}
console.log('PASS',pairs,'native ordered face choices and exact RNG positions');
let tapes=0;
for(const shared of [[],['plain'],['depth','geo','plain'],['depth','depth','geo']])for(const owned of [[],['geo'],['plain','depth','depth']])for(const depth of [undefined,-1,0,.5,1,2])for(const climate of [undefined,{}, {temperature:0,moisture:1}, {temperature:1,moisture:0}] as (Record<string,number> | undefined)[])for(const roll of [0,.00001,.5,.99999,1]) {
 const make=(tape:string[])=>{
  const track=(value:any,path:string):any=>value&&typeof value==='object'?new Proxy(value,{get(o,k){if(typeof k==='string')tape.push(path+'.'+k);return track(Reflect.get(o,k),path+'.'+String(k));}}):value;
  const definitions={plain:{},depth:{depthAffinity:{from:.25,to:.75}},geo:{geoAffinity:{temperature:{from:.8},moisture:{to:.2}}}};
  return {shared:track({b:shared},'shared'),realms:track({r:{b:owned}},'realms'),definitions:track(definitions,'defs'),climateAffinity:(a:any,c:any)=>{tape.push('affinity');return climateAffinity(a,c);}} as NativeTilesetChoicePolicy;
 };
 const a:string[]=[],b:string[]=[],pa=make(a),pb=make(b);
 const random=(tape:string[])=>({pick<T>(rows:readonly T[]){tape.push('pick:'+JSON.stringify(rows));return rows[Math.min(rows.length-1,Math.floor(roll*rows.length))];},range(lo:number,hi:number){tape.push('range:'+lo+':'+hi);return lo+(hi-lo)*roll;}});
 const expected=makeOracle(pa)('b',random(a) as Rng,depth,'r',climate);
 assert.equal(nativeTilesetChoice(pb,'b',random(b),depth,'r',climate),expected);
 assert.deepEqual(b,a);tapes++;
}
const noRng={pick(){throw Error('empty pool consumed RNG');},range(){throw Error('empty pool consumed RNG');}};
assert.equal(nativeTilesetChoice(live,'no-such-biome',noRng),undefined);
console.log('PASS',tapes,'exact data/read/callback/RNG tapes; empty, duplicate, shared/realm, boundary and fallback pools');
