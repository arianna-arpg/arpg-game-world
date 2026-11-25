import { WORLD_MOMENTS, worldMoment, type WorldMoment, type WorldMomentProfile } from '../../data/worldMoments';
import { drawBuffMark } from './buffMantle';
import { registerEffectVoice, type EffectVoiceFlash } from './effectVoice';
import { drawSkillBurst, drawSkillMark } from './skillBurstVoice';
import { shade } from './color';

const TAU = Math.PI * 2;

function drawWorldMoment(ctx: CanvasRenderingContext2D, f: EffectVoiceFlash, t: number, art: WorldMomentProfile): void {
  if (art.kind === 'area') { drawSkillBurst(ctx, f, t, art.burst); return; }
  const age = 1 - t;
  const seed = (Math.floor(f.pos.x) * 13 + Math.floor(f.pos.y) * 7) % 31;
  const r = f.radius;
  ctx.save();
  ctx.translate(f.pos.x, f.pos.y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // The seed fixes the dust and ticks to the event for its whole life.
  if (art.kind === 'rim') {
    const width = Math.min(2.5, Math.max(1, r * .022));
    const inner = r * Math.max(0, Math.min(1, f.edgeFrac ?? .74));
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    ctx.moveTo(inner, 0); ctx.arc(0, 0, inner, 0, TAU, true); ctx.clip('evenodd');
    ctx.globalAlpha *= .75 + .25 * age;
    ctx.lineWidth = width;
    ctx.strokeStyle = f.color;
    ctx.beginPath(); ctx.arc(0, 0, Math.max(0, r - width / 2), 0, TAU); ctx.stroke();
    // Keep the centre of a warning clear, including the scatter storm's explicit safe centre.
    const size = Math.min(9, (r - inner) / 2, r * .12);
    ctx.fillStyle = shade(f.color, .22);
    for (let i = 0; i < 6; i++) {
      const angle = TAU * i / 6 + seed * .09;
      const at = Math.max(0, r - size - width);
      ctx.save(); ctx.translate(Math.cos(angle) * at, Math.sin(angle) * at); ctx.rotate(angle); ctx.scale(1, 2.4);
      drawSkillMark(ctx, art.material, size, age); ctx.restore();
    }
  } else if (art.kind === 'trail') {
    // The sender bakes the struck point into radius and facing at contact.
    ctx.rotate(f.facing ?? 0);
    const bend = Math.min(12, r * .14) * (seed % 2 ? -1 : 1);
    ctx.globalAlpha *= Math.min(1, t * 3);
    ctx.strokeStyle = f.color; ctx.lineWidth = Math.min(3, 1 + r * .02);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(r * .5, bend * 2, r, 0); ctx.stroke();
    ctx.fillStyle = shade(f.color,.25);
    for (let i = 0; i < 4; i++) {
      const u = ((art.motion === 'in' ? t : age) + i / 4) % 1;
      ctx.save(); ctx.translate(r * u, 4 * bend * u * (1-u));
      if (art.motion === 'in') ctx.rotate(Math.PI);
      drawSkillMark(ctx, art.material, Math.min(5, 1 + r * .045), age); ctx.restore();
    }
  } else {
    // Source signs and contact debris should never imply an area of damage.
    const sign = art.kind === 'sign';
    const extent = Math.min(r, sign ? 36 : 18);
    const count = sign ? 4 : 3;
    const progress = art.motion === 'in' ? t : art.motion === 'out' ? age : .65;
    const reach = extent * ((sign ? .42 : .17) + progress * .46);
    const size = Math.max(.8, Math.min(extent * (sign ? .13 : .22), 5));
    ctx.globalAlpha *= Math.min(1, t * 3);
    ctx.fillStyle = f.color; ctx.strokeStyle = shade(f.color, .4); ctx.lineWidth = 1.4;
    for (let i = 0; i < count; i++) {
      const angle = TAU * i / count + seed * .12 + (art.motion === 'orbit' ? age : 0);
      ctx.save(); ctx.translate(Math.cos(angle) * reach, Math.sin(angle) * reach);
      ctx.rotate(angle + (art.motion === 'in' ? Math.PI : 0));
      drawSkillMark(ctx, art.material, size, age); ctx.restore();
    }
    if (sign) {
      const size = Math.min(27, r * 1.25) * (.86 + .14 * t);
      drawBuffMark(ctx, { subject:art.subject, pose:'native', color:f.color }, 0, -extent * (.15 + age * .22), size);
    }
  }
  ctx.restore();
}

for (const id of Object.keys(WORLD_MOMENTS) as WorldMoment[]) {
  registerEffectVoice(worldMoment(id), (ctx, flash, remaining) => drawWorldMoment(ctx, flash, remaining, WORLD_MOMENTS[id]));
}
