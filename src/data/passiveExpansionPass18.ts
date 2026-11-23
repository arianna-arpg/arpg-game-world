// ---------------------------------------------------------------------------
// PASS 18 — Voidling Bound Perks I: Siphons, Stasis & Bio-Zones
// (9 wheels, 54 nodes, 7 Keystones — 1 wheel per attribute wedge)
//
// Adapts 9 iconic untapped Voidling Bound Perks from the Codex / Wiki:
//   - STR: Rime Cocoon (Frostbite Detonation — <35% life 2s ice stasis -> Cold/Stun nova)
//   - FOR: Lithic Shellburst (Stone Skin Fissure + Proximity Shell — <40% armor eruption)
//   - PRW: Fueled Momentum (Fueled Up + Frenzied — kill/boss-hit speed stacks + moving-cast haste)
//   - DEX: Windburn Slipstream (Windburn + Overflow — moving Fire+Cold bolts + reload/move whirlpool)
//   - FIN: Phase Stasis (Plane Shift + Night Bite — stealth/evade time dilation + impaired bleed-heal)
//   - INT: Tractor Tethers (Tractor Beams — 3-foe lightning siphon & pull tethers)
//   - WIL: Plasma Disintegration (Disintegrate / Plasma Overflow + Deadly Weakness — 5-stack burst)
//   - WIS: Spring Bloom (Spring Bloom + Ripe Harvest — tossed empowering bio-flowers)
//   - CHA: Living Tides (Healing Roots + Soothing Voyage — stationary sanctuary OR untouched sprint heal)
// ---------------------------------------------------------------------------

import { gaugeMod as g, mod as m } from '../engine/stats';
import { n, type ExpansionCluster } from './passiveExpansionBase';

export const PASS18_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // STRENGTH — Rime Cocoon (Frostbite Detonation: <35% Life Ice-Block Stasis)
  // =========================================================================
  {
    id: 'exp_p18_str_cryo_cocoon', wedge: 'str', theme: 'cold', shape: 'fork', pass: 18,
    nodes: [
      n('entry', 'small', 'Glacial Husk', '+16 maximum life; +10% cold resistance.', m('life', 'flat', 16), m('coldRes', 'flat', 0.10)),
      n('a', 'small', 'Chrysalis Frost', '10% increased cold area damage; +10% chance to chill.', m('damage', 'increased', 0.10, ['cold', 'aoe']), m('apply_chill', 'flat', 0.10)),
      n('b', 'small', 'Hibernating Pulse', '12% increased life regeneration; +14 maximum life.', m('lifeRegen', 'increased', 0.12), m('life', 'flat', 14)),
      n('', 'keystone', 'Rime Cocoon', 'Dropping below 35% Life (25s ICD) encases you in 2s of invulnerable ice (immobile, regenerating 6% max life/s), then shatters in a 210px Cold nova scaled by max Life that Chills and Stuns foes (crushes boss Poise); -8% movement speed.', m('cryoCocoonPower', 'flat', 1.0), m('moveSpeed', 'increased', -0.08)),
      n('tailA', 'notable', 'Shatter Chrysalis', '+40% Rime Cocoon heal and shatter nova power; 16% increased area of effect; +8% cold penetration.', m('cryoCocoonPower', 'flat', 0.40), m('aoeRadius', 'increased', 0.16), m('coldPen', 'flat', 0.08)),
      n('tailB', 'notable', 'Sub-Zero Recovery', '+35 maximum life; +15% healing received; +2% maximum cold resistance.', m('life', 'flat', 35), m('healTaken', 'increased', 0.15), m('coldResMax', 'flat', 0.02)),
    ],
  },

  // =========================================================================
  // FORTITUDE — Lithic Shellburst (Stone Skin Fissure + Proximity Shell)
  // =========================================================================
  {
    id: 'exp_p18_for_stone_fissure', wedge: 'for', theme: 'bastion', shape: 'fork', pass: 18,
    nodes: [
      n('entry', 'small', 'Shelled Plates', '12% increased armor; +12 maximum endurance.', m('armor', 'increased', 0.12), m('endurance', 'flat', 12)),
      n('a', 'small', 'Proximity Shell', '6% increased armor per nearby enemy (up to 10).', g('armor', 'increased', 0.06, 'foes:near')),
      n('b', 'small', 'Tectonic Core', '10% increased physical area damage; 10% increased poise damage.', m('damage', 'increased', 0.10, ['physical', 'aoe']), m('poiseDamage', 'increased', 0.10)),
      n('', 'keystone', 'Lithic Shellburst', 'Dropping below 40% Life (12s ICD) erupts a 190px physical shockwave scaled by Armor (knockback + poise crush), refills 30% max Endurance, and hardens 6s of Stone Skin (+45% Armor, +25% Endurance DR); 12% less evasion.', m('lithicFissurePower', 'flat', 1.0), m('evasion', 'more', -0.12)),
      n('tailA', 'notable', 'Seismic Carapace', '+40% Lithic Shellburst shockwave and Stone Skin power; 18% increased area of effect; +20 maximum endurance.', m('lithicFissurePower', 'flat', 0.40), m('aoeRadius', 'increased', 0.18), m('endurance', 'flat', 20)),
      n('tailB', 'notable', 'Encircled Bastion', '8% increased armor and +2 flat hit damage reduction per nearby enemy (up to 10).', g('armor', 'increased', 0.08, 'foes:near'), g('flatHitReduction', 'flat', 2, 'foes:near')),
    ],
  },

  // =========================================================================
  // PROWESS — Fueled Momentum (Fueled Up + Frenzied)
  // =========================================================================
  {
    id: 'exp_p18_prw_fueled_frenzy', wedge: 'prw', theme: 'tempo', shape: 'fork', pass: 18,
    nodes: [
      n('entry', 'small', 'Combustion Drive', '6% increased attack speed; 6% increased cast speed.', m('attackSpeed', 'increased', 0.06), m('castSpeed', 'increased', 0.06)),
      n('a', 'small', 'Frenzied Stride', '1.5% increased movement speed per Fueled Momentum stack (up to 10).', g('moveSpeed', 'increased', 0.015, 'fueled')),
      n('b', 'small', 'Overfed Furnace', '2.5% increased damage per Fueled Momentum stack (up to 10).', g('damage', 'increased', 0.025, 'fueled')),
      n('', 'notable', 'Fueled Momentum', 'Slaying enemies—or landing every 4th hit vs rares/bosses—banks Fueled stacks (0–10, 7s): +4% attack & cast speed per stack, and casting while Fueled grants Frenzied Stride (+12% move speed, +20% cast mobility).', m('fueledRatePower', 'flat', 0.04)),
      n('tailA', 'notable', 'Runaway Ignition', '+2.5% additional Fueled Momentum attack & cast speed per stack; +0.6s "Recently" window.', m('fueledRatePower', 'flat', 0.025), m('recentlyWindow', 'flat', 0.6)),
      n('tailB', 'notable', 'Apex Fuel-Line', '+1.5% critical strike chance and +3% critical strike multiplier per Fueled Momentum stack; 10% increased movement speed if killed recently.', g('critChance', 'flat', 0.015, 'fueled'), g('critMulti', 'flat', 0.03, 'fueled'), m('moveSpeed', 'increased', 0.10, undefined, 'recentlyKilled')),
    ],
  },

  // =========================================================================
  // DEXTERITY — Windburn Slipstream (Windburn + Overflow)
  // =========================================================================
  {
    id: 'exp_p18_dex_windburn_gale', wedge: 'dex', theme: 'ranged', shape: 'fork', pass: 18,
    nodes: [
      n('entry', 'small', 'Thermal Draft', '8% increased fire and cold projectile damage; 4% increased movement speed.', m('damage', 'increased', 0.08, ['fire', 'projectile']), m('damage', 'increased', 0.08, ['cold', 'projectile']), m('moveSpeed', 'increased', 0.04)),
      n('a', 'small', 'Crosswind Bolt', '+8% chance to burn and chill; 10% increased projectile speed.', m('apply_burn', 'flat', 0.08), m('apply_chill', 'flat', 0.08), m('projectileSpeed', 'increased', 0.10)),
      n('b', 'small', 'Whirlpool Wake', '10% increased area of effect; 8% increased reload speed.', m('aoeRadius', 'increased', 0.10), m('reloadSpeed', 'increased', 0.08)),
      n('', 'keystone', 'Windburn Slipstream', 'While moving continuously, launch a homing Fire+Cold Windburn bolt every 0.9s applying Burn and Chill; casting reload or movement skills (2.5s ICD) releases a 165px chilling knockback Overflow whirlpool; 12% less stationary damage.', m('windburnPower', 'flat', 1.0), m('damage', 'more', -0.12, undefined, 'stationary')),
      n('tailA', 'notable', 'Gale-Force Overflow', '+40% Windburn bolt and Overflow whirlpool damage; 15% increased movement skill cooldown recovery.', m('windburnPower', 'flat', 0.40), m('cooldownRecovery', 'increased', 0.15, ['movement'])),
      n('tailB', 'notable', 'Migrator\'s Slip', '10% increased movement speed; +6% fire and cold penetration; 15% increased reload speed.', m('moveSpeed', 'increased', 0.10), m('firePen', 'flat', 0.06), m('coldPen', 'flat', 0.06), m('reloadSpeed', 'increased', 0.15)),
    ],
  },

  // =========================================================================
  // FINESSE — Phase Stasis (Plane Shift + Night Bite)
  // =========================================================================
  {
    id: 'exp_p18_fin_plane_shift', wedge: 'fin', theme: 'guile', shape: 'fork', pass: 18,
    nodes: [
      n('entry', 'small', 'Dimmed Phase', '+10% concealment; 10% increased evasion.', m('concealment', 'flat', 0.10), m('evasion', 'increased', 0.10)),
      n('a', 'small', 'Slumbering Fang', '+10% chance to bleed; +12% critical strike multiplier.', m('apply_bleed', 'flat', 0.10), m('critMulti', 'flat', 0.12)),
      n('b', 'small', 'Still-Air Flicker', '8% increased skill effect duration; 5% increased movement speed.', m('effectDuration', 'increased', 0.08), m('moveSpeed', 'increased', 0.05)),
      n('', 'keystone', 'Phase Stasis', 'Gaining Invisibility, holding >=40% Concealment, or evading an attack (3.5s ICD) dilates nearby foes for 2.5s (Chill, Slow, +20% damage taken). Striking Stunned, Frozen, or Dilated foes (0.5s ICD) triggers Night Bite (2 Bleed + 3.5% life heal); 12% less armor.', m('phaseStasisPower', 'flat', 1.0), m('armor', 'more', -0.12)),
      n('tailA', 'notable', 'Night-Bite Hunger', '+40% Phase Stasis dilation vulnerability and Night Bite healing; +15% concealment; +12% bleed chance.', m('phaseStasisPower', 'flat', 0.40), m('concealment', 'flat', 0.15), m('apply_bleed', 'flat', 0.12)),
      n('tailB', 'notable', 'Ghost-Clock Drift', '+16% evasion; +8% graze chance; +0.6s "Recently" window.', m('evasion', 'increased', 0.16), m('grazeChance', 'flat', 0.08), m('recentlyWindow', 'flat', 0.6)),
    ],
  },

  // =========================================================================
  // INTELLIGENCE — Tractor Tethers (Tractor Beams: 3-Foe Siphon & Pull)
  // =========================================================================
  {
    id: 'exp_p18_int_tractor_beams', wedge: 'int', theme: 'lightning', shape: 'fork', pass: 18,
    nodes: [
      n('entry', 'small', 'Inductive Coil', '8% increased lightning damage; +14 maximum mana.', m('damage', 'increased', 0.08, ['lightning']), m('mana', 'flat', 14)),
      n('a', 'small', 'Magnetic Drag', '+10% chance to shock; +12 maximum energy shield.', m('apply_shock', 'flat', 0.10), m('energyShield', 'flat', 12)),
      n('b', 'small', 'Drainage Filaments', '10% increased mana regeneration; 10% increased energy shield recharge rate.', m('manaRegen', 'increased', 0.10), m('esRechargeRate', 'increased', 0.10)),
      n('', 'keystone', 'Tractor Tethers', 'Automatically links up to 3 enemies within 250px every 0.6s, dealing Lightning damage, pulling non-bosses inward, 35% Shock chance, and siphoning 2.5% max Mana & Energy Shield per linked foe; -12% lightning resistance.', m('tractorTetherPower', 'flat', 1.0), m('lightningRes', 'flat', -0.12)),
      n('tailA', 'notable', 'High-Tension Siphon', '+40% Tractor Tethers Lightning damage; +8% lightning penetration; +20 maximum energy shield.', m('tractorTetherPower', 'flat', 0.40), m('lightningPen', 'flat', 0.08), m('energyShield', 'flat', 20)),
      n('tailB', 'notable', 'Packuran Dynamo', '4% increased spell damage and +2% lightning resistance per nearby enemy (up to 10); +20 maximum mana.', g('damage', 'increased', 0.04, 'foes:near', ['spell']), g('lightningRes', 'flat', 0.02, 'foes:near'), m('mana', 'flat', 20)),
    ],
  },

  // =========================================================================
  // WILLPOWER — Plasma Disintegration (Disintegrate / Plasma Overflow + Deadly Weakness)
  // =========================================================================
  {
    id: 'exp_p18_wil_plasma_overflow', wedge: 'wil', theme: 'entropy', shape: 'fork', pass: 18,
    nodes: [
      n('entry', 'small', 'Ionized Decay', '8% increased chaos damage; 8% increased lightning damage.', m('damage', 'increased', 0.08, ['chaos']), m('damage', 'increased', 0.08, ['lightning'])),
      n('a', 'small', 'Unstable Lattice', '6% increased attack and cast speed; +5% chaos penetration.', m('attackSpeed', 'increased', 0.06), m('castSpeed', 'increased', 0.06), m('chaosPen', 'flat', 0.05)),
      n('b', 'small', 'Volatile Saturation', '10% increased area of effect; +5% lightning penetration.', m('aoeRadius', 'increased', 0.10), m('lightningPen', 'flat', 0.05)),
      n('', 'keystone', 'Plasma Disintegration', 'Hits etch Disintegration (0–5, 0.2s/target ICD): deal 25% more hit damage to foes at >=4 stacks; applying a 6th stack detonates a 175px Chaos+Lightning Plasma Overflow blast and shreds 15% enemy Armor & Resistances for 4s; skills cost 12% more mana.', m('plasmaDisintPower', 'flat', 1.0), m('manaCost', 'more', 0.12)),
      n('tailA', 'notable', 'Deadly Weakness', '+40% Plasma Disintegration damage-at-max and Overflow detonation power; 15% increased area of effect.', m('plasmaDisintPower', 'flat', 0.40), m('aoeRadius', 'increased', 0.15)),
      n('tailB', 'notable', 'Subatomic Shred', '+7% chaos penetration; +7% lightning penetration; 10% increased attack and cast speed.', m('chaosPen', 'flat', 0.07), m('lightningPen', 'flat', 0.07), m('attackSpeed', 'increased', 0.10), m('castSpeed', 'increased', 0.10)),
    ],
  },

  // =========================================================================
  // WISDOM — Spring Bloom (Spring Bloom + Ripe Harvest: Tossed Empowering Bio-Flowers)
  // =========================================================================
  {
    id: 'exp_p18_wis_spring_bloom', wedge: 'wis', theme: 'nature', shape: 'fork', pass: 18,
    nodes: [
      n('entry', 'small', 'Sown Spores', '8% increased minion damage; 8% increased skill effect duration.', m('minionDamage', 'increased', 0.08), m('effectDuration', 'increased', 0.08)),
      n('a', 'small', 'Pollen Drift', '10% increased aura and area radius; 8% increased minion action speed.', m('aoeRadius', 'increased', 0.10), m('minionHaste', 'increased', 0.08)),
      n('b', 'small', 'Fertile Canopy', '10% increased minion maximum life; 10% increased healing power.', m('minionLife', 'increased', 0.10), m('healPower', 'increased', 0.10)),
      n('', 'notable', 'Spring Bloom', 'Casting an Ultimate, Summon, or Cooldown (>=3s) skill (5s ICD)—or slaying a rare/boss—scatters 2 empowering 8s Bloom Flowers pulsing +14% more damage, +15% attack/cast/minion speed, and 3% Life & Mana recovery inside 145px.', m('springBloomPower', 'flat', 1.0)),
      n('tailA', 'notable', 'Ripe Harvest', '+40% Spring Bloom flower more-damage potency; 18% increased area of effect; 12% increased ultimate gauge gain.', m('springBloomPower', 'flat', 0.40), m('aoeRadius', 'increased', 0.18), m('gaugeGain', 'increased', 0.12)),
      n('tailB', 'notable', 'Gwigoon Nursery', '+1 maximum minion; 15% increased minion life; 12% increased summon cooldown recovery.', m('minionMaxCount', 'flat', 1), m('minionLife', 'increased', 0.15), m('cooldownRecovery', 'increased', 0.12, ['summon'])),
    ],
  },

  // =========================================================================
  // CHARISMA — Living Tides (Healing Roots + Soothing Voyage: Dual-Mode Sustain)
  // =========================================================================
  {
    id: 'exp_p18_cha_healing_roots', wedge: 'cha', theme: 'life', shape: 'fork', pass: 18,
    nodes: [
      n('entry', 'small', 'Verdant Rhythm', '10% increased healing power; 4% increased movement speed.', m('healPower', 'increased', 0.10), m('moveSpeed', 'increased', 0.04)),
      n('a', 'small', 'Deep-Set Tendrils', '+0.6% maximum life regenerated per second while stationary; +12 maximum energy shield.', m('lifeRegenPct', 'flat', 0.006, undefined, 'stationary'), m('energyShield', 'flat', 12)),
      n('b', 'small', 'Migrating Breath', '+0.6% maximum life regenerated per second while moving; 10% increased healing received.', m('lifeRegenPct', 'flat', 0.006, undefined, 'moving'), m('healTaken', 'increased', 0.10)),
      n('', 'keystone', 'Living Tides', 'Standing stationary 2s blooms a 160px Healing Roots sanctuary (4% Life & 3% Mana/ES per sec to allies +15% heal taken). Moving untouched >=1.5s ramps Soothing Voyage healing & +10% move speed (resets on stop/hit); 10% less hit damage.', m('livingTidesPower', 'flat', 1.0), m('damage', 'more', -0.10)),
      n('tailA', 'notable', 'Sanctuary Taproot', '+40% Living Tides Healing Roots & Soothing Voyage recovery; 18% increased healing power; 15% increased area of effect.', m('livingTidesPower', 'flat', 0.40), m('healPower', 'increased', 0.18), m('aoeRadius', 'increased', 0.15)),
      n('tailB', 'notable', 'Unbroken Migration', '10% increased movement speed; 15% increased energy shield recharge rate; +15% healing received while moving.', m('moveSpeed', 'increased', 0.10), m('esRechargeRate', 'increased', 0.15), m('healTaken', 'increased', 0.15, undefined, 'moving')),
    ],
  },
];
