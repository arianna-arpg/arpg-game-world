// ---------------------------------------------------------------------------
// Shared pure Atlas chart painter (runs identically on OffscreenCanvas inside
// atlas.worker.ts and on HTMLCanvasElement on the main thread).
// ---------------------------------------------------------------------------

import { ATLAS_CFG, atlasShade, contourBand, hexRgb, mapFeatureKind, type MapFeature, type RGB } from '../world/atlas';
import { ATLAS_GLYPHS, type ChartGlyphSpec } from '../data/atlasFeatures';
import { BIOMES, OCEAN_BIOME, type BiomeFieldModifier } from '../world/biomes';
import type { MapCoord } from '../world/coords';
import { hash01 } from '../engine/hash';
import { atlasBudget, AtlasRevealIndex } from './atlasBudget';

export type TerrainKind = 'land' | 'ocean' | 'bridge';
export type PaintContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface AtlasLabel { x: number; y: number; text: string; color: string; kind: string }

export interface AtlasWorkerSpec {
  dim: string;
  seed: number;
  origin: MapCoord;
  anchors: Record<string, MapCoord | null>;
  warps: BiomeFieldModifier[];
  gateAnchor?: MapCoord;
}

export interface AtlasCoreInput {
  key: string;
  maxPx?: number;
  box: { minX: number; minY: number; maxX: number; maxY: number };
  biomeAt: (c: MapCoord) => string;
  elevAt: ((c: MapCoord) => number) | null;
  kindAt: (c: MapCoord) => TerrainKind;
  reveal: readonly MapCoord[];
  noVeil?: boolean;
  rivers: readonly MapCoord[][];
  features: readonly MapFeature[];
  layers: { relief: boolean; rivers: boolean; features: boolean; glyphs: boolean };
  seed: number;
}

// --- glyph painters (open registry) ------------------------------------------

export type GlyphPainter = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, h: number) => void;

export const GLYPHS: Record<string, GlyphPainter> = {};
export function registerGlyphPainter(id: string, fn: GlyphPainter): void { GLYPHS[id] = fn; }

const darkerMemo = new Map<string, string>();
export const darker = (hex: string, k: number): string => {
  const key = `${hex}|${k}`;
  let v = darkerMemo.get(key);
  if (!v) {
    const [r, g, b] = hexRgb(hex);
    v = `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
    darkerMemo.set(key, v);
  }
  return v;
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

// --- shared raster job state & fast phases -----------------------------------

export interface PaintJobState {
  key: string;
  inp: AtlasCoreInput;
  W: number; H: number;
  ppu: number;
  upc: number;
  s: number; cols: number; rows: number;
  elev: Float32Array; bio: Uint16Array; kind: Uint8Array; shore: Float32Array;
  biomes: string[]; biomeIdx: Map<string, number>;
  rmask: Float32Array | null; rgw: number; rgh: number; rcell: number;
  revealIndex?: AtlasRevealIndex;
  row: number; col: number;
  ctx: PaintContext2D; img: ImageData;
  labels: AtlasLabel[];
}

// Reusable typed-array buffers to avoid repeated ~600 KB allocations per raster.
let poolElev = new Float32Array(0);
let poolBio = new Uint16Array(0);
let poolKind = new Uint8Array(0);
let poolShore = new Float32Array(0);

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

const scratchSeam: MapCoord = { x: 0, y: 0 };
const scratchTrue: MapCoord = { x: 0, y: 0 };

function fillSeamCoord(ux: number, uy: number, seed: number, out: MapCoord): void {
  const S = ATLAS_CFG.seams;
  if (!S.warp) { out.x = ux; out.y = uy; return; }
  out.x = ux + (smoothNoise(ux, uy, S.cell, seed ^ 0x5eaa) - 0.5) * 2 * S.warp;
  out.y = uy + (smoothNoise(ux, uy, S.cell, seed ^ 0x77bb) - 0.5) * 2 * S.warp;
}

export function createPaintJobState(
  inp: AtlasCoreInput,
  makeCtx: (W: number, H: number) => PaintContext2D,
  reusePool: boolean,
): PaintJobState {
  const C = ATLAS_CFG.raster;
  const bw = Math.max(1, inp.box.maxX - inp.box.minX), bh = Math.max(1, inp.box.maxY - inp.box.minY);
  const { ppu, W, H, rcell } = atlasBudget(bw, bh,
    { ...C, maxPx: Math.max(8, Math.min(C.maxPx, inp.maxPx ?? C.maxPx)) }, ATLAS_CFG.reveal.cell);
  const s = C.lattice;
  const cols = Math.ceil(W / s) + 2, rows = Math.ceil(H / s) + 2;
  const n = cols * rows;
  const ctx = makeCtx(W, H);
  const rgw = Math.ceil(bw / rcell) + 2, rgh = Math.ceil(bh / rcell) + 2;
  const revealIndex = !inp.noVeil && rcell > ATLAS_CFG.reveal.cell
    ? new AtlasRevealIndex(ATLAS_CFG.reveal.radius, ATLAS_CFG.reveal.feather) : undefined;
  const rmask = inp.noVeil || revealIndex ? null : new Float32Array(rgw * rgh);

  let elev: Float32Array, bio: Uint16Array, kind: Uint8Array, shore: Float32Array;
  if (reusePool) {
    if (poolElev.length < n) {
      poolElev = new Float32Array(n);
      poolBio = new Uint16Array(n);
      poolKind = new Uint8Array(n);
      poolShore = new Float32Array(n);
    }
    elev = poolElev.subarray(0, n);
    bio = poolBio.subarray(0, n);
    kind = poolKind.subarray(0, n);
    shore = poolShore.subarray(0, n);
    elev.fill(0); bio.fill(0); kind.fill(0);
  } else {
    elev = new Float32Array(n);
    bio = new Uint16Array(n);
    kind = new Uint8Array(n);
    shore = new Float32Array(n);
  }

  return {
    key: inp.key, inp, W, H, ppu, upc: s / ppu, s, cols, rows,
    elev, bio, kind, shore,
    biomes: ['__none', OCEAN_BIOME], biomeIdx: new Map([['__none', 0], [OCEAN_BIOME, 1]]),
    rmask, rgw, rgh, rcell, revealIndex,
    row: 0, col: 0, ctx, img: ctx.createImageData(W, H), labels: [],
  };
}

export function runRevealSync(j: PaintJobState): void {
  const { inp, rmask, rcell, rgw, rgh } = j;
  if (j.revealIndex) {
    for (let i = 0; i < inp.reveal.length; i++) j.revealIndex.add(inp.reveal[i]);
  }
  if (rmask) {
    const R0 = ATLAS_CFG.reveal.radius, R1 = R0 + ATLAS_CFG.reveal.feather;
    const r0Sq = R0 * R0, r1Sq = R1 * R1, invFeather = 1 / (R1 - R0);
    const rc = Math.ceil(R1 / rcell);
    for (let k = 0; k < inp.reveal.length; k++) {
      const p = inp.reveal[k];
      const gx = (p.x - inp.box.minX) / rcell, gy = (p.y - inp.box.minY) / rcell;
      const cx = Math.round(gx), cy = Math.round(gy);
      const yMin = Math.max(0, cy - rc), yMax = Math.min(rgh - 1, cy + rc);
      const xMin = Math.max(0, cx - rc), xMax = Math.min(rgw - 1, cx + rc);
      for (let y = yMin; y <= yMax; y++) {
        const dy = (y - gy) * rcell, dy2 = dy * dy;
        const rowOff = y * rgw;
        for (let x = xMin; x <= xMax; x++) {
          const dx = (x - gx) * rcell;
          const d2 = dx * dx + dy2;
          if (d2 >= r1Sq) continue;
          const v = d2 <= r0Sq ? 1 : 1 - smooth01((Math.sqrt(d2) - R0) * invFeather);
          const idx = rowOff + x;
          if (v > rmask[idx]) rmask[idx] = v;
        }
      }
    }
  }
}

export function revealAt(j: PaintJobState, ux: number, uy: number): number {
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

/** Sample terrain kind, biome, and elevation. Open ocean cells skip biomeAt
 *  (always OCEAN_BIOME) and only sample elevAt within 2 lattice steps of land/bridge
 *  so coastal slopes & bilinear interpolation remain 100% bit-identical. */
export function runSampleChunked(j: PaintJobState, deadline: number): boolean {
  const { inp, cols, rows, upc } = j;
  const wantElev = !!inp.elevAt && inp.layers.relief;
  for (; j.row < rows; j.row++) {
    const uy = inp.box.minY + j.row * upc;
    for (; j.col < cols; j.col++) {
      const c = j.col;
      if ((c & 63) === 0 && performance.now() > deadline) return false;
      const ux = inp.box.minX + c * upc;
      const i = j.row * cols + c;
      if (revealAt(j, ux, uy) < 0.004) { j.bio[i] = 0; j.kind[i] = 0; j.elev[i] = 0.5; continue; }
      fillSeamCoord(ux, uy, inp.seed, scratchSeam);
      const kind = inp.kindAt(scratchSeam);
      if (kind === 'ocean') {
        j.bio[i] = 1; // OCEAN_BIOME
        j.kind[i] = 2;
        j.elev[i] = -1; // sentinel: fill lazily only if adjacent to land/bridge
      } else {
        const b = inp.biomeAt(scratchSeam);
        let bi = j.biomeIdx.get(b);
        if (bi === undefined) { bi = j.biomes.length; j.biomes.push(b); j.biomeIdx.set(b, bi); }
        j.bio[i] = bi;
        j.kind[i] = kind === 'land' ? 1 : 3;
        if (wantElev) {
          scratchTrue.x = ux; scratchTrue.y = uy;
          j.elev[i] = inp.elevAt!(scratchTrue);
        } else {
          j.elev[i] = 0.5;
        }
      }
    }
    j.col = 0;
  }
  // Fill coastal ocean elevation halo (within 2 lattice cells of land/bridge)
  if (wantElev) {
    const { kind, elev } = j;
    for (let r = 0; r < rows; r++) {
      const r0 = Math.max(0, r - 2), r1 = Math.min(rows - 1, r + 2);
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (elev[i] >= 0) continue;
        let nearLand = false;
        const c0 = Math.max(0, c - 2), c1 = Math.min(cols - 1, c + 2);
        for (let rr = r0; rr <= r1 && !nearLand; rr++) {
          const off = rr * cols;
          for (let cc = c0; cc <= c1; cc++) {
            const kk = kind[off + cc];
            if (kk === 1 || kk === 3) { nearLand = true; break; }
          }
        }
        if (nearLand) {
          scratchTrue.x = inp.box.minX + c * upc;
          scratchTrue.y = inp.box.minY + r * upc;
          elev[i] = inp.elevAt!(scratchTrue);
        } else {
          elev[i] = 0.5;
        }
      }
    }
  } else {
    const { elev } = j;
    for (let i = 0; i < elev.length; i++) if (elev[i] < 0) elev[i] = 0.5;
  }
  j.row = 0; j.col = 0;
  return true;
}

export function runShoreSync(j: PaintJobState): void {
  const { cols, rows, kind } = j;
  const n = cols * rows;
  const d = j.shore;
  const INF = 1e9;
  d.fill(INF);
  for (let r = 0; r < rows; r++) {
    const rowOff = r * cols;
    for (let c = 0; c < cols; c++) {
      const i = rowOff + c, k = kind[i];
      if (!k) continue;
      const water = k === 2;
      if (
        (c > 0 && kind[i - 1] !== 0 && (kind[i - 1] === 2) !== water) ||
        (c < cols - 1 && kind[i + 1] !== 0 && (kind[i + 1] === 2) !== water) ||
        (r > 0 && kind[i - cols] !== 0 && (kind[i - cols] === 2) !== water) ||
        (r < rows - 1 && kind[i + cols] !== 0 && (kind[i + cols] === 2) !== water)
      ) {
        d[i] = 0.5;
      }
    }
  }
  const D1 = 1, D2 = Math.SQRT2;
  for (let r = 1; r < rows; r++) {
    const rowOff = r * cols;
    for (let c = 0; c < cols; c++) {
      const i = rowOff + c;
      if (!kind[i]) continue;
      let v = d[i];
      const up = d[i - cols] + D1; if (up < v) v = up;
      if (c > 0) { const ul = d[i - cols - 1] + D2; if (ul < v) v = ul; const l = d[i - 1] + D1; if (l < v) v = l; }
      if (c < cols - 1) { const ur = d[i - cols + 1] + D2; if (ur < v) v = ur; }
      d[i] = v;
    }
  }
  for (let r = rows - 2; r >= 0; r--) {
    const rowOff = r * cols;
    for (let c = cols - 1; c >= 0; c--) {
      const i = rowOff + c;
      if (!kind[i]) continue;
      let v = d[i];
      const dn = d[i + cols] + D1; if (dn < v) v = dn;
      if (c < cols - 1) { const dr = d[i + cols + 1] + D2; if (dr < v) v = dr; const rt = d[i + 1] + D1; if (rt < v) v = rt; }
      if (c > 0) { const dl = d[i + cols - 1] + D2; if (dl < v) v = dl; }
      d[i] = v;
    }
  }
  const upc = j.upc;
  for (let i = 0; i < n; i++) d[i] = d[i] >= INF ? Infinity : d[i] * upc;
}

export function runShadeChunked(j: PaintJobState, deadline: number): boolean {
  const { W, H, s, cols, rows, elev, bio, kind, shore, inp, upc } = j;
  const data = j.img.data;
  const rgb: RGB = [0, 0, 0];
  const relief = inp.layers.relief && !!inp.elevAt;
  const opacity255 = ATLAS_CFG.raster.opacity * 255;
  const grain2 = 2 * ATLAS_CFG.grain;
  const contourKeep = 1 - ATLAS_CFG.contour.alpha;
  const inv2Upc = 1 / (2 * upc);
  const invS = 1 / s;
  const maxC = cols - 1, maxR = rows - 1;
  const E = (c: number, r: number): number =>
    elev[(r < 0 ? 0 : r > maxR ? maxR : r) * cols + (c < 0 ? 0 : c > maxC ? maxC : c)];
  const bil = (fc: number, fr: number): number => {
    const c0 = Math.floor(fc), r0 = Math.floor(fr), tx = fc - c0, ty = fr - r0;
    const a = E(c0, r0), b = E(c0 + 1, r0), c = E(c0, r0 + 1), d = E(c0 + 1, r0 + 1);
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  };
  const shadeIn = { biome: '', elev: 0.5, kind: 'land' as TerrainKind, sx: 0, sy: 0, shore: Infinity, relief };
  for (; j.row < H; j.row++) {
    const py = j.row;
    const fr = py * invS, rn = Math.round(fr);
    const rnClamped = rn < 0 ? 0 : rn > maxR ? maxR : rn;
    const r0 = clamp(Math.floor(fr), 0, cols > 1 ? rows - 2 : 0);
    const uy = inp.box.minY + py / j.ppu;
    for (; j.col < W; j.col++) {
      const px = j.col;
      if ((px & 63) === 0 && performance.now() > deadline) return false;
      const o = (py * W + px) * 4;
      const fc = px * invS, cn = Math.round(fc);
      const cnClamped = cn < 0 ? 0 : cn > maxC ? maxC : cn;
      const ci = rnClamped * cols + cnClamped;
      let bi = bio[ci];
      if (!bi) { data[o + 3] = 0; continue; }
      const ux = inp.box.minX + px / j.ppu;
      const rev = revealAt(j, ux, uy);
      if (rev < 0.004) { data[o + 3] = 0; continue; }
      let k = kind[ci];
      const c0 = clamp(Math.floor(fc), 0, cols - 2);
      const i00 = r0 * cols + c0, i01 = i00 + 1, i10 = i00 + cols, i11 = i10 + 1;
      if (bio[i00] !== bio[i01] || bio[i00] !== bio[i10] || bio[i00] !== bio[i11]
        || kind[i00] !== kind[i01] || kind[i00] !== kind[i10] || kind[i00] !== kind[i11]) {
        fillSeamCoord(ux, uy, inp.seed, scratchSeam);
        const kk = inp.kindAt(scratchSeam);
        if (kk === 'ocean') {
          bi = 1;
          k = 2;
        } else {
          const b = inp.biomeAt(scratchSeam);
          let bx = j.biomeIdx.get(b);
          if (bx === undefined) { bx = j.biomes.length; j.biomes.push(b); j.biomeIdx.set(b, bx); }
          bi = bx;
          k = kk === 'land' ? 1 : 3;
        }
      }
      const isOcean = k === 2;
      const e = !isOcean && relief ? bil(fc, fr) : 0.5;
      shadeIn.biome = j.biomes[bi];
      shadeIn.elev = e;
      shadeIn.kind = isOcean ? 'ocean' : k === 3 ? 'bridge' : 'land';
      shadeIn.sx = !isOcean && relief ? (E(cn + 1, rn) - E(cn - 1, rn)) * inv2Upc : 0;
      shadeIn.sy = !isOcean && relief ? (E(cn, rn + 1) - E(cn, rn - 1)) * inv2Upc : 0;
      shadeIn.shore = shore[ci];
      atlasShade(shadeIn, rgb);
      let f = 1 + (hash01(px, py, inp.seed) - 0.5) * grain2;
      if (relief && !isOcean) {
        const b0 = contourBand(e);
        if (contourBand(bil(fc + invS, fr)) !== b0 || contourBand(bil(fc, fr + invS)) !== b0) f *= contourKeep;
      }
      data[o] = Math.min(255, rgb[0] * f);
      data[o + 1] = Math.min(255, rgb[1] * f);
      data[o + 2] = Math.min(255, rgb[2] * f);
      data[o + 3] = Math.round(rev * opacity255);
    }
    j.col = 0;
  }
  j.row = 0; j.col = 0;
  return true;
}

function drawRiversSync(j: PaintJobState): void {
  const { ctx, inp, ppu } = j;
  const minX = inp.box.minX, minY = inp.box.minY;
  const C = ATLAS_CFG.rivers;
  const widthScale = Math.max(0.55, Math.min(1.4, ppu * 2.2));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let rIdx = 0; rIdx < inp.rivers.length; rIdx++) {
    const pts = inp.rivers[rIdx];
    const n = pts.length;
    if (n < 2) continue;
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass === 0 ? C.edge : C.color;
      for (let i = 1; i < n; i++) {
        const a = pts[i - 1], b = pts[i];
        if (revealAt(j, (a.x + b.x) * 0.5, (a.y + b.y) * 0.5) < C.minReveal) continue;
        const w = (C.width[0] + (C.width[1] - C.width[0]) * (i / n)) * widthScale;
        ctx.lineWidth = Math.max(0.8, pass === 0 ? w + 1.6 : w);
        const ax = (a.x - minX) * ppu, ay = (a.y - minY) * ppu;
        const bx = (b.x - minX) * ppu, by = (b.y - minY) * ppu;
        ctx.beginPath();
        if (i > 1) {
          const p = pts[i - 2];
          const px = (p.x - minX) * ppu, py = (p.y - minY) * ppu;
          ctx.moveTo((px + ax) * 0.5, (py + ay) * 0.5);
          ctx.quadraticCurveTo(ax, ay, (ax + bx) * 0.5, (ay + by) * 0.5);
          if (i === n - 1) ctx.lineTo(bx, by);
        } else {
          ctx.moveTo(ax, ay);
          ctx.lineTo((ax + bx) * 0.5, (ay + by) * 0.5);
        }
        ctx.stroke();
      }
    }
  }
}

function drawGlyphsSync(j: PaintJobState): void {
  const { inp, cols, rows, ppu, upc } = j;
  const ctx = j.ctx as CanvasRenderingContext2D;
  const G = ATLAS_CFG.glyphs;
  let base = 40;
  for (const spec of Object.values(ATLAS_GLYPHS)) base = Math.min(base, spec.spacing);
  base = Math.max(base, G.minSpacingPx / ppu);
  const gx0 = Math.floor(inp.box.minX / base), gx1 = Math.ceil(inp.box.maxX / base);
  const gy0 = Math.floor(inp.box.minY / base), gy1 = Math.ceil(inp.box.maxY / base);
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const h1 = hash01(gx, gy, inp.seed ^ 0x9137), h2 = hash01(gy, gx, inp.seed ^ 0x2b41), h3 = hash01(gx + 7, gy - 3, inp.seed ^ 0x77e1);
      const ux = (gx + 0.05 + h1 * 0.9) * base, uy = (gy + 0.05 + h2 * 0.9) * base;
      if (revealAt(j, ux, uy) < G.minReveal) continue;
      const c = Math.round((ux - inp.box.minX) / upc), r = Math.round((uy - inp.box.minY) / upc);
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const bi = j.bio[r * cols + c];
      if (!bi) continue;
      const biome = j.biomes[bi];
      const spec: ChartGlyphSpec | undefined = ATLAS_GLYPHS[biome];
      if (!spec) continue;
      const keep = Math.min(1, (base / spec.spacing) ** 2);
      if (h3 > keep) continue;
      const size = spec.size * ppu;
      if (size < G.minPx) continue;
      const glyphId = spec.alt && hash01(gx * 3, gy * 5, inp.seed ^ 0x5151) < (spec.altChance ?? 0.3) ? spec.alt : spec.glyph;
      const paint = GLYPHS[glyphId];
      if (!paint) continue;
      const color = spec.color ?? darker(BIOMES[biome]?.mapColor ?? '#3a3a44', 0.62);
      ctx.save();
      ctx.globalAlpha = 0.9;
      paint(ctx, (ux - inp.box.minX) * ppu, (uy - inp.box.minY) * ppu, size, color, hash01(gx * 11, gy * 13, inp.seed));
      ctx.restore();
    }
  }
}

function drawEscarpmentSync(j: PaintJobState, feat: MapFeature): void {
  const s = feat.scarp;
  if (!s) return;
  const tangent = { x: -s.normal.y, y: s.normal.x };
  const length = Math.hypot(s.a.x - s.seat.x, s.a.y - s.seat.y);
  const { ctx, inp, ppu } = j;
  const minX = inp.box.minX, minY = inp.box.minY;
  ctx.save(); ctx.lineCap = 'butt';
  for (const sign of [-1, 1]) for (let distance = s.passHalfWidth; distance < length; distance += 24) {
    const end = Math.min(length, distance + 24);
    const axU = s.seat.x + tangent.x * distance * sign, ayU = s.seat.y + tangent.y * distance * sign;
    const bxU = s.seat.x + tangent.x * end * sign, byU = s.seat.y + tangent.y * end * sign;
    const rev = revealAt(j, (axU + bxU) * 0.5, (ayU + byU) * 0.5);
    if (rev < ATLAS_CFG.features.minReveal) continue;
    ctx.globalAlpha = Math.min(1, rev * 1.4);
    const ax = (axU - minX) * ppu, ay = (ayU - minY) * ppu;
    const bx = (bxU - minX) * ppu, by = (byU - minY) * ppu;
    ctx.strokeStyle = '#1b2029'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = '#d4c5a3'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = '#81735f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - s.normal.x * 6, ay - s.normal.y * 6); ctx.stroke();
  }
  ctx.restore();
}

function drawFeaturesSync(j: PaintJobState, lakesOnly: boolean): void {
  const { inp, ppu } = j;
  const ctx = j.ctx as CanvasRenderingContext2D;
  const minX = inp.box.minX, minY = inp.box.minY;
  const F = ATLAS_CFG.features;
  for (let i = 0; i < inp.features.length; i++) {
    const feat = inp.features[i];
    const def = mapFeatureKind(feat.kind);
    if (!def) continue;
    const isLake = def.glyph === 'lake';
    if (lakesOnly !== isLake) continue;
    if (feat.scarp) drawEscarpmentSync(j, feat);
    const rev = revealAt(j, feat.seat.x, feat.seat.y);
    if (rev < F.minReveal) continue;
    const paint = GLYPHS[def.glyph];
    if (!paint) continue;
    const px = (feat.seat.x - minX) * ppu, py = (feat.seat.y - minY) * ppu;
    const size = isLake ? Math.max(3, feat.size * ppu) : clamp(feat.size * ppu, F.minPx, F.maxPx);
    ctx.save();
    ctx.globalAlpha = Math.min(1, rev * 1.4);
    paint(ctx, px, py, size, def.color, hash01(Math.round(feat.seat.x), Math.round(feat.seat.y), inp.seed));
    ctx.restore();
    if (rev >= ATLAS_CFG.labels.minReveal) {
      j.labels.push({
        x: feat.seat.x,
        y: feat.seat.y + (isLake ? feat.size * 0.8 : feat.size * 0.55) + 8 / ppu * 0.5,
        text: feat.name, color: def.color, kind: feat.kind,
      });
    }
  }
}

export function runVectorSync(j: PaintJobState): void {
  j.ctx.putImageData(j.img, 0, 0);
  if (j.inp.layers.features) drawFeaturesSync(j, true);
  if (j.inp.layers.rivers) drawRiversSync(j);
  if (j.inp.layers.glyphs) drawGlyphsSync(j);
  if (j.inp.layers.features) drawFeaturesSync(j, false);
}

/** Run the full Atlas raster pipeline continuously (used inside atlas.worker.ts). */
export function paintAtlasSync(
  inp: AtlasCoreInput,
  makeCtx: (W: number, H: number) => PaintContext2D,
): { W: number; H: number; ppu: number; labels: AtlasLabel[]; ms: number } {
  const t0 = performance.now();
  const j = createPaintJobState(inp, makeCtx, true);
  runRevealSync(j);
  runSampleChunked(j, Infinity);
  runShoreSync(j);
  runShadeChunked(j, Infinity);
  runVectorSync(j);
  return { W: j.W, H: j.H, ppu: j.ppu, labels: j.labels, ms: Math.round(performance.now() - t0) };
}
