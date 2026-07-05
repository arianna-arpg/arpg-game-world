// ---------------------------------------------------------------------------
// TOOLTIP — one shared floating box, event-delegated.
//
// Bind a panel container ONCE; on hover over any descendant carrying a
// `data-tip`, the supplied getContent() builds the box from LIVE data. The box
// follows the cursor, clamps into the viewport, and never eats pointer events.
// Delegation means it survives the panels' innerHTML re-renders for free.
// ---------------------------------------------------------------------------

export interface TooltipContent {
  title?: string;
  description: string;
  meta?: string;
}

export function bindTooltips(
  container: HTMLElement,
  getContent: (el: HTMLElement) => TooltipContent | null,
): void {
  const tip = document.getElementById('tooltip')!;
  let cur: HTMLElement | null = null;

  const place = (e: MouseEvent): void => {
    const pad = 14, vw = window.innerWidth, vh = window.innerHeight;
    const r = tip.getBoundingClientRect();
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + r.width > vw) x = e.clientX - r.width - pad;
    if (y + r.height > vh) y = vh - r.height - 6;
    tip.style.left = `${Math.max(4, x)}px`;
    tip.style.top = `${Math.max(4, y)}px`;
  };

  container.addEventListener('mouseover', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
    if (!el) {
      // The cursor is over plain panel area. Normally mouseout already hid the
      // box — but a panel re-render (the 0.5s char-sheet refresh, a co-op meta
      // re-render) DETACHES the hovered element, and no mouseout ever fires for
      // a removed node, so the box would stick and trail the cursor until it
      // left the whole panel. A non-tip hover is therefore treated as a leave.
      if (cur) { cur = null; tip.classList.add('hidden'); }
      return;
    }
    const c = getContent(el);
    if (!c) return;
    cur = el;
    tip.innerHTML =
      `${c.title ? `<div class="tt-title">${c.title}</div>` : ''}` +
      `<div class="tt-desc">${c.description}</div>` +
      `${c.meta ? `<div class="tt-meta">${c.meta}</div>` : ''}`;
    tip.classList.remove('hidden');
    place(e);
  });
  container.addEventListener('mousemove', (e) => {
    if (!cur) return;
    // The anchor was torn out by a re-render: hide rather than trail the cursor.
    // (The next mouseover re-shows it if the pointer is over the rebuilt target.)
    if (!cur.isConnected) { cur = null; tip.classList.add('hidden'); return; }
    place(e);
  });
  container.addEventListener('mouseout', (e) => {
    const to = e.relatedTarget as HTMLElement | null;
    if (cur && (!to || !cur.contains(to))) { cur = null; tip.classList.add('hidden'); }
  });
}

export function hideTooltip(): void {
  document.getElementById('tooltip')?.classList.add('hidden');
}
