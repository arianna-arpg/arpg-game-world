import { registerEffectVoice, type EffectVoiceFlash } from './effectVoice';
import { shade, withAlpha } from './color';

/** Visual-only anatomy, independent of faction and cadence. The flash's
 * remaining lifetime is the shared host/client clock; no renderer RNG. */
export const GROUND_RISING_VIS = {
  dust: { count: 20, startAlpha: 0.16, endAlpha: 0.62, lift: 1.25, size: 0.15 },
  cracks: { count: 7, startsAt: 0.14, width: 2.4 },
  hands: { count: 2, startsAt: 0.28, fullAt: 0.94, height: 1.1, bone: '#d7cbaa', edge: '#302b24' },
  soil: '#352b25', soilEdge: '#b19a75',
};

const TAU = Math.PI * 2;
const sat = (n: number): number => Math.max(0, Math.min(1, n));
const ramp = (n: number, start: number, end: number): number => sat((n - start) / (end - start));
function grain(f: EffectVoiceFlash, i: number): number {
  // Match the snapshot's hundredth-unit position quantization on both peers.
  const n = Math.sin(Math.round(f.pos.x * 100) * 0.127 + Math.round(f.pos.y * 100) * 0.311 + i * 71.73) * 43758.5453;
  return n - Math.floor(n);
}

/** Paint a hand rising UP through a slit: paired forearm bones, knuckles,
 * four independently curling fingers and an opposed thumb, anchored wrist. */
function hand(ctx: CanvasRenderingContext2D, r: number, rise: number, curl: number): void {
  const c = GROUND_RISING_VIS.hands;
  const wristY = -r * c.height * rise, palm = r * 0.23;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const skeleton = (width: number, color: string): void => {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      ctx.moveTo(side * palm * 0.26, 2);
      ctx.lineTo(side * palm * 0.45, wristY + palm);
      ctx.lineTo(side * palm * 0.7, wristY);
    }
    ctx.moveTo(-palm * 0.7, wristY); ctx.lineTo(palm * 0.7, wristY);
    for (let digit = 0; digit < 4; digit++) {
      const x = (digit - 1.5) * palm * 0.46;
      const reach = palm * (1.4 + Math.sin((digit + 1) * Math.PI / 5) * 0.65) * rise;
      const bend = (0.28 + curl * 0.5) * palm;
      ctx.moveTo(x * 0.65, wristY + palm * 0.7);
      ctx.lineTo(x, wristY);
      ctx.lineTo(x * 1.3, wristY - reach * 0.6);
      ctx.lineTo(x * 1.4 + bend, wristY - reach);
      ctx.lineTo(x * 1.4 + bend * 1.3, wristY - reach + palm * (0.3 + curl * 0.65));
    }
    ctx.moveTo(-palm * 0.5, wristY + palm * 0.55);
    ctx.lineTo(-palm * 1.35, wristY + palm * 0.2);
    ctx.lineTo(-palm * 1.65, wristY - palm * 0.6 * rise);
    ctx.stroke();
  };
  skeleton(Math.max(3.6, r * 0.14), c.edge);
  skeleton(Math.max(1.6, r * 0.065), c.bone);
}

registerEffectVoice('earth_rising', (ctx, f, t) => {
  const c = GROUND_RISING_VIS, p = sat(1 - t), r = f.radius;
  const age = f.maxLife * p;
  const cracks = ramp(p, c.cracks.startsAt, 1), rise = ramp(p, c.hands.startsAt, c.hands.fullAt);
  ctx.save(); ctx.translate(f.pos.x, f.pos.y); ctx.globalAlpha = 1;
  // Uneven soil, not a warning circle. Its footprint stays fixed to the birth.
  ctx.fillStyle = withAlpha(c.soil, 0.3 + p * 0.55);
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12, rr = r * (0.56 + grain(f, i) * 0.25);
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.48;
    if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  for (let i = 0; i < c.cracks.count; i++) {
    const a = i * TAU / c.cracks.count + grain(f, i + 30) * 0.35;
    const reach = r * (0.55 + grain(f, i + 40) * 0.4) * cracks;
    ctx.lineWidth = c.cracks.width; ctx.strokeStyle = withAlpha(c.soilEdge, 0.3 + cracks * 0.45);
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 3);
    ctx.lineTo(Math.cos(a + 0.17) * reach * 0.5, Math.sin(a + 0.17) * reach * 0.26);
    ctx.lineTo(Math.cos(a) * reach, Math.sin(a) * reach * 0.55); ctx.stroke();
  }
  if (rise > 0) for (let i = 0; i < c.hands.count; i++) {
    const side = i % 2 ? 1 : -1;
    const lift = sat(rise * (0.9 + grain(f, i + 70) * 0.15));
    ctx.save(); ctx.translate(side * r * 0.35, side * r * 0.12);
    ctx.fillStyle = '#181a17'; ctx.beginPath(); ctx.ellipse(0, 1, r * 0.26, r * 0.11, 0, 0, TAU); ctx.fill();
    ctx.rotate(side * (0.14 + Math.sin(age * (3 + p * 4) + i * 2) * 0.1 * lift));
    hand(ctx, r * (0.72 + grain(f, i + 80) * 0.18), lift, 0.5 + Math.sin(age * 7 + i * 2) * 0.5);
    ctx.restore();
  }
  // Continuous puffs grow denser, faster and higher; fixed seeds avoid flicker.
  for (let i = 0; i < c.dust.count; i++) {
    const onset = grain(f, i + 90) * 0.75;
    const strength = ramp(p + 0.15, onset, Math.min(1.05, onset + 0.3));
    if (!strength) continue;
    const cycle = (age * (0.35 + grain(f, i + 100) * 0.3) + p * p + grain(f, i + 110)) % 1;
    const a = grain(f, i + 120) * TAU;
    const reach = r * (0.3 + grain(f, i + 130) * 0.65);
    const x = Math.cos(a) * reach * (0.6 + cycle * 0.7);
    const y = Math.sin(a) * reach * 0.42 - cycle * r * c.dust.lift * (0.25 + p * 0.75);
    const alpha = Math.sin(cycle * Math.PI) * strength * (c.dust.startAlpha + p * c.dust.endAlpha);
    ctx.fillStyle = withAlpha(shade(f.color, grain(f, i + 140) * 0.3 - 0.15), alpha);
    ctx.beginPath(); ctx.ellipse(x, y, r * c.dust.size * (0.6 + cycle), r * c.dust.size * (0.3 + cycle * 0.55), a, 0, TAU); ctx.fill();
  }
  ctx.restore();
});

registerEffectVoice('earth_settle', (ctx, f, t) => {
  ctx.save(); ctx.globalAlpha = 1;
  for (let i = 0; i < 12; i++) {
    const a = grain(f, i) * TAU, drift = 1 - t;
    const reach = f.radius * (0.25 + grain(f, i + 15) * 0.65 + drift * 0.3);
    ctx.fillStyle = withAlpha(f.color, t * 0.35);
    ctx.beginPath(); ctx.ellipse(f.pos.x + Math.cos(a) * reach,
      f.pos.y + Math.sin(a) * reach * 0.4 - t * f.radius * 0.2,
      f.radius * (0.1 + drift * 0.13), f.radius * 0.08, a, 0, TAU); ctx.fill();
  }
  ctx.restore();
});
