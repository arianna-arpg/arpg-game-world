import type { Actor } from '../../engine/actor';
import type { FrameBodyView } from '../../engine/frameSpec';
import { FRAME_CUE_STYLES, FRAME_SHELL_STYLES, FRAME_RAMPART_STYLES } from '../../data/frameVisuals';
import { drawPartSpecs, type BodyLook } from './body';
import { shade, withAlpha } from './color';
import { registerEffectVoice } from './effectVoice';

const TAU = Math.PI * 2;
const own = <T>(registry: Record<string, T>, id: string): T | undefined =>
  Object.prototype.hasOwnProperty.call(registry, id) ? registry[id] : undefined;

/** Outlined, rounded bone has a readable volume even against pale ground. */
function bone(ctx: CanvasRenderingContext2D, color: string, width: number, path: () => void): void {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); path();
  ctx.strokeStyle = shade(color, -.68); ctx.lineWidth = width + 2.4; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  ctx.strokeStyle = shade(color, .28); ctx.lineWidth = Math.max(.7, width * .25); ctx.stroke();
}

/** Returns false for an unknown anatomy so the universal shield remains visible. */
export function drawFrameShell(ctx: CanvasRenderingContext2D, a: Actor, id: string,
  time: number, r: number, arc: number, center: number): boolean {
  const cfg = own(FRAME_SHELL_STYLES, id), sg = a.shellGuard;
  if (!cfg || !sg) return false;
  const fill = Math.max(0, Math.min(1, sg.pool / sg.max)), broken = sg.broken || sg.pool <= 0;
  const recovery = Math.min(1, fill / Math.max(.001, sg.reformFraction ?? .4));
  const scatter = broken ? cfg.looseTravel * (1 - recovery) : 0;
  const start = Math.PI - arc / 2, end = Math.PI + arc / 2;
  ctx.save(); ctx.rotate(center - Math.PI);
  // Clip to the real protected sector, with a clear center for the caster.
  ctx.beginPath(); ctx.arc(0, 0, r * 1.7, start, end);
  ctx.arc(0, 0, r * .57, end, start, true); ctx.closePath(); ctx.clip();
  ctx.globalAlpha *= broken ? .24 + recovery * .38 : .85 + fill * .15;
  const color = sg.color;
  if (!broken) {
    // Two embracing arms, meeting at the spine and leaving the forward mouth open.
    bone(ctx, color, r * cfg.width, () => ctx.arc(0, 0, r, start + .09, end - .09));
  }
  const count = Math.max(3, Math.round(cfg.ribs * arc / TAU));
  for (let i = 0; i < count; i++) {
    const theta = start + (i + .5) * arc / count;
    ctx.save(); ctx.rotate(theta); ctx.translate(r * scatter, 0);
    bone(ctx, color, Math.max(2.2, r * cfg.width * .63), () => {
      ctx.moveTo(r * cfg.inner, -r * .065);
      ctx.quadraticCurveTo(r * 1.02, -r * .09, r * cfg.outer, r * .045);
    });
    if (!broken && (i + .5) / count > fill) {
      ctx.strokeStyle = shade(color, -.65); ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(r * .94, -r * .075);
      ctx.lineTo(r, -r * .015); ctx.lineTo(r * .98, r * .055); ctx.stroke();
    }
    ctx.restore();
  }
  const pose = a.casting && !broken ? Math.sin(Math.min(1, a.casting.elapsed / Math.max(.01, a.casting.total)) * Math.PI) * .07 : 0;
  const parts = cfg.parts.map(part => ({ ...part,
    x: (part.x ?? 0) * (1 + scatter) + ((part.x ?? 0) > 0 ? pose : 0),
    y: (part.y ?? 0) * (1 + scatter),
    params: broken && part.kind === 'skull' ? { ...part.params, glow: '' } : part.params,
  }));
  const look: BodyLook = { shape: 'circle', radius: r, color, material: 'bone' };
  drawPartSpecs(ctx, look, parts, time);
  ctx.restore(); return true;
}

/** Actor-local cues are host-resolved. Remote clients need no private frame kit. */
export function drawFrameBodyCue(ctx: CanvasRenderingContext2D, a: Actor, cue: FrameBodyView | undefined, time: number): void {
  if (!cue) return;
  const cfg = own(FRAME_CUE_STYLES, cue.style);
  if (!cfg) return;
  const color = cfg[cue.mode];
  if (!color) return;
  const strength = Math.max(0, Math.min(1, cue.strength ?? 0));
  const r = a.radius + 9, pulse = .5 + .5 * Math.sin(time * (cue.mode === 'terminal' ? 13 : 5));
  ctx.save();
  if (cue.from && (cue.mode === 'repair' || cue.mode === 'transfusion')) {
    const x = cue.from.x - a.pos.x, y = cue.from.y - a.pos.y;
    if (Math.hypot(x, y) > r) {
      const bend = Math.min(28, Math.hypot(x, y) * .14);
      ctx.strokeStyle = withAlpha(color, .35); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x * .5, y * .5 - bend, 0, 0); ctx.stroke();
      for (let i = 0; i < cfg.tetherBeads; i++) {
        const t = (time * .7 + i / cfg.tetherBeads) % 1, k = 1 - t;
        const bx = x * k, by = y * k - 2 * bend * k * t;
        ctx.fillStyle = withAlpha(color, .65 * Math.sin(t * Math.PI));
        ctx.beginPath(); ctx.ellipse(bx, by, 3, 1.6, Math.atan2(y, x), 0, TAU); ctx.fill();
      }
    }
  }
  ctx.rotate(a.facing);
  if (cue.mode === 'charge') {
    // Small enclosing ribs on actual participants; no immunity mark on the caster.
    ctx.strokeStyle = withAlpha(color, .6); ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.arc(0, 0, r, side * .65, side * 2.5, side < 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * .15, side * r); ctx.lineTo(r * .55, side * r * .8); ctx.stroke();
    }
  } else {
    const terminal = cue.mode === 'terminal', count = cfg.marks;
    for (let i = 0; i < count; i++) {
      const angle = i * TAU / count + (terminal ? time * (1 + strength) : -time * .4);
      ctx.save(); ctx.rotate(angle);
      const radius = r * (terminal ? 1.2 - .25 * strength : 1 + pulse * .04);
      ctx.strokeStyle = withAlpha(color, .4 + pulse * .3); ctx.lineWidth = terminal ? 2.3 : 1.5;
      ctx.beginPath(); ctx.moveTo(radius + 5, -3); ctx.lineTo(radius, 0); ctx.lineTo(radius + 5, 3); ctx.stroke();
      if (terminal || cue.mode === 'crush') {
        ctx.beginPath(); ctx.moveTo(radius, 0); ctx.lineTo(radius - 6, 0); ctx.stroke();
      }
      ctx.restore();
    }
    if (terminal) {
      ctx.strokeStyle = withAlpha(color, .2 + pulse * .3); ctx.lineWidth = 1 + strength * 2;
      ctx.beginPath(); ctx.arc(0, 0, r * (1.2 - .25 * strength), 0, TAU); ctx.stroke();
    } else if (cue.mode === 'transfusion' && strength > 0) {
      ctx.strokeStyle = withAlpha(color, .25 + .5 * strength); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r, Math.PI / 2, Math.PI / 2 + TAU * strength); ctx.stroke();
    }
  }
  ctx.restore();
}

/** A moving ribbed vanguard, not an opaque cone. Its flash still has the real
 * world position, direction and supported radius and follows the ordinary wire. */
for (const [id, cfg] of Object.entries(FRAME_RAMPART_STYLES)) registerEffectVoice(id, (ctx, f, remaining) => {
  const r = f.radius;
  ctx.save(); ctx.translate(f.pos.x, f.pos.y); ctx.rotate(f.arc?.facing ?? f.facing ?? 0);
  ctx.globalAlpha *= cfg.alpha * remaining;
  ctx.beginPath(); ctx.arc(0, 0, r, -.5 * (f.arc?.arcRad ?? Math.PI), .5 * (f.arc?.arcRad ?? Math.PI));
  ctx.lineTo(0, 0); ctx.closePath(); ctx.clip();
  bone(ctx, f.color, cfg.width, () => {
    ctx.moveTo(r * cfg.shoulder, -r * cfg.halfSpan); ctx.quadraticCurveTo(r * .65, -r * .65, r * cfg.crest, 0);
    ctx.quadraticCurveTo(r * .65, r * .65, r * cfg.shoulder, r * cfg.halfSpan);
  });
  const ribs = Math.max(1, Math.round(cfg.ribs));
  for (let i = 0; i < ribs; i++) {
    const angle = ribs > 1 ? (i / (ribs - 1) - .5) * cfg.spread : 0;
    ctx.save(); ctx.rotate(angle);
    bone(ctx, f.color, cfg.width * .675, () => {
      ctx.moveTo(r * .67, -4); ctx.quadraticCurveTo(r * .85, -3, r * .94, 1);
    });
    ctx.restore();
  }
  drawPartSpecs(ctx, { shape: 'circle', radius: r, color: f.color, material: 'bone' },
    cfg.parts, 0);
  ctx.restore();
});
