import type { StampSpec } from './zones';

export interface ForestTreeMix { kind: string; weight: number; radius: [number, number] }
/** Shared with the full forest recipe; locales plant this same palette sparsely. */
export const FOREST_TREES: ForestTreeMix[] = [
  { kind: 'forest_oak', weight: 5, radius: [38, 58] },
  { kind: 'tree', weight: 3, radius: [20, 32] },
  { kind: 'conifer', weight: 2, radius: [20, 30] },
  { kind: 'briarwood', weight: 1, radius: [18, 26] },
];
export const FOREST_UNDERSTORY: StampSpec[] = [
  { kind: 'brush', count: [8, 12] },
  { kind: 'fern', count: [6, 10] },
  { kind: 'berry_bush', count: [2, 4] },
];

/** Resolved at discovery, independently copied to each section and saved with it. */
export interface BiomeDecoration {
  density: number;
  layout: StampSpec[];
  trees?: ForestTreeMix[];
}
