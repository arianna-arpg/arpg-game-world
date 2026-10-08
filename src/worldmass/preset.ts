import { WATER_SURFACE } from '../data/waterSurface';
import { LASTLIGHT_DEFENSES } from '../data/settlementDefenses';
import { massLandformPolicy } from './landformSources';
import { massLandformDressing } from './landformDressing';
import { MASS_SNOW_DEFAULT } from './snow';
import { MASS_WEATHER_DEFAULT } from './weather';
import { MASS_HIERARCHY_DEFAULT } from './hierarchy';
import { nativeMassPyreSources, nativeMassHoldSources } from './objectives';
import { nativeMassProcessionSources } from './processionSources';
import { makeNativeCountrySpec, type NativeCountrySpec } from './nativeCountry';
import { countryActivitySites } from './activitySites';
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
import type { MassSiteSpec } from './sites';
import { countryOutposts } from './countryOutposts';
import { regionalCountrySites } from './regionalSites';
import { MASS_BIOME_FAMILIES, MASS_CLIMATE_ECOLOGY } from './biomes';
import { nativeMassEncounters } from './encounters';
import { countryFieldSites } from './fieldSites';
import { nativeMassGround, type MassGroundSpec } from './ground';
import { Q_FRONTIER_WATCH, Q_FRONTIER_STONEWARD } from '../quests/frontier';

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
  nativeCountry?: NativeCountrySpec;
  geography?: import('./geographicGameplay').MassGeographicSpec;
  bounties?: import('./bounties').MassBountySpec;
  /** Optional sight-admitted map memory; omitted descriptors keep page discovery. */
  survey?: import('./survey').MassSurveySpec;
  /** Optional saved native ground palettes; omitted descriptors keep their original face. */
  ground?: MassGroundSpec;
  /** Optional bounded residency for native fields, including repeated places. */
  fieldResidency?: import('./fields').MassFieldResidency;
  shrineResidency?: import('./fields').MassFieldResidency;
  puzzleResidency?: import('./fields').MassFieldResidency;
  dormancy?: import('./dormancy').MassDormancyPolicy;
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
  const families = MASS_BIOME_FAMILIES, fields = countryFieldSites(), regional = regionalCountrySites(), activities = countryActivitySites();
  const terrain: MassSpec = {
    id: 'hollow-wake-country', version: 8, addressSpan: 960, terrainCell: 30,
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
      { id: 'lake', source: 'regions/water', priority: 100, when: [{ field: 'elevation', max: -.25 }], region: 'water', color: WATER_SURFACE.deep, biome: 'downs' },
      { id: 'shore', source: 'regions/sand', priority: 90, when: [{ field: 'elevation', max: -.16 }], region: 'sand', color: '#595340', biome: 'downs' },
      { id: 'outcrop', source: 'regions/wall', priority: 80, when: [{ field: 'rock', min: .65 }, { field: 'elevation', min: .2 }], region: 'wall', color: '#56594f', biome: 'highland' },
      {id:'frozen-ground',source:'regions/ice',priority:25,
        when:[{field:'temperature',max:-.35},{field:'rock',min:.20}],region:'ice',color:'#82999f',biome:'tundra'},
      ...families.map(f => ({ id: f.id, source: 'tilesets/' + f.id, priority: 10,
        when: f.when, region: f.region,
        color: f.color ?? TILESETS[f.id].theme.ground?.palette?.[2] ?? TILESETS[f.id].theme.floor,
        biome: TILESETS[f.id].biome ?? f.id })),
      { id: 'fallback', source: 'tilesets/downs', priority: 0, when: [], region: 'ground', color: '#31391c', biome: 'downs' },
    ],
    landforms: massLandformPolicy(),
    patches: { source: 'worldmass/native-terrain-patches-v1', version: 1, spacing: 960, jitter: .12, bypass: 60,
      recipes: [
        { id: 'wetland-pockets', when: [], onSurfaces: ['marsh'], chance: .9, choices: [
          { id: 'mud-hollow', weight: 3, region: 'mud', color: '#4b4938', radius: [65, 100], scale: 1.3, wobble: .3, pieces: [2, 5] },
          { id: 'reed-pool', weight: 2, region: 'swamp', color: '#30483d', radius: [60, 95], scale: 1.3, wobble: .4, pieces: [2, 4] },
        ] },
        { id: 'woodland-hollows', when: [{ field: 'moisture', min: .45 }], onSurfaces: ['forest'], chance: .25, choices: [
          { id: 'mud-hollow', weight: 1, region: 'mud', color: '#454637', radius: [60, 85], scale: 1.3, wobble: .35, pieces: [1, 3] },
        ] },
      ],
    },
    places: [...activities.map(a=>a.recipe), ...regional.map(r => r.recipe), ...fields.map(f=>f.recipe), ...families.map(f => ({ id: f.id + '-habitat', version: 1, content: f.id,
      period: 1100, chance: .7, radius: 180, jitter: .7, priority: 1, landformHabitat: true as const,
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
  const nativeCountry=makeNativeCountrySpec(terrain.terrainCell);
  return freezeData({ terrain, progression, nativeBirthSource: 'worldmass/native-birth-v1', theme: JSON.parse(JSON.stringify(TILESETS.downs.theme)) as ZoneDef['theme'],
    nativeCountry,
    geography: {policy:MASS_HIERARCHY_DEFAULT,pyres:nativeMassPyreSources(nativeCountry).filter(p=>p.source==='data/tilesets'),holds:nativeMassHoldSources(nativeCountry).filter(p=>p.source==='data/tilesets'),processions:nativeMassProcessionSources(nativeCountry),maxObjectives:8,weather:MASS_WEATHER_DEFAULT,snow:MASS_SNOW_DEFAULT,storms:true},
    bounties: { source: 'worldmass/place-bounties-v1', maxCandidates: 256 },
    survey: {source:'worldmass/sighted-survey-v1',cell:120,radius:480},
    ground: nativeMassGround(families.map(f => ({ surface: f.id, source: 'tilesets/' + f.id, theme: TILESETS[f.id].theme }))),
    territory: { source: 'worldmass/encounter-territory', radius: 620 },
    fieldResidency: { source: 'worldmass/field-residency', retainRadius: 2048, maxResident: 32 },
    shrineResidency: { source: 'worldmass/shrine-residency', retainRadius: 2048, maxResident: 32 },
    puzzleResidency: { source: 'worldmass/puzzle-residency', retainRadius: 2048, maxResident: 16 },
    dormancy: { source: 'worldmass/native-dormancy-v1', wakeRadius: 1600, sleepRadius: 2400, quietSeconds: 12 },
    content: [...activities.map(a=>({id:a.id,source:a.site.source,level:1,count:0,table:[{id:'plains_wolf',weight:1}],site:a.site})), ...[...regional, ...fields].map(field=>{
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
      ...families.map(f => {
        const levels=populations(TILESETS[f.id].packs.table);
        return {...levels[0],id:'roadside-'+f.id,source:'tilesets/'+f.id+'/roadside-packs',count:2,levels};
      }),
      ...countryOutposts().map(outpost => {
        const levels=populations(outpost.roster==='undead'?FACTIONS.undead.table:TILESETS.downs.packs.table)
          .map(row=>reserveMassGuardians(row,outpost.count));
        return {...levels[0],id:outpost.id,source:outpost.site.source,count:outpost.count,levels,site:outpost.site,
          ...(outpost.levelOffset===undefined?{}:{levelOffset:outpost.levelOffset})};
      }),
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
    rewards: { source: 'worldmass/first-discovery-support-v3', earnFrom: ['cache','puzzle'], supports: [...STARTER_SUPPORTS],
      authoredSupports: ['splash', 'battering_ram'], level: 1, maxRewards: 1 },
    journey: { reservePopulation: true, source: 'worldmass/frontier-circuit', width: 120, color: '#62573e', clearingColor: '#454331',
      notices: [
        { destination: 'west-camp', note: 'Gnolls hold the western road; their bone-thrower borrows courage from the leader. A shrine and provisions remain at camp. Farther north along the circuit, a burned caravan shelters clustered dead and a bone mender.' },
        { destination: 'east-camp', note: 'Crystals wait among the graves of a quiet grove. Kindling the lattice is a riddle; farther along the circuit, a side path leads to a ring of fading coals. Past the grove, paired stones answer matching voices.' },
        { destination: 'north-ruin', note: 'Undead keep watch beneath the broken walls. Beyond the gate, the northern trail leads toward a stone guardian.' },
        { destination: 'south-ruin', note: 'Restless dead gather among ruined homes. A storm altar changes the ground on which you fight.' },
      ],
      roadside: { source: 'worldmass/roadside-v1', spacing: 900, chance: .7, radius: 100,
        townClearance: 600, siteClearance: 180, separation: 950, maxPlaces: 6,
        habitats: families.map(f=>({biome:TILESETS[f.id].biome??f.id,content:'roadside-'+f.id})) },
      stops: [
        {id:'west-caravan',from:'west-camp',trail:'circuit',at:.48,offset:-460,radius:310,content:'caravan-wreck'},
        {id:'east-shrine',from:'east-camp',trail:'circuit',at:.48,offset:-460,radius:310,content:'windworn-shrine'},
      ],
      extensions: [{ id: 'north-stoneward', from: 'north-ruin', content: 'stoneward',
        offset: {x: -400, y: -1500}, radius: 390, jitter: .08 },
        {id:'east-paired-stones',from:'east-camp',content:'paired-stones',
          offset:{x:1550,y:350},radius:350,jitter:.08}],
      destinations: [
        { id: 'west-camp', content: 'cinderwatch', edge: 'west', distance: 1050, radius: 310, jitter: .12 },
        { id: 'north-ruin', content: 'broken-gate', edge: 'north', distance: 1550, radius: 330, jitter: .16 },
        { id: 'east-camp', content: 'memorial-grove', edge: 'east', distance: 1350, radius: 330, jitter: .16 },
        { id: 'south-ruin', content: 'fallen-court', edge: 'south', distance: 1850, radius: 330, jitter: .12 },
      ] },
    ecology: { source: 'worldmass/country-scenery', spacing: 192, landformDressing: massLandformDressing(), rules: [
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
      defenses: { ...LASTLIGHT_DEFENSES },
      location: { source: 'worldmass/continental-start-v1', base: {dimension:'surface',cx:'0',cy:'0'},
        candidates: 32, spacingCells: 16, minimumFraction: .85,
        sample: {minX:-2000,minY:-2500,maxX:4500,maxY:4000,step:500},
        when: [{field:'elevation',min:-.16}] },
      quests: { source: 'worldmass/native-place-contracts', acceptance: 'journal', bindings: [
        { quest: Q_FRONTIER_WATCH.id, destination: 'west-camp' },
        { quest: Q_FRONTIER_STONEWARD.id, destination: 'north-stoneward', defeat: { kind: 'population', index: 0 } },
      ] },
      cartography: { source: 'zones/lastlight/public-signs', publicSigns: true },
      doorPress: { source: 'worldmass/settlement-doors', alignment: .65, reach: 4 } },
    startRadius: 288, populationRadius: 1300, maxPopulation: 96, pageRadius: 2, samplesPerTick: 512,
  });
}
