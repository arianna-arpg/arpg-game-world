import { esc } from './dom';
import { inspectionEnabled } from './inspectionMode';
import { enableTooltipMove, type TooltipPosition } from './tooltipMove';
import { hideTooltip, holdInteractiveTooltip, TIP_CFG, tooltipHtml, tooltipSource, type TooltipContent } from './tooltip';

export function inspectionLink(key: string, label: string): string {
  const name = esc(label);
  return `<span class="inspect-term"><span class="inspect-label">${name}</span><button type="button" class="inspect-link" data-inspect-topic="${esc(key)}" aria-haspopup="dialog">${name}</button></span>`;
}

let active: InspectableTooltips | undefined;
export const inspectionOpen = (): boolean => !!active;
export type InspectionReader = (key: string, source: HTMLElement, parentKey?: string) => TooltipContent | undefined;
interface InspectionCard {
  key: string; card: HTMLElement; anchor: HTMLElement; html: string;
  live?: boolean;
  position?: TooltipPosition;
}

/** One visible trail across the game. A scoped reader can supply live actor-specific topics. */
export class InspectableTooltips {
  private trail: InspectionCard[] = [];
  private frame = 0;
  private origin?: HTMLElement;
  private releaseHover?: () => void;
  private inspectionSource?: HTMLElement;
  private lastLiveRead = 0;

  constructor(private root: HTMLElement, private read: InspectionReader) {
    root.addEventListener('click', this.click);
    root.addEventListener('keydown',this.activate);
  }

  private activate = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const button = event.target;
    if (!(button instanceof HTMLButtonElement) || !button.matches('[data-inspect-topic],[data-inspect-close]')) return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) button.click();
  };

  private click = (event: MouseEvent): void => {
    const button = (event.target as Element).closest<HTMLElement>('[data-inspect-topic],[data-inspect-close]');
    if (!button) return;
    const parent = this.trail.findIndex(entry => entry.card.contains(button));
    if (button.hasAttribute('data-inspect-close')) {
      if (parent >= 0) { event.stopPropagation(); this.trim(parent, true); }
      return;
    }
    if (!inspectionEnabled()) return;
    const key = button.dataset.inspectTopic!;
    const surface = button.closest('#tooltip') ? tooltipSource() ?? button : button;
    const source = parent >= 0 ? this.inspectionSource! : surface.closest<HTMLElement>('[data-mechanic-source],.panel') ?? surface;
    const parentKey = parent >= 0 ? this.trail[parent].key : source.closest<HTMLElement>('[data-mechanic-source]')?.dataset.mechanicSource;
    const content = this.read(key,source,parentKey);
    if (!content) return;
    event.stopPropagation();
    if (active && active !== this) active.clear();
    const existing = this.trail.findIndex(entry => entry.key === key);
    if (existing >= 0 && existing <= parent) {
      this.trim(existing + 1, false);
      this.trail[existing].card.focus();
      return;
    }
    this.trim(parent + 1, false);
    if (!this.trail.length) {
      this.inspectionSource = source;
      this.origin = button.closest<HTMLElement>('[data-inspect-scope],#tooltip,.cx-detail,.panel') ?? this.root;
      if (this.origin.id === 'tooltip') this.releaseHover = holdInteractiveTooltip();
      else hideTooltip();
      active = this;
    }
    const card = document.createElement('section');
    card.className = 'inspection-tooltip';
    card.popover = 'manual';
    card.tabIndex = -1;
    card.setAttribute('role', 'dialog');
    card.addEventListener('keydown', event => { if (event.key === 'Tab') event.stopPropagation(); });
    card.setAttribute('aria-label', button.textContent || 'Mechanic detail');
    card.innerHTML = '<button type="button" data-inspect-close aria-label="Close detail">×</button><div data-inspect-content></div>';
    const html = tooltipHtml(content);
    card.lastElementChild!.innerHTML = html;
    // Hover cards replace their contents, so keep their companions beside them in the DOM.
    (this.origin?.id === 'tooltip' ? this.root : this.origin ?? this.root).append(card);
    card.showPopover();
    const entry: InspectionCard = { key, card, anchor: button, html, live:content.live };
    this.trail.push(entry);
    if (entry.live) this.lastLiveRead = performance.now();
    enableTooltipMove(card,position => { entry.position = position; this.layout(); });
    if (this.trail.length === 1) {
      window.addEventListener('keydown', this.keyDown, true);
      document.addEventListener('pointerdown', this.outside, true);
    }
    this.layout();
    card.focus({ preventScroll:true });
  };

  clear(): void { this.trim(0, false); }
  clearWithin(owner?: HTMLElement): void { if (owner && this.origin && owner.contains(this.origin)) this.clear(); }
  dispose(): void {
    this.clear();
    this.root.removeEventListener('click',this.click);
    this.root.removeEventListener('keydown',this.activate);
  }

  private trim(depth: number, restore: boolean): void {
    if (depth < 0) return;
    const removed = this.trail.splice(depth);
    for (const { card } of removed) card.remove();
    if (restore && removed[0]) {
      const anchor = removed[0].anchor;
      const target = inspectionEnabled() ? anchor : anchor.closest<HTMLElement>('.inspect-term') ?? anchor;
      if (target !== anchor) target.tabIndex = -1;
      target.focus({preventScroll:true});
    }
    if (!this.trail.length) {
      if (active === this) active = undefined;
      this.releaseHover?.();
      this.releaseHover = undefined;
      this.origin = undefined;
      this.inspectionSource = undefined;
      cancelAnimationFrame(this.frame);
      window.removeEventListener('keydown', this.keyDown, true);
      document.removeEventListener('pointerdown', this.outside, true);
    }
  }

  private keyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!event.repeat) this.trim(this.trail.length - 1, true);
  };

  private outside = (event: PointerEvent): void => {
    const hit = event.composedPath();
    if (!this.trail.some(entry => hit.includes(entry.card) || hit.includes(entry.anchor))) this.clear();
  };

  private layout = (): void => {
    cancelAnimationFrame(this.frame);
    if (this.trail.some(entry => entry.live) && performance.now() - this.lastLiveRead >= TIP_CFG.liveRefreshMs) this.refresh();
    for (const [index, entry] of this.trail.entries()) {
      const { card, key } = entry;
      if (!card.isConnected || !this.origin?.getClientRects().length || this.origin.closest('.hidden,.folio-shelved,[hidden]')) {
        this.clear(); return;
      }
      if (!entry.anchor.isConnected) {
        const scope = index ? this.trail[index - 1].card : this.origin;
        const replacement = [...scope.querySelectorAll<HTMLElement>(`[data-inspect-topic="${CSS.escape(key)}"]`)]
          .find(link => link.closest('.inspection-tooltip') === (index ? scope : null));
        if (!replacement) { this.trim(index, false); break; }
        entry.anchor = replacement;
      }
      const anchor = (entry.anchor.closest('.inspect-term') ?? entry.anchor).getBoundingClientRect();
      const pane = (index ? this.trail[index - 1].card : this.origin.closest<HTMLElement>('.panel') ?? this.origin).getBoundingClientRect();
      if (!entry.position && (!anchor.height || anchor.bottom <= pane.top || anchor.top >= pane.bottom)) { this.trim(index, false); break; }
      const bounds = card.getBoundingClientRect();
      const gap = 6, width = bounds.width, height = bounds.height;
      const zoom = width / card.offsetWidth || 1;
      const right = pane.right + gap, left = pane.left - gap - width;
      const preferredX = entry.position?.x ?? (right + width <= innerWidth - gap ? right : left >= gap ? left : anchor.left);
      const x = Math.max(gap,Math.min(preferredX,innerWidth - gap - width));
      const y = Math.max(gap, Math.min(entry.position?.y ?? anchor.top, innerHeight - height - gap));
      const leftPx = Math.round(x / zoom) + 'px', topPx = Math.round(y / zoom) + 'px';
      if (card.style.left !== leftPx) card.style.left = leftPx;
      if (card.style.top !== topPx) card.style.top = topPx;
    }
    if (this.trail.length) this.frame = requestAnimationFrame(this.layout);
  };

  refresh(): void {
    this.lastLiveRead = performance.now();
    for (const [index, entry] of this.trail.entries()) {
      const source = this.inspectionSource!;
      const parentKey = index ? this.trail[index - 1].key : source.closest<HTMLElement>('[data-mechanic-source]')?.dataset.mechanicSource;
      const content = this.read(entry.key,source,parentKey);
      if (!content) { this.trim(index, false); break; }
      const html = tooltipHtml(content);
      if (entry.html !== html) {
        const active = entry.card.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.inspectTopic : undefined;
        entry.card.lastElementChild!.innerHTML = html;
        if (active) entry.card.querySelector<HTMLElement>(`[data-inspect-topic="${CSS.escape(active)}"]`)?.focus({preventScroll:true});
        entry.html = html;
      }
    }
  }
}
