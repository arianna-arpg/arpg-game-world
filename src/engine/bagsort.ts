// ---------------------------------------------------------------------------
// THE BAG SORT — re-packing the tetris bag by a registered ORDER, as data.
//
// A BagSortMode is one comparator row. The sort re-orders the bag's placed
// items by it, then re-packs them row-major, preferring adjacent blocks for
// identical content before falling back to first-fit on a fresh board
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

import { autoPlace, bagBoard, canPlaceAt, placeAt, type BoardDims } from './inventory';
import { itemGridSize } from './itemgen';
import { EQUIP_SLOTS, ITEM_RARITY_IDS, type ItemInstance } from './items';
import { SKILL_RARITIES } from './skills';
import { ITEM_BASES } from '../data/itembases';

/** 'desc' = the mode's natural face (largest / rarest / the doll's first kind
 *  leads); 'asc' = the mirror. The panel flips it by pressing the lit mode
 *  again; the intent carries it; ties group identical content before uid. */
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
  /** Negative = a before b. Ties group content, then uid (sortBagItems appends them), so
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

/** Stable across object insertion order (saved payloads can arrive through
 *  different paths). Arrays retain their order: sockets are positional. */
function canonicalContent(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalContent).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return `{${Object.keys(row).filter(k => row[k] !== undefined).sort()
      .map(k => `${JSON.stringify(k)}:${canonicalContent(row[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** Identity excludes residence and the keeper's mark, but retains every
 *  gameplay roll, socket, level and tree choice. Duplicate gear/gems stay
 *  together even when acquired at different times. */
export function bagContentKey(item: ItemInstance): string {
  const { uid, x, y, locked, ...content } = item;
  return canonicalContent(content);
}

const contentId = (i: ItemInstance): string => i.gem
  ? `${i.gem.kind}:${i.gem.kind === 'skill' ? i.gem.skillId : i.gem.supportId}`
  : i.baseId;
const compareText = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

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
 *  it), preferring adjacent duplicate blocks with first-fit fallback. True when the pack landed;
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
  // THE KEEPER'S MARK PINS (her ruling 2026-09-05: a lock LOCKS — no
  // salvage, no drop, no sort): locked pieces keep their cells and the
  // free pieces pack around them; only the free pieces are ordered, moved,
  // vetoed or reverted.
  const placed = bag.filter(i => i.x !== undefined && i.y !== undefined);
  const free = placed.filter(i => !i.locked);
  if (free.length === 0) return false;
  const before = free.map(i => ({ i, x: i.x!, y: i.y! }));
  const sign = dir === 'asc' ? -1 : 1;
  // Compute once per sort, never serialize cargo on every comparator call.
  const keys = new Map(free.map(i => [i, bagContentKey(i)]));
  const byContent = (a: ItemInstance, b: ItemInstance): number =>
    compareText(contentId(a), contentId(b)) || byRarity(a, b)
    || (b.gem?.level ?? b.tier) - (a.gem?.level ?? a.tier)
    || compareText(keys.get(a)!, keys.get(b)!);
  const order = [...free].sort((a, b) => sign * (mode.compare(a, b) || byContent(a, b)) || a.uid - b.uid);
  const largestFirst = (a: ItemInstance, b: ItemInstance): number =>
    byArea(a, b) || byHeight(a, b) || byWidth(a, b) || byKind(a, b) || byContent(a, b) || a.uid - b.uid;
  /** One pack attempt over a board cleared of the FREE pieces (the pinned
   *  stay seated): the pieces it could not seat. */
  const dims = board ?? bagBoard();
  // A tied run should LOOK grouped too: first-fit alone scatters 1x1 gems
  // into unrelated holes above tall gear. Prefer one adjacent block, widest
  // first, then fold onto more rows. Pins remain ordinary occupied cells.
  const placeGroup = (group: readonly ItemInstance[]): boolean => {
    const { w, h } = itemGridSize(group[0]);
    for (let cols = Math.min(group.length, Math.floor(dims.w / w)); cols >= 1; cols--) {
      const rows = Math.ceil(group.length / cols);
      for (let y = 0; y <= dims.h - rows * h; y++) for (let x = 0; x <= dims.w - cols * w; x++) {
        if (!group.every((i, n) => canPlaceAt(bag, i, x + n % cols * w, y + Math.floor(n / cols) * h, dims))) continue;
        group.forEach((i, n) => placeAt(bag, i, x + n % cols * w, y + Math.floor(n / cols) * h, dims));
        return true;
      }
    }
    return false;
  };
  const attempt = (seq: readonly ItemInstance[], grouped = true): ItemInstance[] => {
    for (const i of free) { delete i.x; delete i.y; }
    const unseated: ItemInstance[] = [];
    for (let start = 0; start < seq.length;) {
      let end = start + 1;
      if (grouped) while (end < seq.length && keys.get(seq[end]) === keys.get(seq[start])) end++;
      const group = seq.slice(start, end);
      if (group.length === 1 || !placeGroup(group)) {
        for (const i of group) if (!autoPlace(bag, i, dims)) unseated.push(i);
      }
      start = end;
    }
    return unseated;
  };
  // If adjacent blocks cost the last usable holes, the ordinary tight pack
  // gets its chance before promoting oversized pieces. Never sacrifice fit.
  const tryOrder = (seq: readonly ItemInstance[]): ItemInstance[] => {
    const missed = attempt(seq);
    return missed.length ? attempt(seq, false) : missed;
  };
  const vetoed = tryOrder(order);
  if (vetoed.length === 0) return true;
  const fronted = [...vetoed].sort(largestFirst);
  const rest = order.filter(i => !vetoed.includes(i));
  if (tryOrder([...fronted, ...rest]).length === 0) return true;
  if (tryOrder([...free].sort(largestFirst)).length === 0) return true;
  for (const r of before) { r.i.x = r.x; r.i.y = r.y; }
  return false;
}
