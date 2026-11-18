import type { SkillTreeSpec, TreeBuffPatch } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });
const damage = (id: string) => n(id + '_practice', 'Practiced Blade', '15% increased damage.', [mod('damage', 'increased', 0.15)]);
const recovery = (id: string) => n(id + '_practice', 'Practiced Timing', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)]);

export const DUELIST_STARTER_TREES: Record<string, SkillTreeSpec> = {
  buckler_strike: tree([
    n('barbed_figure', 'Barbed Figure', 'Both strikes always inflict bleed and impale for 25% of physical hit damage, but deal 15% less hit damage.', [mod('apply_bleed', 'flat', 1), mod('impalePower', 'flat', 0.25), mod('damage', 'more', -0.15)]),
    [n('deep_figure', 'Deep Cuts', '40% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['physical'])]),
      n('lasting_figure', 'Lasting Cuts', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('feeding_figure', 'Feeding Cuts', 'Recover life equal to 5% of bleed damage dealt by this skill.', [mod('dotLeech_bleed', 'flat', 0.05)])],
    [n('certain_figure', 'Certain Cuts', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('lodged_figure', 'Lodged Edges', 'Impales for an additional 20% of physical hit damage.', [mod('impalePower', 'flat', 0.2)]),
      n('cheap_figure', 'Light Grip', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)])],
  ], [
    n('encircling_figure', 'Encircling Figure', 'Each strike sweeps a 160-degree arc, but deals 20% less damage.', [mod('damage', 'more', -0.2)], { arcDeg: 160 }),
    [n('long_figure', 'Long Figure', '30% increased melee reach.', [mod('meleeReach', 'increased', 0.3)]),
      n('paid_figure', 'Crowded Recovery', 'Gain 3 life on hit.', [mod('lifeOnHit', 'flat', 3)]),
      n('stunning_figure', 'Ringing Buckler', '+25% chance to stun.', [mod('apply_stun', 'flat', 0.25)])],
    [n('swift_figure', 'Quick Figure', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('open_figure', 'Open Flanks', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)]),
      n('breaking_figure', 'Broken Rhythm', 'Deals 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)])],
  ], damage('buckler')),

  wild_strike: tree([
    n('ws_sprinkler', 'The Sprinkler', 'Strikes sweep in a 30-degree arc across a 130-degree cone.', undefined, { arcDeg: 30, spreadDeg: 130 }),
    [n('ws_cloudburst', 'The Cloudburst', '12% increased attack speed.', [mod('attackSpeed', 'increased', 0.12)]),
      n('ws_monsoon', 'The Monsoon', 'Gain 8% increased movement speed per second while channeling, up to +50%.', undefined, { channel: { rampMove: { per: 0.08, max: 0.5 } } }),
      n('ws_rain_recovery', 'Shelter in Rain', 'Gain 2 life on hit.', [mod('lifeOnHit', 'flat', 2)])],
    [n('ws_long_rain', 'Long Rain', '30% increased melee reach.', [mod('meleeReach', 'increased', 0.3)]),
      n('ws_red_rain', 'Red Rain', '+40% chance to inflict bleed.', [mod('apply_bleed', 'flat', 0.4)]),
      n('ws_lodged_rain', 'Steel Rain', 'Impales enemies for 25% of physical hit damage.', [mod('impalePower', 'flat', 0.25)])],
  ], [
    n('ws_duelist', 'The Duelist', 'Narrows strikes to a 16-degree arc within a tight 24-degree cone.', undefined, { arcDeg: 16, spreadDeg: 24 }),
    [n('ws_firm_wrist', 'The Firm Wrist', '18% increased damage and +7% critical chance.', [mod('damage', 'increased', 0.18), mod('critChance', 'flat', 0.07)]),
      n('ws_long_point', 'The Long Point', 'Gain 6% more damage per second while channeling, up to +45%.', undefined, { channel: { ramp: { per: 0.06, max: 0.45 } } }),
      n('ws_open_point', 'Open Point', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)])],
    [n('ws_certain_point', 'Certain Point', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('ws_hungry_point', 'Hungry Point', 'Leech 6% of hit damage as life.', [mod('lifeLeech', 'flat', 0.06)]),
      n('ws_deep_point', 'Deep Point', '40% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['physical'])])],
  ], n('ws_economy', 'Economy of Motion', '+5% movement speed while channeling and 8% increased damage.', [mod('channelMobility', 'flat', 0.05), mod('damage', 'increased', 0.08)])),

  dash_strike: tree([
    n('threading_blade', 'Threading Blade', 'Hits always inflict bleed and impale for 35% of physical hit damage, but deal 15% less hit damage.', [mod('apply_bleed', 'flat', 1), mod('impalePower', 'flat', 0.35), mod('damage', 'more', -0.15)]),
    [n('deep_thread', 'Deep Thread', '40% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['physical'])]),
      n('lasting_thread', 'Lasting Thread', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('feeding_thread', 'Feeding Thread', 'Recover life equal to 5% of bleed damage dealt by this skill.', [mod('dotLeech_bleed', 'flat', 0.05)])],
    [n('ready_thread', 'Thread Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('certain_thread', 'Certain Thread', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('cheap_thread', 'Light Thread', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    buff(n('duelists_pass', 'Duelist\'s Pass', 'Grants 20% less damage taken for 3 seconds when dashing, but deals 20% less hit damage.', [mod('damage', 'more', -0.2)], { tags: { add: ['buff', 'duration'] } }), 'duelists_pass', { duration: 3, mods: [mod('damageTaken', 'more', -0.2)] }),
    [buff(n('flowing_pass', 'Flowing Pass', 'While active, gain 25% increased movement speed.'), 'duelists_pass', { mods: [mod('moveSpeed', 'increased', 0.25)] }),
      n('lasting_pass', 'Lasting Pass', '40% increased buff duration.', [mod('effectDuration', 'increased', 0.4)]),
      buff(n('mending_pass', 'Mending Pass', 'While active, regenerate 1% of maximum life per second.'), 'duelists_pass', { mods: [mod('lifeRegenPct', 'flat', 0.01)] })],
    [n('ready_pass', 'Another Pass', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('paid_pass', 'Contact Recovery', 'Gain 4 life on hit.', [mod('lifeOnHit', 'flat', 4)]),
      n('stunning_pass', 'Passing Jolt', '+30% chance to stun.', [mod('apply_stun', 'flat', 0.3)])],
  ], recovery('dash')),

  planted_banderilla: tree([
    n('public_challenge', 'Public Challenge', 'Throws 3 parallel barbs, but deals 30% less damage per barb.', [mod('projectileCount', 'flat', 2), mod('fireVolley', 'flat', 1), mod('damage', 'more', -0.3)]),
    [n('piercing_challenge', 'Piercing Challenge', 'Pierces 2 additional enemies.', [mod('pierceCount', 'flat', 2)]),
      n('wide_challenge', 'Wide Challenge', '40% increased projectile spacing.', [mod('volleySpacing', 'increased', 0.4)]),
      n('swift_challenge', 'Swift Challenge', '35% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.35)])],
    [n('lasting_challenge', 'Lasting Insult', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('open_challenge', 'Public Weakness', '+40% chance to inflict vulnerability.', [mod('apply_vulnerable', 'flat', 0.4)]),
      n('ready_challenge', 'Another Insult', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    n('blood_challenge', 'Blood Challenge', 'Hits always inflict bleed and impale for 40% of physical hit damage, but cost 20% more mana.', [mod('apply_bleed', 'flat', 1), mod('impalePower', 'flat', 0.4), mod('manaCost', 'more', 0.2)]),
    [n('deep_challenge', 'Deep Insult', '40% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['physical'])]),
      n('feeding_challenge', 'Feeding Insult', 'Recover life equal to 5% of bleed damage dealt by this skill.', [mod('dotLeech_bleed', 'flat', 0.05)]),
      n('lodged_challenge', 'Buried Barb', 'Impales for an additional 25% of physical hit damage.', [mod('impalePower', 'flat', 0.25)])],
    [n('certain_challenge', 'Certain Challenge', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('cruel_challenge', 'Cruel Challenge', '+10% critical chance.', [mod('critChance', 'flat', 0.1)]),
      n('cheap_challenge', 'Practiced Insult', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], recovery('banderilla')),

  cape_feint: tree([
    buff(n('scarlet_answer', 'Scarlet Answer', 'Empowers your next melee hit within 3 seconds to deal 40% more damage.', undefined, { tags: { add: ['buff', 'duration'] } }), 'scarlet_answer', { duration: 3, consumeOn: { on: 'hit', tags: ['melee'] }, mods: [mod('damage', 'more', 0.4, ['melee'])] }),
    [buff(n('certain_answer', 'Certain Answer', 'Empowered melee hits gain 60% increased accuracy.'), 'scarlet_answer', { mods: [mod('accuracy', 'increased', 0.6, ['melee'])] }),
      buff(n('open_answer', 'Open Answer', 'Empowered melee hits ignore 25% of enemy armor.'), 'scarlet_answer', { mods: [mod('armorPen', 'flat', 0.25, ['melee'])] }),
      buff(n('cruel_answer', 'Cruel Answer', 'Empowered melee hits gain +10% critical chance.'), 'scarlet_answer', { mods: [mod('critChance', 'flat', 0.1, ['melee'])] })],
    [n('lasting_answer', 'Await the Opening', '40% increased buff and afterimage duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_answer', 'Another Opening', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_answer', 'Light Cape', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    buff(n('sheltering_cape', 'Sheltering Cape', 'Grants 25% less damage taken for 2 seconds when cast.', undefined, { tags: { add: ['buff', 'duration'] } }), 'sheltering_cape', { duration: 2, mods: [mod('damageTaken', 'more', -0.25)] }),
    [buff(n('flowing_cape', 'Flowing Cape', 'While active, gain 30% increased movement speed.'), 'sheltering_cape', { mods: [mod('moveSpeed', 'increased', 0.3)] }),
      buff(n('mending_cape', 'Mending Cape', 'While active, regenerate 1.5% of maximum life per second.'), 'sheltering_cape', { mods: [mod('lifeRegenPct', 'flat', 0.015)] }),
      n('lasting_cape', 'Lingering Cape', '50% increased buff and afterimage duration.', [mod('effectDuration', 'increased', 0.5)])],
    [n('ready_cape', 'Keep Dancing', '50% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.5)]),
      n('cheap_cape', 'Frugal Flourish', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      buff(n('elusive_cape', 'Elusive Cape', 'While active, gain 60% increased evasion.'), 'sheltering_cape', { mods: [mod('evasion', 'increased', 0.6)] })],
  ], recovery('cape')),

  perfect_strike: tree([
    n('final_act', 'Final Act', 'Deals 40% more damage against taunted enemies and culls enemies below 10% life, but has 15% less attack speed.', [mod('damage', 'more', 0.4, ['vs:taunted']), mod('cullThreshold', 'flat', 0.1), mod('attackSpeed', 'more', -0.15)]),
    [n('certain_act', 'Certain Act', '60% increased accuracy.', [mod('accuracy', 'increased', 0.6)]),
      n('open_act', 'Open Act', 'Ignores 25% of enemy armor.', [mod('armorPen', 'flat', 0.25)]),
      n('cruel_act', 'Cruel Act', '+12% critical chance.', [mod('critChance', 'flat', 0.12)])],
    [n('heavy_act', 'Heavy Act', 'Deals 50% more poise damage.', [mod('poiseDamage', 'more', 0.5)]),
      n('hungry_act', 'Hungry Act', 'Leech 10% of hit damage as life.', [mod('lifeLeech', 'flat', 0.1)]),
      n('cheap_act', 'Measured Effort', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    n('sweeping_finale', 'Sweeping Finale', 'Strikes in a 150-degree arc, but deals 25% less damage.', [mod('damage', 'more', -0.25)], { arcDeg: 150 }),
    [n('long_finale', 'Long Finale', '40% increased melee reach.', [mod('meleeReach', 'increased', 0.4)]),
      n('stunning_finale', 'Stunning Finale', '+40% chance to stun.', [mod('apply_stun', 'flat', 0.4)]),
      n('paid_finale', 'Crowd\'s Tribute', 'Gain 4 life on hit.', [mod('lifeOnHit', 'flat', 4)])],
    [n('swift_finale', 'Swift Finale', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('lodged_finale', 'Unfinished Finale', 'Impales enemies for 30% of physical hit damage.', [mod('impalePower', 'flat', 0.3)]),
      n('bleeding_finale', 'Red Curtain', '+60% chance to inflict bleed.', [mod('apply_bleed', 'flat', 0.6)])],
  ], damage('perfect')),

  thrown_ace: tree([
    n('full_hand', 'Full Hand', 'Throws 3 parallel cards, but deals 30% less damage per card.', [mod('projectileCount', 'flat', 2), mod('fireVolley', 'flat', 1), mod('damage', 'more', -0.3)]),
    [n('piercing_hand', 'Piercing Hand', 'Pierces 2 additional enemies.', [mod('pierceCount', 'flat', 2)]),
      n('wide_hand', 'Wide Hand', '40% increased projectile spacing.', [mod('volleySpacing', 'increased', 0.4)]),
      n('large_hand', 'Large Hand', '35% increased projectile size.', [mod('projectileSize', 'increased', 0.35)])],
    [n('swift_hand', 'Quick Deal', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('paid_hand', 'House Collection', 'Gain 2 life on hit.', [mod('lifeOnHit', 'flat', 2)]),
      n('cheap_hand', 'Cheap Cards', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)])],
  ], [
    n('returning_ace', 'Returning Ace', 'Cards return to you at the end of their flight, but deal 20% less damage.', [mod('projReturn', 'flat', 2), mod('damage', 'more', -0.2)]),
    [n('swift_ace', 'Swift Return', '35% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.35)]),
      n('piercing_ace', 'Through the Table', 'Pierces 2 additional enemies.', [mod('pierceCount', 'flat', 2)]),
      n('cruel_ace', 'Marked Ace', '+10% critical chance.', [mod('critChance', 'flat', 0.1)])],
    [n('loaded_ace', 'Loaded Suits', '+25% chance to ignite, chill, and shock.', [mod('apply_burn', 'flat', 0.25), mod('apply_chill', 'flat', 0.25), mod('apply_shock', 'flat', 0.25)]),
      n('lasting_ace', 'Lingering Suits', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('lucky_ace', 'Lucky Ace', '+20% luck for this skill\'s chance rolls.', [mod('luck', 'flat', 0.2)])],
  ], damage('ace')),

  stack_the_deck: tree([
    buff(n('shared_table', 'Shared Table', 'Grants the buff to allies and minions within 180 radius for 5 seconds.', undefined, { tags: { add: ['aoe'] } }), 'stacked_deck', { duration: 5, affects: 'allies', radius: 180 }),
    [n('wide_table', 'Wide Table', '40% increased buff radius.', [mod('aoeRadius', 'increased', 0.4)]),
      n('lasting_table', 'Stay at the Table', '40% increased buff duration.', [mod('effectDuration', 'increased', 0.4)]),
      buff(n('guarded_table', 'House Protection', 'Also grants 10% less damage taken.'), 'stacked_deck', { mods: [mod('damageTaken', 'more', -0.1)] })],
    [buff(n('loaded_table', 'Loaded Table', 'Grants an additional +15% luck.'), 'stacked_deck', { mods: [mod('luck', 'flat', 0.15)] }),
      n('ready_table', 'Set Another Table', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_table', 'House Credit', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    buff(n('ace_in_reserve', 'Ace in Reserve', 'Lasts 4 seconds and grants 45% more attack damage, ending after your next attack hit.'), 'stacked_deck', { duration: 4, consumeOn: { on: 'hit', tags: ['attack'] }, mods: [mod('damage', 'more', 0.45, ['attack'])] }),
    [buff(n('certain_reserve', 'Certain Hand', 'While active, gain 60% increased attack accuracy.'), 'stacked_deck', { mods: [mod('accuracy', 'increased', 0.6, ['attack'])] }),
      buff(n('cruel_reserve', 'Cruel Hand', 'While active, gain +12% attack critical chance.'), 'stacked_deck', { mods: [mod('critChance', 'flat', 0.12, ['attack'])] }),
      buff(n('hungry_reserve', 'Collect the Debt', 'While active, leech 8% of attack hit damage as life.'), 'stacked_deck', { mods: [mod('lifeLeech', 'flat', 0.08, ['attack'])] })],
    [n('lasting_reserve', 'Hold the Ace', '50% increased buff duration.', [mod('effectDuration', 'increased', 0.5)]),
      n('ready_reserve', 'Palm Another Ace', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_reserve', 'Light Fingers', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], recovery('deck')),

  quiet_step: tree([
    buff(n('quiet_company', 'Quiet Company', 'Also grants the buff to allies and minions within 160 radius for 4 seconds.', undefined, { tags: { add: ['buff', 'aoe'] } }), 'quiet_step', { duration: 4, affects: 'allies', radius: 160 }),
    [n('wide_company', 'Room for Company', '40% increased buff radius.', [mod('aoeRadius', 'increased', 0.4)]),
      n('lasting_company', 'Long Goodbyes', '40% increased buff duration.', [mod('effectDuration', 'increased', 0.4)]),
      buff(n('swift_company', 'Leave Together', 'Also grants 25% increased movement speed.'), 'quiet_step', { mods: [mod('moveSpeed', 'increased', 0.25)] })],
    [n('ready_company', 'Another Exit', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_company', 'Cheap Passage', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      buff(n('guarded_company', 'Watch the Door', 'Also grants 40% increased evasion.'), 'quiet_step', { mods: [mod('evasion', 'increased', 0.4)] })],
  ], [
    buff(n('silent_cover', 'Silent Cover', 'Also grants 25% less damage taken and 30% increased movement speed for 3 seconds, ending early if you are hit.', undefined, { tags: { add: ['buff'] } }), 'quiet_step', { duration: 3, clearOnHit: true, mods: [mod('damageTaken', 'more', -0.25), mod('moveSpeed', 'increased', 0.3)] }),
    [buff(n('elusive_cover', 'Elusive Cover', 'While active, gain 60% increased evasion.'), 'quiet_step', { mods: [mod('evasion', 'increased', 0.6)] }),
      buff(n('mending_cover', 'Mending Cover', 'While active, regenerate 1.5% of maximum life per second.'), 'quiet_step', { mods: [mod('lifeRegenPct', 'flat', 0.015)] }),
      n('lasting_cover', 'Wait in Cover', '50% increased buff duration.', [mod('effectDuration', 'increased', 0.5)])],
    [n('ready_cover', 'Find More Cover', '50% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.5)]),
      n('cheap_cover', 'Easy Exit', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      buff(n('fleet_cover', 'Fleet Exit', 'While active, gain an additional 20% increased movement speed.'), 'quiet_step', { mods: [mod('moveSpeed', 'increased', 0.2)] })],
  ], recovery('quiet')),
};
