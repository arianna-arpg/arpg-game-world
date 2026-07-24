// Keyboard + mouse state. RMB context menu is suppressed so it can be a skill.

export class Input {
  keys = new Set<string>();
  pressed = new Set<string>();   // keys pressed this frame (consumed by reader)
  mouse = { x: 0, y: 0 };
  /** THE RENDER SCALE's pointer seam (render/renderScale.ts): CSS-pixel
   *  events map into BUFFER pixels through this (main.ts keeps it synced to
   *  the renderer's applied scale). 1 whenever the buffer is 1:1. */
  pointerScale = 1;
  lmb = false;
  rmb = false;
  /** Edge flags: true only on the frame the button went down. */
  lmbPressed = false;
  rmbPressed = false;

  constructor(target: HTMLElement) {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.lmb = false; this.rmb = false; });

    target.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX * this.pointerScale;
      this.mouse.y = e.clientY * this.pointerScale;
    });
    target.addEventListener('mousedown', e => {
      if (e.button === 0) { this.lmb = true; this.lmbPressed = true; }
      if (e.button === 2) { this.rmb = true; this.rmbPressed = true; }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.lmb = false;
      if (e.button === 2) this.rmb = false;
    });
    // WINDOW-level, not just the canvas: shift+right-click over any DOM
    // panel would otherwise open the browser menu, eat the shift keyup,
    // and ghost the meta layer until the next real press.
    window.addEventListener('contextmenu', e => e.preventDefault());
    // A browser popup/menu that slips through anyway blurs us — the blur
    // handler above already clears every held key and button.

    // NATIVE-DRAG + AUTOSCROLL SUPPRESSION — the window must never be
    // "grabbed". A native HTML5 drag (of a stray text selection, image, or
    // link) swallows all mouse input and floats a ghost snapshot of the
    // dragged element under the cursor — with the context menu suppressed it
    // reads as the whole frozen screen being dragged around. Middle-click
    // similarly arms the browser's autoscroll mode. Neither has any meaning
    // inside the game, so both are cut off at the source; panel wheel-scroll
    // and the SVG pan gestures (pointer events) are unaffected.
    //
    // NO exceptions: every deliberate drag gesture in the game rides THE
    // DRAG FABRIC (ui/dnd.ts), which is pure pointer events — a dragstart
    // reaching this listener is always a stray browser grab.
    window.addEventListener('dragstart', e => e.preventDefault());
    window.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });
  }

  /** True once per physical key press. */
  justPressed(key: string): boolean {
    if (this.pressed.has(key)) { this.pressed.delete(key); return true; }
    return false;
  }

  endFrame(): void {
    this.pressed.clear();
    this.lmbPressed = false;
    this.rmbPressed = false;
  }
}
