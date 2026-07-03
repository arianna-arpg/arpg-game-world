// ---------------------------------------------------------------------------
// ZONE GEOMETRY — the one home for arena-boundary math.
//
// A zone's playable area is either a RECT (the original) or an inscribed
// ELLIPSE within its w×h box. Every actor/feature placement in the engine
// funnels through clampPos -> clampToBounds, and every random spawn point
// through samplePoint, so making THESE shape-aware makes the whole arena
// shape-aware from one place. Pure — no engine import, trivially testable.
// ---------------------------------------------------------------------------

import { clamp, type Vec2 } from '../core/math';

export type ZoneShape = 'rect' | 'ellipse';

export interface Bounds { w: number; h: number; shape: ZoneShape; boundless?: boolean; }

/** Pull a point inside the arena, leaving a body-radius margin. The rect path
 *  is byte-for-byte the original clamp; the ellipse path projects onto the rim.
 *  A BOUNDLESS zone (the Descent) has NO outer wall — only doodad collision stops
 *  you — so the perimeter clamp is skipped entirely (the player streams forever). */
export function clampToBounds(p: Vec2, radius: number, b: Bounds): Vec2 {
  if (b.boundless) return { x: p.x, y: p.y };
  if (b.shape !== 'ellipse') {
    return { x: clamp(p.x, radius, b.w - radius), y: clamp(p.y, radius, b.h - radius) };
  }
  const cx = b.w / 2, cy = b.h / 2;
  const rx = Math.max(8, b.w / 2 - radius), ry = Math.max(8, b.h / 2 - radius);
  const nx = (p.x - cx) / rx, ny = (p.y - cy) / ry;
  const k = nx * nx + ny * ny;
  if (k <= 1) return { x: p.x, y: p.y };
  const s = 1 / Math.sqrt(k);
  return { x: cx + (p.x - cx) * s, y: cy + (p.y - cy) * s };
}

/** A random point inside the arena, `inset` from the boundary. Ellipse uses a
 *  uniform-area polar sample so spawns aren't bunched at the centre. */
export function samplePoint(b: Bounds, inset: number, rand: (a: number, c: number) => number): Vec2 {
  if (b.shape !== 'ellipse') return { x: rand(inset, b.w - inset), y: rand(inset, b.h - inset) };
  const cx = b.w / 2, cy = b.h / 2, rx = b.w / 2 - inset, ry = b.h / 2 - inset;
  const t = rand(0, Math.PI * 2), r = Math.sqrt(rand(0, 1));
  return { x: cx + Math.cos(t) * rx * r, y: cy + Math.sin(t) * ry * r };
}

/** Pull a rect-edge portal position onto the ellipse rim so it's reachable. */
export function exitInside(p: Vec2, b: Bounds): Vec2 {
  return b.shape === 'ellipse' ? clampToBounds(p, 36, b) : p;
}
