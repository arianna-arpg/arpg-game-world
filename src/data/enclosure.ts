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
