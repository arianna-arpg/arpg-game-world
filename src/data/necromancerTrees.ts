import { BONE_GOLEM_TREE } from './boneGolemTree';
import { SKELETON_MAGE_TREE } from './skeletonMageTree';
import { SKELETON_ARCHER_TREE } from './skeletonArcherTree';
import { tree, n, life, damage, cap, count, speed, dr } from './skillTreeBuilder';
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
    n('wandering_dead', 'Wandering Dead', 'Passively summons 1 permanent shambler every 3 seconds while equipped (up to 4). Activate to pause or resume summoning without dismissing active shamblers. Shamblers have 35% less life and 60% increased movement speed.',
      [mod('minionLife', 'more', -0.35), speed(0.6)], { tags: { remove: ['duration'] }, summon: { count: 1, maxActive: 4, duration: 0, replenish: { interval: 3, toggle: true } } }),
    [n('restless_graves', 'Restless Graves', '25% faster shambler replenishment.', [mod('minionRespawnTime', 'more', -0.25)]),
      n('grave_tide', 'Grave Tide', '+1 shambler summoned per cycle and +2 maximum shamblers.', [count(1), cap(2)]),
      n('hungry_dead', 'Hungry Dead', '50% increased enemy detection range and 40% increased movement speed.', [mod('minionDetectionRange', 'increased', 0.5), speed(0.4)])],
    [n('gathering_dead', 'Gathering Dead', '+4 maximum shamblers.', [cap(4)]),
      n('patient_dead', 'Patient Dead', '60% increased minion life and 2 life regenerated per second.', [life(0.6), mod('minionRegen', 'flat', 2)]),
      n('crowded_graves', 'Crowded Graves', '+4 maximum shamblers, but shamblers deal 20% less damage.', [cap(4), mod('minionDamage', 'more', -0.2)])],
  ], [
    n('commanded_dead', 'Commanded Dead', 'Summons 2 shamblers per cast (up to 6) that last 7 seconds. Costs 15% more mana.', [mod('manaCost', 'more', 0.15)], { summon: { count: 2, maxActive: 6, duration: 7 } }),
    [n('grave_rush', 'Grave Rush', '65% increased minion movement speed and 20% increased cast speed, but 40% less minion duration.', [speed(0.65), mod('effectDuration', 'more', -0.4), mod('castSpeed', 'increased', 0.2)]),
      n('funeral_charge', 'Funeral Charge', '+2 shamblers summoned per cast and +4 maximum shamblers, but costs 30% more mana.', [count(2), cap(4), mod('manaCost', 'more', 0.3)]),
      n('last_gasp', 'Last Gasp', 'Shamblers explode when their duration expires. 25% increased minion damage.', [mod('minionExpiryIsDeath', 'flat', 1), damage(0.25)])],
    [n('corpse_engine', 'Corpse Engine', '-1 shambler summoned per cast and -2 maximum shamblers. Shamblers have 80% more life, and the skill costs 30% more mana.', [count(-1), cap(-2), mod('minionLife', 'more', 0.8), mod('manaCost', 'more', 0.3)]),
      n('packed_flesh', 'Packed Flesh', '60% increased minion life and 40% increased duration.', [life(0.6), mod('effectDuration', 'increased', 0.4)]),
      n('relentless_engine', 'Relentless Engine', 'Shamblers take 30% less damage and gain 35% increased movement speed.', [dr(0.3), speed(0.35)])],
  ], n('stitched_flesh', 'Stitched Flesh', '25% increased minion life.', [life(0.25)])),

  summon_bone_golem: BONE_GOLEM_TREE,

  summon_skeleton_archer: SKELETON_ARCHER_TREE,

  summon_skeleton_mage: SKELETON_MAGE_TREE,
};
