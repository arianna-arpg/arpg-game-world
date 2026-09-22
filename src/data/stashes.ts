import type { StashDef } from '../engine/stash';
import { ITEM_BASES } from './itembases';

/** Finite horizontal growth, independent of equipped-board and power growth. */
export const RELIC_STASH: StashDef = {
  id: 'relic', board: { w: 6, h: 4 }, initialPages: 1, maxPages: 8,
  pageCostBase: 40,
  accepts: item => ITEM_BASES[item.baseId]?.category === 'relic' && !item.questId,
};
export const IMMORTAL_STASH: StashDef = {
  id: 'immortal', board: { w: 4, h: 3 }, initialPages: 1, maxPages: 1,
  pageCostBase: 0,
  accepts: item => !!ITEM_BASES[item.baseId] && ITEM_BASES[item.baseId].category !== 'relic' && !item.relicKey && !item.questId,
};
export const STASH_DEFS: Record<string, StashDef> = { relic: RELIC_STASH, immortal: IMMORTAL_STASH };
