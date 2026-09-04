// ---------------------------------------------------------------------------
// THE SKILL-TREE GRAPH (skill-mode trees — docs/design/skill-modes.md §3, the
// GRAPH GRAMMAR of 2026-09-04): ONE resolver folds an authored SkillTreeSpec
// into the graph every consumer reads — the spend predicate and the loader's
// validation seam (engine/skills.ts), the pull-out pane's drawing
// (ui/panels.ts refreshSkillTree), the sim's census limbs (sim/compat.ts)
// and boot validation (data/validate.ts).
//
// TWO AUTHORING FORMS, ONE GRAPH:
//   · THE GRAPH FORM — `SkillTreeSpec.nodes`: every node names its
//     prerequisites (`links` — ANY one spent opens it, the passive tree's
//     adjacency law; none = it hangs off the ROOT), its rivals (`excludes` —
//     the hard lock at NODE grain, symmetric by construction: spending one
//     seals the other and everything only reachable through it), its
//     `ranks` (a node that takes several points, each re-applying its
//     payload), an optional visual `kind`, and optional layout pins.
//   · THE SUGAR FORM — the settled 2×3+1 `branches` + `neutral` shape: each
//     branch folds to a rung CHAIN hanging off the root, the rung-1 nodes
//     exclude each other (the fork), the neutral is a lock-free root child.
//     Byte-identical semantics to the M1 fabric (probe_skillmodes section N
//     pins the refusal words and the loader's verdicts).
//
// THE LAWS:
//   · REACHABILITY IS THE LOCK — a node is SEALED when it is excluded by a
//     spent node, or when every path from the root to it runs through a
//     sealed node (treeSealedSet). No branch state is stored: the lock is
//     derived from spent ids, so authored renames orphan-drop for free.
//   · THE LIMB — a root child that forks (carries `excludes`) names a LIMB:
//     everything hanging under it belongs to that identity. Limbs are the
//     `skill@limb` census hosts, the tooltip's "· The Duelist" line, the
//     bar pip's commitment, and the sealed path's NAME in refusal words.
//   · LAYOUT IS DERIVED UNLESS PINNED — a radial layout from the root
//     (TREE_LAYOUT_CFG): fork limbs fan across the upper arc by subtree
//     weight, lock-free leaves hang below, chains run as straight rays,
//     sub-forks fan inside their limb's wedge; `x`/`y` pins override a
//     node (its children fan from the pinned bearing). Pure and
//     deterministic — the probe pins it without a DOM.
//   · MEMOIZED PER SPEC — the graph is a pure function of the spec object
//     (a WeakMap: registry defs fold once; synthetic defs fold their own).
// ---------------------------------------------------------------------------

import type { SkillDef, SkillTreeBranch, SkillTreeKind, SkillTreeNode, SkillTreeSpec } from './skills';

/** THE LAYOUT DIALS (tree units; the root sits at 0,0, y grows DOWN). */
export const TREE_LAYOUT_CFG = {
  /** Radius per depth ring. */
  ring: 120,
  /** The upper arc (degrees, −90 = straight up) fork limbs share by weight. */
  forkArc: [-210, 30] as const,
  /** The lower arc lock-free root children (the neutrals) hang across. */
  freeArc: [30, 150] as const,
  /** The smallest drawn box — tiny trees keep readable node sizes. */
  minBox: { w: 560, h: 420 },
  /** Box padding past the outermost node/label. */
  pad: 48,
  /** Node radii by kind (+ the root's face). */
  radius: { root: 20, minor: 9, major: 14, keystone: 17 } as Record<'root' | SkillTreeKind, number>,
};

export interface TreeGraphNode {
  id: string;
  /** The authored row — payload (over/mods/graft), name, description. */
  node: SkillTreeNode;
  /** Prerequisite ids (ANY-of). Empty = hangs off the root. */
  links: string[];
  /** Symmetric mutual exclusion (both directions folded in). */
  excludes: Set<string>;
  /** Max points this node takes (≥ 1). */
  ranks: number;
  /** BFS hops from the root (root children = 1). */
  depth: number;
  /** The LIMB this node hangs under (undefined = lock-free ground). */
  limbId?: string;
  /** Layout-tree children (first-parent BFS, authored order). */
  children: string[];
  x: number;
  y: number;
  kind: SkillTreeKind;
}

export interface TreeGraph {
  nodes: Map<string, TreeGraphNode>;
  /** Root-reachable ids in deterministic BFS order (authored order among
   *  siblings) — the pane's draw order and the census's walk order. */
  order: string[];
  rootChildren: string[];
  /** The LIMBS as branch views: sugar trees answer their AUTHORED branch
   *  objects (identity intact for every `.id` comparison); graph-form
   *  trees synthesize one per fork root (id/name/description = the fork
   *  node's, rungs = the limb in BFS order). */
  limbs: SkillTreeBranch[];
  /** limbId → the fork node at its root. */
  limbRoots: Map<string, string>;
  /** Duplicate ids the fold skipped (first row wins) — validation names them. */
  dupes: string[];
  /** The fitted drawing box (the tree's bounds, padded; never below minBox). */
  box: { minX: number; minY: number; w: number; h: number };
}

const GRAPH_CACHE = new WeakMap<SkillTreeSpec, TreeGraph>();

/** THE ONE RESOLVER: the def's tree as a graph (undefined = no tree). */
export function treeGraph(def: SkillDef): TreeGraph | undefined {
  const spec = def.tree;
  if (!spec) return undefined;
  let g = GRAPH_CACHE.get(spec);
  if (!g) {
    g = buildGraph(spec);
    GRAPH_CACHE.set(spec, g);
  }
  return g;
}

interface RawRow {
  node: SkillTreeNode;
  links: string[];
  excludes: string[];
  kind?: SkillTreeKind;
  /** The limb id a fork root names (sugar: the BRANCH id; graph form: the node id). */
  limbId?: string;
  /** The authored branch object a sugar fork root stands for. */
  branch?: SkillTreeBranch;
}

function buildGraph(spec: SkillTreeSpec): TreeGraph {
  // 1. THE SUGAR FOLD + the explicit list → one row list in authored order.
  const rows: RawRow[] = [];
  const branches = spec.branches ?? [];
  const forkIds = branches.map(b => b.rungs[0]?.id).filter((id): id is string => !!id);
  for (const b of branches) {
    b.rungs.forEach((n, k) => {
      const last = b.rungs.length - 1;
      rows.push({
        node: n,
        links: [...(k === 0 ? [] : [b.rungs[k - 1].id]), ...(n.links ?? [])],
        excludes: [...(k === 0 ? forkIds.filter(id => id !== n.id) : []), ...(n.excludes ?? [])],
        kind: n.kind ?? (k === 0 ? 'major' : k === last && last > 0 ? 'keystone' : 'minor'),
        limbId: k === 0 ? b.id : undefined,
        branch: k === 0 ? b : undefined,
      });
    });
  }
  if (spec.neutral) {
    const n = spec.neutral;
    rows.push({ node: n, links: [...(n.links ?? [])], excludes: [...(n.excludes ?? [])], kind: n.kind ?? 'minor' });
  }
  for (const n of spec.nodes ?? []) {
    rows.push({ node: n, links: [...(n.links ?? [])], excludes: [...(n.excludes ?? [])], kind: n.kind });
  }

  // 2. Index — first row wins on a duplicate id; validation names the dupe.
  const nodes = new Map<string, TreeGraphNode>();
  const dupes: string[] = [];
  const forkLimb = new Map<string, string>();
  const forkBranch = new Map<string, SkillTreeBranch>();
  for (const r of rows) {
    const id = r.node.id;
    if (nodes.has(id)) { dupes.push(id); continue; }
    nodes.set(id, {
      id, node: r.node,
      links: r.links.filter((l, i, arr) => l !== id && arr.indexOf(l) === i),
      excludes: new Set(r.excludes.filter(e => e !== id)),
      ranks: Math.max(1, Math.floor(r.node.ranks ?? 1)),
      depth: 0, children: [], x: 0, y: 0,
      kind: r.kind ?? 'minor',
    });
    if (r.limbId) forkLimb.set(id, r.limbId);
    if (r.branch) forkBranch.set(id, r.branch);
  }
  // 3. Symmetric exclusion.
  for (const gn of nodes.values()) {
    for (const ex of gn.excludes) nodes.get(ex)?.excludes.add(gn.id);
  }
  // 4. BFS from the root: depth, layout parent (first reach), children in
  //    authored order, the deterministic order.
  const all = [...nodes.values()];
  const rootChildren = all.filter(n => n.links.length === 0).map(n => n.id);
  const order: string[] = [];
  const seen = new Set<string>(rootChildren);
  const queue = [...rootChildren];
  for (const id of rootChildren) nodes.get(id)!.depth = 1;
  while (queue.length) {
    const id = queue.shift()!;
    const gn = nodes.get(id)!;
    order.push(id);
    for (const n of all) {
      if (seen.has(n.id) || !n.links.includes(id)) continue;
      seen.add(n.id);
      n.depth = gn.depth + 1;
      gn.children.push(n.id);
      queue.push(n.id);
    }
  }
  // 5. Limbs: a root child that forks names a limb; children inherit.
  const limbRoots = new Map<string, string>();
  for (const id of rootChildren) {
    const gn = nodes.get(id)!;
    if (gn.excludes.size === 0) continue;
    const limbId = forkLimb.get(id) ?? id;
    gn.limbId = limbId;
    limbRoots.set(limbId, id);
    if (!forkLimb.has(id) && !gn.node.kind) gn.kind = 'major';
  }
  for (const id of order) {
    const gn = nodes.get(id)!;
    for (const c of gn.children) {
      const cn = nodes.get(c)!;
      if (cn.limbId === undefined) cn.limbId = gn.limbId;
    }
  }
  const limbs: SkillTreeBranch[] = [];
  for (const [limbId, rootId] of limbRoots) {
    const authored = forkBranch.get(rootId);
    if (authored) { limbs.push(authored); continue; }
    const root = nodes.get(rootId)!;
    limbs.push({
      id: limbId, name: root.node.name, description: root.node.description,
      rungs: order.filter(id => nodes.get(id)!.limbId === limbId).map(id => nodes.get(id)!.node),
    });
  }
  // 6. Layout.
  layoutGraph(nodes, rootChildren);
  const box = fitBox(nodes);
  return { nodes, order, rootChildren, limbs, limbRoots, dupes, box };
}

// --- layout -----------------------------------------------------------------

const DEG = Math.PI / 180;
const round1 = (v: number): number => Math.round(v * 10) / 10;

function layoutGraph(nodes: Map<string, TreeGraphNode>, rootChildren: string[]): void {
  const weightMemo = new Map<string, number>();
  const weight = (id: string): number => {
    const memo = weightMemo.get(id);
    if (memo !== undefined) return memo;
    const gn = nodes.get(id)!;
    const w = gn.children.length ? gn.children.reduce((s, c) => s + weight(c), 0) : 1;
    weightMemo.set(id, w);
    return w;
  };
  const place = (id: string, angleDeg: number, spanDeg: number): void => {
    const gn = nodes.get(id)!;
    const pinned = gn.node.x !== undefined && gn.node.y !== undefined;
    if (pinned) {
      gn.x = gn.node.x!; gn.y = gn.node.y!;
      // Children fan from the PINNED bearing (an author who pins a node
      // moved its whole limb's direction, not just the one dot).
      angleDeg = Math.atan2(gn.y, gn.x) / DEG;
    } else {
      const r = TREE_LAYOUT_CFG.ring * gn.depth;
      gn.x = round1(Math.cos(angleDeg * DEG) * r);
      gn.y = round1(Math.sin(angleDeg * DEG) * r);
    }
    const kids = gn.children;
    if (!kids.length) return;
    const total = kids.reduce((s, c) => s + weight(c), 0);
    let cursor = angleDeg - spanDeg / 2;
    for (const c of kids) {
      const s = spanDeg * weight(c) / total;
      place(c, cursor + s / 2, s);
      cursor += s;
    }
  };
  const upper = rootChildren.filter(id => {
    const gn = nodes.get(id)!;
    return gn.children.length > 0 || gn.excludes.size > 0;
  });
  const lower = rootChildren.filter(id => !upper.includes(id));
  if (!upper.length) {
    // Nothing forks and nothing deepens — a plain ring of leaves from the top.
    rootChildren.forEach((id, i) => place(id, -90 + (360 / rootChildren.length) * i, 360 / rootChildren.length));
    return;
  }
  const [a0, a1] = TREE_LAYOUT_CFG.forkArc;
  const total = upper.reduce((s, id) => s + weight(id), 0);
  let cursor = a0;
  for (const id of upper) {
    const s = (a1 - a0) * weight(id) / total;
    place(id, cursor + s / 2, s);
    cursor += s;
  }
  const [f0, f1] = TREE_LAYOUT_CFG.freeArc;
  lower.forEach((id, i) => place(id, f0 + (f1 - f0) * (i + 1) / (lower.length + 1), (f1 - f0) / (lower.length + 1)));
}

function fitBox(nodes: Map<string, TreeGraphNode>): TreeGraph['box'] {
  // Bounds over the root (with its label), every node (with its radius and
  // its label beneath), padded, then widened to the minimum box about the
  // bounds' own centre — an asymmetric tree fills its frame instead of
  // leaving the root's far side empty.
  const R = TREE_LAYOUT_CFG.radius;
  const LABEL = 16;
  let minX = -R.root, maxX = R.root, minY = -R.root, maxY = R.root + LABEL;
  for (const gn of nodes.values()) {
    const r = R[gn.kind];
    minX = Math.min(minX, gn.x - r); maxX = Math.max(maxX, gn.x + r);
    minY = Math.min(minY, gn.y - r); maxY = Math.max(maxY, gn.y + r + LABEL);
  }
  const pad = TREE_LAYOUT_CFG.pad;
  const w = Math.max(maxX - minX + pad * 2, TREE_LAYOUT_CFG.minBox.w);
  const h = Math.max(maxY - minY + pad * 2, TREE_LAYOUT_CFG.minBox.h);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return { minX: round1(cx - w / 2), minY: round1(cy - h / 2), w: round1(w), h: round1(h) };
}

// --- reads ------------------------------------------------------------------

/** Root-child ids (spendable from the milestone with no prerequisite). */
export function treeRootChildren(def: SkillDef): string[] {
  return treeGraph(def)?.rootChildren ?? [];
}

/** Every limb as a branch view (see TreeGraph.limbs). */
export function treeLimbs(def: SkillDef): SkillTreeBranch[] {
  return treeGraph(def)?.limbs ?? [];
}

/** The limb a node hangs under — undefined for lock-free ground and orphans
 *  (that absence IS the lock exemption). */
export function treeLimbOfNode(def: SkillDef, nodeId: string): SkillTreeBranch | undefined {
  const g = treeGraph(def);
  const limbId = g?.nodes.get(nodeId)?.limbId;
  return limbId === undefined ? undefined : g!.limbs.find(l => l.id === limbId);
}

/** Max points a node takes (1 for the unknown — the caller's orphan check). */
export function treeNodeRanks(def: SkillDef, nodeId: string): number {
  return treeGraph(def)?.nodes.get(nodeId)?.ranks ?? 1;
}

/** Points spent on ONE node (repeated ids = ranks). */
export function treeSpentCount(spent: readonly string[] | undefined, nodeId: string): number {
  let n = 0;
  for (const id of spent ?? []) if (id === nodeId) n++;
  return n;
}

/** THE LOCK, DERIVED: every node sealed by the spent set — excluded by a
 *  spent node directly, or reachable from the root only through such a
 *  node. Spent nodes are never sealed (a spent rival pair cannot exist —
 *  the loader and the mutator both refuse it). Pure; O(n²) on a tree of
 *  a dozen nodes. */
export function treeSealedSet(def: SkillDef, spent: readonly string[]): Set<string> {
  const g = treeGraph(def);
  const sealed = new Set<string>();
  if (!g) return sealed;
  const spentSet = new Set(spent);
  const direct = new Set<string>();
  for (const id of spentSet) {
    for (const ex of g.nodes.get(id)?.excludes ?? []) if (!spentSet.has(ex)) direct.add(ex);
  }
  const reach = new Set<string>();
  const queue: string[] = [];
  for (const id of g.rootChildren) {
    if (direct.has(id)) continue;
    reach.add(id); queue.push(id);
  }
  while (queue.length) {
    const id = queue.shift()!;
    for (const n of g.nodes.values()) {
      if (reach.has(n.id) || direct.has(n.id) || !n.links.includes(id)) continue;
      reach.add(n.id); queue.push(n.id);
    }
  }
  for (const id of g.order) if (!reach.has(id) && !spentSet.has(id)) sealed.add(id);
  return sealed;
}

/** The NAME a sealed node's refusal speaks — its limb's, when the whole limb
 *  is sealed at the root (the M1 words: "The Duelist's path is sealed"),
 *  else the topmost sealed ancestor along its first-link chain (a sub-fork
 *  seals by its own name: "A2's path is sealed"). */
export function treeSealName(def: SkillDef, spent: readonly string[], nodeId: string): string {
  const g = treeGraph(def);
  const gn = g?.nodes.get(nodeId);
  if (!g || !gn) return nodeId;
  const sealed = treeSealedSet(def, spent);
  if (gn.limbId !== undefined) {
    const rootId = g.limbRoots.get(gn.limbId);
    if (rootId !== undefined && sealed.has(rootId)) {
      return g.limbs.find(l => l.id === gn.limbId)?.name ?? gn.node.name;
    }
  }
  let top = gn;
  while (top.links.length) {
    const p = g.nodes.get(top.links[0]);
    if (!p || !sealed.has(p.id)) break;
    top = p;
  }
  return top.node.name;
}

/** The prerequisite that must come first — the ROOT-MOST unspent ancestor
 *  along the first-link chain (a bare chain reads "The Duelist comes
 *  first" before "The Firm Wrist comes first", the M1 words). null when
 *  the node is open (a root child, or any link spent). An unknown link
 *  id names itself. */
export function treePrereqMissing(def: SkillDef, spent: readonly string[], nodeId: string): string | null {
  const g = treeGraph(def);
  let gn = g?.nodes.get(nodeId);
  if (!g || !gn) return null;
  const spentSet = new Set(spent);
  let missing: string | null = null;
  while (gn.links.length && !gn.links.some(l => spentSet.has(l))) {
    const p = g.nodes.get(gn.links[0]);
    if (!p) return gn.links[0];
    missing = p.node.name;
    gn = p;
  }
  return missing;
}
