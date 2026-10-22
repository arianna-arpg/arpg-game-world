import type { HitShape } from './shapes';

export interface BodyContact { t: number; nx: number; ny: number }
const EPS = 1e-7;

/** First inward contact of a moving disc with a solid. Unlike a sight ray,
 * a body touching a surface may move away or tangentially without sticking.
 * Rectangles have rounded Minkowski corners, not oversized square corners. */
export function sweepBodyShape(s: HitShape, ax: number, ay: number,
  fx: number, fy: number, dx: number, dy: number, radius: number): BodyContact | null {
  if (dx * dx + dy * dy < EPS * EPS) return null;
  if (s.kind === 'circle') return circle(s.r + radius, fx - ax, fy - ay, dx, dy);
  if (s.kind === 'multi') {
    let first: BodyContact | null = null;
    for (const p of s.parts) {
      const hit = circle(p.r + radius, fx - ax - p.dx, fy - ay - p.dy, dx, dy);
      if (hit && (!first || hit.t < first.t)) first = hit;
    }
    return first;
  }
  const c = Math.cos(s.rot ?? 0), n = Math.sin(s.rot ?? 0);
  const x = (fx - ax) * c + (fy - ay) * n, y = -(fx - ax) * n + (fy - ay) * c;
  const vx = dx * c + dy * n, vy = -dx * n + dy * c;
  let first: BodyContact | null = null;
  const take = (hit: BodyContact | null) => { if (hit && (!first || hit.t < first.t)) first = hit; };
  for (const sign of [-1, 1]) {
    if (vx * sign < -EPS) {
      const t = (sign * (s.hw + radius) - x) / vx;
      if (t >= -EPS && t <= 1 && Math.abs(y + vy * t) <= s.hh) take({ t: Math.max(0, t), nx: sign, ny: 0 });
    }
    if (vy * sign < -EPS) {
      const t = (sign * (s.hh + radius) - y) / vy;
      if (t >= -EPS && t <= 1 && Math.abs(x + vx * t) <= s.hw) take({ t: Math.max(0, t), nx: 0, ny: sign });
    }
    for (const other of [-1, 1]) {
      const hit = circle(radius, x - sign * s.hw, y - other * s.hh, vx, vy);
      if (hit && (x + vx * hit.t) * sign >= s.hw - EPS
        && (y + vy * hit.t) * other >= s.hh - EPS) take(hit);
    }
  }
  const hit = first as BodyContact | null;
  return hit && { t: hit.t, nx: hit.nx * c - hit.ny * n, ny: hit.nx * n + hit.ny * c };
}

function circle(r: number, x: number, y: number, dx: number, dy: number): BodyContact | null {
  const a = dx * dx + dy * dy, b = x * dx + y * dy, c = x * x + y * y - r * r;
  if (b >= -EPS) return null; // leaving/tangent, including a numerically overlapping contact
  const disc = b * b - a * c;
  if (disc <= 0) return null;
  const t = Math.max(0, (-b - Math.sqrt(disc)) / a);
  if (t > 1) return null;
  const hx = x + dx * t, hy = y + dy * t, len = Math.hypot(hx, hy);
  if (len < EPS) return { t, nx: -dx / Math.sqrt(a), ny: -dy / Math.sqrt(a) };
  return { t, nx: hx / len, ny: hy / len };
}
