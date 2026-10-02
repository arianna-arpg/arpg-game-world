import type { Doodad, DoodadKind } from '../engine/levelgen';
import { nativeMassSite, type MassSiteSpec } from './sites';
import { nativeMassAltar } from './fields';
import { OBJECTIVE_REWARD } from '../data/objectiveRewards';

interface Landmark {
  id: string;
  undead: boolean;
  count: number;
  site: MassSiteSpec;
  magicPack?: { source: string; mechanic: string };
}
/** Compositions of the native scenery vocabulary. The complete result is copied
 * into a new run's descriptor: edits never restage a continued expedition.
 * Open yards deliberately allow approaches from any quarter of the circuit. */
export function frontierLandmarks(): Landmark[] {
  const prop = (kind: DoodadKind, x: number, y: number, radius: number, rot = 0): Doodad =>
    ({ kind, pos: { x, y }, radius, rot });
  const compose = (id: string, native: string | null, name: string, cache: MassSiteSpec['cache'],
    undead: boolean, count: number, additions: Doodad[], mechanic?: string, altars?: MassSiteSpec['altars']): Landmark => {
    const site: MassSiteSpec = native ? nativeMassSite(native, name, cache)
      : { name, source: 'native/scenery', doodads: [], fixtures: [], ...(cache ? { cache } : {}) };
    site.source += '+worldmass/landmarks/' + id;
    site.completion = { source: 'objectives/clear', ...OBJECTIVE_REWARD };
    site.doodads.push(...additions);
    if (altars?.length) site.altars = altars;
    return { id, undead, count, site, ...(mechanic ? { magicPack: { source: 'magicPacks/'+mechanic, mechanic } } : {}) };
  };
  return [
    compose('cinderwatch', 'wayside_camp', 'Cinderwatch Camp', { x: 0, y: 66, holdSeconds: 4 }, false, 2, [
      prop('conifer', -165, -100, 78), prop('conifer', -175, 95, 65),
      prop('broken_cart', 155, -60, 42, .3), prop('brazier', 140, 70, 23),
      prop('log', -100, 125, 24, -.4), prop('grass', -165, 10, 45),
      prop('log', -70, 145, 25, -.4), prop('log', -40, 163, 24, -.4),
      prop('dead_tree', 155, -150, 58), prop('broken_cart', 175, -105, 30, 1.4),
      prop('rock', 20, -160, 28),
    ]),
    compose('broken-gate', 'fortress_gate', 'The Broken Gate', { x: 0, y: 40, holdSeconds: 5 }, true, 4, [
      prop('standing_stone', -100, -165, 36), prop('standing_stone', 100, -165, 36),
      prop('brazier', -85, 95, 24), prop('brazier', 85, 95, 24),
      prop('bone_pile', -95, 35, 24), prop('bone_pile', 95, 15, 21),
      prop('broken_cart', -105, -205, 34, .8), prop('bone_pile', -45, -190, 21),
      prop('weathered_statue', 130, -190, 42), prop('rock', 190, -110, 31),
    ], 'footfall'),
    compose('memorial-grove', null, 'Memorial Grove', { x: 0, y: 66, holdSeconds: 4 }, false, 3, [
      // A processional aisle and paired graves identify the place before its name.
      // The cache and centre remain reachable from all four road approaches.
      prop('weathered_statue', 0, -165, 48),
      ...[-1, 1].flatMap(side => [
        prop('forest_oak', side * 205, -85, 76), prop('forest_oak', side * 190, 140, 66),
        ...[-95, -35, 25, 140].flatMap(y => [
          prop('tombstone', side * 85, y, 19, side * .12),
          prop('flowers', side * 113, y + 13, 24),
        ]),
        prop('standing_stone', side * 52, 220, 25), prop('fern', side * 205, 25, 35),
      ]),
      prop('flowers', 0, -215, 32),
    ], undefined, [nativeMassAltar('mending_altar', 0, -95)]),
    compose('fallen-court', 'pillaged_township', 'The Fallen Court', { x: 60, y: 80, holdSeconds: 5 }, true, 4, [
      prop('weathered_statue', -75, -185, 44), prop('dead_tree', 185, 55, 65),
      prop('dead_tree', -175, 120, 60), prop('standing_stone', 135, 160, 30),
      prop('bone_pile', -95, 90, 30), prop('tombstone', 140, -35, 20),
      prop('brush', 10, -195, 38),
    ], 'bloodfont'),
  ];
}
