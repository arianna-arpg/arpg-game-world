/** Shared inventory-side layout. Values are in unscaled interface pixels. */
export const BUILD_PANEL_CFG = {
  railWidth: 42,
  skillsWidth: 360,
  passivesWidth: 760,
  edge: 8,
  unlearnSize: 24,
  rackSeatHeight: 52,
  minWidth: 280,
};

/** Keep the companion beside its ribbon, or within the screen on narrow views. */
export function buildPanelSeat(inv: { left: number; right: number; top: number },
  screenWidth: number, scale: number, rightward: boolean, width: number) {
  const edge = BUILD_PANEL_CFG.edge * scale;
  const seam = rightward ? inv.right + BUILD_PANEL_CFG.railWidth * scale
    : inv.left - BUILD_PANEL_CFG.railWidth * scale;
  const available = rightward ? screenWidth - edge - seam : seam - edge;
  // On small screens the folio remains usable even when side-by-side cannot fit.
  const fitted = Math.min(width * scale, Math.max(BUILD_PANEL_CFG.minWidth * scale, available), screenWidth - edge * 2);
  const left = Math.max(edge, Math.min(rightward ? seam : seam - fitted, screenWidth - fitted - edge));
  return { left: left / scale, top: inv.top / scale, width: fitted / scale };
}
