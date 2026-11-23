// ---------------------------------------------------------------------------
// PASS 14 — The Outer Constellations (9 wheels, 55 nodes, 7 Keystones)
//
// Inspired by Wolcen: Lords of Mayhem's Gate of Fates outer mastery rings
// (Time Weaver hit deferral & Captured Velocity vs slowed foes, Siegebreaker
// armor retaliation shockwaves, Alastor generator-spender Static Transferral,
// Arms Maester / Assassin Opening Gambit burst, Oracle of the Trinity Triune
// Tempest elemental cascades, Abyssal Shaper Fatal Pact self-affliction purge,
// Plaguebringer Undying Miasma trailing cloud, and Astrolabe Astral Canticle)
// — placed across the rotatable Middle & Outer Rings so unlocking The Star
// Astrolabe lets ANY class align these paradigms directly onto their start!
// ---------------------------------------------------------------------------

import { gaugeMod as g, mod as m } from '../engine/stats';
import { n, procNode, type ExpansionCluster } from './passiveExpansionBase';

export const PASS14_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // STRENGTH — Fractured Hourglass (Extreme Hit Deferral + Stagger Surcharge)
  // =========================================================================
  {
    id: 'exp_p14_str_dire_juncture', wedge: 'str', theme: 'bastion', shape: 'fork', pass: 14,
    nodes: [
      n('entry', 'small', 'Braced Spine', '+14 maximum life; 5% of hit damage taken is staggered.', m('life', 'flat', 14), m('staggerFrac', 'flat', 0.05)),
      n('a', 'small', 'Lengthened Pendulum', '+0.4s stagger window; 8% increased armor.', m('staggerWindow', 'flat', 0.4), m('armor', 'increased', 0.08)),
      n('b', 'small', 'Measured Pain', '8% increased life regeneration; +12 maximum endurance.', m('lifeRegen', 'increased', 0.08), m('endurance', 'flat', 12)),
      n('', 'keystone', 'Fractured Hourglass', '65% of incoming post-mitigation hit damage is deferred across your Stagger window instead of landing immediately, but deferred damage carries a 12% surcharge.', m('direDeferral', 'flat', 0.65)),
      n('tailA', 'notable', 'Measured Pause', '+0.8s stagger window; slaying a foe or using a cooldown skill purges 12% of deferred Stagger damage.', m('staggerWindow', 'flat', 0.8), m('staggerPurge', 'flat', 0.12)),
      n('tailB', 'notable', 'Iron Endurance', 'Reduce incoming hit damage by 4 (+0.7 per level) while recently hurt; +22 maximum life.', m('flatHitReduction', 'flat', 4, undefined, 'recentlyHurt'), g('flatHitReduction', 'flat', 0.7, 'level', undefined, 'recentlyHurt'), m('life', 'flat', 22)),
    ],
  },

  // =========================================================================
  // FORTITUDE — Bastion's Reprisal (Armor Retaliation Shockwaves)
  // =========================================================================
  {
    id: 'exp_p14_for_siege_vanguard', wedge: 'for', theme: 'bastion', shape: 'fork', pass: 14,
    nodes: [
      n('entry', 'small', 'Riveted Pauldrons', '12% increased armor; +12 maximum poise.', m('armor', 'increased', 0.12), m('poise', 'flat', 12)),
      n('a', 'small', 'Plate Anchoring', '10% increased armor; 6% of armor applies to elemental hits.', m('armor', 'increased', 0.10), m('armorAppliesToElemental', 'flat', 0.06)),
      n('b', 'small', 'Unflinching Wall', '+4% poise damage reduction; 8% increased guard strength.', m('poiseDR', 'flat', 0.04), m('guardStrength', 'increased', 0.08)),
      n('', 'keystone', 'Bastion\'s Reprisal', 'Blocking or taking a melee hit unleashes a physical shockwave dealing 18% of your Armor as area damage (0.8s ICD); 15% less movement speed.', m('armorThornsScale', 'flat', 0.18), m('moveSpeed', 'more', -0.15)),
      n('tailA', 'notable', 'Tempered Rivets', '+10% additional Armor retaliation shockwave scaling; 15% increased armor; 10% increased area of effect.', m('armorThornsScale', 'flat', 0.10), m('armor', 'increased', 0.15), m('aoeRadius', 'increased', 0.10)),
      n('tailB', 'notable', 'Immovable Fortress', '12% increased armor per second standing still (up to 5s); +12% poise stun avoidance.', g('armor', 'increased', 0.12, 'still'), m('poiseCcAvoid', 'flat', 0.12)),
    ],
  },

  // =========================================================================
  // PROWESS — Static Transferral / Overclocked Capacitor (Generator-Spender)
  // =========================================================================
  {
    id: 'exp_p14_prw_static_weave', wedge: 'prw', theme: 'lightning', shape: 'tiered', pass: 14,
    nodes: [
      n('entry', 'small', 'Friction Arc', '8% increased lightning damage; 5% increased attack speed.', m('damage', 'increased', 0.08, ['lightning']), m('attackSpeed', 'increased', 0.05)),
      n('a1', 'small', 'Copper Winding', '6% increased attack speed; +5% lightning penetration.', m('attackSpeed', 'increased', 0.06), m('lightningPen', 'flat', 0.05)),
      n('b1', 'small', 'Coil Capacity', '8% increased attack damage; 6% increased cooldown recovery.', m('damage', 'increased', 0.08, ['attack']), m('cooldownRecovery', 'increased', 0.06)),
      n('mid', 'notable', 'Static Transferral', 'Non-cooldown attack hits bank Static Charges (up to 5, 0.25s ICD); mana-spending (>=8) or cooldown skills discharge all charges for 9% more damage per charge.', m('staticDischargeMore', 'flat', 0.09)),
      n('a2', 'small', 'Charged Cadence', '2% increased movement speed and 2% increased attack speed per Static Charge.', g('moveSpeed', 'increased', 0.02, 'staticCharge'), g('attackSpeed', 'increased', 0.02, 'staticCharge')),
      n('b2', 'small', 'Grounded Arc', '+3% lightning resistance and +2% critical strike chance per Static Charge.', g('lightningRes', 'flat', 0.03, 'staticCharge'), g('critChance', 'flat', 0.02, 'staticCharge')),
      n('', 'keystone', 'Overclocked Capacitor', '+7% additional MORE damage per discharged Static Charge (and arcs lightning to 2 nearby foes on discharge); non-cooldown attacks deal 20% less hit damage.', m('staticDischargeMore', 'flat', 0.07), m('staticBasicLess', 'flat', 0.20)),
    ],
  },

  // =========================================================================
  // DEXTERITY — Captured Velocity (Stasis / Slow Execution & Long Range)
  // =========================================================================
  {
    id: 'exp_p14_dex_chrono_velocity', wedge: 'dex', theme: 'time', shape: 'fork', pass: 14,
    nodes: [
      n('entry', 'small', 'Measured Lead', '8% increased projectile damage; +8% chance to chill.', m('damage', 'increased', 0.08, ['projectile']), m('apply_chill', 'flat', 0.08)),
      n('a', 'small', 'Distant Sightline', '10% increased projectile speed; 6% more long-range hit damage.', m('projectileSpeed', 'increased', 0.10), m('farShotDamage', 'flat', 0.06)),
      n('b', 'small', 'Stolen Pace', '6% increased attack speed; 8% increased skill effect duration.', m('attackSpeed', 'increased', 0.06), m('effectDuration', 'increased', 0.08)),
      n('', 'notable', 'Captured Velocity', 'Deal 20% more hit damage against Chilled, Slowed, Frozen, Stunned, or Temporal-Debt enemies; +12% chance to chill on hit.', m('chronoVsSlowMore', 'flat', 0.20), m('apply_chill', 'flat', 0.12)),
      procNode('tailA', 'notable', 'safe_horizon', 'Safe Horizon', 'Striking a chilled enemy grants 14% increased movement speed for 3 seconds (3s ICD); up to 16% more hit damage at long range.', '#9fbba2', {
        trigger: 'hit', vs: ['chill'], icd: 3,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_safe_horizon', duration: 3, mods: [m('moveSpeed', 'increased', 0.14)] } },
      }, m('farShotDamage', 'flat', 0.16)),
      n('tailB', 'notable', 'Stasis Siphon', '+14% additional more damage against slowed, stunned, or Temporal-Debt foes; +15% critical strike multiplier.', m('chronoVsSlowMore', 'flat', 0.14), m('critMulti', 'flat', 0.15)),
    ],
  },

  // =========================================================================
  // FINESSE — Opening Gambit (High-Life Ambush Burst vs Low-Life Trade-off)
  // =========================================================================
  {
    id: 'exp_p14_fin_duelist_tempo', wedge: 'fin', theme: 'guile', shape: 'fork', pass: 14,
    nodes: [
      n('entry', 'small', 'Quick Draw', '8% increased attack speed; +10% critical strike multiplier.', m('attackSpeed', 'increased', 0.08), m('critMulti', 'flat', 0.10)),
      n('a', 'small', 'Opening Edge', '+10% more hit damage against enemies at or above 85% life; +6% chance to bleed.', m('ambushBurstMore', 'flat', 0.10), m('apply_bleed', 'flat', 0.06)),
      n('b', 'small', 'Lethal Poise', '+3% critical strike chance; 5% increased movement speed.', m('critChance', 'flat', 0.03), m('moveSpeed', 'increased', 0.05)),
      n('', 'keystone', 'Opening Gambit', 'Hits against enemies at or above 85% life deal 35% more hit damage and gain +25% flat critical strike chance; hits against enemies below 50% life deal 18% less damage.', m('ambushBurstMore', 'flat', 0.35), m('ambushLowLifeLess', 'flat', 0.18)),
      procNode('tailA', 'notable', 'clean_escape', 'Clean Escape', 'Killing an enemy recovers 1.5s of movement skill cooldown (3s ICD); 8% increased movement speed.', '#b8bd83', {
        trigger: 'kill', icd: 3,
        effect: { type: 'cooldown', seconds: 1.5, tags: ['movement'] },
      }, m('moveSpeed', 'increased', 0.08)),
      n('tailB', 'notable', 'Decisive Cut', '+12% additional Opening Gambit hit damage; +16% critical strike multiplier.', m('ambushBurstMore', 'flat', 0.12), m('critMulti', 'flat', 0.16)),
    ],
  },

  // =========================================================================
  // INTELLIGENCE — Triune Tempest (Fire -> Cold -> Lightning -> Fire Cascade)
  // =========================================================================
  {
    id: 'exp_p14_int_omnitempest', wedge: 'int', theme: 'lightning', shape: 'fork', pass: 14,
    nodes: [
      n('entry', 'small', 'Triune Spark', '6% increased fire, cold, and lightning damage.', m('damage', 'increased', 0.06, ['fire']), m('damage', 'increased', 0.06, ['cold']), m('damage', 'increased', 0.06, ['lightning'])),
      n('a', 'small', 'Elemental Resonance', '+4% fire, cold, and lightning penetration.', m('firePen', 'flat', 0.04), m('coldPen', 'flat', 0.04), m('lightningPen', 'flat', 0.04)),
      n('b', 'small', 'Shifting Focus', '6% increased cast speed; +8% elemental ailment chance.', m('castSpeed', 'increased', 0.06), m('statusChance', 'flat', 0.08)),
      n('', 'keystone', 'Triune Tempest', 'Fire, Cold, or Lightning hit damage unleashes a cascading area burst of the next element (Fire → Cold → Lightning → Fire) for 18 (+3.2 per level) area damage (1.4s ICD); elemental skills cost 12% more mana.', m('omniElemCascade', 'flat', 18), g('omniElemCascade', 'flat', 3.2, 'level'), m('manaCost', 'more', 0.12, ['fire']), m('manaCost', 'more', 0.12, ['cold']), m('manaCost', 'more', 0.12, ['lightning'])),
      n('tailA', 'notable', 'Cyclone Conduit', '+10 (+1.8 per level) Triune Tempest cascade damage; 15% increased area of effect.', m('omniElemCascade', 'flat', 10), g('omniElemCascade', 'flat', 1.8, 'level'), m('aoeRadius', 'increased', 0.15)),
      n('tailB', 'notable', 'Prismatic Echo', '12% increased fire, cold, and lightning damage; +12% ailment chance.', m('damage', 'increased', 0.12, ['fire']), m('damage', 'increased', 0.12, ['cold']), m('damage', 'increased', 0.12, ['lightning']), m('statusChance', 'flat', 0.12)),
    ],
  },

  // =========================================================================
  // WILLPOWER — Pact of the Scourged (Self-Affliction Power & Chaos Purge)
  // =========================================================================
  {
    id: 'exp_p14_wil_fatal_pact', wedge: 'wil', theme: 'entropy', shape: 'fork', pass: 14,
    nodes: [
      n('entry', 'small', 'Bitter Draught', '8% increased chaos damage; +10% chaos resistance.', m('damage', 'increased', 0.08, ['chaos']), m('chaosRes', 'flat', 0.10)),
      n('a', 'small', 'Scarred Resilience', '10% increased ailment magnitude; +3% chaos resistance per damaging ailment on you.', m('statusMagnitude', 'increased', 0.10), g('chaosRes', 'flat', 0.03, 'afflictions')),
      n('b', 'small', 'Fevered Casting', '4% increased cast speed per damaging ailment on you; +10 maximum life.', g('castSpeed', 'increased', 0.04, 'afflictions'), m('life', 'flat', 10)),
      n('', 'keystone', 'Pact of the Scourged', 'Inflicting damaging ailments has a 25% chance to mirror a mild copy onto you; gain 10% more damage per active self-ailment, and carrying 3+ distinct ailments purges them into a chaos nova (4s ICD); -10% chaos resistance.', m('fatalPactPower', 'flat', 0.10), m('chaosRes', 'flat', -0.10)),
      n('tailA', 'notable', 'Ruptured Taint', '+5% additional more damage per active damaging ailment on you; 15% increased ailment magnitude.', m('fatalPactPower', 'flat', 0.05), m('statusMagnitude', 'increased', 0.15)),
      n('tailB', 'notable', 'Immunized Flesh', '+14% chaos resistance; +0.6% maximum life regenerated per second per damaging ailment on you.', m('chaosRes', 'flat', 0.14), g('lifeRegenPct', 'flat', 0.006, 'afflictions')),
    ],
  },

  // =========================================================================
  // WISDOM — Undying Miasma (Walking Pestilence Wake & Minion Chaos Haze)
  // =========================================================================
  {
    id: 'exp_p14_wis_plague_trail', wedge: 'wis', theme: 'entropy', shape: 'fork', pass: 14,
    nodes: [
      n('entry', 'small', 'Spore-Bearer', '8% increased chaos damage; 8% increased minion damage.', m('damage', 'increased', 0.08, ['chaos']), m('minionDamage', 'increased', 0.08)),
      n('a', 'small', 'Putrid Mist', '10% increased area of effect; +8% chance to inflict poison.', m('aoeRadius', 'increased', 0.10), m('apply_poison', 'flat', 0.08)),
      n('b', 'small', 'Blighted Flock', '10% increased minion maximum life; 10% increased minion chaos damage.', m('minionLife', 'increased', 0.10), m('minionDamage', 'increased', 0.10, ['chaos'])),
      n('', 'notable', 'Undying Miasma', 'Moving (every 0.75s) or losing a minion pulses a toxic miasma dealing 12 (+2.2 per level) chaos damage and poisoning nearby foes; minions in the haze gain +12% extra chaos damage.', m('plagueWakeDps', 'flat', 12), g('plagueWakeDps', 'flat', 2.2, 'level')),
      n('tailA', 'notable', 'Choking Drift', '+8 (+1.5 per level) Undying Miasma chaos pulse damage; 15% increased poison duration.', m('plagueWakeDps', 'flat', 8), g('plagueWakeDps', 'flat', 1.5, 'level'), m('effectDuration', 'increased', 0.15, ['chaos'])),
      n('tailB', 'notable', 'Carrion Synergy', 'Minions inherit 15% of your ailment chances and deal 12% increased chaos damage; +10% poison chance.', m('minionInheritStatus', 'flat', 0.15), m('minionDamage', 'increased', 0.12, ['chaos']), m('apply_poison', 'flat', 0.10)),
    ],
  },

  // =========================================================================
  // CHARISMA — Astral Canticle (Buff Extension & Allied Harmonic Pulse)
  // =========================================================================
  {
    id: 'exp_p14_cha_celestial_choir', wedge: 'cha', theme: 'chorus', shape: 'fork', pass: 14,
    nodes: [
      n('entry', 'small', 'Aligned Harmonics', '8% increased skill effect duration; +10 maximum mana.', m('effectDuration', 'increased', 0.08), m('mana', 'flat', 10)),
      n('a', 'small', 'Resonant Choir', '3% increased damage per active buff on you; 6% increased song damage.', g('damage', 'increased', 0.03, 'buffs'), m('damage', 'increased', 0.06, ['song'])),
      n('b', 'small', 'Shared Cadence', '2% increased movement and cast speed per active buff on you; 8% increased aura area.', g('moveSpeed', 'increased', 0.02, 'buffs'), g('castSpeed', 'increased', 0.02, 'buffs'), m('aoeRadius', 'increased', 0.08, ['aura'])),
      n('', 'keystone', 'Astral Canticle', 'Casting a Song, Warcry, or Aura extends all your active buffs by 1.5s and pulses Ward and Haste to you and nearby allies (3.5s ICD); skills cost 15% more mana.', m('astralEchoBuff', 'flat', 0.50), m('manaCost', 'more', 0.15)),
      n('tailA', 'notable', 'Chorus of the Rings', '4% increased damage and +2% fire, cold, and lightning resistance per active buff on you.', g('damage', 'increased', 0.04, 'buffs'), g('fireRes', 'flat', 0.02, 'buffs'), g('coldRes', 'flat', 0.02, 'buffs'), g('lightningRes', 'flat', 0.02, 'buffs')),
      n('tailB', 'notable', 'Bell-Bearer\'s Grace', '+20% additional Astral Canticle buff extension; 18% increased song effect duration; 12% increased minion damage.', m('astralEchoBuff', 'flat', 0.20), m('effectDuration', 'increased', 0.18, ['song']), m('minionDamage', 'increased', 0.12)),
    ],
  },
];
