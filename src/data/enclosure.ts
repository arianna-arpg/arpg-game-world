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
// ---------------------------------------------------------------------------

import { TILESETS } from './tilesets';

/** One tileset's AUTHORED border row (the lever). A row with `none: true` —
 *  or without a body — is an authored refusal. */
export interface EnclosureRow {
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

/** A RESOLVED border treatment (what enclosureRowFor answers): the body is
 *  always present — refusals resolve to null instead. */
export interface EnclosureBorder {
  kind: string;
  radius: [number, number];
  spacingMul?: number;
  density?: number;
}

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
export const ENCLOSURE_DEFAULT: EnclosureBorder = { kind: 'rock', radius: [20, 32] };

/** Authored per-tileset rows (the lever, exemplars — ALL FLAGGED):
 *  - downs: a low drystone line with real gaps (the barrow country's field
 *    walls), where the derivation would fence it in boulders;
 *  - mire: a dead-tree brake — the marsh's rim is drowned timber, not the
 *    stone its scatter rows would elect;
 *  - jungle: authored refusal — the thicket IS the border (its walled
 *    layouts are also caught by the detect; the row states the intent). */
export const ENCLOSURE_ROWS: Record<string, EnclosureRow> = {
  downs: { kind: 'rock', radius: [16, 24], density: 0.85 },
  mire: { kind: 'dead_tree', radius: [20, 30] },
  jungle: { none: true },
};

/** Resolve a tileset's border treatment: authored row ▷ theme derivation ▷
 *  the default. Null = no dress (an authored `none` — or a bodyless row).
 *  Pure f(registry) — deterministic, no rng; the engine seeds body rolls
 *  itself. */
export function enclosureRowFor(tilesetId: string | undefined): EnclosureBorder | null {
  const authored = tilesetId ? ENCLOSURE_ROWS[tilesetId] : undefined;
  if (authored) {
    if (authored.none || !authored.kind || !authored.radius) return null;
    return { kind: authored.kind, radius: authored.radius, spacingMul: authored.spacingMul, density: authored.density };
  }
  const ts = tilesetId ? TILESETS[tilesetId] : undefined;
  if (!ts) return ENCLOSURE_DEFAULT;
  // THE THEME DERIVATION: tally the tileset's own base+common stamp rows
  // (variants say what CHANGES; the base says what the biome IS) against
  // the stamp-body map, weighted by mean count. Heaviest body wins; its
  // radius comes from the heaviest single electing row that stamped one.
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
  return best ? { kind: best.kind, radius: best.radius } : ENCLOSURE_DEFAULT;
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
   *  with the mass's own share of the chunk). */
  stampAttempts: 26,
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
