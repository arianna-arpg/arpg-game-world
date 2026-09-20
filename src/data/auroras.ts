import { registerAurora } from '../engine/auroraSpec';
import type { SkillDef } from '../engine/skills';

registerAurora({
  id: 'pall', name: 'Pall Aurora',
  description: 'Pale bubbles gather, cascade outward near enemies, then replenish. Capacity stacks; chaos, projectile and aurora damage scale their hits.',
  skill: 'aurora_pall', tags: ['aurora', 'aurora:pall', 'chaos', 'projectile'],
  recharge: 0.65, cascade: 0.1, ready: 0.4, range: 300,
  orbit: 24, ringSpacing: 15, perRing: 8, turnSpeed: 0.35,
  color: '#b8b8ec', orbPaint: { fill: 0.08, rim: 0.46 },
});
export const AURORA_SKILLS: Record<string, SkillDef> = {
  aurora_pall: {
    id: 'aurora_pall', name: 'Pall Aurora', noDrop: true,
    description: 'A spent aurora bubble drifts outward and breaks on an enemy.', color: '#b8b8ec',
    tags: ['aurora', 'aurora:pall', 'chaos', 'projectile'],
    manaCost: 0, cooldown: 0, useTime: 0, baseDamage: { chaos: [2, 4] },
    delivery: { type: 'projectile', speed: 190, radius: 6, range: 330,
      orbPaint: { fill: 0.08, rim: 0.46 } },
    effects: [{ type: 'damage' }],
  },
};
