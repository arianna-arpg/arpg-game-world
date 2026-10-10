import { massTerrainRegions } from './contracts';
import { massFocusRoundRobin } from './foci';
import { massCompileInput } from './compilePort';
import type { Vec2 } from '../core/math';
import { Rng } from '../core/rng';
import type { World } from '../engine/world';
import { regionKind } from '../world/regions';
import { address, localOffset, moveAddress, type MassAddress, type MassCell } from './address';
import { discTerrainClear } from './geographicAccessCore';
import { chooseNativeGeographicObjective, nativeGeographicSelectionReceipt, type NativeGeographicObjectiveSource } from './geographicObjectiveChoice';
import { MassHierarchy, massAddressBounds, type MassGeography } from './hierarchy';
import { NATIVE_FEATURE_LIMITS } from './nativeFeatures';
import { MassProcessions, type MassProcessionHost } from './processions';
import type { MassProcessionContext, MassProcessionRoadRow, NativeMassProcessionSource } from './processionTypes';
import { resolveMassProcessionContext } from './processionSources';
import { compileProcessionPlan, PROCESSION_PLAN_COMPILER, PROCESSION_ROUTE_POLICY, ProcessionRouteIndex,
  validateProcessionPlan, validateProcessionPlanSteps, type MassProcessionRoute, type ProcessionPlanInput,
  type ProcessionPreparation, type ProcessionReservations } from './processionPlan';
import { createProcessionPlanWarmQueue, ProcessionPlanWarmQueue } from './processionWarm';
import { canonical, freezeData, massDigest, streamSeed } from './random';
import type { WorldMassRuntime } from './runtime';

const ACCESS = 'procession-access', OBJECTIVE = 'objective:procession', CACHE_LIMIT = 64;
const clone = <T>(v: T): T => JSON.parse(canonical(v)) as T;
export interface PlannedProcession {
  owner: Readonly<MassGeography>; context: Readonly<MassProcessionContext>; input: Readonly<ProcessionPlanInput>;
  preparation: Readonly<ProcessionPreparation>; route: Readonly<MassProcessionRoute>;
  entry: MassAddress; destination: MassAddress; points: readonly MassAddress[]; chestPosition: MassAddress | null;
}
export interface ProcessionRoadPolicy { version: 1; source: 'engine/levelgen/layTraveledWay'; seed: number; frame: MassAddress; kind: 'road'; overgrowth: 0; band: [number, number]; step: 30 }
interface SavedAccess { version: 1; input: ProcessionPlanInput; preparation: ProcessionPreparation; road: MassProcessionRoadRow[]; roadPolicy: ProcessionRoadPolicy; chestPosition: MassAddress | null }
/** Native overgrowth0 wayRoller makes exactly one radius draw per chained disc.
 * Re-emission audits native output; it never replaces actual native production. */
export function validateProcessionRoad(route: Readonly<MassProcessionRoute>, rows: readonly MassProcessionRoadRow[], policy: ProcessionRoadPolicy, seed: number, span: number): void {
  if (!policy || policy.version !== 1 || policy.source !== 'engine/levelgen/layTraveledWay' || policy.kind !== 'road' || policy.overgrowth !== 0
    || policy.step !== 30 || canonical(policy.band) !== canonical([16, 22]) || policy.seed !== streamSeed(seed, [route.owner, 'native-procession-road'])
    || canonical(policy.frame) !== canonical(address(policy.frame.dimension, policy.frame.cx, policy.frame.cy, policy.frame.x, policy.frame.y, span))
    || policy.frame.dimension !== route.center.dimension || !Array.isArray(rows) || rows.length > 4096) throw Error('Invalid saved procession road policy');
  const points = route.points.map(at => localOffset(at, policy.frame, span)), rng = new Rng(policy.seed), expected: MassProcessionRoadRow[] = [];
  for (let k = 0; k < points.length - 1; k++) {
    const a = points[k], b = points[k + 1], count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / policy.step));
    for (let t = 0; t <= count; t++) expected.push({ at: moveAddress(policy.frame, { x: a.x + (b.x - a.x) * (t / count), y: a.y + (b.y - a.y) * (t / count) }, span),
      doodad: { radius: rng.range(policy.band[0], policy.band[1]), kind: policy.kind } });
  }
  if (canonical(rows) !== canonical(expected)) throw Error('Saved procession road left its certified native emission');
}
interface PlannedEntry { plan: Readonly<PlannedProcession>; index: ProcessionRouteIndex; refused?: SceneStamp }
interface SceneStamp { array: World['doodads']; length: number; doodads: number; terrain: number; native: number }
/** Surface binding for one real native moving objective per selected geographic
 * zone. Pure preparation is separate from frozen birth, cold physics proof and
 * native scene installation; pending work never reserves or clears terrain. */
export class MassProcessionGameplay {
  readonly processions: MassProcessions;
  readonly warm: ProcessionPlanWarmQueue;
  private readonly sources: readonly Readonly<NativeMassProcessionSource>[];
  private readonly born = new Map<string, PlannedEntry>();
  private readonly plans = new Map<string, PlannedEntry | null>();
  private readonly negativeInputs = new Map<string, Readonly<ProcessionPlanInput>>();
  private validation: { input: Readonly<ProcessionPlanInput>; preparation: Readonly<ProcessionPreparation>; steps: Generator<void, void, unknown> } | null = null;
  private cold: { entry: PlannedEntry; steps: Generator<void, boolean, unknown>; stamp: SceneStamp } | null = null;
  private lastWorld: World | null = null; private nextPrepare = 0; private nextSync = -Infinity;
  private prepareFrom?: MassAddress; private disposed = false;
  private counters = { synchronous: 0, prepared: 0, refused: 0, stale: 0, late: 0, validationSteps: 0, maxValidationSliceMs: 0,
    coldSteps: 0, maxColdSliceMs: 0, maxSingleColdStepMs: 0, maxBirthMs: 0, coldRestarts: 0, coldRefusals: 0, admitted: 0, sourceNegatives: 0 };
  constructor(readonly mass: WorldMassRuntime, readonly hierarchy: MassHierarchy, sources: readonly Readonly<NativeMassProcessionSource>[],
    private readonly selectionFor: (owner: Readonly<MassGeography>) => readonly NativeGeographicObjectiveSource[],
    warm?: ProcessionPlanWarmQueue) {
    this.sources = freezeData(clone(sources));
    this.processions = new MassProcessions(hierarchy);
    for (const row of hierarchy.controllers()) {
      const access = row.controllers.find(c => c.id === ACCESS), objective = row.controllers.find(c => c.id === OBJECTIVE);
      if (objective && !access) throw Error('Native procession lost its frozen access proof');
      if (access && !objective) throw Error('Orphan procession access has no admitted native owner');
      if (!access) continue;
      if (access.source !== PROCESSION_PLAN_COMPILER || access.phase !== 'waiting' || access.state !== null || access.clock !== 0
        || access.revision !== 0 || access.receipts.length) throw Error('Invalid saved procession access authority');
      const saved = this.readSaved(row.owner, access.definition), entry = this.entry(saved.input, saved.preparation, saved.chestPosition);
      if (!entry) throw Error('Saved procession route was refused');
      if (objective) {
        const d = this.processions.definition(row.owner.id)!;
        if (canonical(d.context) !== canonical(entry.plan.context) || canonical(d.route) !== canonical(entry.plan.route)
          || canonical(d.road) !== canonical(saved.road) || canonical(d.reward.position) !== canonical(saved.chestPosition)) throw Error('Native procession access differs from its born controller');
      }
      this.born.set(row.owner.id, entry);
    }
    // Reject corrupt saves before allocating a browser worker.
    this.warm = warm ?? (sources.length ? createProcessionPlanWarmQueue() : new ProcessionPlanWarmQueue(null));
  }
  private local(at: MassAddress): Vec2 { return localOffset(at, { ...this.mass.origin, x: 0, y: 0 }, this.mass.config.terrain.addressSpan); }
  private nearby(at: MassAddress): Vec2 | undefined { try { return this.local(at); } catch (e) { if (e instanceof RangeError || at.dimension !== this.mass.origin.dimension) return; throw e; } }
  private readSaved(owner: Readonly<MassGeography>, raw: unknown): SavedAccess {
    const saved = raw as SavedAccess;
    if (!saved || saved.version !== 1 || !saved.input || !saved.preparation?.plan || !Array.isArray(saved.road) || saved.road.length > 4096
      || canonical(saved.input.owner) !== canonical(owner) || canonical(saved.input.run) !== canonical(this.mass.generator.run)
      || canonical(saved.input.terrain) !== canonical(this.mass.generator.spec)) throw Error('Invalid saved procession access');
    validateProcessionPlan(saved.input, saved.preparation, this.mass.generator);
    validateProcessionRoad(saved.preparation.plan!, saved.road, saved.roadPolicy, saved.input.run.seed, this.mass.config.terrain.addressSpan);
    const expected = this.chestPosition(owner, saved.input.context, saved.preparation.plan);
    if (canonical(expected) !== canonical(saved.chestPosition)) throw Error('Saved procession chest approach changed');
    return freezeData(clone(saved));
  }
  private entry(input: Readonly<ProcessionPlanInput>, preparation: Readonly<ProcessionPreparation>, chest?: MassAddress | null): PlannedEntry | null {
    const route = preparation.plan; if (!route) return null;
    const plan = freezeData(clone({ owner: input.owner, context: input.context, input, preparation, route,
      entry: route.entry, destination: route.destination, points: route.points,
      chestPosition: chest === undefined ? this.chestPosition(input.owner, input.context, route) : chest }));
    return { plan, index: new ProcessionRouteIndex(plan.route, this.mass.config.terrain.addressSpan) };
  }
  private chestPosition(owner: Readonly<MassGeography>, context: Readonly<MassProcessionContext>, route: Readonly<MassProcessionRoute>): MassAddress | null {
    if (!this.processions.chestWanted(owner, context)) return null;
    const span = this.mass.config.terrain.addressSpan, d = localOffset(route.destination, route.points.at(-2)!, span), length = Math.hypot(d.x, d.y);
    // 90px perpendicular +36px stand/body fits the certified128px terminal apron.
    return moveAddress(route.destination, { x: -d.y / length * 90, y: d.x / length * 90 }, span);
  }
  private cache(owner: Readonly<MassGeography>, value: PlannedEntry | null, input?: Readonly<ProcessionPlanInput>): PlannedEntry | null {
    this.plans.delete(owner.id); this.plans.set(owner.id, value);
    this.negativeInputs.delete(owner.id); if (!value && input) this.negativeInputs.set(owner.id, input);
    if (this.plans.size > CACHE_LIMIT) { const oldest = this.plans.keys().next().value!; this.plans.delete(oldest); this.negativeInputs.delete(oldest); } return value;
  }
  private request(owner: Readonly<MassGeography>): Readonly<ProcessionPlanInput> | null {
    if (this.born.has(owner.id) || this.hierarchy.status(owner.id, 'objective-access') || this.hierarchy.status(owner.id, 'objective-access-legacy')) return null;
    const selection = this.selectionFor(owner), selected = chooseNativeGeographicObjective(this.hierarchy.seed, owner.id, selection);
    if (!selected || selected.objective.kind !== 'procession' || !owner.native) return null;
    const source = this.sources.find(s => s.id === selected.id && canonical(s) === canonical(selected)); if (!source) return null;
    const center = this.nearby(owner.center), zone = { ...owner.native.zone, id: owner.id }, context = resolveMassProcessionContext(zone, source, center ? this.mass.levelAt(center) : this.mass.config.progression?.maxLevel ?? zone.level);
    const span = this.mass.config.terrain.addressSpan, extent = owner.span / 2 + 256;
    const circles: { x: number; y: number; radius: number }[] = [], boxes: ProcessionReservations['boxes'][number][] = [], capsules: ProcessionReservations['capsules'][number][] = [];
    if (center) {
      // Snapshot already mounted native/ecology movement bodies. Future scenery
      // consults born corridor reservations; no pending plan clears geometry.
      const scene = this.lastWorld?.massProcessionObstacles(center, extent);
      if (scene === null) return null;
      if (scene) { circles.push(...scene.circles); boxes.push(...scene.boxes); }
      const town = this.mass.settlement;
      if (town) boxes.push({ minX: -center.x, minY: -center.y, maxX: town.zone.size.w - center.x, maxY: town.zone.size.h - center.y, padding: town.spec.apron + town.spec.blend });
      for (const place of this.mass.journey?.places ?? []) { const q = this.mass.journey!.local(place); circles.push({ x: q.x - center.x, y: q.y - center.y, radius: place.radius + 60 }); }
      for (const place of this.mass.roadside?.places ?? []) { const q = this.mass.roadside!.local(place); circles.push({ x: q.x - center.x, y: q.y - center.y, radius: place.radius }); }
      for (const trail of this.mass.journey?.trails ?? []) for (let i = 1; i < trail.points.length; i++) {
        const a = { x: trail.points[i - 1].x - center.x, y: trail.points[i - 1].y - center.y }, b = { x: trail.points[i].x - center.x, y: trail.points[i].y - center.y }, radius = this.mass.journey!.spec.width / 2 + 30;
        if (Math.min(a.x, b.x) > extent + radius || Math.max(a.x, b.x) < -extent - radius || Math.min(a.y, b.y) > extent + radius || Math.max(a.y, b.y) < -extent - radius) continue;
        capsules.push({ a, b, radius });
      }
    }
    // Durable born native features always precede new routes. This read uses the
    // bounded born index only, never nativeCountry's recursive provider.
    const native = new Map<string, ReturnType<NonNullable<typeof this.mass.nativeFeatures>['bornNear']>[number]>();
    for (const dx of [-1350, 1350]) for (const dy of [-1350, 1350]) for (const row of this.mass.nativeFeatures?.bornNear(moveAddress(owner.center, { x: dx, y: dy }, span), 1350) ?? []) native.set(row.id, row);
    for (const row of native.values()) {
      const q = localOffset(row.origin, owner.center, span, 64), size = row.request.size ?? { w: NATIVE_FEATURE_LIMITS.maxSize, h: NATIVE_FEATURE_LIMITS.maxSize };
      boxes.push({ minX: q.x, minY: q.y, maxX: q.x + size.w, maxY: q.y + size.h, padding: 60 });
    }
    const lo = owner.origin, hi = moveAddress(lo, { x: owner.span - 1, y: owner.span - 1 }, span), cells: MassCell[] = [];
    for (let y = BigInt(lo.cy); y <= BigInt(hi.cy); y++) for (let x = BigInt(lo.cx); x <= BigInt(hi.cx); x++) cells.push({ dimension: owner.dimension, cx: x.toString(), cy: y.toString() });
    const patches = this.mass.state.patchesInCells(cells), terrain = this.mass.generator.spec;
    if (patches.length > PROCESSION_ROUTE_POLICY.maxPatches) return null;
    const regions: ProcessionPlanInput['regions'] = Object.fromEntries([...new Set([...massTerrainRegions(terrain), ...patches.map(p => p.region)])].map(id => {
      const r = regionKind(id); return [id, { walkable: !!r?.walkable, dry: !!r?.walkable && !r.standStatusDeep && !['water', 'lava', 'chasm', 'bog', 'swamp'].includes(id), standStatusDeep: !!r?.standStatusDeep }];
    }));
    const geometry = { circles: circles.filter(c => Math.abs(c.x) <= extent + c.radius && Math.abs(c.y) <= extent + c.radius),
      boxes: boxes.filter(b => b.minX - b.padding <= extent && b.maxX + b.padding >= -extent && b.minY - b.padding <= extent && b.maxY + b.padding >= -extent), capsules };
    if (geometry.circles.length + geometry.boxes.length + geometry.capsules.length > PROCESSION_ROUTE_POLICY.maxReservations) return null;
    const reservations = { ...geometry, revision: massDigest(geometry) };
    return massCompileInput({ compiler: PROCESSION_PLAN_COMPILER, policy: PROCESSION_ROUTE_POLICY, run: this.mass.generator.run, terrain,
      owner, context, selection, selectionReceipt: nativeGeographicSelectionReceipt(this.hierarchy.seed, owner.id, selection), regions, patches, reservations });
  }
  preparationInput(at: MassAddress): Readonly<ProcessionPlanInput> | null { return this.request(this.hierarchy.at(at).zone); }
  private current(input: Readonly<ProcessionPlanInput>): boolean {
    if (this.born.has(input.owner.id) || this.processions.has(input.owner.id)) { this.counters.late++; return false; }
    const expected = this.request(this.hierarchy.at(input.owner.center).zone);
    if (!expected || canonical(expected) !== canonical(input)) { this.counters.stale++; return false; } return true;
  }
  private advancePreparation(): void {
    this.warm.advance();
    const start = performance.now();
    try {
      if (!this.validation) { const ready = this.warm.takeReady(); if (ready && this.current(ready.input)) this.validation = { ...ready, steps: validateProcessionPlanSteps(ready.input, ready.preparation, this.mass.generator) }; }
      const pending = this.validation; if (!pending) return;
      for (let steps = 0; steps < 64; steps++) {
        const next = pending.steps.next(); this.counters.validationSteps++;
        if (next.done) {
          if (this.current(pending.input)) { this.cache(pending.input.owner, this.entry(pending.input, pending.preparation), pending.input); this.counters.prepared++; if (!pending.preparation.plan) this.counters.refused++; }
          this.validation = null; break;
        }
        if (performance.now() - start >= 2) break;
      }
    } catch (e) { this.validation = null; this.warm.fail(String(e instanceof Error ? e.message : e)); }
    finally { this.counters.maxValidationSliceMs = Math.max(this.counters.maxValidationSliceMs, performance.now() - start); }
  }
  prepare(at: MassAddress, now: number, otherFoci: readonly MassAddress[] = []): void {
    if (this.disposed || !this.sources.length) return; if (!Number.isFinite(now) || now < 0) throw Error('Invalid procession preparation clock');
    this.advancePreparation(); if (now < this.nextPrepare || this.warm.stats.disposed) return; this.nextPrepare = now + .5;
    let delta = { x: 0, y: 0 }; if (this.prepareFrom) try { delta = localOffset(at, this.prepareFrom, this.mass.config.terrain.addressSpan, 64); } catch { /* dimension/jump: prepare around new location */ }
    this.prepareFrom = { ...at }; const length = Math.hypot(delta.x, delta.y), zoneSpan = this.hierarchy.span('zone'), span = this.mass.config.terrain.addressSpan;
    const ahead = moveAddress(at, { x: length > 1 ? delta.x / length * zoneSpan : 0, y: length > 1 ? delta.y / length * zoneSpan : 0 }, span), middle = this.hierarchy.at(ahead).zone;
    const lower = moveAddress(middle.origin, { x: -zoneSpan * 2, y: -zoneSpan * 2 }, span), owners = [...this.hierarchy.intersections('zone', massAddressBounds(lower, zoneSpan * 5, zoneSpan * 5, span))];
    owners.sort((a, b) => { const aa = localOffset(a.center, ahead, span, 64), bb = localOffset(b.center, ahead, span, 64); return aa.x * aa.x + aa.y * aa.y - bb.x * bb.x - bb.y * bb.y || a.id.localeCompare(b.id); });
    const focusOwners=massFocusRoundRobin([owners,...otherFoci.map(f=>{
      const middle=this.hierarchy.at(f).zone,lower=moveAddress(middle.origin,{x:-zoneSpan*2,y:-zoneSpan*2},span);
      return [...this.hierarchy.intersections('zone',massAddressBounds(lower,zoneSpan*5,zoneSpan*5,span))]
        .sort((a,b)=>{const aa=localOffset(a.center,f,span,64),bb=localOffset(b.center,f,span,64);return aa.x*aa.x+aa.y*aa.y-bb.x*bb.x-bb.y*bb.y||a.id.localeCompare(b.id);});
    })],o=>o.id);
    const requests: Readonly<ProcessionPlanInput>[] = [];
    for (const owner of focusOwners) {
      if (this.born.has(owner.id) || this.validation?.input.owner.id === owner.id) continue;
      if (this.plans.get(owner.id)) continue;
      const input = this.request(owner), negative = this.negativeInputs.get(owner.id);
      if (input && negative && canonical(input) === canonical(negative)) continue;
      if (input) { this.plans.delete(owner.id); this.negativeInputs.delete(owner.id); requests.push(input); }
      else { this.cache(owner, null); this.counters.sourceNegatives++; }
    }
    this.warm.offer(requests.slice(0,64));
  }
  /** Explicit tooling only. Pure geometry is cached but grants no live proof,
   * cart, road, reservation, discovery, reward or scene mutation. */
  plannedAt(at: MassAddress): Readonly<PlannedProcession> | null {
    const owner = this.hierarchy.at(at).zone, born = this.born.get(owner.id); if (born) return born.plan;
    const input = this.request(owner); if (!input) { this.cache(owner, null); return null; }
    const old = this.plans.get(owner.id), prior = old?.plan.input ?? this.negativeInputs.get(owner.id);
    if (prior && canonical(prior) === canonical(input)) return old?.plan ?? null;
    this.counters.synchronous++; return this.cache(owner, this.entry(input, compileProcessionPlan(input, this.mass.generator)), input)?.plan ?? null;
  }
  reserves(at: MassAddress, radius: number): boolean {
    if (!Number.isFinite(radius) || radius < 0 || radius > 6000) throw Error('Invalid procession reserve radius');
    if (at.dimension !== this.mass.origin.dimension) return false;
    const span = this.mass.config.terrain.addressSpan, pad = Math.ceil(radius + 128), lower = moveAddress(at, { x: -pad, y: -pad }, span);
    for (const owner of this.hierarchy.intersections('zone', massAddressBounds(lower, pad * 2 + 1, pad * 2 + 1, span))) if (this.born.get(owner.id)?.index.intersects(at, radius)) return true;
    return false;
  }
  private host(world: World): MassProcessionHost {
    this.lastWorld = world;
    return { world, get now() { return world.time; }, local: at => this.local(at), address: at => this.mass.walk.at(at.x, at.y),
      availablePopulation: (owner,at) => this.mass.availablePopulation(owner,at), createCart: request => world.createMassProcessionCart(request), createAmbush: request => world.createMassProcessionAmbush(request),
      reachable: (player, cart, reach) => world.massProcessionReachable(player, cart, reach), steering: (cart, target) => world.massProcessionSteering(cart, target),
      installRoad: (owner, rows) => world.installMassProcessionRoad(owner, rows, at => this.local(at)), installChest: (owner, chest) => world.installMassObjectiveChest(owner, chest),
      complete: (owner, zone) => world.completeMassObjective(owner, zone, ''), wreck: (owner, zone, at, seed, source) => world.massProcessionWreck(owner, zone, at, seed, source) };
  }
  private stamp(world: World): SceneStamp { return { array: world.doodads, length: world.doodads.length, doodads: world.doodadsVersion(), terrain: this.mass.state.terrainRevision, native: this.mass.nativeFeatures?.version ?? 0 }; }
  private sameStamp(a: SceneStamp, b: SceneStamp): boolean { return a.array === b.array && a.length === b.length && a.doodads === b.doodads && a.terrain === b.terrain && a.native === b.native; }
  private *checkScene(entry: PlannedEntry, world: World): Generator<void, boolean, unknown> {
    const { route, chestPosition } = entry.plan, span = this.mass.config.terrain.addressSpan;
    const clear = (at: MassAddress, radius: number): boolean => {
      const q = this.nearby(at); if (!q || this.mass.nativeFeatures?.intersects(at, radius)) return false;
      if (!world.massProcessionStandClear(q, radius) || world.pointInSolid(q.x, q.y, radius)) return false;
      return discTerrainClear(q, radius, this.mass.walk.cellSize, p => {
        const id = this.mass.walk.regionAt(p.x, p.y), r = regionKind(id); return !!r?.walkable && !r.standStatusDeep && !['water', 'lava', 'chasm', 'bog', 'swamp'].includes(id);
      });
    };
    for (const at of [route.entry, route.destination]) { yield; if (!clear(at, route.apronRadius)) return false; }
    if (chestPosition) { yield; if (!clear(chestPosition, 36)) return false; }
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], d = localOffset(route.points[i], a, span), distance = Math.hypot(d.x, d.y), count = Math.ceil(distance / 15), step = distance / count;
      // Nearest sample is <=step/2 along the segment. Expanded discs cover the
      // entire60px swept capsule, including diagonal between-sample shoulders.
      const radius = Math.hypot(route.corridorRadius, step / 2);
      for (let n = 0; n <= count; n++) { yield; if (!clear(moveAddress(a, { x: d.x * n / count, y: d.y * n / count }, span), radius)) return false; }
    }
    return true;
  }
  private advanceCold(world: World): void {
    const pending = this.cold; if (!pending) return; const start = performance.now();
    try {
      if (this.born.has(pending.entry.plan.owner.id)) { this.cold = null; return; }
      if (!this.sameStamp(pending.stamp, this.stamp(world))) { pending.steps = this.checkScene(pending.entry, world); pending.stamp = this.stamp(world); this.counters.coldRestarts++; }
      for (let steps = 0; steps < 64; steps++) {
        const stepStarted = performance.now(), next = pending.steps.next(); this.counters.maxSingleColdStepMs = Math.max(this.counters.maxSingleColdStepMs, performance.now() - stepStarted); this.counters.coldSteps++;
        if (next.done) {
          if (!next.value) {
            this.counters.coldRefusals++;
            if (!this.current(pending.entry.plan.input)) { this.plans.delete(pending.entry.plan.owner.id); this.nextPrepare = 0; }
            else pending.entry.refused = this.stamp(world);
            this.cold = null; return;
          }
          if (!this.sameStamp(pending.stamp, this.stamp(world))) { pending.steps = this.checkScene(pending.entry, world); pending.stamp = this.stamp(world); this.counters.coldRestarts++; return; }
          const plan = pending.entry.plan;
          if (!this.current(plan.input)) { this.plans.delete(plan.owner.id); this.cold = null; this.nextPrepare = 0; return; }
          const near = this.nearby(plan.entry); if (!near || this.mass.focusDistance(world,near) > this.mass.config.pageRadius * this.mass.config.terrain.addressSpan - 160) { this.cold = null; return; }
          const host = this.host(world); if (this.mass.availablePopulation(plan.owner.id,near) < 1 + plan.context.config.puffCap || this.processions.residentCount >= this.processions.focusLimit) { this.cold = null; return; }
          const birthStarted = performance.now(), roadPolicy: ProcessionRoadPolicy = { version: 1, source: 'engine/levelgen/layTraveledWay',
            seed: streamSeed(this.hierarchy.seed, [plan.owner.id, 'native-procession-road']), frame: this.mass.walk.at(0, 0), kind: 'road', overgrowth: 0, band: [16, 22], step: 30 };
          const rows = world.createMassProcessionRoad(plan.owner.id, roadPolicy.seed, plan.route.points.map(at => this.local(at)), roadPolicy)
            .map(row => { const { pos, ...doodad } = row; return { at: this.mass.walk.at(pos.x, pos.y), doodad }; });
          validateProcessionRoad(plan.route, rows, roadPolicy, this.hierarchy.seed, this.mass.config.terrain.addressSpan);
          const saved: SavedAccess = clone({ version: 1, input: plan.input, preparation: plan.preparation, road: rows, roadPolicy, chestPosition: plan.chestPosition });
          if (this.processions.admit(plan.owner, plan.context, plan.route, host, plan.chestPosition ?? undefined, saved.road)) {
            this.hierarchy.enroll(plan.owner, ACCESS, PROCESSION_PLAN_COMPILER, saved, null, world.time); this.born.set(plan.owner.id, pending.entry); this.counters.admitted++;
          }
          this.counters.maxBirthMs = Math.max(this.counters.maxBirthMs, performance.now() - birthStarted); this.cold = null; return;
        }
        if (performance.now() - start >= 2) break;
      }
    } finally { this.counters.maxColdSliceMs = Math.max(this.counters.maxColdSliceMs, performance.now() - start); }
  }
  /** First call restores funded history before other optional population. */
  sync(world: World): void {
    if (this.disposed) return; this.lastWorld = world; if (world.time < this.nextSync) return; this.nextSync = world.time + .5;
    const span = this.mass.config.terrain.addressSpan;
    const owners = massFocusRoundRobin(this.mass.focusPoints(world).map(f=>{
      const at=this.mass.walk.at(f.pos.x,f.pos.y),lower=moveAddress(at,{x:-2400,y:-2400},span);
      return this.hierarchy.intersections('zone',massAddressBounds(lower,4800,4800,span));
    }),o=>o.id), host = this.host(world);
    this.processions.sync(owners, host);
    for (const owner of owners) {
      if (this.processions.has(owner.id)) continue;
      const born = this.born.get(owner.id); if (born) {
        const saved = this.hierarchy.controller(owner.id, ACCESS)!.definition as SavedAccess;
        this.processions.admit(owner, born.plan.context, born.plan.route, host, born.plan.chestPosition ?? undefined, saved.road); continue;
      }
      const entry = this.plans.get(owner.id); if (!entry || this.cold || this.mass.availablePopulation(owner.id,this.local(entry.plan.entry)) < 1 + entry.plan.context.config.puffCap) continue;
      if (!this.current(entry.plan.input)) { this.plans.delete(owner.id); this.nextPrepare = 0; continue; }
      if (entry.refused && this.sameStamp(entry.refused, this.stamp(world))) continue;
      entry.refused = undefined;
      const q = this.nearby(entry.plan.entry); if (!q || this.mass.focusDistance(world,q) > this.mass.config.pageRadius * span - 160) continue;
      this.cold = { entry, steps: this.checkScene(entry, world), stamp: this.stamp(world) };
    }
  }
  update(world: World, dt: number): void { if (this.disposed) return; this.lastWorld = world; this.advanceCold(world); this.processions.update(dt, this.host(world)); }
  capture(): void { if (this.lastWorld) this.processions.capture(this.host(this.lastWorld)); }
  snapshot() { this.capture(); return this.hierarchy.snapshot(); }
  get population(): number { return this.processions.population; }
  massPopulationSlots(){return this.processions.massPopulationSlots();}
  massReservationSlots(exceptOwner?:string){return this.processions.massReservationSlots(at=>this.local(at),exceptOwner);}
  reservedPopulation(exceptOwner?: string): number { return this.processions.reservedPopulation(exceptOwner); }
  get warmStats() { return { ...this.counters, queue: this.warm.stats, validating: this.validation?.input.owner.id ?? null, checking: this.cold?.entry.plan.owner.id ?? null, cached: this.plans.size, born: this.born.size, disposed: this.disposed }; }
  dispose(): void { if (this.disposed) return; this.disposed = true; this.warm.dispose(); this.validation = null; this.cold = null; this.plans.clear(); this.negativeInputs.clear(); }
}
