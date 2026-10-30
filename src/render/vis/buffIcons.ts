import type { ActiveBuff } from '../../engine/actor';
import type { ProcCueRow } from '../../engine/procCues';
import { drawSkillIcon, type SkillIconFace } from '../skillIcons';
import { drawProcBuff } from './procCueLayer';
import { VIS_CFG } from './visConfig';

/** Same last-stack clock the existing hover text describes. Unknown and
 * indefinite clocks do not invent an imminent expiry. Zero disables the wipe. */
export function buffExpiryFraction(buff: ActiveBuff, warningSeconds: number = VIS_CFG.buffIcons.warningSeconds): number {
  const remaining = buff.expiries?.length ? Math.max(...buff.expiries) : buff.remaining;
  return Number.isFinite(remaining) && warningSeconds > 0
    ? Math.max(0, Math.min(1, 1 - remaining / warningSeconds)) : 0;
}

export interface BuffIconRect { x: number; y: number; w: number; h: number; }
/** Stable insertion order, wrapping upward within this player's hotbar width. */
export function buffIconRect(index: number, left: number, bottom: number, width: number): BuffIconRect {
  const { size, gap } = VIS_CFG.buffIcons;
  const columns = Math.max(1, Math.floor((width + gap) / (size + gap)));
  return { x: left + index % columns * (size + gap),
    y: bottom - size - Math.floor(index / columns) * (size + gap), w: size, h: size };
}

/** Keep the existing combo/proc/possession lanes above every wrapped row. */
export function buffAuxiliaryLift(count: number, width: number): number {
  if (count <= 0) return 0;
  const top = buffIconRect(count - 1, 0, -VIS_CFG.buffIcons.barClearance, width).y;
  return Math.max(0, -top + VIS_CFG.buffIcons.auxiliaryClearance - 46);
}

/** Shared hotbar artwork and preference, with a clipped grayscale portion.
 * Painting never advances clocks, changes stacks or modifies definitions. */
export function drawBuffIcon(ctx: CanvasRenderingContext2D, buff: ActiveBuff,
  rect: BuffIconRect, procCue?: ProcCueRow): void {
  const c = VIS_CFG.buffIcons, { x, y, w, h } = rect;
  const face: SkillIconFace = buff.def.sourceSkill ?? { icon: 'buff', color: c.fallbackColor };
  const paint = () => {
    if (buff.def.sourceSkill || !procCue) drawSkillIcon(ctx, face, x, y, w);
    else drawProcBuff(ctx, procCue, x + w / 2, y + h / 2);
  };
  ctx.save();
  const fraction = buffExpiryFraction(buff);
  if (fraction > 0) {
    // Disjoint clips also desaturate translucent proc glyphs: overpainting a
    // gray glyph onto its colored twin would leave color showing through.
    ctx.save();ctx.beginPath();ctx.rect(x, y + h * fraction, w, h * (1 - fraction));ctx.clip();
    paint();ctx.restore();
    ctx.save();ctx.beginPath();ctx.rect(x, y, w, h * fraction);ctx.clip();
    ctx.filter = 'grayscale(1)';paint();ctx.restore();
  } else paint();
  ctx.strokeStyle = c.edge;ctx.lineWidth = 1;ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  if (buff.stacks > 1) {
    ctx.font = 'bold 9px Verdana';ctx.textAlign = 'right';ctx.textBaseline = 'top';
    ctx.strokeStyle = c.stackOutline;ctx.lineWidth = 2.5;
    ctx.strokeText(String(buff.stacks), x + w - 1, y + 1);
    ctx.fillStyle = c.stackInk;ctx.fillText(String(buff.stacks), x + w - 1, y + 1);
  }
  ctx.restore();
}
