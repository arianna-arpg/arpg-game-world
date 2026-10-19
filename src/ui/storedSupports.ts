import type { ItemInstance } from '../engine/items';
import { bagSkillSupport, skillGemPayloadOf } from '../engine/gemitems';
const escape = (s: string): string => s.replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Bag-owned sockets stay addressable without replacing the active skill. */
export function storedSupportsHtml(items: readonly ItemInstance[], refusal: string | null): string {
  const rows = items.flatMap(item => {
    const payload = skillGemPayloadOf(item);
    if (!payload) return [];
    const buttons = payload.sockets.flatMap((_, index) => {
      const gem = bagSkillSupport(item, index);
      return gem ? ['<button data-unsocket-bag="' + item.uid + ':' + index
        + '" style="font-size:11px;padding:5px 8px;max-width:100%;white-space:normal"'
        + (refusal ? ' disabled title="' + escape(refusal) + '"' : '')
        + '>Remove ' + escape(gem.def.name) + ' · L' + gem.level + '</button>'] : [];
    });
    return buttons.length ? ['<div data-stored-skill="' + item.uid + '" style="padding:8px 0;border-top:1px solid #45404d">'
      + '<div style="font-size:12px;color:#dfd2bb;margin-bottom:6px">' + escape(item.name) + ' · ' + escape(payload.rarity)
      + ' · Lv ' + payload.level + '</div><div style="display:flex;flex-wrap:wrap;gap:6px">' + buttons.join('') + '</div></div>'] : [];
  });
  return rows.length ? '<section data-stored-supports style="padding:8px"><h3>Supports in stored skills</h3>'
    + '<p style="font-size:11px;line-height:1.5;color:#b6adbf;margin:5px 0">Return a support to your bag, then fit it into a seated skill.</p>'
    + rows.join('') + '</section>' : '';
}
