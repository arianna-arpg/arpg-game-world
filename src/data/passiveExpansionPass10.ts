// ---------------------------------------------------------------------------
// PASS 10 — Spliced Grafts & Mutational Traits (9 wheels, 47 nodes, 6 Keystones)
//
// Inspired by creature-splicing & mutational gene systems (Voidling Bound
// perks, cross-species trait grafting, chitin molting, synaptic node-links,
// polychrome mutagens, and adaptive attrition) — translated into Hollow Wake's
// grounded dark-alchemical vocabulary with dedicated engine primitives.
// ---------------------------------------------------------------------------

import { gaugeMod as g, mod as m } from '../engine/stats';
import { n, type ExpansionCluster } from './passiveExpansionBase';

export const PASS10_CLUSTERS: ExpansionCluster[] = [
  // =========================================================================
  // STRENGTH — Hemorrhagic Severance (Bleed-Gated Cull Engine)
  // =========================================================================
  {
    id: 'exp_p10_str_marrow_cull', wedge: 'str', theme: 'impact', shape: 'keystoneTail', pass: 10,
    nodes: [
      n('entry', 'small', 'Serrated Spur', '+10% chance to inflict bleed; 8% increased bleed magnitude.', m('apply_bleed', 'flat', 0.10), m('statusMagnitude', 'increased', 0.08, ['physical'])),
      n('a', 'small', 'Arterial Seam', 'Bleeding enemies at or below 6% maximum life are culled on hit (45% vs rares/bosses).', m('bleedCullThreshold', 'flat', 0.06)),
      n('b', 'small', 'Severed Tendon', '12% increased hit damage against bleeding enemies; +8% bleed chance.', m('damage', 'increased', 0.12, ['vs:bleed']), m('apply_bleed', 'flat', 0.08)),
      n('', 'notable', 'Marrow-Render', 'Bleeding enemies at or below 12% maximum life are culled on hit (45% vs rares/bosses); +15% bleed chance.', m('bleedCullThreshold', 'flat', 0.12), m('apply_bleed', 'flat', 0.15)),
      n('tail', 'keystone', 'Crimson Severance', 'Bleeding enemies at or below 24% maximum life are executed instantaneously on hit (11% vs rares/bosses); +20% bleed chance; you deal 35% less hit damage to enemies that are not bleeding.', m('bleedCullThreshold', 'flat', 0.24), m('apply_bleed', 'flat', 0.20), m('bleedNonBleedLess', 'flat', 0.35)),
    ],
  },

  // =========================================================================
  // FORTITUDE — Adaptive Carapace & Molting (Chitin Stack Engine)
  // =========================================================================
  {
    id: 'exp_p10_for_chitin_molt', wedge: 'for', theme: 'bastion', shape: 'keystoneTail', pass: 10,
    nodes: [
      n('entry', 'small', 'Calcified Plate', 'Taking or blocking hits hardens +1 Chitin stack (up to 10, 6s decay); 8% increased armor.', m('carapaceHitGain', 'flat', 1), m('armor', 'increased', 0.08)),
      n('a', 'small', 'Layered Shell', '2% increased armor per Chitin stack; +8 (+2 per level) Molt Shrapnel damage.', g('armor', 'increased', 0.02, 'molt'), m('moltShrapnel', 'flat', 8), g('moltShrapnel', 'flat', 2.0, 'level')),
      n('b', 'small', 'Brittle Husk', '+0.4 flat hit damage reduction per Chitin stack; 8% increased armor.', g('flatHitReduction', 'flat', 0.4, 'molt'), m('armor', 'increased', 0.08)),
      n('', 'notable', 'Shedding Carapace', 'At 10 Chitin stacks your carapace Molts, blasting nearby foes for 14 (+3.5 per level) physical shrapnel and healing 10% maximum life; 3% increased armor per Chitin stack.', m('carapaceHitGain', 'flat', 1), m('moltShrapnel', 'flat', 14), g('moltShrapnel', 'flat', 3.5, 'level'), g('armor', 'increased', 0.03, 'molt')),
      n('tail', 'keystone', 'Shedding Colossus', 'Chitin stacks grant +4% more armor and +1 flat hit reduction per stack; Molting at 10 stacks blasts foes for 24 (+5 per level) + 8% of your Armor as physical shrapnel and heals 10% maximum life; 25% less Evasion and 12% less Movement Speed.', m('carapaceHitGain', 'flat', 1), m('moltShrapnel', 'flat', 24), g('moltShrapnel', 'flat', 5.0, 'level'), g('armor', 'more', 0.04, 'molt'), g('flatHitReduction', 'flat', 1.0, 'molt'), m('evasion', 'more', -0.25), m('moveSpeed', 'more', -0.12)),
    ],
  },

  // =========================================================================
  // PROWESS — Elemental Gene-Splice (Cross-Spliced Ailments + Multi-Status More)
  // =========================================================================
  {
    id: 'exp_p10_prw_cross_splice', wedge: 'prw', theme: 'entropy', shape: 'dualNotableKeystone', pass: 10,
    nodes: [
      n('entry', 'small', 'Grafted Spine', '+15% chance to cross-splice a paired ailment when inflicting Bleed, Burn, Poison, or Shock.', m('ailmentCrossSplice', 'flat', 0.15)),
      n('a', 'small', 'Frost-Bitten Vein', '+15% cross-splice chance; +8% bleed and poison chance.', m('ailmentCrossSplice', 'flat', 0.15), m('apply_bleed', 'flat', 0.08), m('apply_poison', 'flat', 0.08)),
      n('b', 'small', 'Arcing Cinder', '+15% cross-splice chance; +8% burn and shock chance.', m('ailmentCrossSplice', 'flat', 0.15), m('apply_burn', 'flat', 0.08), m('apply_shock', 'flat', 0.08)),
      n('midA', 'notable', 'Venom-Frost Splice', '+30% cross-splice chance (Bleed→Chill, Poison→Bleed); deal 3% more hit damage per distinct active ailment on the target (up to 5).', m('ailmentCrossSplice', 'flat', 0.30), m('multiAilmentMore', 'flat', 0.03)),
      n('midB', 'notable', 'Ember-Spark Splice', '+30% cross-splice chance (Burn→Shock, Shock→Poison); deal 3% more hit damage per distinct active ailment on the target (up to 5).', m('ailmentCrossSplice', 'flat', 0.30), m('multiAilmentMore', 'flat', 0.03)),
      n('tail', 'keystone', 'Chimeric Graft', '100% chance to cross-splice paired ailments (Bleed→Chill, Burn→Shock, Poison→Bleed, Shock→Poison); deal 8% more hit damage per distinct ailment on the target (up to 5); you cannot deal critical strikes.', m('ailmentCrossSplice', 'flat', 1.0), m('multiAilmentMore', 'flat', 0.08), m('critChance', 'override', 0)),
    ],
  },

  // =========================================================================
  // DEXTERITY — Synaptic Lattice (Multi-Target Damage-Relay Web)
  // =========================================================================
  {
    id: 'exp_p10_dex_synaptic_links', wedge: 'dex', theme: 'lightning', shape: 'keystoneTail', pass: 10,
    nodes: [
      n('entry', 'small', 'Filament Mark', 'Landed hits tag targets into a Synaptic Lattice (up to 4, 4s), relaying 5% of hit damage to other tagged foes within 280px.', m('synapticLinkDmg', 'flat', 0.05)),
      n('a', 'small', 'Nerve Thread', 'Relays +5% hit damage along your Synaptic Lattice; 8% increased projectile speed.', m('synapticLinkDmg', 'flat', 0.05), m('projectileSpeed', 'increased', 0.08)),
      n('b', 'small', 'Arcing Synapse', 'Relays +5% hit damage along your Synaptic Lattice; 6% increased attack and cast speed.', m('synapticLinkDmg', 'flat', 0.05), m('attackSpeed', 'increased', 0.06), m('castSpeed', 'increased', 0.06)),
      n('', 'notable', 'Conductor Web', 'Relays +10% hit damage across up to 4 tagged targets in your Synaptic Lattice; +8% lightning penetration.', m('synapticLinkDmg', 'flat', 0.10), m('lightningPen', 'flat', 0.08)),
      n('tail', 'keystone', 'Neural Lattice', 'Relays +24% hit damage to all other Synaptic Lattice targets within 280px (up to 4 tagged foes); -2 chain count and 15% less hit damage when firing projectiles.', m('synapticLinkDmg', 'flat', 0.24), m('chainCount', 'flat', -2), m('damage', 'more', -0.15, ['projectile'])),
    ],
  },

  // =========================================================================
  // FINESSE — Catalytic Venom (Crits Mutate & Accelerate Active DoTs)
  // =========================================================================
  {
    id: 'exp_p10_fin_predator_gland', wedge: 'fin', theme: 'entropy', shape: 'fork', pass: 10,
    nodes: [
      n('entry', 'small', 'Acidic Gland', 'Critical strikes mutate active damaging ailments on the target, amplifying DPS by 6% and adding 1.2s duration.', m('statusAmplifyOnCrit', 'flat', 0.06)),
      n('a', 'small', 'Spurred Toxin', '+6% ailment mutation on critical strike; +2% critical strike chance.', m('statusAmplifyOnCrit', 'flat', 0.06), m('critChance', 'flat', 0.02)),
      n('b', 'small', 'Bile Catalyst', '10% increased ailment magnitude; 8% increased effect duration.', m('statusMagnitude', 'increased', 0.10), m('effectDuration', 'increased', 0.08)),
      n('', 'notable', 'Mutating Sting', 'Critical strikes amplify active damaging ailments on the victim by +14% (up to 2x baseline) and extend their duration by 1.2s; +4% critical strike chance.', m('statusAmplifyOnCrit', 'flat', 0.14), m('critChance', 'flat', 0.04)),
      n('tailA', 'notable', 'Virulent Acceleration', '+12% ailment mutation on critical strike; +1 ailment stack limit; 14% increased ailment magnitude.', m('statusAmplifyOnCrit', 'flat', 0.12), m('ailmentStacks', 'flat', 1), m('statusMagnitude', 'increased', 0.14)),
      n('tailB', 'notable', 'Festering Precision', '+20% critical strike multiplier against afflicted enemies; +12% ailment chance; 12% increased effect duration.', m('critMulti', 'flat', 0.20, ['vs:afflicted']), m('statusChance', 'flat', 0.12), m('effectDuration', 'increased', 0.12)),
    ],
  },

  // =========================================================================
  // INTELLIGENCE — Polychrome Strain (Distinct Damage Types Dealt Recently)
  // =========================================================================
  {
    id: 'exp_p10_int_polychrome_surge', wedge: 'int', theme: 'arcana', shape: 'keystoneTail', pass: 10,
    nodes: [
      n('entry', 'small', 'Prismatic Primer', '4% increased elemental and chaos damage per distinct damage type dealt in the last 6s (up to 5).', g('damage', 'increased', 0.04, 'prism', ['fire']), g('damage', 'increased', 0.04, 'prism', ['cold']), g('damage', 'increased', 0.04, 'prism', ['lightning']), g('damage', 'increased', 0.04, 'prism', ['chaos'])),
      n('a', 'small', 'Chromatic Seam', '+1.5% elemental penetration per distinct damage type dealt recently (up to 5).', g('firePen', 'flat', 0.015, 'prism'), g('coldPen', 'flat', 0.015, 'prism'), g('lightningPen', 'flat', 0.015, 'prism')),
      n('b', 'small', 'Spectral Cadence', '3% increased cast speed per distinct damage type dealt recently (up to 5).', g('castSpeed', 'increased', 0.03, 'prism')),
      n('', 'notable', 'Polychrome Conduit', '6% increased damage, 3% increased cast speed, and +2% elemental and chaos penetration per distinct damage type dealt recently (up to 5).', g('damage', 'increased', 0.06, 'prism'), g('castSpeed', 'increased', 0.03, 'prism'), g('firePen', 'flat', 0.02, 'prism'), g('coldPen', 'flat', 0.02, 'prism'), g('lightningPen', 'flat', 0.02, 'prism'), g('chaosPen', 'flat', 0.02, 'prism')),
      n('tail', 'keystone', 'Polychrome Helix', 'Gain 7% more damage and +3.5% all elemental and chaos penetration per distinct damage type dealt in the last 6s (up to 5); you deal 30% less hit damage while having dealt at most 1 damage type recently.', g('damage', 'more', 0.07, 'prism'), g('firePen', 'flat', 0.035, 'prism'), g('coldPen', 'flat', 0.035, 'prism'), g('lightningPen', 'flat', 0.035, 'prism'), g('chaosPen', 'flat', 0.035, 'prism'), m('prismSinglePenalty', 'flat', 0.30)),
    ],
  },

  // =========================================================================
  // WILLPOWER — Abyssal Adaptation (Per-Target Consecutive-Hit Escalation)
  // =========================================================================
  {
    id: 'exp_p10_wil_abyssal_adaptation', wedge: 'wil', theme: 'entropy', shape: 'keystoneTail', pass: 10,
    nodes: [
      n('entry', 'small', 'Probing Strike', 'Consecutive hits on the same foe grant +0.8% more hit damage per stack (up to 15, 5s decay).', m('attritionRamp', 'flat', 0.008)),
      n('a', 'small', 'Learned Weakness', '+0.8% Adaptation more hit damage per stack on the same target; 6% increased attack and cast speed.', m('attritionRamp', 'flat', 0.008), m('attackSpeed', 'increased', 0.06), m('castSpeed', 'increased', 0.06)),
      n('b', 'small', 'Persistent Pressure', '+0.8% Adaptation more hit damage per stack; +6% chaos penetration.', m('attritionRamp', 'flat', 0.008), m('chaosPen', 'flat', 0.06)),
      n('', 'notable', 'Adaptive Predator', 'Consecutive hits on the same target grant +1.6% more hit damage per stack (up to 15 stacks); 10% increased cast and attack speed.', m('attritionRamp', 'flat', 0.016), m('castSpeed', 'increased', 0.10), m('attackSpeed', 'increased', 0.10)),
      n('tail', 'keystone', 'Relentless Evolution', 'Consecutive hits on the same foe grant +3.5% more hit damage per Adaptation stack (up to 15 = +52.5%); your opening hit against an un-adapted enemy deals 30% less damage.', m('attritionRamp', 'flat', 0.035), m('attritionFirstPenalty', 'flat', 0.30)),
    ],
  },

  // =========================================================================
  // WISDOM — Grafted Lineage (Minion Genetic Inheritance & Low-Life Fission)
  // =========================================================================
  {
    id: 'exp_p10_wis_brood_splice', wedge: 'wis', theme: 'host', shape: 'fork', pass: 10,
    nodes: [
      n('entry', 'small', 'Shared Marrow', 'Minions inherit 15% of your own ailment application chances and bonus critical strike stats.', m('minionInheritStatus', 'flat', 0.15)),
      n('a', 'small', 'Spliced Stinger', 'Minions inherit +15% of your ailment chances and bonus critical strike stats.', m('minionInheritStatus', 'flat', 0.15)),
      n('b', 'small', 'Dividing Membrane', '25% chance for non-persistent minions dropping below 35% life to shed a fragile 4s Fission Husk (cap 2 active).', m('minionSplitOnLowLife', 'flat', 0.25)),
      n('', 'notable', 'Grafted Bloodline', 'Minions inherit 35% of your own ailment application chances and bonus critical strike chance and multiplier.', m('minionInheritStatus', 'flat', 0.35)),
      n('tailA', 'notable', 'Spliced Venom-Glands', 'Minions inherit +30% of your ailment chances and critical bonuses; +12% poison and bleed chance.', m('minionInheritStatus', 'flat', 0.30), m('apply_poison', 'flat', 0.12), m('apply_bleed', 'flat', 0.12)),
      n('tailB', 'notable', 'Fission Husk', '75% chance when a non-persistent minion drops below 35% life for the first time to shed a miniature 4s Fission Husk (40% life and damage, max 2 active); 12% increased minion life.', m('minionSplitOnLowLife', 'flat', 0.75), m('minionLife', 'increased', 0.12)),
    ],
  },

  // =========================================================================
  // CHARISMA — Gilded Strain (Triggered Procs Empower Casts & Retinue)
  // =========================================================================
  {
    id: 'exp_p10_cha_golden_mutation', wedge: 'cha', theme: 'fortune', shape: 'diamond', pass: 10,
    nodes: [
      n('entry', 'small', 'Aureate Spark', 'When any passive or gear proc triggers (1.5s ICD), your next hit deals 8% more damage and pulses ward and haste to nearby allies.', m('goldenProcAmplify', 'flat', 0.08)),
      n('a', 'small', 'Charmed Lineage', '+8% Gilded Proc cast amplification; +10% luck.', m('goldenProcAmplify', 'flat', 0.08), m('luck', 'flat', 0.10)),
      n('b', 'small', 'Echoed Fortune', '+8% Gilded Proc cast amplification; 12% increased ward gained.', m('goldenProcAmplify', 'flat', 0.08), m('wardGain', 'increased', 0.12)),
      n('', 'notable', 'Sovereign Strain', 'Whenever any passive or gear proc triggers (1.5s ICD), your next hit deals +20% more damage with +15% area of effect, and nearby allies and minions gain 4% max life as Ward plus 10% Haste for 3s; +15% luck.', m('goldenProcAmplify', 'flat', 0.20), m('luck', 'flat', 0.15)),
    ],
  },
];
