import type { BodyLook } from './body';
import { bodyKey, bodySprite, spriteHalf } from './body';
import { baked } from './sprites';

/** A cached edge of the actual painted body, including part-grammar silhouettes.
 * It shares the caller's pose, opacity and later world occlusion passes. */
export function drawBodyContrast(ctx: CanvasRenderingContext2D, look: BodyLook,
  width: number, color: string, opacity: number): void {
  if (width <= 0 || opacity <= 0) return;
  const half = spriteHalf(look.radius), pad = Math.ceil(width), extent = half + pad;
  const edge = baked(`bodyContrast|${width}|${color}|${bodyKey(look)}`, extent * 2, extent * 2, g => {
    const body = bodySprite(look);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      g.drawImage(body, -half + Math.cos(angle) * width, -half + Math.sin(angle) * width);
    }
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(body, -half, -half);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(-extent, -extent, extent * 2, extent * 2);
  });
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.drawImage(edge, -extent, -extent);
  ctx.restore();
}
