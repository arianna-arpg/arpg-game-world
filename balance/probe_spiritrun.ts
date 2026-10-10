import assert from 'node:assert/strict';
import { SPIRIT_RUN as C, SpiritRun, spiritDirection, spiritLayout } from '../src/loading/spiritRun';

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
  assert.ok(run.gates.length < 6); assert.equal(run.playerU, C.playerU);
  // Move the full body into a gate's solid half. One hit only, no pass credit.
  run.gates = [{ id: 999, u: C.playerU + 20, gap: -155, resolved: false, hit: false }];
  const passed = run.passed;
  run.step(1 / 60, { axis: 0 });
  assert.equal(run.hits, 1); assert.equal(run.streak, 0); assert.equal(run.speed, 1);
  assert.ok(run.hinder > 0); assert.equal(run.passed, passed);
  for (let i = 0; i < 180; i++) run.step(1 / 60, { axis: 0 });
  assert.equal(run.hits, 1); assert.equal(run.hinder, 0); assert.equal(run.passed, passed);
}
// Boundary contact counts as a hit; a clearance of one unit passes.
for (const margin of [0, 1]) {
  const run = new SpiritRun('right', () => 0.5); run.time = 2;
  run.lane = C.gateGap / 2 - C.radius - margin;
  run.gates = [{ id: 1, u: C.playerU + 24, gap: 0, resolved: false, hit: false }];
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
console.log('PASS SpiritRun: directions, transform parity, fair gates, collision, streak reset/cap, frame rates, bounded residency and suspended tabs');
