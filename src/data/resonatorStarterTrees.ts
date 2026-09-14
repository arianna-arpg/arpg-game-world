import type { SkillTreeSpec, TreeAuraPatch } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';

const aura = (node: Node, patch: TreeAuraPatch): Node => ({ ...node, over: { ...node.over, aura: patch } });

/** Tone statuses remain ordinary, independently rolled statuses. These trees
 * never replace their native grants or teach the crystal puzzle a new rule. */
export const RESONATOR_STARTER_TREES: Record<string, SkillTreeSpec> = {
  tuning_strike: tree([
    n('full_peal', 'Full Peal', 'Add 67% status chance: each landed strike attempts all three attunements with certainty before resistance. Attack 20% slower. Attunements still strengthen the victim.', [mod('statusChance', 'flat', 0.67), mod('attackSpeed', 'more', -0.2)]),
    [n('sustained_peal', 'Sustained Peal', '40% increased attunement duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('deep_peal', 'Deep Peal', 'Ignore 25% of enemy armor.', [mod('armorPen', 'flat', 0.25)]),
      n('fed_peal', 'Fed by the Peal', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
    [n('long_peal', 'Long Peal', '30% increased melee reach.', [mod('meleeReach', 'increased', 0.3)]),
      n('quick_peal', 'Quick Peal', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('cheap_peal', 'Measured Peal', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    n('choir_sweep', 'Choir Sweep', 'Strike a 240-degree arc, spreading the native independent attunement rolls across nearby bodies. Deal 20% less damage.', [mod('damage', 'more', -0.2)], { arcDeg: 240 }),
    [n('wide_choir', 'Gather the Choir', '35% increased melee reach.', [mod('meleeReach', 'increased', 0.35)]),
      n('paid_choir', 'Living Chorus', 'Restore 4 life per landed hit.', [mod('lifeOnHit', 'flat', 4)]),
      n('heavy_choir', 'Unsteady Chorus', 'Deal 50% more poise damage.', [mod('poiseDamage', 'more', 0.5)])],
    [n('quick_choir', 'Quick Chorus', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('lasting_choir', 'Lingering Chorus', '40% increased attunement duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('certain_choir', 'Find Every Voice', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)])],
  ], n('tuning_practice', 'Practiced Strike', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  shatterchord: tree([
    n('sympathetic_ruin', 'Sympathetic Ruin', 'Deal 30% more damage for each fire, cold and lightning attunement on the victim, multiplying together. Preserve the tones. The nova has 20% less radius.', [mod('damage', 'more', 0.3, ['vs:attuned_fire']), mod('damage', 'more', 0.3, ['vs:attuned_cold']), mod('damage', 'more', 0.3, ['vs:attuned_lightning']), mod('aoeRadius', 'more', -0.2)]),
    [n('piercing_harmony', 'Piercing Harmony', 'Penetrate 15% fire, cold and lightning resistance.', [mod('firePen', 'flat', 0.15), mod('coldPen', 'flat', 0.15), mod('lightningPen', 'flat', 0.15)]),
      n('hungry_harmony', 'Hungry Harmony', 'Leech 6% of hit damage as life.', [mod('lifeLeech', 'flat', 0.06)]),
      n('heavy_harmony', 'Weight of Harmony', 'Deal 50% more poise damage.', [mod('poiseDamage', 'more', 0.5)])],
    [n('ready_harmony', 'Returning Harmony', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('wide_harmony', 'Carry the Harmony', '35% increased nova radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('cheap_harmony', 'Measured Harmony', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    n('damping_chord', 'Damping Chord', 'Landed hits always attempt to stun before resistance. Deal 20% less damage.', [mod('apply_stun', 'flat', 1), mod('damage', 'more', -0.2)]),
    [n('wide_damping', 'Room for Silence', '35% increased nova radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('lasting_damping', 'Lasting Silence', '40% increased stun duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('paid_damping', 'Breath in the Silence', 'Restore 4 life per landed hit.', [mod('lifeOnHit', 'flat', 4)])],
    [n('ready_damping', 'Silence Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('quick_damping', 'Sudden Silence', '30% increased cast speed.', [mod('castSpeed', 'increased', 0.3)]),
      n('cheap_damping', 'Quiet Breath', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], n('chord_practice', 'Practiced Chord', '15% increased damage.', [mod('damage', 'increased', 0.15)])),

  purity_of_elements: tree([
    aura(n('sheltering_harmony', 'Sheltering Harmony', 'Allies inside also take 12% less damage. The aura has 20% less radius. Keep all native resistances and ailment resistance.', [mod('aoeRadius', 'more', -0.2)]), { allyMods: [mod('damageTaken', 'more', -0.12)] }),
    [aura(n('steady_harmony', 'Steady Harmony', 'Allies inside also gain 15% ailment resistance.'), { allyMods: [mod('ailmentResist', 'flat', 0.15)] }),
      aura(n('mending_harmony', 'Mending Harmony', 'Allies inside also regenerate 1% of maximum life per second.'), { allyMods: [mod('lifeRegenPct', 'flat', 0.01)] }),
      aura(n('iron_harmony', 'Iron Harmony', 'Allies inside also gain 40% increased armor.'), { allyMods: [mod('armor', 'increased', 0.4)] })],
    [n('room_harmony', 'Room in the Harmony', '35% increased aura radius.', [mod('aoeRadius', 'increased', 0.35)]),
      aura(n('swift_harmony', 'Safe Passage', 'Allies inside also gain 10% increased movement speed.'), { allyMods: [mod('moveSpeed', 'increased', 0.1)] }),
      aura(n('deep_harmony', 'Deep Shelter', 'Allies inside also gain 8% fire, cold, lightning and chaos resistance.'), { allyMods: [mod('fireRes', 'flat', 0.08), mod('coldRes', 'flat', 0.08), mod('lightningRes', 'flat', 0.08), mod('chaosRes', 'flat', 0.08)] })],
  ], [
    aura(n('resounding_harmony', 'Resounding Harmony', 'Allies inside also gain 25% increased fire, cold and lightning damage, but take 10% more damage. Keep all native resistances and ailment resistance.'), { allyMods: [mod('damage', 'increased', 0.25, ['fire']), mod('damage', 'increased', 0.25, ['cold']), mod('damage', 'increased', 0.25, ['lightning']), mod('damageTaken', 'more', 0.1)] }),
    [aura(n('quick_resonance', 'Quick Resonance', 'Allies inside also gain 10% increased attack and cast speed.'), { allyMods: [mod('attackSpeed', 'increased', 0.1), mod('castSpeed', 'increased', 0.1)] }),
      aura(n('piercing_resonance', 'Piercing Resonance', 'Allies inside also penetrate 10% fire, cold and lightning resistance.'), { allyMods: [mod('firePen', 'flat', 0.1), mod('coldPen', 'flat', 0.1), mod('lightningPen', 'flat', 0.1)] }),
      aura(n('hungry_resonance', 'Hungry Resonance', 'Allies inside also leech 3% of hit damage as life.'), { allyMods: [mod('lifeLeech', 'flat', 0.03)] })],
    [n('wide_resonance', 'Carry the Resonance', '35% increased aura radius.', [mod('aoeRadius', 'increased', 0.35)]),
      aura(n('mobile_resonance', 'Marching Resonance', 'Allies inside also gain 10% increased movement speed.'), { allyMods: [mod('moveSpeed', 'increased', 0.1)] }),
      aura(n('damping_resonance', 'Damp the Pursuit', 'Enemies inside move 20% slower.'), { enemyMods: [mod('moveSpeed', 'increased', -0.2)] })],
  ], n('purity_practice', 'Practiced Reach', '10% increased aura radius.', [mod('aoeRadius', 'increased', 0.1)])),
};
