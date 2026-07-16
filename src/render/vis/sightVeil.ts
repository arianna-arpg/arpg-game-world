// ---------------------------------------------------------------------------
// THE SIGHT VEIL — positional occlusion shadows (VIS_CFG.sightVeil).
//
// The drawn expression of the LoS fabric's honest ray (engine/los.ts): from
// the LOCAL HERO's eye, every sight-blocking body throws "unseen" dark behind
// itself. Two occluder families, both resolved from data the terrain already
// declares (nothing here names a kind):
//
//   REGIONS — walk-grid cells whose RegionKind.blocksSight is true (rampart
//             lines, cave walls, verdure, palisades…). Closed doors seal
//             their cells into the grid as rampart and reopen with it, so a
//             door's shadow follows its state with zero code here. Shadows
//             cast from the solid mass's FACING EDGES (merged runs), so a
//             whole wall line is one quad, not thirty.
//   DOODADS — solid bodies via the hit-surface fabric at their SHOT surface
//             (hitSurfaceOf 'shot': the TRUNK — you fight under the leaves
//             and hide behind the bole; the crown's own pixels + the canopy
//             veil already own what's beneath the leaves). Gated by
//             castsSightShadow (DoodadRule.sightShadow, defaulting to
//             blocksShot && blocksSight): windows, kelp and the hearth never
//             shadow; boulders, trunks and masonry piers do.
//
// RENDER-ONLY BY DOCTRINE. Engine LoS keeps its own ray — AI perception is
// blinded WIDER than this veil draws (crowns block sight at full radius);
// the asymmetry always favors the player. The veil is the drawn horizon of
// attention: what stands in a shadow is unseen with the ground it stands on
// (actor sprites fade via actorShade, nameplates gate via occludedAt), and
// the whole pass composites AFTER the actor pass but BEFORE canopies and
// roofs — a building's far side goes dark while the building itself, its
// roof-line and its crowns stay lit (the skyline is tall; the street is not).
//
// PERF SHAPE (smoothness is the crux): occluder GATHERING is cached against
// (hero bucket × doodad-list rev × grid version) — a walk rebuilds a few
// times a second, microseconds each; per FRAME the work is one facing test
// per cached edge, one tangent wedge per cached disc, two union fills into a
// downscaled sheet (overlapping shadows never stack dark), and ONE composite.
// Zones with nothing to occlude skip the sheet entirely. The room veil owns
// a fully wrapped frame: this pass fades itself out as confinement wraps.
// Ablate pass name: 'sightveil'.
//
// The vis-layer doctrine holds: no World import — the pass reads a structural
// view (World satisfies it) plus the same pure terrain-data helpers the LoS
// ray itself resolves through.
// ---------------------------------------------------------------------------

import { VIS_ABLATE, VIS_CFG } from './visConfig';
import type { Doodad } from '../../engine/levelgen';
import { castsSightShadow, hitSurfaceOf } from '../../engine/levelgen';
import { GridWalkField } from '../../world/gridWalk';
import { regionKind } from '../../world/regions';

interface Pt { x: number; y: number }

/** The sliver of World this pass needs (structural — never the class). */
export interface SightView {
  player: { pos: Pt };
  walk: unknown;
  zone: { theme?: { sightVeil?: { mul?: number; regionMul?: number; doodadMul?: number } } };
  doodads: readonly Doodad[];
  doodadsNear(x: number, y: number, reach: number): readonly Doodad[];
  doodadRev: number;
}

/** One cached solid-body silhouette (flattened from its HitShape). */
interface OccDisc { x: number; y: number; r: number }
interface OccRect { x: number; y: number; hw: number; hh: number; rot: number; boundR: number }
/** One cached wall FACE (a merged run of solid-cell edges), with the outward
 *  normal (away from the solid mass, toward the ground it faces). */
interface OccEdge { ax: number; ay: number; bx: number; by: number; nx: number; ny: number }

/** Hero-bucket size for cache keys (px): crossing one triggers a re-gather. */
const GATHER_BUCKET = 96;
/** Extra gather reach past the veil radius, so a bucket-crossing never has
 *  to re-gather for occluders that were just out of the last sweep. */
const GATHER_PAD = 160;

/** blocksSight per region id, memoized (regionAt returns strings at cell
 *  cadence — a Map get beats a registry walk in the extraction loop). */
const sightBlockCache = new Map<string, boolean>();
function regionBlocksSight(id: string): boolean {
  let v = sightBlockCache.get(id);
  if (v === undefined) {
    v = !!regionKind(id)?.blocksSight;
    sightBlockCache.set(id, v);
  }
  return v;
}

export class SightVeil {
  private buf = document.createElement('canvas');
  private bctx = this.buf.getContext('2d')!;

  /** Live per-frame state (update() resolves; draw()/queries consume). */
  private active = false;
  private regionF = 0;   // hide-fraction of a true-wall shadow (0..1)
  private doodadF = 0;   // hide-fraction of a solid-body shadow (0..1)
  private px = 0; private py = 0;
  private radius = 0;
  private frame = 0;

  // --- occluder caches (rebuilt on hero-bucket / revision change) -----------
  private discs: OccDisc[] = [];
  private rects: OccRect[] = [];
  private dooBx = 1e9; private dooBy = 1e9; private dooRev = -1;
  private dooArr: readonly Doodad[] | null = null; private dooLen = -1; private dooR = 0;

  private edges: OccEdge[] = [];
  private gridRef: GridWalkField | null = null;
  private gridBx = 1e9; private gridBy = 1e9; private gridV = -1; private gridR = 0;

  /** Per-actor smoothed hide fades (WeakMap: dead actors collect themselves). */
  private shades = new WeakMap<object, { v: number; f: number }>();

  /** Resolve strengths + refresh occluder caches. Once per frame, before
   *  draw. confineFrac is the room veil's wrap (this pass yields to a
   *  confined frame); vw/vh the view extent in world units (the veil reach
   *  derives from it). Per-body smoothing rides actorShade's own dt. */
  update(view: SightView, confineFrac: number, vw: number, vh: number): void {
    const cfg = VIS_CFG.sightVeil;
    this.frame++;
    const t = view.zone.theme?.sightVeil;
    const open = 1 - Math.min(1, confineFrac);
    const mul = (t?.mul ?? 1) * open;
    this.regionF = Math.max(0, Math.min(1, cfg.regionStrength * (t?.regionMul ?? 1) * mul));
    this.doodadF = Math.max(0, Math.min(1, cfg.doodadStrength * (t?.doodadMul ?? 1) * mul));
    this.active = cfg.enabled && !VIS_ABLATE.has('sightveil')
      && (this.regionF > 0.01 || this.doodadF > 0.01);
    if (!this.active) return;

    const p = view.player.pos;
    this.px = p.x; this.py = p.y;
    this.radius = Math.min(cfg.maxRadius, Math.hypot(vw, vh) / 2 + 120);

    // Doodad silhouettes: re-gather when the hero crosses a bucket, the
    // doodad list changes (identity/length/rev), or the reach outgrows the
    // last sweep. Between rebuilds this costs nothing per frame.
    const bx = Math.floor(p.x / GATHER_BUCKET), by = Math.floor(p.y / GATHER_BUCKET);
    if (bx !== this.dooBx || by !== this.dooBy || view.doodadRev !== this.dooRev
      || view.doodads !== this.dooArr || view.doodads.length !== this.dooLen
      || this.radius > this.dooR) {
      this.gatherDoodads(view);
      this.dooBx = bx; this.dooBy = by; this.dooRev = view.doodadRev;
      this.dooArr = view.doodads; this.dooLen = view.doodads.length;
      this.dooR = this.radius + GATHER_PAD;
    }

    // Wall faces: re-extract when the hero crosses a GRID cell bucket or the
    // grid repaints (doors, terraforms, hollows — GridWalkField.version).
    const g = view.walk instanceof GridWalkField ? view.walk : null;
    if (g) {
      const gbx = Math.floor(p.x / g.cellSize), gby = Math.floor(p.y / g.cellSize);
      if (g !== this.gridRef || gbx !== this.gridBx || gby !== this.gridBy
        || g.version !== this.gridV || this.radius > this.gridR) {
        this.extractEdges(g);
        this.gridRef = g; this.gridBx = gbx; this.gridBy = gby;
        this.gridV = g.version; this.gridR = this.radius + GATHER_PAD;
      }
    } else if (this.gridRef) {
      this.gridRef = null;
      this.edges.length = 0;
    }
  }

  /** Flatten every shadow-casting doodad in reach into discs/rects. */
  private gatherDoodads(view: SightView): void {
    const cfg = VIS_CFG.sightVeil;
    const reach = this.radius + GATHER_PAD;
    this.discs.length = 0;
    this.rects.length = 0;
    for (const d of view.doodadsNear(this.px, this.py, reach)) {
      if (!castsSightShadow(d)) continue;
      const dx = d.pos.x - this.px, dy = d.pos.y - this.py;
      if (dx * dx + dy * dy > reach * reach) continue;
      const s = hitSurfaceOf(d, 'shot');
      if (s.kind === 'circle') {
        if (s.r > 0.5) this.discs.push({ x: d.pos.x, y: d.pos.y, r: s.r });
      } else if (s.kind === 'multi') {
        for (const q of s.parts) {
          if (q.r > 0.5) this.discs.push({ x: d.pos.x + q.dx, y: d.pos.y + q.dy, r: q.r });
        }
      } else {
        this.rects.push({
          x: d.pos.x, y: d.pos.y, hw: s.hw, hh: s.hh, rot: s.rot ?? 0,
          boundR: Math.hypot(s.hw, s.hh),
        });
      }
    }
    // Backstop for pathological groves: keep the NEAREST bodies (the far
    // ones matter least — their wedges start near the screen edge anyway).
    if (this.discs.length > cfg.maxOccluders) {
      const px = this.px, py = this.py;
      this.discs.sort((a, b) =>
        ((a.x - px) ** 2 + (a.y - py) ** 2) - ((b.x - px) ** 2 + (b.y - py) ** 2));
      this.discs.length = cfg.maxOccluders;
    }
  }

  /** Extract the solid mass's facing edges (merged runs) within reach.
   *  Out-of-window and out-of-grid both read as SOLID, so no phantom edge
   *  ever appears at the sweep rim or the arena border. */
  private extractEdges(g: GridWalkField): void {
    this.edges.length = 0;
    const cs = g.cellSize;
    const reach = this.radius + GATHER_PAD;
    const x0 = Math.max(0, Math.floor((this.px - reach) / cs));
    const x1 = Math.min(g.cols - 1, Math.floor((this.px + reach) / cs));
    const y0 = Math.max(0, Math.floor((this.py - reach) / cs));
    const y1 = Math.min(g.rows - 1, Math.floor((this.py + reach) / cs));
    if (x1 < x0 || y1 < y0) return;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const solid = new Uint8Array(w * h);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (regionBlocksSight(g.regionAt((cx + 0.5) * cs, (cy + 0.5) * cs))) {
          solid[(cy - y0) * w + (cx - x0)] = 1;
        }
      }
    }
    const solidAt = (wx: number, wy: number): number =>
      wx < 0 || wy < 0 || wx >= w || wy >= h ? 1 : solid[wy * w + wx];
    // Horizontal faces (top: outward −y; bottom: outward +y), merged per row.
    for (let wy = 0; wy < h; wy++) {
      for (const [dy, ny] of [[-1, -1], [1, 1]] as const) {
        let run = -1;
        for (let wx = 0; wx <= w; wx++) {
          const face = wx < w && solid[wy * w + wx] === 1 && solidAt(wx, wy + dy) === 0;
          if (face && run < 0) run = wx;
          else if (!face && run >= 0) {
            const yEdge = (y0 + wy + (dy > 0 ? 1 : 0)) * cs;
            this.edges.push({
              ax: (x0 + run) * cs, ay: yEdge,
              bx: (x0 + wx) * cs, by: yEdge, nx: 0, ny,
            });
            run = -1;
          }
        }
      }
    }
    // Vertical faces (left: outward −x; right: outward +x), merged per column.
    for (let wx = 0; wx < w; wx++) {
      for (const [dx, nx] of [[-1, -1], [1, 1]] as const) {
        let run = -1;
        for (let wy = 0; wy <= h; wy++) {
          const face = wy < h && solid[wy * w + wx] === 1 && solidAt(wx + dx, wy) === 0;
          if (face && run < 0) run = wy;
          else if (!face && run >= 0) {
            const xEdge = (x0 + wx + (dx > 0 ? 1 : 0)) * cs;
            this.edges.push({
              ax: xEdge, ay: (y0 + run) * cs,
              bx: xEdge, by: (y0 + wy) * cs, nx, ny: 0,
            });
            run = -1;
          }
        }
      }
    }
  }

  /** How occluded a WORLD point is from the hero's eye (0 clear .. 1 fully
   *  hidden) — the label pass multiplies its reveal through this, exactly
   *  the roomVeil.veiledAt contract. Tested against the SAME cached
   *  occluders the sheet draws, so text and pixels can never disagree. */
  occludedAt(pos: Pt): number {
    if (!this.active) return 0;
    const px = this.px, py = this.py;
    const qx = pos.x - px, qy = pos.y - py;
    const len2 = qx * qx + qy * qy;
    if (len2 < 1) return 0;
    let f = 0;
    if (this.doodadF > 0) {
      for (const c of this.discs) {
        if (segHitsCircle(px, py, qx, qy, len2, c.x, c.y, c.r)) { f = this.doodadF; break; }
      }
      if (f < this.doodadF) {
        for (const r of this.rects) {
          if (segHitsCircle(px, py, qx, qy, len2, r.x, r.y, r.boundR)) { f = this.doodadF; break; }
        }
      }
    }
    if (this.regionF > f && this.gridRef) {
      // Half-cell march, start cell excused — the castRay grid idiom.
      const g = this.gridRef;
      const len = Math.sqrt(len2);
      const step = g.cellSize / 2;
      const limit = Math.min(len, this.radius);
      for (let s = step; s < limit; s += step) {
        const t = s / len;
        if (regionBlocksSight(g.regionAt(px + qx * t, py + qy * t))) { f = this.regionF; break; }
      }
    }
    return f;
  }

  /** A body's smoothed hide-fade (0 visible .. 1 gone): occludedAt chased at
   *  fadeRate × the actor-hide lever, per actor, self-collecting. A stale
   *  entry (off-screen a while, zone swap) SNAPS instead of replaying. */
  actorShade(a: { pos: Pt }, dt: number): number {
    if (!this.active) return 0;
    const target = this.occludedAt(a.pos) * VIS_CFG.sightVeil.actorHide;
    let e = this.shades.get(a);
    if (!e) { e = { v: target, f: this.frame }; this.shades.set(a, e); return e.v; }
    if (e.f === this.frame) return e.v;
    e.v = this.frame - e.f > 3 ? target
      : e.v + (target - e.v) * Math.min(1, dt * VIS_CFG.sightVeil.fadeRate);
    e.f = this.frame;
    return e.v;
  }

  /** Build + composite the shadow sheet. Called mid-world-pass (the caller's
   *  transform is the world transform); composites at identity, projected
   *  through the same effective camera the light layer uses. Free when
   *  nothing in reach occludes. */
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number,
    zoom: number, w: number, h: number): void {
    const cfg = VIS_CFG.sightVeil;
    if (!this.active) return;
    const regionA = cfg.alpha * this.regionF;
    const doodadA = cfg.alpha * this.doodadF;
    if (regionA <= 0.02 && doodadA <= 0.02) return;

    const px = this.px, py = this.py;
    const far = this.radius * cfg.farSlack;

    // Facing selection happens per frame (the caches hold BOTH facings so a
    // mid-cell hero move never pops a stale shadow).
    let quads = 0;
    const scale = cfg.scale;
    const bw = Math.max(2, Math.ceil(w * scale)), bh = Math.max(2, Math.ceil(h * scale));
    if (this.buf.width !== bw || this.buf.height !== bh) {
      this.buf.width = bw; this.buf.height = bh;
    }
    const b = this.bctx;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, bw, bh);
    const k = zoom * scale;
    const ox = camX, oy = camY;
    const t = cfg.tint;
    if (cfg.featherPx > 0) b.filter = `blur(${cfg.featherPx}px)`;

    // --- true-wall shadows (one union fill: overlap never stacks) -----------
    if (regionA > 0.02 && this.edges.length) {
      b.beginPath();
      for (const e of this.edges) {
        // Outward normal side test: the hero must FACE this edge.
        if (e.nx * (px - e.ax) + e.ny * (py - e.ay) <= 0) continue;
        quads += quadPath(b, e.ax, e.ay, e.bx, e.by, px, py, far, ox, oy, k);
      }
      if (quads) {
        b.fillStyle = `rgba(${t.r},${t.g},${t.b},${regionA.toFixed(3)})`;
        b.fill();
      }
    }

    // --- solid-body shadows (tangent wedges; one union fill) ----------------
    if (doodadA > 0.02 && (this.discs.length || this.rects.length)) {
      let dquads = 0;
      b.beginPath();
      for (const c of this.discs) {
        const dx = c.x - px, dy = c.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 <= c.r * c.r + 1) continue;   // the eye is never inside a solid
        const d = Math.sqrt(d2);
        const sin = c.r / d, cos = Math.sqrt(Math.max(0, 1 - sin * sin));
        const ux = dx / d, uy = dy / d;
        const t1x = ux * cos - uy * sin, t1y = ux * sin + uy * cos;
        const t2x = ux * cos + uy * sin, t2y = -ux * sin + uy * cos;
        const L = d * cos;
        b.moveTo((px + t1x * L - ox) * k, (py + t1y * L - oy) * k);
        b.lineTo((px + t2x * L - ox) * k, (py + t2y * L - oy) * k);
        b.lineTo((px + t2x * far - ox) * k, (py + t2y * far - oy) * k);
        b.lineTo((px + t1x * far - ox) * k, (py + t1y * far - oy) * k);
        b.closePath();
        dquads++;
      }
      for (const r of this.rects) {
        dquads += rectShadowPath(b, r, px, py, far, ox, oy, k);
      }
      if (dquads) {
        b.fillStyle = `rgba(${t.r},${t.g},${t.b},${doodadA.toFixed(3)})`;
        b.fill();
      }
      quads += dquads;
    }
    if (cfg.featherPx > 0) b.filter = 'none';
    if (!quads) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.buf, 0, 0, bw, bh, 0, 0, w, h);
    ctx.restore();
  }
}

/** Append one edge-shadow quad (A→B, then both pushed to FAR from the eye).
 *  Returns 1 when appended (degenerate eye-on-edge geometry skips). */
function quadPath(b: CanvasRenderingContext2D, ax: number, ay: number,
  bx2: number, by2: number, px: number, py: number, far: number,
  ox: number, oy: number, k: number): number {
  const dax = ax - px, day = ay - py;
  const dbx = bx2 - px, dby = by2 - py;
  const la = Math.hypot(dax, day), lb = Math.hypot(dbx, dby);
  if (la < 1 || lb < 1) return 0;
  const fax = ax + (dax / la) * far, fay = ay + (day / la) * far;
  const fbx = bx2 + (dbx / lb) * far, fby = by2 + (dby / lb) * far;
  b.moveTo((ax - ox) * k, (ay - oy) * k);
  b.lineTo((bx2 - ox) * k, (by2 - oy) * k);
  b.lineTo((fbx - ox) * k, (fby - oy) * k);
  b.lineTo((fax - ox) * k, (fay - oy) * k);
  b.closePath();
  return 1;
}

/** Append an oriented-rect body's shadow: the two bearing-extreme corners
 *  from the eye, pushed to FAR — the silhouette quad. */
function rectShadowPath(b: CanvasRenderingContext2D, r: OccRect,
  px: number, py: number, far: number, ox: number, oy: number, k: number): number {
  const cos = Math.cos(r.rot), sin = Math.sin(r.rot);
  const base = Math.atan2(r.y - py, r.x - px);
  let minD = Infinity, maxD = -Infinity;
  let minX = 0, minY = 0, maxX = 0, maxY = 0;
  for (let i = 0; i < 4; i++) {
    const sx = i & 1 ? r.hw : -r.hw, sy = i & 2 ? r.hh : -r.hh;
    const cx = r.x + sx * cos - sy * sin, cy = r.y + sx * sin + sy * cos;
    let d = Math.atan2(cy - py, cx - px) - base;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    if (d < minD) { minD = d; minX = cx; minY = cy; }
    if (d > maxD) { maxD = d; maxX = cx; maxY = cy; }
  }
  if (maxD - minD >= Math.PI) return 0;   // the eye is inside/against the slab
  return quadPath(b, minX, minY, maxX, maxY, px, py, far, ox, oy, k);
}

/** Does the segment (P → P+Q, squared length len2) cross the circle? The
 *  occlusion test the queries share with the drawn wedges. */
function segHitsCircle(px: number, py: number, qx: number, qy: number,
  len2: number, cx: number, cy: number, r: number): boolean {
  const wx = cx - px, wy = cy - py;
  let t = (wx * qx + wy * qy) / len2;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const dx = wx - qx * t, dy = wy - qy * t;
  return dx * dx + dy * dy < r * r;
}
