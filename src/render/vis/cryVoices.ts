// ---------------------------------------------------------------------------
// THE CRY VOICES — the drawn twins of the combat cries (show-don't-tell §3f,
// M-CRY). A cry ('PARRY!', 'block!', 'evade', 'immune'…) stays a `combat`-
// kinded floater the player may mute; the read survives the mute because
// World.cry also pushes a flash wearing one of these voices at the same seat:
//   clash — a spark at the weapon: two bright strokes crossing + a core flare
//   glint — the shield's highlight: a short bright arc sweeping the rim
//   blur  — the evader's body smear: fading offset discs along the facing
//   ward  — the flat grey ring of immunity/resistance: thin, steady, no growth
// Pure painters over THE EFFECT VOICE registry; dials in VIS_CFG.cryVoice.
// ---------------------------------------------------------------------------

import { registerEffectVoice } from './effectVoice';
import { VIS_CFG } from './visConfig';
import { withAlpha, shade } from './color';

registerEffectVoice('clash', (ctx, f, t) => {
  const cfg = VIS_CFG.cryVoice.clash;
  const k = 1 - t; // progress 0 → 1
  const R = f.radius * cfg.scale * (0.6 + 0.4 * Math.min(1, k * 3));
  const a = Math.min(1, t * 1.6) * cfg.alpha;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const ang = (f.facing ?? 0) + Math.PI / 4 + i * Math.PI / 2 + cfg.tilt;
    const dx = Math.cos(ang) * R, dy = Math.sin(ang) * R;
    ctx.strokeStyle = withAlpha(i === 0 ? '#fff6d0' : shade(f.color, 0.35), a);
    ctx.lineWidth = Math.max(1, cfg.width * (1.2 - k));
    ctx.beginPath(); ctx.moveTo(f.pos.x - dx, f.pos.y - dy); ctx.lineTo(f.pos.x + dx, f.pos.y + dy); ctx.stroke();
  }
  const core = Math.max(1, R * cfg.core * (1 - k * 0.6));
  ctx.fillStyle = withAlpha('#ffffff', a * 0.9);
  ctx.beginPath(); ctx.arc(f.pos.x, f.pos.y, core, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
});

registerEffectVoice('glint', (ctx, f, t) => {
  const cfg = VIS_CFG.cryVoice.glint;
  const k = 1 - t;
  const R = f.radius * cfg.scale;
  const base = (f.facing ?? 0) - cfg.sweep / 2 + cfg.sweep * k; // the highlight sweeps the rim
  const a = Math.sin(Math.min(1, k) * Math.PI) * cfg.alpha;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = withAlpha('#ffffff', a);
  ctx.lineWidth = Math.max(1, cfg.width);
  ctx.beginPath(); ctx.arc(f.pos.x, f.pos.y, R, base - cfg.arc / 2, base + cfg.arc / 2); ctx.stroke();
  ctx.strokeStyle = withAlpha(shade(f.color, 0.3), a * 0.6);
  ctx.lineWidth = Math.max(1, cfg.width * 2.2);
  ctx.beginPath(); ctx.arc(f.pos.x, f.pos.y, R, base - cfg.arc, base + cfg.arc); ctx.stroke();
  ctx.restore();
});

registerEffectVoice('blur', (ctx, f, t) => {
  const cfg = VIS_CFG.cryVoice.blur;
  const k = 1 - t;
  const ang = (f.facing ?? 0) + Math.PI; // the ghosts trail BEHIND the move
  const step = f.radius * cfg.step;
  ctx.save();
  for (let i = 1; i <= cfg.ghosts; i++) {
    const d = step * i * (0.4 + 0.6 * k);
    const a = (1 - i / (cfg.ghosts + 1)) * t * cfg.alpha;
    ctx.fillStyle = withAlpha(f.color, a);
    ctx.beginPath();
    ctx.arc(f.pos.x + Math.cos(ang) * d, f.pos.y + Math.sin(ang) * d, Math.max(1, f.radius * (1 - i * 0.12)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
});

registerEffectVoice('ward', (ctx, f, t) => {
  const cfg = VIS_CFG.cryVoice.ward;
  const a = Math.min(1, t * 2) * cfg.alpha; // steady, then gone — no growth
  ctx.save();
  ctx.strokeStyle = withAlpha(cfg.color, a);
  ctx.lineWidth = Math.max(1, cfg.width);
  ctx.beginPath(); ctx.arc(f.pos.x, f.pos.y, f.radius, 0, Math.PI * 2); ctx.stroke();
  if (cfg.ticks > 0) {
    ctx.lineWidth = Math.max(1, cfg.width * 0.8);
    for (let i = 0; i < cfg.ticks; i++) {
      const ang = (i / cfg.ticks) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(f.pos.x + Math.cos(ang) * f.radius, f.pos.y + Math.sin(ang) * f.radius);
      ctx.lineTo(f.pos.x + Math.cos(ang) * (f.radius + cfg.tickLen), f.pos.y + Math.sin(ang) * (f.radius + cfg.tickLen));
      ctx.stroke();
    }
  }
  ctx.restore();
});
