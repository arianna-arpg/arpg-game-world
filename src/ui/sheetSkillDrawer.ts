import type { Seat, World } from '../engine/world';
import { inspectSummons } from '../net/skillInspection';
import { SHEET_SKILL_SHELL, sheetSkillCard, syncSheetSkillOptions } from './sheetSkill';
import { InspectableTooltips, type InspectionReader } from './inspectableTooltips';
import { skillInspection, type SkillInspection } from './sheetSkillInspection';

interface Choice { skill?: string; expanded: boolean; body?: string }

/** One selection per character drives the card and every level of its inspection. */
export class SheetSkillInspector {
  private choices = new WeakMap<Seat['meta'], Choice>();
  private owner?: Seat['meta'];
  private slot?: HTMLElement;
  private skill?: string;
  private face = '';
  private facts = '';
  private drawer?: HTMLElement;
  private view?: SkillInspection;
  private tips: InspectableTooltips;

  constructor(private root: HTMLElement, refresh: () => void, readMechanic: InspectionReader) {
    this.tips = new InspectableTooltips(root, (key,source,parent) => this.view?.topics.get(key) ?? readMechanic(key,source,parent));
    root.addEventListener('keydown', event => {
      const select = (event.target as Element).closest<HTMLSelectElement>('select[data-sheet-inspect],select[data-inspect-body]');
      if (!select) return;
      const open = CSS.supports('selector(select:open)') && select.matches(':open');
      // Keep the focused card's one-key cycle when a customizable picker is closed.
      if (!open && select.hasAttribute('data-sheet-inspect') && CSS.supports('appearance','base-select') &&
        !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey &&
        (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();
        const index = select.selectedIndex + (event.key === 'ArrowDown' ? 1 : -1);
        if (index >= 0 && index < select.length) {
          select.selectedIndex = index;
          select.dispatchEvent(new Event('change',{bubbles:true}));
        }
      }
      // Let the browser navigate or cancel the picker before the game reads the same key.
      if (open || ['Tab','Enter',' ','Home','End','ArrowDown','ArrowUp'].includes(event.key)) event.stopPropagation();
    });
    root.addEventListener('click', event => {
      if (!(event.target as Element).closest('[data-skill-ribbon]') || !this.owner) return;
      const choice = this.choices.get(this.owner)!;
      choice.expanded = !choice.expanded;
      refresh();
    });
    root.addEventListener('change', event => {
      const select = event.target;
      if (!(select instanceof HTMLSelectElement) || !this.owner) return;
      const choice = this.choices.get(this.owner)!;
      if (select.matches('[data-sheet-inspect]') && this.owner.knownSkills.has(select.value)) {
        if (choice.skill === select.value) return;
        choice.skill = select.value;
        choice.body = undefined;
      } else if (select.matches('[data-inspect-body]')) choice.body = select.value;
      else return;
      refresh();
    }, true);
  }

  update(world: World, seat: Seat): void {
    const slot = this.root.querySelector<HTMLElement>('[data-sheet-skill-slot]');
    if (!slot) return;
    const owner = seat.meta;
    const ownerChanged = this.owner !== owner;
    if (ownerChanged) this.tips.clear();
    this.owner = owner;
    let choice = this.choices.get(owner);
    if (!choice) { choice = {expanded:false}; this.choices.set(owner,choice); }
    const known = owner.knownSkills;
    const inst = (choice.skill ? known.get(choice.skill) : undefined) ?? known.values().next().value;
    const id = inst?.def.id;
    if (choice.skill !== id) { choice.skill = id; choice.body = undefined; }

    const remount = this.slot !== slot || !!this.skill !== !!inst;
    const changed = ownerChanged || remount || this.skill !== id;
    if (changed) {
      this.tips.clearWithin(this.drawer);
      this.view = undefined;
    }
    this.slot = slot;
    this.skill = id;
    if (remount) {
      slot.innerHTML = inst ? SHEET_SKILL_SHELL : '<div class="sheet-skill-empty">Learn a skill to inspect its statistics.</div>';
      this.drawer = slot.querySelector<HTMLElement>('[data-skill-drawer]') ?? undefined;
    }
    if (!inst || !this.drawer) { choice.expanded = false; return; }

    const card = sheetSkillCard(world.seatHero(seat),inst);
    const select = slot.querySelector<HTMLSelectElement>('[data-sheet-inspect]')!;
    syncSheetSkillOptions(select,known);
    if (select.value !== inst.def.id) select.value = inst.def.id;
    if (remount || this.face !== card.face) {
      slot.style.setProperty('--skill-ink',inst.def.color);
      slot.querySelector('.sheet-skill-face')!.innerHTML = this.face = card.face;
    }
    if (remount || this.facts !== card.facts) slot.querySelector('[data-sheet-skill-facts]')!.innerHTML = this.facts = card.facts;
    if (select.dataset.uiHint !== card.hint) select.dataset.uiHint = card.hint;

    const drawer = this.drawer;
    if (drawer.hidden === choice.expanded) {
      drawer.hidden = !choice.expanded;
      slot.querySelector('[data-skill-ribbon]')!.setAttribute('aria-expanded',String(choice.expanded));
    }
    if (!choice.expanded) {
      if (this.view) { this.tips.clearWithin(drawer); this.view = undefined; }
      return;
    }
    const bodyId = choice.body?.startsWith('body/') ? Number(choice.body.slice(5)) : undefined;
    const next = skillInspection(inst,card.preview,inspectSummons(world,seat,inst.def.id,bodyId),choice.body);
    choice.body = next.bodyKey;
    if (this.view?.bodyKey !== next.bodyKey) this.tips.clearWithin(drawer);
    const selector = drawer.querySelector<HTMLElement>('[data-inspect-selector]')!;
    const details = drawer.querySelector<HTMLElement>('[data-inspect-details]')!;
    if (this.view?.selector !== next.selector) {
      const refocus = selector.contains(document.activeElement);
      selector.innerHTML = next.selector;
      if (refocus) selector.querySelector('select')?.focus({preventScroll:true});
    }
    if (this.view?.details !== next.details) {
      const keepOpen = this.view && this.view.bodyKey === next.bodyKey ? details.querySelector('details')?.open : undefined;
      const activeLink = details.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.inspectTopic : undefined;
      details.innerHTML = next.details;
      const more = details.querySelector('details');
      if (more && keepOpen !== undefined) more.open = keepOpen;
      if (activeLink) details.querySelector<HTMLElement>('[data-inspect-topic="'+CSS.escape(activeLink)+'"]')?.focus({preventScroll:true});
    }
    this.view = next;
    this.tips.refresh();
  }
}
