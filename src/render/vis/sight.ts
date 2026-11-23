import { lightCornersInto, type LightCornerPoint } from './lightCorners';
// ---------------------------------------------------------------------------
// LIGHT SIGHTLINES — the lit-region polygon of a point source against the
// walk grid's sight-blocking cells (wall/rampart/flesh_wall/…): rays march
// outward and stop where a blocksSight region stands, so a hearth's glow
// POOLS at the wall instead of bleeding through it. Windows and parapets
// don't block sight, so an arrow-slit spills light — for free, by data.
//
// Returns null when nothing blocks within reach (the overwhelmingly common
// case) so every caller keeps its cheap plain-disc path. Consumers: the
// light layer's darkness punches and any painter's warm ground halo.
// ---------------------------------------------------------------------------

import type { World } from '../../engine/world';
import { isCellWalkField, type CellWalkField } from '../../world/tiledWalk';
import { castGridRay, LOS_CFG } from '../../engine/los';

const RAYS = 48;
const TWO_PI = Math.PI * 2;
const BASE_ANGLES = new Float64Array(RAYS);
const BASE_COS = new Float64Array(RAYS);
const BASE_SIN = new Float64Array(RAYS);
for (let i = 0; i < RAYS; i++) {
  const a = (i / RAYS) * TWO_PI;
  BASE_ANGLES[i] = a;
  BASE_COS[i] = Math.cos(a);
  BASE_SIN[i] = Math.sin(a);
}

const scratchCorners: LightCornerPoint[] = [];
let scratchAngles = new Float64Array(512);
const scratchFrom = { x: 0, y: 0 };
const scratchTo = { x: 0, y: 0 };
const scratchElev = { from: 0, to: 0 };

const polyMeta = new WeakMap<readonly { x: number; y: number }[], { minEnd: number; path?: Path2D }>();

/** Minimum distance from the light source to any vertex of `poly` (when `>= targetR`,
 *  a concentric disc of radius `targetR` lies strictly inside `poly` and needs no clip!). */
export function polyMinEnd(poly: readonly { x: number; y: number }[]): number {
  return polyMeta.get(poly)?.minEnd ?? 0;
}

/** Cached world-space `Path2D` for `poly` (eliminating per-frame Path2D re-allocations
 *  and allowing Skia to cache tessellation across frames). */
export function worldPolyPath(poly: { x: number; y: number }[]): Path2D {
  let meta = polyMeta.get(poly);
  if (meta?.path) return meta.path;
  const path = polygonPath(poly);
  if (meta) meta.path = path;
  else polyMeta.set(poly, { minEnd: 0, path });
  return path;
}

/** Terrain lights share the exact cell crossings used by native sight. The
 * source's story determines which decks and hanging walls stop its light.
 * Exact cell crossings also avoid thin corner leaks from sampled marching.
 * The small near-face overlap is decorative, not a gameplay visibility grant. */
export function litPolygon(world: Pick<World, 'walk'>, x: number, y: number, r: number, tier = 0):
  { x: number; y: number }[] | null {
  const grid = (isCellWalkField(world.walk) ? world.walk : null);
  if (!grid || ![x, y, r, tier].every(Number.isFinite) || r <= 0) return null;
  if (!lightCornersInto(grid, x, y, r, tier, scratchCorners)) return null;

  const eye = tier + LOS_CFG.elev.eye;
  scratchFrom.x = x;
  scratchFrom.y = y;
  scratchElev.from = eye;
  scratchElev.to = eye;
  const pad = grid.cellSize * 0.3;
  const pts: { x: number; y: number }[] = [];
  let hitAny = false;
  let minEnd = r;

  if (scratchCorners.length === 0) {
    for (let i = 0; i < RAYS; i++) {
      const dx = BASE_COS[i], dy = BASE_SIN[i];
      scratchTo.x = x + dx * r;
      scratchTo.y = y + dy * r;
      const hit = castGridRay(grid, scratchFrom, scratchTo, 'sight', scratchElev);
      let end = r;
      if (hit !== null) {
        hitAny = true;
        end = Math.min(r, hit * r + pad);
        if (end < minEnd) minEnd = end;
      }
      pts.push({ x: x + dx * end, y: y + dy * end });
    }
  } else {
    const needed = RAYS + scratchCorners.length * 3;
    if (scratchAngles.length < needed) {
      scratchAngles = new Float64Array(Math.max(needed, scratchAngles.length * 2));
    }
    scratchAngles.set(BASE_ANGLES, 0);
    let count = RAYS;
    for (let ci = 0; ci < scratchCorners.length; ci++) {
      const corner = scratchCorners[ci];
      const a = Math.atan2(corner.y - y, corner.x - x);
      scratchAngles[count++] = (a - 0.00001 + TWO_PI) % TWO_PI;
      scratchAngles[count++] = (a + TWO_PI) % TWO_PI;
      scratchAngles[count++] = (a + 0.00001 + TWO_PI) % TWO_PI;
    }
    const active = scratchAngles.subarray(0, count);
    active.sort();
    for (let i = 0; i < count; i++) {
      const a = active[i];
      const dx = Math.cos(a), dy = Math.sin(a);
      scratchTo.x = x + dx * r;
      scratchTo.y = y + dy * r;
      const hit = castGridRay(grid, scratchFrom, scratchTo, 'sight', scratchElev);
      let end = r;
      if (hit !== null) {
        hitAny = true;
        end = Math.min(r, hit * r + pad);
        if (end < minEnd) minEnd = end;
      }
      pts.push({ x: x + dx * end, y: y + dy * end });
    }
  }

  if (!hitAny) return null;
  polyMeta.set(pts, { minEnd });
  return pts;
}

/** Static lights keep their polygon until their terrain or geometry changes.
 * Grid identity matters: a replaced grid may restart at the same revision.
 * Movable light sources and resized wells must never reuse an old silhouette. */
export class LightSightCache {
  private entries = new WeakMap<object, { grid: CellWalkField | null; version: number;
    x: number; y: number; r: number; tier: number; poly: ReturnType<typeof litPolygon> }>();
  read(world: Pick<World, 'walk'>, key: object, x: number, y: number, r: number, tier = 0): ReturnType<typeof litPolygon> {
    const grid = (isCellWalkField(world.walk) ? world.walk : null), version = grid?.version ?? 0;
    const old = this.entries.get(key);
    if (old && old.grid === grid && old.version === version && old.x === x && old.y === y && old.r === r && old.tier === tier)
      return old.poly;
    const poly = litPolygon(world, x, y, r, tier);
    this.entries.set(key, { grid, version, x, y, r, tier, poly });
    return poly;
  }
}

/** Build a clip path from a lit polygon under an (optional) point transform —
 *  shared by the light buffer (screen space) and world-space painters. */
export function polygonPath(poly: { x: number; y: number }[],
  fx: (x: number) => number = x => x, fy: (y: number) => number = y => y): Path2D {
  const path = new Path2D();
  for (let i = 0; i < poly.length; i++) {
    const px = fx(poly[i].x), py = fy(poly[i].y);
    if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
  }
  path.closePath();
  return path;
}
