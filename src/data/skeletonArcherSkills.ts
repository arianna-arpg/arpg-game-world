import type { SkillDef, SkillEffect } from '../engine/skills';
import type { DamageType } from '../engine/stats';

/** Shared school rows keep the pool, lessons and visuals in agreement. */
export const SKELETAL_SCHOOLS: { monster: string; type: DamageType; color: string; status: string; novaStatus: string; title: string; fx?: string }[] = [
  { monster: 'skeletal_pyromancer', type: 'fire', color: '#ed985a', status: 'soul_burn', novaStatus: 'burn', title: 'Rain of Fire', fx: 'comet' },
  { monster: 'skeletal_cryomancer', type: 'cold', color: '#8bd6ed', status: 'soul_frost', novaStatus: 'chill', title: 'Blizzard', fx: 'shatter' },
  { monster: 'skeletal_stormcaller', type: 'lightning', color: '#c5b6fa', status: 'soul_shock', novaStatus: 'shock', title: 'Thunderhead' },
  { monster: 'skeletal_venomancer', type: 'chaos', color: '#a8ce72', status: 'soul_venom', novaStatus: 'poison', title: 'Venom Rain', fx: 'sporeburst' },
];
const rattling: SkillEffect[] = [{ type: 'damage' }, { type: 'status', status: 'rattled_bones', chance: 1 }];
export const SKELETON_ARCHER_SKILLS: Record<string, SkillDef> = {
  skeletal_rattling_arrow: {
    id: 'skeletal_rattling_arrow', name: 'Rattling Arrow', noDrop: true,
    description: 'A bone arrow leaves an independently expiring physical vulnerability.',
    tags: ['attack', 'projectile', 'physical'], color: '#d8d0b0',
    manaCost: 0, cooldown: 0, useTime: 1.1, baseDamage: { physical: [6, 10] },
    delivery: { type: 'projectile', speed: 420, radius: 6, range: 520 },
    effects: rattling, ai: { range: 470, weight: 2, keepDistance: 280 },
  },
  skeletal_bombardment: {
    id: 'skeletal_bombardment', name: 'Bone Mortar', noDrop: true,
    description: 'Lob a heavy bone shell that bursts over a marked patch of ground.',
    tags: ['attack', 'projectile', 'physical', 'aoe', 'storm'], color: '#d8d0b0',
    manaCost: 0, cooldown: 0, useTime: 1.4, baseDamage: { physical: [9, 15] },
    delivery: { type: 'storm', count: 1, interval: 0, areaRadius: 0, hitRadius: 65, castRange: 520, telegraph: 0.65, lob: { arc: 0.4 }, fx: 'blast' },
    effects: rattling, ai: { range: 470, weight: 2, keepDistance: 280 },
  },
};
for (const school of SKELETAL_SCHOOLS) {
  const { type, color, status } = school;
  const boltId = 'skeletal_volatile_' + type;
  SKELETON_ARCHER_SKILLS[boltId] = {
    id: boltId, name: 'Volatile ' + type + ' Bolt', description: 'Every fourth bolt is larger, deals double damage and leaves four seconds of elemental damage over time.', noDrop: true,
    tags: ['spell', 'projectile', type, 'duration'], color,
    manaCost: 0, cooldown: 0, useTime: 1.1, baseDamage: { [type]: [6, 10] },
    delivery: { type: 'projectile', speed: 380, radius: 7, range: 500 },
    effects: [{ type: 'damage' }],
    castSequence: { every: 4, power: 2, size: 1.8, effects: [{ type: 'status', status, chance: 1, magnitude: 0.35 }] },
    ai: { range: 450, weight: 2, keepDistance: 270 },
  };
  const novaId = 'skeletal_nova_' + type;
  SKELETON_ARCHER_SKILLS[novaId] = {
    id: novaId, name: 'Skeletal ' + (type === 'chaos' ? 'Poison' : type === 'cold' ? 'Frost' : type[0].toUpperCase() + type.slice(1)) + ' Nova',
    description: "An intermittent nova of the mage's own element.", noDrop: true,
    tags: ['spell', 'aoe', type], color, manaCost: 0, cooldown: 7, useTime: 0.5,
    baseDamage: { [type]: [9, 15] }, delivery: { type: 'nova', radius: 190 },
    effects: [{ type: 'damage' }, { type: 'status', status: school.novaStatus, chance: 1 }],
    ai: { range: 180, weight: 7 },
  };
  const fieldId = 'skeletal_weather_' + type;
  SKELETON_ARCHER_SKILLS[fieldId] = {
    id: fieldId, name: school.title, description: 'Channel a sustained elemental bombardment at a fixed target area for three seconds.', noDrop: true,
    tags: ['spell', 'aoe', 'storm', 'channel', 'duration', type], color,
    manaCost: 0, cooldown: 10, useTime: 0, castMode: 'channel',
    channel: { interval: 0.5, windup: 0.35, move: 'immobile', trackAim: false, maxHold: 3, aiHold: 3, cooldownOnEnd: true },
    baseDamage: { [type]: [3, 5] },
    delivery: { type: 'storm', count: [2, 3], interval: 0.08, areaRadius: 100, hitRadius: 42, castRange: 460, telegraph: 0.15, fx: school.fx },
    effects: [{ type: 'damage' }], ai: { range: 430, weight: 6, keepDistance: 270 },
  };
}
