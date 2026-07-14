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

import { mod, STAT_DEFS, type Modifier } from './stats';

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
  /** Cap for gains WITHOUT a skill context — orb pours, passive accrual
   *  (chargeRegen_<id>). Skill taps carry their own max; this is the
   *  bank's floor when nothing on the bar vouches for it. */
  baseCap?: number;
  /** Where the HUD shows the bank. 'slot' pins the pips ONTO the hotbar
   *  slot of whichever slotted skill SPENDS this charge (founts ride
   *  their flask's icon — ammunition reads at the button that fires it),
   *  and the buff-row pip lane skips it. A 'slot' charge with no slotted
   *  spender falls back to the buff row: the count is never hidden.
   *  Unset = the classic buff-row pip. */
  hud?: 'slot';
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

  // VERSE (the skald's meter): banked one per sung verse — war_chant and
  // dissonance each tap 'use' — and spent whole by the Coda. Mute fuel by
  // design (damagePerCharge is the payoff); a rest too long and the music
  // forgets itself.
  verse: {
    label: 'Verse', color: '#d8a8e0',
    decay: { perSec: 0.5, delay: 8 },
  },

  // RIPOSTE (Answering Steel): banked by MADE BLOCKS — guard, passive, or
  // parry — and spent by the answering thrust. Mute fuel; the meta-skill
  // is the payoff. Fades once the shield stops working.
  riposte: {
    label: 'Riposte', color: '#d8e8f8',
    decay: { perSec: 1, delay: 6 },
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

  // BREW (Slow Brew): time itself banks the next big swing — mute fuel on
  // a slow drip; the spender graft drinks the pot for more damage.
  brew: {
    label: 'Brew', color: '#c8a848',
    decay: { perSec: 0.25, delay: 10 },
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
  // (ChargeGainSpec on 'orbPickup'); the flask skill spends the bank as
  // AMMUNITION — one drink, one sip, a fixed pour (the catalyst gulps
  // instead: chargeCost 'all' + perCharge, the scale-with-bank lane).
  // Mute counters — the payoff lives on the drink. hud 'slot' pins the
  // sips over the flask's own hotbar icon.
  flask_life: {
    label: 'Life Fount', color: '#d04848', hud: 'slot',
  },
  flask_mana: {
    label: 'Mana Fount', color: '#4a78d8', hud: 'slot',
  },
  // The alchemist's catalyst: EVERY orb kind feeds it; drinking it buys a
  // short, stacking transmutation high (the flask-as-buff lane).
  flask_catalyst: {
    label: 'Catalyst', color: '#c8a848', hud: 'slot',
  },
  // UTILITY FOUNTS (the buff-flask wing): any orb kind banks a sip; the
  // drink pours a STANCE instead of a pool — quicksilver's heels, the
  // stoneskin hide, the antidote's clean blood. Mute counters like their
  // elder siblings: the payoff lives on each drink's buff.
  flask_quicksilver: {
    label: 'Quicksilver Fount', color: '#b8d8e8', hud: 'slot',
  },
  flask_stoneskin: {
    label: 'Stoneskin Fount', color: '#a89878', hud: 'slot',
  },
  flask_antidote: {
    label: 'Antidote Fount', color: '#88c878', hud: 'slot',
  },

  // WAKEFLAME (the votive economy): funeral-vigil flames, shed as ORBS
  // (ORB_DEFS.wakeflame) by the skills that keep the wake, banked here on
  // the scoop. MUTE BY DESIGN — the payoffs are all composable elsewhere:
  // orbRefund_wakeflame cooldown subscriptions, Deathwatch's charge-fed
  // upkeep, Requiem's damagePerCharge, and passive gaugeMods on
  // 'charge:wakeflame' (the build-your-own-buff lane). No decay: a lit
  // candle keeps until it is spent or burned.
  wakeflame: {
    label: 'Wakeflame', color: '#ffd98a',
    baseCap: 5,
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

/** Display label for a charge (registry name, or the raw id). */
export function chargeLabel(id: string): string {
  return CHARGE_DEFS[id]?.label ?? id;
}

// Generated per-charge stat families, mirroring remnantDrop_<id>: any
// modifier source — passive node, support, affix, buff — reaches a
// SPECIFIC charge through the ordinary stat engine:
//   chargeCap_<id>    extra max on top of every gain path's cap (the
//                     untagged sibling of the skill-scoped chargeCap stat
//                     — it also raises orb-pour and accrual banks).
//   chargeRegen_<id>  passive accrual, charges per 10 seconds (needs a
//                     bank: the def's baseCap or invested cap).
for (const [id, def] of Object.entries(CHARGE_DEFS)) {
  STAT_DEFS['chargeCap_' + id] = {
    label: `Maximum ${def.label}`, base: 0,
  };
  STAT_DEFS['chargeRegen_' + id] = {
    label: `${def.label} per 10s`, base: 0, min: 0,
  };
}

/** Stat ids for a charge's extra cap and passive accrual. */
export function chargeCapStat(id: string): string { return 'chargeCap_' + id; }
export function chargeRegenStat(id: string): string { return 'chargeRegen_' + id; }
