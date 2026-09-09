import { registerLocaleProgram, type LocaleDistrict, type LocaleVariant } from '../world/locales';

const d = (id: string, builder: string, at: [number, number], size: [number, number], extra: Partial<LocaleDistrict> = {}): LocaleDistrict => ({
  id, builder, at, size, jitter: 0.012,
  dress: [{ kind: builder === 'open' ? 'tree' : 'rock', count: [4, 9], radius: [20, 34] }], ...extra,
});
const register = (id: string, label: string, variants: LocaleVariant[], w = 2400, h = 2100) =>
  registerLocaleProgram({ id, label, version: 1, size: { w, h }, variants });

// Standing water: different basin footprints and route plans, composed by one builder.
for (const row of [
  { id: 'woodland_pond', label: 'Woodland pond', scale: 0.32, bank: 0.25, island: 0.08 },
  { id: 'lake_shores', label: 'Lake shores', scale: 0.68, bank: 0.12, island: 0.23 },
  { id: 'alpine_tarn', label: 'Alpine tarn', scale: 0.48, bank: 0.18, island: 0.12 },
]) register(row.id, row.label, [
  { id: 'island_path', weight: 1, entrance: 'shore', goal: 'basin',
    districts: [d('shore', 'open', [0.22, 0.22], [0.28, 0.28]),
      d('basin', 'basin', [0.54, 0.55], [row.scale, row.scale], { region: 'water', params: { bank: row.bank, island: row.island } }),
      d('grotto', 'cavern', [0.79, 0.22], [0.25, 0.26], { cave: true })],
    links: [{ from: 'shore', to: 'basin', role: 'main', width: 100 },
      { from: 'shore', to: 'grotto', role: 'discovery', width: 110, via: [[0.50, 0.14]] }] },
  { id: 'encircling_shores', weight: 1, entrance: 'west', goal: 'east',
    districts: [d('west', 'open', [0.20, 0.25], [0.28, 0.30]),
      d('basin', 'basin', [0.50, 0.54], [row.scale, row.scale], { region: 'water', params: { bank: row.bank, island: row.island } }),
      d('east', 'open', [0.80, 0.75], [0.26, 0.28])],
    links: [{ from: 'west', to: 'east', role: 'main', width: 110, via: [[0.82, 0.18]] },
      { from: 'west', to: 'east', role: 'flank', width: 100, via: [[0.18, 0.83]] },
      { from: 'west', to: 'basin', role: 'discovery', width: 90 }] },
]);

for (const row of [
  { id: 'spring_headwaters', label: 'Spring headwaters', width: [60, 80], bend: [0.06, 0.12], builder: 'cavern' },
  { id: 'river_ford', label: 'River ford', width: [90, 125], bend: [-0.05, 0.05], builder: 'open' },
  { id: 'river_gorge', label: 'River gorge', width: [140, 185], bend: [0.10, 0.18], builder: 'arches' },
  { id: 'river_islands', label: 'Broad river islands', width: [230, 280], bend: [0.12, 0.20], builder: 'basin' },
]) register(row.id, row.label, [{ id: 'banks_and_bypass', weight: 1, entrance: 'bank', goal: 'far_bank',
  river: { width: row.width as [number, number], bend: row.bend as [number, number], region: 'locale_river', crossing: 'locale_bridge' },
  districts: [d('bank', 'open', [0.23, 0.23], [0.32, 0.30]),
    d('far_bank', row.builder, [0.73, 0.73], [0.34, 0.34], { params: { bank: 0.20, island: 0.24 }, region: 'water' }),
    d('overlook', 'arches', [0.73, 0.23], [0.30, 0.30]),
    d('spring_cave', 'cavern', [0.23, 0.73], [0.28, 0.32], { cave: true })],
  links: [{ from: 'bank', to: 'far_bank', role: 'main', width: 120 },
    { from: 'bank', to: 'overlook', role: 'discovery', width: 100 },
    { from: 'bank', to: 'spring_cave', role: 'flank', width: 100 },
    { from: 'spring_cave', to: 'far_bank', role: 'flank', width: 100 }] }]);

register('green_valley', 'Sheltered valley', [{ id: 'branching_vale', weight: 1, entrance: 'mouth', goal: 'head',
  districts: [d('mouth', 'open', [0.23, 0.73], [0.32, 0.32]), d('meadow', 'open', [0.49, 0.49], [0.38, 0.30]),
    d('head', 'cavern', [0.74, 0.23], [0.30, 0.30], { cave: true }), d('shelf', 'arches', [0.76, 0.73], [0.28, 0.28])],
  links: [{ from: 'mouth', to: 'meadow', role: 'main', width: 200 }, { from: 'meadow', to: 'head', role: 'main', width: 140 },
    { from: 'meadow', to: 'shelf', role: 'discovery', width: 100 }] }]);

register('wind_hills', 'Wind-carved hills', [{ id: 'ridge_loop', weight: 1, entrance: 'foot', goal: 'crest',
  districts: [d('foot', 'open', [0.22, 0.72], [0.30, 0.32]), d('ridge', 'switchback', [0.49, 0.43], [0.38, 0.48], { params: { turns: 5, pathWidth: 130 } }),
    d('crest', 'open', [0.78, 0.24], [0.24, 0.26]), d('hollow', 'cavern', [0.76, 0.74], [0.28, 0.28], { cave: true })],
  links: [{ from: 'foot', to: 'ridge', role: 'main', width: 100 }, { from: 'ridge', to: 'crest', role: 'main', width: 100 },
    { from: 'foot', to: 'hollow', role: 'flank', width: 100 }, { from: 'hollow', to: 'crest', role: 'discovery', width: 100 }] }]);

register('dry_canyon', 'Dry canyon', [{ id: 'narrows_and_shelves', weight: 1, entrance: 'mouth', goal: 'head',
  districts: [d('mouth', 'open', [0.20, 0.73], [0.28, 0.30]), d('narrows', 'arches', [0.49, 0.50], [0.26, 0.62]),
    d('head', 'cavern', [0.78, 0.24], [0.26, 0.28], { cave: true }), d('shelf', 'switchback', [0.78, 0.72], [0.26, 0.30], { params: { turns: 3 } })],
  links: [{ from: 'mouth', to: 'narrows', role: 'main', width: 100 }, { from: 'narrows', to: 'head', role: 'main', width: 100 },
    { from: 'mouth', to: 'shelf', role: 'flank', width: 90, via: [[0.48, 0.85]] }, { from: 'shelf', to: 'head', role: 'flank', width: 90 }] }]);

register('volcano_caldera', 'Sleeping caldera', [{ id: 'rim_and_crater', weight: 1, entrance: 'foot', goal: 'crater',
  districts: [d('foot', 'open', [0.23, 0.74], [0.30, 0.30]),
    d('rim', 'switchback', [0.28, 0.31], [0.36, 0.38], { params: { turns: 5, pathWidth: 120 } }),
    d('crater', 'basin', [0.67, 0.38], [0.44, 0.44], { region: 'ground', params: { island: 0.22 }, dress: [{ kind: 'rock', count: [12, 20], radius: [24, 40] }] }),
    d('tube', 'cavern', [0.73, 0.76], [0.30, 0.28], { cave: true })],
  links: [{ from: 'foot', to: 'rim', role: 'main', width: 100 }, { from: 'rim', to: 'crater', role: 'main', width: 110 },
    { from: 'foot', to: 'tube', role: 'discovery', width: 100 }, { from: 'tube', to: 'crater', role: 'flank', width: 100 }] }]);
