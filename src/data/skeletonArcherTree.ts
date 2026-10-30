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
  n('rattling_bows', 'Barbed Bones', 'Commit to physical archers. Their hits apply Lodged Splinters: each stack increases subsequent skeletal arrow and mortar physical damage by 4%, up to 30 stacks. Each stack lasts 5 seconds independently.', undefined,
    { tags: { add: ['physical'] }, summon: { monsterId: 'skeleton_archer', crewRules: [{ monsterIds: ['skeleton_archer'], replace: [{ from: 'bone_arrow', to: 'skeletal_rattling_arrow' }] }] } }),
  [n('ranked_bows', 'Rising Ranks', `Channel a growing firing squad on your flanks. The first archer rises after ${SKELETAL_FORMATION_TUNING.windup} seconds, then one every ${SKELETAL_FORMATION_TUNING.interval} seconds, scaled by cast speed, up to your summon cap. They fire immediately on arrival, along your facing, and attack 50% faster while channeled. Hold without a time limit; all crumble when the channel ends. Costs ${Math.round(SKELETAL_FORMATION_TUNING.manaCostReduction * 100)}% less mana per beat.`, [mod('manaCost', 'more', -SKELETAL_FORMATION_TUNING.manaCostReduction)],
    { tags: { add: ['channel'] }, summon: { channelFormation: { channel: { interval: SKELETAL_FORMATION_TUNING.interval, windup: SKELETAL_FORMATION_TUNING.windup, move: 'immobile', trackAim: true, cooldownOnEnd: true }, spacing: 36, reach: 470, fireOnArrival: true, attackSpeedMore: SKELETAL_FORMATION_TUNING.attackSpeedMore, emerge: { motion: 'rise', life: 0.35, hold: false } } } }),
    n('endless_quivers', 'Parting Volley', 'Releasing a full firing squad makes every archer loose one final arrow at three times damage and twice the size. Mortarmen instead fire an empowered shell.', undefined,
      { summon: { channelFormationRelease: { power: 3, size: 2 } } }),
    n('piercing_bones', 'Bone Mortars', 'Replace arrows with lobbed bone mortars that explode over a marked area. The final full-squad volley also uses mortars.', undefined,
      { summon: { monsterId: 'skeletal_mortarman' } })],
  [n('rain_of_bones', 'Grave Legion', 'Double your maximum archer count, including capacity gained from other sources. Each summon still raises one archer.', [mod('minionMaxCount', 'more', 1)]),
    n('drumming_rain', 'Rain of Bones', 'Teach archers Rain of Bones, an area arrow rain on an 8-second cooldown. The firing squad can also use it. Supports apply to each compatible crew ability separately.', undefined,
      { summon: { crewSkills: ['skeletal_arrowfall'] } }),
    n('cruel_rain', 'Fanned Volley', 'Archers fire two additional projectiles, retaining the central straight shot. Mortars and Rain of Bones gain two additional strikes.', undefined,
      { summon: { crewMods: [mod('projectileCount', 'flat', 2, ['attack', 'projectile']), mod('stormCount', 'flat', 2, ['attack', 'storm'])] } })],
], [
  n('unstrung_sorcery', 'Unstrung Sorcery', 'Replace archers with random fire, cold, lightning or venom bolt casters. Retain the base summon count and cap. Element choices form a shared selection pool.', undefined,
    { summon: { pool: SKELETAL_SCHOOLS.map(s => ({ id: s.monster, weight: 1, tags: [s.type] })) } }),
  [n('volatile_souls', 'Gathered Malice', 'Every fourth completed bolt is empowered: double damage, a larger projectile and four seconds of damage over time in its own element. Each mage keeps its own cast cycle.', undefined,
    { summon: { crewRules: SKELETAL_SCHOOLS.map(s => ({ monsterIds: [s.monster], replace: [{ from: 'skeletal_' + s.type + '_bolt', to: 'skeletal_volatile_' + s.type }] })) } }),
    n('ember_souls', 'Ember Souls', 'Select fire mages and teach them Fire Nova on a 7-second cooldown. Multiple selections combine into one random pool.', undefined, lesson('fire')),
    n('rime_souls', 'Rime Souls', 'Select cold mages and teach them Frost Nova on a 7-second cooldown. Combines with other element selections.', undefined, lesson('cold'))],
  [n('unstable_current', 'Grave Tempests', 'Mages learn a sustained, three-second area channel of their own element: Rain of Fire, Blizzard, Thunderhead or Venom Rain. Each has a 10-second recovery after channeling.', undefined,
    { summon: { crewRules: SKELETAL_SCHOOLS.map(s => ({ monsterIds: [s.monster], skills: ['skeletal_weather_' + s.type] })) } }),
    n('storm_souls', 'Storm Souls', 'Select lightning mages and teach them Lightning Nova on a 7-second cooldown. Combines with other element selections.', undefined, lesson('lightning')),
    n('venom_souls', 'Venom Souls', 'Select venom mages and teach them Poison Nova on a 7-second cooldown. Combines with other element selections.', undefined, lesson('chaos'))],
], n('remembered_training', 'Remembered Training', '25% increased minion damage for either bows or spells.', [damage(0.25)]));
