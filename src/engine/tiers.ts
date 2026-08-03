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
import { regionKind, type RegionKind } from '../world/regions';
import {
  ensureGrid, layoutParam, registerLayout, registerUnderTierPass, scatterDecoration,
  type GenCtx,
} from './levelgen';
import { carveMassifs } from './massif';

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

export function carveUnderTier(ctx: GenCtx, def: ZoneDef, grid: GridWalkField, lane: string): void {
  const spec = UNDER_TIER_LANES[lane];
  if (!spec) {
    console.warn(`[tiers] '${def.id}' asks under-tier lane '${lane}' but none is registered — the layer is dead`);
    return;
  }
  const underWall = spec.underWall ?? {};
  const cs: number = (grid as unknown as { cell?: number }).cell ?? 30;
  const wellBand = spec.wells ?? TIER_CFG.wells;
  const ductHalfW = spec.ductHalfW ?? TIER_CFG.ductHalfW;
  const nWells = ctx.rng.int(wellBand[0], wellBand[1]);
  const wells: Vec2[] = [];
  for (let t = 0; t < 60 && wells.length < nWells; t++) {
    const p = vec(ctx.rng.range(200, ctx.arena.w - 200), ctx.rng.range(200, ctx.arena.h - 200));
    if (!grid.isWalkable(p.x, p.y)) continue;
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
