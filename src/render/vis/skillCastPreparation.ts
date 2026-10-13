import type { Actor } from '../../engine/actor';
import { playerCastPreparation, type PlayerCastPreparation } from '../../engine/playerCastVisual';
import { CAST_PREPARATION_STYLE as C } from '../../data/skillCastVisuals';
import { presenceProfile } from '../../data/skillPresenceVisuals';
import { drawSkillMark } from './skillBurstVoice';

const TAU = Math.PI * 2;
export type CastPreparationLayer = 'behind' | 'front' | 'all';
/** Power is carried by the body: rear intake, coursing shoulders, then hands.
 * Both passes share the actor's posed origin/facing. No detached destination
 * glyph, ground boundary, or predicted release. Held work retains its charge. */
export function drawCastPreparation(ctx: CanvasRenderingContext2D, cue: PlayerCastPreparation, color: string,
  layer: CastPreparationLayer = 'all'): void {
  const { profile: p } = cue, q = cue.fill ?? .55, presence = presenceProfile(p.skillId);
  const r = Math.max(8, Math.min(32, cue.radius)), spread = 1 - q;
  // Finite preparation contracts monotonically; the moving flecks carry energy
  // continuously. A held completion never empties or flashes back to uncharged.
  const flow = cue.age * (p.family === 'storm' ? 1.3 : .85);
  ctx.save(); ctx.rotate(cue.facing); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = C.width;
  const alpha = ctx.globalAlpha * C.alpha * (.24 + .76 * q);
  const line = (...v: number[]) => { ctx.moveTo(v[0] * r, v[1] * r); for (let i = 2; i < v.length; i += 2) ctx.lineTo(v[i] * r, v[i + 1] * r); };
  const stroke = (strength = 1) => {
    ctx.globalAlpha = alpha * strength * .2; ctx.lineWidth = 4.5; ctx.strokeStyle = color; ctx.stroke();
    ctx.globalAlpha = alpha * strength * .55; ctx.lineWidth = C.width + 1.3; ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.globalAlpha = alpha * strength; ctx.lineWidth = C.width; ctx.strokeStyle = color; ctx.stroke();
  };
  const mote = (x: number, y: number, size: number, turn: number, strength = 1) => {
    ctx.save(); ctx.translate(x * r, y * r); ctx.rotate(turn);
    ctx.globalAlpha = alpha * strength; ctx.lineWidth = C.width;
    drawSkillMark(ctx, p.motif, size, q); ctx.restore();
  };
  if (layer !== 'front') {
    ctx.beginPath();
    for (const s of [-1, 1]) {
      if (p.family === 'summon' && presence?.form === 'golem') {
        // Weighty facets move inward around the caster, rather than a second skeleton.
        for (let i = 0; i < 3; i++) {
          const x = -1 + i * .65 + q * .12, y = s * (1.23 + spread * .2 - i * .08), h = .16 + q * .05;
          line(x - h, y, x - h * .5, y - s * h, x + h, y - s * h * .55, x + h * .8, y + s * h, x - h, y);
        }
      } else if (p.family === 'summon') {
        // Open ribs cradle the torso. Their ends lead to the casting hands.
        for (let i = 0; i < 3; i++) {
          const x = -.9 + i * .48 + spread * -.18, y = s * (1.2 + spread * .25 - i * .08);
          ctx.moveTo(x * r, y * r);
          ctx.bezierCurveTo((x - .45) * r, y * r, (x - .18) * r, s * .4 * r, (x + .4) * r, s * .28 * r);
        }
      } else if (p.family === 'construct') {
        for (let i = 0; i < 3; i++) {
          const x = -.95 + i * .55, y = s * (1.15 + spread * .3 - i * .08);
          line(x - .2, y, x + .17, y, x + .17, y - s * .32);
        }
      } else if (p.family === 'storm') {
        const a = s * (.45 + flow * .4), rr = r * (1.16 + spread * .2);
        ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        ctx.arc(0, 0, rr, a, a + 1.6);
        line(-1.18, s * .48, -.7, s * .8, -.38, s * .52);
      } else if (p.family === 'beam') {
        line(-1.25, s * .8, -.6, s * .8, .1, s * .46, .82, s * .46);
      } else if (p.family === 'bolt' && p.gathering === 'fork') {
        line(-1.3, s * .75, -.65, s * .42, -.8, s * .16, -.15, s * .2, .7, s * .35);
        line(-.65, s * .42, -.9, s * .92, -1.2, s * 1.02);
      } else if (p.family === 'bolt' && p.gathering === 'links') {
        for (let i = 0; i < 3; i++) {
          const x = -1.08 + i * .62, y = s * (.7 - i * .13), h = .12 + spread * .08;
          line(x - h, y, x, y - h, x + h, y, x, y + h, x - h, y);
        }
      } else if (p.family === 'bolt' && p.motif === 'ice') {
        line(-1.25, s * .85, -.7, s * (1.15 - q * .2), -.55, s * .55, .12, s * .75, .76, s * .38);
        line(-.7, s * (1.15 - q * .2), -.48, s * 1.18);
      } else if (p.family === 'bolt' && p.motif === 'flame') {
        const curl = Math.sin(cue.age * 6 + s) * .12;
        ctx.moveTo(-1.32 * r, s * (.72 + curl) * r);
        ctx.bezierCurveTo(-1.1 * r, s * 1.5 * r, -.22 * r, s * (.3 + curl) * r, .76 * r, s * .38 * r);
        ctx.moveTo(-.86 * r, s * 1.05 * r); ctx.quadraticCurveTo(-.5 * r, s * 1.15 * r, -.35 * r, s * .67 * r);
      } else if (p.family === 'field') {
        const a = s > 0 ? .28 : Math.PI + .28, rr = r * (1.35 - q * .22);
        ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); ctx.arc(0, 0, rr, a, a + 2.05);
      } else if (p.family === 'target') {
        ctx.moveTo(-1.2 * r, s * .9 * r);
        ctx.bezierCurveTo(-.15 * r, s * 1.3 * r, -.6 * r, -s * .25 * r, .72 * r, s * .4 * r);
      } else if (p.family === 'travel') {
        line(-1.4 - spread * .15, s * .65, -.95, s * .5);
        line(-.76, s * .46, .7, s * .28);
      } else if (p.family === 'strike') {
        if (s === 1) ctx.arc(0, 0, r * 1.2, .65, 2.4 + q * .7);
      } else if (p.family === 'self') {
        const a = s > 0 ? .5 : Math.PI + .5;
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.arc(0, 0, r * (1.1 + spread * .18), a, a + 1.9);
      } else {
        ctx.moveTo(-1.3 * r, s * .85 * r);
        ctx.bezierCurveTo(-.9 * r, s * 1.2 * r, -.2 * r, s * .9 * r, .76 * r, s * .38 * r);
      }
    }
    stroke(.7);
    // A few material fragments spiral INTO the shoulders, never orbit a remote glyph.
    for (let i = 0; i < 6; i++) {
      const t = (flow + i / 6) % 1, a = (i % 2 ? -1 : 1) * (1.15 + t * 1.5);
      const rr = 1.5 - t * .67, envelope = Math.sin(t * Math.PI);
      mote(Math.cos(a) * rr - .12, Math.sin(a) * rr, 1.1 + q * 1.1, a + Math.PI, envelope * .85);
    }
  }
  if (layer !== 'behind') {
    // Thin veins cross the torso into two hand foci; the underlying body stays readable.
    ctx.beginPath();
    for (const s of [-1, 1]) {
      if (p.gathering === 'fork' || p.family === 'storm') {
        line(-.64, s * .37, -.18, s * .1, .05, s * .3, .22, s * .12, .74, s * .4);
      } else if (p.family === 'construct' || p.motif === 'ice') {
        line(-.55, s * .4, -.1, s * .4, -.1, s * .16, .35, s * .16, .72, s * .4);
      } else if (p.family === 'strike') {
        if (s === 1) { ctx.moveTo(-.5 * r, .4 * r); ctx.quadraticCurveTo(.35 * r, .95 * r, .9 * r, .3 * r); }
      } else if (p.family === 'beam') {
        line(-.55, s * .36, .75, s * .36);
      } else {
        ctx.moveTo(-.6 * r, s * .4 * r);
        ctx.bezierCurveTo(-.2 * r, -s * .15 * r, .25 * r, s * .08 * r, .74 * r, s * .4 * r);
      }
    }
    stroke(.45 + q * .25);
    for (const s of [-1, 1]) {
      // Coursing sparks run from the back/core into the hand. The stored power
      // grows with completion independently of this repeating particle motion.
      const t = (flow * 1.4 + (s > 0 ? .5 : 0)) % 1;
      mote(-.55 + t * 1.28, s * (.12 + .28 * Math.abs(2 * t - 1)), 1 + q, 0, .8 * Math.sin(t * Math.PI));
      const hand = p.family === 'strike' && s === -1 ? .25 : 1;
      ctx.save(); ctx.translate(r * .74, r * s * .4);
      ctx.globalAlpha = alpha * hand * .1; ctx.beginPath(); ctx.arc(0, 0, 3 + q * 4, 0, TAU); ctx.fill();
      ctx.globalAlpha = alpha * hand; ctx.lineWidth = C.width;
      ctx.strokeStyle = ctx.fillStyle = C.outline; ctx.lineWidth = C.width + 1.2;
      drawSkillMark(ctx, p.motif, 2.3 + q * 2.1, q);
      ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = C.width;
      drawSkillMark(ctx, p.motif, 1.8 + q * 2.1, q);
      ctx.restore();
    }
    // A connected front focus compresses just beyond the hands at the end of
    // outward spells. It remains attached; native delivery alone owns ejection.
    if (p.family === 'bolt' || p.family === 'beam' || p.family === 'travel') {
      ctx.beginPath();
      const end = .75 + q * .38;
      for (const s of [-1, 1]) { ctx.moveTo(.74 * r, s * .4 * r); ctx.quadraticCurveTo(end * r, s * .3 * r, end * r, 0); }
      stroke(.4 + .5 * q);
      mote(end, 0, 1.5 + q * 2.1, 0);
    }
  }
  ctx.restore();
}
/** Standalone client/QA entry; the renderer splits the same art around its body. */
export function drawPlayerCastPreparation(ctx: CanvasRenderingContext2D, a: Actor, color: string,
  layer: CastPreparationLayer = 'all'): boolean {
  const cue = playerCastPreparation(a); if (!cue) return false;
  drawCastPreparation(ctx, cue, color, layer); return true;
}
