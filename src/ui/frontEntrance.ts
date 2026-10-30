import { loadingPresentation } from '../loading/presentation';
import { FRONT_SCREEN } from './frontScreenConfig';
import { Z_LADDER } from './zorder';

let readiness: Promise<unknown> = Promise.resolve();
let entered = false;
let active: { root: HTMLElement; cancel: () => void } | undefined;

/** The shell owns boot/save failures; presentation only waits for its readiness. */
export function setFrontEntranceReadiness(ready: Promise<unknown>): void {
  readiness = ready;
}

/** Any deliberate input can skip the cosmetic reveal without delaying actions. */
export function cancelFrontEntrance(root: HTMLElement): void {
  if (active?.root === root) active.cancel();
}

/** One cover spans artwork and controls, surviving menu-data refreshes. It is
 * disposable on navigation, and never owns simulation, saves or loading leases. */
export function revealFrontEntrance(root: HTMLElement): void {
  active?.cancel();
  const cfg = FRONT_SCREEN.entrance;
  if (!cfg.enabled) return;
  const veil = document.createElement('div');
  veil.id = 'front-entrance';
  veil.setAttribute('aria-hidden', 'true');
  veil.dataset.state = 'waiting';
  veil.style.background = cfg.color;
  // The real loading surface and fatal errors retain authority above this reveal.
  veil.style.zIndex = String(Z_LADDER.loading - 1);
  document.body.append(veil);

  let closed = false, animation: Animation | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let releaseWait!: () => void;
  const cancelled = new Promise<void>(resolve => { releaseWait = resolve; });
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visible = (): boolean => root.isConnected && !root.classList.contains('hidden')
    && !!root.querySelector(':scope > .front-screen');
  const changed = (): void => { if (!visible()) finish(); };
  const observer = new MutationObserver(changed);
  const reduce = (): void => { if (motion.matches && animation) finish(); };
  const owner = { root, cancel: () => finish() };
  const finish = (): void => {
    if (closed) return;
    closed = true; clearTimeout(deadline); releaseWait(); observer.disconnect();
    motion.removeEventListener('change', reduce);
    animation?.cancel(); veil.remove();
    if (active === owner) active = undefined;
  };
  // A failed/slow optional resource must never strand the player behind black.
  const timeout = new Promise<void>(resolve => { deadline = setTimeout(resolve, cfg.maxWaitMs); });
  observer.observe(root, { childList: true, attributes: true, attributeFilter: ['class'] });
  motion.addEventListener('change', reduce);
  active = owner;

  const ready = (async (): Promise<void> => {
    await readiness;
    if (closed) return;
    const images = [document.querySelector<HTMLImageElement>('.front-landscape'),
      ...root.querySelectorAll<HTMLImageElement>('img')].filter((image): image is HTMLImageElement => !!image);
    await Promise.allSettled(images.map(image => image.decode()));
  })();
  void (async () => {
    try {
      await Promise.race([ready, timeout, cancelled]);
      clearTimeout(deadline);
      if (closed || !visible()) return;
      // Give the final hydrated menu a real display opportunity before revealing it.
      await loadingPresentation();
      if (closed || !visible()) return;
      const duration = entered ? cfg.returnMs : cfg.initialMs;
      entered = true;
      if (motion.matches || duration <= 0) return;
      veil.dataset.state = 'revealing';
      animation = veil.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration, easing: cfg.easing, fill: 'forwards',
      });
      await animation.finished;
    } catch { /* Decode/cancel failures release this presentation-only cover. */ }
    finally { finish(); }
  })();
}
