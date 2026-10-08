import { Rng } from '../core/rng';
import type { MassLandformShape } from './landforms';
import { freezeData } from './random';

/** Saved bounded construction rules. Runtime construction consumes these rules
 * and captured motif cells, never a live native builder or scenery registry. */
export interface RegionalTerrainGrammar {
  source: string; version: 1; chance: number;
  extent: readonly [number, number]; nodes: readonly [number, number];
  extraLinks: readonly [number, number]; corridor: readonly [number, number];
  waterChance: readonly [number, number];
  motifs: readonly { shape: string; weight: number }[];
  maxChildren: number;
}
type Point = { x: number; y: number };
type Node = Point & { radius: number };
type Edge = { a: number; b: number; points: Point[] };
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
  const pairs: [number, number][] = tree.map(([a, b]) => [index.get(a)!, index.get(b)!]);
  const extra: [number, number][] = [];
  for (let a = 0; a < count; a++) for (let b = a + 1; b < count; b++)
    if (adjacent(chosen[a], chosen[b]) && !pairs.some(([i, j]) => i === a && j === b || i === b && j === a)) extra.push([a, b]);
  // A saved minimum describes realized connectivity, not discarded attempts.
  if (extra.length < grammar.extraLinks[0]) return null;
  pairs.push(...shuffle(extra, rng).slice(0, rng.int(...grammar.extraLinks)));
  const edges: Edge[] = pairs.map(([a, b]) => {
    const start = nodes[a], end = nodes[b], horizontal = chosen[a] % columns !== chosen[b] % columns;
    const bend = rng.range(-.075, .075) * gap;
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
      if (d <= node.radius) return 1;
      return d <= node.radius + shoulder + wave * Math.sin(lobes * angle + phase) ? material : 0;
    });
  }
  const paintLink = (points: readonly Point[], width: number, shoulder: number, material: number, port?: Port): void => {
    const radius = width / (2 * CELL), bound = radius + shoulder;
    const minX = Math.min(...points.map(p => p.x)) - bound, maxX = Math.max(...points.map(p => p.x)) + bound;
    const minY = Math.min(...points.map(p => p.y)) - bound, maxY = Math.max(...points.map(p => p.y)) + bound;
    paint(minX, minY, maxX, maxY, (x, y) => {
      if (port && ((x - port.x) * port.dx + (y - port.y) * port.dy > 0)) return 0;
      let d = Infinity;
      for (let i = 1; i < points.length; i++) d = Math.min(d, squaredDistance({ x, y }, points[i - 1], points[i]));
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
  const navigation: Point[] = ports.map(p => ({ x: p.x - p.dx * 2, y: p.y - p.dy * 2 }));
  navigation.push(...nodes.slice(0, 8).map(p => ({ x: p.x, y: p.y })));
  const output = foundationRows.map(row => row.split('')), components: Child[] = [], childSeed = rng.int(0, 0xffffffff);
  const childRng = new Rng(childSeed), childCount = childRng.int(0, grammar.maxChildren), available = shuffle([...nodes], childRng);
  for (let i = 0; i < childCount; i++) {
    if (!grammar.motifs.length) break;
    const motif = childRng.weighted(grammar.motifs), child = pinned.find(s => s.id === motif.shape);
    if (!child) return null;
    const m = child.rows.length;
    // Up to eight local seats per finite chamber. A complete rectangular dry
    // host and margin are necessary; narrow links never become motif hosts.
    let seat: Point | undefined;
    for (const room of available) {
      if (seat) break;
      if (room.radius < (m + 2) / Math.SQRT2) continue;
      for (let trial = 0; trial < 8 && !seat; trial++) {
        const x = Math.round(room.x - (m - 1) / 2) + (trial ? childRng.int(-3, 3) : 0);
        const y = Math.round(room.y - (m - 1) / 2) + (trial ? childRng.int(-3, 3) : 0);
        if (x < 1 || y < 1 || x + m >= n || y + m >= n) continue;
        let clear = true;
        for (let yy = y - 1; yy <= y + m && clear; yy++) for (let xx = x - 1; xx <= x + m; xx++)
          if (output[yy][xx] !== 'g') { clear = false; break; }
        if (!clear) continue;
        seat = { x, y };
      }
    }
    if (!seat) continue;
    for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) if (child.rows[y][x] !== '.') output[seat.y + y][seat.x + x] = child.rows[y][x];
    components.push({ shape: child.id, ...seat, size: m });
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
  for (let attempt = 0; attempt < 3; attempt++) {
    const shape = attemptGrammar(grammar, pinnedSmallShapes, seed, attempt);
    if (shape) return shape;
  }
  return null;
}
