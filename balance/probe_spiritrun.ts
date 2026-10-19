import assert from 'node:assert/strict';
import { Rng } from '../src/core/rng';
import { SPIRIT_RUN as C, SPIRIT_PICKUPS, SpiritRun, spiritDirection, spiritLayout, spiritGateSolids, spiritArrivalAlpha, spiritPickupAlpha,
  type SpiritGate, type SpiritOpening, type SpiritPickup, type SpiritCurrent, type SpiritPickupKind } from '../src/loading/spiritRun';

const gate = (openings: SpiritOpening[], u = C.playerU + 24): SpiritGate => ({ id: 900, u, spacing: C.gateSpacingMin, openings, resolved: false, hit: false });
const hole = (lane = 0, width: number = C.gateGapMin): SpiritOpening => ({ lane, width });
const empty = (direction: 'down' | 'left' | 'right' = 'right'): SpiritRun => {
  const r = new SpiritRun(direction, () => 0); r.time = 2; r.gates = []; r.pickups = []; r.currents = []; return r;
};
const pickup = (kind: SpiritPickupKind, id = 1): SpiritPickup => ({ id, gate: 1, u: C.playerU + 6, lane: 0, kind, flame: 1, state: 'live', fade: 0 });
const current = (placement: SpiritCurrent['placement'] = 'between'): SpiritCurrent =>
  ({ id: 1, gate: 1, u: C.playerU + 6, lane: 0, placement, taken: false, fade: 0 });
const closest = (holes: readonly SpiritOpening[], lane: number) => holes.reduce((a, b) => Math.abs(a.lane - lane) <= Math.abs(b.lane - lane) ? a : b);

assert.equal(spiritDirection('entry', () => { throw Error('Entry needs no random draw'); }), 'down');
assert.equal(spiritDirection('travel', () => 0), 'right'); assert.equal(spiritDirection('travel', () => 1), 'left');
for (const direction of ['down', 'left', 'right'] as const) {
  for (const [w, h] of [[1280, 604], [390, 450], [700, 170]]) {
    const layout = spiritLayout(w, h, direction);
    for (const lane of [-220, 0, 220]) {
      const p = layout.point(C.playerU, lane); assert.ok(Math.abs(layout.lane(p.x, p.y) - lane) < 1e-8);
      assert.ok(p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h);
    }
    const a = layout.point(0, 0), b = layout.point(1000, 0);
    assert.ok(direction === 'down' ? b.y > a.y : direction === 'right' ? b.x > a.x : b.x < a.x);
  }
  assert.equal(new SpiritRun(direction).playerU, 0);
  for (const openings of [[hole()], [hole(-130), hole(130)], [hole(-175), hole(0), hole(175)]]) {
    const solids = spiritGateSolids(gate(openings));
    assert.equal(solids.length, openings.length + 1);
    assert.equal(solids[0].low, -C.halfWidth); assert.equal(solids.at(-1)!.high, C.halfWidth);
    for (const o of openings) {
      for (const lane of [o.lane, o.lane - o.width / 2 + C.radius + 1, o.lane + o.width / 2 - C.radius - 1]) {
        const r = empty(direction); r.lane = lane; r.gates = [gate(openings)];
        for (let i = 0; i < 40; i++) r.step(1 / 60, { axis: 0 });
        assert.equal(r.hits, 0); assert.equal(r.passed, 1);
      }
    }
    for (const solid of solids) {
      const r = empty(direction); r.lane = (solid.low + solid.high) / 2; r.gates = [gate(openings)];
      for (let i = 0; i < 60; i++) r.step(1 / 60, { axis: 0 });
      assert.equal(r.hits, 1, 'every outer wall and central pier collides exactly once'); assert.equal(r.passed, 0);
    }
  }
}
for (const width of [C.gateGapMin, 176, C.gateGapMax]) {
  const r = empty(); r.lane = width / 2 - C.radius; r.gates = [gate([hole(0, width)])];
  r.step(1 / 60, { axis: 0 }); assert.equal(r.hits, 1, 'exact aperture edge is solid');
}
for (const kind of Object.keys(SPIRIT_PICKUPS) as SpiritPickupKind[]) {
  const r = empty(); r.pickups = [pickup(kind), pickup(kind, 2)]; r.step(1 / 60, { axis: 0 });
  assert.equal(r.collected, 1); assert.deepEqual(r.pickups.map(p => p.state), ['taken', 'released']);
  assert.equal(r.speed, 1 + SPIRIT_PICKUPS[kind].boostGates * C.speedPerGate);
  for (let i = 0; i < 50; i++) r.step(1 / 60, { axis: 0 });
  assert.equal(r.collected, 1); assert.equal(r.pickups.length, 0);
  assert.equal('score' in r, false); assert.equal('points' in SPIRIT_PICKUPS[kind], false);
}
// Six flames offer one choice, even when contacts share a substep or frame.
for (const fps of [30, 60, 144]) for (const stagger of [0, C.pickupStagger]) {
  const r = empty(); r.pickups = Array.from({ length: 6 }, (_, i) => ({ ...pickup('wild', i), u: C.playerU + 6 + i * stagger }));
  r.step(1 / fps, { axis: 0 });
  assert.equal(r.collected, 1); assert.equal(r.pickups.filter(p => p.state === 'released').length, 5);
  assert.equal(r.speed, 1.18, 'a crowded interval cannot compound its first boost');
  for (let i = 0; i < fps; i++) r.step(1 / fps, { axis: 0 });
  assert.equal(r.collected, 1); assert.equal(r.boostGates, 3); assert.equal(r.pickups.length, 0);
}
// The choice applies to every kind, but only to its own gate interval.
const cluster = empty(); cluster.pickups = [pickup('mote'), { ...pickup('wild', 2), u: C.playerU + 120 },
  { ...pickup('wild', 3), gate: 2, u: C.playerU + 145 }];
cluster.currents = [current()]; cluster.step(1 / 60, { axis: 0 });
assert.equal(cluster.collected, 1); assert.equal(cluster.boostGates, 0);
assert.equal(cluster.pickups[1].state, 'released'); assert.equal(cluster.pickups[2].state, 'live');
assert.equal(cluster.currentsTaken, 1, 'currents remain independent of flame choices');
for (let i = 0; i < 50; i++) cluster.step(1 / 60, { axis: 0 });
assert.equal(cluster.collected, 2); assert.equal(cluster.boostGates, 3);
const missed = empty(); missed.pickups = [pickup('wild'), pickup('mote', 2)]; missed.lane = 100;
missed.step(0.1, { axis: 0 }); assert.ok(missed.pickups.every(p => p.state === 'live'));
const bound = empty(); bound.hinder = 1; bound.pickups = [pickup('wild'), pickup('mote', 2)];
bound.step(0.1, { axis: 0 }); assert.equal(bound.collected, 0); assert.ok(bound.pickups.every(p => p.state === 'live'));
const released = { ...pickup('wild'), state: 'released' as const };
for (const reduced of [false, true]) {
  const opacity = [0, 0.25, 0.5, 0.75, 1].map(t => spiritPickupAlpha({ ...released, fade: t * C.choiceFade }, 2, reduced));
  assert.equal(opacity[0], 1); assert.equal(opacity[2], 0.5); assert.equal(opacity[4], 0);
  assert.ok(opacity.every((a, i) => i === 0 || a < opacity[i - 1]));
}
assert.equal(spiritPickupAlpha({ ...released, state: 'taken' }, 2), 0);
const slow = empty();
for (let i = 0; i < 60; i++) {
  slow.gates = [gate([hole()], C.playerU - 28)]; slow.pickups = []; slow.currents = [];
  slow.step(1 / 120, { axis: 0 });
  if (i === 9) assert.equal(slow.speed, 1.6);
  if (i === 39) assert.ok(slow.speed < C.maxSpeed, 'the old forty-gate ceiling now leaves room to build');
}
assert.equal(slow.passed, 60); assert.equal(slow.speed, C.maxSpeed);
assert.equal(SPIRIT_PICKUPS.wild.boostGates, 3); assert.equal(C.currentExtra, 0.8);
assert.equal(C.maxBoostSpeed, 3.6 * 1.5, 'the higher peak remains available despite slower acceleration');
// Currents work in any direction and have an optional bypass in eligible holes.
for (const direction of ['down', 'left', 'right'] as const) for (const take of [false, true]) {
  const r = empty(direction); r.lane = take ? 0 : 35; r.gates = [gate([hole(0, 114)])]; r.currents = [current('opening')];
  for (let i = 0; i < 30; i++) r.step(1 / 60, { axis: 0 });
  assert.equal(r.hits, 0); assert.equal(r.currentsTaken, Number(take));
  assert.ok(take ? r.dash > 0 && r.speed > 1.8 : r.dash === 0);
}
const boosted = empty(); boosted.streak = 100; boosted.currents = [current()];
boosted.step(1 / 120, { axis: 0 }); assert.ok(Math.abs(boosted.speed - C.maxBoostSpeed) < 1e-9);
boosted.currents = [current()]; boosted.step(1 / 120, { axis: 0 });
assert.ok(Math.abs(boosted.speed - C.maxBoostSpeed) < 1e-9, 'repeated currents refresh, never stack without bound');
for (let i = 0; i < 150; i++) { boosted.gates = []; boosted.pickups = []; boosted.step(1 / 60, { axis: 0 }); }
assert.equal(boosted.dash, 0); assert.equal(boosted.speed, C.maxSpeed);
boosted.dash = 2; boosted.boostGates = 3; boosted.gates = [gate([hole(150)])];
boosted.currents = [current('opening')]; boosted.pickups = [pickup('wild')];
const before = boosted.currentsTaken; boosted.step(1 / 60, { axis: 0 });
assert.equal(boosted.hits, 1); assert.equal(boosted.speed, 1); assert.equal(boosted.dash, 0);
assert.equal(boosted.boostGates, 0); assert.equal(boosted.currentsTaken, before, 'impact cannot be undone by a simultaneous current');
assert.equal(boosted.collected, 0);

const counts = new Set<number>(), widths = new Set<number>(), kinds = new Set<string>(), placements = new Set<string>();
const densities = new Set<number>(), intensities = new Set<number>(), orders = new Set<string>(), triples: number[] = [];
let encounterRoutes = 0, splitBoost = false, asymmetric = false, crowdedLane = false, unevenGaps = false, punishing = false;
/** Prove complete routes at the calm pace. At full tilt some choices are deliberately unreachable. */
function proveEncounter(previous: SpiritOpening[], next: SpiritGate, event: SpiritPickup | SpiritCurrent): void {
  const along = next.spacing - (next.u - event.u);
  // One control frame plus both gate and body clearance, at base speed.
  const reach = (d: number) => (d - C.radius - C.gateThickness / 2 - C.routeMargin) * C.steerSpeed / C.baseSpeed;
  const from = previous.find(o => Math.abs(event.lane - o.lane) <= reach(along) + 1e-6);
  const to = next.openings.find(o => Math.abs(event.lane - o.lane) <= reach(next.spacing - along) + 1e-6);
  assert.ok(from && to, 'each encounter retains a complete calm-speed route');
  const r = empty(); r.lane = from.lane;
  const first = gate(previous, C.playerU + 26), last = gate(next.openings, first.u + next.spacing);
  r.gates = [first, last];
  if ('kind' in event) r.pickups = [{ ...event, u: first.u + along }];
  else r.currents = [{ ...event, u: first.u + along }];
  for (let i = 0; i < 240 && !last.resolved; i++) {
    r.streak = r.boostGates = r.dash = 0;
    const target = !first.resolved ? from.lane : r.collected || r.currentsTaken ? to.lane : event.lane;
    r.step(1 / 30, { axis: 0, target });
  }
  assert.equal(r.hits, 0, 'full encounter and return path clears with 30 Hz steering');
  assert.equal(r.collected + r.currentsTaken, 1); assert.equal(r.passed, 2); encounterRoutes++;
}
for (const seed of [0, 1, 13, 57, 813]) {
  const rng = new Rng(seed), r = new SpiritRun('right', seed < 2 ? () => seed : () => rng.next());
  let lastId = 0, previous = [hole(0, C.gateGapMax)], target = 0, targetId = 0;
  for (let i = 0; i < 30 * 150; i++) {
    for (const g of r.gates) if (g.id > lastId) {
      counts.add(g.openings.length);
      for (const o of g.openings) {
        widths.add(Math.round(o.width)); assert.ok(o.width >= C.gateGapMin - 1e-8 && o.width <= C.gateGapMax + 1e-8);
        assert.ok(Math.abs(o.lane) + o.width / 2 <= C.halfWidth - C.gateRim + 1e-8);
      }
      assert.ok(spiritGateSolids(g).every(s => s.high - s.low >= C.gateRim - 1e-8));
      if (g.openings.length === 3) {
        triples.push(g.openings[1].lane);
        const ws = g.openings.map(o => o.width);
        if (Math.max(...ws) / Math.min(...ws) > 2.3) asymmetric = true;
      }
      const prior = r.gates.find(p => p.id === g.id - 1);
      if (prior) assert.ok(Math.abs(g.u - prior.u - g.spacing) < 1e-6, 'substep overshoot does not compress actual spacing');
      const peakReach = (g.spacing - C.radius * 2 - C.gateThickness) * C.steerSpeed / (C.baseSpeed * C.maxBoostSpeed);
      if (previous.some(o => Math.abs(closest(g.openings, o.lane).lane - o.lane) > peakReach)) punishing = true;
      const group = r.pickups.filter(p => p.gate === g.id).sort((a, b) => a.u - b.u);
      densities.add(group.length); orders.add(group.map(p => p.kind).join(','));
      if (group.length === 6 && Math.max(...group.map(p => p.lane)) - Math.min(...group.map(p => p.lane)) < 90) crowdedLane = true;
      const gaps = group.slice(1).map((p, i) => p.u - group[i].u);
      assert.ok(gaps.every(d => d >= C.pickupStagger - 1e-8));
      if (gaps.length > 1 && Math.max(...gaps) - Math.min(...gaps) > 40) unevenGaps = true;
      for (const p of group) {
        kinds.add(p.kind); intensities.add(Math.round(p.flame * 1000));
        assert.ok(p.flame >= 0.82 && p.flame <= 1.18); proveEncounter(previous, g, p);
      }
      const currents = r.currents.filter(b => b.gate === g.id);
      if (currents.length > 1) splitBoost = true;
      for (const b of currents) {
        placements.add(b.placement);
        if (b.placement === 'between') proveEncounter(previous, g, b);
        else assert.ok(g.openings.some(o => o.lane === b.lane && o.width / 2 - C.radius > C.currentHalfWidth + C.radius + 10),
          'an in-hole current always leaves a body-clear bypass');
      }
      lastId = g.id; previous = g.openings;
    }
    const next = r.gates.find(g => !g.resolved);
    if (next && next.id !== targetId) { targetId = next.id; target = closest(next.openings, r.lane).lane; }
    r.streak = 100; r.dash = 100; r.step(1 / 30, { axis: 0, target });
    assert.ok(r.gates.length <= 6 && r.pickups.length <= 36 && r.currents.length <= 12 && r.bursts.length <= C.maxBursts);
  }
  assert.ok(r.passed > 80);
}
assert.equal(counts.size, 3); assert.ok(widths.size > 150); assert.equal(kinds.size, 3);
assert.deepEqual([...densities].sort(), [0, 1, 2, 3, 4, 5, 6]); assert.ok(intensities.size > 250);
assert.ok(orders.size > 100 && [...orders].some(s => s.startsWith('wild,mote')) && [...orders].some(s => s.startsWith('mote,wild')));
assert.ok(asymmetric && Math.max(...triples) - Math.min(...triples) > 140, 'triple apertures have independent sizes and broad center drift');
assert.ok(crowdedLane && unevenGaps && punishing); assert.equal(placements.size, 2); assert.ok(splitBoost && encounterRoutes > 2000);

// Match random streams at fixed paces: new gaps compress gradually, not by
// teleporting gates already in flight. Ignore collisions/collectibles in this
// generation-only sample so the tested pace stays fixed.
const gapMeans: number[] = [], flameMeans: number[] = [];
for (const speed of [1, 2, 3, 4.6, 5.4]) {
  const rng = new Rng(712), r = new SpiritRun('right', () => rng.next());
  const spacing: number[] = [], flames: number[] = []; let seen = 3;
  for (let i = 0; i < 30 * 300; i++) {
    r.streak = speed === 5.4 ? 100 : (speed - 1) / C.speedPerGate; r.dash = speed === 5.4 ? 100 : 0;
    r.gates.forEach(g => { g.resolved = true; }); r.pickups = []; r.currents = [];
    const before = r.gates.map(g => ({ id: g.id, u: g.u })); r.step(1 / 30, { axis: 0 });
    for (const old of before) {
      const now = r.gates.find(g => g.id === old.id);
      if (now) assert.ok(Math.abs(old.u - now.u - C.baseSpeed * speed / 30) < 1e-6, 'old gates only advance by travel');
    }
    for (const g of r.gates) if (g.id > seen) {
      const pace = (speed - 1) / (C.maxBoostSpeed - 1);
      assert.ok(g.spacing >= C.gateSpacingMin + (C.gateSpacingTightMin - C.gateSpacingMin) * pace - 1e-8);
      assert.ok(g.spacing <= C.gateSpacingMax + (C.gateSpacingTightMax - C.gateSpacingMax) * pace + 1e-8);
      spacing.push(g.spacing); flames.push(r.pickups.filter(p => p.gate === g.id).length); seen = g.id;
    }
  }
  assert.ok(spacing.length > 70);
  gapMeans.push(spacing.reduce((a, b) => a + b, 0) / spacing.length);
  flameMeans.push(flames.reduce((a, b) => a + b, 0) / flames.length);
}
assert.ok(gapMeans.every((m, i) => !i || m < gapMeans[i - 1] - 30));
assert.ok(flameMeans[0] > flameMeans.at(-1)!, 'early stretches carry more flames on average');
const outcomes = [30, 60, 144].map(fps => {
  const r = new SpiritRun('right', () => 0);
  for (let i = 0; i < fps * 30; i++) r.step(1 / fps, { axis: 0, target: 0 });
  return r;
});
assert.equal(outcomes[0].passed, outcomes[1].passed); assert.equal(outcomes[1].passed, outcomes[2].passed);
assert.ok(Math.abs(outcomes[0].distance - outcomes[2].distance) < 12);
// Regress the actual pop-in: newly created flames used to appear at u~330,
// already near the player's gate. Watch births, not just where gates spawn.
let observedBirths = 0;
for (const direction of ['down', 'left', 'right'] as const) for (const fps of [30, 60, 144]) {
  const rng = new Rng(391 + fps), r = new SpiritRun(direction, () => rng.next());
  const seen = new Set<string>();
  const objects = () => [...r.gates.map(g => ({ ...g, key: 'g' + g.id })),
    ...r.pickups.map(p => ({ ...p, key: 'p' + p.id })), ...r.currents.map(b => ({ ...b, key: 'b' + b.id }))];
  for (const o of objects()) {
    seen.add(o.key); assert.equal(spiritArrivalAlpha(o.u, r.time), 0, 'initial scene starts with a soft reveal');
  }
  for (let i = 0; i < fps * 40; i++) {
    // Alternate ordinary travel, peak boost and collisions while watching births.
    if (i % (fps * 8) >= fps * 4) { r.streak = 100; r.dash = 100; }
    r.step(1 / fps, { axis: 0 });
    for (const o of objects()) if (!seen.has(o.key)) {
      seen.add(o.key); observedBirths++;
      assert.ok(o.u > C.length + C.spawnPadding, 'the whole group exists before its far-edge reveal');
      assert.equal(spiritArrivalAlpha(o.u, r.time), 0, 'no new object pops into the visible course');
      assert.equal(spiritArrivalAlpha(o.u, r.time, true), 0, 'reduced motion uses the same offscreen preparation');
    }
  }
}
assert.ok(observedBirths > 1000);
const arrivalEdge = C.length + C.spawnPadding, arrivalEnd = arrivalEdge - C.arrivalDistance;
for (const reduced of [false, true]) {
  assert.equal(spiritArrivalAlpha(arrivalEdge, 2, reduced), 0);
  assert.equal(spiritArrivalAlpha(arrivalEnd, 2, reduced), 1);
  assert.equal(spiritArrivalAlpha(C.playerU + C.radius, 2, reduced), 1, 'objects are fully legible long before collision');
  let prior = 0;
  for (let u = arrivalEdge; u >= arrivalEnd; u -= 5) {
    const alpha = spiritArrivalAlpha(u, 2, reduced); assert.ok(alpha >= prior && alpha <= 1); prior = alpha;
  }
}
assert.ok(Math.abs(spiritArrivalAlpha(arrivalEnd, C.arrivalSeconds / 2) - 0.5) < 1e-9);
assert.equal(spiritArrivalAlpha(arrivalEnd, 0, true), 1, 'reduced motion skips the timed intro');
const bounds = empty('down');
for (let i = 0; i < 900; i++) bounds.step(1 / 60, { axis: 1, target: Infinity });
assert.equal(bounds.lane, C.halfWidth - C.radius);
bounds.step(NaN, { axis: 1 }); const time = bounds.time;
bounds.step(600, { axis: 0 }); assert.ok(bounds.time - time <= 0.101);
bounds.step(1 / 60, { axis: NaN, target: NaN }); assert.ok(Number.isFinite(bounds.lane));
const combatRandom = Math.random;
try {
  Math.random = () => { throw Error('Loading consumed the combat random source'); };
  const r = new SpiritRun(spiritDirection('travel')); for (let i = 0; i < 600; i++) r.step(1 / 60, { axis: 0 });
} finally { Math.random = combatRandom; }
console.log('PASS SpiritRun: offscreen encounter preparation, smooth arrivals, irregular apertures, independent staggered flame clusters, continuous radiance, unchanged gains, 50% higher peak, shrinking gaps, calm routes, optional currents, collision resets, no score and bounded effects');
