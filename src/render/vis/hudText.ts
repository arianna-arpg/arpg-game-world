import { VIS_CFG } from './visConfig';

/** Screen-space status text keeps its authored color over bright or dark ground. */
export function drawHudText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  const c = VIS_CFG.hudText;
  if (c.enabled && c.outline > 0) {
    ctx.save();
    ctx.strokeStyle = c.edge;
    ctx.lineWidth = c.outline;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
    ctx.restore();
  }
  ctx.fillText(text, x, y);
}
