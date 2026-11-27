/** Keep live panels mounted under a press. Both the refresh scheduler and the
 * panel renderer consult the same pointer history, including native pickers. */
const presses = new Map<number, EventTarget[]>();
let installed = false;
let canReadOpen = false;

export function installUiPressGuard(): void {
  if (installed || typeof window === 'undefined' || !window.addEventListener) return;
  installed = true;
  canReadOpen = typeof CSS !== 'undefined' && CSS.supports('selector(select:open)');
  const capture = {capture:true, passive:true};
  window.addEventListener('pointerdown', e => {
    const select = e.target instanceof Element ? e.target.closest('select') : null;
    // A mouse-operated dropdown can consume both release and cancellation.
    // Its native open state spans the whole interaction, including reselecting the same option.
    if (canReadOpen && e.pointerType === 'mouse' && select && !select.multiple && select.size <= 1) return;
    presses.set(e.pointerId,e.composedPath());
  },capture);
  const release = (e: PointerEvent) => { presses.delete(e.pointerId); };
  window.addEventListener('pointerup',release,capture);
  window.addEventListener('pointercancel',release,capture);
  window.addEventListener('pointermove', e => { if (!e.buttons && presses.size) release(e); },capture);
  window.addEventListener('blur', () => presses.clear());
  // A system picker may deliver its change or focus loss without a DOM pointerup.
  const finishSelect = (e: Event) => {
    if (!(e.target instanceof HTMLSelectElement)) return;
    for (const [id,path] of presses) if (path.includes(e.target)) presses.delete(id);
  };
  window.addEventListener('change',finishSelect,capture);
  window.addEventListener('focusout',finishSelect,capture);
}

export function uiPressHeld(panel?: HTMLElement): boolean {
  for (const path of presses.values()) if (!panel || path.includes(panel)) return true;
  // Keyboard-opened lists also need to survive the next scheduled panel rebuild.
  if (canReadOpen) {
    const select = document.activeElement?.closest('select');
    if (select && (!panel || panel.contains(select))) return select.matches(':open');
  }
  return false;
}
