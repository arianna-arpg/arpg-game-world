import { payloadCueStyle, type PayloadCueRow } from '../../engine/payloadCues';
import { PAYLOAD_CUE_CFG as C } from '../../data/payloadCues';
import { withAlpha } from './color';
const TAU = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

function glyph(ctx: CanvasRenderingContext2D, row: PayloadCueRow, x: number, y: number, size: number, fill: number, angle = 0) {
  const style = payloadCueStyle(row); if (!style) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.lineWidth = style.width;
  ctx.beginPath();
  if (style.shape === 'vial') {
    ctx.moveTo(-size * 0.35, -size); ctx.lineTo(size * 0.35, -size);
    ctx.lineTo(size * 0.35, -size * 0.5); ctx.lineTo(size * 0.7, -size * 0.15);
    ctx.lineTo(size * 0.7, size); ctx.lineTo(-size * 0.7, size);
    ctx.lineTo(-size * 0.7, -size * 0.15); ctx.lineTo(-size * 0.35, -size * 0.5);
  } else if (style.shape === 'arrow') {
    ctx.moveTo(0, -size); ctx.lineTo(size * 0.75, 0);
    ctx.lineTo(size * 0.3, 0); ctx.lineTo(size * 0.3, size);
    ctx.lineTo(-size * 0.3, size); ctx.lineTo(-size * 0.3, 0); ctx.lineTo(-size * 0.75, 0);
  } else if (style.shape === 'anchor') {
    ctx.moveTo(0, -size); ctx.lineTo(size, 0); ctx.lineTo(0, size); ctx.lineTo(-size, 0);
  } else {
    ctx.moveTo(-size * 0.55, size); ctx.lineTo(-size * 0.55, -size * 0.5);
    ctx.quadraticCurveTo(0, -size * 1.4, size * 0.55, -size * 0.5); ctx.lineTo(size * 0.55, size);
  }
  ctx.closePath(); ctx.fillStyle = C.empty; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = row.color;
  ctx.fillRect(-size, size - 2 * size * clamp(fill), size * 2, size * 2); ctx.restore();
  ctx.strokeStyle = C.outline; ctx.lineWidth = style.width + 2; ctx.stroke();
  ctx.strokeStyle = row.color; ctx.lineWidth = style.width; ctx.stroke();
  if (style.shape === 'vial') { ctx.fillStyle = '#d7be8c'; ctx.fillRect(-size * 0.5, -size - 1, size, 2); }
  ctx.restore();
}
function pips(ctx: CanvasRenderingContext2D, row: PayloadCueRow, x: number, y: number, width: number, limit: number, size: number) {
  const n = Math.min(limit, Math.max(0, Math.ceil(row.cap)));
  for (let i = 0; i < n; i++) glyph(ctx, row, x + (i + 0.5) * width / n, y, size, row.count / Math.max(1, row.cap) * n - i);
}
/** Local body space; little corked vessels and loaded chambers sit beside the
 * silhouette. Filled groups represent proportion when a mod exceeds the cap. */
export function drawPayloadBody(ctx: CanvasRenderingContext2D, rows: readonly PayloadCueRow[], radius: number): void {
  let lane = 0;
  for (const row of rows) {
    const style = payloadCueStyle(row);
    if (!style || row.kind === 'carom' || lane >= C.bodyRows) continue;
    ctx.save(); ctx.globalAlpha *= style.alpha;
    const width = Math.min(C.bodyPips, row.cap) * (style.size * 1.8);
    pips(ctx, row, -width / 2, -radius - C.bodyPad - lane++ * C.rowGap, width, C.bodyPips, style.size);
    ctx.restore();
  }
}
export function drawPayloadHud(ctx: CanvasRenderingContext2D, rows: readonly PayloadCueRow[], x: number, y: number, width: number): void {
  for (const row of rows) {
    if (row.kind === 'ammo') continue; // existing functional top-row bank remains
    const style = payloadCueStyle(row); if (!style) continue;
    ctx.save(); ctx.globalAlpha *= style.alpha;
    const cy = y + (row.kind === 'prime' ? 0 : 23);
    pips(ctx, row, x, cy, width, C.hudPips, 3.5);
    if (row.ready) { ctx.strokeStyle = row.color; ctx.lineWidth = 1.5; ctx.strokeRect(x, cy - 6, width, 12); }
    ctx.restore();
  }
}
/** World coordinates. Arming footprints belong to the actual placed arrows,
 * not the owner's position, body scale or current on-screen visibility. */
export function drawPayloadPlacements(ctx: CanvasRenderingContext2D, rows: readonly PayloadCueRow[],
  visible: (point: NonNullable<PayloadCueRow['points']>[number]) => boolean = () => true): void {
  for (const row of rows) {
    if (row.kind !== 'carom' || !row.points?.length || !payloadCueStyle(row)) continue;
    ctx.save(); ctx.lineWidth = 1.5; ctx.strokeStyle = withAlpha(row.color, C.linkAlpha);
    const points = row.points.filter(visible);
    if (points.length === row.points.length) {
      ctx.setLineDash([4, 6]); ctx.beginPath();
      points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      if (row.ready) ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const p of points) {
      const next = row.points[(row.points.indexOf(p) + 1) % row.points.length];
      const angle = row.ready && payloadCueStyle(row)?.shape === 'arrow'
        ? Math.atan2(next.y - p.y, next.x - p.x) + Math.PI / 2 : 0;
      glyph(ctx, row, p.x, p.y, C.markerSize, row.ready ? 1 : 0.35, angle);
      if (row.window !== undefined) {
        ctx.strokeStyle = row.color; ctx.lineWidth = C.windowWidth;
        ctx.beginPath(); ctx.arc(p.x, p.y, C.markerSize + 4, -Math.PI / 2, -Math.PI / 2 + TAU * row.window); ctx.stroke();
      }
      if (row.ready && p.radius > 0) {
        ctx.setLineDash(C.triggerDash); ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, TAU);
        ctx.strokeStyle = withAlpha(C.outline, C.triggerAlpha); ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = withAlpha(row.color, C.triggerAlpha); ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }
}
