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
  private liveTimer = 0;
  private watching = false;
  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;
  private origin?: HTMLElement;
  private releaseHover?: () => void;
  private inspectionSource?: HTMLElement;
  private lastLiveRead = 0;

  constructor(private root: HTMLElement, private read: InspectionReader) {
    root.addEventListener('click', this.click);
    root.addEventListener('keydown',this.activate);
  }

  private scheduleLayout = (): void => {
    if (!this.trail.length || this.frame) return;
    this.frame = requestAnimationFrame(this.layout);
  };

  private onMutation = (records: MutationRecord[]): void => {
    if (!this.trail.length || this.frame) return;
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const t = r.target;
      if (!(t instanceof Element)) continue;
      if (t.closest('.rune-field,.dnd-ghost,.bag-landing')) continue;
      if (r.type === 'childList') {
        let relevant = false;
        for (let j = 0; j < r.addedNodes.length; j++) {
          const n = r.addedNodes[j];
          if (n instanceof Element && !n.classList.contains('bag-landing') && !n.classList.contains('dnd-ghost') && !n.classList.contains('rune-field-mote')) {
            relevant = true;
            break;
          }
        }
        if (!relevant) {
          for (let j = 0; j < r.removedNodes.length; j++) {
            const n = r.removedNodes[j];
            if (n instanceof Element && !n.classList.contains('bag-landing') && !n.classList.contains('dnd-ghost') && !n.classList.contains('rune-field-mote')) {
              relevant = true;
              break;
            }
          }
        }
        if (!relevant) continue;
      }
      this.scheduleLayout();
      return;
    }
  };

  private onLiveTick = (): void => {
    if (!this.trail.some(entry => entry.live)) {
      if (this.liveTimer) { window.clearInterval(this.liveTimer); this.liveTimer = 0; }
      return;
    }
    if (performance.now() - this.lastLiveRead < 350) return;
    this.refresh();
  };

  private syncWatchers(): void {
    if (!this.trail.length) {
      if (this.frame) { cancelAnimationFrame(this.frame); this.frame = 0; }
      if (this.liveTimer) { window.clearInterval(this.liveTimer); this.liveTimer = 0; }
      this.resizeObserver?.disconnect();
      this.mutationObserver?.disconnect();
      if (this.watching) {
        this.watching = false;
        window.removeEventListener('keydown', this.keyDown, true);
        document.removeEventListener('pointerdown', this.outside, true);
        document.removeEventListener('scroll', this.scheduleLayout, true);
        window.removeEventListener('resize', this.scheduleLayout);
      }
      return;
    }
    if (!this.watching) {
      this.watching = true;
      window.addEventListener('keydown', this.keyDown, true);
      document.addEventListener('pointerdown', this.outside, true);
      document.addEventListener('scroll', this.scheduleLayout, { capture: true, passive: true });
      window.addEventListener('resize', this.scheduleLayout, { passive: true });
      if (typeof MutationObserver !== 'undefined' && document.body) {
        this.mutationObserver ??= new MutationObserver(this.onMutation);
        this.mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'hidden'],
        });
      }
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver ??= new ResizeObserver(this.scheduleLayout);
      this.resizeObserver.disconnect();
      if (this.origin) {
        this.resizeObserver.observe(this.origin);
        const hostPanel = this.origin.closest<HTMLElement>('.panel');
        if (hostPanel && hostPanel !== this.origin) this.resizeObserver.observe(hostPanel);
      }
      for (let i = 0; i < this.trail.length; i++) this.resizeObserver.observe(this.trail[i].card);
    }
    const hasLive = this.trail.some(entry => entry.live);
    if (hasLive && !this.liveTimer) {
      this.liveTimer = window.setInterval(this.onLiveTick, TIP_CFG.liveRefreshMs);
    } else if (!hasLive && this.liveTimer) {
      window.clearInterval(this.liveTimer);
      this.liveTimer = 0;
    }
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
    this.syncWatchers();
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
    }
    this.syncWatchers();
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
    if (this.frame) { cancelAnimationFrame(this.frame); this.frame = 0; }
    if (!this.trail.length) return;
    if (!this.origin?.isConnected || !this.origin.getClientRects().length || this.origin.closest('.hidden,.folio-shelved,[hidden]')) {
      this.clear();
      return;
    }
    for (let index = 0; index < this.trail.length; index++) {
      const entry = this.trail[index];
      if (!entry.card.isConnected) { this.clear(); return; }
      if (!entry.anchor.isConnected) {
        const scope = index ? this.trail[index - 1].card : this.origin;
        const replacement = [...scope.querySelectorAll<HTMLElement>(`[data-inspect-topic="${CSS.escape(entry.key)}"]`)]
          .find(link => link.closest('.inspection-tooltip') === (index ? scope : null));
        if (!replacement) { this.trim(index, false); break; }
        entry.anchor = replacement;
      }
    }
    if (!this.trail.length || !this.origin) return;

    // READ PASS: measure all rects and offsetWidths before any style writes.
    const vw = window.innerWidth, vh = window.innerHeight, gap = 6;
    const originPane = (this.origin.closest<HTMLElement>('.panel') ?? this.origin).getBoundingClientRect();
    const count = this.trail.length;
    const anchorRects = new Array<DOMRect>(count);
    const cardRects = new Array<DOMRect>(count);
    const cardOffsetWidths = new Array<number>(count);
    for (let index = 0; index < count; index++) {
      const entry = this.trail[index];
      anchorRects[index] = (entry.anchor.closest('.inspect-term') ?? entry.anchor).getBoundingClientRect();
      cardRects[index] = entry.card.getBoundingClientRect();
      cardOffsetWidths[index] = entry.card.offsetWidth;
    }

    const writes: { card: HTMLElement; leftPx: string; topPx: string }[] = [];
    let trimAt = -1;
    let prevPane = { left: originPane.left, right: originPane.right, top: originPane.top, bottom: originPane.bottom };
    let prevDx = 0, prevDy = 0;
    for (let index = 0; index < count; index++) {
      const entry = this.trail[index];
      const anchor = anchorRects[index];
      const bounds = cardRects[index];
      const aLeft = index ? anchor.left + prevDx : anchor.left;
      const aTop = index ? anchor.top + prevDy : anchor.top;
      const aBottom = index ? anchor.bottom + prevDy : anchor.bottom;
      const pane = index ? prevPane : originPane;
      if (!entry.position && (!anchor.height || aBottom <= pane.top || aTop >= pane.bottom)) {
        trimAt = index;
        break;
      }
      const width = bounds.width, height = bounds.height;
      const zoom = width / cardOffsetWidths[index] || 1;
      const right = pane.right + gap, left = pane.left - gap - width;
      const preferredX = entry.position?.x ?? (right + width <= vw - gap ? right : left >= gap ? left : aLeft);
      const x = Math.max(gap, Math.min(preferredX, vw - gap - width));
      const y = Math.max(gap, Math.min(entry.position?.y ?? aTop, vh - height - gap));
      const leftCss = Math.round(x / zoom), topCss = Math.round(y / zoom);
      const actualLeft = leftCss * zoom, actualTop = topCss * zoom;
      prevDx = actualLeft - bounds.left;
      prevDy = actualTop - bounds.top;
      prevPane = { left: actualLeft, right: actualLeft + width, top: actualTop, bottom: actualTop + height };
      writes.push({ card: entry.card, leftPx: leftCss + 'px', topPx: topCss + 'px' });
    }

    // WRITE PASS: mutate card coordinates without triggering mid-loop reflows.
    for (let i = 0; i < writes.length; i++) {
      const { card, leftPx, topPx } = writes[i];
      if (card.style.left !== leftPx) card.style.left = leftPx;
      if (card.style.top !== topPx) card.style.top = topPx;
    }
    if (trimAt >= 0) this.trim(trimAt, false);
  };

  refresh(): void {
    this.lastLiveRead = performance.now();
    let changed = false;
    let liveChanged = false;
    for (const [index, entry] of this.trail.entries()) {
      const source = this.inspectionSource!;
      const parentKey = index ? this.trail[index - 1].key : source.closest<HTMLElement>('[data-mechanic-source]')?.dataset.mechanicSource;
      const content = this.read(entry.key,source,parentKey);
      if (!content) { this.trim(index, false); break; }
      if (entry.live !== content.live) { entry.live = content.live; liveChanged = true; }
      const html = tooltipHtml(content);
      if (entry.html !== html) {
        const active = entry.card.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.inspectTopic : undefined;
        entry.card.lastElementChild!.innerHTML = html;
        if (active) entry.card.querySelector<HTMLElement>(`[data-inspect-topic="${CSS.escape(active)}"]`)?.focus({preventScroll:true});
        entry.html = html;
        changed = true;
      }
    }
    if (liveChanged) this.syncWatchers();
    if (changed) this.scheduleLayout();
  }
}
