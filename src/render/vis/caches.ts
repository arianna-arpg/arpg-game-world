// ---------------------------------------------------------------------------
// THE CACHE STEWARD — every render cache, one ledger, shared trim moments.
//
// The visual fabric earns its frame rate from caches (sprite bakes, membrane
// skins, floor chunks, canopy slices, billow sprites, …). Left alone they
// all obey the same lifecycle: grow toward a cap, then HOLD FOREVER — sound
// for one zone, wasteful for a session. A long sitting walks dozens of
// biomes and the population saturates high (hundreds of live canvases);
// engines that keep a surface per canvas (and garbage collectors that walk
// what still holds them) degrade with exactly that population — the
// "lag accumulates until a refresh" profile.
//
// So: every cache REGISTERS here (module caches at load, renderer-owned
// instances at construction) with its own handlers, and the renderer calls
// the two natural boundaries where memory should come back:
//   'zone' — a zone swap: drop what was zone-local, shrink game-wide LRUs
//            to their post-swap floor (levers in VIS_CFG.memory);
//   'run'  — a new World (menu → new game, run end): release everything —
//            the next run re-bakes what it actually uses.
// A cache with nothing to do at a boundary simply omits that handler.
// Policy lives WITH each cache (it knows what is safe to drop); the dials
// live in visConfig; this module only keeps the ledger and fans out.
//
// Census (`visCacheStats`) is the QA hook: the leak rig reads it live, and
// any future cache joins the report by registering — no per-cache wiring
// anywhere else.
// ---------------------------------------------------------------------------

export interface VisCacheReg {
  /** Short stable id ('sprites', 'creepSkins', …) for census rows. */
  id: string;
  /** Live entry count (census). */
  count: () => number;
  /** Approximate live bytes, when the cache can say (census). */
  bytes?: () => number;
  /** A zone swap happened — drop zone-local entries / shrink to floor. */
  onZoneSwap?: () => void;
  /** A new run/World — release everything rebuildable. */
  onRunSwap?: () => void;
}

const registry: VisCacheReg[] = [];

/** Register a cache. Module-scope caches call this at load; instance caches
 *  (ground, canopy, snow, …) at construction. Re-registering an id replaces
 *  the old row (HMR re-runs module bodies). */
export function registerVisCache(reg: VisCacheReg): void {
  const at = registry.findIndex(r => r.id === reg.id);
  if (at >= 0) registry[at] = reg;
  else registry.push(reg);
}

/** Fan a boundary out to every registered cache. */
export function trimVisCaches(moment: 'zone' | 'run'): void {
  for (const r of registry) {
    try {
      if (moment === 'zone') r.onZoneSwap?.();
      else { r.onZoneSwap?.(); r.onRunSwap?.(); }
    } catch {
      // A cache that throws mid-trim must never break the frame; it will
      // simply trim again at the next boundary.
    }
  }
}

/** Census for QA rigs and the dev panel. */
export function visCacheStats(): { id: string; n: number; mb?: number }[] {
  return registry.map(r => {
    const row: { id: string; n: number; mb?: number } = { id: r.id, n: r.count() };
    const b = r.bytes?.();
    if (b !== undefined) row.mb = +(b / 1048576).toFixed(2);
    return row;
  });
}
