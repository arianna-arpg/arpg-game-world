// ---------------------------------------------------------------------------
// THE MASS & AUTHORITY FABRIC — who moves whom, and what it costs to be moved.
//
// The WEIGHT BASIS lives elsewhere and is not duplicated here: the `weight`
// stat (engine/stats.ts, base 1), its radius-derived monster default and the
// poise anchor (DEFENSE_CFG.weight + Actor.effectiveWeight() — POISE IS MASS),
// and the material DENSITY fold (MATERIAL_NATURE.density, data/monsters.ts).
// This module owns what mass DOES beyond resisting:
//
//  · SHOVE AUTHORITY — the pusher's side of the asymmetry. pushActor has
//    always divided by the TARGET's effective weight (a knockback that sends
//    a goblin flying nudges an ogre); authority multiplies by the PUSHER's —
//    heavy bodies both resist shoves AND shove harder. The curve is
//    normalized to EXACTLY 1 at effective weight 1, so a fresh hero's
//    knockback, casterless winds, traps and track payloads keep their tuned
//    reach to the pixel; the asymmetry only opens where mass diverges.
//    Building toward poise/mass therefore does BOTH things at once: you stop
//    being the one who slides, and start being the one who slides others.
//
//  · IMPACT — momentum made damage. A pushed body arrested by a wall (or by
//    a body heavy enough to BE a wall) above MASS_CFG.impact.minSpeed takes
//    mitigated PHYSICAL scaled by its momentum (arrest speed × its own
//    effective weight — impulse conservation means that product tracks the
//    shove that launched it, authority included). Fractions of max life keep
//    the wound honest at every level band; armor mitigates like any other
//    typed hit; the shover keeps kill credit exactly like the pitfall lane.
//    Casterless displacement (wind, geysers) and friendly repositioning
//    (pulls, rescues) deal NOTHING — physics without a hostile author is
//    weather, not an attack.
//
//  · THE BOWLING LANE — body-vs-body slams. A flying body that meets one
//    heavy enough (slam.arrestRatio) is ARRESTED: both take impact, the
//    caster's 'collision' procs roll (a wall of meat is still a wall).
//    Anything lighter is PLOWED THROUGH: it takes the struck fraction and
//    inherits momentum (a pushActor shove with authority already spent —
//    never re-folded), while the mover sheds plowDamping per body. Shove the
//    ogre into the goblin pack and the pack scatters; shove the goblin into
//    the ogre and the goblin learns why not.
//
// Player-side levers are ordinary stats (STAT_DEFS): `shoveAuthority`
// multiplies the authority term after its clamp (investment scales openly;
// the SIZE term alone is clamped), `impactDamage` scales the fractions your
// shoves' impacts deal. Both are tag-filtered through the live skill
// instance, so "authority on melee skills" is one passive away.
//
// Docs: docs/engine/mass.md · Probe: balance/probe_mass.ts
// ---------------------------------------------------------------------------

import { clamp } from '../core/math';
import type { Actor } from './actor';
import { instanceMods, skillContextTags, type SkillInstance } from './skills';

export const MASS_CFG = {
  /** SHOVE AUTHORITY — the pusher's mass folded into every owned push.
   *  scale = clamp(pusherEffectiveWeight ^ pow, min, max) × (1 + shoveAuthority).
   *  pow < 1 keeps it sublinear (a 4× ogre shoves ~2.1× harder, not 4×);
   *  the clamp bounds the BODY term so a poised titan can't infinite-launch
   *  and a gnat still registers — stat investment scales beyond the clamp
   *  on purpose (buildcraft may exceed what anatomy alone allows). */
  authority: {
    pow: 0.55,
    min: 0.4,
    max: 2.75,
  },

  /** IMPACT — momentum made damage at a wall/void-lip arrest.
   *  momentum = arrest speed (px/s) × the MOVING body's effective weight;
   *  damage = clamp(baseFrac × momentum / refMomentum, 0, maxFrac) of the
   *  victim's max life, dealt as PHYSICAL through mitigateTyped (armor and
   *  the whole defender stack apply; never evasion/block — you dodge a wall
   *  with your feet). Below minSpeed nothing happens: ordinary combat
   *  jostling never turns walls into damage sources. icdSec gates per BODY,
   *  so one launch is one wound even against a corner's double clamp. */
  impact: {
    minSpeed: 340,
    refMomentum: 900,
    baseFrac: 0.08,
    maxFrac: 0.25,
    icdSec: 0.45,
  },

  /** BODY-VS-BODY slams (the bowling lane). A mover at ≥ minSpeed that
   *  overlaps another body compares masses: blockerW ≥ moverW × arrestRatio
   *  ⇒ ARREST (mover stops, wall rules apply to both, collision procs
   *  roll); lighter ⇒ PLOW-THROUGH (struck body takes struckFrac of the
   *  mover's impact fraction and inherits transfer × the mover's speed as
   *  an authority-spent shove, mover keeps plowDamping of its speed).
   *  arrestNudge is the token shove the blocker feels — pressure, not
   *  displacement. Struck bodies share impact.icdSec. */
  slam: {
    minSpeed: 380,
    arrestRatio: 0.85,
    struckFrac: 0.65,
    transfer: 0.5,
    plowDamping: 0.62,
    arrestNudge: 0.12,
  },

  /** HEFT READABILITY — the bestiary ladder (label per resolved base
   *  weight). Thresholds are upper bounds; the last row catches the rest.
   *  Purely presentational: the number the tiers summarize is the same
   *  effectiveWeight the physics reads. */
  heftTiers: [
    { below: 0.45, label: 'Featherweight' },
    { below: 0.85, label: 'Light' },
    { below: 1.6, label: 'Solid' },
    { below: 3.0, label: 'Heavy' },
    { below: 6.0, label: 'Immense' },
    { below: Infinity, label: 'Monumental' },
  ] as { below: number; label: string }[],
} as const;

/** The pusher's AUTHORITY multiplier for one owned push: the clamped body
 *  term × open stat investment (tag-filtered through the live instance so
 *  skill-local grants — the Battering Ram gem — reach it). Exactly 1 for a
 *  fresh effective-weight-1 hero with nothing invested: the legacy law every
 *  existing tuned strength keeps. */
export function shoveAuthority(caster: Actor, inst?: SkillInstance): number {
  const body = clamp(
    Math.pow(caster.effectiveWeight(), MASS_CFG.authority.pow),
    MASS_CFG.authority.min, MASS_CFG.authority.max);
  const invested = inst
    ? caster.sheet.get('shoveAuthority', skillContextTags(inst.def), instanceMods(inst))
    : caster.sheet.get('shoveAuthority');
  return body * (1 + invested);
}

/** The raw impact fraction (of the victim's max life) for one arrest, from
 *  the momentum of the ARRESTED body. Zero below the speed gate; capped so
 *  a titan launch is a wound, never a deletion. The caster's impactDamage
 *  scaling multiplies AFTER this (impactScale) and may exceed the cap —
 *  investment is allowed to hit harder than anatomy. */
export function impactFrac(speed: number, effWeight: number): number {
  if (speed < MASS_CFG.impact.minSpeed) return 0;
  const momentum = speed * effWeight;
  return clamp(
    MASS_CFG.impact.baseFrac * momentum / MASS_CFG.impact.refMomentum,
    0, MASS_CFG.impact.maxFrac);
}

/** The shover's investment multiplier on impact fractions (impactDamage
 *  stat, tag-filtered through the live instance). */
export function impactScale(caster: Actor, inst?: SkillInstance): number {
  const invested = inst
    ? caster.sheet.get('impactDamage', skillContextTags(inst.def), instanceMods(inst))
    : caster.sheet.get('impactDamage');
  return 1 + invested;
}

/** The bestiary's heft label for a resolved weight. */
export function heftTierOf(weight: number): string {
  for (const t of MASS_CFG.heftTiers) if (weight < t.below) return t.label;
  return MASS_CFG.heftTiers[MASS_CFG.heftTiers.length - 1].label;
}
