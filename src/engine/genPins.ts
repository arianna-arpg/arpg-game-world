// ---------------------------------------------------------------------------
// GENERATION PINS — the generation ids the ENGINE names by hand.
//
// THE ORPHAN CENSUS (data/validate.ts) proves that every registered formation,
// cluster, landmark, composition, layout and liquid is REACHABLE — it walks the
// data that names them (stamp rows, roll rows, allowedLayouts weights, liquid
// params) and warns about whatever nothing names. A handful of references are
// not data, though: a port's guaranteed coast, the recipe default a missing
// layoutParam falls back to, the arena a quest forces. Those are real
// references the census cannot see, and a census that cannot see them lies
// twice — it names live rows as dead, and its silence stops meaning anything.
//
// A pin is how such a site declares itself, WITHOUT letting the declaration
// drift from the truth: registerGenPin hands the id straight back, so the call
// site READS its pin instead of repeating a literal beside it. Declare once,
// use what it returns, and there is no way to pin an id nobody uses — the
// reference and its witness are the same expression.
//
// Pins are for ENGINE literals only. Anything a data file can name (a tileset
// roll, a biome weight, a landmark's liquid) belongs in the data, where the
// census reads it for free.
// ---------------------------------------------------------------------------

/** The generation registries the census sweeps (and pins may name). */
export type GenRegistry =
  | 'formation' | 'cluster' | 'landmark' | 'composition' | 'layout' | 'liquid';

export interface GenPin {
  registry: GenRegistry;
  id: string;
  /** Why the engine names it by hand — printed by nothing, read by humans. */
  why: string;
}

const PINS: GenPin[] = [];

/** Declare an engine-named generation id, and hand it straight back so the
 *  call site can USE the pin (never a literal beside it). Idempotent. */
export function registerGenPin<T extends string>(registry: GenRegistry, id: T, why: string): T {
  if (!PINS.some(p => p.registry === registry && p.id === id)) PINS.push({ registry, id, why });
  return id;
}

/** Every declared pin — the orphan census folds these in as references. */
export function genPins(): readonly GenPin[] { return PINS; }
