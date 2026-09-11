import type { SkillTreeSpec, TreeBuffPatch } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, body, type Node } from './skillTreeBuilder';
const graft = (node: Node, support: string): Node => ({ ...node, graft: { support, level: 1 } });
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });
/** A complete second set of opening bars: the commander, archer and defender. */
export const FRONTIER_STARTER_TREES: Record<string, SkillTreeSpec> = {
  summon_swarmlings: tree([
    n('teeming_contract', 'Teeming Contract', 'The hive fields up to 8 smaller swarmlings, summoning 5 at a time. 20% less minion life and 15% less size. Reservations and reknitting still apply per body.', [mod('minionLife', 'more', -0.2), mod('minionSize', 'more', -0.15)], { summon: { count: 5, maxActive: 8 } }),
    [n('crowded_cells', 'Crowded Cells', 'Two additional maximum swarmlings.', [mod('minionMaxCount', 'flat', 2)]),
      n('overflowing_cells', 'Overflowing Cells', 'Two additional maximum swarmlings and one additional summon per cast.', [mod('minionMaxCount', 'flat', 2), mod('summonCount', 'flat', 1)]),
      n('sacrificial_chitin', 'Sacrificial Chitin', 'Each swarmling gains one additional protective ply.', [mod('minionPlies', 'flat', 1)])],
    [n('scurrying_tide', 'Scurrying Tide', '25% increased minion movement speed and 15% increased minion action speed.', [mod('minionMoveSpeed', 'increased', 0.25), mod('minionHaste', 'increased', 0.15)]),
      n('needle_mandibles', 'Needle Mandibles', 'Each body lodges 12% of its physical hit damage as impale.', undefined, body(mod('impalePower', 'flat', 0.12))),
      n('brood_nourishment', 'Brood Nourishment', 'A swarmling death restores 4 life to its owner.', [mod('minionDeathHealFlat', 'flat', 4)])],
  ], [
    n('royal_guard', 'Royal Guard', 'Field two larger swarmlings at a time, with a base cap of 2. They gain 75% increased life, 50% increased damage and 40% increased size. The hive contract remains.', [mod('minionLife', 'increased', 0.75), mod('minionDamage', 'increased', 0.5), mod('minionSize', 'increased', 0.4)], { summon: { count: 2, maxActive: 2 } }),
    [n('royal_carapace', 'Royal Carapace', '40% increased minion life and one protective ply.', [mod('minionLife', 'increased', 0.4), mod('minionPlies', 'flat', 1)]),
      n('barbed_regents', 'Barbed Regents', 'Each royal body gains 20 thorns.', undefined, body(mod('thorns', 'flat', 20))),
      n('knitted_regents', 'Knitted Regents', 'Bodies regenerate 2% of maximum life each second.', [mod('minionRegenPct', 'flat', 0.02)])],
    [n('royal_ferocity', 'Royal Ferocity', '30% increased minion damage and 20% increased minion action speed.', [mod('minionDamage', 'increased', 0.3), mod('minionHaste', 'increased', 0.2)]),
      n('crushing_mandibles', 'Crushing Mandibles', 'Royal bodies gain 30% chance to stun and 35 knockback strength.', undefined, body(mod('apply_stun', 'flat', 0.3), mod('knockback', 'flat', 35))),
      n('regal_execution', 'Regal Execution', 'Royal bodies cull enemies below 8% life.', undefined, body(mod('cullThreshold', 'flat', 0.08)))],
  ], n('hive_tending', 'Hive Tending', '15% increased minion life and damage.', [mod('minionLife', 'increased', 0.15), mod('minionDamage', 'increased', 0.15)])),

  raise_gnatveil: tree([
    graft(n('patient_condensation', 'Patient Condensation', 'The veil keeps its wild motes and also condenses a claimable husk at your feet every 7 seconds while below cap. Gain 10% increased minion life investment.'), 'patient_brood'),
    [n('room_in_the_air', 'Room in the Air', 'Eight additional maximum gnats.', [mod('minionMaxCount', 'flat', 8)]),
      n('billowing_veil', 'Billowing Veil', 'Eight additional maximum gnats.', [mod('minionMaxCount', 'flat', 8)]),
      n('heavy_motes', 'Heavy Motes', '60% increased minion life investment.', [mod('minionLife', 'increased', 0.6)])],
    [n('layered_wings', 'Layered Wings', 'Gnats gain one additional protective ply. Plies are not divided among the cloud.', [mod('minionPlies', 'flat', 1)]),
      n('double_membrane', 'Double Membrane', 'Gnats gain one further protective ply.', [mod('minionPlies', 'flat', 1)]),
      n('quiet_flutter', 'Quiet Flutter', '40% increased minion movement speed investment.', [mod('minionMoveSpeed', 'increased', 0.4)])],
  ], [
    graft(n('battle_hatching', 'Battle Hatching', 'The veil keeps its wild motes and gains a battle gauge: your hits and minion hits each fill 3 of 100 points, then release 1–2 claimable husks. Gain 8% increased minion damage investment.'), 'hidden_reserves'),
    [n('rich_hatch', 'Rich Hatch', '50% increased bodies per find, including battle-gauge births.', [mod('throngYield', 'increased', 0.5)]),
      n('burst_hatch', 'Burst Hatch', '50% additional increased bodies per find.', [mod('throngYield', 'increased', 0.5)]),
      n('ravenous_motes', 'Ravenous Motes', '60% increased minion damage investment.', [mod('minionDamage', 'increased', 0.6)])],
    [n('walking_conductor', 'Walking Conductor', 'Add 15 percentage points of movement while conducting the veil, reaching ordinary walking pace.', [mod('channelMobility', 'flat', 0.15)]),
      n('tireless_conductor', 'Tireless Conductor', '30% reduced channel mana cost.', [mod('manaCost', 'increased', -0.3)]),
      n('frenzied_wings', 'Frenzied Wings', '50% increased minion action speed investment.', [mod('minionHaste', 'increased', 0.5)])],
  ], n('veil_tending', 'Veil Tending', '20% increased minion life and damage investment, shared through the throng batch rules.', [mod('minionLife', 'increased', 0.2), mod('minionDamage', 'increased', 0.2)])),

  command_assault: tree([
    buff(n('killing_signal', 'Killing Signal', 'The assault also prepares each minion for 6 base seconds: its next landed attack hit deals 35% more damage, consuming only its own preparation.', undefined, { tags: { add: ['buff', 'duration'] } }), 'assault_preparation', { affects: 'minions', duration: 6, consumeOn: { on: 'hit', tags: ['attack'] }, mods: [mod('damage', 'more', 0.35, ['attack'])] }),
    [buff(n('sure_signal', 'Sure Signal', 'Prepared minions gain 40% increased accuracy and 10% attack critical chance.'), 'assault_preparation', { mods: [mod('accuracy', 'increased', 0.4), mod('critChance', 'flat', 0.1, ['attack'])] }),
      buff(n('stunning_signal', 'Stunning Signal', 'Prepared attack hits gain 30% chance to stun.'), 'assault_preparation', { mods: [mod('apply_stun', 'flat', 0.3, ['attack'])] }),
      buff(n('finishing_signal', 'Finishing Signal', 'Prepared attacks cull below 8% enemy life.'), 'assault_preparation', { mods: [mod('cullThreshold', 'flat', 0.08, ['attack'])] })],
    [n('rapid_signals', 'Rapid Signals', '35% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.35)]),
      n('patient_signal', 'Patient Signal', '50% increased preparation duration. The assault order itself still lasts 6 seconds.', [mod('effectDuration', 'increased', 0.5)]),
      buff(n('rushing_signal', 'Rushing Signal', 'Prepared minions gain 30% increased movement speed until their hit lands.'), 'assault_preparation', { mods: [mod('moveSpeed', 'increased', 0.3)] })],
  ], [
    buff(n('sheltered_advance', 'Sheltered Advance', 'The assault also shields each minion with a 6-second blessing: 20% less damage taken and 20% increased movement speed. The blessing ends after a landed hit against that minion.', undefined, { tags: { add: ['buff', 'duration'] } }), 'assault_shelter', { affects: 'minions', duration: 6, clearOnHit: true, mods: [mod('damageTaken', 'more', -0.2), mod('moveSpeed', 'increased', 0.2)] }),
    [buff(n('scattered_advance', 'Scattered Advance', 'While sheltered, minions gain 50% increased evasion.'), 'assault_shelter', { mods: [mod('evasion', 'increased', 0.5)] }),
      buff(n('iron_advance', 'Iron Advance', 'While sheltered, minions gain 40 armor.'), 'assault_shelter', { mods: [mod('armor', 'flat', 40)] }),
      buff(n('flowing_advance', 'Flowing Advance', 'While sheltered, minions gain 20% additional increased movement speed.'), 'assault_shelter', { mods: [mod('moveSpeed', 'increased', 0.2)] })],
    [n('renewed_advance', 'Renewed Advance', '35% increased cooldown recovery and 20% reduced mana cost.', [mod('cooldownRecovery', 'increased', 0.35), mod('manaCost', 'increased', -0.2)]),
      buff(n('mending_advance', 'Mending Advance', 'While sheltered, minions regenerate 3 life per second.'), 'assault_shelter', { mods: [mod('lifeRegen', 'flat', 3)] }),
      n('lasting_advance', 'Lasting Advance', '50% increased shelter duration. The assault order itself still lasts 6 seconds.', [mod('effectDuration', 'increased', 0.5)])],
  ], n('clear_orders', 'Clear Orders', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),

  piercing_arrow: tree([
    n('bodkin_arrow', 'Bodkin Arrow', 'Lodge 25% of physical hit damage as impale, discharged by a later hit. Ignore 10% of enemy armor.', [mod('impalePower', 'flat', 0.25), mod('armorPen', 'flat', 0.1)]),
    [n('hardened_tip', 'Hardened Tip', '20% increased physical damage and 10% additional physical damage lodged as impale.', [mod('damage', 'increased', 0.2, ['physical']), mod('impalePower', 'flat', 0.1)]),
      n('barbed_tip', 'Barbed Tip', 'Hits gain 40% chance to bleed and 30% increased physical ailment magnitude.', [mod('apply_bleed', 'flat', 0.4), mod('statusMagnitude', 'increased', 0.3, ['physical'])]),
      n('heartseeker_tip', 'Heartseeker Tip', 'Cull enemies below 8% life.', [mod('cullThreshold', 'flat', 0.08)])],
    [n('long_shaft', 'Long Shaft', '40% increased projectile speed and 25% increased accuracy.', [mod('projectileSpeed', 'increased', 0.4), mod('accuracy', 'increased', 0.25)]),
      n('clean_puncture', 'Clean Puncture', '10% additional critical chance and 30% critical multiplier.', [mod('critChance', 'flat', 0.1), mod('critMulti', 'flat', 0.3)]),
      n('relentless_puncture', 'Relentless Puncture', 'Pierce two additional enemies.', [mod('pierceCount', 'flat', 2)])],
  ], [
    n('raking_volley', 'Raking Volley', 'Loose two additional piercing arrows per cast; 25% less damage per arrow.', [mod('projectileCount', 'flat', 2), mod('damage', 'more', -0.25)]),
    [n('broad_quiver', 'Broad Quiver', 'One additional arrow; 10% less damage per arrow.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.1)]),
      n('seeking_volley', 'Seeking Volley', 'Arrows steer toward nearby enemies at 1.2 radians per second.', [mod('homingPower', 'flat', 1.2)]),
      n('heavy_fletching', 'Heavy Fletching', '50% increased projectile size and 20% increased damage.', [mod('projectileSize', 'increased', 0.5), mod('damage', 'increased', 0.2)])],
    [n('rapid_nocking', 'Rapid Nocking', '20% increased attack speed.', [mod('attackSpeed', 'increased', 0.2)]),
      graft(n('retracing_volley', 'Retracing Volley', 'Spent arrows return to their casting point and can strike again.'), 'returning'),
      n('cruel_volley', 'Cruel Volley', '35% increased damage and 15% reduced mana cost.', [mod('damage', 'increased', 0.35), mod('manaCost', 'increased', -0.15)])],
  ], n('bow_practice', 'Bow Practice', '15% increased damage.', [mod('damage', 'increased', 0.15)])),

  fan_of_blades: tree([
    n('needle_fan', 'Needle Fan', 'Concentrate the fan: 65% reduced spread angle and 20% more damage.', [mod('spreadAngle', 'increased', -0.65), mod('damage', 'more', 0.2)]),
    [n('tempered_needles', 'Tempered Needles', 'Pierce two additional enemies.', [mod('pierceCount', 'flat', 2)]),
      n('armor_needles', 'Armor Needles', 'Ignore 15% of enemy armor.', [mod('armorPen', 'flat', 0.15)]),
      n('bleeding_needles', 'Bleeding Needles', 'Hits gain 40% chance to bleed.', [mod('apply_bleed', 'flat', 0.4)])],
    [n('balanced_throw', 'Balanced Throw', '35% increased cooldown recovery and 20% increased accuracy.', [mod('cooldownRecovery', 'increased', 0.35), mod('accuracy', 'increased', 0.2)]),
      n('killing_throw', 'Killing Throw', '10% additional critical chance and 30% critical multiplier.', [mod('critChance', 'flat', 0.1), mod('critMulti', 'flat', 0.3)]),
      n('driving_throw', 'Driving Throw', '30 knockback strength and 20% increased damage.', [mod('knockback', 'flat', 30), mod('damage', 'increased', 0.2)])],
  ], [
    graft(n('retracing_fan', 'Retracing Fan', 'Spent knives return to where they were cast, striking again on the return.'), 'returning'),
    [n('crowded_fan', 'Crowded Fan', 'Two additional knives and 10% less damage per knife.', [mod('projectileCount', 'flat', 2), mod('damage', 'more', -0.1)]),
      n('wide_reaping', 'Wide Reaping', '35% increased fan spread and 35% increased projectile size.', [mod('spreadAngle', 'increased', 0.35), mod('projectileSize', 'increased', 0.35)]),
      n('unbroken_fan', 'Unbroken Fan', 'Pierce one additional enemy.', [mod('pierceCount', 'flat', 1)])],
    [n('keen_returns', 'Keen Returns', '30% increased physical damage.', [mod('damage', 'increased', 0.3, ['physical'])]),
      n('lingering_wounds', 'Lingering Wounds', 'Hits gain 35% chance to bleed and 40% increased effect duration.', [mod('apply_bleed', 'flat', 0.35), mod('effectDuration', 'increased', 0.4)]),
      n('quick_returns', 'Quick Returns', '45% increased projectile speed and 25% increased cooldown recovery.', [mod('projectileSpeed', 'increased', 0.45), mod('cooldownRecovery', 'increased', 0.25)])],
  ], n('knife_balance', 'Knife Balance', '15% increased damage.', [mod('damage', 'increased', 0.15)])),

  quickstep: tree([
    buff(n('bounding_stride', 'Bounding Stride', 'Turn the step into a 2-second sprint with an additional 50% increased movement speed. A landed hit against you breaks the sprint.'), 'quickstep', { duration: 2, clearOnHit: true, mods: [mod('moveSpeed', 'increased', 0.5)] }),
    [n('long_stride', 'Long Stride', '40% increased sprint duration.', [mod('effectDuration', 'increased', 0.4)]),
      buff(n('elusive_stride', 'Elusive Stride', 'While sprinting, gain an additional 60% increased evasion.'), 'quickstep', { mods: [mod('evasion', 'increased', 0.6)] }),
      buff(n('braced_stride', 'Braced Stride', 'While sprinting, take 15% less damage, including the hit that breaks the sprint.'), 'quickstep', { mods: [mod('damageTaken', 'more', -0.15)] })],
    [n('renewed_stride', 'Renewed Stride', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_stride', 'Cheap Stride', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)]),
      n('sheltered_stride', 'Sheltered Stride', 'Each mana actually paid grants 2 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins.', [mod('costWard_mana', 'flat', 2)])],
  ], [
    buff(n('hunters_tempo', 'Hunter\'s Tempo', 'Keep the 4-second quickstep and prepare one shot: add 40% more projectile attack damage. The blessing ends after your next landed projectile hit.'), 'quickstep', { consumeOn: { on: 'hit', tags: ['projectile'] }, mods: [mod('damage', 'more', 0.4, ['attack', 'projectile'])] }),
    [buff(n('steady_draw', 'Steady Draw', 'While prepared, gain 50% increased accuracy and 40% increased projectile speed.'), 'quickstep', { mods: [mod('accuracy', 'increased', 0.5), mod('projectileSpeed', 'increased', 0.4)] }),
      buff(n('vital_shot', 'Vital Shot', 'While prepared, projectile attacks gain 15% critical chance.'), 'quickstep', { mods: [mod('critChance', 'flat', 0.15, ['attack', 'projectile'])] }),
      buff(n('piercing_tempo', 'Piercing Tempo', 'While prepared, launch projectiles with two additional pierces.'), 'quickstep', { mods: [mod('pierceCount', 'flat', 2)] })],
    [n('measured_tempo', 'Measured Tempo', '35% increased cooldown recovery and 25% increased blessing duration.', [mod('cooldownRecovery', 'increased', 0.35), mod('effectDuration', 'increased', 0.25)]),
      buff(n('finishing_tempo', 'Finishing Tempo', 'While prepared, projectile attacks cull enemies below 10% life.'), 'quickstep', { mods: [mod('cullThreshold', 'flat', 0.1, ['attack', 'projectile'])] }),
      buff(n('leeching_tempo', 'Leeching Tempo', 'While prepared, leech 8% of projectile attack hit damage as life.'), 'quickstep', { mods: [mod('lifeLeech', 'flat', 0.08, ['attack', 'projectile'])] })],
  ], n('footwork', 'Footwork', '15% increased effect duration.', [mod('effectDuration', 'increased', 0.15)])),

  hammer_of_judgment: tree([
    n('bastion_orbit', 'Bastion Orbit', 'Keep the hammers close: remove outward spiral growth and cast one additional orbiting hammer. 20% less damage per hammer.', [mod('spiralPower', 'override', 0), mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2)]),
    [n('broad_heads', 'Broad Heads', '40% increased projectile size.', [mod('projectileSize', 'increased', 0.4)]),
      n('staggering_ring', 'Staggering Ring', 'Hits gain 30% additional chance to stun.', [mod('apply_stun', 'flat', 0.3)]),
      n('crowded_ring', 'Crowded Ring', 'One additional hammer; 10% less damage per hammer.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.1)])],
    [n('enduring_orbit', 'Enduring Orbit', '35% increased effect duration.', [mod('effectDuration', 'increased', 0.35)]),
      n('cruel_orbit', 'Cruel Orbit', '30% increased physical damage and 10% armor penetration.', [mod('damage', 'increased', 0.3, ['physical']), mod('armorPen', 'flat', 0.1)]),
      n('swift_orbit', 'Swift Orbit', '30% increased projectile speed and 25% increased cooldown recovery.', [mod('projectileSpeed', 'increased', 0.3), mod('cooldownRecovery', 'increased', 0.25)])],
  ], [
    graft(n('pilgrim_hammer', 'Pilgrim Hammer', 'Throw a straight hammer instead of orbiting or spiraling. It pierces four additional enemies, then returns to its casting point and can strike again.', [mod('orbitPower', 'override', 0), mod('spiralPower', 'override', 0), mod('pierceCount', 'flat', 4)]), 'returning'),
    [n('long_journey', 'Long Journey', '40% increased projectile speed and 25% increased projectile size.', [mod('projectileSpeed', 'increased', 0.4), mod('projectileSize', 'increased', 0.25)]),
      n('twin_pilgrims', 'Twin Pilgrims', 'One additional hammer; 20% less damage per hammer.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2)]),
      n('heavy_judgment', 'Heavy Judgment', '35% more damage at 20% more mana cost.', [mod('damage', 'more', 0.35), mod('manaCost', 'more', 0.2)])],
    [n('shattering_verdict', 'Shattering Verdict', 'Ignore 15% of enemy armor.', [mod('armorPen', 'flat', 0.15)]),
      n('punishing_verdict', 'Punishing Verdict', '35% more damage against stunned enemies.', [mod('damage', 'more', 0.35, ['vs:stun'])]),
      n('final_verdict', 'Final Verdict', 'Cull enemies below 10% life.', [mod('cullThreshold', 'flat', 0.1)])],
  ], n('judgments_weight', 'Judgment\'s Weight', '15% increased damage.', [mod('damage', 'increased', 0.15)])),

  aegis_ward: tree([
    buff(n('thornbound_aegis', 'Thornbound Aegis', 'The ward also grants an 8-second blessing of 24 thorns to you and allies it reaches.'), 'aegis_thorns', { duration: 8, mods: [mod('thorns', 'flat', 24)] }),
    [n('layered_aegis', 'Layered Aegis', '35% increased absorb power.', [mod('absorbPower', 'increased', 0.35)]),
      buff(n('reflected_violence', 'Reflected Violence', 'While blessed, reflect an additional 8% of incoming hit damage as thorns.'), 'aegis_thorns', { mods: [mod('thornsReflect', 'flat', 0.08)] }),
      buff(n('barbed_hits', 'Barbed Hits', 'While blessed, add 30% of thorns as physical on-hit damage.'), 'aegis_thorns', { mods: [mod('thornsToHit', 'flat', 0.3)] })],
    [n('wide_aegis', 'Wide Aegis', '30% increased area radius and 20% increased effect duration.', [mod('aoeRadius', 'increased', 0.3), mod('effectDuration', 'increased', 0.2)]),
      buff(n('iron_thorns', 'Iron Thorns', 'While blessed, gain 60 armor.'), 'aegis_thorns', { mods: [mod('armor', 'flat', 60)] }),
      n('renewed_aegis', 'Renewed Aegis', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    buff(n('sustaining_aegis', 'Sustaining Aegis', 'The ward also grants an 8-second blessing that regenerates 3 life per second to you and allies it reaches.'), 'aegis_vigil', { duration: 8, mods: [mod('lifeRegen', 'flat', 3)] }),
    [n('deep_reserve', 'Deep Reserve', '45% increased absorb power.', [mod('absorbPower', 'increased', 0.45)]),
      buff(n('quiet_refuge', 'Quiet Refuge', 'While blessed, take 10% less damage.'), 'aegis_vigil', { mods: [mod('damageTaken', 'more', -0.1)] }),
      buff(n('hastened_recovery', 'Hastened Recovery', 'While blessed, regenerate an additional 3 life per second.'), 'aegis_vigil', { mods: [mod('lifeRegen', 'flat', 3)] })],
    [n('long_vigil', 'Long Vigil', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('frequent_vigil', 'Frequent Vigil', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      buff(n('walking_refuge', 'Walking Refuge', 'While blessed, gain 20% increased movement speed.'), 'aegis_vigil', { mods: [mod('moveSpeed', 'increased', 0.2)] })],
  ], n('ward_practice', 'Ward Practice', '15% increased absorb power.', [mod('absorbPower', 'increased', 0.15)])),

  rallying_howl: tree([
    buff(n('vanguard_howl', 'Vanguard Howl', 'Your rally also blesses you and reached allies with 6 seconds of 15% less damage taken. This extra protection ends after a landed hit against its bearer.'), 'rally_vanguard', { duration: 6, clearOnHit: true, mods: [mod('damageTaken', 'more', -0.15)] }),
    [buff(n('iron_chorus', 'Iron Chorus', 'The extra blessing grants 60 armor.'), 'rally_vanguard', { mods: [mod('armor', 'flat', 60)] }),
      buff(n('guarded_chorus', 'Guarded Chorus', 'The extra blessing grants 8% block chance.'), 'rally_vanguard', { mods: [mod('blockChance', 'flat', 0.08)] }),
      buff(n('fleet_chorus', 'Fleet Chorus', 'The extra blessing grants 25% increased movement speed.'), 'rally_vanguard', { mods: [mod('moveSpeed', 'increased', 0.25)] })],
    [n('broad_chorus', 'Broad Chorus', '30% increased area radius and 20% increased duration.', [mod('aoeRadius', 'increased', 0.3), mod('effectDuration', 'increased', 0.2)]),
      n('returning_chorus', 'Returning Chorus', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      buff(n('mending_chorus', 'Mending Chorus', 'The extra blessing regenerates 3 life per second.'), 'rally_vanguard', { mods: [mod('lifeRegen', 'flat', 3)] })],
  ], [
    buff(n('decisive_howl', 'Decisive Howl', 'Your rally also prepares you and reached allies for 6 seconds: each bearer\'s next landed attack hit deals 30% more damage, then spends its own preparation. The ordinary rally remains.'), 'rally_preparation', { duration: 6, consumeOn: { on: 'hit', tags: ['attack'] }, mods: [mod('damage', 'more', 0.3, ['attack'])] }),
    [buff(n('certain_chorus', 'Certain Chorus', 'Prepared bearers gain 30% increased accuracy and 10% attack critical chance.'), 'rally_preparation', { mods: [mod('accuracy', 'increased', 0.3), mod('critChance', 'flat', 0.1, ['attack'])] }),
      buff(n('crushing_chorus', 'Crushing Chorus', 'Prepared attack hits gain 30% chance to stun.'), 'rally_preparation', { mods: [mod('apply_stun', 'flat', 0.3, ['attack'])] }),
      buff(n('feeding_chorus', 'Feeding Chorus', 'Prepared attacks leech 8% of hit damage as life.'), 'rally_preparation', { mods: [mod('lifeLeech', 'flat', 0.08, ['attack'])] })],
    [n('frequent_calls', 'Frequent Calls', '35% increased cooldown recovery and 20% reduced mana cost.', [mod('cooldownRecovery', 'increased', 0.35), mod('manaCost', 'increased', -0.2)]),
      buff(n('finishing_chorus', 'Finishing Chorus', 'Prepared attacks cull enemies below 8% life.'), 'rally_preparation', { mods: [mod('cullThreshold', 'flat', 0.08, ['attack'])] }),
      n('patient_chorus', 'Patient Chorus', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)])],
  ], n('rally_practice', 'Rally Practice', '15% increased effect duration.', [mod('effectDuration', 'increased', 0.15)])),
};
