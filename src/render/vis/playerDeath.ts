import type { Actor } from '../../engine/actor';
import { deathPresentationPose, type DeathPresentation } from '../../engine/deathPresentation';
import { DEATH_PRESENTATION as CFG } from '../../data/deathPresentation';
import { bodySprite, adornSprite, spriteHalf, lookOf, shapeIsOriented, drawLiveParts, type BodyLook } from './body';
import { drawShadow } from './sprites';

// One snapshot per performance; reused for every shard, released with the world.
const portraits = new WeakMap<DeathPresentation, HTMLCanvasElement>();

function portrait(actor: Actor, state: DeathPresentation, time: number): HTMLCanvasElement {
  const cached = portraits.get(state);
  if (cached) return cached;
  const look: BodyLook = { shape: actor.shape, radius: actor.radius, color: actor.color,
    material: actor.material, adorn: actor.adorn, look: actor.look, extraParts: actor.extraParts };
  const half = spriteHalf(actor.radius);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = half * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(half, half);
  const def = lookOf(actor.look);
  ctx.save();
  if (def || shapeIsOriented(actor.shape)) ctx.rotate(actor.facing);
  ctx.drawImage(bodySprite(look), -half, -half);
  if (def?.live) drawLiveParts(ctx, look, def, time);
  ctx.restore();
  const adorn = adornSprite(look);
  if (adorn) { ctx.rotate(actor.facing); ctx.drawImage(adorn, -half, -half); }
  portraits.set(state, canvas);
  return canvas;
}

/** The actor's own baked silhouette breaks into clipped pieces. All movement is
 * canvas-only: the dead actor stays at its credited death/corpse location. */
export function drawPlayerDeath(ctx: CanvasRenderingContext2D, actor: Actor, state: DeathPresentation, time: number): void {
  const pose = deathPresentationPose(state.elapsed);
  if (pose.complete) return;
  const img = portrait(actor, state, time);
  const half = img.width / 2;
  const count = Math.max(3, Math.min(64, Math.round(CFG.shardCount)));
  const radius = half * 3;
  // A fixed irregular fan: no calls into the gameplay random stream.
  const angle = (i: number): number => (i + 0.18 * Math.sin(i * 4.7)) * Math.PI * 2 / count;
  const origin = { x: actor.radius * 0.12, y: -actor.radius * 0.18 };
  ctx.save();
  ctx.translate(actor.pos.x, actor.pos.y);
  drawShadow(ctx, 0, 0, actor.radius, (1 - pose.lift / Math.max(1, CFG.lift) * 0.6) * pose.shardAlpha);
  ctx.translate(0, -pose.lift);
  if (!pose.broken) {
    ctx.drawImage(img, -half, -half);
    if (pose.cracks > 0) {
      // Mask cracks to the actual silhouette, including its worn adornments.
      const mask = crackCanvas(img.width);
      const ink = mask.getContext('2d')!;
      ink.clearRect(0, 0, mask.width, mask.height);
      ink.drawImage(img, 0, 0);
      ink.globalCompositeOperation = 'source-in';
      ink.fillStyle = CFG.crackColor;
      ink.fillRect(0, 0, mask.width, mask.height);
      ink.globalCompositeOperation = 'destination-in';
      // Keep only the fault lines in the silhouette's colored mask.
      const lines = lineCanvas(img.width);
      const pen = lines.getContext('2d')!;
      pen.clearRect(0, 0, lines.width, lines.height);
      pen.strokeStyle = '#fff';
      pen.lineWidth = CFG.crackWidth;
      pen.beginPath();
      for (let i = 0; i < count; i++) {
        pen.moveTo(half + origin.x, half + origin.y);
        pen.lineTo(half + origin.x + Math.cos(angle(i)) * radius * pose.cracks,
          half + origin.y + Math.sin(angle(i)) * radius * pose.cracks);
      }
      pen.stroke();
      ink.drawImage(lines, 0, 0);
      ink.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = pose.cracks;
      ctx.drawImage(mask, -half, -half);
    }
  } else {
    for (let i = 0; i < count; i++) {
      const a = angle(i), b = angle(i + 1 === count ? 0 : i + 1) + (i + 1 === count ? Math.PI * 2 : 0);
      const mid = (a + b) / 2;
      const speed = CFG.shardSpeed * (0.7 + 0.3 * Math.sin(i * 2.3) ** 2);
      const age = pose.shardAge;
      ctx.save();
      ctx.globalAlpha = pose.shardAlpha;
      ctx.translate(Math.cos(mid) * speed * age, Math.sin(mid) * speed * age + CFG.gravity * age * age / 2);
      ctx.translate(origin.x, origin.y);
      ctx.rotate(Math.sin(i * 3.1) * CFG.spin * age);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      ctx.lineTo(Math.cos(b) * radius, Math.sin(b) * radius);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, -half - origin.x, -half - origin.y);
      ctx.restore();
    }
  }
  ctx.restore();
}

// Bounded scratch surfaces, reused each frame, independent of the bake cache.
let cracks: HTMLCanvasElement | undefined;
let lines: HTMLCanvasElement | undefined;
function crackCanvas(size: number): HTMLCanvasElement {
  cracks ??= document.createElement('canvas');
  if (cracks.width !== size) cracks.width = cracks.height = size;
  return cracks;
}
function lineCanvas(size: number): HTMLCanvasElement {
  lines ??= document.createElement('canvas');
  if (lines.width !== size) lines.width = lines.height = size;
  return lines;
}
