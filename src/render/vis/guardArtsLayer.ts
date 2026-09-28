import type { World } from '../../engine/world';

/** A filling rim and converging ribs mark the actual moving explosion area. */
export function drawGuardArts(ctx: CanvasRenderingContext2D, world: World): void {
  if (!world.guardArts.visuals.length) return;
  ctx.save();
  for (const v of world.guardArts.visuals) {
    if (world.zone.tiers?.exposure === 'covered' && v.tier !== world.player.tier) continue;
    if (v.plates) {
      const span = (v.arc ?? Math.PI) / (v.slots ?? v.plates);
      ctx.strokeStyle = v.color; ctx.lineWidth = 5; ctx.globalAlpha = 0.9;
      for (let i = 0; i < v.plates; i++) {
        const start = (v.facing ?? 0) - (v.arc ?? Math.PI) / 2 + i * span;
        ctx.beginPath(); ctx.arc(v.x, v.y, v.radius, start + span * 0.12, start + span * 0.88); ctx.stroke();
      }
      continue;
    }
    const t = Math.max(0, Math.min(1, v.progress));
    ctx.strokeStyle = v.color; ctx.lineWidth = 1; ctx.globalAlpha = 0.16 + 0.24 * t;
    ctx.beginPath(); ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2 + 2 * t; ctx.globalAlpha = 0.5 + 0.45 * t;
    ctx.beginPath(); ctx.arc(v.x, v.y, v.radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3 + world.time * 0.4, r = v.radius * (1 - t * 0.75);
      ctx.beginPath(); ctx.moveTo(v.x + Math.cos(angle) * r, v.y + Math.sin(angle) * r);
      ctx.lineTo(v.x + Math.cos(angle) * (r + 10), v.y + Math.sin(angle) * (r + 10)); ctx.stroke();
    }
  }
  ctx.restore();
}
