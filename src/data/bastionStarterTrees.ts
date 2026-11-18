import type { SkillTreeSpec, TreeBuffPatch, TreeAuraPatch } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });
const aura = (node: Node, patch: TreeAuraPatch): Node => ({ ...node, over: { ...node.over, aura: patch } });
const graft = (node: Node, support: string): Node => ({ ...node, graft: { support } });
const damage = (id: string) => n(id + '_practice', 'Practiced Impact', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])]);
const recovery = (id: string) => n(id + '_practice', 'Practiced Command', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)]);

export const BASTION_STARTER_TREES: Record<string, SkillTreeSpec> = {
  spiked_bulwark: tree([
    n('living_hedge', 'Living Hedge', 'While guarding, gain +24 thorns and reflect an additional 15% of incoming hit damage, but have 20% less guard strength.', [mod('thorns', 'flat', 24, undefined, 'guarding'), mod('thornsReflect', 'flat', 0.15, undefined, 'guarding'), mod('guardStrength', 'more', -0.2)]),
    [n('deep_hedge', 'Deep Hedge', 'While guarding, gain +20 thorns.', [mod('thorns', 'flat', 20, undefined, 'guarding')]),
      n('mending_hedge', 'Mending Hedge', 'While guarding, restore 6 life per second to allies within 160 radius.', [mod('guardMend', 'flat', 6)]),
      n('stout_hedge', 'Stout Hedge', '40% increased guard strength.', [mod('guardStrength', 'increased', 0.4)])],
    [n('ready_hedge', 'Ready Hedge', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_hedge', 'Light Brace', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('warded_hedge', 'Ward the Brace', 'Gain a shield for 3 seconds equal to 2 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 2)])],
  ], [
    graft(n('answering_spikes', 'Answering Spikes', 'Releasing your guard triggers a shield bash that scales with remaining guard.'), 'answering_wall'),
    [n('heavy_spikes', 'Heavy Answer', '40% increased shield bash damage.', [mod('bashPower', 'increased', 0.4)]),
      n('hungry_spikes', 'Hungry Answer', 'Leech 8% of shield bash damage as life.', [mod('lifeLeech', 'flat', 0.08)]),
      n('ringing_spikes', 'Ringing Answer', 'Shield bash deals 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)])],
    [n('stout_spikes', 'Steel Behind Spikes', '40% increased guard strength.', [mod('guardStrength', 'increased', 0.4)]),
      n('easy_spikes', 'Early Answer', '25% less remaining guard required to trigger a release bash.', [mod('bashFloor', 'more', -0.25)]),
      n('ready_spikes', 'Brace Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], n('bulwark_practice', 'Practiced Brace', '15% increased guard strength.', [mod('guardStrength', 'increased', 0.15)])),

  bristleback: tree([
    aura(n('sheltering_quills', 'Sheltering Quills', 'Affected allies take 12% less damage, but the aura has 20% less radius.', [mod('aoeRadius', 'more', -0.2)]), { allyMods: [mod('damageTaken', 'more', -0.12)] }),
    [aura(n('iron_quills', 'Iron Quills', 'Affected allies gain 40% increased armor.'), { allyMods: [mod('armor', 'increased', 0.4)] }),
      aura(n('mending_quills', 'Mending Quills', 'Affected allies regenerate 1% of maximum life per second.'), { allyMods: [mod('lifeRegenPct', 'flat', 0.01)] }),
      aura(n('steady_quills', 'Steady Quills', 'Affected allies gain +20% ailment resistance.'), { allyMods: [mod('ailmentResist', 'flat', 0.2)] })],
    [n('wide_quills', 'Room Beneath Quills', '35% increased aura radius.', [mod('aoeRadius', 'increased', 0.35)]),
      aura(n('sharp_quills', 'Deep Quills', 'Affected allies gain +12 thorns.'), { allyMods: [mod('thorns', 'flat', 12)] }),
      aura(n('reflecting_quills', 'Mirrored Quills', 'Affected allies reflect 10% of incoming hit damage.'), { allyMods: [mod('thornsReflect', 'flat', 0.1)] })],
  ], [
    aura(n('hunting_quills', 'Hunting Quills', 'Affected allies add 60% of their thorns as physical damage on hit, but take 10% more damage.'), { allyMods: [mod('thornsToHit', 'flat', 0.6), mod('damageTaken', 'more', 0.1)] }),
    [aura(n('barbed_hunt', 'Barbed Hunt', 'Affected allies gain +15 thorns.'), { allyMods: [mod('thorns', 'flat', 15)] }),
      aura(n('hungry_hunt', 'Hungry Hunt', 'Affected allies leech 4% of attack hit damage as life.'), { allyMods: [mod('lifeLeech', 'flat', 0.04, ['attack'])] }),
      aura(n('certain_hunt', 'Certain Hunt', 'Affected allies gain 35% increased attack accuracy.'), { allyMods: [mod('accuracy', 'increased', 0.35, ['attack'])] })],
    [n('wide_hunt', 'Wide Hunt', '35% increased aura radius.', [mod('aoeRadius', 'increased', 0.35)]),
      aura(n('swift_hunt', 'Swift Hunt', 'Affected allies gain 10% increased attack speed.'), { allyMods: [mod('attackSpeed', 'increased', 0.1)] }),
      aura(n('snagging_hunt', 'Snagging Hunt', 'Enemies within the aura have 20% reduced movement speed.'), { enemyMods: [mod('moveSpeed', 'increased', -0.2)] })],
  ], n('quill_practice', 'Practiced Reach', '10% increased aura radius.', [mod('aoeRadius', 'increased', 0.1)])),

  reprisal: tree([
    n('quilled_answer', 'Quilled Answer', 'Adds 100% of your thorns as physical damage to this hit, but has 15% less attack speed.', [mod('thornsToHit', 'flat', 1), mod('attackSpeed', 'more', -0.15)]),
    [n('deep_answer', 'Drive the Quills', 'Hits always inflict bleed.', [mod('apply_bleed', 'flat', 1)]),
      n('barbed_answer', 'Barbed Answer', '40% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['physical'])]),
      n('feeding_answer', 'Feed the Answer', 'Recover life equal to 6% of bleed damage dealt by this skill.', [mod('dotLeech_bleed', 'flat', 0.06)])],
    [n('ready_answer', 'Answer Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('hungry_answer', 'Claim Restitution', 'Leech 10% of hit damage as life.', [mod('lifeLeech', 'flat', 0.1)]),
      n('certain_answer', 'Certain Answer', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)])],
  ], [
    n('sweeping_rebuke', 'Sweeping Rebuke', 'Strikes in a 240-degree arc, but deals 20% less damage.', [mod('damage', 'more', -0.2)], { arcDeg: 240 }),
    [n('long_rebuke', 'Long Rebuke', '30% increased melee reach.', [mod('meleeReach', 'increased', 0.3)]),
      n('stunning_rebuke', 'Stunning Rebuke', '+40% chance to stun.', [mod('apply_stun', 'flat', 0.4)]),
      n('heavy_rebuke', 'Weight of Rebuke', 'Deals 50% more poise damage.', [mod('poiseDamage', 'more', 0.5)])],
    [n('swift_rebuke', 'Swift Rebuke', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('paid_rebuke', 'Crowded Restitution', 'Gain 4 life on hit.', [mod('lifeOnHit', 'flat', 4)]),
      n('cheap_rebuke', 'Easy Rebuke', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], damage('reprisal')),

  battle_standard: tree([
    aura(n('sheltering_colors', 'Sheltering Colors', 'Allies within the banner\'s aura take 12% less damage.'), { allyMods: [mod('damageTaken', 'more', -0.12)] }),
    [n('stout_colors', 'Stout Colors', '50% increased banner life.', [mod('minionLife', 'increased', 0.5)]),
      aura(n('mending_colors', 'Mending Colors', 'Allies within the banner\'s aura regenerate 1% of maximum life per second.'), { allyMods: [mod('lifeRegenPct', 'flat', 0.01)] }),
      aura(n('iron_colors', 'Iron Colors', 'Allies within the banner\'s aura gain 40% increased armor.'), { allyMods: [mod('armor', 'increased', 0.4)] })],
    [n('wide_colors', 'Wide Colors', '35% increased banner aura radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('lasting_colors', 'Lasting Colors', '40% increased banner duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('cheap_colors', 'Light Standard', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    aura(n('conquering_colors', 'Conquering Colors', 'Allies within the banner\'s aura gain 15% increased attack and cast speed, but the banner has 30% less duration.', [mod('effectDuration', 'more', -0.3)]), { allyMods: [mod('attackSpeed', 'increased', 0.15), mod('castSpeed', 'increased', 0.15)] }),
    [aura(n('certain_colors', 'Certain Colors', 'Allies within the banner\'s aura gain 40% increased accuracy.'), { allyMods: [mod('accuracy', 'increased', 0.4)] }),
      aura(n('cruel_colors', 'Cruel Colors', 'Allies within the banner\'s aura gain +6% attack critical chance.'), { allyMods: [mod('critChance', 'flat', 0.06, ['attack'])] }),
      aura(n('hungry_colors', 'Hungry Colors', 'Allies within the banner\'s aura leech 4% of hit damage as life.'), { allyMods: [mod('lifeLeech', 'flat', 0.04)] })],
    [n('ready_colors', 'Plant Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('second_colors', 'Another Front', '+1 maximum active banner.', [mod('constructMaxCount', 'flat', 1)]),
      aura(n('pressing_colors', 'Press the Front', 'Enemies within the banner\'s aura have 20% reduced movement speed.'), { enemyMods: [mod('moveSpeed', 'increased', -0.2)] })],
  ], recovery('standard')),

  single_out: tree([
    buff(n('warband_verdict', 'Warband Verdict', 'Empowers you and allies within 160 radius for 4 seconds, causing each ally\'s next attack hit to deal 25% more damage.', undefined, { tags: { add: ['buff', 'aoe'] } }), 'warband_verdict', { duration: 4, affects: 'allies', radius: 160, consumeOn: { on: 'hit', tags: ['attack'] }, mods: [mod('damage', 'more', 0.25, ['attack'])] }),
    [n('wide_verdict', 'Heard by All', '35% increased buff radius.', [mod('aoeRadius', 'increased', 0.35)]),
      buff(n('certain_verdict', 'Certain Verdict', 'Empowered attacks gain 40% increased accuracy.'), 'warband_verdict', { mods: [mod('accuracy', 'increased', 0.4, ['attack'])] }),
      buff(n('hungry_verdict', 'Collect the Verdict', 'Empowered attacks leech 6% of hit damage as life.'), 'warband_verdict', { mods: [mod('lifeLeech', 'flat', 0.06, ['attack'])] })],
    [n('lasting_verdict', 'Remember the Name', '40% increased mark and buff duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_verdict', 'Name Another', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_verdict', 'Easy Command', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    buff(n('personal_challenge', 'Personal Challenge', 'Grants +25 thorns, 15% less damage taken, and 50% increased threat generation for 5 seconds.', undefined, { tags: { add: ['buff'] } }), 'personal_challenge', { duration: 5, mods: [mod('thorns', 'flat', 25), mod('damageTaken', 'more', -0.15), mod('threatGen', 'increased', 0.5)] }),
    [buff(n('iron_challenge', 'Iron Challenge', 'While active, gain 50% increased armor.'), 'personal_challenge', { mods: [mod('armor', 'increased', 0.5)] }),
      buff(n('barbed_challenge', 'Answer the Challenge', 'While active, add 50% of your thorns as physical damage on hit.'), 'personal_challenge', { mods: [mod('thornsToHit', 'flat', 0.5)] }),
      buff(n('mending_challenge', 'Survive the Challenge', 'While active, regenerate 1% of maximum life per second.'), 'personal_challenge', { mods: [mod('lifeRegenPct', 'flat', 0.01)] })],
    [n('lasting_challenge', 'Hold Their Eye', '40% increased mark and buff duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_challenge', 'Challenge Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_challenge', 'Measured Words', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], recovery('verdict')),

  challenging_shout: tree([
    buff(n('rallying_challenge', 'Rallying Challenge', 'Also grants you and allies within 200 radius +20% ailment resistance and 15% increased movement speed for 4 seconds.', undefined, { tags: { add: ['buff'] } }), 'rallying_challenge', { duration: 4, affects: 'allies', radius: 200, mods: [mod('ailmentResist', 'flat', 0.2), mod('moveSpeed', 'increased', 0.15)] }),
    [n('wide_rally', 'Carry the Call', '35% increased taunt and buff radius.', [mod('aoeRadius', 'increased', 0.35)]),
      buff(n('iron_rally', 'Stand Together', 'Also grants 40% increased armor.'), 'rallying_challenge', { mods: [mod('armor', 'increased', 0.4)] }),
      buff(n('mending_rally', 'Breathe Together', 'Also grants 1% of maximum life regenerated per second.'), 'rallying_challenge', { mods: [mod('lifeRegenPct', 'flat', 0.01)] })],
    [n('lasting_rally', 'Lasting Courage', '40% increased taunt and buff duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_rally', 'Call Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_rally', 'Save Your Breath', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    buff(n('defiant_challenge', 'Defiant Challenge', 'Grants 50% increased guard strength and +30 thorns for 4 seconds.', undefined, { tags: { add: ['buff'] } }), 'defiant_challenge', { duration: 4, mods: [mod('guardStrength', 'increased', 0.5), mod('thorns', 'flat', 30)] }),
    [buff(n('iron_defiance', 'Iron Defiance', 'While active, gain 50% increased armor.'), 'defiant_challenge', { mods: [mod('armor', 'increased', 0.5)] }),
      buff(n('reflected_defiance', 'Reflected Defiance', 'While active, reflect 15% of incoming hit damage.'), 'defiant_challenge', { mods: [mod('thornsReflect', 'flat', 0.15)] }),
      buff(n('steady_defiance', 'Steady Defiance', 'While active, gain +20% ailment resistance.'), 'defiant_challenge', { mods: [mod('ailmentResist', 'flat', 0.2)] })],
    [n('lasting_defiance', 'Lasting Defiance', '40% increased taunt and buff duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_defiance', 'Defy Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_defiance', 'Quiet Certainty', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], recovery('shout')),

  stone_rampart: tree([
    n('holding_masonry', 'Holding Masonry', 'Wall segments taunt nearby enemies and have 50% more life, but the skill costs 25% more mana.', [mod('constructTaunt', 'flat', 1), mod('minionLife', 'more', 0.5), mod('manaCost', 'more', 0.25)]),
    [n('deep_masonry', 'Deep Foundations', '40% increased wall duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('second_masonry', 'Another Course', '+3 maximum active wall segments.', [mod('constructMaxCount', 'flat', 3)]),
      n('stout_masonry', 'Thick Stone', '50% increased segment life.', [mod('minionLife', 'increased', 0.5)])],
    [n('ready_masonry', 'Raise Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_masonry', 'Economical Stone', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('swift_masonry', 'Quick Foundations', '30% increased cast speed.', [mod('castSpeed', 'increased', 0.3)])],
  ], [
    graft(n('answering_masonry', 'Answering Masonry', 'Wall segments burst when destroyed or expired, dealing physical damage based on their life.'), 'answering_wall'),
    [n('heavy_masonry', 'Heavy Rubble', '40% increased burst damage.', [mod('bashPower', 'increased', 0.4)]),
      n('stunning_masonry', 'Ringing Rubble', 'Burst hits gain +30% chance to stun.', [mod('apply_stun', 'flat', 0.3)]),
      n('breaking_masonry', 'Breaking Rubble', 'Burst hits deal 50% more poise damage.', [mod('poiseDamage', 'more', 0.5)])],
    [n('ready_rubble', 'Fresh Masonry', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('stout_rubble', 'Weight of Stone', '50% increased segment life.', [mod('minionLife', 'increased', 0.5)]),
      n('swift_rubble', 'Quick Wall', '30% increased cast speed.', [mod('castSpeed', 'increased', 0.3)])],
  ], n('masonry_practice', 'Practiced Masonry', '15% increased segment life.', [mod('minionLife', 'increased', 0.15)])),

  toppling_stroke: tree([
    n('demolition_stroke', 'Demolition Stroke', 'Hits always sunder enemies and deal 60% more poise damage, but have 20% less attack speed.', [mod('apply_sundered', 'flat', 0.7), mod('poiseDamage', 'more', 0.6), mod('attackSpeed', 'more', -0.2)]),
    [n('open_demolition', 'Find the Fault', 'Ignores 25% of enemy armor.', [mod('armorPen', 'flat', 0.25)]),
      n('lasting_demolition', 'Lasting Fault', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('stunning_demolition', 'Collapse the Frame', '+35% chance to stun.', [mod('apply_stun', 'flat', 0.35)])],
    [n('certain_demolition', 'Measured Demolition', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('hungry_demolition', 'Paid in Rubble', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)]),
      n('ready_demolition', 'Swing Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    n('clearing_stroke', 'Clearing Stroke', 'Strikes in a 240-degree arc, but deals 20% less damage.', [mod('damage', 'more', -0.2)], { arcDeg: 240 }),
    [n('long_clearance', 'Wide Clearance', '35% increased melee reach.', [mod('meleeReach', 'increased', 0.35)]),
      n('paid_clearance', 'Crowded Clearance', 'Gain 4 life on hit.', [mod('lifeOnHit', 'flat', 4)]),
      n('shoving_clearance', 'Make Room', '+60 knockback strength.', [mod('knockback', 'flat', 60)])],
    [n('swift_clearance', 'Swift Clearance', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('cheap_clearance', 'Easy Sweep', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('breaking_clearance', 'Unsteady Footing', 'Deals 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)])],
  ], damage('toppling')),

  shield_charge: tree([
    graft(n('answering_charge', 'Answering Charge', 'Unleashes a guard-scaled physical shield bash upon arrival.'), 'answering_wall'),
    [n('heavy_charge', 'Heavy Arrival', '40% increased shield bash damage.', [mod('bashPower', 'increased', 0.4)]),
      n('stout_charge', 'Weight Behind the Shield', '40% increased guard strength.', [mod('guardStrength', 'increased', 0.4)]),
      n('breaking_charge', 'Break the Landing', 'Deals 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)])],
    [n('ready_charge', 'Charge Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('hungry_charge', 'Paid on Arrival', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)]),
      n('cheap_charge', 'Easy Advance', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    buff(n('sheltering_charge', 'Sheltering Charge', 'Grants 20% less damage taken and 40% increased armor for 3 seconds when charging.', undefined, { tags: { add: ['buff', 'duration'] } }), 'sheltering_charge', { duration: 3, mods: [mod('damageTaken', 'more', -0.2), mod('armor', 'increased', 0.4)] }),
    [n('lasting_shelter', 'Lasting Shelter', '40% increased buff duration.', [mod('effectDuration', 'increased', 0.4)]),
      buff(n('mending_shelter', 'Mending Shelter', 'While active, regenerate 1% of maximum life per second.'), 'sheltering_charge', { mods: [mod('lifeRegenPct', 'flat', 0.01)] }),
      buff(n('barbed_shelter', 'Barbed Shelter', 'While active, gain +20 thorns.'), 'sheltering_charge', { mods: [mod('thorns', 'flat', 20)] })],
    [n('ready_shelter', 'Return to Shelter', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('stunning_shelter', 'Stunning Passage', '+30% chance to stun.', [mod('apply_stun', 'flat', 0.3)]),
      n('paid_shelter', 'Mend the Passage', 'Gain 3 life on hit.', [mod('lifeOnHit', 'flat', 3)])],
  ], damage('shieldcharge')),
};
