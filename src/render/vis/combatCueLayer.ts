import type { Actor } from '../../engine/actor';
import { combatCueStyle, parryCueStrength } from '../../engine/combatCues';
import { COMBAT_CUE_CFG } from '../../data/combatCues';
import { registerEffectVoice } from './effectVoice';
import { withAlpha } from './color';

const TAU = Math.PI * 2;
function line(ctx: CanvasRenderingContext2D, x: number, y: number, xx: number, yy: number) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(xx, yy); ctx.stroke();
}

registerEffectVoice('combatCue', (ctx, f, remaining) => {
  if (!f.combatCue) return;
  const cfg = combatCueStyle(f.combatCue.style), t = 1 - remaining;
  const r = Math.max(1, f.radius), travel = r * cfg.travel;
  ctx.save(); ctx.translate(f.pos.x, f.pos.y); ctx.rotate(f.combatCue.facing);
  ctx.strokeStyle = withAlpha(f.color, Math.min(1, remaining * 2) * COMBAT_CUE_CFG.alpha);
  ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = cfg.width; ctx.lineCap = 'round';
  switch (cfg.shape) {
    case 'fracture':
      // Interrupted preparation tears outward into separated arc fragments.
      for (let i = 0; i < cfg.pieces; i++) {
        const angle = i * TAU / cfg.pieces, d = travel * t;
        ctx.save(); ctx.translate(Math.cos(angle) * d, Math.sin(angle) * d);
        ctx.rotate(angle + t * (i % 2 ? 0.8 : -0.8));
        ctx.beginPath(); ctx.arc(0, 0, r, -0.22, 0.22); ctx.stroke(); ctx.restore();
      }
      break;
    case 'collapse':
      // Lost concentration collapses inward and falls; it never looks like a fired bolt.
      ctx.rotate(-f.combatCue.facing);
      for (let i = 0; i < cfg.pieces; i++) {
        const angle = i * TAU / cfg.pieces, d = r * remaining;
        const x = Math.cos(angle) * d, y = Math.sin(angle) * d + travel * t * t;
        ctx.beginPath(); ctx.arc(x, y, Math.max(0.4, r * 0.13 * remaining), 0, TAU); ctx.fill();
      }
      break;
    case 'cross': {
      const k = r * (0.6 + t * 0.4);
      line(ctx, -k, -k * 0.7, k, k * 0.7);
      line(ctx, -k, k * 0.7, k, -k * 0.7);
      for (let i = 0; i < cfg.pieces; i++) {
        const a = (i + 0.5) * TAU / cfg.pieces;
        const d = r + travel * t;
        line(ctx, Math.cos(a) * d, Math.sin(a) * d,
          Math.cos(a) * (d + r * 0.25), Math.sin(a) * (d + r * 0.25));
      }
      break;
    }
    case 'ghost':
      // Hollow body echoes shear sideways away from the incoming strike;
      // no displaced collision body or fake projectile is created.
      for (let i = 1; i <= cfg.pieces; i++) {
        ctx.globalAlpha = remaining * (1 - i / (cfg.pieces + 1));
        ctx.beginPath(); ctx.ellipse(0, (i % 2 ? 1 : -1) * travel * i * (0.25 + t),
          r * (1 - i * 0.1), r * 0.65, 0, -2.7, 2.7); ctx.stroke();
      }
      break;
    case 'barrier':
      // Closed geometry stays intact while the impact glances off its face.
      ctx.beginPath();
      for (let i = 0; i <= cfg.pieces; i++) {
        const a = i * TAU / cfg.pieces;
        if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.stroke();
      line(ctx, r + travel * t, -r * 0.3, r + travel * t, r * 0.3);
      break;
    case 'scatter':
      // Small refused fragments lose size as they ricochet OUT from contact.
      for (let i = 0; i < cfg.pieces; i++) {
        const a = -1.15 + 2.3 * i / Math.max(1, cfg.pieces - 1);
        const x = r * 0.7 + Math.cos(a) * travel * t, y = Math.sin(a) * travel * t;
        line(ctx, x, y, x + Math.cos(a) * r * 0.32 * remaining,
          y + Math.sin(a) * r * 0.32 * remaining);
      }
      break;
    case 'snap': {
      // Corners converge, lock briefly, then release. Four/eight/three
      // spokes distinguish perfect/flawless/spark without a text grade.
      const lock = Math.max(0, 1 - t * 4), d = r * 0.45 + travel * lock;
      for (let i = 0; i < cfg.pieces; i++) {
        ctx.save(); ctx.rotate(i * TAU / cfg.pieces);
        ctx.beginPath(); ctx.moveTo(d + r * 0.25, -r * 0.18);
        ctx.lineTo(d, 0); ctx.lineTo(d + r * 0.25, r * 0.18); ctx.stroke(); ctx.restore();
      }
      break;
    }
    case 'mend':
      // Inward threads close an open seam; the center rises, never explodes.
      ctx.rotate(-f.combatCue.facing);
      for (let i = 0; i < cfg.pieces; i++) {
        const a = i * TAU / cfg.pieces, d = r * (0.35 + cfg.travel * remaining);
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d - travel * t,
          r * 0.3, a + 1, a + Math.PI + 1); ctx.stroke();
      }
      line(ctx, -r * 0.18, -travel * t, r * 0.18, -travel * t);
      break;
    case 'barbs':
      for (let i = 0; i < cfg.pieces; i++) {
        ctx.save(); ctx.rotate(i * TAU / cfg.pieces);
        const d = r * (0.5 + cfg.travel * remaining);
        ctx.beginPath(); ctx.moveTo(d + r * 0.25, -r * 0.18);
        ctx.lineTo(d, 0); ctx.lineTo(d + r * 0.1, r * 0.28); ctx.stroke(); ctx.restore();
      }
      break;
    case 'ground': {
      // Follow-on impact at the actual blast footprint; all cracks stay inside.
      const front = r * Math.min(1, 0.25 + t * 2);
      ctx.beginPath(); ctx.arc(0, 0, front, 0, TAU); ctx.stroke();
      for (let i = 0; i < cfg.pieces; i++) {
        const a = i * TAU / cfg.pieces;
        ctx.save(); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(r * 0.12, 0); ctx.lineTo(front * 0.5, r * 0.04);
        ctx.lineTo(front * cfg.travel, -r * 0.035); ctx.stroke(); ctx.restore();
      }
      break;
    }
  }
  ctx.restore();
});

/** Two weapon-edge teeth close together during the actual parry opening. */
export function drawParryReady(ctx: CanvasRenderingContext2D, a: Actor): void {
  const strength = parryCueStrength(a);
  if (!strength || a.dead) return;
  // Actor painter has already translated to the body (world-facing space).
  ctx.save(); ctx.rotate(a.facing);
  ctx.strokeStyle = withAlpha(COMBAT_CUE_CFG.readyColor, 0.5 + strength * 0.4);
  ctx.lineWidth = COMBAT_CUE_CFG.readyWidth;
  const x = a.radius + COMBAT_CUE_CFG.readyPad, gap = 3 + strength * 7;
  for (const sign of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x - 5, sign * (gap + 4)); ctx.lineTo(x, sign * gap);
    ctx.lineTo(x + 5, sign * (gap + 4)); ctx.stroke();
  }
  ctx.restore();
}

/** The original projectile keeps its material/body. Paired chevrons follow
 * its real heading for the whole reflected flight, including orb cosmetics. */
export function drawReflectedCue(ctx: CanvasRenderingContext2D,
  p: { pos: {x:number;y:number}; radius:number; dir:number }): void {
  ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(p.dir);
  ctx.strokeStyle = COMBAT_CUE_CFG.reflectedColor; ctx.lineWidth = COMBAT_CUE_CFG.reflectedWidth;
  const r = Math.max(3, p.radius), span = r * COMBAT_CUE_CFG.reflectedScale;
  for (const d of [0.35, 1.3]) {
    ctx.beginPath(); ctx.moveTo(-r * d - r, -span * 0.55);
    ctx.lineTo(-r * d, 0); ctx.lineTo(-r * d - r, span * 0.55); ctx.stroke();
  }
  ctx.restore();
}
