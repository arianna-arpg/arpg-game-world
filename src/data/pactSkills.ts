import type { SkillDef } from '../engine/skills';

/** Familiar arts use the ordinary ally-targeting AI and projectile pipeline. */
export const PACT_SKILLS: Record<string, SkillDef> = {
  pact_mend: {
    id: 'pact_mend', name: 'Pact Mend', description: 'Mend a wounded ally for 8 life plus 2.5% of their maximum life.', noDrop: true,
    tags: ['spell', 'heal', 'targeted'], color: '#b4b6ec', manaCost: 8, cooldown: 4, useTime: 0.5,
    targeting: { target: 'ally', castRange: 260, fallback: 'self' }, delivery: { type: 'target' },
    effects: [{ type: 'heal', amount: 8, pctMax: 0.025 }], ai: { range: 260, weight: 2, keepDistance: 220 },
  },
  pact_lance: {
    id: 'pact_lance', name: 'Rift Lance', description: 'A swift chaos lance pierces two enemies and can unravel them.', noDrop: true,
    tags: ['spell', 'projectile', 'chaos'], color: '#a39cde', manaCost: 7, cooldown: 0, useTime: 0.75,
    baseDamage: { chaos: [9, 14] }, delivery: { type: 'projectile', speed: 480, radius: 8, range: 500, pierce: 2 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'unravelling', chance: 0.45, magnitude: 0.6 }],
    ai: { range: 460, weight: 2, keepDistance: 260 },
  },
};
