// ---------------------------------------------------------------------------
// Actor body baker. Takes the SAME data an actor already carries — shape,
// color, radius, adorn — plus an optional material, and bakes a fully shaded
// body sprite: volume gradients keyed to the global light, material texture,
// gloss/specular, emissive halo, and a proper silhouette outline.
//
// The shape vocabulary is the one the bestiary speaks (ActorShape) — the bake
// draws every shape in its facing-0 pose (nose along +X) and the renderer
// rotates the blit, so identity semantics are unchanged. Adorns bake as their
// own overlay sprite (they always track facing, even on non-rotating bodies).
// ---------------------------------------------------------------------------

import type { ActorAdorn, ActorShape } from '../../engine/actor';
import { LOOKS } from '../../data/looks';
import { hash01, withAlpha } from './color';
import { materialOf, rampOf, type MaterialDef, type Ramp } from './materials';
import { lookPalette, paintLiveParts, paintLook, PART_PAINTERS, type LookDef, type PartSpec } from './parts';
import { baked } from './sprites';
import { VIS_CFG } from './visConfig';

export interface BodyLook {
  shape: ActorShape;
  radius: number;
  color: string;
  material?: string;
  adorn?: ActorAdorn;
  /** A LOOKS registry id — the part-grammar portrait. When set it OWNS the
   *  body (legacy shape + adorn are skipped; the whole sprite rotates with
   *  facing). Unknown ids fall back to the legacy body, so a look tag can
   *  ship before its entry. */
  look?: string;
  /** Outline override (minions wear their binding color). */
  outline?: string;
  /** Demon-style nub horns instead of swept horns. */
  demonHorns?: boolean;
  /** RUNTIME TACK (Actor.extraParts): extra look parts worn OVER the body —
   *  the tamed collar, brands, harnesses. Draws on part-grammar AND legacy
   *  bodies alike; part of the bake key, so a stamped actor re-bakes. */
  extraParts?: PartSpec[] | undefined;
}

/** Resolve a look id to its def (undefined = legacy body path). */
export function lookOf(id?: string): LookDef | undefined {
  return id ? LOOKS[id] : undefined;
}

/** Draw a look's LIVE animated parts (wisps, flames) — call per frame with
 *  the context already translated to the actor and rotated to its facing. */
export function drawLiveParts(ctx: CanvasRenderingContext2D, look: BodyLook,
  def: LookDef, t: number): void {
  paintLiveParts(ctx, look.radius, def, lookPalette(look.color, look.material), t);
}

/** Shapes that rotate with facing at draw time (the rest hold their pose). */
const ORIENTED = new Set<ActorShape>([
  'triangle', 'pentagon', 'hexagon', 'octagon', 'star', 'cross',
  'trapezoid', 'rhombus', 'oval', 'kite', 'rectangle',
]);

export function shapeIsOriented(shape: ActorShape): boolean {
  return ORIENTED.has(shape);
}

/** Half-extent of a baked body/adorn sprite for `radius`. */
export function spriteHalf(radius: number): number {
  return Math.ceil(radius * VIS_CFG.sprite.padFactor);
}

function polyPath(ctx: CanvasRenderingContext2D, n: number, r: number, rot: number): void {
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}

/** Trace an ActorShape silhouette in its facing-0 pose (nose along +X). */
export function traceShape(ctx: CanvasRenderingContext2D, shape: ActorShape, r: number): void {
  ctx.beginPath();
  switch (shape) {
    case 'circle':
    case 'ribcage':
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      break;
    case 'diamond':
      ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0);
      ctx.closePath();
      break;
    case 'triangle':
      ctx.moveTo(r, 0); ctx.lineTo(-r, r * 0.9); ctx.lineTo(-r, -r * 0.9);
      ctx.closePath();
      break;
    case 'square':
      ctx.rect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7);
      break;
    case 'pentagon': polyPath(ctx, 5, r, 0); break;
    case 'hexagon': polyPath(ctx, 6, r, 0); break;
    case 'octagon': polyPath(ctx, 8, r, Math.PI / 8); break;
    case 'star': {
      const inner = r * 0.45;
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r : inner;
        const ang = (i / 10) * Math.PI * 2;
        if (i === 0) ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
        else ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
      }
      ctx.closePath();
      break;
    }
    case 'cross': {
      const arm = r * 0.38;
      ctx.rect(-r, -arm, r * 2, arm * 2);
      ctx.rect(-arm, -r, arm * 2, r * 2);
      break;
    }
    case 'trapezoid':
      ctx.moveTo(r * 0.7, -r * 0.95); ctx.lineTo(r * 0.7, r * 0.95);
      ctx.lineTo(-r * 0.8, r * 0.55); ctx.lineTo(-r * 0.8, -r * 0.55);
      ctx.closePath();
      break;
    case 'rhombus':
      ctx.moveTo(r * 1.1, 0); ctx.lineTo(r * 0.15, r * 0.75);
      ctx.lineTo(-r * 1.1, 0); ctx.lineTo(-r * 0.15, -r * 0.75);
      ctx.closePath();
      break;
    case 'oval':
      ctx.ellipse(0, 0, r * 1.15, r * 0.75, 0, 0, Math.PI * 2);
      break;
    case 'kite':
      ctx.moveTo(r * 1.2, 0); ctx.lineTo(-r * 0.15, r * 0.8);
      ctx.lineTo(-r * 0.7, 0); ctx.lineTo(-r * 0.15, -r * 0.8);
      ctx.closePath();
      break;
    case 'rectangle':
      ctx.rect(-r * 1.05, -r * 0.65, r * 2.1, r * 1.3);
      break;
  }
}

/** Volume pass: light + shade radial gradients clipped inside the silhouette,
 *  agreeing with VIS_CFG.lightAngle. Runs with the clip already set. */
function paintVolume(ctx: CanvasRenderingContext2D, r: number, ramp: Ramp, mat: MaterialDef): void {
  const la = VIS_CFG.lightAngle;
  const lx = Math.cos(la) * r * 0.45, ly = Math.sin(la) * r * 0.45;
  const lit = ctx.createRadialGradient(lx, ly, r * 0.1, lx, ly, r * 1.5);
  lit.addColorStop(0, withAlpha(ramp.light, VIS_CFG.body.lightAlpha * (0.5 + mat.highlight)));
  lit.addColorStop(1, withAlpha(ramp.light, 0));
  ctx.fillStyle = lit;
  ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
  const sx = -lx * 1.25, sy = -ly * 1.25;
  const shd = ctx.createRadialGradient(sx, sy, r * 0.15, sx, sy, r * 1.6);
  shd.addColorStop(0, withAlpha(ramp.shadow, VIS_CFG.body.shadeAlpha * (0.5 + mat.shadow)));
  shd.addColorStop(1, withAlpha(ramp.shadow, 0));
  ctx.fillStyle = shd;
  ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
}

/** Material texture stipple, clipped inside the silhouette. Deterministic per
 *  (texture, seed) so every bake of the same look is the same body. */
function paintTexture(ctx: CanvasRenderingContext2D, r: number, ramp: Ramp, mat: MaterialDef, seed: number): void {
  if (!mat.texture) return;
  const a = mat.textureAlpha ?? 0.2;
  ctx.lineCap = 'round';
  switch (mat.texture) {
    case 'cracks': {
      ctx.strokeStyle = withAlpha(ramp.outline, a);
      ctx.lineWidth = Math.max(1, r * 0.08);
      const n = 3 + Math.floor(hash01(seed, 1) * 3);
      for (let i = 0; i < n; i++) {
        const ang = hash01(seed, i * 7 + 2) * Math.PI * 2;
        let x = Math.cos(ang) * r * 0.2, y = Math.sin(ang) * r * 0.2;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let s = 0; s < 3; s++) {
          const step = ang + (hash01(seed, i * 13 + s) - 0.5) * 1.8;
          x += Math.cos(step) * r * 0.34; y += Math.sin(step) * r * 0.34;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case 'plates': {
      ctx.strokeStyle = withAlpha(ramp.shadow, a);
      ctx.lineWidth = Math.max(1, r * 0.09);
      for (let i = 1; i <= 3; i++) {
        const rr = r * (0.3 + i * 0.24);
        const tilt = (hash01(seed, i) - 0.5) * 0.8;
        ctx.beginPath();
        ctx.arc(-r * 0.15, 0, rr, tilt - 1.1, tilt + 1.1);
        ctx.stroke();
      }
      break;
    }
    case 'facets': {
      ctx.lineWidth = Math.max(1, r * 0.07);
      for (let i = 0; i < 4; i++) {
        const ang = hash01(seed, i * 3 + 1) * Math.PI * 2;
        const off = (hash01(seed, i * 5 + 2) - 0.5) * r;
        const px = Math.cos(ang + Math.PI / 2) * off, py = Math.sin(ang + Math.PI / 2) * off;
        ctx.strokeStyle = withAlpha(i % 2 ? ramp.highlight : ramp.shadow, a);
        ctx.beginPath();
        ctx.moveTo(px - Math.cos(ang) * r, py - Math.sin(ang) * r);
        ctx.lineTo(px + Math.cos(ang) * r, py + Math.sin(ang) * r);
        ctx.stroke();
      }
      break;
    }
    case 'grain': {
      ctx.strokeStyle = withAlpha(ramp.shadow, a);
      ctx.lineWidth = Math.max(1, r * 0.05);
      const step = Math.max(3, r * 0.3);
      for (let y = -r; y <= r; y += step) {
        const wob = (hash01(seed, y) - 0.5) * r * 0.2;
        ctx.beginPath();
        ctx.moveTo(-r, y + wob); ctx.quadraticCurveTo(0, y - wob, r, y + wob);
        ctx.stroke();
      }
      break;
    }
    case 'fur': {
      ctx.strokeStyle = withAlpha(ramp.shadow, a);
      ctx.lineWidth = Math.max(1, r * 0.06);
      const n = Math.max(8, Math.floor(r * 1.1));
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + hash01(seed, i) * 0.5;
        const r0 = r * (0.55 + hash01(seed, i * 2 + 1) * 0.3);
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
        ctx.lineTo(Math.cos(ang + 0.12) * (r0 + r * 0.28), Math.sin(ang + 0.12) * (r0 + r * 0.28));
        ctx.stroke();
      }
      break;
    }
    case 'drips': {
      ctx.fillStyle = withAlpha(ramp.highlight, a);
      for (let i = 0; i < 4; i++) {
        const x = (hash01(seed, i * 11) - 0.5) * r * 1.2;
        const y = (hash01(seed, i * 17 + 3) - 0.5) * r * 1.2;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.09, r * (0.16 + hash01(seed, i) * 0.12), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'weave': {
      ctx.strokeStyle = withAlpha(ramp.shadow, a);
      ctx.lineWidth = 1;
      const step = Math.max(3, r * 0.26);
      for (let d = -r * 2; d <= r * 2; d += step) {
        ctx.beginPath(); ctx.moveTo(d - r, -r); ctx.lineTo(d + r, r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(d + r, -r); ctx.lineTo(d - r, r); ctx.stroke();
      }
      break;
    }
    case 'pit': {
      ctx.fillStyle = withAlpha(ramp.shadow, a);
      const n = Math.max(5, Math.floor(r * 0.8));
      for (let i = 0; i < n; i++) {
        const ang = hash01(seed, i * 3) * Math.PI * 2;
        const rr = Math.sqrt(hash01(seed, i * 7 + 1)) * r * 0.85;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * rr, Math.sin(ang) * rr, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
}

/** Gloss band + specular dot on the lit hemisphere. Clip must be set. */
function paintShine(ctx: CanvasRenderingContext2D, r: number, ramp: Ramp, mat: MaterialDef): void {
  const la = VIS_CFG.lightAngle;
  const lx = Math.cos(la) * r * 0.42, ly = Math.sin(la) * r * 0.42;
  if (mat.glossAlpha) {
    ctx.strokeStyle = withAlpha(ramp.highlight, mat.glossAlpha);
    ctx.lineWidth = r * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.66, la - 1.0, la + 1.0);
    ctx.stroke();
  }
  if (mat.specSize && mat.specAlpha) {
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * mat.specSize);
    g.addColorStop(0, withAlpha('#ffffff', mat.specAlpha));
    g.addColorStop(1, withAlpha('#ffffff', 0));
    ctx.fillStyle = g;
    ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
  }
}

/** The skeleton's rib overlay (non-rotating, reads as bone from any angle). */
function paintRibs(ctx: CanvasRenderingContext2D, r: number, ramp: Ramp): void {
  ctx.strokeStyle = withAlpha(ramp.outline, 0.7);
  ctx.lineWidth = Math.max(1.5, r * 0.11);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85); ctx.lineTo(0, r * 0.85);
  for (let i = -2; i <= 2; i++) {
    const yy = (i / 2.4) * r * 0.8;
    const half = Math.cos((yy / (r * 0.9)) * (Math.PI / 2)) * r * 0.78;
    ctx.moveTo(-half, yy); ctx.lineTo(0, yy - r * 0.12);
    ctx.moveTo(half, yy); ctx.lineTo(0, yy - r * 0.12);
  }
  ctx.stroke();
}

function strSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0) % 100000;
}

function bodyKey(look: BodyLook): string {
  const tack = look.extraParts?.length ? JSON.stringify(look.extraParts) : '';
  return `${look.shape}|${look.radius.toFixed(1)}|${look.color}|${look.material ?? ''}|${look.outline ?? ''}|${look.look ?? ''}|${tack}`;
}

/** Paint the runtime TACK overlay (extraParts) — collars, brands, harnesses
 *  stamped onto a live actor by any system (data-only; unknown kinds skip). */
function paintTack(ctx: CanvasRenderingContext2D, r: number, look: BodyLook): void {
  if (!look.extraParts?.length) return;
  const pal = lookPalette(look.color, look.material);
  for (const spec of look.extraParts) {
    PART_PAINTERS[spec.kind]?.(ctx, r, spec, pal);
  }
}

/** The baked, shaded body sprite for a look (facing-0 pose, center origin). */
export function bodySprite(look: BodyLook): HTMLCanvasElement {
  const half = spriteHalf(look.radius);
  return baked(`body|${bodyKey(look)}`, half * 2, half * 2, (ctx) => {
    const r = look.radius;
    // PART-GRAMMAR PORTRAIT: a look id composes the whole body from the
    // part kit (skull/ribs/hood/scythe/…) — the legacy shape never draws.
    const lookDef = lookOf(look.look);
    if (lookDef) {
      paintLook(ctx, r, lookDef, lookPalette(look.color, look.material));
      paintTack(ctx, r, look);
      if (look.outline) {
        // Minion binding: a thin ring, since a part stack has no one path.
        ctx.strokeStyle = look.outline;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      return;
    }
    const mat = materialOf(look.material);
    const ramp = rampOf(look.color, mat);
    const seed = strSeed(bodyKey(look));
    // Emissive halo BEHIND the silhouette (spirits, embers, crystals glow).
    if (mat.emissive) {
      const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.8);
      g.addColorStop(0, withAlpha(look.color, mat.emissive * 0.55));
      g.addColorStop(1, withAlpha(look.color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-half, -half, half * 2, half * 2);
    }
    ctx.save();
    if (mat.alpha !== undefined) ctx.globalAlpha = mat.alpha;
    traceShape(ctx, look.shape, r);
    ctx.fillStyle = ramp.base;
    ctx.fill();
    ctx.save();
    traceShape(ctx, look.shape, r);
    ctx.clip();
    paintVolume(ctx, r, ramp, mat);
    paintTexture(ctx, r, ramp, mat, seed);
    paintShine(ctx, r, ramp, mat);
    ctx.restore();
    ctx.restore();
    if (look.shape === 'ribcage') paintRibs(ctx, r, ramp);
    // Silhouette outline — the read that separates a body from the ground.
    traceShape(ctx, look.shape, r);
    ctx.strokeStyle = look.outline ?? withAlpha(ramp.outline, VIS_CFG.body.outlineAlpha);
    ctx.lineWidth = look.outline ? 2 : VIS_CFG.body.outlineWidth;
    ctx.stroke();
    // The tack rides legacy bodies too (a collared legacy-shape hound).
    paintTack(ctx, r, look);
  });
}

/** The white hit-flash silhouette of a body sprite. */
export function bodyFlashSprite(look: BodyLook): HTMLCanvasElement {
  const half = spriteHalf(look.radius);
  return baked(`bodyF|${bodyKey(look)}`, half * 2, half * 2, (ctx) => {
    ctx.drawImage(bodySprite(look), -half, -half);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-half, -half, half * 2, half * 2);
  });
}

/** Adorn overlay sprite (facing-0 pose; always rotated to facing at draw).
 *  'tentacles' is NOT baked — its writhe animates live in the renderer.
 *  A part-grammar look owns its whole silhouette, so adorns skip. */
export function adornSprite(look: BodyLook): HTMLCanvasElement | null {
  const adorn = look.adorn;
  if (!adorn || adorn === 'tentacles' || lookOf(look.look)) return null;
  const half = spriteHalf(look.radius);
  const key = `adorn|${adorn}|${look.radius.toFixed(1)}|${look.color}|${look.material ?? ''}|${look.demonHorns ? 'd' : ''}`;
  return baked(key, half * 2, half * 2, (ctx) => {
    const r = look.radius;
    const mat = materialOf(look.material);
    const ramp = rampOf(look.color, mat);
    ctx.fillStyle = ramp.base;
    ctx.strokeStyle = withAlpha(ramp.outline, 0.8);
    ctx.lineWidth = 1.2;
    if (adorn === 'ears') {
      for (const side of [-1, 1]) {
        const ang = side * 1.9;
        const bx = Math.cos(ang) * r * 0.85, by = Math.sin(ang) * r * 0.85;
        const tx = Math.cos(ang) * r * 1.75, ty = Math.sin(ang) * r * 1.75;
        const px = Math.cos(ang + Math.PI / 2) * r * 0.3, py = Math.sin(ang + Math.PI / 2) * r * 0.3;
        ctx.beginPath();
        ctx.moveTo(bx - px, by - py); ctx.lineTo(tx, ty); ctx.lineTo(bx + px, by + py);
        ctx.closePath();
        // Ear membrane: base fill + a darker inner wedge for depth.
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = withAlpha(ramp.shadow, 0.5);
        ctx.beginPath();
        ctx.moveTo(bx - px * 0.4, by - py * 0.4); ctx.lineTo(tx, ty); ctx.lineTo(bx + px * 0.4, by + py * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = ramp.base;
      }
    } else if (adorn === 'horns' && look.demonHorns) {
      for (const side of [-1, 1]) {
        const ang = side * 0.7;
        const hx = Math.cos(ang) * r * 1.05, hy = Math.sin(ang) * r * 1.05;
        ctx.beginPath();
        ctx.arc(hx, hy, r * 0.3, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = withAlpha(ramp.highlight, 0.5);
        ctx.beginPath();
        ctx.arc(hx - r * 0.08, hy - r * 0.08, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ramp.base;
      }
    } else if (adorn === 'horns') {
      ctx.lineWidth = Math.max(2.5, r * 0.22);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const ang = side * 0.9;
        ctx.strokeStyle = ramp.base;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r * 0.7, Math.sin(ang) * r * 0.7);
        ctx.quadraticCurveTo(
          Math.cos(ang) * r * 1.5, Math.sin(ang) * r * 1.5,
          Math.cos(ang - side * 0.5) * r * 1.7, Math.sin(ang - side * 0.5) * r * 1.7);
        ctx.stroke();
        // Bone tip highlight.
        ctx.strokeStyle = withAlpha(ramp.highlight, 0.6);
        ctx.lineWidth = Math.max(1.2, r * 0.09);
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r * 1.32 - side * 2, Math.sin(ang) * r * 1.32);
        ctx.quadraticCurveTo(
          Math.cos(ang) * r * 1.5, Math.sin(ang) * r * 1.5,
          Math.cos(ang - side * 0.5) * r * 1.68, Math.sin(ang - side * 0.5) * r * 1.68);
        ctx.stroke();
        ctx.lineWidth = Math.max(2.5, r * 0.22);
      }
    } else if (adorn === 'spikes') {
      for (let s = 0; s < 6; s++) {
        const ang = (s / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * r * 1.05, Math.sin(ang) * r * 1.05, r * 0.18, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
    } else if (adorn === 'wings') {
      const back = Math.PI;
      for (const side of [-1, 1]) {
        const base = back + side * 0.45;
        const bx = Math.cos(base) * r * 0.5, by = Math.sin(base) * r * 0.5;
        for (const [spread, len] of [[0.95, 1.7], [0.55, 2.1], [0.2, 1.6]] as const) {
          const ang = back + side * spread;
          const tx = Math.cos(ang) * r * len, ty = Math.sin(ang) * r * len;
          const mx = Math.cos(ang - side * 0.25) * r * (len * 0.6);
          const my = Math.sin(ang - side * 0.25) * r * (len * 0.6);
          ctx.beginPath();
          ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.lineTo(mx, my);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          // Membrane sheen along the leading edge.
          ctx.strokeStyle = withAlpha(ramp.highlight, 0.35);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
          ctx.strokeStyle = withAlpha(ramp.outline, 0.8);
          ctx.lineWidth = 1.2;
        }
      }
    }
  });
}

/** White flash variant of an adorn sprite. */
export function adornFlashSprite(look: BodyLook): HTMLCanvasElement | null {
  const base = adornSprite(look);
  if (!base) return null;
  const half = spriteHalf(look.radius);
  const key = `adornF|${look.adorn}|${look.radius.toFixed(1)}|${look.color}|${look.material ?? ''}|${look.demonHorns ? 'd' : ''}`;
  return baked(key, half * 2, half * 2, (ctx) => {
    ctx.drawImage(base, -half, -half);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-half, -half, half * 2, half * 2);
  });
}
