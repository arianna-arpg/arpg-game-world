import type { Actor } from '../../engine/actor';
import type { World } from '../../engine/world';
import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import { PAINTERS, paintBakedWhole } from './painters';
import { MOVEMENT_TETHER_CFG, movementTetherDistance } from '../../engine/movementTether';

/** Draw inside the actor's visibility gates, before its body. The cord is
 * cosmetic; its endpoints and tension come from authoritative simulation. */
export function drawMovementTether(ctx: CanvasRenderingContext2D, a: Actor, world: World): void {
  const t = a.movementTether;
  if (!t || t.released || a.dead) return;
  const s = t.spec, p = t.point, q = a.pos;
  const tension = Math.min(1, movementTetherDistance(t, q) / s.length);
  const color = s.color ?? MOVEMENT_TETHER_CFG.color;
  const size = s.anchorSize ?? MOVEMENT_TETHER_CFG.anchorSize;
  const width = s.width ?? MOVEMENT_TETHER_CFG.width;
  ctx.save();
  ctx.setLineDash([]);
  ctx.strokeStyle = color; ctx.fillStyle = '#252622'; ctx.lineWidth = 2;
  // A grounded root crown, grave marker or iron stake makes the origin legible.
  if (t.anchorId === undefined) {
    const art = s.anchorDoodad && DOODAD_VISUALS[s.anchorDoodad];
    if (art) {
      const env = { ctx, world, theme: world.zone.theme, time: world.time };
      const group = [{ kind: s.anchorDoodad!, pos: p, radius: size }];
      ctx.save();
      if (art.bakeWhole) paintBakedWhole(env, group, art);
      else PAINTERS[art.painter]?.(env, group, art);
      ctx.restore();
    } else {
      ctx.beginPath();
      if (s.style === 'vine') {
        for (let i = 0; i < 6; i++) {
          const r = i * Math.PI / 3;
          ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(r) * size, p.y + Math.sin(r) * size * 0.6);
        }
      } else if (s.style === 'spirit') {
        ctx.roundRect(p.x - size * 0.6, p.y - size * 1.5, size * 1.2, size * 1.7, size * 0.3);
        ctx.fill();
      } else {
        ctx.moveTo(p.x, p.y + size * 0.4); ctx.lineTo(p.x, p.y - size);
        ctx.moveTo(p.x - size * 0.5, p.y - size * 0.6); ctx.lineTo(p.x + size * 0.5, p.y - size * 0.6);
      }
      ctx.stroke();
    }
  }
  const sag = (1 - tension) * Math.min(32, s.length * 0.12);
  ctx.beginPath(); ctx.moveTo(p.x, p.y);
  ctx.quadraticCurveTo((p.x + q.x) / 2, (p.y + q.y) / 2 + sag, q.x, q.y);
  if (s.glow) {
    const breath = 0.8 + 0.2 * Math.sin(world.time * (s.glow.pulse ?? 2));
    ctx.strokeStyle = color;
    for (const scale of [1, 0.6, 0.3]) {
      ctx.lineWidth = width + s.glow.width * scale;
      ctx.globalAlpha = s.glow.opacity * breath * (1 - scale * 0.5);
      ctx.stroke();
    }
  } else {
    ctx.lineWidth = width + 2; ctx.strokeStyle = '#192017'; ctx.globalAlpha = (s.opacity ?? 1) * 0.7; ctx.stroke();
  }
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.globalAlpha = (s.opacity ?? 1) * (t.returning ? 1 : 0.65 + tension * 0.3);
  ctx.lineCap = 'round';
  if (s.style === 'chain') ctx.setLineDash([5, 3]);
  ctx.stroke();
  ctx.restore();
}
