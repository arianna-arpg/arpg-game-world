// ---------------------------------------------------------------------------
// THE SETTLED BELT — the country that was WORKED before you got there.
//
// Two recipes for the world's tamed core, both grown from the massif fabric
// (open ground + large interior bodies) and the coherence fabric (traveled
// ways hold right-of-way), everything a layoutParam:
//
//   · 'fields'   — farmland: hedgerow/fold bodies stud open crop country and
//     REAL ROADS run portal-to-portal, breaching the hedge-lines where they
//     cross (a punched crossing reads as a field gate, never a random hole).
//     Road material/width/count are layoutParams — the same recipe serves a
//     gravel back-lane shire and a paved kingsroad approach without forking.
//   · 'district' — the metropolis: two param-picked modes under ONE recipe.
//     'massing' carves BUILDING masses (tenement/manor kinds — the walls ARE
//     the city, alleys are the negotiation) with paved boulevards cut clean
//     through, court interiors furnished from a data kit, and lamp rows along
//     the lit ways. 'blocks' lays the PLANNED city — a plot grid of real plan
//     structures (doors, roofs, rooms) drawn from a weighted blockPool, plaza
//     plots dressed from a kit, paved street seams, corner lamps.
//
// One new SHAPE joins the massif registry: 'block' — the rectangular walled
// court (a rotated rect annulus with 1–2 punched door-mouths, interior
// reported as a POI) — the city-block silhouette the round court can't read
// as. Registered here because it is geometry, not content; the KINDS that
// wear it (tenement/manor) live in src/data/massifs.ts with the rest.
//
// THE WEAVE LAW HOLDS UNCHANGED: both recipes ride carveMassifs' spacing +
// heal guarantees, then cut their ways with the same corridor carver the
// approach-road fabric uses — a road never seals what the weave opened.
//
// Docs: docs/engine/settled.md · Probe: balance/probe_settled.ts
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import type { Rng } from '../core/rng';
import type { ZoneDef } from '../data/zones';
import type { GridWalkField } from '../world/gridWalk';
import {
  areaFreeOf, doodadRuleOf, ensureGrid, inReserved, layoutParam, layTraveledWay,
  onClearway, overgrowthOf, raiseStructure, registerLayout, scatterDecoration,
  type DoodadKind, type GenCtx,
} from './levelgen';
import { carveMassifs, registerMassShape } from './massif';
import { carveSewerTier, relocateGratesIntoDucts } from './tiers';
import { bearingNoise, disc, radial, wanderPath } from './genkit';

// --- CONFIG ------------------------------------------------------------------

/** Reference dials for the settled recipes — every one overridable per zone
 *  via the matching layoutParam (the recipe discipline: spec ▷ variant ▷
 *  tileset ▷ biome), so nothing here is a magic literal at a call site. */
export const SETTLED_CFG = {
  /** fields: how many portal roads a zone lays (band, inclusive). */
  roadCount: [1, 2] as [number, number],
  /** fields: traveled-way disc band (px) — the gravel gauge. */
  roadWidth: [15, 20] as [number, number],
  /** fields: corridor half-width carved through wall bodies where a road
   *  crosses them (a hedge-gap that reads as a field gate). */
  roadCarve: 30,
  /** district/massing: boulevards cut portal-to-portal (band, inclusive). */
  boulevards: [1, 2] as [number, number],
  /** district/massing: boulevard corridor half-width (alley laneW stays the
   *  massif dial; the boulevard is the WIDE lit exception). */
  boulevardHalfW: 58,
  /** district: paved-way disc band (px) — visibly broader than field gravel. */
  pavedWidth: [24, 30] as [number, number],
  /** district: lamp spacing along paved ways (px along the chain). */
  lampSpacing: 220,
  /** district: perpendicular lamp offset off the way's centerline. */
  lampOffset: 40,
  /** district/massing: court interiors at or above this base radius may seat
   *  a courtyard structure (below it, furniture rows only). */
  courtStructMinR: 210,
  /** district/blocks: plot pitch + street gauge + plaza odds. */
  blockSize: 380,
  streetWidth: 96,
  plazaChance: 0.22,
  /** block-court inner-radius fraction (wall ring thickness lever). */
  blockInner: 0.58,
  /** fields: THE PARCEL PASS — the tilled patchwork that makes worked
   *  country READ as worked country: rectangular plots, crops planted in
   *  true ROWS along a shared plow bearing, a furrowed wash beneath them.
   *  Counts and sizes here; the crop table itself is `parcelCrops`
   *  (PARCEL_CROPS below), every one overridable per zone/variant. */
  cropParcels: [3, 5] as [number, number],
  parcelW: [300, 520] as [number, number],
  parcelH: [220, 380] as [number, number],
  /** Per-parcel wobble off the zone's one plow bearing (radians) — real
   *  fields share their orientation locally; the wobble keeps it worked
   *  by hands, not printed. */
  parcelBearingJitter: 0.12,
  /** Siting attempts per parcel (draws are unconditional — the findSpot
   *  discipline — so a rejected seat never shifts later parcels). */
  parcelTries: 14,
  /** Rim-to-rim breathing room between parcels (px). */
  parcelGapMin: 70,
  /** Parcel-center clearance from every portal (px, beyond the parcel's own
   *  half-diagonal — comfortably outside the entry's 220 hard clear, so no
   *  rail run can ever crowd a door). */
  parcelPortalClear: 240,
  /** Chance a parcel lies FALLOW: tilled wash + a few tufts, no crop —
   *  the year's rest, and the fallow-shires face leans hard on it. */
  parcelFallow: 0.15,
  /** Chance a parcel wears a rail run along one long edge. */
  parcelFence: 0.35,
  /** Tilled-wash emission: disc step along each furrow row, and the disc
   *  radius as a fraction of the crop row gap. */
  parcelTillStep: 34,
  parcelTillFrac: 0.62,
} as const;

/** One weighted crop-parcel row: what a plot grows and how it is planted
 *  (plant spacing along the row, gap between rows, plant size band). */
export interface CropParcelRow {
  kind: DoodadKind;
  weight: number;
  spacing: number;
  rowGap: number;
  radius: [number, number];
}

/** The reference crop table (layoutParam `parcelCrops` overrides per face):
 *  wheat and corn eat sight (the crop veil law), barley reads pale beside
 *  them, flax stays knee-high and OPEN (a parcel you can see across — the
 *  patchwork alternates blind and honest ground), pumpkins hug the dirt. */
export const PARCEL_CROPS: CropParcelRow[] = [
  { kind: 'wheat', weight: 4, spacing: 30, rowGap: 46, radius: [24, 34] },
  { kind: 'barley', weight: 2.5, spacing: 30, rowGap: 46, radius: [24, 34] },
  { kind: 'corn_stand', weight: 2.5, spacing: 38, rowGap: 52, radius: [24, 32] },
  { kind: 'flax', weight: 1.5, spacing: 26, rowGap: 40, radius: [18, 26] },
  { kind: 'pumpkin_patch', weight: 1, spacing: 42, rowGap: 56, radius: [13, 18] },
];

// --- THE 'block' MASS SHAPE ----------------------------------------------------
// A rotated rectangular annulus with punched door-mouths: the city block.
// Same contract as 'court' (interior reported, mouths sized off the weave
// lane AND the local ring so the punch always goes through), but the
// silhouette is a BUILDING: crisp flanks, square shoulders, a yard inside.

registerMassShape('block', {
  reach: 1.6,
  paint: (m, at, r, rng, o) => {
    const rot = rng.range(0, Math.PI * 2);
    const aspect = rng.range(0.62, 0.88); // blockier than a slab — a built plot
    const a = r * 1.15, b = r * 1.15 * aspect;
    const cap = r * 1.55;
    const rOf = (ang: number): number => {
      const t = ang - rot;
      const ca = Math.abs(Math.cos(t)), sa = Math.abs(Math.sin(t));
      const rect = Math.min(ca > 1e-4 ? a / ca : Infinity, sa > 1e-4 ? b / sa : Infinity);
      // A whisper of edge noise — mortar sag, not geology.
      return Math.min(cap, rect * (1 + bearingNoise(ang, o.lobe * 0.35, o.seed)));
    };
    const outer = m.like();
    radial(outer, at.x, at.y, rOf);
    const inner = m.like();
    radial(inner, at.x, at.y, ang => rOf(ang) * SETTLED_CFG.blockInner);
    outer.subtract(inner);
    const mouths = rng.int(o.mouths[0], o.mouths[1]);
    const a0 = rng.range(0, Math.PI * 2);
    for (let i = 0; i < mouths; i++) {
      const ang = a0 + (i / Math.max(1, mouths)) * Math.PI * 2 + rng.range(-0.4, 0.4);
      const rr = rOf(ang);
      const hole = m.like();
      // Centered mid-ring, spanning the whole wall band whatever the rect
      // rolled (the court's exact never-half-punches law).
      disc(hole, at.x + Math.cos(ang) * rr * 0.79, at.y + Math.sin(ang) * rr * 0.79,
        Math.max(o.laneW * 0.55, rr * 0.45));
      outer.subtract(hole);
    }
    m.union(outer);
    return { interior: vec(at.x, at.y) };
  },
});

// --- SHARED HELPERS ------------------------------------------------------------

/** Weighted pick over {weight} rows — local and draw-stable (one rng float). */
function pickW<T extends { weight: number }>(rng: Rng, rows: T[]): T {
  let total = 0;
  for (const r of rows) total += Math.max(0, r.weight);
  let roll = rng.range(0, total);
  for (const r of rows) { roll -= Math.max(0, r.weight); if (roll <= 0) return r; }
  return rows[rows.length - 1];
}

/** Farthest-first portal ordering (deterministic, draw-free): roads and
 *  boulevards favor the long crossings — the way THROUGH the country. */
function exitsByReach(ctx: GenCtx): Vec2[] {
  return [...ctx.exits].sort((p, q) =>
    (Math.hypot(q.x - ctx.entry.x, q.y - ctx.entry.y) - Math.hypot(p.x - ctx.entry.x, p.y - ctx.entry.y)));
}

/** Cut the corridor a way needs THROUGH whatever bodies stand on it, then lay
 *  the traveled way itself (reserved: an artery — scatter routes around it).
 *  The carve runs the same polyline as the discs so a punched hedge-gap and
 *  its road always agree. Returns the way's points for dress passes (lamps). */
function carveWay(ctx: GenCtx, grid: GridWalkField, from: Vec2, to: Vec2, opts: {
  kind: DoodadKind; band: [number, number]; carveHalfW: number; overgrowth: number;
  wobble?: number; bowFrac?: number;
}): Vec2[] {
  const pts = wanderPath(ctx.rng, from, to, {
    step: 130, wobble: opts.wobble ?? 60, bowFrac: opts.bowFrac ?? 0.25,
  });
  for (let i = 1; i < pts.length; i++) {
    grid.carveCorridor(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, opts.carveHalfW);
  }
  layTraveledWay(ctx, pts, { kind: opts.kind, band: opts.band, reserve: true, overgrowth: opts.overgrowth });
  return pts;
}

/** Lamp rows along a laid way: one standing lamp every ~spacing px of chain,
 *  offset off the centerline, only on standing ground (never plugging the
 *  lane the carve just opened). Alternates sides — a lit street, not a fence. */
function dressWayLamps(ctx: GenCtx, grid: GridWalkField, pts: Vec2[], kind: DoodadKind,
  spacing: number, offset: number): void {
  let walked = 0, side = ctx.rng.chance(0.5) ? 1 : -1, next = spacing * 0.5;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1].x, ay = pts[i - 1].y;
    const dx = pts[i].x - ax, dy = pts[i].y - ay;
    const seg = Math.hypot(dx, dy);
    if (seg < 1e-3) continue;
    while (walked + seg >= next) {
      const t = (next - walked) / seg;
      const px = ax + dx * t - (dy / seg) * offset * side;
      const py = ay + dy * t + (dx / seg) * offset * side;
      if (grid.isWalkable(px, py)) {
        ctx.doodads.push({ pos: vec(px, py), radius: 10, kind, rot: 0 });
      }
      side = -side;
      next += spacing;
    }
    walked += seg;
  }
}

// --- THE PARCEL PASS ------------------------------------------------------------
// Rectangular tilled plots with crops planted in true ROWS — the patchwork
// quilt that makes worked country read as worked country at a glance. The
// pass owns GEOMETRY only: every kind it plants is data (parcelCrops rows +
// the kinds' own DOODAD_RULES), and every placement runs the scatter's own
// gates (walk / forbidOn / reserved / clearway), so a parcel yields to
// roads, ponds and steadings exactly as hand scatter would — a lane crossing
// a field mows its strip through the wheat, which is precisely how lanes
// look. Draws are unconditional per try (the findSpot discipline): a
// rejected seat or a skipped plant never shifts the stream of later pieces.

function layCropParcels(ctx: GenCtx, def: ZoneDef, grid: GridWalkField): void {
  const countBand = layoutParam<[number, number]>(def, 'cropParcels', [...SETTLED_CFG.cropParcels] as [number, number]);
  const n = ctx.rng.int(countBand[0], countBand[1]);
  const crops = layoutParam<CropParcelRow[]>(def, 'parcelCrops', PARCEL_CROPS);
  if (n <= 0 || !crops.length) return;
  const wBand = layoutParam<[number, number]>(def, 'parcelW', [...SETTLED_CFG.parcelW] as [number, number]);
  const hBand = layoutParam<[number, number]>(def, 'parcelH', [...SETTLED_CFG.parcelH] as [number, number]);
  const fallowChance = layoutParam(def, 'parcelFallow', SETTLED_CFG.parcelFallow);
  const fenceChance = layoutParam(def, 'parcelFence', SETTLED_CFG.parcelFence);
  const till = layoutParam(def, 'parcelTill', true);
  const bearing0 = ctx.rng.range(0, Math.PI); // the zone's one plow bearing
  const placed: { x: number; y: number; r: number }[] = [];
  const portals = [ctx.entry, ...ctx.exits];

  for (let k = 0; k < n; k++) {
    const w = ctx.rng.range(wBand[0], wBand[1]);
    const h = ctx.rng.range(hBand[0], hBand[1]);
    const bearing = bearing0 + ctx.rng.range(-SETTLED_CFG.parcelBearingJitter, SETTLED_CFG.parcelBearingJitter);
    const crop = pickW(ctx.rng, crops);
    const fallow = ctx.rng.chance(fallowChance);
    const fenced = ctx.rng.chance(fenceChance);
    const fenceSide = ctx.rng.chance(0.5) ? 1 : -1;
    const halfDiag = Math.hypot(w, h) / 2;
    // Seat the plot: two draws per try, ALWAYS (acceptance never bends the
    // stream) — take the first candidate whose disc clears the border,
    // every portal, earlier parcels, and the steadings' reserved ground.
    let seat: Vec2 | null = null;
    for (let t = 0; t < SETTLED_CFG.parcelTries; t++) {
      const x = ctx.rng.range(60 + w / 2, Math.max(61 + w / 2, ctx.arena.w - 60 - w / 2));
      const y = ctx.rng.range(60 + h / 2, Math.max(61 + h / 2, ctx.arena.h - 60 - h / 2));
      if (seat) continue;
      const p = vec(x, y);
      if (portals.some(q => Math.hypot(p.x - q.x, p.y - q.y) < halfDiag + SETTLED_CFG.parcelPortalClear)) continue;
      if (placed.some(q => Math.hypot(p.x - q.x, p.y - q.y) < q.r + halfDiag + SETTLED_CFG.parcelGapMin)) continue;
      if (inReserved(ctx, p, halfDiag * 0.55)) continue;
      seat = p;
    }
    if (!seat) continue;
    placed.push({ x: seat.x, y: seat.y, r: halfDiag });

    const ux = Math.cos(bearing), uy = Math.sin(bearing);
    const vx = -uy, vy = ux;
    const halfW = w / 2, halfH = h / 2;
    const rule = doodadRuleOf(crop.kind);
    const tillRule = doodadRuleOf('tilled_earth');
    const tillR = crop.rowGap * SETTLED_CFG.parcelTillFrac;
    for (let off = -halfH + crop.rowGap * 0.5; off <= halfH - crop.rowGap * 0.35; off += crop.rowGap) {
      // THE TILLED WASH: soil strips laid along the bearing (the painter
      // draws its furrow grain off `rot`), one lattice per furrow row —
      // no draws, so a skipped strip costs the stream nothing.
      if (till) {
        for (let s = -halfW + SETTLED_CFG.parcelTillStep * 0.4; s <= halfW; s += SETTLED_CFG.parcelTillStep) {
          const p = vec(seat.x + ux * s + vx * off, seat.y + uy * s + vy * off);
          if (!grid.isWalkable(p.x, p.y)) continue;
          if (onClearway(ctx, p, tillR * 0.5)) continue;
          if (inReserved(ctx, p, tillR * 0.4)) continue;
          if (tillRule.forbidOn && !areaFreeOf(ctx, p, tillR * 0.5, tillRule.forbidOn)) continue;
          ctx.doodads.push({ pos: p, radius: tillR, kind: 'tilled_earth', rot: bearing });
        }
      }
      if (fallow) continue; // the year's rest — bare furrows and quiet
      for (let s = -halfW + crop.spacing * 0.5; s <= halfW - crop.spacing * 0.3; s += crop.spacing) {
        const jx = ctx.rng.range(-4, 4), jy = ctx.rng.range(-4, 4);
        const r = ctx.rng.range(crop.radius[0], crop.radius[1]);
        const rot = ctx.rng.range(0, Math.PI * 2);
        const p = vec(seat.x + ux * s + vx * off + jx, seat.y + uy * s + vy * off + jy);
        if (!grid.isWalkable(p.x, p.y)) continue;
        if (onClearway(ctx, p, r * 0.7)) continue;
        if (inReserved(ctx, p, r * 0.5)) continue;
        if (rule.forbidOn && !areaFreeOf(ctx, p, r * 0.8, rule.forbidOn)) continue;
        ctx.doodads.push({ pos: p, radius: r, kind: crop.kind, rot });
      }
    }

    // HEADLAND DRESS: the working litter at the parcel's rim.
    for (let i = 0, dn = ctx.rng.int(0, 2); i < dn; i++) {
      const s = ctx.rng.range(-halfW, halfW);
      const side = ctx.rng.chance(0.5) ? 1 : -1;
      const kind: DoodadKind = ctx.rng.chance(0.75) ? 'hay_bale' : 'scarecrow';
      const r = ctx.rng.range(11, 15);
      const rot = ctx.rng.range(0, Math.PI * 2);
      const p = vec(seat.x + ux * s + vx * (halfH + 26) * side, seat.y + uy * s + vy * (halfH + 26) * side);
      if (!grid.isWalkable(p.x, p.y) || onClearway(ctx, p, r) || inReserved(ctx, p, r)) continue;
      const kr = doodadRuleOf(kind);
      if (kr.forbidOn && !areaFreeOf(ctx, p, r, kr.forbidOn)) continue;
      ctx.doodads.push({ pos: p, radius: r, kind, rot });
    }
    // THE RAIL RUN: one long edge wears a fence — a boundary, not a box.
    // Real blockers, so they run the full gate suite: a piece landing on
    // the lane (or a pond) simply stands down, which is how hundred-year
    // fences read (the manor-grounds precedent).
    if (fenced) {
      const off = (halfH + 14) * fenceSide;
      const fr = doodadRuleOf('rail_fence');
      for (let s = -halfW * 0.85; s <= halfW * 0.85; s += 44) {
        const p = vec(seat.x + ux * s + vx * off, seat.y + uy * s + vy * off);
        if (!grid.isWalkable(p.x, p.y)) continue;
        if (onClearway(ctx, p, 20)) continue;
        if (inReserved(ctx, p, 20)) continue;
        if (fr.forbidOn && !areaFreeOf(ctx, p, 20, fr.forbidOn)) continue;
        ctx.doodads.push({ pos: p, radius: 20, kind: 'rail_fence', rot: bearing });
      }
    }
  }
}

// --- 'fields' — THE FARMLAND RECIPE ---------------------------------------------

/** Open crop country studded with hedgerow/fold bodies, crossed by real
 *  roads. The crops themselves (wheat veils, corn rows, steadings, folk) are
 *  tileset layout rows — the recipe owns GEOMETRY: bodies, ways, the weave,
 *  and the tilled PARCEL patchwork (layCropParcels) laid after the roads so
 *  every plot yields to the traveled way. */
function fieldsLayout(ctx: GenCtx, def: ZoneDef): void {
  const grid = ensureGrid(ctx);
  carveMassifs(ctx, def);

  const roadKind = layoutParam<DoodadKind>(def, 'roadKind', 'road');
  const roadBand = layoutParam<[number, number]>(def, 'roadWidth', [...SETTLED_CFG.roadWidth] as [number, number]);
  const roadCarve = layoutParam(def, 'roadCarve', SETTLED_CFG.roadCarve);
  const countBand = layoutParam<[number, number]>(def, 'roadCount', [...SETTLED_CFG.roadCount] as [number, number]);
  const laneOver = overgrowthOf(def);
  const roads = Math.min(ctx.exits.length, ctx.rng.int(countBand[0], countBand[1]));
  const ordered = exitsByReach(ctx);
  const lampKind = layoutParam<DoodadKind | ''>(def, 'wayLamps', '');
  for (let i = 0; i < roads; i++) {
    const pts = carveWay(ctx, grid, ctx.entry, ordered[i], {
      kind: roadKind, band: roadBand, carveHalfW: roadCarve, overgrowth: laneOver,
    });
    // A lit lane is a FACE choice (the village approach), never the default.
    if (lampKind) dressWayLamps(ctx, grid, pts, lampKind, SETTLED_CFG.lampSpacing, SETTLED_CFG.lampOffset);
  }

  // THE PARCEL PASS: the tilled patchwork, after the ways so every plot
  // yields to the laid road (the crops mow their strip where the lane runs).
  layCropParcels(ctx, def, grid);

  // The weave's belt-and-suspenders (massifLayout's exact idiom).
  for (const e of ctx.exits) {
    if (!grid.reachable(ctx.entry, e)) grid.carveCorridor(ctx.entry.x, ctx.entry.y, e.x, e.y, 34);
  }
  scatterDecoration(ctx, def);
}

registerLayout('fields', fieldsLayout);

// --- 'district' — THE METROPOLIS RECIPE ------------------------------------------

/** One weighted courtyard-kit row (what a walled yard keeps). */
export interface CourtKitRow { kind: DoodadKind; weight: number; radius: [number, number] }

/** One weighted block-pool row (what a planned plot raises). */
export interface BlockPoolRow { structure: string; weight: number }

/** MASSING mode: the organic city — building masses stud the ground, alleys
 *  are what's left, boulevards are cut clean through and lit. */
function cityMassing(ctx: GenCtx, def: ZoneDef, grid: GridWalkField): void {
  const masses = carveMassifs(ctx, def);

  const bandN = layoutParam<[number, number]>(def, 'boulevards', [...SETTLED_CFG.boulevards] as [number, number]);
  const pavedKind = layoutParam<DoodadKind>(def, 'pavedKind', 'paved_way');
  const pavedBand = layoutParam<[number, number]>(def, 'pavedWidth', [...SETTLED_CFG.pavedWidth] as [number, number]);
  const lampKind = layoutParam<DoodadKind | ''>(def, 'lampKind', 'street_lamp');
  const n = Math.min(ctx.exits.length, ctx.rng.int(bandN[0], bandN[1]));
  const ordered = exitsByReach(ctx);
  for (let i = 0; i < n; i++) {
    const pts = carveWay(ctx, grid, ctx.entry, ordered[i], {
      kind: pavedKind, band: pavedBand, carveHalfW: layoutParam(def, 'boulevardHalfW', SETTLED_CFG.boulevardHalfW),
      overgrowth: 0, wobble: 42, bowFrac: 0.18, // a surveyed cut, not a game trail
    });
    if (lampKind) dressWayLamps(ctx, grid, pts, lampKind, layoutParam(def, 'lampSpacing', SETTLED_CFG.lampSpacing), SETTLED_CFG.lampOffset);
  }

  // COURTYARD FURNISHING: what a walled yard keeps, as a weighted data kit.
  // Big courts may seat a whole structure (the high quarter's townhouses);
  // every court gets its small furniture. Walk-checked piece by piece — the
  // yard's own mouth stays open whatever rolls.
  const kit = layoutParam<CourtKitRow[]>(def, 'courtKit', []);
  const courtStruct = layoutParam<{ structure: string; chance: number } | null>(def, 'courtStructure', null);
  const structMinR = layoutParam(def, 'courtStructMinR', SETTLED_CFG.courtStructMinR);
  for (const m of masses) {
    if (!m.interior) continue;
    if (courtStruct && m.r >= structMinR && ctx.rng.chance(courtStruct.chance)) {
      raiseStructure(ctx, courtStruct.structure, m.interior);
      continue; // the structure IS the yard's keeping
    }
    if (!kit.length) continue;
    const pieces = ctx.rng.int(1, 2);
    for (let k = 0; k < pieces; k++) {
      const row = pickW(ctx.rng, kit);
      const ang = ctx.rng.range(0, Math.PI * 2);
      const d = ctx.rng.range(0, m.r * 0.3);
      const px = m.interior.x + Math.cos(ang) * d, py = m.interior.y + Math.sin(ang) * d;
      if (!grid.isWalkable(px, py)) continue;
      ctx.doodads.push({
        pos: vec(px, py), radius: ctx.rng.range(row.radius[0], row.radius[1]),
        kind: row.kind, rot: ctx.rng.range(0, Math.PI * 2),
      });
    }
  }
}

/** BLOCKS mode: the planned city — a plot grid of real plan structures from a
 *  weighted pool, plaza plots dressed from a kit, paved street seams, corner
 *  lamps. The metropolis recipe's grid, grown open: the pool, the plaza kit
 *  and the paving are all layoutParams (the sacked-city original keeps its
 *  own recipe untouched). */
function cityBlocks(ctx: GenCtx, def: ZoneDef, grid: GridWalkField): void {
  const { rng, arena } = ctx;
  const blockPx = layoutParam(def, 'blockSize', SETTLED_CFG.blockSize);
  const streetW = layoutParam(def, 'streetWidth', SETTLED_CFG.streetWidth);
  const plaza = layoutParam(def, 'plazaChance', SETTLED_CFG.plazaChance);
  const ruined = layoutParam(def, 'ruined', 0);
  const pool = layoutParam<BlockPoolRow[]>(def, 'blockPool', [{ structure: 'metro_house', weight: 1 }]);
  const plazaKit = layoutParam<CourtKitRow[]>(def, 'plazaKit', []);
  const pavedKind = layoutParam<DoodadKind>(def, 'pavedKind', 'paved_way');
  const lampKind = layoutParam<DoodadKind | ''>(def, 'lampKind', 'street_lamp');
  const paveStreets = layoutParam(def, 'paveStreets', true);

  const cols = Math.max(2, Math.floor(arena.w / blockPx));
  const rows = Math.max(2, Math.floor(arena.h / blockPx));
  const bw = arena.w / cols, bh = arena.h / rows;

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const cx = (bx + 0.5) * bw, cy = (by + 0.5) * bh;
      // Portal-adjacent plots stay open (plazas) so the streets breathe at
      // the gates — the metropolis recipe's own law, kept.
      const nearPortal = [ctx.entry, ...ctx.exits].some(p => Math.hypot(p.x - cx, p.y - cy) < Math.max(bw, bh) * 0.8);
      if (nearPortal || rng.chance(plaza)) {
        if (plazaKit.length && !nearPortal && rng.chance(0.65)) {
          const row = pickW(rng, plazaKit);
          ctx.doodads.push({
            pos: vec(cx + rng.range(-bw * 0.12, bw * 0.12), cy + rng.range(-bh * 0.12, bh * 0.12)),
            radius: rng.range(row.radius[0], row.radius[1]), kind: row.kind, rot: rng.range(0, Math.PI * 2),
          });
        }
        continue;
      }
      if (ruined > 0 && rng.chance(ruined)) {
        // The broken plot: a rubble yard where a house stood (the sacked
        // wards wear their history; intact faces roll ruined 0 and never
        // pay this branch a draw beyond the chance itself).
        for (let k = 0, kn = rng.int(2, 4); k < kn; k++) {
          ctx.doodads.push({
            pos: vec(cx + rng.range(-bw / 3, bw / 3), cy + rng.range(-bh / 3, bh / 3)),
            radius: rng.range(10, 20), kind: 'rubble', rot: rng.range(0, Math.PI * 2),
          });
        }
        continue;
      }
      const pick = pool.length === 1 ? pool[0] : pickW(rng, pool);
      raiseStructure(ctx, pick.structure, vec(cx, cy));
    }
  }

  // PAVED SEAMS: the street grid itself wears the paving — straight ways
  // along every plot seam, lamps alternating at the crossings.
  if (paveStreets) {
    const seamPts = (fromV: Vec2, toV: Vec2): Vec2[] => {
      const pts: Vec2[] = [];
      const steps = Math.max(1, Math.ceil(Math.hypot(toV.x - fromV.x, toV.y - fromV.y) / 130));
      for (let i = 0; i <= steps; i++) pts.push(vec(fromV.x + (toV.x - fromV.x) * (i / steps), fromV.y + (toV.y - fromV.y) * (i / steps)));
      return pts;
    };
    for (let bx = 1; bx < cols; bx++) {
      layTraveledWay(ctx, seamPts(vec(bx * bw, streetW), vec(bx * bw, arena.h - streetW)),
        { kind: pavedKind, band: [streetW * 0.22, streetW * 0.3] });
    }
    for (let by = 1; by < rows; by++) {
      layTraveledWay(ctx, seamPts(vec(streetW, by * bh), vec(arena.w - streetW, by * bh)),
        { kind: pavedKind, band: [streetW * 0.22, streetW * 0.3] });
    }
    if (lampKind) {
      for (let by = 1; by < rows; by++) {
        for (let bx = 1; bx < cols; bx++) {
          if (!rng.chance(0.6)) continue;
          const px = bx * bw + (bx % 2 === 0 ? 1 : -1) * streetW * 0.34;
          const py = by * bh + (by % 2 === 0 ? 1 : -1) * streetW * 0.34;
          if (grid.isWalkable(px, py)) ctx.doodads.push({ pos: vec(px, py), radius: 10, kind: lampKind, rot: 0 });
        }
      }
    }
  }
}

/** The metropolis' one surface recipe: variant faces pick their mode (and
 *  every dial) through layoutParams alone — the warrens and the boulevards
 *  are the SAME generator wearing different numbers. */
function districtLayout(ctx: GenCtx, def: ZoneDef): void {
  const grid = ensureGrid(ctx);
  const mode = layoutParam<'massing' | 'blocks'>(def, 'districtMode', 'massing');
  if (mode === 'blocks') cityBlocks(ctx, def, grid);
  else cityMassing(ctx, def, grid);

  for (const e of ctx.exits) {
    if (!grid.reachable(ctx.entry, e)) grid.carveCorridor(ctx.entry.x, ctx.entry.y, e.x, e.y, 34);
  }
  // THE UNDER-LATTICE (the tier fabric, engine/tiers.ts): faces that dial
  // `sewerTier` sink a duct web BENEATH their streets and blocks — the same
  // zone, one layer down (covered exposure; culvert wells are the doors).
  if (ctx.rng.chance(layoutParam(def, 'sewerTier', 0))) carveSewerTier(ctx, def, grid);
  scatterDecoration(ctx, def);
  // The deep door prefers the drains: pull scattered grates INTO the duct
  // web (weighted — a grate left beside a building still reads).
  relocateGratesIntoDucts(ctx, def, grid);
}

registerLayout('district', districtLayout);
