import type { ProjectileBurstProfile } from '../../data/projectileBursts';
import { hash01, shade } from './color';
import type { EffectVoiceFlash } from './effectVoice';

/** Local space, already clipped to the hit figure and its safe center. */
export function drawProjectileRupture(ctx: CanvasRenderingContext2D, f: EffectVoiceFlash,
  remaining: number, profile: ProjectileBurstProfile): void {
  const t = remaining, travel = 1 - t*t;
  const count = Math.min(8, profile.count), r = f.radius;
  const seed = Math.floor(f.pos.x + f.pos.y * 13);
  const glow = shade(f.color, .72);
  ctx.save(); ctx.globalAlpha *= t;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < count; i++) {
    const noise = hash01(seed, i * 19);
    const angle = (f.facing ?? 0) + (i + noise * .33) * Math.PI * 2 / count;
    const reach = r * (.12 + travel * (.45 + .22 * noise));
    const s = Math.min(25, r * (.14 + .09 * noise)) * (.45 + .65 * t);
    ctx.save();
    ctx.fillStyle = i % 2 ? f.color : shade(f.color, .28);
    ctx.strokeStyle = glow; ctx.lineWidth = Math.max(.7, s * .13);
    ctx.rotate(angle);
    switch (profile.release) {
      case 'pyre': {
        // Flames billow around the broken core, then lift in world space.
        ctx.translate(reach * .62, 0); ctx.rotate(-angle);
        ctx.translate(0, -r * .15 * travel);
        const drift = s * (noise - .5);
        ctx.beginPath(); ctx.moveTo(-s*.69, s*.32);
        ctx.bezierCurveTo(-s*1.02, -s*.31, drift+s*.58, -s*.7, drift, -s*1.72);
        ctx.bezierCurveTo(s*.92, -s*.85, s*.95, s*.5, s*.16, s*.68); ctx.closePath(); ctx.fill();
        ctx.fillStyle = glow; ctx.beginPath(); ctx.moveTo(-s*.29,s*.29);
        ctx.quadraticCurveTo(s*.2, -s*.1, drift+s*.1, -s*.63);
        ctx.quadraticCurveTo(s*.59, s*.19, s*.1, s*.46); ctx.closePath(); ctx.fill();
        break;
      }
      case 'crystal':
      case 'splinters': {
        const crystal = profile.release === 'crystal';
        ctx.translate(reach,0); ctx.rotate(crystal ? .18 : (noise-.5)*travel*2);
        ctx.beginPath(); ctx.moveTo(s,0); ctx.lineTo(-s*.28,-s*(crystal ? .48 : .36));
        ctx.lineTo(-s*.88,s*.16); ctx.lineTo(-s*.16,s*.39); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-s*.79,s*.14); ctx.lineTo(-s*.18,-s*.05); ctx.lineTo(s*.92,0); ctx.stroke();
        break;
      }
      case 'droplets':
        ctx.translate(reach,0); ctx.beginPath(); ctx.moveTo(-s*.98,0);
        ctx.bezierCurveTo(s*.65,-s,s*1.19,s*.41,s*.24,s*.49); ctx.closePath(); ctx.fill();
        ctx.fillStyle = glow; ctx.beginPath(); ctx.ellipse(s*.24,-s*.13,s*.22,s*.1,-.3,0,Math.PI*2); ctx.fill();
        break;
      case 'arcing':
        ctx.beginPath(); ctx.moveTo(r*.05,0); ctx.lineTo(reach*.44,s*.41);
        ctx.lineTo(reach*.52,-s*.26); ctx.lineTo(reach+s*.4,0); ctx.stroke();
        break;
      case 'vortex':
        ctx.rotate(travel*.7); ctx.beginPath(); ctx.moveTo(r*.08,0);
        ctx.bezierCurveTo(reach*.6,-s*.25,reach*.4,-reach*.8,reach,-reach*.48);
        ctx.quadraticCurveTo(reach*.55,-reach*.19,r*.08,0); ctx.fill();
        break;
    }
    ctx.restore();
  }
  ctx.restore();
}
