import { Rng } from '../core/rng';
import { ADVENTURE_DISTRICTS } from '../engine/adventureDistricts';
import { EXPLORATION_DISTRICTS } from '../engine/explorationDistricts';
import { GridWalkField } from '../world/gridWalk';
import { captureLandformShape } from './landformSources';
import type { MassLandformShape } from './landforms';
import type { MassRegionalLandformPolicy } from './regionalLandforms';
import { freezeData, massHash } from './random';

type Point = { x: number; y: number };
type Port = Point & { dx: number; dy: number };
type RegionalShape = MassLandformShape & {
  components: { shape: string; x: number; y: number; size: number }[];
  navigation: Point[];
  ports: Port[];
  foundationRows?: readonly string[];
};
const CELL = 30, COLLAR = 120;
const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
const dry = (c: string | undefined): boolean => c === 'g' || c === 'c';

/** A source proof deliberately treats the transparent exterior as unavailable.
 * The regional planner separately checks actual outside terrain at each port. */
function connected(rows: readonly (readonly string[])[]): boolean {
  const n = rows.length, seen = new Uint8Array(n * n), queue: number[] = [];
  let count = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (dry(rows[y][x])) {
    count++; if (!queue.length) { queue.push(y * n + x); seen[y * n + x] = 1; }
  }
  for (let i = 0; i < queue.length; i++) {
    const x = queue[i] % n, y = Math.floor(queue[i] / n);
    for (const [dx, dy] of directions) {
      const xx = x + dx, yy = y + dy, k = yy * n + xx;
      if (xx < 0 || yy < 0 || xx >= n || yy >= n || seen[k] || !dry(rows[yy][xx])) continue;
      seen[k] = 1; queue.push(k);
    }
  }
  return queue.length > 0 && queue.length === count;
}

/** Admit the COMPLETE small native source plus a cell of untouched dry floor.
 * Narrow parent paths cannot fit this rectangle. Transparent child cells inherit
 * their parent; no corridor is carved to force a child into the composition. */
function placeChild(rows: string[][], child: MassLandformShape, components: RegionalShape['components'],
  foundation?: readonly string[], navigation: readonly Point[] = [], regionalTerrainSeed?: number): boolean {
  const n = rows.length, m = child.rows.length, stride = n + 1, occupied = new Int32Array(stride * stride);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) occupied[(y + 1) * stride + x + 1]
    = (rows[y][x] === 'g' && (!foundation || foundation[y][x] === 'g') ? 0 : 1)
      + occupied[y * stride + x + 1] + occupied[(y + 1) * stride + x] - occupied[y * stride + x];
  const sum = (x: number, y: number, size: number) => occupied[(y + size) * stride + x + size]
    - occupied[y * stride + x + size] - occupied[(y + size) * stride + x] + occupied[y * stride + x];
  let seat: Point | undefined, score = Infinity;
  for (let y = 1; y + m < n; y++) for (let x = 1; x + m < n; x++) {
    if (sum(x - 1, y - 1, m + 2)) continue;
    if (components.some(c => x < c.x + c.size + 2 && x + m + 2 > c.x && y < c.y + c.size + 2 && y + m + 2 > c.y)) continue;
    // Existing safe terminals survive any situational relocation. The planner
    // additionally compares final route distances after all children are seated.
    if (navigation.some(a => {
      for (let yy = a.y - y - 1; yy <= a.y - y + 1; yy++) for (let xx = a.x - x - 1; xx <= a.x - x + 1; xx++)
        if (xx >= 0 && yy >= 0 && xx < m && yy < m && child.rows[yy][xx] !== '.' && !dry(child.rows[yy][xx])) return true;
      return false;
    })) continue;
    // Historical sources favor the center. regionalTerrainSeed ranks eligible
    // cells independently, allowing discoveries throughout generated courts.
    const d = regionalTerrainSeed===undefined ? (x + m / 2 - n / 2) ** 2 + (y + m / 2 - n / 2) ** 2
      : massHash(x+','+y+','+components.length,regionalTerrainSeed);
    if (d < score) { seat = { x, y }; score = d; }
  }
  if (!seat) return false;
  for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) {
    const c = child.rows[y][x]; if (c !== '.') rows[seat.y + y][seat.x + x] = c;
  }
  components.push({ shape: child.id, ...seat, size: m });
  return true;
}
function composePools(rows: string[][], child: MassLandformShape, max: number): RegionalShape['components'] {
  const components: RegionalShape['components'] = [];
  for (let index = 0; index < max && placeChild(rows, child, components); index++) { /* bounded source composition */ }
  return components;
}

/** Fit the required complete motifs after protected sites have been composed.
 * Both final ground and the pinned original broad court must fit each child:
 * newly carved spurs and widened site collars never become accidental hosts.
 * Child geometry comes solely from the saved source catalogue supplied by the
 * caller; this function never rebakes from the mutable native registry. */
export function fitRegionalChildren(shape: MassLandformShape, rows: readonly string[],
  children: readonly MassLandformShape[]): MassLandformShape | null {
  const n = shape.rows.length, foundation = shape.foundationRows;
  if (rows.length !== n || rows.some(row => row.length !== n)) return null;
  if (shape.components?.length && (!foundation || foundation.length !== n || foundation.some(row => row.length !== n))) return null;
  const cells = rows.map(row => row.split('')), components: RegionalShape['components'] = [];
  for (const component of shape.components ?? []) {
    const child = children.find(s => s.id === component.shape);
    if (!child || child.rows.length !== component.size || !placeChild(cells, child, components, foundation, shape.navigation, shape.grammar?.childSeed)) return null;
  }
  if (!connected(cells)) return null;
  return { ...shape, rows: cells.map(row => row.join('')), components };
}

/** Native physical dimensions change while native corridor widths stay fixed.
 * These are new sources; the historical small-source capture remains untouched. */
export function captureRegionalShape(builder: string, variant: number, extent: number, pools: MassLandformShape): RegionalShape {
  const build = ADVENTURE_DISTRICTS[builder] ?? EXPLORATION_DISTRICTS[builder];
  if (!build || !Number.isSafeInteger(extent) || extent < 2160 || extent > 6960 || extent % (CELL * 2)) throw Error('Unknown regional source or extent');
  const size = extent + COLLAR * 2, n = size / CELL, middle = size / 2;
  const grid = new GridWalkField(size, size, CELL), center = { x: middle, y: middle };
  const params = { rows: variant ? 4 : 2, spokes: variant ? 7 : 4, cuts: variant ? 3 : 2, lobes: variant ? 4 : 2,
    pools: variant ? 5 : 2, branches: variant ? 4 : 2, bridges: variant ? 3 : 1, breach: variant ? 1 : 0,
    bearing: variant ? Math.PI / 3 : 0, extent };
  build({ grid, center, w: extent, h: extent, params, rng: new Rng(713 + variant) });
  const depth = (x: number, y: number): number => {
    const a = Math.atan2(y - middle, x - middle);
    return extent * (.46 + .012 * Math.sin(a * 3 + variant) + .015 * Math.cos(a * 5 - variant))
      - Math.hypot(x - middle, y - middle);
  };
  // Extend the nearest existing native dry approach to the irregular collar.
  // No central cross is introduced, and native water is not mistaken for dry land.
  for (const [dx, dy] of directions) {
    let stand: Point | undefined, score = Infinity;
    for (let y = CELL / 2; y < size; y += CELL) for (let x = CELL / 2; x < size; x += CELL) {
      if (depth(x, y) < COLLAR || !grid.isWalkable(x, y) || grid.regionAt(x, y) === 'water') continue;
      const d = (dx ? dx < 0 ? x : size - x : dy < 0 ? y : size - y) * 10 + Math.abs(dx ? y - middle : x - middle);
      if (d < score) { stand = { x, y }; score = d; }
    }
    if (!stand) throw Error('Regional source lacks a native approach: ' + builder);
    grid.carveCorridor(stand.x, stand.y, dx < 0 ? 0 : dx > 0 ? size : stand.x,
      dy < 0 ? 0 : dy > 0 ? size : stand.y, COLLAR / 2);
  }
  const rows: string[][] = [];
  for (let y = 0; y < n; y++) {
    const row: string[] = [];
    for (let x = 0; x < n; x++) {
      const cx = (x + .5) * CELL, cy = (y + .5) * CELL, d = depth(cx, cy);
      if (d < 0) { row.push('.'); continue; }
      if (d < COLLAR) { row.push('g'); continue; }
      const region = grid.regionAt(cx, cy);
      row.push(region === 'water' ? 'w' : region === 'locale_bridge' ? 'c' : grid.isWalkable(cx, cy) ? 'g' : 'b');
    }
    rows.push(row);
  }
  const foundationRows = rows.map(row => row.join(''));
  const components = ['cloister_walk', 'ossuary_spokes'].includes(builder) ? composePools(rows, pools, builder === 'cloister_walk' ? 1 : 2) : [];
  if (!connected(rows)) throw Error('Disconnected regional source: ' + builder + '/' + extent);
  const safe = (x: number, y: number): boolean => {
    if (x < 1 || y < 1 || x >= n - 1 || y >= n - 1) return false;
    for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (!dry(rows[yy][xx])) return false;
    return true;
  };
  const ports: Port[] = [], navigation: Point[] = [];
  for (const [dx, dy] of directions) {
    let port: Port | undefined, score = Infinity;
    for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
      if (rows[y][x] !== 'g' || rows[y + dy][x + dx] !== '.' || !safe(x - dx * 2, y - dy * 2)) continue;
      // Cardinal port positions are near the corresponding axis; the envelope
      // remains natural rather than acquiring four square protruding aprons.
      const d = Math.abs(dx ? y + .5 - n / 2 : x + .5 - n / 2) * n
        + (dx ? dx < 0 ? x : n - x : dy < 0 ? y : n - y);
      if (d < score) { port = { x, y, dx, dy }; score = d; }
    }
    if (!port) throw Error('Regional source lacks a body-clear outer port');
    ports.push(port); navigation.push({ x: port.x - dx * 2, y: port.y - dy * 2 });
  }
  // Central and distributed interior anchors make later site composition prove
  // the parent route, rather than merely proving its outer bypass stayed open.
  const targets: Point[] = [{ x: n / 2, y: n / 2 },
    ...directions.map(([dx, dy]) => ({ x: n / 2 + dx * extent / CELL * .27, y: n / 2 + dy * extent / CELL * .27 }))];
  for (const target of targets) {
    let best: Point | undefined, score = Infinity;
    for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
      if (!safe(x, y) || navigation.some(a => Math.hypot(a.x - x, a.y - y) < 4)) continue;
      const d = (x + .5 - target.x) ** 2 + (y + .5 - target.y) ** 2;
      if (d < score) { best = { x, y }; score = d; }
    }
    if (best) navigation.push(best);
  }
  return freezeData({ id: builder + '/' + variant + '/extent-' + extent,
    source: 'main/district-builders/' + builder, builder, params, rows: rows.map(row => row.join('')),
    components, navigation, ports, ...(components.length ? { foundationRows } : {}) });
}

let policy: MassRegionalLandformPolicy | undefined;
/** Saved regional geometry is authored once, then copied into new expeditions.
 * A continued expedition samples its captured rows, not this live registry. */
export function regionalLandformPolicy(): MassRegionalLandformPolicy {
  if (policy) return policy;
  const pools = captureLandformShape('stepping_pools', 0, 'natural');
  const sources: [string, number, number][] = [
    ['cloister_walk', 1, 3300], ['cloister_walk', 1, 6000], ['cloister_walk', 1, 6600],
    ['stepping_pools', 1, 3300], ['stepping_pools', 0, 6000], ['stepping_pools', 1, 6600],
    ['ossuary_spokes', 0, 3300], ['ossuary_spokes', 0, 6000], ['ossuary_spokes', 1, 6600],
    ['ridge_spurs', 0, 3300], ['ridge_spurs', 1, 6000], ['ridge_spurs', 1, 6600],
    ['braided_thickets', 0, 3300], ['braided_thickets', 1, 6600],
    ['sunken_channels', 0, 3300], ['sunken_channels', 1, 6000],
    ['terraced_homes', 0, 3300], ['terraced_homes', 1, 6600],
    ['crypt_wings', 0, 3300], ['crypt_wings', 1, 6600],
  ];
  const shapes = sources.map(([builder, variant, extent]) => captureRegionalShape(builder, variant, extent, pools));
  if (!shapes.some(s => s.builder === 'cloister_walk' && s.components.length)) throw Error('Regional Y court lost its nested pools');
  const ids = (...builders: string[]): string[] => shapes.filter(s => builders.includes(s.builder)).map(s => s.id);
  policy = freezeData({ source: 'worldmass/native-regional-substrates-v1', version: 1, spacing: 9600,
    chance: .65, jitter: .12, siteApron: 120, maxAlteredFraction: .12, shapes,
    recipes: [
      { id: 'regional-highland-passages', biomes: ['highland', 'mountain', 'tundra', 'downs', 'forest'], when: [{ field: 'elevation', min: .42 }],
        shapes: ids('ridge_spurs', 'terraced_homes', 'ossuary_spokes'), barrier: { region: 'crag', color: '#57584d' } },
      { id: 'regional-frozen-ridges', biomes: ['tundra'], when: [],
        shapes: ids('ridge_spurs', 'cloister_walk', 'crypt_wings'), barrier: { region: 'crag', color: '#69787a' } },
      { id: 'regional-woodland-passages', biomes: ['forest'], when: [],
        shapes: ids('braided_thickets', 'cloister_walk', 'stepping_pools', 'ossuary_spokes'), barrier: { region: 'hedgewall', color: '#2d4225' } },
      { id: 'regional-wetland-crossings', biomes: ['marsh'], when: [],
        shapes: ids('sunken_channels', 'stepping_pools', 'cloister_walk'), barrier: { region: 'hedgewall', color: '#334633' } },
      { id: 'regional-desert-precincts', biomes: ['desert'], when: [],
        shapes: ids('terraced_homes', 'ossuary_spokes', 'cloister_walk'), barrier: { region: 'sandstone', color: '#736149' } },
      { id: 'regional-country-precincts', biomes: ['downs'], when: [],
        shapes: ids('cloister_walk', 'terraced_homes', 'crypt_wings'), barrier: { region: 'drystone', color: '#595345' } },
    ] });
  return policy;
}
