import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { HoldFixture } from '../src/engine/holdObjectives';
import { lightwellOf } from '../src/engine/lightwells';
import { ZONES, type ZoneDef } from '../src/data/zones';
import { PYRE_CFG } from '../src/data/pyres';
import { objectiveRewardXp } from '../src/data/objectiveRewards';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { MassHierarchy, MASS_HIERARCHY_DEFAULT } from '../src/worldmass/hierarchy';
import { MassObjectives, nativeMassPyreSources, type MassObjectiveHost } from '../src/worldmass/objectives';
import { address, localOffset, moveAddress, type MassAddress } from '../src/worldmass/address';
import { canonical } from '../src/worldmass/random';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';

const restore = seedGlobalRandom(741125);
const nativeRows = (w: World) => (w as unknown as { pyres: HoldFixture[] }).pyres;
try {
  const base = massAdventure(), terrain = { ...base.terrain }; delete terrain.patches;
  const config: MassAdventure = { terrain: { ...terrain, fields: [], places: [],
    surfaces: [{ id: 'controlled-flat', priority: 1, when: [], region: 'ground', color: '#314232', biome: 'downs' }] },
    theme: base.theme, content: [], startRadius: 0, populationRadius: 600, maxPopulation: 20, pageRadius: 1, samplesPerTick: 256 };
  const w = makeSimWorld('warrior', 741125), runtime = new WorldMassRuntime(42, 'objective-life', config); runtime.attach(w);
  w.time = 10;
  const zone: ZoneDef = { ...structuredClone(ZONES.crossroads), objective: { kind: 'pyres', count: [2, 2], kindleSec: 5 }, level: 3 };
  const source = { id: 'native-pyre-fixture', source: 'native/pyres-probe', biomes: ['downs'], zone };
  const hierarchy = new MassHierarchy(runtime.generator.run.runId, 42, 960, MASS_HIERARCHY_DEFAULT, [source]);
  const owners = [hierarchy.at(address('surface', '0', '0', 800, 800, 960)).zone,
    hierarchy.at(address('surface', '0', '0', 6200, 800, 960)).zone];
  const points = [[800, 1100], [6200, 6500]].map(xs => xs.map(x => address('surface', '0', '0', x, 800, 960)));
  const local = (at: MassAddress) => localOffset(at, { ...runtime.origin, x: 0, y: 0 }, 960);
  let payout = 0, localNarration = 0;
  const host: MassObjectiveHost = {
    get now() { return w.time; }, hold: { ...w.massHoldHost(), text: () => { localNarration++; } },
    installPyres: (owner, rows) => w.installMassPyres(owner, rows), canRetire: rows => w.canRetireMassPyres(rows),
    installChest: (owner, chest) => w.installMassObjectiveChest(owner, chest),
    complete: (owner, z, label) => { payout += objectiveRewardXp(z.level); w.completeMassObjective(owner, z, label); },
  };
  let objectives = new MassObjectives(hierarchy, 2);
  owners.forEach((o, i) => assert.ok(objectives.admit(o, points[i], host, local, undefined,
    objectives.chestWanted(o) ? moveAddress(points[i][0], { x: 0, y: 150 }, 960) : undefined)));
  const ownedChests = w.chests.filter(c => owners.some(o => o.id === c.massObjectiveOwner));
  assert.ok(ownedChests.length, 'the fixed controlled owners exercise the native chest roll');
  assert.ok(ownedChests.every(c => !objectives.chestReady(c)));
  assert.equal(nativeRows(w).length, 4); assert.ok(nativeRows(w).every(s => w.doodads.includes(s.doodad)));
  const a = nativeRows(w).filter(s => s.owner === owners[0].id), b = nativeRows(w).filter(s => s.owner === owners[1].id);
  const step = (dt: number) => { w.time += dt; objectives.update(dt, host); };
  w.player.pos = { x: a[0].pos.x + 28, y: a[0].pos.y }; step(2);
  w.player.pos = { x: b[0].pos.x + 28, y: b[0].pos.y }; step(1);
  assert.equal(localNarration, 0, 'local operation begins through the native flash, not narration');
  assert.equal(w.flashes.filter(f => f.radius === 90 && f.maxLife === .5).length, 2,
    'suppressing stir words must preserve the first-charge flash on each owner');
  assert.equal(a[0].charge, 2); assert.equal(b[0].charge, 1); assert.equal(a[1].charge, 0); assert.equal(b[1].charge, 0);
  assert.equal(w.zone.id, 'worldmass_expedition'); assert.equal(w.objectiveDone, false);
  assert.equal(objectives.views(w.player.pos)[0].owner, owners[1].id);
  assert.equal(objectives.rings().length, 4);
  console.log('PASS two simultaneous geographic native pyre operations, independent partial charges, native fixtures/readouts and unchanged current surface');

  // A crowd at one abandoned operation drains that operation while the other builds.
  for (let i = 0; i < 4; i++) {
    const foe = w.createMonster('zombie', 3, 'enemy'); foe.pos = { x: a[0].pos.x + 40, y: a[0].pos.y + i * 10 }; w.actors.push(foe);
  }
  step(1); assert.ok(Math.abs(a[0].charge - 1.65) < 1e-9); assert.equal(b[0].charge, 2);
  w.player.pos = { x: a[0].pos.x + 28, y: a[0].pos.y }; step(1);
  assert.ok(a[0].recoup > 1); assert.ok(a[0].holdRead?.draining);
  objectives.sync([], host, local); assert.equal(objectives.residentCount, 1, 'crowd/player pin exact local operation; safe distant sibling sleeps');
  w.actors = w.actors.filter(x => x.team !== 'enemy'); w.player.pos = { x: -12000, y: -12000 };
  objectives.sync([], host, local); assert.equal(objectives.residentCount, 0); assert.equal(nativeRows(w).length, 0);
  const saved = hierarchy.snapshot(), read = canonical(saved), stayed = new MassHierarchy(hierarchy.run, 42, 960, MASS_HIERARCHY_DEFAULT, [], saved);
  objectives = new MassObjectives(stayed, 2); w.time += 200;
  objectives.sync(owners, host, local);
  const recovered = nativeRows(w).filter(s => s.owner === owners[0].id);
  assert.equal(recovered[0].charge, a[0].charge); assert.equal(recovered[0].recoup, a[0].recoup);
  assert.equal(canonical(saved), read, 'loading does not mutate supplied save');
  w.player.pos = { x: recovered[0].pos.x + 28, y: recovered[0].pos.y }; step(.5);
  assert.ok(recovered[0].holdRead?.recouping); assert.ok(Math.abs(recovered[0].charge - (a[0].charge + 1)) < 1e-9);
  console.log('PASS actual native crowd drain/attended recovery, safe participant pinning, bounded retirement and exact per-owner partial Continue');

  for (const fixture of nativeRows(w)) { w.player.pos = { x: fixture.pos.x + 28, y: fixture.pos.y }; step(10); }
  assert.equal(payout, 2 * objectiveRewardXp(3)); assert.ok(nativeRows(w).every(s => s.doodad.kind === PYRE_CFG.kindLit));
  assert.equal(localNarration, 0, 'remaining-fixture narration stays silent');
  assert.equal(w.flashes.filter(f => f.radius === 130 && f.maxLife === .8).length, 4,
    'each native pyre lights with exactly one completion flare');
  assert.equal(lightwellOf(PYRE_CFG.kindLit)!.feed, PYRE_CFG.feed);
  assert.ok(stayed.controllers().every(row => row.controllers.find(c => c.id === 'objective:pyres')!.receipts.length === 1));
  assert.ok(w.chests.filter(c => c.massObjectiveOwner).every(c => objectives.chestReady(c)));
  const chest = w.chests.find(c => c.massObjectiveOwner)!;
  assert.equal(objectives.chestContext(chest)!.level, 3);
  chest.opened = true; chest.openedAt = w.time; objectives.chestOpened(chest, w.time);
  const chestSource = chest.rewardSource;
  assert.equal(objectives.chestReady({ ...chest }), false, 'matching labels never admit a foreign container instance');
  assert.throws(() => objectives.chestOpened({ ...chest }, w.time), /Unowned/);
  w.player.pos = { x: -12000, y: -12000 }; objectives.sync([], host, local);
  const done = new MassHierarchy(stayed.run, 42, 960, MASS_HIERARCHY_DEFAULT, [], stayed.snapshot());
  objectives = new MassObjectives(done, 2); objectives.sync(owners, host, local); step(20);
  assert.equal(payout, 2 * objectiveRewardXp(3)); assert.ok(objectives.views(w.player.pos).every(v => v.done));
  assert.ok(w.chests.find(c => c.rewardSource === chestSource)!.opened, 'completed dormant chest keeps its opened latch');
  assert.ok(!w.completedObjectives.has(w.zone.id), 'two local completions never complete the entire country');
  assert.ok(nativeMassPyreSources(base.nativeCountry).every(s => s.weight <= s.totalWeight));
  console.log('PASS native lit lightwell faces, native XP artery, one payout per owner and completed Continue without country-wide completion');

  const corrupt = done.snapshot(); const c = corrupt.owners[0].controllers.find(c => c.id === 'objective:pyres')!;
  (c.state as { fixtures: { charge: number }[] }).fixtures[0].charge = 1;
  assert.throws(() => new MassObjectives(new MassHierarchy(done.run, 42, 960, MASS_HIERARCHY_DEFAULT, [], corrupt)), /pyre checkpoint/);
  const corruptChest = done.snapshot();
  const corruptChestState = corruptChest.owners.flatMap(o => o.controllers).find(c => c.id === 'objective:pyres:chest' && c.phase === 'complete')!;
  (corruptChestState.state as { opened: boolean }).opened = false;
  assert.throws(() => new MassObjectives(new MassHierarchy(done.run, 42, 960, MASS_HIERARCHY_DEFAULT, [], corruptChest)), /chest checkpoint/);
  console.log('PASS malformed completed owner refuses rather than resetting progress or duplicating rewards');
} finally { restore(); }

// The production source selector, physical placement, singleton native update
// dispatch and character save lane all run here without replacing their owners.
const productionRestore = seedGlobalRandom(901743);
try {
  let w = makeSimWorld('warrior', 901743); w.startWorldMass(901743); w.player.invulnerable = true;
  let m = w.massRuntime!;
  assert.ok(m.geography, 'default expedition must install geographic gameplay');
  const candidates: NonNullable<ReturnType<typeof m.geography.plannedAt>>[] = [];
  for (let r = 0; r <= 14 && candidates.length < 2; r++) for (let y = -r; y <= r && candidates.length < 2; y++)
    for (let x = -r; x <= r && candidates.length < 2; x++) {
      if (Math.max(Math.abs(x), Math.abs(y)) !== r) continue;
      const plan = m.geography.plannedAt(m.walk.at(x * 5400 + 2700, y * 5400 + 2700));
      if (plan?.context.zone.objective.kind === 'pyres' && !candidates.some(p => p.owner.id === plan.owner.id)) candidates.push(plan);
    }
  assert.equal(candidates.length, 2, 'native source frequencies must actually yield repeated playable objectives');
  const plan = candidates.find(p => m.geography!.objectives.chestWanted(p.owner, p.context))!;
  assert.ok(plan, 'production candidates include the native chest lottery');
  const position = (at: MassAddress) => localOffset(at, { ...m.origin, x: 0, y: 0 }, 960);
  w.landPartyAt(position(plan.owner.center)); m.update(w, true);
  let fixtures = nativeRows(w).filter(s => s.owner === plan.owner.id);
  assert.equal(fixtures.length, plan.positions.length);
  let chest = w.chests.find(c => c.massObjectiveOwner === plan.owner.id)!;
  assert.ok(chest); assert.equal(w.chestObjectiveDone(chest), false);
  const chestSource = chest.rewardSource;
  w.landPartyAt(chest.pos); (w as unknown as { updateChests(dt: number): void }).updateChests(1);
  assert.equal(chest.opened, false, 'unsolved owner chest cannot use singleton objectiveDone');
  const stand = (s: HoldFixture) => {
    for (const [dx, dy] of [[65, 0], [-65, 0], [0, 65], [0, -65]]) {
      const p = { x: s.pos.x + dx, y: s.pos.y + dy };
      if (w.walk!.isWalkable(p.x, p.y) && !w.pointInSolid(p.x, p.y, w.player.radius)) { w.landPartyAt(p); return; }
    }
    throw Error('Native pyre has no reachable interaction stand');
  };
  stand(fixtures[0]);
  const beforeWalk = { ...w.player.pos };
  w.moveActor(w.player, fixtures[0].pos.x - w.player.pos.x, fixtures[0].pos.y - w.player.pos.y, .05);
  assert.notDeepEqual(w.player.pos, beforeWalk, 'actual native movement advances through physical ground');
  const drive = (seconds: number) => { w.time += seconds; (w as unknown as { updateObjective(dt: number): void }).updateObjective(seconds); };
  w.update(.05); drive(.7);
  assert.ok(fixtures[0].charge > 0 && fixtures[0].charge < 5, 'main native objective update advances this generated owner');
  assert.ok(w.dwellRingsView().some(r => r.kind === 'pyre'));
  assert.ok(w.pyresView());
  const checkpoint = m.geography!.hierarchy.controller(plan.owner.id, 'objective:pyres')!;
  const saved = serializeCharacter(w); assert.equal(saved.world!.worldmass!.schema, 11); assert.ok(saved.world!.worldmass!.geography);
  const continued = makeSimWorld('warrior', 1712); assert.ok(applySavedCharacter(continued, saved)); assert.ok(continued.adoptWorldState(saved.world));
  continued.startWorldMass(saved.world!.worldmass!.state.run.seed, saved.world!.worldmass); w = continued; m = w.massRuntime!;
  assert.deepEqual(m.geography!.hierarchy.controller(plan.owner.id, 'objective:pyres')!.state, checkpoint.state);
  assert.deepEqual(m.geography!.hierarchy.controller(plan.owner.id, 'objective:pyres')!.definition, checkpoint.definition);
  fixtures = nativeRows(w).filter(s => s.owner === plan.owner.id); assert.equal(fixtures.length, plan.positions.length);
  assert.equal(w.chests.filter(c => c.rewardSource === chestSource).length, 1, 'Continue cannot duplicate owner chest through ZoneContents');
  for (const s of fixtures) { stand(s); drive(30); }
  assert.equal(m.geography!.hierarchy.controller(plan.owner.id, 'objective:pyres')!.phase, 'complete');
  assert.equal(m.geography!.hierarchy.controller(plan.owner.id, 'objective:pyres')!.receipts.length, 1);
  chest = w.chests.find(c => c.rewardSource === chestSource)!;
  assert.equal(w.chestObjectiveDone(chest), true);
  w.landPartyAt(chest.pos);
  (w as unknown as { updateChests(dt: number): void }).updateChests(1);
  assert.ok(chest.opened); assert.equal(chest.openedAt, w.time);
  assert.equal(m.geography!.hierarchy.controller(plan.owner.id, 'objective:pyres:chest')!.phase, 'complete');
  assert.equal(m.geography!.hierarchy.controller(plan.owner.id, 'objective:pyres:chest')!.receipts.length, 1);
  const contents = serializeCharacter(w).world!.worldmass!.contents;
  const complete = serializeCharacter(w), repeat = makeSimWorld('warrior', 1813);
  assert.ok(applySavedCharacter(repeat, complete)); assert.ok(repeat.adoptWorldState(complete.world));
  repeat.startWorldMass(complete.world!.worldmass!.state.run.seed, complete.world!.worldmass);
  assert.equal(repeat.massRuntime!.geography!.hierarchy.controller(plan.owner.id, 'objective:pyres')!.receipts.length, 1);
  assert.ok(nativeRows(repeat).filter(s => s.owner === plan.owner.id).every(s => s.doodad.kind === PYRE_CFG.kindLit));
  const restoredChest = repeat.chests.find(c => c.rewardSource === chestSource)!;
  assert.ok(restoredChest.opened); assert.equal(restoredChest.openedAt, chest.openedAt);
  assert.equal(repeat.chests.filter(c => c.rewardSource === chestSource).length, 1);
  (repeat as unknown as { updateChests(dt: number): void }).updateChests(2);
  assert.deepEqual(repeat.massRuntime!.snapshot(repeat).contents.drops, contents.drops, 'opened Continue does not refill native drops');
  const completedOwner = repeat.massRuntime!.geography!.hierarchy.controller(plan.owner.id, 'objective:pyres')!;
  const sibling = candidates.find(p => p.owner.id !== plan.owner.id)!;
  repeat.landPartyAt(localOffset(sibling.owner.center, { ...repeat.massRuntime!.origin, x: 0, y: 0 }, 960));
  repeat.massRuntime!.update(repeat, true);
  assert.ok(nativeRows(repeat).some(s => s.owner === sibling.owner.id), 'second production source mounts independently');
  assert.deepEqual(repeat.massRuntime!.geography!.hierarchy.controller(plan.owner.id, 'objective:pyres'), completedOwner,
    'neighbor admission never resets or re-pays the completed operation');
  console.log('PASS default weighted native source/physical placement, native movement/update/readouts, partial/completed character Continue and native chest unlock/open/no-refill');
} finally { productionRestore(); }
