import type { World } from '../../engine/world';
import type { Actor } from '../../engine/actor';
import { VIS_CFG } from './visConfig';

/** The hero's live view, restricted to native threats and unobstructed reach. */
export function combatTargetStrength(world: World, actor: Actor): number {
  const c = VIS_CFG.combatFocus.bodies, hero = world.player;
  if (!c.enabled || hero.dead || hero.downed || !Number.isFinite(hero.facing)
    || !world.isPressingFoe(actor, hero.pos, hero.tier, c.radius)) return 0;
  const dx = actor.pos.x - hero.pos.x, dy = actor.pos.y - hero.pos.y;
  const angle = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - hero.facing), Math.cos(Math.atan2(dy, dx) - hero.facing)));
  if (angle >= c.halfAngle || !world.lineOfSight(hero.pos, actor.pos, hero.tier, actor.tier)) return 0;
  return Math.min(1, Math.max(0, (c.radius - Math.hypot(dx, dy)) / Math.max(.001, c.fade)))
    * Math.min(1, (c.halfAngle - angle) / Math.max(.001, c.angleFade));
}
