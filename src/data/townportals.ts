import { START_ZONE } from './zones';
import type { SkillDef } from '../engine/skills';

/** Presentation, cast and travel policy: no scroll economy or fixed town id
 *  in the engine. A run may override destination through its saved state. */
export const TOWN_PORTAL_CFG = {
  destination: START_ZONE,
  skillId: 'town_portal',
  castSeconds: 0.8,
  cooldown: 1,
  dwellSeconds: 0.65,
  reach: 34,
  spawnOffset: 64,
  arrivalOffset: { x: 110, y: 80 },
  consumeOnReturn: true,
  color: '#83cfff',
  visual: { radius: 22, height: 34, lineWidth: 3, labelLift: 48 },
  button: { right: 22, bottom: 126, size: 42 },
};

export const TOWN_PORTAL_SKILL: SkillDef = {
  id: TOWN_PORTAL_CFG.skillId, name: 'Town Portal',
  description: 'Open a passage to your town. Linger at it to travel; use the town-side passage to return.',
  tags: ['spell'], color: TOWN_PORTAL_CFG.color,
  manaCost: 0, cooldown: TOWN_PORTAL_CFG.cooldown, useTime: TOWN_PORTAL_CFG.castSeconds,
  delivery: { type: 'self' }, effects: [{ type: 'townPortal' }], noDrop: true,
};
