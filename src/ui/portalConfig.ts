// ---------------------------------------------------------------------------
// THE TOWN PORTAL BUTTON's dials — a LEAF module (no imports), so
// meta/settings.ts can read the anchor registry at module-eval the way it
// reads ui/menuConfig.ts, and the button (ui/portalbutton.ts), the Options
// row and the probe all fold the same rows.
//
// 2026-09-11, her ask: "anchored above the collapsible menu icon rather than
// off to the right-hand side… a further customization option in the same
// vein as our collapsible icon menu". One row per seat; the sanitizer
// accepts only these ids; the Options row cycles them.
// ---------------------------------------------------------------------------

export type PortalAnchorId = 'menu' | 'right';

export const PORTAL_ANCHORS: ReadonlyArray<{ id: PortalAnchorId; label: string; blurb: string }> = [
  { id: 'menu', label: 'Above the Menu', blurb: 'Stacked over the Menu button, wherever that stands — a dragged or re-seated Menu carries it.' },
  { id: 'right', label: 'Bottom Right', blurb: 'The lower-right corner, above the mana orb (the classic seat).' },
];

export const PORTAL_BUTTON_CFG = {
  /** Default seat. */
  anchorDefault: 'menu' as PortalAnchorId,
  /** Gap between the Menu button's top edge and the portal button (screen px). */
  menuGapPx: 8,
  /** THE KEEP: never nearer than this to the screen's edges (screen px). */
  keepPx: 4,
};
