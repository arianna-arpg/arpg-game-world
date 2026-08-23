// ---------------------------------------------------------------------------
// THE WORLD'S OWN VOICES — M-TOLL + M-SPILL (docs/design/show-dont-tell.md
// §3c/§3d): the accents the WORLD speaks when a stone tolls, a crystal takes
// a tone, a body is spilled, a chest opens — registered into THE EFFECT VOICE
// (one accent channel) beside the break voices and the status voices:
//   'toll'  — thin concentric rings expanding to EXACTLY the flash radius,
//             which the engine sets to the lure reach (drawn == tested: the
//             ring shows how far the zone heard it), with a shimmer at the seat;
//   'thrum' — a buzzing body: short pulsing rings and a jitter of dots (the skep);
//   'tune'  — the attunement wash: a tone-tinted ring + motes drifting in.
// Plus the pure CORPSE TUMBLE pose (a spilled body's arc from the host's seat
// to its own) the renderer reads for fresh spilled corpses.
// ---------------------------------------------------------------------------

import { registerEffectVoice } from './effectVoice';
import { VIS_CFG } from './visConfig';
import { hash01, shade, withAlpha } from './color';

const TAU = Math.PI * 2;
function seedOf(f: { pos: { x: number; y: number } }): number { return ((f.pos.x * 13 + f.pos.y * 7) | 0) >>> 0; }
function sv(seed: number, i: number, salt: number): number { return hash01(i + 1, salt + 1, seed); }

/** 'toll' — the rings run out to the reach; the last one arrives as the
 *  flash dies (t = remaining fraction, 1 → 0). */
registerEffectVoice('toll', (ctx, f, t) => {
  const C = VIS_CFG.worldVoices.toll;
  const k = 1 - t;
  const R = f.radius;
  ctx.lineWidth = C.width;
  for (let i = 0; i < C.rings; i++) {
    const u = k - i * C.spacing;
    if (u <= 0 || u > 1) continue;
    ctx.strokeStyle = withAlpha(shade(f.color, 0.3), C.alpha * (1 - u) * (1 - u));
    ctx.beginPath(); ctx.ellipse(f.pos.x, f.pos.y, R * u, R * u * C.squash, 0, 0, TAU); ctx.stroke();
  }
  // The shimmer at the seat: a wink that dies fast.
  ctx.fillStyle = withAlpha(shade(f.color, 0.6), t * t * C.winkAlpha);
  ctx.beginPath(); ctx.arc(f.pos.x, f.pos.y, Math.max(2, R * 0.03), 0, TAU); ctx.fill();
});

/** 'thrum' — a buzzing body: a few short rings pulsing at the seat and a
 *  jitter of dots around it (the skep's fury). */
registerEffectVoice('thrum', (ctx, f, t) => {
  const C = VIS_CFG.worldVoices.thrum;
  const k = 1 - t; const seed = seedOf(f);
  const R = f.radius;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < C.pulses; i++) {
    const u = ((k * C.rate + i / C.pulses) % 1);
    const r = R * C.reach * u;
    ctx.strokeStyle = withAlpha(shade(f.color, 0.3), C.alpha * (1 - u) * t);
    ctx.beginPath(); ctx.ellipse(f.pos.x, f.pos.y, r, r * 0.7, 0, 0, TAU); ctx.stroke();
  }
  ctx.fillStyle = withAlpha(shade(f.color, 0.5), t * 0.9);
  for (let i = 0; i < C.dots; i++) {
    const ang = sv(seed, i, 1) * TAU + k * 9 * (sv(seed, i, 2) - 0.5);
    const d = R * C.reach * (0.3 + 0.5 * sv(seed, i, 3));
    ctx.beginPath(); ctx.arc(f.pos.x + Math.cos(ang) * d, f.pos.y + Math.sin(ang) * d * 0.7, 1.3, 0, TAU); ctx.fill();
  }
});

/** 'tune' — the attunement wash: the ring in the tone's tint running to the
 *  reach, motes drifting inward toward the crystal. */
registerEffectVoice('tune', (ctx, f, t) => {
  const C = VIS_CFG.worldVoices.tune;
  const k = 1 - t; const seed = seedOf(f);
  const R = f.radius;
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = withAlpha(shade(f.color, 0.35), C.alpha * t);
  ctx.beginPath(); ctx.ellipse(f.pos.x, f.pos.y, R * (0.2 + 0.8 * k), R * (0.2 + 0.8 * k) * 0.75, 0, 0, TAU); ctx.stroke();
  ctx.fillStyle = withAlpha(shade(f.color, 0.6), t * 0.85);
  for (let i = 0; i < C.motes; i++) {
    const ang = sv(seed, i, 4) * TAU;
    const d = R * (1 - k) * (0.4 + 0.6 * sv(seed, i, 5));
    ctx.beginPath(); ctx.arc(f.pos.x + Math.cos(ang) * d, f.pos.y + Math.sin(ang) * d * 0.75, 1.2 + sv(seed, i, 6), 0, TAU); ctx.fill();
  }
});

/** THE CORPSE TUMBLE — pure f(age): where a spilled body draws between the
 *  host's seat and its own (an arc up and over, a spin that settles), and how
 *  much it has landed (0 mid-flight → 1 settled). Past the tumble it sits. */
export function corpseTumblePose(age: number, from: { x: number; y: number }, to: { x: number; y: number }, size: number):
  { x: number; y: number; rot: number; settled: number } {
  const C = VIS_CFG.corpseTumble;
  const u = Math.max(0, Math.min(1, age / C.seconds));
  const e = 1 - (1 - u) * (1 - u);
  const x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e - Math.sin(Math.PI * u) * size * C.arc;
  return { x, y, rot: (1 - e) * C.spins * TAU, settled: u };
}
