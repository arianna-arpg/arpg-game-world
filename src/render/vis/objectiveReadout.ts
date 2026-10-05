import { drawHudText } from './hudText';
import { wrapNotice } from './noticeLayout';
import { VIS_CFG } from './visConfig';

/** Public objective text, cached per renderer. No discovery or world mutation. */
export class ObjectiveReadout {
  private key = '';
  private lines: string[] = [];
  /** Next baseline keeps bearings, buffs and notices below every visible row. */
  draw(ctx: CanvasRenderingContext2D, text: string,
    x: number, y: number, availableWidth: number): number {
    const c = VIS_CFG.objectiveReadout;
    if (availableWidth < c.minWidth) return y + c.gap;
    ctx.save();
    ctx.font = c.font;
    const width = Math.min(c.maxWidth, availableWidth);
    const key = JSON.stringify([c.font, width, c.maxRows, c.maxCharacters, text]);
    if (key !== this.key) {
      const points = Array.from(text);
      const bounded = points.length > c.maxCharacters ? points.slice(0, c.maxCharacters).join('') + '…' : text;
      this.lines = wrapNotice(bounded, width, c.maxRows, value => ctx.measureText(value).width);
      this.key = key;
    }
    this.lines.forEach((line, i) => drawHudText(ctx, line, x, y + i * c.lineHeight));
    ctx.restore();
    return y + Math.max(0, this.lines.length - 1) * c.lineHeight + c.gap;
  }
}
