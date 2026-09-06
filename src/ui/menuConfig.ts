// ---------------------------------------------------------------------------
// THE MENU BAR's dials — a LEAF module (no imports), so meta/settings.ts can
// read the anchor registry at module-eval the way it reads ui/mapConfig.ts,
// and the engine core (engine/menu.ts), the DOM bar (ui/menubar.ts) and the
// probe all fold the same numbers.
//
// THE MENU BAR (2026-09-05, her ask: "click on a Menu button; the menu then
// houses things like the inventory, the passive tree, the character sheet…
// as selectable buttons with a nice corresponding icon… something the player
// could move around… Mireille's tutorial would have the Menu icon glow…
// the Passive Tree icon glow when there are unallocated points… dynamic:
// not yet unlocked = not shown; unlocked but not yet usable = greyed"):
// one glyph button on the HUD's edge that fans a TRAY of the game's pages,
// every page a DATA ROW (data/menu.ts) the engine folds into hidden /
// sealed / open (engine/menu.ts). This file holds only the dials.
// ---------------------------------------------------------------------------

/** Where the bar's DEFAULT seat is (Options → Menu Bar). THE PANEL MOVE
 *  (ui/panelmove.ts) can still drag it anywhere while Movable UI is ON — a
 *  dragged seat wins over the anchor until the layout is reset. */
export type MenuAnchorId = 'left' | 'right' | 'bar';

/** The anchor registry — the Options row cycles these; the sanitizer
 *  accepts only these ids. `bar` seats the button off the hero's DRAWN
 *  skill bar every sync (the renderer's published slot rects — drawn ==
 *  seated), so it rides the cluster wherever the couch docks it. */
export const MENU_ANCHORS: ReadonlyArray<{ id: MenuAnchorId; label: string; blurb: string }> = [
  { id: 'left', label: 'Bottom Left', blurb: 'The screen\'s lower-left corner.' },
  { id: 'right', label: 'Bottom Right', blurb: 'The screen\'s lower-right corner.' },
  { id: 'bar', label: 'Beside the Bar', blurb: 'Just right of the mana orb, riding the skill bar.' },
];

export const MENU_CFG = {
  /** Default seat. */
  anchorDefault: 'left' as MenuAnchorId,
  /** Default for THE DOCK (every non-hidden page as an icon tile beside the
   *  button, Diablo-style). OFF = the single glyph button alone. */
  dockDefault: false,
  /** How often the bar re-folds entry states + attention (seconds). The
   *  fold walks a dozen near-reads; a toggle or a page open re-folds at
   *  once regardless. */
  syncSec: 0.2,
  /** The tray closes after a row opens its page. */
  closeOnPick: true,
  /** Highest pip count a badge prints; more reads "9+". */
  pipMax: 9,
  /** Corner inset of the left/right anchors (CSS px, pre-zoom). */
  insetPx: 16,
  /** Under THE COUCH the hero's cluster docks to a flank: the corner anchors
   *  lift this many px so the button stands clear of the life orb. */
  couchLiftPx: 136,
  /** `bar` anchor: gap between the mana orb's far rim and the button (CSS px). */
  barGapPx: 14,
  /** Tile geometry (CSS px, pre-zoom) — the button, the dock tiles. */
  tilePx: 44,
  /** THE DOCK wraps into rows of this many tiles, growing UPWARD from the
   *  button's baseline, so a long roster never runs off the screen's edge. */
  dockCols: 5,
  /** Gap between dock tiles (CSS px). */
  dockGapPx: 6,
  /** The tray row's icon box. */
  rowIconPx: 22,
} as const;
