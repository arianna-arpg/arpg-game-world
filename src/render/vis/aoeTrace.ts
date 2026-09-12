// ---------------------------------------------------------------------------
// THE AOE TRACER — the ONE path builder for every registered area figure
// (AOE_SHAPE: circle / square / triangle / crescent / sector / band), lifted
// out of the renderer so the zone painter, the flash painter, the cast
// telegraph AND any registered effect voice trace the SAME figure the
// engine's inAoe tests (world.ts). Drawn == tested is a shared function
// here, not a discipline: a new shape lands beside its inAoe branch and
// every painter learns it at once.
//
// Proportions mirror inAoe's exactly: the triangle's 1.25 circumradius,
// the crescent's 0.55 inner rim, the band's AOE_BAND_DEPTH. The caller owns
// beginPath / fill / stroke — this only appends the figure to the path.
// ---------------------------------------------------------------------------

import { AOE_BAND_DEPTH, AOE_SHAPE } from '../../engine/skills';

/** The crescent/sector default width (inAoe's CRESCENT_ARC). */
const CRESCENT_ARC = 110 * Math.PI / 180;
/** The crescent's inner rim as a fraction of its radius (inAoe's CRESCENT_INNER). */
const CRESCENT_INNER = 0.55;

/** Append a registered area figure to the current path. `shape` is an
 *  AOE_SHAPE value (undefined / 0 = circle); `facing` orients every faced
 *  figure; `arcRad` widens the crescent/sector past their default. */
export function traceAoePath(
  ctx: CanvasRenderingContext2D, x: number, y: number, radius: number,
  shape?: number, facing = 0, arcRad?: number,
): void {
  if (shape === AOE_SHAPE.band) {
    // THE BAND (the crossing strip): a rectangle turned to the facing —
    // half-width `radius` ACROSS it, radius × AOE_BAND_DEPTH ALONG it;
    // the corners are inAoe's own frame (right = (-sin, cos)).
    const fx = Math.cos(facing), fy = Math.sin(facing);
    const rx = -fy, ry = fx;
    const hw = radius, hd = radius * AOE_BAND_DEPTH;
    ctx.moveTo(x + fx * hd + rx * hw, y + fy * hd + ry * hw);
    ctx.lineTo(x + fx * hd - rx * hw, y + fy * hd - ry * hw);
    ctx.lineTo(x - fx * hd - rx * hw, y - fy * hd - ry * hw);
    ctx.lineTo(x - fx * hd + rx * hw, y - fy * hd + ry * hw);
    ctx.closePath();
  } else if (shape && shape >= 4) {
    // Sector: a full PIE wedge — the crescent without its hollow heart
    // (Scythe Arc's no-deadzone harvest).
    const half = (arcRad ?? CRESCENT_ARC) / 2;
    ctx.moveTo(x, y);
    ctx.arc(x, y, radius, facing - half, facing + half);
    ctx.closePath();
  } else if (shape && shape >= 3) {
    // Crescent: an annular sector aimed along facing (inner rim 0.55R —
    // must match the inAoe hit test's CRESCENT_INNER).
    const half = (arcRad ?? CRESCENT_ARC) / 2;
    ctx.arc(x, y, radius, facing - half, facing + half);
    ctx.arc(x, y, radius * CRESCENT_INNER, facing + half, facing - half, true);
    ctx.closePath();
  } else if (shape && shape >= 2) {
    const R = radius * 1.25;
    ctx.moveTo(x + Math.cos(facing) * R, y + Math.sin(facing) * R);
    for (let i = 1; i < 3; i++) {
      const a = facing + i * (Math.PI * 2 / 3);
      ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R);
    }
    ctx.closePath();
  } else if (shape && shape >= 1) {
    ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
  } else {
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  }
}

/** The narrow figure a FLASH carries (world.ts Flash rows satisfy it
 *  structurally): a faced shape, or the classic swing ARC. */
export interface FlashFigure {
  pos: { x: number; y: number };
  radius: number;
  shape?: number;
  facing?: number;
  arc?: { facing: number; arcRad: number };
}

/** Append a flash's OWN figure to the path — the swing arc when it carries
 *  one, else its registered shape — so an effect voice (the crossjab
 *  streak) always paints over exactly the surface the strike tested, even
 *  when a sigil re-geometried it. */
export function traceFlashFigure(ctx: CanvasRenderingContext2D, f: FlashFigure): void {
  if (f.arc) {
    ctx.moveTo(f.pos.x, f.pos.y);
    ctx.arc(f.pos.x, f.pos.y, f.radius, f.arc.facing - f.arc.arcRad / 2, f.arc.facing + f.arc.arcRad / 2);
    ctx.closePath();
  } else {
    traceAoePath(ctx, f.pos.x, f.pos.y, f.radius, f.shape, f.facing ?? 0);
  }
}
