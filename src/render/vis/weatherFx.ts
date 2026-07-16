// ---------------------------------------------------------------------------
// WEATHER PARTICLES — the visible half of a weather front: rain streaks,
// storm-lashed sheets, drifting fog banks, falling ash, blood-moon motes.
// One registry keyed by WeatherKind; a kind with no entry (clear) draws
// nothing. Screen-space, deterministic per (index, time) — no particle state
// to allocate, sway or leak — and scaled by the front's intensity.
//
// Extending: a new WeatherKind gets its look by adding one WEATHER_FX row.
// ---------------------------------------------------------------------------

import { WEATHER_DEFS, type WeatherKind } from '../../world/weather';
import { withAlpha } from './color';
import { VIS_CFG } from './visConfig';

export interface WeatherFxDef {
  /** Particle form. */
  form: 'streak' | 'flake' | 'bank' | 'mote';
  /** Base particle count at full intensity (before the VIS_CFG cap). */
  count: number;
  /** Fall/drift velocity in screen px/s (x, y). */
  vel: [number, number];
  /** Streak length in px (form 'streak'). */
  len?: number;
  /** Particle size in px (flake/mote radius; bank radius). */
  size?: number;
  /** Alpha at full intensity. */
  alpha: number;
  /** Color override; defaults to the kind's WeatherDef.color tint. */
  color?: string;
  /** Crossfade seconds for a full 0→1 swing of the DISPLAYED weather
   *  (renderer.smoothWeather). Small = the front slams in BY DESIGN;
   *  omitted = VIS_CFG.weather.fadeSec. */
  fadeIn?: number;
}

export const WEATHER_FX: Partial<Record<WeatherKind, WeatherFxDef>> = {
  rain:      { form: 'streak', count: 90, vel: [-140, 620], len: 14, alpha: 0.38, color: '#8fb8e8', fadeIn: 4 },
  storm:     { form: 'streak', count: 130, vel: [-320, 760], len: 20, alpha: 0.45, color: '#a8b8f0', fadeIn: 0.6 },
  fog:       { form: 'bank', count: 9, vel: [18, 2], size: 220, alpha: 0.16, fadeIn: 9 },
  ashfall:   { form: 'flake', count: 60, vel: [-24, 46], size: 2.2, alpha: 0.5, color: '#c8a88a', fadeIn: 6 },
  bloodmoon: { form: 'mote', count: 34, vel: [6, -14], size: 1.8, alpha: 0.45, color: '#e86a72', fadeIn: 12 },
  snow:      { form: 'flake', count: 85, vel: [-26, 58], size: 2.5, alpha: 0.6, color: '#eef6ff', fadeIn: 7 },
  // Blood rain falls HEAVY and a little slow — fat red streaks, not a drizzle.
  hemorrhage: { form: 'streak', count: 70, vel: [-40, 430], len: 12, alpha: 0.4, color: '#c2404e', fadeIn: 6 },
  // Near-horizontal grit — the sky moving sideways. The wind fabric supplies
  // the shove; this supplies the reason you believe it.
  sandstorm: { form: 'streak', count: 110, vel: [-380, 90], len: 16, alpha: 0.4, color: '#d8b878', fadeIn: 2.5 },
  // The white wind: snow moving SIDEWAYS — the sandstorm's streak grammar in
  // pale ice (the flake row above is the gentle sibling; this one bites).
  blizzard: { form: 'streak', count: 120, vel: [-400, 140], len: 15, alpha: 0.5, color: '#e8f4ff', fadeIn: 2 },
};

/** Draw a weather front's particles over the scene (screen space). Every
 *  particle derives from (index, time) so the field is stable and free. */
export function drawWeatherFx(ctx: CanvasRenderingContext2D, kind: WeatherKind,
  intensity: number, w: number, h: number, t: number): void {
  const def = WEATHER_FX[kind];
  if (!def || intensity <= 0.02) return;
  const n = Math.min(VIS_CFG.weather.maxParticles, Math.round(def.count * (0.4 + 0.6 * intensity)));
  const color = def.color ?? WEATHER_DEFS[kind].color;
  const a = def.alpha * (0.5 + 0.5 * intensity);
  const [vx, vy] = def.vel;
  const W = w + 80, H = h + 80; // wrap margin so particles enter off-screen
  ctx.save();
  if (def.form === 'streak') {
    ctx.strokeStyle = withAlpha(color, a);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const len = def.len ?? 14;
    const dl = Math.hypot(vx, vy) || 1;
    const lx = (vx / dl) * len, ly = (vy / dl) * len;
    for (let i = 0; i < n; i++) {
      const px = (((i * 379 + 91) % W) + (t * vx) % W + W * 2) % W - 40;
      const py = (((i * 811 + 37) % H) + (t * vy) % H + H * 2) % H - 40;
      ctx.moveTo(px, py);
      ctx.lineTo(px + lx, py + ly);
    }
    ctx.stroke();
  } else if (def.form === 'flake' || def.form === 'mote') {
    ctx.fillStyle = withAlpha(color, a);
    const size = def.size ?? 2;
    for (let i = 0; i < n; i++) {
      const sway = Math.sin(t * 1.4 + i * 1.7) * 22;
      const px = (((i * 379 + 91) % W) + (t * vx) % W + sway + W * 2) % W - 40;
      const py = (((i * 811 + 37) % H) + (t * vy) % H + H * 2) % H - 40;
      const r = size * (0.7 + 0.6 * (((i * 7) % 5) / 4));
      ctx.globalAlpha = a * (0.55 + 0.45 * Math.sin(t * 2 + i));
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (def.form === 'bank') {
    // Drifting fog banks: big soft radial blobs sliding across the view.
    const size = def.size ?? 200;
    for (let i = 0; i < n; i++) {
      const px = (((i * 611 + 53) % (W + size * 2)) + (t * vx) % (W + size * 2) + (W + size * 2) * 2) % (W + size * 2) - size;
      const py = (i * 149 + Math.sin(t * 0.22 + i) * 40) % H;
      const r = size * (0.7 + 0.5 * (((i * 11) % 6) / 5));
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, withAlpha(color, a));
      g.addColorStop(1, withAlpha(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
