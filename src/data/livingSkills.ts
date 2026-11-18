import type { SkillDef } from '../engine/skills';

/** Shared trail payloads: normal damage, status, attribution and scaling. */
export const LIVING_SKILLS: Record<string, SkillDef> = {
  cinderstep_trace: {
    id: 'cinderstep_trace', name: 'Cinderstep Trail',
    description: 'Leave a brief patch of fire behind you that deals fire damage and has a 25% chance to burn enemies.',
    tags: ['spell', 'fire', 'aoe', 'duration'], color: '#ff843d',
    manaCost: 0, cooldown: 0, useTime: 0, noDrop: true,
    delivery: { type: 'nova', radius: 32 },
    baseDamage: { fire: [4, 7] },
    effects: [{ type: 'damage' }, { type: 'status', status: 'burn', chance: 0.25 }],
  },
  rimeglass_trace: {
    id: 'rimeglass_trace', name: 'Rimeglass Trail',
    description: 'Leave a brief patch of frost behind you that deals cold damage and has a 50% chance to chill enemies.',
    tags: ['spell', 'cold', 'aoe', 'duration'], color: '#96dafa',
    manaCost: 0, cooldown: 0, useTime: 0, noDrop: true,
    delivery: { type: 'nova', radius: 34 },
    baseDamage: { cold: [2, 4] },
    effects: [{ type: 'damage' }, { type: 'status', status: 'chill', chance: 0.5 }],
  },
};
