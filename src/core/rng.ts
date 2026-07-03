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
