// ---------------------------------------------------------------------------
// Color math for the visual fabric. Every def in the game carries ONE flat
// color; everything richer (shading ramps, rims, glows, washes) is DERIVED
// here so content never has to specify more than it means.
// ---------------------------------------------------------------------------

export type RGB = [number, number, number];

const DEFAULT_RGB: Readonly<RGB> = [154, 154, 160];
const HEX_BYTE: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
const ALPHA_SUFFIX: string[] = Array.from({ length: 1001 }, (_, i) => (i / 1000).toFixed(3) + ')');

const rgbCache = new Map<string, Readonly<RGB>>();
const rgbaEntryCache = new Map<string, { prefix: string; byStep: Map<number, string> }>();
const shadeCache = new Map<string, string>();
const mixCache = new Map<string, string>();
const adjustCache = new Map<string, string>();
const lumCache = new Map<string, number>();

function hexNibble(code: number): number {
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 97 && code <= 102) return code - 87;
  if (code >= 65 && code <= 70) return code - 55;
  return -1;
}

function parseRgbCached(hex: string): Readonly<RGB> {
  if (typeof hex !== 'string' || hex.charCodeAt(0) !== 35) return DEFAULT_RGB;
  const hit = rgbCache.get(hex);
  if (hit !== undefined) return hit;
  let rgb: Readonly<RGB> | undefined;
  const len = hex.length;
  if (len >= 7) {
    const r1 = hexNibble(hex.charCodeAt(1)), r0 = hexNibble(hex.charCodeAt(2));
    const g1 = hexNibble(hex.charCodeAt(3)), g0 = hexNibble(hex.charCodeAt(4));
    const b1 = hexNibble(hex.charCodeAt(5)), b0 = hexNibble(hex.charCodeAt(6));
    if ((r1 | r0 | g1 | g0 | b1 | b0) >= 0) {
      rgb = [(r1 << 4) | r0, (g1 << 4) | g0, (b1 << 4) | b0];
    }
  } else if (len === 4) {
    const r = hexNibble(hex.charCodeAt(1));
    const g = hexNibble(hex.charCodeAt(2));
    const b = hexNibble(hex.charCodeAt(3));
    if ((r | g | b) >= 0) {
      rgb = [(r << 4) | r, (g << 4) | g, (b << 4) | b];
    }
  }
  if (!rgb) {
    let h = hex.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h.slice(0, 6), 16);
    rgb = Number.isNaN(n) ? DEFAULT_RGB : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  if (rgbCache.size >= 2048) rgbCache.delete(rgbCache.keys().next().value!);
  rgbCache.set(hex, rgb);
  return rgb;
}

/** Parse '#rgb' / '#rrggbb' (defensively: anything else → mid grey). */
export function hexToRgb(hex: string): RGB {
  const c = parseRgbCached(hex);
  return [c[0], c[1], c[2]];
}

export function rgbToHex([r, g, b]: RGB): string {
  const ri = r <= 0 ? 0 : r >= 255 ? 255 : Math.round(r);
  const gi = g <= 0 ? 0 : g >= 255 ? 255 : Math.round(g);
  const bi = b <= 0 ? 0 : b >= 255 ? 255 : Math.round(b);
  return '#' + HEX_BYTE[ri] + HEX_BYTE[gi] + HEX_BYTE[bi];
}

/** 'rgba(r,g,b,a)' from a hex color — the alpha-wash workhorse. */
export function withAlpha(hex: string, a: number): string {
  let entry = rgbaEntryCache.get(hex);
  if (entry === undefined) {
    const c = parseRgbCached(hex);
    entry = { prefix: `rgba(${c[0]},${c[1]},${c[2]},`, byStep: new Map() };
    if (rgbaEntryCache.size >= 1024) rgbaEntryCache.delete(rgbaEntryCache.keys().next().value!);
    rgbaEntryCache.set(hex, entry);
  }
  if (a >= 1) {
    let hit = entry.byStep.get(1000);
    if (hit === undefined) { hit = entry.prefix + '1.000)'; entry.byStep.set(1000, hit); }
    return hit;
  }
  if (a <= 0) {
    let hit = entry.byStep.get(0);
    if (hit === undefined) { hit = entry.prefix + '0.000)'; entry.byStep.set(0, hit); }
    return hit;
  }
  const step = Math.round(a * 1000);
  if (step >= 0 && step <= 1000) {
    let hit = entry.byStep.get(step);
    if (hit === undefined) {
      hit = entry.prefix + ALPHA_SUFFIX[step];
      if (entry.byStep.size >= 96) entry.byStep.delete(entry.byStep.keys().next().value!);
      entry.byStep.set(step, hit);
    }
    return hit;
  }
  return entry.prefix + a.toFixed(3) + ')';
}

/** Shade toward white (t > 0) or black (t < 0). Kept API-compatible with the
 *  old renderer-local helper — skill/fissure states ride gradients of their
 *  OWN color through this, never a second palette. */
export function shade(hex: string, t: number): string {
  const key = `${hex}|${t}`;
  const hit = shadeCache.get(key);
  if (hit !== undefined) return hit;
  const [r, g, b] = parseRgbCached(hex);
  const to = t >= 0 ? 255 : 0;
  const f = Math.min(1, Math.abs(t));
  const out = rgbToHex([r + (to - r) * f, g + (to - g) * f, b + (to - b) * f]);
  if (shadeCache.size >= 2048) shadeCache.delete(shadeCache.keys().next().value!);
  shadeCache.set(key, out);
  return out;
}

/** Mix two hex colors (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const key = `${a}|${b}|${t}`;
  const hit = mixCache.get(key);
  if (hit !== undefined) return hit;
  const A = parseRgbCached(a), B = parseRgbCached(b);
  const f = Math.max(0, Math.min(1, t));
  const out = rgbToHex([A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f]);
  if (mixCache.size >= 2048) mixCache.delete(mixCache.keys().next().value!);
  mixCache.set(key, out);
  return out;
}

/** THE CONTRAST GUARD — push a derived tone AWAY from what it sits on until
 *  the two read apart. A biome whose derived tones land within a whisker of
 *  each other swallows whatever boundary they were drawn to describe (the
 *  ground pass guards its wall fill against the floor this way; the void
 *  frame guards its skirt/seat/crest against the ink and each other).
 *
 *  `prefer` is the tone's INTENT — a dark seat wants to go darker, a lit
 *  crest lighter — and is honored unless that side is out of headroom (a
 *  near-black reference forces light, a near-white one dark). The intent
 *  matters: when the guard fires the two tones are within `minGap` BY
 *  DEFINITION, so "which side is the tone already on" is coin-flip noise —
 *  two neighbouring themes would pick opposite directions off a rounding
 *  hair. The intent is stable, so a realm's rims all break the same way.
 *
 *  shade() is linear per channel and luminance is linear in the channels, so
 *  the step that reaches a target luminance SOLVES exactly — no blind fixed
 *  step, which on a near-black palette overshoots into mid-grey. `margin`
 *  overshoots the floor by a fraction of itself so a guarded tone clears the
 *  line rather than landing on it (and absorbs 8-bit rounding on the way
 *  back out to hex). */
export function contrastGuard(tone: string, against: string,
  cfg: { minGap: number; margin: number }, prefer: 'lighter' | 'darker'): string {
  const lt = luminance(tone), la = luminance(against);
  if (Math.abs(lt - la) >= cfg.minGap) return tone; // already reads — untouched
  const want = cfg.minGap * (1 + cfg.margin);
  let up = prefer === 'lighter';
  if (up && la + want > 1) up = false;
  else if (!up && la - want < 0) up = true;
  const target = up ? la + want : la - want;
  const t = Math.min(1, Math.max(0, up
    ? (target - lt) / Math.max(1e-6, 1 - lt)
    : 1 - target / Math.max(1e-6, lt)));
  return shade(tone, up ? t : -t);
}

// --- HSL (h 0..360, s/l 0..1) ----------------------------------------------

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}

export function hslToRgb([h, s, l]: [number, number, number]): RGB {
  h = ((h % 360) + 360) % 360;
  if (s <= 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number): number => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h / 360 + 1 / 3) * 255, f(h / 360) * 255, f(h / 360 - 1 / 3) * 255];
}

/** Hue-rotate + saturation/lightness scale in one move (the ramp shaper). */
export function adjust(hex: string, dh: number, sMul: number, dl: number): string {
  const key = `${hex}|${dh}|${sMul}|${dl}`;
  const hit = adjustCache.get(key);
  if (hit !== undefined) return hit;
  const rgb = parseRgbCached(hex);
  const [h, s, l] = rgbToHsl([rgb[0], rgb[1], rgb[2]]);
  const out = rgbToHex(hslToRgb([h + dh, Math.max(0, Math.min(1, s * sMul)), Math.max(0, Math.min(1, l + dl))]));
  if (adjustCache.size >= 2048) adjustCache.delete(adjustCache.keys().next().value!);
  adjustCache.set(key, out);
  return out;
}

/** Perceived luminance 0..1 (for auto-contrast decisions). */
export function luminance(hex: string): number {
  const hit = lumCache.get(hex);
  if (hit !== undefined) return hit;
  const [r, g, b] = parseRgbCached(hex);
  const out = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lumCache.size >= 2048) lumCache.delete(lumCache.keys().next().value!);
  lumCache.set(hex, out);
  return out;
}

// hash01 moved to engine/hash.ts (the rock-form fabric derives collision from
// the SAME numbers the painters roll) — re-exported here so every painter
// keeps its './color' import.
export { hash01 } from '../../engine/hash';
import { hash01 } from '../../engine/hash';

/** 2-octave value noise on a lattice — smooth, deterministic, allocation-free.
 *  Drives ground mottling and any painter that wants organic variation. */
export function valueNoise(x: number, y: number, seed = 0): number {
  const lerp = (a: number, b: number, t: number): number => a + (b - a) * (t * t * (3 - 2 * t));
  const cell = (cx: number, cy: number): number => hash01(cx, cy, seed);
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const v = lerp(
    lerp(cell(x0, y0), cell(x0 + 1, y0), fx),
    lerp(cell(x0, y0 + 1), cell(x0 + 1, y0 + 1), fx), fy);
  const x1 = x * 2.7 + 13.7, y1 = y * 2.7 + 7.3;
  const x1i = Math.floor(x1), y1i = Math.floor(y1);
  const v2 = lerp(
    lerp(cell(x1i, y1i), cell(x1i + 1, y1i), x1 - x1i),
    lerp(cell(x1i, y1i + 1), cell(x1i + 1, y1i + 1), x1 - x1i), y1 - y1i);
  return v * 0.68 + v2 * 0.32;
}
