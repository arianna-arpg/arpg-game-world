import { registerEffectVoice } from './effectVoice';
import { withAlpha, shade } from './color';

registerEffectVoice('ember_nova', (ctx, f, remaining) => {
  const k = 1 - remaining, r = f.radius * (0.25 + k * 0.75);
  ctx.save(); ctx.translate(f.pos.x, f.pos.y);
  ctx.strokeStyle = withAlpha(shade(f.color, .5), remaining); ctx.lineWidth = 1 + 3 * remaining;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const a = i * Math.PI * 2 / 9;
    ctx.fillStyle = withAlpha(f.color, remaining * .65);
    ctx.beginPath(); ctx.ellipse(Math.cos(a) * r * .72, Math.sin(a) * r * .72,
      f.radius * .05, f.radius * .14 * remaining, a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
});
registerEffectVoice('ember_siphon', (ctx, f, remaining) => {
  ctx.save(); ctx.translate(f.pos.x, f.pos.y); ctx.rotate(f.facing ?? 0);
  ctx.strokeStyle = withAlpha(f.color, remaining * .4); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(f.radius, 0); ctx.stroke();
  ctx.fillStyle = withAlpha(shade(f.color, .5), remaining);
  for (let i = 0; i < 3; i++) {
    const q = Math.min(1, 1 - remaining + i * .13);
    ctx.beginPath(); ctx.ellipse(f.radius * q, Math.sin(q * 12) * 2, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
});
