// Keyboard + mouse state. RMB context menu is suppressed so it can be a skill.

// The controller menu ring sends normal DOM mouse events to controls. Keep
// their origin so gameplay only reads the physical hand, including on release.
const menuMouseEvents = new WeakSet<MouseEvent>();
export function menuMouseEvent(type: string, init: MouseEventInit): MouseEvent {
  const event = new MouseEvent(type, init);
  menuMouseEvents.add(event);
  return event;
}
export function isMenuMouseEvent(event: MouseEvent): boolean { return menuMouseEvents.has(event); }

/** THE TYPING GUARD (docs/engine/input.md): a key pressed INTO a text-entry
 *  element belongs to that element — its letters are never the hero's hands
 *  (typing "1" into a search box must not drink the flask bound to 1; "w"
 *  must not walk). Only the keyDOWN is guarded: a keyup ALWAYS releases (a
 *  key held before the field took focus must still come up), and the keys
 *  a field never types (`pass`) reach the game, so Esc still walks the
 *  cascade that closes the panel around the field. */
export const TYPING_GUARD_CFG = {
  /** Keys that pass the guard even while a field holds the pen. */
  pass: new Set<string>(['escape']),
  /** <input type=…> kinds that TAKE text; every other input (checkbox,
   *  range, color, button…) is a control, not a pen. */
  textInputTypes: new Set<string>(['text', 'search', 'password', 'email', 'number', 'url', 'tel']),
};

/** True when a keyboard event's target takes typed text. Duck-typed on
 *  tagName / type / contenteditable (no DOM classes), so a headless probe
 *  speaks it with plain objects; no target (a synthetic event) = not typing;
 *  a read-only field shows text and never takes it. */
export function isTypingTarget(t: unknown): boolean {
  if (!t || typeof t !== 'object') return false;
  const el = t as { tagName?: string; type?: string; isContentEditable?: boolean; readOnly?: boolean };
  if (el.isContentEditable) return true;
  if (el.readOnly) return false;
  const tag = (el.tagName ?? '').toUpperCase();
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') return TYPING_GUARD_CFG.textInputTypes.has((el.type ?? 'text').toLowerCase());
  return false;
}

export class Input {
  keys = new Set<string>();
  pressed = new Set<string>();   // keys pressed this frame (consumed by reader)
  /** Remember the keys a physical press supplied: releasing Shift before a
   * number must release both its typed symbol and its numeric slot alias. */
  private physicalKeys = new Map<string, string[]>();
  /** Viewport CSS pixels stay valid while the renderer changes resolution. */
  clientMouse = { x: 0, y: 0 };
  /** Position at the down edge, even if the mouse moves before the next frame. */
  lmbPressClient = { x: 0, y: 0 };
  lmb = false;
  rmb = false;
  /** Edge flags: true only on the frame the button went down. */
  lmbPressed = false;
  rmbPressed = false;

  constructor(target: HTMLElement) {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      // THE TYPING GUARD: the field owns the press (Esc and its kin pass).
      if (isTypingTarget(e.target) && !TYPING_GUARD_CFG.pass.has(k)) return;
      const code = e.code || k;
      const held = this.physicalKeys.get(code) ?? [...new Set([k,
        ...(e.shiftKey && /^Digit[0-9]$/.test(e.code) ? [e.code.slice(5)] : [])])];
      this.physicalKeys.set(code, held);
      for (const key of held) {
        if (!this.keys.has(key)) this.pressed.add(key);
        this.keys.add(key);
      }
    });
    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase(), code = e.code || k;
      const held = this.physicalKeys.get(code) ?? [k];
      this.physicalKeys.delete(code);
      for (const key of held) if (![...this.physicalKeys.values()].some(keys => keys.includes(key))) this.keys.delete(key);
    });
    window.addEventListener('blur', () => { this.physicalKeys.clear(); this.keys.clear(); this.lmb = false; this.rmb = false; });

    const sampleMouse = (e: MouseEvent) => {
      if (isMenuMouseEvent(e)) return;
      this.clientMouse.x = e.clientX;
      this.clientMouse.y = e.clientY;
    };
    // Overlays can stop bubbling. Capture coordinates without turning a UI
    // click into a gameplay press, even when no move preceded the click.
    for (const type of ['mousemove', 'mousedown', 'mouseup'] as const) {
      window.addEventListener(type, sampleMouse, true);
    }
    target.addEventListener('mousedown', e => {
      if (isMenuMouseEvent(e)) return;
      if (e.button === 0) {
        this.lmb = true; this.lmbPressed = true;
        this.lmbPressClient.x = e.clientX; this.lmbPressClient.y = e.clientY;
      }
      if (e.button === 2) { this.rmb = true; this.rmbPressed = true; }
    });
    window.addEventListener('mouseup', e => {
      if (isMenuMouseEvent(e)) return;
      if (e.button === 0) this.lmb = false;
      if (e.button === 2) this.rmb = false;
    }, true);
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

  /** A loading screen owns the hands; held presses cannot leak across it. */
  clearForLoading(): void {
    this.physicalKeys.clear(); this.keys.clear(); this.pressed.clear();
    this.lmb = this.rmb = this.lmbPressed = this.rmbPressed = false;
  }

  endFrame(): void {
    this.pressed.clear();
    this.lmbPressed = false;
    this.rmbPressed = false;
  }
}
