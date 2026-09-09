import { registerLocaleProgram, type DistrictChoice, type LocaleDistrict, type LocaleVariant } from '../world/locales';
import { registerExplorationLocalePool } from '../world/zoneVariety';
import { LOCALE_FRAGMENTS as F } from './localeFragments';
import type { LocaleFragment } from '../world/localeFragments';

const natural = (builder: string, weight = 1, params?: Record<string, number>, region?: string): DistrictChoice => ({ id: builder, builder, weight, params, region });
const authored = (fragment: LocaleFragment): DistrictChoice => ({ id: fragment.id, builder: 'fragment', weight: 2, fragment, turns: [0, 1, 2, 3], mirror: true });

/** The route grammar and district vocabulary vary independently. */
function variants(nature: DistrictChoice[], ruins: DistrictChoice[], dress: 'tree' | 'rock' | 'palm'): LocaleVariant[] {
  const district = (id: string, at: [number, number], size: [number, number], choices: DistrictChoice[], cave = false): LocaleDistrict => ({
    id, at, size, builder: 'open', choices, jitter: 0.012, cave,
    dress: [{ kind: dress, count: [7, 15], radius: [20, 36] }],
  });
  return [
    { id: 'braided_journey', weight: 3, entrance: 'arrival', goal: 'heart', portalMode: 'nearest',
      districts: [district('arrival', [0.20, 0.74], [0.28, 0.28], nature),
        district('crossing', [0.49, 0.50], [0.32, 0.30], ruins),
        district('heart', [0.78, 0.23], [0.28, 0.28], ruins),
        district('spur', [0.21, 0.23], [0.28, 0.28], nature, true),
        district('flank', [0.78, 0.75], [0.28, 0.28], nature)],
      links: [{ from: 'arrival', to: 'crossing', role: 'main', width: 180 },
        { from: 'crossing', to: 'heart', role: 'main', width: 150 },
        { from: 'arrival', to: 'spur', role: 'discovery', width: 110 },
        { from: 'spur', to: 'heart', role: 'flank', width: 120, via: [[0.49, 0.16]] },
        { from: 'arrival', to: 'flank', role: 'flank', width: 130, via: [[0.50, 0.84]] },
        { from: 'flank', to: 'heart', role: 'flank', width: 120, chance: 0.65 }] },
    { id: 'hub_and_wings', weight: 2, entrance: 'arrival', goal: 'heart', portalMode: 'nearest',
      districts: [district('arrival', [0.20, 0.50], [0.28, 0.32], nature),
        district('crossing', [0.50, 0.50], [0.28, 0.30], ruins),
        district('heart', [0.80, 0.50], [0.26, 0.32], ruins),
        district('spur', [0.50, 0.20], [0.32, 0.26], nature, true),
        district('flank', [0.50, 0.80], [0.32, 0.26], nature)],
      links: [{ from: 'arrival', to: 'crossing', role: 'main', width: 190 },
        { from: 'crossing', to: 'heart', role: 'main', width: 170 },
        { from: 'crossing', to: 'spur', role: 'discovery', width: 110 },
        { from: 'crossing', to: 'flank', role: 'discovery', width: 110 },
        { from: 'spur', to: 'heart', role: 'flank', width: 100, chance: 0.6, via: [[0.80, 0.20]] }] },
    { id: 'broken_ring', weight: 2, entrance: 'arrival', goal: 'heart', portalMode: 'nearest',
      districts: [district('arrival', [0.20, 0.74], [0.28, 0.28], nature),
        district('ascent', [0.20, 0.26], [0.28, 0.28], nature),
        district('crossing', [0.50, 0.20], [0.26, 0.26], ruins),
        district('heart', [0.80, 0.26], [0.26, 0.28], ruins),
        district('spur', [0.80, 0.74], [0.26, 0.28], nature, true),
        district('flank', [0.50, 0.80], [0.26, 0.26], nature)],
      links: [{ from: 'arrival', to: 'ascent', role: 'main', width: 160 },
        { from: 'ascent', to: 'crossing', role: 'main', width: 130 },
        { from: 'crossing', to: 'heart', role: 'main', width: 150 },
        { from: 'heart', to: 'spur', role: 'discovery', width: 110 },
        { from: 'spur', to: 'flank', role: 'discovery', width: 110 },
        { from: 'flank', to: 'arrival', role: 'flank', width: 120, chance: 0.7 }] },
  ];
}

for (const row of [
  { id: 'woodland_paths', label: 'Woodland paths', dress: 'tree' as const,
    nature: [natural('open', 3, { lobes: 10 }), natural('cavern'), natural('terraces')],
    ruins: [authored(F.gatehouse), authored(F.sanctuary), natural('open')] },
  { id: 'ruin_quarters', label: 'Lost quarters', dress: 'rock' as const,
    nature: [natural('court', 2), natural('open'), natural('terraces')],
    ruins: [authored(F.gatehouse), authored(F.cistern), authored(F.sanctuary)] },
  { id: 'terraced_wilds', label: 'Terraced wilds', dress: 'rock' as const,
    nature: [natural('terraces', 3), natural('arches'), natural('cavern')],
    ruins: [authored(F.sanctuary), authored(F.gallery), natural('court')] },
  { id: 'oasis_chain', label: 'Oasis paths', dress: 'palm' as const,
    nature: [natural('basin', 2, { bank: 0.24, island: 0.20 }, 'water'), natural('open'), natural('arches')],
    ruins: [authored(F.cistern), authored(F.gatehouse), natural('court')] },
  { id: 'marsh_causeways', label: 'Marsh causeways', dress: 'tree' as const,
    nature: [natural('basin', 3, { bank: 0.20, island: 0.28 }, 'water'), natural('open')],
    ruins: [authored(F.cistern), authored(F.sanctuary), natural('terraces')] },
  { id: 'excavation_routes', label: 'Abandoned excavations', dress: 'rock' as const,
    nature: [natural('cavern', 3, { chambers: 8 }), natural('arches'), natural('terraces')],
    ruins: [authored(F.gallery), authored(F.gatehouse), natural('court')] },
]) registerLocaleProgram({ id: row.id, version: 1, label: row.label, size: { w: 3400, h: 2900 },
  sizeScale: [0.9, 1.25], underways: true, variants: variants(row.nature, row.ruins, row.dress) });

// Existing biome generators keep 60% of eligible rolls. Pinned landscapes,
// courses, atlas destinations and directed arenas never enter these pools.
for (const row of [
  { id: 'green_country', biomes: ['field', 'forest', 'grove', 'gloamwood', 'jungle', 'downs', 'farmland'], programs: ['woodland_paths', 'ruin_quarters'] },
  { id: 'old_stone', biomes: ['ruin', 'ossuary', 'manor', 'sepulcher', 'metropolis'], programs: ['ruin_quarters', 'excavation_routes'] },
  { id: 'high_country', biomes: ['highland', 'butteland', 'tundra', 'taiga', 'karst'], programs: ['terraced_wilds', 'excavation_routes'] },
  { id: 'dry_country', biomes: ['desert', 'steppes'], programs: ['oasis_chain', 'terraced_wilds'] },
  { id: 'wet_country', biomes: ['marsh', 'scald'], programs: ['marsh_causeways', 'ruin_quarters'] },
]) registerExplorationLocalePool({ id: row.id, biomes: row.biomes, fallbackWeight: 6,
  locales: row.programs.map(program => ({ program, weight: 2 })) });
