import { LOOKS } from '../../data/looks';
import { lookPalette, paintLook, type LookDef } from './parts';
import type { GroupPainter } from './painters';

/** The same kit-parts can dress a solid terrain body. A continuous Titan
 * uses real, painted collision discs, rather than invisible portal plugs. */
export const creatureTerrain: GroupPainter = ({ ctx, time }, group, def) => {
  const p = def.params ?? {};
  const color = typeof p.color === 'string' ? p.color : '#b8cbcb';
  for (const d of group) {
    ctx.save(); ctx.translate(d.pos.x, d.pos.y); ctx.rotate(d.rot ?? 0);
    const r = d.radius;
    if (p.vortex || p.warning) {
      ctx.strokeStyle = color; ctx.lineWidth = p.warning ? 3 : 5;
      ctx.globalAlpha *= p.warning ? 0.45 + 0.2 * Math.sin(time * 5) : 0.7;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      if (p.vortex) {
        ctx.rotate(time * 2);
        for (let arm = 0; arm < 3; arm++) {
          ctx.rotate(Math.PI * 2 / 3); ctx.beginPath();
          for (let n = 0; n <= 25; n++) {
            const t = n / 25, a = t * Math.PI * 1.4;
            const x = Math.cos(a) * r * t, y = Math.sin(a) * r * t;
            n ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
      }
    } else {
      const look = typeof p.look === 'string' ? LOOKS[p.look] : p.look as LookDef | undefined;
      if (look) paintLook(ctx, r, look, lookPalette(color, typeof p.material === 'string' ? p.material : undefined));
    }
    ctx.restore();
  }
};
