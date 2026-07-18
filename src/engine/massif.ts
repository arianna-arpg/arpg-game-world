// ---------------------------------------------------------------------------
// THE MASSIF FABRIC — open country that also says NO.
//
// The generation gamut ran from pure openness (plains/expanse/parkland: convex
// floors, small solids) to carved claustrophobia (thicket/flesh/winding: solid
// negative space threaded by lanes) — with nothing between. This module is the
// MIXTURE archetype: a wide-open zone studded with LARGE impassable interior
// bodies — noise-lobed crag blobs, plopped scarp slabs, short cliff ridges,
// walled courts with a mouth — so the field plays open while the way across is
// a negotiation. The D2 Act-1 / PoE-field read: you see the country, you walk
// AROUND its bones.
//
// Everything is data, three open registries deep:
//   · MASS SHAPES  (registerMassShape) — silhouette painters over genkit masks
//     (blob / slab / ridge / chain / court ship built-in). Each declares its
//     bounding REACH and clamps its paint inside it, so the spacing law below
//     is enforceable by construction, whatever noise the shape rolls.
//   · MASS KINDS   (registerMassKind) — what a body IS: the REGISTERED REGION
//     it paints (world/regions.ts rows carry collision, shot/sight policy,
//     pathing price and the whole drawn look — a crag stops arrows, a
//     hedgewall eats sight but not bolts, a drystone fold is a waist-high
//     parapet you duel across), plus skirt/crest dressing rows and court
//     mouth counts. Engine ships the reference vocabulary (tor/bluff/fold);
//     content packs register richer kinds in src/data/massifs.ts.
//   · The 'massif' LAYOUT RECIPE — every dial a layoutParam (spec ▷ tileset ▷
//     biome, the recipe discipline), so one recipe serves stone downs, hedge
//     bocage, ruin fields, mesa country… without forking.
//
// THE WEAVE LAW (why you can never get stuck): mass seats keep laneW of open
// ground between BOUNDING circles (and portalClear off every portal), so the
// open field stays one navigable weave by construction; then healMassifWeave
// walks the painted truth — stray sealed pockets up to swallowCells FUSE into
// the mass that trapped them (no dead floor for spawns/loot), anything larger
// re-OPENS at its natural pinch (a BFS through the wall finds the thinnest
// crossing — the carve reads as a broken pass, not a random tunnel). The
// universal reachability invariant + genqa's reachable/portal checks then
// hold as belt-and-suspenders, not as the mechanism.
//
// Docs: docs/engine/massif.md · Probe: balance/probe_massif.ts
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import type { Rng } from '../core/rng';
import type { ZoneDef } from '../data/zones';
import { GridWalkField } from '../world/gridWalk';
import { regionKind } from '../world/regions';
import {
  ensureGrid, layoutParam, registerLayout, scatterDecoration,
  type DoodadKind, type GenCtx,
} from './levelgen';
import { GEN_CELL, Mask, band, bearingNoise, disc, paintRegion, radial, wanderPath } from './genkit';

// --- CONFIG ------------------------------------------------------------------

/** Framework knobs — every one overridable per zone via the matching
 *  layoutParam (massifSizeR, massifCoverage, …), so these are the REFERENCE
 *  dials, never magic inlined anywhere. */
export const MASSIF_CFG = {
  /** Base-radius band a mass rolls (px). The shape's reach multiplies this
   *  into the true bounding radius. */
  sizeR: [170, 320] as [number, number],
  /** Fraction of the arena the bodies aim to cover (rolled once per zone).
   *  ~0.18 reads as D2 Act-1 density: country first, bones everywhere. */
  coverage: [0.13, 0.22] as [number, number],
  /** GUARANTEED open weave between any two bodies' bounding circles, and the
   *  half of it reserved beside compositions/fixtures (px). The lane the
   *  player, packs, and the fuse of the whole zone breathe through. */
  laneW: 110,
  /** No mass bound may sit closer than this to a portal — mouths always open
   *  onto walkable country (the parkland idiom, scaled to region masses). */
  portalClear: 250,
  /** Hard ceiling on bodies per zone (coverage usually stops first). */
  maxMasses: 11,
  /** Placement dart budget. Rejections are cheap; the budget bounds worst-
   *  case draws so generation cost stays flat. */
  placeTries: 90,
  /** Default radial lobe amplitude (fraction of r) for noise-lobed shapes. */
  lobe: 0.34,
  /** Court-shape mouth count band when the kind doesn't declare its own. */
  mouths: [1, 2] as [number, number],
  /** healMassifWeave: sealed pockets AT/UNDER this many cells fuse into the
   *  mass that trapped them; larger ones get their pinch re-opened. ~26 cells
   *  at 30px ≈ a 150px-wide nook — too small to be a place, big enough to
   *  strand a spawn. */
  swallowCells: 26,
  /** healMassifWeave relabel passes (each pass swallows + carves everything
   *  it found; one is almost always enough). */
  healMaxIter: 6,
  /** Pinch re-open corridor half-width (floored to the walk cell). */
  healHalfW: 48,
  /** Dressing cadence defaults (per-kind overrides on MassKindDef). */
  skirtChance: 0.34,
  skirtSpacing: 56,
  crestChance: 0.2,
  crestSpacing: 92,
} as const;

// --- MASS SHAPES -------------------------------------------------------------

/** What a painter may hand back: courts report their interior (the carver
 *  turns it into a POI so the reachability net guards the way in). */
export interface MassShapeResult { interior?: Vec2 }

/** Per-paint options every shape receives (all resolved by the carver). */
export interface MassShapeOpts {
  /** Radial lobe amplitude, fraction of r (kind ▷ layoutParam ▷ cfg). */
  lobe: number;
  /** Seed for this body's bearing/edge noise (drawn once from the layout
   *  stream — the noise itself never draws). */
  seed: number;
  /** The zone's weave lane (court mouths size themselves off it). */
  laneW: number;
  /** Court mouth count band (kind ▷ cfg). */
  mouths: [number, number];
}

export interface MassShapeDef {
  /** OR the silhouette into `m` around `at` with base radius `r`. MUST keep
   *  every painted cell within `r × reach` of `at` — the spacing law measures
   *  bounding circles, so an unclamped lobe would quietly break the lane
   *  guarantee. Draw from `rng` freely (the layout stream). */
  paint: (m: Mask, at: Vec2, r: number, rng: Rng, o: MassShapeOpts) => MassShapeResult | void;
  /** Bounding multiple of r the spacing law measures with (see paint). */
  reach: number;
}

const MASS_SHAPES: Record<string, MassShapeDef> = {};

export function registerMassShape(id: string, def: MassShapeDef): void {
  if (MASS_SHAPES[id]) console.warn(`[massif] re-registering shape '${id}' — overriding`);
  MASS_SHAPES[id] = def;
}

export function massShapeIds(): string[] { return Object.keys(MASS_SHAPES); }

const warnedShapes = new Set<string>();
export function massShapeOf(id: string): MassShapeDef {
  const hit = MASS_SHAPES[id];
  if (hit) return hit;
  if (!warnedShapes.has(id)) {
    warnedShapes.add(id);
    console.warn(`[massif] unknown mass shape '${id}' — falling back to 'blob'`);
  }
  return MASS_SHAPES.blob;
}

// BLOB — the knuckled outcrop: a disc whose rim breathes on seamless bearing
// noise. The default silhouette; reads as one weathered body from any side.
registerMassShape('blob', {
  reach: 1.45,
  paint: (m, at, r, _rng, o) => {
    const cap = r * 1.42;
    radial(m, at.x, at.y, a => Math.min(cap, r * (1 + bearingNoise(a, o.lobe, o.seed))));
  },
});

// SLAB — the D2 "big rectangle plopped in the way": a rotated block silhouette
// with a noisy edge, via a rectangle-radius bearing function (crisp flanks,
// ragged corners). Ruin foundations, scarp tables, sheared mesa stubs.
registerMassShape('slab', {
  reach: 1.6,
  paint: (m, at, r, rng, o) => {
    const rot = rng.range(0, Math.PI * 2);
    const aspect = rng.range(0.45, 0.78);
    const a = r * 1.12, b = r * 1.12 * aspect;
    const cap = r * 1.55;
    radial(m, at.x, at.y, ang => {
      const t = ang - rot;
      const ca = Math.abs(Math.cos(t)), sa = Math.abs(Math.sin(t));
      const rect = Math.min(ca > 1e-4 ? a / ca : Infinity, sa > 1e-4 ? b / sa : Infinity);
      return Math.min(cap, rect * (1 + bearingNoise(ang, o.lobe * 0.5, o.seed)));
    });
  },
});

// RIDGE — a SHORT cliff line (never zone-spanning; long marching ridges are
// the dunefield's business): a wandering band through the seat, the local
// "walk around the spur" moment.
registerMassShape('ridge', {
  reach: 1.85,
  paint: (m, at, r, rng, _o) => {
    const bearing = rng.range(0, Math.PI * 2);
    const half = r * 1.25;
    const from = vec(at.x - Math.cos(bearing) * half, at.y - Math.sin(bearing) * half);
    const to = vec(at.x + Math.cos(bearing) * half, at.y + Math.sin(bearing) * half);
    const pts = wanderPath(rng, from, to, { step: 120, wobble: r * 0.2, bowFrac: 0.16 });
    band(m, pts, r * rng.range(0.34, 0.44));
  },
});

// CHAIN — several lobes strung along one bearing, merged into a single long
// body (an outcrop archipelago fused at the shoulders).
registerMassShape('chain', {
  reach: 1.85,
  paint: (m, at, r, rng, o) => {
    const bearing = rng.range(0, Math.PI * 2);
    const k = rng.int(2, 4);
    for (let i = 0; i < k; i++) {
      const t = k === 1 ? 0 : (i / (k - 1)) * 2 - 1; // -1..1 along the bearing
      const off = t * r * 0.82 + rng.range(-0.1, 0.1) * r;
      const cx = at.x + Math.cos(bearing) * off, cy = at.y + Math.sin(bearing) * off;
      const sub = r * rng.range(0.5, 0.72);
      const cap = r * 0.98;
      const seed = (o.seed + i * 977) >>> 0;
      radial(m, cx, cy, a => Math.min(cap, sub * (1 + bearingNoise(a, o.lobe * 0.8, seed))));
    }
  },
});

// COURT — the walled enclosure with a way in: a lobed annulus punched by
// 1-2 MOUTHS (sized off the weave lane AND the local ring thickness, so the
// punch always goes through). The interior is reported so the carver can make
// it a POI — the reachability net then guards the mouth for free.
registerMassShape('court', {
  reach: 1.5,
  paint: (m, at, r, rng, o) => {
    const rOf = (a: number): number =>
      Math.min(r * 1.42, r * (1 + bearingNoise(a, o.lobe * 0.55, o.seed)));
    const outer = m.like();
    radial(outer, at.x, at.y, rOf);
    const inner = m.like();
    radial(inner, at.x, at.y, a => rOf(a) * 0.6);
    outer.subtract(inner);
    const mouths = rng.int(o.mouths[0], o.mouths[1]);
    const a0 = rng.range(0, Math.PI * 2);
    for (let i = 0; i < mouths; i++) {
      const a = a0 + (i / Math.max(1, mouths)) * Math.PI * 2 + rng.range(-0.4, 0.4);
      const rr = rOf(a);
      const hole = m.like();
      // Centered mid-ring, radius ≥ 45% of the LOCAL outer radius: spans the
      // whole [0.6·rr, rr] band whatever the noise rolled — a mouth never
      // half-punches into a dead-end alcove.
      disc(hole, at.x + Math.cos(a) * rr * 0.8, at.y + Math.sin(a) * rr * 0.8,
        Math.max(o.laneW * 0.55, rr * 0.45));
      outer.subtract(hole);
    }
    m.union(outer);
    return { interior: vec(at.x, at.y) };
  },
});

// --- MASS KINDS --------------------------------------------------------------

/** One weighted dressing row (skirt at the foot, crest on the crown). */
export interface MassDressRow {
  kind: DoodadKind;
  weight: number;
  radius: [number, number];
}

/** What a mass IS — the open vocabulary content registers against. */
export interface MassKindDef {
  id: string;
  /** The REGISTERED region kind the body paints (world/regions.ts): collision,
   *  shot/sight policy and the whole drawn look ride the region row — this
   *  fabric adds no second truth. Unregistered ids warn once and paint
   *  'wall'. */
  region: string;
  /** Silhouettes this kind rolls among (weighted, from the shape registry). */
  shapes: { shape: string; weight: number }[];
  /** Radial lobe amplitude override (fraction of r). */
  lobe?: number;
  /** Court mouth count band (court-shaped kinds; default MASSIF_CFG.mouths). */
  mouths?: [number, number];
  /** FOOT dressing: banded on open ground hugging the rim (never inside the
   *  guaranteed weave between two bodies — the carver keeps the lane law). */
  skirt?: MassDressRow[];
  skirtChance?: number;
  skirtSpacing?: number;
  /** CROWN dressing: inert art ON the body (the region is the collision
   *  truth — dune_crest's lesson). A see-over kind (parapet-class region)
   *  should carry NO crest, or the promise of sight across it breaks. */
  crest?: MassDressRow[];
  crestChance?: number;
  crestSpacing?: number;
  /** Court interiors become POIs (spawn/loot anchors + reachability-guarded).
   *  Default true; opt out for purely scenic rings. */
  poiInterior?: boolean;
}

const MASS_KINDS: Record<string, MassKindDef> = {};

export function registerMassKind(def: MassKindDef): void {
  if (MASS_KINDS[def.id]) console.warn(`[massif] re-registering mass kind '${def.id}' — overriding`);
  MASS_KINDS[def.id] = def;
}

export function massKindIds(): string[] { return Object.keys(MASS_KINDS); }

const warnedKinds = new Set<string>();
export function massKindOf(id: string): MassKindDef {
  const hit = MASS_KINDS[id];
  if (hit) return hit;
  if (!warnedKinds.has(id)) {
    warnedKinds.add(id);
    console.warn(`[massif] unknown mass kind '${id}' — falling back to 'tor'`);
  }
  return MASS_KINDS.tor;
}

const warnedRegions = new Set<string>();
function regionIdOf(kind: MassKindDef): string {
  if (regionKind(kind.region)) return kind.region;
  if (!warnedRegions.has(kind.region)) {
    warnedRegions.add(kind.region);
    console.warn(`[massif] mass kind '${kind.id}' names unregistered region '${kind.region}' — painting 'wall'`);
  }
  return 'wall';
}

// --- THE CARVER --------------------------------------------------------------

/** One carved body, as the recipe (and probes) see it. */
export interface CarvedMass {
  kind: string;
  shape: string;
  at: Vec2;
  r: number;
  /** Bounding radius (r × shape reach) the spacing law measured with. */
  bound: number;
  interior?: Vec2;
}

interface PlacedMass { cm: CarvedMass; body: Mask }

function pickWeighted<T extends { weight: number }>(rng: Rng, rows: readonly T[]): T {
  const total = rows.reduce((a, m) => a + m.weight, 0);
  let roll = rng.range(0, total);
  for (const m of rows) { roll -= m.weight; if (roll <= 0) return m; }
  return rows[rows.length - 1];
}

/** Opt-in seat probe (layoutParam `massifSeatGround`): the dart's CORE must
 *  stand on WALKABLE ground — the cloud-isle countries (the High Bastion)
 *  reject the open-sky darts a land-locked zone never rolls (the formation
 *  siteWalk law at mass scale). The probe rings the BASE radius (not the
 *  bound: a chain's bound is a long march, not a disc — bound-ringing made
 *  high-reach shapes unseatable on any real isle) and tolerates 2 of 8
 *  points off-cloud: the bulk seats on ground, while a lobe or a chain's
 *  tail may still prow past the rim — a bastion brow over the void is the
 *  look; a bastion floating in it is a bug. Draw-free: rejections spend
 *  the dart, never shift the stream. */
function seatOnWalkable(grid: GridWalkField, at: Vec2, r: number): boolean {
  if (!grid.isWalkable(at.x, at.y)) return false;
  const pr = r * 0.9;
  let off = 0;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    if (!grid.isWalkable(at.x + Math.cos(a) * pr, at.y + Math.sin(a) * pr) && ++off > 1) return false;
  }
  return true;
}

/** The reservation probe (the layoutRecipes idiom, local on purpose —
 *  reservations are circles OR rects). */
function resHits(ctx: GenCtx, x: number, y: number, r: number): boolean {
  for (const res of ctx.reserved) {
    if ('pos' in res) {
      const dx = x - res.pos.x, dy = y - res.pos.y;
      const reach = res.radius + r;
      if (dx * dx + dy * dy < reach * reach) return true;
    } else {
      const m = (res.margin ?? 0) + r;
      if (x > res.rect.x - m && x < res.rect.x + res.rect.w + m
        && y > res.rect.y - m && y < res.rect.y + res.rect.h + m) return true;
    }
  }
  return false;
}

/** Default mix — the engine's reference country (stone downs). Content packs
 *  point massifMasses at their own registered kinds. */
const DEFAULT_MIX: { kind: string; weight: number }[] = [
  { kind: 'tor', weight: 3 }, { kind: 'bluff', weight: 2 }, { kind: 'fold', weight: 1 },
];

/**
 * Carve the zone's mass bodies into the walk grid — THE fabric entry, callable
 * by any recipe (the 'massif' layout below is just ensureGrid + this +
 * scatter). Reads every dial from layoutParams; guarantees the weave law
 * (spacing by construction, healMassifWeave for whatever the noise still
 * pinched); dresses skirts/crests off the painted truth. Deterministic from
 * the layout stream + def.seed-salted shape noise.
 */
export function carveMassifs(ctx: GenCtx, def: ZoneDef): CarvedMass[] {
  const { rng, arena } = ctx;
  const grid = ensureGrid(ctx);

  const mix = layoutParam<{ kind: string; weight: number }[]>(def, 'massifMasses', DEFAULT_MIX);
  const sizeR = layoutParam<[number, number]>(def, 'massifSizeR', MASSIF_CFG.sizeR);
  const coverBand = layoutParam<[number, number]>(def, 'massifCoverage', MASSIF_CFG.coverage);
  const laneW = layoutParam<number>(def, 'massifLaneW', MASSIF_CFG.laneW);
  const portalClear = layoutParam<number>(def, 'massifPortalClear', MASSIF_CFG.portalClear);
  const maxMasses = layoutParam<number>(def, 'massifMaxMasses', MASSIF_CFG.maxMasses);
  const lobe = layoutParam<number>(def, 'massifLobe', MASSIF_CFG.lobe);
  const seatGround = layoutParam<boolean>(def, 'massifSeatGround', false);
  // Dart budget as a dial: a mostly-void country burns most darts on sky and
  // seat rejections — it buys more tries instead of shipping empty fields.
  const placeTries = layoutParam<number>(def, 'massifPlaceTries', MASSIF_CFG.placeTries);

  const portals = [ctx.entry, ...ctx.exits];
  const targetCover = rng.range(coverBand[0], coverBand[1]) * arena.w * arena.h;

  const placed: PlacedMass[] = [];
  let covered = 0;
  for (let t = 0; t < placeTries; t++) {
    if (covered >= targetCover || placed.length >= maxMasses) break;
    // Fixed per-try draw shape (r, x, y, kind, shape): rejections change which
    // darts land, never how the stream advances past a landed one.
    const r = rng.range(sizeR[0], sizeR[1]);
    const inset = Math.max(90, r * 0.35); // bodies may bleed off the border — pockets heal
    const at = vec(
      rng.range(inset, Math.max(inset + 1, arena.w - inset)),
      rng.range(inset, Math.max(inset + 1, arena.h - inset)));
    const kind = massKindOf(pickWeighted(rng, mix).kind);
    const shapeId = pickWeighted(rng, kind.shapes).shape;
    const shape = massShapeOf(shapeId);
    const bound = r * shape.reach;
    if (portals.some(p => Math.hypot(p.x - at.x, p.y - at.y) < portalClear + bound)) continue;
    if (resHits(ctx, at.x, at.y, bound + laneW / 2)) continue;
    if (placed.some(m => Math.hypot(m.cm.at.x - at.x, m.cm.at.y - at.y) < m.cm.bound + bound + laneW)) continue;
    if (seatGround && !seatOnWalkable(grid, at, r)) continue;

    const seed = rng.int(0, 0x7fffffff);
    const body = Mask.forRect(0, 0, arena.w, arena.h);
    const res = shape.paint(body, at, r, rng, {
      lobe: kind.lobe ?? lobe, seed, laneW, mouths: kind.mouths ?? MASSIF_CFG.mouths,
    }) || {};
    paintRegion(grid, body, regionIdOf(kind));
    covered += body.count() * GEN_CELL * GEN_CELL;

    const cm: CarvedMass = { kind: kind.id, shape: shapeId, at, r, bound, interior: res.interior };
    placed.push({ cm, body });
    // A court's interior is a PLACE: a POI joins the spawn/loot anchors AND
    // the universal reachability invariant's required points — the mouth (or
    // a rescue breach through the ring) is guaranteed from here on.
    if (res.interior && kind.poiInterior !== false) ctx.pois.push(vec(res.interior.x, res.interior.y));
  }

  healMassifWeave(ctx, grid, laneW);
  if (!ctx.lite) dressMasses(ctx, grid, placed, laneW);
  return placed.map(p => p.cm);
}

// --- THE WEAVE HEAL ----------------------------------------------------------

/**
 * Make the walkable floor ONE component again, whatever the painted bodies
 * pinched off. Small sealed pockets (≤ swallowCells) FUSE into the mass that
 * trapped them (painted with the majority adjacent wall kind — no dead floor
 * behind the crag for a spawn to strand in); larger ones re-OPEN at their
 * natural pinch: a BFS from the pocket THROUGH the wall to the main component
 * finds the thinnest crossing, and the corridor is carved along that path —
 * a broken pass where the bodies almost met, never a random tunnel. Draw-free
 * (no rng): zones that never pinch are byte-identical.
 */
export function healMassifWeave(ctx: GenCtx, grid: GridWalkField, laneW: number): void {
  const cols = grid.cols, rows = grid.rows, cs = grid.cell;
  const n = cols * rows;
  const label = new Int32Array(n);
  const sizes: number[] = [];
  const q: number[] = [];

  const cellOf = (p: Vec2): number => {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(p.x / cs)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(p.y / cs)));
    return cy * cols + cx;
  };
  const centerOf = (c: number): Vec2 =>
    vec((c % cols + 0.5) * cs, (Math.floor(c / cols) + 0.5) * cs);

  for (let iter = 0; iter < MASSIF_CFG.healMaxIter; iter++) {
    // Label walkable components.
    label.fill(-1); sizes.length = 0;
    for (let s = 0; s < n; s++) {
      if (grid.mask[s] !== 1 || label[s] >= 0) continue;
      const id = sizes.length;
      let size = 0;
      q.length = 0; q.push(s); label[s] = id;
      for (let head = 0; head < q.length; head++) {
        const c = q[head]; size++;
        const cx = c % cols, cy = Math.floor(c / cols);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const nc = ny * cols + nx;
          if (grid.mask[nc] !== 1 || label[nc] >= 0) continue;
          label[nc] = id; q.push(nc);
        }
      }
      sizes.push(size);
    }
    if (sizes.length <= 1) return;
    const main = label[cellOf(grid.snapToWalkable(vec(ctx.entry.x, ctx.entry.y)))];
    if (main < 0) return; // nothing walkable at all — not this fabric's day

    let acted = false;
    for (let comp = 0; comp < sizes.length; comp++) {
      if (comp === main) continue;
      if (sizes[comp] <= MASSIF_CFG.swallowCells) {
        // SWALLOW: tally the pocket's adjacent wall kinds, fuse it into the
        // majority one (a nook behind the crag becomes crag — seamless).
        const tally = new Map<string, number>();
        for (let c = 0; c < n; c++) {
          if (label[c] !== comp) continue;
          const cx = c % cols, cy = Math.floor(c / cols);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            if (grid.mask[ny * cols + nx] === 1) continue;
            const k = grid.regionAt((nx + 0.5) * cs, (ny + 0.5) * cs);
            tally.set(k, (tally.get(k) ?? 0) + 1);
          }
        }
        let fuse = 'wall', best = -1;
        for (const [k, v] of tally) if (v > best) { best = v; fuse = k; }
        for (let c = 0; c < n; c++) {
          if (label[c] !== comp) continue;
          const p = centerOf(c);
          grid.fillRegion(p.x - cs / 2 + 1, p.y - cs / 2 + 1, p.x + cs / 2 - 1, p.y + cs / 2 - 1, fuse);
        }
        acted = true;
      } else {
        // RE-OPEN: BFS from the whole pocket through ANY cells to the first
        // main-component cell — the shortest wall crossing IS the pinch.
        const dist = new Int32Array(n).fill(-1);
        const parent = new Int32Array(n).fill(-1);
        q.length = 0;
        for (let c = 0; c < n; c++) if (label[c] === comp) { dist[c] = 0; q.push(c); }
        let hit = -1;
        for (let head = 0; head < q.length && hit < 0; head++) {
          const c = q[head];
          const cx = c % cols, cy = Math.floor(c / cols);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            const nc = ny * cols + nx;
            if (dist[nc] >= 0) continue;
            dist[nc] = dist[c] + 1; parent[nc] = c;
            if (label[nc] === main) { hit = nc; break; }
            q.push(nc);
          }
        }
        if (hit < 0) continue; // grid-spanning oddity — the invariant net owns it
        const halfW = Math.max(cs * 1.1, Math.min(MASSIF_CFG.healHalfW, laneW * 0.45));
        let cur = hit;
        while (parent[cur] >= 0) {
          const a = centerOf(cur), b = centerOf(parent[cur]);
          grid.carveCorridor(a.x, a.y, b.x, b.y, halfW);
          cur = parent[cur];
        }
        acted = true;
      }
    }
    if (!acted) return;
  }
}

// --- DRESSING ----------------------------------------------------------------

/** Skirts at the foot, crests on the crown — read off the LIVE grid (a lane
 *  the heal carved through a body is never skirted shut again; a swallowed
 *  pocket is never dressed). Skirt pieces respect the lane law: nothing lands
 *  inside the guaranteed weave between two bodies. */
function dressMasses(ctx: GenCtx, grid: GridWalkField, placed: PlacedMass[], laneW: number): void {
  const { rng } = ctx;
  for (const { cm, body } of placed) {
    const kd = massKindOf(cm.kind);
    if (kd.skirt?.length) {
      const fringe = body.clone().grow(1).subtract(body);
      const done: Vec2[] = [];
      const spacing = kd.skirtSpacing ?? MASSIF_CFG.skirtSpacing;
      const chance = kd.skirtChance ?? MASSIF_CFG.skirtChance;
      fringe.forEach((cx, cy) => {
        const c = fringe.center(cx, cy);
        if (!grid.isWalkable(c.x, c.y)) return;
        // Outward normal from the LIVE blocked neighbors (the thicket-fringe
        // idiom): none blocked = the wall was healed away here — no skirt.
        let nx = 0, ny = 0;
        if (!grid.isWalkable(c.x - GEN_CELL, c.y)) nx += 1;
        if (!grid.isWalkable(c.x + GEN_CELL, c.y)) nx -= 1;
        if (!grid.isWalkable(c.x, c.y - GEN_CELL)) ny += 1;
        if (!grid.isWalkable(c.x, c.y + GEN_CELL)) ny -= 1;
        if (!nx && !ny) return;
        if (!rng.chance(chance)) return;
        if (done.some(p => Math.hypot(p.x - c.x, p.y - c.y) < spacing)) return;
        // THE LANE LAW at dress time: a foot boulder never eats the weave
        // between two bodies (the guaranteed laneW stays honest to the px).
        if (placed.some(o => o.cm !== cm
          && Math.hypot(o.cm.at.x - c.x, o.cm.at.y - c.y) < o.cm.bound + laneW * 0.8)) return;
        if (resHits(ctx, c.x, c.y, 20)) return;
        const row = pickWeighted(rng, kd.skirt!);
        done.push(vec(c.x, c.y));
        ctx.doodads.push({
          pos: vec(c.x + nx * 5, c.y + ny * 5),
          radius: rng.range(row.radius[0], row.radius[1]),
          kind: row.kind, rot: Math.atan2(ny, nx) + rng.range(-0.5, 0.5),
        });
      });
    }
    if (kd.crest?.length) {
      const crown = body.clone().erode(1);
      const done: Vec2[] = [];
      const spacing = kd.crestSpacing ?? MASSIF_CFG.crestSpacing;
      const chance = kd.crestChance ?? MASSIF_CFG.crestChance;
      crown.forEach((cx, cy) => {
        const c = crown.center(cx, cy);
        if (grid.isWalkable(c.x, c.y)) return; // a healed pass runs here now
        if (!rng.chance(chance)) return;
        if (done.some(p => Math.hypot(p.x - c.x, p.y - c.y) < spacing)) return;
        const row = pickWeighted(rng, kd.crest!);
        done.push(vec(c.x, c.y));
        ctx.doodads.push({
          pos: vec(c.x + rng.range(-8, 8), c.y + rng.range(-8, 8)),
          radius: rng.range(row.radius[0], row.radius[1]),
          kind: row.kind, rot: rng.range(0, Math.PI * 2),
        });
      });
    }
  }
}

// --- THE RECIPE --------------------------------------------------------------

/** MASSIF — wide-open country studded with large impassable bodies: the
 *  mixture archetype (see the module header). ensureGrid + carveMassifs +
 *  the per-exit belt + the tileset's own scatter (walk-gated into the open
 *  weave for free). */
function massifLayout(ctx: GenCtx, def: ZoneDef): void {
  const grid = ensureGrid(ctx);
  carveMassifs(ctx, def);
  // Belt-and-suspenders (the dunefield idiom): every exit stays walkable from
  // the entry whatever the dice rolled — the heal makes this a near no-op.
  for (const e of ctx.exits) {
    if (!grid.reachable(ctx.entry, e)) grid.carveCorridor(ctx.entry.x, ctx.entry.y, e.x, e.y, 34);
  }
  scatterDecoration(ctx, def);
}
registerLayout('massif', massifLayout);

// --- THE REFERENCE VOCABULARY -----------------------------------------------
// The engine's own three kinds — enough for the recipe to stand alone (genqa's
// bare-layout case) and the reference for content packs (src/data/massifs.ts
// registers the flavored country kinds: hedgewalls, ruin courts, mesa stubs…).
// Regions: 'crag' / 'drystone' ship in world/regions.ts beside the other
// terrain rows. Dressing uses core doodad kinds only.

// THE TOR — the moor's stone knuckles: lobed crag blobs and fused chains,
// boulder-skirted, spired. The default "big body in the way".
registerMassKind({
  id: 'tor',
  region: 'crag',
  shapes: [{ shape: 'blob', weight: 3 }, { shape: 'chain', weight: 2 }],
  skirt: [
    { kind: 'rock', weight: 3, radius: [16, 30] },
    { kind: 'scree', weight: 4, radius: [16, 28] },
  ],
  crest: [
    { kind: 'rock_spire', weight: 1, radius: [20, 32] },
    { kind: 'rock', weight: 2, radius: [16, 26] },
  ],
});

// THE BLUFF — plopped scarp tables and short cliff spurs: the D2 "rectangle
// in the field" and the walk-around ridge, scree at the foot, snags on top.
registerMassKind({
  id: 'bluff',
  region: 'crag',
  shapes: [{ shape: 'slab', weight: 2 }, { shape: 'ridge', weight: 3 }],
  skirt: [
    { kind: 'scree', weight: 3, radius: [18, 30] },
    { kind: 'rock', weight: 1, radius: [14, 24] },
  ],
  crest: [
    { kind: 'dead_tree', weight: 1, radius: [16, 24] },
    { kind: 'rock', weight: 2, radius: [16, 26] },
  ],
});

// THE FOLD — a drystone field-court with a mouth or two: waist-high walls
// (parapet policy: duel over them, walk around them), the interior a guarded
// prize. NO crest — the see-over promise is the kind's whole point.
registerMassKind({
  id: 'fold',
  region: 'drystone',
  shapes: [{ shape: 'court', weight: 1 }],
  mouths: [1, 2],
  skirt: [{ kind: 'scree', weight: 1, radius: [12, 20] }],
  skirtChance: 0.18,
});
