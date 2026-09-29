import { UNIQUES } from '../data/uniques';
import type { ItemInstance } from './items';

export function uniqueContainerLimit(item: ItemInstance): number | undefined {
  const limit = item.uniqueId ? UNIQUES[item.uniqueId]?.maxPerContainer : undefined;
  return limit !== undefined && Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : undefined;
}

/** Pure destination check. A replacement leaves before the new copy enters;
 * moving an already seated item does not add a copy. Names/rolls are cosmetic. */
export function uniqueContainerRefusal(
  held: readonly ItemInstance[], item: ItemInstance, replacing?: ItemInstance,
): string | null {
  const limit = uniqueContainerLimit(item);
  if (limit === undefined) return null;
  const copies = held.filter(i => i !== item && i !== replacing && i.uniqueId === item.uniqueId).length;
  return copies >= limit
    ? `Only ${limit} ${limit === 1 ? 'copy' : 'copies'} of ${UNIQUES[item.uniqueId!].name} may be equipped.` : null;
}
