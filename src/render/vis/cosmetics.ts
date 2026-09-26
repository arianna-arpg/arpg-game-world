import { drawCosmeticMotif, drawCosmeticPortal, drawCosmeticProjectile, drawCosmeticHotbar, cosmeticHotbar } from './cosmeticEffects';
import { MU_CFG } from '../../data/mu';
import { SKILLS } from '../../data/skills';
import { MONSTERS } from '../../data/monsters';
import type { Actor } from '../../engine/actor';
import type { World } from '../../engine/world';
import type { CosmeticLoadout, CosmeticPaint, CosmeticSlot } from '../../engine/cosmetics';
import { COSMETIC_CFG } from '../../data/cosmetics';
import { cosmeticLoadoutFor, cosmeticPick, cosmeticSkillColor } from '../../meta/cosmetics';
import { bodySprite, adornSprite, spriteHalf, drawLiveParts, lookOf, type BodyLook } from './body';

export function cosmeticBody(look: BodyLook, loadout: CosmeticLoadout | undefined, summon = false, wisp = false,
  source?: { defId?: string; skill?: string }): BodyLook {
  if (wisp) {
    const paint = cosmeticPick(loadout, 'wispSkin')?.paint;
    return paint ? { ...look, look: paint.look ?? look.look, color: paint.color ?? look.color,
      material: paint.material ?? look.material, adorn: paint.adorn } : look;
  }
  if (summon && source?.defId) {
    const bodies = cosmeticPick(loadout, 'skillSkin', source.skill)?.paint.summonBodies;
    const body = bodies && Object.prototype.hasOwnProperty.call(bodies, source.defId) ? bodies[source.defId] : undefined;
    if (body && lookOf(body.look)) look = { ...look, look: body.look,
      color: body.color ?? look.color, material: body.material ?? look.material };
  }
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
    if (!def || actor.cosmeticKind === 'wisp' || actor.owner || actor.dead || actor.downed || actor.flying || actor.leap || world.sailing) {
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

export function drawCosmeticPreview(canvas: HTMLCanvasElement, base: BodyLook, loadout: CosmeticLoadout, time: number, skill?: string, focus?: CosmeticSlot): void {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const { width, height } = canvas;
  const wisp = focus === 'wispSkin', portal = focus === 'portalSkin' || focus === 'portalRecolor';
  const summon = focus === 'skillSkin' ? cosmeticPreviewSummon(skill) : undefined;
  const isolated = wisp || portal || !!summon;
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createRadialGradient(width * 0.5, height * 0.48, 8, width * 0.5, height * 0.48, width * 0.65);
  bg.addColorStop(0, '#283542'); bg.addColorStop(1, '#0d141c'); ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#526473'; ctx.globalAlpha = 0.25;
  for (let r = 40; r <= 140; r += 40) { ctx.beginPath(); ctx.ellipse(width / 2, height * 0.63, r, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 1;
  const steps = cosmeticPick(loadout, 'footprints')?.paint;
  if (!isolated && steps?.motif) for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = 0.12 + i * 0.1;
    drawCosmeticMotif(ctx, steps.motif, steps.color ?? '#d8b8d3', width * 0.25 + i * 15, height * 0.8 - i * 7, 4, i);
  }
  ctx.globalAlpha = 1; ctx.save(); ctx.translate(width * 0.48, height * 0.53);
  const look = summon ? cosmeticBody({ ...summon, radius: COSMETIC_CFG.preview.summonRadius }, loadout, true, false, { defId: summon.id, skill })
    : cosmeticBody(wisp ? { shape: 'circle', ...MU_CFG.wisp, radius: 22 } : { ...base, radius: 24 }, loadout, false, wisp);
  if (portal) { ctx.save(); ctx.translate(0, 13); ctx.scale(1.35, 1.35); drawCosmeticPortal(ctx, loadout, time); ctx.restore(); }
  if (!isolated) drawCosmeticOrbit(ctx, cosmeticPick(loadout, 'playerEffect')?.paint, 30, time);
  const half = spriteHalf(look.radius);
  ctx.rotate(-Math.PI / 2);
  if (!portal) { ctx.drawImage(bodySprite(look), -half, -half); const live = lookOf(look.look); if (live) drawLiveParts(ctx, look, live, time); }
  const cosmeticAdorn = !portal ? cosmeticPick(loadout, wisp ? 'wispSkin' : summon ? 'summonSkin' : 'playerSkin')?.paint.adorn : undefined;
  const adorn = adornSprite(cosmeticAdorn ? { ...look, look: undefined } : look); if (!portal && adorn) ctx.drawImage(adorn, -half, -half);
  ctx.restore();
  const kin = cosmeticBody({ shape: 'circle', color: '#a3a5bc', radius: 12, material: 'bone' }, loadout, true);
  const kh = spriteHalf(kin.radius); if (!isolated) ctx.drawImage(bodySprite(kin), width * 0.73 - kh, height * 0.66 - kh);
  const color = cosmeticSkillColor(loadout, skill) ?? '#ebbd76';
  const motif = cosmeticPick(loadout, 'skillSkin', skill)?.paint.motif;
  const projectile = cosmeticPick(loadout, 'skillSkin', skill)?.paint.projectile;
  for (let i = 0; !isolated && i < 3; i++) {
    const x = width * 0.32 + ((time * 30 + i * 28) % 135), y = height * 0.21;
    ctx.save(); ctx.translate(x, y);
    if (!drawCosmeticProjectile(ctx, projectile, color, 5, 0, time)) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    if (motif) drawCosmeticMotif(ctx, motif, color, x, y, 7, time);
  }
  const avatar = cosmeticPick(loadout, 'avatar')?.paint;
  if (avatar?.motif) drawCosmeticMotif(ctx, avatar.motif, avatar.color ?? '#c4b2f2', width - 26, 26, 12, 0);
  if (focus === 'hotbarSkin') {
    const style = cosmeticHotbar(loadout), x = width / 2 - 83, y = height - 42;
    drawCosmeticHotbar(ctx, loadout, x, y, 166, 28);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = style?.fill ?? '#101018'; ctx.strokeStyle = style?.border ?? '#3a3a52'; ctx.lineWidth = 1;
      ctx.fillRect(x + i * 34, y, 28, 28); ctx.strokeRect(x + i * 34, y, 28, 28);
      drawCosmeticMotif(ctx, 'stars', style?.trim ?? '#e2d4b2', x + i * 34 + 14, y + 14, 5);
    }
  }
}

/** Preview a skill's authored body through the same resolver as its live summon. */
export function cosmeticPreviewSummon(skill?: string) {
  const def = skill ? SKILLS[skill] : undefined;
  const monsterId = def?.delivery.type === 'summon' ? def.delivery.monsterId : def?.amalgam?.monsterId;
  return monsterId ? MONSTERS[monsterId] : undefined;
}

export function drawCosmeticSummonTile(canvas: HTMLCanvasElement, id: string, skill?: string): void {
  const ctx = canvas.getContext('2d'), def = cosmeticPreviewSummon(skill);
  if (!ctx || !def) return;
  const look = cosmeticBody({ ...def, radius: 24 }, { slots: { skillSkin: id }, skills: {} }, true, false, { defId: def.id, skill });
  const half = spriteHalf(look.radius);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(-Math.PI / 2);
  ctx.drawImage(bodySprite(look), -half, -half);
  const live = lookOf(look.look); if (live) drawLiveParts(ctx, look, live, 0);
  ctx.restore();
}

/** Catalogue portraits use the very same resolved body and bake as the world. */
export function drawCosmeticModelTile(canvas: HTMLCanvasElement, base: BodyLook, id: string, wisp = false): void {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const look = cosmeticBody({ ...base, radius: 25 }, { slots: { [wisp ? 'wispSkin' : 'playerModel']: id }, skills: {} }, false, wisp);
  const half = spriteHalf(look.radius);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(-Math.PI / 2);
  ctx.drawImage(bodySprite(look), -half, -half); ctx.restore();
}

export { cosmeticLoadoutFor, cosmeticPick, drawCosmeticMotif };
