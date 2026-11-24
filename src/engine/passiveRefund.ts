import { PASSIVE_ADJACENCY, PASSIVE_NODES, classStartNode, vocationGateNodeId, vocationGateOpen } from '../data/passives';
import { rotatedPassiveAdjacency } from '../data/passiveRingRotation';
import { choiceGroupOf, chosenOf, PASSIVE_CHOICE_CFG } from '../data/passiveChoices';
import { PASSIVE_REALMS, realmIdOf, realmOf } from '../data/passiveRealms';
import { VOCATIONS, vocationNodeId, vocationRootId } from '../data/vocations';
import type { PlayerMeta } from './world';

type RefundMeta = Pick<PlayerMeta, 'classDef' | 'allocated' | 'choices' | 'vocations' | 'ringRotations'>;

/** A changed tree can strand a formerly legal branch. Keep every connected
 * allocation and return exactly the paid points for detached nodes on load. */
export function refundDetachedVocationNodes(allocated: Set<string>, vocations: string[], choices: PlayerMeta['choices']): number {
  let points = 0;
  for (const id of vocations) {
    const voc = VOCATIONS[id];
    if (!voc?.refundDetachedNodes) continue;
    const root = vocationRootId(id);
    const queue = allocated.has(root) ? [root] : [];
    const reached = new Set(queue);
    for (const current of queue) for (const next of PASSIVE_ADJACENCY[current] ?? []) {
      if (PASSIVE_NODES[next]?.vocation !== id || !allocated.has(next) || reached.has(next)) continue;
      reached.add(next);
      queue.push(next);
    }
    for (const node of voc.tree) {
      const key = vocationNodeId(id, node.id);
      if (!reached.has(key) && allocated.delete(key)) {
        points += Math.max(1, chosenOf(choices, key).length * PASSIVE_CHOICE_CFG.pickCost);
      }
    }
  }
  return points;
}

/** Preview and authority use this same graph check. Free roots are anchors,
 * never refundable points; a purchased class start is not an extra anchor. */
export function passiveRefund(meta: RefundMeta, nodeId: string, adjacency = rotatedPassiveAdjacency(meta.ringRotations)): { points: number; currency: string; refusal: string | null } {
  const no = (refusal: string) => ({ points: 0, currency: 'passive', refusal });
  if (!Object.prototype.hasOwnProperty.call(PASSIVE_NODES, nodeId) || !meta.allocated.has(nodeId)) return no('This node is not allocated.');
  const node = PASSIVE_NODES[nodeId];
  const roots = new Set([classStartNode(meta.classDef.id), ...meta.vocations.map(vocationRootId),
    ...Object.values(PASSIVE_REALMS).flatMap(r => r.roots ?? [])]);
  if (roots.has(nodeId)) return no('This starting node was granted freely.');
  const remaining = new Set(meta.allocated); remaining.delete(nodeId);
  // A first-deal shortcut paid for pathing, not a pick. Keep its claimant
  // until those shortcuts are returned, so refunds never invent pick credit.
  if (chosenOf(meta.choices, nodeId).length && choiceGroupOf(node)?.deal === 'first') {
    const shortcut = [...remaining].find(id => PASSIVE_NODES[id]?.choice?.group === node.choice?.group);
    if (shortcut) return no(`Refund ${PASSIVE_NODES[shortcut].name}'s shared path first.`);
  }
  for (const id of remaining) {
    const n = PASSIVE_NODES[id];
    if (!n) return no('An allocated node is no longer available.');
    if (n.vocation && id !== vocationRootId(n.vocation) && !vocationGateOpen(remaining, n.vocation)) {
      return no('Refund the dependent Vocation nodes before removing their gate.');
    }
  }
  // Walk each constellation from its own roots, without borrowing a crest
  // or an edge in another constellation to keep an orphaned branch alive.
  const domain = (id: string) => PASSIVE_NODES[id].vocation ? `vocation:${PASSIVE_NODES[id].vocation}` : `realm:${realmIdOf(PASSIVE_NODES[id])}`;
  const reached = new Set([...roots].filter(id => remaining.has(id)));
  for (const id of remaining) if (!PASSIVE_NODES[id].vocation && realmOf(PASSIVE_NODES[id])?.adjacency === 'free') reached.add(id);
  const queue = [...reached];
  for (let i = 0; i < queue.length; i++) for (const next of adjacency[queue[i]] ?? []) {
    if (remaining.has(next) && !reached.has(next) && domain(next) === domain(queue[i])) {
      reached.add(next); queue.push(next);
    }
  }
  if ([...remaining].some(id => !reached.has(id))) return no('Keep a connected path to every allocated node. Refund the outer nodes first.');
  const picks = chosenOf(meta.choices, nodeId).length;
  return { points: picks ? picks * PASSIVE_CHOICE_CFG.pickCost : 1,
    currency: node.vocation ? 'vocation' : realmOf(node)?.currency ?? 'passive', refusal: null };
}

/** O(V+E) batch computation of all currently refundable passive node ids,
 *  matching `{ id in meta.allocated | !passiveRefund(meta, id, adjacency).refusal }`
 *  without repeating an O(V+E) BFS per allocated node on every Refund Mode render. */
export function refundablePassiveIds(
  meta: RefundMeta,
  adjacency = rotatedPassiveAdjacency(meta.ringRotations),
): Set<string> {
  const out = new Set<string>();
  const allocList: string[] = [];
  for (const id of meta.allocated) {
    if (!Object.prototype.hasOwnProperty.call(PASSIVE_NODES, id) || !PASSIVE_NODES[id]) {
      return out;
    }
    allocList.push(id);
  }
  const n = allocList.length;
  if (n === 0) return out;

  const roots = new Set<string>([
    classStartNode(meta.classDef.id),
    ...meta.vocations.map(vocationRootId),
    ...Object.values(PASSIVE_REALMS).flatMap(r => r.roots ?? []),
  ]);

  const domainOf = (id: string): string => {
    const node = PASSIVE_NODES[id];
    return node.vocation ? `vocation:${node.vocation}` : `realm:${realmIdOf(node)}`;
  };

  // Identify gates locked by active non-root Vocation nodes, and verify current gates.
  const lockedGates = new Set<string>();
  let brokenGateCount = 0;
  let brokenVocNode = '';
  for (let i = 0; i < n; i++) {
    const id = allocList[i];
    const node = PASSIVE_NODES[id];
    if (node.vocation && id !== vocationRootId(node.vocation)) {
      if (!vocationGateOpen(meta.allocated, node.vocation)) {
        brokenGateCount++;
        brokenVocNode = id;
      } else if (!vocationGateOpen(new Set(), node.vocation)) {
        const gate = vocationGateNodeId(node.vocation);
        if (gate) lockedGates.add(gate);
      }
    }
  }
  if (brokenGateCount > 1) return out;
  if (brokenGateCount === 1) {
    if (!passiveRefund(meta, brokenVocNode, adjacency).refusal) out.add(brokenVocNode);
    return out;
  }

  // Index allocated nodes 1..n; 0 is the virtual super-root connected to all anchors.
  const idToIdx = new Map<string, number>();
  const domains = new Array<string>(n + 1);
  domains[0] = '';
  for (let i = 0; i < n; i++) {
    idToIdx.set(allocList[i], i + 1);
    domains[i + 1] = domainOf(allocList[i]);
  }

  const adj: number[][] = Array.from({ length: n + 1 }, () => []);
  for (let i = 0; i < n; i++) {
    const id = allocList[i];
    const u = i + 1;
    const node = PASSIVE_NODES[id];
    if (roots.has(id) || (!node.vocation && realmOf(node)?.adjacency === 'free')) {
      adj[0].push(u);
      adj[u].push(0);
    }
    const domU = domains[u];
    const neighbors = adjacency[id];
    if (!neighbors) continue;
    for (let j = 0; j < neighbors.length; j++) {
      const v = idToIdx.get(neighbors[j]);
      if (v !== undefined && domains[v] === domU) adj[u].push(v);
    }
  }

  // Iterative Tarjan articulation-point sweep from super-root 0.
  const disc = new Int32Array(n + 1);
  const low = new Int32Array(n + 1);
  const parent = new Int32Array(n + 1).fill(-1);
  const nextEdge = new Int32Array(n + 1);
  const isCut = new Uint8Array(n + 1);
  const stack = new Int32Array(n + 1);
  let sp = 0;
  let timer = 0;

  disc[0] = low[0] = ++timer;
  stack[sp++] = 0;

  while (sp > 0) {
    const u = stack[sp - 1];
    const edges = adj[u];
    const ei = nextEdge[u];
    if (ei < edges.length) {
      nextEdge[u] = ei + 1;
      const v = edges[ei];
      if (disc[v] === 0) {
        parent[v] = u;
        disc[v] = low[v] = ++timer;
        stack[sp++] = v;
      } else if (v !== parent[u] && disc[v] < low[u]) {
        low[u] = disc[v];
      }
    } else {
      sp--;
      const p = parent[u];
      if (p >= 0) {
        if (low[u] < low[p]) low[p] = low[u];
        if (p !== 0 && low[u] >= disc[p]) isCut[p] = 1;
      }
    }
  }

  // If the current allocation already has disconnected nodes, fall back to exact check.
  if (timer < n + 1) {
    for (let i = 0; i < n; i++) {
      const id = allocList[i];
      if (!passiveRefund(meta, id, adjacency).refusal) out.add(id);
    }
    return out;
  }

  for (let i = 0; i < n; i++) {
    const u = i + 1;
    const id = allocList[i];
    if (isCut[u] || roots.has(id) || lockedGates.has(id)) continue;
    const node = PASSIVE_NODES[id];
    if (chosenOf(meta.choices, id).length > 0 && choiceGroupOf(node)?.deal === 'first') {
      if (!passiveRefund(meta, id, adjacency).refusal) out.add(id);
    } else {
      out.add(id);
    }
  }
  return out;
}
