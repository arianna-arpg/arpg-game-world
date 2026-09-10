// ---------------------------------------------------------------------------
// THE ATLAS PAINTER — the world-map CHART as progressively built rasters.
//
// The browser half of the atlas fabric (world/atlas.ts holds every law: the
// shading, the finders, the dials). Given the panel's sampling closures and
// the visible-node set, it samples the foreordained fields on a pixel
// lattice, shades every pixel through atlasShade (hillshade, snowline, sea
// shelf), draws contour bands, the paper grain and THE VEIL (a soft alpha
// mask around visible nodes — nothing beyond knowledge paints), then lays
// the vector dressing on top of the same canvas: lake basins, the rivers as
// tapered threads, biome dressing glyphs (a registry — one painter per
// glyph id) and the feature marks. Names come back as label rows the panel
// prints as crisp SVG text.
//
// THE PROGRESSIVE LAW: a raster is a JOB with a key (dimension, box, layers,
// the visible set, the lens). Each call advances the one job in flight by a
// time budget; FINISHED rasters live in a small LRU cache keyed by that key,
// so a raster asked for again (the base chart after a zoomed look, a window
// panned back into) returns at once. Jobs run in the order they are asked
// for — the panel asks for the BASE (the whole charted country) before the
// zoom WINDOW, so the base is always the first thing to exist and the
// window only ever refines it.
//
// THE INTERACTIVITY CONTRACT (ui/mapConfig.ts) is untouched: rasters are
// pointer-transparent <image>s under the node graph; labels ride the
// pointer-transparent over-group like every other badge.
// ---------------------------------------------------------------------------

import { ATLAS_CFG, atlasShade, contourBand, hexRgb, mapFeatureKind, type MapFeature, type RGB } from '../world/atlas';
import { ATLAS_GLYPHS, type ChartGlyphSpec } from '../data/atlasFeatures';
import { BIOMES } from '../world/biomes';
import type { MapCoord } from '../world/coords';
import { hash01 } from '../engine/hash';
import { atlasBudget, AtlasRevealIndex } from './atlasBudget';

export type TerrainKind = 'land' | 'ocean' | 'bridge';

export interface AtlasChartInput {
  /** Cache identity — a new key starts a new job (finished rasters stay cached). */
  key: string;
  /** Optional coarse overview; zoom windows keep the full raster allowance. */
  maxPx?: number;
  /** Node-space rect to paint. */
  box: { minX: number; minY: number; maxX: number; maxY: number };
  biomeAt: (c: MapCoord) => string;
  /** null = a flat plane (non-surface dimensions carry no relief). */
  elevAt: ((c: MapCoord) => number) | null;
  kindAt: (c: MapCoord) => TerrainKind;
  /** Visible node coords — THE VEIL paints around these alone. */
  reveal: readonly MapCoord[];
  /** THE DEV LENS: paint the whole box with no veil at all. */
  noVeil?: boolean;
  rivers: readonly MapCoord[][];
  features: readonly MapFeature[];
  layers: { relief: boolean; rivers: boolean; features: boolean; glyphs: boolean };
  /** Per-run grain/dressing salt. */
  seed: number;
}

export interface AtlasLabel { x: number; y: number; text: string; color: string; kind: string }

/** One finished raster: an object URL + its world rect + the labels it earned. */
export interface AtlasRaster {
  key: string;
  href: string;
  x: number; y: number; w: number; h: number;
  labels: AtlasLabel[];
  /** Build cost (ms of painter time) and the raster side (px) — the dev tab's read. */
  ms: number;
  px: number;
}

export interface AtlasChartOut {
  /** The finished raster for THIS key, or null while it builds (or waits its turn). */
  raster: AtlasRaster | null;
  /** Something is still building — the caller should tick again soon. */
  building: boolean;
  /** 0..1 of the in-flight job (1 when idle). */
  progress: number;
}

// --- glyph painters (open registry) ------------------------------------------

export type GlyphPainter = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, h: number) => void;

const GLYPHS: Record<string, GlyphPainter> = {};
export function registerGlyphPainter(id: string, fn: GlyphPainter): void { GLYPHS[id] = fn; }

const darker = (hex: string, k: number): string => {
  const [r, g, b] = hexRgb(hex);
  return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
};

registerGlyphPainter('tree', (ctx, x, y, s, color, h) => {
  ctx.fillStyle = darker(color, 0.55);
  ctx.fillRect(x - s * 0.06, y - s * 0.05, s * 0.12, s * 0.42);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y - s * 0.3, s * 0.36 * (0.85 + h * 0.3), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath(); ctx.arc(x - s * 0.1, y - s * 0.4, s * 0.16, 0, Math.PI * 2); ctx.fill();
});
registerGlyphPainter('conifer', (ctx, x, y, s, color, h) => {
  ctx.fillStyle = darker(color, 0.55);
  ctx.fillRect(x - s * 0.05, y, s * 0.1, s * 0.3);
  ctx.fillStyle = color;
  const w = s * 0.42 * (0.85 + h * 0.3);
  ctx.beginPath(); ctx.moveTo(x, y - s * 0.8); ctx.lineTo(x + w, y + s * 0.05); ctx.lineTo(x - w, y + s * 0.05); ctx.closePath(); ctx.fill();
});
registerGlyphPainter('dead_tree', (ctx, x, y, s, color) => {
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.08); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.4); ctx.lineTo(x, y - s * 0.3);
  ctx.moveTo(x, y - s * 0.05); ctx.lineTo(x - s * 0.3, y - s * 0.45);
  ctx.moveTo(x, y - s * 0.2); ctx.lineTo(x + s * 0.28, y - s * 0.5); ctx.stroke();
});
registerGlyphPainter('peak', (ctx, x, y, s, color, h) => {
  const w = s * 0.62, t = s * 0.7 * (0.85 + h * 0.3);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x - w, y + s * 0.3); ctx.lineTo(x, y - t); ctx.lineTo(x + w, y + s * 0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.moveTo(x, y - t); ctx.lineTo(x + w, y + s * 0.3); ctx.lineTo(x, y + s * 0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(240,244,248,0.85)';
  ctx.beginPath(); ctx.moveTo(x, y - t); ctx.lineTo(x + w * 0.3, y - t * 0.55); ctx.lineTo(x - w * 0.3, y - t * 0.55); ctx.closePath(); ctx.fill();
});
registerGlyphPainter('hill', (ctx, x, y, s, color) => {
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.09); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y + s * 0.2, s * 0.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
});
registerGlyphPainter('dune', (ctx, x, y, s, color) => {
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.08); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - s * 0.5, y + s * 0.1); ctx.quadraticCurveTo(x - s * 0.1, y - s * 0.35, x + s * 0.5, y + s * 0.05); ctx.stroke();
});
registerGlyphPainter('reed', (ctx, x, y, s, color) => {
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.07); ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = -1; i <= 1; i++) { ctx.moveTo(x + i * s * 0.18, y + s * 0.3); ctx.lineTo(x + i * s * 0.26, y - s * 0.4); }
  ctx.stroke();
});
registerGlyphPainter('snow', (ctx, x, y, s, color) => {
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + (i - 1) * s * 0.3, y + (i % 2) * s * 0.2, Math.max(0.8, s * 0.09), 0, Math.PI * 2); ctx.fill(); }
});
registerGlyphPainter('cone', (ctx, x, y, s, color) => {
  const w = s * 0.5;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x - w, y + s * 0.3); ctx.lineTo(x, y - s * 0.5); ctx.lineTo(x + w, y + s * 0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff8a3a';
  ctx.beginPath(); ctx.arc(x, y - s * 0.42, Math.max(1, s * 0.12), 0, Math.PI * 2); ctx.fill();
});
registerGlyphPainter('cross', (ctx, x, y, s, color) => {
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.1); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y - s * 0.45); ctx.lineTo(x, y + s * 0.4); ctx.moveTo(x - s * 0.25, y - s * 0.15); ctx.lineTo(x + s * 0.25, y - s * 0.15); ctx.stroke();
});
registerGlyphPainter('shard', (ctx, x, y, s, color) => {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x - s * 0.18, y + s * 0.35); ctx.lineTo(x + s * 0.05, y - s * 0.55); ctx.lineTo(x + s * 0.25, y + s * 0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.moveTo(x - s * 0.18, y + s * 0.35); ctx.lineTo(x + s * 0.05, y - s * 0.55); ctx.lineTo(x, y + s * 0.3); ctx.closePath(); ctx.fill();
});
registerGlyphPainter('wave', (ctx, x, y, s, color) => {
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(0.8, s * 0.07); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - s * 0.5, y);
  ctx.quadraticCurveTo(x - s * 0.25, y - s * 0.28, x, y); ctx.quadraticCurveTo(x + s * 0.25, y + s * 0.28, x + s * 0.5, y); ctx.stroke();
});
registerGlyphPainter('hedge', (ctx, x, y, s, color, h) => {
  ctx.fillStyle = color;
  const w = s * (0.5 + h * 0.5), hh = s * 0.16;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - hh / 2, w, hh, hh / 2); ctx.fill();
});
registerGlyphPainter('mushroom', (ctx, x, y, s, color) => {
  ctx.fillStyle = darker(color, 0.7); ctx.fillRect(x - s * 0.07, y - s * 0.05, s * 0.14, s * 0.35);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y - s * 0.05, s * 0.32, Math.PI, 0); ctx.closePath(); ctx.fill();
});
registerGlyphPainter('ruin', (ctx, x, y, s, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(x - s * 0.4, y - s * 0.1, s * 0.22, s * 0.4);
  ctx.fillRect(x + s * 0.1, y - s * 0.35, s * 0.22, s * 0.65);
});
registerGlyphPainter('flame', (ctx, x, y, s, color) => {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x, y - s * 0.55); ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.05, x, y + s * 0.3);
  ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.05, x, y - s * 0.55); ctx.fill();
});
registerGlyphPainter('spire', (ctx, x, y, s, color) => {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x - s * 0.14, y + s * 0.4); ctx.lineTo(x, y - s * 0.7); ctx.lineTo(x + s * 0.14, y + s * 0.4); ctx.closePath(); ctx.fill();
});
registerGlyphPainter('tower', (ctx, x, y, s, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(x - s * 0.16, y - s * 0.45, s * 0.32, s * 0.85);
  ctx.fillRect(x - s * 0.22, y - s * 0.55, s * 0.44, s * 0.12);
});
registerGlyphPainter('lake', (ctx, x, y, s, color) => {
  ctx.fillStyle = ATLAS_CFG.rivers.edge;
  ctx.beginPath(); ctx.ellipse(x, y, s * 1.08, s * 0.82, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.74, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath(); ctx.ellipse(x - s * 0.25, y - s * 0.2, s * 0.35, s * 0.18, 0.3, 0, Math.PI * 2); ctx.fill();
});
registerGlyphPainter('lode', (ctx, x, y, s, color) => {
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = Math.max(1.5, s * 0.22); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - s * 0.45, y - s * 0.45); ctx.lineTo(x + s * 0.45, y + s * 0.45);
  ctx.moveTo(x + s * 0.45, y - s * 0.45); ctx.lineTo(x - s * 0.45, y + s * 0.45); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.12);
  ctx.beginPath(); ctx.moveTo(x - s * 0.45, y - s * 0.45); ctx.lineTo(x + s * 0.45, y + s * 0.45);
  ctx.moveTo(x + s * 0.45, y - s * 0.45); ctx.lineTo(x - s * 0.45, y + s * 0.45); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, s * 0.7, 0, Math.PI * 2); ctx.stroke();
});
registerGlyphPainter('summit', (ctx, x, y, s, color, h) => {
  GLYPHS.peak(ctx, x, y, s * 1.15, color, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - s * 0.72, y + s * 0.35); ctx.lineTo(x, y - s * 0.8 * (0.85 + h * 0.3)); ctx.lineTo(x + s * 0.72, y + s * 0.35); ctx.closePath(); ctx.stroke();
});

// --- the job ----------------------------------------------------------------------

interface Job {
  key: string;
  inp: AtlasChartInput;
  W: number; H: number;
  ppu: number;           // px per node unit
  upc: number;           // node units per lattice cell
  s: number; cols: number; rows: number;
  elev: Float32Array; bio: Uint16Array; kind: Uint8Array; shore: Float32Array;
  biomes: string[]; biomeIdx: Map<string, number>;
  rmask: Float32Array | null; rgw: number; rgh: number; rcell: number;
  revealIndex?: AtlasRevealIndex;
  phase: 'reveal' | 'sample' | 'shore' | 'shade' | 'vector' | 'encode' | 'encoding' | 'done';
  work?: Generator<void>;
  row: number;
  col: number;
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; img: ImageData;
  labels: AtlasLabel[];
  spentMs: number;
}

let current: Job | null = null;
/** Finished rasters, least-recently-used first (Map insertion order). */
const cache = new Map<string, AtlasRaster>();
let revision = 0;
export const atlasRevision = (): number => revision;

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const smooth01 = (t: number): number => { const c = clamp(t, 0, 1); return c * c * (3 - 2 * c); };

function smoothNoise(x: number, y: number, cell: number, seed: number): number {
  const gx = x / cell, gy = y / cell;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const tx = gx - x0, ty = gy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash01(x0, y0, seed), b = hash01(x0 + 1, y0, seed), c = hash01(x0, y0 + 1, seed), d = hash01(x0 + 1, y0 + 1, seed);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

/** THE SEAM WARP (ATLAS_CFG.seams): the coordinate the biome/terrain SAMPLE
 *  reads — wandered by a smooth noise so Voronoi seams and coastlines bend
 *  organically. Rivers, features and the elevation read the true coord. */
function seamCoord(c: MapCoord, seed: number): MapCoord {
  const S = ATLAS_CFG.seams;
  if (!S.warp) return c;
  return {
    x: c.x + (smoothNoise(c.x, c.y, S.cell, seed ^ 0x5eaa) - 0.5) * 2 * S.warp,
    y: c.y + (smoothNoise(c.x, c.y, S.cell, seed ^ 0x77bb) - 0.5) * 2 * S.warp,
  };
}

function startJob(inp: AtlasChartInput): Job {
  const C = ATLAS_CFG.raster;
  const bw = Math.max(1, inp.box.maxX - inp.box.minX), bh = Math.max(1, inp.box.maxY - inp.box.minY);
  const { ppu, W, H, rcell } = atlasBudget(bw, bh,
    { ...C, maxPx: Math.max(8, Math.min(C.maxPx, inp.maxPx ?? C.maxPx)) }, ATLAS_CFG.reveal.cell);
  const s = C.lattice;
  const cols = Math.ceil(W / s) + 2, rows = Math.ceil(H / s) + 2;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  // THE VEIL MASK — a coarse lattice stamped by every visible node; the dev
  // lens (noVeil) skips it and every read returns 1.
  const rgw = Math.ceil(bw / rcell) + 2, rgh = Math.ceil(bh / rcell) + 2;
  const revealIndex = !inp.noVeil && rcell > ATLAS_CFG.reveal.cell
    ? new AtlasRevealIndex(ATLAS_CFG.reveal.radius, ATLAS_CFG.reveal.feather) : undefined;
  const rmask = inp.noVeil || revealIndex ? null : new Float32Array(rgw * rgh);
  return {
    key: inp.key, inp, W, H, ppu, upc: s / ppu, s, cols, rows,
    elev: new Float32Array(cols * rows), bio: new Uint16Array(cols * rows), kind: new Uint8Array(cols * rows),
    shore: new Float32Array(cols * rows),
    biomes: ['__none'], biomeIdx: new Map([['__none', 0]]),
    rmask, rgw, rgh, rcell, revealIndex,
    phase: 'reveal', row: 0, col: 0, canvas, ctx, img: ctx.createImageData(W, H), labels: [],
    spentMs: 0,
  };
}

function* revealPhase(j: Job): Generator<void> {
  const { inp, rmask, rcell, rgw, rgh } = j;
  if (j.revealIndex) for (const p of inp.reveal) { j.revealIndex.add(p); yield; }
  if (rmask) {
    const R0 = ATLAS_CFG.reveal.radius, R1 = R0 + ATLAS_CFG.reveal.feather;
    const rc = Math.ceil(R1 / rcell);
    for (const p of inp.reveal) {
      const gx = (p.x - inp.box.minX) / rcell, gy = (p.y - inp.box.minY) / rcell;
      const cx = Math.round(gx), cy = Math.round(gy);
      for (let y = Math.max(0, cy - rc); y <= Math.min(rgh - 1, cy + rc); y++) {
        for (let x = Math.max(0, cx - rc); x <= Math.min(rgw - 1, cx + rc); x++) {
          const d = Math.hypot((x - gx) * rcell, (y - gy) * rcell);
          if (d >= R1) continue;
          const v = 1 - smooth01((d - R0) / (R1 - R0));
          const i = y * rgw + x;
          if (v > rmask[i]) rmask[i] = v;
        }
      }
      yield;
    }
  }
  j.phase = 'sample';
}

function revealAt(j: Job, ux: number, uy: number): number {
  if (j.revealIndex) return j.revealIndex.at(ux, uy);
  if (!j.rmask) return 1;
  const gx = (ux - j.inp.box.minX) / j.rcell, gy = (uy - j.inp.box.minY) / j.rcell;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  if (x0 < 0 || y0 < 0 || x0 >= j.rgw - 1 || y0 >= j.rgh - 1) return 0;
  const tx = gx - x0, ty = gy - y0;
  const i = y0 * j.rgw + x0;
  const a = j.rmask[i], b = j.rmask[i + 1], c = j.rmask[i + j.rgw], d = j.rmask[i + j.rgw + 1];
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

function samplePhase(j: Job, deadline: number): void {
  const { inp, cols, rows, upc } = j;
  for (; j.row < rows; j.row++) {
    const uy = inp.box.minY + j.row * upc;
    for (; j.col < cols; j.col++) {
      const c = j.col;
      if ((c & 31) === 0 && performance.now() > deadline) return;
      const ux = inp.box.minX + c * upc;
      const i = j.row * cols + c;
      // Fogged ground is never sampled — the veil is a real saving on a big chart.
      if (revealAt(j, ux, uy) < 0.004) { j.bio[i] = 0; j.kind[i] = 0; j.elev[i] = 0.5; continue; }
      const coord = { x: ux, y: uy };
      const seam = seamCoord(coord, inp.seed);
      const kind = inp.kindAt(seam);
      const b = inp.biomeAt(seam);
      let bi = j.biomeIdx.get(b);
      if (bi === undefined) { bi = j.biomes.length; j.biomes.push(b); j.biomeIdx.set(b, bi); }
      j.bio[i] = bi;
      j.kind[i] = kind === 'land' ? 1 : kind === 'ocean' ? 2 : 3;
      j.elev[i] = inp.elevAt ? inp.elevAt(coord) : 0.5;
    }
    j.col = 0;
  }
  j.phase = 'shore'; j.row = 0;
}

/** Chamfer distance (cells) to the other kind — shallows off every shore
 *  and a coast band on the land, from the sampled lattice alone. */
function* shorePhase(j: Job): Generator<void> {
  const { cols, rows, kind } = j;
  const n = cols * rows;
  const d = j.shore;
  const INF = 1e9;
  d.fill(INF);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c, k = kind[i];
      if (!k) continue;
      const water = k === 2;
      const nb = [c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1, i - cols, i + cols];
      for (const q of nb) {
        if (q < 0 || q >= n) continue;
        const kq = kind[q];
        if (!kq) continue;
        if ((kq === 2) !== water) { d[i] = 0.5; break; }
      }
    }
    yield;
  }
  const D1 = 1, D2 = Math.SQRT2;
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (!kind[i]) continue;
      let v = d[i];
      const up = d[i - cols] + D1; if (up < v) v = up;
      if (c > 0) { const ul = d[i - cols - 1] + D2; if (ul < v) v = ul; const l = d[i - 1] + D1; if (l < v) v = l; }
      if (c < cols - 1) { const ur = d[i - cols + 1] + D2; if (ur < v) v = ur; }
      d[i] = v;
    }
    yield;
  }
  for (let r = rows - 2; r >= 0; r--) {
    for (let c = cols - 1; c >= 0; c--) {
      const i = r * cols + c;
      if (!kind[i]) continue;
      let v = d[i];
      const dn = d[i + cols] + D1; if (dn < v) v = dn;
      if (c < cols - 1) { const dr = d[i + cols + 1] + D2; if (dr < v) v = dr; const rt = d[i + 1] + D1; if (rt < v) v = rt; }
      if (c > 0) { const dl = d[i + cols - 1] + D2; if (dl < v) v = dl; }
      d[i] = v;
    }
    yield;
  }
  for (let i = 0; i < n; i++) d[i] = d[i] >= INF ? Infinity : d[i] * j.upc;
  j.phase = 'shade'; j.row = 0;
}

function shadePhase(j: Job, deadline: number): void {
  const { W, H, s, cols, rows, elev, bio, kind, shore, inp, upc } = j;
  const data = j.img.data;
  const rgb: RGB = [0, 0, 0];
  const relief = inp.layers.relief && !!inp.elevAt;
  const opacity = ATLAS_CFG.raster.opacity;
  const grain = ATLAS_CFG.grain;
  const cAlpha = ATLAS_CFG.contour.alpha;
  const E = (c: number, r: number): number => elev[clamp(r, 0, rows - 1) * cols + clamp(c, 0, cols - 1)];
  const bil = (fc: number, fr: number): number => {
    const c0 = Math.floor(fc), r0 = Math.floor(fr), tx = fc - c0, ty = fr - r0;
    const a = E(c0, r0), b = E(c0 + 1, r0), c = E(c0, r0 + 1), d = E(c0 + 1, r0 + 1);
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  };
  const shadeIn = { biome: '', elev: 0.5, kind: 'land' as TerrainKind, sx: 0, sy: 0, shore: Infinity, relief };
  for (; j.row < H; j.row++) {
    const py = j.row;
    const fr = py / s, rn = Math.round(fr);
    const uy = inp.box.minY + py / j.ppu;
    for (; j.col < W; j.col++) {
      const px = j.col;
      if ((px & 31) === 0 && performance.now() > deadline) return;
      const o = (py * W + px) * 4;
      const fc = px / s, cn = Math.round(fc);
      const ci = clamp(rn, 0, rows - 1) * cols + clamp(cn, 0, cols - 1);
      let bi = bio[ci];
      if (!bi) { data[o + 3] = 0; continue; }
      const ux = inp.box.minX + px / j.ppu;
      const rev = revealAt(j, ux, uy);
      if (rev < 0.004) { data[o + 3] = 0; continue; }
      let k = kind[ci];
      // THE CRISP EDGE: where the lattice's 2×2 neighbourhood disagrees on
      // biome or terrain, ask the fields at the EXACT pixel — boundaries are
      // a small share of the pixels, so the chart keeps its lattice cost and
      // loses the staircase (biome seams and coastlines read true).
      const c0 = clamp(Math.floor(fc), 0, cols - 2), r0 = clamp(Math.floor(fr), 0, rows - 2);
      const i00 = r0 * cols + c0, i01 = i00 + 1, i10 = i00 + cols, i11 = i10 + 1;
      if (bio[i00] !== bio[i01] || bio[i00] !== bio[i10] || bio[i00] !== bio[i11]
        || kind[i00] !== kind[i01] || kind[i00] !== kind[i10] || kind[i00] !== kind[i11]) {
        const coord = seamCoord({ x: ux, y: uy }, inp.seed);
        const b = inp.biomeAt(coord);
        let bx = j.biomeIdx.get(b);
        if (bx === undefined) { bx = j.biomes.length; j.biomes.push(b); j.biomeIdx.set(b, bx); }
        bi = bx;
        const kk = inp.kindAt(coord);
        k = kk === 'land' ? 1 : kk === 'ocean' ? 2 : 3;
      }
      const e = bil(fc, fr);
      shadeIn.biome = j.biomes[bi];
      shadeIn.elev = e;
      shadeIn.kind = k === 2 ? 'ocean' : k === 3 ? 'bridge' : 'land';
      shadeIn.sx = relief ? (E(cn + 1, rn) - E(cn - 1, rn)) / (2 * upc) : 0;
      shadeIn.sy = relief ? (E(cn, rn + 1) - E(cn, rn - 1)) / (2 * upc) : 0;
      shadeIn.shore = shore[ci];
      atlasShade(shadeIn, rgb);
      let f = 1 + (hash01(px, py, inp.seed) - 0.5) * 2 * grain;
      if (relief && k !== 2) {
        const b0 = contourBand(e);
        if (contourBand(bil(fc + 1 / s, fr)) !== b0 || contourBand(bil(fc, fr + 1 / s)) !== b0) f *= 1 - cAlpha;
      }
      data[o] = Math.min(255, rgb[0] * f); data[o + 1] = Math.min(255, rgb[1] * f); data[o + 2] = Math.min(255, rgb[2] * f);
      data[o + 3] = Math.round(rev * opacity * 255);
    }
    j.col = 0;
  }
  j.phase = 'vector'; j.row = 0;
}

function toPx(j: Job, c: MapCoord): [number, number] {
  return [(c.x - j.inp.box.minX) * j.ppu, (c.y - j.inp.box.minY) * j.ppu];
}

function* drawRivers(j: Job): Generator<void> {
  const { ctx, inp } = j;
  const C = ATLAS_CFG.rivers;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const pts of inp.rivers) {
    if (pts.length < 2) continue;
    const n = pts.length;
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass === 0 ? C.edge : C.color;
      for (let i = 1; i < n; i++) {
        const a = pts[i - 1], b = pts[i];
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (revealAt(j, mid.x, mid.y) < C.minReveal) continue;
        const w = (C.width[0] + (C.width[1] - C.width[0]) * (i / n)) * Math.max(0.55, Math.min(1.4, j.ppu * 2.2));
        ctx.lineWidth = Math.max(0.8, pass === 0 ? w + 1.6 : w);
        const [ax, ay] = toPx(j, a), [bx, by] = toPx(j, b);
        ctx.beginPath();
        if (i > 1) {
          const p = pts[i - 2];
          const [px, py] = toPx(j, p);
          // A smooth thread: the segment bends through its neighbours' midpoints.
          ctx.moveTo((px + ax) / 2, (py + ay) / 2);
          ctx.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2);
          if (i === n - 1) ctx.lineTo(bx, by);
        } else {
          ctx.moveTo(ax, ay); ctx.lineTo((ax + bx) / 2, (ay + by) / 2);
        }
        ctx.stroke();
        yield;
      }
    }
  }
}

function* drawGlyphs(j: Job): Generator<void> {
  const { ctx, inp, cols, rows } = j;
  const G = ATLAS_CFG.glyphs;
  // One lattice for every biome: the site's biome picks the spec, the spec's
  // own spacing thins the deal by probability. Spacing never drops below the
  // px floor, so a coarse late chart dresses lightly instead of speckling.
  let base = 40;
  for (const spec of Object.values(ATLAS_GLYPHS)) base = Math.min(base, spec.spacing);
  base = Math.max(base, G.minSpacingPx / j.ppu);
  const gx0 = Math.floor(inp.box.minX / base), gx1 = Math.ceil(inp.box.maxX / base);
  const gy0 = Math.floor(inp.box.minY / base), gy1 = Math.ceil(inp.box.maxY / base);
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const h1 = hash01(gx, gy, inp.seed ^ 0x9137), h2 = hash01(gy, gx, inp.seed ^ 0x2b41), h3 = hash01(gx + 7, gy - 3, inp.seed ^ 0x77e1);
      const ux = (gx + 0.05 + h1 * 0.9) * base, uy = (gy + 0.05 + h2 * 0.9) * base;
      if (revealAt(j, ux, uy) < G.minReveal) continue;
      const c = Math.round((ux - inp.box.minX) / j.upc), r = Math.round((uy - inp.box.minY) / j.upc);
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const bi = j.bio[r * cols + c];
      if (!bi) continue;
      const biome = j.biomes[bi];
      const spec: ChartGlyphSpec | undefined = ATLAS_GLYPHS[biome];
      if (!spec) continue;
      const keep = Math.min(1, (base / spec.spacing) ** 2);
      if (h3 > keep) continue;
      const size = spec.size * j.ppu;
      if (size < G.minPx) continue;
      const glyphId = spec.alt && hash01(gx * 3, gy * 5, inp.seed ^ 0x5151) < (spec.altChance ?? 0.3) ? spec.alt : spec.glyph;
      const paint = GLYPHS[glyphId];
      if (!paint) continue;
      const color = spec.color ?? darker(BIOMES[biome]?.mapColor ?? '#3a3a44', 0.62);
      ctx.save();
      ctx.globalAlpha = 0.9;
      paint(ctx, (ux - inp.box.minX) * j.ppu, (uy - inp.box.minY) * j.ppu, size, color, hash01(gx * 11, gy * 13, inp.seed));
      ctx.restore();
    }
    yield;
  }
}

function drawEscarpment(j: Job, feat: MapFeature): void {
  const s = feat.scarp;
  if (!s) return;
  const tangent = { x: -s.normal.y, y: s.normal.x };
  const length = Math.hypot(s.a.x - s.seat.x, s.a.y - s.seat.y);
  const { ctx } = j;
  ctx.save(); ctx.lineCap = 'butt';
  for (const sign of [-1, 1]) for (let distance = s.passHalfWidth; distance < length; distance += 24) {
    const end = Math.min(length, distance + 24);
    const a = { x: s.seat.x + tangent.x * distance * sign, y: s.seat.y + tangent.y * distance * sign };
    const b = { x: s.seat.x + tangent.x * end * sign, y: s.seat.y + tangent.y * end * sign };
    const rev = revealAt(j, (a.x + b.x) / 2, (a.y + b.y) / 2);
    if (rev < ATLAS_CFG.features.minReveal) continue;
    ctx.globalAlpha = Math.min(1, rev * 1.4);
    const [ax, ay] = toPx(j, a), [bx, by] = toPx(j, b);
    ctx.strokeStyle = '#1b2029'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = '#d4c5a3'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = '#81735f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - s.normal.x * 6, ay - s.normal.y * 6); ctx.stroke();
  }
  ctx.restore();
}

function* drawFeatures(j: Job, lakesOnly: boolean): Generator<void> {
  const { ctx, inp } = j;
  const F = ATLAS_CFG.features;
  for (const feat of inp.features) {
    yield;
    const def = mapFeatureKind(feat.kind);
    if (!def) continue;
    const isLake = def.glyph === 'lake';
    if (lakesOnly !== isLake) continue;
    if (feat.scarp) drawEscarpment(j, feat);
    const rev = revealAt(j, feat.seat.x, feat.seat.y);
    if (rev < F.minReveal) continue;
    const paint = GLYPHS[def.glyph];
    if (!paint) continue;
    const [px, py] = toPx(j, feat.seat);
    const size = isLake ? Math.max(3, feat.size * j.ppu) : clamp(feat.size * j.ppu, F.minPx, F.maxPx);
    ctx.save();
    ctx.globalAlpha = Math.min(1, rev * 1.4);
    paint(ctx, px, py, size, def.color, hash01(Math.round(feat.seat.x), Math.round(feat.seat.y), inp.seed));
    ctx.restore();
    if (rev >= ATLAS_CFG.labels.minReveal) {
      j.labels.push({ x: feat.seat.x, y: feat.seat.y + (isLake ? feat.size * 0.8 : feat.size * 0.55) + 8 / j.ppu * 0.5, text: feat.name, color: def.color, kind: feat.kind });
    }
  }
}

function* vectorPhase(j: Job): Generator<void> {
  j.ctx.putImageData(j.img, 0, 0);
  yield;
  if (j.inp.layers.features) yield* drawFeatures(j, true);
  if (j.inp.layers.rivers) yield* drawRivers(j);
  if (j.inp.layers.glyphs) yield* drawGlyphs(j);
  if (j.inp.layers.features) yield* drawFeatures(j, false);
  j.phase = 'encode';
}

function finish(j: Job, href: string): AtlasRaster {
  return {
    key: j.key, href, x: j.inp.box.minX, y: j.inp.box.minY, w: j.W / j.ppu, h: j.H / j.ppu,
    labels: j.labels, ms: Math.round(j.spentMs), px: Math.max(j.W, j.H),
  };
}

function remember(r: AtlasRaster): void {
  cache.delete(r.key);
  cache.set(r.key, r);
  const cap = ATLAS_CFG.raster.cacheEntries;
  while (cache.size > cap) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    URL.revokeObjectURL(cache.get(oldest)!.href);
    cache.delete(oldest);
  }
}

/** The finished raster for `inp.key` if it exists (touching it as recent),
 *  else advance — or start — the one job in flight within `budgetMs`. A
 *  key whose job must wait behind another returns null + building, so the
 *  caller keeps ticking; the order callers ask in is the order jobs run. */
export function atlasChart(inp: AtlasChartInput, budgetMs: number = ATLAS_CFG.raster.budgetMs): AtlasChartOut {
  const hit = cache.get(inp.key);
  if (hit) {
    cache.delete(inp.key);
    cache.set(inp.key, hit);
    return { raster: hit, building: current !== null, progress: 1 };
  }
  if (current && current.key !== inp.key) {
    // Another raster is building — this one waits its turn (the caller asks
    // for the base before the window, so the base always wins the lane).
    return { raster: null, building: true, progress: 0 };
  }
  if (!current) current = startJob(inp);
  const j = current;
  if (j.phase === 'encoding') return { raster: null, building: true, progress: 0.99 };
  const t0 = performance.now();
  const deadline = t0 + budgetMs;
  while (performance.now() <= deadline && j.phase !== 'done') {
    switch (j.phase) {
      case 'reveal':
      case 'shore':
      case 'vector': {
        j.work ??= j.phase === 'reveal' ? revealPhase(j) : j.phase === 'shore' ? shorePhase(j) : vectorPhase(j);
        if (j.work.next().done) j.work = undefined;
        break;
      }
      case 'sample': samplePhase(j, deadline); break;
      case 'shade': shadePhase(j, deadline); break;
      case 'encode': {
        j.spentMs += performance.now() - t0;
        j.phase = 'encoding';
        j.canvas.toBlob(blob => {
          // A canceled build must never publish into another world or view.
          if (current !== j) return;
          const href = blob ? URL.createObjectURL(blob) : j.canvas.toDataURL('image/png');
          remember(finish(j, href)); j.phase = 'done'; current = null;
        }, 'image/png');
        return { raster: null, building: true, progress: 0.99 };
      }
    }
  }
  j.spentMs += performance.now() - t0;
  const progress = j.phase === 'reveal' ? 0 : j.phase === 'sample' ? 0.35 * (j.row / j.rows)
    : j.phase === 'shore' ? 0.35
      : j.phase === 'shade' ? 0.35 + 0.55 * (j.row / j.H) : 0.95;
  return { raster: null, building: true, progress };
}

/** A finished raster by key, without touching a job (the panel's in-place
 *  sync reads the last good raster while a fresh one builds). */
export function atlasRaster(key: string): AtlasRaster | null { return cache.get(key) ?? null; }

/** Drop a job in flight for a raster nobody asks for any more (the view left
 *  its window), so the wanted one starts at once. */
export function atlasKeep(keys: readonly string[]): void {
  if (current && !keys.includes(current.key)) current = null;
}

/** Whether a job is in flight (the panel schedules its next tick on it). */
export function atlasChartBusy(): boolean { return current !== null; }

/** Forget every raster (a run boundary; the dev tab's rebuild; tests). */
export function atlasChartReset(): void {
  revision++;
  current = null;
  for (const r of cache.values()) URL.revokeObjectURL(r.href);
  cache.clear();
}

/** The dev tab's read: cached rasters (key · px · build ms) + the job in flight. */
export function atlasStats(): { cached: { key: string; px: number; ms: number }[]; building: string | null; progress: number } {
  const cached = Array.from(cache.values()).map(r => ({ key: r.key, px: r.px, ms: r.ms }));
  if (!current) return { cached, building: null, progress: 1 };
  const j = current;
  const progress = j.phase === 'reveal' ? 0 : j.phase === 'sample' ? 0.35 * (j.row / j.rows) : j.phase === 'shore' ? 0.35 : j.phase === 'shade' ? 0.35 + 0.55 * (j.row / j.H) : 0.95;
  return { cached, building: j.key, progress };
}
