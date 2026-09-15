import assert from 'node:assert/strict';
import { makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { START_ZONE, type ZoneDef } from '../src/data/zones';
import { QUESTS } from '../src/quests/defs';
import type { QuestDef } from '../src/quests/types';
import { collectMarkers } from '../src/world/mapMarkers';
import { explorationMapBounds, mapViewport } from '../src/ui/mapViewport';
import { mapBearing, mapBearingsSvg } from '../src/ui/mapBearings';
import { connectFloatingZone } from '../src/engine/worldgen';
import { Rng } from '../src/core/rng';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';

seedGlobalRandom(0x917a);
const w = makeSimWorld('warrior', 0x917a);
w.loadZone(START_ZONE);
w.odyssey.update();
w.visited.delete(SIM_ARENA_ID);
const bounds = () => explorationMapBounds(Object.values(w.zoneMap), w.visited, w.surveyed, w.zone.map);
const before = bounds(), visited = [...w.visited], surveyed = [...w.surveyed];
const quest: QuestDef = { id: 'probe_far_geography', giver: 'quartermaster', offerLabel: 'Find the far camp',
  offerAtLevel: 1, zone: { name: 'Far camp', tileset: 'deepwood', direction: 'e', level: 60,
    bandPlacement: true, objective: { kind: 'clear', frac: .75 } }, reward: {} };
QUESTS[quest.id] = quest;
w.enrollOdysseyQuest(quest, true);
const target = w.zoneMap[`quest_${quest.id}`];
const roads = target.exits.map(e => w.zoneMap[e.to]).filter(Boolean);
assert(roads.length > 0);
for (const z of roads) {
  assert(Math.hypot(z.map.x - target.map.x, z.map.y - target.map.y) < 240, `long quest road to ${z.id}`);
  assert(!w.visited.has(z.id), 'far quest never attaches to walked ground');
}
assert(target.veiled && !w.visible(target));
assert.deepEqual([...w.visited], visited); assert.deepEqual([...w.surveyed], surveyed);
assert.deepEqual(bounds(), before, 'accepting a far quest cannot expand the map');
assert(collectMarkers(w).some(m => m.zoneId === target.id));
const hidden = w.activeQuests.find(q => q.directionsKnown === false)!;
assert(hidden && !collectMarkers(w).some(m => m.zoneId === hidden.zoneId));
w.learnQuestDirections(hidden.zoneId);
assert(collectMarkers(w).some(m => m.zoneId === hidden.zoneId));
assert.deepEqual(bounds(), before, 'a learned lead cannot expand the map');
console.log('PASS distant quest has local veiled roads; leads grant bearings, never exploration');

// Generated neighbours may be previewed, but even a deliberately bare event
// cannot move the camera. An explicit survey or footsteps can.
const far: ZoneDef = { ...target, id: 'probe_event', map: { x: 100000, y: 100000 }, veiled: false };
w.zoneMap[far.id] = far;
assert.deepEqual(bounds(), before);
w.surveyed.add(far.id); assert(bounds().w > before.w); w.surveyed.delete(far.id);
w.visited.add(far.id); assert(bounds().w > before.w); w.visited.delete(far.id);
delete w.zoneMap[far.id];
const surveyQuest = { ...quest, id: 'probe_survey_geography', zone: { ...quest.zone, level: 70, mapReveal: 'survey' as const } };
QUESTS[surveyQuest.id] = surveyQuest;
w.enrollOdysseyQuest(surveyQuest, true);
assert(w.surveyed.has(`quest_${surveyQuest.id}`)); assert(bounds().w > before.w || bounds().h > before.h);
console.log('PASS generation cannot enlarge the chart; explicit cartography and exploration can');

// A floating root with its own quest child must not connect back into itself,
// nor borrow a long road to the starting graph when its approach is absent.
const root: ZoneDef = { ...target, id: 'root', map: { x: 5000, y: 5000 }, floating: true,
  exits: [{ to: 'child', side: 'e' }] };
const child: ZoneDef = { ...target, id: 'child', floating: false, map: { x: 5080, y: 5000 }, exits: [{ to: 'root', side: 'w' }] };
const town: ZoneDef = { ...target, id: 'town', floating: false, map: { x: 0, y: 0 }, exits: [] };
const graph = { root, child, town } as Record<string, ZoneDef>;
connectFloatingZone(root, graph, new Rng(7), 150);
assert(root.floating); assert.equal(root.exits.length, 1);
graph.approach = { ...town, id: 'approach', map: { x: 4920, y: 5000 }, exits: [{ to: 'town', side: 'w' }] };
connectFloatingZone(root, graph, new Rng(7), 150);
assert(!root.floating); assert(root.exits.some(e => e.to === 'approach'));
assert(graph.approach.exits.some(e => e.to === 'root'));
root.floating = true;
const existingRoads = root.exits.length;
connectFloatingZone(root, graph, new Rng(7), 150, new Set(['approach']));
assert(!root.floating); assert.equal(root.exits.length, existingRoads);
console.log('PASS local clusters connect on approach without self-cycles, duplicate entrances or distant shortcuts');

const view = { cx: 0, cy: 0, side: 480 };
for (const [x, y] of [[1000, 0], [-1000, 0], [0, 1000], [0, -1000], [1000, 1000]]) {
  const edge = mapBearing({ x, y, unknown: true }, view, { x: 0, y: 0 })!;
  assert.equal(Math.max(Math.abs(edge.x), Math.abs(edge.y)), 216);
  assert.equal(Math.sign(edge.x), Math.sign(x)); assert.equal(Math.sign(edge.y), Math.sign(y));
}
assert.equal(mapBearing({ x: 20, y: 20, unknown: false }, view, { x: 0, y: 0 }), null);
assert(mapBearing({ x: 20, y: 20, unknown: true }, view, { x: 0, y: 0 }));
const marker = collectMarkers(w).find(m => m.zoneId === target.id)!;
const svg = mapBearingsSvg([{ marker, x: 1000, y: 0, unknown: true }, { marker, x: 1100, y: 0, unknown: true }], view, { x: 0, y: 0 });
assert(svg.includes('2 objectives')); assert.equal((svg.match(/<path/g) ?? []).length, 1);
const zoomed = mapViewport({ minX: -1000, minY: -1000, w: 2000, h: 2000 }, .5, { x: 100, y: 100 });
const moved = mapBearing({ x: 10000, y: -10000, unknown: true }, zoomed, { x: 0, y: 0 })!;
assert(Math.abs(moved.x - zoomed.cx) <= zoomed.side * .451);
console.log('PASS cardinal/diagonal bearings, hidden positions, grouped badges and pan/zoom geometry');

const saved = JSON.parse(JSON.stringify(serializeCharacter(w)));
const resumed = makeSimWorld('warrior', 0x917a);
assert(applySavedCharacter(resumed, saved)); assert(resumed.adoptWorldState(saved.world));
for (const aq of w.activeQuests) assert.equal(resumed.activeQuests.find(q => q.questId === aq.questId)?.directionsKnown, aq.directionsKnown);
assert.deepEqual(resumed.zoneMap[target.id].exits, target.exits);
console.log('PASS directions and local roads survive save/resume');


// Startup roster across several worlds: every leader's entrance is local,
// never a high-level shortcut from the initial settlement.
for (const seed of [1, 13, 97, 601]) {
  const world = makeSimWorld('warrior', seed); world.loadZone(START_ZONE); world.odyssey.update();
  const leaders = world.activeQuests.filter(q => q.questId.startsWith('odyssey_leader_'));
  assert.equal(leaders.length, 4);
  for (const aq of leaders) {
    const z = world.zoneMap[aq.zoneId];
    for (const e of z.exits) {
      const near = world.zoneMap[e.to]; if (!near) continue;
      assert(Math.hypot(z.map.x - near.map.x, z.map.y - near.map.y) < 240, `${seed}: long leader road`);
      assert.notEqual(near.id, START_ZONE, `${seed}: leader shortcut from Lastlight`);
    }
  }
}
console.log('PASS four startup seeds keep every leader entrance local');
