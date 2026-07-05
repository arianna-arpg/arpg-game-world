// ---------------------------------------------------------------------------
// CHARGE REGISTRY — combo resources as data.
//
// Charges have always been named counters on the actor (fury, static,
// stealth). This registry gives each name an optional PERSONALITY without
// touching the counter mechanics:
//   - perCharge: modifiers granted PER CHARGE HELD (rage's climbing speed) —
//     synced into the sheet as source `charge:<id>` whenever the count moves.
//   - decay: unattended charges drain away (souls fade; rage cools).
//   - a DRAIN (started by a skill's drainCharge effect) burns the bank down
//     over time — and while a drain runs, the charge CANNOT be gained
//     ("can't gain X while in X" — the Bloodlust one-way valve).
//
// A charge with no entry here behaves exactly as before: a mute counter.
// New charges are added here and referenced by name from any skill/proc.
// ---------------------------------------------------------------------------

import { mod, type Modifier } from './stats';

export interface ChargeDef {
  label: string;
  color: string;
  /** Modifiers granted per charge held (value × current count). */
  perCharge?: Modifier[];
  /** perCharge mods apply ONLY while the charge is DRAINING — the bank is
   *  mute potential until the vent opens (Bloodlust: nothing until you
   *  unleash; then the high burns down charge by charge). */
  modsWhileDraining?: true;
  /** Unattended decay: after `delay` seconds without a gain, lose
   *  `perSec` charges per second (fractional, accumulated). */
  decay?: { perSec: number; delay?: number };
}

export const CHARGE_DEFS: Record<string, ChargeDef> = {
  fury: {
    label: 'Fury', color: '#e87838',
    // Mute fuel by design — Reckoning's damagePerCharge is the payoff.
  },
  static: {
    label: 'Static', color: '#ffe94a',
  },
  stealth: {
    label: 'Stealth', color: '#4a5a78',
  },

  // RAGE (Berserk): every charge quickens and hardens the swing — flat
  // attack damage AND speed per charge, cooling fast once the hitting
  // stops. Fed by Berserk's melee blows and by rage remnants; capacity is
  // investable through the chargeCap stat.
  rage: {
    label: 'Rage', color: '#e04030',
    perCharge: [
      mod('attackSpeed', 'increased', 0.025),
      mod('damage', 'increased', 0.02, ['attack']),
      mod('addedPhysical', 'flat', 0.5, ['attack']),
    ],
    decay: { perSec: 1, delay: 3 },
  },

  // BLOODLUST: builds on its own clock, holds indefinitely as MUTE
  // POTENTIAL — the banked charges grant NOTHING until UNLEASHED. Then the
  // drain opens (gains blocked until empty) and every remaining charge
  // feeds the high, so it burns hot and wears off smoothly. Bigger banks
  // start higher and last longer; the buff is withheld until it's used.
  bloodlust: {
    label: 'Bloodlust', color: '#c02848',
    modsWhileDraining: true,
    perCharge: [
      mod('attackSpeed', 'increased', 0.02),
      mod('castSpeed', 'increased', 0.02),
      mod('moveSpeed', 'increased', 0.012),
      mod('damage', 'increased', 0.02),
    ],
  },

  // SOULS (Soul Harvest): the dead nearby feed the reliquary; unspent
  // souls seep away slowly. Pure fuel — the harvest skill's
  // damagePerCharge is where they burn.
  soul: {
    label: 'Souls', color: '#9a86e8',
    decay: { perSec: 0.5, delay: 6 },
  },

  // GYRE (Gyreblade): caught returning blades, banked in the hand — Gyre
  // Hurl flings one shard per charge. Unspent blades are eventually set down.
  gyre: {
    label: 'Gyre', color: '#b8d0d8',
    decay: { perSec: 0.5, delay: 8 },
  },

  // STORM (Tempest Gathering): banked by landing strikes; each held charge
  // QUICKENS the discharge beat (DischargeSpec.intervalPerCharge) — the
  // storm spends itself faster the fuller it gets. Idle storms disperse.
  storm: {
    label: 'Storm', color: '#c8e84a',
    decay: { perSec: 0.5, delay: 5 },
  },

  // FRENZY (Frenzied Riftstep): the classic kill-fed tempo charge — every
  // charge held quickens hand, mind and heel; unspent frenzy cools off.
  // Spenders burn the bank for their own payoff (repeatsPerCharge /
  // damagePerCharge), so holding vs spending is a real decision.
  frenzy: {
    label: 'Frenzy', color: '#8ae06a',
    perCharge: [
      mod('attackSpeed', 'increased', 0.03),
      mod('castSpeed', 'increased', 0.03),
      mod('moveSpeed', 'increased', 0.02),
    ],
    decay: { perSec: 0.5, delay: 8 },
  },

  // VERDICT (Stored Verdict): completed real uses of the hosting skill
  // bank toward the meta-release. Mute fuel; the release is the payoff.
  verdict: {
    label: 'Verdict', color: '#e8d44a',
  },

  // COMMUNION (the ebb-and-flow summoner): banked by YOUR minions' blows
  // (the Communion of Flesh tithe), each held charge feeding both the
  // shepherd's hand and the flock — and any spender graft can burn the
  // bank for its own payoff. Fades if the flock stops swinging.
  communion: {
    label: 'Communion', color: '#b06bd4',
    perCharge: [
      mod('damage', 'increased', 0.012),
      mod('minionDamage', 'increased', 0.02),
    ],
    decay: { perSec: 0.5, delay: 6 },
  },

  // FLASK FOUNTS: scooped orbs bank a sip alongside their instant pour
  // (ChargeGainSpec on 'orbPickup'); the flask skill drinks the bank as a
  // restore-over-time. Mute counters — the payoff lives on the drink.
  flask_life: {
    label: 'Life Fount', color: '#d04848',
  },
  flask_mana: {
    label: 'Mana Fount', color: '#4a78d8',
  },
  // The alchemist's catalyst: EVERY orb kind feeds it; drinking it buys a
  // short, stacking transmutation high (the flask-as-buff lane).
  flask_catalyst: {
    label: 'Catalyst', color: '#c8a848',
  },

  // STATIC (Galvanic Reserve): built by walking and by being struck —
  // movement-as-accumulation. Mute; the discharge nova is the payoff.
  // (Also fed by Static Strike's blows — shared fuel is a feature: the
  // two skills wire into one battery when equipped together.)
};

/** Display color for a charge's pips (registry tint, or the old red). */
export function chargeColor(id: string): string {
  return CHARGE_DEFS[id]?.color ?? '#e05545';
}
