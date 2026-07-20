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
// TWO OPTIONAL TEMPERS refine the ride, both pure ClingSpec data:
//   - THE GNAW (spec.gnaw): the ride's damage IS a steady chew — typed,
//     mitigated, rider-credited bites on the ride clock (the swallow-digest
//     grammar) instead of casts that go stale while the seat moves with the
//     victim. While a gnaw-tempered body holds a ride, useSkill refuses it
//     exactly like moveActor refuses its steps: the teeth are the kit.
//   - THE BURROW (spec.burrow): the rider sinks INSIDE the body it rides —
//     the HOST cannot find its own parasite (a one-directional early-false
//     in World.hostileTo, the possession GUISE's pattern), so its swings,
//     novas and targeting pass the rider by while every OTHER combatant
//     still scrapes normally. The host's honest answer is the SHAKE: the
//     pop-out scatters the rider (toss) into a real vulnerability window
//     (grace) before it may burrow again — the Pikmin shake-off loop.
//
// THE OPEN SEAM (deliberately unbuilt, shaped for it): GRAPPLE — the inverse
// latch, where the RIDER drags the ridden. A future GrappleSpec rides the
// same Actor.clingTo state with force transferred along the slave step
// instead of position; nothing here assumes the victim outweighs the rider.
// Docs: docs/engine/throng.md (the latch ships with the throng pass).
// ---------------------------------------------------------------------------

import type { Actor } from './actor';
import type { DamageType, SkillTag } from './stats';

/** THE GNAW — the DoT latch (ClingSpec.gnaw): while the ride holds, the
 *  rider's damage is a steady CHEW on the body it rides, dealt on its own
 *  bite clock through the one mitigation ladder (typed, rider-credited,
 *  no evade/block/crit — the swallow-digest / pooled-bite grammar, and
 *  like every DoT it pierces plies straight to life). Magnitude reads the
 *  rider's OWN folded damage sheet, so the monster level curve and the
 *  keeper's batch-tempered minion investment arrive with no gnaw-specific
 *  stat. While it holds a ride, the body casts NOTHING — useSkill refuses
 *  it the way moveActor refuses its steps (the teeth are the kit; seats
 *  are exempt, a possessed body answers to hands). Unlatched, the body
 *  fights through its ordinary skills. Cast-kit clingers (no gnaw) keep
 *  whacking exactly as before. */
export interface GnawSpec {
  /** Damage per second at the rider's sheet-neutral baseline (level 1,
   *  no investment); every fold above rides sheet.get('damage', [type]). */
  dps: number;
  /** Bite damage type (default physical). */
  type?: DamageType;
  /** Bite cadence in seconds (default CLING_CFG.gnaw.every). The first
   *  bite lands one full beat after the attach — no brush-past spikes. */
  every?: number;
}

/** THE BURROW — host-blind riding (ClingSpec.burrow): the rider sinks
 *  INSIDE the body it rides (a deeper seat sink — drawn == held, so the
 *  body reads mostly swallowed). While burrowed, the HOST cannot find it:
 *  one-directional early-false in World.hostileTo (the possession GUISE
 *  pattern) blinds the host's targeting, swings, novas and stray zones to
 *  its own parasites — while the rider's teeth stay live and every OTHER
 *  combatant scrapes riders off normally. The host's answer is its SHAKE
 *  clock: the pop-out SCATTERS the rider (toss, random bearing) into a
 *  LONGER re-latch wait (grace) — the vulnerability window where shaking
 *  finally pays. Kill them on the ground, or carry them forever. */
export interface BurrowSpec {
  /** Seat sink while burrowed (default CLING_CFG.burrow.sink; the base
   *  perch is CLING_CFG.sink). */
  sink?: number;
  /** Re-latch wait after a SHAKE pop-out (default CLING_CFG.burrow.grace).
   *  Other releases (redirect, knockback, a dead victim) keep the classic
   *  short reattachGrace — the window is the host's earned answer only. */
  grace?: number;
  /** Shake pop-out scatter distance (default CLING_CFG.burrow.toss). */
  toss?: number;
}

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
  /** THE GNAW: the ride's damage is a steady credited chew, and the kit
   *  goes quiet while the ride holds (see GnawSpec). */
  gnaw?: GnawSpec;
  /** THE BURROW: sunk host-blind riding with the shake-out window (see
   *  BurrowSpec). An empty object opts in at the CLING_CFG.burrow dials. */
  burrow?: BurrowSpec;
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
  /** Next gnaw bite (internal clock; armed one beat past the attach so a
   *  brush-past latch never spikes — the lite pool's stagger doctrine). */
  gnawAt: number;
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
  /** THE GNAW's default bite cadence (seconds per chew). */
  gnaw: { every: 0.5 },
  /** THE BURROW's dials: seat sink while burrowed (the base perch is
   *  `sink` above), the shake pop-out scatter distance, and the re-burrow
   *  wait — the vulnerability window the shaking host earns. */
  burrow: { sink: 0.92, grace: 2.2, toss: 54 },
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

/** Cached per-type tag sets for the gnaw's damage read (bites are event-
 *  rate but riders are many — never allocate per chew). The typed tag
 *  lets ordinary tag-filtered investment — "increased fire damage" — reach
 *  a cinder-flavored chew honestly through the one stat engine. */
const GNAW_TAG_SETS = new Map<DamageType, ReadonlySet<SkillTag>>();
export function gnawTags(type: DamageType): ReadonlySet<SkillTag> {
  let s = GNAW_TAG_SETS.get(type);
  if (!s) {
    s = new Set<SkillTag>([type]);
    GNAW_TAG_SETS.set(type, s);
  }
  return s;
}

/** Is this body riding INSIDE its victim right now — burrow-tempered AND
 *  latched? The ONE question the hostility gate, the renderer's ghost
 *  read and the probes all ask; the answer can never drift from the ride
 *  state because it IS the ride state. (Named for the LATCH fabric —
 *  distinct from Actor.burrow, the {do:'burrow'} verb's underground
 *  TERRAIN travel; this burrow goes into a BODY.) */
export function clingBurrowed(a: Actor): boolean {
  return a.clingTo !== undefined && !!a.cling?.burrow;
}

/** The seat sink for THIS rider: burrowed rides sink deeper (mostly
 *  swallowed by the victim's silhouette), plain rides keep the perch. */
export function clingSinkOf(rider: Actor): number {
  return clingBurrowed(rider)
    ? rider.cling!.burrow!.sink ?? CLING_CFG.burrow.sink
    : CLING_CFG.sink;
}

/** The seat's world-space anchor for a ride: on the victim's rim, sunk by
 *  the rider's own sink (clingSinkOf — burrowed rides sit deeper) of the
 *  rider's radius. One function so the slave step and any renderer
 *  inspection can never disagree — drawn == held at every depth. */
export function clingSeatPos(
  victim: Actor, rider: Actor, ang: number, out: { x: number; y: number },
): void {
  const sink = clingSinkOf(rider);
  const d = victim.radius + rider.radius * (1 - sink) - rider.radius * sink;
  out.x = victim.pos.x + Math.cos(ang) * Math.max(2, d);
  out.y = victim.pos.y + Math.sin(ang) * Math.max(2, d);
}
