import { poolVentStyle, type PoolCueRow } from '../../engine/reserveCues';
import { RESERVE_CUE_CFG as C } from '../../data/reserveCues';
import { withAlpha } from './color';
const TAU = Math.PI * 2;

/** Centered on the live caster, before body pose/scale: the outer seam is
 * exactly the radius used by the damage tick, even with socket modifiers. */
export function drawPoolVents(ctx: CanvasRenderingContext2D, rows: readonly PoolCueRow[], time: number): void {
  const seen = new Set<string>();
  for (const row of rows) {
    const style = poolVentStyle(row.profile);
    if (!row.venting || !style || !(row.radius > 0) || seen.has(row.id)) continue;
    seen.add(row.id);
    const fill = Math.max(0, Math.min(1, row.banked / Math.max(1, row.cap)));
    ctx.save(); ctx.lineWidth = style.width;
    ctx.setLineDash([5, 9]); ctx.strokeStyle = withAlpha(C.outline, style.boundaryAlpha);
    ctx.lineWidth = style.width + C.outlinePad;
    ctx.beginPath(); ctx.arc(0, 0, row.radius, 0, TAU); ctx.stroke();
    ctx.lineWidth = style.width; ctx.strokeStyle = withAlpha(row.color, style.boundaryAlpha); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < style.pieces; i++) {
      const phase = (time / style.period + i * 0.381966) % 1;
      const angle = i * TAU / style.pieces;
      const r = row.radius * (style.inner + (1 - style.inner) * phase);
      ctx.save(); ctx.rotate(angle);
      ctx.strokeStyle = withAlpha(row.color, style.alpha * (0.45 + fill * 0.55) * Math.sin(phase * Math.PI));
      // Open curling wisps flow out, never a filled screen wash or a damage flash.
      ctx.beginPath(); ctx.moveTo(r * 0.7, -row.radius * 0.025);
      ctx.quadraticCurveTo(r, -row.radius * 0.07, r, 0);
      ctx.quadraticCurveTo(r, row.radius * 0.07, r * 0.7, row.radius * 0.025); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
}
/** Three short exhaust strokes leave the resource strip while fuel actually
 * drains. The existing fill/minimum notch remain the numeric resource read. */
export function drawPoolVentHud(ctx: CanvasRenderingContext2D, x: number, y: number, width: number,
  row: PoolCueRow | undefined, time: number): void {
  if (!row?.venting) return;
  const style = poolVentStyle(row.profile); if (!style) return;
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < C.hudPieces; i++) {
    const phase = (time / style.period + i / C.hudPieces) % 1;
    const px = x + width * (i + 1) / (C.hudPieces + 1);
    ctx.globalAlpha = (1 - phase) * 0.9;
    ctx.beginPath(); ctx.moveTo(px - 2, y - phase * style.hudReach);
    ctx.quadraticCurveTo(px + 3, y - 4 - phase * style.hudReach, px, y - 7 - phase * style.hudReach);
    ctx.strokeStyle = C.outline; ctx.lineWidth = style.width + C.outlinePad; ctx.stroke();
    ctx.strokeStyle = row.color; ctx.lineWidth = style.width; ctx.stroke();
  }
  ctx.restore();
}
