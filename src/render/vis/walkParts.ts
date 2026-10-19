import type { BodyWalkPose } from '../../engine/bodyWalk';
import { bodyKey, spriteHalf, type BodyLook } from './body';
import { lookPalette, paintWalkLink, PART_PAINTERS, type WalkLook } from './parts';
import { baked } from './sprites';
import { registerVisCache } from './caches';
import { BODY_WALK_CFG } from '../../data/bodyWalk';

const palettes = new Map<string, ReturnType<typeof lookPalette>>();
registerVisCache({ id: 'walkPalettes', count: () => palettes.size,
  onZoneSwap: () => palettes.clear(), onRunSwap: () => palettes.clear() });
function paletteOf(look: BodyLook): ReturnType<typeof lookPalette> {
  const key = look.color + '|' + (look.material ?? '');
  let palette = palettes.get(key);
  if (!palette) palette = lookPalette(look.color, look.material);
  palettes.delete(key); palettes.set(key, palette);
  while (palettes.size > Math.max(1, BODY_WALK_CFG.paletteEntries)) palettes.delete(palettes.keys().next().value!);
  return palette;
}

/** Under-body limbs use fixed cached artwork; animation never creates keys. */
export function drawWalkParts(ctx: CanvasRenderingContext2D, look: BodyLook,
  gait: WalkLook, facing: number, pose?: BodyWalkPose): void {
  const half = spriteHalf(look.radius), phase = (pose?.travel ?? 0) / Math.max(.1, gait.cycle) * Math.PI * 2;
  const direction = (pose?.direction ?? facing) - facing;
  const swing = Math.sin(phase) * gait.swing * (pose?.weight ?? 0) * look.radius;
  const palette = paletteOf(look);
  gait.parts.forEach((spec, index) => {
    const sprite = baked('walkPart|' + bodyKey(look) + '|' + index, half * 2, half * 2, c => {
      PART_PAINTERS[spec.kind]?.(c, look.radius, spec, palette);
    });
    const side = spec.phase ?? 1;
    const dx = Math.cos(direction) * swing * side, dy = Math.sin(direction) * swing * side;
    paintWalkLink(ctx, look.radius, spec, palette, dx, dy);
    ctx.drawImage(sprite, -half + dx, -half + dy);
  });
}

/** The torso settles independently above planted feet. Ground anchors stay put. */
export function applyWalkBodyPose(ctx: CanvasRenderingContext2D, radius: number,
  gait: WalkLook, pose?: BodyWalkPose): void {
  if (!pose) return;
  const phase = pose.travel / Math.max(.1, gait.cycle) * Math.PI * 2;
  ctx.rotate(Math.sin(phase) * gait.sway * pose.weight);
  const lift = Math.abs(Math.sin(phase)) * gait.lift * pose.weight * radius;
  ctx.translate(0, -lift);
}
