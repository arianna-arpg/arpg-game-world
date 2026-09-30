import { address, cellKey, floorDiv, latticeAt, localOffset, moveAddress, validSpan, type MassAddress, type MassCell } from './address';
import type { MassPlace, MassPlaceRecipe, MassRange, MassRun, MassSpec, MassTerrain } from './contracts';
import { canonical, freezeData, massDigest, massHash, massRandom, streamSeed } from './random';

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
export function validateMassSpec(spec: MassSpec): void {
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
    if ((Math.ceil(spec.addressSpan / p.period) + 5) ** 2 > 4096) throw new Error('Place page query exceeds candidate budget');
  }
  if (spec.places.length > 64) throw new Error('Regional planner exceeds 64 place families');
  for (const a of spec.places) for (const b of spec.places) {
    if (Math.ceil((a.radius + b.radius) / b.period) + 2 > 8) throw new Error('Place overlap query exceeds bounded neighborhood');
  }
}

export function makeMassRun(seed: number, runId: string, spec: MassSpec): MassRun {
  validateMassSpec(spec);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || typeof runId !== 'string' || !runId)
    throw new Error('Run needs a uint32 seed and stable ID');
  return Object.freeze({ schema: 1, seed, runId, generator: spec.id, version: spec.version,
    manifest: massDigest(spec), addressSpan: spec.addressSpan });
}
const matches = (rows: readonly MassRange[], fields: Readonly<Record<string, number>>): boolean =>
  rows.every(r => fields[r.field] >= (r.min ?? -Infinity) && fields[r.field] < (r.max ?? Infinity));
const smooth = (n: number): number => n * n * (3 - 2 * n);

/** No mutable registry/global-seed reads after construction. Second worlds and
 * async prefetch cannot change a standing world's geographic truth. */
export class MassGenerator {
  readonly spec: Readonly<MassSpec>;
  readonly run: Readonly<MassRun>;
  private readonly surfaces: MassSpec['surfaces'];
  private readonly salts = new Map<string, number>();
  constructor(run: MassRun, spec: MassSpec) {
    const expected = makeMassRun(run.seed, run.runId, spec);
    if (canonical(run) !== canonical(expected)) throw new Error('World generator/content manifest mismatch');
    this.spec = freezeData(JSON.parse(canonical(spec)) as MassSpec);
    this.run = freezeData({ ...run });
    this.surfaces = [...this.spec.surfaces].sort((a, b) => b.priority - a.priority || compare(a.id, b.id));
    for (const f of this.spec.fields) for (const l of f.layers)
      this.salts.set(canonical([f.id, l.id]), streamSeed(run.seed, [spec.id, spec.version, f.id, l.id]));
  }
  private noise(at: MassAddress, period: number, salt: number): number {
    const { gx, gy, fx, fy } = latticeAt(at, this.spec.addressSpan, period);
    const sample = (x: bigint, y: bigint): number => massHash(JSON.stringify([at.dimension, x.toString(), y.toString()]), salt) / 0x100000000;
    const a = sample(gx, gy), b = sample(gx + 1n, gy), c = sample(gx, gy + 1n), d = sample(gx + 1n, gy + 1n);
    const sx = smooth(fx), sy = smooth(fy);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  }
  fieldsAt(at: MassAddress): Readonly<Record<string, number>> {
    const result: Record<string, number> = Object.create(null) as Record<string, number>;
    for (const f of this.spec.fields) {
      let value = f.base;
      for (const l of f.layers) {
        const n = this.noise(at, l.period, this.salts.get(canonical([f.id, l.id]))!);
        value += (l.ridge ? (1 - Math.abs(n * 2 - 1)) ** 2 : n * 2 - 1) * l.amplitude;
      }
      result[f.id] = value;
    }
    return Object.freeze(result);
  }
  terrainAt(at: MassAddress): MassTerrain {
    const fields = this.fieldsAt(at), s = this.surfaces.find(row => matches(row.when, fields))!;
    return Object.freeze({ region: s.region, color: s.color, biome: s.biome, fields,
      source: Object.freeze({ generator: this.spec.id, version: this.spec.version, rule: s.id,
        source: s.biome, stream: canonical([this.run.seed, 'terrain', cellKey(at)]) }) });
  }
  private candidate(recipe: MassPlaceRecipe, dimension: string, gx: bigint, gy: bigint): MassPlace | null {
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
    if (!matches(recipe.when, this.fieldsAt(center))) return null;
    return { id: canonical([this.run.runId, ...namespace]), recipe: recipe.id, content: recipe.content,
      center, radius: recipe.radius, source: { generator: this.spec.id, version: this.spec.version,
        rule: recipe.id, source: recipe.content, stream: canonical(namespace) } };
  }
  /** Local inhibition: no higher-ranked candidate may intersect this footprint.
   * Finite dependencies, no recursive packing, no late movement of existing sites. */
  private accepted(p: MassPlace, recipe: MassPlaceRecipe): boolean {
    for (const other of this.spec.places) {
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
    return Object.freeze([...result.values()].sort((a, b) => compare(a.id, b.id)));
  }
}
