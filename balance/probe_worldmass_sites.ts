import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { address, localOffset } from '../src/worldmass/address';
import { canonical } from '../src/worldmass/random';
import { nativeMassSite } from '../src/worldmass/sites';
import { massMap } from '../src/worldmass/paint';
import { fellableDoodad } from '../src/engine/rampage';
import { serializeCharacter } from '../src/meta/character';

const restore = seedGlobalRandom(51342);
function fixture(kind: 'wayside-camp' | 'pillaged-ruin'): MassAdventure {
  const config: MassAdventure = JSON.parse(canonical(massAdventure()));
  delete config.progression; delete config.journey; delete config.ecology;
  delete config.settlement; // native-town lifecycle has its own probe
  config.terrain.addressSpan = 768; config.terrain.terrainCell = 24;
  const row = config.content.find(c => c.id === kind)!;
  config.terrain.fields = [];
  config.terrain.surfaces = [{ id: 'land', priority: 0, when: [], region: 'ground', color: '#445522', biome: 'downs' }];
  config.terrain.places = [{ id: kind, version: 1, content: kind, period: 1536, radius: 300, jitter: 0,
    chance: 1, when: [], priority: 1, surface: { region: 'ground', color: '#665544' } }];
  config.content = [{ ...row, count: 2, level: 7, table: [{ id: 'zombie', weight: 1 }] }];
  delete config.content[0].limits; // this fixture supplies one explicit eligible species
  return config;
}

for (const kind of ['wayside-camp', 'pillaged-ruin'] as const) {
  const config = fixture(kind), spec = config.terrain;
  const land = new MassGenerator(makeMassRun(47, 'sites-' + kind, spec), spec);
  const reverse = new MassGenerator(land.run, spec);
  const cell = address('surface', '-1', '-1', 0, 0, spec.addressSpan);
  const place = land.placesInCell(cell).find(p => localOffset(p.center, cell, spec.addressSpan).x === 0
    && localOffset(p.center, cell, spec.addressSpan).y === 0)!;
  assert.ok(place, 'a site footprint straddles four negative pages');
  const queried = land.terrainAt(place.center);
  assert.equal(queried.region, 'ground'); assert.equal(queried.color, '#665544');
  assert.equal(queried.source.rule, kind + '/surface');
  reverse.placesInCell(address('surface', '12', '-16', 0, 0, spec.addressSpan));
  for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const at = address('surface', place.center.cx, place.center.cy, x, y, spec.addressSpan);
    assert.ok(land.placesInCell(at).some(p => p.id === place.id));
    assert.deepEqual(reverse.terrainAt(at), land.terrainAt(at));
  }

  const w = makeSimWorld('warrior', 712);
  const mass = new WorldMassRuntime(47, 'sites-' + kind, config);
  mass.attach(w); w.player.invulnerable = true;
  assert.equal(mass.sites.discovered.length, 0);
  assert.ok(!massMap(mass, w.player.pos).includes(config.content[0].site!.name), 'undiscovered map hides names');
  const target = land.placesInCell(address('surface', '1', '1', 0, 0, spec.addressSpan))
    .find(p => p.center.cx === '1' && p.center.cy === '1')!;
  const center = { x: 768, y: 768 };
  const chestId = canonical([target.id, 'cache']);
  const chest = w.chests.find(c => c.rewardSource === chestId)!;
  assert.ok(chest, 'native cache is realized once its guards can be seated');
  assert.equal(chest.rewardLevel, 7);
  assert.ok(!w.pointInSolid(chest.pos.x, chest.pos.y, 20));
  const nearby = () => w.doodads.filter(d => Math.hypot(d.pos.x - center.x, d.pos.y - center.y) < target.radius);
  assert.equal(nearby().length, config.content[0].site!.doodads.length, 'cross-page site creates each native prop once');
  for (const dx of [-target.radius * .85, target.radius * .85]) {
    const approach = mass.walk.snapToWalkable({ x: center.x + dx, y: center.y });
    mass.walk.beginFrame();
    assert.ok(mass.walk.reachable(approach, chest.pos), 'the native cache is reachable from opposing approaches');
  }
  const identities = [...nearby()];
  mass.update(w, true);
  assert.ok(identities.every(d => nearby().includes(d)), 'resident scenery retains object identity');
  w.player.pos = { ...chest.pos }; mass.update(w, true);
  assert.ok(mass.sites.discovered.some(s => s.id === target.id));
  assert.ok(massMap(mass, w.player.pos).includes(config.content[0].site!.name));

  // The real native timed-cache path pays once and respects the place level,
  // despite the encompassing continuous-world zone being level one.
  for (let i = 0; i < 170; i++) w.update(1 / 30);
  assert.equal(chest.opened, true);
  const rewards = [...w.seats[0].meta.items, ...w.drops.flatMap(d => d.item.kind === 'gear' ? [d.item.item] : [])];
  assert.ok(rewards.some(item => item.ilvl === 7), 'native cache loot uses the place level');
  const paid = canonical([w.drops, w.seats[0].meta.items]);
  mass.update(w, true);
  assert.equal(w.chests.filter(c => c.rewardSource === chestId).length, 1);
  assert.equal(canonical([w.drops, w.seats[0].meta.items]), paid);

  const savedBefore = mass.snapshot(w);
  const fixtureId = canonical([target.id, 'fixture', 0]);
  const record = savedBefore.enemies.find(e => e.id === fixtureId)!;
  assert.ok(record, 'native breakable fixture has a durable owner');
  const victim = w.actors.find(a => a.defId === record.monster && a.pos.x === record.x && a.pos.y === record.y)!;
  w.kill(victim, true);
  mass.update(w, true);
  assert.ok(mass.state.claimed('fallen', fixtureId));
  const guardRecord = mass.snapshot(w).enemies.find(e => e.id === canonical([target.id, 0]))!;
  const guard = w.actors.find(a => a.defId === guardRecord.monster && a.pos.x === guardRecord.x && a.pos.y === guardRecord.y)!;
  guard.life = Math.max(1, guard.maxLife() * .37);
  const guardLife = guard.life;
  const removed = nearby().find(d => nearby().filter(o => o.pos.x === d.pos.x && o.pos.y === d.pos.y).length === 1)!, removedPos = { ...removed.pos };
  w.doodads = w.doodads.filter(d => d !== removed); w.markDoodadsChanged();
  const felled = nearby().find(fellableDoodad)!;
  assert.ok(w.fellDoodad(felled, 'sites-probe'));
  const felledPos = { ...felled.pos }, remaining = felled.felled!.wake - w.time;
  mass.state.paint({ address: mass.walk.at(center.x + 240, center.y), region: 'wall', color: '#777777', cause: 'sites-probe' });
  assert.equal(mass.walk.regionAt(center.x + 240, center.y), 'wall', 'edits override generated site ground');

  w.player.pos = { x: 9000, y: 9000 }; mass.update(w, true);
  assert.ok(nearby().length > 0, 'remote living guards keep their solid scenery');
  const saved = serializeCharacter(w);
  const checkpoint = JSON.parse(JSON.stringify(saved.world!.worldmass!));
  const resumed = makeSimWorld('warrior', 718);
  assert.ok(resumed.adoptWorldState(saved.world));
  resumed.startWorldMass(checkpoint.state.run.seed, checkpoint);
  const restoredMass = resumed.massRuntime!;
  assert.ok(resumed.doodads.some(d => Math.hypot(d.pos.x - center.x, d.pos.y - center.y) < target.radius),
    'restoring far away restores scenery dependencies of retained guards');
  resumed.player.pos = { ...chest.pos }; restoredMass.update(resumed, true);
  const after = restoredMass.snapshot(resumed);
  assert.equal(after.enemies.some(e => e.id === fixtureId), false, 'destroyed breakable never respawns');
  assert.equal(after.enemies.find(e => e.id === canonical([target.id, 0]))!.life, guardLife);
  assert.equal(resumed.chests.filter(c => c.rewardSource === chestId).length, 1);
  assert.equal(resumed.chests.find(c => c.rewardSource === chestId)!.opened, true);
  assert.ok(restoredMass.sites.discovered.some(s => s.id === target.id));
  assert.equal(resumed.doodads.some(d => d.pos.x === removedPos.x && d.pos.y === removedPos.y), false);
  assert.equal(restoredMass.walk.regionAt(center.x + 240, center.y), 'wall');

  const regrowing = resumed.doodads.find(d => d.pos.x === felledPos.x && d.pos.y === felledPos.y && d.felled)!;
  assert.ok(regrowing && resumed.rampageActive(), 'restored felling rejoins the native regrowth controller');
  assert.ok(Math.abs(regrowing.felled!.wake - resumed.time - remaining) < 1e-6);
  // Once all dependants leave, scenery can evict without losing destruction.
  for (const a of resumed.actors) if (a !== resumed.player) a.dead = true;
  const unrelated = { kind: 'rock', radius: 8, pos: { x: 12345, y: 12345 } };
  resumed.doodads.push(unrelated);
  resumed.player.pos = { x: 9000, y: 9000 };
  resumed.time += remaining + 60; resumed.update(.6);
  assert.equal(regrowing.felled, undefined, 'native regrowth completes after the saved remaining delay');
  restoredMass.update(resumed, true);
  assert.equal(resumed.doodads.some(d => Math.hypot(d.pos.x - center.x, d.pos.y - center.y) < target.radius), false);
  assert.ok(resumed.doodads.includes(unrelated), 'residency only removes its own objects');
  resumed.player.pos = { ...chest.pos }; restoredMass.update(resumed, true);
  assert.equal(resumed.doodads.some(d => d.pos.x === removedPos.x && d.pos.y === removedPos.y), false);
  assert.equal(resumed.chests.filter(c => c.rewardSource === chestId).length, 1);
  console.log('PASS worldmass ' + kind + ': cross-page identity, discovery, native loot, wounds, breakables, eviction and real save reload');
}

const cfg = fixture('wayside-camp'); cfg.maxPopulation = 1;
const saturated = makeSimWorld('warrior', 811), capped = new WorldMassRuntime(47, 'cap', cfg);
capped.attach(saturated);
assert.equal(saturated.chests.length, 0, 'population saturation cannot create an unguarded reward');
assert.equal(capped.population, 0, 'a site reserves its complete population before realizing fixtures');
const bad = fixture('wayside-camp'); bad.content[0].site!.doodads[0].pos.x = 10000;
assert.throws(() => new WorldMassRuntime(47, 'bad', bad), /footprint/);
assert.throws(() => nativeMassSite('missing-structure', 'Missing'), /adapted/);
const old = fixture('wayside-camp'); old.terrain.version = 1;
delete old.content[0].site; delete old.terrain.places[0].surface;
const legacy = makeSimWorld('warrior', 812), legacyMass = new WorldMassRuntime(47, 'old', old);
legacyMass.attach(legacy);
const legacySave = legacyMass.snapshot(legacy); delete legacySave.sites;
const legacyReload = makeSimWorld('warrior', 813);
new WorldMassRuntime(47, 'old', old, legacySave).attach(legacyReload, legacySave);
assert.equal(legacyReload.doodads.length, 0);
assert.equal(legacyReload.chests.length, 0);
assert.equal(legacyReload.massRuntime!.generator.run.version, 1);

// Native collision joins route choice; removing masonry invalidates the route.
const nav = legacyReload.massRuntime!.walk, wall = { kind: 'wall', pos: { x: 108, y: 12 }, radius: 36 };
legacyReload.doodads.push(wall); legacyReload.markDoodadsChanged();
const from = { x: 12, y: 12 }, to = { x: 204, y: 12 };
assert.equal(nav.lineWalkable(from, to), false);
assert.ok(legacyReload.pointInSolid(108, 12));
nav.beginFrame(); const detour = nav.pathStep(from, to);
assert.ok(detour && !legacyReload.pointInSolid(detour.x, detour.y, 12));
legacyReload.doodads = []; legacyReload.markDoodadsChanged();
nav.beginFrame(); assert.deepEqual(nav.pathStep(from, to), to);
console.log('PASS worldmass site budget, malformed configuration, legacy saves and native-solid navigation');
restore();
