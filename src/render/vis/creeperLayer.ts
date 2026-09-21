import type { World } from '../../engine/world';
import { CREEPERS } from '../../engine/creeperSpec';

/** Broken soil, a moving ridge, then a committed eruption; no combat prose. */
export function drawCreepers(ctx: CanvasRenderingContext2D, world: World): void {
  for (const v of world.creepers.visuals) {
    const d = CREEPERS[v.family];
    if (!d || (world.zone.tiers?.exposure === 'covered' && v.tier !== world.player.tier)) continue;
    ctx.save();
    ctx.strokeStyle = d.soil; ctx.lineWidth = 2;
    for (const p of v.trail) {
      ctx.globalAlpha = 0.35 * p.life / d.trailLife;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, v.radius * 0.7, v.radius * 0.35, v.angle, 0, Math.PI); ctx.stroke();
    }
    ctx.translate(v.x, v.y);
    if (v.phase === 'windup' || v.phase === 'strike') {
      const striking = v.phase === 'strike', t = v.progress;
      ctx.strokeStyle = d.color;
      ctx.globalAlpha = striking ? 1 - t : 0.3 + t * 0.6;
      ctx.lineWidth = striking ? 2 : 1;
      ctx.beginPath(); ctx.arc(0, 0, v.strikeRadius, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const angle = i * Math.PI * 2 / 7, r = v.strikeRadius;
        ctx.save(); ctx.rotate(angle);
        ctx.beginPath(); ctx.moveTo(r * 0.2, 0);
        ctx.lineTo(r * (striking ? 0.7 + t * 0.3 : 0.3 + t * 0.45), -3);
        ctx.lineTo(r * (striking ? 1 : 0.5 + t * 0.5), 2); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.rotate(v.angle);
    ctx.globalAlpha = v.phase === 'arm' ? 0.2 + 0.8 * v.progress : v.phase === 'return' ? 0.65 : 0.9;
    ctx.fillStyle = d.soil; ctx.strokeStyle = d.color; ctx.lineWidth = 1.4;
    // Three overlapping ridges read as a submerged creature rather than an orb.
    for (let i = 2; i >= 0; i--) {
      const r = v.radius * (1 - i * 0.2);
      ctx.beginPath(); ctx.ellipse(-i * v.radius * 0.65, 0, r, r * 0.55, 0, Math.PI, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
}
