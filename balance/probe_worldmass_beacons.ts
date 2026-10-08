import assert from 'node:assert/strict';
import { Rng, withSeededRandom } from '../src/core/rng';
import { rand } from '../src/core/math';
import type { Actor } from '../src/engine/actor';
import { pressureRampAt, pressureRampCadence } from '../src/data/objectives';
import { ZONES, type PackTableEntry, type ZoneDef } from '../src/data/zones';
import { BEACON_CFG } from '../src/data/beacons';
import { driveNativeBeaconReinforce, nativeBeaconConfig, resolveNativeBeacon, type NativeBeaconHost, type NativeBeaconState } from '../src/engine/beaconObjectives';
import type { HoldFixture } from '../src/engine/holdObjectives';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MassHierarchy, MASS_HIERARCHY_DEFAULT } from '../src/worldmass/hierarchy';
import { MassObjectives, nativeMassHoldSources, resolveMassHoldContext, type MassObjectiveHost } from '../src/worldmass/objectives';
import { MassObjectiveBodies, type MassObjectiveBirth, type MassObjectiveBodiesSave } from '../src/worldmass/objectiveBodies';
import { address, localOffset, moveAddress, type MassAddress } from '../src/worldmass/address';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { canonical } from '../src/worldmass/random';

const fixture = (x = 0): HoldFixture => ({ pos: { x, y: 0 }, charge: 1, recoup: 0, pourAt: 0,
  doodad: { pos: { x, y: 0 }, kind: BEACON_CFG.kind, radius: BEACON_CFG.radius } });
let draws = 0;
assert.deepEqual(resolveNativeBeacon('beacon', { int: () => { draws++; return 4; } }), { kind: 'beacon' });
assert.equal(draws, 0);
assert.deepEqual(resolveNativeBeacon('circuit', { int: (lo, hi) => { assert.equal(lo, 3); assert.equal(hi, 4); draws++; return 4; } }),
  { kind: 'beacon', count: 4, chargeSec: 8 });
assert.equal(draws, 1);
const catalogue = nativeMassHoldSources(massAdventure().nativeCountry);
const circuit = catalogue.find(s => s.alias === 'circuit')!;
assert.ok(circuit && circuit.objective.kind === 'beacon');
assert.deepEqual(resolveMassHoldContext(ZONES.crossroads, circuit, 5, { int: () => 3 }).zone.objective, { kind: 'beacon', count: 3, chargeSec: 8 });
assert.ok(circuit.totalWeight > circuit.weight, 'native frequency includes unsupported kinds in its denominator');

// Independent transcription of the original native scheduler, including table
// admission BEFORE batch draw and next-deadline advancement BEFORE capacity.
for (const level of [1, 20, 60]) for (const initial of [0, 7, 100]) for (const roster of ['native', 'mix', 'empty']) {
  const run = (shared: boolean) => {
    const rng = new Rng(1722), state: NativeBeaconState = { reinforceAt: 0 }, fixtures = [fixture(), fixture(900)];
    let born = initial; const trace: unknown[] = [], config = { ...BEACON_CFG.reinforce };
    const tables = { native: roster === 'native' ? [{ id: 'zombie', weight: 1 }] : [], mix: roster === 'mix' ? [{ id: 'skeleton', weight: 1 }] : [] };
    const host: NativeBeaconHost = { now: 0, level, player: { x: 880, y: 0 }, random: rng, born: () => born,
      tables: p => { trace.push(['table', p.x]); return tables; },
      spawn: (s, n) => { trace.push(['spawn', s.pos.x, n]); born += n; return n; }, lure: () => {},
      flash: (p, r, c, life) => { trace.push(['flash', p.x, r, c, life]); } };
    for (let now = 0; now < 90; now += .5) {
      host.now = now;
      // Exact zero-charge pause and resumed already-due operation clock.
      fixtures.forEach(s => { s.charge = now >= 18 && now < 40 ? 0 : 1; });
      if (shared) driveNativeBeaconReinforce(fixtures, 22, config, BEACON_CFG.accent, state, host);
      else {
        if (!fixtures.some(s => s.charge > 0 && s.charge < 22)) continue;
        const ramp = pressureRampAt(level), beat = () => rng.range(config.every[0], config.every[1]) / pressureRampCadence(ramp);
        if (state.reinforceAt === 0) { state.reinforceAt = now + beat(); continue; }
        if (now < state.reinforceAt) continue;
        state.reinforceAt = now + beat(); const cap = Math.max(1, Math.round(config.cap * ramp));
        if (born >= cap) continue;
        let at: HoldFixture | undefined, bd = Infinity;
        for (const s of fixtures) if (s.charge > 0 && s.charge < 22) {
          const d = Math.hypot(s.pos.x - host.player.x, s.pos.y - host.player.y);
          if (d < bd) { bd = d; at = s; }
        }
        if (!at) continue;
        const t = host.tables(at.pos, config); if (!t.native.length && !t.mix.length) continue;
        const n = Math.min(rng.int(Math.max(1, Math.round(config.batch[0] * ramp)), Math.max(1, Math.round(config.batch[1] * ramp))), cap - born);
        host.spawn(at, n, config, t); host.flash({ ...at.pos }, 40, BEACON_CFG.accent, .35);
      }
    }
    return { trace, state, born, next: rng.next() };
  };
  assert.deepEqual(run(true), run(false));
}
console.log('PASS exact native beacon/circuit resolver, source frequency, scheduler draw ordering, cap, mix-only roster and idle-clock semantics');

const restore = seedGlobalRandom(41376);
try {
  // This controller fixture owns a flat field/surface vocabulary.
  const base = massAdventure(), terrain = { ...base.terrain }; delete terrain.patches;delete terrain.landforms;delete terrain.regionalDiscoveries;delete terrain.nativeRegional;
  const config: MassAdventure = { terrain: { ...terrain, fields: [], places: [],
    surfaces: [{ id: 'beacon-flat', priority: 1, when: [], region: 'ground', color: '#314232', biome: 'downs' }] }, theme: base.theme,
    content: [], startRadius: 0, populationRadius: 600, maxPopulation: 20, pageRadius: 1, samplesPerTick: 256 };
  const w = makeSimWorld('warrior', 41376), runtime = new WorldMassRuntime(81, 'beacon-native', config); runtime.attach(w); w.time = 100;
  const zone: ZoneDef = { ...structuredClone(ZONES.crossroads), id: 'beacon-source', level: 1,
    objective: { kind: 'beacon', chargeSec: 22, contest: false, reinforce: { every: [9, 9], batch: [2, 2], cap: 4, mixFactions: [], levelScale: false } },
    packs: { count: [1, 1], size: [1, 1], table: [{ id: 'zombie', weight: 1 }] } };
  // The real detached factory must consume the original native draw order,
  // including the short-circuited mix-only case (no coin when native is empty).
  const factory = w as unknown as { weightedPick(t: PackTableEntry[], level: number): string };
  const shape = (a: Actor) => ({ monster: a.defId, pos: a.pos, life: a.life, radius: a.radius, faction: a.faction,
    stats: ['life', 'armour', 'evasion', 'moveSpeed', 'damage'].map(k => a.sheet.get(k)), tag: a.tag });
  for (const mixOnly of [false, true]) for (const seed of [7, 219]) {
    const tune = { ...BEACON_CFG.reinforce, mixChance: .5 };
    const request: MassObjectiveBirth = { owner: 'factory-parity', slot: 0, sequence: 0, seed, zone,
      at: { x: 800, y: 800 }, kind: 'beacon', count: 5, config: tune,
      table: mixOnly ? [] : [{ id: 'zombie', weight: 1 }], mixTable: [{ id: 'skeleton_warrior', weight: 1 }] };
    const original = withSeededRandom(seed, () => Array.from({ length: request.count }, () => {
      const table = request.mixTable.length && (!request.table.length || rand(0, 1) < tune.mixChance) ? request.mixTable : request.table;
      const a = w.createMonster(factory.weightedPick(table, zone.level), Math.max(1, zone.level + tune.levelBonus), 'enemy');
      const angle = rand(0, Math.PI * 2), radius = rand(tune.radius[0], tune.radius[1]);
      a.pos = w.clampPos({ x: request.at.x + Math.cos(angle) * radius, y: request.at.y + Math.sin(angle) * radius }, a.radius);
      a.tag = 'spire_drawn'; return shape(a);
    }));
    assert.deepEqual(w.createMassObjectiveBodies(request).map(shape), original);
  }
  console.log('PASS actual native reinforcement factory identity, stats, faction, position and mixed/mix-only draw-order parity');
  let h = new MassHierarchy(runtime.generator.run.runId, 81, 960, MASS_HIERARCHY_DEFAULT, [{ id: 'beacon', source: 'data/beacons', biomes: ['downs'], zone }]);
  const owners = [h.at(address('surface', '0', '0', 800, 800, 960)).zone, h.at(address('surface', '0', '0', 6200, 800, 960)).zone];
  const points = [[800], [6200, 6700, 7200]].map(xs => xs.map(x => address('surface', '0', '0', x, 800, 960)));
  const local = (a: MassAddress) => localOffset(a, { ...runtime.origin, x: 0, y: 0 }, 960);
  let cap = 4, bodies: MassObjectiveBodies = new MassObjectiveBodies(w, 81, { population: () => bodies.population, maxPopulation: () => cap });
  let objectives = new MassObjectives(h, 2), narration = 0;
  const transitions: string[] = [], installed = new Map<string, HoldFixture[]>();
  const host: MassObjectiveHost = { get now() { return w.time; }, hold: { ...w.massHoldHost(), text: () => { narration++; } },
    installPyres: (o, f) => w.installMassPyres(o, f), installHolds: (o, k, f) => { installed.set(o, f); const detach = w.installMassHolds(o, k, f); return () => { detach(); installed.delete(o); }; },
    installEffects: (o, z, f, s) => bodies.install(o, z, f, s), installChest: (o, c) => w.installMassObjectiveChest(o, c),
    canRetire: (f, own) => w.canRetireMassPyres(f, own), reveal: o => { transitions.push('reveal:' + o); },
    complete: (o, z, label) => { transitions.push('pay:' + o); w.completeMassObjective(o, z, label); } };
  const contexts = [{ source: 'data/beacons', zone }, { source: 'data/beacons/circuit', zone: { ...zone,
    objective: { kind: 'beacon', count: 3, chargeSec: 8, contest: false, reinforce: false } } as ZoneDef }];
  assert.equal(objectives.admit(owners[0], points[0], { ...host, reveal: undefined }, local, contexts[0]), false);
  assert.equal(h.controller(owners[0].id, 'objective:beacon'), undefined, 'missing discoveries refuses before enrollment');
  for (let i = 0; i < 2; i++) {
    assert.equal(objectives.fixtureRadius(owners[i], contexts[i]), i ? 11 : 15);
    assert.ok(objectives.admit(owners[i], points[i], host, local, contexts[i],
      objectives.chestWanted(owners[i], contexts[i]) ? moveAddress(points[i][0], { x: 0, y: 170 }, 960) : undefined));
  }
  const rows = (i: number) => installed.get(owners[i].id)!;
  const step = (dt: number) => { w.time += dt; objectives.update(dt, host); };
  w.player.pos = { x: rows(0)[0].pos.x + 40, y: rows(0)[0].pos.y }; step(.5);
  assert.equal(rows(0)[0].charge, .5); assert.equal(bodies.population, 0, 'first bank arms a clock without immediate births');
  assert.equal(w.flashes.filter(f => f.radius === 90 && f.maxLife === .5).length, 1); assert.equal(narration, 0);
  const moth = w.createMonster('zombie', 1, 'enemy'); moth.pos = { x: rows(0)[0].pos.x + 200, y: rows(0)[0].pos.y };
  assert.deepEqual(w.lureFor(moth), { pos: rows(0)[0].pos, pace: .5, standoff: 120, tier: 0 });
  w.setLure('foreign-owner-control', { x: -10000, y: -10000 }, 100, .2, 30, 1000);
  w.player.pos = { x: -12000, y: -12000 }; objectives.sync([], host, local);
  const lease = (h.controller(owners[0].id, 'objective:beacon:population')!.state as MassObjectiveBodiesSave).lures!;
  assert.equal(lease.length, 1); assert.ok(Math.abs(lease[0].remaining - .6) < 1e-10);
  assert.equal(w.lureFor(moth), null, 'exact owner retirement removes its lure');
  moth.pos = { x: -10000, y: -10000 }; assert.equal(w.lureFor(moth)!.pace, .2, 'foreign lure survives retirement');
  w.time += 200; objectives.sync(owners, host, local);
  moth.pos = { x: rows(0)[0].pos.x + 200, y: rows(0)[0].pos.y };
  assert.equal(w.lureFor(moth)!.pace, .5, 'dormant lease restores only its saved remaining lifetime');
  w.player.pos = { x: -12000, y: -12000 }; step(9);
  assert.equal(bodies.population, 2); const first = w.actors.filter(a => a.tag === 'spire_drawn');
  assert.ok(first.every(a => a.defId === 'zombie'));
  const getSave = () => h.controller(owners[0].id, 'objective:beacon:population')!.state as MassObjectiveBodiesSave;
  objectives.captureEffects(host); const pending = h.controller(owners[0].id, 'objective:beacon')!.state as { reinforceRemaining: number };
  assert.equal(pending.reinforceRemaining, 9);
  assert.equal(getSave().births[0].request.kind, 'beacon'); assert.equal(getSave().births[0].request.table[0].id, 'zombie');
  cap = bodies.population; const seq = getSave().sequence; step(9); objectives.captureEffects(host);
  assert.equal(getSave().sequence, seq, 'full shared budget does not publish a partial/empty birth receipt');
  assert.equal((h.controller(owners[0].id, 'objective:beacon')!.state as { reinforceRemaining: number }).reinforceRemaining, 9);
  first[0].life *= .6; first[0].aggroed = true;
  objectives.sync([], host, local); assert.equal(objectives.residentCount, 1, 'own active foe pins; empty circuit sleeps');
  first[0].aggroed = false; first[0].aiTargetId = undefined; first[0].aiTargetRef = undefined; first[0].threat.clear();
  w.time += 100; objectives.sync([], host, local); assert.equal(objectives.residentCount, 0);
  assert.equal(bodies.population, 0); const saved = h.snapshot(), bodySave = getSave();
  assert.equal(bodySave.transient.length, 0);
  h = new MassHierarchy(h.run, 81, 960, MASS_HIERARCHY_DEFAULT, [], saved); objectives = new MassObjectives(h, 2);
  bodies = new MassObjectiveBodies(w, 81, { population: () => bodies.population, maxPopulation: () => cap }); w.time += 200;
  objectives.sync(owners, host, local); assert.equal(bodies.population, 2);
  assert.equal(w.actors.find(a => a.tag === 'spire_drawn')!.life, first[0].life);
  assert.equal(rows(0)[0].charge, .5); assert.equal(rows(1).length, 3);
  objectives.captureEffects(host); assert.equal(getSave().sequence, seq);
  for (const a of w.actors.filter(a => a.tag === 'spire_drawn')) { a.dead = true; a.life = 0; }
  for (let i = 0; i < 2; i++) for (const f of rows(i)) { w.player.pos = { x: f.pos.x + 40, y: f.pos.y }; step(30); }
  assert.deepEqual(transitions, ['reveal:' + owners[0].id, 'pay:' + owners[0].id, 'reveal:' + owners[1].id, 'pay:' + owners[1].id]);
  assert.equal(rows(0)[0].doodad.kind, BEACON_CFG.kindLit); assert.ok(rows(1).every(s => s.doodad.kind === BEACON_CFG.kindWayLit));
  assert.equal(w.flashes.filter(f => f.radius === 240 && f.color === BEACON_CFG.flare).length, 1);
  assert.equal(w.flashes.filter(f => f.radius === 160 && f.color === BEACON_CFG.flare).length, 3);
  assert.equal(narration, 0); step(100); assert.equal(transitions.length, 4);
  objectives.captureEffects(host); const completed = h.snapshot(), before = canonical(completed);
  assert.doesNotThrow(() => new MassObjectives(new MassHierarchy(h.run, 81, 960, MASS_HIERARCHY_DEFAULT, [], completed)));
  assert.equal(canonical(completed), before);
  const bad = structuredClone(completed);
  for (const owner of bad.owners) for (const c of owner.controllers) if (c.id === 'objective:beacon') c.receipts = c.receipts.filter(r => r.id !== 'native-beacon-reveal');
  assert.throws(() => new MassObjectives(new MassHierarchy(h.run, 81, 960, MASS_HIERARCHY_DEFAULT, [], bad)), /checkpoint/);
  assert.equal(w.zone.id, 'worldmass_expedition');
  console.log('PASS actual native geographic beacon/circuit fixtures, timed bodies, shared cap, quiet wounds, independent Continue, no narration, once discovery then reward');
  // Source tuning is a value snapshot, not a future read of the registry.
  const frozen = h.controller(owners[0].id, 'objective:beacon')!.definition as { beacon: ReturnType<typeof nativeBeaconConfig> };
  assert.equal(frozen.beacon.need, 22); assert.equal(frozen.beacon.reinforce && frozen.beacon.reinforce.every[0], 9);
} finally { restore(); }
