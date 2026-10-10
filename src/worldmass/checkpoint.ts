import type { WorldStateSave } from '../meta/worldstate';
import type { MassAdventureSave } from './runtime';
import { massAdventure } from './preset';
import { reserveMassOpening } from './patchReservations';
import { massDigest } from './random';

export type MassCheckpoint = Omit<MassAdventureSave, 'config'> & { land: 'seed-preset-v1' };
export type MassWorldCheckpoint = Omit<WorldStateSave, 'worldmass'> & { worldmass?: MassAdventureSave | MassCheckpoint };
export interface MassCheckpointOptions { massCheckpoint: true }
const landHashes = new Map<string, string>();
/** Prime at boot so checkpoints never regenerate the land on the save beat. */
export function massCheckpointLand(seed: number, runId: string): string {
  const key = seed + ':' + runId, old = landHashes.get(key); if (old) return old;
  const hash = massDigest(reserveMassOpening(seed, runId, massAdventure()));
  landHashes.set(key, hash);
  if (landHashes.size > 8) landHashes.delete(landHashes.keys().next().value!);
  return hash;
}
export function compactMass(save: MassAdventureSave): MassCheckpoint {
  const { config: _config, ...state } = save, run = save.state.run;
  if (save.configHash !== massCheckpointLand(run.seed, run.runId)) throw Error('Custom land requires a full worldmass save');
  return { ...state, land: 'seed-preset-v1' };
}
/** Hydrate before the ordinary strict restore path. Changed presets are refused,
 * never substituted beneath saved bodies. Portable/custom saves keep their land. */
export function hydrateMass(save: MassAdventureSave | MassCheckpoint): MassAdventureSave {
  if ('config' in save) return save;
  if (save.land !== 'seed-preset-v1' || !save.state?.run) throw Error('Unknown worldmass land reference');
  const run = save.state.run, config = reserveMassOpening(run.seed, run.runId, massAdventure());
  if (massDigest(config) !== save.configHash) throw Error('Worldmass checkpoint belongs to another build of the land');
  const { land: _land, ...state } = save;
  return { ...state, config };
}
export function hydrateMassWorld(save: MassWorldCheckpoint): WorldStateSave {
  const { worldmass, ...world } = save;
  return { ...world, ...(worldmass ? { worldmass: hydrateMass(worldmass) } : {}) };
}
