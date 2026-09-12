// Exercise the real projectile painter with a counting canvas. No GPU needed.
import { strict as assert } from 'node:assert';
import { Renderer } from '../src/render/renderer';
import type { World } from '../src/engine/world';
import type { ProjectileShape } from '../src/engine/skills';
import { VIS_CFG } from '../src/render/vis/visConfig';
import { clearBakes } from '../src/render/vis/sprites';

let gradients = 0, commands = 0, tethers = 0;
const gradient = { addColorStop() {} };
const ctx = new Proxy({ globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
  get(target, key) {
    if (key === 'createLinearGradient') return () => { gradients++; commands++; return gradient; };
    if (key === 'createRadialGradient') return () => gradient;
    if (key in target) return Reflect.get(target, key);
    return () => { commands++; };
  },
});
const savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
Object.defineProperty(globalThis, 'document', { configurable: true, value: {
  createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
} });
type Painter = {
  cam: { x: number; y: number }; canvas: { width: number; height: number };
  ctx: CanvasRenderingContext2D; baseZoom: number; couchStretch: number; pixelScale: number;
  drawProjectiles: (world: World) => void; drawTethers: () => void;
};
const painter = Object.create(Renderer.prototype) as Painter;
Object.assign(painter, { ctx, baseZoom: 1.3, couchStretch: 1, pixelScale: 1,
  cam: { x: 200, y: -100 }, canvas: { width: 1300, height: 780 },
  drawTethers: () => { tethers++; } });
const flight = (shape: ProjectileShape, x: number, y: number, radius = 10) =>
  ({ shape, pos: { x, y }, radius, dir: Math.PI / 4, age: 1, color: '#abcdef' });
const draw = (projectiles: ReturnType<typeof flight>[], shake = 0): number => {
  gradients = 0; commands = 0;
  painter.drawProjectiles({ projectiles, shake } as unknown as World);
  return gradients;
};
try {
  const shapes: ProjectileShape[] = ['circle', 'vortex', 'square', 'line', 'triangle', 'octagon', 'bar', 'arc', 'wave'];
  assert.equal(draw(shapes.map(s => flight(s, 700, 200))), shapes.length);
  assert.equal(draw(Array.from({ length: 1000 }, (_, i) => flight('wave', -10000 - i, 200))), 0);
  assert.equal(commands, 0, 'offscreen flights issue no canvas commands');
  assert.equal(tethers, 2, 'tethers remain an independent pass even when flights are culled');
  assert.equal(draw([flight('circle', 120, 200)], 50), 1, 'camera shake can bring an edge effect into view');
  // All four edges, including centers outside the view whose glow, broad
  // form or backward trail can still reach the screen.
  for (const scale of [1, 0.55]) for (const stretch of [1, 0.7]) {
    painter.pixelScale = scale; painter.couchStretch = stretch;
    painter.canvas.width = 1300 * scale; painter.canvas.height = 780 * scale;
    const right = 200 + 1000 / stretch, bottom = -100 + 600 / stretch;
    for (const shape of shapes) {
      assert.equal(draw([
        flight(shape, 180, 200), flight(shape, right + 20, 200),
        flight(shape, 700, -120), flight(shape, 700, bottom + 20),
      ]), 4, `${shape} edge effects survive scale ${scale}, couch ${stretch}`);
      assert.equal(draw([flight(shape, right + 500, 200, 200)]), 1, 'large effects are not center-culled');
    }
  }
  const fx = VIS_CFG.fx as { streakLen: number };
  const old = fx.streakLen;
  try {
    fx.streakLen = 100;
    assert.equal(draw([flight('line', -500, 200)]), 1, 'live extended trails remain visible');
  } finally { fx.streakLen = old; }
  console.log('PASS projectile culling: all forms, four edges, render/couch scales, large effects, live tuning, tethers; 1000 offscreen flights issue zero canvas commands');
} finally {
  clearBakes();
  if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument);
  else Reflect.deleteProperty(globalThis, 'document');
}
