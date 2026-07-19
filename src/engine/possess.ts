// ---------------------------------------------------------------------------
// THE POSSESSION SEAM — one seat-to-body indirection; possession and
// shapeshifting are its consumers, not its owners.
//
// The game already isolates CONTROL from BODY: a Seat drives whatever actor
// it points at (World.applyInputs), the camera and HUD read the pointer
// (world.player = localSeat.actor), and updateAI skips any seated body. The
// seam makes that pointer RE-POINTABLE — World.seatEmbody moves a seat into
// a foreign body, World.seatEject brings it home — and everything downstream
// (camera follow, the skill bar presenting the borrowed kit, AI silence on
// the ridden body, the death gate, survival meters, dwells) follows the
// pointer with no edits, because they always read the seat.
//
// TWO CONSUMERS, ONE LAW, DIFFERENT RISK:
//   · POSSESSION ('possess' effect): a landed blow on a WEAKENED enemy moves
//     your seat into its body for a duration. You cast ITS kit at ITS stats,
//     wear ITS faction as a GUISE (the pack ignores you until you draw
//     blood), and your own flesh stands ENTRANCED where you left it — the
//     husk is the risk valve: hurt enough, it calls you home; killed, YOU
//     die (the seat snaps home first, so permadeath stays byte-honest).
//   · SHAPESHIFT ('shapeshift' effect): re-point into a MINTED form-body you
//     own, at will. The husk is CARRIED (withdrawn from the world — the
//     flesh IS elsewhere), so the risk moves into the form: the form's death
//     ejects you staggered, and the form is the weaker vessel (powerFactor).
//
// POLICY IS DATA: eligibility (the weakened fraction × rarity policy tiers,
// MonsterDef.possessable explicit allow/deny over structural refusals),
// duration, the guise-break law, the husk interrupt ladder, and every eject
// consequence are POSSESS_CFG dials or PossessSpec fields on the skill row.
// Attribution stays honest by construction: XP flows to SEATS (grantXp) and
// level-ups land on the HERO body (World.seatHero), never the borrowed one.
//
// Docs in docs/engine/possession.md; probe balance/probe_possession.ts.
// ---------------------------------------------------------------------------

import type { Actor, Team, UnitKind } from './actor';
import { MONSTERS } from '../data/monsters';

export const POSSESS_CFG = {
  /** Default WEAKENED gate: a target at or below this life fraction may be
   *  possessed (PossessSpec.lifeFrac overrides per skill; the rarity policy
   *  below scales it). MonsterDef.possessable: true waives the gate whole —
   *  the Vacant Shell is enterable at full health, which is its point. */
  lifeFrac: 0.4,
  /** Base seconds a possession holds (PossessSpec.duration overrides;
   *  scaled by the possessDuration stat read off the pressing gem). */
  duration: 14,
  /** MORE damage multiplier on a possessed body's casts — THE balance
   *  lever over every borrowed kit (the mimic powerFactor idiom, worn as
   *  a sheet source on the body so its own instances scale). The
   *  possessPower stat adds to it. */
  powerFactor: 0.8,
  /** Shapeshift form haircut — gentler: the form is YOURS, minted at your
   *  level, and its death only staggers you. */
  shiftPowerFactor: 0.9,
  /** RARITY POLICY (the GRAB_CFG.policy idiom, over the engine/rarity.ts
   *  ladder): a multiplier on the weakened fraction per victim rarity
   *  tier — rares and champions must be beaten lower before the door
   *  opens; 0 refuses outright (the crowned keep their own seats).
   *  MonsterDef.possessable overrides either way. */
  policy: { normal: 1, magic: 1, rare: 0.6, champion: 0.35, crowned: 0 } as Record<string, number>,
  /** THE HUSK LADDER — what calls the seat home early. */
  endOn: {
    /** Fraction of the husk's max life lost while away → snapback ("the
     *  pain calls you home"). The huskGuard stat scales damage the
     *  vacated husk takes, so supports widen the leash honestly. */
    huskLostFrac: 0.35,
    /** A seized/swallowed husk snaps the seat home — you cannot ride a
     *  stranger while something drags your body away. */
    huskSeized: true,
  },
  /** EJECT CONSEQUENCES per reason (every one a dial, none a hardcode). */
  eject: {
    /** Seconds of stun the vacated MONSTER body wears on a voluntary or
     *  duration eject — the stagger is your escape window, and the
     *  counterplay window when a monster is ejected mid-pack. */
    bodyStun: 0.8,
    /** Seconds of stun YOU wear when your embodiment DIES under you
     *  (form or possessed body both) — the backlash. */
    selfStun: 0.6,
    /** Cooldown stamped on the pressing gem at eject (seconds) — the
     *  re-possess pace. Skill's own cooldown field wins if longer. */
    cooldown: 8,
  },
  /** Kind-tag refusals when MonsterDef.possessable is unset (the mimic
   *  denyTags lane). Empty by default — structure, not taxonomy, is what
   *  refuses; deny a family here the day one needs it. */
  denyTags: [] as string[],
};

/** What a 'possess' skill effect carries — every field optional, every
 *  fallback a POSSESS_CFG dial. Policy on the ROW, law in the engine. */
export interface PossessSpec {
  /** Seconds inside (default POSSESS_CFG.duration). */
  duration?: number;
  /** Weakened gate override (default POSSESS_CFG.lifeFrac). */
  lifeFrac?: number;
  /** Borrowed-kit MORE-damage factor (default POSSESS_CFG.powerFactor). */
  powerFactor?: number;
  /** Walk the pack unseen until you draw blood (default true). */
  guise?: boolean;
  /** Husk stance: 'stands' (entranced where you left it — the possession
   *  risk valve) or 'carried' (withdrawn with you — the shapeshift law).
   *  Default 'stands'. */
  husk?: 'stands' | 'carried';
  /** Husk-loss snapback override (default POSSESS_CFG.endOn.huskLostFrac;
   *  0 disables the interrupt — a keystone's confidence, priced there). */
  huskLostFrac?: number;
}

/** What a 'shapeshift' effect carries: the form is a MonsterDef id — the
 *  form IS the catalog creature, minted at your level through the one
 *  createMonster path. */
export interface ShiftSpec {
  /** Monster def id to mint and wear. */
  form: string;
  /** Form MORE-damage factor (default POSSESS_CFG.shiftPowerFactor). */
  powerFactor?: number;
  /** Seconds the form holds (0/unset = until re-press or death). */
  duration?: number;
}

/** Why an embodiment ended — policy keys, probe vocabulary, HUD copy. */
export type EjectReason =
  | 'press'       // the Relinquish / Return to Flesh press
  | 'duration'    // the clock ran out
  | 'bodyDied'    // the borrowed body was killed under you
  | 'huskDying'   // your abandoned flesh took a lethal blow — you die in it
  | 'huskPain'    // the husk-loss interrupt called you home
  | 'huskSeized'  // something dragged your body — the leash snapped
  | 'travel'      // zone transit unwinds every embodiment
  | 'released';   // system release (unslot, dev lever, run end)

/** THE RIDE — lives on the BORROWED body while a seat is inside it. One
 *  record carries everything eject needs to restore, so the swap is
 *  lossless by construction. */
export interface PossessRide {
  seatId: string;
  kind: 'possess' | 'shift';
  /** Restoration ledger: what the body was before the seat moved in. */
  prevTeam: Team;
  prevKind: UnitKind | undefined;
  /** The body's own faction, worn as cover while unbroken. */
  guiseFaction?: string;
  guiseBroken?: boolean;
  /** World time the ride lapses (undefined = open-ended). */
  until?: number;
  /** The husk's life at embark + the snapback fraction (0 = off). */
  huskLifeAt: number;
  huskLostFrac: number;
  huskMode: 'stands' | 'carried';
  /** Index of the guest slot appended to the body's kit — the pressing
   *  gem rides along so the same button ends what it began. */
  guestSlot: number;
  /** The pressing gem's skill id (cooldown home for the eject stamp). */
  gemId: string;
  /** Shapeshift only: the minted form is culled at eject (it is a
   *  projection of you, not a creature the world keeps). */
  mintedForm?: boolean;
}

/** THE VACANCY — lives on the HUSK (the hero body left behind) while its
 *  seat is away. updateAI skips vacated bodies outright: a seat's home is
 *  seat-driven or nobody-driven, never brain-driven. */
export interface VacantMark {
  seatId: string;
}

// --- policy ----------------------------------------------------------------

/** STRUCTURAL refusals — bodies no seat can honestly wear. These hold even
 *  against an explicit `possessable: true` (they are entangled with state
 *  the swap cannot carry), EXCEPT the boss line, which possessable: true
 *  deliberately opens (an authored capturable boss is a design lever). */
function possessStructuralWhy(target: Actor): string | null {
  if (target.construct) return 'nothing dwells in it';
  if (target.doorId !== undefined) return 'it is a door';
  if (target.partLink || target.partActors?.length || target.worm) return 'too vast to hold';
  if (target.companion) return 'the bond refuses';
  if (target.owner) return 'already another\'s creature';
  if (target.defId && MONSTERS[target.defId]?.driven) return 'nothing dwells in it';
  return null;
}

/**
 * May this seat enter this body RIGHT NOW? Returns null for yes, else the
 * refusal note (the grab fabric's teaching-refusal idiom — quiet on
 * monsters, a failNote on the local hero). Pure body/policy law; the world
 * adds its own gates (already ridden, same team) at the call site.
 */
export function possessRefusal(target: Actor, spec: PossessSpec | undefined): string | null {
  if (target.possession) return 'already ridden';
  if (target.vacated) return 'that flesh is yours';
  const structural = possessStructuralWhy(target);
  if (structural) return structural;
  const def = target.defId ? MONSTERS[target.defId] : undefined;
  const allow = def?.possessable;
  if (allow === false) return 'the will inside refuses';
  if (def && (def.bossBar ?? def.boss) && allow !== true) return 'the will inside refuses';
  if (allow === true) return null; // an open door needs no weakening
  if (def?.tags?.some(t => POSSESS_CFG.denyTags.includes(t))) return 'the will inside refuses';
  const tier = POSSESS_CFG.policy[target.rarity ?? 'normal'] ?? 1;
  if (tier <= 0) return 'the will inside refuses';
  const frac = (spec?.lifeFrac ?? POSSESS_CFG.lifeFrac) * tier;
  const maxLife = target.maxLife();
  if (maxLife > 0 && target.life / maxLife > frac) return 'not weakened enough';
  return null;
}

/**
 * May a NON-SEAT rider (a wisp, a spirit — monster-side possession) enter
 * this body? The seam's THIRD consumer lane: the same structural law seats
 * obey — nothing dwells in constructs/doors/worms, bonds and owners refuse,
 * an explicit `possessable: false` (or a deny tag) refuses ALL riders, and
 * the boss line stays shut unless `possessable: true` deliberately opens
 * it — minus the weakened gate and the rarity policy: a wild rider picks
 * its hosts by its OWN policy (the wisp wants the strongest), but what can
 * be ENTERED is one law for every rider in the game. A body already ridden
 * (by seat or spirit) and a vacated husk both refuse: one will per flesh.
 */
export function riderRefusal(target: Actor): string | null {
  if (target.possession) return 'already ridden';
  if (target.vacated) return 'a seat holds it';
  const structural = possessStructuralWhy(target);
  if (structural) return structural;
  const def = target.defId ? MONSTERS[target.defId] : undefined;
  const allow = def?.possessable;
  if (allow === false) return 'the will inside refuses';
  if (def && (def.bossBar ?? def.boss) && allow !== true) return 'the will inside refuses';
  if (allow === true) return null;
  if (def?.tags?.some(t => POSSESS_CFG.denyTags.includes(t))) return 'the will inside refuses';
  return null;
}

/** The ride's damage factor as a sheet-source payload: worn on the BODY
 *  (its own instances scale), removed whole at eject. 1 = no source. */
export function possessPowerFactor(spec: { powerFactor?: number } | undefined, kind: 'possess' | 'shift', statBonus = 0): number {
  const base = spec?.powerFactor
    ?? (kind === 'shift' ? POSSESS_CFG.shiftPowerFactor : POSSESS_CFG.powerFactor);
  return Math.max(0.1, base + statBonus);
}
