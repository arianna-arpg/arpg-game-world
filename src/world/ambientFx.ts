/** Presentation data only. Positions and distances are zone world pixels. */
export interface AmbientFieldSpec {
  /** Fixed world-cell spacing; independent of viewport size. */
  spacing?: number;
  /** Candidates per cell. Intensity changes opacity, never placement. */
  count?: number;
  radius?: number;
  velocity?: [number, number];
  /** Seconds between births; zero keeps a permanent terrain patch. */
  period?: number;
  lifetime?: number;
  chance?: number;
  /** Additional salt, for independently authored layers in the same zone. */
  seed?: number;
}

export interface AmbientHeatPatch {
  x: number;
  y: number;
  radius: number;
  intensity?: number;
}

interface AmbientFxBase { intensity?: number; color?: string }
export type AmbientFxSpec = AmbientFxBase & (
  | { kind: 'bubbles' | 'caustics' | 'motes' | 'aurora' | 'spores' | 'overclouds' | 'fireflies' | 'seedDrift' | 'abyss' }
  | { kind: 'sandDrift'; field?: AmbientFieldSpec; dustDevils?: false | AmbientFieldSpec }
  | { kind: 'tumbleweeds'; field?: AmbientFieldSpec }
  | { kind: 'heatHaze'; anchor?: 'view' | 'world'; field?: AmbientFieldSpec;
      /** Explicit patches replace the generated field; [] deliberately paints none. */
      patches?: AmbientHeatPatch[] }
);
