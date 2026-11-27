// ---------------------------------------------------------------------------
// TOOLTIP — one shared floating box, event-delegated.
//
// Bind a panel container ONCE; on hover over any descendant carrying a
// `data-tip`, the supplied getContent() builds the box from LIVE data. The box
// follows the cursor. Inspection seats a linked card beside its source.
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

import { nearestTreeTarget } from './treeProximity';
import { inspectionEnabled, matchesItemInspectionKey, keyboardInspection, onInspectionChange } from './inspectionMode';
import { enableTooltipMove, type TooltipPosition } from './tooltipMove';

const TIP_TARGET = '[data-tip], [data-ui-hint]';
const SUPPORTS_SELECT_OPEN = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('selector(select:open)');
const tooltipRoots = new WeakSet<HTMLElement>();
let activeTooltipOwner: object | null = null;
/** THE STANDING CARD's anchor + the bind's own hide, for the per-frame
 *  sweep below (a closure per bind; one card at a time by construction). */
let activeAnchor: HTMLElement | null = null;
function isOpenSelectHint(anchor: HTMLElement): boolean {
  return SUPPORTS_SELECT_OPEN && anchor instanceof HTMLSelectElement && anchor.hasAttribute('data-ui-hint')
    && anchor.matches(':open');
}
export const tooltipSource = (): HTMLElement | null => activeAnchor;
let activeHide: (() => void) | null = null;
let updateActiveMode: (() => void) | undefined;
let placeMovedCard: (() => void) | undefined;
let movedCard: TooltipPosition | undefined;
let lastTipLeft = NaN, lastTipTop = NaN;
onInspectionChange(() => updateActiveMode?.());
let heldCard = false;
let leaveTimer = 0;
const installedCards = new WeakSet<HTMLElement>();
const cancelLeave = (): void => { window.clearTimeout(leaveTimer); };
function leaveCard(tip: HTMLElement): void {
  cancelLeave();
  if (heldCard || tip.hasAttribute('data-inspect-drag')) return;
  leaveTimer = window.setTimeout(() => {
    // Pointer crossing may expire while a keyboard reader is still inside.
    // Actual focus owns the card regardless of Chromium's focus-ring heuristic.
    if (!heldCard && !tip.contains(document.activeElement) && !tip.matches(':hover') &&
        !activeAnchor?.matches(':hover,:focus-visible')) activeHide?.();
  }, TIP_CFG.crossingMs);
}
export function holdInteractiveTooltip(): () => void {
  cancelLeave();
  heldCard = true;
  return () => {
    heldCard = false;
    const tip = document.getElementById('tooltip');
    updateActiveMode?.();
    if (tip && !tip.classList.contains('hidden')) leaveCard(tip);
  };
}

function enableCardInteraction(tip: HTMLElement): void {
  if (installedCards.has(tip)) return;
  installedCards.add(tip);
  tip.tabIndex = -1;
  enableTooltipMove(tip,position => { movedCard = position; (placeMovedCard ?? updateActiveMode)?.(); },
    () => tip.classList.contains('tt-interactive') && !tip.classList.contains('hidden'));
  window.addEventListener('resize',() => { if (movedCard) updateActiveMode?.(); });
  tip.addEventListener('pointerenter',cancelLeave);
  tip.addEventListener('pointerleave',() => leaveCard(tip));
  tip.addEventListener('focusout',() => leaveCard(tip));
  tip.addEventListener('keydown',event => {
    if (event.key === 'Tab') { event.stopPropagation(); return; }
    if (event.key !== 'Escape' || heldCard) return;
    event.preventDefault(); event.stopPropagation();
    activeAnchor?.focus({preventScroll:true});
    activeHide?.();
  });
}
function focusItemDetails(event: KeyboardEvent): void {
  const first = document.querySelector<HTMLButtonElement>('#tooltip:not(.hidden) [data-inspect-topic]');
  if (!first) return;
  event.preventDefault(); event.stopPropagation();
  keyboardInspection(true);
  first.focus({preventScroll:true});
}
let tooltipDetail: () => 'compact' | 'full' = () => 'compact';

/** THE STALE CARD (2026-09-11, her report: "Step away" outlived the glyph it
 *  hinted). Once per frame (panels' folioSync): a card whose anchor left the
 *  page or the screen — torn out by a re-render, hidden by the very click it
 *  explained, closed by a key while the cursor rested on it — comes down.
 *  Cheap: one rect read while a card stands, nothing otherwise. */
export function tooltipSweep(): void {
  if (!activeAnchor) return;
  if (!activeAnchor.isConnected || activeAnchor.closest('.hidden, .folio-shelved') || isOpenSelectHint(activeAnchor) || activeAnchor.getClientRects().length === 0) activeHide?.();
}
/** Read the preference only when a new card opens, so a displayed card stays steady. */
export function configureTooltipDetail(read: typeof tooltipDetail): void { tooltipDetail = read; }
const hintEscape = (s: string): string => s.replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const HINT_SKIP_CLASSES = [
  'tree-viewport', 'dnd-ghost', 'bag-landing', 'rune-field', 'rune-field-mote',
  'inv-frame-chrome', 'inv-heading-ornament', 'inv-ribbon-inset',
];
function shouldSkipHintScan(el: Element): boolean {
  for (let i = 0; i < HINT_SKIP_CLASSES.length; i++) {
    if (el.classList.contains(HINT_SKIP_CLASSES[i])) return true;
  }
  return false;
}

/** Native control hints use the same card as rich tips, including on a pad. */
export function installTooltipHints(root: HTMLElement = document.body): void {
  let converted = false;
  const convert = (el: Element): void => {
    const title = el.getAttribute('title');
    if (title === null) return;
    if (title) {
      el.setAttribute('data-ui-hint', title);
      if (el.matches('button, input, select') && !el.hasAttribute('aria-label')) el.setAttribute('aria-label', title);
    } else el.removeAttribute('data-ui-hint');
    el.removeAttribute('title');
    converted = true;
  };
  const scan = (el: Element): void => {
    if (shouldSkipHintScan(el)) return;
    convert(el);
    if (el.id === 'passive-tree') {
      for (const child of el.children) {
        if (!shouldSkipHintScan(child)) scan(child);
      }
      return;
    }
    el.querySelectorAll('[title]').forEach(convert);
  };
  scan(root);
  const observer = new MutationObserver(records => {
    converted = false;
    for (const r of records) {
      if (r.type === 'attributes') {
        if (r.target instanceof HTMLElement && !shouldSkipHintScan(r.target)) convert(r.target);
      } else {
        for (const n of r.addedNodes) if (n instanceof HTMLElement) scan(n);
      }
    }
    if (converted) observer.takeRecords();
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] });
  bindTooltips(root, () => null);
  root.addEventListener('keydown',event => {
    if (heldCard || !matchesItemInspectionKey(event) || activeAnchor?.dataset.tip !== 'item' || !activeAnchor.matches(':hover')) return;
    if ((event.target as Element).closest('input,select,textarea,#tooltip,.inspection-tooltip,[data-tip="item"]')) return;
    focusItemDetails(event);
  });
}

export interface TooltipContent {
  /** Re-read a pinned detail while its character's build can change. */
  live?: boolean;
  title?: string;
  description: string;
  meta?: string;
  /** WIDE content (opt-in per card): walls of text — the Vault's unlock
   *  stories — read badly in the narrow box; this widens it (CSS .tt-wide)
   *  for exactly this content and resets on the next card. */
  wide?: boolean;
}

export function tooltipHtml(content: TooltipContent): string {
  return (content.title ? `<div class="tt-title">${content.title}</div>` : '')
    + `<div class="tt-desc">${content.description}</div>`
    + (content.meta ? `<div class="tt-meta">${content.meta}</div>` : '');
}

/** Shared tooltip tunables — one home, no magic numbers at call sites. */
export const TIP_CFG = {
  /** Cursor→box gap when placing (px). */
  pad: 14,
  /** Keep anchored cards inside the usable viewport, in screen pixels. */
  edge: 4,
  /** HOVER INTENT: the standard "after a moment" reveal — binds that opt in
   *  (TooltipOpts.delayMs) keep the box DOWN until the cursor has settled on
   *  one anchor this long, so compact card walls (the Vault) stay quiet under
   *  a passing cursor and speak only to actual interest. */
  intentMs: 400,
  /** Continuous hover on the same gameplay HUD target. */
  hudIntentMs: 1000,
  /** Refresh a visible skill preview as temporary effects change. */
  liveRefreshMs: 500,
  crossingMs: 240,
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
  suspended?: () => boolean;
}

/** THE ANCHOR MARK: the element the box currently speaks for wears this
 *  class while it does (removed on hide / re-anchor; a re-render's torn-out
 *  anchor takes the class with it). Surfaces style it as the "this is what
 *  you are pointing at" read — the passive tree and the skill-tree pane
 *  ring their anchored node with it, which also gives the PAD POINTER's
 *  synthetic hover a visible target (CSS :hover never fires for it) — and
 *  THE REACH (panels.ts reachNode) resolves a click on empty ground to it. */
export const TIP_ANCHOR_CLASS = 'tt-anchor';

export interface TooltipOpts {
  /** Observe the resolved anchor, including proximity and controller hover. */
  onAnchor?: (anchor: HTMLElement | null) => void;
  /** Align with the hovered option, keeping the whole picker clear when space permits. */
  placement?: 'besidePicker';
  proximity?: TooltipProximity;
  /** This surface offers a full-detail card. Choose compact/full at reveal
   *  from the saved preference; elapsed hover time never changes the card. */
  extend?: boolean;
  /** HOVER INTENT (opt-in per bind): the box only appears after the cursor
   *  has RESTED on an anchor this long (ms — pass TIP_CFG.intentMs for the
   *  house cadence). Moving to another anchor re-arms the clock; leaving
   *  cancels it. Absent/0 = immediate, exactly as every panel behaves today.
   *  Once shown, following and re-placing are undelayed. */
  delayMs?: number;
}

/** Use screen pixels throughout, including the tooltip's scaled dimensions. */
function placeBesidePicker(tip: HTMLElement, row: DOMRect, picker: DOMRect): void {
  const { pad, edge } = TIP_CFG;
  const width = window.innerWidth, height = window.innerHeight;
  const clamp = (value: number, limit: number): number => Math.max(edge, Math.min(value, limit - edge));
  const card = tip.getBoundingClientRect();
  const right = picker.right + pad, left = picker.left - pad - card.width;
  const fitsRight = right + card.width <= width - edge;
  let x: number, y: number, finalHeight: number;
  if (fitsRight || left >= edge) {
    tip.style.setProperty('--tt-space', `${height - 2 * edge}px`);
    finalHeight = tip.getBoundingClientRect().height;
    x = fitsRight ? right : left;
    y = row.top;
  } else {
    const below = Math.max(0, height - edge - picker.bottom - pad);
    const above = Math.max(0, picker.top - pad - edge);
    // Prefer a full card below. For a longer description use the larger
    // clear area, where the player can scroll the text over the hovered row.
    const fullCardHeight = card.height * (tip.scrollHeight + tip.offsetHeight - tip.clientHeight) / tip.offsetHeight;
    const useBelow = below >= fullCardHeight || (above < fullCardHeight && below >= above);
    tip.style.setProperty('--tt-space', `${useBelow ? below : above}px`);
    finalHeight = tip.getBoundingClientRect().height;
    x = row.left;
    y = useBelow ? picker.bottom + pad : picker.top - pad - finalHeight;
  }
  const nextLeft = clamp(x, width - card.width);
  const nextTop = clamp(y, height - finalHeight);
  lastTipLeft = nextLeft;
  lastTipTop = nextTop;
  tip.style.left = `${nextLeft}px`;
  tip.style.top = `${nextTop}px`;
}

export function bindTooltips(
  container: HTMLElement,
  getContent: (el: HTMLElement, extended?: boolean) => TooltipContent | null,
  opts?: TooltipOpts,
): void {
  const tip = document.getElementById('tooltip')!;
  const owner = {};
  tooltipRoots.add(container);
  const ownsEvent = (e: Event): boolean => {
    let n: Node | null = e.target as Node | null;
    while (n) {
      if (n instanceof HTMLElement && tooltipRoots.has(n)) return n === container;
      n = n.parentElement ?? n.parentNode;
    }
    return false;
  };
  let cur: HTMLElement | null = null;
  let placedAnchor: HTMLElement | null = null;
  let placedInteractive = false;
  let cachedTipW = 0, cachedTipH = 0;
  /** Last cursor point for delayed initial reveals. */
  let lastPt = { clientX: 0, clientY: 0 };

  const place = (e: { clientX: number; clientY: number }): void => {
    lastPt = { clientX: e.clientX, clientY: e.clientY };
    if (activeTooltipOwner !== owner) return;
    if (movedCard && tip.classList.contains('tt-interactive')) {
      placedAnchor = null;
      placedInteractive = false;
      if (!cachedTipW || !cachedTipH) {
        const r = tip.getBoundingClientRect();
        cachedTipW = r.width;
        cachedTipH = r.height;
      }
      const edge = TIP_CFG.edge;
      const left = Math.round(Math.max(edge, Math.min(movedCard.x, innerWidth - edge - cachedTipW)));
      const top = Math.round(Math.max(edge, Math.min(movedCard.y, innerHeight - edge - cachedTipH)));
      if (left !== lastTipLeft) { lastTipLeft = left; tip.style.left = left + 'px'; }
      if (top !== lastTipTop) { lastTipTop = top; tip.style.top = top + 'px'; }
      return;
    }
    if (opts?.placement === 'besidePicker' && cur) {
      if (activeTooltipOwner === owner && placedAnchor !== cur) {
        placedAnchor = cur;
        placedInteractive = false;
        placeBesidePicker(tip, cur.getBoundingClientRect(), container.getBoundingClientRect());
      }
      return;
    }
    if (cur && tip.classList.contains('tt-interactive')) {
      if (placedAnchor === cur && placedInteractive) return;
      placedAnchor = cur;
      placedInteractive = true;
      const row = cur.getBoundingClientRect(), edge = TIP_CFG.edge;
      const x = row.right + cachedTipW <= innerWidth - edge ? row.right : Math.max(edge,row.left - cachedTipW);
      const left = Math.max(edge,Math.min(x,innerWidth - cachedTipW - edge));
      const top = Math.max(edge,Math.min(row.top,innerHeight - cachedTipH - edge));
      if (left !== lastTipLeft) { lastTipLeft = left; tip.style.left = left + 'px'; }
      if (top !== lastTipTop) { lastTipTop = top; tip.style.top = top + 'px'; }
      return;
    }
    placedAnchor = null;
    placedInteractive = false;
    const pad = TIP_CFG.pad, vw = window.innerWidth, vh = window.innerHeight;
    if (!cachedTipW || !cachedTipH) {
      const r = tip.getBoundingClientRect();
      cachedTipW = r.width;
      cachedTipH = r.height;
    }
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + cachedTipW > vw) x = e.clientX - cachedTipW - pad;
    if (y + cachedTipH > vh) y = vh - cachedTipH - 6;
    const left = Math.max(4, x), top = Math.max(4, y);
    if (left !== lastTipLeft) { lastTipLeft = left; tip.style.left = `${left}px`; }
    if (top !== lastTipTop) { lastTipTop = top; tip.style.top = `${top}px`; }
  };

  const render = (el: HTMLElement, extended: boolean): boolean => {
    const hint = el.dataset.uiHint;
    const c = el.dataset.tip ? getContent(el, extended)
      : hint ? { description: hintEscape(hint).replace(/\n/g, '<br>') } : getContent(el, extended);
    if (!c) return false;
    movedCard = undefined;
    placedAnchor = null;
    placedInteractive = false;
    lastTipLeft = NaN;
    lastTipTop = NaN;
    tip.innerHTML = tooltipHtml(c);
    // A directly inspectable sheet row already supplies the Alt target.
    tip.classList.toggle('tt-linked-source',el.matches('[data-tip="attr"],[data-tip="stat"]') && !!el.querySelector('[data-inspect-topic]'));
    const inspectable = el.dataset.tip === 'item' || !!tip.querySelector('[data-inspect-topic]');
    tip.classList.toggle('tt-interactive',inspectable && inspectionEnabled());
    if (inspectable) enableCardInteraction(tip);
    // Toggled per card, so a wide wall never leaves the next panel's compact
    // card rattling around an oversized box.
    tip.classList.toggle('tt-wide', !!c.wide);
    tip.classList.toggle('tt-beside-picker', opts?.placement === 'besidePicker');
    tip.style.removeProperty('--tt-space');
    tip.classList.remove('hidden');
    tip.scrollTop = 0;
    const r = tip.getBoundingClientRect();
    cachedTipW = r.width;
    cachedTipH = r.height;
    activeTooltipOwner = owner;
    placeMovedCard = () => {
      placedAnchor = null;
      placedInteractive = false;
      place(lastPt);
    };
    updateActiveMode = () => {
      // An open child keeps its source mounted until the trail closes.
      const interactive = inspectable && (inspectionEnabled() || heldCard);
      if (!interactive) movedCard = undefined;
      tip.classList.toggle('tt-interactive',interactive);
      cancelLeave();
      if (!interactive && !el.matches(':hover,:focus-visible')) { hide(); return; }
      placedAnchor = null;
      placedInteractive = false;
      const bounds = tip.getBoundingClientRect();
      cachedTipW = bounds.width; cachedTipH = bounds.height;
      place(lastPt);
    };
    return true;
  };

  // ---- HOVER INTENT (opts.delayMs): the not-yet-shown anchor + its clock ---
  let pendingEl: HTMLElement | null = null;
  let intentTimer: number | null = null;
  const disarmIntent = (): void => {
    if (intentTimer !== null) { window.clearTimeout(intentTimer); intentTimer = null; }
    pendingEl = null;
  };

  const hide = (): void => {
    disarmIntent();
    if (!cur) return;
    cur.classList.remove(TIP_ANCHOR_CLASS);
    if (activeAnchor === cur) { activeAnchor = null; activeHide = null; }
    cur = null;
    placedAnchor = null;
    placedInteractive = false;
    opts?.onAnchor?.(null);
    if (activeTooltipOwner === owner) {
      tip.classList.add('hidden'); activeTooltipOwner = null; updateActiveMode = undefined; placeMovedCard = undefined; movedCard = undefined;
      keyboardInspection(false);
    }
  };

  /** Actually raise the box on an anchor (the pre-intent show). */
  const reveal = (el: HTMLElement, e: { clientX: number; clientY: number }): void => {
    if (heldCard && (activeTooltipOwner !== owner || cur !== el)) return;
    if (isOpenSelectHint(el)) { hide(); return; }
    if (el !== cur || activeTooltipOwner !== owner) {
      if (!render(el, !!opts?.extend && tooltipDetail() === 'full')) { hide(); return; }
      cur?.classList.remove(TIP_ANCHOR_CLASS);
      cur = el;
      el.classList.add(TIP_ANCHOR_CLASS);
      opts?.onAnchor?.(el);
      activeAnchor = el;
      activeHide = hide;
    }
    place(e);
  };

  const show = (el: HTMLElement, e: { clientX: number; clientY: number }): void => {
    // While the drag fabric carries a payload (body.dnd-active — its public
    // in-flight signal), the hover card stays DOWN: the ghost chip and the
    // target marks own the pointer's attention, and a card popping over the
    // drop path mid-carry is pure noise. No import — the class IS the seam.
    if (document.body.classList.contains('dnd-active')) { hide(); return; }
    if (heldCard || tip.contains(el) || el.closest('.inspection-tooltip')) return;
    cancelLeave();
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
      if (!ownsEvent(e)) return;
      if (prox.suspended?.() && (e.target as Element).closest('svg')) { hide(); return; }
      // A re-render tore the anchor out — release it so the scan re-picks the
      // rebuilt element (content refreshes from live data in the same beat).
      if (cur && !cur.isConnected) hide();
      // Direct hit wins outright — precision hovering stays precision.
      const direct = (e.target as HTMLElement).closest?.<HTMLElement>(TIP_TARGET);
      if (direct) { show(direct, e); return; }
      const now = performance.now();
      if (now - lastScan < (prox.intervalMs ?? 40)) {
        if (cur) place(e);
        return;
      }
      lastScan = now;
      const stick = 1 - (prox.hysteresis ?? 0.35);
      let best: HTMLElement | null = null;
      const svg = container.querySelector<SVGElement>(prox.selector)?.ownerSVGElement;
      if (svg) best = nearestTreeTarget(svg, prox.selector, e, prox.radiusPx, cur, stick) as unknown as HTMLElement | null;
      else {
        let bd = prox.radiusPx;
        for (const el of container.querySelectorAll<HTMLElement>(prox.selector)) {
          const r = el.getBoundingClientRect();
          if (!r.width) continue;
          const d = Math.hypot(e.clientX - r.x - r.width / 2, e.clientY - r.y - r.height / 2) * (el === cur ? stick : 1);
          if (d < bd) { bd = d; best = el; }
        }
      }
      if (best) show(best, e);
      else hide();
    });
    container.addEventListener('pointerleave', () => {
      if (activeTooltipOwner === owner && tip.classList.contains('tt-interactive')) leaveCard(tip);
      else hide();
    });
    return;
  }

  // ---- CLASSIC MODE: delegated hover, exactly as every panel expects ------
  // Native pickers can open on press and keep the release in their popup.
  // Dismiss the control's own hint before that handoff, including a pending reveal.
  const dismissSelectHint = (event: Event): void => {
    if (!cur && !pendingEl) return;
    const select = (event.target as Element).closest?.('select[data-ui-hint]');
    if (select && (select === cur || select === pendingEl)) hide();
  };
  container.addEventListener('pointerdown', event => { if (event.button === 0) dismissSelectHint(event); }, true);
  container.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'F4' || (event.altKey && event.key.startsWith('Arrow'))) dismissSelectHint(event);
  }, true);
  container.addEventListener('keydown',event => {
    if (heldCard || !matchesItemInspectionKey(event) || !ownsEvent(event)) return;
    const item = (event.target as Element).closest<HTMLElement>('[data-tip="item"]');
    if (!item) return;
    const rect = item.getBoundingClientRect();
    reveal(item,{clientX:rect.right,clientY:rect.top});
    if (activeAnchor === item) focusItemDetails(event);
  });
  container.addEventListener('focusin',event => {
    if (!ownsEvent(event) || heldCard) return;
    const el = (event.target as HTMLElement).closest<HTMLElement>('[data-tip="item"]');
    if (!el || !el.matches(':focus-visible')) return;
    const r = el.getBoundingClientRect();
    reveal(el,{clientX:r.right,clientY:r.top});
  });
  container.addEventListener('focusout',event => {
    if (activeTooltipOwner !== owner || !cur?.contains(event.target as Node)) return;
    if (tip.classList.contains('tt-interactive')) leaveCard(tip);
    else hide();
  });
  if (opts?.placement === 'besidePicker') {
    container.addEventListener('wheel', e => {
      if (activeTooltipOwner !== owner || !cur?.contains(e.target as Node) || tip.scrollHeight <= tip.clientHeight) return;
      const step = e.deltaMode === WheelEvent.DOM_DELTA_PAGE ? tip.clientHeight
        : e.deltaMode === WheelEvent.DOM_DELTA_LINE ? parseFloat(getComputedStyle(tip).lineHeight) : 1;
      e.preventDefault();
      tip.scrollTop += e.deltaY * step;
    }, { passive: false });
  }
  // A HINT card (a translated native title — the close glyph's "Step away")
  // comes down on the click it explained, as a native tooltip would: the
  // click usually takes its button off the screen, and no mouseout ever
  // fires for a hidden node. Rich data-tip cards keep standing through a
  // click — a bag tile's card should survive the level-up press inside it.
  container.addEventListener('click', (e) => {
    if (!ownsEvent(e) || !cur) return;
    if (cur.dataset.uiHint !== undefined && cur.contains(e.target as Node)) hide();
  });
  container.addEventListener('mouseover', (e) => {
    if (!ownsEvent(e)) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>(TIP_TARGET);
    if (!el) {
      // The cursor is over plain panel area. Normally mouseout already hid the
      // box — but a panel re-render (the 0.5s char-sheet refresh, a co-op meta
      // re-render) DETACHES the hovered element, and no mouseout ever fires for
      // a removed node, so the box would stick and trail the cursor until it
      // left the whole panel. A non-tip hover is therefore treated as a leave.
      if (activeTooltipOwner === owner && tip.classList.contains('tt-interactive')) leaveCard(tip);
      else hide();
      return;
    }
    show(el, e);
  });
  container.addEventListener('mousemove', (e) => {
    if (!cur && !pendingEl) return;
    if (!ownsEvent(e)) return;
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
    if (!ownsEvent(e)) return;
    const to = e.relatedTarget as HTMLElement | null;
    if (cur && (!to || !cur.contains(to))) {
      if (activeTooltipOwner === owner && tip.classList.contains('tt-interactive')) leaveCard(tip);
      else hide();
    }
    // A pending intent dies with the exit too — leaving the CONTAINER fires
    // no in-container mouseover to catch it, and the clock must not pop the
    // box over whatever the cursor went to instead.
    else if (pendingEl && (!to || !pendingEl.contains(to))) disarmIntent();
  });
}

export function hideTooltip(): void {
  activeHide?.();
  activeTooltipOwner = null;
  document.getElementById('tooltip')?.classList.add('hidden');
}
