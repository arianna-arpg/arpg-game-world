import type { SkillDef } from '../engine/skills';

/** Ordinary attributed spell payloads. The pack conductor owns geometry/timing;
 * the existing hit pipeline owns mitigation, wards, statuses and kill credit. */
export const MAGIC_PACK_SKILLS: Record<string, SkillDef> = {
  magic_pack_footfall: {
    id: 'magic_pack_footfall', name: 'Ground Echo', color: '#dfb782', noDrop: true,
    description: 'A fixed, warned footprint erupts where a foe stood.',
    tags: ['spell', 'aoe', 'physical'], manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [4, 6] }, effects: [{ type: 'damage' }],
    delivery: { type: 'ground', radius: 65, castRange: 420, delay: 0 },
  },
  magic_pack_scattershock: {
    id: 'magic_pack_scattershock', name: 'Repelling Pulse', color: '#a8dfdf', noDrop: true,
    description: 'A planted caster releases a warned pulse that pushes nearby foes away.',
    tags: ['spell', 'aoe', 'physical'], manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [2, 3] }, effects: [{ type: 'damage' }, { type: 'knockback', strength: 85 }],
    delivery: { type: 'ground', radius: 110, castRange: 420, delay: 0 },
  },
  magic_pack_blast: {
    id: 'magic_pack_blast', name: 'Living Blast', color: '#ff9566', noDrop: true,
    description: 'A living pack member vents a warned blast and ignites nearby allies.',
    tags: ['spell', 'aoe', 'fire'], manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [7, 11] }, effects: [{ type: 'damage' }],
    delivery: { type: 'ground', radius: 105, castRange: 600, delay: 0 },
  },
  magic_pack_ritual: {
    id: 'magic_pack_ritual', name: 'Triad Eruption', color: '#ee91cc', noDrop: true,
    description: 'A warned ritual erupts inside three cooperating pack members.',
    tags: ['spell', 'aoe', 'chaos'], manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { chaos: [10, 15] }, effects: [{ type: 'damage' }],
    delivery: { type: 'ground', radius: 150, castRange: 600, delay: 0 },
  },
  magic_pack_hollow: {
    id: 'magic_pack_hollow', name: 'Hollow Pulse', color: '#9aaaff', noDrop: true,
    description: 'A hollow blast leaves an untouched center inside its danger ring.',
    tags: ['spell', 'aoe', 'cold'], manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { cold: [6, 9] }, effects: [{ type: 'damage' }],
    delivery: { type: 'ground', radius: 175, castRange: 600, delay: 0 },
  },
  magic_pack_arc: {
    id: 'magic_pack_arc', name: 'Pack Arc', color: '#94eaff', noDrop: true,
    description: 'A warned pulse travels between two members of an arc-linked pack.',
    tags: ['spell', 'aoe', 'lightning'], manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { lightning: [8, 12] }, effects: [{ type: 'damage' }],
    delivery: { type: 'ground', radius: 12, castRange: 600, delay: 0 },
  },
  magic_pack_gravewheel: {
    id: 'magic_pack_gravewheel', name: 'Gravewheel', color: '#cc93ed', noDrop: true,
    description: 'Surviving pack members sustain rotating blades at their fallen allies.',
    tags: ['spell', 'aoe', 'chaos'], manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { chaos: [3, 5] }, effects: [{ type: 'damage' }],
    delivery: { type: 'ground', radius: 12, castRange: 600, delay: 0 },
  },
};
