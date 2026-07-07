// ---------------------------------------------------------------------------
// PAD POINTER — a stick-driven virtual mouse for every DOM surface (start
// menu, inventory, tree, vendor, death screen, …), so controller support
// never requires rewriting a panel. While a blocking surface is up and the
// pad is the active input source:
//
//   • move stick   → moves a gold cursor ring (clamped to the viewport)
//   • hover        → the element under the ring gets the REAL mouse hover
//                    grammar (pointer/mouse over·out·enter·leave·move), so
//                    tooltips and hover previews track the ring unmodified —
//                    re-checked every frame, so a panel re-render under a
//                    stationary ring re-hovers on its own
//   • Ⓐ (confirm)  → REAL button semantics: press = pointerdown, release =
//                    pointerup (+ click when it lands on what it pressed).
//                    Press-glide-release is therefore a genuine DRAG — the
//                    panzoom surfaces (passive tree, world map) pan with it
//                    and never know a pad exists
//   • aim stick ↑↓ → scrolls the scrollable under the ring; where nothing
//                    scrolls it banks synthetic wheel notches instead, so
//                    wheel-zoom surfaces (tree, map) zoom on the same stick
//   • Ⓑ (cancel)   → the hardwired Escape (same close-cascade as the key)
//
// The pointer OWNS the pad while active: gameplay reads gate on
// pointer.active, so Ⓐ never double-fires a skill under a menu click. Mouse
// users never see it — it only wakes when the pad spoke recently
// (PAD_CFG.activeWindow) and goes away the moment the surfaces close,
// retiring cleanly (any in-flight drag is cancelled, hover is parted).
//
// KNOWN SEAMS: native HTML5 drag-and-drop (vestige inlaying's draggable
// gesture) can't be synthesized from script — pad players use click-to-lift
// flows (bag items already work that way). CSS :hover styling likewise skips
// synthetic events; the ring itself is the hover feedback.
// ---------------------------------------------------------------------------

import { PAD_CFG, PadState, PadTuning, synthEscape } from '../core/gamepad';
import { hideTooltip } from './tooltip';

export class PadPointer {
  /** The pointer owns the pad this frame (menus up + pad recently active). */
  active = false;
  private x = window.innerWidth / 2;
  private y = window.innerHeight / 2;
  private ring: HTMLDivElement;
  /** Element currently under the ring — the synthetic :hover anchor. */
  private hovered: Element | null = null;
  /** Ⓐ is held: the pointerdown target anchoring the drag. Subsequent moves
   *  and the release dispatch here (manual pointer-capture semantics), so a
   *  drag that glides off its surface keeps steering that surface. */
  private dragAnchor: Element | null = null;
  /** Fractional wheel notches banked by the zoom stick between frames. */
  private zoomAcc = 0;

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
      else this.retire();                   // never leave a drag/hover dangling
    }
    if (!this.active) return;

    // --- glide: move stick drives the cursor (curved magnitude = precision) ---
    const t = this.tuning();
    const glided = this.pad.moveMag > 0;
    if (glided) {
      this.place(
        this.x + this.pad.move.x * t.pointerSpeed * dt,
        this.y + this.pad.move.y * t.pointerSpeed * dt,
      );
    }

    // --- hover: re-read what's under the ring EVERY frame (panels re-render
    // beneath a stationary cursor); a live drag freezes hover on its anchor ---
    const under = this.under();
    const held = this.pad.isDown(PAD_CFG.pointer.confirm);
    if (!this.dragAnchor) this.hoverTo(under);
    if (glided) {
      // Real coordinates ride real events — tooltips, panzoom idle-hover and
      // drag maths all track the virtual cursor exactly like the real one.
      const target = this.dragAnchor?.isConnected ? this.dragAnchor : under;
      target?.dispatchEvent(new PointerEvent('pointermove', this.pointerInit(held ? 1 : 0)));
      target?.dispatchEvent(new MouseEvent('mousemove', this.mouseInit(held ? 1 : 0)));
    }

    // --- Ⓐ: real button semantics (press anchors, release resolves) ---
    if (this.pad.justPressed(PAD_CFG.pointer.confirm)) this.press(under);
    else if (this.dragAnchor && !held) this.release(under);

    // --- aim stick: scroll what scrolls; wheel-zoom what doesn't ---
    const zs = this.pad.aimStick.y;
    if (Math.abs(zs) > 0) {
      const el = this.scrollable(under);
      if (el) {
        el.scrollTop += zs * PAD_CFG.pointer.scrollSpeed * dt;
        this.zoomAcc = 0;
      } else {
        // Bank stick-time into whole wheel notches (stick up = wheel up =
        // zoom in) — pan/zoom surfaces listen for real wheel events.
        this.zoomAcc += zs * PAD_CFG.pointer.zoomNotchesPerSec * dt;
        while (Math.abs(this.zoomAcc) >= 1) {
          const s = Math.sign(this.zoomAcc);
          this.zoomAcc -= s;
          under?.dispatchEvent(new WheelEvent('wheel', { ...this.mouseInit(0), deltaY: s * 100 }));
        }
      }
    } else this.zoomAcc = 0;

    // --- hardwired cancel (consume the edge so gameplay never sees it) ---
    if (this.pad.justPressed(PAD_CFG.pointer.cancel)) synthEscape();
  }

  private place(x: number, y: number): void {
    this.x = Math.max(0, Math.min(window.innerWidth - 1, x));
    this.y = Math.max(0, Math.min(window.innerHeight - 1, y));
    this.ring.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }

  private under(): Element | null {
    // The ring is pointer-events:none, so it never occludes its own target
    // (and so is the shared tooltip box — it can never occlude either).
    return document.elementFromPoint(this.x, this.y);
  }

  private mouseInit(buttons: number, related: Element | null = null): MouseEventInit {
    return {
      bubbles: true, cancelable: true, view: window,
      clientX: this.x, clientY: this.y, button: 0, buttons,
      relatedTarget: related,
    };
  }

  private pointerInit(buttons: number, related: Element | null = null): PointerEventInit {
    return { ...this.mouseInit(buttons, related), pointerId: 7, pointerType: 'mouse', isPrimary: true };
  }

  /** Move the synthetic hover from the current element to `next`, dispatching
   *  the full mouse hover grammar: over/out BUBBLE (delegated listeners like
   *  the shared tooltip live on panel containers), enter/leave DON'T (walked
   *  along the ancestor chains, outermost-in, exactly as a real mouse). */
  private hoverTo(next: Element | null): void {
    const prev = this.hovered;
    if (next === prev) return;
    this.hovered = next;
    if (prev) {
      prev.dispatchEvent(new PointerEvent('pointerout', this.pointerInit(0, next)));
      prev.dispatchEvent(new MouseEvent('mouseout', this.mouseInit(0, next)));
      for (let n: Element | null = prev; n; n = n.parentElement) {
        if (next && n.contains(next)) break;
        n.dispatchEvent(new PointerEvent('pointerleave', { ...this.pointerInit(0, next), bubbles: false }));
        n.dispatchEvent(new MouseEvent('mouseleave', { ...this.mouseInit(0, next), bubbles: false }));
      }
    }
    if (next) {
      next.dispatchEvent(new PointerEvent('pointerover', this.pointerInit(0, prev)));
      next.dispatchEvent(new MouseEvent('mouseover', this.mouseInit(0, prev)));
      const chain: Element[] = [];
      for (let n: Element | null = next; n; n = n.parentElement) {
        if (prev && n.contains(prev)) break;
        chain.push(n);
      }
      for (let i = chain.length - 1; i >= 0; i--) {
        chain[i].dispatchEvent(new PointerEvent('pointerenter', { ...this.pointerInit(0, prev), bubbles: false }));
        chain[i].dispatchEvent(new MouseEvent('mouseenter', { ...this.mouseInit(0, prev), bubbles: false }));
      }
    }
  }

  /** Ⓐ went down: anchor a real pointerdown on whatever is under the ring.
   *  Whether this becomes a click or a drag is decided by what the hand does
   *  next — the same contract a physical mouse gives the panels. */
  private press(under: Element | null): void {
    if (!under) return;
    this.dragAnchor = under;
    under.dispatchEvent(new PointerEvent('pointerdown', this.pointerInit(1)));
    under.dispatchEvent(new MouseEvent('mousedown', this.mouseInit(1)));
  }

  /** Ⓐ came up: resolve the press — pointerup on the anchor, plus a click
   *  only when the release still lands on it (the browser's own rule, so
   *  dragging off a control and letting go cancels, and a drag-pan's ending
   *  click is left for panzoom's moved-swallow to eat). */
  private release(under: Element | null): void {
    const anchor = this.dragAnchor!;
    this.dragAnchor = null;
    const target = anchor.isConnected ? anchor : under; // anchor torn out by a re-render
    if (!target) return;
    target.dispatchEvent(new PointerEvent('pointerup', this.pointerInit(0)));
    target.dispatchEvent(new MouseEvent('mouseup', this.mouseInit(0)));
    const clickEl = !under ? null
      : target.contains(under) ? target
      : under.contains(target) ? under : null;
    clickEl?.dispatchEvent(new MouseEvent('click', this.mouseInit(0)));
  }

  /** The surfaces closed (or the mouse took over): finish any drag as a
   *  cancel so pan gestures can't wedge, part from the hovered element so
   *  delegated hover state clears, and hide the shared tooltip outright
   *  (its anchor may already be detached and unable to bubble the out). */
  private retire(): void {
    if (this.dragAnchor) {
      const a = this.dragAnchor;
      this.dragAnchor = null;
      a.dispatchEvent(new PointerEvent('pointercancel', this.pointerInit(0)));
      a.dispatchEvent(new MouseEvent('mouseup', this.mouseInit(0)));
    }
    this.hoverTo(null);
    this.zoomAcc = 0;
    hideTooltip();
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
