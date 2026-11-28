import type { ActiveBuff } from '../../engine/actor';
import { formatModLine } from '../../engine/items';
import { VIS_CFG } from './visConfig';

/** Describe the actual native payload, including conditional/tagged modifiers.
 * Values are per stack; no recalculation or claims about unrelated buff verbs. */
export function buffReadoutLines(id: string, buff: ActiveBuff): string[] {
  const rem = Math.max(...buff.expiries ?? [buff.remaining ?? 0]);
  const clock = rem > 0 && rem < 900 ? Math.ceil(rem) + 's' : '';
  const name = buff.def.label ?? id.replace(/_/g, ' ');
  return [(name + (buff.stacks > 1 ? ' ×' + buff.stacks : '') + (clock ? ' · ' + clock : '')),
    ...(buff.def.mods.length ? [buff.stacks > 1 ? 'Modifiers per stack' : 'Modifiers',
      ...buff.def.mods.map(m => formatModLine(m, m.value))] : [])];
}

const readoutLayoutCache = new Map<string, { shown: readonly string[]; contentW: number }>();

/** One bounded hover card above the bar. It never advances the native clock. */
export function drawBuffReadout(ctx: CanvasRenderingContext2D, source: readonly string[],
  center: number, bottom: number, viewportWidth: number): void {
  const c = VIS_CFG.buffReadout;
  if (!source.length) return;
  const width = Math.min(c.maxWidth, viewportWidth - c.margin * 2), inner = width - c.pad * 2;
  if (inner < 32) return;
  const budget = Math.min(c.maxRows, Math.floor((bottom - c.margin - c.pad * 2) / c.lineHeight));
  if (budget < 1) return;
  ctx.save(); ctx.font = c.font; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const canCache = !!ctx.canvas;
  const cacheKey = canCache ? `${c.font}|${inner}|${budget}|${source.join('\n')}` : '';
  let cached = canCache ? readoutLayoutCache.get(cacheKey) : undefined;
  if (!cached) {
    const rows: string[] = [];
    for (let li = 0; li < source.length; li++) {
      let row = '';
      const words = source[li].split(' ');
      for (let wi = 0; wi < words.length; wi++) {
        const word = words[wi];
        if (row && ctx.measureText(row + ' ' + word).width > inner) { rows.push(row); row = ''; }
        if (ctx.measureText(word).width > inner) {
          if (row) { rows.push(row); row = ''; }
          const points = [...word];
          while (points.length && ctx.measureText(points.join('') + '…').width > inner) points.pop();
          rows.push(points.join('') + '…');
        } else row += (row ? ' ' : '') + word;
      }
      if (row) rows.push(row);
    }
    const shown = rows.length > budget ? [...rows.slice(0, budget - 1), '… more modifiers'] : rows;
    let contentW = 0;
    for (let i = 0; i < shown.length; i++) {
      const mw = ctx.measureText(shown[i]).width;
      if (mw > contentW) contentW = mw;
    }
    cached = { shown, contentW };
    if (canCache) {
      if (readoutLayoutCache.size >= 128) readoutLayoutCache.delete(readoutLayoutCache.keys().next().value!);
      readoutLayoutCache.set(cacheKey, cached);
    }
  }
  const { shown, contentW } = cached;
  const w = Math.min(width, contentW + c.pad * 2);
  const h = shown.length * c.lineHeight + c.pad * 2;
  const x = Math.max(c.margin, Math.min(viewportWidth - c.margin - w, center - w / 2)), y = bottom - h;
  ctx.fillStyle = c.background; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = c.edge; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  for (let i = 0; i < shown.length; i++) {
    ctx.fillStyle = i ? c.detail : c.title;
    ctx.fillText(shown[i], x + c.pad, y + c.pad + c.ascent + i * c.lineHeight);
  }
  ctx.restore();
}
