import { MAP_CFG } from './mapConfig';

export interface MapBounds { minX: number; minY: number; w: number; h: number }
export function mapZoomLabel(zoom: number): string {
  const percent = zoom * 100;
  return `${percent >= 1 ? Math.round(percent) : Number(percent.toPrecision(2))}%`;
}
/** Percentage is relative to a fixed home-scale square, even after resume.
 * Expanding knowledge unlocks smaller percentages, never coarser close-ups. */
export function mapZoomLimits(bounds: MapBounds) {
  return { minZoom: Math.min(1, MAP_CFG.viewport.startSide / Math.max(bounds.w, bounds.h, 1)), maxZoom: 1 };
}
export function mapViewport(bounds: MapBounds, zoom: number, pan: { x: number; y: number }) {
  const z = Math.min(1, Math.max(mapZoomLimits(bounds).minZoom, zoom));
  const side = MAP_CFG.viewport.startSide / z;
  const extent = Math.max(bounds.w, bounds.h, MAP_CFG.viewport.startSide);
  const limit = Math.max(0, (extent - side) / 2);
  const x = Math.max(-limit, Math.min(limit, pan.x)), y = Math.max(-limit, Math.min(limit, pan.y));
  return { zoom: z, pan: { x, y }, side,
    cx: bounds.minX + bounds.w / 2 + x, cy: bounds.minY + bounds.h / 2 + y };
}

/** Generation is not exploration. Only footsteps or explicit cartography can
 * enlarge the fitted chart; a newly visible neighbour or marker cannot. */
export function explorationMapBounds(
  zones: readonly { id: string; map: { x: number; y: number } }[],
  visited: ReadonlySet<string>, surveyed: ReadonlySet<string>,
  fallback: { x: number; y: number }, omniscient = false,
): MapBounds {
  const known = zones.filter(z => omniscient || visited.has(z.id) || surveyed.has(z.id));
  const points = known.length ? known.map(z => z.map) : [fallback];
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs) - 95, minY = Math.min(...ys) - 80;
  return { minX, minY, w: Math.max(...xs) + 95 - minX, h: Math.max(...ys) + 85 - minY };
}
