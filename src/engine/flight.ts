// ---------------------------------------------------------------------------
// THE FLIGHT MATH — one source for the trajectory axes' local geometry.
//
// The projectile integrator (World.advanceProjectile) and the flock steering
// fabric (BehaviorSpec.flock, ai.ts) wear the SAME axes — weave's lissajous
// figure-eight, spin's epicycle, erratic's random walk — so "the flock wears
// the trajectory axes" is literal: one formula, two riders. Projectiles ride
// the POSITION forms (offsets laid on an advancing guide point); bodies ride
// the VELOCITY form (the analytic d/dt of the same weave, folded into their
// steering desire) because an actor's step is a direction, not a teleport.
// Change a formula here and every wearer — bolt and locust alike — banks the
// same way. Leaf module: pure trig + core rand, no engine imports.
// ---------------------------------------------------------------------------

import { rand, type Vec2 } from '../core/math';

/** SPIN — the epicycle: a tight circle riding the guide, radius scaling with
 *  strength (a weak gyre is a shimmer, full strength the old wide wheel). */
export function spinOffset(spin: number, amp: number, age: number, out: Vec2): Vec2 {
  const r = amp * Math.min(1, spin / 8);
  out.x = Math.cos(spin * age) * r;
  out.y = Math.sin(spin * age) * r;
  return out;
}

/** WEAVE — the figure-eight: lateral sine + half-amplitude double-frequency
 *  drift, laid across the guide's heading. The lissajous 1×/2× ratio with the
 *  ½ amplitude is what closes the eight. */
export function weaveOffset(weave: number, amp: number, age: number, head: number, out: Vec2): Vec2 {
  const lat = amp * Math.sin(weave * age * 2);
  const lon = amp * 0.5 * Math.sin(weave * age * 4);
  const perp = head + Math.PI / 2;
  out.x = Math.cos(perp) * lat + Math.cos(head) * lon;
  out.y = Math.sin(perp) * lat + Math.sin(head) * lon;
  return out;
}

/** WEAVE, velocity form — the exact analytic derivative of weaveOffset, for
 *  riders that steer by direction instead of riding a guide point (flock
 *  bodies): fold this into a desire vector and the PATH traces the same
 *  figure-eight the projectile's offset draws. Units: px/s at the given amp. */
export function weaveVel(weave: number, amp: number, age: number, head: number, out: Vec2): Vec2 {
  const latV = amp * 2 * weave * Math.cos(weave * age * 2);
  const lonV = amp * 2 * weave * Math.cos(weave * age * 4);
  const perp = head + Math.PI / 2;
  out.x = Math.cos(perp) * latV + Math.cos(head) * lonV;
  out.y = Math.sin(perp) * latV + Math.sin(head) * lonV;
  return out;
}

/** ERRATIC — one tick of the heading random walk (the linear integrator's
 *  `guideDir += rand(-e, e) * dt * 5`). Projectiles accumulate it raw on
 *  their guide; bodies accumulate it on a decaying offset (an OU process —
 *  same increment, mean-reverting so a long-lived body wanders instead of
 *  drifting away forever). */
export function erraticTurn(erratic: number, dt: number): number {
  return rand(-erratic, erratic) * dt * 5;
}
