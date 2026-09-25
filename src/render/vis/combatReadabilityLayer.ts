import type { Actor } from '../../engine/actor';
import { volatileCueStyle, wardCueStyle, wardCueActive, wardGuardians, type ReactiveCue } from '../../engine/combatReadability';
import { REACTIVE_CUE_CFG as C } from '../../data/combatReadability';
import { sameStory } from '../../engine/tiers';
import { STATUS_DEFS } from '../../engine/status';
import { withAlpha, shade } from './color';

const TAU = Math.PI * 2;
/** An open spark refills, never an enclosing shield or invulnerability ring. */
export function drawGaspSpark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ready: number): void {
  ctx.save(); ctx.translate(x, y); ctx.lineWidth = C.gasp.width;
  for (let i = 0; i < 4; i++) {
    ctx.save(); ctx.rotate(i * TAU / 4);
    ctx.strokeStyle = withAlpha(C.gasp.color, C.gasp.dim);
    ctx.beginPath(); ctx.moveTo(size * 0.35, 0); ctx.lineTo(size, 0); ctx.stroke();
    ctx.strokeStyle = C.gasp.color;
    ctx.beginPath(); ctx.moveTo(size * 0.35, 0); ctx.lineTo(size * (0.35 + ready * 0.65), 0); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
/** Actor origin, before breathing/scaling. The readiness is the real ICD. */
export function drawReactiveCue(ctx: CanvasRenderingContext2D, radius: number, cue: ReactiveCue | undefined, time: number): void {
  if (!cue) return;
  ctx.save();
  if (cue.cap) {
    ctx.strokeStyle = withAlpha(C.cap.color, C.cap.alpha); ctx.lineWidth = C.cap.width;
    for (const side of [-1, 1]) {
      const x = side * (radius + C.cap.pad);
      ctx.beginPath(); ctx.moveTo(x, -radius * 0.55); ctx.lineTo(x, radius * 0.55);
      ctx.moveTo(x, -radius * 0.55); ctx.lineTo(x - side * 4, -radius * 0.55);
      ctx.moveTo(x, radius * 0.55); ctx.lineTo(x - side * 4, radius * 0.55); ctx.stroke();
    }
  }
  if (cue.gasp !== undefined) drawGaspSpark(ctx, 0, radius + C.gasp.pad, C.gasp.size, cue.gasp);
  if (cue.volatile) {
    const v = cue.volatile, cfg = volatileCueStyle(v.profile), r = radius + cfg.pad;
    const swell = (0.5 + 0.5 * Math.sin(time * TAU / cfg.period)) * v.ready;
    ctx.lineWidth = cfg.width;
    for (let i = 0; i < cfg.pieces; i++) {
      ctx.save(); ctx.rotate(i * TAU / cfg.pieces);
      ctx.fillStyle = withAlpha(shade(v.color, 0.25), cfg.alpha * (0.3 + 0.7 * v.ready));
      ctx.beginPath(); ctx.moveTo(r, -4); ctx.quadraticCurveTo(r + cfg.reach * (0.25 + v.ready * 0.5 + swell * 0.25), 0, r, 4);
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#20191c'; ctx.lineWidth = cfg.width + 2; ctx.stroke();
      ctx.strokeStyle = withAlpha(shade(v.color, 0.4), cfg.alpha * (0.3 + 0.7 * v.ready)); ctx.lineWidth = cfg.width;
      ctx.stroke(); ctx.restore();
    }
  }
  ctx.restore();
}
export function drawWardBody(ctx: CanvasRenderingContext2D, radius: number, profile?: string): void {
  const cfg = wardCueStyle(profile), r = radius + cfg.pad;
  ctx.save(); ctx.lineWidth = cfg.width; ctx.strokeStyle = cfg.color;
  for (let i = 0; i < cfg.pieces; i++) {
    ctx.save(); ctx.rotate(i * TAU / cfg.pieces);
    ctx.beginPath(); ctx.moveTo(r * 0.90, -r * 0.31); ctx.lineTo(r, -r * 0.24);
    ctx.lineTo(r, r * 0.24); ctx.lineTo(r * 0.90, r * 0.31); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
/** Links point from actual living gate sources into their protected body. */
export function drawWardLinks(ctx: CanvasRenderingContext2D, actors: readonly Actor[], player: Actor, time: number): void {
  for (const a of actors) {
    if (!wardCueActive(a) || !sameStory(a, player) || hidden(a)) continue;
    const cfg = wardCueStyle(a.wardCueProfile);
    for (const source of wardGuardians(a, actors)) {
      if (source === a || !sameStory(source, player) || hidden(source)) continue;
      ctx.save(); ctx.lineWidth = cfg.width;
      ctx.strokeStyle = withAlpha(cfg.color, cfg.linkAlpha);
      ctx.beginPath(); ctx.moveTo(source.pos.x, source.pos.y); ctx.lineTo(a.pos.x, a.pos.y); ctx.stroke();
      const k = (time / cfg.beadPeriod) % 1;
      const x = source.pos.x + (a.pos.x - source.pos.x) * k, y = source.pos.y + (a.pos.y - source.pos.y) * k;
      ctx.fillStyle = cfg.color; ctx.beginPath(); ctx.arc(x, y, cfg.width * 1.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(source.pos.x, source.pos.y, source.radius + cfg.pad * 0.5, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  }
}
function hidden(a: Actor): boolean { return !!a.burrow || a.statuses.some(s => STATUS_DEFS[s.id]?.conceals); }
export function drawWardBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, profile?: string): void {
  const cfg = wardCueStyle(profile); ctx.save(); ctx.strokeStyle = cfg.color; ctx.lineWidth = cfg.width;
  const n = cfg.pieces, cell = width / n;
  for (let i = 0; i < n; i++) {
    const left = x + i * cell + 2, right = x + (i + 1) * cell - 2;
    ctx.beginPath(); ctx.moveTo(left, y + height); ctx.lineTo(left, y - 2);
    ctx.lineTo((left + right) / 2, y - 5); ctx.lineTo(right, y - 2); ctx.lineTo(right, y + height); ctx.stroke();
  }
  ctx.restore();
}
