import { registerLandmarkComplex } from '../world/landmarkComplexes';
import { registerMapFeature } from '../world/atlas';
import { registerZoneInfoSource } from '../world/zoneInfo';

const stone = { floor: '#282a29', grid: '#30332f', border: '#7a7a70', obstacle: '#55584e', obstacleEdge: '#9c9b8c' };
registerLandmarkComplex({ id: 'great_fortress', version: 1, label: 'Great fortress', entrance: 'approach',
  stages: [
    { id: 'approach', label: 'Outer approach', locale: 'stronghold_approach', offset: [0, 0], sky: 'open' },
    { id: 'bailey', label: 'Inner bailey', locale: 'stronghold_bailey', offset: [90, 0], theme: stone, sky: 'open' },
    { id: 'keep', label: 'The keep', locale: 'stronghold_halls', offset: [180, 0], theme: stone, sky: 'sheltered', levelDelta: 1 },
    { id: 'ward', label: 'Broken ward', locale: 'ruin_quarters', offset: [90, 90], theme: stone, sky: 'open' },
  ],
  links: [{ from: 'approach', to: 'bailey', fromAt: [0.77, 0.50], toAt: [0.20, 0.50] },
    { from: 'bailey', to: 'keep', fromAt: [0.79, 0.50], toAt: [0.20, 0.30] },
    { from: 'bailey', to: 'ward', fromAt: [0.50, 0.80] }, { from: 'ward', to: 'keep', toAt: [0.34, 0.74] }],
});
registerLandmarkComplex({ id: 'lost_city', version: 1, label: 'Lost city', entrance: 'verge',
  stages: [
    { id: 'verge', label: 'Overgrown verge', locale: 'woodland_paths', offset: [0, 0], sky: 'open' },
    { id: 'precinct', label: 'Fallen precinct', locale: 'ruin_quarters', offset: [85, 0], theme: stone },
    { id: 'sanctuary', label: 'Sunken sanctuary', locale: 'stronghold_halls', offset: [170, 0], theme: stone, sky: 'sheltered', levelDelta: 1 },
    { id: 'excavations', label: 'Buried quarter', locale: 'excavation_routes', offset: [85, 90], theme: stone },
  ], links: [{ from: 'verge', to: 'precinct' }, { from: 'precinct', to: 'sanctuary' },
    { from: 'precinct', to: 'excavations' }, { from: 'excavations', to: 'sanctuary' }],
});
registerLandmarkComplex({ id: 'hollow_highlands', version: 1, label: 'Hollow highlands', entrance: 'mouths',
  stages: [
    { id: 'mouths', label: 'Scree and cave mouths', locale: 'overland_cave_mouths', offset: [0, 0], sky: 'open' },
    { id: 'galleries', label: 'Crossing galleries', locale: 'overland_cave_galleries', offset: [80, -45], sky: 'open' },
    { id: 'chambers', label: 'Hollow ridge', locale: 'overland_cave_galleries', offset: [150, 25], sky: 'open', levelDelta: 1 },
  ], links: [{ from: 'mouths', to: 'galleries' }, { from: 'galleries', to: 'chambers' }, { from: 'chambers', to: 'mouths' }],
});

for (const row of [
  { id: 'great_fortress', label: 'great fortress', locale: 'stronghold_approach', salt: 0xf0212, span: 2200, min: 0.15, max: 0.70,
    glyph: 'ruin', icon: '♜', color: '#bcaf8d', words: ['Citadel', 'Fortress', 'Castle'], read: 'an outer approach leads through a bailey to a keep; a broken ward offers another way in' },
  { id: 'lost_city', label: 'vast ruins', locale: 'woodland_paths', salt: 0xc1712, span: 2050, min: 0.12, max: 0.80,
    glyph: 'ruin', icon: '⌘', color: '#a8ad89', words: ['Ruins', 'Lost City', 'Precinct'], read: 'wild ground gives way to fallen streets, a buried quarter, and an inner sanctuary' },
  { id: 'hollow_highlands', label: 'overland cavern system', locale: 'overland_cave_mouths', salt: 0xca7e2, span: 1800, min: 0.60, max: 1,
    glyph: 'summit', icon: '⛰', color: '#a1b2bd', words: ['Hollow Ridge', 'Echoing Heights', 'Stone Hollows'], read: 'high-country shelves conceal connected caverns; covered galleries cross beneath the surface paths' },
]) registerMapFeature({ id: row.id, label: row.label, glyph: row.glyph, icon: row.icon, color: row.color,
  find: { kind: 'strewn', span: row.span, chance: 0.42, salt: row.salt, jitter: 0.7, gates: [{ axis: 'elevation', min: row.min, max: row.max }] },
  reach: 220, size: 70, destination: { locale: row.locale, complex: row.id },
  names: { first: ['Grey', 'Forgotten', 'Windworn', 'Hollow', 'Old', 'Silent'], second: row.words }, read: row.read,
});

registerZoneInfoSource((world, zoneId) => {
  const z = world.zoneMap[zoneId], complex = z?.complex;
  if (!complex || z.veiled) return [];
  return [{ kind: 'condition', icon: '⌘', color: '#c9b996', label: complex.label,
    detail: complex.stageLabel, z: 20 }];
});
