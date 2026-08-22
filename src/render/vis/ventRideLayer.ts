// ---------------------------------------------------------------------------
// THE VENT-RIDE LAYER — the drawn half of LeapDelivery.vent (the scald kit's
// GEYSER-STEP family: the vent-shaman's escape, the spout-hopper's skirmish
// hop, the player's Geyser-Step; charter docs/design/scald-kit.md §3.4).
//
// Two passes, both stateless (pure functions of world.time and the live
// cast/leap state — no particles, no rng):
//
//   drawVentRideBroil — UNDER actors: a vent-leaper's wind-up ROILS the ground
//                       under its own feet — THE BROIL LAW's one drawn word
//                       (geyserLayer.ts drawRoil: the vents' telegraph, the
//                       lake's deep, the crone's boil — never a second roil),
//                       the ramp = the cast bar's progress. The dodge-minds
//                       read the same cast through imminentThreatTo (the
//                       leap+vent branch), so drawn == tested: a body that
//                       stands in a roiling ring chose to.
//   drawVentRideJets  — OVER actors: the steam column a rising body left at
//                       its departure point — rushes up at take-off, holds,
//                       collapses behind the leaper (VIS_CFG.ventRide.jetFrac
//                       of the flight) — the vents' spout grammar at a
//                       body's scale. The body itself rides lifted in the
//                       renderer's leap draw (VIS_CFG.ventRide.lift).
//
// The column the engine TESTS at take-off is LeapDelivery.vent.columnR — the
// broil's mouth and the jet's width are fractions of it, so a wider column
// reads wider. Works in any zone (no geyser field required — THE NO-LOCK
// LAW: a vent-rider carries its column anywhere); co-op clients read the
// same cast/leap wire fields (CastW.vent / LeapW.vent).
// ---------------------------------------------------------------------------

import { drawRoil } from './geyserLayer';
import { VIS_CFG } from './visConfig';
import type { World } from '../../engine/world';

function inView(x: number, y: number, reach: number,
  camX: number, camY: number, vw: number, vh: number): boolean {
  return x + reach >= camX && x - reach <= camX + vw && y + reach >= camY && y - reach <= camY + vh;
}

/** A casting actor's vent column radius, or null when the cast is not a
 *  vent-ride (one read for host bodies and the client's cast stub alike). */
export function ventRideCastR(a: { casting: { inst: { def: { delivery?: unknown } }; mode: string; elapsed: number; total: number } | null }): number | null {
  const cs = a.casting;
  if (!cs || cs.mode === 'channel' || cs.mode === 'guard') return null;
  const d = cs.inst.def.delivery as { type?: string; vent?: { columnR: number } } | undefined;
  if (!d || d.type !== 'leap' || !d.vent) return null;
  return d.vent.columnR;
}

/** UNDER-ACTOR PASS: the wind-up's roil under every casting vent-leaper. */
export function drawVentRideBroil(ctx: CanvasRenderingContext2D, world: World,
  camX: number, camY: number, vw: number, vh: number): void {
  const t = world.time;
  let opened = false;
  for (const a of world.actors) {
    if (a.dead) continue;
    const cr = ventRideCastR(a);
    if (cr === null) continue;
    const cs = a.casting!;
    if (!inView(a.pos.x, a.pos.y, cr + 30, camX, camY, vw, vh)) continue;
    if (!opened) { ctx.save(); opened = true; }
    const b = cs.total > 0 ? Math.max(0, Math.min(1, cs.elapsed / cs.total)) : 1;
    drawRoil(ctx, a.pos.x, a.pos.y, cr * VIS_CFG.ventRide.broilMouthFrac, b, t, a.id);
    // The column's tested rim, firming through the wind-up (the un-exploded
    // disc grammar the landing telegraph uses) — the part the roil leaves
    // implicit: HOW FAR the steam reaches at take-off.
    ctx.globalAlpha = 0.12 + 0.28 * b;
    ctx.strokeStyle = '#e6fbff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(a.pos.x, a.pos.y, cr, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (opened) ctx.restore();
}

/** OVER-ACTOR PASS: the departure jet behind every rising vent-leaper. */
export function drawVentRideJets(ctx: CanvasRenderingContext2D, world: World,
  camX: number, camY: number, vw: number, vh: number): void {
  const t = world.time;
  let opened = false;
  for (const a of world.actors) {
    const L = a.leap;
    if (!L?.vent || a.dead || L.total <= 0) continue;
    const prog = Math.max(0, Math.min(1, 1 - L.timer / L.total));
    const jf = VIS_CFG.ventRide.jetFrac;
    if (prog >= jf) continue;
    const from = L.from ?? a.pos; // the client's leap stub has no `from` — the jet stands under the body
    const cr = L.vent.columnR;
    if (!inView(from.x, from.y, cr * 3 + 40, camX, camY, vw, vh)) continue;
    if (!opened) { ctx.save(); opened = true; }
    // Height rushes up in the first fifth of the jet's life, holds, then
    // collapses (the vents' column curve, compressed to the jet's window).
    const e = prog / jf;
    const hFrac = e < 0.2 ? e / 0.2 : e > 0.7 ? Math.max(0, (1 - e) / 0.3) : 1;
    const h = (cr * 2.2 + 28) * hFrac;
    if (h <= 2) continue;
    const w0 = cr * 0.6;
    const seed = a.id * 7.3;
    // Streaks.
    for (let i = 0; i < 4; i++) {
      const off = (Math.sin(seed + i * 2.3) * 0.5) * w0 * 0.9;
      const ww = w0 * (0.35 + 0.25 * (0.5 + 0.5 * Math.sin(seed * 1.7 + i)));
      const rise = ((t * (240 + 60 * i)) % h);
      ctx.globalAlpha = 0.3 * hFrac;
      ctx.fillStyle = i % 2 ? '#d6f6fa' : '#aee8f0';
      ctx.beginPath();
      ctx.ellipse(from.x + off, from.y - rise, ww * (1 - rise / (h * 1.6)), Math.min(22, 8 + rise * 0.2), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The core jet.
    ctx.globalAlpha = 0.48 * hFrac;
    const grad = ctx.createLinearGradient(from.x, from.y, from.x, from.y - h);
    grad.addColorStop(0, 'rgba(240, 253, 255, 0.9)');
    grad.addColorStop(1, 'rgba(190, 236, 244, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(from.x - w0 * 0.5, from.y);
    ctx.quadraticCurveTo(from.x - w0 * 0.2, from.y - h * 0.7, from.x - w0 * 0.14, from.y - h);
    ctx.lineTo(from.x + w0 * 0.14, from.y - h);
    ctx.quadraticCurveTo(from.x + w0 * 0.2, from.y - h * 0.7, from.x + w0 * 0.5, from.y);
    ctx.closePath();
    ctx.fill();
    // The plume puffs at the crown.
    ctx.globalAlpha = 0.36 * hFrac;
    ctx.fillStyle = '#eefbfd';
    for (let i = 0; i < 2; i++) {
      const px = from.x + (Math.sin(seed * 2.1 + i * 1.9) * 0.5) * w0 * 1.3;
      const py = from.y - h - 5 - (0.5 + 0.5 * Math.sin(seed + i)) * 8;
      ctx.beginPath();
      ctx.arc(px, py, w0 * (0.38 + 0.2 * i), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (opened) ctx.restore();
}
