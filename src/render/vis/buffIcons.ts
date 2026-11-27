import { BUFF_WEAR, type BuffLook } from '../../data/buffLooks';
import { multipleSupportBuffs } from '../../engine/supportPresentation';
import { drawSupportNumber } from './supportCounters';
import { drawCountSeal } from './hotbarSeals';
import type { ActiveBuff } from '../../engine/actor';
import type { CosmeticHotbarStyle } from '../../data/cosmeticStyles';
import type { ProcCueRow } from '../../engine/procCues';
import type { SelfBankCue } from '../../engine/skillSelfVisual';
import { wornBuffRow, type BuffRow } from '../../engine/buffPresentation';
import { drawBuffMark } from './buffMantle';
import { SUPPORTS } from '../../data/supports';
import { drawSkillIcon, skillIconTileKey, supportIconFace } from '../skillIcons';
import { BUFF_SHAPES, buffBehavior } from './buffBehavior';
import { registerVisCache } from './caches';
import { releaseCanvas } from './sprites';
import { VIS_CFG } from './visConfig';

const MAX_TILE_CACHE = 256;
const tileCache = new Map<string, HTMLCanvasElement>();
const CROWN_BADGE_LOOK: BuffLook = { subject: 'rune', pose: 'crown', color: '#e7cd89' };

function trimBuffTiles(keep: number): void {
  while (tileCache.size > Math.max(0, keep)) {
    const oldest = tileCache.keys().next().value;
    if (oldest === undefined) break;
    const victim = tileCache.get(oldest);
    if (victim) releaseCanvas(victim);
    tileCache.delete(oldest);
  }
}

registerVisCache({
  id: 'buffTiles',
  count: () => tileCache.size,
  bytes: () => { let b = 0; for (const c of tileCache.values()) b += c.width * c.height * 4; return b; },
  onZoneSwap: () => trimBuffTiles(64),
  onRunSwap: () => trimBuffTiles(0),
});

/** Same last-stack clock the existing hover text describes. Unknown and
 * indefinite clocks do not invent an imminent expiry. Zero disables the wipe. */
export function buffExpiryFraction(buff: ActiveBuff, warningSeconds: number = VIS_CFG.buffIcons.warningSeconds): number {
  const remaining = buff.expiries?.length ? Math.max(...buff.expiries) : buff.remaining;
  return expiryFraction(remaining,warningSeconds);
}
function expiryFraction(remaining: number | undefined, seconds: number): number {
  return remaining !== undefined && Number.isFinite(remaining) && seconds > 0
    ? Math.max(0,Math.min(1,1-remaining/seconds)) : 0;
}

/** Applied duration includes the caster's duration scaling. An older HUD row can still show its last seconds. */
export function buffTimeFraction(row:Pick<BuffRow,'remaining'|'duration'>):number|undefined {
  if (row.remaining === undefined || !Number.isFinite(row.remaining) || row.remaining >= 900) return;
  const total = row.duration && row.duration > 0 ? row.duration : VIS_CFG.buffIcons.warningSeconds;
  return total > 0 ? Math.min(1,Math.max(0,row.remaining/total)) : undefined;
}

export interface BuffIconRect { x: number; y: number; w: number; h: number; }
/** Stable insertion order, wrapping upward within this player's hotbar width. */
export function buffIconRect(index: number, left: number, bottom: number, width: number, timers = false): BuffIconRect {
  const { size, gap } = VIS_CFG.buffIcons;
  const pitch = size + gap + (timers ? 26 : 0);
  const columns = Math.max(1, Math.floor((width + gap) / pitch));
  return { x: left + index % columns * pitch,
    y: bottom - size - Math.floor(index / columns) * (size + gap), w: size, h: size };
}

/** Keep the existing combo/proc/possession lanes above every wrapped row. */
export function buffAuxiliaryLift(count: number, width: number, timers = false): number {
  if (count <= 0) return 0;
  const top = buffIconRect(count - 1, 0, -VIS_CFG.buffIcons.barClearance, width, timers).y;
  return Math.max(0, -top + VIS_CFG.buffIcons.auxiliaryClearance - 46);
}

type BuffShape = (typeof BUFF_SHAPES)[keyof typeof BUFF_SHAPES];

function traceBuffShape(ctx: CanvasRenderingContext2D, shape: BuffShape, x: number, y: number, w: number, h: number): void {
  const cx = x + w / 2, cy = y + h / 2;
  ctx.beginPath();
  if (shape === 'circle') ctx.arc(cx, cy, w / 2 - 1, 0, Math.PI * 2);
  else if (shape === 'square') ctx.roundRect(x + 1, y + 1, w - 2, h - 2, 2);
  else {
    const sides = shape === 'diamond' ? 4 : 6;
    for (let i = 0; i < sides; i++) {
      const a = Math.PI * 2 * i / sides - Math.PI / 2;
      const px = cx + Math.cos(a) * (w / 2 - 1), py = cy + Math.sin(a) * (h / 2 - 1);
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
}

function paintClippedBuffBase(
  ctx: CanvasRenderingContext2D,
  row: BuffRow,
  x: number,
  y: number,
  w: number,
  h: number,
  shape: BuffShape,
  borderColor: string,
  grant: (typeof SUPPORTS)[string] | undefined,
  procColor: string | undefined,
  scale?: number,
): void {
  const cx = x + w / 2, cy = y + h / 2;
  traceBuffShape(ctx, shape, x, y, w, h);
  // Artwork painters may start their own paths. Keep a separate copy of the rim.
  ctx.strokeStyle = borderColor; ctx.lineWidth = 2; ctx.stroke();
  ctx.save(); ctx.clip();
  if (grant) {
    drawSkillIcon(ctx, supportIconFace(grant), x, y, w, false, scale);
    // Shared grantors (e.g. Heating Up and Hot Streak) retain the effect's own emblem.
    if (multipleSupportBuffs(grant)) {
      const side = w * .32, mid = cy + h * .18;
      ctx.fillStyle = '#10161e'; ctx.fillRect(cx - side / 2, mid - side / 2, side, side);
      drawBuffMark(ctx, row.look, cx, mid, side, 0, scale);
    }
  } else if (row.source && !row.effectFace) {
    drawSkillIcon(ctx, row.source, x, y, w, false, scale);
  } else {
    ctx.fillStyle = '#19202a'; ctx.fillRect(x, y, w, h);
    const look = procColor && !row.look.color ? { ...row.look, color: procColor } : row.look;
    drawBuffMark(ctx, look, cx, cy, w * .83, 0, scale);
  }
  if (row.draining) {
    ctx.fillStyle = row.look.color ?? VIS_CFG.buffIcons.fallbackColor;
    ctx.fillRect(x + 2, y + h - 4, w - 4, 2);
  }
  if (row.kind === 'passive') {
    const badge = w * .34, bx = cx - badge / 2, by = y + h * .56;
    ctx.fillStyle = '#30283a'; ctx.fillRect(bx, by, badge, badge);
    const gateSubject = row.gateMark ?? 'rune';
    const crownLook = gateSubject === 'rune' ? CROWN_BADGE_LOOK : { subject: gateSubject, pose: 'crown' as const, color: '#e7cd89' };
    drawBuffMark(ctx, crownLook, cx, by + badge / 2, badge, 0, scale);
  }
  ctx.restore();
}

/** Shared hotbar artwork, clipped to the effect silhouette.
 * Painting never advances clocks, changes stacks or modifies definitions. */
export function drawBuffIcon(ctx: CanvasRenderingContext2D, buff: ActiveBuff,
  rect: BuffIconRect, procCue?: ProcCueRow, pixelScale?: number): void {
  drawBuffTile(ctx, wornBuffRow(buff.def.id, buff), rect, procCue, undefined, undefined, false, pixelScale);
}

export function drawBuffTile(ctx: CanvasRenderingContext2D, row: BuffRow, rect: BuffIconRect, proc?: ProcCueRow, power?: SelfBankCue, skin?: CosmeticHotbarStyle, timers = false, pixelScale?: number): void {
  const {x,y,w,h}=rect, remaining=row.remaining;
  const fraction=buffTimeFraction(row);
  const balance = proc ? {color:proc.color, fill:Math.min(1,proc.count/proc.cap)} : power;
  const shape = BUFF_SHAPES[buffBehavior(row)], cx=x+w/2, cy=y+h/2;
  const borderColor = skin?.border ?? VIS_CFG.buffIcons.edge;
  const grantId=row.supportSources?.[0], grant=grantId && Object.hasOwn(SUPPORTS,grantId) ? SUPPORTS[grantId] : undefined;

  ctx.save();
  if (ctx.canvas && typeof document !== 'undefined' && w > 0 && h > 0) {
    let rawScale: number;
    if (pixelScale !== undefined) {
      rawScale = pixelScale;
    } else {
      const xf = ctx.getTransform();
      rawScale = Math.max(Math.hypot(xf.a, xf.b), Math.hypot(xf.c, xf.d));
    }
    const pw = Math.max(1, Math.min(256, Math.round(w * rawScale)));
    const ph = Math.max(1, Math.min(256, Math.round(h * rawScale)));
    const sx = pw / w;
    let faceKey: string;
    if (grant) {
      const multi = multipleSupportBuffs(grant);
      faceKey = `g:${skillIconTileKey(supportIconFace(grant), w, sx)}${multi ? `|m:${row.look.subject}:${row.look.pose}:${row.look.color ?? ''}` : ''}`;
    } else if (row.source && !row.effectFace) {
      faceKey = `s:${skillIconTileKey(row.source, w, sx)}`;
    } else {
      const effColor = (!row.look.color && proc) ? proc.color : (row.look.color ?? '');
      faceKey = `b:${row.look.subject}:${row.look.pose}:${effColor}:${BUFF_WEAR.outline}:${BUFF_WEAR.ink}`;
    }
    const drainColor = row.draining ? (row.look.color ?? VIS_CFG.buffIcons.fallbackColor) : '';
    const passiveKey = row.kind === 'passive' ? (row.gateMark ?? 'rune') : '';
    const tileKey = `${shape}|${borderColor}|${pw}x${ph}|${w}x${h}|${faceKey}|${drainColor}|${passiveKey}`;
    let tile = tileCache.get(tileKey);
    if (tile) {
      if (tileCache.size >= (MAX_TILE_CACHE * 7) >> 3) {
        tileCache.delete(tileKey);
        tileCache.set(tileKey, tile);
      }
    } else {
      tile = document.createElement('canvas');
      tile.width = pw; tile.height = ph;
      const tctx = tile.getContext('2d')!;
      tctx.scale(sx, ph / h);
      paintClippedBuffBase(tctx, row, 0, 0, w, h, shape, borderColor, grant, proc?.color, sx);
      if (tileCache.size >= MAX_TILE_CACHE) trimBuffTiles(MAX_TILE_CACHE - 1);
      tileCache.set(tileKey, tile);
    }
    ctx.drawImage(tile, x, y, w, h);
    if (row.kind !== 'passive' && balance) {
      if (shape === 'square') {
        ctx.fillStyle = '#201b20'; ctx.fillRect(x + 2, y + h - 4, w - 4, 2);
        ctx.fillStyle = balance.color; ctx.fillRect(x + 2, y + h - 4, (w - 4) * balance.fill, 2);
      } else {
        ctx.save(); traceBuffShape(ctx, shape, x, y, w, h); ctx.clip();
        ctx.fillStyle = '#201b20'; ctx.fillRect(x + 2, y + h - 4, w - 4, 2);
        ctx.fillStyle = balance.color; ctx.fillRect(x + 2, y + h - 4, (w - 4) * balance.fill, 2);
        ctx.restore();
      }
    }
  } else {
    paintClippedBuffBase(ctx, row, x, y, w, h, shape, borderColor, grant, proc?.color, pixelScale);
    if (row.kind !== 'passive' && balance) {
      ctx.save(); traceBuffShape(ctx, shape, x, y, w, h); ctx.clip();
      ctx.fillStyle = '#201b20'; ctx.fillRect(x + 2, y + h - 4, w - 4, 2);
      ctx.fillStyle = balance.color; ctx.fillRect(x + 2, y + h - 4, (w - 4) * balance.fill, 2);
      ctx.restore();
    }
  }
  if (fraction !== undefined) {
    const bw=w*.68, left=cx-bw/2;
    ctx.fillStyle='#080f14';ctx.fillRect(left-1,y+h-5,bw+2,4);
    ctx.fillStyle=skin?.trim ?? '#afd9cb';ctx.fillRect(left,y+h-4,bw*fraction,2);
    if (timers) {
      const text=remaining! < 10 ? remaining!.toFixed(1)+'s' : Math.ceil(remaining!)+'s';
      ctx.font='bold 10px Verdana';ctx.textBaseline='middle';ctx.textAlign='left';
      ctx.lineWidth=3;ctx.strokeStyle='#080d11';ctx.strokeText(text,x+w+1,cy,25);
      ctx.fillStyle='#fff';ctx.fillText(text,x+w+1,cy,25);
    }
  }
  if (row.count !== undefined) {
    if (grant) drawSupportNumber(ctx,row.count,x+w+1,y+4,11,w);
    else drawCountSeal(ctx,x+w-6,y+5,6.5,row.count,skin?.trim ?? '#c8d6d0');
  }
  ctx.restore();
}
