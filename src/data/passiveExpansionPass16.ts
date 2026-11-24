// ---------------------------------------------------------------------------
// PASS 16 — Wolcen Gate of Fates: Stances, Thresholds & Quivers
// (9 wheels, 54 nodes, 7 Keystones — 1 wheel per attribute wedge)
//
// Adapts iconic untapped Wolcen: Lords of Mayhem Gate of Fates outer-ring
// major notables to Hollow Wake's composable engine:
//   - Arms Maester: Virtuose Stance (movement-toggled dual stance) &
//                   Pugilist's Cadence (4th-hit tag-specialized finisher)
//   - Siegebreaker: Salvatory Counter (block/parry weapon counter-strike)
//   - Exorcist:     Blessed Silver (5-round Projectile/Melee inverse quiver)
//   - Duskglaive:   Waltzing Smoke (movement Phantom Veil ambush strike)
//   - Oracle of the Trinity: Elementary Destabilization (<35% Mana cataclysm)
//   - Abyssal Shaper: Occult Escalation (per-total-ailment-stack scaling)
//   - Plaguebringer: Undertaker's Harvest (collectable necrotic Bile Globes)
//   - Eos:          Beacon for the Lost (split ES/Ward Spell vs Attack polarity)
// ---------------------------------------------------------------------------

import { gaugeMod as g, mod as m } from '../engine/stats';
import { n, type ExpansionCluster } from './passiveExpansionBase';

export const PASS16_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // STRENGTH — Virtuose Stance (Arms Maester: Movement-Toggled Dual Stance)
  // =========================================================================
  {
    id: 'exp_p16_str_virtuose_stance', wedge: 'str', theme: 'impact', shape: 'fork', pass: 16,
    nodes: [
      n('entry', 'small', 'Shifting Footwork', '8% increased physical damage; 5% increased movement speed.', m('damage', 'increased', 0.08, ['physical']), m('moveSpeed', 'increased', 0.05)),
      n('a', 'small', 'Probing Lunge', '+4% armor penetration; +3% chance to deal double damage.', m('armorPen', 'flat', 0.04), m('doubleDamageChance', 'flat', 0.03)),
      n('b', 'small', 'Stalwart Brace', '+3% block chance; 10% increased guard strength.', m('blockChance', 'flat', 0.03), m('guardStrength', 'increased', 0.10)),
      n('', 'keystone', 'Virtuose Stance', 'Using a movement skill (0.5s ICD) toggles between Probing Weakness (+16% double damage chance, +12% penetration, -8% all resistances) and Stalwart Resolve (+14% block chance, +24% guard strength, +18% poise, -10% attack/cast speed).', m('virtuoseStance', 'flat', 1.0)),
      n('tailA', 'notable', 'Probing Mastery', '+35% Virtuose Stance power; +6% armor penetration; +15% critical strike multiplier.', m('virtuoseStance', 'flat', 0.35), m('armorPen', 'flat', 0.06), m('critMulti', 'flat', 0.15)),
      n('tailB', 'notable', 'Stalwart Footing', '+30% Virtuose Stance power; +5% block chance; 15% increased movement skill cooldown recovery.', m('virtuoseStance', 'flat', 0.30), m('blockChance', 'flat', 0.05), m('cooldownRecovery', 'increased', 0.15, ['movement'])),
    ],
  },

  // =========================================================================
  // PROWESS — Pugilist's Cadence (Arms Maester: 4th-Hit Tag Finisher)
  // =========================================================================
  {
    id: 'exp_p16_prw_pugilist_cadence', wedge: 'prw', theme: 'tempo', shape: 'fork', pass: 16,
    nodes: [
      n('entry', 'small', 'Four-Beat Rhythm', '6% increased attack speed; 6% increased melee and projectile damage.', m('attackSpeed', 'increased', 0.06), m('damage', 'increased', 0.06, ['melee']), m('damage', 'increased', 0.06, ['projectile'])),
      n('a', 'small', 'Measured Jab', '3% increased attack speed per Pugilist Cadence count (up to 3).', g('attackSpeed', 'increased', 0.03, 'cadence')),
      n('b', 'small', 'Heavy Knuckle', '+3% critical strike chance per Pugilist Cadence count; 8% increased poise damage.', g('critChance', 'flat', 0.03, 'cadence'), m('poiseDamage', 'increased', 0.08)),
      n('', 'notable', 'Pugilist\'s Cadence', 'Every 4th landed hit (0.15s ICD) deals 25% more damage and triggers a finisher: Melee unleashes a concussive shockwave & poise crush; Projectiles splinter shards to 3 foes; Spells burst an arcane nova and restore 6% Mana.', m('cadenceFinisher', 'flat', 1.0)),
      n('tailA', 'notable', 'Haymaker Finale', '+40% Pugilist\'s Cadence finisher power (the 4th hit always critically strikes); 20% increased poise damage.', m('cadenceFinisher', 'flat', 0.40), m('poiseDamage', 'increased', 0.20)),
      n('tailB', 'notable', 'Relentless Four-Count', '4% increased movement speed and +8% critical strike multiplier per Pugilist Cadence count; 8% increased attack and cast speed.', g('moveSpeed', 'increased', 0.04, 'cadence'), g('critMulti', 'flat', 0.08, 'cadence'), m('attackSpeed', 'increased', 0.08), m('castSpeed', 'increased', 0.08)),
    ],
  },

  // =========================================================================
  // FORTITUDE — Salvatory Counter (Siegebreaker: Weapon-Scaled Block Riposte)
  // =========================================================================
  {
    id: 'exp_p16_for_salvatory_counter', wedge: 'for', theme: 'bastion', shape: 'fork', pass: 16,
    nodes: [
      n('entry', 'small', 'Anchored Shield', '+4% block chance; +14 flat block value.', m('blockChance', 'flat', 0.04), m('blockValue', 'flat', 14)),
      n('a', 'small', 'Counter-Grip', '10% increased guard strength; 8% increased melee physical damage.', m('guardStrength', 'increased', 0.10), m('damage', 'increased', 0.08, ['melee', 'physical'])),
      n('b', 'small', 'Enduring Brace', '+14 maximum endurance; +8% chance to bleed.', m('endurance', 'flat', 14), m('apply_bleed', 'flat', 0.08)),
      n('', 'keystone', 'Salvatory Counter', 'Blocking or parrying (0.5s ICD) immediately delivers a weapon-scaled physical counter-strike to the attacker (can crit, inflicts Bleed, restores 10% max Endurance or Ward); 12% less attack speed.', m('salvatoryCounter', 'flat', 1.0), m('attackSpeed', 'more', -0.12)),
      n('tailA', 'notable', 'Iron Riposte Edge', '+40% Salvatory Counter strike power; +25% critical strike multiplier with melee skills; +4% block chance.', m('salvatoryCounter', 'flat', 0.40), m('critMulti', 'flat', 0.25, ['melee']), m('blockChance', 'flat', 0.04)),
      n('tailB', 'notable', 'Planted Bulwark', '+45 flat block value and 25% increased guard strength while stationary; +25 maximum endurance.', m('blockValue', 'flat', 45, undefined, 'stationary'), m('guardStrength', 'increased', 0.25, undefined, 'stationary'), m('endurance', 'flat', 25)),
    ],
  },

  // =========================================================================
  // DEXTERITY — Blessed Silver (Exorcist: 5-Round Projectile/Melee Quiver)
  // =========================================================================
  {
    id: 'exp_p16_dex_blessed_silver', wedge: 'dex', theme: 'ranged', shape: 'fork', pass: 16,
    nodes: [
      n('entry', 'small', 'Silver-Tipped Bolt', '8% increased projectile damage; 8% increased melee damage.', m('damage', 'increased', 0.08, ['projectile']), m('damage', 'increased', 0.08, ['melee'])),
      n('a', 'small', 'Silver-Loaded Belt', '2% increased projectile speed and +2% critical strike chance per loaded Anointed Silver round.', g('projectileSpeed', 'increased', 0.02, 'silverAmmo'), g('critChance', 'flat', 0.02, 'silverAmmo')),
      n('b', 'small', 'Close-In Draw', '6% increased attack speed; 5% increased movement speed.', m('attackSpeed', 'increased', 0.06), m('moveSpeed', 'increased', 0.05)),
      n('', 'keystone', 'Blessed Silver', 'Hold 5 Anointed Silver rounds (reload +1 every 2s or full reload on any movement skill; projectile casts spend 1): deal 8% more Projectile damage per loaded round and 8% more Melee damage per spent round; -10% evasion.', m('silverQuiverPower', 'flat', 0.08), m('evasion', 'increased', -0.10)),
      n('tailA', 'notable', 'Anointed Chamber', '+4% additional Blessed Silver scaling per loaded/spent round; 15% increased movement skill cooldown recovery.', m('silverQuiverPower', 'flat', 0.04), m('cooldownRecovery', 'increased', 0.15, ['movement'])),
      n('tailB', 'notable', 'Exorcist\'s Switching', '4% increased attack speed per loaded Anointed Silver round; +12% armor and +15% melee critical strike multiplier.', g('attackSpeed', 'increased', 0.04, 'silverAmmo'), m('armor', 'increased', 0.12), m('critMulti', 'flat', 0.15, ['melee'])),
    ],
  },

  // =========================================================================
  // FINESSE — Waltzing Smoke (Duskglaive: Movement Phantom Veil Ambush)
  // =========================================================================
  {
    id: 'exp_p16_fin_waltzing_smoke', wedge: 'fin', theme: 'guile', shape: 'fork', pass: 16,
    nodes: [
      n('entry', 'small', 'Cinder-Veil Step', '6% increased movement speed; 10% increased evasion.', m('moveSpeed', 'increased', 0.06), m('evasion', 'increased', 0.10)),
      n('a', 'small', 'Soot-Stained Edge', '+10% critical strike multiplier; +8% chance to bleed and poison.', m('critMulti', 'flat', 0.10), m('apply_bleed', 'flat', 0.08), m('apply_poison', 'flat', 0.08)),
      n('b', 'small', 'Smoke-Slip Step', '10% increased movement skill cooldown recovery; +4% graze chance.', m('cooldownRecovery', 'increased', 0.10, ['movement']), m('grazeChance', 'flat', 0.04)),
      n('', 'keystone', 'Waltzing Smoke', 'Using a movement skill (4s ICD) cloaks you in 2.5s of Phantom Invisibility (+20% movement speed). Your next hit breaks the veil for 45% more damage, guaranteed critical strike, and guaranteed Bleed and Poison; 12% less armor.', m('smokeVeilPower', 'flat', 0.45), m('armor', 'more', -0.12)),
      n('tailA', 'notable', 'Ash-Cut Ambush', '+22% additional Waltzing Smoke veil-breaking damage; +20% critical strike multiplier.', m('smokeVeilPower', 'flat', 0.22), m('critMulti', 'flat', 0.20)),
      n('tailB', 'notable', 'Ghost-Dance Cadence', '18% increased movement skill cooldown recovery; 15% increased ailment magnitude; +0.6s "Recently" window.', m('cooldownRecovery', 'increased', 0.18, ['movement']), m('statusMagnitude', 'increased', 0.15), m('recentlyWindow', 'flat', 0.6)),
    ],
  },

  // =========================================================================
  // INTELLIGENCE — Elementary Destabilization (Oracle of the Trinity: <35% Mana Blast)
  // =========================================================================
  {
    id: 'exp_p16_int_elem_destabilization', wedge: 'int', theme: 'arcana', shape: 'fork', pass: 16,
    nodes: [
      n('entry', 'small', 'Triune Instability', '+14 maximum mana; 8% increased elemental spell damage.', m('mana', 'flat', 14), m('damage', 'increased', 0.08, ['fire']), m('damage', 'increased', 0.08, ['cold']), m('damage', 'increased', 0.08, ['lightning'])),
      n('a', 'small', 'Thinning Reserves', '4% increased spell damage per 10% missing mana.', g('damage', 'increased', 0.04, 'mana:missing', ['spell'])),
      n('b', 'small', 'Tri-Elemental Strain', '10% increased area of effect; +12 maximum energy shield.', m('aoeRadius', 'increased', 0.10), m('energyShield', 'flat', 12)),
      n('', 'keystone', 'Elementary Destabilization', 'Casting while at or below 35% Mana (3.5s ICD) unleashes a Fire, Cold, and Lightning cataclysm scaled by your Maximum Life and Energy Shield, inflicting Burn, Chill, and Shock, and rebounding 18% max Mana; skills cost 15% more mana.', m('elemDestabPower', 'flat', 1.0), m('manaCost', 'more', 0.15)),
      n('tailA', 'notable', 'Unstable Trinity', '+40% Elementary Destabilization blast power; 16% increased area of effect; +5% fire, cold, and lightning penetration.', m('elemDestabPower', 'flat', 0.40), m('aoeRadius', 'increased', 0.16), m('firePen', 'flat', 0.05), m('coldPen', 'flat', 0.05), m('lightningPen', 'flat', 0.05)),
      n('tailB', 'notable', 'Deep-Well Rebound', '+22 maximum energy shield; +22 maximum life; 3% increased cast speed per 10% missing mana.', m('energyShield', 'flat', 22), m('life', 'flat', 22), g('castSpeed', 'increased', 0.03, 'mana:missing')),
    ],
  },

  // =========================================================================
  // WILLPOWER — Occult Escalation (Abyssal Shaper: Per-Total-Ailment-Stack Scaling)
  // =========================================================================
  {
    id: 'exp_p16_wil_occult_escalation', wedge: 'wil', theme: 'entropy', shape: 'fork', pass: 16,
    nodes: [
      n('entry', 'small', 'Deepened Taint', '+10% status ailment chance; 8% increased chaos damage.', m('statusChance', 'flat', 0.10), m('damage', 'increased', 0.08, ['chaos'])),
      n('a', 'small', 'Festering Depth', '+1 maximum stack for stackable ailments; 8% increased ailment duration.', m('ailmentStacks', 'flat', 1), m('effectDuration', 'increased', 0.08)),
      n('b', 'small', 'Accursed Weight', '10% increased ailment magnitude; +5% chaos penetration.', m('statusMagnitude', 'increased', 0.10), m('chaosPen', 'flat', 0.05)),
      n('', 'notable', 'Occult Escalation', 'Deal 2.2% more hit damage (and 1.3% more DoT damage) per total active ailment stack on the victim, up to 20 stacks; +1 maximum stack for stackable ailments.', m('occultStackMore', 'flat', 0.022), m('ailmentStacks', 'flat', 1)),
      n('tailA', 'notable', 'Abyssal Saturation', '+1.4% additional Occult Escalation per ailment stack (up to 20); +1 maximum stack for stackable ailments.', m('occultStackMore', 'flat', 0.014), m('ailmentStacks', 'flat', 1)),
      n('tailB', 'notable', 'Hex-Bound Virulence', '18% increased ailment magnitude; +14% chance to inflict jinxed; +6% chaos penetration.', m('statusMagnitude', 'increased', 0.18), m('apply_jinxed', 'flat', 0.14), m('chaosPen', 'flat', 0.06)),
    ],
  },

  // =========================================================================
  // WISDOM — Undertaker's Harvest (Plaguebringer: Collectable Bile Globes)
  // =========================================================================
  {
    id: 'exp_p16_wis_undertaker_harvest', wedge: 'wis', theme: 'host', shape: 'fork', pass: 16,
    nodes: [
      n('entry', 'small', 'Mortuary Tithe', '8% increased minion damage; 8% increased chaos damage.', m('minionDamage', 'increased', 0.08), m('damage', 'increased', 0.08, ['chaos'])),
      n('a', 'small', 'Bile Siphon', '3% increased minion damage and +2% movement speed per Undertaker Harvest stack.', g('minionDamage', 'increased', 0.03, 'harvest'), g('moveSpeed', 'increased', 0.02, 'harvest')),
      n('b', 'small', 'Grave-Reaper Pace', '8% increased minion movement speed; +12 maximum life.', m('minionMoveSpeed', 'increased', 0.08), m('life', 'flat', 12)),
      n('', 'keystone', 'Undertaker\'s Harvest', 'Fallen enemies, dying minions, and every 5th hit vs rares/bosses drop necrotic Bile Globes. You or your minions collect them to heal 4% life & 3% mana and stack Harvest (0–8, 10s) for 6% more damage per stack; 15% less life regeneration.', m('undertakerPower', 'flat', 0.06), m('lifeRegen', 'more', -0.15)),
      n('tailA', 'notable', 'Bloated Chalices', '+4% additional Undertaker\'s Harvest more damage per stack; 15% increased minion maximum life.', m('undertakerPower', 'flat', 0.04), m('minionLife', 'increased', 0.15)),
      n('tailB', 'notable', 'Scavenger Flock', 'Minions gain 15% increased movement speed and 4% increased action speed per Undertaker Harvest stack; +10% healing received.', m('minionMoveSpeed', 'increased', 0.15), g('minionHaste', 'increased', 0.04, 'harvest'), m('healTaken', 'increased', 0.10)),
    ],
  },

  // =========================================================================
  // CHARISMA — Beacon for the Lost (Eos: Split-Pool ES/Ward Polarity)
  // =========================================================================
  {
    id: 'exp_p16_cha_beacon_lost', wedge: 'cha', theme: 'arcana', shape: 'fork', pass: 16,
    nodes: [
      n('entry', 'small', 'Twin-Lit Lantern', '+14 maximum energy shield; 6% increased attack and spell damage.', m('energyShield', 'flat', 14), m('damage', 'increased', 0.06, ['attack']), m('damage', 'increased', 0.06, ['spell'])),
      n('a', 'small', 'High-Crest Radiance', '10% increased healing power; 10% increased ward gained.', m('healPower', 'increased', 0.10), m('wardGain', 'increased', 0.10)),
      n('b', 'small', 'Ember Reclaim', '+1.5% of attack damage leeched as energy shield; 6% increased attack speed.', m('esLeech', 'flat', 0.015, ['attack']), m('attackSpeed', 'increased', 0.06)),
      n('', 'keystone', 'Beacon for the Lost', 'At >=50% Energy Shield or while holding Ward, Spells & Songs deal 32% more damage with bonus Healing Power and Area. Below 50% ES without Ward, Attacks deal 32% more damage with +25% Attack Speed and +3% ES Leech; 15% less maximum life.', m('beaconPolarity', 'flat', 0.32), m('life', 'more', -0.15)),
      n('tailA', 'notable', 'Lantern of Eos', '+16% additional Beacon for the Lost polarity damage; +25 maximum energy shield; 15% increased energy shield recharge rate.', m('beaconPolarity', 'flat', 0.16), m('energyShield', 'flat', 25), m('esRechargeRate', 'increased', 0.15)),
      n('tailB', 'notable', 'Twilight Reclamation', '+2% of hit damage leeched as energy shield; 15% increased ward gained; 12% increased cast and attack speed.', m('esLeech', 'flat', 0.02), m('wardGain', 'increased', 0.15), m('castSpeed', 'increased', 0.12), m('attackSpeed', 'increased', 0.12)),
    ],
  },
];
