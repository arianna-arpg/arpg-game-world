import { SKILL_PRESENCES, PRESENCE_STYLE as C, presenceProfile, skillPresenceVoice, type PresenceProfile, type PresencePhase, type PresenceBadge } from '../../data/skillPresenceVisuals';
import type { SkillFieldVisual } from '../../engine/skillFieldVisual';
import { registerEffectVoice, type EffectVoiceFlash } from './effectVoice';
import { traceFlashFigure } from './aoeTrace';
import { drawSkillMark } from './skillBurstVoice';

const TAU = Math.PI * 2;
/** Unit silhouettes. These are source signatures, not creature replacements. */
function figure(ctx: CanvasRenderingContext2D, p: PresenceProfile, q: number): void {
  const line = (...v: number[]) => { ctx.moveTo(v[0], v[1]); for (let i = 2; i < v.length; i += 2) ctx.lineTo(v[i], v[i + 1]); };
  ctx.beginPath();
  switch (p.form) {
    case 'shafts':
      for (let i = -1; i <= 1; i++) { const x = i * .48, y = Math.abs(i) * -.23; line(x, -.85 + y, x, .65 + y, x - .18, .42 + y); line(x, .65 + y, x + .18, .42 + y); line(x - .1, -.6 + y, x, -.42 + y, x + .1, -.6 + y); } break;
    case 'meteor':
      line(-.6, -.9, -.3, .2, .1, .7, .58, .35, .45, -.1, -.6, -.9);
      line(-.1, -.95, .25, -.35); line(-.85, -.4, -.5, .3); line(-.3, .2, .15, .17, .1, .7); break;
    case 'thunder':
      line(.25, -.95, -.28, -.2, .2, -.28, -.25, .9);
      line(-.08, -.47, -.55, -.35, -.38, -.04, -.8, .3); line(.05, .1, .5, -.05, .36, .4, .78, .65); break;
    case 'hail':
      for (const i of [-1, 0, 1]) { const x = i * .5, y = Math.abs(i) * .2; line(x, -.9 + y, x + .21, -.25 + y, x, .7 + y, x - .21, -.25 + y, x, -.9 + y); line(x - .21, -.25 + y, x + .21, -.25 + y); } break;
    case 'vent':
      for (const s of [-1, 1]) { ctx.moveTo(s * .65, .6); ctx.bezierCurveTo(s * -.25, .05, s * 1, -.25, s * (.3 + q * .22), -.9); }
      ctx.moveTo(-.8, .72); ctx.quadraticCurveTo(0, .2, .8, .72); line(0, .2, 0, -.5); break;
    case 'grasp':
      for (let i = -1; i <= 1; i++) { ctx.moveTo(i * .2, .65); ctx.quadraticCurveTo(i * .85, .05, i * .65 + .16, -.72); line(i * .65 + .16, -.72, i * .65 -.1, -.44); } break;
    case 'ribs':
      line(0, -.85, 0, .85);
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { ctx.moveTo(0, -.55 + i * .38); ctx.bezierCurveTo(s * .85, -.9 + i * .4, s * .8, -.12 + i * .4, s * .2, -.05 + i * .4); } break;
    case 'golem':
      line(-.35, -.65, 0, -.9, .35, -.65, .3, -.35, -.3, -.35, -.35, -.65);
      line(-.6, -.18, .6, -.18, .45, .5, 0, .7, -.45, .5, -.6, -.18);
      for (const s of [-1, 1]) { line(s * .7, -.25, s * .94, .3, s * .65, .4); line(s * .18, .62, s * .36, .92); } break;
    case 'wings':
      for (const s of [-1, 1]) { line(0, .6, s * .25, -.3, s * .94, -.75, s * .74, .08, s * .45, -.03, s * .35, .4, 0, .6); } break;
    case 'wisp':
      ctx.moveTo(0, -.85); ctx.bezierCurveTo(1.1, -.1, .25, .3, .55, .9); ctx.bezierCurveTo(-.5, .5, -.95, -.1, 0, -.85);
      ctx.moveTo(.02, -.3); ctx.quadraticCurveTo(.3, 0, 0, .3); break;
    case 'swarm':
      for (let i = 0; i < p.count; i++) { const a = i * TAU / p.count; ctx.save(); ctx.rotate(a); line(.2, 0, .58, -.23, .88, 0, .58, .23, .2, 0); ctx.restore(); } break;
    case 'egg':
      ctx.moveTo(0, -.9); ctx.bezierCurveTo(1, -.4, .9, .8, 0, .8); ctx.bezierCurveTo(-.9, .8, -1, -.4, 0, -.9);
      line(-.1, -.7, .18, -.3, -.12, .05, .22, .34, -.05, .68); break;
    case 'maw':
      for (const s of [-1, 1]) { line(-.8, 0, -.55, s * .6, .35, s * .7, .85, 0); for (let i = 0; i < 3; i++) line(-.5 + i * .4, s * .58, -.32 + i * .4, s * .2, -.2 + i * .4, s * .61); } break;
    case 'effigy':
      line(0, -.5, 0, .75); line(-.86, -.25, 0, -.05, .86, -.25); line(-.5, .83, 0, .1, .5, .83);
      line(0, -.96, .28, -.7, 0, -.45, -.28, -.7, 0, -.96); break;
    case 'portal':
      for (const s of [-1, 1]) { ctx.moveTo(s * .18, .85); ctx.bezierCurveTo(s * 1.15, .4, s * .55, -.7, 0, -.92); line(s * .26, .5, s * .45, .12, s * .3, -.4); } break;
    case 'pylon':
      line(0, -.9, .35, -.45, 0, -.08, -.35, -.45, 0, -.9); line(0, -.08, 0, .55);
      line(-.6, .8, -.4, .35, .4, .35, .6, .8, -.6, .8); line(-.65, -.32, -.55, .05, -.22, .2); line(.65, -.32, .55, .05, .22, .2); break;
    case 'ballista':
      line(0, .8, 0, -.88, -.16, -.6); line(0, -.88, .16, -.6);
      ctx.moveTo(-.9, -.45); ctx.quadraticCurveTo(0, .48, .9, -.45); line(-.9, -.45, 0, .55, .9, -.45); line(-.48, .88, 0, .35, .48, .88); break;
    case 'trap':
      for (const s of [-1, 1]) { line(-.85, s * .15, -.55, s * .7, .55, s * .7, .85, s * .15); for (let i = -1; i <= 1; i++) line(i * .4 - .1, s * .6, i * .4, s * .27, i * .4 + .1, s * .6); } break;
    case 'rampart':
      line(-.9, .7, -.9, -.55, -.6, -.55, -.6, -.18, -.18, -.18, -.18, -.8, .18, -.8, .18, -.18, .6, -.18, .6, -.55, .9, -.55, .9, .7, -.9, .7);
      line(-.8, .3, .8, .3); line(0, .3, 0, .7); break;
    case 'bough':
      line(0, .9, 0, -.9); for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const y = .45 - i * .43; line(0, y, s * (.8 - i * .18), y - .26, s * (.57 - i * .16), y - .52, 0, y - .18); } break;
    case 'bell':
      ctx.moveTo(-.72, .45); ctx.bezierCurveTo(-.25, .22, -.6, -.75, 0, -.75); ctx.bezierCurveTo(.6, -.75, .25, .22, .72, .45); line(.72, .45, -.72, .45); line(0, .45, .18 * Math.sin(q * Math.PI), .86);
      ctx.moveTo(-.9, .58); ctx.quadraticCurveTo(0, 1.03, .9, .58); break;
    case 'banner':
      line(-.4, .9, -.4, -.94, .7, -.68, .45, -.28, .75, .1, -.4, -.05); line(-.7, .9, -.1, .9); break;
    case 'orb':
      ctx.ellipse(0, 0, .7, .7, 0, 0, TAU); ctx.ellipse(0, 0, .94, .26, -.5, 0, TAU); line(0, -.95, 0, -.75); line(0, .75, 0, .95); break;
    case 'vortex':
      for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate(i * TAU / 3); ctx.moveTo(.12, 0); ctx.bezierCurveTo(.3, -.6, .95, -.6, .8, .35); ctx.restore(); } break;
  }
  ctx.stroke();
}

export function drawPresenceGlyph(ctx: CanvasRenderingContext2D, p: PresenceProfile, radius: number, color: string, age: number, phase: PresencePhase | 'idle'): void {
  const q = Math.max(0, Math.min(1, age)), end = phase === 'expire' || phase === 'break';
  const travel = phase === 'arrive' ? 1 - q : end ? q : phase === 'idle' ? 0 : Math.sin(q * Math.PI);
  const scale = phase === 'arrive' ? .58 + .42 * Math.sqrt(q) : phase === 'expire' ? 1 - .55 * q : 1 + .08 * travel;
  const r = Math.max(.01, radius), core = r * .58 * scale;
  ctx.save();
  if (p.motion === 'coil') ctx.rotate(travel * .7);
  if (p.motion === 'fall' || p.motion === 'rise') ctx.translate(0, (p.motion === 'fall' ? -1 : 1) * r * .12 * travel);
  // Breaking scatters the signature; expiration folds it into fine remnants.
  if (phase === 'break') ctx.rotate(q * .4);
  for (const outline of [true, false]) {
    ctx.save(); ctx.scale(core, core); ctx.strokeStyle = outline ? C.outline : color;
    ctx.lineWidth = (outline ? 4 : 1.6) / core;
    if (end) ctx.setLineDash([.23, .08 + q * .4]);
    figure(ctx, p, q); ctx.restore();
  }
  for (let i = 0; i < p.count; i++) {
    const a = i * TAU / p.count - Math.PI / 2;
    const distance = r * (phase === 'arrive' ? .87 - q * .17 : end ? .7 + q * .17 : .7 + travel * .12);
    ctx.save(); ctx.translate(Math.cos(a) * distance, Math.sin(a) * distance); ctx.rotate(a + Math.PI / 2);
    const size = Math.min(6, r * .11) * (end ? 1 - q * .6 : .75 + .25 * q);
    for (const outline of [true, false]) {
      ctx.strokeStyle = ctx.fillStyle = outline ? C.outline : color; ctx.lineWidth = outline ? 3.4 : 1.3;
      // Filled motifs need a slightly larger dark silhouette too; drawing
      // the same filled shape twice would erase its bright-floor outline.
      drawSkillMark(ctx, p.motif, size + (outline ? .9 : 0), q);
      if (p.motion === 'split' || p.motion === 'fall') { ctx.beginPath(); ctx.moveTo(0, size + 1); ctx.lineTo(0, size + 1 + r * .1 * travel); ctx.stroke(); }
    }
    ctx.restore();
  }
  ctx.restore();
}

export function drawPresenceMoment(ctx: CanvasRenderingContext2D, f: EffectVoiceFlash, life: number, p: PresenceProfile, phase: PresencePhase): void {
  if (!(f.radius > 0 && life > 0) || !Number.isFinite(f.radius + f.pos.x + f.pos.y + life)) return;
  const q = Math.max(0, Math.min(1, 1 - life));
  ctx.save(); ctx.beginPath(); traceFlashFigure(ctx, f); ctx.clip();
  if (f.edgeFrac && f.edgeFrac > 0) {
    ctx.beginPath(); ctx.rect(f.pos.x - f.radius * 3, f.pos.y - f.radius * 3, f.radius * 6, f.radius * 6);
    ctx.arc(f.pos.x, f.pos.y, f.radius * Math.min(1, f.edgeFrac), 0, TAU, true); ctx.clip('evenodd');
  }
  ctx.translate(f.pos.x, f.pos.y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha *= Math.min(1, life * 3);
  // A storm impact finishes by shedding its silhouette. Zero-linger strikes
  // need no invented second timer or simultaneous expiration flash.
  const tail = p.family === 'storm' && phase === 'pulse' && q > .62;
  drawPresenceGlyph(ctx, p, f.radius * .92, f.color, tail ? (q - .62) / .38 : q, tail ? 'expire' : phase);
  ctx.restore();
}

/** Caller clips to the real field, safe holes and (when applicable) wet cells. */
export function drawPresenceField(ctx: CanvasRenderingContext2D, z: SkillFieldVisual, time: number): boolean {
  const p = presenceProfile(z.skillId); if (p?.family !== 'storm') return false;
  // Release-armed storms hold their completed signature; never count down 9999.
  const completion = z.armed ? 1 : 1 - Math.min(1, Math.max(0, z.delay) / Math.max(.01, z.delay0 ?? z.telegraph));
  ctx.save(); ctx.translate(z.pos.x, z.pos.y); ctx.globalAlpha *= z.exploded ? .3 : .4 + .35 * completion;
  drawPresenceGlyph(ctx, p, z.radius * .9, z.color, z.exploded ? 0 : completion, z.exploded ? 'idle' : 'arrive');
  ctx.restore(); return true;
}

/** A small, static foot signature keeps shared creature bodies attributable.
 * There is no idle attack beat, lifetime gauge or decorative danger circle. */
export function drawPresenceBadge(ctx: CanvasRenderingContext2D, badge: PresenceBadge | undefined, radius: number): void {
  const p = badge && presenceProfile(badge.skillId); if (!p || !badge) return;
  ctx.save(); ctx.translate(0, radius * .85); ctx.globalAlpha *= .48;
  drawPresenceGlyph(ctx, p, Math.min(14, radius * .75), badge.color, 0, 'idle'); ctx.restore();
}

for (const [id, profile] of Object.entries(SKILL_PRESENCES)) for (const phase of ['arrive', 'pulse', 'expire', 'break'] as const)
  registerEffectVoice(skillPresenceVoice(id, phase)!, (ctx, f, life) => drawPresenceMoment(ctx, f, life, profile, phase));
