import type { AmbientFxSpec } from '../../world/ambientFx';
import { ambientField, AMBIENT_FIELDS, type AmbientParticle, type AmbientWorldView } from './ambientField';
import { hash01, withAlpha } from './color';

type DesertFx = Extract<AmbientFxSpec, { kind: 'sandDrift' | 'tumbleweeds' | 'heatHaze' }>;

/** Paint in world coordinates under one camera transform. The caller supplies
 *  the actual terrain camera (including zoom/shake), never the player position. */
export function drawDesertFx(ctx: CanvasRenderingContext2D, spec: DesertFx,
  view: AmbientWorldView, time: number): void {
  const k = spec.intensity ?? 1;
  if (!(k > 0) || !(view.zoom > 0)) return;
  const color = spec.color ?? (spec.kind === 'heatHaze' ? '#ffe8c0' : spec.kind === 'tumbleweeds' ? '#b89962' : '#d8c090');
  ctx.save();
  ctx.scale(view.zoom, view.zoom);
  ctx.translate(-view.x, -view.y);
  if (view.bounds) {
    ctx.beginPath(); ctx.rect(0, 0, view.bounds.w, view.bounds.h); ctx.clip();
  }
  ctx.strokeStyle = color;
  if (spec.kind === 'sandDrift') {
    for (const p of ambientField(view, time, AMBIENT_FIELDS.sand, spec.field)) {
      const lane = hash01(p.seed, 3), len = p.radius * (0.4 + lane * 0.6);
      const y = p.y + Math.sin(time * 0.7 + p.seed) * 4;
      ctx.globalAlpha = (0.05 + 0.07 * lane) * k * p.fade;
      ctx.lineWidth = 1 + lane * 0.8;
      ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x - len, y + len / 3); ctx.stroke();
    }
    if (spec.dustDevils !== false) for (const p of ambientField(view, time, AMBIENT_FIELDS.devil, spec.dustDevils)) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.radius / 44, p.radius / 44);
      ctx.globalAlpha = 0.16 * k * p.fade; ctx.lineWidth = 1.4;
      for (let s = 0; s < 5; s++) {
        const spin = time * 5 + s * 1.3 + hash01(p.seed, 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.sin(spin) * 3, -s * 7, 6 + s * 7, 3 + s * 3, 0, spin, spin + Math.PI * 1.3);
        ctx.stroke();
      }
      ctx.restore();
    }
  } else if (spec.kind === 'tumbleweeds') {
    for (const p of ambientField(view, time, AMBIENT_FIELDS.tumbleweed, spec.field)) {
      if (view.groundAt && !view.groundAt(p.x, p.y)) continue;
      tumbleweed(ctx, p, time, k, color);
    }
  } else {
    const patches: (AmbientParticle & { intensity?: number })[] = spec.patches?.map((p, i) =>
      ({ ...p, id: `patch:${i}`, seed: i, phase: 0, fade: 1 }))
      ?? ambientField(view, time, AMBIENT_FIELDS.heat, spec.field);
    for (const p of patches) {
      if (![p.x, p.y, p.radius].every(Number.isFinite) || p.radius <= 0) continue;
      if (p.x + p.radius < view.x || p.y + p.radius < view.y
        || p.x - p.radius > view.x + view.w / view.zoom || p.y - p.radius > view.y + view.h / view.zoom) continue;
      if (view.groundAt && !view.groundAt(p.x, p.y)) continue;
      heatPatch(ctx, p, time, k * (p.intensity ?? 1), color);
    }
  }
  ctx.restore();
}

function tumbleweed(ctx: CanvasRenderingContext2D, p: AmbientParticle, time: number, k: number, color: string): void {
  // Leave room inside the sampled footprint for the bounce and stem tips.
  const radius = p.radius * 0.75;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.globalAlpha = 0.12 * k * p.fade; ctx.fillStyle = '#2c2114';
  ctx.beginPath(); ctx.ellipse(0, radius * 0.25, radius, radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(0, -Math.abs(Math.sin(time * 3 + p.seed)) * radius * 0.3);
  ctx.rotate(time * 2.6 + hash01(p.seed, 19) * Math.PI * 2);
  ctx.globalAlpha = 0.5 * k * p.fade; ctx.strokeStyle = color; ctx.lineWidth = 1;
  // Tangled, uneven stems; every ball keeps its own silhouette while it rolls.
  for (let j = 0; j < 7; j++) {
    const a = j * Math.PI * 2 / 7, r = radius * (0.65 + hash01(p.seed, j) * 0.3);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.quadraticCurveTo(-r * 0.6, r * 0.3, Math.cos(a + 2.4) * r, Math.sin(a + 2.4) * r);
    ctx.stroke();
  }
  ctx.restore();
}

function heatPatch(ctx: CanvasRenderingContext2D, p: AmbientParticle, time: number, k: number, color: string): void {
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.clip();
  ctx.strokeStyle = withAlpha(color, 0.14 * k); ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const phase = ((time * 0.14 + hash01(p.seed, i, 31)) % 1 + 1) % 1;
    const y = (1 - phase * 2) * p.radius;
    const reach = Math.sqrt(Math.max(0, p.radius * p.radius - y * y)) * 0.9;
    ctx.globalAlpha = p.fade * Math.sin(phase * Math.PI);
    ctx.beginPath();
    for (let s = 0; s <= 16; s++) {
      const x = (s / 8 - 1) * reach;
      const yy = y + Math.sin(x * 0.04 + time * 2 + i) * Math.min(5, p.radius * 0.06);
      if (!s) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}
