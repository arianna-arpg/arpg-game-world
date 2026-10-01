import type { Doodad, DoodadKind } from '../engine/levelgen';
import { nativeMassSite, type MassSiteSpec } from './sites';

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
  const compose = (id: string, native: string, name: string, cache: MassSiteSpec['cache'],
    undead: boolean, count: number, additions: Doodad[], mechanic?: string): Landmark => {
    const site = nativeMassSite(native, name, cache);
    site.source += '+worldmass/landmarks/' + id;
    site.doodads.push(...additions);
    return { id, undead, count, site, ...(mechanic ? { magicPack: { source: 'magicPacks/'+mechanic, mechanic } } : {}) };
  };
  return [
    compose('cinderwatch', 'wayside_camp', 'Cinderwatch Camp', { x: 0, y: 66, holdSeconds: 4 }, false, 2, [
      prop('conifer', -165, -100, 78), prop('conifer', -175, 95, 65),
      prop('broken_cart', 155, -60, 42, .3), prop('brazier', 140, 70, 23),
      prop('log', -100, 125, 24, -.4), prop('grass', -165, 10, 45),
    ]),
    compose('broken-gate', 'fortress_gate', 'The Broken Gate', { x: 0, y: 40, holdSeconds: 5 }, true, 4, [
      prop('standing_stone', -100, -165, 36), prop('standing_stone', 100, -165, 36),
      prop('brazier', -85, 95, 24), prop('brazier', 85, 95, 24),
      prop('bone_pile', -95, 35, 24), prop('bone_pile', 95, 15, 21),
    ], 'footfall'),
    compose('memorial-grove', 'wayside_camp', 'Memorial Grove', { x: 0, y: 66, holdSeconds: 4 }, false, 3, [
      prop('weathered_statue', 0, -135, 44), prop('forest_oak', -175, -20, 78),
      prop('forest_oak', 175, -20, 78), prop('forest_oak', 130, 140, 64),
      prop('standing_stone', -100, 145, 26), prop('flowers', -120, -120, 42),
      prop('flowers', 110, -130, 44), prop('fern', -175, 85, 38),
    ]),
    compose('fallen-court', 'pillaged_township', 'The Fallen Court', { x: 60, y: 80, holdSeconds: 5 }, true, 4, [
      prop('weathered_statue', -75, -185, 44), prop('dead_tree', 185, 55, 65),
      prop('dead_tree', -175, 120, 60), prop('standing_stone', 135, 160, 30),
      prop('bone_pile', -95, 90, 30), prop('tombstone', 140, -35, 20),
      prop('brush', 10, -195, 38),
    ], 'bloodfont'),
  ];
}
