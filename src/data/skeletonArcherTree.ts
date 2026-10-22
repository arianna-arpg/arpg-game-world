import { tree, n, damage } from './skillTreeBuilder';
import { SKELETAL_SCHOOLS } from './skeletonArcherSkills';
import { mod } from '../engine/stats';

const lesson = (type: string) => {
  const school = SKELETAL_SCHOOLS.find(s => s.type === type)!;
  return { summon: { selectPool: [school.monster], crewRules: [{ monsterIds: [school.monster], skills: ['skeletal_nova_' + type] }] } };
};
export const SKELETON_ARCHER_TREE = tree([
  n('rattling_bows', 'Rattling Bows', 'Commit to physical archers. Their hits lodge Rattled Bones: each stack increases subsequent skeletal arrow and mortar physical damage by 4%, up to 30 stacks. Each stack lasts 5 seconds independently.', undefined,
    { tags: { add: ['physical'] }, summon: { monsterId: 'skeleton_archer', crewRules: [{ monsterIds: ['skeleton_archer'], replace: [{ from: 'bone_arrow', to: 'skeletal_rattling_arrow' }] }] } }),
  [n('ranked_bows', 'Ranked Bows', 'Channel a growing firing squad on your flanks. One archer rises every 1.2 seconds up to your summon cap, firing along your facing. Hold without a time limit; all crumble when the channel ends. Costs 80% less mana per beat.', [mod('manaCost', 'more', -0.8)],
    { tags: { add: ['channel'] }, summon: { channelFormation: { channel: { interval: 1.2, windup: 0.25, move: 'immobile', trackAim: true, cooldownOnEnd: true }, spacing: 36, reach: 470, emerge: { motion: 'rise', life: 0.35, hold: false } } } }),
    n('endless_quivers', 'Endless Quivers', 'Releasing a full firing squad makes every archer loose one final arrow at three times damage and twice the size. Mortarmen instead fire an empowered shell.', undefined,
      { summon: { channelFormationRelease: { power: 3, size: 2 } } }),
    n('piercing_bones', 'Piercing Bones', 'Replace arrows with lobbed bone mortars that explode over a marked area. The final full-squad volley also uses mortars.', undefined,
      { summon: { monsterId: 'skeletal_mortarman' } })],
  [n('rain_of_bones', 'Rain of Bones', 'Double your maximum archer count, including capacity gained from other sources. Each summon still raises one archer.', [mod('minionMaxCount', 'more', 1)]),
    n('drumming_rain', 'Drumming Rain', 'Teach archers Rain of Bones, an area arrow rain on an 8-second cooldown. The firing squad can also use it. Supports apply to each compatible crew ability separately.', undefined,
      { summon: { crewSkills: ['skeletal_arrowfall'] } }),
    n('cruel_rain', 'Forked Quivers', 'Archers fire two additional projectiles, retaining the central straight shot. Mortars and Rain of Bones gain two additional strikes.', undefined,
      { summon: { crewMods: [mod('projectileCount', 'flat', 2, ['attack', 'projectile']), mod('stormCount', 'flat', 2, ['attack', 'storm'])] } })],
], [
  n('unstrung_sorcery', 'Unstrung Sorcery', 'Replace archers with random fire, cold, lightning or venom bolt casters. Retain the base summon count and cap. Element choices form a shared selection pool.', undefined,
    { summon: { pool: SKELETAL_SCHOOLS.map(s => ({ id: s.monster, weight: 1, tags: [s.type] })) } }),
  [n('volatile_souls', 'Volatile Souls', 'Every fourth completed bolt is empowered: double damage, a larger projectile and four seconds of damage over time in its own element. Each mage keeps its own cast cycle.', undefined,
    { summon: { crewRules: SKELETAL_SCHOOLS.map(s => ({ monsterIds: [s.monster], replace: [{ from: 'skeletal_' + s.type + '_bolt', to: 'skeletal_volatile_' + s.type }] })) } }),
    n('ember_souls', 'Ember Souls', 'Select fire mages and teach them Fire Nova on a 7-second cooldown. Multiple selections combine into one random pool.', undefined, lesson('fire')),
    n('rime_souls', 'Rime Souls', 'Select cold mages and teach them Frost Nova on a 7-second cooldown. Combines with other element selections.', undefined, lesson('cold'))],
  [n('unstable_current', 'Unstable Current', 'Mages learn a sustained, three-second area channel of their own element: Rain of Fire, Blizzard, Thunderhead or Venom Rain. Each has a 10-second recovery after channeling.', undefined,
    { summon: { crewRules: SKELETAL_SCHOOLS.map(s => ({ monsterIds: [s.monster], skills: ['skeletal_weather_' + s.type] })) } }),
    n('storm_souls', 'Storm Souls', 'Select lightning mages and teach them Lightning Nova on a 7-second cooldown. Combines with other element selections.', undefined, lesson('lightning')),
    n('venom_souls', 'Venom Souls', 'Select venom mages and teach them Poison Nova on a 7-second cooldown. Combines with other element selections.', undefined, lesson('chaos'))],
], n('remembered_training', 'Remembered Training', '25% increased minion damage for either bows or spells.', [damage(0.25)]));
