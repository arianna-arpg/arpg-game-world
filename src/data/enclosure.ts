// ---------------------------------------------------------------------------
// THE ENCLOSURE DRESS (seamless M2 wave 5) — her doctrine, item 2: "zones
// basically enclosed, with the old entrances carving passage gaps in those
// borders." Every fitted resident wears a BORDER TREATMENT around its cell
// perimeter — a treeline, a rock line, a dead-tree brake — carved open at
// the agreed mouths (and at every door), so the D2 edge grammar is
// universal: walls-with-gaps everywhere, not only on naturally-walled
// layouts. The engine plants it at BOTH mint chokepoints beside
// seamlessCarveMouths (World.seamlessDressEnclosure — one derivation feeds
// carve + dress + posts), and layouts that wall their own rims are DETECTED
// and skipped (no double border).
//
// ALL DATA, three layers (the avoid-hardcoding doctrine):
//   1. ENCLOSURE_ROWS — authored per-tileset rows (the lever). `none: true`
//      is an authored refusal (the tileset's country is its own border).
//   2. THE THEME DERIVATION (enclosureRowFor) — a tileset that authors
//      nothing borrows its border body from its OWN stamp vocabulary: its
//      layout+common rows are tallied against ENCLOSURE_STAMP_BODIES and
//      the heaviest body wins (a forest fences itself with trees, a
//      mountain with stone) at the tileset's own stamped radius.
//   3. ENCLOSURE_DEFAULT — the last-resort body for tilesets whose stamps
//      name nothing borderable (every biome has stone).
//
// LAW NOTES: border bodies must be plain standing kinds — blocksMove rules
// with NO DoodadRule.effect (the dress never attaches hazards) and no
// state-carrying nature (doors, spans, seed-paired mouths). Drawn == tested:
// the default spacing overlaps bodies (spacingMul < 2) so the line READS
// solid exactly where it IS solid; an authored sparse density opens real
// gaps a walker can honestly thread. ALL DIALS + ROWS FLAGGED (unblessed;
// her word moves them).
//
// THE TREATMENT CLASS (M2 wave 7 — HER BORDER RULING, 2026-08-13): "have the
// borders themselves be something similar to the massif structures OR
// potentially border rocks, with the biome itself possibly being the thing
// doing that placement." The border vocabulary carries TWO classes:
//   'bodies' — the landed line above (border rocks; open/arid country);
//   'massif' — rim MASS: a coherent impassable BAND of a REGISTERED region
//     kind (world/regions.ts — the massif fabric's own doctrine: collision,
//     shot/sight policy and the whole drawn look ride the region row) carved
//     into the zone's OWN walk grid along the cell perimeter, gapped at
//     every exit through the same gap ladder the body line uses. A massif
//     zone plants NO body line — the class replaces it.
// THE CLASS DERIVATION rides massKitFor (THE SHARING SEAM, below): the
// tileset's own mass-kit vocabulary elects the class — grown texture
// (tree/brush glyphs) derives massif, standing-body texture (rock/cactus/
// dead-tree) derives bodies — so the border and the between-mass speak ONE
// country by construction. Deserts land bodies-rocks; jungle lands massif
// under the derivation (her named exemplars).
// ---------------------------------------------------------------------------

import { TILESETS } from './tilesets';

/** One tileset's AUTHORED border row (the lever). A row with `none: true` —
 *  or without a body OR a massif class — is an authored refusal. */
export interface EnclosureRow {
  /** THE TREATMENT CLASS (wave 7): 'massif' carves rim mass instead of
   *  planting the body line. Absent = 'bodies' (the landed line) when body
   *  fields stand; an unauthored tileset derives its class (see
   *  enclosureRowFor). */
  treatment?: 'bodies' | 'massif';
  /** Massif rows: the REGISTERED region kind the rim band paints (the
   *  collision/shot/sight/look truth — world/regions.ts). Absent = derived
   *  from the tileset's kit class (ENCLOSURE_MASSIF_CFG.regionByClass). */
  massifRegion?: string;
  /** Doodad kind planted as the border body — a registered blocking kind
   *  with no rule effect (see the law notes above). */
  kind?: string;
  /** Body radius range [min, max] px, rolled per body on the dress's own
   *  seeded stream. */
  radius?: [number, number];
  /** Spacing between body centers = mean radius × this (default
   *  ENCLOSURE_CFG.spacingMul). Below 2 the bodies overlap — a solid line. */
  spacingMul?: number;
  /** 0..1 — chance each perimeter slot actually plants (default 1). Sparse
   *  densities open honest threadable gaps (drawn == tested). */
  density?: number;
  /** Authored refusal: this tileset dresses NO border (its own country is
   *  the enclosure). */
  none?: boolean;
}

/** A RESOLVED bodies-class treatment (the landed line). */
export interface EnclosureBorder {
  treatment: 'bodies';
  kind: string;
  radius: [number, number];
  spacingMul?: number;
  density?: number;
}

/** A RESOLVED massif-class treatment (wave 7): the rim band's region. */
export interface EnclosureMassif {
  treatment: 'massif';
  /** Registered region kind (world/regions.ts) — the band's one truth. */
  region: string;
}

/** What enclosureRowFor answers: one of the two classes, or null (an
 *  authored refusal — the tileset's own country is the enclosure). */
export type EnclosureTreatment = EnclosureBorder | EnclosureMassif;

/** THE DRESS DIALS — ALL FLAGGED (unblessed; her word moves them). */
export const ENCLOSURE_CFG = {
  /** Default body spacing as a multiple of mean radius; < 2 ⇒ overlap ⇒ the
   *  drawn line is solid exactly where the law is. */
  spacingMul: 1.55,
  /** Body-center inset from the cell rim = body radius + this (bodies stand
   *  whole inside the arena; the render away-clip and the rim clamp agree). */
  insetPad: 4,
  /** Extra half-gap past mouthHalfPx + body radius at every exit seat — the
   *  carved corridor's shoulder stays clear of trunks. */
  gapShoulder: 26,
  /** Rim-band wall fraction at/above which a layout is judged to wall its
   *  own border and the dress stands down (no double border). */
  walledSkipFrac: 0.6,
  /** Per-body inward position jitter (px) — an organic line, not a fence. */
  jitterPx: 7,
} as const;

/** Stamp-vocabulary → border body (THE THEME DERIVATION's map): a tileset's
 *  own scatter rows elect its border. Radii here are the fallback when the
 *  electing stamp row carries none. FLAGGED. */
export const ENCLOSURE_STAMP_BODIES: Record<string, { kind: string; radius: [number, number] }> = {
  trees: { kind: 'tree', radius: [22, 34] },
  grove: { kind: 'tree', radius: [22, 34] },
  dead_tree: { kind: 'dead_tree', radius: [20, 30] },
  rocks: { kind: 'rock', radius: [20, 34] },
  scree: { kind: 'rock', radius: [18, 28] },
  cliff: { kind: 'rock', radius: [24, 38] },
  cactus: { kind: 'cactus', radius: [16, 24] },
};

/** The last-resort border body — every biome has stone. FLAGGED. */
export const ENCLOSURE_DEFAULT: EnclosureBorder = { treatment: 'bodies', kind: 'rock', radius: [20, 32] };

/** THE MASSIF-TREATMENT DIALS (wave 7) — ALL FLAGGED (unblessed; her word
 *  moves them). The band's geometry: a guaranteed BASE STRIP (no walkable
 *  pinhole can survive inside the band, by construction) plus overlapping
 *  inner LOBES on the treatment's own seeded stream — the organic edge, the
 *  massif fabric's blob vocabulary at band grain. */
export const ENCLOSURE_MASSIF_CFG = {
  /** Guaranteed strip depth from the cell rim (px). */
  bandBasePx: 55,
  /** Lobe radius band [min, max] px — lobes half-embed in the strip and
   *  poke inward, so the band's inner edge wobbles between bandBasePx and
   *  ~bandBasePx + lobeJitterPx + max lobe radius. */
  bandLobeR: [45, 85] as [number, number],
  /** Lobe center spacing = mean lobe radius × this (< 2 ⇒ lobes overlap —
   *  a coherent mass, never a dotted line). */
  lobeSpacingMul: 1.35,
  /** Per-lobe inward center jitter (px). */
  lobeJitterPx: 16,
  /** THE WALLED DETECT's sample ring inset for the massif class (px) — the
   *  bodies class samples at its own body radius; the band samples here. */
  detectInsetPx: 34,
  /** THE CLASS DERIVATION threshold: grown-texture share of the tileset's
   *  mass kit at/above which the border derives 'massif'. */
  massifShareMin: 0.6,
  /** Derived massif REGION by the kit's dominant texture class: grown
   *  country walls itself in hedge, stone country in crag (the massif
   *  fabric's reference regions — both true walls to bodies; hedge blocks
   *  sight and threads shots, crag stops all three, per their rows). */
  regionByClass: { grown: 'hedgewall', stone: 'crag' } as const,
  /** The rim-mass stream's salt (pure f(def.seed) — the dress's idiom). */
  salt: 0x51a90b7,
} as const;

/** Kit-glyph → texture class for THE CLASS DERIVATION (glyph kinds are
 *  MASS_STAMP_GLYPHS' own vocabulary — THE SHARING SEAM). Standing snags
 *  and stones read as BODIES country; canopy and scrub read as GROWN mass.
 *  Unknown kinds count stone (the default kit derives bodies — an unknown
 *  tileset keeps the landed rock line). FLAGGED. */
export const ENCLOSURE_CLASS_OF: Record<string, 'grown' | 'stone'> = {
  tree: 'grown',
  brush: 'grown',
  rock: 'stone',
  cactus: 'stone',
  dead_tree: 'stone',
};

/** Authored per-tileset rows (the lever, exemplars — ALL FLAGGED):
 *  - downs: a low drystone line with real gaps (the barrow country's field
 *    walls), where the derivation would fence it in boulders;
 *  - mire: a dead-tree brake — the marsh's rim is drowned timber, not the
 *    stone its scatter rows would elect.
 *  Jungle's old authored `none` is gone on purpose (wave 7 — her ruling):
 *  the green country now DERIVES the massif class from its own vocabulary
 *  (the biome is the thing doing the placement), and `none` survives as
 *  the vocabulary's refusal face for any tileset that wants it. */
export const ENCLOSURE_ROWS: Record<string, EnclosureRow> = {
  downs: { kind: 'rock', radius: [16, 24], density: 0.85 },
  mire: { kind: 'dead_tree', radius: [20, 30] },
};

/** THE CLASS DERIVATION (wave 7): the tileset's own mass kit (massKitFor —
 *  authored kit or stamp derivation, THE SHARING SEAM) elects the treatment
 *  class by texture: grown share ≥ massifShareMin ⇒ massif, else bodies.
 *  The derived massif REGION follows the DOMINANT class (grown ⇒ hedge,
 *  stone ⇒ crag) so an authored massif row on stony country still walls
 *  itself in stone. Pure f(registry). */
function enclosureClassOf(tilesetId: string | undefined): { cls: 'bodies' | 'massif'; region: string } {
  let grown = 0, stone = 0;
  for (const r of massKitFor(tilesetId)) {
    if (ENCLOSURE_CLASS_OF[r.kind] === 'grown') grown += r.weight;
    else stone += r.weight;
  }
  const total = grown + stone;
  const share = total > 0 ? grown / total : 0;
  return {
    cls: share >= ENCLOSURE_MASSIF_CFG.massifShareMin ? 'massif' : 'bodies',
    region: ENCLOSURE_MASSIF_CFG.regionByClass[grown >= stone ? 'grown' : 'stone'],
  };
}

/** THE THEME DERIVATION's body election (the landed wave-5 tally): the
 *  tileset's own base+common stamp rows (variants say what CHANGES; the
 *  base says what the biome IS) against the stamp-body map, weighted by
 *  mean count. Heaviest body wins; its radius comes from the heaviest
 *  single electing row that stamped one. */
function electBodyRow(ts: (typeof TILESETS)[string]): EnclosureBorder {
  const tally = new Map<string, { weight: number; radius: [number, number]; radiusW: number }>();
  for (const row of [...ts.layout, ...(ts.common ?? [])]) {
    const body = ENCLOSURE_STAMP_BODIES[row.kind];
    if (!body) continue;
    const w = (row.count[0] + row.count[1]) / 2;
    const cur = tally.get(body.kind);
    if (!cur) {
      tally.set(body.kind, { weight: w, radius: row.radius ?? body.radius, radiusW: row.radius ? w : -1 });
    } else {
      cur.weight += w;
      if (row.radius && w > cur.radiusW) { cur.radius = row.radius; cur.radiusW = w; }
    }
  }
  let best: { kind: string; weight: number; radius: [number, number] } | null = null;
  for (const [kind, t] of tally) {
    if (!best || t.weight > best.weight || (t.weight === best.weight && kind < best.kind)) {
      best = { kind, weight: t.weight, radius: t.radius };
    }
  }
  return best
    ? { treatment: 'bodies', kind: best.kind, radius: best.radius }
    : ENCLOSURE_DEFAULT;
}

/** Resolve a tileset's border treatment: authored row ▷ THE CLASS
 *  DERIVATION (massif) ▷ THE THEME DERIVATION (body election) ▷ the
 *  default. Null = no dress (an authored `none` — or a bodyless bodies
 *  row). Pure f(registry) — deterministic, no rng; the engine seeds band
 *  and body rolls itself. */
export function enclosureRowFor(tilesetId: string | undefined): EnclosureTreatment | null {
  const authored = tilesetId ? ENCLOSURE_ROWS[tilesetId] : undefined;
  if (authored) {
    if (authored.none) return null;
    if (authored.treatment === 'massif') {
      return { treatment: 'massif', region: authored.massifRegion ?? enclosureClassOf(tilesetId).region };
    }
    if (!authored.kind || !authored.radius) return null;
    return { treatment: 'bodies', kind: authored.kind, radius: authored.radius, spacingMul: authored.spacingMul, density: authored.density };
  }
  const ts = tilesetId ? TILESETS[tilesetId] : undefined;
  if (!ts) return ENCLOSURE_DEFAULT;
  const derived = enclosureClassOf(tilesetId);
  if (derived.cls === 'massif') return { treatment: 'massif', region: derived.region };
  return electBodyRow(ts);
}

/** The BODY-LINE half alone (wave 7 — the massif class's degradation lane:
 *  convex grid-less ground cannot carve a band, so the treatment falls back
 *  to the tileset's own body line rather than leaving the rim bare; an
 *  authored `none` still refuses). */
export function enclosureBodiesFor(tilesetId: string | undefined): EnclosureBorder | null {
  const authored = tilesetId ? ENCLOSURE_ROWS[tilesetId] : undefined;
  if (authored) {
    if (authored.none) return null;
    if (authored.kind && authored.radius) {
      return { treatment: 'bodies', kind: authored.kind, radius: authored.radius, spacingMul: authored.spacingMul, density: authored.density };
    }
    // An authored massif row without body fields degrades through the
    // election below — the class asked for mass; the fallback still fences.
  }
  const ts = tilesetId ? TILESETS[tilesetId] : undefined;
  if (!ts) return ENCLOSURE_DEFAULT;
  return electBodyRow(ts);
}

// ---------------------------------------------------------------------------
// THE MASS DRESS (seamless M2 wave 6) — the SOLID BETWEEN's country kit, the
// border rows' sibling vocabulary. The impassable mass between the cells is
// draw-time TEXTURE (no doodads, no collision — the tissue's refusal is the
// law; the dress only makes it read as country), scattered from the flanking
// zones' OWN stamp vocabulary and shaded off the relief field. HER WORD
// (2026-08-13): a border may itself become massif-like mass or a body line
// with the BIOME choosing — so the kit derivation lives HERE, beside the
// border rows, as reusable data: wave 7's border-treatment painter and the
// between's painter read ONE kit and ONE light, and the two masses read as
// one country.
//
// VOCABULARY LAW: MassStampRow.kind speaks doodad-kind-SHAPED names ('tree',
// 'rock', 'dead_tree', 'cactus', 'brush') — the enclosure bodies' own ids —
// but a mass consumer interprets them as GLYPHS (painter texture), never
// plants them. A future border-mass lane may interpret the same kit as
// bodies OR texture; the kit itself carries no effect, no collision, no
// state — the enclosure file's inert-mass law, unchanged.
// ---------------------------------------------------------------------------

/** One texture stamp in a tileset's MASS KIT: a glyph id (see the vocabulary
 *  law above), a radius band rolled per stamp, and a weight for the scatter
 *  draw. */
export interface MassStampRow {
  kind: string;
  radius: [number, number];
  weight: number;
}

/** THE MASS-DRESS DIALS — the WORLD-GRAIN half (seat derivation + the shared
 *  shade math; the painter's look dials live in SEAMLESS_DRAW_CFG). ALL
 *  FLAGGED (unblessed; her word moves them). */
export const MASSDRESS_CFG = {
  /** THE CLEARWAY SHOULDER (px): stamps keep this far past the walkable
   *  corridor's own edge (road ribbon + mouth aprons) — the way through
   *  stays readable; the M0.5 signposts stand inside it untouched. */
  shoulderPx: 40,
  /** Stamp attempts per 720px tissue chunk (fixed count — skips on
   *  non-mass ground never shift a neighbor's roll; density on mass scales
   *  with the mass's own share of the chunk). M2 wave 9 THE SOLID FILL:
   *  raised from the sparse 26 so the between reads genuinely FULL — each
   *  attempt then rolls acceptance against the flanks' own MASS_DENSITY
   *  (below), so jungle packs near every attempt and desert keeps its
   *  emptiness from the same fixed budget. */
  stampAttempts: 96,
  /** THE SOLID FORMS (M2 wave 9): large mass-form attempts per chunk — the
   *  massif fabric's blob vocabulary as DRAWN forms (crag mounds, hedge
   *  banks) under the stamp scatter, so the between carries large-scale
   *  structure, not only bodies. Same fixed-count fork law; each rolls the
   *  blended density like the stamps. */
  formAttempts: 6,
  /** Solid-form radius band [min, max] px (the whole footprint must stand
   *  on dressable mass — buildTissueSampler's own footprint test). */
  formR: [60, 150] as [number, number],
  /** The form streams' salt (chunk-keyed forks off the world seed — a
   *  separate stream from the stamps, so densifying one never re-rolls
   *  the other). */
  formSalt: 0x9d2c5681,
  /** THE ONE SUN: the direction the light comes FROM, unit vector in world
   *  axes (screen up-left — the doodad painters' own lit-side convention).
   *  Every mass consumer shades with this, so between-mass and a future
   *  border mass can never disagree about the light. */
  lightDir: [-0.6, -0.8] as const,
  /** Slope (elevation units per node unit) that saturates the hillshade —
   *  calibrated against the field's own land-slope p99 ≈ 0.0013/unit (the
   *  tissue cliff calibration, 2026-08-12): 2× p99 puts ordinary rolling
   *  country at mid alphas and ridge creases at full. */
  shadeSlopeRef: 0.0026,
  /** The stamp streams' salt (chunk-keyed forks off the world seed). */
  salt: 0x3a55d7e5,
} as const;

/** Stamp-vocabulary → mass-kit row template (THE MASS DERIVATION's map — the
 *  border-body map's broader sibling: the between wants the tileset's WHOLE
 *  texture, not one fence body, so every matching stamp row contributes a
 *  kit row instead of electing a single winner). FLAGGED. */
export const MASS_STAMP_GLYPHS: Record<string, { kind: string; radius: [number, number] }> = {
  trees: { kind: 'tree', radius: [20, 32] },
  grove: { kind: 'tree', radius: [20, 32] },
  palm: { kind: 'tree', radius: [18, 30] },
  dead_tree: { kind: 'dead_tree', radius: [18, 28] },
  rocks: { kind: 'rock', radius: [16, 28] },
  scree: { kind: 'rock', radius: [10, 18] },
  cliff: { kind: 'rock', radius: [22, 36] },
  obsidian: { kind: 'rock', radius: [14, 24] },
  cactus: { kind: 'cactus', radius: [14, 22] },
  brush: { kind: 'brush', radius: [10, 18] },
  thicket: { kind: 'brush', radius: [12, 20] },
  grass: { kind: 'brush', radius: [8, 14] },
  fern: { kind: 'brush', radius: [9, 16] },
  jungle_brush: { kind: 'brush', radius: [10, 18] },
  vines: { kind: 'brush', radius: [9, 15] },
} as const;

/** Authored per-tileset MASS KITS (the lever, exemplars — ALL FLAGGED):
 *  - mire: drowned timber + reed tufts (the marsh's between is its own
 *    dead country, denser in snags than its stamp tally would derive);
 *  - downs: drystone litter + gorse (small stones — the field-wall country's
 *    rubble, where the derivation would seed full boulders).
 *  A tileset absent here DERIVES its kit from its own stamp rows; there is
 *  deliberately no `none` lane — every between wears SOME texture (the
 *  refusal class belongs to the border line, not the mass). */
export const MASS_KITS: Record<string, MassStampRow[]> = {
  mire: [
    { kind: 'dead_tree', radius: [18, 30], weight: 3 },
    { kind: 'brush', radius: [9, 15], weight: 2 },
  ],
  downs: [
    { kind: 'rock', radius: [10, 18], weight: 3 },
    { kind: 'brush', radius: [9, 15], weight: 2 },
  ],
};

/** The last-resort mass kit — every country has stone and scrub. FLAGGED. */
export const MASS_KIT_DEFAULT: MassStampRow[] = [
  { kind: 'rock', radius: [14, 26], weight: 2 },
  { kind: 'brush', radius: [9, 15], weight: 1 },
];

/** THE MASS DENSITY (M2 wave 9, THE SOLID FILL) — per-tileset acceptance
 *  probability for the between's dense fill (stamps AND forms): the fraction
 *  of the fixed attempt budget a country actually seats, so jungle's between
 *  packs into a genuine thicket wall while desert's stays honestly sparse
 *  from the SAME streams (the named jungle-denser-than-desert lever). At a
 *  blended flank the acceptance is the weight-law fold of the flanks' own
 *  densities. An authored voice, never derived — a country's emptiness is
 *  authorship, not an accident of its stamp tally. ALL ROWS + THE DEFAULT
 *  FLAGGED (unblessed; her word moves them). */
export const MASS_DENSITY: Record<string, number> = {
  jungle: 0.95,
  deepwood: 0.9,
  forest: 0.85,
  mangrove_tangle: 0.9,
  marsh: 0.75,
  mire: 0.7,
  meadow: 0.65,
  grassland: 0.6,
  farmland: 0.55,
  downs: 0.55,
  tundra: 0.4,
  desert: 0.28,
  dunes: 0.28,
  beach: 0.35,
  strand: 0.35,
};
export const MASS_DENSITY_DEFAULT = 0.6;

/** Resolve a tileset's mass density: authored ▷ the default. Pure. */
export function massDensityFor(tilesetId: string | undefined): number {
  return (tilesetId && MASS_DENSITY[tilesetId]) || MASS_DENSITY_DEFAULT;
}

/** THE FORM CLASS (M2 wave 9): the texture class a tileset's SOLID FORMS
 *  wear — grown country mounds in hedge-bank green, stone country in crag —
 *  by the kit's own dominant texture (ENCLOSURE_CLASS_OF over massKitFor,
 *  simple dominance at 0.5: forms follow the country's stronger voice, not
 *  the border treatment's stricter massif threshold). Pure f(registry). */
export function massClassFor(tilesetId: string | undefined): 'grown' | 'stone' {
  let grown = 0, stone = 0;
  for (const r of massKitFor(tilesetId)) {
    if (ENCLOSURE_CLASS_OF[r.kind] === 'grown') grown += r.weight;
    else stone += r.weight;
  }
  return grown >= stone && grown > 0 ? 'grown' : 'stone';
}

// ---------------------------------------------------------------------------
// THE ROAD DRESS (seamless M2 wave 8) — the mass-dress pass's coda-3 debt:
// the tissue ribbon stops reading as a flat lightened slab and reads as the
// zones' own roads continuing between them. DRAW-TIME ONLY, the mass dress's
// own charter: the ribbon's walkable verdict is untouched — these rows only
// dress how it reads. The world-grain half lives here beside MASSDRESS_CFG
// (seat cadence, offsets, the salt); the painter's look half (stroke alphas,
// grit density) lives in SEAMLESS_DRAW_CFG.roadFace.
//
// THE ONE SHOULDER: the wayside band and the mass stamps read the SAME
// clearway shoulder (MASSDRESS_CFG.shoulderPx) — mass stamps stop AT it,
// wayside glyphs live IN it, so the two bands can never fight: seat centers
// stay within roadHalfPx + shoulderPx BY ARITHMETIC (waysideOff max + the
// widest glyph radius ≤ shoulderPx — also the road bins' registration reach,
// so a seat's chunk always holds its own segment).
// ---------------------------------------------------------------------------

/** THE ROAD-DRESS DIALS — ALL FLAGGED (unblessed; her word moves them). */
export const ROADDRESS_CFG = {
  /** Wayside candidate cadence along a road segment's arc (px) — generous on
   *  purpose: the M0.5 mouth signposts already stand and the verge must not
   *  crowd them (the aprons are excluded outright; this spaces the rest). */
  waysideStepPx: 300,
  /** Seat chance per candidate (the discrete WAYSIDE_CFG.chance's own
   *  posture — sparse and honest). */
  waysideChance: 0.55,
  /** Seat offset band past the ribbon edge (px): a seat's center stands at
   *  roadHalfPx + off + its own body radius, so the glyph body clears the
   *  walkable ribbon by ≥ off[0] BY ARITHMETIC. */
  waysideOff: [6, 16] as [number, number],
  /** Refuse a seat whose body comes within this of ANY ribbon (a crossing
   *  road's clearance; the seat's own road stands off + r away already). */
  waysideRoadGap: 4,
  /** The wayside streams' salt (segment-keyed forks off the world seed). */
  salt: 0x77a9c13d,
} as const;

/** THE WAYSIDE GLYPH POOL — road-culture furniture, one pool for every road
 *  (waymarks are the travelers' artifact, not the biome's; the tone-local
 *  ink law dresses them in the local palette regardless). Kinds are
 *  doodad-kind-SHAPED names per the vocabulary law above — 'cairn' is the
 *  waymark-stones kind's own id, 'post' a plain marker post, 'brush' the
 *  verge tuft — interpreted as GLYPHS, never planted. FLAGGED. */
export const WAYSIDE_GLYPHS: MassStampRow[] = [
  { kind: 'cairn', radius: [7, 12], weight: 2 },
  { kind: 'post', radius: [6, 9], weight: 1 },
  { kind: 'brush', radius: [7, 12], weight: 2 },
];

/** The tissue road's base tone when a flanking zone's theme names none — the
 *  road doodad's own packed-grey fallback (doodadVisuals 'theme:road|#574f44'),
 *  so an unthemed road continues in the same grey it wears in-zone. FLAGGED. */
export const ROAD_TONE_DEFAULT = '#574f44';

const massKitMemo = new Map<string, MassStampRow[]>();

/** Resolve a tileset's mass kit: authored rows ▷ THE MASS DERIVATION (every
 *  layout+common stamp row matching MASS_STAMP_GLYPHS contributes a kit row
 *  weighted by mean count, at the tileset's own stamped radius where the row
 *  carries one — heaviest electing row wins the radius, the border
 *  derivation's own tie law) ▷ the default. Pure f(registry), memoized (the
 *  registry never mutates at runtime); canonical weight-desc order so every
 *  consumer's weighted walk reads the same table. */
export function massKitFor(tilesetId: string | undefined): MassStampRow[] {
  const key = tilesetId ?? '';
  const hit = massKitMemo.get(key);
  if (hit) return hit;
  const kit = deriveMassKit(tilesetId);
  massKitMemo.set(key, kit);
  return kit;
}

function deriveMassKit(tilesetId: string | undefined): MassStampRow[] {
  const authored = tilesetId ? MASS_KITS[tilesetId] : undefined;
  if (authored && authored.length) return authored;
  const ts = tilesetId ? TILESETS[tilesetId] : undefined;
  if (!ts) return MASS_KIT_DEFAULT;
  const tally = new Map<string, { row: MassStampRow; radiusW: number }>();
  for (const row of [...ts.layout, ...(ts.common ?? [])]) {
    const g = MASS_STAMP_GLYPHS[row.kind];
    if (!g) continue;
    const w = (row.count[0] + row.count[1]) / 2;
    const cur = tally.get(g.kind);
    if (!cur) {
      tally.set(g.kind, {
        row: { kind: g.kind, radius: row.radius ?? g.radius, weight: w },
        radiusW: row.radius ? w : -1,
      });
    } else {
      cur.row.weight += w;
      if (row.radius && w > cur.radiusW) { cur.row.radius = row.radius; cur.radiusW = w; }
    }
  }
  const rows = [...tally.values()].map(t => t.row)
    .sort((a, b) => b.weight - a.weight || (a.kind < b.kind ? -1 : 1));
  return rows.length ? rows : MASS_KIT_DEFAULT;
}
