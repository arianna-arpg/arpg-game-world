// ---------------------------------------------------------------------------
// WEATHER PARTICLES + THE ANCHORED SKY — the visible half of a weather front:
// rain streaks, storm-lashed sheets, drifting fog banks, falling ash,
// blood-moon motes, and the front's wash/veil. One registry keyed by
// WeatherKind; a kind with no entry (clear) draws nothing. Deterministic per
// (index, time) — no particle state to allocate, sway or leak — and scaled by
// the front's intensity.
//
// THE ANCHORED SKY (the inversion): a front is a PLACE, not a screen filter.
// The engine already simulates every front as node-space geometry (pos +
// radius — the SAME field WeatherField.sample scores its rim falloff by, and
// event pins carry their own footprint via EventFrontPin.pos/radius);
// skyGeoOf projects that footprint into the zone's world pixels, and the
// wash + veil draw AS that field — dense at the storm's heart, thinning to
// its rim, standing still in the world as the camera pans. The particle
// sheets counter-ride the camera (WeatherFxDef.parallax — the overclouds
// idiom), so the rain hangs in the AIR, not on the viewbox. STATUS overlays
// (frost rim, blind iris, low-life, the survival vignettes) are deliberately
// exempt: those happen TO the player and keep their screen anchor.
//
// Extending: a new WeatherKind gets its look by adding one WEATHER_FX row.
// ---------------------------------------------------------------------------

import type { ZoneDef } from '../../data/zones';
import { WEATHER_DEFS, type WeatherKind } from '../../world/weather';
import { withAlpha } from './color';
import { qFrac } from './overlays';
import { baked } from './sprites';
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
  /** Camera parallax of the particle sheet (THE ANCHORED SKY): 1 = fixed in
   *  the WORLD — the field counter-scrolls the pan exactly, so the rain is
   *  air you move through; 0 = the legacy view-glued sheet (the screen
   *  carries it); between = aloft depth. Omitted = the anchored default,
   *  VIS_CFG.weather.anchor.parallax. Cam-less callers (previews, sims)
   *  degrade to pure screen drift regardless. */
  parallax?: number;
  /** THE VEIL — the front's air made visible, drawn UNDER the particles and
   *  scaled by the same displayed intensity so it crossfades with the front.
   *  `anchor: 'front'` (the default — THE ANCHORED SKY): the veil IS the
   *  storm's projected field, full over its heart, thinning to its rim,
   *  FIXED IN THE WORLD — the heavy side of the screen points at the storm,
   *  and walking out of the front visibly clears the air. Here `inner` =
   *  heart-plateau fraction of the footprint radius (full-alpha core before
   *  the falloff, default 0.35) and `alpha` = strength over the heart.
   *  `anchor: 'view'`: the legacy attention vignette — clear at screen
   *  center, gathering at the edges (`inner` = clear-core radius as a
   *  fraction of the view's half-diagonal, default 0.4; `alpha` = edge
   *  strength) — kept as a deliberate data choice for PERSONAL airs (the
   *  status-overlay grammar: something happening to YOU, not to a place).
   *  `pulse` = slow breathing depth 0..1 (default 0.12 — never a strobe). */
  veil?: { alpha: number; inner?: number; pulse?: number; anchor?: 'front' | 'view' };
}

export const WEATHER_FX: Partial<Record<WeatherKind, WeatherFxDef>> = {
  rain:      { form: 'streak', count: 90, vel: [-140, 620], len: 14, alpha: 0.38, color: '#8fb8e8', fadeIn: 4 },
  storm:     { form: 'streak', count: 130, vel: [-320, 760], len: 20, alpha: 0.45, color: '#a8b8f0', fadeIn: 0.6 },
  fog:       { form: 'bank', count: 9, vel: [18, 2], size: 220, alpha: 0.16, fadeIn: 9 },
  ashfall:   { form: 'flake', count: 60, vel: [-24, 46], size: 2.2, alpha: 0.5, color: '#c8a88a', fadeIn: 6 },
  bloodmoon: { form: 'mote', count: 34, vel: [6, -14], size: 1.8, alpha: 0.45, color: '#e86a72', fadeIn: 12 },
  snow:      { form: 'flake', count: 85, vel: [-26, 58], size: 2.5, alpha: 0.6, color: '#eef6ff', fadeIn: 7 },
  // The gale carries no water and no grit — just the air itself made
  // visible: long faint wind-lines tearing sideways.
  gale:      { form: 'streak', count: 40, vel: [560, 40], len: 26, alpha: 0.14, color: '#c8d4d8', fadeIn: 5 },
  // Blood rain falls HEAVY and a little slow — fat red streaks, not a drizzle.
  hemorrhage: { form: 'streak', count: 70, vel: [-40, 430], len: 12, alpha: 0.4, color: '#c2404e', fadeIn: 6 },
  // Petalfall drifts like fat warm snow — big soft flakes on a sidling wind
  // (the flake painter in bloom pink; the garden's sky letting go).
  petalfall: { form: 'flake', count: 70, vel: [-46, 44], size: 3.2, alpha: 0.55, color: '#f0b8d4', fadeIn: 6 },
  // Near-horizontal grit — the sky moving sideways. The wind fabric supplies
  // the shove; this supplies the reason you believe it.
  sandstorm: { form: 'streak', count: 110, vel: [-380, 90], len: 16, alpha: 0.4, color: '#d8b878', fadeIn: 2.5 },
  // THE SCALD MIST (data/scald.ts — the Scald Basin's own air): fog's bank
  // grammar in steam white, slow and low — the country breathing.
  scald_mist: { form: 'bank', count: 10, vel: [14, -4], size: 200, alpha: 0.18, color: '#dbe8ea', fadeIn: 8 },
  // THE SURGE HOUR's steam (data/scald.ts scald_surge_steam — event-pinned
  // off the geyser surge, never sky-born): the mist's own look, denser and
  // RISING — the basin's air thickening as the vents run hot.
  scald_surge_steam: { form: 'bank', count: 18, vel: [10, -11], size: 230, alpha: 0.26, color: '#e6f2f4', fadeIn: 6 },
  // MINERAL RAIN (data/scald.ts): a light pretty fall in pool-cyan that
  // leaves prism-sheen pocks (its dress row) — spectacle-grade, petalfall's
  // model in water color.
  mineral_rain: { form: 'streak', count: 60, vel: [-60, 420], len: 10, alpha: 0.3, color: '#a8e0e8', fadeIn: 5 },
  // THE CINDERWIND (data/scald.ts — the Char's fire weather): ember streaks
  // torn sideways on the wind — the sandstorm's grammar in ember orange,
  // under a faint hot veil that deepens toward the front's heart.
  cinderwind: {
    form: 'streak', count: 80, vel: [-340, 60], len: 9, alpha: 0.42, color: '#ff9a4a',
    fadeIn: 3, veil: { alpha: 0.2, inner: 0.36 },
  },
  // The white wind: snow moving SIDEWAYS — the sandstorm's streak grammar in
  // pale ice (the flake row above is the gentle sibling; this one bites).
  blizzard: { form: 'streak', count: 120, vel: [-400, 140], len: 15, alpha: 0.5, color: '#e8f4ff', fadeIn: 2 },
  // THE DEMON STORM (event-pinned — a Demon Invasion's sky): embers RISING off
  // the ground into a crimson vignette veil. The gradient veil, not the flat
  // wash, is what sells "the world seen through the event" — and it crossfades
  // out with the front the moment the invasion breaks.
  demonstorm: {
    form: 'mote', count: 55, vel: [12, -48], size: 2.2, alpha: 0.55, color: '#ff8a4a',
    fadeIn: 3, veil: { alpha: 0.34, inner: 0.38 },
  },
  // THE PALL (event-pinned — an Incursion's air): spore-motes adrift on no
  // wind, under a faint sick-green veil that deepens toward the epicenter
  // (intensity = the zone's live influence). Slow to gather, slow to lift.
  eldritch_pall: {
    form: 'mote', count: 40, vel: [16, -10], size: 2.0, alpha: 0.42, color: '#a8e88f',
    fadeIn: 8, veil: { alpha: 0.3, inner: 0.42, pulse: 0.18 },
  },
};

// ---------------------------------------------------------------------------
// THE ANCHORED SKY — projecting a front's node-space footprint into the zone.
// ---------------------------------------------------------------------------

/** A front's footprint in zone WORLD pixels: (x, y) = the storm's heart,
 *  r = its rim, (sx, sy) = the point the engine's own node sample scored
 *  (WeatherField.sample's linear rim falloff) — so the drawn field and the
 *  felt intensity agree at the zone's node BY CONSTRUCTION. Pure + DOM-free
 *  (the transience probe drives it headless). */
export interface SkyGeo { x: number; y: number; r: number; sx: number; sy: number }

/** Project a front (node-space pos + radius — a drifting sky front or an
 *  event pin's synthetic footprint alike) into zone world pixels. FIELD
 *  mega-zones project through their OWN authored pixel↔node mapping
 *  (ZoneDef.field — exact: the storm's true disc crosses the meadow);
 *  point-node zones hang their node at the arena centre and scale by
 *  VIS_CFG.weather.anchor.nodeScale. The minR floor keeps a degenerate
 *  footprint reading as standing air, never a dot. */
export function skyGeoOf(front: { pos: { x: number; y: number }; radius: number },
  zone: ZoneDef, arenaW: number, arenaH: number): SkyGeo {
  const A = VIS_CFG.weather.anchor;
  const f = zone.field;
  if (f) {
    return {
      x: (front.pos.x - f.originX) * f.scale,
      y: (front.pos.y - f.originY) * f.scale,
      r: Math.max(front.radius * f.scale, A.minR),
      sx: (zone.map.x - f.originX) * f.scale,
      sy: (zone.map.y - f.originY) * f.scale,
    };
  }
  return {
    x: arenaW / 2 + (front.pos.x - zone.map.x) * A.nodeScale,
    y: arenaH / 2 + (front.pos.y - zone.map.y) * A.nodeScale,
    r: Math.max(front.radius * A.nodeScale, A.minR),
    sx: arenaW / 2,
    sy: arenaH / 2,
  };
}

/** Reconstruct the front's RAW heart intensity from the node-sampled one.
 *  sample() returns rim-faded strength — heart × (1 − d/R) at the node —
 *  so inverting that at the projected sample point makes the drawn field
 *  alpha(p) = raw × (1 − d(p)/R) reproduce the engine's own falloff at
 *  every pixel: drawn == tested, in the sky. Clamped so a razor-thin rim
 *  can never blow the reconstruction up. */
export function skyRawIntensity(nodeIntensity: number, geo: SkyGeo): number {
  const d = Math.hypot(geo.x - geo.sx, geo.y - geo.sy);
  const falloff = Math.max(0.05, 1 - d / Math.max(1, geo.r));
  return Math.min(1, nodeIntensity / falloff);
}

/** One frame's screen-space view of the anchored field: the projected focus
 *  + rim in CANVAS px (the renderer runs SkyGeo through its camera), the
 *  reconstructed heart intensity, and the camera's scroll offsets
 *  (world→screen px) the particle sheets counter-ride. */
export interface SkyFieldView {
  fx: number; fy: number; r: number;
  /** Raw heart intensity (skyRawIntensity of the displayed node intensity). */
  rawI: number;
  /** Camera scroll in screen px (cam × zoom) — parallax multiplies this. */
  ox: number; oy: number;
}

/** Draw the front's field as a WORLD-anchored radial: full over the heart
 *  (inside the plateau fraction), gone at the rim, `alpha` carrying the live
 *  fold. One LRU-baked unit sprite per (color × plateau) stretched to the
 *  footprint — the overlays.ts lesson: however huge the storm, the per-frame
 *  cost is one drawImage, and the canvas clips the off-screen rest. */
export function drawSkyField(ctx: CanvasRenderingContext2D, sky: SkyFieldView,
  color: string, alpha: number, plateau = 0): void {
  if (!(alpha > 0.004) || !(sky.r > 0)) return;
  if (!isFinite(sky.fx) || !isFinite(sky.fy) || !isFinite(sky.r)) return;
  const B = 256;
  const q = qFrac(Math.max(0, Math.min(0.9, plateau)), 0.05);
  const spr = baked(`skyfield|${color}|${q}`, B, B, (c) => {
    // baked() centres the origin; the field bakes as a unit radial disc.
    const g = c.createRadialGradient(0, 0, (B / 2) * q, 0, 0, B / 2);
    g.addColorStop(0, withAlpha(color, 1));
    g.addColorStop(1, withAlpha(color, 0));
    c.fillStyle = g;
    c.fillRect(-B / 2, -B / 2, B, B);
  });
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(spr, sky.fx - sky.r, sky.fy - sky.r, sky.r * 2, sky.r * 2);
  ctx.globalAlpha = prev;
}

/** Draw a weather front's particles + veil over the scene. Every particle
 *  derives from (index, time) so the field is stable and free — and with a
 *  camera (`sky`), the sheet is ANCHORED: the wrap phase counter-rides the
 *  pan at the kind's parallax, so the air hangs in the world. */
export function drawWeatherFx(ctx: CanvasRenderingContext2D, kind: WeatherKind,
  intensity: number, w: number, h: number, t: number, sky?: SkyFieldView): void {
  const def = WEATHER_FX[kind];
  if (!def || intensity <= 0.02) return;
  const n = Math.min(VIS_CFG.weather.maxParticles, Math.round(def.count * (0.4 + 0.6 * intensity)));
  const color = def.color ?? WEATHER_DEFS[kind].color;
  const a = def.alpha * (0.5 + 0.5 * intensity);
  const [vx, vy] = def.vel;
  const W = w + 80, H = h + 80; // wrap margin so particles enter off-screen
  // THE ANCHORED SHEET: the camera's scroll (screen px), scaled by the
  // kind's parallax — 1 pins the particle field to the WORLD (it counter-
  // scrolls the pan exactly), 0 restores the view-glued sheet. Cam-less
  // callers (previews, sims) drift in pure screen space as before.
  const par = def.parallax ?? VIS_CFG.weather.anchor.parallax;
  const ox = (sky?.ox ?? 0) * par, oy = (sky?.oy ?? 0) * par;
  const wrap = (v: number, span: number): number => ((v % span) + span) % span;
  ctx.save();
  // THE VEIL first (under the particles), breathing at pulse depth and scaled
  // by the same displayed intensity, so it rides the ordinary crossfade.
  if (def.veil) {
    const wc = WEATHER_DEFS[kind].color;
    const breathe = 1 - (def.veil.pulse ?? 0.12) * (0.5 + 0.5 * Math.sin(t * 0.6));
    if (sky && (def.veil.anchor ?? 'front') === 'front') {
      // ANCHORED (the default): the storm's own projected field — full over
      // its heart, thinning to its rim, fixed in the world. The heavy side
      // of the screen points AT the storm, and leaving the front clears it.
      drawSkyField(ctx, sky, wc, def.veil.alpha * sky.rawI * breathe, def.veil.inner ?? 0.35);
    } else {
      // VIEW-anchored (a deliberate data choice — personal air): clear core,
      // gathering screen edges.
      const cx = w / 2, cy = h / 2;
      const half = Math.hypot(cx, cy);
      const edge = def.veil.alpha * intensity * breathe;
      const g = ctx.createRadialGradient(cx, cy, half * (def.veil.inner ?? 0.4), cx, cy, half);
      g.addColorStop(0, withAlpha(wc, 0));
      g.addColorStop(0.55, withAlpha(wc, edge * 0.35));
      g.addColorStop(1, withAlpha(wc, edge));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }
  if (def.form === 'streak') {
    ctx.strokeStyle = withAlpha(color, a);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const len = def.len ?? 14;
    const dl = Math.hypot(vx, vy) || 1;
    const lx = (vx / dl) * len, ly = (vy / dl) * len;
    for (let i = 0; i < n; i++) {
      const px = wrap(i * 379 + 91 + t * vx - ox, W) - 40;
      const py = wrap(i * 811 + 37 + t * vy - oy, H) - 40;
      ctx.moveTo(px, py);
      ctx.lineTo(px + lx, py + ly);
    }
    ctx.stroke();
  } else if (def.form === 'flake' || def.form === 'mote') {
    ctx.fillStyle = withAlpha(color, a);
    const size = def.size ?? 2;
    for (let i = 0; i < n; i++) {
      const sway = Math.sin(t * 1.4 + i * 1.7) * 22;
      const px = wrap(i * 379 + 91 + t * vx + sway - ox, W) - 40;
      const py = wrap(i * 811 + 37 + t * vy - oy, H) - 40;
      const r = size * (0.7 + 0.6 * (((i * 7) % 5) / 4));
      ctx.globalAlpha = a * (0.55 + 0.45 * Math.sin(t * 2 + i));
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (def.form === 'bank') {
    // Drifting fog banks: big soft radial blobs hanging in the air (world-
    // anchored through the same offsets — walk INTO a bank, not under one
    // glued to your view).
    const size = def.size ?? 200;
    for (let i = 0; i < n; i++) {
      const spanX = W + size * 2;
      const px = wrap(i * 611 + 53 + t * vx - ox, spanX) - size;
      const py = wrap(i * 149 + Math.sin(t * 0.22 + i) * 40 - oy, H);
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
