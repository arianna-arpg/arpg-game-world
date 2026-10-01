import type { Vec2 } from '../core/math';
import { regionKind } from '../world/regions';
import type { PathProfile, RegionGrid } from '../world/walk';
import { address, type MassAddress, type MassCell } from './address';
import { MassStream } from './stream';

export interface MassNavigationConfig {
  maxNodes: number; searchRadius: number; snapRadius: number; maxLineCells: number;
  cacheEntries: number; searchesPerFrame: number; regionCacheEntries: number;
}
export const MASS_NAVIGATION: Readonly<MassNavigationConfig> = Object.freeze({
  maxNodes: 2048, searchRadius: 32, snapRadius: 16, maxLineCells: 256,
  cacheEntries: 128, searchesPerFrame: 4, regionCacheEntries: 32768,
});
interface Node { x: number; y: number; cost: number; first: Vec2 }
/** A local simulation view onto durable world addresses. Physics queries truth
 * even before a render page arrives; page residency never means solid/empty. */
export class MassWalk implements RegionGrid {
  readonly cellOcclusion = true;
  /** The common lattice keeps native 30-unit walls and geographic 24-unit
   * cells exact for rays/sweeps; path search keeps its bounded coarse lattice. */
  get cellSize(): number {
    let a = this.stream.generator.spec.terrainCell, b = this.overlay?.grid.cellSize ?? a;
    while (b) { const r = a % b; a = b; b = r; }
    return a;
  }
  overlay?: { grid: RegionGrid; contains(x: number, y: number): boolean };
  private cache = new Map<string, Vec2 | null>();
  private regions = new Map<string, string>();
  private regionRevision = -1;
  private cacheVersion = '';
  /** Native scenery joins navigation without repainting physical region cells. */
  obstacles?: { blocked(x: number, y: number): boolean; revision(): string };
  private navigable(x: number, y: number): boolean { return this.isWalkable(x, y) && !this.obstacles?.blocked(x, y); }
  private searches = 0;
  constructor(readonly stream: MassStream, readonly origin: MassCell,
    readonly config: Readonly<MassNavigationConfig> = MASS_NAVIGATION) {
    this.origin = Object.freeze({ ...origin });
    this.config = Object.freeze({ ...config });
    for (const n of Object.values(config)) if (!Number.isSafeInteger(n) || n < 1) throw new Error('Invalid navigation budget');
  }
  get version(): number { return this.stream.state.terrainRevision + (this.overlay?.grid.version ?? 0); }
  at(x: number, y: number): MassAddress {
    return address(this.origin.dimension, this.origin.cx, this.origin.cy, x, y, this.stream.generator.spec.addressSpan);
  }
  regionAt(x: number, y: number): string {
    if (this.overlay?.contains(x, y)) return this.overlay.grid.regionAt(x, y);
    const revision = this.stream.state.terrainRevision;
    if (revision !== this.regionRevision) { this.regions.clear(); this.regionRevision = revision; }
    // A ray can visit the same physical cell thousands of times per frame.
    // Keep this local read numeric; durable address normalization is only needed
    // on a miss. Sparse edits invalidate before the next query, never next frame.
    const cs = this.stream.generator.spec.terrainCell;
    const gx = Math.floor(x/cs), gy = Math.floor(y/cs), key = gx+','+gy;
    const hit = this.regions.get(key);
    if (hit !== undefined) return hit;
    const region = this.stream.sample(this.at((gx+.5)*cs,(gy+.5)*cs)).region;
    this.regions.set(key,region);
    if (this.regions.size > this.config.regionCacheEntries) this.regions.delete(this.regions.keys().next().value!);
    return region;
  }
  isWalkable(x: number, y: number): boolean { return regionKind(this.regionAt(x, y))?.walkable ?? false; }
  supportedAt(x: number, y: number, r: number): boolean {
    for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) {
      const k = regionKind(this.regionAt(x + dx, y + dy));
      if (k?.walkable || k?.blocks) return true;
    }
    return false;
  }
  snapToWalkable(p: Vec2): Vec2 {
    if (this.navigable(p.x, p.y)) return { ...p };
    const cs = this.cellSize, x = Math.floor(p.x / cs), y = Math.floor(p.y / cs);
    let best: Vec2 | null = null, distance = Infinity;
    for (let r = 1; r <= this.config.snapRadius; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const q = { x: (x + dx + .5) * cs, y: (y + dy + .5) * cs };
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < distance && this.navigable(q.x, q.y)) { best = q; distance = d; }
      }
      // No later ring can contain a closer centre.
      if (best && distance <= (r - .5) * cs) break;
    }
    return best ?? { ...p }; // no invented floor when the bounded query fails
  }
  /** Conservative supercover: every touched cell, including corner side cells. */
  private line(from: Vec2, to: Vec2, profile?: PathProfile): boolean {
    const cs = this.cellSize, dx = to.x - from.x, dy = to.y - from.y;
    let x = Math.floor(from.x / cs), y = Math.floor(from.y / cs);
    const ex = Math.floor(to.x / cs), ey = Math.floor(to.y / cs);
    const sx = Math.sign(dx), sy = Math.sign(dy);
    let tx = sx ? ((x + (sx > 0 ? 1 : 0)) * cs - from.x) / dx : Infinity;
    let ty = sy ? ((y + (sy > 0 ? 1 : 0)) * cs - from.y) / dy : Infinity;
    const ok = (cx: number, cy: number): boolean => {
      const id = this.regionAt((cx + .5) * cs, (cy + .5) * cs);
      return !!regionKind(id)?.walkable && !this.obstacles?.blocked((cx + .5) * cs, (cy + .5) * cs) && (!profile || profile.costOf(id) <= 1);
    };
    for (let i = 0; i < this.config.maxLineCells; i++) {
      if (!ok(x, y)) return false;
      if (x === ex && y === ey) return true;
      if (Math.abs(tx - ty) < 1e-12) {
        if (!ok(x + sx, y) || !ok(x, y + sy)) return false;
        x += sx; y += sy; tx += cs / Math.abs(dx); ty += cs / Math.abs(dy);
      } else if (tx < ty) { x += sx; tx += cs / Math.abs(dx); }
      else { y += sy; ty += cs / Math.abs(dy); }
    }
    return false;
  }
  lineWalkable(from: Vec2, to: Vec2): boolean { return this.line(from, to); }
  linePreferred(from: Vec2, to: Vec2, profile: PathProfile): boolean { return this.line(from, to, profile); }
  beginFrame(): void { this.searches = 0; this.overlay?.grid.beginFrame?.(); }
  reachable(from: Vec2, to: Vec2): boolean {
    return this.line(from, to) || this.search(from, to, undefined) !== null;
  }
  pathStep(from: Vec2, to: Vec2, profile?: PathProfile): Vec2 | null {
    if (this.line(from, to, profile)) return { ...to };
    return this.search(from, to, profile);
  }
  private search(from: Vec2, to: Vec2, profile: PathProfile | undefined): Vec2 | null {
    const version = this.version + ':' + (this.obstacles?.revision() ?? '');
    if (this.cacheVersion !== version) { this.cache.clear(); this.cacheVersion = version; }
    if (this.overlay?.contains(from.x, from.y) && this.overlay.contains(to.x, to.y))
      return this.overlay.grid.pathStep?.(from, to, profile) ?? null;
    const cs = this.stream.generator.spec.terrainCell, fx = Math.floor(from.x / cs), fy = Math.floor(from.y / cs);
    const tx = Math.floor(to.x / cs), ty = Math.floor(to.y / cs);
    if (Math.max(Math.abs(tx - fx), Math.abs(ty - fy)) > this.config.searchRadius) return null;
    const key = JSON.stringify([fx, fy, tx, ty, profile?.key ?? '']);
    if (this.cache.has(key)) { const hit = this.cache.get(key)!; return hit ? { ...hit } : null; }
    if (this.searches >= this.config.searchesPerFrame) return null;
    this.searches++;
    if (!this.isWalkable(from.x, from.y) || !this.isWalkable(to.x, to.y)) return null;
    const heap: Node[] = [];
    const push = (n: Node): void => {
      let i = heap.length; heap.push(n);
      while (i) { const p = (i - 1) >> 1; if (heap[p].cost <= n.cost) break; heap[i] = heap[p]; i = p; }
      heap[i] = n;
    };
    const pop = (): Node => {
      const result = heap[0], tail = heap.pop()!;
      if (heap.length) {
        let i = 0;
        while (i * 2 + 1 < heap.length) {
          let c = i * 2 + 1;
          if (c + 1 < heap.length && heap[c + 1].cost < heap[c].cost) c++;
          if (tail.cost <= heap[c].cost) break;
          heap[i] = heap[c]; i = c;
        }
        heap[i] = tail;
      }
      return result;
    };
    const costs = new Map<string, number>([[fx + ',' + fy, 0]]);
    push({ x: fx, y: fy, cost: 0, first: { ...from } });
    let result: Vec2 | null = null;
    for (let visited = 0; heap.length && visited < this.config.maxNodes; visited++) {
      const n = pop();
      if (n.cost !== costs.get(n.x + ',' + n.y)) continue;
      if (n.x === tx && n.y === ty) { result = n.first; break; }
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const x = n.x + dx, y = n.y + dy;
        if (Math.max(Math.abs(x - fx), Math.abs(y - fy)) > this.config.searchRadius) continue;
        const q = { x: (x + .5) * cs, y: (y + .5) * cs }, id = this.regionAt(q.x, q.y);
        if (!regionKind(id)?.walkable || this.obstacles?.blocked(q.x, q.y)) continue;
        const price = profile?.costOf(id) ?? 1;
        if (!Number.isFinite(price) || price <= 0) continue;
        const cost = n.cost + price, k = x + ',' + y;
        if (cost >= (costs.get(k) ?? Infinity)) continue;
        costs.set(k, cost); push({ x, y, cost, first: n.cost === 0 ? q : n.first });
      }
    }
    this.cache.set(key, result);
    if (this.cache.size > this.config.cacheEntries) this.cache.delete(this.cache.keys().next().value!);
    return result ? { ...result } : null;
  }
}
