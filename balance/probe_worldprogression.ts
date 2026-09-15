import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { HUB_ZONE } from '../src/data/zones';
import { LEVEL_FIELD_CFG, LevelField, levelAt, ringsAtDistance, validateLevelField } from '../src/world/levelField';
import { openingRoads, tuneOpeningProgression } from '../src/world/openingProgression';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { reachable, walkable } from './audit_worldprogression';

assert.deepEqual(validateLevelField(), []);
const field = new LevelField(11, {x:0,y:0});
for (const level of [1, 2, 5, 14, 23, 45, 60, 75, 80, 120]) {
  assert(Math.abs(1 + ringsAtDistance(field.radiusForLevel(level)) - level) < 1e-9);
}
for (let seed = 0; seed < 1000; seed++) {
  assert(levelAt({x:130,y:0}, {x:0,y:0}, seed) <= 4, 'no five-level spike at home');
}
assert(field.radiusForLevel(80) - field.radiusForLevel(79) > field.radiusForLevel(15) - field.radiusForLevel(14));
assert.deepEqual(validateLevelField({...LEVEL_FIELD_CFG, ringGrowth:-1}), ['ringGrowth must be >= 0']);
console.log('PASS continuous widening, exact quest-band inverse, bounded opening noise');

const seeds = [...Array.from({length:24},(_,i)=>i+1), 28, 30, 47, 49, 50, 76, 97, 601, 1009, 0xf03e01];
let doors = 0;
for (const seed of seeds) {
  seedGlobalRandom(seed);
  const w = makeSimWorld('warrior', seed);
  if (seed % 4 === 0) w.odyssey.update(); // distant startup objectives must not claim the opening
  w.loadZone(HUB_ZONE);
  assert(reachable(w, 1).length >= 3, `${seed}: three connected level-one fields`);
  assert(reachable(w, 4).length >= 10, `${seed}: ten fields below level five`);
  const choices = openingRoads(w.zone, w.zoneMap, (a,b)=>walkable(w,a,b)).filter(z=>z.level === 1);
  assert(choices.length >= 2, `${seed}: two live level-one choices`);
  assert(w.surveyed.size === 0, 'opening tuning does not survey');
  let onward = 0;
  for (const z of choices.slice(0,2)) {
    const portal = w.exits.find(e=>e.to === z.id);
    assert(portal && !w.isExitLocked(portal), `${seed}: unlocked starting portal`);
    w.loadZone(z.id, HUB_ZONE);
    const nav = w.pathField();
    const exits = w.exits.filter(e=>!w.isExitLocked(e));
    assert(exits.length >= 1, `${seed}: local approach has a way home`);
    onward += exits.filter(e=>e.to !== HUB_ZONE).length;
    for (const e of exits) {
      assert(!nav?.reachable || nav.reachable(w.player.pos,e.pos), `${seed}/${z.id}: terrain blocks ${e.to}`);
      doors++;
    }
    w.loadZone(HUB_ZONE, z.id);
  }
  assert(onward > 0, `${seed}: level-one choices must lead onward collectively`);
  if (seed === 11 || seed === 20) {
    const levels = Object.fromEntries(Object.values(w.zoneMap).map(z=>[z.id,z.level]));
    const saved = JSON.parse(JSON.stringify(serializeCharacter(w)));
    const resumed = makeSimWorld('warrior',seed);
    assert(applySavedCharacter(resumed,saved)); assert(resumed.adoptWorldState(saved.world));
    resumed.loadZone(HUB_ZONE);
    for (const [id,level] of Object.entries(levels)) assert.equal(resumed.zoneMap[id]?.level,level);
    assert.equal(resumed.meta.xp,w.meta.xp);
    assert.equal(resumed.player.level,w.player.level);
  }
}
console.log(`PASS ${seeds.length} seeded road graphs, ${doors} live terrain/lock checks, saved levels and XP`);

// Disconnected, locked, one-way and boss-only ground cannot satisfy the repair.
seedGlobalRandom(77);
const w = makeSimWorld('warrior',77);
const hub = w.zoneMap[HUB_ZONE];
const make = (id:string) => ({...hub, id, level:9, map:{x:hub.map.x+90,y:hub.map.y}, exits:[{to:HUB_ZONE,side:'w' as const}]});
const locked = make('locked'), island = make('island'), boss = make('boss'), oneWay = make('oneWay'), quest = make('quest_local');
boss.objective = {kind:'boss',id:'zombie'};
hub.exits = [{to:locked.id,side:'n',lock:'test'}, {to:boss.id,side:'s'}, {to:oneWay.id,side:'e'}, {to:quest.id,side:'w'}];
oneWay.exits = [];
const zones = {[hub.id]:hub,locked,island,boss,oneWay,[quest.id]:quest};
assert.deepEqual(tuneOpeningProgression(zones,()=>true),[]);
for (const z of [locked,island,boss,oneWay,quest]) assert.equal(z.level,9);
console.log('PASS disconnected/locked/one-way/sealed terrain cannot count as an opening route');
