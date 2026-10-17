import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { mulberry32, seedGlobalRandom } from '../src/sim/rng';
import { PUZZLE_KINDS, capturePuzzleKindles, restorePuzzleKindles, type PuzzleHost, type PuzzleRun, type PuzzleSpec } from '../src/engine/puzzles';
import { COURT_SHRINE_KIND, type CourtShrineSpec } from '../src/data/puzzles';
import { resolveNativeFeature, compileNativeFeature, nativeFeatureAdmission } from '../src/worldmass/nativeFeatures';
import { translateNativeFeature, type NativeFeatureInstance } from '../src/worldmass/nativeResidency';
import { MassCourtPuzzles, massCourtPuzzlesSupported, courtSeats } from '../src/worldmass/courtPuzzles';
import { nativeWorldCapabilities } from '../src/worldmass/nativeHost';
import { address } from '../src/worldmass/address';
import { canonical } from '../src/worldmass/random';

const restoreRandom = seedGlobalRandom(611937);
try {
  const world = makeSimWorld('warrior', 611937);
  const nativeHost = (world as unknown as { puzzleHost(): PuzzleHost }).puzzleHost();
  let serial = 0;
  const make = (kind: string, saved?: { done: boolean; state: unknown; kindles?: number[] }, at = 100) => {
    const def = PUZZLE_KINDS[kind], count = kind === 'ember' ? 6 : 4, id = 'codec-' + serial++;
    const clock = { now: at, near: true }, spec: PuzzleSpec = { kind, count: [count, count] };
    const nodes = Array.from({ length: count }, (_, idx) => {
      const n = world.createMonster(def.nodeMonster, 11, 'enemy'); n.puzzleNode = { id, idx }; return n;
    });
    const host: PuzzleHost = { ...nativeHost, now: () => clock.now, rng: mulberry32(233), heroNear: () => clock.near,
      complete: r => { r.done = true; } };
    const run: PuzzleRun = { id, kind: def, spec, at: { x: 1000, y: 1000 }, nodes, hums: new Map(), state: {}, done: false, isObjective: false };
    def.boot(run, host);
    if (saved) {
      run.done = saved.done; def.checkpoint!.restore(run, host, structuredClone(saved.state));
      if (saved.kindles) restorePuzzleKindles(run, host, saved.kindles);
    }
    const advance = (dt: number) => {
      clock.now += dt;
      for (const n of nodes) for (const s of n.statuses) s.remaining = Math.max(0, s.remaining - dt);
      if (!run.done) def.tick?.(run, host, dt);
    };
    const strike = (idx: number) => def.struck!(run, nodes[idx], host, world.player);
    const snapshot = () => ({ done: run.done, state: def.checkpoint!.capture(run, host), kindles: capturePuzzleKindles(run) });
    return { run, clock, host, advance, strike, snapshot };
  };
  const same = (a: unknown, b: unknown): void => {
    if (typeof a === 'number' && typeof b === 'number') { assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`); return; }
    if (Array.isArray(a) && Array.isArray(b)) { assert.equal(a.length, b.length); a.forEach((v, i) => same(v, b[i])); return; }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      assert.deepEqual(Object.keys(a), Object.keys(b)); for (const k of Object.keys(a)) same(Reflect.get(a, k), Reflect.get(b, k)); return;
    }
    assert.deepEqual(a, b);
  };
  const absence = (rig: ReturnType<typeof make>, elapsed: number, boundary?: number) => {
    const saved = rig.snapshot(), start = rig.clock.now; rig.clock.near = false;
    if (boundary !== undefined && boundary <= elapsed) { rig.advance(boundary); rig.advance(elapsed - boundary); }
    else rig.advance(elapsed);
    const resumed = make(rig.run.kind.id, saved, start + elapsed);
    resumed.run.kind.checkpoint!.absent!(resumed.run, resumed.host, elapsed);
    same(resumed.snapshot(), rig.snapshot());
    return resumed;
  };
  for (const elapsed of [.2, 20]) {
    const r = make('refrain'); r.advance(1.6); r.advance(.1);
    const seq = [...r.run.state.seq as number[]]; const restored = absence(r, elapsed);
    assert.deepEqual(restored.run.state.seq, seq); assert.equal(restored.run.state.note, 1);
  }
  for (const afterDeadline of [-1, .3, 20]) {
    const r = make('refrain'); r.advance(1.6);
    while (r.run.state.phase === 'play') r.advance(.85);
    r.strike((r.run.state.seq as number[])[0]);
    const left = (r.run.state.at as number) - r.clock.now;
    const resumed = absence(r, left + afterDeadline, left);
    assert.equal(resumed.run.state.phase, afterDeadline < 0 ? 'answer' : 'play');
    assert.equal(resumed.run.state.progress, afterDeadline < 0 ? 1 : 0);
  }
  for (const elapsed of [.1, 60]) {
    const r = make('tempo'); r.advance(1.2); r.advance(.2); r.strike((r.run.state.order as number[])[0]);
    const restored = absence(r, elapsed); assert.equal(restored.run.state.progress, 1);
  }
  for (const kind of ['accord', 'ember']) for (const elapsed of [.3, 60]) {
    const r = make(kind); r.strike(0);
    if (kind === 'accord') { r.strike(2); r.strike(1); }
    absence(r, elapsed);
  }
  console.log('PASS four native codecs against the original unheard tick laws: refrain playback/answer expiry, tempo phase preservation, accord and ember deadline decay');

  for (const kind of ['refrain', 'tempo', 'accord', 'ember']) {
    const rig = make(kind); rig.run.done = true; rig.run.kind.solved!(rig.run, rig.host);
    const saved = rig.snapshot(), resumed = make(kind, saved, rig.clock.now); same(resumed.snapshot(), saved);
    assert.ok(resumed.run.done, 'finite native memory-solved state also round-trips');
    absence(rig, 3600);
    const legacy = { done: saved.done, state: saved.state };
    assert.ok(make(kind, legacy).run.done, 'an older checkpoint without literal display times remains valid');
  }
  for (const kind of ['refrain', 'tempo']) {
    const r = make(kind), saved = r.snapshot(), malformed = structuredClone(saved);
    const state = malformed.state as { seq?: number[]; order?: number[] };
    if (state.seq) state.seq[0] = 999; else state.order![0] = state.order![1];
    assert.throws(() => make(kind, malformed), /Invalid .* checkpoint/);
    const falseDone = structuredClone(saved); falseDone.done = true;
    assert.throws(() => make(kind, falseDone), /Invalid .* checkpoint/);
    const badLight = structuredClone(saved); badLight.kindles[0] = Infinity;
    assert.throws(() => make(kind, badLight), /Invalid puzzle kindle checkpoint/);
  }
  console.log('PASS finite memory-solved round-trips and malformed musical state refusal');

  const instance = (seed: number): NativeFeatureInstance => {
    const id = 'native-court-source/' + seed, request = { id, seed, level: 11,
      source: { kind: 'massif' as const, id: 'well_court', tileset: 'courtland', scope: 'landform' as const, poolIndex: 1 } };
    const blueprint = compileNativeFeature(resolveNativeFeature(request)), offset = { x: 6300, y: 9300 };
    return { id, blueprint, placement: { id, request, origin: address('surface', '6', '9', 540, 660, 960) }, offset,
      grid: { id, grid: blueprint.grid!, offset }, layout: translateNativeFeature(blueprint, id, offset), entrances: [], zone: blueprint.descriptor.zone };
  };
  world.time = 1000; world.player.pos = { x: -10000, y: -10000 };
  let budget = 32;
  const manager: MassCourtPuzzles = new MassCourtPuzzles(world, { population: () => manager.population, maxPopulation: () => budget });
  for (const [seed, kind] of [[2, 'accord'], [5, 'tempo'], [6, 'ember'], [21, 'refrain']] as const) {
    const i = instance(seed), source = canonical(i.blueprint.descriptor), spec = i.blueprint.descriptor.sidechannels!.puzzles[0].spec as CourtShrineSpec;
    assert.equal(spec.shrine.kind, kind); assert.equal(spec.kind, COURT_SHRINE_KIND);
    assert.ok(massCourtPuzzlesSupported(i));
    assert.ok(nativeFeatureAdmission(i.blueprint, nativeWorldCapabilities()).ok);
    const missing = new Set(nativeWorldCapabilities()); missing.delete('puzzle:' + kind);
    assert.ok(!nativeFeatureAdmission(i.blueprint, missing).ok);
    const before = [...world.actors], binding = manager.prepare(i)!;
    assert.deepEqual(world.actors, before, 'preparation stays detached'); binding.mount();
    const run = manager.views()[0]; assert.equal(run.kind, PUZZLE_KINDS[kind]); assert.ok(Object.isFrozen(run.spec));
    assert.deepEqual(run.nodes.map(n => n.pos), courtSeats(spec).map(p => ({ x: p.x + i.offset.x, y: p.y + i.offset.y })));
    assert.deepEqual(run.nodes.map(n => n.defId), run.nodes.map(() => spec.node));
    assert.equal(canonical(run.rewardZone), canonical(i.zone)); assert.equal(canonical(i.blueprint.descriptor), source);
    world.player.pos = { x: run.at.x + 620, y: run.at.y };
    assert.equal(binding.canRetire(), false, 'the native musical earshot is retained beyond the ordinary nearest-node guard');
    assert.throws(() => binding.detach(), /live dependencies/);
    world.player.pos = { x: -10000, y: -10000 };
    binding.rollbackMount(); assert.equal(manager.population, 0); assert.deepEqual(world.actors, before);
    budget = spec.count![0] - 1;
    assert.throws(() => manager.prepare(i), /complete node reservation/); assert.deepEqual(world.actors, before); budget = 32;
    const unsupported = { ...i, zone: { ...i.zone, spoils: 'none' as const } };
    assert.equal(massCourtPuzzlesSupported(unsupported), false, 'unsupported reward contexts refuse the complete feature');
    const blocked = { ...i, layout: { ...i.layout, doodads: [...i.layout.doodads,
      { kind: 'wayshrine', pos: { x: courtSeats(spec)[0].x + i.offset.x, y: courtSeats(spec)[0].y + i.offset.y }, radius: 30 }] } };
    assert.equal(massCourtPuzzlesSupported(blocked), false, 'a native node cannot be shifted out of its frozen ring to evade a blocker');
  }
  console.log('PASS all four actual generated courts: immutable phased geometry, native node species/context, detached preparation, atomic rollback, full-ring capacity and whole-feature negatives');
} finally { restoreRandom(); }
