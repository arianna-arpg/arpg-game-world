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
  solidDoodadsAt?(x:number,y:number): readonly Doodad[];
  solidDoodadsNear?(x:number,y:number,reach:number): readonly Doodad[];
}

function isSolidMoveDoodad(
  o: Doodad,
  x: number,
  y: number,
  tier: number,
  bridges: readonly { pos: Vec2; radius: number }[],
): boolean {
  if ((o.tier ?? 0) !== tier || !blocksMovement(o) || pitRegionOf(o)) return false;
  if (o.kind === 'chasm') {
    for (let i = 0; i < bridges.length; i++) {
      const b = bridges[i];
      const dx = x - b.pos.x, dy = y - b.pos.y;
      if (dx * dx + dy * dy <= b.radius * b.radius) return false;
    }
  }
  return true;
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
  if (!host.arena.boundless && !insideBounds(from, Math.max(0, radius - 1e-4), host.arena)) return false;
  const initReach = Math.max(0, radius - SPATIAL_CFG.queryPad);
  const initCands = host.solidDoodadsNear
    ? (initReach <= 0 && host.solidDoodadsAt ? host.solidDoodadsAt(from.x, from.y) : host.solidDoodadsNear(from.x, from.y, initReach))
    : host.doodadsNear(from.x, from.y, initReach);
  for (let i = 0; i < initCands.length; i++) {
    const o = initCands[i];
    const maxR = (o.boundR !== undefined && o.boundR > o.radius ? o.boundR : o.radius) + radius;
    if (Math.abs(o.pos.x - from.x) > maxR || Math.abs(o.pos.y - from.y) > maxR) continue;
    if (isSolidMoveDoodad(o, from.x, from.y, tier, bridges)
      && shapeDistance(hitSurfaceOf(o, 'move'), o.pos.x, o.pos.y, from.x, from.y) < radius - 1e-4) return false;
  }
  let x = from.x, y = from.y, dx = to.x - x, dy = to.y - y;
  for (let pass = 0; pass < 4 && Math.hypot(dx, dy) > 1e-7; pass++) {
    const reach = Math.hypot(dx, dy);
    const candidates = radius + reach <= SPATIAL_CFG.queryPad
      ? (host.solidDoodadsAt ? host.solidDoodadsAt(x, y) : host.doodadsAt(x, y))
      : (host.solidDoodadsNear
        ? host.solidDoodadsNear(x + dx / 2, y + dy / 2, reach / 2 + radius)
        : host.doodadsNear(x + dx / 2, y + dy / 2, reach / 2 + radius));
    let first: ReturnType<typeof sweepBodyShape> = null, blocker: Doodad | undefined;
    for (let i = 0; i < candidates.length; i++) {
      const o = candidates[i];
      const maxR = (o.boundR !== undefined && o.boundR > o.radius ? o.boundR : o.radius) + radius + reach;
      if (Math.abs(o.pos.x - x) > maxR || Math.abs(o.pos.y - y) > maxR) continue;
      if (!isSolidMoveDoodad(o, x, y, tier, bridges)) continue;
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

