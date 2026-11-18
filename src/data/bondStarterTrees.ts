import { GOAD_TREE } from './goadTree';
import { TAME_BEAST_TREE } from './tameBeastTree';
import type { SkillTreeSpec, TreeBuffPatch } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, body, type Node } from './skillTreeBuilder';

const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });

/** Native bonds, hostile suggestions and owner-driven doubles. No claim is a
 * summon, no maddened enemy becomes an ally, and echoes still require a use. */
export const BOND_STARTER_TREES: Record<string, SkillTreeSpec> = {
  goad: GOAD_TREE,

  tame_beast: TAME_BEAST_TREE,

  stalk: tree([
    buff(n('sheltered_stalk', 'Sheltered Stalk', 'While stalking, take 20% less damage and regenerate 3 life per second.'), 'stalk', { mods: [mod('damageTaken', 'more', -0.2), mod('lifeRegen', 'flat', 3)] }),
    [buff(n('fleet_stalk', 'Fleet Stalk', 'While stalking, gain 28% increased movement speed.'), 'stalk', { mods: [mod('moveSpeed', 'increased', 0.28)] }),
      buff(n('hidden_stalk', 'Hidden Stalk', 'While stalking, gain 20% less detectability.'), 'stalk', { mods: [mod('detectability', 'more', -0.2)] }),
      buff(n('soft_stalk', 'Soft Stalk', 'While stalking, generate 25% less threat.'), 'stalk', { mods: [mod('threatGen', 'more', -0.25)] })],
    [n('long_stalk', 'Long Stalk', '40% increased stalk duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('cheap_stalk', 'Measured Stalk', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('ready_stalk', 'Returning Stalk', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    buff(n('hunters_opening', 'Hunter\'s Opening', 'Empowers your next attack hit within 6 seconds to deal 40% more damage.'), 'hunters_opening', { duration: 6, consumeOn: { on: 'hit', tags: ['attack'] }, mods: [mod('damage', 'more', 0.4, ['attack'])] }),
    [buff(n('hunters_sight', 'Hunter\'s Sight', 'Empowered attacks gain 50% increased accuracy.'), 'hunters_opening', { mods: [mod('accuracy', 'increased', 0.5, ['attack'])] }),
      buff(n('hunters_barb', 'Hunter\'s Barb', 'Empowered attacks gain +50% chance to inflict bleed.'), 'hunters_opening', { mods: [mod('apply_bleed', 'flat', 0.5, ['attack'])] }),
      buff(n('hunters_hunger', 'Hunter\'s Hunger', 'Empowered attacks leech 10% of hit damage as life.'), 'hunters_opening', { mods: [mod('lifeLeech', 'flat', 0.1, ['attack'])] })],
    [n('patient_opening', 'Patient Opening', '40% increased stalk and buff duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('renewed_opening', 'Renewed Opening', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      buff(n('piercing_opening', 'Piercing Opening', 'Empowered attacks ignore 20% of enemy armor.'), 'hunters_opening', { mods: [mod('armorPen', 'flat', 0.2, ['attack'])] })],
  ], n('stalk_practice', 'Practiced Hush', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),

  decoy: tree([
    n('patient_double', 'Patient Double', '70% more decoy duration, but 20% less cooldown recovery.', [mod('effectDuration', 'more', 0.7), mod('cooldownRecovery', 'more', -0.2)]),
    [n('lingering_double', 'Lingering Double', '40% increased decoy duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('frugal_double', 'Frugal Double', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('renewed_double', 'Renewed Double', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
    [buff(n('quiet_departure', 'Quiet Departure', 'Grants 30% less detectability for 4 seconds.'), 'quiet_departure', { duration: 4, mods: [mod('detectability', 'more', -0.3)] }),
      buff(n('soft_departure', 'Soft Departure', 'While active, generate 30% less threat.'), 'quiet_departure', { mods: [mod('threatGen', 'more', -0.3)] }),
      buff(n('fleet_departure', 'Fleet Departure', 'While active, gain 25% increased movement speed.'), 'quiet_departure', { mods: [mod('moveSpeed', 'increased', 0.25)] })],
  ], [
    buff(n('sheltered_departure', 'Sheltered Departure', 'Grants 25% less damage taken for 3 seconds.', undefined, { tags: { add: ['buff'] } }), 'sheltered_departure', { duration: 3, mods: [mod('damageTaken', 'more', -0.25)] }),
    [buff(n('mending_departure', 'Mending Departure', 'While active, regenerate 4 life per second.'), 'sheltered_departure', { mods: [mod('lifeRegen', 'flat', 4)] }),
      buff(n('evasive_departure', 'Evasive Departure', 'While active, gain 60% increased evasion.'), 'sheltered_departure', { mods: [mod('evasion', 'increased', 0.6)] }),
      buff(n('running_departure', 'Running Departure', 'While active, gain 25% increased movement speed.'), 'sheltered_departure', { mods: [mod('moveSpeed', 'increased', 0.25)] })],
    [n('ready_departure', 'Ready Departure', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_departure', 'Measured Departure', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('lasting_departure', 'Lasting Departure', '40% increased decoy and buff duration.', [mod('effectDuration', 'increased', 0.4)])],
  ], n('decoy_practice', 'Practiced Double', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),

  shadow_clone: tree([
    n('weighty_shadow', 'Weighty Shadow', 'Clones deal 60% more mirage damage, but have 25% less replay rate.', [mod('mirageDamage', 'more', 0.6), mod('constructCastRate', 'more', -0.25)]),
    [n('lasting_shadow', 'Lasting Shadow', '40% increased clone duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('sturdy_shadow', 'Sturdy Shadow', '50% increased clone life.', [mod('minionLife', 'increased', 0.5)]),
      n('deep_shadow', 'Deep Shadow', '40% increased mirage damage.', [mod('mirageDamage', 'increased', 0.4)])],
    [n('ready_shadow', 'Ready Shadow', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_shadow', 'Measured Shadow', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('quick_shadow', 'Sudden Shadow', '30% increased cast speed.', [mod('castSpeed', 'increased', 0.3)])],
  ], [
    n('eager_shadow', 'Eager Shadow', 'Clones have 70% more replay rate, but deal 20% less mirage damage.', [mod('constructCastRate', 'more', 0.7), mod('mirageDamage', 'more', -0.2)]),
    [n('keen_shadow', 'Keen Shadow', '30% increased clone replay rate.', [mod('constructCastRate', 'increased', 0.3)]),
      n('enduring_shadow', 'Enduring Shadow', '40% increased clone duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('solid_shadow', 'Solid Shadow', '50% increased clone life.', [mod('minionLife', 'increased', 0.5)])],
    [n('clear_shadow', 'Clear Shadow', '40% increased mirage damage.', [mod('mirageDamage', 'increased', 0.4)]),
      n('returning_shadow', 'Returning Shadow', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('light_shadow', 'Light Shadow', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], n('shadow_practice', 'Practiced Shadow', '15% increased mirage damage.', [mod('mirageDamage', 'increased', 0.15)])),

  beguile: tree([
    n('certain_confusion', 'Certain Confusion', '+60% status chance, but deals 20% less hit damage.', [mod('statusChance', 'flat', 0.6), mod('damage', 'more', -0.2)]),
    [n('lasting_confusion', 'Lasting Confusion', '40% increased madness and befuddlement duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('violent_confusion', 'Violent Confusion', 'Hits also inflict Reeling.', [mod('apply_reeling', 'flat', 1)]),
      n('quick_confusion', 'Quick Confusion', '30% increased cast speed.', [mod('castSpeed', 'increased', 0.3)])],
    [n('ready_confusion', 'Ready Confusion', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_confusion', 'Measured Confusion', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('swift_confusion', 'Swift Confusion', '40% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.4)])],
  ], [
    n('spreading_rumor', 'Spreading Rumor', 'Pierces 2 additional enemies, but deals 20% less hit damage.', [mod('pierceCount', 'flat', 2), mod('damage', 'more', -0.2)]),
    [n('broad_rumor', 'Broad Rumor', '60% increased projectile size.', [mod('projectileSize', 'increased', 0.6)]),
      n('swift_rumor', 'Swift Rumor', '40% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.4)]),
      n('lasting_rumor', 'Lasting Rumor', '40% increased madness and befuddlement duration.', [mod('effectDuration', 'increased', 0.4)])],
    [n('violent_rumor', 'Violent Rumor', 'Hits also inflict Reeling.', [mod('apply_reeling', 'flat', 1)]),
      n('cheap_rumor', 'Measured Rumor', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('ready_rumor', 'Returning Rumor', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], n('beguile_practice', 'Practiced Suggestion', '12% increased effect duration.', [mod('effectDuration', 'increased', 0.12)])),

  cast_falcon: tree([
    n('paired_hunt', 'Paired Hunt', 'Summons up to 2 falcons, reserving 9 mana per falcon, but each deals 25% less damage.', [mod('minionDamage', 'more', -0.25)], { summon: { count: 2, maxActive: 2 } }),
    [n('swift_wings', 'Swift Wings', '35% increased falcon movement speed.', [mod('minionMoveSpeed', 'increased', 0.35)]),
      n('keen_talons', 'Keen Talons', '30% increased falcon action speed.', [mod('minionHaste', 'increased', 0.3)]),
      n('deep_talons', 'Deep Talons', '40% increased falcon damage.', [mod('minionDamage', 'increased', 0.4)])],
    [n('hardy_wings', 'Hardy Wings', '50% increased falcon life.', [mod('minionLife', 'increased', 0.5)]),
      n('mending_wings', 'Mending Wings', 'Falcons regenerate 2% of maximum life per second.', [mod('minionRegenPct', 'flat', 0.02)]),
      n('sheltered_wings', 'Sheltered Wings', 'Falcons take 20% less damage.', [mod('minionDamageTaken', 'more', -0.2)])],
  ], [
    n('watchful_hunt', 'Watchful Hunt', 'Limited to 1 falcon. The falcon takes 30% less damage and gains 30% increased movement speed, but deals 20% less damage.', [mod('minionDamageTaken', 'more', -0.3), mod('minionMoveSpeed', 'increased', 0.3), mod('minionDamage', 'more', -0.2)], { summon: { count: 1, maxActive: 1 } }),
    [n('watchful_vigor', 'Watchful Vigor', '60% increased falcon life.', [mod('minionLife', 'increased', 0.6)]),
      n('watchful_mending', 'Watchful Mending', 'The falcon regenerates 3% of maximum life per second.', [mod('minionRegenPct', 'flat', 0.03)]),
      n('watchful_armor', 'Watchful Armor', 'The falcon gains +40 armor.', undefined, body(mod('armor', 'flat', 40)))],
    [n('watchful_talons', 'Watchful Talons', '40% increased falcon damage.', [mod('minionDamage', 'increased', 0.4)]),
      n('watchful_haste', 'Watchful Haste', '30% increased falcon action speed.', [mod('minionHaste', 'increased', 0.3)]),
      n('watchful_sight', 'Watchful Sight', 'The falcon gains 50% increased accuracy.', undefined, body(mod('accuracy', 'increased', 0.5)))],
  ], n('falcon_practice', 'Practiced Falconry', '15% increased falcon life.', [mod('minionLife', 'increased', 0.15)])),

  expose_weakness: tree([
    n('crippling_mark', 'Crippling Mark', 'Hits also chill the target, but deal 20% less hit damage.', [mod('apply_chill', 'flat', 1), mod('damage', 'more', -0.2)]),
    [n('lasting_mark', 'Lasting Mark', '40% increased mark and chill duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('heavy_mark', 'Heavy Mark', 'Hits also inflict vulnerability.', [mod('apply_vulnerable', 'flat', 1)]),
      n('ready_mark', 'Returning Mark', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
    [n('frugal_mark', 'Frugal Mark', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('draining_mark', 'Draining Mark', 'Gain 4 life on hit.', [mod('lifeOnHit', 'flat', 4)]),
      n('staggering_mark', 'Staggering Mark', 'Hits also inflict Reeling.', [mod('apply_reeling', 'flat', 1)])],
  ], [
    buff(n('hunters_signal', 'Hunter\'s Signal', 'Grants your minions 30% increased damage for 5 seconds when cast.', undefined, { tags: { add: ['buff'] } }), 'hunters_signal', { affects: 'minions', duration: 5, mods: [mod('damage', 'increased', 0.3)] }),
    [buff(n('keen_signal', 'Keen Signal', 'Affected minions gain 40% increased accuracy.'), 'hunters_signal', { mods: [mod('accuracy', 'increased', 0.4)] }),
      buff(n('rushing_signal', 'Rushing Signal', 'Affected minions gain 25% increased movement speed.'), 'hunters_signal', { mods: [mod('moveSpeed', 'increased', 0.25)] }),
      buff(n('quick_signal', 'Quick Signal', 'Affected minions gain 20% increased attack speed.'), 'hunters_signal', { mods: [mod('attackSpeed', 'increased', 0.2)] })],
    [n('lasting_signal', 'Lasting Signal', '40% increased mark and buff duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_signal', 'Returning Signal', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_signal', 'Measured Signal', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], n('expose_practice', 'Practiced Mark', '12% increased effect duration.', [mod('effectDuration', 'increased', 0.12)])),

  cloudstep: tree([
    buff(n('cloud_shelter', 'Cloud Shelter', 'Grants 25% less damage taken for 3 seconds.', undefined, { tags: { add: ['buff', 'duration'] } }), 'cloud_shelter', { duration: 3, mods: [mod('damageTaken', 'more', -0.25)] }),
    [buff(n('cloud_stride', 'Cloud Stride', 'While active, gain 25% increased movement speed.'), 'cloud_shelter', { mods: [mod('moveSpeed', 'increased', 0.25)] }),
      buff(n('cloud_mending', 'Cloud Mending', 'While active, regenerate 4 life per second.'), 'cloud_shelter', { mods: [mod('lifeRegen', 'flat', 4)] }),
      buff(n('cloud_evasion', 'Cloud Evasion', 'While active, gain 60% increased evasion.'), 'cloud_shelter', { mods: [mod('evasion', 'increased', 0.6)] })],
    [n('cloud_patience', 'Cloud Patience', '50% increased decoy and buff duration.', [mod('effectDuration', 'increased', 0.5)]),
      n('cloud_return', 'Cloud Return', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cloud_ease', 'Cloud Ease', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    buff(n('cloud_ambush', 'Cloud Ambush', 'Empowers your next projectile attack hit within 5 seconds to deal 40% more damage.', undefined, { tags: { add: ['buff', 'duration'] } }), 'cloud_ambush', { duration: 5, consumeOn: { on: 'hit', tags: ['attack', 'projectile'] }, mods: [mod('damage', 'more', 0.4, ['attack', 'projectile'])] }),
    [buff(n('cloud_sight', 'Cloud Sight', 'Empowered projectile attacks gain 50% increased accuracy.'), 'cloud_ambush', { mods: [mod('accuracy', 'increased', 0.5, ['attack', 'projectile'])] }),
      buff(n('cloud_piercing', 'Cloud Piercing', 'Empowered projectile attacks ignore 20% of enemy armor.'), 'cloud_ambush', { mods: [mod('armorPen', 'flat', 0.2, ['attack', 'projectile'])] }),
      buff(n('cloud_hunger', 'Cloud Hunger', 'Empowered projectile attacks leech 10% of hit damage as life.'), 'cloud_ambush', { mods: [mod('lifeLeech', 'flat', 0.1, ['attack', 'projectile'])] })],
    [n('cloud_interval', 'Cloud Interval', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cloud_supply', 'Cloud Supply', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('cloud_wait', 'Cloud Wait', '50% increased decoy and buff duration.', [mod('effectDuration', 'increased', 0.5)])],
  ], n('cloud_practice', 'Practiced Cloudstep', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),
};
