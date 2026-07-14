// ---------------------------------------------------------------------------
// AMBIENT FX — a zone's standing sensory weather, as data. A theme declares
// `ambientFx: [{ kind, intensity?, color? }, …]` and the renderer plays it
// every frame: underwater CAUSTICS (slow light bands sweeping the scene) and
// BUBBLES (drifting columns + the occasional splay-burst fanning across the
// screen), desert HEAT HAZE (broad rising air-waves), generic MOTES. All
// deterministic from (index, time) — zero particle state — and stateless to
// extend: one new kind = one draw branch here + a data row wherever it plays.
// ---------------------------------------------------------------------------

import { dayCycle } from '../../world/daynight';
import { hash01, withAlpha } from './color';

export interface AmbientFxSpec {
  kind: 'bubbles' | 'caustics' | 'heatHaze' | 'motes' | 'aurora' | 'spores' | 'sandDrift';
  /** 0..1 strength (default 1). */
  intensity?: number;
  color?: string;
}

export function drawAmbientFx(ctx: CanvasRenderingContext2D, spec: AmbientFxSpec,
  w: number, h: number, t: number): void {
  const k = spec.intensity ?? 1;
  switch (spec.kind) {
    case 'bubbles': return bubbles(ctx, w, h, t, k, spec.color ?? '#cfeefa');
    case 'caustics': return caustics(ctx, w, h, t, k, spec.color ?? '#9fe0e8');
    case 'heatHaze': return heatHaze(ctx, w, h, t, k, spec.color ?? '#ffe8c0');
    case 'motes': return motes(ctx, w, h, t, k, spec.color ?? '#e8f0d8');
    case 'aurora': return aurora(ctx, w, h, t, k, spec.color ?? '#7fe8b8');
    case 'spores': return spores(ctx, w, h, t, k, spec.color ?? '#b8e88f');
    case 'sandDrift': return sandDrift(ctx, w, h, t, k, spec.color ?? '#d8c090');
  }
}

/** DRIFTING SAND — grains streaking low on one shared slant (the ground wind
 *  the heat haze floats above), and every so often a DUST DEVIL window: a
 *  little rotating fan of grit crossing the pan. Deterministic from (i, t)
 *  like every ambient — zero particle state. */
function sandDrift(ctx: CanvasRenderingContext2D, w: number, h: number,
  t: number, k: number, color: string): void {
  ctx.save();
  // The grains: short slanted streaks, faster low in the frame (parallax).
  const n = Math.round(30 * k);
  for (let i = 0; i < n; i++) {
    const lane = hash01(i, 3);
    const y = (lane * h + Math.sin(t * 0.7 + i * 1.9) * 6) % h;
    const speed = 90 + lane * 150 + hash01(i, 5) * 60;
    const x = (hash01(i, 7) * w + t * speed) % w;
    const len = 7 + lane * 13 + hash01(i, 11) * 6;
    const slant = 2.2 + lane * 2.4;
    ctx.globalAlpha = (0.05 + 0.07 * lane) * k * (0.6 + 0.4 * Math.sin(t * 1.3 + i * 2.3));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 + lane * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len, y + len / slant);
    ctx.stroke();
  }
  // The dust devil window (the spores-puff idiom): one twist at a time,
  // sweeping its fan as it ages, then gone until the next appointment.
  const PERIOD = 9;
  const win = Math.floor(t / PERIOD);
  const age = (t - win * PERIOD) / PERIOD;
  if (age < 0.34 && hash01(win, 17) < 0.6) {
    const a = age / 0.34;
    const dx = hash01(win, 19) * w * 0.8 + w * 0.1 + a * 120;
    const dy = hash01(win, 23) * h * 0.6 + h * 0.2;
    const grow = Math.sin(a * Math.PI);
    ctx.globalAlpha = 0.1 * k * grow;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    for (let s = 0; s < 5; s++) {
      const rr = 6 + s * 7 + grow * 4;
      const spin = t * 5 + s * 1.3;
      ctx.beginPath();
      ctx.arc(dx + Math.sin(spin) * 3, dy - s * 9, rr, spin % (Math.PI * 2), (spin % (Math.PI * 2)) + Math.PI * 1.3);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** FUNGAL SPORES — luminous motes on their own slow convection: bigger and
 *  lazier than dust, each breathing its glow, falling more than flying. Every
 *  few seconds a PUFF lets go somewhere and a loose cluster rides up through
 *  the view together — a cap exhaling just off-screen. */
function spores(ctx: CanvasRenderingContext2D, w: number, h: number,
  t: number, k: number, color: string): void {
  ctx.save();
  const n = Math.round(24 * k);
  for (let i = 0; i < n; i++) {
    const sink = 8 + hash01(i, 3) * 12;
    const x = (hash01(i, 7) * w + Math.sin(t * 0.5 + i * 2.1) * 46 + t * 4 + w) % w;
    const y = (hash01(i, 11) * h + t * sink + Math.sin(t * 0.8 + i) * 18) % h;
    const r = 1.3 + hash01(i, 13) * 1.9;
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.1 + i * 1.7);
    // Soft halo, then the mote itself.
    ctx.globalAlpha = 0.07 * k * breathe;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.34 * k * (0.4 + 0.6 * breathe);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // The puff: a deterministic window picks a spot; a cluster rises and spreads.
  const PERIOD = 9;
  const win = Math.floor(t / PERIOD);
  const age = (t - win * PERIOD) / PERIOD;
  if (age < 0.6) {
    const bx = hash01(win, 29) * w * 0.8 + w * 0.1;
    const by = hash01(win, 31) * h * 0.6 + h * 0.3;
    const burst = 8 + (win % 5);
    ctx.fillStyle = color;
    for (let i = 0; i < burst; i++) {
      const a = -Math.PI / 2 + (hash01(i, win) - 0.5) * 1.7;
      const d = age * (90 + hash01(i, win + 5) * 130);
      const x = bx + Math.cos(a) * d + Math.sin(t * 2 + i) * 6;
      const y = by + Math.sin(a) * d;
      const r = (2.2 - age * 1.6) * (0.7 + hash01(i, win + 9) * 0.6);
      if (r <= 0.3) continue;
      ctx.globalAlpha = 0.4 * k * (1 - age / 0.6);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** THE AURORA — slow luminous curtains waving across the upper sky, only
 *  when the night is dark enough to carry them (a winter zone's crown). */
function aurora(ctx: CanvasRenderingContext2D, w: number, h: number,
  t: number, k: number, color: string): void {
  const night = 1 - dayCycle(t).light;
  if (night < 0.45) return; // daylight drowns it
  const strength = k * ((night - 0.45) / 0.55);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let band = 0; band < 3; band++) {
    // The high curtain drifts green → violet across the sky.
    const col = band === 2 ? '#b08ae8' : color;
    const baseY = h * (0.08 + band * 0.07);
    const amp = h * (0.03 + band * 0.015);
    const drift = t * (0.09 + band * 0.05) + band * 2.1;
    ctx.beginPath();
    for (let x = -20; x <= w + 20; x += 26) {
      const y = baseY
        + Math.sin(x * 0.004 + drift) * amp * 1.6
        + Math.sin(x * 0.011 - drift * 1.7) * amp;
      if (x <= -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    const grad = ctx.createLinearGradient(0, baseY - amp * 3, 0, baseY + amp * 6);
    grad.addColorStop(0, withAlpha(col, 0));
    grad.addColorStop(0.4, withAlpha(col, 0.1 * strength * (0.7 + 0.3 * Math.sin(t * 0.4 + band))));
    grad.addColorStop(1, withAlpha(col, 0));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 30 + band * 22;
    ctx.stroke();
  }
  ctx.restore();
}

/** Rising bubble columns + a periodic SPLAY: every few seconds a burst pops
 *  at a deterministic spot and fans a cluster outward across the screen. */
function bubbles(ctx: CanvasRenderingContext2D, w: number, h: number,
  t: number, k: number, color: string): void {
  ctx.save();
  // The ambient drift: lazy columns rising with a sway.
  const n = Math.round(34 * k);
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const speed = 34 + hash01(i, 3) * 46;
    const x = (hash01(i, 7) * w + Math.sin(t * 0.7 + i * 1.7) * 26 + w) % w;
    const y = h + 20 - (((t * speed + hash01(i, 11) * (h + 40)) % (h + 40)));
    const r = 1.4 + hash01(i, 13) * 3;
    ctx.globalAlpha = 0.45 * k * (0.5 + 0.5 * Math.sin(t * 2 + i));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // A pin-prick highlight sells the sphere.
    ctx.globalAlpha *= 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
  }
  // The splay-burst: window index → deterministic burst spot + radial fan.
  const PERIOD = 6.5;
  const win = Math.floor(t / PERIOD);
  const age = (t - win * PERIOD) / PERIOD; // 0..1 through the window
  if (age < 0.55) {
    const bx = hash01(win, 17) * w * 0.8 + w * 0.1;
    const by = hash01(win, 23) * h * 0.7 + h * 0.15;
    const burst = 9 + (win % 4);
    for (let i = 0; i < burst; i++) {
      const a = (i / burst) * Math.PI * 2 + hash01(i, win) * 0.7;
      const d = age * (120 + hash01(i, win + 5) * 160);
      const x = bx + Math.cos(a) * d;
      const y = by + Math.sin(a) * d - age * 60; // the fan drifts up as it spreads
      const r = (2.6 - age * 2) * (0.7 + hash01(i, win + 9) * 0.7);
      if (r <= 0.3) continue;
      ctx.globalAlpha = 0.5 * k * (1 - age / 0.55);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Underwater light: broad soft bands sweeping slowly across the scene,
 *  additive — the surface writing its light on the floor. */
function caustics(ctx: CanvasRenderingContext2D, w: number, h: number,
  t: number, k: number, color: string): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const diag = Math.hypot(w, h);
  for (let i = 0; i < 3; i++) {
    const ang = 0.5 + i * 0.35 + Math.sin(t * 0.05 + i) * 0.1;
    const drift = ((t * (14 + i * 7) + i * diag / 3) % (diag * 1.4)) - diag * 0.2;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(ang);
    const g = ctx.createLinearGradient(drift - diag * 0.7, 0, drift - diag * 0.7 + 260, 0);
    g.addColorStop(0, withAlpha(color, 0));
    g.addColorStop(0.5, withAlpha(color, 0.085 * k * (0.7 + 0.3 * Math.sin(t * 0.8 + i))));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-diag, -diag, diag * 2, diag * 2);
    ctx.restore();
  }
  ctx.restore();
}

/** Desert air: broad, slow serpentine waves rising over the whole view —
 *  the heat you can see. Deliberately faint; the shimmer FIELDS carry the
 *  gameplay, this carries the climate. */
function heatHaze(ctx: CanvasRenderingContext2D, w: number, h: number,
  t: number, k: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = withAlpha(color, 0.05 * k);
  ctx.lineWidth = 2.5;
  const n = Math.round(7 * k);
  for (let i = 0; i < n; i++) {
    const rise = h + 60;
    const phase = ((t * (22 + hash01(i, 3) * 14) + hash01(i, 5) * rise) % rise);
    const y = h + 30 - phase;
    ctx.globalAlpha = (0.6 - Math.abs(phase / rise - 0.5)) * k;
    ctx.beginPath();
    for (let x = -20; x <= w + 20; x += 26) {
      const yy = y + Math.sin(x * 0.02 + t * 1.6 + i * 2.2) * 7;
      if (x <= -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Generic drifting specks (spore fields already have their own; this is the
 *  registry's future-proof default for airy biomes). */
function motes(ctx: CanvasRenderingContext2D, w: number, h: number,
  t: number, k: number, color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  const n = Math.round(18 * k);
  for (let i = 0; i < n; i++) {
    const x = (hash01(i, 31) * w + t * (6 + hash01(i, 37) * 10) + Math.sin(t * 0.6 + i) * 30) % w;
    const y = (hash01(i, 41) * h + Math.sin(t * 0.4 + i * 2.1) * 40 + h) % h;
    ctx.globalAlpha = 0.2 * k * (0.5 + 0.5 * Math.sin(t * 1.4 + i));
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + hash01(i, 43) * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
