// ---------------------------------------------------------------------------
// Seeded randomness — the procedural-generation primitive.
//
// Everything that builds a level draws from one Rng instance, so a single
// seed number reproduces an entire layout. Static zones roll a fresh seed
// per visit (their terrain reshuffles); GENERATED zones carry their seed in
// their definition, so an uncharted zone you discovered keeps its layout
// when you come back — the world you explored stays the world you explored.
// ---------------------------------------------------------------------------

export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
    if (this.s === 0) this.s = 0x9e3779b9;
  }

  /** Exact internal cursor, read without advancing the stream. A cursor is
   * not a seed: zero is legal and must survive restoration unchanged. */
  snapshot(): number { return this.s; }

  static fromState(state: number): Rng {
    const nativeRngState = checkedNativeRngState(state);
    const rng = new Rng(1);
    rng.s = nativeRngState;
    return rng;
  }

  /** Next float in [0, 1) — mulberry32. */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [lo, hi). */
  range(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }

  /** Integer in [lo, hi] inclusive. */
  int(lo: number, hi: number): number {
    return Math.floor(this.range(lo, hi + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Weighted roll over { …, weight } entries. */
  weighted<T extends { weight: number }>(table: readonly T[]): T {
    let total = 0;
    for (const e of table) total += e.weight;
    let roll = this.range(0, total);
    for (const e of table) {
      roll -= e.weight;
      if (roll <= 0) return e;
    }
    return table[table.length - 1];
  }
}

/** A fresh unpredictable seed (for per-visit layouts and new zone identities). */
export function rollSeed(): number {
  return (Math.random() * 4294967296) >>> 0;
}

/** Run `fn` with Math.random SWAPPED for a seeded mulberry32 stream, then
 *  restore the true die — whatever happens (try/finally). THE OFF-STREAM
 *  LAW: a system whose rolls must be a pure function of a seed (the
 *  counters' per-beat shelves; the sim harness) borrows the global die for
 *  exactly its own span and hands it back untouched, so no other system's
 *  stream ever shifts under it (the reseed-per-world trap, made
 *  structurally impossible at this seam). Helpers that read Math.random
 *  transitively (rand/randInt/chance/pick, the item roller) all follow the
 *  swap for free — no rng threading through their signatures. */
export function withSeededRandom<T>(seed: number, fn: () => T): T {
  const rng = new Rng(seed);
  const real = Math.random;
  Math.random = () => rng.next();
  try {
    return fn();
  } finally {
    Math.random = real;
  }
}

/** The saved cursor domain is lossless uint32, including zero; never coerce a
 * malformed value or reinterpret a cursor through constructor seed policy. */
function checkedNativeRngState(nativeRngState: number): number {
  if (!Number.isInteger(nativeRngState) || nativeRngState < 0 || nativeRngState > 0xffffffff || Object.is(nativeRngState, -0))
    throw Error('Invalid native Rng cursor');
  return nativeRngState;
}

const nativeRngScopes = new WeakSet<Rng>();
/** Borrow an existing stream synchronously. Different streams may nest; the
 * same stream cannot re-enter. Captured global-die callbacks expire at return.
 * Exceptions retain consumed draws and restore the outer die in finally.
 * This does not cancel arbitrary asynchronous work scheduled by a callback:
 * callers must keep all work synchronous; async/generator functions and thenables refuse. */
export function withRngRandom<T>(rng: Rng, fn: () => T): T {
  if (!(rng instanceof Rng) || typeof fn !== 'function') throw Error('Invalid native random scope');
  if (Object.prototype.toString.call(fn) === '[object AsyncFunction]'
    || Object.prototype.toString.call(fn) === '[object AsyncGeneratorFunction]'
      || Object.prototype.toString.call(fn) === '[object GeneratorFunction]') throw Error('Native random scope must be synchronous');
  if (nativeRngScopes.has(rng)) throw Error('Native random stream is already scoped');
  const outer = Math.random;
  let active = true;
  const draw = () => {
    if (!active || Math.random !== draw) throw Error('Native random callback escaped its active scope');
    return rng.next();
  };
  nativeRngScopes.add(rng);
  Math.random = draw;
  try {
    const result = fn();
    if (result !== null && (typeof result === 'object' || typeof result === 'function') && 'then' in result)
      throw Error('Native random scope cannot return asynchronous work');
    if (Math.random !== draw) throw Error('Native random scope changed its global die');
    return result;
  } finally {
    active = false;
    Math.random = outer;
    nativeRngScopes.delete(rng);
  }
}
