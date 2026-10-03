import { COMBO_CONDITION_HUD as C, COMBO_CONDITION_READOUTS } from '../../data/comboConditions';
import type { ComboConditionRow } from '../../engine/comboConditions';

/** Separate rows above the existing combo/proc seats, bounded to the viewport.
 * An active label follows the actual condition clock even as old casts expire. */
export function drawComboConditions(ctx: CanvasRenderingContext2D, x: number, y: number,
  availableWidth: number, rows: readonly ComboConditionRow[]): void {
  const width = Math.min(C.width, Math.max(0, availableWidth));
  if (width < 100) return;
  ctx.save(); ctx.font = C.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const row of rows) {
    const def = COMBO_CONDITION_READOUTS.find(d => d.id === row.id); if (!def) continue;
    const active = row.remaining > 0;
    const label = def.label + (active ? ' · active ' + row.remaining.toFixed(1) + 's' : ' · ' + row.lit + '/' + row.len);
    ctx.fillStyle = C.background; ctx.fillRect(x - width / 2, y - C.height / 2, width, C.height);
    ctx.fillStyle = active ? def.color : C.inactive;
    ctx.fillText(label, x, y, width - 12);
    const fill = active ? 1 : row.lit / Math.max(1, row.len);
    ctx.globalAlpha *= 0.7; ctx.fillRect(x - width / 2, y + C.height / 2 - 1, width * Math.max(0, Math.min(1, fill)), 1);
    ctx.globalAlpha /= 0.7; y -= C.row;
  }
  ctx.restore();
}
