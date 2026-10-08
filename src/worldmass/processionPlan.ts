import { massTerrainRegions } from './contracts';
import type { Vec2 } from '../core/math';
import type { MassProcessionContext } from './processionTypes';
import { validateNativeGeographicSelection, type NativeGeographicObjectiveSource, type NativeGeographicSelectionReceipt } from './geographicObjectiveChoice';
import { address, latticeAt, localOffset, moveAddress, type MassAddress } from './address';
import type { MassRun, MassSpec, MassTerrainPatch } from './contracts';
import { MassGenerator } from './generator';
import { massAddressBounds, type MassGeography } from './hierarchy';
import { canonical, freezeData, massDigest, massRandom } from './random';

export const PROCESSION_PLAN_COMPILER = 'procession-route-v1';
/** Physical clearance includes the 18px cart, escort and native kept-way verge.
 * None of these values grants permission to carve or clear existing scenery. */
export const PROCESSION_ROUTE_POLICY = Object.freeze({
  version: 1, chunkSpan: 1350, zoneSpan: 5400, step: 60, edgeMargin: 240,
  endpointInset: 660, endpointSpread: 900, minDistance: 2700, minChunks: 3,
  bodyRadius: 18, corridorRadius: 60, apronRadius: 128, maxFirstSegment: 240, maxSegment: 450,
  maxLength: 12000, maxPoints: 192, maxPairs: 4, apronAlternatives: 16,
  maxExpanded: 20000, maxSweeps: 160000, maxCellChecks: 4000000,
  maxTerrainSamples: 65536, maxPlacePages: 81, maxPlaces: 4096,
  maxReservations: 4096, maxPatches: 8192, maxInputBytes: 4000000,
});
export type ProcessionRouteContext = MassProcessionContext;
export interface ProcessionCircle extends Vec2 { radius: number }
export interface ProcessionBox { minX: number; minY: number; maxX: number; maxY: number; padding: number }
export interface ProcessionCapsule { a: Vec2; b: Vec2; radius: number }
export interface ProcessionReservations {
  /** All rows are relative to owner.center, captured before route birth. */
  revision: string; circles: readonly ProcessionCircle[]; boxes: readonly ProcessionBox[]; capsules: readonly ProcessionCapsule[];
}
export interface ProcessionPlanInput {
  compiler: typeof PROCESSION_PLAN_COMPILER; policy: typeof PROCESSION_ROUTE_POLICY;
  run: MassRun; terrain: MassSpec; owner: Readonly<MassGeography>;
  context: Readonly<ProcessionRouteContext>; selection: readonly NativeGeographicObjectiveSource[]; selectionReceipt: Readonly<NativeGeographicSelectionReceipt>;
  regions: Readonly<Record<string, { walkable: boolean; dry: boolean; standStatusDeep?: boolean }>>;
  patches: readonly MassTerrainPatch[]; reservations: Readonly<ProcessionReservations>;
}
export interface MassProcessionRoute {
  version: 1; compiler: typeof PROCESSION_PLAN_COMPILER; id: string; run: string; owner: string;
  center: MassAddress; entry: MassAddress; destination: MassAddress; points: readonly MassAddress[];
  bodyRadius: number; corridorRadius: number; apronRadius: number; chunkSpan: number;
  chunks: readonly string[]; length: number; inputHash: string; sourceHash: string; proofHash: string;
}
export interface ProcessionPlanMetrics { expanded: number; sweeps: number; cellChecks: number; samples: number; placePages: number; places: number; pairs: number }
export interface ProcessionPreparation {
  compiler: typeof PROCESSION_PLAN_COMPILER; inputHash: string; sourceHash: string;
  plan: Readonly<MassProcessionRoute> | null; refusal: string | null; metrics: Readonly<ProcessionPlanMetrics>;
}
const copy = <T>(v: T): T => JSON.parse(canonical(v)) as T;
const finitePoint = (p: Vec2) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const canonicalAt = (p: MassAddress, span: number) => canonical(p) === canonical(address(p.dimension, p.cx, p.cy, p.x, p.y, span));
const sq = (n: number) => n * n;
const distanceSq = (p: Vec2, a: Vec2, b: Vec2): number => {
  const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return sq(p.x - a.x - t * dx) + sq(p.y - a.y - t * dy);
};
const orientation = (a: Vec2, b: Vec2, c: Vec2) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function segmentsCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  return Math.max(a.x, b.x) >= Math.min(c.x, d.x) && Math.max(c.x, d.x) >= Math.min(a.x, b.x)
    && Math.max(a.y, b.y) >= Math.min(c.y, d.y) && Math.max(c.y, d.y) >= Math.min(a.y, b.y)
    && orientation(a, b, c) * orientation(a, b, d) <= 0 && orientation(c, d, a) * orientation(c, d, b) <= 0;
}
const segmentDistanceSq = (a: Vec2, b: Vec2, c: Vec2, d: Vec2) => segmentsCross(a, b, c, d) ? 0
  : Math.min(distanceSq(a, c, d), distanceSq(b, c, d), distanceSq(c, a, b), distanceSq(d, a, b));
/** Exact capsule versus closed rectangle. A diagonal corner touch is included. */
export function processionCapsuleIntersectsBox(a: Vec2, b: Vec2, radius: number, box: ProcessionBox): boolean {
  const r = radius + box.padding;
  if (Math.max(a.x, b.x) + r < box.minX || Math.min(a.x, b.x) - r > box.maxX
    || Math.max(a.y, b.y) + r < box.minY || Math.min(a.y, b.y) - r > box.maxY) return false;
  const rectDistance = (p: Vec2) => sq(Math.max(box.minX - p.x, 0, p.x - box.maxX)) + sq(Math.max(box.minY - p.y, 0, p.y - box.maxY));
  if (Math.min(rectDistance(a), rectDistance(b)) <= r * r) return true;
  const corners = [{ x: box.minX, y: box.minY }, { x: box.maxX, y: box.minY }, { x: box.maxX, y: box.maxY }, { x: box.minX, y: box.maxY }];
  return corners.some((c, i) => segmentDistanceSq(a, b, c, corners[(i + 1) % 4]) <= r * r);
}
export function processionPlanIdentity(input: Readonly<ProcessionPlanInput>): { inputHash: string; sourceHash: string } {
  return { inputHash: massDigest(input), sourceHash: massDigest({ compiler: input.compiler, policy: input.policy, terrain: input.run.manifest,
    context: input.context, selection: input.selection, selectionReceipt: input.selectionReceipt, regions: input.regions }) };
}
export function validateProcessionPlanInput(input: Readonly<ProcessionPlanInput>): void {
  if (canonical(input).length > PROCESSION_ROUTE_POLICY.maxInputBytes) throw Error('Procession input byte budget exceeded');
  const p = PROCESSION_ROUTE_POLICY, owner = input.owner, span = input.terrain.addressSpan, r = input.reservations;
  if (input.compiler !== PROCESSION_PLAN_COMPILER || canonical(input.policy) !== canonical(p)
    || owner.kind !== 'zone' || owner.span !== p.zoneSpan || owner.run !== input.run.runId || input.run.addressSpan !== span
    || !owner.id || !input.context.source || !input.context.config || !input.selectionReceipt
    || input.context.zone.id !== owner.id || input.context.zone.objective.kind !== 'procession' || input.context.zone.objective.seal
    || input.context.zone.aquatic || input.context.zone.boundless || input.context.config.cartId !== 'caravan_cart' || input.context.config.road.overgrowth !== 0
    || !canonicalAt(owner.center, span) || !canonicalAt(owner.origin, span) || owner.center.dimension !== owner.dimension
    || canonical(massAddressBounds(owner.origin, owner.span, owner.span, span)) !== canonical(owner.bounds)
    || canonical(localOffset(owner.center, owner.origin, span)) !== canonical({ x: owner.span / 2, y: owner.span / 2 })
    || latticeAt(owner.origin, span, p.chunkSpan).fx !== 0 || latticeAt(owner.origin, span, p.chunkSpan).fy !== 0
    || !Number.isSafeInteger(input.terrain.terrainCell) || input.terrain.terrainCell < 12 || input.terrain.terrainCell > 60
    || span % input.terrain.terrainCell) throw Error('Invalid procession route source input');
  if (!r.revision || !Array.isArray(r.circles) || !Array.isArray(r.boxes) || !Array.isArray(r.capsules)
    || r.circles.length + r.boxes.length + r.capsules.length > p.maxReservations
    || r.circles.some(c => !finitePoint(c) || !Number.isFinite(c.radius) || c.radius < 0)
    || r.boxes.some(b => !Object.values(b).every(Number.isFinite) || b.minX > b.maxX || b.minY > b.maxY || b.padding < 0)
    || r.capsules.some(c => !finitePoint(c.a) || !finitePoint(c.b) || !Number.isFinite(c.radius) || c.radius < 0)) throw Error('Invalid procession reservations');
  if (!Array.isArray(input.patches) || input.patches.length > p.maxPatches) throw Error('Procession patch budget exceeded');
  validateNativeGeographicSelection(input.run.seed, owner.id, input.selection, input.selectionReceipt);
  const recipe = input.context.recipe;
  if (!recipe || input.selectionReceipt.selected !== recipe.id || recipe.source !== 'data/tilesets'
    || !input.selection.some(s => canonical(s) === canonical(recipe)) || recipe.tileset !== input.context.zone.tileset
    || canonical(recipe.objective) !== canonical(input.context.zone.objective) || input.context.source !== recipe.source + '/' + recipe.id) throw Error('Invalid procession native selection');
  for (const rule of Object.values(input.regions)) if (!rule || typeof rule.walkable !== 'boolean' || typeof rule.dry !== 'boolean'
    || rule.standStatusDeep !== undefined && typeof rule.standStatusDeep !== 'boolean') throw Error('Invalid procession terrain rule');
  const patches = new Set<string>(), cell = input.terrain.terrainCell;
  for (const patch of input.patches) {
    if (!canonicalAt(patch.address, span) || patch.address.dimension !== owner.dimension || patch.address.x % cell || patch.address.y % cell
      || !input.regions[patch.region]) throw Error('Invalid procession terrain patch');
    const key = canonical(patch.address); if (patches.has(key)) throw Error('Duplicate procession patch'); patches.add(key);
  }
  for (const id of massTerrainRegions(input.terrain))
    if (!input.regions[id] || typeof input.regions[id].walkable !== 'boolean' || typeof input.regions[id].dry !== 'boolean') throw Error('Missing procession terrain rules');
}
class RouteBudget extends Error {}
const metrics = (): ProcessionPlanMetrics => ({ expanded: 0, sweeps: 0, cellChecks: 0, samples: 0, placePages: 0, places: 0, pairs: 0 });
function* environmentSteps(input: Readonly<ProcessionPlanInput>, stats: ProcessionPlanMetrics, generator?: MassGenerator) {
  const gen = generator ?? new MassGenerator(input.run, input.terrain), p = input.policy, span = input.terrain.addressSpan, center = input.owner.center;
  if (canonical(gen.run) !== canonical(input.run) || massDigest(gen.spec) !== input.run.manifest) throw Error('Procession generator source mismatch');
  const half = input.owner.span / 2 - p.edgeMargin, cell = input.terrain.terrainCell;
  const phase = latticeAt(center, span, cell), phaseX = phase.fx * cell, phaseY = phase.fy * cell;
  const patches = new Map<string, string>(), terrain = new Map<string, boolean>();
  for (const row of input.patches) {
    const delta = localOffset(row.address, center, span, 64);
    patches.set(Math.floor((delta.x + phaseX) / cell) + ',' + Math.floor((delta.y + phaseY) / cell), row.region);
  }
  const circles = [...input.reservations.circles], places = new Map<string, ProcessionCircle>();
  const lo = moveAddress(center, { x: -half - p.apronRadius, y: -half - p.apronRadius }, span);
  const hi = moveAddress(center, { x: half + p.apronRadius, y: half + p.apronRadius }, span);
  if ((BigInt(hi.cx) - BigInt(lo.cx) + 1n) * (BigInt(hi.cy) - BigInt(lo.cy) + 1n) > BigInt(p.maxPlacePages)) throw new RouteBudget('procession-place-page-budget');
  for (let y = BigInt(lo.cy); y <= BigInt(hi.cy); y++) for (let x = BigInt(lo.cx); x <= BigInt(hi.cx); x++) {
    yield; stats.placePages++;
    for (const place of gen.placesInCell({ dimension: center.dimension, cx: x.toString(), cy: y.toString() })) {
      places.set(place.id, { ...localOffset(place.center, center, span, 4096), radius: place.radius });
      if (places.size > p.maxPlaces) throw new RouteBudget('procession-place-budget');
    }
  }
  stats.places = places.size; circles.push(...places.values());
  const dry = (x: number, y: number): boolean => {
    const key = x + ',' + y, found = terrain.get(key); if (found !== undefined) return found;
    if (stats.samples >= p.maxTerrainSamples) throw new RouteBudget('procession-terrain-budget'); stats.samples++;
    const id = patches.get(key) ?? gen.terrainAt(moveAddress(center, { x: (x + .5) * cell - phaseX, y: (y + .5) * cell - phaseY }, span)).region;
    const rule = input.regions[id], okay = !!rule?.walkable && !!rule.dry && !rule.standStatusDeep && !['water', 'lava', 'chasm', 'bog', 'swamp'].includes(id);
    terrain.set(key, okay); return okay;
  };
  const clear = (a: Vec2, b: Vec2, radius: number): boolean => {
    if (stats.sweeps >= p.maxSweeps) throw new RouteBudget('procession-sweep-budget'); stats.sweeps++;
    if (Math.max(Math.abs(a.x), Math.abs(a.y), Math.abs(b.x), Math.abs(b.y)) + radius > input.owner.span / 2) return false;
    if (circles.some(c => distanceSq(c, a, b) <= sq(radius + c.radius))
      || input.reservations.boxes.some(box => processionCapsuleIntersectsBox(a, b, radius, box))
      || input.reservations.capsules.some(c => segmentDistanceSq(a, b, c.a, c.b) <= sq(radius + c.radius))) return false;
    for (let y = Math.floor((Math.min(a.y, b.y) - radius + phaseY) / cell); y <= Math.floor((Math.max(a.y, b.y) + radius + phaseY) / cell); y++)
      for (let x = Math.floor((Math.min(a.x, b.x) - radius + phaseX) / cell); x <= Math.floor((Math.max(a.x, b.x) + radius + phaseX) / cell); x++) {
        if (stats.cellChecks >= p.maxCellChecks) throw new RouteBudget('procession-cell-check-budget'); stats.cellChecks++;
        if (processionCapsuleIntersectsBox(a, b, radius, { minX: x * cell - phaseX, minY: y * cell - phaseY, maxX: (x + 1) * cell - phaseX, maxY: (y + 1) * cell - phaseY, padding: 0 }) && !dry(x, y)) return false;
      }
    return true;
  };
  return { clear, half };
}
/** Centerline chunks are derived using exact segment boundary crossings, even
 * when a diagonal enters a chunk between two navigation waypoints. */
function routeChunks(points: readonly MassAddress[], span: number, chunkSpan: number): string[] {
  const found = new Set<string>();
  const add = (at: MassAddress) => { const q = latticeAt(at, span, chunkSpan); found.add(canonical([at.dimension, q.gx.toString(), q.gy.toString()])); };
  for (let i = 0; i < points.length; i++) {
    add(points[i]); if (!i) continue;
    const a = points[i - 1], d = localOffset(points[i], a, span, 16), base = latticeAt(a, span, chunkSpan), ts = [0, 1];
    for (const [offset, delta] of [[base.fx * chunkSpan, d.x], [base.fy * chunkSpan, d.y]]) if (delta) {
      for (let k = Math.floor(Math.min(offset, offset + delta) / chunkSpan) + 1; k * chunkSpan < Math.max(offset, offset + delta); k++) ts.push((k * chunkSpan - offset) / delta);
    }
    ts.sort((a, b) => a - b);
    for (let j = 1; j < ts.length; j++) { const t = (ts[j - 1] + ts[j]) / 2; add(moveAddress(a, { x: d.x * t, y: d.y * t }, span)); }
  }
  return [...found].sort();
}
/** Bounded seeded provider, not a validator around a pre-authored line. The
 * kernel sees only saved native source data, terrain, patches and reservations.
 * Native scenery/body sweep and atomic road/cart publication remain host work. */
export function* compileProcessionPlanSteps(input: Readonly<ProcessionPlanInput>, generator?: MassGenerator): Generator<void, Readonly<ProcessionPreparation>, unknown> {
  validateProcessionPlanInput(input);
  const identity = processionPlanIdentity(input), stats = metrics(), p = input.policy, span = input.terrain.addressSpan;
  const finish = (plan: MassProcessionRoute | null, refusal: string | null): Readonly<ProcessionPreparation> => freezeData(copy<ProcessionPreparation>({ compiler: PROCESSION_PLAN_COMPILER, ...identity, plan, refusal, metrics: stats }));
  try {
    const env = yield* environmentSteps(input, stats, generator);
    const half = Math.floor(env.half / p.step) * p.step, side = half / p.step * 2 + 1, total = side * side;
    const point = (i: number): Vec2 => ({ x: i % side * p.step - half, y: Math.floor(i / side) * p.step - half });
    const index = (q: Vec2): number => (q.y / p.step + half / p.step) * side + q.x / p.step + half / p.step;
    const rng = massRandom(input.run.seed, [input.owner.id, PROCESSION_PLAN_COMPILER, identity.sourceHash]);
    const firstAxis = rng.int(0, 1), reverse = rng.chance(.5), endpoint = Math.floor((input.owner.span / 2 - p.endpointInset) / p.step) * p.step;
    const edgeMemo = new Map<string, boolean>(), apronMemo = new Map<number, boolean>();
    const edge = (a: number, b: number) => { const key = a < b ? a + ',' + b : b + ',' + a; let value = edgeMemo.get(key); if (value === undefined) { value = env.clear(point(a), point(b), p.corridorRadius); edgeMemo.set(key, value); } return value; };
    type Node = { i: number; cost: number; score: number };
    const search = function* (start: number, end: number): Generator<void, number[] | null, unknown> {
      const costs = new Float64Array(total); costs.fill(Infinity); const parents = new Int32Array(total); parents.fill(-1); const heap: Node[] = [];
      const before = (a: Node, b: Node) => a.score < b.score || a.score === b.score && (a.cost > b.cost || a.cost === b.cost && a.i < b.i);
      const push = (n: Node) => { let i = heap.length; heap.push(n); while (i) { const parent = (i - 1) >> 1; if (!before(n, heap[parent])) break; heap[i] = heap[parent]; i = parent; } heap[i] = n; };
      const pop = () => { const n = heap[0], last = heap.pop()!; if (heap.length) { let i = 0; while (i * 2 + 1 < heap.length) { let c = i * 2 + 1; if (c + 1 < heap.length && before(heap[c + 1], heap[c])) c++; if (!before(heap[c], last)) break; heap[i] = heap[c]; i = c; } heap[i] = last; } return n; };
      const h = (i: number) => { const dx = Math.abs(i % side - end % side), dy = Math.abs(Math.floor(i / side) - Math.floor(end / side)); return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy); };
      costs[start] = 0; push({ i: start, cost: 0, score: h(start) });
      while (heap.length) {
        yield; const n = pop(); if (n.cost !== costs[n.i]) continue;
        if (stats.expanded >= p.maxExpanded) throw new RouteBudget('procession-search-budget'); stats.expanded++;
        if (n.i === end) { const route: number[] = []; for (let i = end; i !== -1; i = parents[i]) route.push(i); return route.reverse(); }
        const x = n.i % side, y = Math.floor(n.i / side);
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= side || yy >= side) continue;
          const next = yy * side + xx, cost = n.cost + (dx && dy ? Math.SQRT2 : 1);
          if (cost >= costs[next] || !edge(n.i, next)) continue;
          costs[next] = cost; parents[next] = n.i; push({ i: next, cost, score: cost + h(next) });
        }
      }
      return null;
    };
    for (let pair = 0; pair < p.maxPairs; pair++) {
      stats.pairs++; const axis = (firstAxis + pair) % 2;
      const choose = function* (sign: number): Generator<void, number | null, unknown> {
        const base = rng.int(-p.endpointSpread / p.step, p.endpointSpread / p.step);
        for (let alternative = 0; alternative < p.apronAlternatives; alternative++) {
          yield; const shift = alternative ? Math.ceil(alternative / 2) * (alternative % 2 ? 1 : -1) : 0;
          const along = (base + shift) * p.step, q = axis ? { x: along, y: sign * endpoint } : { x: sign * endpoint, y: along };
          const i = index(q); let okay = apronMemo.get(i); if (okay === undefined) { okay = env.clear(q, q, p.apronRadius); apronMemo.set(i, okay); } if (okay) return i;
        }
        return null;
      };
      const start = yield* choose(reverse ? 1 : -1); const end = yield* choose(reverse ? -1 : 1); if (start === null || end === null) continue;
      const raw = yield* search(start, end); if (!raw) continue;
      // Simplify only a proven entire swept capsule, with a fixed driver reach.
      // Native birth can be60px off entry. The shorter first goal keeps its
      // complete18px connector inside the128px apron /60px route union.
      const simplified: Vec2[] = [point(raw[0])];
      for (let i = 0; i < raw.length - 1;) {
        let next = i + 1;
        for (let j = i + 2; j < raw.length; j++) { yield; const a = point(raw[i]), b = point(raw[j]); if (Math.hypot(b.x - a.x, b.y - a.y) > (i === 0 ? p.maxFirstSegment : p.maxSegment)) break; if (env.clear(a, b, p.corridorRadius)) next = j; }
        simplified.push(point(raw[next])); i = next;
      }
      const points = simplified.map(q => moveAddress(input.owner.center, q, span));
      const length = simplified.slice(1).reduce((n, q, i) => n + Math.hypot(q.x - simplified[i].x, q.y - simplified[i].y), 0), chunks = routeChunks(points, span, p.chunkSpan);
      if (length > p.maxLength || points.length > p.maxPoints || chunks.length < p.minChunks) continue;
      const body: Omit<MassProcessionRoute, 'proofHash'> = { version: 1, compiler: PROCESSION_PLAN_COMPILER, id: canonical([input.run.runId, input.owner.id, 'procession-route', identity.inputHash]), run: input.run.runId, owner: input.owner.id,
        center: input.owner.center, entry: points[0], destination: points.at(-1)!, points, bodyRadius: p.bodyRadius, corridorRadius: p.corridorRadius, apronRadius: p.apronRadius,
        chunkSpan: p.chunkSpan, chunks, length, ...identity };
      return finish({ ...body, proofHash: massDigest(body) }, null);
    }
    return finish(null, 'procession-no-connected-aprons');
  } catch (error) { if (error instanceof RouteBudget) return finish(null, error.message); throw error; }
}
function drain<T>(steps: Generator<void, T, unknown>): T { for (;;) { const next = steps.next(); if (next.done) return next.value; } }
/** Explicit cold tooling entry. Ordinary residency must advance the iterator or
 * use the worker; no route query may silently drain this on a gameplay frame. */
export function compileProcessionPlan(input: Readonly<ProcessionPlanInput>, generator?: MassGenerator): Readonly<ProcessionPreparation> {
  return drain(compileProcessionPlanSteps(input, generator));
}
/** Structural saved-route validation does not consult current geography. Born
 * routes retain their exact history when later terrain or controllers change. */
export function validateProcessionRoute(route: Readonly<MassProcessionRoute>, span: number): void {
  const { proofHash, ...body } = route, p = PROCESSION_ROUTE_POLICY;
  if (route.version !== 1 || route.compiler !== PROCESSION_PLAN_COMPILER || proofHash !== massDigest(body) || !route.owner || !route.run || !route.inputHash || !route.sourceHash
    || route.id !== canonical([route.run, route.owner, 'procession-route', route.inputHash]) || !canonicalAt(route.center, span)
    || route.bodyRadius !== p.bodyRadius || route.corridorRadius !== p.corridorRadius || route.apronRadius !== p.apronRadius || route.chunkSpan !== p.chunkSpan
    || !Array.isArray(route.points) || route.points.length < 2 || route.points.length > p.maxPoints
    || route.points.some(q => !canonicalAt(q, span) || q.dimension !== route.center.dimension)
    || canonical(route.entry) !== canonical(route.points[0]) || canonical(route.destination) !== canonical(route.points.at(-1))) throw Error('Invalid procession route proof');
  const points = route.points.map(q => localOffset(q, route.center, span, 16)); let length = 0;
  const half = p.zoneSpan / 2 - p.edgeMargin;
  if (points.some(q => Math.abs(q.x) > half || Math.abs(q.y) > half)) throw Error('Procession leaves route bounds');
  for (let i = 1; i < points.length; i++) { const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y); if (d <= 0 || d > (i === 1 ? p.maxFirstSegment : p.maxSegment) + 1e-6) throw Error('Procession driver segment outside reach'); length += d; }
  const d = localOffset(route.destination, route.entry, span, 16), chunks = routeChunks(route.points, span, p.chunkSpan);
  if (Math.hypot(d.x, d.y) < p.minDistance || chunks.length < p.minChunks || canonical(chunks) !== canonical(route.chunks)
    || Math.abs(length - route.length) > 1e-6 || length > p.maxLength) throw Error('Invalid procession extent');
}
/** Validates a prepared reply against the EXPECTED frozen input, then checks
 * every returned capsule/apron without rerunning search. No partial admission. */
export function* validateProcessionPlanSteps(input: Readonly<ProcessionPlanInput>, prepared: Readonly<ProcessionPreparation>, generator?: MassGenerator): Generator<void, void, unknown> {
  validateProcessionPlanInput(input); canonical(prepared);
  const identity = processionPlanIdentity(input);
  if (prepared.compiler !== PROCESSION_PLAN_COMPILER || prepared.inputHash !== identity.inputHash || prepared.sourceHash !== identity.sourceHash
    || (prepared.plan === null ? !prepared.refusal : prepared.refusal !== null)) throw Error('Foreign procession preparation');
  if (!prepared.plan) return;
  const route = prepared.plan; validateProcessionRoute(route, input.terrain.addressSpan);
  if (route.inputHash !== identity.inputHash || route.sourceHash !== identity.sourceHash || route.owner !== input.owner.id || route.run !== input.run.runId
    || canonical(route.center) !== canonical(input.owner.center)) throw Error('Foreign procession route');
  const env = yield* environmentSteps(input, metrics(), generator); const points = route.points.map(q => localOffset(q, route.center, input.terrain.addressSpan, 16));
  for (const q of [points[0], points.at(-1)!]) { yield; if (!env.clear(q, q, route.apronRadius)) throw Error('Blocked procession route proof'); }
  for (let i = 1; i < points.length; i++) { yield; if (!env.clear(points[i - 1], points[i], route.corridorRadius)) throw Error('Blocked procession route proof'); }
}
export function validateProcessionPlan(input: Readonly<ProcessionPlanInput>, prepared: Readonly<ProcessionPreparation>, generator?: MassGenerator): void {
  drain(validateProcessionPlanSteps(input, prepared, generator));
}
/** Derived and bounded. Reservations cover complete continuous capsules and
 * terminal staging discs, not spaced scenery stamps or waypoint-only dots. */
export class ProcessionRouteIndex {
  private readonly points: readonly Vec2[];
  readonly route: Readonly<MassProcessionRoute>;
  constructor(route: Readonly<MassProcessionRoute>, readonly span: number) {
    validateProcessionRoute(route, span); this.route = freezeData(copy(route)); this.points = this.route.points.map(q => localOffset(q, this.route.center, span, 16));
  }
  intersects(at: MassAddress, radius: number): boolean {
    if (!Number.isFinite(radius) || radius < 0 || radius > 6000) throw Error('Invalid procession corridor query');
    if (at.dimension !== this.route.center.dimension) return false;
    let q: Vec2; try { q = localOffset(at, this.route.center, this.span, 64); } catch (error) { if (error instanceof RangeError) return false; throw error; }
    if (Math.max(Math.abs(q.x), Math.abs(q.y)) > PROCESSION_ROUTE_POLICY.zoneSpan / 2 + radius) return false;
    const first = this.points[0], last = this.points.at(-1)!;
    return Math.min(sq(q.x - first.x) + sq(q.y - first.y), sq(q.x - last.x) + sq(q.y - last.y)) <= sq(this.route.apronRadius + radius)
      || this.points.slice(1).some((b, i) => distanceSq(q, this.points[i], b) <= sq(this.route.corridorRadius + radius));
  }
}

export interface ProcessionPlanJob { protocol: 1; token: number; input: Readonly<ProcessionPlanInput>; inputHash: string; sourceHash: string; maxBytes: number }
export interface ProcessionPlanReply { protocol: 1; token: number; preparation?: Readonly<ProcessionPreparation>; bytes?: number; compileMs?: number; error?: string }
/** Shared worker protocol entry; no native bootstrap or ambient random stream. */
export function prepareProcessionPlan(job: ProcessionPlanJob, generator?: MassGenerator): ProcessionPlanReply {
  try {
    if (!job || job.protocol !== 1 || !Number.isSafeInteger(job.token) || job.token < 1 || !Number.isSafeInteger(job.maxBytes)
      || job.maxBytes < 1024 || job.maxBytes > 1048576) throw Error('Invalid procession compiler job');
    const identity = processionPlanIdentity(job.input);
    if (identity.inputHash !== job.inputHash || identity.sourceHash !== job.sourceHash) throw Error('Foreign procession job source');
    const start = performance.now(), preparation = compileProcessionPlan(job.input, generator), bytes = canonical(preparation).length * 2;
    if (bytes > job.maxBytes) throw Error('Procession response budget exceeded');
    return { protocol: 1, token: job.token, preparation, bytes, compileMs: performance.now() - start };
  } catch (error) { return { protocol: 1, token: job?.token ?? 0, error: String(error instanceof Error ? error.message : error) }; }
}
