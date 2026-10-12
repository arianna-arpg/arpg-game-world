/** Resolve after real display opportunities, or immediately if the user hides
 * the tab. A timer alone never claims that a visible minigame has painted. */
export function loadingPresentation(): Promise<void> {
  return new Promise(resolve => {
    let frame = 0, done = false;
    const finish = (): void => {
      if (done) return; done = true; cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility); resolve();
    };
    const visibility = (): void => { if (document.hidden) finish(); };
    document.addEventListener('visibilitychange', visibility);
    if (document.hidden) { finish(); return; }
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(finish); });
  });
}
