/** Real tasks between bounded preparation steps let input and canvas frames run
 * even when the browser puts the game and crossing on the same thread. */
export interface PreparationControl { isCurrent: () => boolean; signal?: AbortSignal }
export function checkPreparation(control: PreparationControl): void {
  if (control.signal?.aborted || !control.isCurrent()) throw new DOMException('Loading was superseded', 'AbortError');
}
export async function cooperativePreparation(steps: Generator<void, void>, control: PreparationControl,
  scope: (step: () => IteratorResult<void, void>) => IteratorResult<void, void> = step => step()): Promise<void> {
  checkPreparation(control);
  let budget = performance.now();
  try {
    for (;;) {
      const next = scope(() => steps.next());
      if (next.done) { checkPreparation(control); return; }
      if (performance.now() - budget >= 6) {
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        checkPreparation(control);
        budget = performance.now();
      }
    }
  } finally { scope(() => steps.return()); }
}
