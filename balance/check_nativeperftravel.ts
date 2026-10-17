import assert from 'node:assert/strict';
import { CLASSES } from '../src/data/classes';
import { START_ZONE } from '../src/data/zones';
import type { Doodad } from '../src/engine/levelgen';
import { makeAccount } from '../src/meta/account';
import { sceneDue } from '../src/engine/scenes';
import { World } from '../src/engine/world';
import { withSeededRandom } from '../src/core/rng';
import { retainedPerfTravel, withPerfProfile, assertPerfWalk, assertPerfFrames } from '../src/dev/nativePerfTravel';
import { NativeClientRuntime } from '../src/worldmass/nativeClientRuntime';
import { makeNativeGeographyCatalogSpec, NativeGeographyCatalog } from '../src/worldmass/nativeGeographyCatalog';
import { freshClientSetup } from './nativeClientStartFixture';
import { refuseWorldCombat } from './probe_nativecombatcycle';

const profile = makeAccount();
assert(sceneDue(profile, 'prologue'));
let persisted: unknown;
const persist = () => { persisted = { ...profile.ledger }; };
assert.equal(withPerfProfile(profile, () => {
  assert(!sceneDue(profile, 'prologue'));
  profile.ledger.perf_test_partial = 7;
  return 'started';
}, persist), 'started');
assert(!Object.hasOwn(profile.ledger, 'prologue_lived'));
assert.deepEqual(persisted, profile.ledger);
assert.equal(profile.ledger.perf_test_partial, 7);
profile.ledger.prologue_lived = 3;
const prior = Object.getOwnPropertyDescriptor(profile.ledger, 'prologue_lived');
assert.throws(() => withPerfProfile(profile, () => { throw Error('startup failure'); }, persist), /startup failure/);
assert.deepEqual(Object.getOwnPropertyDescriptor(profile.ledger, 'prologue_lived'), prior);
assert.deepEqual(persisted, profile.ledger);
assert.throws(() => assertPerfWalk(0, 100), /did not advance/);
assert.throws(() => assertPerfWalk(1, 0), /did not advance/);
assert.throws(() => assertPerfWalk(1, 20, 1), /gameplay pause/, 'partial movement cannot launder a paused window');
assertPerfWalk(1, 20, 0);
assert.throws(() => assertPerfFrames(0, null), /no completed frame telemetry/);
assert.throws(() => assertPerfFrames(1, { msg: 'native loop failed', stack: 'native stack' }), e => String(e).includes('native loop failed') && String(e).includes('native stack'));
assertPerfFrames(1, null);

withSeededRandom(741102, () => {
  const { writer, geography } = freshClientSetup(1113, false);
  const catalog = new NativeGeographyCatalog(makeNativeGeographyCatalogSpec(geography.spec.sourceJson));
  const loadCalls: string[] = [];
  const drivers = ['loadZone', 'landPartyAt'] as const;
  const originals = drivers.map(name => [name, Object.getOwnPropertyDescriptor(World.prototype, name)!] as const);
  for (const [name, descriptor] of originals) Object.defineProperty(World.prototype, name, {
    ...descriptor, value() { loadCalls.push(name); throw Error('Original World travel driver: ' + name); },
  });
  try { refuseWorldCombat([writer], calls => {
    const runtime = new NativeClientRuntime({ writer, definition: writer.zoneMap[START_ZONE],
      geography: catalog.initial.spec, catalog: catalog.spec,
      fresh: { classDef: CLASSES.find(c => c.id === 'tamer')! } });
    runtime.install();
    const travel = retainedPerfTravel(runtime), town = runtime.current;
    const coordinator = town.combat.input.coordinator;
    const hero = writer.player, companion = writer.actors.find(a => a.owner === hero && a.companion);
    assert(companion, 'actual initial companion participates in the course');
    const townActors = writer.actors;
    assert.throws(() => writer.devTravelTo(START_ZONE), /Original World travel driver: loadZone/,
      'the predecessor route must fail under the same genuine driver trap');
    assert.deepEqual(loadCalls.splice(0), ['loadZone']);
    assert(travel.travelTo(START_ZONE));
    assert.equal(runtime.current, town, 'town control does not replace retained stores');
    assert.equal(writer.actors, townActors);
    const counter = coordinator.input.campaign.nextGenId;
    assert.equal(travel.travelTo('absent-perf-area'), false);
    assert.equal(travel.mintTileset('absent-perf-tileset'), null);
    assert.equal(coordinator.input.campaign.nextGenId, counter);
    assert.equal(runtime.current, town);

    const jungle = travel.mintTileset('jungle', 11, 8, { seed: 4242, variant: 'strangler court', layoutType: 'forest' });
    assert(jungle);
    const field = runtime.current, fieldActors = writer.actors;
    assert.equal(writer.zone.id, jungle);
    assert.equal(writer.zone.variantName, 'strangler court');
    assert.equal(writer.zone.layoutType, 'forest');
    assert.equal(writer.zone.seed, 4242);
    assert.equal(writer.zone.level, 8);
    assert.equal(writer.player, hero);
    assert.equal(field.authority.require(hero).combat, field.combat);
    assert.equal(field.authority.require(companion).combat, field.combat);
    assert(!town.assembly.input.scene.actors.includes(hero));
    assert(!town.assembly.input.scene.actors.includes(companion));
    assert(Math.hypot(hero.pos.x - writer.arena.w / 2, hero.pos.y - writer.arena.h / 2) < 160,
      'landing uses the destination arena');
    const geometry = field.assembly.input.geometry;
    const pit: Doodad = { kind: 'chasm', pos: { ...hero.pos }, radius: 70 };
    const bridge: Doodad = { kind: 'bridge', pos: { ...hero.pos }, radius: 80 };
    geometry.doodads.push(pit); geometry.markDoodadsChanged();
    const hazards = travel.hazards();
    assert(hazards(hero, hero.pos.x, hero.pos.y), 'actual area pit is hazardous');
    geometry.bridges.push(bridge);
    assert(!hazards(hero, hero.pos.x, hero.pos.y), 'actual area bridge covers the pit');
    geometry.bridges.splice(geometry.bridges.indexOf(bridge), 1);
    pit.gone = true; geometry.markDoodadsChanged();
    assert(!hazards(hero, hero.pos.x, hero.pos.y), 'same-length terrain revision invalidates actual pit cache');
    geometry.doodads.splice(geometry.doodads.indexOf(pit), 1); geometry.markDoodadsChanged();
    const liteBefore = field.assembly.input.ecology.input.state.lite.liveCount;
    const poured = travel.pourLite('vermin_tide', 24);
    assert(poured > 0);
    assert.equal(field.assembly.input.ecology.input.state.lite.liveCount, liteBefore + poured);
    const enemy = writer.actors.find(a => a.team === 'enemy');
    assert(enemy, 'pinned field includes actual targetable residents');
    enemy.life = Math.max(1, enemy.life / 2);
    const wound = enemy.life;
    const count = travel.census();
    assert.equal(count.residentAreas, 2);
    assert.equal(count.residentActors, coordinator.residentAreas().reduce((n, a) => n + a.assembly.input.scene.actors.length, 0));
    assert(travel.travelTo(START_ZONE));
    assert.equal(runtime.current, town);
    assert.throws(() => hazards(hero, hero.pos.x, hero.pos.y), /changed area/);
    assert(travel.travelTo(jungle));
    assert.equal(runtime.current, field);
    assert.equal(writer.actors, fieldActors, 'retry keeps actual retained storage');
    assert.equal(enemy.life, wound, 'retry cannot reset combat pressure');
    assert.throws(() => { writer.zone = writer.zoneMap[START_ZONE]; }, /published identity/);

    const realm = travel.mintTileset('galestream', 12, 8, { seed: 888 });
    assert(realm);
    assert.equal(writer.zone.id, realm);
    assert.equal(writer.zone.dimension, 'aetherial');
    assert.equal(runtime.current.authority.require(hero).combat, runtime.current.combat);

    const originalLanding = coordinator.landPartyAt;
    coordinator.landPartyAt = () => { throw Error('injected landing failure'); };
    try { assert.throws(() => travel.travelTo(jungle), /injected landing failure/); }
    finally { coordinator.landPartyAt = originalLanding; }
    assert.equal(runtime.current, field, 'completed native handoff survives later landing failure');
    assert.equal(field.authority.require(hero).combat, field.combat);
    assert(runtime.ready);
    assert.deepEqual(calls, [], 'no original World gameplay driver');
    assert.deepEqual(loadCalls, [], 'no original World load or party landing driver');
    const held = travel.travelTo;
    runtime.retire();
    assert.throws(() => held(START_ZONE), /retired/);
    assert.throws(() => travel.census(), /retired/);
    console.log(JSON.stringify({ status: 'passed', course: 'retained-native',
      checks: ['same-area', 'unknown', 'pins', 'cohort', 'destination landing', 'warm retry',
        'identity refusal', 'realm', 'partial failure', 'retirement', 'no World fallback'], census: count }));
  }); } finally { for (const [name, descriptor] of originals) Object.defineProperty(World.prototype, name, descriptor); }
});
