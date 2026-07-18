// ---------------------------------------------------------------------------
// THE TRAP LAYER — the drawn half of the trapworks fabric (engine/trapworks).
//
// The mechanisms themselves already draw through existing lanes: plates and
// maws are ordinary doodads (painter registry), loosed boulders and volleys
// are track riders (vis/trackLayer.ts — the pending RAKE stroke is their
// telegraph), sprung floors are chasmPit doodads. This layer adds only the
// CLOSE-UP RESOLVE for hidden triggers: inside TRAPWORK_CFG.revealNear of
// the local hero, a near-indistinguishable plate's outline breathes into
// view — the keen eye at a walk spots what a sprint never will. Skill-based
// spotting, no stat gate (a future `trapSense` reveal hooks here — one
// documented seam, docs/engine/trapworks.md).
// ---------------------------------------------------------------------------

import { trapAnchor, TRAPWORK_CFG } from '../../engine/trapworks';
import type { World } from '../../engine/world';
import { withAlpha } from './color';

export function drawTrapworkTells(ctx: CanvasRenderingContext2D, world: World,
  heroX: number, heroY: number): void {
  if (!world.trapworks.length) return;
  for (const tw of world.trapworks) {
    if (!tw.spec.hidden || tw.state !== 'armed') continue;
    const at = trapAnchor(tw.spec.trigger);
    const d = Math.hypot(at.x - heroX, at.y - heroY);
    if (d > TRAPWORK_CFG.revealNear) continue;
    // 0 at the reveal rim → full at half range: the closer look, the surer.
    const sure = Math.min(1, (TRAPWORK_CFG.revealNear - d) / (TRAPWORK_CFG.revealNear * 0.5));
    const pulse = 0.5 + 0.5 * Math.sin(world.time * 3.2);
    const r = (tw.spec.trigger.r ?? TRAPWORK_CFG.plateRadius) + 3;
    ctx.save();
    ctx.strokeStyle = withAlpha(tw.spec.color ?? TRAPWORK_CFG.springColor, sure * (0.18 + 0.14 * pulse));
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.rect(at.x - r, at.y - r, r * 2, r * 2);
    ctx.stroke();
    ctx.restore();
  }
}
