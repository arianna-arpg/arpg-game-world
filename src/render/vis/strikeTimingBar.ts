import type { CastingState } from '../../engine/actor';
import { STRIKE_TIMING_CFG, strikeTimingsOf } from '../../engine/strikeTiming';

/** Layer the golden tail first and the marker above it, regardless of socket order. */
export function drawStrikeTimingBar(ctx: CanvasRenderingContext2D, cs: CastingState,
  x: number, y: number, width: number, height: number): void {
  const timings = strikeTimingsOf(cs);
  if (timings.some(t => t.kind === 'perfect')) {
    const start = STRIKE_TIMING_CFG.perfect.start;
    ctx.fillStyle = 'rgba(255,215,0,0.55)';
    ctx.fillRect(x + width * start, y, width * (1 - start), height);
  }
  if (timings.some(t => t.kind === 'timed') && cs.indicatorAt !== undefined) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + width * cs.indicatorAt - 1, y - 2, 2, height + 4);
  }
}
