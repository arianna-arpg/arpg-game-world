import { TILESETS } from '../data/tilesets';
import { MONSTERS } from '../data/monsters';
import { presenceTable } from '../engine/presence';
import type { ZoneDef } from '../data/zones';
import type { MassSpec } from './contracts';
import { freezeData } from './random';

export const MASS_ZONE = 'worldmass_expedition';
export interface MassAdventure {
  terrain: MassSpec;
  theme: ZoneDef['theme'];
  content: { id: string; source: string; level: number; count: number; table: { id: string; weight: number }[] }[];
  startRadius: number;
  populationRadius: number;
  maxPopulation: number;
  pageRadius: number;
  samplesPerTick: number;
}
/** Snapshot existing content vocabulary, then own it for this run. Future
 * packages can supply another descriptor without replacing engine rules. */
export function massAdventure(): MassAdventure {
  const families = [
    { id: 'downs', field: 'moisture', min: -.3, max: .35 },
    { id: 'forest', field: 'moisture', min: .35, max: 2 },
    { id: 'desert', field: 'moisture', min: -2, max: -.3 },
  ];
  const terrain: MassSpec = {
    id: 'hollow-wake-country', version: 1, addressSpan: 768, terrainCell: 24,
    fields: [
      { id: 'elevation', base: .15, layers: [
        { id: 'continent', period: 18000, amplitude: .7 },
        { id: 'country', period: 2600, amplitude: .4 },
        { id: 'detail', period: 370, amplitude: .12 },
      ] },
      { id: 'moisture', base: 0, layers: [
        { id: 'country', period: 8200, amplitude: .8 },
        { id: 'local', period: 1700, amplitude: .25 },
      ] },
      { id: 'rock', base: 0, layers: [{ id: 'outcrops', period: 540, amplitude: 1 }] },
    ],
    surfaces: [
      { id: 'lake', source: 'regions/water', priority: 100, when: [{ field: 'elevation', max: -.25 }], region: 'water', color: '#223c45', biome: 'downs' },
      { id: 'shore', source: 'regions/sand', priority: 90, when: [{ field: 'elevation', max: -.16 }], region: 'sand', color: '#595340', biome: 'downs' },
      { id: 'outcrop', source: 'regions/wall', priority: 80, when: [{ field: 'rock', min: .65 }, { field: 'elevation', min: .2 }], region: 'wall', color: '#56594f', biome: 'highland' },
      ...families.map(f => ({ id: f.id, source: 'tilesets/' + f.id, priority: 10,
        when: [{ field: f.field, min: f.min, max: f.max }], region: f.id === 'desert' ? 'sand' : 'ground',
        color: TILESETS[f.id].theme.ground?.palette?.[2] ?? TILESETS[f.id].theme.floor,
        biome: TILESETS[f.id].biome ?? f.id })),
      { id: 'fallback', source: 'tilesets/downs', priority: 0, when: [], region: 'ground', color: '#31391c', biome: 'downs' },
    ],
    places: families.map(f => ({ id: f.id + '-habitat', version: 1, content: f.id,
      period: 1100, chance: .7, radius: 180, jitter: .7, priority: 1,
      when: [{ field: 'elevation', min: -.1 }, { field: f.field, min: f.min, max: f.max }] })),
  };
  return freezeData({ terrain, theme: JSON.parse(JSON.stringify(TILESETS.downs.theme)) as ZoneDef['theme'],
    content: families.map(f => ({ id: f.id, source: 'tilesets/' + f.id + '/packs', level: 1, count: 3,
      table: presenceTable(TILESETS[f.id].packs.table, 1, id => MONSTERS[id]?.presence)
        .filter(r => MONSTERS[r.id] && !MONSTERS[r.id].habitat)
        .map(r => ({ id: r.id, weight: r.weight })) })),
    startRadius: 288, populationRadius: 1300, maxPopulation: 96, pageRadius: 2, samplesPerTick: 512,
  });
}
