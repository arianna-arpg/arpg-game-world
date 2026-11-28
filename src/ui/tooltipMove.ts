export interface TooltipPosition { x: number; y: number }

/** Move in viewport pixels. Each owner decides how long the position belongs to its content. */
export function enableTooltipMove(card: HTMLElement, move: (position: TooltipPosition) => void, enabled = () => true): void {
  let drag: { id: number; dx: number; dy: number } | undefined;
  let pending: TooltipPosition | undefined;
  let rafId = 0;
  const flush = (): void => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    if (pending && drag && enabled()) {
      const next = pending;
      pending = undefined;
      move(next);
    } else {
      pending = undefined;
    }
  };
  card.addEventListener('pointerdown',event => {
    const hit = event.target as Element;
    if (!enabled() || event.button !== 0 || !event.isPrimary || !hit.closest('.tt-title') || hit.closest('button,a')) return;
    const rect = card.getBoundingClientRect();
    drag = {id:event.pointerId,dx:event.clientX-rect.left,dy:event.clientY-rect.top};
    pending = undefined;
    card.setPointerCapture(event.pointerId);
    card.toggleAttribute('data-inspect-drag',true);
    card.focus({preventScroll:true});
    event.preventDefault();
  });
  card.addEventListener('pointermove',event => {
    if (!drag || drag.id !== event.pointerId || !enabled()) return;
    pending = {x:event.clientX-drag.dx,y:event.clientY-drag.dy};
    if (!rafId) rafId = requestAnimationFrame(flush);
  });
  card.addEventListener('pointerup',event => {
    if (drag && drag.id === event.pointerId) {
      if (enabled()) pending = {x:event.clientX-drag.dx,y:event.clientY-drag.dy};
      flush();
    }
  });
  card.addEventListener('lostpointercapture',() => {
    flush();
    drag = undefined;
    card.removeAttribute('data-inspect-drag');
  });
  card.addEventListener('keydown',event => {
    if (!enabled() || !event.shiftKey || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    flush();
    const rect = card.getBoundingClientRect(), step = 16;
    move({x:rect.left + (event.key==='ArrowLeft' ? -step : event.key==='ArrowRight' ? step : 0),
      y:rect.top + (event.key==='ArrowUp' ? -step : event.key==='ArrowDown' ? step : 0)});
    event.preventDefault(); event.stopPropagation();
  });
}
