import type { SkillTreeSpec } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, life, damage, cap, count, haste, speed, size, body, aura, type Node } from './skillTreeBuilder';
const graft = (node: Node, support: string): Node => ({ ...node, graft: { support, level: 1 } });

/** Sacraments compose corpse consumption, channels, ailments and payment wards.
 * Only the trunk choices exclude; all descendants remain additive. */
export const NECROMANCER_SACRAMENTS: Record<string, SkillTreeSpec> = {
  corpse_explosion: tree([
    n('funeral_pyre', 'Funeral Pyre', 'The detonation leaves an 80-radius fire field for 2.5 seconds, striking every half-second for 40% skill damage without the corpse-life bonus. 20% less damage.', [mod('lingerField', 'flat', 2.5), mod('damage', 'more', -0.2)]),
    [n('spreading_ashes', 'Spreading Ashes', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('long_cremation', 'Long Cremation', 'Fire fields linger for 2 additional seconds.', [mod('lingerField', 'flat', 2)]),
      n('mass_cremation', 'Mass Cremation', 'Consume up to two additional corpses into one greater blast; 15% less cast speed.', [mod('corpseBatch', 'flat', 2), mod('castSpeed', 'more', -0.15)])],
    [n('hungry_flame', 'Hungry Flame', 'Hits gain 35% additional chance to burn and 30% increased fire ailment magnitude.', [mod('apply_burn', 'flat', 0.35), mod('statusMagnitude', 'increased', 0.3, ['fire'])]),
      n('ashen_lineage', 'Ashen Lineage', 'Burns spread to nearby enemies when their victim dies.', [mod('dotPropagates', 'override', 1)]),
      n('cremation_bell', 'Cremation Bell', 'Burns rupture on death or expiry for 30% of their stored total damage as a fire explosion.', [mod('dotRupture', 'flat', 0.3)])],
  ], [
    n('living_offerings', 'Living Offerings', 'When no corpse is available, sacrifice one of your minions to fuel the blast. This is a true death, triggering its death effects.', [mod('sacrificeMinions', 'override', 1)]),
    [n('ritual_pace', 'Ritual Pace', '30% increased cooldown recovery and 15% increased cast speed.', [mod('cooldownRecovery', 'increased', 0.3), mod('castSpeed', 'increased', 0.15)]),
      graft(n('crawling_remains', 'Crawling Remains', 'Each corpse consumed raises a crawler for 12 seconds, up to six. Crawlers inherit your global minion life and damage.'), 'hiveborn'),
      n('heaped_offerings', 'Heaped Offerings', 'Consume up to two additional bodies per blast. If corpses run short, the rite can sacrifice minions to complete the offering.', [mod('corpseBatch', 'flat', 2)])],
    [n('blood_return', 'Blood Return', 'Leech 5% of blast hit damage as life.', [mod('lifeLeech', 'flat', 0.05)]),
      n('ritual_repayment', 'Ritual Repayment', 'Restore 3 life for every enemy hit by the blast.', [mod('lifeOnHit', 'flat', 3)]),
      n('last_offering', 'Last Offering', 'Cull enemies below 8% life; blast hits gain 30 knockback strength.', [mod('cullThreshold', 'flat', 0.08), mod('knockback', 'flat', 30)])],
  ], n('mortuary_practice', 'Mortuary Practice', '15% increased damage.', [mod('damage', 'increased', 0.15)])),

  spirit_pyre: tree([
    n('running_wildfire', 'Running Wildfire', 'Channel pairs of fire-biting skulls lasting 3 seconds, sharing the 20-spirit pool. Channel movement rises to full walking speed over 3 seconds. Newborn damage ramps linearly to 50% more; 20% less minion damage and 25% more mana cost.', [mod('minionDamage', 'more', -0.2), mod('manaCost', 'more', 0.25)], { summon: { monsterId: 'court_ember', count: 2, maxActive: 20, duration: 3 }, channel: { ramp: { per: 0.2, max: 0.5 }, rampMove: { per: 0.15, max: 0.45 } } }),
    [n('restless_kindling', 'Restless Kindling', 'Skulls move 30% faster and act 20% faster.', [speed(0.3), haste(0.2)]),
      n('scattered_embers', 'Scattered Embers', 'One additional skull per pulse and four additional spirit slots; 15% less minion damage.', [count(1), cap(4), mod('minionDamage', 'more', -0.15)]),
      n('fleet_ritual', 'Fleet Ritual', 'Gain 20 percentage points of channel movement and 15% reduced mana cost.', [mod('channelMobility', 'flat', 0.2), mod('manaCost', 'increased', -0.15)])],
    [n('burning_bites', 'Burning Bites', 'Skulls gain 40% chance to burn on hit.', undefined, body(mod('apply_burn', 'flat', 0.4))),
      n('wildfire_inheritance', 'Wildfire Inheritance', 'Skull burns spread when their victim dies and gain 30% increased magnitude.', undefined, body(mod('dotPropagates', 'override', 1), mod('statusMagnitude', 'increased', 0.3, ['fire']))),
      n('brief_inferno', 'Brief Inferno', 'Expiry counts as death; skulls explode on true death for 45% of their maximum life as fire damage.', [mod('minionExpiryIsDeath', 'flat', 1), mod('minionExplodeDeath', 'flat', 0.45)])],
  ], [
    n('banked_pyre', 'Banked Pyre', 'Channel larger fire-biting skulls one at a time, up to eight in the shared spirit pool, lasting 6 seconds. 50% increased life and size. Channel movement dwindles to rooted over 3 seconds; newborn damage ramps quadratically to triple strength. Each mana actually paid grants 2 absorb for 3 seconds, capped at 30% maximum life; strongest shield wins.', [life(0.5), size(0.5), mod('costWard_mana', 'flat', 2)], { summon: { monsterId: 'court_ember', count: 1, maxActive: 8, duration: 6 }, channel: { ramp: { per: 0.25, max: 2, curve: 'quadratic' }, rampMove: { per: -0.55 / 3, max: 0 } } }),
    [n('deep_coals', 'Deep Coals', '40% increased minion life and 20% increased minion damage.', [life(0.4), damage(0.2)]),
      n('furnace_hearts', 'Furnace Hearts', 'Expiry counts as death; skulls explode for 70% of maximum life as fire damage on true death.', [mod('minionExpiryIsDeath', 'flat', 1), mod('minionExplodeDeath', 'flat', 0.7)]),
      n('cinder_crowns', 'Cinder Crowns', 'Each skull bears an 80-radius fire halo dealing 3 base fire damage per second through its own minion scaling.', undefined, aura('court_ember_halo'))],
    [n('sheltered_flame', 'Sheltered Flame', 'Each mana paid grants 2 additional absorb; payment shields last 2 additional seconds.', [mod('costWard_mana', 'flat', 2), mod('costWardDuration', 'flat', 2)]),
      n('patient_furnace', 'Patient Furnace', '40% increased effect duration, extending skull lifespans and payment shields.', [mod('effectDuration', 'increased', 0.4)]),
      n('stoked_devotion', 'Stoked Devotion', '30% increased minion damage and 50% more mana cost. Larger actual payments also strengthen the payment shield.', [damage(0.3), mod('manaCost', 'more', 0.5)])],
  ], n('pyre_tending', 'Pyre Tending', '15% increased minion damage.', [damage(0.15)])),

  sanguine_burst: tree([
    n('hemorrhagic_rite', 'Hemorrhagic Rite', 'Burst hits gain 50% additional chance to bleed. Its bleeds spread to nearby enemies when their victim dies.', [mod('apply_bleed', 'flat', 0.5), mod('dotPropagates', 'override', 1)]),
    [n('deep_veins', 'Deep Veins', '35% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.35, ['physical'])]),
      n('layered_hemorrhage', 'Layered Hemorrhage', 'Apply two additional bleed stacks per enemy.', [mod('ailmentStacks', 'flat', 2, ['physical'])]),
      n('bursting_veins', 'Bursting Veins', 'Bleeds rupture on death or expiry for 40% of stored total damage as a physical explosion.', [mod('dotRupture', 'flat', 0.4)])],
    [n('red_circulation', 'Red Circulation', 'Recover life equal to 4% of damage dealt by this skill\'s bleeds.', [mod('dotLeech_bleed', 'flat', 0.04)]),
      n('hungry_pulse', 'Hungry Pulse', 'Blast hits leech 6% of their damage as life.', [mod('lifeLeech', 'flat', 0.06)]),
      n('widened_arteries', 'Widened Arteries', '30% increased area radius and 20% increased cooldown recovery.', [mod('aoeRadius', 'increased', 0.3), mod('cooldownRecovery', 'increased', 0.2)])],
  ], [
    n('crimson_carapace', 'Crimson Carapace', 'Each life actually paid grants 1.5 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins; repeated payments refresh rather than add pools. 15% less damage.', [mod('costWard_life', 'flat', 1.5), mod('damage', 'more', -0.15)]),
    [n('clotted_layers', 'Clotted Layers', 'Each life paid grants 0.75 additional absorb.', [mod('costWard_life', 'flat', 0.75)]),
      n('thick_carapace', 'Thick Carapace', 'Payment shields can reach 45% of maximum life instead of 30%; each life paid grants 0.75 additional absorb.', [mod('costWardCap', 'flat', 0.15), mod('costWard_life', 'flat', 0.75)]),
      n('slow_coagulation', 'Slow Coagulation', 'Payment shields last 3 additional seconds.', [mod('costWardDuration', 'flat', 3)])],
    [n('repelling_pulse', 'Repelling Pulse', 'Burst hits gain 40 knockback strength and 20% increased area radius.', [mod('knockback', 'flat', 40), mod('aoeRadius', 'increased', 0.2)]),
      n('renewal_pulse', 'Renewal Pulse', '40% increased cooldown recovery; restore 2 life per enemy hit.', [mod('cooldownRecovery', 'increased', 0.4), mod('lifeOnHit', 'flat', 2)]),
      n('blood_fortification', 'Blood Fortification', 'Pay 8 additional life per cast, adding to both damage and shielding. Gain 20% increased damage.', [mod('addedLifeCost', 'flat', 8), mod('damage', 'increased', 0.2)])],
  ], n('blood_discipline', 'Blood Discipline', '15% increased damage.', [mod('damage', 'increased', 0.15)])),
};
