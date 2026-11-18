import type { SkillTreeSpec, TreeBuffPatch, GroundDelivery } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const domain = (node: Node, value: NonNullable<GroundDelivery['domain']>): Node => ({ ...node, over: { ...node.over, ground: { ...node.over?.ground, domain: value } } });
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });

export const CONTROL_STARTER_TREES: Record<string, SkillTreeSpec> = {
  caltrops: tree([
    domain(n('snagging_spikes', 'Snagging Spikes', 'Enemies within the caltrops have 25% reduced movement speed.'), { enemyMods: [mod('moveSpeed', 'increased', -0.25)] }),
    [n('wide_spikes', 'Wide Spikes', '35% increased area radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('layered_spikes', 'Layered Spikes', 'Enemies can have up to 2 additional bleed stacks.', [mod('ailmentStacks', 'flat', 2, ['physical'])]),
      n('feeding_spikes', 'Feeding Spikes', 'Recover life equal to 6% of bleed damage dealt by this skill.', [mod('dotLeech_bleed', 'flat', 0.06)])],
    [n('lasting_spikes', 'Lasting Spikes', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('cheap_spikes', 'Cheap Spikes', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('ready_spikes', 'Ready Spikes', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    n('rolling_spikes', 'Rolling Spikes', 'The caltrop field follows you as you move, but deals 20% less damage.', [mod('damage', 'more', -0.2)], { ground: { follow: true } }),
    [n('broad_trail', 'Broad Trail', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('reeling_trail', 'Reeling Trail', '+25% chance to inflict Reeling.', [mod('apply_reeling', 'flat', 0.25)]),
      n('open_trail', 'Open Trail', 'Ignores 15% of enemy armor.', [mod('armorPen', 'flat', 0.15)])],
    [n('cutting_trail', 'Cutting Trail', '+35% chance to inflict bleed.', [mod('apply_bleed', 'flat', 0.35)]),
      n('deep_trail', 'Deep Trail', '40% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['physical'])]),
      n('paid_trail', 'Paid Trail', 'Gain 1 life on hit.', [mod('lifeOnHit', 'flat', 1)])],
  ], n('spike_practice', 'Spike Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  aftershock_snare: tree([
    n('sensitive_tripplate', 'Sensitive Tripplate', 'Doubles trigger radius to 110, but deals 15% less damage.', [mod('damage', 'more', -0.15)], { construct: { range: 110, castSkillId: 'snare_shock' } }),
    [n('broad_tripplate', 'Broad Tripplate', '35% increased blast and aftershock radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('stunning_tripplate', 'Stunning Tripplate', '+25% chance to stun.', [mod('apply_stun', 'flat', 0.25)]),
      n('heavy_tripplate', 'Heavy Tripplate', 'Deals 35% more poise damage.', [mod('poiseDamage', 'more', 0.35)])],
    [n('ready_tripplate', 'Ready Tripplate', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('patient_tripplate', 'Patient Tripplate', '40% increased trap duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('cheap_tripplate', 'Cheap Tripplate', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    n('splinter_snare', 'Splinter Snare', 'Instead of a blast, triggers Fan of Blades toward the enemy that sprung the trap within 80 radius.', undefined, { construct: { range: 80, castSkillId: 'fan_of_blades' }, tags: { add: ['projectile'] } }),
    [n('crowded_splinters', 'Crowded Splinters', 'Fires 2 additional blades.', [mod('projectileCount', 'flat', 2)]),
      n('piercing_splinters', 'Piercing Splinters', 'Blades pierce 2 additional enemies.', [mod('pierceCount', 'flat', 2)]),
      n('seeking_splinters', 'Seeking Splinters', 'Blades curve toward nearby enemies.', [mod('homingPower', 'flat', 1.5)])],
    [n('sharp_splinters', 'Sharp Splinters', '30% increased physical damage.', [mod('damage', 'increased', 0.3, ['physical'])]),
      n('barbed_splinters', 'Barbed Splinters', 'Hits always inflict bleed.', [mod('apply_bleed', 'flat', 1)]),
      n('open_splinters', 'Open Splinters', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)])],
  ], n('snare_practice', 'Snare Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  ballista_sentry: tree([
    n('broadside_battery', 'Broadside Battery', 'Fires 3 parallel arrows, but deals 25% less damage per arrow and costs 25% more mana.', [mod('projectileCount', 'flat', 2), mod('fireVolley', 'flat', 1), mod('damage', 'more', -0.25), mod('manaCost', 'more', 0.25)]),
    [n('wide_battery', 'Wide Battery', '50% increased projectile spacing.', [mod('volleySpacing', 'increased', 0.5)]),
      n('piercing_battery', 'Piercing Battery', 'Arrows pierce 2 additional enemies.', [mod('pierceCount', 'flat', 2)]),
      n('barbed_battery', 'Barbed Battery', 'Arrows gain +50% chance to inflict bleed.', [mod('apply_bleed', 'flat', 0.5)])],
    [n('rapid_battery', 'Rapid Battery', '30% increased ballista attack rate.', [mod('constructCastRate', 'increased', 0.3)]),
      n('lasting_battery', 'Lasting Battery', '40% increased ballista duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_battery', 'Ready Battery', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    n('siege_anchor', 'Siege Anchor', '-1 maximum active ballista. Ballistas deal 50% more damage and impale enemies for 30% of physical hit damage.', [mod('constructMaxCount', 'flat', -1), mod('damage', 'more', 0.5), mod('impalePower', 'flat', 0.3)]),
    [n('certain_anchor', 'Certain Anchor', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('open_anchor', 'Open Anchor', 'Ignores 25% of enemy armor.', [mod('armorPen', 'flat', 0.25)]),
      n('cruel_anchor', 'Cruel Anchor', '+12% critical chance.', [mod('critChance', 'flat', 0.12)])],
    [n('long_watch', 'Long Watch', '50% increased ballista duration.', [mod('effectDuration', 'increased', 0.5)]),
      n('second_anchor', 'Second Anchor', '+1 maximum active ballista.', [mod('constructMaxCount', 'flat', 1)]),
      n('swift_anchor', 'Swift Anchor', '25% increased ballista attack rate.', [mod('constructCastRate', 'increased', 0.25)])],
  ], n('ballista_practice', 'Ballista Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  war_chant: tree([
    domain(n('marching_anthem', 'Marching Anthem', 'Grants affected allies an additional 12% increased attack and cast speed, but costs 20% more mana.' , [mod('manaCost', 'more', 0.2)]), { allyMods: [mod('attackSpeed', 'increased', 0.12), mod('castSpeed', 'increased', 0.12)] }),
    [domain(n('martial_anthem', 'Martial Anthem', 'Affected allies gain 25% increased physical damage.'), { allyMods: [mod('damage', 'increased', 0.25, ['physical'])] }),
      domain(n('piercing_anthem', 'Piercing Anthem', 'Affected allies ignore 10% of enemy armor.'), { allyMods: [mod('armorPen', 'flat', 0.1)] }),
      domain(n('certain_anthem', 'Certain Anthem', 'Affected allies gain 35% increased accuracy.'), { allyMods: [mod('accuracy', 'increased', 0.35)] })],
    [n('carrying_anthem', 'Carrying Anthem', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('lasting_anthem', 'Lasting Anthem', '35% increased chant duration.', [mod('effectDuration', 'increased', 0.35)]),
      n('banked_anthem', 'Banked Anthem', '+2 maximum Verse.', [mod('chargeCap', 'flat', 2)])],
  ], [
    domain(n('sheltering_hymn', 'Sheltering Hymn', 'Affected allies take 15% less damage and regenerate 2 life per second, but the chant has 20% reduced area radius.', [mod('aoeRadius', 'increased', -0.2)]), { allyMods: [mod('damageTaken', 'more', -0.15), mod('lifeRegen', 'flat', 2)] }),
    [domain(n('mending_hymn', 'Mending Hymn', 'Affected allies regenerate an additional 2 life per second.'), { allyMods: [mod('lifeRegen', 'flat', 2)] }),
      domain(n('armored_hymn', 'Armored Hymn', 'Affected allies gain 40% increased armor.'), { allyMods: [mod('armor', 'increased', 0.4)] }),
      domain(n('marching_hymn', 'Marching Hymn', 'Affected allies gain 20% increased movement speed.'), { allyMods: [mod('moveSpeed', 'increased', 0.2)] })],
    [n('patient_hymn', 'Patient Hymn', '40% increased chant duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('frugal_hymn', 'Frugal Hymn', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('ready_hymn', 'Ready Hymn', '35% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.35)])],
  ], n('chant_practice', 'Chant Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),

  dissonance: tree([
    domain(n('grinding_dirge', 'Grinding Dirge', 'Enemies within the area have 20% reduced movement speed and take 15% more damage, but pulses deal 15% less hit damage.', [mod('damage', 'more', -0.15)]), { enemyMods: [mod('moveSpeed', 'increased', -0.2), mod('damageTaken', 'more', 0.15)] }),
    [n('wide_dirge', 'Wide Dirge', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      domain(n('dragging_dirge', 'Dragging Dirge', 'Enemies within the area have an additional 10% reduced movement speed.'), { enemyMods: [mod('moveSpeed', 'increased', -0.1)] }),
      n('confounding_dirge', 'Confounding Dirge', '+25% chance to inflict Befuddlement.', [mod('apply_befuddlement', 'flat', 0.25)])],
    [n('lasting_dirge', 'Lasting Dirge', '40% increased duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('cheap_dirge', 'Cheap Dirge', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('ready_dirge', 'Ready Dirge', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    n('withering_refrain', 'Withering Refrain', 'Pulses always poison enemies, but deal 20% less hit damage.', [mod('apply_poison', 'flat', 1), mod('damage', 'more', -0.2)]),
    [n('deep_refrain', 'Deep Refrain', '40% increased chaos ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['chaos'])]),
      n('layered_refrain', 'Layered Refrain', 'Enemies can have up to 2 additional poison stacks.', [mod('ailmentStacks', 'flat', 2, ['chaos'])]),
      n('feeding_refrain', 'Feeding Refrain', 'Recover life equal to 5% of poison damage dealt by this skill.', [mod('dotLeech_poison', 'flat', 0.05)])],
    [n('returning_refrain', 'Returning Refrain', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('banked_refrain', 'Banked Refrain', '+2 maximum Verse.', [mod('chargeCap', 'flat', 2)]),
      n('broad_refrain', 'Broad Refrain', '35% increased area radius.', [mod('aoeRadius', 'increased', 0.35)])],
  ], n('discord_practice', 'Discord Practice', '15% increased chaos damage.', [mod('damage', 'increased', 0.15, ['chaos'])])),

  coda: tree([
    n('scattering_finale', 'Scattering Finale', '35% increased area radius and +60 knockback strength, but deals 15% less damage.', [mod('aoeRadius', 'increased', 0.35), mod('knockback', 'flat', 60), mod('damage', 'more', -0.15)]),
    [n('bewildering_finale', 'Bewildering Finale', '+35% chance to inflict Bewilder.', [mod('apply_bewilder', 'flat', 0.35)]),
      n('heavy_finale', 'Heavy Finale', 'Deals 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)]),
      n('stunning_finale', 'Stunning Finale', '+25% chance to stun.', [mod('apply_stun', 'flat', 0.25)])],
    [n('ready_finale', 'Ready Finale', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_finale', 'Cheap Finale', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('paid_finale', 'Paid Finale', 'Gain 3 life on hit.', [mod('lifeOnHit', 'flat', 3)])],
  ], [
    n('measured_coda', 'Measured Coda', 'Consumes exactly 2 Verse to deal 45% more damage per Verse spent, preserving any remaining Verse.', undefined, { chargeCost: { charge: 'verse', amount: 2, damagePerCharge: 0.45 } }),
    [n('precise_coda', 'Precise Coda', '+12% critical chance.', [mod('critChance', 'flat', 0.12)]),
      n('cruel_coda', 'Cruel Coda', '+40% critical multiplier.', [mod('critMulti', 'flat', 0.4)]),
      n('open_coda', 'Open Coda', 'Ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)])],
    [n('swift_coda', 'Swift Coda', '25% increased cast speed.', [mod('castSpeed', 'increased', 0.25)]),
      n('hungry_coda', 'Hungry Coda', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)]),
      n('final_coda', 'Final Coda', 'Culls enemies below 10% life.', [mod('cullThreshold', 'flat', 0.1)])],
  ], n('coda_practice', 'Coda Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  stasis_lock: tree([
    n('certain_stasis', 'Certain Stasis', '+20% chance to inflict Stasis and 40% increased effect duration, but deals 20% less hit damage.', [mod('apply_stasis', 'flat', 0.2), mod('effectDuration', 'increased', 0.4), mod('damage', 'more', -0.2)]),
    [n('swift_stasis', 'Swift Stasis', '40% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.4)]),
      n('seeking_stasis', 'Seeking Stasis', 'Projectiles curve toward nearby enemies.', [mod('homingPower', 'flat', 1.5)]),
      n('broad_stasis', 'Broad Stasis', '40% increased projectile size.', [mod('projectileSize', 'increased', 0.4)])],
    [n('ready_stasis', 'Ready Stasis', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_stasis', 'Cheap Stasis', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('warded_stasis', 'Warded Stasis', 'Gain a shield for 3 seconds equal to 2 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 2)])],
  ], [
    n('fractured_seconds', 'Fractured Seconds', 'Fires 2 additional projectiles that each pierce 1 additional enemy, but deals 30% less damage per projectile.', [mod('projectileCount', 'flat', 2), mod('pierceCount', 'flat', 1), mod('damage', 'more', -0.3)]),
    [n('quick_seconds', 'Quick Seconds', '25% increased cast speed.', [mod('castSpeed', 'increased', 0.25)]),
      n('thick_seconds', 'Thick Seconds', '40% increased projectile size.', [mod('projectileSize', 'increased', 0.4)]),
      n('piercing_seconds', 'Piercing Seconds', 'Pierces 2 additional enemies.', [mod('pierceCount', 'flat', 2)])],
    [n('heavy_seconds', 'Heavy Seconds', '30% increased chaos damage.', [mod('damage', 'increased', 0.3, ['chaos'])]),
      n('lingering_seconds', 'Lingering Seconds', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('hungry_seconds', 'Hungry Seconds', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
  ], n('stasis_practice', 'Stasis Practice', '15% increased chaos damage.', [mod('damage', 'increased', 0.15, ['chaos'])])),

  torpor_field: tree([
    n('deep_stillness', 'Deep Stillness', 'Slows enemy projectiles inside the dome to 10% speed and increases dome life to 80, but costs 25% more mana.', [mod('manaCost', 'more', 0.25)], { construct: { domeSlow: 0.1, life: 80, domeRadius: 140, maxActive: 1 } }),
    [n('sturdy_stillness', 'Sturdy Stillness', '50% increased dome life.', [mod('minionLife', 'increased', 0.5)]),
      n('wide_stillness', 'Wide Stillness', '35% increased dome radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('enduring_stillness', 'Enduring Stillness', '40% increased dome life.', [mod('minionLife', 'increased', 0.4)])],
    [n('ready_stillness', 'Ready Stillness', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('lasting_stillness', 'Lasting Stillness', '40% increased dome duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('cheap_stillness', 'Cheap Stillness', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    n('pocket_seconds', 'Pocket Seconds', 'Allows up to 3 active domes, each with 90 radius and 40 life, slowing enemy projectiles to 30% speed.', undefined, { construct: { maxActive: 3, domeRadius: 90, life: 40, domeSlow: 0.3 } }),
    [n('wide_pockets', 'Wide Pockets', '30% increased dome radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('extra_pocket', 'Extra Pocket', '+1 maximum active dome.', [mod('constructMaxCount', 'flat', 1)]),
      n('strong_pockets', 'Strong Pockets', '40% increased dome life.', [mod('minionLife', 'increased', 0.4)])],
    [n('lasting_pockets', 'Lasting Pockets', '40% increased dome duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_pockets', 'Ready Pockets', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_pockets', 'Cheap Pockets', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], n('torpor_practice', 'Torpor Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),

  time_dilation: tree([
    n('short_turn', 'Short Turn', 'Reduces other active cooldowns by 1 second plus 10% of their remaining time. Grants 75% increased cooldown recovery and 30% reduced mana cost.', [mod('cooldownRecovery', 'increased', 0.75), mod('manaCost', 'increased', -0.3)], { reduceCooldowns: { seconds: 1, fraction: 0.1 } }),
    [buff(n('fleet_turn', 'Fleet Turn', 'Grants 25% increased movement speed for 3 seconds when cast.', undefined, { tags: { add: ['duration'] } }), 'fleet_turn', { duration: 3, mods: [mod('moveSpeed', 'increased', 0.25)] }),
      buff(n('guarded_turn', 'Guarded Turn', 'While active, take 15% less damage.'), 'fleet_turn', { mods: [mod('damageTaken', 'more', -0.15)] }),
      n('lasting_turn', 'Lasting Turn', '50% increased buff duration.', [mod('effectDuration', 'increased', 0.5)])],
    [n('ready_turn', 'Ready Turn', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_turn', 'Cheap Turn', '25% reduced mana cost.', [mod('manaCost', 'increased', -0.25)]),
      n('warded_turn', 'Warded Turn', 'Gain a shield for 3 seconds equal to 3 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 3)])],
  ], [
    n('deep_turn', 'Deep Turn', 'Reduces other active cooldowns by 4 seconds plus 40% of their remaining time, but has 25% less cooldown recovery and costs 35% more mana.', [mod('cooldownRecovery', 'more', -0.25), mod('manaCost', 'more', 0.35)], { reduceCooldowns: { seconds: 4, fraction: 0.4 } }),
    [buff(n('borrowed_momentum', 'Borrowed Momentum', 'Grants 20% increased attack and cast speed for 4 seconds when cast.', undefined, { tags: { add: ['duration'] } }), 'borrowed_momentum', { duration: 4, mods: [mod('attackSpeed', 'increased', 0.2), mod('castSpeed', 'increased', 0.2)] }),
      buff(n('forceful_momentum', 'Forceful Momentum', 'While active, deal 25% increased damage.'), 'borrowed_momentum', { mods: [mod('damage', 'increased', 0.25)] }),
      n('lasting_momentum', 'Lasting Momentum', '50% increased buff duration.', [mod('effectDuration', 'increased', 0.5)])],
    [n('wound_clock', 'Wound Clock', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('frugal_clock', 'Frugal Clock', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('paid_clock', 'Paid Clock', 'Gain a shield for 3 seconds equal to 3 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 3)])],
  ], n('rewind_practice', 'Rewind Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),
};
