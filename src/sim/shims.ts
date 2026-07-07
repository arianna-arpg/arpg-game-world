// ---------------------------------------------------------------------------
// HEADLESS SHIMS — the minimum browser surface the ENGINE layer touches when
// it runs outside a browser (Node, via tsx). The engine itself is DOM-free by
// design; the only browser APIs on its call paths are:
//
//   - window.localStorage   (meta/persistence + meta/character caches — every
//                            call site is try/caught, but an in-memory Storage
//                            keeps saves working within one sim process)
//   - fetch('/__save/…')    (meta/persistence diskPut/diskGet — relative URLs
//                            are invalid in Node; replaced with an inert stub)
//
// DELIBERATELY NOT SHIMMED: document, canvas, requestAnimationFrame, Audio.
// If a sim run ever crashes reaching for those, that's an engine-layer purity
// regression we WANT to hear about loudly — do not paper over it here.
//
// Installing is idempotent and a no-op in a real browser (window exists).
// ---------------------------------------------------------------------------

/** A tiny in-memory Storage — enough for the persistence layer's get/set. */
function makeMemoryStorage(): Storage {
  const bag = new Map<string, string>();
  const storage = {
    getItem: (k: string): string | null => (bag.has(k) ? bag.get(k)! : null),
    setItem: (k: string, v: string): void => { bag.set(k, String(v)); },
    removeItem: (k: string): void => { bag.delete(k); },
    clear: (): void => { bag.clear(); },
    key: (i: number): string | null => [...bag.keys()][i] ?? null,
    get length(): number { return bag.size; },
  };
  return storage as Storage;
}

let installed = false;

/** Install the headless shims (idempotent; harmless in a browser). Call before
 *  any engine entry point that can touch persistence — makeSimWorld does. */
export function installHeadlessShims(): void {
  if (installed) return;
  installed = true;
  const g = globalThis as Record<string, unknown>;
  if (typeof window === 'undefined') {
    const storage = makeMemoryStorage();
    g.window = { localStorage: storage };
    g.localStorage = storage;
    // The persistence layer's disk mirror fires relative-URL fetches that a
    // browser routes to the Vite/launcher /__save endpoints. Headless, there
    // is no disk mirror — answer every request with a quiet 404 so the
    // localStorage fallback (already the in-memory bag above) is used.
    g.fetch = async (): Promise<{ ok: boolean; status: number; json(): Promise<null> }> =>
      ({ ok: false, status: 404, json: async () => null });
  }
}
