import type { Account } from '../meta/account';
import { ITEM_BASES } from '../data/itembases';
import type { ItemInstance } from './items';
import { nextItemUid } from './itemgen';
import type { CarrySlice } from './containers';
import type { DeathRecord } from '../meta/death';

export const isRelic = (i: ItemInstance): boolean => ITEM_BASES[i.baseId]?.category === 'relic';

/** Stable provenance precedes the session-local uid. A stale character save
 * can present the same item again, but can never replace the account's body. */
export function bankRelic(a: Account, item: ItemInstance, scope: string): ItemInstance | undefined {
  if (!isRelic(item)) return;
  const key = item.relicKey ?? `legacy:${scope}:${item.uid}`;
  const existing = a.reliquary.items.find(i => i.relicKey === key);
  if (existing) return existing;
  const copy = item;
  if (!copy) return;
  copy.relicKey = key;
  if (a.reliquary.items.some(i => i.uid === copy.uid)) copy.uid = nextItemUid();
  delete copy.x; delete copy.y;
  a.reliquary.items.push(copy);
  return copy;
}

export function accountRelicBoard(a: Account): ItemInstance[] {
  const keys = new Set(a.reliquary.seated);
  return a.reliquary.items.filter(i => keys.has(i.relicKey!));
}

export function migrateRelicCorpses(a: Account, deaths: DeathRecord[]): void {
  for (const d of deaths) d.loot.items = d.loot.items.filter(row => {
    if (row.kind !== 'gear' || !isRelic(row.item)) return true;
    bankRelic(a, row.item, `corpse:${d.owner}:${d.timestamp}`);
    return false;
  });
}

/** Adoption only: old bag relics go safely into reserve, old equipped relics
 * retain their cells. Replaying a migration never changes the chosen board. */
export function migrateRelicCarry(a: Account, carry: CarrySlice & { items: ItemInstance[] }, scope: string, legacy = true): void {
  const old = carry.containers.reliquary ?? [];
  for (const item of [...(legacy ? carry.items : []), ...old]) {
    if (!isRelic(item)) continue;
    const key = item.relicKey ?? `legacy:${scope}:${item.uid}`;
    const existed = a.reliquary.items.some(i => i.relicKey === key);
    const position = { x: item.x, y: item.y };
    const stored = bankRelic(a, item, scope);
    if (!existed && stored && old.includes(item)) {
      stored.x = position.x; stored.y = position.y;
      a.reliquary.seated.push(stored.relicKey!);
    }
  }
  // Mutable PlayerMeta arrays satisfy the read-only inspection contract.
  carry.items = carry.items.filter(i => !(legacy && isRelic(i)) && !i.relicKey
    && !a.reliquary.items.some(stored => stored.relicKey === `legacy:${scope}:${i.uid}`));
  carry.containers.reliquary = accountRelicBoard(a);
}
