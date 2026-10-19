import { SKILL_MOVEMENTS, MOVEMENT_VISUAL_STYLE as C, CHARGE_WAKE_STYLE as W, movementProfile, skillMovementVoice,
  type MovementProfile, type MovementPhase } from '../../data/skillMovementVisuals';
import type { MovementTrail } from '../../engine/skillMovementVisual';
import { registerEffectVoice, type EffectVoiceFlash } from './effectVoice';
import { traceFlashFigure } from './aoeTrace';
import { drawSkillMark } from './skillBurstVoice';
import { shade, withAlpha, hash01 } from './color';
const TAU = Math.PI * 2;

/** Each form is drawn in a forward local frame. Endpoints reuse its silhouette
 * at a different scale and phase, tying take-off and landing to the same action. */
function gesture(ctx: CanvasRenderingContext2D, p: MovementProfile, r: number, k: number): void {
  const n = Math.min(C.maxMarks, p.count);
  for (let i = 0; i < n; i++) {
    const u = (i + .5) / n, y = (u - .5) * r * 1.3;
    const twist = p.motion === 'coil' ? k * 1.3 : p.motion === 'split' ? (u - .5) * .6 : 0;
    ctx.save(); ctx.rotate(twist); ctx.beginPath();
    switch (p.form) {
      case 'stride':
        ctx.moveTo(-r * (.75 - u * .3), -r * .48); ctx.lineTo(r * (.25 + u * .55), 0);
        ctx.lineTo(-r * (.75 - u * .3), r * .48); break;
      case 'ram':
        ctx.moveTo(-r * .5 + u * r * .5, -r * .65); ctx.lineTo(r * (.2 + u * .65), -r * .36);
        ctx.lineTo(r * (.35 + u * .6), 0); ctx.lineTo(r * (.2 + u * .65), r * .36);
        ctx.lineTo(-r * .5 + u * r * .5, r * .65); break;
      case 'blade':
        ctx.moveTo(-r, y); ctx.quadraticCurveTo(r * .05, y - r * .28, r, y * .35);
        ctx.quadraticCurveTo(-r * .12, y - r * .07, -r, y); ctx.closePath(); ctx.fill(); break;
      case 'ribbon':
        ctx.moveTo(-r, y); ctx.bezierCurveTo(-r * .3, y + Math.sin(k * 6 + i) * r * .5,
          r * .25, y - r * .4, r * .8, y * .2); break;
      case 'bolt':
        ctx.moveTo(-r, y);
        for (let j = 1; j <= 6; j++) ctx.lineTo(-r + j / 3 * r, y * (1 - j / 8)
          + (j % 2 ? 1 : -1) * r * (.12 + hash01(i + 17, j * 43 + Math.floor(k * 12)) * .2)); break;
      case 'plume':
        ctx.moveTo(-r * .8, y); ctx.bezierCurveTo(-r * .5, y - r * .5, r * .85, y - r * .35, r * (.6 + .2 * Math.sin(k * 6 + i)), 0); break;
      case 'wing':
        for (const s of [-1, 1]) {
          ctx.moveTo(r * .5, 0); ctx.quadraticCurveTo(-r * .1, s * r * (.35 + u * .6), -r * (.45 + u * .45), s * r * (.3 + u * .5));
          ctx.lineTo(-r * .15, s * r * (.15 + u * .3));
        } break;
      case 'talon':
        ctx.moveTo(-r * .75, y); ctx.quadraticCurveTo(r * .8, y * 1.15, r * .65, y * .2);
        ctx.lineTo(r * .15, y * .05); break;
      case 'crater':
        ctx.rotate(u * TAU); ctx.moveTo(r * .12, 0); ctx.lineTo(r * .45, -r * .1);
        ctx.lineTo(r * .55, r * .12); ctx.lineTo(r * .92, 0); break;
      case 'fold': {
        const rr = r * (.4 + u * .5), squeeze = .22 + .55 * k;
        ctx.moveTo(0, -rr); ctx.lineTo(rr * squeeze, 0); ctx.lineTo(0, rr); ctx.lineTo(-rr * squeeze, 0); ctx.closePath(); break;
      }
      case 'slit':
        ctx.moveTo(y * .5, -r * .9); ctx.bezierCurveTo(y * .5 - r * .4 * k, -r * .2, y * .5 + r * .4 * k, r * .2, y * .5, r * .9); break;
      case 'shatter':
        ctx.rotate(u * TAU); ctx.moveTo(r * .15, 0); ctx.lineTo(r * (.6 + k * .35), -r * .12);
        ctx.lineTo(r * .48, r * .09); ctx.closePath(); ctx.fill(); break;
      case 'orbit':
        ctx.rotate(u * TAU + k * 2); ctx.arc(0, 0, r * (.48 + u * .35), -.65, .65);
        ctx.lineTo(r * .45, r * .2); break;
    }
    ctx.stroke(); ctx.restore();
  }
}
function layeredGesture(ctx: CanvasRenderingContext2D, p: MovementProfile, r: number, k: number, color: string): void {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = C.outline; ctx.fillStyle = C.outline; ctx.lineWidth = 4; gesture(ctx, p, r, k);
  ctx.strokeStyle = shade(color, .5); ctx.fillStyle = withAlpha(color, .5); ctx.lineWidth = 1.6; gesture(ctx, p, r, k);
}
export function drawMovementMoment(ctx: CanvasRenderingContext2D, f: EffectVoiceFlash, life: number, p: MovementProfile, phase: MovementPhase): void {
  if (!(f.radius > 0 && life > 0) || !Number.isFinite(f.radius + f.pos.x + f.pos.y + life)) return;
  const k = Math.max(0, Math.min(1, 1 - life)), inward = phase === 'depart';
  const spread = phase === 'wait' ? .55 + k * .35 : inward ? 1 - k * .65 : .65 + .3 * Math.sin(k * Math.PI / 2);
  ctx.save(); ctx.beginPath(); traceFlashFigure(ctx, f); ctx.clip();
  if (f.edgeFrac) {
    ctx.beginPath(); ctx.rect(f.pos.x - f.radius * 2, f.pos.y - f.radius * 2, f.radius * 4, f.radius * 4);
    ctx.moveTo(f.pos.x + f.radius * f.edgeFrac, f.pos.y); ctx.arc(f.pos.x, f.pos.y, f.radius * f.edgeFrac, 0, TAU); ctx.clip('evenodd');
  }
  if (phase === 'impact') {
    ctx.beginPath(); traceFlashFigure(ctx, f); ctx.fillStyle = withAlpha(f.color, life * .065); ctx.fill();
    ctx.strokeStyle = withAlpha(f.color, life * .3); ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.translate(f.pos.x, f.pos.y); ctx.rotate(f.facing ?? 0); ctx.globalAlpha *= Math.pow(life, .5);
  if (phase === 'impact') {
    // One legible impact silhouette; material fragments carry the radial release.
    layeredGesture(ctx, p, f.radius * (.55 + .38 * k), k, f.color);
  } else layeredGesture(ctx, p, f.radius * spread * .92, inward ? 1 - k : k, f.color);
  const marks = Math.min(C.maxMarks, p.count), mr = f.radius * spread * .68;
  for (let i = 0; i < marks; i++) {
    const a = i / marks * TAU + (p.motion === 'scatter' ? k * .4 : 0);
    ctx.save(); ctx.translate(Math.cos(a) * mr, Math.sin(a) * mr); ctx.rotate(a + (inward ? Math.PI : 0));
    ctx.strokeStyle = C.outline; ctx.fillStyle = C.outline; ctx.lineWidth = 3;
    const size = Math.min(10, f.radius * .14); drawSkillMark(ctx, p.motif, size * 1.1, k);
    ctx.strokeStyle = shade(f.color, .45); ctx.fillStyle = f.color; ctx.lineWidth = 1.2; drawSkillMark(ctx, p.motif, size, k); ctx.restore();
  }
  ctx.restore();
}

/** A short wake sampled from the body, not a line to its requested destination.
 * Each small gesture is clipped to the travelled segment and body-width lane. */
export function drawMovementTrail(ctx: CanvasRenderingContext2D, f: { radius: number; color: string; movement: MovementTrail }, life: number): void {
  const t = f.movement, p = movementProfile(t.skillId);
  if (!p || p.family === 'blink' || !Number.isFinite(t.clock + t.progress + f.radius) || f.radius <= 0 || life <= 0) return;
  const pts = t.points.slice(-C.maxPoints), width = Math.min(32, f.radius);
  ctx.save();
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    if (!(length > .01) || !Number.isFinite(length + a.x + a.y + b.at)) continue;
    const age = Math.max(0, 1 - (t.clock - b.at) / C.tailSeconds);
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(Math.atan2(dy, dx));
    ctx.beginPath(); ctx.rect(0, -width, length, width * 2); ctx.clip();
    ctx.globalAlpha *= life * (.15 + age * .65);
    if (p.groundWake) {
      // Two low skid lines and outward dust ticks persist across tiny frame
      // segments. No airborne swell, predicted path or additional particles.
      ctx.globalAlpha *= W.alpha;
      ctx.lineCap = 'round'; ctx.strokeStyle = shade(f.color, .2); ctx.lineWidth = W.width;
      ctx.beginPath();
      for (const side of [-1, 1]) {
        ctx.moveTo(0, side * width * W.railOffset);
        ctx.lineTo(length, side * width * W.railOffset);
      }
      ctx.stroke(); ctx.lineWidth = W.dustWidth; ctx.beginPath();
      for (const side of [-1, 1]) {
        ctx.moveTo(length * .2, side * width * W.dustOffset);
        ctx.lineTo(length * .8, side * width * W.railOffset);
      }
      ctx.stroke(); ctx.restore(); continue;
    }
    // Long frames need at most three marks; high-rate histories stay capped.
    const count = Math.min(3, Math.max(1, Math.ceil(length / (width * 2))));
    for (let j = 0; j < count; j++) {
      ctx.save(); ctx.translate((j + .5) / count * length, 0);
      layeredGesture(ctx, p, Math.min(width * .85, Math.max(8, length / count)),
        p.form === 'bolt' ? (t.progress + i * .173) % 1 : t.progress, f.color); ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
}
for (const [id, p] of Object.entries(SKILL_MOVEMENTS)) for (const phase of ['depart', 'arrive', 'impact', 'wait', 'bank'] as const) {
  registerEffectVoice(skillMovementVoice(id, phase)!, (ctx, f, life) => drawMovementMoment(ctx, f, life, p, phase));
}
