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
import { MI_CFG } from '../data/infrequents';
import { VESTIGE_LIST } from '../data/vestiges';
import { pickThemedBase, rollItem } from './itemgen';
import type { ItemCategory, ItemInstance, ItemRarity } from './items';
import type { MonsterRarity } from './rarity';
import type { SkillTag } from './stats';

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
      /** Guarantee one affix from this FAMILY on the minted item (commons
       *  promote to magic; skipped where the base can't carry it) — the
       *  THEMED-CACHE lever. See RollItemOpts.withFamily. */
      withFamily?: string;
    }
  | { weight: number; kind: 'unique'; uniqueId?: string; category?: ItemCategory; ilvlBonus?: number }
  /** A VESTIGE bundle (id omitted = weighted pick from the registry). */
  | { weight: number; kind: 'vestige'; id?: string; count?: number | [number, number] }
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
  | { kind: 'gem' }
  | { kind: 'vestige'; id: string; count: number };

export interface LootCtx {
  ilvl: number;
  rng?: () => number;
  /** MONSTER INFREQUENT theme of the source kill (data/infrequents.ts):
   *  unconstrained item pulls may swap into the theme's base pool at
   *  MI_CFG.chance — through every nested table. */
  miTheme?: string;
}

/** The kill-path levers (world.rollDrops reads these — never literals there).
 *  Tuned SCARCE on purpose: a drop that happens less often reads as a find,
 *  not as noise — rarity of the EVENT is the cheapest quality multiplier. */
export const DROP_CFG = {
  /** Baseline chance a credited kill rolls the gear table at all. */
  killItemChance: 0.035,
  killTable: 'world_gear',
  bossTable: 'boss_gear',
  /** Baseline chance a credited kill drops a GEM (skill/support), and the
   *  guaranteed gem count on bosses — the old world.ts literals, now levers.
   *  Runs LEAN by doctrine: the guaranteed paths (bosses, elite tiers,
   *  event payouts, the vendor shelf) are where gems arrive ON PURPOSE —
   *  the kill trickle just keeps the floor alive between them. */
  killGemChance: 0.045,
  bossGemDrops: 2,
  /** Baseline chance a credited kill sheds a VESTIGE (socket material). */
  vestigeChance: 0.04,
  /** Bonus gear rolls by ELITE tier — the item-side mirror of RarityDef.drops. */
  eliteBonusItemRolls: { normal: 0, magic: 0, rare: 1, champion: 1, crowned: 2 } as Record<MonsterRarity, number>,
  /** Crowned leaders promote their bonus rolls onto the apex table. */
  eliteBonusTable: { normal: 'world_gear', magic: 'world_gear', rare: 'world_gear', champion: 'world_gear', crowned: 'crowned_gear' } as Record<MonsterRarity, string>,
  /** Nesting rope — a cyclic table chain stops, never hangs a kill burst. */
  maxTableDepth: 8,
};

/** GEM drop-policy levers (skills + supports; gear has its own ladder). */
export const GEM_DROP_CFG = {
  /** Global tag→weight multipliers over every gem's drop weight —
   *  {summon: 0.5} halves every summon gem's frequency without touching a
   *  single def. Empty = neutral (per-def weights alone decide). */
  tagWeights: {} as Partial<Record<SkillTag, number>>,
  /** Weight multiplier when a gem shares a tag with the killer's gemBias
   *  (MonsterDef.gemBias — the shaman drops caster gems rule). */
  biasMult: 2.5,
  /** Skill-vs-support split of the generic gem droplet (world.dropGemAt):
   *  this fraction lands as a SKILL gem, the rest as a support. */
  skillShare: 0.4,
  /** THE FRESH-FIND LEAN — the catalog-agency lever. A gem the party
   *  already CARRIES (any seat: bag, bar, or socketed) rolls at this
   *  fraction of its weight, so a growing catalog keeps surfacing gems
   *  you DON'T own — new play over the fifth copy of the same stone.
   *  Duplicates still drop (second copies have builds), just seldom.
   *  Applies to every pickGem consumer: kill drops AND the vendor shelf
   *  (Brandt leans fresh too — browsing him is deterministic catalog
   *  access). 1 = off. */
  carriedMult: 0.25,
  /** Deep-zone PRE-LEVELED skill gems: past minZone, this chance rolls the
   *  gem's level up to 1 + zoneLevel/levelDiv (the old world.ts literals). */
  preLevel: { chance: 0.2, minZone: 4, levelDiv: 3 },
};

/** Weighted vestige pick from the registry — the kill path and every
 *  loot table share the one distribution. */
export function rollVestigeId(rng: () => number = Math.random): string | null {
  let total = 0;
  for (const v of VESTIGE_LIST) total += v.weight;
  if (total <= 0) return null;
  let r = rng() * total;
  for (const v of VESTIGE_LIST) {
    r -= v.weight;
    if (r <= 0) return v.id;
  }
  return VESTIGE_LIST[VESTIGE_LIST.length - 1]?.id ?? null;
}

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
      // An UNCONSTRAINED pull from a themed kill may become an infrequent —
      // same rarity pipeline, themed base pool (exclusive implicit + lines).
      let baseId = entry.baseId;
      if (!baseId && !entry.category && ctx.miTheme && rng() < MI_CFG.chance) {
        baseId = pickThemedBase(ctx.miTheme, ctx.ilvl + (entry.ilvlBonus ?? 0), rng) ?? undefined;
      }
      const item = rollItem({
        ilvl: ctx.ilvl + (entry.ilvlBonus ?? 0), rng,
        category: entry.category, baseId,
        rarity: entry.rarity, rarityWeights: entry.rarityWeights,
        ...(entry.withFamily !== undefined ? { withFamily: entry.withFamily } : {}),
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
    case 'vestige': {
      const vid = entry.id ?? rollVestigeId(rng);
      if (vid) out.push({ kind: 'vestige', id: vid, count: drawCount(entry.count ?? 1, rng) });
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
