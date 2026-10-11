import { SKILL_FLIGHTS, SKILL_FIELDS, SKILL_BEAMS, SKILL_FLIGHT_STYLE as C,
  skillBeamVoice, type SkillFieldProfile } from '../../data/skillFlightVisuals';
import { SKILL_BURSTS } from '../../data/skillVisuals';
import { skillStrikeProfile } from '../../data/skillStrikeVisuals';
import { drawSkillStrike } from './skillStrikeVoice';
import { lightningProfile } from '../../data/lightningVisuals';
import { drawLightningHead } from './lightningVoice';
import { movementProfile } from '../../data/skillMovementVisuals';
import { selfProfile } from '../../data/skillSelfVisuals';
import { presenceProfile } from '../../data/skillPresenceVisuals';
import { drawPresenceField } from './skillPresenceVoice';
import type { SkillFieldVisual } from '../../engine/skillFieldVisual';
import { drawSkillMark } from './skillBurstVoice';
import { traceAoePath } from './aoeTrace';
import { registerEffectVoice, type EffectVoiceFlash } from './effectVoice';
import { shade, withAlpha, hash01 } from './color';

const TAU = Math.PI * 2;
export interface SkillFlightVisual {
  skillVisualId?: string;
  inst?: { def: { id: string } };
  pos: { x: number; y: number }; radius: number; dir: number; age: number;
  color: string; shape: string; cosmeticProjectile?: string;
}
export function flightProfile(p: SkillFlightVisual) {
  const id = p.skillVisualId ?? p.inst?.def.id ?? '';
  return Object.hasOwn(SKILL_FLIGHTS, id) ? SKILL_FLIGHTS[id] : undefined;
}

/** Wakes are faint, trailing decoration. The unchanged collision form remains
 * the bright head; wide forms keep their shared PROJ_FORM_GEO painter. */
export function drawSkillFlightWake(ctx: CanvasRenderingContext2D, p: SkillFlightVisual): boolean {
  if (lightningProfile(p.skillVisualId ?? p.inst?.def.id ?? '')) return true; // the measured path owns its wake
  const v = flightProfile(p);
  if (!v || p.radius <= 0 || !Number.isFinite(p.radius + p.dir + p.age + p.pos.x + p.pos.y)) return false;
  const r = p.radius, count = Math.min(C.maxMarks, v.count), phase = p.age * (v.motion === 'pulse' ? 9 : 5);
  ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(p.dir);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(0.6, r * 0.13);
  for (let i = 0; i < count; i++) {
    const q = (i + 1) / count, x = -r * (0.8 + 3.4 * q);
    const wobble = v.motion === 'weave' ? Math.sin(phase - q * 5) * r * 0.35 : 0;
    const s = r * (0.18 + (1 - q) * 0.3);
    ctx.strokeStyle = withAlpha(p.color, (0.6 - q * 0.25) * (0.85 + 0.15 * Math.sin(phase - i)));
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    switch (v.wake) {
      case 'ribbon':
        ctx.moveTo(x, wobble); ctx.bezierCurveTo(x + r * .35, wobble - s, x + r * .7, wobble + s, x + r, wobble); break;
      case 'beads':
        ctx.ellipse(x, wobble, s * (1 + .25 * Math.sin(phase - i)), s * .65, 0, 0, TAU); break;
      case 'fork':
        ctx.moveTo(x, wobble); ctx.lineTo(x + s, -s); ctx.lineTo(x + s * 1.5, s);
        ctx.lineTo(x + r, 0); ctx.moveTo(x + s, -s); ctx.lineTo(x, -s * 2); break;
      case 'saw':
        ctx.moveTo(x - s, -s); ctx.lineTo(x + s, 0); ctx.lineTo(x - s, s); break;
      case 'helix':
        for (const sign of [-1, 1]) {
          const y = Math.sin(phase - q * TAU) * r * .65 * sign;
          ctx.moveTo(x, y); ctx.quadraticCurveTo(x + r * .4, y + s * sign, x + r * .8, Math.sin(phase - q * TAU + 1) * r * .65 * sign);
        } break;
      case 'rings':
        ctx.ellipse(x, wobble, s * .45, s * (1.6 + .3 * Math.sin(phase - i)), 0, 0, TAU); break;
      case 'vapor':
        ctx.moveTo(x - s, wobble); ctx.bezierCurveTo(x, wobble - s * 2, x + r * .5, wobble + s * 2, x + r, wobble); break;
      case 'links':
        ctx.moveTo(x - s, 0); ctx.lineTo(x, -s); ctx.lineTo(x + s, 0); ctx.lineTo(x, s); ctx.closePath(); break;
      case 'quills':
        ctx.moveTo(x - s, -s * 1.4); ctx.lineTo(x + s, 0); ctx.lineTo(x - s, s * 1.4); break;
    }
    ctx.stroke();
  }
  // Wide forms still carry the source material in their wake; replacing their
  // native head with a decorative glyph would lie about their collision.
  ctx.save(); ctx.translate(-r * 2.3, 0); ctx.rotate(v.motion === 'tumble' ? phase : 0);
  ctx.strokeStyle = withAlpha(shade(p.color, .35), .6); ctx.fillStyle = withAlpha(p.color, .45);
  drawSkillMark(ctx, v.head, r * .36, (Math.sin(phase) + 1) / 2);
  ctx.restore();
  if (v.echo) {
    ctx.translate(-r * 3.5, 0); ctx.rotate(v.motion === 'tumble' ? -phase : 0);
    ctx.strokeStyle = withAlpha(shade(p.color, .35), .4); ctx.fillStyle = withAlpha(p.color, .32);
    drawSkillMark(ctx, v.echo, r * .27, (Math.sin(phase) + 1) / 2);
  }
  ctx.restore(); return true;
}

/** Local coordinates, called only after a wardrobe body declined the draw. */
export function drawSkillFlightHead(ctx: CanvasRenderingContext2D, p: SkillFlightVisual): boolean {
  if (drawLightningHead(ctx, p)) return true;
  const v = flightProfile(p);
  if (!v || p.shape !== 'circle' || p.radius <= 0) return false;
  const r = p.radius, phase = p.age * 6;
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  ctx.rotate(p.dir + (v.motion === 'tumble' ? phase : v.motion === 'weave' ? Math.sin(phase) * .18 : 0));
  const breath = v.motion === 'pulse' ? .85 + .15 * Math.sin(phase * 1.5) : 1;
  ctx.lineWidth = Math.max(.75, r * .17); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = shade(p.color, .6); ctx.fillStyle = p.color;
  if (v.body === 'orb') {
    ctx.beginPath(); ctx.arc(0, 0, r * .58 * breath, 0, TAU); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.rotate(i * TAU / 3 + phase * .35); ctx.translate(r * .65, 0);
      drawSkillMark(ctx, v.head, r * .3, (Math.sin(phase) + 1) / 2); ctx.restore();
    }
  } else if (v.body === 'star' || v.body === 'cluster') {
    const n = v.body === 'star' ? 4 : 3;
    for (let i = 0; i < n; i++) {
      ctx.save(); ctx.rotate(i * TAU / n + (v.body === 'cluster' ? phase * .4 : 0)); ctx.translate(r * .45, 0);
      drawSkillMark(ctx, v.head, r * .42, (Math.sin(phase + i) + 1) / 2); ctx.restore();
    }
  } else drawSkillMark(ctx, v.head, r * .78 * breath, (Math.sin(phase) + 1) / 2);
  ctx.restore(); return true;
}

export function fieldProfile(id: string): SkillFieldProfile | undefined {
  const movement = movementProfile(id);
  if (movement) return { motif: movement.motif, layout: movement.motion === 'coil' ? 'spiral' : 'spokes', motion: 'out', count: movement.count + 2 };
  const strike = skillStrikeProfile(id);
  if (strike) return { motif: strike.motif, layout: 'spokes', motion: strike.motion === 'in' ? 'in' : 'out', count: strike.count, echo: strike.echo };
  if (Object.hasOwn(SKILL_FIELDS, id)) return SKILL_FIELDS[id];
  const self = selfProfile(id);
  if (self) return { motif: self.motif, layout: self.motion === 'twist' ? 'spiral' : 'spokes', motion: 'out', count: self.count };
  // A projectile's deposited field and a nova's delayed aftermath keep the
  // parent material and count instead of acquiring a generic elemental wash.
  if (Object.hasOwn(SKILL_FLIGHTS, id)) {
    const p = SKILL_FLIGHTS[id];
    return { motif: p.head, layout: p.wake === 'links' ? 'lattice' : p.wake === 'helix' ? 'spiral' : 'scatter',
      motion: p.motion === 'tumble' ? 'orbit' : p.motion === 'weave' ? 'rise' : 'breathe', count: p.count + 3, echo: p.echo };
  }
  if (Object.hasOwn(SKILL_BURSTS, id)) {
    const b = SKILL_BURSTS[id];
    return { motif: b.motif, layout: b.rings ? 'rings' : 'spokes', motion: b.motion, count: Math.min(10, b.count), echo: b.echo };
  }
  return undefined;
}

/** Clip architecture independently against the footprint and each safe hole.
 * The engine's circular edgeOnly and shaped closing cage are different tests. */
export function clipSkillField(ctx: CanvasRenderingContext2D, z: SkillFieldVisual): void {
  const { x, y } = z.pos, r = z.radius;
  ctx.beginPath();
  if (z.seg) {
    const s = z.seg, angle = Math.atan2(s.by - s.ay, s.bx - s.ax);
    ctx.arc(s.ax, s.ay, r, angle + Math.PI / 2, angle + Math.PI * 1.5);
    ctx.arc(s.bx, s.by, r, angle - Math.PI / 2, angle + Math.PI / 2); ctx.closePath();
  } else traceAoePath(ctx, x, y, r, z.shape, z.facing, z.arcRad);
  ctx.clip();
  for (const [fraction, circular] of [[z.edgeFrac, true], [z.edge, false]] as const) {
    if (!fraction || fraction <= 0) continue;
    ctx.beginPath(); ctx.rect(x - r * 3, y - r * 3, r * 6, r * 6);
    if (circular) { ctx.moveTo(x + r * fraction, y); ctx.arc(x, y, r * fraction, 0, TAU); }
    else traceAoePath(ctx, x, y, r * fraction, z.shape, z.facing); // zoneHoleSpares uses the default arc
    ctx.clip('evenodd');
  }
}

export function drawSkillField(ctx: CanvasRenderingContext2D, z: SkillFieldVisual, time: number): boolean {
  if (!z.onGround && presenceProfile(z.skillId)?.family === 'storm' && z.radius > 0 && Number.isFinite(z.radius + z.pos.x + z.pos.y + time)) {
    ctx.save(); clipSkillField(ctx, z); drawPresenceField(ctx, z, time); ctx.restore(); return true;
  }
  const p = fieldProfile(z.skillId);
  // Ground-qualified strikes must keep the existing per-cell roil: decorative
  // ink in a dry, unhittable cell would falsely advertise damage.
  if (!p || z.onGround || z.radius <= 0 || !Number.isFinite(z.radius + z.pos.x + z.pos.y + time)) return false;
  const strike = skillStrikeProfile(z.skillId);
  if (strike && z.exploded && !z.seg && !z.edge) {
    drawSkillStrike(ctx, { ...z, life: 1, maxLife: 1 }, .68 + .22 * Math.sin(time * 12), strike); return true;
  }
  const r = z.radius, n = Math.min(C.maxFieldMarks, p.count), phase = time * 1.3;
  const seed = ((z.pos.x * 13 + z.pos.y * 7) | 0) >>> 0;
  ctx.save(); clipSkillField(ctx, z); ctx.translate(z.pos.x, z.pos.y); ctx.rotate(z.facing);
  ctx.lineWidth = Math.max(.65, Math.min(2, r * .014)); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const alpha = (z.exploded ? C.fieldAlpha : .26) * (0.85 + .15 * Math.sin(phase * 2));
  ctx.strokeStyle = withAlpha(z.color, alpha * .52); ctx.fillStyle = withAlpha(z.color, alpha * .6);
  // Continuous scaffolds give fields a readable structure even at a distance.
  for (let i = 0; i < n; i++) {
    const a = i * TAU / n, wave = (Math.sin(phase + i) + 1) / 2;
    ctx.beginPath();
    if (p.layout === 'roots') {
      ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - .2) * r * .38, Math.sin(a - .2) * r * .38);
      ctx.lineTo(Math.cos(a + .1) * r * .63, Math.sin(a + .1) * r * .63);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    } else if (p.layout === 'rings') {
      const rr = r * (.25 + i / n * .7 + .025 * wave);
      ctx.arc(0, 0, rr, a + phase * .2, a + phase * .2 + Math.PI * 1.3);
    } else if (p.layout === 'lattice') {
      const q = -r + (i + .5) * 2 * r / n;
      ctx.moveTo(q, -r); ctx.lineTo(q, r); ctx.moveTo(-r, q); ctx.lineTo(r, q);
    } else if (p.layout === 'spiral') {
      for (let k = 0; k <= 10; k++) {
        const u = k / 10, b = a + u * 2 + phase * (p.motion === 'in' ? -.2 : .2);
        const x = Math.cos(b) * r * u, y = Math.sin(b) * r * u;
        if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
    } else if (p.layout === 'spokes') {
      ctx.moveTo(Math.cos(a) * r * .24, Math.sin(a) * r * .24);
      ctx.lineTo(Math.cos(a) * r * .96, Math.sin(a) * r * .96);
    } else {
      const x = (hash01(seed, i * 31) - .5) * r * 1.8, y = (hash01(seed, i * 47 + 9) - .5) * r * 1.8;
      ctx.ellipse(x, y, r * (.09 + wave * .035), r * .06, a, 0, TAU);
    }
    ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    const u = (time * .23 + i / n) % 1;
    const orbit = p.motion === 'orbit' ? phase * .5 : 0;
    const a = i * TAU / n + orbit;
    const travel = p.motion === 'out' ? u : p.motion === 'in' ? 1 - u : .7;
    const distance = r * (.2 + travel * .68);
    let x = Math.cos(a) * distance, y = Math.sin(a) * distance;
    if (p.layout === 'scatter' || p.layout === 'lattice') {
      x = (hash01(seed, i * 71) - .5) * r * 1.7;
      y = (hash01(seed, i * 97 + 5) - .5) * r * 1.7;
    }
    if (p.motion === 'rise') y -= (u - .5) * r * .3;
    if (z.seg) {
      const s = z.seg, dx = s.bx - s.ax, dy = s.by - s.ay;
      // Segment coordinates are transformed into the same faced frame.
      const wx = s.ax + dx * (i + .5) / n - z.pos.x, wy = s.ay + dy * (i + .5) / n - z.pos.y;
      x = wx * Math.cos(z.facing) + wy * Math.sin(z.facing);
      y = -wx * Math.sin(z.facing) + wy * Math.cos(z.facing);
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(p.layout === 'lattice' ? 0 : a);
    const fade = p.motion === 'out' || p.motion === 'in' || p.motion === 'rise' ? Math.sin(u * Math.PI) : .85;
    ctx.strokeStyle = withAlpha(shade(z.color, .58), alpha * fade);
    ctx.fillStyle = withAlpha(shade(z.color, .2), alpha * fade * .8);
    const size = Math.min(14, r * .1) * (p.motion === 'breathe' ? .85 + .15 * Math.sin(phase + i) : 1);
    drawSkillMark(ctx, i % 3 === 2 && p.echo ? p.echo : p.motif, size, u);
    ctx.restore();
  }
  ctx.restore(); return true;
}

export function drawSkillBeam(ctx: CanvasRenderingContext2D, f: EffectVoiceFlash, t: number,
  kind: typeof SKILL_BEAMS[keyof typeof SKILL_BEAMS]): void {
  if (f.radius <= 0 || t <= 0 || !Number.isFinite(f.radius + f.pos.x + f.pos.y + t)) return;
  const len = f.radius, age = 1 - t;
  ctx.save(); ctx.translate(f.pos.x, f.pos.y); ctx.rotate(f.facing ?? 0);
  // Both the tapered cone and the wall-clipped endpoint constrain all ink.
  const half = Math.min(.45, (f.arc?.arcRad ?? .08) / 2);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, len, -half, half); ctx.closePath(); ctx.clip();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = withAlpha(f.color, .4 * t); ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
  ctx.strokeStyle = withAlpha(shade(f.color, .7), .9 * t); ctx.fillStyle = withAlpha(f.color, .7 * t); ctx.lineWidth = 1.6;
  const width = (x: number) => Math.min(12, x * Math.sin(half) * .7);
  if (kind === 'lance') {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len * .78, -width(len * .78) * .35);
    ctx.lineTo(len, 0); ctx.lineTo(len * .78, width(len * .78) * .35); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (kind === 'braid') {
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 32; i++) { const x = len * i / 32, y = Math.sin(i / 32 * TAU * 3 - age * 8) * width(x) * sign;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
    }
  } else if (kind === 'fault') {
    ctx.beginPath(); ctx.moveTo(0, 0);
    for (let i = 1; i <= 16; i++) { const x = len * i / 16;
      ctx.lineTo(x, Math.sin(i * 7.7) * width(x) * .8); } ctx.stroke();
  } else {
    const count = kind === 'eye' ? 5 : kind === 'prism' ? 7 : 11;
    for (let i = 0; i < count; i++) {
      const q = (i + .5) / count, x = len * q, w = width(x), s = Math.min(len / count * .35, 14);
      ctx.save(); ctx.translate(x, 0);
      if (kind === 'prism') ctx.scale(1, .75 + .25 * Math.sin(age * 10 - i));
      ctx.beginPath();
      if (kind === 'eye') {
        ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -w * 2, s, 0); ctx.quadraticCurveTo(0, w * 2, -s, 0);
        ctx.moveTo(0, -w * .55); ctx.lineTo(0, w * .55);
      } else if (kind === 'prism') {
        ctx.moveTo(-s, 0); ctx.lineTo(0, -w); ctx.lineTo(s, 0); ctx.lineTo(0, w); ctx.closePath();
      } else {
        ctx.moveTo(-s, -w); ctx.lineTo(s, -w * .5); ctx.lineTo(s, w * .5); ctx.lineTo(-s, w);
      }
      ctx.stroke(); ctx.restore();
    }
  }
  // Moving focus has a distinct cadence but never extends the reach.
  const x = len * Math.min(.97, age * 1.5);
  ctx.beginPath(); ctx.ellipse(x, 0, 2, Math.max(.1, width(x)), 0, 0, TAU); ctx.stroke();
  ctx.restore();
}
for (const [id, kind] of Object.entries(SKILL_BEAMS))
  registerEffectVoice(skillBeamVoice(id)!, (ctx, f, t) => drawSkillBeam(ctx, f, t, kind));
