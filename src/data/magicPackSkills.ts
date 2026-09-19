import type { SkillDef } from '../engine/skills';

/** Ordinary attributed spell payloads. The pack conductor owns geometry/timing;
 * the existing hit pipeline owns mitigation, wards, statuses and kill credit. */
export const MAGIC_PACK_SKILLS: Record<string, SkillDef> = {
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
