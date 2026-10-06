import type { ZoneDef } from '../data/zones';
import { COURT_SHRINE_PRESET_PREFIX, PUZZLES, type CourtShrineSpec } from '../data/puzzles';
import type { PuzzleSpec } from '../engine/puzzles';
import { captureMintedOccurrences, occurrenceOf, type MintedOccurrence, type OccurrenceDef } from '../engine/occurrences';
import { canonical, freezeData } from './random';

export interface NativeGenerationSidechannels {
  occurrences: { site: MintedOccurrence; definition: OccurrenceDef }[];
  puzzles: { id: string; spec: PuzzleSpec }[];
}
const copy = <T>(value: T): T => JSON.parse(canonical(value)) as T;

/** Complete captured mechanism requirements, shared by surface and cave
 * compilers. No registry lookup is needed when restoring a born descriptor. */
export function nativeGenerationRequirements(channels: Readonly<NativeGenerationSidechannels>): string[] {
  if (!channels || !Array.isArray(channels.occurrences) || !Array.isArray(channels.puzzles))
    throw Error('Invalid native generation side channels');
  canonical(channels);
  const requirements = new Set<string>(), ids = new Set<string>();
  for (const row of channels.occurrences) {
    if (!row?.site || !row.definition || row.site.id !== row.definition.id || !row.site.id
      || ![row.site.x, row.site.y, row.site.floorR].every(Number.isFinite) || row.site.floorR < 0
      || !row.definition.trigger?.kind || !row.definition.spring)
      throw Error('Invalid native occurrence side channel');
    requirements.add('occurrences'); requirements.add('occurrence:' + row.site.id);
    requirements.add('occurrence-trigger:' + row.definition.trigger.kind);
    if (row.definition.aftermath) requirements.add('occurrence-aftermath:' + row.definition.aftermath.kind);
  }
  for (const row of channels.puzzles) {
    if (!row?.id || ids.has(row.id) || !row.spec?.kind || 'mintCtx' in row.spec)
      throw Error('Invalid native puzzle side channel');
    ids.add(row.id); requirements.add('puzzles'); requirements.add('puzzle:' + row.spec.kind);
    const shrine = (row.spec as CourtShrineSpec).shrine;
    if (shrine) {
      if (!shrine.kind || ![shrine.x, shrine.y, shrine.ringR, shrine.a0].every(Number.isFinite) || shrine.ringR <= 0)
        throw Error('Invalid native court shrine side channel');
      requirements.add('puzzle:' + shrine.kind);
    }
  }
  return [...requirements].sort();
}

/** Capture native mechanisms which generation stores outside GeneratedLayout.
 * Only the isolated compiler uses this scope. Source definitions are retained
 * as data; runtime admission still requires their complete native consumers.
 * The supplied zone is compiler-owned and keeps native generation mutations. */
export function captureNativeGeneration<T>(zone: ZoneDef, generate: () => T): {
  value: T; sidechannels: Readonly<NativeGenerationSidechannels>;
} {
  const key = COURT_SHRINE_PRESET_PREFIX + zone.id, previous = PUZZLES[key];
  delete PUZZLES[key];
  // A reused compiler-owned definition must not carry a previous pass's seat.
  if (zone.puzzles?.some(row => row.id === key)) zone.puzzles = zone.puzzles.filter(row => row.id !== key);
  try {
    const { value, rows } = captureMintedOccurrences(zone.id, generate);
    const occurrences = rows.map(site => {
      const definition = occurrenceOf(site.id);
      if (!definition) throw Error('Native occurrence definition is unavailable: ' + site.id);
      return { site: copy(site), definition: copy(definition) };
    });
    const ids = new Set((zone.puzzles ?? []).map(row => row.id));
    if (zone.objective.kind === 'puzzle' && zone.objective.puzzle) ids.add(zone.objective.puzzle);
    const puzzles = [...ids].map(id => {
      const raw = PUZZLES[id];
      if (!raw) throw Error('Native puzzle definition is unavailable: ' + id);
      // mintCtx is an ephemeral pass identity, not any part of the native
      // riddle's saved rules, fitted geometry, reward or generated tuning.
      const { mintCtx: _mintCtx, ...spec } = raw as CourtShrineSpec;
      return { id, spec: copy(spec) };
    });
    const sidechannels = freezeData({ occurrences, puzzles });
    nativeGenerationRequirements(sidechannels);
    return { value, sidechannels };
  } finally {
    if (previous) PUZZLES[key] = previous;
    else delete PUZZLES[key];
  }
}
