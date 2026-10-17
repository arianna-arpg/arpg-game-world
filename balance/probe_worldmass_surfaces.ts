/** Exact terrain/content parity against the archived 401dfdfa generator class.
 * The oracle is self-contained: no runtime Git checkout and no edited query
 * kernels are shared. Unchanged validation, address math and planner classes
 * remain common dependencies. --bench adds unmetered cold/warm fixed-work data. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import * as addresses from '../src/worldmass/address';
import { address, cellKey, localOffset, moveAddress, type MassAddress, type MassCell } from '../src/worldmass/address';
import type { MassPlace, MassPlaceRecipe, MassRange, MassRun, MassSpec, MassTerrain } from '../src/worldmass/contracts';
import { MassGenerator, makeMassRun, matchesMassRanges } from '../src/worldmass/generator';
import { MassNativeRegional } from '../src/worldmass/nativeRegional';
import { MassRegionalDiscoveries } from '../src/worldmass/regionalDiscoveries';
import { MassLandforms } from '../src/worldmass/landforms';
import { MassNativeSubstrate } from '../src/worldmass/nativeSubstrate';
import { MassTerrainPatches, patchBoxIntersects } from '../src/worldmass/terrainPatches';
import { canonical, freezeData, massRandom, streamSeed } from '../src/worldmass/random';
import { massNoise } from '../src/worldmass/noise';
import { massAdventure } from '../src/worldmass/preset';
import { beforeMassStreaming, beforeWildernessPaths } from './worldmassFixtures';
import { captureNativeGeographySource } from '../src/world/captureGeography';
import { makeMassNativeGeographySpec } from '../src/worldmass/nativeGeography';
import { makeSimWorld } from '../src/sim/arena';
void makeSimWorld;

const archivedSource = String.raw`export class MassGenerator {
  readonly spec: Readonly<MassSpec>;
  readonly run: Readonly<MassRun>;
  readonly patches: MassTerrainPatches | null;
  readonly landforms: MassLandforms | null;
  readonly nativeRegional: MassNativeRegional | null;
  readonly regionalDiscoveries: MassRegionalDiscoveries | null;
  readonly nativeSubstrate: MassNativeSubstrate | null;
  private readonly surfaces: MassSpec['surfaces'];
  private readonly salts = new Map<MassSpec['fields'][number]['layers'][number], number>();
  private readonly candidates = new Map<string, MassPlace | null>();
  private readonly decisions = new Map<string, boolean>();
  private readonly placePages = new Map<string, readonly MassPlace[]>();
  constructor(run: MassRun, spec: MassSpec) {
    const expected = makeMassRun(run.seed, run.runId, spec);
    if (canonical(run) !== canonical(expected)) throw new Error('World generator/content manifest mismatch');
    this.spec = freezeData(JSON.parse(canonical(spec)) as MassSpec);
    this.run = freezeData({ ...run });
    this.nativeSubstrate = Object.hasOwn(this.spec, 'nativeSubstrate') ? new MassNativeSubstrate(this.run, this.spec) : null;
    this.surfaces = [...this.spec.surfaces].sort((a, b) => b.priority - a.priority || compare(a.id, b.id));
    for (const f of this.spec.fields) for (const l of f.layers)
      this.salts.set(l, streamSeed(run.seed, [spec.id, spec.version, f.id, l.id]));
    this.nativeRegional = this.spec.nativeRegional ? new MassNativeRegional(this.spec,this.run,at=>this.baseTerrainAt(at),
      (origin,box)=>this.regionalLandformSites(origin,box,true),at=>this.nativeRegionalBiomeAt(at)) : null;
    this.landforms = Object.hasOwn(this.spec,'landforms') ? new MassLandforms(this.spec,this.run,
      at=>this.baseTerrainAt(at),(origin,box)=>this.patchSitesClear(origin,box,true), // landformHabitat owners compose with terrain
      this.nativeSubstrate ? (origin,size)=>this.nativeSubstrate!.supportsPatchCell(origin,size) : undefined,
      (origin,box)=>this.regionalLandformSites(origin,box)) : null;
    this.regionalDiscoveries = this.spec.regionalDiscoveries ? new MassRegionalDiscoveries(this) : null;
    this.patches = Object.hasOwn(this.spec, 'patches') && this.spec.patches ? new MassTerrainPatches(this.spec, this.run,
      at => this.baseTerrainAt(at), (origin, box) => this.patchSitesClear(origin, box)
        && !this.landforms?.reserves(moveAddress(origin,{x:(box.minX+box.maxX)/2,y:(box.minY+box.maxY)/2},this.spec.addressSpan),
          Math.hypot(box.maxX-box.minX,box.maxY-box.minY)/2),
      this.nativeSubstrate ? (origin, size) => this.nativeSubstrate!.supportsPatchCell(origin, size) : undefined) : null;
  }
  /** Content consumers include nested owners; terrain admission uses placesInCell alone. */
  regionalPlacesInCell(cell: MassCell): readonly MassPlace[] {
    const ordinary=[...this.placesInCell(cell),...(this.nativeRegional?.inCell(cell)??[])];
    return this.regionalDiscoveries ? Object.freeze([...ordinary,...this.regionalDiscoveries.inCell(cell)].sort((a,b)=>compare(a.id,b.id))) : ordinary;
  }
  /** WildernessPaths query accepted site footprints once per bounded district;
   * population anchors cannot obstruct a path and need not be enumerated. */
  wildernessSites(origin:MassAddress,size:number):readonly MassPlace[]{
    if(!Number.isSafeInteger(size)||size<1||size>9600)throw Error('Invalid wildernessSites query');
    const span=this.spec.addressSpan,result:MassPlace[]=[];
    for(const recipe of this.spec.places){
      if(recipe.landformHabitat)continue;
      const lo=latticeAt(moveAddress(origin,{x:-recipe.radius,y:-recipe.radius},span),span,recipe.period);
      const hi=latticeAt(moveAddress(origin,{x:size+recipe.radius,y:size+recipe.radius},span),span,recipe.period);
      if((hi.gx-lo.gx+1n)*(hi.gy-lo.gy+1n)>4096n)throw Error('WildernessPaths site budget exceeded');
      for(let gy=lo.gy;gy<=hi.gy;gy++)for(let gx=lo.gx;gx<=hi.gx;gx++){
        const p=this.candidate(recipe,origin.dimension,gx,gy);if(!p||!this.accepted(p,recipe))continue;
        const q=localOffset(p.center,origin,span,64);
        if(Math.hypot(Math.max(0,-q.x,q.x-size),Math.max(0,-q.y,q.y-size))<=p.radius)result.push(p);
      }
    }
    return Object.freeze(result.sort((a,b)=>compare(a.id,b.id)));
  }
  private noise(at: MassAddress, period: number, salt: number): number {
    return massNoise(at, this.spec.addressSpan, period, salt);
  }
  fieldsAt(at: MassAddress): Readonly<Record<string, number>> {
    if (this.nativeSubstrate) return this.nativeSubstrate.fieldsAt(at);
    const result: Record<string, number> = Object.create(null) as Record<string, number>;
    for (const f of this.spec.fields) {
      let value = f.base;
      for (const l of f.layers) {
        const n = this.noise(at, l.period, this.salts.get(l)!);
        value += (l.ridge ? (1 - Math.abs(n * 2 - 1)) ** 2 : n * 2 - 1) * l.amplitude;
      }
      result[f.id] = value;
    }
    return Object.freeze(result);
  }
  terrainAt(at: MassAddress): MassTerrain {
    const base = this.baseTerrainAt(at);
    const nativeRegionalTerrain = this.nativeRegional?.sample(at,base);
    if(nativeRegionalTerrain)return nativeRegionalTerrain;
    const landformTerrain = this.landforms?.sample(at,base) ?? base;
    return this.patches?.sample(at, landformTerrain) ?? landformTerrain;
  }
  private patchSitesClear(origin: MassAddress, box: MassPatchBox, landformHabitats = false): boolean {
    if(this.nativeRegional?.reserves(moveAddress(origin,{x:(box.minX+box.maxX)/2,y:(box.minY+box.maxY)/2},this.spec.addressSpan),
      Math.hypot(box.maxX-box.minX,box.maxY-box.minY)/2))return false;
    const span = this.spec.addressSpan;
    const lo = moveAddress(origin, { x: box.minX, y: box.minY }, span);
    const hi = moveAddress(origin, { x: box.maxX, y: box.maxY }, span);
    for (let y = BigInt(lo.cy); y <= BigInt(hi.cy); y++) for (let x = BigInt(lo.cx); x <= BigInt(hi.cx); x++) {
      for (const place of this.placesInCell({ dimension: origin.dimension, cx: x.toString(), cy: y.toString() })) {
        if (landformHabitats && this.spec.places.find(p=>p.id===place.recipe)?.landformHabitat) continue;
        const q = localOffset(place.center, origin, span, 100000);
        if (patchBoxIntersects(box, q.x, q.y, place.radius)) return false;
      }
    }
    return true;
  }
  /** Enumerate protected geographic sites once per large footprint, independent
   * of streamed pages. Ordinary habitat packs remain terrain-compatible. */
  private regionalLandformSites(origin:MassAddress,box:MassPatchBox,nativeRegionalAdmission=false):import('./regionalLandformComposition').RegionalLandformSite[]|null {
    const span=this.spec.addressSpan,result:import('./regionalLandformComposition').RegionalLandformSite[]=[];
    let budget=0;
    for(const recipe of this.spec.places) {
      if(recipe.landformHabitat)continue;
      const pad=recipe.radius+(nativeRegionalAdmission?this.spec.nativeRegional!.clearance:this.spec.landforms!.regional!.siteApron);
      const lo=latticeAt(moveAddress(origin,{x:box.minX-pad,y:box.minY-pad},span),span,recipe.period);
      const hi=latticeAt(moveAddress(origin,{x:box.maxX+pad,y:box.maxY+pad},span),span,recipe.period);
      const count=(hi.gx-lo.gx+1n)*(hi.gy-lo.gy+1n);
      if(count>4096n||budget+Number(count)>8192)return null;
      budget+=Number(count);
      for(let gy=lo.gy;gy<=hi.gy;gy++)for(let gx=lo.gx;gx<=hi.gx;gx++) {
        const place=this.candidate(recipe,origin.dimension,gx,gy);if(!place)continue;
        const q=localOffset(place.center,origin,span,100000);
        if(patchBoxIntersects(box,q.x,q.y,pad)&&this.accepted(place,recipe)) {
          result.push({id:place.id,x:q.x,y:q.y,radius:place.radius});if(result.length>32)return null;
        }
      }
    }
    if(!nativeRegionalAdmission)result.push(...(this.nativeRegional?.reservations(origin,box)??[]));
    return result;
  }
  /** Place surfaces change material/color, never the geographic biome. Native
   * locale selection needs only that biome; defer expensive place-page reads
   * until the complete source passes its protected-site admission. */
  private nativeRegionalBiomeAt(at:MassAddress):string {
    const fields=this.fieldsAt(at);
    return this.surfaces.find(row=>matchesMassRanges(row.when,fields))!.biome;
  }
  /** Original policy, deliberately patch-free to keep candidate proofs acyclic. */
  private baseTerrainAt(at: MassAddress): MassTerrain {
    if (this.nativeSubstrate) return this.nativeSubstrate.sample(at);
    const fields = this.fieldsAt(at), s = this.surfaces.find(row => matchesMassRanges(row.when, fields))!;
    for (const place of this.spec.places.some(p => p.surface) ? this.placesInCell(at) : []) {
      const recipe = this.spec.places.find(p => p.id === place.recipe)!;
      if (!recipe.surface) continue;
      const offset = localOffset(at, place.center, this.spec.addressSpan);
      if (Math.hypot(offset.x, offset.y) <= place.radius) return Object.freeze({
        ...recipe.surface, biome: s.biome, fields,
        source: Object.freeze({ ...place.source, rule: recipe.id + '/surface' }),
      });
    }
    return Object.freeze({ region: s.region, color: s.color, biome: s.biome, fields,
      source: Object.freeze({ generator: this.spec.id, version: this.spec.version, rule: s.id,
        source: s.source ?? s.biome, stream: canonical([this.run.seed, 'terrain', cellKey(at)]) }) });
  }
  private candidate(recipe: MassPlaceRecipe, dimension: string, gx: bigint, gy: bigint): MassPlace | null {
    const key = JSON.stringify([recipe.id, dimension, gx.toString(), gy.toString()]);
    if (this.candidates.has(key)) return this.candidates.get(key)!;
    const result = this.makeCandidate(recipe, dimension, gx, gy);
    this.candidates.set(key, result);
    if (this.candidates.size > 8192) this.candidates.delete(this.candidates.keys().next().value!);
    return result;
  }
  private makeCandidate(recipe: MassPlaceRecipe, dimension: string, gx: bigint, gy: bigint): MassPlace | null {
    const namespace = [this.spec.id, this.spec.version, 'place', recipe.id, recipe.version, dimension, gx.toString(), gy.toString()];
    const rng = massRandom(this.run.seed, namespace);
    if (!rng.chance(recipe.chance)) return null;
    const baseAxis = (g: bigint): [string, number] => {
      const n = g * BigInt(recipe.period), s = BigInt(this.spec.addressSpan), q = floorDiv(n, s);
      return [q.toString(), Number(n - q * s)];
    };
    const [cx, x] = baseAxis(gx), [cy, y] = baseAxis(gy);
    const center = address(dimension, cx, cy,
      x + recipe.period * (0.5 + rng.range(-0.5, 0.5) * recipe.jitter),
      y + recipe.period * (0.5 + rng.range(-0.5, 0.5) * recipe.jitter), this.spec.addressSpan);
    if (!matchesMassRanges(recipe.when, this.fieldsAt(center))) return null;
    return { id: canonical([this.run.runId, ...namespace]), recipe: recipe.id, content: recipe.content,
      center, radius: recipe.radius, source: { generator: this.spec.id, version: this.spec.version,
        rule: recipe.id, source: recipe.content, stream: canonical(namespace) } };
  }
  /** Local inhibition: no higher-ranked candidate may intersect this footprint.
   * Finite dependencies, no recursive packing, no late movement of existing sites. */
  private accepted(p: MassPlace, recipe: MassPlaceRecipe): boolean {
    const hit = this.decisions.get(p.id);
    if (hit !== undefined) return hit;
    const result = this.acceptCandidate(p, recipe);
    this.decisions.set(p.id, result);
    if (this.decisions.size > 4096) this.decisions.delete(this.decisions.keys().next().value!);
    return result;
  }
  private acceptCandidate(p: MassPlace, recipe: MassPlaceRecipe): boolean {
    for (const other of this.spec.places) {
      if (other.priority < recipe.priority) continue;
      const l = latticeAt(p.center, this.spec.addressSpan, other.period);
      const reach = Math.ceil((recipe.radius + other.radius) / other.period) + 2;
      for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
        const q = this.candidate(other, p.center.dimension, l.gx + BigInt(dx), l.gy + BigInt(dy));
        if (!q || q.id === p.id || other.priority < recipe.priority
          || (other.priority === recipe.priority && q.id > p.id)) continue;
        const offset = localOffset(q.center, p.center, this.spec.addressSpan, 100000);
        if (Math.hypot(offset.x, offset.y) < p.radius + q.radius) return false;
      }
    }
    return true;
  }
  /** Footprints can span pages; their identity/owner never depends on the query. */
  placesInCell(cell: MassCell): readonly MassPlace[] {
    const key = cellKey(cell), cached = this.placePages.get(key);
    if (cached) { this.placePages.delete(key); this.placePages.set(key, cached); return cached; }
    const s = this.spec.addressSpan, origin = address(cell.dimension, cell.cx, cell.cy, 0, 0, s);
    const result = new Map<string, MassPlace>();
    for (const recipe of this.spec.places) {
      const pad = recipe.radius + recipe.period;
      const lo = latticeAt(moveAddress(origin, { x: -pad, y: -pad }, s), s, recipe.period);
      const hi = latticeAt(moveAddress(origin, { x: s + pad, y: s + pad }, s), s, recipe.period);
      if ((hi.gx - lo.gx + 1n) * (hi.gy - lo.gy + 1n) > 4096n) throw new Error('Place query exceeds candidate budget');
      for (let gy = lo.gy; gy <= hi.gy; gy++) for (let gx = lo.gx; gx <= hi.gx; gx++) {
        const p = this.candidate(recipe, cell.dimension, gx, gy);
        if (!p) continue;
        const offset = localOffset(p.center, origin, s, 100000);
        const dx = Math.max(0, -offset.x, offset.x - s), dy = Math.max(0, -offset.y, offset.y - s);
        if (Math.hypot(dx, dy) <= p.radius && this.accepted(p, recipe)) result.set(p.id, freezeData(p));
      }
    }
    const page = Object.freeze([...result.values()].sort((a, b) => compare(a.id, b.id)));
    this.placePages.set(key, page);
    if (this.placePages.size > 128) this.placePages.delete(this.placePages.keys().next().value!);
    return page;
  }
}`;

assert.equal(createHash('sha256').update(archivedSource).digest('hex'),
  '76d7d64ba260899173646685ce1414a38d101b0a55e8201f20b704a7baa366e0', 'preserved 401dfdfa oracle must remain unchanged');
const oracleImports = { ...addresses, MassNativeRegional, MassRegionalDiscoveries, MassLandforms,
  MassNativeSubstrate, MassTerrainPatches, patchBoxIntersects, canonical, freezeData,
  massRandom, streamSeed, massNoise, makeMassRun, matchesMassRanges,
  compare: (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0 };
interface GeneratorPort {
  spec: Readonly<MassSpec>; run: Readonly<MassRun>;
  landforms: MassLandforms | null;
  fieldsAt(at: MassAddress): Readonly<Record<string, number>>;
  noise(at: MassAddress, period: number, salt: number): number;
  baseTerrainAt(at: MassAddress): MassTerrain;
  terrainAt(at: MassAddress): MassTerrain;
  placesInCell(at: MassCell): readonly MassPlace[];
  regionalPlacesInCell(at: MassCell): readonly MassPlace[];
  wildernessSites(at: MassAddress, size: number): readonly MassPlace[];
  candidate(recipe: MassPlaceRecipe, dimension: string, gx: bigint, gy: bigint): MassPlace | null;
  makeCandidate(recipe: MassPlaceRecipe, dimension: string, gx: bigint, gy: bigint): MassPlace | null;
  candidates: Map<string, MassPlace | null>;
  decisions: Map<string, boolean>;
  placePages: Map<string, readonly MassPlace[]>;
  surfacePages?: Map<string, readonly MassPlace[]>;
}
type GeneratorClass = new(run: MassRun, spec: MassSpec) => GeneratorPort;
const output = ts.transpileModule(archivedSource.replace('export class', 'class'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
const ArchivedGenerator = new Function(...Object.keys(oracleImports), output + '\nreturn MassGenerator;')
  (...Object.values(oracleImports)) as GeneratorClass;
const CurrentGenerator = MassGenerator as unknown as GeneratorClass;
const copy = <T>(value: T): T => JSON.parse(canonical(value)) as T;
const at = (x: number, y: number, dimension = 'surface') => address(dimension, '0', '0', x, y, 960);
const build = (Ctor: GeneratorClass, spec: MassSpec, seed = 713) => new Ctor(makeMassRun(seed, 'surface-query-proof', spec), spec);
const pair = (spec: MassSpec, seed = 713) => [build(ArchivedGenerator, spec, seed), build(CurrentGenerator, spec, seed)] as const;
let assertions = 0, tests = 0;
function same<T>(actual: T, expected: T, label: string): void {
  assert.deepEqual(actual, expected, label); assertions++;
}
function test(label: string, run: () => void): void { run(); tests++; console.log('PASS ' + label); }
function checkBase(p: readonly [GeneratorPort, GeneratorPort], where: MassAddress): void {
  same(p[1].baseTerrainAt(where), p[0].baseTerrainAt(where), 'complete base terrain including fields and provenance');
}
function checkPlaces(p: readonly [GeneratorPort, GeneratorPort], where: MassCell): void {
  same(p[1].placesInCell(where), p[0].placesInCell(where), 'complete sorted ordinary content');
}
const recipe = (id: string, overrides: Partial<MassPlaceRecipe> = {}): MassPlaceRecipe =>
  ({ id, version: 1, content: id, period: 240, chance: 1, radius: 120, jitter: 0, priority: 1, when: [], ...overrides });
const flat = (places: readonly MassPlaceRecipe[]): MassSpec => ({
  id: 'surface-page-proof', version: 1, addressSpan: 960, terrainCell: 30, fields: [],
  surfaces: [{ id: 'plain', priority: 0, when: [], region: 'ground', color: '#123456', biome: 'downs' }], places,
});
const paint = { region: 'sand', color: '#654321' };
const fresh = massAdventure();
const oldWilderness = beforeWildernessPaths(copy(fresh));
const oldStreaming = beforeMassStreaming(copy(fresh));
// Saved descriptors own their material choices; broad legacy sand is never rewritten.
oldStreaming.terrain.surfaces = oldStreaming.terrain.surfaces.map(s =>
  s.region === 'firm_sand' ? { ...s, region: 'sand' } : s);

test('surface tangency keeps original sorted ID precedence and inclusive footprint boundaries', () => {
  const p = pair(flat([recipe('paint', { surface: paint })]));
  const point = at(240, 120), covering = p[0].placesInCell(point).filter(place => {
    const q = localOffset(point, place.center, 960); return Math.hypot(q.x, q.y) <= place.radius;
  });
  assert.equal(covering.length, 2, 'fixture must have two accepted circles at one exact tangent');
  checkBase(p, point);
  same(p[1].baseTerrainAt(point).source.stream, covering[0].source.stream, 'lexical first ID wins tangent');
  for (const x of [0, 1e-7, 120, 240 - 1e-7, 240 + 1e-7, 960 - 1e-7, 960, 960 + 1e-7])
    for (const y of [0, 120, 240, 960]) checkBase(p, at(x, y));
  checkPlaces(p, point);
});

test('all-family inhibition retains non-surface priority and lexical ties', () => {
  for (const higher of [true, false]) {
    const spec = flat([
      recipe('zz-painted', { priority: 1, surface: paint }),
      recipe('aa-protected', { priority: higher ? 2 : 1 }),
      recipe('later-low-priority', { priority: 0, surface: { region: 'mud', color: '#987654' } }),
    ]);
    const p = pair(spec);
    checkBase(p, at(120, 120));
    assert.equal(p[1].baseTerrainAt(at(120, 120)).source.rule, 'plain');
    checkPlaces(p, at(120, 120));
    assert.ok(p[1].placesInCell(at(120, 120)).every(row => row.recipe === 'aa-protected'));
  }
  // A higher-priority surface must also retain its inhibition of plain content.
  const p = pair(flat([recipe('paint', { priority: 2, surface: paint }), recipe('ordinary', { priority: 1 })]));
  checkBase(p, at(120, 120)); checkPlaces(p, at(120, 120));
  assert.ok(p[1].placesInCell(at(120, 120)).every(row => row.recipe === 'paint'));
});

test('full BigInt addresses, dimensions, page edges and deterministic mixed query orders', () => {
  const spec = flat([
    recipe('water', { period: 360, radius: 130, chance: .7, jitter: .8, surface: { region: 'water', color: '#112233' } }),
    recipe('non-surface', { period: 270, radius: 110, chance: .8, priority: 2 }),
    recipe('sand', { period: 510, radius: 120, chance: .65, jitter: .6, surface: paint }),
  ]);
  spec.fields = [{ id: 'climate', base: .1, layers: [
    { id: 'wide', period: 7501, amplitude: .7 }, { id: 'local', period: 379, amplitude: -.3, ridge: true },
  ] }];
  spec.places = spec.places.map((r, i) => i === 1 ? r : { ...r, when: [{ field: 'climate', min: -.2, max: .65 }] });
  const coords = ['-9223372036854775000', '-9007199254740993', '-1', '0', '1', '9007199254740993'];
  for (const seed of [0, 713, 0xffffffff]) {
    const p = pair(spec, seed);
    for (let i = 0; i < coords.length; i++) for (const dimension of ['surface', 'cavern']) {
      const point = address(dimension, coords[i], coords[coords.length - i - 1], i % 2 ? 0 : 959.999999, 120.25, 960);
      if (i % 2) checkPlaces(p, point);
      checkBase(p, point);
      checkBase(p, moveAddress(point, { x: 960, y: -960 }, 960));
      checkPlaces(p, point);
      same(p[1].wildernessSites(point, 960), p[0].wildernessSites(point, 960), 'site enumeration after partial terrain reads');
      same(p[1].regionalPlacesInCell(point), p[0].regionalPlacesInCell(point), 'nested content after partial terrain reads');
    }
  }
});

test('bounded caches survive eviction and preserve complete page reuse in both query orders', () => {
  const spec = flat([
    recipe('paint', { period: 960, radius: 200, surface: paint }),
    recipe('habitat', { period: 480, radius: 100, priority: 0, landformHabitat: true }),
  ]);
  const p = pair(spec);
  const first = at(480, 480);
  checkPlaces(p, first);
  const full = p[1].placesInCell(first);
  checkBase(p, first);
  assert.equal(p[1].placesInCell(first), full, 'terrain must reuse an already resident full page');
  assert.equal(p[1].surfacePages!.size, 0, 'no partial-page allocation on a full-page hit');
  for (let i = 1; i <= 140; i++) {
    const point = at(i * 960 + 480, -i * 960 + 480);
    checkBase(p, point);
    if (i % 2) checkPlaces(p, point);
    assert.ok(p[1].surfacePages!.size <= 128 && p[1].placePages.size <= 128);
  }
  assert.equal(p[1].surfacePages!.size, 128);
  for (let i = 140; i >= 0; i--) {
    const point = at(i * 960 + 480, -i * 960 + 480);
    checkPlaces(p, point); checkBase(p, point);
    same(p[1].regionalPlacesInCell(point), p[0].regionalPlacesInCell(point), 'evicted content rehydrates identically');
  }
  checkBase(p, first); checkPlaces(p, first);
  assert.ok(p[1].surfacePages!.size <= 128 && p[1].placePages.size <= 128);
  for (const page of p[1].surfacePages!.values()) {
    assert.ok(Object.isFrozen(page) && page.every(row => Object.isFrozen(row) && Object.isFrozen(row.center)));
    assert.ok(page.every(row => spec.places.find(r => r.id === row.recipe)?.surface));
  }
});

test('current and historical saved descriptors retain terrain, reservations and all content', () => {
  for (const spec of [fresh.terrain, oldWilderness.terrain, oldStreaming.terrain]) for (const seed of [42, 713]) {
    const p = pair(spec, seed);
    const points = [at(0, 0), at(-960, 959.999999), at(11520, 11520), at(-16380, 8730)];
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      if (i % 2) checkPlaces(p, point);
      checkBase(p, point); checkPlaces(p, point);
      same(p[1].terrainAt(point), p[0].terrainAt(point), 'full planner terrain after base/content interleaving');
      same(p[1].landforms?.reserves(point, 180), p[0].landforms?.reserves(point, 180), 'landform reservation result');
      same(p[1].wildernessSites(point, 960), p[0].wildernessSites(point, 960), 'district site contents');
      same(p[1].regionalPlacesInCell(point), p[0].regionalPlacesInCell(point), 'complete nested content');
    }
    same(p[1].spec, p[0].spec, 'query must not rewrite saved descriptor');
    same(p[1].run, p[0].run, 'query must not rewrite run manifest');
  }
});

test('no-surface and explicit native substrate still skip place terrain work entirely', () => {
  const empty = pair(flat([recipe('ordinary')]));
  for (const p of empty) {
    p.placesInCell = () => { throw Error('no-surface terrain must not request place pages'); };
    p.candidate = () => { throw Error('no-surface terrain must not request candidates'); };
  }
  checkBase(empty, at(-960, 120));
  assert.equal(empty[1].surfacePages!.size, 0);
  const source = captureNativeGeographySource(713);
  const geography = makeMassNativeGeographySpec(JSON.stringify(source), {
    schema: 1, algorithm: 'bigint-relative-native-map-v1', addressSpan: 960,
    physicalOrigin: at(0, 0), nativeOrigin: { x: 0, y: 0 },
    physicalUnitsPerNativeUnit: { numerator: '20', denominator: '1' }, nativeDimension: 'surface',
    nativeBounds: { minX: -20000, minY: -20000, maxX: 20000, maxY: 20000 },
    outsideDomain: 'refuse', rounding: 'nearest-binary64-ties-even-once',
  });
  const spec: MassSpec = {
    ...flat([]),
    nativeSubstrate: { schema: 1, policy: 'native-field-substrate-v1', geography },
    fields: [...new Set(source.climate.axes.map(([, axis]) => axis.id)), 'nativeDepth'].map(id => ({ id, base: 0, layers: [] })),
    surfaces: source.biomes.map(([biome, row]) => ({ id: biome, biome, source: 'captured-biome/' + biome,
      priority: 0, when: [], region: row.marine || row.virtual ? 'water' : 'ground', color: row.mapColor })),
  };
  const p = pair(spec);
  for (const g of p) g.candidate = () => { throw Error('explicit substrate must not request place candidates'); };
  for (const point of [at(0, 0), at(960, -960), at(-6400, 5200)]) checkBase(p, point);
  assert.equal(p[1].surfacePages!.size, 0);
});

test('an empty resident surface subset completes content without repeating surface enumeration', () => {
  const p = pair(flat([recipe('paint', { surface: paint }), recipe('protector', { priority: 2 })]));
  const point = at(120, 120);
  checkBase(p, point);
  const subset = p[1].surfacePages!.get(cellKey(point));
  assert.ok(subset && Object.isFrozen(subset));
  assert.equal(subset.length, 0, 'higher-ranked ordinary content must suppress every painted footprint');
  assert.equal(p[1].placePages.size, 0, 'fixture must start with only the partial page');
  let surfaces = 0, ordinary = 0;
  const original = p[1].candidate;
  p[1].candidate = function (r, dimension, gx, gy) {
    if (r.surface) surfaces++; else ordinary++;
    return original.call(this, r, dimension, gx, gy);
  };
  checkPlaces(p, point);
  assert.equal(surfaces, 0, 'empty [] is cached negative evidence, not a cache miss');
  assert.ok(ordinary > 0 && p[1].placesInCell(point).length > 0, 'full ordinary content is still generated');
  assert.equal(p[1].surfacePages!.get(cellKey(point)), subset, 'frozen subset is not mutated');
});

test('surface subset survives complete candidate and decision cache eviction before content completion', () => {
  const spec = flat([
    recipe('paint', { period: 960, radius: 100, surface: paint }),
    recipe('ordinary', { period: 480, radius: 60, priority: 2 }),
  ]);
  const p = pair(spec), point = at(480, 480);
  checkBase(p, point);
  const subset = p[1].surfacePages!.get(cellKey(point))!;
  assert.equal(subset.length, 1, 'fixture retains one painted site between ordinary sites');
  const value = copy(subset);
  // Explicitly discard every derived candidate/decision entry, modeling a
  // stronger eviction than either bounded cache. Keep the immutable page proof.
  for (const g of p) { g.candidates.clear(); g.decisions.clear(); g.placePages.clear(); }
  let surfaces = 0;
  const original = p[1].candidate;
  p[1].candidate = function (r, dimension, gx, gy) {
    if (r.surface) surfaces++;
    return original.call(this, r, dimension, gx, gy);
  };
  checkPlaces(p, point);
  assert.equal(surfaces, 0, 'higher-ranked ordinary acceptance needs no painted competitors in this fixture');
  assert.equal(p[1].placesInCell(point).find(place => place.recipe === 'paint'), subset[0]);
  same(subset, value, 'completion preserves the exact frozen surface data');
  assert.ok(p[1].placesInCell(point).some(place => place.recipe === 'ordinary'));
  checkBase(p, point);
});

type Work = { calls: number; generated: number; byRecipe: Record<string, { calls: number; generated: number }> };
type NoiseWork = { candidate: number; public: number };
function meterNoise(g: GeneratorPort): NoiseWork {
  const result = { candidate: 0, public: 0 }, originalNoise = g.noise, originalMake = g.makeCandidate;
  let candidateDepth = 0;
  g.makeCandidate = function (r, dimension, gx, gy) {
    candidateDepth++;
    try { return originalMake.call(this, r, dimension, gx, gy); }
    finally { candidateDepth--; }
  };
  g.noise = function (point, period, salt) {
    result[candidateDepth ? 'candidate' : 'public']++;
    return originalNoise.call(this, point, period, salt);
  };
  return result;
}
function meter(g: GeneratorPort): Work {
  const result: Work = { calls: 0, generated: 0, byRecipe: {} };
  for (const [method, field] of [['candidate', 'calls'], ['makeCandidate', 'generated']] as const) {
    const original = g[method];
    g[method] = function (recipe, dimension, gx, gy) {
      result[field]++; const row = result.byRecipe[recipe.id] ??= { calls: 0, generated: 0 }; row[field]++;
      return original.call(this, recipe, dimension, gx, gy);
    };
  }
  return result;
}
const samplePoints = Array.from({ length: 32 }, (_, i) => at((i % 8 - 4) * 1920 + 127.5, (Math.floor(i / 8) - 2) * 1920 + 311.25));
let realWork: readonly Work[];
test('candidate range evaluation preserves duplicate names, prototype-like IDs and overflow comparisons', () => {
  const maximum = Number.MAX_VALUE;
  const fields: MassSpec['fields'] = [
    { id: 'unused', base: 0, layers: [{ id: 'unused', period: 350, amplitude: 1 }] },
    { id: '__proto__', base: .375, layers: [
      { id: 'a', period: 300, amplitude: .25 }, { id: 'b', period: 1700, amplitude: -.125, ridge: true },
    ] },
    { id: 'constructor', base: -0, layers: [] },
    { id: 'positive', base: maximum, layers: [{ id: 'overflow', period: 300, amplitude: maximum, ridge: true }] },
    { id: 'negative', base: -maximum, layers: [{ id: 'overflow', period: 300, amplitude: -maximum, ridge: true }] },
  ];
  const baseline = { ...flat([]), fields }, point = at(480, 480);
  const folded = build(ArchivedGenerator, baseline).fieldsAt(point);
  assert.equal(folded.positive, Infinity, 'valid finite layers must exercise natural positive overflow');
  assert.equal(folded.negative, -Infinity, 'valid finite layers must exercise natural negative overflow');
  const edge = folded.__proto__;
  assert.ok(Number.isFinite(edge));
  const cases: { name: string; when: readonly MassRange[]; accepted: boolean; noise: number }[] = [
    { name: 'empty', when: [], accepted: true, noise: 0 },
    { name: 'positive-unbounded', when: [{ field: 'positive' }], accepted: false, noise: 1 },
    { name: 'positive-min', when: [{ field: 'positive', min: 0 }], accepted: false, noise: 1 },
    { name: 'negative-unbounded', when: [{ field: 'negative' }], accepted: true, noise: 1 },
    { name: 'negative-max', when: [{ field: 'negative', max: 0 }], accepted: true, noise: 1 },
    { name: 'negative-min', when: [{ field: 'negative', min: -maximum }], accepted: false, noise: 1 },
    { name: 'constructor-lower', when: [{ field: 'constructor', min: 0, max: 1 }], accepted: true, noise: 0 },
    { name: 'constructor-upper', when: [{ field: 'constructor', min: -1, max: 0 }], accepted: false, noise: 0 },
    { name: 'exact-lower', when: [{ field: '__proto__', min: edge, max: edge + .25 }], accepted: true, noise: 2 },
    { name: 'exact-upper', when: [{ field: '__proto__', min: edge - .25, max: edge }], accepted: false, noise: 2 },
    { name: 'duplicate', when: [{ field: '__proto__', min: edge }, { field: '__proto__', max: edge + .25 },
      { field: 'constructor' }, { field: '__proto__' }], accepted: true, noise: 2 },
    { name: 'early-reject', when: [{ field: 'constructor', max: 0 }, { field: 'positive' }], accepted: false, noise: 0 },
  ];
  for (const row of cases) {
    const spec: MassSpec = { ...baseline, places: [recipe(row.name, { period: 960, radius: 100, when: row.when })] };
    const p = pair(spec), noise = p.map(meterNoise);
    const results = p.map(g => g.makeCandidate(g.spec.places[0], 'surface', 0n, 0n));
    same(results[1], results[0], row.name + ' exact candidate result');
    assert.equal(!!results[1], row.accepted, row.name);
    assert.equal(noise[1].candidate, row.noise, row.name + ' computes each demanded field at most once');
    assert.equal(noise[0].candidate, 5, 'archived candidate computes all five noise layers');
    same(p[1].fieldsAt(point), p[0].fieldsAt(point), 'public fields retain every original value, including overflow');
    assert.equal(noise[1].public, 5); assert.equal(noise[0].public, 5);
  }
});

test('controlled synthetic NaN keeps the original positive range predicate and complete field fold', () => {
  // Real massNoise is bounded; NaN is intentionally synthetic. Finite out-of-
  // range noise creates Infinity + -Infinity from finite amplitudes, ensuring a
  // future arithmetic refactor cannot accidentally turn NaN into a range match.
  const maximum = Number.MAX_VALUE;
  for (const when of [[], [{ field: 'nan' }], [{ field: 'nan', min: 0 }], [{ field: 'nan', max: 0 }]]) {
    const spec: MassSpec = { ...flat([recipe('synthetic', { period: 960, radius: 100, when })]), fields: [
      { id: 'nan', base: maximum, layers: [
        { id: 'up', period: 1, amplitude: maximum }, { id: 'down', period: 2, amplitude: -maximum },
      ] },
    ] };
    const p = pair(spec);
    for (const g of p) g.noise = (_point, period) => period === 1 ? 1 : 2;
    const noise = p.map(meterNoise);
    const results = p.map(g => g.makeCandidate(g.spec.places[0], 'surface', 0n, 0n));
    same(results[1], results[0], 'synthetic NaN candidate parity');
    assert.equal(!!results[1], when.length === 0, 'NaN rejects every nonempty range');
    assert.equal(noise[1].candidate, when.length ? 2 : 0, 'a demanded field retains all its layers before testing');
    const current = p[1].fieldsAt(at(480, 480)), previous = p[0].fieldsAt(at(480, 480));
    same(current, previous, 'synthetic public arithmetic remains identical');
    assert.ok(Number.isNaN(current.nan));
  }
});

const coldContentNoise: { descriptor: number; work: NoiseWork[] }[] = [];
test('cold full-content queries preserve exact original candidate and decision work', () => {
  for (const [descriptor, spec] of [fresh.terrain, oldWilderness.terrain, oldStreaming.terrain].entries()) {
    const p = pair(spec), work = p.map(meter), noise = p.map(meterNoise);
    for (const point of samplePoints.slice(0, 8)) checkPlaces(p, point);
    same(work[1], work[0], 'cold full-page path keeps every original candidate request and construction');
    same([...p[1].decisions], [...p[0].decisions], 'cold full-page path keeps decision and cache insertion order');
    assert.equal(p[1].surfacePages!.size, 0, 'cold full content must not force a surface-only pass');
    assert.ok(noise[1].candidate < noise[0].candidate, 'same candidate workload samples only required fields');
    assert.equal(noise[1].public, 0); assert.equal(noise[0].public, 0);
    coldContentNoise.push({ descriptor, work: noise });
  }
  console.log('Native cold full-content noise work ' + JSON.stringify(coldContentNoise));
});
test('operation counts remove unrelated enumeration while retaining required non-surface competitors', () => {
  const simple = pair(flat([
    recipe('paint', { period: 960, radius: 100, surface: paint, priority: 2 }),
    recipe('lower-population', { period: 240, radius: 80, priority: 1, landformHabitat: true }),
  ]));
  const counted = simple.map(meter);
  checkBase(simple, at(480, 480));
  assert.ok(counted[0].byRecipe['lower-population'].generated > 0);
  assert.equal(counted[1].byRecipe['lower-population'], undefined, 'lower-ranked ordinary population cannot affect terrain');
  assert.ok(counted[1].generated < counted[0].generated);
  checkPlaces(simple, at(480, 480));
  const blocked = pair(flat([recipe('paint', { surface: paint }), recipe('protector', { priority: 2 })]));
  const required = blocked.map(meter); checkBase(blocked, at(120, 120));
  assert.ok(required[1].byRecipe.protector.generated > 0, 'non-surface inhibition still queries its candidates');
  const real = pair(fresh.terrain), work = real.map(meter), noise = real.map(meterNoise);
  for (const point of samplePoints) checkBase(real, point);
  assert.ok(work[1].generated < work[0].generated, 'representative cold native terrain must generate fewer candidates');
  assert.ok(work[1].calls < work[0].calls, 'representative cold native terrain must request fewer candidates');
  assert.equal(noise[1].public, noise[0].public, 'terrain output still samples every public field');
  assert.ok(noise[1].candidate < noise[0].candidate, 'terrain candidates require fewer noise samples');
  const before = copy(work);
  const coldNoise = copy(noise);
  for (const point of samplePoints) checkBase(real, point);
  same(work, before, 'warm pages require no additional candidate work');
  realWork = before;
  for (const point of samplePoints) checkPlaces(real, point);
  console.log('Native terrain noise work ' + JSON.stringify(noise.map((row, i) => ({
    mode: i ? 'current' : 'archived', cold: coldNoise[i], terrainWarmThenContent: row,
  }))));
  console.log('Native cold terrain candidate work ' + JSON.stringify(work.map((row, i) => ({
    mode: i ? 'current' : 'archived', coldCalls: before[i].calls, coldGenerated: before[i].generated,
    terrainThenContentCalls: row.calls, terrainThenContentGenerated: row.generated,
  }))));
});

if (process.argv.includes('--bench')) {
  const rows: { round: number; mode: string; coldMs: number; warmMs: number; contentAfterTerrainMs: number; coldContentMs: number; digest: string }[] = [];
  // No instrumentation in the timing loop. Alternate order and retain an exact
  // result digest; durations are evidence, never pass/fail gates.
  for (let round = 0; round < 4; round++) {
    const order = round % 2 ? [CurrentGenerator, ArchivedGenerator] : [ArchivedGenerator, CurrentGenerator];
    for (const Ctor of order) {
      const g = build(Ctor, fresh.terrain), values: MassTerrain[] = [];
      let start = performance.now();
      for (const point of samplePoints) values.push(g.baseTerrainAt(point));
      const coldMs = performance.now() - start;
      start = performance.now();
      for (let i = 0; i < 32; i++) for (const point of samplePoints) values.push(g.baseTerrainAt(point));
      const warmMs = performance.now() - start;
      start = performance.now();
      const content = samplePoints.map(point => g.placesInCell(point));
      const contentAfterTerrainMs = performance.now() - start;
      const full = build(Ctor, fresh.terrain);
      start = performance.now();
      const coldContent = samplePoints.map(point => full.placesInCell(point));
      const coldContentMs = performance.now() - start;
      same(coldContent, content, 'unmetered cold full-content course retains the same result');
      rows.push({ round, mode: Ctor === CurrentGenerator ? 'current' : 'archived', coldMs, warmMs, contentAfterTerrainMs, coldContentMs,
        digest: createHash('sha256').update(canonical({ values, content })).digest('hex') });
    }
  }
  assert.equal(new Set(rows.map(r => r.digest)).size, 1);
  console.log('Unmetered fixed-work timing (32 cold pages, 1024 warm samples): ' + JSON.stringify(rows));
}
console.log('PASS worldmass_surfaces: ' + tests + ' fixtures, ' + assertions + ' exact comparisons; archived class SHA256 ' +
  createHash('sha256').update(archivedSource).digest('hex') + '; cold work ' +
  JSON.stringify(realWork!.map(row => ({ calls: row.calls, generated: row.generated }))));
