// ---------------------------------------------------------------------------
// THE TIER FABRIC — extra walkable LAYERS inside the same zone.
//
// True verticality without a second zone: the region map itself declares the
// upper (or under) layers — `RegionKind.tier: k` marks a row as FLOOR on the
// k-th story (a butte top is wall to the valley and ground to the summit; a
// sewer duct under a tenement is wall to the street and tunnel below it; a
// switchback terrace is wall to every story beneath it), `walkable` keeps
// meaning the tier-0 truth (a row carrying BOTH is a bridge: the valley
// walks under while the deck walks over — one cell, two floors), and
// `tierLink` rows (ramps, culvert wells, the stepped switchbacks) are the
// CROSSINGS — floor on both tiers of their SPAN (linkSpanOf), flipping a
// body's tier when it steps off toward ground only the other end owns.
//
// Everything derives from the live region map — no second grid to build,
// dirty-track, or persist: the TIER VIEW below is a stateless adapter over
// GridWalkField whose walkability predicate reads tier flags (one view per
// story), so carves (hollows, corridors) self-heal on every layer by
// construction.
//
// THE LAW (enforced at the one mover contract + the hit gates in world.ts):
//   · movement — a body confines against ITS tier's floor; walking never
//     drops off a rim (the rim is a wall to feet), but a SHOVE past a rim is
//     a FALL: the body lands on the highest floor standing beneath it (the
//     bowling lane's toy — knock them off the butte, or down one terrace of
//     the mountain at a time).
//   · combat — hostility, projectiles and ground zones are SAME-TIER ONLY
//     (a deck duel and a valley duel share a screen, never a fight) unless
//     the zone declares RIM DUELS; flights sail over any floor at or below
//     their own story. The zone's exposure decides what the RENDERER shows
//     ('open' = every layer visible — buttes, summits; 'covered' = the
//     active layer only — sewers).
//   · AI — monsters spawn per tier (ZoneTiers.packSplit dealt across the
//     levels) and HUNT across the stack from both halves of the chase: the
//     REACTIVE ledger walks pursuers through stairs they watched their
//     quarry take (aiTierGoal, stamped at the ladder toggle), and the
//     PROACTIVE fields (World.pathField(story) over makeTierNav below —
//     each story's own floor with the link cells as walkable seams) let a
//     hunter ELECT a stair it never saw used (World.tierLinkToward) and
//     cross toward ground its own floor doesn't own; THE SEVERED BAND
//     (ai.ts runKernel + TIER_CFG.severedBandReach) folds the chase-band
//     kernels in — an orbit held across a cliff defers to that same lane,
//     while kits that truly rain out keep their rim duels.
//
// Docs: docs/engine/tiers.md · Probe: balance/probe_tiers.ts
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import type { ZoneDef, ZoneTiers } from '../data/zones';
import { GridWalkField } from '../world/gridWalk';
import { insideBounds } from '../world/shape';
import { regionKind, type RegionKind } from '../world/regions';
import {
  ensureGrid, layoutParam, placeLandmarkById, registerLayout, registerTierSiting,
  registerUnderTierPass, scatterDecoration, type GenCtx,
} from './levelgen';
import { carveMassifs } from './massif';
import { lairLandmarkRolls, registerLairStoryReach } from './lairs';
import { TILESETS, type TilesetDef } from '../data/tilesets';
import { BIOMES } from '../world/biomes';

export type { ZoneTiers };

/** The highest story any body can stand — the terrace region family
 *  (world/regions.ts peak_terrace_k / peak_ramp_k) registers exactly this
 *  many rows, and recipes clamp their level rolls to it. */
export const MAX_TIER = 6;

// --- CONFIG ------------------------------------------------------------------

export const TIER_CFG = {
  /** Rim-fall dressing: brief stagger a shoved-off body lands with. */
  fallStunSec: 0.45,
  /** needles: bridge pairs at most this far apart (px, center-to-center). */
  bridgeMax: 620,
  /** needles: bridge deck half-width (px). */
  bridgeHalfW: 26,
  /** needles: ramp strip half-width (px). */
  rampHalfW: 30,
  /** sewers: how many culvert wells a district lattice sinks. */
  wells: [2, 4] as [number, number],
  /** sewers: duct corridor half-width (px). */
  ductHalfW: 32,
  /** Fraction of a tiered zone's packs seeded on tier 1 (ZoneTiers override). */
  packSplit: 0.4,
  /** THE GROTTO FORM's defaults (UnderTierSpec.grotto — the meadow mere):
   *  chamber radius band, the water blob's share of it, the guaranteed
   *  shore-ring width (in cells), the chamber's clearance from the entry,
   *  the seat-hunt try budget, and the court's clearance from the one
   *  stair (a lair's clearSite must never splice the only way out). */
  grotto: {
    radius: [230, 320] as [number, number],
    waterFrac: 0.55,
    shoreRing: 2.2,
    entryClear: 260,
    seatTries: 40,
    lairSeatClear: 130,
  },
  /** THE SEVERED BAND (ai.ts runKernel — the tier chase's kernel law): a
   *  chase-band kernel whose target stands on ground its own story's floor
   *  doesn't own holds flat distance across a cliff — a lie. Kits whose
   *  longest ai range is at or under this reach defer to the approach lane
   *  (moveToward → the stair election) until the floor is shared; longer
   *  kits keep their band only while the zone's rim duels make the
   *  cross-story fight real (rim archery is the needles' authored
   *  conversation — never defer a bow that can genuinely rain out). */
  severedBandReach: 160,
  /** switchback: THE SUMMIT ASCENT recipe's dials (every one a layoutParam). */
  switchback: {
    /** Terrace stories rolled per summit (clamped to MAX_TIER and to what
     *  the arena honestly fits — a bench too thin to fight on never ships). */
    levels: [3, 5] as const,
    /** Terrace band width, [inner, outer] (px): the foot benches run broad,
     *  the high benches tighten toward the crown. */
    bandW: [150, 230] as const,
    /** Summit plateau radius band (px). */
    peakR: [180, 250] as const,
    /** Stepped-way half width (px). */
    rampHalfW: 32,
    /** Clearance every portal keeps from the outermost rim (px) — the
     *  valley skirt stays contiguous by budget, never by hope. */
    portalMargin: 300,
    /** Rim wobble amplitude band (in cells) — terraces breathe, never trace
     *  compass circles. */
    wobble: [0.6, 1.4] as const,
    /** Switchback bearing swing between consecutive stairs (radians): climb,
     *  round the bench most of the way, find the next stair. */
    swing: [2.0, 3.1] as const,
    /** Elevated-pack share for summit zones (ZoneTiers.packSplit default). */
    packSplit: 0.5,
  },
} as const;

// --- THE TIER PREDICATES -------------------------------------------------------

/** A crossing's SPAN — the two tiers a link joins, lowest first. Explicit
 *  via RegionKind.linkTiers; derived otherwise: a walkable link touches the
 *  ground floor ([0, tier]), an elevated one joins the story below
 *  ([tier-1, tier]) — the classic ramps and wells need no new field. */
export function linkSpanOf(rk: RegionKind): [number, number] {
  if (rk.linkTiers) return rk.linkTiers;
  const hi = Math.max(1, rk.tier ?? 1);
  return [rk.walkable ? 0 : hi - 1, hi];
}

/** Is this region floor for a body standing on tier `t`? (t=0 is the
 *  walkable truth; links are floor on BOTH tiers of their span.) */
export function tierFloorAt(kindId: string | undefined, t: number): boolean {
  const rk = kindId ? regionKind(kindId) : undefined;
  if (!rk) return false;
  if (rk.tierLink) {
    const [a, b] = linkSpanOf(rk);
    if (t === a || t === b) return true;
  }
  return t <= 0 ? !!rk.walkable : rk.tier === t;
}

/** Is this region floor on ANY elevated story? (Links count.) The spawn
 *  seats, the rim march and the span gate ask only that the layer exists. */
export function tierFloorOf(kindId: string | undefined): boolean {
  const rk = kindId ? regionKind(kindId) : undefined;
  return !!rk && ((rk.tier ?? 0) >= 1 || !!rk.tierLink);
}

/** The ELEVATION a region's floor sits at — for flights and for the ground
 *  baker's ascent gradients: 0 = plain ground, k = a tier-k floor (links
 *  answer their span's top), null = a true wall (floor for no one). */
export function tierElevOf(kindId: string | undefined): number | null {
  const rk = kindId ? regionKind(kindId) : undefined;
  if (!rk) return null;
  if (rk.tierLink) return linkSpanOf(rk)[1];
  if ((rk.tier ?? 0) >= 1) return rk.tier as number;
  return rk.walkable ? 0 : null;
}

/** Is this region a crossing between tiers? */
export function tierLinkOf(kindId: string | undefined): boolean {
  const rk = kindId ? regionKind(kindId) : undefined;
  return !!rk && !!rk.tierLink;
}

/** THE LADDER TOGGLE's flip: entering a link carries a body to the OTHER
 *  end of the link's span (culverts: 0↔1; a high stair: k-1↔k). */
export function linkFlipTier(kindId: string | undefined, tier: number): number {
  const rk = kindId ? regionKind(kindId) : undefined;
  if (!rk?.tierLink) return tier;
  const [a, b] = linkSpanOf(rk);
  return tier === b ? a : b;
}

/** THE TOUCH-DOWN LAW (the flight fabric's landing): the story a body wears
 *  when its wings fold. The CURRENT story survives while its floor still
 *  stands under the body (a condor lifting off a bench and settling back
 *  keeps the bench; a link cell keeps whichever end the body left), else
 *  the floor under it answers (tierElevOf — settle over the valley and you
 *  are the valley's; alight on a summit and you wear it, however many
 *  stories the climb). A TRUE WALL keeps the current story: the mover
 *  contract's snap resolves the illegal seat on the body's own layer next
 *  tick. Aloft bodies keep their last grounded story BY DESIGN — only the
 *  landing re-seats it (a per-wingbeat re-derive would thrash hostility
 *  and the chase ledger as the flock crossed rims). */
export function landingTier(kindId: string | undefined, current: number): number {
  if (tierFloorAt(kindId, current)) return current;
  return tierElevOf(kindId) ?? current;
}

/** The narrow face of GridWalkField the mover contract consults — the tier
 *  view implements it over the SAME grid with the tier predicate. */
export interface WalkView {
  isWalkable(x: number, y: number): boolean;
  snapToWalkable(p: Vec2): Vec2;
  regionAt?(x: number, y: number): string;
  cellSize?: number;
}

/** The structural minimum the tier fabric reads off a zone's walk field —
 *  narrow on purpose so World's WalkField (grid or not) passes as-is. */
export interface RegionWalk {
  regionAt?(x: number, y: number): string;
  cell?: number;
  cellSize?: number;
}

/** A stateless per-story view over the zone's live grid: walkable where the
 *  region map says tier-`tier` floor, everything else read-through. Carves
 *  and repaints self-heal on every layer because nothing here is cached. */
export function makeTierView(grid: RegionWalk, tier = 1): WalkView {
  const cs: number = grid.cell ?? grid.cellSize ?? 30;
  const walkAt = (x: number, y: number): boolean => tierFloorAt(grid.regionAt?.(x, y), tier);
  return {
    isWalkable: walkAt,
    regionAt: (x, y) => grid.regionAt?.(x, y) ?? 'ground',
    cellSize: cs,
    snapToWalkable: (p) => {
      if (walkAt(p.x, p.y)) return p;
      for (let r = cs; r <= cs * 14; r += cs) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
          const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
          if (walkAt(x, y)) return vec(x, y);
        }
      }
      return p; // no tier floor in reach — keep the point (never loop forever)
    },
  };
}

/** A per-story PATHING GRID (the PROACTIVE half of the tier chase —
 *  World.pathField(story)): a real GridWalkField over the same cells whose
 *  walkable MASK is the story's floor truth (tierFloorAt — link cells count
 *  on both their span's stories, the SEAMS without which a story's field
 *  would be a prison) while every cell keeps its TRUE region kind, so
 *  travel pricing and the priced beeline (the wayfaring fabric) judge a
 *  deck hazard exactly as they judge a street one. A derived SNAPSHOT, not
 *  a live view like makeTierView above — pathStep needs a stable grid to
 *  shoot distance fields over — so the caller re-derives when the base
 *  grid's version moves (World's per-story cache keys on it). */
export function makeTierNav(base: GridWalkField, tier: number): GridWalkField {
  const cs = base.cell;
  const g = new GridWalkField(base.cols * cs, base.rows * cs, cs);
  const floorOf = new Map<string, number>(); // kind → story-floor verdict (1/0)
  for (let gy = 0; gy < base.rows; gy++) {
    const y = gy * cs + cs / 2;
    let run0 = 0;
    let runK = base.regionAt(cs / 2, y);
    for (let gx = 1; gx <= base.cols; gx++) {
      const k = gx < base.cols ? base.regionAt(gx * cs + cs / 2, y) : '';
      if (gx < base.cols && k === runK) continue;
      // The finished same-kind run [run0, gx): paint its true kind (quiet —
      // nothing bakes this grid), then override the walkable mask with the
      // story's floor truth.
      g.fillRegion(run0 * cs + cs / 2, y, (gx - 1) * cs + cs / 2, y, runK, true);
      let f = floorOf.get(runK);
      if (f === undefined) { f = tierFloorAt(runK, tier) ? 1 : 0; floorOf.set(runK, f); }
      g.mask.fill(f, gy * base.cols + run0, gy * base.cols + gx);
      run0 = gx; runK = k;
    }
  }
  return g;
}

/** TIER CROSSING (the link law), resolved at the mover: a body standing on a
 *  link may step toward ground only the OTHER end of the link's span owns —
 *  flip it. Pure read: returns the tier the move should be judged on. */
export function resolveTierCrossing(
  grid: RegionWalk | null, tier: number, from: Vec2, toward: Vec2,
): number {
  if (!grid?.regionAt) return tier;
  const fromRk = regionKind(grid.regionAt(from.x, from.y) ?? '');
  if (!fromRk?.tierLink) return tier;
  const destK = grid.regionAt(toward.x, toward.y);
  const rk = destK ? regionKind(destK) : undefined;
  if (!rk || rk.tierLink) return tier;             // link-to-link: keep
  const [a, b] = linkSpanOf(fromRk);
  const destA = tierFloorAt(destK, a);
  const destB = tierFloorAt(destK, b);
  if (tier === a && destB && !destA) return b;
  if (tier === b && destA && !destB) return a;
  return tier;
}

// --- THE TIER KIT ---------------------------------------------------------------
// The layer generates its OWN dressing (the "truly independent, layered
// zones" law): tier-tagged doodads scattered over the layer's floor — the
// drains grow webbier than the street above them, the tops keep caches the
// valley never sees. Rows ride layoutParams ('tierKit') so any face retunes
// or replaces the kit without a fork; every piece is stamped `tier: 1`, and
// the ground-sense / collision / flight / renderer gates keep it layer-honest.

/** One weighted tier-kit row (what the layer itself grows). */
export interface TierKitRow { kind: string; count: [number, number]; radius?: [number, number] }

export function layTierKit(
  ctx: GenCtx, grid: GridWalkField, rows: TierKitRow[],
  cellFilter: (kind: string | undefined) => boolean,
  tierOf?: (kind: string | undefined) => number,
): void {
  const cs: number = (grid as unknown as { cell?: number }).cell ?? 30;
  const cells: Vec2[] = [];
  const cols = Math.floor(ctx.arena.w / cs), rows2 = Math.floor(ctx.arena.h / cs);
  for (let gy = 1; gy < rows2 - 1; gy++) {
    for (let gx = 1; gx < cols - 1; gx++) {
      const x = gx * cs + cs / 2, y = gy * cs + cs / 2;
      if (cellFilter(grid.regionAt?.(x, y))) cells.push(vec(x, y));
    }
  }
  if (!cells.length) return;
  for (const row of rows) {
    const n = ctx.rng.int(row.count[0], row.count[1]);
    for (let k = 0; k < n; k++) {
      const c = cells[ctx.rng.int(0, cells.length - 1)];
      const r = row.radius ?? [12, 18];
      ctx.doodads.push({
        pos: vec(c.x + ctx.rng.range(-cs * 0.3, cs * 0.3), c.y + ctx.rng.range(-cs * 0.3, cs * 0.3)),
        radius: ctx.rng.range(r[0], r[1]), kind: row.kind,
        rot: ctx.rng.range(0, Math.PI * 2),
        // Furniture belongs to its STORY (clampPos gates collision per tier;
        // covered zones filter draw lists) — a multi-story kit reads the
        // seat's own region for the stamp; classic callers stay literal 1.
        tier: tierOf ? tierOf(grid.regionAt?.(c.x, c.y)) : 1,
      });
    }
  }
}

// --- 'needles' — THE BUTTE COUNTRY RECIPE ----------------------------------------
// Thousand-Needles verticality on the massif fabric: butte masses (region
// 'butte_top' — wall to the valley, FLOOR up top), ramps painted across one
// rim per butte (the way up), bridge decks strung between neighboring tops
// (walkable BOTH tiers: the valley passes beneath). Open exposure: you see
// the whole stack at once, and only the law keeps the fights apart.

function needlesLayout(ctx: GenCtx, def: ZoneDef): void {
  const grid = ensureGrid(ctx);
  const masses = carveMassifs(ctx, def);
  const cs: number = (grid as unknown as { cell?: number }).cell ?? 30;
  const tops = masses.filter(m => m.kind === 'butte');

  // RAMPS: one per butte — march a ray outward from the heart; the strip
  // from just inside the rim to the first valley floor becomes the link.
  for (const m of tops) {
    const a0 = ctx.rng.range(0, Math.PI * 2);
    let placed = false;
    for (let tryA = 0; tryA < 8 && !placed; tryA++) {
      const a = a0 + (tryA / 8) * Math.PI * 2;
      const dx = Math.cos(a), dy = Math.sin(a);
      // find the rim: last tier cell along the ray
      let rimD = -1;
      for (let d = cs; d <= m.bound + cs * 4; d += cs * 0.5) {
        const k = grid.regionAt?.(m.at.x + dx * d, m.at.y + dy * d);
        if (tierFloorOf(k)) rimD = d;
        else if (rimD > 0) break;
      }
      if (rimD <= 0) continue;
      // valley just past the rim must stand (the ramp has somewhere to land)
      const landD = rimD + cs * 1.6;
      if (!grid.isWalkable(m.at.x + dx * landD, m.at.y + dy * landD)) continue;
      const from = vec(m.at.x + dx * Math.max(cs, rimD - cs * 1.6), m.at.y + dy * Math.max(cs, rimD - cs * 1.6));
      const to = vec(m.at.x + dx * (rimD + cs * 2.2), m.at.y + dy * (rimD + cs * 2.2));
      paintStrip(grid, from, to, TIER_CFG.rampHalfW, 'tier_ramp');
      placed = true;
    }
  }

  // BRIDGES: neighboring tops within reach get a deck — painted ONLY over
  // valley cells (the tops keep their own region), walkable both tiers.
  const bridged = new Set<string>();
  for (let i = 0; i < tops.length; i++) {
    for (let j = i + 1; j < tops.length; j++) {
      const a = tops[i], b = tops[j];
      const d = Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y);
      if (d > TIER_CFG.bridgeMax || d < (a.bound + b.bound) * 0.7) continue;
      const key = `${i}:${j}`;
      if (bridged.has(key)) continue;
      bridged.add(key);
      paintStrip(grid, a.at, b.at, TIER_CFG.bridgeHalfW, 'butte_span', k => !tierFloorOf(k));
    }
  }

  for (const e of ctx.exits) {
    if (!grid.reachable(ctx.entry, e)) grid.carveCorridor(ctx.entry.x, ctx.entry.y, e.x, e.y, 34);
  }
  def.tiers = {
    kind: 'over', exposure: 'open', label: 'the butte tops',
    packSplit: layoutParam(def, 'tierPackSplit', TIER_CFG.packSplit),
    // RIM DUELS: the needle country's whole conversation — trade arrows
    // across the rims and spans; sight does the refereeing.
    rimDuels: layoutParam(def, 'rimDuels', true),
  };
  // The tops keep their own kit — and the caches the valley never sees.
  layTierKit(ctx, grid, layoutParam<TierKitRow[]>(def, 'tierKit', [
    { kind: 'rock', count: [2, 5], radius: [12, 22] },
    { kind: 'grass', count: [2, 4], radius: [14, 24] },
    { kind: 'spelunker_pack', count: [0, 2], radius: [10, 13] },
  ]), k => k === 'butte_top');
  scatterDecoration(ctx, def);
}

registerLayout('needles', needlesLayout);

// --- 'switchback' — THE SUMMIT ASCENT RECIPE --------------------------------------
// The mountain's crescendo on the N-story tier fabric: concentric terrace
// rings — full cones standing mid-zone, or half-cones set against one arena
// edge — climbing to a peak plateau, every rim cut by ONE stepped way swung
// a switchback's walk around the face from the last. The ascent is thereby
// DELIBERATE: climb, round the bench, find the next stair, climb again,
// summit. Open exposure + rim duels: the mountain is one long conversation
// of arrows traded across the rims, and a shove settles a duel one story
// down at a time (the generalized rim fall). Region rows are the
// peak_terrace_k / peak_ramp_k family (world/regions.ts); every dial is a
// layoutParam; wobbled rims keep the cones honest country, never compasses.

function switchbackLayout(ctx: GenCtx, def: ZoneDef): void {
  const grid = ensureGrid(ctx);
  const cs: number = (grid as unknown as { cell?: number }).cell ?? 30;
  const SB = TIER_CFG.switchback;
  const levelBand = layoutParam<readonly [number, number]>(def, 'peakLevels', SB.levels);
  const arcMode = String(layoutParam<string>(def, 'peakArc', 'auto'));
  const bandW = layoutParam<readonly [number, number]>(def, 'peakBandW', SB.bandW);
  const peakRBand = layoutParam<readonly [number, number]>(def, 'peakRadius', SB.peakR);
  // Portal clearance SCALES with the arena — a QA pocket or a cave-scale
  // mint keeps a real lane without demanding a frontier zone's acreage.
  const margin = Math.min(
    layoutParam<number>(def, 'peakPortalMargin', SB.portalMargin),
    Math.min(ctx.arena.w, ctx.arena.h) * 0.14,
  );
  const rampHalfW = layoutParam<number>(def, 'peakRampHalfW', SB.rampHalfW);
  const swingBand = layoutParam<readonly [number, number]>(def, 'peakSwing', SB.swing);

  let levels = Math.max(1, Math.min(MAX_TIER, ctx.rng.int(levelBand[0], levelBand[1])));
  let arc: 'full' | 'half' =
    arcMode === 'auto' ? (ctx.rng.chance(0.5) ? 'full' : 'half')
      : arcMode === 'half' ? 'half' : 'full';

  // THE SEAT: score candidate centers by the radius they can honestly
  // afford — every portal keeps `margin` clearance from the outermost rim,
  // and half-cones keep a shoulder lane along their own edge — so the
  // valley skirt stays ONE country by BUDGET, never by carve-through
  // rescue. Full cones also try the quadrant points (a portal-crowded
  // arena still finds a pocket); if the rolled arc truly can't stand
  // here, the other face is tried before giving up.
  const ports = [ctx.entry, ...ctx.exits];
  const lane = cs * 11, inset = cs * 1.5;
  const candsFor = (a: 'full' | 'half'): { c: Vec2; n?: Vec2; cap: number }[] => {
    if (a === 'full') {
      const quad = (fx: number, fy: number): { c: Vec2; cap: number } => {
        const c = vec(ctx.arena.w * fx, ctx.arena.h * fy);
        return { c, cap: Math.min(c.x, c.y, ctx.arena.w - c.x, ctx.arena.h - c.y) - cs * 4 };
      };
      return [
        { c: vec(ctx.arena.w / 2, ctx.arena.h / 2), cap: Math.min(ctx.arena.w, ctx.arena.h) / 2 - cs * 11 },
        quad(0.32, 0.32), quad(0.68, 0.32), quad(0.32, 0.68), quad(0.68, 0.68),
      ];
    }
    return [
      { c: vec(ctx.arena.w / 2, inset), n: vec(0, 1), cap: Math.min(ctx.arena.w / 2 - lane, ctx.arena.h - lane) },
      { c: vec(ctx.arena.w / 2, ctx.arena.h - inset), n: vec(0, -1), cap: Math.min(ctx.arena.w / 2 - lane, ctx.arena.h - lane) },
      { c: vec(inset, ctx.arena.h / 2), n: vec(1, 0), cap: Math.min(ctx.arena.h / 2 - lane, ctx.arena.w - lane) },
      { c: vec(ctx.arena.w - inset, ctx.arena.h / 2), n: vec(-1, 0), cap: Math.min(ctx.arena.h / 2 - lane, ctx.arena.w - lane) },
    ];
  };
  const score = (cands: { c: Vec2; n?: Vec2; cap: number }[]): { seat: { c: Vec2; n?: Vec2; cap: number }; maxR: number } => {
    let seat = cands[0], maxR = -Infinity;
    for (const cand of cands) {
      let d = cand.cap;
      for (const p of ports) d = Math.min(d, Math.hypot(p.x - cand.c.x, p.y - cand.c.y) - margin);
      if (d > maxR) { maxR = d; seat = cand; }
    }
    return { seat, maxR };
  };
  let { seat, maxR } = score(candsFor(arc));
  if (maxR < cs * 6) {
    const other: 'full' | 'half' = arc === 'full' ? 'half' : 'full';
    const alt = score(candsFor(other));
    if (alt.maxR > maxR) { arc = other; seat = alt.seat; maxR = alt.maxR; }
  }

  // FIT: crown + bands must sit inside maxR — slim the bands toward the
  // floor first, then shed stories. minBand keeps every bench wide enough
  // to fight on AND keeps consecutive stairs radially disjoint.
  const minBand = cs * 5;
  let peakR = ctx.rng.range(peakRBand[0], peakRBand[1]);
  let outer: number[] | null = null;
  while (!outer) {
    const ws: number[] = [];
    for (let k = 1; k <= levels - 1; k++) {
      const f = levels <= 2 ? 1 : (k - 1) / (levels - 2); // foot → just under the crown
      ws.push(bandW[1] + (bandW[0] - bandW[1]) * f);
    }
    const sum = ws.reduce((a, b) => a + b, 0);
    const room = maxR - peakR;
    const scale = sum > 0 ? Math.min(1, room / sum) : 1;
    if (room >= 0 && (sum === 0 || scale * Math.min(...ws) >= minBand)) {
      const o: number[] = new Array(levels + 1).fill(0);
      o[levels] = peakR;
      for (let k = levels - 1; k >= 1; k--) o[k] = o[k + 1] + ws[k - 1] * scale;
      outer = o;
      break;
    }
    if (levels > 1) { levels--; continue; }
    peakR = Math.min(peakR, maxR);
    if (!(peakR >= cs * 6)) {
      // ATTEMPT-HONEST: no mountain fits this arena — declare nothing.
      def.tiers = undefined;
      scatterDecoration(ctx, def);
      return;
    }
    outer = [0, peakR];
  }

  // THE RINGS: per-cell radial assignment under a slow angular wobble —
  // the same wobble the stairs sample, so a stair always spans ITS rim.
  const amp = cs * ctx.rng.range(SB.wobble[0], SB.wobble[1]);
  const w1 = ctx.rng.range(0, Math.PI * 2), w2 = ctx.rng.range(0, Math.PI * 2), w3 = ctx.rng.range(0, Math.PI * 2);
  const wob = (th: number): number =>
    amp * (Math.sin(th * 3 + w1) * 0.55 + Math.sin(th * 7 + w2) * 0.3 + Math.sin(th * 13 + w3) * 0.15);
  const c = seat.c, clipN = seat.n ?? null;
  const tierAtR = (rr: number): number => {
    for (let k = levels; k >= 1; k--) if (rr < outer![k]) return k;
    return 0;
  };
  const R = outer[1];
  const cols = Math.floor(ctx.arena.w / cs), rows = Math.floor(ctx.arena.h / cs);
  const gx0 = Math.max(1, Math.floor((c.x - R - amp - cs) / cs));
  const gx1 = Math.min(cols - 2, Math.ceil((c.x + R + amp + cs) / cs));
  const gy0 = Math.max(1, Math.floor((c.y - R - amp - cs) / cs));
  const gy1 = Math.min(rows - 2, Math.ceil((c.y + R + amp + cs) / cs));
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const x = gx * cs + cs / 2, y = gy * cs + cs / 2;
      const dx = x - c.x, dy = y - c.y;
      if (clipN && dx * clipN.x + dy * clipN.y < -cs * 0.5) continue; // behind the half-cone's diameter
      const t = tierAtR(Math.hypot(dx, dy) - wob(Math.atan2(dy, dx)));
      if (t >= 1) grid.fillRegion(x - cs * 0.45, y - cs * 0.45, x + cs * 0.45, y + cs * 0.45, `peak_terrace_${t}`);
    }
  }

  // THE STAIRS: one stepped way per rim, each swung a switchback's walk
  // around the face from the last (half-cones bounce inside their open
  // face). Radial overshoot on both ends lands every stair on its own two
  // floors regardless of wobble — the crossing law does the rest.
  const nAng = clipN ? Math.atan2(clipN.y, clipN.x) : 0;
  const halfLim = Math.PI / 2 - 0.42;
  const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
  let th = clipN ? nAng + ctx.rng.range(-halfLim * 0.8, halfLim * 0.8) : ctx.rng.range(0, Math.PI * 2);
  let sign = ctx.rng.chance(0.5) ? 1 : -1;
  for (let k = 1; k <= levels; k++) {
    if (k > 1) {
      let next = th + sign * ctx.rng.range(swingBand[0], swingBand[1]);
      if (clipN && Math.abs(wrap(next - nAng)) > halfLim) {
        sign = -sign;
        next = th + sign * ctx.rng.range(swingBand[0], swingBand[1]);
        if (Math.abs(wrap(next - nAng)) > halfLim) next = nAng + Math.sign(wrap(next - nAng)) * halfLim * 0.85;
      }
      th = next;
    }
    const rim = outer[k] + wob(th);
    const rOut = rim + cs * 2.4;
    const rIn = Math.max(cs * 1.5, rim - cs * 2.4);
    paintStrip(grid, vec(c.x + Math.cos(th) * rOut, c.y + Math.sin(th) * rOut),
      vec(c.x + Math.cos(th) * rIn, c.y + Math.sin(th) * rIn), rampHalfW, `peak_ramp_${k}`);
  }

  for (const e of ctx.exits) {
    if (!grid.reachable(ctx.entry, e)) grid.carveCorridor(ctx.entry.x, ctx.entry.y, e.x, e.y, 34);
  }

  def.tiers = {
    kind: 'over', exposure: 'open',
    label: levels > 1 ? 'the terraces' : 'the plateau',
    levels,
    packSplit: layoutParam(def, 'tierPackSplit', SB.packSplit),
    rimDuels: layoutParam(def, 'rimDuels', true),
  };

  // Every bench grows its OWN furniture (stamped with its story), and THE
  // CROWN keeps the reward the valley can see and must earn.
  const top = `peak_terrace_${levels}`;
  const tierOfKind = (k: string | undefined): number => Math.max(1, (k ? regionKind(k)?.tier ?? 1 : 1));
  layTierKit(ctx, grid, layoutParam<TierKitRow[]>(def, 'tierKit', [
    { kind: 'rock', count: [4, 8], radius: [12, 22] },
    { kind: 'scree', count: [3, 6], radius: [16, 26] },
    { kind: 'brush', count: [1, 3], radius: [12, 18] },
    { kind: 'cairn', count: [0, 2], radius: [10, 14] },
  ]), k => !!k && k.startsWith('peak_terrace_') && k !== top, tierOfKind);
  layTierKit(ctx, grid, layoutParam<TierKitRow[]>(def, 'peakKit', [
    { kind: 'cairn', count: [1, 2], radius: [11, 15] },
    { kind: 'standing_stone', count: [1, 3], radius: [12, 20] },
    { kind: 'spelunker_pack', count: [1, 1], radius: [10, 12] },
    { kind: 'rock', count: [1, 3], radius: [12, 20] },
  ]), k => k === top, tierOfKind);
  scatterDecoration(ctx, def);
}

registerLayout('switchback', switchbackLayout);

/** Paint a straight strip of region `kindId` between two points (inclusive),
 *  optionally gated per-cell on the CURRENT kind. */
function paintStrip(
  grid: GridWalkField, from: Vec2, to: Vec2, halfW: number, kindId: string,
  when?: (currentKind: string | undefined) => boolean,
): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (halfW * 0.9)));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t;
    if (when && !when(grid.regionAt?.(x, y))) continue;
    grid.fillRegion(x - halfW, y - halfW, x + halfW, y + halfW, kindId);
  }
}

// --- THE UNDER-TIER LANES ---------------------------------------------------------
// The covered story as a REGISTERED VOCABULARY (the registerLayout/registerStamp
// idiom): a duct web sunk UNDER a zone's ground — wells (links) on open ground,
// corridors repainted per what stands above (open ground → the lane's duct:
// surface above, tunnel below; a mapped mass → its under-wall: the mass keeps
// its wall AND hides a tunnel). The SEWER lane is the debut (the metropolis
// drains, draw-for-draw the classic carve); THE ROOT TIER (lane 'roots',
// data/massifs.ts) is the garden's — THE ROOTED WEB's in-map under-story.
// TWO invocation seats, one carver: the district recipe calls carveUnderTier
// mid-recipe (its historical rng seat — the draw order is a compatibility
// contract), and any OTHER recipe dials `layoutParams.underTier` to have the
// generateLayout finished-grid tail run the same carve (registerUnderTierPass
// below — the trapworks-pass idiom; no recipe edits, ever).

/** One registered under-tier lane — every region/prop/kit choice is data. */
export interface UnderTierSpec {
  /** Region painted where a leg crosses open ground (surface above, tunnel
   *  below — the bridge pair). */
  duct: string;
  /** Region painted on each joined well (the crossing — tierLink). */
  well: string;
  /** The stair PROP each joined well wears, rotated INTO its tunnel. */
  stairKind: string;
  /** Mass regions a leg may bore beneath, and what they repaint to (the
   *  building keeps its wall and hides a tunnel). Absent = legs route around
   *  every wall. */
  underWall?: Record<string, string>;
  /** Wells rolled per zone (default TIER_CFG.wells). */
  wells?: [number, number];
  /** Duct corridor half-width (default TIER_CFG.ductHalfW). */
  ductHalfW?: number;
  /** HUD label for the under story ("the drains", "the roots"). */
  label: string;
  /** ZoneTiers.packSplit default (layoutParam 'tierPackSplit' outranks). */
  packSplit?: number;
  /** The story's OWN generation layer (layoutParam 'tierKit' outranks). */
  kit?: TierKitRow[];
  /** Walkable regions a leg must NEVER bore beneath (roots do not swim —
   *  a pond must keep its floor). Absent = every walkable cell is fair. */
  forbid?: string[];
  /** Sidezone-door kinds relocateDeepDoors pulls down into the web. */
  deepDoorKinds?: string[];
  /** Relocation chance per door (layoutParam 'grateInDrains' outranks). */
  deepDoorBias?: number;
  /** 'seat': a relocated door is STAMPED to the under story (drawn == dwelled
   *  from below — the root tier's law) and its candidate cells keep
   *  `portClear` from every portal. 'none' (default): the door keeps its
   *  surface stamp (the classic street grate reads from above). */
  doorTier?: 'seat' | 'none';
  portClear?: number;
  /** THE GROTTO FORM (the meadow mere's debut): the lane's payload is ONE
   *  set-piece chamber instead of a duct web — deliberately NOT the
   *  worm-runs (no structural twinning with the garden/downs lattices).
   *  When present, carveUnderTier sinks a single wobble-rimmed chamber
   *  whose floor is `duct`, pools `grotto.water` at its heart, and cuts
   *  EXACTLY ONE well/stair mouth ("one entryway" — the ruling's word).
   *  Ephemerality is NOT carved here: the water region is an ordinary
   *  span target (ZoneTheme.spans swaps full/ebbing/drained on its
   *  RadianceCond), so the wet-by-night law rides standing machinery. */
  grotto?: UnderGrottoSpec;
}

/** The set-piece chamber a grotto lane carves. Every field is data; every
 *  number is a default a layoutParam can outrank. */
export interface UnderGrottoSpec {
  /** Region pooled at the chamber's heart (tier-1 floor like the shore —
   *  the mere is wade-depth ground to the story that owns it, and the
   *  theme's span row swaps its face through the ephemerality phases). */
  water: string;
  /** Chamber radius band (px). */
  radius?: [number, number];
  /** The water blob's share of the chamber radius (a shore ring always
   *  survives — the drained-face read and the court need standing ground). */
  waterFrac?: number;
  /** The story's OWN population (the "truly independent, layered zones" law
   *  grown from dress to LIFE): rows seeded on the chamber's floor as
   *  tier-stamped landmarkSpawns — materialized by loadZone as ordinary
   *  base population, memory-tagged, unreachable from the surface story by
   *  the standing same-tier combat law. */
  fauna?: { id: string; count: [number, number] }[];
  /** Multiplier over the folded weight of every LairSeat.underLane row this
   *  lane resolves (layoutParam 'underLairBias' outranks — the probe's
   *  forcing lever). The lair fold itself is engine/lairs.ts's, verbatim:
   *  rows claim the land, the grotto is merely where the claim can stand. */
  lairBias?: number;
}

/** The lane registry — an OPEN vocabulary (the registerLayout idiom). */
export const UNDER_TIER_LANES: Record<string, UnderTierSpec> = {};

export function registerUnderTier(id: string, spec: UnderTierSpec): void {
  UNDER_TIER_LANES[id] = spec;
}

// THE SEWER LANE — the debut, registered with the classic constants so the
// district recipe's re-point is byte-identical (the metropolis A/B contract).
registerUnderTier('sewer', {
  duct: 'sewer_duct', well: 'culvert_well', stairKind: 'culvert_stair',
  underWall: { tenement_wall: 'sewer_under_wall', manor_wall: 'sewer_under_wall' },
  label: 'the drains', packSplit: 0.3,
  deepDoorKinds: ['sewer_grate'],
  // The drains' OWN generation layer: webbier than the street above (the
  // ceiling harvest), boned, and stocked with what only smugglers carry.
  kit: [
    { kind: 'web', count: [4, 8], radius: [16, 30] },
    { kind: 'bone_pile', count: [2, 4], radius: [10, 16] },
    { kind: 'rubble', count: [1, 3], radius: [12, 20] },
    { kind: 'smuggler_cache', count: [1, 2], radius: [10, 13] },
  ],
});

/** THE RIM LAW (the dead-door defect, task_e2243782): the arena SHAPE is a
 *  MOVE-TIME confine — clampPos projects every body inside the inscribed
 *  ellipse — but the carve grid is rect-blind, so a duct cell can stand
 *  beyond the rim on ground no body can ever reach. Any seat a body must
 *  DWELL (a well's stair, a relocated deep door) must survive the mouth
 *  clamp unmoved, or the drawn fixture and its dwell entry tear apart (the
 *  264px crypt_gate divergence). Rect zones: every interior grid cell and
 *  every inset-200 well pick already clears the 28u margin — a structural
 *  no-op, draws byte-identical. Boundless zones have no rim; all pass. */
function seatInArena(def: ZoneDef, arena: { w: number; h: number }, p: Vec2): boolean {
  return insideBounds(p, 28, {
    w: arena.w, h: arena.h, shape: def.shape ?? 'rect',
    ...(def.boundless ? { boundless: true } : {}),
  });
}

export function carveUnderTier(ctx: GenCtx, def: ZoneDef, grid: GridWalkField, lane: string): void {
  const spec = UNDER_TIER_LANES[lane];
  if (!spec) {
    console.warn(`[tiers] '${def.id}' asks under-tier lane '${lane}' but none is registered — the layer is dead`);
    return;
  }
  // THE GROTTO FORM: a set-piece lane carves ONE chamber, never the lattice.
  // Branched before any draw, so every lattice lane stays byte-identical.
  if (spec.grotto) { carveUnderGrotto(ctx, def, grid, lane, spec, spec.grotto); return; }
  const underWall = spec.underWall ?? {};
  const cs: number = (grid as unknown as { cell?: number }).cell ?? 30;
  const wellBand = spec.wells ?? TIER_CFG.wells;
  const ductHalfW = spec.ductHalfW ?? TIER_CFG.ductHalfW;
  const nWells = ctx.rng.int(wellBand[0], wellBand[1]);
  const wells: Vec2[] = [];
  for (let t = 0; t < 60 && wells.length < nWells; t++) {
    const p = vec(ctx.rng.range(200, ctx.arena.w - 200), ctx.rng.range(200, ctx.arena.h - 200));
    if (!grid.isWalkable(p.x, p.y)) continue;
    if (!seatInArena(def, ctx.arena, p)) continue; // the rim law — a stair must be standable
    if (wells.some(w => Math.hypot(w.x - p.x, w.y - p.y) < 420)) continue;
    if (Math.hypot(p.x - ctx.entry.x, p.y - ctx.entry.y) < 260) continue;
    wells.push(p);
  }
  if (wells.length < 2) return; // no lattice, no layer — the zone stays flat

  // Connect wells in a chain with L-corridors; a leg only lays where every
  // cell is duct-able (open ground or a mapped mass) — else try the other
  // elbow, else skip the pair (an orphan duct is worse than none).
  const ductable = (k: string | undefined): boolean =>
    !!k && (underWall[k] !== undefined
      || (!!regionKind(k)?.walkable && !spec.forbid?.includes(k)));
  const legClear = (a: Vec2, b: Vec2): boolean => {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / cs));
    for (let s = 0; s <= steps; s++) {
      const k = grid.regionAt?.(a.x + (b.x - a.x) * (s / steps), a.y + (b.y - a.y) * (s / steps));
      if (!ductable(k)) return false;
    }
    return true;
  };
  const paintLeg = (a: Vec2, b: Vec2): void => {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (cs * 0.5)));
    for (let s = 0; s <= steps; s++) {
      const x = a.x + (b.x - a.x) * (s / steps), y = a.y + (b.y - a.y) * (s / steps);
      const k = grid.regionAt?.(x, y);
      const paint = k && underWall[k] ? underWall[k] : spec.duct;
      grid.fillRegion(x - ductHalfW, y - ductHalfW, x + ductHalfW, y + ductHalfW, paint);
    }
  };
  let joined = 0;
  const wellDir = new Map<number, number>(); // well index → its tunnel's FIRST bearing
  for (let i = 1; i < wells.length; i++) {
    const a = wells[i - 1], b = wells[i];
    const elbow1 = vec(b.x, a.y), elbow2 = vec(a.x, b.y);
    let elbow: Vec2 | null = null;
    if (legClear(a, elbow1) && legClear(elbow1, b)) elbow = elbow1;
    else if (legClear(a, elbow2) && legClear(elbow2, b)) elbow = elbow2;
    if (!elbow) continue;
    paintLeg(a, elbow); paintLeg(elbow, b); joined++;
    // The stair must FACE its tunnel: record each endpoint's first bearing.
    if (!wellDir.has(i - 1)) wellDir.set(i - 1, Math.atan2(elbow.y - a.y, elbow.x - a.x));
    if (!wellDir.has(i)) wellDir.set(i, Math.atan2(elbow.y - b.y, elbow.x - b.x));
  }
  if (!joined) return;
  // Wells LAST (over the duct ends): the crossings stand on both layers —
  // and each joined well wears its STAIR PROP, rotated INTO the tunnel it
  // starts (a stairway facing north into an east-running duct would lie).
  for (let i = 0; i < wells.length; i++) {
    const p = wells[i];
    const dir = wellDir.get(i);
    if (dir === undefined) continue; // an unjoined well carves nothing — no lying doors
    grid.fillRegion(p.x - cs, p.y - cs, p.x + cs, p.y + cs, spec.well);
    ctx.doodads.push({ pos: vec(p.x, p.y), radius: 16, kind: spec.stairKind, rot: dir });
  }
  def.tiers = {
    kind: 'under', exposure: 'covered', label: spec.label, lane,
    packSplit: layoutParam(def, 'tierPackSplit', spec.packSplit ?? 0.3),
  };
  // The story's OWN generation layer (the "truly independent, layered zones"
  // law) — rows from the lane, retunable per zone via 'tierKit'.
  const underKinds = Object.values(underWall);
  layTierKit(ctx, grid, layoutParam<TierKitRow[]>(def, 'tierKit', spec.kit ?? []),
    k => k === spec.duct || (!!k && underKinds.includes(k)));
}

/** THE GROTTO CARVE (UnderTierSpec.grotto — the moonlit mere's debut): one
 *  wobble-rimmed chamber sunk under open ground, `duct` for its shore,
 *  `grotto.water` pooled at its heart, and EXACTLY ONE well + stair — "one
 *  entryway", the ruling's word, structurally. All-or-nothing by
 *  construction: cells are CLASSIFIED first and painted only once a chamber
 *  AND its mouth both stand (a mouthless grotto would be an orphan story —
 *  refusing before the first fillRegion means a failed hunt leaves the zone
 *  byte-flat). The story then grows its own kit, resolves the land's
 *  LairSeat.underLane claims (the fold is engine/lairs.ts's, verbatim —
 *  this is the only moment the story's floor exists to seat them on), and
 *  seeds its own fauna as tier-stamped landmarkSpawns. Ephemerality is the
 *  theme's business: the water region is a span target and this carve
 *  never reads the sky. */
function carveUnderGrotto(
  ctx: GenCtx, def: ZoneDef, grid: GridWalkField, lane: string,
  spec: UnderTierSpec, g: UnderGrottoSpec,
): void {
  const G = TIER_CFG.grotto;
  const cs: number = (grid as unknown as { cell?: number }).cell ?? 30;
  const rBand = g.radius ?? G.radius;
  // The chamber must FIT: shed radius toward the arena, refuse honestly when
  // even the shed chamber has no room (a QA pocket stays flat, loudly not).
  let R = ctx.rng.range(rBand[0], rBand[1]);
  R = Math.min(R, (Math.min(ctx.arena.w, ctx.arena.h) - 2 * (200 + cs)) / 2);
  if (R < cs * 5) return;
  const portClear = spec.portClear ?? 150;
  const ports = [ctx.entry, ...ctx.exits];
  // The boreable law — the lattice's ductable, minus under-walls (a grotto
  // sinks under open country only) and never under another layer's rows.
  const boreable = (k: string | undefined): boolean => {
    if (!k) return false;
    const rk = regionKind(k);
    return !!rk?.walkable && !rk.tier && !rk.tierLink && !spec.forbid?.includes(k);
  };
  // THE SEAT: hunt a disc of WHOLLY boreable ground (a pond or a wall inside
  // the rim would hole the story — all-boreable keeps the chamber one
  // country and the orphan census at zero by construction), rim-honest at
  // the compass points, clear of the arrival.
  const wob1 = ctx.rng.range(0, Math.PI * 2), wob2 = ctx.rng.range(0, Math.PI * 2), wob3 = ctx.rng.range(0, Math.PI * 2);
  const amp = cs * ctx.rng.range(0.8, 1.5);
  const wob = (th: number): number =>
    amp * (Math.sin(th * 3 + wob1) * 0.55 + Math.sin(th * 7 + wob2) * 0.3 + Math.sin(th * 13 + wob3) * 0.15);
  const wR = Math.max(cs * 2, R * (g.waterFrac ?? G.waterFrac));
  let shoreCells: Vec2[] = [], waterCells: Vec2[] = [];
  let at: Vec2 | null = null;
  for (let t = 0; t < G.seatTries && !at; t++) {
    const p = vec(
      ctx.rng.range(200 + R, ctx.arena.w - 200 - R),
      ctx.rng.range(200 + R, ctx.arena.h - 200 - R),
    );
    if (Math.hypot(p.x - ctx.entry.x, p.y - ctx.entry.y) < G.entryClear + R) continue;
    if (!seatInArena(def, ctx.arena, p)) continue;
    let ok = true;
    for (const [dx, dy] of [[R, 0], [-R, 0], [0, R], [0, -R]] as const) {
      if (!seatInArena(def, ctx.arena, vec(p.x + dx, p.y + dy))) { ok = false; break; }
    }
    if (!ok) continue;
    // Classify the disc WITHOUT painting (the all-or-nothing law).
    const shore: Vec2[] = [], water: Vec2[] = [];
    const gx0 = Math.max(1, Math.floor((p.x - R - amp) / cs));
    const gx1 = Math.min(Math.floor(ctx.arena.w / cs) - 2, Math.ceil((p.x + R + amp) / cs));
    const gy0 = Math.max(1, Math.floor((p.y - R - amp) / cs));
    const gy1 = Math.min(Math.floor(ctx.arena.h / cs) - 2, Math.ceil((p.y + R + amp) / cs));
    for (let gy = gy0; gy <= gy1 && ok; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const x = gx * cs + cs / 2, y = gy * cs + cs / 2;
        const dx = x - p.x, dy = y - p.y;
        const d = Math.hypot(dx, dy);
        const th = Math.atan2(dy, dx);
        const rim = R + wob(th);
        if (d > rim) continue;
        if (!boreable(grid.regionAt?.(x, y))) { ok = false; break; }
        const wRim = Math.min(wR + wob(th) * 0.5, rim - cs * G.shoreRing);
        if (d <= wRim) water.push(vec(x, y)); else shore.push(vec(x, y));
      }
    }
    if (!ok || water.length < 4 || shore.length < 12) continue;
    at = p; shoreCells = shore; waterCells = water;
  }
  if (!at) return;
  const heart: Vec2 = at; // the seated chamber center (const for the closures below)
  // THE ONE WELL: the nearest-arrival shore cell that keeps the deep-door
  // law's portal clearance and the rim (a dwell seat must be standable).
  // Chosen BEFORE any paint — no mouth, no chamber.
  let well: Vec2 | null = null;
  let bestD = Infinity;
  for (const c of shoreCells) {
    if (!ports.every(q => Math.hypot(q.x - c.x, q.y - c.y) >= portClear)) continue;
    if (!seatInArena(def, ctx.arena, c)) continue;
    const d = Math.hypot(c.x - ctx.entry.x, c.y - ctx.entry.y);
    if (d < bestD) { bestD = d; well = c; }
  }
  if (!well) return;
  // PAINT (the classification's own cells — drawn == classified).
  for (const c of shoreCells) grid.fillRegion(c.x - cs * 0.45, c.y - cs * 0.45, c.x + cs * 0.45, c.y + cs * 0.45, spec.duct);
  for (const c of waterCells) grid.fillRegion(c.x - cs * 0.45, c.y - cs * 0.45, c.x + cs * 0.45, c.y + cs * 0.45, g.water);
  grid.fillRegion(well.x - cs, well.y - cs, well.x + cs, well.y + cs, spec.well);
  ctx.doodads.push({
    pos: vec(well.x, well.y), radius: 16, kind: spec.stairKind,
    rot: Math.atan2(heart.y - well.y, heart.x - well.x), // the stair faces INTO its chamber
  });
  def.tiers = {
    kind: 'under', exposure: 'covered', label: spec.label, lane,
    packSplit: layoutParam(def, 'tierPackSplit', spec.packSplit ?? 0.3),
  };
  // The story's OWN generation layer — shore only (nothing stands on water).
  layTierKit(ctx, grid, layoutParam<TierKitRow[]>(def, 'tierKit', spec.kit ?? []),
    k => k === spec.duct);
  // THE LAIR RESOLUTION (LairSeat.underLane): the standing fold, handed the
  // lane it can finally stand on — one rng draw per PRESENT row (the
  // landmark loop's own law), the court seated on the far shore, clear of
  // the one stair so a clearSite can never splice the way out. ONE court
  // per mere: a grotto is a set piece, not a district.
  const bias = layoutParam(def, 'underLairBias', g.lairBias ?? 1);
  if (bias > 0) {
    const ts = def.tileset ? TILESETS[def.tileset] : undefined;
    const rolls = lairLandmarkRolls({
      place: def.caveDepth ? 'cave' : 'surface',
      biome: def.caveDepth ? def.anchor : ts?.biome,
      caveDepth: def.caveDepth ?? 0,
      level: ctx.level ?? def.level ?? 1,
      tileset: def.tileset ?? '',
      biomeDepth: def.geo?.biomeDepth, climate: def.geo?.climate,
      underLane: lane,
    });
    for (const roll of rolls) {
      if (!ctx.rng.chance(Math.min(1, roll.chance * bias))) continue;
      // The court stands at the WATERLINE (inner shore), farthest from the
      // stair: deep enough inside the rim that the den apron never spills
      // onto the surface country, far enough from the well that its
      // clearSite can never splice the one way out. SNUG seats only — the
      // whole 8-neighbour ring must be the mere's own ground, so the
      // landmark placer's lattice snap (≤ half a cell) can never step the
      // centerpiece off the story. Waterline first, any snug shore as the
      // honest fallback.
      const mereGround = (k: string | undefined): boolean =>
        k === spec.duct || k === g.water || k === spec.well;
      const snug = (c: Vec2): boolean => {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!mereGround(grid.regionAt?.(c.x + dx * cs, c.y + dy * cs))) return false;
          }
        }
        return true;
      };
      const waterline = shoreCells.filter(c =>
        Math.hypot(c.x - heart.x, c.y - heart.y) <= wR + cs * 2.5);
      let seat: Vec2 | null = null;
      let far = -1;
      for (const pool of [waterline.filter(snug), shoreCells.filter(snug)]) {
        for (const c of pool) {
          const d = Math.hypot(c.x - well.x, c.y - well.y);
          if (d < G.lairSeatClear) continue;
          if (d > far) { far = d; seat = c; }
        }
        if (seat) break;
      }
      if (!seat) break;
      placeLandmarkById(ctx, roll.landmark, seat);
      break;
    }
  }
  // THE FAUNA (the story's own life): tier-stamped landmarkSpawns rows —
  // loadZone materializes them as memory-tagged base population, and the
  // standing same-tier laws keep them unreachable from the surface story.
  const seats = [...shoreCells, ...waterCells];
  for (const row of g.fauna ?? []) {
    const n = ctx.rng.int(row.count[0], row.count[1]);
    for (let k = 0; k < n; k++) {
      const c = seats[ctx.rng.int(0, seats.length - 1)];
      (ctx.landmarkSpawns ??= []).push({
        id: row.id,
        pos: vec(c.x + ctx.rng.range(-cs * 0.3, cs * 0.3), c.y + ctx.rng.range(-cs * 0.3, cs * 0.3)),
        tier: 1,
      });
    }
  }
}

/** THE DEEP DOOR PREFERS THE DRAINS: after scatter, a lane-tiered zone pulls
 *  its registered sidezone doors (the classic Sewerworks grates; the garden's
 *  taproot gates) down INTO the duct web — weighted, never absolute (a door
 *  left on the surface still reads). Under-wall cells are the best seats:
 *  the deep door is FOUND from below. Lanes with doorTier 'seat' stamp the
 *  relocated door to the under story (drawn == dwelled from below). */
export function relocateDeepDoors(ctx: GenCtx, def: ZoneDef, grid: GridWalkField): void {
  if (!def.tiers || def.tiers.kind !== 'under' || !def.tiers.lane) return;
  const spec = UNDER_TIER_LANES[def.tiers.lane];
  const doors = spec?.deepDoorKinds ?? [];
  if (!spec || !doors.length) return;
  const underWall = spec.underWall ?? {};
  const underKinds = Object.values(underWall);
  const cs: number = (grid as unknown as { cell?: number }).cell ?? 30;
  let inTunnel: Vec2[] = [];
  let preferred: Vec2[] = [];
  const cols = Math.floor(ctx.arena.w / cs), rows = Math.floor(ctx.arena.h / cs);
  for (let gy = 1; gy < rows - 1; gy++) {
    for (let gx = 1; gx < cols - 1; gx++) {
      const x = gx * cs + cs / 2, y = gy * cs + cs / 2;
      const k = grid.regionAt?.(x, y);
      if (k === spec.duct) inTunnel.push(vec(x, y));
      else if (k && underKinds.includes(k)) preferred.push(vec(x, y));
    }
  }
  // 'seat' lanes keep their sunken doors clear of every portal disc (a
  // below-story door must never shadow a surface portal's dwell). Filtered
  // BEFORE any draw so 'none' lanes (the sewer) keep their exact pools.
  if (spec.doorTier === 'seat') {
    const clear = spec.portClear ?? 150;
    const ports = [ctx.entry, ...ctx.exits];
    const far = (p: Vec2): boolean => ports.every(q => Math.hypot(q.x - p.x, q.y - p.y) >= clear);
    inTunnel = inTunnel.filter(far);
    preferred = preferred.filter(far);
  }
  // THE RIM LAW: no door seat beyond the arena shape (seatInArena above) —
  // a door the rim hides from every walker is a dead door however honestly
  // its duct was carved.
  inTunnel = inTunnel.filter(p => seatInArena(def, ctx.arena, p));
  preferred = preferred.filter(p => seatInArena(def, ctx.arena, p));
  if (!inTunnel.length && !preferred.length) return;
  const bias = layoutParam(def, 'grateInDrains', spec.deepDoorBias ?? 0.7);
  for (const d of ctx.doodads) {
    if (!doors.includes(d.kind) || !ctx.rng.chance(bias)) continue;
    const pool = preferred.length && ctx.rng.chance(0.65) ? preferred : (inTunnel.length ? inTunnel : preferred);
    for (let t = 0; t < 12; t++) {
      const p = pool[ctx.rng.int(0, pool.length - 1)];
      if (ctx.doodads.some(o => o !== d && (o.kind === spec.stairKind || doors.includes(o.kind))
        && Math.hypot(o.pos.x - p.x, o.pos.y - p.y) < 90)) continue;
      d.pos = vec(p.x, p.y);
      if (spec.doorTier === 'seat') d.tier = 1;
      break;
    }
  }
}

// THE TAIL SEAT — any recipe dials `layoutParams.underTier: '<lane>'` (+
// `underTierChance`, byDepth-able) and the finished-grid tail sinks the lane
// with no recipe edits (the trapworks-pass idiom; registration lives here
// because levelgen cannot import this module). Attempt-honest: a stale
// lane-stamped tiers from a prior generation attempt is cleared before the
// roll, and a layer another fabric carved (needles, the massif bores, the
// district's own mid-recipe call) is never touched — one zone, one stack.
// The grid is ensured only AFTER the chance lands (a convex zone that
// misses the roll stays convex — zero side effects on a refusal).
registerUnderTierPass((ctx: GenCtx, def: ZoneDef): void => {
  const lane = layoutParam<string | undefined>(def, 'underTier', undefined);
  if (!lane) return;
  if (def.tiers?.lane !== undefined) def.tiers = undefined;
  if (def.tiers) return;
  if (!ctx.rng.chance(layoutParam<number>(def, 'underTierChance', 1))) return;
  const grid = ensureGrid(ctx);
  carveUnderTier(ctx, def, grid, lane);
  relocateDeepDoors(ctx, def, grid);
});

// --- THE STORY ROAD (the aloft lane's reachability oracle) -----------------------

/** Can a ground-story walker at `from` reach `to` standing on story `tier`,
 *  crossing only the grid's OWN links (ramps, wells, spans)? The layered BFS
 *  the aloft siter (LandmarkDef.siteTier / CompositionSite.siteTier) gates
 *  every accepted seat on — a claim on a story must be reachable by the
 *  story's own ways, ASSERTED, never assumed (a rampless butte is a sky
 *  island however honest its floor). State is (cell, story): same-story
 *  steps where tierFloorAt owns the floor, plus the free flip at a link cell
 *  between the two stories of its span (stepping off resolves the rest —
 *  resolveTierCrossing's law at siting grain). Pure and draw-free; cost is
 *  one flood per ACCEPTED aloft dart, bounded by cells × (MAX_TIER + 1). */
export function storyReachable(grid: GridWalkField, from: Vec2, to: Vec2, tier: number): boolean {
  const cs = grid.cell, cols = grid.cols, rows = grid.rows;
  if (cols <= 0 || rows <= 0) return false;
  const stories = MAX_TIER + 1;
  const cellOf = (p: Vec2): number => {
    const gx = Math.min(cols - 1, Math.max(0, Math.floor(p.x / cs)));
    const gy = Math.min(rows - 1, Math.max(0, Math.floor(p.y / cs)));
    return gy * cols + gx;
  };
  const kindAt = (ci: number): string =>
    grid.regionAt((ci % cols) * cs + cs / 2, Math.floor(ci / cols) * cs + cs / 2);
  // Per-kind memo (the makeTierNav floorOf idiom): floor verdict per story +
  // the link span, resolved once per region kind, not per cell.
  const floorMemo = new Map<string, number>(); // kind → story bitmask
  const spanMemo = new Map<string, [number, number] | null>();
  const floorBits = (k: string): number => {
    let f = floorMemo.get(k);
    if (f === undefined) {
      f = 0;
      for (let t = 0; t < stories; t++) if (tierFloorAt(k, t)) f |= 1 << t;
      floorMemo.set(k, f);
    }
    return f;
  };
  const spanOf = (k: string): [number, number] | null => {
    let s = spanMemo.get(k);
    if (s === undefined) {
      const rk = regionKind(k);
      s = rk?.tierLink ? linkSpanOf(rk) : null;
      spanMemo.set(k, s);
    }
    return s;
  };
  const target = cellOf(to);
  const start = cellOf(from);
  const seen = new Uint8Array(cols * rows * stories);
  const queue: number[] = [];
  const push = (ci: number, s: number): void => {
    const key = ci * stories + s;
    if (seen[key]) return;
    seen[key] = 1;
    queue.push(key);
  };
  // Seed on the ground story (entries are carved ground); a from-point that
  // already stands elevated (an in-stack caller) seeds its own floor too.
  const startBits = floorBits(kindAt(start));
  if (startBits & 1) push(start, 0);
  for (let t = 1; t < stories; t++) if (startBits & (1 << t)) push(start, t);
  if (!queue.length) return false;
  for (let qi = 0; qi < queue.length; qi++) {
    const key = queue[qi];
    const ci = Math.floor(key / stories), s = key % stories;
    if (ci === target && s === tier) return true;
    const k = kindAt(ci);
    // The link flip: a body on a crossing stands on BOTH stories of the span.
    const span = spanOf(k);
    if (span) {
      if (s === span[0]) push(ci, span[1]);
      else if (s === span[1]) push(ci, span[0]);
    }
    // Same-story steps (4-neighbour, row-edge honest).
    const gx = ci % cols, gy = Math.floor(ci / cols);
    if (gx > 0 && (floorBits(kindAt(ci - 1)) & (1 << s))) push(ci - 1, s);
    if (gx < cols - 1 && (floorBits(kindAt(ci + 1)) & (1 << s))) push(ci + 1, s);
    if (gy > 0 && (floorBits(kindAt(ci - cols)) & (1 << s))) push(ci - cols, s);
    if (gy < rows - 1 && (floorBits(kindAt(ci + cols)) & (1 << s))) push(ci + cols, s);
  }
  return false;
}

// THE ALOFT SITER'S INSTALLATION (the registerUnderTierPass idiom — levelgen
// cannot import this module, so the tier truths are injected): the view IS
// makeTierView (the mover contract's own resolver — drawn == sited through
// every consumer), the floor IS tierFloorAt, the road IS storyReachable.
registerTierSiting({
  view: (grid, tier) => makeTierView(grid, tier),
  floorAt: (kind, tier) => tierFloorAt(kind, tier),
  // The story's own ground: an elevated row of exactly this story — never a
  // crossing (tierLink) and never a shared deck (a walkable row is the
  // valley's floor too, however high its second face rides).
  sovereignAt: (kind, tier) => {
    const rk = kind ? regionKind(kind) : undefined;
    return !!rk && !rk.tierLink && !rk.walkable && rk.tier === tier;
  },
  reaches: (grid, from, to, tier) => storyReachable(grid, from, to, tier),
});

// --- THE STORY REACH (the stories gate's resolver — LairSeat.stories) -------------
// How many OVER-stories a layout family can stack, as an OPEN registry (the
// registerLayout idiom): each over-story recipe declares its own reach law
// beside its carve, a fold-time consumer asks per TILESET, and flat country
// answers 0 free. The lair fold's stories gate (engine/lairs.ts) rides this
// through registerLairStoryReach — a story-hungry claim refuses at the fold
// on ground that can NEVER stack, burning no darts and no rng. TILESET
// GRAIN, deliberately: the reach is the face's best-case CAPABILITY (max
// over base + variants, and over the biome's allowedLayouts where no
// forceLayout pins one — worldgen's own precedence), so per-mint rolls that
// come up short (a shed mountain, a course's riverland override) still
// refuse at the dart, the standing starved-landmark class.

/** Per-layout story reach: merged layoutParams in, best-case story count
 *  out. Registered beside the recipes; unregistered layouts stack nothing. */
const LAYOUT_STORIES: Record<string, (params?: Record<string, unknown>) => number> = {};

export function registerLayoutStories(
  layoutType: string, reach: (params?: Record<string, unknown>) => number,
): void {
  LAYOUT_STORIES[layoutType] = reach;
}

/** Tolerant band-top reader: a plain [lo, hi] band answers hi; a byDepth
 *  ramp answers the best end (capability, not a mint's local roll). */
function bandTop(v: unknown, dflt: number): number {
  if (Array.isArray(v) && typeof v[1] === 'number') return v[1];
  if (v && typeof v === 'object' && Array.isArray((v as { byDepth?: unknown[] }).byDepth)) {
    let m = 0;
    for (const end of (v as { byDepth: unknown[] }).byDepth) m = Math.max(m, bandTop(end, 0));
    if (m > 0) return m;
  }
  return dflt;
}

// The needles country: the butte tops are ONE story, always.
registerLayoutStories('needles', () => 1);
// The summit ascent: as many stories as the face's level band can roll
// (peakLevels' top, the recipe's own MAX_TIER clamp — the arena-fit shed
// is a per-mint roll the capability read deliberately ignores).
registerLayoutStories('switchback', (p) =>
  Math.max(1, Math.min(MAX_TIER, bandTop(p?.peakLevels, TIER_CFG.switchback.levels[1]))));

/** A tileset's story reach: max over its faces (base + variants, each with
 *  the per-key layoutParams merge worldgen mints with) and over its layout
 *  routes (forceLayout pins one; else the biome's allowedLayouts roll). */
export function tilesetStoryReach(ts: TilesetDef): number {
  const routes = ts.forceLayout
    ? [ts.forceLayout]
    : Object.keys((ts.biome ? BIOMES[ts.biome]?.allowedLayouts : undefined) ?? {});
  let best = 0;
  const faces: (Record<string, unknown> | undefined)[] = [
    ts.layoutParams,
    ...(ts.variants ?? []).map(v => ({ ...ts.layoutParams, ...v.layoutParams })),
  ];
  for (const route of routes) {
    const reach = LAYOUT_STORIES[route];
    if (!reach) continue;
    for (const p of faces) best = Math.max(best, reach(p));
  }
  return best;
}

registerLairStoryReach((tilesetId) => {
  const ts = TILESETS[tilesetId];
  return ts ? tilesetStoryReach(ts) : 0;
});
