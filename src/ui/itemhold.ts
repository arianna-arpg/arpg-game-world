/** One hold gesture for inventory protection and vendor reservations. */
export const ITEM_HOLD_CFG = { holdMs: 320, slopPx: 6 };
export interface ItemHoldTarget {
  element: () => HTMLElement | null;
  toggle: () => void;
  tap?: () => void;
}
export class ItemHoldController {
  private hold: { target: ItemHoldTarget; x: number; y: number; started: number;
    fired: boolean; timer: number; off: () => void } | null = null;
  constructor(private afterFire: (pad: boolean) => void) {}
  begin(target: ItemHoldTarget, x: number, y: number, pad: boolean, bound = false): void {
    this.end();
    const h = { target, x, y, started: performance.now(), fired: false, timer: 0, off: () => {} };
    const cancel = (): void => this.end();
    const move = (e: PointerEvent): void => {
      if ((!bound && !e.buttons) || Math.hypot(e.clientX - x, e.clientY - y) > ITEM_HOLD_CFG.slopPx) cancel();
    };
    const release = (e: PointerEvent): void => {
      if (bound) return;
      const el = target.element();
      const tap = !h.fired && !pad && e.target instanceof Node && el?.contains(e.target);
      this.end();
      if (tap) target.tap?.();
    };
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', cancel, true);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('blur', cancel);
    h.off = () => {
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', cancel, true);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('blur', cancel);
    };
    h.timer = window.setTimeout(() => {
      const el = target.element();
      if (this.hold !== h || !el?.isConnected || !el.getClientRects().length) { this.end(); return; }
      h.fired = true;
      target.toggle();
      this.afterFire(pad);
      this.paint();
    }, ITEM_HOLD_CFG.holdMs);
    this.hold = h;
    this.paint();
  }
  end(): void {
    const h = this.hold;
    if (!h) return;
    clearTimeout(h.timer); h.off(); this.hold = null;
    document.querySelectorAll('.lock-hold').forEach(el => el.classList.remove('lock-hold', 'lock-hold-fired'));
  }
  paint(): void {
    const h = this.hold, el = h?.target.element();
    if (!h || !el) return;
    el.style.setProperty('--lock-hold-ms', `${ITEM_HOLD_CFG.holdMs}ms`);
    el.style.setProperty('--lock-hold-elapsed', `-${Math.round(performance.now() - h.started)}ms`);
    el.classList.add('lock-hold');
    el.classList.toggle('lock-hold-fired', h.fired);
  }
}
