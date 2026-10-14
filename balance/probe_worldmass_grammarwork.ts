/** Exact raster/generation parity against the archived a6f62a2d grammar module.
 * The edited paint kernel is independent in the literal oracle. Unchanged
 * court/path/topology helpers are shared. --bench measures this component only. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { Rng } from '../src/core/rng';
import type { MassLandformShape } from '../src/worldmass/landforms';
import { massLandformPolicy } from '../src/worldmass/landformSources';
import { defaultRegionalTerrainGrammar, layeredRegionalTerrainGrammar, wovenRegionalTerrainGrammar,
  generateRegionalTerrain, type RegionalTerrainGrammar } from '../src/worldmass/regionalTerrainGrammar';
import { defaultRegionalTerrainWeave, validateRegionalTerrainWeave, regionalWeaveNodes, regionalWeaveTopology } from '../src/worldmass/regionalWeave';
import { regionalWovenPath } from '../src/worldmass/regionalPathWeave';
import { regionalFeatherTerrain } from '../src/worldmass/regionalTransitions';
import { regionalMotifSupport, regionalMotifRows, regionalMotifFits, reserveRegionalMotif } from '../src/worldmass/regionalMotifSupport';
import { defaultRegionalCourtMorphology, sculptedRegionalCourtMorphology, regionalCourtProfile, regionalCourtRadius,
  validateRegionalCourtMorphology, regionalCourtFamilies } from '../src/worldmass/regionalCourtShapes';
import { canonical, freezeData } from '../src/worldmass/random';
import { makeSimWorld } from '../src/sim/arena';
void makeSimWorld;

const archivedSource = String.raw`import { defaultRegionalTerrainWeave, validateRegionalTerrainWeave, regionalWeaveNodes, regionalWeaveTopology, type RegionalTerrainWeave } from './regionalWeave';
import { regionalWovenPath } from './regionalPathWeave';
import { regionalFeatherTerrain } from './regionalTransitions';
import { Rng } from '../core/rng';
import { regionalMotifSupport, regionalMotifRows, regionalMotifFits, reserveRegionalMotif } from './regionalMotifSupport';
import type { MassLandformShape } from './landforms';
import { freezeData } from './random';
import { defaultRegionalCourtMorphology, sculptedRegionalCourtMorphology, regionalCourtProfile, regionalCourtRadius, validateRegionalCourtMorphology, type RegionalCourtMorphology, type RegionalCourtProfile } from './regionalCourtShapes';

/** Saved bounded construction rules. Runtime construction consumes these rules
 * and captured motif cells, never a live native builder or scenery registry. */
export interface RegionalTerrainGrammar {
  source: string; version: 1; chance: number;
  extent: readonly [number, number]; nodes: readonly [number, number];
  extraLinks: readonly [number, number]; corridor: readonly [number, number];
  waterChance: readonly [number, number];
  motifs: readonly { shape: string; weight: number }[];
  maxChildren: number;
  morphology?: RegionalCourtMorphology;
  weave?: RegionalTerrainWeave;
}
type Point = { x: number; y: number };
type Node = Point & { radius: number; court?: RegionalCourtProfile };
type Edge = { a: number; b: number; points: readonly Point[]; style?: import('./regionalPathWeave').RegionalPathStyle };
type Port = Point & { dx: number; dy: number };
type Child = { shape: string; x: number; y: number; size: number };
const CELL = 30, directions = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
const dry = (c: string | undefined): boolean => c === 'g' || c === 'c';

export function defaultRegionalTerrainGrammar(): RegionalTerrainGrammar {
  return freezeData({ source: 'worldmass/regional-terrain-grammar-v1', version: 1, chance: .85,
    extent: [3300, 6600], nodes: [4, 10], extraLinks: [0, 3], corridor: [90, 150],
    waterChance: [.15, .75], motifs: [{ shape: 'stepping_pools/0', weight: 4 },
      { shape: 'grove_ring/0', weight: 2 }], maxChildren: 3 });
}
/** Opt-in morphology uses its own saved namespace; the historical factory
 * deliberately stays unchanged for explicit old policies and regression tools. */
export function layeredRegionalTerrainGrammar(): RegionalTerrainGrammar {
  return freezeData({ ...defaultRegionalTerrainGrammar(), morphology: defaultRegionalCourtMorphology() });
}
/** RegionalWeave is saved separately so omitted historical rules stay exact. */
export function wovenRegionalTerrainGrammar(): RegionalTerrainGrammar {
  return freezeData({ ...layeredRegionalTerrainGrammar(), morphology: sculptedRegionalCourtMorphology(), weave: defaultRegionalTerrainWeave() });
}
function connected(rows: readonly string[]): boolean {
  const n = rows.length, seen = new Uint8Array(n * n), queue = new Int32Array(n * n);
  let total = 0, head = 0, tail = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (dry(rows[y][x])) {
    total++; if (!tail) { queue[tail++] = y * n + x; seen[y * n + x] = 1; }
  }
  while (head < tail) {
    const k = queue[head++], x = k % n, y = Math.floor(k / n);
    for (const [dx, dy] of directions) {
      const xx = x + dx, yy = y + dy, j = yy * n + xx;
      if (xx >= 0 && yy >= 0 && xx < n && yy < n && !seen[j] && dry(rows[yy][xx])) {
        seen[j] = 1; queue[tail++] = j;
      }
    }
  }
  return total > 0 && total === tail;
}
function squaredDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
  return (p.x - a.x - t * dx) ** 2 + (p.y - a.y - t * dy) ** 2;
}
function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) { const j = rng.int(0, i); [items[i], items[j]] = [items[j], items[i]]; }
  return items;
}

/** All graph coordinates and radii are source-cell units; integer x/y locate a
 * cell center. Sparse orthogonal neighborhoods keep nonincident links apart.
 * Tree growth, optional cycles, room size, link bends, shoulders and children
 * vary independently. There is deliberately no universal exterior dry collar. */
function attemptGrammar(grammar: RegionalTerrainGrammar, pinned: readonly MassLandformShape[], seed: number, attempt: number): MassLandformShape | null {
  const rng = new Rng((seed ^ Math.imul(attempt + 1, 0x85ebca6b)) >>> 0);
  const extent = rng.int(Math.ceil(grammar.extent[0] / 60), Math.floor(grammar.extent[1] / 60)) * 60;
  const n = (extent + 240) / CELL, count = rng.int(...grammar.nodes), columns = count === 4 ? 2 : count > 9 ? 4 : 3, rows = count <= 6 ? 2 : 3;
  const inset = count === 4 ? .25 : .2, extentFraction = 1 - inset * 2;
  const gx = n * extentFraction / (columns - 1), gy = n * extentFraction / (rows - 1), gap = Math.min(gx, gy);
  const all = columns * rows, chosen: number[] = [rng.int(0, all - 1)], tree: [number, number][] = [];
  const adjacent = (a: number, b: number) => Math.abs(a % columns - b % columns) + Math.abs(Math.floor(a / columns) - Math.floor(b / columns)) === 1;
  while (chosen.length < count) {
    const frontier: [number, number][] = [];
    for (const a of chosen) for (let b = 0; b < all; b++) if (!chosen.includes(b) && adjacent(a, b)) frontier.push([a, b]);
    if (!frontier.length) return null;
    const edge = rng.pick(frontier); tree.push(edge); chosen.push(edge[1]);
  }
  const index = new Map(chosen.map((k, i) => [k, i]));
  const nodes: Node[] = chosen.map(k => {
    const x = Math.round(n * inset + k % columns * gx + rng.range(-.035, .035) * Math.min(gap, n * .3));
    const y = Math.round(n * inset + Math.floor(k / columns) * gy + rng.range(-.035, .035) * Math.min(gap, n * .3));
    // Sparse precincts have genuinely broad courts, not enlarged corridors.
    // Their inset centers leave a complete outer shoulder and transparent edge.
    const cap = Math.min(gap * .455, (gap * .93 - 3) / 2, count === 4 ? n * .205 : Infinity,
      Math.min(x, y, n - 1 - x, n - 1 - y) - 5);
    return { x, y, radius: rng.range(Math.min(gap * .34, cap * .82), cap) };
  });
  if (grammar.weave) {
    const regionalWeaveCourts = regionalWeaveNodes(grammar.weave, nodes, n, gap, seed, attempt);
    if (regionalWeaveCourts.some(node => node.radius < 4)) return null;
    nodes.splice(0, nodes.length, ...regionalWeaveCourts);
  }
  if (grammar.morphology) nodes.forEach((node, i) => { node.court = regionalCourtProfile(grammar.morphology!, seed, attempt, i); });
  const pairs: [number, number][] = tree.map(([a, b]) => [index.get(a)!, index.get(b)!]);
  const extra: [number, number][] = [];
  for (let a = 0; a < count; a++) for (let b = a + 1; b < count; b++)
    if (adjacent(chosen[a], chosen[b]) && !pairs.some(([i, j]) => i === a && j === b || i === b && j === a)) extra.push([a, b]);
  // A saved minimum describes realized connectivity, not discarded attempts.
  if (extra.length < grammar.extraLinks[0]) return null;
  pairs.push(...shuffle(extra, rng).slice(0, rng.int(...grammar.extraLinks)));
  const edges: Edge[] = pairs.map(([a, b], regionalWeaveEdge) => {
    const start = nodes[a], end = nodes[b], horizontal = chosen[a] % columns !== chosen[b] % columns;
    const bend = rng.range(-.075, .075) * gap;
    if (grammar.weave) return { a, b, ...regionalWovenPath(grammar.weave.paths, seed, attempt, regionalWeaveEdge, start, end, gap) };
    return { a, b, points: [start, ...[.32, .68].map(t => ({
      x: start.x + (end.x - start.x) * t + (horizontal ? 0 : bend),
      y: start.y + (end.y - start.y) * t + (horizontal ? bend : 0),
    })), end] };
  });
  // 0 transparent, 1 dry floor, 2 wall, 3 water. Dry union wins over shoulders;
  // only graph edges connect distinct chambers, and chambers never overlap.
  const cells = new Uint8Array(n * n), wetChance = rng.range(...grammar.waterChance);
  const paint = (minX: number, minY: number, maxX: number, maxY: number,
    sample: (x: number, y: number) => number): void => {
    for (let y = Math.max(1, Math.floor(minY)); y <= Math.min(n - 2, Math.ceil(maxY)); y++)
      for (let x = Math.max(1, Math.floor(minX)); x <= Math.min(n - 2, Math.ceil(maxX)); x++) {
        const k = y * n + x, value = sample(x, y);
        if (value && (value === 1 || cells[k] !== 1)) cells[k] = value;
      }
  };
  for (const node of nodes) {
    const shoulderBudget = Math.min(node.x, node.y, n - 1 - node.x, n - 1 - node.y) - node.radius - 2;
    const wave = Math.min(1.5, shoulderBudget / 4), shoulder = Math.min(rng.range(3, 6), shoulderBudget - wave);
    const phase = rng.range(0, Math.PI * 2), lobes = rng.int(3, 6), material = rng.chance(wetChance) ? 3 : 2;
    const bound = node.radius + shoulder + wave;
    paint(node.x - bound, node.y - bound, node.x + bound, node.y + bound, (x, y) => {
      const angle = Math.atan2(y - node.y, x - node.x), d = Math.hypot(x - node.x, y - node.y);
      const courtRadius = node.court ? node.radius * regionalCourtRadius(node.court, angle) : node.radius;
      if (d <= courtRadius) return 1;
      return d <= courtRadius + shoulder + wave * Math.sin(lobes * angle + phase) ? material : 0;
    });
  }
  const paintLink = (points: readonly Point[], width: number, shoulder: number, material: number, port?: Port): void => {
    const radius = width / (2 * CELL), bound = radius + shoulder;
    const minX = Math.min(...points.map(p => p.x)) - bound, maxX = Math.max(...points.map(p => p.x)) + bound;
    const minY = Math.min(...points.map(p => p.y)) - bound, maxY = Math.max(...points.map(p => p.y)) + bound;
    // RegionalWeave may contain dozens of segments. Expanded segment bounds
    // skip only distances that cannot affect this capsule's floor or shoulder;
    // omitted weave deliberately retains the historical raster calculation.
    const regionalWeaveSegments = grammar.weave ? points.slice(1).map((p, i) => ({
      a: points[i], b: p, minX: Math.min(points[i].x, p.x) - bound,
      maxX: Math.max(points[i].x, p.x) + bound, minY: Math.min(points[i].y, p.y) - bound,
      maxY: Math.max(points[i].y, p.y) + bound,
    })) : undefined;
    paint(minX, minY, maxX, maxY, (x, y) => {
      if (port && ((x - port.x) * port.dx + (y - port.y) * port.dy > 0)) return 0;
      let d = Infinity;
      if (regionalWeaveSegments) {
        for (const segment of regionalWeaveSegments) if (x >= segment.minX && x <= segment.maxX && y >= segment.minY && y <= segment.maxY)
          d = Math.min(d, squaredDistance({ x, y }, segment.a, segment.b));
      } else for (let i = 1; i < points.length; i++) d = Math.min(d, squaredDistance({ x, y }, points[i - 1], points[i]));
      return d <= radius * radius ? 1 : d <= bound * bound ? material : 0;
    });
  };
  for (const edge of edges) paintLink(edge.points, rng.range(...grammar.corridor), rng.range(3, 6), rng.chance(wetChance) ? 3 : 2);
  const ports: Port[] = [];
  for (const [dx, dy] of directions) {
    // The extreme chamber is also the first chamber reached from this side;
    // the new throat cannot run through a separate interior chamber.
    const node = nodes.reduce((best, candidate) => candidate.x * dx + candidate.y * dy > best.x * dx + best.y * dy ? candidate : best);
    const port = { x: dx < 0 ? 2 : dx > 0 ? n - 3 : node.x, y: dy < 0 ? 2 : dy > 0 ? n - 3 : node.y, dx, dy };
    paintLink([node, port], 90, 3, rng.chance(wetChance) ? 3 : 2, port); ports.push(port);
  }
  if (grammar.weave) {
    const regionalWeaveRows = Array.from({ length: n }, (_, y) => Array.from(cells.subarray(y * n, (y + 1) * n), c => '.gbw'[c]).join(''));
    const regionalTransitions = regionalFeatherTerrain(regionalWeaveRows, ports, grammar.weave.transitions, seed, attempt);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) cells[y * n + x] = '.gbw'.indexOf(regionalTransitions[y][x]);
  }
  // A closed route can enclose a region of otherwise untouched noise ground.
  // Do not leave an inaccessible transparent pocket available for native sites
  // or small terrain: enclosed interiors become lakes or solid terrain. Only
  // source transparency connected to the exterior is available for layering.
  const exterior = new Uint8Array(n * n), queue = new Int32Array(n * n);
  let head = 0, tail = 1; queue[0] = 0; exterior[0] = 1;
  while (head < tail) {
    const k = queue[head++], x = k % n, y = Math.floor(k / n);
    for (const [dx, dy] of directions) {
      const xx = x + dx, yy = y + dy, j = yy * n + xx;
      if (xx >= 0 && yy >= 0 && xx < n && yy < n && !cells[j] && !exterior[j]) {
        exterior[j] = 1; queue[tail++] = j;
      }
    }
  }
  for (let start = 0; start < cells.length; start++) if (!cells[start] && !exterior[start]) {
    const material = rng.chance(wetChance) ? 3 : 2;
    head = 0; tail = 1; queue[0] = start; cells[start] = material;
    while (head < tail) {
      const k = queue[head++], x = k % n, y = Math.floor(k / n);
      for (const [dx, dy] of directions) {
        const xx = x + dx, yy = y + dy, j = yy * n + xx;
        if (xx >= 0 && yy >= 0 && xx < n && yy < n && !cells[j] && !exterior[j]) {
          cells[j] = material; queue[tail++] = j;
        }
      }
    }
  }
  const foundationRows = Array.from({ length: n }, (_, y) => Array.from(cells.subarray(y * n, (y + 1) * n), c => '.gbw'[c]).join(''));
  if (!connected(foundationRows) || ports.some(p => !dry(foundationRows[p.y][p.x])
    || [-1, 0, 1].some(side => foundationRows[p.y + p.dy + p.dx * side]?.[p.x + p.dx - p.dy * side] !== '.'))) return null;
  if (grammar.weave && !regionalWeaveTopology(foundationRows, nodes, edges)) return null;
  const navigation: Point[] = ports.map(p => ({ x: p.x - p.dx * 2, y: p.y - p.dy * 2 }));
  navigation.push(...nodes.slice(0, 8).map(p => ({ x: p.x, y: p.y })));
  const output = foundationRows.map(row => row.split('')), components: Child[] = [], childSeed = rng.int(0, 0xffffffff);
  const childRng = new Rng(childSeed), childCount = childRng.int(0, grammar.maxChildren), available = shuffle([...nodes], childRng);
  const regionalMotifAware = nodes.some(node => node.court && node.court.family !== 'circle');
  const regionalMotifReservations = regionalMotifAware ? new Uint8Array(n * n) : undefined;
  for (let i = 0; i < childCount; i++) {
    if (!grammar.motifs.length) break;
    const motif = childRng.weighted(grammar.motifs), child = pinned.find(s => s.id === motif.shape);
    if (!child) return null;
    const m = child.rows.length;
    const regionalMotifShape = regionalMotifAware ? regionalMotifSupport(child) : undefined;
    const regionalMotifFloor = regionalMotifAware ? regionalMotifRows(output, undefined, regionalMotifReservations) : undefined;
    // Up to eight local seats per finite chamber. A complete rectangular dry
    // host remains historical; regionalMotifSupport follows occupied cells and
    // a 120-unit dry feather in noncircular courts. Narrow links cannot host it.
    let seat: Point | undefined;
    for (const room of available) {
      if (seat) break;
      if (room.radius < (regionalMotifShape?.radius ?? (m + 2) / Math.SQRT2)) continue;
      for (let trial = 0; trial < 8 && !seat; trial++) {
        const x = Math.round(room.x - (m - 1) / 2) + (trial ? childRng.int(-3, 3) : 0);
        const y = Math.round(room.y - (m - 1) / 2) + (trial ? childRng.int(-3, 3) : 0);
        if (x < 1 || y < 1 || x + m >= n || y + m >= n) continue;
        let clear = regionalMotifFloor ? regionalMotifFits(regionalMotifFloor, regionalMotifShape!, x, y) : true;
        if (!regionalMotifFloor) for (let yy = y - 1; yy <= y + m && clear; yy++) for (let xx = x - 1; xx <= x + m; xx++)
          if (output[yy][xx] !== 'g') { clear = false; break; }
        if (!clear) continue;
        seat = { x, y };
      }
    }
    if (!seat) continue;
    for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) if (child.rows[y][x] !== '.') output[seat.y + y][seat.x + x] = child.rows[y][x];
    components.push({ shape: child.id, ...seat, size: m });
    if (regionalMotifReservations) reserveRegionalMotif(regionalMotifReservations, n, regionalMotifShape!, seat.x, seat.y);
  }
  const realized = output.map(row => row.join(''));
  if (!connected(realized)) return null;
  // Navigation points are proof samples rather than content anchors. A whole
  // native motif may occupy a court's exact center. Move only that court's
  // sample to its nearest surviving body-clear ORIGINAL room floor; subsequent
  // site/child composition still compares route distances at these same points.
  for (let i = 0; i < Math.min(nodes.length, 8); i++) {
    const node = nodes[i], reach = Math.min(12, node.radius - 2);
    let best: Point | undefined, score = Infinity;
    for (let y = Math.max(1, Math.ceil(node.y - reach)); y <= Math.min(n - 2, Math.floor(node.y + reach)); y++)
      for (let x = Math.max(1, Math.ceil(node.x - reach)); x <= Math.min(n - 2, Math.floor(node.x + reach)); x++) {
        const d = (x - node.x) ** 2 + (y - node.y) ** 2;
        if (d > reach * reach || d >= score) continue;
        let safe = true;
        for (let yy = y - 1; yy <= y + 1 && safe; yy++) for (let xx = x - 1; xx <= x + 1; xx++)
          if (foundationRows[yy][xx] !== 'g' || !dry(realized[yy][xx])) { safe = false; break; }
        if (safe) { best = { x, y }; score = d; }
      }
    if (!best) return null;
    navigation[i + 4] = best;
  }
  const shape = { id: 'grammar/' + seed.toString(16) + '/' + attempt, source: grammar.source,
    builder: 'regional_terrain_grammar', params: { extent, attempt, nodes: nodes.length, extraLinks: edges.length - nodes.length + 1 },
    rows: realized, foundationRows, components, navigation, ports,
    grammar: { source: grammar.source, seed, nodes, edges, childSeed } };
  return freezeData(shape);
}

/** Three attempts at most. Failure does not fall back to a recognizably fixed
 * stamp, and no shared random cursor or chunk residency influences the result. */
export function generateRegionalTerrain(grammar: RegionalTerrainGrammar, pinnedSmallShapes: readonly MassLandformShape[], seed: number): MassLandformShape | null {
  if (grammar.version !== 1 || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff
    || grammar.extent[0] < 2160 || grammar.extent[1] > 6960 || grammar.extent[0] > grammar.extent[1]
    || grammar.nodes[0] < 4 || grammar.nodes[1] > 10 || grammar.nodes[0] > grammar.nodes[1]
    || grammar.maxChildren < 0 || grammar.maxChildren > 8) return null;
  if (Object.hasOwn(grammar, 'morphology')) {
    try { validateRegionalCourtMorphology(grammar.morphology!); } catch { return null; }
  }
  if (Object.hasOwn(grammar, 'weave')) {
    try { validateRegionalTerrainWeave(grammar.weave!); } catch { return null; }
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const shape = attemptGrammar(grammar, pinnedSmallShapes, seed, attempt);
    if (shape) return shape;
  }
  return null;
}`;

assert.equal(createHash('sha256').update(archivedSource).digest('hex'),
  '04445787e5a25da3ea054264b88c87b5b097d3f4aa46b3dc2883c8e9f531268a', 'preserved a6f62a2d grammar must remain unchanged');
const oracleImports = { defaultRegionalTerrainWeave, validateRegionalTerrainWeave, regionalWeaveNodes, regionalWeaveTopology,
  regionalWovenPath, regionalFeatherTerrain, Rng, regionalMotifSupport, regionalMotifRows, regionalMotifFits,
  reserveRegionalMotif, freezeData, defaultRegionalCourtMorphology, sculptedRegionalCourtMorphology,
  regionalCourtProfile, regionalCourtRadius, validateRegionalCourtMorphology };
type Generate = typeof generateRegionalTerrain;
type Work = { samples: number };
function compile(source: string, work?: Work): Generate {
  let text = source.replace(/^import .*;\n/gm, '').replace(/\bexport /g, '');
  if (work) {
    assert.equal(text.split('sample(x, y)').length, 2, 'instrument the one actual raster sample call');
    text = text.replace('sample(x, y)', 'countedSample(sample, x, y)');
  }
  const output = ts.transpileModule(text,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const countedSample = (sample: (x: number, y: number) => number, x: number, y: number) => {
    work!.samples++; return sample(x, y);
  };
  return new Function(...Object.keys(oracleImports), 'countedSample', output + '\nreturn generateRegionalTerrain;')
    (...Object.values(oracleImports), countedSample) as Generate;
}
const archived = compile(archivedSource);
const currentSource = readFileSync(new URL('../src/worldmass/regionalTerrainGrammar.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const small = massLandformPolicy();
const policies = [
  { name: 'historical-circle', grammar: defaultRegionalTerrainGrammar() },
  { name: 'historical-morphology', grammar: layeredRegionalTerrainGrammar() },
  { name: 'current-weave', grammar: wovenRegionalTerrainGrammar() },
];
const copy = <T>(value: T): T => JSON.parse(canonical(value)) as T;
const digest = (value: unknown): string => createHash('sha256').update(canonical(value)).digest('hex');
let tests = 0, comparisons = 0, generated = 0, refused = 0, errors = 0;
function same<T>(actual: T, expected: T, label: string): void {
  assert.deepEqual(actual, expected, label); comparisons++;
}
function test(label: string, run: () => void): void { run(); tests++; console.log('PASS ' + label); }
type Draw = { stream: number; before: number; after: number; value: number };
interface Capture {
  result: MassLandformShape | null | undefined;
  error?: { name: string; message: string };
  draws: Draw[]; cursors: number[];
}
function capture(fn: () => MassLandformShape | null): Capture {
  const original = Rng.prototype.next, streams: Rng[] = [], ids = new WeakMap<Rng, number>(), draws: Draw[] = [];
  let result: MassLandformShape | null | undefined, error: Capture['error'];
  Rng.prototype.next = function () {
    let stream = ids.get(this);
    if (stream === undefined) { stream = streams.length; streams.push(this); ids.set(this, stream); }
    const before = this.snapshot(), value = original.call(this);
    draws.push({ stream, before, after: this.snapshot(), value }); return value;
  };
  try { result = fn(); }
  catch (e) { error = { name: e instanceof Error ? e.name : typeof e, message: e instanceof Error ? e.message : String(e) }; }
  finally { Rng.prototype.next = original; }
  return { result, ...(error ? { error } : {}), draws, cursors: streams.map(rng => rng.snapshot()) };
}
function parity(grammar: RegionalTerrainGrammar, seed: number, pinned: readonly MassLandformShape[] = small.shapes): MassLandformShape | null | undefined {
  const original = capture(() => archived(grammar, pinned, seed)), current = capture(() => generateRegionalTerrain(grammar, pinned, seed));
  same(current.result, original.result, 'entire shape: raster, foundation, courts, edges, ports, child placements, navigation and identity');
  same(current.error, original.error, 'same rejection or exception');
  same(current.draws, original.draws, 'all random streams retain draw order, values and cursor transitions');
  same(current.cursors, original.cursors, 'every consumed random stream ends at the original cursor');
  if (current.error) errors++; else if (current.result) generated++; else refused++;
  return current.result;
}

test('historical and current policies retain full shapes and every RNG cursor over fixed seeds', () => {
  const seeds = [...Array.from({ length: 24 }, (_, i) => i + 1), 0, 42, 713, 0xffffffff];
  for (const { grammar } of policies) for (const seed of seeds) {
    const policyBefore = digest(grammar), shapesBefore = digest(small.shapes);
    const result = parity(grammar, seed);
    if (result) assert.ok(Object.isFrozen(result) && Object.isFrozen(result.rows) && Object.isFrozen(result.grammar));
    assert.equal(digest(grammar), policyBefore, 'saved grammar remains unchanged');
    assert.equal(digest(small.shapes), shapesBefore, 'captured native motifs remain unchanged');
  }
  assert.ok(generated > 0, 'course must exercise successful complete generation');
});

test('every court family and validated morphology bounds retain identical complete output', () => {
  const admittedFamilies = new Set<string>();
  for (const family of regionalCourtFamilies) for (const extreme of [false, true]) {
    const policy = copy(wovenRegionalTerrainGrammar());
    policy.nodes = [4, 4]; policy.extent = [6000, 6000]; policy.maxChildren = 0;
    policy.morphology!.families = [{ family, weight: 1 }];
    policy.morphology!.aspect = extreme ? [.6, .6] : [1, 1];
    policy.morphology!.depth = extreme ? [.4, .4] : [.08, .08];
    policy.morphology!.lobes = extreme ? [8, 8] : [3, 3];
    policy.morphology!.facets = extreme ? [10, 10] : [4, 4];
    for (const seed of [1, 42, 713]) {
      const result = parity(policy, seed);
      if (result) {
        assert.ok(result.grammar!.nodes.every(node => node.court?.family === family));
        admittedFamilies.add(family);
      }
    }
  }
  same([...admittedFamilies].sort(), [...regionalCourtFamilies].sort(), 'all court families must produce checked complete shapes');
});

test('bounds, child composition, failed attempts and malformed requests retain outcomes and draws', () => {
  for (const grammar of [
    { ...defaultRegionalTerrainGrammar(), extent: [2160, 2160] as const, nodes: [4, 4] as const, maxChildren: 0 },
    { ...layeredRegionalTerrainGrammar(), extent: [6960, 6960] as const, nodes: [10, 10] as const, maxChildren: 8 },
    { ...wovenRegionalTerrainGrammar(), waterChance: [0, 0] as const },
    { ...wovenRegionalTerrainGrammar(), waterChance: [1, 1] as const },
    { ...defaultRegionalTerrainGrammar(), nodes: [4, 4] as const, extraLinks: [2, 2] as const, maxChildren: 0 },
    { ...layeredRegionalTerrainGrammar(), motifs: [{ shape: 'missing-native-motif', weight: 1 }], maxChildren: 8 },
  ]) for (const seed of [0, 42, 713]) parity(grammar, seed);
  for (const seed of [-1, .25, 0x100000000, NaN, Infinity]) assert.equal(parity(policies[0].grammar, seed), null);
  for (const mutate of [
    (g: RegionalTerrainGrammar) => { g.version = 2 as 1; },
    (g: RegionalTerrainGrammar) => { g.morphology!.aspect = [.2, .4]; },
    (g: RegionalTerrainGrammar) => { g.weave!.nodeJitter = 1; },
    (g: RegionalTerrainGrammar) => { g.morphology = null as unknown as RegionalTerrainGrammar['morphology']; },
    (g: RegionalTerrainGrammar) => { g.extent = null as unknown as RegionalTerrainGrammar['extent']; },
  ]) {
    const grammar = copy(wovenRegionalTerrainGrammar()); mutate(grammar); parity(grammar, 713);
  }
  assert.ok(refused > 0 && errors > 0, 'course must cover both explicit refusal and thrown malformed-input errors');
});

test('query order and cold cloned source inputs preserve historical output', () => {
  for (const { grammar } of policies) {
    const seeds = [1, 3, 42, 713], forward = new Map<number, string>();
    for (const seed of seeds) forward.set(seed, digest(parity(grammar, seed) ?? null));
    for (const seed of seeds.slice().reverse()) {
      same(digest(generateRegionalTerrain(copy(grammar), copy(small.shapes), seed)), forward.get(seed), 'fresh saved copies and reverse seed order');
    }
  }
});

const fixedSeeds = [1, 3, 42, 713, 991, 1337, 0x12345678, 0xffffffff];
const workRows: { policy: string; archivedSamples: number; currentSamples: number; digest: string }[] = [];
test('actual internal sampler counts fall while complete results remain exact', () => {
  for (const { name, grammar } of policies) {
    const before: Work = { samples: 0 }, after: Work = { samples: 0 };
    const original = compile(archivedSource, before), current = compile(currentSource, after);
    const originalResults = fixedSeeds.map(seed => original(grammar, small.shapes, seed));
    const currentResults = fixedSeeds.map(seed => current(grammar, small.shapes, seed));
    same(currentResults, originalResults, 'metered raster kernels retain exact output');
    same(currentResults, fixedSeeds.map(seed => generateRegionalTerrain(grammar, small.shapes, seed)), 'metered current source matches imported production');
    assert.ok(after.samples > 0 && after.samples < before.samples, 'skip only redundant geometry work on existing dry cells');
    workRows.push({ policy: name, archivedSamples: before.samples, currentSamples: after.samples, digest: digest(currentResults) });
  }
  console.log('Regional raster sampler work ' + JSON.stringify(workRows));
});

if (process.argv.includes('--bench')) {
  const currentForTiming = compile(currentSource);
  const rows: { round: number; policy: string; mode: string; ms: number; queryMs: number[]; maxMs: number; digest: string }[] = [];
  // No RNG tapes or sample counters inside timing. Each call constructs a new
  // raster; immutable motif support may be warm in either unchanged helper.
  // Both sources use the same TypeScript transform and unchanged helpers, so
  // tsx function-name helpers cannot skew this isolated paint comparison. The
  // actual imported production generator is checked independently above.
  for (const { name, grammar } of policies) for (let round = 0; round < 4; round++) {
    const order = round % 2 ? [currentForTiming, archived] : [archived, currentForTiming];
    for (const generate of order) {
      const values: (MassLandformShape | null)[] = [], queryMs: number[] = [], start = performance.now();
      for (const seed of fixedSeeds) {
        const queryStart = performance.now();
        values.push(generate(grammar, small.shapes, seed));
        queryMs.push(performance.now() - queryStart);
      }
      const ms = performance.now() - start;
      rows.push({ round, policy: name, mode: generate === archived ? 'archived' : 'current', ms, queryMs,
        maxMs: Math.max(...queryMs), digest: digest(values) });
    }
  }
  const median = (values: number[]) => {
    const sorted = values.slice().sort((a, b) => a - b), half = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[half] : (sorted[half - 1] + sorted[half]) / 2;
  };
  const summary = policies.flatMap(({ name }) => {
    const policyRows = rows.filter(row => row.policy === name);
    assert.equal(new Set(policyRows.map(row => row.digest)).size, 1, 'every timed full output digest remains exact');
    return ['archived', 'current'].map(mode => {
      const rounds = policyRows.filter(row => row.mode === mode);
      return { policy: name, mode, medianMs: median(rounds.map(row => row.ms)), maxMedianMs: median(rounds.map(row => row.maxMs)),
        worstMs: Math.max(...rounds.map(row => row.maxMs)), queryMedianMs: fixedSeeds.map((_, i) => median(rounds.map(row => row.queryMs[i]))) };
    });
  });
  console.log('Unmetered regional raster timing (fresh raster, identical transform, shared unchanged helpers): ' + JSON.stringify({ seeds: fixedSeeds, rows, summary }));
}
console.log('PASS worldmass_grammarwork: ' + tests + ' fixtures, ' + comparisons + ' exact comparisons, ' +
  generated + ' generated, ' + refused + ' refused, ' + errors + ' thrown; archived module SHA256 ' +
  createHash('sha256').update(archivedSource).digest('hex'));
