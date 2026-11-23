// ---------------------------------------------------------------------------
// PASS 19 — Voidling Bound Perks II: Bio-Mutations, Leech & Overflows
// (9 wheels, 54 nodes, 7 Keystones — 1 wheel per attribute wedge)
//
// Completes Hollow Wake's Voidling Bound Perks deep-dive:
//   - STR: Pyroclastic Feast (Lava Puddle + Watch Them Burn — molten pools + Burn-tick heal)
//   - FOR: Carapace Integration (Block Integration + Minion Coordination — skill-charged guard plies)
//   - PRW: Critical Detonator (Critical Blast — 3-crit concussive stun & boss poise blast)
//   - DEX: Bio-Recycling (Recycling + Heat Absorption — kill/boss charge refund + reload frost nova)
//   - FIN: Hematic Transfusion (Transfusion + Low-HP Hyperdrive — bleed siphon + <35% crit surge)
//   - INT: Cryo-Execution (Hypothermia — massive MORE damage vs Frozen/Stunned/Poise-Broken foes)
//   - WIL: Corrosive Dissolution (Poison Armor-Shredder — per-poison-stack Armor & Res melt)
//   - WIS: Pylon Resonance (Nimiod Turret Resonance — construct/minion aura regen & movement overcharge)
//   - CHA: Power Extractor (Energy Extractor — collectable Power Blobs fueling Ultimate & CDs)
// ---------------------------------------------------------------------------

import { gaugeMod as g, mod as m } from '../engine/stats';
import { n, type ExpansionCluster } from './passiveExpansionBase';

export const PASS19_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // STRENGTH — Pyroclastic Feast (Lava Puddle + Watch Them Burn)
  // =========================================================================
  {
    id: 'exp_p19_str_lava_puddle', wedge: 'str', theme: 'fire', shape: 'fork', pass: 19,
    nodes: [
      n('entry', 'small', 'Slag-Dripping Blow', '8% increased fire damage; +10% chance to inflict burn.', m('damage', 'increased', 0.08, ['fire']), m('apply_burn', 'flat', 0.10)),
      n('a', 'small', 'Cinder Siphon', '10% increased fire ailment magnitude; +14 maximum life.', m('statusMagnitude', 'increased', 0.10, ['fire']), m('life', 'flat', 14)),
      n('b', 'small', 'Magma Pooling', '10% increased fire area of effect; +10% fire resistance.', m('aoeRadius', 'increased', 0.10, ['fire']), m('fireRes', 'flat', 0.10)),
      n('', 'keystone', 'Pyroclastic Feast', 'Direct hits have a 30% chance (3s ICD) to spawn a 4s burning Lava Puddle; Burn damage you inflict heals you for 18% of burn damage dealt (up to 15% max life/s); 20% less passive life regeneration.', m('burnFeastPower', 'flat', 1.0), m('lifeRegen', 'more', -0.20)),
      n('tailA', 'notable', 'Watch Them Burn', '+40% Pyroclastic Feast Lava Puddle damage and Burn-siphon healing; 20% increased fire ailment magnitude.', m('burnFeastPower', 'flat', 0.40), m('statusMagnitude', 'increased', 0.20, ['fire'])),
      n('tailB', 'notable', 'Kwipeck Hearth-Core', '+2% maximum fire resistance; 15% increased fire area of effect; +12% burn chance.', m('fireResMax', 'flat', 0.02), m('aoeRadius', 'increased', 0.15, ['fire']), m('apply_burn', 'flat', 0.12)),
    ],
  },

  // =========================================================================
  // FORTITUDE — Carapace Integration (Block Integration + Minion Coordination)
  // =========================================================================
  {
    id: 'exp_p19_for_block_integration', wedge: 'for', theme: 'bastion', shape: 'fork', pass: 19,
    nodes: [
      n('entry', 'small', 'Chitinous Seam', '10% increased armor; 10% increased ward gained.', m('armor', 'increased', 0.10), m('wardGain', 'increased', 0.10)),
      n('a', 'small', 'Minion Coordination', '5% increased armor and +1.5% block chance per living minion (up to 10).', g('armor', 'increased', 0.05, 'minions'), g('blockChance', 'flat', 0.015, 'minions')),
      n('b', 'small', 'Integrated Guard', '6% increased armor and +4 flat block value per Integrated Block Charge.', g('armor', 'increased', 0.06, 'blockCharges'), g('blockValue', 'flat', 4, 'blockCharges')),
      n('', 'keystone', 'Carapace Integration', 'Casting Cooldown (>=2s), Guard, or Warcry skills (2s ICD) banks Integrated Block Charges (0–4, 10s). Taking a hit spends 1 charge to cut damage by 35%, grant Ward, and reflect 40% of prevented damage; -10% movement speed.', m('blockIntegratePower', 'flat', 1.0), m('moveSpeed', 'increased', -0.10)),
      n('tailA', 'notable', 'Reflective Shell-Bank', '+40% Carapace Integration mitigation and Ward gain; 15% increased guard and warcry cooldown recovery.', m('blockIntegratePower', 'flat', 0.40), m('cooldownRecovery', 'increased', 0.15, ['guard']), m('cooldownRecovery', 'increased', 0.15, ['warcry'])),
      n('tailB', 'notable', 'Swarm-Plated Bulwark', '16% increased ward gained; +20 maximum life; 4% increased damage per Integrated Block Charge.', m('wardGain', 'increased', 0.16), m('life', 'flat', 20), g('damage', 'increased', 0.04, 'blockCharges')),
    ],
  },

  // =========================================================================
  // PROWESS — Critical Detonator (Critical Blast: 3-Crit Stun Explosion)
  // =========================================================================
  {
    id: 'exp_p19_prw_critical_blast', wedge: 'prw', theme: 'impact', shape: 'fork', pass: 19,
    nodes: [
      n('entry', 'small', 'Primed Faultline', '+2% critical strike chance; 8% increased physical and fire damage.', m('critChance', 'flat', 0.02), m('damage', 'increased', 0.08, ['physical']), m('damage', 'increased', 0.08, ['fire'])),
      n('a', 'small', 'Capacitive Edge', '+8% critical strike multiplier per Critical Blast charge (up to 3).', g('critMulti', 'flat', 0.08, 'critCharge')),
      n('b', 'small', 'Shockwave Concussion', '10% increased area of effect; 12% increased poise damage.', m('aoeRadius', 'increased', 0.10), m('poiseDamage', 'increased', 0.12)),
      n('', 'keystone', 'Critical Detonator', 'Critical strikes (0.25s ICD) bank Blast Charges (0–3). The 3rd crit detonates a 175px Physical+Fire explosion on the target, stunning non-bosses for 1s and shredding 35% of a boss\'s max Poise; -15% critical strike multiplier.', m('critBlastPower', 'flat', 1.0), m('critMulti', 'flat', -0.15)),
      n('tailA', 'notable', 'Concussive Apex', '+40% Critical Detonator explosion and boss Poise-shred power; 16% increased area of effect.', m('critBlastPower', 'flat', 0.40), m('aoeRadius', 'increased', 0.16)),
      n('tailB', 'notable', 'Rapid Ignition Fuse', '+3% critical strike chance; 8% increased attack and cast speed; 20% increased sunder duration.', m('critChance', 'flat', 0.03), m('attackSpeed', 'increased', 0.08), m('castSpeed', 'increased', 0.08), m('sunderDuration', 'increased', 0.20)),
    ],
  },

  // =========================================================================
  // DEXTERITY — Bio-Recycling (Recycling + Heat Absorption)
  // =========================================================================
  {
    id: 'exp_p19_dex_recycling_charges', wedge: 'dex', theme: 'devices', shape: 'fork', pass: 19,
    nodes: [
      n('entry', 'small', 'Salvaged Magazine', '10% increased reload speed; 8% increased skill charge recovery.', m('reloadSpeed', 'increased', 0.10), m('skillChargeRate', 'increased', 0.08)),
      n('a', 'small', 'Cryo-Venting', '8% increased cold damage; +10% chance to chill.', m('damage', 'increased', 0.08, ['cold']), m('apply_chill', 'flat', 0.10)),
      n('b', 'small', 'Reclaimed Casing', '8% increased cooldown recovery; 8% increased munition and trap damage.', m('cooldownRecovery', 'increased', 0.08), m('damage', 'increased', 0.08, ['munition']), m('damage', 'increased', 0.08, ['trap'])),
      n('', 'notable', 'Bio-Recycling', 'Slaying enemies—or every 5th hit vs rares/bosses (1.5s ICD)—restores +1 charge to a non-full charge skill and shaves 0.6s off your longest cooldown; reload, munition, or flask casts (2s ICD) emit a 185px chilling Cold nova.', m('recyclePower', 'flat', 1.0)),
      n('tailA', 'notable', 'Heat Absorption', '+40% Bio-Recycling cooldown shave and Cold nova damage; +1 maximum charge for charge skills; +8% cold penetration.', m('recyclePower', 'flat', 0.40), m('chargeCap', 'flat', 1), m('coldPen', 'flat', 0.08)),
      n('tailB', 'notable', 'Kerapin Reclaimer', '18% increased reload speed; 15% increased flask restoration power; 15% increased munition damage.', m('reloadSpeed', 'increased', 0.18), m('restorePower', 'increased', 0.15, ['flask']), m('damage', 'increased', 0.15, ['munition'])),
    ],
  },

  // =========================================================================
  // FINESSE — Hematic Transfusion (Transfusion + Anami Low-Life Hyperdrive)
  // =========================================================================
  {
    id: 'exp_p19_fin_transfusion_bleed', wedge: 'fin', theme: 'life', shape: 'fork', pass: 19,
    nodes: [
      n('entry', 'small', 'Crimson Syringe', '+10% chance to bleed; 8% increased physical attack damage.', m('apply_bleed', 'flat', 0.10), m('damage', 'increased', 0.08, ['physical', 'attack'])),
      n('a', 'small', 'Adrenal Surge', '10% increased attack speed and +12% critical strike multiplier while on low life.', m('attackSpeed', 'increased', 0.10, undefined, 'lowLife'), m('critMulti', 'flat', 0.12, undefined, 'lowLife')),
      n('b', 'small', 'Sanguine Extraction', '10% increased healing received; 10% increased ward gained.', m('healTaken', 'increased', 0.10), m('wardGain', 'increased', 0.10)),
      n('', 'keystone', 'Hematic Transfusion', 'Direct hits against Bleeding enemies heal you for 12% of hit damage dealt (40% of overheal becomes Ward). While on Low Life, enter Adrenal Hyperdrive (+22% atk/cast speed, +12% crit chance, +35% crit multi, +15% move speed); 15% less maximum life.', m('bleedTransfusePower', 'flat', 1.0), m('life', 'more', -0.15)),
      n('tailA', 'notable', 'Morfang Hyperdrive', '+40% Hematic Transfusion siphon and Adrenal Hyperdrive power; +12% bleed chance; +5% low-life threshold.', m('bleedTransfusePower', 'flat', 0.40), m('apply_bleed', 'flat', 0.12), m('lowLifeLine', 'flat', 0.05)),
      n('tailB', 'notable', 'Exsanguinating Ward', '15% increased bleed ailment magnitude; 20% increased ward gained; +4% damage per bleed stack on the target.', m('statusMagnitude', 'increased', 0.15, ['physical']), m('wardGain', 'increased', 0.20), m('damageVs_bleed', 'flat', 0.04)),
    ],
  },

  // =========================================================================
  // INTELLIGENCE — Cryo-Execution (Hypothermia: Hard-CC & Poise-Break Execution)
  // =========================================================================
  {
    id: 'exp_p19_int_hypothermia_shatter', wedge: 'int', theme: 'cold', shape: 'fork', pass: 19,
    nodes: [
      n('entry', 'small', 'Deep-Freeze Fracture', '8% increased cold damage; 10% increased poise damage with cold skills.', m('damage', 'increased', 0.08, ['cold']), m('poiseDamage', 'increased', 0.10, ['cold'])),
      n('a', 'small', 'Brittle Joints', '+6% cold penetration; +10% chance to chill.', m('coldPen', 'flat', 0.06), m('apply_chill', 'flat', 0.10)),
      n('b', 'small', 'Frostbite Pressure', '12% increased sunder duration; 8% increased spell damage.', m('sunderDuration', 'increased', 0.12), m('damage', 'increased', 0.08, ['spell'])),
      n('', 'keystone', 'Cryo-Execution', 'Deal 60% more hit damage against Frozen, Stunned, or Poise-Broken enemies, and Cold hits deal 40% more Poise damage against Chilled foes; deal 12% less damage.', m('hypothermiaPower', 'flat', 0.60), m('damage', 'more', -0.12)),
      n('tailA', 'notable', 'Anami Hypothermia', '+30% additional Cryo-Execution more damage vs Frozen, Stunned, or Poise-Broken foes; 25% increased poise damage with cold skills.', m('hypothermiaPower', 'flat', 0.30), m('poiseDamage', 'increased', 0.25, ['cold'])),
      n('tailB', 'notable', 'Glacial Verdict', '+10% cold penetration; +25% sunder duration; +15% cold critical strike multiplier.', m('coldPen', 'flat', 0.10), m('sunderDuration', 'increased', 0.25), m('critMulti', 'flat', 0.15, ['cold'])),
    ],
  },

  // =========================================================================
  // WILLPOWER — Corrosive Dissolution (Poison Armor-Shredder)
  // =========================================================================
  {
    id: 'exp_p19_wil_acid_armor_melt', wedge: 'wil', theme: 'entropy', shape: 'fork', pass: 19,
    nodes: [
      n('entry', 'small', 'Caustic Bile', '+10% chance to inflict poison; 8% increased chaos damage.', m('apply_poison', 'flat', 0.10), m('damage', 'increased', 0.08, ['chaos'])),
      n('a', 'small', 'Etched Carapace', '+1 maximum stack for stackable ailments; +5% armor penetration.', m('ailmentStacks', 'flat', 1), m('armorPen', 'flat', 0.05)),
      n('b', 'small', 'Lingering Acid', '10% increased poison duration; 8% increased minion chaos damage.', m('effectDuration', 'increased', 0.10, ['chaos']), m('minionDamage', 'increased', 0.08, ['chaos'])),
      n('', 'notable', 'Corrosive Dissolution', 'Each active Poison stack on foes you poison (up to 15 stacks) shreds 4% of their Armor and strips 1.5% Chaos & Physical defense for you and your minions; +1 maximum stack for stackable ailments.', m('poisonMeltPower', 'flat', 0.04), m('ailmentStacks', 'flat', 1)),
      n('tailA', 'notable', 'Acidic Liquefaction', '+2.5% additional Armor & defense melt per Poison stack (up to 15); +12% poison chance.', m('poisonMeltPower', 'flat', 0.025), m('apply_poison', 'flat', 0.12)),
      n('tailB', 'notable', 'Venom-Soaked Breach', '+8% chaos penetration; +8% armor penetration; 15% increased ailment duration.', m('chaosPen', 'flat', 0.08), m('armorPen', 'flat', 0.08), m('effectDuration', 'increased', 0.15)),
    ],
  },

  // =========================================================================
  // WISDOM — Pylon Resonance (Nimiod Turret Resonance & Movement Overcharge)
  // =========================================================================
  {
    id: 'exp_p19_wis_turret_blink', wedge: 'wis', theme: 'devices', shape: 'fork', pass: 19,
    nodes: [
      n('entry', 'small', 'Harmonic Node', '10% increased construct cast rate; 8% increased minion action speed.', m('constructCastRate', 'increased', 0.10), m('minionHaste', 'increased', 0.08)),
      n('a', 'small', 'Pylon Conduit', '10% faster totem placement; +14 maximum mana.', m('totemPlaceTime', 'more', -0.10), m('mana', 'flat', 14)),
      n('b', 'small', 'Shared Telemetry', '10% increased minion damage; 10% increased construct area of effect.', m('minionDamage', 'increased', 0.10), m('aoeRadius', 'increased', 0.10, ['construct'])),
      n('', 'keystone', 'Pylon Resonance', 'Standing within 220px of your Constructs or Minions restores 3.5% max Mana & ES per sec and grants +15% Construct Cast Rate & Minion Haste; movement skills (3s ICD) overcharge all nearby Constructs & Minions in 135px Lightning+Chaos bursts; -10% max life.', m('pylonResonancePower', 'flat', 1.0), m('life', 'more', -0.10)),
      n('tailA', 'notable', 'Nimiod Overcharge', '+40% Pylon Resonance regen, haste, and overcharge burst damage; +1 maximum construct.', m('pylonResonancePower', 'flat', 0.40), m('constructMaxCount', 'flat', 1)),
      n('tailB', 'notable', 'Relay Tether-Grid', '15% increased movement skill cooldown recovery; 15% increased minion maximum life; 15% increased energy shield.', m('cooldownRecovery', 'increased', 0.15, ['movement']), m('minionLife', 'increased', 0.15), m('energyShield', 'increased', 0.15)),
    ],
  },

  // =========================================================================
  // CHARISMA — Power Extractor (Energy Extractor: Ultimate & Cooldown Blobs)
  // =========================================================================
  {
    id: 'exp_p19_cha_energy_extractor', wedge: 'cha', theme: 'chorus', shape: 'fork', pass: 19,
    nodes: [
      n('entry', 'small', 'Siphoned Core', '10% increased ultimate gauge gain; 6% increased cooldown recovery.', m('gaugeGain', 'increased', 0.10), m('cooldownRecovery', 'increased', 0.06)),
      n('a', 'small', 'Condensed Bio-Orb', '+14 maximum mana; 8% increased buff duration.', m('mana', 'flat', 14), m('effectDuration', 'increased', 0.08, ['buff'])),
      n('b', 'small', 'Accelerated Lockout', '12% shorter ultimate gauge lockout; 6% increased cast speed.', m('gaugeLockout', 'more', -0.12), m('castSpeed', 'increased', 0.06)),
      n('', 'keystone', 'Power Extractor', 'Slaying enemies—or every 6th hit vs rares/bosses (2s ICD)—drops collectable Power Blobs restoring 10% Mana, shaving 1.2s off active cooldowns, feeding +12% Ultimate gauge, and granting 4s Haste; skills cost 15% more mana.', m('energyExtractPower', 'flat', 1.0), m('manaCost', 'more', 0.15)),
      n('tailA', 'notable', 'Ascended Extractor', '+40% Power Extractor Mana, cooldown shave, and Ultimate gauge feed; 15% increased ultimate gauge gain.', m('energyExtractPower', 'flat', 0.40), m('gaugeGain', 'increased', 0.15)),
      n('tailB', 'notable', 'Perpetual Bloom-Loop', '15% less ultimate gauge required; 12% increased cooldown recovery; 10% increased movement speed.', m('gaugeNeed', 'more', -0.15), m('cooldownRecovery', 'increased', 0.12), m('moveSpeed', 'increased', 0.10)),
    ],
  },
];
