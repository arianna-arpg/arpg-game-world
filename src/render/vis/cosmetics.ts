import type { Actor } from '../../engine/actor';
import type { World } from '../../engine/world';
import type { CosmeticLoadout, CosmeticMotif, CosmeticPaint } from '../../engine/cosmetics';
import { COSMETIC_CFG } from '../../data/cosmetics';
import { cosmeticLoadoutFor, cosmeticPick, cosmeticSkillColor } from '../../meta/cosmetics';
import { bodySprite, adornSprite, spriteHalf, type BodyLook } from './body';

/** Shared visual vocabulary: the world, catalogue tiles and preview use the same painters. */
export function drawCosmeticMotif(ctx: CanvasRenderingContext2D, motif: CosmeticMotif, color: string,
  x: number, y: number, radius: number, phase = 0): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(phase); ctx.fillStyle = color;
  ctx.beginPath();
  if (motif === 'stars') {
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4, r = i % 2 ? radius * 0.26 : radius;
      if (!i) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath(); ctx.fill();
  } else if (motif === 'petals') {
    for (let i = 0; i < 5; i++) {
      ctx.rotate(Math.PI * 2 / 5); ctx.beginPath();
      ctx.ellipse(radius * 0.48, 0, radius * 0.55, radius * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff2d2'; ctx.beginPath(); ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.moveTo(0, -radius); ctx.quadraticCurveTo(radius, radius * 0.2, 0, radius);
    ctx.quadraticCurveTo(-radius * 0.8, radius * 0.2, 0, -radius); ctx.fill();
  }
  ctx.restore();
}
export function cosmeticBody(look: BodyLook, loadout: CosmeticLoadout | undefined, summon = false): BodyLook {
  const model = !summon ? cosmeticPick(loadout, 'playerModel')?.paint : undefined;
  if (model?.look) look = { ...look, look: model.look, color: model.color ?? look.color, material: model.material ?? look.material };
  const p = cosmeticPick(loadout, summon ? 'summonSkin' : 'playerSkin')?.paint;
  return p ? { ...look, color: p.color ?? look.color, material: p.material ?? look.material, adorn: p.adorn ?? look.adorn } : look;
}
export function drawCosmeticOrbit(ctx: CanvasRenderingContext2D, paint: CosmeticPaint | undefined, radius: number, time: number): void {
  if (!paint?.motif) return;
  const cfg = COSMETIC_CFG.effect;
  ctx.save(); ctx.globalAlpha *= cfg.opacity;
  for (let i = 0; i < cfg.orbitCount; i++) {
    const phase = time * 0.6 + i * Math.PI * 2 / cfg.orbitCount;
    drawCosmeticMotif(ctx, paint.motif, paint.color ?? '#d5c3f2',
      Math.cos(phase) * radius * cfg.radiusScale, Math.sin(phase) * radius * cfg.radiusScale,
      2.4 + Math.sin(time * 1.8 + i) * 0.6, phase);
  }
  ctx.restore();
}

interface Step { x: number; y: number; at: number; phase: number }
interface Trail { zone: object; at: number; x: number; y: number; id: string; side: number; steps: Step[] }
/** Weak actor keys and a per-actor cap bound memory. Simulation time freezes trails
 *  with menus; zone changes, teleports, equip changes and rewinds reset them. No RNG. */
export class CosmeticTrails {
  private trails = new WeakMap<Actor, Trail>();
  draw(ctx: CanvasRenderingContext2D, world: World, actor: Actor, loadout: CosmeticLoadout | undefined): void {
    const def = cosmeticPick(loadout, 'footprints'), cfg = COSMETIC_CFG.footprints;
    if (!def || actor.owner || actor.dead || actor.downed || actor.flying || actor.leap || world.sailing) {
      this.trails.delete(actor); return;
    }
    let tr = this.trails.get(actor);
    const distance = tr ? Math.hypot(actor.pos.x - tr.x, actor.pos.y - tr.y) : 0;
    if (!tr || tr.zone !== world.zone || tr.id !== def.id || world.time < tr.at || distance > cfg.teleportDistance) {
      this.trails.set(actor, { zone: world.zone, at: world.time, x: actor.pos.x, y: actor.pos.y, id: def.id, side: 1, steps: [] });
      return;
    }
    if (distance >= cfg.spacing && world.time > tr.at) {
      const dir = Math.atan2(actor.pos.y - tr.y, actor.pos.x - tr.x);
      tr.side *= -1;
      tr.steps.push({ x: actor.pos.x - Math.sin(dir) * 4 * tr.side,
        y: actor.pos.y + Math.cos(dir) * 4 * tr.side, at: world.time, phase: dir });
      tr.x = actor.pos.x; tr.y = actor.pos.y;
    }
    tr.at = world.time;
    tr.steps = tr.steps.filter(s => world.time - s.at < cfg.lifetime).slice(-cfg.maxPerActor);
    for (const s of tr.steps) {
      ctx.save(); ctx.globalAlpha *= 0.65 * (1 - (world.time - s.at) / cfg.lifetime);
      drawCosmeticMotif(ctx, def.paint.motif ?? 'stars', def.paint.color ?? '#c4b2f2',
        s.x - actor.pos.x, s.y - actor.pos.y, 3.7, s.phase); ctx.restore();
    }
  }
}

export function drawCosmeticPreview(canvas: HTMLCanvasElement, base: BodyLook, loadout: CosmeticLoadout, time: number, skill?: string): void {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createRadialGradient(width * 0.5, height * 0.48, 8, width * 0.5, height * 0.48, width * 0.65);
  bg.addColorStop(0, '#283542'); bg.addColorStop(1, '#0d141c'); ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#526473'; ctx.globalAlpha = 0.25;
  for (let r = 40; r <= 140; r += 40) { ctx.beginPath(); ctx.ellipse(width / 2, height * 0.63, r, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 1;
  const steps = cosmeticPick(loadout, 'footprints')?.paint;
  if (steps?.motif) for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = 0.12 + i * 0.1;
    drawCosmeticMotif(ctx, steps.motif, steps.color ?? '#d8b8d3', width * 0.25 + i * 15, height * 0.8 - i * 7, 4, i);
  }
  ctx.globalAlpha = 1; ctx.save(); ctx.translate(width * 0.48, height * 0.53);
  const look = cosmeticBody({ ...base, radius: 24 }, loadout);
  drawCosmeticOrbit(ctx, cosmeticPick(loadout, 'playerEffect')?.paint, 30, time);
  const half = spriteHalf(look.radius);
  ctx.rotate(-Math.PI / 2); ctx.drawImage(bodySprite(look), -half, -half);
  const cosmeticAdorn = cosmeticPick(loadout, 'playerSkin')?.paint.adorn;
  const adorn = adornSprite(cosmeticAdorn ? { ...look, look: undefined } : look); if (adorn) ctx.drawImage(adorn, -half, -half);
  ctx.restore();
  const kin = cosmeticBody({ shape: 'circle', color: '#a3a5bc', radius: 12, material: 'bone' }, loadout, true);
  const kh = spriteHalf(kin.radius); ctx.drawImage(bodySprite(kin), width * 0.73 - kh, height * 0.66 - kh);
  const color = cosmeticSkillColor(loadout, skill) ?? '#ebbd76';
  const motif = cosmeticPick(loadout, 'skillSkin', skill)?.paint.motif;
  for (let i = 0; i < 3; i++) {
    const x = width * 0.32 + ((time * 30 + i * 28) % 135), y = height * 0.21;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    if (motif) drawCosmeticMotif(ctx, motif, color, x, y, 7, time);
  }
  const avatar = cosmeticPick(loadout, 'avatar')?.paint;
  if (avatar?.motif) drawCosmeticMotif(ctx, avatar.motif, avatar.color ?? '#c4b2f2', width - 26, 26, 12, 0);
}

/** Catalogue portraits use the very same resolved body and bake as the world. */
export function drawCosmeticModelTile(canvas: HTMLCanvasElement, base: BodyLook, id: string): void {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const look = cosmeticBody({ ...base, radius: 25 }, { slots: { playerModel: id }, skills: {} });
  const half = spriteHalf(look.radius);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(-Math.PI / 2);
  ctx.drawImage(bodySprite(look), -half, -half); ctx.restore();
}

export { cosmeticLoadoutFor, cosmeticPick };
