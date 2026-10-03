import type { Doodad, DoodadKind } from '../engine/levelgen';
import { nativeMassSite, MASS_CACHE_OPENING, type MassSiteSpec } from './sites';
import { nativeMassAltar } from './fields';
import { nativeMassShrine } from './shrines';
import { nativeMassPuzzle } from './puzzles';
import { OBJECTIVE_REWARD } from '../data/objectiveRewards';

interface Landmark {
  id: string;
  undead: boolean;
  count: number;
  site: MassSiteSpec;
  /** Optional fixed native encounter roster; otherwise use geographic presence. */
  population?: import('./progression').MassPopulation;
  magicPack?: { source: string; mechanic: string };
}
/** Compositions of the native scenery vocabulary. The complete result is copied
 * into a new run's descriptor: edits never restage a continued expedition.
 * Open yards deliberately allow approaches from any quarter of the circuit. */
export function frontierLandmarks(): Landmark[] {
  const prop = (kind: DoodadKind, x: number, y: number, radius: number, rot = 0): Doodad =>
    ({ kind, pos: { x, y }, radius, rot });
  const compose = (id: string, native: string | null, name: string, cache: MassSiteSpec['cache'],
    undead: boolean, count: number, additions: Doodad[], mechanic?: string, altars?: MassSiteSpec['altars'],
    fixtures?: MassSiteSpec['fixtures'], shrines?: MassSiteSpec['shrines'], puzzles?: MassSiteSpec['puzzles']): Landmark => {
    const site: MassSiteSpec = native ? nativeMassSite(native, name, cache)
      : { name, source: 'native/scenery', doodads: [], fixtures: [], ...(cache ? { cache } : {}) };
    site.source += '+worldmass/landmarks/' + id;
    site.completion = { source: 'objectives/clear', ...OBJECTIVE_REWARD };
    if(site.cache)site.cache={...site.cache,...MASS_CACHE_OPENING};
    site.doodads.push(...additions);
    if (altars?.length) site.altars = altars;
    if (shrines?.length) site.shrines = shrines;
    if (fixtures?.length) site.fixtures.push(...fixtures);
    if (puzzles?.length) { site.puzzles = puzzles; if (!count) delete site.completion; }
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
    ], undefined, undefined, undefined, [nativeMassShrine('swiftness', 75, 215)]),
    compose('broken-gate', 'fortress_gate', 'The Broken Gate', { x: 0, y: 40, holdSeconds: 5 }, true, 4, [
      prop('standing_stone', -100, -165, 36), prop('standing_stone', 100, -165, 36),
      prop('brazier', -85, 95, 24), prop('brazier', 85, 95, 24),
      prop('bone_pile', -95, 35, 24), prop('bone_pile', 95, 15, 21),
      prop('broken_cart', -105, -205, 34, .8), prop('bone_pile', -45, -190, 21),
      prop('weathered_statue', 130, -190, 42), prop('rock', 190, -110, 31),
    ], 'footfall', undefined, undefined, [nativeMassShrine('barrage', 160, 125)]),
    compose('memorial-grove', null, 'Memorial Grove', undefined, false, 0, [
      // A processional aisle and paired graves identify the place before its name.
      // The riddle court stays open from all four road approaches.
      prop('weathered_statue', 0, -165, 48),
      ...[-1, 1].flatMap(side => [
        prop('forest_oak', side * 205, -85, 76), prop('forest_oak', side * 190, 140, 66),
        ...[-95, -35, 25, 140].flatMap(y => [
          prop('tombstone', side * 145, y, 19, side * .12),
          prop('flowers', side * 165, y + 13, 24),
        ]),
        prop('standing_stone', side * 52, 220, 25), prop('fern', side * 205, 25, 35),
      ]),
      prop('flowers', 0, -215, 32),
    ], undefined, [nativeMassAltar('mending_altar', 0, -95)], undefined, undefined,
      [nativeMassPuzzle('charged_lattice', 0, 0, 'Strike toggles a crystal + neighbours. Kindle all nine.')]),
    compose('fallen-court', 'pillaged_township', 'The Fallen Court', { x: 60, y: 80, holdSeconds: 5 }, true, 4, [
      prop('weathered_statue', -75, -185, 44), prop('dead_tree', 185, 55, 65),
      prop('dead_tree', -175, 120, 60), prop('standing_stone', 135, 160, 30),
      prop('bone_pile', -95, 90, 30), prop('tombstone', 140, -35, 20),
      prop('brush', 10, -195, 38),
    ], 'bloodfont', [nativeMassAltar('storm_altar',0,-90)]),
    { ...compose('caravan-wreck', null, 'The Silent Caravan', {x:20,y:60,holdSeconds:4}, true, 1, [
      // Scattered wagons supply cover around two distinct native roles.
      prop('broken_cart',-105,-65,46,.25),prop('broken_cart',115,75,42,-.5),
      prop('broken_cart',80,-125,36,1.2),prop('log',-110,65,26,.7),
      prop('bone_pile',-25,-110,22),prop('bone_pile',125,-40,20),
      prop('dead_tree',-200,-70,65),prop('dead_tree',190,150,56),
      prop('rock',-160,155,32),prop('brush',130,-185,40),
      prop('brazier',-15,-10,20),
    ],undefined,undefined,[{monster:'skeleton_archer',x:70,y:-70,garrison:true},
      {monster:'crate',x:-65,y:20},{monster:'barrel',x:95,y:25}]),
      population:{level:2,table:[{id:'skeleton_warrior',weight:1}]} },
    { ...compose('windworn-shrine', null, 'The Windworn Shrine', {x:0,y:100,holdSeconds:4}, false, 2, [
      // Open axes leave room to choose whether the shared Haste field helps.
      ...[-1,1].flatMap(side=>[
        prop('standing_stone',side*185,-100,38),prop('standing_stone',side*185,100,34),
        prop('conifer',side*205,0,63),prop('flowers',side*125,160,30),
        prop('fern',side*135,-170,31),
      ]),
      prop('weathered_statue',0,-205,50),prop('bone_pile',95,-35,21),
    ],undefined,[nativeMassAltar('haste_altar',0,0)]),
      population:{level:2,table:[{id:'plains_wolf',weight:1}]} },
    { ...compose('stoneward', null, 'The Stoneward', { x: 0, y: -130, holdSeconds: 5 }, false, 1, [
      // Broken colonnades leave wide approaches; the living guardian owns
      // its native shield, turning, recovery and return-to-post behavior.
      ...[-1,1].flatMap(side=>[
        prop('standing_stone',side*165,-170,48),prop('standing_stone',side*195,-60,52),
        prop('standing_stone',side*195,70,48),prop('rock',side*160,180,35),
        prop('rubble',side*130,215,24),
      ]),
      prop('weathered_statue',0,-240,65),prop('brazier',-80,-210,22),prop('brazier',80,-210,22),
      prop('broken_cart',235,145,33,.6),prop('dead_tree',-260,90,47),
    ], undefined, [nativeMassAltar('wrath_altar',0,30)],
      [{monster:'karst_slinger',x:90,y:-65,garrison:true}], [nativeMassShrine('stoneskin',0,210)]),
      population:{level:4,table:[{id:'stone_sentinel',weight:1}]} },
  ];
}
