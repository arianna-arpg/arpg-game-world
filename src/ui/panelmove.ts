// ---------------------------------------------------------------------------
// THE PANEL MOVE (2026-09-04, her ask: "drag the UI elements around by the
// top ribbon so the UI is dynamic in its viewability") — every panel with a
// RIBBON (its own `h2` header) can be dragged by it. One attach per panel
// root, delegated (templates rebuild their h2 on every refresh; the listener
// lives on the root and re-finds the ribbon per press), so a panel opts in
// with one call and keeps opting in for the life of the document.
//
// THE LAWS:
//   · THE RIBBON IS THE HANDLE — only a press on the panel's own direct-child
//     ribbon starts a drag; the ribbon's controls (the close glyph, zoom
//     groups, search inputs, buttons) keep their own press. Content areas
//     are never handles: the trees' SVG pans, the bag's tiles lift, the
//     map's chart scrolls — none of that is touched.
//   · THE ZOOM LAW — .panel roots ride CSS `zoom` (ui/uiScale.ts), so inline
//     offsets are written in the panel's OWN px: screen px ÷ zoom. Measured
//     rects (screen px) in, style offsets (panel px) out — one conversion,
//     here, never at a call site.
//   · THE KEEP — a dragged panel can never leave the viewport entirely: at
//     least keepPx of it stays reachable on every side, and its ribbon never
//     rises above the top edge (the handle stays grabbable).
//   · A MOVED PANEL REMEMBERS — the inline seat outlives hide/show for the
//     session (a class toggles `hidden`; inline styles stand). Double-click
//     the ribbon to return it to the stylesheet's seat; the couch dock
//     (ownPanel for a guest) resets it too — the flank wins.
//   · THE BOOK MOVES AS ONE (ui/panels.ts folioLeaf.present) — a leaf that
//     comes to the front of a folio book takes the seat the previous front
//     was DRAWN at when that front had been moved, so switching tabs never
//     teleports the book.
//   · SELF-HEALING DRAGS — the pan/zoom helper's rule: every move re-checks
//     the button mask; pointercancel / lostpointercapture end the drag; a
//     drag can outlive its button by at most one event.
// ---------------------------------------------------------------------------

import { uiScaleNow } from './uiScale';

export const PANEL_MOVE_CFG = {
  /** The handle selector — the panel's ribbon. Must be a DIRECT child of the root. */
  handle: 'h2',
  /** Ribbon descendants that keep their own press (never start a drag). */
  ignore: 'button, input, select, textarea, a, label, [data-panel-x], .tree-zoom-grp, .map-zoom-grp, .realm-tabs',
  /** Screen px of the panel that must stay inside the viewport on every side. */
  keepPx: 56,
  /** Pointer travel (px) before a ribbon press becomes a drag — a jittery click stays a click. */
  dragThresholdPx: 3,
  /** Class the attach stamps on the root (CSS gives the ribbon its grab cursor). */
  movableClass: 'panel-movable',
  /** Attribute stamped while a panel carries a manual seat. */
  movedAttr: 'data-moved',
};

/** Does this panel carry a manual seat (dragged, or handed one by its book)? */
export function panelMoved(el: HTMLElement): boolean {
  return el.hasAttribute(PANEL_MOVE_CFG.movedAttr);
}

/** Place a panel's top-left at SCREEN px, clamped by THE KEEP. The zoom law
 *  converts to the panel's own px here. */
export function panelMoveTo(el: HTMLElement, screenLeft: number, screenTop: number): void {
  const z = uiScaleNow() || 1;
  const vw = window.innerWidth, vh = window.innerHeight;
  const r = el.getBoundingClientRect();
  const keep = PANEL_MOVE_CFG.keepPx;
  const left = Math.min(Math.max(screenLeft, keep - r.width), vw - keep);
  const top = Math.min(Math.max(screenTop, 0), vh - keep);
  el.style.left = `${Math.round(left / z)}px`;
  el.style.top = `${Math.round(top / z)}px`;
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  el.style.transform = 'none';
  el.setAttribute(PANEL_MOVE_CFG.movedAttr, '1');
}

/** A moved panel's seat in SCREEN px (its inline offsets × zoom) — readable
 *  while hidden, which is how a closing front hands its seat to the leaf
 *  the book promotes. null = the stylesheet's seat. */
export function panelSeatOf(el: HTMLElement): { left: number; top: number } | null {
  if (!panelMoved(el)) return null;
  const z = uiScaleNow() || 1;
  return { left: parseFloat(el.style.left) * z, top: parseFloat(el.style.top) * z };
}

/** Back to the stylesheet's seat (the ribbon's double-click; the couch dock). */
export function panelMoveReset(el: HTMLElement): void {
  el.style.left = '';
  el.style.top = '';
  el.style.right = '';
  el.style.bottom = '';
  el.style.transform = '';
  el.removeAttribute(PANEL_MOVE_CFG.movedAttr);
}

/** Make a panel root draggable by its ribbon. Idempotent per root. `onMove`
 *  fires after every placement (a book's tab strip re-seats on it). */
export function attachPanelMove(el: HTMLElement, opts: { onMove?: () => void } = {}): void {
  if (el.classList.contains(PANEL_MOVE_CFG.movableClass)) return;
  el.classList.add(PANEL_MOVE_CFG.movableClass);

  interface Drag { id: number; x0: number; y0: number; left0: number; top0: number; moved: boolean; handle: HTMLElement }
  let drag: Drag | null = null;

  const handleOf = (t: EventTarget | null): HTMLElement | null => {
    if (!(t instanceof Element)) return null;
    if (t.closest(PANEL_MOVE_CFG.ignore)) return null;
    const h = t.closest<HTMLElement>(PANEL_MOVE_CFG.handle);
    return h && h.parentElement === el ? h : null;
  };
  const end = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return;
    try { el.releasePointerCapture(e.pointerId); } catch { /* already released / synthetic */ }
    drag.handle.style.cursor = '';
    drag = null;
  };

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || drag) return;
    const h = handleOf(e.target);
    if (!h) return;
    const r = el.getBoundingClientRect();
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, left0: r.left, top0: r.top, moved: false, handle: h };
    e.preventDefault(); // no text selection along the ribbon mid-drag
    try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointer (the pad) */ }
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if ((e.buttons & 1) === 0) { end(e); return; } // the button is up and no pointerup came
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < PANEL_MOVE_CFG.dragThresholdPx) return;
      drag.moved = true;
      drag.handle.style.cursor = 'var(--cursor-grabbing, grabbing)';
    }
    panelMoveTo(el, drag.left0 + dx, drag.top0 + dy);
    opts.onMove?.();
  });
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('lostpointercapture', end);
  el.addEventListener('dblclick', (e) => {
    if (!handleOf(e.target)) return;
    panelMoveReset(el);
    opts.onMove?.();
  });
}
