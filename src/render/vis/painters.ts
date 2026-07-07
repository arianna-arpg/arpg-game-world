// ---------------------------------------------------------------------------
// DOODAD PAINTERS — the parametric painter library. Every doodad kind maps
// (in src/data/doodadVisuals.ts) to one of these painters plus params; the
// renderer just sorts groups by paint order and dispatches. Adding a LOOK is
// adding a data entry; adding a whole new VOCABULARY of look is adding one
// painter here. No draw code enumerates kinds.
//
// Painters run per frame (they animate); anything static-and-expensive should
// bake via vis/sprites.ts instead. Colors in params are ColorSpec strings:
// '#rrggbb' literal, or 'theme:<key>' / 'theme:<key>|#fallback' to read the
// zone theme — so one data entry skins itself per biome.
// ---------------------------------------------------------------------------

import type { Doodad } from '../../engine/levelgen';
import type { World } from '../../engine/world';
import type { ZoneTheme } from '../../data/zones';
import { BIOMES } from '../../world/biomes';
import { hash01, shade, withAlpha } from './color';
import { materialOf, rampOf } from './materials';
import { drawShadow } from './sprites';

export interface PaintEnv {
  ctx: CanvasRenderingContext2D;
  theme: ZoneTheme;
  /** The sim clock (deterministic anims; never performance.now()). */
  time: number;
  world: World;
}

/** '#hex' literal or 'theme:key' / 'theme:key|#fallback'. */
export type ColorSpec = string;

export function resolveColor(spec: ColorSpec | undefined, theme: ZoneTheme, fallback = '#9a9aa0'): string {
  if (!spec) return fallback;
  if (!spec.startsWith('theme:')) return spec;
  const [key, fb] = spec.slice(6).split('|');
  const v = (theme as unknown as Record<string, string | undefined>)[key];
  return v ?? fb ?? fallback;
}

export type GroupPainter = (env: PaintEnv, group: readonly Doodad[], def: DoodadVisualDef) => void;

export interface LightSpec {
  /** Light reach in world units (absolute), or negative = multiple of the
   *  doodad's radius (-2.5 → 2.5 × radius). */
  radius: number;
  color: ColorSpec;
  /** 0..1 punch through the darkness + bloom strength. */
  intensity: number;
  /** Flicker speed (campfires); 0/undefined = steady. */
  flicker?: number;
}

export interface DoodadVisualDef {
  painter: string;
  /** Ascending paint order. Liquids/grounds 6–38, chasm 40, bridge 44,
   *  standing objects 46–56, interactives/ritual 57–59. */
  order: number;
  params?: Record<string, unknown>;
  /** Soft contact shadow under each doodad (alpha multiplier). */
  shadow?: number;
  /** DIRECTIONAL day-cycle shadow (sunCast): the body's cast reach as a
   *  multiplier on its radius. Trees stretch long; stones squat. */
  longShadow?: number;
  /** Emissive light contributed to the light layer. */
  light?: LightSpec;
  /** Canopy crown painter (occluding kinds draw this ABOVE actors). */
  canopy?: { painter: string; params?: Record<string, unknown> };
}

// --- Shared path helpers -----------------------------------------------------

function blobPath(ctx: CanvasRenderingContext2D, group: readonly Doodad[], grow = 0): void {
  ctx.beginPath();
  for (const d of group) {
    ctx.moveTo(d.pos.x + d.radius + grow, d.pos.y);
    ctx.arc(d.pos.x, d.pos.y, Math.max(0.1, d.radius + grow), 0, Math.PI * 2);
  }
}

function jaggedPoly(ctx: CanvasRenderingContext2D, n: number, r: number, irr: number, seed: number, squashY = 1): void {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 - irr + irr * 2 * hash01(i, seed));
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr * squashY;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// --- LIQUID / GROUND BLOBS ---------------------------------------------------

export interface LiquidParams {
  /** Rim pass (grown silhouette under the core). */
  rim?: { color: ColorSpec; alpha: number; grow: number };
  /** The body fill. */
  core: { color: ColorSpec; alpha: number; grow?: number };
  /** An inset pass (road track, bog sheen, vine dark heart). */
  inner?: { color: ColorSpec; alpha: number; grow: number };
  /** Expanding rings over deep liquid (water). */
  ripples?: { color: ColorSpec };
  /** Drifting sine squiggles (bog murk). */
  squiggles?: { color: ColorSpec };
  /** Ford overlay on `shallow` discs. `lighten` derives the tone from the
   *  CORE color (one hue family, depth told by tone); the fill is a soft
   *  per-disc radial gradient so shallows MELD into the deep, never a
   *  hard-cut second water. */
  fords?: { color?: ColorSpec; alpha: number; grow?: number; lighten?: number };
  /** Lily pads on the COASTLINE of pools: candidate rim spots that face
   *  open ground (not another water disc) grow pads — randomized, with
   *  natural clumps. Gated to lush biomes (data-listed). */
  pads?: { color: ColorSpec; biomes: string[] };
  /** Slow ember pulse over the body (cinder). */
  emberPulse?: { color: ColorSpec };
  /** Blade tufts scattered on the blob (grass) — clumped, two-tone, swaying. */
  tufts?: { color: ColorSpec; flower?: ColorSpec };
  /** Drifting surface highlight arcs (deep water's living sheen). */
  sheen?: { color: ColorSpec };
  /** Sliding diagonal glass bands (ice). */
  glassSheen?: { color: ColorSpec };
  /** Slow-orbiting molten glow blobs under the crust (lava). */
  crawl?: { color: ColorSpec };
  /** Static crust cracks (lava, dried beds). */
  crackle?: { color: ColorSpec };
  /** A slow swelling bubble that POPS on its cycle (bog). */
  bubbles?: { color: ColorSpec };
  /** Wet darker blotches (mud). */
  blotch?: { color: ColorSpec };
  /** Pale floating scum patches (swamp). */
  scum?: { color: ColorSpec };
  /** Wet specular glints (gore). */
  glisten?: { color: ColorSpec };
}

const liquid: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as LiquidParams;
  const { ctx, theme, time } = env;
  if (p.rim) {
    ctx.globalAlpha = p.rim.alpha;
    ctx.fillStyle = resolveColor(p.rim.color, theme);
    blobPath(ctx, group, p.rim.grow);
    ctx.fill();
  }
  const coreCol = resolveColor(p.core.color, theme);
  ctx.globalAlpha = p.core.alpha;
  ctx.fillStyle = coreCol;
  blobPath(ctx, group, p.core.grow ?? 0);
  ctx.fill();
  if (p.inner) {
    ctx.globalAlpha = p.inner.alpha;
    ctx.fillStyle = resolveColor(p.inner.color, theme);
    blobPath(ctx, group, p.inner.grow);
    ctx.fill();
  }
  if (p.fords) {
    // One water, two depths: the ford tone derives from the DEEP color
    // (lighten) and lays down as soft radial gradients per disc — shallows
    // breathe into the deep instead of ending on a cut line.
    const fordCol = p.fords.lighten !== undefined
      ? shade(coreCol, p.fords.lighten)
      : resolveColor(p.fords.color, theme, coreCol);
    for (const d of group) {
      if (!d.shallow) continue;
      const r = Math.max(4, d.radius + (p.fords.grow ?? 0));
      const g = ctx.createRadialGradient(d.pos.x, d.pos.y, 0, d.pos.x, d.pos.y, r);
      g.addColorStop(0, withAlpha(fordCol, p.fords.alpha));
      g.addColorStop(0.62, withAlpha(fordCol, p.fords.alpha * 0.75));
      g.addColorStop(1, withAlpha(fordCol, 0));
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(d.pos.x, d.pos.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (p.ripples) {
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = resolveColor(p.ripples.color, theme);
    ctx.lineWidth = 1.2;
    for (const d of group) {
      if (d.shallow) continue;
      const phase = (time * 0.5 + d.pos.x * 0.01) % 1;
      for (let k = 0; k < 2; k++) {
        const rr = ((phase + k * 0.5) % 1) * d.radius * 0.92;
        ctx.beginPath();
        ctx.arc(d.pos.x, d.pos.y, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  if (p.squiggles) {
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = resolveColor(p.squiggles.color, theme);
    ctx.lineWidth = 1.2;
    for (const d of group) {
      for (let k = 0; k < 3; k++) {
        const yy = d.pos.y - d.radius * 0.4 + k * d.radius * 0.4;
        ctx.beginPath();
        for (let x = -d.radius * 0.7; x <= d.radius * 0.7; x += 6) {
          const wy = yy + Math.sin(x * 0.12 + time * 1.5 + k) * 3;
          if (x <= -d.radius * 0.7) ctx.moveTo(d.pos.x + x, wy);
          else ctx.lineTo(d.pos.x + x, wy);
        }
        ctx.stroke();
      }
    }
  }
  if (p.pads && p.pads.biomes.includes(env.world.zone.biome ?? '')) {
    // Lily pads live on the COASTLINE: candidate rim spots that face open
    // ground (the point just outside is covered by NO other disc of this
    // body) may grow a pad clump — randomized, floating just inside the
    // shore, with the classic notch cut toward open water.
    const padCol = resolveColor(p.pads.color, theme);
    for (const w of group) {
      if (w.shallow) continue;
      const seed = ((w.pos.x * 13 + w.pos.y * 29) | 0) >>> 0;
      const candidates = 10;
      for (let i = 0; i < candidates; i++) {
        if (hash01(i, seed) > 0.4) continue; // sparse and irregular
        const a = (i / candidates) * Math.PI * 2 + hash01(i, seed + 7) * 0.6;
        const ox = w.pos.x + Math.cos(a) * (w.radius + 9);
        const oy = w.pos.y + Math.sin(a) * (w.radius + 9);
        let interior = false;
        for (const o of group) {
          if (o === w) continue;
          const dd = Math.hypot(ox - o.pos.x, oy - o.pos.y);
          if (dd < o.radius) { interior = true; break; }
        }
        if (interior) continue; // mid-lake seam, not a shore
        const px = w.pos.x + Math.cos(a) * (w.radius - 7);
        const py = w.pos.y + Math.sin(a) * (w.radius - 7);
        const clump = 1 + Math.floor(hash01(i, seed + 13) * 3);
        for (let j = 0; j < clump; j++) {
          const off = (j - (clump - 1) / 2) * 7.5;
          const cx = px + Math.cos(a + Math.PI / 2) * off;
          const cy = py + Math.sin(a + Math.PI / 2) * off;
          const pr = 2.8 + hash01(i * 5 + j, seed) * 1.9;
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = j % 2 ? padCol : shade(padCol, 0.14);
          ctx.beginPath();
          ctx.arc(cx, cy, pr, 0, Math.PI * 2);
          ctx.fill();
          // The notch: a thin wedge of open water cut toward the deep.
          const na = a + Math.PI + (hash01(j, seed + i) - 0.5);
          ctx.fillStyle = coreCol;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(na - 0.3) * pr * 1.1, cy + Math.sin(na - 0.3) * pr * 1.1);
          ctx.lineTo(cx + Math.cos(na + 0.3) * pr * 1.1, cy + Math.sin(na + 0.3) * pr * 1.1);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }
  if (p.emberPulse) {
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(time * 1.9);
    ctx.fillStyle = resolveColor(p.emberPulse.color, theme);
    blobPath(ctx, group, -8);
    ctx.fill();
  }
  if (p.sheen) {
    // Deep-water sheen: two bright arcs drifting across each pool.
    const col = resolveColor(p.sheen.color, theme);
    ctx.lineCap = 'round';
    for (const d of group) {
      if (d.shallow) continue;
      for (let k = 0; k < 2; k++) {
        const drift = time * 0.35 + d.pos.x * 0.013 + k * 2.4;
        const a0 = (drift % (Math.PI * 2));
        ctx.globalAlpha = 0.13 + 0.06 * Math.sin(time * 1.1 + k);
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(1.5, d.radius * 0.06);
        ctx.beginPath();
        ctx.arc(d.pos.x, d.pos.y, d.radius * (0.45 + k * 0.24), a0, a0 + 1.1);
        ctx.stroke();
      }
    }
  }
  if (p.glassSheen) {
    // Ice: diagonal glass bands sliding slowly — the frozen mirror.
    const col = resolveColor(p.glassSheen.color, theme);
    ctx.save();
    blobPath(ctx, group);
    ctx.clip();
    for (const d of group) {
      for (let k = 0; k < 2; k++) {
        const off = ((time * 9 + k * d.radius * 0.9 + d.pos.y * 0.3) % (d.radius * 2.4)) - d.radius * 1.2;
        const g = ctx.createLinearGradient(
          d.pos.x + off - 14, d.pos.y - off + 14,
          d.pos.x + off + 14, d.pos.y - off - 14);
        g.addColorStop(0, withAlpha(col, 0));
        g.addColorStop(0.5, withAlpha(col, 0.16));
        g.addColorStop(1, withAlpha(col, 0));
        ctx.fillStyle = g;
        ctx.globalAlpha = 1;
        ctx.fillRect(d.pos.x - d.radius, d.pos.y - d.radius, d.radius * 2, d.radius * 2);
      }
    }
    ctx.restore();
  }
  if (p.crawl) {
    // Molten crawl: glow blobs orbiting slowly beneath the crust.
    const col = resolveColor(p.crawl.color, theme);
    for (const d of group) {
      for (let k = 0; k < 2; k++) {
        const a = time * (0.22 + k * 0.13) * (k % 2 ? -1 : 1) + d.pos.x * 0.02 + k * 2.6;
        const ox = d.pos.x + Math.cos(a) * d.radius * 0.42;
        const oy = d.pos.y + Math.sin(a) * d.radius * 0.42;
        const rr = d.radius * 0.4;
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, rr);
        g.addColorStop(0, withAlpha(col, 0.4));
        g.addColorStop(1, withAlpha(col, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.fillRect(ox - rr, oy - rr, rr * 2, rr * 2);
      }
    }
  }
  if (p.crackle) {
    // Crust cracks: static jagged seams over the cooled skin.
    const col = resolveColor(p.crackle.color, theme);
    ctx.strokeStyle = withAlpha(col, 0.55);
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    for (const d of group) {
      const seed = ((d.pos.x * 5 + d.pos.y * 11) | 0) >>> 0;
      for (let i = 0; i < 3; i++) {
        let x = d.pos.x + (hash01(i, seed) - 0.5) * d.radius;
        let y = d.pos.y + (hash01(i, seed + 3) - 0.5) * d.radius;
        const ang0 = hash01(i, seed + 7) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 3; s++) {
          const ang = ang0 + (hash01(i * 5 + s, seed) - 0.5) * 1.6;
          x += Math.cos(ang) * d.radius * 0.3;
          y += Math.sin(ang) * d.radius * 0.3;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }
  if (p.bubbles) {
    // The bog breathes: one bubble per disc swells on its own clock, POPS
    // (a fading ring), and starts again.
    const col = resolveColor(p.bubbles.color, theme);
    for (const d of group) {
      const seed = ((d.pos.x * 3 + d.pos.y * 13) | 0) >>> 0;
      const period = 2.6 + hash01(seed, 5) * 2.2;
      const cyc = ((time + hash01(seed, 9) * period) % period) / period;
      const bx = d.pos.x + (hash01(seed, 13) - 0.5) * d.radius * 0.9;
      const by = d.pos.y + (hash01(seed, 17) - 0.5) * d.radius * 0.9;
      if (cyc < 0.8) {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(bx, by, 1.5 + cyc * 4.5, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const pop = (cyc - 0.8) / 0.2;
        ctx.globalAlpha = 0.5 * (1 - pop);
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(bx, by, 5 + pop * 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  if (p.blotch) {
    // Wet mud patches: darker irregular pools inside the bed.
    const col = resolveColor(p.blotch.color, theme);
    ctx.fillStyle = col;
    for (const d of group) {
      const seed = ((d.pos.x * 17 + d.pos.y * 7) | 0) >>> 0;
      for (let i = 0; i < 3; i++) {
        const a = hash01(i, seed) * Math.PI * 2;
        const rr = Math.sqrt(hash01(i, seed + 3)) * d.radius * 0.6;
        ctx.globalAlpha = 0.24;
        ctx.beginPath();
        ctx.ellipse(d.pos.x + Math.cos(a) * rr, d.pos.y + Math.sin(a) * rr,
          d.radius * (0.16 + hash01(i, seed + 7) * 0.14), d.radius * 0.12,
          hash01(i, seed + 9) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // One wet sheen glint.
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(d.pos.x - d.radius * 0.24, d.pos.y - d.radius * 0.24, d.radius * 0.18, d.radius * 0.07, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col;
    }
  }
  if (p.scum) {
    // Swamp scum: pale mats adrift on the standing murk.
    const col = resolveColor(p.scum.color, theme);
    ctx.fillStyle = col;
    for (const d of group) {
      const seed = ((d.pos.x * 9 + d.pos.y * 5) | 0) >>> 0;
      for (let i = 0; i < 2; i++) {
        const a = hash01(i, seed) * Math.PI * 2 + time * 0.06 * (i % 2 ? 1 : -1);
        const rr = d.radius * (0.3 + hash01(i, seed + 3) * 0.25);
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.ellipse(d.pos.x + Math.cos(a) * d.radius * 0.4, d.pos.y + Math.sin(a) * d.radius * 0.4,
          rr, rr * 0.6, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (p.glisten) {
    // Gore glisten: wet specular pinpricks, faintly pulsing.
    const col = resolveColor(p.glisten.color, theme);
    ctx.fillStyle = col;
    for (const d of group) {
      const seed = ((d.pos.x * 11 + d.pos.y * 3) | 0) >>> 0;
      for (let i = 0; i < 4; i++) {
        const a = hash01(i, seed) * Math.PI * 2;
        const rr = Math.sqrt(hash01(i, seed + 5)) * d.radius * 0.7;
        ctx.globalAlpha = 0.25 + 0.2 * Math.sin(time * 2.2 + i * 1.8 + seed);
        ctx.beginPath();
        ctx.arc(d.pos.x + Math.cos(a) * rr, d.pos.y + Math.sin(a) * rr, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (p.tufts) {
    // RICH TUFTS: clumps of 5 curved blades, two-tone, gently SWAYING —
    // grass that reads alive instead of scratched-on.
    const base = resolveColor(p.tufts.color, theme);
    const lit = shade(base, 0.22);
    const flower = p.tufts.flower ? resolveColor(p.tufts.flower, theme) : null;
    ctx.lineCap = 'round';
    for (const g of group) {
      const seed = ((g.pos.x * 13 + g.pos.y * 5) | 0) >>> 0;
      const clumps = 5;
      for (let i = 0; i < clumps; i++) {
        const a = (i / clumps) * Math.PI * 2 + hash01(i, seed);
        const cx = g.pos.x + Math.cos(a) * g.radius * (0.3 + hash01(i, seed + 3) * 0.35);
        const cy = g.pos.y + Math.sin(a) * g.radius * (0.3 + hash01(i, seed + 5) * 0.35);
        const sway = Math.sin(time * 1.7 + cx * 0.05) * 1.6;
        for (let b = 0; b < 5; b++) {
          const off = (b - 2) * 1.7;
          const h = 5 + hash01(b, seed + i) * 4;
          ctx.globalAlpha = 0.6;
          ctx.strokeStyle = b % 2 ? base : lit;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(cx + off, cy + 3);
          ctx.quadraticCurveTo(cx + off + sway * 0.4, cy - h * 0.5, cx + off + sway + (b - 2) * 0.8, cy - h);
          ctx.stroke();
        }
        if (flower && hash01(i, seed + 11) > 0.72) {
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = flower;
          ctx.beginPath();
          ctx.arc(cx + sway, cy - 7, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  ctx.globalAlpha = 1;
};

// --- STANDING OBJECTS --------------------------------------------------------

export interface MoundParams {
  color: ColorSpec;
  edge?: ColorSpec;
  material?: string;
  /** Diagonal cross-hatch inside the disc (stone). */
  hatch?: boolean;
  /** Pale barnacle blotch (sea rock). */
  barnacle?: ColorSpec;
}

/** A lit mound with ramp-based volume — rocks stop being flat pancakes. */
const mound: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as MoundParams;
  const { ctx, theme } = env;
  for (const o of group) {
    const base = resolveColor(p.color, theme);
    const ramp = rampOf(base, materialOf(p.material ?? 'stone'));
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    if (o.rot !== undefined) ctx.rotate(o.rot);
    ctx.fillStyle = ramp.base;
    ctx.strokeStyle = p.edge ? resolveColor(p.edge, theme) : withAlpha(ramp.outline, 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, o.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, o.radius, 0, Math.PI * 2);
    ctx.clip();
    // Volume: lit up-left, occluded down-right.
    const lg = ctx.createRadialGradient(-o.radius * 0.4, -o.radius * 0.4, o.radius * 0.1, -o.radius * 0.4, -o.radius * 0.4, o.radius * 1.5);
    lg.addColorStop(0, withAlpha(ramp.light, 0.5));
    lg.addColorStop(1, withAlpha(ramp.light, 0));
    ctx.fillStyle = lg;
    ctx.fillRect(-o.radius, -o.radius, o.radius * 2, o.radius * 2);
    const sg = ctx.createRadialGradient(o.radius * 0.5, o.radius * 0.5, o.radius * 0.1, o.radius * 0.5, o.radius * 0.5, o.radius * 1.5);
    sg.addColorStop(0, withAlpha(ramp.shadow, 0.55));
    sg.addColorStop(1, withAlpha(ramp.shadow, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(-o.radius, -o.radius, o.radius * 2, o.radius * 2);
    if (p.hatch) {
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.2;
      const sp = Math.max(5, o.radius * 0.5);
      for (let d = -o.radius; d <= o.radius; d += sp) {
        ctx.beginPath(); ctx.moveTo(d, -o.radius); ctx.lineTo(d + o.radius * 2, o.radius); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(d, o.radius); ctx.lineTo(d + o.radius * 2, -o.radius); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (p.barnacle) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = resolveColor(p.barnacle, theme);
      ctx.beginPath();
      ctx.arc(-o.radius * 0.3, -o.radius * 0.3, o.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.restore();
  }
};

export interface ShardParams {
  points: number;
  color: ColorSpec;
  material?: string;
  /** Pulsing lit core (crystal). */
  coreGlow?: { color: ColorSpec };
  /** Accent-stroked facet edge (obsidian). */
  edgeGlow?: { color: ColorSpec; alpha: number };
}

/** Faceted crystalline/volcanic shards. */
const shard: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as ShardParams;
  const { ctx, theme, time } = env;
  for (const o of group) {
    const base = resolveColor(p.color, theme);
    const ramp = rampOf(base, materialOf(p.material ?? 'crystal'));
    const pulse = 0.55 + 0.45 * Math.sin(time * 2.5 + o.pos.x * 0.05);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    ctx.fillStyle = ramp.base;
    jaggedPoly(ctx, p.points, o.radius, 0.3, (o.pos.x * 7 + o.pos.y) | 0);
    ctx.fill();
    // Facet shading: one lit wedge, one shadowed.
    ctx.save();
    jaggedPoly(ctx, p.points, o.radius, 0.3, (o.pos.x * 7 + o.pos.y) | 0);
    ctx.clip();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = ramp.light;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-o.radius * 1.4, -o.radius * 1.2); ctx.lineTo(o.radius * 0.4, -o.radius * 1.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = ramp.shadow;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(o.radius * 1.4, o.radius * 1.2); ctx.lineTo(-o.radius * 0.4, o.radius * 1.4); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (p.edgeGlow) {
      ctx.globalAlpha = p.edgeGlow.alpha;
      ctx.strokeStyle = resolveColor(p.edgeGlow.color, theme);
      ctx.lineWidth = 1.5;
      jaggedPoly(ctx, p.points, o.radius, 0.3, (o.pos.x * 7 + o.pos.y) | 0);
      ctx.stroke();
    }
    if (p.coreGlow) {
      ctx.globalAlpha = pulse;
      ctx.fillStyle = resolveColor(p.coreGlow.color, theme);
      ctx.beginPath();
      ctx.arc(0, 0, o.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

export interface VentParams {
  rim: ColorSpec; throat: ColorSpec; hot: ColorSpec; core: ColorSpec;
}

/** Molten vents: obsidian rim, pulsing throat, bright core. */
const vent: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as VentParams;
  const { ctx, theme, time } = env;
  for (const v of group) {
    const r = v.radius, glow = 0.5 + 0.5 * Math.sin(time * 3.3 + v.pos.x * 0.04);
    ctx.fillStyle = resolveColor(p.rim, theme);
    ctx.beginPath(); ctx.arc(v.pos.x, v.pos.y, r * 1.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = resolveColor(p.throat, theme);
    ctx.beginPath(); ctx.arc(v.pos.x, v.pos.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.5 + 0.45 * glow;
    ctx.fillStyle = resolveColor(p.hot, theme);
    ctx.beginPath(); ctx.arc(v.pos.x, v.pos.y, r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.4 + 0.5 * glow;
    ctx.fillStyle = resolveColor(p.core, theme);
    ctx.beginPath(); ctx.arc(v.pos.x, v.pos.y, r * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
};

export interface PodParams {
  body: ColorSpec; glow: ColorSpec;
  aspectY: number; glowY: number; glowR: number; pulseRate: number;
}

/** Bulbous organic sacs with a pulsing lit core (flesh/spore pods). */
const pod: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as PodParams;
  const { ctx, theme, time } = env;
  for (const o of group) {
    const r = o.radius, pulse = 0.5 + 0.5 * Math.sin(time * p.pulseRate + o.pos.x * 0.05);
    const body = resolveColor(p.body, theme);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * p.aspectY, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = withAlpha(shade(body, -0.45), 0.7);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 0.4 + 0.45 * pulse;
    ctx.fillStyle = resolveColor(p.glow, theme);
    ctx.beginPath(); ctx.arc(0, r * p.glowY, r * p.glowR, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

/** Bioluminescent half-dome caps with a breathing halo (glow caps). */
const dome: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { halo?: ColorSpec; cap?: ColorSpec };
  const { ctx, theme, time } = env;
  for (const o of group) {
    const r = o.radius, glow = 0.5 + 0.5 * Math.sin(time * 3 + o.pos.x * 0.1);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.globalAlpha = 0.22 + 0.28 * glow;
    ctx.fillStyle = resolveColor(p.halo, theme);
    ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = resolveColor(p.cap, theme);
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.7, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
};

/** Pale spine-and-rib struts (bone fields). */
const bones: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec };
  const { ctx, theme } = env;
  const col = resolveColor(p.color, theme, '#d8cdb8');
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(3, r * 0.4);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.4); ctx.lineTo(r * 0.7, -r * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.15); ctx.lineTo(r * 0.7, r * 0.15); ctx.stroke();
    // Aged shading along the spine.
    ctx.strokeStyle = withAlpha(shade(col, -0.4), 0.5);
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(0, r * 0.9); ctx.stroke();
    ctx.restore();
  }
};

export interface SlabParams {
  shape: 'arch' | 'monolith';
  fill: ColorSpec; edge: ColorSpec;
  /** Carved cross lines (tombstones). */
  engraving?: ColorSpec;
  /** Pulsing gem inset (obelisks). */
  gem?: { color: ColorSpec };
}

/** Standing stones: rounded tombstones and jagged monoliths. */
const slab: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as SlabParams;
  const { ctx, theme, time } = env;
  for (const o of group) {
    const r = o.radius;
    const fill = resolveColor(p.fill, theme);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    if (o.rot !== undefined) ctx.rotate(o.rot);
    ctx.fillStyle = fill;
    ctx.strokeStyle = resolveColor(p.edge, theme);
    ctx.lineWidth = 2;
    if (p.shape === 'arch') {
      const w = r * 1.3, h = r * 1.9;
      ctx.beginPath();
      ctx.moveTo(-w / 2, h / 2);
      ctx.lineTo(-w / 2, -h / 4);
      ctx.arc(0, -h / 4, w / 2, Math.PI, 0);
      ctx.lineTo(w / 2, h / 2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Weathered top-light.
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = shade(fill, 0.35);
      ctx.beginPath();
      ctx.arc(0, -h / 4, w / 2 - 2, Math.PI, 0);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (p.engraving) {
        const eng = resolveColor(p.engraving, theme);
        ctx.strokeStyle = eng;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.53); ctx.lineTo(0, r * 0.19);
        ctx.moveTo(-r * 0.29, -r * 0.23); ctx.lineTo(r * 0.29, -r * 0.23);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.4); ctx.lineTo(r * 0.7, -r * 0.2); ctx.lineTo(r * 0.45, r);
      ctx.lineTo(-r * 0.45, r); ctx.lineTo(-r * 0.7, -r * 0.2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Lit left face.
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = shade(fill, 0.4);
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.4); ctx.lineTo(-r * 0.7, -r * 0.2); ctx.lineTo(-r * 0.45, r); ctx.lineTo(0, r * 0.6);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (p.gem) {
      const gl = 0.4 + 0.3 * Math.sin(time * 2.2 + o.pos.x);
      ctx.globalAlpha = gl;
      ctx.fillStyle = resolveColor(p.gem.color, theme);
      ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
};

/** Glowing crystalline star-clusters (Descent light spots). */
const sparkle: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { halo?: ColorSpec; fill?: ColorSpec; edge?: ColorSpec };
  const { ctx, theme, time } = env;
  for (const o of group) {
    const r = o.radius, pulse = 0.55 + 0.45 * Math.sin(time * 3 + o.pos.x * 0.05);
    ctx.save();
    ctx.globalAlpha = 0.22 * pulse;
    ctx.fillStyle = resolveColor(p.halo, theme, '#ffe08a');
    ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, r * 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = resolveColor(p.fill, theme, '#fff2c0');
    ctx.strokeStyle = resolveColor(p.edge, theme, '#ffd060');
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + (o.rot ?? 0);
      ctx.beginPath();
      ctx.moveTo(o.pos.x + Math.cos(a) * r, o.pos.y + Math.sin(a) * r);
      ctx.lineTo(o.pos.x + Math.cos(a + 0.5) * r * 0.4, o.pos.y + Math.sin(a + 0.5) * r * 0.4);
      ctx.lineTo(o.pos.x, o.pos.y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

/** The Descent's ringed dwell platform. */
const platformRing: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec };
  const { ctx, theme, time } = env;
  const col = resolveColor(p.color, theme, '#7fe0d8');
  for (const o of group) {
    const r = o.radius, pulse = 0.5 + 0.5 * Math.sin(time * 2);
    ctx.save();
    ctx.globalAlpha = 0.85; ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.3 + 0.3 * pulse; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, r * 0.62, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#040810';
    ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.restore();
  }
};

/** Swaying translucent kelp blades. */
const kelp: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec };
  const { ctx, theme, time } = env;
  const col = resolveColor(p.color, theme, '#2f7a4a');
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    const blades = 3 + ((o.pos.x | 0) % 3);
    for (let i = 0; i < blades; i++) {
      const bx = o.pos.x + ((i / blades) - 0.4) * r * 1.2;
      const sway = Math.sin(time * 1.6 + o.pos.x * 0.04 + i) * (r * 0.18);
      ctx.lineWidth = 3 + (i % 2);
      ctx.beginPath();
      ctx.moveTo(bx, o.pos.y + r * 0.5);
      ctx.quadraticCurveTo(bx + sway * 0.5, o.pos.y, bx + sway, o.pos.y - r * 0.7);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

/** Branching coral heads over a dark base. */
const coral: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { base?: ColorSpec; branch?: ColorSpec };
  const { ctx, theme } = env;
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    ctx.fillStyle = resolveColor(p.base, theme, '#1a3a44');
    ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.7, 0, Math.PI * 2); ctx.fill();
    const br = resolveColor(p.branch, theme, '#e87aa0');
    ctx.strokeStyle = br;
    ctx.lineWidth = Math.max(3, r * 0.28);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i - 1.5) * 0.5;
      ctx.beginPath(); ctx.moveTo(0, r * 0.3);
      ctx.lineTo(Math.cos(a) * r * 0.9, r * 0.3 + Math.sin(a) * r * 1.1); ctx.stroke();
    }
    // Sun-side tips.
    ctx.strokeStyle = shade(br, 0.3);
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i - 1.5) * 0.5;
      const tx = Math.cos(a) * r * 0.9, ty = r * 0.3 + Math.sin(a) * r * 1.1;
      ctx.beginPath(); ctx.moveTo(tx - Math.cos(a) * r * 0.2, ty - Math.sin(a) * r * 0.2); ctx.lineTo(tx, ty); ctx.stroke();
    }
    ctx.restore();
  }
};

/** Young transient trees that wilt away (the terraform growths). */
const sapling: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { crown?: ColorSpec; stem?: ColorSpec };
  const { ctx, theme } = env;
  const crown = resolveColor(p.crown, theme, '#2c4424');
  const stem = resolveColor(p.stem, theme, '#5a4630');
  for (const d of group) {
    const vigor = 1 - Math.min(1, Math.max(0, d.wilt ?? 0));
    const r = d.radius * (0.45 + 0.55 * vigor);
    ctx.globalAlpha = 0.25 + 0.65 * vigor;
    ctx.strokeStyle = stem;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(d.pos.x, d.pos.y + r * 0.9);
    ctx.lineTo(d.pos.x, d.pos.y - r * 0.4);
    ctx.stroke();
    ctx.fillStyle = crown;
    ctx.beginPath();
    ctx.arc(d.pos.x, d.pos.y - r * 0.55, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

/** Planks spanning a gap (bridges). */
const plank: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { fill?: ColorSpec; line?: ColorSpec };
  const { ctx, theme } = env;
  const fill = resolveColor(p.fill, theme, '#5e4730');
  const line = resolveColor(p.line, theme, '#3c2c1c');
  for (const b of group) {
    ctx.save();
    ctx.translate(b.pos.x, b.pos.y);
    ctx.rotate(b.dir ?? 0);
    ctx.fillStyle = fill;
    ctx.fillRect(-b.radius, -b.radius * 0.82, b.radius * 2, b.radius * 1.64);
    // Worn mid-track.
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = shade(fill, 0.2);
    ctx.fillRect(-b.radius, -b.radius * 0.3, b.radius * 2, b.radius * 0.6);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-b.radius, -b.radius * 0.82); ctx.lineTo(b.radius, -b.radius * 0.82);
    ctx.moveTo(-b.radius, b.radius * 0.82); ctx.lineTo(b.radius, b.radius * 0.82);
    ctx.moveTo(0, -b.radius * 0.82); ctx.lineTo(0, b.radius * 0.82);
    ctx.stroke();
    ctx.restore();
  }
};

/** The harbor dock: planks + posts + lantern + the Sail prompt. */
const dock: GroupPainter = (env, group) => {
  const { ctx, time, world } = env;
  for (const o of group) {
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.fillStyle = '#5a4426';
    ctx.fillRect(-o.radius, -o.radius * 0.5, o.radius * 2, o.radius);
    ctx.strokeStyle = '#2c2013';
    ctx.lineWidth = 1.5;
    for (let x = -o.radius + 8; x < o.radius; x += 10) {
      ctx.beginPath(); ctx.moveTo(x, -o.radius * 0.5); ctx.lineTo(x, o.radius * 0.5); ctx.stroke();
    }
    ctx.fillStyle = '#3a2c18';
    ctx.fillRect(-o.radius - 4, -6, 8, 12);
    ctx.fillRect(o.radius - 4, -6, 8, 12);
    const glow = 0.5 + 0.4 * Math.sin(time * 2.2);
    ctx.globalAlpha = 0.25 * glow;
    ctx.fillStyle = '#ffd898';
    ctx.beginPath(); ctx.arc(0, -o.radius * 0.9, 16, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd898';
    ctx.beginPath(); ctx.arc(0, -o.radius * 0.9, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const sp = world.sailPrompt();
    if (sp) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px Verdana';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(sp, o.pos.x, o.pos.y - o.radius - 20);
      ctx.fillStyle = '#9ad0e8';
      ctx.fillText(sp, o.pos.x, o.pos.y - o.radius - 20);
    }
  }
};

/** Palisade wall posts. */
const palisade: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { fill?: ColorSpec; edge?: ColorSpec };
  const { ctx, theme } = env;
  const fill = resolveColor(p.fill, theme, '#5e4c34');
  for (const o of group) {
    const r = o.radius;
    ctx.fillStyle = fill;
    ctx.strokeStyle = resolveColor(p.edge, theme, '#2c2418');
    ctx.lineWidth = 2;
    ctx.fillRect(o.pos.x - r * 0.85, o.pos.y - r * 0.85, r * 1.7, r * 1.7);
    ctx.strokeRect(o.pos.x - r * 0.85, o.pos.y - r * 0.85, r * 1.7, r * 1.7);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(o.pos.x - r * 0.85, o.pos.y - r * 0.85, r * 1.7, r * 0.4);
    ctx.globalAlpha = 1;
  }
};

/** Arrow-slit window dressing (the region beneath renders via the grid). */
const windowSlit: GroupPainter = (env, group) => {
  const { ctx } = env;
  for (const o of group) {
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    if (o.rot !== undefined) ctx.rotate(o.rot);
    ctx.fillStyle = '#11141c';
    ctx.fillRect(-o.radius * 0.7, -o.radius * 0.28, o.radius * 1.4, o.radius * 0.56);
    ctx.strokeStyle = '#6a7080';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-o.radius * 0.7, -o.radius * 0.28, o.radius * 1.4, o.radius * 0.56);
    ctx.restore();
  }
};

/** Cave mouths: a black throat under a stone lip, with a flickering glow. */
const caveMouth: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { glow?: ColorSpec; label?: string };
  const { ctx, theme, time } = env;
  for (const o of group) {
    const flick = 0.85 + 0.15 * Math.sin(time * 5 + o.pos.x);
    ctx.globalAlpha = 0.16 * flick;
    ctx.fillStyle = resolveColor(p.glow, theme, '#caa860');
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, o.radius * 1.4 * flick, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0a0a0c';
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, o.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.obstacleEdge;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, o.radius, Math.PI, 0);
    ctx.stroke();
    if (p.label) {
      ctx.fillStyle = '#d8d4c8';
      ctx.font = '11px Verdana';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, o.pos.x, o.pos.y + o.radius + 14);
    }
  }
};

/** Campfires: layered flame over stones with a warm flicker. */
const campfire: GroupPainter = (env, group) => {
  const { ctx, time } = env;
  for (const o of group) {
    const flick = 0.85 + 0.15 * Math.sin(time * 11 + o.pos.x);
    ctx.globalAlpha = 0.18 * flick;
    ctx.fillStyle = '#ffae52';
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, o.radius * 2.6 * flick, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#3a3026';
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, o.radius * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8838';
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y - 2, o.radius * 0.5 * flick, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y - 3, o.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** Trunk shadows for canopy kinds (crowns draw in the canopy pass). */
const groundShadow: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec; scale?: number };
  const { ctx, theme } = env;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = resolveColor(p.color, theme, '#241c12');
  for (const o of group) {
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, o.radius * (p.scale ?? 0.4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

/** A REAL TRUNK on the forest floor — bark disc with growth rings and root
 *  flares, sized to the kind's PHYSICAL body (walk-under trees). The crown
 *  rides the canopy pass above; this is what you see standing beneath it. */
const trunk: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec; scale?: number; roots?: number };
  const { ctx, theme } = env;
  const bark = resolveColor(p.color, theme, '#5a4630');
  const scale = p.scale ?? 0.3;
  for (const o of group) {
    const r = o.radius * scale;
    const seed = ((o.pos.x * 11 + o.pos.y * 5) | 0) >>> 0;
    // The crown's soft ground shadow first (the floor still reads occupied).
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#12100a';
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, o.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Root flares: short buttress nubs around the bole.
    const roots = Math.round(p.roots ?? 4);
    ctx.strokeStyle = shade(bark, -0.22);
    ctx.lineWidth = Math.max(2.5, r * 0.4);
    ctx.lineCap = 'round';
    for (let i = 0; i < roots; i++) {
      const a = (i / roots) * Math.PI * 2 + hash01(i, seed) * 0.9;
      ctx.beginPath();
      ctx.moveTo(o.pos.x + Math.cos(a) * r * 0.6, o.pos.y + Math.sin(a) * r * 0.6);
      ctx.lineTo(o.pos.x + Math.cos(a) * r * 1.5, o.pos.y + Math.sin(a) * r * 1.5);
      ctx.stroke();
    }
    // The bole: bark disc + growth rings + a lit edge.
    ctx.fillStyle = bark;
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(bark, -0.45), 0.8);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = withAlpha(shade(bark, -0.3), 0.6);
    ctx.lineWidth = 1;
    for (const f of [0.62, 0.34]) {
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y, r * f, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = withAlpha(shade(bark, 0.28), 0.7);
    ctx.lineWidth = Math.max(1, r * 0.14);
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, r * 0.82, -2.5, -1.1);
    ctx.stroke();
  }
};

/** A TRUE BUSH — overlapping scallop-edged leaf lobes with vein strokes,
 *  sun-side highlights and a shadowed heart you can vanish into. Reads
 *  LEAFY at a glance: never a bog, never a slime. */
const brush: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec };
  const { ctx, theme } = env;
  for (const b of group) {
    const base = resolveColor(p.color, theme, '#2c4424');
    const lobeDark = shade(base, -0.22);
    const lobeLight = shade(base, 0.16);
    const seed = ((b.pos.x * 13 + b.pos.y * 7) | 0) >>> 0;
    ctx.save();
    ctx.translate(b.pos.x, b.pos.y);
    if (b.rot !== undefined) ctx.rotate(b.rot);
    // The shadowed heart first — depth you could hide in.
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = shade(base, -0.45);
    ctx.beginPath();
    ctx.arc(0, 0, b.radius * 0.82, 0, Math.PI * 2);
    ctx.fill();
    // Leaf lobes: a ring of scallop-edged clumps + a crown clump, each with
    // veins and a lit rim on the sun side.
    const lobes = 5 + (seed % 2);
    const drawLobe = (lx: number, ly: number, lr: number, i: number): void => {
      const tone = i % 2 ? base : lobeDark;
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = tone;
      ctx.beginPath();
      // Scalloped silhouette: 7 bumps around the lobe.
      for (let k = 0; k <= 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        const rr = lr * (0.82 + 0.18 * Math.abs(Math.sin(a * 3.5 + i)));
        const x = lx + Math.cos(a) * rr, y = ly + Math.sin(a) * rr;
        if (k === 0) ctx.moveTo(x, y); else ctx.quadraticCurveTo(
          lx + Math.cos(a - 0.45) * rr * 1.12, ly + Math.sin(a - 0.45) * rr * 1.12, x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = withAlpha(shade(base, -0.5), 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
      // Center vein + two side veins.
      ctx.strokeStyle = withAlpha(lobeLight, 0.6);
      ctx.lineWidth = Math.max(1, lr * 0.08);
      ctx.beginPath();
      ctx.moveTo(lx - lr * 0.5, ly + lr * 0.3);
      ctx.quadraticCurveTo(lx, ly - lr * 0.1, lx + lr * 0.55, ly - lr * 0.4);
      ctx.stroke();
      // Sun-side lit rim.
      ctx.strokeStyle = withAlpha(lobeLight, 0.5);
      ctx.lineWidth = Math.max(1.2, lr * 0.12);
      ctx.beginPath();
      ctx.arc(lx, ly, lr * 0.72, -2.6, -1.1);
      ctx.stroke();
    };
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2 + (seed % 7) * 0.3;
      const d = b.radius * 0.52;
      drawLobe(Math.cos(a) * d, Math.sin(a) * d, b.radius * (0.42 + hash01(i, seed) * 0.12), i);
    }
    drawLobe(-b.radius * 0.08, -b.radius * 0.08, b.radius * 0.5, 1);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

/** HEAT SHIMMER — wavering desert air: rising serpentine heat-lines and a
 *  faint hot lens over the ground. Barely-there by design; the sunscorch
 *  stacks it feeds are the teeth (World.updateHeat). */
const shimmer: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec };
  const { ctx, time } = env;
  const col = resolveColor(p.color, env.theme, '#ffe8c0');
  for (const d of group) {
    // The hot lens: a soft warm wash that marks the field's true extent.
    const g = ctx.createRadialGradient(d.pos.x, d.pos.y, d.radius * 0.2, d.pos.x, d.pos.y, d.radius);
    g.addColorStop(0, withAlpha(col, 0.11));
    g.addColorStop(1, withAlpha(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(d.pos.x, d.pos.y, d.radius, 0, Math.PI * 2);
    ctx.fill();
    // Rising heat-lines: short serpentine strokes drifting upward, wrapping.
    const seed = ((d.pos.x * 7 + d.pos.y * 13) | 0) >>> 0;
    const n = Math.max(3, Math.round(d.radius / 22));
    ctx.strokeStyle = withAlpha(col, 0.16);
    ctx.lineWidth = 1.4;
    for (let i = 0; i < n; i++) {
      const bx = d.pos.x + (hash01(i, seed) - 0.5) * d.radius * 1.5;
      const rise = d.radius * 1.1;
      const phase = ((time * 26 + hash01(i, seed + 3) * rise * 2) % rise);
      const by = d.pos.y + d.radius * 0.55 - phase;
      const len = d.radius * 0.34;
      ctx.globalAlpha = 0.5 * (1 - phase / rise) + 0.1;
      ctx.beginPath();
      for (let s = 0; s <= 5; s++) {
        const t = s / 5;
        const x = bx + Math.sin(t * Math.PI * 2 + time * 3 + i) * 3.2;
        const y = by - t * len;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
};

/** A DESERT CACTUS from above: a swollen central lobe ringed by arms, rib
 *  lines, and a halo of fine spines. */
const cactus: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec };
  const { ctx, theme } = env;
  const base = resolveColor(p.color, theme, '#4a7a3c');
  for (const o of group) {
    const seed = ((o.pos.x * 7 + o.pos.y * 3) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    const arms = 2 + (seed % 3);
    // Arm lobes first, then the crown lobe over them.
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2 + hash01(i, seed);
      const d = o.radius * 0.58;
      const r = o.radius * (0.34 + hash01(i, seed + 3) * 0.14);
      ctx.fillStyle = shade(base, -0.12);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha(shade(base, -0.45), 0.7);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.arc(0, 0, o.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(base, -0.45), 0.8);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Ribs radiating from the crown + a lit edge.
    ctx.strokeStyle = withAlpha(shade(base, -0.3), 0.6);
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * o.radius * 0.12, Math.sin(a) * o.radius * 0.12);
      ctx.lineTo(Math.cos(a) * o.radius * 0.5, Math.sin(a) * o.radius * 0.5);
      ctx.stroke();
    }
    ctx.strokeStyle = withAlpha(shade(base, 0.3), 0.6);
    ctx.lineWidth = Math.max(1, o.radius * 0.08);
    ctx.beginPath();
    ctx.arc(0, 0, o.radius * 0.42, -2.6, -1.1);
    ctx.stroke();
    // Spines: a fine pale halo of ticks.
    ctx.strokeStyle = withAlpha('#e8e4c8', 0.55);
    ctx.lineWidth = 1;
    const spines = 10;
    for (let i = 0; i < spines; i++) {
      const a = (i / spines) * Math.PI * 2 + hash01(i, seed) * 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * o.radius * 0.58, Math.sin(a) * o.radius * 0.58);
      ctx.lineTo(Math.cos(a) * o.radius * 0.74, Math.sin(a) * o.radius * 0.74);
      ctx.stroke();
    }
    ctx.restore();
  }
};

/** A SPIDER WEB sheet: radial spokes + sagging rings, pale and sticky. */
const web: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec };
  const { ctx, theme } = env;
  const col = resolveColor(p.color, theme, '#d8d4c8');
  for (const o of group) {
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, o.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    const spokes = 7;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * o.radius, Math.sin(a) * o.radius);
      ctx.stroke();
    }
    // Sagging rings: arcs bowing between spokes.
    for (let ring = 1; ring <= 3; ring++) {
      const rr = o.radius * ring / 3.4;
      ctx.beginPath();
      for (let i = 0; i <= spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        const mid = a - Math.PI / spokes;
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.quadraticCurveTo(Math.cos(mid) * rr * 0.86, Math.sin(mid) * rr * 0.86, x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

/** A DEAD SNAG: bare branching limbs off a dark bole — no canopy, no life. */
const deadTree: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec };
  const { ctx, theme } = env;
  const bark = resolveColor(p.color, theme, '#4a4038');
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 3) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    ctx.lineCap = 'round';
    // Limbs: gnarled two-segment branches radiating.
    const limbs = 5 + (seed % 3);
    for (let i = 0; i < limbs; i++) {
      const a = (i / limbs) * Math.PI * 2 + hash01(i, seed) * 0.6;
      const bend = (hash01(i, seed + 5) - 0.5) * 1.1;
      const l1 = o.radius * (0.45 + hash01(i, seed + 9) * 0.25);
      const l2 = o.radius * (0.3 + hash01(i, seed + 13) * 0.3);
      ctx.strokeStyle = i % 2 ? bark : shade(bark, -0.14);
      ctx.lineWidth = Math.max(2, o.radius * 0.11);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * o.radius * 0.16, Math.sin(a) * o.radius * 0.16);
      const mx = Math.cos(a) * l1, my = Math.sin(a) * l1;
      ctx.lineTo(mx, my);
      ctx.lineTo(mx + Math.cos(a + bend) * l2, my + Math.sin(a + bend) * l2);
      ctx.stroke();
      // A twig off the elbow.
      ctx.lineWidth = Math.max(1, o.radius * 0.05);
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + Math.cos(a - bend) * l2 * 0.5, my + Math.sin(a - bend) * l2 * 0.5);
      ctx.stroke();
    }
    // The bole.
    ctx.fillStyle = shade(bark, -0.2);
    ctx.beginPath();
    ctx.arc(0, 0, o.radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha('#141210', 0.8);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }
};

/** A CUT STUMP: growth rings and a split — feet stop, arrows don't. */
const stump: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.color, theme, '#8a6e48');
  for (const o of group) {
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    ctx.fillStyle = shade(wood, -0.35);
    ctx.beginPath();
    ctx.arc(0, 0, o.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.arc(0, 0, o.radius * 0.82, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(wood, -0.4), 0.7);
    ctx.lineWidth = 1;
    for (const f of [0.62, 0.42, 0.22]) {
      ctx.beginPath();
      ctx.arc(0, 0, o.radius * f, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The split.
    ctx.strokeStyle = withAlpha(shade(wood, -0.5), 0.85);
    ctx.lineWidth = Math.max(1.4, o.radius * 0.09);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(o.radius * 0.8, o.radius * 0.25);
    ctx.stroke();
    ctx.restore();
  }
};

/** A FALLEN LOG: an elongated mossy trunk lying across the ground. */
const log: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec; moss?: ColorSpec };
  const { ctx, theme } = env;
  const bark = resolveColor(p.color, theme, '#5e4a32');
  const moss = resolveColor(p.moss, theme, theme.tree ?? '#3c5c2e');
  for (const o of group) {
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    const L = o.radius * 1.7, W = o.radius * 0.62;
    // Trunk body.
    ctx.fillStyle = bark;
    ctx.beginPath();
    ctx.roundRect(-L, -W, L * 2, W * 2, W);
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(bark, -0.45), 0.8);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Bark grain.
    ctx.strokeStyle = withAlpha(shade(bark, -0.3), 0.6);
    ctx.lineWidth = 1;
    for (const f of [-0.4, 0, 0.4]) {
      ctx.beginPath();
      ctx.moveTo(-L * 0.85, W * f);
      ctx.lineTo(L * 0.85, W * f);
      ctx.stroke();
    }
    // The sawn end: rings.
    ctx.fillStyle = shade(bark, 0.22);
    ctx.beginPath();
    ctx.ellipse(L, 0, W * 0.42, W, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(bark, -0.35), 0.7);
    ctx.beginPath();
    ctx.ellipse(L, 0, W * 0.24, W * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    // A moss saddle.
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = moss;
    ctx.beginPath();
    ctx.ellipse(-L * 0.3, -W * 0.3, L * 0.42, W * 0.5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

/** FOG FLOOR — the bank's faint ground wash (the VOLUME rides the canopy
 *  pass as fogCloud; this just roots it to the terrain). */
const fogFloor: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec };
  const { ctx, theme } = env;
  const col = resolveColor(p.color, theme, '#aab6c2');
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = col;
  blobPath(ctx, group, 4);
  ctx.fill();
  ctx.globalAlpha = 1;
};

/** A GRAVEL PATH — packed track with deterministic grit, worn pale center,
 *  and edge stones so the road reads maintained, not spilled. */
const gravelPath: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec };
  const { ctx, theme } = env;
  const base = resolveColor(p.color, theme, '#574f44');
  // Bed + worn center (the two-pass rim/core).
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = base;
  blobPath(ctx, group);
  ctx.fill();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = shade(base, 0.16);
  blobPath(ctx, group, -7);
  ctx.fill();
  // Deterministic grit + edge stones per disc.
  for (const d of group) {
    const seed = ((d.pos.x * 31 + d.pos.y * 17) | 0) >>> 0;
    // Grit: small two-tone pebbles scattered over the bed.
    for (let i = 0; i < 7; i++) {
      const a = hash01(i, seed) * Math.PI * 2;
      const rr = Math.sqrt(hash01(i, seed + 5)) * d.radius * 0.8;
      const x = d.pos.x + Math.cos(a) * rr, y = d.pos.y + Math.sin(a) * rr;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = i % 2 ? shade(base, 0.28) : shade(base, -0.25);
      ctx.beginPath();
      ctx.ellipse(x, y, 1.6 + hash01(i, seed + 9) * 1.6, 1.2 + hash01(i, seed + 13), a, 0, Math.PI * 2);
      ctx.fill();
    }
    // Edge stones: darker kerb dots around the rim.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = shade(base, -0.35);
    const n = Math.max(4, Math.round(d.radius / 9));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash01(i, seed + 21) * 0.5;
      ctx.beginPath();
      ctx.arc(d.pos.x + Math.cos(a) * d.radius * 0.94, d.pos.y + Math.sin(a) * d.radius * 0.94,
        1.4 + hash01(i, seed + 27) * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
};

/** Writhing eldritch tentacle patches. */
const tentacleField: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { fill?: ColorSpec; arm?: ColorSpec };
  const { ctx, theme, time } = env;
  for (const o of group) {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = resolveColor(p.fill, theme, '#2a5a32');
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, o.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = resolveColor(p.arm, theme, '#7fce6a');
    ctx.lineWidth = 2.5;
    for (let s = 0; s < 7; s++) {
      const ang = (s / 7) * Math.PI * 2 + Math.sin(time * 1.5 + s) * 0.4;
      const len = o.radius * (0.55 + 0.4 * Math.abs(Math.sin(time * 2 + s)));
      const ex = o.pos.x + Math.cos(ang) * len, ey = o.pos.y + Math.sin(ang) * len;
      const cx = o.pos.x + Math.cos(ang + 0.6) * len * 0.5, cy = o.pos.y + Math.sin(ang + 0.6) * len * 0.5;
      ctx.beginPath();
      ctx.moveTo(o.pos.x, o.pos.y);
      ctx.quadraticCurveTo(cx, cy, ex, ey);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
};

/** The conclave's ritual pentagram — heat rides the incubation counter. */
const pentagram: GroupPainter = (env, group) => {
  const { ctx, time, world } = env;
  const cf = world.sim.conclaveField;
  const counter = cf?.incubationCounter ?? 0;
  const threshold = Math.max(1, cf?.surge().eldritch.incubationThreshold ?? 6);
  const n = Math.max(3, cf?.surge().ritual.cultistCount ?? 5);
  const heat = Math.min(1, Math.max(0, counter / threshold));
  const glow = 0.35 + 0.65 * heat;
  const pulse = 0.55 + 0.45 * Math.sin(time * 2.2);
  const rr = Math.round(168 + heat * 48), gg = Math.round(90 - heat * 58), bb = Math.round(216 - heat * 150);
  const line = `rgb(${rr},${gg},${bb})`;
  for (const o of group) {
    const R = o.radius;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (o.rot ?? 0) + (i / n) * Math.PI * 2;
      pts.push({ x: o.pos.x + Math.cos(a) * R, y: o.pos.y + Math.sin(a) * R });
    }
    const grad = ctx.createRadialGradient(o.pos.x, o.pos.y, R * 0.1, o.pos.x, o.pos.y, R);
    grad.addColorStop(0, `rgba(${rr},${gg},${bb},${(0.16 + 0.34 * heat) * pulse})`);
    grad.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.4 + 0.45 * glow;
    ctx.strokeStyle = line;
    ctx.lineWidth = 1.5 + 2.5 * glow;
    ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, R, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.5 + 0.5 * glow;
    ctx.lineWidth = 1.5 + 2 * glow;
    ctx.beginPath();
    const order = n === 5 ? [0, 2, 4, 1, 3] : pts.map((_, i) => i);
    for (let k = 0; k <= order.length; k++) {
      const pt = pts[order[k % order.length]];
      if (k === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#b89ad8';
    for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 3, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
};

/** Structure doors — closed bar / swung open / splintered stubs. */
const door: GroupPainter = (env, group) => {
  const { ctx } = env;
  for (const o of group) {
    const d = o.door;
    const normal = o.dir ?? 0;
    const along = normal + Math.PI / 2;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(along);
    const span = o.radius * 2;
    if (d?.broken) {
      ctx.fillStyle = '#4a3620';
      ctx.fillRect(-span / 2, -5, span * 0.18, 10);
      ctx.fillRect(span / 2 - span * 0.18, -5, span * 0.18, 10);
      ctx.strokeStyle = '#2c2013';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-span / 2, -5, span * 0.18, 10);
      ctx.strokeRect(span / 2 - span * 0.18, -5, span * 0.18, 10);
    } else if (d?.open) {
      ctx.fillStyle = '#5a4426';
      ctx.save();
      ctx.translate(-span / 2, 0);
      ctx.rotate(0.9);
      ctx.fillRect(0, -4, span * 0.55, 8);
      ctx.restore();
      ctx.fillStyle = '#3a2c18';
      ctx.fillRect(-span / 2 - 3, -5, 5, 10);
      ctx.fillRect(span / 2 - 2, -5, 5, 10);
    } else {
      ctx.fillStyle = '#5a4426';
      ctx.fillRect(-span / 2, -6, span, 12);
      ctx.strokeStyle = '#2c2013';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-span / 2, -6, span, 12);
      ctx.strokeStyle = '#3a2c18';
      ctx.lineWidth = 1;
      for (let x = -span / 2 + span / 5; x < span / 2; x += span / 5) {
        ctx.beginPath(); ctx.moveTo(x, -6); ctx.lineTo(x, 6); ctx.stroke();
      }
      ctx.strokeStyle = '#8a8f9a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-span / 2 + 3, 0); ctx.lineTo(span / 2 - 3, 0); ctx.stroke();
    }
    ctx.restore();
  }
};

/** THE BREACH — a torn molten wound (dwell to cross into the Underworld). */
const breach: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { edge?: ColorSpec; label?: string };
  const { ctx, time } = env;
  const edge = resolveColor(p.edge, env.theme, '#d84a2a');
  for (const o of group) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.8);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.fillStyle = '#0a0508';
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rr = o.radius * (0.7 + 0.3 * Math.sin(i * 2.7));
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.7;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2 + pulse * 2;
    ctx.globalAlpha = 0.5 + 0.4 * pulse;
    ctx.stroke();
    ctx.globalAlpha = 0.2 + 0.2 * pulse;
    ctx.fillStyle = edge;
    ctx.beginPath(); ctx.arc(0, 0, o.radius * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    if (p.label) {
      ctx.textAlign = 'center';
      ctx.font = '9px Verdana';
      ctx.fillStyle = '#d88a6a';
      ctx.fillText(p.label, 0, o.radius + 14);
    }
    ctx.restore();
  }
};

/** The Voyage's streamed coastline blobs, biome-tinted with a surf rim. */
const landmass: GroupPainter = (env, group) => {
  const { ctx } = env;
  for (const o of group) {
    const bi = o.land ? BIOMES[o.land.biome] : undefined;
    const fill = o.land?.bridge ? '#b8a06a' : (bi?.mapColor ?? '#7a9a5a');
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#cfe8f2';
    ctx.beginPath(); ctx.arc(0, 0, o.radius * 1.06, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(0, 0, o.radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#1c2416';
    ctx.beginPath(); ctx.arc(0, 0, o.radius * 0.72, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

/** A Voyage island's guiding beacon: pulsing pillar of its own tint + name. */
const beacon: GroupPainter = (env, group) => {
  const { ctx, time } = env;
  for (const o of group) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.4 + o.pos.x * 0.01);
    const col = o.adorn ?? '#7fd0ff';
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.globalAlpha = 0.16 + 0.14 * pulse;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, 0, 46 + pulse * 10, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#2c2013';
    ctx.fillRect(-2.5, -34, 5, 34);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, -38, 5 + pulse * 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    if (o.label) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px Verdana';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(o.label, 0, 24);
      ctx.fillStyle = '#d8ecf4';
      ctx.fillText(o.label, 0, 24);
    }
    ctx.restore();
  }
};

/** SOMEONE BUILT A SNOWMAN — two stacked snowballs from above, coal eyes
 *  toward the facing, stick arms akimbo. Winter's most important doodad. */
const snowman: GroupPainter = (env, group) => {
  const { ctx } = env;
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // Base ball, then the head overlapping forward.
    for (const [f, off] of [[1, -0.15], [0.62, 0.3]] as const) {
      const R = r * f;
      const cx = r * off;
      const g = ctx.createRadialGradient(cx - R * 0.3, -R * 0.3, R * 0.15, cx, 0, R * 1.25);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.7, '#dfe9f0');
      g.addColorStop(1, '#b8c9d6');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, 0, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,110,128,0.55)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    // Stick arms off the base ball.
    ctx.strokeStyle = '#4a3826';
    ctx.lineWidth = Math.max(1.5, r * 0.09);
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, side * r * 0.8);
      ctx.lineTo(-r * 0.5, side * r * 1.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.38, side * r * 1.2);
      ctx.lineTo(-r * 0.55, side * r * 1.1);
      ctx.stroke();
    }
    // Coal eyes + the carrot, looking wherever it was left looking.
    ctx.fillStyle = '#1a1c22';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(r * 0.7, side * r * 0.2, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#e08a3a';
    ctx.beginPath();
    ctx.moveTo(r * 0.88, -r * 0.05);
    ctx.lineTo(r * 1.18, 0);
    ctx.lineTo(r * 0.88, r * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

/** A fingerboard SIGNPOST: post + two weathered boards pointing old ways. */
const signpost: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#6a5236');
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // The post's top-down footprint + boards fanned at heights we imagine.
    ctx.fillStyle = shade(wood, -0.25);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    for (const [ang, len, tone] of [[0.35, 1.35, 0.12], [2.6, 1.1, -0.05]] as const) {
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = shade(wood, tone);
      ctx.fillRect(0, -r * 0.16, r * len, r * 0.32);
      ctx.strokeStyle = withAlpha(shade(wood, -0.4), 0.8);
      ctx.lineWidth = 1.2;
      ctx.strokeRect(0, -r * 0.16, r * len, r * 0.32);
      // The pointed tip.
      ctx.fillStyle = shade(wood, tone);
      ctx.beginPath();
      ctx.moveTo(r * len, -r * 0.16);
      ctx.lineTo(r * (len + 0.22), 0);
      ctx.lineTo(r * len, r * 0.16);
      ctx.closePath();
      ctx.fill();
      // Faded lettering scratches.
      ctx.strokeStyle = withAlpha('#1c140c', 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r * 0.2, 0); ctx.lineTo(r * (len - 0.15), 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
};

/** Stacked FIREWOOD: split logs laid in a row, ends facing you. */
const firewoodPile: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#7a5a34');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 7 + o.pos.y * 3) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // Two courses of log ends (circles with ring + split-line).
    let i = 0;
    for (const [row, count] of [[0, 4], [1, 3]] as const) {
      for (let k = 0; k < count; k++) {
        const lr = r * (0.26 + hash01(i, seed) * 0.06);
        const x = (k - (count - 1) / 2) * r * 0.52;
        const y = (row - 0.5) * r * 0.5;
        ctx.fillStyle = shade(wood, hash01(i, seed + 3) * 0.16 - 0.05);
        ctx.beginPath();
        ctx.arc(x, y, lr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = withAlpha(shade(wood, -0.45), 0.85);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // Growth ring + split.
        ctx.strokeStyle = withAlpha(shade(wood, -0.3), 0.6);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, lr * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - lr * 0.8, y);
        ctx.lineTo(x + lr * 0.8, y);
        ctx.stroke();
        i++;
      }
    }
    ctx.restore();
  }
};

/** Any kind with no registry entry: a themed disc + rim + rot tick, visible
 *  engine-wide before (or without) ever earning a real look. */
const fallback: GroupPainter = (env, group) => {
  const { ctx, theme } = env;
  for (const o of group) {
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    if (o.rot !== undefined) ctx.rotate(o.rot);
    ctx.fillStyle = theme.obstacle;
    ctx.beginPath(); ctx.arc(0, 0, o.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = theme.obstacleEdge;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, o.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(o.radius * 0.8, 0); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

/** Standing-object contact shadows, driven by DoodadVisualDef.shadow. */
export function paintGroupShadows(env: PaintEnv, group: readonly Doodad[], alphaMul: number): void {
  for (const d of group) drawShadow(env.ctx, d.pos.x, d.pos.y, d.radius, alphaMul);
}

export const PAINTERS: Record<string, GroupPainter> = {
  liquid, mound, shard, vent, pod, dome, bones, slab, sparkle, platformRing,
  kelp, coral, sapling, plank, dock, palisade, windowSlit, caveMouth,
  campfire, groundShadow, trunk, brush, gravelPath, shimmer, fogFloor,
  cactus, web, deadTree, stump, log, snowman, signpost, firewoodPile,
  tentacleField, pentagram, door, breach, landmass, beacon, fallback,
};

// --- CANOPY CROWN PAINTERS (drawn ABOVE actors, proximity-faded) -------------

export type CanopyPainter = (env: PaintEnv, o: Doodad, alpha: number, params: Record<string, unknown>) => void;

/** The BRAMBLE MASS: tangled disc + radiating spines. */
const bramble: CanopyPainter = (env, o, alpha, params) => {
  const p = params as { fill?: ColorSpec; edge?: ColorSpec; spine?: ColorSpec };
  const { ctx, theme } = env;
  ctx.save();
  ctx.translate(o.pos.x, o.pos.y);
  if (o.rot !== undefined) ctx.rotate(o.rot);
  ctx.globalAlpha = alpha;
  const fill = resolveColor(p.fill, theme, '#2c4424');
  ctx.fillStyle = fill;
  ctx.strokeStyle = resolveColor(p.edge, theme, 'rgba(0,0,0,0.4)');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, o.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Crown volume: a lit arc toward the sun side.
  ctx.globalAlpha = alpha * 0.3;
  ctx.fillStyle = shade(fill, 0.3);
  ctx.beginPath();
  ctx.arc(-o.radius * 0.25, -o.radius * 0.25, o.radius * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = resolveColor(p.spine, theme, 'rgba(255,255,255,0.22)');
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * o.radius * 0.4, Math.sin(a) * o.radius * 0.4);
    ctx.lineTo(Math.cos(a) * o.radius * 1.05, Math.sin(a) * o.radius * 1.05);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
};

/** Palm crowns: radiating fronds over the trunk. */
const palmCrown: CanopyPainter = (env, o, alpha) => {
  const { ctx, theme } = env;
  ctx.save();
  ctx.translate(o.pos.x, o.pos.y);
  if (o.rot !== undefined) ctx.rotate(o.rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#5a4326';
  ctx.fillRect(-o.radius * 0.1, -o.radius * 0.2, o.radius * 0.2, o.radius * 0.6);
  ctx.strokeStyle = theme.tree ?? '#2c7a3a';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    ctx.beginPath();
    ctx.moveTo(0, -o.radius * 0.15);
    ctx.quadraticCurveTo(
      Math.cos(a) * o.radius * 0.7, -o.radius * 0.4 + Math.sin(a) * o.radius * 0.5,
      Math.cos(a) * o.radius * 1.1, -o.radius * 0.2 + Math.sin(a) * o.radius * 0.8);
    ctx.stroke();
  }
  ctx.fillStyle = '#3a6a2a';
  ctx.beginPath();
  ctx.arc(0, -o.radius * 0.2, o.radius * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
};

/** Fungal crowns (giant mushroom / fruiting tower). */
const mushroomCrown: CanopyPainter = (env, o, alpha, params) => {
  const p = params as { caps?: number };
  const { ctx, time } = env;
  const r = o.radius, caps = p.caps ?? 1;
  const glow = 0.55 + 0.35 * Math.sin(time * 1.6 + o.pos.x * 0.04);
  ctx.save();
  ctx.translate(o.pos.x, o.pos.y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#3a2a5a';
  ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.34, r * (caps > 1 ? 1.1 : 0.7), 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < caps; i++) {
    const cy = -r * (0.5 + i * 0.5), cr = r * (1 - i * 0.22);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#5a8a3a';
    ctx.beginPath(); ctx.ellipse(0, cy, cr, cr * 0.6, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = glow * alpha;
    ctx.fillStyle = '#8fd06f';
    ctx.beginPath(); ctx.ellipse(0, cy, cr * 0.7, cr * 0.42, 0, Math.PI, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
};

/** A LUSH DECIDUOUS CROWN — layered scallop-edged leaf lobes (the bush's
 *  grammar at canopy scale) with a sun-lit side and a dark under-heart. */
const leafCrown: CanopyPainter = (env, o, alpha, params) => {
  const p = params as { fill?: ColorSpec };
  const { ctx, theme } = env;
  const base = resolveColor(p.fill, theme, theme.tree ?? '#2c4424');
  const seed = ((o.pos.x * 17 + o.pos.y * 3) | 0) >>> 0;
  ctx.save();
  ctx.translate(o.pos.x, o.pos.y);
  if (o.rot !== undefined) ctx.rotate(o.rot);
  ctx.globalAlpha = alpha;
  // Under-heart: the crown's own depth.
  ctx.fillStyle = shade(base, -0.4);
  ctx.beginPath();
  ctx.arc(0, 0, o.radius * 0.92, 0, Math.PI * 2);
  ctx.fill();
  // Leaf lobes ringing the crown + a center clump, scallop-edged.
  const lobes = 6 + (seed % 3);
  const lobe = (lx: number, ly: number, lr: number, tone: string): void => {
    ctx.fillStyle = tone;
    ctx.beginPath();
    for (let k = 0; k <= 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const rr = lr * (0.84 + 0.16 * Math.abs(Math.sin(a * 4 + lx)));
      const x = lx + Math.cos(a) * rr, y = ly + Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.quadraticCurveTo(lx + Math.cos(a - 0.4) * rr * 1.1, ly + Math.sin(a - 0.4) * rr * 1.1, x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(base, -0.5), 0.4);
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2 + (seed % 5) * 0.4;
    const d = o.radius * 0.55;
    lobe(Math.cos(a) * d, Math.sin(a) * d, o.radius * (0.4 + hash01(i, seed) * 0.12),
      i % 2 ? base : shade(base, -0.14));
  }
  lobe(-o.radius * 0.1, -o.radius * 0.1, o.radius * 0.5, shade(base, 0.05));
  // Sun-side lit rim.
  ctx.globalAlpha = alpha * 0.5;
  ctx.strokeStyle = shade(base, 0.3);
  ctx.lineWidth = Math.max(1.5, o.radius * 0.07);
  ctx.beginPath();
  ctx.arc(-o.radius * 0.12, -o.radius * 0.12, o.radius * 0.7, -2.7, -1.0);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
};

/** An EVERGREEN SPIRE from above: stacked pointed star-rings tightening to
 *  a pale tip — conifers read apart from broadleaf at any distance. */
const pineCrown: CanopyPainter = (env, o, alpha, params) => {
  const p = params as { fill?: ColorSpec };
  const { ctx, theme } = env;
  const base = resolveColor(p.fill, theme, theme.tree ?? '#1e3a28');
  ctx.save();
  ctx.translate(o.pos.x, o.pos.y);
  ctx.rotate(o.rot ?? 0);
  ctx.globalAlpha = alpha;
  const layers: [number, string][] = [
    [1.0, shade(base, -0.18)],
    [0.66, base],
    [0.36, shade(base, 0.14)],
  ];
  for (const [f, tone] of layers) {
    ctx.fillStyle = tone;
    ctx.beginPath();
    const spikes = 8;
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const rr = o.radius * f * (i % 2 === 0 ? 1 : 0.62);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(base, -0.5), 0.45);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = shade(base, 0.32);
  ctx.beginPath();
  ctx.arc(0, 0, o.radius * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
};

/** VOLUMETRIC FOG CLOUD — layered soft billows swirling and BREATHING over
 *  the bank (the dynamic murk). Rides the canopy fade, so it parts around
 *  the hero while covering everyone else inside. */
const fogCloud: CanopyPainter = (env, o, alpha, params) => {
  const p = params as { fill?: ColorSpec };
  const { ctx, theme, time } = env;
  const col = resolveColor(p.fill, theme, '#aab6c2');
  const seed = ((o.pos.x * 3 + o.pos.y * 7) | 0) >>> 0;
  // The whole bank breathes: radius swells and relaxes on a slow clock.
  const breathe = 1 + 0.07 * Math.sin(time * 0.5 + seed);
  ctx.save();
  ctx.translate(o.pos.x, o.pos.y);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + time * (0.1 + hash01(i, seed) * 0.08) * (i % 2 ? 1 : -1);
    const d = o.radius * 0.42 * breathe;
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    const r = o.radius * (0.5 + hash01(i, seed + 3) * 0.22) * breathe;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, withAlpha(col, 0.34 * alpha));
    g.addColorStop(0.7, withAlpha(col, 0.16 * alpha));
    g.addColorStop(1, withAlpha(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // A brighter core wisp so the bank reads as weather, not a paint smear.
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, o.radius * 0.5 * breathe);
  cg.addColorStop(0, withAlpha(shade(col, 0.25), 0.2 * alpha));
  cg.addColorStop(1, withAlpha(col, 0));
  ctx.fillStyle = cg;
  ctx.fillRect(-o.radius, -o.radius, o.radius * 2, o.radius * 2);
  ctx.restore();
};

/** A data-registered canopy kind with no bespoke crown: a translucent disc. */
const discCrown: CanopyPainter = (env, o, alpha) => {
  const { ctx, theme } = env;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.tree ?? theme.obstacle;
  ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, o.radius, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
};

export const CANOPY_PAINTERS: Record<string, CanopyPainter> = {
  bramble, palmCrown, mushroomCrown, discCrown, leafCrown, pineCrown, fogCloud,
};
