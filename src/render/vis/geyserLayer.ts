// ---------------------------------------------------------------------------
// THE GEYSER LAYER — the drawn half of the geyser fabric (engine/geysers.ts).
//
// Two passes, both sampling THE SAME pure resolver the column sweep tests
// (ventReadAt), so drawn == tested == foretold:
//
//   drawGeyserBroil   — UNDER actors: the water itself as the warning (THE
//                       BROIL LAW — her ruled shape): roil rings rising over
//                       the telegraph window, the pool wash brightening, and
//                       at the beat the splash ring whose rim IS the column's
//                       tested disc. No countdown rings, no floaters — the
//                       show-don't-tell law; the dodge-AI reads the same
//                       clock through imminentThreatTo.
//   drawGeyserColumns — OVER actors (a spout wraps whoever stands in it):
//                       the column, the plume, and the lob comets arcing out
//                       of it to their hashed landings (StormDelivery's lob
//                       idiom — render-only; the landing side effects are the
//                       world's pock planter). Steam thickens through the
//                       broil so the tell reads at a squint.
//
// Stateless by construction: every shape is a pure function of world.time,
// the mint-rolled field, and integer hashes — no particle state, no rng.
// The sight veil composites above both passes, so a column behind a wall
// hides exactly like the body standing in it.
// ---------------------------------------------------------------------------

import { cometFanOf, GEYSER_CFG, ventDownstream, ventReadAt, type PlacedVent } from '../../engine/geysers';
import type { World } from '../../engine/world';

/** Deterministic per-(vent,seed) unit float — the wisp/bubble scatter hash
 *  (the rideCapOf family's discipline: no rng stream, no state). */
function h01(a: number, b: number): number {
  let v = Math.imul(a + 1, 2654435761) >>> 0;
  v = (v ^ Math.imul(b + 1, 0x9e3779b1)) >>> 0;
  v = Math.imul(v ^ (v >>> 15), 2246822519) >>> 0;
  return ((v ^ (v >>> 13)) >>> 0) / 4294967296;
}

function inView(p: { x: number; y: number }, reach: number,
  camX: number, camY: number, vw: number, vh: number): boolean {
  return p.x + reach >= camX && p.x - reach <= camX + vw
    && p.y + reach >= camY && p.y - reach <= camY + vh;
}

/** THE ROIL — the one drawn word for "this water is about to hurt you"
 *  (THE BROIL LAW, charter §3/§6): the pool brightens and rings swell
 *  outward, faster and denser as `b` (the broil ramp, 0..1) rises, bubbles
 *  popping on quantized beats. A vent wears it for the telegraph window
 *  before it bursts (drawGeyserBroil); THE LAKE's refused deep wears it
 *  forever (render/vis/lakeLayer.ts — the same function, never a second
 *  roil). `seed` keys the bubble scatter (the vent ordinal / the seat hash).
 *  Stateless: a pure function of (t, b, seed). Leaves globalAlpha dirty —
 *  callers run inside their own save/restore. */
export function drawRoil(ctx: CanvasRenderingContext2D, x: number, y: number,
  mouthR: number, b: number, t: number, seed: number): void {
  ctx.globalAlpha = 0.16 + 0.3 * b;
  ctx.fillStyle = '#bff0f6';
  ctx.beginPath();
  ctx.arc(x, y, mouthR * (0.8 + 0.25 * b), 0, Math.PI * 2);
  ctx.fill();
  const rings = 2 + Math.floor(b * 2);
  for (let i = 0; i < rings; i++) {
    // Each ring runs mouth-rim → a broil ring just past it, on its own
    // offset of the accelerating roil clock.
    const cyc = (t * (0.9 + 1.6 * b) + i / rings) % 1;
    const rr = mouthR * (0.45 + cyc * (0.75 + 0.45 * b));
    ctx.globalAlpha = (1 - cyc) * (0.2 + 0.4 * b);
    ctx.strokeStyle = '#e6fbff';
    ctx.lineWidth = 1.6 + b * 1.4;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Bubbles: a few hashed seats popping on quantized beats.
  const nb = 3 + Math.floor(b * 5);
  const q = Math.floor(t * 6);
  ctx.fillStyle = '#f2feff';
  for (let i = 0; i < nb; i++) {
    const ang = h01(seed * 31 + i, q) * Math.PI * 2;
    const d = h01(seed * 47 + i, q ^ 0x5b) * mouthR * 0.8;
    ctx.globalAlpha = 0.25 + 0.45 * b * h01(seed + i, q ^ 0x91);
    ctx.beginPath();
    ctx.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 1.2 + 1.6 * b, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** UNDER-ACTOR PASS: the broiling water + the burst's ground splash. */
export function drawGeyserBroil(ctx: CanvasRenderingContext2D, world: World,
  camX: number, camY: number, vw: number, vh: number): void {
  const f = world.geysers;
  if (!f) return;
  const t = world.time;
  ctx.save();
  for (let vi = 0; vi < f.vents.length; vi++) {
    const v = f.vents[vi];
    const cls = GEYSER_CFG.classes[v.cls];
    if (!inView(v.pos, cls.columnR + 40, camX, camY, vw, vh)) continue;
    const read = ventReadAt(f, v, t, world.geyserMode);
    const mouthR = GEYSER_CFG.mouthR[v.cls];
    if (read.phase === 'broil') {
      // THE ROIL: the water itself is the whole warning (drawRoil — the
      // one drawn word; the lake's deep wears the same function forever).
      drawRoil(ctx, v.pos.x, v.pos.y, mouthR, read.broil, t, vi);
    } else if (read.phase === 'erupt') {
      // THE SPLASH RING: the drawn rim IS the tested disc (columnR) —
      // flaring at the beat, receding as the column spends itself.
      const e = read.sinceBurst / Math.max(0.001, cls.eruptSec);
      const rr = cls.columnR * (0.75 + 0.25 * Math.min(1, e * 3));
      ctx.globalAlpha = 0.5 * (1 - e * 0.6);
      ctx.fillStyle = '#d9f7fb';
      ctx.beginPath();
      ctx.arc(v.pos.x, v.pos.y, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.8 * (1 - e * 0.5);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(v.pos.x, v.pos.y, cls.columnR, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** The column's screen-up spout: a tapered stack of water streaks + a plume
 *  cloud, all pure functions of the erupt clock. */
function drawColumn(ctx: CanvasRenderingContext2D, v: PlacedVent, vi: number,
  sinceBurst: number, eruptSec: number, columnR: number): void {
  const e = sinceBurst / Math.max(0.001, eruptSec);
  // Height rushes up in the first fifth, holds, then collapses.
  const hFrac = e < 0.2 ? e / 0.2 : e > 0.8 ? Math.max(0, (1 - e) / 0.2) : 1;
  const h = (columnR * 2.4 + 36) * hFrac;
  if (h <= 2) return;
  const w0 = columnR * 0.62;
  ctx.save();
  // The spout: overlapping vertical streaks, jittered by hash per band.
  for (let i = 0; i < 5; i++) {
    const off = (h01(vi * 13 + i, 3) - 0.5) * w0 * 0.9;
    const ww = w0 * (0.35 + 0.5 * h01(vi * 17 + i, 7));
    const rise = ((sinceBurst * (260 + 120 * h01(vi + i, 11))) % h);
    ctx.globalAlpha = 0.32 * hFrac;
    ctx.fillStyle = i % 2 ? '#d6f6fa' : '#aee8f0';
    ctx.beginPath();
    ctx.ellipse(v.pos.x + off, v.pos.y - rise, ww * (1 - rise / (h * 1.6)), Math.min(26, 10 + rise * 0.2), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // The core jet.
  ctx.globalAlpha = 0.5 * hFrac;
  const grad = ctx.createLinearGradient(v.pos.x, v.pos.y, v.pos.x, v.pos.y - h);
  grad.addColorStop(0, 'rgba(240, 253, 255, 0.9)');
  grad.addColorStop(1, 'rgba(190, 236, 244, 0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(v.pos.x - w0 * 0.5, v.pos.y);
  ctx.quadraticCurveTo(v.pos.x - w0 * 0.2, v.pos.y - h * 0.7, v.pos.x - w0 * 0.14, v.pos.y - h);
  ctx.lineTo(v.pos.x + w0 * 0.14, v.pos.y - h);
  ctx.quadraticCurveTo(v.pos.x + w0 * 0.2, v.pos.y - h * 0.7, v.pos.x + w0 * 0.5, v.pos.y);
  ctx.closePath();
  ctx.fill();
  // THE PLUME: the cloud the comets visibly leave from.
  ctx.globalAlpha = 0.4 * hFrac;
  ctx.fillStyle = '#eefbfd';
  for (let i = 0; i < 3; i++) {
    const px = v.pos.x + (h01(vi * 29 + i, 5) - 0.5) * w0 * 1.4;
    const py = v.pos.y - h - 6 - h01(vi * 37 + i, 9) * 10;
    ctx.beginPath();
    ctx.arc(px, py, w0 * (0.4 + 0.3 * h01(vi + i, 13)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** OVER-ACTOR PASS: steam through the broil, the column + plume at the
 *  beat, and the lob comets out of the plume to their hashed landings. */
export function drawGeyserColumns(ctx: CanvasRenderingContext2D, world: World,
  camX: number, camY: number, vw: number, vh: number): void {
  const f = world.geysers;
  if (!f) return;
  const t = world.time;
  ctx.save();
  for (let vi = 0; vi < f.vents.length; vi++) {
    const v = f.vents[vi];
    const cls = GEYSER_CFG.classes[v.cls];
    const reach = cls.columnR * 3 + GEYSER_CFG.comet.range[1];
    if (!inView(v.pos, reach, camX, camY, vw, vh)) continue;
    const read = ventReadAt(f, v, t, world.geyserMode);
    const mouthR = GEYSER_CFG.mouthR[v.cls];
    // STEAM: idle wisps always; thickening sharply through the broil (the
    // tell that reads at a squint before the rings resolve). Under THE
    // SURGE HOUR (read.surge — the vent is on the aligned tide) the steam
    // runs thicker and busier even in the quiet: the show-don't-tell word
    // for "the basin runs hot" — no floater, the air itself says it.
    const surge = read.surge ? 1 : 0;
    const steam = (read.phase === 'broil' ? 0.25 + 0.6 * read.broil
      : read.phase === 'erupt' ? 0.65 : 0.12) * (1 + 0.6 * surge);
    const wisps = (read.phase === 'quiet' ? 2 : 4) + 2 * surge;
    ctx.fillStyle = '#f0fbfd';
    for (let i = 0; i < wisps; i++) {
      const cyc = (t * (0.22 + 0.1 * h01(vi, i)) + i / wisps) % 1;
      const sway = Math.sin((t * 0.8 + i * 2.1 + vi) % (Math.PI * 2)) * mouthR * 0.4;
      ctx.globalAlpha = steam * (1 - cyc) * 0.5;
      ctx.beginPath();
      ctx.arc(v.pos.x + sway, v.pos.y - 8 - cyc * (30 + mouthR), 4 + cyc * (mouthR * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }
    if (read.phase !== 'erupt') continue;
    drawColumn(ctx, v, vi, read.sinceBurst, cls.eruptSec, cls.columnR);
    // THE LOB COMETS: launched at the burst, landing rainDelay later — the
    // SAME hashed fan the world's pock planter schedules (one hash, two
    // consumers; drawn == landed). Flight clock = sinceBurst / rainDelay;
    // comets outlive the column's own live window is fine — they draw only
    // while erupt+flight holds (rainDelay ≤ eruptSec + splash grace).
    // On a vent that RAINS (PlacedVent.downstream.rain — the great vents'
    // burn rain, M2b) the landings are REAL sky zones whose lob draws its
    // own comet from the plume: this hashed fan stands down there so one
    // drop is never drawn twice (one drawn word, one landing).
    const fan = ventDownstream(v).rain ? [] : cometFanOf(v, vi, read.k);
    if (fan.length) {
      const apexY = v.pos.y - (cls.columnR * 2.4 + 36) - 10;
      const t01 = Math.min(1, read.sinceBurst / GEYSER_CFG.rainDelay);
      for (let j = 0; j < fan.length; j++) {
        const c = fan[j];
        // Quadratic arc: plume apex → landing, apex-lifted midpoint.
        const mx = (v.pos.x + c.x) / 2, my = Math.min(apexY, (v.pos.y + c.y) / 2) - 40;
        const a = 1 - t01;
        const x = a * a * v.pos.x + 2 * a * t01 * mx + t01 * t01 * c.x;
        const y = a * a * apexY + 2 * a * t01 * my + t01 * t01 * c.y;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#d8f6fa';
        ctx.beginPath();
        ctx.arc(x, y, 3.4, 0, Math.PI * 2);
        ctx.fill();
        // A short trail back along the arc.
        ctx.globalAlpha = 0.35;
        const tb = Math.max(0, t01 - 0.12), ab = 1 - tb;
        ctx.beginPath();
        ctx.arc(ab * ab * v.pos.x + 2 * ab * tb * mx + tb * tb * c.x,
          ab * ab * apexY + 2 * ab * tb * my + tb * tb * c.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        // The landing shadow grows as the drop closes — an honest "here".
        ctx.globalAlpha = 0.18 + 0.2 * t01;
        ctx.fillStyle = '#1c3438';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 6 * t01 + 2, 3.4 * t01 + 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}
