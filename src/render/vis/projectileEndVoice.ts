import { PROJECTILE_ENDINGS, PROJECTILE_END_STYLE, type ProjectileEndCue } from '../../data/projectileEndings';
import { cosmeticStyle, COSMETIC_PROJECTILES } from '../../data/cosmeticStyles';
import { hash01, shade, withAlpha } from './color';
import { registerEffectVoice, type EffectVoiceFlash } from './effectVoice';
import { drawProjectileHead } from './projectileHead';
import { drawOrbMote } from './orbMote';

const TAU = Math.PI * 2;

function drawEndingHead(ctx: CanvasRenderingContext2D, f: EffectVoiceFlash, cue: ProjectileEndCue, size: number, dir: number): void {
  if (cue.orbPaint) drawOrbMote(ctx, 0, 0, size, f.color, cue.orbPaint, cue.age);
  else drawProjectileHead(ctx, { skillVisualId: cue.source, cosmeticProjectile: cue.skin, pos: f.pos,
    shape: cue.shape, color: f.color, dir, age: cue.age, radius: size });
}

/** Draw in endpoint-local space. The same point drives the shaft, its shadow and the contact grit. */
function drawLodgedShaft(ctx: CanvasRenderingContext2D, f: EffectVoiceFlash, cue: ProjectileEndCue, r: number, dir: number, remaining: number): void {
  const cfg = PROJECTILE_ENDINGS.lodge, wall = cue.surface === 'wall';
  const elapsed = 1 - remaining, contact = wall ? 0 : cfg.dropFraction;
  const fall = contact > 0 ? Math.min(1, elapsed / contact) : 1;
  const planted = elapsed >= contact;
  const quiver = cfg.quiverFraction > 0 ? Math.min(1, Math.max(0, (elapsed - contact) / cfg.quiverFraction)) : 1;
  const alpha = cfg.fadeFraction > 0 ? Math.min(1, remaining / cfg.fadeFraction) : 1;
  const dx = Math.cos(dir), dy = Math.sin(dir);
  const seat = (cosmeticStyle(COSMETIC_PROJECTILES, cue.skin)?.embedAt ?? 0) * r;
  const carry = wall ? 0 : seat + cfg.carryR * r * fall * (2 - fall);
  const floorY = wall ? 0 : cfg.dropR * r;
  const x = dx * carry, y = dy * carry + floorY * fall * fall;
  // Project a nose-down pitch into the top-down view, shortening a shaft aimed away.
  const along = wall ? 1 : 1 - .24 * fall, down = wall ? 0 : cfg.pitch * fall;
  const ax = dx * along, ay = dy * along + down;
  const heading = Math.atan2(ay, ax) + Math.sin(quiver * TAU * 1.5) * (1 - quiver) ** 2 * .22;
  const length = Math.max(.52, Math.min(1, Math.hypot(ax, ay)));
  ctx.globalAlpha *= alpha;
  if (!wall) {
    ctx.fillStyle = withAlpha('#151210', .13 + .20 * fall);
    ctx.beginPath(); ctx.ellipse(x - dx * r * .75, dy * carry + floorY - dy * r * .75,
      r * (1.5 - .32 * fall), r * (.32 - .13 * fall), dir, 0, TAU); ctx.fill();
  }
  ctx.save(); ctx.translate(x, y); ctx.rotate(heading);
  if (planted) {
    // The buried point stays out of view. Only the exposed shaft pivots on impact.
    const reach = r * PROJECTILE_END_STYLE.drawReach;
    ctx.beginPath(); ctx.rect(-reach, -reach, reach, reach * 2); ctx.clip();
  }
  ctx.scale(length, 1); ctx.translate(-seat, 0); ctx.rotate(-dir);
  drawEndingHead(ctx, f, cue, r, dir);
  ctx.restore();
  if (planted && quiver < 1) {
    ctx.fillStyle = withAlpha(wall ? '#b9aa93' : '#997650', .79 * (1 - quiver));
    for (let i = 0; i < cfg.pieces; i++) {
      const angle = (i + .5) * TAU / cfg.pieces + hash01(f.pos.x, f.pos.y, i) * .55;
      const out = wall ? -Math.abs(Math.cos(angle)) : Math.cos(angle);
      const side = Math.sin(angle), spread = r * (.2 + 1.12 * quiver);
      ctx.beginPath(); ctx.ellipse(x + (dx * out - dy * side) * spread,
        y + (dy * out + dx * side) * spread - r * .58 * Math.sin(quiver * Math.PI),
        r * .20, r * .11, angle, 0, TAU); ctx.fill();
    }
  }
}

registerEffectVoice('projectileEnd', (ctx, f, remaining) => {
  const cue = f.projectileEnd;
  if (!cue || !Object.hasOwn(PROJECTILE_ENDINGS, cue.kind) || remaining <= 0) return;
  const { kind, surface } = cue, wall = surface === 'wall';
  const u = 1 - remaining, ease = 1 - remaining * remaining;
  const r = Math.max(PROJECTILE_END_STYLE.minRadius, Math.min(PROJECTILE_END_STYLE.maxRadius, f.radius)), dir = f.facing ?? 0;
  const dx = Math.cos(dir), dy = Math.sin(dir);
  const solid = kind === 'settle';
  const count = PROJECTILE_ENDINGS[kind].pieces;
  ctx.save();
  ctx.translate(f.pos.x, f.pos.y);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (kind === 'lodge') {
    drawLodgedShaft(ctx, f, cue, r, dir, remaining);
    ctx.restore();
    return;
  }
  if (solid && !wall) {
    ctx.save(); ctx.globalAlpha *= Math.min(1, u * 8, remaining * 3);
    ctx.fillStyle = 'rgba(14,12,11,.28)';
    ctx.beginPath(); ctx.ellipse(-dx * r * .45, r * .5 - dy * r * .45, r * 1.1, r * .22, dir, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Loose weapons hop once and rest.
  // Elemental heads collapse at the origin while their fragments take over.
  const headAlpha = solid ? Math.min(1, remaining * 3.5) : Math.max(0, 1 - u * 4);
  if (headAlpha > 0) {
    ctx.save();
    const seat = Math.min(1, u * 4);
    const travel = (wall ? -1 : 1) * r * (solid ? .85 : .24) * seat;
    const hop = kind === 'settle' ? -r * .65 * Math.sin(Math.PI * Math.min(1, u * 3)) : 0;
    const wobble = solid ? Math.sin(u * 32) * Math.exp(-u * 12) * .18 : 0;
    const heading = dir + wobble;
    ctx.translate(dx * travel, dy * travel + hop);
    const size = solid ? r : r * (.35 + .65 * headAlpha);
    ctx.globalAlpha *= headAlpha;
    drawEndingHead(ctx, f, cue, size, heading);
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
