import { GridWalkField } from '../world/gridWalk';
import { blocksMovement, hitSurfaceOf, type Doodad } from './levelgen';
import { shapeAabbHalf, shapeDistance } from './shapes';
import type { Vec2 } from '../core/math';

interface NavigationHost {
  doodads: readonly Doodad[];
  time: number;
  doodadFamilyRev(id: string): number;
}
interface Entry {
  version: number; revision: number; source: readonly Doodad[]; count: number;
  grid: GridWalkField; time: number;
}
const cache = new WeakMap<NavigationHost, WeakMap<GridWalkField, Map<number, Entry>>>();

/** Furniture is collision geometry even when a zone already has a floor grid.
 * Keep its advisory navigation separate: painting these walls into the live
 * floor would change shadows, floors, falls and generation ownership. */
export function doodadNavigation(host: NavigationHost, base: GridWalkField, tier: number, pad: number,
  bridges: readonly { pos: Vec2; radius: number }[] = []): GridWalkField {
  let fields = cache.get(host);
  if (!fields) cache.set(host, fields = new WeakMap());
  let stories = fields.get(base);
  if (!stories) fields.set(base, stories = new Map());
  const revision = host.doodadFamilyRev('nav-block');
  let entry = stories.get(tier);
  if (!entry || entry.version !== base.version || entry.revision !== revision
    || entry.source !== host.doodads || entry.count !== host.doodads.length) {
    const solids = host.doodads.filter(d => (d.tier ?? 0) === tier && blocksMovement(d));
    let grid = base;
    if (solids.length) {
      grid = GridWalkField.unpack(base.pack());
      const cs = grid.cell, mask = grid.mask;
      // A derived story can have a different floor mask from its region kinds.
      for (let y = 0; y < grid.rows; y++) for (let x = 0; x < grid.cols; x++) {
        mask[y * grid.cols + x] = base.isWalkable((x + .5) * cs, (y + .5) * cs) ? 1 : 0;
      }
      for (const d of solids) {
        const shape = hitSurfaceOf(d, 'move'), { ex, ey } = shapeAabbHalf(shape);
        const x0 = Math.max(0, Math.floor((d.pos.x - ex - pad) / cs));
        const x1 = Math.min(grid.cols - 1, Math.floor((d.pos.x + ex + pad) / cs));
        const y0 = Math.max(0, Math.floor((d.pos.y - ey - pad) / cs));
        const y1 = Math.min(grid.rows - 1, Math.floor((d.pos.y + ey + pad) / cs));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const px = (x + .5) * cs, py = (y + .5) * cs;
          if (shapeDistance(shape, d.pos.x, d.pos.y, px, py) >= pad) continue;
          if (d.kind === 'chasm' && bridges.some(b => Math.hypot(px - b.pos.x, py - b.pos.y) <= b.radius)) continue;
          grid.fillRegion(px, py, px, py, 'wall', true);
        }
      }
    }
    entry = { version:base.version, revision, source:host.doodads, count:host.doodads.length, grid, time:host.time };
    stories.set(tier, entry);
  }
  if (entry.time !== host.time) { if (entry.grid !== base) entry.grid.beginFrame(); entry.time = host.time; }
  return entry.grid;
}
