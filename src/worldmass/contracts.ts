import type { MassAddress, MassCell } from './address';

export interface MassNoiseLayer { id: string; period: number; amplitude: number; ridge?: boolean }
export interface MassFieldDef { id: string; base: number; layers: readonly MassNoiseLayer[] }
export interface MassRange { field: string; min?: number; max?: number }
export interface MassSurfaceRule {
  /** Content registry/package that contributed this rule. */
  source?: string;
  id: string; priority: number; when: readonly MassRange[];
  region: string; color: string; biome: string;
}
export interface MassPlaceRecipe {
  id: string; version: number;
  /** Registered content recipe interpreted by the engine adapter. */
  content: string;
  period: number; chance: number; radius: number; jitter: number;
  when: readonly MassRange[]; priority: number;
  /** Deterministic site ground, sampled before residency and before player edits. */
  surface?: { region: string; color: string };
}
/** Saved physical patches share ONE lattice. Their complete raster footprints
 * stay inside a cell, with a neutral, scenery-reserved bypass around each. */
export interface MassPatchChoice {
  id: string; weight: number; region: string; color: string;
  radius: readonly [number, number]; scale: number; wobble: number;
  pieces: readonly [number, number];
}
export interface MassPatchPolicy {
  source: string; version: number; spacing: number; jitter: number;
  /** Neutral annulus width; at least two terrain cells and a player diameter. */
  bypass: number;
  /** Resolved fixed foundations, snapshotted before any candidate is observed. */
  exclusions?: readonly { source: string; origin: MassAddress;
    bounds: { minX: number; minY: number; maxX: number; maxY: number } }[];
  recipes: readonly {
    id: string; when: readonly MassRange[]; onSurfaces: readonly string[];
    chance: number; choices: readonly MassPatchChoice[];
  }[];
}
export interface MassSpec {
  /** New explicit source-owned substrate; omission preserves legacy noise. */
  nativeSubstrate?: import('./nativeSubstrate').NativeSubstrate;
  id: string; version: number;
  /** Durable address unit, fixed during a run. */
  addressSpan: number;
  /** Physical terrain grain, separate from rendering and ecology lattices. */
  terrainCell: number;
  fields: readonly MassFieldDef[];
  surfaces: readonly MassSurfaceRule[];
  places: readonly MassPlaceRecipe[];
  /** Omission retains the original terrain algorithm and saved geography. */
  patches?: MassPatchPolicy;
  /** Saved regional navigation shapes; omitted in historical runs. */
  landforms?: import('./landforms').MassLandformPolicy;
}
export interface MassRun {
  schema: 1; seed: number; runId: string;
  generator: string; version: number; manifest: string; addressSpan: number;
}
export interface MassProvenance {
  generator: string; version: number; rule: string; source: string; stream: string;
}
export interface MassTerrain {
  region: string; color: string; biome: string;
  fields: Readonly<Record<string, number>>; source: MassProvenance;
}
export interface MassPlace {
  id: string; recipe: string; content: string; center: MassAddress; radius: number; source: MassProvenance;
}
export interface MassTerrainPatch { address: MassAddress; region: string; color: string; cause: string }
export interface MassPage {
  key: string; cell: MassCell; revision: number; cols: number; samples: readonly MassTerrain[];
}

/** Every physical material reachable from the immutable generator policy.
 * Worker admission and the live runtime must see the same catalogue. */
export function massTerrainRegions(spec: MassSpec): string[] {
  return [...new Set([...spec.surfaces.map(s => s.region),
    ...spec.places.flatMap(p => p.surface ? [p.surface.region] : []),
    ...(spec.landforms ? ['ground','water','locale_bridge',...spec.landforms.recipes.map(r=>r.barrier.region)] : []),
    ...(spec.patches?.recipes.flatMap(r => r.choices.map(c => c.region)) ?? [])])];
}
