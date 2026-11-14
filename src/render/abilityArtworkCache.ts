/** One bounded decoded-artwork owner for DOM, hotbar and loading preparation.
 * Keep small raster sources, not 96 full-size website paintings in memory. */
export const ABILITY_ARTWORK_CACHE = { pixels: 192, limit: 96, concurrent: 8, timeoutMs: 8000 };
const ready = new Map<string, HTMLCanvasElement>();
const failed = new Set<string>();
type Request = { promise: Promise<HTMLCanvasElement | undefined>; resolve: (image?: HTMLCanvasElement) => void };
const pending = new Map<string, Request>();
const queue: string[] = [];
let active = 0, loads = 0, decodes = 0, peakActive = 0, evictions = 0;

export function peekAbilityArtwork(url?: string): HTMLCanvasElement | undefined {
  if (!url) return;
  const image = ready.get(url);
  if (image) { ready.delete(url); ready.set(url, image); }
  return image;
}
export function abilityArtworkFailed(url: string): boolean { return failed.has(url); }

/** Duplicate consumers share the same request, including queued requests. */
export function loadAbilityArtwork(url: string): Promise<HTMLCanvasElement | undefined> {
  const image = peekAbilityArtwork(url);
  if (image || failed.has(url) || typeof Image === 'undefined') return Promise.resolve(image);
  const existing = pending.get(url);
  if (existing) return existing.promise;
  let resolve!: Request['resolve'];
  const promise = new Promise<HTMLCanvasElement | undefined>(done => { resolve = done; });
  pending.set(url, { promise, resolve }); queue.push(url); pump();
  return promise;
}
function pump(): void {
  while (active < ABILITY_ARTWORK_CACHE.concurrent && queue.length) {
    const url = queue.shift()!, request = pending.get(url)!;
    active++; loads++; peakActive = Math.max(peakActive, active);
    const image = new Image(); image.decoding = 'async';
    let settled = false;
    const finish = (surface?: HTMLCanvasElement): void => {
      if (settled) return;
      settled = true; clearTimeout(timeout);
      image.onload = image.onerror = null; image.removeAttribute('src');
      if (surface) {
        ready.set(url, surface);
        while (ready.size > ABILITY_ARTWORK_CACHE.limit) { ready.delete(ready.keys().next().value!); evictions++; }
      } else failed.add(url);
      pending.delete(url); active--; request.resolve(surface); pump();
    };
    const timeout = setTimeout(() => finish(), ABILITY_ARTWORK_CACHE.timeoutMs);
    image.onerror = () => finish();
    image.onload = () => { void image.decode().then(() => {
      if (settled) return;
      if (!image.naturalWidth || !image.naturalHeight) { finish(); return; }
      const surface = document.createElement('canvas');
      surface.width = surface.height = ABILITY_ARTWORK_CACHE.pixels;
      const ctx = surface.getContext('2d')!;
      // Match the existing square object-fit:cover treatment, without retaining
      // the large decoded source after this one-time downsample.
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2,
        side, side, 0, 0, surface.width, surface.height);
      decodes++; finish(surface);
    }).catch(() => finish()); };
    image.src = url;
  }
}
/** Rendering never awaits; newly encountered art completes through the queue. */
export function abilityArtworkImage(url?: string): HTMLCanvasElement | undefined {
  const image = peekAbilityArtwork(url);
  if (!image && url && !failed.has(url)) void loadAbilityArtwork(url);
  return image;
}
/** Read-only diagnostics for the real client regression/performance harness. */
export function abilityArtworkCacheStats() {
  return { loads, decodes, active, queued: queue.length, peakActive, evictions, retained: ready.size,
    retainedBytes: ready.size * ABILITY_ARTWORK_CACHE.pixels ** 2 * 4, failed: failed.size };
}
