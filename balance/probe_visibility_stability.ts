// Subpixel convex corners must not hide actors over visibly clear ground.
// Chromium's actual raster and the renderer frame-order checks live in
// visibility-ui.cjs; this fast companion runs in the ordinary probe suite.
import assert from 'node:assert/strict';
import { SightVeil } from '../src/render/vis/sightVeil';
import { VIS_CFG } from '../src/render/vis/visConfig';
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


// A raised solid's own art is visible; its shadow still hides floor/bodies.
// Omitting the owner is the ordinary query, including for actors and labels.
{
  const statue = { kind: 'weathered_statue' as const, pos: { x: 600, y: 500 }, radius: 48, rot: .24 };
  const other = { kind: 'weathered_statue' as const, pos: { x: 600, y: 600 }, radius: 24, rot: -.18 };
  const ground = new GridWalkField(1600, 1600, 24); ground.fillRect(0, 0, 1599, 1599, true);
  const view = { player: { pos: { x: 600, y: 740 }, tier: 0 }, walk: ground, zone: {},
    doodads: [statue], doodadsNear: () => view.doodads, doodadRev: 0 };
  const veil = new SightVeil();
  const update = () => veil.update(view, 0, 1280, 850);
  update();
  assert.equal(veil.occludedAt(statue.pos), VIS_CFG.sightVeil.doodadStrength, 'ordinary points retain their own-body shadow');
  assert.equal(veil.raisedSurfaceReveal(statue), 1, 'the raised surface ignores its own full OBB');
  assert.equal(veil.occludedAt({ x: 600, y: 390 }), VIS_CFG.sightVeil.doodadStrength, 'its far side remains hidden');
  view.doodads.push(other); view.doodadRev++; update();
  assert.equal(veil.raisedSurfaceReveal(statue), 1 - VIS_CFG.sightVeil.doodadStrength, 'another object still conceals the surface');
  assert.equal(veil.raisedSurfaceReveal(other), 1, 'the nearer object is independently attributed');
  view.doodads.pop(); view.doodadRev++;
  ground.fillRect(0, 590, 1599, 630, false); update();
  assert.ok(veil.raisedSurfaceReveal(statue) < .1, 'a grid wall still conceals raised art');
  ground.fillRect(0, 590, 1599, 630, true); update();
  assert.equal(veil.raisedSurfaceReveal(statue), 1, 'removing the wall reveals the same saved object');
  veil.userMul = 0; update();
  assert.equal(veil.occludedAt(statue.pos), 0);
  assert.equal(veil.raisedSurfaceReveal(statue), 1, 'the user visibility setting remains authoritative');
  console.log('PASS raised surfaces: own OBB, foreign body, grid wall, unchanged far-side shadow and settings');
}
