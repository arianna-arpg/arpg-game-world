// ---------------------------------------------------------------------------
// PAD POINTER — a stick-driven virtual mouse for every DOM surface (start
// menu, inventory, tree, vendor, death screen, …), so controller support
// never requires rewriting a panel. While a blocking surface is up and the
// pad is the active input source:
//
//   • move stick   → moves a gold cursor ring (clamped to the viewport)
//   • aim stick ↑↓ → scrolls whatever scrollable the cursor is over
//   • Ⓐ (confirm)  → dispatches REAL pointer/mouse events at the cursor, so
//                    every existing click handler fires unmodified
//   • Ⓑ (cancel)   → the hardwired Escape (same close-cascade as the key)
//
// The pointer OWNS the pad while active: gameplay reads gate on
// pointer.active, so Ⓐ never double-fires a skill under a menu click. Mouse
// users never see it — it only wakes when the pad spoke recently
// (PAD_CFG.activeWindow) and goes away the moment the surfaces close.
//
// KNOWN SEAM: native HTML5 drag-and-drop (vestige inlaying's draggable
// gesture) can't be synthesized from script — pad players use click-to-lift
// flows (bag items already work that way). CSS :hover styling likewise skips
// synthetic events; the ring itself is the hover feedback.
// ---------------------------------------------------------------------------

import { PAD_CFG, PadState, PadTuning, synthEscape } from '../core/gamepad';

export class PadPointer {
  /** The pointer owns the pad this frame (menus up + pad recently active). */
  active = false;
  private x = window.innerWidth / 2;
  private y = window.innerHeight / 2;
  private ring: HTMLDivElement;

  constructor(private pad: PadState, private tuning: () => PadTuning) {
    this.ring = document.createElement('div');
    // Self-contained styling — no stylesheet dependency, renders over any panel.
    this.ring.style.cssText =
      'position:fixed;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;'
      + 'border:2px solid #c8a84b;border-radius:50%;pointer-events:none;z-index:99999;'
      + 'box-shadow:0 0 8px rgba(200,168,75,0.8),inset 0 0 4px rgba(200,168,75,0.5);'
      + 'display:none;';
    const dot = document.createElement('div');
    dot.style.cssText =
      'position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px 0 0 -2px;'
      + 'border-radius:50%;background:#c8a84b;';
    this.ring.appendChild(dot);
    document.body.appendChild(this.ring);
  }

  /** Once per frame from the main loop. `menuMode` = a blocking DOM surface
   *  is up (panels/menus/dialogs/start screen) — the pointer's habitat. */
  update(dt: number, menuMode: boolean, nowSec: number): void {
    const want = menuMode && this.pad.activeRecently(nowSec);
    if (want !== this.active) {
      this.active = want;
      this.ring.style.display = want ? 'block' : 'none';
      if (want) this.place(this.x, this.y); // re-clamp after any resize away
    }
    if (!this.active) return;

    // --- glide: move stick drives the cursor (curved magnitude = precision) ---
    const t = this.tuning();
    if (this.pad.moveMag > 0) {
      this.place(
        this.x + this.pad.move.x * t.pointerSpeed * dt,
        this.y + this.pad.move.y * t.pointerSpeed * dt,
      );
      // Real coordinates ride a real event — tooltips and anything else
      // listening to mousemove track the virtual cursor like the real one.
      this.under()?.dispatchEvent(new MouseEvent('mousemove', this.eventInit()));
    }

    // --- scroll: aim-stick Y wheels the scrollable under the cursor ---
    if (Math.abs(this.pad.aimStick.y) > 0) {
      const el = this.scrollable(this.under());
      if (el) el.scrollTop += this.pad.aimStick.y * PAD_CFG.pointer.scrollSpeed * dt;
    }

    // --- hardwired verbs (consume the edges so gameplay never sees them) ---
    if (this.pad.justPressed(PAD_CFG.pointer.confirm)) this.click();
    if (this.pad.justPressed(PAD_CFG.pointer.cancel)) synthEscape();
  }

  private place(x: number, y: number): void {
    this.x = Math.max(0, Math.min(window.innerWidth - 1, x));
    this.y = Math.max(0, Math.min(window.innerHeight - 1, y));
    this.ring.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }

  private under(): Element | null {
    // The ring is pointer-events:none, so it never occludes its own target.
    return document.elementFromPoint(this.x, this.y);
  }

  private eventInit(): MouseEventInit {
    return {
      bubbles: true, cancelable: true, view: window,
      clientX: this.x, clientY: this.y, button: 0,
    };
  }

  /** A full synthetic press: pointer + mouse down/up + click, in the order a
   *  physical mouse produces them, on whatever is under the ring. */
  private click(): void {
    const el = this.under();
    if (!el) return;
    const init = this.eventInit();
    const pInit: PointerEventInit = { ...init, pointerId: 7, pointerType: 'mouse', isPrimary: true };
    el.dispatchEvent(new PointerEvent('pointerdown', { ...pInit, buttons: 1 }));
    el.dispatchEvent(new MouseEvent('mousedown', { ...init, buttons: 1 }));
    el.dispatchEvent(new PointerEvent('pointerup', pInit));
    el.dispatchEvent(new MouseEvent('mouseup', init));
    el.dispatchEvent(new MouseEvent('click', init));
  }

  /** Nearest self-or-ancestor that actually scrolls. */
  private scrollable(el: Element | null): Element | null {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.scrollHeight > n.clientHeight + 1) {
        const oy = getComputedStyle(n).overflowY;
        if (oy === 'auto' || oy === 'scroll') return n;
      }
    }
    return null;
  }
}
