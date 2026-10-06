import { characterPagingAvailable, characterNativePages, commitCharacterNativeCohort, loadCharacterNativePage, forgetCharacterNativePage, resetCharacterNativePages } from '../meta/character';
import type { CharacterPageEntry } from '../meta/characterPages';
import { stageNativeCohort, hydrateNativeCohort } from './nativePaging';
import { createNativeFeatureWarmQueue, type NativeFeatureWarmQueue } from './nativeWarm';
import { MassStorm, type MassStormSave } from './storm';
import { MassSnow, type MassSnowSave } from './snow';
import { MassWeather, type MassWeatherSave } from './weather';
import { MassGeographicGameplay } from './geographicGameplay';
import type { MassHierarchySave } from './hierarchy';
import { MassNativeCountry } from './nativeCountry';
import { MassNativeHost, nativeWorldCapabilities } from './nativeHost';
import type { MassOccurrenceDisturbance } from './occurrences';
import { MassNativeResidency, type NativeResidencySave } from './nativeResidency';
import { validateMassBounties } from './bounties';
import { validateStructurePlans } from '../engine/structurePlans';
import type { Chest, World } from '../engine/world';
import type { Actor } from '../engine/actor';
import { MONSTERS } from '../data/monsters';
import { MAGIC_PACK_CFG, MAGIC_PACKS } from '../data/magicPacks';
import { magicPackMinimum, readMagicPack, type MagicPackState } from '../engine/magicPacks';
import { RARITY_DEFS } from '../engine/rarity';
import { regionKind } from '../world/regions';
import { captureZoneContents, restoreZoneContents, savedZoneContents, type ZoneContents } from '../engine/zonecontents';
import { address, cellKey, localOffset, neighborCell, type MassCell } from './address';
import { MassGenerator, makeMassRun } from './generator';
import { canonical, freezeData, massDigest, massRandom } from './random';
import { MassState, type MassStateSave } from './state';
import { MassStream } from './stream';
import { MassWalk } from './walk';
import { MassSites, siteOffset, validateMassSite, type MassSiteSave } from './sites';
import { MASS_ZONE, massAdventure, type MassAdventure } from './preset';

import { MassSettlement, type MassSettlementSave } from './settlement';
import { geographicLevel, validateMassProgression, type MassPopulation } from './progression';
import type { MassPlace } from './contracts';
import { MassJourney } from './journey';
import { MassRoadside, validateMassRoadside } from './roadside';
import { populationChoices, validatePopulationLimits } from './population';
import { MassEcology, validateMassEcology, type MassEcologySave } from './ecology';

import { MassRewards, type MassRewardSave } from './rewards';
import { MassFields, validateMassFieldResidency, type MassFieldSave } from './fields';
import { MASS_CLEARANCE_VIEW, massGarrisonProgress, massGarrisonSlots, recordMassGuardian, settleMassClearance } from './clearance';
import { MassBirths, validMassBirth, type MassBirth } from './birth';
import { chooseMassOrigin, validateMassOrigin } from './origin';
import { MassSurvey } from './survey';
import { applyMassTerritory, validateMassTerritory } from './territory';
import { massFormation, validateMassEncounters } from './encounters';
import { applyEncounterGroup, readEncounterGroup, type EncounterGroupState } from '../engine/encounterGroups';
import { ENCOUNTER_GROUPS, ENCOUNTER_GROUP_CFG } from '../data/encounterGroups';
import { validateMassGround } from './ground';
import { validateMassQuests } from './quests';
import { MassDormancy, validateMassDormancy, type MassDormancySave } from './dormancy';
import { MassShrines, MASS_SHRINE_LIMIT, type MassShrineSave } from './shrines';
import { MassPuzzles, MASS_PUZZLE_LIMIT, puzzleSeats, type MassPuzzleSave } from './puzzles';

interface MassEnemySave {
  id: string; monster: string; level: number; x: number; y: number; life: number; scale: number;
  magicPack?: MagicPackState; name?: string;
  encounterGroup?: EncounterGroupState;
  birth?: MassBirth;
  anchor?: { x: number; y: number }; leashHome?: boolean;
}
export interface MassAdventureSave {
  schema: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11; config: MassAdventure; configHash: string; state: MassStateSave; origin: MassCell;
  player: { x: number; y: number; tier?: number }; enemies: MassEnemySave[]; contents: ZoneContents;
  rewards?: MassRewardSave[];
  fields?: MassFieldSave[];
  dormancy?: MassDormancySave;
  nativeFeatures?: NativeResidencySave;
  geography?: MassHierarchySave;
  weather?: MassWeatherSave;
  snow?: MassSnowSave;
  storms?: MassStormSave;
  shrines?: MassShrineSave[];
  puzzles?: MassPuzzleSave[];
  sites?: MassSiteSave;
  ecology?: MassEcologySave;
  settlement?: MassSettlementSave;
}
/** First engine adapter. Residency NEVER tears down the World, its actors, or
 * in-flight skills. The population cap is deliberately conservative until full
 * dependency-aware dormancy exists: wounded/engaged bodies are never discarded. */
export class WorldMassRuntime {
  readonly rewards: MassRewards;
  readonly fields: MassFields;
  readonly dormancy: MassDormancy | null;
  nativeFeatures: MassNativeResidency | null = null;
  nativeCountry: MassNativeCountry | null = null;
  geography: MassGeographicGameplay | null = null;
  weather: MassWeather | null = null;
  snow: MassSnow | null = null;
  storms: MassStorm | null = null;
  nativeWarm: NativeFeatureWarmQueue | null = null;
  private nextNativeWarm = 0;
  private warmFrom: {x:number;y:number} | null = null;
  private nativeHost: MassNativeHost | null = null;
  readonly shrines: MassShrines;
  readonly puzzles: MassPuzzles;
  readonly generator: MassGenerator;
  readonly state: MassState;
  readonly survey: MassSurvey;
  readonly stream: MassStream;
  readonly walk: MassWalk;
  readonly sites: MassSites;
  settlement: MassSettlement | null = null;
  journey: MassJourney | null = null;
  roadside: MassRoadside | null = null;
  ecology: MassEcology | null = null;
  readonly config: Readonly<MassAdventure>;
  private readonly configHash: string;
  private natives = new Map<string, Actor>();
  private births: MassBirths;
  private paged = new Map<string,CharacterPageEntry>();
  private pagingWrite: Promise<boolean> | null = null;
  private pagingReads = new Map<string,Promise<void>>();
  private pagingRetry = new Map<string,number>();
  private pagingCursor = 0;
  private pagingRefusal = "";
  private nextPaging = 0;
  private disposed = false;
  get nativePagingStats(): {resident:number;paged:number;pages:number;reads:number;writing:boolean;refusal:string} {
    return {resident:this.natives.size,paged:this.paged.size,pages:new Set(this.paged.values()).size,
      reads:this.pagingReads.size,writing:!!this.pagingWrite,refusal:this.pagingRefusal};
  }
  async flushNativePaging(): Promise<void> {
    await this.pagingWrite;await Promise.all([...this.pagingReads.values()]);
  }
  private hasNative(id:string):boolean{return this.natives.has(id)||this.paged.has(id);}
  private cacheOpened: (source: string) => boolean = () => false;
  private nearKey = '';
  private dangerCache = new Map<string, number>();
  private nextPopulation = 0;
  private attached = false;
  private places = new Map<string, ReturnType<MassGenerator['placesInCell']>>();
  readonly origin: MassCell;
  readonly resumeTier: number;
  constructor(seed: number, runId: string, config: MassAdventure = massAdventure(), save?: MassAdventureSave) {
    this.resumeTier = save?.player.tier ?? 0;
    if (!Number.isInteger(this.resumeTier) || this.resumeTier < 0 || this.resumeTier > 6) throw new Error('Invalid worldmass player story');
    this.config = freezeData(JSON.parse(canonical(config)) as MassAdventure);
    this.configHash = massDigest(this.config);
    this.births = new MassBirths(this.config.nativeBirthSource, seed);
    if (this.config.territory !== undefined) validateMassTerritory(this.config.territory);
    this.rewards = new MassRewards(this.config.rewards, seed, save?.rewards);
    if(this.config.fieldResidency!==undefined)validateMassFieldResidency(this.config.fieldResidency,this.config.populationRadius);
    this.fields = new MassFields(save?.fields,this.config.fieldResidency);
    for (const policy of [config.shrineResidency, config.puzzleResidency])
      if (policy) validateMassFieldResidency(policy, config.populationRadius);
    this.shrines = new MassShrines(save?.shrines, config.shrineResidency);
    this.puzzles = new MassPuzzles(save?.puzzles, config.puzzleResidency);
    if (config.dormancy) validateMassDormancy(config.dormancy, config.populationRadius);
    this.dormancy = config.dormancy ? new MassDormancy(config.dormancy) : null;
    this.generator = new MassGenerator(save?.state.run ?? makeMassRun(seed, runId, config.terrain), config.terrain);
    if (config.settlement?.location !== undefined) validateMassOrigin(config.settlement.location, config.terrain);
    this.origin = Object.freeze(save ? { ...save.origin } : chooseMassOrigin(this.generator, config.settlement?.location).origin);
    address(this.origin.dimension, this.origin.cx, this.origin.cy, 0, 0, config.terrain.addressSpan);
    if (!Number.isSafeInteger(config.pageRadius) || config.pageRadius < 1 || config.pageRadius > 4
      || !Number.isSafeInteger(config.samplesPerTick) || config.samplesPerTick < 1 || config.samplesPerTick > 65536
      || !Number.isFinite(config.startRadius) || config.startRadius < 0 || config.startRadius > 2048
      || !Number.isFinite(config.populationRadius) || config.populationRadius < 0 || config.populationRadius > 4096
      || !Number.isSafeInteger(config.maxPopulation) || config.maxPopulation < 0 || config.maxPopulation > 256)
      throw new Error('Invalid worldmass runtime budget');
    if (config.terrain.addressSpan < 128 || config.terrain.addressSpan > 2048
      || config.terrain.terrainCell < 8 || config.terrain.terrainCell > 64
      || config.terrain.addressSpan % 4
      || (config.pageRadius * 2 + 1) ** 2 * config.terrain.addressSpan ** 2 > 33554432)
      throw new Error('Worldmass render residency exceeds its texture budget');
    if (config.ground !== undefined) validateMassGround(config.ground);
    validateMassQuests(config);
    if (config.geography && !config.nativeCountry) throw Error('Geographic gameplay requires native country sources');
    if (config.bounties !== undefined) validateMassBounties(config.bounties);
    validateStructurePlans(config.settlement?.structurePlans);
    if (config.journey?.roadside !== undefined) validateMassRoadside(config.journey.roadside, config.content);
    if (config.progression) validateMassProgression(config.progression, config.terrain);
    if (config.ecology) validateMassEcology(config.ecology, config.terrain.addressSpan);
    if (config.journey && !config.settlement) throw new Error('Frontier routes require a settlement');
    if(config.journey?.reservePopulation!==undefined && typeof config.journey.reservePopulation!=='boolean')
      throw Error('Invalid frontier population reservation');
    if(config.journey?.extensions!==undefined && !Array.isArray(config.journey.extensions))
      throw new Error('Invalid frontier extensions');
    if(config.journey?.stops!==undefined && !Array.isArray(config.journey.stops))
      throw new Error('Invalid frontier route stops');
    const journeyPlaces=[...(config.journey?.destinations ?? []),...(config.journey?.extensions ?? []),...(config.journey?.stops ?? [])];
    if(journeyPlaces.reduce((n,d)=>n+(config.content.find(c=>c.id===d.content)?.site?.altars?.length??0),0)>16)
      throw new Error('Frontier field count exceeds its checkpoint budget');
    if (journeyPlaces.reduce((n,d) => n + (config.content.find(c => c.id === d.content)?.site?.shrines?.length ?? 0), 0) > MASS_SHRINE_LIMIT)
      throw Error('Frontier shrine count exceeds its checkpoint budget');
    for (const d of journeyPlaces) {
      const site = config.content.find(c => c.id === d.content)?.site;
      if (!site) throw new Error('Unresolved frontier destination');
      validateMassSite(site, d.radius);
    }
    if (journeyPlaces.reduce((n,d) => n + (config.content.find(c=>c.id===d.content)?.site?.puzzles ?? [])
      .reduce((n,r)=>n+puzzleSeats(r).length,0),0) > MASS_PUZZLE_LIMIT)
      throw Error('Frontier puzzle count exceeds its checkpoint budget');
    if (new Set(config.content.map(c => c.id)).size !== config.content.length) throw new Error('Duplicate worldmass content');
    for (const c of config.content) {
      if (!c.id || !c.source || !Number.isSafeInteger(c.level) || c.level < 1 || c.level > 100
        || !Number.isSafeInteger(c.count) || c.count < 0 || c.count === 0 && !c.site || c.count > 16 || !c.table.length
        || c.table.some(r => !MONSTERS[r.id] || !Number.isFinite(r.weight) || r.weight <= 0)) throw new Error('Invalid worldmass population');
    }
    for (const c of config.content) {
      if(config.fieldResidency && (c.site?.altars?.length??0)>config.fieldResidency.maxResident)
        throw Error('Worldmass site exceeds its field residency budget');
      if (c.site?.puzzles?.length && !config.puzzleResidency && config.terrain.places.some(p => p.content === c.id))
        throw Error('Worldmass puzzles require a finite journey owner');
      if (c.site?.shrines?.length && !config.shrineResidency && config.terrain.places.some(p => p.content === c.id))
        throw Error('Worldmass shrines require a finite journey owner');
      if (c.site?.altars?.length && !config.fieldResidency && config.terrain.places.some(p=>p.content===c.id))
        throw new Error('Worldmass altar fields require a finite journey owner');
      for (const row of [c, ...(c.levels ?? [])]) {
        validatePopulationLimits(row);
        if(row.encounters!==undefined){
          validateMassEncounters(row.encounters,row.level);
          if(c.magicPack)throw Error('Worldmass formations and magic cohorts require separate owners');
        }
      }
      if (c.magicPack) {
        const def = Object.hasOwn(MAGIC_PACKS,c.magicPack.mechanic) ? MAGIC_PACKS[c.magicPack.mechanic] : undefined;
        const factions = new Set([c.table,...(c.levels?.map(l=>l.table) ?? [])].flat().map(r=>MONSTERS[r.id]?.faction));
        if (!c.magicPack.source || !def || c.count < magicPackMinimum(def) || c.count > MAGIC_PACK_CFG.maxMembers
          || factions.size !== 1) throw new Error('Invalid native worldmass cohort');
      }
      if (c.levelOffset !== undefined && (!Number.isSafeInteger(c.levelOffset) || Math.abs(c.levelOffset) > 100))
        throw new Error('Invalid worldmass content level offset');
      if (!c.levels) continue;
      if (c.levels.length > 100 || new Set(c.levels.map(r => r.level)).size !== c.levels.length
        || c.levels.some(r => !Number.isSafeInteger(r.level) || r.level < 1 || r.level > 100 || !r.table.length
          || r.table.some(e => !MONSTERS[e.id] || !Number.isFinite(e.weight) || e.weight <= 0)))
        throw new Error('Invalid worldmass native level roster');
      const range = config.progression;
      if (range) for (let level = range.minLevel; level <= range.maxLevel; level++)
        if (!c.levels.some(r => r.level === level)) throw new Error('Missing worldmass native level roster');
    }
    for (const p of config.terrain.places) {
      const site = config.content.find(c => c.id === p.content)?.site;
      if (site) validateMassSite(site, p.radius);
      if (p.surface && !regionKind(p.surface.region)) throw new Error('Unresolved site surface');
    }
    if (config.terrain.places.some(p => !config.content.some(c => c.id === p.content))
      || config.terrain.surfaces.some(s => !regionKind(s.region))) throw new Error('Unresolved worldmass content');
    this.state = new MassState(this.generator.run, config.terrain.terrainCell);
    this.survey = new MassSurvey(this.state, this.config.survey);
    this.stream = new MassStream(this.generator, this.state, { maxPages: (config.pageRadius * 2 + 1) ** 2, maxSamples: 32768 });
    this.walk = new MassWalk(this.stream, this.origin);
    this.sites = new MassSites(id => this.config.content.find(c => c.id === id)?.site,
      center => localOffset(center, { ...this.origin, x: 0, y: 0 }, config.terrain.addressSpan), config.terrain.addressSpan);
    if (save) {
      // Older clients must refuse owners they cannot plan/retain. Schema three
      // adds roadside bodies, two adds one-shot stands, four owns placed riddles,
      // five preserves deliberate quest acceptance, six pins native plan variants,
      // seven owns reward triggers, eight reserves destination population, nine owns country bounties; older descriptors keep
      // their original version and never gain new encounters on Continue.
      if ((save.schema !== 1 && save.schema !== 2 && save.schema !== 3 && save.schema !== 4 && save.schema !== 5 && save.schema !== 6 && save.schema !== 7 && save.schema !== 8 && save.schema !== 9 && save.schema !== 10 && save.schema !== 11)
        || save.schema < 11 && !!config.geography
        || !!save.geography !== !!config.geography
        || !!save.weather !== !!config.geography?.weather
        || !!save.snow !== !!config.geography?.snow
        || !!save.storms !== !!config.geography?.storms
        || save.schema < 10 && !!(config.dormancy || config.shrineResidency || config.puzzleResidency || config.nativeCountry)
        || !!save.dormancy !== !!config.dormancy
        || !!save.nativeFeatures !== !!config.nativeCountry
        || save.schema < 9 && config.bounties !== undefined
        || save.schema < 8 && config.journey?.reservePopulation !== undefined
        || save.schema < 7 && config.rewards?.earnFrom !== undefined
        || save.schema < 6 && config.settlement?.structurePlans !== undefined
        || save.schema < 5 && config.settlement?.quests?.acceptance === 'journal'
        || save.schema < 4 && config.content.some(c => c.site?.puzzles?.length)
        || save.schema < 3 && !!config.journey?.roadside
        || save.schema === 1 && config.content.some(c => c.site?.shrines?.length)
        || canonical(save.settlement?.zone?.structurePlans ?? null) !== canonical(config.settlement?.structurePlans ?? null)
        || save.configHash !== massDigest(config) || !Array.isArray(save.enemies)
        || !config.dormancy && save.enemies.length > config.maxPopulation || !savedZoneContents(save.contents)
        || !Number.isFinite(save.player?.x) || !Number.isFinite(save.player?.y)
        || new Set(save.enemies.map(e => e.id)).size !== save.enemies.length)
        throw new Error('Invalid worldmass checkpoint');
      for (const e of save.enemies) if (!e.id || !MONSTERS[e.monster] || !Number.isSafeInteger(e.level) || e.level < 1
        || ![e.x, e.y, e.life, e.scale].every(Number.isFinite) || e.life <= 0 || e.scale <= 0
        || e.magicPack && (!readMagicPack(e.magicPack) || typeof e.name !== 'string')
        || e.encounterGroup !== undefined && (!readEncounterGroup(e.encounterGroup) || typeof e.name !== 'string' || !!e.magicPack)
        || (this.config.nativeBirthSource || e.birth !== undefined) && !validMassBirth(e.birth!)
        || e.anchor !== undefined && (!e.anchor || ![e.anchor.x,e.anchor.y].every(Number.isFinite))
        || e.leashHome !== undefined && (typeof e.leashHome !== 'boolean' || e.leashHome && !e.anchor))
        throw new Error('Invalid worldmass survivor');
      this.state.restore(save.state);
      if (save.state.terrain.some(p => !regionKind(p.region))) throw new Error('Unresolved saved worldmass terrain');
    } else if (!config.settlement) {
      // An explicit, attributable run-start reservation, saved like any terrain edit.
      const cs = config.terrain.terrainCell, r = config.startRadius;
      const start = this.generator.terrainAt(this.walk.at(0, 0));
      const color = config.terrain.surfaces.find(s => s.biome === start.biome && s.region === 'ground')?.color ?? start.color;
      for (let y = -r; y < r; y += cs) for (let x = -r; x < r; x += cs)
        if (Math.hypot(x + cs / 2, y + cs / 2) < r)
          this.state.paint({ address: this.walk.at(x, y), region: 'ground', color, cause: 'worldmass/start-clearing' });
    }
  }
  attach(world: World, save?: MassAdventureSave): void {
    if(!save)resetCharacterNativePages(world);
    for(const page of characterNativePages(world)){
      if(page.ref.run!==this.generator.run.runId)throw Error('Foreign native page session');
      for(const id of page.ids){if(save?.enemies.some(e=>e.id===id))throw Error('Native both resident and paged');this.paged.set(id,page);}
    }
    this.cacheOpened = source => world.chests.some(c => c.rewardSource === source && c.opened);
    world.zoneMap[MASS_ZONE] = { id: MASS_ZONE, name: 'The Unbroken Wilds', level: 1,
      size: { w: 1536, h: 1536 }, theme: JSON.parse(canonical(this.config.theme)),
      layout: [], objective: { kind: 'none', label: 'Explore the wilds' }, exits: [], map: { x: 0, y: 0 },
      biome: 'downs', sky: 'open', boundless: true, special: true, cohort: 'authored', townPortals: false,
      seed: this.generator.run.seed };
    // A native settlement is built only at run creation/Continue. Its buildings,
    // population, interiors and service controllers remain the live scene.
    world.massRuntime = null;
    if (this.config.settlement) {
      if (save && !save.settlement) throw new Error('Missing native settlement checkpoint');
      this.settlement = new MassSettlement(this.config.settlement, world, this.generator.run.seed, save?.settlement);
      this.walk.overlay = { grid: this.settlement.grid, contains: (x, y) => this.settlement!.contains(x, y) };
      if (!save) this.settlement.reserve(this.state, this.walk);
      const def = world.zoneMap[MASS_ZONE];
      def.tiers = this.settlement.zone.tiers;
      world.zone = def;
      world.arena = { ...world.arena, boundless: true };
    } else {
      world.loadZone(MASS_ZONE);
      world.doodads = [];
      world.rebuildClientTerrain();
      world.actors = world.actors.filter(a => a.team !== 'enemy');
    }
    world.massRuntime = this;
    world.walk = this.walk;
    this.walk.obstacles = { blocked: (x, y) => !!world.pointInSolid(x, y, this.walk.cellSize / 2),
      revision: () => world.doodadRev + ':' + world.doodads.length };
    this.sites.restore(save?.sites, world.time);
    if (this.config.journey && this.settlement) {
      this.journey = new MassJourney(this.config.journey, this.settlement, this.generator, this.walk);
      if (!save) this.journey.establish(this.state);
      if (this.config.journey.roadside) this.roadside = new MassRoadside(this.config.journey.roadside,
        this.journey, this.settlement, this.generator, this.walk);
    }
    if(this.config.nativeCountry){
      const spec=this.config.nativeCountry;
      this.nativeCountry=new MassNativeCountry(this.generator,spec,(center,radius)=>{
        if(!this.inLocalFrame(center))return false;
        const q=localOffset(center,{...this.origin,x:0,y:0},this.config.terrain.addressSpan);
        return !!this.settlement?.reserves(q.x,q.y,radius) || !!this.journey?.reserves(q,radius)
          || !!this.roadside?.reserves(q,radius) || !!this.geography?.reserves(center,radius);
      });
      if(this.config.geography)this.geography=new MassGeographicGameplay(this,this.config.geography,save?.geography);
      if(this.config.geography?.weather)this.weather=new MassWeather(this.generator.run.seed,this.config.terrain.addressSpan,
        at=>this.geography?.contextAt(at),this.config.geography.weather,save?.weather);
      if(this.config.geography?.snow){
        if(!this.weather)throw Error('Geographic snowfall requires the geographic sky');
        this.snow=new MassSnow(this.config.terrain.addressSpan,this.config.geography.policy.chunkSpan,this.config.geography.snow,
          at=>this.geography?.contextAt(at),(at,context)=>this.weather!.sample(at,context),save?.snow);
      }
      this.nativeFeatures=new MassNativeResidency({run:this.generator.run.runId,addressSpan:this.config.terrain.addressSpan,
        maxBlueprints:48,maxResidents:24,maxCandidates:9},at=>this.nativeCountry!.at(at).map(p=>this.nativePlacement(p)),
        nativeWorldCapabilities(),()=>({...this.origin,x:0,y:0}),save?.nativeFeatures,
        {regionAt:at=>this.state.patchAt(at)?.region??this.generator.terrainAt(at).region,cellSize:this.config.terrain.terrainCell,reservePadding:spec.clearance});
      this.nativeWarm=createNativeFeatureWarmQueue();
      const features=this.nativeFeatures;
      this.stream.overlay={sample:(at,base)=>features.sample(at,base),revisionAt:cell=>features.revisionAt(cell),
        get revision(){return features.version;}};
      this.walk.native={regionAt:at=>features.regionAt(at),cellSize:30,get revision(){return features.version;}};
      if(this.config.geography?.storms){
        if(!this.weather)throw Error('Geographic storms require the geographic sky');
        const policy=this.config.geography.policy;
        this.storms=new MassStorm(this.generator.run.seed,this.config.terrain.addressSpan,policy.chunkSpan*policy.chunksPerZone,save?.storms);
      }
      this.nativeHost=new MassNativeHost(world,{maxPopulation:()=>this.config.maxPopulation-this.reservedPopulation(''),
        population:()=>this.population,retainRadius:2400,quietSeconds:12,
        ...(this.geography?{zoneOwner:(pos:{x:number;y:number})=>this.geography!.hierarchy.at(this.walk.at(pos.x,pos.y)).zone.id}:{})},save?.nativeFeatures);
    }
    if (this.config.ecology) {
      this.ecology = new MassEcology(this.config.ecology, this);
      this.ecology.restore(save?.ecology, world.time);
    }
    world.exits = [];
    world.waypointPos = null; // worldmass has no graph fast-travel destinations
    world.notices = []; world.texts = []; // obsolete graph directions do not describe this expedition
    world.landPartyAt(save?.player ?? this.settlement?.spawn ?? { x: 12, y: 12 }, { tier: this.resumeTier });
    if (save) {
      const groups = new Map<number,number>(), formations = new Map<number,number>();
      for (const e of save.enemies) {
        const a=this.restoreNativeBody(world,e,groups,formations);
        this.natives.set(e.id,a);world.actors.push(a);
      }
      restoreZoneContents(world, save.contents);
      if (save.dormancy) this.dormancy!.restore(save.dormancy, this.natives, world);
      world.refreshMagicPacks();
    }
    this.fields.restoreAdmitted(world, this.journey?.places ?? [], place=>({
      rows:this.config.content.find(c=>c.id===place.content)?.site?.altars ?? [],
      center:localOffset(place.center,{...this.origin,x:0,y:0},this.config.terrain.addressSpan),
      level:this.populationFor(place).level,
    }),owner=>{
      const at=address(owner.center.dimension,owner.center.cx,owner.center.cy,owner.center.x,owner.center.y,this.config.terrain.addressSpan);
      if(canonical(at)!==canonical(owner.center))throw Error('Invalid worldmass field address');
      return this.placesInCell(at).find(p=>p.id===owner.id&&canonical(p.center)===canonical(at));
    });
    this.shrines.restoreAdmitted(world, this.journey?.places ?? [], place => ({
      rows: this.config.content.find(c => c.id === place.content)?.site?.shrines ?? [],
      center: localOffset(place.center, {...this.origin,x:0,y:0}, this.config.terrain.addressSpan),
    }), owner => this.locateOwner(owner));
    this.puzzles.restoreAdmitted(world, this.journey?.places ?? [], place => ({
      rows: this.config.content.find(c=>c.id===place.content)?.site?.puzzles ?? [],
      center: localOffset(place.center, {...this.origin,x:0,y:0}, this.config.terrain.addressSpan), level: this.populationFor(place).level,
    }), owner => this.locateOwner(owner));
    if (!this.dormancy && this.population > this.config.maxPopulation) throw Error('Worldmass puzzle population exceeds capacity');
    this.update(world, true);
    this.attached = true;
    this.nextPopulation = world.time;
  }
  private inLocalFrame(at:MassCell):boolean {
    if(at.dimension!==this.origin.dimension)return false;
    const dx=BigInt(at.cx)-BigInt(this.origin.cx),dy=BigInt(at.cy)-BigInt(this.origin.cy);
    return dx>=-4096n&&dx<=4096n&&dy>=-4096n&&dy<=4096n;
  }
  private nativePlacement(p:import('./nativeResidency').NativeFeaturePlacement):import('./nativeResidency').NativeFeaturePlacement {
    if(!this.inLocalFrame(p.origin))return {...p,request:{...p.request,level:this.config.progression?.maxLevel??1}};
    const q=localOffset(p.origin,{...this.origin,x:0,y:0},this.config.terrain.addressSpan);
    return {...p,request:{...p.request,level:this.levelAt(q)}};
  }
  private locateOwner(owner: {id:string;center:import('./address').MassAddress}): MassPlace | undefined {
    const at=address(owner.center.dimension,owner.center.cx,owner.center.cy,owner.center.x,owner.center.y,this.config.terrain.addressSpan);
    if(canonical(at)!==canonical(owner.center))throw Error('Invalid worldmass activity address');
    return this.placesInCell(at).find(p=>p.id===owner.id && canonical(p.center)===canonical(at));
  }
  /** Only a generated, admitted physical cache can earn its configured choice. */
  earnCacheReward(world: World, source: string | undefined, pos: { x: number; y: number }): void {
    if (!source || !this.rewards.admits('cache')) return;
    const place = this.placesInCell(this.walk.at(pos.x, pos.y))
      .find(p => canonical([p.id, 'cache']) === source && this.state.claimed('site-cache', p.id));
    const site = place && this.config.content.find(c => c.id === place.content)?.site;
    if (site?.cache) this.rewards.earn(world, source, site.name);
  }
  /** Called only by the native completion event, never by restoration or UI reads. */
  earnPuzzleReward(world: World, run: import('../engine/puzzles').PuzzleRun): void {
    if (world.massRuntime !== this || world.clientActionHook
      || !this.rewards.admits('puzzle')) return;
    const owner=this.puzzles.completed(run);
    const place=owner && this.locateOwner({id:owner.place,center:owner.center});
    const site=place && this.config.content.find(c=>c.id===place.content)?.site;
    if (owner && site) this.rewards.earn(world, owner.source, site.name);
  }
  /** Preserve the native lock/recovery fraction. An earned, quiet cache merely
   * progresses faster; opening and all loot remain in the native chest artery. */
  cacheHoldRate(world: World, chest: Chest): number {
    if(chest.kind!=='timed' || chest.mimic || !chest.rewardSource)return 1;
    const place=this.placesInCell(this.walk.at(chest.pos.x,chest.pos.y))
      .find(p=>canonical([p.id,'cache'])===chest.rewardSource && this.state.claimed('site-cache',p.id));
    if(!place || !this.siteCleared(place.id))return 1;
    const seconds=this.config.content.find(c=>c.id===place.content)?.site?.cache?.clearedHoldSeconds;
    if(seconds===undefined || world.actors.some(a=>world.isPressingFoe(a,world.player.pos,world.player.tier)))return 1;
    return Math.max(1,chest.maxLock/seconds);
  }
  siteCleared(id: string): boolean { return this.state.claimed('site-cleared',id); }
  siteSearched(id: string): boolean {
    return this.state.claimed('site-looted', id) || this.cacheOpened(canonical([id, 'cache']));
  }
  /** A discovered site's original defender keeps its affiliation while roaming.
   * Read admission receipts, never infer membership from proximity or species.
   * The renderer still owns all visibility/hover admission. */
  garrisonName(actor: Actor): string | null {
    if (actor.dead || actor.team !== 'enemy') return null;
    for (const found of this.sites.discovered) {
      const content = this.config.content.find(c => c.id === found.content);
      if (!content?.site?.completion) continue;
      for (const id of massGarrisonSlots(content, found.id, this.populationCount(found)))
        if (this.natives.get(id) === actor && this.state.claimed('site-guardian', id)
          && !this.state.claimed('fallen', id)) return content.site.name;
    }
    return null;
  }
  /** A read-only account of a discovered site's original garrison and admitted
   * cache. This names no hidden positions and never promises safety from visitors. */
  siteActivity(id: string): { text: string; complete: boolean } | null {
    const found=this.sites.discovered.find(p=>p.id===id);
    const content=found && this.config.content.find(c=>c.id===found.content);
    if(!found || !content?.site)return null;
    const riddle=this.puzzles.activity(id);
    const cleared=this.siteCleared(id), searched=this.siteSearched(id);
    const progress=massGarrisonProgress(this.state,content,id,key=>this.hasNative(key),this.populationCount(found));
    const lines: string[]=riddle ? [riddle.text] : [];
    if(cleared || progress?.remaining===0)lines.push(MASS_CLEARANCE_VIEW.complete);
    else if(progress)lines.push(MASS_CLEARANCE_VIEW.remaining(progress.remaining));
    if(content.site.cache && this.state.claimed('site-cache',id))
      lines.push(searched ? MASS_CLEARANCE_VIEW.searched : MASS_CLEARANCE_VIEW.cache);
    return lines.length ? {text:lines.join(' · '),complete:(!riddle || riddle.complete) && (!content.site.completion || cleared) && (!content.site.cache || searched)} : null;
  }
  /** The location read uses the same admitted footprint/identity as the map.
   * Entering a site never mutates the shared zone or its reward context. */
  localSite(pos: { x: number; y: number }): { id: string; name: string; level: number; activity: ReturnType<WorldMassRuntime['siteActivity']> } | null {
    if (this.settlement?.contains(pos.x,pos.y)) return null;
    const at = this.walk.at(pos.x,pos.y);
    for (const place of this.places.get(cellKey(at)) ?? []) {
      const site = this.config.content.find(c => c.id === place.content)?.site;
      if (!site) continue;
      const q = localOffset(place.center,{...this.origin,x:0,y:0},this.config.terrain.addressSpan);
      if (Math.hypot(q.x-pos.x,q.y-pos.y) <= place.radius)
        return { id: place.id, name: site.name, level: this.populationFor(place).level, activity:this.siteActivity(place.id) };
    }
    return null;
  }
  /** One query composes planned openings and free country. Neither placement
   * order nor later residency can introduce another site across a reserved trail. */
  placesInCell(cell: MassCell): readonly MassPlace[] {
    const planned = this.journey?.inCell(cell) ?? [];
    const country = this.generator.placesInCell(cell).filter(p => {
      const q = localOffset(p.center, { ...this.origin, x: 0, y: 0 }, this.config.terrain.addressSpan);
      return !this.journey?.reserves(q, p.radius) && !this.roadside?.reserves(q, p.radius)
        && !this.nativeFeatures?.intersects(p.center,p.radius);
    });
    return [...planned, ...(this.roadside?.inCell(cell) ?? []), ...country];
  }
  /** Physical cell centres keep cache/order/frame rate out of a place's danger.
   * The native settlement is the refuge footprint, not a point. */
  levelAt(pos: { x: number; y: number }): number {
    const spec = this.config.progression;
    if (!spec) return 1;
    const cs = this.config.terrain.terrainCell;
    const x = (Math.floor(pos.x / cs) + .5) * cs, y = (Math.floor(pos.y / cs) + .5) * cs;
    const key = x + ',' + y, hit = this.dangerCache.get(key);
    if (hit !== undefined) return hit;
    const distance = this.settlement?.distance(x, y) ?? Math.hypot(x, y);
    const level = geographicLevel(spec, distance, this.generator.fieldsAt(this.walk.at(x, y)));
    this.dangerCache.set(key, level);
    if (this.dangerCache.size > 512) this.dangerCache.delete(this.dangerCache.keys().next().value!);
    return level;
  }
  populationFor(place: Pick<MassPlace, 'content' | 'center'>): MassPopulation {
    const content = this.config.content.find(c => c.id === place.content);
    if (!content) throw new Error('Unresolved worldmass population');
    const spec = this.config.progression;
    if (!spec || !content.levels) return content;
    const pos = localOffset(place.center, { ...this.origin, x: 0, y: 0 }, this.config.terrain.addressSpan);
    const level = Math.max(spec.minLevel, Math.min(spec.maxLevel, this.levelAt(pos) + (content.levelOffset ?? 0)));
    return content.levels.find(row => row.level === level)!;
  }
  private populationCount(place: Pick<MassPlace,'id'|'content'|'center'>): number {
    return massFormation(this.populationFor(place).encounters,this.generator.run.seed,place.id)?.seats.length
      ?? this.config.content.find(c=>c.id===place.content)!.count;
  }
  /** Only still-needed seats reserve space: never evict, respawn or heal a body. */
  private reservedPopulation(except: string): number {
    let missing = this.geography?.reservedPopulation(except)??0;
    for (const place of this.journey?.spec.reservePopulation?this.journey.places:[]) {
      if (place.id === except) continue;
      const site = this.config.content.find(c=>c.id===place.content)!.site;
      const ids = [...Array.from({length:this.populationCount(place)},(_,i)=>canonical([place.id,i])),
        ...(site?.fixtures??[]).map((_,i)=>canonical([place.id,'fixture',i]))];
      missing += ids.filter(id=>!this.hasNative(id)&&!this.state.claimed('fallen',id)).length
        + this.puzzles.missing(place,site?.puzzles??[]);
    }
    return missing;
  }
  /** Actual free seats, including every other funded activity's future needs. */
  availablePopulation(exceptOwner=''):number{return Math.max(0,this.config.maxPopulation-this.population-this.reservedPopulation(exceptOwner));}
  /** Worker descriptors are suggestions until the authoritative residency validates
   * them. Retire the worker whenever its owning world or surface is discarded. */
  dispose():void { this.disposed=true;this.nativeWarm?.dispose();this.geography?.dispose(); }
  private prepareNativeCountry(world:World):void {
    const queue=this.nativeWarm,features=this.nativeFeatures,country=this.nativeCountry;
    if(!queue||!features||!country||queue.stats.disposed)return;
    const ready=queue.takeReady();
    if(ready)try{features.adoptPrepared(ready.placement,ready.preparation);}catch(error){
      queue.error=String(error instanceof Error?error.message:error);queue.dispose();return;
    }
    if(world.time<this.nextNativeWarm)return;
    this.nextNativeWarm=world.time+.5;
    const p=world.player.pos,from=this.warmFrom;this.warmFrom={...p};
    const dx=from?p.x-from.x:0,dy=from?p.y-from.y:0,length=Math.hypot(dx,dy);
    const ahead={x:p.x+(length>1?dx/length*1500:0),y:p.y+(length>1?dy/length*1500:0)};
    const at=this.walk.at(ahead.x,ahead.y);
    const rows=country.near(at,country.spec.spacing/2).filter(row=>this.inLocalFrame(row.origin))
      .map(row=>this.nativePlacement(row)).filter(row=>features.preparationNeeded(row));
    rows.sort((a,b)=>{
      const aa=localOffset(a.origin,at,this.config.terrain.addressSpan),bb=localOffset(b.origin,at,this.config.terrain.addressSpan);
      return aa.x*aa.x+aa.y*aa.y-bb.x*bb.x-bb.y*bb.y;
    });
    queue.offer(rows);
  }
  /** Run native occurrence drivers before World drains this frame's sounds.
   * Their binding owns controller, scenery and population snapshots together. */
  get hasOccurrences():boolean {return !this.disposed&&!!this.nativeHost?.hasOccurrences;}
  updateOccurrences(dt:number,disturbs:readonly MassOccurrenceDisturbance[]):void {
    const host=this.nativeHost;
    if(!host||!this.attached||this.disposed||host.world.massRuntime!==this||host.world.zone.id!==MASS_ZONE)return;
    host.updateOccurrences(dt,disturbs);
  }
  /** Survived-death wakes retain the run's land and consequences. */
  wake(world: World): void { world.landPartyAt(this.settlement?.spawn ?? { x: 12, y: 12 }); this.nearKey = ''; }
  update(world: World, boot = false): void {
    if (world.zone.id !== MASS_ZONE) return;
    this.geography?.restoreProcessions(world);
    this.geography?.prepare(this.walk.at(world.player.pos.x,world.player.pos.y),world.time);
    this.prepareNativeCountry(world);
    if(this.weather){
      this.weather.setScales(this.weather.time,world.sim.weatherScales(world.devOverlayView()));
      this.weather.advanceTo(Math.max(this.weather.time, world.time));
    }
    const at = this.walk.at(world.player.pos.x, world.player.pos.y), key = cellKey(at);
    if (key !== this.nearKey) {
      this.nearKey = key;
      const cells: { cell: MassCell; distance: number }[] = [];
      const r = this.config.pageRadius;
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++)
        cells.push({ cell: neighborCell(at, x, y), distance: x * x + y * y });
      cells.sort((a, b) => a.distance - b.distance);
      this.stream.request(cells.map(c => c.cell));
      for (const k of this.places.keys()) if (!cells.some(c => cellKey(c.cell) === k)) this.places.delete(k);
      for (const { cell } of cells) {
        const k = cellKey(cell);
        if (!this.places.has(k)) this.places.set(k, this.placesInCell(cell));
      }
      this.state.claim('explored', key);
    }
    this.stream.step(boot ? this.stream.cols ** 2 * 9 : this.config.samplesPerTick);
    for (const [id, actor] of this.natives) if (actor.dead) {
      this.state.claim('fallen', id); this.natives.delete(id);
    }
    this.sites.discover(world.player.pos);
    for (const found of this.sites.discovered) {
      if (this.state.claimed('site-looted', found.id)) continue;
      if (this.siteSearched(found.id)) this.state.claim('site-looted', found.id);
    }
    if (!boot && world.time < this.nextPopulation) return;
    this.nextPopulation = world.time + .5;
    this.dormancy?.update(world, this.natives);
    if(this.nativeFeatures && this.nativeCountry && this.nativeHost){
      const radius=Math.min(2400,this.nativeCountry.spec.spacing/2);
      const wanted=new Map(this.nativeCountry.near(at,radius).map(p=>{const placement=this.nativePlacement(p);return [placement.id,placement] as const;}));
      // Already visited native geometry remains authoritative when a newer
      // reservation prevents the current provider from proposing its birth.
      for(const placement of this.nativeFeatures.bornNear(at,radius))wanted.set(placement.id,placement);
      this.nativeFeatures.sync([...wanted.values()],this.nativeHost);
    }
    this.fields.sync(world);
    this.shrines.sync(world);
    this.puzzles.sync(world);
    // Restoring the scene precedes exact saved vitals. Pay pending rewards on
    // the first live update, so that restore cannot erase native level-up healing.
    if(this.attached)for(const found of this.sites.discovered){
      const content=this.config.content.find(c=>c.id===found.content);
      if(content)settleMassClearance(world,this.state,found,content,id=>this.hasNative(id),this.populationFor(found).level,this.populationCount(found));
    }
    if (this.attached) for (const quest of [...world.activeQuests])
      if (quest.placeId) world.completeMassQuest(quest.questId, quest.placeId);
    // Retained actors still need their original solid scenery after a reload,
    // even when the hero saved far away. Dependency pages do not spawn content.
    const dependencies = new Map<string, ReturnType<MassGenerator['placesInCell']>>();
    for (const actor of this.natives.values()) {
      if (this.dormancy?.isSleeping(actor)) continue;
      const cell = this.walk.at(actor.pos.x, actor.pos.y), key = cellKey(cell);
      if (!dependencies.has(key)) dependencies.set(key, this.placesInCell(cell));
    }
    for (const owner of [...this.puzzles.residentOwners(), ...this.shrines.residentOwners()]) {
      const place=this.locateOwner(owner);
      if(place) dependencies.set('activity:'+place.id,[place]);
    }
    const eligible = [...this.places.values(), ...dependencies.values()].flat().filter(p => {
      const q = localOffset(p.center, { ...this.origin, x: 0, y: 0 }, this.config.terrain.addressSpan);
      return this.settlement ? !this.settlement.reserves(q.x, q.y, p.radius)
        : Math.hypot(q.x, q.y) >= this.config.startRadius + p.radius;
    });
    this.sites.sync(world, eligible);
    // Prepare scenery before bodies so native spawn collision sees tree trunks.
    const sceneryCells = new Map<string, MassCell>();
    const radius = this.config.pageRadius;
    for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) {
      const cell = neighborCell(at, x, y); sceneryCells.set(cellKey(cell), cell);
    }
    for (const actor of this.natives.values()) {
      if (this.dormancy?.isSleeping(actor)) continue;
      const cell = this.walk.at(actor.pos.x, actor.pos.y); sceneryCells.set(cellKey(cell), cell);
    }
    for (const cell of this.ecology?.pendingFellingCells() ?? []) sceneryCells.set(cellKey(cell), cell);
    this.ecology?.sync(world, [...sceneryCells.values()]);
    if(!world.player.dead)this.survey.observe(at,target=>world.lineOfSight(world.player.pos,
      localOffset(target,{...this.origin,x:0,y:0},this.config.terrain.addressSpan),world.player.tier));
    this.geography?.sync(world);
    this.sites.discover(world.player.pos);
    const seen = new Set<string>();
    for (const places of this.places.values()) for (const p of places) {
      if (seen.has(p.id)) continue; seen.add(p.id);
      const q = localOffset(p.center, { ...this.origin, x: 0, y: 0 }, this.config.terrain.addressSpan);
      if (!q || (this.settlement ? this.settlement.reserves(q.x, q.y, p.radius)
        : Math.hypot(q.x, q.y) < this.config.startRadius + p.radius)
        || Math.hypot(q.x - world.player.pos.x, q.y - world.player.pos.y) > this.config.populationRadius) continue;
      const content = this.config.content.find(c => c.id === p.content)!;
      if([...this.paged.keys()].some(id=>{try{return (JSON.parse(id) as unknown[])[0]===p.id;}catch{return false;}}))continue;
      // Reserve every required field before spawning its garrison or reward.
      if(!this.fields.canAdmit(p,content.site?.altars??[])
        || !this.shrines.canAdmit(p,content.site?.shrines??[])
        || !this.puzzles.canAdmit(p,content.site?.puzzles??[]))continue;
      const capacity = Math.max(0, this.config.maxPopulation - this.reservedPopulation(p.id));
      const population = this.populationFor(p);
      const formation=massFormation(population.encounters,this.generator.run.seed,p.id);
      const count=formation?.seats.length??content.count;
      const coordinated = content.magicPack && population.level >= MAGIC_PACKS[content.magicPack.mechanic].minLevel;
      const staging = formation ? !this.state.claimed('native-formation',p.id)
        : coordinated && !this.state.claimed('native-cohort',p.id);
      const staged: { id: string; actor: Actor }[] = [];
      if (content.site || coordinated || formation) {
        // Reserve the whole site's/cohort's native population before introducing loot.
        // Saturation delays an encounter instead of furnishing free rewards.
        const identities = [...Array.from({ length: count }, (_, i) => canonical([p.id, i])),
          ...(content.site?.fixtures ?? []).map((_, i) => canonical([p.id, 'fixture', i]))];
        const missing = identities.filter(id => !this.hasNative(id) && !this.state.claimed('fallen', id)).length;
        if (this.population + missing + this.puzzles.missing(p,content.site?.puzzles??[]) > capacity) continue;
        for (const [index, fixture] of (content.site?.fixtures ?? []).entries()) {
          const id = canonical([p.id, 'fixture', index]);
          if (this.hasNative(id) || this.state.claimed('fallen', id) || this.population >= capacity) continue;
          const offset = siteOffset(p, fixture.x, fixture.y);
          const a = this.births.create(world,id,fixture.monster,population.level);
          applyMassTerritory(a, this.config.territory);
          const spot = world.findFreeSpot({ x: q.x + offset.x, y: q.y + offset.y }, a.radius);
          if (!this.walk.isWalkable(spot.x, spot.y) || world.pointInSolid(spot.x, spot.y, a.radius)
            || Math.hypot(spot.x - q.x, spot.y - q.y) > p.radius) continue;
          a.pos = spot; a.aiAnchor = {...spot}; a.fromZoneGen = true; a.fillResources();
          this.natives.set(id, a); world.actors.push(a);
          if(fixture.garrison && content.site?.completion)recordMassGuardian(world,this.state,id,a);
        }
      }
      // Bodies remain alive across EVERY page boundary. Do not replace a battle
      // with a lossy zone-enemy memo just to meet a streaming quota.
      const rng = massRandom(this.generator.run.seed, ['population', p.id, content.source]);
      const selected: string[] = [];
      for (let i = 0; i < count; i++) {
        const id = canonical([p.id, i]);
        const seat=formation?.seats[i];
        const monster = seat?.monster ?? rng.weighted(populationChoices(population, selected)).id;
        selected.push(monster);
        const angle = rng.range(0, Math.PI * 2), radius = rng.range(30, p.radius * .65);
        const def = MONSTERS[monster];
        const scale = def.scaleVariance ? rng.range(...def.scaleVariance) : 1;
        if (this.hasNative(id) || this.state.claimed('fallen', id) || this.population >= capacity) continue;
        const offset=seat?siteOffset(p,seat.x,seat.y):undefined;
        const spot = this.walk.snapToWalkable({ x: q.x + (offset?.x ?? Math.cos(angle) * radius),
          y: q.y + (offset?.y ?? Math.sin(angle) * radius) });
        if (!this.walk.isWalkable(spot.x, spot.y) || Math.hypot(spot.x - q.x, spot.y - q.y) > p.radius) continue;
        const a = this.births.create(world,id,monster,population.level,scale);
        applyMassTerritory(a, this.config.territory);
        const bodyRadius = a.radius * (coordinated ? RARITY_DEFS.magic.sizeMul : 1);
        let free = world.findFreeSpot(spot, bodyRadius);
        const fits=()=>this.walk.isWalkable(free.x,free.y)&&!world.pointInSolid(free.x,free.y,bodyRadius)
          &&Math.hypot(free.x-q.x,free.y-q.y)<=Math.min(p.radius,formation
            ? ENCOUNTER_GROUPS[formation.recipe].radius??ENCOUNTER_GROUP_CFG.radius : p.radius)
          &&(!formation||staged.every(s=>Math.hypot(free.x-s.actor.pos.x,free.y-s.actor.pos.y)
            >=bodyRadius+s.actor.radius+ENCOUNTER_GROUP_CFG.bodyClearance));
        if(formation){
          const seating=massRandom(this.generator.run.seed,['formation-seating',p.id,i]);
          for(let attempt=1;!fits()&&attempt<ENCOUNTER_GROUP_CFG.placementAttempts;attempt++){
            const jitter=attempt*ENCOUNTER_GROUP_CFG.placementJitter;
            free=world.findFreeSpot({x:spot.x+seating.range(-jitter,jitter),y:spot.y+seating.range(-jitter,jitter)},bodyRadius);
          }
        }
        if(!fits())continue;
        if(offset)a.facing=offset.angle;
        a.pos = free; a.aiAnchor = {...free}; a.fromZoneGen = true; a.fillResources();
        if (staging) staged.push({id,actor:a});
        else {
          this.natives.set(id, a); world.actors.push(a);
          if(content.site?.completion)recordMassGuardian(world,this.state,id,a);
        }
      }
      // Admission is atomic: never expose half a cohort, then heal/promote
      // its wounded survivors when a later placement finally succeeds.
      if(formation&&staging&&staged.length===count){
        const squad=world.nextSquadId();
        staged.forEach(({actor},i)=>applyEncounterGroup(actor,{id:squad,recipe:formation.recipe,slot:formation.seats[i].slot}));
        if(staged.every(s=>!!s.actor.encounterGroup)){
          for(const {id,actor} of staged){
            if(actor.squadLeader)actor.name=ENCOUNTER_GROUPS[formation.recipe].name+' — '+actor.name;
            actor.fillResources();this.natives.set(id,actor);world.actors.push(actor);
            if(content.site?.completion)recordMassGuardian(world,this.state,id,actor);
          }
          this.state.claim('native-formation',p.id);
        }
      }
      if (!formation && staging && staged.length === count
        && world.promoteMagicPack(staged.map(s=>s.actor),content.magicPack!.mechanic)) {
        for (const {id,actor} of staged) {
          this.natives.set(id,actor); world.actors.push(actor);
          if(content.site?.completion)recordMassGuardian(world,this.state,id,actor);
        }
        this.state.claim('native-cohort',p.id);
        world.refreshMagicPacks();
      }
      if (content.site) {
        const ready = massGarrisonSlots(content,p.id,count)
          .every(id => this.hasNative(id) || this.state.claimed('fallen', id));
        if (ready) {
          this.fields.admit(world,p,content.site.altars ?? [],q,population.level);
          this.shrines.admit(world,p,content.site.shrines ?? [],q);
          this.puzzles.admit(world,p,{rows:content.site.puzzles ?? [],center:q,level:population.level});
        }
        const cache = content.site.cache;
        if (ready && cache && !this.state.claimed('site-cache', p.id)) {
          const offset = siteOffset(p, cache.x, cache.y);
          const spot = world.findFreeSpot({ x: q.x + offset.x, y: q.y + offset.y }, 20);
          if (this.walk.isWalkable(spot.x, spot.y) && !world.pointInSolid(spot.x, spot.y, 20)
            && Math.hypot(spot.x - q.x, spot.y - q.y) < p.radius && this.state.claim('site-cache', p.id))
            world.chests.push({ pos: spot, kind: 'timed', mimic: false, opened: false,
              lockTime: cache.holdSeconds, maxLock: cache.holdSeconds, rewardLevel: population.level,
              rewardSource: canonical([p.id, 'cache']) });
        }
      }
    }
    this.updateNativePaging(world);
  }
  private restoreNativeBody(world:World,e:MassEnemySave,groups:Map<number,number>,formations:Map<number,number>):Actor {
    if(!e.id||!MONSTERS[e.monster]||!Number.isSafeInteger(e.level)||e.level<1
      ||![e.x,e.y,e.life,e.scale].every(Number.isFinite)||e.life<=0||e.scale<=0
      ||e.magicPack&&(!readMagicPack(e.magicPack)||typeof e.name!=='string')
      ||e.encounterGroup&&(!readEncounterGroup(e.encounterGroup)||typeof e.name!=='string'||!!e.magicPack)
      ||(this.config.nativeBirthSource||e.birth!==undefined)&&!validMassBirth(e.birth!))throw Error('Invalid paged native survivor');
        const a = this.births.create(world,e.id,e.monster,e.level,e.scale,e.birth);
        applyMassTerritory(a, this.config.territory);
        const pack = readMagicPack(e.magicPack);
        if (pack) {
          if (!groups.has(pack.id)) groups.set(pack.id,world.nextSquadId());
          a.magicPack = { ...pack, id: groups.get(pack.id)! };
          a.squadId = a.magicPack.id; a.squadLeader = a.magicPack.leader === 1;
          world.promoteMonster(a,'magic',1,{distinctName:e.name});
        }
        const formation=readEncounterGroup(e.encounterGroup);
        if(formation){
          if(!formations.has(formation.id))formations.set(formation.id,world.nextSquadId());
          applyEncounterGroup(a,{...formation,id:formations.get(formation.id)!});
          if(!a.encounterGroup)throw Error('Invalid saved worldmass formation member');
          a.name=e.name!;
        }
        a.pos = { x: e.x, y: e.y }; a.fromZoneGen = true; a.fillResources();
        a.aiAnchor = { ...(e.anchor ?? a.pos) };
        // Preserve the native return hysteresis, never an unwarned attack phase.
        if(e.leashHome) a.aiPhase = 'leash_home';
            a.life=Math.min(a.maxLife(),e.life);return a;
  }
  private pagingCurrent(world:World):boolean{return !this.disposed&&this.attached&&world.massRuntime===this&&world.zone.id===MASS_ZONE;}
  private updateNativePaging(world:World):void {
    if(!this.dormancy||!characterPagingAvailable()||!this.pagingCurrent(world))return;
    const observers=world.actors.filter(a=>!a.dead&&a.team!=='enemy');
    const near=(positions:readonly {x:number;y:number}[],radius:number)=>positions.some(p=>observers.some(a=>Math.hypot(a.pos.x-p.x,a.pos.y-p.y)<=radius));
    // At most two detached page reads. Until complete, every native identity
    // remains present in the ledger and suppresses replacement births/rewards.
    for(const page of new Set(this.paged.values())){
      if(this.pagingReads.size>=2)break;
      if(this.pagingReads.has(page.ref.key)||(this.pagingRetry.get(page.ref.key)??0)>world.time
        ||!near(page.positions,this.dormancy.policy.wakeRadius+this.config.populationRadius))continue;
      const task=(async()=>{
        const data=await loadCharacterNativePage(page);
        if(!this.pagingCurrent(world))return;
        if(data.configHash!==this.configHash)throw Error('Native page config mismatch');
        const groups=new Map<number,number>(),formations=new Map<number,number>(),player=world.player;
        const restored=await hydrateNativeCohort({readPage:async()=>JSON.stringify(data.cohort)},page.ref,this.origin,
          this.config.terrain.addressSpan,player,{create:d=>{
            const e=data.enemies.find(e=>e.id===d.id);if(!e)throw Error('Missing native page baseline');
            return this.restoreNativeBody(world,e,groups,formations);
          },groups:()=>{}});
        if(!this.pagingCurrent(world)||world.player!==player)return;
        if(page.ids.some(id=>this.natives.has(id)||this.paged.get(id)!==page))throw Error('Stale native page publication');
        this.dormancy!.adoptSleeping([...restored.actors.values()]);
        for(const [id,a]of restored.actors){this.natives.set(id,a);this.paged.delete(id);}
        forgetCharacterNativePage(world,page);this.pagingRetry.delete(page.ref.key);
        this.dormancy!.update(world,this.natives);world.refreshMagicPacks();
      })();
      this.pagingReads.set(page.ref.key,task);
      void task.catch(error=>{this.pagingRetry.set(page.ref.key,world.time+5);console.error('[worldmass] native page unavailable; retained its identities:',error);})
        .finally(()=>this.pagingReads.delete(page.ref.key));
    }
    // Bound eligible history, not unsupported mechanics. Those remain pinned.
    if(this.pagingWrite||world.time<this.nextPaging||this.natives.size<=Math.max(192,this.config.maxPopulation*2))return;
    this.nextPaging=world.time+2;
    const byGroup=new Map<string,string[]>();
    for(const [id,a]of this.natives){const key=a.squadId===undefined?'body:'+id:'squad:'+a.squadId;
      const group=byGroup.get(key)??[];group.push(id);byGroup.set(key,group);}
    const groups=[...byGroup.values()],selected:string[]=[];
    const cursor=this.pagingCursor;
    for(let i=0;i<groups.length;i++){
      const index=(cursor+i)%groups.length,ids=groups[index];
      if(selected.length+ids.length>96)continue;
      if(ids.some(id=>{const a=this.natives.get(id)!;return !this.dormancy!.isSleeping(a)||near([a.pos],this.dormancy!.policy.sleepRadius+256);}))continue;
      selected.push(...ids);this.pagingCursor=(index+1)%groups.length;
      if(selected.length>=96)break;
    }
    if(!selected.length)return;
    let lease;
    try{lease=stageNativeCohort(this.generator.run.runId,'native/'+crypto.randomUUID(),this.origin,this.config.terrain.addressSpan,
      world,this.natives,selected,this.dormancy,(id,a)=>({id,monster:a.defId!,level:a.level,provenance:{birth:this.births.of(a)}}));}
    catch(error){this.pagingRefusal=String(error);return;} // Unsupported dependencies retain their exact live owners.
    this.pagingRefusal="";
    const held=lease,valid=()=>this.pagingCurrent(world)&&held.revalidate()
      &&selected.every(id=>{const a=this.natives.get(id);return !!a&&!near([a.pos],this.dormancy!.policy.sleepRadius);});
    const task=commitCharacterNativeCohort(world,{...lease,revalidate:valid},entry=>{
      if(!valid())throw Error('Native changed before release');
      const actors=selected.map(id=>this.natives.get(id)!);
      this.dormancy!.release(actors);
      for(const id of selected){this.natives.delete(id);this.paged.set(id,entry);}
      world.actorGridRev++;
    });
    this.pagingWrite=task;
    void task.catch(error=>console.error('[worldmass] page commit failed; natives retained:',error)).finally(()=>{this.pagingWrite=null;});
  }
  snapshot(world: World): MassAdventureSave {
    const enemies: MassEnemySave[] = [];
    for (const [id, a] of this.natives) {
      if (a.dead) { this.state.claim('fallen', id); continue; }
      enemies.push({ id, monster: a.defId!, level: a.level, x: a.pos.x, y: a.pos.y, life: a.life, scale: a.spawnScale ?? 1,
        anchor: {...(a.aiAnchor ?? a.pos)}, ...(a.aiPhase === 'leash_home' ? {leashHome:true} : {}),
        ...(a.magicPack ? { magicPack: a.magicPack, name: a.name } : {}),
        ...(a.encounterGroup ? {encounterGroup:a.encounterGroup,name:a.name} : {}),
        ...(this.births.of(a) ? {birth:this.births.of(a)} : {}) });
    }
    return JSON.parse(JSON.stringify({ schema: this.config.geography ? 11 : this.config.dormancy || this.config.shrineResidency || this.config.puzzleResidency || this.config.nativeCountry ? 10 : this.config.bounties !== undefined ? 9 : this.config.journey?.reservePopulation !== undefined ? 8 : this.config.rewards?.earnFrom !== undefined ? 7 : this.config.settlement?.structurePlans !== undefined ? 6 : this.config.settlement?.quests?.acceptance === 'journal' ? 5 : this.config.content.some(c=>c.site?.puzzles?.length) ? 4 : this.config.journey?.roadside ? 3 : this.config.content.some(c => c.site?.shrines?.length) ? 2 : 1, config: this.config, configHash: this.configHash, state: this.state.snapshot(),
      ...(this.config.rewards ? { rewards: this.rewards.snapshot() } : {}),
      ...(this.fields.snapshot().length ? { fields: this.fields.snapshot() } : {}),
      ...(this.shrines.snapshot().length ? { shrines: this.shrines.snapshot() } : {}),
      ...(this.puzzles.snapshot(world).length ? { puzzles: this.puzzles.snapshot(world) } : {}),
      ...(this.dormancy ? {dormancy:this.dormancy.snapshot(this.natives,world)} : {}),
      ...(this.nativeFeatures ? {nativeFeatures:this.nativeFeatures.snapshot(world.time)} : {}),
      ...(this.geography ? {geography:this.geography.snapshot()} : {}),
      ...(this.weather ? {weather:this.weather.snapshot()} : {}),
      ...(this.snow ? {snow:this.snow.snapshot()} : {}),
      ...(this.storms ? {storms:this.storms.snapshot()} : {}),
      origin: this.origin, player: { ...world.player.pos, tier: world.player.tier ?? 0 }, enemies,
      ...(this.settlement ? { settlement: this.settlement.snapshot(world) } : {}),
      ...(this.ecology ? { ecology: this.ecology.snapshot(world) } : {}), sites: this.sites.snapshot(world), contents: captureZoneContents(world) })) as MassAdventureSave;
  }
  get population(): number { return (this.dormancy?.activeCount(this.natives) ?? this.natives.size) + this.puzzles.population + (this.nativeHost?.population ?? 0) + (this.geography?.population ?? 0); }
}
