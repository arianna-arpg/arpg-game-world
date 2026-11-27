import { LIGHTNING_STYLE as C, lightningProfile, ORB_DISCHARGES, type OrbDischarge } from '../../data/lightningVisuals';
import type { LightningTrace } from '../../engine/lightningVisual';
import { shade, hash01 } from './color';
import { PROJ_FORM_GEO } from '../../engine/projForms';

/** A sharp core with uneven, short branches, clocked on simulation age.
 * Branches stay in the travelled corridor; they never select another victim. */
export function drawLightningTrace(ctx: CanvasRenderingContext2D, trace: LightningTrace, color: string, life: number): void {
  if (trace.discharge && Object.hasOwn(ORB_DISCHARGES, trace.discharge)) {
    drawOrbDischarge(ctx, trace, trace.discharge, color, life);
    return;
  }
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

function drawOrbDischarge(ctx: CanvasRenderingContext2D, trace: LightningTrace, kind: OrbDischarge, color: string, life: number) {
  const [from, to] = trace.points;
  if (!from || !to || life <= 0) return;
  const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy);
  if (!Number.isFinite(length + trace.clock)) return;
  const { path, steps, width } = ORB_DISCHARGES[kind];
  const amplitude = Math.min(width, length * .09);
  const phase = trace.clock * 8 + (1 - life) * 4;
  ctx.save(); ctx.translate(from.x, from.y); ctx.rotate(Math.atan2(dy,dx));
  ctx.globalAlpha *= life; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let strand = 0; strand < (path === 'braid' ? 2 : 1); strand++) {
    ctx.beginPath(); ctx.moveTo(0,0);
    for (let i = 1; i < steps; i++) {
      const u = i / steps;
      const bend = path === 'braid' ? Math.sin(u*10+phase) * (strand ? -1 : 1)
        : (i%2 ? 1 : -1) * (.6 + .4 * Math.sin(phase+i));
      ctx.lineTo(u*length, bend * amplitude * Math.sin(Math.PI*u));
    }
    ctx.lineTo(length,0);
    ctx.strokeStyle = shade(color,-.45); ctx.lineWidth = path === 'braid' ? 2.4 : 3.5; ctx.stroke();
    ctx.strokeStyle = strand ? color : shade(color,.74); ctx.lineWidth = 1.25; ctx.stroke();
  }
  if (path === 'beads' || path === 'facets') for (let i=0; i<3; i++) {
    const x = length * ((i + 1 - life) / 3);
    ctx.fillStyle = i%2 ? color : shade(color,.7); ctx.beginPath();
    if (path === 'beads') ctx.ellipse(x,0,2.9,1.55,0,0,Math.PI*2);
    else { ctx.moveTo(x-2,0); ctx.lineTo(x, -2.8); ctx.lineTo(x+2.6,0); ctx.lineTo(x,1.5); ctx.closePath(); }
    ctx.fill();
  }
  ctx.fillStyle = shade(color,.82); ctx.beginPath(); ctx.arc(length,0,.8+life*1.6,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

export function drawLightningHead(ctx: CanvasRenderingContext2D, p: { skillVisualId?: string; inst?: { def: { id: string } }; shape: string; radius: number; color: string; dir: number; age: number }): boolean {
  const profile = lightningProfile(p.skillVisualId ?? p.inst?.def.id ?? '');
  if (!profile || !['circle', 'line'].includes(p.shape)) return false;
  const r = p.radius;
  if (!(r > 0) || !Number.isFinite(r + p.age + p.dir)) return false;
  const long = p.shape === 'line' ? PROJ_FORM_GEO.line.hAlong * r : r;
  const across = p.shape === 'line' ? PROJ_FORM_GEO.line.hAcross * r : r;
  ctx.save(); ctx.rotate(p.dir); ctx.beginPath();
  if (p.shape === 'circle') ctx.arc(0, 0, r, 0, Math.PI * 2); else ctx.rect(-long, -across, long * 2, across * 2);
  ctx.clip(); ctx.lineJoin = 'round'; ctx.beginPath();
  if (profile.head === 'fork') {
    for (const side of [-1,1]) {
      ctx.moveTo(-long*.8,side*across*.46); ctx.lineTo(-long*.22,side*across*.73);
      ctx.lineTo(long*.12,side*across*.18); ctx.lineTo(long*.93,side*across*.06);
    }
  } else {
    ctx.moveTo(-long,0); ctx.lineTo(-long*.35,-across*.65);
    ctx.lineTo(0,across*.4); ctx.lineTo(long,0);
  }
  ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1,r*.38); ctx.stroke();
  ctx.strokeStyle = shade(p.color,.9); ctx.lineWidth = Math.max(.65,r*.13); ctx.stroke();
  if (profile.bone) {
    ctx.fillStyle = shade(p.color,.6);
    for (const side of [-1,1]) {
      ctx.beginPath(); ctx.moveTo(long*.35,0); ctx.lineTo(-long*.38,side*across*.92);
      ctx.lineTo(-long*.18,side*across*.28); ctx.lineTo(-long*.68,0); ctx.closePath(); ctx.fill();
    }
    if (profile.head === 'fork') {
      ctx.fillStyle = shade(p.color,-.45);
      ctx.beginPath(); ctx.ellipse(-long*.16,0,long*.38,across*.47,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = shade(p.color,.73); ctx.lineWidth = Math.max(.7,r*.18); ctx.stroke();
    }
  }
  ctx.restore(); return true;
}
