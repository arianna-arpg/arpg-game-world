// ---------------------------------------------------------------------------
// THE DEAD-FACE CHECKER (deadface levers chip) — the pure predicate behind
// genqa's dead-face warn and probe_deadface's invariant section, in ONE
// place so the generation-side witness and the probe gate can never drift.
//
// The class it closes: a tileset WITH variants deals ONLY variants at every
// surface mint (worldgen's face pick has no base slot) — so a base-layout
// doodad kind absent from every variant + common layout is authored fiction
// that never stands in the world (the needles precedent; the 42 countries
// healed by PLAIN_FACES). A tileset that trips this either restates its
// plain face as a variant (the PLAIN_FACES lane) or hoists the kind into
// common / a face. probe_deadface keeps its own independent sweep as the
// second witness and cross-checks it against this one.
// ---------------------------------------------------------------------------

import type { TilesetDef } from '../src/data/tilesets';

/** Surface-pooled: reachable by placeZoneAt's face pick (frontier pool or a
 *  realm dimension pool) — the lane where the base face never rolls bare.
 *  The cave lane (frontier: false, no realm) keeps its base face live by
 *  default (mintCave rolls variants only behind caveFace.variantChance), so
 *  it is exempt by construction. */
export const surfacePooledTileset = (t: TilesetDef): boolean =>
  !!t.biome && (t.frontier !== false || !!t.realm);

/** Base-layout kinds of a surface-pooled, variant-bearing tileset that no
 *  variant and no common row carries — dead on the live path. Empty =
 *  clean (also, vacuously, for tilesets outside the affected lane). */
export function deadBaseFaceKinds(t: TilesetDef): string[] {
  if (!t.variants?.length || !surfacePooledTileset(t)) return [];
  const live = new Set([
    ...(t.common ?? []).map(r => r.kind),
    ...t.variants.flatMap(v => v.layout.map(r => r.kind)),
  ]);
  return [...new Set((t.layout ?? []).map(r => r.kind).filter(k => !live.has(k)))];
}
