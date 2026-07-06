// ---------------------------------------------------------------------------
// PASSIVE LAYOUT VALIDATOR — a boot-time guardrail for the tree's geometry.
//
// The tree grew large (151 nodes across two cluster bands). This catches the
// two ways a future node can break visibility: OVERLAP (two discs closer than
// their radii + padding) and OUT-OF-BOUNDS (a node poking past the 1000x1000
// viewBox). It WARNS, never throws — the engine still boots — so an authoring
// slip lights up the console instead of failing silently.
//
// It intentionally ignores overlaps between two LEGACY (pre-cluster) nodes:
// the original wedge skeleton has six exact boundary coincidences (each
// wedge's s4 sits on the neighbour's n2) that predate this expansion. We only
// police NEW content (clusters + exotic nodes) against everything, so a fresh
// cluster placed badly is caught immediately.
// ---------------------------------------------------------------------------

import { PASSIVE_NODES, type PassiveNode } from './passives';

const RADII: Record<PassiveNode['kind'], number> =
  { start: 13, small: 9, notable: 14, keystone: 17, attr: 11, vocation: 15 };

const PAD = 10;       // breathing room required between any two node edges
// The tree lives in a 6000×6000 space (the 6× expansion — room to grow for
// years; the panel auto-fits to node bounds and opens centred on the start).
const CENTER = 3000;
const HALF = 3000;
const MARGIN = 12;    // keep nodes this far inside the edge

/** A node introduced by the batch-8 expansion (cluster or exotic) or by a
 *  vocation mini-tree. Overlaps among purely-legacy nodes are pre-existing
 *  and deliberately not flagged. */
function isNew(id: string): boolean {
  return id.startsWith('cl_') || id.startsWith('voc_') || /_(pc|kb|df|pd)\d+$/.test(id);
}

/** Warn on any overlapping or out-of-bounds NEW passive node. Cheap O(n^2);
 *  runs once at boot via validateContent. Emits nothing when the tree is clean. */
export function validatePassiveLayout(warn: (msg: string) => void): void {
  const ns = Object.values(PASSIVE_NODES);
  for (let i = 0; i < ns.length; i++) {
    for (let j = i + 1; j < ns.length; j++) {
      const a = ns[i], b = ns[j];
      if (!isNew(a.id) && !isNew(b.id)) continue; // skip legacy-vs-legacy
      // DIFFERENT vocations deliberately share the star's central space — at
      // most one renders per character, so cross-vocation overlap is by design.
      // Same-vocation and vocation-vs-main-tree overlaps ARE still policed.
      if (a.vocation && b.vocation && a.vocation !== b.vocation) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const min = RADII[a.kind] + RADII[b.kind] + PAD;
      if (d < min) warn(`passive overlap: ${a.id}/${b.id} ${d.toFixed(1)} < ${min.toFixed(1)}`);
    }
  }
  for (const n of ns) {
    const r = RADII[n.kind];
    if (Math.abs(n.x - CENTER) + r > HALF - MARGIN || Math.abs(n.y - CENTER) + r > HALF - MARGIN) {
      warn(`passive out of bounds: ${n.id} (${n.x.toFixed(0)},${n.y.toFixed(0)})`);
    }
  }
}
