import type { SkillTreeSpec, TreeBuffPatch } from '../engine/skills';
import { mod, conversionStat } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const graft = (node: Node, support: string): Node => ({ ...node, graft: { support, level: 1 } });
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });

/** Complete opening bars for the three fresh-account classes. These use the
 * same binary anatomy as the undead trees; no class owns a private mechanic. */
export const STARTER_SKILL_TREES: Record<string, SkillTreeSpec> = {
  cleave: tree([
    n('lodged_steel', 'Lodged Steel', 'Lodge 18% of physical hit damage as an impale, discharged by a subsequent hit.', [mod('impalePower', 'flat', 0.18)]),
    [n('deep_notches', 'Deep Notches', 'Lodge an additional 12% of physical hit damage as impale.', [mod('impalePower', 'flat', 0.12)]),
      n('barbed_edge', 'Barbed Edge', 'Hits gain 35% chance to bleed and 25% increased physical ailment magnitude.', [mod('apply_bleed', 'flat', 0.35), mod('statusMagnitude', 'increased', 0.25, ['physical'])]),
      n('splitting_armor', 'Splitting Armor', 'Ignore 15% of enemy armor.', [mod('armorPen', 'flat', 0.15)])],
    [n('steady_cuts', 'Steady Cuts', '20% increased attack speed and 20% increased accuracy.', [mod('attackSpeed', 'increased', 0.2), mod('accuracy', 'increased', 0.2)]),
      n('close_quarters', 'Close Quarters', 'Restore 2 life per landed hit.', [mod('lifeOnHit', 'flat', 2)]),
      n('finishing_cut', 'Finishing Cut', 'Cull enemies below 8% life.', [mod('cullThreshold', 'flat', 0.08)])],
  ], [
    graft(n('unbound_cleave', 'Unbound Cleave', 'Throw the arc as a traveling crescent, striking each enemy once. 20% less damage and 35% more mana cost.'), 'sweeping_blow'),
    [n('long_edge', 'Long Edge', '35% increased sweep travel and 20% increased duration.', [mod('sweepRange', 'increased', 0.35), mod('effectDuration', 'increased', 0.2)]),
      n('wide_front', 'Wide Front', '30% increased area radius and 25% increased arc width.', [mod('aoeRadius', 'increased', 0.3), mod('swingArc', 'increased', 0.25)]),
      n('driving_front', 'Driving Front', 'Hits gain 45 knockback strength.', [mod('knockback', 'flat', 45)])],
    [n('tempered_wave', 'Tempered Wave', '30% increased damage.', [mod('damage', 'increased', 0.3)]),
      n('razor_horizon', 'Razor Horizon', '10% additional critical chance and 25% critical multiplier.', [mod('critChance', 'flat', 0.1), mod('critMulti', 'flat', 0.25)]),
      n('heavy_wave', 'Heavy Wave', '35% more damage at 15% less attack speed.', [mod('damage', 'more', 0.35), mod('attackSpeed', 'more', -0.15)])],
  ], n('practiced_edge', 'Practiced Edge', '15% increased damage.', [mod('damage', 'increased', 0.15)])),

  shield_up: tree([
    graft(n('iron_shelter', 'Iron Shelter', 'While guarding, a separate 200-degree rear shell covers your blind side. Its 55 base pool scales with guard strength; after breaking it begins to reform after 4 seconds. Dropping the guard removes it.'), 'grafted_carapace'),
    [n('reinforced_plate', 'Reinforced Plate', '35% increased guard strength.', [mod('guardStrength', 'increased', 0.35)]),
      n('broad_shelter', 'Broad Shelter', '30% increased area radius widens the frontal guard.', [mod('aoeRadius', 'increased', 0.3)]),
      n('shared_shelter', 'Shared Shelter', 'Nearby minions can shelter behind your frontal guard; their intercepted hits drain your guard instead.', [mod('guardAegis', 'flat', 1)])],
    [n('ready_watch', 'Ready Watch', '30% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.3)]),
      graft(n('shield_pump', 'Shield Pump', 'While holding the guard, drain 8% of maximum poise per second to rebuild 2 guard per point. Stops at 25% poise and when the guard is full.'), 'stoneblood_conduit'),
      graft(n('sheltered_thrust', 'Sheltered Thrust', 'Gain the Thrust secondary action while the guard is held.'), 'phalanx')],
  ], [
    n('measured_riposte', 'Measured Riposte', 'The first 0.3 seconds of each guard can parry, reflecting incoming damage at 150% power without spending shield.', [mod('guardParry', 'flat', 0.3)]),
    [n('patient_hand', 'Patient Hand', 'The parry window lasts 0.15 seconds longer.', [mod('guardParry', 'flat', 0.15)]),
      n('punishing_reply', 'Punishing Reply', 'Parry damage gains 50 percentage points of incoming damage.', [mod('guardParryPower', 'flat', 0.5)]),
      n('resetting_stance', 'Resetting Stance', '45% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.45)])],
    [n('loaded_bash', 'Loaded Bash', '40% increased bash power; lower the bash arming line by 20%.', [mod('bashPower', 'increased', 0.4), mod('bashFloor', 'increased', -0.2)]),
      n('unbroken_answer', 'Unbroken Answer', '30% increased guard strength and 20% increased bash power.', [mod('guardStrength', 'increased', 0.3), mod('bashPower', 'increased', 0.2)]),
      n('hollow_counter', 'Hollow Counter', 'Invert the bash: release when the guard is sufficiently depleted, dealing damage from shield lost rather than shield remaining. 25% increased bash power.', [mod('bashInvert', 'flat', 1), mod('bashPower', 'increased', 0.25)])],
  ], n('shield_drill', 'Shield Drill', '15% increased guard strength.', [mod('guardStrength', 'increased', 0.15)])),

  war_cry: tree([
    buff(n('warband_call', 'Warband Call', 'Your battle blessing reaches you and allies within 180 base radius, including minions. It is granted once when you shout.', undefined, { tags: { add: ['aoe'] } }), 'war_cry', { affects: 'allies', radius: 180 }),
    [n('carrying_voice', 'Carrying Voice', '30% increased blessing radius and 20% increased duration.', [mod('aoeRadius', 'increased', 0.3), mod('effectDuration', 'increased', 0.2)]),
      buff(n('marching_order', 'Marching Order', 'The blessing also grants 15% increased movement speed.'), 'war_cry', { mods: [mod('moveSpeed', 'increased', 0.15)] }),
      buff(n('hold_the_line', 'Hold the Line', 'The blessing also grants 40 armor and 5% block chance.'), 'war_cry', { mods: [mod('armor', 'flat', 40), mod('blockChance', 'flat', 0.05)] })],
    [n('rallying_rhythm', 'Rallying Rhythm', '35% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.35)]),
      buff(n('shared_vigor', 'Shared Vigor', 'The blessing also grants 2 life regenerated per second.'), 'war_cry', { mods: [mod('lifeRegen', 'flat', 2)] }),
      buff(n('battle_fervor', 'Battle Fervor', 'The blessing grants an additional 15% increased attack speed and 15% increased cast speed.'), 'war_cry', { mods: [mod('attackSpeed', 'increased', 0.15), mod('castSpeed', 'increased', 0.15)] })],
  ], [
    buff(n('measured_fury', 'Measured Fury', 'Turn the cry into preparation for one decisive hit: its blessing lasts 4 seconds, adds 50% more attack damage, and is consumed after your next landed attack hit.'), 'war_cry', { duration: 4, consumeOn: { on: 'hit', tags: ['attack'] }, mods: [mod('damage', 'more', 0.5, ['attack'])] }),
    [buff(n('sure_hand', 'Sure Hand', 'While prepared, gain 40% increased accuracy and 10% attack critical chance.'), 'war_cry', { mods: [mod('accuracy', 'increased', 0.4), mod('critChance', 'flat', 0.1, ['attack'])] }),
      buff(n('crushing_intent', 'Crushing Intent', 'While prepared, attack hits gain 30% chance to stun.'), 'war_cry', { mods: [mod('apply_stun', 'flat', 0.3, ['attack'])] }),
      buff(n('blood_repaid', 'Blood Repaid', 'While prepared, leech 8% of attack hit damage as life.'), 'war_cry', { mods: [mod('lifeLeech', 'flat', 0.08, ['attack'])] })],
    [n('measured_breath', 'Measured Breath', '35% increased cooldown recovery and 25% increased duration.', [mod('cooldownRecovery', 'increased', 0.35), mod('effectDuration', 'increased', 0.25)]),
      n('armored_breath', 'Armored Breath', 'Each mana actually paid grants 3 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins.', [mod('costWard_mana', 'flat', 3)]),
      buff(n('execution_order', 'Execution Order', 'While prepared, attack hits cull enemies below 10% life.'), 'war_cry', { mods: [mod('cullThreshold', 'flat', 0.1, ['attack'])] })],
  ], n('breath_control', 'Breath Control', '15% increased blessing duration.', [mod('effectDuration', 'increased', 0.15)])),

  firebolt: tree([
    n('ember_satellites', 'Ember Satellites', 'Flame orbs circle their caster instead of flying forward. Cast one additional orb; 20% less damage.', [mod('orbitPower', 'flat', 1), mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2)]),
    [n('dense_constellation', 'Dense Constellation', 'Cast one additional orb; 10% less damage.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.1)]),
      n('passing_embers', 'Passing Embers', 'Orbs pierce two additional enemies.', [mod('pierceCount', 'flat', 2)]),
      n('broad_embers', 'Broad Embers', '50% increased projectile size and 20% increased damage.', [mod('projectileSize', 'increased', 0.5), mod('damage', 'increased', 0.2)])],
    [n('searing_orbit', 'Searing Orbit', 'Hits gain 35% additional chance to burn.', [mod('apply_burn', 'flat', 0.35)]),
      n('clinging_cinders', 'Clinging Cinders', '40% increased fire ailment magnitude and 25% increased duration.', [mod('statusMagnitude', 'increased', 0.4, ['fire']), mod('effectDuration', 'increased', 0.25)]),
      n('wildfire_sparks', 'Wildfire Sparks', 'Burns spread when their victim dies.', [mod('dotPropagates', 'flat', 1)])],
  ], [
    n('cinder_lance', 'Cinder Lance', 'Flame bolts pierce three additional enemies and fly 30% faster; cast 15% more slowly.', [mod('pierceCount', 'flat', 3), mod('projectileSpeed', 'increased', 0.3), mod('castSpeed', 'more', -0.15)]),
    [n('white_heat', 'White Heat', 'Penetrate 10% fire resistance.', [mod('firePen', 'flat', 0.1)]),
      n('focused_flame', 'Focused Flame', '30% more damage at 15% more mana cost.', [mod('damage', 'more', 0.3), mod('manaCost', 'more', 0.15)]),
      n('incandescent_point', 'Incandescent Point', '10% additional critical chance and 30% critical multiplier.', [mod('critChance', 'flat', 0.1), mod('critMulti', 'flat', 0.3)])],
    [n('slow_combustion', 'Slow Combustion', 'Hits gain 30% additional burn chance and 35% increased fire ailment magnitude.', [mod('apply_burn', 'flat', 0.3), mod('statusMagnitude', 'increased', 0.35, ['fire'])]),
      n('lasting_cinders', 'Lasting Cinders', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('far_flight', 'Far Flight', '40% increased projectile speed and 20% increased damage.', [mod('projectileSpeed', 'increased', 0.4), mod('damage', 'increased', 0.2)])],
  ], n('flame_studies', 'Flame Studies', '15% increased fire damage.', [mod('damage', 'increased', 0.15, ['fire'])])),

  frost_nova: tree([
    n('winter_footprint', 'Winter Footprint', 'Leave an 80-radius cold field for 3 seconds after the nova. It strikes every half-second for 40% skill damage; 20% less damage.', [mod('lingerField', 'flat', 3), mod('damage', 'more', -0.2)]),
    [n('winter_borders', 'Winter Borders', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('lingering_winter', 'Lingering Winter', 'Fields last 2 additional base seconds.', [mod('lingerField', 'flat', 2)]),
      n('deepening_cold', 'Deepening Cold', 'Allow two additional chill stacks per enemy.', [mod('ailmentStacks', 'flat', 2, ['cold'])])],
    [n('bitter_ground', 'Bitter Ground', '30% increased cold damage and 25% increased ailment magnitude.', [mod('damage', 'increased', 0.3, ['cold']), mod('statusMagnitude', 'increased', 0.25, ['cold'])]),
      n('cracking_ice', 'Cracking Ice', 'Penetrate 12% cold resistance.', [mod('coldPen', 'flat', 0.12)]),
      n('winter_refuge', 'Winter Refuge', 'Each mana actually paid grants 2 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins.', [mod('costWard_mana', 'flat', 2)])],
  ], [
    graft(n('snap_freeze', 'Snap Freeze', 'Nova hits against chilled enemies have a 30% chance to call Deep Freeze, hardening their chill into a freeze. Deep Freeze has a 2-second internal cooldown. Deep Freeze has a 2-second internal cooldown.'), 'frostbite_grip'),
    [n('cold_refrain', 'Cold Refrain', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('spreading_ring', 'Spreading Ring', '35% increased area radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('long_stillness', 'Long Stillness', '45% increased effect duration.', [mod('effectDuration', 'increased', 0.45)])],
    [n('glass_heart', 'Glass Heart', 'Gain 20% critical chance against frozen enemies.', [mod('critChance', 'flat', 0.2, ['vs:frozen'])]),
      n('brittle_targets', 'Brittle Targets', '35% more damage against frozen enemies.', [mod('damage', 'more', 0.35, ['vs:frozen'])]),
      n('shards_of_winter', 'Shards of Winter', 'Gain 50% critical multiplier against frozen enemies and 20% increased cold damage.', [mod('critMulti', 'flat', 0.5, ['vs:frozen']), mod('damage', 'increased', 0.2, ['cold'])])],
  ], n('winter_studies', 'Winter Studies', '12% increased cold damage and 5% increased area radius.', [mod('damage', 'increased', 0.12, ['cold']), mod('aoeRadius', 'increased', 0.05)])),

  chain_lightning: tree([
    n('branching_storm', 'Branching Storm', 'Bolts chain to two additional enemies; 15% less damage.', [mod('chainCount', 'flat', 2), mod('damage', 'more', -0.15)]),
    [n('forked_current', 'Forked Current', 'Cast one additional bolt; 15% less damage.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.15)]),
      n('far_conduction', 'Far Conduction', '35% increased projectile speed and one additional chain.', [mod('projectileSpeed', 'increased', 0.35), mod('chainCount', 'flat', 1)]),
      n('charged_contacts', 'Charged Contacts', 'Hits gain 30% additional chance to shock.', [mod('apply_shock', 'flat', 0.3)])],
    [n('storm_pressure', 'Storm Pressure', '30% increased lightning damage.', [mod('damage', 'increased', 0.3, ['lightning'])]),
      n('conductive_wounds', 'Conductive Wounds', 'Deal 8% more damage per shock stack on the target.', [mod('damageVs_shock', 'flat', 0.08)]),
      n('storm_piercer', 'Storm Piercer', 'Penetrate 12% lightning resistance.', [mod('lightningPen', 'flat', 0.12)])],
  ], [
    graft(n('closed_circuit', 'Closed Circuit', 'Remove the three innate chains. Spent bolts return to their casting point and can strike again, creating an outward-and-return attack.', [mod('chainCount', 'flat', -3)]), 'returning'),
    [n('clean_passage', 'Clean Passage', 'Pierce two additional enemies before returning.', [mod('pierceCount', 'flat', 2)]),
      n('double_current', 'Double Current', 'Cast one additional bolt; 15% less damage.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.15)]),
      n('swift_return', 'Swift Return', '45% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.45)])],
    [n('concentrated_charge', 'Concentrated Charge', '30% increased lightning damage and 5% additional critical chance.', [mod('damage', 'increased', 0.3, ['lightning']), mod('critChance', 'flat', 0.05)]),
      n('violent_contact', 'Violent Contact', '40% additional critical multiplier.', [mod('critMulti', 'flat', 0.4)]),
      n('circuit_breaker', 'Circuit Breaker', 'Hits gain 25% chance to stun; 20% increased damage.', [mod('apply_stun', 'flat', 0.25), mod('damage', 'increased', 0.2)])],
  ], n('storm_studies', 'Storm Studies', '15% increased lightning damage.', [mod('damage', 'increased', 0.15, ['lightning'])])),

  backstab: tree([
    n('venomed_knife', 'Venomed Knife', 'Convert all physical damage to chaos and gain 50% chance to poison. Rear attacks retain their innate damage bonus.', [mod(conversionStat('physical', 'chaos'), 'flat', 1), mod('apply_poison', 'flat', 0.5)], { tags: { remove: ['physical'], add: ['chaos'] } }),
    [n('deep_venom', 'Deep Venom', '35% increased chaos ailment magnitude.', [mod('statusMagnitude', 'increased', 0.35, ['chaos'])]),
      n('layered_toxin', 'Layered Toxin', 'Allow three additional poison stacks per enemy.', [mod('ailmentStacks', 'flat', 3, ['chaos'])]),
      n('parasitic_knife', 'Parasitic Knife', 'Recover life equal to 4% of damage dealt by this skill\'s poison.', [mod('dotLeech_poison', 'flat', 0.04)])],
    [n('unseen_toxin', 'Unseen Toxin', 'Hits from behind gain 35% additional poison chance.', [mod('apply_poison', 'flat', 0.35, ['vs:behind'])]),
      n('infected_wake', 'Infected Wake', 'Poisons spread when their victim dies.', [mod('dotPropagates', 'flat', 1)]),
      n('corrosive_point', 'Corrosive Point', 'Penetrate 12% chaos resistance.', [mod('chaosPen', 'flat', 0.12)])],
  ], [
    n('execution_point', 'Execution Point', 'Lodge 25% of physical hit damage as impale for a later hit to discharge. Gain 10% critical chance against enemies struck from behind.', [mod('impalePower', 'flat', 0.25), mod('critChance', 'flat', 0.1, ['vs:behind'])]),
    [n('anatomists_eye', 'Anatomist\'s Eye', '30% additional critical multiplier and 20% increased accuracy.', [mod('critMulti', 'flat', 0.3), mod('accuracy', 'increased', 0.2)]),
      n('severing_point', 'Severing Point', 'Cull enemies below 10% life.', [mod('cullThreshold', 'flat', 0.1)]),
      n('exposed_spine', 'Exposed Spine', 'Ignore 15% of enemy armor and lodge 10% additional physical damage as impale.', [mod('armorPen', 'flat', 0.15), mod('impalePower', 'flat', 0.1)])],
    [n('relentless_knife', 'Relentless Knife', '35% increased cooldown recovery and 15% increased attack speed.', [mod('cooldownRecovery', 'increased', 0.35), mod('attackSpeed', 'increased', 0.15)]),
      n('drink_the_cut', 'Drink the Cut', 'Leech 6% of hit damage as life.', [mod('lifeLeech', 'flat', 0.06)]),
      n('rear_execution', 'Rear Execution', '35% more damage when striking from behind.', [mod('damage', 'more', 0.35, ['vs:behind'])])],
  ], n('knife_practice', 'Knife Practice', '15% increased damage.', [mod('damage', 'increased', 0.15)])),

  cloak: tree([
    buff(n('vanishing_cloak', 'Vanishing Cloak', 'Become invisible for 3 base seconds instead of merely obscured. Offensive acts consume the cloak; stray area damage can still hit you.'), 'cloak', { duration: 3, mods: [mod('invisible', 'override', 1)] }),
    [n('patient_shadow', 'Patient Shadow', '40% increased cloak duration.', [mod('effectDuration', 'increased', 0.4)]),
      buff(n('unseen_stride', 'Unseen Stride', 'While cloaked, gain an additional 25% increased movement speed.'), 'cloak', { mods: [mod('moveSpeed', 'increased', 0.25)] }),
      n('hidden_patience', 'Hidden Patience', '30% additional increased cloak duration.', [mod('effectDuration', 'increased', 0.3)])],
    [n('return_to_dark', 'Return to Dark', '35% increased cooldown recovery and 15% reduced mana cost.', [mod('cooldownRecovery', 'increased', 0.35), mod('manaCost', 'increased', -0.15)]),
      buff(n('ambush_school', 'Ambush School', 'Gain 25 percentage points of ambush damage when a hit lands while still cloaked. Melee attacks can strike before the cloak breaks.'), 'cloak', { mods: [mod('ambushBonus', 'flat', 0.25)] }),
      n('shadow_padding', 'Shadow Padding', 'Each mana actually paid grants 2 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins.', [mod('costWard_mana', 'flat', 2)])],
  ], [
    buff(n('skirmisher_veil', 'Skirmisher Veil', 'Keep the 8-second obscuring cloak and gain 60% increased evasion while it lasts. Offensive acts preserve it, but a landed hit against you tears it away.'), 'cloak', { clearOnHit: true, mods: [mod('evasion', 'increased', 0.6)] }),
    [buff(n('slippery_silhouette', 'Slippery Silhouette', 'While veiled, gain an additional 20% increased movement speed.'), 'cloak', { mods: [mod('moveSpeed', 'increased', 0.2)] }),
      buff(n('light_footwork', 'Light Footwork', 'While veiled, gain 40% additional increased evasion.'), 'cloak', { mods: [mod('evasion', 'increased', 0.4)] }),
      buff(n('veil_of_iron', 'Veil of Iron', 'While veiled, take 15% less damage. The veil still breaks after a landed hit.'), 'cloak', { mods: [mod('damageTaken', 'more', -0.15)] })],
    [n('renewed_disguise', 'Renewed Disguise', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      buff(n('hasty_assault', 'Hasty Assault', 'While veiled, gain 20% increased attack speed and cast speed.'), 'cloak', { mods: [mod('attackSpeed', 'increased', 0.2), mod('castSpeed', 'increased', 0.2)] }),
      n('enduring_disguise', 'Enduring Disguise', '50% increased cloak duration.', [mod('effectDuration', 'increased', 0.5)])],
  ], n('cloak_practice', 'Cloak Practice', '15% increased cloak duration.', [mod('effectDuration', 'increased', 0.15)])),

  shadow_step: tree([
    buff(n('assassins_arrival', 'Assassin\'s Arrival', 'After stepping behind your target, prepare for 3 seconds: your next landed attack hit deals 30% more damage, then consumes the preparation.', undefined, { tags: { add: ['buff', 'duration'] } }), 'step_preparation', { duration: 3, consumeOn: { on: 'hit', tags: ['attack'] }, mods: [mod('damage', 'more', 0.3, ['attack'])] }),
    [buff(n('poised_blade', 'Poised Blade', 'While prepared, gain 15% attack critical chance.'), 'step_preparation', { mods: [mod('critChance', 'flat', 0.15, ['attack'])] }),
      buff(n('open_back', 'Open Back', 'While prepared, attacks from behind deal an additional 25% more damage.'), 'step_preparation', { mods: [mod('damage', 'more', 0.25, ['attack', 'vs:behind'])] }),
      buff(n('siphoning_entry', 'Siphoning Entry', 'While prepared, leech 8% of attack hit damage as life.'), 'step_preparation', { mods: [mod('lifeLeech', 'flat', 0.08, ['attack'])] })],
    [n('quick_approach', 'Quick Approach', '35% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.35)]),
      n('patient_blade', 'Patient Blade', '50% increased preparation duration.', [mod('effectDuration', 'increased', 0.5)]),
      buff(n('silencing_entry', 'Silencing Entry', 'While prepared, attacks gain 50% chance to silence their target.'), 'step_preparation', { mods: [mod('apply_silence', 'flat', 0.5, ['attack'])] })],
  ], [
    buff(n('smoke_passage', 'Smoke Passage', 'Arrive invisible for 1.5 base seconds. Offensive acts consume this concealment; the step still requires an enemy destination.', undefined, { tags: { add: ['buff', 'duration'] } }), 'step_smoke', { duration: 1.5, mods: [mod('invisible', 'override', 1)] }),
    [n('thick_smoke', 'Thick Smoke', '50% increased concealment duration.', [mod('effectDuration', 'increased', 0.5)]),
      buff(n('ghost_stride', 'Ghost Stride', 'While concealed, move 30% faster.'), 'step_smoke', { mods: [mod('moveSpeed', 'increased', 0.3)] }),
      n('smoke_armor', 'Smoke Armor', 'Each mana actually paid grants 3 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins.', [mod('costWard_mana', 'flat', 3)])],
    [n('fading_steps', 'Fading Steps', '35% increased cooldown recovery and 20% reduced mana cost.', [mod('cooldownRecovery', 'increased', 0.35), mod('manaCost', 'increased', -0.2)]),
      buff(n('hidden_mending', 'Hidden Mending', 'While concealed, regenerate 3 life per second.'), 'step_smoke', { mods: [mod('lifeRegen', 'flat', 3)] }),
      buff(n('smoke_screen', 'Smoke Screen', 'While concealed, take 20% less damage from stray hits.'), 'step_smoke', { mods: [mod('damageTaken', 'more', -0.2)] })],
  ], n('step_practice', 'Step Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),
};
