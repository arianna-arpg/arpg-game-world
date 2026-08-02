// ---------------------------------------------------------------------------
// THE HIT FLASH (VIS_CFG.hitFlash) — the landed blow's read on the struck
// body, both directions: the enemy you hit and the hero who was hit.
//
// The ENGINE already owns the truth: the damage funnel stamps Actor.hitFlash
// in seconds, graded by what landed (0.10 block-chip / 0.12 ply chip / 0.15
// wound — applyHit in engine/damage.ts, plus the world's contact lanes),
// updateTimers walks it down, and the co-op wire ships it per body (`hf`).
// DoT ticks never stamp — the same discrimination the puzzle fabric's knock
// law draws ("a landed damaging blow rings a node; DoT ticks never knock"):
// a poison stack melting a body must not strobe it.
//
// THIS module turns what remains of the stamp into a drawn overlay: a white
// silhouette WASH ('fill') or a white RIM where the usual dark outline sits
// ('outline'), alpha ramping OUT on the stamp's own clock. COMPOSITION,
// never replacement — the body sprite, its tell tints, live parts, worn
// gauges and every fade lane (ghostAlpha, veil, wane) keep speaking under
// the flash; it rides on top and vanishes. (The old language was a binary
// swap to the full-white bake: under a fast barrage a body sat permanently
// white with its identity — tells included — erased. This retires it.)
//
// THE PERF LAW: the resting cost is ONE field read per actor per frame
// (hitFlash <= 0 → alpha 0, nothing else runs). A flashing body costs one
// cached-bake blit ('bake' — the tell fabric's pre-bake idiom; the
// bodyFlashSprite variants already serve the worm fabric) or a reused
// scratch-canvas whiten ('composite' — the measured alternative; the
// scratch grows once and is reused, so neither path allocates per frame).
// No ctx.filter anywhere, so the canvasCaps probe has nothing to gate.
// ---------------------------------------------------------------------------

import type { Actor } from '../../engine/actor';
import {
  adornFlashSprite, bodyFlashSprite, bodyKey, bodySprite, spriteHalf,
  type BodyLook,
} from './body';
import { baked } from './sprites';
import { VIS_CFG } from './visConfig';

/** Resolve the flash overlay alpha for a body this frame — 0 = no flash.
 *  Heroes (kind 'player') read their own dial (the local pain read); the
 *  engine's graded stamps ride the ramp free: a chip's shorter stamp enters
 *  lower than a wound's, so a graze reads dimmer by construction. */
export function hitFlashAlphaOf(a: Actor): number {
  const left = a.hitFlash;
  if (left <= 0) return 0;
  const hf = VIS_CFG.hitFlash;
  const p = a.kind === 'player' ? hf.player : hf;
  return p.alpha * Math.min(1, (left * 1000) / Math.max(1, p.ms));
}

/** The 'outline' mode's body sprite: the flash silhouette dilated eight ways
 *  minus itself — a white rim exactly where the dark outline usually reads.
 *  Baked and LRU-governed like every sprite (the steward's regime). */
function bodyRimSprite(look: BodyLook): HTMLCanvasElement {
  const half = spriteHalf(look.radius);
  const px = VIS_CFG.hitFlash.outlinePx;
  return baked(`bodyRim|${px.toFixed(2)}|${bodyKey(look)}`, half * 2, half * 2, (ctx) => {
    const f = bodyFlashSprite(look);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      ctx.drawImage(f, -half + Math.cos(ang) * px, -half + Math.sin(ang) * px);
    }
    // Punch the body back out: what remains is the rim alone, so the wash
    // never doubles where the body already drew.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(f, -half, -half);
  });
}

/** The rim variant of an adorn overlay (wings, ears — legacy bodies only;
 *  part-grammar looks own their whole silhouette and return null upstream). */
function adornRimSprite(look: BodyLook): HTMLCanvasElement | null {
  const f = adornFlashSprite(look);
  if (!f) return null;
  const half = spriteHalf(look.radius);
  const px = VIS_CFG.hitFlash.outlinePx;
  const key = `adornRim|${px.toFixed(2)}|${look.adorn}|${look.radius.toFixed(1)}`
    + `|${look.color}|${look.material ?? ''}|${look.demonHorns ? 'd' : ''}`;
  return baked(key, half * 2, half * 2, (ctx) => {
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      ctx.drawImage(f, -half + Math.cos(ang) * px, -half + Math.sin(ang) * px);
    }
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(f, -half, -half);
  });
}

// The 'composite' scratch — module-held, grow-only, reused every call: the
// alternative implementation whitens the live body sprite per draw instead
// of holding a second bake per look. Kept as a measured lever (see the
// hit-flash pass memo for the crowded-zone numbers that made 'bake' the
// default); the no-per-frame-allocation law holds on both paths.
let scratch: HTMLCanvasElement | null = null;
let scratchCtx: CanvasRenderingContext2D | null = null;

function compositeWhite(img: HTMLCanvasElement): HTMLCanvasElement {
  if (!scratch || !scratchCtx) {
    scratch = document.createElement('canvas');
    scratch.width = 64; scratch.height = 64;
    scratchCtx = scratch.getContext('2d')!;
  }
  if (scratch.width < img.width || scratch.height < img.height) {
    scratch.width = Math.max(scratch.width, img.width);
    scratch.height = Math.max(scratch.height, img.height);
  }
  const c = scratchCtx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, img.width, img.height);
  c.drawImage(img, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, img.width, img.height);
  c.globalCompositeOperation = 'source-over';
  return scratch;
}

/** Blit the body's flash overlay. The ctx must sit in the SAME pose the body
 *  sprite was just blitted in (translation, breathe, rotation applied), so
 *  the overlay covers exactly the pixels the body drew; `alpha` arrives
 *  pre-folded with the body's own baseAlpha — the fade lanes compose free. */
export function drawBodyHitFlash(
  ctx: CanvasRenderingContext2D, look: BodyLook, alpha: number,
): void {
  if (alpha <= 0) return;
  const half = spriteHalf(look.radius);
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  const hf = VIS_CFG.hitFlash;
  if (hf.mode === 'outline') {
    ctx.drawImage(bodyRimSprite(look), -half, -half);
  } else if (hf.impl === 'composite') {
    const src = bodySprite(look);
    const s = compositeWhite(src);
    ctx.drawImage(s, 0, 0, src.width, src.height, -half, -half, src.width, src.height);
  } else {
    ctx.drawImage(bodyFlashSprite(look), -half, -half);
  }
  ctx.globalAlpha = prev;
}

/** The adorn's flash overlay — call inside the adorn's own facing rotation,
 *  right after the adorn blit. Null-adorn looks cost one call and return. */
export function drawAdornHitFlash(
  ctx: CanvasRenderingContext2D, look: BodyLook, alpha: number,
): void {
  if (alpha <= 0) return;
  const img = VIS_CFG.hitFlash.mode === 'outline'
    ? adornRimSprite(look) : adornFlashSprite(look);
  if (!img) return;
  const half = spriteHalf(look.radius);
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, -half, -half);
  ctx.globalAlpha = prev;
}
