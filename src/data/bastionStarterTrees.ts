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
    n('living_hedge', 'Living Hedge', 'While guarding, gain 24 additional thorns and reflect another 15% of each landed wound. 20% less guard strength.', [mod('thorns', 'flat', 24, undefined, 'guarding'), mod('thornsReflect', 'flat', 0.15, undefined, 'guarding'), mod('guardStrength', 'more', -0.2)]),
    [n('deep_hedge', 'Deep Hedge', 'While guarding, gain 20 additional thorns.', [mod('thorns', 'flat', 20, undefined, 'guarding')]),
      n('mending_hedge', 'Mending Hedge', 'While guarding, restore 6 base life per second to other allies within 160 units.', [mod('guardMend', 'flat', 6)]),
      n('stout_hedge', 'Stout Hedge', '40% increased guard strength.', [mod('guardStrength', 'increased', 0.4)])],
    [n('ready_hedge', 'Ready Hedge', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_hedge', 'Light Brace', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('warded_hedge', 'Ward the Brace', 'Each mana actually paid grants 2 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins.', [mod('costWard_mana', 'flat', 2)])],
  ], [
    graft(n('answering_spikes', 'Answering Spikes', 'Graft Answering Wall: the guard gains a release bash based on remaining shield, with increased bash power and an easier arming line.'), 'answering_wall'),
    [n('heavy_spikes', 'Heavy Answer', '40% increased bash power.', [mod('bashPower', 'increased', 0.4)]),
      n('hungry_spikes', 'Hungry Answer', 'Leech 8% of bash hit damage as life.', [mod('lifeLeech', 'flat', 0.08)]),
      n('ringing_spikes', 'Ringing Answer', 'Deal 40% more poise damage with the bash.', [mod('poiseDamage', 'more', 0.4)])],
    [n('stout_spikes', 'Steel Behind Spikes', '40% increased guard strength.', [mod('guardStrength', 'increased', 0.4)]),
      n('easy_spikes', 'Early Answer', 'Reduce the remaining-shield requirement for a release bash by another 25%.', [mod('bashFloor', 'more', -0.25)]),
      n('ready_spikes', 'Brace Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], n('bulwark_practice', 'Practiced Brace', '15% increased guard strength.', [mod('guardStrength', 'increased', 0.15)])),

  bristleback: tree([
    aura(n('sheltering_quills', 'Sheltering Quills', 'Allies inside also take 12% less damage. The aura has 20% less radius.', [mod('aoeRadius', 'more', -0.2)]), { allyMods: [mod('damageTaken', 'more', -0.12)] }),
    [aura(n('iron_quills', 'Iron Quills', 'Allies inside also gain 40% increased armor.'), { allyMods: [mod('armor', 'increased', 0.4)] }),
      aura(n('mending_quills', 'Mending Quills', 'Allies inside also regenerate 1% of maximum life per second.'), { allyMods: [mod('lifeRegenPct', 'flat', 0.01)] }),
      aura(n('steady_quills', 'Steady Quills', 'Allies inside also gain 20% ailment resistance.'), { allyMods: [mod('ailmentResist', 'flat', 0.2)] })],
    [n('wide_quills', 'Room Beneath Quills', '35% increased aura radius.', [mod('aoeRadius', 'increased', 0.35)]),
      aura(n('sharp_quills', 'Deep Quills', 'Allies inside also gain 12 thorns.'), { allyMods: [mod('thorns', 'flat', 12)] }),
      aura(n('reflecting_quills', 'Mirrored Quills', 'Allies inside also reflect 10% of each landed wound.'), { allyMods: [mod('thornsReflect', 'flat', 0.1)] })],
  ], [
    aura(n('hunting_quills', 'Hunting Quills', 'Allies inside add 60% of their flat thorns to their hits as physical damage, but take 10% more damage.'), { allyMods: [mod('thornsToHit', 'flat', 0.6), mod('damageTaken', 'more', 0.1)] }),
    [aura(n('barbed_hunt', 'Barbed Hunt', 'Allies inside also gain 15 thorns.'), { allyMods: [mod('thorns', 'flat', 15)] }),
      aura(n('hungry_hunt', 'Hungry Hunt', 'Allies inside also leech 4% of attack hit damage as life.'), { allyMods: [mod('lifeLeech', 'flat', 0.04, ['attack'])] }),
      aura(n('certain_hunt', 'Certain Hunt', 'Allies inside also gain 35% increased attack accuracy.'), { allyMods: [mod('accuracy', 'increased', 0.35, ['attack'])] })],
    [n('wide_hunt', 'Wide Hunt', '35% increased aura radius.', [mod('aoeRadius', 'increased', 0.35)]),
      aura(n('swift_hunt', 'Swift Hunt', 'Allies inside also gain 10% increased attack speed.'), { allyMods: [mod('attackSpeed', 'increased', 0.1)] }),
      aura(n('snagging_hunt', 'Snagging Hunt', 'Enemies inside move 20% slower.'), { enemyMods: [mod('moveSpeed', 'increased', -0.2)] })],
  ], n('quill_practice', 'Practiced Reach', '10% increased aura radius.', [mod('aoeRadius', 'increased', 0.1)])),

  reprisal: tree([
    n('quilled_answer', 'Quilled Answer', 'Add 100% of your flat thorns to this hit as physical damage. Attack 15% slower; the recent-wound requirement remains.', [mod('thornsToHit', 'flat', 1), mod('attackSpeed', 'more', -0.15)]),
    [n('deep_answer', 'Drive the Quills', 'Landed hits always bleed.', [mod('apply_bleed', 'flat', 1)]),
      n('barbed_answer', 'Barbed Answer', '40% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['physical'])]),
      n('feeding_answer', 'Feed the Answer', 'Recover 6% of this skill\'s bleed damage as life.', [mod('dotLeech_bleed', 'flat', 0.06)])],
    [n('ready_answer', 'Answer Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('hungry_answer', 'Claim Restitution', 'Leech 10% of hit damage as life.', [mod('lifeLeech', 'flat', 0.1)]),
      n('certain_answer', 'Certain Answer', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)])],
  ], [
    n('sweeping_rebuke', 'Sweeping Rebuke', 'Answer across a 240-degree arc with 20% less damage. The recent-wound requirement remains.', [mod('damage', 'more', -0.2)], { arcDeg: 240 }),
    [n('long_rebuke', 'Long Rebuke', '30% increased melee reach.', [mod('meleeReach', 'increased', 0.3)]),
      n('stunning_rebuke', 'Stunning Rebuke', 'Gain 40% additional stun chance.', [mod('apply_stun', 'flat', 0.4)]),
      n('heavy_rebuke', 'Weight of Rebuke', 'Deal 50% more poise damage.', [mod('poiseDamage', 'more', 0.5)])],
    [n('swift_rebuke', 'Swift Rebuke', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('paid_rebuke', 'Crowded Restitution', 'Restore 4 life per landed hit.', [mod('lifeOnHit', 'flat', 4)]),
      n('cheap_rebuke', 'Easy Rebuke', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], damage('reprisal')),

  battle_standard: tree([
    aura(n('sheltering_colors', 'Sheltering Colors', 'Allies beneath the banner also take 12% less damage. Keep the native rally bonuses.'), { allyMods: [mod('damageTaken', 'more', -0.12)] }),
    [n('stout_colors', 'Stout Colors', '50% increased banner life.', [mod('minionLife', 'increased', 0.5)]),
      aura(n('mending_colors', 'Mending Colors', 'Allies beneath the banner also regenerate 1% of maximum life per second.'), { allyMods: [mod('lifeRegenPct', 'flat', 0.01)] }),
      aura(n('iron_colors', 'Iron Colors', 'Allies beneath the banner also gain 40% increased armor.'), { allyMods: [mod('armor', 'increased', 0.4)] })],
    [n('wide_colors', 'Wide Colors', '35% increased banner aura radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('lasting_colors', 'Lasting Colors', '40% increased banner lifetime.', [mod('effectDuration', 'increased', 0.4)]),
      n('cheap_colors', 'Light Standard', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    aura(n('conquering_colors', 'Conquering Colors', 'Allies beneath the banner also gain 15% increased attack and cast speed. The banner lasts 30% less time.', [mod('effectDuration', 'more', -0.3)]), { allyMods: [mod('attackSpeed', 'increased', 0.15), mod('castSpeed', 'increased', 0.15)] }),
    [aura(n('certain_colors', 'Certain Colors', 'Allies beneath the banner also gain 40% increased accuracy.'), { allyMods: [mod('accuracy', 'increased', 0.4)] }),
      aura(n('cruel_colors', 'Cruel Colors', 'Allies beneath the banner also gain 6% attack critical chance.'), { allyMods: [mod('critChance', 'flat', 0.06, ['attack'])] }),
      aura(n('hungry_colors', 'Hungry Colors', 'Allies beneath the banner also leech 4% of hit damage as life.'), { allyMods: [mod('lifeLeech', 'flat', 0.04)] })],
    [n('ready_colors', 'Plant Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('second_colors', 'Another Front', 'Keep one additional banner active. Each banner remains a separate aura source.', [mod('constructMaxCount', 'flat', 1)]),
      aura(n('pressing_colors', 'Press the Front', 'Enemies beneath the banner move 20% slower.'), { enemyMods: [mod('moveSpeed', 'increased', -0.2)] })],
  ], recovery('standard')),

  single_out: tree([
    buff(n('warband_verdict', 'Warband Verdict', 'After marking the target, prepare yourself and allies within 160 base radius for 4 base seconds: their next landed attack deals 25% more damage.', undefined, { tags: { add: ['buff', 'aoe'] } }), 'warband_verdict', { duration: 4, affects: 'allies', radius: 160, consumeOn: { on: 'hit', tags: ['attack'] }, mods: [mod('damage', 'more', 0.25, ['attack'])] }),
    [n('wide_verdict', 'Heard by All', '35% increased blessing radius.', [mod('aoeRadius', 'increased', 0.35)]),
      buff(n('certain_verdict', 'Certain Verdict', 'The preparation also grants 40% increased attack accuracy.'), 'warband_verdict', { mods: [mod('accuracy', 'increased', 0.4, ['attack'])] }),
      buff(n('hungry_verdict', 'Collect the Verdict', 'The preparation also leeches 6% of attack hit damage as life.'), 'warband_verdict', { mods: [mod('lifeLeech', 'flat', 0.06, ['attack'])] })],
    [n('lasting_verdict', 'Remember the Name', '40% increased mark and preparation duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_verdict', 'Name Another', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_verdict', 'Easy Command', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    buff(n('personal_challenge', 'Personal Challenge', 'After marking the target, gain 25 thorns and take 15% less damage for 5 base seconds. Your blows generate 50% increased threat during this stance.', undefined, { tags: { add: ['buff'] } }), 'personal_challenge', { duration: 5, mods: [mod('thorns', 'flat', 25), mod('damageTaken', 'more', -0.15), mod('threatGen', 'increased', 0.5)] }),
    [buff(n('iron_challenge', 'Iron Challenge', 'The stance also grants 50% increased armor.'), 'personal_challenge', { mods: [mod('armor', 'increased', 0.5)] }),
      buff(n('barbed_challenge', 'Answer the Challenge', 'The stance also adds 50% of your flat thorns to hits as physical damage.'), 'personal_challenge', { mods: [mod('thornsToHit', 'flat', 0.5)] }),
      buff(n('mending_challenge', 'Survive the Challenge', 'The stance also regenerates 1% of maximum life per second.'), 'personal_challenge', { mods: [mod('lifeRegenPct', 'flat', 0.01)] })],
    [n('lasting_challenge', 'Hold Their Eye', '40% increased mark and stance duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_challenge', 'Challenge Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_challenge', 'Measured Words', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], recovery('verdict')),

  challenging_shout: tree([
    buff(n('rallying_challenge', 'Rallying Challenge', 'The taunting shout also grants yourself and allies within 200 base radius 20% ailment resistance and 15% increased movement speed for 4 base seconds.', undefined, { tags: { add: ['buff'] } }), 'rallying_challenge', { duration: 4, affects: 'allies', radius: 200, mods: [mod('ailmentResist', 'flat', 0.2), mod('moveSpeed', 'increased', 0.15)] }),
    [n('wide_rally', 'Carry the Call', '35% increased taunt and blessing radius.', [mod('aoeRadius', 'increased', 0.35)]),
      buff(n('iron_rally', 'Stand Together', 'The blessing also grants 40% increased armor.'), 'rallying_challenge', { mods: [mod('armor', 'increased', 0.4)] }),
      buff(n('mending_rally', 'Breathe Together', 'The blessing also regenerates 1% of maximum life per second.'), 'rallying_challenge', { mods: [mod('lifeRegenPct', 'flat', 0.01)] })],
    [n('lasting_rally', 'Lasting Courage', '40% increased taunt and blessing duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_rally', 'Call Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_rally', 'Save Your Breath', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    buff(n('defiant_challenge', 'Defiant Challenge', 'The taunting shout also braces you for 4 base seconds: 50% increased guard strength and 30 thorns.', undefined, { tags: { add: ['buff'] } }), 'defiant_challenge', { duration: 4, mods: [mod('guardStrength', 'increased', 0.5), mod('thorns', 'flat', 30)] }),
    [buff(n('iron_defiance', 'Iron Defiance', 'The brace also grants 50% increased armor.'), 'defiant_challenge', { mods: [mod('armor', 'increased', 0.5)] }),
      buff(n('reflected_defiance', 'Reflected Defiance', 'The brace also reflects 15% of each landed wound.'), 'defiant_challenge', { mods: [mod('thornsReflect', 'flat', 0.15)] }),
      buff(n('steady_defiance', 'Steady Defiance', 'The brace also grants 20% ailment resistance.'), 'defiant_challenge', { mods: [mod('ailmentResist', 'flat', 0.2)] })],
    [n('lasting_defiance', 'Lasting Defiance', '40% increased taunt and brace duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_defiance', 'Defy Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_defiance', 'Quiet Certainty', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], recovery('shout')),

  stone_rampart: tree([
    n('holding_masonry', 'Holding Masonry', 'Each segment draws enemy attention and has 50% more life, but the wall costs 25% more mana.', [mod('constructTaunt', 'flat', 1), mod('minionLife', 'more', 0.5), mod('manaCost', 'more', 0.25)]),
    [n('deep_masonry', 'Deep Foundations', '40% increased wall lifetime.', [mod('effectDuration', 'increased', 0.4)]),
      n('second_masonry', 'Another Course', 'Keep three additional wall segments active.', [mod('constructMaxCount', 'flat', 3)]),
      n('stout_masonry', 'Thick Stone', '50% increased segment life.', [mod('minionLife', 'increased', 0.5)])],
    [n('ready_masonry', 'Raise Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_masonry', 'Economical Stone', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('swift_masonry', 'Quick Foundations', '30% increased cast speed.', [mod('castSpeed', 'increased', 0.3)])],
  ], [
    graft(n('answering_masonry', 'Answering Masonry', 'Graft Answering Wall: destroyed or expired segments release a physical bash based on their life. Resetting the tree retires them quietly.'), 'answering_wall'),
    [n('heavy_masonry', 'Heavy Rubble', '40% increased bash power.', [mod('bashPower', 'increased', 0.4)]),
      n('stunning_masonry', 'Ringing Rubble', 'Gain 30% additional stun chance on the release hit.', [mod('apply_stun', 'flat', 0.3)]),
      n('breaking_masonry', 'Breaking Rubble', 'Release hits deal 50% more poise damage.', [mod('poiseDamage', 'more', 0.5)])],
    [n('ready_rubble', 'Fresh Masonry', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('stout_rubble', 'Weight of Stone', '50% increased segment life.', [mod('minionLife', 'increased', 0.5)]),
      n('swift_rubble', 'Quick Wall', '30% increased cast speed.', [mod('castSpeed', 'increased', 0.3)])],
  ], n('masonry_practice', 'Practiced Masonry', '15% increased segment life.', [mod('minionLife', 'increased', 0.15)])),

  toppling_stroke: tree([
    n('demolition_stroke', 'Demolition Stroke', 'Always sunder landed victims and deal 60% more poise damage. Attack 20% slower.', [mod('apply_sundered', 'flat', 0.7), mod('poiseDamage', 'more', 0.6), mod('attackSpeed', 'more', -0.2)]),
    [n('open_demolition', 'Find the Fault', 'Ignore 25% of enemy armor.', [mod('armorPen', 'flat', 0.25)]),
      n('lasting_demolition', 'Lasting Fault', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('stunning_demolition', 'Collapse the Frame', 'Gain 35% chance to stun.', [mod('apply_stun', 'flat', 0.35)])],
    [n('certain_demolition', 'Measured Demolition', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('hungry_demolition', 'Paid in Rubble', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)]),
      n('ready_demolition', 'Swing Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    n('clearing_stroke', 'Clearing Stroke', 'Sweep a 240-degree arc with 20% less damage.', [mod('damage', 'more', -0.2)], { arcDeg: 240 }),
    [n('long_clearance', 'Wide Clearance', '35% increased melee reach.', [mod('meleeReach', 'increased', 0.35)]),
      n('paid_clearance', 'Crowded Clearance', 'Restore 4 life per landed hit.', [mod('lifeOnHit', 'flat', 4)]),
      n('shoving_clearance', 'Make Room', 'Add 60 knockback strength to landed hits.', [mod('knockback', 'flat', 60)])],
    [n('swift_clearance', 'Swift Clearance', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('cheap_clearance', 'Easy Sweep', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('breaking_clearance', 'Unsteady Footing', 'Deal 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)])],
  ], damage('toppling')),

  shield_charge: tree([
    graft(n('answering_charge', 'Answering Charge', 'Graft Answering Wall: add a guard-scaled physical bash when the charge arrives. The native corridor hit and shove remain.'), 'answering_wall'),
    [n('heavy_charge', 'Heavy Arrival', '40% increased bash power.', [mod('bashPower', 'increased', 0.4)]),
      n('stout_charge', 'Weight Behind the Shield', '40% increased guard strength.', [mod('guardStrength', 'increased', 0.4)]),
      n('breaking_charge', 'Break the Landing', 'Deal 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)])],
    [n('ready_charge', 'Charge Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('hungry_charge', 'Paid on Arrival', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)]),
      n('cheap_charge', 'Easy Advance', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    buff(n('sheltering_charge', 'Sheltering Charge', 'At charge start, gain 20% less damage taken and 40% increased armor for 3 base seconds. The native corridor hit and shove remain.', undefined, { tags: { add: ['buff', 'duration'] } }), 'sheltering_charge', { duration: 3, mods: [mod('damageTaken', 'more', -0.2), mod('armor', 'increased', 0.4)] }),
    [n('lasting_shelter', 'Lasting Shelter', '40% increased blessing duration.', [mod('effectDuration', 'increased', 0.4)]),
      buff(n('mending_shelter', 'Mending Shelter', 'The blessing also regenerates 1% of maximum life per second.'), 'sheltering_charge', { mods: [mod('lifeRegenPct', 'flat', 0.01)] }),
      buff(n('barbed_shelter', 'Barbed Shelter', 'The blessing also grants 20 thorns.'), 'sheltering_charge', { mods: [mod('thorns', 'flat', 20)] })],
    [n('ready_shelter', 'Return to Shelter', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('stunning_shelter', 'Stunning Passage', 'Gain 30% additional stun chance.', [mod('apply_stun', 'flat', 0.3)]),
      n('paid_shelter', 'Mend the Passage', 'Restore 3 life per landed hit.', [mod('lifeOnHit', 'flat', 3)])],
  ], damage('shieldcharge')),
};
