// ---------------------------------------------------------------------------
// THE ICON REGISTRY — the UI's line-glyph vocabulary, as data.
//
// Every icon is the INNER markup of a 24×24 SVG drawn in strokes of
// `currentColor` (one line weight, round caps), so a tile tints its glyph
// through plain CSS color — gold when open, dim when sealed, ether under a
// lesson — with no per-icon art. A new page needs one row here (or reuses a
// row); a new registry consumer (a future toolbar, a tooltip chip) calls
// iconSvg(id). DOM-free by construction: the probe walks the registry
// headless, and the website could inline the same strings.
//
// Style contract: 1.7px strokes, no fills except deliberate dots, nothing
// finer than a 2px feature — the tiles print at 22–44 CSS px.
// ---------------------------------------------------------------------------

const S = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';

/** id → inner SVG markup (24×24 viewBox). */
export const MENU_ICONS: Record<string, string> = {
  portal: `<g ${S}><ellipse cx="12" cy="11" rx="6" ry="9"/><path d="M4 21h16M10 7l4 4-4 4"/></g>`,
  /** The MENU glyph itself: three bars — the universal "menu". */
  menu: `<g ${S}><path d="M4 7h16M4 12h16M4 17h16"/></g>`,
  /** A pack with a flap and a buckle strap. */
  bag: `<g ${S}><path d="M6 9h12l1 11H5z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/><path d="M9 13h6"/></g>`,
  /** A hero silhouette: head + shoulders. */
  sheet: `<g ${S}><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></g>`,
  /** A constellation: linked nodes (the passive tree). */
  tree: `<g ${S}><circle cx="12" cy="5" r="2"/><circle cx="6" cy="14" r="2"/><circle cx="18" cy="14" r="2"/><circle cx="12" cy="19" r="2"/><path d="M11 6.8 7 12.3M13 6.8l4 5.5M7.5 15.5l3.3 2.5M16.5 15.5l-3.3 2.5"/></g>`,
  /** A folded map with a route. */
  map: `<g ${S}><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></g>`,
  /** A scroll (the journal). */
  journal: `<g ${S}><path d="M7 4h11v13a3 3 0 0 1-3 3H4"/><path d="M7 4a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3"/><path d="M10 9h5M10 13h5"/></g>`,
  /** Stacked coins (a counter). */
  coins: `<g ${S}><ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/><path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/></g>`,
  /** An anvil (the breaker's bench). */
  anvil: `<g ${S}><path d="M4 9h10a5 5 0 0 0 5-4H8a4 4 0 0 0-4 4z"/><path d="M9 9v5h6V9"/><path d="M6 19h12l-2-5H8z"/></g>`,
  /** A chalice bowl on a stem (the font). */
  font: `<g ${S}><path d="M5 5h14c0 5-3 8-7 8S5 10 5 5z"/><path d="M12 13v5M8 20h8"/></g>`,
  /** An open eye (the oracle stone). */
  eye: `<g ${S}><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></g>`,
  /** An open book (the bestiary). */
  book: `<g ${S}><path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2z"/><path d="M12 6v14"/></g>`,
  /** A pinned posting (the bounty board). */
  board: `<g ${S}><path d="M5 5h14v12H5z"/><path d="M9 17v3M15 17v3M8 9h8M8 12h6"/></g>`,
  /** A covered wagon (the caravan). */
  wagon: `<g ${S}><path d="M4 9a8 5 0 0 1 16 0v5H4z"/><circle cx="8" cy="17" r="2.2"/><circle cx="16" cy="17" r="2.2"/></g>`,
  /** An anchor (the harbor). */
  anchor: `<g ${S}><circle cx="12" cy="5" r="2"/><path d="M12 7v13"/><path d="M5 13a7 7 0 0 0 14 0"/><path d="M9 11h6"/></g>`,
  /** A crenellated tower (the hold). */
  tower: `<g ${S}><path d="M7 20V8h10v12"/><path d="M7 8V5h2v2h2V5h2v2h2V5h2v3"/><path d="M11 20v-4h2v4"/></g>`,
  /** Crossed swords (the mercenaries). */
  swords: `<g ${S}><path d="M5 5l11 11M19 5 8 16"/><path d="M14 18l2 2M8 18l-2 2M4 16l4 4M20 16l-4 4"/></g>`,
  /** A gear (the pause menu / options). */
  gear: `<g ${S}><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></g>`,
};

/** A full inline SVG for an icon id — an empty box for an unknown id, so a
 *  misnamed row never throws mid-render (the probe's census catches it). */
export function iconSvg(id: string, cls = ''): string {
  const inner = MENU_ICONS[id] ?? '';
  return `<svg class="${cls}" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">${inner}</svg>`;
}

export function registerMenuIcon(id: string, inner: string): void {
  if (MENU_ICONS[id]) throw new Error(`menu icon '${id}' registered twice`);
  MENU_ICONS[id] = inner;
}
