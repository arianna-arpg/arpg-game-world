// ---------------------------------------------------------------------------
// THE VOID FRAME — what the world ends INTO.
//
// Every bounded zone floats in the dark. The hero-locked camera (render/
// camera.ts, mode 'hero') puts that dark ON SCREEN whenever the hero presses
// the world's edge; the classic frame sees slivers of it at the ±overshoot
// and around letterboxed interiors. This layer makes that dark a dressed
// surface instead of a flat clear:
//
//   • BASE — the abyss ink itself, leaned a breath toward the zone's floor
//     color so each biome owns its own dark (voidBaseOf feeds the renderer's
//     screen clear AND the ellipse outside-mask — one color, no seams).
//   • SKIRT — a falling-away gradient just past the rim: the zone's earth
//     catching the last light as it drops into nothing.
//   • RIM — the boundary lip: a dark seat under the classic border line and
//     a lit hairline crest over it, so the edge reads as ground ending, not
//     as a drawn rectangle.
//   • MOTES — sparse drifting dust in the void, on a sub-1 parallax so the
//     dark reads DEEP, not painted. Deterministic (hash01 per grid cell) —
//     no per-frame roll, no flicker.
//
// Everything tunes from VIS_CFG.voidFrame; per-zone identity arrives through
// the theme (floor/border), so a new biome dresses its own void with zero
// edits here. Ablate pass name: 'voidframe' (restores the pre-fabric look —
// flat #0a0a0e + the plain 4px border — for perf forensics).
//
// FUTURE HOOK: zones with an understory (ZoneDef.below / cloud-sea realms)
// could show the world-below past the rim instead of the abyss — extend the
// understory snap by a padding band and draw it here, unclipped, before the
// skirt. Deliberately not built until a design asks.
// ---------------------------------------------------------------------------

import type { ZoneTheme } from '../../data/zones';
import type { World } from '../../engine/world';
import { hash01 } from '../../engine/hash';
import { mix, withAlpha } from './color';
import { VIS_ABLATE, VIS_CFG } from './visConfig';

/** Tiny per-theme color memos — themes are static per zone def, so these
 *  stay a handful of entries for a whole session. */
const baseMemo = new Map<string, string>();
const earthMemo = new Map<string, string>();
const seatMemo = new Map<string, string>();
const crestMemo = new Map<string, string>();
const moteMemo = new Map<string, string>();

/** The abyss ink for this zone — the renderer's screen clear, the ellipse
 *  outside-mask, and the frame's own strokes all drink from this one well.
 *  Ablated, it returns the flat pre-fabric black. */
export function voidBaseOf(theme: ZoneTheme): string {
  const cfg = VIS_CFG.voidFrame;
  if (VIS_ABLATE.has('voidframe')) return cfg.color;
  let c = baseMemo.get(theme.floor);
  if (!c) { c = mix(cfg.color, theme.floor, cfg.tintMix); baseMemo.set(theme.floor, c); }
  return c;
}

/** The skirt's earth tone: floor blended toward the border line's color. */
function earthOf(theme: ZoneTheme): string {
  const key = theme.floor + '|' + theme.border;
  let c = earthMemo.get(key);
  if (!c) { c = mix(theme.floor, theme.border, VIS_CFG.voidFrame.skirt.floorMix); earthMemo.set(key, c); }
  return c;
}

function seatColorOf(theme: ZoneTheme): string {
  let c = seatMemo.get(theme.border);
  if (!c) { c = mix(theme.border, '#000000', 0.75); seatMemo.set(theme.border, c); }
  return c;
}

function crestColorOf(theme: ZoneTheme): string {
  let c = crestMemo.get(theme.border);
  if (!c) { c = mix(theme.border, '#ffffff', 0.45); crestMemo.set(theme.border, c); }
  return c;
}

function moteColorOf(theme: ZoneTheme): string {
  const m = VIS_CFG.voidFrame.motes;
  let c = moteMemo.get(theme.floor);
  if (!c) { c = mix(voidBaseOf(theme), m.color, m.colorMix); moteMemo.set(theme.floor, c); }
  return c;
}

/** The zone silhouette as the current path (rim strokes + mote clip share it).
 *  Ellipses keep the classic -2px inset the old border stroke drew with. */
function traceRim(ctx: CanvasRenderingContext2D, w: number, h: number, ell: boolean, inset: number): void {
  ctx.beginPath();
  if (ell) ctx.ellipse(w / 2, h / 2, w / 2 - inset, h / 2 - inset, 0, 0, Math.PI * 2);
  else ctx.rect(0, 0, w, h);
}

/** Is the view rect wholly inside the zone silhouette? (Nothing beyond the
 *  rim can show — skip the skirt and motes.) Ellipse: all four view corners
 *  inside the oval; convexity makes the corners sufficient. */
function viewInside(camX: number, camY: number, vw: number, vh: number,
  w: number, h: number, ell: boolean): boolean {
  if (!ell) return camX >= 0 && camY >= 0 && camX + vw <= w && camY + vh <= h;
  const rx = w / 2, ry = h / 2;
  for (const [x, y] of [[camX, camY], [camX + vw, camY], [camX, camY + vh], [camX + vw, camY + vh]] as const) {
    const dx = (x - rx) / rx, dy = (y - ry) / ry;
    if (dx * dx + dy * dy > 1) return false;
  }
  return true;
}

/** The falling-away skirt: earth-toned gradient bands just past the rim.
 *  Rect zones draw only the visible sides (+ the corner quarter-glows that
 *  keep the falloff radially continuous); ellipses draw one radial ring via
 *  the same squash trick the inward vignette uses. */
function drawSkirt(ctx: CanvasRenderingContext2D, theme: ZoneTheme,
  camX: number, camY: number, vw: number, vh: number,
  w: number, h: number, ell: boolean): void {
  const { width: D, alpha } = VIS_CFG.voidFrame.skirt;
  const earth = earthOf(theme);
  const c0 = withAlpha(earth, alpha), c1 = withAlpha(earth, 0);
  if (ell) {
    ctx.save();
    // Clip to OUTSIDE the oval (the motes' evenodd idiom) BEFORE the squash
    // transform. A canvas radial gradient CLAMPS to its offset-0 color
    // inside the start radius, so the unclipped ring also washed the ENTIRE
    // interior with the skirt's earth tone at full alpha — a whole-screen
    // muddy veil that snapped on and off with viewInside's binary corner
    // test (the jarring "fog-like overlay" a playtest caught by stepping
    // east on an isle: one view corner slipping past the rim flipped the
    // wash over the whole world). Clipped, the skirt exists only past the
    // rim, and its visible share grows continuously from a sliver as a
    // corner exits — the gate stays a pure perf early-out.
    ctx.beginPath();
    ctx.rect(camX, camY, vw, vh);
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.clip('evenodd');
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, h / w);
    const R = w / 2, E = R + D;
    const g = ctx.createRadialGradient(0, 0, R, 0, 0, E);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fillRect(-E, -E * (w / h), E * 2, E * (w / h) * 2);
    ctx.restore();
    return;
  }
  const band = (x0: number, y0: number, x1: number, y1: number,
    rx: number, ry: number, rw: number, rh: number): void => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
  };
  const corner = (cx: number, cy: number, rx: number, ry: number): void => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, D);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, D, D);
  };
  if (camY < 0) band(0, 0, 0, -D, 0, -D, w, D);                  // top
  if (camY + vh > h) band(0, h, 0, h + D, 0, h, w, D);           // bottom
  if (camX < 0) band(0, 0, -D, 0, -D, 0, D, h);                  // left
  if (camX + vw > w) band(w, 0, w + D, 0, w, 0, D, h);           // right
  if (camX < 0 && camY < 0) corner(0, 0, -D, -D);
  if (camX + vw > w && camY < 0) corner(w, 0, w, -D);
  if (camX < 0 && camY + vh > h) corner(0, h, -D, h);
  if (camX + vw > w && camY + vh > h) corner(w, h, w, h);
}

/** Sparse drifting dust in the void — clipped to OUTSIDE the zone silhouette,
 *  hashed per parallax-grid cell (deterministic; no flicker), swaying slowly
 *  in place so nothing ever pops at a cell seam. */
function drawMotes(ctx: CanvasRenderingContext2D, theme: ZoneTheme, time: number,
  camX: number, camY: number, vw: number, vh: number,
  w: number, h: number, ell: boolean): void {
  const m = VIS_CFG.voidFrame.motes;
  ctx.save();
  ctx.beginPath();
  ctx.rect(camX, camY, vw, vh);
  if (ell) ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else ctx.rect(0, 0, w, h);
  ctx.clip('evenodd');
  // Anchors live in PARALLAX SPACE (world × parallax): a point p renders at
  // world pos p + cam·(1-parallax), so it slides slower than the ground —
  // the dark gains depth. Grid the visible parallax window, one mote a cell.
  const par = m.parallax, cell = m.cell;
  const shiftX = camX * (1 - par), shiftY = camY * (1 - par);
  const i0 = Math.floor((camX * par) / cell) - 1, i1 = Math.floor((camX * par + vw) / cell) + 1;
  const j0 = Math.floor((camY * par) / cell) - 1, j1 = Math.floor((camY * par + vh) / cell) + 1;
  const TAU = Math.PI * 2;
  ctx.fillStyle = moteColorOf(theme);
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const h1 = hash01(i, j, 7), h2 = hash01(i, j, 13), h3 = hash01(i, j, 29);
      const x = (i + h1) * cell + Math.sin(time * 0.13 + h1 * TAU) * cell * m.sway + shiftX;
      const y = (j + h2) * cell + Math.cos(time * 0.11 + h2 * TAU) * cell * m.sway + shiftY;
      const r = m.rMin + (m.rMax - m.rMin) * h3;
      const twinkle = 0.5 + 0.5 * Math.sin(time * 0.7 + h3 * TAU);
      ctx.globalAlpha = m.alpha * (0.35 + 0.65 * twinkle);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** The rim lip: dark seat under the classic border line, lit crest over it. */
function drawRim(ctx: CanvasRenderingContext2D, theme: ZoneTheme,
  w: number, h: number, ell: boolean): void {
  const r = VIS_CFG.voidFrame.rim;
  const inset = ell ? 2 : 0; // the classic ellipse stroke's -2px inset, kept
  traceRim(ctx, w, h, ell, inset);
  ctx.strokeStyle = withAlpha(seatColorOf(theme), r.seatAlpha);
  ctx.lineWidth = r.seatWidth;
  ctx.stroke();
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = r.lineWidth;
  ctx.stroke();
  ctx.strokeStyle = withAlpha(crestColorOf(theme), r.crestAlpha);
  ctx.lineWidth = r.crestWidth;
  ctx.stroke();
}

/** The whole frame, called by drawFloor for every BOUNDED zone after the
 *  clipped ground pass (world transform live, so the frame shakes with the
 *  world). Boundless zones never get here — no edge, no frame. */
export function drawVoidFrame(ctx: CanvasRenderingContext2D, world: World,
  camX: number, camY: number, vw: number, vh: number, time: number): void {
  const az = world.arena;
  if (az.boundless) return;
  const theme = world.zone.theme;
  const ell = az.shape === 'ellipse';
  // Ablated: the pre-fabric look — the plain border line, nothing else.
  if (VIS_ABLATE.has('voidframe')) {
    traceRim(ctx, az.w, az.h, ell, ell ? 2 : 0);
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = VIS_CFG.voidFrame.rim.lineWidth;
    ctx.stroke();
    return;
  }
  // Skirt + motes only when some void is actually in view; the rim line is
  // visible from inside the zone too (canvas clips its own overdraw).
  if (!viewInside(camX, camY, vw, vh, az.w, az.h, ell)) {
    drawSkirt(ctx, theme, camX, camY, vw, vh, az.w, az.h, ell);
    drawMotes(ctx, theme, time, camX, camY, vw, vh, az.w, az.h, ell);
  }
  drawRim(ctx, theme, az.w, az.h, ell);
}
