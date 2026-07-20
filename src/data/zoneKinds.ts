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
  /** ROADS touching a zone of this kind draw in the SEA-LANE stroke (dashed,
   *  the naval blue) — the crossing is water, not ground. Any water-hub kind
   *  opts in with one word; `color` overrides the naval default. */
  lanes?: { color?: string };
  /** Keep the biome line's monster-level on the name card (kinded zones
   *  usually replace it — a sea is still dangerous ground). */
  keepLevel?: boolean;
  /** STATIC EXITS (the sealed-shores law): this kind's edge set is exactly
   *  its dealt exits, FOREVER — the world web may never forge new roads into
   *  it (linkBackTo refuses, nearestLinkable skips; frontiers that would
   *  have reached it resolve to its port interface instead — the sea-harbor
   *  law). Registry-driven like the roadless gate hub: no per-zone flag,
   *  existing saves heal by construction. The one door left open is the
   *  explicit World.notarizeRoad seam — a quest or event that MEANS to cut
   *  a new shore says so in code, never by accident. */
  staticExits?: boolean;
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
  // THE INLAND SEA (world/soulriver.ts): every strewn River of Souls wears
  // this — the node reads as WATER on the chart (ship glyph, pale ring,
  // lane-styled roads), the sea-fabric read below ground. The live ferry
  // markers ride mapMarkers' soul-ship source; the ribbon is the biome wash.
  soulriver: {
    id: 'soulriver',
    label: 'Inland Sea',
    subLabel: 'the Soul-Ship calls at every shore',
    ring: { color: '#4a8ab0' },
    glyph: { char: '⛴', color: '#0e2233' },
    labelColor: '#9fd8ec',
    lanes: {},
    keepLevel: true,
    // The sealed-shores law: the river's doors are its dealt landings —
    // the web routes corridor frontiers to the nearest PORT instead
    // (chartFrontier), and nothing links in uninvited.
    staticExits: true,
  },
};

/** The kind def a zone wears, if any (open string id — unknown ids read as
 *  plain ground rather than crashing a map render mid-run). */
export function zoneKindOf(z: { kind?: string }): ZoneKindDef | undefined {
  return z.kind ? ZONE_KINDS[z.kind] : undefined;
}
