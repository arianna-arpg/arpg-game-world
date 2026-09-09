import type { SkillDef } from '../engine/skills';

export const REACTIVE_SKILLS: Record<string, SkillDef> = {
  lattice_discharge: {
    id: 'lattice_discharge', name: 'Lattice Discharge',
    description: 'Expel a nova of lightning that can Shock nearby enemies.',
    tags: ['spell', 'lightning', 'aoe'], color: '#aee8ff',
    manaCost: 0, cooldown: 0, useTime: 0, noDrop: true,
    delivery: { type: 'nova', radius: 140 }, baseDamage: { lightning: [6, 19] },
    effects: [{ type: 'damage' }, { type: 'status', status: 'shock', chance: 0.6 }],
  },
  galewright_twister: {
    id: 'galewright_twister', name: 'Galewright Twister',
    description: 'A brief wandering twister caroms off enemies and rebounds from walls.',
    tags: ['spell', 'projectile', 'physical', 'duration'], color: '#b8dfd5',
    manaCost: 0, cooldown: 0, useTime: 0, noDrop: true,
    delivery: { type: 'projectile', shape: 'vortex', speed: 260, radius: 17, range: 1200, duration: 3.5,
      trajectory: { bounce: 5, caromOnHit: 1, erratic: 0.6 } },
    baseDamage: { physical: [5, 9] },
    effects: [{ type: 'damage' }, { type: 'knockback', strength: 55 }],
  },
};
