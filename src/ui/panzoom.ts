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
//      pointermove re-checks `e.buttons` against the initiating button, and
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
  /** Pixels the pointer must travel (from pointerdown) before the gesture
   *  counts as a DRAG. Real clicks jitter a pixel or two between down and up;
   *  without a dead zone that jitter both nudged the pan and marked the
   *  gesture `moved`, which swallowed the click (zone pins, node clicks). */
  dragThresholdPx: number;
  cursorIdle: string;
  cursorDrag: string;
}

export const PANZOOM_DEFAULTS: PanZoomConfig = {
  panButtons: [0, 1],
  wheelFactor: 1.18,
  buttonFactor: 1.4,
  minZoom: 0.2,
  maxZoom: 16,
  dragThresholdPx: 4,
  cursorIdle: 'var(--cursor-grab, grab)',
  cursorDrag: 'var(--cursor-grabbing, grabbing)',
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
  /** Targets with their own drag behavior (e.g. editor nodes) never start a pan.
   *  Ordinary clickable children should participate: click vs pan is resolved
   *  by movement, and drag-ending clicks are blocked before child handlers. */
  ignore?: string;
  /** Hover path while NOT dragging (e.g. the map's zone-hover preview). */
  onIdleMove?(e: PointerEvent): void;
  /** Pointer left the SVG while not dragging (clear hover state). */
  onLeave?(): void;
  /** Real clicks only — clicks that concluded a drag-pan are swallowed. */
  onClick?(e: MouseEvent): void;
  /** Mirror of the held gesture, including its click-sized dead zone, for
   *  panel-level refresh guards — guaranteed to return to false by the
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
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    // A view change while pressed must not turn the release into an allocation.
    if (pointerId !== null) { suppressClick = true; end(); }
    host.setZoom(clampZoom(host.getZoom() * (e.deltaY < 0 ? cfg.wheelFactor : 1 / cfg.wheelFactor), cfg));
    host.apply();
  }, { passive: false });

  let pointerId: number | null = null;
  let capture: Element | null = null, heldButton = 0;
  let moved = false, suppressClick = false, lastX = 0, lastY = 0;
  let downX = 0, downY = 0;   // pointerdown origin — the drag-threshold anchor
  const end = (): void => {
    if (pointerId === null) return;
    const id = pointerId, target = capture;
    pointerId = null; capture = null;
    try { target?.releasePointerCapture(id); } catch { /* already released */ }
    svg.style.cursor = cfg.cursorIdle;
    host.onDragState?.(false);
  };

  svg.addEventListener('pointerdown', (e) => {
    if (pointerId !== null) return; // another finger/button cannot steal a press
    suppressClick = false;
    if (host.ignore && (e.target as Element).closest(host.ignore)) return;
    if (!cfg.panButtons.includes(e.button)) return;
    e.preventDefault(); // MMB pan must not arm the browser's autoscroll
    pointerId = e.pointerId; heldButton = BUTTON_BIT[e.button] ?? 0;
    moved = false; lastX = e.clientX; lastY = e.clientY;
    downX = e.clientX; downY = e.clientY;
    // Capture the pressed child, not the SVG: Chromium targets the resulting
    // click at the capture owner. A quiet press must still click its own node,
    // even when nearby nodes share the generous proximity selection area.
    capture = e.target as Element;
    try { capture.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    host.onDragState?.(true);
  });

  const move = (e: PointerEvent): void => {
    // Dead zone: inside the threshold the gesture is still a CLICK — don't pan
    // and don't mark it moved (which would swallow the click on pointerup).
    if (!moved) {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < cfg.dragThresholdPx) {
        return;
      }
      moved = true; suppressClick = true;
      svg.style.cursor = cfg.cursorDrag;
    }
    const rect = svg.getBoundingClientRect();
    const b = host.box(), z = host.getZoom();
    const vw = b.w / z, vh = b.h / z;
    host.panBy(
      -(e.clientX - lastX) * (vw / Math.max(1, rect.width)),
      -(e.clientY - lastY) * (vh / Math.max(1, rect.height)),
    );
    lastX = e.clientX; lastY = e.clientY;
    host.apply();
  };

  svg.addEventListener('pointermove', (e) => {
    if (pointerId === null) { host.onIdleMove?.(e); return; }
    if (e.pointerId !== pointerId) return;
    // Track the initiating button, not any allowed pan button in a chord.
    if ((e.buttons & heldButton) === 0) { suppressClick = true; end(); return; }
    move(e);
  });
  svg.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pointerId) return;
    move(e); // a fast release can arrive beyond the last delivered move
    end();
  });
  const cancel = (e: PointerEvent): void => {
    if (e.pointerId !== pointerId) return;
    suppressClick = true;
    end();
  };
  svg.addEventListener('pointercancel', cancel);
  svg.addEventListener('lostpointercapture', cancel); // SVG swapped/removed mid-drag
  svg.addEventListener('pointerleave', () => { if (pointerId === null) host.onLeave?.(); });

  // Capture phase is essential: a bubbling handler runs AFTER the node has
  // already spent its point (or opened a choice/refund). Install even when the
  // host has no background-click action. Returning to the origin stays a drag.
  svg.addEventListener('click', (e) => {
    if (!suppressClick) return;
    suppressClick = false;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  if (host.onClick) {
    svg.addEventListener('click', (e) => {
      host.onClick!(e);
    });
  }
  svg.style.cursor = cfg.cursorIdle;
}
