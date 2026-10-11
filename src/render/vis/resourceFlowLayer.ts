import { RESOURCE_FLOW as C, RESOURCE_VISUALS, type ResourceMaterial } from '../../data/resourceVisuals';
import type { ResourceFlowCue } from '../../engine/feedingCues';
type Point = { x: number; y: number };

function ink(ctx: CanvasRenderingContext2D, color: string, width: number, fill = false, outline = 2) {
  ctx.strokeStyle = C.outline; ctx.lineWidth = width + outline; ctx.stroke();
  if (fill) { ctx.fillStyle = color; ctx.fill(); }
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
/** Points toward +X. Blood stretches into a taper, mana folds into a split
 * needle, shields retain an open plate, and charge pickups have a flame crest. */
export function drawResourceMark(ctx: CanvasRenderingContext2D, material: ResourceMaterial,
  x: number, y: number, angle: number, size: number, color: string, stretch = 1): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(size, size);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
  if (material === 'life') {
    ctx.moveTo(-2.5 * stretch, 0);
    ctx.bezierCurveTo(-0.8, -0.2, -0.1, -0.95, 0.55, -0.65);
    ctx.bezierCurveTo(1.7, -0.15, 1.25, 1.1, 0.3, 0.75);
    ctx.bezierCurveTo(-0.4, 0.6, -0.8, 0.1, -2.5 * stretch, 0);
    ctx.closePath(); ink(ctx, color, 0.2, true, 0.5);
  } else if (material === 'mana') {
    ctx.moveTo(-2.3 * stretch, -0.55); ctx.lineTo(0, -0.8); ctx.lineTo(1.4, 0);
    ctx.lineTo(0, 0.8); ctx.lineTo(-2.3 * stretch, 0.55); ctx.lineTo(-0.6, 0); ctx.closePath();
    ink(ctx, color, 0.22, true, 0.5);
  } else if (material === 'flame') {
    ctx.moveTo(-1.8, 0); ctx.quadraticCurveTo(-0.1, -1.5, 1.3, -0.55);
    ctx.quadraticCurveTo(2.4, 0.35, 0.3, 1); ctx.quadraticCurveTo(1.2, 0.15, -1.8, 0);
    ctx.closePath(); ink(ctx, color, 0.18, true, 0.5);
  } else {
    ctx.moveTo(-0.9, -1); ctx.lineTo(0.7, -0.8); ctx.lineTo(1.4, 0);
    ctx.lineTo(0.7, 0.8); ctx.lineTo(-0.9, 1); ink(ctx, color, 0.28, false, 0.5);
    ctx.beginPath(); ctx.moveTo(-1.4, -0.65); ctx.lineTo(-1.05, 0); ctx.lineTo(-1.4, 0.65); ink(ctx, color, 0.18, false, 0.5);
  }
  ctx.restore();
}

/** A segmented, accelerating pull. This is a receipt of an already paid gain,
 * not a simulated projectile; both endpoints stay at the actual transaction. */
export function drawResourceFlow(ctx: CanvasRenderingContext2D, row: ResourceFlowCue): void {
  const { from, to, resource, color } = row, style = RESOURCE_VISUALS[resource];
  const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy);
  if (!(row.left > 0) || !Number.isFinite(length + row.age) || length < 2) return;
  const nx = -dy / length, ny = dx / length;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha *= Math.min(1, row.left / 0.16) * row.strength;
  const point = (p: number, lane: number): Point => {
    const bend = Math.sin(p * Math.PI) * style.curl * lane;
    return { x: from.x + dx * p + nx * bend, y: from.y + dy * p + ny * bend };
  };
  for (let i = 0; i < style.pieces; i++) {
    const phase = (row.age / C.life * 1.45 + i / style.pieces) % 1;
    const p = phase * phase, lane = i % 2 ? 1 : -1;
    const head = point(p, lane), tail = point(Math.max(0, p - Math.min(0.17, 28 / length)), lane);
    ctx.save(); ctx.globalAlpha *= Math.sin(phase * Math.PI) * 0.95;
    ctx.beginPath(); ctx.moveTo(tail.x, tail.y);
    if (resource === 'life') {
      const mid = point((p + Math.max(0, p - 0.13)) / 2, lane);
      ctx.quadraticCurveTo(mid.x, mid.y, head.x, head.y);
    } else ctx.lineTo(head.x, head.y);
    ink(ctx, color, resource === 'life' ? 1.5 : 0.7);
    drawResourceMark(ctx, resource, head.x, head.y, Math.atan2(head.y - tail.y, head.x - tail.x),
      resource === 'life' ? 2.6 : 2.2, color, 0.8 + phase * 0.4);
    ctx.restore();
  }
  ctx.restore();
}

/** Homing pickups carry a short wake behind their REAL position. No ribbon
 * reaches the recipient before the pickup does; the pour still occurs on arrival. */
export function drawResourcePickup(ctx: CanvasRenderingContext2D, row: {
  pos: Point; bob: number; life: number; to?: Point; material: ResourceMaterial; color: string; size: number;
}): void {
  const { pos, material, color, size, to } = row;
  const angle = to ? Math.atan2(to.y - pos.y, to.x - pos.x) : -Math.PI / 2;
  const y = pos.y + (to ? 0 : Math.sin(row.bob) * 2.5);
  ctx.save(); ctx.globalAlpha *= Math.min(1, row.life / 2) * 0.95;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (to) {
    ctx.save(); ctx.translate(pos.x, y); ctx.rotate(angle);
    for (let i = 0; i < 2; i++) {
      const curl = Math.sin(row.bob * 2 + i * Math.PI) * (material === 'life' ? 4 : 2);
      ctx.save(); ctx.globalAlpha *= 0.65 - i * 0.2; ctx.beginPath(); ctx.moveTo(-2, 0);
      if (material === 'life') ctx.bezierCurveTo(-12, curl, -22, -curl, -C.tail, curl);
      else { ctx.lineTo(-12, curl); ctx.lineTo(-C.tail, -curl); }
      ink(ctx, color, 1.5 - i * 0.5); ctx.restore();
    }
    ctx.restore();
  }
  const pulse = material === 'flame' ? 1 + Math.sin(row.bob * 2) * 0.12 : 1;
  drawResourceMark(ctx, material, pos.x, y, angle, size * 0.65 * pulse, color, to ? 1.35 : 0.65);
  ctx.restore();
}
