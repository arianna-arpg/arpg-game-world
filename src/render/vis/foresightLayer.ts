// ---------------------------------------------------------------------------
// THE FORESIGHT's painter (engine/foresight.ts holds the resolve): an enemy
// wind-up marks where the blow will land, in the skill's color, firming toward
// impact. GROUND footprints ring their landing spot (plus a center pip); MELEE
// swings and breath CONES wedge out from the body along the stamped aim (the
// cast lock pins the pose there and the resolve fires there); hostile NOVAS
// ring the caster. Read it, step out. Toggleable (Settings.castTelegraphs).
//
// It draws from the geometry alone, so a render shell draws the host's own row
// (THE FORESIGHT ON THE WIRE) with the very strokes the host draws its resolve.
// ---------------------------------------------------------------------------

import type { CastingState } from '../../engine/actor';
import type { ForesightGeo } from '../../engine/foresight';
import { FORESIGHT_FULL_RING } from '../../engine/foresight';
import { AOE_SHAPE } from '../../engine/skills';
import { clamp } from '../../core/math';
import { traceAoePath } from './aoeTrace';

/** How far the wind-up has firmed, 0..1: channels breathe with the pulse clock, bar casts
 *  firm once. */
export function foresightProgress(fc: CastingState): number {
  return fc.mode === 'channel'
    ? (fc.total > 0 ? clamp(1 - Math.max(0, fc.pulseTimer ?? 0) / fc.total, 0, 1) : 1)
    : (fc.total > 0 ? clamp(fc.elapsed / fc.total, 0, 1) : 1);
}

/** Paint one wind-up's geometry in world space (`x`, `y`: the caster's drawn body; `facing`:
 *  its drawn facing, which a channel's wedge rides). Preserve the caller's
 *  state: an occluded caster's body opacity must never escape into later passes. */
export function drawForesight(ctx: CanvasRenderingContext2D, geo: ForesightGeo, x: number, y: number, facing: number, prog: number): void {
  if (geo.kind === 'ground') {
    const aim = geo.aim;
    const rr = geo.reach;
    ctx.save();
    ctx.translate(aim.x, aim.y); // world space: the body transform ended above
    ctx.strokeStyle = geo.color;
    ctx.globalAlpha = 0.18 + 0.3 * prog;
    ctx.lineWidth = 1.5 + prog * 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // The fill breathes in as the cast completes.
    ctx.globalAlpha = 0.05 + 0.09 * prog;
    ctx.fillStyle = geo.color;
    ctx.beginPath();
    ctx.arc(0, 0, rr * (0.35 + 0.65 * prog), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5 + 0.4 * prog;
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const { reach, inner, arcRad } = geo;
  const ang = geo.track ? facing : geo.ang;
  const full = arcRad >= FORESIGHT_FULL_RING;
  const wedge = (r0: number, r1: number): void => {
    ctx.beginPath();
    if (full) {
      ctx.arc(x, y, r1, 0, Math.PI * 2);
      if (r0 > 0) ctx.arc(x, y, r0, Math.PI * 2, 0, true);
    } else if (r0 > 0) {
      ctx.arc(x, y, r1, ang - arcRad / 2, ang + arcRad / 2);
      ctx.arc(x, y, r0, ang + arcRad / 2, ang - arcRad / 2, true);
      ctx.closePath();
    } else {
      ctx.moveTo(x, y);
      ctx.arc(x, y, r1, ang - arcRad / 2, ang + arcRad / 2);
      ctx.closePath();
    }
  };
  ctx.save();
  ctx.strokeStyle = geo.color;
  ctx.globalAlpha = 0.18 + 0.3 * prog;
  ctx.lineWidth = 1.5 + prog * 1.5;
  ctx.setLineDash([6, 6]);
  // THE CROSSING STRIP's foresight: a banded swing draws its STRIP (the resolve's
  // bandSwingGeo), so the pit champion's third beat reads as a sweep across your face,
  // never as a wedge into it.
  const band = geo.band;
  const bandC = band ? { x: x + Math.cos(ang) * band.standoff, y: y + Math.sin(ang) * band.standoff } : null;
  const figure = (r1: number): void => {
    if (band && bandC) {
      ctx.beginPath();
      traceAoePath(ctx, bandC.x, bandC.y, band.halfWidth * (r1 / reach), AOE_SHAPE.band, ang);
    } else {
      wedge(inner, r1);
    }
  };
  figure(reach);
  ctx.stroke();
  ctx.setLineDash([]);
  // The fill sweeps out from the body as the swing commits (a strip firms from its centre
  // outward).
  ctx.globalAlpha = 0.05 + 0.09 * prog;
  ctx.fillStyle = geo.color;
  figure(Math.max(inner + 2, reach * (0.35 + 0.65 * prog)));
  ctx.fill();
  ctx.restore();
}
