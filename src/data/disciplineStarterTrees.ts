import type { SkillTreeSpec, TreeBuffPatch, TreeAuraPatch } from '../engine/skills';
import { mod, type Modifier } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const aura = (node: Node, patch: TreeAuraPatch): Node => ({ ...node, over: { ...node.over, aura: patch } });
const self = (node: Node, ...selfMods: Modifier[]) => aura(node, { selfMods });
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });
const damage = (id: string) => n(id + '_practice', 'Practiced Force', '15% increased damage.', [mod('damage', 'increased', 0.15)]);
const ready = (id: string, name = 'Ready Again') => n(id, name, '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]);
const cheap = (id: string) => n(id, 'Measured Effort', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]);
const wide = (id: string) => n(id, 'Carry the Force', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]);

export const DISCIPLINE_STARTER_TREES: Record<string, SkillTreeSpec> = {
  mantra_strike: tree([
    n('flowing_palm', 'Flowing Palm', 'Strikes in a 240-degree arc, but deals 20% less damage.', [mod('damage', 'more', -0.2)], { arcDeg: 240 }),
    [n('long_palm', 'Open Circle', '35% increased melee reach.', [mod('meleeReach', 'increased', 0.35)]),
      n('mending_palm', 'Shared Breath', 'Gain 3 life on hit.', [mod('lifeOnHit', 'flat', 3)]),
      n('stunning_palm', 'Unsteady Circle', '+30% chance to stun.', [mod('apply_stun', 'flat', 0.3)])],
    [n('quick_palm', 'Continuous Motion', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      cheap('cheap_palm'),
      n('certain_palm', 'Find the Center', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)])],
  ], [
    n('anchored_palm', 'Anchored Palm', 'Impales enemies for 25% of physical hit damage, but has 15% less attack speed.', [mod('impalePower', 'flat', 0.25), mod('attackSpeed', 'more', -0.15)]),
    [n('heavy_palm', 'Weight of Stillness', 'Deals 50% more poise damage.', [mod('poiseDamage', 'more', 0.5)]),
      n('piercing_palm', 'Through the Shell', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)]),
      n('hungry_palm', 'Returned Breath', 'Leech 6% of hit damage as life.', [mod('lifeLeech', 'flat', 0.06)])],
    [n('long_anchor', 'Grounded Reach', '30% increased melee reach.', [mod('meleeReach', 'increased', 0.3)]),
      n('precise_anchor', 'Single Point', '+8% critical chance.', [mod('critChance', 'flat', 0.08)]),
      cheap('cheap_anchor')],
  ], damage('mantra')),

  wellspring_stance: tree([
    self(n('iron_stillness', 'Iron Stillness', 'While active, take 12% less damage, but move 10% slower.'), mod('damageTaken', 'more', -0.12), mod('moveSpeed', 'increased', -0.1)),
    [self(n('deep_stillness', 'Deeper Footing', 'While active, gain +20 maximum poise.'), mod('poise', 'flat', 20)),
      self(n('iron_footing', 'Iron Footing', 'While active, gain 40% increased armor.'), mod('armor', 'increased', 0.4)),
      self(n('steady_footing', 'Steady Footing', 'While active, gain +20% ailment resistance.'), mod('ailmentResist', 'flat', 0.2))],
    [n('efficient_stillness', 'Quiet Exchange', '30% increased mana-to-poise conversion efficiency.', [mod('conduitEfficiency', 'increased', 0.3)]),
      self(n('mending_stillness', 'Mending Stillness', 'While active, regenerate 1% of maximum life per second.'), mod('lifeRegenPct', 'flat', 0.01)),
      self(n('returning_stillness', 'Mind at Rest', 'While active, regenerate 1 additional mana per second.'), mod('manaRegen', 'flat', 1))],
  ], [
    n('rising_spring', 'Rising Spring', 'Drains mana 25% faster and restores 50% more poise per mana spent.', [mod('conduitRate', 'increased', 0.25), mod('conduitEfficiency', 'more', 0.5)]),
    [self(n('broad_spring', 'Deep Reservoir', 'While active, gain +15 maximum poise.'), mod('poise', 'flat', 15)),
      self(n('quick_spring', 'Unbroken Practice', 'While active, gain 15% increased attack speed.'), mod('attackSpeed', 'increased', 0.15)),
      self(n('forceful_spring', 'Directed Current', 'While active, deal 30% more poise damage.'), mod('poiseDamage', 'more', 0.3))],
    [n('clear_spring', 'Clear Exchange', '30% increased mana-to-poise conversion efficiency.', [mod('conduitEfficiency', 'increased', 0.3)]),
      self(n('restoring_spring', 'Renew the Spring', 'While active, regenerate 1.5 additional mana per second.'), mod('manaRegen', 'flat', 1.5)),
      self(n('mobile_spring', 'Walking Meditation', 'While active, gain 15% increased movement speed.'), mod('moveSpeed', 'increased', 0.15))],
  ], n('spring_practice', 'Practiced Exchange', '10% increased mana-to-poise conversion efficiency.', [mod('conduitEfficiency', 'increased', 0.1)])),

  long_exhale: tree([
    n('short_breath', 'Short Breath', '40% less charge time and Winded duration, and deals 20% less damage.', [mod('effectDuration', 'more', -0.4), mod('damage', 'more', -0.2)]),
    [ready('ready_breath', 'Breathe Again'),
      cheap('cheap_breath'),
      n('hungry_breath', 'Returned Air', 'Leech 6% of hit damage as life.', [mod('lifeLeech', 'flat', 0.06)])],
    [wide('wide_breath'),
      n('certain_breath', 'Breathless', '+60% chance to inflict Winded.', [mod('statusChance', 'flat', 0.6)]),
      n('heavy_breath', 'Weight of Air', 'Deals 50% more poise damage.', [mod('poiseDamage', 'more', 0.5)])],
  ], [
    n('deep_breath', 'Deep Breath', 'Deals 30% more damage, with 25% more charge time and Winded duration.', [mod('damage', 'more', 0.3), mod('effectDuration', 'more', 0.25)]),
    [wide('broad_exhale'),
      n('stunning_exhale', 'Thunder in the Chest', '+40% chance to stun.', [mod('apply_stun', 'flat', 0.4)]),
      n('piercing_exhale', 'Through the Wall', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)])],
    [ready('ready_exhale'),
      cheap('cheap_exhale'),
      n('critical_exhale', 'One Perfect Breath', '+8% critical chance.', [mod('critChance', 'flat', 0.08)])],
  ], damage('exhale')),

  ashen_vow: tree([
    self(n('barbed_vow', 'Barbed Vow', 'While active, gain +12 thorns and reflect 10% of incoming hit damage.'), mod('thorns', 'flat', 12), mod('thornsReflect', 'flat', 0.1)),
    [self(n('deep_barbs', 'Deep Barbs', 'While active, gain +12 thorns.'), mod('thorns', 'flat', 12)),
      self(n('iron_vow', 'Iron Penance', 'While active, gain 40% increased armor.'), mod('armor', 'increased', 0.4)),
      self(n('steady_vow', 'Steady Penance', 'While active, gain +20% ailment resistance.'), mod('ailmentResist', 'flat', 0.2))],
    [self(n('driven_barbs', 'Drive the Barbs', 'While active, add 50% of thorns as physical damage on hit.'), mod('thornsToHit', 'flat', 0.5)),
      self(n('hungry_barbs', 'Blood Reclaimed', 'While active, leech 3% of attack hit damage as life.'), mod('lifeLeech', 'flat', 0.03, ['attack'])),
      self(n('quick_barbs', 'Keep the Account', 'While active, gain 15% increased attack speed.'), mod('attackSpeed', 'increased', 0.15))],
  ], [
    self(n('fervent_vow', 'Fervent Vow', 'While active, deal 15% more damage, but take 10% more damage.'), mod('damage', 'more', 0.15), mod('damageTaken', 'more', 0.1)),
    [self(n('swift_fervor', 'Urgent Penance', 'While active, gain 15% increased attack and cast speed.'), mod('attackSpeed', 'increased', 0.15), mod('castSpeed', 'increased', 0.15)),
      self(n('hungry_fervor', 'Claim the Debt', 'While active and on low life, leech an additional 4% of hit damage as life.'), mod('lifeLeech', 'flat', 0.04, undefined, 'lowLife')),
      self(n('precise_fervor', 'Unerring Account', 'While active, gain 35% increased accuracy.'), mod('accuracy', 'increased', 0.35))],
    [self(n('guarded_fervor', 'Broken but Owed', 'While active and on low life, take 12% less damage.'), mod('damageTaken', 'more', -0.12, undefined, 'lowLife')),
      self(n('iron_fervor', 'Armored Debt', 'While active and on low life, gain 50% increased armor.'), mod('armor', 'increased', 0.5, undefined, 'lowLife')),
      self(n('mobile_fervor', 'Carry the Debt', 'While active, gain 15% increased movement speed.'), mod('moveSpeed', 'increased', 0.15))],
  ], self(n('vow_practice', 'Practiced Penance', 'While active, gain +3 thorns.'), mod('thorns', 'flat', 3))),

  transgression: tree([
    n('lasting_absolution', 'Lasting Absolution', '50% increased shield strength and 50% increased duration, but 20% less cooldown recovery.', [mod('absorbPower', 'increased', 0.5), mod('effectDuration', 'increased', 0.5), mod('cooldownRecovery', 'more', -0.2)]),
    [n('deep_absolution', 'Deep Absolution', '30% increased shield strength.', [mod('absorbPower', 'increased', 0.3)]),
      buff(n('iron_absolution', 'Iron Absolution', 'Grants 40% increased armor for 4 seconds.'), 'iron_absolution', { duration: 4, mods: [mod('armor', 'increased', 0.4)] }),
      buff(n('steady_absolution', 'Steady Absolution', 'Grants +20% ailment resistance for 4 seconds.'), 'steady_absolution', { duration: 4, mods: [mod('ailmentResist', 'flat', 0.2)] })],
    [ready('ready_absolution'),
      n('enduring_absolution', 'Enduring Absolution', '40% increased shield and buff duration.', [mod('effectDuration', 'increased', 0.4)]),
      buff(n('returning_absolution', 'A Measured Return', 'Grants 2 additional mana regenerated per second for 4 seconds.'), 'returning_absolution', { duration: 4, mods: [mod('manaRegen', 'flat', 2)] })],
  ], [
    buff(n('defiant_absolution', 'Defiant Absolution', 'Empowers your next attack hit within 4 seconds to deal 30% more damage.'), 'defiant_absolution', { duration: 4, consumeOn: { on: 'hit', tags: ['attack'] }, mods: [mod('damage', 'more', 0.3, ['attack'])] }),
    [buff(n('sharp_absolution', 'Sharp Defiance', 'While empowered, gain +8% attack critical chance.'), 'defiant_absolution', { mods: [mod('critChance', 'flat', 0.08, ['attack'])] }),
      buff(n('hungry_absolution', 'Returned Defiance', 'While empowered, leech 8% of attack hit damage as life.'), 'defiant_absolution', { mods: [mod('lifeLeech', 'flat', 0.08, ['attack'])] }),
      n('patient_absolution', 'Patient Defiance', '40% increased buff and shield duration.', [mod('effectDuration', 'increased', 0.4)])],
    [ready('ready_defiance'),
      n('sheltered_defiance', 'Sheltered Defiance', '30% increased shield strength.', [mod('absorbPower', 'increased', 0.3)]),
      buff(n('mobile_defiance', 'Step beyond Judgment', 'Grants 20% increased movement speed for 3 seconds.'), 'mobile_defiance', { duration: 3, mods: [mod('moveSpeed', 'increased', 0.2)] })],
  ], n('surge_practice', 'Practiced Protection', '15% increased shield strength.', [mod('absorbPower', 'increased', 0.15)])),

  blood_mortgage: tree([
    self(n('secured_mortgage', 'Secured Mortgage', 'While active, gain 40% increased armor and regenerate 1 additional life per second.'), mod('armor', 'increased', 0.4), mod('lifeRegen', 'flat', 1)),
    [n('swift_repayment', 'Swift Repayment', '50% increased blood debt recovery rate from life regeneration.', [mod('overdriveLifeFactor', 'increased', 0.5)]),
      n('early_repayment', 'Earlier Installments', 'Blood debt recovery begins 0.75 seconds sooner.', [mod('overdriveIdleDelay', 'flat', -0.75)]),
      self(n('mending_mortgage', 'Living Collateral', 'While active, regenerate 1 additional life per second.'), mod('lifeRegen', 'flat', 1))],
    [self(n('steady_mortgage', 'Secure the Terms', 'While active, gain +20% ailment resistance.'), mod('ailmentResist', 'flat', 0.2)),
      self(n('guarded_mortgage', 'Protected Collateral', 'While active, take 8% less damage.'), mod('damageTaken', 'more', -0.08)),
      self(n('mobile_mortgage', 'Portable Collateral', 'While active, gain 15% increased movement speed.'), mod('moveSpeed', 'increased', 0.15))],
  ], [
    self(n('aggressive_mortgage', 'Aggressive Mortgage', 'While active, gain 20% increased attack speed, but take 10% more damage.'), mod('attackSpeed', 'increased', 0.2), mod('damageTaken', 'more', 0.1)),
    [n('deep_mortgage', 'Deeper Credit', '20% increased maximum blood debt.', [mod('overdriveCap', 'increased', 0.2)]),
      self(n('hungry_mortgage', 'Collect in Blood', 'While active, leech 4% of attack hit damage as life.'), mod('lifeLeech', 'flat', 0.04, ['attack'])),
      self(n('certain_mortgage', 'Certain Collection', 'While active, gain 40% increased accuracy.'), mod('accuracy', 'increased', 0.4))],
    [n('quick_metabolism', 'Quick Metabolism', '40% increased blood debt recovery rate from life regeneration.', [mod('overdriveLifeFactor', 'increased', 0.4)]),
      self(n('fed_mortgage', 'Feed the Ledger', 'While active, regenerate 1.5 additional life per second.'), mod('lifeRegen', 'flat', 1.5)),
      self(n('forceful_mortgage', 'Enforce the Terms', 'While active, deal 30% more poise damage.'), mod('poiseDamage', 'more', 0.3))],
  ], n('mortgage_practice', 'Practiced Repayment', '15% increased blood debt recovery rate from life regeneration.', [mod('overdriveLifeFactor', 'increased', 0.15)])),

  incite: tree([
    n('certain_riot', 'Certain Riot', '+55% status chance, but 20% less area radius.', [mod('statusChance', 'flat', 0.55), mod('aoeRadius', 'more', -0.2)]),
    [n('lasting_riot', 'Let It Spread', '40% increased status duration.', [mod('effectDuration', 'increased', 0.4)]),
      wide('wide_riot'),
      buff(n('sheltered_riot', 'Behind the Crowd', 'Grants 12% less damage taken for 3 seconds.'), 'sheltered_riot', { duration: 3, mods: [mod('damageTaken', 'more', -0.12)] })],
    [ready('ready_riot'),
      cheap('cheap_riot'),
      n('quick_riot', 'One Terrible Word', '30% increased cast speed.', [mod('castSpeed', 'increased', 0.3)])],
  ], [
    buff(n('vanishing_orator', 'Vanishing Orator', 'Grants 25% increased movement speed and 35% increased evasion for 4 seconds after casting.', undefined, { tags: { add: ['buff'] } }), 'vanishing_orator', { duration: 4, mods: [mod('moveSpeed', 'increased', 0.25), mod('evasion', 'increased', 0.35)] }),
    [wide('public_address'),
      n('lasting_address', 'Lasting Words', '40% increased status and buff duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('certain_address', 'Persuasive Words', '+25% status chance.', [mod('statusChance', 'flat', 0.25)])],
    [ready('ready_address'),
      cheap('cheap_address'),
      buff(n('steady_address', 'Steady Delivery', 'Also grants +20% ailment resistance while the buff is active.'), 'vanishing_orator', { mods: [mod('ailmentResist', 'flat', 0.2)] })],
  ], n('incite_practice', 'Practiced Agitation', '10% increased status and buff duration.', [mod('effectDuration', 'increased', 0.1)])),

  trumpet_peal: tree([
    n('deafening_peal', 'Deafening Peal', '+65% chance to inflict Bewilder, but deals 20% less damage.', [mod('statusChance', 'flat', 0.65), mod('damage', 'more', -0.2)]),
    [wide('broad_peal'),
      n('lasting_peal', 'Ringing Ears', '40% increased Bewilder duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('heavy_peal', 'Shake the Line', 'Deals 50% more poise damage.', [mod('poiseDamage', 'more', 0.5)])],
    [ready('ready_peal'),
      cheap('cheap_peal'),
      n('quick_peal', 'Sudden Note', '30% increased cast speed.', [mod('castSpeed', 'increased', 0.3)])],
  ], [
    buff(n('rallying_peal', 'Rallying Peal', 'Grants you and allies within 160 radius 15% increased attack and cast speed for 4 seconds.', undefined, { tags: { add: ['buff'] } }), 'rallying_peal', { duration: 4, affects: 'allies', radius: 160, mods: [mod('attackSpeed', 'increased', 0.15), mod('castSpeed', 'increased', 0.15)] }),
    [wide('gathering_peal'),
      buff(n('guarded_peal', 'Stand Together', 'Also grants 10% less damage taken.'), 'rallying_peal', { mods: [mod('damageTaken', 'more', -0.1)] }),
      buff(n('mobile_peal', 'March Together', 'Also grants 15% increased movement speed.'), 'rallying_peal', { mods: [mod('moveSpeed', 'increased', 0.15)] })],
    [ready('returning_peal'),
      n('enduring_peal', 'Hold the Note', '40% increased buff and Bewilder duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('piercing_peal', 'Through the Din', 'Penetrates 15% lightning resistance.', [mod('lightningPen', 'flat', 0.15)])],
  ], damage('peal')),

  harrowing_wail: tree([
    n('relentless_wail', 'Relentless Wail', '+15% status chance and 50% increased cooldown recovery, but deals 20% less damage.', [mod('statusChance', 'flat', 0.15), mod('cooldownRecovery', 'increased', 0.5), mod('damage', 'more', -0.2)]),
    [n('lasting_harrow', 'No Reprieve', '40% increased Harrowing duration.', [mod('effectDuration', 'increased', 0.4)]),
      wide('wide_harrow'),
      n('quick_harrow', 'Another Cry', '30% increased cast speed.', [mod('castSpeed', 'increased', 0.3)])],
    [ready('ready_harrow'),
      cheap('cheap_harrow'),
      n('heavy_harrow', 'Break Their Footing', 'Deals 50% more poise damage.', [mod('poiseDamage', 'more', 0.5)])],
  ], [
    n('dread_sentence', 'Dread Sentence', 'Deals 30% more damage against Harrowed enemies and 30% more damage against Horrified enemies, but has 20% less area radius.', [mod('damage', 'more', 0.3, ['vs:harrowing']), mod('damage', 'more', 0.3, ['vs:horrified']), mod('aoeRadius', 'more', -0.2)]),
    [wide('carried_dread'),
      n('piercing_dread', 'Beyond the Shell', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)]),
      n('hungry_dread', 'Drink the Fear', 'Leech 6% of hit damage as life.', [mod('lifeLeech', 'flat', 0.06)])],
    [ready('ready_dread'),
      cheap('cheap_dread'),
      n('precise_dread', 'The Last Word', '+8% critical chance.', [mod('critChance', 'flat', 0.08)])],
  ], damage('wail')),
};
