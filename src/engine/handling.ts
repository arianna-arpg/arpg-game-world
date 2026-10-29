import { clamp } from '../core/math';
import type { Actor } from './actor';

/** Innate body handling. Explicit turnSpeed overrides win, including zero.
 *  Size, walking pace and authored heft influence the fallback independently.
 *  This is a spawn-time base, not a live slow multiplier: combat modifiers
 *  continue to bend aiTurnSpeed through the ordinary stat sheet. */
export const TURNING_CFG = {
  baseRate: 6,
  referenceRadius: 12,
  referenceSpeed: 160,
  radiusPower: 1.15,
  speedPower: 0.5,
  heftPower: 0.35,
  speedFloor: 40,
  speedCeiling: 320,
  minRate: 1.1,
  maxRate: 12,
} as const;

export function monsterTurnSpeed(body: {
  radius: number;
  base: { moveSpeed?: number };
  heft?: number;
  turnSpeed?: number;
}): number {
  if (body.turnSpeed !== undefined) return Math.max(0, body.turnSpeed);
  const c = TURNING_CFG;
  const pace = clamp(body.base.moveSpeed ?? c.referenceSpeed, c.speedFloor, c.speedCeiling);
  return clamp(c.baseRate
    * Math.pow(c.referenceRadius / Math.max(1, body.radius), c.radiusPower)
    * Math.pow(pace / c.referenceSpeed, c.speedPower)
    / Math.pow(Math.max(0.1, body.heft ?? 1), c.heftPower), c.minRate, c.maxRate);
}

/** Recovery is paid AFTER an autonomous cast resolves, not while its bar
 *  winds up. The same action lock and foot-plant clocks already govern
 *  ordinary skills and movement kernels; no second scheduler is needed. */
export function finishAIRecovery(actor: Actor, now: number, seconds: number): void {
  const duration = Math.max(0, seconds);
  actor.useLock = Math.max(actor.useLock, duration);
  actor.aiPlantUntil = Math.max(actor.aiPlantUntil, now + duration);
}

/** A movement owner expresses a desired bearing; the world's ordinary turn
 * budget still resolves it. Casts retain their committed aim, and arriving
 * at a point must not manufacture an eastward heading from a zero vector. */
export function faceAlongTravel(actor: Actor, dx: number, dy: number): void {
  if (!actor.casting && Number.isFinite(dx) && Number.isFinite(dy)
    && Math.hypot(dx, dy) > 1e-8) actor.facing = Math.atan2(dy, dx);
}
