import { registerEffectVoice } from './effectVoice';
import type { AssemblyPart } from '../../engine/summonPactSpec';

export const SUMMON_PACT_VIS = { bankRadius: 3.5, emptyAlpha: 0.22, soil: '#332827', rim: '#79665b', graveHeight: 17 };
const TAU = Math.PI * 2;

/** Readable physical silhouettes; color is secondary to the selected part's shape. */
function part(ctx: CanvasRenderingContext2D, shape: AssemblyPart['shape'], r: number, color: string): void {
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, r * 0.18); ctx.lineCap = 'round';
  ctx.beginPath();
  if (shape === 'bone') {
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(0, i * r * 0.35); ctx.quadraticCurveTo(-r, i * r * 0.45, -r * 0.6, i * r * 0.35 + r * 0.3);
      ctx.moveTo(0, i * r * 0.35); ctx.quadraticCurveTo(r, i * r * 0.45, r * 0.6, i * r * 0.35 + r * 0.3);
    }
    ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
  } else if (shape === 'claw') {
    for (let i = 0; i < 3; i++) { ctx.moveTo(-r * 0.5 + i * r * 0.45, r * 0.8); ctx.quadraticCurveTo(r * 0.8 + i * r * 0.1, 0, -r * 0.45 + i * r * 0.5, -r); }
    ctx.stroke();
  } else if (shape === 'heart') {
    ctx.moveTo(0, r); ctx.bezierCurveTo(-r * 1.8, -r * 0.2, -r * 0.6, -r * 1.3, 0, -r * 0.4);
    ctx.bezierCurveTo(r * 0.6, -r * 1.3, r * 1.8, -r * 0.2, 0, r); ctx.fill();
  } else {
    ctx.ellipse(0, -r * 0.15, r * 0.8, r * 0.9, 0, 0, TAU); ctx.fill();
    ctx.fillRect(-r * 0.5, r * 0.4, r, r * 0.55);
    ctx.fillStyle = '#241e29';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * r * 0.33, -r * 0.2, r * 0.22, 0, TAU); ctx.fill(); }
  }
}

registerEffectVoice('summon_pact', (ctx, f) => {
  const cue = f.summonPactCue;
  if (!cue) return;
  const c = SUMMON_PACT_VIS;
  ctx.save(); ctx.translate(f.pos.x, f.pos.y);
  if (cue.kind === 'part') {
    ctx.fillStyle = '#1d151dc0'; ctx.beginPath(); ctx.ellipse(0, 5, 16, 8, 0, 0, TAU); ctx.fill();
    ctx.shadowBlur = 8; ctx.shadowColor = f.color;
    part(ctx, cue.shape ?? 'bone', f.radius * 0.8, f.color);
  } else if (cue.kind === 'graveyard') {
    ctx.fillStyle = c.soil + '99'; ctx.beginPath(); ctx.ellipse(0, 0, f.radius, f.radius * 0.55, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = cue.active ? f.color : c.rim; ctx.lineWidth = cue.active ? 2.5 : 1;
    ctx.stroke();
    for (let i = 0; i < cue.count; i++) {
      const a = i * 2.4, r = f.radius * (0.2 + (i % 3) * 0.21);
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.5;
      ctx.strokeStyle = f.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - c.graveHeight);
      ctx.moveTo(x - 6, y - 12); ctx.lineTo(x + 6, y - 12); ctx.stroke();
    }
    if (cue.active) {
      ctx.strokeStyle = f.color; ctx.lineWidth = 4; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.ellipse(0, 0, f.radius, f.radius * 0.55, 0, -Math.PI / 2, -Math.PI / 2 + TAU * cue.fill); ctx.stroke();
    }
  } else {
    // The inner soul gauge and outer recipe sit on opposite halves of the body.
    const filled = Math.round(cue.fill * cue.count);
    for (let i = 0; i < cue.count; i++) {
      const a = (cue.kind === 'bank' ? Math.PI : 0) + (i + 0.5) / cue.count * Math.PI;
      ctx.save(); ctx.translate(Math.cos(a) * f.radius, Math.sin(a) * f.radius * 0.65);
      ctx.globalAlpha = i < filled ? 0.95 : c.emptyAlpha;
      if (cue.kind === 'assembly' && cue.parts?.[i]) part(ctx, cue.parts[i].shape, 4, cue.parts[i].color);
      else { ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(0, 0, c.bankRadius, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }
  ctx.restore();
});

registerEffectVoice('summon_pact_dust', (ctx, f, t) => {
  ctx.save(); ctx.fillStyle = f.color; ctx.globalAlpha = t * 0.45;
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4, r = f.radius * (0.15 + i / 20) * (1.4 - t * 0.4);
    ctx.beginPath(); ctx.ellipse(f.pos.x + Math.cos(a) * r, f.pos.y + Math.sin(a) * r * 0.5 - (1 - t) * 22, 3 + (1 - t) * 9, 2 + (1 - t) * 5, a, 0, TAU); ctx.fill();
  }
  ctx.restore();
});
