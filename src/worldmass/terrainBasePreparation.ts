import type { MassAddress } from './address';
import type { MassTerrain } from './contracts';
import type { MassGenerator } from './generator';

// Runtime-owned optional work stays outside reflective controller state. Only
// exact base query addresses can match; the provider returns immediately on a
// miss. Regional composition, placement and material history remain on the host.
const providers = new WeakMap<MassGenerator, (at: MassAddress) => MassTerrain | undefined>();
export function installTerrainBasePreparation(generator: MassGenerator, take?: (at: MassAddress) => MassTerrain | undefined): void {
  if (take) providers.set(generator, take); else providers.delete(generator);
}
export function preparedTerrainBase(generator: MassGenerator, at: MassAddress): MassTerrain | undefined {
  return providers.get(generator)?.(at);
}
