import type { World } from '../engine/world';
import { findBagGem, skillOfGemItem } from '../engine/gemitems';

export const SKILL_PREPARATION_CFG = { enabled: true };
const esc = (s: string): string => s.replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Optional instructions for the account's existing lesson. Reading or opening
 * this guide never places a Memory, awards an item or completes a lesson. */
export function skillPreparationHtml(world: World, _slotLabels: readonly string[], inInventory = false): string {
  if (!SKILL_PREPARATION_CFG.enabled || world.clientActionHook || world.player.dead || world.player.downed) return '';
  const ids = world.mireilleLessonSkills();
  const waiting = !ids.length && world.nearMireille() && world.mireilleGiftOwed();
  if (!ids.length && !waiting) return '';
  const names = ids.flatMap(id => {
    const item = findBagGem(world.meta.items, 'skill', id), inst = item && skillOfGemItem(item);
    return inst ? [esc(inst.def.name)] : [];
  });
  const pack = inInventory ? '' : '<li><button data-prepare-inventory type="button">Open pack</button></li>';
  const steps = waiting
    ? '<li>Make room for two flask Memories in your pack.</li><li>Linger beside Mireille to receive her gift.</li>'
    : '<li>Find the highlighted <strong>' + names.join(' and ') + '</strong> Memory in your pack.</li>'
      + '<li>Open the <strong>Skills</strong> drawer using the tab on the pack.</li>'
      + '<li>Drag a flask Memory from the pack onto an empty skill slot. You choose its binding.</li>'
      + (names.length > 1 ? '<li>Do the same for the other flask. Mireille will fill them once both are ready.</li>'
        : '<li>Only this flask remains. Place it to finish the lesson.</li>');
  return '<details data-skill-preparation style="max-width:100%;margin:6px 0 10px;padding:8px;box-sizing:border-box;'
    + 'background:#1c2427;border:1px solid #526c68;border-radius:5px;font-size:11px;line-height:1.5;overflow-wrap:anywhere">'
    + '<summary style="cursor:pointer;color:#c6e1dc">Show me how to prepare my flasks</summary>'
    + '<ol style="padding-left:22px;margin:8px 0">' + pack + steps + '</ol></details>';
}
