import type { MassAddress } from './address';
import { address, cellInteger, floorDiv } from './address';
import type { MassRegionSource } from './regions';
import type { NativeCountrySpec } from './nativeCountry';
import type { TilesetDef } from '../data/tilesets';
import type { BiomeInfo } from '../world/biomes';
import { canonical, freezeData, massDigest, massRandom } from './random';

export type MassGeographicKind = 'region' | 'zone' | 'chunk';
/** Integer world-unit bounds, half open. They never narrow a distant origin to Number. */
export interface MassBounds { dimension: string; minX: string; minY: string; maxX: string; maxY: string }
export interface MassHierarchyPolicy {
  source: string; version: number; chunkSpan: number; chunksPerZone: number; zonesPerRegion: number;
  maxQuery: number; cacheSize: number;
}
export interface MassGeography {
  id: string; run: string; kind: MassGeographicKind; dimension: string; parent: string;
  ix: string; iy: string; span: number; bounds: MassBounds; origin: MassAddress; center: MassAddress;
  native?: Readonly<MassRegionSource>;
}
export interface MassHierarchyLocation { world: string; region: Readonly<MassGeography>; zone: Readonly<MassGeography>; chunk: Readonly<MassGeography> }
export interface MassControllerReceipt { id: string; source: string; subject: string; kind: string; at: number }
export type MassControllerPhase = 'waiting' | 'active' | 'dormant' | 'complete' | 'failed';
export interface MassControllerSave {
  id: string; source: string; definition: unknown; definitionHash: string;
  phase: MassControllerPhase; clock: number; updatedAt: number; revision: number;
  state: unknown; receipts: MassControllerReceipt[];
}
export interface MassGeographicSave { owner: MassGeography; controllers: MassControllerSave[] }
export interface MassHierarchySave {
  schema: 1; run: string; seed: number; addressSpan: number; policy: MassHierarchyPolicy;
  sources: MassRegionSource[]; owners: MassGeographicSave[];
}
const copy = <T>(v: T): T => JSON.parse(canonical(v)) as T;
const integer = (s: string): bigint => {
  if (typeof s !== 'string' || !/^(0|-?[1-9][0-9]*)$/.test(s) || s.length > 40) throw Error('Invalid geographic coordinate');
  return BigInt(s);
};
function whole(at: MassAddress, span: number): { x: bigint; y: bigint; fx: number; fy: number } {
  if (canonical(address(at.dimension, at.cx, at.cy, at.x, at.y, span)) !== canonical(at)) throw Error('Noncanonical geographic address');
  return { x: cellInteger(at.cx) * BigInt(span) + BigInt(Math.floor(at.x)),
    y: cellInteger(at.cy) * BigInt(span) + BigInt(Math.floor(at.y)), fx: at.x % 1, fy: at.y % 1 };
}
function coordinate(dimension: string, x: bigint, y: bigint, span: number): MassAddress {
  const s = BigInt(span), cx = floorDiv(x, s), cy = floorDiv(y, s);
  return address(dimension, cx.toString(), cy.toString(), Number(x - cx * s), Number(y - cy * s), span);
}
export function validateMassBounds(b: MassBounds): void {
  if (!b || !b.dimension || b.dimension.length > 128 || integer(b.minX) >= integer(b.maxX) || integer(b.minY) >= integer(b.maxY))
    throw Error('Invalid geographic bounds');
}
export function massBoundsContains(b: MassBounds, at: MassAddress, span: number): boolean {
  validateMassBounds(b);
  if (b.dimension !== at.dimension) return false;
  const p = whole(at, span);
  return p.x >= integer(b.minX) && p.x < integer(b.maxX) && p.y >= integer(b.minY) && p.y < integer(b.maxY);
}
export function massBoundsIntersect(a: MassBounds, b: MassBounds): boolean {
  validateMassBounds(a); validateMassBounds(b);
  return a.dimension === b.dimension && integer(a.minX) < integer(b.maxX) && integer(b.minX) < integer(a.maxX)
    && integer(a.minY) < integer(b.maxY) && integer(b.minY) < integer(a.maxY);
}
/** Queries round outward to whole units; geographic ownership itself keeps the exact address. */
export function massAddressBounds(at: MassAddress, width: number, height: number, span: number): MassBounds {
  if (![width, height].every(n => Number.isSafeInteger(n) && n > 0)) throw Error('Invalid geographic extent');
  const p = whole(at, span);
  return { dimension: at.dimension, minX: p.x.toString(), minY: p.y.toString(),
    maxX: (p.x + BigInt(width) + (p.fx ? 1n : 0n)).toString(), maxY: (p.y + BigInt(height) + (p.fy ? 1n : 0n)).toString() };
}
export const MASS_HIERARCHY_DEFAULT: Readonly<MassHierarchyPolicy> = freezeData({
  source: 'native-country-geography', version: 1, chunkSpan: 1350, chunksPerZone: 4, zonesPerRegion: 4, maxQuery: 128, cacheSize: 256,
});
/** Resolve geographic context from the ALREADY SAVED country sources. This is
 * source data, not a declaration that every layout/environment mechanic is live. */
export function nativeHierarchySources(country: NativeCountrySpec, zoneSpan = 5400): readonly Readonly<MassRegionSource>[] {
  if (massDigest({ sources: country.sources, climate: country.climate }) !== country.sourceHash
    || !Number.isSafeInteger(zoneSpan) || zoneSpan < 1) throw Error('Invalid native hierarchy sources');
  const bag = country.sources as { tilesets: { id: string; definition: TilesetDef }[]; biomes: { id: string; definition: BiomeInfo | null }[] };
  if (!Array.isArray(bag.tilesets) || !Array.isArray(bag.biomes)) throw Error('Missing native hierarchy sources');
  return freezeData(bag.tilesets.map(row => {
    const ts = row.definition, biome = bag.biomes.find(b => b.id === ts.biome)?.definition;
    if (!ts || row.id !== ts.id) throw Error('Invalid native hierarchy tileset');
    return copy({ id: ts.id, source: 'data/tilesets/' + ts.id, biomes: [ts.biome ?? 'unknown'], authored: { tileset: ts, biome: biome ?? null },
      zone: {
        id: 'native-context/' + ts.id, name: [ts.nameFirst[0], ts.nameSecond[0]].filter(Boolean).join(' '), level: 1,
        size: { w: zoneSpan, h: zoneSpan }, theme: ts.theme, biome: ts.biome ?? 'unknown', tileset: ts.id,
        objective: { kind: 'none' as const }, exits: [], map: { x: 0, y: 0 },
        layout: [...(ts.common ?? []), ...ts.layout], packs: ts.packs,
        layoutParams: { ...biome?.layoutParams, ...ts.layoutParams },
        ...(ts.sky ? { sky: ts.sky } : {}), ...(ts.camera ? { camera: ts.camera } : {}),
        ...(ts.puzzles ? { puzzles: ts.puzzles } : {}), ...(ts.scenery ? { scenery: ts.scenery } : {}),
        ...(ts.hollows ? { hollows: ts.hollows } : {}),
        structures: [...(biome?.structures ?? []), ...(ts.structures ?? [])],
        compositions: [...(biome?.compositions ?? []), ...(ts.compositions ?? [])],
        landmarks: [...(biome?.landmarks ?? []), ...(ts.landmarks ?? [])],
      },
    });
  }).sort((a, b) => a.id.localeCompare(b.id)));
}
const transitions: Record<MassControllerPhase, readonly MassControllerPhase[]> = {
  waiting: ['active', 'failed'], active: ['dormant', 'complete', 'failed'], dormant: ['active', 'failed'], complete: [], failed: [],
};

/** Geography has no loading side effect. Sparse controller ownership survives
 * geography-cache eviction and advances only on explicit native-controller facts. */
export class MassHierarchy {
  readonly policy: Readonly<MassHierarchyPolicy>;
  readonly sources: readonly Readonly<MassRegionSource>[];
  private cache = new Map<string, Readonly<MassGeography>>();
  private records = new Map<string, MassGeographicSave>();
  constructor(readonly run: string, readonly seed: number, readonly addressSpan: number,
    policy: MassHierarchyPolicy = MASS_HIERARCHY_DEFAULT, sources: readonly MassRegionSource[] = [], saved?: MassHierarchySave,
    private select?: (geography: Readonly<MassGeography>) => string | undefined) {
    if (!run || !Number.isSafeInteger(seed) || !Number.isSafeInteger(addressSpan) || addressSpan < 1 || !policy.source
      || !Number.isSafeInteger(policy.version) || policy.version < 1
      || ![policy.chunkSpan, policy.chunksPerZone, policy.zonesPerRegion, policy.maxQuery, policy.cacheSize].every(n => Number.isSafeInteger(n) && n > 0)
      || policy.chunkSpan * policy.chunksPerZone * policy.zonesPerRegion > 1e8 || policy.maxQuery > 4096 || policy.cacheSize > 4096)
      throw Error('Invalid geographic hierarchy policy');
    this.policy = freezeData(copy(policy));
    const catalogue = saved?.sources ?? sources;
    if (catalogue.length > 1024 || new Set(catalogue.map(s => s.id)).size !== catalogue.length
      || catalogue.some(s => !s.id || !s.source || !s.zone?.objective || !s.zone.id || !Number.isFinite(s.zone.level)))
      throw Error('Invalid geographic native source catalogue');
    this.sources = freezeData(copy(catalogue));
    if (saved) {
      if (saved.schema !== 1 || saved.run !== run || saved.seed !== seed || saved.addressSpan !== addressSpan
        || canonical(saved.policy) !== canonical(policy) || !Array.isArray(saved.owners)) throw Error('Incompatible geographic checkpoint');
      for (const row of saved.owners) {
        const expected = this.geography(row.owner.kind, row.owner.dimension, row.owner.ix, row.owner.iy);
        const geometry = (g: MassGeography) => { const { native: _native, ...rest } = g; return rest; };
        if (canonical(geometry(expected)) !== canonical(geometry(row.owner)) || row.owner.kind === 'chunk'
          || this.records.has(row.owner.id) || !Array.isArray(row.controllers) || row.controllers.length > 128
          || new Set(row.controllers.map(c => c.id)).size !== row.controllers.length) throw Error('Invalid geographic owner checkpoint');
        if (row.owner.native && !this.sources.some(s => canonical(s) === canonical(row.owner.native))) throw Error('Unknown frozen geographic source');
        for (const c of row.controllers) this.validateController(c);
        const restored = copy(row); restored.owner = freezeData(restored.owner);
        this.records.set(row.owner.id, restored);
      }
    }
  }
  world(dimension: string): string { return canonical([this.run, this.policy.source, this.policy.version, dimension, 'world']); }
  span(kind: MassGeographicKind): number {
    const p = this.policy;
    return kind === 'chunk' ? p.chunkSpan : p.chunkSpan * p.chunksPerZone * (kind === 'region' ? p.zonesPerRegion : 1);
  }
  at(at: MassAddress): Readonly<MassHierarchyLocation> {
    const p = whole(at, this.addressSpan);
    const get = (k: MassGeographicKind) => this.geography(k, at.dimension,
      floorDiv(p.x, BigInt(this.span(k))).toString(), floorDiv(p.y, BigInt(this.span(k))).toString());
    return Object.freeze({ world: this.world(at.dimension), region: get('region'), zone: get('zone'), chunk: get('chunk') });
  }
  intersections(kind: MassGeographicKind, bounds: MassBounds): readonly Readonly<MassGeography>[] {
    validateMassBounds(bounds);
    const s = BigInt(this.span(kind)), x0 = floorDiv(integer(bounds.minX), s), y0 = floorDiv(integer(bounds.minY), s);
    const x1 = floorDiv(integer(bounds.maxX) - 1n, s), y1 = floorDiv(integer(bounds.maxY) - 1n, s);
    if ((x1 - x0 + 1n) * (y1 - y0 + 1n) > BigInt(this.policy.maxQuery)) throw Error('Geographic intersection query exceeds budget');
    const out: Readonly<MassGeography>[] = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push(this.geography(kind, bounds.dimension, x.toString(), y.toString()));
    return Object.freeze(out);
  }
  // A record owns one immutable geography snapshot; controller state stays mutable.
  owner(id: string): Readonly<MassGeography> | undefined { return this.records.get(id)?.owner; }
  /** Read-only capacity preflight for atomic multi-controller native births. */
  controllerCount(owner: string): number { return this.records.get(owner)?.controllers.length ?? 0; }
  controller(owner: string, id: string): Readonly<MassControllerSave> | undefined {
    const c = this.records.get(owner)?.controllers.find(c => c.id === id); return c && freezeData(copy(c));
  }
  /** Per-frame controllers read their latch/revision without copying a complete
   * frozen native source definition on every simulation tick. */
  status(owner: string, id: string): Readonly<Pick<MassControllerSave, 'phase' | 'revision' | 'clock' | 'updatedAt'>> | undefined {
    const c = this.records.get(owner)?.controllers.find(c => c.id === id);
    return c && { phase: c.phase, revision: c.revision, clock: c.clock, updatedAt: c.updatedAt };
  }
  controllers(): readonly Readonly<MassGeographicSave>[] { return freezeData(copy([...this.records.values()])); }
  enroll(owner: MassGeography, id: string, source: string, definition: unknown, state: unknown, now: number): Readonly<MassControllerSave> {
    if (owner.kind === 'chunk' || !id || !source || !Number.isFinite(now) || now < 0) throw Error('Invalid geographic controller enrollment');
    const expected = this.at(owner.center)[owner.kind];
    if (expected.id !== owner.id || canonical(expected.bounds) !== canonical(owner.bounds)) throw Error('Foreign geographic controller owner');
    const old = this.controller(owner.id, id), hash = massDigest(definition);
    if (old) {
      if (old.source !== source || old.definitionHash !== hash) throw Error('Geographic controller source changed');
      return old;
    }
    let row = this.records.get(owner.id);
    if (!row) { row = { owner: freezeData(copy(owner)), controllers: [] }; this.records.set(owner.id, row); }
    if (row.controllers.length >= 128) throw Error('Geographic owner controller budget exceeded');
    const c: MassControllerSave = { id, source, definition: copy(definition), definitionHash: hash, phase: 'waiting', clock: 0,
      updatedAt: now, revision: 0, state: copy(state), receipts: [] };
    row.controllers.push(c); return freezeData(copy(c));
  }
  /** Compare-and-swap native state + one clock. Other owners never advance here. */
  update(owner: string, id: string, revision: number, now: number, state: unknown, phase?: MassControllerPhase): boolean {
    const c = this.records.get(owner)?.controllers.find(c => c.id === id);
    if (!c || c.revision !== revision) return false;
    if (c.phase === 'complete' || c.phase === 'failed') return false;
    if (!Number.isFinite(now) || now < c.updatedAt) throw Error('Geographic controller clock moved backwards');
    if (phase && phase !== c.phase && !transitions[c.phase].includes(phase)) return false;
    const data = copy(state);
    if (c.phase === 'active') c.clock += now - c.updatedAt;
    c.updatedAt = now; c.state = data; c.phase = phase ?? c.phase; c.revision++; return true;
  }
  receipt(owner: string, id: string, revision: number, receipt: MassControllerReceipt): boolean {
    const c = this.records.get(owner)?.controllers.find(c => c.id === id);
    this.validateReceipt(receipt);
    if (!c || c.revision !== revision || receipt.at !== c.updatedAt || c.receipts.some(r => r.id === receipt.id)) return false;
    if (c.receipts.length >= 4096) throw Error('Geographic controller receipt budget exceeded');
    c.receipts.push(copy(receipt)); c.revision++; return true;
  }
  snapshot(): MassHierarchySave {
    return copy({ schema: 1, run: this.run, seed: this.seed, addressSpan: this.addressSpan, policy: this.policy,
      sources: [...this.sources], owners: [...this.records.values()].sort((a, b) => a.owner.id.localeCompare(b.owner.id)) });
  }
  private geography(kind: MassGeographicKind, dimension: string, ix: string, iy: string): Readonly<MassGeography> {
    if (!['region', 'zone', 'chunk'].includes(kind)) throw Error('Unknown geographic owner kind');
    const x = integer(ix), y = integer(iy), id = canonical([this.run, this.policy.source, this.policy.version, dimension, kind, ix, iy]);
    const saved = this.records.get(id); if (saved) return saved.owner;
    const found = this.cache.get(id);
    if (found) { this.cache.delete(id); this.cache.set(id, found); return found; }
    const span = this.span(kind), s = BigInt(span), minX = x * s, minY = y * s;
    const parentKind = kind === 'chunk' ? 'zone' : 'region', parentSpan = BigInt(this.span(parentKind));
    const parent = kind === 'region' ? this.world(dimension) : canonical([this.run, this.policy.source, this.policy.version, dimension,
      parentKind, floorDiv(minX, parentSpan).toString(), floorDiv(minY, parentSpan).toString()]);
    const row: MassGeography = { id, run: this.run, kind, dimension, parent, ix, iy, span,
      bounds: { dimension, minX: minX.toString(), minY: minY.toString(), maxX: (minX + s).toString(), maxY: (minY + s).toString() },
      origin: coordinate(dimension, minX, minY, this.addressSpan), center: coordinate(dimension, minX + s / 2n, minY + s / 2n, this.addressSpan) };
    if (kind !== 'chunk' && this.sources.length) {
      const selected = this.select?.(freezeData(copy(row)));
      const source = this.select ? this.sources.find(s => s.id === selected) : massRandom(this.seed, [id, 'native-source']).pick(this.sources);
      if (selected && !source) throw Error('Unknown selected geographic native source');
      if (source) row.native = source;
    }
    const frozen = freezeData(row); this.cache.set(id, frozen);
    if (this.cache.size > this.policy.cacheSize) this.cache.delete(this.cache.keys().next().value!);
    return frozen;
  }
  private validateReceipt(r: MassControllerReceipt): void {
    if (!r || ![r.id, r.source, r.subject, r.kind].every(s => typeof s === 'string' && !!s && s.length <= 4096)
      || !Number.isFinite(r.at) || r.at < 0) throw Error('Invalid geographic lifecycle receipt');
  }
  private validateController(c: MassControllerSave): void {
    if (!c || !c.id || !c.source || c.definitionHash !== massDigest(c.definition) || !Object.hasOwn(transitions, c.phase)
      || ![c.clock, c.updatedAt].every(n => Number.isFinite(n) && n >= 0) || !Number.isSafeInteger(c.revision) || c.revision < 0
      || !Array.isArray(c.receipts) || c.receipts.length > 4096 || new Set(c.receipts.map(r => r.id)).size !== c.receipts.length)
      throw Error('Invalid geographic controller checkpoint');
    canonical(c.state); for (const r of c.receipts) this.validateReceipt(r);
  }
}
