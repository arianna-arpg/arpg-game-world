// ---------------------------------------------------------------------------
// THE ATLAS PAINTER — World-map chart coordinator (OffscreenCanvas Web Worker
// primary lane + bounded progressive main-thread fallback).
// ---------------------------------------------------------------------------

import { ATLAS_CFG, mapFeatureKinds, type MapFeature, type MapFeatureKindDef } from '../world/atlas';
import type { MapCoord } from '../world/coords';
import type { AtlasWorkerInitMsg, AtlasWorkerPaintMsg, AtlasWorkerReply } from './atlas.worker';
import {
  createPaintJobState,
  registerGlyphPainter,
  runRevealSync,
  runSampleChunked,
  runShadeChunked,
  runShoreSync,
  runVectorSync,
  type AtlasCoreInput,
  type AtlasLabel,
  type AtlasWorkerSpec,
  type GlyphPainter,
  type PaintJobState,
  type TerrainKind,
} from './atlasPaintCore';

export { registerGlyphPainter, type AtlasLabel, type AtlasWorkerSpec, type GlyphPainter, type TerrainKind };

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
  /** Optional lazy river/feature resolver for main-thread fallback when `worker` is used. */
  resolveGeo?: () => { rivers: readonly MapCoord[][]; features: readonly MapFeature[] };
  layers: { relief: boolean; rivers: boolean; features: boolean; glyphs: boolean };
  /** Per-run grain/dressing salt. */
  seed: number;
  /** Serializable terrain spec allowing full off-thread rasterization in `atlas.worker.ts`. */
  worker?: AtlasWorkerSpec;
}

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

interface FallbackJob {
  key: string;
  state: PaintJobState;
  canvas: HTMLCanvasElement;
  phase: 'reveal' | 'sample' | 'shore' | 'shade' | 'vector' | 'encode' | 'encoding' | 'done';
  spentMs: number;
}

/** Finished rasters, least-recently-used first (Map insertion order). */
const cache = new Map<string, AtlasRaster>();
let revision = 0;
export const atlasRevision = (): number => revision;

let onReadyListener: (() => void) | null = null;
export function setAtlasReadyListener(cb: (() => void) | null): void {
  onReadyListener = cb;
}

// --- OffscreenCanvas Worker Coordinator --------------------------------------

let workerInstance: Worker | null = null;
let workerUnavailable = false;
let workerFeatureCount = -1;
let workerJobSeq = 0;
let workerGeneration = 0;
let workerInFlight: { id: number; generation: number; inp: AtlasChartInput } | null = null;
const workerQueue: AtlasChartInput[] = [];

function serializeFeatureKinds(): MapFeatureKindDef[] {
  return mapFeatureKinds().map(d => ({
    id: d.id,
    label: d.label,
    glyph: d.glyph,
    icon: d.icon,
    color: d.color,
    find: d.find,
    reach: d.reach,
    size: d.size,
    names: d.names,
    read: d.read,
  }));
}

function syncWorkerFeatures(w: Worker): void {
  const kinds = mapFeatureKinds();
  if (kinds.length === workerFeatureCount) return;
  workerFeatureCount = kinds.length;
  w.postMessage({ type: 'init', featureKinds: serializeFeatureKinds() } satisfies AtlasWorkerInitMsg);
}

function pumpWorker(): void {
  if (workerInFlight || !workerQueue.length) return;
  const w = ensureWorker();
  if (!w) return;
  while (workerQueue.length) {
    const next = workerQueue.shift()!;
    if (cache.has(next.key) || !next.worker) continue;
    syncWorkerFeatures(w);
    const id = ++workerJobSeq;
    workerInFlight = { id, generation: workerGeneration, inp: next };
    const msg: AtlasWorkerPaintMsg = {
      type: 'paint',
      id,
      key: next.key,
      maxPx: next.maxPx,
      box: next.box,
      reveal: next.reveal.map(p => ({ x: p.x, y: p.y })),
      noVeil: next.noVeil,
      layers: { ...next.layers },
      spec: next.worker,
    };
    w.postMessage(msg);
    return;
  }
}

function failWorker(): void {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
  workerUnavailable = true;
  workerInFlight = null;
  workerQueue.length = 0;
  onReadyListener?.();
}

function ensureWorker(): Worker | null {
  if (workerInstance) return workerInstance;
  if (workerUnavailable) return null;
  if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function') {
    workerUnavailable = true;
    return null;
  }
  try {
    const w = new Worker(new URL('./atlas.worker.ts', import.meta.url), { type: 'module' });
    workerFeatureCount = -1;
    w.onmessage = (ev: MessageEvent<AtlasWorkerReply>) => {
      if (workerInstance !== w) return;
      const reply = ev.data;
      const active = workerInFlight;
      if (!reply || !active || reply.id !== active.id) return;
      workerInFlight = null;
      if (reply.error || !reply.blob) {
        failWorker();
        return;
      }
      if (active.generation === workerGeneration) {
        const href = URL.createObjectURL(reply.blob);
        remember({
          key: reply.key,
          href,
          x: reply.x!,
          y: reply.y!,
          w: reply.w!,
          h: reply.h!,
          labels: reply.labels ?? [],
          ms: reply.ms ?? 0,
          px: reply.px ?? 0,
        });
      }
      pumpWorker();
      if (active.generation === workerGeneration) onReadyListener?.();
    };
    w.onerror = () => failWorker();
    w.onmessageerror = () => failWorker();
    workerInstance = w;
    return w;
  } catch {
    workerUnavailable = true;
    return null;
  }
}

// --- Main-thread Progressive Fallback ----------------------------------------

let current: FallbackJob | null = null;

function startFallbackJob(inp: AtlasChartInput): FallbackJob {
  let coreInp: AtlasCoreInput = inp;
  if (inp.resolveGeo && !inp.rivers.length && !inp.features.length) {
    const geo = inp.resolveGeo();
    coreInp = { ...inp, rivers: geo.rivers, features: geo.features };
  }
  let canvas!: HTMLCanvasElement;
  const state = createPaintJobState(coreInp, (W, H) => {
    canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    return canvas.getContext('2d')!;
  }, false);
  return { key: inp.key, state, canvas, phase: 'reveal', spentMs: 0 };
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

function encodeCanvasBlob(canvas: HTMLCanvasElement, done: (href: string) => void): void {
  const finishBlob = (blob: Blob | null, triedFallback: boolean): void => {
    if (blob) { done(URL.createObjectURL(blob)); return; }
    if (!triedFallback) {
      canvas.toBlob(b => finishBlob(b, true), 'image/png');
      return;
    }
    done(canvas.toDataURL('image/png'));
  };
  canvas.toBlob(b => finishBlob(b, false), 'image/webp', 0.92);
}

/** The finished raster for `inp.key` if it exists (touching it as recent),
 *  else enqueue on `atlas.worker.ts` (0ms main-thread blocking) or advance
 *  the progressive main-thread fallback within `budgetMs`. */
export function atlasChart(inp: AtlasChartInput, budgetMs: number = ATLAS_CFG.raster.budgetMs): AtlasChartOut {
  const hit = cache.get(inp.key);
  if (hit) {
    cache.delete(inp.key);
    cache.set(inp.key, hit);
    return { raster: hit, building: atlasChartBusy(), progress: 1 };
  }

  if (inp.worker && ensureWorker()) {
    const inFlight = workerInFlight?.inp.key === inp.key;
    if (!inFlight && !workerQueue.some(q => q.key === inp.key)) {
      workerQueue.push(inp);
    }
    pumpWorker();
    return { raster: null, building: true, progress: workerInFlight?.inp.key === inp.key ? 0.5 : 0 };
  }

  if (current && current.key !== inp.key) {
    return { raster: null, building: true, progress: 0 };
  }
  if (!current) current = startFallbackJob(inp);
  const j = current;
  if (j.phase === 'encoding') return { raster: null, building: true, progress: 0.99 };
  const t0 = performance.now();
  const deadline = t0 + budgetMs;
  while (performance.now() <= deadline && j.phase !== 'done') {
    switch (j.phase) {
      case 'reveal':
        runRevealSync(j.state);
        j.phase = 'sample';
        break;
      case 'sample':
        if (runSampleChunked(j.state, deadline)) j.phase = 'shore';
        break;
      case 'shore':
        runShoreSync(j.state);
        j.phase = 'shade';
        break;
      case 'shade':
        if (runShadeChunked(j.state, deadline)) j.phase = 'vector';
        break;
      case 'vector':
        runVectorSync(j.state);
        j.phase = 'encode';
        break;
      case 'encode': {
        j.spentMs += performance.now() - t0;
        j.phase = 'encoding';
        encodeCanvasBlob(j.canvas, (href) => {
          if (current !== j) {
            if (href.startsWith('blob:')) URL.revokeObjectURL(href);
            return;
          }
          const st = j.state;
          remember({
            key: j.key, href,
            x: st.inp.box.minX, y: st.inp.box.minY, w: st.W / st.ppu, h: st.H / st.ppu,
            labels: st.labels, ms: Math.round(j.spentMs), px: Math.max(st.W, st.H),
          });
          j.phase = 'done';
          current = null;
          onReadyListener?.();
        });
        return { raster: null, building: true, progress: 0.99 };
      }
    }
  }
  j.spentMs += performance.now() - t0;
  const st = j.state;
  const progress = j.phase === 'reveal' ? 0 : j.phase === 'sample' ? 0.35 * (st.row / st.rows)
    : j.phase === 'shore' ? 0.35
      : j.phase === 'shade' ? 0.35 + 0.55 * (st.row / st.H) : 0.95;
  return { raster: null, building: true, progress };
}

/** A finished raster by key, without touching a job. */
export function atlasRaster(key: string): AtlasRaster | null { return cache.get(key) ?? null; }

/** Drop queued or in-flight jobs nobody asks for any more. */
export function atlasKeep(keys: readonly string[]): void {
  if (current && !keys.includes(current.key)) current = null;
  for (let i = workerQueue.length - 1; i >= 0; i--) {
    if (!keys.includes(workerQueue[i].key)) workerQueue.splice(i, 1);
  }
}

/** Whether any raster job is queued or in flight. */
export function atlasChartBusy(): boolean {
  return current !== null || workerInFlight !== null || workerQueue.length > 0;
}

/** Forget every raster (a run boundary; the dev tab's rebuild; tests). */
export function atlasChartReset(): void {
  revision++;
  workerGeneration++;
  current = null;
  workerQueue.length = 0;
  for (const r of cache.values()) URL.revokeObjectURL(r.href);
  cache.clear();
}

/** The dev tab's read: cached rasters (key · px · build ms) + the job in flight. */
export function atlasStats(): { cached: { key: string; px: number; ms: number }[]; building: string | null; progress: number } {
  const cached = Array.from(cache.values()).map(r => ({ key: r.key, px: r.px, ms: r.ms }));
  if (workerInFlight) {
    return { cached, building: workerInFlight.inp.key, progress: 0.5 };
  }
  if (!current) return { cached, building: null, progress: 1 };
  const j = current, st = j.state;
  const progress = j.phase === 'reveal' ? 0 : j.phase === 'sample' ? 0.35 * (st.row / st.rows)
    : j.phase === 'shore' ? 0.35
      : j.phase === 'shade' ? 0.35 + 0.55 * (st.row / st.H) : 0.95;
  return { cached, building: j.key, progress };
}
