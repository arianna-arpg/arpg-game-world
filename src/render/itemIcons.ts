import { ITEM_BASES } from '../data/itembases';
import { MEMORY_KINDS } from '../engine/memories';

/** Inventory glyph vocabulary, keyed by the open equipment categories.
 *  Compact world silhouettes live in groundItems.ts. */
export const CATEGORY_GLYPHS: Record<string, string> = {
  helmet: '⛑', chest: '🛡', gloves: '🧤', boots: '👢', legs: '👖', belt: '➰',
  ring: '💍', amulet: '📿', weapon: '⚔', offhand: '🛡', quiver: '🏹', gem: '◇',
};

/** Only base identity is needed, including on lightweight co-op drop shells. */
export function itemGlyphForBase(baseId: string): string {
  const memory = Object.values(MEMORY_KINDS).find(k => k.base === baseId);
  return memory?.glyph ?? CATEGORY_GLYPHS[ITEM_BASES[baseId]?.category ?? ''] ?? '?';
}

/** Top-left leaves the lock (top-right) and level controls (bottom) clear. */
export const SUPPORT_BADGE = { glyph: '★', color: '#ffe3a0', background: '#21182e' };
