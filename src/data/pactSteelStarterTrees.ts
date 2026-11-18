import type { SkillTreeSpec, TreeBuffPatch } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, body, life, damage, haste, speed, dr, type Node } from './skillTreeBuilder';
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });

/** Summoner, Juggernaut and Pyromancer: one companion, deliberate Fury
 * economies, and fire that rewards arranging the battlefield. */
export const PACT_STEEL_STARTER_TREES: Record<string, SkillTreeSpec> = {
  ruin: tree([
    buff(n('pact_signal', 'Pact Signal', 'Casting empowers your minions for 3 seconds, causing each minion\'s next spell hit to deal 35% more damage. Ruin deals 15% less damage.', [mod('damage', 'more', -0.15)], { tags: { add: ['buff', 'duration'] } }), 'pact_signal', { duration: 3, affects: 'minions', consumeOn: { on: 'hit', tags: ['spell'] }, mods: [mod('damage', 'more', 0.35, ['spell'])] }),
    [buff(n('clear_signal', 'Clear Signal', 'Empowered minions gain +12% spell critical chance.'), 'pact_signal', { mods: [mod('critChance', 'flat', 0.12, ['spell'])] }),
      buff(n('hungry_signal', 'Hungry Signal', 'Empowered minion spells leech 8% of hit damage as life.'), 'pact_signal', { mods: [mod('lifeLeech', 'flat', 0.08, ['spell'])] }),
      buff(n('piercing_signal', 'Piercing Signal', 'Empowered minion spells penetrate 15% chaos resistance.'), 'pact_signal', { mods: [mod('chaosPen', 'flat', 0.15, ['spell'])] })],
    [n('patient_signal', 'Patient Signal', '60% increased buff duration.', [mod('effectDuration', 'increased', 0.6)]),
      n('cheap_signal', 'Cheap Signal', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)]),
      n('swift_signal', 'Swift Signal', '25% increased cast speed and 40% increased projectile speed.', [mod('castSpeed', 'increased', 0.25), mod('projectileSpeed', 'increased', 0.4)])],
  ], [
    n('venom_seeker', 'Venom Seeker', 'Bolts curve toward nearby enemies and have a 60% chance to poison, but deal 15% less hit damage.', [mod('homingPower', 'flat', 2), mod('apply_poison', 'flat', 0.6), mod('damage', 'more', -0.15)]),
    [n('deep_venom', 'Deep Venom', '40% increased chaos ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['chaos'])]),
      n('spreading_venom', 'Spreading Venom', 'Poisons spread to nearby enemies when their victim dies.', [mod('dotPropagates', 'flat', 1)]),
      n('venom_sustenance', 'Venom Sustenance', 'Recover life equal to 5% of poison damage dealt by this skill.', [mod('dotLeech_poison', 'flat', 0.05)])],
    [n('seeking_pair', 'Seeking Pair', 'Fires 1 additional bolt, but deals 20% less damage per bolt.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2)]),
      n('through_the_pack', 'Through the Pack', 'Pierces 2 additional enemies.', [mod('pierceCount', 'flat', 2)]),
      n('venom_opening', 'Venom Opening', 'Deals 30% more damage against poisoned enemies.', [mod('damage', 'more', 0.3, ['vs:poison'])])],
  ], n('ruin_studies', 'Ruin Studies', '15% increased chaos damage.', [mod('damage', 'increased', 0.15, ['chaos'])])),

  bind_familiar: tree([
    n('pact_keeper', 'Pact Keeper', 'Your familiar learns Pact Mend to heal wounded allies and gains 40% increased minion life, but deals 20% less minion damage.', [life(0.4), mod('minionDamage', 'more', -0.2)], { summon: { crewSkills: ['pact_mend'] } }),
    [n('gentle_pact', 'Gentle Pact', 'Your familiar gains 40% increased healing power.', undefined, body(mod('healPower', 'increased', 0.4))),
      n('shared_pact', 'Shared Pact', 'Pact Mend chains to 1 additional wounded ally at 75% effectiveness.', undefined, body(mod('chainCount', 'flat', 1, ['heal']))),
      n('ready_pact', 'Ready Pact', 'Your familiar gains 40% increased cooldown recovery.', undefined, body(mod('cooldownRecovery', 'increased', 0.4)))],
    [n('enduring_pact', 'Enduring Pact', 'Your familiar takes 15% less damage.', [dr(0.15)]),
      n('returning_pact', 'Returning Pact', 'Your familiar regenerates 4 life per second.', undefined, body(mod('lifeRegen', 'flat', 4))),
      n('close_pact', 'Close Pact', '30% increased minion movement speed and 15% increased minion action speed.', [speed(0.3), haste(0.15)])],
  ], [
    n('rift_conductor', 'Rift Conductor', 'Your familiar replaces Unmaking Bolt with Rift Lance, a faster chaos bolt that pierces 2 enemies. 25% increased minion damage.', [damage(0.25)], { summon: { crewRules: [{ monsterIds: ['arcane_familiar'], replace: [{ from: 'unmaking_bolt', to: 'pact_lance' }] }] } }),
    [n('forked_rift', 'Forked Rift', 'Your familiar fires 1 additional projectile, but deals 20% less damage per hit.', undefined, body(mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2))),
      n('seeking_rift', 'Seeking Rift', 'Your familiar\'s projectiles curve toward nearby enemies.', undefined, body(mod('homingPower', 'flat', 2))),
      n('open_rift', 'Open Rift', 'Your familiar penetrates 15% chaos resistance.', undefined, body(mod('chaosPen', 'flat', 0.15)))],
    [n('quick_conductor', 'Quick Conductor', '25% increased minion action speed.', [haste(0.25)]),
      n('hungry_conductor', 'Hungry Conductor', 'Your familiar leeches 8% of hit damage as life.', undefined, body(mod('lifeLeech', 'flat', 0.08))),
      n('steady_conductor', 'Steady Conductor', '40% increased minion life and 25% increased minion movement speed.', [life(0.4), speed(0.25)])],
  ], n('familiar_studies', 'Familiar Studies', '15% increased minion damage.', [damage(0.15)])),

  essence_drain: tree([
    n('contagious_essence', 'Contagious Essence', 'Decay spreads to nearby enemies when its victim dies. Pierces 2 additional enemies, but deals 20% less hit damage.', [mod('dotPropagates', 'flat', 1), mod('pierceCount', 'flat', 2), mod('damage', 'more', -0.2)]),
    [n('deep_contagion', 'Deep Contagion', '40% increased chaos ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['chaos'])]),
      n('lingering_contagion', 'Lingering Contagion', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('feeding_contagion', 'Feeding Contagion', 'Recover life equal to 5% of decay damage dealt by this skill.', [mod('dotLeech_decay', 'flat', 0.05)])],
    [n('swift_contagion', 'Swift Contagion', '70% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.7)]),
      n('paired_contagion', 'Paired Contagion', 'Fires 1 additional bolt, but deals 20% less damage per bolt.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2)]),
      n('frugal_contagion', 'Frugal Contagion', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)])],
  ], [
    n('borrowed_time', 'Borrowed Time', 'Decay stores 30% of its total damage, erupting in a chaos burst when it expires. Decay duration cannot be refreshed. Recover life equal to 5% of decay damage dealt.', [mod('dotRupture', 'flat', 0.3), mod('dotLeech_decay', 'flat', 0.05)], { tags: { add: ['aoe'] } }),
    [n('heavy_debt', 'Heavy Debt', '40% increased chaos ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['chaos'])]),
      n('collected_debt', 'Collected Debt', 'Stores an additional 25% of total decay damage for the expiry burst.', [mod('dotRupture', 'flat', 0.25)]),
      n('sustaining_debt', 'Sustaining Debt', 'Recover life equal to an additional 5% of decay damage dealt.', [mod('dotLeech_decay', 'flat', 0.05)])],
    [n('short_contract', 'Short Contract', '25% reduced effect duration.', [mod('effectDuration', 'increased', -0.25)]),
      n('quick_contract', 'Quick Contract', '25% increased cast speed.', [mod('castSpeed', 'increased', 0.25)]),
      n('last_collection', 'Last Collection', 'Hits cull enemies below 10% life.', [mod('cullThreshold', 'flat', 0.1)])],
  ], n('essence_studies', 'Essence Studies', '15% increased chaos damage.', [mod('damage', 'increased', 0.15, ['chaos'])])),

  piledriver: tree([
    n('twin_foundations', 'Twin Foundations', 'Repeats the slam once after 0.22 seconds at no extra cost, granting 2 Fury per slam, but deals 25% less damage per hit.', [mod('repeatCount', 'flat', 1), mod('repeatLock', 'flat', 1), mod('damage', 'more', -0.25)]),
    [n('deep_foundations', 'Deep Foundations', '+2 maximum Fury.', [mod('chargeCap', 'flat', 2)]),
      n('firm_foundations', 'Firm Foundations', '40% increased accuracy.', [mod('accuracy', 'increased', 0.4)]),
      n('paid_foundations', 'Paid Foundations', 'Gain 2 life on hit.', [mod('lifeOnHit', 'flat', 2)])],
    [n('wide_foundations', 'Wide Foundations', '50% increased melee arc width.', [mod('swingArc', 'increased', 0.5)]),
      n('reaching_foundations', 'Reaching Foundations', '35% increased melee reach.', [mod('meleeReach', 'increased', 0.35)]),
      n('splintered_foundations', 'Splintered Foundations', 'Impales enemies for 20% of physical hit damage.', [mod('impalePower', 'flat', 0.2)])],
  ], [
    n('anchor_pile', 'Anchor Pile', 'Pulls hit enemies inward with 45 force and grants +35% chance to stun, but has 15% less attack speed.', [mod('displaceForce', 'flat', -45), mod('apply_stun', 'flat', 0.35), mod('attackSpeed', 'more', -0.15)]),
    [n('long_anchor', 'Long Anchor', '40% increased melee reach.', [mod('meleeReach', 'increased', 0.4)]),
      n('broad_anchor', 'Broad Anchor', '70% increased arc width.', [mod('swingArc', 'increased', 0.7)]),
      n('buried_anchor', 'Buried Anchor', 'Pulls enemies with an additional 30 force.', [mod('displaceForce', 'flat', -30)])],
    [n('crushing_anchor', 'Crushing Anchor', 'Deals 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)]),
      n('held_sentence', 'Held Sentence', 'Deals 40% more damage against stunned enemies.', [mod('damage', 'more', 0.4, ['vs:stun'])]),
      n('hungry_anchor', 'Hungry Anchor', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
  ], n('pile_practice', 'Pile Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  reckoning: tree([
    n('measured_sentence', 'Measured Sentence', 'Consumes 1 Fury to deal 65% more damage, preserving any remaining Fury.', undefined, { chargeCost: { charge: 'fury', amount: 1, damagePerCharge: 0.65 } }),
    [n('swift_sentence', 'Swift Sentence', '45% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.45)]),
      n('clean_sentence', 'Clean Sentence', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('frugal_sentence', 'Frugal Sentence', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
    [n('cracked_sentence', 'Cracked Sentence', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)]),
      n('final_sentence', 'Final Sentence', 'Culls enemies below 12% life.', [mod('cullThreshold', 'flat', 0.12)]),
      n('paid_sentence', 'Paid Sentence', 'Leech 10% of hit damage as life.', [mod('lifeLeech', 'flat', 0.1)])],
  ], [
    n('fury_cascade', 'Fury Cascade', 'Consumes all Fury to repeat the strike once per Fury spent every 0.22 seconds at no extra cost. Deals 40% less base damage, but gains 10% more damage per Fury spent.', [mod('damage', 'more', -0.4)], { chargeCost: { charge: 'fury', amount: 'all', optional: true, damagePerCharge: 0.1, repeatsPerCharge: 1 } }),
    [n('roaming_verdict', 'Roaming Verdict', 'Repeated strikes automatically target nearby enemies.', [mod('repeatRetarget', 'flat', 1)]),
      n('wide_verdict', 'Wide Verdict', '50% increased arc width.', [mod('swingArc', 'increased', 0.5)]),
      n('far_verdict', 'Far Verdict', '35% increased melee reach.', [mod('meleeReach', 'increased', 0.35)])],
    [n('certain_verdict', 'Certain Verdict', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('staggering_verdict', 'Staggering Verdict', '+25% chance to stun.', [mod('apply_stun', 'flat', 0.25)]),
      n('sustaining_verdict', 'Sustaining Verdict', 'Gain 2 life on hit.', [mod('lifeOnHit', 'flat', 2)])],
  ], n('reckoning_practice', 'Reckoning Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  stone_skin: tree([
    buff(n('bristling_cuirass', 'Bristling Cuirass', 'Also grants +18 thorns and adds 50% of your thorns as physical damage to attack hits while active.'), 'stone_skin', { mods: [mod('thorns', 'flat', 18), mod('thornsToHit', 'flat', 0.5, ['attack'])] }),
    [buff(n('jagged_cuirass', 'Jagged Cuirass', 'Grants an additional +12 thorns.'), 'stone_skin', { mods: [mod('thorns', 'flat', 12)] }),
      buff(n('biting_cuirass', 'Biting Cuirass', 'While active, add an additional 25% of your thorns to attack hits.'), 'stone_skin', { mods: [mod('thornsToHit', 'flat', 0.25, ['attack'])] }),
      buff(n('hungry_cuirass', 'Hungry Cuirass', 'While active, leech 6% of attack hit damage as life.'), 'stone_skin', { mods: [mod('lifeLeech', 'flat', 0.06, ['attack'])] })],
    [n('lasting_cuirass', 'Lasting Cuirass', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_cuirass', 'Ready Cuirass', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      buff(n('heavy_cuirass', 'Heavy Cuirass', 'Grants an additional +100 armor.'), 'stone_skin', { mods: [mod('armor', 'flat', 100)] })],
  ], [
    buff(n('stone_legion', 'Stone Legion', 'Grants Stone Skin to you and allies within 150 radius when cast.', undefined, { tags: { add: ['aoe'] } }), 'stone_skin', { affects: 'allies', radius: 150 }),
    [n('legion_border', 'Legion Border', '40% increased area radius.', [mod('aoeRadius', 'increased', 0.4)]),
      buff(n('legion_stride', 'Legion Stride', 'Affected allies gain 20% increased movement speed.'), 'stone_skin', { mods: [mod('moveSpeed', 'increased', 0.2)] }),
      buff(n('legion_breath', 'Legion Breath', 'Affected allies regenerate 3 life per second.'), 'stone_skin', { mods: [mod('lifeRegen', 'flat', 3)] })],
    [n('legion_watch', 'Legion Watch', '35% increased effect duration.', [mod('effectDuration', 'increased', 0.35)]),
      n('legion_return', 'Legion Return', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('legion_supply', 'Legion Supply', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], n('stone_practice', 'Stone Practice', '12% increased effect duration.', [mod('effectDuration', 'increased', 0.12)])),

  flame_arrow: tree([
    n('kiln_arrow', 'Kiln Arrow', 'Arrows passing through allied elemental fields inherit their element and replicate a smaller, short-lived field where the arrow ends. 20% increased projectile speed.', [mod('conduction', 'flat', 1), mod('suffusion', 'flat', 1), mod('projectileSpeed', 'increased', 0.2)]),
    [n('quick_flight', 'Quick Flight', '50% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.5)]),
      n('piercing_kiln', 'Piercing Kiln', 'Pierces 3 additional enemies.', [mod('pierceCount', 'flat', 3)]),
      n('hungry_kiln', 'Hungry Kiln', 'Leech 6% of hit damage as life.', [mod('lifeLeech', 'flat', 0.06)])],
    [n('swift_kiln', 'Swift Kiln', '25% increased cast speed.', [mod('castSpeed', 'increased', 0.25)]),
      n('paired_kiln', 'Paired Kiln', 'Fires 1 additional arrow, but deals 20% less damage per arrow.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2)]),
      n('frugal_kiln', 'Frugal Kiln', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)])],
  ], [
    n('ember_fan', 'Ember Fan', 'Fires 2 additional arrows and grants +40% chance to ignite, but deals 30% less hit damage per arrow.', [mod('projectileCount', 'flat', 2), mod('apply_burn', 'flat', 0.4), mod('damage', 'more', -0.3)]),
    [n('bright_embers', 'Bright Embers', '40% increased fire ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['fire'])]),
      n('wild_embers', 'Wild Embers', 'Ignites spread to nearby enemies when their victim dies.', [mod('dotPropagates', 'flat', 1)]),
      n('living_embers', 'Living Embers', 'Recover life equal to 5% of burn damage dealt by this skill.', [mod('dotLeech_burn', 'flat', 0.05)])],
    [n('seeking_embers', 'Seeking Embers', 'Arrows curve toward nearby enemies.', [mod('homingPower', 'flat', 1.5)]),
      n('white_embers', 'White Embers', 'Penetrates 15% fire resistance.', [mod('firePen', 'flat', 0.15)]),
      n('ember_finish', 'Ember Finish', 'Deals 30% more damage against burning enemies.', [mod('damage', 'more', 0.3, ['vs:burn'])])],
  ], n('arrow_studies', 'Arrow Studies', '15% increased fire damage.', [mod('damage', 'increased', 0.15, ['fire'])])),

  ignite: tree([
    n('slow_pyre', 'Slow Pyre', '50% increased effect duration. Ignites spread to nearby enemies when their victim dies.', [mod('effectDuration', 'increased', 0.5), mod('dotPropagates', 'flat', 1)], { tags: { add: ['duration'] } }),
    [n('deep_pyre', 'Deep Pyre', '40% increased fire ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['fire'])]),
      n('feeding_pyre', 'Feeding Pyre', 'Recover life equal to 6% of burn damage dealt by this skill.', [mod('dotLeech_burn', 'flat', 0.06)]),
      n('patient_pyre', 'Patient Pyre', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)])],
    [n('ready_pyre', 'Ready Pyre', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('frugal_pyre', 'Frugal Pyre', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('exposed_pyre', 'Exposed Pyre', 'Penetrates 15% fire resistance.', [mod('firePen', 'flat', 0.15)])],
  ], [
    n('powderheart', 'Powderheart', 'Stores all burn damage instead of dealing damage over time, erupting in a fiery detonation when the duration expires. Reapplying adds to the stored damage without refreshing the duration.', [mod('igniteToBomb', 'flat', 1)], { tags: { add: ['aoe', 'duration'] } }),
    [n('packed_heart', 'Packed Heart', '40% increased fire ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['fire'])]),
      n('patient_heart', 'Patient Heart', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_heart', 'Ready Heart', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
    [n('short_fuse', 'Short Fuse', '30% reduced effect duration.', [mod('effectDuration', 'increased', -0.3)]),
      n('loaded_fuse', 'Loaded Fuse', '30% increased fire damage.', [mod('damage', 'increased', 0.3, ['fire'])]),
      n('frugal_fuse', 'Frugal Fuse', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], n('ignite_studies', 'Ignite Studies', '15% increased fire damage.', [mod('damage', 'increased', 0.15, ['fire'])])),

  pillar_of_flame: tree([
    n('walking_kiln', 'Walking Kiln', 'The ring of flame centers on you and follows your movement.', undefined, { ground: { follow: true } }),
    [n('wide_kiln', 'Wide Kiln', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('long_furnace', 'Long Furnace', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('white_furnace', 'White Furnace', 'Penetrates 15% fire resistance.', [mod('firePen', 'flat', 0.15)])],
    [n('kindling_kiln', 'Kindling Kiln', '+35% chance to ignite.', [mod('apply_burn', 'flat', 0.35)]),
      n('feeding_furnace', 'Feeding Furnace', 'Recover life equal to 5% of burn damage dealt by this skill.', [mod('dotLeech_burn', 'flat', 0.05)]),
      n('ready_furnace', 'Ready Furnace', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    n('triune_pyres', 'Triune Pyres', 'Places 3 rings of flame in a line, but deals 40% less damage and costs 35% more mana.', [mod('aoeCascade', 'flat', 2), mod('damage', 'more', -0.4), mod('manaCost', 'more', 0.35)]),
    [n('broad_pyres', 'Broad Pyres', '25% increased area radius.', [mod('aoeRadius', 'increased', 0.25)]),
      n('lasting_pyres', 'Lasting Pyres', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('open_pyres', 'Open Pyres', 'Penetrates 15% fire resistance.', [mod('firePen', 'flat', 0.15)])],
    [n('clinging_pyres', 'Clinging Pyres', '40% increased fire ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['fire'])]),
      n('spreading_pyres', 'Spreading Pyres', 'Ignites spread to nearby enemies when their victim dies.', [mod('dotPropagates', 'flat', 1)]),
      n('returning_pyres', 'Returning Pyres', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], n('pillar_studies', 'Pillar Studies', '15% increased fire damage.', [mod('damage', 'increased', 0.15, ['fire'])])),
};
