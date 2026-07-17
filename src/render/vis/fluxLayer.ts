// ---------------------------------------------------------------------------
// THE FLUX LAYER — the render half of the flux fabric (engine/flux.ts).
//
// Draws the living cloud from the SAME state the walkable grid was written
// from, so what you see is what holds you — and, more important, what is
// ABOUT to stop holding you: a pad spends its whole fray window visibly
// tattering (lobes scatter outward, dusk-tint creeps in, a flicker builds)
// before the ground actually leaves, and a forming pad visibly gathers
// before it will take a step. Carriers glide with a lean of trailing wake so
// their direction reads at a glance; the warmup lane-bands thin and let go
// the moment the drift begins; conjured clouds (World.conjureCloud) wear
// their own tint and fray out honestly. Gusts announce themselves as wind
// streaks the whole warn phase before they shove.
//
// Everything is blits of one baked radial sprite per tint (the fog layer's
// billow lesson): no per-frame gradient allocations. View-culled per pad /
// carrier / cell. Ablate pass name: 'flux'. Knobs: VIS_CFG.flux; a theme's
// FluxSpec.look re-tints per zone.
// ---------------------------------------------------------------------------

import { FluxPhase } from '../../engine/flux';
import type { World } from '../../engine/world';
import { GridWalkField } from '../../world/gridWalk';
import { VIS_CFG } from './visConfig';
import { registerVisCache } from './caches';
import { releaseCanvas } from './sprites';

const SPRITES = new Map<string, HTMLCanvasElement>();

registerVisCache({
  id: 'fluxBillows',
  count: () => SPRITES.size,
  bytes: () => { let b = 0; for (const c of SPRITES.values()) b += c.width * c.height * 4; return b; },
  onZoneSwap: () => { if (VIS_CFG.memory.billowClearOnSwap) { for (const c of SPRITES.values()) releaseCanvas(c); SPRITES.clear(); } },
  onRunSwap: () => { for (const c of SPRITES.values()) releaseCanvas(c); SPRITES.clear(); },
});

/** One walkable-cloud sprite per tint: a DENSER heart than fog (this cloud
 *  is ground — it has to read solid enough to stand on) with the same long
 *  dissolving rim (the zero-stop that sells dissipation). */
function cloudSprite(color: string): HTMLCanvasElement {
  let spr = SPRITES.get(color);
  if (spr) return spr;
  const size = VIS_CFG.flux.sprite;
  spr = document.createElement('canvas');
  spr.width = size;
  spr.height = size;
  const c = spr.getContext('2d')!;
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color + 'f2');
  g.addColorStop(0.4, color + 'd0');
  g.addColorStop(0.72, color + '6a');
  g.addColorStop(1, color + '00');
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  SPRITES.set(color, spr);
  return spr;
}

/** Two blits per lobe: a wide dissolving skirt + the denser heart riding it. */
function blitLobe(ctx: CanvasRenderingContext2D, spr: HTMLCanvasElement,
  x: number, y: number, r: number, a: number): void {
  if (a <= 0.01) return;
  ctx.globalAlpha = a * 0.45;
  ctx.drawImage(spr, x - r * 1.45, y - r * 1.45, r * 2.9, r * 2.9);
  ctx.globalAlpha = a;
  ctx.drawImage(spr, x - r * 0.95, y - r * 0.95, r * 1.9, r * 1.9);
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Draw the living flux (pads, carriers, warmup lanes, conjured clouds, gust
 *  streaks). Runs inside the world transform, over the baked floor, under
 *  doodads and actors — clouds are GROUND. */
export function drawFluxLayer(ctx: CanvasRenderingContext2D, world: World,
  camX: number, camY: number, vw: number, vh: number): void {
  const CFG = VIS_CFG.flux;
  const time = world.time;
  const field = world.flux;
  const pad = CFG.cullPad;
  const inView = (x: number, y: number, bound: number): boolean =>
    x + bound >= camX - pad && x - bound <= camX + vw + pad
    && y + bound >= camY - pad && y - bound <= camY + vh + pad;

  if (field) {
    const look = field.spec.look;
    const bodyS = cloudSprite(look?.body ?? CFG.body);
    const crestS = cloudSprite(look?.crest ?? CFG.crest);
    const frayS = cloudSprite(look?.fray ?? CFG.fray);
    const cell = field.walk.cell;

    // --- Warmup lane-bands: whole lanes stand until the drift begins. ------
    // They thin through the warmup's last seconds (the same warning every
    // later departure gets) and dissolve over the first beats of the drift,
    // leaving only the rafts.
    const fraySecs = field.spec.phase?.fray ?? 1.2;
    const sinceBegin = field.clock - field.warmup;
    const laneFade = field.clock < field.warmup
      ? (field.clock > field.warmup - fraySecs
        ? 1 - 0.5 * clamp01((field.clock - (field.warmup - fraySecs)) / fraySecs)
        : 1)
      : clamp01(1 - sinceBegin / 1.2);
    if (laneFade > 0.01) {
      const warn = field.clock > field.warmup - fraySecs && field.clock < field.warmup;
      for (const lane of field.lanes) {
        for (let k = 0; k < lane.path.length; k++) {
          const p = lane.path[k];
          if (!inView(p.x, p.y, cell * 2)) continue;
          let a = 0.85 * laneFade;
          if (warn) a *= 0.7 + 0.3 * Math.sin(time * CFG.flicker + k * 1.7);
          blitLobe(ctx, bodyS, p.x, p.y, cell * 1.7 * CFG.lobeOver, a);
        }
      }
    }

    // --- Pads: form, stand, fray — the rhythm made visible. -----------------
    for (const p of field.pads) {
      if (!inView(p.cx, p.cy, p.bound + cell * 2)) continue;
      const { s, f } = field.padPhase(p);
      if (s === FluxPhase.Gone) continue;
      for (let k = 0; k < p.lobes.length; k++) {
        const l = p.lobes[k];
        let a = 0.95, spread = 0, frayMix = 0;
        if (s === FluxPhase.Fraying) {
          // Lobe-staggered tatter: the loose edges let go first, the heart
          // holds longest — the pad shreds instead of fading like a lamp.
          const lf = clamp01((f - l.j * 0.55) / Math.max(0.05, 1 - l.j * 0.55));
          a *= 1 - lf * 0.93;
          spread = lf * CFG.scatterFrac;
          frayMix = Math.min(1, lf * 1.4);
          if (lf > 0.08) a *= 0.72 + 0.28 * Math.sin(time * CFG.flicker + k * 2.4 + p.seed);
        } else if (s === FluxPhase.Forming) {
          // The gather: lobes converge inward and thicken. NOT yet walkable —
          // the density gap below solid keeps the promise readable.
          const lf = clamp01((f - l.j * 0.4) / Math.max(0.05, 1 - l.j * 0.4));
          a *= lf * 0.62;
          spread = (1 - lf) * 0.45;
        } else {
          // Standing: a slow breathe so the deck reads alive, never painted.
          a *= 0.92 + 0.06 * Math.sin(time * 1.1 + p.seed * 0.001 + k);
        }
        const x = p.cx + l.dx * (1 + spread);
        const y = p.cy + l.dy * (1 + spread);
        const r = l.r * CFG.lobeOver;
        if (frayMix < 1) blitLobe(ctx, bodyS, x, y, r, a * (1 - frayMix));
        if (frayMix > 0) blitLobe(ctx, frayS, x, y, r * (1 + frayMix * 0.12), a * frayMix);
        // Sunlit crest on standing cloud: the top-light that says FLOOR.
        if (s === FluxPhase.Solid) {
          ctx.globalAlpha = 0.3;
          ctx.drawImage(crestS, x - r * 0.62 - r * 0.2, y - r * 0.62 - r * 0.26, r * 1.24, r * 1.24);
        }
      }
    }

    // --- Carriers: the rafts. Wake + lean tell the direction at a glance. --
    for (const lane of field.lanes) {
      for (const c of lane.carriers) {
        if (!inView(c.x, c.y, c.r * 2.4)) continue;
        const bob = Math.sin(time * 1.6 + c.seed * 0.001) * 2;
        // Wake: trailing wisps behind the heading while it moves.
        if (c.speedFrac > 0.15 && field.clock >= field.warmup) {
          for (let k = 1; k <= 3; k++) {
            const wx = c.x - c.hx * (c.r * 0.55 + k * c.r * 0.42);
            const wy = c.y - c.hy * (c.r * 0.55 + k * c.r * 0.42) + bob;
            blitLobe(ctx, bodyS, wx, wy, c.r * (0.62 - k * 0.12), (0.3 - k * 0.08) * c.speedFrac);
          }
        }
        for (let k = 0; k < c.lobes.length; k++) {
          const l = c.lobes[k];
          const x = c.x + l.dx + c.hx * 3; // the faintest lean into the run
          const y = c.y + l.dy + bob;
          const r = l.r * CFG.lobeOver;
          blitLobe(ctx, bodyS, x, y, r, k === 0 ? 0.97 : 0.85);
          if (k === 0) {
            ctx.globalAlpha = 0.32;
            ctx.drawImage(crestS, x - r * 0.62 - r * 0.18, y - r * 0.62 - r * 0.24, r * 1.24, r * 1.24);
          }
        }
      }
    }

    // --- Gust streaks: the wind made visible, warn through hold. ------------
    const gust = field.gustNow();
    if (gust) {
      const a = gust.phase === 'warn' ? 0.16 + gust.f * 0.3 : 0.55;
      ctx.strokeStyle = '#eaf4ff';
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.6;
      const speed = gust.phase === 'warn' ? 380 : 760;
      for (let i = 0; i < CFG.streaks; i++) {
        const h1 = ((i * 379 + 83) % 997) / 997;
        const h2 = ((i * 613 + 211) % 991) / 991;
        const len = CFG.streakLen * (0.55 + h2 * 0.8);
        // Seed a point in the padded view, then slide it along the gust.
        const drift = (time * speed * (0.7 + h2 * 0.6)) % (vw + vh);
        let x = camX - 100 + h1 * (vw + 200) + gust.x * drift;
        let y = camY - 100 + h2 * (vh + 200) + gust.y * drift;
        // Wrap into the padded view so streaks never run out.
        x = camX - 100 + (((x - (camX - 100)) % (vw + 200)) + vw + 200) % (vw + 200);
        y = camY - 100 + (((y - (camY - 100)) % (vh + 200)) + vh + 200) % (vh + 200);
        ctx.globalAlpha = a * (0.5 + 0.5 * Math.sin(time * 3 + i));
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + gust.x * len, y + gust.y * len);
        ctx.stroke();
      }
    }
  }

  // --- Conjured clouds: the player's own ground, honest to the last. -------
  const conj = world.conjured;
  const wf = world.walk;
  if (conj?.live) {
    const crestS = cloudSprite(VIS_CFG.flux.crest);
    if (wf instanceof GridWalkField && conj.cells.size) {
      const spr = cloudSprite(VIS_CFG.flux.conjure);
      const cell = wf.cell;
      for (const [i, c] of conj.cells) {
        const x = (i % wf.cols + 0.5) * cell, y = ((i / wf.cols | 0) + 0.5) * cell;
        if (!inView(x, y, cell * 2)) continue;
        const f = conj.fracOf(c);
        let a = 0.95 * (1 - f * 0.85);
        if (f > 0.45) a *= 0.7 + 0.3 * Math.sin(time * VIS_CFG.flux.flicker + i * 0.7);
        const r = cell * 1.35 * VIS_CFG.flux.lobeOver * (1 - f * 0.18);
        blitLobe(ctx, spr, x, y, r, a);
        if (f < 0.3) {
          ctx.globalAlpha = 0.26;
          ctx.drawImage(crestS, x - r * 0.62 - r * 0.2, y - r * 0.62 - r * 0.24, r * 1.24, r * 1.24);
        }
      }
    }

    // --- The PRESENCES: the cloud that stands wherever it was called. -----
    // Over conjurable void the cells above already read as floor; over
    // honest land this soft billow IS the skill's whole visible body — a
    // knee-high vapor domain, breathing, tattering out through its fray.
    for (const p of conj.puffs) {
      if (!inView(p.x, p.y, p.r * 1.9)) continue;
      const f = conj.puffFrac(p);
      const spr = cloudSprite(p.look ?? VIS_CFG.flux.conjure);
      let a = VIS_CFG.flux.puffAlpha * (1 - f * 0.8);
      if (f > 0.5) a *= 0.72 + 0.28 * Math.sin(time * VIS_CFG.flux.flicker + p.seed);
      if (a <= 0.01) continue;
      const bob = Math.sin(time * 1.4 + p.seed * 0.001) * VIS_CFG.flux.puffBob;
      for (let k = 0; k < p.lobes.length; k++) {
        const l = p.lobes[k];
        const wob = Math.sin(time * 1.1 + p.seed * 0.001 + k * 1.9) * 2;
        blitLobe(ctx, spr, p.x + l.dx + wob, p.y + l.dy + bob,
          l.r * (1 - f * 0.15), a * (k === 0 ? 1 : 0.82));
      }
      // Sunlit crest while fresh — the same top-light standing floors wear,
      // faded so a land-borne domain never claims to be walkable sky.
      if (f < 0.3) {
        const l0 = p.lobes[0];
        const cr = l0.r * (1 - f * 0.15);
        ctx.globalAlpha = 0.18 * (1 - f / 0.3);
        ctx.drawImage(crestS, p.x - cr * 0.62 - cr * 0.2, p.y + bob - cr * 0.62 - cr * 0.26, cr * 1.24, cr * 1.24);
      }
    }
  }
  ctx.globalAlpha = 1;
}
