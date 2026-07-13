// ---------------------------------------------------------------------------
// VOYAGE ISLANDS — the sailable mapping system's content, as data.
//
// Each def is ONE KIND of island the open sea can host: its own tileset,
// population, objective (the dock gates on it — the same law every portal
// answers to, so a boss island holds you until the boss falls), optional
// extra structure/landmark rolls, and a beacon tint. The island FIELD
// (world/voyage.ts islandAtCell) decides WHERE they are; these defs decide
// WHAT they are. Adding an island kind = one entry here (registerVoyageIsland
// for packages) — no engine edit. Think PoE maps / Lost Ark islands / PoE2
// Expedition sites: one-off, open-ended adventure stops.
// ---------------------------------------------------------------------------

import type { ObjectiveSpec, PackSpec } from './zones';
import type { ClimateSpec } from '../world/climate';

export interface VoyageIslandDef {
  id: string;
  /** Relative frequency among island rolls (default 1). */
  weight?: number;
  /** CLIMATE AFFINITY over the axes at the island's own waters (world/
   *  climate.ts) — folded into the def pick as weight × affinity, the biome
   *  field's law: ember atolls rise in scorching seas, sirens keen in the
   *  frigid ones, and a voyage across climates meets different island kinds.
   *  Omitted = sails any sea. */
  climate?: Record<string, ClimateSpec>;
  /** Name pools — "<First> <Second>" seeded per island site. */
  nameFirst: string[];
  nameSecond: string[];
  /** The island zone's tileset (must exist — boot-validated). */
  tileset: string;
  /** What the island asks of you. boss/spawners/waves GATE the dock until met
   *  (canSail's law) — clear/escape/safe islands can be left at any time. */
  objective: ObjectiveSpec;
  /** ± on the radial danger price at the island's coordinate. */
  levelDelta?: number;
  /** Override the tileset's population (the packsOverride pattern). */
  packs?: PackSpec;
  /** Extra structure/landmark rolls stamped onto the island's zone. */
  structures?: { structure: string; chance: number; count?: [number, number] }[];
  landmarks?: { landmark: string; chance: number; count?: [number, number] }[];
  /** Beacon + map accent tint. */
  color: string;
  /** One-line flavor (the landing text + map hover). */
  blurb: string;
}

export const VOYAGE_ISLANDS: Record<string, VoyageIslandDef> = {};

/** Register an island kind (packages may add their own). */
export function registerVoyageIsland(def: VoyageIslandDef): void {
  if (VOYAGE_ISLANDS[def.id]) console.warn(`[voyage] re-registering island '${def.id}' — overriding`);
  VOYAGE_ISLANDS[def.id] = def;
}

// --- the starter atlas -------------------------------------------------------

registerVoyageIsland({
  id: 'beastfang_isle', weight: 3,
  climate: { temperature: 'mild', moisture: 'damp' },
  nameFirst: ['Beastfang', 'Wildmaw', 'Feral', 'Thornback', 'Snarling'],
  nameSecond: ['Isle', 'Refuge', 'Wilds', 'Holt'],
  tileset: 'jungle',
  objective: { kind: 'boss', id: 'wilds_behemoth', promote: { rarity: 'rare' } },
  color: '#6fae3f',
  blurb: 'An overgrown island ruled by an apex beast — fell it to earn the harbor.',
});

registerVoyageIsland({
  id: 'corsair_haven', weight: 3,
  nameFirst: ['Corsair', 'Smuggler', 'Cutthroat', 'Blackflag', 'Marooned'],
  nameSecond: ['Haven', 'Cove', 'Anchorage', 'Hideout'],
  tileset: 'beach',
  objective: { kind: 'boss', id: 'warband_chieftain', promote: { rarity: 'rare' } },
  packs: {
    count: [4, 6], size: [2, 4],
    table: [
      { id: 'bandit_cutthroat', weight: 3 },
      { id: 'bandit_bruiser', weight: 2 },
      { id: 'bandit_keeper', weight: 1 },
      { id: 'javelin_skirmisher', weight: 2 },
    ],
  },
  structures: [{ structure: 'watchtower', chance: 0.7 }],
  color: '#c9a86a',
  blurb: 'A pirate den dug into the dunes — break the crew and the chief who holds it.',
});

registerVoyageIsland({
  id: 'drowned_reliquary', weight: 2,
  nameFirst: ['Drowned', 'Sunken', 'Barnacled', 'Tide-Lost'],
  nameSecond: ['Reliquary', 'Crypt', 'Vault', 'Sepulcher'],
  tileset: 'crypt',
  objective: { kind: 'spawners', spawnerId: 'bone_altar', count: [2, 3] },
  landmarks: [{ landmark: 'sinkhole', chance: 0.5 }],
  color: '#6a5a8a',
  blurb: 'The dead were buried at sea here — smash the altars that keep raising them.',
});

registerVoyageIsland({
  id: 'ember_atoll', weight: 3,
  climate: { temperature: 'warm' },
  nameFirst: ['Ember', 'Cinder', 'Smoldering', 'Ashen'],
  nameSecond: ['Atoll', 'Caldera', 'Reef', 'Crown'],
  tileset: 'volcanic',
  objective: { kind: 'clear' },
  landmarks: [
    { landmark: 'caldera', chance: 0.8 },
    { landmark: 'lava_coast', chance: 0.5 },
  ],
  color: '#d84a1e',
  blurb: 'A volcanic crown steaming in the swell — pick it clean and sail on.',
});

registerVoyageIsland({
  id: 'sirens_expanse', weight: 3,
  climate: { temperature: 'cold' },
  nameFirst: ['Siren', 'Wailing', 'Keening', 'Stormcalled'],
  nameSecond: ['Expanse', 'Shoal', 'Strand', 'Shallows'],
  tileset: 'tundra',
  objective: { kind: 'waves', waves: 4 },
  levelDelta: 1,
  color: '#bcd0d8',
  blurb: 'Something in the mist calls the drowned ashore in waves — hold the beach.',
});

registerVoyageIsland({
  id: 'verdant_refuge', weight: 1,
  nameFirst: ['Verdant', 'Quiet', 'Blessed', 'Windless'],
  nameSecond: ['Refuge', 'Garden', 'Rest', 'Landing'],
  tileset: 'meadow',
  objective: { kind: 'safe' },
  color: '#8fd06f',
  blurb: 'A rare quiet shore — nothing hunts here. Catch your breath before the next crossing.',
});

registerVoyageIsland({
  id: 'leviathans_grave', weight: 1,
  climate: { wildness: { from: 0.35, fadeIn: 0.2 } },
  nameFirst: ['Leviathan', 'Abyssal', 'Depthless', 'Krakenfall'],
  nameSecond: ['Grave', 'Trench', 'Maw', 'Deep'],
  tileset: 'deepsea',
  objective: { kind: 'boss', id: 'deep_leviathan', promote: { rarity: 'crowned' } },
  levelDelta: 2,
  color: '#2f6aa8',
  blurb: 'The sea itself buries its dead here — and one of them is not done dying.',
});
