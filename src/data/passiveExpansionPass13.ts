// ---------------------------------------------------------------------------
// PASS 13 — The Astrolabe Engines (9 wheels, 56 nodes, 7 Keystones)
//
// Inspired by Wolcen: Lords of Mayhem's Gate of Fates inner & middle engines
// (pure material supremacy, block-chance-to-damage tyranny, high-resource
// surplus scaling, multi-projectile trade-offs & universal pierce falloff,
// reactive post-hit evasion surge + ruthless crit specialization, full-ES
// bastion mitigation, simultaneous dual-ailment doctrine, afflicted-kill
// Undying Offering scaling, and overheal-to-Ward Solar Smite) — translated
// into original Hollow Wake dark-fantasy identity with zero 1:1 lifts.
// ---------------------------------------------------------------------------

import { gaugeGateMod as gate, gaugeMod as g, mod as m } from '../engine/stats';
import { n, procNode, type ExpansionCluster } from './passiveExpansionBase';

export const PASS13_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // STRENGTH — Oath of Bare Iron (Pure Material Lock & Physical Supremacy)
  // =========================================================================
  {
    id: 'exp_p13_str_mortal_steel', wedge: 'str', theme: 'impact', shape: 'fork', pass: 13,
    nodes: [
      n('entry', 'small', 'Unadorned Iron', '8% increased physical damage; +5% armor penetration.', m('damage', 'increased', 0.08, ['physical']), m('armorPen', 'flat', 0.05)),
      n('a', 'small', 'Cold-Forged Temper', '10% increased physical damage with attacks; 8% increased bleed magnitude.', m('damage', 'increased', 0.10, ['physical', 'attack']), m('statusMagnitude', 'increased', 0.08, ['physical'])),
      n('b', 'small', 'Shattered Wards', '6% increased armor; +10% chance to inflict bleed on melee hits.', m('armor', 'increased', 0.06), m('apply_bleed', 'flat', 0.10, ['melee'])),
      n('', 'keystone', 'Oath of Bare Iron', '32% more physical hit damage; you deal NO fire, cold, lightning, or chaos hit damage.', m('materialOnlyMore', 'flat', 0.32)),
      n('tailA', 'notable', 'Quenched Edge', '+12% additional pure material physical damage; +18% critical strike multiplier with physical hits; 10% increased armor.', m('materialOnlyMore', 'flat', 0.12), m('critMulti', 'flat', 0.18, ['physical']), m('armor', 'increased', 0.10)),
      n('tailB', 'notable', 'Rusted Silence', '+10% additional pure material physical damage; +18% chance to inflict bleed; 15% increased bleed duration.', m('materialOnlyMore', 'flat', 0.10), m('apply_bleed', 'flat', 0.18), m('effectDuration', 'increased', 0.15, ['physical'])),
    ],
  },

  // =========================================================================
  // FORTITUDE — Aegis of Tyranny (Block-Chance-to-Damage & Weapon Parry)
  // =========================================================================
  {
    id: 'exp_p13_for_bulwark_reckoning', wedge: 'for', theme: 'bastion', shape: 'fork', pass: 13,
    nodes: [
      n('entry', 'small', 'Buckler Stance', '+3% block chance; 8% increased armor.', m('blockChance', 'flat', 0.03), m('armor', 'increased', 0.08)),
      n('a', 'small', 'Iron Deflection', '+4% block chance; 8% increased guard strength.', m('blockChance', 'flat', 0.04), m('guardStrength', 'increased', 0.08)),
      n('b', 'small', 'Counter-Weight', '8% increased melee damage; 8% increased guard strength.', m('damage', 'increased', 0.08, ['melee']), m('guardStrength', 'increased', 0.08)),
      n('', 'keystone', 'Aegis of Tyranny', 'Gain MORE hit damage equal to 45% of your Block Chance; 20% less attack and cast speed.', m('blockToDamage', 'flat', 0.45), m('attackSpeed', 'more', -0.20), m('castSpeed', 'more', -0.20)),
      n('tailA', 'notable', 'Unshielded Parry', '+12% flat block chance (works with any weapon); 12% increased guard strength.', m('blockChance', 'flat', 0.12), m('guardStrength', 'increased', 0.12)),
      n('tailB', 'notable', 'Spiked Pavise', '+18% additional Block-Chance-to-Damage ratio; blocking restores 4 (+0.6 per level) life.', m('blockToDamage', 'flat', 0.18), m('lifeOnBlock', 'flat', 4), g('lifeOnBlock', 'flat', 0.6, 'level')),
    ],
  },

  // =========================================================================
  // PROWESS — Brimming Frenzy (High-Mana Surplus Scaling)
  // =========================================================================
  {
    id: 'exp_p13_prw_surplus_frenzy', wedge: 'prw', theme: 'tempo', shape: 'tiered', pass: 13,
    nodes: [
      n('entry', 'small', 'Brimming Vessel', '+12 maximum mana; 8% increased mana regeneration.', m('mana', 'flat', 12), m('manaRegen', 'increased', 0.08)),
      n('a1', 'small', 'Poised Reserve', '1.5% increased damage per 10% remaining mana.', g('damage', 'increased', 0.015, 'mana:full')),
      n('b1', 'small', 'Fluid Tempo', '1% increased attack and cast speed per 10% remaining mana.', g('attackSpeed', 'increased', 0.01, 'mana:full'), g('castSpeed', 'increased', 0.01, 'mana:full')),
      n('mid', 'notable', 'Full-Tide Ferocity', '2% increased damage and 1.2% increased attack and cast speed per 10% remaining mana; +18 maximum mana.', g('damage', 'increased', 0.02, 'mana:full'), g('attackSpeed', 'increased', 0.012, 'mana:full'), g('castSpeed', 'increased', 0.012, 'mana:full'), m('mana', 'flat', 18)),
      n('a2', 'small', 'Full Reservoir', '10% increased mana regeneration; 6% less mana cost while at or above 70% mana.', m('manaRegen', 'increased', 0.10), gate('manaCost', 'more', -0.06, 'mana:full', 7)),
      n('b2', 'small', 'Overspilling Edge', '+3% critical strike chance while at or above 80% mana.', gate('critChance', 'flat', 0.03, 'mana:full', 8)),
      n('', 'keystone', 'Brimming Frenzy', 'Deal 28% more hit damage while at or above 75% mana; deal 18% less hit damage while below 50% mana.', m('surplusHitMore', 'flat', 0.28), m('lowManaHitLess', 'flat', 0.18)),
    ],
  },

  // =========================================================================
  // DEXTERITY — Volley Covenant & Universal Pierce Falloff
  // =========================================================================
  {
    id: 'exp_p13_dex_unerring_salvo', wedge: 'dex', theme: 'ranged', shape: 'fork', pass: 13,
    nodes: [
      n('entry', 'small', 'Fletched Fan', '8% increased projectile damage; 6% increased projectile speed.', m('damage', 'increased', 0.08, ['projectile']), m('projectileSpeed', 'increased', 0.06)),
      n('a', 'small', 'Draw-String Cadence', '6% increased attack speed with projectiles; +1 projectile pierce.', m('attackSpeed', 'increased', 0.06, ['projectile']), m('pierceCount', 'flat', 1)),
      n('b', 'small', 'Tight Quiver', '10% increased projectile speed; +30 accuracy.', m('projectileSpeed', 'increased', 0.10), m('accuracy', 'flat', 30)),
      n('', 'keystone', 'Volley Covenant', 'Fire +2 additional projectiles; projectiles deal 22% less hit damage; 10% increased projectile speed.', m('projectileCount', 'flat', 2), m('damage', 'more', -0.22, ['projectile']), m('projectileSpeed', 'increased', 0.10)),
      n('tailA', 'notable', 'Through-and-Through', 'Projectiles pierce +8 additional targets and deal 16% increased damage, but lose 12% hit damage per enemy pierced (floored at 35%).', m('pierceCount', 'flat', 8), m('damage', 'increased', 0.16, ['projectile']), m('pierceDecay', 'flat', 0.12)),
      n('tailB', 'notable', 'Deadeye Horizon', 'Up to 22% more hit damage at long range; 15% increased projectile speed.', m('farShotDamage', 'flat', 0.22), m('projectileSpeed', 'increased', 0.15)),
    ],
  },

  // =========================================================================
  // FINESSE — Wraith's Reflex (Post-Hit Slipstream Surge & Ruthless Crits)
  // =========================================================================
  {
    id: 'exp_p13_fin_phantom_reflex', wedge: 'fin', theme: 'guile', shape: 'fork', pass: 13,
    nodes: [
      n('entry', 'small', 'Nimble Recovery', '8% increased evasion; 4% increased movement speed.', m('evasion', 'increased', 0.08), m('moveSpeed', 'increased', 0.04)),
      n('a', 'small', 'Feint & Fade', '10% increased evasion; +8% critical strike multiplier.', m('evasion', 'increased', 0.10), m('critMulti', 'flat', 0.08)),
      n('b', 'small', 'Slippery Footing', '6% increased evasion; 8% increased movement speed after taking a hit.', m('evasion', 'increased', 0.06), m('moveSpeed', 'increased', 0.08, undefined, 'recentlyHurt')),
      n('', 'keystone', 'Wraith\'s Reflex', 'Taking hit damage triggers 3s of Slipstream (+60% more evasion and evading the next attack within 1.5s, 4s ICD); 20% less armor and maximum energy shield.', m('evadeSurgeOnHurt', 'flat', 0.60), m('armor', 'more', -0.20), m('energyShield', 'more', -0.20)),
      n('tailA', 'notable', 'Merciless Execution', '+38% critical strike multiplier; non-critical hits deal 14% less damage.', m('critMulti', 'flat', 0.38), m('nonCritLess', 'flat', 0.14)),
      procNode('tailB', 'notable', 'ghost_riposte', 'Ghost-Step Riposte', 'Evading an attack grants +25% critical strike chance for 2.5 seconds (2s ICD); +15% additional Slipstream evasion surge.', '#b8bd83', {
        trigger: 'evade', icd: 2,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_ghost_riposte', duration: 2.5, mods: [m('critChance', 'flat', 0.25)] } },
      }, m('evadeSurgeOnHurt', 'flat', 0.15)),
    ],
  },

  // =========================================================================
  // INTELLIGENCE — Crystalline Bastion (Full-ES Fortress DR)
  // =========================================================================
  {
    id: 'exp_p13_int_purified_shell', wedge: 'int', theme: 'arcana', shape: 'fork', pass: 13,
    nodes: [
      n('entry', 'small', 'Tempered Ward-Glass', '+16 maximum energy shield; 8% increased energy shield recharge rate.', m('energyShield', 'flat', 16), m('esRechargeRate', 'increased', 0.08)),
      n('a', 'small', 'Pristine Mantle', '10% increased maximum energy shield; 8% faster start of energy shield recharge.', m('energyShield', 'increased', 0.10), m('esRechargeDelay', 'more', -0.08)),
      n('b', 'small', 'Sanctified Sheen', '+14 maximum energy shield; 6% increased spell damage while energy shield is active.', m('energyShield', 'flat', 14), gate('damage', 'increased', 0.06, 'es:full', 1, ['spell'])),
      n('', 'keystone', 'Crystalline Bastion', 'While your Energy Shield is at or above 75% of maximum, take 22% less hit damage; Energy Shield recharge delay is 30% slower.', m('fullEsDR', 'flat', 0.22), m('esRechargeDelay', 'increased', 0.30)),
      n('tailA', 'notable', 'Anchored Aegis', '+8% additional high-ES hit damage reduction; 12% increased maximum energy shield; 12% increased armor.', m('fullEsDR', 'flat', 0.08), m('energyShield', 'increased', 0.12), m('armor', 'increased', 0.12)),
      n('tailB', 'notable', 'Radiant Capacitor', 'While Energy Shield is at or above 80% of maximum, gain 18% increased cast speed and 16% increased spell damage.', gate('castSpeed', 'increased', 0.18, 'es:full', 8), gate('damage', 'increased', 0.16, 'es:full', 8, ['spell'])),
    ],
  },

  // =========================================================================
  // WILLPOWER — Twin-Blight Doctrine (Simultaneous Dual Ailments & Cap)
  // =========================================================================
  {
    id: 'exp_p13_wil_grievous_blight', wedge: 'wil', theme: 'entropy', shape: 'fork', pass: 13,
    nodes: [
      n('entry', 'small', 'Compound Malady', '+6% ailment chance; 8% increased ailment magnitude.', m('statusChance', 'flat', 0.06), m('statusMagnitude', 'increased', 0.08)),
      n('a', 'small', 'Festering Grain', '10% increased skill effect duration; +5% ailment chance.', m('effectDuration', 'increased', 0.10), m('statusChance', 'flat', 0.05)),
      n('b', 'small', 'Layered Scourge', '10% increased ailment magnitude; +8 maximum insight.', m('statusMagnitude', 'increased', 0.10), m('insight', 'flat', 8)),
      n('', 'keystone', 'Twin-Blight Doctrine', 'Applying an ailment inflicts a second distinct ailment simultaneously (0.3s per-target ICD) and raises stackable ailment caps by +2; 22% less direct hit damage.', m('dualAilmentApply', 'flat', 1)),
      n('tailA', 'notable', 'Creeping Saturation', '14% increased ailment magnitude; 12% increased skill effect duration; +10% chance to inflict poison and burn.', m('statusMagnitude', 'increased', 0.14), m('effectDuration', 'increased', 0.12), m('apply_poison', 'flat', 0.10), m('apply_burn', 'flat', 0.10)),
      n('tailB', 'notable', 'Terminal Virulence', 'Enemies carrying 3 or more distinct active ailments take 18% more damage over time; +8% ailment chance.', m('ailmentMultiDot', 'flat', 0.18), m('statusChance', 'flat', 0.08)),
    ],
  },

  // =========================================================================
  // WISDOM — Undying Offering (Afflicted-Kill Stacking Owner & Minion Power)
  // =========================================================================
  {
    id: 'exp_p13_wis_immortal_offering', wedge: 'wis', theme: 'host', shape: 'tiered', pass: 13,
    nodes: [
      n('entry', 'small', 'Tithe of the Afflicted', '8% increased minion damage; +5% ailment chance.', m('minionDamage', 'increased', 0.08), m('statusChance', 'flat', 0.05)),
      n('a1', 'small', 'Blight-Reaper', 'Minions inherit 12% of your ailment and critical bonuses; 6% increased chaos damage.', m('minionInheritStatus', 'flat', 0.12), m('damage', 'increased', 0.06, ['chaos'])),
      n('b1', 'small', 'Censer-Smoke', '8% increased minion maximum life; 8% increased skill effect duration.', m('minionLife', 'increased', 0.08), m('effectDuration', 'increased', 0.08)),
      n('mid', 'notable', 'Undying Offering', 'Slaying an afflicted enemy (or every 3rd hit vs afflicted elites/bosses) banks an Offering stack (up to 12, 8s duration), granting 2% more damage per stack to you and your minions.', m('offeringPower', 'flat', 0.02)),
      n('a2', 'small', 'Tallow Tribute', '1.5% increased cast speed and 1.5% increased minion movement speed per Offering stack.', g('castSpeed', 'increased', 0.015, 'offering'), g('minionMoveSpeed', 'increased', 0.015, 'offering')),
      n('b2', 'small', 'Incense of Rot', '+1.5% fire, cold, lightning, and chaos resistance per Offering stack.', g('fireRes', 'flat', 0.015, 'offering'), g('coldRes', 'flat', 0.015, 'offering'), g('lightningRes', 'flat', 0.015, 'offering'), g('chaosRes', 'flat', 0.015, 'offering')),
      n('', 'notable', 'Sovereign Ossuary', '+1.5% additional more damage per Offering stack for you and your minions; 2% of minion hit damage leeches life to you.', m('offeringPower', 'flat', 0.015), m('minionLeechToOwner', 'flat', 0.02)),
    ],
  },

  // =========================================================================
  // CHARISMA — Covenant of Dawn (Overheal-to-Ward & Solar Ward Smite)
  // =========================================================================
  {
    id: 'exp_p13_cha_sacred_oath', wedge: 'cha', theme: 'life', shape: 'fork', pass: 13,
    nodes: [
      n('entry', 'small', 'Vow of Dawn', '8% increased healing power; 8% increased ward gained.', m('healPower', 'increased', 0.08), m('wardGain', 'increased', 0.08)),
      n('a', 'small', 'Sun-Spun Salve', '10% increased life regeneration; 10% increased fire damage.', m('lifeRegen', 'increased', 0.10), m('damage', 'increased', 0.10, ['fire'])),
      n('b', 'small', 'Gilded Chalice', '8% increased flask restoration; 8% increased song effect duration.', m('restorePower', 'increased', 0.08, ['flask']), m('effectDuration', 'increased', 0.08, ['song'])),
      n('', 'keystone', 'Covenant of Dawn', '50% of excess healing past full life converts into Ward, and hits add 12% of current Ward as flat fire damage (level-capped); 15% less maximum life.', m('overhealToWard', 'flat', 0.50), m('life', 'more', -0.15)),
      n('tailA', 'notable', 'Radiant Overflow', '+20% additional overheal-to-Ward conversion; 12% slower Ward decay.', m('overhealToWard', 'flat', 0.20), m('wardDecay', 'more', -0.12)),
      procNode('tailB', 'notable', 'dawnbreaker_hymn', 'Dawnbreaker Hymn', 'Casting a song grants 16% increased fire and lightning damage for 5 seconds (4s ICD); 10% increased ward gained.', '#dca07a', {
        trigger: 'cast', tags: ['song'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_dawnbreaker_hymn', duration: 5, mods: [m('damage', 'increased', 0.16, ['fire']), m('damage', 'increased', 0.16, ['lightning'])] } },
      }, m('wardGain', 'increased', 0.10)),
    ],
  },
];
