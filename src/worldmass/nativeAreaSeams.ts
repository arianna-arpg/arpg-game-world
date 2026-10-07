import type { Vec2 } from '../core/math';
import { copyNativeGeographyData } from '../world/geographySource';
import { address, localOffset, moveAddress, type MassAddress } from './address';
import { canonical, freezeData } from './random';

/** An immutable physical owner reference. Source names the complete saved area
 * descriptor, not just its biome/face. The physical provider verifies it before
 * issuing a receipt. This planner does not mint or alter an area's contents. */
export interface NativeSeamOwner {
  id: string; source: string; origin: MassAddress;
  bounds: { w: number; h: number; shape: 'rect' | 'ellipse'; boundless?: boolean; pieces?: readonly unknown[] };
}
export interface NativeAreaSeamPolicy {
  version: 1; addressSpan: number;
  /** Required swept body clearance, also the minimum tangent margin. */
  bodyRadius: number;
  /** Distance from the generation mouth to its interior proof endpoint. */
  approach: number;
  maxGap: number; maxLength: number;
  /** Reserved tangent allowance for a bounded route around retained geometry. */
  maxDetour?: number;
}
export type NativeSeamSide = 'n' | 's' | 'e' | 'w';
export interface NativeAreaSeamPort {
  owner: string; neighbor: string; side: NativeSeamSide;
  /** Area-local mouth supplied to generation BEFORE layout/scenery placement. */
  point: Vec2;
  /** Area-local interior endpoint. It must really be reachable, not assumed. */
  approach: Vec2;
}
export interface NativeAreaSeamPlan {
  schema: 1; algorithm: 'native-area-seams-v1'; id: string;
  policy: Readonly<NativeAreaSeamPolicy>;
  owners: readonly [Readonly<NativeSeamOwner>, Readonly<NativeSeamOwner>];
  ports: readonly [Readonly<NativeAreaSeamPort>, Readonly<NativeAreaSeamPort>];
  /** Ordered from owners[0] to owners[1], with coincident mouths deduplicated. */
  path: readonly MassAddress[];
  length: number;
}
export type NativeAreaSeamRefusal = 'different-dimensions' | 'unsupported-boundary'
  | 'overlapping-owners' | 'no-facing-boundaries' | 'insufficient-throat'
  | 'gap-exceeds-budget' | 'length-exceeds-budget' | 'outside-local-envelope';
export type NativeAreaSeamResult = { ok: true; plan: Readonly<NativeAreaSeamPlan> }
  | { ok: false; reason: NativeAreaSeamRefusal };
// Detach own data descriptors before any semantic read or canonicalization.
// Accessors must never supply different bytes to validation and publication.
const copy = <T>(value: T): T => JSON.parse(canonical(copyNativeGeographyData(value))) as T;
const same = (a: unknown, b: unknown): boolean => canonical(a) === canonical(b);
const detourOf = (p: NativeAreaSeamPolicy): number => Object.hasOwn(p, 'maxDetour') ? p.maxDetour! : 0;
const verifiedReceipts = new WeakSet<object>();
function validPolicy(p: NativeAreaSeamPolicy): void {
  if (p.version !== 1 || !Number.isSafeInteger(p.addressSpan) || p.addressSpan < 1 || p.addressSpan > 65536
    || !Number.isFinite(p.bodyRadius) || p.bodyRadius < 1 || p.bodyRadius > 120
    || !Number.isFinite(p.approach) || p.approach < p.bodyRadius * 2 || p.approach > 1024
    || !Number.isFinite(p.maxGap) || p.maxGap < 0 || p.maxGap > 16384
    || !Number.isFinite(p.maxLength) || p.maxLength < p.approach * 2 || p.maxLength > 32768
    || !Number.isFinite(detourOf(p)) || detourOf(p) < 0 || detourOf(p) > 1024)
    throw Error('Invalid native area seam policy');
}
function validOwner(o: NativeSeamOwner, span: number): void {
  if (!o.id || !o.source || typeof o.id !== 'string' || typeof o.source !== 'string'
    || !o.bounds || ![o.bounds.w, o.bounds.h].every(n => Number.isFinite(n) && n >= 60 && n <= 16384)
    || !['rect', 'ellipse'].includes(o.bounds.shape)
    || Object.hasOwn(o.bounds, 'boundless') && typeof o.bounds.boundless !== 'boolean'
    || Object.hasOwn(o.bounds, 'pieces') && !Array.isArray(o.bounds.pieces)
    || !same(o.origin, address(o.origin.dimension, o.origin.cx, o.origin.cy, o.origin.x, o.origin.y, span)))
    throw Error('Invalid native area seam owner');
}
/** Bilateral generation INPUT, not a claim of connectivity. Rectangular facing
 * boundaries are the first supported geometry. Ellipses/annexes retain their
 * actual shapes and explicitly refuse this planner instead of becoming boxes.
 * Both discovery orders produce byte-identical inputs. No RNG, grid writes,
 * scenery clearing, fallback face selection or active gate mutation occurs. */
export function planNativeAreaSeam(first: NativeSeamOwner, second: NativeSeamOwner,
  policy: NativeAreaSeamPolicy): NativeAreaSeamResult {
  first = copy(first); second = copy(second); policy = copy(policy);
  validPolicy(policy); validOwner(first, policy.addressSpan); validOwner(second, policy.addressSpan);
  if (first.id === second.id) throw Error('Native area seam needs two distinct owners');
  const [a, b] = first.id < second.id ? [first, second] : [second, first];
  const refuse = (reason: NativeAreaSeamRefusal): NativeAreaSeamResult => ({ ok: false, reason });
  if (a.origin.dimension !== b.origin.dimension) return refuse('different-dimensions');
  if ([a, b].some(o => o.bounds.shape !== 'rect' || Object.hasOwn(o.bounds, 'boundless') && o.bounds.boundless || Object.hasOwn(o.bounds, 'pieces') && o.bounds.pieces?.length))
    return refuse('unsupported-boundary');
  let delta: Vec2;
  try { delta = localOffset(b.origin, a.origin, policy.addressSpan, Math.ceil(65536 / policy.addressSpan)); }
  catch { return refuse('outside-local-envelope'); }
  const { x: bx, y: by } = delta, aw = a.bounds.w, ah = a.bounds.h, bw = b.bounds.w, bh = b.bounds.h;
  if (bx < aw && bx + bw > 0 && by < ah && by + bh > 0) return refuse('overlapping-owners');
  let as: NativeSeamSide, bs: NativeSeamSide, lo: number, hi: number, gap: number;
  let pa: Vec2, pb: Vec2, ia: Vec2, ib: Vec2;
  const r = policy.bodyRadius, inset = policy.approach;
  if (bx >= aw || bx + bw <= 0) {
    lo = Math.max(0, by); hi = Math.min(ah, by + bh);
    if (hi <= lo) return refuse('no-facing-boundaries');
    if (hi - lo < 2 * (r + detourOf(policy)) || aw < inset + r || bw < inset + r) return refuse('insufficient-throat');
    const t = lo + (hi - lo) / 2, east = bx >= aw;
    as = east ? 'e' : 'w'; bs = east ? 'w' : 'e';
    gap = east ? bx - aw : -(bx + bw);
    pa = { x: east ? aw : 0, y: t }; pb = { x: east ? 0 : bw, y: t - by };
    ia = { x: pa.x + (east ? -inset : inset), y: pa.y };
    ib = { x: pb.x + (east ? inset : -inset), y: pb.y };
  } else if (by >= ah || by + bh <= 0) {
    lo = Math.max(0, bx); hi = Math.min(aw, bx + bw);
    if (hi <= lo) return refuse('no-facing-boundaries');
    if (hi - lo < 2 * (r + detourOf(policy)) || ah < inset + r || bh < inset + r) return refuse('insufficient-throat');
    const t = lo + (hi - lo) / 2, south = by >= ah;
    as = south ? 's' : 'n'; bs = south ? 'n' : 's';
    gap = south ? by - ah : -(by + bh);
    pa = { x: t, y: south ? ah : 0 }; pb = { x: t - bx, y: south ? 0 : bh };
    ia = { x: pa.x, y: pa.y + (south ? -inset : inset) };
    ib = { x: pb.x, y: pb.y + (south ? inset : -inset) };
  } else return refuse('no-facing-boundaries');
  if (gap > policy.maxGap) return refuse('gap-exceeds-budget');
  const length = gap + 2 * inset;
  if (length > policy.maxLength) return refuse('length-exceeds-budget');
  const points = [moveAddress(a.origin, ia, policy.addressSpan), moveAddress(a.origin, pa, policy.addressSpan),
    moveAddress(b.origin, pb, policy.addressSpan), moveAddress(b.origin, ib, policy.addressSpan)];
  const path = points.filter((p, i) => !i || !same(p, points[i - 1]));
  return { ok: true, plan: freezeData(copy({ schema: 1, algorithm: 'native-area-seams-v1',
    id: canonical(['native-area-seams-v1', a.id, b.id]), policy, owners: [a, b],
    ports: [{ owner: a.id, neighbor: b.id, side: as, point: pa, approach: ia },
      { owner: b.id, neighbor: a.id, side: bs, point: pb, approach: ib }], path, length } as NativeAreaSeamPlan)) };
}
/** Validate complete saved input, including the physical mouths and exact
 * owner references. Checking only a sampling checksum would be insufficient. */
export function validateNativeAreaSeam(plan: Readonly<NativeAreaSeamPlan>): void {
  plan = copy(plan);
  if (!plan || plan.schema !== 1 || plan.algorithm !== 'native-area-seams-v1'
    || !Array.isArray(plan.owners) || plan.owners.length !== 2) throw Error('Invalid native area seam plan');
  const expected = planNativeAreaSeam(plan.owners[0], plan.owners[1], plan.policy);
  if (!expected.ok || expected.plan.path.length < 2 || !same(expected.plan, plan)) throw Error('Native area seam plan does not match its owners');
}
/** Stable physical anchors for the native generator. The caller still owns its
 * mint's entry rule; these are ALL exits, including a chosen return mouth. */
export function nativeAreaSeamPorts(owner: NativeSeamOwner, plans: readonly Readonly<NativeAreaSeamPlan>[]): readonly Readonly<NativeAreaSeamPort>[] {
  owner = copy(owner); plans = copy(plans);
  if (plans.length > 16) throw Error('Native area seam port budget exceeded');
  const out: { id: string; port: Readonly<NativeAreaSeamPort>; radius: number }[] = [], ids = new Set<string>();
  for (const plan of plans) {
    validateNativeAreaSeam(plan);
    const index = plan.owners.findIndex(o => o.id === owner.id);
    if (index < 0 || !same(plan.owners[index], owner) || ids.has(plan.id)) throw Error('Native area seam owner conflict');
    ids.add(plan.id);
    out.push({ id: plan.id, port: plan.ports[index], radius: plan.policy.bodyRadius });
  }
  // The caller must still reserve every complete owner globally. At this
  // boundary, all supplied neighbors are known and cannot overlap each other.
  const neighbors = plans.map(p => p.owners.find(o => o.id !== owner.id)!);
  for (let i = 0; i < neighbors.length; i++) for (let j = i + 1; j < neighbors.length; j++) {
    const a = neighbors[i], b = neighbors[j];
    const d = localOffset(b.origin, a.origin, plans[0].policy.addressSpan);
    if (d.x < a.bounds.w && d.x + b.bounds.w > 0 && d.y < a.bounds.h && d.y + b.bounds.h > 0)
      throw Error('Native area seam neighbors overlap');
  }
  out.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
    const a = out[i], b = out[j];
    if (Math.hypot(a.port.point.x - b.port.point.x, a.port.point.y - b.port.point.y) < a.radius + b.radius)
      throw Error('Native area seam mouths overlap');
  }
  return freezeData(out.map(r => copy(r.port)));
}
export interface NativeAreaSeamPhysical {
  /** Exact current revision of ALL terrain, scenery and door dependencies. */
  revision: string;
  ownerSource(id: string): string | undefined;
  /** Whole swept disc over both owners AND the substrate between them.
   * Unknown/unprepared geometry must refuse. Point/LOS tests are inadequate. */
  sweep(from: MassAddress, to: MassAddress, radius: number): boolean;
}
export interface NativeAreaSeamReceipt {
  schema: 1; plan: Readonly<NativeAreaSeamPlan>; geometryRevision: string;
  path: readonly MassAddress[]; length: number;
}

/** A route must visit both generated mouths in their original order, stay
 * inside the reserved corridor, and retain the planned interior endpoints. */
function routeLength(plan: Readonly<NativeAreaSeamPlan>, path: readonly MassAddress[]): number {
  if (!Array.isArray(path) || path.length < 2 || path.length > 4096
    || !same(path[0], plan.path[0]) || !same(path.at(-1), plan.path.at(-1))) throw Error('Invalid native area seam route');
  const span = plan.policy.addressSpan, start = plan.path[0], end = localOffset(plan.path.at(-1)!, start, span);
  const horizontal = end.y === 0, reach = Math.abs(horizontal ? end.x : end.y), direction = Math.sign(horizontal ? end.x : end.y);
  let length = 0, next = 0;
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    if (!same(p, address(p.dimension, p.cx, p.cy, p.x, p.y, span))) throw Error('Invalid native area seam route address');
    const q = localOffset(p, start, span), along = (horizontal ? q.x : q.y) * direction, across = horizontal ? q.y : q.x;
    if (along < 0 || along > reach || Math.abs(across) > detourOf(plan.policy)) throw Error('Native area seam route leaves its reservation');
    if (next < plan.path.length && same(p, plan.path[next])) next++;
    if (i) {
      const d = localOffset(p, path[i - 1], span), distance = Math.hypot(d.x, d.y);
      if (!(distance > 0)) throw Error('Degenerate native area seam route');
      length += distance;
    }
  }
  if (next !== plan.path.length || length > plan.policy.maxLength) throw Error('Native area seam route skips a mouth or exceeds its budget');
  return length;
}
function physicalCurrent(plan: Readonly<NativeAreaSeamPlan>, physical: NativeAreaSeamPhysical, revision: string): boolean {
  return physical.revision === revision && plan.owners.every(o => physical.ownerSource(o.id) === o.source)
    && physical.revision === revision;
}
/** Publication proof only: every segment must pass in both directions. The
 * provider must include neighboring collision, bridges, closed doors and all
 * native movement shapes. Failure publishes and clears nothing. */
export function verifyNativeAreaSeam(input: Readonly<NativeAreaSeamPlan>, physical: NativeAreaSeamPhysical,
  route?: readonly MassAddress[]):
  { ok: true; receipt: Readonly<NativeAreaSeamReceipt> } | { ok: false; reason: string } {
  const plan = freezeData(copy(input));
  validateNativeAreaSeam(plan);
  const path = freezeData(copy(route ?? plan.path)), length = routeLength(plan, path);
  const revision = physical.revision;
  if (typeof revision !== 'string' || !revision) throw Error('Native area seam requires a physical revision');
  if (!physicalCurrent(plan, physical, revision)) return { ok: false, reason: 'owner-source-mismatch' };
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], r = plan.policy.bodyRadius;
    if (physical.sweep(a, b, r) !== true || physical.sweep(b, a, r) !== true) return { ok: false, reason: 'blocked-connection' };
  }
  if (!physicalCurrent(plan, physical, revision)) return { ok: false, reason: 'geometry-changed-during-proof' };
  const receipt = freezeData({ schema: 1, plan, geometryRevision: revision, path, length } as NativeAreaSeamReceipt);
  verifiedReceipts.add(receipt); return { ok: true, receipt };
}
/** Freshness for a receipt verified in this process. Serialized/caller-made
 * records must pass restoreNativeAreaSeamReceipt and actual collision again. */
export function nativeAreaSeamCurrent(receipt: Readonly<NativeAreaSeamReceipt>, physical: NativeAreaSeamPhysical, radius: number): boolean {
  if (!verifiedReceipts.has(receipt) || receipt.schema !== 1 || !receipt.geometryRevision || !Number.isFinite(radius) || radius <= 0) return false;
  // Only this module can issue these deeply frozen receipts. Their bytes were
  // already validated; freshness checks need only current physical authority.
  return radius <= receipt.plan.policy.bodyRadius && physicalCurrent(receipt.plan, physical, receipt.geometryRevision);
}
/** Durable data is not evidence that a collision test ran. Recheck the complete
 * restored route and source revision before issuing a live trusted receipt. */
export function restoreNativeAreaSeamReceipt(input: Readonly<NativeAreaSeamReceipt>, physical: NativeAreaSeamPhysical):
  { ok: true; receipt: Readonly<NativeAreaSeamReceipt> } | { ok: false; reason: string } {
  const raw = freezeData(copy(input));
  if (raw.schema !== 1 || typeof raw.geometryRevision !== 'string' || !raw.geometryRevision
    || raw.geometryRevision !== physical.revision) return { ok: false, reason: 'restored-revision-mismatch' };
  const proof = verifyNativeAreaSeam(raw.plan, physical, raw.path);
  if (!proof.ok) return proof;
  if (!same(raw, proof.receipt)) return { ok: false, reason: 'restored-receipt-mismatch' };
  return proof;
}
export const NATIVE_AREA_SEAM_ROUTE = Object.freeze({ cell: 30, maxNodes: 16384 });
/** Deterministic bounded search through the reserved corridor. Each native
 * mouth remains a mandatory stop. It never moves an entrance, clears geometry,
 * retries a different face or turns a missing physical provider into ground. */
export function routeNativeAreaSeam(input: Readonly<NativeAreaSeamPlan>, physical: NativeAreaSeamPhysical):
  { ok: true; receipt: Readonly<NativeAreaSeamReceipt> } | { ok: false; reason: string } {
  const plan = freezeData(copy(input));
  validateNativeAreaSeam(plan);
  const revision = physical.revision, path: MassAddress[] = [plan.path[0]];
  if (typeof revision !== 'string' || !revision) throw Error('Native area seam requires a physical revision');
  if (!physicalCurrent(plan, physical, revision)) return { ok: false, reason: 'owner-source-mismatch' };
  const span = plan.policy.addressSpan, radius = plan.policy.bodyRadius, detour = detourOf(plan.policy);
  let spent = 0;
  for (let leg = 1; leg < plan.path.length; leg++) {
    const start = plan.path[leg - 1], finish = plan.path[leg], delta = localOffset(finish, start, span);
    const horizontal = delta.y === 0, distance = Math.abs(horizontal ? delta.x : delta.y), sign = Math.sign(horizontal ? delta.x : delta.y);
    const cols = Math.ceil(distance / NATIVE_AREA_SEAM_ROUTE.cell) + 1;
    const half = Math.ceil(detour / NATIVE_AREA_SEAM_ROUTE.cell), rows = 2 * half + 1, count = cols * rows;
    if ((spent += count) > NATIVE_AREA_SEAM_ROUTE.maxNodes) return { ok: false, reason: 'route-work-budget' };
    const point = (i: number): MassAddress => {
      const x = i % cols, y = Math.floor(i / cols) - half;
      if (y === 0 && x === 0) return start;
      if (y === 0 && x === cols - 1) return finish;
      const along = sign * distance * x / (cols - 1), across = half ? detour * y / half : 0;
      return moveAddress(start, horizontal ? { x: along, y: across } : { x: across, y: along }, span);
    };
    const startIndex = half * cols, endIndex = startIndex + cols - 1;
    const parent = new Int32Array(count); parent.fill(-2); parent[startIndex] = -1;
    const queue = new Int32Array(count); queue[0] = startIndex; let tail = 1;
    const edges = new Map<string, boolean>();
    for (let head = 0; head < tail && parent[endIndex] === -2; head++) {
      const at = queue[head], x = at % cols, y = Math.floor(at / cols);
      for (const [dx, dy] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        const next = ny * cols + nx; if (parent[next] !== -2) continue;
        const key = Math.min(at, next) + '/' + Math.max(at, next);
        let clear = edges.get(key);
        if (clear === undefined) {
          const a = point(at), b = point(next);
          clear = physical.sweep(a, b, radius) === true && physical.sweep(b, a, radius) === true; edges.set(key, clear);
        }
        if (!clear) continue;
        parent[next] = at; queue[tail++] = next;
      }
    }
    if (parent[endIndex] === -2) return { ok: false, reason: 'no-clear-route' };
    const legPath: MassAddress[] = [];
    for (let i = endIndex; i !== startIndex; i = parent[i]) legPath.push(point(i));
    path.push(...legPath.reverse());
    if (path.length > 4096) return { ok: false, reason: 'route-path-budget' };
  }
  if (!physicalCurrent(plan, physical, revision)) return { ok: false, reason: 'geometry-changed-during-search' };
  let length: number;
  try { length = routeLength(plan, path); } catch { return { ok: false, reason: 'route-length-budget' }; }
  if (length > plan.policy.maxLength) return { ok: false, reason: 'route-length-budget' };
  // Replay the complete final path against the same source revision. The BFS
  // cache is only search work, never a substitute for a publication proof.
  const proof = verifyNativeAreaSeam(plan, physical, path);
  if (physical.revision !== revision) return { ok: false, reason: 'geometry-changed-during-search' };
  return proof;
}
