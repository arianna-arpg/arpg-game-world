/** Native cursor frame driver: no overlay, hit testing, pointer capture or
 * input interception. No animation work occurs until a visible mouse is idle. */
export function startCursorMotion(
  cfg: { delaySec: number; periodSec: number; frames: number },
  paint: (frame: number) => void,
): () => void {
  const events = new AbortController();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inside = false, held = false, frame = 0;
  const keys = new Set<string>();
  const clear = (): void => { clearTimeout(timer); timer = undefined; if (frame) { frame = 0; paint(0); } };
  const allowed = (): boolean => inside && !held && !keys.size && !document.hidden && !document.pointerLockElement && !reduced.matches;
  const tick = (): void => {
    if (!allowed()) { clear(); return; }
    frame = (frame + 1) % cfg.frames; paint(frame);
    timer = setTimeout(tick, cfg.periodSec * 1000 / cfg.frames);
  };
  const arm = (): void => { clear(); if (allowed()) timer = setTimeout(tick, cfg.delaySec * 1000); };
  const on = (type: string, listener: EventListener): void => document.addEventListener(type, listener, { capture: true, passive: true, signal: events.signal });
  on('pointermove', e => { const p = e as PointerEvent; inside = p.pointerType === 'mouse'; held = p.buttons !== 0; arm(); });
  on('pointerover', e => { inside = (e as PointerEvent).pointerType === 'mouse'; arm(); });
  on('pointerdown', () => { held = true; clear(); });
  on('pointerup', e => { held = (e as PointerEvent).buttons !== 0; arm(); });
  on('pointercancel', () => { held = false; inside = false; clear(); });
  on('pointerout', e => { if (!(e as PointerEvent).relatedTarget) { inside = false; clear(); } });
  on('keydown', e => { keys.add((e as KeyboardEvent).code); clear(); });
  on('keyup', e => { keys.delete((e as KeyboardEvent).code); arm(); });
  on('wheel', arm); on('scroll', arm);
  on('dragstart', () => { held = true; clear(); });
  on('dragend', () => { held = false; arm(); });
  const leave = (): void => { inside = false; held = false; keys.clear(); clear(); };
  on('visibilitychange', leave); on('pointerlockchange', leave);
  window.addEventListener('blur', leave, { signal: events.signal });
  reduced.addEventListener('change', arm, { signal: events.signal });
  return () => { events.abort(); clear(); };
}
