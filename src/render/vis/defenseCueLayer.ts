import { DEFENSE_CUE_CFG as C } from '../../data/defenseCues';
import { defenseStyle } from '../../engine/defenseCues';
import { shellArcFactor, type Actor } from '../../engine/actor';
import { STATUS_DEFS } from '../../engine/status';
import { registerEffectVoice } from './effectVoice';
import { drawPartSpecs, type BodyLook } from './body';
import { shade, withAlpha } from './color';

const TAU = Math.PI * 2;

/** A plate's own shape, shared by attached protection and flying fragments.
 * Coordinates face +X; each style has a distinct silhouette even in grey. */
function plate(ctx: CanvasRenderingContext2D, shape: string, r: number, width: number, thick: number): void {
  ctx.beginPath();
  if (shape === 'spiral') {
    ctx.arc(0, 0, r, -width / 2, width / 2);
    ctx.arc(0, 0, r * (1 - thick), width / 2, -width / 2, true);
  } else if (shape === 'brace' || shape === 'guard') {
    ctx.moveTo(r, -r * width * 0.38); ctx.lineTo(r * (1 + thick), 0);
    ctx.lineTo(r, r * width * 0.38); ctx.lineTo(r * (1 - thick), 0);
  } else {
    const y = Math.sin(width / 2) * r;
    ctx.moveTo(r * (1 - thick), -y * 0.8); ctx.lineTo(r, -y);
    ctx.lineTo(r * (1 + thick * (shape === 'carapace' ? 0.8 : 0.25)), 0);
    ctx.lineTo(r, y); ctx.lineTo(r * (1 - thick), y * 0.8);
  }
  ctx.closePath();
}

registerEffectVoice('defenseCue', (ctx, f, remaining) => {
  const cue = f.defenseCue;
  if (!cue) return;
  const cfg = defenseStyle(cue.style, cue.kind), k = 1 - remaining;
  const impact = cue.event === 'impact', bash = cue.event === 'bash';
  const breaking = cue.event === 'break';
  const spread = breaking ? k : cue.event === 'reform' ? 1 - k : 0;
  const n = impact || bash ? 1 : Math.max(1, Math.round(cfg.pieces * cue.arc / TAU));
  const arc = impact || bash ? Math.min(cue.arc, 0.85) : cue.arc;
  ctx.save(); ctx.translate(f.pos.x, f.pos.y);
  for (let i = 0; i < n; i++) {
    const angle = cue.facing - arc / 2 + (i + 0.5) * arc / n;
    ctx.save(); ctx.rotate(angle);
    const travel = bash ? C.bashTravel * Math.sin(k * Math.PI / 2)
      : impact ? -0.1 * Math.sin(k * Math.PI) : cfg.travel * spread;
    ctx.translate(f.radius * travel, breaking ? f.radius * k * k * 0.3 : 0);
    if (breaking) ctx.rotate((i % 2 ? 1 : -1) * k * 0.45);
    const alpha = breaking ? remaining : Math.sin(Math.PI * Math.min(0.99, k + 0.06));
    ctx.fillStyle = withAlpha(f.color, alpha * 0.65);
    ctx.strokeStyle = withAlpha(shade(f.color, 0.4), alpha);
    ctx.lineWidth = C.fractureWidth;
    plate(ctx, cfg.shape, f.radius, arc / n * 0.8, cfg.thickness);
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
});

/** Body-local persistent shell. Gaps stay open until the mechanical reform
 * threshold; returning fragments show actual refill, never a guessed timer. */
export function drawShellCue(ctx: CanvasRenderingContext2D, a: Actor, time: number, radius = a.radius + C.shellPad): void {
  const sg = a.shellGuard;
  if (!sg || sg.max <= 0) return;
  const cfg = defenseStyle(sg.shellVisual);
  const arc = sg.side === 'all' ? TAU : sg.arcDeg * Math.PI / 180 * shellArcFactor(sg, time);
  const center = a.facing + (sg.side === 'rear' ? Math.PI : 0);
  const fill = Math.max(0, Math.min(1, sg.pool / sg.max));
  const open = sg.broken || sg.pool <= 0;
  const recovery = Math.min(1, fill / Math.max(0.001, sg.reformFraction ?? 0.4));
  const n = Math.max(2, Math.round(cfg.pieces * arc / TAU));
  ctx.save();
  for (let i = 0; i < n; i++) {
    ctx.save(); ctx.rotate(center - arc / 2 + (i + 0.5) * arc / n);
    if (open) ctx.translate(radius * (0.12 + (1 - recovery) * 0.15), 0);
    const width = arc / n * (open ? 1 - C.brokenGap : 0.94);
    ctx.strokeStyle = withAlpha(sg.color, open ? C.brokenAlpha : C.intactAlpha + C.poolAlpha * fill);
    ctx.fillStyle = withAlpha(sg.color, open ? 0.05 + recovery * 0.1 : 0.08 + fill * 0.14);
    ctx.lineWidth = open ? 1.4 : 2;
    plate(ctx, cfg.shape, radius, width, cfg.thickness); ctx.fill(); ctx.stroke();
    if (open) {
      ctx.beginPath(); ctx.moveTo(radius * 0.88, -radius * 0.04);
      ctx.lineTo(radius, radius * 0.05); ctx.lineTo(radius * 1.1, -radius * 0.04); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

/** Broken poise is a split bronze brace close to the body, never an outer
 * shell or an equipped shield. It lasts exactly as long as poiseBroken. */
export function drawPoiseCue(ctx: CanvasRenderingContext2D, a: Actor): void {
  if (!a.poiseBroken) return;
  const r = a.radius + C.poisePad;
  ctx.save(); ctx.strokeStyle = withAlpha(C.poiseColor, 0.8); ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * r * 0.6, -r * 0.7); ctx.lineTo(side * r, -r * 0.28);
    ctx.moveTo(side * r * 1.08, r * 0.12); ctx.lineTo(side * r * 0.7, r * 0.55); ctx.stroke();
  }
  ctx.restore();
}

export function statusBodyLean(a: Actor): number {
  let lean = 0;
  for (const s of a.statuses) lean = Math.max(lean, STATUS_DEFS[s.id]?.bodyCue?.lean ?? 0);
  return Math.max(0, Math.min(1, lean));
}

export function drawStatusBodyCue(ctx: CanvasRenderingContext2D, a: Actor, look: BodyLook, time: number): void {
  for (const s of a.statuses) {
    const parts = STATUS_DEFS[s.id]?.bodyCue?.parts;
    if (parts) drawPartSpecs(ctx, look, parts, time);
  }
}
