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

/** Brandt's counter prices, by the gem's rarity (Descent echoes untouched). */
export const VENDOR_ESSENCE_PRICE: Record<SkillRarity, EssenceCost> = {
  common: { essence: 'coarse', count: 5 },
  magic: { essence: 'glimmering', count: 4 },
  rare: { essence: 'brilliant', count: 3 },
  legendary: { essence: 'pristine', count: 2 },
};

/** Support gems on the counter (no rarity of their own) price as magic. */
export const VENDOR_SUPPORT_PRICE: EssenceCost = { essence: 'glimmering', count: 3 };
