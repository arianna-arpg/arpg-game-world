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

// --- THE BAG BOARD (her ask 2026-09-05: the grid is DERIVED, never a literal)
// The player bag's dims are ITEM_CFG.inventory (the base) plus every owned
// EXPANSION (BAG_CFG.expansions — an open ladder keyed on account features;
// it ships EMPTY: the Vault rung that sells rows is the chartered follow-on,
// registerBagExpansion is its one door). bagWidth()/bagHeight() — the default
// board every placement helper reads — resolve through ONE installed source
// (the World installs its account's fold at construction, lazily read so a
// mid-run purchase grows the bag on the next placement; a render-shell client
// installs the host's SHIPPED dims), so every call site grows together and
// the panel draws exactly the board the engine tests.

/** One rung of bag growth: owning `feature` adds rows / cols to the base. */
export interface BagExpansion { feature: string; rows?: number; cols?: number }

export const BAG_CFG = {
  /** The expansion ladder — open; registerBagExpansion appends/replaces by feature. */
  expansions: [] as BagExpansion[],
  /** Hard rails: the panel's width is the seam's (cols stay put for now); rows scroll. */
  maxCols: 12,
  maxRows: 12,
};

/** Register (or replace, by feature id) an expansion rung. */
export function registerBagExpansion(def: BagExpansion): void {
  const k = BAG_CFG.expansions.findIndex(e => e.feature === def.feature);
  if (k >= 0) BAG_CFG.expansions[k] = def; else BAG_CFG.expansions.push(def);
}

/** The board an account's features earn: base + every owned rung, railed. Pure. */
export function bagBoardFor(features: ReadonlySet<string> | undefined): BoardDims {
  let w = ITEM_CFG.inventory.w, h = ITEM_CFG.inventory.h;
  for (const e of BAG_CFG.expansions) {
    if (!features?.has(e.feature)) continue;
    w += e.cols ?? 0;
    h += e.rows ?? 0;
  }
  return { w: Math.min(BAG_CFG.maxCols, w), h: Math.min(BAG_CFG.maxRows, h) };
}

let boardSource: (() => BoardDims) | null = null;

/** Install the live board read (the World's account fold; a client's shipped
 *  dims); null restores the bare base (headless rigs, the sim). */
export function setBagBoardSource(fn: (() => BoardDims) | null): void { boardSource = fn; }

/** THE ONE READ of the player bag's board. */
export function bagBoard(): BoardDims {
  return boardSource?.() ?? { w: ITEM_CFG.inventory.w, h: ITEM_CFG.inventory.h };
}

export function bagWidth(): number { return bagBoard().w; }
export function bagHeight(): number { return bagBoard().h; }

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

/** THE SWAP TEST — the engine's single-blocker rule as ONE pure read: the
 *  blocker a footprint at (x,y) would trade places with, or null when the
 *  move is clean, blocked by more than one piece, off the board, or the
 *  blocker would not fit the mover's vacated spot. moveBagItem swaps only
 *  on this verdict and the bag's landing preview paints only this verdict —
 *  drawn == tested. */
export function swapBlockerFits(
  bag: readonly ItemInstance[], item: ItemInstance, x: number, y: number, board?: BoardDims,
): ItemInstance | null {
  const s = itemGridSize(item);
  const bw = board?.w ?? bagWidth(), bh = board?.h ?? bagHeight();
  if (x < 0 || y < 0 || x + s.w > bw || y + s.h > bh || !placed(item)) return null;
  const blockers = overlappingItems(bag, item, x, y);
  if (blockers.length !== 1) return null;
  const other = blockers[0];
  const moved: ItemInstance = { ...item, x, y };
  const rest = bag.filter(i => i.uid !== item.uid && i.uid !== other.uid);
  return canPlaceAt([...rest, moved], other, item.x!, item.y!, board) ? other : null;
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
