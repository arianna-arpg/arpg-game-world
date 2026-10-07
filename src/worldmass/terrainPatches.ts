import { pourLobes, pourContains } from '../engine/genkit';
import { address, floorDiv, latticeAt, localOffset, moveAddress, type MassAddress } from './address';
import type { MassPatchChoice, MassPatchPolicy, MassRange, MassRun, MassSpec, MassTerrain } from './contracts';
import { canonical, freezeData, massRandom } from './random';

export interface MassPatchBox { minX: number; minY: number; maxX: number; maxY: number }
export interface MassPatchPlan {
  id: string; origin: MassAddress; recipe: string; choice: MassPatchChoice;
  /** Local, terrain-aligned rectangles. The four strips form a complete ring. */
  footprint: MassPatchBox; bypasses: readonly MassPatchBox[];
  /** Row-major cell indices on the policy lattice, not continuous paint discs. */
  cells: readonly number[];
}
const matches = (rows: readonly MassRange[], fields: Readonly<Record<string, number>>) =>
  rows.every(r => fields[r.field] >= (r.min ?? -Infinity) && fields[r.field] < (r.max ?? Infinity));
export function patchBoxIntersects(box: MassPatchBox, x: number, y: number, radius: number): boolean {
  return Math.hypot(Math.max(0, box.minX - x, x - box.maxX), Math.max(0, box.minY - y, y - box.maxY)) <= radius;
}
export function validateMassPatches(spec: MassSpec): void {
  const p = spec.patches; if (p === undefined) return;
  if (!p || typeof p !== 'object') throw Error('Invalid terrain patch policy');
  const valid = (n: number, lo: number, hi: number) => Number.isFinite(n) && n >= lo && n <= hi;
  const ids = (values: readonly string[]) => values.length > 0 && values.every(s => typeof s === 'string' && !!s) && new Set(values).size === values.length;
  if (typeof p.source !== 'string' || !p.source || p.source.length > 256 || !Number.isSafeInteger(p.version) || p.version < 1
    || !Number.isSafeInteger(p.spacing) || p.spacing % spec.terrainCell || !valid(p.spacing / spec.terrainCell, 8, 64)
    || p.spacing > spec.addressSpan * 2 || !valid(p.jitter, 0, .8)
    || !Number.isSafeInteger(p.bypass) || p.bypass % spec.terrainCell || p.bypass < Math.max(48, spec.terrainCell * 2)
    || !Array.isArray(p.recipes) || p.recipes.length > 32 || !ids(p.recipes.map(r => r.id))) throw Error('Invalid terrain patch lattice');
  if (p.exclusions !== undefined) {
    if (!Array.isArray(p.exclusions) || p.exclusions.length > 64) throw Error('Invalid terrain patch exclusions');
    for (const e of p.exclusions) {
      if (!e || typeof e.source !== 'string' || !e.source || !e.bounds || !e.origin
        || Object.keys(e.bounds).length !== 4 || !(['minX','minY','maxX','maxY'] as const).every(k => typeof e.bounds[k] === 'number' && valid(e.bounds[k], -1048576, 1048576))
        || e.bounds.minX >= e.bounds.maxX || e.bounds.minY >= e.bounds.maxY
        || canonical(address(e.origin.dimension, e.origin.cx, e.origin.cy, e.origin.x, e.origin.y, spec.addressSpan)) !== canonical(e.origin))
        throw Error('Invalid terrain patch exclusion');
    }
  }
  const surfaces = new Set(spec.surfaces.map(s => s.id)), fields = new Set(spec.fields.map(f => f.id));
  for (const r of p.recipes) {
    if (!Array.isArray(r.onSurfaces) || !ids(r.onSurfaces) || r.onSurfaces.some((s: string) => !surfaces.has(s))
      || !valid(r.chance, 0, 1) || !Array.isArray(r.choices) || r.choices.length > 16 || !ids(r.choices.map((c: MassPatchChoice) => c.id))
      || !Array.isArray(r.when) || r.when.some((w: MassRange) => !fields.has(w.field)
        || w.min !== undefined && !Number.isFinite(w.min) || w.max !== undefined && !Number.isFinite(w.max)
        || (w.min ?? -Infinity) >= (w.max ?? Infinity))) throw Error('Invalid terrain patch recipe');
    for (const c of r.choices) {
      if (typeof c.region !== 'string' || !c.region || !/^#[0-9a-f]{6}$/i.test(c.color) || !valid(c.weight, Number.MIN_VALUE, 1e6)
        || !Array.isArray(c.radius) || c.radius.length !== 2 || !valid(c.radius[0], spec.terrainCell, p.spacing)
        || !valid(c.radius[1], c.radius[0], p.spacing) || !valid(c.scale, .1, 4) || !valid(c.wobble, 0, 1)
        || !Array.isArray(c.pieces) || c.pieces.length !== 2 || c.pieces.some((n: number) => !Number.isSafeInteger(n) || !valid(n, 0, 12)) || c.pieces[1] < c.pieces[0]
        // Native lobe maximum is <2.2*body at wobble<=1. Two raster cells
        // cover bbox rounding and boundary contact. All rings are disjoint.
        || c.radius[1] * c.scale * 2.2 + p.bypass + spec.terrainCell * 2 > p.spacing * (1 - p.jitter) / 2)
        throw Error('Invalid terrain patch shape or bypass clearance');
    }
  }
}

/** Pure finite planner: complete native lobe masks, then whole-candidate
 * rejection if neutral ground or existing site reservations block the ring.
 * No rejected pixels are cleared, and no neighboring acceptance is consulted. */
export class MassTerrainPatches {
  private readonly cache = new Map<string, Readonly<MassPatchPlan> | null>();
  constructor(private readonly spec: Readonly<MassSpec>, private readonly run: Readonly<MassRun>,
    private readonly baseAt: (at: MassAddress) => MassTerrain,
    private readonly sitesClear: (origin: MassAddress, box: MassPatchBox) => boolean) {}
  private get policy(): MassPatchPolicy { return this.spec.patches!; }
  private origin(dimension: string, gx: bigint, gy: bigint): MassAddress | null {
    const period = BigInt(this.policy.spacing), span = BigInt(this.spec.addressSpan);
    const min = -(1n << 63n) * span, end = (1n << 63n) * span;
    if ([gx, gy].some(g => g * period < min || (g + 1n) * period > end)) return null;
    const axis = (g: bigint): [string, number] => {
      const n = g * BigInt(this.policy.spacing), span = BigInt(this.spec.addressSpan), q = floorDiv(n, span);
      return [q.toString(), Number(n - q * span)];
    };
    const [cx, x] = axis(gx), [cy, y] = axis(gy);
    return address(dimension, cx, cy, x, y, this.spec.addressSpan);
  }
  private candidate(dimension: string, gx: bigint, gy: bigint): Readonly<MassPatchPlan> | null {
    const key = canonical([dimension, gx.toString(), gy.toString()]);
    if (this.cache.has(key)) return this.cache.get(key)!;
    const origin = this.origin(dimension, gx, gy);
    const plan = origin ? this.make(key, origin) : null;
    this.cache.set(key, plan);
    if (this.cache.size > 256) this.cache.delete(this.cache.keys().next().value!);
    return plan;
  }
  private make(key: string, origin: MassAddress): Readonly<MassPatchPlan> | null {
    const p = this.policy, cell = this.spec.terrainCell, cols = p.spacing / cell;
    const id = canonical([this.run.runId, p.source, p.version, key]);
    const rng = massRandom(this.run.seed, [this.spec.id, this.spec.version, 'terrain-patch', p.source, p.version, key]);
    const center = { x: p.spacing * (.5 + rng.range(-.5, .5) * p.jitter), y: p.spacing * (.5 + rng.range(-.5, .5) * p.jitter) };
    const base = this.baseAt(moveAddress(origin, center, this.spec.addressSpan));
    const recipe = p.recipes.find(r => r.onSurfaces.includes(base.source.rule) && matches(r.when, base.fields));
    if (!recipe || base.region !== 'ground' || !rng.chance(recipe.chance)) return null;
    const choice = rng.weighted(recipe.choices), body = rng.range(...choice.radius) * choice.scale, seed = rng.int(0, 0x7fffffff);
    const lobes = pourLobes(rng, center, body, seed, choice.pieces), cells: number[] = [];
    let x0 = cols, y0 = cols, x1 = -1, y1 = -1;
    const loX = Math.max(0, Math.floor((center.x - body * 2.2) / cell)), hiX = Math.min(cols - 1, Math.floor((center.x + body * 2.2) / cell));
    const loY = Math.max(0, Math.floor((center.y - body * 2.2) / cell)), hiY = Math.min(cols - 1, Math.floor((center.y + body * 2.2) / cell));
    for (let y = loY; y <= hiY; y++) for (let x = loX; x <= hiX; x++) {
      if (!pourContains(lobes, choice.wobble, (x + .5) * cell, (y + .5) * cell)) continue;
      const ground = this.baseAt(moveAddress(origin, { x: (x + .5) * cell, y: (y + .5) * cell }, this.spec.addressSpan));
      // Preserve complete shapes at shores/biome edges; never trim a body into
      // a different unverified footprint or replace a site-specific surface.
      if (ground.region !== 'ground' || !recipe.onSurfaces.includes(ground.source.rule)) return null;
      cells.push(y * cols + x); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    if (!cells.length) return null;
    const footprint = { minX: x0 * cell, minY: y0 * cell, maxX: (x1 + 1) * cell, maxY: (y1 + 1) * cell };
    const outer = { minX: footprint.minX - p.bypass, minY: footprint.minY - p.bypass, maxX: footprint.maxX + p.bypass, maxY: footprint.maxY + p.bypass };
    if (outer.minX < 0 || outer.minY < 0 || outer.maxX > p.spacing || outer.maxY > p.spacing || this.excluded(origin, outer) || !this.sitesClear(origin, outer)) return null;
    const bypasses = [
      { minX: outer.minX, minY: outer.minY, maxX: outer.maxX, maxY: footprint.minY },
      { minX: outer.minX, minY: footprint.maxY, maxX: outer.maxX, maxY: outer.maxY },
      { minX: outer.minX, minY: footprint.minY, maxX: footprint.minX, maxY: footprint.maxY },
      { minX: footprint.maxX, minY: footprint.minY, maxX: outer.maxX, maxY: footprint.maxY },
    ];
    for (const box of bypasses) for (let y = box.minY; y < box.maxY; y += cell) for (let x = box.minX; x < box.maxX; x += cell) {
      if (this.baseAt(moveAddress(origin, { x: x + cell / 2, y: y + cell / 2 }, this.spec.addressSpan)).region !== 'ground') return null;
    }
    return freezeData({ id, origin, recipe: recipe.id, choice, footprint, bypasses, cells });
  }
  private excluded(origin: MassAddress, box: MassPatchBox): boolean {
    for (const e of this.policy.exclusions ?? []) {
      if (origin.dimension !== e.origin.dimension) continue;
      // The exclusion is bounded local data. Discard far cells using BigInt
      // before subtraction; no address history is narrowed into Number.
      const limit = BigInt(Math.ceil(2097152 / this.spec.addressSpan) + 8);
      const dx = BigInt(origin.cx) - BigInt(e.origin.cx), dy = BigInt(origin.cy) - BigInt(e.origin.cy);
      if (dx < -limit || dx > limit || dy < -limit || dy > limit) continue;
      const q = localOffset(origin, e.origin, this.spec.addressSpan, Number(limit));
      if (box.minX + q.x <= e.bounds.maxX && box.maxX + q.x >= e.bounds.minX
        && box.minY + q.y <= e.bounds.maxY && box.maxY + q.y >= e.bounds.minY) return true;
    }
    return false;
  }
  at(at: MassAddress): Readonly<MassPatchPlan> | null {
    const q = latticeAt(at, this.spec.addressSpan, this.policy.spacing);
    return this.candidate(at.dimension, q.gx, q.gy);
  }
  sample(at: MassAddress, base: MassTerrain): MassTerrain {
    const plan = this.at(at); if (!plan) return base;
    // BigInt identifies the lattice before conversion; only a bounded local
    // offset becomes Number. Exact negative and far-world edges stay distinct.
    const q = localOffset(at, plan.origin, this.spec.addressSpan, 8), cell = this.spec.terrainCell;
    const index = Math.floor(q.y / cell) * (this.policy.spacing / cell) + Math.floor(q.x / cell);
    if (!plan.cells.includes(index)) return base;
    return Object.freeze({ ...base, region: plan.choice.region, color: plan.choice.color,
      source: Object.freeze({ generator: this.spec.id, version: this.spec.version,
        rule: plan.recipe + '/' + plan.choice.id, source: this.policy.source, stream: plan.id }) });
  }
  /** Reservations protect only the neutral annulus, leaving the wet interior
   * available to wetland ecology. Queries never depend on resident pages. */
  reserves(at: MassAddress, radius: number): boolean {
    if (!Number.isFinite(radius) || radius < 0) throw Error('Invalid terrain bypass query');
    const span = this.spec.addressSpan, period = this.policy.spacing;
    const lo = latticeAt({ ...at, x: at.x - radius, y: at.y - radius }, span, period);
    const hi = latticeAt({ ...at, x: at.x + radius, y: at.y + radius }, span, period);
    if ((hi.gx - lo.gx + 1n) * (hi.gy - lo.gy + 1n) > 4096n) throw Error('Terrain bypass query exceeds candidate budget');
    for (let y = lo.gy; y <= hi.gy; y++) for (let x = lo.gx; x <= hi.gx; x++) {
      const plan = this.candidate(at.dimension, x, y); if (!plan) continue;
      const q = localOffset(at, plan.origin, span, 4096);
      if (plan.bypasses.some(box => patchBoxIntersects(box, q.x, q.y, radius))) return true;
    }
    return false;
  }
  get stats(): { cached: number } { return { cached: this.cache.size }; }
}
