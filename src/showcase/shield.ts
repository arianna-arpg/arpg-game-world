// ---------------------------------------------------------------------------
// THE SHOWCASE SHIELD — installed FIRST in the skill-showcase realm (before
// any game module evaluates; this file imports nothing). The showcase engine
// runs a real World in a same-origin frame, and the World saves the account
// on its own at many seams; this realm shares the player's origin, so its
// storage and its /__save endpoint ARE the player's. The shield makes the
// realm write nowhere: an in-memory Storage shadows localStorage (reads come
// back empty, so a showcase never sees the player's saves either), and every
// /__save request (fetch or beacon) is refused. engine.ts also flips the
// persistence latch (suppressSaves) — two locks, by design.
// ---------------------------------------------------------------------------

function memoryStorage(): Storage {
  const bag = new Map<string, string>();
  return {
    getItem: (k: string): string | null => (bag.has(k) ? bag.get(k)! : null),
    setItem: (k: string, v: string): void => { bag.set(k, String(v)); },
    removeItem: (k: string): void => { bag.delete(k); },
    clear: (): void => { bag.clear(); },
    key: (i: number): string | null => [...bag.keys()][i] ?? null,
    get length(): number { return bag.size; },
  } as Storage;
}

const SAVE_PATH = /\/__save\//;
const shielded = memoryStorage(), shieldedSession = memoryStorage();
Object.defineProperty(window, 'localStorage', { configurable: true, get: () => shielded });
Object.defineProperty(window, 'sessionStorage', { configurable: true, get: () => shieldedSession });

const realFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (SAVE_PATH.test(url)) return Promise.resolve(new Response('{}', { status: 404 }));
  return realFetch(input, init);
};
const realBeacon = navigator.sendBeacon?.bind(navigator);
navigator.sendBeacon = (url: string | URL, data?: BodyInit | null): boolean =>
  SAVE_PATH.test(String(url)) ? true : (realBeacon ? realBeacon(url, data) : false);

export const SHOWCASE_SHIELDED = true;
