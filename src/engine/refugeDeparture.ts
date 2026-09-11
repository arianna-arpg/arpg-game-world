import type { Actor } from './actor';

/** Visual departures are independent of death, rewards and AI. New cover kinds
 * can choose a motion without adding creature-specific behavior. */
export const REFUGE_DEPARTURES: Record<string, { duration: number; rise: number; shrink: number; fx: string }> = {
  tree: { duration: 0.8, rise: 62, shrink: 0.55, fx: 'scramble' },
  brush: { duration: 0.55, rise: -5, shrink: 0.8, fx: 'scramble' },
  water: { duration: 0.65, rise: -12, shrink: 0.9, fx: 'plunge' },
  prism_pool: { duration: 0.65, rise: -12, shrink: 0.9, fx: 'plunge' },
};
export const REFUGE_FALLBACK = { duration: 0.6, rise: 0, shrink: 0.7, fx: 'scramble' };

export interface RefugeDeparture {
  body: Pick<Actor, 'shape' | 'radius' | 'color' | 'material' | 'adorn' | 'look'>;
  target: { x: number; y: number };
  facing: number;
  rise: number;
  shrink: number;
  fx: string;
}

export function refugeDeparture(actor: Actor, target: { x: number; y: number }) {
  const motion = REFUGE_DEPARTURES[actor.refuge?.kind ?? ''] ?? REFUGE_FALLBACK;
  const { shape, radius, color, material, adorn, look } = actor;
  return { duration: motion.duration, cue: {
    body: { shape, radius, color, material, adorn, look }, target: { x: target.x, y: target.y },
    facing: actor.facing, rise: motion.rise, shrink: motion.shrink, fx: actor.refuge?.fx ?? motion.fx,
  } satisfies RefugeDeparture };
}
