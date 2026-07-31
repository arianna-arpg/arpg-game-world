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
// Everything is data, four open registries deep:
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
//   · TENANT KINDS (registerTenantKind) — who HOLDS a court: a kind (or a
//     pool row) may author a weighted TENANT TABLE (MassKindDef.tenants) —
//     ONE occupancy draw per ring on a per-mass fork stream, resolving to a
//     registered occupant (garrison / stock / cache / vacant ship built-in,
//     all standing machinery; content composes richer ones by delegation).
//     A table REPLACES the kind's independent garrison/inner chances.
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
import { Rng } from '../core/rng';
import type { ZoneDef } from '../data/zones';
import { GridWalkField } from '../world/gridWalk';
import { patronFaction } from '../world/biomes';
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
  /** Body-count FLOOR (massifMinMasses): a zone whose dart budget dies below
   *  this many standing bodies re-arms the budget ONCE as a RESCUE pass with
   *  the rolled size relaxing toward rescueShrink — small walls seat where
   *  giants could not. A budgeted promise, never a loop: a zone that cannot
   *  seat the floor ships what it could stand. Clearance NEVER relaxes —
   *  laneW, portalClear, reservations and the ground seat are structural
   *  (healMassifWeave's contract rides them). 0 = no floor (the reference
   *  default: coverage and the budget rule, and the rescue never draws). */
  minMasses: 0,
  /** Placement dart budget. Rejections are cheap; the budget bounds worst-
   *  case draws so generation cost stays flat. */
  placeTries: 90,
  /** Rescue-pass size relaxation floor: the LAST rescue dart rolls the
   *  authored sizeR band scaled by this (the first re-rolls it at 1×, the
   *  ramp is linear). Measured on the bastion faces: bodies at ~0.5× the
   *  authored band seat reliably on cloud geometries where the full band
   *  starves (2026-07 sea-of-ramparts sweep). */
  rescueShrink: 0.45,
  /** Default radial lobe amplitude (fraction of r) for noise-lobed shapes. */
  lobe: 0.34,
  /** Court-shape mouth count band when the kind doesn't declare its own. */
  mouths: [1, 2] as [number, number],
  /** Dart border-inset FLOOR (px): bodies may bleed off the arena border
   *  (pockets heal), but a seat never lands closer than max(this, r×0.35)
   *  to it — the bleed reads as country running past the edge, never as a
   *  wall living entirely outside the arena. */
  insetMin: 90,
  /** GARRISON pack-size band when a kind's garrison spec doesn't name one
   *  (the structure-stamp default — levelgen's pre-inhabited POI law). */
  garrisonSize: [3, 5] as [number, number],
  /** INNER dressing cadence defaults (court floors — per-kind overrides on
   *  MassKindDef, the skirt/crest discipline). */
  innerChance: 0.45,
  innerSpacing: 60,
  /** CACHE-tenant defaults (the hoard knot — see TenantRow / the 'cache'
   *  tenant kind): containers per court + the knot's spread radius (px). */
  tenantCacheCount: [3, 6] as [number, number],
  tenantCacheSpread: 52,
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
  /** Court mouth count band (kind ▷ layoutParam ▷ cfg). */
  mouths: [number, number];
  /** Ring-interior fraction for annulus shapes (court/crescent): the inner
   *  rim sits at this fraction of the outer radius — small = thick fortress
   *  wall, large = thin garden ring. Absent = each shape's historical
   *  default (court 0.6, crescent 0.62), byte-identical. */
  ringInner?: number;
  /** Mouth-width multiplier for punched shapes (kind ▷ 1). The mouth still
   *  floors at the weave lane and spans the ring band — this widens a gate
   *  past the guarantee, never narrows it below. */
  mouthScale: number;
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
    // THE RING DIALS (kind-authored, see MassShapeOpts): default path keeps
    // the historical literals EXACTLY (0.6 ring → 0.8 seat / 0.45 band) so
    // dial-less kinds stay byte-identical; authored rings derive the seat as
    // the band's center and the punch as the band's span + margin, so the
    // never-half-punches law holds at ANY thickness.
    const ri = o.ringInner ?? 0.6;
    const mouthSeat = ri === 0.6 ? 0.8 : (1 + ri) / 2;
    const mouthBand = ri === 0.6 ? 0.45 : (1 - ri) * 1.125;
    const rOf = (a: number): number =>
      Math.min(r * 1.42, r * (1 + bearingNoise(a, o.lobe * 0.55, o.seed)));
    const outer = m.like();
    radial(outer, at.x, at.y, rOf);
    const inner = m.like();
    radial(inner, at.x, at.y, a => rOf(a) * ri);
    outer.subtract(inner);
    const mouths = rng.int(o.mouths[0], o.mouths[1]);
    const a0 = rng.range(0, Math.PI * 2);
    for (let i = 0; i < mouths; i++) {
      const a = a0 + (i / Math.max(1, mouths)) * Math.PI * 2 + rng.range(-0.4, 0.4);
      const rr = rOf(a);
      const hole = m.like();
      // Centered mid-ring, spanning the whole [ri·rr, rr] band whatever the
      // noise rolled — a mouth never half-punches into a dead-end alcove.
      // mouthScale widens the gate INSIDE the max: the lane floor is the
      // structural guarantee and no dial narrows a punch below it.
      disc(hole, at.x + Math.cos(a) * rr * mouthSeat, at.y + Math.sin(a) * rr * mouthSeat,
        Math.max(o.laneW * 0.55, rr * mouthBand * o.mouthScale));
      outer.subtract(hole);
    }
    m.union(outer);
    return { interior: vec(at.x, at.y) };
  },
});

// --- MASS KINDS --------------------------------------------------------------

/** One weighted dressing row (skirt at the foot, crest on the crown, inner
 *  on a court's floor). */
export interface MassDressRow {
  kind: DoodadKind;
  weight: number;
  radius: [number, number];
}

/** A court comes PRE-INHABITED: a faction guard pack posts at the interior —
 *  an ordinary ctx.garrisons row, so the reachability net guards the way in
 *  and the spawn side (world.ts faction-POI law) draws the pack from the
 *  faction's own roster. Rolled on a PER-MASS FORK of the body's own shape
 *  seed, never the layout stream: authoring a garrison changes garrisons and
 *  NOTHING else — the masses, the weave, and every dressing draw stay
 *  byte-identical (probe-pinned). Court-shaped kinds only (needs a reported
 *  interior); a garrison on a mouthless kind never fires. */
export interface MassGarrisonSpec {
  /** Per-court roll. */
  chance: number;
  /** Pack-size band (default MASSIF_CFG.garrisonSize). */
  size?: [number, number];
  /** Posting faction. ABSENT = the zone's PATRON (the biome's own power,
   *  world/biomes.ts) — a court kind never hardcodes who holds it; the same
   *  ruincourt garrisons gnolls in the waste and the dead in the graveland.
   *  A def with no biome (and no explicit faction) posts nobody. */
  faction?: string;
}

/** THE RING TENANTS — one weighted occupancy row (see MassKindDef.tenants):
 *  `kind` names a registered TENANT KIND (registerTenantKind below) and the
 *  rest is that kind's tailoring. The core four ship from standing machinery
 *  only — 'garrison' (the MassGarrisonSpec lane), 'stock' (the inner dress
 *  lane), 'cache' (a container knot through the same brittle/drop
 *  chokepoints), 'vacant' (nothing — the weighted breather). Content
 *  registers richer kinds and composes the core ones by delegation
 *  (tenantKindOf — data/massifs.ts's held_stock is the reference). */
export interface TenantRow {
  /** Registered tenant kind (unknown ids warn once and seat nothing). */
  kind: string;
  weight: number;
  /** GARRISON tailoring: pack-size band + posting faction (absent = the
   *  mass kind's own garrison spec, then the patron/framework defaults).
   *  No chance dial, on purpose — the table IS the occupancy roll. */
  size?: [number, number];
  faction?: string;
  /** STOCK / CACHE dress rows (absent = the mass kind's `inner` rows). */
  rows?: MassDressRow[];
  /** STOCK cadence (absent = the kind's innerChance/innerSpacing ▷ cfg). */
  chance?: number;
  spacing?: number;
  /** CACHE knot: containers per hoard (default MASSIF_CFG.tenantCacheCount). */
  count?: [number, number];
  /** The open door: future registrants (a shrine kind from the puzzle
   *  fabric's pass, a lair mouth from the lair fabric's…) read their own
   *  config here — this file never needs to learn their fields. */
  params?: Record<string, unknown>;
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
  /** KIND-DEFAULT base-radius band: bodies of this kind remap the zone's
   *  rolled size into this band (mesas run big, garden rings modest — in one
   *  pool). Row grain outranks it (MassPoolRow.sizeR); the remap is a pure
   *  affine map of the already-drawn roll, so it never moves the stream and
   *  the rescue ramp's shrink composes onto it. Absent = the zone band. */
  sizeR?: [number, number];
  /** Court mouth count band (court-shaped kinds; default the massifMouths
   *  layoutParam ▷ MASSIF_CFG.mouths). */
  mouths?: [number, number];
  /** Ring-interior fraction for annulus shapes (see MassShapeOpts.ringInner):
   *  thick fortress walls at 0.45, thin garden rings at 0.75. */
  ringInner?: number;
  /** Mouth-width multiplier (see MassShapeOpts.mouthScale; default 1). */
  mouthScale?: number;
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
  /** THE GARRISON: this kind's courts come pre-inhabited (see
   *  MassGarrisonSpec — patron-faction default, per-mass fork stream). */
  garrison?: MassGarrisonSpec;
  /** INNER dressing: rows dressed on a court's own FLOOR (the stocked ring —
   *  brittle urns and pots paying through the ordinary breakage/drop
   *  chokepoints; no chest doodad exists, on purpose). Dressed off the LIVE
   *  grid like skirt/crest, standing off the interior POI seat so the
   *  garrison's spawn scatter and the reachability promise keep their floor. */
  inner?: MassDressRow[];
  innerChance?: number;
  innerSpacing?: number;
  /** THE RING TENANTS: a weighted occupancy table — ONE draw per court on a
   *  per-mass fork stream (TENANT_SALT, the garrison fork law's sibling: the
   *  layout stream never moves, so the carve is byte-identical with the
   *  table present or absent), resolving to ONE registered tenant kind whose
   *  handler seats the occupant. Authoring a non-empty table REPLACES the
   *  kind's independent garrison/inner chances — the table IS the occupancy
   *  law; the garrison spec and inner rows remain as the handlers' defaults.
   *  Absent (or empty) = today's independent rolls, byte-identical. Courts
   *  only (needs a reported interior — the garrison's own rule). */
  tenants?: TenantRow[];
}

/** One weighted row of a zone's massifMasses pool. Beyond kind + weight, the
 *  row is the PER-ZONE TAILORING grain: its own size band, and `over` — a
 *  partial MassKindDef merged over the registered kind at carve time, so
 *  EVERY kind dial (mouths, dressing, garrison, ringInner…) is reachable per
 *  row without minting a sibling kind. Absent fields = the registered kind,
 *  byte-identical by construction (the merge adds no draws). */
export interface MassPoolRow {
  kind: string;
  weight: number;
  /** Per-row base-radius band (outranks MassKindDef.sizeR; same draw-free
   *  affine remap of the zone's rolled size). */
  sizeR?: [number, number];
  /** Per-row kind tailoring: merged over the registered def (id excepted —
   *  a row tailors a kind, never mints one). */
  over?: Partial<Omit<MassKindDef, 'id'>>;
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

interface PlacedMass {
  cm: CarvedMass;
  body: Mask;
  /** The RESOLVED kind def this body carved with (row `over` merged) — the
   *  one truth dressing reads, so per-row tailoring reaches skirts/crests/
   *  inner without a second registry lookup. */
  kd: MassKindDef;
  /** The body's own shape seed — the identity the garrison/tenant fork
   *  streams ride (never re-derivable from the layout stream later). */
  seed: number;
}

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
  // THE BEYOND RING: a body must leave some field around itself — a seat
  // that swallows its whole isle (a pantheon on a satellite) strands wall
  // over open sky. Two of four compass points past the silhouette must
  // still be ground.
  let open = 0;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    if (grid.isWalkable(at.x + Math.cos(a) * r * 1.7, at.y + Math.sin(a) * r * 1.7)) open++;
  }
  return open >= 2;
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
const DEFAULT_MIX: MassPoolRow[] = [
  { kind: 'tor', weight: 3 }, { kind: 'bluff', weight: 2 }, { kind: 'fold', weight: 1 },
];

/** The garrison roll's fork salt (XORed with the body's own shape seed):
 *  garrison chances ride a PER-MASS side stream so the layout stream never
 *  moves — see MassGarrisonSpec. */
const GARRISON_SALT = 0x6a7217;

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

  const mix = layoutParam<MassPoolRow[]>(def, 'massifMasses', DEFAULT_MIX);
  const sizeR = layoutParam<[number, number]>(def, 'massifSizeR', MASSIF_CFG.sizeR);
  const coverBand = layoutParam<[number, number]>(def, 'massifCoverage', MASSIF_CFG.coverage);
  const laneW = layoutParam<number>(def, 'massifLaneW', MASSIF_CFG.laneW);
  const portalClear = layoutParam<number>(def, 'massifPortalClear', MASSIF_CFG.portalClear);
  const maxMasses = layoutParam<number>(def, 'massifMaxMasses', MASSIF_CFG.maxMasses);
  const lobe = layoutParam<number>(def, 'massifLobe', MASSIF_CFG.lobe);
  const seatGround = layoutParam<boolean>(def, 'massifSeatGround', false);
  // Zone-level mouth band + dart inset floor + heal swallow threshold — the
  // last carve constants opened as dials (the 2026-07-30 audit; defaults are
  // the historical literals, absent = byte-identical).
  const mouthsDflt = layoutParam<[number, number]>(def, 'massifMouths', MASSIF_CFG.mouths);
  const insetMin = layoutParam<number>(def, 'massifInsetMin', MASSIF_CFG.insetMin);
  const swallowCells = layoutParam<number>(def, 'massifSwallowCells', MASSIF_CFG.swallowCells);
  // Dart budget as a dial: a mostly-void country burns most darts on sky and
  // seat rejections — it buys more tries instead of shipping empty fields.
  const placeTries = layoutParam<number>(def, 'massifPlaceTries', MASSIF_CFG.placeTries);
  // THE FLOOR (a count promise, not a coverage one — see MASSIF_CFG.minMasses;
  // clamped to the ceiling so the dials can never deadlock the rescue).
  const minMasses = Math.min(maxMasses,
    layoutParam<number>(def, 'massifMinMasses', MASSIF_CFG.minMasses));
  const rescueShrink = layoutParam<number>(def, 'massifRescueShrink', MASSIF_CFG.rescueShrink);

  const portals = [ctx.entry, ...ctx.exits];
  const targetCover = rng.range(coverBand[0], coverBand[1]) * arena.w * arena.h;

  const placed: PlacedMass[] = [];
  let covered = 0;
  // ONE DART, r rolled by the caller (rollLo/rollHi = the band it rolled
  // from): draw the rest of the fixed per-try shape (x, y, kind, shape),
  // test the structural laws, paint on a land. Rejections change which darts
  // land, never how the stream advances past a landed one.
  const dart = (r: number, rollLo: number, rollHi: number): void => {
    const inset = Math.max(insetMin, r * 0.35); // bodies may bleed off the border — pockets heal
    const at = vec(
      rng.range(inset, Math.max(inset + 1, arena.w - inset)),
      rng.range(inset, Math.max(inset + 1, arena.h - inset)));
    const row = pickWeighted(rng, mix);
    // THE ROW TAILORING: `over` merges the row's partial onto the registered
    // kind — every kind dial at per-zone-row grain, no sibling kind minted.
    // No `over` = the registered def itself (identical reads, no draws).
    const base = massKindOf(row.kind);
    const kd: MassKindDef = row.over ? { ...base, ...row.over } : base;
    // THE BAND REMAP (row ▷ kind ▷ zone), draw-free: the already-rolled r
    // maps affinely from the caller's roll band into the authored one, and
    // the rescue ramp's shrink carries through as the bands' ratio — a
    // rescued mesa shrinks exactly as a rescued tor does. Absent bands touch
    // nothing (not even arithmetic), so the stream AND the value are
    // byte-identical by construction.
    const band = row.sizeR ?? kd.sizeR;
    if (band) {
      const u = rollHi > rollLo ? (r - rollLo) / (rollHi - rollLo) : 0.5;
      const shrink = sizeR[1] > 0 ? rollHi / sizeR[1] : 1;
      r = (band[0] + u * (band[1] - band[0])) * shrink;
    }
    const shapeId = pickWeighted(rng, kd.shapes).shape;
    const shape = massShapeOf(shapeId);
    const bound = r * shape.reach;
    if (portals.some(p => Math.hypot(p.x - at.x, p.y - at.y) < portalClear + bound)) return;
    if (resHits(ctx, at.x, at.y, bound + laneW / 2)) return;
    if (placed.some(m => Math.hypot(m.cm.at.x - at.x, m.cm.at.y - at.y) < m.cm.bound + bound + laneW)) return;
    if (seatGround && !seatOnWalkable(grid, at, r)) return;

    const seed = rng.int(0, 0x7fffffff);
    const body = Mask.forRect(0, 0, arena.w, arena.h);
    const res = shape.paint(body, at, r, rng, {
      lobe: kd.lobe ?? lobe, seed, laneW, mouths: kd.mouths ?? mouthsDflt,
      ringInner: kd.ringInner, mouthScale: kd.mouthScale ?? 1,
    }) || {};
    paintRegion(grid, body, regionIdOf(kd));
    covered += body.count() * GEN_CELL * GEN_CELL;

    const cm: CarvedMass = { kind: kd.id, shape: shapeId, at, r, bound, interior: res.interior };
    placed.push({ cm, body, kd, seed });
    // A court's interior is a PLACE: a POI joins the spawn/loot anchors AND
    // the universal reachability invariant's required points — the mouth (or
    // a rescue breach through the ring) is guaranteed from here on.
    if (res.interior && kd.poiInterior !== false) ctx.pois.push(vec(res.interior.x, res.interior.y));
    // THE GARRISON (see MassGarrisonSpec): rolled on a fork of the body's
    // own shape seed — the layout stream NEVER moves, so authoring a
    // garrison perturbs garrisons alone (probe-pinned). The row rides the
    // pre-inhabited-POI machinery: reachability guards it, the spawn side
    // posts the pack from the faction's roster. A kind with a TENANT TABLE
    // hands occupancy to the table instead (seatTenants — the independent
    // chance stands down; the table IS the occupancy law).
    if (res.interior && kd.garrison && !kd.tenants?.length) {
      const g = kd.garrison;
      if (new Rng((seed ^ GARRISON_SALT) >>> 0).chance(g.chance)) {
        const faction = g.faction ?? patronFaction(def.biome) ?? undefined;
        if (faction) {
          ctx.garrisons.push({
            pos: vec(res.interior.x, res.interior.y),
            faction, size: g.size ?? MASSIF_CFG.garrisonSize,
          });
        }
      }
    }
  };
  for (let t = 0; t < placeTries; t++) {
    if (covered >= targetCover || placed.length >= maxMasses) break;
    dart(rng.range(sizeR[0], sizeR[1]), sizeR[0], sizeR[1]);
  }

  // THE RESCUE PASS: an under-filled zone re-arms the same dart budget once,
  // the rolled size ramping from the authored band down to rescueShrink × it
  // by HALF the budget, then holding there — the early darts re-roll the
  // authored look, the back half is guaranteed small (small walls seat where
  // giants could not — measured, not hoped: the bastion cloud at half-band
  // never failed to stand 6, while a full-length ramp still shipped 4s).
  // Every structural law above holds verbatim — only r relaxes. Floor-less
  // zones (the default) never reach this line, so their streams are
  // byte-identical.
  if (placed.length < minMasses) {
    const rampLen = Math.max(1, Math.floor(placeTries / 2));
    for (let t = 0; t < placeTries && placed.length < minMasses; t++) {
      const shrink = 1 - (1 - rescueShrink) * Math.min(1, t / rampLen);
      dart(rng.range(sizeR[0] * shrink, sizeR[1] * shrink), sizeR[0] * shrink, sizeR[1] * shrink);
    }
  }

  healMassifWeave(ctx, grid, laneW, swallowCells);
  // THE RING TENANTS (post-heal, so dress handlers read the healed floor).
  // Never lite-gated: the DRAW and any garrison must agree between a lite
  // and a full mint of the same seed; dress handlers stand down on their
  // own (the dressMasses law), and every draw rides per-mass forks — the
  // layout stream below is untouched either way.
  seatTenants(ctx, def, grid, placed);
  if (!ctx.lite) dressMasses(ctx, grid, placed, laneW);
  return placed.map(p => p.cm);
}

// --- THE RING TENANTS --------------------------------------------------------
// Occupancy as ONE weighted draw per court (MassKindDef.tenants) resolving to
// a registered TENANT KIND — "this ring is EITHER garrisoned OR stocked OR a
// hoard OR empty, weighted" becomes authorable data, where the standing
// independent chances could only SUM. The registry is open (the mass
// shape/kind pattern): the core four below ride standing machinery only, and
// later fabrics seat their own occupants (a shrine kind from the puzzle
// fabric's pass, a lair mouth from the lair fabric's…) without this file
// learning their names. THE FORK LAW holds throughout: the draw rides a
// per-mass fork of the body's own shape seed (TENANT_SALT) and the winning
// handler continues on the SAME forked stream — the layout stream never
// moves, so a table perturbs occupants alone and the carve (masses, weave,
// every skirt/crest draw) is byte-identical with it on or off (probe rig K).

/** One tenant handler: seat `row`'s occupant on `mass` (kind resolved with
 *  any row `over` merged; the court's interior reported). `rng` is the
 *  per-mass fork — draw freely, the layout stream is elsewhere. Handlers
 *  that lay dress must stand down under ctx.lite (the dressMasses law);
 *  occupancy rows (garrisons) seat regardless, so a lite mint and a full
 *  mint agree on who holds the ring. */
export type TenantHandler = (
  ctx: GenCtx, def: ZoneDef, grid: GridWalkField,
  mass: CarvedMass, rng: Rng, kd: MassKindDef, row: TenantRow,
) => void;

const TENANT_KINDS: Record<string, TenantHandler> = {};

export function registerTenantKind(id: string, handler: TenantHandler): void {
  if (TENANT_KINDS[id]) console.warn(`[massif] re-registering tenant kind '${id}' — overriding`);
  TENANT_KINDS[id] = handler;
}

export function tenantKindIds(): string[] { return Object.keys(TENANT_KINDS); }

/** Registry read — the composition seam: a content kind delegates to the
 *  core ones (one draw, one occupant CONCEPT, several standing handlers —
 *  data/massifs.ts's held_stock is the reference) instead of re-implementing
 *  their machinery. */
export function tenantKindOf(id: string): TenantHandler | undefined { return TENANT_KINDS[id]; }

/** The tenant draw's fork salt (XORed with the body's own shape seed —
 *  GARRISON_SALT's sibling): fork identity, ruled fixed — changing it
 *  re-rolls every tenancy in the world for zero expressiveness. */
const TENANT_SALT = 0x51e4d3;

const warnedTenants = new Set<string>();

/** ONE draw per court, post-heal (dress handlers read the healed live grid,
 *  exactly as the inner lane always has): resolve the winning row off the
 *  fork, hand its handler the same forked stream. Empty tables are no law
 *  at all (the independent lanes stand — see MassKindDef.tenants). */
function seatTenants(ctx: GenCtx, def: ZoneDef, grid: GridWalkField, placed: PlacedMass[]): void {
  for (const { cm, kd, seed } of placed) {
    if (!kd.tenants?.length || !cm.interior) continue;
    const rng = new Rng((seed ^ TENANT_SALT) >>> 0);
    const row = pickWeighted(rng, kd.tenants);
    const handler = TENANT_KINDS[row.kind];
    if (!handler) {
      if (!warnedTenants.has(row.kind)) {
        warnedTenants.add(row.kind);
        console.warn(`[massif] unknown tenant kind '${row.kind}' — seating nothing`);
      }
      continue;
    }
    handler(ctx, def, grid, cm, rng, kd, row);
  }
}

// VACANT — nothing, on purpose: the weighted breather that keeps a court
// country from feeling stamped. Registered like any other kind so tables
// name it and the draw stays registry-pure (no id special-cased anywhere).
registerTenantKind('vacant', () => {});

// GARRISON — the MassGarrisonSpec lane, table-decided: the pack posts at the
// interior through the same ctx.garrisons row (reachability guards it, the
// spawn side draws the faction's own roster), the kind's garrison spec and
// the patron default supplying whatever the row doesn't. No chance roll —
// the table already decided occupancy.
registerTenantKind('garrison', (ctx, def, _grid, cm, _rng, kd, row) => {
  if (!cm.interior) return;
  const g = kd.garrison;
  const faction = row.faction ?? g?.faction ?? patronFaction(def.biome) ?? undefined;
  if (!faction) return;
  ctx.garrisons.push({
    pos: vec(cm.interior.x, cm.interior.y),
    faction, size: row.size ?? g?.size ?? MASSIF_CFG.garrisonSize,
  });
});

// STOCK — the inner dress lane, table-decided: the court's own floor dressed
// through dressCourtFloor (the SAME lattice/standoff law dressMasses runs),
// rows and cadence from the row ▷ the kind ▷ the framework — but every draw
// on the tenant fork, so the layout stream never learns the ring was stocked.
registerTenantKind('stock', (ctx, _def, grid, cm, rng, kd, row) => {
  if (ctx.lite || !cm.interior) return;
  const rows = row.rows ?? kd.inner;
  if (!rows?.length) {
    if (!warnedTenants.has(`stock:${kd.id}`)) {
      warnedTenants.add(`stock:${kd.id}`);
      console.warn(`[massif] stock tenant on '${kd.id}' has no rows (row.rows / kind inner) — seating nothing`);
    }
    return;
  }
  dressCourtFloor(ctx, grid, cm, kd, rng, rows,
    row.chance ?? kd.innerChance ?? MASSIF_CFG.innerChance,
    row.spacing ?? kd.innerSpacing ?? MASSIF_CFG.innerSpacing);
});

// CACHE — the hoard knot: a TIGHT cluster of containers on the court floor,
// paying through the ordinary brittle/breakage/drop chokepoints exactly as
// inner stock does (no chest doodad exists, on purpose — so the spoils law
// and every drop lever hold by construction; a cache in a spoils-'none'
// zone is scenery, same as any urn). Anchored past the POI seat's standoff,
// walkable-checked piece by piece; a floor too small for the standoff
// honestly seats nothing.
registerTenantKind('cache', (ctx, _def, grid, cm, rng, kd, row) => {
  if (ctx.lite || !cm.interior) return;
  const rows = row.rows ?? kd.inner;
  if (!rows?.length) {
    if (!warnedTenants.has(`cache:${kd.id}`)) {
      warnedTenants.add(`cache:${kd.id}`);
      console.warn(`[massif] cache tenant on '${kd.id}' has no rows (row.rows / kind inner) — seating nothing`);
    }
    return;
  }
  const floorR = cm.r * (kd.ringInner ?? 0.6) * 0.9;
  const seat = cm.interior;
  if (floorR < 42 + 16) return;
  const count = row.count ?? MASSIF_CFG.tenantCacheCount;
  const want = rng.int(count[0], count[1]);
  const spread = MASSIF_CFG.tenantCacheSpread;
  // The knot's anchor: a seat-side spot past the standoff (a few bearings
  // tried; the draws ride the fork, so tries cost the world nothing).
  let ax = 0, ay = 0, seated = false;
  for (let t = 0; t < 6 && !seated; t++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(42 + 16, Math.max(42 + 17, floorR - 16));
    ax = seat.x + Math.cos(a) * d; ay = seat.y + Math.sin(a) * d;
    seated = grid.isWalkable(ax, ay) && !resHits(ctx, ax, ay, 20);
  }
  if (!seated) return;
  const done: Vec2[] = [];
  for (let i = 0; i < want; i++) {
    for (let t = 0; t < 4; t++) {
      const a = rng.range(0, Math.PI * 2);
      const gx = ax + Math.cos(a) * rng.range(0, spread);
      const gy = ay + Math.sin(a) * rng.range(0, spread);
      const dd = Math.hypot(gx - seat.x, gy - seat.y);
      if (dd > floorR || dd < 42) continue; // the POI seat's standoff
      if (!grid.isWalkable(gx, gy)) continue;
      if (done.some(p => Math.hypot(p.x - gx, p.y - gy) < 24)) continue;
      if (resHits(ctx, gx, gy, 20)) continue;
      const dr = pickWeighted(rng, rows);
      done.push(vec(gx, gy));
      ctx.doodads.push({
        pos: vec(gx, gy), radius: rng.range(dr.radius[0], dr.radius[1]),
        kind: dr.kind, rot: rng.range(0, Math.PI * 2),
      });
      break;
    }
  }
});

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
 *
 * swallowCells is a dial (layoutParam massifSwallowCells through the recipe;
 * optional here so composition callers keep their signature) — deep country
 * may fuse bigger pockets rather than breach them.
 */
export function healMassifWeave(
  ctx: GenCtx, grid: GridWalkField, laneW: number,
  swallowCells: number = MASSIF_CFG.swallowCells,
): void {
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
      if (sizes[comp] <= swallowCells) {
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

/** Skirts at the foot, crests on the crown, inner rows on a court's floor —
 *  read off the LIVE grid (a lane the heal carved through a body is never
 *  skirted shut again; a swallowed pocket is never dressed). Skirt pieces
 *  respect the lane law: nothing lands inside the guaranteed weave between
 *  two bodies. Reads the RESOLVED kind carried by the carver, so per-row
 *  `over` tailoring reaches every dressing dial. Draw order per body is
 *  skirt → crest → inner: inner is the newest lane and appends its draws
 *  LAST, so a kind that grows inner rows keeps its skirt/crest streams
 *  byte-identical. */
function dressMasses(ctx: GenCtx, grid: GridWalkField, placed: PlacedMass[], laneW: number): void {
  const { rng } = ctx;
  for (const { cm, body, kd } of placed) {
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
    // INNER — the court's stocked floor (dressCourtFloor carries the lattice
    // law; the draw order is byte-for-byte the historical one). A kind that
    // authors a TENANT TABLE hands this lane to the table — the stock tenant
    // runs the same helper off its own fork stream instead.
    if (kd.inner?.length && cm.interior && !kd.tenants?.length) {
      dressCourtFloor(ctx, grid, cm, kd, rng, kd.inner,
        kd.innerChance ?? MASSIF_CFG.innerChance,
        kd.innerSpacing ?? MASSIF_CFG.innerSpacing);
    }
  }
}

/** The court-floor lattice (the INNER dress lane, shared with the stock
 *  TENANT so both speak one law): a GEN_CELL lattice over the ring's
 *  interior disc, walkable ground only (the mouth corridor and any healed
 *  breach stay clear by the live-grid read). Two standoffs keep the
 *  machinery honest: the POI seat stays open (the garrison's spawn scatter
 *  + the reachability promise land on floor, not on an urn), and
 *  reservations pass untouched. The universal doodad-navigability net rides
 *  behind as belt-and-suspenders, same as every scatter lane. Draws come
 *  from the CALLER's stream (dressMasses hands the layout stream, the stock
 *  tenant its per-mass fork) in the exact historical order: chance →
 *  spacing → row → pos jitter → radius → rot. */
function dressCourtFloor(
  ctx: GenCtx, grid: GridWalkField, cm: CarvedMass, kd: MassKindDef,
  rng: Rng, rows: MassDressRow[], chance: number, spacing: number,
): void {
  if (!cm.interior) return;
  const done: Vec2[] = [];
  const floorR = cm.r * (kd.ringInner ?? 0.6) * 0.9;
  const seat = cm.interior;
  for (let gy = seat.y - floorR; gy <= seat.y + floorR; gy += GEN_CELL) {
    for (let gx = seat.x - floorR; gx <= seat.x + floorR; gx += GEN_CELL) {
      const dd = Math.hypot(gx - seat.x, gy - seat.y);
      if (dd > floorR || dd < 42) continue; // the POI seat's standoff
      if (!grid.isWalkable(gx, gy)) continue;
      if (!rng.chance(chance)) continue;
      if (done.some(p => Math.hypot(p.x - gx, p.y - gy) < spacing)) continue;
      if (resHits(ctx, gx, gy, 20)) continue;
      const row = pickWeighted(rng, rows);
      done.push(vec(gx, gy));
      ctx.doodads.push({
        pos: vec(gx + rng.range(-6, 6), gy + rng.range(-6, 6)),
        radius: rng.range(row.radius[0], row.radius[1]),
        kind: row.kind, rot: rng.range(0, Math.PI * 2),
      });
    }
  }
}

// --- THE RECIPE --------------------------------------------------------------

/** THE POST-CARVE HOOKS: fabrics that want the finished mass list register
 *  here — the massif recipe hands every carved mass over once the weave is
 *  healed, and each hook decides from the def's own layoutParams whether it
 *  has business in this zone. Zero coupling: massif never imports its
 *  consumers (the in-house hollow-tor bore below runs first, directly). */
export type MassifPost = (ctx: GenCtx, def: ZoneDef, grid: GridWalkField, masses: CarvedMass[]) => void;
const MASSIF_POSTS: MassifPost[] = [];
export function registerMassifPost(fn: MassifPost): void { MASSIF_POSTS.push(fn); }

// --- THE HOLLOW TORS --------------------------------------------------------
// The mountain sibling of the sewer under-lattice (engine/tiers.ts): large
// SOLID masses BORED with a tier-1 gallery straight through the rock — a
// cavern network inside the zone itself, dialed by layoutParams.massifBores.
// The drains' orphan-proof law holds end to end: a bore lays only when BOTH
// mouths seat on standing valley ground and every tunnel cell is the mass's
// own rock; the gallery region repaints in the crag's exact surface face
// (tor_gallery, regions.ts — the bore is invisible from above), so the only
// tells are the two cut stairs at the feet. Tier semantics live entirely on
// the REGION ROWS (tier/tierLink — the tier fabric's law); this pass only
// paints them. Absent param = zero rng draws, zero carve (stream-safe).

export interface MassifBoreSpec {
  /** Per-eligible-mass roll. */
  chance: number;
  /** Bores per zone (default 2). */
  max?: number;
  /** Only masses at least this bounding radius bore (default 110). */
  minR?: number;
  /** Gallery region (default 'tor_gallery'); mouth link (default 'tor_mouth'). */
  region?: string;
  mouth?: string;
  /** Gallery half-width in px (default 32 — the sewer duct's gauge). */
  halfW?: number;
}

/** Floor-for-tier-1 read off the region row (the tier fabric's predicate,
 *  re-derived locally so massif stays import-free of its consumers). */
function tierFloorRow(kindId: string | undefined): boolean {
  const rk = kindId ? regionKind(kindId) : undefined;
  return !!rk && (rk.tier === 1 || !!rk.tierLink);
}

export function boreMassifTunnels(ctx: GenCtx, def: ZoneDef, grid: GridWalkField, masses: CarvedMass[]): void {
  const spec = layoutParam(def, 'massifBores', undefined) as MassifBoreSpec | undefined;
  if (!spec || ctx.lite) return;
  const cs: number = (grid as unknown as { cell?: number }).cell ?? 30;
  const galleryId = spec.region ?? 'tor_gallery';
  const mouthId = spec.mouth ?? 'tor_mouth';
  const halfW = spec.halfW ?? 32;
  const cap = spec.max ?? 2;
  let bored = 0;
  for (const m of masses) {
    if (bored >= cap) break;
    if (m.bound < (spec.minR ?? 110)) continue;
    if (!ctx.rng.chance(spec.chance)) continue;
    // The mass's own SOLID region only — courts, parapets and already-tiered
    // rock never bore.
    const massK = grid.regionAt?.(m.at.x, m.at.y);
    if (!massK || !regionKind(massK)?.blocks || tierFloorRow(massK)) continue;
    const a0 = ctx.rng.range(0, Math.PI * 2);
    for (let tryA = 0; tryA < 6; tryA++) {
      const a = a0 + tryA * (Math.PI / 6);
      // Both feet along the axis: the last mass cell out from the heart,
      // then standing ground just past it (the mouth's seat).
      const ends: { mouth: Vec2; out: number }[] = [];
      let inner1: Vec2 | null = null, inner2: Vec2 | null = null;
      for (const s of [1, -1]) {
        const dx = Math.cos(a) * s, dy = Math.sin(a) * s;
        let footD = -1;
        for (let d = cs; d <= m.bound + cs * 4; d += cs * 0.5) {
          const k = grid.regionAt?.(m.at.x + dx * d, m.at.y + dy * d);
          if (k === massK) footD = d;
          else if (footD > 0) break;
        }
        if (footD <= 0) break;
        const landD = footD + cs * 1.5;
        if (!grid.isWalkable(m.at.x + dx * landD, m.at.y + dy * landD)) break;
        const inner = vec(m.at.x + dx * footD, m.at.y + dy * footD);
        if (s === 1) inner1 = inner; else inner2 = inner;
        ends.push({ mouth: vec(m.at.x + dx * landD, m.at.y + dy * landD), out: s === 1 ? a : a + Math.PI });
      }
      if (ends.length < 2 || !inner1 || !inner2) continue;
      // ONE straight gallery through the heart: every cell between the feet
      // must still be the mass's own rock (a POI court or a prior bore
      // refuses the line — try the next bearing).
      const len = Math.hypot(inner2.x - inner1.x, inner2.y - inner1.y);
      const steps = Math.max(1, Math.ceil(len / (cs * 0.5)));
      let clear = true;
      for (let st = 0; st <= steps; st++) {
        const k = grid.regionAt?.(
          inner1.x + (inner2.x - inner1.x) * (st / steps),
          inner1.y + (inner2.y - inner1.y) * (st / steps));
        if (k !== massK) { clear = false; break; }
      }
      if (!clear) continue;
      // Bore it — mouth to mouth, gated to the mass's own cells (the sliver
      // at each foot joins gallery to mouth; valley cells stay valley), then
      // the mouth crossings, then the stair props rotated INTO the hill
      // (a door that lies is worse than no door — the drains' law).
      const span = Math.hypot(ends[1].mouth.x - ends[0].mouth.x, ends[1].mouth.y - ends[0].mouth.y);
      const strokes = Math.max(1, Math.ceil(span / (cs * 0.5)));
      for (let st = 0; st <= strokes; st++) {
        const t = st / strokes;
        const x = ends[0].mouth.x + (ends[1].mouth.x - ends[0].mouth.x) * t;
        const y = ends[0].mouth.y + (ends[1].mouth.y - ends[0].mouth.y) * t;
        // Per-CELL gate: only the mass's own rock ever converts — the
        // gallery can never slop a wall stub onto valley ground at a thin
        // neck, and the foot slivers join gallery to mouth exactly.
        for (let oy = -halfW; oy <= halfW; oy += cs * 0.5) {
          for (let ox = -halfW; ox <= halfW; ox += cs * 0.5) {
            if (grid.regionAt?.(x + ox, y + oy) !== massK) continue;
            grid.fillRegion(x + ox - 1, y + oy - 1, x + ox + 1, y + oy + 1, galleryId);
          }
        }
      }
      for (const e of ends) {
        grid.fillRegion(e.mouth.x - cs, e.mouth.y - cs, e.mouth.x + cs, e.mouth.y + cs, mouthId);
        ctx.doodads.push({ pos: vec(e.mouth.x, e.mouth.y), radius: 16, kind: 'culvert_stair', rot: e.out + Math.PI });
      }
      bored++;
      break;
    }
  }
  // ATTEMPT-HONEST: generation may run more than once for one def (the
  // retry loop, mint-then-load) — write THIS attempt's truth uncondition-
  // ally, set or cleared, so a def can never wear a stale layer whose
  // galleries a later attempt rolled away. (A massif-recipe zone has no
  // other tier author; needles/districts run their own recipes.)
  def.tiers = bored ? {
    kind: 'under', exposure: 'covered', label: 'the hollow tors',
    packSplit: layoutParam(def, 'tierPackSplit', 0.15),
  } : undefined;
}

/** MASSIF — wide-open country studded with large impassable bodies: the
 *  mixture archetype (see the module header). ensureGrid + carveMassifs +
 *  the hollow-tor bores + the per-exit belt + the tileset's own scatter
 *  (walk-gated into the open weave for free). */
function massifLayout(ctx: GenCtx, def: ZoneDef): void {
  const grid = ensureGrid(ctx);
  const masses = carveMassifs(ctx, def);
  boreMassifTunnels(ctx, def, grid, masses);
  for (const post of MASSIF_POSTS) post(ctx, def, grid, masses);
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
