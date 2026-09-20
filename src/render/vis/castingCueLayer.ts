import type { Actor } from '../../engine/actor';
import { castingCueOf } from '../../engine/castingCues';
import { CASTING_CUE_CFG as C, castingCueStyle } from '../../data/castingCues';

/** Four separated corners close around held work, then form a steady seal.
 * No pulse oscillator: a readied hold stays visibly ready without flashing. */
export function drawCastingCue(ctx: CanvasRenderingContext2D, a: Actor): void {
  const cue = castingCueOf(a);
  if (!cue) return;
  const cfg = castingCueStyle(cue.style), r = cfg.radius;
  ctx.save(); ctx.rotate(cue.facing); ctx.translate(a.radius + cfg.frontPad, 0);
  ctx.globalAlpha *= C.emptyAlpha + (C.fullAlpha - C.emptyAlpha) * cue.fill;
  ctx.strokeStyle = cue.fill >= 1 ? C.readyColor : cue.color; ctx.lineWidth = cfg.width;
  const distance = r * (1.15 - 0.45 * cue.fill), arm = r * (0.12 + 0.58 * cue.fill);
  for (let i = 0; i < cfg.corners; i++) {
    ctx.save(); ctx.rotate(i * Math.PI * 2 / cfg.corners + Math.PI / 4);
    ctx.beginPath(); ctx.moveTo(distance, -arm); ctx.lineTo(distance, arm); ctx.stroke(); ctx.restore();
  }
  if (cue.fill >= 1) {
    ctx.fillStyle = cue.color; ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** A broken concentration frame visibly splits; reacquisition closes it.
 * The existing draining bar supplies quantity, the frame supplies state. */
export function drawFocusFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, broken: boolean): void {
  ctx.save(); ctx.strokeStyle = broken ? C.brokenColor : C.focusColor; ctx.lineWidth = 1.5;
  if (!broken) ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
  else {
    const gap = C.focusGap;
    for (const side of [-1, 1]) {
      const at = side < 0 ? x - gap : x + w + gap;
      ctx.beginPath(); ctx.moveTo(at - side * 6, y - 4); ctx.lineTo(at, y - 1);
      ctx.lineTo(at, y + h + 1); ctx.lineTo(at - side * 6, y + h + 4); ctx.stroke();
    }
  }
  ctx.restore();
}
