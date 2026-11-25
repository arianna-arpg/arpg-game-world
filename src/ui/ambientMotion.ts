/** Visibility gate for decorative CSS motion. Observe the decoration's bounds,
 * including clipping by a scrolling panel; never poll or join the game loop.
 * The caller releases this binding before replacing its markup. Reduced motion
 * and component state remain CSS rules, independent of page navigation. */
export function observeAmbientMotion(targets: readonly HTMLElement[], changed?: (target: HTMLElement, visible: boolean) => void): () => void {
  if (!targets.length) return () => {};
  const intersecting = new Map(targets.map(target => [target, false]));
  const doc = targets[0].ownerDocument;
  const sync = (): void => {
    for (const [target, visible] of intersecting) {
      const running = visible && !doc.hidden;
      if (target.dataset.ambientRunning === String(running)) continue;
      target.dataset.ambientRunning = String(running);
      changed?.(target, running);
    }
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) intersecting.set(entry.target as HTMLElement, entry.isIntersecting && entry.intersectionRatio > 0);
    sync();
  });
  sync();
  targets.forEach(target => observer.observe(target));
  doc.addEventListener('visibilitychange', sync);
  return () => {
    observer.disconnect();
    doc.removeEventListener('visibilitychange', sync);
    for (const target of targets) { target.dataset.ambientRunning = 'false'; changed?.(target, false); }
  };
}
