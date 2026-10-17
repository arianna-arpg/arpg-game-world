import { SHRINES } from '../data/shrines';
import type { Doodad, DoodadKind } from '../engine/levelgen';
import { countryActivitySites } from './activitySites';
import { nativeMassAltar } from './fields';
import type { MassContent } from './preset';
import type { RegionalDiscoverySpec } from './regionalDiscoveries';
import { nativeMassShrine } from './shrines';
import { validateMassSite, type MassSiteSpec } from './sites';

/** Compact native activities for terrain-owned sockets. These rows describe
 * local arrangements only: court selection, clear approaches and persistence
 * belong to their existing generation and native site owners. Native shrine,
 * field, riddle and cache rules remain the sole gameplay/reward executors. */
export function regionalDiscoveryContent(minLevel = 1, maxLevel = 24): { policy: RegionalDiscoverySpec; content: MassContent[] } {
  if (!Number.isSafeInteger(minLevel) || !Number.isSafeInteger(maxLevel) || minLevel < 1 || maxLevel > 100 || minLevel > maxLevel)
    throw Error('Invalid regional discovery level envelope');
  const content: MassContent[] = [], choices: RegionalDiscoverySpec['choices'][number][] = [];
  const prop = (kind: DoodadKind, x: number, y: number, radius: number, rot = 0): Doodad => ({ kind, pos: { x, y }, radius, rot });
  const add = (key: string, radius: number, weight: number, site: MassSiteSpec): void => {
    // Validate each payload against its actual compact footprint; the larger
    // country-site radius is never borrowed to conceal an overflowing child.
    validateMassSite(site, radius);
    const id = 'regional-discovery-' + key;
    content.push({ id, source: site.source, count: 0, level: minLevel, table: [{ id: 'plains_wolf', weight: 1 }],
      levels: Array.from({ length: maxLevel - minLevel + 1 }, (_, i) => ({ level: minLevel + i, table: [{ id: 'plains_wolf', weight: 1 }] })), site });
    choices.push({ content: id, radius, weight });
  };
  const cache = (key: string, name: string, radius: number, x: number, y: number, doodads: Doodad[]): void => {
    const nativeSources = [...new Set(doodads.map(d => 'doodads/' + d.kind)), 'sites/cache'];
    add(key, radius, 2, { name, source: nativeSources.join('+'), fixtures: [], doodads, cache: { x, y, holdSeconds: 4 } });
  };
  // Unequal broken arcs, offset remnants and open-sided clumps keep access
  // broad. None encloses its cache, so any quarter-turn keeps a clear approach.
  cache('cairn-cache', 'Cairn Cache', 170, 20, 24, [
    prop('standing_stone', -75, -60, 32), prop('rock', -42, -108, 20), prop('rock', 17, -110, 17),
  ]);
  cache('fallen-timber-cache', 'Fallen Timber Cache', 180, 35, 20, [
    prop('sunken_log', -70, -35, 27, -.4), prop('fern', -108, 30, 25), prop('fern', 65, -78, 23),
  ]);
  cache('broken-arcade-cache', 'Broken Arcade Cache', 190, 5, 35, [
    prop('rubble', -108, -25, 26), prop('standing_stone', -65, -105, 29), prop('weathered_statue', 85, -65, 33),
  ]);
  cache('abandoned-camp-cache', 'Abandoned Camp Cache', 190, 40, 15, [
    prop('campfire', -65, -70, 25), prop('rubble', -110, 20, 22), prop('sunken_log', 45, -110, 28, .7),
  ]);
  cache('old-root-cache', 'Old Root Cache', 230, 30, 20, [
    prop('ancient_tree', -110, -65, 50), prop('flowers', -80, 85, 24), prop('fern', 80, -90, 30),
  ]);
  cache('ossuary-cache', 'Ossuary Cache', 180, 25, 32, [
    prop('tombstone', -75, -65, 26, -.25), prop('bone_pile', 75, -80, 30), prop('rubble', -112, 20, 18),
  ]);
  cache('wayfarer-cache', 'Wayfarer Cache', 130, 22, 20, [
    prop('rock', -62, -43, 22), prop('flowers', 54, -57, 18),
  ]);
  cache('overgrown-statue-cache', 'Overgrown Statue Cache', 210, -20, 35, [
    prop('weathered_statue', 78, -102, 37), prop('fern', 115, 13, 28), prop('rubble', -83, -78, 22),
    prop('flowers', -120, 30, 20),
  ]);
  const shrineSettings: { x: number; y: number; radius: number; scenery: Doodad[] }[] = [
    { x: 20, y: 18, radius: 180, scenery: [prop('standing_stone', -80, -68, 30), prop('fern', 72, -82, 25)] },
    { x: -15, y: 20, radius: 200, scenery: [prop('brazier', 85, -85, 23), prop('bone_pile', -105, -60, 25), prop('rubble', 110, 30, 22)] },
    { x: 25, y: 15, radius: 210, scenery: [prop('rock', -100, -65, 43), prop('standing_stone', 82, -115, 30)] },
    { x: -20, y: 0, radius: 190, scenery: [prop('weathered_statue', 85, -72, 35), prop('rubble', -85, -90, 25), prop('flowers', 107, 35, 22)] },
    { x: 15, y: 25, radius: 210, scenery: [prop('sunken_log', -115, -55, 30, -.6), prop('fern', 87, -88, 31), prop('flowers', -100, 68, 25)] },
  ];
  SHRINES.forEach((shrine, i) => {
    const scene = shrineSettings[i % shrineSettings.length];
    add('shrine-' + shrine.id, scene.radius, 1, { name: shrine.name, source: 'shrines/' + shrine.id,
      fixtures: [], doodads: scene.scenery, shrines: [nativeMassShrine(shrine.id, scene.x, scene.y)] });
  });
  const altarSettings = [
    { id: 'haste_altar', x: 12, y: 10, scenery: [prop('standing_stone', -155, -95, 30), prop('rock', 165, -60, 24)] },
    { id: 'mending_altar', x: -10, y: 15, scenery: [prop('fern', -170, -75, 32), prop('flowers', 155, -110, 25), prop('sunken_log', 170, 70, 25, .8)] },
    { id: 'storm_altar', x: 5, y: -5, scenery: [prop('standing_stone', -155, -110, 28), prop('rubble', 185, -65, 25), prop('weathered_statue', 140, 110, 30)] },
    { id: 'still_altar', x: 0, y: 12, scenery: [prop('weathered_statue', -150, -100, 32), prop('rock', 175, -75, 28)] },
  ];
  for (const scene of altarSettings) {
    const altar = nativeMassAltar(scene.id, scene.x, scene.y);
    add('field-' + scene.id, 260, 1, { name: altar.def.name, source: altar.source, fixtures: [], doodads: scene.scenery, altars: [altar] });
  }
  // Preserve the exact native activity rules, instructions and puzzle-node
  // geometry. Only their optional framing scenery becomes a compact broken arc.
  for (const activity of countryActivitySites()) {
    if (!activity.site.puzzles?.length) continue;
    const puzzle = activity.site.puzzles[0], radius = puzzle.spec.kind === 'lattice' ? 270 : 250;
    add('puzzle-' + puzzle.id, radius, 2, { ...activity.site, doodads: [
      prop('weathered_statue', -175, -105, 25), prop('rubble', 180, -85, 23), prop('standing_stone', 185, 82, 24),
    ] });
  }
  return { policy: { source: 'worldmass/native-regional-discoveries-v1', version: 1, chance: .85,
    count: [1, 3], clearance: 90, separation: 120, choices }, content };
}
