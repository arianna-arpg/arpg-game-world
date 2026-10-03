import { TILESETS } from '../data/tilesets';
import { FACTIONS, MONSTERS } from '../data/monsters';
import { presenceTable } from '../engine/presence';
import type { ZoneDef } from '../data/zones';
import type { MassSpec } from './contracts';
import type { MassProgressionSpec, MassPopulation } from './progression';
import { freezeData } from './random';
import { frontierLandmarks } from './landmarks';
import { openingPopulation, reserveMassGuardians } from './population';
import { STARTER_SUPPORTS } from '../meta/account';
import { nativeMassSite, type MassSiteSpec } from './sites';
import { MASS_BIOME_FAMILIES, MASS_CLIMATE_ECOLOGY } from './biomes';
import { nativeMassEncounters } from './encounters';
import { countryFieldSites } from './fieldSites';

export const MASS_ZONE = 'worldmass_expedition';
export interface MassContent extends MassPopulation {
  id: string; source: string; count: number;
  /** Omitted = authored fixed population. Rows snapshot the native level envelopes. */
  levels?: MassPopulation[];
  levelOffset?: number;
  site?: MassSiteSpec;
  /** Optional native coordinated cohort; no separate attack or reward pipeline. */
  magicPack?: { source: string; mechanic: string };
}
export interface MassAdventure {
  /** Optional bounded residency for native fields, including repeated places. */
  fieldResidency?: import('./fields').MassFieldResidency;
  /** Optional namespace for replayable native factory variants. */
  nativeBirthSource?: string;
  /** Native walk-home fallback; omitted descriptors retain unrestricted populations. */
  territory?: import('./territory').MassTerritory;
  rewards?: import('./rewards').MassRewardSpec;
  journey?: import('./journey').MassJourneySpec;
  ecology?: import('./ecology').MassEcologySpec;
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
  const families = MASS_BIOME_FAMILIES, fields = countryFieldSites();
  const terrain: MassSpec = {
    id: 'hollow-wake-country', version: 7, addressSpan: 960, terrainCell: 30,
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
      { id: 'temperature', base: .08, layers: [
        { id: 'country', period: 12800, amplitude: .75 },
        { id: 'local', period: 2100, amplitude: .18 },
      ] },
      { id: 'rock', base: 0, layers: [{ id: 'outcrops', period: 540, amplitude: 1 }] },
      { id: 'danger', base: 0, layers: [{ id: 'country', period: 7000, amplitude: 1 }] },
    ],
    surfaces: [
      { id: 'lake', source: 'regions/water', priority: 100, when: [{ field: 'elevation', max: -.25 }], region: 'water', color: '#223c45', biome: 'downs' },
      { id: 'shore', source: 'regions/sand', priority: 90, when: [{ field: 'elevation', max: -.16 }], region: 'sand', color: '#595340', biome: 'downs' },
      { id: 'outcrop', source: 'regions/wall', priority: 80, when: [{ field: 'rock', min: .65 }, { field: 'elevation', min: .2 }], region: 'wall', color: '#56594f', biome: 'highland' },
      {id:'frozen-ground',source:'regions/ice',priority:25,
        when:[{field:'temperature',max:-.35},{field:'rock',min:.20}],region:'ice',color:'#82999f',biome:'tundra'},
      {id:'wetland-pools',source:'regions/swamp',priority:25,
        when:[{field:'temperature',min:-.35},{field:'moisture',min:.35},{field:'elevation',max:.22},{field:'rock',max:-.18}],
        region:'swamp',color:'#30483d',biome:'marsh'},
      ...families.map(f => ({ id: f.id, source: 'tilesets/' + f.id, priority: 10,
        when: f.when, region: f.region,
        color: f.color ?? TILESETS[f.id].theme.ground?.palette?.[2] ?? TILESETS[f.id].theme.floor,
        biome: TILESETS[f.id].biome ?? f.id })),
      { id: 'fallback', source: 'tilesets/downs', priority: 0, when: [], region: 'ground', color: '#31391c', biome: 'downs' },
    ],
    places: [...fields.map(f=>f.recipe), ...families.map(f => ({ id: f.id + '-habitat', version: 1, content: f.id,
      period: 1100, chance: .7, radius: 180, jitter: .7, priority: 1,
      when: [{ field: 'elevation', min: -.1 }, ...f.when] })),
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
    Array.from({ length: progression.maxLevel }, (_, i) => openingPopulation(i + 1,
      presenceTable(table, i + 1, id => MONSTERS[id]?.presence)
        .filter(r => MONSTERS[r.id] && !MONSTERS[r.id].habitat)
        .map(r => ({ id: r.id, weight: r.weight }))));
  return freezeData({ terrain, progression, nativeBirthSource: 'worldmass/native-birth-v1', theme: JSON.parse(JSON.stringify(TILESETS.downs.theme)) as ZoneDef['theme'],
    territory: { source: 'worldmass/encounter-territory', radius: 620 },
    fieldResidency: { source: 'worldmass/field-residency', retainRadius: 2048, maxResident: 32 },
    content: [...fields.map(field=>{
      const levels=populations(field.roster==='undead'?FACTIONS.undead.table:TILESETS[field.roster].packs.table)
        .map(row=>reserveMassGuardians(row,field.count));
      return {...levels[0],id:field.id,source:field.site.source,count:field.count,levels,site:field.site};
    }), ...families.map(f => ({ id: f.id, source: 'tilesets/' + f.id + '/packs', level: 1, count: 3,
      levels: populations(TILESETS[f.id].packs.table).map(row=>{
        const encounters=nativeMassEncounters(f.id,TILESETS[f.id].biome??f.id,row.level);
        return {...row,...(encounters?{encounters}:{})};
      }),
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
      ...frontierLandmarks().map(landmark => {
        if(landmark.population)return {...landmark.population,id:landmark.id,source:landmark.site.source,
          count:landmark.count,site:landmark.site};
        const levels=populations(landmark.undead ? FACTIONS.undead.table : TILESETS.downs.packs.table)
          .map(row=>landmark.site.completion ? reserveMassGuardians(row,landmark.count) : row);
        return { ...levels[0], id: landmark.id, source: landmark.site.source,
          count: landmark.count, levelOffset: landmark.undead ? 1 : 0, levels,
          site: landmark.site, ...(landmark.magicPack ? { magicPack: landmark.magicPack } : {}) };
      }),
    ],
    rewards: { source: 'worldmass/first-cache-support-v2', supports: [...STARTER_SUPPORTS],
      authoredSupports: ['splash', 'battering_ram'], level: 1, maxRewards: 1 },
    journey: { source: 'worldmass/frontier-circuit', width: 120, color: '#62573e', clearingColor: '#454331',
      stops: [
        {id:'west-caravan',from:'west-camp',trail:'circuit',at:.48,offset:-460,radius:310,content:'caravan-wreck'},
        {id:'east-shrine',from:'east-camp',trail:'circuit',at:.48,offset:-460,radius:310,content:'windworn-shrine'},
      ],
      extensions: [{ id: 'north-stoneward', from: 'north-ruin', content: 'stoneward',
        offset: {x: -400, y: -1500}, radius: 390, jitter: .08 }],
      destinations: [
        { id: 'west-camp', content: 'cinderwatch', edge: 'west', distance: 1050, radius: 310, jitter: .12 },
        { id: 'north-ruin', content: 'broken-gate', edge: 'north', distance: 1550, radius: 330, jitter: .16 },
        { id: 'east-camp', content: 'memorial-grove', edge: 'east', distance: 1350, radius: 330, jitter: .16 },
        { id: 'south-ruin', content: 'fallen-court', edge: 'south', distance: 1850, radius: 330, jitter: .12 },
      ] },
    ecology: { source: 'worldmass/country-scenery', spacing: 192, rules: [
      ...MASS_CLIMATE_ECOLOGY,
      { id: 'downs', biomes: ['downs'], chance: .62, cluster: { count: [2, 4], spread: 46 }, pieces: [
        { kind: 'tree', weight: 4, radius: [28, 48] }, { kind: 'rock', weight: 2, radius: [14, 24] },
        { kind: 'grass', weight: 4, radius: [24, 44] }, { kind: 'berry_bush', weight: 1, radius: [24, 36] },
        { kind: 'flowers', weight: 2, radius: [18, 30] }, { kind: 'brush', weight: 2, radius: [24, 40] },
      ] },
      { id: 'forest', biomes: ['forest'], chance: .88, cluster: { count: [3, 5], spread: 46 }, pieces: [
        { kind: 'forest_oak', weight: 5, radius: [44, 72] }, { kind: 'conifer', weight: 2, radius: [34, 55] },
        { kind: 'fern', weight: 2, radius: [18, 30] }, { kind: 'rock', weight: 1, radius: [16, 26] },
      ] },
      { id: 'desert', biomes: ['desert'], chance: .62, cluster: { count: [2, 4], spread: 46 }, pieces: [
        { kind: 'dead_tree', weight: 2, radius: [34, 54] }, { kind: 'rock', weight: 3, radius: [22, 38] },
        { kind: 'cactus', weight: 3, radius: [22, 40] }, { kind: 'brush', weight: 2, radius: [22, 38] },
      ] },
    ] },
    settlement: { zone: 'lastlight', source: 'zones/lastlight', apron: 192, blend: 144,
      cartography: { source: 'zones/lastlight/public-signs', publicSigns: true },
      doorPress: { source: 'worldmass/settlement-doors', alignment: .65, reach: 4 } },
    startRadius: 288, populationRadius: 1300, maxPopulation: 96, pageRadius: 2, samplesPerTick: 512,
  });
}
