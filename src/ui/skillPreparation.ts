import type { World } from '../engine/world';
import { findBagGem, skillOfGemItem } from '../engine/gemitems';
import { planSkillSlots } from '../meta/skillSlotMemory';
import { skillIconSvg } from '../render/skillIcons';

export const SKILL_PREPARATION_CFG = { enabled: true, maxChoices: 8 };
const esc = (s: string): string => s.replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** The existing lesson selects carried subjects. Every placement is the ordinary
 * item-to-rack action, narrowed to an empty seat; reading never learns or fills. */
export function skillPreparationHtml(world: World, slotLabels: readonly string[]): string {
  if (!SKILL_PREPARATION_CFG.enabled || world.clientActionHook || world.player.dead || world.player.downed) return '';
  const ids = world.mireilleLessonSkills().slice(0, Math.max(0, Math.min(8, SKILL_PREPARATION_CFG.maxChoices)));
  if (!ids.length && world.nearMireille() && world.mireilleGiftOwed()) return '<section data-skill-preparation style="padding:12px;margin:6px 0 16px;background:#1c2427;border:1px solid #6b9293;border-radius:6px">'
    + '<h3 style="margin:0 0 6px;color:#c6e1dc">A gift for the road</h3>'
    + '<p style="font-size:12px;line-height:1.5">Linger beside Mireille to receive her flasks. They need room in your pack.</p>'
    + '<button data-prepare-inventory style="padding:9px 12px">Open pack</button></section>';
  const plans = planSkillSlots(ids, world.player.skills.map(s => s?.def.id ?? null), world.account.skillSlotMemory);
  const rows = ids.flatMap(id => {
    const item = findBagGem(world.meta.items, 'skill', id), inst = item && skillOfGemItem(item);
    if (!item || !inst) return [];
    const slot = plans.get(id) ?? -1;
    const refusal = !world.meetsRequirements(id) ? 'Requirements not met'
      : slot < 0 ? 'No empty skill slot — arrange your Skills first' : null;
    const label = slotLabels[slot] ?? String(slot + 1);
    return ['<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 0;border-top:1px solid #4e535a">'
      + skillIconSvg(inst.def, 36)
      + '<span style="flex:1;min-width:130px"><strong>' + esc(inst.def.name) + '</strong><br>'
      + '<small style="color:#bab7ad">Skill Memory from your pack</small></span>'
      + '<button data-prepare-skill="' + item.uid + '" data-prepare-slot="' + slot + '"'
      + (refusal ? ' disabled' : '') + ' style="padding:9px 12px;white-space:normal">'
      + esc(refusal ?? 'Place on ' + label) + '</button></div>'];
  });
  return rows.length ? '<section data-skill-preparation style="padding:12px;margin:6px 0 16px;background:#1c2427;border:1px solid #6b9293;border-radius:6px;overflow-wrap:anywhere">'
    + '<h3 style="margin:0 0 6px;color:#c6e1dc">Ready for the road</h3>'
    + '<p style="font-size:12px;line-height:1.5;color:#c9c4b7;margin:6px 0 10px">Place each Memory in an empty skill slot. You can rearrange or remove it later in Skills.</p>'
    + rows.join('') + '</section>' : '';
}
