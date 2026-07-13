// ---------------------------------------------------------------------------
// GRID WALK FIELD — the first concrete WalkField (see world/walk.ts): a coarse
// boolean walkable grid over a zone's w×h box. This is the Phase-2 foundation a
// non-convex layout (rooms+tunnels, maze, true islands) paints, and that the
// engine programs against through the WalkField interface — so a future navmesh
// can replace it with zero consumer churn (the "grid → navmesh later" path).
//
// ONE structure answers everything: collision (isWalkable / snapToWalkable),
// reachability for spawn placement (region labels), and AI pathing (a cached
// BFS distance-field → pathStep). Fully deterministic from the cells painted, so
// it reproduces across revisit/reload and replicates to co-op clients (pack/unpack).
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import type { WalkField } from './walk';
import { regionKind } from './regions';

export const DEFAULT_CELL = 30;

/** Framework knobs for the grid's repaint + cache machinery — every collapse,
 *  terraform and door break rides these, so they live here as config, never
 *  as inline magic numbers. */
export const WALK_CFG = {
  /** Dirty-rect ring capacity. A living collapse can void a couple dozen
   *  cells in ONE tick (each its own rect) and a GC hitch makes the sim run
   *  catch-up ticks before the renderer next consumes the ring — at 64 the
   *  ring flooded routinely and every baked chunk went stale at once. */
  dirtyMax: 192,
  /** LRU slots for BFS distance fields (see distCache field doc). */
  distCacheMax: 32,
  /** STALE distance-field refreshes allowed per tick (beginFrame resets).
   *  A repaint no longer clears the path cache — fields go stale and
   *  re-shoot a few per tick, budgeted, while chasers keep steering on the
   *  slightly-stale field (stepToward reads the walkable mask LIVE, so
   *  nobody ever steps onto a freshly-voided cell). The old eager clear made
   *  every pathing monster re-run a full-grid BFS — with a fresh Int32Array
   *  each — EVERY tick for as long as ground kept melting: the aetherial
   *  ambient-melt GC-hitch lag. */
  distRefreshPerTick: 3,
  /** Hard staleness bound (ticks): a field the budget never reached refreshes
   *  anyway once this old, so a big herd's tail can't steer on ancient
   *  distances forever. Deterministic — tick-counted, never wall-clock. */
  distMaxStaleTicks: 30,
} as const;

/** The transferable form of a GridWalkField (co-op: ship region kinds, derive the
 *  walkable mask client-side). `kinds` is the byte→region-id table so a client maps
 *  the packed bytes identically regardless of its own registration order. */
export interface PackedWalk { cols: number; rows: number; cell: number; kinds: string[]; kbits: string; }

export class GridWalkField implements WalkField {
  readonly cols: number;
  readonly rows: number;
  readonly cell: number;
  /** 1 = walkable, 0 = blocked. A DERIVED CACHE of regionKind(kindOf(i)).walkable,
   *  so isWalkable/reachable/pathStep/BFS stay fast + unchanged. */
  readonly mask: Uint8Array;
  /** Per-cell region-kind BYTE (Phase 3). 0 = the default 'wall'. Indexes kindList. */
  readonly kind: Uint8Array;
  /** byte → region-kind id. Byte 0 is always 'wall' (the unpainted default), so an
   *  all-zero kind array = an all-blocked grid (byte-identical to Phase 2). */
  private kindList: string[] = ['wall'];
  /** Bumped on every region repaint (door breaks, terraforms) — cache-keying
   *  seam for anything that bakes the grid (the renderer's ground chunks). */
  version = 0;
  /** The WORLD-SPACE rects of recent repaints, each stamped with the version
   *  it produced — so a baker invalidates ONLY the chunks a repaint actually
   *  touched instead of rebaking every visible chunk the same frame (a
   *  growing fissure used to trigger exactly that stutter). A bounded ring:
   *  when it overflows, `dirtyFloodV` rises and anything baked at or before
   *  that version counts as stale (correct, just less precise). */
  readonly dirty: { x0: number; y0: number; x1: number; y1: number; v: number }[] = [];
  dirtyFloodV = 0;

  private pushDirty(x0: number, y0: number, x1: number, y1: number): void {
    this.version++;
    this.dirty.push({ x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), v: this.version });
    if (this.dirty.length > WALK_CFG.dirtyMax) {
      const dropped = this.dirty.shift()!;
      this.dirtyFloodV = Math.max(this.dirtyFloodV, dropped.v);
    }
  }
  /** Connected-component label per cell (-1 = blocked / unlabeled). Lazy,
   *  version-stamped, recomputed IN PLACE — a repaint costs nothing until the
   *  next reachable() actually asks. */
  private region: Int32Array | null = null;
  private regionV = -1;
  /** LRU of BFS distance-fields keyed by target cell — so the common mix of the
   *  player cell + a few brain targets (caster strafe / assassin / commander) all
   *  stay warm in a frame instead of evicting each other (single-slot thrash).
   *  Sized for a FIELD's worth of wanderers: a big herd pathing to distinct
   *  targets under an 8-slot cache recomputed a full-grid BFS nearly every
   *  pathStep (~1.4ms × dozens of actors × every frame — the "Fields
   *  sometimes stutter" report). ~130KB per field on the largest grids.
   *  Entries are VERSION-STAMPED, refreshed in place under the per-tick
   *  budget (WALK_CFG.distRefreshPerTick — see beginFrame). */
  private distCache = new Map<number, { d: Int32Array; v: number; t: number }>();
  /** One retired distance field kept for reuse — an eviction hands its array
   *  to the next miss instead of the GC. */
  private spareDist: Int32Array | null = null;
  /** Scratch BFS/flood queue shared by every recompute on this grid. */
  private scratchQ: number[] = [];
  /** Tick counter + per-tick refresh budget (see beginFrame). Un-ticked
   *  grids (generation, headless QA) keep an infinite budget — every stale
   *  query refreshes immediately, the pre-budget behavior. */
  private tick = 0;
  private refreshesLeft = Infinity;

  /** ONE call per sim tick (the World's update makes it — the WalkField
   *  seam): resets the stale-field refresh budget and advances the staleness
   *  clock. Purely tick-counted, so the sim harness stays deterministic. */
  beginFrame(): void {
    this.tick++;
    this.refreshesLeft = WALK_CFG.distRefreshPerTick;
  }

  constructor(w: number, h: number, cell = DEFAULT_CELL) {
    this.cell = cell;
    this.cols = Math.max(1, Math.ceil(w / cell));
    this.rows = Math.max(1, Math.ceil(h / cell));
    this.mask = new Uint8Array(this.cols * this.rows);
    this.kind = new Uint8Array(this.cols * this.rows); // all 0 = 'wall'
  }

  /** Sweep granularity for swept collision (the WalkField contract). */
  get cellSize(): number { return this.cell; }

  /** byte for a region id (find-or-add to the per-grid table). */
  private kindByte(id: string): number {
    let b = this.kindList.indexOf(id);
    if (b < 0) { b = this.kindList.length; this.kindList.push(id); }
    return b;
  }

  private cx(x: number): number { return Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cell))); }
  private cy(y: number): number { return Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cell))); }
  private centerX(cx: number): number { return (cx + 0.5) * this.cell; }
  private centerY(cy: number): number { return (cy + 0.5) * this.cell; }
  private inGrid(cx: number, cy: number): boolean { return cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows; }

  // --- authoring (used by a layout generator) --------------------------------

  /** Paint a WORLD-space rectangle [x0,y0]-[x1,y1] with a REGION KIND. Sets the
   *  per-cell kind byte AND derives the walkable mask from that kind's policy — the
   *  Phase-3 primitive (void/deep_water/air_pocket/ground/wall are all kinds).
   *
   *  `quiet` is the BAKE-INERT contract (the flux fabric's steady churn): the
   *  caller promises the repaint cannot change a baked pixel — every kind it
   *  writes is a `window` visual with no edge — so the version still bumps
   *  (pathing + region labels stay honest) but NO dirty rect is pushed: floor
   *  chunks never stale and the dirty ring never floods under a drift of a
   *  dozen moving carriers. Never pass it for a repaint a bake can see. */
  fillRegion(x0: number, y0: number, x1: number, y1: number, id: string, quiet = false): void {
    const byte = this.kindByte(id);
    const walkable = regionKind(id)?.walkable ? 1 : 0;
    const a = this.cx(Math.min(x0, x1)), b = this.cx(Math.max(x0, x1));
    const c = this.cy(Math.min(y0, y1)), d = this.cy(Math.max(y0, y1));
    for (let cy = c; cy <= d; cy++) for (let cx = a; cx <= b; cx++) {
      const i = cy * this.cols + cx;
      this.kind[i] = byte; this.mask[i] = walkable;
    }
    if (quiet) { this.version++; return; }
    // No eager cache clears: pushDirty's version bump lazily stales the
    // region labels and distance fields (they refresh in place, budgeted).
    this.pushDirty(x0, y0, x1, y1);
  }

  /** Paint walkable ('ground') or blocked ('wall') — the Phase-2 wrapper over
   *  fillRegion, so existing generators (rooms/islands) are byte-identical. */
  fillRect(x0: number, y0: number, x1: number, y1: number, walkable = true): void {
    this.fillRegion(x0, y0, x1, y1, walkable ? 'ground' : 'wall');
  }

  /** Paint a WORLD-space DISC of cells with a region kind — organic chambers (the
   *  flesh layout) instead of rectangles. Cell centers within `r` of (cx,cy) flip. */
  fillDisc(cx: number, cy: number, r: number, id: string): void {
    const byte = this.kindByte(id);
    const walkable = regionKind(id)?.walkable ? 1 : 0;
    const a = this.cx(cx - r), b = this.cx(cx + r), c = this.cy(cy - r), d = this.cy(cy + r);
    const r2 = r * r;
    for (let gy = c; gy <= d; gy++) for (let gx = a; gx <= b; gx++) {
      const px = (gx + 0.5) * this.cell - cx, py = (gy + 0.5) * this.cell - cy;
      if (px * px + py * py > r2) continue;
      const i = gy * this.cols + gx;
      this.kind[i] = byte; this.mask[i] = walkable;
    }
    this.pushDirty(cx - r, cy - r, cx + r, cy + r);
  }

  /** Paint a WORLD-space thick line (corridor) walkable, `halfW` to each side. */
  carveCorridor(ax: number, ay: number, bx: number, by: number, halfW: number): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (this.cell * 0.5)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      this.fillRect(x - halfW, y - halfW, x + halfW, y + halfW, true);
    }
  }

  /** Count of walkable cells (sanity / density). */
  walkableCount(): number { let n = 0; for (const v of this.mask) if (v) n++; return n; }

  // --- WalkField interface ---------------------------------------------------

  isWalkable(x: number, y: number): boolean {
    const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);
    if (!this.inGrid(cx, cy)) return false;
    return this.mask[cy * this.cols + cx] === 1;
  }

  /** The REGION KIND id at a point (Phase 3) — 'wall' out of bounds. The engine's
   *  collision policy + per-frame region effects ask THIS, not a bare bool. */
  regionAt(x: number, y: number): string {
    const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);
    if (!this.inGrid(cx, cy)) return 'wall';
    return this.kindList[this.kind[cy * this.cols + cx]] ?? 'wall';
  }

  /** Nearest walkable point — a ring search outward from the point's cell,
   *  returning that cell's CENTER (a safe interior point). Falls back to the
   *  point itself if the grid is somehow empty. */
  snapToWalkable(p: Vec2): Vec2 {
    const sx = this.cx(p.x), sy = this.cy(p.y);
    if (this.mask[sy * this.cols + sx] === 1) return vec(this.centerX(sx), this.centerY(sy));
    const maxR = Math.max(this.cols, this.rows);
    let best = -1, bestD = Infinity;
    for (let r = 1; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // ring only
          const cx = sx + dx, cy = sy + dy;
          if (!this.inGrid(cx, cy) || this.mask[cy * this.cols + cx] !== 1) continue;
          const d = (this.centerX(cx) - p.x) ** 2 + (this.centerY(cy) - p.y) ** 2;
          if (d < bestD) { bestD = d; best = cy * this.cols + cx; }
        }
      }
      if (best >= 0) break; // first ring with a hit is nearest
    }
    if (best < 0) return vec(p.x, p.y);
    return vec(this.centerX(best % this.cols), this.centerY(Math.floor(best / this.cols)));
  }

  reachable(from: Vec2, to: Vec2): boolean {
    const reg = this.regions();
    const a = reg[this.cy(from.y) * this.cols + this.cx(from.x)];
    const b = reg[this.cy(to.y) * this.cols + this.cx(to.x)];
    return a >= 0 && a === b;
  }

  /** Straight-line walkability (the any-angle shortcut): half-cell march over
   *  the mask, start cell excused (you stand where you stand). Steering
   *  beelines while this holds and pays for a flow-field step only when the
   *  line actually crosses blocked cells. */
  lineWalkable(from: Vec2, to: Vec2): boolean {
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    const step = this.cell / 2;
    for (let s = step; s <= len; s += step) {
      if (!this.isWalkable(from.x + dx * (s / len), from.y + dy * (s / len))) return false;
    }
    return len <= 0 || this.isWalkable(to.x, to.y);
  }

  /** One step from `from` toward `to` that respects walls — flow-field following.
   *  Returns the centre of the next cell along the shortest walkable path, `to`
   *  itself on the final approach, or null if unreachable (caller falls back to
   *  straight-line steering). 4-connected (no diagonal wall-leaks). */
  pathStep(from: Vec2, to: Vec2): Vec2 | null {
    const tCell = this.cy(to.y) * this.cols + this.cx(to.x);
    const fCell = this.cy(from.y) * this.cols + this.cx(from.x);
    if (this.mask[tCell] !== 1) {
      const s = this.snapToWalkable(to); // target off-mesh → aim at nearest walkable
      const sc = this.cy(s.y) * this.cols + this.cx(s.x);
      if (this.mask[sc] !== 1) return null;
      return this.stepToward(fCell, sc, from, s);
    }
    return this.stepToward(fCell, tCell, from, to);
  }

  private stepToward(fCell: number, tCell: number, from: Vec2, to: Vec2): Vec2 | null {
    if (fCell === tCell) return vec(to.x, to.y);
    const dist = this.distanceTo(tCell);
    if (this.mask[fCell] !== 1 || dist[fCell] < 0) return null; // actor off-mesh / unreachable
    if (dist[fCell] <= 1) return vec(to.x, to.y); // adjacent → walk straight in
    const cx = fCell % this.cols, cy = Math.floor(fCell / this.cols);
    let bestC = -1, bestD = dist[fCell];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!this.inGrid(nx, ny)) continue;
      const nc = ny * this.cols + nx;
      if (this.mask[nc] !== 1 || dist[nc] < 0) continue;
      if (dist[nc] < bestD) { bestD = dist[nc]; bestC = nc; }
    }
    if (bestC < 0) return vec(to.x, to.y);
    return vec(this.centerX(bestC % this.cols), this.centerY(Math.floor(bestC / this.cols)));
  }

  /** BFS distance-field to a target cell, LRU-cached (all chasers of one target
   *  share its field; a few distinct targets coexist without evicting each other).
   *  A stale hit (the grid repainted since it shot) refreshes IN PLACE under the
   *  per-tick budget — else it serves as-is: stepToward reads the walkable mask
   *  live, so a stale field can misroute a step or two, never step onto void. */
  private distanceTo(tCell: number): Int32Array {
    const hit = this.distCache.get(tCell);
    if (hit) {
      this.distCache.delete(tCell); this.distCache.set(tCell, hit); // refresh LRU
      if (hit.v !== this.version
        && (this.refreshesLeft > 0 || this.tick - hit.t >= WALK_CFG.distMaxStaleTicks)) {
        this.refreshesLeft--;
        this.bfsInto(hit.d, tCell);
        hit.v = this.version; hit.t = this.tick;
      }
      return hit.d;
    }
    // A genuinely new target always shoots (serving nothing isn't an option);
    // the array comes from the last eviction when one is waiting.
    const d = this.spareDist ?? new Int32Array(this.cols * this.rows);
    this.spareDist = null;
    this.bfsInto(d, tCell);
    this.distCache.set(tCell, { d, v: this.version, t: this.tick });
    if (this.distCache.size > WALK_CFG.distCacheMax) {
      const oldest = this.distCache.keys().next().value as number; // evict oldest
      const old = this.distCache.get(oldest);
      this.distCache.delete(oldest);
      if (old) this.spareDist = old.d;
    }
    return d;
  }

  /** Shoot a BFS distance field from `tCell` into `d` (reused storage). */
  private bfsInto(d: Int32Array, tCell: number): void {
    d.fill(-1);
    d[tCell] = 0;
    const q = this.scratchQ;
    q.length = 0;
    q.push(tCell);
    for (let head = 0; head < q.length; head++) {
      const c = q[head], cx = c % this.cols, cy = (c / this.cols) | 0, nd = d[c] + 1;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;
        const nc = ny * this.cols + nx;
        if (this.mask[nc] !== 1 || d[nc] >= 0) continue;
        d[nc] = nd; q.push(nc);
      }
    }
    q.length = 0; // don't pin a grid-sized queue between recomputes
  }

  /** Connected-component labels (flood-fill), version-stamped and recomputed
   *  in place — reachable() stays exact through every repaint, without the
   *  old alloc-per-repaint churn. */
  private regions(): Int32Array {
    if (this.region && this.regionV === this.version) return this.region;
    const n = this.cols * this.rows;
    const reg = this.region ?? (this.region = new Int32Array(n));
    reg.fill(-1);
    let label = 0;
    const q = this.scratchQ;
    for (let start = 0; start < n; start++) {
      if (this.mask[start] !== 1 || reg[start] >= 0) continue;
      q.length = 0;
      q.push(start); reg[start] = label;
      for (let head = 0; head < q.length; head++) {
        const c = q[head], cx = c % this.cols, cy = (c / this.cols) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;
          const nc = ny * this.cols + nx;
          if (this.mask[nc] !== 1 || reg[nc] >= 0) continue;
          reg[nc] = label; q.push(nc);
        }
      }
      label++;
    }
    q.length = 0;
    this.regionV = this.version;
    return reg;
  }

  // --- serialization (co-op: ship region kinds; derive the mask client-side) ---

  /** Pack to a transferable form: the byte→id table + the per-cell kind bytes. The
   *  walkable mask is DERIVED on unpack, so kinds are the single source of truth. */
  pack(): PackedWalk {
    let s = '';
    for (const b of this.kind) s += String.fromCharCode(b);
    return { cols: this.cols, rows: this.rows, cell: this.cell, kinds: this.kindList.slice(), kbits: btoa(s) };
  }

  static unpack(p: PackedWalk): GridWalkField {
    const g = new GridWalkField(p.cols * p.cell, p.rows * p.cell, p.cell);
    g.kindList = p.kinds.slice();
    const s = atob(p.kbits);
    for (let i = 0; i < g.kind.length; i++) {
      const b = s.charCodeAt(i) || 0;
      g.kind[i] = b;
      g.mask[i] = regionKind(g.kindList[b])?.walkable ? 1 : 0;
    }
    return g;
  }
}
