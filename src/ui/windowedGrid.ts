/** A continuous, fixed-row grid with bounded DOM and keyed, focus-safe recycling.
 * Geometry is shared by layout, scrolling and keyboard navigation. No catalog or
 * game knowledge lives here; consumers supply their own cards and painters. */
export interface GridAnchor { key: string; offset: number }
export interface WindowedGridOptions<T extends { key: string }> {
  minWidth: number; rowHeight: number; gap: number; overscanRows: number;
  render(item: T): HTMLElement;
  signature(item: T): string;
  paint?(item: HTMLElement): void;
  selected(node: HTMLElement, selected: boolean, tabStop: boolean): void;
  scrolled?(top: number, anchor?: GridAnchor): void;
}
export interface WindowedGrid<T> {
  setItems(items: readonly T[], selected: string | null, position?: { top?: number; anchor?: GridAnchor }): void;
  select(key: string | null): void;
  focus(key?: string | null, reveal?: boolean): void;
  refresh(): void;
  snapshot(): { top: number; anchor?: GridAnchor };
  readonly columns: number;
  readonly pageStep: number;
  readonly firstVisible: number;
  dispose(): void;
}
export function mountWindowedGrid<T extends { key: string }>(viewport: HTMLElement, opts: WindowedGridOptions<T>): WindowedGrid<T> {
  const content = document.createElement('div');
  content.className = 'windowed-grid-content'; content.style.position = 'relative'; content.setAttribute('role', 'list');
  viewport.replaceChildren(content);
  viewport.tabIndex = 0;
  let items: readonly T[] = [], selected: string | null = null, columns = 1, width = 0;
  let raf = 0, disposed = false, lastAnchor: GridAnchor | undefined;
  let positions = new Map<string, number>();
  let signatures = new WeakMap<T, string>();
  const mounted = new Map<string, { root: HTMLElement; card: HTMLElement; signature: string }>();
  const stride = opts.rowHeight + opts.gap;
  const firstVisible = (): number => Math.min(Math.max(0, items.length - 1), Math.floor(viewport.scrollTop / stride) * columns);
  const anchor = (): GridAnchor | undefined => items[firstVisible()] ? { key: items[firstVisible()].key, offset: viewport.scrollTop % stride } : undefined;
  const height = (): void => { content.style.height = Math.max(0, Math.ceil(items.length / columns) * stride - opts.gap) + 'px'; };
  const restore = (a?: GridAnchor, top = viewport.scrollTop): void => {
    const index = a ? positions.get(a.key) : undefined;
    viewport.scrollTop = index === undefined ? top : Math.floor(index / columns) * stride + a!.offset;
  };
  const layout = (): boolean => {
    if (!viewport.getClientRects().length || viewport.clientWidth <= 0 || viewport.clientHeight <= 0) return false;
    const nextWidth = viewport.clientWidth;
    const nextColumns = Math.max(1, Math.floor((nextWidth + opts.gap) / (opts.minWidth + opts.gap)));
    if (nextColumns !== columns || nextWidth !== width) {
      const keep = lastAnchor ?? anchor(); width = nextWidth; columns = nextColumns; height(); restore(keep);
    }
    return true;
  };
  const render = (): void => {
    if (disposed || !layout()) return;
    const firstRow = Math.floor(viewport.scrollTop / stride);
    const start = Math.max(0, firstRow - opts.overscanRows) * columns;
    const end = Math.min(items.length, (Math.ceil((viewport.scrollTop + viewport.clientHeight) / stride) + opts.overscanRows) * columns);
    const indices = new Set<number>();
    for (let i = start; i < end; i++) indices.add(i);
    // Scrolling must not destroy native keyboard focus. At most one extra card
    // is retained outside the window; it is recycled after focus moves away.
    for (const [key, node] of mounted) if (node.root.contains(document.activeElement)) {
      const i = positions.get(key); if (i !== undefined) indices.add(i);
    }
    const wanted = new Set([...indices].map(i => items[i].key));
    const lostFocus = [...mounted].some(([key, node]) => !wanted.has(key) && node.root.contains(document.activeElement));
    for (const [key, node] of mounted) if (!wanted.has(key)) { node.root.remove(); mounted.delete(key); }
    const selectedIndex = selected ? positions.get(selected) : undefined;
    const tabIndex = selectedIndex !== undefined && indices.has(selectedIndex) ? selectedIndex : firstVisible();
    const cardWidth = (width - (columns - 1) * opts.gap) / columns;
    let previous: HTMLElement | null = null;
    for (const i of [...indices].sort((a, b) => a - b)) {
      const item = items[i];
      let signature = signatures.get(item);
      if (signature === undefined) { signature = opts.signature(item); signatures.set(item, signature); }
      let node = mounted.get(item.key), fresh = false;
      if (!node) {
        const root = document.createElement('div'); root.className = 'windowed-grid-item'; root.style.cssText = 'position:absolute;left:0;top:0'; root.setAttribute('role', 'listitem');
        const card = opts.render(item); root.append(card); node = { root, card, signature }; mounted.set(item.key, node); fresh = true;
      } else if (node.signature !== signature) {
        const focus = node.card.contains(document.activeElement);
        node.card = opts.render(item); node.root.replaceChildren(node.card); node.signature = signature; fresh = true;
        if (focus) node.card.focus({ preventScroll: true });
      }
      const { root, card } = node;
      root.style.width = cardWidth + 'px'; root.style.height = opts.rowHeight + 'px';
      root.style.transform = `translate(${(i % columns) * (cardWidth + opts.gap)}px,${Math.floor(i / columns) * stride}px)`;
      root.setAttribute('aria-posinset', String(i + 1)); root.setAttribute('aria-setsize', String(items.length));
      const next: Element | null = previous ? previous.nextElementSibling : content.firstElementChild;
      if (next !== root) {
        const focus = card.contains(document.activeElement);
        content.insertBefore(root, next);
        if (focus) card.focus({ preventScroll: true });
      }
      previous = root; opts.selected(card, item.key === selected, i === tabIndex);
      if (fresh) opts.paint?.(root);
    }
    viewport.tabIndex = items.length ? -1 : 0;
    viewport.dataset.windowStart = String(start); viewport.dataset.windowEnd = String(end); viewport.dataset.total = String(items.length);
    lastAnchor = anchor(); opts.scrolled?.(viewport.scrollTop, lastAnchor);
    if (lostFocus) api.focus(null, false);
  };
  const schedule = (): void => { if (!raf && !disposed) raf = requestAnimationFrame(() => { raf = 0; render(); }); };
  const flush = (): void => { if (raf) cancelAnimationFrame(raf); raf = 0; render(); };
  viewport.addEventListener('scroll', schedule, { passive: true });
  viewport.addEventListener('focusout', schedule);
  const resize = new ResizeObserver(schedule); resize.observe(viewport);
  const api: WindowedGrid<T> = {
    setItems(next, key, position) {
      const keep = position?.anchor ?? (position ? undefined : anchor());
      const top = position?.top ?? viewport.scrollTop;
      if (!next.length || !viewport.getClientRects().length) { for (const node of mounted.values()) node.root.remove(); mounted.clear(); }
      items = next; selected = key; signatures = new WeakMap(); viewport.dataset.total = String(items.length); positions = new Map(items.map((e, i) => [e.key, i]));
      lastAnchor = keep; layout(); height(); restore(keep, top); flush();
    },
    select(key) { selected = key; flush(); },
    focus(key = selected, reveal = true) {
      if (!layout() || !items.length) { viewport.focus({ preventScroll: true }); return; }
      let index = key ? positions.get(key) : undefined;
      if (!reveal && (index === undefined || index < firstVisible() || index >= firstVisible() + api.pageStep)) index = firstVisible();
      index ??= firstVisible();
      if (reveal) {
        const top = Math.floor(index / columns) * stride, bottom = top + opts.rowHeight;
        if (opts.rowHeight > viewport.clientHeight || top < viewport.scrollTop) viewport.scrollTop = top;
        else if (bottom > viewport.scrollTop + viewport.clientHeight) viewport.scrollTop = bottom - viewport.clientHeight;
      }
      flush(); mounted.get(items[index].key)?.card.focus({ preventScroll: true });
    },
    refresh: flush,
    snapshot: () => ({ top: viewport.scrollTop, anchor: anchor() }),
    get columns() { return columns; },
    get pageStep() { return Math.max(1, Math.floor(viewport.clientHeight / stride)) * columns; },
    get firstVisible() { return firstVisible(); },
    dispose() {
      disposed = true; if (raf) cancelAnimationFrame(raf); resize.disconnect();
      viewport.removeEventListener('scroll', schedule); viewport.removeEventListener('focusout', schedule); mounted.clear(); content.remove();
    },
  };
  return api;
}
