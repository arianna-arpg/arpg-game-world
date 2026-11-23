// ---------------------------------------------------------------------------
// PASSIVE EXPANSION — PASS 4: TAG-DRIVEN AFTER-CAST RHYTHM CONDITIONALS
// 27 wheels (3 per wedge, 126 nodes, 4 keystones, 27 cast-buff procs)
// harnessing Hollow Wake's skill-tag grammar ("For X seconds after using a
// [warcry/attack/fissure/guard/flask/melee/movement/throw/aoe/projectile/
// totem/trap/munition/reload/javelin/spell/channel/storm/curse/corpse/
// duration/summon/companion/throng/song/aura/heal] skill...").
// ---------------------------------------------------------------------------

import { gaugeMod as g, mod as m } from '../engine/stats';
import { n, procNode, type ExpansionCluster } from './passiveExpansionBase';

export const PASS4_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // STRENGTH — PASS 4 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p4_str_after_warcry', wedge: 'str', theme: 'chorus', shape: 'fork', pass: 4,
    nodes: [
      n('entry', 'small', 'Loud Challenge', '12% increased warcry area of effect; 8% increased warcry cooldown recovery.', m('aoeRadius', 'increased', 0.12, ['warcry']), m('cooldownRecovery', 'increased', 0.08, ['warcry'])),
      n('a', 'small', 'Rousing Lung', '10% increased melee damage; 10% increased warcry duration.', m('damage', 'increased', 0.10, ['melee']), m('effectDuration', 'increased', 0.10, ['warcry'])),
      n('b', 'small', 'Bracing Roar', '+25 armor; 8% increased poise damage.', m('armor', 'flat', 25), m('poiseDamage', 'increased', 0.08)),
      procNode('', 'notable', 'after_warcry', 'Warhorn Follow-Through', 'For 5 seconds after using a warcry skill: 22% increased melee damage, 15% increased poise damage, and 15% increased armor; 12% increased warcry cooldown recovery.', '#cc8b63', {
        trigger: 'cast', tags: ['warcry'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_warcry', duration: 5, mods: [m('damage', 'increased', 0.22, ['melee']), m('poiseDamage', 'increased', 0.15), m('armor', 'increased', 0.15)] } },
      }, m('cooldownRecovery', 'increased', 0.12, ['warcry'])),
      n('tailA', 'notable', 'Echoing Challenge', '20% increased warcry area of effect; 18% increased warcry cooldown recovery; 15% increased warcry duration.', m('aoeRadius', 'increased', 0.20, ['warcry']), m('cooldownRecovery', 'increased', 0.18, ['warcry']), m('effectDuration', 'increased', 0.15, ['warcry'])),
      n('tailB', 'notable', 'Bellow-Lit Steel', '+12% chance for melee attacks to deal double damage; +18% melee critical strike multiplier.', m('doubleDamageChance', 'flat', 0.12, ['melee']), m('critMulti', 'flat', 0.18, ['melee'])),
    ],
  },
  {
    id: 'exp_p4_str_after_attack', wedge: 'str', theme: 'impact', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Driving Step', '6% increased attack damage; +20 armor.', m('damage', 'increased', 0.06, ['attack']), m('armor', 'flat', 20)),
      n('a', 'small', 'Heavy Momentum', '8% increased poise damage; 6% increased attack speed.', m('poiseDamage', 'increased', 0.08), m('attackSpeed', 'increased', 0.06)),
      n('b', 'small', 'Forward Guard', '8% increased armor; 4% increased movement speed.', m('armor', 'increased', 0.08), m('moveSpeed', 'increased', 0.04)),
      procNode('', 'notable', 'after_attack', 'Momentum Strike', 'For 4 seconds after using an attack skill: 16% increased armor, 14% increased poise damage, and 8% increased movement speed; 10% increased attack damage.', '#cc8b63', {
        trigger: 'cast', tags: ['attack'], icd: 3,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_attack', duration: 4, mods: [m('armor', 'increased', 0.16), m('poiseDamage', 'increased', 0.14), m('moveSpeed', 'increased', 0.08)] } },
      }, m('damage', 'increased', 0.10, ['attack'])),
    ],
  },
  {
    id: 'exp_p4_str_after_fissure', wedge: 'str', theme: 'impact', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Sundered Crust', '10% increased fissure skill damage; 8% increased area of effect.', m('damage', 'increased', 0.10, ['fissure']), m('aoeRadius', 'increased', 0.08)),
      n('a', 'small', 'Rift Seams', '10% increased fissure area of effect; 8% increased physical damage.', m('aoeRadius', 'increased', 0.10, ['fissure']), m('damage', 'increased', 0.08, ['physical'])),
      n('b', 'small', 'Quaking Footing', '10% increased area damage; 8% increased poise damage.', m('damage', 'increased', 0.10, ['aoe']), m('poiseDamage', 'increased', 0.08)),
      procNode('', 'notable', 'after_fissure', 'Rift-Born Tremor', 'For 5 seconds after using a fissure skill: 20% increased area damage, 15% increased area of effect, and 12% increased physical damage; 15% increased fissure skill damage.', '#cc8b63', {
        trigger: 'cast', tags: ['fissure'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_fissure', duration: 5, mods: [m('damage', 'increased', 0.20, ['aoe']), m('aoeRadius', 'increased', 0.15), m('damage', 'increased', 0.12, ['physical'])] } },
      }, m('damage', 'increased', 0.15, ['fissure'])),
    ],
  },

  // =========================================================================
  // FORTITUDE — PASS 4 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p4_for_after_guard', wedge: 'for', theme: 'bastion', shape: 'fork', pass: 4,
    nodes: [
      n('entry', 'small', 'Ready Buckler', '10% increased guard strength; +25 armor.', m('guardStrength', 'increased', 0.10), m('armor', 'flat', 25)),
      n('a', 'small', 'Stout Recovery', '12% increased poise regeneration; +12 maximum life.', m('poiseRegenPct', 'increased', 0.12), m('life', 'flat', 12)),
      n('b', 'small', 'Braced Retort', '8% increased melee damage; +2% block chance.', m('damage', 'increased', 0.08, ['melee']), m('blockChance', 'flat', 0.02)),
      procNode('', 'notable', 'after_guard', 'Raised-Shield Surge', 'For 4 seconds after using a guard skill: 25% increased armor, 20% increased melee damage, and 20% increased poise regeneration; 15% increased guard strength.', '#a5bcc5', {
        trigger: 'cast', tags: ['guard'], icd: 3.5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_guard', duration: 4, mods: [m('armor', 'increased', 0.25), m('damage', 'increased', 0.20, ['melee']), m('poiseRegenPct', 'increased', 0.20)] } },
      }, m('guardStrength', 'increased', 0.15)),
      n('tailA', 'notable', 'Counter-Step', '+5% block chance; 10% increased movement speed; +1 (+0.25 per level) life gained on block.', m('blockChance', 'flat', 0.05), m('moveSpeed', 'increased', 0.10), m('lifeOnBlock', 'flat', 1), g('lifeOnBlock', 'flat', 0.25, 'level')),
      n('tailB', 'notable', 'Anchored Wall', '+14 endurance; +6% endurance damage reduction; +5 (+1 per level) thorns.', m('endurance', 'flat', 14), m('enduranceDR', 'flat', 0.06), m('thorns', 'flat', 5), g('thorns', 'flat', 1.0, 'level')),
    ],
  },
  {
    id: 'exp_p4_for_after_flask', wedge: 'for', theme: 'life', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Apothecary Belt', '10% increased flask restoration power; +12 maximum life.', m('restorePower', 'increased', 0.10, ['flask']), m('life', 'flat', 12)),
      n('a', 'small', 'Bracing Draught', '+6% fire, cold, and lightning resistance.', m('fireRes', 'flat', 0.06), m('coldRes', 'flat', 0.06), m('lightningRes', 'flat', 0.06)),
      n('b', 'small', 'Flushed Vigor', '10% increased healing received; +0.6% maximum life regenerated per second.', m('healTaken', 'increased', 0.10), m('lifeRegenPct', 'flat', 0.006)),
      procNode('', 'notable', 'after_flask', 'Tonic Vigor', 'For 5 seconds after using a flask skill: 20% increased healing received, 12% increased movement speed, and +12% fire, cold, and lightning resistance; 15% increased flask restoration power.', '#ce8793', {
        trigger: 'cast', tags: ['flask'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_flask', duration: 5, mods: [m('healTaken', 'increased', 0.20), m('moveSpeed', 'increased', 0.12), m('fireRes', 'flat', 0.12), m('coldRes', 'flat', 0.12), m('lightningRes', 'flat', 0.12)] } },
      }, m('restorePower', 'increased', 0.15, ['flask'])),
    ],
  },
  {
    id: 'exp_p4_for_after_melee', wedge: 'for', theme: 'bastion', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Close Quarters Guard', '+20 armor; 8% increased melee damage.', m('armor', 'flat', 20), m('damage', 'increased', 0.08, ['melee'])),
      n('a', 'small', 'Brawler\'s Grit', '+1 (+0.18 per level) flat hit reduction; 8% increased ward gained.', m('flatHitReduction', 'flat', 1), g('flatHitReduction', 'flat', 0.18, 'level'), m('wardGain', 'increased', 0.08)),
      n('b', 'small', 'Short Buckler', '+2% block chance; 8% increased guard strength.', m('blockChance', 'flat', 0.02), m('guardStrength', 'increased', 0.08)),
      procNode('', 'notable', 'after_melee', 'Close-Range Brace', 'For 4 seconds after using a melee skill: 15% increased guard strength, 16% increased ward gained, and +2 (+0.4 per level) flat incoming hit reduction; 10% increased melee damage.', '#a5bcc5', {
        trigger: 'cast', tags: ['melee'], icd: 3,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_melee', duration: 4, mods: [m('guardStrength', 'increased', 0.15), m('wardGain', 'increased', 0.16), m('flatHitReduction', 'flat', 2), g('flatHitReduction', 'flat', 0.4, 'level')] } },
      }, m('damage', 'increased', 0.10, ['melee'])),
    ],
  },

  // =========================================================================
  // PROWESS — PASS 4 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p4_prw_after_movement', wedge: 'prw', theme: 'tempo', shape: 'fork', pass: 4,
    nodes: [
      n('entry', 'small', 'Spring-Step', '6% increased movement speed; 8% increased movement skill cooldown recovery.', m('moveSpeed', 'increased', 0.06), m('cooldownRecovery', 'increased', 0.08, ['movement'])),
      n('a', 'small', 'Sudden Lunge', '6% increased attack speed; +10% critical strike multiplier.', m('attackSpeed', 'increased', 0.06), m('critMulti', 'flat', 0.10)),
      n('b', 'small', 'Fleet Footing', '10% increased evasion; 6% increased melee damage.', m('evasion', 'increased', 0.10), m('damage', 'increased', 0.06, ['melee'])),
      procNode('', 'notable', 'after_movement', 'Vaulting Ambush', 'For 4 seconds after using a movement skill: 18% increased attack speed, +25% critical strike multiplier, and 15% increased evasion; 12% increased movement skill cooldown recovery.', '#d49a8e', {
        trigger: 'cast', tags: ['movement'], icd: 3.5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_movement', duration: 4, mods: [m('attackSpeed', 'increased', 0.18), m('critMulti', 'flat', 0.25), m('evasion', 'increased', 0.15)] } },
      }, m('cooldownRecovery', 'increased', 0.12, ['movement'])),
      n('tailA', 'notable', 'Lunging Follow-Up', '18% increased melee reach; +20% ambush damage; 12% increased melee damage.', m('meleeReach', 'increased', 0.18), m('ambushBonus', 'flat', 0.20), m('damage', 'increased', 0.12, ['melee'])),
      n('tailB', 'notable', 'Evasive Footwork', '20% increased evasion; 15% increased movement skill cooldown recovery; +10% area avoidance.', m('evasion', 'increased', 0.20), m('cooldownRecovery', 'increased', 0.15, ['movement']), m('areaAvoidance', 'flat', 0.10)),
    ],
  },
  {
    id: 'exp_p4_prw_after_throw', wedge: 'prw', theme: 'impact', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Heave & Chase', '10% increased throw skill damage; 6% increased movement speed.', m('damage', 'increased', 0.10, ['throw']), m('moveSpeed', 'increased', 0.06)),
      n('a', 'small', 'Slam Force', '+12% collision impact damage; +25 knockback strength.', m('impactDamage', 'flat', 0.12), m('knockback', 'flat', 25)),
      n('b', 'small', 'Close the Gap', '10% increased melee damage; +10% grip power.', m('damage', 'increased', 0.10, ['melee']), m('gripPower', 'flat', 0.10)),
      procNode('', 'notable', 'after_throw', 'Follow-Through Rush', 'For 5 seconds after using a throw skill: 20% increased movement speed, 22% increased melee damage, and +20% collision impact damage; 14% increased throw skill damage.', '#cc8b63', {
        trigger: 'cast', tags: ['throw'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_throw', duration: 5, mods: [m('moveSpeed', 'increased', 0.20), m('damage', 'increased', 0.22, ['melee']), m('impactDamage', 'flat', 0.20)] } },
      }, m('damage', 'increased', 0.14, ['throw'])),
    ],
  },
  {
    id: 'exp_p4_prw_after_aoe', wedge: 'prw', theme: 'tempo', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Wide Arc', '8% increased area of effect; 6% increased attack speed.', m('aoeRadius', 'increased', 0.08), m('attackSpeed', 'increased', 0.06)),
      n('a', 'small', 'Clearing Sweep', '10% increased area damage; +8% critical strike multiplier.', m('damage', 'increased', 0.10, ['aoe']), m('critMulti', 'flat', 0.08)),
      n('b', 'small', 'Centered Stance', '+2% critical strike chance; 6% increased cast speed.', m('critChance', 'flat', 0.02), m('castSpeed', 'increased', 0.06)),
      procNode('', 'notable', 'after_aoe', 'Sweeping Flow', 'For 4 seconds after using an area skill: 14% increased attack speed, 14% increased cast speed, and +4% critical strike chance; 12% increased area of effect.', '#d49a8e', {
        trigger: 'cast', tags: ['aoe'], icd: 3.5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_aoe', duration: 4, mods: [m('attackSpeed', 'increased', 0.14), m('castSpeed', 'increased', 0.14), m('critChance', 'flat', 0.04)] } },
      }, m('aoeRadius', 'increased', 0.12)),
    ],
  },

  // =========================================================================
  // DEXTERITY — PASS 4 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p4_dex_after_projectile', wedge: 'dex', theme: 'ranged', shape: 'fork', pass: 4,
    nodes: [
      n('entry', 'small', 'Nocked & Moving', '8% increased projectile damage; 6% increased projectile speed.', m('damage', 'increased', 0.08, ['projectile']), m('projectileSpeed', 'increased', 0.06)),
      n('a', 'small', 'Loose Footing', '10% increased evasion; 4% increased movement speed.', m('evasion', 'increased', 0.10), m('moveSpeed', 'increased', 0.04)),
      n('b', 'small', 'True Sight', '10% increased accuracy; +2% projectile critical strike chance.', m('accuracy', 'increased', 0.10), m('critChance', 'flat', 0.02, ['projectile'])),
      procNode('', 'notable', 'after_projectile', 'Quiver Rhythm', 'For 4 seconds after using a projectile skill: 16% increased evasion, 12% increased movement speed, and 18% increased projectile speed; 10% increased projectile damage.', '#9fbba2', {
        trigger: 'cast', tags: ['projectile'], icd: 3,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_projectile', duration: 4, mods: [m('evasion', 'increased', 0.16), m('moveSpeed', 'increased', 0.12), m('projectileSpeed', 'increased', 0.18)] } },
      }, m('damage', 'increased', 0.10, ['projectile'])),
      n('tailA', 'notable', 'Iron-Sight Stance', '+5% projectile critical strike chance; 18% increased accuracy; +15% projectile critical strike multiplier.', m('critChance', 'flat', 0.05, ['projectile']), m('accuracy', 'increased', 0.18), m('critMulti', 'flat', 0.15, ['projectile'])),
      n('tailB', 'notable', 'Skirmisher\'s Drift', '12% increased movement speed; +12% area avoidance; 15% increased evasion.', m('moveSpeed', 'increased', 0.12), m('areaAvoidance', 'flat', 0.12), m('evasion', 'increased', 0.15)),
    ],
  },
  {
    id: 'exp_p4_dex_after_totem', wedge: 'dex', theme: 'devices', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Driven Post', '12% faster totem placement speed; 8% increased construct cast rate.', m('totemPlaceTime', 'more', -0.12), m('constructCastRate', 'increased', 0.08)),
      n('a', 'small', 'Crossfire Sight', '10% increased projectile damage; 10% increased totem damage.', m('damage', 'increased', 0.10, ['projectile']), m('damage', 'increased', 0.10, ['totem'])),
      n('b', 'small', 'Shelter Post', '10% increased ward gained; +15 evasion.', m('wardGain', 'increased', 0.10), m('evasion', 'flat', 15)),
      procNode('', 'notable', 'after_totem', 'Planted Overwatch', 'For 5 seconds after using a totem skill: 20% increased projectile damage, 16% increased construct cast rate, and 15% increased ward gained; 15% faster totem placement.', '#bbaa78', {
        trigger: 'cast', tags: ['totem'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_totem', duration: 5, mods: [m('damage', 'increased', 0.20, ['projectile']), m('constructCastRate', 'increased', 0.16), m('wardGain', 'increased', 0.15)] } },
      }, m('totemPlaceTime', 'more', -0.15)),
    ],
  },
  {
    id: 'exp_p4_dex_after_trap', wedge: 'dex', theme: 'devices', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Hair-Trigger Latch', '10% increased trap damage; 6% increased movement speed.', m('damage', 'increased', 0.10, ['trap']), m('moveSpeed', 'increased', 0.06)),
      n('a', 'small', 'Slip Away', '12% increased evasion; 8% increased trap cooldown recovery.', m('evasion', 'increased', 0.12), m('cooldownRecovery', 'increased', 0.08, ['trap'])),
      n('b', 'small', 'Double Fuse', '10% increased construct damage; 8% increased area of effect with traps.', m('damage', 'increased', 0.10, ['construct']), m('aoeRadius', 'increased', 0.08, ['trap'])),
      procNode('', 'notable', 'after_trap', 'Sapper\'s Withdrawal', 'For 5 seconds after using a trap skill: 18% increased movement speed, 20% increased evasion, and 18% increased trap damage; 12% increased trap cooldown recovery.', '#bbaa78', {
        trigger: 'cast', tags: ['trap'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_trap', duration: 5, mods: [m('moveSpeed', 'increased', 0.18), m('evasion', 'increased', 0.20), m('damage', 'increased', 0.18, ['trap'])] } },
      }, m('cooldownRecovery', 'increased', 0.12, ['trap'])),
    ],
  },

  // =========================================================================
  // FINESSE — PASS 4 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p4_fin_after_munition', wedge: 'fin', theme: 'devices', shape: 'fork', pass: 4,
    nodes: [
      n('entry', 'small', 'Black-Powder Drill', '10% increased munition damage; 8% increased reload speed.', m('damage', 'increased', 0.10, ['munition']), m('reloadSpeed', 'increased', 0.08)),
      n('a', 'small', 'Brass Primer', '+10% critical strike multiplier with munition skills; 6% increased attack speed.', m('critMulti', 'flat', 0.10, ['munition']), m('attackSpeed', 'increased', 0.06)),
      n('b', 'small', 'Quick Bandolier', '10% increased reload speed; 4% increased movement speed.', m('reloadSpeed', 'increased', 0.10), m('moveSpeed', 'increased', 0.04)),
      procNode('', 'notable', 'after_munition', 'Powder-Burn Tempo', 'For 4 seconds after using a munition skill: 18% increased reload speed, +20% critical strike multiplier, and 10% increased movement speed; 12% increased munition damage.', '#bbaa78', {
        trigger: 'cast', tags: ['munition'], icd: 3.5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_munition', duration: 4, mods: [m('reloadSpeed', 'increased', 0.18), m('critMulti', 'flat', 0.20), m('moveSpeed', 'increased', 0.10)] } },
      }, m('damage', 'increased', 0.12, ['munition'])),
      n('tailA', 'notable', 'Hot Chamber', '+35% final-round magazine damage; 16% increased munition damage; +3% munition critical strike chance.', m('finalRoundDamage', 'flat', 0.35), m('damage', 'increased', 0.16, ['munition']), m('critChance', 'flat', 0.03, ['munition'])),
      n('tailB', 'notable', 'Gunsmith\'s Cadence', '35% increased reload speed; +1 munition skill charge; 15% more munition damage; 10% less attack speed with munition skills.', m('reloadSpeed', 'increased', 0.35), m('skillCharges', 'flat', 1, ['munition']), m('damage', 'more', 0.15, ['munition']), m('attackSpeed', 'more', -0.10, ['munition'])),
    ],
  },
  {
    id: 'exp_p4_fin_after_reload', wedge: 'fin', theme: 'devices', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Oiled Bolt', '12% increased reload speed; 8% increased projectile damage.', m('reloadSpeed', 'increased', 0.12), m('damage', 'increased', 0.08, ['projectile'])),
      n('a', 'small', 'Fresh Primer', '+2% critical strike chance; 8% increased projectile speed.', m('critChance', 'flat', 0.02), m('projectileSpeed', 'increased', 0.08)),
      n('b', 'small', 'Steady Clip', '+15% final-round damage; 8% increased reload speed.', m('finalRoundDamage', 'flat', 0.15), m('reloadSpeed', 'increased', 0.08)),
      procNode('', 'notable', 'after_reload', 'Fresh Magazine', 'For 4 seconds after using a reload skill: 25% increased projectile damage, +6% critical strike chance, and 18% increased projectile speed; 15% increased reload speed.', '#bbaa78', {
        trigger: 'cast', tags: ['reload'], icd: 3,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_reload', duration: 4, mods: [m('damage', 'increased', 0.25, ['projectile']), m('critChance', 'flat', 0.06), m('projectileSpeed', 'increased', 0.18)] } },
      }, m('reloadSpeed', 'increased', 0.15)),
    ],
  },
  {
    id: 'exp_p4_fin_after_javelin', wedge: 'fin', theme: 'ranged', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Hurling Stride', '10% increased javelin damage; 6% increased movement speed.', m('damage', 'increased', 0.10, ['javelin']), m('moveSpeed', 'increased', 0.06)),
      n('a', 'small', 'Hooked Spearhead', '+8% impale power; 8% increased melee damage.', m('impalePower', 'flat', 0.08), m('damage', 'increased', 0.08, ['melee'])),
      n('b', 'small', 'Skewer Point', '+10% javelin projectile speed; +8% javelin critical strike multiplier.', m('projectileSpeed', 'increased', 0.10, ['javelin']), m('critMulti', 'flat', 0.08, ['javelin'])),
      procNode('', 'notable', 'after_javelin', 'Spear-Run Momentum', 'For 4 seconds after using a javelin skill: 16% increased movement speed, 20% increased melee damage, and +14% impale power; 12% increased javelin damage.', '#9fbba2', {
        trigger: 'cast', tags: ['javelin'], icd: 3.5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_javelin', duration: 4, mods: [m('moveSpeed', 'increased', 0.16), m('damage', 'increased', 0.20, ['melee']), m('impalePower', 'flat', 0.14)] } },
      }, m('damage', 'increased', 0.12, ['javelin'])),
    ],
  },

  // =========================================================================
  // INTELLIGENCE — PASS 4 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p4_int_after_spell', wedge: 'int', theme: 'arcana', shape: 'fork', pass: 4,
    nodes: [
      n('entry', 'small', 'Luminous Residue', '8% increased spell damage; 8% increased mana regeneration.', m('damage', 'increased', 0.08, ['spell']), m('manaRegen', 'increased', 0.08)),
      n('a', 'small', 'Quickened Shell', '10% increased energy shield recharge rate; +12 maximum energy shield.', m('esRechargeRate', 'increased', 0.10), m('energyShield', 'flat', 12)),
      n('b', 'small', 'Spell-Lit Swing', '6% increased attack speed; 6% increased cast speed.', m('attackSpeed', 'increased', 0.06), m('castSpeed', 'increased', 0.06)),
      procNode('', 'notable', 'after_spell', 'Arcane Afterglow', 'For 4 seconds after using a spell skill: 20% increased energy shield recharge rate, 18% increased mana regeneration, and 14% increased attack speed; 10% increased spell damage.', '#9eacdc', {
        trigger: 'cast', tags: ['spell'], icd: 3,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_spell', duration: 4, mods: [m('esRechargeRate', 'increased', 0.20), m('manaRegen', 'increased', 0.18), m('attackSpeed', 'increased', 0.14)] } },
      }, m('damage', 'increased', 0.10, ['spell'])),
      n('tailA', 'notable', 'Chained Resonance', '12% increased cast speed; +4% spell critical strike chance; +14% spell critical strike multiplier.', m('castSpeed', 'increased', 0.12), m('critChance', 'flat', 0.04, ['spell']), m('critMulti', 'flat', 0.14, ['spell'])),
      n('tailB', 'notable', 'Ward-Weft', '+28 maximum energy shield; 20% increased ward gained; 12% faster energy shield recharge start.', m('energyShield', 'flat', 28), m('wardGain', 'increased', 0.20), m('esRechargeDelay', 'more', -0.12)),
    ],
  },
  {
    id: 'exp_p4_int_after_channel', wedge: 'int', theme: 'arcana', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Held Tension', '10% increased channeled skill damage; 6% increased cast speed.', m('damage', 'increased', 0.10, ['channel']), m('castSpeed', 'increased', 0.06)),
      n('a', 'small', 'Release Snap', '10% increased spell area of effect; +12 maximum mana.', m('aoeRadius', 'increased', 0.10, ['spell']), m('mana', 'flat', 12)),
      n('b', 'small', 'Coiled Arc', '8% increased spell damage; +0.06 channeled ramp rate.', m('damage', 'increased', 0.08, ['spell']), m('channelRamp', 'flat', 0.06)),
      procNode('', 'notable', 'after_channel', 'Lingering Focus', 'For 5 seconds after using a channeled skill: 22% increased spell damage, 15% increased cast speed, and 14% increased area of effect; 12% increased channeled skill damage.', '#9eacdc', {
        trigger: 'cast', tags: ['channel'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_channel', duration: 5, mods: [m('damage', 'increased', 0.22, ['spell']), m('castSpeed', 'increased', 0.15), m('aoeRadius', 'increased', 0.14)] } },
      }, m('damage', 'increased', 0.12, ['channel'])),
    ],
  },
  {
    id: 'exp_p4_int_after_storm', wedge: 'int', theme: 'lightning', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Ozone Draft', '10% increased storm skill damage; 6% increased cast speed.', m('damage', 'increased', 0.10, ['storm']), m('castSpeed', 'increased', 0.06)),
      n('a', 'small', 'Squall Gust', '8% increased lightning and cold damage.', m('damage', 'increased', 0.08, ['lightning']), m('damage', 'increased', 0.08, ['cold'])),
      n('b', 'small', 'Tailwind Gale', '6% increased movement speed; 10% increased storm duration.', m('moveSpeed', 'increased', 0.06), m('effectDuration', 'increased', 0.10, ['storm'])),
      procNode('', 'notable', 'after_storm', 'Ozone Aftermath', 'For 5 seconds after using a storm skill: 20% increased lightning and cold damage, 16% increased cast speed, and 12% increased movement speed; 12% increased storm skill damage.', '#8cc6d3', {
        trigger: 'cast', tags: ['storm'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_storm', duration: 5, mods: [m('damage', 'increased', 0.20, ['lightning']), m('damage', 'increased', 0.20, ['cold']), m('castSpeed', 'increased', 0.16), m('moveSpeed', 'increased', 0.12)] } },
      }, m('damage', 'increased', 0.12, ['storm'])),
    ],
  },

  // =========================================================================
  // WILLPOWER — PASS 4 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p4_wil_after_curse', wedge: 'wil', theme: 'entropy', shape: 'fork', pass: 4,
    nodes: [
      n('entry', 'small', 'Whispered Hex', '10% increased curse area of effect; 8% increased chaos damage.', m('aoeRadius', 'increased', 0.10, ['curse']), m('damage', 'increased', 0.08, ['chaos'])),
      n('a', 'small', 'Lingering Malice', '10% increased ailment magnitude; 8% increased ward gained.', m('statusMagnitude', 'increased', 0.10), m('wardGain', 'increased', 0.08)),
      n('b', 'small', 'Soured Seal', '6% increased cast speed; 10% increased curse rupture damage.', m('castSpeed', 'increased', 0.06), m('curseRupture', 'flat', 0.10)),
      procNode('', 'notable', 'after_curse', 'Hex-Drinker\'s Cadence', 'For 5 seconds after using a curse skill: 20% increased chaos damage, 20% increased ailment magnitude, 18% increased ward gained, and 12% increased cast speed; 15% increased curse area of effect.', '#a5b27c', {
        trigger: 'cast', tags: ['curse'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_curse', duration: 5, mods: [m('damage', 'increased', 0.20, ['chaos']), m('statusMagnitude', 'increased', 0.20), m('wardGain', 'increased', 0.18), m('castSpeed', 'increased', 0.12)] } },
      }, m('aoeRadius', 'increased', 0.15, ['curse'])),
      n('tailA', 'notable', 'Cursed Detonation', '+25% curse rupture damage; 16% increased curse area of effect; 12% increased chaos damage.', m('curseRupture', 'flat', 0.25), m('aoeRadius', 'increased', 0.16, ['curse']), m('damage', 'increased', 0.12, ['chaos'])),
      n('tailB', 'notable', 'Malediction Loom', '+45% curse rupture burst on expiry; 20% increased curse cooldown recovery; 20% less curse skill duration.', m('curseRupture', 'flat', 0.45), m('cooldownRecovery', 'increased', 0.20, ['curse']), m('effectDuration', 'more', -0.20, ['curse'])),
    ],
  },
  {
    id: 'exp_p4_wil_after_corpse', wedge: 'wil', theme: 'host', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Bone Fuel', '10% increased corpse skill damage; +10 maximum energy shield.', m('damage', 'increased', 0.10, ['corpse']), m('energyShield', 'flat', 10)),
      n('a', 'small', 'Ash Draft', '8% increased chaos and fire damage.', m('damage', 'increased', 0.08, ['chaos']), m('damage', 'increased', 0.08, ['fire'])),
      n('b', 'small', 'Grave Recharge', '12% increased energy shield recharge rate; 6% increased cast speed.', m('esRechargeRate', 'increased', 0.12), m('castSpeed', 'increased', 0.06)),
      procNode('', 'notable', 'after_corpse', 'Grave Banquet', 'For 5 seconds after using a corpse skill: 20% increased chaos and fire damage, 18% increased energy shield recharge rate, and 14% increased cast speed; 14% increased corpse skill damage and area of effect.', '#b4a0d2', {
        trigger: 'cast', tags: ['corpse'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_corpse', duration: 5, mods: [m('damage', 'increased', 0.20, ['chaos']), m('damage', 'increased', 0.20, ['fire']), m('esRechargeRate', 'increased', 0.18), m('castSpeed', 'increased', 0.14)] } },
      }, m('damage', 'increased', 0.14, ['corpse']), m('aoeRadius', 'increased', 0.14, ['corpse'])),
    ],
  },
  {
    id: 'exp_p4_wil_after_duration', wedge: 'wil', theme: 'time', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Drawn-Out Thread', '10% increased skill effect duration; 8% increased duration skill damage.', m('effectDuration', 'increased', 0.10), m('damage', 'increased', 0.08, ['duration'])),
      n('a', 'small', 'Slow Steep', '10% increased ailment magnitude; 8% increased cooldown recovery.', m('statusMagnitude', 'increased', 0.10), m('cooldownRecovery', 'increased', 0.08)),
      n('b', 'small', 'Patient Loom', '10% increased effect duration; 8% increased chaos damage.', m('effectDuration', 'increased', 0.10), m('damage', 'increased', 0.08, ['chaos'])),
      procNode('', 'notable', 'after_duration', 'Sustained Weave', 'For 5 seconds after using a duration skill: 18% increased ailment magnitude, 16% increased effect duration, and 12% increased cooldown recovery; 12% increased duration skill damage.', '#8fbeb8', {
        trigger: 'cast', tags: ['duration'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_duration', duration: 5, mods: [m('statusMagnitude', 'increased', 0.18), m('effectDuration', 'increased', 0.16), m('cooldownRecovery', 'increased', 0.12)] } },
      }, m('damage', 'increased', 0.12, ['duration'])),
    ],
  },

  // =========================================================================
  // WISDOM — PASS 4 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p4_wis_after_summon', wedge: 'wis', theme: 'host', shape: 'fork', pass: 4,
    nodes: [
      n('entry', 'small', 'Quick Muster', '8% increased cast speed with summon skills; 8% increased minion damage.', m('castSpeed', 'increased', 0.08, ['summon']), m('minionDamage', 'increased', 0.08)),
      n('a', 'small', 'Eager Host', '10% increased minion action speed; 8% increased minion life.', m('minionHaste', 'increased', 0.10), m('minionLife', 'increased', 0.08)),
      n('b', 'small', 'Caller\'s Shelter', '10% increased ward gained; +12 maximum mana.', m('wardGain', 'increased', 0.10), m('mana', 'flat', 12)),
      procNode('', 'notable', 'after_summon', 'Mustered Host', 'For 5 seconds after using a summon skill: 20% increased minion action speed, 20% increased minion damage, and 16% increased ward gained; 10% increased cast speed with summon skills.', '#b4a0d2', {
        trigger: 'cast', tags: ['summon'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_summon', duration: 5, mods: [m('minionHaste', 'increased', 0.20), m('minionDamage', 'increased', 0.20), m('wardGain', 'increased', 0.16)] } },
      }, m('castSpeed', 'increased', 0.10, ['summon'])),
      n('tailA', 'notable', 'Rallying Offering', '30% increased offering share to yourself; 18% increased minion maximum life; +1 Command Discipline.', m('offeringShare', 'flat', 0.30), m('minionLife', 'increased', 0.18), m('commandDiscipline', 'flat', 1)),
      n('tailB', 'notable', 'Shepherd\'s Cadence', '20% more cast speed with summon skills; 20% increased minion action speed; 15% less damage with your own direct skills.', m('castSpeed', 'more', 0.20, ['summon']), m('minionHaste', 'increased', 0.20), m('damage', 'more', -0.15)),
    ],
  },
  {
    id: 'exp_p4_wis_after_companion', wedge: 'wis', theme: 'nature', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Whistle Signal', '10% increased companion skill damage; 6% increased movement speed.', m('damage', 'increased', 0.10, ['companion']), m('moveSpeed', 'increased', 0.06)),
      n('a', 'small', 'Pack Pacing', '8% increased attack and cast speed; 8% increased minion movement speed.', m('attackSpeed', 'increased', 0.08), m('castSpeed', 'increased', 0.08), m('minionMoveSpeed', 'increased', 0.08)),
      n('b', 'small', 'Kindred Vigor', '10% increased minion life; 8% of your damage heals bonded companions.', m('minionLife', 'increased', 0.10), m('bondShare', 'flat', 0.08)),
      procNode('', 'notable', 'after_companion', 'Hunt-Master\'s Call', 'For 5 seconds after using a companion skill: 18% increased attack and cast speed, 20% increased companion damage, and 12% increased movement speed; 12% increased minion damage.', '#9dbb8b', {
        trigger: 'cast', tags: ['companion'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_companion', duration: 5, mods: [m('attackSpeed', 'increased', 0.18), m('castSpeed', 'increased', 0.18), m('damage', 'increased', 0.20, ['companion']), m('moveSpeed', 'increased', 0.12)] } },
      }, m('minionDamage', 'increased', 0.12)),
    ],
  },
  {
    id: 'exp_p4_wis_after_throng', wedge: 'wis', theme: 'nature', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Swarm Beckon', '10% increased throng yield; 8% increased minion movement speed.', m('throngYield', 'increased', 0.10), m('minionMoveSpeed', 'increased', 0.08)),
      n('a', 'small', 'Crowded Flanks', '10% increased minion life; 10% increased minion action speed.', m('minionLife', 'increased', 0.10), m('minionHaste', 'increased', 0.10)),
      n('b', 'small', 'Hive Shelter', '10% increased ward gained; 10% increased throng minion life; +8% minion area hit avoidance.', m('wardGain', 'increased', 0.10), m('minionLife', 'increased', 0.10, ['throng']), m('minionAreaAvoidance', 'flat', 0.08)),
      procNode('', 'notable', 'after_throng', 'Swarming Tide', 'For 5 seconds after using a throng skill: 18% increased minion movement speed, 18% increased minion life, and 18% increased ward gained; 15% increased throng yield.', '#9dbb8b', {
        trigger: 'cast', tags: ['throng'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_throng', duration: 5, mods: [m('minionMoveSpeed', 'increased', 0.18), m('minionLife', 'increased', 0.18), m('wardGain', 'increased', 0.18)] } },
      }, m('throngYield', 'increased', 0.15)),
    ],
  },

  // =========================================================================
  // CHARISMA — PASS 4 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p4_cha_after_song', wedge: 'cha', theme: 'chorus', shape: 'fork', pass: 4,
    nodes: [
      n('entry', 'small', 'First Verse', '10% increased song skill area of effect; 8% increased song duration.', m('aoeRadius', 'increased', 0.10, ['song']), m('effectDuration', 'increased', 0.08, ['song'])),
      n('a', 'small', 'Lifted Tempo', '6% increased attack and cast speed; 4% increased movement speed.', m('attackSpeed', 'increased', 0.06), m('castSpeed', 'increased', 0.06), m('moveSpeed', 'increased', 0.04)),
      n('b', 'small', 'Carrying Chorus', '10% increased song damage; 10% increased aura area of effect.', m('damage', 'increased', 0.10, ['song']), m('aoeRadius', 'increased', 0.10, ['aura'])),
      procNode('', 'notable', 'after_song', 'Resonant Encore', 'For 5 seconds after using a song skill: 16% increased attack and cast speed, 14% increased movement speed, and 18% increased song and aura area of effect; 12% increased song damage.', '#c9a0c2', {
        trigger: 'cast', tags: ['song'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_song', duration: 5, mods: [m('attackSpeed', 'increased', 0.16), m('castSpeed', 'increased', 0.16), m('moveSpeed', 'increased', 0.14), m('aoeRadius', 'increased', 0.18, ['song']), m('aoeRadius', 'increased', 0.18, ['aura'])] } },
      }, m('damage', 'increased', 0.12, ['song'])),
      n('tailA', 'notable', 'Crescendo Echo', '+1.5% Echoing Might; 18% increased song skill damage; 12% increased song cooldown recovery.', m('echoMight', 'flat', 0.015), m('damage', 'increased', 0.18, ['song']), m('cooldownRecovery', 'increased', 0.12, ['song'])),
      n('tailB', 'notable', 'Unbroken Aria', '30% more song skill duration; 25% increased song area of effect; 20% more mana cost for song skills.', m('effectDuration', 'more', 0.30, ['song']), m('aoeRadius', 'increased', 0.25, ['song']), m('manaCost', 'more', 0.20, ['song'])),
    ],
  },
  {
    id: 'exp_p4_cha_after_aura', wedge: 'cha', theme: 'chorus', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Unfurled Banner', '10% increased aura area of effect; +12 maximum energy shield.', m('aoeRadius', 'increased', 0.10, ['aura']), m('energyShield', 'flat', 12)),
      n('a', 'small', 'Gilded Mantle', '10% increased ward gained; 8% increased cooldown recovery.', m('wardGain', 'increased', 0.10), m('cooldownRecovery', 'increased', 0.08)),
      n('b', 'small', 'Vanguard Pulse', '8% increased attack and spell damage.', m('damage', 'increased', 0.08, ['attack']), m('damage', 'increased', 0.08, ['spell'])),
      procNode('', 'notable', 'after_aura', 'Consecrated Mantle', 'For 5 seconds after using an aura skill: 18% increased ward gained, 16% increased attack and spell damage, and 12% increased cooldown recovery; 15% increased aura area of effect; 12% increased aura duration.', '#c9a0c2', {
        trigger: 'cast', tags: ['aura'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_aura', duration: 5, mods: [m('wardGain', 'increased', 0.18), m('damage', 'increased', 0.16, ['attack']), m('damage', 'increased', 0.16, ['spell']), m('cooldownRecovery', 'increased', 0.12)] } },
      }, m('aoeRadius', 'increased', 0.15, ['aura']), m('effectDuration', 'increased', 0.12, ['aura'])),
    ],
  },
  {
    id: 'exp_p4_cha_after_heal', wedge: 'cha', theme: 'life', shape: 'diamond', pass: 4,
    nodes: [
      n('entry', 'small', 'Mender\'s Grace', '10% increased healing power; 8% increased spell damage.', m('healPower', 'increased', 0.10), m('damage', 'increased', 0.08, ['spell'])),
      n('a', 'small', 'Bright Salve', '6% increased cast speed; 10% increased ward gained.', m('castSpeed', 'increased', 0.06), m('wardGain', 'increased', 0.10)),
      n('b', 'small', 'Sanctified Light', '8% increased fire and lightning damage; +10 maximum life.', m('damage', 'increased', 0.08, ['fire']), m('damage', 'increased', 0.08, ['lightning']), m('life', 'flat', 10)),
      procNode('', 'notable', 'after_heal', 'Mender\'s Radiance', 'For 5 seconds after using a heal skill: 20% increased spell damage, 16% increased cast speed, and 16% increased ward gained; 14% increased healing power.', '#ce8793', {
        trigger: 'cast', tags: ['heal'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_after_heal', duration: 5, mods: [m('damage', 'increased', 0.20, ['spell']), m('castSpeed', 'increased', 0.16), m('wardGain', 'increased', 0.16)] } },
      }, m('healPower', 'increased', 0.14)),
    ],
  },
];
