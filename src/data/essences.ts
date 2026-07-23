// ---------------------------------------------------------------------------
// ESSENCES — the salvage currency ladder, and every knob that spends it.
//
// One essence per item rarity (the skill-gem rarities map onto the same four).
// Salvaging gear or carried gems at the Salvage Station yields the matching
// essence, quantity priced by the item's QUALITY (SALVAGE_CFG); essences then
// level skills/supports (ESSENCE_CFG.skillLevelCost — the whole cost curve is
// this one function), buy Brandt's stock (vendorPrice), and fuel affix
// crafting (see CRAFT_CFG in craftlore.ts).
//
// GRANTED skills (reacquired class starters) salvage to NOTHING — the rescue
// hatch can never become a mint. Essences live on the CHARACTER (PlayerMeta)
// and are lost to death like the rest of the carried bag; the account-side
// meta-currency is Mortal Essence (credits), a different thing entirely.
// ---------------------------------------------------------------------------

import type { ItemRarity } from '../engine/items';
import type { SkillRarity } from '../engine/skills';

export type EssenceId = 'coarse' | 'glimmering' | 'brilliant' | 'pristine';

export interface EssenceDef {
  id: EssenceId;
  label: string;
  color: string;
  /** Display glyph (HUD chips, costs). */
  glyph: string;
}

export const ESSENCES: Record<EssenceId, EssenceDef> = {
  coarse:     { id: 'coarse',     label: 'Coarse Essence',     color: '#b8b8b8', glyph: '▪' },
  glimmering: { id: 'glimmering', label: 'Glimmering Essence', color: '#7a9ae8', glyph: '◆' },
  brilliant:  { id: 'brilliant',  label: 'Brilliant Essence',  color: '#e8d44a', glyph: '✦' },
  pristine:   { id: 'pristine',   label: 'Pristine Essence',   color: '#e87a3a', glyph: '★' },
};

export const ESSENCE_IDS = Object.keys(ESSENCES) as EssenceId[];

/** Item rarity → the essence it salvages into. */
export const ESSENCE_OF_RARITY: Record<ItemRarity, EssenceId> = {
  common: 'coarse', magic: 'glimmering', rare: 'brilliant', unique: 'pristine',
};

/** Skill-gem rarity → essence ('legendary' is the gem-side orange). */
export const ESSENCE_OF_GEM: Record<SkillRarity, EssenceId> = {
  common: 'coarse', magic: 'glimmering', rare: 'brilliant', legendary: 'pristine',
};

export interface EssenceCost { essence: EssenceId; count: number; }

/** Lifetime-ledger key bumped whenever a hero GAINS essence from any source
 *  (spill pickups, salvage, selling) — the DISCOVERY that surfaces the Salvage
 *  Station in the Vault (the same `*_seen` idiom every package unlock uses).
 *  Counts total essence touched, so future content can gate on tallies too. */
export const LEDGER_ESSENCE_TOUCHED = 'essence_touched';

// -------------------------------------------------------- the spill fabric ---

/** ESSENCE SPILL (MonsterDef.essenceSpill) — the wounded-purse beat: striking
 *  the bearer shakes essence onto the ground (the D4 loot-goblin gold trail,
 *  reskinned onto OUR currency). Damage taken accumulates; every `per`
 *  fraction of max life lost sheds one packet, and death pays out whatever
 *  the chase didn't shake loose — so a body's TOTAL is a fixed budget
 *  (≈ 1/per packets) no matter the hit pattern: trail + pile always sum the
 *  same. Packet size and tint come from the level curve + tier ladder in
 *  ESSENCE_SPILL_CFG. Any monster can carry the spec — it is one data field. */
export interface EssenceSpillSpec {
  /** Fraction of max life lost per shed packet (default cfg.perLifeLost). */
  per?: number;
  /** Packet-quantity scale over the level curve (a hoarder is a fatter purse). */
  mul?: number;
  /** Seconds between sheds — readability throttle, never a budget cut
   *  (throttled packets bank and pay out later / on death). */
  cooldown?: number;
  /** Death pays the unshed remainder (default true — the budget is a promise). */
  deathBurst?: boolean;
}

export const ESSENCE_SPILL_CFG = {
  /** Default life-fraction per packet (≈7 packets across a full kill). */
  perLifeLost: 0.15,
  /** Default seconds between sheds. */
  cooldown: 0.3,
  /** Packet quantity: max(1, round(base + perLevel × (level − 1))). */
  countBase: 1,
  countPerLevel: 0.3,
  /** THE TIER LADDER: each rung is a chance-per-packet to climb ONE essence
   *  step once the bearer's level clears it — rungs roll in order and stop at
   *  the first miss, so deep tints stay rare and multiplicative. A new
   *  essence tier is one more rung, never new code. */
  tierRungs: [
    { atLevel: 8, chance: 0.3 },   // coarse → glimmering
    { atLevel: 16, chance: 0.22 }, // glimmering → brilliant
    { atLevel: 26, chance: 0.15 }, // brilliant → pristine
  ] as { atLevel: number; chance: number }[],
  /** Ground scatter radius for shed packets (px). */
  scatter: 30,
};

/** Total packet budget a spill body carries (its whole trail + death pile). */
export function spillBudget(spec: EssenceSpillSpec): number {
  return Math.max(1, Math.round(1 / (spec.per ?? ESSENCE_SPILL_CFG.perLifeLost)));
}

/** Roll ONE spill packet for a bearer of `level`: quantity off the level
 *  curve (scaled by the spec), tint climbed rung-by-rung up the ladder. */
export function rollSpillPacket(
  level: number, spec: EssenceSpillSpec, rng: () => number = Math.random,
): EssenceCost {
  const c = ESSENCE_SPILL_CFG;
  const count = Math.max(1, Math.round(
    (c.countBase + c.countPerLevel * (Math.max(1, level) - 1)) * (spec.mul ?? 1)));
  let tier = 0;
  for (const rung of c.tierRungs) {
    if (level < rung.atLevel || rng() >= rung.chance) break;
    tier = Math.min(tier + 1, ESSENCE_IDS.length - 1);
  }
  return { essence: ESSENCE_IDS[tier], count };
}

/** Salvage yield pricing — the QUALITY formula. Every component of an item's
 *  worth adds essence: its tier, each affix (better tiers and hotter rolls
 *  pay more), a white's base-roll game (superior most of all), exquisite
 *  lines, unique lines. All integers ≥ 1 of the rarity's essence. */
export const SALVAGE_CFG = {
  /** Station dwell: reach of the bench and the linger that opens the menu. */
  stationRadius: 120,
  stationDwell: 0.8,
  base: 1,
  perTier: 0.5,              // × (item tier − 1)
  perAffix: 0.8,
  /** × affix tier quality (1 = the family's best tier, 0 = its worst). */
  affixTierQuality: 1.5,
  /** × the mean 0..1 roll across affix lines. */
  affixRollQuality: 0.7,
  exquisiteBonus: 3,         // per magic-only line carried
  /** Whites: × baseRoll; superior whites add the flat bonus too. */
  baseRollQuality: 1.5,
  superiorBonus: 2,
  uniqueBonus: 4,            // uniques price their legend on top of tier
  /** Skill/support gems: base + perLevel × (level − 1). */
  gemBase: 1,
  gemPerLevel: 0.75,
};

/** BRANDT'S EXCHANGE — the SELL lane's rates. Selling converts ANYTHING to
 *  COARSE: quality × the rarity's exchange rate (the ladder is worth more as
 *  coarse VOLUME, but only the BENCH mints the rare tints — and the lore).
 *  Selling is liquidity, breaking is investment; these rates are the whole
 *  policy. `mul` is the global crank. */
export const SELL_CFG = {
  mul: 1,
  /** Gear: coarse per quality point, by rarity. */
  rarityMul: { common: 1, magic: 2, rare: 3.5, unique: 6 } as Record<ItemRarity, number>,
  /** Skill gems: coarse per gem-quality point, by gem rarity. */
  gemRarityMul: { common: 1, magic: 2, rare: 3.5, legendary: 6 } as Record<SkillRarity, number>,
  /** Support gems (no rarity of their own — priced as magic). */
  supportMul: 2,
};

/** The essence cost to raise a skill/support TO `targetLevel` — the single
 *  adjustable curve. Banded by depth so early growth spends the common tint
 *  and deep mastery demands the rare ones; retune freely (flat same-color,
 *  mixed costs, whatever) without touching engine or UI. */
export function skillLevelEssenceCost(targetLevel: number): EssenceCost {
  if (targetLevel <= 5) return { essence: 'coarse', count: 2 + targetLevel * 2 };
  if (targetLevel <= 10) return { essence: 'glimmering', count: (targetLevel - 4) * 2 };
  if (targetLevel <= 15) return { essence: 'brilliant', count: (targetLevel - 9) * 2 };
  return { essence: 'pristine', count: Math.max(2, (targetLevel - 14) * 2) };
}

/** BRANDT'S SHELF (the buy lane) — rolled GEAR on the counter beside his
 *  gems. Price = the item's SELL value × markup in coarse, PLUS (magic and
 *  up) a component of the rarity's own essence — so buying back mixes the
 *  lanes: sell for volume, break for tints, spend both at the counter. */
export const VENDOR_ITEM_CFG = {
  /** BASE rolled-gear slots on the counter (restocks with the gems). Widens
   *  through THE BROADER-WARES ladder's per-rung gear counts
   *  (data/vendors.ts VENDOR_CFG.wares — the one fold both faces share),
   *  never through a flag-checked literal here. */
  slots: 3,
  /** Coarse price = sellItemYield × markup (buy high, sell low — the spread). */
  markup: 4,
  /** Higher-tint component per rarity: count = ceil(quality × this). 0 = none. */
  tierComponent: { common: 0, magic: 0.35, rare: 0.5, unique: 0.75 } as Record<ItemRarity, number>,
  /** Rarity weights for the counter's rolls. Uniques deliberately absent —
   *  legends are found, not bought; give them a weight to change the policy. */
  rarityWeights: { common: 55, magic: 34, rare: 11, unique: 0 } as Partial<Record<ItemRarity, number>>,
  /** The counter rolls at the buyer's level ± this jitter. */
  ilvlJitter: 1,
};

/** Brandt's counter prices, by the gem's rarity (Descent echoes untouched). */
export const VENDOR_ESSENCE_PRICE: Record<SkillRarity, EssenceCost> = {
  common: { essence: 'coarse', count: 5 },
  magic: { essence: 'glimmering', count: 4 },
  rare: { essence: 'brilliant', count: 3 },
  legendary: { essence: 'pristine', count: 2 },
};

/** Support gems on the counter (no rarity of their own) price as magic. */
export const VENDOR_SUPPORT_PRICE: EssenceCost = { essence: 'glimmering', count: 3 };

/** The Oracle's fee for communing over (rerolling) one affix, by the item's
 *  rarity — the stone charges what the piece is worth. */
export function oracleRerollCost(rarity: ItemRarity): EssenceCost {
  switch (rarity) {
    case 'common': return { essence: 'glimmering', count: 3 };
    case 'magic': return { essence: 'glimmering', count: 5 };
    case 'rare': return { essence: 'brilliant', count: 4 };
    case 'unique': return { essence: 'pristine', count: 3 };
  }
}
