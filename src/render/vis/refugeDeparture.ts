import type { RefugeDeparture } from '../../engine/refugeDeparture';
import { bodySprite, spriteHalf, shapeIsOriented } from './body';

/** Pose the actual creature's baked body; only the visual moves after escape. */
export function drawRefugeDeparture(ctx: CanvasRenderingContext2D,
  from: { x: number; y: number }, cue: RefugeDeparture, progress: number): void {
  const k = Math.max(0, Math.min(1, progress));
  const approach = Math.min(1, k / 0.4);
  const climb = k * k;
  const size = 1 - cue.shrink * climb;
  const x = from.x + (cue.target.x - from.x) * approach;
  const y = from.y + (cue.target.y - from.y) * approach - cue.rise * climb;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = Math.min(1, (1 - k) * 3);
  ctx.scale(size, size);
  if (cue.body.look || shapeIsOriented(cue.body.shape)) {
    const angle = cue.rise > 0 ? -Math.PI / 2 : cue.facing;
    ctx.rotate(angle + (cue.rise > 0 ? Math.sin(k * Math.PI * 10) * 0.12 : 0));
  }
  const half = spriteHalf(cue.body.radius);
  ctx.drawImage(bodySprite(cue.body), -half, -half);
  ctx.restore();
}
