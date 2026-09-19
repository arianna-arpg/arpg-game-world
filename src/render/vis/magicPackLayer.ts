import type { Actor } from '../../engine/actor';
import type { MagicPackVisual } from '../../engine/magicPackMechanics';
import { MAGIC_PACK_CFG, MAGIC_PACKS } from '../../data/magicPacks';

/** Both warning and hurt surfaces are host geometry. Cosmetic flow never
 * changes the tested width, endpoints, angle or timing. */
export function drawMagicPackEffects(ctx: CanvasRenderingContext2D, rows: readonly MagicPackVisual[], time: number): void {
  ctx.save(); ctx.lineCap = 'round';
  const circles = new Set<string>();
  for (const row of rows) {
    ctx.strokeStyle = ctx.fillStyle = row.color;
    ctx.setLineDash([]);
    if (row.kind === 'siphon') {
      ctx.globalAlpha = 0.4; ctx.lineWidth = row.width;
      ctx.beginPath(); ctx.moveTo(row.ax, row.ay); ctx.lineTo(row.bx, row.by); ctx.stroke();
      ctx.globalAlpha = 0.95;
      for (let i = 0; i < 3; i++) {
        const t = (time * 0.8 + i / 3) % 1;
        ctx.beginPath(); ctx.arc(row.ax + (row.bx - row.ax) * t, row.ay + (row.by - row.ay) * t, 3, 0, Math.PI * 2); ctx.fill();
      }
      continue;
    }
    if (row.kind === 'grave' && row.radius !== undefined) {
      const key = `${row.pack}:${row.cx}:${row.cy}`;
      if (!circles.has(key)) {
        circles.add(key); ctx.globalAlpha = row.warning ? 0.22 : 0.13;
        ctx.lineWidth = 1.5; ctx.setLineDash(row.warning ? [5, 6] : []);
        ctx.beginPath(); ctx.arc(row.cx!, row.cy!, row.radius, 0, Math.PI * 2); ctx.stroke();
        // A fixed hub remains visible between rotating spokes.
        ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(row.cx!, row.cy!, 5, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.setLineDash([]); ctx.lineWidth = row.width * 2;
    ctx.globalAlpha = row.warning ? 0.12 + row.progress * 0.12 : 0.48;
    ctx.beginPath(); ctx.moveTo(row.ax, row.ay); ctx.lineTo(row.bx, row.by); ctx.stroke();
    ctx.setLineDash(row.warning ? [7, 6] : []);
    ctx.lineWidth = row.warning ? 2 : 3.5; ctx.globalAlpha = row.warning ? 0.65 + row.progress * 0.3 : 1;
    ctx.stroke();
    if (row.kind === 'beam' && row.warning) for (const [x, y] of [[row.ax, row.ay], [row.bx, row.by]]) {
      ctx.setLineDash([]); ctx.beginPath(); ctx.arc(x, y, 16 + 12 * (1 - row.progress), 0, Math.PI * 2 * row.progress); ctx.stroke();
    }
  }
  ctx.restore();
}

/** Drawn around the body's local origin, in the same transform as its rarity
 * ring. A broken gold ring is a weak point; a closed blue ring is protection.
 * Siphon recipients instead wear an inward-pointing amber crown. */
export function drawMagicPackRole(ctx: CanvasRenderingContext2D, a: Actor, time: number): void {
  const def = a.magicPack && MAGIC_PACKS[a.magicPack.mechanic];
  if (!def?.bearer || (!a.magicPackRole && !a.magicPackPending)) return;
  const cfg = MAGIC_PACK_CFG.roleTell, r = a.radius + cfg.radius;
  ctx.save(); ctx.lineWidth = cfg.width; ctx.lineCap = 'round';
  const siphon = !!def.bearer.siphonRadius;
  if (a.magicPackRole === 'bearer') {
    ctx.strokeStyle = def.bearer.color;
    ctx.globalAlpha = 0.85 + Math.sin(time * 5) * 0.15;
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      ctx.beginPath(); ctx.arc(0, 0, r, angle + 0.15, angle + Math.PI / 2 - 0.35); ctx.stroke();
      // The notch points IN to the exposed body / empowered siphoner.
      ctx.beginPath(); ctx.moveTo(Math.cos(angle) * (r + 6), Math.sin(angle) * (r + 6));
      ctx.lineTo(Math.cos(angle + 0.18) * r, Math.sin(angle + 0.18) * r);
      ctx.lineTo(Math.cos(angle) * (r - (siphon ? 5 : 2)), Math.sin(angle) * (r - (siphon ? 5 : 2))); ctx.stroke();
    }
  } else if (a.magicPackRole === 'donor') {
    ctx.strokeStyle = cfg.donorColor; ctx.globalAlpha = 0.75; ctx.setLineDash([2, 5]);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  } else if (!siphon && a.magicPackRole === 'member') {
    ctx.strokeStyle = cfg.protectedColor; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  }
  if (a.magicPackPending > 0) {
    ctx.strokeStyle = def.bearer.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.55 + a.magicPackPending * 0.45;
    ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(0, 0, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * a.magicPackPending); ctx.stroke();
  }
  ctx.restore();
}
