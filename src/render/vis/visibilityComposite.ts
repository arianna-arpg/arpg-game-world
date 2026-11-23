/** Visibility owns its screen-space composition. A fading body or effect
 * cannot dim, additively blend, filter or offset the whole shadow/light pass.
 * Keep the existing clip (roof overlays deliberately establish one), and
 * restore all caller state after painting. */
export function withVisibilityComposite(ctx: CanvasRenderingContext2D, paint: () => void): void {
  ctx.save();
  try {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    if (ctx.globalCompositeOperation !== 'source-over') ctx.globalCompositeOperation = 'source-over';
    if (ctx.filter && ctx.filter !== 'none') ctx.filter = 'none';
    if (ctx.shadowBlur !== 0 || ctx.shadowOffsetX !== 0 || ctx.shadowOffsetY !== 0) {
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
    }
    if (!ctx.imageSmoothingEnabled) ctx.imageSmoothingEnabled = true;
    paint();
  } finally {
    ctx.restore();
  }
}
