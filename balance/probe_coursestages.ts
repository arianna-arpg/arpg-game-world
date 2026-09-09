import assert from 'node:assert/strict';
import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import { courseStageAt, validateCourseStages, RIVER_JOURNEY_STAGES } from '../src/world/courseStages';
import { courseMintHints, coursePolyline, registerCourseTracer, type CourseSpec, type CourseMintHints } from '../src/world/courses';
import { SURFACE_RIVERS } from '../src/world/relief';
import { placeZoneAt, type ZoneSpec } from '../src/engine/worldgen';
import { generateLayout } from '../src/engine/levelgen';
import { GridWalkField } from '../src/world/gridWalk';
import { TILESETS } from '../src/data/tilesets';
import type { ZoneDef } from '../src/data/zones';
import '../src/data/clusters';
import '../src/data/formations';
import '../src/engine/landmarkBuilders';
import '../src/data/landmarks';
import '../src/engine/layoutRecipes';
import '../src/data/compositions';

const stages = RIVER_JOURNEY_STAGES;
assert.equal(courseStageAt(stages, 0)?.id, 'headwaters');
assert.equal(courseStageAt(stages, 0.3)?.id, 'constricted');
assert.equal(courseStageAt(stages, 0.7)?.id, 'lower_reaches');
assert.equal(courseStageAt(stages, 1)?.id, 'lower_reaches');
assert.equal(courseStageAt(stages, NaN), undefined);
assert.equal(courseStageAt(stages, -0.1), undefined);
assert.equal(courseStageAt(stages, 1.1), undefined);
assert.equal(courseStageAt([{ id: 'island', span: [0.3, 0.7] }], 0.1), undefined);
assert.deepEqual(validateCourseStages(stages), []);
assert.deepEqual(validateCourseStages([...stages].reverse()), []);
assert.ok(validateCourseStages([{ id: 'a', span: [0, 0.6] }, { id: 'b', span: [0.5, 1] }]).some(e => e.includes('overlaps')));
assert.ok(validateCourseStages([{ id: 'a', span: [0, 0.5] }, { id: 'a', span: [0.5, 1] }]).some(e => e.includes('duplicate')));
assert.ok(validateCourseStages([{ id: 'bad', span: [NaN, 1] }]).length);
assert.ok(validateCourseStages([{ id: 'bad', span: [1, 0] }]).length);
assert.ok(validateCourseStages([{ id: 'bad', span: [0, 1], forceLayout: 'missing',
  compositions: [{ composition: 'missing', chance: 2 }],
  landmarks: [{ landmark: 'missing', chance: -1, count: [2, 1] }],
  layoutParams: { riverSides: ['n', 's'], riverLiquid: 'missing' },
}], { layout: () => false, composition: () => false, landmark: () => false, liquid: () => false }).length >= 8);
console.log('PASS exact stage boundaries, gaps, unordered rows and invalid authoring');

registerCourseTracer('probe_straight_journey', (_spec, anchor) => [anchor, { x: anchor.x + 1000, y: anchor.y }]);
const base: CourseSpec = {
  id: 'probe_journey', biome: 'river', paints: false, anchor: 'gate',
  tracer: 'probe_straight_journey', forceLayout: 'riverland',
  length: 1000, halfWidth: 100, seedSalt: 7,
  label: 'Test river', layoutParams: { riverLiquid: 'water', freezeAt: 0.5 },
};
const anchor = { x: 0, y: 0 }, seed = 321;
const hints = (course: CourseSpec, t: number) => {
  const h = courseMintHints([course], anchor, { x: t * 1000, y: 0 }, seed);
  assert.ok(h); return h;
};
// Exact legacy shape: opting out consumes no draws and adds no metadata keys.
assert.deepEqual(hints(base, 0.5), {
  spec: base, continueSides: ['w', 'e'], terminus: false,
  layoutParams: { riverLiquid: 'water', freezeAt: 0.5, riverSides: ['w', 'e'] },
  centerPull: { x: 0, y: 0 }, hug: 44,
});
const staged: CourseSpec = { ...base, stages };
const forward = [0.15, 0.5, 0.85].map(t => hints(staged, t));
const reverse = [0.85, 0.5, 0.15].map(t => hints(staged, t)).reverse();
assert.deepEqual(forward, reverse);
assert.deepEqual(coursePolyline(base, anchor, seed), coursePolyline(staged, anchor, seed));
assert.equal(new Set(forward.map(h => h.journey!.instance)).size, 1);
for (let i = 0; i < stages.length; i++) {
  assert.equal(forward[i].journey!.stage, stages[i].id);
  assert.equal(forward[i].layoutParams.freezeAt, 0.5);
  assert.deepEqual(forward[i].layoutParams.riverWidth, stages[i].layoutParams!.riverWidth);
  assert.deepEqual(forward[i].continueSides, hints(base, [0.15, 0.5, 0.85][i]).continueSides);
}
assert.notEqual(courseMintHints([staged], { x: 2000, y: 0 }, { x: 2500, y: 0 }, seed)!.journey!.instance,
  forward[1].journey!.instance);
console.log('PASS legacy hint identity, geographic selection, discovery-order independence and route continuity');

const rewards: CourseSpec = { ...staged, stages: [{ id: 'last', span: [0.5, 1], forceLayout: 'winding',
  compositions: [{ composition: 'hermits_camp', chance: 1 }],
  landmarks: [{ landmark: 'lake', chance: 0.5 }],
}], terminus: { radius: 100, compositions: [{ composition: 'mummers_camp', chance: 1 }],
  landmarks: [{ landmark: 'lake', chance: 0.25 }] } };
const end = hints(rewards, 1);
assert.equal(end.forceLayout, 'winding');
assert.equal(end.compositions!.length, 2);
assert.equal(end.landmarks!.length, 2);
assert.deepEqual(hints(rewards, 0.6).compositions, rewards.stages![0].compositions);
assert.equal(hints(rewards, 0.1).journey!.stage, undefined);
console.log('PASS stage recipe pins, gap fallback and additive stage/terminus discoveries');

const home: ZoneDef = {
  id: 'journey_home', name: 'Home', level: 5, size: { w: 1800, h: 1400 },
  theme: TILESETS.meadow.theme, layout: [], objective: { kind: 'clear' },
  exits: [], map: { x: -500, y: 0 },
};
function mint(h: CourseMintHints | null, overrides: Partial<ZoneSpec> = {}): ZoneDef {
  const source = structuredClone(home);
  return placeZoneAt({ x: 500, y: 0 }, source, { [source.id]: source }, 77, {
    seed: 9831, tileset: 'meadow', fieldBiome: true, biomeFor: () => 'plains',
    courseFor: () => h, forceFrontiers: 0, noWeave: true, ...overrides,
  });
}
const minted = mint(forward[1]);
assert.deepEqual(minted.journey, forward[1].journey);
assert.equal(minted.layoutType, 'riverland');
assert.deepEqual(minted.layoutParams!.causeways, [1, 1]);
assert.equal(minted.layoutParams!.freezeAt, 0.5);
assert.equal(mint(end).layoutType, 'winding');
const overridden = mint(end, { layoutType: 'rooms', layoutParams: { causeways: [5, 5] } });
assert.equal(overridden.layoutType, 'rooms');
assert.deepEqual(overridden.layoutParams!.causeways, [5, 5]);
assert.equal(mint(hints(base, 0.5)).journey, undefined);
assert.equal(mint(null).journey, undefined);
const saved = JSON.parse(JSON.stringify(minted)) as ZoneDef;
assert.deepEqual(saved.journey, minted.journey);
assert.deepEqual(saved.layoutParams, minted.layoutParams);
const originalJourney = structuredClone(saved.journey);
saved.map.x += 900; // map settlement is not a new stage selection
assert.deepEqual(saved.journey, originalJourney);
console.log('PASS real world mint precedence, durable serialization and unstaged opt-out');

// Same seed, same palette, different places along the river. Verify actual
// discovery seats and surviving bridge geometry, beyond the authored knobs.
const discoveries: number[] = [];
const bridgeCounts: number[] = [];
for (const s of SURFACE_RIVERS.stages!) {
  const def: ZoneDef = {
    ...home, id: `stage_${s.id}`, seed: 427, size: { w: 2400, h: 1800 },
    layoutType: 'riverland', layoutParams: { ...SURFACE_RIVERS.layoutParams,
      ...s.layoutParams, riverSides: ['w', 'e'] },
  };
  const entry = vec(120, 900), exits = [vec(2280, 900), vec(1200, 120)];
  const out = generateLayout(def, def.size, new Rng(def.seed!), entry, exits);
  const replay = generateLayout(JSON.parse(JSON.stringify(def)), def.size, new Rng(def.seed!), entry, exits);
  assert.deepEqual(out.doodads, replay.doodads);
  assert.deepEqual(out.pois, replay.pois);
  assert.ok(out.walk instanceof GridWalkField);
  for (const target of [...exits, ...out.pois]) assert.ok(out.walk.reachable(entry, target));
  discoveries.push(out.pois.length);
  bridgeCounts.push(out.doodads.filter(d => d.kind === 'bridge').length);
}
assert.ok(discoveries[2] >= discoveries[0] + 2, discoveries.join(','));
assert.ok(bridgeCounts[0] > bridgeCounts[1], bridgeCounts.join(','));
console.log(`PASS realized stage differences and reachable discoveries (POIs ${discoveries}; bridge pieces ${bridgeCounts})`);

// The actual save writer/scrubber and host/client terrain message, not just
// a generic JSON round trip. An unstaged arrival must clear stale attribution.
const { makeSimWorld } = await import('../src/sim/arena');
const { serializeZone, applyZone } = await import('../src/net/snapshot');
const { sanitizeWorldZones } = await import('../src/meta/worldstate');
const host = makeSimWorld('warrior', 7103), client = makeSimWorld('warrior', 7103);
host.zoneMap[minted.id] = structuredClone(minted);
const state = JSON.parse(JSON.stringify(host.serializeWorldState()));
assert.deepEqual(state.zones.find((z: ZoneDef) => z.id === minted.id).journey, minted.journey);
assert.deepEqual(sanitizeWorldZones(state.zones, new Set())![minted.id].journey, minted.journey);
host.zone = { ...host.zone, journey: structuredClone(minted.journey) };
const packet = JSON.parse(JSON.stringify(serializeZone(host)));
applyZone(client, packet);
assert.deepEqual(client.zone.journey, minted.journey);
assert.notEqual(client.zone.journey, packet.journey);
delete host.zone.journey;
const plainPacket = serializeZone(host);
assert.ok(!('journey' in plainPacket));
applyZone(client, plainPacket);
assert.equal(client.zone.journey, undefined);
console.log('PASS real save writer/restore scrub, network adoption and clearing stale journey identity');
