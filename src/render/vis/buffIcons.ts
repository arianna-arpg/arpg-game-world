import type { ActiveBuff } from '../../engine/actor';
import type { ProcCueRow } from '../../engine/procCues';
import type { SelfBankCue } from '../../engine/skillSelfVisual';
import { wornBuffRow, type BuffRow } from '../../engine/buffPresentation';
import { drawBuffMark } from './buffMantle';
import { drawSkillIcon } from '../skillIcons';
import { VIS_CFG } from './visConfig';

/** Same last-stack clock the existing hover text describes. Unknown and
 * indefinite clocks do not invent an imminent expiry. Zero disables the wipe. */
export function buffExpiryFraction(buff: ActiveBuff, warningSeconds: number = VIS_CFG.buffIcons.warningSeconds): number {
  const remaining = buff.expiries?.length ? Math.max(...buff.expiries) : buff.remaining;
  return expiryFraction(remaining, warningSeconds);
}
function expiryFraction(remaining: number | undefined, seconds: number): number {
  return remaining !== undefined && Number.isFinite(remaining) && seconds > 0
    ? Math.max(0, Math.min(1, 1 - remaining / seconds)) : 0;
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

const grayHexCache = new Map<string, string>();
function grayColor(color: string): string {
  const hit = grayHexCache.get(color);
  if (hit !== undefined) return hit;
  const hex = color.startsWith('#') ? color.slice(1) : '';
  let out = '#808080';
  if (hex.length === 3 || hex.length === 6) {
    const n = parseInt(hex.length === 3 ? hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] : hex, 16);
    if (Number.isFinite(n)) {
      const lum = Math.round(0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255));
      out = `rgb(${lum},${lum},${lum})`;
    }
  }
  if (grayHexCache.size >= 256) grayHexCache.clear();
  grayHexCache.set(color, out);
  return out;
}

/** Shared hotbar artwork and preference, with a clipped grayscale portion.
 * Painting never advances clocks, changes stacks or modifies definitions. */
export function drawBuffIcon(ctx: CanvasRenderingContext2D, buff: ActiveBuff,
  rect: BuffIconRect, procCue?: ProcCueRow): void {
  drawBuffTile(ctx, wornBuffRow(buff.def.id, buff), rect, procCue);
}

export function drawBuffTile(ctx: CanvasRenderingContext2D, row: BuffRow, rect: BuffIconRect, proc?: ProcCueRow, power?: SelfBankCue): void {
  const { x, y, w, h } = rect, warning = VIS_CFG.buffIcons.warningSeconds;
  const fraction = expiryFraction(row.remaining, warning);
  const balance = proc ? { color: proc.color, fill: Math.min(1, proc.count / proc.cap) } : power;
  drawBuffPlate(ctx, rect, fraction, row.count, (grayscale) => {
    if (row.source) drawSkillIcon(ctx, row.source, x, y, w, grayscale);
    else {
      ctx.fillStyle = grayscale ? grayColor('#19202a') : '#19202a';
      ctx.fillRect(x, y, w, h);
      const baseColor = proc && !row.look.color ? proc.color : row.look.color;
      const look = grayscale
        ? { ...row.look, color: grayColor(baseColor ?? VIS_CFG.buffIcons.fallbackColor) }
        : (proc && !row.look.color ? { ...row.look, color: proc.color } : row.look);
      drawBuffMark(ctx, look, x + w / 2, y + h / 2, w * .83);
    }
    if (row.draining) {
      const col = row.look.color ?? VIS_CFG.buffIcons.fallbackColor;
      ctx.fillStyle = grayscale ? grayColor(col) : col;
      ctx.fillRect(x + 2, y + h - 4, w - 4, 2);
    }
    if (row.kind === 'passive') {
      const badge = w * .48;
      ctx.fillStyle = grayscale ? grayColor('#30283a') : '#30283a';
      ctx.fillRect(x + 1, y + h - badge - 1, badge, badge);
      drawBuffMark(ctx, { subject: row.gateMark ?? 'rune', pose: 'crown', color: grayscale ? grayColor('#e7cd89') : '#e7cd89' },
        x + 1 + badge / 2, y + h - 1 - badge / 2, badge);
    } else if (balance) {
      ctx.fillStyle = grayscale ? grayColor('#201b20') : '#201b20';
      ctx.fillRect(x + 2, y + h - 4, w - 4, 2);
      ctx.fillStyle = grayscale ? grayColor(balance.color) : balance.color;
      ctx.fillRect(x + 2, y + h - 4, (w - 4) * balance.fill, 2);
    }
  });
}

function drawBuffPlate(ctx: CanvasRenderingContext2D, rect: BuffIconRect, fraction: number, count: number | undefined,
  paint: (grayscale: boolean) => void): void {
  const c = VIS_CFG.buffIcons, { x, y, w, h } = rect;
  ctx.save();
  if (fraction >= 1) {
    paint(true);
  } else if (fraction > 0) {
    // Disjoint clips also desaturate translucent proc glyphs: overpainting a
    // gray glyph onto its colored twin would leave color showing through.
    ctx.save(); ctx.beginPath(); ctx.rect(x, y + h * fraction, w, h * (1 - fraction)); ctx.clip();
    paint(false); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h * fraction); ctx.clip();
    paint(true); ctx.restore();
  } else paint(false);
  ctx.strokeStyle = c.edge; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  if (count !== undefined) {
    ctx.font = 'bold 9px Verdana'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.strokeStyle = c.stackOutline; ctx.lineWidth = 2.5;
    ctx.strokeText(String(count), x + w - 1, y + 1);
    ctx.fillStyle = c.stackInk; ctx.fillText(String(count), x + w - 1, y + 1);
  }
  ctx.restore();
}
