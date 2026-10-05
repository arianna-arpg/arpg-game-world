import type { Actor } from './actor';

/** An opted-in ordinary windup follows the actor's own live aim, never a
 * searched target. Seats supply their cursor; AI keeps its existing aim policy.
 * Resolved targets, planted payloads and held/timing conversions own their aim. */
export function updateCastAim(a: Actor): void {
  const cs = a.casting, aim = a.aimPos;
  if (!cs || a.dead || a.downed || a.isStunned() || cs.mode !== 'cast'
    || cs.inst.def.castAim !== 'live' || cs.targetInfo || cs.lockedAim
    || cs.plantTotem || cs.plantChannel || !aim
    || !Number.isFinite(aim.x) || !Number.isFinite(aim.y)) return;
  cs.aim = { x: aim.x, y: aim.y };
}
