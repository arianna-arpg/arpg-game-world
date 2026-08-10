// ---------------------------------------------------------------------------
// PASSIVE LAYOUT VALIDATOR — a boot-time guardrail for the tree's geometry.
//
// The tree grew large (~1100 nodes once the vocation mini-trees merge in).
// This catches the three ways a future node can break the tree: OVERLAP (two
// discs closer than their radii + padding), OUT-OF-BOUNDS (a node poking past
// the 6000x6000 space), and ORPHANS (a node no allocation walk could ever
// reach). It WARNS, never throws — the engine still boots — so an authoring
// slip lights up the console instead of failing silently.
//
// The WHOLE tree is policed. (An earlier version skipped legacy-vs-legacy
// overlaps for "six exact boundary coincidences" in the original wedge
// skeleton; re-measuring found every one gone except ironturn/node_3, which
// has been re-seated — so the escape hatch is deleted, not inherited.)
// ---------------------------------------------------------------------------

import { PASSIVE_ADJACENCY, PASSIVE_NODES, type PassiveNode } from './passives';
import { PASSIVE_REALMS, realmOf } from './passiveRealms';

const RADII: Record<PassiveNode['kind'], number> =
  { start: 13, small: 9, notable: 14, keystone: 17, attr: 11, vocation: 15, choice: 15 };

const PAD = 10;       // breathing room required between any two node edges
// The tree lives in a 6000×6000 space (the 6× expansion — room to grow for
// years; the panel auto-fits to node bounds and opens centred on the start).
const CENTER = 3000;
const HALF = 3000;
const MARGIN = 12;    // keep nodes this far inside the edge

/** Warn on any overlapping, out-of-bounds, or unreachable passive node.
 *  Cheap — one O(n^2) pair sweep plus an O(n+e) BFS — and runs once at boot
 *  via validateContent. Emits nothing when the tree is clean. */
export function validatePassiveLayout(warn: (msg: string) => void): void {
  const ns = Object.values(PASSIVE_NODES);
  for (let i = 0; i < ns.length; i++) {
    for (let j = i + 1; j < ns.length; j++) {
      const a = ns[i], b = ns[j];
      // DIFFERENT vocations deliberately share the star's central space — at
      // most one renders per character, so cross-vocation overlap is by design.
      // Same-vocation and vocation-vs-main-tree overlaps ARE still policed.
      if (a.vocation && b.vocation && a.vocation !== b.vocation) continue;
      // DIFFERENT realms render on different TABS — coordinate spaces are
      // per-realm by design; only same-realm overlaps are geometry bugs.
      if ((a.realm ?? 'tree') !== (b.realm ?? 'tree')) continue;
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
  // REACHABILITY — an unreachable node is invisible-but-shipped content: it
  // renders and costs data, and nobody can ever allocate it. Seeds are the
  // nodes the game hands a character FREE, derived from the registry (never a
  // hardcoded id): every kind 'start' (one is allocated at creation and all
  // nine star ways may be pathed through), every kind 'vocation' (the crest
  // comes with the earned vocation), and every realm's `roots` list
  // (auto-allocated when the realm opens). One BFS over PASSIVE_ADJACENCY —
  // the SAME bidirectional graph allocateNode walks, so nodes with `links: []`
  // that are linked TO still count reached — then covers everything any
  // allocation chain could ever take. Nodes of a 'free'-adjacency realm
  // (Pantheon shrines) are exempt: there every node is its own entry point.
  const rootIds = new Set<string>();
  for (const r of Object.values(PASSIVE_REALMS)) for (const id of r.roots ?? []) rootIds.add(id);
  const reached = new Set<string>();
  const queue: string[] = [];
  for (const n of ns) {
    if (n.kind === 'start' || n.kind === 'vocation' || rootIds.has(n.id)) {
      reached.add(n.id); queue.push(n.id);
    }
  }
  while (queue.length) {
    const cur = queue.pop()!;
    for (const nb of PASSIVE_ADJACENCY[cur] ?? []) {
      if (!reached.has(nb)) { reached.add(nb); queue.push(nb); }
    }
  }
  for (const n of ns) {
    if (reached.has(n.id) || realmOf(n)?.adjacency === 'free') continue;
    warn(`passive orphan: ${n.id} — unreachable from every start/crest/realm root`);
  }
}
