import { SKILL_BURSTS, SKILL_BURST_STYLE as C, skillBurstVoice, type BurstMotif, type SkillBurstProfile } from '../../data/skillVisuals';
import { registerEffectVoice, type EffectVoiceFlash } from './effectVoice';
import { traceFlashFigure } from './aoeTrace';
import { hash01, shade, withAlpha } from './color';

const TAU = Math.PI * 2;

/** Small reusable material marks, painted in a radial local frame. No text,
 * image assets, frame-random particles, or screen-space effects. */
function mark(ctx: CanvasRenderingContext2D, motif: BurstMotif, s: number, k: number): void {
  ctx.beginPath();
  switch (motif) {
    case 'ice':
      ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
      for (const sign of [-1, 1]) {
        ctx.moveTo(-s * 0.5, sign * s * 0.5); ctx.lineTo(0, 0);
        ctx.moveTo(0, sign * s * 0.4); ctx.lineTo(s * 0.5, 0);
      }
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 1.15, 0); ctx.lineTo(s * 0.6, -s * 0.18);
      ctx.lineTo(s * 0.42, 0); ctx.lineTo(s * 0.6, s * 0.18); ctx.closePath(); ctx.fill();
      break;
    case 'flame':
      ctx.moveTo(-s, 0);
      ctx.bezierCurveTo(-s * 0.4, -s * 0.9, s * 0.6, -s * 0.55, s * 1.35, -s * (0.1 + k * 0.5));
      ctx.quadraticCurveTo(s * 0.4, s * 0.05, s * 0.25, s * 0.45);
      ctx.quadraticCurveTo(-s * 0.5, s * 0.6, -s, 0); ctx.fill();
      break;
    case 'cracks':
      ctx.moveTo(-s * 2, 0); ctx.lineTo(-s * 0.7, s * 0.18);
      ctx.lineTo(-s * 0.25, -s * 0.25); ctx.lineTo(s * 0.45, s * 0.15); ctx.lineTo(s, -s * 0.08);
      ctx.moveTo(-s * 0.7, s * 0.18); ctx.lineTo(-s * 0.45, s * 0.65); ctx.lineTo(s * 0.2, s * 0.9);
      ctx.moveTo(s * 0.45, s * 0.15); ctx.lineTo(s * 0.1, -s * 0.8); ctx.stroke();
      break;
    case 'blades':
      ctx.moveTo(-s, s * 0.15);
      ctx.quadraticCurveTo(s * 0.1, -s * 1.6, s * 1.35, -s * 0.65);
      ctx.quadraticCurveTo(s * 0.15, -s * 0.75, -s * 0.45, s * 0.35);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'arcs':
      ctx.moveTo(-s * 0.3, -s);
      ctx.bezierCurveTo(s * 0.8, -s * 0.5, s * 0.8, s * 0.6, -s * 0.3, s);
      ctx.moveTo(-s * 0.7, -s * 0.7);
      ctx.quadraticCurveTo(s * 0.3, 0, -s * 0.7, s * 0.7); ctx.stroke();
      break;
    case 'runes':
      ctx.moveTo(s, 0); ctx.lineTo(0, -s * 0.6); ctx.lineTo(-s, 0);
      ctx.lineTo(0, s * 0.6); ctx.closePath();
      ctx.moveTo(0, -s * 0.9); ctx.lineTo(0, s * 0.9); ctx.stroke();
      break;
    case 'petals':
      ctx.moveTo(-s, 0);
      ctx.bezierCurveTo(-s * 0.4, -s, s * 0.8, -s * 0.65, s, 0);
      ctx.bezierCurveTo(s * 0.8, s * 0.65, -s * 0.4, s, -s, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s * 0.6, 0); ctx.stroke();
      break;
    case 'spores':
      for (let j = 0; j < 3; j++) {
        const a = j * TAU / 3, r = s * (0.25 + j * 0.07);
        ctx.moveTo(Math.cos(a) * s * 0.5 + r, Math.sin(a) * s * 0.5);
        ctx.arc(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5, r, 0, TAU);
      }
      ctx.stroke(); break;
    case 'blood':
      ctx.moveTo(-s * 1.3, 0);
      ctx.bezierCurveTo(s * 0.3, -s * 0.55, s, -s * 0.6, s, 0);
      ctx.bezierCurveTo(s, s * 0.6, s * 0.3, s * 0.55, -s * 1.3, 0); ctx.fill();
      break;
    case 'souls':
      ctx.moveTo(-s * 1.4, -s * 0.4);
      ctx.bezierCurveTo(-s * 0.2, s * 0.9, s, s * 0.5, s, 0);
      ctx.bezierCurveTo(s, -s * 0.7, -s * 0.2, -s * 0.5, -s * 1.4, -s * 0.4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * 1.7, -s * 0.65);
      ctx.quadraticCurveTo(-s * 0.3, s, s * 0.8, s * 0.6); ctx.stroke();
      break;
    case 'rays':
      ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
      ctx.moveTo(s * 0.2, -s * 0.42); ctx.lineTo(s * 0.2, s * 0.42); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.2, 0, s * 0.15, 0, TAU); ctx.fill();
      break;
    case 'shields':
      ctx.moveTo(-s * 0.5, -s * 0.65); ctx.lineTo(s * 0.4, -s * 0.65);
      ctx.quadraticCurveTo(s * 1.1, 0, s * 0.4, s * 0.65); ctx.lineTo(-s * 0.5, s * 0.65);
      ctx.lineTo(-s * 0.85, 0); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.45, -s * 0.35); ctx.lineTo(s * 0.15, -s * 0.35);
      ctx.lineTo(s * 0.45, 0); ctx.lineTo(s * 0.15, s * 0.35); ctx.stroke();
      break;
    case 'teeth':
      ctx.moveTo(-s * 0.8, -s * 0.45); ctx.lineTo(s * 1.2, 0);
      ctx.lineTo(-s * 0.8, s * 0.45); ctx.lineTo(-s * 0.3, 0); ctx.closePath(); ctx.fill();
      break;
    case 'chimes':
      ctx.ellipse(0, 0, s * 0.28, s * 0.8, 0, 0, TAU);
      ctx.moveTo(s * 0.5, -s * 0.8); ctx.quadraticCurveTo(s, 0, s * 0.5, s * 0.8);
      ctx.moveTo(-s * 0.5, -s * 0.6); ctx.quadraticCurveTo(-s * 0.9, 0, -s * 0.5, s * 0.6); ctx.stroke();
      break;
    case 'sparks':
      ctx.moveTo(-s, -s * 0.1); ctx.lineTo(-s * 0.25, -s * 0.5);
      ctx.lineTo(-s * 0.4, s * 0.15); ctx.lineTo(s * 0.35, -s * 0.18);
      ctx.lineTo(s * 0.15, s * 0.45); ctx.lineTo(s, 0); ctx.stroke();
      break;
    case 'steam':
      for (let j = -1; j <= 1; j++) {
        ctx.moveTo(-s, j * s * 0.45);
        ctx.bezierCurveTo(-s * 0.3, (j - 0.7) * s * 0.45,
          s * 0.3, (j + 0.7) * s * 0.45, s, j * s * 0.45);
      }
      ctx.stroke(); break;
  }
}

/** Real hit shape and circular safe center are intersected separately: using
 * one even-odd path would paint OUTSIDE a crescent when its hole crosses it. */
function clipFootprint(ctx: CanvasRenderingContext2D, f: EffectVoiceFlash): void {
  ctx.beginPath(); traceFlashFigure(ctx, f); ctx.clip();
  if (f.edgeFrac && f.edgeFrac > 0) {
    const r = f.radius * Math.min(1, f.edgeFrac);
    ctx.beginPath(); ctx.rect(f.pos.x - f.radius * 2, f.pos.y - f.radius * 2, f.radius * 4, f.radius * 4);
    ctx.moveTo(f.pos.x + r, f.pos.y); ctx.arc(f.pos.x, f.pos.y, r, 0, TAU); ctx.clip('evenodd');
  }
}

export function drawSkillBurst(ctx: CanvasRenderingContext2D, f: EffectVoiceFlash, t: number,
  profile: SkillBurstProfile): void {
  if (!Number.isFinite(f.pos.x + f.pos.y + f.radius + t) || f.radius <= 0 || t <= 0) return;
  t = Math.min(1, t);
  const k = 1 - t, ease = 1 - t * t;
  const R = profile.focus === 'source' ? Math.min(f.radius, C.sourceRadius) : f.radius;
  const inner = Math.max(0, Math.min(1, f.edgeFrac ?? 0));
  const seed = ((f.pos.x * 13 + f.pos.y * 7) | 0) >>> 0;
  const width = Math.max(C.minWidth, Math.min(C.maxWidth, R * 0.02));
  ctx.save();
  clipFootprint(ctx, f);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = width;
  if (!profile.focus) {
    // Full extent is visible at birth: animated detail never pretends that
    // instantaneous damage is a travelling wave. Alpha is shared by all arts.
    ctx.beginPath(); traceFlashFigure(ctx, f);
    ctx.fillStyle = withAlpha(f.color, C.washAlpha * t); ctx.fill();
    ctx.strokeStyle = withAlpha(shade(f.color, 0.3), C.boundaryAlpha * t); ctx.stroke();
    if (inner > 0) {
      ctx.beginPath(); ctx.arc(f.pos.x, f.pos.y, R * inner, 0, TAU); ctx.stroke();
    }
  }
  ctx.translate(f.pos.x, f.pos.y);
  const rings = Math.min(3, Math.max(0, profile.rings ?? 0));
  ctx.strokeStyle = withAlpha(f.color, t * 0.35);
  for (let i = 0; i < rings; i++) {
    const reach = inner + (1 - inner) * (0.25 + ease * 0.65) * (1 - i * 0.18);
    ctx.beginPath(); ctx.arc(0, 0, R * reach, 0, TAU); ctx.stroke();
  }
  const layer = (motif: BurstMotif, secondary: boolean): void => {
    const count = Math.max(1, Math.min(C.maxMarks, profile.count));
    const organic = ['flame', 'cracks', 'spores', 'blood', 'steam', 'souls'].includes(motif);
    const travel = profile.motion === 'in' ? 1 - ease : profile.motion === 'orbit' ? 0.7 : ease;
    const distance = inner + (1 - inner) * (0.22 + travel * 0.58);
    ctx.strokeStyle = withAlpha(shade(f.color, secondary ? 0.18 : 0.62), t * C.inkAlpha * (secondary ? 0.65 : 1));
    ctx.fillStyle = withAlpha(shade(f.color, secondary ? -0.05 : 0.18), t * C.inkAlpha * (secondary ? 0.45 : 0.65));
    for (let i = 0; i < count; i++) {
      const jitter = organic ? (hash01(i, 3, seed) - 0.5) * 0.45 : 0;
      const a = (f.facing ?? 0) + (i + (secondary ? 0.5 : 0)) * TAU / count + jitter
        + (profile.motion === 'orbit' ? ease * 1.2 * (secondary ? -1 : 1) : 0);
      const d = R * Math.min(C.detailReach, distance * (secondary ? 0.72 : 1)
        * (organic ? 0.85 + hash01(i, 4, seed) * 0.2 : 1));
      const size = Math.min(32, R * (secondary ? 0.105 : 0.17)) * (organic ? 0.8 + hash01(i, 5, seed) * 0.4 : 1);
      // Motion belongs to the material: steel leaves a sweep, electricity
      // crawls along its ring, and ice/earth fracture back toward the impact.
      // The head and its wake use the same clock, with no extra particles.
      if (!secondary) {
        ctx.save(); ctx.strokeStyle = withAlpha(f.color, t * 0.48); ctx.lineWidth = width * 1.5;
        ctx.beginPath();
        if (profile.motion === 'orbit') {
          if (motif === 'sparks') {
            const span = TAU / count;
            for (let j = 0; j <= 6; j++) {
              const b = a - span + span * j / 6;
              const rr = d + (j % 2 ? 1 : -1) * Math.min(7, R * 0.05);
              if (!j) ctx.moveTo(Math.cos(b) * rr, Math.sin(b) * rr);
              else ctx.lineTo(Math.cos(b) * rr, Math.sin(b) * rr);
            }
          } else ctx.arc(0, 0, Math.max(0.1, d), a - 0.8, a);
        } else {
          const tail = profile.motion === 'in' ? Math.min(R * 0.93, d + size * 2) : Math.max(R * inner, d - size * 2.4);
          ctx.moveTo(Math.cos(a) * tail, Math.sin(a) * tail);
          ctx.quadraticCurveTo(Math.cos(a + jitter) * (tail + d) / 2,
            Math.sin(a + jitter) * (tail + d) / 2, Math.cos(a) * d, Math.sin(a) * d);
        }
        ctx.stroke(); ctx.restore();
      }
      ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d);
      ctx.rotate(a + (profile.motion === 'in' ? Math.PI : 0));
      mark(ctx, motif, size, k); ctx.restore();
    }
  };
  layer(profile.motif, false);
  if (profile.echo) layer(profile.echo, true);
  ctx.restore();
}

for (const [id, profile] of Object.entries(SKILL_BURSTS)) {
  registerEffectVoice(skillBurstVoice(id)!, (ctx, f, t) => drawSkillBurst(ctx, f, t, profile));
}
