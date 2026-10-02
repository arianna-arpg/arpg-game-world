import type { Actor } from './actor';
import { BODY_WALK_CFG as C } from '../data/bodyWalk';

export interface BodyWalkStamp { travel: number; at: number; direction: number }
export interface BodyWalkPose { travel: number; direction: number; weight: number }

/** The native walking artery supplies actual post-collision displacement.
 * A wall, teleport, knockback or ice coasting cannot invent another footfall. */
export function markBodyWalk(a: Actor, dx: number, dy: number, time: number): void {
  const distance = Math.hypot(dx, dy);
  if (distance <= .001 || !Number.isFinite(distance)) return;
  const stamp = a.bodyWalk ??= { travel: 0, at: time, direction: 0 };
  stamp.travel += distance / Math.max(1, a.radius);
  stamp.at = time; stamp.direction = Math.atan2(dy, dx);
}

/** Transient presentation only. Save/Continue starts a neutral stance; mirrors
 * receive this host pose instead of guessing intent from interpolation. */
export function bodyWalkPoseOf(a: Actor, time: number): BodyWalkPose | undefined {
  if (!C.enabled || a.dead || a.downed || a.passive || a.anchored || a.flying
    || a.burrow || a.leap || a.dash || a.caromRun || a.push || a.isStunned()) return;
  if (a.bodyWalkPose !== undefined) return a.bodyWalkPose ?? undefined;
  const stamp = a.bodyWalk;
  if (!stamp || time < stamp.at) return;
  const weight = Math.max(0, 1 - (time - stamp.at) / C.settle);
  if (!weight) return;
  return { travel: stamp.travel, direction: stamp.direction, weight };
}
