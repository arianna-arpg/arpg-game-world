import { ITEM_BASES } from '../data/itembases';
import { MEMORY_KINDS } from '../engine/memories';

/** Shared item vocabulary for DOM inventory tiles and Canvas world drops.
 *  Categories are open registry keys: extending this table updates both views. */
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
