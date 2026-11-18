import type { SkillTreeSpec, TreeBuffPatch } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });
const cycle = (count: number, scale: number): Node['over'] => ({
  tags: { add: ['buff', 'duration'] },
  castCycle: { count, buff: { type: 'buff', id: 'zanshin', duration: 8, maxStacks: 1, mods: [], nextHit: { tags: ['melee'], status: 'bleed', statusScale: scale } } },
});

export const PRECISION_STARTER_TREES: Record<string, SkillTreeSpec> = {
  rend: tree([
    n('deep_incision', 'Deep Incision', '+30% chance to inflict bleed and 50% increased physical ailment magnitude, but deals 15% less hit damage.', [mod('apply_bleed', 'flat', 0.3), mod('statusMagnitude', 'increased', 0.5, ['physical']), mod('damage', 'more', -0.15)]),
    [n('patient_incision', 'Patient Incision', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('feeding_incision', 'Feeding Incision', 'Recover life equal to 6% of bleed damage dealt by this skill.', [mod('dotLeech_bleed', 'flat', 0.06)]),
      n('spreading_incision', 'Spreading Incision', 'Bleeds spread to nearby enemies when their victim dies.', [mod('dotPropagates', 'flat', 1)])],
    [n('surgical_reach', 'Surgical Reach', '35% increased melee reach.', [mod('meleeReach', 'increased', 0.35)]),
      n('wide_incision', 'Wide Incision', '50% increased arc width.', [mod('swingArc', 'increased', 0.5)]),
      n('frugal_incision', 'Frugal Incision', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)])],
  ], [
    n('ragged_crescent', 'Ragged Crescent', 'Unleashes a traveling crescent wave that strikes each enemy in its path once, but deals 20% less damage.', [mod('meleeSweep', 'override', 1), mod('damage', 'more', -0.2)], { tags: { add: ['aoe', 'duration', 'sweep'] } }),
    [n('long_crescent', 'Long Crescent', '40% increased wave travel distance.', [mod('sweepRange', 'increased', 0.4)]),
      n('broad_crescent', 'Broad Crescent', '35% increased area radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('heavy_crescent', 'Heavy Crescent', 'Impales enemies for 20% of physical hit damage.', [mod('impalePower', 'flat', 0.2)])],
    [n('quick_crescent', 'Quick Crescent', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('open_crescent', 'Open Crescent', 'Ignores 15% of enemy armor.', [mod('armorPen', 'flat', 0.15)]),
      n('hunting_crescent', 'Hunting Crescent', 'Deals 30% more damage against bleeding enemies.', [mod('damage', 'more', 0.3, ['vs:bleed'])])],
  ], n('rend_practice', 'Rend Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  eviscerate: tree([
    n('reopened_wound', 'Reopened Wound', 'Consumes the target\'s existing bleed and inflicts a new bleed on hit, but deals 20% less hit damage.', [mod('apply_bleed', 'flat', 1), mod('damage', 'more', -0.2)]),
    [n('deep_reopening', 'Deep Reopening', '40% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['physical'])]),
      n('patient_reopening', 'Patient Reopening', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('sustaining_reopening', 'Sustaining Reopening', 'Recover life equal to 6% of bleed damage dealt by this skill.', [mod('dotLeech_bleed', 'flat', 0.06)])],
    [n('ready_reopening', 'Ready Reopening', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('certain_reopening', 'Certain Reopening', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('frugal_reopening', 'Frugal Reopening', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    n('crimson_execution', 'Crimson Execution', 'Hits deal splash damage in a 65 radius, but deal 20% less damage.', [mod('splashRadius', 'flat', 65), mod('damage', 'more', -0.2)], { tags: { add: ['aoe'] } }),
    [n('wide_execution', 'Wide Execution', '35% increased area radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('final_execution', 'Final Execution', 'Culls enemies below 12% life.', [mod('cullThreshold', 'flat', 0.12)]),
      n('hungry_execution', 'Hungry Execution', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
    [n('precise_execution', 'Precise Execution', '+12% critical chance.', [mod('critChance', 'flat', 0.12)]),
      n('cruel_execution', 'Cruel Execution', '+40% critical multiplier.', [mod('critMulti', 'flat', 0.4)]),
      n('unarmored_execution', 'Unarmored Execution', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)])],
  ], n('execution_practice', 'Execution Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  invisibility: tree([
    buff(n('patient_vanish', 'Patient Vanish', 'While invisible, gain 25% increased movement speed and regenerate 4 life per second.'), 'invisibility', { mods: [mod('moveSpeed', 'increased', 0.25), mod('lifeRegen', 'flat', 4)] }),
    [n('long_vanish', 'Long Vanish', '50% increased effect duration.', [mod('effectDuration', 'increased', 0.5)]),
      buff(n('sheltered_vanish', 'Sheltered Vanish', 'While invisible, take 20% less damage.'), 'invisibility', { mods: [mod('damageTaken', 'more', -0.2)] }),
      buff(n('fleet_vanish', 'Fleet Vanish', 'While invisible, gain an additional 25% increased movement speed.'), 'invisibility', { mods: [mod('moveSpeed', 'increased', 0.25)] })],
    [n('returning_vanish', 'Returning Vanish', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('frugal_vanish', 'Frugal Vanish', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('warded_vanish', 'Warded Vanish', 'Gain a shield for 3 seconds equal to 2 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 2)])],
  ], [
    buff(n('assassins_intent', 'Assassin\'s Intent', 'Empowers your next attack hit within 5 seconds to deal 35% more damage, persisting even after invisibility ends.'), 'assassins_intent', { duration: 5, consumeOn: { on: 'hit', tags: ['attack'] }, mods: [mod('damage', 'more', 0.35, ['attack'])] }),
    [buff(n('certain_intent', 'Certain Intent', 'Empowered attacks gain 50% increased accuracy.'), 'assassins_intent', { mods: [mod('accuracy', 'increased', 0.5, ['attack'])] }),
      buff(n('severing_intent', 'Severing Intent', 'Empowered attacks cull enemies below 12% life.'), 'assassins_intent', { mods: [mod('cullThreshold', 'flat', 0.12, ['attack'])] }),
      buff(n('hungry_intent', 'Hungry Intent', 'Empowered attacks leech 10% of hit damage as life.'), 'assassins_intent', { mods: [mod('lifeLeech', 'flat', 0.1, ['attack'])] })],
    [n('lingering_intent', 'Lingering Intent', '40% increased invisibility and buff duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('renewed_intent', 'Renewed Intent', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      buff(n('cruel_intent', 'Cruel Intent', 'Empowered attacks gain +12% critical chance.'), 'assassins_intent', { mods: [mod('critChance', 'flat', 0.12, ['attack'])] })],
  ], n('vanish_practice', 'Vanish Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),

  iai_strike: tree([
    n('blood_draw', 'Blood Draw', 'Hits always inflict bleed and have 30% increased physical ailment magnitude, but deal 15% less hit damage.', [mod('apply_bleed', 'flat', 1), mod('statusMagnitude', 'increased', 0.3, ['physical']), mod('damage', 'more', -0.15)]),
    [n('patient_draw', 'Patient Draw', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('feeding_draw', 'Feeding Draw', 'Recover life equal to 6% of bleed damage dealt by this skill.', [mod('dotLeech_bleed', 'flat', 0.06)]),
      n('spreading_draw', 'Spreading Draw', 'Bleeds spread to nearby enemies when their victim dies.', [mod('dotPropagates', 'flat', 1)])],
    [n('ready_draw', 'Ready Draw', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('piercing_draw', 'Piercing Draw', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)]),
      n('final_draw', 'Final Draw', 'Culls enemies below 10% life.', [mod('cullThreshold', 'flat', 0.1)])],
  ], [
    buff(n('flowing_draw', 'Flowing Draw', 'Grants 25% increased movement speed and 20% less damage taken for 3 seconds when cast.', undefined, { tags: { add: ['buff', 'duration'] } }), 'flowing_draw', { duration: 3, mods: [mod('moveSpeed', 'increased', 0.25), mod('damageTaken', 'more', -0.2)] }),
    [n('flowing_interval', 'Flowing Interval', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('flowing_supply', 'Flowing Supply', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('flowing_patience', 'Flowing Patience', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)])],
    [buff(n('flowing_edge', 'Flowing Edge', 'While active, gain 30% increased attack damage.'), 'flowing_draw', { mods: [mod('damage', 'increased', 0.3, ['attack'])] }),
      buff(n('flowing_sight', 'Flowing Sight', 'While active, gain 40% increased accuracy.'), 'flowing_draw', { mods: [mod('accuracy', 'increased', 0.4)] }),
      buff(n('flowing_guard', 'Flowing Guard', 'While active, gain 60% increased evasion.'), 'flowing_draw', { mods: [mod('evasion', 'increased', 0.6)] })],
  ], n('draw_practice', 'Draw Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  zanshin_cut: tree([
    n('quick_composure', 'Quick Composure', 'Every 2nd strike empowers your next melee hit within 8 seconds to guarantee a bleed with 1.5x magnitude.', undefined, cycle(2, 1.5)),
    [n('light_composure', 'Light Composure', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('wide_composure', 'Wide Composure', '40% increased arc width.', [mod('swingArc', 'increased', 0.4)]),
      n('long_composure', 'Long Composure', '30% increased melee reach.', [mod('meleeReach', 'increased', 0.3)])],
    [n('steady_composure', 'Steady Composure', '50% increased buff duration.', [mod('effectDuration', 'increased', 0.5)]),
      n('frugal_composure', 'Frugal Composure', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('sustaining_composure', 'Sustaining Composure', 'Gain 2 life on hit.', [mod('lifeOnHit', 'flat', 2)])],
  ], [
    n('deep_composure', 'Deep Composure', 'Deals 20% more damage. Every 4th strike empowers your next melee hit within 8 seconds to guarantee a bleed with 4x magnitude.', [mod('damage', 'more', 0.2)], cycle(4, 4)),
    [n('certain_composure', 'Certain Composure', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('cruel_composure', 'Cruel Composure', '+12% critical chance.', [mod('critChance', 'flat', 0.12)]),
      n('open_composure', 'Open Composure', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)])],
    [n('lasting_composure', 'Lasting Composure', '60% increased buff duration.', [mod('effectDuration', 'increased', 0.6)]),
      n('hungry_composure', 'Hungry Composure', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)]),
      n('held_composure', 'Held Composure', 'Impales enemies for 20% of physical hit damage.', [mod('impalePower', 'flat', 0.2)])],
  ], n('cut_practice', 'Cut Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  riposte: tree([
    n('protectors_counter', 'Protector\'s Counter', 'Nearby minions are protected by your parry, triggering your counterattack when a hit against them is intercepted. Costs 25% more mana.', [mod('guardAegis', 'flat', 1), mod('manaCost', 'more', 0.25)]),
    [n('patient_counter', 'Patient Counter', '+0.25 seconds to stance duration.', [mod('guardHoldTime', 'flat', 0.25)]),
      n('lasting_counter', 'Lasting Counter', '+0.2 seconds to stance duration.', [mod('guardHoldTime', 'flat', 0.2)]),
      n('firm_counter', 'Firm Counter', 'Counterattacks deal an additional +50% of incoming hit damage.', [mod('parryCounterBonus', 'flat', 0.5)])],
    [n('ready_counter', 'Ready Counter', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('frugal_counter', 'Frugal Counter', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('warded_counter', 'Warded Counter', 'Gain a shield for 3 seconds equal to 3 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 3)])],
  ], [
    n('razors_reply', 'Razor\'s Reply', '-0.15 seconds to stance duration, but counterattacks deal an additional +120% of incoming hit damage.', [mod('guardHoldTime', 'flat', -0.15), mod('parryCounterBonus', 'flat', 1.2)]),
    [n('cruel_reply', 'Cruel Reply', 'Counterattacks deal an additional +60% of incoming hit damage.', [mod('parryCounterBonus', 'flat', 0.6)]),
      n('patient_reply', 'Patient Reply', '+0.15 seconds to stance duration.', [mod('guardHoldTime', 'flat', 0.15)]),
      n('brutal_reply', 'Brutal Reply', 'Counterattacks deal an additional +50% of incoming hit damage.', [mod('parryCounterBonus', 'flat', 0.5)])],
    [n('quick_reply', 'Quick Reply', '45% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.45)]),
      n('cheap_reply', 'Cheap Reply', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('paid_reply', 'Paid Reply', 'Gain a shield for 3 seconds equal to 3 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 3)])],
  ], n('riposte_practice', 'Riposte Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),

  one_two: tree([
    n('knuckle_flurry', 'Knuckle Flurry', 'Each strike repeats once after 0.22 seconds at no extra cost, granting Fury as normal, but deals 25% less damage per hit.', [mod('repeatCount', 'flat', 1), mod('damage', 'more', -0.25)]),
    [n('deep_flurry', 'Deep Flurry', '+2 maximum Fury.', [mod('chargeCap', 'flat', 2)]),
      n('certain_flurry', 'Certain Flurry', '40% increased accuracy.', [mod('accuracy', 'increased', 0.4)]),
      n('sustaining_flurry', 'Sustaining Flurry', 'Gain 1 life on hit.', [mod('lifeOnHit', 'flat', 1)])],
    [n('wide_flurry', 'Wide Flurry', '40% increased arc width.', [mod('swingArc', 'increased', 0.4)]),
      n('long_flurry', 'Long Flurry', '30% increased melee reach.', [mod('meleeReach', 'increased', 0.3)]),
      n('open_flurry', 'Open Flurry', 'Ignores 15% of enemy armor.', [mod('armorPen', 'flat', 0.15)])],
  ], [
    n('body_work', 'Body Work', 'Impales enemies for 25% of physical hit damage and deals 30% more poise damage, but has 15% less attack speed.', [mod('impalePower', 'flat', 0.25), mod('poiseDamage', 'more', 0.3), mod('attackSpeed', 'more', -0.15)]),
    [n('heavy_bodywork', 'Heavy Bodywork', 'Deals 35% more poise damage.', [mod('poiseDamage', 'more', 0.35)]),
      n('staggering_bodywork', 'Staggering Bodywork', '+25% chance to stun.', [mod('apply_stun', 'flat', 0.25)]),
      n('opened_bodywork', 'Opened Bodywork', 'Deals 35% more damage against stunned enemies.', [mod('damage', 'more', 0.35, ['vs:stun'])])],
    [n('hungry_bodywork', 'Hungry Bodywork', 'Leech 6% of hit damage as life.', [mod('lifeLeech', 'flat', 0.06)]),
      n('deep_bodywork', 'Deep Bodywork', 'Impales for an additional 15% of physical hit damage.', [mod('impalePower', 'flat', 0.15)]),
      n('frugal_bodywork', 'Frugal Bodywork', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], n('jab_practice', 'Jab Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  chain_pull: tree([
    n('dragnet_chain', 'Dragnet Chain', 'Fires 2 additional chains, but deals 30% less damage per chain.', [mod('projectileCount', 'flat', 2), mod('damage', 'more', -0.3)]),
    [n('seeking_chains', 'Seeking Chains', 'Chains curve toward nearby enemies.', [mod('homingPower', 'flat', 2)]),
      n('piercing_chains', 'Piercing Chains', 'Pierces 2 additional enemies.', [mod('pierceCount', 'flat', 2)]),
      n('wide_chains', 'Wide Chains', '50% increased projectile size.', [mod('projectileSize', 'increased', 0.5)])],
    [n('ready_dragnet', 'Ready Dragnet', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_dragnet', 'Cheap Dragnet', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('hungry_dragnet', 'Hungry Dragnet', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
  ], [
    n('barbed_reel', 'Barbed Reel', 'Hits always inflict bleed and impale for 25% of physical hit damage.', [mod('apply_bleed', 'flat', 1), mod('impalePower', 'flat', 0.25)]),
    [n('deep_barbs', 'Deep Barbs', '40% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['physical'])]),
      n('feeding_barbs', 'Feeding Barbs', 'Recover life equal to 5% of bleed damage dealt by this skill.', [mod('dotLeech_bleed', 'flat', 0.05)]),
      n('lingering_barbs', 'Lingering Barbs', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)])],
    [n('swift_reel', 'Swift Reel', '40% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.4)]),
      n('certain_reel', 'Certain Reel', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('open_reel', 'Open Reel', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)])],
  ], n('chain_practice', 'Chain Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),

  haymaker: tree([
    n('measured_hook', 'Measured Hook', 'Consumes exactly 2 Fury to deal 35% more damage per Fury spent, preserving any remaining Fury.', undefined, { chargeCost: { charge: 'fury', amount: 2, damagePerCharge: 0.35 } }),
    [n('ready_hook', 'Ready Hook', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('quick_hook', 'Quick Hook', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('frugal_hook', 'Frugal Hook', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
    [n('heavy_hook', 'Heavy Hook', 'Deals 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)]),
      n('staggering_hook', 'Staggering Hook', '+30% chance to stun.', [mod('apply_stun', 'flat', 0.3)]),
      n('hungry_hook', 'Hungry Hook', 'Leech 10% of hit damage as life.', [mod('lifeLeech', 'flat', 0.1)])],
  ], [
    n('clearing_hook', 'Clearing Hook', 'Strikes in a 150-degree arc, but deals 15% less damage.', [mod('damage', 'more', -0.15)], { arcDeg: 150 }),
    [n('long_hook', 'Long Hook', '40% increased melee reach.', [mod('meleeReach', 'increased', 0.4)]),
      n('broad_hook', 'Broad Hook', '30% increased arc width.', [mod('swingArc', 'increased', 0.3)]),
      n('certain_hook', 'Certain Hook', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)])],
    [n('open_hook', 'Open Hook', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)]),
      n('final_hook', 'Final Hook', 'Culls enemies below 10% life.', [mod('cullThreshold', 'flat', 0.1)]),
      n('paid_hook', 'Paid Hook', 'Gain 3 life on hit.', [mod('lifeOnHit', 'flat', 3)])],
  ], n('hook_practice', 'Hook Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),
};
