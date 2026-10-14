import type { Actor } from './actor';
import { dist } from '../core/math';
import { MONSTERS } from '../data/monsters';

export const MINION_PREY_CFG = { contactGap: 48, keeperReach: 160 };

/** Only unarmed ambient prey is incidental. A crab, elk, armed variant or
 * enemy summon remains an ordinary opponent; wild predators keep hunting. */
export function incidentalMinionPrey(actor: Actor, target: Actor): boolean {
  if (!actor.owner || actor.team !== 'player' || target.tag !== 'critter'
    || target.owner || target.construct || target.taunt) return false;
  const def = target.defId ? MONSTERS[target.defId] : undefined;
  return !!def && def.skills.length === 0 && !target.skills.some(Boolean);
}

/** Idle opportunism at the keeper's side, never a licence to follow a fleeing
 * animal across the map. Explicitly pinned assault orders bypass this gate. */
export function minionPreyInReach(actor: Actor, target: Actor): boolean {
  return !incidentalMinionPrey(actor, target)
    || (dist(actor.pos, target.pos) <= actor.radius + target.radius + MINION_PREY_CFG.contactGap
      && dist(actor.owner!.pos, target.pos) <= MINION_PREY_CFG.keeperReach);
}
