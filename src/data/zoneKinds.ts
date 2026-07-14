// ---------------------------------------------------------------------------
// ZONE KINDS — the identity vocabulary for special classes of zone (the town
// today; sanctums, outposts, fair-grounds tomorrow). A ZoneDef opts in via
// `kind: '<id>'`, and everything the kind MEANS is data here: the world map's
// indicator (a second ring + a glyph inside the disc — never an occluder of
// neighbors), the un-hideable name card, the info-pane chip. A new kind is
// one entry; the map renders it with zero edits.
//
// Identity, not state: worldstate's sanitizer re-asserts the LIVE registry's
// kind for authored zones on save-restore (so a save minted before the town
// was kinded still wakes wearing the ring), and culls kinds that no longer
// resolve here — the tolerance doctrine.
// ---------------------------------------------------------------------------

export interface ZoneKindDef {
  id: string;
  /** Chip / card label ('Town'). */
  label: string;
  /** Short card sub-line ('sanctuary'); shown in place of the biome ·
   *  monster-level line, which a kinded zone usually has no use for. */
  subLabel?: string;
  /** The name card ignores the map-labels option — NEVER hidden. A town must
   *  be findable at a glance, whatever chart style the player runs. */
  pinLabel?: boolean;
  /** Map indicator: a second concentric ring just outside the zone disc
   *  (walled-settlement cartography — visible at any zoom, occludes nothing). */
  ring?: { color: string; width?: number; gap?: number };
  /** Map indicator: a glyph INSIDE the zone disc (the disc is the zone's own
   *  footprint, so the glyph can never cover a neighbor's controls). */
  glyph?: { char: string; color: string; size?: number; dy?: number };
  /** Name-card text tint (else the charted default). */
  labelColor?: string;
}

export const ZONE_KINDS: Record<string, ZoneKindDef> = {
  town: {
    id: 'town',
    label: 'Town',
    subLabel: 'sanctuary',
    pinLabel: true,
    ring: { color: '#ffd700' },
    glyph: { char: '⌂', color: '#241c06' },
    labelColor: '#ffe9a8',
  },
};

/** The kind def a zone wears, if any (open string id — unknown ids read as
 *  plain ground rather than crashing a map render mid-run). */
export function zoneKindOf(z: { kind?: string }): ZoneKindDef | undefined {
  return z.kind ? ZONE_KINDS[z.kind] : undefined;
}
