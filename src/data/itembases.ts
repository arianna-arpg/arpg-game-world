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

/** One defense-combo column: the mix, a name per armour category, and the
 *  combo's AFFIX-THEME AFFINITY — an ES base LEANS caster (multiplier, not
 *  a gate), so a Vestment fills with spell lines more often than a
 *  Warplate does, while fortitude-on-Vestment stays possible and rare. */
interface DefCombo {
  key: string;
  mix: Record<string, number>;
  names: Partial<Record<ItemCategory, string>>;
  affinity?: Record<string, number>;
}

const ARMOUR_CATEGORIES: ItemCategory[] = ['helmet', 'chest', 'gloves', 'boots', 'legs'];

const DEF_COMBOS: DefCombo[] = [
  {
    key: 'armor', mix: { armor: 1 },
    names: { helmet: 'Casque', chest: 'Warplate', gloves: 'Gauntlets', boots: 'Greaves', legs: 'Cuisses' },
    affinity: { martial: 1.7, defense: 1.5 },
  },
  {
    key: 'evasion', mix: { evasion: 1 },
    names: { helmet: 'Hood', chest: 'Jerkin', gloves: 'Grips', boots: 'Treads', legs: 'Trews' },
    affinity: { ranger: 1.8, sustain: 1.2 },
  },
  {
    key: 'es', mix: { energyShield: 1 },
    names: { helmet: 'Circlet', chest: 'Vestment', gloves: 'Cuffs', boots: 'Slippers', legs: 'Silks' },
    affinity: { caster: 2.4 },
  },
  {
    key: 'armor_evasion', mix: { armor: 1, evasion: 1 },
    names: { helmet: 'Sallet', chest: 'Brigandine', gloves: 'Handguards', boots: 'Warboots', legs: 'Chausses' },
    affinity: { martial: 1.4, ranger: 1.4 },
  },
  {
    key: 'armor_es', mix: { armor: 1, energyShield: 1 },
    names: { helmet: 'Crown', chest: 'Templar Plate', gloves: 'Sigil Fists', boots: 'Bastion Boots', legs: 'Faulds' },
    affinity: { caster: 1.5, defense: 1.4 },
  },
  {
    key: 'evasion_es', mix: { evasion: 1, energyShield: 1 },
    names: { helmet: 'Cowl', chest: 'Shroud', gloves: 'Wraps', boots: 'Sandals', legs: 'Windtrews' },
    affinity: { caster: 1.6, ranger: 1.3 },
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
    affinity: combo.affinity,
    dropWeight: 100,
  };
}

// -------------------------------------------------------------- builders ---

function jewel(
  id: string, name: string, cat: ItemCategory, implicits: RangedLineDef[],
  dropWeight: number, affinity?: Record<string, number>,
): ItemBaseDef {
  const size = CATEGORY_SIZE[cat];
  return {
    id, name, category: cat, w: size.w, h: size.h,
    tags: ['jewelry', cat],
    implicits, dropWeight, affinity,
  };
}

function belt(id: string, name: string, mix: Record<string, number>, affinity?: Record<string, number>): ItemBaseDef {
  const size = CATEGORY_SIZE.belt;
  return {
    id, name, category: 'belt', w: size.w, h: size.h,
    tags: ['armour', 'belt', ...Object.keys(mix)],
    defense: mix, dropWeight: 70, affinity,
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
  belt('belt_armor', 'Warbelt', { armor: 1 }, { defense: 1.5, martial: 1.3 }),
  belt('belt_poise', 'Girdle', { poise: 1 }, { defense: 1.6 }),
  belt('belt_endurance', 'Cinch', { endurance: 1 }, { sustain: 1.6 }),

  // Rings — identity implicits (D2 palette: the gem names the element).
  jewel('ring_coral', 'Coral Ring', 'ring', [line('life', 'flat', [8, 15])], 40, { sustain: 1.4 }),
  jewel('ring_lapis', 'Lapis Ring', 'ring', [line('mana', 'flat', [10, 18])], 40, { caster: 1.7 }),
  jewel('ring_ruby', 'Ruby Ring', 'ring', [line('fireRes', 'flat', [0.1, 0.2])], 40),
  jewel('ring_sapphire', 'Sapphire Ring', 'ring', [line('coldRes', 'flat', [0.1, 0.2])], 40),
  jewel('ring_topaz', 'Topaz Ring', 'ring', [line('lightningRes', 'flat', [0.1, 0.2])], 40),
  jewel('ring_onyx', 'Onyx Ring', 'ring', [line('chaosRes', 'flat', [0.07, 0.15])], 30),
  jewel('ring_iron', 'Iron Ring', 'ring', [line('addedPhysical', 'flat', [1, 2])], 35, { martial: 1.8 }),

  // MONSTER INFREQUENTS — theme-pool bases (dropWeight 0: only their theme
  // mints them; see data/infrequents.ts). Signature implicits carry the
  // monster's flavor; the mi_<theme> tag opens the theme-only affixes.
  {
    id: 'boots_mi_goblin', name: 'Goblin Scrappers', category: 'boots',
    w: CATEGORY_SIZE.boots.w, h: CATEGORY_SIZE.boots.h,
    tags: ['armour', 'boots', 'evasion', 'mi_goblin'],
    defense: { evasion: 1 },
    implicits: [line('luck', 'increased', [0.08, 0.15])],
    dropWeight: 0,
  },
  {
    id: 'amulet_mi_goblin', name: 'Goblin Fetish', category: 'amulet',
    w: CATEGORY_SIZE.amulet.w, h: CATEGORY_SIZE.amulet.h,
    tags: ['jewelry', 'amulet', 'mi_goblin'],
    implicits: [line('apply_poison', 'flat', [0.06, 0.12])],
    dropWeight: 0,
  },
  {
    id: 'belt_mi_bandit', name: "Toll-Keeper's Cinch", category: 'belt',
    w: CATEGORY_SIZE.belt.w, h: CATEGORY_SIZE.belt.h,
    tags: ['armour', 'belt', 'endurance', 'mi_bandit'],
    defense: { endurance: 1 },
    implicits: [line('lifeOnKill', 'flat', [3, 6])],
    dropWeight: 0,
  },
  {
    id: 'gloves_mi_bandit', name: 'Cutpurse Grips', category: 'gloves',
    w: CATEGORY_SIZE.gloves.w, h: CATEGORY_SIZE.gloves.h,
    tags: ['armour', 'gloves', 'evasion', 'mi_bandit'],
    defense: { evasion: 1 },
    implicits: [line('attackSpeed', 'increased', [0.04, 0.08])],
    dropWeight: 0,
  },
  {
    id: 'chest_mi_undead', name: 'Cerecloth Shroud', category: 'chest',
    w: CATEGORY_SIZE.chest.w, h: CATEGORY_SIZE.chest.h,
    tags: ['armour', 'chest', 'energyShield', 'mi_undead'],
    defense: { energyShield: 1 },
    implicits: [line('chaosRes', 'flat', [0.08, 0.16])],
    dropWeight: 0,
  },
  {
    id: 'helmet_mi_undead', name: 'Gravebound Casque', category: 'helmet',
    w: CATEGORY_SIZE.helmet.w, h: CATEGORY_SIZE.helmet.h,
    tags: ['armour', 'helmet', 'armor', 'energyShield', 'mi_undead'],
    defense: { armor: 1, energyShield: 1 },
    implicits: [line('minionLife', 'increased', [0.08, 0.15])],
    dropWeight: 0,
  },

  // Amulets — attribute identities + two build-defining oddballs.
  jewel('amulet_amber', 'Amber Amulet', 'amulet', [line('strength', 'flat', [3, 6])], 30, { martial: 1.5 }),
  jewel('amulet_jade', 'Jade Amulet', 'amulet', [line('dexterity', 'flat', [3, 6])], 30, { ranger: 1.5 }),
  jewel('amulet_opal', 'Opal Amulet', 'amulet', [line('intelligence', 'flat', [3, 6])], 30, { caster: 1.8 }),
  jewel('amulet_bone', 'Bone Amulet', 'amulet', [line('vitality', 'flat', [3, 6])], 30, { sustain: 1.5 }),
  jewel('amulet_pearl', 'Pearl Amulet', 'amulet', [line('energyShield', 'flat', [10, 18])], 25, { caster: 2 }),
  jewel('amulet_carnelian', 'Carnelian Amulet', 'amulet', [line('healPower', 'increased', [0.05, 0.1])], 20, { sustain: 1.8 }),
];

export const ITEM_BASES: Record<string, ItemBaseDef> =
  Object.fromEntries(BASE_LIST.map(b => [b.id, b]));
