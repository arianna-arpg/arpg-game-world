import { PROJ_FORM_GEO } from '../../engine/projForms';
import { drawSkillFlightHead, flightProfile, type SkillFlightVisual } from './skillFlightVoice';
import { shade } from './color';
import { drawCosmeticProjectile } from './cosmeticEffects';
import { VIS_CFG } from './visConfig';

/** Local-space silhouette shared by a moving shot and its last visible pose.
 * The caller positions and saves the canvas. Native forms use collision geometry. */
export function drawProjectileHead(ctx: CanvasRenderingContext2D, p: SkillFlightVisual): void {
  const r = p.radius;
  if (drawCosmeticProjectile(ctx, p.cosmeticProjectile, p.color, r, p.dir, p.age)
    || drawSkillFlightHead(ctx, p)) return;
  const alpha = ctx.globalAlpha;
  const front = flightProfile(p)?.front;
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
        if (front === 'gale') {
          ctx.save(); ctx.lineWidth *= .45; ctx.strokeStyle = shade(p.color,.68);
          ctx.setLineDash([r*.68,r*.40]); ctx.lineDashOffset = -p.age*r;
          ctx.stroke(); ctx.restore();
        }
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
      if (front === 'capacitor') {
        ctx.fillStyle = shade(p.color,-.65);
        ctx.fillRect(-r*g.hAlong,-r*g.hAcross,r*g.hAlong*1.7,r*g.hAcross*2);
        ctx.strokeStyle = shade(p.color,.74); ctx.lineWidth = r*.08; ctx.beginPath();
        for (let i = 0; i <= 14; i++) {
          const y = (i/7-1)*r*g.hAcross, x = Math.sin(i*2.4+p.age*14)*r*g.hAlong*.7;
          if (i) ctx.lineTo(x,y); else ctx.moveTo(x,y);
        }
        ctx.stroke(); ctx.fillStyle = p.color;
      }
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
      if (front === 'rime') {
        ctx.save(); ctx.strokeStyle = shade(p.color,-.45); ctx.lineWidth = r*.3; ctx.stroke();
        // Angular plates stay inside the band, even at its open ends.
        for (let i = 0; i < 9; i++) {
          const a = ((i+.5)/9*2-1)*g.halfWin;
          ctx.save(); ctx.translate(-r*g.back+Math.cos(a)*r*g.ring,Math.sin(a)*r*g.ring); ctx.rotate(a);
          ctx.fillStyle = i%2 ? p.color : shade(p.color,.65);
          ctx.beginPath(); ctx.moveTo(r*.21,0); ctx.lineTo(-r*.1,-r*.15); ctx.lineTo(-r*.16,r*.1);
          ctx.closePath(); ctx.fill(); ctx.restore();
        }
        ctx.restore();
      }
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
      // Match the 16-segment polyline in projFormTouches, including both tips.
      for (let i = 0; i <= 16; i++) {
        const u = i/8-1, wy = Math.sin(u * Math.PI * 2 + p.age * g.phaseRate) * r * g.amp;
        if (!i) ctx.moveTo(-span, wy); else ctx.lineTo(u*span, wy);
      }
      ctx.stroke();
      if (front === 'flameRibbon' || front === 'cinderWall') {
        ctx.save();
        ctx.lineWidth = r*g.stroke*.80; ctx.strokeStyle = shade(p.color,-.59); ctx.stroke();
        if (front === 'cinderWall') {
          for (let i = 0; i < 12; i++) {
            const u = (i+.5)/6-1, a = u * Math.PI * 2 + p.age * g.phaseRate;
            const y = Math.sin(a)*r*g.amp;
            ctx.save(); ctx.translate(u*span,y);
            ctx.rotate(Math.atan(Math.cos(a)*g.amp*2*Math.PI/g.span));
            ctx.fillStyle = i%3 ? p.color : shade(p.color,.56);
            ctx.beginPath(); ctx.moveTo(-r*.14,r*.12); ctx.lineTo(r*.13,r*.17);
            ctx.lineTo(r*.17,-r*.15); ctx.lineTo(-r*.04,-r*.06); ctx.lineTo(-r*.13,-r*.20);
            ctx.closePath(); ctx.fill(); ctx.restore();
          }
        } else {
          ctx.lineWidth = r*g.stroke*.40; ctx.strokeStyle = p.color; ctx.stroke();
          ctx.setLineDash([r*.68,r*.38]); ctx.lineDashOffset = -p.age*r*2;
          ctx.lineWidth = r*g.stroke*.17; ctx.strokeStyle = shade(p.color,.78); ctx.stroke();
        }
        ctx.restore();
      }
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
