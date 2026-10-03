import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, MASS_ZONE } from '../src/worldmass/preset';
import { townStationFeatures } from '../src/data/townBuild';
import { MONSTERS } from '../src/data/monsters';
import { serializeCharacter } from '../src/meta/character';
import { massMap } from '../src/worldmass/paint';
import { canonical } from '../src/worldmass/random';
import { massMapSigns, MASS_MAP_SIGNS } from '../src/worldmass/cartography';
import { cellKey } from '../src/worldmass/address';
import { hasDoodadRule, blocksMovement } from '../src/engine/levelgen';

const restore = seedGlobalRandom(62532);
for (const grown of [false, true]) {
  const w = makeSimWorld('warrior', 62532);
  if (grown) for (const f of townStationFeatures()) w.account.features.add(f);
  w.startWorldMass(451); const mass = w.massRuntime!, town = mass.settlement!;
  w.player.invulnerable = true;
  assert.ok(town); assert.equal(w.zone.id, MASS_ZONE); assert.equal(w.arena.boundless, true);
  assert.equal(town.tier, grown ? 3 : 0);
  assert.equal(w.walk, mass.walk); assert.equal(mass.walk.cellSize, 30);
  assert.ok(w.doodads.some(d => d.door?.id.startsWith('inn#')));
  assert.ok(w.isSafeAt(w.player.pos)); assert.ok(!w.isSafeAt({ x: -500, y: -500 }));
  assert.ok(w.townPresent()); assert.ok(massMap(mass, w.player.pos).includes('Lastlight'));
  const knowledge=canonical(mass.state.snapshot()),signs=massMapSigns(mass,w.doodads);
  assert.ok(signs.some(s=>s.name.includes('Mireille')));
  assert.ok(signs.some(s=>s.name.includes('Brandt')));
  assert.ok(massMap(mass,w.player.pos,48,w.doodads).includes('data-mass-services'));
  assert.ok(!massMap(mass,w.player.pos,96,w.doodads).includes('data-mass-services'));
  assert.equal(canonical(mass.state.snapshot()),knowledge,'public directions never survey any ground');
  const sign=w.doodads.find(d=>d.kind==='service_sign_inn')!;
  assert.ok(hasDoodadRule(sign.kind));assert.equal(blocksMovement(sign),false);
  sign.gone=true;assert.ok(!massMapSigns(mass,w.doodads).some(s=>s.name.includes('Mireille')));sign.gone=false;
  assert.ok(!massMapSigns(mass,w.doodads.filter(d=>d!==sign)).some(s=>s.name.includes('Mireille')));
  MASS_MAP_SIGNS.enabled=false;assert.deepEqual(massMapSigns(mass,w.doodads),[]);MASS_MAP_SIGNS.enabled=true;
  assert.equal(w.exits.length, 0); assert.equal(w.waypointPos, null);
  assert.ok(w.actors.some(a => a.defId && MONSTERS[a.defId]?.npcRole === 'vendor'));
  assert.ok(mass.snapshot(w).enemies.every(e => !town.reserves(e.x, e.y, 0)));
  console.log('PASS worldmass native Lastlight layout, account tier, resident services and population reservation', grown);

  const door = w.doodads.find(d => d.door?.id.startsWith('waking_house#'))!;
  assert.ok(door?.door); assert.ok(!mass.walk.isWalkable(door.pos.x, door.pos.y));
  const before = mass.walk.version;
  w.setDoorState(door.door!.id, 'open', { silent: true });
  assert.ok(mass.walk.isWalkable(door.pos.x, door.pos.y));
  assert.ok(mass.walk.version > before);
  const grid = w.nativeSettlementGrid()!;
  assert.equal(grid, town.grid);
  assert.ok(w.pathField(1) !== mass.walk, 'upstairs retains native tier navigation');
  console.log('PASS native doors repaint continuous collision/sight and upstairs paths');

  // Real swept movement over all four old arena rims; no scene calls,
  // no actor/controller replacement or loss of native town objects.
  const hero = w.player, skills = [...hero.skills], actors = [...w.actors], props = w.doodads.filter(d => town.contains(d.pos.x, d.pos.y));
  let loads = 0; const load = w.loadZone.bind(w); w.loadZone = (...args) => { loads++; load(...args); };
  const width = town.zone.size.w, height = town.zone.size.h;
  for (const [start, end] of [
    [{ x: -60, y: height / 2 }, { x: 60, y: height / 2 }],
    [{ x: width - 60, y: height / 2 }, { x: width + 60, y: height / 2 }],
    [{ x: width / 2, y: -60 }, { x: width / 2, y: 60 }],
    [{ x: width / 2, y: height - 60 }, { x: width / 2, y: height + 60 }],
  ]) {
    for (const [from, to] of [[start, end], [end, start]]) {
      hero.pos = { ...from };
      for (let i = 1; i <= 24; i++) {
        const next = { x: from.x + (to.x - from.x) * i / 24, y: from.y + (to.y - from.y) * i / 24 };
        hero.pos = w.clampPos(next, hero.radius, hero.pos, { mover: hero }); mass.update(w, true);
      }
      assert.ok(Math.hypot(hero.pos.x - to.x, hero.pos.y - to.y) < 2, 'walk crosses the former arena edge');
    }
  }
  assert.equal(loads, 0); assert.equal(w.player, hero);
  assert.ok(skills.every((s, i) => hero.skills[i] === s));
  assert.ok(actors.every(a => w.actors.includes(a))); assert.ok(props.every(d => w.doodads.includes(d)));
  console.log('PASS every Lastlight rim crosses both ways without loading or replacing live objects');

  if (grown) {
    for (const [site, near] of [
      ['salvage', () => w.nearSalvage()], ['oracle', () => w.nearOracle()],
      ['tracker', () => w.nearTracker()], ['bounty_board', () => w.nearBountyBoard()],
    ] as const) {
      const a = w.stationAnchor(site)!; assert.ok(a, site);
      hero.pos = { ...a.pos }; hero.tier = a.tier;
      assert.ok(near(), site + ' serves at its native anchor');
      hero.pos = { x: -600, y: -600 }; assert.ok(!near(), site + ' refuses in the wilds');
    }
  }
  const smith = w.actors.find(a => a.defId && MONSTERS[a.defId]?.npcRole === 'vendor')!;
  hero.pos = { ...smith.pos }; hero.tier = smith.tier;
  assert.ok(w.nearSmith(), 'native Brandt service remains reachable');
  hero.pos = { x: -600, y: -600 }; assert.ok(!w.nearSmith());
  console.log('PASS services resolve from real native anchors and refuse distant use');

  const broken = w.actors.find(a => a.defId === 'crate' && !a.dead)!; assert.ok(broken);
  w.kill(broken, true);
  const piece = w.doodads.find(d => d.kind === 'bench' && !d.door) ?? w.doodads.find(d => d.kind === 'tree' && !d.door)!;
  assert.ok(piece); piece.gone = true; w.doodads = w.doodads.filter(d => d !== piece);
  hero.pos = { x: -510, y: 450 }; hero.tier = 0;
  town.grid.fillRegion(600, 15, 600, 15, 'sand');
  w.time += 3600; // Continue well after the town's original guest/ambient generation beat
  const save = serializeCharacter(w), stored = save.world!.worldmass!;
  assert.ok(stored.settlement); assert.ok(stored.settlement.scenery.length);
  const renewed = makeSimWorld('warrior', 8881);
  Object.assign(renewed.account, w.account);
  assert.ok(renewed.adoptWorldState(save.world));
  renewed.startWorldMass(451, stored); renewed.resumeSpawn('exact', save.world!.player);
  const replay = renewed.massRuntime!.snapshot(renewed);
  assert.deepEqual(replay.settlement!.bodies, stored.settlement.bodies);
  assert.deepEqual(replay.settlement!.scenery, stored.settlement.scenery);
  assert.deepEqual(replay.settlement!.doors, stored.settlement.doors);
  assert.deepEqual(replay.settlement!.regions, stored.settlement.regions);
  assert.equal(renewed.walk!.regionAt!(600, 15), 'sand');
  assert.deepEqual(renewed.player.pos, { x: stored.player.x, y: stored.player.y });
  assert.ok(renewed.walk!.isWalkable(door.pos.x, door.pos.y));
  assert.equal(renewed.townTierIndex(), town.tier);
  assert.deepEqual(massMapSigns(renewed.massRuntime!,renewed.doodads),massMapSigns(mass,w.doodads),'native sign identity and geography survive Continue');
  for (const f of townStationFeatures()) renewed.account.features.add(f);
  const again = makeSimWorld('warrior', 2931); Object.assign(again.account, renewed.account);
  again.startWorldMass(451, replay);
  assert.equal(again.massRuntime!.settlement!.tier, town.tier, 'new account features cannot move this run’s buildings');
  renewed.loadZone('lastlight');
  assert.deepEqual(renewed.player.pos, town.spawn, 'a survived death wakes at the native bedside');
  console.log('PASS exact Continue preserves doors, broken bodies/scenery, town tier and native wake', JSON.stringify(stored).length);
}
// Old descriptors deliberately retain their old clearing and land.
const legacy = JSON.parse(canonical(massAdventure())); delete legacy.settlement; delete legacy.progression; delete legacy.journey; delete legacy.ecology;
legacy.terrain.version = 2; legacy.terrain.addressSpan = 768; legacy.terrain.terrainCell = 24;
const old = makeSimWorld('warrior', 531);
new WorldMassRuntime(42, 'legacy', legacy).attach(old);
assert.equal(old.massRuntime!.settlement, null);
assert.deepEqual(old.player.pos, { x: 12, y: 12 });
console.log('PASS previous worldmass descriptors retain the clearing without inserting a town');
const oldChart=JSON.parse(canonical(massAdventure()));delete oldChart.settlement.cartography;
const chartWorld=makeSimWorld('rogue',932);
new WorldMassRuntime(456,'old-chart',oldChart).attach(chartWorld);
const chart=chartWorld.massRuntime!,sign=chartWorld.doodads.find(d=>d.kind==='service_sign_inn')!;
const uncharted={...sign,pos:{x:chart.settlement!.zone.size.w-20,y:chart.settlement!.zone.size.h-20}};
assert.deepEqual(massMapSigns(chart,[uncharted]),[],'old descriptors need explored ground for directions');
chart.state.claim('explored',cellKey(chart.walk.at(uncharted.pos.x,uncharted.pos.y)));
assert.equal(massMapSigns(chart,[uncharted]).length,1,'ordinary exploration reveals old-descriptor signs');
console.log('PASS real public signs, opt-out, native town growth, removed signs, no knowledge grants and continued geography');
restore();
