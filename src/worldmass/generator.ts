import { MassNativeRegional, validateNativeRegional } from './nativeRegional';
import { MassRegionalDiscoveries, validateRegionalDiscoveries } from './regionalDiscoveries';
import { MassLandforms, validateMassLandforms } from './landforms';
import { MassNativeSubstrate, validateNativeSubstrate } from './nativeSubstrate';
import { address, cellKey, floorDiv, latticeAt, localOffset, moveAddress, validSpan, type MassAddress, type MassCell } from './address';
import type { MassPlace, MassPlaceRecipe, MassRange, MassRun, MassSpec, MassTerrain } from './contracts';
import { canonical, freezeData, massDigest, massRandom, streamSeed } from './random';
import { massNoise } from './noise';
import { MassTerrainPatches, patchBoxIntersects, validateMassPatches, type MassPatchBox } from './terrainPatches';

const compare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
function unique(ids: readonly string[], label: string): void {
  if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new Error(label + ' IDs must be nonempty and unique');
}
function finite(n: number, label: string): void {
  if (!Number.isFinite(n)) throw new Error(label + ' must be finite');
}
function ranges(rows: readonly MassRange[], fields: Set<string>): void {
  for (const r of rows) {
    if (!fields.has(r.field)) throw new Error('Unknown terrain field: ' + r.field);
    if (r.min !== undefined) finite(r.min, 'Range minimum');
    if (r.max !== undefined) finite(r.max, 'Range maximum');
    if ((r.min ?? -Infinity) >= (r.max ?? Infinity)) throw new Error('Empty terrain range');
  }
}
export function validateMassSpec(spec: MassSpec, nativeSeed?: number): void {
  validateNativeSubstrate(spec, nativeSeed);
  canonical(spec);
  if (!spec.id || !Number.isSafeInteger(spec.version) || spec.version < 1) throw new Error('Invalid generator identity');
  validSpan(spec.addressSpan); validSpan(spec.terrainCell);
  if (spec.addressSpan % spec.terrainCell) throw new Error('Address span must divide into whole terrain cells');
  if (spec.addressSpan / spec.terrainCell > 256) throw new Error('Terrain page exceeds 256 cells per axis');
  unique(spec.fields.map(f => f.id), 'Field'); unique(spec.surfaces.map(s => s.id), 'Surface');
  unique(spec.places.map(p => p.id), 'Place');
  const fields = new Set(spec.fields.map(f => f.id));
  for (const f of spec.fields) {
    finite(f.base, 'Field base'); unique(f.layers.map(l => l.id), 'Noise layer');
    for (const l of f.layers) { validSpan(l.period); finite(l.amplitude, 'Noise amplitude'); }
  }
  if (!spec.surfaces.length || !spec.surfaces.some(s => !s.when.length)) throw new Error('Terrain needs an unconditional surface');
  for (const s of spec.surfaces) {
    ranges(s.when, fields); finite(s.priority, 'Surface priority');
    if (typeof s.region !== 'string' || !s.region || typeof s.biome !== 'string' || !s.biome
      || !/^#[0-9a-f]{6}$/i.test(s.color)) throw new Error('Surface needs region, biome, and hex color');
  }
  for (const p of spec.places) {
    validSpan(p.period); finite(p.priority, 'Place priority'); ranges(p.when, fields);
    if (typeof p.content !== 'string' || !p.content || p.period / spec.addressSpan > 4096
      || !Number.isSafeInteger(p.version) || p.version < 1
      || !Number.isFinite(p.chance) || p.chance < 0 || p.chance > 1
      || !Number.isFinite(p.radius) || p.radius <= 0 || p.radius > p.period / 2
      || !Number.isFinite(p.jitter) || p.jitter < 0 || p.jitter > 0.8) throw new Error('Invalid place recipe: ' + p.id);
    if (Object.hasOwn(p, 'landformHabitat') && (p.landformHabitat !== true || p.surface !== undefined))
      throw Error('Invalid landformHabitat population recipe');
    if (p.surface && (!p.surface.region || !/^#[0-9a-f]{6}$/i.test(p.surface.color))) throw new Error('Invalid place surface');
    if ((Math.ceil(spec.addressSpan / p.period) + 5) ** 2 > 4096) throw new Error('Place page query exceeds candidate budget');
  }
  validateMassPatches(spec);
  validateMassLandforms(spec);
  validateRegionalDiscoveries(spec);
  validateNativeRegional(spec);
  if (spec.places.length > 64) throw new Error('Regional planner exceeds 64 place families');
  for (const a of spec.places) for (const b of spec.places) {
    if (Math.ceil((a.radius + b.radius) / b.period) + 2 > 8) throw new Error('Place overlap query exceeds bounded neighborhood');
  }
}

export function makeMassRun(seed: number, runId: string, spec: MassSpec): MassRun {
  validateMassSpec(spec, seed);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || typeof runId !== 'string' || !runId)
    throw new Error('Run needs a uint32 seed and stable ID');
  return Object.freeze({ schema: 1, seed, runId, generator: spec.id, version: spec.version,
    manifest: massDigest(spec), addressSpan: spec.addressSpan });
}
export const matchesMassRanges = (rows: readonly MassRange[], fields: Readonly<Record<string, number>>): boolean =>
  rows.every(r => fields[r.field] >= (r.min ?? -Infinity) && fields[r.field] < (r.max ?? Infinity));

/** No mutable registry/global-seed reads after construction. Second worlds and
 * async prefetch cannot change a standing world's geographic truth. */
export class MassGenerator {
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
      (origin,box)=>this.regionalLandformSites(origin,box,true)) : null;
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
}
