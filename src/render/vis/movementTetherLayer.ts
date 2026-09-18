import type { Actor } from '../../engine/actor';
import { MOVEMENT_TETHER_CFG, movementTetherDistance } from '../../engine/movementTether';

/** Draw inside the actor's visibility gates, before its body. The cord is
 * cosmetic; its endpoints and tension come from authoritative simulation. */
export function drawMovementTether(ctx: CanvasRenderingContext2D, a: Actor, time: number): void {
  const t = a.movementTether;
  if (!t || t.released || a.dead) return;
  const s = t.spec, p = t.point, q = a.pos;
  const tension = Math.min(1, movementTetherDistance(t, q) / s.length);
  const color = s.color ?? MOVEMENT_TETHER_CFG.color;
  const size = s.anchorSize ?? MOVEMENT_TETHER_CFG.anchorSize;
  const width = s.width ?? MOVEMENT_TETHER_CFG.width;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = '#252622'; ctx.lineWidth = 2;
  // A grounded root crown, grave marker or iron stake makes the origin legible.
  if (t.anchorId === undefined) {
    ctx.beginPath();
    if (s.style === 'vine') {
      for (let i = 0; i < 6; i++) {
        const r = i * Math.PI / 3;
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(r) * size, p.y + Math.sin(r) * size * 0.6);
      }
    } else if (s.style === 'spirit') {
      ctx.roundRect(p.x - size * 0.6, p.y - size * 1.5, size * 1.2, size * 1.7, size * 0.3);
      ctx.fill();
    } else {
      ctx.moveTo(p.x, p.y + size * 0.4); ctx.lineTo(p.x, p.y - size);
      ctx.moveTo(p.x - size * 0.5, p.y - size * 0.6); ctx.lineTo(p.x + size * 0.5, p.y - size * 0.6);
    }
    ctx.stroke();
  }
  const sag = (1 - tension) * Math.min(32, s.length * 0.12);
  ctx.beginPath(); ctx.moveTo(p.x, p.y);
  ctx.quadraticCurveTo((p.x + q.x) / 2, (p.y + q.y) / 2 + sag, q.x, q.y);
  ctx.lineWidth = width + 2; ctx.strokeStyle = '#192017'; ctx.globalAlpha = 0.7; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.globalAlpha = t.returning ? 1 : 0.65 + tension * 0.3;
  if (s.style === 'chain') ctx.setLineDash([5, 3]);
  if (s.style === 'spirit') {
    ctx.setLineDash([10, 5]); ctx.lineDashOffset = -time * 20;
  }
  ctx.stroke();
  ctx.restore();
}
