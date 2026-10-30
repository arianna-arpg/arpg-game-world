import type { CombatRect } from './combatFocus';
import { luminance } from './color';
import { VIS_CFG } from './visConfig';

export interface CastBarOutline { color: string; alpha: number }

/** Contrast of the skill's ink against the scene, not a change to its color. */
export function castBarOutline(ink: string | readonly string[], samples: readonly number[]): CastBarOutline | null {
  const c = VIS_CFG.castReadout.contrast;
  if (!c.enabled) return null;
  if (!samples.length) return { color: c.light, alpha: c.fallbackAlpha };
  const tones = (typeof ink === 'string' ? [ink] : ink).map(luminance), low = Math.min(...samples), high = Math.max(...samples);
  const ratio = Math.min(...tones.flatMap(tone => samples.map(v => (Math.max(v,tone)+.05)/(Math.min(v,tone)+.05))));
  const close = Math.max(0, 1-(ratio-1)/(c.ratio-1));
  const busy = Math.max(0, (high-low-c.busyRange)/(1-c.busyRange));
  const alpha = Math.min(1,Math.max(close,busy))*c.maxAlpha;
  if (alpha < .05) return null;
  const mean = samples.reduce((a,b)=>a+b,0)/samples.length;
  return { color: mean > .5 ? c.dark : c.light, alpha };
}

export interface CastContrastRequest {
  id: number; width: number; height: number; world: ImageBitmap; crest?: ImageBitmap;
}
export interface CastContrastReply {
  id: number; width: number; height: number; pixels?: Uint8ClampedArray; error?: true;
}
interface SampleJob { id: number; generation: number; started: number; width: number; height: number; imageBytes: number; owned: ImageBitmap[] }

/** Keep GPU readback off the drawing thread. One immutable bitmap pair may be
 * in flight; excess refresh requests never queue. Until a current result is
 * available, the ordinary quiet contrast fallback still paints the native bar. */
export class CastBarContrast {
  private pixels?: Uint8ClampedArray;
  private nextAt = 0;
  private width = 0;
  private height = 0;
  private worker?: Worker;
  private pending?: SampleJob;
  private sequence = 0;
  private generation = 0;
  private unavailable = false;
  private source?: HTMLCanvasElement;
  private crest?: HTMLCanvasElement;
  private sourceSize = '';

  count(): number { return Number(!!this.pixels) + Number(!!this.pending); }
  bytes(): number {
    const job = this.pending;
    return (this.pixels?.byteLength ?? 0) + (job?.imageBytes ?? 0)
      + (this.worker ? (job?.width ?? this.width) * (job?.height ?? this.height) * 4 : 0);
  }

  private releaseSnapshots(job = this.pending): void {
    for (const image of job?.owned.splice(0) ?? []) image.close();
  }

  invalidate(): void {
    this.releaseSnapshots();
    this.generation++; this.pixels = undefined; this.nextAt = 0;
    this.source = this.crest = undefined; this.sourceSize = '';
  }

  reset(): void {
    this.invalidate(); this.worker?.terminate(); this.worker = undefined;
    this.pending = undefined; this.unavailable = false;
  }

  private fail(worker: Worker | undefined): void {
    if (worker !== this.worker) return;
    this.reset(); this.unavailable = true;
  }

  private sampler(): Worker | undefined {
    if (this.worker) return this.worker;
    if (this.unavailable) return;
    try {
      const worker = new Worker(new URL('./castBarContrast.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<CastContrastReply>) => {
        if (this.worker !== worker) return;
        const job = this.pending, reply = event.data;
        if (!reply || typeof reply.id !== 'number') { this.fail(worker); return; }
        if (!job || reply.id !== job.id) return;
        this.pending = undefined;
        if (reply.error || reply.width !== job.width || reply.height !== job.height
          || !(reply.pixels instanceof Uint8ClampedArray)
          || reply.pixels.length !== job.width * job.height * 4) { this.fail(worker); return; }
        if (job.generation !== this.generation || !VIS_CFG.castReadout.contrast.enabled) return;
        this.pixels = reply.pixels; this.width = job.width; this.height = job.height;
      };
      worker.onerror = () => this.fail(worker);
      worker.onmessageerror = () => this.fail(worker);
      this.worker = worker; return worker;
    } catch { this.unavailable = true; return; }
  }

  capture(world: HTMLCanvasElement, crest: HTMLCanvasElement | undefined, now: number): void {
    const c = VIS_CFG.castReadout.contrast;
    if (!c.enabled) { if (this.pixels || this.pending) this.invalidate(); return; }
    const width = c.sampleWidth, height = Math.max(1, Math.min(c.maxSampleHeight, Math.round(width * world.height / world.width)));
    if (![width,height].every(n => Number.isSafeInteger(n) && n > 0 && n <= 512)
      || !Number.isFinite(now) || typeof createImageBitmap !== 'function') { this.invalidate(); return; }
    const size = [world.width,world.height,crest?.width,crest?.height,width,height].join(',');
    if (world !== this.source || crest !== this.crest || size !== this.sourceSize) {
      this.invalidate(); this.source = world; this.crest = crest; this.sourceSize = size;
    }
    if (this.pending) {
      // A failed/hung worker must not retain stale contrast or accumulate work.
      if (now - this.pending.started > 2000) this.fail(this.worker);
      return;
    }
    if (now < this.nextAt) return;
    const worker = this.sampler(); if (!worker) return;
    this.nextAt = now + c.intervalMs;
    const job: SampleJob = { id: ++this.sequence, generation: this.generation, started: now, width, height,
      imageBytes: (world.width * world.height + (crest ? crest.width * crest.height : 0)) * 4, owned: [] };
    this.pending = job;
    const current = () => this.worker === worker && this.pending === job && job.generation === this.generation;
    // Own each fulfilled bitmap immediately: cancellation or one failed sibling
    // releases it even if another GPU snapshot has not settled. Late bitmaps
    // close on arrival; ownership passes to the worker only after transfer.
    const snapshots = [world, ...(crest ? [crest] : [])].map(canvas => {
      let promise: Promise<ImageBitmap>;
      try { promise = createImageBitmap(canvas); } catch (error) { promise = Promise.reject(error); }
      return promise.then(image => { if (current()) job.owned.push(image); else image.close(); return image; });
    });
    void Promise.all(snapshots).then(images => {
      if (!current()) {
        this.releaseSnapshots(job);
        if (this.pending === job) this.pending = undefined;
        return;
      }
      worker.postMessage({ id: job.id, width, height, world: images[0], crest: images[1] } satisfies CastContrastRequest, images);
      job.owned.length = 0;
    }).catch(() => {
      if (current()) this.fail(worker);
      else {
        this.releaseSnapshots(job);
        if (this.pending === job) this.pending = undefined;
      }
    });
  }

  /** Normalized screen rectangle, identical for main and native crest pixels. */
  outline(rect: CombatRect, ink: string | readonly string[]): CastBarOutline | null {
    if (!this.pixels) return castBarOutline(ink,[]);
    const samples: number[] = [];
    for (const [dx,dy] of [[0,0],[1,0],[.5,.5],[0,1],[1,1]]) {
      const x = Math.floor((rect.x+rect.w*dx)*this.width), y = Math.floor((rect.y+rect.h*dy)*this.height);
      if (x<0 || y<0 || x>=this.width || y>=this.height) continue;
      const i = (y*this.width+x)*4;
      samples.push((.299*this.pixels[i]+.587*this.pixels[i+1]+.114*this.pixels[i+2])/255);
    }
    return castBarOutline(ink,samples);
  }
}
