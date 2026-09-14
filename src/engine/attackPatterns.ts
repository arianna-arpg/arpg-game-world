import { vec, type Vec2 } from '../core/math';

/** Offsets sampled once at the warning: +x forward, +y across. No tracking
 * after placement, and no snapping that could close an authored gap. */
export interface AttackPattern {
  points: readonly { x: number; y: number; after?: number }[];
  radius: number;
  delay: number;
  /** Damaging ground after impact; zero is a single blow. */
  linger?: number;
  tickInterval?: number;
}

export function attackPatternPoints(pattern: AttackPattern, origin: Vec2, bearing: number):
  { pos: Vec2; delay: number }[] {
  const c = Math.cos(bearing), s = Math.sin(bearing);
  return pattern.points.map(p => ({
    pos: vec(origin.x + p.x * c - p.y * s, origin.y + p.x * s + p.y * c),
    delay: pattern.delay + (p.after ?? 0),
  }));
}
