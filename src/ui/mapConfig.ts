// ---------------------------------------------------------------------------
// WORLD-MAP UI CONFIG — the overworld panel's presentation levers, plus THE
// INTERACTIVITY CONTRACT the panel renders by:
//
//   1. Only ZONE GEOMETRY answers the cursor — the disc, the waypoint diamond,
//      and their invisible hit halos. NOTHING ELSE HIT-TESTS: refreshMap wraps
//      every other layer (biome/territory washes, roads, markers, overlay
//      badges, name cards) in pointer-events:none GROUPS at the one render
//      site, so no icon, sigil, or label — present or future, from any
//      overlay — can intercept, flicker, or steal a zone's hover/click. The
//      clustered-map "dead waypoint" bug and the badge-hover flicker are
//      impossible by construction, with zero per-overlay audits.
//   2. An icon ANCHORED on a zone (a quest "?", a corpse skull) still reads
//      and travels as its zone BY GEOMETRY: it sits inside the node's hit
//      halo, so the pointer falls through to the disc beneath. (The old
//      data-zone "alias" attributes on markers are retired as redundant.)
//   3. THE ZONE PANE (#map-aside, right of the chart) is THE info surface.
//      The map itself carries NO native <title> tooltips — every icon's words
//      live in the pane instead, drawn as the SAME badge (zoneInfo folds each
//      marker's glyph/fill/stroke/detail) beside the identity chips (kind,
//      biome · level, the objective read, waypoint, port). Hover previews a
//      zone in the pane; click pins it.
//   4. NAME CARDS are an overlay layer painted above everything, shown by the
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
  /** WASH INTENSITY (Settings.mapWash persists the pick): one multiplier on
   *  every overlay layer's territory/weather WASH opacity — an feFuncA alpha
   *  slope over the under-layers, so badges/sigils stay crisp while the
   *  washes dim (< 1) or bloom (> 1). The QA read: crank it to SEE exactly
   *  where a warfront runs and how far a front reaches; 1 is the authored
   *  look, and the slider lives beside the layer chips. */
  wash: { min: 0.25, max: 3, step: 0.25, default: 1 },
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
