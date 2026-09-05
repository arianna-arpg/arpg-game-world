// ---------------------------------------------------------------------------
// THE BAG SORT — re-packing the tetris bag by a registered ORDER, as data.
//
// A BagSortMode is one comparator row. The sort re-orders the bag's placed
// items by it, then first-fit re-packs them row-major on a fresh board
// (autoPlace — the ONE placement law, so a sorted bag obeys exactly the cell
// law the hand does), ALL OR NOTHING: a pack that fails for any piece (a
// fresh order can tetris worse than the hand did) reverts every position, so
// a sort can never lose, stack or strand a piece. Pure over the array — the
// world mutates through sortBagItems (host-authoritative, meta-replicated),
// the panel only asks (the sortBag intent), tests drive it with no world.
//
// THE KEYS — footprint (area / height / width), KIND (the doll's own slot
// order for gear, then skill gems, support gems, Memory pouches, writs) and
// RARITY (the item ladder; a skill gem's own ladder) — are exported reads,
// because THE ITEM FILTER FRAMEWORK to come (Vault-gated, chartered in its
// own session) speaks this same vocabulary: a filter row is a sibling of a
// sort row, never a second sort. registerBagSortMode is the open door (the
// registerStamp override idiom: same id replaces in place).
// ---------------------------------------------------------------------------

import { autoPlace, type BoardDims } from './inventory';
import { itemGridSize } from './itemgen';
import { EQUIP_SLOTS, ITEM_RARITY_IDS, type ItemInstance } from './items';
import { SKILL_RARITIES } from './skills';
import { ITEM_BASES } from '../data/itembases';

/** 'desc' = the mode's natural face (largest / rarest / the doll's first kind
 *  leads); 'asc' = the mirror. The panel flips it by pressing the lit mode
 *  again; the intent carries it; ties fall to uid either way. */
export type BagSortDir = 'asc' | 'desc';

export interface BagSortMode {
  id: string;
  /** The button's word. */
  label: string;
  /** The button's GLYPH — the bag's header strip is icon-only; the title is
   *  the explanation, the glyph the handle. */
  icon: string;
  /** The button's hover line — what the order IS, so the player can predict it. */
  title: string;
  /** Negative = a before b. Ties fall to uid (sortBagItems appends it), so
   *  every mode is deterministic by construction. */
  compare(a: ItemInstance, b: ItemInstance): number;
}

// --- THE KEYS ---------------------------------------------------------------

/** The bag's KIND ladder: gear in the doll's own slot order (helmet → boots,
 *  weapons after — the registry decides, never a hand list), then loose
 *  skill gems, support gems, Memory pouches, writs. Unknown last. */
const GEAR_KIND_ORDER: string[] = [];
for (const slot of EQUIP_SLOTS) for (const cat of slot.accepts) if (!GEAR_KIND_ORDER.includes(cat)) GEAR_KIND_ORDER.push(cat);

export function bagKindRank(i: ItemInstance): number {
  if (i.gem) return GEAR_KIND_ORDER.length + (i.gem.kind === 'skill' ? 0 : 1);
  if (i.mem) return GEAR_KIND_ORDER.length + 2;
  if (i.writ) return GEAR_KIND_ORDER.length + 3;
  const cat = ITEM_BASES[i.baseId]?.category;
  const k = cat ? GEAR_KIND_ORDER.indexOf(cat) : -1;
  return k >= 0 ? k : GEAR_KIND_ORDER.length + 4;
}

/** A human word for the kind rank's bucket — the filter framework's label seam. */
export function bagKindLabel(i: ItemInstance): string {
  if (i.gem) return i.gem.kind === 'skill' ? 'skill gem' : 'support gem';
  if (i.mem) return 'memory';
  if (i.writ) return 'writ';
  return ITEM_BASES[i.baseId]?.category ?? 'other';
}

/** RARITY as a number on ONE ladder: gear by the item ladder, a skill gem by
 *  its own (the two palettes are one visual language already); supports,
 *  pouches and writs carry none and rank as common. */
export function bagRarityRank(i: ItemInstance): number {
  if (i.gem?.kind === 'skill') {
    const k = Object.keys(SKILL_RARITIES).indexOf(i.gem.rarity);
    return k >= 0 ? k : 0;
  }
  if (i.gem || i.mem || i.writ) return 0;
  const k = ITEM_RARITY_IDS.indexOf(i.rarity);
  return k >= 0 ? k : 0;
}

export function bagFootprint(i: ItemInstance): { w: number; h: number; area: number } {
  const s = itemGridSize(i);
  return { w: s.w, h: s.h, area: s.w * s.h };
}

// --- THE MODES --------------------------------------------------------------

const byArea = (a: ItemInstance, b: ItemInstance): number => bagFootprint(b).area - bagFootprint(a).area;
const byHeight = (a: ItemInstance, b: ItemInstance): number => bagFootprint(b).h - bagFootprint(a).h;
const byWidth = (a: ItemInstance, b: ItemInstance): number => bagFootprint(b).w - bagFootprint(a).w;
const byKind = (a: ItemInstance, b: ItemInstance): number => bagKindRank(a) - bagKindRank(b);
const byRarity = (a: ItemInstance, b: ItemInstance): number => bagRarityRank(b) - bagRarityRank(a);
const chain = (...cmps: ((a: ItemInstance, b: ItemInstance) => number)[]) =>
  (a: ItemInstance, b: ItemInstance): number => { for (const c of cmps) { const d = c(a, b); if (d) return d; } return 0; };

export const BAG_SORT_MODES: BagSortMode[] = [
  {
    id: 'space', label: 'Space', icon: '▦',
    title: 'Tightest pack: the biggest pieces first (area, then height), the small ones fill the holes',
    compare: chain(byArea, byHeight, byWidth, byKind),
  },
  {
    id: 'size', label: 'Size', icon: '⇕',
    title: 'By shape: the tallest pieces first, then the widest — same shapes land side by side',
    compare: chain(byHeight, byWidth, byKind, byRarity),
  },
  {
    id: 'type', label: 'Type', icon: '⚔',
    title: 'By kind, in the doll\'s own order (helmet → boots, weapons), then skill gems, supports, memories, writs',
    compare: chain(byKind, byArea, byRarity),
  },
  {
    id: 'rarity', label: 'Rarity', icon: '✦',
    title: 'The rarest first (unique → rare → magic → common; skill gems by their own ladder), then by kind',
    compare: chain(byRarity, byKind, byArea),
  },
];

/** Register (or replace, by id) a sort mode — the open door. */
export function registerBagSortMode(def: BagSortMode): void {
  const k = BAG_SORT_MODES.findIndex(m => m.id === def.id);
  if (k >= 0) BAG_SORT_MODES[k] = def; else BAG_SORT_MODES.push(def);
}

export function bagSortMode(id: string): BagSortMode | undefined {
  return BAG_SORT_MODES.find(m => m.id === id);
}

// --- THE SORT ---------------------------------------------------------------

/** Re-pack the bag's PLACED items in `mode`'s order (`dir` 'asc' mirrors
 *  it), first-fit row-major on a fresh board. True when the pack landed;
 *  false — with every position exactly as it was — when the mode is
 *  unknown, the bag holds nothing placed, or no pack fits (all or nothing:
 *  a sort never loses a piece). Unplaced items (none in a live bag; the
 *  sim's convenience) are neither moved nor counted.
 *
 *  THE HOLES' VETO: an order can tetris itself out — an ascending Space pack
 *  seats the small pieces first and can leave no hole a big one fits (the
 *  hand's own arrangement fit, so a dead press would be a lie). Three
 *  attempts, deterministic: the order as asked; then the pieces the order
 *  could not seat moved to the FRONT (largest first, the rest keeping the
 *  order — the face bends only where the board vetoed it); then the
 *  tightest pack of all (largest first outright). Only when even that fails
 *  does the sort revert. */
export function sortBagItems(bag: ItemInstance[], modeId: string, board?: BoardDims, dir: BagSortDir = 'desc'): boolean {
  const mode = bagSortMode(modeId);
  if (!mode) return false;
  const placed = bag.filter(i => i.x !== undefined && i.y !== undefined);
  if (placed.length === 0) return false;
  const before = placed.map(i => ({ i, x: i.x!, y: i.y! }));
  const sign = dir === 'asc' ? -1 : 1;
  const order = [...placed].sort((a, b) => sign * mode.compare(a, b) || a.uid - b.uid);
  const largestFirst = (a: ItemInstance, b: ItemInstance): number => byArea(a, b) || byHeight(a, b) || a.uid - b.uid;
  /** One pack attempt over a cleared board: the pieces it could not seat. */
  const attempt = (seq: readonly ItemInstance[]): ItemInstance[] => {
    for (const i of placed) { delete i.x; delete i.y; }
    const unseated: ItemInstance[] = [];
    for (const i of seq) if (!autoPlace(bag, i, board)) unseated.push(i);
    return unseated;
  };
  const vetoed = attempt(order);
  if (vetoed.length === 0) return true;
  const fronted = [...vetoed].sort(largestFirst);
  const rest = order.filter(i => !vetoed.includes(i));
  if (attempt([...fronted, ...rest]).length === 0) return true;
  if (attempt([...placed].sort(largestFirst)).length === 0) return true;
  for (const r of before) { r.i.x = r.x; r.i.y = r.y; }
  return false;
}
