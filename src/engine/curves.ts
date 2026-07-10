// ---------------------------------------------------------------------------
// UNIT CURVES — the one registry of interval shapes: progress t ∈ [0,1] in,
// shaped s (0..1) out. Anything that walks a value over a NORMALIZED life
// (a zone's breathing radius, a ramp, a gauge fill, a fade) names a curve
// from here instead of hardcoding an easing — a new shape is one entry and
// every consumer learns it for free.
//
// Conventions:
//  - Every curve maps 0 → 0 and 1 → 1 (except deliberate round-trips like
//    'breath', which returns home: 0 → 0). Callers lerp between their own
//    endpoints with the shaped s, so direction (contract vs expand) is the
//    CALLER's from/to, never the curve's.
//  - 'In' shapes move late (hold, then commit); 'Out' shapes move early
//    (commit, then taper). For a contraction (from 1 → to 0) that means:
//    quadIn = holds size then collapses; quadOut = slumps fast then lingers.
// ---------------------------------------------------------------------------

export const CURVES = {
  /** The steady walk. */
  linear: (t: number) => t,
  /** Slow start, committed finish — holds, then closes. */
  quadIn: (t: number) => t * t,
  /** Fast start, long taper — moves at once, then lingers. */
  quadOut: (t: number) => 1 - (1 - t) * (1 - t),
  /** quadIn's harder cousin: barely stirs until the last act. */
  cubicIn: (t: number) => t * t * t,
  /** quadOut's harder cousin: most of the journey in the first beat. */
  cubicOut: (t: number) => 1 - Math.pow(1 - t, 3),
  /** Near-nothing until the very end, then a rush — the held breath. */
  expoIn: (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  /** A rush at once, then an asymptotic crawl — the spent gasp. */
  expoOut: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  /** √t: quadOut's gentler sibling (early motion without the slump). */
  sqrt: (t: number) => Math.sqrt(Math.max(0, t)),
  /** Smoothstep: eases both ends — no start snap, no end snap. */
  smooth: (t: number) => t * t * (3 - 2 * t),
  /** ROUND TRIP (sin πt): 0 → 1 → 0. from..to..from — the out-and-back
   *  breath as one curve (a swell that returns without a retract spec). */
  breath: (t: number) => Math.sin(Math.PI * t),
} as const;

export type CurveKind = keyof typeof CURVES;

/** Evaluate a named curve at progress t (t clamped to [0,1]; undefined /
 *  unknown kind falls back to 'linear' — data never crashes the walk). */
export function evalCurve(kind: CurveKind | undefined, t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return (CURVES[kind ?? 'linear'] ?? CURVES.linear)(c);
}
