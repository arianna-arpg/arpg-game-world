import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { biomeAt, biomeDepth, BIOMES, BIOME_FIELD_CFG, regionWinner } from '../src/world/biomes';
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

const world = makeSimWorld('warrior', 0xa71a501), seed = world.sim.biomeField.fieldSeed;
const points = Array.from({ length: 1600 }, (_, i) => ({ x: 7200 + i % 40 * 75, y: 7200 + Math.floor(i / 40) * 75 }));
assert.deepEqual(points.map(p => [biomeAt(p, seed), biomeDepth(p, seed)]), points.map(p => [biomeAt(p, seed), biomeDepth(p, seed)]));

// Compare the bounded ownership solver against a much wider candidate search.
const sampled = points.filter((_, i) => i % 31 === 0).map(p => ({ p, winner: regionWinner(p, seed) }));
// Widen the readonly shipping constant only within this isolated QA witness.
const searchConfig = BIOME_FIELD_CFG.regionScale as { search: number };
const searchBefore = searchConfig.search;
try {
  searchConfig.search = 7;
  for (const { p, winner } of sampled) {
    const wide = regionWinner(p, seed);
    assert.deepEqual([wide.gx, wide.gy, wide.biome], [winner.gx, winner.gy, winner.biome]);
  }
} finally { searchConfig.search = searchBefore; }
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
