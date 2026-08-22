// ---------------------------------------------------------------------------
// THE VENT CAULDRON — a den recipe (Scald Basin M3: THE GREAT GEYSER's
// interior; charter docs/design/scald-basin.md §2 the den row, §3 THE BEAT LAW
// + THE BROIL LAW, §4 downstream, §8 THE GEYSERMAW, §13 M3).
//
// A steam-choked CAULDRON: one wobble-rimmed basin of walkable floor sunk
// into rock, sinter terraces ringing ONE great vent at the heart — the den's
// metronome and its boss's home. The recipe:
//
//   · carves the basin (the rim law — bearingNoise, never a ruler), a clear
//     apron at every portal and a corridor from each door into the bowl, so
//     exits, POIs and reachability all live on the floor (the standing genqa
//     invariants gate it for free);
//   · AUTHORS THE HEART VENT through the geyser fabric's authoring seam
//     (GenCtx.authoredVents → World.bootGeysers anchors it: its OWN band, the
//     metronome law) with a BOSS-TEMPO clock rolled per mint (DIAL) — its
//     broil IS the boss's emergence tell (no rings, no floaters);
//   · seats THE BOSS SEAT (GenCtx.bossSeat → GeneratedLayout.bossSeat): the
//     'boss' objective spawns its ask ON the vent — the Geysermaw lives IN the
//     great geyser (MonsterDef.ventDweller, engine/ventDweller.ts);
//   · dresses the floor: terrace rings of sinter shelves, prism pools on the
//     inner ring, sulphur pools in the bowl, SHELTER overhangs on the middle
//     ring (DoodadRule.shelter — under the heart vent's burn rain these are
//     the dry seats: the downstream teeth teach shelter INSIDE the fight),
//     steam pockets and crusts; the heart stays CLEAR (bootGeysers' clearSeat
//     refuses a solid on the mouth, and the maw needs room to breach);
//   · records terrace POCKETS as POIs (spawners/caches nest there; the heart
//     is NOT a POI — a landmark-grade seat is not a free POI, the lake's law).
//
// Every knob is a layoutParam (spec ▷ tileset ▷ biome); every number a DIAL
// (unblessed — she blesses via playthroughs). Registered as `ventcauldron`
// (THE UNIQUE-ID LAW — `cauldron` is already a doodad kind + stamp id).
// Docs: docs/engine/greatgeyser.md. Probe: balance/probe_den.ts.
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import type { ZoneDef } from '../data/zones';
import {
  registerLayout, layoutParam, ensureGrid, scatterDecoration,
  type DoodadKind, type GenCtx,
} from './levelgen';
import { Mask, bearingNoise, paintRegion, radial } from './genkit';
import type { GeyserClassId } from './geysers';

export const VENTCAULDRON_CFG = {
  /** THE BASIN: radius as a fraction of the arena's short axis, clamped to a
   *  playable band, wobbled per bearing (the rim law). */
  ring: { frac: 0.44, min: 420, max: 900, wobble: 0.12 },
  /** THE HEART: kept clear of every planted piece (the vent mouth + the
   *  great column + the maw's breach need the floor), and reserved so the
   *  rolls that run after the recipe route around it. */
  heartClear: 150,
  /** Land guaranteed around every portal, and the door corridor's half-width. */
  portalClear: 150,
  corridorHalfW: 48,
  /** THE BOSS TEMPO: the heart vent's period band (rolled per mint) — the
   *  window the dweller fights in recurs on this beat. DIAL. */
  ventPeriod: [32, 44] as const,
  /** Terrace rings (count band), their radial seats as fractions of the
   *  basin radius (inner → outer), and the shelf pieces per ring. */
  terraces: { count: [2, 3] as const, at: [0.36, 0.6, 0.82] as const, pieces: [6, 9] as const, shelfR: [28, 42] as const },
  /** Prism pools on the inner ring, sulphur pools through the bowl. */
  prism: { count: [2, 4] as const, r: [18, 30] as const },
  pools: { count: [4, 7] as const, r: [26, 44] as const },
  /** SHELTER seats (sinter overhangs): count, their radial band (as a
   *  fraction of the basin radius — past the great column, inside the burn
   *  rain's annulus), radius. */
  shelters: { count: [3, 5] as const, at: [0.42, 0.7] as const, r: [36, 50] as const },
  /** Steam pockets + sulphur crusts scattered over the floor. */
  steam: { count: [3, 5] as const, r: [18, 30] as const },
  crust: { count: [2, 4] as const, r: [24, 40] as const },
  /** Terrace POCKETS (POIs) on the middle ring. */
  pockets: { count: [4, 6] as const, at: 0.62 },
  /** Placement tries per piece before the count quietly shrinks. */
  tries: 12,
  /** Min separation between planted pieces (their radii add on top). */
  minGap: 10,
  /** The plan registry kept for probes/dev (the last N planned cauldrons). */
  keepPlans: 8,
} as const;

/** What the recipe planned for a zone (the lake's LAKE_PLANS idiom) — read by
 *  probes and the dev kit, never by gameplay. */
export interface VentcauldronPlan {
  cx: number; cy: number;
  /** The basin radius at each bearing (the rim law). */
  rimAt: (th: number) => number;
  heart: Vec2;
  ventCls: GeyserClassId;
  ventPeriod: number;
  ventPhase: number;
  pockets: Vec2[];
  shelters: Vec2[];
  refused?: string;
}

export const VENTCAULDRON_PLANS = new Map<string, VentcauldronPlan>();
function keepPlan(id: string, plan: VentcauldronPlan): void {
  VENTCAULDRON_PLANS.set(id, plan);
  if (VENTCAULDRON_PLANS.size > VENTCAULDRON_CFG.keepPlans) {
    const first = VENTCAULDRON_PLANS.keys().next().value;
    if (first !== undefined) VENTCAULDRON_PLANS.delete(first);
  }
}

function ventcauldronLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const C = VENTCAULDRON_CFG;
  const grid = ensureGrid(ctx);
  const cell = grid.cell;

  // --- the row's dials ---
  const ventCls = layoutParam<GeyserClassId>(def, 'cauldronVent', 'great');
  const periodBand = layoutParam<readonly [number, number]>(def, 'cauldronVentPeriod', C.ventPeriod);
  const ringFrac = layoutParam<number>(def, 'cauldronRing', C.ring.frac);
  const wobble = layoutParam<number>(def, 'cauldronWobble', C.ring.wobble);
  const terraceBand = layoutParam<readonly [number, number]>(def, 'cauldronTerraces', C.terraces.count);
  const poolBand = layoutParam<readonly [number, number]>(def, 'cauldronPools', C.pools.count);
  const prismBand = layoutParam<readonly [number, number]>(def, 'cauldronPrism', C.prism.count);
  const shelterBand = layoutParam<readonly [number, number]>(def, 'cauldronShelters', C.shelters.count);
  const pocketBand = layoutParam<readonly [number, number]>(def, 'cauldronPockets', C.pockets.count);
  const heartClear = layoutParam<number>(def, 'cauldronHeartClear', C.heartClear);

  const refuse = (why: string): void => {
    console.warn(`[ventcauldron] '${def.id}' stands no cauldron — ${why} (the zone stays an open floor)`);
    keepPlan(def.id, {
      cx: arena.w / 2, cy: arena.h / 2, rimAt: () => 0, heart: vec(arena.w / 2, arena.h / 2),
      ventCls, ventPeriod: 0, ventPhase: 0, pockets: [], shelters: [], refused: why,
    });
    scatterDecoration(ctx, def);
  };
  if (arena.boundless) { refuse('a boundless arena has no rim'); return; }

  // --- THE PLAN: rolls first (the draw-order contract), geometry second ---
  const cx = arena.w / 2, cy = arena.h / 2;
  const R = Math.min(C.ring.max, Math.max(C.ring.min, Math.min(arena.w, arena.h) * ringFrac));
  const seedRim = rng.int(1, 0x3fffffff);
  const ventPeriod = rng.range(periodBand[0], periodBand[1]);
  const ventPhase = rng.next();
  if (R < C.ring.min || R > Math.min(arena.w, arena.h) * 0.5 - cell) { refuse(`the basin radius ${Math.round(R)} does not fit the arena`); return; }

  const rimAt = (th: number): number => R * (1 + bearingNoise(th, wobble, seedRim));

  // --- THE CARVE: rock everywhere, then the basin, the door aprons, the corridors ---
  grid.fillRect(0, 0, arena.w, arena.h, false);
  const basin = Mask.forRect(0, 0, arena.w, arena.h, cell);
  radial(basin, cx, cy, rimAt);
  paintRegion(grid, basin, 'ground');
  const portals: Vec2[] = [ctx.entry, ...ctx.exits];
  for (const p of portals) {
    grid.fillDisc(p.x, p.y, C.portalClear * 0.7, 'ground');
    grid.carveCorridor(p.x, p.y, cx, cy, C.corridorHalfW);
  }

  // --- THE HEART: the vent seat, the boss seat, the reservation ---
  const heart = vec(cx, cy);
  (ctx.authoredVents ??= []).push({ pos: vec(heart.x, heart.y), cls: ventCls, period: ventPeriod, phase: ventPhase });
  ctx.bossSeat = vec(heart.x, heart.y);
  ctx.reserved.push({ pos: vec(heart.x, heart.y), radius: heartClear });

  // --- placement helpers (pure tests over the plan; the rng draws only in
  //     the callers' fixed shapes) ---
  const placed: { pos: Vec2; r: number }[] = [];
  const onFloor = (x: number, y: number): boolean => grid.isWalkable(x, y);
  const nearSeg = (p: Vec2, a: Vec2, b: Vec2): number => {
    const sx = b.x - a.x, sy = b.y - a.y, len2 = sx * sx + sy * sy || 1;
    let t = ((p.x - a.x) * sx + (p.y - a.y) * sy) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(p.x - (a.x + sx * t), p.y - (a.y + sy * t));
  };
  const clearOfDoors = (p: Vec2, r: number, solid: boolean): boolean => {
    for (const d of portals) {
      if (Math.hypot(p.x - d.x, p.y - d.y) < C.portalClear + r) return false;
      if (solid && nearSeg(p, d, heart) < C.corridorHalfW + r + 8) return false;
    }
    return true;
  };
  const fits = (p: Vec2, r: number, solid: boolean): boolean => {
    if (!onFloor(p.x, p.y)) return false;
    if (Math.hypot(p.x - heart.x, p.y - heart.y) < heartClear + r) return false;
    if (!clearOfDoors(p, r, solid)) return false;
    for (const o of placed) if (Math.hypot(o.pos.x - p.x, o.pos.y - p.y) < o.r + r + C.minGap) return false;
    return true;
  };
  const plant = (kind: DoodadKind, p: Vec2, r: number): void => {
    ctx.doodads.push({ pos: vec(p.x, p.y), radius: r, kind, rot: rng.range(0, Math.PI * 2) });
    placed.push({ pos: vec(p.x, p.y), r });
  };
  /** A seat on the basin at radial fraction band [f0,f1] of the rim — tries
   *  a fixed number of bearings (each try draws the same shape of stream). */
  const seatOnRing = (f0: number, f1: number, r: number, solid: boolean): Vec2 | null => {
    for (let t = 0; t < C.tries; t++) {
      const th = rng.range(0, Math.PI * 2);
      const f = rng.range(f0, f1);
      const p = vec(cx + Math.cos(th) * rimAt(th) * f, cy + Math.sin(th) * rimAt(th) * f);
      if (fits(p, r, solid)) return p;
    }
    return null;
  };

  // --- THE TERRACES: rings of sinter shelves (walk-over crust), inner →
  //     outer; prism pools on the innermost; the count band picks how many
  //     of the authored ring seats stand ---
  const nTerraces = Math.min(C.terraces.at.length, rng.int(terraceBand[0], terraceBand[1]));
  for (let i = 0; i < nTerraces; i++) {
    const at = C.terraces.at[i];
    const n = rng.int(C.terraces.pieces[0], C.terraces.pieces[1]);
    for (let k = 0; k < n; k++) {
      const r = rng.range(C.terraces.shelfR[0], C.terraces.shelfR[1]);
      const p = seatOnRing(at - 0.06, at + 0.06, r, false);
      if (p) plant('sinter_shelf', p, r);
    }
  }
  const nPrism = rng.int(prismBand[0], prismBand[1]);
  for (let k = 0; k < nPrism; k++) {
    const r = rng.range(C.prism.r[0], C.prism.r[1]);
    const p = seatOnRing(C.terraces.at[0] - 0.08, C.terraces.at[0] + 0.1, r, false);
    if (p) plant('prism_pool', p, r);
  }
  // --- THE POOLS: sulphur pools through the bowl (contained hazards) ---
  const nPools = rng.int(poolBand[0], poolBand[1]);
  for (let k = 0; k < nPools; k++) {
    const r = rng.range(C.pools.r[0], C.pools.r[1]);
    const p = seatOnRing(0.3, 0.92, r, false);
    if (p) plant('sulphur_pool', p, r);
  }
  // --- THE SHELTER SEATS: sinter overhangs on the middle ring — under the
  //     heart vent's burn rain these are the dry seats (solid bodies: never
  //     on a door apron or a corridor) ---
  const shelters: Vec2[] = [];
  const nShelters = rng.int(shelterBand[0], shelterBand[1]);
  for (let k = 0; k < nShelters; k++) {
    const r = rng.range(C.shelters.r[0], C.shelters.r[1]);
    const p = seatOnRing(C.shelters.at[0], C.shelters.at[1], r, true);
    if (p) { plant('sinter_overhang', p, r); shelters.push(p); }
  }
  // --- steam + crust ---
  const nSteam = rng.int(C.steam.count[0], C.steam.count[1]);
  for (let k = 0; k < nSteam; k++) {
    const r = rng.range(C.steam.r[0], C.steam.r[1]);
    const p = seatOnRing(0.25, 0.95, r, false);
    if (p) plant('steam_pocket', p, r);
  }
  const nCrust = rng.int(C.crust.count[0], C.crust.count[1]);
  for (let k = 0; k < nCrust; k++) {
    const r = rng.range(C.crust.r[0], C.crust.r[1]);
    const p = seatOnRing(0.4, 0.95, r, false);
    if (p) plant('sulphur_crust', p, r);
  }

  // --- THE POCKETS: terrace POIs on the middle ring (spawners, caches and
  //     scenery nest here; the heart is never a POI) ---
  const pockets: Vec2[] = [];
  const nPockets = rng.int(pocketBand[0], pocketBand[1]);
  const th0 = rng.range(0, Math.PI * 2);
  for (let k = 0; k < nPockets; k++) {
    const th = th0 + (k / Math.max(1, nPockets)) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const f = C.pockets.at + rng.range(-0.06, 0.06);
    const p = vec(cx + Math.cos(th) * rimAt(th) * f, cy + Math.sin(th) * rimAt(th) * f);
    if (!onFloor(p.x, p.y) || !clearOfDoors(p, 20, false)) continue;
    pockets.push(p);
    ctx.pois.push(vec(p.x, p.y));
  }

  keepPlan(def.id, { cx, cy, rimAt, heart, ventCls, ventPeriod, ventPhase, pockets, shelters });

  // --- the tileset's own furniture — then PURGE THE BURIED (the lake's
  //     drowned-purge idiom: the scatter's gates speak doodad grounds, not
  //     grid regions, so the recipe closes the seam itself — whatever the
  //     scatter set down in the rock, or on the heart, leaves; the recipe's
  //     own pieces sit before the mark and stay) ---
  const mark = ctx.doodads.length;
  scatterDecoration(ctx, def);
  for (let k = ctx.doodads.length - 1; k >= mark; k--) {
    const d = ctx.doodads[k];
    if (!onFloor(d.pos.x, d.pos.y) || Math.hypot(d.pos.x - heart.x, d.pos.y - heart.y) < heartClear + d.radius) {
      ctx.doodads.splice(k, 1);
    }
  }
}
registerLayout('ventcauldron', ventcauldronLayout);
