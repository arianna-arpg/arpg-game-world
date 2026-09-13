import type { SkillDef } from '../engine/skills';

/** Device management is a meta action of one deployed skill instance. */
export const WORKSHOP_SKILLS: Record<string, SkillDef> = {
  relocate_workshop: {
    id: 'relocate_workshop', name: 'Reposition Workshop', noDrop: true,
    description: 'Move the nearest living totem or sentry from this exact skill within 600 units to your aim, limited by its normal placement range. It keeps its health, remaining lifetime and action clocks. Its current cast is cancelled. Only devices on your story qualify.',
    tags: ['spell'], color: '#c6ad80',
    manaCost: 6, cooldown: 4, useTime: 0,
    delivery: { type: 'self' },
    effects: [{ type: 'relocateConstruct', radius: 600 }],
  },
};
