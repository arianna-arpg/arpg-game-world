// ---------------------------------------------------------------------------
// THE UI SCALE FABRIC — one player dial that grows every reading surface.
//
// Accessibility is the point: a player who can't read 11px Verdana turns ONE
// slider (Options → UI Scale) and the whole interface — DOM panels, tooltips,
// popups, the hint bar, the canvas HUD — grows together. The dial itself is a
// Settings field (persisted, re-clamped on load like every numeric option);
// this module owns the config rails and the DOM half of the delivery. The
// canvas HUD rides the SAME value in the renderer as a scaled sub-pass over
// virtual dimensions (renderer.ts, the UI-scale sub-pass) — one dial, two
// delivery layers, zero drift.
//
// Every DOM surface rides through ONE injected stylesheet built from the
// UI_SCALE_SURFACES registry below. A new static surface is one entry; a
// dynamically-built overlay root opts in by wearing UI_SCALE_CFG.markerClass.
// Never a hand-edited style block. Three delivery modes, because position
// math differs by how a surface is anchored:
//
//   'zoom'  — CSS-anchored frames (panels, the hint bar, fullscreen overlay
//             roots). zoom scales the element's own px lengths INCLUDING its
//             top/right offsets, so the frame grows away from its screen
//             edge proportionally — while %-and-viewport units keep their
//             real meaning (a max-width: 94vw cap still caps at the screen).
//   'scale' — JS-positioned floaters (tooltip, choice popup) whose left/top
//             are written in viewport px at runtime. zoom would multiply
//             those coordinates out from under the code that wrote them;
//             transform: scale leaves layout coordinates alone and scales
//             only the drawn box. Origin pins to top-left so growth hangs
//             off the anchor corner — placement code that measures via
//             getBoundingClientRect (which sees transforms) stays correct.
//   'self'  — floaters that OWN their inline transform (the drag ghost rides
//             a translate() every mousemove; an inline transform overrides
//             any stylesheet one). The element composes scale(uiScaleNow())
//             into its own transform; the sheet only pins the origin.
//
// Deliberately NOT on this dial: world-anchored text (damage numbers,
// nameplates, prompts over doodads) — that ink belongs to the battlefield,
// scales with the camera, and hiding the world behind bigger numbers helps
// no one. If combat text ever earns its own legibility dial, that is a
// SECOND Settings field beside this one, not a rider on it.
// ---------------------------------------------------------------------------

/** The dial's rails. The slider builds its range from these, the save
 *  re-clamps into them on load, and the renderer clamps its live read —
 *  retune here and every consumer follows. */
export const UI_SCALE_CFG = {
  min: 0.75,
  max: 2,
  step: 0.05,
  default: 1,
  /** The custom property the injected stylesheet reads; stamped on :root. */
  cssVar: '--ui-scale',
  /** Opt-in class for dynamically-built overlay roots (co-op lobby, crafting
   *  minigames, …): wear it and ride the dial in 'zoom' mode — no registry
   *  edit, no import, at the cost of building your own DOM. */
  markerClass: 'ui-scaled',
} as const;

export type UiScaleMode = 'zoom' | 'scale' | 'self';

/** THE REGISTRY of scaled DOM surfaces. Selector + delivery mode (see the
 *  header for when each mode is correct). Order is irrelevant; keep entries
 *  commented with what they are, not what they look like. */
export const UI_SCALE_SURFACES: ReadonlyArray<{ sel: string; mode: UiScaleMode }> = [
  { sel: '.panel', mode: 'zoom' },                        // every static panel root (index.html)
  { sel: '#hint-bar', mode: 'zoom' },                     // bottom keybind strip (its own translateX(-50%) is untouched — zoom ≠ transform)
  { sel: `.${UI_SCALE_CFG.markerClass}`, mode: 'zoom' },  // dynamic overlay roots that opted in
  { sel: '.tooltip', mode: 'scale' },                     // the hover card — placed at the cursor in viewport px (ui/tooltip.ts)
  { sel: '.choice-popup', mode: 'scale' },                // passive choice-node deals — placed over the node's rect (ui/panels.ts)
  { sel: '.dnd-ghost', mode: 'self' },                    // the drag ghost — composes its own scale into its translate (ui/dnd.ts)
];

const STYLE_ID = 'ui-scale-fabric';

/** Build (or rebuild — idempotent, HMR-safe) the one stylesheet that delivers
 *  the dial to every registered DOM surface. Call once at boot, before the
 *  first applyUiScale. */
export function installUiScaleStyles(): void {
  document.getElementById(STYLE_ID)?.remove();
  const v = `var(${UI_SCALE_CFG.cssVar}, 1)`;
  const rules: string[] = [];
  for (const s of UI_SCALE_SURFACES) {
    if (s.mode === 'zoom') rules.push(`${s.sel} { zoom: ${v}; }`);
    else if (s.mode === 'scale') rules.push(`${s.sel} { transform: scale(${v}); transform-origin: top left; }`);
    else rules.push(`${s.sel} { transform-origin: top left; }`); // 'self': the element composes its own scale()
  }
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = rules.join('\n');
  document.head.appendChild(el);
}

const clampScale = (v: number): number =>
  Math.min(UI_SCALE_CFG.max, Math.max(UI_SCALE_CFG.min, v));

let current: number = UI_SCALE_CFG.default;

/** Stamp the dial onto :root (every registered surface follows the same
 *  frame) and cache it for JS composers. Clamps to the rails — callers pass
 *  whatever the save or slider holds. */
export function applyUiScale(v: number): void {
  current = clampScale(Number.isFinite(v) ? v : UI_SCALE_CFG.default);
  document.documentElement.style.setProperty(UI_SCALE_CFG.cssVar, String(current));
}

/** The live dial value, for surfaces that must compose it in JS ('self'
 *  mode floaters, or any future measure-in-layout-px math). Always the
 *  clamped value applyUiScale last stamped. */
export function uiScaleNow(): number {
  return current;
}
