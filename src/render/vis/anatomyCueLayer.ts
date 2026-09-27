import { ANATOMY_CUE_CFG as C, ANATOMY_CUE_STYLES } from '../../data/anatomyCues';
import type { AnatomyCueState, AnatomySegmentCue } from '../../engine/anatomyCues';
import type { WeakPointWindow } from '../../engine/weakpoints';

const styleOf = (id: string) => ANATOMY_CUE_STYLES[id] ?? ANATOMY_CUE_STYLES.armor;
function ink(ctx: CanvasRenderingContext2D, color: string, width: number) {
  ctx.strokeStyle = C.outline; ctx.lineWidth = width + C.outlineWidth; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
/** Same exact interval on both horizontal bars. No inflated minimum band size:
 * the wider overhead bar buys legibility without lying about health thresholds. */
export function drawWeakPointBar(ctx: CanvasRenderingContext2D, rows: WeakPointWindow[],
  x: number, y: number, width: number, height: number, lifeFrac: number): void {
  if (!rows.length) return;
  ctx.save(); ctx.lineJoin = 'round';
  for (const row of rows) {
    const left = x + width * row.lo, right = x + width * row.hi;
    const liveRight = x + width * Math.min(row.hi, lifeFrac), alpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha * (row.active ? C.activeAlpha : C.waitingAlpha);
    ctx.beginPath(); ctx.rect(left, y, right - left, height); ink(ctx, row.color, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(left, y, Math.max(0, liveRight - left), height); ctx.clip();
    ctx.strokeStyle = row.active ? styleOf(row.profile).highlight : row.color; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let px = left - height; px < right; px += C.hatchGap) {
      ctx.moveTo(px, y + height); ctx.lineTo(px + height, y);
    }
    ctx.stroke(); ctx.restore();
    // Paired boundary teeth retain the full stamped interval while life drains.
    ctx.beginPath();
    for (const px of [left, right]) { ctx.moveTo(px, y - 2); ctx.lineTo(px, y + height + 2); }
    ink(ctx, row.active ? styleOf(row.profile).highlight : row.color, row.active ? 1.7 : 1);
    ctx.globalAlpha = alpha;
  }
  ctx.restore();
}
/** The life orb fills vertically; its weak window uses the very same fill axis.
 * Only the rim carries teeth, keeping the existing life number unobscured. */
export function drawWeakPointOrb(ctx: CanvasRenderingContext2D, rows: WeakPointWindow[], x: number, y: number, r: number): void {
  if (!rows.length) return;
  ctx.save();
  for (const row of rows) {
    ctx.globalAlpha = row.active ? C.activeAlpha : C.waitingAlpha;
    const top = Math.acos(2 * row.hi - 1), bottom = Math.acos(2 * row.lo - 1);
    ctx.beginPath();
    ctx.arc(x, y, r + 1, top - Math.PI / 2, bottom - Math.PI / 2);
    ctx.moveTo(x + Math.cos(-bottom - Math.PI / 2) * (r + 1), y + Math.sin(-bottom - Math.PI / 2) * (r + 1));
    ctx.arc(x, y, r + 1, -bottom - Math.PI / 2, -top - Math.PI / 2);
    ink(ctx, row.active ? styleOf(row.profile).highlight : row.color, 2.5);
    ctx.beginPath();
    for (const angle of [top, bottom]) for (const side of [-1, 1]) {
      const a = side * angle - Math.PI / 2;
      ctx.moveTo(x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3));
      ctx.lineTo(x + Math.cos(a) * (r + 5), y + Math.sin(a) * (r + 5));
    }
    ink(ctx, row.color, 1.5);
  }
  ctx.restore();
}
function crack(ctx: CanvasRenderingContext2D, r: number, frac: number, profile: string, color: string, broken: boolean) {
  const style = styleOf(profile), reach = r * style.bodyScale;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (!broken && frac >= 0.999) {
    ctx.globalAlpha *= 0.55;
    ctx.beginPath();
    for (const s of [-1, 1]) { ctx.moveTo(s * reach, -reach * 0.3); ctx.lineTo(s * reach, reach * 0.3); }
    ink(ctx, color, 1); return;
  }
  const damage = broken ? 1 : 1 - frac;
  ctx.beginPath();
  ctx.moveTo(-reach, -reach * 0.7); ctx.lineTo(-reach * 0.15, -reach * 0.12);
  ctx.lineTo(reach * 0.22, reach * 0.04); ctx.lineTo(-reach * 0.06, reach * 0.32);
  ctx.lineTo(reach * (0.3 + damage * 0.6), reach * (0.35 + damage * 0.5));
  if (damage > 0.4) { ctx.moveTo(reach * 0.15, reach * 0.02); ctx.lineTo(reach * 0.65, -reach * 0.5); }
  if (damage > 0.7) { ctx.moveTo(-reach * 0.06, reach * 0.32); ctx.lineTo(-reach * 0.65, reach * 0.65); }
  ink(ctx, broken ? style.highlight : color, style.width * (0.65 + damage * 0.35));
}
export function drawAnatomyBody(ctx: CanvasRenderingContext2D, state: AnatomyCueState, radius: number, facing: number): void {
  ctx.save(); ctx.rotate(facing); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const [i, row] of state.weakpoints.slice(0, C.bodyMarks).entries()) {
    const style = styleOf(row.profile), r = Math.max(5, radius * style.bodyScale);
    ctx.save(); ctx.translate(0, (i - Math.min(state.weakpoints.length - 1, C.bodyMarks - 1) / 2) * r * 0.5);
    ctx.rotate(-0.45); ctx.globalAlpha *= row.active ? C.activeAlpha : C.waitingAlpha;
    // A sealed seam opens into a dark cleft while bonus damage is active.
    const gap = r * (row.active ? 0.32 : 0.08);
    ctx.beginPath(); ctx.moveTo(-r, -r * 0.35); ctx.lineTo(-gap, -gap); ctx.lineTo(r * 0.9, r * 0.5);
    ctx.lineTo(gap, gap); ctx.closePath(); ctx.fillStyle = C.outline; ctx.fill();
    ink(ctx, row.active ? style.highlight : row.color, style.width);
    ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.55); ctx.lineTo(-r * 0.5, -r * 0.1);
    ctx.moveTo(r * 0.5, r * 0.08); ctx.lineTo(r * 0.25, r * 0.55); ink(ctx, row.color, style.width);
    ctx.restore();
  }
  if (state.part) { ctx.save(); crack(ctx, radius, state.part.frac, state.part.profile, state.part.color, false); ctx.restore(); }
  for (const part of state.parts) if (part.broken) {
    ctx.save(); ctx.translate(part.dx * radius, part.dy * radius);
    crack(ctx, Math.max(4, part.size * radius * C.scarScale), 0, part.profile, part.color, true); ctx.restore();
  }
  ctx.restore();
}
export function drawSegmentWound(ctx: CanvasRenderingContext2D, row: AnatomySegmentCue | undefined,
  x: number, y: number, radius: number, facing: number): void {
  if (!row || (!row.broken && row.frac >= 0.999)) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(facing);
  crack(ctx, radius, row.frac, row.profile, row.color, row.broken); ctx.restore();
}
/** Small separate component pools: square-ended parts, pointed segments, split
 * empty outlines for broken components. Never painted as chunks of root life. */
export function drawAnatomyMeters(ctx: CanvasRenderingContext2D, state: AnatomyCueState,
  cx: number, y: number, maxWidth: number, boss = false): void {
  const rows = [...state.parts.map(p => ({ ...p, segment: false })),
    ...state.segments.map(s => ({ ...s, segment: true }))];
  if (!rows.length) return;
  if (!boss && !state.parts.length && !state.segments.some(s => s.frac < 1)) return;
  const gap = Math.min(C.meterGap, maxWidth / (rows.length * 3));
  const width = Math.min(C.meterWidth, (maxWidth - gap * (rows.length - 1)) / rows.length);
  const total = rows.length * width + (rows.length - 1) * gap;
  ctx.save(); ctx.lineJoin = 'round';
  rows.forEach((row, i) => {
    const x = cx - total / 2 + i * (width + gap), h = C.meterHeight;
    ctx.beginPath();
    if (row.segment) { ctx.moveTo(x, y + h / 2); ctx.lineTo(x + width / 2, y); ctx.lineTo(x + width, y + h / 2); ctx.lineTo(x + width / 2, y + h); ctx.closePath(); }
    else ctx.rect(x, y, width, h);
    ctx.fillStyle = C.outline; ctx.fill(); ink(ctx, row.color, 1);
    if (!row.broken) {
      ctx.save(); ctx.clip(); ctx.fillStyle = row.color; ctx.globalAlpha *= 0.8;
      ctx.fillRect(x, y, width * row.frac, h); ctx.restore();
    } else {
      ctx.beginPath(); ctx.moveTo(x + width * 0.65, y - 1); ctx.lineTo(x + width * 0.35, y + h + 1);
      ink(ctx, styleOf(row.profile).highlight, 1);
    }
  });
  ctx.restore();
}
