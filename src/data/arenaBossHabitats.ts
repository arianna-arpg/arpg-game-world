import { registerLair } from '../engine/lairs';
import { registerDoodadRule, registerLandmark } from '../engine/levelgen';
import { mintCave } from '../engine/worldgen';
import { registerSidezone } from './sidezones';

/** Optional regional challenges on the ordinary lair progression, independent
 * of World Boss event rolls. New fights add a row, never an engine branch. */
export const ARENA_BOSS_HABITATS = [
  { id: 'arena_boss_ossuary', boss: 'arena_boss_organ', name: 'The Ossuary Court',
    biomes: ['desert', 'karst'], level: 10, chance: 0.18, color: '#c5ac80',
    dress: 'bone_pile' },
  { id: 'arena_boss_kiln', boss: 'arena_boss_crucible', name: 'The Crucible Chamber',
    biomes: ['volcanic'], level: 16, chance: 0.22, color: '#ee945c',
    dress: 'rock' },
  { id: 'arena_boss_sump', boss: 'arena_boss_mireheart', name: 'The Heart Sump',
    biomes: ['marsh'], level: 13, chance: 0.2, color: '#a8bc69',
    dress: 'bone_pile' },
];

for (const row of ARENA_BOSS_HABITATS) {
  const mouth = `${row.id}_gate`;
  registerDoodadRule(mouth, { overlap: 'trigger', spacing: 60 });
  registerLandmark({
    id: `${row.id}_mouth`, builder: 'den_mouth', size: [200, 260],
    clearSite: true, poi: true, mustReach: true,
    params: { mouthKind: mouth, dress: [
      { kind: row.dress, count: [3, 5], radius: [12, 20] },
    ] },
  });
  registerSidezone({
    kind: mouth, dwell: 0.9, ledgerOnEnter: `${row.id}_entered`,
    mint: ({ parent, seed, id }) => {
      const def = mintCave(parent, seed, id, row.id, {
        name: row.name, objective: { kind: 'boss', id: row.boss, arenaBossRetry: 'restart' }, noDeeper: true,
      });
      def.fauna = [];
      def.special = true; // the shared arena policy excludes ambient packs and events
      return def;
    },
  });
  registerLair({
    id: row.id, landmark: `${row.id}_mouth`,
    seat: { biomes: row.biomes, place: 'both', strata: { to: 2, fadeOut: 2 },
      level: { from: row.level + 3, fadeIn: 3 }, chance: row.chance },
  });
}
