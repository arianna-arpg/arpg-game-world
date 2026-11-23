// ---------------------------------------------------------------------------
// PASSIVE EXPANSION — PASS 7: MULTI-AVENUE OBSCURE BUILD-AROUND ENGINES
// 18 wheels (2 per wedge, 80 nodes, 8 true one-way PoE-style Keystones)
// introducing five interconnected scaling engines currently absent from the
// Star — each feedable and scalable through multiple orthogonal avenues:
//   1. Overkill Cascade (overkillCarry / overkillRadius + AoE + Cull + big hits)
//   2. Glancing / Graze Deflection (grazeChance / grazeMitigation / grazeWard)
//   3. Voluntary Trauma & Recent Wounds ('wounds' gauge + traumaCost + costToLife)
//   4. Excess Accuracy Overflow ('accOver' gauge + accuracy stacking)
//   5. Cooldown-Weight Scaling (cooldownPower + addedCooldown + CDR/charges)
//   6. Temporal Debt / Delayed Echo (hitEchoFrac / hitEchoDelay / hitEchoAoe)
// ---------------------------------------------------------------------------

import {
  gaugeMod as g,
  linkIncMod as linkInc,
  mod as m,
} from '../engine/stats';
import { n, type ExpansionCluster } from './passiveExpansionBase';

export const PASS7_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // STRENGTH — PASS 7 (2 wheels, 10 nodes, 2 Keystones)
  // =========================================================================
  {
    id: 'exp_p7_str_overkill', wedge: 'str', theme: 'impact', shape: 'keystoneTail', pass: 7,
    nodes: [
      n('entry', 'small', 'Heavy Finish', '8% increased physical damage; 8% of overkill damage cascades to nearby enemies.', m('damage', 'increased', 0.08, ['physical']), m('overkillCarry', 'flat', 0.08)),
      n('a', 'small', 'Shattering Excess', '12% of overkill damage cascades to nearby enemies.', m('overkillCarry', 'flat', 0.12)),
      n('b', 'small', 'Wide Concussion', '+35 Overkill Cascade radius; 8% increased area of effect.', m('overkillRadius', 'flat', 35), m('aoeRadius', 'increased', 0.08)),
      n('', 'notable', 'Executioner\'s Ripple', '25% of overkill damage cascades to nearby enemies.', m('overkillCarry', 'flat', 0.25)),
      n('tail', 'keystone', 'Gilded Guillotine', '45% of overkill damage cascades to nearby enemies with +60 radius; 35% more damage against low-life enemies; 30% less damage against full-life enemies.', m('overkillCarry', 'flat', 0.45), m('overkillRadius', 'flat', 60), m('damage', 'more', 0.35, ['vs:lowLife']), m('damage', 'more', -0.30, ['vs:fullLife'])),
    ],
  },
  {
    id: 'exp_p7_str_trauma', wedge: 'str', theme: 'life', shape: 'keystoneTail', pass: 7,
    nodes: [
      n('entry', 'small', 'Bruised Momentum', '2% increased melee damage per recent wound stack.', g('damage', 'increased', 0.02, 'wounds', ['melee'])),
      n('a', 'small', 'Bloodied Edge', 'Skill casts inflict 2% of maximum life as voluntary trauma; 2.5% increased physical damage per recent wound stack.', m('traumaCost', 'flat', 0.02), g('damage', 'increased', 0.025, 'wounds', ['physical'])),
      n('b', 'small', 'Scarred Grit', '+0.12% maximum life regenerated per second per recent wound stack.', g('lifeRegenPct', 'flat', 0.0012, 'wounds')),
      n('', 'notable', 'Blood-Drunk Frenzy', '2% increased attack speed and 3.5% increased physical damage per recent wound stack.', g('attackSpeed', 'increased', 0.02, 'wounds'), g('damage', 'increased', 0.035, 'wounds', ['physical'])),
      n('tail', 'keystone', 'Self-Minted Martyr', 'Skill casts inflict 4% of maximum life as voluntary trauma; 2.5% more damage per recent wound stack (up to 25); maximum Energy Shield becomes 0.', m('traumaCost', 'flat', 0.04), g('damage', 'more', 0.025, 'wounds'), m('energyShield', 'override', 0)),
    ],
  },

  // =========================================================================
  // FORTITUDE — PASS 7 (2 wheels, 8 nodes)
  // =========================================================================
  {
    id: 'exp_p7_for_graze_plate', wedge: 'for', theme: 'bastion', shape: 'diamond', pass: 7,
    nodes: [
      n('entry', 'small', 'Sloped Plate', '+8% Graze chance; 8% increased armor.', m('grazeChance', 'flat', 0.08), m('armor', 'increased', 0.08)),
      n('a', 'small', 'Angled Bevel', '+5% Graze damage reduction.', m('grazeMitigation', 'flat', 0.05)),
      n('b', 'small', 'Dampened Rim', '-1 (-0.15 per character level) flat damage taken from hits.', m('flatHitReduction', 'flat', 1), g('flatHitReduction', 'flat', 0.15, 'level')),
      n('', 'notable', 'Glancing Bulwark', '+12% Graze damage reduction; 18% increased armor; +6 (+1.2 per level) thorns; +0.4s "Recently" window.', m('grazeMitigation', 'flat', 0.12), m('armor', 'increased', 0.18), m('thorns', 'flat', 6), g('thorns', 'flat', 1.2, 'level'), m('recentlyWindow', 'flat', 0.4)),
    ],
  },
  {
    id: 'exp_p7_for_trauma_shell', wedge: 'for', theme: 'life', shape: 'diamond', pass: 7,
    nodes: [
      n('entry', 'small', 'Calloused Flesh', '3% increased armor per recent wound stack.', g('armor', 'increased', 0.03, 'wounds')),
      n('a', 'small', 'Hardened Scars', '3% increased ward gained per recent wound stack.', g('wardGain', 'increased', 0.03, 'wounds')),
      n('b', 'small', 'Slow Mending', 'Recover 10% of life lost to hits over time; +0.10% maximum life regenerated per second per recent wound stack.', m('recuperate', 'flat', 0.10), g('lifeRegenPct', 'flat', 0.001, 'wounds')),
      n('', 'notable', 'Tempered by Suffering', '5% increased armor, 4% increased ward gained, and +0.18% maximum life regenerated per second per recent wound stack.', g('armor', 'increased', 0.05, 'wounds'), g('wardGain', 'increased', 0.04, 'wounds'), g('lifeRegenPct', 'flat', 0.0018, 'wounds')),
    ],
  },

  // =========================================================================
  // PROWESS — PASS 7 (2 wheels, 8 nodes)
  // =========================================================================
  {
    id: 'exp_p7_prw_overkill_cull', wedge: 'prw', theme: 'tempo', shape: 'diamond', pass: 7,
    nodes: [
      n('entry', 'small', 'Thin Margin Cut', '10% increased damage against low-life enemies.', m('damage', 'increased', 0.10, ['vs:lowLife'])),
      n('a', 'small', 'Merciless Carry', '8% increased attack speed if you have killed recently.', m('attackSpeed', 'increased', 0.08, undefined, 'recentlyKilled')),
      n('b', 'small', 'Executioner\'s Reach', '+5% culling threshold; 6% increased movement speed if you have killed recently.', m('cullThreshold', 'flat', 0.05), m('moveSpeed', 'increased', 0.06, undefined, 'recentlyKilled')),
      n('', 'notable', 'Executioner\'s Cadence', 'Cull enemies at 8% life; 18% increased damage against low-life enemies; 12% increased attack speed and 8% increased movement speed if you have killed recently.', m('cullThreshold', 'flat', 0.08), m('damage', 'increased', 0.18, ['vs:lowLife']), m('attackSpeed', 'increased', 0.12, undefined, 'recentlyKilled'), m('moveSpeed', 'increased', 0.08, undefined, 'recentlyKilled')),
    ],
  },
  {
    id: 'exp_p7_prw_acc_overflow', wedge: 'prw', theme: 'tempo', shape: 'diamond', pass: 7,
    nodes: [
      n('entry', 'small', 'Balanced Grip', '+30 accuracy; 10% increased accuracy.', m('accuracy', 'flat', 30), m('accuracy', 'increased', 0.10)),
      n('a', 'small', 'Measured Eye', '1.5% increased melee damage per 50 excess accuracy above level baseline.', g('damage', 'increased', 0.015, 'accOver', ['melee'])),
      n('b', 'small', 'True Edge', '+0.5% critical strike chance per 50 excess accuracy above level baseline.', g('critChance', 'flat', 0.005, 'accOver')),
      n('', 'notable', 'Surgeon\'s Precision', '2.5% increased melee damage and +0.8% armor penetration per 50 excess accuracy above level baseline.', g('damage', 'increased', 0.025, 'accOver', ['melee']), g('armorPen', 'flat', 0.008, 'accOver')),
    ],
  },

  // =========================================================================
  // DEXTERITY — PASS 7 (2 wheels, 9 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p7_dex_acc_overflow', wedge: 'dex', theme: 'ranged', shape: 'keystoneTail', pass: 7,
    nodes: [
      n('entry', 'small', 'Fine Calibration', '+30 accuracy; 10% increased accuracy.', m('accuracy', 'flat', 30), m('accuracy', 'increased', 0.10)),
      n('a', 'small', 'Keen Sightline', '1% increased attack speed per 50 excess accuracy above level baseline.', g('attackSpeed', 'increased', 0.01, 'accOver')),
      n('b', 'small', 'Thread the Needle', '+1.5% critical strike multiplier per 50 excess accuracy above level baseline.', g('critMulti', 'flat', 0.015, 'accOver')),
      n('', 'notable', 'Surplus Precision', '2% increased projectile damage and +2% critical strike multiplier per 50 excess accuracy above level baseline.', g('damage', 'increased', 0.02, 'accOver', ['projectile']), g('critMulti', 'flat', 0.02, 'accOver')),
      n('tail', 'keystone', 'Pinpoint Absolute', '80% more accuracy; gain 1.5% increased attack speed, +3% critical strike multiplier, and +0.8% armor penetration per 50 excess accuracy above level baseline; 40% less area of effect.', m('accuracy', 'more', 0.80), g('attackSpeed', 'increased', 0.015, 'accOver'), g('critMulti', 'flat', 0.03, 'accOver'), g('armorPen', 'flat', 0.008, 'accOver'), m('aoeRadius', 'more', -0.40)),
    ],
  },
  {
    id: 'exp_p7_dex_graze_ward', wedge: 'dex', theme: 'guile', shape: 'diamond', pass: 7,
    nodes: [
      n('entry', 'small', 'Feather Step', '+8% Graze chance; 8% increased evasion.', m('grazeChance', 'flat', 0.08), m('evasion', 'increased', 0.08)),
      n('a', 'small', 'Deflected Shimmer', '12% of damage prevented by Grazes is gained as Ward.', m('grazeWard', 'flat', 0.12)),
      n('b', 'small', 'Light Turn', '+5% Graze damage reduction.', m('grazeMitigation', 'flat', 0.05)),
      n('', 'notable', 'Mirage Shroud', '24% of damage prevented by Grazes is gained as Ward; +8% Graze damage reduction.', m('grazeWard', 'flat', 0.24), m('grazeMitigation', 'flat', 0.08)),
    ],
  },

  // =========================================================================
  // FINESSE — PASS 7 (2 wheels, 10 nodes, 2 Keystones)
  // =========================================================================
  {
    id: 'exp_p7_fin_graze', wedge: 'fin', theme: 'guile', shape: 'keystoneTail', pass: 7,
    nodes: [
      n('entry', 'small', 'Turned Shoulder', '+8% Graze chance.', m('grazeChance', 'flat', 0.08)),
      n('a', 'small', 'Softened Edge', '+5% Graze damage reduction.', m('grazeMitigation', 'flat', 0.05)),
      n('b', 'small', 'Glancing Ward', '10% of damage prevented by Grazes is gained as Ward.', m('grazeWard', 'flat', 0.10)),
      n('', 'notable', 'Slipping Blade', '+16% Graze chance; 10% increased attack speed and +18% critical strike multiplier if you have evaded recently.', m('grazeChance', 'flat', 0.16), m('attackSpeed', 'increased', 0.10, undefined, 'recentlyEvaded'), m('critMulti', 'flat', 0.18, undefined, 'recentlyEvaded')),
      n('tail', 'keystone', 'Silk Over Steel', 'All incoming hits are Grazes (100% Graze chance), mitigated by your Graze Damage Reduction; you cannot Evade or Block.', m('grazeChance', 'override', 1), m('evasionForgone', 'flat', 1), m('blockChance', 'override', 0)),
    ],
  },
  {
    id: 'exp_p7_fin_echo_snap', wedge: 'fin', theme: 'time', shape: 'keystoneTail', pass: 7,
    nodes: [
      n('entry', 'small', 'Quick Mark', '6% of landed hit damage banks into Temporal Debt.', m('hitEchoFrac', 'flat', 0.06)),
      n('a', 'small', 'Short-Fuse Mark', 'Temporal Debt detonates 0.35 seconds sooner.', m('hitEchoDelay', 'flat', -0.35)),
      n('b', 'small', 'Sharp Interest', '6% of landed hit damage banks into Temporal Debt; +8% critical strike multiplier.', m('hitEchoFrac', 'flat', 0.06), m('critMulti', 'flat', 0.08)),
      n('', 'notable', 'Accelerated Debt', '12% of landed hit damage banks into Temporal Debt; Temporal Debt detonates 0.50 seconds sooner.', m('hitEchoFrac', 'flat', 0.12), m('hitEchoDelay', 'flat', -0.50)),
      n('tail', 'keystone', 'Instant Liquidation', 'Temporal Debt detonates 55% faster and banks +25% of landed hit damage; you can no longer inflict ailments.', m('hitEchoDelay', 'more', -0.55), m('hitEchoFrac', 'flat', 0.25), m('statusChance', 'override', 0)),
    ],
  },

  // =========================================================================
  // INTELLIGENCE — PASS 7 (2 wheels, 9 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p7_int_deferred', wedge: 'int', theme: 'time', shape: 'keystoneTail', pass: 7,
    nodes: [
      n('entry', 'small', 'Delayed Syllable', '6% of landed hit damage banks into Temporal Debt.', m('hitEchoFrac', 'flat', 0.06)),
      n('a', 'small', 'Lingering Ledger', 'Temporal Debt gathers for +0.40 seconds longer before detonating.', m('hitEchoDelay', 'flat', 0.40)),
      n('b', 'small', 'Resonant Burst', 'Temporal Debt detonations splash enemies within +55 radius.', m('hitEchoAoe', 'flat', 55)),
      n('', 'notable', 'Borrowed Impact', '14% of landed hit damage banks into Temporal Debt; detonations splash within +80 radius.', m('hitEchoFrac', 'flat', 0.14), m('hitEchoAoe', 'flat', 80)),
      n('tail', 'keystone', 'Deferred Verdict', 'Your direct hits deal 50% less immediate damage, but bank +130% of dealt damage into a delayed Temporal Debt detonation with +110 splash radius.', m('damage', 'more', -0.50), m('hitEchoFrac', 'flat', 1.30), m('hitEchoAoe', 'flat', 110)),
    ],
  },
  {
    id: 'exp_p7_int_cooldown_weight', wedge: 'int', theme: 'arcana', shape: 'diamond', pass: 7,
    nodes: [
      n('entry', 'small', 'Heavy Tome', 'Spells gain 2.5% more hit damage per second of effective cooldown.', m('cooldownPower', 'flat', 0.025, ['spell'])),
      n('a', 'small', 'Engraved Delay', '+0.25s added cooldown to spells; spells gain 3% more hit damage per second of effective cooldown.', m('addedCooldown', 'flat', 0.25, ['spell']), m('cooldownPower', 'flat', 0.03, ['spell'])),
      n('b', 'small', 'Recovered Breath', '10% increased cooldown recovery rate.', m('cooldownRecovery', 'increased', 0.10)),
      n('', 'notable', 'Grimoire of Intervals', 'Spells gain 6% more hit damage per second of effective cooldown; 15% increased spell area of effect.', m('cooldownPower', 'flat', 0.06, ['spell']), m('aoeRadius', 'increased', 0.15, ['spell'])),
    ],
  },

  // =========================================================================
  // WILLPOWER — PASS 7 (2 wheels, 8 nodes)
  // =========================================================================
  {
    id: 'exp_p7_wil_trauma_hex', wedge: 'wil', theme: 'entropy', shape: 'diamond', pass: 7,
    nodes: [
      n('entry', 'small', 'Blood-Inscribed', 'Skill casts inflict 2% of maximum life as voluntary trauma; 2% increased chaos damage per recent wound stack.', m('traumaCost', 'flat', 0.02), g('damage', 'increased', 0.02, 'wounds', ['chaos'])),
      n('a', 'small', 'Pain-Fed Rot', '3% increased ailment magnitude per recent wound stack.', g('statusMagnitude', 'increased', 0.03, 'wounds')),
      n('b', 'small', 'Fevered Mind', '1.8% increased cast speed per recent wound stack.', g('castSpeed', 'increased', 0.018, 'wounds')),
      n('', 'notable', 'Flagellant\'s Liturgy', 'Skill casts inflict 3% of maximum life as voluntary trauma; 3.5% increased spell damage and 3.5% increased ailment magnitude per recent wound stack.', m('traumaCost', 'flat', 0.03), g('damage', 'increased', 0.035, 'wounds', ['spell']), g('statusMagnitude', 'increased', 0.035, 'wounds')),
    ],
  },
  {
    id: 'exp_p7_wil_overkill_chaos', wedge: 'wil', theme: 'entropy', shape: 'diamond', pass: 7,
    nodes: [
      n('entry', 'small', 'Spilled Entropy', '10% increased chaos damage; +4% chaos penetration.', m('damage', 'increased', 0.10, ['chaos']), m('chaosPen', 'flat', 0.04)),
      n('a', 'small', 'Hollow Spill', '12% increased chaos ailment magnitude; 10% of armed doom ticks as chaos.', m('statusMagnitude', 'increased', 0.12, ['chaos']), m('doomDot', 'flat', 0.10)),
      n('b', 'small', 'Blighted Excess', '12% increased chaos damage if you have killed recently; 8% increased area of effect.', m('damage', 'increased', 0.12, ['chaos'], 'recentlyKilled'), m('aoeRadius', 'increased', 0.08)),
      n('', 'notable', 'Withered Spill', '+10% chaos penetration; 15% of armed doom ticks as chaos; 22% increased chaos damage if you have killed recently.', m('chaosPen', 'flat', 0.10), m('doomDot', 'flat', 0.15), m('damage', 'increased', 0.22, ['chaos'], 'recentlyKilled')),
    ],
  },

  // =========================================================================
  // WISDOM — PASS 7 (2 wheels, 9 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p7_wis_cooldown_rite', wedge: 'wis', theme: 'time', shape: 'diamond', pass: 7,
    nodes: [
      n('entry', 'small', 'Patient Rite', 'Skills gain 2.5% more hit damage per second of effective cooldown.', m('cooldownPower', 'flat', 0.025)),
      n('a', 'small', 'Ceremonial Cadence', '10% increased cooldown recovery rate.', m('cooldownRecovery', 'increased', 0.10)),
      n('b', 'small', 'Deep Incantation', '12% increased skill effect duration; skills gain 2.5% more hit damage per second of effective cooldown.', m('effectDuration', 'increased', 0.12), m('cooldownPower', 'flat', 0.025)),
      n('', 'notable', 'Solemn Invocation', 'Skills gain 6% more hit damage per second of effective cooldown; 15% increased skill-charge recovery.', m('cooldownPower', 'flat', 0.06), m('skillChargeRate', 'increased', 0.15)),
    ],
  },
  {
    id: 'exp_p7_wis_echo_tether', wedge: 'wis', theme: 'host', shape: 'keystoneTail', pass: 7,
    nodes: [
      n('entry', 'small', 'Ossuary Lining', '10% increased minion maximum life; +12 maximum energy shield.', m('minionLife', 'increased', 0.10), m('energyShield', 'flat', 12)),
      n('a', 'small', 'Pale Reliquary', '12% increased minion maximum life; 10% increased energy shield recharge rate.', m('minionLife', 'increased', 0.12), m('esRechargeRate', 'increased', 0.10)),
      n('b', 'small', 'Marrow Veil', '10% increased maximum energy shield; 10% increased ward gained.', m('energyShield', 'increased', 0.10), m('wardGain', 'increased', 0.10)),
      n('', 'notable', 'Ossuary Lattice', '16% increased minion maximum life; 16% increased maximum energy shield; 15% increased energy shield recharge rate.', m('minionLife', 'increased', 0.16), m('energyShield', 'increased', 0.16), m('esRechargeRate', 'increased', 0.15)),
      n('tail', 'keystone', 'Hollow Reliquary', '45% of your Minion Life scaling translates into increased Maximum Energy Shield; 40% of your Maximum Life is forgone and your minions deal 40% less damage.', linkInc('energyShield', 'minionLife', 0.45, undefined, undefined, 1), m('lifeForgone', 'flat', 0.40), m('minionDamage', 'more', -0.40)),
    ],
  },

  // =========================================================================
  // CHARISMA — PASS 7 (2 wheels, 9 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p7_cha_hourglass', wedge: 'cha', theme: 'time', shape: 'keystoneTail', pass: 7,
    nodes: [
      n('entry', 'small', 'Weighted Beat', 'Skills gain 2.5% more hit damage per second of effective cooldown.', m('cooldownPower', 'flat', 0.025)),
      n('a', 'small', 'Measured Meter', '10% increased cooldown recovery rate.', m('cooldownRecovery', 'increased', 0.10)),
      n('b', 'small', 'Deep Cadence', 'Skills gain 3% more hit damage per second of effective cooldown.', m('cooldownPower', 'flat', 0.03)),
      n('', 'notable', 'Monumental Tempo', 'Skills gain 6% more hit damage per second of effective cooldown; 12% increased cooldown recovery rate.', m('cooldownPower', 'flat', 0.06), m('cooldownRecovery', 'increased', 0.12)),
      n('tail', 'keystone', 'Tolling Hourglass', 'All skills gain +1.5s added cooldown and deal +10% more hit damage per second of effective cooldown (up to 12s); your Attack Speed and Cast Speed are fixed at 100%.', m('addedCooldown', 'flat', 1.5), m('cooldownPower', 'flat', 0.10), m('attackSpeed', 'override', 1), m('castSpeed', 'override', 1)),
    ],
  },
  {
    id: 'exp_p7_cha_echo_chorus', wedge: 'cha', theme: 'chorus', shape: 'diamond', pass: 7,
    nodes: [
      n('entry', 'small', 'After-Note', '10% increased buff and song duration.', m('effectDuration', 'increased', 0.10, ['buff']), m('effectDuration', 'increased', 0.10, ['song'])),
      n('a', 'small', 'Held Fermata', '12% increased aura and song area of effect.', m('aoeRadius', 'increased', 0.12, ['aura']), m('aoeRadius', 'increased', 0.12, ['song'])),
      n('b', 'small', 'Carrying Echo', '3% increased damage per buff on you.', g('damage', 'increased', 0.03, 'buffs')),
      n('', 'notable', 'Resonant Reprise', '18% increased buff and song duration; 16% increased aura and song area of effect; 4% increased damage and 4% increased ward gained per buff on you.', m('effectDuration', 'increased', 0.18, ['buff']), m('effectDuration', 'increased', 0.18, ['song']), m('aoeRadius', 'increased', 0.16, ['aura']), m('aoeRadius', 'increased', 0.16, ['song']), g('damage', 'increased', 0.04, 'buffs'), g('wardGain', 'increased', 0.04, 'buffs')),
    ],
  },
];
