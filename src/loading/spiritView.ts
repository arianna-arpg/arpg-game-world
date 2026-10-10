import { MU_CFG } from '../data/mu';
import type { CosmeticLoadout } from '../engine/cosmetics';
import { cosmeticBody, cosmeticPick, drawCosmeticOrbit } from '../render/vis/cosmetics';
import { bodySprite, adornSprite, spriteHalf, lookOf, drawLiveParts } from '../render/vis/body';
import { SPIRIT_RUN, SPIRIT_PICKUPS, SpiritRun, spiritLayout } from './spiritRun';

/** Uses Mu's real body/parts and the same wardrobe resolution as the world. */
export function drawSpiritRun(ctx: CanvasRenderingContext2D, width: number, height: number,
  run: SpiritRun, loadout?: CosmeticLoadout, reducedMotion = false): void {
  ctx.clearRect(0, 0, width, height);
  const c = SPIRIT_RUN, layout = spiritLayout(width, height, run.direction), point = layout.point, scale = layout.scale;
  const time = reducedMotion ? 0 : run.time;
  const focus = point(650, 0), mist = ctx.createRadialGradient(focus.x, focus.y, 10, width / 2, height / 2, Math.max(width, height) * 0.7);
  mist.addColorStop(0, '#233442'); mist.addColorStop(0.45, '#131f2e'); mist.addColorStop(1, '#070b12');
  ctx.fillStyle = mist; ctx.fillRect(0, 0, width, height);
  const line = (u: number, v: number, u2: number, v2: number): void => {
    const a = point(u, v), b = point(u2, v2); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };
  const path = (coords: readonly (readonly [number, number])[]): void => {
    ctx.beginPath(); coords.forEach(([u, v], i) => { const p = point(u, v); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
  };
  // Broad, quiet ribbons and far pillars give depth without resembling hazards.
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = i % 2 ? '#78a39d' : '#8474bb'; ctx.globalAlpha = 0.035;
    ctx.lineWidth = (18 + i * 7) * scale; ctx.beginPath();
    for (let u = -40; u <= 1040; u += 24) {
      const p = point(u, Math.sin(u * 0.004 + i * 2 + time * 0.1) * 140 + (i - 2) * 54);
      if (u === -40) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = '#7baba1'; ctx.lineWidth = 1;
  for (const side of [-1, 1]) {
    ctx.globalAlpha = 0.17; line(0, side * 275, 1000, side * 275);
    for (let i = 0; i < 9; i++) {
      const u = ((i * 142 - run.distance * 0.26) % 1280 + 1280) % 1280 - 100;
      ctx.globalAlpha = 0.11;
      path([[u - 10, side * 280], [u + 16, side * 242], [u + 38, side * 236], [u + 61, side * 280]]);
      ctx.closePath(); ctx.fillStyle = '#354652'; ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 0.19; line(u + 23, side * 251, u + 31, side * 251);
    }
  }
  for (let i = 0; i < 88; i++) {
    const u = ((i * 173.7 - run.distance * (0.18 + (i % 4) * 0.09)) % 1120 + 1120) % 1120 - 60;
    const v = Math.sin(i * 71.2) * 260;
    ctx.globalAlpha = 0.1 + (i % 5) * 0.038; ctx.strokeStyle = i % 3 ? '#97d8cb' : '#d5bb87';
    line(u, v, u + (reducedMotion ? 2 : 4 + run.speed * 4), v);
  }
  for (const gate of run.gates) {
    ctx.save(); ctx.globalAlpha = gate.resolved ? (gate.hit ? 0.35 : 0.17) : 0.92;
    const narrow = gate.width < 154, color = gate.hit ? '#e89895' : narrow ? '#a6b1df' : '#8ac8bf';
    for (const side of [-1, 1]) {
      const inner = gate.gap + side * gate.width / 2, outer = side * c.halfWidth, half = c.gateThickness / 2;
      const a = point(gate.u - half, inner), b = point(gate.u + half, outer);
      const tip = point(gate.u, inner), end = point(gate.u, outer);
      const stone = ctx.createLinearGradient(tip.x, tip.y, end.x, end.y);
      stone.addColorStop(0, gate.hit ? '#674448' : '#456174'); stone.addColorStop(0.18, '#2b3e50'); stone.addColorStop(1, '#14242e');
      // The luminous field occupies exactly the tested rectangular solid.
      ctx.fillStyle = stone; ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, scale);
      ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(a.x - b.x), Math.abs(a.y - b.y));
      ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(a.x - b.x), Math.abs(a.y - b.y));
      ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = reducedMotion ? 0 : 13 * scale;
      ctx.lineWidth = 3 * scale; line(gate.u - half, inner, gate.u + half, inner); ctx.restore();
      ctx.fillStyle = color;
      path([[gate.u, inner + side * 4], [gate.u + 7, inner + side * 15], [gate.u, inner + side * 27], [gate.u - 7, inner + side * 15]]);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c3e6dd'; ctx.lineWidth = Math.max(0.7, scale * 0.7);
      const count = Math.floor(Math.abs(outer - inner) / 27);
      for (let j = 1; j < count; j++) {
        const v = inner + (outer - inner) * j / count;
        const design = (gate.id + j) % 3;
        if (design === 0) { line(gate.u - 4, v - 4, gate.u + 4, v + 4); line(gate.u - 4, v + 4, gate.u + 4, v - 4); }
        else if (design === 1) { path([[gate.u - 4, v - 3], [gate.u + 4, v], [gate.u - 4, v + 3]]); ctx.stroke(); }
        else { line(gate.u, v - 4, gate.u, v + 4); line(gate.u - 4, v, gate.u + 4, v); }
      }
    }
    ctx.restore();
  }
  // Joined diamonds mark one offer pair. The quiet link dissolves on selection.
  for (const pickup of run.pickups) {
    const def = SPIRIT_PICKUPS[pickup.kind], p = point(pickup.u, pickup.lane);
    if (pickup.state === 'taken') continue;
    const sibling = run.pickups.find(other => other.choice === pickup.choice && other.id > pickup.id);
    if (sibling && pickup.state === 'live') {
      ctx.globalAlpha = 0.15; ctx.strokeStyle = '#a9abc0'; ctx.lineWidth = 1; ctx.setLineDash([2 * scale, 7 * scale]);
      line(pickup.u, pickup.lane + 25 * Math.sign(sibling.lane - pickup.lane), sibling.u, sibling.lane - 25 * Math.sign(sibling.lane - pickup.lane));
      ctx.setLineDash([]);
    }
    ctx.save(); ctx.globalAlpha = pickup.state === 'released' ? 0.45 * (1 - pickup.fade / c.pickupFade) : 1;
    ctx.translate(p.x, p.y); ctx.scale(scale, scale);
    const pulse = 1 + Math.sin(time * 3 + pickup.id) * 0.07;
    const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, 33 * pulse);
    glow.addColorStop(0, def.color + '75'); glow.addColorStop(0.45, def.color + '26'); glow.addColorStop(1, def.color + '00');
    ctx.fillStyle = glow; ctx.fillRect(-36, -36, 72, 72);
    ctx.strokeStyle = def.color; ctx.fillStyle = def.color; ctx.lineWidth = 1.3;
    ctx.save(); ctx.rotate(run.direction === 'down' ? Math.PI / 2 : run.direction === 'left' ? Math.PI : 0);
    if (def.shape === 'pearl') {
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.quadraticCurveTo(2, -14, -18, 0); ctx.quadraticCurveTo(2, 14, 9, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 14, -1, 1); ctx.stroke();
    } else if (def.shape === 'diamond') {
      for (const r of [11, 19]) { ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.lineTo(0, -r); ctx.closePath(); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.bezierCurveTo(1, -12, -7, -13, -20, -10);
      ctx.lineTo(-8, 0); ctx.lineTo(-20, 10); ctx.bezierCurveTo(-7, 13, 1, 12, 12, 0); ctx.fill();
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-25 - i * 8, -5); ctx.lineTo(-20 - i * 8, 0); ctx.lineTo(-25 - i * 8, 5); ctx.stroke(); }
    }
    ctx.fillStyle = '#f4f7ed'; ctx.beginPath(); ctx.arc(2, 0, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = def.color; ctx.font = `${Math.max(11, 9 / scale)}px system-ui`; ctx.textAlign = 'center';
    ctx.fillText('+' + def.points, 0, 32);
    ctx.restore();
  }
  for (const burst of run.bursts) {
    const f = burst.age / c.burstSeconds, p = point(burst.u, burst.lane);
    const color = burst.kind === 'impact' ? '#efa2a0' : burst.kind === 'gate' ? '#a2d9ce' : SPIRIT_PICKUPS[burst.kind].color;
    ctx.save(); ctx.globalAlpha = 1 - f; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.3 * scale;
    if (!reducedMotion) {
      ctx.beginPath(); ctx.arc(p.x, p.y, (18 + f * 40) * scale, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 9; i++) {
        const phase = i * Math.PI * 2 / 9, radius = 12 + f * 55;
        const at = point(burst.u + Math.cos(phase) * radius, burst.lane + Math.sin(phase) * radius);
        ctx.fillRect(at.x - 1, at.y - 1, 2 * scale, 2 * scale);
      }
    }
    if (burst.points) {
      ctx.font = `${Math.max(11, 16 * scale)}px Georgia`; ctx.textAlign = 'center';
      ctx.fillText('+' + burst.points + (burst.kind === 'wild' ? ' · SURGE' : ''), p.x, p.y - (25 + (reducedMotion ? 0 : f * 28)) * scale);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  const look = cosmeticBody({ shape: 'circle', ...MU_CFG.wisp, radius: 22 }, loadout, false, true);
  const color = run.surge ? SPIRIT_PICKUPS.wild.color : look.color, p = point(run.playerU, run.lane);
  // A wild soul lengthens the wake; impact visibly binds and extinguishes it.
  if (!reducedMotion) for (let i = 18; i > 0; i--) {
    const tr = point(run.playerU - i * (4 + run.speed * 2), run.lane + Math.sin(time * 4 - i * 0.3) * i * 0.35);
    ctx.globalAlpha = (1 - i / 19) * 0.28; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(tr.x, tr.y, (14 - i * 0.55) * scale, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.save(); ctx.translate(p.x, p.y); ctx.scale(scale, scale);
  drawCosmeticOrbit(ctx, cosmeticPick(loadout, 'playerEffect')?.paint, 28, time);
  if (run.surge && !reducedMotion) {
    ctx.strokeStyle = SPIRIT_PICKUPS.wild.color; ctx.lineWidth = 1.2;
    for (const r of [30, 38]) { ctx.globalAlpha = run.surge / c.surgeSeconds * 0.7; ctx.beginPath(); ctx.arc(0, 0, r, time * 3, time * 3 + Math.PI * 1.4); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  if (run.hinder) {
    ctx.strokeStyle = '#e0a19a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 0.7;
  }
  ctx.rotate(run.direction === 'down' ? Math.PI / 2 : run.direction === 'left' ? Math.PI : 0);
  const half = spriteHalf(look.radius); ctx.drawImage(bodySprite(look), -half, -half);
  const live = lookOf(look.look); if (live) drawLiveParts(ctx, look, live, time);
  const customAdorn = cosmeticPick(loadout, 'wispSkin')?.paint.adorn;
  const adorn = adornSprite(customAdorn ? { ...look, look: undefined } : look);
  if (adorn) ctx.drawImage(adorn, -half, -half);
  ctx.restore(); ctx.globalAlpha = 1;
}
