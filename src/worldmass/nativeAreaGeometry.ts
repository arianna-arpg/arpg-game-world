import type { Vec2 } from '../core/math';
import type { GeneratedLayout } from '../engine/levelgen';
import type { HitShape } from '../engine/shapes';
import { shapeAabbHalf } from '../engine/shapes';
import { insideBounds, type Bounds } from '../world/shape';
import type { PackedWalk } from '../world/gridWalk';

export type NativeAreaLayoutData = Omit<GeneratedLayout, 'walk'>;
export interface NativeAreaMaterial {
  id: string; walkable: boolean; laid?: 'ground' | 'built'; severity?: number;
  overruns?: boolean; deep: boolean;
}
export interface NativeAreaBody {
  index: number; move: HitShape; shot: HitShape; sight: HitShape;
  blocksMove: boolean; blocksShot: boolean; blocksSight: boolean; bridge: boolean;
}
/** A complete generated footprint, plus resolved physical facts. This is not
 * admission of its actors, effects, environment, objectives or tier lifecycle. */
export interface NativeAreaGeometrySource {
  schema: 1; algorithm: 'native-area-geometry-v1'; sourceIdentity: string;
  bounds: Bounds; layout: NativeAreaLayoutData;
  walk: { kind: 'analytic' } | { kind: 'grid'; packed: PackedWalk };
  bodies: NativeAreaBody[]; materials: NativeAreaMaterial[]; deepInset: number;
}
export interface NativeAreaExterior {
  /** Prove the portion outside this owner's bounds against the complete other
   * owners. The callback receives the whole capsule, never just its endpoints. */
  sweepClear(from: Vec2, to: Vec2, radius: number, tier: number,
    owns: (x: number, y: number) => boolean): boolean;
}
export interface NativeAreaAabb { minX: number; minY: number; maxX: number; maxY: number }
export const NATIVE_AREA_GEOMETRY_LIMITS = Object.freeze({
  coordinate: 1e7, cells: 1_048_576, doodads: 100_000, indexEntries: 2_097_152,
  queryBuckets: 262_144, bucket: 128,
});

// This geometry-specific wire preserves native optional own fields and signed
// zero. Tuple tags cannot collide with author record keys. No live registry is
// read during decode, publication, sampling or replay.
type Wire = ['undefined'] | ['null'] | ['boolean', boolean] | ['string', string]
  | ['number', number | '-0'] | ['array', Wire[]] | ['record', [string, Wire][]];
function encode(value: unknown, path = '$', seen = new Set<object>()): Wire {
  if (value === undefined) return ['undefined'];
  if (value === null) return ['null'];
  if (typeof value === 'boolean') return ['boolean', value];
  if (typeof value === 'string') return ['string', value];
  if (typeof value === 'number' && Number.isFinite(value)) return ['number', Object.is(value, -0) ? '-0' : value];
  if (typeof value !== 'object' || seen.has(value)) throw Error('Invalid native area data at ' + path);
  if (Object.getPrototypeOf(value) !== (Array.isArray(value) ? Array.prototype : Object.prototype))
    throw Error('Non-plain native area data at ' + path);
  seen.add(value);
  const keys = Reflect.ownKeys(value);
  const read = (key: string): Wire => {
    const d = Object.getOwnPropertyDescriptor(value, key)!;
    if (!d.enumerable || !('value' in d)) throw Error('Non-data native area field at ' + path + '.' + key);
    return encode(d.value, path + '.' + key, seen);
  };
  let result: Wire;
  if (Array.isArray(value)) {
    if (keys.length !== value.length + 1 || keys.some(k => typeof k !== 'string'))
      throw Error('Sparse or extended native area array at ' + path);
    result = ['array', Array.from({ length: value.length }, (_, i) => {
      if (!Object.hasOwn(value, i)) throw Error('Sparse native area array at ' + path);
      return read(String(i));
    })];
  } else {
    if (keys.some(k => typeof k !== 'string')) throw Error('Symbol in native area source');
    result = ['record', (keys as string[]).map(k => [k, read(k)])];
  }
  seen.delete(value);
  return result;
}
function decode(w: Wire): unknown {
  switch (w[0]) {
    case 'undefined': return undefined;
    case 'null': return null;
    case 'boolean': case 'string': return w[1];
    case 'number': return w[1] === '-0' ? -0 : w[1];
    case 'array': return Object.freeze(w[1].map(decode));
    case 'record': return Object.freeze(Object.fromEntries(w[1].map(([k, v]) => [k, decode(v)])));
    default: throw Error('Unknown native area wire tag');
  }
}
export function copyNativeAreaData<T>(value: T): T { return decode(encode(value)) as T; }
export function serializeNativeAreaData(value: unknown): string { return JSON.stringify(encode(value)); }
export function restoreNativeAreaData<T>(bytes: string): T {
  let value: unknown;
  try { value = decode(JSON.parse(bytes) as Wire); }
  catch { throw Error('Invalid native area data wire'); }
  if (serializeNativeAreaData(value) !== bytes) throw Error('Non-canonical native area data wire');
  return value as T;
}
/** Execution records do not inherit mutable optional defaults from Object.prototype.
 * Public source records retain their exact native own data and wire identity. */
function ownData<T>(value: T): T {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return Object.freeze(value.map(ownData)) as T;
  const out = Object.create(null) as Record<string, unknown>;
  for (const key of Object.keys(value)) out[key] = ownData((value as Record<string, unknown>)[key]);
  return Object.freeze(out) as T;
}
export function serializeNativeAreaGeometry(source: NativeAreaGeometrySource): string { return serializeNativeAreaData(source); }
export function restoreNativeAreaGeometry(bytes: string): NativeAreaGeometrySource {
  const source = restoreNativeAreaData<NativeAreaGeometrySource>(bytes);
  validateSource(ownData(source));
  return source;
}
const limit = NATIVE_AREA_GEOMETRY_LIMITS;
function finite(n: number): boolean { return Number.isFinite(n) && Math.abs(n) <= limit.coordinate; }
function point(p: Vec2): void { if (!p || !finite(p.x) || !finite(p.y)) throw Error('Native area point exceeds supported coordinates'); }
function radius(r: number): void { if (!finite(r) || r < 0) throw Error('Invalid native area body radius'); }
function validateShape(s: HitShape): void {
  if (!s) throw Error('Missing native area hit surface');
  if (s.kind === 'circle') { radius(s.r); return; }
  if (s.kind === 'rect') { radius(s.hw); radius(s.hh); if (s.rot !== undefined && !Number.isFinite(s.rot)) throw Error('Invalid surface rotation'); return; }
  if (s.kind !== 'multi' || !Array.isArray(s.parts) || !s.parts.length || s.parts.length > 256) throw Error('Invalid native multi surface');
  for (const p of s.parts) { point({ x: p.dx, y: p.dy }); radius(p.r); }
}
function validateSource(s: NativeAreaGeometrySource): void {
  if (!s || s.schema !== 1 || s.algorithm !== 'native-area-geometry-v1' || typeof s.sourceIdentity !== 'string' || !s.sourceIdentity)
    throw Error('Invalid native area geometry source');
  const b = s.bounds;
  if (!b || b.boundless || !['rect', 'ellipse'].includes(b.shape) || !finite(b.w) || !finite(b.h) || b.w <= 0 || b.h <= 0)
    throw Error('Native area requires finite original bounds');
  for (const p of b.pieces ?? []) {
    point(p); if (!finite(p.w) || !finite(p.h) || !finite(p.x + p.w) || !finite(p.y + p.h) || p.active !== undefined && typeof p.active !== 'boolean' || p.w <= 0 || p.h <= 0 || p.shape !== undefined && !['rect', 'ellipse'].includes(p.shape))
      throw Error('Invalid native area annex bounds');
  }
  if (!s.layout || !Array.isArray(s.layout.doodads) || s.layout.doodads.length > limit.doodads
    || !Array.isArray(s.bodies) || s.bodies.length !== s.layout.doodads.length) throw Error('Incomplete native area body capture');
  const ids = new Set<string>();
  for (const m of s.materials) {
    if (typeof m.id !== 'string' || !m.id || ids.has(m.id) || typeof m.walkable !== 'boolean' || typeof m.deep !== 'boolean'
      || m.laid !== undefined && m.laid !== 'ground' && m.laid !== 'built'
      || m.overruns !== undefined && typeof m.overruns !== 'boolean'
      || m.severity !== undefined && !Number.isFinite(m.severity)) throw Error('Invalid native area material');
    ids.add(m.id);
  }
  if (!ids.has('ground') || !ids.has('wall') || !finite(s.deepInset) || s.deepInset < 0) throw Error('Missing native area material facts');
  s.bodies.forEach((body, i) => {
    if (body.index !== i || ['blocksMove', 'blocksShot', 'blocksSight', 'bridge'].some(k => typeof body[k as keyof NativeAreaBody] !== 'boolean'))
      throw Error('Native area body order changed');
    validateShape(body.move); validateShape(body.shot); validateShape(body.sight);
    const d = s.layout.doodads[i]; point(d.pos); radius(d.radius);
    if (typeof d.kind !== 'string' || !d.kind || ['shallow', 'wild'].some(k => { const v = (d as unknown as Record<string, unknown>)[k]; return v !== undefined && typeof v !== 'boolean'; })) throw Error('Invalid native area ground facts');
    if (!Number.isSafeInteger(d.tier ?? 0) || (d.tier ?? 0) < 0) throw Error('Invalid native area body tier');
  });
  if (s.walk.kind === 'grid') {
    const p = s.walk.packed;
    if (!Number.isSafeInteger(p.cols) || !Number.isSafeInteger(p.rows) || p.cols < 1 || p.rows < 1
      || p.cols * p.rows > limit.cells || !finite(p.cell) || p.cell <= 0
      || !finite(p.cols * p.cell) || !finite(p.rows * p.cell) || !Array.isArray(p.kinds)
      || p.kinds.length < 1 || p.kinds.length > 256 || p.kinds.some(k => !ids.has(k))) throw Error('Invalid captured native area grid');
    let bits: string; try { bits = atob(p.kbits); } catch { throw Error('Invalid native area grid bytes'); }
    if ([{ x: 0, y: 0, w: b.w, h: b.h }, ...(b.pieces ?? []).filter(q => q.active)].some(q => q.x < 0 || q.y < 0 || q.x + q.w > p.cols * p.cell || q.y + q.h > p.rows * p.cell)) throw Error('Original native grid does not cover its owned bounds');
    if (bits.length !== p.cols * p.rows || btoa(bits) !== p.kbits || [...bits].some(c => c.charCodeAt(0) >= p.kinds.length))
      throw Error('Incomplete native area grid bytes');
  } else if (s.walk.kind !== 'analytic') throw Error('Unsupported native walk field');
}

type Interval = [number, number];
function merged(xs: Interval[]): Interval[] {
  xs.sort((a, b) => a[0] - b[0]); const out: Interval[] = [];
  for (const x of xs) { const last = out[out.length - 1]; if (last && x[0] <= last[1]) last[1] = Math.max(last[1], x[1]); else out.push([...x]); }
  return out;
}
function covered(x: Interval, by: readonly Interval[]): boolean {
  let end = x[0];
  for (const c of by) { if (c[1] < end) continue; if (c[0] > end) return false; end = Math.max(end, c[1]); if (end >= x[1]) return true; }
  return false;
}
function circleInterval(a: Vec2, b: Vec2, x: number, y: number, r: number, direction: 1 | -1 = 1): Interval[] {
  const dx = b.x - a.x, dy = b.y - a.y, ox = a.x - x, oy = a.y - y;
  // Project first: the expanded quadratic discriminant loses a tiny real
  // intersection by subtracting two enormous terms on long shallow sweeps.
  // Round collision intervals outward and ownership/bridge coverage inward.
  // This refuses uncertain contacts; it can never manufacture clearance.
  const error = Number.EPSILON * 32 * Math.max(1, Math.abs(a.x), Math.abs(a.y), Math.abs(b.x), Math.abs(b.y), Math.abs(x), Math.abs(y), r);
  const rr = r + direction * error;
  if (rr < 0) return [];
  const aa = dx * dx + dy * dy;
  if (aa === 0) return Math.hypot(ox, oy) <= rr ? [[0, 1]] : [];
  const t = -(ox * dx + oy * dy) / aa;
  const distance = Math.hypot(ox + dx * t, oy + dy * t);
  if (distance > rr) return [];
  const half = Math.sqrt(Math.max(0, (rr - distance) * (rr + distance) / aa));
  const round = Number.EPSILON * 32 * Math.max(1, Math.abs(t), half);
  const lo = Math.max(0, t - half - direction * round), hi = Math.min(1, t + half + direction * round);
  return lo <= hi ? [[lo, hi]] : [];
}function rectInterval(a: Vec2, b: Vec2, x0: number, y0: number, x1: number, y1: number): Interval[] {
  if (x1 < x0 || y1 < y0) return [];
  let lo = 0, hi = 1;
  for (const [start, end, min, max] of [[a.x, b.x, x0, x1], [a.y, b.y, y0, y1]]) {
    const d = end - start;
    if (d === 0) { if (start < min || start > max) return []; continue; }
    const t0 = (min - start) / d, t1 = (max - start) / d;
    lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1));
    if (hi < lo) return [];
  }
  return [[lo, hi]];
}
/** Exact circle/union/rounded-rectangle capsule intersections, including end
 * discs and corner contacts. Tangency refuses in this conservative route proof. */
export function nativeAreaShapeIntervals(s: HitShape, pos: Vec2, a: Vec2, b: Vec2, r: number): Interval[] {
  if (s.kind === 'circle') return circleInterval(a, b, pos.x, pos.y, s.r + r);
  if (s.kind === 'multi') return merged(s.parts.flatMap(q => circleInterval(a, b, pos.x + q.dx, pos.y + q.dy, q.r + r)));
  const c = Math.cos(s.rot ?? 0), n = Math.sin(s.rot ?? 0);
  const local = (p: Vec2): Vec2 => ({ x: (p.x - pos.x) * c + (p.y - pos.y) * n, y: -(p.x - pos.x) * n + (p.y - pos.y) * c });
  const aa = local(a), bb = local(b);
  return merged([
    ...rectInterval(aa, bb, -s.hw - r, -s.hh, s.hw + r, s.hh),
    ...rectInterval(aa, bb, -s.hw, -s.hh - r, s.hw, s.hh + r),
    ...[-s.hw, s.hw].flatMap(x => [-s.hh, s.hh].flatMap(y => circleInterval(aa, bb, x, y, r))),
  ]);
}

/** Immutable local geometry. It does not change native runtime motion/slide,
 * fall or tier rules. sweepClear proves an ordinary same-tier walking capsule;
 * it may refuse a feasible near-boundary route rather than fabricate clearance. */
export class NativeAreaGeometry {
  readonly source: NativeAreaGeometrySource;
  readonly identity: string;
  readonly footprint: Readonly<NativeAreaAabb>;
  private readonly data: NativeAreaGeometrySource;
  private readonly materials: Map<string, NativeAreaMaterial>;
  private readonly bits: Uint8Array | null;
  private readonly buckets = new Map<string, number[]>();
  constructor(source: NativeAreaGeometrySource) {
    this.identity = serializeNativeAreaGeometry(source);
    this.source = restoreNativeAreaGeometry(this.identity);
    this.data = ownData(this.source);
    this.materials = new Map(this.data.materials.map(m => [m.id, m]));
    this.bits = this.data.walk.kind === 'grid' ? Uint8Array.from(atob(this.data.walk.packed.kbits), c => c.charCodeAt(0)) : null;
    const bounds = this.data.bounds;
    const footprint = { minX: 0, minY: 0, maxX: bounds.w, maxY: bounds.h };
    for (const p of bounds.pieces ?? []) { footprint.minX = Math.min(footprint.minX, p.x); footprint.minY = Math.min(footprint.minY, p.y); footprint.maxX = Math.max(footprint.maxX, p.x + p.w); footprint.maxY = Math.max(footprint.maxY, p.y + p.h); }
    let entries = 0;
    for (const body of this.data.bodies) {
      const d = this.data.layout.doodads[body.index], shapes = [body.move, body.shot, body.sight].map(shapeAabbHalf);
      const ex = Math.max(d.radius, ...shapes.map(h => h.ex)), ey = Math.max(d.radius, ...shapes.map(h => h.ey));
      footprint.minX = Math.min(footprint.minX, d.pos.x - ex); footprint.maxX = Math.max(footprint.maxX, d.pos.x + ex);
      footprint.minY = Math.min(footprint.minY, d.pos.y - ey); footprint.maxY = Math.max(footprint.maxY, d.pos.y + ey);
      const box = this.bucketBounds({ minX: d.pos.x - ex, maxX: d.pos.x + ex, minY: d.pos.y - ey, maxY: d.pos.y + ey });
      entries += (box.maxX - box.minX + 1) * (box.maxY - box.minY + 1);
      if (entries > limit.indexEntries) throw Error('Native area spatial index exceeds supported work');
      for (let y = box.minY; y <= box.maxY; y++) for (let x = box.minX; x <= box.maxX; x++) {
        const key = x + ',' + y, bucket = this.buckets.get(key);
        if (bucket) bucket.push(body.index); else this.buckets.set(key, [body.index]);
      }
    }
    this.footprint = Object.freeze(footprint);
  }
  /** Physical rectangle ownership is half-open (left/top own, right/bottom
   * defer to exterior). Original bounds remain intact for native center clamps.
   * This prevents the packed grid's off-grid wall sentinel becoming a zero-width
   * wall between adjacent owners. Ellipse silhouettes are never rectangularized. */
  contains(p: Vec2, r = 0): boolean {
    point(p); radius(r);
    const bounds = this.data.bounds;
    const pieces = [{ x: 0, y: 0, w: bounds.w, h: bounds.h, shape: bounds.shape }, ...(bounds.pieces ?? []).filter(q => q.active)];
    const owns = pieces.some(q => q.shape === 'ellipse'
      ? insideBounds({ x: p.x - q.x, y: p.y - q.y }, 0, { w: q.w, h: q.h, shape: 'ellipse' })
      : p.x >= q.x && p.y >= q.y && p.x < q.x + q.w && p.y < q.y + q.h);
    if (!owns) return false;
    const w = this.data.walk;
    if (w.kind === 'grid' && (p.x < 0 || p.y < 0 || p.x >= w.packed.cols * w.packed.cell || p.y >= w.packed.rows * w.packed.cell)) return false;
    return r === 0 || insideBounds(p, r, bounds);
  }
  regionAt(x: number, y: number): string | undefined {
    if (!this.contains({ x, y })) return undefined;
    const w = this.data.walk;
    if (w.kind === 'analytic') return 'ground';
    const gx = Math.floor(x / w.packed.cell), gy = Math.floor(y / w.packed.cell);
    if (gx < 0 || gy < 0 || gx >= w.packed.cols || gy >= w.packed.rows) return 'wall';
    return w.packed.kinds[this.bits![gy * w.packed.cols + gx]];
  }
  private bucketBounds(b: NativeAreaAabb): NativeAreaAabb {
    if (![b.minX, b.maxX, b.minY, b.maxY].every(finite) || b.minX > b.maxX || b.minY > b.maxY) throw Error('Invalid native area query bounds');
    return { minX: Math.floor(b.minX / limit.bucket), maxX: Math.floor(b.maxX / limit.bucket), minY: Math.floor(b.minY / limit.bucket), maxY: Math.floor(b.maxY / limit.bucket) };
  }
  /** Broad-phase superset, always in original native doodad order. */
  candidates(b: NativeAreaAabb): readonly NativeAreaBody[] {
    const box = this.bucketBounds(b);
    if ((box.maxX - box.minX + 1) * (box.maxY - box.minY + 1) > limit.queryBuckets) throw Error('Native area query exceeds supported work');
    const ids = new Set<number>();
    for (let y = box.minY; y <= box.maxY; y++) for (let x = box.minX; x <= box.maxX; x++)
      for (const id of this.buckets.get(x + ',' + y) ?? []) ids.add(id);
    return [...ids].sort((a, b) => a - b).map(i => this.data.bodies[i]);
  }
  groundAt(p: Vec2, tier = 0): { kind: string; deep: boolean } | null {
    point(p);
    if (!Number.isSafeInteger(tier) || tier < 0) throw Error('Invalid native area ground tier');
    const rows = this.candidates({ minX: p.x, maxX: p.x, minY: p.y, maxY: p.y });
    const distance = (i: number) => Math.hypot(p.x - this.data.layout.doodads[i].pos.x, p.y - this.data.layout.doodads[i].pos.y);
    if (rows.some(b => b.bridge && distance(b.index) <= this.data.layout.doodads[b.index].radius)) return null;
    let inWater = false, ford = false, pen = 0;
    let built: string | null = null, nat: NativeAreaMaterial | null = null, natSev = -Infinity;
    let deepKind: string | null = null, deepFord = false, deepPen = 0;
    for (const b of rows) {
      const d = this.data.layout.doodads[b.index];
      if ((d.tier ?? 0) !== tier) continue;
      const dd = distance(b.index); if (dd > d.radius) continue;
      if (d.kind === 'water') { inWater = true; if (d.shallow) ford = true; else pen = Math.max(pen, d.radius - dd); continue; }
      const rk = this.materials.get(d.kind); if (!rk) continue;
      if ((rk.laid ?? 'ground') === 'built' && !d.wild) { if (!built) built = d.kind; }
      else {
        const sev = (rk.laid ?? 'ground') === 'built' ? 0 : rk.severity ?? 0;
        if (sev > natSev) {
          natSev = sev; nat = rk;
          if (rk.deep) { deepKind = d.kind; deepFord = !!d.shallow; deepPen = d.shallow ? 0 : d.radius - dd; }
          else deepKind = null;
        } else if (deepKind !== null && d.kind === deepKind) {
          if (d.shallow) deepFord = true; else deepPen = Math.max(deepPen, d.radius - dd);
        }
      }
    }
    const winner = nat && (!built || nat.overruns) ? { kind: nat.id, sev: natSev } : built ? { kind: built, sev: 0 } : null;
    if (inWater && !(winner && winner.sev > (this.materials.get('water')?.severity ?? 0))) return { kind: 'water', deep: !ford && pen > this.data.deepInset };
    return winner ? { kind: winner.kind, deep: winner.kind === deepKind && !deepFord && deepPen > this.data.deepInset } : null;
  }
  private boundsIntervals(a: Vec2, b: Vec2, r: number): Interval[] {
    const bounds = this.data.bounds;
    const pieces = [{ x: 0, y: 0, w: bounds.w, h: bounds.h, shape: bounds.shape }, ...(bounds.pieces ?? []).filter(p => p.active)];
    return merged(pieces.flatMap(p => {
      if (p.shape !== 'ellipse') {
        // Boundary contact needs an exterior proof too: right/bottom ownership
        // is half-open. Inward rounding also avoids claiming uncertain margin.
        const guard = Number.EPSILON * 32 * Math.max(1, Math.abs(p.x), Math.abs(p.y), p.w, p.h, r);
        return rectInterval(a, b, p.x + r + guard, p.y + r + guard, p.x + p.w - r - guard, p.y + p.h - r - guard);
      }
      // Homothetic inner ellipse is a conservative full-disc clearance proof.
      // Merely subtracting r from both radii (native clamp's center law) can
      // still let the body cross a curved rim between principal axes.
      const shrink = 1 - r / Math.min(p.w / 2, p.h / 2);
      if (shrink <= 0) return [];
      const rx = p.w / 2 * shrink, ry = p.h / 2 * shrink, cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      return circleInterval({ x: (a.x - cx) / rx, y: (a.y - cy) / ry }, { x: (b.x - cx) / rx, y: (b.y - cy) / ry }, 0, 0, 1, -1);
    }));
  }
  discClear(p: Vec2, r: number, tier = 0, exterior?: NativeAreaExterior): boolean { return this.sweepClear(p, p, r, tier, exterior); }
  sweepClear(a: Vec2, b: Vec2, r: number, tier = 0, exterior?: NativeAreaExterior): boolean {
    point(a); point(b); radius(r);
    a = Object.freeze({ x: a.x, y: a.y }); b = Object.freeze({ x: b.x, y: b.y });
    if (tier !== 0) throw Error('Native area route proof requires a captured tier-zero field');
    if ((!this.contains(a) || !this.contains(b) || !covered([0, 1], this.boundsIntervals(a, b, r))) && (!exterior || exterior.sweepClear(a, b, r, tier, (x, y) => this.contains({ x, y })) !== true)) return false;
    const box = { minX: Math.min(a.x, b.x) - r, maxX: Math.max(a.x, b.x) + r, minY: Math.min(a.y, b.y) - r, maxY: Math.max(a.y, b.y) + r };
    const candidates = this.candidates(box);
    const bridges = merged(candidates.filter(s => s.bridge).flatMap(s => {
      const d = this.data.layout.doodads[s.index]; return circleInterval(a, b, d.pos.x, d.pos.y, d.radius, -1);
    }));
    for (const s of candidates) {
      const d = this.data.layout.doodads[s.index];
      if (!s.blocksMove || (d.tier ?? 0) !== tier) continue;
      const hits = nativeAreaShapeIntervals(s.move, d.pos, a, b, r);
      if (hits.some(hit => d.kind !== 'chasm' || !covered(hit, bridges))) return false;
    }
    const w = this.data.walk;
    if (w.kind === 'grid') {
      const g = w.packed, cs = g.cell;
      const x0 = Math.max(0, Math.floor(box.minX / cs)), x1 = Math.min(g.cols - 1, Math.floor(box.maxX / cs));
      const y0 = Math.max(0, Math.floor(box.minY / cs)), y1 = Math.min(g.rows - 1, Math.floor(box.maxY / cs));
      // The original grid is not padded or re-rasterized. Border cells may
      // conservatively refuse where an ellipse clips their rectangle.
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (this.materials.get(g.kinds[this.bits![y * g.cols + x]])!.walkable) continue;
        if (nativeAreaShapeIntervals({ kind: 'rect', hw: cs / 2, hh: cs / 2 }, { x: (x + .5) * cs, y: (y + .5) * cs }, a, b, r).length) return false;
      }
    }
    return true;
  }
}
export function createNativeAreaGeometry(source: NativeAreaGeometrySource): NativeAreaGeometry { return new NativeAreaGeometry(source); }
