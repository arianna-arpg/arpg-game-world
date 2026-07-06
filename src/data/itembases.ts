// ---------------------------------------------------------------------------
// ITEM BASES — every equippable base family, as data.
//
// Armour-slot families are GENERATED from a defense-combo grid × the wearable
// categories: {armor, evasion, energy shield} pure and paired, each cell just
// a name. The tier ladder, budgets, and level requirements all come from
// ITEM_CFG — a family here is one row, never a hand-authored stat block, so
// the D2-style base progression is homogeneous by construction (which is what
// lets uniques pinned to a family scale wherever they drop).
//
// Belts run on the EXOTIC defense kinds (poise / endurance) to keep the
// defense-kind registry honestly open; jewelry carries identity IMPLICITS
// instead of budgets. Weapon/offhand/quiver categories are registered in the
// schema but ship no bases yet — the day they do, drops/affixes/uniques
// already know how to treat them.
// ---------------------------------------------------------------------------

import type { ItemBaseDef, ItemCategory, RangedLineDef } from '../engine/items';

/** Default bag footprints per category (bases may override individually). */
export const CATEGORY_SIZE: Record<ItemCategory, { w: number; h: number }> = {
  helmet: { w: 2, h: 2 },
  chest:  { w: 2, h: 3 },
  gloves: { w: 2, h: 2 },
  boots:  { w: 2, h: 2 },
  legs:   { w: 2, h: 2 },
  belt:   { w: 2, h: 1 },
  ring:   { w: 1, h: 1 },
  amulet: { w: 1, h: 1 },
  weapon: { w: 2, h: 4 },
  offhand:{ w: 2, h: 3 },
  quiver: { w: 2, h: 3 },
};

// ----------------------------------------------- armour family generation --

/** One defense-combo column: the mix plus a name per armour category. */
interface DefCombo {
  key: string;
  mix: Record<string, number>;
  names: Partial<Record<ItemCategory, string>>;
}

const ARMOUR_CATEGORIES: ItemCategory[] = ['helmet', 'chest', 'gloves', 'boots', 'legs'];

const DEF_COMBOS: DefCombo[] = [
  {
    key: 'armor', mix: { armor: 1 },
    names: { helmet: 'Casque', chest: 'Warplate', gloves: 'Gauntlets', boots: 'Greaves', legs: 'Cuisses' },
  },
  {
    key: 'evasion', mix: { evasion: 1 },
    names: { helmet: 'Hood', chest: 'Jerkin', gloves: 'Grips', boots: 'Treads', legs: 'Trews' },
  },
  {
    key: 'es', mix: { energyShield: 1 },
    names: { helmet: 'Circlet', chest: 'Vestment', gloves: 'Cuffs', boots: 'Slippers', legs: 'Silks' },
  },
  {
    key: 'armor_evasion', mix: { armor: 1, evasion: 1 },
    names: { helmet: 'Sallet', chest: 'Brigandine', gloves: 'Handguards', boots: 'Warboots', legs: 'Chausses' },
  },
  {
    key: 'armor_es', mix: { armor: 1, energyShield: 1 },
    names: { helmet: 'Crown', chest: 'Templar Plate', gloves: 'Sigil Fists', boots: 'Bastion Boots', legs: 'Faulds' },
  },
  {
    key: 'evasion_es', mix: { evasion: 1, energyShield: 1 },
    names: { helmet: 'Cowl', chest: 'Shroud', gloves: 'Wraps', boots: 'Sandals', legs: 'Windtrews' },
  },
];

function armourBase(cat: ItemCategory, combo: DefCombo): ItemBaseDef {
  const size = CATEGORY_SIZE[cat];
  return {
    id: `${cat}_${combo.key}`,
    name: combo.names[cat] ?? `${combo.key} ${cat}`,
    category: cat,
    w: size.w, h: size.h,
    // Tags: the armour super-class, the category, and each defense kind in
    // the mix — affixes gate on any of these ("% armor only on armor gear").
    tags: ['armour', cat, ...Object.keys(combo.mix)],
    defense: combo.mix,
    dropWeight: 100,
  };
}

// -------------------------------------------------------------- builders ---

function jewel(
  id: string, name: string, cat: ItemCategory, implicits: RangedLineDef[],
  dropWeight: number, tags: string[] = [],
): ItemBaseDef {
  const size = CATEGORY_SIZE[cat];
  return {
    id, name, category: cat, w: size.w, h: size.h,
    tags: ['jewelry', cat, ...tags],
    implicits, dropWeight,
  };
}

function belt(id: string, name: string, mix: Record<string, number>): ItemBaseDef {
  const size = CATEGORY_SIZE.belt;
  return {
    id, name, category: 'belt', w: size.w, h: size.h,
    tags: ['armour', 'belt', ...Object.keys(mix)],
    defense: mix, dropWeight: 70,
  };
}

// ---------------------------------------------------------------- registry -

const line = (
  stat: string, kind: RangedLineDef['kind'], range: [number, number],
): RangedLineDef => ({ stat, kind, range });

export const BASE_LIST: ItemBaseDef[] = [
  // Armour grid: 5 categories × 6 defense combos.
  ...ARMOUR_CATEGORIES.flatMap(cat => DEF_COMBOS.map(combo => armourBase(cat, combo))),

  // Belts — the exotic-pool showcase (poise mass, endurance stamina).
  belt('belt_armor', 'Warbelt', { armor: 1 }),
  belt('belt_poise', 'Girdle', { poise: 1 }),
  belt('belt_endurance', 'Cinch', { endurance: 1 }),

  // Rings — identity implicits (D2 palette: the gem names the element).
  jewel('ring_coral', 'Coral Ring', 'ring', [line('life', 'flat', [8, 15])], 40),
  jewel('ring_lapis', 'Lapis Ring', 'ring', [line('mana', 'flat', [10, 18])], 40),
  jewel('ring_ruby', 'Ruby Ring', 'ring', [line('fireRes', 'flat', [0.1, 0.2])], 40),
  jewel('ring_sapphire', 'Sapphire Ring', 'ring', [line('coldRes', 'flat', [0.1, 0.2])], 40),
  jewel('ring_topaz', 'Topaz Ring', 'ring', [line('lightningRes', 'flat', [0.1, 0.2])], 40),
  jewel('ring_onyx', 'Onyx Ring', 'ring', [line('chaosRes', 'flat', [0.07, 0.15])], 30),
  jewel('ring_iron', 'Iron Ring', 'ring', [line('addedPhysical', 'flat', [1, 2])], 35),

  // Amulets — attribute identities + two build-defining oddballs.
  jewel('amulet_amber', 'Amber Amulet', 'amulet', [line('strength', 'flat', [3, 6])], 30),
  jewel('amulet_jade', 'Jade Amulet', 'amulet', [line('dexterity', 'flat', [3, 6])], 30),
  jewel('amulet_opal', 'Opal Amulet', 'amulet', [line('intelligence', 'flat', [3, 6])], 30),
  jewel('amulet_bone', 'Bone Amulet', 'amulet', [line('vitality', 'flat', [3, 6])], 30),
  jewel('amulet_pearl', 'Pearl Amulet', 'amulet', [line('energyShield', 'flat', [10, 18])], 25),
  jewel('amulet_carnelian', 'Carnelian Amulet', 'amulet', [line('healPower', 'increased', [0.05, 0.1])], 20),
];

export const ITEM_BASES: Record<string, ItemBaseDef> =
  Object.fromEntries(BASE_LIST.map(b => [b.id, b]));
