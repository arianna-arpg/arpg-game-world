// ---------------------------------------------------------------------------
// DETERMINISM — one seed reproduces one episode, bit for bit.
//
// The engine draws combat randomness from Math.random (levelgen already uses
// its own seeded Rng). For a sim episode we swap the GLOBAL Math.random for a
// mulberry32 stream seeded per episode, run, and restore. Same seed + same
// content ⇒ identical episode; N seeds ⇒ an honest distribution.
//
// The engine itself is untouched — determinism is a harness property, which
// keeps the game free to stay casually random everywhere else.
// ---------------------------------------------------------------------------

/** A standalone mulberry32 stream (for gear rolls etc. off the global). */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  if (s === 0) s = 0x9e3779b9;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Replace Math.random with a seeded stream. Returns the restore function —
 *  ALWAYS call it (try/finally) or the process keeps the deterministic tap. */
export function seedGlobalRandom(seed: number): () => void {
  const original = Math.random;
  const next = mulberry32(seed);
  // eslint-disable-next-line no-global-assign
  Math.random = next;
  return () => { Math.random = original; };
}

/** Derive a child seed from a base seed + lane (episode index, gear lane…). */
export function deriveSeed(base: number, lane: number): number {
  let h = (base ^ (lane * 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
