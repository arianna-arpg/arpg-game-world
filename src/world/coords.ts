// ---------------------------------------------------------------------------
// NODE-SPACE COORDINATE VOCABULARY — the one source of truth for map directions.
//
// map.x/map.y is the world-map node coordinate system the zone graph lives in.
// This pure leaf (no engine/data imports) holds the cardinal direction vectors
// and the projection math so BOTH the engine's worldgen AND the pure world
// overlays can speak in directions/coordinates without either reaching into the
// other. worldgen re-exports these, so existing importers are unchanged; the
// demon-invasion overlay imports them directly to pick a nearby epicenter.
// ---------------------------------------------------------------------------

export type Dir = 'n' | 's' | 'e' | 'w';
export interface MapCoord { x: number; y: number }

/** The four cardinal directions, for iteration / random picks. */
export const DIRS: readonly Dir[] = ['n', 's', 'e', 'w'] as const;

/** Direction each side pushes a node on the world map (node-units). The N/S
 *  step (78) is shorter than E/W (86) because zones are wider than tall. */
export const MAP_DIR: Record<Dir, MapCoord> = {
  n: { x: 0, y: -78 }, s: { x: 0, y: 78 }, e: { x: 86, y: 0 }, w: { x: -86, y: 0 },
};

/** The opposite of each direction (a back-edge faces this way). */
export const OPP_DIR: Record<Dir, Dir> = { n: 's', s: 'n', e: 'w', w: 'e' };

/** A coordinate `steps` cardinal steps in `dir` from `from`. */
export function projectCoord(from: MapCoord, dir: Dir, steps = 1): MapCoord {
  return { x: from.x + MAP_DIR[dir].x * steps, y: from.y + MAP_DIR[dir].y * steps };
}

/** Node-space (Euclidean) distance between two coordinates. */
export function coordDist(a: MapCoord, b: MapCoord): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// --- THE SCALE LAW (seamless-world branch — docs/design/seamless-world.md) --
// ONE committed, axis-consistent conversion between node-units and world
// pixels. 32 px/unit sits inside the band the discrete game already implies
// (~27-51 px/unit from zone widths vs link spacing) and makes median node
// spacing (78/86 units → ~2500-2750px) match the median zone width band
// (2300-4400px) — adjacent layouts nearly tile at current sizes, which is
// the whole reason the map can go literal. Every seamless authority reads
// THIS constant; nothing re-derives its own scale (the two pre-existing
// literalizations — FIELD expanses' clamp(3..68) and the implied zone scale
// — reconcile onto it in M2). Discrete mode never reads it.
export const PX_PER_UNIT = 32;

/** A map coordinate's seat in seamless world pixels. */
export function mapToPx(c: MapCoord): { x: number; y: number } {
  return { x: c.x * PX_PER_UNIT, y: c.y * PX_PER_UNIT };
}

/** The map coordinate a seamless world-pixel position stands on. */
export function pxToMap(p: { x: number; y: number }): MapCoord {
  return { x: p.x / PX_PER_UNIT, y: p.y / PX_PER_UNIT };
}
