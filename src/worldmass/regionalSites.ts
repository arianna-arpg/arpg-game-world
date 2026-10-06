import type { Doodad, DoodadKind } from '../engine/levelgen';
import type { MassPlaceRecipe } from './contracts';
import type { MassSiteSpec } from './sites';
import { MASS_CACHE_OPENING } from './sites';
import { OBJECTIVE_REWARD } from '../data/objectiveRewards';
import { MASS_BIOME_FAMILIES } from './biomes';

/** Regional ruins use the same population, clearance, cache, scenery ownership
 * and board census as existing country sites. All native props are snapshotted;
 * the route through the broken fabric has two body-wide open approaches. */
export function regionalCountrySites(): { id: string; roster: string; count: number; recipe: MassPlaceRecipe; site: MassSiteSpec }[] {
  const prop = (kind: DoodadKind, x: number, y: number, radius: number, rot = 0): Doodad => ({ kind, pos: { x, y }, radius, rot });
  const rows: { id: string; name: string; biome: string; ground: string; color: string; props: Doodad[] }[] = [
    { id: 'fallen-waystation', name: 'Fallen Waystation', biome: 'downs', ground: 'ground', color: '#49442e', props: [
      prop('broken_cart', -165, 30, 42), prop('firewood_pile', -200, -45, 22), prop('firewood_pile', -205, -110, 32),
      prop('standing_stone', -95, -210, 35), prop('standing_stone', 110, -215, 40),
      prop('rock', 210, -100, 48), prop('brush', 215, 20, 36), prop('rubble', 175, 110, 38),
    ] },
    { id: 'rootbound-court', name: 'Rootbound Court', biome: 'forest', ground: 'ground', color: '#344333', props: [
      prop('ancient_tree', 0, -245, 72), prop('forest_oak', -220, -85, 64), prop('forest_oak', 220, 100, 62),
      prop('weathered_statue', 175, -170, 36), prop('sunken_log', -165, 100, 38, .5),
      prop('fern', 165, 35, 35), prop('flowers', -110, -195, 30), prop('rubble', 90, -185, 30),
    ] },
    { id: 'reed-wake', name: 'Reed-Wake Graveyard', biome: 'marsh', ground: 'mud', color: '#37453a', props: [
      ...[-1, 1].flatMap(s => [prop('tombstone', s * 140, -155, 24), prop('tombstone', s * 210, -70, 22),
        prop('reeds', s * 250, 50, 42), prop('peat_mound', s * 180, 125, 32)]),
      prop('dead_tree', 0, -255, 50), prop('sunken_log', -220, 70, 30, 1),
    ] },
    { id: 'sunken-caravan', name: 'Sunken Caravan', biome: 'desert', ground: 'sand', color: '#71614a', props: [
      prop('broken_cart', -190, -80, 48), prop('broken_cart', 170, 80, 44),
      prop('standing_stone', 20, -245, 55), prop('bone_pile', -90, -175, 28),
      prop('cactus', 235, -100, 42), prop('cactus', -220, 110, 40), prop('rock', 170, -205, 42),
      prop('firewood_pile', 230, 40, 22), prop('rubble', -130, 95, 33),
    ] },
    { id: 'rime-watch', name: 'Rime Watch', biome: 'tundra', ground: 'ground', color: '#637174', props: [
      ...[-1, 1].flatMap(s => [prop('standing_stone', s * 130, -200, 40), prop('rock', s * 225, -70, 44),
        prop('conifer', s * 235, 120, 60), prop('snowdrift', s * 160, 85, 40)]),
      prop('icicle_cluster', 10, -265, 30), prop('weathered_statue', 0, -160, 35),
    ] },
  ];
  return rows.map(row => ({ id: row.id, roster: row.biome, count: 3,
    recipe: { id: row.id, version: 1, content: row.id, period: 3100, chance: .55, radius: 360,
      jitter: .65, priority: 4, when: [{ field: 'elevation', min: -.1 }, ...MASS_BIOME_FAMILIES.find(f => f.id === row.biome)!.when],
      surface: { region: row.ground, color: row.color } },
    site: { name: row.name, source: 'worldmass/regional-sites/' + row.id, doodads: row.props, fixtures: [],
      completion: { source: 'objectives/clear', ...OBJECTIVE_REWARD },
      cache: { x: 0, y: 175, holdSeconds: 4, ...MASS_CACHE_OPENING } },
  }));
}
