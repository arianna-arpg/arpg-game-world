// ---------------------------------------------------------------------------
// LOOT TABLES — declarative, NESTABLE drop economics.
//
// A LootTableDef is a list of rolls; each roll draws `count` weighted entries.
// An entry mints an item (optionally constrained: category, exact base, forced
// rarity, rarity re-weights, ilvl bonus), delegates to the EXISTING gem drop,
// drops nothing, or recurses into ANOTHER TABLE — so "the warlord rolls the
// jewelry cache twice and one guaranteed rare" is pure data. Monsters opt in
// via MonsterDef.loot; everything else falls back to DROP_CFG defaults keyed
// off what the kill already knows (boss flag, elite rarity tier).
//
// The resolver returns RESULTS — the world decides what a result becomes
// (a ground drop today; a vendor shelf, chest fill, or quest reward feeds
// from the identical tables tomorrow).
// ---------------------------------------------------------------------------

import { LOOT_TABLES } from '../data/loottables';
import { rollItem } from './itemgen';
import type { ItemCategory, ItemInstance, ItemRarity } from './items';
import type { MonsterRarity } from './rarity';

export type LootEntry =
  | { weight: number; kind: 'nothing' }
  /** Delegate to the existing skill/support gem droplet (world.dropGemAt). */
  | { weight: number; kind: 'gem' }
  | {
      weight: number; kind: 'item';
      category?: ItemCategory; baseId?: string;
      rarity?: ItemRarity;
      rarityWeights?: Partial<Record<ItemRarity, number>>;
      ilvlBonus?: number;
    }
  | { weight: number; kind: 'unique'; uniqueId?: string; category?: ItemCategory; ilvlBonus?: number }
  | { weight: number; kind: 'table'; table: string };

export interface LootRoll {
  /** Draws per roll — fixed, or an inclusive [min,max]. */
  count: number | [number, number];
  entries: LootEntry[];
}

export interface LootTableDef {
  id: string;
  rolls: LootRoll[];
}

export type LootResult =
  | { kind: 'item'; item: ItemInstance }
  | { kind: 'gem' };

export interface LootCtx {
  ilvl: number;
  rng?: () => number;
}

/** The kill-path levers (world.rollDrops reads these — never literals there). */
export const DROP_CFG = {
  /** Baseline chance a credited kill rolls the gear table at all. */
  killItemChance: 0.09,
  killTable: 'world_gear',
  bossTable: 'boss_gear',
  /** Bonus gear rolls by ELITE tier — the item-side mirror of RarityDef.drops. */
  eliteBonusItemRolls: { normal: 0, magic: 0, rare: 1, champion: 1, crowned: 2 } as Record<MonsterRarity, number>,
  /** Crowned leaders promote their bonus rolls onto the apex table. */
  eliteBonusTable: { normal: 'world_gear', magic: 'world_gear', rare: 'world_gear', champion: 'world_gear', crowned: 'crowned_gear' } as Record<MonsterRarity, string>,
  /** Nesting rope — a cyclic table chain stops, never hangs a kill burst. */
  maxTableDepth: 8,
};

const warned = new Set<string>();
function warnOnce(key: string, msg: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[loot] ${msg}`);
}

function drawCount(count: number | [number, number], rng: () => number): number {
  if (typeof count === 'number') return count;
  const [lo, hi] = count;
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function pickEntry(entries: readonly LootEntry[], rng: () => number): LootEntry | null {
  let total = 0;
  for (const e of entries) total += Math.max(0, e.weight);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const e of entries) {
    r -= Math.max(0, e.weight);
    if (r <= 0) return e;
  }
  return entries[entries.length - 1] ?? null;
}

function resolveEntry(entry: LootEntry, ctx: LootCtx, depth: number, out: LootResult[]): void {
  const rng = ctx.rng ?? Math.random;
  switch (entry.kind) {
    case 'nothing':
      return;
    case 'gem':
      out.push({ kind: 'gem' });
      return;
    case 'item': {
      const item = rollItem({
        ilvl: ctx.ilvl + (entry.ilvlBonus ?? 0), rng,
        category: entry.category, baseId: entry.baseId,
        rarity: entry.rarity, rarityWeights: entry.rarityWeights,
      });
      if (item) out.push({ kind: 'item', item });
      return;
    }
    case 'unique': {
      const item = rollItem({
        ilvl: ctx.ilvl + (entry.ilvlBonus ?? 0), rng,
        rarity: 'unique', uniqueId: entry.uniqueId, category: entry.category,
      });
      if (item) out.push({ kind: 'item', item });
      return;
    }
    case 'table':
      resolveInto(entry.table, ctx, depth + 1, out);
      return;
  }
}

function resolveInto(tableId: string, ctx: LootCtx, depth: number, out: LootResult[]): void {
  if (depth > DROP_CFG.maxTableDepth) {
    warnOnce(`depth:${tableId}`, `table '${tableId}' exceeds nesting depth ${DROP_CFG.maxTableDepth} (cycle?)`);
    return;
  }
  const table = LOOT_TABLES[tableId];
  if (!table) {
    warnOnce(`missing:${tableId}`, `unknown loot table '${tableId}'`);
    return;
  }
  const rng = ctx.rng ?? Math.random;
  for (const roll of table.rolls) {
    const n = drawCount(roll.count, rng);
    for (let i = 0; i < n; i++) {
      const entry = pickEntry(roll.entries, rng);
      if (entry) resolveEntry(entry, ctx, depth, out);
    }
  }
}

/** Resolve a table into concrete results (empty for unknown ids — warned). */
export function resolveLootTable(tableId: string, ctx: LootCtx): LootResult[] {
  const out: LootResult[] = [];
  resolveInto(tableId, ctx, 0, out);
  return out;
}
