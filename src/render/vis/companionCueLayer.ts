import { COMPANION_CUE_CFG as C } from '../../data/companionCues';
import { companionCueStyle, type CompanionCueState, type CompanionCueLink, type CompanionCueFlash } from '../../engine/companionCues';
function stroke(ctx: CanvasRenderingContext2D, color: string, width = C.width) {
  ctx.strokeStyle = C.outline; ctx.lineWidth = width + 2; ctx.stroke(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function collar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, open = 0.5) {
  ctx.beginPath(); ctx.arc(x, y, r, open, Math.PI * 2 - open); stroke(ctx, color);
}
export function drawCompanionCueBody(ctx: CanvasRenderingContext2D, row: CompanionCueState, radius: number, facing: number): void {
  const s = row.stance; if (!s) return;
  const shape = companionCueStyle(s.profile).shape, r = radius + C.bodyPad;
  ctx.save(); ctx.rotate(facing); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
  if (shape === 'hunt') {
    for (const y of [-0.35, 0.35]) { ctx.moveTo(r * .7, y * r); ctx.lineTo(r * 1.1, 0); }
  } else if (shape === 'guard') {
    ctx.moveTo(r * .8, -r * .45); ctx.quadraticCurveTo(r * 1.5, 0, r * .8, r * .45);
  } else if (shape === 'heel') {
    ctx.arc(-r * .8, 0, 4, 0, Math.PI * 2);
  } else ctx.arc(0, 0, r, -.6, .6);
  stroke(ctx, s.color); ctx.restore();
}
export function drawCompanionCueLinks(ctx: CanvasRenderingContext2D, from: { x: number; y: number; radius: number }, l: CompanionCueLink, time: number): void {
  const dx = l.to.x - from.x, dy = l.to.y - from.y, len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len, inset = Math.min(len * .4, from.radius + 4), end = Math.min(len * .4, l.to.radius + 4);
  const alpha = ctx.globalAlpha;
  ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha *= l.kind === 'tame' ? .75 : C.linkAlpha;
  ctx.setLineDash(l.kind === 'owner' ? [3, 9] : [5, 5]); ctx.lineDashOffset = -time * 12;
  ctx.beginPath(); ctx.moveTo(from.x + ux * inset, from.y + uy * inset);
  ctx.lineTo(l.to.x - ux * end, l.to.y - uy * end); stroke(ctx, l.color, 1); ctx.setLineDash([]);
  ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 2);
  // Matching open collars sit at both real endpoints, with a distinct chained thrall link.
  collar(ctx, from.x + ux * inset, from.y + uy * inset, 3, l.color);
  collar(ctx, l.to.x - ux * end, l.to.y - uy * end, 3, l.color);
  if (companionCueStyle(l.profile).shape === 'chain') collar(ctx, from.x + ux * (inset + 7), from.y + uy * (inset + 7), 3, l.color);
  if (l.kind === 'tame') {
    const p = l.progress ?? 0, r = l.to.radius + 6 + (1 - p) * 16;
    ctx.globalAlpha = alpha * .85; ctx.setLineDash(l.broken ? [3, 5] : []);
    collar(ctx, l.to.x, l.to.y, r, l.color, .2 + (1 - p) * 1.1);
  }
  ctx.restore();
}
export function drawCompanionCueFlash(ctx: CanvasRenderingContext2D, f: { pos: { x: number; y: number }; life: number; maxLife: number; color: string; companionCue: CompanionCueFlash }): void {
  const from = f.companionCue.from; if (!from) return;
  const t = 1 - Math.max(0, f.life / Math.max(.001, f.maxLife));
  const broken = f.companionCue.event === 'reject' || f.companionCue.event === 'sever';
  const dx = f.pos.x - from.x, dy = f.pos.y - from.y, cut = broken ? .12 + t * .6 : 0;
  ctx.save(); ctx.globalAlpha *= (1 - t) * .65; ctx.lineCap = 'round'; ctx.beginPath();
  ctx.moveTo(from.x, from.y); ctx.lineTo(from.x + dx * (.5 - cut / 2), from.y + dy * (.5 - cut / 2));
  ctx.moveTo(from.x + dx * (.5 + cut / 2), from.y + dy * (.5 + cut / 2)); ctx.lineTo(f.pos.x, f.pos.y);
  stroke(ctx, f.color, 1.6); ctx.restore();
}
