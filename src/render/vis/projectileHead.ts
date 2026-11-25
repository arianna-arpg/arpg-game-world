import { PROJ_FORM_GEO } from '../../engine/projForms';
import { drawSkillFlightHead, type SkillFlightVisual } from './skillFlightVoice';
import { drawCosmeticProjectile } from './cosmeticEffects';
import { VIS_CFG } from './visConfig';

/** Local-space silhouette shared by a moving shot and its last visible pose.
 * The caller positions and saves the canvas. Native forms use collision geometry. */
export function drawProjectileHead(ctx: CanvasRenderingContext2D, p: SkillFlightVisual): void {
  const r = p.radius;
  if (drawCosmeticProjectile(ctx, p.cosmeticProjectile, p.color, r, p.dir, p.age)
    || drawSkillFlightHead(ctx, p)) return;
  const alpha = ctx.globalAlpha;
  ctx.fillStyle = p.color;
  switch (p.shape) {
    case 'vortex': {
      const g = PROJ_FORM_GEO.vortex;
      ctx.globalAlpha *= 0.3;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha /= 0.3;
      ctx.strokeStyle = p.color; ctx.lineWidth = r * g.stroke;
      ctx.rotate(p.age * g.spinRate);
      for (let arm = 0; arm < g.arms; arm++) {
        ctx.beginPath();
        for (let i = 0; i <= g.samples; i++) {
          const t = i / g.samples, a = arm * Math.PI * 2 / g.arms + t * g.turns * Math.PI * 2;
          const rr = r * (1 - g.stroke / 2) * t;
          if (!i) ctx.moveTo(0, 0); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.stroke();
      }
      break;
    }
    case 'square': {
      const g = PROJ_FORM_GEO.square;
      ctx.rotate(p.dir + p.age * g.tumbleRate); // tumbling hammer feel
      ctx.fillRect(-r * g.half, -r * g.half, r * g.half * 2, r * g.half * 2);
      break;
    }
    case 'line': {
      const g = PROJ_FORM_GEO.line;
      ctx.rotate(p.dir);
      ctx.fillRect(-r * g.hAlong, -r * g.hAcross, r * g.hAlong * 2, r * g.hAcross * 2);
      break;
    }
    case 'triangle':
      ctx.rotate(p.dir + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * PROJ_FORM_GEO.triangle.base, r);
      ctx.lineTo(-r * PROJ_FORM_GEO.triangle.base, r);
      ctx.closePath();
      ctx.fill();
      break;
    case 'octagon': {
      ctx.rotate(p.age * PROJ_FORM_GEO.octagon.spinRate);
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'bar': {
      // A wide front perpendicular to travel — the beam wall.
      const g = PROJ_FORM_GEO.bar;
      ctx.rotate(p.dir);
      ctx.fillRect(-r * g.hAlong, -r * g.hAcross, r * g.hAlong * 2, r * g.hAcross * 2);
      ctx.globalAlpha = alpha * g.ghost.alpha;
      ctx.fillRect(-r * g.ghost.back, -r * g.ghost.hAcross, r * g.ghost.hAlong * 2, r * g.ghost.hAcross * 2);
      ctx.globalAlpha = alpha;
      break;
    }
    case 'arc': {
      // A crescent opening backward (the pulse).
      const g = PROJ_FORM_GEO.arc;
      ctx.rotate(p.dir);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = r * g.stroke;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-r * g.back, 0, r * g.ring, -g.halfWin, g.halfWin);
      ctx.stroke();
      ctx.globalAlpha = alpha * g.ghost.alpha;
      ctx.lineWidth = r * g.ghost.stroke;
      ctx.beginPath();
      ctx.arc(-r * g.ghost.back, 0, r * g.ghost.ring, -g.ghost.halfWin, g.ghost.halfWin);
      ctx.stroke();
      ctx.globalAlpha = alpha;
      break;
    }
    case 'wave': {
      // A rolling sine front (the siege wave) — the exact curve the hit
      // test samples: touch the flame, take the flame.
      const g = PROJ_FORM_GEO.wave;
      ctx.rotate(p.dir + Math.PI / 2);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = r * g.stroke;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const span = r * g.span;
      for (let wx = -span; wx <= span; wx += 4) {
        const wy = Math.sin((wx / span) * Math.PI * 2 + p.age * g.phaseRate) * r * g.amp;
        if (wx === -span) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
      }
      ctx.stroke();
      break;
    }
    default:
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      // White-hot core — the orb reads as a charge, not a dot.
      ctx.globalAlpha = alpha * VIS_CFG.fx.coreAlpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-r * 0.12, -r * 0.12, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
  }
}
