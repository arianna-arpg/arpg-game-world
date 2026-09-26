import { COMBO_CUE_CFG as C, type ComboCueStyle } from '../../data/comboCues';
import { COMBO_RULES } from '../../data/combos';
import { comboCueStyle, type ComboCueRow } from '../../engine/comboCues';

const TAU = Math.PI * 2;
/** A closing gesture, never an area/damage boundary. The same path scales
 * down for the HUD; dark edging keeps thin lines visible on bright terrain. */
export function drawComboMark(ctx: CanvasRenderingContext2D, style: ComboCueStyle,
  color: string, size: number, glow: number, count: number): void {
  const t = 1 - Math.max(0, Math.min(1, glow));
  const settle = Math.max(0, 1 - t * 4);
  const r = size * (1 + style.reach * settle);
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  switch (style.shape) {
    case 'beat':
      // Paired strikes close onto a single bar, then recoil together.
      for (const side of [-1, 1]) {
        ctx.moveTo(-r, side * r); ctx.lineTo(0, side * r * 0.42); ctx.lineTo(r, side * r);
      }
      ctx.moveTo(-size * 0.6, 0); ctx.lineTo(size * 0.6, 0);
      break;
    case 'weave':
      // Two lanes cross and uncross around the completed beat.
      for (const side of [-1, 1]) {
        ctx.moveTo(-r, side * r * 0.7);
        ctx.bezierCurveTo(-r * 0.3, side * r, r * 0.3, -side * r, r, -side * r * 0.7);
      }
      break;
    case 'round': {
      const n = Math.max(3, Math.min(8, count));
      for (let i = 0; i < n; i++) {
        const a = i * TAU / n - Math.PI / 2, next = a + TAU / n;
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(next) * r * (1 - 0.3 * settle), Math.sin(next) * r * (1 - 0.3 * settle));
      }
      break;
    }
    case 'gather':
      for (let i = 0; i < 4; i++) {
        const a = i * TAU / 4, x = Math.cos(a), y = Math.sin(a);
        ctx.moveTo(x * r, y * r); ctx.lineTo(x * size * 0.28, y * size * 0.28);
        ctx.lineTo(x * size * 0.55 - y * size * 0.25, y * size * 0.55 + x * size * 0.25);
      }
      break;
  }
  ctx.strokeStyle = C.outline; ctx.lineWidth = style.width + C.outlinePad; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = style.width; ctx.stroke();
  ctx.restore();
}

/** World-origin transform: follows the actual caster, no persistent marker
 * after death, downing, unequip or expiry. Simultaneous rules get separate seats. */
export function drawComboBody(ctx: CanvasRenderingContext2D, radius: number, rows: readonly ComboCueRow[]): void {
  const active = rows.filter(row => row.glow > 0 && COMBO_RULES[row.id] && comboCueStyle(COMBO_RULES[row.id]));
  for (let i = 0; i < active.length; i++) {
    const row = active[i], rule = COMBO_RULES[row.id], style = comboCueStyle(rule)!;
    const columns = Math.min(C.body.maxColumns, active.length - Math.floor(i / C.body.maxColumns) * C.body.maxColumns);
    ctx.save(); ctx.globalAlpha *= Math.min(1, row.glow * 3);
    ctx.translate((i % C.body.maxColumns - (columns - 1) / 2) * C.body.gap,
      -radius - C.body.pad - Math.floor(i / C.body.maxColumns) * C.body.gap);
    drawComboMark(ctx, style, rule.color, C.body.size, row.glow, row.len); ctx.restore();
  }
}

/** Filled pips always mean NEW progress. A completion travels beneath them
 * into its signature; it never relights the spent casts as another full combo. */
export function drawComboHud(ctx: CanvasRenderingContext2D, x: number, y: number, rows: readonly ComboCueRow[]): void {
  ctx.save();
  for (const row of rows) {
    const rule = COMBO_RULES[row.id]; if (!rule) continue;
    const style = comboCueStyle(rule), width = Math.max(0, row.len - 1) * C.hud.pitch;
    for (let i = 0; i < row.len; i++) {
      ctx.beginPath(); ctx.arc(x + i * C.hud.pitch, y, C.hud.pip, 0, TAU);
      ctx.fillStyle = i < row.lit ? rule.color : 'rgba(8,8,12,0.7)'; ctx.fill();
      ctx.strokeStyle = i < row.lit ? C.outline : 'rgba(160,160,180,0.6)';
      ctx.lineWidth = 1; ctx.stroke();
    }
    if (style) {
      ctx.save(); ctx.globalAlpha *= row.glow > 0 ? Math.min(1, row.glow * 3) : C.idleAlpha;
      if (row.glow > 0) {
        const travel = 1 - row.glow;
        ctx.beginPath(); ctx.moveTo(x, y + 7);
        ctx.lineTo(x + (width + C.hud.iconGap) * Math.min(1, travel * 3), y + 7);
        ctx.strokeStyle = C.outline; ctx.lineWidth = style.width + C.outlinePad; ctx.stroke();
        ctx.strokeStyle = rule.color; ctx.lineWidth = style.width; ctx.stroke();
      }
      ctx.translate(x + width + C.hud.iconGap, y);
      drawComboMark(ctx, style, rule.color, C.hud.size, row.glow, row.len); ctx.restore();
    }
    y -= C.hud.row;
  }
  ctx.restore();
}
