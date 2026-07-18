// ---------------------------------------------------------------------------
// THE TIER FABRIC — a second walkable LAYER inside the same zone.
//
// True verticality without a second zone: the region map itself declares the
// upper (or under) layer — `RegionKind.tier: 1` marks a row as FLOOR on the
// second tier (a butte top is wall to the valley and ground to the summit;
// a sewer duct under a tenement is wall to the street and tunnel below it),
// `walkable` keeps meaning the tier-0 truth (a row carrying BOTH is a bridge:
// the valley walks under while the deck walks over — one cell, two floors),
// and `tierLink` rows (ramps, culvert wells) are the CROSSINGS — walkable on
// both tiers, flipping a body's tier when it steps off toward ground only
// the other tier owns.
//
// Everything derives from the live region map — no second grid to build,
// dirty-track, or persist: the TIER VIEW below is a stateless adapter over
// GridWalkField whose walkability predicate reads tier flags, so carves
// (hollows, corridors) self-heal on both layers by construction.
//
// THE LAW (enforced at the one mover contract + the hit gates in world.ts):
//   · movement — a body confines against ITS tier's floor; walking never
//     drops off a rim (the rim is a wall to feet), but a SHOVE past a rim is
//     a FALL: the body lands on tier 0 where the valley stands (the bowling
//     lane's new toy — knock them off the butte).
//   · combat — hostility, projectiles and ground zones are SAME-TIER ONLY
//     (a deck duel and a valley duel share a screen, never a fight); the
//     zone's exposure decides what the RENDERER shows ('open' = both layers
//     visible — buttes; 'covered' = the active layer only — sewers).
//   · AI — monsters spawn per tier (ZoneTiers.packSplit) and stay on their
//     tier (crossing links is the player's craft this pass — documented).
//
// Docs: docs/engine/tiers.md · Probe: balance/probe_tiers.ts
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import type { ZoneDef, ZoneTiers } from '../data/zones';
import type { GridWalkField } from '../world/gridWalk';
import { regionKind } from '../world/regions';
import {
  ensureGrid, layoutParam, registerLayout, scatterDecoration,
  type GenCtx,
} from './levelgen';
import { carveMassifs } from './massif';

export type { ZoneTiers };

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
} as const;

// --- THE TIER PREDICATES -------------------------------------------------------

/** Is this region floor for tier-1 bodies? (Links are floor on BOTH.) */
export function tierFloorOf(kindId: string | undefined): boolean {
  const rk = kindId ? regionKind(kindId) : undefined;
  return !!rk && (rk.tier === 1 || !!rk.tierLink);
}

/** Is this region a crossing between the tiers? */
export function tierLinkOf(kindId: string | undefined): boolean {
  const rk = kindId ? regionKind(kindId) : undefined;
  return !!rk && !!rk.tierLink;
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

/** A stateless tier-1 view over the zone's live grid: walkable where the
 *  region map says tier floor, everything else read-through. Carves and
 *  repaints self-heal on both layers because nothing here is cached. */
export function makeTierView(grid: RegionWalk): WalkView {
  const cs: number = grid.cell ?? grid.cellSize ?? 30;
  const walkAt = (x: number, y: number): boolean => tierFloorOf(grid.regionAt?.(x, y));
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

/** TIER CROSSING (the link law), resolved at the mover: a body standing on a
 *  link may step toward ground only the OTHER tier owns — flip it. Pure read:
 *  returns the tier the move should be judged on. */
export function resolveTierCrossing(
  grid: RegionWalk | null, tier: number, from: Vec2, toward: Vec2,
): number {
  if (!grid?.regionAt) return tier;
  if (!tierLinkOf(grid.regionAt(from.x, from.y))) return tier;
  const destK = grid.regionAt(toward.x, toward.y);
  const rk = destK ? regionKind(destK) : undefined;
  if (!rk || rk.tierLink) return tier;             // link-to-link: keep
  const destTier1 = rk.tier === 1;
  const destTier0 = !!rk.walkable;
  if (tier === 0 && destTier1 && !destTier0) return 1;
  if (tier === 1 && destTier0 && !destTier1) return 0;
  return tier;
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
  };
  scatterDecoration(ctx, def);
}

registerLayout('needles', needlesLayout);

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

// --- THE SEWER UNDER-LATTICE ------------------------------------------------------
// The covered debut: a duct web sunk UNDER a district's streets and blocks —
// culvert wells (links) on open ground, corridors repainted per what stands
// above (open ground → 'sewer_duct': street above, tunnel below; tenement/
// manor mass → 'sewer_under_wall': the building keeps its wall AND hides a
// tunnel). Called by the district recipe when `sewerTier` rolls.

const DUCTABLE: Record<string, string> = {
  tenement_wall: 'sewer_under_wall',
  manor_wall: 'sewer_under_wall',
};

export function carveSewerTier(ctx: GenCtx, def: ZoneDef, grid: GridWalkField): void {
  const cs: number = (grid as unknown as { cell?: number }).cell ?? 30;
  const nWells = ctx.rng.int(TIER_CFG.wells[0], TIER_CFG.wells[1]);
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
  // cell is duct-able (street ground or tenement/manor mass) — else try the
  // other elbow, else skip the pair (an orphan duct is worse than none).
  const ductable = (k: string | undefined): boolean =>
    !!k && (DUCTABLE[k] !== undefined || !!regionKind(k)?.walkable);
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
      const paint = k && DUCTABLE[k] ? DUCTABLE[k] : 'sewer_duct';
      grid.fillRegion(x - TIER_CFG.ductHalfW, y - TIER_CFG.ductHalfW,
        x + TIER_CFG.ductHalfW, y + TIER_CFG.ductHalfW, paint);
    }
  };
  let joined = 0;
  for (let i = 1; i < wells.length; i++) {
    const a = wells[i - 1], b = wells[i];
    const elbow1 = vec(b.x, a.y), elbow2 = vec(a.x, b.y);
    if (legClear(a, elbow1) && legClear(elbow1, b)) { paintLeg(a, elbow1); paintLeg(elbow1, b); joined++; }
    else if (legClear(a, elbow2) && legClear(elbow2, b)) { paintLeg(a, elbow2); paintLeg(elbow2, b); joined++; }
  }
  if (!joined) return;
  // Wells LAST (over the duct ends): the crossings stand on both layers.
  for (const p of wells) {
    grid.fillRegion(p.x - cs, p.y - cs, p.x + cs, p.y + cs, 'culvert_well');
  }
  def.tiers = {
    kind: 'under', exposure: 'covered', label: 'the drains',
    packSplit: layoutParam(def, 'tierPackSplit', 0.3),
  };
}
