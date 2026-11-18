import type { SkillTreeSpec, TreeBuffPatch } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });
const physical = (id: string) => n(id + '_practice', 'Practiced Impact', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])]);
const recovery = (id: string) => n(id + '_practice', 'Practiced Timing', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)]);

export const IMPACT_STARTER_TREES: Record<string, SkillTreeSpec> = {
  sunder_maul: tree([
    n('faultbreaker', 'Faultbreaker', 'Deals 60% more poise damage and 50% increased Sundered duration, but has 20% less attack speed.', [mod('poiseDamage', 'more', 0.6), mod('sunderDuration', 'increased', 0.5), mod('attackSpeed', 'more', -0.2)]),
    [n('certain_fault', 'Certain Fault', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('open_fault', 'Open Fault', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)]),
      n('deep_fault', 'Deep Fault', 'Deals 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)])],
    [n('ready_maul', 'Ready Maul', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_maul', 'Cheap Maul', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('hungry_maul', 'Hungry Maul', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
  ], [
    n('sundering_sweep', 'Sundering Sweep', 'Strikes in a 170-degree arc, but deals 25% less damage.', [mod('damage', 'more', -0.25)], { arcDeg: 170 }),
    [n('long_sweep', 'Long Sweep', '35% increased melee reach.', [mod('meleeReach', 'increased', 0.35)]),
      n('stunning_sweep', 'Stunning Sweep', '+30% chance to stun.', [mod('apply_stun', 'flat', 0.3)]),
      n('lodged_maul', 'Lodged Fragments', 'Impales enemies for 25% of physical hit damage.', [mod('impalePower', 'flat', 0.25)])],
    [n('swift_sweep', 'Swift Sweep', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('paid_sweep', 'Paid Sweep', 'Gain 3 life on hit.', [mod('lifeOnHit', 'flat', 3)]),
      n('broken_sweep', 'Broken Ranks', 'Deals 30% more damage against Sundered enemies.', [mod('damage', 'more', 0.3, ['vs:sundered'])])],
  ], physical('maul')),

  earthquake: tree([
    n('rolling_quake', 'Rolling Quake', 'Replaces the single aftershock with 3 pulses every 0.5 seconds, each dealing 110% of the initial hit damage.', undefined, { ground: { pulse: { delay: 0.5, interval: 0.5, count: 3, dmgMult: 1.1, radiusMult: 1 } } }),
    [n('wide_quake', 'Wide Quake', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('fourth_quake', 'Fourth Tremor', '+1 aftershock pulse.', [mod('pulseCount', 'flat', 1)]),
      n('breaking_quake', 'Breaking Rhythm', 'Deals 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)])],
    [n('stunning_quake', 'Stuttering Ground', '+25% chance to stun.', [mod('apply_stun', 'flat', 0.25)]),
      n('paid_quake', 'Grounded Recovery', 'Gain 2 life on hit.', [mod('lifeOnHit', 'flat', 2)]),
      n('ready_quake', 'Ready Tremor', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    n('buried_verdict', 'Buried Verdict', 'The aftershock erupts after 1.6 seconds, dealing 360% of the initial hit damage across 150% of the radius.', undefined, { ground: { pulse: { delay: 1.6, count: 1, dmgMult: 3.6, radiusMult: 1.5 } } }),
    [n('heavy_faultline', 'Heavy Faultline', 'Deals 50% more poise damage.', [mod('poiseDamage', 'more', 0.5)]),
      n('long_fracture', 'Long Fracture', '50% increased Sundered duration.', [mod('sunderDuration', 'increased', 0.5)]),
      n('open_faultline', 'Open Faultline', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)])],
    [n('wide_faultline', 'Wide Faultline', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('cheap_faultline', 'Cheap Faultline', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('hungry_faultline', 'Hungry Faultline', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
  ], physical('quake')),

  verdict: tree([
    n('final_sentence', 'Final Sentence', 'Deals 40% more damage and culls enemies below 10% life, but has 20% less attack speed.', [mod('damage', 'more', 0.4), mod('cullThreshold', 'flat', 0.1), mod('attackSpeed', 'more', -0.2)]),
    [n('certain_sentence', 'Certain Sentence', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('open_sentence', 'Open Sentence', 'Ignores 25% of enemy armor.', [mod('armorPen', 'flat', 0.25)]),
      n('cruel_sentence', 'Cruel Sentence', '+12% critical chance.', [mod('critChance', 'flat', 0.12)])],
    [n('hungry_sentence', 'Hungry Sentence', 'Leech 10% of hit damage as life.', [mod('lifeLeech', 'flat', 0.1)]),
      n('ready_sentence', 'Ready Sentence', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_sentence', 'Cheap Sentence', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    n('passing_sentence', 'Passing Sentence', '35% increased attack speed and 60% increased cooldown recovery, but deals 25% less damage.', [mod('attackSpeed', 'increased', 0.35), mod('cooldownRecovery', 'increased', 0.6), mod('damage', 'more', -0.25)]),
    [buff(n('sentencers_stride', "Sentencer's Stride", 'Grants 25% increased movement speed for 3 seconds after striking.', undefined, { tags: { add: ['buff', 'duration'] } }), 'sentencers_stride', { duration: 3, mods: [mod('moveSpeed', 'increased', 0.25)] }),
      buff(n('guarded_sentence', 'Guarded Sentence', 'While active, take 15% less damage.'), 'sentencers_stride', { mods: [mod('damageTaken', 'more', -0.15)] }),
      n('lasting_sentence', 'Lasting Stride', '50% increased buff duration.', [mod('effectDuration', 'increased', 0.5)])],
    [n('lodged_sentence', 'Unfinished Sentence', 'Impales enemies for 30% of physical hit damage.', [mod('impalePower', 'flat', 0.3)]),
      n('paid_sentence', 'Paid Sentence', 'Gain 4 life on hit.', [mod('lifeOnHit', 'flat', 4)]),
      n('light_sentence', 'Light Sentence', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], physical('verdict')),

  charge: tree([
    n('battering_charge', 'Battering Charge', '+75% chance to stun and 50% more poise damage, but deals 20% less hit damage.', [mod('apply_stun', 'flat', 0.75), mod('poiseDamage', 'more', 0.5), mod('damage', 'more', -0.2)]),
    [n('long_stagger', 'Long Stagger', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('open_charge', 'Open Charge', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)]),
      n('certain_charge', 'Certain Charge', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)])],
    [n('ready_charge', 'Ready Charge', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('paid_charge', 'Paid Charge', 'Gain 3 life on hit.', [mod('lifeOnHit', 'flat', 3)]),
      n('cheap_charge', 'Cheap Charge', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    n('barbed_advance', 'Barbed Advance', 'Hits always inflict bleed and impale for 40% of physical hit damage, but cost 25% more mana.', [mod('impalePower', 'flat', 0.4), mod('apply_bleed', 'flat', 1), mod('manaCost', 'more', 0.25)]),
    [n('deep_advance', 'Deep Advance', '40% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['physical'])]),
      n('feeding_advance', 'Feeding Advance', 'Recover life equal to 5% of bleed damage dealt by this skill.', [mod('dotLeech_bleed', 'flat', 0.05)]),
      n('lasting_advance', 'Lasting Advance', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)])],
    [n('swift_return', 'Swift Return', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('deep_steel', 'Deep Steel', 'Impales for an additional 20% of physical hit damage.', [mod('impalePower', 'flat', 0.2)]),
      n('hungry_advance', 'Hungry Advance', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
  ], physical('charge')),

  shockfront: tree([
    n('clearing_front', 'Clearing Front', 'Fires 3 parallel shockwaves, but deals 30% less damage per wave.', [mod('projectileCount', 'flat', 2), mod('fireVolley', 'flat', 1), mod('damage', 'more', -0.3)]),
    [n('broad_front', 'Broad Front', '40% increased projectile size.', [mod('projectileSize', 'increased', 0.4)]),
      n('piercing_front', 'Piercing Front', 'Pierces 2 additional enemies.', [mod('pierceCount', 'flat', 2)]),
      n('spaced_front', 'Spaced Front', '40% increased projectile spacing.', [mod('volleySpacing', 'increased', 0.4)])],
    [n('heavy_front', 'Heavy Front', 'Deals 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)]),
      n('stunning_front', 'Stunning Front', '+25% chance to stun.', [mod('apply_stun', 'flat', 0.25)]),
      n('paid_front', 'Paid Front', 'Gain 2 life on hit.', [mod('lifeOnHit', 'flat', 2)])],
  ], [
    n('returning_front', 'Returning Front', 'The wave returns to you at the end of its flight, but deals 20% less damage.', [mod('projReturn', 'flat', 2), mod('damage', 'more', -0.2)]),
    [n('swift_front', 'Swift Front', '35% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.35)]),
      n('open_front', 'Open Front', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)]),
      n('lodged_front', 'Lodged Force', 'Impales enemies for 25% of physical hit damage.', [mod('impalePower', 'flat', 0.25)])],
    [n('ready_front', 'Ready Front', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_front', 'Cheap Front', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('hungry_front', 'Hungry Front', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
  ], physical('front')),

  marching_bulwark: tree([
    n('answering_march', 'Answering March', 'The release bash deals 60% more damage, but guard strength is reduced by 20%.', [mod('bashPower', 'more', 0.6), mod('guardStrength', 'more', -0.2)]),
    [n('easy_answer', 'Easy Answer', '25% less remaining guard required to trigger a release bash.', [mod('bashFloor', 'more', -0.25)]),
      n('heavy_answer', 'Heavy Answer', 'Shield bash deals 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)]),
      n('hungry_answer', 'Hungry Answer', 'Leech 8% of shield bash damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
    [n('ready_march', 'Ready March', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('strong_answer', 'Strong Answer', '30% increased guard strength.', [mod('guardStrength', 'increased', 0.3)]),
      n('cheap_march', 'Cheap March', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    n('measured_march', 'Measured March', 'Parries hits during the first 0.3 seconds after raising your shield, reflecting 150% of incoming damage without losing guard. The release bash deals 25% less damage.', [mod('guardParry', 'flat', 0.3), mod('bashPower', 'more', -0.25)]),
    [n('patient_march', 'Patient March', '+0.15 seconds to parry window duration.', [mod('guardParry', 'flat', 0.15)]),
      n('punishing_march', 'Punishing March', 'Parries reflect an additional +50% of incoming damage.', [mod('guardParryPower', 'flat', 0.5)]),
      n('sturdy_march', 'Sturdy March', '40% increased guard strength.', [mod('guardStrength', 'increased', 0.4)])],
    [n('returning_guard', 'Returning Guard', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('frugal_guard', 'Frugal Guard', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('warded_march', 'Warded March', 'Gain a shield for 3 seconds equal to 2 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 2)])],
  ], n('march_practice', 'Tower Practice', '15% increased guard strength.', [mod('guardStrength', 'increased', 0.15)])),

  skewer: tree([
    n('deep_skewer', 'Deep Skewer', 'Impales for an additional 40% of physical hit damage, but has 20% less attack speed.', [mod('impalePower', 'flat', 0.4), mod('attackSpeed', 'more', -0.2)]),
    [n('long_skewer', 'Long Skewer', '35% increased melee reach.', [mod('meleeReach', 'increased', 0.35)]),
      n('certain_skewer', 'Certain Skewer', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('open_skewer', 'Open Skewer', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)])],
    [n('barbed_skewer', 'Barbed Skewer', 'Hits always inflict bleed.', [mod('apply_bleed', 'flat', 1)]),
      n('feeding_skewer', 'Feeding Skewer', 'Recover life equal to 5% of bleed damage dealt by this skill.', [mod('dotLeech_bleed', 'flat', 0.05)]),
      n('hungry_skewer', 'Hungry Skewer', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
  ], [
    n('raking_spear', 'Raking Spear', 'Strikes in a 150-degree arc, but deals 25% less damage.', [mod('damage', 'more', -0.25)], { arcDeg: 150 }),
    [n('wide_rake', 'Wide Rake', '30% increased melee reach.', [mod('meleeReach', 'increased', 0.3)]),
      n('stunning_rake', 'Stunning Rake', '+25% chance to stun.', [mod('apply_stun', 'flat', 0.25)]),
      n('heavy_rake', 'Heavy Rake', 'Deals 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)])],
    [n('swift_rake', 'Swift Rake', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('paid_rake', 'Paid Rake', 'Gain 2 life on hit.', [mod('lifeOnHit', 'flat', 2)]),
      n('cheap_rake', 'Cheap Rake', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], physical('skewer')),

  pinning_spear: tree([
    n('spear_fence', 'Spear Fence', 'Throws 3 parallel spears that plant on impact, but deals 30% less damage per spear and costs 30% more mana.', [mod('projectileCount', 'flat', 2), mod('fireVolley', 'flat', 1), mod('damage', 'more', -0.3), mod('manaCost', 'more', 0.3)]),
    [n('lasting_fence', 'Lasting Fence', '40% increased planted spear duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('sturdy_fence', 'Sturdy Fence', '50% increased planted spear life.', [mod('minionLife', 'increased', 0.5)]),
      n('wide_fence', 'Wide Fence', '50% increased projectile spacing.', [mod('volleySpacing', 'increased', 0.5)])],
    [n('ready_fence', 'Ready Fence', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('piercing_fence', 'Piercing Fence', 'Pierces 2 additional enemies.', [mod('pierceCount', 'flat', 2)]),
      n('cheap_fence', 'Cheap Fence', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)])],
  ], [
    n('lodging_spear', 'Lodging Spear', 'Impales for 45% of physical hit damage and grants +70% chance to inflict bleed, but has 15% less attack speed.', [mod('impalePower', 'flat', 0.45), mod('apply_bleed', 'flat', 0.7), mod('attackSpeed', 'more', -0.15)]),
    [n('deep_pin', 'Deep Pin', '40% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['physical'])]),
      n('feeding_pin', 'Feeding Pin', 'Recover life equal to 5% of bleed damage dealt by this skill.', [mod('dotLeech_bleed', 'flat', 0.05)]),
      n('lasting_pin', 'Lasting Pin', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)])],
    [n('swift_pin', 'Swift Pin', '35% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.35)]),
      n('open_pin', 'Open Pin', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)]),
      n('certain_pin', 'Certain Pin', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)])],
  ], physical('pin')),

  spear_recall: tree([
    n('rending_extraction', 'Rending Extraction', 'Extracts impales from enemies within 460 radius for 180% of stored damage, while returning spears carry 20% of stored damage as added physical damage. Costs 25% more mana.', [mod('manaCost', 'more', 0.25)], { recallImpales: { radius: 460, damageScale: 1.8, spearShare: 0.2 } }),
    [n('far_extraction', 'Far Extraction', '30% increased extraction radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('ready_extraction', 'Ready Extraction', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_extraction', 'Cheap Extraction', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
    [buff(n('steel_resolve', 'Steel Resolve', 'Grants 15% less damage taken for 3 seconds when cast.', undefined, { tags: { add: ['buff', 'duration'] } }), 'steel_resolve', { duration: 3, mods: [mod('damageTaken', 'more', -0.15)] }),
      buff(n('mending_resolve', 'Mending Resolve', 'While active, regenerate 3 life per second.'), 'steel_resolve', { mods: [mod('lifeRegen', 'flat', 3)] }),
      n('lasting_resolve', 'Lasting Resolve', '50% increased buff duration.', [mod('effectDuration', 'increased', 0.5)])],
  ], [
    n('crossing_steel', 'Crossing Steel', 'Extracts impales from enemies within 460 radius for 70% of stored damage, while returning spears carry 110% of stored damage as added physical damage to enemies in their path.', undefined, { recallImpales: { radius: 460, damageScale: 0.7, spearShare: 1.1 } }),
    [buff(n('retrievers_stride', "Retriever's Stride", 'Grants 30% increased movement speed for 3 seconds when cast.', undefined, { tags: { add: ['buff', 'duration'] } }), 'retrievers_stride', { duration: 3, mods: [mod('moveSpeed', 'increased', 0.3)] }),
      buff(n('retrievers_tempo', "Retriever's Tempo", 'While active, gain 20% increased attack speed.'), 'retrievers_stride', { mods: [mod('attackSpeed', 'increased', 0.2)] }),
      n('lasting_retrieval', 'Lasting Retrieval', '50% increased buff duration.', [mod('effectDuration', 'increased', 0.5)])],
    [n('wide_retrieval', 'Wide Retrieval', '30% increased extraction radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('ready_retrieval', 'Ready Retrieval', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_retrieval', 'Cheap Retrieval', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], recovery('extraction')),
};
