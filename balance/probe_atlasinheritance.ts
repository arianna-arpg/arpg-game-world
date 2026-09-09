import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { placeZoneAt, type ZoneSpec } from '../src/engine/worldgen';
import { featuresAt, featuresInRect, foldFeatureHits, mapFeatureKind, registerMapFeature, setAtlasSeed, zoneFeatureHarvest } from '../src/world/atlas';
import { courseMintHints, registerCourseTracer, type CourseSpec } from '../src/world/courses';
import { RIVER_JOURNEY_STAGES } from '../src/world/courseStages';
import { zoneInfoFor } from '../src/world/zoneInfo';
import { serializeZone, applyZone } from '../src/net/snapshot';
import { sanitizeWorldZones } from '../src/meta/worldstate';
import type { ZoneDef } from '../src/data/zones';

const host = makeSimWorld('warrior', 0xa71a501);
const seed = host.sim.biomeField.fieldSeed, origin = host.zone.map;
const lode = featuresInRect({ x: origin.x - 5200, y: origin.y - 5200 },
  { x: origin.x + 5200, y: origin.y + 5200 }).find(f => f.kind === 'lode');
assert.ok(lode, 'the fixed world must contain a lode: this contract cannot skip');
const seat = { ...lode.seat }, original = structuredClone(mapFeatureKind('lode')!);
const mint = (extra: Partial<ZoneSpec> = {}): ZoneDef => placeZoneAt(seat, null, {}, 78001, {
  seed: 901, level: 5, tileset: 'meadow', biomeFor: () => 'plains', fieldBiome: true,
  forceFrontiers: 0, noBackEdge: true, noWeave: true, ...extra,
});
const def = mint(), context = structuredClone(def.geo!.atlas!);
assert.deepEqual(context.sample, seat);
assert.equal(context.seed, seed);
assert.deepEqual(context.features.map(f => f.id), featuresAt(seat).map(h => h.feature.id));
assert.deepEqual(context.features.map(f => f.id), def.geo!.features);
assert.equal(context.features.find(f => f.id === lode.id)!.name, lode.name);
assert.equal(context.features.find(f => f.id === lode.id)!.distance, 0);
assert.notEqual(def.geo!.atlas!.sample, seat);
assert.notEqual(def.geo!.atlas!.features.find(f => f.id === lode.id)!.seat, lode.seat);
assert.deepEqual(mint({ dimension: 'surface' }).geo, def.geo);
assert.equal(mint({ fieldBiome: false }).geo?.atlas, undefined);
assert.equal(mint({ dimension: 'hell' }).geo?.atlas, undefined);
console.log('PASS atlas marks and zone attribution share hits; surface aliases and directed/dimension exclusions');

// A controlled river crosses the real atlas feature. Exercise the combined
// mint path, including the player's explicit recipe override.
registerCourseTracer('qa_atlas_line', () => [{ x: seat.x - 500, y: seat.y }, { x: seat.x + 500, y: seat.y }]);
const course: CourseSpec = {
  id: 'qa_atlas_river', biome: 'river', paints: false, anchor: 'gate',
  tracer: 'qa_atlas_line', forceLayout: 'riverland', length: 1000,
  halfWidth: 100, seedSalt: 7, stages: RIVER_JOURNEY_STAGES,
};
const hints = courseMintHints([course], seat, seat, seed)!;
assert.ok(hints);
const river = mint({ courseFor: () => hints });
assert.equal(river.layoutType, 'riverland');
assert.equal(river.journey?.stage, 'constricted');
assert.deepEqual(river.layoutParams?.causeways, [1, 1]);
assert.deepEqual(river.layoutParams?.riverSides, hints.layoutParams?.riverSides);
assert.deepEqual(river.geo, def.geo);
assert.deepEqual(mint({ courseFor: () => hints, layoutParams: { causeways: [6, 6] } }).layoutParams?.causeways, [6, 6]);
console.log('PASS atlas inheritance composes with river stages, orientation and explicit recipe overrides');

host.zoneMap[def.id] = def;
const hasName = () => zoneInfoFor(host, def.id).some(r => r.label.toLowerCase().includes(lode.name.toLowerCase()));
host.visited.delete(def.id); host.surveyed.delete(def.id);
assert.equal(hasName(), false);
host.surveyed.add(def.id);
assert.equal(hasName(), true);
host.loadZone(def.id);
const harvestCount = () => host.doodads.filter(d => d.kind.startsWith('harvest_')).length;
const count = harvestCount(), bounty = structuredClone(zoneFeatureHarvest(def.geo));
assert.ok(count >= 2, `the lode actually loads harvest: ${count}`);
try {
  registerMapFeature({ ...original, names: { first: ['Changed'], second: ['Tomorrow'] },
    read: 'a future definition', inherit: { ...original.inherit, harvest: { bonus: [99, 99], always: true } } }, true);
  def.map.x += 900;
  assert.deepEqual(def.geo!.atlas, context);
  assert.deepEqual(zoneFeatureHarvest(def.geo), bounty);
  assert.equal(hasName(), true);
  host.loadZone(def.id);
  assert.equal(harvestCount(), count, 'actual reload uses the baked bounty after a registry edit');
  assert.deepEqual(mint().geo!.atlas!.harvest, { bonus: [99, 99], always: true });
  assert.equal(mint().geo!.atlas!.features.find(f => f.id === lode.id)!.name, 'the Changed Tomorrow');
  assert.deepEqual(zoneFeatureHarvest({ features: [lode.id] }), { bonus: [99, 99], always: true });
  assert.equal(zoneFeatureHarvest({ features: [lode.id], atlas: { ...context, harvest: null } }), null);
} finally { registerMapFeature(original, true); }
console.log('PASS known-zone labels and actual harvest survive registry edits and map settling; legacy fallback');

const mutable = featuresAt(seat).find(h => h.feature.id === lode.id)!;
const isolated = structuredClone(mutable);
isolated.def.inherit = { landmarks: [{ landmark: 'lake', chance: 1, count: [1, 2] }],
  layoutParams: { causeways: [1, 2] } };
const folded = foldFeatureHits([isolated]);
isolated.def.inherit.landmarks![0].count![0] = 99;
(isolated.def.inherit.layoutParams!.causeways as number[])[0] = 99;
assert.deepEqual(folded.landmarks[0].count, [1, 2]);
assert.deepEqual(folded.layoutParams.causeways, [1, 2]);

const state = JSON.parse(JSON.stringify(host.serializeWorldState()));
assert.deepEqual(state.zones.find((z: ZoneDef) => z.id === def.id).geo, def.geo);
assert.deepEqual(sanitizeWorldZones(state.zones, new Set())![def.id].geo, def.geo);
const client = makeSimWorld('warrior', 1234), packet = serializeZone(host);
assert.deepEqual(packet.geo, def.geo);
assert.notEqual(packet.geo, def.geo);
assert.notEqual(packet.geo!.atlas!.features[0].seat, def.geo!.atlas!.features[0].seat);
applyZone(client, packet);
assert.deepEqual(client.zone.geo, def.geo);
assert.notEqual(client.zone.geo, packet.geo);
const received = structuredClone(client.zone.geo);
packet.geo!.atlas!.features[0].seat.x += 100;
assert.deepEqual(client.zone.geo, received);
delete packet.geo;
applyZone(client, packet);
assert.equal(client.zone.geo, undefined);
host.zone = { ...host.zone };
delete host.zone.geo;
assert.ok(!('geo' in serializeZone(host)));
setAtlasSeed(null);
assert.equal(mint().geo?.atlas, undefined);
console.log('PASS real save/restore and co-op retain geography, isolate nested records and clear stale context');
