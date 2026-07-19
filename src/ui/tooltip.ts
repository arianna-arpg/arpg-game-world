// ---------------------------------------------------------------------------
// TOOLTIP — one shared floating box, event-delegated.
//
// Bind a panel container ONCE; on hover over any descendant carrying a
// `data-tip`, the supplied getContent() builds the box from LIVE data. The box
// follows the cursor, clamps into the viewport, and never eats pointer events.
// Delegation means it survives the panels' innerHTML re-renders for free.
//
// PROXIMITY MODE (opt-in per bind): for surfaces whose targets shrink toward
// pixels — the zoomed-out passive tree above all — the tooltip can anchor to
// the NEAREST matching element within a radius of the cursor instead of
// demanding a direct hit. It is STICKY: the current anchor only yields to a
// rival that is decisively closer (hysteresis), so the box never flickers
// between neighbours mid-glide. A direct hit always wins outright, so precise
// hovering at high zoom behaves exactly like every other panel. Works for the
// mouse and the pad pointer alike (both speak pointermove).
// ---------------------------------------------------------------------------

export interface TooltipContent {
  title?: string;
  description: string;
  meta?: string;
  /** WIDE content (opt-in per card): walls of text — the Vault's unlock
   *  stories — read badly in the narrow box; this widens it (CSS .tt-wide)
   *  for exactly this content and resets on the next card. */
  wide?: boolean;
}

/** Shared tooltip tunables — one home, no magic numbers at call sites. */
export const TIP_CFG = {
  /** Cursor→box gap when placing (px). */
  pad: 14,
  /** EXTENDED HOVER: dwell this long on one anchor and the box re-asks its
   *  content with extended=true — the deeper card (gear comparison). Binds
   *  opt in via TooltipOpts.extend. */
  extendMs: 550,
  /** HOVER INTENT: the standard "after a moment" reveal — binds that opt in
   *  (TooltipOpts.delayMs) keep the box DOWN until the cursor has settled on
   *  one anchor this long, so compact card walls (the Vault) stay quiet under
   *  a passing cursor and speak only to actual interest. */
  intentMs: 400,
};

export interface TooltipProximity {
  /** Which descendants compete for the nearest-anchor pick. */
  selector: string;
  /** Max distance (px) from cursor to an element's center to anchor it. */
  radiusPx: number;
  /** Stickiness: the held anchor's distance is discounted by this fraction
   *  when rivals bid, so a challenger must be CLEARLY closer to steal the
   *  box (0 = free-for-all, 0.35 = needs ~35% closer). */
  hysteresis?: number;
  /** Re-scan cadence (ms) — proximity sweeps rects, so don't do it per event. */
  intervalMs?: number;
}

export interface TooltipOpts {
  proximity?: TooltipProximity;
  /** EXTENDED HOVER (opt-in per bind): dwell TIP_CFG.extendMs on one anchor
   *  and getContent re-runs with extended=true, growing the box in place —
   *  leave and return to reset to the compact card. Content that has no
   *  deeper form simply returns the same card. */
  extend?: boolean;
  /** HOVER INTENT (opt-in per bind): the box only appears after the cursor
   *  has RESTED on an anchor this long (ms — pass TIP_CFG.intentMs for the
   *  house cadence). Moving to another anchor re-arms the clock; leaving
   *  cancels it. Absent/0 = immediate, exactly as every panel behaves today.
   *  Once shown, following and re-placing are undelayed. */
  delayMs?: number;
}

export function bindTooltips(
  container: HTMLElement,
  getContent: (el: HTMLElement, extended?: boolean) => TooltipContent | null,
  opts?: TooltipOpts,
): void {
  const tip = document.getElementById('tooltip')!;
  let cur: HTMLElement | null = null;
  let extendTimer: number | null = null;
  /** Last cursor point — the extend re-render must re-clamp the grown box
   *  without waiting for the next mouse event. */
  let lastPt = { clientX: 0, clientY: 0 };

  const place = (e: { clientX: number; clientY: number }): void => {
    lastPt = { clientX: e.clientX, clientY: e.clientY };
    const pad = TIP_CFG.pad, vw = window.innerWidth, vh = window.innerHeight;
    const r = tip.getBoundingClientRect();
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + r.width > vw) x = e.clientX - r.width - pad;
    if (y + r.height > vh) y = vh - r.height - 6;
    tip.style.left = `${Math.max(4, x)}px`;
    tip.style.top = `${Math.max(4, y)}px`;
  };

  const render = (el: HTMLElement, extended: boolean): boolean => {
    const c = getContent(el, extended);
    if (!c) return false;
    tip.innerHTML =
      `${c.title ? `<div class="tt-title">${c.title}</div>` : ''}` +
      `<div class="tt-desc">${c.description}</div>` +
      `${c.meta ? `<div class="tt-meta">${c.meta}</div>` : ''}`;
    // Toggled per card, so a wide wall never leaves the next panel's compact
    // card rattling around an oversized box.
    tip.classList.toggle('tt-wide', !!c.wide);
    tip.classList.remove('hidden');
    return true;
  };

  const disarmExtend = (): void => {
    if (extendTimer !== null) { window.clearTimeout(extendTimer); extendTimer = null; }
  };

  // ---- HOVER INTENT (opts.delayMs): the not-yet-shown anchor + its clock ---
  let pendingEl: HTMLElement | null = null;
  let intentTimer: number | null = null;
  const disarmIntent = (): void => {
    if (intentTimer !== null) { window.clearTimeout(intentTimer); intentTimer = null; }
    pendingEl = null;
  };

  const armExtend = (el: HTMLElement): void => {
    disarmExtend();
    if (!opts?.extend) return;
    extendTimer = window.setTimeout(() => {
      extendTimer = null;
      // Still dwelling on the same, still-attached anchor? Grow in place.
      if (cur !== el || !el.isConnected) return;
      render(el, true);
      place(lastPt); // the grown box must re-clamp into the viewport
    }, TIP_CFG.extendMs);
  };

  const hide = (): void => {
    disarmIntent();
    disarmExtend();
    if (!cur) return;
    cur = null;
    tip.classList.add('hidden');
  };

  /** Actually raise the box on an anchor (the pre-intent show). */
  const reveal = (el: HTMLElement, e: { clientX: number; clientY: number }): void => {
    if (el !== cur) {
      if (!render(el, false)) { hide(); return; }
      cur = el;
      armExtend(el);
    }
    place(e);
  };

  const show = (el: HTMLElement, e: { clientX: number; clientY: number }): void => {
    // While the drag fabric carries a payload (body.dnd-active — its public
    // in-flight signal), the hover card stays DOWN: the ghost chip and the
    // target marks own the pointer's attention, and a card popping over the
    // drop path mid-carry is pure noise. No import — the class IS the seam.
    if (document.body.classList.contains('dnd-active')) { hide(); return; }
    lastPt = { clientX: e.clientX, clientY: e.clientY };
    // HOVER INTENT: with a delay bound, a NEW anchor only arms the dwell
    // clock — the box rises when the cursor has settled, never for a
    // drive-by. An anchor already showing keeps following undelayed.
    const delay = opts?.delayMs ?? 0;
    if (delay <= 0 || el === cur) { reveal(el, e); return; }
    if (pendingEl === el) return; // clock already running on this anchor
    disarmIntent();
    pendingEl = el;
    intentTimer = window.setTimeout(() => {
      intentTimer = null;
      const settled = pendingEl;
      pendingEl = null;
      // Torn out by a re-render, or a drag started mid-dwell? Stay down.
      if (!settled || !settled.isConnected) return;
      if (document.body.classList.contains('dnd-active')) return;
      reveal(settled, lastPt);
    }, delay);
  };

  // ---- PROXIMITY MODE: pointermove owns every show/hide decision ----------
  const prox = opts?.proximity;
  if (prox) {
    let lastScan = 0;
    container.addEventListener('pointermove', (e) => {
      // A re-render tore the anchor out — release it so the scan re-picks the
      // rebuilt element (content refreshes from live data in the same beat).
      if (cur && !cur.isConnected) { cur = null; tip.classList.add('hidden'); }
      // Direct hit wins outright — precision hovering stays precision.
      const direct = (e.target as HTMLElement).closest?.<HTMLElement>('[data-tip]');
      if (direct) { show(direct, e); return; }
      const now = performance.now();
      if (now - lastScan < (prox.intervalMs ?? 40)) {
        if (cur) place(e);
        return;
      }
      lastScan = now;
      const stick = 1 - (prox.hysteresis ?? 0.35);
      let best: HTMLElement | null = null;
      let bd = prox.radiusPx;
      for (const el of container.querySelectorAll<HTMLElement>(prox.selector)) {
        const r = el.getBoundingClientRect();
        if (r.width <= 0) continue; // hidden / collapsed candidates never bid
        const d = Math.hypot(e.clientX - (r.x + r.width / 2), e.clientY - (r.y + r.height / 2));
        const eff = el === cur ? d * stick : d; // the held anchor bids discounted
        if (eff < bd) { bd = eff; best = el; }
      }
      if (best) show(best, e);
      else hide();
    });
    container.addEventListener('pointerleave', hide);
    return;
  }

  // ---- CLASSIC MODE: delegated hover, exactly as every panel expects ------
  container.addEventListener('mouseover', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
    if (!el) {
      // The cursor is over plain panel area. Normally mouseout already hid the
      // box — but a panel re-render (the 0.5s char-sheet refresh, a co-op meta
      // re-render) DETACHES the hovered element, and no mouseout ever fires for
      // a removed node, so the box would stick and trail the cursor until it
      // left the whole panel. A non-tip hover is therefore treated as a leave.
      hide();
      return;
    }
    show(el, e);
  });
  container.addEventListener('mousemove', (e) => {
    // Track the point even pre-reveal: a pending intent must rise where the
    // cursor actually SETTLED, not where it first crossed the anchor's edge.
    lastPt = { clientX: e.clientX, clientY: e.clientY };
    if (!cur) return;
    // The anchor was torn out by a re-render: hide rather than trail the cursor.
    // (The next mouseover re-shows it if the pointer is over the rebuilt target.)
    if (!cur.isConnected) { hide(); return; }
    place(e);
  });
  container.addEventListener('mouseout', (e) => {
    const to = e.relatedTarget as HTMLElement | null;
    if (cur && (!to || !cur.contains(to))) hide();
    // A pending intent dies with the exit too — leaving the CONTAINER fires
    // no in-container mouseover to catch it, and the clock must not pop the
    // box over whatever the cursor went to instead.
    else if (pendingEl && (!to || !pendingEl.contains(to))) disarmIntent();
  });
}

export function hideTooltip(): void {
  document.getElementById('tooltip')?.classList.add('hidden');
}
