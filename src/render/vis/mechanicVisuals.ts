import type { Vec2 } from '../../core/math';
import { MECHANIC_BURSTS, MECHANIC_FIELDS, MECHANIC_LINKS, mechanicBurst, type MechanicBurst,
  type MechanicField, type MechanicLinkKind } from '../../data/mechanicVisuals';
import { registerEffectVoice } from './effectVoice';
import { drawSkillBurst, drawSkillMark } from './skillBurstVoice';
import { drawBuffMark } from './buffMantle';
import {MECHANIC_MARKS, type MechanicMark} from '../../engine/mechanicMarks';
import { withAlpha } from './color';

for (const key of Object.keys(MECHANIC_BURSTS) as MechanicBurst[]) {
  const profile = MECHANIC_BURSTS[key];
  const local = { ...profile, focus: 'source' } as const;
  registerEffectVoice(mechanicBurst(key), (ctx, flash, t) => {
    const trigger = flash.statusRelease?.trigger;
    drawSkillBurst(ctx, flash, t, trigger === 'spend' || trigger === 'reapply' ? local : profile);
  });
}

/** One barbed shaft crosses the bearer. Withdrawal shows the trailing fork
 * and moves back toward the caller; driving a spike follows the incoming hit. */
for (const kind of ['impaleDrive', 'impaleRecall'] as const) {
  registerEffectVoice(kind, (ctx, f, t) => {
    const recall = kind === 'impaleRecall';
    const reach = Math.min(f.radius, 32), width = Math.max(2, reach * 0.14);
    const travel = reach * (1 - t * t);
    ctx.save();
    ctx.translate(f.pos.x, f.pos.y);
    ctx.rotate(f.facing ?? 0);
    ctx.translate(travel - reach * 0.45, 0);
    if (recall) ctx.scale(-1, 1);
    ctx.globalAlpha *= Math.min(1, t * 3);
    ctx.beginPath();
    ctx.moveTo(-reach * 0.75, -width * 0.32);
    ctx.lineTo(reach * 0.12, -width * 0.32);
    ctx.lineTo(0, -width * 1.4);
    ctx.lineTo(reach * 0.96, 0);
    ctx.lineTo(0, width * 1.4);
    ctx.lineTo(reach * 0.12, width * 0.32);
    ctx.lineTo(-reach * 0.75, width * 0.32);
    ctx.closePath();
    ctx.fillStyle = '#354453'; ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = f.color; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-reach * 0.78, 0); ctx.lineTo(reach * 0.86, 0);
    ctx.strokeStyle = '#f1f8ff'; ctx.stroke();
    if (recall) {
      // The rear-facing hooks open as the head pulls free.
      const hook = width * (1.5 + 1 - t);
      ctx.beginPath();
      for (const side of [-1, 1]) {
        ctx.moveTo(reach * 0.34, 0);
        ctx.quadraticCurveTo(reach * 0.05, side * hook, -reach * 0.38, side * hook);
        ctx.lineTo(-reach * 0.28, side * hook * 0.5);
      }
      ctx.lineWidth = 1.7; ctx.strokeStyle = '#879dad'; ctx.stroke();
    }
    ctx.restore();
  });
}

/** Draw the blast's material throughout its warning. Old hosts retain a plain mote. */
export function drawDeathBurstMark(ctx: CanvasRenderingContext2D, fx: string | undefined, x: number, y: number, angle: number, size: number): void {
  const key = fx?.startsWith('mechanic:') ? fx.slice(9) : '';
  ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
  if (Object.hasOwn(MECHANIC_BURSTS,key)) drawSkillMark(ctx, MECHANIC_BURSTS[key as MechanicBurst].motif, size, .55);
  else { ctx.beginPath(); ctx.arc(0,0,size,0,Math.PI*2); ctx.fill(); }
  ctx.restore();
}

/** Work per link stays bounded regardless of its length. Positions come from the two bodies. */
export function drawMechanicLink(ctx: CanvasRenderingContext2D, kind: MechanicLinkKind, from: Vec2,
  to: Vec2, color: string, remaining: number): void {
  const style = MECHANIC_LINKS[kind], dx = to.x - from.x, dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (!style || !Number.isFinite(length + remaining) || length < 1 || remaining <= 0) return;
  const t = 1 - Math.min(1, remaining), amp = Math.min(5, length * .045);
  ctx.save(); ctx.translate(from.x, from.y); ctx.rotate(Math.atan2(dy, dx));
  ctx.globalAlpha *= Math.min(1, remaining * 4);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(0,0);
  if (style.motion === 'bolt') {
    for (let i=1; i<=10; i++) ctx.lineTo(length*i/10, i===10 ? 0 : Math.sin(i*8.7+t*9)*amp);
  } else ctx.lineTo(length,0);
  ctx.strokeStyle = '#263039'; ctx.lineWidth = 4.5; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = style.accent; ctx.fillStyle = style.accent;
  if (style.motion === 'siphon') {
    // Two conductive strands and V-shaped teeth travel from victim to caster.
    for (const side of [-1,1]) {
      ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(length/2, side*amp*2.8, length,0); ctx.stroke();
    }
    for (let i=0;i<3;i++) {
      const x = length * (1 - ((t+i/3)%1)), tooth = Math.min(5,length*.07);
      ctx.beginPath(); ctx.moveTo(x+tooth,-tooth); ctx.lineTo(x,0); ctx.lineTo(x+tooth,tooth); ctx.stroke();
    }
  } else {
    for (let i=0;i<4;i++) {
      const x = length*((t+i/4)%1);
      ctx.save(); ctx.translate(x,0);
      const material = style.motion === 'burn' ? 'flame' : style.motion === 'shard' ? 'ice' : style.motion === 'bolt' ? 'sparks' : style.motion;
      drawSkillMark(ctx, material, amp+1,t);
      ctx.restore();
    }
  }
  ctx.restore();
}

export function drawMechanicMarks(ctx: CanvasRenderingContext2D, marks:readonly MechanicMark[], radius:number, time:number): void {
  for (let i=0;i<Math.min(4,marks.length);i++) {
    const mark = marks[i], art = MECHANIC_MARKS[mark.id];
    if (!art) continue;
    const angle = (i-1)*Math.PI/3 - Math.PI/2, reach = radius*.79;
    const size = Math.min(17, Math.max(10,radius*.76)) + Math.min(3,mark.stacks-1);
    drawBuffMark(ctx,{subject:art.subject,pose:'native',color:art.color},
      Math.cos(angle)*reach,Math.sin(angle)*reach + Math.sin(time*3+i),size);
  }
}

export function drawMechanicField(ctx: CanvasRenderingContext2D, field: MechanicField, time: number): void {
  const art = MECHANIC_FIELDS[field.kind];
  if (!art || field.remain <= 0) return;
  const {x,y} = field.pos, phase = time * 2.8 + x * .035, beat = Math.sin(phase);
  ctx.save(); ctx.globalAlpha *= Math.min(1, field.remain * 4);
  if ('ground' in art && field.radius) {
    // Petals, cracks, notes and forks break up the footprint even between pulses.
    ctx.fillStyle = withAlpha(art.color,.055); ctx.strokeStyle = withAlpha(art.color,.28);
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x,y,field.radius,0,Math.PI*2); ctx.fill(); ctx.stroke();
    for (let i=0;i<7;i++) {
      const angle = (i + .15*Math.sin(x+y))*Math.PI*2/7;
      const distance = field.radius * (.65 + .11*Math.sin(phase+i));
      ctx.save(); ctx.translate(x+Math.cos(angle)*distance,y+Math.sin(angle)*distance); ctx.rotate(angle);
      ctx.fillStyle = withAlpha(art.color,.32); drawSkillMark(ctx,art.ground,Math.min(10,field.radius*.1),.5); ctx.restore();
    }
  }
  drawBuffMark(ctx,{subject:art.subject,pose:'native',color:art.color},x,y-4-beat*2,art.size);
  ctx.restore();
}
