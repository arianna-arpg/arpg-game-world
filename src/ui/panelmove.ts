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
//   · THE BOOK MOVES AS ONE (ui/panels.ts folioLeaf.present) — a leaf that
//     comes to the front of a folio book takes the seat the previous front
//     was DRAWN at when that front had been moved, so switching tabs never
//     teleports the book.
//   · SELF-HEALING DRAGS — the pan/zoom helper's rule: every move re-checks
//     the button mask; pointercancel / lostpointercapture end the drag; a
//     drag can outlive its button by at most one event.
//
// THE LAYOUT (her second ask, same day — "an explicit toggleable mechanism
// in the options": opt in, save it, reset it, lock pieces in place):
//   · THE OPT-IN — a MASTER TOGGLE (Settings.layout.movable, OFF by default:
//     the classic fixed seats) gates every drag and every lock glyph. OFF
//     resets shown panels to the stylesheet's seat but KEEPS the remembered
//     layout for the next ON.
//   · THE SEAT REMEMBERS ACROSS SESSIONS — a settled drag (its release), a
//     book handoff, and a ribbon double-click PERSIST the panel's seat as
//     VIEWPORT FRACTIONS of its top-left (window sizes differ between
//     sessions; THE KEEP re-clamps on show); a freshly-shown panel takes its
//     remembered seat (the per-frame sync — every show path, no bookkeeping
//     at the callers).
//   · THE LOCK — each panel wears a 🔓/🔒 glyph beside its close glyph
//     while the master is ON; a locked panel refuses the drag and keeps its
//     seat. Locks persist beside the seats, keyed by the root's id.
//   · THE RESET (Options) — every seat and lock cleared, every panel back to
//     its stylesheet seat.
//   The store is CONFIGURED once by the UI (configurePanelLayout — settings
//   own the state, this module owns the mechanics); unconfigured, the
//   fabric is movable and forgetful (a bare test document).
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
  /** Class the sync stamps while the panel is draggable (CSS gives the ribbon its grab cursor). */
  movableClass: 'panel-movable',
  /** Attribute stamped while a panel carries a manual seat. */
  movedAttr: 'data-moved',
  /** The lock glyph's class (its `locked` state class rides beside it). */
  lockClass: 'panel-lock',
};

/** A remembered seat: the panel's top-left as fractions of the viewport. */
export interface PanelSeat { fx: number; fy: number }

/** THE LAYOUT state the settings own (meta/settings.ts UiLayoutOptions). */
export interface PanelLayoutState {
  movable: boolean;
  seats: Record<string, PanelSeat>;
  locked: Record<string, boolean>;
}

export interface PanelLayoutStore {
  get(): PanelLayoutState;
  save(): void;
}

let layoutStore: PanelLayoutStore | null = null;

/** Hand the fabric its state (the UI does this once, from settings). */
export function configurePanelLayout(store: PanelLayoutStore | null): void {
  layoutStore = store;
}

const layoutState = (): PanelLayoutState | null => layoutStore?.get() ?? null;

/** THE OPT-IN: is the UI movable at all right now? (Unconfigured = yes.) */
export function panelLayoutMovable(): boolean {
  return layoutState()?.movable ?? true;
}

/** The key a panel's seat and lock persist under — its root's id. */
export const panelKeyOf = (el: HTMLElement): string => el.id || el.className;

export function panelLocked(el: HTMLElement): boolean {
  return !!layoutState()?.locked[panelKeyOf(el)];
}

export function setPanelLocked(el: HTMLElement, locked: boolean): void {
  const l = layoutState();
  if (!l) return;
  if (locked) l.locked[panelKeyOf(el)] = true;
  else delete l.locked[panelKeyOf(el)];
  layoutStore?.save();
  syncPanelChrome(el);
}

/** Does this panel carry a manual seat (dragged, or handed one by its book)? */
export function panelMoved(el: HTMLElement): boolean {
  return el.hasAttribute(PANEL_MOVE_CFG.movedAttr);
}

/** Place a panel's top-left at SCREEN px, clamped by THE KEEP. The zoom law
 *  converts to the panel's own px here. (Not persisted — the settled
 *  moments persist: persistPanelSeat.) */
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

/** Back to the stylesheet's seat (the ribbon's double-click; the couch dock;
 *  the master toggle going OFF). Not persisted by itself. */
export function panelMoveReset(el: HTMLElement): void {
  el.style.left = '';
  el.style.top = '';
  el.style.right = '';
  el.style.bottom = '';
  el.style.transform = '';
  el.removeAttribute(PANEL_MOVE_CFG.movedAttr);
}

/** THE SEAT REMEMBERS: write this panel's current seat (or its absence)
 *  into the layout as viewport fractions and save. A no-op while the
 *  master toggle is OFF (the remembered layout waits, untouched). */
export function persistPanelSeat(el: HTMLElement): void {
  const l = layoutState();
  if (!l || !l.movable || !layoutStore) return;
  const key = panelKeyOf(el);
  const seat = panelSeatOf(el);
  if (!seat) delete l.seats[key];
  else {
    l.seats[key] = {
      fx: seat.left / Math.max(1, window.innerWidth),
      fy: seat.top / Math.max(1, window.innerHeight),
    };
  }
  layoutStore.save();
}

/** Seat a SHOWN panel at its remembered seat (true when one applied). */
export function seatPanel(el: HTMLElement): boolean {
  const l = layoutState();
  if (!l?.movable) return false;
  const s = l.seats[panelKeyOf(el)];
  if (!s) return false;
  panelMoveTo(el, s.fx * window.innerWidth, s.fy * window.innerHeight);
  return true;
}

/** THE RESET: every seat and lock cleared and saved; every root back to its
 *  stylesheet seat, its chrome re-read. */
export function resetPanelLayout(roots: readonly HTMLElement[]): void {
  const l = layoutState();
  if (l) {
    l.seats = {};
    l.locked = {};
    layoutStore?.save();
  }
  for (const el of roots) {
    panelMoveReset(el);
    seated.delete(el);
    syncPanelChrome(el);
  }
}

/** Re-read the master toggle for every root now (the Options flip): shown
 *  panels re-seat (ON) or return to the stylesheet (OFF), chrome follows. */
export function panelLayoutRefresh(roots: readonly HTMLElement[]): void {
  for (const el of roots) seated.delete(el);
  panelLayoutSync(roots);
}

/** Roots seated since they were last shown (a hidden root forgets). */
const seated = new WeakSet<HTMLElement>();

/** THE SYNC (once per frame from the UI): a freshly-shown root takes its
 *  remembered seat (ON) or sheds a lingering manual seat (OFF); every shown
 *  root's chrome — the grab cursor, the lock glyph — follows the master
 *  toggle and its lock. Cheap: a class check per root, a query per shown
 *  root. */
export function panelLayoutSync(roots: readonly HTMLElement[]): void {
  const movable = panelLayoutMovable();
  for (const el of roots) {
    if (el.classList.contains('hidden')) { seated.delete(el); continue; }
    if (!seated.has(el)) {
      seated.add(el);
      if (movable) seatPanel(el);
      else if (panelMoved(el)) panelMoveReset(el);
    }
    syncPanelChrome(el);
  }
}

/** The grab cursor class + THE LOCK glyph, honest with the toggle and the
 *  lock. The glyph seats in the close glyph's sticky row (left of the ✕),
 *  else in the ribbon; templates rebuild both, so a missing glyph is
 *  re-minted here. */
function syncPanelChrome(el: HTMLElement): void {
  const movable = panelLayoutMovable();
  const locked = panelLocked(el);
  el.classList.toggle(PANEL_MOVE_CFG.movableClass, movable && !locked);
  const cls = PANEL_MOVE_CFG.lockClass;
  let glyph = el.querySelector<HTMLButtonElement>(`:scope > .panel-x-row > .${cls}, :scope > ${PANEL_MOVE_CFG.handle} > .${cls}`);
  if (!movable) { glyph?.remove(); return; }
  if (!glyph) {
    const row = el.querySelector<HTMLElement>(':scope > .panel-x-row') ?? el.querySelector<HTMLElement>(`:scope > ${PANEL_MOVE_CFG.handle}`);
    if (!row) return;
    glyph = document.createElement('button');
    glyph.type = 'button';
    glyph.className = cls;
    glyph.setAttribute('aria-label', 'Lock panel in place');
    glyph.addEventListener('click', (e) => {
      e.stopPropagation();
      setPanelLocked(el, !panelLocked(el));
    });
    if (row.classList.contains('panel-x-row')) row.insertBefore(glyph, row.firstChild);
    else row.appendChild(glyph);
  }
  glyph.textContent = locked ? '🔒' : '🔓';
  glyph.title = locked
    ? 'Locked in place — click to unlock, then drag by the ribbon.'
    : 'Unlocked — drag this panel by its ribbon; click to lock it in place. Double-click the ribbon to return it to its default seat.';
  glyph.classList.toggle('locked', locked);
}

const attached = new WeakSet<HTMLElement>();

/** Make a panel root draggable by its ribbon. Idempotent per root. `onMove`
 *  fires after every placement (a book's tab strip re-seats on it). */
export function attachPanelMove(el: HTMLElement, opts: { onMove?: () => void } = {}): void {
  if (attached.has(el)) return;
  attached.add(el);

  interface Drag { id: number; x0: number; y0: number; left0: number; top0: number; moved: boolean; handle: HTMLElement }
  let drag: Drag | null = null;

  const handleOf = (t: EventTarget | null): HTMLElement | null => {
    if (!(t instanceof Element)) return null;
    if (!panelLayoutMovable() || panelLocked(el)) return null;
    if (t.closest(PANEL_MOVE_CFG.ignore)) return null;
    const h = t.closest<HTMLElement>(PANEL_MOVE_CFG.handle);
    return h && h.parentElement === el ? h : null;
  };
  const end = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return;
    try { el.releasePointerCapture(e.pointerId); } catch { /* already released / synthetic */ }
    drag.handle.style.cursor = '';
    const settled = drag.moved;
    drag = null;
    if (settled) persistPanelSeat(el); // THE SEAT REMEMBERS — at the release, never per move
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
    persistPanelSeat(el);
    opts.onMove?.();
  });
}
