import { esc } from './dom';
import { hideTooltip, tooltipHtml, type TooltipContent } from './tooltip';

export function inspectionLink(key: string, label: string): string {
  return `<button type="button" class="inspect-link" data-inspect-topic="${esc(key)}" aria-haspopup="dialog">${esc(label)}</button>`;
}

/** Click-to-pin companions to the hover tooltip. Popovers inherit the source pane's Wardrobe. */
export class InspectableTooltips {
  private trail: { key: string; card: HTMLElement; anchor: HTMLElement; html: string }[] = [];
  private frame = 0;

  constructor(private root: HTMLElement, private read: (key: string) => TooltipContent | undefined) {
    root.addEventListener('click', event => {
      const button = (event.target as Element).closest<HTMLElement>('[data-inspect-topic],[data-inspect-close]');
      if (!button) return;
      const parent = this.trail.findIndex(entry => entry.card.contains(button));
      if (button.hasAttribute('data-inspect-close')) { this.trim(parent, true); return; }
      const key = button.dataset.inspectTopic!;
      const content = this.read(key);
      if (!content) return;
      hideTooltip();
      const existing = this.trail.findIndex(entry => entry.key === key);
      if (existing >= 0 && existing <= parent) {
        this.trim(existing + 1, false);
        this.trail[existing].card.focus();
        return;
      }
      this.trim(parent + 1, false);
      const card = document.createElement('section');
      card.className = 'inspection-tooltip';
      card.popover = 'manual';
      card.tabIndex = -1;
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-label', button.textContent || 'Skill detail');
      card.innerHTML = '<button type="button" data-inspect-close aria-label="Close detail">×</button><div data-inspect-content></div>';
      const html = tooltipHtml(content);
      card.lastElementChild!.innerHTML = html;
      this.root.append(card);
      card.showPopover();
      this.trail.push({ key, card, anchor: button, html });
      if (this.trail.length === 1) {
        window.addEventListener('keydown', this.keyDown, true);
        document.addEventListener('pointerdown', this.outside, true);
      }
      this.layout();
      card.focus({ preventScroll:true });
    });
  }

  clear(): void { this.trim(0, false); }

  private trim(depth: number, restore: boolean): void {
    if (depth < 0) return;
    const removed = this.trail.splice(depth);
    for (const { card } of removed) card.remove();
    if (restore) removed[0]?.anchor.focus({ preventScroll:true });
    if (!this.trail.length) {
      cancelAnimationFrame(this.frame);
      window.removeEventListener('keydown', this.keyDown, true);
      document.removeEventListener('pointerdown', this.outside, true);
    }
  }

  private keyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.trim(this.trail.length - 1, true);
  };

  private outside = (event: PointerEvent): void => {
    const hit = event.composedPath();
    if (!this.trail.some(entry => hit.includes(entry.card) || hit.includes(entry.anchor))) this.clear();
  };

  private layout = (): void => {
    cancelAnimationFrame(this.frame);
    for (const [index, entry] of this.trail.entries()) {
      const { card, key } = entry;
      if (!card.isConnected || !this.root.getClientRects().length || this.root.closest('.hidden,.folio-shelved')) {
        this.clear(); return;
      }
      if (!entry.anchor.isConnected) {
        const scope = index ? this.trail[index - 1].card : this.root.querySelector('[data-skill-drawer]');
        const replacement = scope?.querySelector<HTMLElement>(`[data-inspect-topic="${CSS.escape(key)}"]`);
        if (!replacement) { this.trim(index, false); break; }
        entry.anchor = replacement;
      }
      const anchor = entry.anchor.getBoundingClientRect();
      const pane = index ? this.trail[index - 1].card.getBoundingClientRect() : this.root.getBoundingClientRect();
      if (!anchor.height || anchor.bottom <= pane.top || anchor.top >= pane.bottom) { this.trim(index, false); break; }
      const gap = 6, width = card.offsetWidth, height = card.offsetHeight;
      const right = pane.right + gap, left = pane.left - gap - width;
      const x = right + width <= innerWidth - gap ? right : left >= gap ? left : Math.min(anchor.left, innerWidth - gap - width);
      const y = Math.max(gap, Math.min(anchor.top, innerHeight - height - gap));
      const leftPx = Math.round(Math.max(gap, x)) + 'px', topPx = Math.round(y) + 'px';
      if (card.style.left !== leftPx) card.style.left = leftPx;
      if (card.style.top !== topPx) card.style.top = topPx;
    }
    if (this.trail.length) this.frame = requestAnimationFrame(this.layout);
  };

  refresh(): void {
    for (const [index, entry] of this.trail.entries()) {
      const content = this.read(entry.key);
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
