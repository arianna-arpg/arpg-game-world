import type { Actor } from '../../engine/actor';
import { playerCastPreparation, type PlayerCastPreparation } from '../../engine/playerCastVisual';
import { CAST_PREPARATION_STYLE as C } from '../../data/skillCastVisuals';
import { drawSkillMark } from './skillBurstVoice';

const TAU = Math.PI * 2;
export type CastPreparationLayer = 'behind' | 'front' | 'all';
/** Power is carried by the posed body: rear intake, coursing shoulders, hands.
 * School controls shape AND cadence; delivery only adjusts the final gathering.
 * No skill-ID lookup, random particles, detached glyph or predicted release. */
export function drawCastPreparation(ctx: CanvasRenderingContext2D, cue: PlayerCastPreparation, color: string,
  layer: CastPreparationLayer = 'all'): void {
  const { profile: p } = cue, q = cue.fill ?? .55, style = p.style;
  const r = Math.max(8, Math.min(32, cue.radius)), spread = 1 - q;
  const speed = p.legacyMantle ? .85 : style === 'lightning' ? 1.7 : style === 'cold' ? .5
    : style === 'summon-golem' || style === 'physical' ? .45 : style === 'life' ? .65 : .85;
  const flow = cue.age * speed;
  ctx.save(); ctx.rotate(cue.facing); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = C.width;
  const alpha = ctx.globalAlpha * C.alpha * (.24 + .76 * q);
  const line = (...v: number[]) => { ctx.moveTo(v[0] * r, v[1] * r); for (let i = 2; i < v.length; i += 2) ctx.lineTo(v[i] * r, v[i + 1] * r); };
  const stroke = (strength = 1) => {
    ctx.globalAlpha = alpha * strength * .2; ctx.lineWidth = 4.5; ctx.strokeStyle = color; ctx.stroke();
    ctx.globalAlpha = alpha * strength * .55; ctx.lineWidth = C.width + 1.3; ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.globalAlpha = alpha * strength; ctx.lineWidth = C.width; ctx.strokeStyle = color; ctx.stroke();
    if (!p.legacyMantle) {
      // A neutral hairline keeps dark Wardrobe tints legible; the dark rim
      // does the same work against pale cloth or terrain.
      ctx.globalAlpha = alpha * strength * C.coreAlpha; ctx.lineWidth = .45; ctx.strokeStyle = C.highlight; ctx.stroke();
      ctx.strokeStyle = color;
    }
  };
  const mote = (x: number, y: number, size: number, turn: number, strength = 1) => {
    ctx.save(); ctx.translate(x * r, y * r); ctx.rotate(turn);
    ctx.globalAlpha = alpha * strength; ctx.lineWidth = C.width;
    drawSkillMark(ctx, p.motif, size, q); ctx.restore();
  };
  if (layer !== 'front') {
    ctx.beginPath();
    for (const s of [-1, 1]) {
      if (p.legacyMantle) {
        const a = s > 0 ? .5 : Math.PI + .5;
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.arc(0, 0, r * (1.1 + spread * .18), a, a + 1.9);
      } else if (style === 'summon-golem') {
        for (let i = 0; i < 3; i++) {
          const x = -1 + i * .65 + q * .12, y = s * (1.23 + spread * .2 - i * .08), h = .16 + q * .05;
          line(x - h, y, x - h * .5, y - s * h, x + h, y - s * h * .55, x + h * .8, y + s * h, x - h, y);
        }
      } else if (style === 'summon-undead') {
        for (let i = 0; i < 3; i++) {
          const x = -.9 + i * .48 - spread * .18, y = s * (1.2 + spread * .25 - i * .08);
          ctx.moveTo(x * r, y * r);
          ctx.bezierCurveTo((x - .45) * r, y * r, (x - .18) * r, s * .4 * r, (x + .4) * r, s * .28 * r);
        }
      } else if (style === 'summon-nature') {
        // Tendril spine with paired growing leaf forks, rather than skeletal ribs.
        ctx.moveTo(-1.15 * r, s * .45 * r);
        ctx.bezierCurveTo(-1.4 * r, s * 1.65 * r, .05 * r, s * 1.25 * r, .65 * r, s * .48 * r);
        for (let i = 0; i < 3; i++) {
          const x = -.9 + i * .5, y = s * (1.05 - i * .08), grow = .14 + q * .17;
          line(x - grow, y - s * grow, x, y, x + grow * .2, y + s * grow);
        }
      } else if (style === 'summon-elemental') {
        for (let i = 0; i < 2; i++) {
          const a = s * (flow + i * .9), rr = r * (.23 + i * .16 + spread * .12), x = -.4 * r, y = s * .92 * r;
          ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); ctx.arc(x, y, rr, a, a + Math.PI * 1.35);
        }
      } else if (style === 'summon') {
        for (let i = 0; i < 2; i++) {
          const y = s * (.8 + i * .38 + spread * .18);
          ctx.moveTo(-1.22 * r, y * r); ctx.quadraticCurveTo(-.45 * r, (y + s * .45) * r, .55 * r, s * .5 * r);
          line(-1.22, y, -1.22, y - s * .25);
        }
      } else if (style === 'construct') {
        for (let i = 0; i < 3; i++) {
          const x = -.95 + i * .55, y = s * (1.15 + spread * .3 - i * .08);
          line(x - .2, y, x + .17, y, x + .17, y - s * .32);
        }
      } else if (style === 'lightning' && p.gathering === 'links') {
        for (let i = 0; i < 3; i++) {
          const x = -1.08 + i * .62, y = s * (.7 - i * .13), h = .12 + spread * .08;
          line(x - h, y, x, y - h, x + h, y, x, y + h, x - h, y);
        }
      } else if (style === 'lightning') {
        const jitter = Math.sin(Math.floor(cue.age * 12) * 2.3) * .1;
        line(-1.3, s * .75, -.65, s * (.42 + jitter), -.8, s * .16, -.15, s * .2, .7, s * .35);
        line(-.65, s * (.42 + jitter), -.9, s * .92, -1.2, s * 1.02);
      } else if (style === 'cold') {
        line(-1.25, s * .85, -.7, s * (1.15 - q * .2), -.55, s * .55, .12, s * .75, .76, s * .38);
        line(-.7, s * (1.15 - q * .2), -.48, s * 1.18);
      } else if (style === 'fire') {
        const curl = Math.sin(cue.age * 6 + s) * .12;
        ctx.moveTo(-1.32 * r, s * (.72 + curl) * r);
        ctx.bezierCurveTo(-1.1 * r, s * 1.5 * r, -.22 * r, s * (.3 + curl) * r, .76 * r, s * .38 * r);
        ctx.moveTo(-.86 * r, s * 1.05 * r); ctx.quadraticCurveTo(-.5 * r, s * 1.15 * r, -.35 * r, s * .67 * r);
      } else if (style === 'chaos') {
        const twist = Math.sin(flow * 3) * .2;
        ctx.moveTo(-1.2 * r, s * .9 * r);
        ctx.bezierCurveTo(-.15 * r, s * (1.3 + twist) * r, -.6 * r, -s * .25 * r, .72 * r, s * .4 * r);
      } else if (style === 'physical') {
        for (let i = 0; i < 3; i++) {
          const x = -1.25 + i * .5 + q * .12, y = s * (.82 - i * .1);
          line(x - .16, y - s * .2, x + .1, y, x - .16, y + s * .2);
        }
      } else if (style === 'life') {
        for (let i = 0; i < 3; i++) {
          const breathe = Math.sin(flow * 3) * .07;
          ctx.moveTo((-1.05 + i * .25) * r, s * (.7 + i * .26 + breathe) * r);
          ctx.quadraticCurveTo(-.4 * r, s * (.7 + i * .2) * r, .7 * r, s * .4 * r);
        }
      } else if (style === 'blood') {
        for (let i = 0; i < 2; i++) {
          const pulse = Math.sin(flow * 5 + i) * .18;
          ctx.moveTo(-1.2 * r, s * (.65 + i * .22) * r);
          ctx.bezierCurveTo(-.8 * r, s * (1.3 + pulse) * r, .15 * r, s * (.1 + i * .12) * r, .74 * r, s * .4 * r);
        }
      } else {
        // Universal arcane fallback: folding, broken sigils, not a target ring.
        const y = s * (1.12 + spread * .25);
        line(-1.15, s * .65, -.85, y, -.35, y, -.1, s * .75);
        line(-.9, s * .8, -.48, s * .8, -.26, s * .48);
      }
    }
    stroke(.7);
    for (let i = 0; i < 6; i++) {
      const t = (flow + i / 6) % 1, side = i % 2 ? -1 : 1, a = side * (1.15 + t * 1.5);
      const rr = 1.5 - t * .67, envelope = Math.sin(t * Math.PI);
      // Crystal and stone travel on straight seams; life falls in soft fans;
      // other schools curl inward. Cadence never resets stored completion.
      const linear = !p.legacyMantle && (style === 'cold' || style === 'physical' || style === 'summon-golem');
      const x = linear ? -1.2 + t * 1.15 : Math.cos(a) * rr - .12;
      const y = linear ? side * (1.05 - t * .5) : Math.sin(a) * rr;
      mote(x, y, 1.1 + q * 1.1, linear ? side * .6 : a + Math.PI, envelope * .85);
    }
  }
  if (layer !== 'behind') {
    ctx.beginPath();
    for (const s of [-1, 1]) {
      if (p.gathering === 'fork') {
        line(-.64, s * .37, -.18, s * .1, .05, s * .3, .22, s * .12, .74, s * .4);
      } else if (!p.legacyMantle && (style === 'construct' || style === 'cold' || style === 'summon-golem')) {
        line(-.55, s * .4, -.1, s * .4, -.1, s * .16, .35, s * .16, .72, s * .4);
      } else if (p.family === 'beam') {
        line(-.55, s * .36, .75, s * .36);
      } else {
        ctx.moveTo(-.6 * r, s * .4 * r);
        ctx.bezierCurveTo(-.2 * r, -s * .15 * r, .25 * r, s * .08 * r, .74 * r, s * .4 * r);
      }
    }
    stroke(.45 + q * .25);
    for (const s of [-1, 1]) {
      const t = (flow * 1.4 + (s > 0 ? .5 : 0)) % 1;
      mote(-.55 + t * 1.28, s * (.12 + .28 * Math.abs(2 * t - 1)), 1 + q, 0, .8 * Math.sin(t * Math.PI));
      ctx.save(); ctx.translate(r * .74, r * s * .4);
      ctx.globalAlpha = alpha * .1; ctx.beginPath(); ctx.arc(0, 0, 3 + q * 4, 0, TAU); ctx.fill();
      ctx.globalAlpha = alpha; ctx.lineWidth = C.width;
      ctx.strokeStyle = ctx.fillStyle = C.outline; ctx.lineWidth = C.width + 1.2;
      drawSkillMark(ctx, p.motif, 2.3 + q * 2.1, q);
      ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = C.width;
      drawSkillMark(ctx, p.motif, 1.8 + q * 2.1, q);
      if (!p.legacyMantle) {
        ctx.globalAlpha = alpha * C.coreAlpha; ctx.strokeStyle = ctx.fillStyle = C.highlight; ctx.lineWidth = .5;
        drawSkillMark(ctx, p.motif, 1.1 + q * 1.3, q);
      }
      ctx.restore();
    }
    if (p.family === 'bolt' || p.family === 'beam' || p.family === 'travel') {
      ctx.beginPath();
      const end = .75 + q * .38;
      for (const s of [-1, 1]) { ctx.moveTo(.74 * r, s * .4 * r); ctx.quadraticCurveTo(end * r, s * .3 * r, end * r, 0); }
      stroke(.4 + .5 * q); mote(end, 0, 1.5 + q * 2.1, 0);
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
