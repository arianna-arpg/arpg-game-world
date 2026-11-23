import type { GridWalkField } from '../../world/gridWalk';
import { regionKind } from '../../world/regions';
import { tierElevOf } from '../../engine/tiers';
import { LOS_CFG } from '../../engine/los';

type Grid = Pick<GridWalkField, 'cellSize' | 'version' | 'regionAt'>;
export type LightCornerPoint = { x: number; y: number };
interface CachedCornerBlock {
  hasBlocker: boolean;
  corners: LightCornerPoint[];
}
const BLOCK = 16, CACHE_BLOCKS = 384, MAX_QUERY_BLOCKS = 64;
const caches = new WeakMap<Grid, { version: number; blocks: Map<string, CachedCornerBlock> }>();

/** Populate `outPoints` with exposed terrain corners within `r` of `(x, y)` and
 *  return `true` if ANY sight-blocking cell exists in the touching block window
 *  (when `false`, no sight ray of length `r` can hit anything — caller skips all
 *  48+ ray-marches in O(1)!). */
export function lightCornersInto(
  grid: Grid,
  x: number,
  y: number,
  r: number,
  tier: number,
  outPoints: LightCornerPoint[],
): boolean {
  outPoints.length = 0;
  const span = grid.cellSize * BLOCK;
  const x0 = Math.floor((x - r) / span), x1 = Math.floor((x + r) / span);
  const y0 = Math.floor((y - r) / span), y1 = Math.floor((y + r) / span);
  // Extremely fine grids / authoring-only giant lights retain the bounded
  // radial path. Never turn a light query into an unbounded terrain scan.
  if ((Math.ceil(2 * r / span) + 1) ** 2 > MAX_QUERY_BLOCKS) return true;
  let cache = caches.get(grid);
  if (!cache || cache.version !== grid.version) {
    cache = { version: grid.version, blocks: new Map() };
    caches.set(grid, cache);
  }
  const cs = grid.cellSize, eye = tier + LOS_CFG.elev.eye;
  const r2 = r * r;
  let anyBlocker = false;
  for (let by = y0; by <= y1; by++) {
    for (let bx = x0; bx <= x1; bx++) {
      const key = bx + ',' + by + ',' + tier;
      let blk = cache.blocks.get(key);
      if (!blk) {
        const corners: LightCornerPoint[] = [];
        let hasBlocker = false;
        const cells = new Uint8Array((BLOCK + 1) * (BLOCK + 1));
        for (let j = 0; j <= BLOCK; j++) {
          for (let i = 0; i <= BLOCK; i++) {
            const id = grid.regionAt((bx * BLOCK + i - 0.5) * cs, (by * BLOCK + j - 0.5) * cs);
            const kind = regionKind(id), deck = tierElevOf(id);
            const solid = Number(
              (!!kind?.blocksSight && (deck === null || eye < deck))
              || (kind?.hangingFrom !== undefined && eye >= kind.hangingFrom),
            );
            if (solid) hasBlocker = true;
            cells[j * (BLOCK + 1) + i] = solid;
          }
        }
        if (hasBlocker) {
          for (let j = 0; j < BLOCK; j++) {
            for (let i = 0; i < BLOCK; i++) {
              const a = j * (BLOCK + 1) + i;
              const mask = cells[a] | (cells[a + 1] << 1) | (cells[a + BLOCK + 1] << 2) | (cells[a + BLOCK + 2] << 3);
              if (mask === 0 || mask === 15 || mask === 3 || mask === 12 || mask === 5 || mask === 10) continue;
              corners.push({ x: (bx * BLOCK + i) * cs, y: (by * BLOCK + j) * cs });
            }
          }
        }
        blk = { hasBlocker, corners };
        cache.blocks.set(key, blk);
        while (cache.blocks.size > CACHE_BLOCKS) {
          cache.blocks.delete(cache.blocks.keys().next().value!);
        }
      } else if (cache.blocks.size > ((CACHE_BLOCKS * 3) >> 2)) {
        cache.blocks.delete(key);
        cache.blocks.set(key, blk);
      }
      if (!blk.hasBlocker) continue;
      anyBlocker = true;
      const corners = blk.corners;
      for (let ci = 0; ci < corners.length; ci++) {
        const p = corners[ci];
        const dx = p.x - x, dy = p.y - y;
        if (dx * dx + dy * dy < r2) outPoints.push(p);
      }
    }
  }
  return anyBlocker;
}

/** Cache exposed terrain corners in bounded world blocks. Rays on both sides
 * of these exact bearings stop the fixed radial fan from snapping when a
 * moving light grazes a corner. Flat faces need no extra rays. */
export function lightCorners(grid: Grid, x: number, y: number, r: number, tier: number): readonly LightCornerPoint[] {
  const points: LightCornerPoint[] = [];
  lightCornersInto(grid, x, y, r, tier, points);
  return points;
}
