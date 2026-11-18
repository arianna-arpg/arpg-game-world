import { ASSAULT_TREE } from './assaultTree';
import { HIVECALL_TREE } from './hivecall';
import { GNATVEIL_TREE } from './gnatveilTree';
import type { SkillTreeSpec, TreeBuffPatch } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const graft = (node: Node, support: string): Node => ({ ...node, graft: { support, level: 1 } });
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });
/** A complete second set of opening bars: the commander, archer and defender. */
export const FRONTIER_STARTER_TREES: Record<string, SkillTreeSpec> = {
  summon_swarmlings: HIVECALL_TREE,

  raise_gnatveil: GNATVEIL_TREE,

  command_assault: ASSAULT_TREE,

  piercing_arrow: tree([
    n('bodkin_arrow', 'Bodkin Arrow', 'Impales enemies for 25% of physical hit damage and ignores 10% of enemy armor.', [mod('impalePower', 'flat', 0.25), mod('armorPen', 'flat', 0.1)]),
    [n('hardened_tip', 'Hardened Tip', '20% increased physical damage and impales for an additional 10% of physical hit damage.', [mod('damage', 'increased', 0.2, ['physical']), mod('impalePower', 'flat', 0.1)]),
      n('barbed_tip', 'Barbed Tip', 'Hits have a 40% chance to inflict bleed and 30% increased physical ailment magnitude.', [mod('apply_bleed', 'flat', 0.4), mod('statusMagnitude', 'increased', 0.3, ['physical'])]),
      n('heartseeker_tip', 'Heartseeker Tip', 'Culls enemies below 8% life.', [mod('cullThreshold', 'flat', 0.08)])],
    [n('long_shaft', 'Long Shaft', '40% increased projectile speed and 25% increased accuracy.', [mod('projectileSpeed', 'increased', 0.4), mod('accuracy', 'increased', 0.25)]),
      n('clean_puncture', 'Clean Puncture', '+10% critical chance and +30% critical multiplier.', [mod('critChance', 'flat', 0.1), mod('critMulti', 'flat', 0.3)]),
      n('relentless_puncture', 'Relentless Puncture', 'Pierces 2 additional enemies.', [mod('pierceCount', 'flat', 2)])],
  ], [
    n('raking_volley', 'Raking Volley', 'Fires 2 additional arrows, but deals 25% less damage per arrow.', [mod('projectileCount', 'flat', 2), mod('damage', 'more', -0.25)]),
    [n('broad_quiver', 'Broad Quiver', 'Fires 1 additional arrow, but deals 10% less damage per arrow.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.1)]),
      n('seeking_volley', 'Seeking Volley', 'Arrows curve toward nearby enemies.', [mod('homingPower', 'flat', 1.2)]),
      n('heavy_fletching', 'Heavy Fletching', '50% increased projectile size and 20% increased damage.', [mod('projectileSize', 'increased', 0.5), mod('damage', 'increased', 0.2)])],
    [n('rapid_nocking', 'Rapid Nocking', '20% increased attack speed.', [mod('attackSpeed', 'increased', 0.2)]),
      graft(n('retracing_volley', 'Retracing Volley', 'Arrows return to you at the end of their flight and can hit enemies again on the way back.'), 'returning'),
      n('cruel_volley', 'Cruel Volley', '35% increased damage and 15% reduced mana cost.', [mod('damage', 'increased', 0.35), mod('manaCost', 'increased', -0.15)])],
  ], n('bow_practice', 'Bow Practice', '15% increased damage.', [mod('damage', 'increased', 0.15)])),

  fan_of_blades: tree([
    n('needle_fan', 'Needle Fan', '65% reduced spread angle and deals 20% more damage.', [mod('spreadAngle', 'increased', -0.65), mod('damage', 'more', 0.2)]),
    [n('tempered_needles', 'Tempered Needles', 'Pierces 2 additional enemies.', [mod('pierceCount', 'flat', 2)]),
      n('armor_needles', 'Armor Needles', 'Ignores 15% of enemy armor.', [mod('armorPen', 'flat', 0.15)]),
      n('bleeding_needles', 'Bleeding Needles', 'Hits have a 40% chance to inflict bleed.', [mod('apply_bleed', 'flat', 0.4)])],
    [n('balanced_throw', 'Balanced Throw', '35% increased cooldown recovery and 20% increased accuracy.', [mod('cooldownRecovery', 'increased', 0.35), mod('accuracy', 'increased', 0.2)]),
      n('killing_throw', 'Killing Throw', '+10% critical chance and +30% critical multiplier.', [mod('critChance', 'flat', 0.1), mod('critMulti', 'flat', 0.3)]),
      n('driving_throw', 'Driving Throw', '+30 knockback strength and 20% increased damage.', [mod('knockback', 'flat', 30), mod('damage', 'increased', 0.2)])],
  ], [
    graft(n('retracing_fan', 'Retracing Fan', 'Knives return to you at the end of their flight, hitting enemies again on the way back.'), 'returning'),
    [n('crowded_fan', 'Crowded Fan', 'Fires 2 additional knives, but deals 10% less damage per knife.', [mod('projectileCount', 'flat', 2), mod('damage', 'more', -0.1)]),
      n('wide_reaping', 'Wide Reaping', '35% increased spread angle and 35% increased projectile size.', [mod('spreadAngle', 'increased', 0.35), mod('projectileSize', 'increased', 0.35)]),
      n('unbroken_fan', 'Unbroken Fan', 'Pierces 1 additional enemy.', [mod('pierceCount', 'flat', 1)])],
    [n('keen_returns', 'Keen Returns', '30% increased physical damage.', [mod('damage', 'increased', 0.3, ['physical'])]),
      n('lingering_wounds', 'Lingering Wounds', 'Hits have a 35% chance to inflict bleed and 40% increased effect duration.', [mod('apply_bleed', 'flat', 0.35), mod('effectDuration', 'increased', 0.4)]),
      n('quick_returns', 'Quick Returns', '45% increased projectile speed and 25% increased cooldown recovery.', [mod('projectileSpeed', 'increased', 0.45), mod('cooldownRecovery', 'increased', 0.25)])],
  ], n('knife_balance', 'Knife Balance', '15% increased damage.', [mod('damage', 'increased', 0.15)])),

  quickstep: tree([
    buff(n('bounding_stride', 'Bounding Stride', 'Grants an additional 50% increased movement speed for 2 seconds, ending early if you are hit.'), 'quickstep', { duration: 2, clearOnHit: true, mods: [mod('moveSpeed', 'increased', 0.5)] }),
    [n('long_stride', 'Long Stride', '40% increased sprint duration.', [mod('effectDuration', 'increased', 0.4)]),
      buff(n('elusive_stride', 'Elusive Stride', 'While active, gain 60% increased evasion.'), 'quickstep', { mods: [mod('evasion', 'increased', 0.6)] }),
      buff(n('braced_stride', 'Braced Stride', 'While active, take 15% less damage, including from the hit that ends the sprint.'), 'quickstep', { mods: [mod('damageTaken', 'more', -0.15)] })],
    [n('renewed_stride', 'Renewed Stride', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_stride', 'Cheap Stride', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)]),
      n('sheltered_stride', 'Sheltered Stride', 'Gain a shield for 3 seconds equal to 2 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 2)])],
  ], [
    buff(n('hunters_tempo', 'Hunter\'s Tempo', 'Empowers your next projectile attack hit within 4 seconds to deal 40% more damage.'), 'quickstep', { consumeOn: { on: 'hit', tags: ['projectile'] }, mods: [mod('damage', 'more', 0.4, ['attack', 'projectile'])] }),
    [buff(n('steady_draw', 'Steady Draw', 'While empowered, gain 50% increased accuracy and 40% increased projectile speed.'), 'quickstep', { mods: [mod('accuracy', 'increased', 0.5), mod('projectileSpeed', 'increased', 0.4)] }),
      buff(n('vital_shot', 'Vital Shot', 'While empowered, projectile attacks gain +15% critical chance.'), 'quickstep', { mods: [mod('critChance', 'flat', 0.15, ['attack', 'projectile'])] }),
      buff(n('piercing_tempo', 'Piercing Tempo', 'While empowered, projectiles pierce 2 additional enemies.'), 'quickstep', { mods: [mod('pierceCount', 'flat', 2)] })],
    [n('measured_tempo', 'Measured Tempo', '35% increased cooldown recovery and 25% increased buff duration.', [mod('cooldownRecovery', 'increased', 0.35), mod('effectDuration', 'increased', 0.25)]),
      buff(n('finishing_tempo', 'Finishing Tempo', 'While empowered, projectile attacks cull enemies below 10% life.'), 'quickstep', { mods: [mod('cullThreshold', 'flat', 0.1, ['attack', 'projectile'])] }),
      buff(n('leeching_tempo', 'Leeching Tempo', 'While empowered, leech 8% of projectile attack hit damage as life.'), 'quickstep', { mods: [mod('lifeLeech', 'flat', 0.08, ['attack', 'projectile'])] })],
  ], n('footwork', 'Footwork', '15% increased effect duration.', [mod('effectDuration', 'increased', 0.15)])),

  hammer_of_judgment: tree([
    n('bastion_orbit', 'Bastion Orbit', 'Hammers orbit at a fixed distance instead of spiraling outward. Summons 1 additional hammer, but deals 20% less damage per hammer.', [mod('spiralPower', 'override', 0), mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2)]),
    [n('broad_heads', 'Broad Heads', '40% increased projectile size.', [mod('projectileSize', 'increased', 0.4)]),
      n('staggering_ring', 'Staggering Ring', 'Hits have +30% chance to stun.', [mod('apply_stun', 'flat', 0.3)]),
      n('crowded_ring', 'Crowded Ring', 'Summons 1 additional hammer, but deals 10% less damage per hammer.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.1)])],
    [n('enduring_orbit', 'Enduring Orbit', '35% increased effect duration.', [mod('effectDuration', 'increased', 0.35)]),
      n('cruel_orbit', 'Cruel Orbit', '30% increased physical damage and ignores 10% of enemy armor.', [mod('damage', 'increased', 0.3, ['physical']), mod('armorPen', 'flat', 0.1)]),
      n('swift_orbit', 'Swift Orbit', '30% increased projectile speed and 25% increased cooldown recovery.', [mod('projectileSpeed', 'increased', 0.3), mod('cooldownRecovery', 'increased', 0.25)])],
  ], [
    graft(n('pilgrim_hammer', 'Pilgrim Hammer', 'Throws the hammer in a straight line instead of an orbit, piercing 4 additional enemies before returning to you.', [mod('orbitPower', 'override', 0), mod('spiralPower', 'override', 0), mod('pierceCount', 'flat', 4)]), 'returning'),
    [n('long_journey', 'Long Journey', '40% increased projectile speed and 25% increased projectile size.', [mod('projectileSpeed', 'increased', 0.4), mod('projectileSize', 'increased', 0.25)]),
      n('twin_pilgrims', 'Twin Pilgrims', 'Throws 1 additional hammer, but deals 20% less damage per hammer.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2)]),
      n('heavy_judgment', 'Heavy Judgment', 'Deals 35% more damage, but costs 20% more mana.', [mod('damage', 'more', 0.35), mod('manaCost', 'more', 0.2)])],
    [n('shattering_verdict', 'Shattering Verdict', 'Ignores 15% of enemy armor.', [mod('armorPen', 'flat', 0.15)]),
      n('punishing_verdict', 'Punishing Verdict', 'Deals 35% more damage against stunned enemies.', [mod('damage', 'more', 0.35, ['vs:stun'])]),
      n('final_verdict', 'Final Verdict', 'Culls enemies below 10% life.', [mod('cullThreshold', 'flat', 0.1)])],
  ], n('judgments_weight', 'Judgment\'s Weight', '15% increased damage.', [mod('damage', 'increased', 0.15)])),

  aegis_ward: tree([
    buff(n('thornbound_aegis', 'Thornbound Aegis', 'Also grants +24 thorns for 8 seconds to you and affected allies.'), 'aegis_thorns', { duration: 8, mods: [mod('thorns', 'flat', 24)] }),
    [n('layered_aegis', 'Layered Aegis', '35% increased shield strength.', [mod('absorbPower', 'increased', 0.35)]),
      buff(n('reflected_violence', 'Reflected Violence', 'While active, reflect an additional 8% of incoming hit damage as thorns.'), 'aegis_thorns', { mods: [mod('thornsReflect', 'flat', 0.08)] }),
      buff(n('barbed_hits', 'Barbed Hits', 'While active, add 30% of thorns as physical damage on hit.'), 'aegis_thorns', { mods: [mod('thornsToHit', 'flat', 0.3)] })],
    [n('wide_aegis', 'Wide Aegis', '30% increased area radius and 20% increased effect duration.', [mod('aoeRadius', 'increased', 0.3), mod('effectDuration', 'increased', 0.2)]),
      buff(n('iron_thorns', 'Iron Thorns', 'While active, gain +60 armor.'), 'aegis_thorns', { mods: [mod('armor', 'flat', 60)] }),
      n('renewed_aegis', 'Renewed Aegis', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    buff(n('sustaining_aegis', 'Sustaining Aegis', 'Also grants 3 life regenerated per second for 8 seconds to you and affected allies.'), 'aegis_vigil', { duration: 8, mods: [mod('lifeRegen', 'flat', 3)] }),
    [n('deep_reserve', 'Deep Reserve', '45% increased shield strength.', [mod('absorbPower', 'increased', 0.45)]),
      buff(n('quiet_refuge', 'Quiet Refuge', 'While active, take 10% less damage.'), 'aegis_vigil', { mods: [mod('damageTaken', 'more', -0.1)] }),
      buff(n('hastened_recovery', 'Hastened Recovery', 'While active, regenerate an additional 3 life per second.'), 'aegis_vigil', { mods: [mod('lifeRegen', 'flat', 3)] })],
    [n('long_vigil', 'Long Vigil', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('frequent_vigil', 'Frequent Vigil', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      buff(n('walking_refuge', 'Walking Refuge', 'While active, gain 20% increased movement speed.'), 'aegis_vigil', { mods: [mod('moveSpeed', 'increased', 0.2)] })],
  ], n('ward_practice', 'Ward Practice', '15% increased shield strength.', [mod('absorbPower', 'increased', 0.15)])),

  rallying_howl: tree([
    buff(n('vanguard_howl', 'Vanguard Howl', 'Also grants you and affected allies 15% less damage taken for 6 seconds, ending early for each ally when they are hit.'), 'rally_vanguard', { duration: 6, clearOnHit: true, mods: [mod('damageTaken', 'more', -0.15)] }),
    [buff(n('iron_chorus', 'Iron Chorus', 'Also grants +60 armor.'), 'rally_vanguard', { mods: [mod('armor', 'flat', 60)] }),
      buff(n('guarded_chorus', 'Guarded Chorus', 'Also grants +8% block chance.'), 'rally_vanguard', { mods: [mod('blockChance', 'flat', 0.08)] }),
      buff(n('fleet_chorus', 'Fleet Chorus', 'Also grants 25% increased movement speed.'), 'rally_vanguard', { mods: [mod('moveSpeed', 'increased', 0.25)] })],
    [n('broad_chorus', 'Broad Chorus', '30% increased area radius and 20% increased duration.', [mod('aoeRadius', 'increased', 0.3), mod('effectDuration', 'increased', 0.2)]),
      n('returning_chorus', 'Returning Chorus', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      buff(n('mending_chorus', 'Mending Chorus', 'Also grants 3 life regenerated per second.'), 'rally_vanguard', { mods: [mod('lifeRegen', 'flat', 3)] })],
  ], [
    buff(n('decisive_howl', 'Decisive Howl', 'Also empowers you and affected allies for 6 seconds, causing each ally\'s next attack hit to deal 30% more damage.'), 'rally_preparation', { duration: 6, consumeOn: { on: 'hit', tags: ['attack'] }, mods: [mod('damage', 'more', 0.3, ['attack'])] }),
    [buff(n('certain_chorus', 'Certain Chorus', 'While empowered, gain 30% increased accuracy and +10% attack critical chance.'), 'rally_preparation', { mods: [mod('accuracy', 'increased', 0.3), mod('critChance', 'flat', 0.1, ['attack'])] }),
      buff(n('crushing_chorus', 'Crushing Chorus', 'Empowered attack hits gain +30% chance to stun.'), 'rally_preparation', { mods: [mod('apply_stun', 'flat', 0.3, ['attack'])] }),
      buff(n('feeding_chorus', 'Feeding Chorus', 'Empowered attacks leech 8% of hit damage as life.'), 'rally_preparation', { mods: [mod('lifeLeech', 'flat', 0.08, ['attack'])] })],
    [n('frequent_calls', 'Frequent Calls', '35% increased cooldown recovery and 20% reduced mana cost.', [mod('cooldownRecovery', 'increased', 0.35), mod('manaCost', 'increased', -0.2)]),
      buff(n('finishing_chorus', 'Finishing Chorus', 'Empowered attacks cull enemies below 8% life.'), 'rally_preparation', { mods: [mod('cullThreshold', 'flat', 0.08, ['attack'])] }),
      n('patient_chorus', 'Patient Chorus', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)])],
  ], n('rally_practice', 'Rally Practice', '15% increased effect duration.', [mod('effectDuration', 'increased', 0.15)])),
};
