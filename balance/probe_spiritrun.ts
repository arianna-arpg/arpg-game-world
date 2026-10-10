import assert from 'node:assert/strict';
import { Rng } from '../src/core/rng';
import { SPIRIT_RUN as C, SPIRIT_PICKUPS, SpiritRun, spiritDirection, spiritLayout, type SpiritPickupKind } from '../src/loading/spiritRun';

assert.equal(spiritDirection('entry', () => { throw Error('Entry needs no random draw'); }), 'down');
assert.equal(spiritDirection('travel', () => 0), 'right');
assert.equal(spiritDirection('travel', () => 0.99), 'left');
for (const direction of ['down', 'left', 'right'] as const) {
  for (const [width, height] of [[1280, 604], [390, 540], [700, 170]]) {
    const layout = spiritLayout(width, height, direction);
    for (const v of [-220, 0, 220]) {
      const p = layout.point(C.playerU, v);
      assert.ok(Math.abs(layout.lane(p.x, p.y) - v) < 1e-8);
      assert.ok(p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height);
    }
    const start = layout.point(0, 0), end = layout.point(1000, 0);
    assert.ok(direction === 'down' ? end.y > start.y : direction === 'right' ? end.x > start.x : end.x < start.x);
  }
  const run = new SpiritRun(direction, () => 0.5);
  assert.equal(run.playerU, 0);
  for (let i = 0; i < 6000; i++) run.step(1 / 60, { axis: 0 });
  assert.ok(run.passed > 100); assert.equal(run.hits, 0); assert.equal(run.speed, C.maxSpeed);
  assert.equal(run.score, run.passed * C.gatePoints, 'pickups are optional');
  assert.ok(run.gates.length < 6); assert.equal(run.playerU, C.playerU);
  run.gates = [{ id: 999, u: C.playerU + 20, gap: -155, width: 176, resolved: false, hit: false }];
  const passed = run.passed;
  run.step(1 / 60, { axis: 0 });
  assert.equal(run.hits, 1); assert.equal(run.streak, 0); assert.equal(run.speed, 1);
  assert.ok(run.hinder > 0); assert.equal(run.passed, passed);
  for (let i = 0; i < 180; i++) run.step(1 / 60, { axis: 0 });
  assert.equal(run.hits, 1); assert.equal(run.hinder, 0); assert.equal(run.passed, passed);
}
// Each actual width owns its collision boundary, including both extremes.
for (const width of [C.gateGapMin, 176, C.gateGapMax]) for (const margin of [0, 1]) {
  const run = new SpiritRun('right', () => 0.5); run.time = 2;
  run.lane = width / 2 - C.radius - margin;
  run.gates = [{ id: 1, u: C.playerU + 24, gap: 0, width, resolved: false, hit: false }]; run.pickups = [];
  for (let i = 0; i < 50; i++) run.step(1 / 60, { axis: 0 });
  assert.equal(run.hits, margin ? 0 : 1); assert.equal(run.passed, margin ? 1 : 0);
}
const outcomes = [30, 60, 144].map(fps => {
  const run = new SpiritRun('right', () => 0.5);
  for (let i = 0; i < fps * 30; i++) run.step(1 / fps, { axis: 0 });
  return run;
});
assert.equal(outcomes[0].passed, outcomes[1].passed); assert.equal(outcomes[1].passed, outcomes[2].passed);
assert.ok(Math.abs(outcomes[0].distance - outcomes[2].distance) < 4);
const pickup = (kind: SpiritPickupKind, id = 1, choice = 1) => ({ id, choice, u: C.playerU + 6, lane: 0, kind, state: 'live' as const, fade: 0 });
for (const kind of Object.keys(SPIRIT_PICKUPS) as SpiritPickupKind[]) {
  const run = new SpiritRun('right', () => 0.5); run.time = 2; run.gates = [];
  run.pickups = [pickup(kind), pickup(kind, 2)];
  run.step(1 / 60, { axis: 0 });
  assert.equal(run.score, SPIRIT_PICKUPS[kind].points); assert.equal(run.collected, 1, 'one pickup per choice, even on simultaneous contact');
  assert.equal(run.speed, 1 + SPIRIT_PICKUPS[kind].boostGates * C.speedPerGate);
  for (let i = 0; i < 20; i++) run.step(1 / 60, { axis: 0 });
  assert.equal(run.collected, 1, 'a lingering contact never pays twice');
  assert.equal(run.pickups.length, 0);
  run.gates = [{ id: 2, u: C.playerU, gap: 140, width: C.gateGapMin, resolved: false, hit: false }];
  run.step(1 / 60, { axis: 0 });
  assert.equal(run.speed, 1); assert.equal(run.boostGates, 0); assert.equal(run.surge, 0);
  assert.equal(run.score, SPIRIT_PICKUPS[kind].points, 'impact preserves earned score');
}
const capped = new SpiritRun('down', () => 0.5); capped.time = 2; capped.gates = [];
for (let i = 0; i < 50; i++) { capped.pickups = [pickup('wild', i)]; capped.step(1 / 120, { axis: 0 }); }
assert.equal(capped.speed, C.maxSpeed); assert.equal(capped.score, 50 * SPIRIT_PICKUPS.wild.points);
assert.ok(capped.bursts.length <= C.maxBursts);

// Long generated routes, both offer choices, extreme RNG and seeded variety.
// Drive through the real movement/collision path at the cap, including the
// return leg from each pickup. This checks reachability rather than only size.
const widths = new Set<number>(), kinds = new Set<string>();
for (const seed of [0, 1, 13, 57, 813]) for (const choice of [0, 1]) {
  const rng = new Rng(seed), run = new SpiritRun('right', seed < 2 ? () => seed : () => rng.next());
  run.streak = 100; let lastGate = 0, previousGap = 0;
  for (let i = 0; i < 60 * 180; i++) {
    for (const gate of run.gates) if (gate.id > lastGate) {
      assert.ok(gate.width >= C.gateGapMin && gate.width <= C.gateGapMax);
      assert.ok(gate.width > C.radius * 2 + 60, 'generous body clearance');
      assert.ok(Math.abs(gate.gap) + gate.width / 2 <= C.halfWidth - C.gateRim + 1e-6);
      assert.ok(Math.abs(gate.gap - previousGap) <= C.gateShift + 1e-6);
      const steeringReach = (C.gateSpacing / 2 - C.radius - C.gateThickness / 2) / (C.baseSpeed * C.maxSpeed) * C.steerSpeed;
      for (const p of run.pickups.filter(p => p.choice === gate.id)) {
        assert.ok(Math.abs(p.lane - previousGap) < steeringReach);
        assert.ok(Math.abs(p.lane - gate.gap) < steeringReach);
        assert.ok(Math.abs(p.lane) < C.halfWidth - C.radius);
        kinds.add(p.kind);
      }
      previousGap = gate.gap; lastGate = gate.id; widths.add(Math.round(gate.width));
    }
    const gate = run.gates.find(g => !g.resolved);
    const offers = run.pickups.filter(p => p.state === 'live' && p.u >= run.playerU - C.pickupRadius);
    const offer = offers[choice];
    // Ignore the entry offer until after the first gate for the worst-case
    // steady-state proof; the entry has substantially more reaction time.
    const target = offer && run.passed && offer.u < (gate?.u ?? Infinity) ? offer.lane : gate?.gap ?? 0;
    run.step(1 / 60, { axis: 0, target });
    assert.ok(run.gates.length < 6 && run.pickups.length < 12 && run.bursts.length <= C.maxBursts);
  }
  assert.equal(run.hits, 0, 'every generated offer route is passable at maximum speed');
  assert.ok(run.collected > 220 && run.passed > 220);
}
assert.ok(widths.size > 100); assert.equal(kinds.size, 3);
const bounds = new SpiritRun('down', () => 1);
for (let i = 0; i < 900; i++) bounds.step(1 / 60, { axis: 1, target: Infinity });
assert.equal(bounds.lane, C.halfWidth - C.radius);
bounds.step(NaN, { axis: 1 }); const time = bounds.time;
bounds.step(600, { axis: 0 }); assert.ok(bounds.time - time <= 0.101, 'background suspension is bounded');
bounds.step(1 / 60, { axis: NaN, target: NaN }); assert.ok(Number.isFinite(bounds.lane));
const combatRandom = Math.random;
try {
  Math.random = () => { throw Error('Loading consumed the combat random source'); };
  const privateRun = new SpiritRun(spiritDirection('travel'));
  for (let i = 0; i < 600; i++) privateRun.step(1 / 60, { axis: 0 });
} finally { Math.random = combatRandom; }
console.log('PASS SpiritRun: variable openings, capped-speed choice routes, all pickup values, exclusive claims, acceleration/reset, score preservation, directions, frame rates and bounded effects');
