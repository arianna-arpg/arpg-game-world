// ---------------------------------------------------------------------------
// THE SQUISH FABRIC — death underfoot (docs/engine/squish.md).
//
// The D2 desert law: some lives are small enough that a boot is the whole
// fight. A body wearing `MonsterDef.squish` dies to TREAD — any sufficiently
// heavier grounded body walking over it crushes it flat, no swing asked.
//
// THE LAWS:
//   MASS DECIDES, NOT ALLEGIANCE — the gate is pure physics: the treader's
//     effectiveWeight must out-mass the victim's by the spec's ratio (the
//     mass fabric's ONE weight read — radius, material density, heft and
//     poise all already folded). Faction-blind like the trapworks: the ogre
//     chasing you tramples the same ant file you sidestepped, and your golem
//     tramples it for you. No player special case — heroes squish because
//     heroes are HEAVY, not because they are heroes.
//   THE BOOT GOES OVER, NOT INTO — a squish pair is exempt from crowd
//     separation (the flat-construct precedent): a walker is never
//     shouldered aside by what it can crush, so the overlap actually
//     happens and the tread sweep resolves it as the kill in the same
//     frame. Drawn overlap == the crunch.
//   THE WHOLE ANIMAL IS TENDER — worm-bodied ambience (the ant trail) is
//     trodden at the head AND every trailing segment through the one segR
//     radius law (drawn == trodden): stepping on the middle of the file is
//     stepping on the creature.
//   AN ORDINARY DEATH — the crunch is World.kill() with treader credit:
//     XP, kill-path handlers, the spoils law, possession's death hooks and
//     co-op replication all arrive from standing law. No second death lane.
//   THE SLEEPER IS SPARED — dormancy (the sentry fabric) outranks physics
//     exactly as it does for wind and environmental strikes: a planted,
//     un-roused body is scenery, not prey. (The sweep's guard, not this
//     module's — isDormant lives with the AI.)
//
// Deferred seams (documented, not stubbed): a per-segment tread that TEARS
// the trodden coil instead of ending the animal (the segment fabric's wound
// lane); a `squishesInto` ground-stain dress row (the weatherDress/evap
// idiom); a treader-side stat (`softStep`) that waives the crunch for a
// careful build.
// ---------------------------------------------------------------------------

import type { Actor } from './actor';

/** Worn by a MonsterDef (`squish: true | SquishSpec`) — the whole opt-in. */
export interface SquishSpec {
  /** Weight gate: treader effectiveWeight ≥ victim's × ratio (default
   *  SQUISH_CFG.ratio). The dial IS the identity: the default 6 keeps
   *  squirrels off the ant file; the sand scorpion's 1.6 makes any boot
   *  enough while the zombie shuffling behind it still has to claw. */
  ratio?: number;
  /** Line floated at the crunch (default none — most squishes speak
   *  through the flash alone). */
  text?: string;
  /** Flash/line tint (default the def's own body color). */
  color?: string;
  /** Suppress the flash/line entirely (a silent pop). */
  quiet?: boolean;
}

export const SQUISH_CFG = {
  /** Default weight ratio: the treader must carry this many of the victim
   *  before walking becomes killing. */
  ratio: 6,
  /** The tread is the treader's FOOTPRINT: body radius × this fraction —
   *  a rim graze is a near miss, not a step. */
  treadFrac: 0.85,
  /** Crunch FX (per squish, unless spec.quiet). */
  fx: { radius: 22, life: 0.3 },
  /** Float size of the spec's crunch line. */
  textSize: 12,
} as const;

/** Normalize the def-side field (`true` = all defaults). Stamped onto the
 *  Actor once at spawn — the hot loops read a field, never the registry. */
export function squishSpecOf(def: { squish?: true | SquishSpec } | null | undefined): SquishSpec | null {
  const s = def?.squish;
  return s ? (s === true ? {} : s) : null;
}

/** THE ONE PREDICATE — both consumers (the crowd-separation exemption and
 *  the tread sweep) ask this, so "walks over" and "crushes" can never
 *  disagree. Pure mass + posture: no faction test, no team test, no player
 *  test. */
export function canSquish(treader: Actor, victim: Actor, spec: SquishSpec): boolean {
  if (treader === victim || treader.dead || treader.downed) return false;
  if (treader.leap) return false;                     // airborne — nothing underfoot
  if (treader.heldBy !== undefined) return false;     // carried luggage doesn't walk
  if (treader.flying !== victim.flying) return false; // the altitude split (separation's own law)
  return treader.effectiveWeight() >= victim.effectiveWeight() * (spec.ratio ?? SQUISH_CFG.ratio);
}
