import { tree, n, damage } from './skillTreeBuilder';
import { SKELETAL_SCHOOLS } from './skeletonArcherSkills';
import { mod } from '../engine/stats';

/** Formation pacing and price are authored together; ordinary summon timing stays native. */
export const SKELETAL_FORMATION_TUNING = { interval: 0.25, windup: 0.1, manaCostReduction: 0.97, attackSpeedMore: 0.5 } as const;

const lesson = (type: string) => {
  const school = SKELETAL_SCHOOLS.find(s => s.type === type)!;
  return { summon: { selectPool: [school.monster], crewRules: [{ monsterIds: [school.monster], skills: ['skeletal_nova_' + type] }] } };
};
export const SKELETON_ARCHER_TREE = tree([
  n('rattling_bows', 'Barbed Bones', 'Archers deal physical damage and inflict Lodged Splinters on hit for 5 seconds (up to 30 stacks), causing targets to take 4% increased physical damage from skeletal arrows and mortars per stack.', undefined,
    { tags: { add: ['physical'] }, summon: { monsterId: 'skeleton_archer', crewRules: [{ monsterIds: ['skeleton_archer'], replace: [{ from: 'bone_arrow', to: 'skeletal_rattling_arrow' }] }] } }),
  [n('ranked_bows', 'Rising Ranks', `Channel to summon a firing line of archers at your flanks, raising the first after ${SKELETAL_FORMATION_TUNING.windup} seconds and another every ${SKELETAL_FORMATION_TUNING.interval} seconds up to your summon limit. Archers fire in your aimed direction with 50% more attack speed while channeling, and crumble when the channel ends. Costs ${Math.round(SKELETAL_FORMATION_TUNING.manaCostReduction * 100)}% less mana per tick.`, [mod('manaCost', 'more', -SKELETAL_FORMATION_TUNING.manaCostReduction)],
    { tags: { add: ['channel'] }, summon: { channelFormation: { channel: { interval: SKELETAL_FORMATION_TUNING.interval, windup: SKELETAL_FORMATION_TUNING.windup, move: 'immobile', trackAim: true, cooldownOnEnd: true }, spacing: 36, reach: 470, fireOnArrival: true, attackSpeedMore: SKELETAL_FORMATION_TUNING.attackSpeedMore, emerge: { motion: 'rise', life: 0.35, hold: false } } } }),
    n('endless_quivers', 'Parting Volley', 'Releasing the channel at full capacity causes every archer to fire a final shot with 200% more damage and 100% increased projectile size.', undefined,
      { summon: { channelFormationRelease: { power: 3, size: 2 } } }),
    n('piercing_bones', 'Bone Mortars', 'Converts archers into mortarmen that lob explosive bone mortars at target areas.', undefined,
      { summon: { monsterId: 'skeletal_mortarman' } })],
  [n('rain_of_bones', 'Grave Legion', '100% more maximum archers.', [mod('minionMaxCount', 'more', 1)]),
    n('drumming_rain', 'Rain of Bones', 'Archers learn Rain of Bones, firing an arrow volley over an area (8s cooldown).', undefined,
      { summon: { crewSkills: ['skeletal_arrowfall'] } }),
    n('cruel_rain', 'Fanned Volley', 'Archers fire 2 additional projectiles, and mortars and Rain of Bones gain 2 additional strikes.', undefined,
      { summon: { crewMods: [mod('projectileCount', 'flat', 2, ['attack', 'projectile']), mod('stormCount', 'flat', 2, ['attack', 'storm'])] } })],
], [
  n('unstrung_sorcery', 'Unstrung Sorcery', 'Replaces archers with skeletal bolt casters of random elements (fire, cold, lightning, or venom).', undefined,
    { summon: { pool: SKELETAL_SCHOOLS.map(s => ({ id: s.monster, weight: 1, tags: [s.type] })) } }),
  [n('volatile_souls', 'Gathered Malice', 'Every 4th bolt cast by a mage deals 100% more damage, has increased projectile size, and inflicts 4 seconds of elemental damage over time.', undefined,
    { summon: { crewRules: SKELETAL_SCHOOLS.map(s => ({ monsterIds: [s.monster], replace: [{ from: 'skeletal_' + s.type + '_bolt', to: 'skeletal_volatile_' + s.type }] })) } }),
    n('ember_souls', 'Ember Souls', 'Adds fire mages to your summon pool and teaches them Fire Nova (7s cooldown).', undefined, lesson('fire')),
    n('rime_souls', 'Rime Souls', 'Adds cold mages to your summon pool and teaches them Frost Nova (7s cooldown).', undefined, lesson('cold'))],
  [n('unstable_current', 'Grave Tempests', 'Mages learn a 3-second channeled area spell matching their element: Rain of Fire, Blizzard, Thunderhead, or Venom Rain (10s cooldown).', undefined,
    { summon: { crewRules: SKELETAL_SCHOOLS.map(s => ({ monsterIds: [s.monster], skills: ['skeletal_weather_' + s.type] })) } }),
    n('storm_souls', 'Storm Souls', 'Adds lightning mages to your summon pool and teaches them Lightning Nova (7s cooldown).', undefined, lesson('lightning')),
    n('venom_souls', 'Venom Souls', 'Adds venom mages to your summon pool and teaches them Poison Nova (7s cooldown).', undefined, lesson('chaos'))],
], n('remembered_training', 'Remembered Training', '25% increased minion damage.', [damage(0.25)]));
