import assert from 'node:assert/strict';
import '../src/worldmass/nativeBootstrap';
import { TILESETS } from '../src/data/tilesets';
import type { ZoneDef } from '../src/data/zones';
import { regionKind } from '../src/world/regions';
import { address, localOffset, moveAddress, type MassAddress } from '../src/worldmass/address';
import { makeMassRun, MassGenerator } from '../src/worldmass/generator';
import type { MassSpec } from '../src/worldmass/contracts';
import { MASS_HIERARCHY_DEFAULT, MassHierarchy } from '../src/worldmass/hierarchy';
import { nativeGeographicSelectionReceipt } from '../src/worldmass/geographicObjectiveChoice';
import { nativeMassProcessionSources, resolveMassProcessionContext } from '../src/worldmass/processionSources';
import { massAdventure } from '../src/worldmass/preset';
import { canonical, massDigest } from '../src/worldmass/random';
import { compileProcessionPlan, processionPlanIdentity, PROCESSION_PLAN_COMPILER, PROCESSION_ROUTE_POLICY,
  processionCapsuleIntersectsBox, ProcessionRouteIndex, validateProcessionPlan, validateProcessionRoute,
  type ProcessionPlanInput, type ProcessionPreparation, type MassProcessionRoute } from '../src/worldmass/processionPlan';

const clone = <T>(v: T): T => JSON.parse(canonical(v)) as T;
const source = nativeMassProcessionSources().find(s => s.tileset === 'grassland') ?? nativeMassProcessionSources()[0];
assert.ok(source, 'actual native open tileset procession exists');
function inputFor(spec?: MassSpec, at?: MassAddress): ProcessionPlanInput {
  const terrain: MassSpec = spec ?? { id: 'procession-route-fixture', version: 1, addressSpan: 960, terrainCell: 24,
    fields: [], surfaces: [{ id: 'dry', priority: 0, when: [], region: 'ground', color: '#445533', biome: 'grassland' }], places: [] };
  for (let seed = 1; seed < 200; seed++) {
    const run = makeMassRun(seed, 'procession-route-proof', terrain), hierarchy = new MassHierarchy(run.runId, seed, terrain.addressSpan, MASS_HIERARCHY_DEFAULT);
    const owner = hierarchy.at(at ?? address('surface', '-1', '-1', 60, 60, terrain.addressSpan)).zone;
    const selection = [clone(source)], selectionReceipt = nativeGeographicSelectionReceipt(seed, owner.id, selection);
    if (!selectionReceipt.selected) continue;
    const ts = TILESETS[source.tileset!];
    const zone: ZoneDef = { id: owner.id, name: ts.nameFirst[0] + ' ' + ts.nameSecond[0], level: 3, size: { w: owner.span, h: owner.span },
      objective: { kind: 'procession' }, theme: clone(ts.theme), biome: ts.biome, tileset: ts.id, exits: [], map: { x: 0, y: 0 }, layout: clone(ts.layout), packs: clone(ts.packs) };
    const regions: ProcessionPlanInput['regions'] = Object.fromEntries([...new Set(['ground', 'water', 'wall', 'lava', 'chasm', 'bog', 'swamp', ...terrain.surfaces.map(s => s.region), ...terrain.places.flatMap(p => p.surface ? [p.surface.region] : [])])]
      .map(id => { const r = regionKind(id); return [id, { walkable: !!r?.walkable, dry: !!r?.walkable && !r.standStatusDeep && !['water', 'lava', 'chasm', 'bog', 'swamp'].includes(id), standStatusDeep: !!r?.standStatusDeep }]; }));
    return { compiler: PROCESSION_PLAN_COMPILER, policy: PROCESSION_ROUTE_POLICY, run, terrain, owner,
      context: resolveMassProcessionContext(zone, source, zone.level), selection, selectionReceipt, regions, patches: [], reservations: { revision: 'fixture-0', circles: [], boxes: [], capsules: [] } };
  }
  throw Error('No native selection receipt');
}
const input = inputFor(), before = canonical(input), plain = compileProcessionPlan(input);
assert.ok(plain.plan, plain.refusal ?? 'expected dry route'); assert.equal(canonical(input), before, 'compiler leaves caller input untouched');
assert.equal(canonical(plain), canonical(compileProcessionPlan(input)), 'deterministic exact route, metrics and source');
validateProcessionPlan(input, plain); validateProcessionRoute(plain.plan, 960);
assert.ok(plain.plan.chunks.length >= 3); assert.ok(plain.plan.length >= 2700); assert.ok(Object.isFrozen(plain.plan.points[0]));
assert.equal(Reflect.set(plain.plan.points[0], 'x', 0), false); assert.equal(plain.plan.corridorRadius, 60); assert.equal(plain.plan.apronRadius, 128);
assert.ok(plain.plan.points.slice(1).every((p, i) => { const d = localOffset(p, plain.plan!.points[i], 960); return Math.hypot(d.x, d.y) <= (i === 0 ? 240 : 450); }));
// Independent continuous geometry bound for the actual native spawn envelope.
// Write connector P=(1-t)S+tB in coordinates aligned to AB, |S|<60.
// t<=1/4: |P|+18<=123<128. t>=3/10: dist(P,AB)+18<=60.
// In between, dist(P,AB)>42 implies |S_perp|>56, hence
// |S_parallel|<sqrt(60^2-56^2). Thus |P|+18<117<128. A
// negative projection lies closer to A than S; L<60 lies wholly in the apron.
const spawnBound = Math.hypot(26, 54), body = 18, firstLimit = PROCESSION_ROUTE_POLICY.maxFirstSegment;
assert.ok(spawnBound < 60); assert.equal(firstLimit, 240);
assert.ok(.75 * 60 + .25 * firstLimit + body < PROCESSION_ROUTE_POLICY.apronRadius);
assert.equal(.7 * 60 + body, PROCESSION_ROUTE_POLICY.corridorRadius);
const middleBound = Math.hypot(.3 * firstLimit + .75 * Math.sqrt(60 ** 2 - 56 ** 2), .75 * 60) + body;
assert.ok(middleBound < PROCESSION_ROUTE_POLICY.apronRadius);
const distanceToLeg = (z: {x:number;y:number}, end: {x:number;y:number}) => {
  const t = Math.max(0, Math.min(1, (z.x * end.x + z.y * end.y) / (end.x ** 2 + end.y ** 2)));
  return Math.hypot(z.x - t * end.x, z.y - t * end.y);
};
const oldEnd = {x:-360,y:240}, oldLength = Math.hypot(oldEnd.x,oldEnd.y), oldT=.2504;
const oldCenter = {x:(1-oldT)*26+oldT*oldEnd.x,y:(1-oldT)*54+oldT*oldEnd.y};
const oldBoundary = {x:oldCenter.x+body*oldEnd.y/oldLength,y:oldCenter.y-body*oldEnd.x/oldLength};
assert.ok(Math.hypot(oldBoundary.x,oldBoundary.y)>128 && distanceToLeg(oldBoundary,oldEnd)>60,
  'former legal432px first leg leaves a real cart-body point outside both proved regions');
const longFirst = clone(plain.plan) as MassProcessionRoute;
const leg = localOffset(longFirst.points[1],longFirst.points[0],960), scale=300/Math.hypot(leg.x,leg.y);
(longFirst.points as MassAddress[])[1]=moveAddress(longFirst.points[0],{x:leg.x*scale,y:leg.y*scale},960);
const {proofHash:_oldFirstHash,...firstBody}=longFirst;longFirst.proofHash=massDigest(firstBody);
assert.throws(()=>validateProcessionRoute(longFirst,960),/outside reach/,'coherently rehashed saved first leg cannot exceed240px');
console.log('PASS actual native jitter connector coverage, independent old-gap counterexample, explicit240px first-leg proof and saved rejection',JSON.stringify({spawnBound,middleBound,oldGap:Math.min(Math.hypot(oldBoundary.x,oldBoundary.y)-128,distanceToLeg(oldBoundary,oldEnd)-60)}));
console.log('PASS native-source seeded provider, >=3 chunks, bounded driver goals, exact repeatability, frozen output and input isolation', JSON.stringify({ source: source.id, route: plain.plan.length, points: plain.plan.points.length, metrics: plain.metrics }));

for (const region of ['water', 'wall', 'lava', 'chasm', 'bog', 'swamp']) {
  const wet = inputFor({ ...input.terrain, surfaces: [{ ...input.terrain.surfaces[0], region }] });
  const result = compileProcessionPlan(wet); assert.equal(result.plan, null, region + ' must refuse');
  assert.ok(result.metrics.expanded <= PROCESSION_ROUTE_POLICY.maxExpanded); assert.ok(result.metrics.samples <= PROCESSION_ROUTE_POLICY.maxTerrainSamples);
}
const ring = clone(input); ring.reservations = { revision: 'isolated-quadrants', circles: [], capsules: [], boxes: [
  { minX: -72, minY: -2700, maxX: 72, maxY: 2700, padding: 0 },
  { minX: -2700, minY: -72, maxX: 2700, maxY: 72, padding: 0 },
] };
const enclosed = compileProcessionPlan(ring); assert.equal(enclosed.plan, null, 'opposite endpoint aprons individually dry but separated by walls');
assert.ok(enclosed.metrics.expanded <= PROCESSION_ROUTE_POLICY.maxExpanded);
const a = localOffset(plain.plan.entry, input.owner.center, 960), b = localOffset(plain.plan.destination, input.owner.center, 960), horizontal = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
const detourInput = clone(input), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
const obstacle = horizontal ? { minX: mid.x - 120, maxX: mid.x + 120, minY: mid.y - 900, maxY: mid.y + 900, padding: 20 }
  : { minY: mid.y - 120, maxY: mid.y + 120, minX: mid.x - 900, maxX: mid.x + 900, padding: 20 };
detourInput.reservations = { revision: 'detour-body', circles: [], capsules: [], boxes: [obstacle] };
assert.ok(processionCapsuleIntersectsBox(a, b, 60, obstacle), 'a straight substitute would collide');
const detour = compileProcessionPlan(detourInput); assert.ok(detour.plan, detour.refusal ?? 'detour expected'); validateProcessionPlan(detourInput, detour);
const offsets = detour.plan.points.map(q => localOffset(q, detourInput.owner.center, 960));
assert.ok(offsets.slice(1).every((q, i) => !processionCapsuleIntersectsBox(offsets[i], q, 60, obstacle)), 'every complete route capsule bends around body');
assert.ok(detour.plan.length > Math.hypot(b.x - a.x, b.y - a.y) + 50, 'provider actually computes a longer physical detour');
assert.equal(processionCapsuleIntersectsBox({ x: 0, y: 0 }, { x: 60, y: 60 }, 18, { minX: 20, minY: 43, maxX: 21, maxY: 44, padding: 0 }), true, 'diagonal shoulder hits narrow corner missed by endpoint dots');
assert.equal(processionCapsuleIntersectsBox({ x: 0, y: 0 }, { x: 60, y: 60 }, 18, { minX: 20, minY: 55, maxX: 21, maxY: 56, padding: 0 }), false);
console.log('PASS wet/hazard and disconnected-wall refusals, actual detour and exact diagonal corner coverage', JSON.stringify({ wall: enclosed.refusal, expanded: enclosed.metrics.expanded, detourLength: detour.plan.length }));

function reheader(i: ProcessionPlanInput, result: Readonly<ProcessionPreparation>): ProcessionPreparation {
  const out = clone(result), identity = processionPlanIdentity(i); Object.assign(out, identity);
  const route = out.plan as MassProcessionRoute; Object.assign(route, identity, { id: canonical([route.run, route.owner, 'procession-route', identity.inputHash]) });
  const { proofHash: _old, ...body } = route; route.proofHash = massDigest(body); return out;
}
const segment = Math.floor(plain.plan.points.length / 2), aa = localOffset(plain.plan.points[segment - 1], input.owner.center, 960), bb = localOffset(plain.plan.points[segment], input.owner.center, 960);
const blocked = clone(input); blocked.reservations = { revision: 'changed-circle', circles: [{ x: (aa.x + bb.x) / 2, y: (aa.y + bb.y) / 2, radius: 1 }], boxes: [], capsules: [] };
assert.throws(() => validateProcessionPlan(blocked, plain), /Foreign/);
assert.throws(() => validateProcessionPlan(blocked, reheader(blocked, plain)), /Blocked/, 'coherent forged headers cannot smuggle a known blocked route');
const apron = clone(input); apron.reservations = { revision: 'terminal-body', circles: [{ x: a.x + 90, y: a.y + 90, radius: 1 }], boxes: [], capsules: [] };
assert.throws(() => validateProcessionPlan(apron, reheader(apron, plain)), /Blocked/, 'terminal corner is inside128 apron but outside60 corridor');
const changed = clone(input), location = moveAddress(input.owner.center, { x: (aa.x + bb.x) / 2, y: (aa.y + bb.y) / 2 }, 960), cell = input.terrain.terrainCell;
changed.patches = [{ address: { ...location, x: Math.floor(location.x / cell) * cell, y: Math.floor(location.y / cell) * cell }, region: 'water', color: '#112233', cause: 'player-water' }];
assert.throws(() => validateProcessionPlan(changed, reheader(changed, plain)), /Blocked/, 'frozen sparse player edits participate in every whole-cell proof');
validateProcessionRoute(plain.plan, 960); assert.equal(plain.plan.proofHash, clone(plain).plan!.proofHash, 'historical proof never rerolls from changed terrain');
const altered = clone(input); altered.selectionReceipt = { ...altered.selectionReceipt, selected: 'invented' }; assert.throws(() => compileProcessionPlan(altered), /selection/i);
const sealed = clone(input); sealed.context.zone.objective.seal = true; assert.throws(() => compileProcessionPlan(sealed), /source input/);
const index = new ProcessionRouteIndex(plain.plan, 960);
assert.ok(index.intersects(location, 0), 'mid-segment reservation, no dots-only holes');
assert.ok(index.intersects(moveAddress(input.owner.center, { x: a.x + 90, y: a.y + 90 }, 960), 0), 'full terminal staging reserved');
assert.equal(index.intersects(moveAddress(input.owner.center, { x: 7000, y: 0 }, 960), 0), false);
assert.equal(index.intersects(address('surface', '9007199254740993000', '0', 0, 0, 960), 0), false);
assert.equal(index.intersects({ ...location, dimension: 'cave' }, 0), false);
console.log('PASS stale and coherent bad-worker refusal, frozen terrain edits,128px apron corners, sealed/source refusal, complete capsule reservations, immutable history');

for (const at of [address('surface', '9007199254740993000', '-9007199254740993001', 120, 120, 960), address('surface', '-999999999999999', '-999999999999999', 0, 0, 960)]) {
  const distant = inputFor(undefined, at), r = compileProcessionPlan(distant); assert.ok(r.plan, r.refusal ?? 'distant route expected'); validateProcessionPlan(distant, r); assert.ok(r.plan.chunks.length >= 3);
}
const occupied = inputFor({ ...input.terrain, places: [{ id: 'native-site', version: 1, content: 'native-site', period: 1200, chance: 1, radius: 180, jitter: .1, when: [], priority: 1 }] });
const withSites = compileProcessionPlan(occupied); assert.ok(withSites.metrics.places > 0); assert.ok(withSites.plan, withSites.refusal ?? 'route around sites expected'); validateProcessionPlan(occupied, withSites);
console.log('PASS precise distant/negative addresses and native generated-site footprint detours', JSON.stringify({ places: withSites.metrics.places, route: withSites.plan.length }));

const spec = massAdventure().terrain, survey: unknown[] = []; let successes = 0;
for (const [x, y] of [[0, 0], [10800, 0], [-10800, 5400], [21600, 10800], [0, -21600], [-21600, -10800]]) {
  const request = inputFor(spec, address('surface', '0', '0', x + 2700, y + 2700, spec.addressSpan)), gen = new MassGenerator(request.run, request.terrain), started = performance.now();
  const result = compileProcessionPlan(request, gen); const ms = performance.now() - started;
  if (result.plan) { successes++; validateProcessionPlan(request, result, gen); }
  survey.push({ seed: request.run.seed, owner: [x / 5400, y / 5400], accepted: !!result.plan, reason: result.refusal, length: result.plan?.length, ms, metrics: result.metrics });
}
assert.ok(successes > 0, 'actual default country terrain yields real routes without replacement terrain');
console.log('PASS bounded actual default country terrain survey (source/selection synthetic owner fixture, final live native body sweep still host-owned)', JSON.stringify(survey));
