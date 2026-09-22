import type { Account } from './account';
import type { ItemInstance } from '../engine/items';
import { RELIQUARY_CFG } from '../data/reliquary';
import { RELIC_STASH } from '../data/stashes';
import { emptyStash, restoreStash, stashPageCost, type StashState } from '../engine/stash';
import { bumpItemUidFloor } from '../engine/itemgen';

/** Canonical item bodies live here. The active board holds references to them;
 * character saves and corpses never own a second copy. */
export interface AccountReliquary {
  items: ItemInstance[];
  seated: string[];
  rank: number;
  invested: number;
  stash: StashState;
  /** Released identities prevent stale legacy saves from resurrecting items. */
  released: string[];
}
export function emptyReliquary(): AccountReliquary {
  return { items: [], seated: [], rank: 0, invested: 0, stash: emptyStash(RELIC_STASH), released: [] };
}
export function restoreReliquary(value?: AccountReliquary): AccountReliquary {
  const out = emptyReliquary();
  if (!value) return out;
  out.released = [...new Set((Array.isArray(value.released) ? value.released : []).filter(k => typeof k === 'string' && k.length > 0))];
  out.rank = Number.isSafeInteger(value.rank) ? Math.max(0, Math.min(RELIQUARY_CFG.maxRank, value.rank)) : 0;
  out.invested = Number.isSafeInteger(value.invested) ? Math.max(0, Math.min(reliquaryCost(out) - 1, value.invested)) : 0;
  const seen = new Set<string>();
  out.items = structuredClone((Array.isArray(value.items) ? value.items : []).filter(i => {
    if (!i || typeof i.relicKey !== 'string' || !i.relicKey || seen.has(i.relicKey) || out.released.includes(i.relicKey)) return false;
    seen.add(i.relicKey); return true;
  }));
  out.seated = [...new Set((Array.isArray(value.seated) ? value.seated : []).filter(k => seen.has(k)))];
  for (const item of out.items) bumpItemUidFloor(item.uid);
  out.stash = restoreStash(RELIC_STASH, out.items.filter(i => !out.seated.includes(i.relicKey!)).map(item => ({ key: item.relicKey!, item })), value.stash);
  return out;
}
export function investRelicStash(a: Account): number {
  const s = a.reliquary.stash;
  if (!a.features.has('reliquary') || s.pages >= RELIC_STASH.maxPages || !Number.isSafeInteger(a.credits) || a.credits <= 0) return 0;
  const spent = Math.min(a.credits, stashPageCost(RELIC_STASH, s) - s.invested);
  a.credits -= spent; s.invested += spent;
  if (s.invested === stashPageCost(RELIC_STASH, s)) {
    s.pages++; s.invested = 0;
    a.reliquary.stash = restoreStash(RELIC_STASH, a.reliquary.items.filter(i => !a.reliquary.seated.includes(i.relicKey!)).map(item => ({ key: item.relicKey!, item })), s);
  }
  return spent;
}
export function reliquaryCost(r: AccountReliquary): number {
  return RELIQUARY_CFG.costBase * (r.rank + 1) ** 2;
}
export function reliquaryPower(r: AccountReliquary): number {
  return r.rank * RELIQUARY_CFG.powerPerRank;
}
/** One bounded pour; surplus stays available for other Vault choices. */
export function investReliquary(a: Account): number {
  const r = a.reliquary;
  if (!a.ledger[RELIQUARY_CFG.attunement] || r.rank >= RELIQUARY_CFG.maxRank
    || !Number.isSafeInteger(a.credits) || a.credits <= 0) return 0;
  const spent = Math.min(a.credits, reliquaryCost(r) - r.invested);
  a.credits -= spent; r.invested += spent;
  if (r.invested === reliquaryCost(r)) { r.rank++; r.invested = 0; }
  return spent;
}
