import { vec } from '../core/math';
import { GridWalkField } from '../world/gridWalk';
import { layoutParam, registerLayout } from './levelgen';

/** Reusable unobstructed chamber with an authored boss seat. */
registerLayout('arena_court', (ctx, def) => {
  const { arena } = ctx;
  const margin = layoutParam(def, 'courtMargin', 70);
  const seat = layoutParam(def, 'courtSeat', { x: 0.5, y: 0.18 });
  const grid = new GridWalkField(arena.w, arena.h, 30);
  grid.fillRegion(0, 0, arena.w, arena.h, 'wall');
  grid.fillRegion(margin, margin, arena.w - margin, arena.h - margin, 'ground');
  const center = vec(arena.w / 2, arena.h / 2);
  for (const p of [ctx.entry, ...ctx.exits]) {
    grid.fillDisc(p.x, p.y, 110, 'ground');
    grid.carveCorridor(p.x, p.y, center.x, center.y, 80);
  }
  ctx.walk = grid;
  ctx.bossSeat = vec(arena.w * seat.x, arena.h * seat.y);
  // Later scatter must not plug the dodge lanes or the boss's hitbox.
  ctx.reserved.push({ pos: center, radius: Math.hypot(arena.w, arena.h) / 2 });
});
