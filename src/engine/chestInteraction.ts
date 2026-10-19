import { dist, type Vec2 } from '../core/math';

/** Shared native interaction dials; readouts and the mutation path use one reach. */
export const CHEST_INTERACTION_CFG = { reach: 60, recoveryPerSecond: .6 };
export function chestInReach(chest: { pos: Vec2 }, actor: { pos: Vec2; radius: number }): boolean {
  return dist(chest.pos,actor.pos) <= actor.radius + CHEST_INTERACTION_CFG.reach;
}
