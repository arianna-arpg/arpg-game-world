import { vec, type Vec2 } from '../core/math';
import { insideBounds, type Bounds } from '../world/shape';
import type { CollisionResult } from '../world/regions';
import { blocksMovement, hitSurfaceOf, pitRegionOf, type Doodad } from './levelgen';
import { shapeDistance } from './shapes';
import { SPATIAL_CFG } from './spatial';
import { sweepBodyShape } from './bodySweep';

export interface DoodadMovementHost {
  arena: Bounds;
  doodadsAt(x:number,y:number): readonly Doodad[];
  doodadsNear(x:number,y:number,reach:number): readonly Doodad[];
}

/** Continuous furniture contact for moves, separate from placement rescue.
 * Endpoint push-outs can tunnel across a trunk or pingpong through a rock
 * union, moving the eye tens of pixels and swinging every sight shadow.
 * Start on clear ground, stop at the first contact, and slide the remaining
 * displacement. An old embedded spawn keeps the placement repair below. */
export function sweepDoodadMove(host: DoodadMovementHost, bridges: readonly { pos:Vec2; radius:number }[], from: Vec2, to: Vec2, radius: number, tier: number,
  collision?: CollisionResult, slide = true): boolean {
  // An out-of-bounds origin is a placement repair, not a legal movement
  // path. Sweeping from it could repeatedly stop the bounds recovery at
  // exterior furniture and strand the body outside the playable arena.
  if (!insideBounds(from, Math.max(0, radius - 1e-4), host.arena)) return false;
  const solid = (o: Doodad, x: number, y: number): boolean => (o.tier ?? 0) === tier
    && blocksMovement(o) && !pitRegionOf(o)
    && !(o.kind === 'chasm' && bridges.some(b => Math.hypot(x - b.pos.x, y - b.pos.y) <= b.radius));
  for (const o of host.doodadsNear(from.x, from.y, Math.max(0, radius - SPATIAL_CFG.queryPad))) {
    if (solid(o, from.x, from.y)
      && shapeDistance(hitSurfaceOf(o, 'move'), o.pos.x, o.pos.y, from.x, from.y) < radius - 1e-4) return false;
  }
  let x = from.x, y = from.y, dx = to.x - x, dy = to.y - y;
  for (let pass = 0; pass < 4 && Math.hypot(dx, dy) > 1e-7; pass++) {
    const reach = Math.hypot(dx, dy);
    const candidates = radius + reach <= SPATIAL_CFG.queryPad ? host.doodadsAt(x, y)
      : host.doodadsNear(x + dx / 2, y + dy / 2, reach / 2 + radius);
    let first: ReturnType<typeof sweepBodyShape> = null, blocker: Doodad | undefined;
    for (const o of candidates) {
      if (!solid(o, x, y)) continue;
      const hit = sweepBodyShape(hitSurfaceOf(o, 'move'), o.pos.x, o.pos.y, x, y, dx, dy, radius);
      if (hit && (!first || hit.t < first.t)) { first = hit; blocker = o; }
    }
    if (!first) { x += dx; y += dy; break; }
    // Stay infinitesimally on the incoming side. This avoids classifying
    // floating-point contact as an embedded origin on the next move.
    const t = Math.max(0, first.t - 1e-5 / reach);
    x += dx * t; y += dy * t;
    if (collision && blocker) {
      collision.hit = 'wall'; collision.at = vec(blocker.pos.x, blocker.pos.y);
      collision.blockedKind = blocker.kind;
      collision.normal = { x: first.nx, y: first.ny };
    }
    if (!slide) break;
    dx *= 1 - first.t; dy *= 1 - first.t;
    const inward = Math.min(0, dx * first.nx + dy * first.ny);
    dx -= inward * first.nx; dy -= inward * first.ny;
  }
  to.x = x; to.y = y;
  return true;
}

