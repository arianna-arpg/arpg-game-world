import type { MapCoord } from './coords';
import { regionCellHash as hashCell } from './regionGeometry';
/** Native realm geometry is unweighted nearest-site ownership. It intentionally
 * differs from surface weighted regions and their different-biome depth. */
export function nativeDimensionSite(coord: MapCoord, seed: number, policy: {readonly cellSpan:number;readonly jitter:number}) {
  const span = policy.cellSpan, jit = policy.jitter;
  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);
  let bestGx = cx, bestGy = cy, bestPx = coord.x, bestPy = coord.y, bd = Infinity;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const gx = cx + dx, gy = cy + dy;
      const h = hashCell(gx, gy, seed);
      const px = (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const py = (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const d = (px - coord.x) ** 2 + (py - coord.y) ** 2;
      if (d < bd) { bd = d; bestGx = gx; bestGy = gy; bestPx = px; bestPy = py; }
    }
  }
  return {gx:bestGx,gy:bestGy,site:{x:bestPx,y:bestPy}};
}
/** Preserve the native depth operation separately: its source reads differ
 * from biome ownership, and depth does not depend on the chosen biome ID. */
export function nativeDimensionDepth(coord: MapCoord, seed: number, policy: {readonly cellSpan:number;readonly jitter:number}): number {
  const span = policy.cellSpan, jit = policy.jitter;
  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);
  let bd = Infinity;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const gx = cx + dx, gy = cy + dy;
      const h = hashCell(gx, gy, seed);
      const px = (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const py = (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const d = (px - coord.x) ** 2 + (py - coord.y) ** 2;
      if (d < bd) bd = d;
    }
  }
  return Math.max(0, Math.min(1, 1 - Math.sqrt(bd) / (span * 0.5)));
}
