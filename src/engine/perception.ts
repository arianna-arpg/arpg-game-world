/** Shared personal concealment and investigation policy. Terrain obscures rays;
 * concealment belongs to the actor. Neither grants knowledge of a hidden body. */
import type { Actor } from './actor';
import type { BrainTuning } from './brain';
import type { World } from './world';
import { MONSTERS } from '../data/monsters';
import { nearestBody, segsHittable } from './segments';
import { angleDiff, angleTo, dist } from '../core/math';
import { LOS_CFG } from './los';
import { SENSE_CFG, senseReach, watchArcDeg, watchValueOf, WATCH_CFG, WATCH_RUNG } from './watch';

export const PERCEPTION_CFG = {
  exposureSec: 1.25,
  woundSearchSec: 6,
  searchArrive: 32,
  searchTurnRadSec: 1.6,
} as const;

export function isConcealed(a: Actor): boolean {
  return a.sheet.get('concealment') > 0 || (a.charges.get('stealth') ?? 0) > 0;
}

/** Exposed attackers retain their investment/charges, but lose its detection
 * benefit until the offensive activity stops. Real invisibility is separate. */
export function concealmentActive(a: Actor, now: number): boolean {
  return isConcealed(a) && now >= a.concealmentExposedUntil;
}

/** The common own-senses gate, also used by shared target orders. */
export function perceiveTarget(a: Actor, target: Actor, w: World, tuning: BrainTuning): boolean {
  if (target.dead || target.downed || target.untargetable || target.passive
    || target.sheet.get('invisible') > 0 || a.aiDazeUntil > w.time) return false;
  const per = tuning.perception;
  const v = a.watch ? watchValueOf(a, a.watch, w.time) : 0;
  const vision = a.defId ? MONSTERS[a.defId]?.vision : undefined;
  const arc = watchArcDeg(a.watch, v, per?.arcDeg ?? vision?.arcDeg ?? SENSE_CFG.arcDeg) * Math.PI / 360;
  const detect = tuning.target?.relentless && a.aggroed ? Infinity
    : a.sheet.get('detectionRange') * (tuning.target?.detectMul ?? 1);
  const reach = senseReach(detect, target.sheet.get('detectability'), concealmentActive(target, w.time),
    w.time < a.alertUntil, Math.abs(angleDiff(a.facing, angleTo(a.pos, target.pos))) < arc,
    per?.rearMul ?? vision?.rearMul ?? SENSE_CFG.rearMul);
  return (segsHittable(target) ? dist(a.pos, nearestBody(target, a.pos).pos) : dist(a.pos, target.pos)) <= reach
    && (!LOS_CFG.perception || per?.xray === true || w.losCached(a, target));
}

/** Drop a live reference immediately. Memory is a copied place, never a
 * license for combat kernels to read the hidden target's current position. */
export function investigateLoss(a: Actor, w: World, tuning: BrainTuning): void {
  a.aiTargetId = undefined;
  a.aiTargetRef = undefined;
  a.aggroed = false;
  const memory = tuning.perception?.memory ?? LOS_CFG.chaseMemory;
  if (memory > 0 && a.aiLastSeen && !a.isMinion()) {
    a.alertUntil = Math.max(a.alertUntil, w.time + memory);
    // A more recent wound/noise is better evidence than an old visual fix.
    if (!a.alertFrom || a.aiLosSeenAt >= a.aiHitAt) {
      a.alertFrom = { ...a.aiLastSeen };
      a.alertTier = a.aiLastSeenTier;
    }
  }
  if (a.watch) {
    a.watchS = WATCH_CFG.rungs.search;
    a.watchFedAt = w.time;
    a.watchRung = WATCH_RUNG.search;
  }
}
