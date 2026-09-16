// ---------------------------------------------------------------------------
// THE COMPACT LAYOUT — the phone's width as ONE stamped class, the rules as
// a registry (the ui/uiScale.ts idiom: one injected stylesheet built from
// rows, never a hand-edited style block).
//
// THE PLATFORM FABRIC (core/platform.ts) decides WHETHER the layout is
// compact (a preset's default, the width rule, or the player's own dial);
// this module owns HOW: `stampPlatform` writes the verdict onto :root —
// `.ui-compact` (narrow surfaces), `.ui-touch` (the touch fabric stands),
// `data-platform="<preset>"` and the safe-area insets as CSS variables —
// and COMPACT_RULES says what each surface does under it.
//
// THE LAWS:
//   · FLOORS, NOT LOOKS — compact rules grow targets and trim chrome; they
//     never restyle a surface's identity. Zero-specificity floors ride
//     `:where()` so every dressed control (tabs, chips, the attribute
//     steppers) keeps its own rule and gets a targeted row instead.
//   · ONE STAMP — no panel sniffs the width itself; every rule keys off the
//     class the fabric stamped, so a forced-compact desktop window and a
//     phone read identically.
//   · ADDITIVE — with the class absent every rule is dormant and the desktop
//     sheet is byte-identical (the solo invariant, in CSS).
// Every number here is unblessed (her standing word).
// ---------------------------------------------------------------------------

import type { PlatformView } from '../core/platform';

export const COMPACT_CFG = {
  /** The :root class the layout keys off. */
  className: 'ui-compact',
  /** The :root class stamped while THE TOUCH FABRIC stands. */
  touchClass: 'ui-touch',
  /** The :root attribute naming the resolved preset (CSS hooks per device). */
  platformAttr: 'data-platform',
  /** Minimum tap target the floors aim at (CSS px). */
  minTargetPx: 40,
  /** The safe-area inset variables stamped on :root (CSS px). */
  safeVars: { top: '--safe-top', right: '--safe-right', bottom: '--safe-bottom', left: '--safe-left' },
} as const;

/** THE REGISTRY — selector (already carrying the class), declarations, and
 *  the why. Order is irrelevant except where two rows share a selector. */
export const COMPACT_RULES: ReadonlyArray<{ sel: string; css: string; why: string }> = [
  { sel: ':where(.ui-compact .panel) button', css: 'min-height: 30px; padding: 5px 10px; font-size: 12px;',
    why: 'THE BUTTON PARITY floor grows for a thumb; :where() keeps every dressed control on its own rule' },
  { sel: '.ui-compact .panel-x', css: 'width: 36px; height: 36px; margin: -8px -8px 0 0; font-size: 16px;',
    why: 'THE CLOSE GLYPH at a thumb\'s size' },
  { sel: '.ui-compact .panel h2', css: 'padding-right: 40px;',
    why: 'the header reserves the grown glyph corner' },
  { sel: '.ui-compact .book-tab, .ui-compact .stat-tabs button', css: 'min-height: 30px; padding: 5px 8px; font-size: 11px;',
    why: 'tab strips are the first thing a page asks a thumb to hit' },
  { sel: '.ui-compact .rebind-row', css: 'min-height: 34px; align-items: center; gap: 6px;',
    why: 'option rows breathe so their controls stand apart' },
  { sel: '.ui-compact .rebind-row > button, .ui-compact .rebind-row .pad-opt > button', css: 'min-height: 30px;',
    why: 'option toggles as tap targets' },
  { sel: '.ui-compact .rebind-row input[type=range]', css: 'min-height: 28px; min-width: 120px;',
    why: 'sliders take a thumb' },
  { sel: '.ui-compact .attr-row button', css: 'width: 30px; height: 28px;',
    why: 'the attribute steppers (22×20 on desktop) grow to a target' },
  { sel: '.ui-compact #char-sheet', css: 'top: 48px; max-height: calc((100dvh - 110px) / var(--ui-scale));',
    why: 'the sheet climbs and fills a short screen' },
  { sel: '.ui-compact #inventory', css: 'top: 48px;',
    why: 'the bag climbs beside it' },
  { sel: '.ui-compact .esc-btns button, .ui-compact #start-menu button, .ui-compact .panel-foot button', css: 'min-height: 40px;',
    why: 'the menus\' main actions are the first taps a phone makes' },
  { sel: '.ui-compact .menu-btn, .ui-compact .menu-tile', css: 'width: 52px; height: 52px;',
    why: 'THE MENU BAR\'s tiles grow to a thumb' },
  { sel: '.ui-compact .panel', css: 'scrollbar-width: thin;',
    why: 'scrollbars stop eating a narrow panel' },
  { sel: '.ui-touch .menu-bar[data-anchor="left"]', css: 'left: calc(16px + var(--safe-left, 0px)); bottom: calc(16px + var(--safe-bottom, 0px));',
    why: 'the bar clears a notch / home bar while the touch fabric stands' },
  { sel: '.ui-touch .menu-bar[data-anchor="right"]', css: 'right: calc(16px + var(--safe-right, 0px)); bottom: calc(16px + var(--safe-bottom, 0px));',
    why: 'its right seat likewise' },
];

const STYLE_ID = 'compact-layout-fabric';

/** Build (or rebuild — idempotent, HMR-safe) the one stylesheet. Call once at
 *  boot beside installUiScaleStyles; the rules stay dormant until stamped. */
export function installCompactStyles(): void {
  document.getElementById(STYLE_ID)?.remove();
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = COMPACT_RULES.map(r => `${r.sel} { ${r.css} }`).join('\n');
  document.head.appendChild(el);
}

/** Write a resolved view onto :root — the ONE place the platform's verdict
 *  becomes CSS state. Idempotent; called on every view change. */
export function stampPlatform(view: PlatformView): void {
  const root = document.documentElement;
  root.classList.toggle(COMPACT_CFG.className, view.compact);
  root.classList.toggle(COMPACT_CFG.touchClass, view.touchControls);
  root.setAttribute(COMPACT_CFG.platformAttr, view.preset.id);
  const v = COMPACT_CFG.safeVars, s = view.caps.safe;
  root.style.setProperty(v.top, `${s.top}px`);
  root.style.setProperty(v.right, `${s.right}px`);
  root.style.setProperty(v.bottom, `${s.bottom}px`);
  root.style.setProperty(v.left, `${s.left}px`);
}

/** The stamped verdicts, read back (QA + the folio's own measurements). */
export function compactStamped(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains(COMPACT_CFG.className);
}
