// ---------------------------------------------------------------------------
// PASSIVE EXPANSION — PASS 5: CROSS-MECHANIC INTERACTIONS & BRIDGES
// 27 wheels (3 per wedge, 126 nodes, 7 keystones, 16 cross-mechanic procs)
// explicitly linking distinct ARPG mechanics together: Bleed<->Poise,
// Block<->Crushing Heft, Collision<->Burn, Endurance<->Ward, Thorns<->Bleed,
// Block<->Spells, Combo<->Elements, Crit<->Poise/Impale, Evade<->Felling,
// Chill<->Projectiles, Constructs<->Ward, Evade<->Poise, Poison<->Bleed,
// Shock<->Apex Crit, Movement<->DoT Rupture, Chill<->Shock, ES<->Apex Crit,
// Low-Mana<->ES/Ward, Overdrive<->Chaos, Burn<->Corpse, Curses<->Leech,
// Minion Death<->Spells/CDR, Heal<->Minions, Storm<->Summons,
// Insight<->Overdrive, Buffs<->Crit/Luck, and Song<->Curses/Silence.
// ---------------------------------------------------------------------------

import {
  gaugeMod as g,
  linkMod as link,
  mod as m,
} from '../engine/stats';
import { n, procNode, type ExpansionCluster } from './passiveExpansionBase';

export const PASS5_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // STRENGTH — PASS 5 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p5_str_bleed_poise', wedge: 'str', theme: 'impact', shape: 'fork', pass: 5,
    nodes: [
      n('entry', 'small', 'Jagged Impact', '+8% chance to inflict bleed; 8% increased poise damage.', m('apply_bleed', 'flat', 0.08), m('poiseDamage', 'increased', 0.08)),
      n('a', 'small', 'Staggering Cut', '12% increased poise damage against bleeding enemies.', m('poiseDamage', 'increased', 0.12, ['vs:bleed'])),
      n('b', 'small', 'Exposed Sinew', '12% increased physical damage against poise-broken enemies.', m('damage', 'increased', 0.12, ['physical', 'vs:poiseBroken'])),
      procNode('', 'notable', 'bleed_shatter_poise', 'Crimson Concussion', 'Applying bleed grants 22% increased poise damage and 14% increased physical damage for 4 seconds; 20% increased poise damage against bleeding enemies.', '#cc8b63', {
        trigger: 'statusApply', status: 'bleed', icd: 3,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_bleed_shatter_poise', duration: 4, mods: [m('poiseDamage', 'increased', 0.22), m('damage', 'increased', 0.14, ['physical'])] } },
      }, m('poiseDamage', 'increased', 0.20, ['vs:bleed'])),
      n('tailA', 'notable', 'Open-Fracture Gouge', '+25% chance to inflict bleed and 22% increased physical damage against poise-broken enemies.', m('apply_bleed', 'flat', 0.25, ['vs:poiseBroken']), m('damage', 'increased', 0.22, ['physical', 'vs:poiseBroken'])),
      n('tailB', 'notable', 'Hemorrhagic Weight', 'Damaging ailments rupture for 20% of total damage on expiry; 18% increased poise damage; +10% bleed chance.', m('dotRupture', 'flat', 0.20), m('poiseDamage', 'increased', 0.18), m('apply_bleed', 'flat', 0.10)),
    ],
  },
  {
    id: 'exp_p5_str_block_heft', wedge: 'str', theme: 'bastion', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Anvil Brace', '+2% block chance; +6% Crushing Heft chance.', m('blockChance', 'flat', 0.02), m('heftBlowChance', 'flat', 0.06)),
      n('a', 'small', 'Heavy Counter', '+12% Crushing Heft damage bonus; +25 armor.', m('heftBlowScale', 'flat', 0.12), m('armor', 'flat', 25)),
      n('b', 'small', 'Shield-Wall Momentum', '10% increased melee damage; 10% increased guard strength.', m('damage', 'increased', 0.10, ['melee']), m('guardStrength', 'increased', 0.10)),
      procNode('', 'notable', 'block_crushing_heft', 'Anvil Counterblow', 'Blocking a hit grants +35% Crushing Heft chance and +25% Crushing Heft bonus for 4 seconds; +10% Crushing Heft chance.', '#a5bcc5', {
        trigger: 'block', icd: 3.5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_block_crushing_heft', duration: 4, mods: [m('heftBlowChance', 'flat', 0.35), m('heftBlowScale', 'flat', 0.25)] } },
      }, m('heftBlowChance', 'flat', 0.10)),
    ],
  },
  {
    id: 'exp_p5_str_shove_burn', wedge: 'str', theme: 'fire', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Cinder Ram', '+25 knockback strength; +10% chance to inflict burn.', m('knockback', 'flat', 25), m('apply_burn', 'flat', 0.10)),
      n('a', 'small', 'Scorched Masonry', '+14% collision impact damage; 8% increased fire damage.', m('impactDamage', 'flat', 0.14), m('damage', 'increased', 0.08, ['fire'])),
      n('b', 'small', 'Heated Shove', '+0.15 shove authority; 10% increased fire area of effect.', m('shoveAuthority', 'flat', 0.15), m('aoeRadius', 'increased', 0.10, ['fire'])),
      procNode('', 'notable', 'wall_cinder_burst', 'Kiln Impact', 'Knocking an enemy into a wall or void erupts in a fiery blast around you; +20% burn chance; +20% collision impact damage.', '#dca07a', {
        trigger: 'collision', icd: 1.5,
        effect: { type: 'burst', damage: 'fire', base: 24, perLevel: 4, radius: 135 },
      }, m('apply_burn', 'flat', 0.20), m('impactDamage', 'flat', 0.20)),
    ],
  },

  // =========================================================================
  // FORTITUDE — PASS 5 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p5_for_endurance_ward', wedge: 'for', theme: 'bastion', shape: 'fork', pass: 5,
    nodes: [
      n('entry', 'small', 'Layered Grit', '+8 endurance; 10% increased ward gained.', m('endurance', 'flat', 8), m('wardGain', 'increased', 0.10)),
      n('a', 'small', 'Stoic Mantle', '12% slower ward decay while you have endurance; +20 armor.', m('wardDecay', 'more', -0.12, undefined, 'hasEndurance'), m('armor', 'flat', 20)),
      n('b', 'small', 'Dense Reserve', '10% increased endurance regeneration; 10% increased ward gained.', m('enduranceRegenPct', 'increased', 0.10), m('wardGain', 'increased', 0.10)),
      n('', 'notable', 'Steadfast Shroud', 'While you have endurance: 25% increased ward gained and 20% slower ward decay; +14 endurance.', m('wardGain', 'increased', 0.25, undefined, 'hasEndurance'), m('wardDecay', 'more', -0.20, undefined, 'hasEndurance'), m('endurance', 'flat', 14)),
      procNode('tailA', 'notable', 'ward_to_endurance', 'Reforged Bulwark', 'When your ward breaks, fortify 10% of your maximum life as endurance; +10 endurance; +5% endurance damage reduction.', '#a5bcc5', {
        trigger: 'wardBreak', icd: 4,
        effect: { type: 'fortify', pctMaxLife: 0.10 },
      }, m('endurance', 'flat', 10), m('enduranceDR', 'flat', 0.05)),
      n('tailB', 'keystone', 'Armored Shroud', 'Gain endurance equal to 10% of your baseline armor; removes all evasion.', link('endurance', 'armor', 0.10), m('evasionForgone', 'flat', 1)),
    ],
  },
  {
    id: 'exp_p5_for_thorns_bleed', wedge: 'for', theme: 'bastion', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Serrated Plate', '+3 (+0.7 per level) thorns; +8% chance to inflict bleed.', m('thorns', 'flat', 3), g('thorns', 'flat', 0.7, 'level'), m('apply_bleed', 'flat', 0.08)),
      n('a', 'small', 'Spiteful Barbs', '+12% thorns added to hits; 10% increased ailment magnitude.', m('thornsToHit', 'flat', 0.12), m('statusMagnitude', 'increased', 0.10)),
      n('b', 'small', 'Jagged Guard', '+4 (+0.8 per level) thorns; +15 maximum life.', m('thorns', 'flat', 4), g('thorns', 'flat', 0.8, 'level'), m('life', 'flat', 15)),
      procNode('', 'notable', 'barbed_bleed', 'Ragged Briars', 'Taking a landed hit inflicts Bleed on the attacker; +6 (+1.4 per level) thorns; +18% thorns added to your hits.', '#a5bcc5', {
        trigger: 'hurt', icd: 1.0,
        effect: { type: 'status', status: 'bleed', magnitude: 1.1 },
      }, m('thorns', 'flat', 6), g('thorns', 'flat', 1.4, 'level'), m('thornsToHit', 'flat', 0.18)),
    ],
  },
  {
    id: 'exp_p5_for_block_cast', wedge: 'for', theme: 'arcana', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Warded Sigil', '+2% block chance; 8% increased spell damage.', m('blockChance', 'flat', 0.02), m('damage', 'increased', 0.08, ['spell'])),
      n('a', 'small', 'Shield-Scribe', '6% increased cast speed; +15 maximum energy shield.', m('castSpeed', 'increased', 0.06), m('energyShield', 'flat', 15)),
      n('b', 'small', 'Rebounding Seal', '+2% block chance; 10% increased guard strength.', m('blockChance', 'flat', 0.02), m('guardStrength', 'increased', 0.10)),
      procNode('', 'notable', 'aegis_incantation', 'Aegis Invocation', 'Blocking a hit grants 25% increased cast speed and 22% increased spell damage for 4 seconds; +4% block chance; 12% increased spell damage.', '#9eacdc', {
        trigger: 'block', icd: 3.5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_aegis_incantation', duration: 4, mods: [m('castSpeed', 'increased', 0.25), m('damage', 'increased', 0.22, ['spell'])] } },
      }, m('blockChance', 'flat', 0.04), m('damage', 'increased', 0.12, ['spell'])),
    ],
  },

  // =========================================================================
  // PROWESS — PASS 5 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p5_prw_combo_elem', wedge: 'prw', theme: 'tempo', shape: 'fork', pass: 5,
    nodes: [
      n('entry', 'small', 'Varied Cadence', '12% increased combo window; 6% increased elemental damage.', m('comboWindow', 'increased', 0.12), m('damage', 'increased', 0.06, ['fire']), m('damage', 'increased', 0.06, ['cold']), m('damage', 'increased', 0.06, ['lightning'])),
      n('a', 'small', 'Shifting Hue', '12% increased elemental damage while weaving varied skills.', m('damage', 'increased', 0.12, ['fire'], 'comboVaried'), m('damage', 'increased', 0.12, ['cold'], 'comboVaried'), m('damage', 'increased', 0.12, ['lightning'], 'comboVaried')),
      n('b', 'small', 'Keen Transition', '+3% critical strike chance while weaving varied skills; 6% increased attack speed.', m('critChance', 'flat', 0.03, undefined, 'comboVaried'), m('attackSpeed', 'increased', 0.06)),
      n('', 'notable', 'Weaving Spectrum', 'While weaving varied skills: gain 5% of physical damage as extra fire, cold, and lightning damage; 20% increased combo window.', m('gainAs_physical_fire', 'flat', 0.05, undefined, 'comboVaried'), m('gainAs_physical_cold', 'flat', 0.05, undefined, 'comboVaried'), m('gainAs_physical_lightning', 'flat', 0.05, undefined, 'comboVaried'), m('comboWindow', 'increased', 0.20)),
      n('tailA', 'notable', 'Rhythmic Convergence', 'While weaving varied skills: +8% fire, cold, and lightning penetration and 12% increased attack and cast speed.', m('firePen', 'flat', 0.08, undefined, 'comboVaried'), m('coldPen', 'flat', 0.08, undefined, 'comboVaried'), m('lightningPen', 'flat', 0.08, undefined, 'comboVaried'), m('attackSpeed', 'increased', 0.12, undefined, 'comboVaried'), m('castSpeed', 'increased', 0.12, undefined, 'comboVaried')),
      n('tailB', 'keystone', 'Prismatic Cadence', 'While weaving varied skills: 25% more elemental damage; while repeating the same skill: 45% less damage.', m('damage', 'more', 0.25, ['fire'], 'comboVaried'), m('damage', 'more', 0.25, ['cold'], 'comboVaried'), m('damage', 'more', 0.25, ['lightning'], 'comboVaried'), m('damage', 'more', -0.45, undefined, 'comboRepeated')),
    ],
  },
  {
    id: 'exp_p5_prw_crit_poise', wedge: 'prw', theme: 'tempo', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Pinpoint Breaker', '+2% critical strike chance; 8% increased poise damage.', m('critChance', 'flat', 0.02), m('poiseDamage', 'increased', 0.08)),
      n('a', 'small', 'Splintering Point', '+8% impale power; +10% critical strike multiplier.', m('impalePower', 'flat', 0.08), m('critMulti', 'flat', 0.10)),
      n('b', 'small', 'Guard-Cracking Eye', '12% increased poise damage against poised enemies; +2% crit chance.', m('poiseDamage', 'increased', 0.12, ['vs:poised']), m('critChance', 'flat', 0.02)),
      procNode('', 'notable', 'crit_impale_poise', 'Piercing Balance', 'Critical hits grant 25% increased poise damage and +18% impale power for 4 seconds; +12% impale power.', '#d49a8e', {
        trigger: 'hit', crit: true, icd: 3.5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_crit_impale_poise', duration: 4, mods: [m('poiseDamage', 'increased', 0.25), m('impalePower', 'flat', 0.18)] } },
      }, m('impalePower', 'flat', 0.12)),
    ],
  },
  {
    id: 'exp_p5_prw_evade_fell', wedge: 'prw', theme: 'guile', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Slipping Opening', '10% increased evasion; +5% Felling Strike chance.', m('evasion', 'increased', 0.10), m('fellingChance', 'flat', 0.05)),
      n('a', 'small', 'Twin Opening', '+5% chance to deal double damage; 6% increased attack speed.', m('doubleDamageChance', 'flat', 0.05), m('attackSpeed', 'increased', 0.06)),
      n('b', 'small', 'Duck & Sever', '12% increased evasion; +10% critical strike multiplier.', m('evasion', 'increased', 0.12), m('critMulti', 'flat', 0.10)),
      procNode('', 'notable', 'slip_felling', 'Sidestep Execution', 'Evading an attack grants +30% Felling Strike chance and +20% double damage chance for 4 seconds; +8% Felling Strike chance.', '#b8bd83', {
        trigger: 'evade', icd: 3.5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_slip_felling', duration: 4, mods: [m('fellingChance', 'flat', 0.30), m('doubleDamageChance', 'flat', 0.20)] } },
      }, m('fellingChance', 'flat', 0.08)),
    ],
  },

  // =========================================================================
  // DEXTERITY — PASS 5 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p5_dex_chill_proj', wedge: 'dex', theme: 'cold', shape: 'fork', pass: 5,
    nodes: [
      n('entry', 'small', 'Frosted Fletching', '+10% chance to chill with projectiles; 8% increased cold damage.', m('apply_chill', 'flat', 0.10, ['projectile']), m('damage', 'increased', 0.08, ['cold'])),
      n('a', 'small', 'Ice-Tipped Shaft', '12% increased projectile damage against chilled enemies.', m('damage', 'increased', 0.12, ['projectile', 'vs:chill'])),
      n('b', 'small', 'Rime Velocity', '10% increased projectile speed; +10% projectile crit multiplier vs chilled.', m('projectileSpeed', 'increased', 0.10), m('critMulti', 'flat', 0.10, ['projectile', 'vs:chill'])),
      procNode('', 'notable', 'rime_flight', 'Rime-Fletched Volley', 'Inflicting chill grants 20% increased projectile speed and 18% increased projectile damage for 4 seconds; +1 pierce; 18% increased projectile damage vs chilled enemies.', '#9ebedc', {
        trigger: 'statusApply', status: 'chill', icd: 3.5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_rime_flight', duration: 4, mods: [m('projectileSpeed', 'increased', 0.20), m('damage', 'increased', 0.18, ['projectile'])] } },
      }, m('pierceCount', 'flat', 1), m('damage', 'increased', 0.18, ['projectile', 'vs:chill'])),
      n('tailA', 'notable', 'Brittle Splinter', '+8% projectile critical strike chance and +25% projectile critical strike multiplier against chilled or frozen enemies.', m('critChance', 'flat', 0.08, ['projectile', 'vs:chill']), m('critMulti', 'flat', 0.25, ['projectile', 'vs:chill']), m('critChance', 'flat', 0.08, ['projectile', 'vs:frozen']), m('critMulti', 'flat', 0.25, ['projectile', 'vs:frozen'])),
      n('tailB', 'notable', 'Frost-Rimmed Chain', '+1 projectile chain; gain 6% of physical projectile damage as extra cold damage.', m('chainCount', 'flat', 1), m('gainAs_physical_cold', 'flat', 0.06, ['projectile'])),
    ],
  },
  {
    id: 'exp_p5_dex_construct_ward', wedge: 'dex', theme: 'devices', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Deploy & Shelter', '10% increased construct cast rate; 10% increased ward gained.', m('constructCastRate', 'increased', 0.10), m('wardGain', 'increased', 0.10)),
      n('a', 'small', 'Rigged Escape', '6% increased movement speed; 10% increased construct damage.', m('moveSpeed', 'increased', 0.06), m('damage', 'increased', 0.10, ['construct'])),
      n('b', 'small', 'Field Curtain', '12% slower ward decay; 10% increased evasion.', m('wardDecay', 'more', -0.12), m('evasion', 'increased', 0.10)),
      procNode('', 'notable', 'workshop_aegis', 'Field-Kit Shelter', 'Casting a construct skill grants 10% of maximum life as ward; 15% increased construct cast rate; 10% increased movement speed.', '#bbaa78', {
        trigger: 'cast', tags: ['construct'], icd: 4,
        effect: { type: 'ward', pctMaxLife: 0.10 },
      }, m('constructCastRate', 'increased', 0.15), m('moveSpeed', 'increased', 0.10)),
    ],
  },
  {
    id: 'exp_p5_dex_evade_poise', wedge: 'dex', theme: 'guile', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Willow Balance', '10% increased evasion; +14 poise.', m('evasion', 'increased', 0.10), m('poise', 'flat', 14)),
      n('a', 'small', 'Light Recovery', '14% increased poise regeneration; 6% increased movement speed.', m('poiseRegenPct', 'increased', 0.14), m('moveSpeed', 'increased', 0.06)),
      n('b', 'small', 'Rolling Footing', '+10% crowd-control avoidance while poised; 10% increased evasion.', m('poiseCcAvoid', 'flat', 0.10), m('evasion', 'increased', 0.10)),
      procNode('', 'notable', 'nimble_footing', 'Balanced Recovery', 'Evading an attack restores 15% of maximum poise; 22% increased poise regeneration; 15% increased evasion.', '#b8bd83', {
        trigger: 'evade', icd: 2.5,
        effect: { type: 'restore', resource: 'poise', pctMax: 0.15 },
      }, m('poiseRegenPct', 'increased', 0.22), m('evasion', 'increased', 0.15)),
    ],
  },

  // =========================================================================
  // FINESSE — PASS 5 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p5_fin_poison_bleed', wedge: 'fin', theme: 'entropy', shape: 'fork', pass: 5,
    nodes: [
      n('entry', 'small', 'Dirty Edge', '+8% chance to inflict bleed; +8% chance to inflict poison.', m('apply_bleed', 'flat', 0.08), m('apply_poison', 'flat', 0.08)),
      n('a', 'small', 'Open-Wound Venom', '12% increased damage against bleeding enemies; 10% increased ailment magnitude.', m('damage', 'increased', 0.12, ['vs:bleed']), m('statusMagnitude', 'increased', 0.10)),
      n('b', 'small', 'Rotting Clot', '12% increased damage against poisoned enemies; +8% poison chance.', m('damage', 'increased', 0.12, ['vs:poison']), m('apply_poison', 'flat', 0.08)),
      n('', 'notable', 'Septic Blade', '+15% chance to inflict bleed and poison; 18% increased damage against bleeding enemies; 18% increased damage against poisoned enemies.', m('apply_bleed', 'flat', 0.15), m('apply_poison', 'flat', 0.15), m('damage', 'increased', 0.18, ['vs:bleed']), m('damage', 'increased', 0.18, ['vs:poison'])),
      n('tailA', 'notable', 'Festering Arteries', '+1 maximum ailment stack; 22% increased ailment magnitude; damaging ailments rupture for 18% of total damage on expiry.', m('ailmentStacks', 'flat', 1), m('statusMagnitude', 'increased', 0.22), m('dotRupture', 'flat', 0.18)),
      procNode('tailB', 'keystone', 'venomous_bleed', 'Venomous Exsanguination', 'Inflicting bleed automatically poisons the target; 20% increased ailment magnitude; 15% less hit damage.', '#a5b27c', {
        trigger: 'statusApply', status: 'bleed', icd: 0.6,
        effect: { type: 'status', status: 'poison', magnitude: 1.0 },
      }, m('statusMagnitude', 'increased', 0.20), m('damage', 'more', -0.15)),
    ],
  },
  {
    id: 'exp_p5_fin_shock_crit', wedge: 'fin', theme: 'lightning', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Arcing Nerve', '+10% chance to inflict shock; +2% critical strike chance.', m('apply_shock', 'flat', 0.10), m('critChance', 'flat', 0.02)),
      n('a', 'small', 'Live Wire', '+12% critical strike multiplier against shocked enemies; +3% apex strike chance.', m('critMulti', 'flat', 0.12, ['vs:shock']), m('overcritChance', 'flat', 0.03)),
      n('b', 'small', 'Static Edge', '+3% critical strike chance against shocked enemies; 8% increased lightning damage.', m('critChance', 'flat', 0.03, ['vs:shock']), m('damage', 'increased', 0.08, ['lightning'])),
      n('', 'notable', 'Voltaic Precision', 'Against shocked enemies: +8% critical strike chance, +10% apex strike chance, and +25% critical strike multiplier.', m('critChance', 'flat', 0.08, ['vs:shock']), m('overcritChance', 'flat', 0.10, ['vs:shock']), m('critMulti', 'flat', 0.25, ['vs:shock'])),
    ],
  },
  {
    id: 'exp_p5_fin_move_ailment', wedge: 'fin', theme: 'guile', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Fleeting Cut', '10% increased ailment magnitude while moving; 6% increased movement speed.', m('statusMagnitude', 'increased', 0.10, undefined, 'moving'), m('moveSpeed', 'increased', 0.06)),
      n('a', 'small', 'Parting Sting', '+10% DoT rupture on expiry; 8% increased movement skill cooldown recovery.', m('dotRupture', 'flat', 0.10), m('cooldownRecovery', 'increased', 0.08, ['movement'])),
      n('b', 'small', 'Wandering Plague', '12% increased damage against afflicted enemies; 10% increased evasion.', m('damage', 'increased', 0.12, ['vs:afflicted']), m('evasion', 'increased', 0.10)),
      procNode('', 'notable', 'slip_rupture', 'Hit-and-Wither', 'For 5 seconds after using a movement skill: 25% increased ailment magnitude and +25% DoT rupture on expiry; 15% increased ailment magnitude while moving.', '#b8bd83', {
        trigger: 'cast', tags: ['movement'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_slip_rupture', duration: 5, mods: [m('statusMagnitude', 'increased', 0.25), m('dotRupture', 'flat', 0.25)] } },
      }, m('statusMagnitude', 'increased', 0.15, undefined, 'moving')),
    ],
  },

  // =========================================================================
  // INTELLIGENCE — PASS 5 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p5_int_chill_shock', wedge: 'int', theme: 'lightning', shape: 'fork', pass: 5,
    nodes: [
      n('entry', 'small', 'Rime & Volt', '8% increased cold and lightning damage; +8% chill and shock chance.', m('damage', 'increased', 0.08, ['cold']), m('damage', 'increased', 0.08, ['lightning']), m('apply_chill', 'flat', 0.08), m('apply_shock', 'flat', 0.08)),
      n('a', 'small', 'Frozen Conductor', '14% increased lightning damage against chilled enemies.', m('damage', 'increased', 0.14, ['lightning', 'vs:chill'])),
      n('b', 'small', 'Flash-Freeze Spark', '14% increased cold damage against shocked enemies.', m('damage', 'increased', 0.14, ['cold', 'vs:shock'])),
      n('', 'notable', 'Thermal Current', '20% increased lightning damage against chilled enemies; 20% increased cold damage against shocked enemies; +12% chill and shock chance.', m('damage', 'increased', 0.20, ['lightning', 'vs:chill']), m('damage', 'increased', 0.20, ['cold', 'vs:shock']), m('apply_chill', 'flat', 0.12), m('apply_shock', 'flat', 0.12)),
      n('tailA', 'notable', 'Supercooled Arc', '+12% cold penetration against shocked enemies; +12% lightning penetration against chilled enemies.', m('coldPen', 'flat', 0.12, ['vs:shock']), m('lightningPen', 'flat', 0.12, ['vs:chill'])),
      procNode('tailB', 'keystone', 'thermoelectric_arc', 'Thermoelectric Cascade', 'Inflicting chill automatically shocks the target; 16% increased cold and lightning damage; 15% less skill effect duration.', '#8cc6d3', {
        trigger: 'statusApply', status: 'chill', icd: 0.75,
        effect: { type: 'status', status: 'shock', magnitude: 1.0 },
      }, m('damage', 'increased', 0.16, ['cold']), m('damage', 'increased', 0.16, ['lightning']), m('effectDuration', 'more', -0.15)),
    ],
  },
  {
    id: 'exp_p5_int_es_crit', wedge: 'int', theme: 'arcana', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Prism Shell', '+14 maximum energy shield; +2% spell critical strike chance while you have energy shield.', m('energyShield', 'flat', 14), m('critChance', 'flat', 0.02, ['spell'], 'hasEs')),
      n('a', 'small', 'Faceted Glint', '+3% apex strike chance while you have energy shield; +10 maximum energy shield.', m('overcritChance', 'flat', 0.03, undefined, 'hasEs'), m('energyShield', 'flat', 10)),
      n('b', 'small', 'Unblemished Lens', '+15% spell critical strike multiplier while on full energy shield.', m('critMulti', 'flat', 0.15, ['spell'], 'fullEs')),
      n('', 'notable', 'Crystalline Verdict', 'While you have energy shield: +10% apex strike chance, +18% apex strike multiplier, and +4% spell critical strike chance; while at full energy shield: +20% spell crit multiplier.', m('overcritChance', 'flat', 0.10, undefined, 'hasEs'), m('overcritMulti', 'flat', 0.18, undefined, 'hasEs'), m('critChance', 'flat', 0.04, ['spell'], 'hasEs'), m('critMulti', 'flat', 0.20, ['spell'], 'fullEs')),
    ],
  },
  {
    id: 'exp_p5_int_mana_ward', wedge: 'int', theme: 'arcana', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Dry Wellspring', '14% increased ward gained while on low mana; +12 maximum energy shield.', m('wardGain', 'increased', 0.14, undefined, 'lowMana'), m('energyShield', 'flat', 12)),
      n('a', 'small', 'Siphon Reserve', '14% increased energy shield recharge rate while on low mana; +14 maximum mana.', m('esRechargeRate', 'increased', 0.14, undefined, 'lowMana'), m('mana', 'flat', 14)),
      n('b', 'small', 'Spent Shell', '12% slower ward decay; 10% increased mana regeneration.', m('wardDecay', 'more', -0.12), m('manaRegen', 'increased', 0.10)),
      procNode('', 'notable', 'empty_chalice_ward', 'Hollow Chalice Aegis', 'Dropping to low mana restores 15% of maximum energy shield and immediately restarts energy shield recharge; while on low mana: 30% increased ward gained and 25% increased ES recharge rate.', '#9eacdc', {
        trigger: 'condition', condition: 'lowMana', icd: 8,
        effect: { type: 'restore', resource: 'es', pctMax: 0.15, resetEsDelay: true },
      }, m('wardGain', 'increased', 0.30, undefined, 'lowMana'), m('esRechargeRate', 'increased', 0.25, undefined, 'lowMana')),
    ],
  },

  // =========================================================================
  // WILLPOWER — PASS 5 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p5_wil_overdrive_chaos', wedge: 'wil', theme: 'entropy', shape: 'fork', pass: 5,
    nodes: [
      n('entry', 'small', 'Borrowed Void', '+10% overdrive debt limit; 8% increased chaos damage.', m('overdriveCap', 'flat', 0.10), m('damage', 'increased', 0.08, ['chaos'])),
      n('a', 'small', 'Eager Repayment', '12% faster overdrive recovery; 6% increased cast speed.', m('overdriveRecovery', 'increased', 0.12), m('castSpeed', 'increased', 0.06)),
      n('b', 'small', 'Spent Spite', '12% increased chaos damage while on low mana; +4% chaos penetration.', m('damage', 'increased', 0.12, ['chaos'], 'lowMana'), m('chaosPen', 'flat', 0.04)),
      n('', 'notable', 'Debt-Fed Entropy', '+22% overdrive debt limit; 20% faster overdrive recovery; while on low mana: 20% increased chaos damage and 12% increased cast speed.', m('overdriveCap', 'flat', 0.22), m('overdriveRecovery', 'increased', 0.20), m('damage', 'increased', 0.20, ['chaos'], 'lowMana'), m('castSpeed', 'increased', 0.12, undefined, 'lowMana')),
      n('tailA', 'notable', 'Spiteful Repayment', '+30% overdrive repayment flow while casting; +10% chaos penetration; 16% increased chaos ailment magnitude.', m('overdriveFlow', 'flat', 0.30), m('chaosPen', 'flat', 0.10), m('statusMagnitude', 'increased', 0.16, ['chaos'])),
      n('tailB', 'notable', 'Abyssal Credit', '+35% overdrive debt limit; 15% more chaos damage; 20% faster overdrive recovery; skills cost 20% more mana.', m('overdriveCap', 'flat', 0.35), m('damage', 'more', 0.15, ['chaos']), m('overdriveRecovery', 'increased', 0.20), m('manaCost', 'more', 0.20)),
    ],
  },
  {
    id: 'exp_p5_wil_burn_corpse', wedge: 'wil', theme: 'fire', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Dry Tallow', '+10% chance to inflict burn; 10% increased corpse skill damage.', m('apply_burn', 'flat', 0.10), m('damage', 'increased', 0.10, ['corpse'])),
      n('a', 'small', 'Crematory Heat', '12% increased fire damage against burning enemies; 8% increased fire area of effect.', m('damage', 'increased', 0.12, ['fire', 'vs:burn']), m('aoeRadius', 'increased', 0.08, ['fire'])),
      n('b', 'small', 'Stacked Pyre', '10% increased corpse skill damage; 10% increased fire damage.', m('damage', 'increased', 0.10, ['corpse']), m('damage', 'increased', 0.10, ['fire'])),
      procNode('', 'notable', 'cremation_pyre', 'Cinder-Bier', 'Slaying a burning enemy erupts in a fiery blast around you; +8% fire penetration; 18% increased corpse skill damage.', '#dca07a', {
        trigger: 'kill', vs: ['burn'], icd: 0.6,
        effect: { type: 'burst', damage: 'fire', base: 26, perLevel: 4, radius: 135 },
      }, m('firePen', 'flat', 0.08), m('damage', 'increased', 0.18, ['corpse'])),
    ],
  },
  {
    id: 'exp_p5_wil_curse_leech', wedge: 'wil', theme: 'entropy', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Leeching Sigil', '+1% spell life leech against afflicted enemies; 8% increased ward gained.', m('lifeLeech', 'flat', 0.01, ['spell', 'vs:afflicted']), m('wardGain', 'increased', 0.08)),
      n('a', 'small', 'Hollow Drain', '+1% energy shield leech against afflicted enemies; +10% curse rupture.', m('esLeech', 'flat', 0.01, ['vs:afflicted']), m('curseRupture', 'flat', 0.10)),
      n('b', 'small', 'Vampiric Hex', '10% increased curse area of effect; 10% increased chaos damage.', m('aoeRadius', 'increased', 0.10, ['curse']), m('damage', 'increased', 0.10, ['chaos'])),
      n('', 'notable', 'Siphoning Hex', '+2.5% spell life leech and +2% spell energy shield leech against afflicted enemies; +22% curse rupture; 16% increased ward gained.', m('lifeLeech', 'flat', 0.025, ['spell', 'vs:afflicted']), m('esLeech', 'flat', 0.02, ['spell', 'vs:afflicted']), m('curseRupture', 'flat', 0.22), m('wardGain', 'increased', 0.16)),
    ],
  },

  // =========================================================================
  // WISDOM — PASS 5 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p5_wis_death_spell', wedge: 'wis', theme: 'host', shape: 'fork', pass: 5,
    nodes: [
      n('entry', 'small', 'Parting Ember', '8% increased spell damage; 10% increased minion maximum life.', m('damage', 'increased', 0.08, ['spell']), m('minionLife', 'increased', 0.10)),
      n('a', 'small', 'Cycle of Bone', '10% faster persistent minion respawn; 1% increased spell damage for each recent minion death (up to 25).', m('minionRespawnTime', 'more', -0.10), g('damage', 'increased', 0.01, 'recentMinionDeaths', ['spell'])),
      n('b', 'small', 'Soul Relay', '6% increased cast speed; 8% increased cooldown recovery.', m('castSpeed', 'increased', 0.06), m('cooldownRecovery', 'increased', 0.08)),
      procNode('', 'notable', 'funeral_surge', 'Funeral Surge', 'When a minion dies, gain 24% increased spell damage and 16% increased cast speed for 5 seconds; 15% increased minion life.', '#b4a0d2', {
        trigger: 'minionDeath', icd: 2.5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_funeral_surge', duration: 5, mods: [m('damage', 'increased', 0.24, ['spell']), m('castSpeed', 'increased', 0.16)] } },
      }, m('minionLife', 'increased', 0.15)),
      procNode('tailA', 'notable', 'funeral_cooldown', 'Borrowed Hourglass', 'When a minion dies, reduce active skill cooldowns by 1.2 seconds; 18% faster persistent minion respawn.', '#8fbeb8', {
        trigger: 'minionDeath', icd: 3.5,
        effect: { type: 'cooldown', seconds: 1.2 },
      }, m('minionRespawnTime', 'more', -0.18)),
      n('tailB', 'keystone', 'Necrotic Dynamo', '2.5% more spell damage and +3% spell critical strike multiplier for each recent minion death (up to 25); -1 maximum minion; skills cost 10% more mana.', g('damage', 'more', 0.025, 'recentMinionDeaths', ['spell']), g('critMulti', 'flat', 0.03, 'recentMinionDeaths', ['spell']), m('minionMaxCount', 'flat', -1), m('manaCost', 'more', 0.10)),
    ],
  },
  {
    id: 'exp_p5_wis_heal_minion', wedge: 'wis', theme: 'nature', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Shared Sap', '10% increased healing power; 10% increased minion life.', m('healPower', 'increased', 0.10), m('minionLife', 'increased', 0.10)),
      n('a', 'small', 'Keeper\'s Tithe', '12% increased offering share; 6% less damage taken by minions.', m('offeringShare', 'flat', 0.12), m('minionDamageTaken', 'more', -0.06)),
      n('b', 'small', 'Living Canopy', '+0.8% minion life regenerated per second; +10 maximum life.', m('minionRegenPct', 'flat', 0.008), m('life', 'flat', 10)),
      procNode('', 'notable', 'sanctuary_flock', 'Shepherd\'s Balm', 'When healing lands on you, grant your minions 22% increased damage and 12% less damage taken for 5 seconds; 18% increased offering share; 12% increased healing power.', '#9dbb8b', {
        trigger: 'heal', icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_sanctuary_flock', duration: 5, mods: [m('minionDamage', 'increased', 0.22), m('minionDamageTaken', 'more', -0.12)] } },
      }, m('offeringShare', 'flat', 0.18), m('healPower', 'increased', 0.12)),
    ],
  },
  {
    id: 'exp_p5_wis_storm_summon', wedge: 'wis', theme: 'lightning', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Cloud-Spurred Pack', '10% increased storm skill damage; 8% increased minion action speed.', m('damage', 'increased', 0.10, ['storm']), m('minionHaste', 'increased', 0.08)),
      n('a', 'small', 'Static Collar', '10% increased minion damage; 8% increased storm area of effect.', m('minionDamage', 'increased', 0.10), m('aoeRadius', 'increased', 0.08, ['storm'])),
      n('b', 'small', 'Thunder Muster', '8% increased cast speed with summon skills; 10% increased conjure damage.', m('castSpeed', 'increased', 0.08, ['summon']), m('damage', 'increased', 0.10, ['conjure'])),
      procNode('', 'notable', 'tempest_flock', 'Storm-Spurred Host', 'Casting a storm skill electrifies your minions for 5 seconds, granting 25% increased minion action speed and 22% increased minion damage; 15% increased storm damage; 12% increased minion damage.', '#8cc6d3', {
        trigger: 'cast', tags: ['storm'], icd: 4.5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_tempest_flock', duration: 5, mods: [m('minionHaste', 'increased', 0.25), m('minionDamage', 'increased', 0.22)] } },
      }, m('damage', 'increased', 0.15, ['storm']), m('minionDamage', 'increased', 0.12)),
    ],
  },

  // =========================================================================
  // CHARISMA — PASS 5 (3 wheels, 14 nodes)
  // =========================================================================
  {
    id: 'exp_p5_cha_insight_overdrive', wedge: 'cha', theme: 'chorus', shape: 'fork', pass: 5,
    nodes: [
      n('entry', 'small', 'Composed Debt', '+8 insight; 12% faster overdrive recovery.', m('insight', 'flat', 8), m('overdriveRecovery', 'increased', 0.12)),
      n('a', 'small', 'Poised Credit', '10% increased insight efficiency; +8% overdrive debt limit.', m('insightEfficiency', 'increased', 0.10), m('overdriveCap', 'flat', 0.08)),
      n('b', 'small', 'Steady Tempo', '12% increased insight regeneration; 8% increased cooldown recovery.', m('insightRegenPct', 'increased', 0.12), m('cooldownRecovery', 'increased', 0.08)),
      n('', 'notable', 'Clear-Headed Credit', '+16 insight; 18% increased insight efficiency; 25% faster overdrive recovery; 10% increased cooldown recovery.', m('insight', 'flat', 16), m('insightEfficiency', 'increased', 0.18), m('overdriveRecovery', 'increased', 0.25), m('cooldownRecovery', 'increased', 0.10)),
      n('tailA', 'notable', 'Lucid Margin', '20% slower insight taper; +16% overdrive debt limit; +12% insight penetration.', m('insightTaper', 'more', -0.20), m('overdriveCap', 'flat', 0.16), m('insightPen', 'flat', 0.12)),
      n('tailB', 'keystone', 'Lucid Credit', 'Gain insight equal to 12% of your baseline maximum mana; your maximum energy shield becomes 0.', link('insight', 'mana', 0.12), m('energyShield', 'override', 0)),
    ],
  },
  {
    id: 'exp_p5_cha_buff_crit', wedge: 'cha', theme: 'fortune', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Gilded Verse', '+1% critical strike chance per active buff on you; 8% increased buff duration.', g('critChance', 'flat', 0.01, 'buffs'), m('effectDuration', 'increased', 0.08, ['buff'])),
      n('a', 'small', 'Charmed Mantle', '+3% luck per active buff on you; +8% critical strike multiplier.', g('luck', 'flat', 0.03, 'buffs'), m('critMulti', 'flat', 0.08)),
      n('b', 'small', 'Stacked Favor', '+3% critical strike multiplier per active buff on you; 8% increased buff duration.', g('critMulti', 'flat', 0.03, 'buffs'), m('effectDuration', 'increased', 0.08, ['buff'])),
      n('', 'notable', 'Crowned Chorus', 'Gain +2% critical strike chance, +6% critical strike multiplier, and +4% luck per active buff on you.', g('critChance', 'flat', 0.02, 'buffs'), g('critMulti', 'flat', 0.06, 'buffs'), g('luck', 'flat', 0.04, 'buffs')),
    ],
  },
  {
    id: 'exp_p5_cha_song_curse', wedge: 'cha', theme: 'chorus', shape: 'diamond', pass: 5,
    nodes: [
      n('entry', 'small', 'Hushed Note', '+10% chance to inflict silence with song and curse skills; 8% increased song area of effect.', m('apply_silence', 'flat', 0.10, ['song']), m('apply_silence', 'flat', 0.10, ['curse']), m('aoeRadius', 'increased', 0.08, ['song'])),
      n('a', 'small', 'Muted Prey', '14% increased damage against silenced enemies; 8% increased curse area of effect.', m('damage', 'increased', 0.14, ['vs:silence']), m('aoeRadius', 'increased', 0.08, ['curse'])),
      n('b', 'small', 'Dissonant Bar', '10% increased song damage; 10% increased chaos damage.', m('damage', 'increased', 0.10, ['song']), m('damage', 'increased', 0.10, ['chaos'])),
      n('', 'notable', 'Dirge of Silence', '+20% chance to inflict silence with song and curse skills; 25% increased damage against silenced enemies; 16% increased song and curse area of effect.', m('apply_silence', 'flat', 0.20, ['song']), m('apply_silence', 'flat', 0.20, ['curse']), m('damage', 'increased', 0.25, ['vs:silence']), m('aoeRadius', 'increased', 0.16, ['song']), m('aoeRadius', 'increased', 0.16, ['curse'])),
    ],
  },
];
