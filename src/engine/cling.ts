// ---------------------------------------------------------------------------
// THE LATCH FABRIC — bodies that CLING to other bodies.
//
// The Pikmin blow: a tiny attacker reaches its quarry and LATCHES ON, riding
// the victim's silhouette and whacking through its own ordinary kit while it
// holds. Latching replaces MOVEMENT, never combat: an attached body's brain
// keeps aiming, casting and paying costs through the one skill pipeline —
// range is trivially satisfied because the body IS on the target. Drawn ==
// held: the rider's position is slaved to a seat on the victim's rim every
// tick, so what you see hanging off the ogre is exactly what the ogre's
// next sweep can scrape away.
//
// Everything is data:
//   - MonsterDef.cling?: ClingSpec — ANY monster can be a clinger (stamped
//     onto Actor.cling at mint). The throng's solid flavor wears it first;
//     an enemy leech-swarm is one data entry away.
//   - CLING_CFG — the modular thresholds (avoid-hardcoding registry:
//     tune HERE, never inline).
//
// Counterplay contract (all levers, no scripts):
//   - SEATS: a victim carries floor(radius / radiusPerSeat) riders, so
//     littles shrug off crowds while bosses wear a coat of them. Overflow
//     riders simply fight at the rim through normal melee — degradation,
//     not refusal.
//   - SHAKE: every ride ends on its own rolled clock (spec.shakeSec); the
//     shaken rider hops off and cannot re-latch for reattachGrace.
//   - SCRAPE: riders are ordinary brittle bodies standing ON the victim —
//     any AoE, nova or sweep that clips the victim's rim kills them.
//   - REDIRECT: orders drop the rider's target lock (issueCommand clears
//     aiTargetId), and a rider whose target is no longer its ridden victim
//     detaches on the next latch sweep — the throng's direct channel
//     peels your own riders off one mark and throws them at another.
//
// THE OPEN SEAM (deliberately unbuilt, shaped for it): GRAPPLE — the inverse
// latch, where the RIDER drags the ridden. A future GrappleSpec rides the
// same Actor.clingTo state with force transferred along the slave step
// instead of position; nothing here assumes the victim outweighs the rider.
// Docs: docs/engine/throng.md (the latch ships with the throng pass).
// ---------------------------------------------------------------------------

import type { Actor } from './actor';

/** A latch temper worn by a monster kind (MonsterDef.cling → Actor.cling).
 *  All fields optional — an empty spec latches with the CLING_CFG defaults. */
export interface ClingSpec {
  /** Seconds a victim carries this rider before shaking it off (roll per
   *  ride; default CLING_CFG.shakeSec). Longer = stickier flavor. */
  shakeSec?: [number, number];
  /** Attach reach beyond touching rims (default CLING_CFG.attachPad). */
  pad?: number;
  /** Status the VICTIM wears while ridden (refreshed on the ride clock;
   *  one application per rider per refresh — stacking statuses climb with
   *  the crowd). The harried-prey lever. */
  rideStatus?: string;
  /** The victim must be at least this × the rider's radius to be worth
   *  riding (default CLING_CFG.victimMinRatio) — an imp doesn't ride a
   *  roach; a gnat rides anything. */
  victimMinRatio?: number;
}

/** A live ride (Actor.clingTo). `ang` is the seat bearing in WORLD space —
 *  seats don't spin with the victim's facing, so the coat of riders reads
 *  stable while the body under it turns. */
export interface ClingRide {
  /** The ridden victim's actor id. */
  id: number;
  /** Seat bearing (radians, victim-center → rider). */
  ang: number;
  /** World-time when the victim shakes this rider off. */
  until: number;
  /** Next rideStatus refresh (internal clock). */
  statusAt: number;
}

/** THE LATCH FABRIC's modular thresholds — tune HERE, never inline. */
export const CLING_CFG = {
  /** Attach reach beyond touching rims (world units). Sized to STRIKING
   *  reach, not contact: the movement kernels hold a melee standoff
   *  (~ai.range × closeFrac), so the latch fires from swing distance and
   *  the seat-snap reads as the lunge ONTO the body — the Pikmin leap. */
  attachPad: 26,
  /** How deep a rider sinks into the victim's silhouette (0 = perched on
   *  the rim, 1 = fully swallowed). Drawn == held either way. */
  sink: 0.55,
  /** Victim radius per rider seat — floor(radius / this) seats, so a
   *  radius-11 snarl carries 1 and a radius-40 boss carries 6. */
  radiusPerSeat: 6.5,
  /** Hard seat ceiling regardless of size (colossi are not infinite). */
  maxSeats: 12,
  /** Default ride length before the victim shakes the rider off. */
  shakeSec: [3.5, 6] as [number, number],
  /** Seconds a shaken/pushed rider must wait before re-latching. */
  reattachGrace: 0.9,
  /** Hop-off distance on detach (world units). */
  detachHop: 26,
  /** Rider latch decisions run on this cadence (positions slave every
   *  tick regardless — the throttle only paces attach/detach thinking). */
  thinkEvery: 0.16,
  /** rideStatus refresh cadence per rider (seconds). */
  rideStatusEvery: 0.5,
  /** Default victim-size floor as a ratio of the rider's own radius. */
  victimMinRatio: 0.9,
} as const;

/** Seats a victim's body offers (size-scaled, capped). */
export function clingSeatsOf(victim: Actor): number {
  return Math.max(1, Math.min(CLING_CFG.maxSeats,
    Math.floor(victim.radius / CLING_CFG.radiusPerSeat)));
}

/** May `rider` latch onto `victim` right now? Pure eligibility — the
 *  caller supplies the seat census and does the distance/cooldown gating
 *  it can do cheaply in its own sweep. */
export function clingEligible(rider: Actor, victim: Actor): boolean {
  if (!rider.cling || rider.dead || victim.dead) return false;
  if (victim.team === rider.team) return false;
  if (victim.untargetable || victim.passive) return false;
  const ratio = rider.cling.victimMinRatio ?? CLING_CFG.victimMinRatio;
  return victim.radius >= rider.radius * ratio;
}

/** The seat's world-space anchor for a ride: on the victim's rim, sunk by
 *  CLING_CFG.sink of the rider's own radius. One function so the slave
 *  step and any renderer inspection can never disagree. */
export function clingSeatPos(
  victim: Actor, rider: Actor, ang: number, out: { x: number; y: number },
): void {
  const d = victim.radius + rider.radius * (1 - CLING_CFG.sink) - rider.radius * CLING_CFG.sink;
  out.x = victim.pos.x + Math.cos(ang) * Math.max(2, d);
  out.y = victim.pos.y + Math.sin(ang) * Math.max(2, d);
}
