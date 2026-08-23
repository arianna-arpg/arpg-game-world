// ---------------------------------------------------------------------------
// THE STATUS VOICE LAYER — the drawn half of engine/statusVoice.ts (design:
// docs/design/show-dont-tell.md §3e, M-STATUS; engine doc docs/engine/
// statusvoice.md). Every frame the layer diffs each drawn body's status list
// against what it remembered (the pure frame-diff law) and, for every id that
// just LANDED, plays the status's family voice ON the body — following it —
// for STATUS_VOICE_CFG.life seconds. A body's first sight seeds silently
// (no burst at zone load); host and client detect identically off the same
// wire rows. The nine family voices register here into THE EFFECT VOICE:
// rime · flare · spark · spatter · flecks · spiral · stars · ripple · wink.
// Cost: one small diff per drawn body per frame; a handful of strokes per
// live accent; nothing when nothing lands.
// ---------------------------------------------------------------------------

import { STATUS_VOICE_CFG, statusVoiceDiff, statusVoiceOf } from '../../engine/statusVoice';
import { STATUS_DEFS } from '../../engine/status';
import type { Actor } from '../../engine/actor';
import type { World } from '../../engine/world';
import { drawEffectVoice, registerEffectVoice } from './effectVoice';
import { VIS_CFG } from './visConfig';
import { registerVisCache } from './caches';
import { hash01, shade, withAlpha } from './color';

interface Accent { actor: Actor; voice: string; color: string; life: number; maxLife: number }

const seen = new WeakMap<Actor, Set<string>>();
let accents: Accent[] = [];

/** Forget the live accents (zone/run boundaries). */
export function resetStatusVoices(): void { accents = []; }

/** Diff every live body's statuses against the remembered set, start an
 *  accent per fresh id, draw the live accents (over bodies). */
export function drawStatusVoices(ctx: CanvasRenderingContext2D, world: World, dt: number,
  camX: number, camY: number, vw: number, vh: number): void {
  const L = camX - 60, T = camY - 60, R = camX + vw + 60, B = camY + vh + 60;
  for (const a of world.actors) {
    if (a.dead) { seen.delete(a); continue; }
    const mem = seen.get(a);
    const fresh = statusVoiceDiff(mem, a.statuses);
    // Remember what stands now (replace — ids that left are forgotten, so a
    // re-application after expiry speaks again).
    const now = new Set<string>();
    for (const s of a.statuses) now.add(s.id);
    seen.set(a, now);
    if (!fresh.length) continue;
    if (a.pos.x < L || a.pos.x > R || a.pos.y < T || a.pos.y > B) continue; // off-screen landings stay silent
    for (const id of fresh) {
      const def = STATUS_DEFS[id];
      const voice = statusVoiceOf(def);
      if (!voice) continue;
      if (accents.length >= STATUS_VOICE_CFG.maxLive) break; // the honest degrade
      accents.push({ actor: a, voice, color: def?.color ?? '#ffffff', life: STATUS_VOICE_CFG.life, maxLife: STATUS_VOICE_CFG.life });
    }
  }
  if (!accents.length) return;
  for (let i = accents.length - 1; i >= 0; i--) {
    const acc = accents[i];
    acc.life -= dt;
    if (acc.life <= 0 || acc.actor.dead) { accents.splice(i, 1); continue; }
    const t = acc.life / acc.maxLife;
    const f = { pos: { x: acc.actor.pos.x, y: acc.actor.pos.y }, radius: acc.actor.radius * STATUS_VOICE_CFG.radiusScale, color: acc.color, life: acc.life, maxLife: acc.maxLife };
    drawEffectVoice(ctx, acc.voice, f, t);
    ctx.globalAlpha = 1;
  }
}

/** The census surface: how many accents play now (the dev read). */
export function statusVoiceLive(): number { return accents.length; }

// --- THE FAMILY VOICES (registered into THE EFFECT VOICE) -------------------

const TAU = Math.PI * 2;
function seedOf(f: { pos: { x: number; y: number } }): number { return ((f.pos.x * 13 + f.pos.y * 7) | 0) >>> 0; }
function sv(seed: number, i: number, salt: number): number { return hash01(i + 1, salt + 1, seed); }
const ease = (k: number): number => 1 - (1 - k) * (1 - k);

/** 'rime' — cold lands: a pale ring that crackles into short radial frost
 *  ticks, then a rim-hoar fades. */
registerEffectVoice('rime', (ctx, f, t) => {
  const C = VIS_CFG.statusVoice.rime;
  const k = 1 - t; const e = ease(k);
  const R = f.radius;
  ctx.lineCap = 'round';
  ctx.strokeStyle = withAlpha(shade(f.color, 0.45), t * C.ringAlpha);
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(f.pos.x, f.pos.y, R * (0.55 + 0.45 * e), 0, TAU); ctx.stroke();
  const seed = seedOf(f);
  for (let i = 0; i < C.ticks; i++) {
    const ang = (i / C.ticks) * TAU + sv(seed, i, 1) * 0.4;
    const r0 = R * (0.5 + 0.35 * e), r1 = r0 + R * (0.18 + 0.22 * sv(seed, i, 2)) * e;
    ctx.strokeStyle = withAlpha('#ffffff', t * 0.85);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(f.pos.x + Math.cos(ang) * r0, f.pos.y + Math.sin(ang) * r0 * 0.7);
    ctx.lineTo(f.pos.x + Math.cos(ang) * r1, f.pos.y + Math.sin(ang) * r1 * 0.7);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
});

/** 'flare' — heat lands: a warm teardrop leaning up from the body and a few
 *  sparks rising off it. */
registerEffectVoice('flare', (ctx, f, t) => {
  const C = VIS_CFG.statusVoice.flare;
  const k = 1 - t; const e = ease(k);
  const R = f.radius; const seed = seedOf(f);
  const h = R * (0.6 + 0.9 * e);
  ctx.fillStyle = withAlpha(shade(f.color, 0.2), t * C.alpha);
  ctx.beginPath();
  ctx.moveTo(f.pos.x, f.pos.y - h);
  ctx.quadraticCurveTo(f.pos.x + R * 0.45, f.pos.y - h * 0.35, f.pos.x, f.pos.y + R * 0.1);
  ctx.quadraticCurveTo(f.pos.x - R * 0.45, f.pos.y - h * 0.35, f.pos.x, f.pos.y - h);
  ctx.fill();
  ctx.fillStyle = withAlpha('#fff0c0', t * 0.9);
  for (let i = 0; i < C.sparks; i++) {
    const x = f.pos.x + (sv(seed, i, 3) - 0.5) * R * 0.8, y = f.pos.y - R * 0.2 - (0.4 + sv(seed, i, 4)) * R * 1.3 * e;
    ctx.beginPath(); ctx.arc(x, y, 1 + sv(seed, i, 5), 0, TAU); ctx.fill();
  }
});

/** 'spark' — lightning lands: two jagged zigzags snapping across the body. */
registerEffectVoice('spark', (ctx, f, t) => {
  const C = VIS_CFG.statusVoice.spark;
  const seed = seedOf(f); const R = f.radius;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let j = 0; j < 2; j++) {
    const ang = sv(seed, j, 6) * TAU;
    ctx.strokeStyle = withAlpha(j === 0 ? '#ffffff' : shade(f.color, 0.4), t * C.alpha);
    ctx.lineWidth = j === 0 ? 1.4 : 1;
    ctx.beginPath();
    let x = f.pos.x + Math.cos(ang) * R * 0.9, y = f.pos.y + Math.sin(ang) * R * 0.9;
    ctx.moveTo(x, y);
    for (let s = 1; s <= C.segs; s++) {
      const u = s / C.segs;
      x = f.pos.x + Math.cos(ang) * R * 0.9 * (1 - 2 * u) + (sv(seed, s * 3 + j, 7) - 0.5) * R * 0.5;
      y = f.pos.y + Math.sin(ang) * R * 0.9 * (1 - 2 * u) + (sv(seed, s * 3 + j + 1, 8) - 0.5) * R * 0.5;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
});

/** 'spatter' — poison lands: blobs flung out and down, sagging as they fall. */
registerEffectVoice('spatter', (ctx, f, t) => {
  const C = VIS_CFG.statusVoice.spatter;
  const k = 1 - t; const e = ease(k);
  const seed = seedOf(f); const R = f.radius;
  ctx.fillStyle = withAlpha(shade(f.color, 0.1), t * C.alpha);
  for (let i = 0; i < C.blobs; i++) {
    const ang = (sv(seed, i, 9) - 0.5) * Math.PI + Math.PI / 2; // down-biased
    const reach = R * (0.4 + 0.7 * sv(seed, i, 10));
    const x = f.pos.x + Math.cos(ang) * reach * e, y = f.pos.y + Math.sin(ang) * reach * 0.6 * e + R * 0.5 * e * e;
    const s = 1.2 + 2 * sv(seed, i, 11);
    ctx.beginPath(); ctx.ellipse(x, y, s, s * (1 + 0.6 * e), 0, 0, TAU); ctx.fill();
  }
});

/** 'flecks' — a wound lands: red flecks thrown in an arc above the body. */
registerEffectVoice('flecks', (ctx, f, t) => {
  const C = VIS_CFG.statusVoice.flecks;
  const k = 1 - t; const e = ease(k);
  const seed = seedOf(f); const R = f.radius;
  ctx.fillStyle = withAlpha(shade(f.color, -0.1), t * C.alpha);
  for (let i = 0; i < C.count; i++) {
    const ang = -Math.PI * (0.15 + 0.7 * sv(seed, i, 12));
    const reach = R * (0.5 + 0.6 * sv(seed, i, 13));
    const x = f.pos.x + Math.cos(ang) * reach * e, y = f.pos.y + Math.sin(ang) * reach * e + R * 0.35 * e * e;
    ctx.beginPath(); ctx.ellipse(x, y, 1.1 + 1.3 * sv(seed, i, 14), 0.9, ang, 0, TAU); ctx.fill();
  }
});

/** 'spiral' — the mind is touched: a spiral unwinds over the head. */
registerEffectVoice('spiral', (ctx, f, t) => {
  const C = VIS_CFG.statusVoice.spiral;
  const k = 1 - t; const e = ease(k);
  const R = f.radius; const cx = f.pos.x, cy = f.pos.y - R * 1.1;
  ctx.strokeStyle = withAlpha(shade(f.color, 0.35), t * C.alpha);
  ctx.lineWidth = 1.3; ctx.lineCap = 'round';
  ctx.beginPath();
  const turns = C.turns * e;
  for (let s = 0; s <= 40; s++) {
    const u = s / 40; const ang = u * turns * TAU + k * 2; const r = R * 0.55 * u;
    const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r * 0.55;
    if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.lineCap = 'butt';
});

/** 'stars' — hard CC lands: little stars circling over the head. */
registerEffectVoice('stars', (ctx, f, t) => {
  const C = VIS_CFG.statusVoice.stars;
  const k = 1 - t;
  const R = f.radius; const cx = f.pos.x, cy = f.pos.y - R * 1.15;
  ctx.fillStyle = withAlpha('#fff4c0', t * C.alpha);
  for (let i = 0; i < C.count; i++) {
    const ang = (i / C.count) * TAU + k * C.spin;
    const x = cx + Math.cos(ang) * R * 0.6, y = cy + Math.sin(ang) * R * 0.25;
    const s = 2.2;
    ctx.beginPath();
    for (let p = 0; p < 5; p++) {
      const a0 = -Math.PI / 2 + (p / 5) * TAU, a1 = a0 + TAU / 10;
      ctx.lineTo(x + Math.cos(a0) * s, y + Math.sin(a0) * s);
      ctx.lineTo(x + Math.cos(a1) * s * 0.45, y + Math.sin(a1) * s * 0.45);
    }
    ctx.closePath(); ctx.fill();
  }
});

/** 'ripple' — time is touched: two thin rings expanding out of phase. */
registerEffectVoice('ripple', (ctx, f, t) => {
  const C = VIS_CFG.statusVoice.ripple;
  const k = 1 - t;
  const R = f.radius;
  ctx.lineWidth = 1.2;
  for (let j = 0; j < 2; j++) {
    const u = Math.max(0, Math.min(1, k * 1.3 - j * 0.3));
    if (u <= 0) continue;
    ctx.strokeStyle = withAlpha(shade(f.color, 0.3), (1 - u) * C.alpha);
    ctx.beginPath(); ctx.ellipse(f.pos.x, f.pos.y, R * (0.4 + 1.1 * u), R * (0.25 + 0.7 * u), 0, 0, TAU); ctx.stroke();
  }
});

/** 'wink' — a blessing (or an uncategorized landing): a soft ring and three
 *  dots lifting off it — gentle, never the pop's pale disc. */
registerEffectVoice('wink', (ctx, f, t) => {
  const C = VIS_CFG.statusVoice.wink;
  const k = 1 - t; const e = ease(k);
  const R = f.radius; const seed = seedOf(f);
  ctx.strokeStyle = withAlpha(shade(f.color, 0.3), t * C.alpha);
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.ellipse(f.pos.x, f.pos.y + R * 0.3, R * (0.5 + 0.4 * e), R * (0.22 + 0.18 * e), 0, 0, TAU); ctx.stroke();
  ctx.fillStyle = withAlpha(shade(f.color, 0.55), t * 0.9);
  for (let i = 0; i < 3; i++) {
    const ang = -Math.PI / 2 + (i - 1) * 0.8 + sv(seed, i, 15) * 0.3;
    const d = R * (0.45 + 0.8 * e);
    ctx.beginPath(); ctx.arc(f.pos.x + Math.cos(ang) * d * 0.6, f.pos.y + Math.sin(ang) * d, 1.3, 0, TAU); ctx.fill();
  }
});

// The cache steward trims the live accents at zone/run boundaries (the seen
// map is a WeakMap — bodies that leave take their memory with them).
registerVisCache({
  id: 'statusVoices',
  count: () => accents.length,
  bytes: () => 0,
  onZoneSwap: resetStatusVoices,
  onRunSwap: resetStatusVoices,
});
