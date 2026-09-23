import { clamp } from '../core/math';
import { STRUCTURES } from '../data/structures';
import type { ZoneDef } from '../data/zones';
import { PORTAL_EDGE_INSET } from './worldgen';
import { plannedRect, structureMaxFootprint } from './levelgen';

type Point = { x: number; y: number };
type Rect = { x: number; y: number; hx: number; hy: number };

/** Exact segment/expanded-box intersection, including the endpoints. */
function crosses(a: Point, b: Point, r: Rect, pad: number): boolean {
  let lo = 0, hi = 1;
  for (const axis of ['x', 'y'] as const) {
    const half = (axis === 'x' ? r.hx : r.hy) + pad;
    const d = b[axis] - a[axis], min = r[axis] - half, max = r[axis] + half;
    if (Math.abs(d) < 1e-9) { if (a[axis] < min || a[axis] > max) return false; }
    else {
      const t1 = (min - a[axis]) / d, t2 = (max - a[axis]) / d;
      lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2));
      if (lo > hi) return false;
    }
  }
  return true;
}

/** Deterministic, opt-in settlement siting. Earlier exits keep their seats;
 * appenders can pass the live count to leave existing portals untouched.
 * The side/destination never change. Failure is explicit rather than quietly
 * allowing the terrain's portal carve to cut a building apart. */
export function siteZoneExits(def: ZoneDef, fromIndex = 0): void {
  const cfg = def.exitSiting;
  if (!cfg) return;
  const { w, h } = def.size, inset = PORTAL_EDGE_INSET;
  const rects: Rect[] = (def.fixtures ?? []).filter(f => !cfg.ignoreStructures?.includes(f.structure)).map(f => {
    const s = STRUCTURES[f.structure];
    if (!s) throw Error(`Unknown exit-siting fixture ${f.structure}`);
    const size = structureMaxFootprint(f.structure)!;
    const r = s.plan || s.generator ? plannedRect(f, size.w, size.h)
      : { x: f.x - size.w / 2, y: f.y - size.h / 2, ...size };
    return { x: r.x + r.w / 2, y: r.y + r.h / 2, hx: r.w / 2, hy: r.h / 2 };
  });
  const occupied: Point[] = [];
  // Build the entire result before publishing, so a failed siting is atomic.
  const exits = def.exits.map((e, index) => {
    const horizontal = e.side === 'n' || e.side === 's', span = horizontal ? w : h;
    const point = (along: number): Point => e.side === 'n' ? { x: along, y: inset }
      : e.side === 's' ? { x: along, y: h - inset }
      : e.side === 'w' ? { x: inset, y: along } : { x: w - inset, y: along };
    const preferred = clamp((e.at ?? 0.5) * span, inset, span - inset);
    if (index < fromIndex) {
      occupied.push(e.posFrac ? { x: e.posFrac.fx * w, y: e.posFrac.fy * h } : point(preferred));
      return e;
    }
    const candidates = [preferred];
    for (let v = inset; v <= span - inset; v += Math.max(1, cfg.sampleStep)) candidates.push(v);
    candidates.sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred) || a - b);
    const along = candidates.find(v => {
      const p = point(v);
      const length = Math.hypot(w / 2 - p.x, h / 2 - p.y);
      const arrival = { x: p.x + (w / 2 - p.x) / length * 120, y: p.y + (h / 2 - p.y) / length * 120 };
      const laneFraction = Math.min(1, cfg.laneLength / Math.hypot(cfg.target.x - p.x, cfg.target.y - p.y));
      const laneEnd = { x: p.x + (cfg.target.x - p.x) * laneFraction, y: p.y + (cfg.target.y - p.y) * laneFraction };
      return occupied.every(q => Math.hypot(p.x - q.x, p.y - q.y) >= cfg.portalSeparation)
        && rects.every(r => Math.hypot(Math.max(0, Math.abs(p.x - r.x) - r.hx),
          Math.max(0, Math.abs(p.y - r.y) - r.hy)) >= cfg.fixtureClearance
          && !crosses(p, laneEnd, r, cfg.laneHalfWidth)
          && !crosses(p, arrival, r, cfg.laneHalfWidth));
    });
    if (along === undefined) throw Error(`No clear ${e.side} exit site in ${def.id} for ${e.to}`);
    occupied.push(point(along));
    return { ...e, at: along / span, posFrac: undefined };
  });
  def.exits = exits;
}
