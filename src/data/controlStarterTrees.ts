import type { SkillTreeSpec, TreeBuffPatch, GroundDelivery } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const domain = (node: Node, value: NonNullable<GroundDelivery['domain']>): Node => ({ ...node, over: { ...node.over, ground: { ...node.over?.ground, domain: value } } });
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });

export const CONTROL_STARTER_TREES: Record<string, SkillTreeSpec> = {
  caltrops: tree([
    domain(n('snagging_spikes', 'Snagging Spikes', 'Enemies inside the spikes move 25% slower. Keep the repeated cuts, bleed and reeling.'), { enemyMods: [mod('moveSpeed', 'increased', -0.25)] }),
    [n('wide_spikes', 'Wide Spikes', '35% increased area radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('layered_spikes', 'Layered Spikes', 'Bleeds from these cuts can stack twice more.', [mod('ailmentStacks', 'flat', 2, ['physical'])]),
      n('feeding_spikes', 'Feeding Spikes', 'Recover 6% of this skill\'s bleed damage as life.', [mod('dotLeech_bleed', 'flat', 0.06)])],
    [n('lasting_spikes', 'Lasting Spikes', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('cheap_spikes', 'Cheap Spikes', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('ready_spikes', 'Ready Spikes', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    n('rolling_spikes', 'Rolling Spikes', 'The spike field follows you after placement, cutting pursuers as you move. 20% less damage.', [mod('damage', 'more', -0.2)], { ground: { follow: true } }),
    [n('broad_trail', 'Broad Trail', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('reeling_trail', 'Reeling Trail', 'Gain 25% additional chance to leave enemies reeling.', [mod('apply_reeling', 'flat', 0.25)]),
      n('open_trail', 'Open Trail', 'Ignore 15% of enemy armor.', [mod('armorPen', 'flat', 0.15)])],
    [n('cutting_trail', 'Cutting Trail', 'Gain 35% additional bleed chance.', [mod('apply_bleed', 'flat', 0.35)]),
      n('deep_trail', 'Deep Trail', '40% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['physical'])]),
      n('paid_trail', 'Paid Trail', 'Restore 1 life per landed hit.', [mod('lifeOnHit', 'flat', 1)])],
  ], n('spike_practice', 'Spike Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  aftershock_snare: tree([
    n('sensitive_tripplate', 'Sensitive Tripplate', 'Double the trigger radius to 110. Keep the physical blast and its aftershocks; 15% less damage.', [mod('damage', 'more', -0.15)], { construct: { range: 110, castSkillId: 'snare_shock' } }),
    [n('broad_tripplate', 'Broad Tripplate', '35% increased blast and aftershock radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('stunning_tripplate', 'Stunning Tripplate', 'Gain 25% additional stun chance.', [mod('apply_stun', 'flat', 0.25)]),
      n('heavy_tripplate', 'Heavy Tripplate', 'Deal 35% more poise damage.', [mod('poiseDamage', 'more', 0.35)])],
    [n('ready_tripplate', 'Ready Tripplate', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('patient_tripplate', 'Patient Tripplate', '40% increased device lifetime.', [mod('effectDuration', 'increased', 0.4)]),
      n('cheap_tripplate', 'Cheap Tripplate', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    n('splinter_snare', 'Splinter Snare', 'Replace the blast with Fan of Blades aimed at the triggering enemy. The trap triggers within 80 units and remains single-use.', undefined, { construct: { range: 80, castSkillId: 'fan_of_blades' }, tags: { add: ['projectile'] } }),
    [n('crowded_splinters', 'Crowded Splinters', 'Fire two additional blades.', [mod('projectileCount', 'flat', 2)]),
      n('piercing_splinters', 'Piercing Splinters', 'Blades pierce two additional targets.', [mod('pierceCount', 'flat', 2)]),
      n('seeking_splinters', 'Seeking Splinters', 'Blades home toward enemies.', [mod('homingPower', 'flat', 1.5)])],
    [n('sharp_splinters', 'Sharp Splinters', '30% increased physical damage.', [mod('damage', 'increased', 0.3, ['physical'])]),
      n('barbed_splinters', 'Barbed Splinters', 'Landed blades also bleed.', [mod('apply_bleed', 'flat', 1)]),
      n('open_splinters', 'Open Splinters', 'Ignore 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)])],
  ], n('snare_practice', 'Snare Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  ballista_sentry: tree([
    n('broadside_battery', 'Broadside Battery', 'Fire three parallel arrows down the placed lane. 25% less damage per arrow and 25% more mana cost.', [mod('projectileCount', 'flat', 2), mod('fireVolley', 'flat', 1), mod('damage', 'more', -0.25), mod('manaCost', 'more', 0.25)]),
    [n('wide_battery', 'Wide Battery', '50% increased spacing between parallel arrows.', [mod('volleySpacing', 'increased', 0.5)]),
      n('piercing_battery', 'Piercing Battery', 'Arrows pierce two additional targets.', [mod('pierceCount', 'flat', 2)]),
      n('barbed_battery', 'Barbed Battery', 'Arrows gain 50% additional bleed chance.', [mod('apply_bleed', 'flat', 0.5)])],
    [n('rapid_battery', 'Rapid Battery', '30% increased construct firing rate.', [mod('constructCastRate', 'increased', 0.3)]),
      n('lasting_battery', 'Lasting Battery', '40% increased device lifetime.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_battery', 'Ready Battery', '40% increased placement cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    n('siege_anchor', 'Siege Anchor', 'Keep one fewer ballista active. Each fires 50% harder and lodges 30% of physical hit damage as impale, preparing the next strike.', [mod('constructMaxCount', 'flat', -1), mod('damage', 'more', 0.5), mod('impalePower', 'flat', 0.3)]),
    [n('certain_anchor', 'Certain Anchor', '50% increased accuracy.', [mod('accuracy', 'increased', 0.5)]),
      n('open_anchor', 'Open Anchor', 'Ignore 25% of enemy armor.', [mod('armorPen', 'flat', 0.25)]),
      n('cruel_anchor', 'Cruel Anchor', 'Gain 12% critical chance.', [mod('critChance', 'flat', 0.12)])],
    [n('long_watch', 'Long Watch', '50% increased device lifetime.', [mod('effectDuration', 'increased', 0.5)]),
      n('second_anchor', 'Second Anchor', 'Keep one additional ballista active.', [mod('constructMaxCount', 'flat', 1)]),
      n('swift_anchor', 'Swift Anchor', '25% increased construct firing rate.', [mod('constructCastRate', 'increased', 0.25)])],
  ], n('ballista_practice', 'Ballista Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  war_chant: tree([
    domain(n('marching_anthem', 'Marching Anthem', 'The song grants allies another 12% increased attack and cast speed. Each singing costs 20% more mana.' , [mod('manaCost', 'more', 0.2)]), { allyMods: [mod('attackSpeed', 'increased', 0.12), mod('castSpeed', 'increased', 0.12)] }),
    [domain(n('martial_anthem', 'Martial Anthem', 'The song also grants 25% increased physical damage.'), { allyMods: [mod('damage', 'increased', 0.25, ['physical'])] }),
      domain(n('piercing_anthem', 'Piercing Anthem', 'Allies in the song ignore 10% of enemy armor.'), { allyMods: [mod('armorPen', 'flat', 0.1)] }),
      domain(n('certain_anthem', 'Certain Anthem', 'The song also grants 35% increased accuracy.'), { allyMods: [mod('accuracy', 'increased', 0.35)] })],
    [n('carrying_anthem', 'Carrying Anthem', '30% increased song radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('lasting_anthem', 'Lasting Anthem', '35% increased song duration.', [mod('effectDuration', 'increased', 0.35)]),
      n('banked_anthem', 'Banked Anthem', 'This singing can bank two additional Verse.', [mod('chargeCap', 'flat', 2)])],
  ], [
    domain(n('sheltering_hymn', 'Sheltering Hymn', 'Allies in the song take 15% less damage and regenerate 2 life per second. 20% reduced song radius.', [mod('aoeRadius', 'increased', -0.2)]), { allyMods: [mod('damageTaken', 'more', -0.15), mod('lifeRegen', 'flat', 2)] }),
    [domain(n('mending_hymn', 'Mending Hymn', 'The song grants another 2 life regeneration per second.'), { allyMods: [mod('lifeRegen', 'flat', 2)] }),
      domain(n('armored_hymn', 'Armored Hymn', 'The song also grants 40% increased armor.'), { allyMods: [mod('armor', 'increased', 0.4)] }),
      domain(n('marching_hymn', 'Marching Hymn', 'The song also grants 20% increased movement speed.'), { allyMods: [mod('moveSpeed', 'increased', 0.2)] })],
    [n('patient_hymn', 'Patient Hymn', '40% increased song duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('frugal_hymn', 'Frugal Hymn', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('ready_hymn', 'Ready Hymn', '35% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.35)])],
  ], n('chant_practice', 'Chant Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),

  dissonance: tree([
    domain(n('grinding_dirge', 'Grinding Dirge', 'Enemies in the song move 20% slower and take 15% more damage from all sources. Your song hits deal 15% less damage.', [mod('damage', 'more', -0.15)]), { enemyMods: [mod('moveSpeed', 'increased', -0.2), mod('damageTaken', 'more', 0.15)] }),
    [n('wide_dirge', 'Wide Dirge', '30% increased song radius.', [mod('aoeRadius', 'increased', 0.3)]),
      domain(n('dragging_dirge', 'Dragging Dirge', 'The song slows enemy movement by another 10%.'), { enemyMods: [mod('moveSpeed', 'increased', -0.1)] }),
      n('confounding_dirge', 'Confounding Dirge', 'Gain 25% additional befuddlement chance.', [mod('apply_befuddlement', 'flat', 0.25)])],
    [n('lasting_dirge', 'Lasting Dirge', '40% increased song duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('cheap_dirge', 'Cheap Dirge', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('ready_dirge', 'Ready Dirge', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    n('withering_refrain', 'Withering Refrain', 'Landed song pulses also poison. 20% less hit damage; the field still follows you and banks Verse.', [mod('apply_poison', 'flat', 1), mod('damage', 'more', -0.2)]),
    [n('deep_refrain', 'Deep Refrain', '40% increased chaos ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['chaos'])]),
      n('layered_refrain', 'Layered Refrain', 'Poisons can stack twice more.', [mod('ailmentStacks', 'flat', 2, ['chaos'])]),
      n('feeding_refrain', 'Feeding Refrain', 'Recover 5% of this skill\'s poison damage as life.', [mod('dotLeech_poison', 'flat', 0.05)])],
    [n('returning_refrain', 'Returning Refrain', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('banked_refrain', 'Banked Refrain', 'This singing can bank two additional Verse.', [mod('chargeCap', 'flat', 2)]),
      n('broad_refrain', 'Broad Refrain', '35% increased song radius.', [mod('aoeRadius', 'increased', 0.35)])],
  ], n('discord_practice', 'Discord Practice', '15% increased chaos damage.', [mod('damage', 'increased', 0.15, ['chaos'])])),

  coda: tree([
    n('scattering_finale', 'Scattering Finale', '35% increased nova radius and 60 additional knockback strength. Keep the full Verse spend; 15% less damage.', [mod('aoeRadius', 'increased', 0.35), mod('knockback', 'flat', 60), mod('damage', 'more', -0.15)]),
    [n('bewildering_finale', 'Bewildering Finale', 'Gain 35% additional bewilder chance.', [mod('apply_bewilder', 'flat', 0.35)]),
      n('heavy_finale', 'Heavy Finale', 'Deal 40% more poise damage.', [mod('poiseDamage', 'more', 0.4)]),
      n('stunning_finale', 'Stunning Finale', 'Gain 25% additional stun chance.', [mod('apply_stun', 'flat', 0.25)])],
    [n('ready_finale', 'Ready Finale', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_finale', 'Cheap Finale', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('paid_finale', 'Paid Finale', 'Restore 3 life per landed hit.', [mod('lifeOnHit', 'flat', 3)])],
  ], [
    n('measured_coda', 'Measured Coda', 'Require and spend exactly 2 Verse for 45% more damage per Verse spent. Preserve the rest for another ending.', undefined, { chargeCost: { charge: 'verse', amount: 2, damagePerCharge: 0.45 } }),
    [n('precise_coda', 'Precise Coda', 'Gain 12% critical chance.', [mod('critChance', 'flat', 0.12)]),
      n('cruel_coda', 'Cruel Coda', 'Add 40 percentage points of critical multiplier.', [mod('critMulti', 'flat', 0.4)]),
      n('open_coda', 'Open Coda', 'Ignore 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)])],
    [n('swift_coda', 'Swift Coda', '25% increased cast speed.', [mod('castSpeed', 'increased', 0.25)]),
      n('hungry_coda', 'Hungry Coda', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)]),
      n('final_coda', 'Final Coda', 'Cull enemies below 10% life.', [mod('cullThreshold', 'flat', 0.1)])],
  ], n('coda_practice', 'Coda Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  stasis_lock: tree([
    n('certain_stasis', 'Certain Stasis', 'Gain 20% additional stasis chance and 40% increased effect duration. 20% less hit damage.', [mod('apply_stasis', 'flat', 0.2), mod('effectDuration', 'increased', 0.4), mod('damage', 'more', -0.2)]),
    [n('swift_stasis', 'Swift Stasis', '40% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.4)]),
      n('seeking_stasis', 'Seeking Stasis', 'The needle homes toward enemies.', [mod('homingPower', 'flat', 1.5)]),
      n('broad_stasis', 'Broad Stasis', '40% increased projectile size.', [mod('projectileSize', 'increased', 0.4)])],
    [n('ready_stasis', 'Ready Stasis', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_stasis', 'Cheap Stasis', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('warded_stasis', 'Warded Stasis', 'Each mana actually paid grants 2 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins.', [mod('costWard_mana', 'flat', 2)])],
  ], [
    n('fractured_seconds', 'Fractured Seconds', 'Fire two additional needles, each piercing one additional target. 30% less damage per needle; keep temporal drag and stasis.', [mod('projectileCount', 'flat', 2), mod('pierceCount', 'flat', 1), mod('damage', 'more', -0.3)]),
    [n('quick_seconds', 'Quick Seconds', '25% increased cast speed.', [mod('castSpeed', 'increased', 0.25)]),
      n('thick_seconds', 'Thick Seconds', '40% increased projectile size.', [mod('projectileSize', 'increased', 0.4)]),
      n('piercing_seconds', 'Piercing Seconds', 'Pierce two more targets.', [mod('pierceCount', 'flat', 2)])],
    [n('heavy_seconds', 'Heavy Seconds', '30% increased chaos damage.', [mod('damage', 'increased', 0.3, ['chaos'])]),
      n('lingering_seconds', 'Lingering Seconds', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('hungry_seconds', 'Hungry Seconds', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
  ], n('stasis_practice', 'Stasis Practice', '15% increased chaos damage.', [mod('damage', 'increased', 0.15, ['chaos'])])),

  torpor_field: tree([
    n('deep_stillness', 'Deep Stillness', 'The dome slows enemy shots to 10% speed and has 80 base life. Keep one dome at a time; 25% more mana cost.', [mod('manaCost', 'more', 0.25)], { construct: { domeSlow: 0.1, life: 80, domeRadius: 140, maxActive: 1 } }),
    [n('sturdy_stillness', 'Sturdy Stillness', '50% increased dome life.', [mod('minionLife', 'increased', 0.5)]),
      n('wide_stillness', 'Wide Stillness', '35% increased dome radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('enduring_stillness', 'Enduring Stillness', 'Another 40% increased dome life.', [mod('minionLife', 'increased', 0.4)])],
    [n('ready_stillness', 'Ready Stillness', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('lasting_stillness', 'Lasting Stillness', '40% increased dome lifetime.', [mod('effectDuration', 'increased', 0.4)]),
      n('cheap_stillness', 'Cheap Stillness', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], [
    n('pocket_seconds', 'Pocket Seconds', 'Keep three smaller domes, each with 90 base radius and 40 base life. Enemy shots retain 30% speed inside them.', undefined, { construct: { maxActive: 3, domeRadius: 90, life: 40, domeSlow: 0.3 } }),
    [n('wide_pockets', 'Wide Pockets', '30% increased dome radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('extra_pocket', 'Extra Pocket', 'Keep one additional dome active.', [mod('constructMaxCount', 'flat', 1)]),
      n('strong_pockets', 'Strong Pockets', '40% increased dome life.', [mod('minionLife', 'increased', 0.4)])],
    [n('lasting_pockets', 'Lasting Pockets', '40% increased dome lifetime.', [mod('effectDuration', 'increased', 0.4)]),
      n('ready_pockets', 'Ready Pockets', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_pockets', 'Cheap Pockets', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], n('torpor_practice', 'Torpor Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),

  time_dilation: tree([
    n('short_turn', 'Short Turn', 'Other running cooldowns lose 1 second plus 10% of their remaining time. Gain 75% increased cooldown recovery and pay 30% less mana.', [mod('cooldownRecovery', 'increased', 0.75), mod('manaCost', 'increased', -0.3)], { reduceCooldowns: { seconds: 1, fraction: 0.1 } }),
    [buff(n('fleet_turn', 'Fleet Turn', 'Rewinding grants 25% increased movement speed for 3 base seconds.', undefined, { tags: { add: ['duration'] } }), 'fleet_turn', { duration: 3, mods: [mod('moveSpeed', 'increased', 0.25)] }),
      buff(n('guarded_turn', 'Guarded Turn', 'While the movement blessing lasts, take 15% less damage.'), 'fleet_turn', { mods: [mod('damageTaken', 'more', -0.15)] }),
      n('lasting_turn', 'Lasting Turn', '50% increased blessing duration.', [mod('effectDuration', 'increased', 0.5)])],
    [n('ready_turn', 'Ready Turn', 'Another 40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_turn', 'Cheap Turn', 'Another 25% reduced mana cost.', [mod('manaCost', 'increased', -0.25)]),
      n('warded_turn', 'Warded Turn', 'Each mana actually paid grants 3 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins.', [mod('costWard_mana', 'flat', 3)])],
  ], [
    n('deep_turn', 'Deep Turn', 'Other running cooldowns lose 4 seconds plus 40% of their remaining time. 25% less cooldown recovery and 35% more mana cost.', [mod('cooldownRecovery', 'more', -0.25), mod('manaCost', 'more', 0.35)], { reduceCooldowns: { seconds: 4, fraction: 0.4 } }),
    [buff(n('borrowed_momentum', 'Borrowed Momentum', 'Rewinding grants 20% increased attack and cast speed for 4 base seconds.', undefined, { tags: { add: ['duration'] } }), 'borrowed_momentum', { duration: 4, mods: [mod('attackSpeed', 'increased', 0.2), mod('castSpeed', 'increased', 0.2)] }),
      buff(n('forceful_momentum', 'Forceful Momentum', 'While the blessing lasts, deal 25% increased damage.'), 'borrowed_momentum', { mods: [mod('damage', 'increased', 0.25)] }),
      n('lasting_momentum', 'Lasting Momentum', '50% increased blessing duration.', [mod('effectDuration', 'increased', 0.5)])],
    [n('wound_clock', 'Wound Clock', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('frugal_clock', 'Frugal Clock', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('paid_clock', 'Paid Clock', 'Each mana actually paid grants 3 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins.', [mod('costWard_mana', 'flat', 3)])],
  ], n('rewind_practice', 'Rewind Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),
};
