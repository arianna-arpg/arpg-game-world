import { MOVEMENT_VISUAL_STYLE as C } from '../data/skillMovementVisuals';
/** Paint-only history: no actor references, destination predictions or combat data. */
export interface MovementTrail {
  skillId: string; clock: number; progress: number;
  points: { x: number; y: number; at: number }[];
}
export function extendMovementTrail(trail: MovementTrail, from: { x: number; y: number }, to: { x: number; y: number }, clock: number, progress: number): void {
  trail.clock = clock; trail.progress = progress;
  trail.points = trail.points.filter(p => clock - p.at <= C.tailSeconds);
  if (!trail.points.length) trail.points.push({ ...from, at: clock });
  trail.points.push({ ...to, at: clock });
  if (trail.points.length > C.maxPoints) trail.points.splice(0, trail.points.length - C.maxPoints);
}
export function cloneMovementTrail(trail?: MovementTrail): MovementTrail | undefined {
  return trail && { ...trail, points: trail.points.map(p => ({ ...p })) };
}
