import type { Vec2 } from '../core/math';
import { copyNativeAreaData, createNativeAreaGeometry, serializeNativeAreaData,
  type NativeAreaGeometrySource, type NativeAreaGeometry } from './nativeAreaGeometry';

export const NATIVE_AREA_ROUTE_POLICY = Object.freeze({
  step: 30, maxCells: 262144, maxExpanded: 131072, maxSweeps: 524288,
  maxTargets: 32, maxPathPoints: 262144,
});
export interface NativeAreaRouteRequest {
  bodyRadius: number;
  /** Exact resolved native spawn or another already owned interior stand. */
  from: Vec2;
  /** Exact interaction/approach stands. Fixture centers need not be walkable. */
  targets: { id: string; point: Vec2 }[];
}
export interface NativeAreaRouteProof {
  schema: 1; algorithm: 'native-area-routes-v1';
  geometryIdentity: string;
  request: NativeAreaRouteRequest;
  routes: { target: string; path: Vec2[]; length: number }[];
}
export type NativeAreaRouteResult = { ok: true; proof: Readonly<NativeAreaRouteProof>; expanded: number; sweeps: number }
  | { ok: false; reason: 'blocked-origin' | 'blocked-target' | 'no-clear-route' | 'route-work-budget'; target?: string; expanded: number; sweeps: number };
const equal = (a: Vec2, b: Vec2) => a.x === b.x && a.y === b.y;
const same = (a: unknown, b: unknown) => serializeNativeAreaData(a) === serializeNativeAreaData(b);
const own = (v: unknown, keys: readonly string[]) => !!v && typeof v === 'object' && keys.every(k => Object.hasOwn(v, k));
const point = (p: Vec2) => !!p && Object.hasOwn(p, 'x') && Object.hasOwn(p, 'y')
  && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= 1e7 && Math.abs(p.y) <= 1e7;
function validateRequest(request: NativeAreaRouteRequest): void {
  if (!own(request, ['bodyRadius', 'from', 'targets']) || !Object.hasOwn(request, 'bodyRadius') || !Number.isFinite(request.bodyRadius)
    || request.bodyRadius < 1 || request.bodyRadius > 120 || !point(request.from)
    || !Array.isArray(request.targets) || !request.targets.length || request.targets.length > NATIVE_AREA_ROUTE_POLICY.maxTargets)
    throw Error('Invalid native area route request');
  const ids = new Set<string>();
  for (const target of request.targets) {
    if (!own(target, ['id', 'point']) || !Object.hasOwn(target, 'id') || typeof target.id !== 'string' || !target.id || ids.has(target.id) || !point(target.point))
      throw Error('Invalid native area route target');
    ids.add(target.id);
  }
}
/** Only ordinary ground-tier walking inside this complete immutable area is
 * proved. No exterior shortcut, closed-door exemption, geometry repair, endpoint
 * relocation, tier transition or alternate face is allowed. Failure does not
 * imply every finer path search would fail. */
export function planNativeAreaRoutes(source: NativeAreaGeometrySource, raw: NativeAreaRouteRequest): NativeAreaRouteResult {
  const request = copyNativeAreaData(raw); validateRequest(request);
  const geometry = createNativeAreaGeometry(source), policy = NATIVE_AREA_ROUTE_POLICY;
  const bounds = geometry.source.bounds;
  const pieces = [ { x: 0, y: 0, w: bounds.w, h: bounds.h }, ...(Object.hasOwn(bounds, 'pieces') ? bounds.pieces ?? [] : []).filter(p => Object.hasOwn(p, 'active') && p.active) ];
  const minX = Math.floor(Math.min(...pieces.map(p => p.x)) / policy.step) * policy.step;
  const minY = Math.floor(Math.min(...pieces.map(p => p.y)) / policy.step) * policy.step;
  const maxX = Math.max(...pieces.map(p => p.x + p.w)), maxY = Math.max(...pieces.map(p => p.y + p.h));
  const cols = Math.ceil((maxX - minX) / policy.step) + 1, rows = Math.ceil((maxY - minY) / policy.step) + 1;
  const total = cols * rows;
  let expanded = 0, sweeps = 0, exhausted = false;
  const refuse = (reason: 'blocked-origin' | 'blocked-target' | 'no-clear-route' | 'route-work-budget', target?: string): NativeAreaRouteResult =>
    ({ ok: false, reason, ...(target === undefined ? {} : { target }), expanded, sweeps });
  if (!Number.isSafeInteger(total) || total > policy.maxCells) return refuse('route-work-budget');
  const clear = (a: Vec2, b: Vec2): boolean => {
    if (sweeps + 2 > policy.maxSweeps) { exhausted = true; return false; }
    sweeps += 2;
    return geometry.sweepClear(a, b, request.bodyRadius) && geometry.sweepClear(b, a, request.bodyRadius);
  };
  if (!clear(request.from, request.from)) return refuse('blocked-origin');
  for (const target of request.targets) if (!clear(target.point, target.point)) return refuse('blocked-target', target.id);
  const pointAt = (i: number): Vec2 => ({ x: minX + (i % cols) * policy.step, y: minY + Math.floor(i / cols) * policy.step });
  // The exact endpoints connect only to their four cell corners. Every link is
  // itself a whole capsule proof; rounding never substitutes for reachability.
  const corners = (p: Vec2): number[] => {
    const x = (p.x - minX) / policy.step, y = (p.y - minY) / policy.step;
    const out: number[] = [];
    for (const cy of new Set([Math.floor(y), Math.ceil(y)])) for (const cx of new Set([Math.floor(x), Math.ceil(x)]))
      if (cx >= 0 && cy >= 0 && cx < cols && cy < rows) out.push(cy * cols + cx);
    return out.sort((a, b) => a - b);
  };
  const starts = corners(request.from).filter(i => clear(request.from, pointAt(i)));
  const edgeCache = new Map<number, boolean>();
  const routes: NativeAreaRouteProof['routes'] = [];
  let pathPoints = 0;
  for (const target of request.targets) {
    if (clear(request.from, target.point)) {
      routes.push({ target: target.id, path: equal(request.from, target.point) ? [request.from] : [request.from, target.point],
        length: Math.hypot(target.point.x - request.from.x, target.point.y - request.from.y) });
      pathPoints += routes.at(-1)!.path.length; continue;
    }
    if (exhausted) return refuse('route-work-budget', target.id);
    const goals = corners(target.point).filter(i => clear(pointAt(i), target.point));
    if (!starts.length || !goals.length) return refuse(exhausted ? 'route-work-budget' : 'no-clear-route', target.id);
    const goalSet = new Set(goals);
    const distance = new Float64Array(total); distance.fill(Infinity);
    const parent = new Int32Array(total); parent.fill(-2);
    type Node = { i: number; cost: number; score: number };
    const heap: Node[] = [];
    const before = (a: Node, b: Node) => a.score < b.score || a.score === b.score && (a.cost < b.cost || a.cost === b.cost && a.i < b.i);
    const push = (node: Node) => { let i = heap.length; heap.push(node); while (i) { const p = (i - 1) >> 1; if (!before(node, heap[p])) break; heap[i] = heap[p]; i = p; } heap[i] = node; };
    const pop = (): Node => { const top = heap[0], last = heap.pop()!; if (heap.length) { let i = 0; while (i * 2 + 1 < heap.length) { let c = i * 2 + 1; if (c + 1 < heap.length && before(heap[c + 1], heap[c])) c++; if (!before(heap[c], last)) break; heap[i] = heap[c]; i = c; } heap[i] = last; } return top; };
    const estimate = (i: number) => Math.min(...goals.map(g => (Math.abs(g % cols - i % cols) + Math.abs(Math.floor(g / cols) - Math.floor(i / cols))) * policy.step));
    for (const i of starts) { const p = pointAt(i), cost = Math.hypot(p.x - request.from.x, p.y - request.from.y); distance[i] = cost; parent[i] = -1; push({ i, cost, score: cost + estimate(i) }); }
    let last = -1;
    while (heap.length && !exhausted && expanded < policy.maxExpanded) {
      const n = pop(); if (distance[n.i] !== n.cost) continue;
      expanded++;
      if (goalSet.has(n.i)) { last = n.i; break; }
      const x = n.i % cols, y = Math.floor(n.i / cols);
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const next = ny * cols + nx, cost = n.cost + policy.step;
        if (cost >= distance[next]) continue;
        const edge = Math.min(n.i, next) * 2 + (x === nx ? 1 : 0);
        let pass = edgeCache.get(edge);
        if (pass === undefined) { pass = clear(pointAt(n.i), pointAt(next)); edgeCache.set(edge, pass); }
        if (!pass) continue;
        distance[next] = cost; parent[next] = n.i; push({ i: next, cost, score: cost + estimate(next) });
      }
    }
    if (last === -1) return refuse(exhausted || expanded >= policy.maxExpanded ? 'route-work-budget' : 'no-clear-route', target.id);
    const path: Vec2[] = [];
    for (let i = last; i !== -1; i = parent[i]) path.push(pointAt(i));
    path.reverse(); if (!equal(path[0], request.from)) path.unshift(request.from);
    if (!equal(path.at(-1)!, target.point)) path.push(target.point);
    if ((pathPoints += path.length) > policy.maxPathPoints) return refuse('route-work-budget', target.id);
    routes.push({ target: target.id, path, length: path.reduce((n, p, i) => n + (i ? Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y) : 0), 0) });
  }
  if (exhausted) return refuse('route-work-budget');
  const proof = copyNativeAreaData({ schema: 1 as const, algorithm: 'native-area-routes-v1' as const,
    geometryIdentity: geometry.identity, request, routes });
  const replaySweeps = 2 * routes.reduce((n, route) => n + route.path.length, 0);
  if (sweeps + replaySweeps > policy.maxSweeps) return refuse('route-work-budget');
  validateProof(geometry, proof); sweeps += replaySweeps;
  return { ok: true, proof, expanded, sweeps };
}
function validateProof(geometry: NativeAreaGeometry, proof: NativeAreaRouteProof): void {
  if (!own(proof, ['schema', 'algorithm', 'geometryIdentity', 'request', 'routes'])) throw Error('Incomplete native area route proof');
  validateRequest(proof.request);
  if (proof.schema !== 1 || proof.algorithm !== 'native-area-routes-v1' || proof.geometryIdentity !== geometry.identity
    || !Array.isArray(proof.routes) || proof.routes.length !== proof.request.targets.length
    || proof.routes.reduce((n, r) => n + (Array.isArray(r.path) ? r.path.length : Infinity), 0) > NATIVE_AREA_ROUTE_POLICY.maxPathPoints)
    throw Error('Invalid native area route proof');
  for (const [i, route] of proof.routes.entries()) {
    if (!own(route, ['target', 'path', 'length'])) throw Error('Incomplete native area route');
    const target = proof.request.targets[i], path = route.path;
    if (route.target !== target.id || !path.length || path.some(p => !point(p)) || !same(path[0], proof.request.from) || !same(path.at(-1), target.point))
      throw Error('Native area route lost its exact endpoints');
    let length = 0;
    for (let j = 0; j < path.length; j++) {
      const a = path[j ? j - 1 : 0], b = path[j];
      if (j && equal(a, b)) throw Error('Degenerate native area route');
      if (!geometry.sweepClear(a, b, proof.request.bodyRadius) || !geometry.sweepClear(b, a, proof.request.bodyRadius))
        throw Error('Native area route crosses blocked or exterior geometry');
      if (j) length += Math.hypot(a.x - b.x, a.y - b.y);
    }
    if (length !== route.length) throw Error('Native area route length changed');
  }
}
/** Recheck all restored path segments against complete immutable geometry.
 * A checksum, clear endpoints or a caller-made receipt cannot replace this. */
export function restoreNativeAreaRouteProof(source: NativeAreaGeometrySource, raw: NativeAreaRouteProof): Readonly<NativeAreaRouteProof> {
  const proof = copyNativeAreaData(raw), geometry = createNativeAreaGeometry(source);
  validateProof(geometry, proof); return proof;
}
