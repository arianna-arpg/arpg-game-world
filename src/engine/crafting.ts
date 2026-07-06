// ---------------------------------------------------------------------------
// CRAFTING — salvage pricing, affix EXPERTISE, and crafting onto items.
//
// The loop: salvaging an item pays essence (SALVAGE_CFG quality formula) and
// STUDIES every natural affix on it — one lore point per line's family into
// the account's craftLore ledger (knowledge outlives characters; the essences
// themselves die with the run). Lore crosses CRAFT_CFG.loreThresholds to earn
// expertise RANKS: rank 1 unlocks crafting the family at all, each further
// rank raises the roll's UPPER bound one tier higher (the craft itself still
// rolls the whole unlocked span uniformly — expertise widens the ceiling, it
// never guarantees it). Crafted lines are marked on the instance, capped at
// maxCraftedAffixes per item (config; +1 via an account feature for the
// Vault to sell later), never enter lore (studying your own handiwork is
// free knowledge), and can land on ANY rarity — a white with one crafted
// line is exactly the "customizable base" whites were promised to be.
//
// Pure functions over plain data: lore is a Record the world passes in from
// the account; nothing here touches World, meta, or the DOM.
// ---------------------------------------------------------------------------

import { ITEM_AFFIXES } from '../data/itemaffixes';
import { ITEM_BASES } from '../data/itembases';
import {
  ESSENCE_OF_GEM, ESSENCE_OF_RARITY, SALVAGE_CFG, type EssenceCost, type EssenceId,
} from '../data/essences';
import { UNIQUES } from '../data/uniques';
import type { SkillInstance, SupportInstance } from './skills';
import {
  type AffixDef, type AffixRollState, type ItemBaseDef, type ItemInstance,
} from './items';
import { affixPoolsFor } from './itemgen';

export type CraftLore = Record<string, number>;

export const CRAFT_CFG = {
  /** Salvage-count thresholds per expertise RANK (index 0 → rank 1 …). */
  loreThresholds: [3, 8, 16, 28, 44],
  /** Crafted lines allowed per item (the golden rule: one). */
  maxCraftedAffixes: 1,
  /** Account feature id granting +1 crafted slot (Vault-ready seam). */
  extraSlotFeature: 'craft_second_affix',
  /** Essence cost to craft, by the family's expertise rank being used. */
  cost(rank: number): EssenceCost {
    if (rank <= 1) return { essence: 'glimmering', count: 6 };
    if (rank === 2) return { essence: 'brilliant', count: 5 };
    return { essence: 'pristine', count: 4 };
  },
};

// ---------------------------------------------------------------- salvage ---

/** Non-exquisite tier count of a family (the craftable ladder). */
function normalTiers(def: AffixDef): number {
  return def.tiers.filter(t => !t.magicOnly).length;
}

/** 1 = the family's best tier, 0 = its worst (exquisite counts as 1). */
function tierQuality(def: AffixDef, tierIdx: number): number {
  if (def.tiers.length <= 1) return 1;
  return 1 - tierIdx / (def.tiers.length - 1);
}

/** Essence yield for salvaging a piece of GEAR — the quality formula. */
export function salvageItemYield(item: ItemInstance): EssenceCost {
  const c = SALVAGE_CFG;
  let q = c.base + c.perTier * (item.tier - 1);
  for (const a of item.affixes) {
    const def = ITEM_AFFIXES[a.id];
    if (!def) continue;
    q += c.perAffix
      + c.affixTierQuality * tierQuality(def, a.tier)
      + c.affixRollQuality * (a.rolls.reduce((s, r) => s + r, 0) / Math.max(1, a.rolls.length));
    if (def.tiers[a.tier]?.magicOnly) q += c.exquisiteBonus;
  }
  if (item.rarity === 'common') {
    q += c.baseRollQuality * item.baseRoll + (item.superior !== undefined ? c.superiorBonus : 0);
  }
  if (item.uniqueId) q += c.uniqueBonus;
  return { essence: ESSENCE_OF_RARITY[item.rarity], count: Math.max(1, Math.round(q)) };
}

/** Essence yield for a carried skill gem — GRANTED sparks yield NOTHING. */
export function salvageSkillYield(inst: SkillInstance): EssenceCost | null {
  if (inst.granted) return null;
  const count = Math.max(1, Math.round(SALVAGE_CFG.gemBase + SALVAGE_CFG.gemPerLevel * (inst.level - 1)));
  return { essence: ESSENCE_OF_GEM[inst.rarity ?? 'common'], count };
}

export function salvageSupportYield(gem: SupportInstance): EssenceCost {
  const count = Math.max(1, Math.round(SALVAGE_CFG.gemBase + SALVAGE_CFG.gemPerLevel * (gem.level - 1)));
  return { essence: 'glimmering' satisfies EssenceId, count };
}

/** The lore a salvage teaches: +1 per NATURAL affix line family on the item
 *  (crafted lines are excluded — no studying your own handiwork). */
export function salvageLoreGain(item: ItemInstance): string[] {
  return item.affixes.filter(a => !a.crafted && ITEM_AFFIXES[a.id]).map(a => ITEM_AFFIXES[a.id].family);
}

// -------------------------------------------------------------- expertise ---

/** Expertise rank for a family: how many thresholds its lore count crossed. */
export function expertiseRank(lore: CraftLore, family: string): number {
  const n = lore[family] ?? 0;
  let rank = 0;
  for (const t of CRAFT_CFG.loreThresholds) if (n >= t) rank++;
  return rank;
}

/** Progress toward the NEXT rank: [have, need] (need = 0 at max rank). */
export function expertiseProgress(lore: CraftLore, family: string): [number, number] {
  const n = lore[family] ?? 0;
  const next = CRAFT_CFG.loreThresholds.find(t => n < t);
  return [n, next ?? 0];
}

/** The tier index (into def.tiers) of the BEST tier `rank` unlocks — climbing
 *  from the family's worst tier, never into the exquisite. */
function bestUnlockedTier(def: AffixDef, rank: number): number {
  const firstNormal = def.tiers.findIndex(t => !t.magicOnly);
  const worst = def.tiers.length - 1;
  return Math.max(firstNormal, worst - (Math.min(rank, normalTiers(def)) - 1));
}

/** Families this base could take a crafted line from, given the account's
 *  lore: tag-gated like natural rolls, rank ≥ 1, and no family duplicate on
 *  the item (natural, implicit-independent, or already crafted). */
export function craftableAffixesFor(
  item: ItemInstance, lore: CraftLore,
): { def: AffixDef; rank: number }[] {
  const base: ItemBaseDef | undefined = ITEM_BASES[item.baseId];
  if (!base) return [];
  const pools = affixPoolsFor(base);
  const used = new Set(item.affixes.map(a => ITEM_AFFIXES[a.id]?.family).filter(Boolean));
  if (item.uniqueId && !UNIQUES[item.uniqueId]) return [];
  const out: { def: AffixDef; rank: number }[] = [];
  for (const def of [...pools.prefix, ...pools.suffix]) {
    if (used.has(def.family)) continue;
    const rank = expertiseRank(lore, def.family);
    if (rank >= 1) out.push({ def, rank });
  }
  return out;
}

export function craftedCount(item: ItemInstance): number {
  return item.affixes.filter(a => a.crafted).length;
}

/** Roll a crafted line: uniform across the WHOLE unlocked span (worst tier's
 *  floor → the rank-unlocked tier's ceiling), then stored as (tier, fraction)
 *  so it lives in the same shape as every natural roll. Returns null only on
 *  malformed data. The caller enforces slots, lore, and cost. */
export function rollCraftedAffix(def: AffixDef, rank: number, rng: () => number = Math.random): AffixRollState | null {
  const bestIdx = bestUnlockedTier(def, rank);
  const worstIdx = def.tiers.length - 1;
  if (bestIdx < 0 || worstIdx < 0) return null;
  // Line 0 picks the landing tier; other lines ride the same tier.
  const lo = def.tiers[worstIdx].ranges[0][0];
  const hi = def.tiers[bestIdx].ranges[0][1];
  const v = lo + (hi - lo) * rng();
  let tier = worstIdx;
  for (let i = worstIdx; i >= bestIdx; i--) {
    const [tLo, tHi] = def.tiers[i].ranges[0];
    if (v >= tLo && v <= tHi) { tier = i; break; }
    if (v > tHi) tier = Math.max(bestIdx, i - 1);
  }
  const [tLo, tHi] = def.tiers[tier].ranges[0];
  const frac0 = tHi > tLo ? Math.max(0, Math.min(1, (v - tLo) / (tHi - tLo))) : 0.5;
  const rolls = def.lines.map((line, i) => (i === 0 || line.sharedRoll ? frac0 : rng()));
  return { id: def.id, tier, rolls, crafted: true };
}
