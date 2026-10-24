import type { ZoneDef } from '../data/zones';
import { TILESETS, type TilesetDef } from '../data/tilesets';
import { address, cellInteger, floorDiv, localOffset, moveAddress, neighborCell,
  type MassAddress } from './address';
import type { MassPlace } from './contracts';
import type { MassGenerator } from './generator';
import { canonical, freezeData, massDigest, massRandom } from './random';

/** A region is geographic ownership, not a renderer page or a loadable zone. */
export interface MassRegionSpec {
  source: string; version: number; cellsPerRegion: number;
  maxQueryRegions: number; maxPlaces: number; cacheSize: number;
}
export interface MassPlaceRef { run: string; id: string; center: MassAddress }
export interface MassRegionSource {
  id: string; source: string; biomes: string[];
  /** An already resolved native definition. No registry lookup after construction. */
  zone: ZoneDef;
  /** Unabridged registry recipe, when a native context was resolved from one. */
  authored?: unknown;
}
export interface MassRegion {
  id: string; run: string; dimension: string; rx: string; ry: string;
  origin: MassAddress; center: MassAddress; span: number; biome: string;
  /** Absence is honest: an unsupported biome never borrows another region's kit. */
  native?: Readonly<MassRegionSource>;
  places: readonly MassPlace[];
}

/** Inventory only. It does not claim that any of these recipes has been rendered
 * or admitted. Callers compile selected native definitions and save the result. */
export function nativeMassRegionCatalog(): readonly Readonly<{ id: string; definition: TilesetDef }>[] {
  return freezeData(Object.values(TILESETS).filter(t => t.frontier !== false && !t.realm && !t.boundless)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(t => ({ id: t.id, definition: JSON.parse(JSON.stringify(t)) as TilesetDef })));
}

/** Pure bounded geographic planner. Query order, discovery and cache eviction
 * cannot change ownership. A place belongs to the region containing its CENTER;
 * overlapping scenery remains the native feature owner's separate concern. */
export class MassRegions {
  readonly spec: Readonly<MassRegionSpec>;
  readonly sources: readonly Readonly<MassRegionSource>[];
  private cache = new Map<string, Readonly<MassRegion>>();
  constructor(readonly generator: MassGenerator, spec: MassRegionSpec, sources: readonly MassRegionSource[] = []) {
    if (!spec.source || !Number.isSafeInteger(spec.version) || spec.version < 1
      || !Number.isSafeInteger(spec.cellsPerRegion) || spec.cellsPerRegion < 1 || spec.cellsPerRegion > 8
      || !Number.isSafeInteger(spec.maxQueryRegions) || spec.maxQueryRegions < 1 || spec.maxQueryRegions > 81
      || !Number.isSafeInteger(spec.maxPlaces) || spec.maxPlaces < 1 || spec.maxPlaces > 4096
      || !Number.isSafeInteger(spec.cacheSize) || spec.cacheSize < 1 || spec.cacheSize > 128)
      throw Error('Invalid physical region policy');
    if (new Set(sources.map(s => s.id)).size !== sources.length || sources.length > 256
      || sources.some(s => !s.id || !s.source || !s.biomes.length || s.biomes.some(b => !b)
        || !s.zone.id || !s.zone.objective || !Number.isFinite(s.zone.level) || s.zone.level < 1))
      throw Error('Invalid native region sources');
    this.spec = freezeData(JSON.parse(canonical(spec)) as MassRegionSpec);
    this.sources = freezeData(JSON.parse(canonical(sources)) as MassRegionSource[])
      .slice().sort((a, b) => a.id.localeCompare(b.id));
    Object.freeze(this.sources);
  }
  at(at: MassAddress): Readonly<MassRegion> {
    this.checkAddress(at);
    const n = BigInt(this.spec.cellsPerRegion);
    return this.region(at.dimension, floorDiv(cellInteger(at.cx), n).toString(), floorDiv(cellInteger(at.cy), n).toString());
  }
  near(at: MassAddress, radius: number): readonly Readonly<MassRegion>[] {
    if (!Number.isSafeInteger(radius) || radius < 0 || (radius * 2 + 1) ** 2 > this.spec.maxQueryRegions)
      throw Error('Physical region query exceeds budget');
    const here = this.at(at), out: Readonly<MassRegion>[] = [];
    for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++)
      out.push(this.region(at.dimension, (BigInt(here.rx) + BigInt(x)).toString(), (BigInt(here.ry) + BigInt(y)).toString()));
    return Object.freeze(out);
  }
  owns(region: Pick<MassRegion, 'id'>, place: Pick<MassPlace, 'center'>): boolean { return this.at(place.center).id === region.id; }
  reference(place: Pick<MassPlace, 'id' | 'center'>): Readonly<MassPlaceRef> {
    this.checkAddress(place.center);
    return freezeData({ run: this.generator.run.runId, id: place.id, center: { ...place.center } });
  }
  private checkAddress(at: MassAddress): void {
    const a = address(at.dimension, at.cx, at.cy, at.x, at.y, this.generator.spec.addressSpan);
    if (canonical(a) !== canonical(at)) throw Error('Noncanonical physical region address');
  }
  private region(dimension: string, rx: string, ry: string): Readonly<MassRegion> {
    const id = canonical([this.generator.run.runId, this.spec.source, this.spec.version, dimension, rx, ry]);
    const cached = this.cache.get(id);
    if (cached) { this.cache.delete(id); this.cache.set(id, cached); return cached; }
    const n = this.spec.cellsPerRegion, cellSpan = this.generator.spec.addressSpan, span = n * cellSpan;
    const origin = address(dimension, (BigInt(rx) * BigInt(n)).toString(), (BigInt(ry) * BigInt(n)).toString(), 0, 0, cellSpan);
    const center = moveAddress(origin, { x: span / 2, y: span / 2 }, cellSpan);
    const terrain = this.generator.terrainAt(center), places = new Map<string, MassPlace>();
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      for (const p of this.generator.regionalPlacesInCell(neighborCell(origin, x, y))) {
        if (p.center.dimension !== dimension || floorDiv(cellInteger(p.center.cx), BigInt(n)).toString() !== rx
          || floorDiv(cellInteger(p.center.cy), BigInt(n)).toString() !== ry) continue;
        places.set(p.id, p);
        // Truncation would make content silently depend on iteration order.
        if (places.size > this.spec.maxPlaces) throw Error('Physical region place budget exceeded');
      }
    }
    const candidates = this.sources.filter(s => s.biomes.includes(terrain.biome));
    const native = candidates.length ? massRandom(this.generator.run.seed, ['region-native', id]).pick(candidates) : undefined;
    const region = freezeData({ id, run: this.generator.run.runId, dimension, rx, ry, origin, center, span,
      biome: terrain.biome, ...(native ? { native } : {}), places: [...places.values()].sort((a, b) => a.id.localeCompare(b.id)) });
    this.cache.set(id, region);
    if (this.cache.size > this.spec.cacheSize) this.cache.delete(this.cache.keys().next().value!);
    return region;
  }
}

export interface MassRouteGeometry {
  /** Revision of ALL collision/terrain dependencies used by sweep, not a clock. */
  revision: string;
  /** Must test the entire swept disc against native movement geometry. A point
   * sample, LOS ray or guessed road line does not satisfy this contract. */
  sweep(from: MassAddress, to: MassAddress, bodyRadius: number): boolean;
}
export interface MassPhysicalRoute {
  id: string; run: string; source: string;
  from: Readonly<MassPlaceRef>; to: Readonly<MassPlaceRef>;
  mode: 'walk'; points: readonly MassAddress[]; length: number;
  bodyRadius: number; geometryRevision: string;
}
export interface MassRoutePolicy { source: string; addressSpan: number; bodyRadius: number; maxLength: number; maxSegments: number }

/** Candidates are real planned paths (e.g. journey trails), not asserted graph
 * links. Cross-dimension, mismatched endpoints, obstructed and over-budget
 * candidates do not produce an edge. This neither carves nor loads terrain. */
export function verifyMassRoute(from: MassPlaceRef, to: MassPlaceRef, path: readonly MassAddress[],
  policy: MassRoutePolicy, geometry: MassRouteGeometry): Readonly<MassPhysicalRoute> | null {
  if (!policy.source || !Number.isSafeInteger(policy.addressSpan) || policy.addressSpan < 1
    || !Number.isFinite(policy.bodyRadius) || policy.bodyRadius <= 0
    || !Number.isFinite(policy.maxLength) || policy.maxLength <= 0
    || !Number.isSafeInteger(policy.maxSegments) || policy.maxSegments < 1 || policy.maxSegments > 512
    || !geometry.revision) throw Error('Invalid physical route policy');
  if (!from.run || from.run !== to.run || !from.id || !to.id || from.id === to.id
    || from.center.dimension !== to.center.dimension || path.length < 2 || path.length - 1 > policy.maxSegments
    || canonical(path[0]) !== canonical(from.center) || canonical(path[path.length - 1]) !== canonical(to.center)) return null;
  let length = 0;
  try {
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      if (p.dimension !== from.center.dimension || canonical(address(p.dimension, p.cx, p.cy, p.x, p.y, policy.addressSpan)) !== canonical(p)) return null;
      if (i) {
        const d = localOffset(p, path[i - 1], policy.addressSpan), segment = Math.hypot(d.x, d.y);
        if (!segment || (length += segment) > policy.maxLength) return null;
      }
    }
  } catch { return null; }
  // Verify only after the entire candidate passes bounded structural checks.
  for (let i = 1; i < path.length; i++) if (!geometry.sweep(path[i - 1], path[i], policy.bodyRadius)) return null;
  const reverse = from.id > to.id, a = reverse ? to : from, b = reverse ? from : to;
  const points = reverse ? [...path].reverse() : [...path];
  return freezeData(JSON.parse(canonical({
    id: canonical([from.run, policy.source, a.id, b.id, massDigest(points)]), run: from.run, source: policy.source,
    from: a, to: b, mode: 'walk', points, length, bodyRadius: policy.bodyRadius, geometryRevision: geometry.revision,
  })) as MassPhysicalRoute);
}
export function massRouteCurrent(route: MassPhysicalRoute, geometryRevision: string, bodyRadius: number): boolean {
  return geometryRevision === route.geometryRevision && Number.isFinite(bodyRadius) && bodyRadius > 0 && bodyRadius <= route.bodyRadius;
}
