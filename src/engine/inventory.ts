// ---------------------------------------------------------------------------
// BAG GRID — the tetris inventory, as pure functions.
//
// A bag is just ItemInstance[] where every member carries a grid x/y; the
// board is ITEM_CFG.inventory and footprints come from the item's base.
// Placement, collision, first-fit auto-place, and swap-candidate queries are
// all pure over that array — the world mutates through these helpers (host-
// authoritative, meta-replicated), the panel renders straight from them, and
// tests can drive a bag with no world at all. Making room is the mini-game;
// nothing here auto-sorts or auto-discards on the player's behalf.
// ---------------------------------------------------------------------------

import { itemGridSize } from './itemgen';
import { ITEM_CFG, type ItemInstance } from './items';

export function bagWidth(): number { return ITEM_CFG.inventory.w; }
export function bagHeight(): number { return ITEM_CFG.inventory.h; }

/** An alternate board's dims. Every placement helper takes one optionally —
 *  absent = the player bag (ITEM_CFG.inventory), so a vendor's counter
 *  glass, a future stash page, any grid at all rides the SAME pure cell
 *  law: one collision test, one first-fit, drawn == held everywhere. */
export interface BoardDims { w: number; h: number }

function placed(i: ItemInstance): boolean {
  return i.x !== undefined && i.y !== undefined;
}

function overlapsRect(i: ItemInstance, x: number, y: number, w: number, h: number): boolean {
  if (!placed(i)) return false;
  const s = itemGridSize(i);
  return i.x! < x + w && x < i.x! + s.w && i.y! < y + h && y < i.y! + s.h;
}

/** The item covering a cell, if any. */
export function bagItemAt(bag: readonly ItemInstance[], x: number, y: number): ItemInstance | undefined {
  return bag.find(i => overlapsRect(i, x, y, 1, 1));
}

/** Everything a footprint at (x,y) would collide with (swap-candidate query). */
export function overlappingItems(
  bag: readonly ItemInstance[], item: ItemInstance, x: number, y: number,
): ItemInstance[] {
  const s = itemGridSize(item);
  return bag.filter(i => i.uid !== item.uid && overlapsRect(i, x, y, s.w, s.h));
}

export function canPlaceAt(
  bag: readonly ItemInstance[], item: ItemInstance, x: number, y: number, board?: BoardDims,
): boolean {
  const s = itemGridSize(item);
  const bw = board?.w ?? bagWidth(), bh = board?.h ?? bagHeight();
  if (x < 0 || y < 0 || x + s.w > bw || y + s.h > bh) return false;
  return overlappingItems(bag, item, x, y).length === 0;
}

/** Place (or move) an item at a cell; false (untouched) when blocked. */
export function placeAt(
  bag: ItemInstance[], item: ItemInstance, x: number, y: number, board?: BoardDims,
): boolean {
  if (!canPlaceAt(bag, item, x, y, board)) return false;
  item.x = x;
  item.y = y;
  if (!bag.some(i => i.uid === item.uid)) bag.push(item);
  return true;
}

/** First-fit scan, row-major. False when the bag genuinely has no hole big
 *  enough — the caller decides what "inventory full" means (ground, note). */
export function autoPlace(bag: ItemInstance[], item: ItemInstance, board?: BoardDims): boolean {
  const s = itemGridSize(item);
  const bw = board?.w ?? bagWidth(), bh = board?.h ?? bagHeight();
  for (let y = 0; y <= bh - s.h; y++) {
    for (let x = 0; x <= bw - s.w; x++) {
      if (placeAt(bag, item, x, y, board)) return true;
    }
  }
  return false;
}

/** Pull an item out of the bag by uid (its x/y are cleared — a held/equipped
 *  item has no cell). */
export function removeFromBag(bag: ItemInstance[], uid: number): ItemInstance | undefined {
  const idx = bag.findIndex(i => i.uid === uid);
  if (idx < 0) return undefined;
  const [item] = bag.splice(idx, 1);
  delete item.x;
  delete item.y;
  return item;
}
