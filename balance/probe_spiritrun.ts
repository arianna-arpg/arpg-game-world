import assert from 'node:assert/strict';
import { Rng } from '../src/core/rng';
import { SPIRIT_RUN as C, SPIRIT_PICKUPS, SpiritRun, spiritDirection, spiritLayout, spiritGateSolids,
  type SpiritGate, type SpiritOpening, type SpiritPickup, type SpiritCurrent, type SpiritPickupKind } from '../src/loading/spiritRun';

const gate = (openings: SpiritOpening[], u = C.playerU + 24): SpiritGate => ({ id: 900, u, openings, resolved: false, hit: false });
const hole = (lane = 0, width: number = C.gateGapMin): SpiritOpening => ({ lane, width });
const empty = (direction: 'down' | 'left' | 'right' = 'right'): SpiritRun => {
  const r = new SpiritRun(direction, () => 0); r.time = 2; r.gates = []; r.pickups = []; r.currents = []; return r;
};
const pickup = (kind: SpiritPickupKind, id = 1): SpiritPickup => ({ id, choice: 1, u: C.playerU + 6, lane: 0, kind, state: 'live', fade: 0 });
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
  assert.equal(r.collected, 1); assert.ok(r.pickups.every(p => p.state !== 'live'));
  assert.equal(r.speed, 1 + SPIRIT_PICKUPS[kind].boostGates * C.speedPerGate);
  for (let i = 0; i < 20; i++) r.step(1 / 60, { axis: 0 });
  assert.equal(r.collected, 1); assert.equal(r.pickups.length, 0);
  assert.equal('score' in r, false); assert.equal('points' in SPIRIT_PICKUPS[kind], false);
}
// Currents work in any direction and remain optional even in the narrowest hole.
for (const direction of ['down', 'left', 'right'] as const) for (const take of [false, true]) {
  const r = empty(direction); r.lane = take ? 0 : 35; r.gates = [gate([hole()])]; r.currents = [current('opening')];
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
let encounterRoutes = 0, splitBoost = false;
/** Drive the complete two-gate route for an optional encounter at boosted speed. */
function proveEncounter(previous: SpiritOpening[], next: SpiritGate, event: SpiritPickup | SpiritCurrent): void {
  const along = C.gateSpacing - (next.u - event.u);
  const reach = (d: number) => (d - C.radius - C.gateThickness / 2 - 18) * C.steerSpeed / (C.baseSpeed * C.maxBoostSpeed);
  const from = previous.find(o => Math.abs(event.lane - o.lane) <= reach(along) + 1e-6);
  const to = next.openings.find(o => Math.abs(event.lane - o.lane) <= reach(C.gateSpacing - along) + 1e-6);
  assert.ok(from && to, 'every between-gate encounter has a complete reachable route');
  const r = empty(); r.lane = from.lane; r.streak = 100;
  const first = gate(previous, C.playerU + 26), last = gate(next.openings, first.u + C.gateSpacing);
  r.gates = [first, last];
  if ('kind' in event) r.pickups = [{ ...event, u: first.u + along }];
  else r.currents = [{ ...event, u: first.u + along }];
  for (let i = 0; i < 100 && !last.resolved; i++) {
    r.dash = 100;
    const target = !first.resolved ? from.lane : r.collected || r.currentsTaken ? to.lane : event.lane;
    r.step(1 / 30, { axis: 0, target });
  }
  assert.equal(r.hits, 0, 'encounter return route clears at the boosted cap and 30 Hz controls');
  assert.equal(r.collected + r.currentsTaken, 1); assert.equal(r.passed, 2); encounterRoutes++;
}
for (const seed of [0, 1, 13, 57, 813]) {
  const rng = new Rng(seed), r = new SpiritRun('right', seed < 2 ? () => seed : () => rng.next());
  r.streak = 100; let lastId = 0, previous = [hole(0, C.gateGapMax)], target = 0, targetId = 0;
  for (let i = 0; i < 30 * 150; i++) {
    for (const g of r.gates) if (g.id > lastId) {
      counts.add(g.openings.length);
      for (const o of g.openings) {
        widths.add(Math.round(o.width)); assert.ok(o.width >= C.gateGapMin && o.width <= C.gateGapMax);
        assert.ok(Math.abs(o.lane) + o.width / 2 <= C.halfWidth - C.gateRim);
        assert.ok(Math.abs(closest(previous, o.lane).lane - o.lane) <= 240);
        assert.ok(o.width / 2 - C.radius > C.currentHalfWidth + C.radius + 10, 'in-hole currents have a clear bypass');
      }
      for (const o of previous) assert.ok(Math.abs(closest(g.openings, o.lane).lane - o.lane) <= 240);
      assert.ok(spiritGateSolids(g).every(s => s.high - s.low >= C.gateRim));
      const pair = r.pickups.filter(p => p.choice === g.id);
      if (pair.length) assert.ok(Math.abs(pair[0].u - pair[1].u) >= C.choiceStagger * 2 - 7);
      for (const p of pair) { kinds.add(p.kind); proveEncounter(previous, g, p); }
      const currents = r.currents.filter(b => b.gate === g.id);
      if (currents.length > 1) splitBoost = true;
      for (const b of currents) {
        placements.add(b.placement);
        if (b.placement === 'between') proveEncounter(previous, g, b);
        else assert.ok(g.openings.some(o => o.lane === b.lane));
      }
      lastId = g.id; previous = g.openings;
    }
    const next = r.gates.find(g => !g.resolved);
    if (next && next.id !== targetId) { targetId = next.id; target = closest(next.openings, r.lane).lane; }
    r.dash = 100; r.step(1 / 30, { axis: 0, target });
    assert.ok(r.gates.length < 5 && r.pickups.length < 10 && r.currents.length < 8 && r.bursts.length <= C.maxBursts);
  }
  assert.equal(r.hits, 0); assert.ok(r.passed > 200);
}
assert.equal(counts.size, 3); assert.ok(widths.size > 100); assert.equal(kinds.size, 3);
assert.equal(placements.size, 2); assert.ok(splitBoost); assert.ok(encounterRoutes > 1000);
const outcomes = [30, 60, 144].map(fps => {
  const r = new SpiritRun('right', () => 0);
  for (let i = 0; i < fps * 30; i++) r.step(1 / fps, { axis: 0, target: -55 });
  return r;
});
assert.equal(outcomes[0].passed, outcomes[1].passed); assert.equal(outcomes[1].passed, outcomes[2].passed);
assert.ok(Math.abs(outcomes[0].distance - outcomes[2].distance) < 12);
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
console.log('PASS SpiritRun: no score, staggered routes, single/split/triple apertures, all solid piers, optional currents, boost expiry/reset/cap, boosted reachability, directions and bounded effects');
