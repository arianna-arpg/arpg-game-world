// ---------------------------------------------------------------------------
// RELIEF — the land's vertical truth, and the RIVERS that obey it.
//
// THE FOREORDAINED TENET, applied to terrain (the sea fabric's law): the
// whole infinite world's relief is a pure function of the seed — the
// 'elevation' climate axis (world/climate.ts) is lazy, seam-free, and needs
// no horizon — and every coherent FEATURE on it computes WHOLE at first
// touch. A river is the debut feature: strewn SPRINGS deal across the world
// on a jittered lattice (the course fabric's strewn law), and a spring that
// rolled high ground TRACES its whole run downhill the first time anything
// asks — then it simply IS, identical on host, client, map, and every mint
// that lands on it. Exploration never outruns the plan, because the plan is
// the seed itself; the "here be dragons" fringe is just the part you haven't
// touched yet.
//
// Rivers ride the COURSE fabric end to end: a non-painting (paints: false)
// strewn CourseSpec with the 'downhill' tracer — so mint hints (riverland
// recipe forced onto the LOCAL tileset, upstream/downstream orientation,
// continuation exits, centerline hug) all arrive through the standing
// machinery. A river through tundra is tundra-with-a-frozen-river (the
// biome's own freezeAt), through the jungle a jungle waterway — the course
// crosses countries and repaints none of them.
//
// Pure leaf (courses + climate + continents). The ONE piece of installed
// state is the RELIEF SEED (setReliefSeed at sim boot, the climate-origin
// law): tracers receive course-salted per-instance seeds that cannot be
// inverted back to the field seed, and the elevation they descend MUST be
// the same field zones bake into geo.climate — so the field seed is
// installed once, world-agreed, beside the origin and the capital pole.
// ---------------------------------------------------------------------------

import type { MapCoord } from './coords';
import { climateAxisAt } from './climate';
import { continentAt, continentSeedFrom } from './continents';
import {
  COURSE_FIELD_SALT, coursePolyline, registerCourseTracer, resetCourseMemo,
  strewnInstancesInRect, type CourseSpec,
} from './courses';
import { registerDimensionCourse } from './dimensions';

export const RELIEF_CFG = {
  /** The springs deal (mirrored into SURFACE_RIVERS.strew): lattice span,
   *  presence chance per cell, and the elevation a spring needs to flow —
   *  a spring dealt onto low ground stays dormant (an empty polyline).
   *  Tuned so an early map window (the visited envelope, ±~600 units) has a
   *  real chance of meeting a river without every screen carrying one. */
  springs: { span: 2200, chance: 0.6, minElevation: 0.58 },
  /** The downhill trace: sample stride, step count bound (step × maxSteps =
   *  the reach bound SURFACE_RIVERS.length must cover), probe bearings per
   *  step, momentum blend (0 = pure steepest-descent, 1 = never turns), and
   *  the rise tolerance that ends a run in a basin (the lake law). */
  trace: { step: 100, maxSteps: 55, probes: 9, momentum: 0.45, riseEps: 0.004 },
  /** The river corridor: mint-hint half-width and centerline hug. */
  river: { halfWidth: 58, hug: 46 },
} as const;

/** The installed biome-field seed (setReliefSeed — sim boot, probes). The
 *  tracer descends elevation on THIS seed: course-instance seeds are hash
 *  descendants that cannot recover it, and the geometry must agree with
 *  every other sampler of the world's climate. null = no world installed —
 *  tracers return empty (rivers inert, the anchor-less capital law). */
let reliefSeed: number | null = null;

export function setReliefSeed(fieldSeed: number | null): void {
  reliefSeed = fieldSeed === null ? null : fieldSeed >>> 0;
  // Traced polylines bake the relief seed of their moment — flush them (the
  // climate-invalidation law): a re-seeded context must never serve traces
  // computed under the old ground.
  resetCourseMemo();
}

/** The land's height at a coordinate, 0..1 — THE elevation read (identical
 *  to climateAt(...).elevation by construction; this is the cheap lane). */
export function elevationAt(c: MapCoord, fieldSeed: number): number {
  return climateAxisAt(c, fieldSeed, 'elevation');
}

/** THE DOWNHILL TRACER: from a spring, walk the steepest wet way down —
 *  probe bearings around the current point, blend the best descent with
 *  momentum (rivers bend, never zigzag), stop at the sea (a mouth), in a
 *  basin no probe escapes (a lake), or at the reach bound. Pure per
 *  (anchor, installed relief seed); registered as 'downhill'. */
function traceDownhill(anchor: MapCoord): MapCoord[] {
  if (reliefSeed === null) return [];
  const seed = reliefSeed;
  const { step, maxSteps, probes, momentum, riseEps } = RELIEF_CFG.trace;
  const { minElevation } = RELIEF_CFG.springs;
  let h = elevationAt(anchor, seed);
  if (h < minElevation) return []; // a dry spring — dealt, never flowed
  const contSeed = continentSeedFrom(seed);
  const pts: MapCoord[] = [{ x: anchor.x, y: anchor.y }];
  let cur = anchor, dx = 0, dy = 0;
  for (let i = 0; i < maxSteps; i++) {
    let bx = 0, by = 0, bh = Infinity;
    for (let k = 0; k < probes; k++) {
      const a = (k / probes) * Math.PI * 2;
      const px = Math.cos(a), py = Math.sin(a);
      // Momentum folds INTO the score (a gentle preference for straight-on),
      // not into the step itself — the walked point is always a real probe,
      // so the polyline never slides along un-sampled ground.
      const c = { x: cur.x + px * step, y: cur.y + py * step };
      const back = (px * dx + py * dy) * -momentum * 0.02; // turning back reads uphill
      const hh = elevationAt(c, seed) + back;
      if (hh < bh) { bh = hh; bx = px; by = py; }
    }
    if (bh >= h - riseEps) break; // every way is up — a basin: the lake end
    cur = { x: cur.x + bx * step, y: cur.y + by * step };
    h = elevationAt(cur, seed);
    dx = bx; dy = by;
    pts.push(cur);
    if (continentAt(cur, contSeed).kind !== 'land') break; // the sea — a mouth
  }
  return pts.length >= 3 ? pts : []; // a two-point trickle is no river
}

registerCourseTracer('downhill', (_spec, anchor) => traceDownhill(anchor));

/** THE RIVERS — one strewn, non-painting, terrain-traced course row worn by
 *  the SURFACE dimension (world/dimensions.ts declares it). Everything a
 *  zone needs arrives as course mint hints: the riverland recipe forced on
 *  the local tileset, water as the liquid (a cold country's freezeAt still
 *  freezes it — the biome keeps its say), fords, orientation, onward exits. */
export const SURFACE_RIVERS: CourseSpec = {
  id: 'rivers',
  biome: 'river', // attribution identity only — paints: false never writes it
  paints: false,
  anchor: 'strewn',
  strew: { span: RELIEF_CFG.springs.span, chance: RELIEF_CFG.springs.chance, salt: 0x11e4 },
  tracer: 'downhill',
  forceLayout: 'riverland',
  // REACH BOUND for a traced course (strewn pad + continuation math), not an
  // exact arc: the trace can never outrun step × maxSteps.
  length: RELIEF_CFG.trace.step * RELIEF_CFG.trace.maxSteps,
  halfWidth: RELIEF_CFG.river.halfWidth,
  hug: RELIEF_CFG.river.hug,
  seedSalt: 0x8b1e2,
  label: 'the river',
  layoutParams: { riverLiquid: 'water', causeways: [1, 2], isles: [0, 1] },
};

// The surface wears the rivers (the fabric registers onto the dimension row —
// registerDimensionClimate's exact pattern; dimensions never imports back).
registerDimensionCourse('surface', SURFACE_RIVERS);

/** Every river polyline that could cross a map window — the world map's
 *  draw query (BiomeField.renderMap). Derives the course seed exactly as
 *  world.courseMintFor does (COURSE_FIELD_SALT — the one shared constant),
 *  so the map can never draw a river the mints don't see. */
export function riverPathsInRect(
  min: MapCoord, max: MapCoord, fieldSeed: number,
): MapCoord[][] {
  const seed = (fieldSeed ^ COURSE_FIELD_SALT) >>> 0;
  const out: MapCoord[][] = [];
  for (const inst of strewnInstancesInRect(SURFACE_RIVERS, min, max, seed)) {
    const pts = coursePolyline(SURFACE_RIVERS, inst.anchor, inst.iseed);
    if (pts.length) out.push(pts);
  }
  return out;
}
