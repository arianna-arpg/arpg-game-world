import type { World } from '../../engine/world';
import { GUARDIANS } from '../../engine/guardianSpec';

export function drawGuardians(ctx: CanvasRenderingContext2D, world: World): void {
  for (const row of world.guardians.visuals) {
    const def = GUARDIANS[row.family];
    if (!def || (world.zone.tiers?.exposure === 'covered' && row.tier !== world.player.tier)) continue;
    ctx.save(); ctx.translate(row.x, row.y);
    const catching = row.kind === 'catch', t = row.progress;
    ctx.rotate(catching ? row.angle : 0);
    const r = row.radius * (catching ? 1 + t * 0.6 : 0.55 + t * 0.45);
    ctx.strokeStyle = ctx.fillStyle = def.color;
    ctx.globalAlpha = catching ? 1 - t : 0.12 + t * 0.65;
    ctx.lineWidth = catching ? 2 : 1.3;
    ctx.beginPath(); ctx.moveTo(-r * 0.4, 0); ctx.lineTo(0, -r);
    ctx.lineTo(r * 0.4, 0); ctx.lineTo(0, r); ctx.closePath(); ctx.stroke();
    ctx.globalAlpha *= 0.15; ctx.fill();
    if (catching) {
      ctx.globalAlpha = 1 - t;
      for (const sign of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(0, sign * r * 0.25);
        ctx.lineTo(-r * t, sign * r * 0.6); ctx.lineTo(r * 0.2, sign * r); ctx.stroke();
      }
    }
    ctx.restore();
  }
}
