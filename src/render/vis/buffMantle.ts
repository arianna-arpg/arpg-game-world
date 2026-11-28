import { BUFF_POSE_COLORS, BUFF_WEAR, type BuffLook } from '../../data/buffLooks';
import type { BuffRow } from '../../engine/buffPresentation';
import { ICON_SUBJECTS } from '../skillIconArt';
import { registerVisCache } from './caches';
import { releaseCanvas } from './sprites';
import { statusInkPath } from './statusInk';

const MARK_PAD = 3;
const MARK_UNITS = 24 + MARK_PAD * 2; // 30 units covers stroke outline headroom
const MAX_MARK_CACHE = 256;
const markCache = new Map<string, HTMLCanvasElement>();

function trimMarks(keep: number): void {
  while (markCache.size > Math.max(0, keep)) {
    const oldest = markCache.keys().next().value;
    if (oldest === undefined) break;
    const victim = markCache.get(oldest);
    if (victim) releaseCanvas(victim);
    markCache.delete(oldest);
  }
}

registerVisCache({
  id: 'buffMarks',
  count: () => markCache.size,
  bytes: () => { let b = 0; for (const c of markCache.values()) b += c.width * c.height * 4; return b; },
  onZoneSwap: () => trimMarks(64),
  onRunSwap: () => trimMarks(0),
});

function paintBuffMarkLayers(ctx: CanvasRenderingContext2D, look: BuffLook): void {
  const layers = ICON_SUBJECTS[look.subject] ?? ICON_SUBJECTS.rune;
  const color = look.color ?? BUFF_POSE_COLORS[look.pose];
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const path = statusInkPath(layer.path);
    ctx.strokeStyle = BUFF_WEAR.outline;
    ctx.lineWidth = (layer.width ?? 1.35) + 3;
    ctx.stroke(path);
    if (layer.fill) {
      ctx.fillStyle = color;
      ctx.fill(path);
    }
    ctx.lineWidth = (layer.width ?? 1.35) + .5;
    ctx.strokeStyle = layer.fill ? BUFF_WEAR.ink : color;
    ctx.stroke(path);
  }
}

/** Use the original icon artwork as enamel and highlighted metal, with an
 * outer dark edge so pale ice and bright tiles do not swallow the silhouette. */
export function drawBuffMark(ctx: CanvasRenderingContext2D, look: BuffLook, x: number, y: number, size: number, angle = 0, pixelScale?: number): void {
  if (ctx.canvas && typeof document !== 'undefined') {
    let scale: number;
    if (pixelScale !== undefined) {
      scale = pixelScale;
    } else {
      const xf = ctx.getTransform();
      scale = Math.max(Math.hypot(xf.a, xf.b), Math.hypot(xf.c, xf.d));
    }
    const drawSpan = size * (MARK_UNITS / 24);
    const pxSpan = Math.max(15, Math.min(240, Math.ceil(drawSpan * scale)));
    const subjectKey = Object.hasOwn(ICON_SUBJECTS, look.subject) ? look.subject : 'rune';
    const color = look.color ?? BUFF_POSE_COLORS[look.pose];
    const key = `${subjectKey}|${color}|${BUFF_WEAR.outline}|${BUFF_WEAR.ink}|${pxSpan}`;
    let sprite = markCache.get(key);
    if (sprite) {
      if (markCache.size >= (MAX_MARK_CACHE * 7) >> 3) {
        markCache.delete(key);
        markCache.set(key, sprite);
      }
    } else {
      sprite = document.createElement('canvas');
      sprite.width = sprite.height = pxSpan;
      const mctx = sprite.getContext('2d')!;
      mctx.scale(pxSpan / MARK_UNITS, pxSpan / MARK_UNITS);
      mctx.translate(MARK_PAD, MARK_PAD);
      paintBuffMarkLayers(mctx, look);
      if (markCache.size >= MAX_MARK_CACHE) trimMarks(MAX_MARK_CACHE - 1);
      markCache.set(key, sprite);
    }
    const half = drawSpan / 2;
    if (angle === 0) {
      ctx.drawImage(sprite, x - half, y - half, drawSpan, drawSpan);
    } else {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.drawImage(sprite, -half, -half, drawSpan, drawSpan);
      ctx.restore();
    }
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(size / 24, size / 24);
  ctx.translate(-12, -12);
  paintBuffMarkLayers(ctx, look);
  ctx.restore();
}

const wornScratch: BuffRow[] = [];
const poseCounts: Record<string, number> = Object.create(null);

function rowPriority(r: BuffRow): number {
  return (r.count !== undefined ? 2 : 0) + (r.kind !== 'passive' ? 1 : 0);
}

function compareWornRows(a: BuffRow, b: BuffRow): number {
  return rowPriority(b) - rowPriority(a) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id);
}

/** Body-space attachments. Trailing feathers follow movement/facing, plates
 * clasp both shoulders, recovery drifts upward, hand effects fan at the weapon.
 * Sort by actual bank and identity so a refresh never shuffles a crowded body. */
export function drawBuffMantle(ctx: CanvasRenderingContext2D, rows: readonly BuffRow[], radius: number,
  facing: number, time: number): void {
  if (!rows.length) return;
  wornScratch.length = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.look.pose !== 'native') wornScratch.push(row);
  }
  if (!wornScratch.length) return;
  if (wornScratch.length > 1) wornScratch.sort(compareWornRows);
  const count = Math.min(wornScratch.length, BUFF_WEAR.maxLayers);
  for (let i = 0; i < count; i++) poseCounts[wornScratch[i].look.pose] = 0;

  let ps: number | undefined;
  if (ctx.canvas) {
    const xf = ctx.getTransform();
    ps = Math.max(Math.hypot(xf.a, xf.b), Math.hypot(xf.c, xf.d));
  }

  const r = Math.max(7, Math.min(30,radius)), size = Math.max(10,Math.min(18,r));
  for (let wi = 0; wi < count; wi++) {
    const row = wornScratch[wi];
    const {look} = row;
    const slot = poseCounts[look.pose];
    poseCounts[look.pose] = slot + 1;
    const units = Math.max(1, Math.min(BUFF_WEAR.maxPieces,row.count ?? 1));
    const beat = Math.sin(time*2.3 + slot);
    ctx.save();
    if (look.pose === 'shoulder' || look.pose === 'hand' || look.pose === 'trail') ctx.rotate(facing);
    if (look.pose === 'shoulder') {
      for (const side of [-1,1]) for (let i=0; i<units; i++) {
        ctx.save(); ctx.translate(-r*.18-i*3-slot*7,side*(r*.82+i)); ctx.rotate(-facing+side*.2);
        drawBuffMark(ctx,look,0,0,size*.92,0,ps); ctx.restore();
      }
    } else if (look.pose === 'hand') {
      for (let i=0; i<units; i++) {
        const arc = -.6 + slot*.85 + (i-(units-1)/2)*.42;
        drawBuffMark(ctx,look,Math.cos(arc)*(r+3),Math.sin(arc)*(r+3),size,-facing+beat*.12,ps);
      }
    } else if (look.pose === 'trail') {
      for (let i=1; i>=0; i--) {
        ctx.save(); ctx.globalAlpha *= i ? .55 : .94;
        drawBuffMark(ctx,look,-r*(.8+i*.5),r*(slot*.65-.32)+i*4+beat*1.5,size*(i ? .65 : 1),-.65,ps); ctx.restore();
      }
    } else if (look.pose === 'rise') {
      const span = Math.max(2, units);
      for (let i=0; i<span; i++) {
        const t = (time*.49+i/span)%1;
        ctx.save(); ctx.globalAlpha *= .35+.65*Math.sin(Math.PI*t);
        drawBuffMark(ctx,look,r*(.65+slot*.6)+Math.sin(t*4)*3,r*(.7-t*1.9),size*.85,0,ps); ctx.restore();
      }
    } else {
      drawBuffMark(ctx,look,(slot%2 ? -1 : 1)*Math.ceil(slot/2)*size,-r-3+beat*1.5,size,0,ps);
    }
    ctx.restore();
  }
  wornScratch.length = 0;
}
