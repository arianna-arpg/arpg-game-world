import type { Actor } from '../../engine/actor';
import { DEVICE_STATE_VISUALS } from '../../data/deviceVisuals';
import { lookPalette, PART_PAINTERS } from './parts';

/** Small body fittings show real arming / remote-fuse clocks. No fake area ring. */
export function drawDeviceState(ctx: CanvasRenderingContext2D, actor: Actor): void {
  const state = actor.construct;
  if (actor.dead || !state || state.kind !== 'trap' && state.kind !== 'mine') return;
  const spec = DEVICE_STATE_VISUALS[state.kind];
  const primed = state.detonationLeft !== undefined;
  const arming = state.timer > 0;
  const color = primed ? spec.queued : arming ? spec.arming : spec.ready;
  const fraction = arming ? 1 - state.timer / Math.max(.001, state.armingDuration ?? state.timer) : 1;
  const palette = lookPalette(color);
  ctx.save(); ctx.rotate(actor.facing);
  for (let i = 0; i < spec.parts.length; i++) {
    const part = spec.parts[i];
    PART_PAINTERS[part.kind]?.(ctx, actor.radius, { ...part, color,
      alpha: arming && fraction < (i + 1) / spec.parts.length ? .35 : 1 }, palette, 0);
  }
  ctx.restore();
}
