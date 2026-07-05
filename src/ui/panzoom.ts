// ---------------------------------------------------------------------------
// SVG PAN/ZOOM GESTURES — one shared, configurable implementation for every
// pannable panel surface (passive tree, world map, future panels), replacing
// the per-panel copies that each re-derived the same pointer math.
//
// Two golden rules are baked in here because getting them wrong "grabs the
// window":
//
//   1. BUTTON DISCIPLINE — a pan starts ONLY on the buttons in `panButtons`
//      (LMB, and MMB as a map convention). Never RMB: it's a skill button,
//      and with the window-wide contextmenu suppression there is no browser
//      menu to break a stray RMB pan — holding RMB over a panel would
//      silently pointer-capture the screen and drag the panel like a still
//      image of the world (the "window catch" bug).
//
//   2. SELF-HEALING DRAGS — with mouse pointer events, `pointerup` fires only
//      when the LAST button of a chord releases (press LMB, add RMB, release
//      LMB → no pointerup), and a panel refresh that swaps the SVG mid-drag
//      silently drops the capture without ending the gesture. So every
//      pointermove re-checks `e.buttons` against the pan mask, and
//      `lostpointercapture` / `pointercancel` both end the drag. A pan can
//      outlive its button by at most one event — it can never stick.
// ---------------------------------------------------------------------------

export interface PanZoomConfig {
  /** Mouse buttons that may start a drag-pan (0 = LMB, 1 = MMB, 2 = RMB). */
  panButtons: number[];
  /** Zoom multiplier per wheel notch. */
  wheelFactor: number;
  /** Zoom multiplier per zoom-button click. */
  buttonFactor: number;
  /** Zoom clamp — keeps wheel spam from zooming into oblivion. */
  minZoom: number;
  maxZoom: number;
  cursorIdle: string;
  cursorDrag: string;
}

export const PANZOOM_DEFAULTS: PanZoomConfig = {
  panButtons: [0, 1],
  wheelFactor: 1.18,
  buttonFactor: 1.4,
  minZoom: 0.2,
  maxZoom: 16,
  cursorIdle: 'grab',
  cursorDrag: 'grabbing',
};

export function clampZoom(z: number, cfg: PanZoomConfig = PANZOOM_DEFAULTS): number {
  return Math.min(cfg.maxZoom, Math.max(cfg.minZoom, z));
}

/** The panel side of the contract: where zoom/pan state lives and how the
 *  viewBox is re-applied. All deltas are in view-box units (already converted
 *  from pixels by the helper using box()/getZoom()). */
export interface PanZoomHost {
  getZoom(): number;
  setZoom(z: number): void;
  panBy(dx: number, dy: number): void;
  /** The fitted content box (w/h in view-box units) used for px → unit conversion. */
  box(): { w: number; h: number };
  /** Re-apply the viewBox (and any zoom % label) after a zoom/pan change. */
  apply(): void;
  /** pointerdown targets matching this selector never start a pan (node clicks). */
  ignore?: string;
  /** Hover path while NOT dragging (e.g. the map's zone-hover preview). */
  onIdleMove?(e: PointerEvent): void;
  /** Pointer left the SVG while not dragging (clear hover state). */
  onLeave?(): void;
  /** Real clicks only — clicks that concluded a drag-pan are swallowed. */
  onClick?(e: MouseEvent): void;
  /** Mirror of the drag state for panel-level guards (e.g. the map's
   *  refresh-suppression flag) — guaranteed to return to false by the
   *  self-healing rules above. */
  onDragState?(dragging: boolean): void;
}

/** `buttons` bitmask bit for a `button` index (0→1, 1→4, 2→2, 3→8, 4→16). */
const BUTTON_BIT = [1, 4, 2, 8, 16];

export function attachPanZoom(
  svg: SVGSVGElement,
  host: PanZoomHost,
  cfg: PanZoomConfig = PANZOOM_DEFAULTS,
): void {
  const panMask = cfg.panButtons.reduce((m, b) => m | (BUTTON_BIT[b] ?? 0), 0);

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    host.setZoom(clampZoom(host.getZoom() * (e.deltaY < 0 ? cfg.wheelFactor : 1 / cfg.wheelFactor), cfg));
    host.apply();
  }, { passive: false });

  let dragging = false, moved = false, lastX = 0, lastY = 0;
  const end = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    try { svg.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    svg.style.cursor = cfg.cursorIdle;
    host.onDragState?.(false);
  };

  svg.addEventListener('pointerdown', (e) => {
    if (host.ignore && (e.target as Element).closest(host.ignore)) return;
    if (!cfg.panButtons.includes(e.button)) return;
    e.preventDefault(); // MMB pan must not arm the browser's autoscroll
    dragging = true; moved = false; lastX = e.clientX; lastY = e.clientY;
    try { svg.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    svg.style.cursor = cfg.cursorDrag;
    host.onDragState?.(true);
  });

  svg.addEventListener('pointermove', (e) => {
    // Chord release (rule 2): the pan button is up but pointerup never came.
    if (dragging && (e.buttons & panMask) === 0) end(e);
    if (!dragging) { host.onIdleMove?.(e); return; }
    moved = true;
    const rect = svg.getBoundingClientRect();
    const b = host.box(), z = host.getZoom();
    const vw = b.w / z, vh = b.h / z;
    host.panBy(
      -(e.clientX - lastX) * (vw / Math.max(1, rect.width)),
      -(e.clientY - lastY) * (vh / Math.max(1, rect.height)),
    );
    lastX = e.clientX; lastY = e.clientY;
    host.apply();
  });

  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('lostpointercapture', end); // SVG swapped/removed mid-drag
  svg.addEventListener('pointerleave', () => { if (!dragging) host.onLeave?.(); });

  if (host.onClick) {
    svg.addEventListener('click', (e) => {
      if (moved) { moved = false; return; } // a pan ends in a click — swallow it
      host.onClick!(e);
    });
  }
  svg.style.cursor = cfg.cursorIdle;
}
