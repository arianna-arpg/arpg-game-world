/** Observe finished terrain without changing it or consuming random numbers.
 * Four-neighbor, point-body, open-door grid metrics; NOT live actor pathing.
 * Keep this in balance/: no generation or per-frame runtime cost. */
import type { Vec2 } from '../src/core/math';

export interface TerrainGrid {
  cols: number; rows: number; cell: number; mask: Uint8Array;
}
export const EXPLORATION_CFG = {
  /** Extra grid steps permitted beyond a shortest entry-to-exit route. */
  routeSlackCells: 4,
  /** Cell-center Manhattan distance to a blocked cell (outside counts). */
  narrowClearanceCells: 2,
};
export interface RouteMetric {
  reachable: boolean;
  distancePx: number | null;
  /** Versus Manhattan cell distance, so an unobstructed diagonal is 1. */
  detour: number | null;
}
export interface ExplorationMetrics {
  walkableCells: number;
  coverage: number;
  components: number;
  entryWalkable: boolean;
  reachableCells: number;
  reachableFraction: number;
  farthestDistancePx: number | null;
  narrowFraction: number | null;
  /** Union of ALL near-shortest exit paths, not one arbitrary BFS parent. */
  offRouteFraction: number | null;
  exits: RouteMetric[];
  pois: RouteMetric[];
}

export function measureExploration(grid: TerrainGrid, entry: Vec2,
  exits: readonly Vec2[], pois: readonly Vec2[] = [],
  options: Partial<typeof EXPLORATION_CFG> = {}): ExplorationMetrics {
  const { cols, rows, cell, mask } = grid;
  if (!Number.isSafeInteger(cols) || !Number.isSafeInteger(rows) || cols < 1 || rows < 1
    || !Number.isFinite(cell) || cell <= 0 || mask.length !== cols * rows) {
    throw new Error('exploration: invalid grid dimensions');
  }
  const cfg = { ...EXPLORATION_CFG, ...options };
  for (const v of Object.values(cfg)) {
    if (!Number.isSafeInteger(v) || v < 0) throw new Error('exploration: dials must be nonnegative integers');
  }
  const size = mask.length, queue = new Int32Array(size);
  const neighbors = (i: number, visit: (j: number) => void): void => {
    if (i % cols > 0) visit(i - 1);
    if (i % cols + 1 < cols) visit(i + 1);
    if (i >= cols) visit(i - cols);
    if (i + cols < size) visit(i + cols);
  };
  const index = (p: Vec2): number => {
    const x = Math.floor(p.x / cell), y = Math.floor(p.y / cell);
    return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x < cols && y < rows
      ? y * cols + x : -1;
  };
  const flood = (start: number): Int32Array => {
    const d = new Int32Array(size).fill(-1);
    if (start < 0 || !mask[start]) return d;
    let head = 0, tail = 1;
    queue[0] = start; d[start] = 0;
    while (head < tail) {
      const i = queue[head++];
      neighbors(i, j => {
        if (mask[j] && d[j] < 0) { d[j] = d[i] + 1; queue[tail++] = j; }
      });
    }
    return d;
  };
  // One linear component census, including pockets unreachable from entry.
  const seen = new Uint8Array(size);
  let components = 0, walkableCells = 0;
  for (let i = 0; i < size; i++) {
    if (!mask[i]) continue;
    walkableCells++;
    if (seen[i]) continue;
    components++;
    let head = 0, tail = 1;
    queue[0] = i; seen[i] = 1;
    while (head < tail) neighbors(queue[head++], j => {
      if (mask[j] && !seen[j]) { seen[j] = 1; queue[tail++] = j; }
    });
  }
  // Manhattan distance transform. The arena exterior is blocked even when
  // every cell inside is open. Two scans avoid a second flood/priority queue.
  const clearance = new Int32Array(size);
  for (let i = 0; i < size; i++) {
    if (!mask[i]) continue;
    const x = i % cols, y = Math.floor(i / cols);
    clearance[i] = Math.min(x + 1, y + 1, cols - x, rows - y,
      x ? clearance[i - 1] + 1 : 1, y ? clearance[i - cols] + 1 : 1);
  }
  for (let i = size - 1; i >= 0; i--) {
    if (!mask[i]) continue;
    clearance[i] = Math.min(clearance[i],
      i % cols + 1 < cols ? clearance[i + 1] + 1 : 1,
      i + cols < size ? clearance[i + cols] + 1 : 1);
  }
  const start = index(entry), distance = flood(start);
  let reachableCells = 0, narrow = 0, farthest = -1;
  for (let i = 0; i < size; i++) if (distance[i] >= 0) {
    reachableCells++;
    farthest = Math.max(farthest, distance[i]);
    if (clearance[i] <= cfg.narrowClearanceCells) narrow++;
  }
  const route = (p: Vec2): RouteMetric => {
    const at = index(p), d = at < 0 ? -1 : distance[at];
    if (d < 0) return { reachable: false, distancePx: null, detour: null };
    const direct = Math.abs(at % cols - start % cols)
      + Math.abs(Math.floor(at / cols) - Math.floor(start / cols));
    return { reachable: true, distancePx: d * cell, detour: direct ? d / direct : 1 };
  };
  const onRoute = new Uint8Array(size), exitMetrics = exits.map(route);
  let routeTargets = 0;
  for (let e = 0; e < exits.length; e++) {
    if (!exitMetrics[e].reachable) continue;
    routeTargets++;
    const at = index(exits[e]), back = flood(at);
    for (let i = 0; i < size; i++) {
      if (distance[i] >= 0 && back[i] >= 0
        && distance[i] + back[i] <= distance[at] + cfg.routeSlackCells) onRoute[i] = 1;
    }
  }
  let routeCells = 0;
  for (const v of onRoute) routeCells += v;
  return {
    walkableCells, coverage: walkableCells / size, components,
    entryWalkable: start >= 0 && !!mask[start], reachableCells,
    reachableFraction: walkableCells ? reachableCells / walkableCells : 0,
    farthestDistancePx: farthest < 0 ? null : farthest * cell,
    narrowFraction: reachableCells ? narrow / reachableCells : null,
    offRouteFraction: routeTargets ? 1 - routeCells / reachableCells : null,
    exits: exitMetrics, pois: pois.map(route),
  };
}
