// ---------------------------------------------------------------------------
// THE UI STACK LAW — one documented stacking ladder for every root the game
// mounts over the world canvas.
//
// The law, in one line: ACTIVATABLE UIs — the inventory, the character sheet
// and its Build drawer, the vendor tabs, the death screen, every DOM panel
// the player reads and clicks — stand ABOVE every canvas surface, always;
// nothing world-authored (damage floaters, XP text, zone notices, entity
// labels, the HUD) may paint over them. Only the game's own service floaters
// (tooltips, popups, the drag ghost) and SYSTEM covers (co-op gates, the
// crash overlay, dev tools) stand higher still.
//
// Why a ladder exists at all: the .panel roots historically carried NO
// z-index (stacked by DOM order at z-auto), which held only as long as every
// canvas stayed unpositioned. THE CREST OVERLAY (renderer.ts) broke that
// silently — a position:fixed canvas at any positive z paints over every
// z-auto panel, so at render scale < 1 (one 'auto' governor step on a busy
// machine) the whole word layer + HUD rode above the death screen. The
// ladder makes the intended order STRUCTURAL: every root reads its rung
// here, and the rungs are spaced so a new surface lands between neighbors
// without renumbering the world.
//
// THE RUNGS, low to high (values are structural law, not tunables):
//   world      — the #game canvas. Unpositioned, z-auto BY CONSTRUCTION: a
//                static element paints below every positioned root, so the
//                world needs no number at all. Documentation-only rung.
//                (#hint-bar, the retired keybind strip, is world furniture
//                and deliberately stays down here at z-auto with it.)
//   crest      — THE CREST OVERLAY: the word layer + canvas HUD while the
//                render scale sits under 1. Above the world it annotates,
//                UNDER every panel — at scale 1 those same passes draw on
//                the world canvas below all DOM, and the crest must never
//                say otherwise (parity is the contract; drawPickupFeed's
//                "canvas = below every DOM panel" is this rung's law).
//   panel      — every activatable .panel root (index.html). Delivered by
//                the injected stylesheet, so each panel also becomes its own
//                stacking context and its internal z rows (drawer flaps,
//                sticky heads, seal modals) stay panel-local by construction.
//   popup      — .choice-popup: JS-positioned deal floaters spawned over a
//                panel's nodes.
//   minigame   — the crafting minigame cover (ui/minigames.ts).
//   cover      — full-screen SYSTEM covers that gate play: the co-op lobby
//                and the couch-join veil.
//   tooltip    — the hover card (pointer-events none; serves every panel
//                and popup, so it reads over all of them).
//   devTool    — dev side panes (passive editor, perf tab).
//   devBar     — the dev panel bar + tab body.
//   padPointer — the pad's virtual cursor ring (pointer-events none): the
//                POINTER must be visible over everything it can press.
//   drag       — the drag ghost riding the pointer (ui/dnd.ts).
//   forge      — the dev forges' fullscreen covers (their inner pickers ride
//                forge + 1, a forge-local affair).
//   error      — the crash overlay: nothing may bury the report. MIRRORED by
//                index.html's pre-module boot trap, which by construction
//                cannot import this module — keep the two literals in sync
//                by hand (both 999999).
//
// THE FADE RUNG — a decision, recorded: full-screen fades drawn ON CANVAS
// (world.screenFade, the traversal whiteout — renderer end-of-frame, "covers
// must still cover") cover every CANVAS surface, and only those. They have
// never covered the DOM: at render scale 1 the fade lands on the world
// canvas below every panel, and the scene fabric deliberately speaks through
// DOM it wants readable over its own dark (the story card). Seating the
// crest under `panel` restores that scale-1 truth at every notch. A fade
// that must cover a PANEL is a design change — a DOM cover at the `cover`
// rung — never a z tweak here.
//
// Like ui/uiScale.ts, CSS-selector surfaces ride ONE injected stylesheet
// built from the registry below (never a hand-edited style block — the
// index.html rules carry pointer comments instead of numbers); TS-built
// roots import Z_LADDER directly.
// ---------------------------------------------------------------------------

/** The ladder. Gaps between rungs are deliberate elbow room; relative ORDER
 *  is the law. See the header for what each rung holds. */
export const Z_LADDER = {
  world: 0,          // documentation-only: the #game canvas stays unpositioned
  crest: 10,         // renderer.ts — the crest overlay (word layer + HUD, scale < 1)
  panel: 40,         // every activatable .panel root (via the injected sheet)
  popup: 60,         // .choice-popup floaters
  minigame: 900,     // ui/minigames.ts cover
  cover: 9000,       // ui/lobby.ts + ui/couchJoin.ts system covers
  tooltip: 10000,    // .tooltip hover card
  devTool: 99998,    // dev/passiveEditor.ts, dev/tabs/perf.ts
  devBar: 99999,     // dev/panel.ts
  padPointer: 99999, // ui/padpointer.ts — the pad's cursor ring
  drag: 100000,      // .dnd-ghost — the lifted payload chip
  forge: 100000,     // dev/entityForge.ts + dev/glyphForge.ts (+1 = inner pickers)
  error: 999999,     // ui/errorOverlay.ts — mirrored by the index.html boot trap
} as const;

/** THE REGISTRY of selector-delivered surfaces (the index.html-authored
 *  floaters and the .panel family). TS-built roots don't enroll here — they
 *  read Z_LADDER at their own createElement site. */
export const UI_STACK_SURFACES: ReadonlyArray<{ sel: string; z: number }> = [
  { sel: '.panel', z: Z_LADDER.panel },        // every activatable panel root (index.html)
  { sel: '.choice-popup', z: Z_LADDER.popup }, // passive choice-node deals (ui/panels.ts)
  { sel: '.tooltip', z: Z_LADDER.tooltip },    // the hover card (ui/tooltip.ts)
  { sel: '.dnd-ghost', z: Z_LADDER.drag },     // the drag ghost (ui/dnd.ts)
];

const STYLE_ID = 'ui-stack-law';

/** Build (or rebuild — idempotent, HMR-safe) the one stylesheet that seats
 *  every selector-delivered surface on its rung. Call once at boot, before
 *  the first panel shows (main.ts, beside installUiScaleStyles). */
export function installUiStack(): void {
  document.getElementById(STYLE_ID)?.remove();
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = UI_STACK_SURFACES
    .map((s) => `${s.sel} { z-index: ${s.z}; }`)
    .join('\n');
  document.head.appendChild(el);
}
