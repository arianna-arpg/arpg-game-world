import type { Vec2 } from '../../core/math';
import type { World } from '../../engine/world';
import { linkSpanOf } from '../../engine/tiers';
import { regionKind } from '../../world/regions';

/** Bodies, loose objects and their light obey the same covered-floor rule.
 * Open cliffs remain visible; real stair/link cells expose both ends. */
export function storyPointVisible(
  world: Pick<World, 'zone' | 'player' | 'walk'>, point: Vec2, tier = 0,
  stacks: readonly { rect: {x:number;y:number;w:number;h:number} }[] = [],
): boolean {
  if (tier === (world.player?.tier ?? 0)) return true;
  const covered = world.zone?.tiers?.exposure === 'covered' || stacks.some(({rect:r}) =>
    point.x > r.x && point.x < r.x+r.w && point.y > r.y && point.y < r.y+r.h);
  if (!covered) return true;
  const region = regionKind(world.walk?.regionAt?.(point.x,point.y));
  if (!region?.tierLink) return false;
  const span = linkSpanOf(region);
  return span.includes(tier) && span.includes(world.player?.tier ?? 0);
}
