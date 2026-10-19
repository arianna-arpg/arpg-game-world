// Subpixel convex corners must not hide actors over visibly clear ground.
// Chromium's actual raster and the renderer frame-order checks live in
// visibility-ui.cjs; this fast companion runs in the ordinary probe suite.
import assert from 'node:assert/strict';
import { SightVeil } from '../src/render/vis/sightVeil';
import { GridWalkField } from '../src/world/gridWalk';

const grid = new GridWalkField(4800, 4800, 24);
grid.fillRect(0, 0, 4799, 4799, true);
grid.fillDisc(2400, 2400, 300, 'wall');
const rotate = (x: number, y: number, q: number) => {
  x -= 2400; y -= 2400;
  for (let i = 0; i < q; i++) [x, y] = [-y, x];
  return { x: x + 2400, y: y + 2400 };
};

for (let q = 0; q < 4; q++) {
  const veil = new SightVeil();
  const pos = rotate(2520.001, 2112.001, q);
  const view = { player: { pos, tier: 0 }, walk: grid, zone: {},
    doodads: [], doodadsNear: () => [], doodadRev: 0 };
  veil.update(view, 0, 1568, 1196);
  assert.equal(veil.occludedAt(rotate(1836.001, 1614.001, q)), 0,
    `corner ${q}: open ground must agree with the wall shadow's contact eye`);
  assert.ok(veil.occludedAt(rotate(2400, 2800, q)) > .9,
    `corner ${q}: the massif must still hide its far side`);
  veil.userMul = 0;
  veil.update(view, 0, 1568, 1196);
  assert.equal(veil.occludedAt(rotate(2400, 2800, q)), 0, 'veil setting applies immediately');
  console.log(`PASS corner orientation ${q}: clear ground, hidden far side, setting change`);
}
