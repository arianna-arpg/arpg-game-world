import type { Vec2 } from '../core/math';

/** Optional physical-door intent, independent of transit/dwell menus. */
export interface DoorPressSpec {
  source: string;
  /** Cosine alignment of deliberate walking toward the slab. */
  alignment: number;
  /** Hand reach beyond the native body/door radii. */
  reach: number;
}
export function validateDoorPress(spec: DoorPressSpec): void {
  if (!spec || !spec.source || !Number.isFinite(spec.alignment) || spec.alignment < .5 || spec.alignment > 1
    || !Number.isFinite(spec.reach) || spec.reach < 0 || spec.reach > 26)
    throw Error('Invalid door press policy');
}
export function pressingDoor(spec: DoorPressSpec | undefined, motion: Vec2 | undefined,
  body: { pos: Vec2; radius: number }, door: { pos: Vec2; radius: number }): boolean {
  if (!spec || !motion) return false;
  const dx=door.pos.x-body.pos.x, dy=door.pos.y-body.pos.y;
  const distance=Math.hypot(dx,dy), length=Math.hypot(motion.x,motion.y);
  return length>0 && distance>0 && distance<=door.radius+body.radius+spec.reach
    && (motion.x*dx+motion.y*dy)/(length*distance)>=spec.alignment;
}
