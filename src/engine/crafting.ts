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

/** One family's study ledger: the unlocked RANK and the progress toward the
 *  next. Progress is TIER-TRUE — only salvaged lines at or above the NEXT
 *  ceiling teach (see studySalvage) — so rank+progress is the whole state;
 *  a flat lifetime count can't express "your weak salvage stopped counting". */
export interface LoreEntry { rank: number; progress: number; }

export type CraftLore = Record<string, LoreEntry>;

export const CRAFT_CFG = {
  /** Studies required to cross INTO each rank (index 0 → rank 1 …). */
  stepsPerRank: [3, 5, 8, 12, 16],
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

  // --- THE MINIGAME CONTRACT: skill, not magic-find -------------------------
  /** The UNSKILLED roll across the unlocked span: 'inverse' piles weight on
   *  the LOW end (min of two uniforms — the anti-rare rule), 'uniform' is
   *  flat chaos. Player skill is the only ladder out. */
  baseWeighting: 'inverse' as 'inverse' | 'uniform',
  /** How far a PERFECT minigame (score 1) lifts the roll toward the unlocked
   *  ceiling: t' = t + (1−t)·score·skillLift. */
  skillLift: 0.85,
  /** SMITHING (the bench): heat-bar timing game. */
  smith: {
    duration: 6,        // seconds of work
    sweepPeriod: 1.1,   // slider full oscillation
    sweetWidth: 0.16,   // the bright band, as a fraction of the track
    passiveRate: 0.05,  // fill/second while the metal rests
    clickBoost: 0.09,   // a struck sweet-spot's surge
    missPenalty: 0.02,  // a mistimed strike's cooling
  },
  /** COMMUNION (the Oracle): rune-chase precision game. */
  runes: {
    count: 5,           // runes per communion
    perRuneTime: 1.4,   // seconds before a rune gutters out
    hitRadius: 30,      // px — how close the cursor must pass
    speedWeight: 0.4,   // share of each rune's credit paid for swiftness
  },
};

/** The unskilled 0..1 roll position per CRAFT_CFG.baseWeighting. */
function baseRollT(rng: () => number): number {
  return CRAFT_CFG.baseWeighting === 'inverse' ? Math.min(rng(), rng()) : rng();
}

/** Minigame lift: score pulls the roll toward the ceiling, never past it. */
function liftT(t: number, score: number): number {
  const s = Math.max(0, Math.min(1, score));
  return t + (1 - t) * s * CRAFT_CFG.skillLift;
}

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

// -------------------------------------------------------------- expertise ---

export function expertiseRank(lore: CraftLore, family: string): number {
  return lore[family]?.rank ?? 0;
}

/** Progress toward the NEXT rank: [have, need] (need = 0 at max rank). */
export function expertiseProgress(lore: CraftLore, family: string): [number, number] {
  const e = lore[family];
  const rank = e?.rank ?? 0;
  return [e?.progress ?? 0, CRAFT_CFG.stepsPerRank[rank] ?? 0];
}

/** The rank ceiling a family can ever reach (its ladder length caps it). */
function maxRankFor(def: AffixDef): number {
  return Math.min(CRAFT_CFG.stepsPerRank.length, normalTiers(def));
}

/** STUDY a salvaged item's natural lines — the TIER-TRUE rule: a line
 *  teaches only if its tier is AT LEAST as strong as the NEXT ceiling being
 *  worked toward. A T1 salvage counts toward every unlock on the way up; a
 *  T5 salvage stops teaching the moment your ceiling passes it — mastery
 *  demands studying work BETTER than what you already understand. Crafted
 *  lines never teach (no studying your own handiwork). Mutates `lore`;
 *  returns the families that advanced (rank-ups flagged). */
export function studySalvage(
  lore: CraftLore, item: ItemInstance,
): { family: string; rankedUp: boolean }[] {
  const out: { family: string; rankedUp: boolean }[] = [];
  for (const a of item.affixes) {
    if (a.crafted) continue;
    const def = ITEM_AFFIXES[a.id];
    if (!def) continue;
    const entry = lore[def.family] ?? (lore[def.family] = { rank: 0, progress: 0 });
    if (entry.rank >= maxRankFor(def)) continue;
    // The tier this study must match or beat: the NEXT rank's ceiling.
    const nextCeiling = bestUnlockedTier(def, entry.rank + 1);
    if (a.tier > nextCeiling) continue; // weaker than the ceiling — teaches nothing
    entry.progress++;
    let rankedUp = false;
    if (entry.progress >= CRAFT_CFG.stepsPerRank[entry.rank]) {
      entry.rank++;
      entry.progress = 0;
      rankedUp = true;
    }
    out.push({ family: def.family, rankedUp });
  }
  return out;
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

/** Land a value in the span [worstIdx..bestIdx] (tier indices, best-first)
 *  and store it as (tier, fraction) — the same shape as every natural roll. */
function rollIntoSpan(
  def: AffixDef, bestIdx: number, worstIdx: number,
  rng: () => number, score: number,
): { tier: number; rolls: number[] } | null {
  if (bestIdx < 0 || worstIdx < 0 || bestIdx > worstIdx) return null;
  const lo = def.tiers[worstIdx].ranges[0][0];
  const hi = def.tiers[bestIdx].ranges[0][1];
  const v = lo + (hi - lo) * liftT(baseRollT(rng), score);
  let tier = worstIdx;
  for (let i = worstIdx; i >= bestIdx; i--) {
    const [tLo, tHi] = def.tiers[i].ranges[0];
    if (v >= tLo && v <= tHi) { tier = i; break; }
    if (v > tHi) tier = Math.max(bestIdx, i - 1);
  }
  const [tLo, tHi] = def.tiers[tier].ranges[0];
  const frac0 = tHi > tLo ? Math.max(0, Math.min(1, (v - tLo) / (tHi - tLo))) : 0.5;
  const rolls = def.lines.map((line, i) => (i === 0 || line.sharedRoll ? frac0 : rng()));
  return { tier, rolls };
}

/** Roll a crafted line across the unlocked span (worst floor → the rank's
 *  ceiling). The tier is NEVER chosen — the minigame score lifts an
 *  otherwise low-weighted roll (baseWeighting), and expertise only raises
 *  where the ceiling sits. Returns null only on malformed data. */
export function rollCraftedAffix(
  def: AffixDef, rank: number, rng: () => number = Math.random, score = 0,
): AffixRollState | null {
  const landed = rollIntoSpan(def, bestUnlockedTier(def, rank), def.tiers.length - 1, rng, score);
  return landed ? { id: def.id, ...landed, crafted: true } : null;
}

/** ORACLE REROLL: re-land a NATURAL affix across the tiers the ITEM itself
 *  could legally roll (its ilvl gates; exquisite only if it is magic) — and
 *  the caller LOCKS it after, so the stone cannot be farmed. */
export function rollRerolledAffix(
  def: AffixDef, item: ItemInstance, rng: () => number = Math.random, score = 0,
): AffixRollState | null {
  const elig: number[] = [];
  for (let i = 0; i < def.tiers.length; i++) {
    const t = def.tiers[i];
    if (t.ilvl > item.ilvl) continue;
    if (t.magicOnly && item.rarity !== 'magic') continue;
    elig.push(i);
  }
  if (elig.length === 0) return null;
  const landed = rollIntoSpan(def, elig[0], elig[elig.length - 1], rng, score);
  return landed ? { id: def.id, ...landed, locked: true } : null;
}
