// ---------------------------------------------------------------------------
// THE TRACK LAYER — the drawn half of the track fabric (engine/tracks.ts).
//
// Three passes, every one sampling THE SAME pure resolver the contact sweep
// tests (trackPose / riderSurface), so drawn == tested == foretold:
//
//   drawTrackLanes    — lane strokes for tracks WITHOUT a baked groove
//                       (runtime-ensured lanes; gen lanes carved a real
//                       'track_groove' way into the ground bake instead).
//   drawTrackWarnArcs — the APPROACH TELEGRAPH: a fading band stroked AHEAD
//                       of each rider along its lane — the exact ground the
//                       blade will cover next, from the same future the
//                       dodge-AI's imminentThreatTo samples.
//   drawTrackRiders   — the bodies, as SYNTHETIC doodads fed through the one
//                       painter registry (zero renderer kind-switches; a new
//                       rider look is a DOODAD_VISUALS row).
//
// Riders live OUTSIDE world.doodads on purpose: every doodad cache (spatial
// index, light clusters, ground bake) assumes static positions — a moving
// body would smear or thrash rebuilds. Synthetic groups cost none of that.
// ---------------------------------------------------------------------------

import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import type { Doodad } from '../../engine/levelgen';
import { TRACK_CFG, trackDone, trackPending, trackPose, type PlacedTrack } from '../../engine/tracks';
import type { World } from '../../engine/world';
import { withAlpha } from './color';
import { PAINTERS, type PaintEnv } from './painters';

/** Retracted (disarmed) or retired (done once-) lanes draw nothing at all —
 *  the trapworks appear/disappear contract: what cannot hurt you is not
 *  shown. A gen-carved groove stays baked in the ground as the only tell. */
function laneLive(tr: PlacedTrack, time: number): boolean {
  return tr.armed && !trackDone(tr, time);
}

/** Track bound vs the camera window (both inflated a little — warn arcs and
 *  beam sweeps reach past the polyline). */
function inView(tr: PlacedTrack, camX: number, camY: number, vw: number, vh: number): boolean {
  const pad = 80;
  return tr.bound.x1 >= camX - pad && tr.bound.x0 <= camX + vw + pad &&
         tr.bound.y1 >= camY - pad && tr.bound.y0 <= camY + vh + pad;
}

/** Lane strokes for grooveless (runtime-ensured) tracks: a faint scored line
 *  so even a lane the generator never carved stays learnable at a glance. */
export function drawTrackLanes(ctx: CanvasRenderingContext2D, world: World,
  camX: number, camY: number, vw: number, vh: number): void {
  for (const tr of world.tracks) {
    if (tr.spec.groove) continue;               // the ground bake already carries it
    if (!laneLive(tr, world.time)) continue;
    if (!inView(tr, camX, camY, vw, vh)) continue;
    const pts = tr.arc.pts;
    ctx.save();
    ctx.strokeStyle = 'rgba(20, 26, 34, 0.38)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150, 190, 220, 0.14)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

/** The approach telegraph: a band stroked AHEAD of each armed rider over the
 *  ground it covers next (warnAhead px of lane), alpha fading with distance.
 *  Sampled from the rider's ACTUAL future — the pure resolver again — so a
 *  pause plateau or a pingpong turn shows exactly where the blade will truly
 *  go, never a naive straight-line guess. */
export function drawTrackWarnArcs(ctx: CanvasRenderingContext2D, world: World,
  camX: number, camY: number, vw: number, vh: number): void {
  for (const tr of world.tracks) {
    if (!laneLive(tr, world.time)) continue;
    if (!inView(tr, camX, camY, vw, vh)) continue;
    // THE RAKE — a PENDING lane (bornAt ahead) strokes its WHOLE coming way,
    // pulsing harder as birth nears: the volley's firing lines lighting the
    // room before the bolts fly, the boulder's runway rumbling awake. Same
    // honest geometry (the arc IS the future for a once-lane).
    if (trackPending(tr, world.time)) {
      const r0 = tr.riders[0];
      if (r0 && (r0.def.payload.hit || r0.def.payload.impulse)) {
        const lead = (tr.spec.bornAt ?? 0) - world.time;
        const pulse = 0.16 + 0.2 * (0.5 + 0.5 * Math.sin(world.time * 11))
          + 0.16 * Math.max(0, 1 - lead / 1.2);
        const width = r0.def.surface.kind === 'circle'
          ? r0.def.surface.r * 1.6
          : Math.min(r0.def.surface.hw, r0.def.surface.hh) * 2.4;
        const pts = tr.arc.pts;
        ctx.save();
        ctx.strokeStyle = withAlpha(r0.def.color ?? '#e8b45a', Math.min(0.5, pulse));
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.restore();
      }
      continue;
    }
    const speed = Math.max(1e-3, tr.spec.speed);
    for (const r of tr.riders) {
      const p = r.def.payload;
      if (!p.hit && !p.impulse) continue;
      const warn = r.def.warnAhead ?? TRACK_CFG.warnAhead;
      if (warn <= 0) continue;
      const width = r.def.surface.kind === 'circle'
        ? r.def.surface.r * 1.6
        : Math.min(r.def.surface.hw, r.def.surface.hh) * 2.4;
      const color = r.def.color ?? '#9fd8ec';
      const aheadSec = warn / speed;
      const steps = 7;
      ctx.save();
      ctx.lineCap = 'round';
      let prev = trackPose(tr, world.time, r.phase, r.def);
      for (let k = 1; k <= steps; k++) {
        const pose = trackPose(tr, world.time + (aheadSec * k) / steps, r.phase, r.def);
        const fade = 0.34 * (1 - (k - 1) / steps);
        ctx.strokeStyle = withAlpha(color, fade);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pose.x, pose.y);
        ctx.stroke();
        prev = pose;
      }
      ctx.restore();
    }
  }
}

/** The riders — synthetic doodads through the painter registry. A rider's
 *  synthetic radius is its SURFACE reach and its rot is the posed surface
 *  rot, so a painter that draws to d.radius under d.rot is drawing the
 *  tested geometry by construction. */
export function drawTrackRiders(ctx: CanvasRenderingContext2D, world: World,
  camX: number, camY: number, vw: number, vh: number): void {
  if (!world.tracks.length) return;
  const env: PaintEnv = { ctx, theme: world.zone.theme, time: world.time, world };
  for (const tr of world.tracks) {
    if (!laneLive(tr, world.time)) continue;
    if (!inView(tr, camX, camY, vw, vh)) continue;
    for (const r of tr.riders) {
      const def = DOODAD_VISUALS[r.def.kind];
      const painter = def ? PAINTERS[def.painter] : undefined;
      if (!def || !painter) continue;
      const pose = trackPose(tr, world.time, r.phase, r.def);
      const reach = r.def.surface.kind === 'circle'
        ? r.def.surface.r : Math.max(r.def.surface.hw, r.def.surface.hh);
      const d: Doodad = { pos: { x: pose.x, y: pose.y }, radius: reach, kind: r.def.kind, rot: pose.rot };
      painter(env, [d], def);
    }
  }
}
