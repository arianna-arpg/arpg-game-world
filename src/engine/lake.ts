// ---------------------------------------------------------------------------
// THE LAKE — a ZONE TYPE (Scald Basin M2a; charter docs/design/scald-basin.md
// §6 THE LAKE, card 1 ratified): one very large, centrally-focused water
// stamp whose zone CONFORMS to it. The river type established "a feature
// that outranks the zone hands it mint hints and the zone conforms"; the
// mere (data/merelake.ts + engine/tiers.ts carveUnderGrotto) established "a
// water body as a region family, classified before paint, all-or-nothing".
// THE LAKE is those two married at surface scale:
//
//   · THE CONFORM LAW — the lake is the arena shape shrunk inward by THE
//     RING (the walkable annulus — exits, portal clears and reachability all
//     live on it) and wobbled by the mere's rim law (bearingNoise harmonics:
//     never a circle, never a ruler). Every cell is CLASSIFIED first (deep /
//     shelf / shore / land / isle / spit) and painted only once the plan
//     stands whole — a failed plan leaves the zone byte-flat (the mere's
//     law: no orphan half-lake, no portal under water).
//   · THE TRAVERSABILITY RING — a wadeable shallow SHELF rings the deep
//     core (the shelf liquid's own standStatus — wading), with ISLES reaching
//     inward through it (perch/loot pockets joining ctx.pois; some tied to
//     shore by a SPIT) — you can get WET and get PARTWAY; the middle you
//     cannot have.
//   · THE DEEP-MIDDLE REFUSAL — `deepPolicy` per lake row: 'block' (the
//     sulphur debut: a non-walkable, non-blocking region — REFUSED as
//     ground through an `eject` boundary policy, DRAWN as water, SHOTS and
//     SIGHT passing — an occlusion-free firing lane across the middle is
//     the lake's tactical signature) or 'swim' (the deep_water row — breath-
//     priced swimming by standing law; a future cold lake flips the dial).
//     Why 'eject' and never 'fall': fall-family policies are OVERRIDDEN in
//     caves into the pit fabric's descend (World.pitPolicyFor) — a lake
//     poured under ground would become a door; an authored eject keeps its
//     meaning everywhere.
//   · THE SHORE LANDING — a no-back-portal arrival lands a zone at its
//     arena CENTER (World.loadZone's default entry) — on the lake that is
//     the deep. The recipe snaps such an entry to the nearest SHORE so the
//     reachability invariant's root, zoneEntry and the party's landing all
//     agree on dry ground (a portal entry is already on the ring and never
//     moves).
//   · THE AUTHORED METRONOME — `lakeVent` seats ONE landmark-grade vent on
//     an offshore isle just past the deep's rim through the geyser fabric's
//     authoring seam (GenCtx.authoredVents → World.bootGeysers anchors it:
//     its OWN band, the metronome law) — the lake's loudest clock.
//
// THE RECIPE ID IS `lakeshore` (the zone IS the shore ring around the lake):
// the charter names the recipe `lake`, but THE UNIQUE-ID LAW (data/validate.ts
// — generation ids are unique ACROSS the six registries; a shared id's twin
// is silently unreachable) already gives `lake` to the FURNITURE landmark
// (the lakelands' pond). A face pins `forceLayout: 'lakeshore'`.
//
// Every knob is a layoutParam (spec ▷ tileset ▷ biome); every number a DIAL
// (unblessed — she blesses via playthroughs). The liquids are registered
// genkit liquids — 'sulphur' / 'sulphur_deep' by the scald kit
// (data/scald.ts), the generic 'lake_shallows' / 'lake_deep' / 'deep_water'
// as this recipe's pinned defaults (the orphan census sees the pins).
// BOUNDARY LAWS (so nobody re-litigates): the lake is IN-ZONE terrain,
// never a sea-fabric citizen (world/seas.ts classes ocean components — no
// ports, no sea ladder); the `lakelands` recipe and the `flooded_caldera`
// landmark stand (lakes as FURNITURE; this is the lake AS THE ZONE); the
// mere stands (its span-held ephemerality is an optional future dial, not
// the debut's); the generic river-basin-terminal join (world/relief.ts'
// own "lake law" comment) stays charted, not built.
// Docs: docs/engine/lake.md. Probe: balance/probe_lake.ts.
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import type { ZoneDef } from '../data/zones';
import { regionKind } from '../world/regions';
import {
  registerLayout, layoutParam, ensureGrid, scatterDecoration, stamp,
  type DoodadKind, type GenCtx,
} from './levelgen';
import { Mask, bearingNoise, liquidOf, paintLiquid, paintRegion, type LiquidSpec } from './genkit';
import { registerGenPin } from './genPins';
import type { GeyserClassId } from './geysers';

// --- config (ALL DIAL) ------------------------------------------------------

export const LAKE_CFG = {
  /** THE RING: the walkable annulus width — a fraction of the arena's short
   *  axis, clamped to a playable band, jittered per mint, and wobbled per
   *  bearing (±wobble of the width) so the shore never reads as a ruler. */
  ring: { frac: 0.2, min: 340, max: 720, jitter: [0.94, 1.06] as const, wobble: 0.18 },
  /** How RECTANGULAR the rim reads on a rect arena: 0 = the inscribed
   *  ellipse's silhouette (pure blob), 1 = the arena rect shrunk by the ring
   *  (corners filled). The blend keeps the long sides following the arena
   *  (a wide zone = a wide lake) while the corners soften into land bays. */
  rectness: 0.35,
  /** The smallest rim radius (at its tightest bearing) a lake may stand at —
   *  below this the zone is too small for geography and the plan REFUSES. */
  minRimR: 300,
  /** THE DEEP CORE: its radius as a fraction of the rim's at each bearing
   *  (rolled per mint), wobbled separately so the shelf breathes in width,
   *  and never closer to the rim than shelfMin (the wadeable band is a
   *  promise, not a sliver). */
  deep: { frac: [0.58, 0.68] as const, wobble: 0.1, shelfMin: 110 },
  /** The SHORE band (land just past the waterline) the dress rows seat on. */
  shoreW: 72,
  /** Land guaranteed around every portal; a plan that can't keep it SHRINKS
   *  the lake (grows the ring) and, past shrinkTries, refuses whole. */
  portalClear: 200,
  shrinkTries: 4,
  /** ISLES in the shelf band: count (the `isles` layoutParam — the riverland
   *  key), radius band, the clear water kept around each, min spacing as a
   *  multiple of the larger radius, the spit chance + half-width. */
  isles: { count: [2, 4] as const, r: [46, 84] as const, gap: 36, spacingMul: 2.4, spitChance: 0.45, spitHalfW: 22 },
  /** THE METRONOME ISLE (lakeVent): its radius, the water kept between it
   *  and the deep's rim, and the bearings tried before the seat is given up. */
  metronome: { isleR: 64, gap: 40, tries: 14 },
  /** THE GREAT SHOAL (the under-tier seat — the cistern, charter §8/§13 M3):
   *  when a lane is dialed under the lake (`layoutParams.underTier`), ONE
   *  broad isle big enough to hold a story beneath is minted FIRST, at the
   *  bearing whose shelf band is widest, away from the arrival, and held out
   *  to the under-tier tail (GenCtx.underSeats). `r` is its radius band
   *  (the band's fit decides the actual radius; under rMin no shoal stands
   *  and the lane's dial honestly does nothing), `gap` the water kept on
   *  both sides, `tries` the bearings sampled, `entryClear` the least
   *  distance from the arrival (the secret keeps away from the door — the
   *  grotto's own entryClear + a chamber, with room to spare). */
  shoal: { r: [230, 270] as const, gap: 28, tries: 16, entryClear: 560 },
  /** RESERVATION lattice over the water (landmark/composition rolls that run
   *  AFTER the recipe route around reservations — a `lake` furniture
   *  landmark must never pour a douse pond into the sulphur shelf). */
  reserve: { step: 270, r: 200 },
  /** The plan registry kept for probes/dev (the last N planned lakes). */
  keepPlans: 8,
} as const;

// --- pins (the orphan census's witnesses for this recipe's own defaults) ----

/** The SHELF pour when no row names one (layoutParams.lakeLiquid). */
const LAKE_SHALLOWS_LIQUID = registerGenPin('liquid', 'lake_shallows', 'the lake shelf default (layoutParams.lakeLiquid)');
/** The DEEP pour under deepPolicy 'block' when no row names one (layoutParams.deepLiquid). */
const LAKE_DEEP_BLOCK_LIQUID = registerGenPin('liquid', 'lake_deep', "the lake deep default under deepPolicy 'block' (layoutParams.deepLiquid)");
/** The DEEP pour under deepPolicy 'swim' (the standing breath-priced row). */
const LAKE_DEEP_SWIM_LIQUID = registerGenPin('liquid', 'deep_water', "the lake deep under deepPolicy 'swim' (layoutParams.deepLiquid)");

// --- types ------------------------------------------------------------------

export type LakeDeepPolicy = 'block' | 'swim';

/** One shore-dress row (layoutParams.lakeShore): walk-over pieces seated on
 *  the shore band — the scald's crusts and shelves. */
export interface LakeShoreRow { kind: DoodadKind; count: [number, number]; radius: [number, number] }

/** The waterline clusters (layoutParams.lakeTerraces): a registered cluster
 *  stamped at `count` shore sites (the sinter terrace stair). */
export interface LakeTerraceRow { cluster: string; count: [number, number] }

/** Cell classes — the plan's whole vocabulary. */
export const LAKE_CELL = { land: 0, shore: 1, shelf: 2, deep: 3, isle: 4, spit: 5 } as const;
export type LakeCell = typeof LAKE_CELL[keyof typeof LAKE_CELL];

/** THE PLAN — the classification the paint reproduces cell for cell.
 *  Kept (LAKE_PLANS) so a probe can hold the painted grid against it:
 *  classify-before-paint is the law, and this is its witness. */
export interface LakePlan {
  cx: number; cy: number;
  /** The ring width (world units) the plan settled on (after shrinks). */
  ringW: number;
  deepFrac: number;
  /** Rim / deep radius at a bearing (pure — the plan's own rim law). */
  rimAt: (theta: number) => number;
  deepAt: (theta: number) => number;
  /** Per grid cell (row-major, cols × rows at `cell`): a LAKE_CELL class. */
  classes: Uint8Array;
  cols: number; rows: number; cell: number;
  isles: { pos: Vec2; r: number; spit: boolean; vent?: GeyserClassId; shoal?: true }[];
  /** The metronome's seat (the authored vent), if the row asked for one. */
  ventAt?: Vec2;
  /** THE GREAT SHOAL's seat (the under-tier offer), if a lane was dialed and
   *  a bearing held a wide enough band. */
  shoalAt?: Vec2;
  /** Why no lake stands (the all-or-nothing refusal), or undefined. */
  refused?: string;
  /** The deep policy + the liquids the plan poured. */
  deepPolicy: LakeDeepPolicy;
  shelfLiquid: string;
  deepLiquid: string;
  /** Where a water-bound entry was moved to (THE SHORE LANDING), if it was. */
  landing?: Vec2;
}

/** Planned lakes by zone id (the last LAKE_CFG.keepPlans) — probe/dev read. */
export const LAKE_PLANS = new Map<string, LakePlan>();

function keepPlan(id: string, plan: LakePlan): void {
  LAKE_PLANS.delete(id);
  LAKE_PLANS.set(id, plan);
  while (LAKE_PLANS.size > LAKE_CFG.keepPlans) {
    const first = LAKE_PLANS.keys().next().value;
    if (first === undefined) break;
    LAKE_PLANS.delete(first);
  }
}

// --- the rim law ------------------------------------------------------------

/** Distance from the arena center to its boundary along a bearing — the
 *  rect's edge or the ellipse's rim, blended by `rectness` (rect arenas;
 *  an ellipse arena is its own silhouette). Pure geometry. */
export function lakeBoundaryDist(w: number, h: number, shape: 'rect' | 'ellipse', rectness: number, theta: number): number {
  const hw = w / 2, hh = h / 2;
  const c = Math.cos(theta), s = Math.sin(theta);
  const ell = (hw * hh) / Math.max(1e-6, Math.hypot(hh * c, hw * s));
  if (shape === 'ellipse') return ell;
  const rx = Math.abs(c) < 1e-6 ? Infinity : hw / Math.abs(c);
  const ry = Math.abs(s) < 1e-6 ? Infinity : hh / Math.abs(s);
  const rect = Math.min(rx, ry);
  return ell * (1 - rectness) + rect * rectness;
}

// --- the recipe -------------------------------------------------------------

/** Resolve the deep liquid for a policy: the row's own name when it agrees
 *  with the policy (a 'block' deep must pour a REFUSING region, a 'swim'
 *  deep a walkable one — a lying row warns and falls to the policy default),
 *  else the policy's pinned default. */
function deepLiquidFor(def: ZoneDef, policy: LakeDeepPolicy): string {
  const dflt = policy === 'swim' ? LAKE_DEEP_SWIM_LIQUID : LAKE_DEEP_BLOCK_LIQUID;
  const named = layoutParam<string | undefined>(def, 'deepLiquid', undefined);
  if (!named) return dflt;
  const spec = liquidOf(named, dflt);
  const rk = spec.region ? regionKind(spec.region) : undefined;
  const walkable = rk ? rk.walkable : true; // a doodad liquid pours over walkable ground
  if (policy === 'block' && walkable) {
    console.warn(`[lake] '${def.id}' names deepLiquid '${named}' under deepPolicy 'block' but it is walkable — pouring '${dflt}' instead`);
    return dflt;
  }
  if (policy === 'swim' && !walkable) {
    console.warn(`[lake] '${def.id}' names deepLiquid '${named}' under deepPolicy 'swim' but it refuses bodies — pouring '${dflt}' instead`);
    return dflt;
  }
  return named;
}

function lakeLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const C = LAKE_CFG;
  const grid = ensureGrid(ctx);
  const cell = grid.cell;
  const cols = grid.cols, rows = grid.rows;
  const shape: 'rect' | 'ellipse' = arena.shape === 'ellipse' ? 'ellipse' : 'rect';

  // --- the row's dials ---
  const shelfLiquidId = layoutParam<string>(def, 'lakeLiquid', LAKE_SHALLOWS_LIQUID);
  const deepPolicy = layoutParam<LakeDeepPolicy>(def, 'deepPolicy', 'block');
  const deepLiquidId = deepLiquidFor(def, deepPolicy);
  const deepBand = layoutParam<readonly [number, number]>(def, 'lakeDeepFrac', C.deep.frac);
  const ringFrac = layoutParam<number>(def, 'lakeRingFrac', C.ring.frac);
  const rectness = layoutParam<number>(def, 'lakeRectness', C.rectness);
  const isleBand = layoutParam<readonly [number, number]>(def, 'isles', C.isles.count);
  const ventCls = layoutParam<GeyserClassId | undefined>(def, 'lakeVent', undefined);
  const shoreRows = layoutParam<LakeShoreRow[]>(def, 'lakeShore', []);
  const terraceRow = layoutParam<LakeTerraceRow | undefined>(def, 'lakeTerraces', undefined);

  const refuse = (why: string): void => {
    console.warn(`[lake] '${def.id}' stands no lake — ${why} (the zone stays byte-flat)`);
    keepPlan(def.id, {
      cx: arena.w / 2, cy: arena.h / 2, ringW: 0, deepFrac: 0,
      rimAt: () => 0, deepAt: () => 0,
      classes: new Uint8Array(0), cols, rows, cell, isles: [],
      refused: why, deepPolicy, shelfLiquid: shelfLiquidId, deepLiquid: deepLiquidId,
    });
    scatterDecoration(ctx, def);
  };
  if (arena.boundless) { refuse('a boundless arena has no ring'); return; }

  // --- THE PLAN: rolls first (the draw-order contract — every mint of this
  //     recipe draws the same shape of stream), geometry second ---
  const cx = arena.w / 2, cy = arena.h / 2;
  const ringBase = Math.min(C.ring.max, Math.max(C.ring.min, Math.min(arena.w, arena.h) * ringFrac))
    * rng.range(C.ring.jitter[0], C.ring.jitter[1]);
  const seedRim = rng.int(1, 0x3fffffff);
  const seedDeep = rng.int(1, 0x3fffffff);
  const deepFrac = rng.range(deepBand[0], deepBand[1]);

  const boundary = (th: number): number => lakeBoundaryDist(arena.w, arena.h, shape, rectness, th);
  let ringW = ringBase;
  const rimAtW = (th: number, w: number): number => boundary(th) - w * (1 + bearingNoise(th, C.ring.wobble, seedRim));
  const deepAtW = (th: number, w: number): number => {
    const rim = rimAtW(th, w);
    return Math.min(rim - C.deep.shelfMin, rim * deepFrac * (1 + bearingNoise(th, C.deep.wobble, seedDeep)));
  };

  // CLASSIFY (no paint): every cell center against the rim law.
  const classes = new Uint8Array(cols * rows);
  const classify = (w: number): void => {
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const x = (gx + 0.5) * cell, y = (gy + 0.5) * cell;
        const dx = x - cx, dy = y - cy;
        const d = Math.hypot(dx, dy);
        const th = Math.atan2(dy, dx);
        const rim = rimAtW(th, w);
        let k: LakeCell = LAKE_CELL.land;
        if (d <= deepAtW(th, w)) k = LAKE_CELL.deep;
        else if (d <= rim) k = LAKE_CELL.shelf;
        else if (d <= rim + C.shoreW) k = LAKE_CELL.shore;
        classes[gy * cols + gx] = k;
      }
    }
  };
  const classAt = (x: number, y: number): LakeCell => {
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return LAKE_CELL.land;
    return classes[gy * cols + gx] as LakeCell;
  };
  const isWater = (k: LakeCell): boolean => k === LAKE_CELL.shelf || k === LAKE_CELL.deep;

  // THE PORTAL LAW: land within portalClear of every exit, or the lake
  // SHRINKS (the ring grows) — and past the tries, refuses whole. The
  // minimum-rim guard rides the same loop (a zone too small for geography
  // refuses on the first pass).
  let standing = false;
  for (let attempt = 0; attempt <= C.shrinkTries && !standing; attempt++) {
    let minRim = Infinity;
    for (let i = 0; i < 64; i++) minRim = Math.min(minRim, rimAtW((i / 64) * Math.PI * 2, ringW));
    if (minRim < C.minRimR) { refuse(`the ring leaves a rim of ${Math.round(minRim)} < ${C.minRimR} — the zone is too small`); return; }
    classify(ringW);
    let worst = 0;
    for (const p of ctx.exits) {
      const r = C.portalClear;
      const gx0 = Math.max(0, Math.floor((p.x - r) / cell)), gx1 = Math.min(cols - 1, Math.floor((p.x + r) / cell));
      const gy0 = Math.max(0, Math.floor((p.y - r) / cell)), gy1 = Math.min(rows - 1, Math.floor((p.y + r) / cell));
      for (let gy = gy0; gy <= gy1; gy++) {
        for (let gx = gx0; gx <= gx1; gx++) {
          const x = (gx + 0.5) * cell, y = (gy + 0.5) * cell;
          if (Math.hypot(x - p.x, y - p.y) > r) continue;
          if (!isWater(classes[gy * cols + gx] as LakeCell)) continue;
          worst = Math.max(worst, r - Math.hypot(x - p.x, y - p.y) + cell);
        }
      }
    }
    if (worst <= 0) { standing = true; break; }
    ringW += worst + cell; // grow the ring by the deepest intrusion + a cell
  }
  if (!standing) { refuse('a portal stands in the water after every shrink'); return; }
  const rimAt = (th: number): number => rimAtW(th, ringW);
  const deepAt = (th: number): number => deepAtW(th, ringW);

  // THE ISLES: seated in the shelf band, spaced, never into the deep (an
  // isle is a disc ∩ the shelf — the refusal stays whole by construction);
  // some tied to shore by a spit. Rolls are taken in one fixed shape.
  const isles: LakePlan['isles'] = [];
  const isleCells = (pos: Vec2, r: number, asClass: LakeCell): void => {
    const gx0 = Math.max(0, Math.floor((pos.x - r) / cell)), gx1 = Math.min(cols - 1, Math.floor((pos.x + r) / cell));
    const gy0 = Math.max(0, Math.floor((pos.y - r) / cell)), gy1 = Math.min(rows - 1, Math.floor((pos.y + r) / cell));
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const x = (gx + 0.5) * cell, y = (gy + 0.5) * cell;
        if (Math.hypot(x - pos.x, y - pos.y) > r) continue;
        if (classes[gy * cols + gx] === LAKE_CELL.shelf) classes[gy * cols + gx] = asClass;
      }
    }
  };
  const spaced = (pos: Vec2, r: number): boolean =>
    isles.every(o => Math.hypot(o.pos.x - pos.x, o.pos.y - pos.y) >= Math.max(o.r, r) * C.isles.spacingMul);
  // THE GREAT SHOAL (the under-tier seat — the cistern): a lane dialed under
  // the lake gets ONE broad isle minted FIRST (the other isles space around
  // it), at the bearing whose shelf band is WIDEST (sampled across the
  // disc's own angular span, so the wobbling rim and deep never clip it),
  // away from the arrival. Its radius is the band's fit, capped; under the
  // floor no shoal stands and the dial does nothing (honest). One roll,
  // lane-gated — lane-less lakes draw nothing here and stay byte-identical.
  // Offered to the tail as GenCtx.underSeats; the chamber that seats under
  // it is the under-tier fabric's business (engine/tiers.ts carveUnderGrotto,
  // UnderGrottoSpec.seat 'offered').
  let shoalAt: Vec2 | undefined;
  if (layoutParam<string | undefined>(def, 'underTier', undefined) !== undefined) {
    const th0 = rng.range(0, Math.PI * 2);
    let best: { pos: Vec2; r: number; key: number } | null = null;
    for (let t = 0; t < C.shoal.tries; t++) {
      const th = th0 + (t / C.shoal.tries) * Math.PI * 2;
      const mid = (deepAt(th) + rimAt(th)) / 2;
      // The fit at this bearing: the narrowest band across the disc's own
      // angular span (a first guess from the centre bearing, then the span
      // it implies), minus the water kept on both sides.
      const fitAt = (a: number): number => (rimAt(a) - deepAt(a) - 2 * C.shoal.gap) / 2;
      let r = Math.min(C.shoal.r[1], fitAt(th));
      if (r < C.shoal.r[0]) continue;
      const span = r / Math.max(1, mid);
      for (let k = -2; k <= 2; k++) r = Math.min(r, fitAt(th + (k / 2) * span));
      if (r < C.shoal.r[0]) continue;
      const pos = vec(cx + Math.cos(th) * mid, cy + Math.sin(th) * mid);
      const dEntry = Math.hypot(pos.x - ctx.entry.x, pos.y - ctx.entry.y);
      if (dEntry < C.shoal.entryClear) continue;
      // The widest band wins; among equals, the farther from the door.
      const key = Math.round(r) * 1e4 + Math.min(9999, Math.round(dEntry));
      if (!best || key > best.key) best = { pos, r, key };
    }
    if (best) {
      isleCells(best.pos, best.r, LAKE_CELL.isle);
      isles.push({ pos: best.pos, r: best.r, spit: false, shoal: true });
      shoalAt = best.pos;
    }
  }
  const nIsles = rng.int(isleBand[0], isleBand[1]);
  const th0 = rng.range(0, Math.PI * 2);
  for (let i = 0; i < nIsles; i++) {
    // Each isle owns a sector of bearings; its radius, radial seat and spit
    // roll in that order whether or not the seat stands (the draw contract).
    const th = th0 + ((i + rng.range(0.15, 0.85)) / Math.max(1, nIsles)) * Math.PI * 2;
    const r = rng.range(C.isles.r[0], C.isles.r[1]);
    const inner = deepAt(th) + r + C.isles.gap, outer = rimAt(th) - r - C.isles.gap;
    const radial = rng.range(Math.min(inner, outer), Math.max(inner, outer));
    const spit = rng.chance(C.isles.spitChance);
    if (outer <= inner) continue; // the band is too thin here — no isle
    const pos = vec(cx + Math.cos(th) * radial, cy + Math.sin(th) * radial);
    if (!spaced(pos, r)) continue;
    isleCells(pos, r, LAKE_CELL.isle);
    if (spit) {
      // A bar from the isle's rim to the shore along its bearing: shelf
      // cells within spitHalfW of the segment become land (a walkable
      // sandbar — reads as the isle reaching back for the shore).
      const far = vec(cx + Math.cos(th) * (rimAt(th) + cell), cy + Math.sin(th) * (rimAt(th) + cell));
      const hw = C.isles.spitHalfW;
      const gx0 = Math.max(0, Math.floor((Math.min(pos.x, far.x) - hw) / cell)), gx1 = Math.min(cols - 1, Math.floor((Math.max(pos.x, far.x) + hw) / cell));
      const gy0 = Math.max(0, Math.floor((Math.min(pos.y, far.y) - hw) / cell)), gy1 = Math.min(rows - 1, Math.floor((Math.max(pos.y, far.y) + hw) / cell));
      const sx = far.x - pos.x, sy = far.y - pos.y, len2 = sx * sx + sy * sy || 1;
      for (let gy = gy0; gy <= gy1; gy++) {
        for (let gx = gx0; gx <= gx1; gx++) {
          if (classes[gy * cols + gx] !== LAKE_CELL.shelf) continue;
          const x = (gx + 0.5) * cell, y = (gy + 0.5) * cell;
          let t = ((x - pos.x) * sx + (y - pos.y) * sy) / len2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const px = x - (pos.x + sx * t), py = y - (pos.y + sy * t);
          if (px * px + py * py <= hw * hw) classes[gy * cols + gx] = LAKE_CELL.spit;
        }
      }
    }
    isles.push({ pos, r, spit });
  }
  // THE METRONOME ISLE: just off the deep's rim (offshore), its own seat
  // clear of the other isles; the vent stands dead center.
  let ventAt: Vec2 | undefined;
  if (ventCls) {
    const r = C.metronome.isleR;
    const thm0 = rng.range(0, Math.PI * 2);
    for (let t = 0; t < C.metronome.tries && !ventAt; t++) {
      const th = thm0 + (t / C.metronome.tries) * Math.PI * 2;
      const radial = deepAt(th) + C.metronome.gap + r;
      if (radial + r + C.isles.gap > rimAt(th)) continue; // the shelf is too thin here
      const pos = vec(cx + Math.cos(th) * radial, cy + Math.sin(th) * radial);
      if (!spaced(pos, r)) continue;
      isleCells(pos, r, LAKE_CELL.isle);
      isles.push({ pos, r, spit: false, vent: ventCls });
      ventAt = pos;
    }
    if (!ventAt) console.warn(`[lake] '${def.id}': no shelf bearing seats the metronome isle — the lake keeps no authored vent`);
  }

  // --- PAINT (the classification's own cells — drawn == classified) ---
  const shelfLiq: LiquidSpec = liquidOf(shelfLiquidId, LAKE_SHALLOWS_LIQUID);
  const deepLiq: LiquidSpec = liquidOf(deepLiquidId, LAKE_DEEP_BLOCK_LIQUID);
  const shelfMask = Mask.forRect(0, 0, arena.w, arena.h, cell);
  const deepMask = shelfMask.like();
  const isleMask = shelfMask.like();
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const k = classes[gy * cols + gx];
      if (k === LAKE_CELL.shelf) shelfMask.set(gx, gy, true);
      else if (k === LAKE_CELL.deep) deepMask.set(gx, gy, true);
      else if (k === LAKE_CELL.isle || k === LAKE_CELL.spit) isleMask.set(gx, gy, true);
    }
  }
  paintLiquid(ctx, grid, deepMask, deepLiq);
  paintLiquid(ctx, grid, shelfMask, shelfLiq);
  // A doodad-poured shelf (the generic 'shallows') still tells the GRID it
  // is water — the harborcove skirt's discipline (the wet seat, the fuse and
  // habitat reads all speak grid regions too).
  if (!shelfLiq.region) paintRegion(grid, shelfMask, 'water');
  // Isles and spits are GROUND over whatever was poured (the riverland isle
  // discipline: the liquid's doodads under them are spliced, rim-aware).
  paintRegion(grid, isleMask, 'ground');
  const pourKinds = new Set([shelfLiq.doodad, deepLiq.doodad].filter((k): k is DoodadKind => !!k));
  if (pourKinds.size) {
    for (let k = ctx.doodads.length - 1; k >= 0; k--) {
      const d = ctx.doodads[k];
      if (!pourKinds.has(d.kind)) continue;
      if (isles.some(i => Math.hypot(d.pos.x - i.pos.x, d.pos.y - i.pos.y) < i.r + d.radius * 0.7)) ctx.doodads.splice(k, 1);
    }
  }
  // Isles are perch/loot POIs — EXCEPT the metronome's: that isle is the
  // vent's own seat (every POI consumer — objective fixtures, scenery,
  // puzzles, the harvest — draws from ctx.pois, and a survey spire planted
  // on the seat would refuse the vent at load). A landmark-grade seat is not
  // a free POI.
  for (const i of isles) if (!i.vent) ctx.pois.push(vec(i.pos.x, i.pos.y));
  if (ventAt && ventCls) (ctx.authoredVents ??= []).push({ pos: vec(ventAt.x, ventAt.y), cls: ventCls });
  // THE OFFER: the great shoal is held out to the under-tier tail (the one
  // seat a cistern may sink under). It STAYS a perch POI — the well the
  // tail cuts sits on the chamber's arrival-side rim, never at the centre a
  // load-time fixture would take, and the lid over the story is honest
  // surface ground for anything that perches there.
  if (shoalAt) {
    const sh = isles.find(i => i.shoal)!;
    (ctx.underSeats ??= []).push({ pos: vec(shoalAt.x, shoalAt.y), r: sh.r });
  }

  // THE SHORE LANDING: an entry standing in the water (the no-back-portal
  // center default) moves to the nearest shore — the invariant's root, the
  // zone's entry and the party's landing agree on dry ground.
  let landing: Vec2 | undefined;
  if (isWater(classAt(ctx.entry.x, ctx.entry.y))) {
    let best: Vec2 | null = null, bd = Infinity;
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const k = classes[gy * cols + gx];
        if (k !== LAKE_CELL.land && k !== LAKE_CELL.shore) continue;
        const x = (gx + 0.5) * cell, y = (gy + 0.5) * cell;
        const d = Math.hypot(x - ctx.entry.x, y - ctx.entry.y);
        if (d < bd) { bd = d; best = vec(x, y); }
      }
    }
    if (best) { ctx.entry.x = best.x; ctx.entry.y = best.y; landing = best; }
  }

  // RESERVE the water: a lattice of discs over shelf + deep, so every roll
  // that runs after the recipe (landmarks, structures, composition posts)
  // routes around the lake — the furniture lakes stay on the ring. THE
  // METRONOME ISLE is reserved whole: its vent seats at LOAD (bootGeysers'
  // clearSeat refuses a solid on the mouth), so no scatter may plant a
  // cone on it — the other isles stay open perch pockets.
  if (!ctx.lite) {
    const S = C.reserve.step;
    for (let y = S / 2; y < arena.h; y += S) {
      for (let x = S / 2; x < arena.w; x += S) {
        if (isWater(classAt(x, y))) ctx.reserved.push({ pos: vec(x, y), radius: C.reserve.r });
      }
    }
    if (ventAt) ctx.reserved.push({ pos: vec(ventAt.x, ventAt.y), radius: C.metronome.isleR + C.isles.gap });
    // THE GREAT SHOAL is reserved whole too: a seat held out for a story
    // keeps its surface bare of scatter and landmark rolls — the well the
    // tail cuts can never be buried under a cone nobody planned.
    if (shoalAt) ctx.reserved.push({ pos: vec(shoalAt.x, shoalAt.y), radius: isles.find(i => i.shoal)!.r + C.shoal.gap });
  }

  keepPlan(def.id, {
    cx, cy, ringW, deepFrac, rimAt, deepAt, classes, cols, rows, cell, isles, ventAt, shoalAt,
    deepPolicy, shelfLiquid: shelfLiquidId, deepLiquid: deepLiquidId, landing,
  });

  if (ctx.lite) { scatterDecoration(ctx, def); return; }

  // --- THE WATERLINE DRESS (the row's own rows; generic lakes dress nothing) ---
  const shoreCells: Vec2[] = [];
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (classes[gy * cols + gx] === LAKE_CELL.shore) shoreCells.push(vec((gx + 0.5) * cell, (gy + 0.5) * cell));
    }
  }
  if (shoreCells.length) {
    for (const row of shoreRows) {
      const n = rng.int(row.count[0], row.count[1]);
      for (let i = 0; i < n; i++) {
        const c = shoreCells[rng.int(0, shoreCells.length - 1)];
        const r = rng.range(row.radius[0], row.radius[1]);
        const jx = rng.range(-cell * 0.4, cell * 0.4), jy = rng.range(-cell * 0.4, cell * 0.4);
        ctx.doodads.push({ pos: vec(c.x + jx, c.y + jy), radius: r, kind: row.kind });
      }
    }
    if (terraceRow) {
      const n = rng.int(terraceRow.count[0], terraceRow.count[1]);
      for (let i = 0; i < n; i++) {
        const c = shoreCells[rng.int(0, shoreCells.length - 1)];
        const prev = ctx.siteAt;
        ctx.siteAt = vec(c.x, c.y);
        stamp(ctx, { kind: 'cluster', cluster: terraceRow.cluster, count: [1, 1] });
        ctx.siteAt = prev;
      }
    }
  }

  // --- the tileset's own furniture on the ring — then PURGE THE DROWNED
  //     (the harborcove idiom: scatter's forbidOn speaks doodad grounds, not
  //     grid regions, so the recipe closes the seam itself: whatever the
  //     scatter set down on the water leaves; the recipe's own pieces sit
  //     before the mark and stay; the pour's own doodads are not drowned).
  const mark = ctx.doodads.length;
  scatterDecoration(ctx, def);
  for (let k = ctx.doodads.length - 1; k >= mark; k--) {
    const d = ctx.doodads[k];
    if (pourKinds.has(d.kind)) continue;
    if (isWater(classAt(d.pos.x, d.pos.y))) ctx.doodads.splice(k, 1);
  }
}
registerLayout('lakeshore', lakeLayout);
