import { LIGHTNING_STYLE as C, lightningProfile } from '../../data/lightningVisuals';
import type { LightningTrace } from '../../engine/lightningVisual';
import { shade, hash01 } from './color';
import { PROJ_FORM_GEO } from '../../engine/projForms';

/** A sharp core with uneven, short branches, clocked on simulation age.
 * Branches stay in the travelled corridor; they never select another victim. */
export function drawLightningTrace(ctx: CanvasRenderingContext2D, trace: LightningTrace, color: string, life: number): void {
  const p = lightningProfile(trace.skillId);
  if (!p || trace.points.length < 2 || !Number.isFinite(trace.clock + trace.width)) return;
  const points = trace.points.slice(-C.maxPoints), width = Math.max(.1, Math.min(12, trace.width));
  const phase = Math.floor((trace.clock + (1 - life) * C.fadeSeconds) * 24);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let budget = C.maxSegments;
  for (let i = 1; i < points.length && budget > 0; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    if (!(length > .01) || !Number.isFinite(length + a.x + a.y + b.at)) continue;
    const n = Math.min(budget, Math.max(2, Math.ceil(length / 7))); budget -= n;
    const fade = Math.max(0, 1 - (trace.clock - b.at) / C.tailSeconds);
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(Math.atan2(dy, dx));
    // Rectangular clip prevents a decoration extending ahead of the measured path.
    ctx.beginPath(); ctx.rect(0, -width, length, width * 2); ctx.clip();
    ctx.globalAlpha *= life * (.3 + .7 * fade);
    const seed = (a.x * 17 + a.y * 31) | 0;
    ctx.beginPath(); ctx.moveTo(0, 0);
    for (let j = 1; j <= n; j++) {
      const y = j === n ? 0 : (hash01(seed, j * 17 + phase * 41) * 2 - 1) * width * .5 * p.jag;
      ctx.lineTo(j / n * length, y);
    }
    ctx.strokeStyle = '#142032'; ctx.lineWidth = 7; ctx.stroke();
    ctx.save(); ctx.globalAlpha *= .3; ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
    ctx.strokeStyle = color; ctx.lineWidth = 3.8; ctx.stroke();
    ctx.strokeStyle = shade(color, .94); ctx.lineWidth = 1.6; ctx.stroke();
    if (i % Math.max(1, 5 - p.forks) === 0) {
      const sign = i % 2 ? 1 : -1, x = length * .48;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + length * .2, sign * width * .45);
      ctx.lineTo(x - length * .08, sign * width * .8);
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
      if (p.bone) { ctx.beginPath(); ctx.moveTo(x - 2, -width * .5); ctx.lineTo(x + 2, width * .5); ctx.stroke(); }
    }
    ctx.restore();
  }
  ctx.restore();
}

export function drawLightningHead(ctx: CanvasRenderingContext2D, p: { skillVisualId?: string; inst?: { def: { id: string } }; shape: string; radius: number; color: string; dir: number; age: number }): boolean {
  if (!lightningProfile(p.skillVisualId ?? p.inst?.def.id ?? '') || !['circle', 'line'].includes(p.shape)) return false;
  const r = p.radius;
  if (!(r > 0) || !Number.isFinite(r + p.age + p.dir)) return false;
  const long = p.shape === 'line' ? PROJ_FORM_GEO.line.hAlong * r : r;
  const across = p.shape === 'line' ? PROJ_FORM_GEO.line.hAcross * r : r;
  ctx.save(); ctx.rotate(p.dir); ctx.beginPath();
  if (p.shape === 'circle') ctx.arc(0, 0, r, 0, Math.PI * 2); else ctx.rect(-long, -across, long * 2, across * 2);
  ctx.clip(); ctx.beginPath(); ctx.moveTo(-long, 0);
  ctx.lineTo(-long * .35, -across * .65); ctx.lineTo(0, across * .4); ctx.lineTo(long, 0);
  ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = shade(p.color, .9); ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore(); return true;
}
