import type { ItemInstance } from '../engine/items';
import { ITEM_RARITIES } from '../engine/items';
import { itemGridSize } from '../engine/itemgen';
import { itemFaceHtml } from '../render/itemIcons';
import type { BoardDims } from '../engine/inventory';
import type { World, Seat } from '../engine/world';
import { STASH_DEFS } from '../data/stashes';
import { emptyStash, personalStashEntries, stashOverflow, stashPage } from '../engine/stash';

export const STASH_CELL_PX = 34;
export const stashEsc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const stashCellsByBoard = new WeakMap<BoardDims, Map<string, string>>();
const plainStashCellsCache = new Map<string, string>();

function cachedStashCells(board: BoardDims, target: string): string {
  const px = STASH_CELL_PX;
  if (!board.open) {
    const plainKey = `${board.w}x${board.h}:${target}`;
    const hit = plainStashCellsCache.get(plainKey);
    if (hit !== undefined) return hit;
    let cells = '';
    for (let y = 0; y < board.h; y++) for (let x = 0; x < board.w; x++) {
      cells += `<div data-drop="${target}:${x}:${y}" style="position:absolute;left:${x * px}px;top:${y * px}px;width:${px - 2}px;height:${px - 2}px;border:1px solid var(--inv-cell-edge,#51465e);background:var(--inv-cell-fill,#17131e)"></div>`;
    }
    plainStashCellsCache.set(plainKey, cells);
    return cells;
  }
  let byTarget = stashCellsByBoard.get(board);
  if (!byTarget) {
    byTarget = new Map();
    stashCellsByBoard.set(board, byTarget);
  }
  const hit = byTarget.get(target);
  if (hit !== undefined) return hit;
  let cells = '';
  for (let y = 0; y < board.h; y++) for (let x = 0; x < board.w; x++) {
    const open = board.open(x, y);
    cells += `<div ${open ? `data-drop="${target}:${x}:${y}"` : ''} style="position:absolute;left:${x * px}px;top:${y * px}px;width:${px - 2}px;height:${px - 2}px;border:1px solid ${open ? 'var(--inv-cell-edge,#51465e)' : '#28232d'};background:${open ? 'var(--inv-cell-fill,#17131e)' : '#0c0b10'}">${open ? '' : '🔒'}</div>`;
  }
  byTarget.set(target, cells);
  return cells;
}

/** A reusable grid face. Policy, addresses and gestures are supplied by its
 * owner; item dimensions come from the same source as bags and vendors. */
export function stashGridHtml(board: BoardDims, items: readonly ItemInstance[], source: string, target: string, query = ''): string {
  const px = STASH_CELL_PX;
  const cells = cachedStashCells(board, target);
  const qLower = query ? query.toLowerCase() : '';
  const tiles = items.map(i => {
    const size = itemGridSize(i), color = ITEM_RARITIES[i.rarity].color;
    const matches = !qLower || i.name.toLowerCase().includes(qLower);
    return `<div class="stash-item-tile" data-stash-tile data-tip="item" data-item-uid="${i.uid}" data-drag="${source}:${i.uid}" title="${stashEsc(i.name)}" aria-label="${stashEsc(i.name)}"
      style="position:absolute;left:${i.x! * px}px;top:${i.y! * px}px;width:${size.w * px - 2}px;height:${size.h * px - 2}px;border:2px solid ${color};box-sizing:border-box;border-radius:3px;background:var(--inv-item-fill,#282031);display:flex;align-items:center;justify-content:center;font-size:19px;cursor:grab;opacity:${matches ? 1 : 0.22}">${itemFaceHtml(i.baseId)}${i.locked ? '<span style="position:absolute;top:0;right:1px;font-size:10px">🔒</span>' : ''}</div>`;
  }).join('');
  return `<div class="stash-grid" style="position:relative;width:${board.w * px}px;height:${board.h * px}px;margin:8px 0">${cells}${tiles}</div>`;
}

export function personalStashHtml(w: World, seat: Seat): string {
  const def = STASH_DEFS[w.seatModeDef(seat).stash ?? ''];
  if (!def || seat !== w.localSeat || w.clientActionHook) return '';
  const stash = seat.meta.stash ?? { items: [], layout: emptyStash(def) };
  const entries = personalStashEntries(stash);
  return `<h3>${stashEsc(seat.meta.name)}’s locker</h3><div class="desc">Private to this Immortal. Stored items survive a fall. Drag from your pack to store; drag back or right-click to retrieve.</div>
    ${stashGridHtml(def.board, stashPage(entries, stash.layout, 0), 'personalStashTile', 'personalStashCell')}
    ${stashOverflow(entries, stash.layout).map(({ item }) => `<button data-personal-stash-take="${item.uid}">Recover ${stashEsc(item.name)}</button>`).join('')}
    <details><summary>Store from pack / retrieve</summary>${seat.meta.items.filter(def.accepts).map(i => `<button data-personal-stash-store="${i.uid}">Store ${stashEsc(i.name)}</button>`).join('')}
    ${stash.items.map(i => `<button data-personal-stash-take="${i.uid}">Retrieve ${stashEsc(i.name)}</button>`).join('')}</details>`;
}
