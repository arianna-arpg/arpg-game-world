import type { PassiveNode } from './passives';
import { choicePathing } from './passiveChoices';

/** The walking graph deliberately omits menu deals: a spent or exclusive
 *  selection must never be the only alternative that makes a route a fork.
 *  Independent training choices remain ordinary traversable investments. */
export function passiveWalkingGraph(nodes: Record<string, PassiveNode>, includeChoices = false): Record<string, string[]> {
  const graph: Record<string, Set<string>> = {};
  for (const n of Object.values(nodes)) if (!n.realm && !n.vocation && (includeChoices || !n.choice || choicePathing(n))) graph[n.id] = new Set();
  for (const n of Object.values(nodes)) for (const id of n.links) {
    if (n.id !== id && graph[n.id] && graph[id]) { graph[n.id].add(id); graph[id].add(n.id); }
  }
  return Object.fromEntries(Object.entries(graph).map(([id, neighbors]) => [id, [...neighbors]]));
}

/** Two adjacent degree-two nodes mean three allocations between forks.
 *  A single intervening node is allowed; terminal rewards are allowed.
 *  This checks both travel directions and closed loops, not just BFS paths. */
export function auditPassiveRoutes(nodes: Record<string, PassiveNode>, includeChoices = false) {
  const graph = passiveWalkingGraph(nodes, includeChoices);
  const corridors: [string, string][] = [];
  for (const [id, next] of Object.entries(graph)) if (next.length === 2) {
    for (const to of next) if (id < to && graph[to].length === 2) corridors.push([id, to]);
  }
  const starts = Object.keys(graph).filter(id => nodes[id].kind === 'start');
  const reached = new Set<string>(starts.slice(0, 1)), queue = [...reached];
  for (let i = 0; i < queue.length; i++) for (const to of graph[queue[i]]) {
    if (!reached.has(to)) { reached.add(to); queue.push(to); }
  }
  return {
    graph, corridors, starts,
    unreachable: Object.keys(graph).filter(id => !reached.has(id)),
    forks: Object.values(graph).filter(next => next.length >= 3).length,
    nodes: Object.keys(graph).length,
  };
}
