import { shade } from './color';

/** Faceted metal in +X space, shared by body attachments and edge materials. */
export function metalSpikePalette(color: string) {
  return { dark: shade(color, -0.72), shadow: shade(color, -0.38),
    base: color, light: shade(color, 0.65) };
}

export function drawMetalSpike(ctx: CanvasRenderingContext2D, length: number, width: number,
  palette: ReturnType<typeof metalSpikePalette>): void {
  // Dark socket at the entry point makes the shard read lodged, not orbiting.
  ctx.fillStyle = palette.dark;
  ctx.beginPath(); ctx.ellipse(0, 0, width * 0.65, width * 1.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-width * 0.4, -width); ctx.lineTo(length, 0);
  ctx.lineTo(-width * 0.4, width); ctx.closePath();
  ctx.fillStyle = palette.base; ctx.fill();
  ctx.strokeStyle = palette.dark; ctx.lineWidth = Math.max(0.65, width * 0.28); ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = palette.shadow;
  ctx.beginPath(); ctx.moveTo(-width * 0.4, width); ctx.lineTo(length, 0);
  ctx.lineTo(width * 0.2, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = palette.light; ctx.lineWidth = Math.max(0.6, width * 0.23);
  ctx.beginPath(); ctx.moveTo(0, -width * 0.58); ctx.lineTo(length * 0.88, -width * 0.03); ctx.stroke();
}
