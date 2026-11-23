// ---------------------------------------------------------------------------
// PASS 12 — Class Masteries & Paradigm Engines (10 wheels, 52 nodes, 9 Keystones)
//
// Inspired by iconic class-talent paradigm loops (reactive 5s damage-taken
// recovery, Penance damage redirection, Gale-Flurry twin strikes, chilled
// Shatter crit multiplication, Fate's Lots dice boons, escalating Overload
// Runes, Abyssal Trance haste-vs-drain, contagious Rupture Seeds, Atonement
// damage-to-ally healing, and Solar/Lunar Solstice oscillation) — translated
// into grounded Hollow Wake dark-fantasy identity with zero 1:1 lifts.
// ---------------------------------------------------------------------------

import { gaugeMod as g, mod as m } from '../engine/stats';
import { n, type ExpansionCluster } from './passiveExpansionBase';

export const PASS12_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // STRENGTH — Reactive 5s Damage-Taken Recovery (Sanguine Reprisal)
  // =========================================================================
  {
    id: 'exp_p12_str_blood_debt', wedge: 'str', theme: 'life', shape: 'keystoneTail', pass: 12,
    nodes: [
      n('entry', 'small', 'Scarred Memory', 'Melee, guard, or cooldown hits (2.5s ICD) heal you for 8% of damage suffered in the last 5 seconds.', m('recentDmgHeal', 'flat', 0.08)),
      n('a', 'small', 'Blood-Ledger', '+8% reactive 5s damage-taken recovery; +15 maximum life.', m('recentDmgHeal', 'flat', 0.08), m('life', 'flat', 15)),
      n('b', 'small', 'Coagulated Shell', '12% increased ward gained; 8% increased healing received.', m('wardGain', 'increased', 0.12), m('healTaken', 'increased', 0.08)),
      n('', 'notable', 'Vein-Reckoning', 'Melee, guard, or cooldown hits (2.5s ICD) heal you for +15% of damage taken in the last 5 seconds (excess healing converts into Ward).', m('recentDmgHeal', 'flat', 0.15)),
      n('tail', 'keystone', 'Sanguine Reprisal', 'Melee, guard, or cooldown hits (2.5s ICD) heal you for +38% of damage taken in the last 5 seconds, converting all overflow into Ward; your natural Life Regeneration becomes 0.', m('recentDmgHeal', 'flat', 0.38), m('lifeRegen', 'override', 0), m('lifeRegenPct', 'override', 0)),
    ],
  },

  // =========================================================================
  // FORTITUDE — Penance Vow Damage Redirection (Vow of Reprisal)
  // =========================================================================
  {
    id: 'exp_p12_for_penance_vow', wedge: 'for', theme: 'bastion', shape: 'keystoneTail', pass: 12,
    nodes: [
      n('entry', 'small', 'Marked Nemesis', 'Guarding, warcrying, or striking marks an enemy for 5s; 12% of mitigated hit damage you take redirects onto them.', m('karmaReflect', 'flat', 0.12)),
      n('a', 'small', 'Shared Sentence', '+12% Penance Vow damage redirection; 8% increased armor.', m('karmaReflect', 'flat', 0.12), m('armor', 'increased', 0.08)),
      n('b', 'small', 'Iron Verdict', '+15 maximum life; 10% increased guard strength.', m('life', 'flat', 15), m('guardStrength', 'increased', 0.10)),
      n('', 'notable', 'Mirror of Penance', '+24% of mitigated hit damage you take redirects onto your Penance-marked enemy as physical retribution (capped at 35% max life per hit vs bosses).', m('karmaReflect', 'flat', 0.24)),
      n('tail', 'keystone', 'Vow of Reprisal', '+65% of mitigated hit damage you take redirects onto your Penance-marked foe as physical retribution; +15% maximum life; your own direct hits deal 25% less damage.', m('karmaReflect', 'flat', 0.65), m('life', 'increased', 0.15), m('damage', 'more', -0.25)),
    ],
  },

  // =========================================================================
  // PROWESS — Gale-Flurry Twin Strikes (Tempest Twin-Strike)
  // =========================================================================
  {
    id: 'exp_p12_prw_gale_flurry', wedge: 'prw', theme: 'tempo', shape: 'keystoneTail', pass: 12,
    nodes: [
      n('entry', 'small', 'Squall-Grip', '+6% chance on primary attack hits (1.0s ICD) to unleash 2 instantaneous follow-up flurry strikes at 45% hit damage each.', m('windfuryChance', 'flat', 0.06)),
      n('a', 'small', 'Whirling Wrist', '+6% Gale-Flurry twin strike chance; 5% increased attack speed.', m('windfuryChance', 'flat', 0.06), m('attackSpeed', 'increased', 0.05)),
      n('b', 'small', 'Draft-Edge', '+6% Gale-Flurry twin strike chance; 8% increased melee physical damage.', m('windfuryChance', 'flat', 0.06), m('damage', 'increased', 0.08, ['melee', 'physical'])),
      n('', 'notable', 'Zephyr Flurry', '+14% Gale-Flurry twin strike chance on primary attack hits (1.0s ICD); 8% increased attack speed.', m('windfuryChance', 'flat', 0.14), m('attackSpeed', 'increased', 0.08)),
      n('tail', 'keystone', 'Tempest Twin-Strike', '+35% chance on primary attack hits (1.0s ICD) to unleash 2 instantaneous follow-up flurry strikes at 45% hit damage each; 15% less critical strike multiplier.', m('windfuryChance', 'flat', 0.35), m('critMulti', 'flat', -0.15)),
    ],
  },

  // =========================================================================
  // DEXTERITY — Rime-Glass Shatter (Multiplied Crit vs Chilled + Splinters)
  // =========================================================================
  {
    id: 'exp_p12_dex_rime_shatter', wedge: 'dex', theme: 'cold', shape: 'keystoneTail', pass: 12,
    nodes: [
      n('entry', 'small', 'Frosted Sight', 'Effective critical strike chance is multiplied by +18% against Chilled enemies; +8% chill chance.', m('shatterCritMult', 'flat', 0.18), m('apply_chill', 'flat', 0.08)),
      n('a', 'small', 'Glass Splinter', 'Critical strikes against Chilled enemies splinter cold shards nearby for 12% of hit damage.', m('shatterSplinter', 'flat', 0.12)),
      n('b', 'small', 'Brittle Rime', '+18% critical strike chance multiplier vs Chilled enemies; +6% cold penetration.', m('shatterCritMult', 'flat', 0.18), m('coldPen', 'flat', 0.06)),
      n('', 'notable', 'Glacial Fracture', 'Effective critical strike chance is multiplied by +35% against Chilled foes; crits on Chilled foes splinter cold shards within 135px for +18% hit damage.', m('shatterCritMult', 'flat', 0.35), m('shatterSplinter', 'flat', 0.18)),
      n('tail', 'keystone', 'Rime-Glass Shatter', 'Effective critical strike chance is doubled (+100% multiplier) against Chilled enemies, gaining +30% critical strike multiplier against them and splintering cold shards for +30% hit damage; 35% less base critical strike chance overall.', m('shatterCritMult', 'flat', 1.00), m('shatterSplinter', 'flat', 0.30), m('critMulti', 'flat', 0.30, ['vs:chill']), m('critChance', 'more', -0.35)),
    ],
  },

  // =========================================================================
  // FINESSE — Fate's Lots (Tactical Fortune Dice Boons)
  // =========================================================================
  {
    id: 'exp_p12_fin_cast_lots', wedge: 'fin', theme: 'fortune', shape: 'keystoneTail', pass: 12,
    nodes: [
      n('entry', 'small', 'Carved Knucklebone', 'Cooldown and movement skills (4.5s ICD) cast Fate\'s Lots for 6s tactical boons (+0.4 tier; scales with Luck).', m('fateDiceBonus', 'flat', 0.40)),
      n('a', 'small', 'Weighted Pip', '+0.40 Fate\'s Lots tier; +10% luck.', m('fateDiceBonus', 'flat', 0.40), m('luck', 'flat', 0.10)),
      n('b', 'small', 'Crooked Cup', '10% increased cooldown recovery rate; +3% critical strike chance.', m('cooldownRecovery', 'increased', 0.10), m('critChance', 'flat', 0.03)),
      n('', 'notable', 'Cast the Lots', 'Cooldown and movement skills (4.5s ICD) cast Fate\'s Lots for 6s boons (Broadside, True Bearing, Sharpened Edge, or Swift Tide) with Luck-scaled double-match chance; +15% luck.', m('fateDiceBonus', 'flat', 0.80), m('luck', 'flat', 0.15)),
      n('tail', 'keystone', 'Loaded Bones', 'Fate\'s Lots always rolls 2 simultaneous tactical boons (with a Luck-scaled 25%+ chance for 3); each cast carries a 20% Snake-Eyes risk (+15% damage taken & +22% speed for 3s).', m('fateDiceBonus', 'flat', 2.00), m('luck', 'flat', 0.20)),
    ],
  },

  // =========================================================================
  // INTELLIGENCE — Runic Overcharge (Escalating Spell Damage & Mana Cost)
  // =========================================================================
  {
    id: 'exp_p12_int_overload_runes', wedge: 'int', theme: 'arcana', shape: 'keystoneTail', pass: 12,
    nodes: [
      n('entry', 'small', 'Etched Charge', 'Spell casts stack Overload Runes (0..4, 8s decay) for +4% more spell damage per rune; non-spells discharge runes to restore 8% max mana each.', m('overloadPower', 'flat', 0.04)),
      n('a', 'small', 'Deep Wellspring', '+4% Overload Rune spell damage per stack; 10% increased maximum mana.', m('overloadPower', 'flat', 0.04), m('mana', 'increased', 0.10)),
      n('b', 'small', 'Volatile Conduit', '3% increased cast speed per Overload Rune; +12% mana regeneration.', g('castSpeed', 'increased', 0.03, 'overload'), m('manaRegen', 'increased', 0.12)),
      n('', 'notable', 'Arcane Saturation', 'Spell casts bank up to 4 Overload Runes (+7% more spell damage per rune); non-spell skills discharge all runes for 8% max mana each; +15% maximum mana.', m('overloadPower', 'flat', 0.07), m('mana', 'increased', 0.15)),
      n('tail', 'keystone', 'Runic Overcharge', 'Overload Runes grant +16% more spell damage and +5% cast speed per stack (up to 4 = +64% more), while raising spell mana cost by +30% per stack; non-spell casts discharge all runes for 8% max mana each.', m('overloadPower', 'flat', 0.16), g('castSpeed', 'increased', 0.05, 'overload'), g('manaCost', 'increased', 0.30, 'overload', ['spell'])),
    ],
  },

  // =========================================================================
  // WILLPOWER 1 — Abyssal Trance (Ramping Haste & Chaos vs Accelerating Drain)
  // =========================================================================
  {
    id: 'exp_p12_wil_abyssal_trance', wedge: 'wil', theme: 'entropy', shape: 'keystoneTail', pass: 12,
    nodes: [
      n('entry', 'small', 'Whispered Cadence', 'Chaos and curse casts enter Abyssal Trance (climbing +1/s up to 15) for +1% more chaos/spell damage per stack while draining mana and ES.', m('tranceRamp', 'flat', 0.01)),
      n('a', 'small', 'Hollow Pulse', '1.5% increased cast speed per Abyssal Trance stack; +12 maximum energy shield.', g('castSpeed', 'increased', 0.015, 'trance'), m('energyShield', 'flat', 12)),
      n('b', 'small', 'Frayed Sanity', '+1% Abyssal Trance damage scaling per stack; 10% increased chaos damage.', m('tranceRamp', 'flat', 0.01), m('damage', 'increased', 0.10, ['chaos'])),
      n('', 'notable', 'Surrendered Mind', 'Abyssal Trance grants +2% more chaos/spell damage and +2% cast speed per stack (up to 15) while draining mana and energy shield.', m('tranceRamp', 'flat', 0.02), g('castSpeed', 'increased', 0.02, 'trance')),
      n('tail', 'keystone', 'Descent into Unmaking', 'Chaos and curse casts enter Abyssal Trance (up to 15 stacks): +3.5% more chaos/spell damage, +3% cast speed, and +2% ailment magnitude per stack while accelerating Mana and Energy Shield drain until exhausted; 20% less maximum life.', m('tranceRamp', 'flat', 0.035), g('castSpeed', 'increased', 0.03, 'trance'), g('statusMagnitude', 'increased', 0.02, 'trance'), m('life', 'more', -0.20)),
    ],
  },

  // =========================================================================
  // WILLPOWER 2 — Contagious Seed (Timed Threshold / Death Detonation + DoT Spread)
  // =========================================================================
  {
    id: 'exp_p12_wil_rupture_seed', wedge: 'wil', theme: 'entropy', shape: 'fork', pass: 12,
    nodes: [
      n('entry', 'small', 'Planted Spore', 'Applying a curse or damaging ailment plants a 3.5s Rupture Seed that detonates on death or 25% life lost for 10 (+2.5 per level) chaos/fire AoE and spreads DoTs.', m('ruptureSeed', 'flat', 10), g('ruptureSeed', 'flat', 2.5, 'level')),
      n('a', 'small', 'Swollen Pod', '+10 (+2.5 per level) Rupture Seed detonation damage; 10% increased area of effect.', m('ruptureSeed', 'flat', 10), g('ruptureSeed', 'flat', 2.5, 'level'), m('aoeRadius', 'increased', 0.10)),
      n('b', 'small', 'Virulent Husk', '10% increased chaos damage; +8% curse and ailment chance.', m('damage', 'increased', 0.10, ['chaos']), m('statusChance', 'flat', 0.08)),
      n('', 'notable', 'Blight-Seed', '+18 (+4.5 per level) Rupture Seed detonation damage; detonated seeds transplant active damaging ailments to all struck foes within 140px.', m('ruptureSeed', 'flat', 18), g('ruptureSeed', 'flat', 4.5, 'level')),
      n('tailA', 'notable', 'Blooming Contagion', '+18 (+4.5 per level) Rupture Seed detonation damage; 16% increased area of effect; 14% increased ailment magnitude.', m('ruptureSeed', 'flat', 18), g('ruptureSeed', 'flat', 4.5, 'level'), m('aoeRadius', 'increased', 0.16), m('statusMagnitude', 'increased', 0.14)),
      n('tailB', 'notable', 'Malignant Harvest', '+12% chaos penetration; +1 ailment stack limit; 14% increased curse and DoT duration.', m('chaosPen', 'flat', 0.12), m('ailmentStacks', 'flat', 1), m('effectDuration', 'increased', 0.14)),
    ],
  },

  // =========================================================================
  // WISDOM — Atonement Hymn (Direct Spell/Song Damage Heals Minions & Allies)
  // =========================================================================
  {
    id: 'exp_p12_wis_atonement_hymn', wedge: 'wis', theme: 'life', shape: 'keystoneTail', pass: 12,
    nodes: [
      n('entry', 'small', 'Votive Verse', '6% of your direct spell and song hit damage heals your living minions, companions, and nearby allies.', m('atonementHeal', 'flat', 0.06)),
      n('a', 'small', 'Censer-Mending', '+6% Atonement damage-to-ally healing; 10% increased minion maximum life.', m('atonementHeal', 'flat', 0.06), m('minionLife', 'increased', 0.10)),
      n('b', 'small', 'Radiant Choir', '10% increased spell and song damage; 8% increased healing power.', m('damage', 'increased', 0.10, ['spell']), m('damage', 'increased', 0.10, ['song']), m('healPower', 'increased', 0.08)),
      n('', 'notable', 'Atonement Litany', '+12% of your direct spell and song hit damage heals your living minions, companions, and nearby allies (and yourself at 35% efficiency).', m('atonementHeal', 'flat', 0.12)),
      n('tail', 'keystone', 'Choir of Atonement', '+32% of your direct spell and song hit damage heals your living minions, companions, and nearby allies; +18% more spell and song damage; your direct Heal-tagged skills have 50% less healing power.', m('atonementHeal', 'flat', 0.32), m('damage', 'more', 0.18, ['spell']), m('damage', 'more', 0.18, ['song']), m('healPower', 'more', -0.50, ['heal'])),
    ],
  },

  // =========================================================================
  // CHARISMA — Solstice Pendulum (Solar Fire/Phys ↔ Lunar Cold/Light Oscillation)
  // =========================================================================
  {
    id: 'exp_p12_cha_solstice_pendulum', wedge: 'cha', theme: 'time', shape: 'keystoneTail', pass: 12,
    nodes: [
      n('entry', 'small', 'Turning Dial', 'Casting 3 Fire/Physical skills grants 6s Lunar Zenith (+10% more Cold/Lightning damage); 3 Cold/Lightning grants 6s Solar Zenith (+10% more Fire/Physical).', m('solsticePower', 'flat', 0.10)),
      n('a', 'small', 'Sun-Phase Rhythm', '+8% Solstice Zenith power; 8% increased fire and physical damage.', m('solsticePower', 'flat', 0.08), m('damage', 'increased', 0.08, ['fire']), m('damage', 'increased', 0.08, ['physical'])),
      n('b', 'small', 'Moon-Phase Rhythm', '+8% Solstice Zenith power; 8% increased cold and lightning damage.', m('solsticePower', 'flat', 0.08), m('damage', 'increased', 0.08, ['cold']), m('damage', 'increased', 0.08, ['lightning'])),
      n('', 'notable', 'Equinox Measure', '+15% Solstice Zenith more damage (+15% cast and attack speed during either Zenith); 10% increased effect duration.', m('solsticePower', 'flat', 0.15), m('effectDuration', 'increased', 0.10)),
      n('tail', 'keystone', 'Solstice Pendulum', 'Alternating 3 Fire/Physical and 3 Cold/Lightning casts triggers 6s opposing Solstice Zenith granting +38% more damage and +15% speed to the opposite schools; 15% less hit damage outside Zenith schools.', m('solsticePower', 'flat', 0.38), m('damage', 'more', -0.15)),
    ],
  },
];
