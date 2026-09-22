import type { ItemInstance } from '../engine/items';
import { ITEM_RARITIES } from '../engine/items';
import { ITEM_BASES } from '../data/itembases';
import { itemGridSize } from '../engine/itemgen';
import { CATEGORY_GLYPHS } from '../render/itemIcons';
import type { BoardDims } from '../engine/inventory';
import type { World, Seat } from '../engine/world';
import { STASH_DEFS } from '../data/stashes';
import { emptyStash, personalStashEntries, stashOverflow, stashPage } from '../engine/stash';

export const STASH_CELL_PX = 34;
export const stashEsc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** A reusable grid face. Policy, addresses and gestures are supplied by its
 * owner; item dimensions come from the same source as bags and vendors. */
export function stashGridHtml(board: BoardDims, items: readonly ItemInstance[], source: string, target: string, query = ''): string {
  const px = STASH_CELL_PX;
  let cells = '';
  for (let y = 0; y < board.h; y++) for (let x = 0; x < board.w; x++) {
    const open = !board.open || board.open(x, y);
    cells += `<div ${open ? `data-drop="${target}:${x}:${y}"` : ''} style="position:absolute;left:${x * px}px;top:${y * px}px;width:${px - 2}px;height:${px - 2}px;border:1px solid ${open ? '#51465e' : '#28232d'};background:${open ? '#17131e' : '#0c0b10'}">${open ? '' : '🔒'}</div>`;
  }
  const tiles = items.map(i => {
    const size = itemGridSize(i), color = ITEM_RARITIES[i.rarity].color;
    return `<div data-stash-tile data-tip="item" data-item-uid="${i.uid}" data-drag="${source}:${i.uid}" title="${stashEsc(i.name)}" aria-label="${stashEsc(i.name)}"
      style="position:absolute;left:${i.x! * px}px;top:${i.y! * px}px;width:${size.w * px - 2}px;height:${size.h * px - 2}px;border:2px solid ${color};box-sizing:border-box;border-radius:3px;background:#282031;display:flex;align-items:center;justify-content:center;font-size:19px;cursor:grab;opacity:${i.name.toLowerCase().includes(query.toLowerCase()) ? 1 : 0.22}">${CATEGORY_GLYPHS[ITEM_BASES[i.baseId]?.category ?? 'relic'] ?? '◇'}${i.locked ? '🔒' : ''}</div>`;
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
