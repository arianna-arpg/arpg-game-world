import assert from 'node:assert/strict';
import { measureExploration, type TerrainGrid } from './layoutmetrics';

const grid = (rows: string[], cell = 10): TerrainGrid => ({
  cols: rows[0].length, rows: rows.length, cell,
  mask: Uint8Array.from(rows.join(''), c => c === '.' ? 1 : 0),
});
const p = (x: number, y: number) => ({ x: x * 10 + 5, y: y * 10 + 5 });
const close = (a: number | null, b: number) => assert.ok(a !== null && Math.abs(a - b) < 1e-10, `${a} != ${b}`);

// Every cell of an open square belongs to SOME shortest corner-to-corner
// route. A single BFS parent chain would falsely call the rest a side branch.
const square = grid(['.....', '.....', '.....', '.....', '.....']);
const before = [...square.mask];
const open = measureExploration(square, p(0, 0), [p(4, 4)], [], { routeSlackCells: 0, narrowClearanceCells: 1 });
assert.equal(open.coverage, 1);
assert.equal(open.components, 1);
assert.equal(open.exits[0].distancePx, 80);
assert.equal(open.exits[0].detour, 1);
assert.equal(open.offRouteFraction, 0);
close(open.narrowFraction, 16 / 25); // outside boundary participates
close(measureExploration(square, p(0, 0), [], [], { narrowClearanceCells: 2 }).narrowFraction, 24 / 25);
assert.deepEqual([...square.mask], before);
assert.deepEqual(measureExploration(square, p(0, 0), [p(4, 4)]), measureExploration(square, p(0, 0), [p(4, 4)]));
console.log('PASS open routes, exterior clearance, determinism and read-only observation');

const branch = grid(['.....', '##.##', '##.##']);
const strict = measureExploration(branch, p(0, 0), [p(4, 0)], [p(2, 2)], { routeSlackCells: 0 });
close(strict.offRouteFraction, 2 / 7);
assert.equal(strict.pois[0].distancePx, 40);
close(measureExploration(branch, p(0, 0), [p(4, 0)], [], { routeSlackCells: 2 }).offRouteFraction, 1 / 7);
assert.equal(measureExploration(branch, p(0, 0), [p(4, 0)], [], { routeSlackCells: 4 }).offRouteFraction, 0);
assert.equal(measureExploration(branch, p(0, 0), [p(4, 0), p(2, 2)], [], { routeSlackCells: 0 }).offRouteFraction, 0);
console.log('PASS side branch, POI depth, configurable route slack and multi-exit union');

const ring = measureExploration(grid(['.....', '.###.', '.....']), p(0, 1), [p(4, 1)], [], { routeSlackCells: 0 });
assert.equal(ring.exits[0].distancePx, 60);
assert.equal(ring.exits[0].detour, 1.5);
assert.equal(ring.offRouteFraction, 0); // both equal-length arms survive
const disconnected = measureExploration(grid(['..#..']), p(0, 0), [p(4, 0)]);
assert.equal(disconnected.components, 2);
assert.equal(disconnected.reachableFraction, 0.5);
assert.deepEqual(disconnected.exits[0], { reachable: false, distancePx: null, detour: null });
assert.equal(disconnected.offRouteFraction, null);
console.log('PASS alternative routes, real detours and disconnected islands');

const empty = measureExploration(grid(['###', '###']), p(0, 0), [p(1, 0)]);
assert.equal(empty.entryWalkable, false);
assert.equal(empty.components, 0);
assert.equal(empty.coverage, 0);
assert.equal(empty.farthestDistancePx, null);
assert.equal(empty.narrowFraction, null);
const blocked = measureExploration(branch, p(0, 1), [p(4, 0)]);
assert.equal(blocked.reachableCells, 0); // never silently snap onto a route
const offGrid = measureExploration(square, p(-1, 0), [p(0, 0)]);
assert.equal(offGrid.entryWalkable, false);
const single = measureExploration(grid(['.']), p(0, 0), [p(0, 0)]);
assert.equal(single.exits[0].distancePx, 0);
assert.equal(single.exits[0].detour, 1);
assert.equal(single.narrowFraction, 1);
assert.equal(measureExploration(square, p(0, 0), []).offRouteFraction, null);
assert.throws(() => measureExploration({ ...square, cols: 6 }, p(0, 0), []));
assert.throws(() => measureExploration(square, p(0, 0), [], [], { routeSlackCells: NaN }));
assert.throws(() => measureExploration(square, p(0, 0), [], [], { narrowClearanceCells: -1 }));
console.log('PASS blocked, empty, off-grid, single-cell and invalid-input cases');
