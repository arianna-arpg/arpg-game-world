import { procCueStyle, type ProcCueRow } from '../../engine/procCues';
import { PROC_CUE_CFG as C } from '../../data/procCues';
const TAU = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

function glyph(ctx: CanvasRenderingContext2D, row: ProcCueRow, x: number, y: number, size: number, fill = 1) {
  const shape = procCueStyle(row.profile).shape;
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
  if (shape === 'flame') {
    ctx.moveTo(0, -size); ctx.quadraticCurveTo(size * 0.1, -size * 0.2, size * 0.7, size * 0.1);
    ctx.quadraticCurveTo(size, size, 0, size); ctx.quadraticCurveTo(-size, size, -size * 0.5, 0); ctx.closePath();
  } else if (shape === 'bolt') {
    ctx.moveTo(size * 0.5, -size); ctx.lineTo(-size * 0.65, size * 0.1); ctx.lineTo(0, size * 0.1);
    ctx.lineTo(-size * 0.4, size); ctx.lineTo(size * 0.65, -size * 0.15); ctx.lineTo(0, -size * 0.15); ctx.closePath();
  } else if (shape === 'bead') {
    ctx.ellipse(0, 0, size * 0.7, size, 0, 0, TAU);
  } else {
    ctx.moveTo(0, -size); ctx.lineTo(size * (shape === 'blade' ? 0.35 : 0.6), 0);
    ctx.lineTo(0, size); ctx.lineTo(-size * 0.6, 0); ctx.closePath();
  }
  ctx.fillStyle = C.outline; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = row.color; ctx.fillRect(-size, size - 2 * size * clamp(fill), size * 2, size * 2); ctx.restore();
  ctx.strokeStyle = C.outline; ctx.lineWidth = C.width + 2; ctx.stroke();
  ctx.strokeStyle = row.color; ctx.lineWidth = C.width; ctx.stroke();
  if (shape === 'rune') { ctx.beginPath(); ctx.moveTo(-size * 0.3, 0); ctx.lineTo(size * 0.3, 0); ctx.strokeStyle = C.outline; ctx.stroke(); }
  ctx.restore();
}
/** Existing buff slots retain their hover reference; the payload supplies the shape. */
export function drawProcBuff(ctx: CanvasRenderingContext2D, row: ProcCueRow, x: number, y: number): void {
  glyph(ctx, row, x, y, 5, row.count / Math.max(1, row.cap));
}
export function drawProcBody(ctx: CanvasRenderingContext2D, rows: readonly ProcCueRow[], radius: number): void {
  let lane = 0, rune = 0;
  for (const row of rows) {
    if (row.phase !== 'stored') continue;
    const isRune = row.id.startsWith('rune:');
    if (!isRune && lane >= C.bodyRows) continue;
    if (isRune && rune >= C.bodyPips) continue;
    const n = Math.min(C.bodyPips, Math.ceil(row.cap)), size = procCueStyle(row.profile).size;
    for (let i = 0; i < n; i++) {
      // Loaded material hugs the lower silhouette, away from drink/ammo rows.
      const x = isRune ? (rune++ - 2) * 9 : (i - (n - 1) / 2) * 9;
      const y = radius + C.bodyPad + (isRune ? C.bodyRows : lane) * C.rowGap;
      ctx.save(); ctx.globalAlpha *= C.alpha;
      glyph(ctx, row, x, y, size, row.count / Math.max(1, row.cap) * n - i); ctx.restore();
    }
    if (!isRune) lane++;
  }
  for (const row of rows.filter(r => r.phase !== 'stored').slice(-C.pulses)) {
    const rem = clamp(row.remaining ?? 0), t = 1 - rem;
    const n = Math.min(C.bodyPips, Math.max(3, row.count));
    const inward = row.phase === 'gain' || row.phase === 'invoke';
    const d = radius * 0.6 + C.travel * (inward ? rem : t);
    ctx.save(); ctx.globalAlpha *= rem * C.alpha;
    for (let i = 0; i < n; i++) {
      const angle = i * TAU / n;
      glyph(ctx, row, Math.cos(angle) * d, Math.sin(angle) * d, procCueStyle(row.profile).size * (0.6 + rem * 0.4));
    }
    ctx.restore();
  }
}
/** Short releases sit above the bank strip. Persistent buffs and ordered
 * runes retain their established slots, including short three-skill bars. */
export function drawProcHud(ctx: CanvasRenderingContext2D, rows: readonly ProcCueRow[], x: number, y: number): void {
  const events = rows.filter(r => r.phase !== 'stored').slice(-3);
  events.forEach((row, j) => {
    const rem = clamp(row.remaining ?? 0), d = 3 + (1 - rem) * 8;
    ctx.save(); ctx.globalAlpha *= rem;
    for (let i = 0; i < 3; i++) glyph(ctx, row, x + (j - (events.length - 1) / 2) * 28 + (i - 1) * d, y, 3.5);
    ctx.restore();
  });
}
