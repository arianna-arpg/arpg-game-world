import { PROJECTILE_ENDINGS, PROJECTILE_END_STYLE } from '../../data/projectileEndings';
import { hash01, shade, withAlpha } from './color';
import { registerEffectVoice } from './effectVoice';
import { drawProjectileHead } from './projectileHead';
import { drawOrbMote } from './orbMote';

const TAU = Math.PI * 2;
registerEffectVoice('projectileEnd', (ctx, f, remaining) => {
  const cue = f.projectileEnd;
  if (!cue || !Object.hasOwn(PROJECTILE_ENDINGS, cue.kind) || remaining <= 0) return;
  const { kind, surface } = cue, wall = surface === 'wall';
  const u = 1 - remaining, ease = 1 - remaining * remaining;
  const r = Math.max(PROJECTILE_END_STYLE.minRadius, Math.min(PROJECTILE_END_STYLE.maxRadius, f.radius)), dir = f.facing ?? 0;
  const dx = Math.cos(dir), dy = Math.sin(dir);
  const solid = kind === 'lodge' || kind === 'settle';
  const count = PROJECTILE_ENDINGS[kind].pieces;
  ctx.save();
  ctx.translate(f.pos.x, f.pos.y);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (solid && !wall) {
    ctx.save(); ctx.globalAlpha *= Math.min(1, u * 8, remaining * 3);
    ctx.fillStyle = 'rgba(14,12,11,.28)';
    ctx.beginPath(); ctx.ellipse(-dx * r * .45, r * .5 - dy * r * .45, r * 1.1, r * .22, dir, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // The nose stays seated. Only the tail quivers; loose weapons hop once and rest.
  // Elemental heads collapse at the origin while their fragments take over.
  const headAlpha = solid ? Math.min(1, remaining * 3.5) : Math.max(0, 1 - u * 4);
  if (headAlpha > 0) {
    ctx.save();
    const seat = Math.min(1, u * 4);
    const travel = kind === 'lodge' && wall ? -r * .7 : (wall ? -1 : 1) * r * (kind === 'settle' ? .85 : .24) * seat;
    const hop = kind === 'settle' ? -r * .65 * Math.sin(Math.PI * Math.min(1, u * 3)) : 0;
    const wobble = solid ? Math.sin(u * 32) * Math.exp(-u * 12) * .18 : 0;
    const heading = dir + wobble;
    // Rotate the shaft about its buried tip instead of sliding it across the face.
    const pivot = kind === 'lodge' ? r : 0;
    ctx.translate(dx * travel + pivot * (dx - Math.cos(heading)), dy * travel + hop + pivot * (dy - Math.sin(heading)));
    const size = solid ? r : r * (.35 + .65 * headAlpha);
    ctx.globalAlpha *= headAlpha;
    if (cue.orbPaint) drawOrbMote(ctx, 0, 0, size, f.color, cue.orbPaint, cue.age);
    else drawProjectileHead(ctx, { skillVisualId: cue.source, cosmeticProjectile: cue.skin, pos: f.pos,
      shape: cue.shape, color: f.color, dir: heading, age: cue.age, radius: size });
    ctx.restore();
  }
  // Open air carries a little forward momentum; masonry sends debris back along
  // the incoming side. Seeded trajectories stay continuous across frames and peers.
  const dust = solid ? Math.max(0, 1 - u * 3.6) : remaining;
  if (dust > 0) for (let i = 0; i < count; i++) {
    const seed = hash01(f.pos.x + i * 17, f.pos.y + i * 7);
    const side = (i + .15 + seed * .7) / count * 2 - 1;
    const angle = side * (wall ? Math.PI * .46 : Math.PI);
    const distance = ease * r * (.65 + seed * .85);
    const forward = (wall ? -Math.cos(angle) : .48 + Math.cos(angle)) * distance;
    const across = Math.sin(angle) * distance;
    const lift = kind === 'cinder' || kind === 'unravel' ? -r * u : r * .85 * u * u;
    const x = dx * forward - dy * across, y = dy * forward + dx * across + lift;
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha *= dust;
    if (kind === 'cinder') {
      const puff = r * (.27 + .68 * ease) * (.7 + seed * .4);
      ctx.fillStyle = withAlpha(shade(f.color, -.22), .55 * remaining);
      ctx.beginPath(); ctx.ellipse(0, 0, puff, puff * .76, side, 0, TAU); ctx.fill();
      ctx.fillStyle = shade(f.color, .45);
      ctx.fillRect(-puff * .23, -puff * .35, 1 + r * .19 * remaining, 1 + r * .12 * remaining);
    } else if (kind === 'shatter') {
      ctx.rotate(dir + side * 1.7 + u * (seed - .5) * 4);
      const s = r * (.26 + seed * .38) * (.55 + remaining * .45);
      ctx.fillStyle = shade(f.color, .12 + seed * .45); ctx.strokeStyle = shade(f.color, -.22); ctx.lineWidth = .65;
      ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * .52, s * .37);
      ctx.lineTo(-s * .32, -s * .43); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (kind === 'discharge' || kind === 'unravel') {
      ctx.rotate(dir + side * 1.8 + (wall ? Math.PI : 0));
      const len = r * remaining * (.5 + seed);
      ctx.strokeStyle = shade(f.color, .38); ctx.lineWidth = .6 + remaining;
      ctx.beginPath(); ctx.moveTo(-len, 0);
      if (kind === 'discharge') { ctx.lineTo(-len * .35, -len * .3); ctx.lineTo(-len * .48, len * .15); ctx.lineTo(len * .25, 0); }
      else ctx.quadraticCurveTo(0, -len * (1 + u), len * .35, -.25 * len);
      ctx.stroke();
    } else {
      const s = r * (solid ? .13 : .28) * (.65 + seed);
      ctx.fillStyle = solid ? withAlpha(shade(f.color, -.23), .62) : shade(f.color, -.2 + seed * .4);
      ctx.beginPath(); ctx.ellipse(0, 0, s, s * (.55 + remaining * .3), dir + side, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
});
