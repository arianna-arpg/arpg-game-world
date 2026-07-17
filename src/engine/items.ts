// ---------------------------------------------------------------------------
// ITEM SCHEMA — the foundational gear layer: bases, tiers, rarities, affixes.
//
// Everything here is OPEN DATA composed by one shared generator (itemgen.ts):
// base items, affixes, and uniques are plain registry entries; the engine
// rolls, compiles, and describes them through the same layered stat system
// (StatSheet sources) that passives, buffs, and monster rarities already use.
// An item is therefore never bespoke code — it is a bundle of Modifiers with
// provenance, and every existing seam (tags, conditions, links, gauges, the
// generated apply_<status> families) is an item seam for free.
//
// The four-rarity contract — each rarity is DISTINCT, not just "more affixes":
//  · COMMON (white)  — the BASE-STAT game. Whites roll their base defenses in
//    the WIDEST window (baseRollRange.common), and only whites can be SUPERIOR
//    (an implicit that extends the window further). A perfect superior white
//    out-armors any yellow's base — whites stay worth looking at forever.
//  · MAGIC (blue)    — one prefix + one suffix, but blues alone may roll the
//    EXQUISITE tier of an affix family (AffixTierDef.magicOnly): the highest
//    roll in the game, unrollable on rares — the D2 rule that keeps a blue
//    "+25% move speed boots" chase alive at every stage.
//  · RARE (yellow)   — up to 3 prefixes + 3 suffixes. Tier selection is
//    weighted by item level (rare.tierBias): a deep-zone rare leans toward
//    the top of the eligible pool instead of rolling floor trash.
//  · UNIQUE (orange) — a UniqueDef pinned to a BASE family. Because bases
//    resolve their tier from the drop's item level, the unique's line ranges
//    SCALE with the tier it dropped at (tierScale) — a "leveling unique"
//    found again at depth is simply a bigger one.
//
// The HOMOGENIZED TIER LADDER: base families do not hand-author per-tier
// stats. One global break table (tierBreaks) maps item level → tier, and a
// budget formula (defense + slotBudget) prices each slot's defense mix from
// its DefenseKind weights. New defense kinds, slots, or whole categories are
// registry rows, not engine edits.
//
// LOCAL vs GLOBAL — the two SCOPES a mod line can have:
//  · GLOBAL (default) — the line joins the wearer's stat sheet like any
//    passive: "10% increased Energy Shield" scales your whole pool.
//  · LOCAL (ModLineDef.local) — the line modifies THIS ITEM's own stats
//    before they ever reach the sheet: (base + Σlocal flat)·(1 + Σlocal
//    increased)·Π(1 + local more), folded by itemgen and shown already
//    applied in the defense header. Local lines display with the
//    ITEM_CFG.localLineSuffix (" on this item") so the two scopes are
//    distinguishable at a glance, and local values run several times
//    hotter than their global cousins BECAUSE they scale one item.
//    Any line anywhere can be local — affixes, implicits, unique lines —
//    and the fold is stat-agnostic: today it rides base defenses; the day
//    weapon bases seed their own damage/crit, "% increased crit chance on
//    this item" folds through the same seam.
//
// This file is the SCHEMA + CONFIG only (no data imports — data files import
// types from here, itemgen.ts composes both; same layering as skills.ts).
// ---------------------------------------------------------------------------

import { SKILL_RARITIES } from './skills';
import { ATTRIBUTES, STAT_DEFS, type AttributeId, type ConditionId, type ModKind, type SkillTag } from './stats';

// ------------------------------------------------------------- rarities ----

export type ItemRarity = 'common' | 'magic' | 'rare' | 'unique';

export interface ItemRarityDef {
  label: string;
  /** Shared with the skill-gem rarity palette — one visual language. */
  color: string;
}

export const ITEM_RARITIES: Record<ItemRarity, ItemRarityDef> = {
  common: { label: 'Common', color: SKILL_RARITIES.common.color },
  magic:  { label: 'Magic',  color: SKILL_RARITIES.magic.color },
  rare:   { label: 'Rare',   color: SKILL_RARITIES.rare.color },
  unique: { label: 'Unique', color: SKILL_RARITIES.legendary.color },
};

export const ITEM_RARITY_IDS = Object.keys(ITEM_RARITIES) as ItemRarity[];

// ------------------------------------------------------ slots & categories --

/** What KIND of thing an item is — drives slot compatibility, grid footprint
 *  defaults, affix gating (a category is always an implicit base tag), and
 *  defense budgeting. Weapon-side categories are registered NOW (future
 *  slated) so bases/affixes/uniques can target them the day they enable. */
export type ItemCategory =
  | 'helmet' | 'chest' | 'gloves' | 'boots' | 'legs' | 'belt'
  | 'amulet' | 'ring'
  | 'weapon' | 'offhand' | 'quiver';

/** One wearable slot on the doll. Two ring slots are two SLOTS accepting one
 *  CATEGORY — the registry, not code, decides how many of anything you wear.
 *  `enabled:false` slots exist in every pipeline (UI greys them, loot skips
 *  their categories) so flipping the flag is the whole launch. */
export interface EquipSlotDef {
  id: string;
  label: string;
  accepts: readonly ItemCategory[];
  enabled: boolean;
}

export const EQUIP_SLOTS: readonly EquipSlotDef[] = [
  { id: 'helmet', label: 'Helmet',     accepts: ['helmet'], enabled: true },
  { id: 'amulet', label: 'Amulet',     accepts: ['amulet'], enabled: true },
  { id: 'chest',  label: 'Chest',      accepts: ['chest'],  enabled: true },
  { id: 'gloves', label: 'Gloves',     accepts: ['gloves'], enabled: true },
  { id: 'belt',   label: 'Belt',       accepts: ['belt'],   enabled: true },
  { id: 'ring1',  label: 'Left Ring',  accepts: ['ring'],   enabled: true },
  { id: 'ring2',  label: 'Right Ring', accepts: ['ring'],   enabled: true },
  { id: 'legs',   label: 'Leggings',   accepts: ['legs'],   enabled: true },
  { id: 'boots',  label: 'Boots',      accepts: ['boots'],  enabled: true },
  // FUTURE SLATED — weapons & support-adjacent offhands ship as data later.
  { id: 'mainhand', label: 'Main Hand', accepts: ['weapon'], enabled: false },
  { id: 'offhand',  label: 'Off Hand',  accepts: ['offhand', 'quiver'], enabled: false },
];

export const SLOT_BY_ID: Record<string, EquipSlotDef> =
  Object.fromEntries(EQUIP_SLOTS.map(s => [s.id, s]));

/** The slots an item of this category can sit in (enabled ones first). */
export function slotsForCategory(cat: ItemCategory): EquipSlotDef[] {
  return EQUIP_SLOTS.filter(s => s.accepts.includes(cat) && s.enabled);
}

// -------------------------------------------------------- defense kinds ----

/** A defense stat a base item can carry. `coeff` prices one point of budget
 *  in this stat (armor is the reference currency). Registering a new kind
 *  here (ward? phasing pools?) instantly makes it a valid base-item mix. */
export interface DefenseKindDef {
  stat: string;
  label: string;
  coeff: number;
}

export const DEFENSE_KINDS: Record<string, DefenseKindDef> = {
  armor:        { stat: 'armor',        label: 'Armor',         coeff: 1.0 },
  evasion:      { stat: 'evasion',      label: 'Evasion',       coeff: 1.0 },
  energyShield: { stat: 'energyShield', label: 'Energy Shield', coeff: 0.45 },
  // Exotic pools — priced conservatively; belts/special families use them.
  poise:        { stat: 'poise',        label: 'Poise',         coeff: 0.8 },
  endurance:    { stat: 'endurance',    label: 'Endurance',     coeff: 0.55 },
  insight:      { stat: 'insight',      label: 'Insight',       coeff: 0.55 },
};

/** stat → terse defense label ('Energy Shield') for item defense headers —
 *  the sheet's own labels say 'Maximum Energy Shield'; the header is curt. */
export const DEFENSE_LABEL_BY_STAT: Record<string, string> =
  Object.fromEntries(Object.values(DEFENSE_KINDS).map(k => [k.stat, k.label]));

// ----------------------------------------------------------- mod lines -----

/** One declarative stat line — the SHAPE of a Modifier without its value.
 *  Declarative (not a function) so instances serialize as pure rolls, the
 *  tooltip can self-describe any line, and a data patch retunes live items. */
export interface ModLineDef {
  stat: string;
  kind: ModKind;
  tags?: SkillTag[];
  when?: ConditionId;
  /** 'link' lines: gain `value` of fromStat as stat (single-hop rule). */
  fromStat?: string;
  gauge?: string;
  /** This line re-uses the FIRST line's roll (an all-res block moves as one). */
  sharedRoll?: boolean;
  /** LOCAL SCOPE: the line modifies THIS ITEM's own stats (folded into the
   *  defense header by itemgen) instead of the wearer's sheet. Displays with
   *  ITEM_CFG.localLineSuffix. Legal kinds: flat/increased/more of a plain
   *  stat — no when/tags/gauge/fromStat (the validator warns otherwise). */
  local?: boolean;
}

/** A mod line WITH its own range — implicits and unique lines. The range is
 *  the TIER-1 window; it grows by `tierScale` per base tier above 1 (default
 *  from ITEM_CFG), which is the entire "uniques scale with the base" rule. */
export interface RangedLineDef extends ModLineDef {
  range: [number, number];
  /** Fractional growth per tier above 1; 0 pins the line flat. */
  tierScale?: number;
  /** Tooltip override; '{v}' is replaced with the formatted value. */
  text?: string;
}

// ---------------------------------------------------------------- bases ----

/** One base-item FAMILY (e.g. "Jerkin" — the evasion chest). The family is
 *  tierless: the global ladder resolves tier from the drop's item level and
 *  the budget formula prices its defense mix — D2's normal/exceptional/elite
 *  progression without hand-authoring three copies of everything. */
export interface ItemBaseDef {
  id: string;
  /** Family display name; the resolved tier prepends ITEM_CFG.tierNames
   *  (or indexes namesByTier when the family brings its own ladder). */
  name: string;
  category: ItemCategory;
  /** Tetris footprint in bag cells. */
  w: number;
  h: number;
  /** Affix-gating tags (the category id is ALWAYS implied as a tag). */
  tags: string[];
  /** Defense mix as relative weights — {armor:1, evasion:1} splits the slot
   *  budget evenly. Omit for jewelry (implicit-driven, no defense budget). */
  defense?: Record<string, number>;
  /** AFFIX-THEME AFFINITY: theme → weight multiplier applied when rolling
   *  affixes onto THIS base ({caster: 2.5} makes caster-themed lines favor
   *  it). Bias, never a gate — gates stay with AffixDef.tags/excludeTags. */
  affinity?: Record<string, number>;
  /** Identity lines rolled at EVERY rarity (a Coral Ring is always life). */
  implicits?: RangedLineDef[];
  /** Optional per-tier display names replacing the generic tier prefixes. */
  namesByTier?: string[];
  /** Weight within its category's drop pool (0 = never drops naturally). */
  dropWeight: number;
  /** The family doesn't exist below this item level (deep-world exclusives). */
  minIlvl?: number;
}

// --------------------------------------------------------------- affixes ---

export type AffixKind = 'prefix' | 'suffix';

/** One rollable tier of an affix family, BEST-FIRST in AffixDef.tiers.
 *  `magicOnly` marks the EXQUISITE tier — rollable only while the item is
 *  MAGIC, the rule that keeps blues chase-worthy forever. */
export interface AffixTierDef {
  /** Minimum item level for this tier to enter the pool. */
  ilvl: number;
  /** [min,max] per affix line (index-matched with AffixDef.lines). */
  ranges: [number, number][];
  weight: number;
  magicOnly?: boolean;
}

export interface AffixDef {
  id: string;
  kind: AffixKind;
  /** Mod-group: one item never carries two affixes of the same family. */
  family: string;
  /** Name particles for magic items, tier-indexed best-first (falls back to
   *  the last entry) — prefixes prepend ("Vigorous X"), suffixes append
   *  ("X of the Zephyr"). */
  names: string[];
  /** The stat line shapes; each tier supplies index-matched ranges. */
  lines: ModLineDef[];
  tiers: AffixTierDef[];
  /** Family weight in the roll pool. */
  weight: number;
  /** Rolls only on bases sharing ≥1 tag (undefined = everything). */
  tags?: string[];
  /** Never rolls on bases carrying any of these tags. */
  excludeTags?: string[];
  /** THEME tags ('caster', 'martial', 'summoner', …) — open strings that
   *  meet ItemBaseDef.affinity multipliers. A themed family rolls more
   *  often where the base leans its way; themeless families are neutral. */
  themes?: string[];
}

// --------------------------------------------------------------- uniques ---

/** A pinned legend on a specific base family. Lines are RangedLineDefs, so a
 *  unique can carry conditions, tag filters, links, gauges — any Modifier the
 *  engine understands — and its ranges scale with the tier it dropped at. */
export interface UniqueDef {
  id: string;
  name: string;
  baseId: string;
  lines: RangedLineDef[];
  flavor?: string;
  /** Weight among the uniques of the same base (boss tables can force ids). */
  weight: number;
  /** Never drops below this item level. */
  minIlvl?: number;
}

// -------------------------------------------------------------- instance ---

/** One rolled affix on an instance: which family, which tier, and the 0..1
 *  roll per line. Values are DERIVED (never stored) so a data rebalance
 *  retunes every existing item and saves stay tiny. */
export interface AffixRollState {
  id: string;
  tier: number;
  rolls: number[];
  /** Player-crafted line (the bench, not the drop): capped per item by
   *  CRAFT_CFG.maxCraftedAffixes, excluded from salvage lore, tagged in
   *  tooltips. Sits OUTSIDE the rarity's natural prefix/suffix caps — a
   *  white with one crafted line is the promised customizable base. */
  crafted?: boolean;
  /** ORACLE-LOCKED: this line has been communed over (rerolled) once and is
   *  sealed — the stone answers each question only once. */
  locked?: boolean;
}

/** A live item — PURE JSON (ids + numbers only), which makes it the save
 *  shape, the corpse shape, and the wire shape all at once. */
export interface ItemInstance {
  uid: number;
  baseId: string;
  ilvl: number;
  /** Base tier resolved at mint from ilvl (tierForIlvl) — frozen thereafter. */
  tier: number;
  rarity: ItemRarity;
  name: string;
  /** 0..1 across this rarity's base-defense window (commons roll widest). */
  baseRoll: number;
  /** SUPERIOR (common-only): 0..1 across the superior extension window. */
  superior?: number;
  /** 0..1 per base implicit line. */
  implicitRolls: number[];
  affixes: AffixRollState[];
  uniqueId?: string;
  /** 0..1 per unique line (present iff uniqueId). */
  uniqueRolls?: number[];
  /** SOCKETS: one entry per socket — a VESTIGE id, or null while empty.
   *  Rolled at mint (whites richest: ITEM_CFG.sockets) or chiseled at the
   *  bench (craftedSockets tracks those against the crafted-slot budget).
   *  Vestige effects and EPITAPH activation both derive from this array —
   *  no other socket state exists anywhere. */
  sockets?: (string | null)[];
  /** How many of the sockets were BENCH-ADDED — they share the one
   *  crafted-slot budget with crafted affixes (you chisel OR you inscribe,
   *  not both, unless the Vault sells you a second slot). */
  craftedSockets?: number;
  /** Bag grid position while carried (absent when equipped / on the ground). */
  x?: number;
  y?: number;
}

// ---------------------------------------------------------------- config ---

/** Every tunable in the item economy, in one place. No literal in the
 *  generator or the UI — retuning the game IS editing this object. */
export const ITEM_CFG = {
  /** ilvl thresholds for base tiers T1.. — also each tier's level requirement. */
  tierBreaks: [1, 5, 9, 13, 17, 21],
  /** Generic tier display prefixes (families may override via namesByTier). */
  tierNames: ['', 'Fine ', 'Grand ', 'Exalted ', 'Mythic ', 'Primeval '],

  /** Defense budget: (base + perIlvl·ilvl) · (1 + tierBonus·(tier−1)) · slot. */
  defense: { base: 16, perIlvl: 5, tierBonus: 0.3 },
  slotBudget: {
    helmet: 0.65, chest: 1.0, gloves: 0.5, boots: 0.5, legs: 0.8, belt: 0.4,
  } as Partial<Record<ItemCategory, number>>,

  /** Base-defense roll window per rarity — COMMONS ROLL WIDEST (their game). */
  baseRollRange: { common: 0.15, magic: 0.05, rare: 0.05, unique: 0.05 } as Record<ItemRarity, number>,
  /** Superior implicit (commons only): chance, and the extended window top. */
  superior: { chance: 0.18, max: 0.25 },

  /** Affix capacity per rarity. */
  affixSlots: {
    common: { prefixes: 0, suffixes: 0 },
    magic:  { prefixes: 1, suffixes: 1 },
    rare:   { prefixes: 3, suffixes: 3 },
    unique: { prefixes: 0, suffixes: 0 },
  } as Record<ItemRarity, { prefixes: number; suffixes: number }>,

  /** Magic rolls: chance the blue takes BOTH slots; weight multiplier pulling
   *  its tier pick toward the exquisite tier when one is eligible; and the
   *  OVERROLL — the low-level lottery. A magic item may roll an affix tier
   *  ABOVE its item-level gate: up to maxSteps tiers past the cutoff, each
   *  further step's weight multiplied by stepDecay. Blues are therefore
   *  worth a look at EVERY depth — early ones can outroll their level, and
   *  at depth the EXQUISITE tier (its own gate; excluded from overroll
   *  unless canReachExquisite flips) remains the rare-proof ceiling.
   *  bothChance sits LOW by doctrine: the affix-count curve leans on its
   *  floor at every rarity — most blues carry ONE line, and the two-line
   *  blue reads as a find of its own. */
  magic: {
    bothChance: 0.22,
    exquisiteWeightMult: 2.2,
    overroll: { chance: 0.25, maxSteps: 2, stepDecay: 0.45, canReachExquisite: false },
  },

  /** Rare rolls: total affix count distribution, and the ilvl-scaled tier
   *  bias — each step DOWN the eligible ladder multiplies weight by bias, and
   *  bias shrinks with depth (high-ilvl rares lean hard toward top tiers).
   *  The count curve leans HARD on its floor (the same doctrine as
   *  magic.bothChance): most rares land 3-4 lines, and the six-line rare
   *  is a genuine event — worth calling out loud when it hits the floor. */
  rare: {
    countWeights: [
      { count: 3, weight: 58 },
      { count: 4, weight: 27 },
      { count: 5, weight: 11 },
      { count: 6, weight: 4 },
    ],
    tierBias: { low: 0.85, high: 0.5 },
  },

  /** Auto-minted EXQUISITE tiers (itemaffixes fam() builder): range lift over
   *  T1, weight as a fraction of T1's, and the ilvl pad above T1's gate. */
  exquisite: { rangeLift: 0.18, weightFrac: 0.35, ilvlPad: 2 },

  /** Default per-tier range growth for unique lines / base implicits. */
  uniqueTierScale: 0.12,
  implicitTierScale: 0.1,

  /** Display suffix marking LOCAL-scope lines ("+45 Energy Shield on this
   *  item") — the one glance-read that separates them from global lines. */
  localLineSuffix: ' on this item',

  /** Drop-time item rarity weights (loot tables may override per entry).
   *  Tuned BOTTOM-HEAVY on purpose: rares run a clear step rarer than
   *  blues (~1:4), and the world-path unique is a once-in-a-session shout —
   *  the authored tables (bosses, crowned, hoards) are where unique odds
   *  live, so chasing them means chasing FIGHTS, not floor time. */
  rarityWeights: { common: 58, magic: 33.5, rare: 8, unique: 0.5 } as Record<ItemRarity, number>,

  /** SOCKETS: the low-weight bonus. Whites are the socket-bearers — the
   *  highest chance AND the fattest counts (their crafting-canvas identity;
   *  epitaphs demand them). Caps are per-category and absolute: rolling and
   *  bench-chiseling both respect them. */
  sockets: {
    cap: { chest: 3, helmet: 2, legs: 2, gloves: 1, boots: 1, belt: 1 } as Partial<Record<ItemCategory, number>>,
    chanceByRarity: { common: 0.4, magic: 0.16, rare: 0.1, unique: 0.08 } as Record<ItemRarity, number>,
    /** Socket-count weights once the chance lands (clamped to the cap). */
    countWeights: {
      common: [{ n: 1, weight: 50 }, { n: 2, weight: 35 }, { n: 3, weight: 15 }],
      magic: [{ n: 1, weight: 85 }, { n: 2, weight: 15 }],
      rare: [{ n: 1, weight: 90 }, { n: 2, weight: 10 }],
      unique: [{ n: 1, weight: 100 }],
    } as Record<ItemRarity, { n: number; weight: number }[]>,
  },

  /** Bag grid (the tetris board). */
  inventory: { w: 12, h: 6 },
  /** Manual pickup reach (the pickup keybind), world units. */
  pickupRadius: 70,
  /** Walk-over TOUCH radii (world units) — each ground drop's hitbox, by
   *  family. Gear and gems sit TIGHT (deliberate finds, sized to their
   *  shrunken sprites — see VIS_CFG.drops); currency (essence, vestiges)
   *  keeps the fat vacuum ring — it exists to be hoovered mid-chase. */
  pickupTouch: { gear: 16, gem: 16, currency: 22 },

  /** Rare-name mint tables ("Storm Song", "Grim Ward", …). */
  rareNames: {
    first: [
      'Storm', 'Grim', 'Ember', 'Dusk', 'Iron', 'Blood', 'Gale', 'Hollow',
      'Raven', 'Frost', 'Dread', 'Sun', 'Ash', 'Viper', 'Ghoul', 'Oath',
      'Thorn', 'Wolf', 'Doom', 'Star', 'Bone', 'Rune', 'Shade', 'Brine',
    ],
    second: [
      'song', ' Ward', ' Grasp', ' Veil', ' Coil', ' Mark', ' Bite', ' Crest',
      ' Shroud', ' Pledge', ' Snare', ' Brand', ' Knell', ' Husk', ' Gyre',
      ' Fang', ' Weave', ' Keep', ' Whorl', ' Call',
    ],
  },
};

// ------------------------------------------------------------- tier math ---

/** The absolute socket cap for a category (0 = never socketed). */
export function socketCap(category: ItemCategory): number {
  return ITEM_CFG.sockets.cap[category] ?? 0;
}

/** Item level → base tier (1-based) on the global ladder. */
export function tierForIlvl(ilvl: number): number {
  let tier = 1;
  for (let i = 0; i < ITEM_CFG.tierBreaks.length; i++) {
    if (ilvl >= ITEM_CFG.tierBreaks[i]) tier = i + 1;
  }
  return tier;
}

export function maxTier(): number {
  return ITEM_CFG.tierBreaks.length;
}

/** The character level required to equip a tier-T item. */
export function levelReqForTier(tier: number): number {
  return ITEM_CFG.tierBreaks[Math.min(tier, ITEM_CFG.tierBreaks.length) - 1] ?? 1;
}

/** Tier display prefix for a base ("Grand Jerkin"); families with their own
 *  namesByTier ladder replace the whole name instead. */
export function tieredBaseName(base: ItemBaseDef, tier: number): string {
  if (base.namesByTier && base.namesByTier.length > 0) {
    return base.namesByTier[Math.min(tier, base.namesByTier.length) - 1];
  }
  return (ITEM_CFG.tierNames[tier - 1] ?? '') + base.name;
}

/** Total base-defense budget for a category at ilvl/tier (before the mix
 *  split and each kind's coeff). Zero for budget-less categories (jewelry). */
export function defenseBudget(ilvl: number, tier: number, category: ItemCategory): number {
  const slot = ITEM_CFG.slotBudget[category] ?? 0;
  if (slot <= 0) return 0;
  const d = ITEM_CFG.defense;
  return (d.base + d.perIlvl * ilvl) * (1 + d.tierBonus * (tier - 1)) * slot;
}

/** The item's total base-defense bonus fraction: the rarity roll window,
 *  extended into the superior window for superior commons. */
export function baseBonusFor(item: Pick<ItemInstance, 'rarity' | 'baseRoll' | 'superior'>): number {
  const range = ITEM_CFG.baseRollRange[item.rarity];
  if (item.superior !== undefined) {
    return range + item.superior * Math.max(0, ITEM_CFG.superior.max - range);
  }
  return item.baseRoll * range;
}

// ------------------------------------------------------------ formatting ---

/** Interpolate a [min,max] range at roll t (0..1), scaled by mult. */
export function lerpRange(range: [number, number], t: number, mult = 1): number {
  const lo = range[0] * mult;
  const hi = range[1] * mult;
  return lo + (hi - lo) * Math.max(0, Math.min(1, t));
}

/** Round a rolled stat value for APPLICATION: chunky stats snap to integers,
 *  fine-grained fractions (percents, small regen) keep 3 decimals. */
export function roundStatValue(v: number): number {
  return Math.abs(v) >= 3 ? Math.round(v) : Math.round(v * 1000) / 1000;
}

const CONDITION_LABELS: Record<ConditionId, string> = {
  lowLife: 'on low life', fullLife: 'on full life',
  lowMana: 'on low mana', fullMana: 'on full mana',
  hasEs: 'while energy shield holds', fullEs: 'on full energy shield',
  lowEs: 'on low energy shield', guarding: 'while guarding',
  stationary: 'while stationary', moving: 'while moving', poised: 'while poised',
  poiseBroken: 'while your poise is broken',
  esRecharging: 'while energy shield is recharging',
  comboVaried: 'while your last three casts were all different skills',
  comboRepeated: 'while your last three casts repeated one skill',
};

export function statLabel(stat: string): string {
  // Attribute grants (+12 Strength) are legal mod lines with no STAT_DEFS
  // entry — their display name lives on the attribute registry instead.
  return STAT_DEFS[stat]?.label ?? ATTRIBUTES[stat as AttributeId]?.label ?? stat;
}

/** Format a rolled value for a stat: percent-flagged stats (and all
 *  increased/more kinds) render as percentages, flats as signed numbers. */
export function formatStatValue(stat: string, kind: ModKind, v: number): string {
  const pct = kind === 'increased' || kind === 'more' || STAT_DEFS[stat]?.percent;
  if (pct) {
    const p = Math.round(v * 1000) / 10;
    return `${p}%`;
  }
  return `${Math.abs(v) >= 3 ? Math.round(v) : Math.round(v * 100) / 100}`;
}

/** One human line for a declarative mod shape + rolled value — the shared
 *  describer for implicits, affixes, and unique lines (tooltips, corpse UI,
 *  the character sheet's provenance view). */
export function formatModLine(line: ModLineDef, v: number): string {
  let core: string;
  const label = statLabel(line.stat);
  switch (line.kind) {
    case 'flat':
      core = `${v >= 0 ? '+' : '−'}${formatStatValue(line.stat, 'flat', Math.abs(v))} ${label}`;
      break;
    case 'increased':
      core = `${formatStatValue(line.stat, 'increased', Math.abs(v))} ${v >= 0 ? 'increased' : 'reduced'} ${label}`;
      break;
    case 'more':
      core = `${formatStatValue(line.stat, 'more', Math.abs(v))} ${v >= 0 ? 'more' : 'less'} ${label}`;
      break;
    case 'link':
      core = `Gain ${formatStatValue(line.stat, 'more', v)} of ${statLabel(line.fromStat ?? '')} as ${label}`;
      break;
    case 'override':
      core = `${label}: ${formatStatValue(line.stat, 'flat', v)}`;
      break;
  }
  if (line.tags && line.tags.length) core += ` with ${line.tags.join(' ')} skills`;
  if (line.when) core += ` ${CONDITION_LABELS[line.when]}`;
  if (line.gauge) core += ` per ${line.gauge.replace('status:', 'stack of ')}`;
  if (line.local) core += ITEM_CFG.localLineSuffix;
  return core;
}
