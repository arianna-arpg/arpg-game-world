import { drawOrbMote } from './orbMote';
import type { World } from '../../engine/world';
import { SATELLITES } from '../../engine/satelliteSpec';

/** Exact host contact discs. The open iron shell reads as a relic, not a drone. */
export function drawSatellites(ctx: CanvasRenderingContext2D, world: World): void {
  if (!world.satellites.visuals.length && !world.satellites.flights.visuals.length) return;
  ctx.save();
  for (const shot of world.satellites.flights.visuals) {
    const def = SATELLITES[shot.family];
    if (!def || (world.zone.tiers?.exposure === 'covered' && shot.tier !== world.player.tier)) continue;
    const t = shot.progress;
    ctx.setLineDash([]); ctx.fillStyle = ctx.strokeStyle = def.color;
    ctx.globalAlpha = shot.phase === 'flight' ? 0.09 + t * 0.12 : (1 - t) * 0.65;
    ctx.beginPath(); ctx.arc(shot.to.x, shot.to.y, shot.radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = shot.phase === 'flight' ? 0.65 + t * 0.3 : 1 - t;
    ctx.lineWidth = shot.phase === 'flight' ? 1.5 : 3;
    ctx.stroke();
    if (shot.phase === 'impact') {
      ctx.beginPath(); ctx.arc(shot.to.x, shot.to.y, shot.radius * t, 0, Math.PI * 2); ctx.stroke();
      continue;
    }
    const dx = shot.to.x - shot.from.x, dy = shot.to.y - shot.from.y;
    const apex = Math.min(280, Math.max(46, Math.hypot(dx, dy) * shot.arc));
    const at = (u: number) => ({ x: shot.from.x + dx * u, y: shot.from.y + dy * u - 4 * u * (1 - u) * apex });
    const head = at(t), tail = at(Math.max(0, t - 0.1));
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(head.x, head.y); ctx.stroke();
    ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(head.x, head.y, 4 + 2 * t, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.core; ctx.beginPath(); ctx.arc(head.x, head.y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  const rings = new Set<string>();
  for (const row of world.satellites.visuals) {
    const def = SATELLITES[row.family];
    if (!def || (world.zone.tiers?.exposure === 'covered' && row.tier !== world.player.tier)) continue;
    if (row.aimX !== undefined && row.aimY !== undefined) {
      ctx.strokeStyle = def.color; ctx.globalAlpha = 0.2 + (row.aimProgress ?? 0) * 0.45;
      ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(row.x, row.y); ctx.lineTo(row.aimX, row.aimY); ctx.stroke();
      ctx.setLineDash([]);
    }
    const key = `${row.owner}:${row.family}`;
    ctx.strokeStyle = def.color;
    if (!rings.has(key)) {
      rings.add(key);
      ctx.globalAlpha = row.armed ? 0.12 : 0.22;
      ctx.lineWidth = 1; ctx.setLineDash([2, 9]);
      ctx.beginPath(); ctx.arc(row.cx, row.cy, row.orbit, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = row.blocked ? 0.12 : row.armed ? 0.8 : 0.25 + 0.35 * row.progress;
    // Short wake: decoration only, never a second damage surface.
    ctx.lineWidth = row.radius * 0.65;
    ctx.beginPath(); ctx.arc(row.cx, row.cy, row.orbit, row.angle - 0.16, row.angle); ctx.stroke();
    ctx.globalAlpha = row.blocked ? 0.2 : row.armed ? 1 : 0.35 + 0.5 * row.progress;
    if (def.orbPaint) {
      drawOrbMote(ctx, row.x, row.y, row.radius, def.color, def.orbPaint, world.time);
    } else {
      ctx.fillStyle = def.emit ? def.core : '#181d27'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(row.x, row.y, row.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = def.core; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(row.x, row.y, row.radius * 0.58, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = def.color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(row.x - 1, row.y - 1, row.radius * 0.72, 3.5, 5.2); ctx.stroke();
    }
    if (!row.armed && !row.blocked) {
      ctx.beginPath(); ctx.arc(row.x, row.y, row.radius + 4, -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * row.progress); ctx.stroke();
    }
  }
  ctx.restore();
}
