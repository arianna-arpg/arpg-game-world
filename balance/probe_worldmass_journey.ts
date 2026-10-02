import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { canonical } from '../src/worldmass/random';
import { localOffset, neighborCell } from '../src/worldmass/address';
import { massMap } from '../src/worldmass/paint';
import { serializeCharacter } from '../src/meta/character';
import { fellableDoodad } from '../src/engine/rampage';
const restore = seedGlobalRandom(88212);
for (const seed of [1, 42, 451, 7108, 99871]) {
  const w = makeSimWorld('warrior', seed);
  w.startWorldMass(seed);
  const m = w.massRuntime!, journey = m.journey!;
  assert.equal(journey.places.length, 5);
  assert.equal(journey.trails.length, 9);
  assert.ok(m.ecology!.stats.pieces > 0);
  for (const trail of journey.trails)
    for (let i = 1; i < trail.points.length; i++) {
      const a = trail.points[i - 1], b = trail.points[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 15);
      for (let n = 0; n <= steps; n++) {
        const x = a.x + (b.x - a.x) * n / (steps || 1), y = a.y + (b.y - a.y) * n / (steps || 1);
        assert.ok(m.walk.isWalkable(x, y), 'promised route is physical ground at seed ' + seed);
        if (m.settlement!.contains(x, y) || journey.places.some(p => Math.hypot(journey.local(p).x - x, journey.local(p).y - y) < p.radius))
          continue;
        assert.ok(!w.pointInSolid(x, y, 18), 'native scenery cannot obstruct route');
      }
    }
  for (const place of journey.places) {
    const center = journey.local(place);
    w.player.pos = { ...center };
    m.update(w, true);
    assert.equal(m.localSite(center)?.id,place.id);
    assert.equal(m.localSite(center)?.level,m.populationFor(place).level);
    assert.equal(m.localSite(m.settlement!.spawn),null);
    const source = canonical([place.id, 'cache']);
    const chest = w.chests.find(c => c.rewardSource === source)!;
    assert.ok(chest, 'opening sites have actual caches and native guardians');
    const native = m.snapshot(w).enemies.find(e => e.id === canonical([place.id, 0]));
    assert.ok(native, 'opening content is an encounter, not a marker');
    for (const dx of [-.85, .85]) {
      const approach = m.walk.snapToWalkable({ x: center.x + place.radius * dx, y: center.y });
      m.walk.beginFrame();
      assert.ok(m.walk.reachable(approach, chest.pos), 'cache reachable from both sides');
    }
    assert.ok(m.placesInCell(place.center).some(p => p.id === place.id));
    const intersecting = m.placesInCell(place.center).filter(p => p.id !== place.id);
    assert.ok(intersecting.every(p => {
      const q = localOffset(p.center, { ...m.origin, x: 0, y: 0 }, m.config.terrain.addressSpan);
      return Math.hypot(q.x - center.x, q.y - center.y) >= p.radius + place.radius;
    }));
  }
  console.log('PASS seed ' + seed + ': connected eight-route network, four defended reachable destinations, clear approaches');
  if (seed !== 42)
    continue;
  const before = canonical(journey.trails);
  const away = m.walk.at(-2200, -2200);
  w.player.pos = { x: -2200, y: -2200 };
  m.update(w, true);
  const tree = w.doodads.find(d => fellableDoodad(d) && !m.settlement!.reserves(d.pos.x, d.pos.y, d.radius)
    && !journey.reserves(d.pos, d.radius))!;
  assert.ok(tree);
  const treePos = { ...tree.pos };
  assert.ok(w.fellDoodad(tree, 'frontier-probe'));
  const state = m.ecology!.snapshot(w);
  assert.ok(state.changes.length > 0);
  const piece = w.doodads.find(d => !m.settlement!.reserves(d.pos.x, d.pos.y, d.radius) && !journey.reserves(d.pos, d.radius) && d !== tree)!;
  assert.ok(piece);
  const removed = { ...piece.pos };
  w.doodads = w.doodads.filter(d => d !== piece);
  w.markDoodadsChanged();
  m.ecology!.snapshot(w);
  const floor = { x: journey.trails[0].points[2].x, y: journey.trails[0].points[2].y };
  m.state.paint({ address: m.walk.at(floor.x, floor.y), region: 'wall', color: '#787878', cause: 'frontier-probe/changed-road' });
  // Mutation survives genuine ecology page eviction/recreation, not only saving.
  m.ecology!.sync(w, [neighborCell(away, 20, 20)]);
  m.ecology!.sync(w, [away]);
  assert.ok(!w.doodads.some(d => d.pos.x === removed.x && d.pos.y === removed.y));
  const edge = journey.trails[0].points[0];
  m.settlement!.grid.fillRegion(edge.x, edge.y, edge.x, edge.y, 'wall');
  const character = serializeCharacter(w), stored = character.world!.worldmass!;
  const resumed = makeSimWorld('warrior', seed);
  assert.ok(resumed.adoptWorldState(character.world));
  resumed.startWorldMass(seed, stored);
  const replay = resumed.massRuntime!;
  assert.equal(canonical(replay.journey!.trails), before, 'Continue cannot move a path');
  assert.equal(replay.walk.regionAt(floor.x, floor.y), 'wall', 'Continue cannot repair an edited trail');
  assert.ok(resumed.doodads.some(d => d.pos.x === treePos.x && d.pos.y === treePos.y && d.felled));
  assert.ok(!resumed.doodads.some(d => d.pos.x === removed.x && d.pos.y === removed.y));
  assert.equal(replay.generator.run.version, 5);
  const found = journey.places[0], c = w.chests.find(c => c.rewardSource === canonical([found.id, 'cache']))!;
  c.opened = true;
  w.player.pos = journey.local(found);
  m.update(w, true);
  assert.ok(massMap(m, w.player.pos).includes('Searched'));
  console.log('PASS sparse scenery changes, felling clocks, edited paths and topology survive Continue; searched caches marked');
}
const legacy: MassAdventure = JSON.parse(canonical(massAdventure()));
delete legacy.journey;
delete legacy.ecology;
legacy.terrain.version = 4;
const old = makeSimWorld('warrior', 71), oldMass = new WorldMassRuntime(42, 'legacy-v4', legacy);
oldMass.attach(old);
assert.equal(oldMass.journey, null);
assert.equal(oldMass.ecology, null);
const saved = oldMass.snapshot(old), again = makeSimWorld('warrior', 72);
new WorldMassRuntime(42, 'legacy-v4', legacy, saved).attach(again, saved);
assert.equal(again.massRuntime!.generator.run.version, 4);
assert.equal(again.massRuntime!.journey, null);
console.log('PASS version 4 Continue keeps its original geography without adding routes or scenery');
// A modified first tree must not change which later trees the seed generates.
const groveConfig: MassAdventure = JSON.parse(canonical(massAdventure()));
delete groveConfig.settlement; delete groveConfig.journey; delete groveConfig.progression;
groveConfig.terrain.places = []; groveConfig.content = []; groveConfig.startRadius = 0;
groveConfig.terrain.surfaces = [{ id: 'grove', source: 'probe/grove', priority: 0, when: [],
  region: 'ground', color: '#334422', biome: 'forest' }];
groveConfig.ecology = { source: 'probe/grove', spacing: 192, rules: [{
  id: 'trees', biomes: ['forest'], chance: 1, cluster: { count: [6, 6], spread: 46 },
  pieces: [{ kind: 'tree', weight: 1, radius: [12, 12] }],
}] };
const groveWorld = makeSimWorld('warrior', 61), grove = new WorldMassRuntime(42, 'grove', groveConfig);
grove.attach(groveWorld);
const first = groveWorld.doodads[0], peer = groveWorld.doodads.slice(1).find(d =>
  Math.hypot(d.pos.x-first.pos.x,d.pos.y-first.pos.y)<92)!;
assert.ok(peer, 'cluster contains multiple separated native trunks');
first.pos = { ...peer.pos };
const expected = groveWorld.doodads.map(d => canonical([d.kind,d.pos,d.radius,d.rot])).sort();
const groveSave = grove.snapshot(groveWorld), groveAgain = makeSimWorld('warrior', 62);
new WorldMassRuntime(42, 'grove', groveConfig, groveSave).attach(groveAgain, groveSave);
assert.deepEqual(groveAgain.doodads.map(d => canonical([d.kind,d.pos,d.radius,d.rot])).sort(),expected,
  'saved changes must not alter seed placement of neighboring cluster members');
console.log('PASS edited cluster peers preserve every other scenery identity on Continue');
restore();
