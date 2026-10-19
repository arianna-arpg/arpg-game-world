import type { BodyActionPose } from '../../engine/bodyAction';
/** Body and held adorn move together. Caller keeps shadows, ranges, ground
 * effects, meters and collision at their native anchors. */
export function applyBodyActionPose(ctx: CanvasRenderingContext2D, pose: BodyActionPose | undefined, radius: number): void {
  if (!pose) return;
  ctx.translate(Math.cos(pose.facing)*pose.shift*radius, Math.sin(pose.facing)*pose.shift*radius);
  ctx.rotate(pose.facing); ctx.scale(pose.sx,pose.sy); ctx.rotate(-pose.facing);
  ctx.rotate(pose.turn);
}
