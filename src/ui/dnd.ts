// ---------------------------------------------------------------------------
// THE DRAG FABRIC — one drag-and-drop system for every DOM surface, as open
// registries. Panels never hand-roll drag wiring again: a SOURCE KIND mints
// payloads, a TARGET KIND accepts and consumes them, and the DOM declares
// participation with two attributes that survive every innerHTML re-render
// (the panels' idiom — nothing is registered per element, so a refresh
// mid-gesture strands nothing):
//
//   data-drag="<sourceKind>:<arg>"   this element LIFTS a payload
//   data-drop="<targetKind>:<arg>"   this element TAKES matching payloads
//
// TWO GESTURES, one contract (the vestige twin-gesture rule — they may never
// disagree on what a drop does):
//   • press-drag  — pointerdown on a source, glide past DND_CFG.threshold,
//                   release over a target. The click that follows a real drag
//                   is swallowed, so sources keep their ordinary click verbs.
//   • click-lift  — sources that opt in (DragSourceDef.clickLift): a plain
//                   click lifts the payload onto the cursor; the next click
//                   on an accepting target drops it; re-clicking the source
//                   cancels. The pad- and one-handed-mouse twin.
//
// TWO UNIVERSAL COURTESIES (every source earns them, none re-implements):
//   • modifier clicks never lift — shift/ctrl/alt clicks are a panel's own
//     verbs (shift-drop etc.); only a PLAIN click starts a click-lift.
//   • presses routed through a control INSIDE a source (a row's buttons)
//     belong to that control — the fabric neither arms nor lifts. A source
//     that IS a button (a doll slot) still lifts fine.
//
// Built on POINTER events, never native HTML5 drag — so the pad pointer's
// synthesized press-glide-release (ui/padpointer.ts) drives it unmodified,
// and core/input.ts's anti-grab kill-switch never needs waving past.
//
// While a payload is up: every visible accepting target wears `.dnd-can`,
// the one under the cursor wears `.dnd-over`, the element it lifted FROM
// wears `.dnd-src` (all three re-earned on the mark beat — re-renders can't
// shed them), and a ghost chip rides the pointer (`.dnd-ghost`, `.miss`
// off-target) — styles in index.html beside the panel CSS. Escape or
// right-click cancels (capture — the book stays open; the SECOND Escape
// closes it). Panels that close mid-gesture call dndCancel() so a ghost
// never outlives its surface.
//
// FOUR SMALL LEVERS beyond the chip ghost (the bag's FOOTPRINT GHOST is the
// debut consumer — ui/panels.ts installGearDnd):
//   • payload(arg, el, at) — `at` is the GRAB point (the press for a drag,
//     the click for a lift), so a source can mint a ghost that hangs from
//     where the hand took hold (DragPayload.ghostOffset / ghostBare);
//   • body.dnd-kind-<kind> while a payload is up — kind-scoped CSS (bag
//     tiles go pointer-transparent under a gear carry, so the cells beneath
//     speak the landing);
//   • a `dndend` CustomEvent on document at every landing or cancel — a
//     panel's own preview paint (a landing footprint) clears on it without
//     the fabric knowing what was drawn;
//   • dndSwallowClick() — a gesture that resolved on the PRESS (the pad's
//     held Ⓐ locking a tile) eats the trailing click, so it can never double
//     as a lift.
//
// Headless-safe: listeners install lazily on first registration, behind a
// `typeof document` guard — the sim's arena never touches this module, but
// nothing here would explode if a future harness imported it.
// ---------------------------------------------------------------------------

import { hideTooltip } from './tooltip';
import { uiScaleNow } from './uiScale';

/** The fabric's modular thresholds (avoid-hardcoding: tune here). */
export const DND_CFG = {
  /** Pointer travel (px) that turns a press into a drag — under it, a click. */
  threshold: 6,
  /** Ghost chip offset from the pointer (px) — clear of the hotspot. */
  ghostOffset: { x: 16, y: 14 },
  /** Ms between full target-mark sweeps while a payload is up (a re-rendered
   *  panel re-earns its `.dnd-can` marks within one beat). */
  markEvery: 120,
};

/** What a lifted source is CARRYING. Minted once at lift by the source def;
 *  targets read it, the ghost wears it. `data` is the source's own freight —
 *  the fabric never interprets it. */
export interface DragPayload {
  kind: string;
  arg: string;
  /** Ghost text when no ghostHtml is given (and the a11y name of the carry). */
  label: string;
  /** Optional rich ghost body (inline SVG glyphs etc.). */
  ghostHtml?: string;
  /** Where the ghost hangs from the pointer (screen px, applied BEFORE the
   *  UI-scale) — default DND_CFG.ghostOffset, a chip beside the hotspot. A
   *  FOOTPRINT ghost passes the negative grab offset, so the thing stays
   *  exactly where the hand took hold of it. */
  ghostOffset?: { x: number; y: number };
  /** Draw the ghost BARE (no chip chrome): the html IS the whole ghost. */
  ghostBare?: boolean;
  data?: unknown;
}

/** One SOURCE KIND: how `data-drag="<kind>:<arg>"` elements lift. */
export interface DragSourceDef {
  kind: string;
  /** Mint the payload at lift time — return null to REFUSE (not liftable
   *  right now: wrong state, nothing to give). Refusal leaves the element's
   *  ordinary click behavior untouched. `at` is the GRAB point in viewport
   *  px (the press of a press-drag, the click of a click-lift) — a source
   *  minting a footprint ghost reads the grabbed cell off it. */
  payload(arg: string, el: HTMLElement, at?: { x: number; y: number }): DragPayload | null;
  /** Opt into the click-lift twin gesture (see header). */
  clickLift?: boolean;
}

/** One TARGET KIND: how `data-drop="<kind>:<arg>"` elements take payloads. */
export interface DropTargetDef {
  kind: string;
  /** May THIS payload land on the target carrying `arg`? Drives the `.dnd-can`
   *  affordance and gates the drop itself. */
  accepts(payload: DragPayload, arg: string): boolean;
  /** The landing — runs once per accepted drop. Consumers route mutations
   *  through their own lanes (requestMeta etc.); the fabric only delivers.
   *  `el` is the element the payload landed on — for targets that answer a
   *  drop with an in-place affordance (a flash, a shake) rather than state. */
  drop(payload: DragPayload, arg: string, el: HTMLElement): void;
}

const SOURCES = new Map<string, DragSourceDef>();
const TARGETS = new Map<string, DropTargetDef>();

/** Register a source kind (re-registering replaces in place — HMR-safe,
 *  the registerStamp override idiom). */
export function registerDragSource(def: DragSourceDef): void {
  SOURCES.set(def.kind, def);
  install();
}

/** Register a target kind (same override idiom). */
export function registerDropTarget(def: DropTargetDef): void {
  TARGETS.set(def.kind, def);
  install();
}

// --- live gesture state ------------------------------------------------------

/** A press that may yet become a drag. */
let armed: { el: HTMLElement; kind: string; arg: string; x: number; y: number } | null = null;
/** The payload in the air (either gesture), or null. */
let carried: DragPayload | null = null;
/** 'drag' = press-glide-release; 'lift' = click-lift (drops on click). */
let mode: 'drag' | 'lift' = 'drag';
let ghost: HTMLDivElement | null = null;
let hoverEl: HTMLElement | null = null;
let lastMark = 0;
/** Swallow the click the browser fires after a completed/cancelled drag. */
let swallowClick = false;
let installed = false;

/** The payload currently in the air (either gesture), or null — for panels
 *  that want to render lift-aware hints. */
export function dndCarried(): DragPayload | null { return carried; }

/** Cancel any gesture in flight (panel closers call this so a ghost never
 *  outlives its surface). Safe to call when nothing is up. */
export function dndCancel(): void { drop(null); }

/** Eat the NEXT click — armed until it lands or a fresh press resets it —
 *  for a gesture that already resolved on the PRESS (the pad's held Ⓐ
 *  locking a bag tile), so its trailing click can neither lift nor re-fire
 *  a source verb. Unlike the post-drag swallow this never decays: a pad's
 *  release may come seconds after its press. */
export function dndSwallowClick(): void { swallowClick = true; }

// --- the machinery -----------------------------------------------------------

function parseAttr(el: Element | null, attr: string): { el: HTMLElement; kind: string; arg: string } | null {
  const hit = el instanceof Element ? el.closest<HTMLElement>(`[${attr}]`) : null;
  const raw = hit?.getAttribute(attr);
  if (!hit || !raw) return null;
  const i = raw.indexOf(':');
  return { el: hit, kind: i < 0 ? raw : raw.slice(0, i), arg: i < 0 ? '' : raw.slice(i + 1) };
}

/** Interactive controls keep their own gestures: a press or click routed
 *  through a control INSIDE a source (a row's Level/Drop button) belongs to
 *  that control, never to the fabric. The source being such a control ITSELF
 *  (a doll-slot button) is fine — then the gesture is unambiguous. */
const INNER_CONTROLS = 'button, input, select, textarea, a[href]';
function ownedByInnerControl(target: EventTarget | null, sourceEl: HTMLElement): boolean {
  const ctl = target instanceof Element ? target.closest(INNER_CONTROLS) : null;
  return !!ctl && ctl !== sourceEl && sourceEl.contains(ctl);
}

/** The accepting target under a viewport point, or null. */
function targetAt(x: number, y: number): { def: DropTargetDef; arg: string; el: HTMLElement } | null {
  if (!carried) return null;
  const t = parseAttr(document.elementFromPoint(x, y), 'data-drop');
  const def = t && TARGETS.get(t.kind);
  return def && def.accepts(carried, t!.arg) ? { def, arg: t!.arg, el: t!.el } : null;
}

function lift(payload: DragPayload, m: 'drag' | 'lift', x: number, y: number): void {
  carried = payload;
  mode = m;
  hideTooltip(); // the hover card must never shadow the drop path
  document.body.classList.add('dnd-active', `dnd-kind-${payload.kind}`);
  ghost = document.createElement('div');
  ghost.className = payload.ghostBare ? 'dnd-ghost bare' : 'dnd-ghost';
  if (payload.ghostHtml) ghost.innerHTML = payload.ghostHtml;
  else ghost.textContent = payload.label;
  document.body.appendChild(ghost);
  moveGhost(x, y);
  markTargets(true);
}

function moveGhost(x: number, y: number): void {
  if (!ghost) return;
  // The ghost owns its inline transform (a translate every move), which would
  // override any stylesheet transform — so the UI-scale dial composes HERE
  // ('self' mode; ui/uiScale.ts pins the origin so growth hangs off the cursor).
  const off = carried?.ghostOffset ?? DND_CFG.ghostOffset;
  ghost.style.transform =
    `translate(${x + off.x}px, ${y + off.y}px) scale(${uiScaleNow()})`;
}

/** Sweep every visible target: accepting ones wear `.dnd-can`, and the
 *  element(s) whose data-drag matches the carried payload wear `.dnd-src`
 *  (the "this is what's in the air" affordance). Re-run on a beat
 *  (DND_CFG.markEvery) so panels that re-render mid-gesture re-earn their
 *  marks — the attribute IS the registration. */
function markTargets(force: boolean): void {
  const now = performance.now();
  if (!force && now - lastMark < DND_CFG.markEvery) return;
  lastMark = now;
  for (const el of document.querySelectorAll<HTMLElement>('[data-drop]')) {
    const t = parseAttr(el, 'data-drop');
    const def = t && TARGETS.get(t.kind);
    el.classList.toggle('dnd-can', !!(def && carried && def.accepts(carried, t!.arg)));
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-drag]')) {
    const s = parseAttr(el, 'data-drag');
    el.classList.toggle('dnd-src', !!(carried && s && s.kind === carried.kind && s.arg === carried.arg));
  }
}

function hover(x: number, y: number): void {
  const hit = targetAt(x, y);
  if (hoverEl && hoverEl !== hit?.el) hoverEl.classList.remove('dnd-over');
  hoverEl = hit?.el ?? null;
  hoverEl?.classList.add('dnd-over');
  ghost?.classList.toggle('miss', !hit);
}

/** Land (target given) or cancel (null) — the ONE teardown path. */
function drop(hit: { def: DropTargetDef; arg: string; el: HTMLElement } | null): void {
  const p = carried;
  armed = null;
  carried = null;
  ghost?.remove();
  ghost = null;
  hoverEl?.classList.remove('dnd-over');
  hoverEl = null;
  document.body.classList.remove('dnd-active');
  if (p) document.body.classList.remove(`dnd-kind-${p.kind}`);
  for (const el of document.querySelectorAll<HTMLElement>('.dnd-can')) el.classList.remove('dnd-can');
  for (const el of document.querySelectorAll<HTMLElement>('.dnd-src')) el.classList.remove('dnd-src');
  if (p && hit) hit.def.drop(p, hit.arg, hit.el);
  // The carry ended (landed or cancelled): consumers that painted their own
  // preview clear it here — the fabric never learns what they drew.
  if (p) document.dispatchEvent(new CustomEvent('dndend'));
}

function install(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  document.addEventListener('pointerdown', (e) => {
    swallowClick = false;
    if (carried) {
      // Right-click while carrying = cancel (either gesture).
      if (e.button === 2) { drop(null); e.preventDefault(); e.stopPropagation(); }
      return;
    }
    if (e.button !== 0) return;
    const s = parseAttr(e.target as Element, 'data-drag');
    if (s && SOURCES.has(s.kind) && !ownedByInnerControl(e.target, s.el)) {
      armed = { ...s, x: e.clientX, y: e.clientY };
    }
  }, true);

  document.addEventListener('pointermove', (e) => {
    if (armed && !carried) {
      const dx = e.clientX - armed.x, dy = e.clientY - armed.y;
      if (dx * dx + dy * dy >= DND_CFG.threshold * DND_CFG.threshold) {
        const src = SOURCES.get(armed.kind)!;
        const p = armed.el.isConnected ? src.payload(armed.arg, armed.el, { x: armed.x, y: armed.y }) : null;
        armed = null;
        if (p) lift(p, 'drag', e.clientX, e.clientY);
      }
    }
    if (carried) {
      moveGhost(e.clientX, e.clientY);
      markTargets(false);
      hover(e.clientX, e.clientY);
    }
  }, true);

  document.addEventListener('pointerup', (e) => {
    armed = null;
    if (!carried || mode !== 'drag') return;
    // The browser's follow-up click must not re-fire source verbs — but it
    // arrives within the same input burst or not at all (release off-window,
    // synthetic ups), so the swallow DECAYS rather than lying in wait for
    // some unrelated later click.
    swallowClick = true;
    window.setTimeout(() => { swallowClick = false; }, 200);
    drop(targetAt(e.clientX, e.clientY));
  }, true);

  // CLICK, capture-phase: the post-drag swallow, the click-lift twin, and the
  // lifted drop all resolve here — before any panel's own click handlers.
  document.addEventListener('click', (e) => {
    if (swallowClick) {
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (carried && mode === 'lift') {
      const hit = targetAt(e.clientX, e.clientY);
      if (hit) { drop(hit); e.preventDefault(); e.stopPropagation(); return; }
      const s = parseAttr(e.target as Element, 'data-drag');
      if (s && s.kind === carried.kind && s.arg === carried.arg) {
        // Re-clicking the carried source cancels — and ONLY cancels.
        drop(null);
        e.preventDefault();
        e.stopPropagation();
      }
      return; // clicks elsewhere keep working; the carry rides along
    }
    if (!carried) {
      // Modifier clicks are VERBS (shift-drop, ctrl-compare, whatever a panel
      // means by them) — a lift only ever rides a plain click.
      if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
      const s = parseAttr(e.target as Element, 'data-drag');
      const src = s && SOURCES.get(s.kind);
      if (src?.clickLift && !ownedByInnerControl(e.target, s!.el)) {
        const p = src.payload(s!.arg, s!.el, { x: e.clientX, y: e.clientY });
        if (p) lift(p, 'lift', e.clientX, e.clientY);
        // No swallow: the source's ordinary click verb (select, open) still runs.
      }
    }
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (carried || armed)) {
      drop(null);
      // The FIRST Escape spends itself on the cancel; the panel's own
      // close-cascade waits for the second.
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  document.addEventListener('contextmenu', (e) => {
    if (carried) { drop(null); e.preventDefault(); }
  }, true);

  window.addEventListener('blur', () => drop(null));
}
