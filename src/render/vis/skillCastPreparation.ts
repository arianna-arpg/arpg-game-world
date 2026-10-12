import type { Actor } from '../../engine/actor';
import { playerCastPreparation, type PlayerCastPreparation } from '../../engine/playerCastVisual';
import { CAST_PREPARATION_STYLE as C } from '../../data/skillCastVisuals';
import { presenceProfile } from '../../data/skillPresenceVisuals';
import { selfProfile } from '../../data/skillSelfVisuals';
import { drawPresenceGlyph } from './skillPresenceVoice';
import { drawSelfGlyph } from './skillSelfVoice';
import { drawSkillMark } from './skillBurstVoice';

const TAU = Math.PI * 2;
/** Body-local, open shapes. None is a range or danger boundary. Progress is
 * monotonic while preparing; a held completion is steady, not a flashing loop. */
export function drawCastPreparation(ctx: CanvasRenderingContext2D, cue: PlayerCastPreparation, color: string): void {
  const { profile: p } = cue, held = cue.fill === 1;
  const q = cue.fill ?? .55, r = C.radius, spread = 1 - q;
  const drift = cue.fill === undefined ? Math.sin(cue.age * 2) * .08 : 0;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha *= C.alpha * (.55 + .45 * q);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = C.width;
  const line = (...v: number[]) => { ctx.moveTo(v[0], v[1]); for (let i = 2; i < v.length; i += 2) ctx.lineTo(v[i], v[i + 1]); };
  const gesture = () => {
    ctx.beginPath();
    if (p.family === 'summon') {
      // Two cradle arcs and rising ribs assemble toward the hands.
      for (const s of [-1, 1]) {
        ctx.moveTo(s * r, 10); ctx.quadraticCurveTo(s * r * .75, 23, s * 5, 17);
        for (let i = 0; i < 3; i++) {
          const y = 7 - i * 8 + spread * (13 + i * 3) + drift * 8;
          line(s * (20 + spread * 8), y + 5, s * (15 + spread * 4), y, s * 9, y);
        }
      }
    } else if (p.family === 'construct') {
      for (const s of [-1, 1]) {
        const x = s * (21 + spread * 9);
        line(x, 15, x, -18, s * 12, -18);
        for (let i = 0; i < 3; i++) line(s * 9, 14 - i * (8 + spread * 5), s * 19, 14 - i * (8 + spread * 5));
      }
    } else if (p.family === 'storm') {
      for (const s of [-1, 0, 1]) {
        const x = s * 19, y = -22 + spread * 14;
        line(x, y + 15, x, y, x - 4, y + 5); line(x, y, x + 4, y + 5);
      }
      ctx.moveTo(-24, -26); ctx.quadraticCurveTo(0, -39 + q * 7, 24, -26);
    } else if (p.family === 'bolt' || p.family === 'beam') {
      for (const s of [-1, 1]) {
        const y = s * (11 + spread * 12);
        if (p.family === 'beam') line(-16, y, 26, y, 20, y - s * 4);
        else if (p.gathering === 'fork') {
          line(-25, y, -12, y * .5, -7, y * .8, 9, y * .2, 26 - spread * 14, 0);
          line(-12, y * .5, -17, y * .95, -24, y * 1.08);
        } else if (p.gathering === 'links') {
          for (let i = 0; i < 3; i++) {
            const x = -20 + i * (12 - q * 2), cy = y * (1 - i / 3), h = 3 + spread * 2;
            line(x - 5, cy, x, cy - h, x + 5, cy, x, cy + h, x - 5, cy);
          }
        } else { ctx.moveTo(-22, y); ctx.quadraticCurveTo(4, y, 26 - spread * 14, 0); }
      }
    } else if (p.family === 'field') {
      for (const s of [-1, 1]) {
        ctx.moveTo(s * 5, 8); ctx.bezierCurveTo(s * 13, -16, s * (18 + q * 12), -14, s * (19 + q * 12), 5);
        line(s * (19 + q * 12), 5, s * (15 + q * 12), 0);
      }
    } else if (p.family === 'target') {
      for (const s of [-1, 1]) {
        const x = s * (17 + spread * 15);
        line(x, -14, x - s * 6, -14, x - s * 10, 0, x - s * 6, 14, x, 14);
      }
    } else if (p.family === 'strike') {
      ctx.arc(0, 0, r, -1.8 - q * .9, -.4 - q * .9);
      ctx.moveTo(Math.cos(-.4 - q * .9) * r, Math.sin(-.4 - q * .9) * r);
      ctx.lineTo(Math.cos(-.6 - q * .9) * (r - 7), Math.sin(-.6 - q * .9) * (r - 7));
    } else if (p.family === 'travel') {
      for (const i of [-1, 0, 1]) {
        const x = -12 - Math.abs(i) * 6 - spread * 10;
        line(x, i * 11, x + 18, i * 11, x + 12, i * 11 - 4);
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const a = i * TAU / 3 - spread * .5;
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a + .3) * (r - 8), Math.sin(a + .3) * (r - 8));
      }
    }
  };
  // Summoning/construction rise in screen space; directional casts point at aim.
  if (!['summon', 'construct', 'storm', 'self'].includes(p.family)) ctx.rotate(cue.facing);
  gesture(); ctx.strokeStyle = C.outline; ctx.lineWidth = C.width + 2; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = C.width; ctx.stroke();
  const presence = presenceProfile(p.skillId), self = selfProfile(p.skillId);
  ctx.save();
  ctx.translate(p.family === 'bolt' || p.family === 'beam' ? 19 : 0, presence ? -8 - q * 7 : -4);
  if (presence) drawPresenceGlyph(ctx, presence, C.glyph, color, q, 'arrive');
  else if (self) drawSelfGlyph(ctx, self, C.glyph, color, q, true);
  else { ctx.lineWidth = C.width; drawSkillMark(ctx, p.motif, 8 + q * 3, 0); }
  if (held) { ctx.beginPath(); ctx.arc(0, 20, 1.6, 0, TAU); ctx.fill(); }
  ctx.restore(); ctx.restore();
}
/** Caller decides whose effects are allowed. Returns true only if painted so
 * existing functional held-readiness cues can remain as a fallback. */
export function drawPlayerCastPreparation(ctx: CanvasRenderingContext2D, a: Actor, color: string): boolean {
  const cue = playerCastPreparation(a);
  if (!cue) return false;
  ctx.save();
  if (['summon', 'construct', 'storm'].includes(cue.profile.family)) ctx.translate(0, a.radius + 8);
  else ctx.translate(Math.cos(cue.facing) * (a.radius + 14), Math.sin(cue.facing) * (a.radius + 14));
  drawCastPreparation(ctx, cue, color); ctx.restore(); return true;
}
