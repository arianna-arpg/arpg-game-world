import { Rng } from '../core/rng';
import { skyOf, type ZoneDef } from '../data/zones';
import { NO_BIAS, type OverlayView, type SpawnBias } from '../world/overlay';
import { WEATHER_DEFS, WEATHER_FIELD, WeatherField, type WeatherFront } from '../world/weather';
import { address, floorDiv, latticeAt, localOffset, type MassAddress, type MassPoint } from './address';
import { canonical, freezeData, massDigest, streamSeed } from './random';

export interface MassWeatherPolicy {
  source: string; version: 1; sectorSpan: number; unitsPerNode: number;
  cohortSeconds: number; cacheSize: number; spawnScale: number; concurrencyScale: number;
}
export interface MassWeatherScales { spawnScale: number; concurrencyScale: number }
export interface MassWeatherEpoch extends MassWeatherScales { from: number }
export interface MassWeatherSave {
  schema: 1; seed: number; addressSpan: number; policy: MassWeatherPolicy; registry: string; clock: number; epochs?: MassWeatherEpoch[];
}
export const MASS_WEATHER_DEFAULT: Readonly<MassWeatherPolicy> = freezeData({
  source: 'native-geographic-weather', version: 1, sectorSpan: 21600, unitsPerNode: 20,
  cohortSeconds: 600, cacheSize: 128, spawnScale: 1, concurrencyScale: 1,
});
const NATIVE_STEP = WEATHER_FIELD.step;
interface Cohort { field: WeatherField; view: OverlayView; start: number; through: number; end: number }
interface Winner { field: WeatherField; query: ZoneDef; front: WeatherFront; origin: MassAddress; offset: MassPoint }
const copy = <T>(v: T): T => JSON.parse(canonical(v)) as T;

/** A geographic sky, independent of render residency and the viewing order.
 * Each fixed sector/time cohort runs the real native WeatherField. Finite native
 * lifetimes let a query replay only bounded recent cohorts, including neighbors
 * whose fronts can drift here. No zoneMap entries or viewer-triggered births.
 * Climate context must come from the run's frozen native country definitions. */
export class MassWeather {
  readonly policy: Readonly<MassWeatherPolicy>;
  readonly maxLife: number;
  readonly reach: number;
  readonly registry: string;
  private clock = 0;
  private epochs: MassWeatherEpoch[];
  private cache = new Map<string, Cohort>();
  private steps = 0;
  private queries = new Map<string, { origin: MassAddress; field: WeatherField }>();
  /** Share exact point reads among storm, wind, snow and AI in one weather
   * frame. Context identity and live shelter gates remain part of every read. */
  private samples=new Map<string,{context:ZoneDef;winner:Winner|null}>();
  private sampleCounts={hits:0,misses:0};
  constructor(readonly seed: number, readonly addressSpan: number,
    private contextAt: (at: MassAddress) => ZoneDef | undefined,
    policy: MassWeatherPolicy = MASS_WEATHER_DEFAULT, saved?: MassWeatherSave) {
    if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(addressSpan) || addressSpan < 1 || !policy.source || policy.version !== 1
      || !Number.isSafeInteger(policy.sectorSpan) || policy.sectorSpan < 1000 || policy.sectorSpan > 1e6
      || !Number.isFinite(policy.unitsPerNode) || policy.unitsPerNode <= 0 || policy.unitsPerNode > 100
      || !Number.isSafeInteger(policy.cohortSeconds) || policy.cohortSeconds < 60 || policy.cohortSeconds > 3600
      || !Number.isSafeInteger(policy.cacheSize) || policy.cacheSize < 1 || policy.cacheSize > 1024
      || !Number.isFinite(policy.spawnScale) || policy.spawnScale < 0 || policy.spawnScale > 32
      || !Number.isFinite(policy.concurrencyScale) || policy.concurrencyScale <= 0 || policy.concurrencyScale > 8)
      throw Error('Invalid geographic weather policy');
    this.policy = freezeData(copy(policy));
    this.epochs = [{ from: 0, spawnScale: policy.spawnScale, concurrencyScale: policy.concurrencyScale }];
    this.registry = massDigest({ definitions: WEATHER_DEFS, grammar: WEATHER_FIELD });
    this.maxLife = WEATHER_FIELD.life[1] * Math.max(1, ...Object.values(WEATHER_DEFS).filter(d => d.skyWeight && !d.eventOnly)
      .map(d => Object.values(d.lingerGeo ?? {}).reduce((n, b) => n * Math.max(1, b.mul), 1)));
    this.reach = (Math.SQRT2 * WEATHER_FIELD.birthOffset + WEATHER_FIELD.radius[1] + WEATHER_FIELD.speed[1] * this.maxLife) * policy.unitsPerNode;
    if (!Number.isFinite(this.maxLife) || this.maxLife > 3600 || Math.ceil(this.reach / policy.sectorSpan) > 8)
      throw Error('Native weather exceeds bounded geographic replay contract');
    if (saved) {
      if (saved.schema !== 1 || saved.seed !== seed || saved.addressSpan !== addressSpan || saved.registry !== this.registry
        || canonical(saved.policy) !== canonical(policy)) throw Error('Incompatible geographic weather checkpoint');
      if(saved.epochs){
        const limit=Math.ceil((this.maxLife+policy.cohortSeconds)/NATIVE_STEP)+3;
        if(!Array.isArray(saved.epochs)||!saved.epochs.length||saved.epochs.length>limit)throw Error('Invalid weather scale history');
        for(let i=0;i<saved.epochs.length;i++){const e=saved.epochs[i];this.validateScales(e);
          if(!Number.isFinite(e.from)||e.from<0||e.from%NATIVE_STEP!==0||e.from>Math.floor(saved.clock/NATIVE_STEP)*NATIVE_STEP+NATIVE_STEP
            ||i>0&&e.from<=saved.epochs[i-1].from)throw Error('Invalid weather scale epoch');}
        const oldest=Math.max(0,Math.floor((saved.clock-this.maxLife)/policy.cohortSeconds))*policy.cohortSeconds;
        if(saved.epochs[0].from>oldest)throw Error('Incomplete weather scale history');
        this.epochs=copy(saved.epochs);
      }
      this.advanceTo(saved.clock);
    }
  }
  get time(): number { return this.clock; }
  get stats() {
    return { cohorts: this.cache.size, replaySteps: this.steps, maxLife: this.maxLife, reach: this.reach,
      samples:this.samples.size,sampleHits:this.sampleCounts.hits,sampleMisses:this.sampleCounts.misses };
  }
  private validateScales(scales: MassWeatherScales):void {
    if(!scales||!Number.isFinite(scales.spawnScale)||scales.spawnScale<0||scales.spawnScale>32
      ||!Number.isFinite(scales.concurrencyScale)||scales.concurrencyScale<=0||scales.concurrencyScale>8)
      throw Error('Invalid native weather scales');
  }
  /** Resolve gates before the next native half-step. A later level/settings
   * change cannot rewrite already simulated or never-visited past weather. */
  setScales(clock:number,scales:MassWeatherScales):void {
    this.validateScales(scales);this.advanceTo(clock);
    const from=clock===0?0:(Math.floor(clock/NATIVE_STEP)+1)*NATIVE_STEP;
    const prior=this.epochs.at(-1)!;
    if(prior.spawnScale===scales.spawnScale&&prior.concurrencyScale===scales.concurrencyScale)return;
    const epoch={from,spawnScale:scales.spawnScale,concurrencyScale:scales.concurrencyScale};
    if(prior.from===from)this.epochs[this.epochs.length-1]=epoch;else this.epochs.push(epoch);
    this.queries.clear();this.samples.clear();
  }
  private scalesAt(clock:number):MassWeatherScales {
    let lo=0,hi=this.epochs.length-1;
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(this.epochs[mid].from<=clock)lo=mid;else hi=mid-1;}
    return this.epochs[lo];
  }
  advanceTo(clock: number): void {
    if (!Number.isFinite(clock) || clock < this.clock || clock < 0 || clock > Number.MAX_SAFE_INTEGER / 4)
      throw Error('Invalid geographic weather clock');
    if (clock !== this.clock) {this.queries.clear();this.samples.clear();}
    this.clock = clock;
    const oldest=Math.max(0,Math.floor((clock-this.maxLife)/this.policy.cohortSeconds))*this.policy.cohortSeconds;
    while(this.epochs.length>1&&this.epochs[1].from<=oldest)this.epochs.shift();
    for (const [key, c] of this.cache) if (c.end + this.maxLife < clock) this.cache.delete(key);
  }
  snapshot(): MassWeatherSave {
    return { schema: 1, seed: this.seed, addressSpan: this.addressSpan, policy: copy(this.policy), registry: this.registry, clock: this.clock, epochs: copy(this.epochs) };
  }
  sample(at: MassAddress, context: ZoneDef, local: MassPoint = { x: 0, y: 0 }): WeatherFront | null {
    if (![local.x, local.y].every(Number.isFinite)) throw Error('Invalid weather physics point');
    const win = this.winner(at, context); if (!win) return null;
    const f = win.front, scale = this.policy.unitsPerNode;
    return { ...f, pos: { x: local.x + (f.pos.x - win.offset.x) * scale, y: local.y + (f.pos.y - win.offset.y) * scale },
      vel: { x: f.vel.x * scale, y: f.vel.y * scale }, radius: f.radius * scale };
  }
  affectSpawns(at: MassAddress, context: ZoneDef): SpawnBias {
    const win = this.winner(at, context); return win ? win.field.affectSpawns(win.query) : NO_BIAS;
  }
  private center(dimension: string, gx: bigint, gy: bigint): MassAddress {
    const s = BigInt(this.addressSpan), p = BigInt(this.policy.sectorSpan);
    const x = gx * p + p / 2n, y = gy * p + p / 2n, cx = floorDiv(x, s), cy = floorDiv(y, s);
    return address(dimension, cx.toString(), cy.toString(), Number(x - cx * s), Number(y - cy * s), this.addressSpan);
  }
  private cohort(origin: MassAddress, gx: bigint, gy: bigint, index: number): Cohort | undefined {
    const key = JSON.stringify([origin.dimension, gx.toString(), gy.toString(), index]);
    let c = this.cache.get(key);
    if (!c) {
      const source = this.contextAt(origin); if (!source || skyOf(source) === 'sheltered') return undefined;
      const node: ZoneDef = { ...source, map: { x: 0, y: 0 } };
      const field = new WeatherField(new Rng(streamSeed(this.seed, [this.policy.source, this.policy.version,
        origin.dimension, gx.toString(), gy.toString(), index])));
      field.concurrencyScale = this.policy.concurrencyScale;
      const start = index * this.policy.cohortSeconds;
      c = { field, start, through: start, end: start + this.policy.cohortSeconds,
        view: { nodes: [node], allNodes: [node], byId: { [node.id]: node }, currentZoneId: node.id,
          time: start, terrain: () => 'land', census: {}, charLevel: 1, gates: new Map(), visited: new Set(), surveyed: new Set() } };
    }
    const target = Math.floor(this.clock / NATIVE_STEP) * NATIVE_STEP;
    while (c.through < target) {
      c.through += NATIVE_STEP; c.view.time = c.through;
      const scales=this.scalesAt(c.through);
      c.field.spawnScale = c.through <= c.end ? scales.spawnScale : 0;
      c.field.concurrencyScale = scales.concurrencyScale;
      c.field.update(NATIVE_STEP, c.view); this.steps++;
    }
    this.cache.delete(key); this.cache.set(key, c);
    while (this.cache.size > this.policy.cacheSize) this.cache.delete(this.cache.keys().next().value!);
    return c;
  }
  private winner(at: MassAddress, context: ZoneDef): Winner | null {
    if (at.dimension !== 'surface' || skyOf(context) === 'sheltered' || !this.clock) return null;
    const sampleKey=JSON.stringify([at.dimension,at.cx,at.cy,at.x,at.y]),sample=this.samples.get(sampleKey);
    if(sample&&sample.context===context){this.sampleCounts.hits++;return sample.winner;}
    this.sampleCounts.misses++;
    const result=this.findWinner(at,context);
    this.samples.set(sampleKey,{context,winner:result});
    if(this.samples.size>2048)this.samples.delete(this.samples.keys().next().value!);
    return result;
  }
  private findWinner(at:MassAddress,context:ZoneDef):Winner|null {
    const p = this.policy, grid = latticeAt(at, this.addressSpan, p.sectorSpan);
    const key = JSON.stringify([at.dimension, grid.gx.toString(), grid.gy.toString()]);
    let cached = this.queries.get(key);
    if (!cached) {
      const origin = this.center(at.dimension, grid.gx, grid.gy), field = new WeatherField(new Rng(1));
      const halo = Math.ceil(this.reach / p.sectorSpan);
      const newest = Math.floor(this.clock / p.cohortSeconds), oldest = Math.max(0, Math.floor((this.clock - this.maxLife) / p.cohortSeconds));
      for (let dy = -halo; dy <= halo; dy++) for (let dx = -halo; dx <= halo; dx++) {
        // Include a birth sector if a front can reach ANY point in this query
        // sector. Actor movement within it therefore never changes the sky set.
        const minX = Math.max(0, Math.abs(dx) * p.sectorSpan - p.sectorSpan / 2);
        const minY = Math.max(0, Math.abs(dy) * p.sectorSpan - p.sectorSpan / 2);
        if (Math.hypot(minX, minY) > this.reach) continue;
        const gx = grid.gx + BigInt(dx), gy = grid.gy + BigInt(dy), birth = this.center(at.dimension, gx, gy);
        for (let index = oldest; index <= newest; index++) {
          const c = this.cohort(birth, gx, gy, index); if (!c) continue;
          const fraction = this.clock - c.through;
          // A scratch field advances native fractional drift/ramp once for all
          // bodies sampling this geographic sector in the current world frame.
          const smooth = new WeatherField(new Rng(1)); smooth.spawnScale = 0;
          smooth.fronts.push(...c.field.fronts.map(f => ({ ...f, pos: { ...f.pos }, vel: { ...f.vel } })));
          if (fraction) smooth.update(fraction, c.view);
          for (const front of smooth.fronts) field.fronts.push({ ...front,
            pos: { x: front.pos.x + dx * p.sectorSpan / p.unitsPerNode, y: front.pos.y + dy * p.sectorSpan / p.unitsPerNode } });
        }
      }
      cached = { origin, field }; this.queries.set(key, cached);
      while (this.queries.size > 16) this.queries.delete(this.queries.keys().next().value!);
    }
    if(!cached.field.fronts.length)return null;
    const delta = localOffset(at, cached.origin, this.addressSpan, Math.ceil(p.sectorSpan / this.addressSpan) + 2);
    const offset = { x: delta.x / p.unitsPerNode, y: delta.y / p.unitsPerNode }, query = { ...context, map: offset };
    const front = cached.field.sample(query);
    return front ? { field: cached.field, query, front, origin: cached.origin, offset } : null;
  }
}
