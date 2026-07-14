// ---------------------------------------------------------------------------
// WORLD-MAP UI CONFIG — the overworld panel's presentation levers, plus THE
// INTERACTIVITY CONTRACT the panel renders by:
//
//   1. Only ZONE GEOMETRY answers the cursor — the disc, the waypoint diamond,
//      and their invisible hit halos below. TEXT NEVER HIT-TESTS (name cards,
//      sub-lines, "YOU ARE HERE", marker glyphs all ride pointer-events:none),
//      so a label can never cover a neighbor's waypoint and steal its click —
//      the clustered-map "dead waypoint" bug is impossible by construction.
//   2. Anything ANCHORED on a zone (a quest "?", a corpse skull) is an ALIAS
//      of that zone's interactivity, never an occluder: it carries the zone's
//      hover identity, and the zone's travel click when one exists.
//   3. NAME CARDS are an overlay layer painted above everything, shown by the
//      MAP_LABEL_MODES policy below (Settings.mapLabels persists the choice);
//      ZONE_KINDS entries with pinLabel (data/zoneKinds.ts — towns) keep
//      their card in every mode.
//
// New label modes register here (the options button cycles the registry);
// hit-forgiveness and card geometry are tunables, never magic numbers inline.
// ---------------------------------------------------------------------------

export type MapLabelMode = 'hover' | 'always';

export interface MapLabelModeDef {
  id: MapLabelMode;
  /** Options-button face. */
  name: string;
  /** Options-button tooltip line. */
  blurb: string;
}

export const MAP_LABEL_MODES: MapLabelModeDef[] = [
  {
    id: 'hover', name: 'ON HOVER',
    blurb: 'a clean chart — a zone’s name card rises under the cursor (and stays for the pinned zone, the zone you stand in, and towns)',
  },
  {
    id: 'always', name: 'ALWAYS',
    blurb: 'every charted zone wears its name, classic-map style (names never block clicks in any mode)',
  },
];

export const MAP_CFG = {
  /** Default name-card mode (Settings.mapLabels persists the player's pick). */
  labelMode: 'hover' as MapLabelMode,
  /** Invisible hit halo around every zone disc — hover/click forgiveness so
   *  the pointer target matches what the eye reads as "the zone". */
  nodeHitR: 14,
  /** Invisible hit halo around a waypoint diamond (the 9px diamond alone is a
   *  fiddly travel click). */
  wpHitR: 9,
  /** Name-card geometry: width is estimated from text length (charW per name
   *  glyph at font 11, subCharW per sub glyph at font 9) — an SVG string
   *  render has no measureText, and a tooltip card only needs to hug. */
  card: {
    charW: 6.6, subCharW: 5.4, padX: 6,
    /** Rect top, relative to the node center (name baseline sits at +26). */
    top: 15,
    /** Rect heights: name-only, and name + sub-line. */
    h: 16, hWithSub: 28,
    rx: 4,
    fill: 'rgba(10,10,16,0.92)', stroke: '#4a4a5e',
  },
} as const;
