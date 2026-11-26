import type { Seat, World } from '../engine/world';
import { inspectSummons } from '../net/skillInspection';
import type { sheetSkillCard } from './sheetSkill';
import { InspectableTooltips } from './inspectableTooltips';
import { skillInspection, type SkillInspection } from './sheetSkillInspection';

type Choice = { skill: string; body?: string };

export class SheetSkillDrawer {
  private choices = new WeakMap<Seat['meta'], Choice>();
  private owner?: Seat['meta'];
  private skill?: string;
  private view?: SkillInspection;
  private rendered?: HTMLElement;
  private tips: InspectableTooltips;

  constructor(root: HTMLElement, refresh: () => void) {
    this.tips = new InspectableTooltips(root, key => this.view?.topics.get(key));
    root.addEventListener('click', event => {
      const ribbon = (event.target as Element).closest<HTMLElement>('[data-skill-ribbon]');
      if (!ribbon || !this.owner || !this.skill) return;
      if (this.choices.get(this.owner)?.skill === this.skill) this.choices.delete(this.owner);
      else this.choices.set(this.owner,{skill:this.skill});
      refresh();
    });
    root.addEventListener('change', event => {
      const select = event.target as HTMLSelectElement;
      if (!select.matches('[data-inspect-body]') || !this.owner || !this.skill) return;
      this.choices.set(this.owner,{skill:this.skill,body:select.value});
      refresh();
    });
  }

  update(root: HTMLElement, world: World, seat: Seat, card: ReturnType<typeof sheetSkillCard>): void {
    const owner = seat.meta;
    const drawer = root.querySelector<HTMLElement>('[data-skill-drawer]');
    const choice = this.choices.get(owner);
    if (this.owner !== owner || this.skill !== card.inst?.def.id || this.rendered !== drawer) this.tips.clear();
    this.owner = owner;
    this.skill = card.inst?.def.id;
    const mounted = this.rendered === drawer;
    this.rendered = drawer ?? undefined;
    if (!drawer || !card.inst || !card.preview || !choice || choice.skill !== this.skill) {
      if (drawer && !drawer.hidden) {
        drawer.hidden = true;
        root.querySelector('[data-skill-ribbon]')?.setAttribute('aria-expanded','false');
      }
      this.tips.clear();
      this.view = undefined;
      return;
    }
    const bodyId = choice.body?.startsWith('body/') ? Number(choice.body.slice(5)) : undefined;
    const next = skillInspection(card.inst,card.preview,inspectSummons(world,seat,card.inst.def.id,bodyId),choice.body);
    choice.body = next.bodyKey;
    const selector = drawer.querySelector<HTMLElement>('[data-inspect-selector]')!;
    const details = drawer.querySelector<HTMLElement>('[data-inspect-details]')!;
    if (!mounted || this.view?.selector !== next.selector) {
      const refocus = selector.contains(document.activeElement);
      selector.innerHTML = next.selector;
      if (refocus) selector.querySelector('select')?.focus({preventScroll:true});
    }
    if (!mounted || this.view?.details !== next.details) {
      const keepOpen = mounted && this.view?.bodyKey === next.bodyKey ? details.querySelector('details')?.open : undefined;
      const activeLink = (document.activeElement as HTMLElement)?.dataset.inspectTopic;
      details.innerHTML = next.details;
      const more = details.querySelector('details');
      if (more && keepOpen !== undefined) more.open = keepOpen;
      if (activeLink) details.querySelector<HTMLElement>(`[data-inspect-topic="${CSS.escape(activeLink)}"]`)?.focus({preventScroll:true});
    }
    if (this.view?.bodyKey !== next.bodyKey) this.tips.clear();
    this.view = next;
    drawer.hidden = false;
    root.querySelector('[data-skill-ribbon]')!.setAttribute('aria-expanded','true');
    this.tips.refresh();
  }
}
