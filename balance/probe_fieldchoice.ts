
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { NativeFieldChoice, type NativeFieldChoicePolicy } from '../src/world/fieldChoice';
import { BIOME_FIELD, BIOME_FIELD_BANDS, BIOME_FLOORS, BIOME_FIELD_CFG, BIOMES, fieldBiomePick, resetFieldPickMemo } from '../src/world/biomes';
import { CLIMATE_CFG, climateAt, climateAffinity, setClimateOrigin, setClimateAnchor } from '../src/world/climate';
import { continentAt, continentSeedFrom } from '../src/world/continents';
import { installCapitalPole } from '../src/world/civics';
import { regionCellHash } from '../src/world/regionGeometry';
import { presenceMul } from '../src/engine/presence';

// Independent field-choice oracle: verbatim 67d9 source, before extraction.
// Native climate/continent/presence callbacks remain shared unchanged leaves:
// this proves field/bands/floors/read-order parity, not frozen-climate parity.
// Source is embedded below; the probe never reads Git or ignored review files.
const ARCHIVED_COMMIT='67d9c290684f06ba2bda8a7694def1e9e4448381';
const ARCHIVED_FIELD_SOURCE="export function regionCellHash(a: number, b: number, seed: number): number {\n  let h = (seed ^ 0x9e3779b9) >>> 0;\n  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;\n  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;\n  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;\n  return h >>> 0;\n}\n\nconst hashCell = regionCellHash;\nfunction bandFor(climate: Record<string, number>): BiomeFieldBand | null {\n  for (const b of BIOME_FIELD_BANDS) {\n    const v = climate[b.when.axis];\n    if (v !== undefined && presenceMul(b.when.env, v) >= 0.5) return b;\n  }\n  return null;\n}\n\n/** Resolve a band against the global table per its mode: 'replace' hands the\n *  band's own table over; 'tilt' multiplies matching global weights by the\n *  band rows' weights (absent biomes append as new candidates). */\nfunction bandCandidates(band: BiomeFieldBand, table: readonly BiomeSeedDef[]): readonly BiomeSeedDef[] {\n  if ((band.mode ?? 'replace') === 'replace') return band.table;\n  const mul = new Map(band.table.map(r => [r.biome, r.weight ?? 1]));\n  const out: BiomeSeedDef[] = table.map(r => {\n    const m = mul.get(r.biome);\n    if (m === undefined) return r;\n    mul.delete(r.biome);\n    return { biome: r.biome, weight: (r.weight ?? 1) * m };\n  });\n  for (const [biome, weight] of mul) out.push({ biome, weight });\n  return out;\n}\n\nconst pickMemo = new Map<string, string>();\nconst PICK_MEMO_CAP = 16384;\n\n// Existence-floor seats per fieldSeed (lazy; flushed with the pick memo — a\n// seat bakes the anchor geometry of its moment exactly like the picks do).\nconst floorSeatMemo = new Map<number, { gx: number; gy: number; biome: string }[]>();\nconst FLOOR_MEMO_CAP = 64;\n\n/** Drop every memoized cell pick. Called when a NEW world constructs (a fresh\n *  BiomeField) — the seed in the key already isolates worlds, but a hard reset\n *  also kills any stale entries a dev-session module swap (HMR duality) or a\n *  climate-origin change could otherwise carry across runs. */\nexport function resetFieldPickMemo(): void { pickMemo.clear(); floorSeatMemo.clear(); }\n\n// A pick bakes the climate GEOMETRY of its moment (bands read the origin +\n// anchors through climateAt) — so any re-anchor (the capital pole install,\n// an origin move, probes cycling seeds) must flush it, or a re-anchored\n// world serves picks computed under the old geometry.\nregisterClimateInvalidation(resetFieldPickMemo);\n\n/** The ORDINARY roll — the pick machinery minus memo and floor consult, ONE\n *  source shared by fieldBiomePick and the existence-floor scan (no drift by\n *  construction). Never writes the pick memo: the scan's reads must not bake\n *  pre-floor values under the keys real sampling will ask for. */\nfunction ordinaryFieldPick(\n  table: readonly BiomeSeedDef[], gx: number, gy: number, site: MapCoord,\n  fieldSeed: number, dimension: string,\n): string {\n  const climate = climateAt(site, fieldSeed, dimension);\n  // FIELD BANDS (surface only): a claimed climate stratum swaps in (or\n  // tilts) the candidate table — the capital's structure. Biome affinities\n  // still multiply inside the band; the all-zero fallback below floors it.\n  const band = dimension === 'surface' ? bandFor(climate) : null;\n  const src = band ? bandCandidates(band, table) : table;\n  const weights: number[] = new Array(src.length);\n  let total = 0;\n  for (let i = 0; i < src.length; i++) {\n    const s = src[i];\n    const w = (s.weight ?? 1) * climateAffinity(BIOMES[s.biome]?.climate, climate);\n    weights[i] = w; total += w;\n  }\n  const h = hashCell(gx, gy, (fieldSeed ^ 0x5bd1e995) >>> 0);\n  let picked = src[src.length - 1].biome;\n  if (total <= 0) {\n    let raw = 0;\n    for (const s of src) raw += s.weight ?? 1;\n    let r = (h / 0x100000000) * raw;\n    for (const s of src) { r -= s.weight ?? 1; if (r <= 0) { picked = s.biome; break; } }\n  } else {\n    let r = (h / 0x100000000) * total;\n    for (let i = 0; i < src.length; i++) {\n      r -= weights[i];\n      if (r <= 0) { picked = src[i].biome; break; }\n    }\n  }\n  return picked;\n}\n\n/** The existence-floor seats for one world — pure f(fieldSeed, anchors),\n *  computed whole on first consult (the foreordained tenet). A floor whose\n *  viable ground already grows its biome seats NOTHING — the satisfied world\n *  is byte-identical because every cell falls through to the ordinary roll. */\nfunction computeFloorSeats(fieldSeed: number): { gx: number; gy: number; biome: string }[] {\n  const seats: { gx: number; gy: number; biome: string }[] = [];\n  if (floorSeatMemo.size >= FLOOR_MEMO_CAP) floorSeatMemo.clear();\n  floorSeatMemo.set(fieldSeed, seats); // set-first: reentrancy-proof by construction\n  const span = BIOME_FIELD_CFG.cellSpan, jit = BIOME_FIELD_CFG.jitter;\n  const contSeed = continentSeedFrom(fieldSeed);\n  for (const floor of BIOME_FLOORS) {\n    if (!BIOMES[floor.biome]) continue; // authoring hole — registerBiomeFloor warned, the floor stands down\n    // The candidate cells: every lattice cell whose jittered SITE stands on\n    // land inside any declared disc (range padded one cell — jitter can pull\n    // an outside-centred cell's site in).\n    const cells = new Map<string, { gx: number; gy: number; site: MapCoord }>();\n    for (const disc of floor.discs) {\n      const at = disc.anchor === 'origin' ? CLIMATE_CFG.origin : CLIMATE_CFG.anchors[disc.anchor];\n      if (!at) continue; // uninstalled anchor — this disc does not exist yet\n      const g0x = Math.floor((at.x - disc.r) / span) - 1, g1x = Math.floor((at.x + disc.r) / span) + 1;\n      const g0y = Math.floor((at.y - disc.r) / span) - 1, g1y = Math.floor((at.y + disc.r) / span) + 1;\n      for (let gx = g0x; gx <= g1x; gx++) {\n        for (let gy = g0y; gy <= g1y; gy++) {\n          const h = hashCell(gx, gy, fieldSeed);\n          const px = (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span;\n          const py = (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span;\n          if (Math.hypot(px - at.x, py - at.y) > disc.r) continue;\n          if (continentAt({ x: px, y: py }, contSeed).kind !== 'land') continue; // the sea grows no belt\n          cells.set(`${gx}|${gy}`, { gx, gy, site: { x: px, y: py } });\n        }\n      }\n    }\n    if (!cells.size) continue;\n    // Satisfied = some candidate cell already picks the biome ordinarily —\n    // the floor then claims nothing (the fix is not reached).\n    let satisfied = false;\n    for (const c of cells.values()) {\n      if (ordinaryFieldPick(BIOME_FIELD, c.gx, c.gy, c.site, fieldSeed, 'surface') === floor.biome) { satisfied = true; break; }\n    }\n    if (satisfied) continue;\n    // The seat: the most-hospitable candidate — affinity, then the wetter\n    // site, then the cell hash. All pure; host/clients/reloads agree.\n    let best: { gx: number; gy: number } | null = null;\n    let bestAff = -1, bestMoist = -1, bestH = -1;\n    for (const c of cells.values()) {\n      const cl = climateAt(c.site, fieldSeed);\n      const aff = climateAffinity(BIOMES[floor.biome]?.climate, cl);\n      const moist = cl.moisture ?? 0;\n      const hh = hashCell(c.gx, c.gy, (fieldSeed ^ 0x600dfa2) >>> 0);\n      if (aff > bestAff || (aff === bestAff && (moist > bestMoist || (moist === bestMoist && hh > bestH)))) {\n        best = c; bestAff = aff; bestMoist = moist; bestH = hh;\n      }\n    }\n    if (best) seats.push({ gx: best.gx, gy: best.gy, biome: floor.biome });\n  }\n  return seats;\n}\n\n/** The floor's claim on a surface cell, or null (the overwhelmingly common\n *  read: no floors registered, a satisfied world, or a foreign cell). */\nfunction floorClaimAt(gx: number, gy: number, fieldSeed: number): string | null {\n  if (!BIOME_FLOORS.length) return null;\n  const seats = floorSeatMemo.get(fieldSeed) ?? computeFloorSeats(fieldSeed);\n  for (const s of seats) if (s.gx === gx && s.gy === gy) return s.biome;\n  return null;\n}\n\n/** Weighted biome for a Voronoi cell: seed weight × CLIMATE AFFINITY sampled\n *  at the cell's SITE (one climate reading per blob — regions stay coherent).\n *  THE shared pick for the surface field and every dimension palette. A cell\n *  whose climate zeroes every candidate falls back to the raw weights so the\n *  world never starves (validateBiomeClimate flags authoring instead); a\n *  world that would zero a FLOORED biome outright seats it first (surface\n *  only — BIOME_FLOORS above). */\nexport function fieldBiomePick(\n  table: readonly BiomeSeedDef[], gx: number, gy: number, site: MapCoord,\n  fieldSeed: number, dimension = 'surface',\n): string {\n  const memoKey = `${dimension}|${fieldSeed}|${gx}|${gy}`;\n  const hit = pickMemo.get(memoKey);\n  if (hit !== undefined) return hit;\n  const picked = (dimension === 'surface' ? floorClaimAt(gx, gy, fieldSeed) : null)\n    ?? ordinaryFieldPick(table, gx, gy, site, fieldSeed, dimension);\n  if (pickMemo.size >= PICK_MEMO_CAP) pickMemo.clear();\n  pickMemo.set(memoKey, picked);\n  return picked;\n}\n";
const ARCHIVED_FIELD_HASH='cd422f2d8b2e6cc756ce942eae79808dc8a30828bf01ba0953b69d53ae594121';

type Any = any;
type Event = (string | number | boolean | null)[];
interface Core {
  pick(table: Any[], gx: number, gy: number, site: {x:number;y:number}, seed: number, dimension?: string): string;
  seats(seed: number): readonly {gx:number;gy:number;biome:string}[];
  reset(): void;
}
const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v)) as T;
const digest=(v:unknown)=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
assert.equal(digest(ARCHIVED_FIELD_SOURCE),ARCHIVED_FIELD_HASH);
const archivedJs=ts.transpileModule(ARCHIVED_FIELD_SOURCE.replaceAll('export function ','function '),
  {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const archivedFactory=new Function('BIOME_FIELD','BIOME_FIELD_BANDS','BIOME_FLOORS','BIOMES','BIOME_FIELD_CFG','CLIMATE_CFG',
  'climateAt','climateAffinity','continentAt','continentSeedFrom','presenceMul','registerClimateInvalidation',
  archivedJs+'\nreturn {pick:fieldBiomePick,reset:resetFieldPickMemo,seats:seed=>floorSeatMemo.get(seed)??computeFloorSeats(seed)};');

function observe<T extends object>(input:T,label:string,events:Event[]):T{
  const proxies=new WeakMap<object,object>();
  const visit=(value:Any,at:string):Any=>{
    if(value===null||typeof value!=='object')return value;
    const hit=proxies.get(value);if(hit)return hit;
    const proxy=new Proxy(value,{get(target,key,receiver){
      if(typeof key==='string')events.push(['read',at+'.'+key]);
      const out=Reflect.get(target,key,receiver);
      return visit(out,at+'.'+String(key));
    }});
    proxies.set(value,proxy);return proxy;
  };
  return visit(input,label);
}
function build(fixture:Any={},old=false){
  const events:Event[]=[];
  const raw={
    table:copy(fixture.table??[{biome:'base',weight:1}]),
    bands:copy(fixture.bands??[]),floors:copy(fixture.floors??[]),
    biomes:copy(fixture.biomes??{base:{},floor:{}}),
    geometry:copy(fixture.geometry??{cellSpan:10,jitter:0}),
    climate:copy(fixture.anchors??{origin:{x:0,y:0},anchors:{}}),
  };
  const read=fixture.reads===false?<T extends object>(x:T,_label:string)=>x:<T extends object>(x:T,label:string)=>observe(x,label,events);
  let onContinentSeed:((seed:number)=>void)|undefined;
  const policy:NativeFieldChoicePolicy={
    table:read(raw.table,'table'),bands:read(raw.bands,'bands'),floors:read(raw.floors,'floors'),
    biomes:read(raw.biomes,'biomes'),geometry:read(raw.geometry,'geometry'),climate:read(raw.climate,'climate'),
    climateAt:(at,seed,dimension)=>{
      events.push(['climateAt',at.x,at.y,seed,dimension??null]);
      return (fixture.climateAt??(()=>({temperature:.5,moisture:.5})))(at,seed,dimension);
    },
    climateAffinity:(spec,climate)=>{
      const result=(fixture.climateAffinity??climateAffinity)(spec,climate);
      events.push(['climateAffinity',result]);return result;
    },
    continentAt:(at,seed)=>{
      const result=(fixture.continentAt??(()=>({kind:'land',landmass:'test'})))(at,seed);
      events.push(['continentAt',at.x,at.y,seed,result.kind]);return result;
    },
    continentSeedFrom:seed=>{
      events.push(['continentSeedFrom',seed]);onContinentSeed?.(seed);
      return continentSeedFrom(seed);
    },
  };
  const callbacks:(()=>void)[]=[];
  const core:Core=old
    ?archivedFactory(policy.table,policy.bands,policy.floors,policy.biomes,policy.geometry,policy.climate,
      policy.climateAt,policy.climateAffinity,policy.continentAt,policy.continentSeedFrom,presenceMul,(cb:()=>void)=>callbacks.push(cb))
    :new NativeFieldChoice(policy) as Core;
  return {core,policy,raw,events,callbacks,setSeedHook:(fn:(seed:number)=>void)=>{onContinentSeed=fn;}};
}
function paired(fixture:Any,run:(c:ReturnType<typeof build>)=>unknown){
  const old=build(fixture,true),current=build(fixture,false);
  const a=run(old),b=run(current);
  assert.deepEqual(b,a,'result differs from archived native');
  assert.deepEqual(current.events,old.events,'source-read/callback order differs from archived native');
  return {result:a,events:old.events,traceHash:digest(old.events)};
}
let groups=0,pairedRuns=0;
const evidence:{name:string;traceHash?:string}[]=[];
function group(name:string,run:()=>void){run();groups++;evidence.push({name});console.log('PASS '+name);}
function pair(fixture:Any,run:(c:ReturnType<typeof build>)=>unknown){pairedRuns++;return paired(fixture,run);}
const pick=(c:ReturnType<typeof build>,seed=713,dimension='surface',gx=0,gy=0)=>c.core.pick(c.policy.table as Any[],gx,gy,{x:gx*10+5,y:gy*10+5},seed,dimension);
const floor=(biome='floor',anchor='origin',r=8)=>({biome,discs:[{anchor,r}]});

group('native bands: capital/home/desert priority and missing axes',()=>{
  const cases:[Record<string,number>,string|null][]=[
    [{civic:0,hearth:0,moisture:.4},'capital_seat'],[{civic:.5,hearth:0,moisture:.4},'capital_core'],
    [{civic:.7,hearth:0,moisture:.4},'capital_ring'],[{civic:1,hearth:0,moisture:.4},'home_shire'],
    [{civic:1,hearth:1,moisture:.4},'desert_verge'],[{civic:1,hearth:1,moisture:1},null],[{},null],
  ];
  for(const [cl,expectedBand]of cases){
    const expected=BIOME_FIELD_BANDS.find(b=>cl[b.when.axis]!==undefined&&presenceMul(b.when.env,cl[b.when.axis])>=.5)?.id??null;
    assert.equal(expected,expectedBand);
    pair({table:BIOME_FIELD,bands:BIOME_FIELD_BANDS,biomes:BIOMES,climateAt:()=>cl},c=>
      [0,1,713,0xffffffff].map(seed=>pick(c,seed)));
  }
});
group('exact .5 gate, replace rows, duplicate tilt and append order',()=>{
  const table=[{biome:'a',weight:2},{biome:'a',weight:3},{biome:'b',weight:4}];
  const biomes={a:{},b:{},c:{},d:{},z:{}};
  const band={id:'half',when:{axis:'x',env:{to:.25,fadeOut:.5}},table:[{biome:'z'}]};
  for(const [value,answer]of [[.5,'z'],[.5000000000000001,'a']] as const){
    const out=pair({table:[{biome:'a'}],biomes,bands:[band],climateAt:()=>({x:value})},c=>pick(c));
    assert.equal(out.result,answer);
  }
  for(const mode of ['replace','tilt']){
    const bands=[{...band,when:{axis:'x',env:{}},mode,table:[{biome:'a',weight:2},{biome:'c',weight:3},{biome:'a',weight:5},{biome:'d'}]}];
    pair({table,biomes,bands,climateAt:()=>({x:1})},c=>
      Array.from({length:24},(_,seed)=>pick(c,seed)));
  }
});
group('all-zero affinity falls back to original raw weights; absent biome affinity stays neutral',()=>{
  const table=[{biome:'a',weight:2},{biome:'b',weight:3},{biome:'a',weight:1}];
  const biomes={a:{climate:{temperature:{from:.8}}},b:{climate:{temperature:{from:.8}}}};
  const out=pair({table,biomes},c=>[0,1,713,0xffffffff].map(seed=>pick(c,seed,'realm',2,-3)));
  assert.deepEqual(out.result,['b','a','a','b']);
  pair({table:[{biome:'absent',weight:1}],biomes:{}},c=>pick(c));
});
group('ordinary read tape and original caller dimension/site',()=>{
  const out=pair({table:[{biome:'a',weight:2},{biome:'b',weight:3}],biomes:{a:{climate:{temperature:{from:.2}}},b:{climate:{moisture:{to:.9}}}}},
    c=>c.core.pick(c.policy.table as Any[],3,-2,{x:35,y:-15},713,'realm'));
  assert.deepEqual(out.events.filter(e=>e[0]==='climateAt'),[['climateAt',35,-15,713,'realm']]);
  evidence.push({name:'ordinary exact read tape',traceHash:out.traceHash});
});
group('floors missing biome/anchor, empty candidate disc, ocean and bridge refusal',()=>{
  for(const fixture of [
    {floors:[floor('absent')],biomes:{base:{}}},
    {floors:[floor('floor','missing')]},
    {floors:[floor('floor','origin',0)]},
    {floors:[floor()],continentAt:()=>({kind:'ocean',landmass:null})},
    {floors:[floor()],continentAt:()=>({kind:'bridge',landmass:'bridge'})},
  ]){
    const out=pair(fixture,c=>c.core.seats(713));
    assert.deepEqual(out.result,[]);
    assert.equal(out.events.filter(e=>e[0]==='climateAt').length,0);
  }
});
group('satisfied floor leaves all picks alone and short-circuits ordinary scan',()=>{
  const out=pair({table:[{biome:'floor',weight:1}],floors:[floor()]},c=>c.core.seats(713));
  assert.deepEqual(out.result,[]);
  assert.equal(out.events.filter(e=>e[0]==='continentAt').length,4);
  assert.equal(out.events.filter(e=>e[0]==='climateAt').length,1);
  evidence.push({name:'satisfied exact read tape',traceHash:out.traceHash});
});
group('unsatisfied floor: affinity, moisture, hash ties and foreign caller table',()=>{
  const fixture={floors:[floor()],biomes:{base:{},floor:{climate:{temperature:{stops:[[0,0],[1,1]]}}}},
    climateAt:(at:Any)=>({temperature:at.x<0&&at.y<0?.2:.8,moisture:at.x<0?(at.y<0?1:.3):.6})};
  const out=pair(fixture,c=>{
    const seats=c.core.seats(713);assert.equal(seats.length,1);
    const seat=seats[0];assert.equal(seat.gx,0);
    const at={x:999,y:999};
    return {seats,pick:c.core.pick([{biome:'base'}],seat.gx,seat.gy,at,713)};
  });
  assert.deepEqual(out.result,{seats:[{gx:0,gy:0,biome:'floor'}],pick:'floor'});
  assert.equal(out.events.filter(e=>e[0]==='climateAt').length,8);
  evidence.push({name:'unsatisfied exact read tape',traceHash:out.traceHash});
});
group('disc union/order, no pick-memo pollution, overlapping floor first claim, realm bypass',()=>{
  const fixture={floors:[{biome:'first',discs:[{anchor:'origin',r:8},{anchor:'capital',r:8}]},floor('second')],
    biomes:{base:{},first:{},second:{}},anchors:{origin:{x:0,y:0},anchors:{capital:{x:0,y:0}}}};
  const out=pair(fixture,c=>{
    const seats=c.core.seats(713);assert.equal(seats.length,2);
    assert.deepEqual([seats[0].gx,seats[0].gy],[seats[1].gx,seats[1].gy]);
    const s=seats[0],at={x:s.gx*10+5,y:s.gy*10+5};
    return [c.core.pick(c.policy.table as Any[],s.gx,s.gy,at,713),c.core.pick(c.policy.table as Any[],s.gx,s.gy,at,713,'realm')];
  });
  assert.deepEqual(out.result,['first','base']);
});
group('set-first floor cache permits reentrant same-seed consult',()=>{
  const out=pair({floors:[floor()]},c=>{
    let once=false;const nested:unknown[]=[];
    c.setSeedHook(seed=>{if(!once){once=true;nested.push(copy(c.core.seats(seed)));}});
    return {seats:c.core.seats(713),nested};
  });
  assert.deepEqual((out.result as Any).nested,[[]]);
});
group('memo retains classic table/site collision and dimension/seed separation; reset clears both',()=>{
  pair({biomes:{a:{},b:{}}},c=>{
    const a=[{biome:'a'}],b=[{biome:'b'}],at={x:5,y:5};
    const rows=[
      c.core.pick(a,0,0,at,713,'realm'),c.core.pick(b,0,0,{x:999,y:999},713,'realm'),
      c.core.pick(b,0,0,at,713,'other'),c.core.pick(b,0,0,at,714,'realm')];
    c.core.reset();rows.push(c.core.pick(b,0,0,at,713,'realm'));
    assert.deepEqual(rows,['a','a','b','b','b']);return rows;
  });
  pair({floors:[floor()]},c=>{
    const original=copy(c.core.seats(713));c.raw.floors.length=0;
    assert.deepEqual(c.core.seats(713),original);
    c.core.reset();assert.deepEqual(c.core.seats(713),[]);return original;
  });
});
group('pick and floor cache caps retain native wholesale-eviction boundary',()=>{
  pair({reads:false},c=>{
    for(let i=0;i<16384;i++)pick(c,713,'realm',i,0);
    const before=c.events.length;pick(c,713,'realm',0,0);assert.equal(c.events.length,before);
    pick(c,713,'realm',16384,0);
    const after=c.events.length;pick(c,713,'realm',0,0);assert.ok(c.events.length>after);
    for(let i=0;i<64;i++)c.core.seats(i);
    const warm=c.events.length;c.core.seats(0);assert.equal(c.events.length,warm);
    c.core.seats(64);const evicted=c.events.length;c.core.seats(0);assert.ok(c.events.length>evicted);
    return 'boundary retained';
  });
});
group('independent A/B/A sources isolate equal seed/cell and retained floor seats',()=>{
  const a=build({floors:[floor('alpha')],biomes:{base:{},alpha:{}}});
  const b=build({floors:[floor('beta')],biomes:{base:{},beta:{}},anchors:{origin:{x:100,y:-80},anchors:{}}});
  const aSeats=copy(a.core.seats(713)),bSeats=copy(b.core.seats(713));
  assert.equal(aSeats[0].biome,'alpha');assert.equal(bSeats[0].biome,'beta');
  assert.notDeepEqual([aSeats[0].gx,aSeats[0].gy],[bSeats[0].gx,bSeats[0].gy]);
  assert.deepEqual(a.core.seats(713),aSeats);
  const first=build({table:[{biome:'alpha'}],biomes:{alpha:{}}});
  const second=build({table:[{biome:'beta'}],biomes:{beta:{}}});
  assert.deepEqual([pick(first),pick(second),pick(first)],['alpha','beta','alpha']);
  const seats=a.core.seats(713);
  assert.ok(Object.isFrozen(seats)&&Object.isFrozen(seats[0]));
  assert.throws(()=>{(seats[0] as Any).biome='tampered';},TypeError);
  assert.deepEqual(a.core.seats(713),aSeats);
  assert.notEqual(a.core.seats(713),seats,'caller receives fresh copies');
});
group('field/floor operations never borrow global randomness',()=>{
  const original=Math.random;
  Math.random=()=>{throw Error('Field choice borrowed global randomness');};
  try{pair({floors:[floor()]},c=>[c.core.seats(713),pick(c),pick(c,714,'realm')]);}
  finally{Math.random=original;}
});

const savedClimate=copy(CLIMATE_CFG);
try{
  group('actual native field: home/capital/current bands, complete floor seats and read order',()=>{
    setClimateOrigin({x:-35,y:160});const capital=installCapitalPole(713);
    const fixture={table:BIOME_FIELD,bands:BIOME_FIELD_BANDS,floors:BIOME_FLOORS,biomes:BIOMES,
      geometry:BIOME_FIELD_CFG,anchors:CLIMATE_CFG,climateAt,continentAt};
    const out=pair(fixture,c=>{
      const seats=c.core.seats(713);
      const coords=[{x:-35,y:160},capital,{x:30,y:-8810},{x:-67.5,y:-8745},{x:9715,y:-6275},{x:6010,y:-490}];
      const results=coords.map(at=>{
        const gx=Math.floor(at.x/BIOME_FIELD_CFG.cellSpan),gy=Math.floor(at.y/BIOME_FIELD_CFG.cellSpan);
        const h=regionCellHash(gx,gy,713),span=BIOME_FIELD_CFG.cellSpan,jit=BIOME_FIELD_CFG.jitter;
        const site={x:(gx+.5+((h&0xffff)/0xffff-.5)*jit)*span,
          y:(gy+.5+((h>>>16)/0xffff-.5)*jit)*span};
        return c.core.pick(c.policy.table as Any[],gx,gy,site,713);
      });
      return {seats,results};
    });
    evidence.push({name:'actual native exact read tape',traceHash:out.traceHash});
  });
  group('classic wrapper preserves memo collision plus origin/anchor invalidation',()=>{
    const a=[{biome:'grove'}],b=[{biome:'desert'}],at={x:35,y:-15};
    resetFieldPickMemo();
    assert.equal(fieldBiomePick(a,3,-2,at,713,'review'),'grove');
    assert.equal(fieldBiomePick(b,3,-2,{x:999,y:999},713,'review'),'grove');
    setClimateOrigin({x:-35,y:160});
    assert.equal(fieldBiomePick(b,3,-2,at,713,'review'),'desert');
    setClimateAnchor('capital',null);
    assert.equal(fieldBiomePick(a,3,-2,at,713,'review'),'grove');
  });
}finally{
  for(const name of Object.keys(CLIMATE_CFG.anchors))delete CLIMATE_CFG.anchors[name];
  setClimateOrigin(savedClimate.origin);
  for(const [name,at]of Object.entries(savedClimate.anchors))setClimateAnchor(name,at);
  resetFieldPickMemo();
}
console.log(JSON.stringify({status:'PASS',groups,pairedRuns,archivedCommit:ARCHIVED_COMMIT,archiveHash:ARCHIVED_FIELD_HASH,evidence}));
