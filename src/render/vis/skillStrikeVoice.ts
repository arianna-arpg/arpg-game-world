import { SKILL_STRIKES, STRIKE_VISUAL_STYLE as C, type SkillStrikeProfile } from '../../data/skillStrikeVisuals';
import { registerEffectVoice, type EffectVoiceFlash } from './effectVoice';
import { drawSkillMark } from './skillBurstVoice';
import { traceFlashFigure } from './aoeTrace';
import { shade, withAlpha } from './color';
const TAU = Math.PI * 2;

export function clipStrike(ctx: CanvasRenderingContext2D, f: EffectVoiceFlash): void {
  ctx.beginPath(); traceFlashFigure(ctx, f); ctx.clip();
  if (f.edgeFrac && f.edgeFrac > 0) {
    ctx.beginPath(); ctx.rect(f.pos.x - f.radius * 2, f.pos.y - f.radius * 2, f.radius * 4, f.radius * 4);
    ctx.moveTo(f.pos.x + f.radius * f.edgeFrac, f.pos.y);
    ctx.arc(f.pos.x, f.pos.y, f.radius * f.edgeFrac, 0, TAU); ctx.clip('evenodd');
  }
}
/** Contact geometry stays visible from birth. Moving ink is follow-through,
 * never a delayed hit or a replacement for the real attack telegraph. */
export function drawSkillStrike(ctx: CanvasRenderingContext2D, f: EffectVoiceFlash, life: number, p: SkillStrikeProfile): void {
  if (!(f.radius > 0 && life > 0) || !Number.isFinite(f.radius + life + f.pos.x + f.pos.y)) return;
  const k = Math.max(0, Math.min(1, 1 - life)), r = f.radius;
  const beat = p.motion === 'in' ? 1 - k : p.motion === 'recoil' ? Math.sin(Math.PI * k) : k;
  const turn = p.motion === 'sweep' ? (k - .5) * .9 : 0;
  ctx.save(); clipStrike(ctx, f);
  ctx.beginPath(); traceFlashFigure(ctx, f); ctx.fillStyle = withAlpha(f.color, C.wash * life); ctx.fill();
  ctx.strokeStyle = withAlpha(f.color, C.boundary * life); ctx.lineWidth = 1; ctx.stroke();
  ctx.translate(f.pos.x, f.pos.y); ctx.rotate(f.arc?.facing ?? f.facing ?? 0);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalAlpha *= Math.pow(life, .55);
  const n = Math.min(C.maxStrokes, p.count), wide = Math.min(1.1, (f.arc?.arcRad ?? f.arcRad ?? 1.7) * .46);
  const stroke = (width = 1.5) => {
    ctx.strokeStyle = C.outline; ctx.lineWidth = width + 2; ctx.stroke();
    ctx.strokeStyle = shade(f.color, .48); ctx.lineWidth = width; ctx.stroke();
  };
  for (let i = 0; i < n; i++) {
    const u = (i + .5) / n, a = (u - .5) * wide * 2 + turn;
    ctx.save(); ctx.beginPath();
    switch (p.form) {
      case 'cut': {
        const rr = r * (.5 + u * .45), start = -wide + turn + beat * .2;
        const end = Math.min(wide, start + wide * (1.25 + .5 * beat));
        ctx.arc(0, 0, rr, start, end);
        ctx.quadraticCurveTo(Math.cos(end - .15) * (rr - r * .08), Math.sin(end - .15) * (rr - r * .08),
          Math.cos(end - .25) * (rr - r * .035), Math.sin(end - .25) * (rr - r * .035));
        ctx.arc(0, 0, Math.max(.01, rr - r * .035), end - .25, start, true); ctx.closePath();
        ctx.fillStyle = withAlpha(f.color, .38 + u * .25); ctx.fill(); break;
      }
      case 'cross': {
        ctx.translate(r * .6, 0); ctx.rotate((i % 2 ? -1 : 1) * (.55 + i * .15) + turn);
        ctx.moveTo(-r * .35, -r * .22 * wide); ctx.quadraticCurveTo(r * .05, -r * .08, r * (.2 + beat * .15), r * .25 * wide); break;
      }
      case 'thrust': {
        const y = (u - .5) * r * Math.min(wide, .4);
        ctx.moveTo(r * (.12 + beat * .12), y); ctx.lineTo(r * (.75 + beat * .2), y * .3);
        ctx.lineTo(r * (.62 + beat * .2), y * .3 - r * .06); break;
      }
      case 'rake': {
        const y = (u - .5) * r * wide;
        ctx.moveTo(r * .2, y * .8); ctx.bezierCurveTo(r * .4, y - r * .14, r * .7, y + r * .12, r * (.73 + beat * .2), y * .7); break;
      }
      case 'crush': {
        const x = r * (.52 + beat * .18), b = u * TAU;
        ctx.moveTo(x, 0); ctx.lineTo(x + Math.cos(b - .22) * r * .15, Math.sin(b - .22) * r * .15);
        ctx.lineTo(x + Math.cos(b) * r * (.22 + beat * .12), Math.sin(b) * r * (.22 + beat * .12)); break;
      }
      case 'jaws': {
        const side = i % 2 ? -1 : 1, gap = r * (.12 + (1 - beat) * .23) * wide;
        ctx.moveTo(r * .25, side * gap); ctx.quadraticCurveTo(r * .58, side * gap * 1.3, r * .86, side * gap * .5);
        ctx.lineTo(r * (.69 + u * .1), side * gap * .1); break;
      }
      case 'grasp': {
        ctx.rotate(a); ctx.moveTo(r * .14, 0); ctx.quadraticCurveTo(r * .73, -r * .1, r * .86, 0);
        ctx.quadraticCurveTo(r * .8, r * (.12 + beat * .12), r * .62, r * .08); break;
      }
      case 'lash': {
        ctx.moveTo(r * .08, 0); ctx.bezierCurveTo(r * .32, Math.sin(i + beat * 4) * r * wide * .6,
          r * .68, -Math.sin(i + beat * 4) * r * wide * .6, Math.cos(a * .55) * r * .94, Math.sin(a * .55) * r * .94); break;
      }
      case 'fan': ctx.rotate(a); ctx.moveTo(r * .12, 0); ctx.quadraticCurveTo(r * .5, -r * .12 * (1 - beat), r * .95, 0); break;
      case 'breath': {
        ctx.rotate(a * .85); ctx.moveTo(r * .1, 0);
        ctx.bezierCurveTo(r * .35, -r * .09, r * .65, r * (.06 + beat * .08), r * .95, 0); break;
      }
      case 'waves': {
        const rr = r * (.25 + ((u + beat * .18) % .75));
        if (p.motif === 'flame') {
          for (let j = 0; j <= 16; j++) {
            const b = -wide * .92 + j / 16 * wide * 1.84;
            const fr = rr + (j % 2 ? r * (.04 + .035 * Math.sin(j + k * 8)) : 0);
            if (j) ctx.lineTo(Math.cos(b) * fr, Math.sin(b) * fr); else ctx.moveTo(Math.cos(b) * fr, Math.sin(b) * fr);
          }
          ctx.arc(0, 0, Math.max(.01, rr - r * .055), wide * .92, -wide * .92, true); ctx.closePath();
          ctx.fillStyle = withAlpha(f.color, .4); ctx.fill();
        } else ctx.arc(0, 0, rr, -wide * .92, wide * .92); break;
      }
      case 'shards': {
        ctx.rotate(a); const x = r * (.4 + u * .4 + beat * .1);
        ctx.moveTo(x - r * .15, -r * .045); ctx.lineTo(x + r * .1, 0); ctx.lineTo(x - r * .15, r * .045); ctx.closePath(); break;
      }
      case 'vortex': {
        for (let j = 0; j <= 12; j++) { const q = j / 12, b = a + q * 2.3 + turn;
          const x = Math.cos(b) * r * q, y = Math.sin(b) * r * q;
          if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); } break;
      }
      case 'lightning': {
        ctx.rotate(a * (.6 + beat * .3)); ctx.moveTo(0, 0);
        for (let j = 1; j <= 9; j++) ctx.lineTo(j / 9 * r, (j % 2 ? 1 : -1) * r * .055 * Math.sin(j + Math.floor(k * 8) + i)); break;
      }
    }
    stroke(p.form === 'cut' ? Math.max(1, Math.min(3, r * .025)) : 1.5); ctx.restore();
    // Material follows each stroke instead of forming another universal ring.
    const dist = r * (.48 + .4 * u), theta = a * .8;
    ctx.save(); ctx.translate(Math.cos(theta) * dist, Math.sin(theta) * dist); ctx.rotate(theta + (p.motion === 'in' ? Math.PI : 0));
    ctx.strokeStyle = C.outline; ctx.fillStyle = C.outline; ctx.lineWidth = 3;
    const s = Math.min(p.form === 'breath' ? 18 : 9, r * (p.form === 'breath' ? .14 : .075)) * (.8 + .2 * beat);
    drawSkillMark(ctx, p.motif, s * 1.12, k);
    ctx.strokeStyle = shade(f.color, .3); ctx.fillStyle = f.color; ctx.lineWidth = 1.2; drawSkillMark(ctx, p.motif, s, k);
    if (p.echo && i % 2 === 0) { ctx.translate(-r * .17, r * .08); drawSkillMark(ctx, p.echo, s * .66, k); }
    ctx.restore();
  }
  if (p.form === 'crush') {
    const x = r * (.52 + beat * .18), size = r * (.1 + .055 * beat);
    ctx.beginPath(); ctx.moveTo(x - size, 0); ctx.lineTo(x, -size * .7); ctx.lineTo(x + size, 0); ctx.lineTo(x, size * .7); ctx.closePath();
    ctx.fillStyle = withAlpha(f.color, .55); ctx.fill(); stroke(1.3);
  }
  ctx.restore();
}
for (const [id, p] of Object.entries(SKILL_STRIKES)) registerEffectVoice('skillStrike:' + id, (ctx, f, t) => drawSkillStrike(ctx, f, t, p));
