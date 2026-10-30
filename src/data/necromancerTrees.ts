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

  summon_bone_golem: BONE_GOLEM_TREE,

  summon_skeleton_archer: SKELETON_ARCHER_TREE,

  summon_skeleton_mage: SKELETON_MAGE_TREE,
};
