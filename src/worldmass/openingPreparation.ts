import type { MassGenerator } from './generator';
import type { MassRun } from './contracts';
import { freezeDataSteps } from './random';
import type { MassAdventure } from './preset';
import type { MassCell } from './address';
import { cooperativePreparation, checkPreparation, type PreparationControl } from '../loading/cooperative';
export interface OpeningRequest { seed: number; runId: string; config?: MassAdventure; origin?: MassCell; position?: { x: number; y: number } }
export interface PreparedMassOpening { seed: number; runId: string; config: MassAdventure; origin: MassCell; run: MassRun; terrainCache: ReturnType<MassGenerator['openingCache']> }
const prepared = new WeakSet<PreparedMassOpening>();
export function isPreparedMassOpening(value: PreparedMassOpening, seed: number, runId: string): boolean {
  return prepared.has(value) && value.seed === seed && value.runId === runId;
}
/** A private, one-job worker returns planning data. Runtime admission and all
 * live-world ownership checks still run on the game thread. */
export async function prepareMassOpening(request: OpeningRequest, control: PreparationControl): Promise<PreparedMassOpening> {
  checkPreparation(control);
  if (typeof document === 'undefined') {
    const { planMassOpening } = await import('./openingPlan');
    const result = planMassOpening(structuredClone(request));
    await cooperativePreparation(freezeDataSteps(result), control);
    checkPreparation(control); prepared.add(result); return result;
  }
  const worker = new Worker(new URL('./opening.worker.ts', import.meta.url), { type: 'module', name: 'world-opening-planner' });
  try {
    const result = await new Promise<PreparedMassOpening>((resolve, reject) => {
      const finish = (): void => { clearTimeout(timer); clearInterval(poll); control.signal?.removeEventListener('abort', abort); };
      const abort = (): void => { finish(); reject(new DOMException('Loading was superseded', 'AbortError')); };
      const timer = setTimeout(() => { finish(); reject(Error('World opening preparation timed out')); }, 120000);
      const poll = setInterval(() => { if (!control.isCurrent()) abort(); }, 50);
      control.signal?.addEventListener('abort', abort, { once: true });
      worker.onerror = event => { finish(); reject(Error(event.message || 'World opening planner failed')); };
      worker.onmessageerror = () => { finish(); reject(Error('World opening planner returned unreadable data')); };
      worker.onmessage = (event: MessageEvent<PreparedMassOpening & { error?: string }>) => {
        finish(); const value = event.data;
        if (value?.error) return reject(Error(value.error));
        if (!value || value.seed !== request.seed || value.runId !== request.runId || !value.config || !value.origin)
          return reject(Error('World opening planner returned a different run'));
        resolve(value);
      };
      if (control.signal?.aborted || !control.isCurrent()) { abort(); return; }
      try { worker.postMessage(request); } catch (error) { finish(); reject(error); }
    });
    await cooperativePreparation(freezeDataSteps(result), control);
    checkPreparation(control); prepared.add(result); return result;
  } finally { worker.terminate(); }
}
