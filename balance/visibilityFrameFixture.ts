import { Renderer } from '../src/render/renderer';
import { SightVeil } from '../src/render/vis/sightVeil';
import { VIS_CFG } from '../src/render/vis/visConfig';
import { GridWalkField } from '../src/world/gridWalk';
import { makeSimWorld } from '../src/sim/arena';
import { roofStyle } from '../src/data/structures';

/** Exercise the real render passes; no simulation steps or production saves. */
export function checkVisibilityFrames() {
  const world = makeSimWorld('warrior', 418);
  const grid = new GridWalkField(4800, 4800, 24);
  grid.fillRect(0, 0, 4799, 4799, true);
  grid.fillDisc(2400, 2400, 72, 'wall');
  world.walk = grid;
  world.zone.size = { w: 4800, h: 4800 };
  world.actors = [world.player];
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const renderer = new Renderer(canvas);
  // Instrument the renderer's real visibility instance at its public query
  // boundary, without replacing a drawing pass or its occlusion algorithm.
  const internals = renderer as unknown as { sightVeil: SightVeil; roofFade: Map<string, number> };
  const veil = internals.sightVeil;
  const shade = veil.actorShade.bind(veil);
  const samples: { name: string; body: number; ground: number; expected: number }[] = [];
  let bodyShade = -1;
  veil.actorShade = (actor, dt) => {
    const value = shade(actor, dt);
    if (actor === world.actors[1]) bodyShade = value;
    return value;
  };
  const frame = (name: string, px: number, py: number, ex: number, ey: number, expected: number) => {
    world.player.pos = { x: px, y: py };
    const enemy = world.createMonster('zombie', 1, 'enemy');
    enemy.pos = { x: ex, y: ey };
    world.actors = [world.player, enemy]; // fresh body: no historical fade
    world.time += 1 / 60;
    bodyShade = -1;
    renderer.render(world);
    samples.push({ name, body: bodyShade,
      ground: veil.occludedAt(enemy.pos, enemy.tier) * VIS_CFG.sightVeil.actorHide, expected });
  };
  const hidden = VIS_CFG.sightVeil.actorHide;
  frame('first frame behind a massif', 2260, 2400, 2540, 2400, hidden);
  frame('move into an open sightline', 2540, 2200, 2540, 2400, 0);
  frame('move behind the massif again', 2260, 2400, 2540, 2400, hidden);
  const failures = samples.filter(s => Math.abs(s.body - s.ground) > 1e-6
    || Math.abs(s.ground - s.expected) > 1e-6);
  // Crossing a roof's reveal threshold must affect its shadow hull during
  // that very frame, including replacement structures with recycled IDs.
  const rect = { x: 2304, y: 2016, w: 192, h: 192 };
  const structure = { id: 'visibility-roof', defId: 'fixture', rect, cellSize: 24,
    roofs: [rect], roofStyle: 'thatch', floors: [], courtyards: [], doors: [], slots: [] };
  world.structures = [structure];
  const update = veil.update.bind(veil);
  let hulls = -1;
  veil.update = (...args) => { hulls = args[4]?.length ?? 0; update(...args); };
  const roofs: { name: string; fade: number; hulls: number; expected: number }[] = [];
  const roofFrame = (name: string, inside: boolean) => {
    world.player.pos = { x: inside ? 2400 : 2200, y: 2100 };
    world.time += 1 / 60;
    renderer.render(world);
    const fade = internals.roofFade.get(structure.id) ?? roofStyle(structure.roofStyle).alpha;
    roofs.push({ name, fade, hulls, expected: fade > VIS_CFG.sightVeil.hullGate ? 1 : 0 });
  };
  roofFrame('outside', false);
  for (let i = 0; i < 10; i++) roofFrame('enter ' + i, true);
  for (let i = 0; i < 10; i++) roofFrame('leave ' + i, false);
  for (let i = 0; i < 10; i++) roofFrame('reenter ' + i, true);
  world.structures = [{ ...structure }];
  roofFrame('replacement structure outside', false);
  const roofFailures = roofs.filter(s => s.hulls !== s.expected);
  return { samples, failures, roofs, roofFailures };
}
