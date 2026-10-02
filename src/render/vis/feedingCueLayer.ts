import { FEEDING_CUE_CFG as C } from '../../data/feedingCues';
import { feedingStyle, type FeedingCueState, type FeedingTransfer, type RestoreGainCue } from '../../engine/feedingCues';
function stroke(ctx: CanvasRenderingContext2D, color: string, width = C.lineWidth) {
  ctx.strokeStyle = C.outline; ctx.lineWidth = width + 2.5; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function mote(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, shield = false, size = 2.5) {
  ctx.beginPath();
  if (shield) { ctx.moveTo(x, y - size); ctx.lineTo(x + size, y); ctx.lineTo(x, y + size); ctx.lineTo(x - size, y); ctx.closePath(); }
  else ctx.ellipse(x, y, size * 0.65, size, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill(); stroke(ctx, color, 0.8);
}
export function drawFeedingTransfer(ctx: CanvasRenderingContext2D, f: {
  pos: { x: number; y: number }; radius: number; life: number; maxLife: number; color: string; feedingCue: FeedingTransfer;
}): void {
  const t = Math.max(0, Math.min(1, 1 - f.life / f.maxLife)), row = f.feedingCue, style = feedingStyle(row.profile);
  if (!Number.isFinite(t + row.to.x + row.to.y)) return;
  const dx = row.to.x - f.pos.x, dy = row.to.y - f.pos.y, angle = Math.atan2(dy, dx);
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // Restorations leave their source intact. Meals close jaws on what was
  // consumed; both carry the actual transaction toward its recipient.
  ctx.save(); ctx.translate(f.pos.x, f.pos.y); ctx.rotate(angle);
  ctx.globalAlpha *= (1 - t) * 0.9;
  const r = f.radius * (1 - t * 0.8);
  ctx.beginPath();
  if(row.kind==='restore')ctx.arc(0,0,f.radius*(.4+t*.5),0,Math.PI*2);
  else {
    ctx.arc(0, 0, r, -1.15, 1.15); ctx.moveTo(-Math.cos(1.15) * r, Math.sin(1.15) * r);
    ctx.arc(0, 0, r, Math.PI - 1.15, Math.PI + 1.15);
  }
  stroke(ctx, f.color, 2); ctx.restore();
  for (let i = 0; i < style.pieces; i++) {
    const p = Math.max(0, Math.min(1, t * 1.3 - i * 0.045));
    const bend = Math.sin(p * Math.PI) * style.curl * (i % 2 ? 1 : -1);
    ctx.save(); ctx.globalAlpha *= Math.sin(Math.PI * p) * 0.9;
    mote(ctx, f.pos.x + dx * p - Math.sin(angle) * bend, f.pos.y + dy * p + Math.cos(angle) * bend, f.color, row.profile === 'ritual'); ctx.restore();
  }
  ctx.restore();
}
export function drawFeedingBody(ctx: CanvasRenderingContext2D, row: FeedingCueState,
  radius: number, pos: { x: number; y: number }, time: number): void {
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (row.meal) {
    const angle = Math.atan2(row.meal.from.y - pos.y, row.meal.from.x - pos.x);
    const chew = 0.3 + 0.12 * Math.sin(time * 14), reach = radius * 0.9;
    ctx.save(); ctx.rotate(angle); ctx.beginPath();
    for (const side of [-1, 1]) { ctx.moveTo(reach * 0.7, side * radius * chew); ctx.lineTo(reach * 1.25, side * radius * chew * 0.6); }
    stroke(ctx, row.meal.color, 1.7);
    ctx.beginPath(); ctx.arc(0, 0, radius + 4, -0.7, -0.7 + 1.4 * row.meal.progress); stroke(ctx, row.meal.color, 1.3); ctx.restore();
  }
  if (row.mass) {
    const fill = Math.min(1, row.mass.count / Math.max(1, row.mass.cap));
    for (let i = 0; i < C.massPieces; i++) {
      const angle = i / C.massPieces * Math.PI * 2 + time * 0.6;
      const r = radius * (0.55 + fill * 0.5);
      ctx.save(); ctx.globalAlpha *= i / C.massPieces < fill ? 0.95 : 0.2;
      mote(ctx, Math.cos(angle) * r, Math.sin(angle) * r, row.mass.color, true, 2 + fill * 2); ctx.restore();
    }
  }
  for (const [j, g] of row.gains.entries()) {
    ctx.save(); ctx.globalAlpha *= Math.min(1, g.left / C.gainLife) * g.strength;
    const base = -Math.PI / 2 + j * 1.4;
    for (let i = 0; i < C.bodyMotes; i++) {
      const p = (time * 2 + i / C.bodyMotes) % 1, angle = base + (i - 1) * 0.2;
      const r = radius * (1.4 - p * 0.9);
      mote(ctx, Math.cos(angle) * r, Math.sin(angle) * r, g.color, g.resource === 'es' || g.resource === 'absorb');
    }
    ctx.restore();
  }
  ctx.restore();
}
/** Inward drops on the matching resource orb; shield gains sit at the life orb
 * crown, where its shield arcs live. No new captions or numbers. */
export function drawRestoreHud(ctx: CanvasRenderingContext2D, gains: RestoreGainCue[], resource: 'life' | 'mana',
  x: number, y: number, radius: number, time: number): void {
  ctx.save();
  for (const g of gains) {
    if ((g.resource === 'mana') !== (resource === 'mana')) continue;
    ctx.save(); ctx.globalAlpha *= Math.min(1, g.left / C.gainLife) * g.strength;
    const shield = g.resource === 'es' || g.resource === 'absorb';
    for (let i = 0; i < C.bodyMotes; i++) {
      const p = (time * 2 + i / C.bodyMotes) % 1;
      const angle = shield ? -Math.PI / 2 + (i - 1) * 0.26 : (resource === 'life' ? Math.PI : 0) + (i - 1) * 0.3;
      const r = radius + C.hudReach * (1 - p);
      mote(ctx, x + Math.cos(angle) * r, y + Math.sin(angle) * r, g.color, shield, 2.4);
    }
    ctx.restore();
  }
  ctx.restore();
}
