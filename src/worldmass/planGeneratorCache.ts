import type { MassRun, MassSpec } from './contracts';
import { MassGenerator } from './generator';
import { canonical } from './random';

/** One generator per planning worker/port. Equivalent structured-clone inputs
 * reuse its bounded terrain/place caches; a new run or terrain replaces it.
 * There is no process-wide cache or native runtime bootstrap. */
export class MassPlanGeneratorCache {
  private entry?: { key: string; generator: MassGenerator };

  get(run: MassRun, terrain: MassSpec): MassGenerator {
    const key = canonical([run, terrain]);
    if (this.entry?.key !== key) {
      // Publish only after construction succeeds; a rejected input cannot
      // poison the last valid generator or claim its identity.
      this.entry = { key, generator: new MassGenerator(run, terrain) };
    }
    return this.entry.generator;
  }
}
