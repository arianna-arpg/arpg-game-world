import type { SkillTreeSpec, TreeBuffPatch } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, body, life, damage, haste, speed, dr, type Node } from './skillTreeBuilder';
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });

/** Summoner, Juggernaut and Pyromancer: one companion, deliberate Fury
 * economies, and fire that rewards arranging the battlefield. */
export const PACT_STEEL_STARTER_TREES: Record<string, SkillTreeSpec> = {
  ruin: tree([
    buff(n('pact_signal', 'Pact Signal', 'Casting prepares each owned minion for 3 base seconds: its next landed spell hit deals 35% more damage. Ruin deals 15% less damage.', [mod('damage', 'more', -0.15)], { tags: { add: ['buff', 'duration'] } }), 'pact_signal', { duration: 3, affects: 'minions', consumeOn: { on: 'hit', tags: ['spell'] }, mods: [mod('damage', 'more', 0.35, ['spell'])] }),
    [buff(n('clear_signal', 'Clear Signal', 'Prepared minions gain 12% spell critical chance.'), 'pact_signal', { mods: [mod('critChance', 'flat', 0.12, ['spell'])] }),
      buff(n('hungry_signal', 'Hungry Signal', 'Prepared spells leech 8% of hit damage to the minion.'), 'pact_signal', { mods: [mod('lifeLeech', 'flat', 0.08, ['spell'])] }),
      buff(n('piercing_signal', 'Piercing Signal', 'Prepared spells penetrate 15% chaos resistance.'), 'pact_signal', { mods: [mod('chaosPen', 'flat', 0.15, ['spell'])] })],
    [n('patient_signal', 'Patient Signal', '60% increased preparation duration.', [mod('effectDuration', 'increased', 0.6)]),
      n('cheap_signal', 'Cheap Signal', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)]),
      n('swift_signal', 'Swift Signal', '25% increased cast speed and 40% increased projectile speed.', [mod('castSpeed', 'increased', 0.25), mod('projectileSpeed', 'increased', 0.4)])],
  ], [
    n('venom_seeker', 'Venom Seeker', 'Bolts home toward enemies and gain 60% chance to poison. 15% less hit damage.', [mod('homingPower', 'flat', 2), mod('apply_poison', 'flat', 0.6), mod('damage', 'more', -0.15)]),
    [n('deep_venom', 'Deep Venom', '40% increased chaos ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['chaos'])]),
      n('spreading_venom', 'Spreading Venom', 'Poisons spread when their victim dies.', [mod('dotPropagates', 'flat', 1)]),
      n('venom_sustenance', 'Venom Sustenance', 'Recover life equal to 5% of this skill\'s poison damage.', [mod('dotLeech_poison', 'flat', 0.05)])],
    [n('seeking_pair', 'Seeking Pair', 'Fire one additional bolt; 20% less damage per bolt.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2)]),
      n('through_the_pack', 'Through the Pack', 'Pierce two additional enemies.', [mod('pierceCount', 'flat', 2)]),
      n('venom_opening', 'Venom Opening', 'Deal 30% more damage against poisoned enemies.', [mod('damage', 'more', 0.3, ['vs:poison'])])],
  ], n('ruin_studies', 'Ruin Studies', '15% increased chaos damage.', [mod('damage', 'increased', 0.15, ['chaos'])])),

  bind_familiar: tree([
    n('pact_keeper', 'Pact Keeper', 'Your single familiar keeps Unmaking Bolt and learns Pact Mend, healing wounded allies. 40% increased minion life and 20% less minion damage.', [life(0.4), mod('minionDamage', 'more', -0.2)], { summon: { crewSkills: ['pact_mend'] } }),
    [n('gentle_pact', 'Gentle Pact', 'The familiar gains 40% increased healing power.', undefined, body(mod('healPower', 'increased', 0.4))),
      n('shared_pact', 'Shared Pact', 'Pact Mend chains to one further wounded ally at 75% strength.', undefined, body(mod('chainCount', 'flat', 1, ['heal']))),
      n('ready_pact', 'Ready Pact', 'The familiar gains 40% increased cooldown recovery.', undefined, body(mod('cooldownRecovery', 'increased', 0.4)))],
    [n('enduring_pact', 'Enduring Pact', 'The familiar takes 15% less damage.', [dr(0.15)]),
      n('returning_pact', 'Returning Pact', 'The familiar regenerates 4 life per second.', undefined, body(mod('lifeRegen', 'flat', 4))),
      n('close_pact', 'Close Pact', '30% increased minion movement speed and 15% increased minion action speed.', [speed(0.3), haste(0.15)])],
  ], [
    n('rift_conductor', 'Rift Conductor', 'Your single familiar replaces Unmaking Bolt with Rift Lance: a faster chaos bolt that pierces two enemies. 25% increased minion damage.', [damage(0.25)], { summon: { crewRules: [{ monsterIds: ['arcane_familiar'], replace: [{ from: 'unmaking_bolt', to: 'pact_lance' }] }] } }),
    [n('forked_rift', 'Forked Rift', 'The familiar fires one additional projectile, dealing 20% less damage per hit.', undefined, body(mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2))),
      n('seeking_rift', 'Seeking Rift', 'The familiar\'s projectiles home toward enemies.', undefined, body(mod('homingPower', 'flat', 2))),
      n('open_rift', 'Open Rift', 'The familiar penetrates 15% chaos resistance.', undefined, body(mod('chaosPen', 'flat', 0.15)))],
    [n('quick_conductor', 'Quick Conductor', '25% increased minion action speed.', [haste(0.25)]),
      n('hungry_conductor', 'Hungry Conductor', 'The familiar leeches 8% of hit damage as its own life.', undefined, body(mod('lifeLeech', 'flat', 0.08))),
      n('steady_conductor', 'Steady Conductor', '40% increased minion life and 25% increased minion movement speed.', [life(0.4), speed(0.25)])],
  ], n('familiar_studies', 'Familiar Studies', '15% increased minion damage.', [damage(0.15)])),

  essence_drain: tree([
    n('contagious_essence', 'Contagious Essence', 'Decay spreads when its victim dies. Pierce two additional enemies; 20% less hit damage.', [mod('dotPropagates', 'flat', 1), mod('pierceCount', 'flat', 2), mod('damage', 'more', -0.2)]),
    [n('deep_contagion', 'Deep Contagion', '40% increased chaos ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['chaos'])]),
      n('lingering_contagion', 'Lingering Contagion', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('feeding_contagion', 'Feeding Contagion', 'Recover life equal to 5% of this skill\'s decay damage.', [mod('dotLeech_decay', 'flat', 0.05)])],
    [n('swift_contagion', 'Swift Contagion', '70% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.7)]),
      n('paired_contagion', 'Paired Contagion', 'Fire one additional bolt; 20% less damage per bolt.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2)]),
      n('frugal_contagion', 'Frugal Contagion', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)])],
  ], [
    n('borrowed_time', 'Borrowed Time', 'Decay also banks 30% of its full damage for a chaos rupture at natural expiry. Its fuse cannot be refreshed; recover life equal to 5% of its ticking decay damage.', [mod('dotRupture', 'flat', 0.3), mod('dotLeech_decay', 'flat', 0.05)], { tags: { add: ['aoe'] } }),
    [n('heavy_debt', 'Heavy Debt', '40% increased chaos ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['chaos'])]),
      n('collected_debt', 'Collected Debt', 'Bank another 25% of full decay damage for the expiry rupture.', [mod('dotRupture', 'flat', 0.25)]),
      n('sustaining_debt', 'Sustaining Debt', 'Recover an additional 5% of ticking decay damage as life.', [mod('dotLeech_decay', 'flat', 0.05)])],
    [n('short_contract', 'Short Contract', '25% reduced effect duration brings the rupture sooner, with a smaller damage bank.', [mod('effectDuration', 'increased', -0.25)]),
      n('quick_contract', 'Quick Contract', '25% increased cast speed.', [mod('castSpeed', 'increased', 0.25)]),
      n('last_collection', 'Last Collection', 'Hits cull enemies below 10% life.', [mod('cullThreshold', 'flat', 0.1)])],
  ], n('essence_studies', 'Essence Studies', '15% increased chaos damage.', [mod('damage', 'increased', 0.15, ['chaos'])])),

  piledriver: tree([
    n('twin_foundations', 'Twin Foundations', 'Repeat the blow once after 0.22 seconds, locking you into the pair. Each blow banks 2 Fury, up to your cap; 25% less damage per blow. Pay only once.', [mod('repeatCount', 'flat', 1), mod('repeatLock', 'flat', 1), mod('damage', 'more', -0.25)]),
    [n('deep_foundations', 'Deep Foundations', 'Piledriver can bank two additional Fury.', [mod('chargeCap', 'flat', 2)]),
      n('firm_foundations', 'Firm Foundations', '40% increased accuracy.', [mod('accuracy', 'increased', 0.4)]),
      n('paid_foundations', 'Paid Foundations', 'Restore 2 life per landed hit.', [mod('lifeOnHit', 'flat', 2)])],
    [n('wide_foundations', 'Wide Foundations', '50% increased melee arc width.', [mod('swingArc', 'increased', 0.5)]),
      n('reaching_foundations', 'Reaching Foundations', '35% increased melee reach.', [mod('meleeReach', 'increased', 0.35)]),
      n('splintered_foundations', 'Splintered Foundations', 'Lodge 20% of physical hit damage as impale for later hits.', [mod('impalePower', 'flat', 0.2)])],
  ], [
    n('anchor_pile', 'Anchor Pile', 'Pull hit enemies inward with 45 force and gain 35% additional chance to stun. 15% less attack speed.', [mod('displaceForce', 'flat', -45), mod('apply_stun', 'flat', 0.35), mod('attackSpeed', 'more', -0.15)]),
    [n('long_anchor', 'Long Anchor', '40% increased melee reach.', [mod('meleeReach', 'increased', 0.4)]),
      n('broad_anchor', 'Broad Anchor', '70% increased arc width.', [mod('swingArc', 'increased', 0.7)]),
      n('buried_anchor', 'Buried Anchor', 'Pull with an additional 30 force.', [mod('displaceForce', 'flat', -30)])],
    [n('crushing_anchor', 'Crushing Anchor', '40% more poise damage.', [mod('poiseDamage', 'more', 0.4)]),
      n('held_sentence', 'Held Sentence', 'Deal 40% more damage against stunned enemies.', [mod('damage', 'more', 0.4, ['vs:stun'])]),
      n('hungry_anchor', 'Hungry Anchor', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
  ], n('pile_practice', 'Pile Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  reckoning: tree([
    n('measured_sentence', 'Measured Sentence', 'Require and spend exactly 1 Fury, granting 65% more damage for that Fury. Preserve the rest of your bank.', undefined, { chargeCost: { charge: 'fury', amount: 1, damagePerCharge: 0.65 } }),
    [n('swift_sentence', 'Swift Sentence', '45% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.45)]),
      n('clean_sentence', 'Clean Sentence', '25% increased attack speed.', [mod('attackSpeed', 'increased', 0.25)]),
      n('frugal_sentence', 'Frugal Sentence', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
    [n('cracked_sentence', 'Cracked Sentence', 'Ignore 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)]),
      n('final_sentence', 'Final Sentence', 'Cull enemies below 12% life.', [mod('cullThreshold', 'flat', 0.12)]),
      n('paid_sentence', 'Paid Sentence', 'Leech 10% of hit damage as life.', [mod('lifeLeech', 'flat', 0.1)])],
  ], [
    n('fury_cascade', 'Fury Cascade', 'Spend all available Fury: add one repeat per Fury at 0.22-second intervals, paying only once. Each blow deals 40% less damage, with 10% more damage per Fury spent. With no Fury, strike once.', [mod('damage', 'more', -0.4)], { chargeCost: { charge: 'fury', amount: 'all', optional: true, damagePerCharge: 0.1, repeatsPerCharge: 1 } }),
    [n('roaming_verdict', 'Roaming Verdict', 'Repeated blows seek a nearby enemy instead of keeping the original aim.', [mod('repeatRetarget', 'flat', 1)]),
      n('wide_verdict', 'Wide Verdict', '50% increased arc width.', [mod('swingArc', 'increased', 0.5)]),
      n('far_verdict', 'Far Verdict', '35% increased melee reach.', [mod('meleeReach', 'increased', 0.35)])],
    [n('certain_verdict', 'Certain Verdict', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('staggering_verdict', 'Staggering Verdict', 'Gain 25% additional chance to stun.', [mod('apply_stun', 'flat', 0.25)]),
      n('sustaining_verdict', 'Sustaining Verdict', 'Restore 2 life per landed hit.', [mod('lifeOnHit', 'flat', 2)])],
  ], n('reckoning_practice', 'Reckoning Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  stone_skin: tree([
    buff(n('bristling_cuirass', 'Bristling Cuirass', 'Stone Skin also grants 18 thorns and adds half your thorns to attack hits while active.'), 'stone_skin', { mods: [mod('thorns', 'flat', 18), mod('thornsToHit', 'flat', 0.5, ['attack'])] }),
    [buff(n('jagged_cuirass', 'Jagged Cuirass', 'Stone Skin grants 12 additional thorns.'), 'stone_skin', { mods: [mod('thorns', 'flat', 12)] }),
      buff(n('biting_cuirass', 'Biting Cuirass', 'While active, add another 25% of your thorns to attack hits.'), 'stone_skin', { mods: [mod('thornsToHit', 'flat', 0.25, ['attack'])] }),
      buff(n('hungry_cuirass', 'Hungry Cuirass', 'While active, attack hits leech 6% of damage as life.'), 'stone_skin', { mods: [mod('lifeLeech', 'flat', 0.06, ['attack'])] })],
    [n('lasting_cuirass', 'Lasting Cuirass', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_cuirass', 'Ready Cuirass', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      buff(n('heavy_cuirass', 'Heavy Cuirass', 'Stone Skin grants 100 additional armor.'), 'stone_skin', { mods: [mod('armor', 'flat', 100)] })],
  ], [
    buff(n('stone_legion', 'Stone Legion', 'Bless yourself and allies within 150 base radius with Stone Skin when cast. Each recipient keeps the blessing when they leave.', undefined, { tags: { add: ['aoe'] } }), 'stone_skin', { affects: 'allies', radius: 150 }),
    [n('legion_border', 'Legion Border', '40% increased blessing radius.', [mod('aoeRadius', 'increased', 0.4)]),
      buff(n('legion_stride', 'Legion Stride', 'Blessed allies gain 20% increased movement speed.'), 'stone_skin', { mods: [mod('moveSpeed', 'increased', 0.2)] }),
      buff(n('legion_breath', 'Legion Breath', 'Blessed allies regenerate 3 life per second.'), 'stone_skin', { mods: [mod('lifeRegen', 'flat', 3)] })],
    [n('legion_watch', 'Legion Watch', '35% increased effect duration.', [mod('effectDuration', 'increased', 0.35)]),
      n('legion_return', 'Legion Return', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('legion_supply', 'Legion Supply', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], n('stone_practice', 'Stone Practice', '12% increased effect duration.', [mod('effectDuration', 'increased', 0.12)])),

  flame_arrow: tree([
    n('kiln_arrow', 'Kiln Arrow', 'Arrows crossing allied elemental fields inherit their element. Crossed allied lingering fields also leave a smaller, short-lived echo where the arrow ends. 20% increased projectile speed.', [mod('conduction', 'flat', 1), mod('suffusion', 'flat', 1), mod('projectileSpeed', 'increased', 0.2)]),
    [n('quick_flight', 'Quick Flight', '50% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.5)]),
      n('piercing_kiln', 'Piercing Kiln', 'Pierce three additional enemies.', [mod('pierceCount', 'flat', 3)]),
      n('hungry_kiln', 'Hungry Kiln', 'Leech 6% of hit damage as life.', [mod('lifeLeech', 'flat', 0.06)])],
    [n('swift_kiln', 'Swift Kiln', '25% increased cast speed.', [mod('castSpeed', 'increased', 0.25)]),
      n('paired_kiln', 'Paired Kiln', 'Fire one additional arrow; 20% less damage per arrow.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2)]),
      n('frugal_kiln', 'Frugal Kiln', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)])],
  ], [
    n('ember_fan', 'Ember Fan', 'Fire two additional arrows and gain 40% additional chance to burn. 30% less hit damage per arrow.', [mod('projectileCount', 'flat', 2), mod('apply_burn', 'flat', 0.4), mod('damage', 'more', -0.3)]),
    [n('bright_embers', 'Bright Embers', '40% increased fire ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['fire'])]),
      n('wild_embers', 'Wild Embers', 'Burns spread when their victim dies.', [mod('dotPropagates', 'flat', 1)]),
      n('living_embers', 'Living Embers', 'Recover life equal to 5% of this skill\'s burn damage.', [mod('dotLeech_burn', 'flat', 0.05)])],
    [n('seeking_embers', 'Seeking Embers', 'Arrows home toward enemies.', [mod('homingPower', 'flat', 1.5)]),
      n('white_embers', 'White Embers', 'Penetrate 15% fire resistance.', [mod('firePen', 'flat', 0.15)]),
      n('ember_finish', 'Ember Finish', 'Deal 30% more damage against burning enemies.', [mod('damage', 'more', 0.3, ['vs:burn'])])],
  ], n('arrow_studies', 'Arrow Studies', '15% increased fire damage.', [mod('damage', 'increased', 0.15, ['fire'])])),

  ignite: tree([
    n('slow_pyre', 'Slow Pyre', '50% increased effect duration. Burns spread when their victim dies.', [mod('effectDuration', 'increased', 0.5), mod('dotPropagates', 'flat', 1)], { tags: { add: ['duration'] } }),
    [n('deep_pyre', 'Deep Pyre', '40% increased fire ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['fire'])]),
      n('feeding_pyre', 'Feeding Pyre', 'Recover life equal to 6% of this skill\'s burn damage.', [mod('dotLeech_burn', 'flat', 0.06)]),
      n('patient_pyre', 'Patient Pyre', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)])],
    [n('ready_pyre', 'Ready Pyre', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('frugal_pyre', 'Frugal Pyre', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('exposed_pyre', 'Exposed Pyre', 'Penetrate 15% fire resistance.', [mod('firePen', 'flat', 0.15)])],
  ], [
    n('powderheart', 'Powderheart', 'Convert all burn damage into a fire detonation at natural expiry. Burns stop ticking and their fuse cannot be refreshed; further applications add to the bank.', [mod('igniteToBomb', 'flat', 1)], { tags: { add: ['aoe', 'duration'] } }),
    [n('packed_heart', 'Packed Heart', '40% increased fire ailment magnitude enlarges the detonation bank.', [mod('statusMagnitude', 'increased', 0.4, ['fire'])]),
      n('patient_heart', 'Patient Heart', '40% increased effect duration: a longer fuse with a larger damage bank.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_heart', 'Ready Heart', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
    [n('short_fuse', 'Short Fuse', '30% reduced effect duration: a quicker detonation with a smaller damage bank.', [mod('effectDuration', 'increased', -0.3)]),
      n('loaded_fuse', 'Loaded Fuse', '30% increased fire damage.', [mod('damage', 'increased', 0.3, ['fire'])]),
      n('frugal_fuse', 'Frugal Fuse', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], n('ignite_studies', 'Ignite Studies', '15% increased fire damage.', [mod('damage', 'increased', 0.15, ['fire'])])),

  pillar_of_flame: tree([
    n('walking_kiln', 'Walking Kiln', 'After activation the closing ring centers on you and follows your movement. Retain its original delay, hollow center and filling cadence.', undefined, { ground: { follow: true } }),
    [n('wide_kiln', 'Wide Kiln', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('long_furnace', 'Long Furnace', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('white_furnace', 'White Furnace', 'Penetrate 15% fire resistance.', [mod('firePen', 'flat', 0.15)])],
    [n('kindling_kiln', 'Kindling Kiln', 'Gain 35% additional chance to burn.', [mod('apply_burn', 'flat', 0.35)]),
      n('feeding_furnace', 'Feeding Furnace', 'Recover life equal to 5% of this skill\'s burn damage.', [mod('dotLeech_burn', 'flat', 0.05)]),
      n('ready_furnace', 'Ready Furnace', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    n('triune_pyres', 'Triune Pyres', 'Place three closing rings along your aim line. Each retains its own delay and filling cadence; 40% less damage and 35% more mana cost.', [mod('aoeCascade', 'flat', 2), mod('damage', 'more', -0.4), mod('manaCost', 'more', 0.35)]),
    [n('broad_pyres', 'Broad Pyres', '25% increased area radius.', [mod('aoeRadius', 'increased', 0.25)]),
      n('lasting_pyres', 'Lasting Pyres', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('open_pyres', 'Open Pyres', 'Penetrate 15% fire resistance.', [mod('firePen', 'flat', 0.15)])],
    [n('clinging_pyres', 'Clinging Pyres', '40% increased fire ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['fire'])]),
      n('spreading_pyres', 'Spreading Pyres', 'Burns spread when their victim dies.', [mod('dotPropagates', 'flat', 1)]),
      n('returning_pyres', 'Returning Pyres', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], n('pillar_studies', 'Pillar Studies', '15% increased fire damage.', [mod('damage', 'increased', 0.15, ['fire'])])),
};
