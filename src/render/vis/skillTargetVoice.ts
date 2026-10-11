import { SKILL_TARGETS, SKILL_RITES, TARGET_VISUAL_STYLE as C, skillTargetProfile, skillTetherProfile,
  type TargetSeal, type SkillTargetProfile } from '../../data/skillTargetVisuals';
import type { SkillTetherVisual } from '../../engine/skillTetherVisual';
import { registerEffectVoice, type EffectVoiceFlash } from './effectVoice';
import { drawSkillMark } from './skillBurstVoice';
import type { BurstMotif } from '../../data/skillVisuals';
const TAU = Math.PI * 2;

/** Compact center glyphs deliberately avoid complete circular AOE borders. */
export function drawTargetSeal(ctx: CanvasRenderingContext2D, seal: TargetSeal, size: number, progress: number): void {
  ctx.save(); ctx.scale(size, size); ctx.lineWidth /= size; ctx.beginPath();
  const line = (...v: number[]) => { ctx.moveTo(v[0], v[1]); for (let i = 2; i < v.length; i += 2) ctx.lineTo(v[i], v[i + 1]); };
  switch (seal) {
    case 'maw': for (const s of [-1, 1]) { ctx.moveTo(-1, s * .1); ctx.quadraticCurveTo(0, s * 1.7, 1, s * .1); for (let i = -1; i <= 1; i++) line(i * .5 - .15, s * .65, i * .5, s * .3, i * .5 + .15, s * .65); } break;
    case 'fangs': for (const s of [-1, 1]) line(s, -.8, s * .7, .6, s * .2, -.35); break;
    case 'brand': line(-.8, .6, 0, 1, .8, .6); line(-.65, .2, -.2, -.4, 0, -1.1, .25, -.3, .65, .2); break;
    case 'palms': for (const s of [-1, 1]) { ctx.moveTo(s, -.8); ctx.bezierCurveTo(s * 1.2, .1, s * .8, .9, s * .15, .65); line(s * .15, .65, s * .45, 0); } break;
    case 'chalice': line(-.85, -.8, -.5, .3, .5, .3, .85, -.8); line(0, .3, 0, .9); line(-.6, .9, .6, .9); break;
    case 'sprout': line(0, 1, 0, -.6); ctx.moveTo(0, .1); ctx.quadraticCurveTo(-1.4, -.2, -.7, -.8); ctx.quadraticCurveTo(-.1, -.7, 0, .1); ctx.moveTo(0, -.3); ctx.quadraticCurveTo(.5, -1.2, 1, -.8); ctx.quadraticCurveTo(1, -.2, 0, -.3); break;
    case 'crown': line(-1, -.6, -.65, .7, .65, .7, 1, -.6, .35, -.05, 0, -1, -.35, -.05, -1, -.6); break;
    case 'knot': line(-1, 0, -.3, -.65, .5, .2, 1, -.3); line(-1, .3, -.5, -.2, .3, .65, 1, 0); break;
    case 'wound': for (let i = -1; i <= 1; i++) line(i * .55 - .35, -.9, i * .55 + .1, -.1, i * .55 - .15, .9); break;
    case 'cage': for (const s of [-1, 1]) line(s * .45, -1, s, -.5, s, .5, s * .45, 1); line(-.4, -.4, .4, .4); line(.4, -.4, -.4, .4); break;
    case 'star': for (let i = 0; i < 6; i++) { const a = i * TAU / 6; line(Math.cos(a) * .3, Math.sin(a) * .3, Math.cos(a), Math.sin(a)); } break;
    case 'eye': ctx.moveTo(-1.2, 0); ctx.quadraticCurveTo(0, -1, 1.2, 0); ctx.quadraticCurveTo(0, 1, -1.2, 0); line(0, -.4, 0, .4); break;
    case 'hourglass': line(-.75, -1, .75, -1, -.65, 1, .65, 1, -.75, -1); break;
    case 'stitch': line(-1, -.25, 1, .25); for (let i = -1; i <= 1; i++) line(i * .6 - .1, -.6, i * .6 + .1, .6); break;
    case 'wave': for (let i = -1; i <= 1; i++) { ctx.moveTo(-1, i * .5); ctx.bezierCurveTo(-.35, i * .5 - .45, .35, i * .5 + .45, 1, i * .5); } break;
    case 'spiral': for (let i = 0; i <= 36; i++) { const a = i / 36 * TAU * 1.6, r = .15 + i / 42; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); } break;
    case 'web': for (let i = 0; i < 5; i++) { const a = i * TAU / 5; line(0, 0, Math.cos(a), Math.sin(a)); } for (const r of [.5, 1]) { for (let i = 0; i <= 5; i++) { const a = i * TAU / 5; if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } } break;
    case 'horn': line(-1, -.6, -.35, -.4, .9, -1, .9, 1, -.35, .4, -1, .6); break;
    case 'bones': for (const s of [-1, 1]) { line(-.7, s * .75, .7, -s * .75); for (const x of [-1, 1]) { ctx.moveTo(x * .7 + .18, -s * x * .75); ctx.arc(x * .7, -s * x * .75, .18, 0, TAU); } } break;
  }
  ctx.stroke(); ctx.restore();
}

function drawArrivalMark(ctx: CanvasRenderingContext2D, motif: BurstMotif, size: number, age: number): void {
  ctx.save(); ctx.strokeStyle = C.outline; ctx.fillStyle = C.outline; ctx.lineWidth += 2;
  ctx.scale(1.18, 1.18); drawSkillMark(ctx, motif, size, age); ctx.restore();
  drawSkillMark(ctx, motif, size, age);
}

export function drawSkillTarget(ctx: CanvasRenderingContext2D, f: EffectVoiceFlash, life: number, p: SkillTargetProfile, splash = false): void {
  const age = Math.max(0, Math.min(1, 1 - life)), radius = Math.max(0, f.radius);
  if (!(radius > 0) || !Number.isFinite(radius + f.pos.x + f.pos.y)) return;
  ctx.save(); ctx.translate(f.pos.x, f.pos.y); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.clip();
  ctx.globalAlpha *= Math.sin(Math.PI * Math.min(.98, .12 + age * .88)) * C.ink;
  ctx.strokeStyle = f.color; ctx.fillStyle = f.color; ctx.lineWidth = 1.6;
  if (splash) { ctx.save(); ctx.globalAlpha *= .4; ctx.beginPath(); ctx.arc(0, 0, Math.max(0, radius - 1), 0, TAU); ctx.stroke(); ctx.restore(); }
  const reach = Math.min(radius * .65, 26), spin = p.motion === 'orbit' ? age * 1.6 : p.motion === 'reverse' ? -age * 2.5 : 0;
  ctx.save(); ctx.rotate(spin * .45); const scale = p.motion === 'close' ? 1.25 - age * .45 : .75 + age * .35;
  // Small dark duplicate under the glyph keeps it readable on pale terrain.
  ctx.strokeStyle = C.outline; ctx.lineWidth = 4; drawTargetSeal(ctx, p.seal, reach * .57 * scale, age);
  ctx.strokeStyle = f.color; ctx.lineWidth = 1.7; drawTargetSeal(ctx, p.seal, reach * .57 * scale, age); ctx.restore();
  const n = Math.min(C.maxMarks, p.count);
  for (let i = 0; i < n; i++) {
    const a = i * TAU / n + spin - Math.PI / 2;
    const r = p.motion === 'close' ? reach * (1.45 - age * .65) : p.motion === 'open' ? reach * (.7 + age * .8) : reach;
    ctx.save(); ctx.translate(Math.cos(a) * r, Math.sin(a) * r - (p.motion === 'rise' ? age * reach * .5 : 0));
    ctx.rotate(a + (p.motion === 'close' ? Math.PI : 0));
    drawArrivalMark(ctx, p.motif, Math.min(5, reach * .17), age); ctx.restore();
  }
  if (p.echo) { ctx.save(); ctx.rotate(-spin); drawArrivalMark(ctx, p.echo, reach * .24, age); ctx.restore(); }
  ctx.restore();
}

/** All moving detail is clipped to the real straight capsule. A coiled
 * pattern must never suggest that the actual damaging band bends with it. */
export function drawSkillTether(ctx: CanvasRenderingContext2D, row: SkillTetherVisual, time: number): void {
  const dx = row.bx - row.ax, dy = row.by - row.ay, length = Math.hypot(dx, dy), w = Math.max(0, row.width);
  if (!(length > .1 && w > 0 && row.fade > 0) || !Number.isFinite(length + w + time + row.age)) return;
  const p = skillTetherProfile(row.voice), phase = time * p.direction * 2;
  const amp = Math.min(w * .45, 6), segments = Math.min(C.tetherSegments,
    p.strand === 'lightning' ? Math.max(p.beats * 3, Math.ceil(length / 22)) : Math.max(4, Math.ceil(length / 9)));
  ctx.save(); ctx.translate(row.ax, row.ay); ctx.rotate(Math.atan2(dy, dx));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(0, -w); ctx.lineTo(length, -w); ctx.arc(length, 0, w, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(0, w); ctx.arc(0, 0, w, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.clip();
  ctx.globalAlpha *= row.fade * Math.min(1, .35 + row.age * 5);
  ctx.save(); ctx.globalAlpha *= .12; ctx.strokeStyle = row.color; ctx.lineWidth = w * 2;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(length, 0); ctx.stroke(); ctx.restore();
  // Quiet parallel edges disclose the tested band independently of its material.
  ctx.save(); ctx.strokeStyle = row.color; ctx.globalAlpha *= .24; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, -w + .6); ctx.lineTo(length, -w + .6); ctx.moveTo(0, w - .6); ctx.lineTo(length, w - .6); ctx.stroke(); ctx.restore();
  ctx.strokeStyle = row.color; ctx.fillStyle = row.color; ctx.lineWidth = 1.3;
  for (const side of p.strand === 'braid' || p.strand === 'ladder' ? [-1, 1] : [1]) {
    ctx.beginPath();
    for (let j = 0; j <= segments; j++) {
      const x = j / segments * length;
      const wave = p.strand === 'lightning' ? (j % 2 ? -1 : 1) * (.45 + .55 * Math.abs(Math.sin(phase + j / segments * TAU * p.beats)))
        : p.strand === 'barbs' ? 0 : Math.sin(j / segments * TAU * p.beats - phase);
      const y = wave * amp * side;
      if (!j) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.save(); ctx.strokeStyle = C.outline; ctx.lineWidth = 3.3; ctx.stroke(); ctx.restore(); ctx.stroke();
  }
  const count = Math.min(C.tetherMarks, Math.max(2, Math.ceil(length / 34)));
  for (let i = 0; i < count; i++) {
    const q = ((i / count + phase * .08) % 1 + 1) % 1, x = q * length;
    ctx.save(); ctx.translate(x, 0);
    if (p.strand === 'barbs' || p.strand === 'ladder') { ctx.beginPath(); ctx.moveTo(-3, -amp); ctx.lineTo(3, amp); ctx.stroke(); }
    else if (p.strand === 'chain') drawTargetSeal(ctx, 'knot', Math.max(1, amp), q);
    else { ctx.rotate(p.direction < 0 ? Math.PI : 0); drawSkillMark(ctx, p.motif, Math.max(1, amp * .75), q); }
    ctx.restore();
  }
  const source = row.skillId ? skillTargetProfile(row.skillId) : undefined;
  for (const x of [0, length]) {
    ctx.save(); ctx.translate(x, 0);
    ctx.save(); ctx.strokeStyle = C.outline; ctx.lineWidth = 3.3; drawTargetSeal(ctx, source?.seal ?? p.anchor, w * .58, row.age); ctx.restore();
    drawTargetSeal(ctx, source?.seal ?? p.anchor, w * .58, row.age); ctx.restore();
  }
  ctx.restore();
}
for (const [id, p] of Object.entries(SKILL_TARGETS)) {
  registerEffectVoice('skillTarget:' + id, (ctx, f, t) => drawSkillTarget(ctx, f, t, p));
  registerEffectVoice('skillTargetSplash:' + id, (ctx, f, t) => drawSkillTarget(ctx, f, t, p, true));
}
for (const [id, p] of Object.entries(SKILL_RITES)) registerEffectVoice('skillRite:' + id, (ctx, f, t) => drawSkillTarget(ctx, f, t, p));
