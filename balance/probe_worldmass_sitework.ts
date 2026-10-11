/** Exact protected-site query parity against the archived 448c07fc generator.
 * The class oracle is independent of edited generator kernels. Validation,
 * address math, noise and planner modules are shared dependencies. --bench
 * isolates this query change with the same current noise in both classes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import * as addresses from '../src/worldmass/address';
import { address, cellKey, type MassAddress, type MassCell } from '../src/worldmass/address';
import type { MassPlace, MassPlaceRecipe, MassRun, MassSpec, MassTerrain } from '../src/worldmass/contracts';
import { MassGenerator, makeMassRun, matchesMassRanges } from '../src/worldmass/generator';
import { MassNativeRegional } from '../src/worldmass/nativeRegional';
import { MassRegionalDiscoveries } from '../src/worldmass/regionalDiscoveries';
import { MassLandforms } from '../src/worldmass/landforms';
import { MassNativeSubstrate } from '../src/worldmass/nativeSubstrate';
import { MassTerrainPatches, patchBoxIntersects, type MassPatchBox } from '../src/worldmass/terrainPatches';
import { canonical, freezeData, massRandom, streamSeed } from '../src/worldmass/random';
import { massNoise } from '../src/worldmass/noise';
import { massAdventure } from '../src/worldmass/preset';
import { beforeMassStreaming, beforeWildernessPaths } from './worldmassFixtures';
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
  private readonly surfaceRecipes: readonly MassPlaceRecipe[];
  private readonly salts = new Map<MassSpec['fields'][number]['layers'][number], number>();
  private readonly candidates = new Map<string, MassPlace | null>();
  private readonly decisions = new Map<string, boolean>();
  private readonly placePages = new Map<string, readonly MassPlace[]>();
  private readonly surfacePages = new Map<string, readonly MassPlace[]>();
  constructor(run: MassRun, spec: MassSpec) {
    const expected = makeMassRun(run.seed, run.runId, spec);
    if (canonical(run) !== canonical(expected)) throw new Error('World generator/content manifest mismatch');
    this.spec = freezeData(JSON.parse(canonical(spec)) as MassSpec);
    this.run = freezeData({ ...run });
    this.nativeSubstrate = Object.hasOwn(this.spec, 'nativeSubstrate') ? new MassNativeSubstrate(this.run, this.spec) : null;
    this.surfaces = [...this.spec.surfaces].sort((a, b) => b.priority - a.priority || compare(a.id, b.id));
    this.surfaceRecipes = Object.freeze(this.spec.places.filter(p => p.surface));
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
    for (const place of this.surfaceRecipes.length ? this.surfacePlacesInCell(at) : []) {
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
    if (!this.candidateFieldsMatch(recipe.when, center)) return null;
    return { id: canonical([this.run.runId, ...namespace]), recipe: recipe.id, content: recipe.content,
      center, radius: recipe.radius, source: { generator: this.spec.id, version: this.spec.version,
        rule: recipe.id, source: recipe.content, stream: canonical(namespace) } };
  }
  /** Candidates only consume fields named by their ranges. Noise is independent
   * per layer; keep each requested field's original fold and comparison order. */
  private candidateFieldsMatch(rows: readonly MassRange[], at: MassAddress): boolean {
    if (!rows.length) return true;
    const values: Record<string, number> = Object.create(null) as Record<string, number>;
    for (const r of rows) {
      if (!Object.hasOwn(values, r.field)) {
        const f = this.spec.fields.find(field => field.id === r.field)!;
        let value = f.base;
        for (const l of f.layers) {
          const n = this.noise(at, l.period, this.salts.get(l)!);
          value += (l.ridge ? (1 - Math.abs(n * 2 - 1)) ** 2 : n * 2 - 1) * l.amplitude;
        }
        values[r.field] = value;
      }
      const value = values[r.field];
      if (!(value >= (r.min ?? -Infinity) && value < (r.max ?? Infinity))) return false;
    }
    return true;
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
    const page = this.collectPlacesInCell(cell, this.spec.places, this.surfacePages.get(key));
    this.placePages.set(key, page);
    if (this.placePages.size > 128) this.placePages.delete(this.placePages.keys().next().value!);
    return page;
  }
  /** Terrain only needs surface families, but their acceptance still checks all
   * families. Reuse full pages when resident; never expose partial content pages. */
  private surfacePlacesInCell(cell: MassCell): readonly MassPlace[] {
    const key = cellKey(cell);
    if (this.placePages.has(key)) return this.placesInCell(cell);
    const cached = this.surfacePages.get(key);
    if (cached) { this.surfacePages.delete(key); this.surfacePages.set(key, cached); return cached; }
    const page = this.collectPlacesInCell(cell, this.surfaceRecipes);
    this.surfacePages.set(key, page);
    if (this.surfacePages.size > 128) this.surfacePages.delete(this.surfacePages.keys().next().value!);
    return page;
  }
  private collectPlacesInCell(cell: MassCell, recipes: readonly MassPlaceRecipe[], knownSurfaces?: readonly MassPlace[]): readonly MassPlace[] {
    const s = this.spec.addressSpan, origin = address(cell.dimension, cell.cx, cell.cy, 0, 0, s);
    const result = new Map<string, MassPlace>();
    // Even an empty resident subset already checked every surface family against
    // all competitors. Complete it without repeating that immutable decision.
    if (knownSurfaces) for (const p of knownSurfaces) result.set(p.id, p);
    for (const recipe of recipes) {
      if (knownSurfaces !== undefined && recipe.surface) continue;
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
    return Object.freeze([...result.values()].sort((a, b) => compare(a.id, b.id)));
  }
}`;

assert.equal(createHash('sha256').update(archivedSource).digest('hex'),
  '202fb9d326985d132c9491bc24db0921e32b2168cbb429a76766e53dc479408d', 'preserved 448c07fc class must remain unchanged');
const oracleImports = { ...addresses, MassNativeRegional, MassRegionalDiscoveries, MassLandforms,
  MassNativeSubstrate, MassTerrainPatches, patchBoxIntersects, canonical, freezeData,
  massRandom, streamSeed, massNoise, makeMassRun, matchesMassRanges,
  compare: (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0 };
interface GeneratorPort {
  spec: Readonly<MassSpec>; run: Readonly<MassRun>;
  nativeRegional: MassNativeRegional | null;
  landforms: MassLandforms | null;
  fieldsAt(at: MassAddress): Readonly<Record<string, number>>;
  baseTerrainAt(at: MassAddress): MassTerrain;
  terrainAt(at: MassAddress): MassTerrain;
  patchSitesClear(origin: MassAddress, box: MassPatchBox, landformHabitats?: boolean): boolean;
  placesInCell(at: MassCell): readonly MassPlace[];
  regionalPlacesInCell(at: MassCell): readonly MassPlace[];
  candidate(recipe: MassPlaceRecipe, dimension: string, gx: bigint, gy: bigint): MassPlace | null;
  makeCandidate(recipe: MassPlaceRecipe, dimension: string, gx: bigint, gy: bigint): MassPlace | null;
  candidates: Map<string, MassPlace | null>;
  decisions: Map<string, boolean>;
  placePages: Map<string, readonly MassPlace[]>;
  surfacePages: Map<string, readonly MassPlace[]>;
}
type GeneratorClass = new(run: MassRun, spec: MassSpec) => GeneratorPort;
const output = ts.transpileModule(archivedSource.replace('export class', 'class'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
const ArchivedGenerator = new Function(...Object.keys(oracleImports), output + '\nreturn MassGenerator;')
  (...Object.values(oracleImports)) as GeneratorClass;
const CurrentGenerator = MassGenerator as unknown as GeneratorClass;
const copy = <T>(value: T): T => JSON.parse(canonical(value)) as T;
const at = (x: number, y: number, dimension = 'surface') => address(dimension, '0', '0', x, y, 960);
const build = (Ctor: GeneratorClass, spec: MassSpec, seed = 713) => new Ctor(makeMassRun(seed, 'site-query-proof', spec), spec);
const pair = (spec: MassSpec, seed = 713) => [build(ArchivedGenerator, spec, seed), build(CurrentGenerator, spec, seed)] as const;
const recipe = (id: string, overrides: Partial<MassPlaceRecipe> = {}): MassPlaceRecipe =>
  ({ id, version: 1, content: id, period: 960, chance: 1, radius: 100, jitter: 0, priority: 1, when: [], ...overrides });
const paint = { region: 'sand', color: '#654321' };
const flat = (places: readonly MassPlaceRecipe[]): MassSpec => ({
  id: 'site-query-proof', version: 1, addressSpan: 960, terrainCell: 30, fields: [],
  surfaces: [{ id: 'plain', priority: 0, when: [], region: 'ground', color: '#123456', biome: 'downs' }], places,
});
const box = (minX = 0, minY = 0, maxX = 959, maxY = 959): MassPatchBox => ({ minX, minY, maxX, maxY });
let tests = 0, assertions = 0;
function same<T>(actual: T, expected: T, label: string): void {
  assert.deepEqual(actual, expected, label); assertions++;
}
function test(label: string, run: () => void): void {
  run(); tests++; console.log('PASS ' + label);
}
function checkSite(p: readonly [GeneratorPort, GeneratorPort], point: MassAddress, bounds = box(), habitats = true): boolean {
  const expected = p[0].patchSitesClear(point, bounds, habitats), actual = p[1].patchSitesClear(point, bounds, habitats);
  same(actual, expected, 'exact protected-site reservation including flag and footprint'); return actual;
}
function checkContent(p: readonly [GeneratorPort, GeneratorPort], point: MassAddress): void {
  same(p[1].placesInCell(point), p[0].placesInCell(point), 'complete sorted content after protected-site query');
}
function checkTerrain(p: readonly [GeneratorPort, GeneratorPort], point: MassAddress): void {
  same(p[1].baseTerrainAt(point), p[0].baseTerrainAt(point), 'exact surface/fields/provenance after protected-site query');
}
type Work = { calls: number; generated: number; byRecipe: Record<string, { calls: number; generated: number }> };
function meter(g: GeneratorPort): Work {
  const result: Work = { calls: 0, generated: 0, byRecipe: Object.create(null) as Work['byRecipe'] };
  for (const [method, field] of [['candidate', 'calls'], ['makeCandidate', 'generated']] as const) {
    const original = g[method];
    g[method] = function (r, dimension, gx, gy) {
      result[field]++;
      const row = result.byRecipe[r.id] ??= { calls: 0, generated: 0 }; row[field]++;
      return original.call(this, r, dimension, gx, gy);
    };
  }
  return result;
}

test('protected surface subset omits compatible habitats and later restores full content', () => {
  const p = pair(flat([
    recipe('paint', { surface: paint, priority: 2 }),
    recipe('habitat', { period: 480, radius: 80, landformHabitat: true }),
  ]));
  const work = p.map(meter), point = at(0, 0);
  assert.equal(checkSite(p, point), false, 'protected site intersects the reservation');
  assert.ok(work[0].byRecipe.habitat.generated > 0, 'archived query enumerates habitat content');
  assert.equal(work[1].byRecipe.habitat, undefined, 'lower-ranked habitats need no enumeration in this proof');
  assert.equal(p[1].placePages.size, 0, 'protected subset cannot publish a complete content page');
  assert.equal(p[1].surfacePages.size, 1);
  const subset = p[1].surfacePages.get(cellKey(point))!;
  assert.ok(Object.isFrozen(subset) && subset.every(row => Object.isFrozen(row)));
  checkContent(p, point);
  assert.ok(p[1].placesInCell(point).some(row => row.recipe === 'habitat'), 'ordinary population remains present');
  assert.equal(p[1].placesInCell(point).find(row => row.recipe === 'paint'), subset[0], 'full page reuses surface objects');
  checkTerrain(p, point);
});

test('every-family inhibition retains high and equal-ranked habitats and caches empty subsets', () => {
  for (const priority of [2, 3]) {
    const p = pair(flat([
      recipe('zz-paint', { surface: paint, priority: 2 }),
      recipe('aa-habitat', { priority, landformHabitat: true }),
    ]));
    const work = p.map(meter), point = at(0, 0);
    assert.equal(checkSite(p, point), true, 'habitat suppresses the protected site without reserving landform terrain');
    assert.ok(work[1].byRecipe['aa-habitat'].generated > 0, 'habitat still participates in inhibition');
    const subset = p[1].surfacePages.get(cellKey(point))!;
    assert.deepEqual(subset, []);
    const before = copy(work[1]);
    checkSite(p, point);
    same(canonical(work[1]), canonical(before), 'empty accepted subset is reusable negative evidence');
    for (const g of p) { g.candidates.clear(); g.decisions.clear(); }
    checkContent(p, point);
    assert.ok(p[1].placesInCell(point).every(row => row.recipe === 'aa-habitat'));
    assert.equal(checkSite(p, point, box(), false), false, 'ordinary patches still reserve habitats');
  }
});

test('unpainted protected sites and historical unmarked populations use the full-page fallback', () => {
  for (const places of [
    [recipe('unpainted', { priority: 3 }), recipe('paint', { surface: paint, priority: 2 }),
      recipe('habitat', { landformHabitat: true })],
    [recipe('historical-population')],
  ]) {
    const p = pair(flat(places)), work = p.map(meter), point = at(0, 0);
    assert.equal(checkSite(p, point), false, 'an unpainted protected site cannot disappear');
    same(work[1], work[0], 'fallback retains original candidate requests and construction order/count');
    same([...p[1].decisions], [...p[0].decisions], 'fallback retains decision order');
    assert.equal(p[1].surfacePages.size, 0);
    assert.equal(p[1].placePages.size, 1);
    checkTerrain(p, point); checkContent(p, point);
  }
  const habitats = pair(flat([recipe('only-habitat', { landformHabitat: true })]));
  assert.equal(checkSite(habitats, at(0, 0)), true);
  assert.equal(checkSite(habitats, at(0, 0), box(), false), false, 'false flag always sees habitat footprints');
  const empty = pair(flat([]));
  assert.equal(checkSite(empty, at(0, 0)), true); checkContent(empty, at(0, 0));
});

test('circle/box tangency, adjacent page edges and signed full addresses preserve reservations', () => {
  const spec = flat([
    recipe('paint', { period: 240, radius: 80, surface: paint, priority: 2 }),
    recipe('habitat', { period: 480, radius: 40, landformHabitat: true }),
  ]);
  const p = pair(spec), zero = at(0, 0);
  assert.equal(checkSite(p, zero, box(200, 119, 210, 121)), false, 'circle tangent to the box is reserved');
  assert.equal(checkSite(p, zero, box(200 + 1e-7, 119, 210, 121)), true, 'just outside the circle remains clear');
  const bounds = [box(-1, -1, 1, 1), box(-960, -1, 960, 1), box(879.999999, 100, 960.000001, 180),
    box(-100, -100, 100, 100), box(20, 20, 40, 40)];
  for (const dimension of ['surface', 'cavern']) for (const cell of ['-9007199254740993', '-2', '0', '9007199254740993']) {
    const point = address(dimension, cell, cell, 0, 0, 960);
    for (const boundsRow of bounds) for (const habitats of [true, false]) checkSite(p, point, boundsRow, habitats);
    checkContent(p, point); checkTerrain(p, point);
  }
});

test('terrain/reservation/content query orders reuse complete pages without cache growth', () => {
  const spec = flat([
    recipe('paint', { period: 1920, radius: 150, surface: paint, priority: 2 }),
    recipe('habitat', { period: 960, radius: 100, landformHabitat: true }),
  ]);
  for (const order of ['TRC', 'RTC', 'CTR', 'CRT', 'TCR', 'RCT']) {
    const p = pair(spec), point = at(300, -300);
    for (const op of order) {
      if (op === 'T') checkTerrain(p, point);
      else if (op === 'R') checkSite(p, point, box(-100, -100, 200, 200));
      else checkContent(p, point);
    }
    checkContent(p, point); checkTerrain(p, point);
    const full = p[1].placesInCell(point), before = p[1].surfacePages.size;
    checkSite(p, point, box(0, 0, 1, 1));
    assert.equal(p[1].placesInCell(point), full, 'a resident full page is reused');
    assert.equal(p[1].surfacePages.size, before, 'full-page hit allocates no subset');
    assert.equal([...p[1].placePages.keys()].at(-1), cellKey(point), 'resident full-page lookup preserves LRU promotion');
  }
  const p = pair(spec);
  for (let i = 0; i < 140; i++) {
    const point = at(i * 1920, -i * 1920);
    checkSite(p, point, box(0, 0, 1, 1));
    assert.ok(p[1].surfacePages.size <= 128 && p[1].placePages.size <= 128);
  }
  assert.equal(p[1].surfacePages.size, 128);
  const first = at(0, 0);
  assert.equal(p[1].surfacePages.has(cellKey(first)), false);
  for (let i = 139; i >= 0; i--) {
    const point = at(i * 1920, -i * 1920);
    checkTerrain(p, point); checkContent(p, point); checkSite(p, point, box(0, 0, 1, 1));
    assert.ok(p[1].surfacePages.size <= 128 && p[1].placePages.size <= 128);
  }
});

const fresh = massAdventure();
const oldWilderness = beforeWildernessPaths(copy(fresh));
const oldStreaming = beforeMassStreaming(copy(fresh));
test('current and historical complete planners retain reservation, terrain and content output', () => {
  for (const spec of [fresh.terrain, oldWilderness.terrain, oldStreaming.terrain]) for (const seed of [42, 713]) {
    const p = pair(spec, seed);
    for (const point of [at(0, 0), at(-1920, 960), at(11520, 11520)]) {
      checkSite(p, point, box(-200, -150, 350, 450));
      checkTerrain(p, point); checkContent(p, point);
      same(p[1].terrainAt(point), p[0].terrainAt(point), 'complete planner terrain remains exact');
      same(p[1].regionalPlacesInCell(point), p[0].regionalPlacesInCell(point), 'nested native content remains exact');
      checkSite(p, point, box(-200, -150, 350, 450), false);
    }
    same(p[1].spec, p[0].spec, 'saved descriptor remains unchanged');
    same(p[1].run, p[0].run, 'manifest and seed identity remain unchanged');
  }
});

test('nativeRegional reservation veto still precedes every site page query', () => {
  const p = pair(fresh.terrain), trace: string[][] = [[], []], point = at(0, 0), bounds = box(-200, -150, 350, 450);
  for (const [i, g] of p.entries()) {
    assert.ok(g.nativeRegional);
    g.nativeRegional.reserves = (center, radius) => { trace[i].push(canonical([center, radius])); return true; };
    g.candidate = () => { throw Error('a native reservation must veto before place candidates'); };
    g.placesInCell = () => { throw Error('a native reservation must veto before complete pages'); };
  }
  assert.equal(checkSite(p, point, bounds), false);
  same(trace[1], trace[0], 'native veto receives exactly the original center/radius in order');
  assert.equal(p[1].surfacePages.size, 0);
});

// Isolate the measured site-query kernel after its existing nativeRegional veto:
// the same shipped fields/surfaces/recipes, without invoking unrelated planners.
const siteSpec: MassSpec = {
  id: fresh.terrain.id, version: fresh.terrain.version,
  addressSpan: fresh.terrain.addressSpan, terrainCell: fresh.terrain.terrainCell,
  fields: fresh.terrain.fields, surfaces: fresh.terrain.surfaces, places: fresh.terrain.places,
};
const samplePoints = Array.from({ length: 24 }, (_, i) => at((i % 6 - 3) * 1920, (Math.floor(i / 6) - 2) * 1920));
let countedWork: readonly Work[] = [];
test('shipped site-query kernel removes habitat enumeration and preserves mixed-query results', () => {
  assert.ok(siteSpec.places.some(p => p.landformHabitat));
  assert.ok(siteSpec.places.every(p => p.surface || p.landformHabitat));
  const p = pair(siteSpec), work = p.map(meter);
  for (const point of samplePoints) checkSite(p, point);
  const cold = copy(work);
  assert.ok(cold[1].calls < cold[0].calls && cold[1].generated < cold[0].generated);
  for (const point of samplePoints) checkSite(p, point);
  same(canonical(work), canonical(cold), 'resident subset reuses exact reservation work');
  for (const point of samplePoints) { checkTerrain(p, point); checkContent(p, point); }
  countedWork = work;
  console.log('Protected-site fixed work ' + JSON.stringify(work.map((row, i) => ({
    mode: i ? 'current' : 'archived', coldCalls: cold[i].calls, coldGenerated: cold[i].generated,
    reservationThenTerrainThenContentCalls: row.calls, reservationThenTerrainThenContentGenerated: row.generated,
  }))));
});

if (process.argv.includes('--bench')) {
  const rows: { round: number; mode: string; reservationMs: number; warmMs: number;
    terrainMs: number; completionMs: number; digest: string }[] = [];
  // Both classes share the current noise module. This isolates protected-site
  // work; it does not measure a combined noise change or whole-shard speedup.
  for (let round = 0; round < 4; round++) {
    const order = round % 2 ? [CurrentGenerator, ArchivedGenerator] : [ArchivedGenerator, CurrentGenerator];
    for (const Ctor of order) {
      const g = build(Ctor, siteSpec), values: boolean[] = [];
      let start = performance.now();
      for (const point of samplePoints) values.push(g.patchSitesClear(point, box(), true));
      const reservationMs = performance.now() - start;
      start = performance.now();
      for (let i = 0; i < 16; i++) for (const point of samplePoints) values.push(g.patchSitesClear(point, box(), true));
      const warmMs = performance.now() - start;
      start = performance.now();
      const terrain = samplePoints.map(point => g.baseTerrainAt(point));
      const terrainMs = performance.now() - start;
      start = performance.now();
      const content = samplePoints.map(point => g.placesInCell(point));
      const completionMs = performance.now() - start;
      rows.push({ round, mode: Ctor === CurrentGenerator ? 'current' : 'archived',
        reservationMs, warmMs, terrainMs, completionMs,
        digest: createHash('sha256').update(canonical({ values, terrain, content })).digest('hex') });
    }
  }
  assert.equal(new Set(rows.map(r => r.digest)).size, 1, 'all timed query outputs remain exact');
  console.log('Unmetered protected-site timing (24 cold pages, 384 warm queries; shared current noise): ' + JSON.stringify(rows));

  // Exercise the shipped planner composition, not only its site-query kernel.
  // Each class starts cold for the same widely spaced course. This includes
  // native regional terrain, ordinary/regional landform reservation and patch
  // planning, then the full regional content callers may request afterwards.
  // It does not construct a runtime/nativeCountry owner or measure shard ticks.
  const nativePolicy = fresh.nativeCountry!;
  const footprintRadii = nativePolicy.catalogue.map(row => Math.hypot(row.size.w, row.size.h) / 2 + nativePolicy.clearance)
    .sort((a, b) => a - b);
  assert.ok(footprintRadii.length > 0 && footprintRadii.every(Number.isFinite));
  const radii = [footprintRadii[0], footprintRadii[Math.floor(footprintRadii.length / 2)], footprintRadii.at(-1)!];
  assert.ok(radii.every(radius => radius > 0 && radius <= nativePolicy.spacing / 2), 'use actual bounded native footprints');
  const plannerPoints = Array.from({ length: 8 }, (_, i) => at((i % 4 * 2 - 3) * 9600 + 375,
    (i < 4 ? -2 : 2) * 9600 + 615));
  const plannerRows: { round: number; mode: string; coldMs: number; coldQueryMs: number[]; coldMaxMs: number;
    completionMs: number; completionQueryMs: number[]; completionMaxMs: number; combinedMs: number;
    coldDigest: string; contentDigest: string; digest: string }[] = [];
  const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
  for (let round = 0; round < 4; round++) {
    const order = round % 2 ? [CurrentGenerator, ArchivedGenerator] : [ArchivedGenerator, CurrentGenerator];
    for (const Ctor of order) {
      const g = build(Ctor, fresh.terrain), coldQueryMs: number[] = [], completionQueryMs: number[] = [];
      assert.ok(g.landforms, 'full descriptor must retain the actual landform planner');
      const values: { terrain: MassTerrain; reserved: boolean }[] = [];
      let start = performance.now();
      for (const [i, point] of plannerPoints.entries()) {
        const queryStart = performance.now();
        const terrain = g.terrainAt(point), reserved = g.landforms.reserves(point, radii[i % radii.length]);
        coldQueryMs.push(performance.now() - queryStart);
        values.push({ terrain, reserved });
      }
      const coldMs = performance.now() - start;
      const content: (readonly MassPlace[])[] = [];
      start = performance.now();
      for (const point of plannerPoints) {
        const queryStart = performance.now();
        content.push(g.regionalPlacesInCell(point));
        completionQueryMs.push(performance.now() - queryStart);
      }
      const completionMs = performance.now() - start;
      plannerRows.push({ round, mode: Ctor === CurrentGenerator ? 'current' : 'archived', coldMs, coldQueryMs,
        coldMaxMs: Math.max(...coldQueryMs), completionMs, completionQueryMs,
        completionMaxMs: Math.max(...completionQueryMs), combinedMs: coldMs + completionMs,
        coldDigest: digest(values), contentDigest: digest(content), digest: digest({ values, content }) });
    }
  }
  for (const key of ['coldDigest', 'contentDigest', 'digest'] as const)
    assert.equal(new Set(plannerRows.map(row => row[key])).size, 1, 'complete cold planner and deferred content parity: ' + key);
  const median = (values: number[]): number => {
    const sorted = values.slice().sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  const summary = ['archived', 'current'].map(mode => {
    const rounds = plannerRows.filter(row => row.mode === mode);
    return { mode, coldMedianMs: median(rounds.map(row => row.coldMs)),
      coldMaxMedianMs: median(rounds.map(row => row.coldMaxMs)), coldWorstMs: Math.max(...rounds.map(row => row.coldMaxMs)),
      completionMedianMs: median(rounds.map(row => row.completionMs)),
      completionMaxMedianMs: median(rounds.map(row => row.completionMaxMs)),
      combinedMedianMs: median(rounds.map(row => row.combinedMs)),
      coldQueryMedianMs: plannerPoints.map((_, i) => median(rounds.map(row => row.coldQueryMs[i]))),
      completionQueryMedianMs: plannerPoints.map((_, i) => median(rounds.map(row => row.completionQueryMs[i]))) };
  });
  console.log('Unmetered complete planner timing (shared current noise/planners; constructor excluded): ' + JSON.stringify({
    seed: 713, points: plannerPoints, footprintRadii: radii, rows: plannerRows, summary,
  }));
}
console.log('PASS worldmass_sitework: ' + tests + ' fixtures, ' + assertions + ' exact comparisons; archived class SHA256 ' +
  createHash('sha256').update(archivedSource).digest('hex') + '; mixed work ' +
  JSON.stringify(countedWork.map(row => ({ calls: row.calls, generated: row.generated }))));
