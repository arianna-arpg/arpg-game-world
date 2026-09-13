// Keyboard + mouse state. RMB context menu is suppressed so it can be a skill.

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
