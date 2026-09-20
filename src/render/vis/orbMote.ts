import type { OrbPaint } from '../../engine/skills';

/** Shared by carried motes and released projectiles; no family-ID branches. */
export function drawOrbMote(ctx: CanvasRenderingContext2D, x: number, y: number,
  radius: number, color: string, paint: OrbPaint, time: number): void {
  ctx.save(); ctx.translate(x, y);
  const alpha = ctx.globalAlpha;
  ctx.fillStyle = ctx.strokeStyle = color; ctx.lineWidth = 1.2;
  ctx.globalAlpha = alpha * paint.fill;
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = alpha * paint.rim; ctx.stroke();
  ctx.beginPath(); ctx.arc(-radius * 0.12, -radius * 0.12, radius * 0.7, 3.5, 4.8); ctx.stroke();
  if (paint.spark) {
    ctx.rotate(time * 2.7); ctx.strokeStyle = '#e3f3ff';
    ctx.beginPath(); ctx.moveTo(-radius * 0.65, -radius * 0.35);
    ctx.lineTo(radius * 0.12, -radius * 0.12); ctx.lineTo(-radius * 0.18, radius * 0.2);
    ctx.lineTo(radius * 0.65, radius * 0.4); ctx.stroke();
  }
  ctx.restore();
}
