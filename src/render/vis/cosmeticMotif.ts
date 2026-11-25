import type { CosmeticMotif } from '../../engine/cosmetics';

export function drawCosmeticMotif(ctx: CanvasRenderingContext2D, motif: CosmeticMotif, color: string,
  x: number, y: number, radius: number, phase = 0): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(phase); ctx.fillStyle = color;
  ctx.beginPath();
  if (motif === 'stars') {
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4, r = i % 2 ? radius * 0.26 : radius;
      if (!i) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath(); ctx.fill();
  } else if (motif === 'petals') {
    for (let i = 0; i < 5; i++) {
      ctx.rotate(Math.PI * 2 / 5); ctx.beginPath();
      ctx.ellipse(radius * 0.48, 0, radius * 0.55, radius * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff2d2'; ctx.beginPath(); ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.moveTo(0, -radius); ctx.quadraticCurveTo(radius, radius * 0.2, 0, radius);
    ctx.quadraticCurveTo(-radius * 0.8, radius * 0.2, 0, -radius); ctx.fill();
  }
  ctx.restore();
}
