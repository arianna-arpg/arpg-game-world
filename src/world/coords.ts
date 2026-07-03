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
