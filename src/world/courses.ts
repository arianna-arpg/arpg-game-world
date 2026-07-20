// ---------------------------------------------------------------------------
// COURSES — winding biome THROUGHLINES across a dimension's heat map.
//
// A course is a seeded, deterministic polyline in node-space that OVERRIDES the
// biome field along its corridor — a river of flame winding through hell, a
// glacial chasm splitting a frozen layer, a mycelial vein. Where the plain
// Voronoi field paints biomes as BLOBS, a course paints one as a LINE: a
// contiguous chain of zones you can find and then FOLLOW, with a spring at its
// anchor and a terminus at its far end that can guarantee set-piece rolls
// (compositions/landmarks) — the reward for walking the whole artery.
//
// Pure leaf, same discipline as biomes/dimensions/climate: everything is
// f(spec, anchor, seed) with the shared integer-hash family — no Rng instance,
// no engine imports — so host/client/reload/genqa all derive the identical
// polyline. The ANCHOR is resolved by the caller (World: the dimension's
// minted gate-zone coordinate), because where a gate tears open depends on
// where the run breached — the course is pure GIVEN that anchor.
//
// Declared as data on DimensionDef.courses; nothing here names any specific
// course. worldgen consumes the mint HINTS (continuation sides, recipe knobs,
// terminus rolls) through the same closure pattern as biomeFor/levelFor.
// ---------------------------------------------------------------------------

import type { Dir, MapCoord } from './coords';
import { OPP_DIR } from './coords';
import { BIOMES, fieldNoise } from './biomes';
import { registerZoneInfoSource } from './zoneInfo';

/** What waits at a course's FAR END — guaranteed rolls on zones minted inside
 *  the terminus radius (chance is still honored, so authored data can keep a
 *  terminus surprising with < 1 rolls; 1 = the set-piece always stands). */
export interface CourseTerminus {
  /** Node-space radius around the polyline's end point (default TERMINUS_RADIUS). */
  radius?: number;
  /** Composition rolls appended to terminus-zone mints (shape matches
   *  data/zones.ts CompositionRoll — structural so this leaf stays pure). */
  compositions?: { composition: string; chance: number }[];
  /** Landmark rolls appended to terminus-zone mints (matches LandmarkRoll). */
  landmarks?: { landmark: string; chance: number; count?: [number, number] }[];
}

/** THE STREWN LAW (anchor: 'strewn'): a course UNTETHERED from any gate —
 *  instances dealt across the dimension's whole chart on a jittered lattice,
 *  pure f(seed). Each `span`-sized cell flips a presence coin (`chance`),
 *  and a present cell births ONE instance: a jittered anchor plus its OWN
 *  derived seed, so every instance winds its own way (heading, meander,
 *  wobble all its own). Nothing resolves an anchor for these — they exist
 *  the moment the dimension does, near a gate only if the dice put them
 *  there. */
export interface StrewSpec {
  /** Lattice cell size, node-space units (how far apart instances deal). */
  span: number;
  /** 0..1 presence chance per lattice cell. */
  chance: number;
  /** Anchor jitter as a fraction of span (default STREW_DEFAULTS.jitter). */
  jitter?: number;
  /** Lattice hash salt (composed with the spec's seedSalt). */
  salt?: number;
}

/** One dealt instance of a strewn course: a stable lattice key, the anchor
 *  coordinate, and the instance's own derived seed (pass it wherever the
 *  polyline/hit math asks for `seed` — heading and meander are ITS OWN). */
export interface CourseInstance {
  key: string;
  anchor: MapCoord;
  iseed: number;
}

export interface CourseSpec {
  /** Stable id — memo key + attribution. */
  id: string;
  /** The biome painted along the corridor (must exist in BIOMES). A biome that
   *  appears in NO field palette exists ONLY along its course — the "a place,
   *  not patches" lever (the River of Flame idiom). */
  biome: string;
  /** Where the course springs from. 'gate' = the dimension's minted gate zone
   *  (the one coordinate every client agrees on); 'strewn' = untethered
   *  instances dealt across the chart (see StrewSpec — `strew` required).
   *  New anchor kinds are data waiting on a resolver — the caller maps
   *  kind → coordinate. */
  anchor: 'gate' | 'strewn' | (string & {});
  /** The strewn deal (anchor 'strewn' only). */
  strew?: StrewSpec;
  /** Total run length in node-space units (cellSpan is 260; a cardinal hop is
   *  ~78-86 — a 2400 course is a many-zone trek). */
  length: number;
  /** Polyline vertex spacing (default COURSE_DEFAULTS.step). */
  step?: number;
  /** Per-vertex sideways jitter (default COURSE_DEFAULTS.wobble). */
  wobble?: number;
  /** How many full serpentine meanders over the run (default COURSE_DEFAULTS.waves). */
  waves?: number;
  /** Meander amplitude in node-space units (default length × COURSE_DEFAULTS.sweepFrac). */
  sweep?: number;
  /** Corridor half-width: inside it the course biome overrides (per strength). */
  halfWidth: number;
  /** Dithered BANK band beyond halfWidth where the override fades out — ragged
   *  edges on the map wash, occasional bank-biome zones (default 0 = hard edge). */
  feather?: number;
  /** 0..1 override strength inside halfWidth (1 = hard override; < 1 speckles,
   *  same semantics as BiomeFieldModifier.strength). Default 1. */
  strength?: number;
  /** How hard zones minted on the course HUG its centerline (node-space units
   *  of pull applied at mint, capped by the actual offset). The chain-keeper:
   *  un-hugged nodes drift to the corridor's edge, and a cardinal frontier
   *  step off an edge node can fall out of the corridor at a bend — breaking
   *  the followable chain. Default COURSE_DEFAULTS.hug; 0 disables. */
  hug?: number;
  /** Course seed = dimension field seed ^ seedSalt (deterministic, per-course). */
  seedSalt: number;
  /** ATTRIBUTION: map/zone-info label ("The River of Flame") — a course never
   *  recolors the heat map anonymously. */
  label?: string;
  /** Layout knobs stamped onto every zone minted ON the course (merged between
   *  tileset and spec — how the intra-zone recipe learns it rides the artery). */
  layoutParams?: Record<string, unknown>;
  /** The far-end reward rolls (see CourseTerminus). */
  terminus?: CourseTerminus;
}

/** Mint-time HINTS for a zone landing on a course — consumed by worldgen
 *  through ZoneSpec.courseFor (the same closure idiom as biomeFor). */
export interface CourseMintHints {
  spec: CourseSpec;
  /** Cardinal sides the course CONTINUES toward from this coordinate (up- and
   *  downstream, ends clipped) — worldgen guarantees an exit on each so the
   *  throughline can always be followed, never dead-ends on a bad frontier roll. */
  continueSides: Dir[];
  /** True inside the terminus radius (the far end). */
  terminus: boolean;
  /** spec.layoutParams + the derived river orientation:
   *  riverSides: [upstreamSide, downstreamSide] — the recipe carves its liquid
   *  spine between these zone edges so the artery reads CONTINUOUS zone-to-zone. */
  layoutParams: Record<string, unknown>;
  /** Vector from the sampled coordinate TO its nearest centerline point —
   *  worldgen pulls the minted node along it (capped at `hug`) so the chain
   *  stays on the line (see CourseSpec.hug). */
  centerPull: { x: number; y: number };
  /** The capped pull magnitude (spec.hug ?? default), pre-resolved so the
   *  consumer never needs the spec's defaults. */
  hug: number;
  /** Terminus rolls to append at mint (undefined off-terminus). */
  compositions?: { composition: string; chance: number }[];
  landmarks?: { landmark: string; chance: number; count?: [number, number] }[];
}

/** Course-shape fallbacks (data, not scattered literals). */
export const COURSE_DEFAULTS = {
  step: 220, wobble: 55, waves: 1.6, sweepFrac: 0.14,
  terminusRadius: 240,
  /** Continuation stops when less than this much arc remains that way
   *  (fraction of step — under one vertex of river left is an end, not a road). */
  continueMinFrac: 0.75,
  /** Default centerline hug (see CourseSpec.hug). */
  hug: 44,
} as const;

/** Strewn-deal fallbacks (see StrewSpec). */
export const STREW_DEFAULTS = { jitter: 0.5, salt: 0x57e3 } as const;

/** Integer hash (Rng's family) → deterministic across host / client / reload.
 *  Deliberately duplicated per world-leaf (biomes/dimensions/climate idiom). */
function hashCell(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}
/** Hash → 0..1 (vertex jitters, heading, phase). */
function hash01(a: number, b: number, seed: number): number {
  return hashCell(a, b, seed) / 0x100000000;
}

// Polyline memo — pure per (spec.id, seed, anchor), bounded like the biome
// field's pick memo (a re-derive is ~20 sin calls; correctness never depends
// on the cache, only the map wash's hammering does).
const polyMemo = new Map<string, MapCoord[]>();
// Strewn courses hold several live instances in one map view — the cap wants
// headroom over the old single-artery world (a re-derive is still cheap).
const POLY_MEMO_CAP = 64;

/** Drop every memoized polyline (a fresh world = a fresh field; mirrors
 *  resetFieldPickMemo, called from the same construction site). */
export function resetCourseMemo(): void { polyMemo.clear(); }

// --- the strewn deal --------------------------------------------------------

/** One lattice cell's instance, presence UNCHECKED (re-resolution from a
 *  stable key: the zone already exists, so the coin already came up). Pure
 *  of (spec, cell, seed) — the anchor jitters inside the cell, and the
 *  instance seed folds the cell in so every river winds its own way. */
export function strewnCellInstance(spec: CourseSpec, cx: number, cy: number, seed: number): CourseInstance {
  const st = spec.strew;
  const span = Math.max(1, st?.span ?? 1);
  const jit = (st?.jitter ?? STREW_DEFAULTS.jitter) * span;
  const salt = ((st?.salt ?? STREW_DEFAULTS.salt) ^ spec.seedSalt) >>> 0;
  const s = (seed ^ salt) >>> 0;
  return {
    key: `${cx}_${cy}`,
    anchor: {
      x: (cx + 0.5) * span + (hash01(cx * 5 + 1, cy * 3 + 2, s) - 0.5) * jit,
      y: (cy + 0.5) * span + (hash01(cx * 3 + 4, cy * 5 + 3, s) - 0.5) * jit,
    },
    iseed: (seed ^ hashCell(cx, cy, salt)) >>> 0,
  };
}

/** Every strewn instance of `spec` whose course could touch `coord`: the
 *  presence coin per lattice cell over a pad wide enough for the course's
 *  full reach (length + sweep + wobble + corridor). Stable cy→cx order, so
 *  first-covering-instance sampling is deterministic on every seat. Empty
 *  for non-strewn specs — callers may ask blindly. */
export function strewnInstancesNear(spec: CourseSpec, coord: MapCoord, seed: number): CourseInstance[] {
  const st = spec.strew;
  if (!st || spec.anchor !== 'strewn') return [];
  const span = Math.max(1, st.span);
  const salt = ((st.salt ?? STREW_DEFAULTS.salt) ^ spec.seedSalt) >>> 0;
  const s = (seed ^ salt) >>> 0;
  const sweep = spec.sweep ?? spec.length * COURSE_DEFAULTS.sweepFrac;
  const reach = spec.length + sweep + (spec.wobble ?? COURSE_DEFAULTS.wobble)
    + spec.halfWidth + (spec.feather ?? 0) + (st.jitter ?? STREW_DEFAULTS.jitter) * span;
  const pad = Math.max(1, Math.ceil(reach / span));
  const c0x = Math.floor(coord.x / span), c0y = Math.floor(coord.y / span);
  const out: CourseInstance[] = [];
  for (let cy = c0y - pad; cy <= c0y + pad; cy++) {
    for (let cx = c0x - pad; cx <= c0x + pad; cx++) {
      if (hash01(cx * 2 + 11, cy * 2 + 7, s) >= st.chance) continue;
      out.push(strewnCellInstance(spec, cx, cy, seed));
    }
  }
  return out;
}

/** The course's polyline, springing at `anchor`: a hash-seeded heading, a
 *  serpentine meander (sin over `waves`), per-vertex wobble. Closed-form pure —
 *  vertex i never depends on vertex i-1's roll, so there is no RNG stream to
 *  desync (the determinism doctrine worldgen's draw-order contract protects). */
export function coursePolyline(spec: CourseSpec, anchor: MapCoord, seed: number): MapCoord[] {
  const cseed = (seed ^ spec.seedSalt) >>> 0;
  const key = `${spec.id}|${cseed}|${Math.round(anchor.x)}|${Math.round(anchor.y)}`;
  const hit = polyMemo.get(key);
  if (hit) return hit;
  const step = spec.step ?? COURSE_DEFAULTS.step;
  const wobble = spec.wobble ?? COURSE_DEFAULTS.wobble;
  const waves = spec.waves ?? COURSE_DEFAULTS.waves;
  const sweep = spec.sweep ?? spec.length * COURSE_DEFAULTS.sweepFrac;
  const heading = hash01(1, 0, cseed) * Math.PI * 2;
  const phase = hash01(2, 0, cseed) * Math.PI * 2;
  const dx = Math.cos(heading), dy = Math.sin(heading);
  const px = -dy, py = dx; // perpendicular
  const segs = Math.max(3, Math.round(spec.length / step));
  const pts: MapCoord[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const along = t * spec.length;
    // The spring sits EXACTLY at the anchor (i=0 draws no lateral) — the gate
    // zone is the river's source; the corridor unrolls from its doorstep.
    const lateral = i === 0 ? 0
      : Math.sin(t * Math.PI * 2 * waves + phase) * sweep
        + (hash01(3, i, cseed) - 0.5) * 2 * wobble;
    pts.push({ x: anchor.x + dx * along + px * lateral, y: anchor.y + dy * along + py * lateral });
  }
  if (polyMemo.size >= POLY_MEMO_CAP) polyMemo.clear();
  polyMemo.set(key, pts);
  return pts;
}

/** Where a coordinate sits relative to a course: nearest distance, arc
 *  fraction t (0 spring → 1 terminus), and the flow tangent there. */
export interface CourseHit {
  spec: CourseSpec;
  dist: number;
  t: number;
  /** Unit flow tangent (spring → terminus) at the nearest point. */
  tx: number; ty: number;
  /** The nearest centerline point itself (the hug-pull's aim). */
  qx: number; qy: number;
}

/** Nearest-point test against one course (segment-exact). Returns null beyond
 *  halfWidth + feather — the corridor plus its dithered bank. */
export function courseHit(spec: CourseSpec, anchor: MapCoord, coord: MapCoord, seed: number): CourseHit | null {
  const pts = coursePolyline(spec, anchor, seed);
  const reach = spec.halfWidth + (spec.feather ?? 0);
  let best: { d2: number; t: number; tx: number; ty: number; qx: number; qy: number } | null = null;
  let arc = 0;
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  if (total <= 0) return null;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i].x, ay = pts[i].y, bx = pts[i + 1].x, by = pts[i + 1].y;
    const vx = bx - ax, vy = by - ay;
    const segLen = Math.hypot(vx, vy) || 1;
    const u = Math.max(0, Math.min(1, ((coord.x - ax) * vx + (coord.y - ay) * vy) / (segLen * segLen)));
    const qx = ax + vx * u, qy = ay + vy * u;
    const d2 = (coord.x - qx) ** 2 + (coord.y - qy) ** 2;
    if (!best || d2 < best.d2) {
      best = { d2, t: (arc + segLen * u) / total, tx: vx / segLen, ty: vy / segLen, qx, qy };
    }
    arc += segLen;
  }
  if (!best) return null;
  const dist = Math.sqrt(best.d2);
  if (dist > reach) return null;
  return { spec, dist, t: best.t, tx: best.tx, ty: best.ty, qx: best.qx, qy: best.qy };
}

/** The composed course override at a coordinate, or null where no course
 *  paints. Inside halfWidth the override holds per `strength`; through the
 *  feather band it fades to nothing — both dithered with the shared field
 *  noise so partial strength speckles instead of hard-replacing (the
 *  BiomeFieldModifier semantics, drawn along a line). First covering course
 *  wins (declare the dominant artery first). */
export function courseBiomeAt(
  specs: readonly CourseSpec[], anchor: MapCoord, coord: MapCoord, seed: number,
): string | null {
  for (const spec of specs) {
    const hit = courseHit(spec, anchor, coord, seed);
    if (!hit) continue;
    const strength = spec.strength ?? 1;
    const feather = spec.feather ?? 0;
    let p = strength;
    if (hit.dist > spec.halfWidth && feather > 0) {
      p = strength * (1 - (hit.dist - spec.halfWidth) / feather);
    }
    if (p >= 1 || fieldNoise(coord.x, coord.y, (seed ^ spec.seedSalt) >>> 0) < p) return spec.biome;
  }
  return null;
}

/** The dominant cardinal a flow tangent points toward (map y+ is SOUTH). */
function tangentSide(tx: number, ty: number): Dir {
  return Math.abs(tx) >= Math.abs(ty) ? (tx >= 0 ? 'e' : 'w') : (ty >= 0 ? 's' : 'n');
}

/** Mint hints for a zone landing at `coord` — null when no course PAINTS the
 *  coordinate (hints must agree with the biome the field sampler returned, so
 *  a feather-band coord that dithered OFF gets no artery dressing). */
export function courseMintHints(
  specs: readonly CourseSpec[], anchor: MapCoord, coord: MapCoord, seed: number,
): CourseMintHints | null {
  const painted = courseBiomeAt(specs, anchor, coord, seed);
  if (!painted) return null;
  const spec = specs.find(s => s.biome === painted);
  if (!spec) return null;
  const hit = courseHit(spec, anchor, coord, seed);
  if (!hit) return null;
  const down = tangentSide(hit.tx, hit.ty);
  const up = OPP_DIR[down];
  const minArc = (spec.step ?? COURSE_DEFAULTS.step) * COURSE_DEFAULTS.continueMinFrac;
  const continueSides: Dir[] = [];
  if (hit.t * spec.length > minArc) continueSides.push(up);
  if ((1 - hit.t) * spec.length > minArc) continueSides.push(down);
  const pts = coursePolyline(spec, anchor, seed);
  const end = pts[pts.length - 1];
  const terminus = Math.hypot(coord.x - end.x, coord.y - end.y)
    <= (spec.terminus?.radius ?? COURSE_DEFAULTS.terminusRadius);
  return {
    spec,
    continueSides,
    terminus,
    // The recipe's orientation: carve the liquid spine upstream-edge →
    // downstream-edge so consecutive course zones read as ONE river.
    layoutParams: { ...spec.layoutParams, riverSides: [up, down] },
    centerPull: { x: hit.qx - coord.x, y: hit.qy - coord.y },
    hug: spec.hug ?? COURSE_DEFAULTS.hug,
    ...(terminus && spec.terminus?.compositions ? { compositions: spec.terminus.compositions } : {}),
    ...(terminus && spec.terminus?.landmarks ? { landmarks: spec.terminus.landmarks } : {}),
  };
}

/** Boot validator: every course biome must exist in BIOMES (a course painting
 *  an unregistered biome would mint warn-fallback deepwood in hell). Returns
 *  "dimension/course: biome" offenders. */
export function validateCourses(
  dims: readonly { id: string; courses?: readonly CourseSpec[] }[],
): string[] {
  const bad: string[] = [];
  for (const d of dims) {
    for (const c of d.courses ?? []) {
      if (!BIOMES[c.biome]) bad.push(`${d.id}/${c.id}: ${c.biome}`);
    }
  }
  return bad;
}

// The zone-info box names the artery a zone rides (the attribution half of the
// "heat map never changes anonymously" doctrine, extended to courses). A
// course-only biome tag is exact evidence — it appears in NO field palette, so
// wearing it MEANS the course painted this zone.
registerZoneInfoSource((world, zoneId) => {
  const z = world.zoneMap[zoneId];
  if (!z?.dimension || !z.biome) return [];
  const spec = world.courseSpecsFor(z.dimension).find(c => c.biome === z.biome);
  if (!spec) return [];
  return [{
    kind: 'modifier' as const,
    icon: '🔥',
    color: BIOMES[spec.biome]?.mapColor,
    label: spec.label ?? `${BIOMES[spec.biome]?.label ?? spec.biome} course`,
    detail: 'an artery of the deep — follow it',
  }];
});
