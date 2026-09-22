import { PASSIVE_ADJACENCY, PASSIVE_NODES, classStartNode, vocationGateOpen } from '../data/passives';
import { choiceGroupOf, chosenOf, PASSIVE_CHOICE_CFG } from '../data/passiveChoices';
import { PASSIVE_REALMS, realmIdOf, realmOf } from '../data/passiveRealms';
import { vocationRootId } from '../data/vocations';
import type { PlayerMeta } from './world';

type RefundMeta = Pick<PlayerMeta, 'classDef' | 'allocated' | 'choices' | 'vocations'>;

/** Preview and authority use this same graph check. Free roots are anchors,
 * never refundable points; a purchased class start is not an extra anchor. */
export function passiveRefund(meta: RefundMeta, nodeId: string): { points: number; currency: string; refusal: string | null } {
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
  for (let i = 0; i < queue.length; i++) for (const next of PASSIVE_ADJACENCY[queue[i]] ?? []) {
    if (remaining.has(next) && !reached.has(next) && domain(next) === domain(queue[i])) {
      reached.add(next); queue.push(next);
    }
  }
  if ([...remaining].some(id => !reached.has(id))) return no('Keep a connected path to every allocated node. Refund the outer nodes first.');
  const picks = chosenOf(meta.choices, nodeId).length;
  return { points: picks ? picks * PASSIVE_CHOICE_CFG.pickCost : 1,
    currency: node.vocation ? 'vocation' : realmOf(node)?.currency ?? 'passive', refusal: null };
}
