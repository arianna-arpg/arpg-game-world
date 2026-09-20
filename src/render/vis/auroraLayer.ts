import type { World } from '../../engine/world';
import { AURORAS } from '../../engine/auroraSpec';
import { drawOrbMote } from './orbMote';

export function drawAuroras(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.save();
  for (const row of world.auroras.visuals) {
    const def = AURORAS[row.family];
    if (!def || (world.zone.tiers?.exposure === 'covered' && row.tier !== world.player.tier)) continue;
    ctx.globalAlpha = row.charge;
    drawOrbMote(ctx, row.x, row.y, row.radius * (0.5 + row.charge * 0.5), def.color,
      def.orbPaint, world.time);
  }
  ctx.restore();
}
