import { registerEffectVoice } from './effectVoice';

/** Authoritative receipts only. Every shape is a reusable formation cue. */
registerEffectVoice('battle_doctrine', (ctx, f, life) => {
  const d = f.doctrineCue; if (!d) return;
  ctx.save(); ctx.translate(f.pos.x, f.pos.y); ctx.strokeStyle = f.color; ctx.fillStyle = f.color;
  ctx.lineWidth = 2;
  if (d.kind === 'meter') {
    for (let i = 0; i < d.max; i++) {
      const a = Math.PI * (1.1 + i / Math.max(1, d.max - 1) * .8);
      ctx.globalAlpha = i < d.count ? .9 : .18;
      ctx.beginPath(); ctx.rect(Math.cos(a) * f.radius - 3, Math.sin(a) * f.radius - 3, 6, 6); ctx.fill();
    }
  } else {
    ctx.globalAlpha = Math.min(.8, life);
    const r = f.radius * (1.15 - life * .15);
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * .55, 0, 0, Math.PI * 2); ctx.stroke();
    const n = Math.max(3, Math.min(16, d.count));
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      const x = d.formation === 'wedge' ? (i % 2 ? 1 : -1) * (Math.floor(i / 2) + 1) * r / (n / 2 + 1)
        : Math.cos(a) * r * (d.formation === 'scatter' && i % 2 ? .4 : .7);
      const y = d.formation === 'wedge' ? Math.floor(i / 2) * r / n - r * .3 : Math.sin(a) * r * .4;
      ctx.beginPath(); ctx.moveTo(x - 5, y + 4); ctx.lineTo(x, y - 6); ctx.lineTo(x + 5, y + 4);
      if (d.kind === 'harvest') ctx.closePath(); ctx.stroke();
    }
  }
  ctx.restore();
});
