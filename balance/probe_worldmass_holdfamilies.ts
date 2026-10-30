import assert from 'node:assert/strict';
import { Rng, withSeededRandom } from '../src/core/rng';
import { rand, randInt } from '../src/core/math';
import { pressureRampAt, pressureRampCadence } from '../src/data/objectives';
import { RIFT_CFG } from '../src/data/rifts';
import { DIG_CFG } from '../src/data/digsites';
import { ZONES, type ZoneDef } from '../src/data/zones';
import { driveNativeRiftPours, finishNativeDig, type HoldFixture } from '../src/engine/holdObjectives';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MassHierarchy, MASS_HIERARCHY_DEFAULT } from '../src/worldmass/hierarchy';
import { MassObjectives, nativeMassHoldSources, type MassObjectiveHost } from '../src/worldmass/objectives';
import { MassObjectiveBodies, type MassObjectiveBodiesSave } from '../src/worldmass/objectiveBodies';
import { address, localOffset, moveAddress, type MassAddress } from '../src/worldmass/address';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { canonical } from '../src/worldmass/random';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import type { World } from '../src/engine/world';

const fixture = (x = 0): HoldFixture => ({ pos: { x, y: 0 }, charge: 0, recoup: 0, pourAt: 0,
  doodad: { pos: { x, y: 0 }, kind: RIFT_CFG.kind, radius: RIFT_CFG.radius } });
// Independent transcription of the pre-extraction native scheduler, including
// capped beats and the next RNG draw. This catches subtle double advancement.
for (const level of [1, 20, 60]) for (const initial of [0, 8, 100]) {
  const a = [fixture(), fixture(500)], b = structuredClone(a), ra = new Rng(1440), rb = new Rng(1440);
  let bornA = initial, bornB = initial; const traceA: number[] = [], traceB: number[] = [];
  for (let now = 0; now < 80; now += .5) {
    driveNativeRiftPours(a, 9, RIFT_CFG.pour, RIFT_CFG.accent, { now, level, hasPacks: true, random: ra,
      born: () => bornA, spawn: (_, n) => { bornA += n; traceA.push(n); return n; }, flash: () => {} });
    const P = RIFT_CFG.pour, ramp = pressureRampAt(level), cap = Math.max(1, Math.round(P.cap * ramp));
    for (const s of b) {
      if (s.charge >= 9) continue;
      if (s.pourAt === 0) { s.pourAt = now + rb.range(P.every[0], P.every[1]) / pressureRampCadence(ramp); continue; }
      if (now < s.pourAt) continue;
      s.pourAt = now + rb.range(P.every[0], P.every[1]) / pressureRampCadence(ramp);
      if (bornB >= cap) continue;
      const n = Math.min(rb.int(Math.max(1, Math.round(P.batch[0] * ramp)), Math.max(1, Math.round(P.batch[1] * ramp))), cap - bornB);
      bornB += n; traceB.push(n);
    }
  }
  assert.deepEqual(a, b); assert.deepEqual(traceA, traceB); assert.equal(ra.next(), rb.next());
}
for (const hasPacks of [true, false]) for (let seed = 0; seed < 100; seed++) {
  const run = (shared: boolean) => withSeededRandom(seed, () => {
    const trace: string[] = [], spill = () => { trace.push('gem'); Math.random(); }, ambush = () => {
      trace.push('type:' + randInt(0, 6)); trace.push('count:' + randInt(2, 4));
    };
    if (shared) finishNativeDig(fixture(), DIG_CFG, { hasPacks, random: { range: rand, int: randInt }, spillGem: spill, ambush,
      text: () => trace.push('text') });
    else {
      if (Math.random() < DIG_CFG.spoilGemChance) spill();
      if (Math.random() < DIG_CFG.ambush.chance && hasPacks) { ambush(); trace.push('text'); }
    }
    return { trace, next: Math.random() };
  });
  assert.deepEqual(run(true), run(false));
}
console.log('PASS extracted native rift scheduling/cap/pressure and dig spill/type-before-count RNG match independent legacy rules');

const seedRestore = seedGlobalRandom(82449);
const holds = (w: World, kind: 'rifts' | 'unearth') => (w as unknown as { rifts: HoldFixture[]; digs: HoldFixture[] })[kind === 'rifts' ? 'rifts' : 'digs'];
try {
  // This controller fixture owns a flat field/surface vocabulary.
  const base = massAdventure(), terrain = { ...base.terrain }; delete terrain.patches;delete terrain.landforms;delete terrain.regionalDiscoveries;delete terrain.nativeRegional;
  const config: MassAdventure = { terrain: { ...terrain, fields: [], places: [],
    surfaces: [{ id: 'flat', priority: 1, when: [], region: 'ground', color: '#314232', biome: 'downs' }] }, theme: base.theme,
    content: [], startRadius: 0, populationRadius: 600, maxPopulation: 20, pageRadius: 1, samplesPerTick: 256 };
  const w = makeSimWorld('warrior', 82449), runtime = new WorldMassRuntime(74, 'native-hold-bodies', config); runtime.attach(w); w.time = 100;
  const zone: ZoneDef = { ...structuredClone(ZONES.crossroads), id: 'rift-owner-source', level: 1,
    objective: { kind: 'rifts', count: [2, 2], sealSec: 9 }, packs: { count: [1, 1], size: [1, 1], table: [{ id: 'zombie', weight: 1 }] } };
  let h = new MassHierarchy(runtime.generator.run.runId, 74, 960, MASS_HIERARCHY_DEFAULT, [{ id: 'native-hold', source: 'data/rifts', biomes: ['downs'], zone }]);
  const owners = [h.at(address('surface', '0', '0', 800, 800, 960)).zone, h.at(address('surface', '0', '0', 6200, 800, 960)).zone];
  const points = [[800, 1200], [6200, 6600, 7000, 7400]].map(xs => xs.map(x => address('surface', '0', '0', x, 800, 960)));
  const local = (a: MassAddress) => localOffset(a, { ...runtime.origin, x: 0, y: 0 }, 960);
  let max = 3, bodies: MassObjectiveBodies = new MassObjectiveBodies(w, 74, { population: () => bodies.population, maxPopulation: () => max });
  let objectives = new MassObjectives(h, 2), payouts = 0, localNarration = 0;
  const text = w.text.bind(w), heard: string[] = [];
  w.text = (pos, line, color, size, options) => { heard.push(line); text(pos, line, color, size, options); };
  assert.deepEqual(objectives.targets(2, 'board-before-discovery'), []);
  const host: MassObjectiveHost = { get now() { return w.time; }, hold: { ...w.massHoldHost(), text: () => { localNarration++; } },
    installPyres: (o, f) => w.installMassPyres(o, f), installHolds: (o, k, f) => w.installMassHolds(o, k, f),
    installEffects: (o, z, f, s) => bodies.install(o, z, f, s), installChest: (o, c) => w.installMassObjectiveChest(o, c),
    canRetire: (f, own) => w.canRetireMassPyres(f, own), complete: (o, z, label) => { payouts++; w.completeMassObjective(o, z, label); } };
  const contexts = [{ source: 'data/rifts', zone }, { source: 'data/digsites', zone: { ...zone, id: 'dig-owner-source',
    objective: { kind: 'unearth', count: [4, 4], digSec: 3.5 } } as ZoneDef }];
  for (let i = 0; i < 2; i++) assert.ok(objectives.admit(owners[i], points[i], host, local, contexts[i],
    objectives.chestWanted(owners[i], contexts[i]) ? moveAddress(points[i][0], { x: 0, y: 170 }, 960) : undefined));
  assert.equal(objectives.targets(20, 'native-board').length, 2);
  assert.deepEqual(objectives.targets(1, 'native-board'), objectives.targets(1, 'native-board'));
  w.player.pos = { x: -12000, y: -12000 };
  objectives.sync([owners[0]], host, local); assert.equal(objectives.residentCount, 1, 'new empty population can sleep before its first save');
  objectives.sync(owners, host, local); assert.equal(objectives.residentCount, 2);
  const step = (dt: number) => { w.time += dt; objectives.update(dt, host); };
  w.player.pos = { x: -12000, y: -12000 }; step(0); step(12);
  assert.ok(bodies.population > 0 && bodies.population <= max); const oldBodies = w.actors.filter(a => a.tag === 'rift_born');
  assert.ok(oldBodies.every(a => a.fromZoneGen && a.defId === 'zombie')); assert.equal(w.zone.id, 'worldmass_expedition');
  const pourBefore = holds(w, 'rifts').map(s => s.pourAt); max = bodies.population; step(12);
  assert.equal(bodies.population, oldBodies.length); assert.ok(holds(w, 'rifts').every((s, i) => s.pourAt > pourBefore[i]));
  const beat = holds(w, 'rifts').map(s => s.pourAt); step(0); assert.deepEqual(holds(w, 'rifts').map(s => s.pourAt), beat);
  objectives.captureEffects(host);
  const getBodies = (index: number) => h.controller(owners[index].id, 'objective:' + (index ? 'unearth' : 'rifts') + ':population')!.state as MassObjectiveBodiesSave;
  assert.equal(getBodies(0).sequence, getBodies(0).births.length);
  assert.ok(getBodies(0).births.every(b => b.request.table[0].id === 'zombie'));
  console.log('PASS actual detached native births, saved frozen roster, native rift tag, shared population cap and one scheduling advance on refused beats');

  // Settled creatures retain wounds/sheets; pending attacks and nearby actors pin.
  const wounded = oldBodies[0]; wounded.life *= .6;
  wounded.aggroed = true; objectives.sync([], host, local); assert.equal(objectives.residentCount, 1);
  objectives.captureEffects(host); assert.ok(getBodies(0).transient.length, 'active combat is explicitly a limited native checkpoint');
  wounded.aggroed = false; wounded.aiTargetId = undefined; wounded.aiTargetRef = undefined; wounded.threat.clear();
  w.time += 100; objectives.sync([], host, local); assert.equal(objectives.residentCount, 0);
  const dormant = h.snapshot(), dormantBodies = getBodies(0); assert.equal(dormantBodies.transient.length, 0);
  const beforeQuery = canonical(h.snapshot());
  assert.equal(objectives.targets(2, 'dormant-board').length, 2);
  assert.equal(canonical(h.snapshot()), beforeQuery, 'a board reads dormant receipts without creating or waking work');
  assert.equal(bodies.population, 0); assert.equal(w.actors.filter(a => a.tag === 'rift_born').length, 0);
  const clock = (h.controller(owners[0].id, 'objective:rifts')!.state as { fixtures: { pourRemaining: number }[] }).fixtures.map(s => s.pourRemaining);
  h = new MassHierarchy(h.run, 74, 960, MASS_HIERARCHY_DEFAULT, [], dormant); objectives = new MassObjectives(h, 2);
  bodies = new MassObjectiveBodies(w, 74, { population: () => bodies.population, maxPopulation: () => max });
  w.time += 200; objectives.sync(owners, host, local);
  assert.equal(w.actors.find(a => a.tag === 'rift_born')!.life, wounded.life);
  assert.deepEqual(holds(w, 'rifts').map(s => s.pourAt - w.time), clock);
  assert.ok(w.actors.filter(a => a.tag === 'rift_born').every(a => !oldBodies.includes(a)));
  console.log('PASS actual active dependency pin, explicit transient policy, settled exact wounds and paused rift remaining clock across dormant Continue');

  // Deaths are receipts, not births on remount. The native dig opens its own
  // low-stone body and produces its ordinary gem/ambush through real World APIs.
  for (const a of w.actors.filter(a => a.tag === 'rift_born')) { a.dead = true; a.life = 0; }
  max = 20;
  for (const s of holds(w, 'unearth')) { w.player.pos = { x: s.pos.x + 50, y: s.pos.y }; step(4); }
  assert.ok(holds(w, 'unearth').every(s => s.doodad.kind === DIG_CFG.kindDug));
  assert.equal(h.controller(owners[1].id, 'objective:unearth')!.phase, 'complete'); assert.equal(payouts, 1);
  assert.equal(objectives.target(owners[1].id)!.complete, true);
  assert.equal(objectives.targets(20, 'native-board').length, 1);
  objectives.captureEffects(host); const dug = getBodies(1);
  assert.ok(dug.spills.length > 0, 'fixed native roll exercises actual gem spill');
  assert.ok(dug.births.length > 0, 'fixed native roll exercises actual ambush');
  assert.equal(localNarration, 0); assert.ok(!heard.includes('the turned earth answers!'));
  assert.equal(w.flashes.filter(f => f.radius === 110 && f.maxLife === .8).length, 4,
    'each native opened mound retains its flare alongside real ambush bodies');
  const drops = w.drops.length, births = dug.births.length; step(30); objectives.captureEffects(host);
  assert.equal(getBodies(1).births.length, births); assert.equal(w.drops.length, drops); assert.equal(payouts, 1);
  assert.equal(getBodies(0).births.filter(b => b.bodies.some(a => a.dead)).length, dormantBodies.births.length);
  assert.ok(nativeMassHoldSources(base.nativeCountry).some(s => s.objective.kind === 'rifts'));
  assert.ok(nativeMassHoldSources(base.nativeCountry).some(s => s.objective.kind === 'unearth'));
  assert.ok(objectives.views(w.player.pos, 'unearth').every(v => v.kind === 'unearth'));
  console.log('PASS native opened mound, real gem/ambush factories, independent completion/reward, defeated body receipts and no repeated spill on later updates');
  const invalid = structuredClone(getBodies(0)); invalid.births[0].bodies[0].key = 'foreign-owner';
  const verifier = new MassObjectiveBodies(w, 74, { population: () => 0, maxPopulation: () => 20 });
  const beforeActors = [...w.actors];
  assert.throws(() => verifier.install(owners[0].id, zone, holds(w, 'rifts'), invalid), /body receipt/);
  assert.deepEqual(w.actors, beforeActors, 'malformed ownership fails before any detached birth is published');
  const noBudget = new MassObjectiveBodies(w, 74, { population: () => 0, maxPopulation: () => 0 });
  assert.equal(noBudget.install(owners[0].id, zone, holds(w, 'rifts'), getBodies(0)), null);
  assert.deepEqual(w.actors, beforeActors, 'restore capacity refusal publishes no partial population');
  console.log('PASS malformed body ownership and unavailable restore population refuse atomically');
} finally { seedRestore(); }

// Production source selection + main dispatch + actual character Continue.
const productionRestore = seedGlobalRandom(901744);
try {
  let w = makeSimWorld('warrior', 901744); w.startWorldMass(901744); w.player.invulnerable = true;
  let m = w.massRuntime!;
  const plans = new Map<string, NonNullable<ReturnType<NonNullable<typeof m.geography>['plannedAt']>>>();
  for (let r = 0; r <= 18 && plans.size < 2; r++) for (let y = -r; y <= r && plans.size < 2; y++) for (let x = -r; x <= r && plans.size < 2; x++) {
    if (Math.max(Math.abs(x), Math.abs(y)) !== r) continue;
    const plan = m.geography!.plannedAt(m.walk.at(x * 5400 + 2700, y * 5400 + 2700)), kind = plan?.context.zone.objective.kind;
    if (plan && (kind === 'rifts' || kind === 'unearth') && !plans.has(kind)) plans.set(kind, plan);
  }
  assert.equal(plans.size, 2, 'default generated country must actually offer both native objective families');
  for (const kind of ['rifts', 'unearth'] as const) {
    const plan = plans.get(kind)!;
    const local = (at: MassAddress) => localOffset(at, { ...m.origin, x: 0, y: 0 }, 960);
    w.landPartyAt(local(plan.owner.center)); m.update(w, true);
    let rows = holds(w, kind).filter(s => s.owner === plan.owner.id); assert.equal(rows.length, plan.positions.length);
    w.landPartyAt({ x: rows[0].pos.x + 60, y: rows[0].pos.y });
    w.time += .7; (w as unknown as { updateObjective(dt: number): void }).updateObjective(.7);
    assert.ok(rows[0].charge > 0); assert.ok(w.dwellRingsView().some(r => r.kind === (kind === 'rifts' ? 'rift' : 'digsite')));
    assert.ok(kind === 'rifts' ? w.riftsView() : w.digsView());
    if (kind === 'rifts') {
      w.landPartyAt({ x: rows[0].pos.x + 500, y: rows[0].pos.y + 500 }); w.time += 12;
      (w as unknown as { updateObjective(dt: number): void }).updateObjective(12);
      const poured = w.actors.find(a => !a.dead && a.tag === 'rift_born');
      assert.ok(poured); poured.life *= .61;
    }
    const saved = serializeCharacter(w), before = m.geography!.hierarchy.controller(plan.owner.id, 'objective:' + kind)!;
    const bodyBefore = m.geography!.hierarchy.controller(plan.owner.id, 'objective:' + kind + ':population')!.state as MassObjectiveBodiesSave;
    if (kind === 'rifts') assert.ok(bodyBefore.births.some(b => b.bodies.length), 'production rift actually pours before character Continue');
    const continued = structuredClone(saved);
    if (kind === 'rifts') for (const owner of continued.world!.worldmass!.geography!.owners)
      owner.controllers = owner.controllers.filter(c => !['objective-access','physical-intel','beacon-survey'].includes(c.id));
    const fresh = makeSimWorld('warrior', 901745); assert.ok(applySavedCharacter(fresh, continued)); assert.ok(fresh.adoptWorldState(continued.world));
    fresh.startWorldMass(continued.world!.worldmass!.state.run.seed, continued.world!.worldmass); w = fresh; m = w.massRuntime!;
    if (kind === 'rifts') {
      assert.ok(m.geography!.accessStats.legacyUnverified > 0);
      const legacy = m.geography!.plannedAt(plan.owner.center)!;
      assert.equal(legacy.legacyAccess, 'legacy-unverified-access');
      assert.deepEqual(legacy.positions, plan.positions);
      assert.deepEqual(legacy.context, plan.context);
      assert.equal(legacy.access, undefined, 'Continue never invents a corridor over prior geography');
      assert.deepEqual(m.geography!.hierarchy.controller(plan.owner.id, 'objective:rifts')!.receipts, before.receipts);
    }
    assert.deepEqual(m.geography!.hierarchy.controller(plan.owner.id, 'objective:' + kind)!.state, before.state);
    const bodyAfter = m.geography!.hierarchy.controller(plan.owner.id, 'objective:' + kind + ':population')!.state as MassObjectiveBodiesSave;
    assert.deepEqual(bodyAfter.births.map(b => ({ request: b.request, bodies: b.bodies.map(a => ({ key: a.key, monster: a.monster, dead: a.dead, life: a.life, pos: a.pos })) })),
      bodyBefore.births.map(b => ({ request: b.request, bodies: b.bodies.map(a => ({ key: a.key, monster: a.monster, dead: a.dead, life: a.life, pos: a.pos })) })));
    rows = holds(w, kind).filter(s => s.owner === plan.owner.id); assert.equal(rows.length, plan.positions.length);
    assert.equal(w.zone.id, 'worldmass_expedition');
    if (kind === 'unearth') {
      // Clear threats through the real death artery to isolate fixture/reward
      // persistence; this is not a claim about combat difficulty or tactics.
      for (const s of rows) {
        for (const a of [...w.actors]) if (!a.dead && a.team === 'enemy') w.kill(a, false, w.player);
        w.landPartyAt({ x: s.pos.x + 60, y: s.pos.y }); w.time += 5;
        (w as unknown as { updateObjective(dt: number): void }).updateObjective(5);
      }
      assert.equal(m.geography!.hierarchy.controller(plan.owner.id, 'objective:unearth')!.phase, 'complete');
      const done = serializeCharacter(w), doneBodies = m.geography!.hierarchy.controller(plan.owner.id, 'objective:unearth:population')!.state;
      const drops = done.world!.worldmass!.contents.drops;
      const reload = makeSimWorld('warrior', 901746); assert.ok(applySavedCharacter(reload, done)); assert.ok(reload.adoptWorldState(done.world));
      reload.startWorldMass(done.world!.worldmass!.state.run.seed, done.world!.worldmass); w = reload; m = w.massRuntime!;
      w.time += 5; (w as unknown as { updateObjective(dt: number): void }).updateObjective(5);
      assert.equal(m.geography!.hierarchy.controller(plan.owner.id, 'objective:unearth')!.receipts.length, 1);
      assert.deepEqual((m.geography!.hierarchy.controller(plan.owner.id, 'objective:unearth:population')!.state as MassObjectiveBodiesSave).spills,
        (doneBodies as MassObjectiveBodiesSave).spills);
      assert.deepEqual(serializeCharacter(w).world!.worldmass!.contents.drops, drops, 'completed mound Continue never spills again');
    }
  }
  console.log('PASS default generated rift/unearth scenes, exact wounded legacy-access Continue without reroll, partial/completed mound Continue without reward or spill duplication');
} finally { productionRestore(); }
