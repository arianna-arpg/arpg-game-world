import { ITEM_BASES } from '../data/itembases';
import { MEMORY_KINDS } from '../engine/memories';

/** Inventory glyph vocabulary, keyed by the open equipment categories.
 *  Compact world silhouettes live in groundItems.ts. */
export const CATEGORY_GLYPHS: Record<string, string> = {
  helmet: '⛑', chest: '🛡', gloves: '🧤', boots: '👢', legs: '👖', belt: '➰',
  ring: '💍', amulet: '📿', weapon: '⚔', offhand: '🛡', quiver: '🏹', gem: '◇',
  /** THE RELIQUARY's pieces (data/containers.ts): the warding eye. */
  relic: '🧿',
};

/** Only base identity is needed, including on lightweight co-op drop shells. */
export function itemGlyphForBase(baseId: string): string {
  const memory = Object.values(MEMORY_KINDS).find(k => k.base === baseId);
  return memory?.glyph ?? CATEGORY_GLYPHS[ITEM_BASES[baseId]?.category ?? ''] ?? '?';
}

/** Top-left leaves the lock (top-right) and level controls (bottom) clear. */
export const SUPPORT_BADGE = { size: 12, url: new URL('../../site/assets/favicon.ico', import.meta.url).href };
/** The shipped, size-hinted Hollow Wake insignia; bundled for offline play too. */
export function supportBadgeHtml(): string {
  return `<img class="support-insignia" src="${SUPPORT_BADGE.url}" alt="Support Memory" title="Support Memory"
    width="${SUPPORT_BADGE.size}" height="${SUPPORT_BADGE.size}" draggable="false"
    style="position:absolute;top:0;left:0;width:${SUPPORT_BADGE.size}px;height:${SUPPORT_BADGE.size}px;pointer-events:none">`;
}
