import { TILESETS } from '../data/tilesets';
import { FACTIONS, MONSTERS } from '../data/monsters';
import { presenceTable } from '../engine/presence';
import type { ZoneDef } from '../data/zones';
import type { MassSpec } from './contracts';
import type { MassProgressionSpec, MassPopulation } from './progression';
import { freezeData } from './random';
import { nativeMassSite, type MassSiteSpec } from './sites';

export const MASS_ZONE = 'worldmass_expedition';
export interface MassContent extends MassPopulation {
  id: string; source: string; count: number;
  /** Omitted = authored fixed population. Rows snapshot the native level envelopes. */
  levels?: MassPopulation[];
  levelOffset?: number;
  site?: MassSiteSpec;
}
export interface MassAdventure {
  progression?: MassProgressionSpec;
  settlement?: import('./settlement').MassSettlementSpec;
  terrain: MassSpec;
  theme: ZoneDef['theme'];
  content: MassContent[];
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
    id: 'hollow-wake-country', version: 4, addressSpan: 960, terrainCell: 30,
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
      { id: 'danger', base: 0, layers: [{ id: 'country', period: 7000, amplitude: 1 }] },
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
    places: [...families.map(f => ({ id: f.id + '-habitat', version: 1, content: f.id,
      period: 1100, chance: .7, radius: 180, jitter: .7, priority: 1,
      when: [{ field: 'elevation', min: -.1 }, { field: f.field, min: f.min, max: f.max }] })),
      { id: 'wayside-camp', version: 1, content: 'wayside-camp', period: 1600, chance: .65,
        radius: 180, jitter: .65, priority: 3, when: [{ field: 'elevation', min: 0 }],
        surface: { region: 'ground', color: '#45412c' } },
      { id: 'pillaged-ruin', version: 1, content: 'pillaged-ruin', period: 2700, chance: .65,
        radius: 300, jitter: .6, priority: 4, when: [{ field: 'elevation', min: .05 }],
        surface: { region: 'ground', color: '#42433a' } },
    ],
  };
  const progression: MassProgressionSpec = {
    source: 'worldmass/expedition-progression', minLevel: 1, maxLevel: 24,
    stops: [{ distance: 0, level: 1 }, { distance: 1600, level: 1 },
      { distance: 5800, level: 4 }, { distance: 13200, level: 9 },
      { distance: 26800, level: 18 }, { distance: 40000, level: 24 }],
    variation: { field: 'danger', levels: 2, start: 1600, span: 4000 },
  };
  const populations = (table: Parameters<typeof presenceTable>[0]): MassPopulation[] =>
    Array.from({ length: progression.maxLevel }, (_, i) => ({
      level: i + 1, table: presenceTable(table, i + 1, id => MONSTERS[id]?.presence)
        .filter(r => MONSTERS[r.id] && !MONSTERS[r.id].habitat)
        .map(r => ({ id: r.id, weight: r.weight })),
    }));
  return freezeData({ terrain, progression, theme: JSON.parse(JSON.stringify(TILESETS.downs.theme)) as ZoneDef['theme'],
    content: [...families.map(f => ({ id: f.id, source: 'tilesets/' + f.id + '/packs', level: 1, count: 3,
      levels: populations(TILESETS[f.id].packs.table),
      table: presenceTable(TILESETS[f.id].packs.table, 1, id => MONSTERS[id]?.presence)
        .filter(r => MONSTERS[r.id] && !MONSTERS[r.id].habitat)
        .map(r => ({ id: r.id, weight: r.weight })) })),
      { id: 'wayside-camp', source: 'structures/wayside_camp', level: 1, count: 2,
        levels: populations(TILESETS.downs.packs.table),
        table: presenceTable(TILESETS.downs.packs.table, 1, id => MONSTERS[id]?.presence)
          .filter(r => MONSTERS[r.id] && !MONSTERS[r.id].habitat).map(r => ({ id: r.id, weight: r.weight })),
        site: nativeMassSite('wayside_camp', 'Wayside Camp', { x: 0, y: 66, holdSeconds: 4 }) },
      { id: 'pillaged-ruin', source: 'structures/pillaged_township', level: 1, count: 4,
        levels: populations(FACTIONS.undead.table), levelOffset: 1,
        table: presenceTable(FACTIONS.undead.table, 1, id => MONSTERS[id]?.presence)
          .filter(r => MONSTERS[r.id] && !MONSTERS[r.id].habitat).map(r => ({ id: r.id, weight: r.weight })),
        site: nativeMassSite('pillaged_township', 'Pillaged Ruin', { x: 60, y: 80, holdSeconds: 5 }) },
    ],
    settlement: { zone: 'lastlight', source: 'zones/lastlight', apron: 192, blend: 144 },
    startRadius: 288, populationRadius: 1300, maxPopulation: 96, pageRadius: 2, samplesPerTick: 512,
  });
}
