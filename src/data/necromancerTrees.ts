import { tree, n, life, damage, cap, count, haste, speed, size, dr, body, kit, aura, element } from './skillTreeBuilder';
import { UNDEAD_COURT_TREES } from './necromancerCourts';
import type { SkillTreeSpec, SummonDelivery } from '../engine/skills';
import { mod } from '../engine/stats';

export const SKELETAL_MAGE_POOL: NonNullable<SummonDelivery['pool']> = [
  { id: 'skeletal_pyromancer', weight: 1, tags: ['fire'] },
  { id: 'skeletal_cryomancer', weight: 1, tags: ['cold'] },
  { id: 'skeletal_stormcaller', weight: 1, tags: ['lightning'] },
  { id: 'skeletal_venomancer', weight: 1, tags: ['chaos'] },
];

export const NECROMANCER_TREES: Record<string, SkillTreeSpec> = {
  ...UNDEAD_COURT_TREES,
  shambler_horde: tree([
    n('wandering_dead', 'Wandering Dead', 'Toggle free births: one shambler every 3 seconds while seated, up to 4. Starts enabled; press to pause future births without dismissing existing bodies. They follow until foes appear and rush to burst. They never expire. 35% less life; 60% faster movement.',
      [mod('minionLife', 'more', -0.35), speed(0.6)], { tags: { remove: ['duration'] }, summon: { count: 1, maxActive: 4, duration: 0, replenish: { interval: 3, toggle: true } } }),
    [n('restless_graves', 'Restless Graves', 'Replenish 25% sooner.', [mod('minionRespawnTime', 'more', -0.25)]),
      n('grave_tide', 'Grave Tide', 'Replenish two at a time, with two additional horde slots.', [count(1), cap(2)]),
      n('hungry_dead', 'Hungry Dead', 'Detect foes 50% farther away and move 40% faster.', [mod('minionDetectionRange', 'increased', 0.5), speed(0.4)])],
    [n('gathering_dead', 'Gathering Dead', 'Four additional shamblers may wait in your horde.', [cap(4)]),
      n('patient_dead', 'Patient Dead', '60% increased life and 2 life regenerated per second.', [life(0.6), mod('minionRegen', 'flat', 2)]),
      n('crowded_graves', 'Crowded Graves', 'Four more slots, at the cost of 20% less damage per shambler.', [cap(4), mod('minionDamage', 'more', -0.2)])],
  ], [
    n('commanded_dead', 'Commanded Dead', 'Cast packs of two shamblers, up to 6, lasting 7 seconds. 15% more mana cost.', [mod('manaCost', 'more', 0.15)], { summon: { count: 2, maxActive: 6, duration: 7 } }),
    [n('grave_rush', 'Grave Rush', 'Fast, brief packs: 65% faster movement, 40% less duration and 20% faster casting.', [speed(0.65), mod('effectDuration', 'more', -0.4), mod('castSpeed', 'increased', 0.2)]),
      n('funeral_charge', 'Funeral Charge', 'Two additional bodies per cast and four additional slots; 30% more mana cost.', [count(2), cap(4), mod('manaCost', 'more', 0.3)]),
      n('last_gasp', 'Last Gasp', 'Expiry triggers real death explosions. 25% increased minion damage.', [mod('minionExpiryIsDeath', 'flat', 1), damage(0.25)])],
    [n('corpse_engine', 'Corpse Engine', 'One fewer body per cast and two fewer slots, but 80% more life feeds heavier blasts; 30% more mana cost. Combines with pack investment.', [count(-1), cap(-2), mod('minionLife', 'more', 0.8), mod('manaCost', 'more', 0.3)]),
      n('packed_flesh', 'Packed Flesh', '60% increased life and 40% increased duration.', [life(0.6), mod('effectDuration', 'increased', 0.4)]),
      n('relentless_engine', 'Relentless Engine', 'Heavy bodies take 30% less damage and move 35% faster.', [dr(0.3), speed(0.35)])],
  ], n('stitched_flesh', 'Stitched Flesh', '25% increased minion life. Open to either trunk.', [life(0.25)])),

  summon_bone_golem: tree([
    n('osseous_might', 'Osseous Might', 'Build a fighting golem: 30% more damage and 20% increased size.', [mod('minionDamage', 'more', 0.3), size(0.2)]),
    [n('drilled_bones', 'Drilled Bones', 'Golems act and move 30% faster, and recover skills 30% faster.', [haste(0.3)], body(mod('cooldownRecovery', 'increased', 0.3))),
      n('bone_cohort', 'Bone Cohort', 'One more golem slot and body; 20% less life per golem.', [cap(1), count(1), mod('minionLife', 'more', -0.2)]),
      n('assembled_legion', 'Assembled Legion', 'A slain golem crumbles into two half-size lesser golems for 8 seconds. They inherit investment with 35% life and 45% damage, cannot divide or reserve mana, and have a separate cap of six. Dismissal does not divide.', undefined, { summon: { crewOnDeath: [{ do: 'summon', monster: 'bone_golem', count: 2, ring: 28, lifespan: 8, inheritSummon: { maxActive: 6, size: 0.5, life: 0.35, damage: 0.45 } }] } })],
    [n('great_bones', 'Great Bones', '50% increased life and 35% increased size. Without cohort investment, one giant serves.', [life(0.5), size(0.35)]),
      n('ossuary_commander', 'Ossuary Commander', 'Bear a 220-radius command aura: nearby allies deal 20% increased damage and attack/cast 15% faster. Multiple commanders stack their auras.', undefined, aura('ossuary_command')),
      n('marrow_bruiser', 'Marrow Bruiser', 'Learn Marrow Sweep, a broad heavy blow on a 5-second cooldown; take 20% less damage.', [dr(0.2)], kit('marrow_sweep'))],
  ], [
    n('keepers_bulwark', "Keeper's Bulwark", 'A defensive golem: 50% increased life, 20% less damage, and a shorter combat leash.', [life(0.5), mod('minionDamage', 'more', -0.2), mod('minionGuard', 'flat', 1)]),
    [n('close_guard', 'Close Guard', '20% increased size. Splinters retaliate for 8 Thorns plus 50% of your Thorns when the golem is hit or its attached shell absorbs a hit. Minion size scales its area reach.', [size(0.2)], { summon: { crewMods: [mod('thorns', 'flat', 8)], crewInherit: [{ stat: 'thorns', fromStat: 'thorns', ratio: 0.5, kind: 'flat' }, { stat: 'aoeRadius', fromStat: 'minionSize', ratio: 1, offset: -1, kind: 'more', tags: ['aoe'] }] } }),
      n('bone_stand', 'Bone Stand', 'The golem becomes a shell attached to you, covering 300 degrees around your facing. Absorb damage up to 60% of its life, multiplied by minion size and guard strength. Size also expands its strikes; the rear opening stays fixed. It lashes out with Marrow Sweep. When broken, protection and strikes stop; after 4 seconds it regenerates 20% per second and reforms at 40%.', undefined, { tags: { add: ['guard'] }, summon: { shell: { lifeFraction: 0.6, sizeScaling: 1, arcDeg: 300, regenDelay: 4, regenFraction: 0.2, reformFraction: 0.4, strikeSkill: 'marrow_sweep', strikeInterval: 2 } } }),
      n('warding_reach', 'Warding Reach', '75% faster movement. Learn Warding Sweep: a size-scaled 160-radius taunt for 2 seconds, with a light shove and 3-second bleed, every 6 seconds.', [speed(0.75)], kit('warding_sweep'))],
    [n('renewing_frame', 'Renewing Frame', 'Re-form 30% sooner and regenerate 5 life each second.', [mod('minionRespawnTime', 'more', -0.3), mod('minionRegen', 'flat', 5)]),
      n('sheltering_bones', 'Sheltering Bones', 'Bear a 180-radius mending aura that heals nearby allies for 2% of maximum life every second.', undefined, aura('ossuary_mending')),
      n('adamant_frame', 'Adamant Frame', '40% less damage taken and 25% more life, at the cost of 20% less damage dealt.', [dr(0.4), mod('minionLife', 'more', 0.25), mod('minionDamage', 'more', -0.2)])],
  ], n('fitted_joints', 'Fitted Joints', '20% increased minion life and 15% faster movement.', [life(0.2), speed(0.15)])),

  summon_skeleton_archer: tree([
    n('rattling_bows', 'Rattling Bows', 'Commit to physical archers. Raise two at once, up to four; 20% more mana cost.', [mod('manaCost', 'more', 0.2)], { summon: { monsterId: 'skeleton_archer', count: 2, maxActive: 4 }, tags: { add: ['physical'] } }),
    [n('ranked_bows', 'Ranked Bows', 'One additional archer per casting and two more slots.', [count(1), cap(2)]),
      n('endless_quivers', 'Endless Quivers', 'Two more slots and 25% faster minions.', [cap(2), haste(0.25)]),
      n('piercing_bones', 'Piercing Bones', 'Archer projectiles pierce two more enemies and deal 20% increased damage.', undefined, body(mod('pierceCount', 'flat', 2, ['projectile']), mod('damage', 'increased', 0.2, ['projectile'])))],
    [n('rain_of_bones', 'Rain of Bones', 'Archers learn Rain of Bones: arrows rain over an area on an 8-second cooldown.', undefined, kit('skeletal_arrowfall')),
      n('drumming_rain', 'Drumming Rain', 'Rain of Bones recovers 60% faster, covers a 25% larger radius, deals 50% more damage and has 30% chance to bleed.', undefined, body(mod('cooldownRecovery', 'increased', 0.6, ['storm']), mod('aoeRadius', 'increased', 0.25, ['storm']), mod('damage', 'more', 0.5, ['storm']), mod('apply_bleed', 'flat', 0.3, ['storm']))),
      n('cruel_rain', 'Forked Quivers', 'Archers fire one additional projectile with their bow attacks, including their ordinary arrows.', undefined, body(mod('projectileCount', 'flat', 1, ['attack', 'projectile'])))],
  ], [
    n('unstrung_sorcery', 'Unstrung Sorcery', 'Replace archers with random fire, cold, lightning or venom bolt casters. Retain the base summon count and cap. Element choices form a shared selection pool.', undefined, { summon: { pool: SKELETAL_MAGE_POOL } }),
    [n('volatile_souls', 'Volatile Souls', 'One additional random mage per casting and one additional slot. Leave elements unselected to retain all four kinds.', [count(1), cap(1)]),
      n('ember_souls', 'Ember Souls', 'Select fire mages. Multiple element choices summon randomly from only those selected.', undefined, element('skeletal_pyromancer')),
      n('rime_souls', 'Rime Souls', 'Select cold mages. Combines with other element selections.', undefined, element('skeletal_cryomancer'))],
    [n('unstable_current', 'Unstable Current', 'Bolts gain 12% critical strike chance and 40% critical multiplier: embrace volatile damage.', undefined, body(mod('critChance', 'flat', 0.12, ['spell']), mod('critMulti', 'flat', 0.4, ['spell']))),
      n('storm_souls', 'Storm Souls', 'Select lightning mages. Combines with other element selections.', undefined, element('skeletal_stormcaller')),
      n('venom_souls', 'Venom Souls', 'Select venom mages. Combines with other element selections.', undefined, element('skeletal_venomancer'))],
  ], n('remembered_training', 'Remembered Training', '25% increased minion damage for either bows or spells.', [damage(0.25)])),

  summon_skeleton_mage: tree([
    n('lich_ascendant', 'Lich Ascendant', 'Fuse the batch into one Lich, up to one. It casts an explosive Fireball, has a stronger frame and 60% more damage. 40% more mana cost.', [mod('minionDamage', 'more', 0.6), mod('manaCost', 'more', 0.4)], { summon: { monsterId: 'ossuary_lich', count: 1, maxActive: 1 }, tags: { add: ['fire'] } }),
    [n('fused_intellect', 'Fused Intellect', 'The Lich learns Cinder Rain and casts 20% faster.', [haste(0.2)], kit('skeletal_cinder_rain')),
      n('winter_crown', 'Winter Crown', 'Learn Winter Ring, freezing nearby foes on a cooldown, and gain 35% increased cold damage.', undefined, { tags: { add: ['cold'] }, summon: { crewSkills: ['skeletal_winter_ring'], crewMods: [mod('damage', 'increased', 0.35, ['cold'])] } }),
      n('storm_crown', 'Storm Crown', 'Learn Grave Thunder, an area lightning strike, and gain 35% increased lightning damage.', undefined, { tags: { add: ['lightning'] }, summon: { crewSkills: ['skeletal_grave_thunder'], crewMods: [mod('damage', 'increased', 0.35, ['lightning'])] } })],
    [n('deathless_regent', 'Deathless Regent', '60% increased life, 30% increased size, and 4 life regenerated per second.', [life(0.6), size(0.3), mod('minionRegen', 'flat', 4)]),
      n('court_of_one', 'Court of One', 'The Lich bears the Ossuary Command aura, empowering allies within 220 units.', undefined, aura('ossuary_command')),
      n('plague_crown', 'Plague Crown', 'Learn an empowered Plague Ring with a potent poison, and take 20% less damage.', [dr(0.2)], { tags: { add: ['chaos'] }, ...kit('skeletal_plague_ring') })],
  ], [
    n('grave_academy', 'Grave Academy', 'Raise two elemental specialists, up to four. Each learns only its own school from the lessons below. Cryomancers cast Ice Spear innately. 20% faster minions and 20% more mana cost.', [haste(0.2), mod('manaCost', 'more', 0.2)], { summon: { pool: SKELETAL_MAGE_POOL, count: 2, maxActive: 4 } }),
    [n('winter_curriculum', 'Winter and Plague Curriculum', 'Cold and chaos spells deal 40% more damage and recover 40% faster.', undefined, body(mod('damage', 'more', 0.4, ['cold']), mod('cooldownRecovery', 'increased', 0.4, ['cold']), mod('damage', 'more', 0.4, ['chaos']), mod('cooldownRecovery', 'increased', 0.4, ['chaos']))),
      n('deep_winter', 'Deep Winter', 'Cryomancers replace their innate Ice Spear with a greater spear that shatters into five shards instead of two and always chills.', undefined, { summon: { crewRules: [{ monsterIds: ['skeletal_cryomancer'], replace: [{ from: 'skeletal_cold_bolt', to: 'skeletal_greater_ice_spear' }] }] } }),
      n('plague_curriculum', 'Essence Siphons', 'Only venomancers learn Essence Drain: a withering bolt that applies strong decay on a 6-second cooldown.', undefined, { summon: { crewRules: [{ monsterIds: ['skeletal_venomancer'], skills: ['skeletal_essence_drain'] }] } })],
    [n('storm_curriculum', 'Storm and Cinder Curriculum', 'Fire and lightning spells deal 35% increased damage and recover 50% faster.', undefined, body(mod('damage', 'increased', 0.35, ['fire']), mod('cooldownRecovery', 'increased', 0.5, ['fire']), mod('damage', 'increased', 0.35, ['lightning']), mod('cooldownRecovery', 'increased', 0.5, ['lightning']))),
      n('rolling_thunder', 'Rolling Thunder', 'Only stormcallers learn Chain Lightning: a bolt that leaps twice on a 5-second cooldown.', undefined, { summon: { crewRules: [{ monsterIds: ['skeletal_stormcaller'], skills: ['skeletal_chain_lightning'] }] } }),
      n('expanded_faculty', 'Kindled Souls', 'Only pyromancers learn Ignite: a strong targeted burn on a 5-second cooldown.', undefined, { summon: { crewRules: [{ monsterIds: ['skeletal_pyromancer'], skills: ['skeletal_ignite'] }] } })],
  ], n('grave_studies', 'Grave Studies', '20% increased minion damage and 20% faster minions.', [damage(0.2), haste(0.2)])),
};
