import { FIREBOLT_TREE } from './fireboltTree';
import { SHIELD_UP_TREE } from './shieldUpTree';
import { CLEAVE_TREE } from './cleaveTree';
import type { SkillTreeSpec, TreeBuffPatch } from '../engine/skills';
import { mod, conversionStat } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const graft = (node: Node, support: string): Node => ({ ...node, graft: { support, level: 1 } });
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });

/** Complete opening bars for the three fresh-account classes. These use the
 * same binary anatomy as the undead trees; no class owns a private mechanic. */
export const STARTER_SKILL_TREES: Record<string, SkillTreeSpec> = {
  cleave: CLEAVE_TREE,

  shield_up: SHIELD_UP_TREE,

  war_cry: tree([
    buff(n('warband_call', 'Warband Call', 'Your battle cry affects you and allies within 180 radius, including minions.', undefined, { tags: { add: ['aoe'] } }), 'war_cry', { affects: 'allies', radius: 180 }),
    [n('carrying_voice', 'Carrying Voice', '30% increased area radius and 20% increased duration.', [mod('aoeRadius', 'increased', 0.3), mod('effectDuration', 'increased', 0.2)]),
      buff(n('marching_order', 'Marching Order', 'Also grants 15% increased movement speed.'), 'war_cry', { mods: [mod('moveSpeed', 'increased', 0.15)] }),
      buff(n('hold_the_line', 'Hold the Line', 'Also grants +40 armor and +5% block chance.'), 'war_cry', { mods: [mod('armor', 'flat', 40), mod('blockChance', 'flat', 0.05)] })],
    [n('rallying_rhythm', 'Rallying Rhythm', '35% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.35)]),
      buff(n('shared_vigor', 'Shared Vigor', 'Also grants 2 life regenerated per second.'), 'war_cry', { mods: [mod('lifeRegen', 'flat', 2)] }),
      buff(n('battle_fervor', 'Battle Fervor', 'Grants an additional 15% increased attack speed and 15% increased cast speed.'), 'war_cry', { mods: [mod('attackSpeed', 'increased', 0.15), mod('castSpeed', 'increased', 0.15)] })],
  ], [
    buff(n('measured_fury', 'Measured Fury', 'Empowers your next attack hit within 4 seconds to deal 50% more attack damage.'), 'war_cry', { duration: 4, consumeOn: { on: 'hit', tags: ['attack'] }, mods: [mod('damage', 'more', 0.5, ['attack'])] }),
    [buff(n('sure_hand', 'Sure Hand', 'While empowered, gain 40% increased accuracy and +10% attack critical chance.'), 'war_cry', { mods: [mod('accuracy', 'increased', 0.4), mod('critChance', 'flat', 0.1, ['attack'])] }),
      buff(n('crushing_intent', 'Crushing Intent', 'While empowered, attack hits gain +30% chance to stun.'), 'war_cry', { mods: [mod('apply_stun', 'flat', 0.3, ['attack'])] }),
      buff(n('blood_repaid', 'Blood Repaid', 'While empowered, leech 8% of attack hit damage as life.'), 'war_cry', { mods: [mod('lifeLeech', 'flat', 0.08, ['attack'])] })],
    [n('measured_breath', 'Measured Breath', '35% increased cooldown recovery and 25% increased duration.', [mod('cooldownRecovery', 'increased', 0.35), mod('effectDuration', 'increased', 0.25)]),
      n('armored_breath', 'Armored Breath', 'Gain a shield for 3 seconds equal to 3 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 3)]),
      buff(n('execution_order', 'Execution Order', 'While empowered, attack hits cull enemies below 10% life.'), 'war_cry', { mods: [mod('cullThreshold', 'flat', 0.1, ['attack'])] })],
  ], n('breath_control', 'Breath Control', '15% increased buff duration.', [mod('effectDuration', 'increased', 0.15)])),

  firebolt: FIREBOLT_TREE,

  frost_nova: tree([
    n('winter_footprint', 'Winter Footprint', 'Leaves a chilling ground in an 80 radius for 3 seconds that deals 40% skill damage every 0.5 seconds. Deals 20% less damage.', [mod('lingerField', 'flat', 3), mod('damage', 'more', -0.2)]),
    [n('winter_borders', 'Winter Borders', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('lingering_winter', 'Lingering Winter', 'Chilling ground lasts 2 additional seconds.', [mod('lingerField', 'flat', 2)]),
      n('deepening_cold', 'Deepening Cold', 'Enemies can have up to 2 additional chill stacks.', [mod('ailmentStacks', 'flat', 2, ['cold'])])],
    [n('bitter_ground', 'Bitter Ground', '30% increased cold damage and 25% increased cold ailment magnitude.', [mod('damage', 'increased', 0.3, ['cold']), mod('statusMagnitude', 'increased', 0.25, ['cold'])]),
      n('cracking_ice', 'Cracking Ice', 'Penetrates 12% cold resistance.', [mod('coldPen', 'flat', 0.12)]),
      n('winter_refuge', 'Winter Refuge', 'Gain a shield for 3 seconds equal to 2 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 2)])],
  ], [
    graft(n('snap_freeze', 'Snap Freeze', 'Hits against chilled enemies have a 30% chance to freeze them (2s cooldown).'), 'frostbite_grip'),
    [n('cold_refrain', 'Cold Refrain', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('spreading_ring', 'Spreading Ring', '35% increased area radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('long_stillness', 'Long Stillness', '45% increased effect duration.', [mod('effectDuration', 'increased', 0.45)])],
    [n('glass_heart', 'Glass Heart', '+20% critical chance against frozen enemies.', [mod('critChance', 'flat', 0.2, ['vs:frozen'])]),
      n('brittle_targets', 'Brittle Targets', 'Deals 35% more damage against frozen enemies.', [mod('damage', 'more', 0.35, ['vs:frozen'])]),
      n('shards_of_winter', 'Shards of Winter', '+50% critical multiplier against frozen enemies and 20% increased cold damage.', [mod('critMulti', 'flat', 0.5, ['vs:frozen']), mod('damage', 'increased', 0.2, ['cold'])])],
  ], n('winter_studies', 'Winter Studies', '12% increased cold damage and 5% increased area radius.', [mod('damage', 'increased', 0.12, ['cold']), mod('aoeRadius', 'increased', 0.05)])),

  chain_lightning: tree([
    n('branching_storm', 'Branching Storm', 'Chains to 2 additional enemies, but deals 15% less damage.', [mod('chainCount', 'flat', 2), mod('damage', 'more', -0.15)]),
    [n('forked_current', 'Forked Current', 'Fires 1 additional bolt, but deals 15% less damage.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.15)]),
      n('far_conduction', 'Far Conduction', '35% increased projectile speed and +1 chain.', [mod('projectileSpeed', 'increased', 0.35), mod('chainCount', 'flat', 1)]),
      n('charged_contacts', 'Charged Contacts', 'Hits have +30% chance to shock.', [mod('apply_shock', 'flat', 0.3)])],
    [n('storm_pressure', 'Storm Pressure', '30% increased lightning damage.', [mod('damage', 'increased', 0.3, ['lightning'])]),
      n('conductive_wounds', 'Conductive Wounds', 'Deals 8% more damage per shock stack on the target.', [mod('damageVs_shock', 'flat', 0.08)]),
      n('storm_piercer', 'Storm Piercer', 'Penetrates 12% lightning resistance.', [mod('lightningPen', 'flat', 0.12)])],
  ], [
    graft(n('closed_circuit', 'Closed Circuit', 'Bolts no longer chain, Instead, bolts return to you at the end of their flight and can hit enemies again on the way back.', [mod('chainCount', 'flat', -3)]), 'returning'),
    [n('clean_passage', 'Clean Passage', 'Pierces 2 additional enemies before returning.', [mod('pierceCount', 'flat', 2)]),
      n('double_current', 'Double Current', 'Fires 1 additional bolt, but deals 15% less damage.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.15)]),
      n('swift_return', 'Swift Return', '45% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.45)])],
    [n('concentrated_charge', 'Concentrated Charge', '30% increased lightning damage and +5% critical chance.', [mod('damage', 'increased', 0.3, ['lightning']), mod('critChance', 'flat', 0.05)]),
      n('violent_contact', 'Violent Contact', '+40% critical multiplier.', [mod('critMulti', 'flat', 0.4)]),
      n('circuit_breaker', 'Circuit Breaker', 'Hits gain +25% chance to stun and 20% increased damage.', [mod('apply_stun', 'flat', 0.25), mod('damage', 'increased', 0.2)])],
  ], n('storm_studies', 'Storm Studies', '15% increased lightning damage.', [mod('damage', 'increased', 0.15, ['lightning'])])),

  backstab: tree([
    n('venomed_knife', 'Venomed Knife', 'Converts 100% of physical damage to chaos damage and grants +50% chance to poison. Retains the bonus damage from attacking behind.', [mod(conversionStat('physical', 'chaos'), 'flat', 1), mod('apply_poison', 'flat', 0.5)], { tags: { remove: ['physical'], add: ['chaos'] } }),
    [n('deep_venom', 'Deep Venom', '35% increased chaos ailment magnitude.', [mod('statusMagnitude', 'increased', 0.35, ['chaos'])]),
      n('layered_toxin', 'Layered Toxin', 'Enemies can have up to 3 additional poison stacks.', [mod('ailmentStacks', 'flat', 3, ['chaos'])]),
      n('parasitic_knife', 'Parasitic Knife', 'Recover life equal to 4% of poison damage dealt by this skill.', [mod('dotLeech_poison', 'flat', 0.04)])],
    [n('unseen_toxin', 'Unseen Toxin', 'Hits from behind have +35% chance to poison.', [mod('apply_poison', 'flat', 0.35, ['vs:behind'])]),
      n('infected_wake', 'Infected Wake', 'Poisons spread to nearby enemies when their victim dies.', [mod('dotPropagates', 'flat', 1)]),
      n('corrosive_point', 'Corrosive Point', 'Penetrates 12% chaos resistance.', [mod('chaosPen', 'flat', 0.12)])],
  ], [
    n('execution_point', 'Execution Point', 'Impales enemies for 25% of physical hit damage. +10% critical chance when striking from behind.', [mod('impalePower', 'flat', 0.25), mod('critChance', 'flat', 0.1, ['vs:behind'])]),
    [n('anatomists_eye', 'Anatomist\'s Eye', '+30% critical multiplier and 20% increased accuracy.', [mod('critMulti', 'flat', 0.3), mod('accuracy', 'increased', 0.2)]),
      n('severing_point', 'Severing Point', 'Culls enemies below 10% life.', [mod('cullThreshold', 'flat', 0.1)]),
      n('exposed_spine', 'Exposed Spine', 'Ignores 15% of enemy armor and impales for an additional 10% of physical hit damage.', [mod('armorPen', 'flat', 0.15), mod('impalePower', 'flat', 0.1)])],
    [n('relentless_knife', 'Relentless Knife', '35% increased cooldown recovery and 15% increased attack speed.', [mod('cooldownRecovery', 'increased', 0.35), mod('attackSpeed', 'increased', 0.15)]),
      n('drink_the_cut', 'Drink the Cut', 'Leech 6% of hit damage as life.', [mod('lifeLeech', 'flat', 0.06)]),
      n('rear_execution', 'Rear Execution', 'Deals 35% more damage when striking from behind.', [mod('damage', 'more', 0.35, ['vs:behind'])])],
  ], n('knife_practice', 'Knife Practice', '15% increased damage.', [mod('damage', 'increased', 0.15)])),

  cloak: tree([
    buff(n('vanishing_cloak', 'Vanishing Cloak', 'Grants invisibility for 3 seconds instead of stealth. Using an offensive skill ends invisibility.'), 'cloak', { duration: 3, mods: [mod('invisible', 'override', 1)] }),
    [n('patient_shadow', 'Patient Shadow', '40% increased cloak duration.', [mod('effectDuration', 'increased', 0.4)]),
      buff(n('unseen_stride', 'Unseen Stride', 'While cloaked, gain an additional 25% increased movement speed.'), 'cloak', { mods: [mod('moveSpeed', 'increased', 0.25)] }),
      n('hidden_patience', 'Hidden Patience', '30% increased cloak duration.', [mod('effectDuration', 'increased', 0.3)])],
    [n('return_to_dark', 'Return to Dark', '35% increased cooldown recovery and 15% reduced mana cost.', [mod('cooldownRecovery', 'increased', 0.35), mod('manaCost', 'increased', -0.15)]),
      buff(n('ambush_school', 'Ambush School', '+25% ambush damage when striking from cloak.'), 'cloak', { mods: [mod('ambushBonus', 'flat', 0.25)] }),
      n('shadow_padding', 'Shadow Padding', 'Gain a shield for 3 seconds equal to 2 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 2)])],
  ], [
    buff(n('skirmisher_veil', 'Skirmisher Veil', 'Cloak lasts 8 seconds and grants 60% increased evasion. Attacking does not break the veil, but taking a hit removes it.'), 'cloak', { clearOnHit: true, mods: [mod('evasion', 'increased', 0.6)] }),
    [buff(n('slippery_silhouette', 'Slippery Silhouette', 'While veiled, gain an additional 20% increased movement speed.'), 'cloak', { mods: [mod('moveSpeed', 'increased', 0.2)] }),
      buff(n('light_footwork', 'Light Footwork', 'While veiled, gain an additional 40% increased evasion.'), 'cloak', { mods: [mod('evasion', 'increased', 0.4)] }),
      buff(n('veil_of_iron', 'Veil of Iron', 'While veiled, take 15% less damage. Taking a hit still removes the veil.'), 'cloak', { mods: [mod('damageTaken', 'more', -0.15)] })],
    [n('renewed_disguise', 'Renewed Disguise', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      buff(n('hasty_assault', 'Hasty Assault', 'While veiled, gain 20% increased attack and cast speed.'), 'cloak', { mods: [mod('attackSpeed', 'increased', 0.2), mod('castSpeed', 'increased', 0.2)] }),
      n('enduring_disguise', 'Enduring Disguise', '50% increased cloak duration.', [mod('effectDuration', 'increased', 0.5)])],
  ], n('cloak_practice', 'Cloak Practice', '15% increased cloak duration.', [mod('effectDuration', 'increased', 0.15)])),

  shadow_step: tree([
    buff(n('assassins_arrival', 'Assassin\'s Arrival', 'After teleporting behind your target, your next attack hit within 3 seconds deals 30% more damage.', undefined, { tags: { add: ['buff', 'duration'] } }), 'step_preparation', { duration: 3, consumeOn: { on: 'hit', tags: ['attack'] }, mods: [mod('damage', 'more', 0.3, ['attack'])] }),
    [buff(n('poised_blade', 'Poised Blade', 'While empowered, gain +15% attack critical chance.'), 'step_preparation', { mods: [mod('critChance', 'flat', 0.15, ['attack'])] }),
      buff(n('open_back', 'Open Back', 'While empowered, attacks from behind deal an additional 25% more damage.'), 'step_preparation', { mods: [mod('damage', 'more', 0.25, ['attack', 'vs:behind'])] }),
      buff(n('siphoning_entry', 'Siphoning Entry', 'While empowered, leech 8% of attack hit damage as life.'), 'step_preparation', { mods: [mod('lifeLeech', 'flat', 0.08, ['attack'])] })],
    [n('quick_approach', 'Quick Approach', '35% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.35)]),
      n('patient_blade', 'Patient Blade', '50% increased buff duration.', [mod('effectDuration', 'increased', 0.5)]),
      buff(n('silencing_entry', 'Silencing Entry', 'While empowered, attacks have a 50% chance to silence the target.'), 'step_preparation', { mods: [mod('apply_silence', 'flat', 0.5, ['attack'])] })],
  ], [
    buff(n('smoke_passage', 'Smoke Passage', 'Grants invisibility for 1.5 seconds upon arrival. Using an offensive skill ends invisibility.', undefined, { tags: { add: ['buff', 'duration'] } }), 'step_smoke', { duration: 1.5, mods: [mod('invisible', 'override', 1)] }),
    [n('thick_smoke', 'Thick Smoke', '50% increased invisibility duration.', [mod('effectDuration', 'increased', 0.5)]),
      buff(n('ghost_stride', 'Ghost Stride', 'While invisible, gain 30% increased movement speed.'), 'step_smoke', { mods: [mod('moveSpeed', 'increased', 0.3)] }),
      n('smoke_armor', 'Smoke Armor', 'Gain a shield for 3 seconds equal to 3 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 3)])],
    [n('fading_steps', 'Fading Steps', '35% increased cooldown recovery and 20% reduced mana cost.', [mod('cooldownRecovery', 'increased', 0.35), mod('manaCost', 'increased', -0.2)]),
      buff(n('hidden_mending', 'Hidden Mending', 'While invisible, regenerate 3 life per second.'), 'step_smoke', { mods: [mod('lifeRegen', 'flat', 3)] }),
      buff(n('smoke_screen', 'Smoke Screen', 'While invisible, take 20% less damage.'), 'step_smoke', { mods: [mod('damageTaken', 'more', -0.2)] })],
  ], n('step_practice', 'Step Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),
};
