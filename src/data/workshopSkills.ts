import type { SkillDef } from '../engine/skills';

/** Device management is a meta action of one deployed skill instance. */
export const WORKSHOP_SKILLS: Record<string, SkillDef> = {
  relocate_workshop: {
    id: 'relocate_workshop', name: 'Reposition Workshop', noDrop: true,
    description: 'Move the nearest active totem or sentry created by this skill within 600 range to your target location, limited by its normal placement range. It keeps its current health and remaining duration while canceling its active cast.',
    tags: ['spell'], color: '#c6ad80',
    manaCost: 6, cooldown: 4, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'relocateConstruct', radius: 600 }],
  },
};
