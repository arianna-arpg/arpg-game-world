// ---------------------------------------------------------------------------
// THE ESCAPE POLICY — what ONE Esc press clears, as data (2026-09-11, her
// ask: "close out all of, or most of, the UI elements rather than one at a
// time — and let me feel the options").
//
// Every mode is a registry row; Settings.escapeCloses picks one (Options →
// Interface → Escape closes). The cascade in main.ts (solo) and
// UI.escCascadeFor (couch) read the mode at the press. The MODAL steps —
// a running minigame, the forge trace, the pause menu, the couch join
// overlay, the menu tray — always go one at a time (they own the screen);
// the mode governs what comes after:
//   step         — the classic cascade: the front dialog first (its close
//                  carries semantics), then every ordinary panel, then a
//                  clear screen pauses. One legible thing per press.
//   sweep        — THE SWEEP (UI.escapeSweep): every book the seat owns
//                  closes through its leaves' own close paths, the fixed
//                  dialog rows go as the belt, then the ordinary panels; a
//                  clear screen pauses.
//   sweepKeepBag — the sweep, sparing the pages in `keep` (the bag) until
//                  nothing else stands: the bag is the last to go, so the
//                  next press closes it and the one after pauses.
// `keep` names hero pages by their menu-entry ids (data/menu.ts): a future
// mode that spares the map or the sheet is one row here, no code.
// ---------------------------------------------------------------------------

export type EscapeCloseMode = 'step' | 'sweep' | 'sweepKeepBag';

export interface EscapeModeDef {
  id: EscapeCloseMode;
  /** The Options face (short, loud). */
  name: string;
  /** One line for the hover story. */
  blurb: string;
  /** Hero pages (menu-entry ids) the sweep spares until nothing else stands. */
  keep: readonly string[];
}

export const ESCAPE_MODES: readonly EscapeModeDef[] = [
  { id: 'sweep', name: 'EVERYTHING', keep: [],
    blurb: 'one press clears every dialog and panel; a clear screen pauses' },
  { id: 'sweepKeepBag', name: 'ALL BUT THE BAG', keep: ['inventory'],
    blurb: 'one press clears everything except the inventory; the next press closes the bag, then a clear screen pauses' },
  { id: 'step', name: 'ONE AT A TIME', keep: [],
    blurb: 'each press closes one thing: the front dialog, then every ordinary panel, then a clear screen pauses' },
];

export const ESCAPE_CFG = {
  /** The shipped default — the sweep (her ask); 'step' is the classic cascade. */
  default: 'sweep' as EscapeCloseMode,
};

/** The mode row for an id — an unknown id (a renamed row, a hand-edited
 *  save) reads the default. */
export function escapeModeOf(id: string): EscapeModeDef {
  return ESCAPE_MODES.find(m => m.id === id) ?? ESCAPE_MODES.find(m => m.id === ESCAPE_CFG.default)!;
}
