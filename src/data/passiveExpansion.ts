// ---------------------------------------------------------------------------
// PASSIVE TREE EXPANSION — coherent multi-node ARPG wheels, conversions,
// tag & skill bridges, attribute/overcap scaling lanes, trailing payoff
// notables, and build-defining keystones.
//
// Each cluster defines reusable node payloads + its zero-corridor planar
// wheel shape ('diamond' = 4 nodes, 'fork' = 6 nodes with 2 trailing payoff
// leaves, 'tiered' = 7 nodes with two compounding tiers). Placement into the
// Star lives explicitly in src/data/passives.ts; combat never reads node IDs.
// ---------------------------------------------------------------------------

import {
  gaugeGateMod as gate,
  gaugeMod as g,
  linkIncMod as linkInc,
  linkMod as link,
  mod as m,
} from '../engine/stats';
import {
  EXPANSION_PROCS,
  n,
  procNode,
  unlessMod,
  type ExpansionCluster,
  type ExpansionKind,
  type ExpansionNodeSpec,
  type ExpansionPass,
  type ExpansionShape,
} from './passiveExpansionBase';
import { PASS3_CLUSTERS } from './passiveExpansionPass3';
import { PASS4_CLUSTERS } from './passiveExpansionPass4';
import { PASS5_CLUSTERS } from './passiveExpansionPass5';
import { PASS7_CLUSTERS } from './passiveExpansionPass7';
import { PASS8_CLUSTERS } from './passiveExpansionPass8';
import { PASS9_CLUSTERS } from './passiveExpansionPass9';
import { PASS10_CLUSTERS } from './passiveExpansionPass10';
import { PASS11_CLUSTERS } from './passiveExpansionPass11';
import { PASS12_CLUSTERS } from './passiveExpansionPass12';
import { PASS13_CLUSTERS } from './passiveExpansionPass13';
import { PASS14_CLUSTERS } from './passiveExpansionPass14';
import { PASS15_CLUSTERS } from './passiveExpansionPass15';
import { PASS16_CLUSTERS } from './passiveExpansionPass16';
import { PASS17_CLUSTERS } from './passiveExpansionPass17';
import { PASS18_CLUSTERS } from './passiveExpansionPass18';
import { PASS19_CLUSTERS } from './passiveExpansionPass19';

export {
  EXPANSION_PROCS,
  unlessMod,
  type ExpansionCluster,
  type ExpansionKind,
  type ExpansionNodeSpec,
  type ExpansionPass,
  type ExpansionShape,
};

/** Returns the expansion pass (1..5, 7..19) that introduced a given cluster. */
export function expansionClusterPass(cluster: ExpansionCluster, index?: number): ExpansionPass {
  if (cluster.pass) return cluster.pass;
  if (cluster.id.startsWith('exp_p19_')) return 19;
  if (cluster.id.startsWith('exp_p18_')) return 18;
  if (cluster.id.startsWith('exp_p17_')) return 17;
  if (cluster.id.startsWith('exp_p16_')) return 16;
  if (cluster.id.startsWith('exp_p15_')) return 15;
  if (cluster.id.startsWith('exp_p14_')) return 14;
  if (cluster.id.startsWith('exp_p13_')) return 13;
  if (cluster.id.startsWith('exp_p12_')) return 12;
  if (cluster.id.startsWith('exp_p11_')) return 11;
  if (cluster.id.startsWith('exp_p10_')) return 10;
  if (cluster.id.startsWith('exp_p9_')) return 9;
  if (cluster.id.startsWith('exp_p8_')) return 8;
  if (cluster.id.startsWith('exp_p7_')) return 7;
  if (cluster.id.startsWith('exp_p3_')) return 3;
  if (cluster.id.startsWith('exp_p4_')) return 4;
  if (cluster.id.startsWith('exp_p5_')) return 5;
  return (index !== undefined && index >= 60) ? 2 : 1;
}

const PASS1_AND_2_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // INTELLIGENCE WEDGE (10 clusters, 54 nodes)
  // =========================================================================
  {
    id: 'exp_int_epiphany', wedge: 'int', theme: 'arcana', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Lucid Spark', '6% increased spell critical strike chance; 6% increased elemental damage.', m('critChance', 'increased', 0.06, ['spell']), m('damage', 'increased', 0.06, ['fire']), m('damage', 'increased', 0.06, ['cold']), m('damage', 'increased', 0.06, ['lightning'])),
      n('a1', 'small', 'Focused Prism', '+2% spell critical strike chance.', m('critChance', 'flat', 0.02, ['spell'])),
      n('b1', 'small', 'Clear Sight', '+10% critical strike multiplier with spells.', m('critMulti', 'flat', 0.10, ['spell'])),
      n('mid', 'notable', 'Refracted Focus', '+4% spell critical strike chance; +15% spell critical strike multiplier; +12 maximum mana.', m('critChance', 'flat', 0.04, ['spell']), m('critMulti', 'flat', 0.15, ['spell']), m('mana', 'flat', 12)),
      n('a2', 'small', 'Shatter Resist', '+3% fire, cold, and lightning penetration.', m('firePen', 'flat', 0.03), m('coldPen', 'flat', 0.03), m('lightningPen', 'flat', 0.03)),
      n('b2', 'small', 'Keen Insight', '+2% spell critical strike chance; 4% increased cast speed.', m('critChance', 'flat', 0.02, ['spell']), m('castSpeed', 'increased', 0.04)),
      n('', 'keystone', 'Piercing Epiphany', 'Your critical strikes ignore positive enemy elemental resistances; -25% critical strike multiplier.', m('critIgnoreRes', 'flat', 1), m('critMulti', 'flat', -0.25)),
    ],
  },
  {
    id: 'exp_int_scholar', wedge: 'int', theme: 'arcana', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Candlelit Study', '+14 maximum mana; 6% increased mana regeneration.', m('mana', 'flat', 14), m('manaRegen', 'increased', 0.06)),
      n('a', 'small', 'Measured Vessel', '8% increased maximum mana.', m('mana', 'increased', 0.08)),
      n('b', 'small', 'Scholarly Discipline', '+12 maximum energy shield; 4% increased spell damage.', m('energyShield', 'flat', 12), m('damage', 'increased', 0.04, ['spell'])),
      n('', 'notable', 'Grand Arcanist', '2% increased spell damage and +5 maximum mana per 10 Intelligence.', g('damage', 'increased', 0.02, 'attr10:intelligence', ['spell']), g('mana', 'flat', 5, 'attr10:intelligence')),
      n('tailA', 'notable', 'Aegis of Mind', '16% of incoming damage is taken from mana before life; +1% maximum mana regenerated per second.', m('manaShield', 'flat', 0.16), m('manaRegenPct', 'flat', 0.01)),
      n('tailB', 'notable', 'Arcane Reservoir', 'Gain 0.04% increased spell damage per point of maximum mana; +0.02 flat damage per point of maximum mana.', linkInc('damage', 'mana', 0.0004, ['spell']), m('maxManaDamage', 'flat', 0.02)),
    ],
  },
  {
    id: 'exp_int_stormcaller', wedge: 'int', theme: 'lightning', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Gathering Front', '8% increased storm skill damage.', m('damage', 'increased', 0.08, ['storm'])),
      n('a', 'small', 'Cloudcalling', '8% increased conjure skill area of effect.', m('aoeRadius', 'increased', 0.08, ['conjure'])),
      n('b', 'small', 'Barometric Drop', '8% increased storm skill duration.', m('effectDuration', 'increased', 0.08, ['storm'])),
      procNode('', 'notable', 'eye_of_storm', 'Tempest Weaver', 'Casting a storm skill grants 12% increased cast speed and 16% increased storm damage for 5 seconds; 10% increased conjure skill damage.', '#8cc6d3', {
        trigger: 'cast', tags: ['storm'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_eye_of_storm', duration: 5, mods: [m('castSpeed', 'increased', 0.12), m('damage', 'increased', 0.16, ['storm'])] } },
      }, m('damage', 'increased', 0.10, ['conjure'])),
      n('tailA', 'notable', 'Squall-Break', 'Storm skills call +1 additional strike; 10% increased conjure skill damage.', m('stormCount', 'flat', 1), m('damage', 'increased', 0.10, ['conjure'])),
      n('tailB', 'notable', 'Thunderhead Surge', '35% of a storm\'s strikes crash immediately; 15% increased storm area of effect.', m('stormImmediate', 'flat', 0.35), m('aoeRadius', 'increased', 0.15, ['storm'])),
    ],
  },
  {
    id: 'exp_int_pyro_conv', wedge: 'int', theme: 'fire', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Kindled Rime', '10% of cold damage converted to fire.', m('convert_cold_fire', 'flat', 0.10)),
      n('a1', 'small', 'Frost-to-Flame', '10% of cold damage converted to fire.', m('convert_cold_fire', 'flat', 0.10)),
      n('b1', 'small', 'Thermal Shear', 'Gain 4% of cold damage as extra fire damage.', m('gainAs_cold_fire', 'flat', 0.04)),
      n('mid', 'notable', 'Cinder Alchemist', '15% of cold damage converted to fire; gain 5% of cold damage as extra fire damage; +12% fire resistance.', m('convert_cold_fire', 'flat', 0.15), m('gainAs_cold_fire', 'flat', 0.05), m('fireRes', 'flat', 0.12)),
      n('a2', 'small', 'Furnace Wall', '+10% fire resistance; 6% increased fire damage.', m('fireRes', 'flat', 0.10), m('damage', 'increased', 0.06, ['fire'])),
      n('b2', 'small', 'Overheated Air', '1.5% increased fire damage per 5% overcapped fire resistance.', g('damage', 'increased', 0.015, 'overcap5:fire', ['fire'])),
      n('', 'notable', 'White-Hot Hearth', '35% of cold damage converted to fire; +3% maximum fire resistance; -5% maximum cold resistance.', m('convert_cold_fire', 'flat', 0.35), m('fireResMax', 'flat', 0.03), m('coldResMax', 'flat', -0.05)),
    ],
  },
  {
    id: 'exp_int_phys_spell', wedge: 'int', theme: 'arcana', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Kinetic Syllable', '8% increased physical spell damage.', m('damage', 'increased', 0.08, ['physical', 'spell'])),
      n('a', 'small', 'Weight of Words', 'Adds 1 (+0.25 per character level) physical damage to spells.', m('addedPhysical', 'flat', 1, ['spell']), g('addedPhysical', 'flat', 0.25, 'level', ['spell'])),
      n('b', 'small', 'Shear Grammar', '+5% armor penetration with spells.', m('armorPen', 'flat', 0.05, ['spell'])),
      n('', 'notable', 'Force Sculptor', 'Adds 2 (+0.55 per character level) physical damage to spells; +10% armor penetration with spells.', m('addedPhysical', 'flat', 2, ['spell']), g('addedPhysical', 'flat', 0.55, 'level', ['spell']), m('armorPen', 'flat', 0.10, ['spell'])),
      n('tailA', 'notable', 'Concussive Incantation', 'Spells deal 25% increased poise damage and gain +45 knockback strength.', m('poiseDamage', 'increased', 0.25, ['spell']), m('knockback', 'flat', 45, ['spell'])),
      n('tailB', 'notable', 'Rending Verse', 'Physical spells rend +1 additional ply and impale enemies for 20% of physical damage.', m('plyRend', 'flat', 1, ['physical', 'spell']), m('impalePower', 'flat', 0.20, ['spell'])),
    ],
  },
  {
    id: 'exp_int_ward_bridge', wedge: 'int', theme: 'arcana', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Aegis Seam', '10% increased ward gained; +10 maximum energy shield.', m('wardGain', 'increased', 0.10), m('energyShield', 'flat', 10)),
      n('a', 'small', 'Resonant Shell', '10% increased energy shield recharge rate.', m('esRechargeRate', 'increased', 0.10)),
      n('b', 'small', 'Slow Dissolution', '8% slower ward decay.', m('wardDecay', 'more', -0.08)),
      procNode('', 'notable', 'ward_shatter', 'Shattered Aegis', 'When your ward breaks, restore 15% of maximum energy shield and immediately begin energy shield recharge; 12% increased ward gained.', '#9eacdc', {
        trigger: 'wardBreak', icd: 5,
        effect: { type: 'restore', resource: 'es', pctMax: 0.15, resetEsDelay: true },
      }, m('wardGain', 'increased', 0.12)),
      n('tailA', 'notable', 'Lattice Conduit', '25% increased energy shield recharge rate; 20% faster energy shield recharge start; 15% increased ward gained.', m('esRechargeRate', 'increased', 0.25), m('esRechargeDelay', 'increased', -0.20), m('wardGain', 'increased', 0.15)),
      n('tailB', 'notable', 'Woven Shroud', '20% increased ward gained; 12% slower ward decay; +12% spell damage while you have ward.', m('wardGain', 'increased', 0.20), m('wardDecay', 'more', -0.12), m('damage', 'increased', 0.12, ['spell'], 'hasWard')),
    ],
  },
  {
    id: 'exp_int_volt_arc', wedge: 'int', theme: 'lightning', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Ionized Gust', '8% increased lightning damage.', m('damage', 'increased', 0.08, ['lightning'])),
      n('a', 'small', 'Spark Gap', '+2% lightning critical strike chance.', m('critChance', 'flat', 0.02, ['lightning'])),
      n('b', 'small', 'Crackling Gap', '+8% chance to inflict shock.', m('apply_shock', 'flat', 0.08)),
      procNode('', 'notable', 'voltaic_arc', 'Voltaic Conduit', 'Lightning critical strikes arc to 2 nearby enemies for 45% of hit damage; +6% lightning penetration.', '#ffe14a', {
        trigger: 'hit', crit: true, tags: ['lightning'], icd: 1.5,
        effect: { type: 'arc', damageScale: 0.45, range: 200, hops: 2 },
      }, m('lightningPen', 'flat', 0.06)),
    ],
  },
  {
    id: 'exp_int_elem_shift', wedge: 'int', theme: 'cold', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Cold Grounding', '6% of lightning damage from hits is taken as cold.', m('takenAs_lightning_cold', 'flat', 0.06)),
      n('a', 'small', 'Rime Insulation', '6% of lightning damage from hits is taken as cold; +5% cold resistance.', m('takenAs_lightning_cold', 'flat', 0.06), m('coldRes', 'flat', 0.05)),
      n('b', 'small', 'Frost Mantle', '+8% cold resistance; +10 maximum energy shield.', m('coldRes', 'flat', 0.08), m('energyShield', 'flat', 10)),
      n('', 'notable', 'Glacial Insulation', '12% of lightning damage from hits is taken as cold; +2% maximum cold resistance; +12% cold resistance.', m('takenAs_lightning_cold', 'flat', 0.12), m('coldResMax', 'flat', 0.02), m('coldRes', 'flat', 0.12)),
    ],
  },
  {
    id: 'exp_int_channel_surge', wedge: 'int', theme: 'arcana', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Held Focus', '8% increased damage while channeling.', m('damage', 'increased', 0.08, undefined, 'channeling')),
      n('a', 'small', 'Sustained Current', '6% increased cast speed while channeling.', m('castSpeed', 'increased', 0.06, undefined, 'channeling')),
      n('b', 'small', 'Sustained Breath', '+0.8% maximum mana regenerated per second while channeling.', m('manaRegenPct', 'flat', 0.008, undefined, 'channeling')),
      n('', 'notable', 'Focused Cadence', 'While channeling: 18% increased damage, 12% increased cast speed, and 25% chance for hits not to interrupt energy shield recharge.', m('damage', 'increased', 0.18, undefined, 'channeling'), m('castSpeed', 'increased', 0.12, undefined, 'channeling'), m('esRechargeSteadfast', 'flat', 0.25, undefined, 'channeling')),
    ],
  },
  {
    id: 'exp_int_overcap_cold', wedge: 'int', theme: 'cold', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Winter Surplus', '+10% cold resistance.', m('coldRes', 'flat', 0.10)),
      n('a', 'small', 'Deep Frost', '+8% cold resistance; 6% increased cold damage.', m('coldRes', 'flat', 0.08), m('damage', 'increased', 0.06, ['cold'])),
      n('b', 'small', 'Crystalline Chill', '+5% cold penetration.', m('coldPen', 'flat', 0.05)),
      n('', 'notable', 'Permafrost Saturation', '+15% cold resistance; gain 2% increased cold damage and +0.5% cold penetration per 5% overcapped cold resistance.', m('coldRes', 'flat', 0.15), g('damage', 'increased', 0.02, 'overcap5:cold', ['cold']), g('coldPen', 'flat', 0.005, 'overcap5:cold')),
    ],
  },

  // =========================================================================
  // CHARISMA WEDGE (10 clusters, 54 nodes)
  // =========================================================================
  {
    id: 'exp_cha_sovereign', wedge: 'cha', theme: 'chorus', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Bearing the Standard', '8% increased aura area of effect; 6% increased buff duration.', m('aoeRadius', 'increased', 0.08, ['aura']), m('effectDuration', 'increased', 0.06, ['buff'])),
      n('a1', 'small', 'Rousing Voice', '10% increased buff and aura duration.', m('effectDuration', 'increased', 0.10, ['aura']), m('effectDuration', 'increased', 0.10, ['buff'])),
      n('b1', 'small', 'Noble Carriage', '2% increased ward gained per 10 Charisma.', g('wardGain', 'increased', 0.02, 'attr10:charisma')),
      n('mid', 'notable', 'Sovereign Presence', '1.5% increased damage and 2% increased aura area of effect per 10 Charisma; +15% command discipline.', g('damage', 'increased', 0.015, 'attr10:charisma'), g('aoeRadius', 'increased', 0.02, 'attr10:charisma', ['aura']), m('commandDiscipline', 'flat', 0.15)),
      n('a2', 'small', 'Layered Benediction', '3% increased damage per buff on you.', g('damage', 'increased', 0.03, 'buffs')),
      n('b2', 'small', 'Ceremonial Poise', '10% increased cooldown recovery for aura and buff skills.', m('cooldownRecovery', 'increased', 0.10, ['aura']), m('cooldownRecovery', 'increased', 0.10, ['buff'])),
      n('', 'keystone', 'Sole Standard', '+2 maximum active duration auras; 6% increased damage and 6% increased ward gained per buff on you; you cannot summon minions or deploy constructs.', m('durationAuraCap', 'flat', 2), g('damage', 'increased', 0.06, 'buffs'), g('wardGain', 'increased', 0.06, 'buffs'), m('minionMaxCount', 'override', 0), m('constructMaxCount', 'override', 0)),
    ],
  },
  {
    id: 'exp_cha_radiant_heal', wedge: 'cha', theme: 'life', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Merciful Hands', '10% increased healing power.', m('healPower', 'increased', 0.10)),
      n('a1', 'small', 'Gentle Cadence', '8% increased cast speed with healing skills.', m('castSpeed', 'increased', 0.08, ['heal'])),
      n('b1', 'small', 'Brimming Cup', '10% of overhealing is hardened into ward.', m('overheal', 'flat', 0.10)),
      procNode('mid', 'notable', 'sanctuary_hymn', 'Sanctuary Hymn', 'Using a healing skill grants ward equal to 8% of your maximum life; 15% increased healing power.', '#ce8793', {
        trigger: 'cast', tags: ['heal'], icd: 4,
        effect: { type: 'ward', pctMaxLife: 0.08 },
      }, m('healPower', 'increased', 0.15)),
      n('a2', 'small', 'Radiant Spill', '12% of overhealing is hardened into ward.', m('overheal', 'flat', 0.12)),
      n('b2', 'small', 'Warded Grace', '8% increased damage while you have ward.', m('damage', 'increased', 0.08, undefined, 'hasWard')),
      n('', 'notable', 'Overflowing Chalice', '35% of overhealing is hardened into ward; 20% increased healing power; while you have ward, gain 14% increased damage and 10% increased cast speed.', m('overheal', 'flat', 0.35), m('healPower', 'increased', 0.20), m('damage', 'increased', 0.14, undefined, 'hasWard'), m('castSpeed', 'increased', 0.10, undefined, 'hasWard')),
    ],
  },
  {
    id: 'exp_cha_pack_echo', wedge: 'cha', theme: 'chorus', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Keeper\'s Vigil', '8% increased minion life; +0.5% minion life regenerated per second.', m('minionLife', 'increased', 0.08), m('minionRegenPct', 'flat', 0.005)),
      n('a', 'small', 'Tended Hearth', '10% increased healing received; 8% increased minion damage.', m('healTaken', 'increased', 0.10), m('minionDamage', 'increased', 0.08)),
      n('b', 'small', 'Close Flock', '8% increased minion movement speed; 8% increased minion life.', m('minionMoveSpeed', 'increased', 0.08), m('minionLife', 'increased', 0.08)),
      procNode('', 'notable', 'shepherd_rally', 'Shepherd\'s Rally', 'When you are healed, your minions gain 18% increased damage and 12% increased action speed for 4 seconds; 10% increased minion life.', '#c9a0c2', {
        trigger: 'heal', icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_shepherd_rally', duration: 4, mods: [m('minionDamage', 'increased', 0.18), m('minionHaste', 'increased', 0.12)] } },
      }, m('minionLife', 'increased', 0.10)),
      n('tailA', 'notable', 'Mended Ranks', 'Minions regenerate 1.5% of maximum life per second and have 18% increased maximum life.', m('minionRegenPct', 'flat', 0.015), m('minionLife', 'increased', 0.18)),
      n('tailB', 'notable', 'Shared Grace', '8% of your hit damage heals nearby allies; 25% of your minion offering buffs also apply to you.', m('vampiricShare', 'flat', 0.08), m('offeringShare', 'flat', 0.25)),
    ],
  },
  {
    id: 'exp_cha_buff_conductor', wedge: 'cha', theme: 'chorus', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Measured Tempo', '6% increased buff duration.', m('effectDuration', 'increased', 0.06, ['buff'])),
      n('a', 'small', 'Quickened Pulse', '4% increased attack and cast speed.', m('attackSpeed', 'increased', 0.04), m('castSpeed', 'increased', 0.04)),
      n('b', 'small', 'Carried Rhythm', '3% increased movement speed.', m('moveSpeed', 'increased', 0.03)),
      procNode('', 'notable', 'harmonic_crescendo', 'Harmonic Crescendo', 'Gaining a buff grants a stacking Harmonic Crescendo (up to 4 stacks for 5 seconds): +4% attack speed, +4% cast speed, and +3% movement speed per stack.', '#c9a0c2', {
        trigger: 'buffGain', icd: 2,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_harmonic_crescendo', duration: 5, maxStacks: 4, mods: [m('attackSpeed', 'increased', 0.04), m('castSpeed', 'increased', 0.04), m('moveSpeed', 'increased', 0.03)] } },
      }),
    ],
  },
  {
    id: 'exp_cha_insight_bridge', wedge: 'cha', theme: 'chorus', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Watchful Step', '+10 maximum insight; 6% increased evasion.', m('insight', 'flat', 10), m('evasion', 'increased', 0.06)),
      n('a', 'small', 'Graceful Read', '12% increased insight recovery rate.', m('insightRegenPct', 'increased', 0.12)),
      n('b', 'small', 'Feint and Slip', '12% increased insight efficiency.', m('insightEfficiency', 'increased', 0.12)),
      procNode('', 'notable', 'foresight_evade', 'Foresight\'s Dance', '25% of evasion is read as maximum insight; 15% of evasion forgone. Evading an attack grants 25% increased insight efficiency and 14% increased damage for 4 seconds.', '#c9a0c2', {
        trigger: 'evade', icd: 3,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_foresight_evade', duration: 4, mods: [m('insightEfficiency', 'increased', 0.25), m('damage', 'increased', 0.14)] } },
      }, m('evasionToInsight', 'flat', 0.25), m('evasionToInsightForgo', 'flat', 0.15)),
      n('tailA', 'notable', 'Still Sight', '25% longer insight taper; 20% increased insight recovery rate; +18 maximum insight.', m('insightTaper', 'increased', 0.25), m('insightRegenPct', 'increased', 0.20), m('insight', 'flat', 18)),
      n('tailB', 'notable', 'Cutting Read', 'Your hits penetrate 20% of enemy insight; +4% critical strike chance.', m('insightPen', 'flat', 0.20), m('critChance', 'flat', 0.04)),
    ],
  },
  {
    id: 'exp_cha_chrono', wedge: 'cha', theme: 'time', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Kept Hour', '8% increased cooldown recovery.', m('cooldownRecovery', 'increased', 0.08)),
      n('a', 'small', 'Chrono Cadence', '8% increased chrono skill damage and duration.', m('damage', 'increased', 0.08, ['chrono']), m('effectDuration', 'increased', 0.08, ['chrono'])),
      n('b', 'small', 'Wound Spring', '8% increased skill-charge recovery.', m('skillChargeRate', 'increased', 0.08)),
      procNode('', 'notable', 'temporal_echo', 'Temporal Conductor', 'Casting a chrono skill reduces your other active cooldowns by 1.2 seconds; 12% increased cooldown recovery.', '#8fbeb8', {
        trigger: 'cast', tags: ['chrono'], icd: 5,
        effect: { type: 'cooldown', seconds: 1.2, exceptSelf: true },
      }, m('cooldownRecovery', 'increased', 0.12)),
      n('tailA', 'notable', 'Stretched Moment', '18% increased skill effect duration; 18% increased chrono area of effect.', m('effectDuration', 'increased', 0.18), m('aoeRadius', 'increased', 0.18, ['chrono'])),
      n('tailB', 'notable', 'Stolen Heartbeat', '18% increased skill-charge recovery; 15% increased cooldown recovery for chrono skills.', m('skillChargeRate', 'increased', 0.18), m('cooldownRecovery', 'increased', 0.15, ['chrono'])),
    ],
  },
  {
    id: 'exp_cha_mimic', wedge: 'cha', theme: 'arcana', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Studied Gesture', '10% increased mimic skill damage.', m('damage', 'increased', 0.10, ['mimic'])),
      n('a', 'small', 'Quick Study', '8% increased cast speed with mimic skills.', m('castSpeed', 'increased', 0.08, ['mimic'])),
      n('b', 'small', 'Expanded Ledger', '+1 mimic repertoire slot.', m('mimicBank', 'flat', 1)),
      n('', 'notable', 'Mirror Scholar', '+1 mimic repertoire slot; 22% increased mimic skill damage; 16% increased mimic cooldown recovery and area of effect.', m('mimicBank', 'flat', 1), m('damage', 'increased', 0.22, ['mimic']), m('cooldownRecovery', 'increased', 0.16, ['mimic']), m('aoeRadius', 'increased', 0.16, ['mimic'])),
    ],
  },
  {
    id: 'exp_cha_ultimate', wedge: 'cha', theme: 'fortune', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Building Drama', '10% increased ultimate gauge gain.', m('gaugeGain', 'increased', 0.10)),
      n('a', 'small', 'Curtain Call', '10% increased ultimate skill damage.', m('damage', 'increased', 0.10, ['ultimate'])),
      n('b', 'small', 'Stage Presence', '10% increased ultimate area of effect.', m('aoeRadius', 'increased', 0.10, ['ultimate'])),
      procNode('', 'notable', 'grand_finale', 'Crescendo of Will', 'Casting an ultimate skill grants 18% more damage and 25% increased ward gained for 6 seconds; 12% increased ultimate gauge gain.', '#d3be8b', {
        trigger: 'cast', tags: ['ultimate'], icd: 8,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_grand_finale', duration: 6, mods: [m('damage', 'more', 0.18), m('wardGain', 'increased', 0.25)] } },
      }, m('gaugeGain', 'increased', 0.12)),
      n('tailA', 'notable', 'Rising Ovation', '20% increased ultimate gauge gain; 20% shorter ultimate lockout.', m('gaugeGain', 'increased', 0.20), m('gaugeLockout', 'more', -0.20)),
      n('tailB', 'notable', 'Encore', '24% increased ultimate skill damage; 18% increased ultimate area of effect.', m('damage', 'increased', 0.24, ['ultimate']), m('aoeRadius', 'increased', 0.18, ['ultimate'])),
    ],
  },
  {
    id: 'exp_cha_curse_choir', wedge: 'cha', theme: 'chorus', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Lamentation', '8% increased song damage; 8% increased curse area of effect.', m('damage', 'increased', 0.08, ['song']), m('aoeRadius', 'increased', 0.08, ['curse'])),
      n('a', 'small', 'Carrying Refrain', '10% increased song area of effect.', m('aoeRadius', 'increased', 0.10, ['song'])),
      n('b', 'small', 'Lingering Hex', '10% increased curse duration.', m('effectDuration', 'increased', 0.10, ['curse'])),
      n('', 'notable', 'Dirge Chorus', '16% increased song damage; 16% increased curse and song area of effect; +0.8% maximum mana regenerated per second.', m('damage', 'increased', 0.16, ['song']), m('aoeRadius', 'increased', 0.16, ['curse']), m('aoeRadius', 'increased', 0.16, ['song']), m('manaRegenPct', 'flat', 0.008)),
    ],
  },
  {
    id: 'exp_cha_ward_bastion', wedge: 'cha', theme: 'chorus', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Gilded Veil', '10% increased ward gained.', m('wardGain', 'increased', 0.10)),
      n('a', 'small', 'Light Footing', '8% increased evasion; 3% increased movement speed.', m('evasion', 'increased', 0.08), m('moveSpeed', 'increased', 0.03)),
      n('b', 'small', 'Held Sheen', '8% slower ward decay.', m('wardDecay', 'more', -0.08)),
      procNode('', 'notable', 'shattered_halo', 'Shattered Halo', 'When your ward breaks, gain 18% increased movement speed and 25% increased evasion for 4 seconds; 14% increased ward gained.', '#c9a0c2', {
        trigger: 'wardBreak', icd: 5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_shattered_halo', duration: 4, mods: [m('moveSpeed', 'increased', 0.18), m('evasion', 'increased', 0.25)] } },
      }, m('wardGain', 'increased', 0.14)),
    ],
  },

  // =========================================================================
  // DEXTERITY WEDGE (10 clusters, 52 nodes)
  // =========================================================================
  {
    id: 'exp_dex_windrunner', wedge: 'dex', theme: 'cold', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Cold Draw', '8% of physical damage converted to cold; 6% increased projectile damage.', m('convert_physical_cold', 'flat', 0.08), m('damage', 'increased', 0.06, ['projectile'])),
      n('a1', 'small', 'Winter Fletching', '8% of physical damage converted to cold; 6% increased projectile speed.', m('convert_physical_cold', 'flat', 0.08), m('projectileSpeed', 'increased', 0.06)),
      n('b1', 'small', 'Gale Quiver', '1.5% increased projectile damage and +10 accuracy per 10 Dexterity.', g('damage', 'increased', 0.015, 'attr10:dexterity', ['projectile']), g('accuracy', 'flat', 10, 'attr10:dexterity')),
      n('mid', 'notable', 'Gale-Borne Archer', '12% of physical damage converted to cold; 2% increased projectile damage and +12 evasion per 10 Dexterity.', m('convert_physical_cold', 'flat', 0.12), g('damage', 'increased', 0.02, 'attr10:dexterity', ['projectile']), g('evasion', 'flat', 12, 'attr10:dexterity')),
      n('a2', 'small', 'Biting Flight', '+6% cold penetration with projectiles.', m('coldPen', 'flat', 0.06, ['projectile'])),
      n('b2', 'small', 'Rime Tip', 'Gain 4% of physical damage as extra cold damage with projectiles.', m('gainAs_physical_cold', 'flat', 0.04, ['projectile'])),
      n('', 'notable', 'Frostwind Volley', '30% of physical damage converted to cold; gain 6% of physical projectile damage as extra cold; +1 additional projectile; projectile skills cost 10% more mana; 20% less melee damage.', m('convert_physical_cold', 'flat', 0.30), m('gainAs_physical_cold', 'flat', 0.06, ['projectile']), m('projectileCount', 'flat', 1), m('manaCost', 'more', 0.10, ['projectile']), m('damage', 'more', -0.20, ['melee'])),
    ],
  },
  {
    id: 'exp_dex_totem_arch', wedge: 'dex', theme: 'devices', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Quick Stake', '10% faster totem placement; 6% increased totem damage.', m('totemPlaceTime', 'more', -0.10), m('damage', 'increased', 0.06, ['totem'])),
      n('a1', 'small', 'Oiled Pivot', '8% increased construct cast rate.', m('constructCastRate', 'increased', 0.08)),
      n('b1', 'small', 'Carved Post', '10% increased totem damage.', m('damage', 'increased', 0.10, ['totem'])),
      procNode('mid', 'notable', 'totem_overclock', 'Wound-Gear Totems', 'Placing a totem grants 20% increased construct cast rate and 15% increased totem damage for 5 seconds; 12% faster totem placement.', '#bbaa78', {
        trigger: 'cast', tags: ['totem'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_totem_overclock', duration: 5, mods: [m('constructCastRate', 'increased', 0.20), m('damage', 'increased', 0.15, ['totem'])] } },
      }, m('totemPlaceTime', 'more', -0.12)),
      n('a2', 'small', 'Stout Timber', '10% increased construct cast rate; 8% increased totem duration.', m('constructCastRate', 'increased', 0.10), m('effectDuration', 'increased', 0.08, ['totem'])),
      n('b2', 'small', 'Sightline Ward', '10% increased totem area of effect and projectile speed.', m('aoeRadius', 'increased', 0.10, ['totem']), m('projectileSpeed', 'increased', 0.10, ['totem'])),
      n('', 'notable', 'Master Totemic', '+1 maximum construct; 25% faster totem placement; your constructs taunt nearby enemies.', m('constructMaxCount', 'flat', 1), m('totemPlaceTime', 'more', -0.25), m('constructTaunt', 'flat', 1)),
    ],
  },
  {
    id: 'exp_dex_sapper', wedge: 'dex', theme: 'devices', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Tripwire Craft', '8% increased trap and mine damage.', m('damage', 'increased', 0.08, ['trap']), m('damage', 'increased', 0.08, ['mine'])),
      n('a', 'small', 'Short Fuse', '10% increased trap cooldown recovery.', m('cooldownRecovery', 'increased', 0.10, ['trap'])),
      n('b', 'small', 'Packed Powder', '10% increased mine area of effect.', m('aoeRadius', 'increased', 0.10, ['mine'])),
      procNode('', 'notable', 'sapper_chain', 'Sapper\'s Craft', 'Deploying a construct grants 16% increased construct area of effect and +8% construct critical strike chance for 4 seconds; 10% increased construct damage.', '#bbaa78', {
        trigger: 'cast', tags: ['construct'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_sapper_chain', duration: 4, mods: [m('aoeRadius', 'increased', 0.16, ['construct']), m('critChance', 'flat', 0.08, ['construct'])] } },
      }, m('damage', 'increased', 0.10, ['construct'])),
      n('tailA', 'notable', 'Hair-Trigger Snare', '18% increased trap damage; 15% increased trap cooldown recovery; 20% faster re-arming embeds.', m('damage', 'increased', 0.18, ['trap']), m('cooldownRecovery', 'increased', 0.15, ['trap']), m('embedIcd', 'more', -0.20)),
      n('tailB', 'notable', 'Demolition Fuse', '18% increased mine damage; 18% increased mine area of effect; 15% increased fused resolution power.', m('damage', 'increased', 0.18, ['mine']), m('aoeRadius', 'increased', 0.18, ['mine']), m('fusePower', 'increased', 0.15)),
    ],
  },
  {
    id: 'exp_dex_javelin', wedge: 'dex', theme: 'ranged', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Balanced Shaft', '8% increased javelin damage; 6% increased javelin projectile speed.', m('damage', 'increased', 0.08, ['javelin']), m('projectileSpeed', 'increased', 0.06, ['javelin'])),
      n('a', 'small', 'Honed Tip', '+10% impale effect with javelins.', m('impalePower', 'flat', 0.10, ['javelin'])),
      n('b', 'small', 'True Loft', '6% increased attack speed with javelins.', m('attackSpeed', 'increased', 0.06, ['javelin'])),
      n('', 'notable', 'Skyline Impaler', '18% increased javelin damage; +15% impale effect with javelins; +35 accuracy.', m('damage', 'increased', 0.18, ['javelin']), m('impalePower', 'flat', 0.15, ['javelin']), m('accuracy', 'flat', 35)),
      n('tailA', 'notable', 'Barbed Shaft', '+25% impale effect and +20% chance to inflict bleed with javelins.', m('impalePower', 'flat', 0.25, ['javelin']), m('apply_bleed', 'flat', 0.20, ['javelin'])),
      n('tailB', 'notable', 'Piercing Flight', 'Javelins pierce +1 additional target and travel 18% faster.', m('pierceCount', 'flat', 1, ['javelin']), m('projectileSpeed', 'increased', 0.18, ['javelin'])),
    ],
  },
  {
    id: 'exp_dex_iron_reflex', wedge: 'dex', theme: 'bastion', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Riveted Leather', '10% increased evasion; 10% increased armor.', m('evasion', 'increased', 0.10), m('armor', 'increased', 0.10)),
      n('a', 'small', 'Layered Scales', '+28 armor; 6% increased armor.', m('armor', 'flat', 28), m('armor', 'increased', 0.06)),
      n('b', 'small', 'Flexible Plates', '+24 evasion; +12 maximum life.', m('evasion', 'flat', 24), m('life', 'flat', 12)),
      n('', 'notable', 'Tempered Mail', '40% of your evasion is also read as armor; 30% of evasion forgone; +12% Graze chance.', m('evasionToArmor', 'flat', 0.40), m('evasionForgone', 'flat', 0.30), m('grazeChance', 'flat', 0.12)),
      n('tailA', 'notable', 'Weighted Stride', 'Gain 0.05% increased attack damage per point of armor; 16% increased armor.', linkInc('damage', 'armor', 0.0005, ['attack']), m('armor', 'increased', 0.16)),
      n('tailB', 'notable', 'Arrow-Catching Plate', 'Take 10% less damage from projectile hits; +5% block chance.', m('damageTaken', 'more', -0.10, ['projectile']), m('blockChance', 'flat', 0.05)),
    ],
  },
  {
    id: 'exp_dex_fissure_pulse', wedge: 'dex', theme: 'devices', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Fault Line', '8% increased fissure and pulse damage.', m('damage', 'increased', 0.08, ['fissure']), m('damage', 'increased', 0.08, ['pulse'])),
      n('a', 'small', 'Resonant Seam', '10% increased pulse area of effect.', m('aoeRadius', 'increased', 0.10, ['pulse'])),
      n('b', 'small', 'Split Ground', '10% increased fissure area of effect.', m('aoeRadius', 'increased', 0.10, ['fissure'])),
      n('', 'notable', 'Seismic Snare', '+1 additional fissure; +1 additional ground pulse; 14% increased fissure and pulse damage.', m('fissureCount', 'flat', 1), m('pulseCount', 'flat', 1), m('damage', 'increased', 0.14, ['fissure']), m('damage', 'increased', 0.14, ['pulse'])),
    ],
  },
  {
    id: 'exp_dex_phys_light', wedge: 'dex', theme: 'lightning', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Copper Broadhead', '10% of physical damage converted to lightning.', m('convert_physical_lightning', 'flat', 0.10)),
      n('a', 'small', 'Charged Vane', '10% of physical damage converted to lightning.', m('convert_physical_lightning', 'flat', 0.10)),
      n('b', 'small', 'Arced Tip', '+10% chance to inflict shock with projectiles.', m('apply_shock', 'flat', 0.10, ['projectile'])),
      n('', 'notable', 'Static Fletching', '15% of physical damage converted to lightning; gain 6% of physical projectile damage as extra lightning; +8% lightning penetration.', m('convert_physical_lightning', 'flat', 0.15), m('gainAs_physical_lightning', 'flat', 0.06, ['projectile']), m('lightningPen', 'flat', 0.08)),
    ],
  },
  {
    id: 'exp_dex_evade_counter', wedge: 'dex', theme: 'guile', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Side-Step', '10% increased evasion.', m('evasion', 'increased', 0.10)),
      n('a', 'small', 'Snap-Draw', '5% increased attack speed; +18 accuracy.', m('attackSpeed', 'increased', 0.05), m('accuracy', 'flat', 18)),
      n('b', 'small', 'Wind-Turned', '+1 (+0.20 per character level) life gained on evade; 6% increased evasion.', m('lifeOnEvade', 'flat', 1), g('lifeOnEvade', 'flat', 0.20, 'level'), m('evasion', 'increased', 0.06)),
      procNode('', 'notable', 'slipstream', 'Slipstream Riposte', 'Evading an attack grants +12% critical strike chance and 15% increased attack speed for 4 seconds; 12% increased evasion.', '#b8bd83', {
        trigger: 'evade', icd: 2.5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_slipstream', duration: 4, mods: [m('critChance', 'flat', 0.12), m('attackSpeed', 'increased', 0.15)] } },
      }, m('evasion', 'increased', 0.12)),
    ],
  },
  {
    id: 'exp_dex_projectile_def', wedge: 'dex', theme: 'ranged', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Crosswind Eye', 'Take 3% less damage from projectile hits.', m('damageTaken', 'more', -0.03, ['projectile'])),
      n('a', 'small', 'Loose Stance', '+6% area hit avoidance.', m('areaAvoidance', 'flat', 0.06)),
      n('b', 'small', 'Deflecting Cloak', '10% increased evasion; 3% increased movement speed.', m('evasion', 'increased', 0.10), m('moveSpeed', 'increased', 0.03)),
      n('', 'notable', 'Windscreen Stance', 'Take 8% less damage from projectile hits; +12% area hit avoidance; 14% increased evasion.', m('damageTaken', 'more', -0.08, ['projectile']), m('areaAvoidance', 'flat', 0.12), m('evasion', 'increased', 0.14)),
    ],
  },
  {
    id: 'exp_dex_munition_conv', wedge: 'dex', theme: 'fire', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Brimstone Load', '10% of physical munition damage converted to fire.', m('convert_physical_fire', 'flat', 0.10, ['munition'])),
      n('a', 'small', 'Hot Primer', '8% increased reload speed; 6% increased fire damage.', m('reloadSpeed', 'increased', 0.08), m('damage', 'increased', 0.06, ['fire'])),
      n('b', 'small', 'Scorched Shot', '+10% chance to inflict burn with munitions.', m('apply_burn', 'flat', 0.10, ['munition'])),
      n('', 'notable', 'Incendiary Shell', '25% of physical munition damage converted to fire; gain 6% of physical munition damage as extra fire; +20% chance to inflict burn with munitions.', m('convert_physical_fire', 'flat', 0.25, ['munition']), m('gainAs_physical_fire', 'flat', 0.06, ['munition']), m('apply_burn', 'flat', 0.20, ['munition'])),
    ],
  },

  // =========================================================================
  // STRENGTH WEDGE (5 clusters, 30 nodes)
  // =========================================================================
  {
    id: 'exp_str_unerring', wedge: 'str', theme: 'impact', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Heavy Swing', '8% increased melee physical damage.', m('damage', 'increased', 0.08, ['melee', 'physical'])),
      n('a1', 'small', 'Sure Grip', '+25 accuracy; 5% increased attack damage.', m('accuracy', 'flat', 25), m('damage', 'increased', 0.05, ['attack'])),
      n('b1', 'small', 'Shouldered Weight', '1.5% increased melee damage per 10 Strength.', g('damage', 'increased', 0.015, 'attr10:strength', ['melee'])),
      n('mid', 'notable', 'Titan\'s Heft', '3% increased melee damage and +15 accuracy per 10 Strength; +15 maximum life.', g('damage', 'increased', 0.03, 'attr10:strength', ['melee']), g('accuracy', 'flat', 15, 'attr10:strength'), m('life', 'flat', 15)),
      n('a2', 'small', 'Flat Blow', '10% increased attack damage.', m('damage', 'increased', 0.10, ['attack'])),
      n('b2', 'small', 'Steadied Stance', '+6% armor penetration with melee attacks.', m('armorPen', 'flat', 0.06, ['melee'])),
      n('', 'keystone', 'Unerring Might', 'Your attacks cannot be evaded and deal 12% more damage, but you cannot deal critical strikes.', m('cannotMiss', 'flat', 1), m('critChance', 'override', 0), m('damage', 'more', 0.12, ['attack'])),
    ],
  },
  {
    id: 'exp_str_hearthforge', wedge: 'str', theme: 'fire', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Forge Heat', '10% of physical damage converted to fire.', m('convert_physical_fire', 'flat', 0.10)),
      n('a1', 'small', 'Quenched Steel', '10% of physical damage converted to fire.', m('convert_physical_fire', 'flat', 0.10)),
      n('b1', 'small', 'Smelter\'s Apron', '+10% fire resistance; 6% increased fire damage.', m('fireRes', 'flat', 0.10), m('damage', 'increased', 0.06, ['fire'])),
      n('mid', 'notable', 'Hearthsmith', '15% of physical damage converted to fire; gain 5% of physical melee damage as extra fire; +12% fire resistance.', m('convert_physical_fire', 'flat', 0.15), m('gainAs_physical_fire', 'flat', 0.05, ['melee']), m('fireRes', 'flat', 0.12)),
      n('a2', 'small', 'Stoked Coals', '+6% fire penetration.', m('firePen', 'flat', 0.06)),
      n('b2', 'small', 'Heat Tolerance', '+12% fire resistance; +12 maximum life.', m('fireRes', 'flat', 0.12), m('life', 'flat', 12)),
      n('', 'notable', 'Crucible Conversion', '35% of physical damage converted to fire; +8% fire penetration; 2% increased fire damage per 5% overcapped fire resistance.', m('convert_physical_fire', 'flat', 0.35), m('firePen', 'flat', 0.08), g('damage', 'increased', 0.02, 'overcap5:fire', ['fire'])),
    ],
  },
  {
    id: 'exp_str_fissure_quake', wedge: 'str', theme: 'impact', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Cracked Stone', '8% increased fissure damage; 8% increased poise damage.', m('damage', 'increased', 0.08, ['fissure']), m('poiseDamage', 'increased', 0.08)),
      n('a', 'small', 'Deep Fracture', '10% increased fissure area of effect.', m('aoeRadius', 'increased', 0.10, ['fissure'])),
      n('b', 'small', 'Heavy Break', '12% increased sunder duration.', m('sunderDuration', 'increased', 0.12)),
      procNode('', 'notable', 'aftershock_pulse', 'Earthsplitter', 'Breaking an enemy\'s poise unleashes a physical shockwave around you; 18% increased poise damage.', '#cc8b63', {
        trigger: 'poiseBreakDealt', icd: 3,
        effect: { type: 'burst', damage: 'physical', base: 24, perLevel: 4, radius: 135 },
      }, m('poiseDamage', 'increased', 0.18)),
      n('tailA', 'notable', 'Shatterplate', 'Melee hits rend +1 additional ply and penetrate 12% of enemy armor.', m('plyRend', 'flat', 1, ['melee']), m('armorPen', 'flat', 0.12, ['melee'])),
      n('tailB', 'notable', 'Tectonic Fault', '+1 fissure branch; 18% increased fissure area of effect and damage.', m('fissureBranches', 'flat', 1), m('aoeRadius', 'increased', 0.18, ['fissure']), m('damage', 'increased', 0.18, ['fissure'])),
    ],
  },
  {
    id: 'exp_str_pure_phys', wedge: 'str', theme: 'impact', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Clean Iron', '8% increased physical damage.', m('damage', 'increased', 0.08, ['physical'])),
      n('a', 'small', 'Spiked Edge', '+10% impale effect.', m('impalePower', 'flat', 0.10)),
      n('b', 'small', 'Brute Leverage', 'Adds 1 (+0.25 per character level) physical damage to melee attacks.', m('addedPhysical', 'flat', 1, ['melee']), g('addedPhysical', 'flat', 0.25, 'level', ['melee'])),
      n('', 'notable', 'Brutal Honesty', '18% increased physical damage; +10% armor penetration; +8% chance to deal double damage against poise-broken enemies.', m('damage', 'increased', 0.18, ['physical']), m('armorPen', 'flat', 0.10), m('doubleDamageChance', 'flat', 0.08, ['vs:poiseBroken'])),
      n('tailA', 'notable', 'Driven Iron', '+25% impale effect and +2 (+0.55 per character level) added physical damage with melee attacks.', m('impalePower', 'flat', 0.25, ['melee']), m('addedPhysical', 'flat', 2, ['melee']), g('addedPhysical', 'flat', 0.55, 'level', ['melee'])),
      n('tailB', 'notable', 'Crushing Finale', '+10% chance to deal double damage with melee attacks; 18% increased melee poise damage.', m('doubleDamageChance', 'flat', 0.10, ['melee']), m('poiseDamage', 'increased', 0.18, ['melee'])),
    ],
  },
  {
    id: 'exp_str_melee_def', wedge: 'str', theme: 'bastion', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Hardened Pelt', 'Take 3% less damage from melee hits.', m('damageTaken', 'more', -0.03, ['melee'])),
      n('a', 'small', 'Braced Ribs', '+24 armor; +12 maximum life.', m('armor', 'flat', 24), m('life', 'flat', 12)),
      n('b', 'small', 'Shouldered Blow', '10% increased armor.', m('armor', 'increased', 0.10)),
      n('', 'notable', 'Iron Ribs', 'Take 8% less damage from melee hits; 16% increased armor; +24 maximum life.', m('damageTaken', 'more', -0.08, ['melee']), m('armor', 'increased', 0.16), m('life', 'flat', 24)),
    ],
  },

  // =========================================================================
  // FORTITUDE WEDGE (5 clusters, 28 nodes)
  // =========================================================================
  {
    id: 'exp_for_thorns_bastion', wedge: 'for', theme: 'bastion', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Burred Plate', '+3 (+0.8 per character level) thorns; 8% increased armor.', m('thorns', 'flat', 3), g('thorns', 'flat', 0.8, 'level'), m('armor', 'increased', 0.08)),
      n('a1', 'small', 'Blood-Fed Spikes', 'Gain 1.5% of maximum life as flat thorns.', link('thorns', 'life', 0.015)),
      n('b1', 'small', 'Jagged Rivets', '12% of landed hit damage taken is reflected back to the attacker.', m('thornsReflect', 'flat', 0.12)),
      procNode('mid', 'notable', 'iron_retort', 'Iron Retort', 'Blocking a hit unleashes a physical retaliation burst around you; gain 3% of maximum life as flat thorns.', '#a5bcc5', {
        trigger: 'block', icd: 2,
        effect: { type: 'burst', damage: 'physical', base: 20, perLevel: 3.5, radius: 120 },
      }, link('thorns', 'life', 0.03)),
      n('a2', 'small', 'Bristling Guard', '+4% block chance; +4 (+0.9 per character level) thorns.', m('blockChance', 'flat', 0.04), m('thorns', 'flat', 4), g('thorns', 'flat', 0.9, 'level')),
      n('b2', 'small', 'Spiked Gauntlet', '12% of landed hit damage taken is reflected back to the attacker; 8% increased guard strength.', m('thornsReflect', 'flat', 0.12), m('guardStrength', 'increased', 0.08)),
      n('', 'notable', 'Spined Rampart', '28% of hit damage taken is reflected back to the attacker; +8 (+2.0 per character level) thorns; 16% increased armor; 15% increased guard strength.', m('thornsReflect', 'flat', 0.28), m('thorns', 'flat', 8), g('thorns', 'flat', 2.0, 'level'), m('armor', 'increased', 0.16), m('guardStrength', 'increased', 0.15)),
    ],
  },
  {
    id: 'exp_for_elem_plate', wedge: 'for', theme: 'bastion', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Tempered Plate', '5% of physical damage from hits is taken as fire; 8% increased armor.', m('takenAs_physical_fire', 'flat', 0.05), m('armor', 'increased', 0.08)),
      n('a1', 'small', 'Kiln-Hardened', '5% of physical damage from hits is taken as fire; +6% fire resistance.', m('takenAs_physical_fire', 'flat', 0.05), m('fireRes', 'flat', 0.06)),
      n('b1', 'small', 'Heavy Cuirass', '+35 armor; 8% increased armor.', m('armor', 'flat', 35), m('armor', 'increased', 0.08)),
      n('mid', 'notable', 'Smelted Bulwark', '10% of physical damage from hits is taken as fire; +2% maximum fire resistance; 18% increased armor.', m('takenAs_physical_fire', 'flat', 0.10), m('fireResMax', 'flat', 0.02), m('armor', 'increased', 0.18)),
      n('a2', 'small', 'Dense Alloy', '+45 armor.', m('armor', 'flat', 45)),
      n('b2', 'small', 'Plate Discipline', '14% increased armor; +12 maximum life.', m('armor', 'increased', 0.14), m('life', 'flat', 12)),
      n('', 'keystone', 'Transcendent Iron', '65% of your armor also mitigates incoming elemental hits; 20% increased armor; -5% maximum fire, cold, and lightning resistance.', m('armorAppliesToElemental', 'flat', 0.65), m('armor', 'increased', 0.20), m('fireResMax', 'flat', -0.05), m('coldResMax', 'flat', -0.05), m('lightningResMax', 'flat', -0.05)),
    ],
  },
  {
    id: 'exp_for_grounded', wedge: 'for', theme: 'bastion', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Grounded Boots', '6% of lightning damage from hits is taken as physical.', m('takenAs_lightning_physical', 'flat', 0.06)),
      n('a', 'small', 'Earthing Spike', '6% of lightning damage from hits is taken as physical; +25 armor.', m('takenAs_lightning_physical', 'flat', 0.06), m('armor', 'flat', 25)),
      n('b', 'small', 'Stone Stance', 'Take 3% less damage from lightning hits.', m('damageTaken', 'more', -0.03, ['lightning'])),
      n('', 'notable', 'Earth-Grounded', '12% of lightning damage from hits is taken as physical; take 6% less damage from lightning hits; 16% increased armor.', m('takenAs_lightning_physical', 'flat', 0.12), m('damageTaken', 'more', -0.06, ['lightning']), m('armor', 'increased', 0.16)),
    ],
  },
  {
    id: 'exp_for_guard_master', wedge: 'for', theme: 'bastion', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Raised Buckler', '10% increased guard strength; +15 maximum endurance.', m('guardStrength', 'increased', 0.10), m('endurance', 'flat', 15)),
      n('a', 'small', 'Ready Arm', '10% increased guard cooldown recovery.', m('cooldownRecovery', 'increased', 0.10, ['guard'])),
      n('b', 'small', 'Enduring Grit', '+20 maximum endurance; 12% increased endurance recovery.', m('endurance', 'flat', 20), m('enduranceRegenPct', 'increased', 0.12)),
      n('', 'notable', 'Bastion Disciplinarian', '+45 maximum endurance; +5% endurance damage reduction; 18% increased armor while you have endurance.', m('endurance', 'flat', 45), m('enduranceDR', 'flat', 0.05), m('armor', 'increased', 0.18, undefined, 'hasEndurance')),
      n('tailA', 'notable', 'Counter-Stance', '+0.15s guard parry window; +25 maximum endurance; 18% increased armor if you have blocked recently; +0.4s "Recently" window.', m('guardParry', 'flat', 0.15), m('endurance', 'flat', 25), m('armor', 'increased', 0.18, undefined, 'recentlyBlocked'), m('recentlyWindow', 'flat', 0.4)),
      n('tailB', 'notable', 'Unbroken Wall', '+0.4s timed guard duration; 15% increased guard cooldown recovery; +1 (+0.30 per character level) life gained on block.', m('guardHoldTime', 'flat', 0.40), m('cooldownRecovery', 'increased', 0.15, ['guard']), m('lifeOnBlock', 'flat', 1), g('lifeOnBlock', 'flat', 0.30, 'level')),
    ],
  },
  {
    id: 'exp_for_fort_stack', wedge: 'for', theme: 'bastion', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Tempered Bone', '+18 armor; +10 maximum life.', m('armor', 'flat', 18), m('life', 'flat', 10)),
      n('a', 'small', 'Anvil Frame', '+8 armor per 10 Fortitude.', g('armor', 'flat', 8, 'attr10:fortitude')),
      n('b', 'small', 'Heavy Posture', '+3 maximum life per 10 Fortitude.', g('life', 'flat', 3, 'attr10:fortitude')),
      n('', 'notable', 'Living Anvil', '+12 armor and +4 maximum life per 10 Fortitude; gain 0.04% increased melee damage per point of armor.', g('armor', 'flat', 12, 'attr10:fortitude'), g('life', 'flat', 4, 'attr10:fortitude'), linkInc('damage', 'armor', 0.0004, ['melee'])),
    ],
  },

  // =========================================================================
  // PROWESS WEDGE (5 clusters, 25 nodes)
  // =========================================================================
  {
    id: 'exp_prw_double_edge', wedge: 'prw', theme: 'tempo', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Twin Beat', '5% increased attack speed; +2% chance to deal double damage.', m('attackSpeed', 'increased', 0.05), m('doubleDamageChance', 'flat', 0.02)),
      n('a1', 'small', 'Keen Rhythm', '+2% critical strike chance; +8% critical strike multiplier.', m('critChance', 'flat', 0.02), m('critMulti', 'flat', 0.08)),
      n('b1', 'small', 'Trained Reflex', '1.5% increased attack speed per 10 Prowess.', g('attackSpeed', 'increased', 0.015, 'attr10:prowess')),
      procNode('mid', 'notable', 'twin_tempo', 'Twin Tempo', 'Landing a critical strike grants +8% chance to deal double damage and 12% increased attack speed for 4 seconds; +2% critical strike multiplier per 10 Prowess.', '#d49a8e', {
        trigger: 'hit', crit: true, icd: 2.5,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_twin_tempo', duration: 4, mods: [m('doubleDamageChance', 'flat', 0.08), m('attackSpeed', 'increased', 0.12)] } },
      }, g('critMulti', 'flat', 0.02, 'attr10:prowess')),
      n('a2', 'small', 'Double-Strike Edge', '+4% chance to deal double damage.', m('doubleDamageChance', 'flat', 0.04)),
      n('b2', 'small', 'Sharp Cadence', '+12% critical strike multiplier; 4% increased attack speed.', m('critMulti', 'flat', 0.12), m('attackSpeed', 'increased', 0.04)),
      n('', 'notable', 'Twin-Edged Cadence', '+12% chance to deal double damage; +20% critical strike multiplier; 2% increased attack speed per 10 Prowess.', m('doubleDamageChance', 'flat', 0.12), m('critMulti', 'flat', 0.20), g('attackSpeed', 'increased', 0.02, 'attr10:prowess')),
    ],
  },
  {
    id: 'exp_prw_volt_strike', wedge: 'prw', theme: 'lightning', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Sparked Edge', '10% of physical damage converted to lightning.', m('convert_physical_lightning', 'flat', 0.10)),
      n('a', 'small', 'Live Wire Blade', '10% of physical damage converted to lightning.', m('convert_physical_lightning', 'flat', 0.10)),
      n('b', 'small', 'Flash Footwork', '6% increased attack speed with lightning skills.', m('attackSpeed', 'increased', 0.06, ['lightning'])),
      n('', 'notable', 'Stormblade Discipline', '15% of physical damage converted to lightning; gain 6% of physical melee damage as extra lightning.', m('convert_physical_lightning', 'flat', 0.15), m('gainAs_physical_lightning', 'flat', 0.06, ['melee'])),
      n('tailA', 'notable', 'Arcing Blade', '+8% lightning penetration and +20% chance to inflict shock with melee attacks.', m('lightningPen', 'flat', 0.08, ['melee']), m('apply_shock', 'flat', 0.20, ['melee'])),
      n('tailB', 'notable', 'Conductive Tempo', '12% increased attack speed and +6% critical strike chance with lightning skills.', m('attackSpeed', 'increased', 0.12, ['lightning']), m('critChance', 'flat', 0.06, ['lightning'])),
    ],
  },
  {
    id: 'exp_prw_poise_crit', wedge: 'prw', theme: 'tempo', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Guard-Breaker', '10% increased poise damage.', m('poiseDamage', 'increased', 0.10)),
      n('a', 'small', 'Exposed Seam', '+12% critical strike multiplier against poise-broken enemies.', m('critMulti', 'flat', 0.12, ['vs:poiseBroken'])),
      n('b', 'small', 'Clean Cut', '+2% critical strike chance.', m('critChance', 'flat', 0.02)),
      procNode('', 'notable', 'shatter_opening', 'Shatter Opening', 'Breaking an enemy\'s poise grants +18% critical strike chance and +35% critical strike multiplier for 4 seconds; 12% increased poise damage.', '#d49a8e', {
        trigger: 'poiseBreakDealt', icd: 3,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_shatter_opening', duration: 4, mods: [m('critChance', 'flat', 0.18), m('critMulti', 'flat', 0.35)] } },
      }, m('poiseDamage', 'increased', 0.12)),
    ],
  },
  {
    id: 'exp_prw_combo_flow', wedge: 'prw', theme: 'tempo', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Open Measure', '15% longer combo windows.', m('comboWindow', 'more', 0.15)),
      n('a', 'small', 'Varied Hand', '8% increased damage while your recent skills are varied.', m('damage', 'increased', 0.08, undefined, 'comboVaried')),
      n('b', 'small', 'Pressed Tempo', '6% increased attack speed while repeating a skill.', m('attackSpeed', 'increased', 0.06, undefined, 'comboRepeated')),
      n('', 'notable', 'Measured Sequence', '35% longer combo windows; 15% increased damage while varied; 14% increased attack speed while repeating.', m('comboWindow', 'more', 0.35), m('damage', 'increased', 0.15, undefined, 'comboVaried'), m('attackSpeed', 'increased', 0.14, undefined, 'comboRepeated')),
    ],
  },
  {
    id: 'exp_prw_overdrive', wedge: 'prw', theme: 'tempo', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Borrowed Momentum', '+6% overdrive debt limit; 8% increased overdrive recovery.', m('overdriveCap', 'flat', 0.06), m('overdriveRecovery', 'increased', 0.08)),
      n('a', 'small', 'Driven Pulse', '10% increased ultimate gauge gain.', m('gaugeGain', 'increased', 0.10)),
      n('b', 'small', 'Peak Tempo', '8% increased ultimate skill damage.', m('damage', 'increased', 0.08, ['ultimate'])),
      n('', 'notable', 'Fever-Pitch Pulse', '+15% overdrive debt limit; 20% increased overdrive recovery; 18% increased ultimate gauge gain; 15% increased ultimate damage.', m('overdriveCap', 'flat', 0.15), m('overdriveRecovery', 'increased', 0.20), m('gaugeGain', 'increased', 0.18), m('damage', 'increased', 0.15, ['ultimate'])),
    ],
  },

  // =========================================================================
  // FINESSE WEDGE (5 clusters, 25 nodes)
  // =========================================================================
  {
    id: 'exp_fin_frostblade', wedge: 'fin', theme: 'cold', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Rime Edge', '10% of physical damage converted to cold.', m('convert_physical_cold', 'flat', 0.10)),
      n('a1', 'small', 'Hoarfrost Steel', '10% of physical damage converted to cold.', m('convert_physical_cold', 'flat', 0.10)),
      n('b1', 'small', 'Cold Precision', '+8% chance to inflict chill; +2% cold critical strike chance.', m('apply_chill', 'flat', 0.08), m('critChance', 'flat', 0.02, ['cold'])),
      n('mid', 'notable', 'Glacial Duelist', '15% of physical damage converted to cold; gain 5% of physical melee damage as extra cold; +15% critical strike multiplier against chilled enemies.', m('convert_physical_cold', 'flat', 0.15), m('gainAs_physical_cold', 'flat', 0.05, ['melee']), m('critMulti', 'flat', 0.15, ['vs:chill'])),
      n('a2', 'small', 'Rime-Crack Seam', '+6% cold penetration.', m('coldPen', 'flat', 0.06)),
      n('b2', 'small', 'Numbed Guard', '10% increased damage against chilled enemies.', m('damage', 'increased', 0.10, ['vs:chill'])),
      n('', 'notable', 'Permafrost Pact', '35% of physical damage converted to cold; +10% cold penetration; +10% critical strike chance against chilled enemies.', m('convert_physical_cold', 'flat', 0.35), m('coldPen', 'flat', 0.10), m('critChance', 'flat', 0.10, ['vs:chill'])),
    ],
  },
  {
    id: 'exp_fin_ailment_pop', wedge: 'fin', theme: 'entropy', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Festering Cut', '10% increased ailment magnitude; +6% ailment chance.', m('statusMagnitude', 'increased', 0.10), m('statusChance', 'flat', 0.06)),
      n('a', 'small', 'Rupturing Toxin', '10% of expiring damaging ailments rupture as burst damage.', m('dotRupture', 'flat', 0.10)),
      n('b', 'small', 'Keen Contagion', '+15% ailment critical strike rate.', m('dotCrit', 'flat', 0.15)),
      procNode('', 'notable', 'virulent_pop', 'Virulent Catalyst', 'Inflicting a status grants 18% increased ailment magnitude and 10% increased attack speed for 4 seconds; 22% of expiring damaging ailments rupture.', '#a5b27c', {
        trigger: 'statusApply', icd: 3,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_virulent_pop', duration: 4, mods: [m('statusMagnitude', 'increased', 0.18), m('attackSpeed', 'increased', 0.10)] } },
      }, m('dotRupture', 'flat', 0.22)),
      n('tailA', 'notable', 'Venomous Eye', '+45% ailment critical strike rate; +6% critical strike chance.', m('dotCrit', 'flat', 0.45), m('critChance', 'flat', 0.06)),
      n('tailB', 'notable', 'Septic Spread', '20% of hit damage is forgone into ailments at +25% affliction yield; 25% chance for damaging ailments to propagate on kill.', m('hitToAffliction', 'flat', 0.20), m('afflictionYield', 'flat', 0.25), m('dotPropagates', 'flat', 0.25)),
    ],
  },
  {
    id: 'exp_fin_finesse_stack', wedge: 'fin', theme: 'guile', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Light Blade', '+2% critical strike chance; 8% increased evasion.', m('critChance', 'flat', 0.02), m('evasion', 'increased', 0.08)),
      n('a', 'small', 'Deftness', '+8 evasion per 10 Finesse.', g('evasion', 'flat', 8, 'attr10:finesse')),
      n('b', 'small', 'Vital Angle', '+1.5% critical strike multiplier per 10 Finesse.', g('critMulti', 'flat', 0.015, 'attr10:finesse')),
      n('', 'notable', 'Razor Poise', '+12 evasion and +2% critical strike multiplier per 10 Finesse; +4% critical strike chance.', g('evasion', 'flat', 12, 'attr10:finesse'), g('critMulti', 'flat', 0.02, 'attr10:finesse'), m('critChance', 'flat', 0.04)),
    ],
  },
  {
    id: 'exp_fin_chaos_edge', wedge: 'fin', theme: 'entropy', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Venom-Dipped', '10% of physical attack damage converted to chaos.', m('convert_physical_chaos', 'flat', 0.10, ['attack'])),
      n('a', 'small', 'Bitter Alloy', 'Gain 4% of physical attack damage as extra chaos.', m('gainAs_physical_chaos', 'flat', 0.04, ['attack'])),
      n('b', 'small', 'Creeping Bane', '+10% chance to inflict poison with attacks.', m('apply_poison', 'flat', 0.10, ['attack'])),
      n('', 'notable', 'Nightshade Edge', '20% of physical attack damage converted to chaos; gain 6% of physical attack damage as extra chaos; +8% chaos penetration; +15% chance to inflict poison with attacks.', m('convert_physical_chaos', 'flat', 0.20, ['attack']), m('gainAs_physical_chaos', 'flat', 0.06, ['attack']), m('chaosPen', 'flat', 0.08), m('apply_poison', 'flat', 0.15, ['attack'])),
    ],
  },
  {
    id: 'exp_fin_aoe_skirmish', wedge: 'fin', theme: 'guile', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Sweeping Arc', '8% increased area of effect; 6% increased area damage.', m('aoeRadius', 'increased', 0.08, ['aoe']), m('damage', 'increased', 0.06, ['aoe'])),
      n('a', 'small', 'Skirmish Stride', '10% increased evasion while moving.', m('evasion', 'increased', 0.10, undefined, 'moving')),
      n('b', 'small', 'Wide Step', '4% increased movement speed; 6% increased area of effect.', m('moveSpeed', 'increased', 0.04), m('aoeRadius', 'increased', 0.06, ['aoe'])),
      n('', 'notable', 'Whirling Reach', '16% increased area of effect and 14% increased area damage; 16% increased evasion while moving; 5% increased movement speed.', m('aoeRadius', 'increased', 0.16, ['aoe']), m('damage', 'increased', 0.14, ['aoe']), m('evasion', 'increased', 0.16, undefined, 'moving'), m('moveSpeed', 'increased', 0.05)),
    ],
  },

  // =========================================================================
  // WILLPOWER WEDGE (5 clusters, 26 nodes)
  // =========================================================================
  {
    id: 'exp_wil_chaos_mastery', wedge: 'wil', theme: 'entropy', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Unraveling Thread', '8% increased chaos damage.', m('damage', 'increased', 0.08, ['chaos'])),
      n('a1', 'small', 'Null Piercing', '+5% chaos penetration.', m('chaosPen', 'flat', 0.05)),
      n('b1', 'small', 'Void Tolerance', '+10% chaos resistance.', m('chaosRes', 'flat', 0.10)),
      n('mid', 'notable', 'Abyssal Scholar', '16% increased chaos damage; +8% chaos penetration; +12% chaos resistance.', m('damage', 'increased', 0.16, ['chaos']), m('chaosPen', 'flat', 0.08), m('chaosRes', 'flat', 0.12)),
      n('a2', 'small', 'Eroding Ward', '15% of your chaos damage over time bypasses energy shield.', m('esDotBypass', 'flat', 0.15, ['chaos'])),
      n('b2', 'small', 'Saturated Void', '1.5% increased chaos damage per 5% overcapped chaos resistance.', g('damage', 'increased', 0.015, 'overcap5:chaos', ['chaos'])),
      n('', 'notable', 'Entropic Dissolution', '+12% chaos penetration; 25% of chaos damage over time bypasses energy shield; 2% increased chaos damage per 5% overcapped chaos resistance.', m('chaosPen', 'flat', 0.12), m('esDotBypass', 'flat', 0.25, ['chaos']), g('damage', 'increased', 0.02, 'overcap5:chaos', ['chaos'])),
    ],
  },
  {
    id: 'exp_wil_hexweaver', wedge: 'wil', theme: 'entropy', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Muttered Omen', '10% increased curse duration; 8% increased curse area of effect.', m('effectDuration', 'increased', 0.10, ['curse']), m('aoeRadius', 'increased', 0.08, ['curse'])),
      n('a1', 'small', 'Heavy Mark', '12% curse rupture power.', m('curseRupture', 'flat', 0.12)),
      n('b1', 'small', 'Creeping Doom', '10% of armed doom ticks as chaos damage over time.', m('doomDot', 'flat', 0.10)),
      procNode('mid', 'notable', 'hex_ripple', 'Hexweaver\'s Cadence', 'Casting a curse grants 18% increased chaos damage and 12% increased cast speed for 5 seconds; 12% increased curse area of effect.', '#c45ae0', {
        trigger: 'cast', tags: ['curse'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_hex_ripple', duration: 5, mods: [m('damage', 'increased', 0.18, ['chaos']), m('castSpeed', 'increased', 0.12)] } },
      }, m('aoeRadius', 'increased', 0.12, ['curse'])),
      n('a2', 'small', 'Unsealed Hex', '10% increased cast speed with curses.', m('castSpeed', 'increased', 0.10, ['curse'])),
      n('b2', 'small', 'Bitter Reckoning', '12% curse rupture power; 8% increased chaos damage.', m('curseRupture', 'flat', 0.12), m('damage', 'increased', 0.08, ['chaos'])),
      n('', 'notable', 'Shattered Omen', '+30% curse rupture power; cursed areas detonate with Hex Blast; 20% of armed doom ticks as chaos damage over time.', m('curseRupture', 'flat', 0.30), m('hexBlast', 'flat', 1), m('doomDot', 'flat', 0.20)),
    ],
  },
  {
    id: 'exp_wil_abyssal_shift', wedge: 'wil', theme: 'cold', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Frost-Bound Veil', '6% of chaos damage from hits is taken as cold.', m('takenAs_chaos_cold', 'flat', 0.06)),
      n('a', 'small', 'Frozen Isolation', '6% of chaos damage from hits is taken as cold; +6% chaos resistance.', m('takenAs_chaos_cold', 'flat', 0.06), m('chaosRes', 'flat', 0.06)),
      n('b', 'small', 'Cold Seal', '+8% cold resistance; Take 3% less damage from chaos hits.', m('coldRes', 'flat', 0.08), m('damageTaken', 'more', -0.03, ['chaos'])),
      n('', 'notable', 'Abyssal Temper', '12% of chaos damage from hits is taken as cold; +3% maximum chaos resistance; take 6% less damage from chaos hits.', m('takenAs_chaos_cold', 'flat', 0.12), m('chaosResMax', 'flat', 0.03), m('damageTaken', 'more', -0.06, ['chaos'])),
    ],
  },
  {
    id: 'exp_wil_willpower_stack', wedge: 'wil', theme: 'entropy', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Steeled Nerve', '+12 maximum energy shield; 6% increased ailment magnitude.', m('energyShield', 'flat', 12), m('statusMagnitude', 'increased', 0.06)),
      n('a', 'small', 'Mental Lattice', '+6 maximum energy shield per 10 Willpower.', g('energyShield', 'flat', 6, 'attr10:willpower')),
      n('b', 'small', 'Focused Blight', '1.5% increased ailment magnitude per 10 Willpower.', g('statusMagnitude', 'increased', 0.015, 'attr10:willpower')),
      n('', 'notable', 'Iron Concentration', '+8 maximum energy shield and 2% increased ailment magnitude per 10 Willpower; 15% increased energy shield recharge rate.', g('energyShield', 'flat', 8, 'attr10:willpower'), g('statusMagnitude', 'increased', 0.02, 'attr10:willpower'), m('esRechargeRate', 'increased', 0.15)),
    ],
  },
  {
    id: 'exp_wil_possession', wedge: 'wil', theme: 'host', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Deep Seam', '10% increased possession duration.', m('possessDuration', 'increased', 0.10)),
      n('a', 'small', 'Borrowed Sinew', '+8% possessed might; 8% increased possession skill damage.', m('possessPower', 'flat', 0.08), m('damage', 'increased', 0.08, ['possession'])),
      n('b', 'small', 'Guarded Husk', '12% less damage taken by your vacated husk.', m('huskGuard', 'flat', 0.12)),
      n('', 'notable', 'Vessel Sovereign', '22% increased possession skill damage; 18% increased cooldown recovery if you have killed recently; 18% increased chaos damage if you have been hit recently; +0.6s "Recently" window.', m('damage', 'increased', 0.22, ['possession']), m('cooldownRecovery', 'increased', 0.18, undefined, 'recentlyKilled'), m('damage', 'increased', 0.18, ['chaos'], 'recentlyHurt'), m('recentlyWindow', 'flat', 0.6)),
    ],
  },

  // =========================================================================
  // WISDOM WEDGE (5 clusters, 27 nodes)
  // =========================================================================
  {
    id: 'exp_wis_shepherd', wedge: 'wis', theme: 'nature', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Kennel Bond', '8% increased companion damage and life.', m('minionDamage', 'increased', 0.08, ['companion']), m('minionLife', 'increased', 0.08, ['companion'])),
      n('a1', 'small', 'Shared Pulse', '6% of your hit damage heals your bonded companion.', m('bondShare', 'flat', 0.06)),
      n('b1', 'small', 'Wise Guidance', '2% increased minion life per 10 Wisdom.', g('minionLife', 'increased', 0.02, 'attr10:wisdom')),
      procNode('mid', 'notable', 'kindred_bond', 'Shepherd\'s Call', 'Using a companion skill grants 20% increased minion damage and +12% life bond share for 5 seconds; 2% increased minion damage per 10 Wisdom.', '#9dbb8b', {
        trigger: 'cast', tags: ['companion'], icd: 4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_kindred_bond', duration: 5, mods: [m('minionDamage', 'increased', 0.20), m('bondShare', 'flat', 0.12)] } },
      }, g('minionDamage', 'increased', 0.02, 'attr10:wisdom')),
      n('a2', 'small', 'Kennel Scent', '10% increased minion movement speed; 8% increased companion life.', m('minionMoveSpeed', 'increased', 0.10), m('minionLife', 'increased', 0.08, ['companion'])),
      n('b2', 'small', 'Steady Whistle', '10% increased companion skill cooldown recovery.', m('cooldownRecovery', 'increased', 0.10, ['companion'])),
      n('', 'notable', 'Kindred Oath', '+18% life bond share; 22% increased companion damage; 20% increased companion life; 3% increased minion life per 10 Wisdom.', m('bondShare', 'flat', 0.18), m('minionDamage', 'increased', 0.22, ['companion']), m('minionLife', 'increased', 0.20, ['companion']), g('minionLife', 'increased', 0.03, 'attr10:wisdom')),
    ],
  },
  {
    id: 'exp_wis_throng', wedge: 'wis', theme: 'nature', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Stirred Graves', '10% increased throng yield.', m('throngYield', 'increased', 0.10)),
      n('a', 'small', 'Deep Pockets', '10% increased throng minion life.', m('minionLife', 'increased', 0.10, ['throng'])),
      n('b', 'small', 'Marching Beat', '8% increased minion movement speed; 8% increased throng damage.', m('minionMoveSpeed', 'increased', 0.08), m('minionDamage', 'increased', 0.08, ['throng'])),
      n('', 'notable', 'Grave Rally', '22% increased throng minion damage; 14% increased throng minion movement speed; 20% increased throng yield.', m('minionDamage', 'increased', 0.22, ['throng']), m('minionMoveSpeed', 'increased', 0.14, ['throng']), m('throngYield', 'increased', 0.20)),
      n('tailA', 'notable', 'Risen Tide', '+1 maximum throng minion; 15% increased minion movement speed.', m('minionMaxCount', 'flat', 1, ['throng']), m('minionMoveSpeed', 'increased', 0.15)),
      n('tailB', 'notable', 'Packed Ranks', '+18% minion area hit avoidance; 16% increased throng minion life.', m('minionAreaAvoidance', 'flat', 0.18), m('minionLife', 'increased', 0.16, ['throng'])),
    ],
  },
  {
    id: 'exp_wis_death_bridge', wedge: 'wis', theme: 'host', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Toll of Bones', '8% increased corpse skill damage; 8% increased minion life.', m('damage', 'increased', 0.08, ['corpse']), m('minionLife', 'increased', 0.08)),
      n('a', 'small', 'Fresh Offering', '2% increased minion damage for each recent minion death (up to 25).', g('minionDamage', 'increased', 0.02, 'recentMinionDeaths')),
      n('b', 'small', 'Wagon Hand', '8% increased cast speed with corpse skills.', m('castSpeed', 'increased', 0.08, ['corpse'])),
      procNode('', 'notable', 'martyr_harvest', 'Martyr\'s Harvest', 'When a minion dies, restore 8% of maximum mana; minions expiring from duration count as dying.', '#b4a0d2', {
        trigger: 'minionDeath', icd: 2.5,
        effect: { type: 'restore', resource: 'mana', pctMax: 0.08 },
      }, m('minionExpiryIsDeath', 'flat', 1)),
      n('tailA', 'notable', 'Lingering Dirge', '+0.8s "Recently" window; 1.5% increased cast speed and 2% increased mana regeneration for each recent minion death (up to 25).', m('recentlyWindow', 'flat', 0.8), g('castSpeed', 'increased', 0.015, 'recentMinionDeaths'), g('manaRegen', 'increased', 0.02, 'recentMinionDeaths')),
      n('tailB', 'notable', 'Reaper\'s Wagon', '18% increased corpse skill area of effect; 14% increased cast speed with corpse skills; 18% increased minion death-effect power.', m('aoeRadius', 'increased', 0.18, ['corpse']), m('castSpeed', 'increased', 0.14, ['corpse']), m('minionDeathEffectPower', 'increased', 0.18)),
    ],
  },
  {
    id: 'exp_wis_tempest_rite', wedge: 'wis', theme: 'lightning', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Sleet Front', '8% increased storm damage.', m('damage', 'increased', 0.08, ['storm'])),
      n('a', 'small', 'Charged Hail', 'Gain 4% of cold storm damage as extra lightning.', m('gainAs_cold_lightning', 'flat', 0.04, ['storm'])),
      n('b', 'small', 'Enduring Squall', '10% increased storm duration.', m('effectDuration', 'increased', 0.10, ['storm'])),
      n('', 'notable', 'Rime Squall', 'Gain 8% of cold storm damage as extra lightning; 16% increased storm duration; 14% increased storm damage.', m('gainAs_cold_lightning', 'flat', 0.08, ['storm']), m('effectDuration', 'increased', 0.16, ['storm']), m('damage', 'increased', 0.14, ['storm'])),
    ],
  },
  {
    id: 'exp_wis_blood_pact', wedge: 'wis', theme: 'host', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Calcified Marrow', '10% increased minion life.', m('minionLife', 'increased', 0.10)),
      n('a', 'small', 'Rib-Shell', '10% increased minion life; +10% minion area hit avoidance.', m('minionLife', 'increased', 0.10), m('minionAreaAvoidance', 'flat', 0.10)),
      n('b', 'small', 'Bone Plating', 'Minions take 8% less damage.', m('minionDamageTaken', 'more', -0.08)),
      n('', 'notable', 'Marrow Shell', 'Minions gain +1 ply per 35% increased minion life without losing life; +1 minion ply; 18% increased minion life.', m('minionLifePlyEcho', 'flat', 0.35), m('minionPlies', 'flat', 1), m('minionLife', 'increased', 0.18)),
    ],
  },

  // =========================================================================
  // PASS 2 — CONSTELLATION OF ARCHETYPES (+45 wheels, +259 nodes, +13 keystones)
  // =========================================================================

  // --- INTELLIGENCE PASS 2 (5 clusters, 30 nodes) --------------------------
  {
    id: 'exp_int_triad', wedge: 'int', theme: 'arcana', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Three-Part Harmony', '6% increased fire, cold, and lightning damage.', m('damage', 'increased', 0.06, ['fire']), m('damage', 'increased', 0.06, ['cold']), m('damage', 'increased', 0.06, ['lightning'])),
      n('a', 'small', 'Shifted Hue', '+3% fire, cold, and lightning penetration.', m('firePen', 'flat', 0.03), m('coldPen', 'flat', 0.03), m('lightningPen', 'flat', 0.03)),
      n('b', 'small', 'Balanced Vessel', '+8% fire, cold, and lightning resistance.', m('fireRes', 'flat', 0.08), m('coldRes', 'flat', 0.08), m('lightningRes', 'flat', 0.08)),
      procNode('', 'notable', 'triad_fire', 'Prism Pendulum', 'Fire hits grant 15% more cold and lightning damage for 4 seconds; +5% fire, cold, and lightning penetration.', '#ff8a4a', {
        trigger: 'hit', tags: ['fire'], icd: 2,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_triad_fire', duration: 4, mods: [m('damage', 'more', 0.15, ['cold']), m('damage', 'more', 0.15, ['lightning'])] } },
      }, m('firePen', 'flat', 0.05), m('coldPen', 'flat', 0.05), m('lightningPen', 'flat', 0.05)),
      procNode('tailA', 'notable', 'triad_cold', 'Frost-to-Spark Shift', 'Cold hits grant 15% more lightning and fire damage for 4 seconds; +8% cold resistance.', '#7ab8d8', {
        trigger: 'hit', tags: ['cold'], icd: 2,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_triad_cold', duration: 4, mods: [m('damage', 'more', 0.15, ['lightning']), m('damage', 'more', 0.15, ['fire'])] } },
      }, m('coldRes', 'flat', 0.08)),
      procNode('tailB', 'notable', 'triad_light', 'Spark-to-Ember Shift', 'Lightning hits grant 15% more fire and cold damage for 4 seconds; +8% lightning resistance.', '#ffe14a', {
        trigger: 'hit', tags: ['lightning'], icd: 2,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_triad_light', duration: 4, mods: [m('damage', 'more', 0.15, ['fire']), m('damage', 'more', 0.15, ['cold'])] } },
      }, m('lightningRes', 'flat', 0.08)),
    ],
  },
  {
    id: 'exp_int_spellblade', wedge: 'int', theme: 'arcana', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Runic Hilt', '6% increased attack and spell damage.', m('damage', 'increased', 0.06, ['attack']), m('damage', 'increased', 0.06, ['spell'])),
      n('a1', 'small', 'Runed Edge', '5% increased attack speed; 5% increased cast speed.', m('attackSpeed', 'increased', 0.05), m('castSpeed', 'increased', 0.05)),
      n('b1', 'small', 'Lattice Blade', '+12 maximum energy shield; +15 accuracy.', m('energyShield', 'flat', 12), m('accuracy', 'flat', 15)),
      n('mid', 'notable', 'Aether-Forged Edge', '2% increased attack damage per 10 Intelligence; gain 0.05% increased attack damage per point of maximum energy shield.', g('damage', 'increased', 0.02, 'attr10:intelligence', ['attack']), linkInc('damage', 'energyShield', 0.0005, ['attack'])),
      n('a2', 'small', 'Quickened Sigil', '6% increased cast speed; 4% increased attack speed.', m('castSpeed', 'increased', 0.06), m('attackSpeed', 'increased', 0.04)),
      n('b2', 'small', 'Bladed Chant', '6% increased attack speed; 4% increased cast speed.', m('attackSpeed', 'increased', 0.06), m('castSpeed', 'increased', 0.04)),
      n('', 'notable', 'Quicksilver Synthesis', '35% of your cast speed scaling also applies to attack speed, and 35% of your attack speed scaling also applies to cast speed.', linkInc('attackSpeed', 'castSpeed', 0.35, undefined, undefined, 1), linkInc('castSpeed', 'attackSpeed', 0.35, undefined, undefined, 1)),
    ],
  },
  {
    id: 'exp_int_archcast', wedge: 'int', theme: 'arcana', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Heavy Ink', '+0.15 flat damage per point of mana spent; +14 maximum mana.', m('costDamage_mana', 'flat', 0.15), m('mana', 'flat', 14)),
      n('a', 'small', 'Arcane Weight', '+0.12 absorb shield per point of mana spent; 8% increased maximum mana.', m('costWard_mana', 'flat', 0.12), m('mana', 'increased', 0.08)),
      n('b', 'small', 'Drawn Siphon', '1% of spell damage leeched as energy shield; 8% increased mana regeneration.', m('esLeech', 'flat', 0.01, ['spell']), m('manaRegen', 'increased', 0.08)),
      n('', 'notable', 'Expensive Syllable', '+0.35 flat damage per point of mana spent; +0.25 absorb per point of mana spent; skills cost 15% increased mana.', m('costDamage_mana', 'flat', 0.35), m('costWard_mana', 'flat', 0.25), m('manaCost', 'increased', 0.15)),
      n('tailA', 'notable', 'Sealed Echo', '+1 maximum Unleash seal; targeted skills strike +1 additional target; skills cost 15% more mana.', m('unleashMax', 'flat', 1), m('multiTarget', 'flat', 1), m('manaCost', 'more', 0.15)),
      n('tailB', 'notable', 'Siphon Lattice', '80% of your life leech is applied to energy shield instead; +2% spell energy shield leech; 12% increased energy shield recharge rate.', m('lifeLeechToEs', 'flat', 0.80), m('esLeech', 'flat', 0.02, ['spell']), m('esRechargeRate', 'increased', 0.12)),
    ],
  },
  {
    id: 'exp_int_meteor', wedge: 'int', theme: 'fire', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Skyward Ember', '8% increased fire area damage; 6% increased fire area of effect.', m('damage', 'increased', 0.08, ['fire', 'aoe']), m('aoeRadius', 'increased', 0.06, ['fire'])),
      n('a1', 'small', 'Falling Spark', '+2% fire critical strike chance; +8% fire critical strike multiplier.', m('critChance', 'flat', 0.02, ['fire']), m('critMulti', 'flat', 0.08, ['fire'])),
      n('b1', 'small', 'Banked Coal', '10% increased fire area of effect; 6% increased fire damage against burning enemies.', m('aoeRadius', 'increased', 0.10, ['fire']), m('damage', 'increased', 0.06, ['fire', 'vs:burn'])),
      procNode('mid', 'notable', 'falling_cinder', 'Falling Cinder', 'Fire critical strikes call down a meteor 0.55s later for fire area damage at the target; 12% increased fire damage.', '#ff8a4a', {
        trigger: 'hit', crit: true, tags: ['fire'], icd: 3.5,
        effect: { type: 'delayedBurst', delay: 0.55, radius: 130, at: 'target', damage: { type: 'fire', base: 34, perLevel: 5.5 } },
      }, m('damage', 'increased', 0.12, ['fire'])),
      n('a2', 'small', 'Cinder Wake', '10% increased fire area of effect; 8% increased fire damage against burning enemies.', m('aoeRadius', 'increased', 0.10, ['fire']), m('damage', 'increased', 0.08, ['fire', 'vs:burn'])),
      n('b2', 'small', 'Scorched Crater', '10% increased fire ailment magnitude; +6% fire penetration.', m('statusMagnitude', 'increased', 0.10, ['fire']), m('firePen', 'flat', 0.06)),
      n('', 'notable', 'Detonating Pyre', '+1 area aftershock; 20% increased fire area of effect; +10% fire penetration; 15% more fire damage against burning enemies.', m('aoeScatter', 'flat', 1), m('aoeRadius', 'increased', 0.20, ['fire']), m('firePen', 'flat', 0.10), m('damage', 'more', 0.15, ['fire', 'vs:burn'])),
    ],
  },
  {
    id: 'exp_int_tempest_dice', wedge: 'int', theme: 'lightning', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Wild Arc', '+15% damage roll spread; 6% increased lightning damage.', m('damageSpread', 'flat', 0.15), m('damage', 'increased', 0.06, ['lightning'])),
      n('a', 'small', 'Loaded Die', '+8% lucky hit chance.', m('luckyChance', 'flat', 0.08)),
      n('b', 'small', 'High Crest', '+6% high-roll window; +2% lightning critical strike chance.', m('highRollWindow', 'flat', 0.06), m('critChance', 'flat', 0.02, ['lightning'])),
      n('', 'keystone', 'Loaded Tempest', '+60% lightning damage roll spread; +20% high-roll window; +15% lightning penetration; high-roll hits Shock and chain lightning to a nearby enemy (0.4s cooldown); your critical strike multiplier is fixed at 100%.', m('damageSpread', 'flat', 0.60, ['lightning']), m('highRollWindow', 'flat', 0.20), m('lightningPen', 'flat', 0.15), m('highRollShockChain', 'flat', 1), m('critMulti', 'override', 1)),
    ],
  },

  // --- CHARISMA PASS 2 (5 clusters, 27 nodes) ------------------------------
  {
    id: 'exp_cha_radiant_paladin', wedge: 'cha', theme: 'life', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Hallowed Step', '10% increased healing power; 6% increased aura area of effect.', m('healPower', 'increased', 0.10), m('aoeRadius', 'increased', 0.06, ['aura'])),
      n('a1', 'small', 'Warm Benediction', '12% increased healing power; +10% fire resistance.', m('healPower', 'increased', 0.12), m('fireRes', 'flat', 0.10)),
      n('b1', 'small', 'Sanctuary Light', '10% increased ward gained; +10 maximum life.', m('wardGain', 'increased', 0.10), m('life', 'flat', 10)),
      procNode('mid', 'notable', 'consecrated_ring', 'Hallowed Ring', 'Casting an aura calls down a hallowed ring 0.5s later that burns foes and heals nearby allies; 12% increased healing power.', '#dca07a', {
        trigger: 'cast', tags: ['aura'], icd: 5,
        effect: { type: 'delayedBurst', delay: 0.5, radius: 155, at: 'self', damage: { type: 'fire', base: 20, perLevel: 3.5 }, healAllies: { base: 14, perLevel: 2.5 } },
      }, m('healPower', 'increased', 0.12)),
      n('a2', 'small', 'Radiant Grace', '14% increased healing power.', m('healPower', 'increased', 0.14)),
      n('b2', 'small', 'Searing Mercy', '10% increased fire damage; 10% increased healing received.', m('damage', 'increased', 0.10, ['fire']), m('healTaken', 'increased', 0.10)),
      n('', 'keystone', 'Mercy Turned to Radiance', '85% of your healing power scaling translates into increased damage; you cannot deal critical strikes.', linkInc('damage', 'healPower', 0.85, undefined, undefined, 1), m('critChance', 'override', 0)),
    ],
  },
  {
    id: 'exp_cha_pendulum', wedge: 'cha', theme: 'fortune', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Turn of the Wheel', '6% increased effect duration; 4% increased attack and cast speed.', m('effectDuration', 'increased', 0.06), m('attackSpeed', 'increased', 0.04), m('castSpeed', 'increased', 0.04)),
      n('a', 'small', 'Rising Beat', '8% increased area of effect; 6% increased cooldown recovery.', m('aoeRadius', 'increased', 0.08), m('cooldownRecovery', 'increased', 0.06)),
      n('b', 'small', 'Held Cadence', '10% increased buff duration.', m('effectDuration', 'increased', 0.10, ['buff'])),
      procNode('', 'notable', 'harmonic_tide', 'Harmonic Tide', 'Every 8 seconds, gain Harmonic Tide for 3.5 seconds: 24% more damage, 20% increased attack and cast speed, and 20% increased area of effect.', '#d3be8b', {
        trigger: 'pulse', every: 8,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_harmonic_tide', duration: 3.5, mods: [m('damage', 'more', 0.24), m('attackSpeed', 'increased', 0.20), m('castSpeed', 'increased', 0.20), m('aoeRadius', 'increased', 0.20)] } },
      }),
    ],
  },
  {
    id: 'exp_cha_mirage', wedge: 'cha', theme: 'chorus', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Double Silhouette', '10% increased echo damage.', m('mirageDamage', 'increased', 0.10)),
      n('a', 'small', 'Fleeting Reflection', '12% increased echo damage; 3% increased movement speed.', m('mirageDamage', 'increased', 0.12), m('moveSpeed', 'increased', 0.03)),
      n('b', 'small', 'Echoed Posture', '8% increased evasion; 6% increased attack and cast speed.', m('evasion', 'increased', 0.08), m('attackSpeed', 'increased', 0.06), m('castSpeed', 'increased', 0.06)),
      n('', 'notable', 'Split Silhouette', '+1 additional echo mirage; 15% less direct damage.', m('mirageCount', 'flat', 1), m('damage', 'more', -0.15)),
      n('tailA', 'notable', 'Chorus of Phantoms', '30% increased echo damage; 10% increased attack and cast speed.', m('mirageDamage', 'increased', 0.30), m('attackSpeed', 'increased', 0.10), m('castSpeed', 'increased', 0.10)),
      n('tailB', 'notable', 'Echoing Step', '+12% area hit avoidance if you have used a movement skill recently; 15% increased echo damage; 12% increased movement speed; +0.6s "Recently" window.', m('areaAvoidance', 'flat', 0.12, undefined, 'recentlyMoved'), m('mirageDamage', 'increased', 0.15), m('moveSpeed', 'increased', 0.12), m('recentlyWindow', 'flat', 0.6)),
    ],
  },
  {
    id: 'exp_cha_vanguard_aura', wedge: 'cha', theme: 'chorus', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Rallied Ranks', '10% increased aura area of effect; +10% aura ES recharge bonus.', m('aoeRadius', 'increased', 0.10, ['aura']), m('auraEsRecharge', 'flat', 0.10)),
      n('a', 'small', 'Shielding Hymnal', '10% shorter aura ES recharge delay; 8% increased ward gained.', m('auraEsDelay', 'flat', 0.10), m('wardGain', 'increased', 0.08)),
      n('b', 'small', 'Company Grace', '2% increased ward gained per nearby ally.', g('wardGain', 'increased', 0.02, 'allies:near')),
      n('', 'notable', 'Vanguard\'s Banner', '16% increased aura area of effect; +18% aura ES recharge bonus; 20% shorter aura ES recharge delay; 4% increased ward gained per nearby ally.', m('aoeRadius', 'increased', 0.16, ['aura']), m('auraEsRecharge', 'flat', 0.18), m('auraEsDelay', 'flat', 0.20), g('wardGain', 'increased', 0.04, 'allies:near')),
      n('tailA', 'notable', 'Field Triage', 'Nearby allies heal 3 (+0.8 per level) life per second while you hold a guard stance; 15% increased healing power; 15% overheal to ward.', m('guardMend', 'flat', 3), g('guardMend', 'flat', 0.8, 'level'), m('healPower', 'increased', 0.15), m('overheal', 'flat', 0.15)),
      n('tailB', 'notable', 'Sovereign Tempo', '1% increased attack and cast speed per 10 Charisma; 16% increased buff duration.', g('attackSpeed', 'increased', 0.01, 'attr10:charisma'), g('castSpeed', 'increased', 0.01, 'attr10:charisma'), m('effectDuration', 'increased', 0.16, ['buff'])),
    ],
  },
  {
    id: 'exp_cha_conduction', wedge: 'cha', theme: 'lightning', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Drawn Ground', '8% increased projectile speed; 8% increased effect duration.', m('projectileSpeed', 'increased', 0.08), m('effectDuration', 'increased', 0.08)),
      n('a', 'small', 'Field Affinity', '10% increased area of effect; 6% increased elemental damage.', m('aoeRadius', 'increased', 0.10), m('damage', 'increased', 0.06, ['fire']), m('damage', 'increased', 0.06, ['cold']), m('damage', 'increased', 0.06, ['lightning'])),
      n('b', 'small', 'Carried Trail', '10% increased projectile damage.', m('damage', 'increased', 0.10, ['projectile'])),
      n('', 'notable', 'Living Current', 'Projectiles crossing your ground effects deal 22% more damage and gain 15% increased blast radius; 15% increased skill effect duration; +0.5s "Recently" window.', m('fieldCarryMore', 'flat', 0.22), m('effectDuration', 'increased', 0.15), m('recentlyWindow', 'flat', 0.5)),
    ],
  },

  // --- DEXTERITY PASS 2 (5 clusters, 28 nodes) -----------------------------
  {
    id: 'exp_dex_horizon', wedge: 'dex', theme: 'ranged', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Distant Mark', 'Up to +5% more damage at long range; 6% increased projectile speed.', m('farShotDamage', 'flat', 0.05), m('projectileSpeed', 'increased', 0.06)),
      n('a1', 'small', 'High Arc', 'Up to +5% more damage at long range; +20 accuracy.', m('farShotDamage', 'flat', 0.05), m('accuracy', 'flat', 20)),
      n('b1', 'small', 'Flat Trajectory', '10% increased projectile speed; 6% increased projectile damage.', m('projectileSpeed', 'increased', 0.10), m('damage', 'increased', 0.06, ['projectile'])),
      n('mid', 'notable', 'Longbow Sightline', 'Up to +12% more damage at long range; 18% increased projectile speed; +35 accuracy.', m('farShotDamage', 'flat', 0.12), m('projectileSpeed', 'increased', 0.18), m('accuracy', 'flat', 35)),
      n('a2', 'small', 'Wind-Corrected', 'Up to +6% more damage at long range; +3% projectile critical strike chance.', m('farShotDamage', 'flat', 0.06), m('critChance', 'flat', 0.03, ['projectile'])),
      n('b2', 'small', 'Far Reach', '12% increased projectile damage; 10% increased projectile speed.', m('damage', 'increased', 0.12, ['projectile']), m('projectileSpeed', 'increased', 0.10)),
      n('', 'keystone', 'Horizon Draw', 'Up to +35% more damage at long range; 35% less damage against close enemies.', m('farShotDamage', 'flat', 0.35), m('damage', 'more', -0.35, ['vs:closeRing'])),
    ],
  },
  {
    id: 'exp_dex_barrage_flight', wedge: 'dex', theme: 'ranged', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Notched Arrowhead', '+1 impact shard on projectile hits; 6% increased projectile speed.', m('projShrapnel', 'flat', 1), m('projectileSpeed', 'increased', 0.06)),
      n('a', 'small', 'Split Fletch', '10% increased projectile damage; 6% increased projectile size.', m('damage', 'increased', 0.10, ['projectile']), m('projectileSize', 'increased', 0.06)),
      n('b', 'small', 'Curving Shaft', '+8% projectile recurve chance.', m('projRecurve', 'flat', 0.08)),
      n('', 'notable', 'Splintered Volley', 'Projectiles shatter into +2 impact shards and fork +1 additional time; 12% increased projectile speed.', m('projShrapnel', 'flat', 2), m('forkCount', 'flat', 1), m('projectileSpeed', 'increased', 0.12)),
      n('tailA', 'notable', 'Shrapnel Gyre', 'Projectiles shatter into +3 additional impact shards; 18% increased projectile speed; 14% increased projectile damage.', m('projShrapnel', 'flat', 3), m('projectileSpeed', 'increased', 0.18), m('damage', 'increased', 0.14, ['projectile'])),
      n('tailB', 'notable', 'Ricochet Chain', 'Projectiles chain +1 additional time, bounce +1 time off terrain, and have +15% recurve chance.', m('chainCount', 'flat', 1), m('projBounce', 'flat', 1), m('projRecurve', 'flat', 0.15)),
    ],
  },
  {
    id: 'exp_dex_phantom_shot', wedge: 'dex', theme: 'ranged', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Hawk Sight', '+2% projectile critical strike chance; +20 accuracy.', m('critChance', 'flat', 0.02, ['projectile']), m('accuracy', 'flat', 20)),
      n('a', 'small', 'Twin Release', '6% increased attack speed with projectiles.', m('attackSpeed', 'increased', 0.06, ['projectile'])),
      n('b', 'small', 'Heartshot', '+12% critical strike multiplier with projectiles.', m('critMulti', 'flat', 0.12, ['projectile'])),
      procNode('', 'notable', 'phantom_volley', 'Phantom Volley', 'Critical projectile hits echo with a phantom second strike at 55% damage; +6% projectile critical strike chance.', '#9fbba2', {
        trigger: 'hit', crit: true, tags: ['projectile'], icd: 1.8,
        effect: { type: 'extraHit', damageScale: 0.55 },
      }, m('critChance', 'flat', 0.06, ['projectile'])),
    ],
  },
  {
    id: 'exp_dex_architect_vow', wedge: 'dex', theme: 'devices', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Workshop Rig', '8% increased construct damage; 8% increased construct cast rate.', m('damage', 'increased', 0.08, ['construct']), m('constructCastRate', 'increased', 0.08)),
      n('a1', 'small', 'Fast Anchor', '12% faster totem placement.', m('totemPlaceTime', 'more', -0.12)),
      n('b1', 'small', 'Wound Clockwork', '10% increased construct cast rate.', m('constructCastRate', 'increased', 0.10)),
      n('mid', 'notable', 'Clockwork Foundry', '18% increased construct cast rate; 16% increased construct damage; 12% faster totem placement.', m('constructCastRate', 'increased', 0.18), m('damage', 'increased', 0.16, ['construct']), m('totemPlaceTime', 'more', -0.12)),
      n('a2', 'small', 'Reinforced Frame', '12% increased construct area of effect and duration.', m('aoeRadius', 'increased', 0.12, ['construct']), m('effectDuration', 'increased', 0.12, ['construct'])),
      n('b2', 'small', 'Oiled Feed', '12% increased construct damage; 10% faster totem placement.', m('damage', 'increased', 0.12, ['construct']), m('totemPlaceTime', 'more', -0.10)),
      n('', 'keystone', 'Architect\'s Vow', '+2 maximum constructs; 25% increased construct cast rate; 25% faster totem placement; 25% less self attack and cast speed.', m('constructMaxCount', 'flat', 2), m('constructCastRate', 'increased', 0.25), m('totemPlaceTime', 'more', -0.25), m('attackSpeed', 'more', -0.25), m('castSpeed', 'more', -0.25)),
    ],
  },
  {
    id: 'exp_dex_strider', wedge: 'dex', theme: 'guile', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Restless Pace', '4% increased movement speed; 6% increased damage while moving.', m('moveSpeed', 'increased', 0.04), m('damage', 'increased', 0.06, undefined, 'moving')),
      n('a', 'small', 'Wind-Slip', '12% increased evasion while moving.', m('evasion', 'increased', 0.12, undefined, 'moving')),
      n('b', 'small', 'Open Stride', '4% increased movement speed; 6% increased attack speed while moving.', m('moveSpeed', 'increased', 0.04), m('attackSpeed', 'increased', 0.06, undefined, 'moving')),
      n('', 'keystone', 'Unresting Wind', 'While moving: 18% more damage, 12% increased movement speed, and take 10% less damage. While stationary: take 14% more damage and 20% less evasion.', m('damage', 'more', 0.18, undefined, 'moving'), m('moveSpeed', 'increased', 0.12, undefined, 'moving'), m('damageTaken', 'more', -0.10, undefined, 'moving'), m('damageTaken', 'more', 0.14, undefined, 'stationary'), m('evasion', 'more', -0.20, undefined, 'stationary')),
    ],
  },

  // --- STRENGTH PASS 2 (5 clusters, 30 nodes) ------------------------------
  {
    id: 'exp_str_heft_blow', wedge: 'str', theme: 'impact', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Heavy Bone', '+3% Crushing Heft chance; +14 maximum life.', m('heftBlowChance', 'flat', 0.03), m('life', 'flat', 14)),
      n('a1', 'small', 'Vital Weight', '+3% Crushing Heft chance; 6% increased maximum life.', m('heftBlowChance', 'flat', 0.03), m('life', 'increased', 0.06)),
      n('b1', 'small', 'Enduring Bulk', '+20 maximum endurance; +4% Crushing Heft ratio.', m('endurance', 'flat', 20), m('heftBlowScale', 'flat', 0.04)),
      n('mid', 'notable', 'Sovereign Weight', '+7% Crushing Heft chance; +6% Crushing Heft ratio; +25 maximum life; +25 maximum endurance.', m('heftBlowChance', 'flat', 0.07), m('heftBlowScale', 'flat', 0.06), m('life', 'flat', 25), m('endurance', 'flat', 25)),
      n('a2', 'small', 'Dense Sinew', '+4% Crushing Heft chance; 6% increased maximum life.', m('heftBlowChance', 'flat', 0.04), m('life', 'increased', 0.06)),
      n('b2', 'small', 'Body Blow', '+6% Crushing Heft ratio; 8% increased melee damage.', m('heftBlowScale', 'flat', 0.06), m('damage', 'increased', 0.08, ['melee'])),
      n('', 'notable', 'Mountain\'s Verdict', '+10% Crushing Heft chance; +12% Crushing Heft ratio; 15% increased maximum life.', m('heftBlowChance', 'flat', 0.10), m('heftBlowScale', 'flat', 0.12), m('life', 'increased', 0.15)),
    ],
  },
  {
    id: 'exp_str_blood_tithe', wedge: 'str', theme: 'life', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Paid in Pulse', '20% of skill mana costs paid with life; +14 maximum life.', m('costToLife', 'flat', 0.20), m('life', 'flat', 14)),
      n('a1', 'small', 'Open Vein', '20% of skill mana costs paid with life; +0.6% maximum life regenerated per second.', m('costToLife', 'flat', 0.20), m('lifeRegenPct', 'flat', 0.006)),
      n('b1', 'small', 'Scarred Palm', '+0.15 flat damage per point of life spent; 6% increased maximum life.', m('costDamage_life', 'flat', 0.15), m('life', 'increased', 0.06)),
      n('mid', 'notable', 'Vein-Fed Force', '30% of skill mana costs paid with life; +0.30 flat damage per point of life spent; +0.25 absorb shield per point of life spent.', m('costToLife', 'flat', 0.30), m('costDamage_life', 'flat', 0.30), m('costWard_life', 'flat', 0.25)),
      n('a2', 'small', 'Deep Pulse', '10% increased maximum life; +0.6% maximum life regenerated per second.', m('life', 'increased', 0.10), m('lifeRegenPct', 'flat', 0.006)),
      n('b2', 'small', 'Blood Recovery', '+1.5% life leech; 10% increased healing received.', m('lifeLeech', 'flat', 0.015), m('healTaken', 'increased', 0.10)),
      n('', 'keystone', 'Crimson Tithe', '100% of skill mana costs are paid with life; 20% increased maximum life; +1.5% maximum life regenerated per second; +0.55 flat damage per point of life spent; maximum mana becomes 0.', m('costToLife', 'flat', 1), m('life', 'increased', 0.20), m('lifeRegenPct', 'flat', 0.015), m('costDamage_life', 'flat', 0.55), m('mana', 'override', 0)),
    ],
  },
  {
    id: 'exp_str_iron_will', wedge: 'str', theme: 'arcana', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Iron Chant', '8% increased spell damage; +20 armor.', m('damage', 'increased', 0.08, ['spell']), m('armor', 'flat', 20)),
      n('a', 'small', 'Weighted Cadence', '1% increased spell damage per 10 Strength.', g('damage', 'increased', 0.01, 'attr10:strength', ['spell'])),
      n('b', 'small', 'Mail and Word', '10% increased armor; 6% increased spell area of effect.', m('armor', 'increased', 0.10), m('aoeRadius', 'increased', 0.06, ['spell'])),
      n('', 'notable', 'Steel-Bound Arcana', '2% increased spell damage per 10 Strength; gain 1.5% of base armor as added physical damage to spells; +30 armor.', g('damage', 'increased', 0.02, 'attr10:strength', ['spell']), link('addedPhysical', 'armor', 0.015, ['spell']), m('armor', 'flat', 30)),
      n('tailA', 'notable', 'Heavy Incantation', '35% of your area-of-effect scaling also applies as increased area damage; 14% increased spell area of effect.', linkInc('damage', 'aoeRadius', 0.35, ['aoe'], undefined, 1), m('aoeRadius', 'increased', 0.14, ['spell'])),
      n('tailB', 'notable', 'Anvil Casting', '+30 maximum poise; 15% increased cast speed while poised; 20% increased armor while channeling.', m('poise', 'flat', 30), m('castSpeed', 'increased', 0.15, undefined, 'poised'), m('armor', 'increased', 0.20, undefined, 'channeling')),
    ],
  },
  {
    id: 'exp_str_cleave_wave', wedge: 'str', theme: 'impact', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Broad Cleave', '8% increased melee area of effect; 6% increased melee reach.', m('aoeRadius', 'increased', 0.08, ['melee']), m('meleeReach', 'increased', 0.06)),
      n('a', 'small', 'Carried Arc', '10% increased sweep travel distance; 6% increased melee damage.', m('sweepRange', 'increased', 0.10), m('damage', 'increased', 0.06, ['melee'])),
      n('b', 'small', 'Shocking Blow', '+25 melee splash radius.', m('splashRadius', 'flat', 25)),
      n('', 'notable', 'Crescent Surge', 'Melee arcs launch forward-traveling crescent waves; 25% increased sweep travel; 14% increased melee area of effect.', m('meleeSweep', 'flat', 1), m('sweepRange', 'increased', 0.25), m('aoeRadius', 'increased', 0.14, ['melee'])),
      n('tailA', 'notable', 'Ringing Cleave', 'Melee hits reverberate to +1 additional nearby enemy; +60 melee splash radius.', m('meleeReverb', 'flat', 1), m('splashRadius', 'flat', 60)),
      n('tailB', 'notable', 'Seismic Cascade', '+1 ground cascade placement; 18% increased cascade reach.', m('aoeCascade', 'flat', 1), m('cascadeStep', 'increased', 0.18)),
    ],
  },
  {
    id: 'exp_str_granite', wedge: 'str', theme: 'bastion', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Planted Feet', '8% increased damage while stationary; 8% increased armor while stationary.', m('damage', 'increased', 0.08, undefined, 'stationary'), m('armor', 'increased', 0.08, undefined, 'stationary')),
      n('a', 'small', 'Granite Footing', 'Take 4% less damage while stationary.', m('damageTaken', 'more', -0.04, undefined, 'stationary')),
      n('b', 'small', 'Planted Strike', '+15 maximum poise; 8% increased weight.', m('poise', 'flat', 15), m('weight', 'increased', 0.08)),
      n('', 'keystone', 'Granite Meridian', 'While stationary: 45% increased poise damage, 30% increased armor, and +25% shove authority; +0.8s "Recently" window; while moving: 20% less attack and cast speed.', m('poiseDamage', 'increased', 0.45, undefined, 'stationary'), m('armor', 'increased', 0.30, undefined, 'stationary'), m('shoveAuthority', 'flat', 0.25, undefined, 'stationary'), m('recentlyWindow', 'flat', 0.8), m('attackSpeed', 'more', -0.20, undefined, 'moving'), m('castSpeed', 'more', -0.20, undefined, 'moving')),
    ],
  },

  // --- FORTITUDE PASS 2 (5 clusters, 30 nodes) -----------------------------
  {
    id: 'exp_for_glancing', wedge: 'for', theme: 'bastion', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Angled Buckler', '+4% block chance; +4 (+0.8 per level) block value.', m('blockChance', 'flat', 0.04), m('blockValue', 'flat', 4), g('blockValue', 'flat', 0.8, 'level')),
      n('a1', 'small', 'Mending Guard', '+1 (+0.25 per level) life gained on block; +3% block chance.', m('lifeOnBlock', 'flat', 1), g('lifeOnBlock', 'flat', 0.25, 'level'), m('blockChance', 'flat', 0.03)),
      n('b1', 'small', 'Iron Rim', '+6 (+1.2 per level) block value; 8% increased guard strength.', m('blockValue', 'flat', 6), g('blockValue', 'flat', 1.2, 'level'), m('guardStrength', 'increased', 0.08)),
      procNode('mid', 'notable', 'frost_bulwark', 'Ringing Pavise', 'Blocking a hit releases a freezing counter-wave around you; +5% block chance; +8 (+1.5 per level) block value.', '#9ebedc', {
        trigger: 'block', icd: 2.5,
        effect: { type: 'burst', damage: 'cold', base: 22, perLevel: 3.5, radius: 135 },
      }, m('blockChance', 'flat', 0.05), m('blockValue', 'flat', 8), g('blockValue', 'flat', 1.5, 'level')),
      n('a2', 'small', 'Steady Catch', '+4% block chance; +1 (+0.25 per level) life gained on block.', m('blockChance', 'flat', 0.04), m('lifeOnBlock', 'flat', 1), g('lifeOnBlock', 'flat', 0.25, 'level')),
      n('b2', 'small', 'Glancing Rim', '+20 armor; 10% increased guard strength.', m('armor', 'flat', 20), m('guardStrength', 'increased', 0.10)),
      n('', 'keystone', 'Deflected Brunt', '+25% block chance; +2 (+0.55 per level) life gained on block; 45% less block power.', m('blockChance', 'flat', 0.25), m('lifeOnBlock', 'flat', 2), g('lifeOnBlock', 'flat', 0.55, 'level'), m('blockPower', 'more', -0.45)),
    ],
  },
  {
    id: 'exp_for_stone_skin', wedge: 'for', theme: 'bastion', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Thick Padding', '-1 (-0.15 per level) flat damage taken from hits; +20 armor.', m('flatHitReduction', 'flat', 1), g('flatHitReduction', 'flat', 0.15, 'level'), m('armor', 'flat', 20)),
      n('a1', 'small', 'Layered Wool', '-1 (-0.15 per level) flat damage taken from hits; 4% of life hit damage staggered over time.', m('flatHitReduction', 'flat', 1), g('flatHitReduction', 'flat', 0.15, 'level'), m('staggerFrac', 'flat', 0.04)),
      n('b1', 'small', 'Banded Iron', '10% increased armor; +12 maximum life.', m('armor', 'increased', 0.10), m('life', 'flat', 12)),
      n('mid', 'notable', 'Granite Weave', '-2 (-0.35 per level) flat damage taken from hits; 8% of life hit damage staggered over time; +1s stagger window.', m('flatHitReduction', 'flat', 2), g('flatHitReduction', 'flat', 0.35, 'level'), m('staggerFrac', 'flat', 0.08), m('staggerWindow', 'flat', 1)),
      n('a2', 'small', 'Dense Shell', '-1 (-0.20 per level) flat damage taken from hits; +6% critical strike avoidance.', m('flatHitReduction', 'flat', 1), g('flatHitReduction', 'flat', 0.20, 'level'), m('critAvoid', 'flat', 0.06)),
      n('b2', 'small', 'Slow Bruise', '6% of life hit damage staggered over time; 10% increased healing received.', m('staggerFrac', 'flat', 0.06), m('healTaken', 'increased', 0.10)),
      n('', 'notable', 'Impervious Hide', '-3 (-0.55 per level) flat damage taken from hits; 12% of life hit damage staggered over time; +12% critical strike avoidance.', m('flatHitReduction', 'flat', 3), g('flatHitReduction', 'flat', 0.55, 'level'), m('staggerFrac', 'flat', 0.12), m('critAvoid', 'flat', 0.12)),
    ],
  },
  {
    id: 'exp_for_last_bastion', wedge: 'for', theme: 'life', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Stubborn Pulse', '+15 maximum life; recover 8% of life lost to hits over time.', m('life', 'flat', 15), m('recuperate', 'flat', 0.08)),
      n('a', 'small', 'Clinging Breath', '+20% Last Gasp chance; 6% increased maximum life.', m('lastGasp', 'flat', 0.20), m('life', 'increased', 0.06)),
      n('b', 'small', 'Defiant Blood', '10% increased healing received; +0.6% maximum life regenerated per second.', m('healTaken', 'increased', 0.10), m('lifeRegenPct', 'flat', 0.006)),
      procNode('', 'notable', 'grave_refusal', 'Refusal of the Grave', '+45% Last Gasp chance; triggering Last Gasp grants Ward equal to 30% of maximum life; 15% shorter Last Gasp cooldown; take 10% less damage while on low life.', '#ce8793', {
        trigger: 'lastGasp', icd: 5,
        effect: { type: 'ward', pctMaxLife: 0.30 },
      }, m('lastGasp', 'flat', 0.45), m('lastGaspCooldown', 'more', -0.15), m('damageTaken', 'more', -0.10, undefined, 'lowLife')),
      n('tailA', 'notable', 'Borrowed Breath', '+15% Last Gasp retained life; 25% shorter Last Gasp cooldown.', m('lastGaspLife', 'flat', 0.15), m('lastGaspCooldown', 'more', -0.25)),
      procNode('tailB', 'notable', 'desperate_nova', 'Desperate Surge', 'Dropping to low life unleashes a physical shockwave around you; recover 25% of life lost to hits over time.', '#cc8b63', {
        trigger: 'condition', condition: 'lowLife', icd: 12,
        effect: { type: 'burst', damage: 'physical', base: 32, perLevel: 5, radius: 165 },
      }, m('recuperate', 'flat', 0.25)),
    ],
  },
  {
    id: 'exp_for_solitary', wedge: 'for', theme: 'bastion', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Own Company', '8% increased armor and life while you have no living minions.', gate('armor', 'increased', 0.08, 'solitary', 1), gate('life', 'increased', 0.08, 'solitary', 1)),
      n('a', 'small', 'Quiet Road', '8% increased damage while you have no living minions.', gate('damage', 'increased', 0.08, 'solitary', 1)),
      n('b', 'small', 'Sole Watch', '+8% fire, cold, and lightning resistance while you have no living minions.', gate('fireRes', 'flat', 0.08, 'solitary', 1), gate('coldRes', 'flat', 0.08, 'solitary', 1), gate('lightningRes', 'flat', 0.08, 'solitary', 1)),
      n('', 'keystone', 'Oath of the Unaccompanied', 'While you have no living minions: 16% more damage, 15% increased maximum life, and 20% increased armor, evasion, and energy shield; your minions deal 0 damage.', gate('damage', 'more', 0.16, 'solitary', 1), gate('life', 'increased', 0.15, 'solitary', 1), gate('armor', 'increased', 0.20, 'solitary', 1), gate('evasion', 'increased', 0.20, 'solitary', 1), gate('energyShield', 'increased', 0.20, 'solitary', 1), m('minionDamage', 'override', 0)),
      n('tailA', 'notable', 'Self-Reliant Grit', '+40 maximum endurance; +3 (+0.6 per level) life gained on kill; regenerate 2% of maximum life per second while you have no living minions.', m('endurance', 'flat', 40), m('lifeOnKill', 'flat', 3), g('lifeOnKill', 'flat', 0.6, 'level'), gate('lifeRegenPct', 'flat', 0.02, 'solitary', 1)),
      n('tailB', 'notable', 'Single Banner', 'While you have no living minions: 15% increased attack and cast speed and +15% fire, cold, and lightning resistance.', gate('attackSpeed', 'increased', 0.15, 'solitary', 1), gate('castSpeed', 'increased', 0.15, 'solitary', 1), gate('fireRes', 'flat', 0.15, 'solitary', 1), gate('coldRes', 'flat', 0.15, 'solitary', 1), gate('lightningRes', 'flat', 0.15, 'solitary', 1)),
    ],
  },
  {
    id: 'exp_for_zeal_oath', wedge: 'for', theme: 'arcana', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Steady Lattice', '15% of life regeneration also mends energy shield; +12 maximum energy shield.', m('lifeRegenToEs', 'flat', 0.15), m('energyShield', 'flat', 12)),
      n('a', 'small', 'Sealed Weave', '+12% energy shield DoT resistance.', m('esDotResist', 'flat', 0.12)),
      n('b', 'small', 'Devoted Pulse', '+0.8% maximum life regenerated per second.', m('lifeRegenPct', 'flat', 0.008)),
      n('', 'notable', 'Covenant of Recovery', '50% of life regeneration also continuously mends energy shield (stacking past 100% amplifies energy shield regeneration); +20% energy shield recharge rate if you have been healed recently; +1.2% maximum life regenerated per second.', m('lifeRegenToEs', 'flat', 0.50), m('esRechargeRate', 'increased', 0.20, undefined, 'recentlyHealed'), m('lifeRegenPct', 'flat', 0.012)),
    ],
  },

  // --- PROWESS PASS 2 (5 clusters, 27 nodes) -------------------------------
  {
    id: 'exp_prw_felling', wedge: 'prw', theme: 'impact', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Joint-Breaker', '+3% Felling Strike chance; 5% increased attack speed.', m('fellingChance', 'flat', 0.03), m('attackSpeed', 'increased', 0.05)),
      n('a1', 'small', 'Hamstring Cut', '+3% Felling Strike chance; +20 accuracy.', m('fellingChance', 'flat', 0.03), m('accuracy', 'flat', 20)),
      n('b1', 'small', 'Giant\'s Measure', '6% more damage against far heavier enemies.', m('giantsbane', 'flat', 0.06)),
      n('mid', 'notable', 'Giant-Splitter', '+6% Felling Strike chance; 12% more damage against far heavier enemies; 8% increased attack speed.', m('fellingChance', 'flat', 0.06), m('giantsbane', 'flat', 0.12), m('attackSpeed', 'increased', 0.08)),
      n('a2', 'small', 'Tendon Shear', '+4% Felling Strike chance; +5% armor penetration.', m('fellingChance', 'flat', 0.04), m('armorPen', 'flat', 0.05)),
      n('b2', 'small', 'Crown-Feller', '8% more damage against empowered enemies.', m('regicide', 'flat', 0.08)),
      n('', 'notable', 'Colossus Breaker', '+10% Felling Strike chance; 14% more damage against empowered enemies; +10% armor penetration.', m('fellingChance', 'flat', 0.10), m('regicide', 'flat', 0.14), m('armorPen', 'flat', 0.10)),
    ],
  },
  {
    id: 'exp_prw_rampage', wedge: 'prw', theme: 'tempo', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Opening Cut', '4% increased movement speed; 6% increased attack speed.', m('moveSpeed', 'increased', 0.04), m('attackSpeed', 'increased', 0.06)),
      n('a', 'small', 'Carried Tempo', '8% increased damage if you have killed recently.', m('damage', 'increased', 0.08, undefined, 'recentlyKilled')),
      n('b', 'small', 'Relentless Stride', '4% increased movement speed; +1 (+0.25 per level) life gained on kill.', m('moveSpeed', 'increased', 0.04), m('lifeOnKill', 'flat', 1), g('lifeOnKill', 'flat', 0.25, 'level')),
      procNode('', 'notable', 'rampage_streak', 'Bloody Momentum', 'Slaying an enemy grants a stacking Momentum buff (up to 8 stacks for 5 seconds): +3% movement speed, +4% attack and cast speed, and +4% damage per stack.', '#d49a8e', {
        trigger: 'kill', icd: 0.4,
        effect: { type: 'buff', buff: { type: 'buff', id: 'exp_rampage_streak', duration: 5, maxStacks: 8, mods: [m('moveSpeed', 'increased', 0.03), m('attackSpeed', 'increased', 0.04), m('castSpeed', 'increased', 0.04), m('damage', 'increased', 0.04)] } },
      }),
      n('tailA', 'notable', 'Boss-Hunter\'s Rhythm', '+20% chance for on-kill procs to trigger on hits against elites and bosses; cull enemies at 10% life.', m('killProcOnHit', 'flat', 0.20), m('cullThreshold', 'flat', 0.10)),
      n('tailB', 'notable', 'Kinetic Stride', 'Gain 0.25% increased attack damage per point of movement speed above base; 8% increased movement speed.', linkInc('damage', 'moveSpeed', 0.0025, ['attack'], undefined, 200), m('moveSpeed', 'increased', 0.08)),
    ],
  },
  {
    id: 'exp_prw_executioner', wedge: 'prw', theme: 'tempo', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Finishing Cut', '10% increased damage against low-life enemies.', m('damage', 'increased', 0.10, ['vs:lowLife'])),
      n('a', 'small', 'Swift Mercy', '+5% culling threshold; 5% increased attack speed.', m('cullThreshold', 'flat', 0.05), m('attackSpeed', 'increased', 0.05)),
      n('b', 'small', 'Final Angle', '+12% critical strike multiplier against low-life enemies.', m('critMulti', 'flat', 0.12, ['vs:lowLife'])),
      procNode('', 'notable', 'mercy_echo', 'Mercy\'s End', 'Hitting a low-life enemy echoes a follow-up strike at 60% damage; cull enemies at 12% life.', '#cc8b63', {
        trigger: 'hit', vs: ['lowLife'], icd: 1.5,
        effect: { type: 'extraHit', damageScale: 0.60 },
      }, m('cullThreshold', 'flat', 0.12)),
    ],
  },
  {
    id: 'exp_prw_close_quarters', wedge: 'prw', theme: 'impact', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Arm\'s Reach', 'Up to +8% more damage at touch range.', m('proximityDamage', 'flat', 0.08)),
      n('a', 'small', 'Echoed Weight', '0.8% of landed hit damage carries into your next blows as Echoing Might; 6% increased physical damage.', m('echoMight', 'flat', 0.008), m('damage', 'increased', 0.06, ['physical'])),
      n('b', 'small', 'Crowded Swing', '6% increased attack speed; +12 maximum life.', m('attackSpeed', 'increased', 0.06), m('life', 'flat', 12)),
      n('', 'notable', 'Touch-Range Heft', 'Up to +25% more damage at touch range; +1.5% Echoing Might; 10% increased attack speed.', m('proximityDamage', 'flat', 0.25), m('echoMight', 'flat', 0.015), m('attackSpeed', 'increased', 0.10)),
    ],
  },
  {
    id: 'exp_prw_multistrike', wedge: 'prw', theme: 'tempo', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Double Tempo', '6% increased attack and cast speed.', m('attackSpeed', 'increased', 0.06), m('castSpeed', 'increased', 0.06)),
      n('a', 'small', 'Growing Refrain', '+8% skill repeat scaling.', m('repeatScale', 'flat', 0.08)),
      n('b', 'small', 'Fluid Follow', '6% increased damage; 5% increased attack speed.', m('damage', 'increased', 0.06), m('attackSpeed', 'increased', 0.05)),
      n('', 'keystone', 'Cadence of Echoes', 'Skills repeat +1 additional time; each repeat grows 15% larger and stronger; 18% less hit damage.', m('repeatCount', 'flat', 1), m('repeatScale', 'flat', 0.15), m('damage', 'more', -0.18)),
      n('tailA', 'notable', 'Seeking Cadence', 'Skill repeats automatically retarget the nearest enemy; 10% increased attack speed.', m('repeatRetarget', 'flat', 1), m('attackSpeed', 'increased', 0.10)),
      n('tailB', 'notable', 'Crescendo Repeat', '+20% skill repeat scaling; 12% increased cast speed.', m('repeatScale', 'flat', 0.20), m('castSpeed', 'increased', 0.12)),
    ],
  },

  // --- FINESSE PASS 2 (5 clusters, 28 nodes) -------------------------------
  {
    id: 'exp_fin_plague_pop', wedge: 'fin', theme: 'entropy', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Swollen Blight', '8% increased ailment magnitude; 8% increased area of effect.', m('statusMagnitude', 'increased', 0.08), m('aoeRadius', 'increased', 0.08)),
      n('a1', 'small', 'Contagious Cut', '10% chance for damaging ailments to propagate on kill.', m('dotPropagates', 'flat', 0.10)),
      n('b1', 'small', 'Deepening Venom', '10% increased ailment magnitude; +6% ailment chance.', m('statusMagnitude', 'increased', 0.10), m('statusChance', 'flat', 0.06)),
      procNode('mid', 'notable', 'blight_pop', 'Blight Detonation', 'Slaying an enemy suffering from a damaging ailment detonates them for 55% of the slaying blow in an area; +10% ailment chance.', '#a5b27c', {
        trigger: 'kill', vs: ['afflicted'], icd: 0.6,
        effect: { type: 'explosion', damageScale: 0.55, radius: 140 },
      }, m('statusChance', 'flat', 0.10)),
      n('a2', 'small', 'Plague Drift', '12% chance for damaging ailments to propagate on kill.', m('dotPropagates', 'flat', 0.12)),
      n('b2', 'small', 'Wider Spill', '12% increased area of effect; 10% increased ailment magnitude.', m('aoeRadius', 'increased', 0.12), m('statusMagnitude', 'increased', 0.10)),
      n('', 'notable', 'Epidemic Bloom', '28% chance for damaging ailments to propagate on kill; +1 ailment stack limit; 18% increased area of effect.', m('dotPropagates', 'flat', 0.28), m('ailmentStacks', 'flat', 1), m('aoeRadius', 'increased', 0.18)),
    ],
  },
  {
    id: 'exp_fin_pure_dot', wedge: 'fin', theme: 'entropy', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Seeping Cut', '10% of hit damage forgone into ailments; 8% increased ailment magnitude.', m('hitToAffliction', 'flat', 0.10), m('statusMagnitude', 'increased', 0.08)),
      n('a1', 'small', 'Lingering Rot', '10% of hit damage forgone into ailments; +12% affliction yield.', m('hitToAffliction', 'flat', 0.10), m('afflictionYield', 'flat', 0.12)),
      n('b1', 'small', 'Layered Wounds', '10% increased ailment magnitude; 8% increased effect duration.', m('statusMagnitude', 'increased', 0.10), m('effectDuration', 'increased', 0.08)),
      n('mid', 'notable', 'Slow Poisoner', '18% of hit damage forgone into ailments at +25% affliction yield; +1 ailment stack limit.', m('hitToAffliction', 'flat', 0.18), m('afflictionYield', 'flat', 0.25), m('ailmentStacks', 'flat', 1)),
      n('a2', 'small', 'Festering Edge', '12% increased ailment magnitude; +8% ailment chance.', m('statusMagnitude', 'increased', 0.12), m('statusChance', 'flat', 0.08)),
      n('b2', 'small', 'Long Decay', '12% increased effect duration; +15% affliction yield.', m('effectDuration', 'increased', 0.12), m('afflictionYield', 'flat', 0.15)),
      n('', 'keystone', 'Rotting Edge', '45% of hit damage is forgone into damaging ailments at +55% affliction yield; 30% more ailment magnitude; critical strike multiplier is fixed at 100%.', m('hitToAffliction', 'flat', 0.45), m('afflictionYield', 'flat', 0.55), m('statusMagnitude', 'more', 0.30), m('critMulti', 'override', 1)),
    ],
  },
  {
    id: 'exp_fin_glass_crown', wedge: 'fin', theme: 'fortune', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Razor Risk', '8% increased damage; +8% critical strike multiplier.', m('damage', 'increased', 0.08), m('critMulti', 'flat', 0.08)),
      n('a', 'small', 'Exposed Edge', '+3% critical strike chance.', m('critChance', 'flat', 0.03)),
      n('b', 'small', 'All-In Cut', '10% increased damage.', m('damage', 'increased', 0.10)),
      n('', 'keystone', 'Paper Crown', 'All your hits are Lucky and gain +35% critical strike multiplier; your armor and evasion are 0.', m('luckyChance', 'flat', 1), m('critMulti', 'flat', 0.35), m('armor', 'override', 0), m('evasion', 'override', 0)),
    ],
  },
  {
    id: 'exp_fin_chain_jolt', wedge: 'fin', theme: 'lightning', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Static Nerve', '+8% chance to inflict shock; 6% increased lightning damage.', m('apply_shock', 'flat', 0.08), m('damage', 'increased', 0.06, ['lightning'])),
      n('a', 'small', 'Quick Arc', '6% increased attack and cast speed with lightning skills.', m('attackSpeed', 'increased', 0.06, ['lightning']), m('castSpeed', 'increased', 0.06, ['lightning'])),
      n('b', 'small', 'Jolted Wound', '+6% lightning penetration.', m('lightningPen', 'flat', 0.06)),
      procNode('', 'notable', 'shock_chain', 'Conducting Nerve', 'Inflicting shock arcs lightning across 3 nearby enemies for 40% of hit damage; +15% chance to inflict shock.', '#ffe14a', {
        trigger: 'statusApply', status: 'shock', icd: 1.5,
        effect: { type: 'arc', damageScale: 0.40, range: 210, hops: 3 },
      }, m('apply_shock', 'flat', 0.15)),
    ],
  },
  {
    id: 'exp_fin_backstab', wedge: 'fin', theme: 'guile', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Quiet Footstep', '+8% ambush damage; +10% concealment.', m('ambushBonus', 'flat', 0.08), m('concealment', 'flat', 0.10)),
      n('a', 'small', 'Shadowed Flank', '+10% critical strike chance against enemies hit from behind.', m('critChance', 'flat', 0.10, ['vs:behind'])),
      n('b', 'small', 'Slip Through', '8% increased evasion; 4% increased movement speed.', m('evasion', 'increased', 0.08), m('moveSpeed', 'increased', 0.04)),
      n('', 'notable', 'Unseen Blade', '+25% ambush damage; +25% concealment; +18% critical strike chance against enemies hit from behind.', m('ambushBonus', 'flat', 0.25), m('concealment', 'flat', 0.25), m('critChance', 'flat', 0.18, ['vs:behind'])),
      n('tailA', 'notable', 'Ghost-Walk Stride', 'Grants phasing; 10% increased movement speed; 16% increased evasion.', m('phasing', 'flat', 1), m('moveSpeed', 'increased', 0.10), m('evasion', 'increased', 0.16)),
      n('tailB', 'notable', 'Marrow-Piercer', '+35% critical strike multiplier against enemies hit from behind; +25% critical strike chance against low-life enemies.', m('critMulti', 'flat', 0.35, ['vs:behind']), m('critChance', 'flat', 0.25, ['vs:lowLife'])),
    ],
  },

  // --- WILLPOWER PASS 2 (5 clusters, 27 nodes) -----------------------------
  {
    id: 'exp_wil_ashen_vessel', wedge: 'wil', theme: 'arcana', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Hollowed Blood', '10% of base life read as energy shield; 6% of life forgone.', m('lifeToEs', 'flat', 0.10), m('lifeForgone', 'flat', 0.06)),
      n('a1', 'small', 'Pale Sinew', '10% of base life read as energy shield; 6% of life forgone.', m('lifeToEs', 'flat', 0.10), m('lifeForgone', 'flat', 0.06)),
      n('b1', 'small', 'Void Membrane', '+10% chaos resistance; 10% energy shield DoT resistance.', m('chaosRes', 'flat', 0.10), m('esDotResist', 'flat', 0.10)),
      n('mid', 'notable', 'Pale Lattice', '20% of base life read as energy shield; 12% of life forgone; +15% chaos resistance; 12% increased energy shield.', m('lifeToEs', 'flat', 0.20), m('lifeForgone', 'flat', 0.12), m('chaosRes', 'flat', 0.15), m('energyShield', 'increased', 0.12)),
      n('a2', 'small', 'Glass Focus', '14% increased energy shield; 10% increased energy shield recharge rate.', m('energyShield', 'increased', 0.14), m('esRechargeRate', 'increased', 0.10)),
      n('b2', 'small', 'Ashen Seal', '+15% energy shield DoT resistance; +12% chaos resistance.', m('esDotResist', 'flat', 0.15), m('chaosRes', 'flat', 0.12)),
      n('', 'keystone', 'Ashen Vessel', '110% of base maximum life is read as energy shield; 60% of maximum life is forgone; +8% maximum chaos resistance; +45% DoT resistance while on energy shield.', m('lifeToEs', 'flat', 1.10), m('lifeForgone', 'flat', 0.60), m('chaosResMax', 'flat', 0.08), m('esDotResist', 'flat', 0.45)),
    ],
  },
  {
    id: 'exp_wil_pain_attune', wedge: 'wil', theme: 'life', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Thin Margin', '10% increased spell damage while on low life; +4% low-life threshold.', m('damage', 'increased', 0.10, ['spell'], 'lowLife'), m('lowLifeLine', 'flat', 0.04)),
      n('a', 'small', 'Borrowed Debt', '+8% overdrive debt limit; 12% overdrive flow while casting.', m('overdriveCap', 'flat', 0.08), m('overdriveFlow', 'flat', 0.12)),
      n('b', 'small', 'Brink Shelter', '12% increased energy shield recharge rate while on low life.', m('esRechargeRate', 'increased', 0.12, undefined, 'lowLife')),
      n('', 'notable', 'Wound-Lit Focus', '18% more spell damage while on low life; raises your low-life threshold by +8%.', m('damage', 'more', 0.18, ['spell'], 'lowLife'), m('lowLifeLine', 'flat', 0.08)),
      n('tailA', 'notable', 'Blood-Debt Conduit', '+20% overdrive debt limit; 30% overdrive repayment flow while casting; +0.40 blood debt metabolism.', m('overdriveCap', 'flat', 0.20), m('overdriveFlow', 'flat', 0.30), m('overdriveLifeFactor', 'flat', 0.40)),
      n('tailB', 'notable', 'Sanguine Ward', 'While on low life: 25% increased ward gained and 20% increased energy shield recharge rate.', m('wardGain', 'increased', 0.25, undefined, 'lowLife'), m('esRechargeRate', 'increased', 0.20, undefined, 'lowLife')),
    ],
  },
  {
    id: 'exp_wil_vortex', wedge: 'wil', theme: 'entropy', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Inward Pull', '8% increased area of effect; 6% increased chaos damage.', m('aoeRadius', 'increased', 0.08), m('damage', 'increased', 0.06, ['chaos'])),
      n('a', 'small', 'Crushing Draw', '10% increased area damage.', m('damage', 'increased', 0.10, ['aoe'])),
      n('b', 'small', 'Abyssal Drag', '10% increased area of effect.', m('aoeRadius', 'increased', 0.10)),
      procNode('', 'notable', 'gravity_pull', 'Singularity Undertow', 'Area hits yank struck enemies toward you; 15% increased area of effect; 12% increased chaos damage.', '#c45ae0', {
        trigger: 'hit', tags: ['aoe'], icd: 2.5,
        effect: { type: 'displace', force: -160 },
      }, m('aoeRadius', 'increased', 0.15), m('damage', 'increased', 0.12, ['chaos'])),
    ],
  },
  {
    id: 'exp_wil_chain_proc', wedge: 'wil', theme: 'fortune', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Sympathetic Spark', '+8% luck; 6% increased spell damage.', m('luck', 'flat', 0.08), m('damage', 'increased', 0.06, ['spell'])),
      n('a', 'small', 'Hair-Trigger Rune', '+6% trigger gem chance.', m('triggerChance', 'flat', 0.06)),
      n('b', 'small', 'Primed Conduit', '8% lower trigger damage threshold.', m('triggerThreshold', 'more', -0.08)),
      n('', 'notable', 'Cascading Omen', '+1 proc chain depth; +18% luck; 12% increased spell damage.', m('procDepth', 'flat', 1), m('luck', 'flat', 0.18), m('damage', 'increased', 0.12, ['spell'])),
      n('tailA', 'notable', 'Quickened Trigger', '+15% trigger gem chance; 20% lower trigger damage threshold.', m('triggerChance', 'flat', 0.15), m('triggerThreshold', 'more', -0.20)),
      n('tailB', 'notable', 'Volatile Resonance', '20% lower trigger status power threshold; +15% luck.', m('triggerPower', 'more', -0.20), m('luck', 'flat', 0.15)),
    ],
  },
  {
    id: 'exp_wil_lingering_rot', wedge: 'wil', theme: 'entropy', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Wet Ash', 'Area skills leave a 0.5s lingering damage field.', m('lingerField', 'flat', 0.5)),
      n('a', 'small', 'Slow Haze', '10% increased effect duration.', m('effectDuration', 'increased', 0.10)),
      n('b', 'small', 'Rotting Soil', '8% increased chaos damage; 8% increased ailment magnitude.', m('damage', 'increased', 0.08, ['chaos']), m('statusMagnitude', 'increased', 0.08)),
      n('', 'notable', 'Mire of Decay', 'Area skills leave a 1.4s lingering damage field; 16% increased skill effect duration; 12% increased chaos damage and ailment magnitude.', m('lingerField', 'flat', 1.4), m('effectDuration', 'increased', 0.16), m('damage', 'increased', 0.12, ['chaos']), m('statusMagnitude', 'increased', 0.12)),
    ],
  },

  // --- WISDOM PASS 2 (5 clusters, 30 nodes) --------------------------------
  {
    id: 'exp_wis_spiritual_aid', wedge: 'wis', theme: 'chorus', shape: 'splitKeystone',
    nodes: [
      n('entry', 'small', 'Shared Will', '10% increased minion damage.', m('minionDamage', 'increased', 0.10)),
      n('a1', 'small', 'Officiant\'s Blade', '12% increased minion damage.', m('minionDamage', 'increased', 0.12)),
      n('b1', 'small', 'Officiant\'s Verse', '12% increased minion damage.', m('minionDamage', 'increased', 0.12)),
      n('midA', 'notable', 'Sympathetic Edge', '15% of your minion damage scaling also applies to your own attack skills.', linkInc('damage', 'minionDamage', 0.15, ['attack'], undefined, 1)),
      n('midB', 'notable', 'Sympathetic Verse', '15% of your minion damage scaling also applies to your own spell skills.', linkInc('damage', 'minionDamage', 0.15, ['spell'], undefined, 1)),
      n('a2', 'small', 'United Host', '14% increased minion damage.', m('minionDamage', 'increased', 0.14)),
      n('b2', 'small', 'Commanding Cadence', '10% increased minion action speed; 8% increased minion life.', m('minionHaste', 'increased', 0.10), m('minionLife', 'increased', 0.08)),
      n('', 'notable', 'Voice of the Horde', '30% of your minion damage scaling also applies to all of your own skills.', linkInc('damage', 'minionDamage', 0.30, undefined, undefined, 1)),
      n('tail', 'keystone', 'Usurped Host', '90% of your minion damage scaling translates to your own skills as increased damage; your minion damage scaling no longer applies to your minions.', linkInc('damage', 'minionDamage', 0.90, undefined, undefined, 1), m('minionDamageForgone', 'flat', 1)),
    ],
  },
  {
    id: 'exp_wis_ashen_flock', wedge: 'wis', theme: 'fire', shape: 'tiered',
    nodes: [
      n('entry', 'small', 'Dry Kindling', '8% increased minion maximum life; 8% increased minion fire damage.', m('minionLife', 'increased', 0.08), m('minionDamage', 'increased', 0.08, ['fire'])),
      n('a1', 'small', 'Swollen Pyre', '12% increased minion maximum life.', m('minionLife', 'increased', 0.12)),
      n('b1', 'small', 'Singeing Wick', '10% faster minion decay; 8% increased minion fire damage.', m('minionDecayRate', 'more', 0.10), m('minionDamage', 'increased', 0.08, ['fire'])),
      n('mid', 'notable', 'Fiery Arrival', 'Newly summoned minions erupt on arrival for 6% of their maximum life as impact damage; 10% increased minion fire damage.', m('summonImpact', 'flat', 0.06), m('minionDamage', 'increased', 0.10, ['fire'])),
      n('a2', 'small', 'Fast Embers', '15% faster minion decay; 8% increased minion fire damage.', m('minionDecayRate', 'more', 0.15), m('minionDamage', 'increased', 0.08, ['fire'])),
      n('b2', 'small', 'Volatile Corpse', 'Minions explode on death for 1% of maximum life; 12% increased minion death-effect power.', m('minionExplodeDeath', 'flat', 0.01), m('minionDeathEffectPower', 'increased', 0.12)),
      n('', 'keystone', 'Ashen Flock', 'Minions gain up to 40% of their damage as extra fire damage scaled by their missing life percentage; minion decay also deals quadratic self-damage over their decay duration (still expiring on normal decay); 35% faster minion decay.', m('minionMissingLifeFire', 'flat', 0.40), m('minionDecayQuad', 'flat', 1), m('minionDecayRate', 'more', 0.35)),
    ],
  },
  {
    id: 'exp_wis_grave_bloom', wedge: 'wis', theme: 'host', shape: 'sideWing',
    nodes: [
      n('entry', 'small', 'Fresh Carrion', '10% increased corpse skill damage; 8% increased minion maximum life.', m('damage', 'increased', 0.10, ['corpse']), m('minionLife', 'increased', 0.08)),
      n('a', 'small', 'Crowded Pyre', '10% increased corpse skill damage; 8% increased cast speed with corpse skills.', m('damage', 'increased', 0.10, ['corpse']), m('castSpeed', 'increased', 0.08, ['corpse'])),
      n('b', 'small', 'Offering Vessels', '12% increased minion maximum life; 10% increased corpse skill area of effect.', m('minionLife', 'increased', 0.12), m('aoeRadius', 'increased', 0.10, ['corpse'])),
      n('', 'notable', 'Sacrificial Harvest', 'Corpse skills may sacrifice your living minions; 14% increased corpse skill damage; 12% increased minion maximum life.', m('sacrificeMinions', 'flat', 1), m('damage', 'increased', 0.14, ['corpse']), m('minionLife', 'increased', 0.12)),
      n('tailA', 'notable', 'Grim Repurposing', '+1 corpse batch; 16% increased corpse skill area of effect; 12% increased cast speed with corpse skills.', m('corpseBatch', 'flat', 1), m('aoeRadius', 'increased', 0.16, ['corpse']), m('castSpeed', 'increased', 0.12, ['corpse'])),
      n('volatile', 'keystone', 'Volatile Offering', 'Temporary minions summoned are stationary and immobile for their full duration, but are invulnerable if they have been summoned recently.', m('minionAnchoredInvuln', 'flat', 1)),
      n('tailB', 'notable', 'Beckoned Offering', 'Summons emerge directly at your cursor; newly summoned minions deal 6% of their maximum life as arrival impact damage; summon skills cost 15% more mana.', m('summonAtCursor', 'flat', 1), m('summonImpact', 'flat', 0.06), m('manaCost', 'more', 0.15, ['summon'])),
    ],
  },
  {
    id: 'exp_wis_undying_guard', wedge: 'wis', theme: 'host', shape: 'fork',
    nodes: [
      n('entry', 'small', 'Rib-Barricade', 'Minions take 6% less damage; 8% increased minion life.', m('minionDamageTaken', 'more', -0.06), m('minionLife', 'increased', 0.08)),
      n('a', 'small', 'Shared Burden', '+12% minion area hit avoidance; 8% increased minion life.', m('minionAreaAvoidance', 'flat', 0.12), m('minionLife', 'increased', 0.08)),
      n('b', 'small', 'Stubborn Marrow', 'Minions take 6% less damage; 8% faster persistent minion respawn.', m('minionDamageTaken', 'more', -0.06), m('minionRespawnTime', 'more', -0.08)),
      n('', 'notable', 'Wall of Unlife', 'Minions take 18% less damage; +25% minion area hit avoidance; +1 minion ply.', m('minionDamageTaken', 'more', -0.18), m('minionAreaAvoidance', 'flat', 0.25), m('minionPlies', 'flat', 1)),
      n('tailA', 'notable', 'Defensive Phalanx', 'Minions organize into coordinated tactical squads, gaining 6% increased armor and 3% less hit damage taken per nearby squadmate (up to 4) while focusing targets together; +1 minion ply; 15% faster persistent minion respawn; minions deal 10% less damage.', m('minionSquad', 'flat', 1), m('minionPlies', 'flat', 1), m('minionRespawnTime', 'more', -0.15), m('minionDamage', 'more', -0.10)),
      n('tailB', 'notable', 'Sanctified Arrival', 'Newly summoned minions grant 6 (+1.5 per character level) Ward to you, themselves, and nearby allies on arrival; minions take 10% less damage; +0.5s "Recently" window.', m('summonWard', 'flat', 6), g('summonWard', 'flat', 1.5, 'level'), m('minionDamageTaken', 'more', -0.10), m('recentlyWindow', 'flat', 0.5)),
    ],
  },
  {
    id: 'exp_wis_celestial_mend', wedge: 'wis', theme: 'nature', shape: 'diamond',
    nodes: [
      n('entry', 'small', 'Green Sap', '10% increased healing power; +0.6% maximum life regenerated per second.', m('healPower', 'increased', 0.10), m('lifeRegenPct', 'flat', 0.006)),
      n('a', 'small', 'Rooted Balm', '10% increased healing received; +12 maximum life.', m('healTaken', 'increased', 0.10), m('life', 'flat', 12)),
      n('b', 'small', 'Canopy Shade', '10% increased minion life; +0.8% minion life regenerated per second.', m('minionLife', 'increased', 0.10), m('minionRegenPct', 'flat', 0.008)),
      procNode('', 'notable', 'bough_renewal', 'Bough of Renewal', 'Taking a hit calls a healing wave 0.4s later that mends you and nearby allies; 15% increased healing power; +1% maximum life regenerated per second.', '#9dbb8b', {
        trigger: 'hurt', icd: 5,
        effect: { type: 'delayedBurst', delay: 0.4, radius: 170, at: 'self', healAllies: { base: 18, perLevel: 3 } },
      }, m('healPower', 'increased', 0.15), m('lifeRegenPct', 'flat', 0.01)),
    ],
  },
];

export const PASSIVE_EXPANSION_CLUSTERS: ExpansionCluster[] = [
  ...PASS1_AND_2_CLUSTERS,
  ...PASS3_CLUSTERS,
  ...PASS4_CLUSTERS,
  ...PASS5_CLUSTERS,
  ...PASS7_CLUSTERS,
  ...PASS8_CLUSTERS,
  ...PASS9_CLUSTERS,
  ...PASS10_CLUSTERS,
  ...PASS11_CLUSTERS,
  ...PASS12_CLUSTERS,
  ...PASS13_CLUSTERS,
  ...PASS14_CLUSTERS,
  ...PASS15_CLUSTERS,
  ...PASS16_CLUSTERS,
  ...PASS17_CLUSTERS,
  ...PASS18_CLUSTERS,
  ...PASS19_CLUSTERS,
];
