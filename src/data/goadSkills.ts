import type { SkillDef } from '../engine/skills';
export const GOAD_SKILLS: Record<string, SkillDef> = {
  goad_device_call: {
    id: 'goad_device_call', name: 'Effigy’s Challenge', description: 'The effigy calls nearby enemies to attack it.',
    tags: ['warcry', 'aoe'], noDrop: true, color: '#d4ae72', manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'nova', radius: 180, affects: 'enemies' },
    effects: [{ type: 'status', status: 'taunted', chance: 1, durationOverride: 1.5 }],
  },
};
