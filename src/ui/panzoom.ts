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
  /** Active while panning past `dragThresholdPx` or wheel-zooming (~150ms tail).
   *  Fires `true` BEFORE `apply()` so heavy SVG surfaces can swap to cached
   *  raster layers before any viewBox invalidation hits layout. */
  onViewportGesture?(active: boolean): void;
}

/** `buttons` bitmask bit for a `button` index (0→1, 1→4, 2→2, 3→8, 4→16). */
const BUTTON_BIT = [1, 4, 2, 8, 16];
const WHEEL_IDLE_MS = 150;

const rectCache = new WeakMap<SVGSVGElement, { width: number; height: number }>();
let sharedResizeObserver: ResizeObserver | null = null;

function observeSvgSize(svg: SVGSVGElement): void {
  if (typeof ResizeObserver !== 'function') return;
  if (!sharedResizeObserver) {
    sharedResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          rectCache.set(entry.target as SVGSVGElement, { width, height });
        }
      }
    });
  }
  sharedResizeObserver.observe(svg);
}

export function attachPanZoom(
  svg: SVGSVGElement,
  host: PanZoomHost,
  cfg: PanZoomConfig = PANZOOM_DEFAULTS,
): void {
  observeSvgSize(svg);

  const getRect = (): { width: number; height: number } => {
    let rect = rectCache.get(svg);
    if (!rect || rect.width === 0) {
      const r = svg.getBoundingClientRect();
      rect = { width: r.width, height: r.height };
      if (r.width > 0 && r.height > 0) rectCache.set(svg, rect);
    }
    return rect;
  };

  let pointerId: number | null = null;
  let capture: Element | null = null, heldButton = 0;
  let moved = false, suppressClick = false, lastX = 0, lastY = 0;
  let downX = 0, downY = 0;   // pointerdown origin — the drag-threshold anchor

  let dragActive = false;
  let wheelTimer: ReturnType<typeof setTimeout> | null = null;
  let gestureActive = false;

  const syncGesture = (): void => {
    const next = dragActive || wheelTimer !== null;
    if (next === gestureActive) return;
    gestureActive = next;
    host.onViewportGesture?.(next);
  };

  // Leading-edge + rAF coalescing: the first move/wheel of a frame applies
  // synchronously (preserving immediate viewBox reads in tests and crisp first-
  // input latency), while high-Hz follow-up events within the same frame
  // accumulate deltas and call host.apply() at most once when rAF fires.
  let rafId = 0;
  let dirty = false;
  let hasPendingZoom = false;
  let pendingZoom = 1;
  let pendingPxDx = 0;
  let pendingPxDy = 0;

  const commitApply = (): void => {
    if (hasPendingZoom) {
      hasPendingZoom = false;
      const factor = pendingZoom;
      pendingZoom = 1;
      host.setZoom(clampZoom(host.getZoom() * factor, cfg));
    }
    if (pendingPxDx !== 0 || pendingPxDy !== 0) {
      const dx = pendingPxDx, dy = pendingPxDy;
      pendingPxDx = 0; pendingPxDy = 0;
      const rect = getRect();
      const b = host.box(), z = host.getZoom();
      const vw = b.w / z, vh = b.h / z;
      host.panBy(
        -dx * (vw / Math.max(1, rect.width)),
        -dy * (vh / Math.max(1, rect.height)),
      );
    }
    host.apply();
  };

  const onFrame = (): void => {
    if (!svg.isConnected) {
      rafId = 0;
      dirty = false;
      hasPendingZoom = false;
      pendingZoom = 1;
      pendingPxDx = 0;
      pendingPxDy = 0;
      return;
    }
    if (dirty) {
      dirty = false;
      commitApply();
      rafId = requestAnimationFrame(onFrame);
    } else {
      rafId = 0;
    }
  };

  const scheduleApply = (): void => {
    if (rafId === 0) {
      dirty = false;
      commitApply();
      if (typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(onFrame);
      }
    } else {
      dirty = true;
    }
  };

  const flushApply = (): void => {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (dirty) {
      dirty = false;
      commitApply();
    }
  };

  const end = (): void => {
    if (pointerId === null) return;
    flushApply();
    const id = pointerId, target = capture;
    pointerId = null; capture = null;
    try { target?.releasePointerCapture(id); } catch { /* already released */ }
    svg.style.cursor = cfg.cursorIdle;
    dragActive = false;
    host.onDragState?.(false);
    syncGesture();
  };

  const clearWheelGesture = (): void => {
    if (wheelTimer === null) return;
    clearTimeout(wheelTimer);
    wheelTimer = null;
    flushApply();
    syncGesture();
  };

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (wheelTimer !== null) clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      wheelTimer = null;
      flushApply();
      syncGesture();
    }, WHEEL_IDLE_MS);
    // A view change while pressed must not turn the release into an allocation.
    if (pointerId !== null) { suppressClick = true; end(); }
    syncGesture();
    pendingZoom *= e.deltaY < 0 ? cfg.wheelFactor : 1 / cfg.wheelFactor;
    hasPendingZoom = true;
    scheduleApply();
  }, { passive: false });

  svg.addEventListener('pointerdown', (e) => {
    clearWheelGesture();
    if (pointerId !== null) return; // another finger/button cannot steal a press
    suppressClick = false;
    if (host.ignore && (e.target as Element).closest(host.ignore)) return;
    if (!cfg.panButtons.includes(e.button)) return;
    e.preventDefault(); // MMB pan must not arm the browser's autoscroll
    const r = svg.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) rectCache.set(svg, { width: r.width, height: r.height });
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
      // Once committed to a drag, clicks are suppressed; move pointer capture
      // to the standing SVG before onViewportGesture may swap child layers.
      if (capture && capture !== svg && pointerId !== null) {
        const prev = capture;
        try {
          svg.setPointerCapture(pointerId);
          capture = svg;
        } catch {
          capture = prev;
        }
      }
      dragActive = true;
      syncGesture();
    }
    pendingPxDx += e.clientX - lastX;
    pendingPxDy += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    scheduleApply();
  };

  svg.addEventListener('pointermove', (e) => {
    if (pointerId === null) {
      clearWheelGesture();
      host.onIdleMove?.(e);
      return;
    }
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
  svg.addEventListener('lostpointercapture', (e) => {
    if (e.target !== capture) return;
    cancel(e); // SVG swapped/removed mid-drag
  });
  svg.addEventListener('pointerleave', () => { if (pointerId === null) host.onLeave?.(); });

  // Capture phase is essential: a bubbling handler runs AFTER the node has
  // already spent its point (or opened a choice/refund). Install even when the
  // host has no background-click action. Returning to the origin stays a drag.
  svg.addEventListener('click', (e) => {
    clearWheelGesture();
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
