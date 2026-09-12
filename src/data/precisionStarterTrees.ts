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
    n('deep_incision', 'Deep Incision', 'Gain 30% additional bleed chance and 50% increased physical ailment magnitude. 15% less hit damage.', [mod('apply_bleed', 'flat', 0.3), mod('statusMagnitude', 'increased', 0.5, ['physical']), mod('damage', 'more', -0.15)]),
    [n('patient_incision', 'Patient Incision', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('feeding_incision', 'Feeding Incision', 'Recover life equal to 6% of this skill\'s bleed damage.', [mod('dotLeech_bleed', 'flat', 0.06)]),
      n('spreading_incision', 'Spreading Incision', 'Bleeds spread when their victim dies.', [mod('dotPropagates', 'flat', 1)])],
    [n('surgical_reach', 'Surgical Reach', '35% increased melee reach.', [mod('meleeReach', 'increased', 0.35)]),
      n('wide_incision', 'Wide Incision', '50% increased arc width.', [mod('swingArc', 'increased', 0.5)]),
      n('frugal_incision', 'Frugal Incision', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)])],
  ], [
    n('ragged_crescent', 'Ragged Crescent', 'Send the cut forward as a traveling crescent, striking each enemy once and retaining its bleed. 20% less damage.', [mod('meleeSweep', 'override', 1), mod('damage', 'more', -0.2)], { tags: { add: ['aoe', 'duration', 'sweep'] } }),
    [n('long_crescent', 'Long Crescent', '40% increased sweep travel.', [mod('sweepRange', 'increased', 0.4)]),
      n('broad_crescent', 'Broad Crescent', '35% increased area radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('heavy_crescent', 'Heavy Crescent', 'Lodge 20% of physical hit damage as impale.', [mod('impalePower', 'flat', 0.2)])],
    [n('quick_crescent', 'Quick Crescent', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('open_crescent', 'Open Crescent', 'Ignore 15% of enemy armor.', [mod('armorPen', 'flat', 0.15)]),
      n('hunting_crescent', 'Hunting Crescent', 'Deal 30% more damage against bleeding enemies.', [mod('damage', 'more', 0.3, ['vs:bleed'])])],
  ], n('rend_practice', 'Rend Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  eviscerate: tree([
    n('reopened_wound', 'Reopened Wound', 'Keep the bleeding-target requirement and consume its old bleed. A landed strike opens a fresh bleed, preparing another execution. 20% less hit damage.', [mod('apply_bleed', 'flat', 1), mod('damage', 'more', -0.2)]),
    [n('deep_reopening', 'Deep Reopening', '40% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['physical'])]),
      n('patient_reopening', 'Patient Reopening', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('sustaining_reopening', 'Sustaining Reopening', 'Recover life equal to 6% of this skill\'s bleed damage.', [mod('dotLeech_bleed', 'flat', 0.06)])],
    [n('ready_reopening', 'Ready Reopening', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('certain_reopening', 'Certain Reopening', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('frugal_reopening', 'Frugal Reopening', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    n('crimson_execution', 'Crimson Execution', 'Keep the bleeding-target requirement and consume its bleed. Hits splash into a 65-base-radius area; 20% less damage.', [mod('splashRadius', 'flat', 65), mod('damage', 'more', -0.2)], { tags: { add: ['aoe'] } }),
    [n('wide_execution', 'Wide Execution', '35% increased area radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('final_execution', 'Final Execution', 'Cull enemies below 12% life.', [mod('cullThreshold', 'flat', 0.12)]),
      n('hungry_execution', 'Hungry Execution', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
    [n('precise_execution', 'Precise Execution', 'Gain 12% critical chance.', [mod('critChance', 'flat', 0.12)]),
      n('cruel_execution', 'Cruel Execution', 'Add 40 percentage points of critical multiplier.', [mod('critMulti', 'flat', 0.4)]),
      n('unarmored_execution', 'Unarmored Execution', 'Ignore 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)])],
  ], n('execution_practice', 'Execution Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  invisibility: tree([
    buff(n('patient_vanish', 'Patient Vanish', 'Keep true invisibility and its offensive-act break. While hidden, move 25% faster and regenerate 4 life per second.'), 'invisibility', { mods: [mod('moveSpeed', 'increased', 0.25), mod('lifeRegen', 'flat', 4)] }),
    [n('long_vanish', 'Long Vanish', '50% increased effect duration.', [mod('effectDuration', 'increased', 0.5)]),
      buff(n('sheltered_vanish', 'Sheltered Vanish', 'While hidden, take 20% less damage from stray hits.'), 'invisibility', { mods: [mod('damageTaken', 'more', -0.2)] }),
      buff(n('fleet_vanish', 'Fleet Vanish', 'While hidden, gain another 25% increased movement speed.'), 'invisibility', { mods: [mod('moveSpeed', 'increased', 0.25)] })],
    [n('returning_vanish', 'Returning Vanish', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('frugal_vanish', 'Frugal Vanish', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('warded_vanish', 'Warded Vanish', 'Each mana actually paid grants 2 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins.', [mod('costWard_mana', 'flat', 2)])],
  ], [
    buff(n('assassins_intent', 'Assassin\'s Intent', 'Keep true invisibility. Also prepare your next landed attack hit for 5 base seconds: 35% more damage, consumed by that hit. This preparation survives breaking invisibility.'), 'assassins_intent', { duration: 5, consumeOn: { on: 'hit', tags: ['attack'] }, mods: [mod('damage', 'more', 0.35, ['attack'])] }),
    [buff(n('certain_intent', 'Certain Intent', 'Prepared attacks gain 50% increased accuracy.'), 'assassins_intent', { mods: [mod('accuracy', 'increased', 0.5, ['attack'])] }),
      buff(n('severing_intent', 'Severing Intent', 'Prepared attacks cull enemies below 12% life.'), 'assassins_intent', { mods: [mod('cullThreshold', 'flat', 0.12, ['attack'])] }),
      buff(n('hungry_intent', 'Hungry Intent', 'Prepared attacks leech 10% of hit damage as life.'), 'assassins_intent', { mods: [mod('lifeLeech', 'flat', 0.1, ['attack'])] })],
    [n('lingering_intent', 'Lingering Intent', '40% increased effect duration for concealment and preparation.', [mod('effectDuration', 'increased', 0.4)]),
      n('renewed_intent', 'Renewed Intent', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      buff(n('cruel_intent', 'Cruel Intent', 'Prepared attacks gain 12% critical chance.'), 'assassins_intent', { mods: [mod('critChance', 'flat', 0.12, ['attack'])] })],
  ], n('vanish_practice', 'Vanish Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),

  iai_strike: tree([
    n('blood_draw', 'Blood Draw', 'Keep the timed phasing draw and disarm. Landed cuts also bleed and gain 30% increased physical ailment magnitude; 15% less hit damage.', [mod('apply_bleed', 'flat', 1), mod('statusMagnitude', 'increased', 0.3, ['physical']), mod('damage', 'more', -0.15)]),
    [n('patient_draw', 'Patient Draw', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('feeding_draw', 'Feeding Draw', 'Recover life equal to 6% of this skill\'s bleed damage.', [mod('dotLeech_bleed', 'flat', 0.06)]),
      n('spreading_draw', 'Spreading Draw', 'Bleeds spread when their victim dies.', [mod('dotPropagates', 'flat', 1)])],
    [n('ready_draw', 'Ready Draw', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('piercing_draw', 'Piercing Draw', 'Ignore 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)]),
      n('final_draw', 'Final Draw', 'Cull enemies below 10% life.', [mod('cullThreshold', 'flat', 0.1)])],
  ], [
    buff(n('flowing_draw', 'Flowing Draw', 'Keep the timed phasing draw and disarm. Drawing grants 3 base seconds of 25% increased movement speed and 20% less damage taken.', undefined, { tags: { add: ['buff', 'duration'] } }), 'flowing_draw', { duration: 3, mods: [mod('moveSpeed', 'increased', 0.25), mod('damageTaken', 'more', -0.2)] }),
    [n('flowing_interval', 'Flowing Interval', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('flowing_supply', 'Flowing Supply', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('flowing_patience', 'Flowing Patience', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)])],
    [buff(n('flowing_edge', 'Flowing Edge', 'While the blessing lasts, attacks gain 30% increased damage.'), 'flowing_draw', { mods: [mod('damage', 'increased', 0.3, ['attack'])] }),
      buff(n('flowing_sight', 'Flowing Sight', 'While blessed, gain 40% increased accuracy.'), 'flowing_draw', { mods: [mod('accuracy', 'increased', 0.4)] }),
      buff(n('flowing_guard', 'Flowing Guard', 'While blessed, gain 60% increased evasion.'), 'flowing_draw', { mods: [mod('evasion', 'increased', 0.6)] })],
  ], n('draw_practice', 'Draw Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  zanshin_cut: tree([
    n('quick_composure', 'Quick Composure', 'Every second completed cut prepares the next melee hit for a guaranteed bleed at 1.5 times normal strength. Preparation lasts 8 base seconds.', undefined, cycle(2, 1.5)),
    [n('light_composure', 'Light Composure', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('wide_composure', 'Wide Composure', '40% increased arc width.', [mod('swingArc', 'increased', 0.4)]),
      n('long_composure', 'Long Composure', '30% increased melee reach.', [mod('meleeReach', 'increased', 0.3)])],
    [n('steady_composure', 'Steady Composure', '50% increased preparation duration.', [mod('effectDuration', 'increased', 0.5)]),
      n('frugal_composure', 'Frugal Composure', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('sustaining_composure', 'Sustaining Composure', 'Restore 2 life per landed hit.', [mod('lifeOnHit', 'flat', 2)])],
  ], [
    n('deep_composure', 'Deep Composure', 'Every fourth completed cut prepares the next melee hit for a guaranteed bleed at 4 times normal strength. Preparation lasts 8 base seconds; 20% more cut damage.', [mod('damage', 'more', 0.2)], cycle(4, 4)),
    [n('certain_composure', 'Certain Composure', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('cruel_composure', 'Cruel Composure', 'Gain 12% critical chance.', [mod('critChance', 'flat', 0.12)]),
      n('open_composure', 'Open Composure', 'Ignore 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)])],
    [n('lasting_composure', 'Lasting Composure', '60% increased preparation duration.', [mod('effectDuration', 'increased', 0.6)]),
      n('hungry_composure', 'Hungry Composure', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)]),
      n('held_composure', 'Held Composure', 'Lodge 20% of physical hit damage as impale.', [mod('impalePower', 'flat', 0.2)])],
  ], n('cut_practice', 'Cut Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  riposte: tree([
    n('protectors_counter', 'Protector\'s Counter', 'Nearby minions can shelter behind your frontal parry. An intercepted blow spends your stance on its counter; 25% more mana cost.', [mod('guardAegis', 'flat', 1), mod('manaCost', 'more', 0.25)]),
    [n('patient_counter', 'Patient Counter', 'Add 0.25 seconds to the stance duration.', [mod('guardHoldTime', 'flat', 0.25)]),
      n('lasting_counter', 'Lasting Counter', 'Add another 0.2 seconds to the stance duration.', [mod('guardHoldTime', 'flat', 0.2)]),
      n('firm_counter', 'Firm Counter', 'Counter with an additional 50% of incoming damage.', [mod('parryCounterBonus', 'flat', 0.5)])],
    [n('ready_counter', 'Ready Counter', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('frugal_counter', 'Frugal Counter', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('warded_counter', 'Warded Counter', 'Each mana actually paid grants 3 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins.', [mod('costWard_mana', 'flat', 3)])],
  ], [
    n('razors_reply', 'Razor\'s Reply', 'Shorten the stance by 0.15 seconds. A successful parry counters with an additional 120% of incoming damage.', [mod('guardHoldTime', 'flat', -0.15), mod('parryCounterBonus', 'flat', 1.2)]),
    [n('cruel_reply', 'Cruel Reply', 'Counter with an additional 60% of incoming damage.', [mod('parryCounterBonus', 'flat', 0.6)]),
      n('patient_reply', 'Patient Reply', 'Add 0.15 seconds to the stance duration.', [mod('guardHoldTime', 'flat', 0.15)]),
      n('brutal_reply', 'Brutal Reply', 'Counter with another 50% of incoming damage.', [mod('parryCounterBonus', 'flat', 0.5)])],
    [n('quick_reply', 'Quick Reply', '45% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.45)]),
      n('cheap_reply', 'Cheap Reply', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('paid_reply', 'Paid Reply', 'Each mana actually paid grants 3 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins.', [mod('costWard_mana', 'flat', 3)])],
  ], n('riposte_practice', 'Riposte Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),

  one_two: tree([
    n('knuckle_flurry', 'Knuckle Flurry', 'Each jab and Cross Jab repeats once after 0.22 seconds for no extra payment. Each blow banks its usual Fury; 25% less damage per blow. Repeats do not advance the combo.', [mod('repeatCount', 'flat', 1), mod('damage', 'more', -0.25)]),
    [n('deep_flurry', 'Deep Flurry', 'These blows can bank two additional Fury.', [mod('chargeCap', 'flat', 2)]),
      n('certain_flurry', 'Certain Flurry', '40% increased accuracy.', [mod('accuracy', 'increased', 0.4)]),
      n('sustaining_flurry', 'Sustaining Flurry', 'Restore 1 life per landed hit.', [mod('lifeOnHit', 'flat', 1)])],
    [n('wide_flurry', 'Wide Flurry', '40% increased arc width, also widening Cross Jab\'s strip.', [mod('swingArc', 'increased', 0.4)]),
      n('long_flurry', 'Long Flurry', '30% increased melee reach.', [mod('meleeReach', 'increased', 0.3)]),
      n('open_flurry', 'Open Flurry', 'Ignore 15% of enemy armor.', [mod('armorPen', 'flat', 0.15)])],
  ], [
    n('body_work', 'Body Work', 'Jabs and Cross Jab lodge 25% of physical hit damage as impale. Deal 30% more poise damage and attack 15% slower.', [mod('impalePower', 'flat', 0.25), mod('poiseDamage', 'more', 0.3), mod('attackSpeed', 'more', -0.15)]),
    [n('heavy_bodywork', 'Heavy Bodywork', 'Deal 35% more poise damage.', [mod('poiseDamage', 'more', 0.35)]),
      n('staggering_bodywork', 'Staggering Bodywork', 'Gain 25% additional chance to stun.', [mod('apply_stun', 'flat', 0.25)]),
      n('opened_bodywork', 'Opened Bodywork', 'Deal 35% more damage against stunned enemies.', [mod('damage', 'more', 0.35, ['vs:stun'])])],
    [n('hungry_bodywork', 'Hungry Bodywork', 'Leech 6% of hit damage as life.', [mod('lifeLeech', 'flat', 0.06)]),
      n('deep_bodywork', 'Deep Bodywork', 'Lodge another 15% of physical hit damage as impale.', [mod('impalePower', 'flat', 0.15)]),
      n('frugal_bodywork', 'Frugal Bodywork', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], n('jab_practice', 'Jab Practice', '15% increased physical damage for jabs and Cross Jab.', [mod('damage', 'increased', 0.15, ['physical'])])),

  chain_pull: tree([
    n('dragnet_chain', 'Dragnet Chain', 'Fire two additional chains, each retaining its stun and pull. 30% less damage per chain.', [mod('projectileCount', 'flat', 2), mod('damage', 'more', -0.3)]),
    [n('seeking_chains', 'Seeking Chains', 'Chains home toward enemies.', [mod('homingPower', 'flat', 2)]),
      n('piercing_chains', 'Piercing Chains', 'Each chain pierces two additional enemies.', [mod('pierceCount', 'flat', 2)]),
      n('wide_chains', 'Wide Chains', '50% increased projectile size.', [mod('projectileSize', 'increased', 0.5)])],
    [n('ready_dragnet', 'Ready Dragnet', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_dragnet', 'Cheap Dragnet', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('hungry_dragnet', 'Hungry Dragnet', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
  ], [
    n('barbed_reel', 'Barbed Reel', 'Keep the single stunning pull. Hits also bleed and lodge 25% of physical hit damage as impale, setting up the next punch.', [mod('apply_bleed', 'flat', 1), mod('impalePower', 'flat', 0.25)]),
    [n('deep_barbs', 'Deep Barbs', '40% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['physical'])]),
      n('feeding_barbs', 'Feeding Barbs', 'Recover life equal to 5% of this skill\'s bleed damage.', [mod('dotLeech_bleed', 'flat', 0.05)]),
      n('lingering_barbs', 'Lingering Barbs', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)])],
    [n('swift_reel', 'Swift Reel', '40% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.4)]),
      n('certain_reel', 'Certain Reel', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('open_reel', 'Open Reel', 'Ignore 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)])],
  ], n('chain_practice', 'Chain Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),

  haymaker: tree([
    n('measured_hook', 'Measured Hook', 'Require and spend exactly 2 Fury for 35% more damage per Fury spent. Preserve the rest of the bank and the original heavy knockback.', undefined, { chargeCost: { charge: 'fury', amount: 2, damagePerCharge: 0.35 } }),
    [n('ready_hook', 'Ready Hook', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('quick_hook', 'Quick Hook', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('frugal_hook', 'Frugal Hook', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
    [n('heavy_hook', 'Heavy Hook', 'Deal 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)]),
      n('staggering_hook', 'Staggering Hook', 'Gain 30% additional chance to stun.', [mod('apply_stun', 'flat', 0.3)]),
      n('hungry_hook', 'Hungry Hook', 'Leech 10% of hit damage as life.', [mod('lifeLeech', 'flat', 0.1)])],
  ], [
    n('clearing_hook', 'Clearing Hook', 'Widen the hook to a 150-degree arc, keeping the full Fury spend and heavy knockback. 15% less damage.', [mod('damage', 'more', -0.15)], { arcDeg: 150 }),
    [n('long_hook', 'Long Hook', '40% increased melee reach.', [mod('meleeReach', 'increased', 0.4)]),
      n('broad_hook', 'Broad Hook', '30% increased arc width.', [mod('swingArc', 'increased', 0.3)]),
      n('certain_hook', 'Certain Hook', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)])],
    [n('open_hook', 'Open Hook', 'Ignore 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)]),
      n('final_hook', 'Final Hook', 'Cull enemies below 10% life.', [mod('cullThreshold', 'flat', 0.1)]),
      n('paid_hook', 'Paid Hook', 'Restore 3 life per landed hit.', [mod('lifeOnHit', 'flat', 3)])],
  ], n('hook_practice', 'Hook Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),
};
