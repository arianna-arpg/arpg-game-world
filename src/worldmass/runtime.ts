import type { World } from '../engine/world';
import type { Actor } from '../engine/actor';
import { MONSTERS } from '../data/monsters';
import { regionKind } from '../world/regions';
import { captureZoneContents, restoreZoneContents, savedZoneContents, type ZoneContents } from '../engine/zonecontents';
import { address, cellKey, localOffset, neighborCell, type MassCell } from './address';
import { MassGenerator, makeMassRun } from './generator';
import { canonical, freezeData, massDigest, massRandom } from './random';
import { MassState, type MassStateSave } from './state';
import { MassStream } from './stream';
import { MassWalk } from './walk';
import { MASS_ZONE, massAdventure, type MassAdventure } from './preset';

interface MassEnemySave { id: string; monster: string; level: number; x: number; y: number; life: number; scale: number }
export interface MassAdventureSave {
  schema: 1; config: MassAdventure; configHash: string; state: MassStateSave; origin: MassCell;
  player: { x: number; y: number }; enemies: MassEnemySave[]; contents: ZoneContents;
}
/** First engine adapter. Residency NEVER tears down the World, its actors, or
 * in-flight skills. The population cap is deliberately conservative until full
 * dependency-aware dormancy exists: wounded/engaged bodies are never discarded. */
export class WorldMassRuntime {
  readonly generator: MassGenerator;
  readonly state: MassState;
  readonly stream: MassStream;
  readonly walk: MassWalk;
  readonly config: Readonly<MassAdventure>;
  private natives = new Map<string, Actor>();
  private nearKey = '';
  private nextPopulation = 0;
  private places = new Map<string, ReturnType<MassGenerator['placesInCell']>>();
  readonly origin: MassCell;
  constructor(seed: number, runId: string, config: MassAdventure = massAdventure(), save?: MassAdventureSave) {
    this.config = freezeData(JSON.parse(canonical(config)) as MassAdventure);
    this.origin = Object.freeze(save ? { ...save.origin } : { dimension: 'surface', cx: '0', cy: '0' });
    address(this.origin.dimension, this.origin.cx, this.origin.cy, 0, 0, config.terrain.addressSpan);
    this.generator = new MassGenerator(save?.state.run ?? makeMassRun(seed, runId, config.terrain), config.terrain);
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
    if (new Set(config.content.map(c => c.id)).size !== config.content.length) throw new Error('Duplicate worldmass content');
    for (const c of config.content) {
      if (!c.id || !c.source || !Number.isSafeInteger(c.level) || c.level < 1 || c.level > 100
        || !Number.isSafeInteger(c.count) || c.count < 1 || c.count > 16 || !c.table.length
        || c.table.some(r => !MONSTERS[r.id] || !Number.isFinite(r.weight) || r.weight <= 0)) throw new Error('Invalid worldmass population');
    }
    if (config.terrain.places.some(p => !config.content.some(c => c.id === p.content))
      || config.terrain.surfaces.some(s => !regionKind(s.region))) throw new Error('Unresolved worldmass content');
    this.state = new MassState(this.generator.run, config.terrain.terrainCell);
    this.stream = new MassStream(this.generator, this.state, { maxPages: (config.pageRadius * 2 + 1) ** 2, maxSamples: 32768 });
    this.walk = new MassWalk(this.stream, this.origin);
    if (save) {
      if (save.schema !== 1 || save.configHash !== massDigest(config) || !Array.isArray(save.enemies)
        || save.enemies.length > config.maxPopulation || !savedZoneContents(save.contents)
        || !Number.isFinite(save.player?.x) || !Number.isFinite(save.player?.y)
        || new Set(save.enemies.map(e => e.id)).size !== save.enemies.length)
        throw new Error('Invalid worldmass checkpoint');
      for (const e of save.enemies) if (!e.id || !MONSTERS[e.monster] || !Number.isSafeInteger(e.level) || e.level < 1
        || ![e.x, e.y, e.life, e.scale].every(Number.isFinite) || e.life <= 0 || e.scale <= 0)
        throw new Error('Invalid worldmass survivor');
      this.state.restore(save.state);
      if (save.state.terrain.some(p => !regionKind(p.region))) throw new Error('Unresolved saved worldmass terrain');
    } else {
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
    world.zoneMap[MASS_ZONE] = { id: MASS_ZONE, name: 'The Unbroken Wilds', level: 1,
      size: { w: 1536, h: 1536 }, theme: JSON.parse(canonical(this.config.theme)),
      layout: [], objective: { kind: 'none', label: 'Explore the wilds' }, exits: [], map: { x: 0, y: 0 },
      biome: 'downs', sky: 'open', boundless: true, special: true, cohort: 'authored', townPortals: false,
      seed: this.generator.run.seed };
    // Exactly one conventional arrival. Future terrain pages never invoke it.
    world.loadZone(MASS_ZONE);
    world.massRuntime = this;
    world.walk = this.walk;
    world.doodads = [];
    world.exits = [];
    world.notices = []; world.texts = []; // obsolete graph directions do not describe this expedition
    // The authored surface owns its population; keep the existing carried party.
    world.actors = world.actors.filter(a => a.team !== 'enemy');
    world.landPartyAt(save?.player ?? { x: 12, y: 12 });
    if (save) {
      for (const e of save.enemies) {
        const a = world.createMonster(e.monster, e.level, 'enemy', undefined, { scale: e.scale });
        a.pos = { x: e.x, y: e.y }; a.fromZoneGen = true; a.fillResources();
        a.life = Math.min(a.maxLife(), e.life); this.natives.set(e.id, a); world.actors.push(a);
      }
      restoreZoneContents(world, save.contents);
    }
    this.update(world, true);
  }
  /** Survived-death wakes retain the run's land and consequences. */
  wake(world: World): void { world.landPartyAt({ x: 12, y: 12 }); this.nearKey = ''; }
  update(world: World, boot = false): void {
    if (world.zone.id !== MASS_ZONE) return;
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
        if (!this.places.has(k)) this.places.set(k, this.generator.placesInCell(cell));
      }
      this.state.claim('explored', key);
    }
    this.stream.step(boot ? this.stream.cols ** 2 * 9 : this.config.samplesPerTick);
    for (const [id, actor] of this.natives) if (actor.dead) {
      this.state.claim('fallen', id); this.natives.delete(id);
    }
    if (!boot && world.time < this.nextPopulation) return;
    this.nextPopulation = world.time + .5;
    const seen = new Set<string>();
    for (const places of this.places.values()) for (const p of places) {
      if (seen.has(p.id)) continue; seen.add(p.id);
      const q = localOffset(p.center, { ...this.origin, x: 0, y: 0 }, this.config.terrain.addressSpan);
      if (!q || Math.hypot(q.x, q.y) < this.config.startRadius + p.radius
        || Math.hypot(q.x - world.player.pos.x, q.y - world.player.pos.y) > this.config.populationRadius) continue;
      const content = this.config.content.find(c => c.id === p.content)!;
      // Bodies remain alive across EVERY page boundary. Do not replace a battle
      // with a lossy zone-enemy memo just to meet a streaming quota.
      const rng = massRandom(this.generator.run.seed, ['population', p.id, content.source]);
      for (let i = 0; i < content.count; i++) {
        const id = canonical([p.id, i]);
        const monster = rng.weighted(content.table).id;
        const angle = rng.range(0, Math.PI * 2), radius = rng.range(30, p.radius * .65);
        const def = MONSTERS[monster];
        const scale = def.scaleVariance ? rng.range(...def.scaleVariance) : 1;
        if (this.natives.has(id) || this.state.claimed('fallen', id) || this.natives.size >= this.config.maxPopulation) continue;
        const spot = this.walk.snapToWalkable({ x: q.x + Math.cos(angle) * radius, y: q.y + Math.sin(angle) * radius });
        if (!this.walk.isWalkable(spot.x, spot.y) || Math.hypot(spot.x - q.x, spot.y - q.y) > p.radius) continue;
        const a = world.createMonster(monster, content.level, 'enemy', undefined, { scale });
        a.pos = world.clampPos(spot, a.radius); a.fromZoneGen = true; a.fillResources();
        this.natives.set(id, a); world.actors.push(a);
      }
    }
  }
  snapshot(world: World): MassAdventureSave {
    const enemies: MassEnemySave[] = [];
    for (const [id, a] of this.natives) {
      if (a.dead) { this.state.claim('fallen', id); continue; }
      enemies.push({ id, monster: a.defId!, level: a.level, x: a.pos.x, y: a.pos.y, life: a.life, scale: a.spawnScale ?? 1 });
    }
    return JSON.parse(canonical({ schema: 1, config: this.config, configHash: massDigest(this.config), state: this.state.snapshot(),
      origin: this.origin, player: { ...world.player.pos }, enemies, contents: captureZoneContents(world) })) as MassAdventureSave;
  }
  get population(): number { return this.natives.size; }
}
