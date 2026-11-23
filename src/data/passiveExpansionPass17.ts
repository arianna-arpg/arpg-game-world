// ---------------------------------------------------------------------------
// PASS 17 — Wolcen Gate of Fates: Hybrids, Finishers & Apexes
// (9 wheels, 54 nodes, 7 Keystones — 1 wheel per attribute wedge)
//
// Completes Hollow Wake's Wolcen Gate of Fates outer-constellation deep dive:
//   - Child of Fury:   Blistering Embrace (consumes half of >=4 Burn stacks for Fire Nova)
//   - Duskglaive:      Life's First Movement (Attack <-> Spell Lure cross-empowerment)
//   - Exorcist:        Academic Fieldwork (elite/boss Trophy mastery 0..5, 20s)
//   - White Arrow:     Wintry Hail (projectile hits vs Chilled/Frozen ricochet cold shards)
//   - Alastor:         Intravenous Spark (crit-stacked Neural Surge 0..5 -> Lightning Arc)
//   - Warlock:         Residual Energy (Spell <-> Attack typed elemental/kinetic imprinting)
//   - Plaguebringer:   Essential Measure (victim-centered corrosive contagion on ailment apply)
//   - Eos:             Dawn Consecration (heal/Ward lays sacred ground scorching foes <40% life)
//   - Time Weaver:     Temporal Siphon (hitting impaired foes shaves cooldowns & extends buffs)
// ---------------------------------------------------------------------------

import { gaugeMod as g, mod as m } from '../engine/stats';
import { n, type ExpansionCluster } from './passiveExpansionBase';

export const PASS17_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // STRENGTH — Blistering Embrace (Child of Fury: Burn-Stack Nova Detonation)
  // =========================================================================
  {
    id: 'exp_p17_str_blistering_embrace', wedge: 'str', theme: 'fire', shape: 'fork', pass: 17,
    nodes: [
      n('entry', 'small', 'Kindling Blow', '8% increased fire damage; +10% chance to inflict burn.', m('damage', 'increased', 0.08, ['fire']), m('apply_burn', 'flat', 0.10)),
      n('a', 'small', 'Stoked Embers', '+1 maximum burn stack; 10% increased fire ailment magnitude.', m('ailmentStacks', 'flat', 1), m('statusMagnitude', 'increased', 0.10, ['fire'])),
      n('b', 'small', 'Seared Perimeter', '10% increased area of effect; +5% fire penetration.', m('aoeRadius', 'increased', 0.10), m('firePen', 'flat', 0.05)),
      n('', 'keystone', 'Blistering Embrace', 'Hitting an enemy carrying 4 or more Burn stacks (0.8s per-target ICD) consumes half those stacks to detonate a Fire Nova scaled by the consumed burn damage and ignites nearby foes; fire skills cost 12% more mana.', m('burnDetonatePower', 'flat', 0.85), m('manaCost', 'more', 0.12, ['fire'])),
      n('tailA', 'notable', 'Cinder Detonator', '+30% additional Blistering Embrace Fire Nova power; +1 maximum stack for stackable ailments; +10% burn chance.', m('burnDetonatePower', 'flat', 0.30), m('ailmentStacks', 'flat', 1), m('apply_burn', 'flat', 0.10)),
      n('tailB', 'notable', 'Hearth-Blast Spread', '18% increased area of effect; 15% increased fire ailment duration; +8% fire penetration.', m('aoeRadius', 'increased', 0.18), m('effectDuration', 'increased', 0.15, ['fire']), m('firePen', 'flat', 0.08)),
    ],
  },

  // =========================================================================
  // PROWESS — Life's First Movement (Duskglaive: Attack <-> Spell Lure Pendulum)
  // =========================================================================
  {
    id: 'exp_p17_prw_lifes_first_movement', wedge: 'prw', theme: 'tempo', shape: 'fork', pass: 17,
    nodes: [
      n('entry', 'small', 'Twin Discipline', '6% increased attack damage; 6% increased spell damage.', m('damage', 'increased', 0.06, ['attack']), m('damage', 'increased', 0.06, ['spell'])),
      n('a', 'small', 'Lure of Steel', '6% increased attack speed; +6% spell critical strike chance.', m('attackSpeed', 'increased', 0.06), m('critChance', 'increased', 0.06, ['spell'])),
      n('b', 'small', 'Lure of Ink', '6% increased cast speed; +6% attack critical strike chance.', m('castSpeed', 'increased', 0.06), m('critChance', 'increased', 0.06, ['attack'])),
      n('', 'keystone', 'Life\'s First Movement', 'Casting Attacks banks Lure of Darkness (up to 3) granting +15% cast speed and empowering Spells for 35% more damage + 30% of Attack damage scaling; Spells bank Lure of Light (up to 3) mirroring the bonus onto Attacks; skills cost 10% more mana.', m('equilibriumPower', 'flat', 0.25), m('manaCost', 'more', 0.10)),
      n('tailA', 'notable', 'Dusk-Blade Equilibrium', '+14% additional Life\'s First Movement cross-weave power; 10% increased attack and cast speed.', m('equilibriumPower', 'flat', 0.14), m('attackSpeed', 'increased', 0.10), m('castSpeed', 'increased', 0.10)),
      n('tailB', 'notable', 'Weave-Walker Poise', '14% increased attack damage; 14% increased spell damage; +25% combo window duration.', m('damage', 'increased', 0.14, ['attack']), m('damage', 'increased', 0.14, ['spell']), m('comboWindow', 'increased', 0.25)),
    ],
  },

  // =========================================================================
  // FORTITUDE — Academic Fieldwork (Exorcist: Elite & Boss Trophy Mastery)
  // =========================================================================
  {
    id: 'exp_p17_for_academic_fieldwork', wedge: 'for', theme: 'bastion', shape: 'fork', pass: 17,
    nodes: [
      n('entry', 'small', 'Field Ledger', '+14 maximum life; 10% increased damage against elites and bosses.', m('life', 'flat', 14), m('regicide', 'flat', 0.10)),
      n('a', 'small', 'Catalogued Weakness', '4% increased armor and +4% critical strike multiplier per Academic Trophy stack.', g('armor', 'increased', 0.04, 'trophy'), g('critMulti', 'flat', 0.04, 'trophy')),
      n('b', 'small', 'Inquisitor\'s Plate', '10% increased armor; +6% fire, cold, and lightning resistance.', m('armor', 'increased', 0.10), m('fireRes', 'flat', 0.06), m('coldRes', 'flat', 0.06), m('lightningRes', 'flat', 0.06)),
      n('', 'notable', 'Academic Fieldwork', 'Slaying a rare/boss—or landing every 8th hit against one—banks an Academic Trophy (0–5, 20s): each stack grants 8% more damage vs elites/bosses (4% vs normal), +8% Armor, +5% attack/cast speed, and +3% all resistances.', m('trophyPower', 'flat', 0.08)),
      n('tailA', 'notable', 'Archivist of Slain', '+5% additional Academic Trophy more damage per stack; +15% regicide damage against bosses.', m('trophyPower', 'flat', 0.05), m('regicide', 'flat', 0.15)),
      n('tailB', 'notable', 'Reliquary Harness', '+2% maximum life regenerated per second at 5 Trophies (0.4% per stack); +30 maximum life; +10% armor.', g('lifeRegenPct', 'flat', 0.004, 'trophy'), m('life', 'flat', 30), m('armor', 'increased', 0.10)),
    ],
  },

  // =========================================================================
  // DEXTERITY — Wintry Hail (White Arrow: Chilled Projectile Frost Ricochet)
  // =========================================================================
  {
    id: 'exp_p17_dex_wintry_hail', wedge: 'dex', theme: 'cold', shape: 'fork', pass: 17,
    nodes: [
      n('entry', 'small', 'Rime-Fletched Shaft', '8% increased cold projectile damage; +8% chance to chill.', m('damage', 'increased', 0.08, ['cold', 'projectile']), m('apply_chill', 'flat', 0.08)),
      n('a', 'small', 'Glacial Draw', '+5% cold penetration; 8% increased projectile damage.', m('coldPen', 'flat', 0.05), m('damage', 'increased', 0.08, ['projectile'])),
      n('b', 'small', 'Sleet Volley', '6% increased attack speed with projectiles; +8% chance to chill.', m('attackSpeed', 'increased', 0.06, ['projectile']), m('apply_chill', 'flat', 0.08)),
      n('', 'keystone', 'Wintry Hail', 'Projectiles striking a Chilled or Frozen enemy (0.35s ICD) ricochet freezing shards to up to 2 nearby foes for 60% of hit damage with +12% Cold Penetration and Chill; 12% reduced projectile speed.', m('frostRicochet', 'flat', 0.80), m('projectileSpeed', 'increased', -0.12)),
      n('tailA', 'notable', 'Permafrost Carom', '+35% additional Wintry Hail ricochet damage and Cold Penetration; +12% chance to chill.', m('frostRicochet', 'flat', 0.35), m('apply_chill', 'flat', 0.12)),
      n('tailB', 'notable', 'White-Arrow Barrage', '+1 projectile pierce; 15% increased cold damage; +8% cold penetration.', m('pierceCount', 'flat', 1), m('damage', 'increased', 0.15, ['cold']), m('coldPen', 'flat', 0.08)),
    ],
  },

  // =========================================================================
  // FINESSE — Intravenous Spark (Alastor: Crit-Stacked Neural Surge & Discharge)
  // =========================================================================
  {
    id: 'exp_p17_fin_intravenous_spark', wedge: 'fin', theme: 'lightning', shape: 'fork', pass: 17,
    nodes: [
      n('entry', 'small', 'Live Filament', '+2% critical strike chance; 8% increased lightning damage.', m('critChance', 'flat', 0.02), m('damage', 'increased', 0.08, ['lightning'])),
      n('a', 'small', 'Synaptic Pulse', '5% increased attack and cast speed per Neural Surge stack (up to 5).', g('attackSpeed', 'increased', 0.05, 'neuralSurge'), g('castSpeed', 'increased', 0.05, 'neuralSurge')),
      n('b', 'small', 'Voltaic Twitch', '+8% critical strike multiplier; +8% chance to shock.', m('critMulti', 'flat', 0.08), m('apply_shock', 'flat', 0.08)),
      n('', 'keystone', 'Intravenous Spark', 'Critical strikes (0.2s ICD) bank Neural Surge stacks (0–5, 5s). Reaching 5 stacks discharges a chained Lightning Arc across up to 4 foes that inflicts Shock and resets stacks; -10% lightning resistance.', m('neuralSparkPower', 'flat', 0.85), m('lightningRes', 'flat', -0.10)),
      n('tailA', 'notable', 'Overwired Cord', '+35% additional Intravenous Spark Lightning Arc damage; 4% increased attack and cast speed per Neural Surge stack.', m('neuralSparkPower', 'flat', 0.35), g('attackSpeed', 'increased', 0.04, 'neuralSurge'), g('castSpeed', 'increased', 0.04, 'neuralSurge')),
      n('tailB', 'notable', 'Alastor\'s Reflex', '+3% critical strike chance; +4% movement speed per Neural Surge stack; +12% lightning resistance.', m('critChance', 'flat', 0.03), g('moveSpeed', 'increased', 0.04, 'neuralSurge'), m('lightningRes', 'flat', 0.12)),
    ],
  },

  // =========================================================================
  // INTELLIGENCE — Residual Energy (Warlock: Spell <-> Attack Element Imprint)
  // =========================================================================
  {
    id: 'exp_p17_int_residual_energy', wedge: 'int', theme: 'arcana', shape: 'fork', pass: 17,
    nodes: [
      n('entry', 'small', 'Lingering Sigil', '8% increased spell damage; 8% increased weapon attack damage.', m('damage', 'increased', 0.08, ['spell']), m('damage', 'increased', 0.08, ['attack'])),
      n('a', 'small', 'Imprinted Edge', '+4% fire, cold, lightning, and chaos penetration with attacks.', m('firePen', 'flat', 0.04, ['attack']), m('coldPen', 'flat', 0.04, ['attack']), m('lightningPen', 'flat', 0.04, ['attack']), m('chaosPen', 'flat', 0.04, ['attack'])),
      n('b', 'small', 'Kinetic Residue', '8% increased physical spell damage; 6% increased cast speed.', m('damage', 'increased', 0.08, ['physical', 'spell']), m('castSpeed', 'increased', 0.06)),
      n('', 'keystone', 'Residual Energy', 'Casting a Spell imprints its dominant element onto your next 2 Attacks, adding 40% of hit damage as extra damage of that type; casting an Attack imprints 30% extra Physical damage onto your next Spell; skills cost 12% more mana.', m('residualImprint', 'flat', 0.40), m('manaCost', 'more', 0.12)),
      n('tailA', 'notable', 'Warlock\'s Conduit', '+20% additional Residual Energy elemental & kinetic imprint ratio; +15 maximum mana.', m('residualImprint', 'flat', 0.20), m('mana', 'flat', 15)),
      n('tailB', 'notable', 'Spellblade Synthesis', 'While alternating distinct skills (varied combo): 12% increased attack speed, 12% increased cast speed, and +18% critical strike multiplier.', m('attackSpeed', 'increased', 0.12, undefined, 'comboVaried'), m('castSpeed', 'increased', 0.12, undefined, 'comboVaried'), m('critMulti', 'flat', 0.18, undefined, 'comboVaried')),
    ],
  },

  // =========================================================================
  // WILLPOWER — Essential Measure (Plaguebringer: Victim-Centered Contagion Pulse)
  // =========================================================================
  {
    id: 'exp_p17_wil_essential_measure', wedge: 'wil', theme: 'entropy', shape: 'fork', pass: 17,
    nodes: [
      n('entry', 'small', 'Blighted Carrier', '+10% chance to inflict poison; 8% increased chaos area damage.', m('apply_poison', 'flat', 0.10), m('damage', 'increased', 0.08, ['chaos', 'aoe'])),
      n('a', 'small', 'Viral Proximity', '10% increased area of effect; 8% increased ailment duration.', m('aoeRadius', 'increased', 0.10), m('effectDuration', 'increased', 0.08)),
      n('b', 'small', 'Pestilent Thrall', '10% increased minion damage; 10% increased ailment magnitude.', m('minionDamage', 'increased', 0.10), m('statusMagnitude', 'increased', 0.10)),
      n('', 'notable', 'Essential Measure', 'Inflicting Bleed, Burn, or Poison (1.2s per-target ICD) emits a corrosive chaos pulse around the victim that damages nearby foes, extends their active DoTs by 0.8s, and grants nearby minions +15% ailment magnitude.', m('plagueDiffPower', 'flat', 0.85)),
      n('tailA', 'notable', 'Miasmic Contagion', '+35% additional Essential Measure chaos pulse damage; 15% increased area of effect; 12% chance for DoTs to spread on death.', m('plagueDiffPower', 'flat', 0.35), m('aoeRadius', 'increased', 0.15), m('dotPropagates', 'flat', 0.12)),
      n('tailB', 'notable', 'Plague-Keeper\'s Dose', '18% increased ailment magnitude; +12% chaos resistance; +10% poison and bleed chance.', m('statusMagnitude', 'increased', 0.18), m('chaosRes', 'flat', 0.12), m('apply_poison', 'flat', 0.10), m('apply_bleed', 'flat', 0.10)),
    ],
  },

  // =========================================================================
  // WISDOM — Dawn Consecration (Eos: Heal/Ward Sacred Ground & Low-Life Scorch)
  // =========================================================================
  {
    id: 'exp_p17_wis_dawn_consecration', wedge: 'wis', theme: 'fire', shape: 'fork', pass: 17,
    nodes: [
      n('entry', 'small', 'Sun-Blessed Soil', '10% increased healing power; 8% increased fire damage.', m('healPower', 'increased', 0.10), m('damage', 'increased', 0.08, ['fire'])),
      n('a', 'small', 'Pious Haste', '8% increased minion action speed; 8% increased ward gained.', m('minionHaste', 'increased', 0.08), m('wardGain', 'increased', 0.08)),
      n('b', 'small', 'Sacred Radius', '10% increased area of effect; +12 maximum life.', m('aoeRadius', 'increased', 0.10), m('life', 'flat', 12)),
      n('', 'keystone', 'Dawn Consecration', 'Real healing or gaining Ward (3.5s ICD) lays 4s of Consecrated Ground that scorches enemies every 0.8s (40% MORE damage below 40% life) while mending and granting +14% attack/cast speed to allies and minions inside; 10% reduced evasion.', m('dawnConsecrate', 'flat', 0.85), m('evasion', 'increased', -0.10)),
      n('tailA', 'notable', 'Dawn\'s Pious Striker', '+35% additional Dawn Consecration sacred scorch damage; +8% fire penetration; 15% increased area of effect.', m('dawnConsecrate', 'flat', 0.35), m('firePen', 'flat', 0.08), m('aoeRadius', 'increased', 0.15)),
      n('tailB', 'notable', 'Sanctified Congregation', '16% increased healing power; 15% increased minion maximum life; 15% increased ward gained.', m('healPower', 'increased', 0.16), m('minionLife', 'increased', 0.15), m('wardGain', 'increased', 0.15)),
    ],
  },

  // =========================================================================
  // CHARISMA — Temporal Siphon (Time Weaver: Cooldown Shave & Buff Extension)
  // =========================================================================
  {
    id: 'exp_p17_cha_chrono_siphon', wedge: 'cha', theme: 'time', shape: 'fork', pass: 17,
    nodes: [
      n('entry', 'small', 'Borrowed Seconds', '8% increased cooldown recovery; 8% increased buff duration.', m('cooldownRecovery', 'increased', 0.08), m('effectDuration', 'increased', 0.08, ['buff'])),
      n('a', 'small', 'Stolen Tempo', '+10% chance to chill; +10% chance to inflict jinxed.', m('apply_chill', 'flat', 0.10), m('apply_jinxed', 'flat', 0.10)),
      n('b', 'small', 'Unspooling Thread', '8% increased skill effect duration; +0.4s "Recently" window.', m('effectDuration', 'increased', 0.08), m('recentlyWindow', 'flat', 0.4)),
      n('', 'keystone', 'Temporal Siphon', 'Hitting a Chilled, Slowed, Frozen, Stunned, Cursed, or Temporal-Debt enemy (0.75s ICD) shaves 0.30s off all active skill cooldowns and extends your active buffs by 0.21s (up to 15s); skills cost 15% more mana.', m('chronoSiphon', 'flat', 0.85), m('manaCost', 'more', 0.15)),
      n('tailA', 'notable', 'Hourglass Thief', '+35% additional Temporal Siphon cooldown shave and buff extension; 12% increased cooldown recovery.', m('chronoSiphon', 'flat', 0.35), m('cooldownRecovery', 'increased', 0.12)),
      n('tailB', 'notable', 'Perpetual Cadence', '+0.8s "Recently" window; 15% increased buff duration; 4% increased damage per buff on you.', m('recentlyWindow', 'flat', 0.8), m('effectDuration', 'increased', 0.15, ['buff']), g('damage', 'increased', 0.04, 'buffs')),
    ],
  },
];
