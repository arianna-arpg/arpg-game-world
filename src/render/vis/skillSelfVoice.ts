import { SKILL_SELFS, SELF_VISUAL_STYLE as C, selfProfile, skillSelfVoice, type SelfProfile, type SelfPhase } from '../../data/skillSelfVisuals';
import { registerEffectVoice, type EffectVoiceFlash } from './effectVoice';
import { traceFlashFigure } from './aoeTrace';
import { drawSkillMark } from './skillBurstVoice';
import type { SelfBankCue } from '../../engine/skillSelfVisual';

const TAU = Math.PI * 2;
/** Body-sized silhouettes; no complete AOE border on a non-damaging cast. */
function figure(ctx: CanvasRenderingContext2D, p: SelfProfile, q: number): void {
  const line = (...v: number[]) => { ctx.moveTo(v[0], v[1]); for (let i = 2; i < v.length; i += 2) ctx.lineTo(v[i], v[i + 1]); };
  ctx.beginPath();
  switch (p.form) {
    case 'plate':
      for (const s of [-1, 1]) line(s * (.32 + q * .23), -.72, s * (.63 + q * .15), -.42, s * (.63 + q * .15), .38, s * .15, .8);
      line(-.32, -.72, .32, -.72); break;
    case 'veil':
      for (const s of [-1, 1]) { ctx.moveTo(s * (.15 + q * .4), -.8); ctx.bezierCurveTo(s * 1.3, -.2, s * -.3, .35, s * (.3 + q * .5), .75); } break;
    case 'horn':
      line(-.8, -.18, -.25, -.18, .72, -.65, .72, .65, -.25, .18, -.8, .18);
      for (let i = 0; i < 2; i++) { ctx.moveTo(.8 + i * .13, -.32 - q * .12); ctx.quadraticCurveTo(1.05 + i * .12, 0, .8 + i * .13, .32 + q * .12); } break;
    case 'vial':
      line(-.2, -.85, .2, -.85, .2, -.4, .52, -.05, .45, .7, -.45, .7, -.52, -.05, -.2, -.4, -.2, -.85);
      line(-.4, .3 - q * .25, .4, .3 - q * .25); break;
    case 'crown': line(-.85, -.5, -.6, .5, .6, .5, .85, -.5, .3, -.1, 0, -.85, -.3, -.1, -.85, -.5); break;
    case 'coil':
      for (const s of [-1, 1]) { ctx.moveTo(-.85, s * .2); ctx.bezierCurveTo(-.25, s * (1 + q * .2), .25, -s, .85, -s * .2); } break;
    case 'claw':
      for (let i = -1; i <= 1; i++) { ctx.moveTo(-.55 + i * .38, -.65); ctx.quadraticCurveTo(.3 + i * .32, -.25, -.05 + i * .32, .7); } break;
    case 'wing':
      for (const s of [-1, 1]) { line(0, .55, s * .4, -.3, s * .9, -.75, s * .66, .2, s * .28, .4); line(s * .9, -.75, s * .18, .65); } break;
    case 'book':
      for (const s of [-1, 1]) line(0, -.45, s * .68, -.7, s * .8, .55, 0, .75, 0, -.45);
      for (const s of [-1, 1]) line(s * .15, -.1, s * .48, -.2); break;
    case 'gear':
      for (let i = 0; i < p.count; i++) { const a = i * TAU / p.count; ctx.save(); ctx.rotate(a); line(.3, -.17, .72, -.17, .9, 0, .72, .17, .3, .17); ctx.restore(); }
      line(0, -.42, 0, 0, .3, .18); break;
    case 'gate':
      for (const s of [-1, 1]) line(s * (.25 + q * .4), .75, s * (.25 + q * .4), -.4, 0, -.85);
      line(-.8, .85, -.35, .85); line(.35, .85, .8, .85); break;
    case 'fuse':
      line(-.45, -.15, -.45, .5, 0, .75, .45, .5, .45, -.15, -.45, -.15);
      line(0, -.15, 0, -.42, .28, -.55, .1, -.8);
      for (const s of [-1, 1]) line(s * .15, .08, s * .28, .27, s * .08, .46); break;
    case 'crystal':
      line(0, -.95, .5, -.25, .35, .45, 0, .8, -.35, .45, -.5, -.25, 0, -.95);
      line(0, -.95, 0, .8); line(-.5, -.25, .5, -.25); break;
    case 'breath':
      for (let i = -1; i <= 1; i++) { ctx.moveTo(-.7, i * .37); ctx.bezierCurveTo(-.1, i * .37 - .5, .2, i * .37 + .5, .85, i * .37 - q * .15); } break;
  }
  ctx.stroke();
}

/** q is real preparation completion or release age. The held silhouette
 * locks at full completion; its motion never wraps and pretends to refill. */
export function drawSelfGlyph(ctx: CanvasRenderingContext2D, p: SelfProfile, radius: number, color: string, q: number, held = false): void {
  q = Math.max(0, Math.min(1, q));
  const r = Math.max(.01, radius), spread = held ? 1 - .28 * q : .68 + .26 * Math.sin(q * Math.PI / 2);
  const turn = p.motion === 'twist' ? (held ? 1 - q : q) * .8 : 0;
  ctx.save(); ctx.rotate(turn);
  if (!held && p.motion === 'rise') ctx.translate(0, -r * .18 * q);
  if (p.form === 'vial') ctx.rotate(held ? -.3 * q : -.7 * Math.sin(q * Math.PI));
  // Matching dark under-stroke survives both bright floors and shared tints.
  for (const outline of [true, false]) {
    ctx.save(); ctx.scale(r * .64 * spread, r * .64 * spread);
    ctx.strokeStyle = outline ? C.outline : color; ctx.lineWidth = (outline ? 4 : 1.6) / (r * .64 * spread);
    figure(ctx, p, held ? q : 1 - q); ctx.restore();
  }
  for (let i = 0; i < p.count; i++) {
    const fan = p.form === 'horn' || p.form === 'wing';
    const a = fan ? -.9 + 1.8 * i / Math.max(1, p.count - 1) : i * TAU / p.count - Math.PI / 2;
    const radial = r * (held ? .94 - .32 * q : .48 + .4 * q);
    ctx.save(); ctx.translate(Math.cos(a) * radial, Math.sin(a) * radial); ctx.rotate(a + Math.PI / 2);
    const size = Math.min(5, r * .115) * (held ? .55 + .45 * q : 1 - .25 * q);
    ctx.strokeStyle = C.outline; ctx.fillStyle = C.outline; ctx.lineWidth = 3.4; drawSkillMark(ctx, p.motif, size, q);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.3; drawSkillMark(ctx, p.motif, size, q);
    if (p.motion === 'snap') { ctx.beginPath(); ctx.moveTo(0, size + 2); ctx.lineTo(0, size + 2 + r * .13 * (held ? 1 - q : q)); ctx.stroke(); }
    ctx.restore();
  }
  ctx.restore();
}

export function drawSelfMoment(ctx: CanvasRenderingContext2D, f: EffectVoiceFlash, life: number, p: SelfProfile, phase: SelfPhase): void {
  if (!(f.radius > 0 && life > 0) || !Number.isFinite(f.radius + f.pos.x + f.pos.y + life)) return;
  const k = Math.max(0, Math.min(1, 1 - life));
  ctx.save(); ctx.beginPath(); traceFlashFigure(ctx, f); ctx.clip();
  if (f.edgeFrac && f.edgeFrac > 0) {
    ctx.beginPath(); ctx.rect(f.pos.x - f.radius * 3, f.pos.y - f.radius * 3, f.radius * 6, f.radius * 6);
    ctx.arc(f.pos.x, f.pos.y, f.radius * Math.min(1, f.edgeFrac), 0, TAU, true); ctx.clip('evenodd');
  }
  ctx.translate(f.pos.x, f.pos.y); ctx.globalAlpha *= phase === 'prepare' ? .8 : Math.min(1, life * 3);
  if (phase === 'burst') {
    // Radial teeth are clipped to the actual hit figure. A compact center
    // keeps the source recognizable even when Widening makes the blast huge.
    for (let i = 0; i < p.count; i++) {
      const a = i * TAU / p.count, r = f.radius * (.32 + .6 * Math.sqrt(k));
      ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(r * .5, -4); ctx.lineTo(r, 0); ctx.lineTo(r * .66, 5);
      ctx.strokeStyle = C.outline; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = f.color; ctx.lineWidth = 1.8; ctx.stroke(); ctx.restore();
    }
  }
  const held = phase === 'prepare' || phase === 'depart';
  if (phase === 'recall') ctx.rotate(Math.PI);
  drawSelfGlyph(ctx, p, Math.min(f.radius * .88, phase === 'burst' ? 48 : 62), f.color, k, held);
  ctx.restore();
}

/** Stable persistent home rune, painted through the existing visibility and
 * co-op mark surface. The three teeth match placement and recall. */
export function drawRecallMark(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
  const p = selfProfile('mark'); if (!p) return;
  ctx.save(); ctx.translate(x, y); drawSelfGlyph(ctx, p, radius, color, 1, true); ctx.restore();
}
/** Quiet rear-body reads distinguish banked power from front-facing casting. */
export function drawSelfBanks(ctx: CanvasRenderingContext2D, rows: readonly SelfBankCue[], radius: number): void {
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    const row = rows[i], p = selfProfile(row.skillId); if (!p) continue;
    ctx.save(); ctx.translate(-radius - 17, (i - (rows.length - 1) / 2) * 26); ctx.globalAlpha *= .7;
    drawSelfGlyph(ctx, p, 14, row.color, row.fill, true); ctx.restore();
  }
}
for (const [id, p] of Object.entries(SKILL_SELFS)) for (const phase of ['release', 'prepare', 'recall', 'depart', 'burst'] as const)
  registerEffectVoice(skillSelfVoice(id, phase)!, (ctx, f, life) => drawSelfMoment(ctx, f, life, p, phase));
