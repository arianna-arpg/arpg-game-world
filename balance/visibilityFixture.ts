import { SightVeil } from '../src/render/vis/sightVeil';
import { GridWalkField } from '../src/world/gridWalk';
import { checkVisibilityFrames } from './visibilityFrameFixture';

interface Point { x: number; y: number }
interface Failure { pose: number; count: number; eye: Point; example: Point & { alpha: number } }

/** Actual Chromium canvas raster vs actor/label visibility, away from the
 * feathered silhouette. Sweep orbits and every exposed stair-step contact. */
function sweep() {
  const width = 1568, height = 1196;
  const grid = new GridWalkField(4800, 4800, 24);
  grid.fillRect(0, 0, 4799, 4799, true);
  grid.fillDisc(2400, 2400, 300, 'wall');
  const veil = new SightVeil(), eye = { x: 0, y: 0 };
  const view = { player: { pos: eye, tier: 0 }, walk: grid, zone: {},
    doodads: [], doodadsNear: () => [], doodadRev: 0 };
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  const failures: Failure[] = [];
  let tested = 0, testedPoses = 0;
  let worst: (Failure & { image: string }) | undefined;
  const positions: Point[] = [];
  for (const distance of [310, 330, 450]) for (let i = 0; i < 144; i++) {
    const angle = i * Math.PI / 72;
    positions.push({ x: 2400 + Math.cos(angle) * distance, y: 2400 + Math.sin(angle) * distance });
  }
  for (let y = 2088; y <= 2712; y += 24) for (let x = 2088; x <= 2712; x += 24) {
    if (grid.isWalkable(x + 12, y + 12)) continue;
    for (const [nx, ny] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!grid.isWalkable(x + 12 + nx * 24, y + 12 + ny * 24)) continue;
      for (const distance of [.001, .49, 1.49, 1.51, 4]) for (const along of [-11.999, 0, 11.999]) {
        positions.push({ x: x + 12 + nx * (12 + distance) + ny * along,
          y: y + 12 + ny * (12 + distance) + nx * along });
      }
    }
  }
  for (let pose = 0; pose < positions.length; pose++) {
    Object.assign(eye, positions[pose]);
    if (!grid.isWalkable(eye.x, eye.y)) continue;
    testedPoses++;
    const cx = eye.x - width / 2, cy = eye.y - height / 2;
    veil.update(view, 0, width, height);
    ctx.clearRect(0, 0, width, height);
    veil.draw(ctx, cx, cy, 1, width, height);
    const pixels = ctx.getImageData(0, 0, width, height);
    let count = 0, example: Failure['example'] | undefined;
    for (let y = 100; y < height - 100; y += 32) for (let x = 100; x < width - 100; x += 32) {
      const wx = cx + x, wy = cy + y;
      if (Math.hypot(wx - eye.x, wy - eye.y) > 850) continue;
      // A 48px neighborhood fully hidden by the query excludes legitimate
      // feather/antialias transitions from the missing-shadow assertion.
      if (![-24, 0, 24].every(dx => [-24, 0, 24].every(dy => veil.occludedAt({ x: wx + dx, y: wy + dy }) > .9))) continue;
      tested++;
      const alpha = pixels.data[(y * width + x) * 4 + 3];
      if (alpha < 170) { count++; example ??= { x: wx, y: wy, alpha }; }
    }
    if (example) {
      const failure = { pose, count, eye: { ...eye }, example };
      failures.push(failure);
      if (!worst || count > worst.count) worst = { ...failure, image: canvas.toDataURL() };
    }
  }
  canvas.remove();
  return { tested, testedPoses, failures, worst };
}

const fixture = { sweep, frames: checkVisibilityFrames };
declare global { interface Window { visibilityFixture: typeof fixture } }
window.visibilityFixture = fixture;
