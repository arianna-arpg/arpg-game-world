import { lightCornerQuery } from './lightCorners';
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
const BASE_ANGLES = Float64Array.from({ length: RAYS }, (_, i) => (i / RAYS) * TWO_PI);
const BASE_COS = Float64Array.from(BASE_ANGLES, a => Math.cos(a));
const BASE_SIN = Float64Array.from(BASE_ANGLES, a => Math.sin(a));
const baseEnds = new Float64Array(RAYS);
let scratchAngles = new Float64Array(512);
const fromScratch = { x: 0, y: 0 };
const targetScratch = { x: 0, y: 0 };
const elevScratch = { from: 0, to: 0 };

const polyMeta = new WeakMap<readonly { x: number; y: number }[], { minEnd: number }>();

/** Minimum distance from the light source to any vertex of `poly` (when `>= targetR`,
 *  a concentric disc of radius `targetR` lies strictly inside `poly` and needs no clip). */
export function polyMinEnd(poly: readonly { x: number; y: number }[]): number {
  return polyMeta.get(poly)?.minEnd ?? 0;
}

/** Terrain lights share the exact cell crossings used by native sight. The
 * source's story determines which decks and hanging walls stop its light.
 * Exact cell crossings also avoid thin corner leaks from sampled marching.
 * The small near-face overlap is decorative, not a gameplay visibility grant. */
export function litPolygon(world: Pick<World, 'walk'>, x: number, y: number, r: number, tier = 0):
  { x: number; y: number }[] | null {
  const grid = (isCellWalkField(world.walk) ? world.walk : null);
  if (!grid || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r) || !Number.isFinite(tier) || r <= 0) {
    return null;
  }
  const q = lightCornerQuery(grid, x, y, r, tier);
  if (!q.anyBlocker) return null;
  const eye = tier + LOS_CFG.elev.eye;
  elevScratch.from = eye;
  elevScratch.to = eye;
  fromScratch.x = x;
  fromScratch.y = y;
  const pad = grid.cellSize * 0.3;
  let minEnd = r;
  if (q.corners.length === 0) {
    let hitAny = false;
    for (let i = 0; i < RAYS; i++) {
      const dx = BASE_COS[i], dy = BASE_SIN[i];
      targetScratch.x = x + dx * r;
      targetScratch.y = y + dy * r;
      const hit = castGridRay(grid, fromScratch, targetScratch, 'sight', elevScratch);
      const end = hit === null ? r : Math.min(r, hit * r + pad);
      baseEnds[i] = end;
      if (hit !== null) {
        hitAny = true;
        if (end < minEnd) minEnd = end;
      }
    }
    if (!hitAny) return null;
    const pts = new Array<{ x: number; y: number }>(RAYS);
    for (let i = 0; i < RAYS; i++) {
      const end = baseEnds[i];
      pts[i] = { x: x + BASE_COS[i] * end, y: y + BASE_SIN[i] * end };
    }
    polyMeta.set(pts, { minEnd });
    return pts;
  }
  const needed = RAYS + q.corners.length * 3;
  if (scratchAngles.length < needed) {
    scratchAngles = new Float64Array(Math.max(needed, scratchAngles.length * 2));
  }
  scratchAngles.set(BASE_ANGLES, 0);
  let count = RAYS;
  for (let ci = 0; ci < q.corners.length; ci++) {
    const corner = q.corners[ci];
    const a = Math.atan2(corner.y - y, corner.x - x);
    scratchAngles[count++] = (a - 0.00001 + TWO_PI) % TWO_PI;
    scratchAngles[count++] = (a + TWO_PI) % TWO_PI;
    scratchAngles[count++] = (a + 0.00001 + TWO_PI) % TWO_PI;
  }
  const active = scratchAngles.subarray(0, count);
  active.sort();
  let hitAny = false;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const a = active[i];
    const dx = Math.cos(a), dy = Math.sin(a);
    targetScratch.x = x + dx * r;
    targetScratch.y = y + dy * r;
    const hit = castGridRay(grid, fromScratch, targetScratch, 'sight', elevScratch);
    const end = hit === null ? r : Math.min(r, hit * r + pad);
    if (hit !== null) {
      hitAny = true;
      if (end < minEnd) minEnd = end;
    }
    pts.push({ x: x + dx * end, y: y + dy * end });
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
