import type { CosmeticDef, CosmeticLoadout } from '../../engine/cosmetics';
import { drawCosmeticMotif } from './cosmeticMotif';
export { drawCosmeticMotif } from './cosmeticMotif';
import { cosmeticPick } from '../../meta/cosmetics';
import { COSMETIC_PROJECTILES, COSMETIC_PORTALS, COSMETIC_HOTBARS, INVENTORY_HOTBAR, type CosmeticHotbarStyle, cosmeticStyle } from '../../data/cosmeticStyles';
import { TOWN_PORTAL_CFG } from '../../data/townportals';
import { lookPalette, paintGlyph } from './parts';

export function cosmeticProjectileExtent(id?: string): number {
  return cosmeticStyle(COSMETIC_PROJECTILES, id)?.extent ?? 0;
}
/** True means a skin painted the body. No projectile/simulation object is mutated. */
export function drawCosmeticProjectile(ctx: CanvasRenderingContext2D, id: string | undefined,
  color: string, radius: number, facing: number, age: number): boolean {
  const style = cosmeticStyle(COSMETIC_PROJECTILES, id); if (!style) return false;
  ctx.save(); ctx.rotate(facing + style.spin * age);
  paintGlyph(ctx, radius, { kind: id! }, lookPalette(color), style.glyph, age);
  ctx.restore(); return true;
}
export function cosmeticPortalColor(loadout?: CosmeticLoadout): string {
  return cosmeticPick(loadout, 'portalRecolor')?.paint.color ?? cosmeticPick(loadout, 'portalSkin')?.paint.color ?? TOWN_PORTAL_CFG.color;
}
/** Same painter for both ends, the world and the Wardrobe. The return label and
 *  dwell progress stay with the travel system; these are only the animated rings. */
export function drawCosmeticPortal(ctx: CanvasRenderingContext2D, loadout: CosmeticLoadout | undefined, time: number): void {
  const v = TOWN_PORTAL_CFG.visual, color = cosmeticPortalColor(loadout);
  const style = cosmeticStyle(COSMETIC_PORTALS, cosmeticPick(loadout, 'portalSkin')?.paint.portal);
  ctx.save(); ctx.translate(0, -v.height / 2); ctx.strokeStyle = color; ctx.lineWidth = v.lineWidth;
  ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.fillStyle = style?.fill ?? 'rgba(16,35,68,0.8)';
  ctx.beginPath(); ctx.ellipse(0, 0, v.radius, v.height, 0, 0, Math.PI * 2); ctx.fill();
  if (!style) ctx.stroke();
  ctx.shadowBlur = 0;
  if (!style) {
    ctx.globalAlpha *= .65;
    for (let n = 0; n < 3; n++) {
      const turn = time * 1.4 + n * Math.PI * 2 / 3;
      ctx.beginPath(); ctx.ellipse(0, 0, v.radius * .65, v.height * .8, 0, turn, turn + Math.PI / 2); ctx.stroke();
    }
  } else {
    for (const ring of style.rings) {
      const size = ring.radius * (1 + (ring.pulse ?? 0) * Math.sin(time * 2));
      const rx = v.radius * size, ry = v.height * size * ring.aspect;
      const phase = (ring.phase ?? 0) + ring.spin * time;
      ctx.lineWidth = ring.width;
      if (ring.sides) {
        ctx.beginPath();
        for (let i = 0; i <= ring.sides; i++) {
          const a = phase + i * Math.PI * 2 / ring.sides, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
          if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else for (let i = 0; i < (ring.segments ?? 1); i++) {
        const step = Math.PI * 2 / (ring.segments ?? 1), angle = phase + i * step;
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, angle, angle + step * (ring.arc ?? 1)); ctx.stroke();
      }
    }
    const motes = style.motes;
    if (motes) for (let i = 0; i < motes.count; i++) {
      const angle = time * motes.speed + i * Math.PI * 2 / motes.count;
      drawCosmeticMotif(ctx, motes.motif, color, Math.cos(angle) * v.radius * motes.radius,
        Math.sin(angle) * v.height * motes.radius, motes.size, angle);
    }
  }
  ctx.restore();
}

export function cosmeticHotbar(loadout?: CosmeticLoadout) {
  const finish = cosmeticStyle(COSMETIC_HOTBARS, cosmeticPick(loadout, 'hotbarSkin')?.paint.hotbar) ?? INVENTORY_HOTBAR;
  if (!loadout?.hotbarFrame && !loadout?.hotbarColor) return finish;
  return { ...finish, frame:loadout.hotbarFrame ?? finish.frame, border:loadout.hotbarColor ?? finish.border,
    trim:loadout.hotbarColor ?? finish.trim };
}
export function hotbarFramePath(ctx:CanvasRenderingContext2D, style:CosmeticHotbarStyle, x:number,y:number,w:number,h:number) {
  ctx.beginPath();
  if (style.frame === 'rounded') ctx.roundRect(x,y,w,h,Math.min(6,w*.16,h*.16));
  else if (style.frame === 'chased') {
    const d=Math.min(5,w*.15,h*.15);
    ctx.moveTo(x+d,y);ctx.lineTo(x+w-d,y);ctx.lineTo(x+w,y+d);ctx.lineTo(x+w,y+h-d);
    ctx.lineTo(x+w-d,y+h);ctx.lineTo(x+d,y+h);ctx.lineTo(x,y+h-d);ctx.lineTo(x,y+d);ctx.closePath();
  } else ctx.rect(x,y,w,h);
}
/** Decorative rail below the functional slots: no change to their clickable bounds. */
export function drawCosmeticHotbar(ctx: CanvasRenderingContext2D, loadout: CosmeticLoadout | undefined,
  x: number, y: number, width: number, height: number): void {
  const style = cosmeticHotbar(loadout); if (!style) return;
  ctx.save(); ctx.fillStyle = style.rail; ctx.strokeStyle = style.border; ctx.lineWidth = 1;
  ctx.fillRect(x - 5, y - 5, width + 10, height + 10); ctx.strokeRect(x - 5, y - 5, width + 10, height + 10);
  for (const xx of [x - 4, x + width + 4]) for (const yy of [y - 4, y + height + 4])
    drawCosmeticMotif(ctx, style.motif, style.trim, xx, yy, 4);
  ctx.restore();
}

/** Small, static catalogue samples share the same artwork as live effects. */
export function drawCosmeticStyleTile(canvas: HTMLCanvasElement, def: CosmeticDef, loadout: CosmeticLoadout, color: string): void {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save();
  const preview = { ...loadout, slots: { ...loadout.slots, [def.slot]: def.id } };
  if (def.paint.projectile) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    drawCosmeticProjectile(ctx, def.paint.projectile, color, 9, 0, .25);
  } else if (def.paint.portal) {
    ctx.translate(canvas.width / 2, canvas.height / 2 + 9); ctx.scale(.58, .58);
    drawCosmeticPortal(ctx, preview, .6);
  } else if (def.paint.hotbar) {
    const theme = cosmeticHotbar(preview);
    drawCosmeticHotbar(ctx, preview, 20, 20, 120, 24);
    ctx.strokeStyle = theme?.border ?? '#3a3a52'; ctx.fillStyle = theme?.fill ?? '#101018';
    for (let i = 0; i < 5; i++) { hotbarFramePath(ctx,theme,20+i*25,20,20,24); ctx.fill(); ctx.stroke(); }
  }
  ctx.restore();
}

/** Shared visual vocabulary: the world, catalogue tiles and preview use the same painters. */
