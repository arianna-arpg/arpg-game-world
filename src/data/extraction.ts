// ---------------------------------------------------------------------------
// EXTRACTION LOOKS — the seam's per-biome FACE, as data.
//
// One extract encounter, many countries: the node that wells up in a bog is a
// peat-drowned brinepool; in the Bloom it is a spore-crowned cap; on the
// cinder wastes a cracked seam of ember-marrow. Each row names the node BODY
// (a MonsterDef id — the attackable objective), a TITLE the HUD speaks, an
// accent tint, and a scatter recipe of ordinary doodads dressed around the
// well at placement (the "environmental shift" the locals object to).
//
// Mirrors GATE_LOOKS: keyed by BIOME TAG with a default fallback, extensible
// at runtime via registerExtractionLook (a future package reskins its own
// country with one call — no engine edits). Mechanics live on the ExtractSpec
// (packages/encounters.ts); THIS file is purely the face.
// ---------------------------------------------------------------------------

import { registerDoodadRule } from '../engine/levelgen';
import { registerTransit } from './transit';

/** One scatter row: `count` doodads of `kind` on the ring band `ring` (px). */
export interface ExtractionDressing {
  kind: string;
  count: [number, number];
  ring: [number, number];
}

export interface ExtractionLook {
  /** MonsterDef id of the node body (driven, team-player objective). */
  node: string;
  /** What the HUD calls it ("Peat-Drowned Seam"). */
  title: string;
  /** Ring / glyph / float tint. */
  accent: string;
  /** The ground fixture under the body (kind-swapped to `<kind>_spent` when
   *  the seam ends). Omitted = the shared 'marrow_well'. */
  well?: string;
  /** Ordinary doodads scattered around the well at placement. */
  dressing?: ExtractionDressing[];
}

export const DEFAULT_EXTRACTION_LOOK: ExtractionLook = {
  node: 'marrow_wellspring', title: 'Marrow Wellspring', accent: '#a5e3b4',
  dressing: [
    { kind: 'crystal_cluster', count: [2, 3], ring: [40, 90] },
    { kind: 'standing_stone', count: [1, 2], ring: [60, 110] },
  ],
};

/** Biome tag → look. Sparse on purpose: countries that read fine under the
 *  default (plains, field, highland, desert, tundra, crystal…) stay off the
 *  table; add a row only when a biome earns a bespoke face. */
export const EXTRACTION_LOOKS: Record<string, ExtractionLook> = {
  grove: {
    node: 'marrow_bole', title: 'Sapheart Bole', accent: '#a8d878',
    dressing: [
      { kind: 'fern', count: [2, 4], ring: [36, 80] },
      { kind: 'hollow_log', count: [1, 1], ring: [60, 100] },
    ],
  },
  forest: {
    node: 'marrow_bole', title: 'Sapheart Bole', accent: '#a8d878',
    dressing: [
      { kind: 'fern', count: [2, 4], ring: [36, 80] },
      { kind: 'stump', count: [1, 2], ring: [56, 100] },
    ],
  },
  taiga: {
    node: 'marrow_bole', title: 'Frostsap Bole', accent: '#b8e0c8',
    dressing: [
      { kind: 'conifer', count: [1, 2], ring: [64, 110] },
      { kind: 'snowdrift', count: [2, 3], ring: [40, 90] },
    ],
  },
  gloamwood: {
    node: 'marrow_gloamheart', title: 'Gloamheart Seep', accent: '#b9a8e8',
    dressing: [
      { kind: 'tallow_stump', count: [1, 2], ring: [46, 92] },
      { kind: 'bone_pile', count: [1, 2], ring: [56, 104] },
    ],
  },
  grave: {
    node: 'marrow_gloamheart', title: 'Grave-Cold Seep', accent: '#c8c8e8',
    dressing: [
      { kind: 'bone_cairn', count: [1, 2], ring: [46, 96] },
      { kind: 'tombstone', count: [1, 2], ring: [60, 110] },
    ],
  },
  cavern: {
    node: 'marrow_gloamheart', title: 'Hollow-Deep Seep', accent: '#9ab8d8',
    dressing: [
      { kind: 'rock', count: [2, 3], ring: [40, 90] },
      { kind: 'crystal', count: [1, 2], ring: [52, 100] },
    ],
  },
  mycelia: {
    node: 'marrow_sporecrown', title: 'Sporecrown Well', accent: '#d8b8e8',
    dressing: [
      { kind: 'puffcap_cluster', count: [2, 3], ring: [40, 88] },
      { kind: 'glow_cap', count: [1, 2], ring: [52, 100] },
    ],
  },
  marsh: {
    node: 'marrow_brinepool', title: 'Peat-Drowned Seam', accent: '#8fd8c0',
    dressing: [
      { kind: 'reeds', count: [3, 5], ring: [36, 86] },
      { kind: 'sunken_log', count: [1, 1], ring: [56, 96] },
    ],
  },
  beach: {
    node: 'marrow_brinepool', title: 'Tide-Worn Seam', accent: '#8fd8d0',
    dressing: [
      { kind: 'sea_rock', count: [2, 3], ring: [40, 90] },
      { kind: 'kelp', count: [1, 3], ring: [50, 100] },
    ],
  },
  isle: {
    node: 'marrow_brinepool', title: 'Tide-Worn Seam', accent: '#8fd8d0',
    dressing: [
      { kind: 'sea_rock', count: [2, 3], ring: [40, 90] },
      { kind: 'palm', count: [1, 1], ring: [64, 110] },
    ],
  },
  deepsea: {
    node: 'marrow_brinepool', title: 'Abyssal Seam', accent: '#7ab8d8',
    dressing: [
      { kind: 'coral', count: [2, 3], ring: [40, 90] },
      { kind: 'giant_kelp', count: [1, 2], ring: [56, 104] },
    ],
  },
  flesh: {
    node: 'marrow_gorebloom', title: 'Gorebloom Seep', accent: '#e89a9a',
    dressing: [
      { kind: 'flesh_pod', count: [1, 2], ring: [44, 92] },
      { kind: 'vein_cluster', count: [2, 3], ring: [36, 84] },
    ],
  },
  volcanic: {
    node: 'marrow_cinderseam', title: 'Cinder-Marrow Seam', accent: '#f0a860',
    dressing: [
      { kind: 'ember_vent', count: [1, 2], ring: [48, 96] },
      { kind: 'obsidian', count: [2, 3], ring: [40, 90] },
    ],
  },
  rift: {
    node: 'marrow_cinderseam', title: 'Riftglass Seam', accent: '#e88a6a',
    dressing: [
      { kind: 'cinder', count: [2, 3], ring: [40, 88] },
      { kind: 'obsidian', count: [1, 2], ring: [52, 100] },
    ],
  },
  steppes: {
    node: 'marrow_cinderseam', title: 'Ashen Seam', accent: '#e0a070',
    dressing: [
      { kind: 'cinder', count: [2, 3], ring: [40, 88] },
      { kind: 'rubble', count: [1, 2], ring: [52, 100] },
    ],
  },
};

/** Resolve the seam's face for a zone: biome row → default. Family-chain
 *  simple on purpose — tileset-level overrides can join as `'<biome>:<tileset>'`
 *  rows the day a single tileset earns its own face. */
export function extractionLookFor(biome: string | undefined): ExtractionLook {
  return (biome && EXTRACTION_LOOKS[biome]) || DEFAULT_EXTRACTION_LOOK;
}

/** Package seam: reskin (or newly face) a biome's seam at boot. Warns on
 *  re-register like the gate-look registry — last writer wins, loudly. */
export function registerExtractionLook(biome: string, look: ExtractionLook): void {
  if (EXTRACTION_LOOKS[biome]) {
    console.warn(`[extraction] look for biome '${biome}' re-registered`);
  }
  EXTRACTION_LOOKS[biome] = look;
}

/** Every node body id any look references (the def's validate() sweeps these
 *  against the live monster registry — a renamed body fails loud, at boot). */
export function extractionNodeIds(): string[] {
  const ids = new Set<string>([DEFAULT_EXTRACTION_LOOK.node]);
  for (const look of Object.values(EXTRACTION_LOOKS)) ids.add(look.node);
  return [...ids];
}

// The dwell FEEL of arming a seam (ring radius/width/tint + reach) — the same
// transit vocabulary every other dwell in the game speaks. Reach 'sight'
// (the default) so a seam behind a true wall never arms.
registerTransit({
  kind: 'extraction',
  dwell: 1.7,
  radius: 52,
  ring: { radius: 46, width: 3 },
});

// The well fixtures under the node body: pure ground (never block movement or
// shots — the BODY is the collision story; the well is the glow and the scar).
registerDoodadRule('marrow_well', { overlap: 'ground' });
registerDoodadRule('marrow_well_spent', { overlap: 'ground' });
