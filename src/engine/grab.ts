// ---------------------------------------------------------------------------
// THE GRAB FABRIC — sustained bodily control, as one composable state pair.
//
// The inversion the latch (engine/cling.ts) was shaped for: where a LATCH is
// a rider hanging off a body that keeps its own feet, a GRAB is a HOLDER
// that owns another body's position outright — carried overhead, dragged
// behind, pinned under, or swallowed whole — until the hold BREAKS. One
// state pair serves every verb:
//
//   Actor.gripping : GripHold   the holder's side — owns the live record
//   Actor.heldBy   : number     the victim's side — the holder's actor id
//
// The pair is enforced 1:1 (one hold per holder, one holder per victim) and
// the victim's position is a PURE FUNCTION of the holder's (grabSeatPos —
// one resolver for the slave step, the renderer, and any probe, so drawn ==
// held through every verb). Movement is REPLACED for the victim (the mover
// contract refuses, exactly like a latched rider) and their refused inputs
// become STRUGGLE — mashing is not a metaphor, it is the escape mechanic.
//
// THE VERBS are presets over the same axes, not separate systems:
//   carry    hoisted overhead; the holder walks (slowed) and may THROW
//   drag     hauled behind; the holder retreats with its catch (haul hint)
//   pin      forced down in place; the holder stands over it and hammers
//   swallow  taken INSIDE; hidden + untargetable, digested on a tick,
//            spat out at the holder's choosing or burst out of by force
//
// THE MASS LAW (engine/mass.ts is the basis, never duplicated): who can
// grab whom gates on effective weight — holderW × (1 + gripPower) must
// reach victimW × spec ratio. The ogre palms the goblin; the goblin needs
// a BUILD (gripPower is an ordinary tag-filtered stat) to answer in kind.
// Throw-release rides pushActor with the holder as caster, so shove
// authority, wall-impact wounds, the bowling lane, and pit swallows — with
// kill credit — all arrive from the mass fabric for free.
//
// COUNTERPLAY is a ladder of levers, no scripts:
//   STRUGGLE  the victim's own refused movement/presses feed a break meter
//             (rate ∝ (victimW / holderW)^pow × wriggle — mass matters,
//             and investment answers mass);
//   SEVER     allies wound the HOLDER — severFrac of its max life torn in
//             hits tears the hold open (co-op's rescue verb);
//   CC        stun/freeze/hard-CC on the holder releases per policy —
//             the timeflow fabric's stasis counts like any hardCC;
//   SHOVE     a hard enough push on the holder tears the pair loose;
//   PATIENCE  every hold rolls a finite holdSec — nothing grips forever.
//
// POLICY IS DATA: rarity tiers scale struggle speed (rares scramble out;
// the crowned refuse outright at tier 0) and MonsterDef.grabbable
// overrides per body. Dormant sentries are never seized (the planted
// spare); phasing bodies have no rim to hold; cross-altitude reaches
// refuse (a grounded hand does not pluck the wing).
//
// Docs: docs/engine/grab.md · Probe: balance/probe_grab.ts
// Vocabulary law (cross-referenced in every kin header): the LATCH rides,
// the TETHER links, the PULL yanks once, the COMMAND orders — the GRAB
// *holds*. Combo kinship: grab skills wear the 'grab' tag and throws the
// 'throw' tag, so the combo grammar (engine/sequence.ts) reads seize-and-
// heave measures with no matcher edits.
// ---------------------------------------------------------------------------

import { clamp } from '../core/math';
import type { DamageType } from './stats';
import type { Actor } from './actor';

/** The grab verbs — presets over one state pair (see header). */
export type GrabVerb = 'carry' | 'drag' | 'pin' | 'swallow';

/** A throw-release: the hold ends as a directed impulse through pushActor
 *  (the holder is the caster — authority, impact wounds, pit credit all
 *  fold in from the mass fabric). */
export interface GrabThrowSpec {
  /** Release impulse (pushActor strength — divided by the victim's weight
   *  like every shove: heavy catches fly shorter by LAW). */
  impulse: number;
  /** Where a monster holder aims its release when the hold runs out:
   *  'foe' = at its current quarry (the gulper spits YOU at your allies),
   *  'away' = out from its own body (default). Player throws aim at the
   *  cursor through the grabThrow skill effect instead. */
  spitAt?: 'foe' | 'away';
}

/** A grab temper — carried by a SkillEffect (grabSeize), so any skill in
 *  the one pipeline can seize. All thresholds default from GRAB_CFG. */
export interface GrabSpec {
  verb: GrabVerb;
  /** Hold length roll, seconds (default GRAB_CFG.holdSec[verb]). The hold
   *  ALWAYS ends: patience is the floor of the counterplay ladder. */
  holdSec?: [number, number];
  /** Struggle-speed multiplier on this hold (>1 = easier escape). */
  breakMult?: number;
  /** Fraction of the HOLDER's max life allies must tear off (in hits,
   *  while it holds) to sever the hold (default GRAB_CFG.break.severFrac). */
  severFrac?: number;
  /** Eligibility ratio override: holder effW × (1+gripPower) must be ≥
   *  victim effW × this (default GRAB_CFG.eligibility.ratio). */
  ratio?: number;
  /** Seize reach beyond touching rims (default GRAB_CFG.attachPad —
   *  striking reach, the cling convention: the snap IS the lunge). */
  pad?: number;
  /** Status the victim wears through the hold (refreshed on the marker
   *  clock beside 'seized'/'swallowed' — a venomous gullet is one row). */
  rideStatus?: string;
  /** SWALLOW: the digestion tick — fraction of the VICTIM's max life per
   *  second, dealt as this type through mitigateTyped (armor and the
   *  defender stack apply; the holder keeps kill credit). */
  dot?: { type: DamageType; frac: number };
  /** SWALLOW: fraction of digestion damage the holder drinks as life. */
  leech?: number;
  /** SWALLOW: bursting OUT (struggle break) wounds the holder this
   *  fraction of ITS max life — the meal fights back (default
   *  GRAB_CFG.burstHurt; physical, credited to the victim). */
  burstHurt?: number;
  /** How the hold ENDS when the holder chooses (holdSec ran out): with a
   *  throw (the spit, the toss) — or, absent, a plain drop at the seat. */
  throw?: GrabThrowSpec;
  /** AI hint while holding: 'away' = haul the catch AWAY from its allies
   *  (the dragger's whole argument); 'hold' = stand your ground on it.
   *  Read by the brain layer, never by this module. */
  haul?: 'away' | 'hold';
  /** Holder move factor while holding (default GRAB_CFG.holderMove[verb]).
   *  0 roots the holder for the hold (the planted maw). */
  holderMove?: number;
}

/** The live pair record (Actor.gripping — the holder OWNS the hold). */
export interface GripHold {
  /** The held victim's actor id (victim.heldBy mirrors back). */
  id: number;
  verb: GrabVerb;
  /** World-time the holder's patience ends (drop or spec.throw). */
  until: number;
  /** The seizing spec (kept whole — release/tick logic reads it live). */
  spec: GrabSpec;
  /** The seizing skill's id — stat tag-filtering + HUD naming. */
  skillId?: string;
  /** Break meter, 0..1 — the victim's struggle fills it (see GRAB_CFG.break). */
  struggle: number;
  /** Holder max-life fraction torn off by OTHERS since the seize (the
   *  ally-sever accumulator — resolveHit feeds it). */
  severed: number;
  /** Marker/rideStatus refresh clock (internal). */
  statusAt: number;
  /** Fractional digestion accumulator (swallow). */
  dotAcc: number;
  /** Seat bearing in the HOLDER's facing frame (carry rides high in front,
   *  drag trails behind) — rolled once so the ride reads stable. */
  bearing: number;
  /** Victim untargetable flag before the swallow (restored on release). */
  wasUntargetable?: boolean;
}

/** THE GRAB FABRIC's modular thresholds — tune HERE, never inline. */
export const GRAB_CFG = {
  /** Seize reach beyond touching rims (world units) — striking reach, so
   *  the seat-snap reads as the lunge (the cling convention). */
  attachPad: 30,

  /** How fast a fresh catch REELS to its seat (world units/s) — a gaff
   *  hooks at range and the body is hauled across the ground to the hand,
   *  never teleported; melee seizes cross their few pixels in a blink. */
  reelSpeed: 460,

  /** WHO CAN GRAB WHOM — the mass law's gate.
   *  holderEffW × (1 + gripPower) ≥ victimEffW × ratio, and never a body
   *  more than maxRatio times your own effective weight no matter the
   *  investment (anatomy has a ceiling; buildcraft moves it, the clamp
   *  keeps 'goblin carries the mountain' out of the world). */
  eligibility: {
    ratio: 0.8,
    maxRatio: 3.2,
  },

  /** Default hold length rolls per verb (seconds). */
  holdSec: {
    carry: [2.8, 4.2] as [number, number],
    drag: [2.4, 3.6] as [number, number],
    pin: [3.0, 4.4] as [number, number],
    swallow: [2.6, 4.0] as [number, number],
  },

  /** Holder move factor per verb while the hold lives (the burden is
   *  real: hauling a body is work — carry walks, pin/swallow ROOT). */
  holderMove: {
    carry: 0.78,
    drag: 0.85,
    pin: 0,
    swallow: 0,
  },

  /** THE BREAK METER — struggle per second at the base, shaped by mass.
   *  rate = base × (victimEffW / holderEffW)^powRatio × spec.breakMult
   *         × policy tier × (1 + victim wriggle) / (1 + holder gripPower)
   *  — heavier victims tear free faster, invested grips hold longer, and
   *  every refused INPUT (a move attempt, a mashed press, a shove eaten
   *  by the grip) feeds on top. A held body is never passive cargo. */
  break: {
    base: 0.16,
    powRatio: 0.6,
    /** Struggle per second of full-stick movement input (the mash lane —
     *  moveActor's refusal converts intent into escape). */
    moveFeed: 0.22,
    /** Struggle per refused skill press (the button-mash lane). */
    mashPress: 0.05,
    /** Struggle per point of eaten shove impulse (a knockback that lands
     *  on a held body jostles the grip instead of moving the body). */
    shoveFeed: 0.0005,
    /** Fraction of the HOLDER's max life allies must hit off to sever. */
    severFrac: 0.12,
    /** Seconds of grab-immunity after ANY release (anti-chain-seize). */
    graceSec: 1.4,
  },

  /** RELEASE POLICY — what tears a hold besides the meter. */
  release: {
    /** Hard CC (stun/freeze/stasis — any hardCC status) on the holder. */
    onHardCC: true,
    /** A push on the HOLDER at or above this raw strength tears the pair
     *  (below it, the grip rides the stumble). */
    shove: 300,
  },

  /** SWALLOW defaults (spec.dot/burstHurt override). */
  swallow: {
    burstHurt: 0.06,
  },

  /** POLICY TIERS — struggle-speed multiplier by victim rarity
   *  (engine/rarity.ts ladder); 0 refuses the seize outright (the crowned
   *  are not luggage). MonsterDef.grabbable overrides per body
   *  (true = tier 1, false = tier 0, number = tier). */
  policy: {
    normal: 1,
    magic: 1,
    rare: 1.75,
    champion: 2.5,
    crowned: 0,
  } as Record<string, number>,

  /** SEAT GEOMETRY (grabSeatPos — one resolver, drawn == held).
   *  Distances in fractions of summed radii. */
  seat: {
    /** carry: hoisted high in FRONT of the holder's facing. */
    carryDist: 0.55,
    /** drag: trailing BEHIND the holder. */
    dragDist: 1.05,
    /** pin: pressed under the holder's leading edge. */
    pinDist: 0.7,
    /** swallow: dead center — the body is INSIDE. */
    swallowDist: 0,
  },

  /** Throw defaults where a spec asks for a throw without sizing it. */
  throw: {
    impulse: 520,
  },
} as const;

/** Verb → the marker status the victim wears (engine/status.ts rows —
 *  the pip is the read, the wire ships it, cleansing it is meaningless
 *  because the sweep re-stamps while the pair lives). */
export const GRAB_MARKER: Record<GrabVerb, string> = {
  carry: 'seized', drag: 'seized', pin: 'seized', swallow: 'swallowed',
};

/** HUD label per verb (the held player's meter names its predicament). */
export const GRAB_VERB_LABEL: Record<GrabVerb, string> = {
  carry: 'Carried', drag: 'Dragged', pin: 'Pinned', swallow: 'Swallowed',
};

/** Account-ledger key: the LOCAL HERO has been seized by a grip (any verb).
 *  Stamped by world.ts grabSeize the moment the hold lands, merged into the
 *  account on death like every counter. THE HARD LESSON seam: discovery
 *  gates read it — the Brawler surfaces in the Vault because something out
 *  there put its hands on you first (unlocks.ts ClassBundleDef.discover).
 *  A raw tally on purpose: "survive 10 holds" content reads the same key. */
export const LEDGER_SEIZED = 'seized_by_grip';

/** The victim-side policy tier: struggle multiplier, or 0 = ungrabbable.
 *  Actor.grabbable (stamped from MonsterDef at mint) wins outright;
 *  otherwise rarity looks up GRAB_CFG.policy (players/mercs tier 1). */
export function grabPolicyOf(victim: Actor): number {
  if (victim.grabbable !== undefined) {
    return typeof victim.grabbable === 'number' ? victim.grabbable
      : victim.grabbable ? 1 : 0;
  }
  return GRAB_CFG.policy[victim.rarity ?? 'normal'] ?? 1;
}

/** May `holder` seize `victim` under `spec` right now? Returns null when
 *  eligible, else the refusal reason (probe- and failNote-friendly).
 *  PURE body/mass/policy law — the world adds its own gates it can test
 *  cheaply in the dispatch (distance, dormancy, grace, team). */
export function grabRefusal(
  holder: Actor, victim: Actor, spec: GrabSpec, gripPower: number,
): string | null {
  if (holder.dead || victim.dead) return 'dead';
  if (holder.gripping) return 'hands full';
  if (victim.heldBy !== undefined) return 'already held';
  if (victim.gripping) return 'it is holding';   // no grab-chains: sever first
  if (holder.heldBy !== undefined) return 'held fast';
  if (holder.clingTo) return 'riding';           // a latched rider has no free hands
  if (victim.untargetable || victim.passive || victim.invulnerable) return 'no purchase';
  if (victim.construct || victim.anchored) return 'rooted fast';
  if (victim.leap || holder.leap) return 'mid-air';
  if (!!victim.flying !== !!holder.flying) return 'out of reach';
  if (victim.sheet.get('phasing') > 0 || holder.sheet.get('phasing') > 0) return 'no rim to hold';
  const policy = grabPolicyOf(victim);
  if (policy <= 0) return 'too mighty to hold';
  const hw = holder.effectiveWeight(), vw = victim.effectiveWeight();
  if (vw > hw * GRAB_CFG.eligibility.maxRatio) return 'far too heavy';
  const ratio = spec.ratio ?? GRAB_CFG.eligibility.ratio;
  if (hw * (1 + Math.max(0, gripPower)) < vw * ratio) return 'too heavy';
  return null;
}

/** The victim's seat for a live hold — a pure function of the holder's
 *  pose, so the slave step, the renderer, and any probe can never
 *  disagree (drawn == held). Seats ride the holder's FACING frame:
 *  carried bodies lead, dragged bodies trail. */
export function grabSeatPos(
  holder: Actor, victim: Actor, hold: GripHold, out: { x: number; y: number },
): void {
  const cfg = GRAB_CFG.seat;
  const span = holder.radius + victim.radius;
  const frac = hold.verb === 'carry' ? cfg.carryDist
    : hold.verb === 'drag' ? cfg.dragDist
    : hold.verb === 'pin' ? cfg.pinDist
    : cfg.swallowDist;
  const back = hold.verb === 'drag' ? Math.PI : 0;
  const ang = holder.facing + back + hold.bearing;
  out.x = holder.pos.x + Math.cos(ang) * span * frac;
  out.y = holder.pos.y + Math.sin(ang) * span * frac;
}

/** The PASSIVE struggle rate for one live hold, per second (event feeds —
 *  move intent, mashed presses, eaten shoves — add on top at the world's
 *  chokepoints). The mass asymmetry, investment on both sides, the spec's
 *  own temper and the victim's policy tier all fold HERE, once. */
export function struggleRate(
  hold: GripHold, holder: Actor, victim: Actor,
): number {
  const b = GRAB_CFG.break;
  const ratio = Math.pow(
    victim.effectiveWeight() / Math.max(0.05, holder.effectiveWeight()),
    b.powRatio);
  const wriggle = 1 + Math.max(0, victim.sheet.get('wriggle'));
  const grip = 1 + Math.max(0, holder.sheet.get('gripPower'));
  return b.base * ratio * (hold.spec.breakMult ?? 1)
    * grabPolicyOf(victim) * wriggle / grip;
}

/** Roll a hold's length for a spec (bounds from the spec or the verb's
 *  CFG row; the roll itself happens at the seize site with the world's
 *  dice so this module stays pure). */
export function grabHoldBounds(spec: GrabSpec): [number, number] {
  return spec.holdSec ?? GRAB_CFG.holdSec[spec.verb];
}

/** The holder's move factor while a hold lives (spec override or verb
 *  default). Multiplies into moveActor like a channel factor. */
export function grabHolderMove(hold: GripHold): number {
  return clamp(hold.spec.holderMove ?? GRAB_CFG.holderMove[hold.verb], 0, 1);
}
