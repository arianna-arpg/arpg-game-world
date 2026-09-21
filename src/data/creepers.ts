import { registerCreeper } from '../engine/creeperSpec';
import type { SkillDef } from '../engine/skills';

registerCreeper({
  id: 'barrow', name: 'Barrow Creeper',
  description: 'A protected burrower roams beside you, pursues nearby enemies and erupts beneath them. Straying prey breaks its pursuit; it returns before hunting again.',
  skill: 'creeper_barrow', tags: ['creeper', 'creeper:barrow', 'physical', 'aoe'],
  bodyRadius: 8, speed: 145, returnSpeed: 235,
  acquire: 210, leash: 270, home: 45, wander: 100,
  wanderMin: 0.65, wanderMax: 1.4, arm: 0.8, windup: 0.3, recovery: 0.9,
  flash: 0.22, recall: 2.5, trailSpacing: 9, trailLife: 0.8,
  color: '#b9c88a', soil: '#80785d',
});
export const CREEPER_SKILLS: Record<string, SkillDef> = {
  creeper_barrow: {
    id: 'creeper_barrow', name: 'Barrow Creeper', noDrop: true,
    description: 'A burrower breaks the ground in a small physical eruption.', color: '#b9c88a',
    tags: ['creeper', 'creeper:barrow', 'physical', 'aoe'],
    manaCost: 0, cooldown: 0, useTime: 0, baseDamage: { physical: [4, 6] },
    delivery: { type: 'ground', radius: 27, delay: 0, castRange: 9999 },
    effects: [{ type: 'damage' }],
  },
};
