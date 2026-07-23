// ---------------------------------------------------------------------------
// DOODAD FAMILIES — scoped invalidation for doodad-keyed caches, as an open
// registry (the registerTrapEffect pattern).
//
// Several expensive derivations cache against the doodad list and re-derive
// when it changes: the convex nav grid, the canopy veil index, the light
// clusters, the ground bake gather. They each care about a SLICE of the
// list — but the one shared `doodadsRev` made every in-place mutation (a
// drying pool's radius step, ~10-30/sec in churn zones) rebuild ALL of them
// every frame: the measured accumulate-then-jitter cascade.
//
// A consumer REGISTERS the predicate that defines its slice (the exact
// filter it derives with — perfect coupling by construction) and keys its
// cache on World.doodadFamilyRev(id) beside the usual (identity, length)
// pair. Mutation sites that KNOW their doodad pass it to
// markDoodadsChanged(d) and only the families that doodad belongs to bump;
// a no-arg call (any site that doesn't know, or predates the registry)
// bumps every family — the safe default. Pushes/splices stay caught by the
// length key regardless, so an unreported site can never leave a cache
// stale.
//
// Registration is import-time (render modules register theirs when they
// load; a headless sim simply never registers render families and pays
// nothing). The epoch lets a World re-seat its per-family counters when a
// family arrives after boot.
// ---------------------------------------------------------------------------

export type DoodadFamilyPredicate = (kind: string) => boolean;

const families: { id: string; test: DoodadFamilyPredicate }[] = [];
const kindBits = new Map<string, number>();
let epoch = 0;

/** Register a family (idempotent by id — twin boots and HMR re-register
 *  harmlessly). Returns the family's bit index. */
export function registerDoodadFamily(id: string, test: DoodadFamilyPredicate): number {
  const at = families.findIndex(f => f.id === id);
  if (at >= 0) return at;
  families.push({ id, test });
  kindBits.clear();
  epoch++;
  return families.length - 1;
}

/** Which families does this kind belong to (bitmask, memoized per kind)? */
export function doodadFamilyBits(kind: string): number {
  let b = kindBits.get(kind);
  if (b === undefined) {
    b = 0;
    for (let i = 0; i < families.length; i++) if (families[i].test(kind)) b |= 1 << i;
    kindBits.set(kind, b);
  }
  return b;
}

export function doodadFamilyIndex(id: string): number {
  return families.findIndex(f => f.id === id);
}

export function doodadFamilyCount(): number { return families.length; }

/** Bumps when the family SET changes (late registration) — consumers of the
 *  per-World counters re-seat on it. */
export function doodadFamilyEpoch(): number { return epoch; }
