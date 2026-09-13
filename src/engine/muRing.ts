// ---------------------------------------------------------------------------
// THE RING LAW — where Mu's apparitions STAND, as one pure function of how
// many stand (her ruling 2026-09-13: "given enough class and slot unlocks the
// dwell ring might be too large — standing adjacent to a class could read as
// the ADJACENT class"; the fixed 250px crescent packed twelve vessels 46px
// apart under a 93px dwell reach).
//
// A rank's seats are DERIVED from a readable gap (MU_CFG.ring.seatGap — the
// least centre-to-centre distance between neighbours), never from a fixed
// arc:
//   1. the crescent as authored (MU_CFG.arc at the rank's base radius) when
//      its neighbours already stand at least the gap apart — byte-identical
//      to the legacy layout for every small hand;
//   2. else the crescent WIDENS symmetrically about its centre until the gap
//      holds, up to a closed ring around the wisp (the gaze already turns
//      every vessel to face it — a ring reads as the roster watching you);
//   3. else a closed ring GROWS in radius to the gap.
// Ranks stack outward by at least MU_CFG.ring.rankGap, and THE GLOBE's wrap
// keeps MU_CFG.wrap.clear of pure void beyond the outermost seat, so the
// antipode seam stays invisible at any count.
//
// THE DISJOINT REACH: the awake gap is at least twice the dwell reach
// (MU_CFG.dwell.radius + APPARITION_RADIUS), so no point in Mu lies within
// reach of two awake vessels — THE NEAREST LAW in the stage (engine/
// scenes.ts) is then only the belt (a patched gap, a hand-placed seat).
// data/validate.ts warns when a dial breaks it; probe_mudwell pins both.
// ---------------------------------------------------------------------------

import { MU_CFG } from '../data/mu';

/** One rank's seats. */
export interface MuRankRing {
  /** Seat radius off the wake point (px). */
  radius: number;
  /** Seat bearings in seat order (radians; screen y grows downward). */
  angles: number[];
  /** true = a closed ring (equal steps all the way round); false = a crescent. */
  closed: boolean;
}

/** Every rank's seats plus the derived globe. */
export interface MuRings {
  awake: MuRankRing;
  veiled: MuRankRing;
  faint: MuRankRing;
  /** The outermost seat radius among the ranks that stand (0 = nobody). */
  outer: number;
  /** THE GLOBE, derived: the wrap radius keeps `wrap.clear` of void past the
   *  outermost seat; the reentry keeps the authored radius→reentry step. */
  wrap: { radius: number; reentry: number };
}

/** The dwell reach — how far (centre to centre) a vessel engages the wisp. */
export const muDwellReach = (bodyRadius: number): number => MU_CFG.dwell.radius + bodyRadius;

/** Seats evenly from `from` over `span` — the legacy crescent expression,
 *  kept verbatim so an unwidened rank lands on the exact old angles. */
const seatsFrom = (from: number, span: number, n: number): number[] =>
  Array.from({ length: n }, (_, i) => from + span * (i / (n - 1)));

/** One rank: `n` seats at least `gap` apart on a crescent of `arc` at
 *  `radius` (the floor), widened and then grown per the law above. Pure. */
export function muRankRing(n: number, radius: number, gap: number,
  arc: { from: number; to: number } = MU_CFG.arc): MuRankRing {
  const span0 = arc.to - arc.from;
  const centre = arc.from + span0 / 2;
  if (n <= 0) return { radius, angles: [], closed: false };
  if (n === 1) return { radius, angles: [centre], closed: false };
  const chordAt = (r: number, span: number): number => 2 * r * Math.sin(span / (2 * (n - 1)));
  // 1. the crescent as authored.
  if (chordAt(radius, span0) >= gap - 1e-9) {
    return { radius, angles: seatsFrom(arc.from, span0, n), closed: false };
  }
  // 2. the crescent widened about its centre — up to a closed ring's span
  //    (first seat to last, with one step of air back to the first).
  const spanNeed = 2 * (n - 1) * Math.asin(Math.min(1, gap / (2 * radius)));
  const spanFull = 2 * Math.PI * (n - 1) / n;
  if (spanNeed <= spanFull) {
    return { radius, angles: seatsFrom(centre - spanNeed / 2, spanNeed, n), closed: false };
  }
  // 3. a closed ring grown to the gap.
  const r = Math.max(radius, gap / (2 * Math.sin(Math.PI / n)));
  return { radius: r, angles: seatsFrom(centre - spanFull / 2, spanFull, n), closed: true };
}

/** Every rank for one deal's counts: the awake hand nearest, the veiled pool
 *  stacked outside it, the cowls outside that; then the derived globe. */
export function muRings(counts: { awake: number; veiled: number; faint: number }): MuRings {
  const g = MU_CFG.ring.seatGap;
  const rankGap = MU_CFG.ring.rankGap;
  const base = MU_CFG.ranks;
  const awake = muRankRing(counts.awake, base.awake, g.awake);
  const veiled = muRankRing(counts.veiled, Math.max(base.veiled, awake.radius + rankGap), g.veiled);
  const faint = muRankRing(counts.faint, Math.max(base.faint, veiled.radius + rankGap), g.faint);
  const outer = Math.max(
    counts.awake > 0 ? awake.radius : 0,
    counts.veiled > 0 ? veiled.radius : 0,
    counts.faint > 0 ? faint.radius : 0);
  const radius = Math.max(MU_CFG.wrap.radius, outer + MU_CFG.wrap.clear);
  const reentry = radius - (MU_CFG.wrap.radius - MU_CFG.wrap.reentry);
  return { awake, veiled, faint, outer, wrap: { radius, reentry } };
}
