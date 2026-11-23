// ---------------------------------------------------------------------------
// PASSIVE EXPANSION — PASS 8: NOVEL BUILD-AROUND ENGINES
// 18 wheels (2 per wedge, 80 nodes, 8 true one-way PoE-style Keystones)
// introducing eight distinct, composable ARPG build engines that expand
// Hollow Wake's theorycrafting space across every wedge:
//   1. Poise-Break Implosion (poiseOverflow + poiseDamage + inward draw)
//   2. Sanguine Over-Leech (overleechPersist + overleechWard)
//   3. Borrowed Seconds Stagger Purge (staggerPurge + staggerToWard + staggerFrac)
//   4. Riven Armor & Resistance Fractures (rivenChance + rivenPower)
//   5. Kinetic Inertia Momentum Banking ('inertia' gauge + inertiaGain + inertiaDischarge)
//   6. Alchemical Affliction Reap (ailmentReap consuming active DoTs on crit/cooldown)
//   7. Harmonic Pitch Alternating Crescendo ('harmony' gauge + harmonyPower)
//   8. Pyre-Born & Ossuary Minion Engines (minionKindleBurn/Fire + minionMissingLifeFire
//      + minionDeathEffectPower cross-tree death-effect booster)
// ---------------------------------------------------------------------------

import {
  gaugeMod as g,
  mod as m,
} from '../engine/stats';
import { n, type ExpansionCluster } from './passiveExpansionBase';

export const PASS8_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // STRENGTH — PASS 8 (2 wheels, 10 nodes, 2 Keystones)
  // =========================================================================
  {
    id: 'exp_p8_str_poise_implode', wedge: 'str', theme: 'impact', shape: 'keystoneTail', pass: 8,
    nodes: [
      n('entry', 'small', 'Crumbling Footing', '10% increased poise damage; breaking enemy poise unleashes a shockwave for 15% of their maximum poise.', m('poiseDamage', 'increased', 0.10), m('poiseOverflow', 'flat', 0.15)),
      n('a', 'small', 'Hollow Concussion', 'Breaking enemy poise unleashes a physical shockwave for 20% of their maximum poise.', m('poiseOverflow', 'flat', 0.20)),
      n('b', 'small', 'Heavy Shudder', '12% increased poise damage; 10% increased area of effect.', m('poiseDamage', 'increased', 0.12), m('aoeRadius', 'increased', 0.10)),
      n('', 'notable', 'Shattered Bearing', 'Breaking enemy poise unleashes a physical shockwave for 35% of their maximum poise; 18% increased poise damage.', m('poiseOverflow', 'flat', 0.35), m('poiseDamage', 'increased', 0.18)),
      n('tail', 'keystone', 'Collapse of Bearing', 'Breaking enemy poise unleashes a shockwave for +85% of their maximum poise and pulls nearby foes inward; 30% more poise damage; 25% less hit damage against enemies whose poise stands.', m('poiseOverflow', 'flat', 0.85), m('poiseDamage', 'more', 0.30), m('damage', 'more', -0.25, ['vs:poised'])),
    ],
  },
  {
    id: 'exp_p8_str_overleech', wedge: 'str', theme: 'life', shape: 'keystoneTail', pass: 8,
    nodes: [
      n('entry', 'small', 'Deep Draught', '+1.5% of hit damage leeched as life; 20% of excess life leech lingers as a 3-second recovery stream.', m('lifeLeech', 'flat', 0.015), m('overleechPersist', 'flat', 0.20)),
      n('a', 'small', 'Spilled Sanguine', '15% of excess life leech past full life converts into Ward.', m('overleechWard', 'flat', 0.15)),
      n('b', 'small', 'Patient Vein', '25% of excess life leech lingers as a 3-second recovery stream.', m('overleechPersist', 'flat', 0.25)),
      n('', 'notable', 'Sanguine Surplus', '+2.5% of hit damage leeched as life; 35% of excess life leech lingers as recovery; 20% of excess life leech converts into Ward.', m('lifeLeech', 'flat', 0.025), m('overleechPersist', 'flat', 0.35), m('overleechWard', 'flat', 0.20)),
      n('tail', 'keystone', 'Brimming Chalice', '+75% of excess life leech lingers as a 3-second recovery stream and +35% converts into Ward; your natural Life Regeneration becomes 0.', m('overleechPersist', 'flat', 0.75), m('overleechWard', 'flat', 0.35), m('lifeRegen', 'override', 0), m('lifeRegenPct', 'override', 0)),
    ],
  },

  // =========================================================================
  // FORTITUDE — PASS 8 (2 wheels, 9 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p8_for_stagger_purge', wedge: 'for', theme: 'bastion', shape: 'keystoneTail', pass: 8,
    nodes: [
      n('entry', 'small', 'Paced Absorption', '10% of incoming life damage is staggered over time; purge 8% of staggered damage on kill or cooldown cast.', m('staggerFrac', 'flat', 0.10), m('staggerPurge', 'flat', 0.08)),
      n('a', 'small', 'Drawn-Out Toll', 'Deferred stagger spreads over +0.60 seconds longer.', m('staggerWindow', 'flat', 0.60)),
      n('b', 'small', 'Shrugged Debt', 'Purge 12% of staggered damage when slaying an enemy or casting a cooldown skill.', m('staggerPurge', 'flat', 0.12)),
      n('', 'notable', 'Cleansing Exhale', '15% of incoming life damage is staggered over time; purge 20% of staggered damage on kill or cooldown cast.', m('staggerFrac', 'flat', 0.15), m('staggerPurge', 'flat', 0.20)),
      n('tail', 'keystone', 'Tally of Borrowed Seconds', '+40% of incoming life damage is staggered over +1.0s longer; purge +35% of staggered damage on kill or cooldown cast; take 15% more chaos damage.', m('staggerFrac', 'flat', 0.40), m('staggerWindow', 'flat', 1.0), m('staggerPurge', 'flat', 0.35), m('damageTaken', 'more', 0.15, ['chaos'])),
    ],
  },
  {
    id: 'exp_p8_for_riven_bastion', wedge: 'for', theme: 'bastion', shape: 'diamond', pass: 8,
    nodes: [
      n('entry', 'small', 'Hammered Seam', '10% increased poise damage; +5 (+1.0 per level) block value.', m('poiseDamage', 'increased', 0.10), m('blockValue', 'flat', 5), g('blockValue', 'flat', 1.0, 'level')),
      n('a', 'small', 'Splintering Guard', '15% increased parry counter power; 10% increased armor.', m('guardParryPower', 'increased', 0.15), m('armor', 'increased', 0.10)),
      n('b', 'small', 'Cracked Mail', '12% of landed hit damage taken is reflected back to the attacker; 10% increased poise damage.', m('thornsReflect', 'flat', 0.12), m('poiseDamage', 'increased', 0.10)),
      n('', 'notable', 'Sundered Seamplate', 'Melee hits rend +1 additional ply; 25% increased parry counter power; +8 (+1.6 per level) block value; 16% increased poise damage.', m('plyRend', 'flat', 1, ['melee']), m('guardParryPower', 'increased', 0.25), m('blockValue', 'flat', 8), g('blockValue', 'flat', 1.6, 'level'), m('poiseDamage', 'increased', 0.16)),
    ],
  },

  // =========================================================================
  // PROWESS — PASS 8 (2 wheels, 9 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p8_prw_riven_duelist', wedge: 'prw', theme: 'tempo', shape: 'keystoneTail', pass: 8,
    nodes: [
      n('entry', 'small', 'Notched Rivet', '+20% chance on hit to inflict a Riven fracture; 5% increased attack speed.', m('rivenChance', 'flat', 0.20), m('attackSpeed', 'increased', 0.05)),
      n('a', 'small', 'Prized Joint', '+25% chance on hit to inflict a Riven fracture.', m('rivenChance', 'flat', 0.25)),
      n('b', 'small', 'Exposed Underlayer', 'Each Riven fracture stack also shreds 0.8% of the target\'s elemental and chaos resistances.', m('rivenPower', 'flat', 0.008)),
      n('', 'notable', 'Seam-Breaker\'s Craft', '+45% chance on hit to inflict a Riven fracture; each Riven stack shreds 1.2% elemental and chaos resistances.', m('rivenChance', 'flat', 0.45), m('rivenPower', 'flat', 0.012)),
      n('tail', 'keystone', 'Fractured Architecture', '+150% chance on hit to carve Riven fractures (capable of multiple stacks per blow); each Riven stack shreds +2.0% elemental and chaos resistances; you cannot deal critical strikes.', m('rivenChance', 'flat', 1.50), m('rivenPower', 'flat', 0.020), m('critChance', 'override', 0)),
    ],
  },
  {
    id: 'exp_p8_prw_inertia_strike', wedge: 'prw', theme: 'tempo', shape: 'diamond', pass: 8,
    nodes: [
      n('entry', 'small', 'Closing Momentum', '6% increased attack speed while moving; 6% increased melee damage.', m('attackSpeed', 'increased', 0.06, undefined, 'moving'), m('damage', 'increased', 0.06, ['melee'])),
      n('a', 'small', 'Lunging Release', '10% increased melee damage if you have landed a hit recently.', m('damage', 'increased', 0.10, ['melee'], 'recentlyHit')),
      n('b', 'small', 'Driven Footwork', '12% increased poise damage while your skills are varied; 4% increased movement speed if you have killed recently.', m('poiseDamage', 'increased', 0.12, undefined, 'comboVaried'), m('moveSpeed', 'increased', 0.04, undefined, 'recentlyKilled')),
      n('', 'notable', 'Lunge-Breaker', '12% increased attack speed while moving; 18% increased melee damage if you have hit recently; 20% increased poise damage while varied.', m('attackSpeed', 'increased', 0.12, undefined, 'moving'), m('damage', 'increased', 0.18, ['melee'], 'recentlyHit'), m('poiseDamage', 'increased', 0.20, undefined, 'comboVaried')),
    ],
  },

  // =========================================================================
  // DEXTERITY — PASS 8 (2 wheels, 9 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p8_dex_inertia_pendulum', wedge: 'dex', theme: 'guile', shape: 'keystoneTail', pass: 8,
    nodes: [
      n('entry', 'small', 'Gathered Stride', '35% faster Kinetic Inertia buildup while moving; 3% increased movement speed.', m('inertiaGain', 'flat', 0.35), m('moveSpeed', 'increased', 0.03)),
      n('a', 'small', 'Wound Coil', 'Non-movement hits discharge banked Kinetic Inertia for +2.0% more damage per stack.', m('inertiaDischarge', 'flat', 0.020)),
      n('b', 'small', 'Wind-Loaded Draw', '1.5% increased projectile damage per Kinetic Inertia stack.', g('damage', 'increased', 0.015, 'inertia', ['projectile'])),
      n('', 'notable', 'Kinetic Snap', '55% faster Kinetic Inertia buildup; non-movement hits discharge Inertia for +3.5% more damage per stack.', m('inertiaGain', 'flat', 0.55), m('inertiaDischarge', 'flat', 0.035)),
      n('tail', 'keystone', 'Pendulum of Stillness', '+150% faster Kinetic Inertia buildup while moving; non-movement hits discharge all Inertia for +7.0% more hit damage per stack; you deal 25% less damage while moving.', m('inertiaGain', 'flat', 1.50), m('inertiaDischarge', 'flat', 0.070), m('damage', 'more', -0.25, undefined, 'moving')),
    ],
  },
  {
    id: 'exp_p8_dex_riven_volley', wedge: 'dex', theme: 'ranged', shape: 'diamond', pass: 8,
    nodes: [
      n('entry', 'small', 'Bodkin Notch', '+10% impale effect with projectiles; 8% increased projectile speed.', m('impalePower', 'flat', 0.10, ['projectile']), m('projectileSpeed', 'increased', 0.08)),
      n('a', 'small', 'Rending Volley', '12% increased projectile damage against moving enemies.', m('damage', 'increased', 0.12, ['projectile', 'vs:moving'])),
      n('b', 'small', 'Split Fletching', 'Projectiles pierce +1 additional target; +6% armor penetration with projectiles.', m('pierceCount', 'flat', 1), m('armorPen', 'flat', 0.06, ['projectile'])),
      n('', 'notable', 'Pincushion Volley', 'Projectiles pierce +1 additional target; +22% impale effect with projectiles; 20% increased projectile damage against moving enemies.', m('pierceCount', 'flat', 1), m('impalePower', 'flat', 0.22, ['projectile']), m('damage', 'increased', 0.20, ['projectile', 'vs:moving'])),
    ],
  },

  // =========================================================================
  // FINESSE — PASS 8 (2 wheels, 9 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p8_fin_alchemical_reap', wedge: 'fin', theme: 'entropy', shape: 'keystoneTail', pass: 8,
    nodes: [
      n('entry', 'small', 'Lancing Vein', 'Critical strikes and cooldown hits reap active damaging ailments for 15% of their remaining total damage.', m('ailmentReap', 'flat', 0.15)),
      n('a', 'small', 'Forced Ripening', 'Reaping hits extract +20% of active damaging ailments\' remaining damage.', m('ailmentReap', 'flat', 0.20)),
      n('b', 'small', 'Venomous Timing', '10% increased ailment magnitude; +2% critical strike chance against afflicted enemies.', m('statusMagnitude', 'increased', 0.10), m('critChance', 'flat', 0.02, ['vs:afflicted'])),
      n('', 'notable', 'Alchemical Detonation', 'Critical strikes and cooldown hits reap active damaging ailments for +35% of their remaining damage; +6% critical strike chance against afflicted enemies.', m('ailmentReap', 'flat', 0.35), m('critChance', 'flat', 0.06, ['vs:afflicted'])),
      n('tail', 'keystone', 'Bitter Harvest', 'Critical strikes and cooldown hits reap active damaging ailments instantaneously for +125% of their remaining total damage; 30% less ailment magnitude.', m('ailmentReap', 'flat', 1.25), m('statusMagnitude', 'more', -0.30)),
    ],
  },
  {
    id: 'exp_p8_fin_inertia_step', wedge: 'fin', theme: 'guile', shape: 'diamond', pass: 8,
    nodes: [
      n('entry', 'small', 'Fleet Cadence', '30% faster Kinetic Inertia buildup; 1.5% increased evasion per Inertia stack.', m('inertiaGain', 'flat', 0.30), g('evasion', 'increased', 0.015, 'inertia')),
      n('a', 'small', 'Slipping Velocity', '+0.6% critical strike chance per Kinetic Inertia stack.', g('critChance', 'flat', 0.006, 'inertia')),
      n('b', 'small', 'Swift Carry', '0.6% increased movement speed per Kinetic Inertia stack.', g('moveSpeed', 'increased', 0.006, 'inertia')),
      n('', 'notable', 'Quicksilver Gait', '45% faster Kinetic Inertia buildup; 2.5% increased evasion and +1.5% critical strike multiplier per Inertia stack.', m('inertiaGain', 'flat', 0.45), g('evasion', 'increased', 0.025, 'inertia'), g('critMulti', 'flat', 0.015, 'inertia')),
    ],
  },

  // =========================================================================
  // INTELLIGENCE — PASS 8 (2 wheels, 9 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p8_int_riven_arcana', wedge: 'int', theme: 'arcana', shape: 'diamond', pass: 8,
    nodes: [
      n('entry', 'small', 'Etched Crack', '+20% chance on hit to inflict a Riven fracture; each Riven stack shreds 0.6% elemental and chaos resistances.', m('rivenChance', 'flat', 0.20), m('rivenPower', 'flat', 0.006)),
      n('a', 'small', 'Unraveling Ward', 'Each Riven fracture stack shreds 1.0% elemental and chaos resistances.', m('rivenPower', 'flat', 0.010)),
      n('b', 'small', 'Repeating Flaw', '+30% chance on hit to inflict a Riven fracture with spells.', m('rivenChance', 'flat', 0.30, ['spell'])),
      n('', 'notable', 'Shattered Lattice', '+40% chance on hit to inflict a Riven fracture with spells; each Riven stack shreds 1.5% elemental and chaos resistances.', m('rivenChance', 'flat', 0.40, ['spell']), m('rivenPower', 'flat', 0.015)),
    ],
  },
  {
    id: 'exp_p8_int_harmony_prism', wedge: 'int', theme: 'arcana', shape: 'keystoneTail', pass: 8,
    nodes: [
      n('entry', 'small', 'Second Voice', 'Alternating skill types builds Harmonic Pitch (up to 10 stacks); gain +1.2% more damage per stack.', m('harmonyPower', 'flat', 0.012)),
      n('a', 'small', 'Counterpoint Flow', '1.5% increased cast speed per Harmonic Pitch stack.', g('castSpeed', 'increased', 0.015, 'harmony')),
      n('b', 'small', 'Refracted Chord', '+1.5% more damage per Harmonic Pitch stack.', m('harmonyPower', 'flat', 0.015)),
      n('', 'notable', 'Polyphonic Prism', '+2.5% more damage and 2% increased cast speed per Harmonic Pitch stack.', m('harmonyPower', 'flat', 0.025), g('castSpeed', 'increased', 0.02, 'harmony')),
      n('tail', 'keystone', 'Chromatic Fugue', 'Alternating skill types grants +6.0% more damage and 3% increased cast speed per Harmonic Pitch stack (unleashing a tri-elemental crescendo at 10 stacks); you deal 55% less damage while repeating a skill.', m('harmonyPower', 'flat', 0.060), g('castSpeed', 'increased', 0.03, 'harmony'), m('damage', 'more', -0.55, undefined, 'comboRepeated')),
    ],
  },

  // =========================================================================
  // WILLPOWER — PASS 8 (2 wheels, 8 nodes)
  // =========================================================================
  {
    id: 'exp_p8_wil_reap_curse', wedge: 'wil', theme: 'entropy', shape: 'diamond', pass: 8,
    nodes: [
      n('entry', 'small', 'Plucked Blight', 'Critical strikes and cooldown hits reap active damaging ailments for 15% of their remaining damage; 8% increased chaos damage.', m('ailmentReap', 'flat', 0.15), m('damage', 'increased', 0.08, ['chaos'])),
      n('a', 'small', 'Severed Hex', 'Reaping hits extract +20% of active damaging ailments\' remaining damage; 10% increased curse duration.', m('ailmentReap', 'flat', 0.20), m('effectDuration', 'increased', 0.10, ['curse'])),
      n('b', 'small', 'Deepening Rot', '12% increased ailment magnitude; +6% chaos penetration.', m('statusMagnitude', 'increased', 0.12), m('chaosPen', 'flat', 0.06)),
      n('', 'notable', 'Malefic Harvest', 'Critical strikes and cooldown hits reap active damaging ailments for +40% of their remaining damage; 16% increased chaos damage and ailment magnitude.', m('ailmentReap', 'flat', 0.40), m('damage', 'increased', 0.16, ['chaos']), m('statusMagnitude', 'increased', 0.16)),
    ],
  },
  {
    id: 'exp_p8_wil_overleech_pact', wedge: 'wil', theme: 'arcana', shape: 'diamond', pass: 8,
    nodes: [
      n('entry', 'small', 'Siphoned Shell', '+1.2% of spell damage leeched as life; 15% of excess life leech converts into Ward.', m('lifeLeech', 'flat', 0.012, ['spell']), m('overleechWard', 'flat', 0.15)),
      n('a', 'small', 'Lingered Siphon', '12% slower ward decay; +12 maximum energy shield.', m('wardDecay', 'more', -0.12), m('energyShield', 'flat', 12)),
      n('b', 'small', 'Vampiric Shroud', '20% of excess life leech converts into Ward; 10% increased ward gained.', m('overleechWard', 'flat', 0.20), m('wardGain', 'increased', 0.10)),
      n('', 'notable', 'Vessel of Overflow', '+2% of spell damage leeched as life; 35% of excess life leech converts into Ward; 16% slower ward decay.', m('lifeLeech', 'flat', 0.02, ['spell']), m('overleechWard', 'flat', 0.35), m('wardDecay', 'more', -0.16)),
    ],
  },

  // =========================================================================
  // WISDOM — PASS 8 (2 wheels, 10 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p8_wis_pyre_covenant', wedge: 'wis', theme: 'fire', shape: 'dualNotableKeystone', pass: 8,
    nodes: [
      n('entry', 'small', 'Scorched Marrow', '8% increased minion fire damage.', m('minionDamage', 'increased', 0.08, ['fire'])),
      n('a', 'small', 'Tinder-Bound', 'Recently summoned minions burn for 2 (+0.5 per level) life/s over 4s.', m('minionKindleBurn', 'flat', 2), g('minionKindleBurn', 'flat', 0.5, 'level')),
      n('b', 'small', 'Stoked Cadence', '8% increased minion action speed.', m('minionHaste', 'increased', 0.08)),
      n('midA', 'notable', 'Kindled Bones', 'Recently summoned minions burn for 4 (+1.0 per level) life/s over 4s; while burning this way, they deal 15% of their damage as extra fire damage.', m('minionKindleBurn', 'flat', 4), g('minionKindleBurn', 'flat', 1.0, 'level'), m('minionKindleFire', 'flat', 0.15)),
      n('midB', 'notable', 'Brazier-Born Host', 'Recently summoned minions burn for 3 (+0.8 per level) life/s over 4s; minions gain +15% chance to inflict burn and 12% increased fire damage.', m('minionKindleBurn', 'flat', 3), g('minionKindleBurn', 'flat', 0.8, 'level'), m('minionApply_burn', 'flat', 0.15), m('minionDamage', 'increased', 0.12, ['fire'])),
      n('tail', 'keystone', 'Pyre-Born Covenant', 'Recently summoned minions burn for 5 (+1.4 per level) life/s over 4s and deal +30% extra fire damage while kindled; 16% increased minion action speed; your minions cannot regenerate life or heal on minion deaths.', m('minionKindleBurn', 'flat', 5), g('minionKindleBurn', 'flat', 1.4, 'level'), m('minionKindleFire', 'flat', 0.30), m('minionHaste', 'increased', 0.16), m('minionRegenPct', 'override', 0), m('minionRegenRate', 'override', 0), m('minionDeathHeal', 'override', 0)),
    ],
  },
  {
    id: 'exp_p8_wis_death_ossuary', wedge: 'wis', theme: 'host', shape: 'diamond', pass: 8,
    nodes: [
      n('entry', 'small', 'Last Rites', '10% increased minion death-effect power; 8% increased minion maximum life.', m('minionDeathEffectPower', 'increased', 0.10), m('minionLife', 'increased', 0.08)),
      n('a', 'small', 'Rupturing Funerary', '12% increased minion death-effect power.', m('minionDeathEffectPower', 'increased', 0.12)),
      n('b', 'small', 'Parting Legacy', '10% increased area of effect; 8% increased minion maximum life.', m('aoeRadius', 'increased', 0.10), m('minionLife', 'increased', 0.08)),
      n('', 'notable', 'Ossuary Amplification', '22% increased minion death-effect power (scaling Martyrdom, death bursts, and death heals); 12% increased minion maximum life.', m('minionDeathEffectPower', 'increased', 0.22), m('minionLife', 'increased', 0.12)),
    ],
  },

  // =========================================================================
  // CHARISMA — PASS 8 (2 wheels, 9 nodes, 1 Keystone)
  // =========================================================================
  {
    id: 'exp_p8_cha_harmonic_choir', wedge: 'cha', theme: 'chorus', shape: 'diamond', pass: 8,
    nodes: [
      n('entry', 'small', 'Alternating Measure', '+1.0% more damage per Harmonic Pitch stack; 8% increased song and aura area of effect.', m('harmonyPower', 'flat', 0.010), m('aoeRadius', 'increased', 0.08, ['song']), m('aoeRadius', 'increased', 0.08, ['aura'])),
      n('a', 'small', 'Cantor\'s Cadence', '1.5% increased attack speed and 1.5% increased cast speed per Harmonic Pitch stack.', g('attackSpeed', 'increased', 0.015, 'harmony'), g('castSpeed', 'increased', 0.015, 'harmony')),
      n('b', 'small', 'Carried Pitch', '2.5% increased ward gained per Harmonic Pitch stack.', g('wardGain', 'increased', 0.025, 'harmony')),
      n('', 'notable', 'Antiphonal Choir', '+2.2% more damage, 2% increased attack and cast speed, and 3.5% increased ward gained per Harmonic Pitch stack.', m('harmonyPower', 'flat', 0.022), g('attackSpeed', 'increased', 0.02, 'harmony'), g('castSpeed', 'increased', 0.02, 'harmony'), g('wardGain', 'increased', 0.035, 'harmony')),
    ],
  },
  {
    id: 'exp_p8_cha_stagger_ward', wedge: 'cha', theme: 'chorus', shape: 'keystoneTail', pass: 8,
    nodes: [
      n('entry', 'small', 'Deferred Grace', '10% of incoming life damage is staggered over time; 15% of purged stagger damage converts into Ward.', m('staggerFrac', 'flat', 0.10), m('staggerToWard', 'flat', 0.15)),
      n('a', 'small', 'Absolved Toll', 'Purge 12% of staggered damage on kill or cooldown cast.', m('staggerPurge', 'flat', 0.12)),
      n('b', 'small', 'Gilded Ledger', '20% of purged stagger damage converts into Ward; 10% increased ward gained.', m('staggerToWard', 'flat', 0.20), m('wardGain', 'increased', 0.10)),
      n('', 'notable', 'Ward of Forgiveness', 'Purge 18% of staggered damage on kill or cooldown cast; 28% of purged stagger damage converts into Ward.', m('staggerPurge', 'flat', 0.18), m('staggerToWard', 'flat', 0.28)),
      n('tail', 'keystone', 'Unwritten Ledger', '+30% of incoming life damage is staggered; purge +45% of staggered damage on kill or cooldown cast and convert +50% of purged stagger into Ward; your Armor becomes 0.', m('staggerFrac', 'flat', 0.30), m('staggerPurge', 'flat', 0.45), m('staggerToWard', 'flat', 0.50), m('armor', 'override', 0)),
    ],
  },
];
