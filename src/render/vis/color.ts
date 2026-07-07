// ---------------------------------------------------------------------------
// Color math for the visual fabric. Every def in the game carries ONE flat
// color; everything richer (shading ramps, rims, glows, washes) is DERIVED
// here so content never has to specify more than it means.
// ---------------------------------------------------------------------------

export type RGB = [number, number, number];

/** Parse '#rgb' / '#rrggbb' (defensively: anything else → mid grey). */
export function hexToRgb(hex: string): RGB {
  if (typeof hex !== 'string' || hex[0] !== '#') return [154, 154, 160];
  let h = hex.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [154, 154, 160];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (v: number): string => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** 'rgba(r,g,b,a)' from a hex color — the alpha-wash workhorse. */
export function withAlpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

/** Shade toward white (t > 0) or black (t < 0). Kept API-compatible with the
 *  old renderer-local helper — skill/fissure states ride gradients of their
 *  OWN color through this, never a second palette. */
export function shade(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const to = t >= 0 ? 255 : 0;
  const f = Math.min(1, Math.abs(t));
  return rgbToHex([r + (to - r) * f, g + (to - g) * f, b + (to - b) * f]);
}

/** Mix two hex colors (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  const f = Math.max(0, Math.min(1, t));
  return rgbToHex([A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f]);
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
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb([h + dh, Math.max(0, Math.min(1, s * sMul)), Math.max(0, Math.min(1, l + dl))]));
}

/** Perceived luminance 0..1 (for auto-contrast decisions). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Tiny deterministic hash → 0..1 (speckle/texture jitter without RNG state). */
export function hash01(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

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
