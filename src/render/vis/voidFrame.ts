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
// THE CONTRAST GUARD: those four tones are four different functions of the
// same two theme colors, and on some palettes they land on top of each other
// — the pale Aetherial realms drew a lit crest 0.0006 luminance from their
// own skirt, an invisible hairline. Each tone is now pushed clear of what it
// SITS ON (skirt off the ink, seat off the skirt, crest off both) by
// VIS_CFG.voidFrame.contrast, LEAST-MOVE and intent-preserving: a tone that
// already reads is returned byte-identical, so this is a net under collapsed
// reads and never a restyle. Pinned by balance/probe_voidframe.ts.
//
// FUTURE HOOK: zones with an understory (ZoneDef.below / cloud-sea realms)
// could show the world-below past the rim instead of the abyss — extend the
// understory snap by a padding band and draw it here, unclipped, before the
// skirt. Deliberately not built until a design asks.
// ---------------------------------------------------------------------------

import type { ZoneTheme } from '../../data/zones';
import type { World } from '../../engine/world';
import { hash01 } from '../../engine/hash';
import { activePieces, type BoundsPiece } from '../../world/shape';
import { contrastGuard, mix, withAlpha } from './color';
import { VIS_ABLATE, VIS_CFG } from './visConfig';

/** Tiny per-theme color memos — themes are static per zone def, so these
 *  stay a handful of entries for a whole session. THE KEY LAW: a memo's key
 *  must name EVERY theme color its value is derived from. The contrast guard
 *  gives the seat and the crest a second input (the skirt earth, itself
 *  floor+border), so those two key on the PAIR — keyed on border alone they
 *  would serve one biome's tone to the next biome that shares a border. */
const baseMemo = new Map<string, string>();
const earthMemo = new Map<string, string>();
const seatMemo = new Map<string, string>();
const crestMemo = new Map<string, string>();
const moteMemo = new Map<string, string>();

/** The pair key for anything derived from both theme colors. */
const pairKey = (theme: ZoneTheme): string => theme.floor + '|' + theme.border;

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

/** The skirt's earth tone: floor blended toward the border line's color, then
 *  guarded LIGHTER against the abyss ink it falls into — a skirt that reads
 *  the same as the void is no skirt at all. (Exported for the probe; the
 *  three tones below are a pure function of the theme.) */
export function earthOf(theme: ZoneTheme): string {
  const key = pairKey(theme);
  let c = earthMemo.get(key);
  if (!c) {
    c = contrastGuard(mix(theme.floor, theme.border, VIS_CFG.voidFrame.skirt.floorMix),
      voidBaseOf(theme), VIS_CFG.voidFrame.contrast, 'lighter');
    earthMemo.set(key, c);
  }
  return c;
}

/** The rim's dark seat, guarded DARKER against the skirt it sits in. THE
 *  CHAIN ORDER IS LOAD-BEARING: the earth is guarded LIGHTER first, so it
 *  always stands a clear step above the ink — which is exactly the headroom
 *  the seat needs to move down without hitting black and flipping light. */
export function seatColorOf(theme: ZoneTheme): string {
  const key = pairKey(theme);
  let c = seatMemo.get(key);
  if (!c) {
    c = contrastGuard(mix(theme.border, '#000000', 0.75),
      earthOf(theme), VIS_CFG.voidFrame.contrast, 'darker');
    seatMemo.set(key, c);
  }
  return c;
}

/** The lit crest, guarded LIGHTER against BOTH the skirt it crowns and the
 *  seat it sits over — the pale cloud realms collapsed all three into one
 *  tone, and a hairline that matches its own ground draws nothing. */
export function crestColorOf(theme: ZoneTheme): string {
  const key = pairKey(theme);
  let c = crestMemo.get(key);
  if (!c) {
    const cfg = VIS_CFG.voidFrame.contrast;
    c = contrastGuard(mix(theme.border, '#ffffff', 0.45), earthOf(theme), cfg, 'lighter');
    c = contrastGuard(c, seatColorOf(theme), cfg, 'lighter');
    crestMemo.set(key, c);
  }
  return c;
}

function moteColorOf(theme: ZoneTheme): string {
  const m = VIS_CFG.voidFrame.motes;
  let c = moteMemo.get(theme.floor);
  if (!c) { c = mix(voidBaseOf(theme), m.color, m.colorMix); moteMemo.set(theme.floor, c); }
  return c;
}

/** The zone silhouette as the current path (rim strokes + mote clip share it).
 *  Ellipses keep the classic -2px inset the old border stroke drew with.
 *  x0/y0 seat the silhouette at an ANNEX piece's corner (0,0 = the base —
 *  the classic calls, arithmetic untouched). */
function traceRim(ctx: CanvasRenderingContext2D, w: number, h: number, ell: boolean, inset: number,
  x0 = 0, y0 = 0): void {
  ctx.beginPath();
  if (ell) ctx.ellipse(x0 + w / 2, y0 + h / 2, w / 2 - inset, h / 2 - inset, 0, 0, Math.PI * 2);
  else ctx.rect(x0, y0, w, h);
}

/** One union member's silhouette SUBPATH (no beginPath — clip builders
 *  compose it after their own bounding rect). null = the base piece. */
function pieceSubpath(ctx: CanvasRenderingContext2D, w: number, h: number, ell: boolean,
  pc: BoundsPiece | null): void {
  if (!pc) {
    if (ell) ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else ctx.rect(0, 0, w, h);
  } else if ((pc.shape ?? 'rect') === 'ellipse') {
    ctx.ellipse(pc.x + pc.w / 2, pc.y + pc.h / 2, pc.w / 2, pc.h / 2, 0, 0, Math.PI * 2);
  } else {
    ctx.rect(pc.x, pc.y, pc.w, pc.h);
  }
}

/** Clip the context to OUTSIDE one union member (a big-rect + silhouette
 *  even-odd). Sequential calls INTERSECT: outside(base) ∩ outside(A) ∩ … =
 *  outside the whole union — the overlap-safe way to mask a union (one
 *  even-odd fill reads a lapped seam as outside). */
function clipOutside(ctx: CanvasRenderingContext2D, w: number, h: number, ell: boolean,
  pc: BoundsPiece | null): void {
  ctx.beginPath();
  ctx.rect(-1e6, -1e6, 2e6, 2e6);
  pieceSubpath(ctx, w, h, ell, pc);
  ctx.clip('evenodd');
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
  ctx.save();
  ctx.beginPath();
  ctx.rect(camX, camY, vw, vh);
  if (ell) ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else ctx.rect(0, 0, w, h);
  ctx.clip('evenodd');
  drawMotesCore(ctx, theme, time, camX, camY, vw, vh);
  ctx.restore();
}

/** The mote field itself — the caller owns the clip (classic: view minus the
 *  base silhouette; composite: view minus the whole union). */
function drawMotesCore(ctx: CanvasRenderingContext2D, theme: ZoneTheme, time: number,
  camX: number, camY: number, vw: number, vh: number): void {
  const m = VIS_CFG.voidFrame.motes;
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
}

/** The rim lip: dark seat under the classic border line, lit crest over it.
 *  x0/y0 seat it at an ANNEX piece's corner (0,0 = the base, classic). */
function drawRim(ctx: CanvasRenderingContext2D, theme: ZoneTheme,
  w: number, h: number, ell: boolean, x0 = 0, y0 = 0): void {
  const r = VIS_CFG.voidFrame.rim;
  const inset = ell ? 2 : 0; // the classic ellipse stroke's -2px inset, kept
  traceRim(ctx, w, h, ell, inset, x0, y0);
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

/** Is the view rect wholly inside one ANNEX piece's silhouette? (Convex, so
 *  the four corners are sufficient — viewInside's own law per piece.) */
function viewInsidePiece(camX: number, camY: number, vw: number, vh: number,
  pc: BoundsPiece): boolean {
  if ((pc.shape ?? 'rect') !== 'ellipse') {
    return camX >= pc.x && camY >= pc.y && camX + vw <= pc.x + pc.w && camY + vh <= pc.y + pc.h;
  }
  const rx = pc.w / 2, ry = pc.h / 2, cx = pc.x + rx, cy = pc.y + ry;
  for (const [x, y] of [[camX, camY], [camX + vw, camY], [camX, camY + vh], [camX + vw, camY + vh]] as const) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy > 1) return false;
  }
  return true;
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
  // Ablated: the pre-fabric look — the plain border line, nothing else
  // (base silhouette only; a composite zone's forensics face is the base's).
  if (VIS_ABLATE.has('voidframe')) {
    traceRim(ctx, az.w, az.h, ell, ell ? 2 : 0);
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = VIS_CFG.voidFrame.rim.lineWidth;
    ctx.stroke();
    return;
  }
  const pcs = activePieces(az);
  if (!pcs.length) {
    // Skirt + motes only when some void is actually in view; the rim line is
    // visible from inside the zone too (canvas clips its own overdraw).
    if (!viewInside(camX, camY, vw, vh, az.w, az.h, ell)) {
      drawSkirt(ctx, theme, camX, camY, vw, vh, az.w, az.h, ell);
      drawMotes(ctx, theme, time, camX, camY, vw, vh, az.w, az.h, ell);
    }
    drawRim(ctx, theme, az.w, az.h, ell);
    return;
  }
  // THE COMPOSITE FRAME: every union member wears its own rim, with the
  // stroke CLIPPED where it runs through another member's ground — the wall
  // line dies exactly at an open annex's mouth, so the seam READS open. The
  // skirt stays the base piece's own (annex dress is later movements'
  // ground) but is clipped off open annex ground; motes drift only outside
  // the whole union.
  const members: (BoundsPiece | null)[] = [null, ...pcs];
  const inside = viewInside(camX, camY, vw, vh, az.w, az.h, ell)
    || pcs.some(pc => viewInsidePiece(camX, camY, vw, vh, pc));
  if (!inside) {
    ctx.save();
    for (const pc of pcs) clipOutside(ctx, az.w, az.h, ell, pc);
    drawSkirt(ctx, theme, camX, camY, vw, vh, az.w, az.h, ell);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(camX, camY, vw, vh);
    ctx.clip();
    for (const m of members) clipOutside(ctx, az.w, az.h, ell, m);
    drawMotesCore(ctx, theme, time, camX, camY, vw, vh);
    ctx.restore();
  }
  for (let i = 0; i < members.length; i++) {
    ctx.save();
    for (let j = 0; j < members.length; j++) {
      if (j !== i) clipOutside(ctx, az.w, az.h, ell, members[j]);
    }
    const m = members[i];
    if (!m) drawRim(ctx, theme, az.w, az.h, ell);
    else drawRim(ctx, theme, m.w, m.h, (m.shape ?? 'rect') === 'ellipse', m.x, m.y);
    ctx.restore();
  }
}
