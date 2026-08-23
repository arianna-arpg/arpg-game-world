// ---------------------------------------------------------------------------
// THE RESOURCE HARVEST's themed rows — which node grows in which country.
//
// One row per node FAMILY: the doodad kind (its look is one data/
// doodadVisuals.ts entry — the reskin doctrine, existing painters in local
// tones), the countries that grow it (ZoneDef.biome and/or ZoneDef.tileset —
// the lair fabric's predicate idiom: a new country joins by adding one row,
// never a tileset edit), and the accent the prompt/ring/shatter speak in.
// A zone admits every matching row and weights among them per node.
//
// Countries with no row stand NO nodes — deliberate (eldritch pockets, the
// soulway, realm shelves stay bare until authored). Sanctuaries and
// spoils-sealed ground never boot nodes at all (World.bootHarvest gates).
//
// The engine half (config + derivations) lives in engine/harvest.ts; the
// stateful driver on World. ⚠ Row spread + weights UNBLESSED (2026-08-15).
// ---------------------------------------------------------------------------

import { registerDoodadRule } from '../engine/levelgen';

export interface HarvestNodeDef {
  id: string;
  /** The standing doodad kind (doodadVisuals entry + rule registered below). */
  kind: string;
  /** Countries that grow it — ZoneDef.biome matches (exact). */
  biomes: string[];
  /** Tileset provenance matches (ZoneDef.tileset) — either axis admits. */
  tilesets?: string[];
  /** Pick weight among the zone's admitted rows (default 1). */
  weight?: number;
  /** The family's voice: prompt chips, arming ring, shatter flash. */
  accent: string;
}

/** The shared shattered face every node breaks into (the husk stays — the
 *  crumble SHOWS and the dust remains; the quiet-reclass law). */
export const HARVEST_HUSK_KIND = 'harvest_husk';

export const HARVEST_NODES: HarvestNodeDef[] = [
  // Living amber, weeping from the green countries' old wood.
  {
    id: 'amberbole', kind: 'harvest_amberbole', accent: '#ffd062',
    biomes: ['grove', 'forest', 'jungle', 'taiga', 'garden'],
  },
  // Pale-glowing caps in the haunted and rotting damp.
  {
    id: 'gloomcap', kind: 'harvest_gloomcap', accent: '#a8e8d8',
    biomes: ['gloamwood', 'mycelia', 'marsh', 'caul'],
  },
  // Amethyst geodes in the underworld's and the deep karst's veins.
  {
    id: 'geode', kind: 'harvest_geode', accent: '#c8a8ff',
    biomes: ['crystal', 'cavern', 'karst', 'rift', 'durance'],
  },
  // Sun-baked stone that keeps the day's heat in the dry countries.
  {
    id: 'sunstone', kind: 'harvest_sunstone', accent: '#ffd890',
    biomes: ['desert', 'steppes', 'butteland', 'beach'],
  },
  // Ice-bound ore veins under the white countries.
  {
    id: 'frostvein', kind: 'harvest_frostvein', accent: '#bfe8ff',
    biomes: ['tundra', 'highland'],
  },
  // The dead countries' marrow-rich heaps.
  {
    id: 'marrowheap', kind: 'harvest_marrowheap', accent: '#ded2b8',
    biomes: ['grave', 'ossuary', 'sepulcher', 'ruin', 'flesh'],
  },
  // Ember-hearted blooms on the burning ground.
  {
    id: 'cinderbloom', kind: 'harvest_cinderbloom', accent: '#ff9a50',
    biomes: ['volcanic', 'flame', 'warfront'],
  },
  // Sea-fused glass along the wet margins.
  {
    id: 'tideglass', kind: 'harvest_tideglass', accent: '#a8e8e0',
    biomes: ['isle', 'littoral', 'deepsea', 'river'],
  },
  // The worked countries' heavy fruit and field-stones.
  {
    id: 'cropstone', kind: 'harvest_cropstone', accent: '#d8a848',
    biomes: ['field', 'downs', 'farmland', 'manor'],
  },
  // Luminous blooms on the high shelves.
  {
    id: 'aetherbloom', kind: 'harvest_aetherbloom', accent: '#fff0b8',
    biomes: [
      'aether', 'aether_sanctum', 'aether_spires', 'aether_drift',
      'aether_vesper', 'aether_bastion', 'aether_civitas',
    ],
  },
];

/** The rows a zone admits — biome OR tileset provenance, either axis. */
export function harvestRowsFor(biome?: string, tileset?: string): HarvestNodeDef[] {
  return HARVEST_NODES.filter(r =>
    (biome !== undefined && r.biomes.includes(biome))
    || (tileset !== undefined && !!r.tilesets?.includes(tileset)));
}

// The bodies: LOW standing objects — walk around, shoot over — placed with
// the fixture discipline's spacing; never on liquid or over a drop. The husk
// is loose rubble (nothing re-flows; the footprint stays walkable-around).
// THE DISSOLUTION GRAMMAR (engine/dissolve.ts): a spent node CRUMBLES as
// itself — the fragments slump into the husk, which IS the debris (no second
// pile; World.harvestSettle adopts the husk doodad as the break's debris) and
// fades eventually, minutes-grade (her word; DIAL — the per-biome husk face is
// the banked coda, closed by a per-row `dissolve.debris` whenever it lands).
for (const row of HARVEST_NODES) {
  registerDoodadRule(row.kind, {
    overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 260,
    forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
    dissolve: { motion: 'crumble', material: 'stone', debris: false, fade: { after: [150, 240], rate: 6 } },
  });
}
registerDoodadRule(HARVEST_HUSK_KIND, {
  overlap: 'solid', blocksMove: false, blocksShot: false, spacing: 260,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
