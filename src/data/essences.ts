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
import type { MemoryKind } from '../engine/memories';
import { SKILL_LEVEL_BANDS, essenceTierForLevel, type SkillRarity } from '../engine/skills';

export type EssenceId = 'coarse' | 'glimmering' | 'brilliant' | 'pristine';

export interface EssenceDef {
  id: EssenceId;
  label: string;
  color: string;
  /** Display glyph (HUD chips, costs). */
  glyph: string;
  /** THE MORTAL EXCHANGE — this essence's worth in Mortal Essence, the ONE
   *  strict conversion every surface speaks through: the run-end RECKONING
   *  appraises the carried wallet at these rates, and every in-run service
   *  priced in Mortal Essence (holdfast tolls, harbor charts, hold
   *  restorations, merc hires) drains the wallet at the same rates. A new
   *  essence tier declares its worth here and joins everything at once.
   *  THE CHANGE LAW: the cheapest tier must be worth exactly 1 so a spend
   *  that breaks a deep tint can always refund exact change (probe-pinned:
   *  balance/probe_reckoning.ts). */
  mortalWorth: number;
}

export const ESSENCES: Record<EssenceId, EssenceDef> = {
  coarse:     { id: 'coarse',     label: 'Coarse Essence',     color: '#b8b8b8', glyph: '▪', mortalWorth: 1 },
  glimmering: { id: 'glimmering', label: 'Glimmering Essence', color: '#7a9ae8', glyph: '◆', mortalWorth: 2 },
  brilliant:  { id: 'brilliant',  label: 'Brilliant Essence',  color: '#e8d44a', glyph: '✦', mortalWorth: 3 },
  pristine:   { id: 'pristine',   label: 'Pristine Essence',   color: '#e87a3a', glyph: '★', mortalWorth: 5 },
};

export const ESSENCE_IDS = Object.keys(ESSENCES) as EssenceId[];

// ---------------------------------------------------- the mortal exchange ---

/** A carried essence wallet, appraised in Mortal Essence — the strict fold
 *  (count × mortalWorth per tier) both the run-end reckoning and every
 *  mortal-priced in-run service read. Partial wallets read absent as 0. */
export function walletMortalValue(w: Partial<Record<EssenceId, number>>): number {
  let v = 0;
  for (const id of ESSENCE_IDS) v += Math.max(0, Math.floor(w[id] ?? 0)) * ESSENCES[id].mortalWorth;
  return v;
}

/** The wallet's appraisal, tier by tier — what the reckoning screen prints.
 *  Empty tiers are omitted; rows come cheapest-first (the authored ladder). */
export function walletBreakdown(
  w: Partial<Record<EssenceId, number>>,
): { id: EssenceId; count: number; worth: number; value: number }[] {
  const rows: { id: EssenceId; count: number; worth: number; value: number }[] = [];
  for (const id of ESSENCE_IDS) {
    const count = Math.max(0, Math.floor(w[id] ?? 0));
    if (count > 0) rows.push({ id, count, worth: ESSENCES[id].mortalWorth, value: count * ESSENCES[id].mortalWorth });
  }
  return rows;
}

/** How many units of ONE essence cover a Mortal-Essence value — the tinted
 *  price converter (ceil: a fine-grained ask never rounds itself free).
 *  Services that demand a SPECIFIC tint (a veteran's contract, any future
 *  fine-grained fee) price their ME value through this one gate. */
export function essenceUnitsForValue(id: EssenceId, value: number): number {
  return Math.max(1, Math.ceil(Math.max(0, value) / ESSENCES[id].mortalWorth));
}

/** Spend `price` Mortal-Essence-worth out of a wallet, cheapest tints first,
 *  breaking at most one deeper tint and refunding the difference in the
 *  cheapest tier (exact by THE CHANGE LAW — value is conserved to the unit).
 *  Returns false, wallet untouched, when the whole wallet appraises short.
 *  Mutates in place on success. */
export function spendWalletMortalValue(w: Record<EssenceId, number>, price: number): boolean {
  price = Math.max(0, Math.ceil(price));
  if (price === 0) return true;
  if (walletMortalValue(w) < price) return false;
  // Ascending by worth (robust to registry reordering); change mints into the
  // cheapest tier, whose worth the change law pins at 1.
  const tiers = [...ESSENCE_IDS].sort((a, b) => ESSENCES[a].mortalWorth - ESSENCES[b].mortalWorth);
  const changeTier = tiers[0];
  let owed = price;
  for (const id of tiers) {
    if (owed <= 0) break;
    const worth = ESSENCES[id].mortalWorth;
    const have = Math.max(0, Math.floor(w[id] ?? 0));
    if (have <= 0) continue;
    const whole = Math.min(have, Math.floor(owed / worth));
    if (whole > 0) { w[id] = have - whole; owed -= whole * worth; }
    // A tail smaller than this tier's unit: break ONE unit, refund the rest.
    if (owed > 0 && (w[id] ?? 0) > 0 && worth > owed) {
      w[id] = (w[id] ?? 0) - 1;
      w[changeTier] = (w[changeTier] ?? 0) + (worth - owed);
      owed = 0;
    }
  }
  return owed <= 0;
}

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

// ---------------------------------------------------------------------------
// ABILITY ESSENCES — the skill-leveling currency (docs/design/skill-modes.md
// §2, M-ECON). A DEDICATED wallet-counter family, never bag items — her
// dopamine ruling: the drop is an EVENT with a name, a color, a floater and
// a zone floor, so deep country advertises itself by what falls there. The
// tier count DERIVES from SKILL_LEVEL_BANDS (one tier per band — flip the
// array and this registry re-mints itself); the color ladder mirrors the
// four-step register the game already speaks (tints / rarities). Working
// names are numerals I–IV; adjective names stay open for a naming pass
// (ids are stable — labels are presentation).
// ---------------------------------------------------------------------------

export interface AbilityEssenceDef {
  /** Stable id ('ability1'…) — wallets and saves key on it; renames are
   *  label edits, never id edits. */
  id: string;
  /** 1-based tier — the band it feeds (half-open: essenceTierForLevel). */
  tier: number;
  label: string;
  color: string;
  glyph: string;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** The tier LOOK ladder — colors mirror the tint/rarity four-step; a fifth
 *  band (Shape A) would want a fifth row (the zip below clamps to the last
 *  rather than crash, so the array stays the one lever). */
const ABILITY_TIER_LOOKS = [
  { color: '#b8b8b8', glyph: '◇' },
  { color: '#7a9ae8', glyph: '◈' },
  { color: '#e8d44a', glyph: '❖' },
  { color: '#e87a3a', glyph: '✷' },
];

/** The registry — one def per band, DERIVED from SKILL_LEVEL_BANDS. */
export const ABILITY_ESSENCES: AbilityEssenceDef[] = SKILL_LEVEL_BANDS.map((_, i) => {
  const look = ABILITY_TIER_LOOKS[Math.min(i, ABILITY_TIER_LOOKS.length - 1)];
  return {
    id: `ability${i + 1}`,
    tier: i + 1,
    // THE COHESION RENAME (skill-items M2, card 10 — LOCKED at walk 2):
    // the player-facing label is "Memory Essence" — the currency is the
    // refined form of the same substance the world drops (Memories refine
    // into Memory Essence; feeding it deepens the skill). Identifiers,
    // save keys ('ability1'…) and every code name stay — labels are
    // presentation (the header's own law).
    label: `Memory Essence ${ROMAN[i] ?? String(i + 1)}`,
    color: look.color,
    glyph: look.glyph,
  };
});

/** Tier (1-based) → def. The fold is total: out-of-range clamps. */
export function abilityEssenceOfTier(tier: number): AbilityEssenceDef {
  return ABILITY_ESSENCES[Math.max(0, Math.min(ABILITY_ESSENCES.length - 1, tier - 1))];
}

/** An Ability-Essence price: `count` essences of `tier`. */
export interface AbilityCost { tier: number; count: number; }

/** Every dial of the Ability Essence economy in one place. ALL NUMBERS ARE
 *  DIALS (unblessed — M-ECON proposes, she blesses at landing). */
export const ABILITY_ESSENCE_CFG = {
  /** The leveling cost curve: count = base + perStep × (steps into the
   *  band). Under 5-wide bands that reads 4/6/8/10/12 across a band —
   *  the OLD tint curve's shape (skillLevelEssenceCost, retired by
   *  M-ECON) re-targeted onto the dedicated family. supportMul prices
   *  support-gem levels from the same family ("as magic ×2", the
   *  SELL_CFG.supportMul idiom — supports cap at 5, all inside band I). */
  cost: { base: 2, perStep: 2, supportMul: 2 },
  /** ZONE-LEVEL DROP FLOORS per tier (the minDropLevel / Descent
   *  depth-lock idiom): tier i mints only on ground of at least this
   *  level. Seeded at each band's ENTRY level (1/6/11/16 — the first
   *  level the tier feeds INTO); kept explicit so a tier can be pushed
   *  deeper on taste. Length must match the band count (probe-pinned). */
  floors: [1, 6, 11, 16] as readonly number[],
  /** Kill-path drop chance per credited kill (the killGemChance idiom;
   *  scaled by the kill-path bounty exactly as gems are). */
  killChance: 0.03,
  /** Whole essences per drop packet [min, max]. */
  count: [1, 2] as readonly [number, number],
  /** THE TIER GRADIENT: among the tiers the ground's level clears, each
   *  DEEPER eligible tier weighs this much more than the step below it —
   *  deep ground pays mostly its own band while new-gem (level-1) feeding
   *  keeps every lower tier trickling. */
  deeperBias: 2.2,
  /** THE VENDOR SELL LANE (the charter's §6 — Brandt and kin SELL Ability
   *  Essences priced in tints; sell-direction ONLY, no buy-back: the
   *  refinement fiction made literal, and never a free exchange rate). */
  vendor: {
    /** Tint price per ONE essence, by tier — mirror-rung: tier i asks the
     *  ladder's own i-th tint. */
    prices: [
      { essence: 'coarse', count: 2 },
      { essence: 'glimmering', count: 2 },
      { essence: 'brilliant', count: 3 },
      { essence: 'pristine', count: 3 },
    ] as readonly EssenceCost[],
    /** Owned BROADER-WARES rungs needed per tier (0 = the base counter) —
     *  the availability ladder ECHOES the drop floors (ruled): I–II at
     *  the base counter, III behind rung 2, IV behind rung 3 (the
     *  gatework rung). */
    rungNeeded: [0, 0, 2, 3] as readonly number[],
    /** DEEP counters (VendorDef.essenceDeep — the chandler's port, the
     *  delver's shaft) waive the rung ladder: their own access was the
     *  gate ("IV deep territory"). */
    deepWaives: true,
  },
} as const;

/** The Ability-Essence cost to raise a SKILL to `targetLevel` — THE cost
 *  policy, one function (the retired tint curve's shape carried over:
 *  banded tier + a within-band ramp). Gated to the tier's band by
 *  construction: the tier IS the band the step lands in. */
export function skillLevelAbilityCost(targetLevel: number): AbilityCost {
  const tier = essenceTierForLevel(targetLevel);
  const bandStart = tier <= 1 ? 1 : SKILL_LEVEL_BANDS[tier - 2];
  const step = Math.max(1, targetLevel - bandStart);
  const c = ABILITY_ESSENCE_CFG.cost;
  return { tier, count: c.base + c.perStep * step };
}

/** Support-gem levels price from the SAME family at the supportMul —
 *  cap 5 keeps every step inside band I (tier-I essences, the low-tier
 *  fall-through her ruling asked for). */
export function supportLevelAbilityCost(targetLevel: number): AbilityCost {
  const c = skillLevelAbilityCost(targetLevel);
  return { tier: c.tier, count: Math.ceil(c.count * ABILITY_ESSENCE_CFG.cost.supportMul) };
}

// ------------------------------------------------------ the Sacrificial Font ---

/** THE FONT'S RECIPES (docs/design/skill-modes.md §5 — the repurposed
 *  Sacrificial Font: gems merged, essences broken, choices unmade; its old
 *  gems→points lane died with the point economy). Station grammar: dwell →
 *  deterministic recipes, no restock clock. ALL NUMBERS ARE DIALS. */
export const FONT_CFG = {
  /** MERGE: N× same skill, same rarity → 1 at +1 rarity, per RUNG (her
   *  sketch: "3 whites→blue, 5 blues→yellow" — the ladder escalates).
   *  Laws (first-commit, engine-enforced): merged gem keeps the HIGHEST
   *  input level; socketed supports AUTO-RETURN to the bag before inputs
   *  burn; the keeper's mark (locked) refuses exactly as it refuses
   *  salvage; granted sparks never count; strict same-skill. */
  merge: { common: 3, magic: 4, rare: 5 } as Partial<Record<SkillRarity, number>>,
  /** CONVERT, per rung: UP consumes `convertUp` of tier N for 1 of N+1;
   *  DOWN consumes 1 of tier N for `convertDown` of N−1. Deliberately
   *  LOSSY both ways round (2 < 3 — the PoE map-vendor valve): conversion
   *  never beats farming at depth, an inequality the probe pins. */
  convertUp: 3,
  convertDown: 2,
  /** RESET: the tree-respec ritual — clears one skill's spent picks,
   *  priced in the skill's CURRENT band ("one Essence III to reset a
   *  level-14 skill: a consideration, never a wall"). M1's full-tree
   *  resets consume this same seam. */
  reset: { count: 1 },
} as const;

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

/** THE MEMORY POUCHES on the counter (skill-items M3 — the one shelf's
 *  standard offering): price PER UNIT, folded by the stack's unit count at
 *  the till (a ×3 rough stack costs three units' worth). DIALS, unblessed:
 *  a rough unit is a lottery ticket priced under a common gem; the
 *  preformed unit is aimed and rarer, priced like a magic find. */
export const VENDOR_MEMORY_PRICE: Record<MemoryKind, EssenceCost> = {
  rough: { essence: 'coarse', count: 3 },
  preformed: { essence: 'glimmering', count: 2 },
};

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
