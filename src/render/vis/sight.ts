import { lightCorners } from './lightCorners';
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
import { regionGrid, type RegionGrid } from '../../world/walk';
import { castGridRay, LOS_CFG } from '../../engine/los';

const RAYS = 48;

/** Terrain lights share the exact cell crossings used by native sight. The
 * source's story determines which decks and hanging walls stop its light.
 * Exact cell crossings also avoid thin corner leaks from sampled marching.
 * The small near-face overlap is decorative, not a gameplay visibility grant. */
export function litPolygon(world: Pick<World, 'walk'>, x: number, y: number, r: number, tier = 0):
  { x: number; y: number }[] | null {
  const grid = regionGrid(world.walk);
  if (!grid || ![x, y, r, tier].every(Number.isFinite) || r <= 0) return null;
  const eye = tier + LOS_CFG.elev.eye;
  const from = { x, y }, pts: { x: number; y: number }[] = [];
  let hitAny = false;
  const angles = Array.from({length:RAYS},(_,i)=>i/RAYS*Math.PI*2);
  for (const corner of lightCorners(grid,x,y,r,tier)) {
    const a = Math.atan2(corner.y-y,corner.x-x);
    for (const offset of [-0.00001,0,0.00001]) angles.push((a+offset+Math.PI*2)%(Math.PI*2));
  }
  angles.sort((a,b)=>a-b);
  for (const a of angles) {
    const dx = Math.cos(a), dy = Math.sin(a);
    const hit = castGridRay(grid, from, { x: x + dx * r, y: y + dy * r }, 'sight', { from: eye, to: eye });
    const end = hit === null ? r : Math.min(r, hit * r + grid.cellSize * 0.3);
    hitAny ||= hit !== null;
    pts.push({ x: x + dx * end, y: y + dy * end });
  }
  return hitAny ? pts : null;
}

/** Static lights keep their polygon until their terrain or geometry changes.
 * Grid identity matters: a replaced grid may restart at the same revision.
 * Movable light sources and resized wells must never reuse an old silhouette. */
export class LightSightCache {
  private entries = new WeakMap<object, { grid: RegionGrid | null; version: number;
    x: number; y: number; r: number; tier: number; poly: ReturnType<typeof litPolygon> }>();
  read(world: Pick<World, 'walk'>, key: object, x: number, y: number, r: number, tier = 0): ReturnType<typeof litPolygon> {
    const grid = regionGrid(world.walk), version = grid?.version ?? 0;
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
