import { MU_CFG } from '../data/mu';
import type { CosmeticLoadout } from '../engine/cosmetics';
import { cosmeticBody, cosmeticPick, drawCosmeticOrbit } from '../render/vis/cosmetics';
import { bodySprite, adornSprite, spriteHalf, lookOf, drawLiveParts } from '../render/vis/body';
import { SPIRIT_RUN, SpiritRun, spiritLayout } from './spiritRun';

/** Uses Mu's real body/parts and the same wardrobe resolution as the world. */
export function drawSpiritRun(ctx: CanvasRenderingContext2D, width: number, height: number,
  run: SpiritRun, loadout?: CosmeticLoadout, reducedMotion = false): void {
  ctx.clearRect(0, 0, width, height);
  const layout = spiritLayout(width, height, run.direction), point = layout.point;
  const focus = point(650, 0), mist = ctx.createRadialGradient(focus.x, focus.y, 10, width / 2, height / 2, Math.max(width, height) * 0.7);
  mist.addColorStop(0, '#192d35'); mist.addColorStop(0.5, '#101b24'); mist.addColorStop(1, '#070b12');
  ctx.fillStyle = mist; ctx.fillRect(0, 0, width, height);
  const line = (u: number, v: number, u2: number, v2: number): void => {
    const a = point(u, v), b = point(u2, v2); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };
  // Distant columns and currents supply a stable travel bearing.
  ctx.strokeStyle = '#7baba1'; ctx.lineWidth = 1;
  for (const side of [-1, 1]) {
    ctx.globalAlpha = 0.14; line(0, side * 275, 1000, side * 275);
    for (let i = 0; i < 9; i++) {
      const u = ((i * 142 - run.distance * 0.26) % 1280 + 1280) % 1280 - 100;
      ctx.globalAlpha = 0.12; line(u, side * 275, u + 26, side * 254); line(u + 26, side * 254, u + 54, side * 275);
    }
  }
  for (let i = 0; i < 74; i++) {
    const u = ((i * 173.7 - run.distance * (0.18 + (i % 4) * 0.09)) % 1120 + 1120) % 1120 - 60;
    const v = Math.sin(i * 71.2) * 260;
    ctx.globalAlpha = 0.12 + (i % 5) * 0.045; ctx.strokeStyle = i % 3 ? '#97d8cb' : '#d5bb87';
    line(u, v, u + (reducedMotion ? 2 : 4 + run.speed * 3), v);
  }
  for (const gate of run.gates) {
    ctx.globalAlpha = gate.resolved ? (gate.hit ? 0.32 : 0.18) : 0.85;
    const color = gate.hit ? '#da8a89' : '#79bdb2';
    for (const side of [-1, 1]) {
      const inner = gate.gap + side * SPIRIT_RUN.gateGap / 2, outer = side * SPIRIT_RUN.halfWidth;
      const a = point(gate.u - SPIRIT_RUN.gateThickness / 2, inner), b = point(gate.u + SPIRIT_RUN.gateThickness / 2, outer);
      ctx.fillStyle = '#233b43'; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(a.x - b.x), Math.abs(a.y - b.y));
      ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(a.x - b.x), Math.abs(a.y - b.y));
      const p = point(gate.u, inner);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = reducedMotion ? 0 : 15;
      const r = 6 * layout.scale; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
      for (let j = 1; j < 6; j++) {
        const v = inner + (outer - inner) * j / 6;
        line(gate.u - 4, v - 3, gate.u + 4, v + 3);
      }
    }
  }
  ctx.globalAlpha = 1;
  const look = cosmeticBody({ shape: 'circle', ...MU_CFG.wisp, radius: 22 }, loadout, false, true);
  const color = look.color, p = point(run.playerU, run.lane);
  // Trail length and light strengthen with the streak. Impact visibly binds it.
  if (!reducedMotion) for (let i = 13; i > 0; i--) {
    const tr = point(run.playerU - i * (5 + run.speed * 1.8), run.lane + Math.sin(run.time * 4 - i * 0.3) * i * 0.45);
    ctx.globalAlpha = (1 - i / 14) * 0.28; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(tr.x, tr.y, (14 - i * 0.7) * layout.scale, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.save(); ctx.translate(p.x, p.y);
  ctx.scale(layout.scale, layout.scale);
  drawCosmeticOrbit(ctx, cosmeticPick(loadout, 'playerEffect')?.paint, 28, reducedMotion ? 0 : run.time);
  if (run.hinder) {
    ctx.strokeStyle = '#e0a19a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.7;
  }
  ctx.rotate(run.direction === 'down' ? Math.PI / 2 : run.direction === 'left' ? Math.PI : 0);
  const half = spriteHalf(look.radius); ctx.drawImage(bodySprite(look), -half, -half);
  const live = lookOf(look.look); if (live) drawLiveParts(ctx, look, live, reducedMotion ? 0 : run.time);
  const customAdorn = cosmeticPick(loadout, 'wispSkin')?.paint.adorn;
  const adorn = adornSprite(customAdorn ? { ...look, look: undefined } : look);
  if (adorn) ctx.drawImage(adorn, -half, -half);
  ctx.restore(); ctx.globalAlpha = 1;
}
