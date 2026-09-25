import { registerEffectVoice, type EffectVoicePainter } from './effectVoice';
import { traceFlashFigure } from './aoeTrace';

/** Paint-only dials for reusable steel silhouettes and directional sweeps. */
export const ATTACK_SEQUENCE_VIS = { bladeReach: 1.3, haft: 1.4, sweepTrail: 0.45, figureAlpha: 0.2, edgeWidth: 3 };

const axe: EffectVoicePainter = (ctx, f, t) => {
  const c = ATTACK_SEQUENCE_VIS;
  ctx.save(); ctx.translate(f.pos.x, f.pos.y); ctx.rotate(f.facing ?? 0);
  ctx.globalAlpha = Math.min(1, t * 2); ctx.strokeStyle = '#806347'; ctx.lineWidth = Math.max(2, f.radius * 0.22);
  ctx.beginPath(); ctx.moveTo(-f.radius * c.haft, 0); ctx.lineTo(f.radius * 0.45, 0); ctx.stroke();
  ctx.fillStyle = f.color; ctx.strokeStyle = '#fff1d4'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(f.radius * 0.1, -f.radius * 0.25);
  ctx.quadraticCurveTo(f.radius * c.bladeReach, -f.radius * c.bladeReach, f.radius, f.radius * 0.75);
  ctx.lineTo(0, f.radius * 0.22); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
};
registerEffectVoice('recoverableAxe', axe);
const sweep = (reverse: boolean): EffectVoicePainter => (ctx, f, t) => {
  const c = ATTACK_SEQUENCE_VIS, dir = reverse ? -1 : 1;
  ctx.save(); ctx.globalAlpha = t * c.figureAlpha; ctx.fillStyle = f.color;
  ctx.beginPath(); traceFlashFigure(ctx, f); ctx.fill();
  const facing = f.facing ?? f.arc?.facing ?? 0;
  const head = dir * (-1 + 2 * (1 - t * t)) * f.radius;
  const tail = head - dir * f.radius * c.sweepTrail;
  const rx = -Math.sin(facing), ry = Math.cos(facing);
  ctx.globalAlpha = t; ctx.strokeStyle = f.color; ctx.lineWidth = c.edgeWidth;
  ctx.beginPath(); ctx.moveTo(f.pos.x + rx * tail, f.pos.y + ry * tail);
  ctx.lineTo(f.pos.x + rx * head, f.pos.y + ry * head); ctx.stroke();
  axe(ctx, { ...f, pos: { x: f.pos.x + rx * head, y: f.pos.y + ry * head }, radius: 9, facing: facing + dir * Math.PI / 2 }, t);
  ctx.restore();
};
registerEffectVoice('serratedSweep', sweep(false));
registerEffectVoice('serratedBackswing', sweep(true));
