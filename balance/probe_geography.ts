import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { mulberry32 } from '../src/sim/rng';
import { regionGeometry, regionCellHash, type RegionGeometryPolicy, type RegionGeometryWinner } from '../src/world/regionGeometry';
import { makeSimWorld } from '../src/sim/arena';
import { biomeAt, biomeDepth, BIOMES, BIOME_FIELD_CFG, BIOME_FIELD, fieldBiomePick, regionWinner } from '../src/world/biomes';
import { biomeFrontierTarget, placeZoneAt, escarpmentConnection } from '../src/engine/worldgen';
import { escarpmentsInRect, escarpmentAt, escarpmentRoad, cardinal } from '../src/world/escarpments';
import { featuresAt, featuresInRect } from '../src/world/atlas';
import { generateLayout } from '../src/engine/levelgen';
import { localeProgram, compileLocale } from '../src/world/locales';
import { orientEscarpment } from '../src/engine/escarpmentGen';
import { TILESETS } from '../src/data/tilesets';
import { Rng } from '../src/core/rng';
import type { ZoneDef } from '../src/data/zones';
import type { Dir, MapCoord } from '../src/world/coords';
import { regionKind } from '../src/world/regions';
import { sanitizeWorldZones } from '../src/meta/worldstate';
import { serializeZone, applyZone } from '../src/net/snapshot';

// Verbatim native hash and solver at bc8a0e0a9211815d99dcf0ea389e451157c0684d.
// The callback still uses current complete native field selection; this oracle
// compares geometry and call order, not an archived climate/continent policy.
const ARCHIVED_REGION_SOURCE = "function hashCell(a: number, b: number, seed: number): number {\n  let h = (seed ^ 0x9e3779b9) >>> 0;\n  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;\n  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;\n  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;\n  return h >>> 0;\n}\nexport function regionWinner(coord: MapCoord, seed: number): { biome: string; gx: number; gy: number; scale: number; score: number; depth: number } {\n  const span = BIOME_FIELD_CFG.cellSpan, cfg = BIOME_FIELD_CFG.regionScale;\n  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);\n  let best = { biome: 'grove', gx: cx, gy: cy, scale: 1, score: Infinity };\n  let other = Infinity;\n  for (let dx = -cfg.search; dx <= cfg.search; dx++) for (let dy = -cfg.search; dy <= cfg.search; dy++) {\n    const gx = cx + dx, gy = cy + dy, h = hashCell(gx, gy, seed);\n    const x = (gx + 0.5 + ((h & 0xffff) / 0xffff - 0.5) * BIOME_FIELD_CFG.jitter) * span;\n    const y = (gy + 0.5 + ((h >>> 16) / 0xffff - 0.5) * BIOME_FIELD_CFG.jitter) * span;\n    const distance = (x - coord.x) ** 2 + (y - coord.y) ** 2;\n    if (distance / (cfg.max ** 2) >= other) continue;\n    const biome = fieldBiomePick(BIOME_FIELD, gx, gy, { x, y }, seed);\n    const band = BIOMES[biome]?.regionScale ?? cfg.default;\n    const scale = Math.max(cfg.min, Math.min(cfg.max, band[0] + (band[1] - band[0]) * hashCell(gx, gy, seed ^ 0x72ad1) / 0x100000000));\n    const score = distance / (scale * scale);\n    if (score < best.score) {\n      if (biome !== best.biome) other = best.score;\n      best = { biome, gx, gy, scale, score };\n    } else if (biome !== best.biome && score < other) other = score;\n  }\n  return { ...best, depth: Number.isFinite(other) ? Math.max(0, 1 - Math.sqrt(best.score / Math.max(other, 1e-9))) : 1 };\n}";
const ARCHIVED_REGION_HASH = 'ce141f15d6cadc4bf5aaf6c0d70307c066ca9207b9a7e3d79e00b420fc9d7fcc';

function geometryPolicy(overrides:Partial<RegionGeometryPolicy>={}):RegionGeometryPolicy {
  return Object.freeze<RegionGeometryPolicy>({cellSpan:BIOME_FIELD_CFG.cellSpan,jitter:BIOME_FIELD_CFG.jitter,
    regionScale:Object.freeze({...BIOME_FIELD_CFG.regionScale,default:Object.freeze([...BIOME_FIELD_CFG.regionScale.default]) as readonly [number,number]}),
    biomeAtCell:(gx,gy,site,fieldSeed)=>fieldBiomePick(BIOME_FIELD,gx,gy,site,fieldSeed),
    scaleForBiome:biome=>BIOMES[biome]?.regionScale,...overrides});
}
function verifyRegionGeometry(nativeSeed:number):void {
  assert.equal(createHash('sha256').update(ARCHIVED_REGION_SOURCE).digest('hex'),ARCHIVED_REGION_HASH);
  const js=ts.transpileModule(ARCHIVED_REGION_SOURCE.replace('export function regionWinner','function regionWinner'),
    {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  const oracleFactory=new Function('BIOME_FIELD_CFG','BIOMES','fieldBiomePick','BIOME_FIELD',js+'\nreturn {regionWinner,hashCell};');
  const archived=(policy:RegionGeometryPolicy):{regionWinner:(at:Readonly<MapCoord>,seed:number)=>RegionGeometryWinner;hashCell:typeof regionCellHash}=>oracleFactory(
    policy,new Proxy({}, {get:(_target,name)=>({regionScale:policy.scaleForBiome(String(name))})}),
    (_table:unknown,gx:number,gy:number,site:MapCoord,seed:number)=>policy.biomeAtCell(gx,gy,site,seed),[]);
  let pairs=0,pruned=0;
  const compare=(policy:RegionGeometryPolicy,at:Readonly<MapCoord>,fieldSeed:number,classic=false)=>{
    const traces:unknown[][]=[[],[]];
    const traced=(i:number):RegionGeometryPolicy=>Object.freeze<RegionGeometryPolicy>({...policy,
      biomeAtCell:(gx,gy,site,seed)=>{traces[i].push(['pick',gx,gy,site.x,site.y,seed]);return policy.biomeAtCell(gx,gy,site,seed);},
      scaleForBiome:biome=>{traces[i].push(['scale',biome]);return policy.scaleForBiome(biome);}});
    const point=Object.freeze({...at}),before=JSON.stringify(policy),oldRandom=Math.random,next=mulberry32(45119),expected=mulberry32(45119);let draws=0;
    Math.random=()=>{draws++;return next();};
    try {
      const old=archived(traced(0)).regionWinner(point,fieldSeed),current=regionGeometry(point,fieldSeed,traced(1));
      assert.deepEqual(current,old,'full original native region result at '+JSON.stringify({at,fieldSeed}));
      assert.deepEqual(traces[1],traces[0],'exact native candidate/callback order after pruning');
      if(classic)assert.deepEqual(regionWinner(point,fieldSeed),old,'classic wrapper retains complete native field selection');
      assert.equal(draws,0,'native sampling does not consume the global stream');assert.equal(Math.random(),expected(),'unchanged next global draw');
      assert.equal(JSON.stringify(policy),before,'readonly geometry policy remains untouched');
      assert.deepEqual(point,at);pairs++;
      if(traces[0].length/2<(2*policy.regionScale.search+1)**2)pruned++;
      return current;
    } finally {Math.random=oldRandom;}
  };
  const native=geometryPolicy();
  const nearEdges=[-780,-260,-1e-9,0,1e-9,260-1e-9,260,260+1e-9,780];
  const locations=[...nearEdges.flatMap(x=>nearEdges.map(y=>({x,y}))),
    ...Array.from({length:180},(_,i)=>({x:-13000+(i%18)*1527.25,y:-9000+Math.floor(i/18)*2177.75}))];
  for(const fieldSeed of [nativeSeed,0,1,-771,0xffffffff])for(const p of locations)compare(native,p,fieldSeed,true);
  assert.ok(pruned>100,'witnesses must actually exercise the original pruning path');

  // Tie order and biome boundaries are observable mechanics. With no jitter
  // and equal scales the x=0 seam is exact; a same-biome seam is not an edge.
  const flatScale=Object.freeze({default:Object.freeze([1,1]) as readonly [number,number],min:1,max:1,search:3});
  const border=geometryPolicy({jitter:0,regionScale:flatScale,biomeAtCell:gx=>gx<0?'west':'east',scaleForBiome:()=>undefined});
  const same=geometryPolicy({...border,biomeAtCell:()=> 'one-biome'});
  const tie=compare(border,{x:0,y:130},81);
  assert.deepEqual([tie.gx,tie.gy,tie.biome,tie.depth],[-1,0,'west',0],'exact tie keeps first scanned site and zero biome depth');
  const corner=compare(border,{x:0,y:0},81);assert.deepEqual([corner.gx,corner.gy],[-1,-1],'dx then dy scan wins equal-score corner');
  const left=compare(border,{x:-1e-6,y:130},81),right=compare(border,{x:1e-6,y:130},81);
  assert.equal(left.biome,'west');assert.equal(right.biome,'east');
  assert.ok(left.depth>0&&left.depth<1e-6&&right.depth>0&&right.depth<1e-6,'different-biome edge tends continuously to zero');
  for(const x of [-1e-6,0,1e-6])assert.equal(compare(same,{x,y:130},81).depth,1,'same-biome neighboring cells merge fully');
  assert.equal(compare(border,{x:-130,y:130},81).depth,1,'native site center keeps full depth');

  // Missing ranges use the native default; authored ranges retain native
  // clamps. The leaf has no memo: interleave two immutable source policies
  // over the same cell/seed and require A/B/A and reverse-order stability.
  const low=geometryPolicy({biomeAtCell:()=> 'low',scaleForBiome:()=>[-2,-2]});
  const high=geometryPolicy({biomeAtCell:()=> 'high',scaleForBiome:()=>[8,8]});
  assert.equal(compare(low,{x:271,y:-130},91).scale,native.regionScale.min);
  assert.equal(compare(high,{x:271,y:-130},91).scale,native.regionScale.max);
  const a=geometryPolicy({biomeAtCell:(gx,gy)=>((gx+gy)%3===0?'a':'b'),scaleForBiome:b=>b==='a'?[.65,.8]:[1.4,1.7]});
  const b=geometryPolicy({cellSpan:130,jitter:.2,biomeAtCell:()=> 'foreign',scaleForBiome:()=>undefined});
  const first=locations.map(p=>regionGeometry(p,173,a));
  for(const [i,p]of locations.entries()){
    compare(a,p,173);const other=compare(b,p,173);assert.equal(other.biome,'foreign');
    assert.deepEqual(regionGeometry(p,173,a),first[i],'interleaved policy does not poison the prior source');
  }
  for(let i=locations.length-1;i>=0;i--)assert.deepEqual(regionGeometry(locations[i],173,a),first[i],'query order is irrelevant');
  // Explicitly preserve the native integer-hash domain, without promising a
  // new address mapping. A future worldmass adapter must bound/map its cells.
  const oldHash=archived(native).hashCell;
  for(const x of [-4294967297,-2147483648,-1,0,1,2147483647,4294967296])for(const y of [-17,0,421])
    assert.equal(regionCellHash(x,y,0x8157),oldHash(x,y,0x8157));
  assert.equal(regionCellHash(1,9,71),regionCellHash(4294967297,9,71),'existing 32-bit hash alias is explicit, not an infinite-address claim');
  console.log('PASS '+pairs+' archived native region pairs: exact winner/scale/score/depth, pruned callback order, classic full field selection, tie/boundary/default/clamp behavior, source isolation and untouched global RNG');
}

const world = makeSimWorld('warrior', 0xa71a501), seed = world.sim.biomeField.fieldSeed;
verifyRegionGeometry(seed);
const points = Array.from({ length: 1600 }, (_, i) => ({ x: 7200 + i % 40 * 75, y: 7200 + Math.floor(i / 40) * 75 }));
assert.deepEqual(points.map(p => [biomeAt(p, seed), biomeDepth(p, seed)]), points.map(p => [biomeAt(p, seed), biomeDepth(p, seed)]));

// Compare the bounded ownership solver against a much wider candidate search.
const sampled = points.filter((_, i) => i % 31 === 0).map(p => ({ p, winner: regionWinner(p, seed) }));
// Widen only an explicit immutable input; native shipping policy stays intact.
const widePolicy=geometryPolicy({regionScale:Object.freeze({...BIOME_FIELD_CFG.regionScale,search:7})});
for (const { p, winner } of sampled) {
  const wide=regionGeometry(p,seed,widePolicy);
  assert.deepEqual([wide.gx,wide.gy,wide.biome,wide.scale,wide.score],
    [winner.gx,winner.gy,winner.biome,winner.scale,winner.score]);
}
let sharedSeams = 0;
for (const p of points) {
  let a = p, b = { x: p.x + 75, y: p.y };
  const first = regionWinner(a, seed), last = regionWinner(b, seed);
  if (first.biome !== last.biome || (first.gx === last.gx && first.gy === last.gy)) continue;
  for (let i = 0; i < 20; i++) {
    const m = { x: (a.x + b.x) / 2, y: a.y }, r = regionWinner(m, seed);
    if (r.gx === first.gx && r.gy === first.gy) a = m; else b = m;
  }
  const left = regionWinner(a, seed), right = regionWinner(b, seed);
  if (left.biome !== right.biome) continue;
  assert.ok(Math.min(left.depth, right.depth) > 0.0001, 'same-biome cell seam must not become a false biome edge');
  sharedSeams++;
}
assert.ok(sharedSeams > 5, 'field exercises multiple adjoining cells of the same biome');
console.log('PASS bounded region ownership matches a wider search and same-biome seams retain interior depth');

const scales = points.map(p => regionWinner(p, seed).scale);
assert.ok(Math.max(...scales) / Math.min(...scales) > 1.7, 'region sizes meaningfully vary within one field');
let desert: ReturnType<typeof regionWinner> | undefined;
for (let y = -12000; y < 25000 && !desert; y += 520) for (let x = -12000; x < 25000; x += 520) {
  const r = regionWinner({ x, y }, seed);
  if (r.biome === 'desert') { desert = r; break; }
}
assert.ok(desert, 'fixed seed exercises a real desert cell');
const scaleBefore = BIOMES.desert.regionScale;
const area = (): number => {
  let count = 0;
  for (let y = (desert!.gy - 3) * 260; y < (desert!.gy + 4) * 260; y += 35) {
    for (let x = (desert!.gx - 3) * 260; x < (desert!.gx + 4) * 260; x += 35) {
      const r = regionWinner({ x, y }, seed);
      if (r.gx === desert!.gx && r.gy === desert!.gy) count++;
    }
  }
  return count;
};
try {
  BIOMES.desert.regionScale = [0.6, 0.6]; const small = area();
  BIOMES.desert.regionScale = [1.8, 1.8]; const large = area();
  assert.ok(large > small * 1.5, `biome-specific radius changes actual cell acreage: ${small} -> ${large}`);
} finally { BIOMES.desert.regionScale = scaleBefore; }
const source = { map: { x: 9000, y: 9000 } };
const sparse = biomeFrontierTarget(source, 'e', () => 'desert'), dense = biomeFrontierTarget(source, 'e', () => 'jungle');
assert.ok(sparse.x - source.map.x > (dense.x - source.map.x) * 2);
assert.deepEqual(biomeFrontierTarget({ ...source, dimension: 'hell' }, 'e', () => 'desert'), { x: 9086, y: 9000 });
// Grow actual zone chains through the shared mint under two controlled biome
// palettes. This measures node count over equal map distance, including the
// existing spacing/settling behavior, rather than only comparing step formulas.
const chainCount = (biome: string): number => {
  const tileset = Object.values(TILESETS).find(t => t.biome === biome)!;
  const first: ZoneDef = { ...structuredClone(world.zone), id: 'density_origin', biome, map: { x: 9000, y: 9000 }, exits: [], objective: { kind: 'clear' } };
  const nodes: Record<string, ZoneDef> = { [first.id]: first };
  let last = first, count = 0;
  while (last.map.x < 10400 && count < 60) {
    const target = biomeFrontierTarget(last, 'e', () => biome);
    const next = placeZoneAt(target, last, nodes, ++count, { tileset: tileset.id, biomeFor: () => biome,
      seed: count * 913, fieldBiome: false, noWeave: true, forceFrontiers: 0, linkBack: true });
    nodes[next.id] = next; last = next;
  }
  assert.ok(count < 60, 'density experiment must advance across the whole distance');
  return count;
};
const desertNodes = chainCount('desert'), jungleNodes = chainCount('jungle');
assert.ok(jungleNodes >= desertNodes * 1.5, 'equal distance contains more actual jungle nodes');
console.log('PASS biome-specific area and real node density: desert ' + desertNodes + ', jungle ' + jungleNodes + ' over 1400 map units');

const min = { x: -10000, y: -10000 }, max = { x: 25000, y: 25000 };
const scarps = escarpmentsInRect(min, max, seed), scarp = scarps.find(s => cardinal(s.normal) === 'n')!;
assert.ok(scarp, 'fixed terrain contains a north-facing escarpment');
assert.deepEqual(escarpmentsInRect(scarp.seat, scarp.seat, seed).find(s => s.id === scarp.id), scarp);
const along = { x: -scarp.normal.y, y: scarp.normal.x };
const at = (t: number, normal: number): MapCoord => ({ x: scarp.seat.x + along.x * t + scarp.normal.x * normal, y: scarp.seat.y + along.y * t + scarp.normal.y * normal });
assert.equal(escarpmentRoad(at(120, -60), at(120, 60), seed), false, 'unbroken cliff bars a road');
assert.equal(escarpmentRoad(at(0, -60), at(0, 60), seed), true, 'drawn pass admits a crossing');
assert.equal(escarpmentRoad(at(120, -60), at(120, 0), seed), false, 'road cannot end inside the wall');
const footAt = at(120, -55), profile = escarpmentAt(footAt, seed)!;
assert.equal(profile.blockedSide, 'n');
assert.ok(featuresAt(footAt).some(h => h.feature.id === scarp.id));
assert.ok(featuresInRect(min, max).some(f => f.id === scarp.id && f.scarp));
const foot = placeZoneAt(footAt, null, {}, 82001, { fieldBiome: true, tileset: 'meadow', biomeFor: () => 'plains',
  seed: 81, forceFrontiers: 4, noBackEdge: true, noWeave: true });
assert.equal(foot.geo?.escarpment?.blockedSide, 'n');
assert.ok(foot.exits.length > 0 && foot.exits.every(e => e.side !== 'n'), 'no portal promises a route through the cliff');
const entry = { x: 120, y: foot.size.h / 2 };
const gen = generateLayout(foot, foot.size, new Rng(foot.seed!), entry, [{ x: foot.size.w - 120, y: foot.size.h / 2 }]);
for (let x = 15; x < foot.size.w; x += 30) assert.equal(gen.walk!.isWalkable(x, 45), false, 'north cliff remains impassable after final generation');
assert.equal(escarpmentConnection(foot, { map: at(120, 55) }), false);

const chart = world as unknown as { chartFrontier(source: ZoneDef, exit: ZoneDef['exits'][number]): ZoneDef };
assert.equal(chart.chartFrontier(foot, { to: '?', side: 'n' }), foot, 'real frontier rejects a stale cliff-facing exit');
assert.equal(escarpmentConnection({ ...foot, dimension: 'hell' }, { map: at(120, 55), dimension: 'hell' }), true, 'surface cliffs never block another dimension');
for (const side of ['n', 'e', 's', 'w'] as Dir[]) {
  const locale = orientEscarpment(compileLocale(localeProgram('cliff_foothills')!, 81), side);
  locale.terrain!.rim = { side, width: 90, region: 'cliff_face' };
  const def = { ...foot, locale };
  const a = side === 'n' || side === 's' ? { x: 120, y: def.size.h / 2 } : { x: def.size.w / 2, y: 120 };
  const b = side === 'n' || side === 's' ? { x: def.size.w - 120, y: def.size.h / 2 } : { x: def.size.w / 2, y: def.size.h - 120 };
  const terrain = generateLayout(def, def.size, new Rng(81), a, [b]);
  for (let t = 15; t < (side === 'n' || side === 's' ? def.size.w : def.size.h); t += 30) {
    const x = side === 'w' ? 45 : side === 'e' ? def.size.w - 45 : t;
    const y = side === 'n' ? 45 : side === 's' ? def.size.h - 45 : t;
    assert.equal(terrain.walk!.isWalkable(x, y), false, side + ': final terrain preserves the whole cliff rim');
  }
}
console.log('PASS atlas cliff, world road barrier, blocked portal direction and actual northern terrain agree');

const pathLength = (def: ZoneDef, start: MapCoord, end: MapCoord): number => {
  const gen = generateLayout(def, def.size, new Rng(def.seed!), start, [end]);
  const g = gen.walk!, cols = Math.ceil(def.size.w / 30), rows = Math.ceil(def.size.h / 30);
  const index = (p: MapCoord) => Math.floor(p.y / 30) * cols + Math.floor(p.x / 30);
  const queue = [index(start)], distance = new Int32Array(cols * rows).fill(-1); distance[queue[0]] = 0;
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k], x = i % cols, y = Math.floor(i / cols);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, j = ny * cols + nx;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || distance[j] >= 0 || !g.isWalkable(nx * 30 + 15, ny * 30 + 15)) continue;
      distance[j] = distance[i] + 30; queue.push(j);
    }
  }
  assert.ok(gen.doodads.some(d => d.kind === 'cave_entrance'));
  assert.ok(queue.length < cols * rows * 0.6, 'the ascent retains exposed fall space');
  return distance[index(end)];
};
for (const side of ['n', 's', 'e', 'w'] as Dir[]) for (const s of [17, 8101, 3000026]) {
  const locale = orientEscarpment(compileLocale(localeProgram('cliff_ascent')!, s), side);
  const def: ZoneDef = { ...foot, id: 'qa_ascent', locale, geo: undefined, size: { w: 2400, h: 2700 }, seed: s };
  const p = (id: string): MapCoord => { const d = locale.districts.find(d => d.id === id)!; return { x: d.at[0] * def.size.w, y: d.at[1] * def.size.h }; };
  const a = p('lower_ledge'), b = p('summit'), length = pathLength(def, a, b);
  assert.ok(length > Math.hypot(a.x - b.x, a.y - b.y) * 2, `${side}/${s}: climb retains winding route (${length})`);
}
assert.equal(regionKind('cliff_drop')?.boundaryPolicy?.kind, 'fall');
console.log('PASS switchbacks wind in all four orientations, preserve fall hazards and retain reachable shelter');

const ascent = placeZoneAt(scarp.seat, null, {}, 83001, { fieldBiome: true, tileset: 'meadow', biomeFor: () => 'plains', noBackEdge: true });
assert.equal(ascent.destination?.feature, scarp.id);
assert.equal(ascent.locale?.program, 'cliff_ascent');
world.zoneMap[ascent.id] = ascent;
const passApproach: ZoneDef = { ...structuredClone(foot), id: 'qa_pass_approach', destination: undefined, locale: undefined, geo: undefined,
  map: { x: scarp.seat.x, y: scarp.seat.y + 90 }, exits: [{ to: '?', side: 'n', tileset: 'meadow' }] };
for (let offset = 40; offset <= 180; offset++) {
  passApproach.map.y = scarp.seat.y + offset;
  const target = biomeFrontierTarget(passApproach, 'n', c => world.sim.biomeField.sampleBiome(c));
  if (Math.abs(target.y - scarp.seat.y) < 8) break;
}
assert.ok(Math.abs(biomeFrontierTarget(passApproach, 'n', c => world.sim.biomeField.sampleBiome(c)).y - scarp.seat.y) < 8);
world.zoneMap[passApproach.id] = passApproach;
const reached = chart.chartFrontier(passApproach, passApproach.exits[0]);
assert.equal(reached, ascent, 'real exploration reaches the existing atlas pass');
passApproach.exits[0].to = reached.id;
const overshoot = { ...structuredClone(passApproach), id: 'qa_pass_overshoot', map: at(0, -90), exits: [] };
assert.equal(placeZoneAt(at(0, 90), overshoot, world.zoneMap, 83003, { fieldBiome: true, tileset: 'meadow' }), ascent,
  'a long step crossing the pass must enter the climb even when both endpoints miss its catchment');
world.zoneMap[overshoot.id] = overshoot;
const sealedApproach = { ...structuredClone(passApproach), id: 'qa_sealed_approach', geo: { escarpment: { ...profile, blockedSide: 'n' as const } } };
const exitsBefore = ascent.exits.length;
assert.equal(placeZoneAt(scarp.seat, sealedApproach, world.zoneMap, 83002, { fieldBiome: true, tileset: 'meadow' }), sealedApproach);
assert.equal(ascent.exits.length, exitsBefore, 'reconnecting cannot add a road through a baked cliff face');

world.loadZone(ascent.id);
const packet = serializeZone(world), state = JSON.parse(JSON.stringify(world.serializeWorldState()));
assert.deepEqual(sanitizeWorldZones(state.zones, new Set())![ascent.id].geo, ascent.geo);
const client = makeSimWorld('warrior', 13);
applyZone(client, packet);
assert.deepEqual(client.zone.geo?.escarpment, ascent.geo?.escarpment);
assert.deepEqual(client.zone.locale, ascent.locale);
console.log('PASS real cliff destination boot, save and co-op preserve terrain orientation and layout');
