// ---------------------------------------------------------------------------
// GRID SPINE HELPERS — the shared geometry of the vertical fabrics.
//
// Both dissolving ground (engine/collapse.ts) and shifting ground
// (engine/flux.ts) reason about the same two things over a zone's walk grid:
// a BFS distance field over WALKABLE cells, and THE SPINE — the entry→goal
// walk whose promise the fabric keeps (the causeway the collapse erodes last;
// the pad ladder the flux keeps chainable). One implementation, two riders —
// extracted verbatim from the collapse's constructor so its schedules stay
// byte-identical.
//
// Pure leaf: a structural walk slice only — no engine imports, no cycles.
// ---------------------------------------------------------------------------

/** The walk-grid slice the helpers read (GridWalkField fits it). */
export interface SpineWalk {
  readonly cols: number;
  readonly rows: number;
  readonly cell: number;
  isWalkable(x: number, y: number): boolean;
}

const DIRS: readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** The cell index containing a world point (clamped into the grid). */
export function cellIndexOf(walk: SpineWalk, p: { x: number; y: number }): number {
  return Math.min(walk.rows - 1, Math.max(0, Math.floor(p.y / walk.cell))) * walk.cols
    + Math.min(walk.cols - 1, Math.max(0, Math.floor(p.x / walk.cell)));
}

/** BFS distance field (4-connected, WALKABLE cells only) from a seed set.
 *  -1 = unreachable. Distances double as "rings outward" for schedules. */
export function gridBfs(walk: SpineWalk, seeds: readonly number[]): Int32Array {
  const n = walk.cols * walk.rows;
  const cell = walk.cell;
  const walkableAt = (i: number): boolean =>
    walk.isWalkable((i % walk.cols + 0.5) * cell, ((i / walk.cols | 0) + 0.5) * cell);
  const d = new Int32Array(n).fill(-1);
  const q: number[] = [];
  for (const s of seeds) if (s >= 0 && s < n && walkableAt(s)) { d[s] = 0; q.push(s); }
  for (let head = 0; head < q.length; head++) {
    const c = q[head], gx = c % walk.cols, gy = c / walk.cols | 0, nd = d[c] + 1;
    for (const [dx, dy] of DIRS) {
      const nx = gx + dx, ny = gy + dy;
      if (nx < 0 || ny < 0 || nx >= walk.cols || ny >= walk.rows) continue;
      const nc = ny * walk.cols + nx;
      if (d[nc] >= 0 || !walkableAt(nc)) continue;
      d[nc] = nd; q.push(nc);
    }
  }
  return d;
}

/** THE SPINE: gradient-walk the entry down the goal's BFS field. An entry cut
 *  off from the goal (shouldn't happen — generation guarantees reachability)
 *  snaps to the nearest cell that reaches it, so the walk degrades to a
 *  goal-anchored spine instead of an empty one. Returns the path (entry→goal
 *  cell indices, goal inclusive) plus the goal distance field it walked. */
export function gridSpine(walk: SpineWalk, entry: { x: number; y: number },
  goal: { x: number; y: number }): { spine: Int32Array; dGoal: Int32Array } {
  const n = walk.cols * walk.rows;
  const cell = walk.cell;
  const goalCell = cellIndexOf(walk, goal);
  const dGoal = gridBfs(walk, [goalCell]);
  const spine: number[] = [];
  let cur = cellIndexOf(walk, entry);
  if (dGoal[cur] < 0) {
    // Snap to the nearest cell that reaches the goal.
    let best = -1, bd = Infinity;
    for (let i = 0; i < n; i++) {
      if (dGoal[i] < 0) continue;
      const dd = ((i % walk.cols + 0.5) * cell - entry.x) ** 2
        + (((i / walk.cols | 0) + 0.5) * cell - entry.y) ** 2;
      if (dd < bd) { bd = dd; best = i; }
    }
    cur = best >= 0 ? best : goalCell;
  }
  let guard = n + 4;
  while (cur !== goalCell && guard-- > 0) {
    spine.push(cur);
    const gx = cur % walk.cols, gy = cur / walk.cols | 0;
    let next = -1, bd = dGoal[cur];
    for (const [dx, dy] of DIRS) {
      const nx = gx + dx, ny = gy + dy;
      if (nx < 0 || ny < 0 || nx >= walk.cols || ny >= walk.rows) continue;
      const nc = ny * walk.cols + nx;
      if (dGoal[nc] >= 0 && dGoal[nc] < bd) { bd = dGoal[nc]; next = nc; }
    }
    if (next < 0) break;
    cur = next;
  }
  spine.push(goalCell);
  return { spine: Int32Array.from(spine), dGoal };
}
