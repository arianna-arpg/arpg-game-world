// ---------------------------------------------------------------------------
// GENKIT — the shape/mask PRIMITIVES the generation infrastructure composes.
//
// Everything here operates on a cell MASK aligned 1:1 with the walk grid
// (30px cells), so a shape painted through a mask lands exactly on walk
// cells — no quantization bleed, ever. The vocabulary:
//
//   Mask          a boolean cell lattice with set-algebra combinators
//                 (union / subtract / intersect / invert / edge)
//   shapes        disc, ring, halfPlane (noisy coastline edge), band along a
//                 polyline, spiral band, sampler blob (the Field composable),
//                 radial threshold (wobbled crater rims)
//   polylines     wanderPath (winding corridors/rivers), spiralPath
//   paint         region fills + liquid materials (a coast's liquid may be
//                 water, lava, poison bog, ice, void — one LiquidSpec)
//
// A geographic landmark (fjord, caldera, tombolo…) is a RECIPE over these —
// pure data + a builder; a whole-zone layout is the same recipe at arena
// scale. One kernel, every scale.
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import type { Rng } from '../core/rng';
import { GridWalkField } from '../world/gridWalk';
import type { GenCtx, DoodadKind } from './levelgen';

export const GEN_CELL = 30; // the walk-grid cell — masks align 1:1

// --- MASK ---------------------------------------------------------------------

export class Mask {
  data: Uint8Array;

  constructor(public cols: number, public rows: number, public cell = GEN_CELL,
    public ox = 0, public oy = 0) {
    this.data = new Uint8Array(cols * rows);
  }

  /** A mask covering a whole arena (or any world-space rect via ox/oy). */
  static forRect(x: number, y: number, w: number, h: number, cell = GEN_CELL): Mask {
    return new Mask(Math.ceil(w / cell), Math.ceil(h / cell), cell, x, y);
  }

  /** An empty mask with the same frame as another. */
  like(): Mask { return new Mask(this.cols, this.rows, this.cell, this.ox, this.oy); }

  clone(): Mask { const m = this.like(); m.data.set(this.data); return m; }

  cx(x: number): number { return Math.floor((x - this.ox) / this.cell); }
  cy(y: number): number { return Math.floor((y - this.oy) / this.cell); }
  /** World-space center of a cell. */
  center(cx: number, cy: number): Vec2 {
    return vec(this.ox + (cx + 0.5) * this.cell, this.oy + (cy + 0.5) * this.cell);
  }

  get(cx: number, cy: number): boolean {
    if (cx < 0 || cx >= this.cols || cy < 0 || cy >= this.rows) return false;
    return this.data[cy * this.cols + cx] === 1;
  }

  set(cx: number, cy: number, v: boolean): void {
    if (cx < 0 || cx >= this.cols || cy < 0 || cy >= this.rows) return;
    this.data[cy * this.cols + cx] = v ? 1 : 0;
  }

  /** Is a WORLD point inside the mask? */
  has(x: number, y: number): boolean { return this.get(this.cx(x), this.cy(y)); }

  count(): number { let n = 0; for (const v of this.data) n += v; return n; }

  // Set algebra — mutating, chainable (a.union(b).subtract(c)).
  union(o: Mask): this { for (let i = 0; i < this.data.length; i++) if (o.data[i]) this.data[i] = 1; return this; }
  subtract(o: Mask): this { for (let i = 0; i < this.data.length; i++) if (o.data[i]) this.data[i] = 0; return this; }
  intersect(o: Mask): this { for (let i = 0; i < this.data.length; i++) if (!o.data[i]) this.data[i] = 0; return this; }
  invert(): this { for (let i = 0; i < this.data.length; i++) this.data[i] = this.data[i] ? 0 : 1; return this; }

  /** Cells of this mask with at least one 4-neighbor OUTSIDE it (the rim). */
  edge(): Mask {
    const e = this.like();
    for (let cy = 0; cy < this.rows; cy++) {
      for (let cx = 0; cx < this.cols; cx++) {
        if (!this.get(cx, cy)) continue;
        if (!this.get(cx - 1, cy) || !this.get(cx + 1, cy) || !this.get(cx, cy - 1) || !this.get(cx, cy + 1)) {
          e.set(cx, cy, true);
        }
      }
    }
    return e;
  }

  /** Grow (dilate) by n cells (4-neighborhood). */
  grow(n = 1): this {
    for (let k = 0; k < n; k++) {
      const src = this.clone();
      for (let cy = 0; cy < this.rows; cy++) {
        for (let cx = 0; cx < this.cols; cx++) {
          if (src.get(cx, cy) || src.get(cx - 1, cy) || src.get(cx + 1, cy) || src.get(cx, cy - 1) || src.get(cx, cy + 1)) {
            this.set(cx, cy, true);
          }
        }
      }
    }
    return this;
  }

  /** Shrink (erode) by n cells (4-neighborhood) — grow's inverse. A cell
   *  survives only while all 4 neighbors are set, so `grow(n).erode(n)` is a
   *  morphological CLOSE: gaps up to ~2n cells between bodies fuse shut while
   *  everything already solid comes back untouched. Out-of-frame counts as
   *  unset (a body flush against the mask frame erodes at that edge — pours
   *  never reach the frame, which is padded past the zone border). */
  erode(n = 1): this {
    for (let k = 0; k < n; k++) {
      const src = this.clone();
      for (let cy = 0; cy < this.rows; cy++) {
        for (let cx = 0; cx < this.cols; cx++) {
          if (!src.get(cx, cy)) continue;
          if (!src.get(cx - 1, cy) || !src.get(cx + 1, cy) || !src.get(cx, cy - 1) || !src.get(cx, cy + 1)) {
            this.set(cx, cy, false);
          }
        }
      }
    }
    return this;
  }

  /** Largest 4-connected component (drop stray specks a noisy shape leaves). */
  largestComponent(): Mask {
    const label = new Int32Array(this.data.length).fill(-1);
    let best = -1, bestSize = 0, next = 0;
    const qx: number[] = [], qy: number[] = [];
    for (let sy = 0; sy < this.rows; sy++) {
      for (let sx = 0; sx < this.cols; sx++) {
        if (!this.get(sx, sy) || label[sy * this.cols + sx] >= 0) continue;
        const id = next++;
        let size = 0;
        qx.length = 0; qy.length = 0; qx.push(sx); qy.push(sy);
        label[sy * this.cols + sx] = id;
        while (qx.length) {
          const x = qx.pop()!, y = qy.pop()!;
          size++;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const nx = x + dx, ny = y + dy;
            if (this.get(nx, ny) && label[ny * this.cols + nx] < 0) {
              label[ny * this.cols + nx] = id;
              qx.push(nx); qy.push(ny);
            }
          }
        }
        if (size > bestSize) { bestSize = size; best = id; }
      }
    }
    const out = this.like();
    if (bestSize === 0) return out; // empty in, empty out (label -1 must not match 'best')
    for (let i = 0; i < this.data.length; i++) if (label[i] === best) out.data[i] = 1;
    return out;
  }

  forEach(fn: (cx: number, cy: number) => void): void {
    for (let cy = 0; cy < this.rows; cy++) {
      for (let cx = 0; cx < this.cols; cx++) if (this.data[cy * this.cols + cx]) fn(cx, cy);
    }
  }
}

// --- SHAPES ---------------------------------------------------------------------
// Each ORs its shape into the given mask (world-space params) and returns it,
// so shapes chain: disc(m, …); ring(m, …).

export function disc(m: Mask, x: number, y: number, r: number): Mask {
  const r2 = r * r;
  // Bounded to the circle's bbox — same cells set, but a fuse pass rasterizing
  // hundreds of discs over an arena-sized mask stays O(area of the discs).
  const cx0 = Math.max(0, m.cx(x - r)), cx1 = Math.min(m.cols - 1, m.cx(x + r));
  const cy0 = Math.max(0, m.cy(y - r)), cy1 = Math.min(m.rows - 1, m.cy(y + r));
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const c = m.center(cx, cy);
      const dx = c.x - x, dy = c.y - y;
      if (dx * dx + dy * dy <= r2) m.set(cx, cy, true);
    }
  }
  return m;
}

export function ring(m: Mask, x: number, y: number, rInner: number, rOuter: number): Mask {
  const i2 = rInner * rInner, o2 = rOuter * rOuter;
  for (let cy = 0; cy < m.rows; cy++) {
    for (let cx = 0; cx < m.cols; cx++) {
      const c = m.center(cx, cy);
      const dx = c.x - x, dy = c.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= i2 && d2 <= o2) m.set(cx, cy, true);
    }
  }
  return m;
}

/** Deterministic per-lattice value noise in [-1, 1] (coastline wobble). */
function hashNoise(i: number, seed: number): number {
  let h = (i * 374761393 + seed * 668265263) >>> 0;
  h = (h ^ (h >> 13)) >>> 0; h = Math.imul(h, 1274126177) >>> 0;
  return ((h >>> 8) / 0x00ffffff) * 2 - 1;
}

/** Smooth 1D noise along a coordinate (lerped lattice) — the coastline edge. */
export function edgeNoise(t: number, amp: number, wavelength: number, seed: number): number {
  const u = t / Math.max(1, wavelength);
  const i = Math.floor(u), f = u - i;
  const s = f * f * (3 - 2 * f);
  return (hashNoise(i, seed) * (1 - s) + hashNoise(i + 1, seed) * s) * amp;
}

/** PERIODIC bearing noise for radial rims — continuous across the ±π wrap
 *  (edgeNoise fed a raw atan2 leaves a visible seam on the west bearing).
 *  A few seeded sine harmonics: cheap, seamless, organic. */
export function bearingNoise(a: number, amp: number, seed: number): number {
  const p1 = hashNoise(1, seed) * Math.PI, p2 = hashNoise(2, seed) * Math.PI, p3 = hashNoise(3, seed) * Math.PI;
  return amp * (0.55 * Math.sin(3 * a + p1) + 0.3 * Math.sin(5 * a + p2) + 0.15 * Math.sin(8 * a + p3));
}

/** HALF-PLANE with a noisy edge — THE coastline: everything on the far side of
 *  a line (angle = the OUTWARD normal, offset = distance of the edge from the
 *  mask center along that normal) joins the mask, the boundary wobbling by
 *  edge noise. A coast, a shore of any liquid, one side of a valley. */
export function halfPlane(
  m: Mask, angle: number, offset: number,
  noise?: { amp: number; wavelength: number; seed: number },
): Mask {
  const nx = Math.cos(angle), ny = Math.sin(angle);
  const midX = m.ox + (m.cols * m.cell) / 2, midY = m.oy + (m.rows * m.cell) / 2;
  for (let cy = 0; cy < m.rows; cy++) {
    for (let cx = 0; cx < m.cols; cx++) {
      const c = m.center(cx, cy);
      const along = (c.x - midX) * nx + (c.y - midY) * ny;      // signed dist along normal
      const across = -(c.x - midX) * ny + (c.y - midY) * nx;    // coordinate along the edge
      const wob = noise ? edgeNoise(across, noise.amp, noise.wavelength, noise.seed) : 0;
      if (along >= offset + wob) m.set(cx, cy, true);
    }
  }
  return m;
}

/** A BAND of halfW around a polyline — winding corridors, rivers, roads. */
export function band(m: Mask, pts: Vec2[], halfW: number): Mask {
  if (pts.length < 2) return m;
  const r2 = halfW * halfW;
  // For each cell, distance to the nearest segment (cheap for our lattice sizes).
  for (let cy = 0; cy < m.rows; cy++) {
    for (let cx = 0; cx < m.cols; cx++) {
      const c = m.center(cx, cy);
      for (let i = 0; i < pts.length - 1; i++) {
        const ax = pts[i].x, ay = pts[i].y, bx = pts[i + 1].x, by = pts[i + 1].y;
        const dx = bx - ax, dy = by - ay;
        const len2 = dx * dx + dy * dy || 1;
        let t = ((c.x - ax) * dx + (c.y - ay) * dy) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = c.x - (ax + dx * t), py = c.y - (ay + dy * t);
        if (px * px + py * py <= r2) { m.set(cx, cy, true); break; }
      }
    }
  }
  return m;
}

/** SAMPLER BLOB — rasterize any world predicate (the Field heat-map blob is
 *  exactly this: isInside = biomeAt(px→node) === 'field'). The composable the
 *  Field zone pioneered, now available to every recipe. */
export function blob(m: Mask, isInside: (x: number, y: number) => boolean): Mask {
  for (let cy = 0; cy < m.rows; cy++) {
    for (let cx = 0; cx < m.cols; cx++) {
      const c = m.center(cx, cy);
      if (isInside(c.x, c.y)) m.set(cx, cy, true);
    }
  }
  return m;
}

/** RADIAL shape — radius as a function of bearing (wobbled crater rims,
 *  organic islands, cirque bowls via a part-circle rOf). */
export function radial(m: Mask, x: number, y: number, rOf: (angle: number) => number): Mask {
  for (let cy = 0; cy < m.rows; cy++) {
    for (let cx = 0; cx < m.cols; cx++) {
      const c = m.center(cx, cy);
      const dx = c.x - x, dy = c.y - y;
      const r = rOf(Math.atan2(dy, dx));
      if (r > 0 && dx * dx + dy * dy <= r * r) m.set(cx, cy, true);
    }
  }
  return m;
}

// --- POLYLINES --------------------------------------------------------------------

/** A WINDING path a→b: coherent sideways bow + per-step jitter, always
 *  finishing straight into b (the carveWander shape, extracted as a primitive
 *  every band consumer shares — rivers, maggot-lair corridors, roads). */
export function wanderPath(
  rng: Rng, from: Vec2, to: Vec2,
  opts?: { step?: number; wobble?: number; bowFrac?: number },
): Vec2[] {
  const step = opts?.step ?? 110;
  const wobble = opts?.wobble ?? 16;
  const total = Math.hypot(to.x - from.x, to.y - from.y);
  const segs = Math.max(2, Math.round(total / step));
  const perp = Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;
  const bow = rng.range(-(opts?.bowFrac ?? 0.26), opts?.bowFrac ?? 0.26) * total;
  const pts: Vec2[] = [vec(from.x, from.y)];
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const off = Math.sin(t * Math.PI) * bow + rng.range(-wobble, wobble);
    pts.push(vec(
      from.x + (to.x - from.x) * t + Math.cos(perp) * off,
      from.y + (to.y - from.y) * t + Math.sin(perp) * off));
  }
  pts.push(vec(to.x, to.y));
  return pts;
}

/** An Archimedean SPIRAL polyline r0→r1 over `turns` revolutions. */
export function spiralPath(
  cx: number, cy: number, r0: number, r1: number, turns: number,
  opts?: { step?: number; a0?: number },
): Vec2[] {
  const step = opts?.step ?? 40;
  const a0 = opts?.a0 ?? 0;
  const total = turns * Math.PI * 2;
  const pts: Vec2[] = [];
  // Arc-length-ish stepping: advance the angle so segment length ≈ step.
  for (let a = 0; a <= total; a += step / Math.max(40, r0 + (r1 - r0) * (a / total))) {
    const r = r0 + (r1 - r0) * (a / total);
    pts.push(vec(cx + Math.cos(a0 + a) * r, cy + Math.sin(a0 + a) * r));
  }
  return pts;
}

// --- PAINT / MATERIALS ---------------------------------------------------------------

/** Paint a mask's cells as a walk-grid REGION (per-row runs → exact fills). */
export function paintRegion(grid: GridWalkField, m: Mask, regionId: string): void {
  for (let cy = 0; cy < m.rows; cy++) {
    let run = -1;
    for (let cx = 0; cx <= m.cols; cx++) {
      const on = cx < m.cols && m.get(cx, cy);
      if (on && run < 0) run = cx;
      else if (!on && run >= 0) {
        const y0 = m.oy + cy * m.cell;
        grid.fillRegion(m.ox + run * m.cell, y0, m.ox + cx * m.cell - 0.01, y0 + m.cell - 0.01, regionId);
        run = -1;
      }
    }
  }
}

/** A LIQUID — what fills a coast, a lake, a river, a moat. Composable: the
 *  same fjord recipe takes water, lava, poison bog, ice, or the void.
 *    region  — a walk-grid region painted under the liquid (deep_water, void…)
 *    doodad  — ground doodads scattered over the mask (water/lava/bog blobs,
 *              the classic merged-blob look + their terrain statuses)
 *    shallow — water only: mark the doodads fordable (wading, never swimming) */
export interface LiquidSpec {
  region?: string;
  doodad?: DoodadKind;
  shallow?: boolean;
}

/** Named liquid palette — recipes take a liquid ID so data stays terse; the
 *  registry is open (registerLiquid) for packages. */
const LIQUIDS: Record<string, LiquidSpec> = {};

export function registerLiquid(id: string, spec: LiquidSpec): void {
  if (LIQUIDS[id]) console.warn(`[genkit] re-registering liquid '${id}' — overriding`);
  LIQUIDS[id] = spec;
}

const warnedLiquids = new Set<string>();

export function liquidOf(id: string | LiquidSpec | undefined, dflt = 'water'): LiquidSpec {
  if (id && typeof id === 'object') return id;
  if (id && !LIQUIDS[id] && !warnedLiquids.has(id)) {
    warnedLiquids.add(id);
    console.warn(`[genkit] unknown liquid '${id}' — falling back to '${dflt}' (registerLiquid it)`);
  }
  return LIQUIDS[id ?? dflt] ?? LIQUIDS[dflt] ?? { doodad: 'water' };
}

export function liquidIds(): string[] { return Object.keys(LIQUIDS); }

registerLiquid('water', { doodad: 'water' });
registerLiquid('shallows', { doodad: 'water', shallow: true });
registerLiquid('deep_water', { region: 'deep_water' });          // swim + breath drain
registerLiquid('lava', { doodad: 'lava' });                       // crossable melt: cooks the uninsured
registerLiquid('magma_core', { doodad: 'magma_core' });           // the WALL: impassable slag (caldera spirals)
registerLiquid('bog', { doodad: 'bog' });                         // poison on entry
registerLiquid('swamp', { doodad: 'swamp' });
registerLiquid('ice', { doodad: 'ice' });                         // slippery
registerLiquid('void', { region: 'void' });                       // the fall
registerLiquid('chasm', { doodad: 'chasm' });                     // blocking gap, shoot across
// Dry "washes" — ground overlays a pit/floor recipe pours like a liquid.
registerLiquid('cinder', { doodad: 'cinder' });                   // ember-strewn ash
registerLiquid('gore', { doodad: 'gore' });                       // viscera pools
registerLiquid('mud', { doodad: 'mud' });

/** Pour a liquid over a mask: region liquids paint the grid; doodad liquids
 *  scatter merged blobs (one disc per Nth cell, radius > spacing so the fill
 *  is gapless — hazards like lava must never leak a walkable pixel). */
export function paintLiquid(ctx: GenCtx, grid: GridWalkField | null, m: Mask, liquid: LiquidSpec): void {
  if (liquid.region && grid) paintRegion(grid, m, liquid.region);
  if (liquid.doodad) {
    for (let cy = 0; cy < m.rows; cy++) {
      for (let cx = 0; cx < m.cols; cx++) {
        if (!m.get(cx, cy)) continue;
        // Every other cell in a checker pattern, radius 1.05× the cell — the
        // discs overlap into one silhouette at half the doodad count.
        if ((cx + cy) % 2 === 1 && m.get(cx - 1, cy) && m.get(cx + 1, cy) && m.get(cx, cy - 1) && m.get(cx, cy + 1)) continue;
        const c = m.center(cx, cy);
        ctx.doodads.push({
          pos: c, radius: m.cell * 1.05, kind: liquid.doodad,
          ...(liquid.shallow ? { shallow: true } : {}),
        });
      }
    }
  }
}
