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
import { GridWalkField } from '../../world/gridWalk';
import { castGridRay, LOS_CFG } from '../../engine/los';

const RAYS = 48;
const BASE_ANGLES = Float64Array.from({ length: RAYS }, (_, i) => (i / RAYS) * Math.PI * 2);
const BASE_COS = Float64Array.from(BASE_ANGLES, a => Math.cos(a));
const BASE_SIN = Float64Array.from(BASE_ANGLES, a => Math.sin(a));
const baseEnds = new Float64Array(RAYS);
const targetScratch = { x: 0, y: 0 };

/** Terrain lights share the exact cell crossings used by native sight. The
 * source's story determines which decks and hanging walls stop its light.
 * Exact cell crossings also avoid thin corner leaks from sampled marching.
 * The small near-face overlap is decorative, not a gameplay visibility grant. */
export function litPolygon(world: Pick<World, 'walk'>, x: number, y: number, r: number, tier = 0):
  { x: number; y: number }[] | null {
  const grid = (world.walk instanceof GridWalkField ? world.walk : null);
  if (!grid || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r) || !Number.isFinite(tier) || r <= 0) {
    return null;
  }
  const q = lightCornerQuery(grid, x, y, r, tier);
  if (!q.anyBlocker) return null;
  const eye = tier + LOS_CFG.elev.eye;
  const elev = { from: eye, to: eye };
  const from = { x, y };
  const pad = grid.cellSize * 0.3;
  if (q.corners.length === 0) {
    let hitAny = false;
    for (let i = 0; i < RAYS; i++) {
      const dx = BASE_COS[i], dy = BASE_SIN[i];
      targetScratch.x = x + dx * r;
      targetScratch.y = y + dy * r;
      const hit = castGridRay(grid, from, targetScratch, 'sight', elev);
      baseEnds[i] = hit === null ? r : Math.min(r, hit * r + pad);
      if (hit !== null) hitAny = true;
    }
    if (!hitAny) return null;
    const pts = new Array<{ x: number; y: number }>(RAYS);
    for (let i = 0; i < RAYS; i++) {
      const end = baseEnds[i];
      pts[i] = { x: x + BASE_COS[i] * end, y: y + BASE_SIN[i] * end };
    }
    return pts;
  }
  const angles = Array.from(BASE_ANGLES);
  for (const corner of q.corners) {
    const a = Math.atan2(corner.y - y, corner.x - x);
    angles.push(
      (a - 0.00001 + Math.PI * 2) % (Math.PI * 2),
      (a + Math.PI * 2) % (Math.PI * 2),
      (a + 0.00001 + Math.PI * 2) % (Math.PI * 2),
    );
  }
  angles.sort((a, b) => a - b);
  let hitAny = false;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i];
    const dx = Math.cos(a), dy = Math.sin(a);
    targetScratch.x = x + dx * r;
    targetScratch.y = y + dy * r;
    const hit = castGridRay(grid, from, targetScratch, 'sight', elev);
    const end = hit === null ? r : Math.min(r, hit * r + pad);
    hitAny ||= hit !== null;
    pts.push({ x: x + dx * end, y: y + dy * end });
  }
  return hitAny ? pts : null;
}

export interface LightSightEntry {
  poly: { x: number; y: number }[];
  path?: Path2D;
}

/** Static lights keep their polygon until their terrain or geometry changes.
 * Grid identity matters: a replaced grid may restart at the same revision.
 * Movable light sources and resized wells must never reuse an old silhouette. */
export class LightSightCache {
  private entries = new WeakMap<object, { grid: GridWalkField | null; version: number;
    x: number; y: number; r: number; tier: number; entry: LightSightEntry | null }>();

  readEntry(world: Pick<World, 'walk'>, key: object, x: number, y: number, r: number, tier = 0): LightSightEntry | null {
    const grid = (world.walk instanceof GridWalkField ? world.walk : null), version = grid?.version ?? 0;
    const old = this.entries.get(key);
    if (old && old.grid === grid && old.version === version && old.x === x && old.y === y && old.r === r && old.tier === tier)
      return old.entry;
    const poly = litPolygon(world, x, y, r, tier);
    const entry: LightSightEntry | null = poly
      ? { poly, path: typeof Path2D !== 'undefined' ? polygonPath(poly) : undefined }
      : null;
    this.entries.set(key, { grid, version, x, y, r, tier, entry });
    return entry;
  }

  read(world: Pick<World, 'walk'>, key: object, x: number, y: number, r: number, tier = 0): ReturnType<typeof litPolygon> {
    return this.readEntry(world, key, x, y, r, tier)?.poly ?? null;
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
