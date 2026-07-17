// ---------------------------------------------------------------------------
// THE PORTRAIT FABRIC — any monster def, drawn AS ITSELF, anywhere.
//
// One resolver turns a def-like (MonsterDef, ClassDef, a website JSON row)
// into a PortraitSubject, and one compositor draws that subject into a
// standalone tile using the SAME bakes the world blits (vis/body.ts): the
// part-grammar look, material shading, adorns, the live-part pose, worm
// trails and composite parts. Drawn == shown — the bestiary page, the boss
// book and the website database can never drift from the in-game body,
// because they ARE the in-game body.
//
// The module is vis-pure (imports body/parts/sprites/caches/visConfig only —
// never World, never the renderer), so the website bundles it verbatim
// (src/render/portraitLib.ts → site/assets/portraits.js).
//
// Fit is MEASURED, never guessed: a probe composition is rasterized once per
// geometry (look × shape × adorn × facing × trail…), its opaque bounding box
// cached, and every tile renders at the exact radius that fills the tile —
// content-centered, so a trailing worm sits composed, not clipped. Tunables
// in VIS_CFG.portrait; per-def dials via MonsterDef.portrait (PortraitTune).
// ---------------------------------------------------------------------------

import type { ActorAdorn, ActorShape } from '../../engine/actor';
import {
  adornSprite, bodySprite, drawLiveParts, lookOf, shapeIsOriented, spriteHalf,
  type BodyLook,
} from './body';
import { registerVisCache } from './caches';
import type { PartSpec } from './parts';
import { drawShadow, releaseCanvas } from './sprites';
import { VIS_CFG } from './visConfig';

/** Per-def portrait dials (MonsterDef.portrait) — data, never code. */
export interface PortraitTune {
  /** Multiplies the fitted scale (1 = fill the tile per VIS_CFG.portrait.fill). */
  zoom?: number;
  /** Nudge, in tile fractions (+x right, +y down). */
  dx?: number;
  dy?: number;
  /** Display facing override (radians; default VIS_CFG.portrait.facing). */
  facing?: number;
  /** Pose clock override for live parts (default VIS_CFG.portrait.poseT). */
  t?: number;
  /** Worm-trail segments shown (default VIS_CFG.portrait.wormTrail; 0 = head only). */
  trail?: number;
}

/** The def fields a portrait reads — a structural subset of MonsterDef (and
 *  ClassDef, and the website's exported raw rows). Callers stamp
 *  `demonHorns` themselves (it derives from FACTIONS, which this vis-pure
 *  module must not import). */
export interface PortraitDefLike {
  shape: ActorShape;
  radius: number;
  color: string;
  material?: string | undefined;
  adorn?: ActorAdorn | undefined;
  look?: string | undefined;
  demonHorns?: boolean | undefined;
  portrait?: PortraitTune | undefined;
  /** RUNTIME TACK (Actor.extraParts) — the tamed collar, brands: an
   *  actor-based portrait wears exactly what the body wears. */
  extraParts?: PartSpec[] | undefined;
  worm?: {
    length: number;
    spacing?: number | undefined;
    taper?: number | undefined;
    hittable?: boolean | undefined;
    looks?: {
      body?: string | undefined;
      tail?: string | undefined;
      every?: { n: number; look: string } | undefined;
    } | undefined;
  } | undefined;
  parts?: { monster: string; dx: number; dy: number; rot?: number | undefined }[] | undefined;
}

/** A composite part, resolved: its own subject anchored in root radii. */
interface PortraitPart {
  sub: PortraitSubject;
  dx: number;
  dy: number;
  rot: number;
}

/** The resolved drawable — everything the compositor needs, def-free. */
export interface PortraitSubject {
  shape: ActorShape;
  radius: number;
  color: string;
  material?: string | undefined;
  adorn?: ActorAdorn | undefined;
  look?: string | undefined;
  demonHorns?: boolean | undefined;
  tune?: PortraitTune | undefined;
  extraParts?: PartSpec[] | undefined;
  worm?: NonNullable<PortraitDefLike['worm']> | undefined;
  parts?: PortraitPart[] | undefined;
}

/** Resolve a def-like into a subject. `resolvePart` expands composite parts
 *  (game: MONSTERS lookup; website: the exported rows) — omitted, a
 *  composite renders its root alone. Depth-capped so a part cycle can't
 *  recurse. */
export function portraitSubjectOf(def: PortraitDefLike, opts?: {
  resolvePart?: (id: string) => PortraitDefLike | undefined;
}, depth = 0): PortraitSubject {
  const sub: PortraitSubject = {
    shape: def.shape, radius: def.radius, color: def.color,
    material: def.material, adorn: def.adorn, look: def.look,
    demonHorns: def.demonHorns, tune: def.portrait, worm: def.worm,
    extraParts: def.extraParts,
  };
  if (def.parts?.length && opts?.resolvePart && depth < 2) {
    const parts: PortraitPart[] = [];
    for (const p of def.parts) {
      const pd = opts.resolvePart(p.monster);
      if (!pd) continue;
      parts.push({ sub: portraitSubjectOf(pd, opts, depth + 1), dx: p.dx, dy: p.dy, rot: p.rot ?? 0 });
    }
    if (parts.length) sub.parts = parts;
  }
  return sub;
}

// --- keys --------------------------------------------------------------------

function tuneKey(t?: PortraitTune): string {
  if (!t) return '';
  return `${t.zoom ?? ''},${t.dx ?? ''},${t.dy ?? ''},${t.facing ?? ''},${t.t ?? ''},${t.trail ?? ''}`;
}

function subjectKey(s: PortraitSubject): string {
  const worm = s.worm
    ? `w${s.worm.length}|${s.worm.spacing ?? ''}|${s.worm.taper ?? ''}|${s.worm.looks?.body ?? ''}|${s.worm.looks?.tail ?? ''}|${s.worm.looks?.every?.n ?? ''}:${s.worm.looks?.every?.look ?? ''}`
    : '';
  const parts = s.parts?.length
    ? 'p[' + s.parts.map(p => `${subjectKey(p.sub)}@${p.dx},${p.dy},${p.rot}`).join(';') + ']'
    : '';
  const tack = s.extraParts?.length ? 'x' + JSON.stringify(s.extraParts) : '';
  return `${s.shape}|${s.radius}|${s.color}|${s.material ?? ''}|${s.adorn ?? ''}|${s.look ?? ''}|${s.demonHorns ? 'd' : ''}|${tuneKey(s.tune)}|${worm}${parts}${tack}`;
}

// --- the compositor ----------------------------------------------------------

/** How many trail segments this subject's portrait shows. */
function trailCount(s: PortraitSubject): number {
  if (!s.worm) return 0;
  const want = s.tune?.trail ?? VIS_CFG.portrait.wormTrail;
  return Math.max(0, Math.min(s.worm.length, Math.round(want)));
}

/** The kit-part look a worm segment wears (mirrors the renderer's segLook):
 *  tail cap on the LAST shown segment when the def has one, every-nth accent
 *  (never the tail), else the body look; unset ⇒ the head's own bake. */
function segLookId(s: PortraitSubject, i: number, shown: number): string | undefined {
  const looks = s.worm?.looks;
  if (!looks) return undefined;
  if (looks.tail && i === shown - 1) return looks.tail;
  if (looks.every && looks.every.n >= 2 && (i + 1) % looks.every.n === 0) return looks.every.look;
  return looks.body;
}

/** Compose the whole subject — trail, composite parts, body, live parts,
 *  adorn — centered on the current origin at render radius `r`, facing
 *  `facing`, pose clock `t`. Everything routes through the SAME bakes the
 *  world draws. `shadows` off for silhouette work. */
function composeSubject(ctx: CanvasRenderingContext2D, s: PortraitSubject,
  r: number, facing: number, t: number, shadows: boolean, breatheScale = 1): void {
  const k = r / s.radius; // world px → portrait px
  const bodyLook: BodyLook = {
    shape: s.shape, radius: r, color: s.color,
    material: s.material, adorn: s.adorn, look: s.look, demonHorns: s.demonHorns,
    extraParts: s.extraParts,
  };
  const half = spriteHalf(r);
  const dirX = Math.cos(facing), dirY = Math.sin(facing);

  // THE TRAIL (worm defs): segments march away from the facing, tapering,
  // wearing their kit-part looks — the renderer's spine, posed still.
  const shown = trailCount(s);
  if (shown > 0 && s.worm) {
    const spacing = (s.worm.spacing ?? s.radius * 1.1) * k;
    const taper = s.worm.taper ?? 0.88;
    const solid = !!s.worm.hittable;
    for (let i = shown - 1; i >= 0; i--) {
      const segR = r * Math.pow(taper, i + 1);
      const sx = -dirX * spacing * (i + 1);
      const sy = -dirY * spacing * (i + 1);
      const lookId = segLookId(s, i, shown);
      const segLook: BodyLook = lookId
        ? { shape: 'circle', radius: r, color: s.color, material: s.material, look: lookId }
        : { shape: 'circle', radius: r, color: s.color, material: s.material };
      const kk = segR / r;
      if (shadows) drawShadow(ctx, sx, sy, segR, 0.7);
      ctx.globalAlpha = solid ? 1 : 0.55 + 0.35 * (1 - (i + 1) / (shown + 1));
      ctx.save();
      ctx.translate(sx, sy);
      if (lookId) ctx.rotate(facing); // plates face along the spine
      ctx.drawImage(bodySprite(segLook), -half * kk, -half * kk, half * 2 * kk, half * 2 * kk);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  // COMPOSITE PARTS (claws, heads, tails): anchored in the root's facing
  // frame, each a full subject of its own — drawn under the root.
  if (s.parts) {
    for (const p of s.parts) {
      const px = (p.dx * dirX - p.dy * dirY) * r;
      const py = (p.dx * dirY + p.dy * dirX) * r;
      ctx.save();
      ctx.translate(px, py);
      composeSubject(ctx, p.sub, p.sub.radius * k, facing + p.rot, t, shadows, 1);
      ctx.restore();
    }
  }

  // THE ROOT BODY — the exact drawActor stack: shadow, facing rule, bake,
  // live parts in facing space, adorn always facing-rotated.
  if (shadows) drawShadow(ctx, 0, 0, r, 1);
  const lookDef = lookOf(s.look);
  const rot = lookDef || shapeIsOriented(s.shape) ? facing : 0;
  ctx.save();
  if (breatheScale !== 1) ctx.scale(breatheScale, breatheScale);
  if (rot !== 0) ctx.rotate(rot);
  ctx.drawImage(bodySprite(bodyLook), -half, -half);
  if (lookDef?.live) drawLiveParts(ctx, bodyLook, lookDef, t);
  if (rot !== 0) ctx.rotate(-rot);
  const adornImg = adornSprite(bodyLook);
  if (adornImg) {
    ctx.rotate(facing);
    ctx.drawImage(adornImg, -half, -half);
    ctx.rotate(-facing);
  }
  // Tentacles never bake (the renderer writhes them live) — pose them here
  // with the same strokes at the frozen clock, so an eldritch body keeps
  // its fringe in the book.
  if (s.adorn === 'tentacles') {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = Math.max(1.2, r * 0.14);
    for (let arm = 0; arm < 6; arm++) {
      const base = facing + (arm / 6) * Math.PI * 2;
      const wob = Math.sin(t * 3 + arm) * 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(base) * r, Math.sin(base) * r);
      ctx.quadraticCurveTo(
        Math.cos(base + wob * 0.5) * r * 1.5, Math.sin(base + wob * 0.5) * r * 1.5,
        Math.cos(base + wob) * r * 1.9, Math.sin(base + wob) * r * 1.9);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// --- measured fit ------------------------------------------------------------

interface Fit { cx: number; cy: number; halfExtent: number } // per probe radius 1

const fitCache = new Map<string, Fit>();

function fitKey(s: PortraitSubject, facing: number): string {
  // Color/material shift pixels, not geometry — but emissive halos and
  // part params ride the look id, so the full subject key is the honest key.
  return `${subjectKey(s)}|f${facing.toFixed(3)}`;
}

let probeCanvas: HTMLCanvasElement | null = null;

/** Measure the composition's opaque bounding box once per geometry: compose
 *  at a probe radius, scan alpha, remember center + half-extent in UNITS OF
 *  THE PROBE RADIUS. Tiles then bake at exactly the radius that fills them. */
function measureFit(s: PortraitSubject, facing: number): Fit {
  const key = fitKey(s, facing);
  const hit = fitCache.get(key);
  if (hit) return hit;
  const cfg = VIS_CFG.portrait;
  let probeR = cfg.probeR;
  for (let attempt = 0; attempt < 3; attempt++) {
    const side = 512;
    if (!probeCanvas) probeCanvas = document.createElement('canvas');
    probeCanvas.width = side; probeCanvas.height = side;
    const ctx = probeCanvas.getContext('2d', { willReadFrequently: true })!;
    ctx.clearRect(0, 0, side, side);
    ctx.save();
    ctx.translate(side / 2, side / 2);
    composeSubject(ctx, s, probeR, facing, s.tune?.t ?? cfg.poseT, false);
    ctx.restore();
    const img = ctx.getImageData(0, 0, side, side).data;
    let minX = side, minY = side, maxX = -1, maxY = -1;
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        if (img[(y * side + x) * 4 + 3] > 25) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) { // nothing opaque (unknown look on a zero-alpha body)
      const fit = { cx: 0, cy: 0, halfExtent: 1.2 };
      fitCache.set(key, fit);
      return fit;
    }
    const touching = minX <= 0 || minY <= 0 || maxX >= side - 1 || maxY >= side - 1;
    if (touching && attempt < 2) { probeR = probeR / 2; continue; } // huge trail — re-probe smaller
    const cx = (minX + maxX + 1) / 2 - side / 2;
    const cy = (minY + maxY + 1) / 2 - side / 2;
    const halfExtent = Math.max(maxX - minX + 1, maxY - minY + 1) / 2;
    const fit = { cx: cx / probeR, cy: cy / probeR, halfExtent: Math.max(0.5, halfExtent / probeR) };
    fitCache.set(key, fit);
    return fit;
  }
  const fit = { cx: 0, cy: 0, halfExtent: VIS_CFG.sprite.padFactor };
  fitCache.set(key, fit);
  return fit;
}

// --- tiles -------------------------------------------------------------------

export interface PortraitOpts {
  /** Tile edge in CSS px (backing store rides VIS_CFG.portrait.oversample). */
  size: number;
  /** 'silhouette' = the undiscovered tease: true geometry, one dark tone. */
  mode?: 'full' | 'silhouette';
}

const tiles = new Map<string, HTMLCanvasElement>();

function trimTiles(keep: number): void {
  while (tiles.size > Math.max(0, keep)) {
    const oldest = tiles.keys().next().value;
    if (oldest === undefined) break;
    const victim = tiles.get(oldest);
    if (victim) releaseCanvas(victim);
    tiles.delete(oldest);
  }
}

registerVisCache({
  id: 'portraits',
  count: () => tiles.size,
  bytes: () => { let b = 0; for (const c of tiles.values()) b += c.width * c.height * 4; return b; },
  onZoneSwap: () => trimTiles(VIS_CFG.portrait.floorOnSwap),
  onRunSwap: () => trimTiles(0),
});

let scratch: HTMLCanvasElement | null = null;

/** Draw the subject fitted into a size×size box centered on (0,0) of `ctx`.
 *  The live path under animated portraits and the tile mint both land here. */
function drawFitted(ctx: CanvasRenderingContext2D, s: PortraitSubject,
  sizePx: number, mode: 'full' | 'silhouette', t: number, breatheScale: number): void {
  const cfg = VIS_CFG.portrait;
  const facing = s.tune?.facing ?? cfg.facing;
  const fit = measureFit(s, facing);
  const zoom = s.tune?.zoom ?? 1;
  let r = (sizePx / 2) * cfg.fill / fit.halfExtent * zoom;
  r = Math.min(r, cfg.maxRenderR);
  r = Math.max(2, Math.round(r * 2) / 2); // quantize: bounded bake-key space
  const ox = -fit.cx * r + (s.tune?.dx ?? 0) * sizePx;
  const oy = -fit.cy * r + (s.tune?.dy ?? 0) * sizePx;
  if (mode === 'silhouette') {
    // Compose on a scratch layer, then flood it to one dark tone — the true
    // outline, none of the detail: a shape glimpsed, not yet studied.
    if (!scratch) scratch = document.createElement('canvas');
    if (scratch.width !== sizePx || scratch.height !== sizePx) { scratch.width = sizePx; scratch.height = sizePx; }
    const sctx = scratch.getContext('2d')!;
    sctx.clearRect(0, 0, sizePx, sizePx);
    sctx.save();
    sctx.translate(sizePx / 2 + ox, sizePx / 2 + oy);
    composeSubject(sctx, s, r, facing, s.tune?.t ?? cfg.poseT, false, breatheScale);
    sctx.restore();
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = cfg.silhouette;
    sctx.fillRect(0, 0, sizePx, sizePx);
    sctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(scratch, -sizePx / 2, -sizePx / 2);
    return;
  }
  ctx.save();
  ctx.translate(ox, oy);
  composeSubject(ctx, s, r, facing, t, cfg.shadow, breatheScale);
  ctx.restore();
}

/** The cached portrait tile for a subject — mint once, blit forever. Backing
 *  store is size × oversample for crispness under ui-scale zoom + DPR. */
export function portraitTile(s: PortraitSubject, opts: PortraitOpts): HTMLCanvasElement {
  const cfg = VIS_CFG.portrait;
  const mode = opts.mode ?? 'full';
  const key = `${subjectKey(s)}|${opts.size}|${mode}`;
  const hit = tiles.get(key);
  if (hit) { tiles.delete(key); tiles.set(key, hit); return hit; }
  const px = Math.max(2, Math.round(opts.size * cfg.oversample));
  const c = document.createElement('canvas');
  c.width = px; c.height = px;
  const ctx = c.getContext('2d')!;
  ctx.translate(px / 2, px / 2);
  drawFitted(ctx, s, px, mode, s.tune?.t ?? cfg.poseT, 1);
  tiles.set(key, c);
  trimTiles(cfg.maxTiles);
  return c;
}

/** Repaint a portrait LIVE into a square canvas — the animated detail pane:
 *  live parts ride the clock, the body breathes. Uncached by design (the
 *  underlying body bakes are the cache); call per frame with your own `t`. */
export function drawPortraitInto(canvas: HTMLCanvasElement, s: PortraitSubject, t: number): void {
  const cfg = VIS_CFG.portrait;
  const px = canvas.width;
  const ctx = canvas.getContext('2d');
  if (!ctx || px < 2) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, px, canvas.height);
  ctx.translate(px / 2, canvas.height / 2);
  const breathe = cfg.breathe
    ? 1 + VIS_CFG.body.breatheAmp * Math.sin(t * VIS_CFG.body.breatheRate)
    : 1;
  drawFitted(ctx, s, px, 'full', t, breathe);
}

/** Blit a subject's cached tile into a square target canvas (the list-row /
 *  card path — cheap enough for a whole grid). */
export function paintPortrait(canvas: HTMLCanvasElement, s: PortraitSubject,
  opts: PortraitOpts): void {
  const tile = portraitTile(s, opts);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tile, 0, 0, canvas.width, canvas.height);
}
