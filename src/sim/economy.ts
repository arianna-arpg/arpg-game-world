// ---------------------------------------------------------------------------
// THE ECONOMY AUDITS — the L3 tier's first instruments: item generation and
// loot tables measured at machine scale, through the REAL rollers.
//
//   auditAffixes  — N items minted via rollItem() per ilvl band: rarity mix,
//                   base mix, per-affix occurrence (observed share vs pool
//                   weight share), tier usage, uniques seen — and the two
//                   dead-content detectors: eligible-but-NEVER-rolled affixes
//                   and rolled affixes whose compiled stats the stat engine
//                   doesn't define (the attr_* bug's class, permanently
//                   instrumented).
//   auditLoot     — N resolutions of a loot table per ilvl band through
//                   resolveLootTable(): results per resolve by kind/rarity,
//                   gem/vestige rates, uniques seen. Paired with the
//                   DROP_CFG-derived per-kill analytic expectations so "what
//                   does a kill actually pay" is one report, not a spelunk.
//
// Deterministic by construction: every band runs its own seeded rng stream.
// Browser-safe (no Node imports) like the rest of src/sim — the CLI wires
// argv and files; a future in-game dev tab can call these directly.
// ---------------------------------------------------------------------------

import { ITEM_AFFIXES, ITEM_AFFIX_LIST } from '../data/itemaffixes';
import { ITEM_BASES } from '../data/itembases';
import { LOOT_TABLES } from '../data/loottables';
import { affixPoolsFor, compileItemMods, rollItem } from '../engine/itemgen';
import type { ItemCategory } from '../engine/items';
import { DROP_CFG, resolveLootTable, type LootResult } from '../engine/loot';
import { STAT_DEFS, isAttributeId } from '../engine/stats';
import { RARITY_DEFS } from '../engine/rarity';
import { deriveSeed, mulberry32 } from './rng';

/** Open audit knobs. */
export const ECONOMY_CFG = {
  /** Default ilvl bands (mirror the monster-audit levels). */
  ilvls: [1, 5, 10, 20, 40],
  /** Default sample size per band. */
  affixSamples: 4000,
  lootSamples: 2000,
  /** Observed/expected share ratio beyond which an affix is flagged hot/cold
   *  (expected = weight share of its pool, base-mix-weighted APPROXIMATION —
   *  family exclusion and prefix/suffix caps skew it; the flag is triage,
   *  not proof). */
  shareFlagHigh: 2,
  shareFlagLow: 0.5,
  /** Deterministic stream root for audits. */
  seed: 0x10071e5,
};

// ------------------------------------------------------------ affix audit --

export interface AffixBandReport {
  ilvl: number;
  n: number;
  rarities: Record<string, number>;
  bases: Record<string, number>;
  uniques: Record<string, number>;
  /** Observed occurrences per affix id (natural drops only, crafted lines
   *  never appear in rollItem output). */
  affixCounts: Record<string, number>;
  /** Tier usage per affix id ("t1/t2/…" → count). */
  tierCounts: Record<string, Record<number, number>>;
  /** Eligible at this ilvl (some base's pool + an unlocked tier) yet rolled
   *  ZERO times across the sample — the dead-affix triage list. */
  neverRolled: { id: string; kind: string; weight: number; eligibleBases: number }[];
  /** Observed share ÷ expected weight-share, flagged beyond the CFG bounds. */
  shareFlags: { id: string; kind: string; observed: number; expected: number; ratio: number }[];
}

export interface AffixAudit {
  bands: AffixBandReport[];
  /** Stats referenced by rolled items that the stat engine doesn't define
   *  (and aren't attribute ids) — dead lines, the attr_* class of bug. */
  unknownStats: { stat: string; via: string }[];
  category?: ItemCategory;
  baseId?: string;
}

export function auditAffixes(opts: {
  ilvls?: number[]; n?: number; category?: ItemCategory; baseId?: string;
} = {}): AffixAudit {
  const ilvls = opts.ilvls ?? ECONOMY_CFG.ilvls;
  const n = opts.n ?? ECONOMY_CFG.affixSamples;
  const unknownStats = new Map<string, string>();
  const bands: AffixBandReport[] = [];

  for (const ilvl of ilvls) {
    const rng = mulberry32(deriveSeed(ECONOMY_CFG.seed, ilvl));
    const rarities: Record<string, number> = {};
    const bases: Record<string, number> = {};
    const uniques: Record<string, number> = {};
    const affixCounts: Record<string, number> = {};
    const tierCounts: Record<string, Record<number, number>> = {};
    for (let i = 0; i < n; i++) {
      const item = rollItem({ ilvl, rng, category: opts.category, baseId: opts.baseId });
      if (!item) continue;
      rarities[item.rarity] = (rarities[item.rarity] ?? 0) + 1;
      bases[item.baseId] = (bases[item.baseId] ?? 0) + 1;
      if (item.uniqueId) uniques[item.uniqueId] = (uniques[item.uniqueId] ?? 0) + 1;
      for (const a of item.affixes) {
        if (a.crafted) continue;
        affixCounts[a.id] = (affixCounts[a.id] ?? 0) + 1;
        (tierCounts[a.id] ??= {})[a.tier] = (tierCounts[a.id]?.[a.tier] ?? 0) + 1;
      }
      // Dead-line sweep rides the same mint (compiled = what equip applies).
      for (const m of compileItemMods(item)) {
        if (!STAT_DEFS[m.stat] && !isAttributeId(m.stat)) {
          unknownStats.set(m.stat, `${item.baseId}${item.uniqueId ? ` / unique ${item.uniqueId}` : ''}`);
        }
      }
    }

    // Eligibility + expected shares over the OBSERVED base mix: for each base
    // rolled, its eligible prefix/suffix pools contribute weight mass.
    const eligibleWeight = new Map<string, number>();  // affix id → Σ base-mix-weighted pool share
    const eligibleBases = new Map<string, number>();   // affix id → distinct bases eligible
    let prefixMass = 0, suffixMass = 0;
    for (const [baseId, count] of Object.entries(bases)) {
      const base = ITEM_BASES[baseId];
      if (!base) continue;
      const pools = affixPoolsFor(base);
      for (const [kind, pool] of [['prefix', pools.prefix], ['suffix', pools.suffix]] as const) {
        const unlocked = pool.filter(a => a.tiers.some(t => ilvl >= t.ilvl));
        const total = unlocked.reduce((s, a) => s + a.weight, 0);
        if (total <= 0) continue;
        if (kind === 'prefix') prefixMass += count; else suffixMass += count;
        for (const a of unlocked) {
          eligibleWeight.set(a.id, (eligibleWeight.get(a.id) ?? 0) + (a.weight / total) * count);
          eligibleBases.set(a.id, (eligibleBases.get(a.id) ?? 0) + 1);
        }
      }
    }
    const neverRolled = [...eligibleBases.keys()]
      .filter(id => !affixCounts[id])
      .map(id => ({
        id, kind: ITEM_AFFIXES[id]?.kind ?? '?', weight: ITEM_AFFIXES[id]?.weight ?? 0,
        eligibleBases: eligibleBases.get(id) ?? 0,
      }))
      .sort((a, b) => b.weight - a.weight);

    const totalAffixDraws = Object.values(affixCounts).reduce((s, x) => s + x, 0);
    const shareFlags: AffixBandReport['shareFlags'] = [];
    if (totalAffixDraws > 0) {
      const massByKind = { prefix: prefixMass, suffix: suffixMass };
      for (const [id, count] of Object.entries(affixCounts)) {
        const def = ITEM_AFFIXES[id];
        if (!def) continue;
        const mass = massByKind[def.kind as 'prefix' | 'suffix'] ?? 0;
        if (mass <= 0) continue;
        const expected = (eligibleWeight.get(id) ?? 0) / mass; // per-item pick share (approx)
        const observed = count / totalAffixDraws * 2;          // ≈ per-item share across both kinds
        const ratio = expected > 0 ? observed / expected : Infinity;
        if (ratio > ECONOMY_CFG.shareFlagHigh || ratio < ECONOMY_CFG.shareFlagLow) {
          shareFlags.push({
            id, kind: def.kind,
            observed: Math.round(observed * 1e4) / 1e4,
            expected: Math.round(expected * 1e4) / 1e4,
            ratio: Math.round(ratio * 100) / 100,
          });
        }
      }
      shareFlags.sort((a, b) => b.ratio - a.ratio);
    }

    bands.push({ ilvl, n, rarities, bases, uniques, affixCounts, tierCounts, neverRolled, shareFlags });
  }

  return {
    bands,
    unknownStats: [...unknownStats.entries()].map(([stat, via]) => ({ stat, via })),
    category: opts.category,
    baseId: opts.baseId,
  };
}

/** Catalog-level dead-affix check, sample-free: affixes whose tags match NO
 *  base's pool at all — unreachable data regardless of ilvl or luck. */
export function unreachableAffixes(): { id: string; kind: string; tags?: string[] }[] {
  const reachable = new Set<string>();
  for (const base of Object.values(ITEM_BASES)) {
    const pools = affixPoolsFor(base);
    for (const a of pools.prefix) reachable.add(a.id);
    for (const a of pools.suffix) reachable.add(a.id);
  }
  return ITEM_AFFIX_LIST.filter(a => !reachable.has(a.id))
    .map(a => ({ id: a.id, kind: a.kind, tags: a.tags }));
}

// ------------------------------------------------------------- loot audit --

export interface LootBandReport {
  ilvl: number;
  n: number;
  /** Mean results per resolve, split by kind. */
  perResolve: { items: number; gems: number; vestiges: number };
  itemRarities: Record<string, number>;
  itemCategories: Record<string, number>;
  uniques: Record<string, number>;
  vestiges: Record<string, number>;
}

export interface LootAudit {
  tableId: string;
  bands: LootBandReport[];
}

export function auditLoot(opts: { tableId?: string; ilvls?: number[]; n?: number } = {}): LootAudit {
  const tableId = opts.tableId ?? DROP_CFG.killTable;
  if (!LOOT_TABLES[tableId]) throw new Error(`unknown loot table '${tableId}' (have: ${Object.keys(LOOT_TABLES).join(', ')})`);
  const ilvls = opts.ilvls ?? ECONOMY_CFG.ilvls;
  const n = opts.n ?? ECONOMY_CFG.lootSamples;
  const bands: LootBandReport[] = [];
  for (const ilvl of ilvls) {
    const rng = mulberry32(deriveSeed(ECONOMY_CFG.seed ^ 0x100f, ilvl));
    let items = 0, gems = 0, vestiges = 0;
    const itemRarities: Record<string, number> = {};
    const itemCategories: Record<string, number> = {};
    const uniques: Record<string, number> = {};
    const vestigeIds: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      const results: LootResult[] = resolveLootTable(tableId, { ilvl, rng });
      for (const r of results) {
        if (r.kind === 'item') {
          items++;
          itemRarities[r.item.rarity] = (itemRarities[r.item.rarity] ?? 0) + 1;
          const cat = ITEM_BASES[r.item.baseId]?.category ?? '?';
          itemCategories[cat] = (itemCategories[cat] ?? 0) + 1;
          if (r.item.uniqueId) uniques[r.item.uniqueId] = (uniques[r.item.uniqueId] ?? 0) + 1;
        } else if (r.kind === 'gem') {
          gems++;
        } else {
          vestiges += r.count;
          vestigeIds[r.id] = (vestigeIds[r.id] ?? 0) + r.count;
        }
      }
    }
    const r3 = (x: number): number => Math.round((x / n) * 1000) / 1000;
    bands.push({
      ilvl, n,
      perResolve: { items: r3(items), gems: r3(gems), vestiges: r3(vestiges) },
      itemRarities, itemCategories, uniques, vestiges: vestigeIds,
    });
  }
  return { tableId, bands };
}

/** The kill path's ANALYTIC per-kill expectations, straight from DROP_CFG —
 *  chance gates × the audited table's mean yield gives drops-per-kill without
 *  simulating a single fight. One table per monster elite tier. */
export function killDropExpectations(meanItemsPerGearResolve: number): {
  tier: string; gearRolls: number; itemsPerKill: number; gemChance: number; vestigeChance: number;
}[] {
  return Object.keys(RARITY_DEFS).map(tier => {
    const bonus = DROP_CFG.eliteBonusItemRolls[tier as keyof typeof DROP_CFG.eliteBonusItemRolls] ?? 0;
    const gearRolls = DROP_CFG.killItemChance + bonus;
    return {
      tier,
      gearRolls: Math.round(gearRolls * 1000) / 1000,
      itemsPerKill: Math.round(gearRolls * meanItemsPerGearResolve * 1000) / 1000,
      gemChance: DROP_CFG.killGemChance,
      vestigeChance: DROP_CFG.vestigeChance,
    };
  });
}
