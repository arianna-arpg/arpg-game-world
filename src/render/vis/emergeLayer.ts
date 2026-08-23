// ---------------------------------------------------------------------------
// THE EMERGE LAYER — the drawn half of THE EMERGENCE GRAMMAR (pure leaf:
// engine/emerge.ts; design: docs/design/show-dont-tell.md §3b; engine doc:
// docs/engine/emergence.md). Two shares:
//   THE GROUND SHARE (drawEmergences, after the doodads, under bodies): for
//   every live arrival in view, THE SLIT — the dark opening at the feet a
//   rising body climbs through (rise / surface) — and THE GRAINS: the
//   ground's own flung bits (sand grit, soil clods, snow flakes, droplets,
//   embers, light motes, leaves) off the pure scatter law.
//   THE BODY SHARE (emergePoseOf, read by the renderer's drawActor): the
//   arriving body's pose — the rise's clip-at-the-ground-line + climb, the
//   burst's overshoot, the condense's alpha-in under a heat-lean, the drop's
//   fall + landing squash, the stir's shudder — all pure f(seed, age).
// Cost: zero while World.emergences is empty (one length read per frame +
// one per drawn actor); per live arrival a handful of fills.
// ---------------------------------------------------------------------------

import {
  EMERGE_CFG, emergeGrain, emergeGrainCount, emergePose, emergeSlit, type EmergePose,
} from '../../engine/emerge';
import type { Actor } from '../../engine/actor';
import type { EmergeRecord, World } from '../../engine/world';
import { VIS_CFG } from './visConfig';
import { shade, withAlpha } from './color';

const TAU = Math.PI * 2;

/** The arriving body's pose this frame (null when it is not arriving). */
export function emergePoseOf(world: World, a: Actor): EmergePose | null {
  if (!world.emergences.length) return null;
  const rec = world.emergeOf(a);
  if (!rec) return null;
  return emergePose(rec.spec, rec.seed, Math.max(0, rec.maxLife - rec.life), rec.radius);
}

/** Draw every live arrival's ground share (slit + grains). Zero cost when
 *  World.emergences is empty. */
export function drawEmergences(ctx: CanvasRenderingContext2D, world: World,
  camX: number, camY: number, vw: number, vh: number): void {
  const recs = world.emergences;
  if (!recs.length) return;
  const cfg = VIS_CFG.emerge;
  const L = camX - 80, T = camY - 80, R = camX + vw + 80, B = camY + vh + 80;
  for (const rec of recs) {
    const r = rec.radius;
    const reach = r * (rec.spec.fling + 2);
    if (rec.pos.x + reach < L || rec.pos.x - reach > R || rec.pos.y + reach < T || rec.pos.y - reach > B) continue;
    const age = Math.max(0, rec.maxLife - rec.life);
    // THE SLIT — the opening at the feet (rise / surface), a dark ellipse
    // with a faint pale rim; it gapes, holds, and closes as the body stands.
    const gape = emergeSlit(rec.spec, age);
    if (gape > 0.01) {
      const fy = rec.pos.y + r * 0.45;
      const w = r * EMERGE_CFG.slit.width * gape; // the leaf's own gape numbers (drawn == the spec)
      const h = r * EMERGE_CFG.slit.height * gape;
      ctx.globalAlpha = cfg.slit.alpha * gape;
      ctx.fillStyle = rec.spec.motion === 'surface' ? shade(rec.spec.grainColor, -0.5) : cfg.slit.color;
      ctx.beginPath();
      ctx.ellipse(rec.pos.x, fy, w, h, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = cfg.slit.rimAlpha * gape;
      ctx.strokeStyle = shade(rec.spec.grainColor, 0.35);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(rec.pos.x, fy, w + 1.5, h + 1, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }
    // THE GRAINS — the ground's own bits, each a pure seeded arc.
    const n = emergeGrainCount(rec.spec, rec.seed);
    const base = rec.spec.grainColor;
    const [s0, s1] = cfg.grain.size;
    for (let i = 0; i < n; i++) {
      const g = emergeGrain(rec.spec, rec.seed, i, n, age, r);
      if (!g || g.alpha <= 0.02) continue;
      const x = rec.pos.x + g.x, y = rec.pos.y + r * 0.3 + g.y;
      const s = s0 + (s1 - s0) * Math.min(1, g.size / 3.6);
      ctx.globalAlpha = g.alpha;
      switch (rec.spec.grainShape) {
        case 'drop':
          ctx.fillStyle = shade(base, 0.25);
          ctx.beginPath(); ctx.ellipse(x, y, s * 0.6, s * 0.85, 0, 0, TAU); ctx.fill();
          break;
        case 'flake':
          ctx.fillStyle = withAlpha('#ffffff', 0.9);
          ctx.beginPath(); ctx.arc(x, y, s * 0.55, 0, TAU); ctx.fill();
          break;
        case 'ember':
          ctx.fillStyle = withAlpha(shade(base, 0.4), 0.95);
          ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, TAU); ctx.fill();
          ctx.globalAlpha = g.alpha * 0.45;
          ctx.fillStyle = base;
          ctx.beginPath(); ctx.arc(x, y, s * 1.3, 0, TAU); ctx.fill();
          break;
        case 'mote':
          ctx.fillStyle = withAlpha(base, cfg.moteGlow);
          ctx.beginPath(); ctx.arc(x, y, s * 1.4, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(x, y, s * 0.45, 0, TAU); ctx.fill();
          break;
        case 'leaf':
          ctx.fillStyle = base;
          ctx.beginPath(); ctx.ellipse(x, y, s * 1.1, s * 0.45, (i * 1.3) % Math.PI, 0, TAU); ctx.fill();
          break;
        case 'clod':
          ctx.fillStyle = base;
          ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.8, 0, 0, TAU); ctx.fill();
          ctx.globalAlpha = g.alpha * cfg.grain.rimAlpha;
          ctx.fillStyle = shade(base, 0.35);
          ctx.beginPath(); ctx.arc(x - s * 0.3, y - s * 0.3, s * 0.4, 0, TAU); ctx.fill();
          break;
        default: // grit
          ctx.fillStyle = base;
          ctx.fillRect(x - s * 0.5, y - s * 0.5, s, s);
      }
    }
  }
  ctx.globalAlpha = 1;
}

/** A record lookup kept here so the renderer's pose read stays one call. */
export function emergeRecordOf(world: World, a: Actor): EmergeRecord | undefined { return world.emergeOf(a); }
