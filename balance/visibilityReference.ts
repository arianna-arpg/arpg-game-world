// Exhaustive pre-optimization visibility oracle (de3cdead).
// Kept in the test harness so shallow CI and source archives need no Git history.
// Deliberately scans all shapes and recalculates reach for every query.
import { SightVeil, castLen, SIGHT_VEIL_GEO, type OccRectLike } from '../src/render/vis/sightVeil';
import { VIS_CFG } from '../src/render/vis/visConfig';
import { castGridRay, LOS_CFG } from '../src/engine/los';
import { tierElevOf } from '../src/engine/tiers';
import type { Doodad } from '../src/engine/levelgen';
type Pt={x:number;y:number};
export class ExhaustiveSightVeil extends SightVeil {
 override occludedAt(pos:Pt,tier?:number):number{return referenceOcclusion(this,pos,tier)}
 override raisedSurfaceReveal(d:Doodad):number{return 1-referenceOcclusion(this,d.pos,d.tier,d)}
}
function referenceOcclusion(v:any,pos:Pt,targetElev?:number,except?:Doodad):number {
    if (!v.active) return 0;
    const px = v.px, py = v.py;
    const qx = pos.x - px, qy = pos.y - py;
    const len2 = qx * qx + qy * qy;
    if (len2 < 1) return 0;
    let f = 0;
    if (v.doodadF > 0) {
      const len = Math.sqrt(len2);
      for (const c of v.discs) {
        if (except && c.owner === except) continue;
        const strength = v.doodadF * c.s;
        if (strength <= f) continue;
        const bd = Math.hypot(c.x - px, c.y - py);
        // The drawn pass's own guards, mirrored exactly: a body whose whole
        // shadow lies past the veil radius casts nothing; a point past a
        // body's shadow length reads clear of THAT body.
        if (bd - c.r > v.radius) continue;
        if (len > discShadowReach(bd, c.r, c.s, v.radius * VIS_CFG.sightVeil.farSlack)) continue;
        if (segHitsCircle(px, py, qx, qy, len2, c.x, c.y, c.r)) {
          f = strength;
          if (f >= v.doodadF) break;
        }
      }
      if (f < v.doodadF) {
        for (const r of v.rects) {
          if (except && r.owner === except) continue;
          const strength = v.doodadF * r.s;
          if (strength <= f) continue;
          const bd = Math.hypot(r.x - px, r.y - py);
          if (bd - r.boundR > v.radius) continue;
          const geometry = rectShadowGeometry(r, px, py, v.radius * VIS_CFG.sightVeil.farSlack);
          if (!geometry || len > geometry.reach) continue;
          // Broad phase at the bounding circle, then THE EXACT SLAB: the
          // drawn wedge walks the TRUE oriented corners (rectShadowPath),
          // so the query must test the same slab. The circle verdict alone
          // reported "hidden" over ground nothing painted — worst on long
          // thin slabs at 45° (wall runs, plank spans, wreck hulls), where
          // boundR sweeps a disc the body fills a sliver of.
          if (segHitsCircle(px, py, qx, qy, len2, r.x, r.y, r.boundR)
            && segHitsOBB(px, py, qx, qy, r)) {
            f = strength;
            if (f >= v.doodadF) break;
          }
        }
      }
    }
    if (v.regionF > f && v.gridRef) {
      // Share gameplay's cell-crossing/elevation rules, but originate the
      // visual query at the same contact-adjusted eye as the painted walls.
      // Near stair-step corners the raw eye can hide visibly clear ground.
      const g = v.gridRef;
      const len = Math.hypot(pos.x - v.wallEye.x, pos.y - v.wallEye.y);
      const eye = LOS_CFG.elev.eye;
      const hFrom = v.heroT + eye;
      const hTo = (targetElev ?? (tierElevOf(g.regionAt(pos.x, pos.y)) ?? 0)) + eye;
      if (castGridRay(g, v.wallEye, pos, 'sight', { from: hFrom, to: hTo },
        Math.min(1, v.radius / len),
        v.concealed.length ? (x:number, y:number) => v.concealedAt(x, y) : undefined) !== null) f = v.regionF;
    }
    // The interactable reveals thin the answer exactly as they thin the
    // sheet (drawn==tested at the door's threshold).
    if (f > 0 && v.pierces.length) f *= 1 - v.pierceAt(pos.x, pos.y);
    return f;
  }

function discShadowReach(d: number, r: number, s: number, far: number): number {
  if (d * d <= r * r + 1) return 0;
  const melt = Math.min(1, (d - r) / SIGHT_VEIL_GEO.surfaceFeather);
  const reach = Math.min(far, d + castLen(r, s)) * melt;
  return reach > Math.sqrt(Math.max(0, d * d - r * r)) + .5 ? reach : 0;
}

function rectShadowGeometry(r: OccRectLike, px: number, py: number, far: number) {
  const cos = Math.cos(r.rot), sin = Math.sin(r.rot);
  // Surface distance in the slab's local frame (0 inside).
  const rx = px - r.x, ry = py - r.y;
  const lx = rx * cos + ry * sin, ly = -rx * sin + ry * cos;
  const ddx = Math.max(0, Math.abs(lx) - r.hw), ddy = Math.max(0, Math.abs(ly) - r.hh);
  const sd = Math.hypot(ddx, ddy);
  const melt = Math.min(1, sd / SIGHT_VEIL_GEO.surfaceFeather);
  if (melt <= 0) return null;         // the eye is inside (or on) the slab
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
  if (maxD - minD >= Math.PI) return null;   // degenerate (eye on a face plane)
  const reach = Math.min(far, Math.hypot(r.x - px, r.y - py) + castLen(r.boundR, r.s)) * melt;
  if (reach <= Math.max(Math.hypot(minX - px, minY - py), Math.hypot(maxX - px, maxY - py)) + .5) return null;
  return { minX, minY, maxX, maxY, reach };
}

function segHitsCircle(px: number, py: number, qx: number, qy: number,
  len2: number, cx: number, cy: number, r: number): boolean {
  const wx = cx - px, wy = cy - py;
  let t = (wx * qx + wy * qy) / len2;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const dx = wx - qx * t, dy = wy - qy * t;
  return dx * dx + dy * dy < r * r;
}

/** Does the segment (P → P+Q) cross the oriented slab? The EXACT rect
 *  mirror of segHitsCircle: the segment enters the slab's local frame
 *  through the SAME rotation rectShadowPath spins its corners by (and the
 *  melt measures surface distance in), then a standard slab clip walks
 *  both axes. Runs only behind the boundR broad phase. */
function segHitsOBB(px: number, py: number, qx: number, qy: number,
  r: { x: number; y: number; hw: number; hh: number; rot: number }): boolean {
  const cos = Math.cos(r.rot), sin = Math.sin(r.rot);
  const sx = px - r.x, sy = py - r.y;
  const lx = sx * cos + sy * sin, ly = -sx * sin + sy * cos;
  const dx = qx * cos + qy * sin, dy = -qx * sin + qy * cos;
  let t0 = 0, t1 = 1;
  // X slab, then Y slab (unrolled — this sits on the per-query hot path).
  if (Math.abs(dx) < 1e-9) {
    if (Math.abs(lx) > r.hw) return false;
  } else {
    let ta = (-r.hw - lx) / dx, tb = (r.hw - lx) / dx;
    if (ta > tb) { const t = ta; ta = tb; tb = t; }
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (Math.abs(ly) > r.hh) return false;
  } else {
    let ta = (-r.hh - ly) / dy, tb = (r.hh - ly) / dy;
    if (ta > tb) { const t = ta; ta = tb; tb = t; }
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return false;
  }
  return true;
}
