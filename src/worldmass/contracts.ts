import type { MassAddress, MassCell } from './address';

export interface MassNoiseLayer { id: string; period: number; amplitude: number; ridge?: boolean }
export interface MassFieldDef { id: string; base: number; layers: readonly MassNoiseLayer[] }
export interface MassRange { field: string; min?: number; max?: number }
export interface MassSurfaceRule {
  id: string; priority: number; when: readonly MassRange[];
  region: string; color: string; biome: string;
}
export interface MassPlaceRecipe {
  id: string; version: number;
  /** Registered content recipe interpreted by the engine adapter. */
  content: string;
  period: number; chance: number; radius: number; jitter: number;
  when: readonly MassRange[]; priority: number;
}
export interface MassSpec {
  id: string; version: number;
  /** Durable address unit, fixed during a run. */
  addressSpan: number;
  /** Physical terrain grain, separate from rendering and ecology lattices. */
  terrainCell: number;
  fields: readonly MassFieldDef[];
  surfaces: readonly MassSurfaceRule[];
  places: readonly MassPlaceRecipe[];
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
