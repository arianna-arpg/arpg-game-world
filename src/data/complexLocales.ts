import { registerLocaleProgram, type LocaleDistrict, type LocaleVariant } from '../world/locales';
import { LOCALE_FRAGMENTS as F } from './localeFragments';
import { registerRegion } from '../world/regions';
import { registerUnderTier } from '../engine/tiers';

const d = (id: string, builder: string, at: [number, number], size: [number, number], extra: Partial<LocaleDistrict> = {}): LocaleDistrict => ({
  id, builder, at, size, jitter: 0.012,
  dress: [{ kind: builder === 'open' ? 'tree' : 'rock', count: [8, 14], radius: [22, 34] }], ...extra,
});
const gate = (id: string, at: [number, number], size: [number, number], fragment = F.gatehouse) =>
  d(id, 'fragment', at, size, { fragment });
const register = (id: string, label: string, variants: LocaleVariant[]) => registerLocaleProgram({
  id, label, version: 1, size: { w: 3300, h: 2850 }, sizeScale: [0.95, 1.15], variants,
});

register('stronghold_approach', 'Stronghold approaches', [{
  id: 'wilds_to_wall', weight: 1, entrance: 'wilds', goal: 'gate', portalMode: 'nearest',
  districts: [d('wilds', 'open', [0.22, 0.55], [0.30, 0.62]),
    d('rubble', 'open', [0.50, 0.50], [0.26, 0.34], { dress: [{ kind: 'rock', count: [10, 18], radius: [24, 36] }] }),
    gate('gate', [0.77, 0.50], [0.28, 0.40]),
    d('camp', 'court', [0.50, 0.20], [0.28, 0.24]), d('hollow', 'cavern', [0.50, 0.80], [0.28, 0.24], { cave: true })],
  links: [{ from: 'wilds', to: 'rubble', role: 'main', width: 190 }, { from: 'rubble', to: 'gate', role: 'main', width: 170 },
    { from: 'rubble', to: 'camp', role: 'discovery', width: 110 }, { from: 'rubble', to: 'hollow', role: 'discovery', width: 100 }],
}]);
register('stronghold_bailey', 'Inner bailey', [{
  id: 'courts_and_barracks', weight: 1, entrance: 'gate', goal: 'hall', portalMode: 'nearest',
  districts: [gate('gate', [0.20, 0.50], [0.28, 0.36]), d('court', 'court', [0.50, 0.50], [0.26, 0.32]),
    gate('hall', [0.79, 0.50], [0.26, 0.38], F.sanctuary),
    d('barracks', 'court', [0.50, 0.20], [0.34, 0.24]), gate('cistern', [0.50, 0.80], [0.32, 0.24], F.cistern)],
  links: [{ from: 'gate', to: 'court', role: 'main', width: 170 }, { from: 'court', to: 'hall', role: 'main', width: 160 },
    { from: 'court', to: 'barracks', role: 'discovery', width: 120 }, { from: 'court', to: 'cistern', role: 'discovery', width: 110 },
    { from: 'barracks', to: 'hall', role: 'flank', width: 110, via: [[0.79, 0.20]] }],
}]);
register('stronghold_halls', 'Stronghold halls', [{
  id: 'processional_halls', weight: 1, entrance: 'vestibule', goal: 'sanctum', portalMode: 'nearest',
  districts: [gate('vestibule', [0.20, 0.30], [0.28, 0.34]), gate('gallery', [0.50, 0.30], [0.28, 0.34], F.gallery),
    gate('sanctum', [0.79, 0.60], [0.26, 0.42], F.sanctuary), d('cloister', 'court', [0.34, 0.74], [0.46, 0.32])],
  links: [{ from: 'vestibule', to: 'gallery', role: 'main', width: 150 }, { from: 'gallery', to: 'sanctum', role: 'main', width: 150 },
    { from: 'vestibule', to: 'cloister', role: 'flank', width: 120 }, { from: 'cloister', to: 'sanctum', role: 'flank', width: 120 }],
}]);

// One registered lane overlays a second walkable story on ordinary districts.
// Rock keeps its surface wall while passages bore through it underneath.
registerRegion({ id: 'overland_cave_overlap', walkable: true, blocks: false, tier: 1, label: 'the covered gallery',
  tierVisual: { fill: '#22272c', edge: '#89949d' } });
registerRegion({ id: 'overland_cave_rock', walkable: false, blocks: true, blocksShot: true, blocksSight: true,
  tier: 1, label: 'the hollow escarpment', visual: { fill: '#474a46', alpha: 1 }, tierVisual: { fill: '#22272c', edge: '#89949d' } });
registerUnderTier('overland_caverns', { duct: 'overland_cave_overlap', well: 'tor_mouth', stairKind: 'culvert_stair',
  underWall: { wall: 'overland_cave_rock' }, wells: [5, 7], ductHalfW: 65, chamberRadius: [180, 280], preserveSurface: true,
  label: 'overland caverns', packSplit: 0.45,
  kit: [{ kind: 'rock', count: [8, 14], radius: [18, 28] }] });
for (const row of [{ id: 'overland_cave_mouths', label: 'Hollow escarpment', layer: false },
  { id: 'overland_cave_galleries', label: 'Overland galleries', layer: true }]) {
  register(row.id, row.label, [
    { id: 'shelves_and_hollows', weight: 1, entrance: 'scree', goal: 'gallery', portalMode: 'nearest',
      ...(row.layer ? { underTier: 'overland_caverns' } : {}),
      districts: [d('scree', 'open', [0.22, 0.26], [0.32, 0.34], { dress: [{ kind: 'rock', count: [10, 18], radius: [22, 36] }] }),
        d('shelf', 'terraces', [0.73, 0.25], [0.40, 0.32]), d('gallery', 'cavern', [0.72, 0.72], [0.40, 0.40], { params: { chambers: 8 } }),
        d('hollow', 'arches', [0.24, 0.73], [0.34, 0.34])],
      links: [{ from: 'scree', to: 'shelf', role: 'main', width: 160 }, { from: 'shelf', to: 'gallery', role: 'main', width: 140 },
        { from: 'scree', to: 'hollow', role: 'flank', width: 120 }, { from: 'hollow', to: 'gallery', role: 'flank', width: 130 }] },
    { id: 'braided_chambers', weight: 1, entrance: 'scree', goal: 'gallery', portalMode: 'nearest',
      ...(row.layer ? { underTier: 'overland_caverns' } : {}),
      districts: [d('scree', 'cavern', [0.22, 0.50], [0.32, 0.56]), d('shelf', 'arches', [0.50, 0.22], [0.28, 0.30]),
        d('gallery', 'cavern', [0.78, 0.50], [0.30, 0.64], { params: { chambers: 9 } }), d('hollow', 'cavern', [0.50, 0.78], [0.30, 0.30])],
      links: [{ from: 'scree', to: 'shelf', role: 'main', width: 160 }, { from: 'shelf', to: 'gallery', role: 'main', width: 140 },
        { from: 'scree', to: 'hollow', role: 'flank', width: 120 }, { from: 'hollow', to: 'gallery', role: 'flank', width: 130 }] },
  ]);
}
