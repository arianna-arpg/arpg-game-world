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
  /** Pale overlay on `shallow` fords. */
  fords?: { color: ColorSpec; alpha: number; grow: number };
  /** Lily pads ringing deep pools, gated to lush biomes (data-listed). */
  pads?: { color: ColorSpec; biomes: string[] };
  /** Slow ember pulse over the body (cinder). */
  emberPulse?: { color: ColorSpec };
  /** Blade tufts scattered on the blob (grass). */
  tufts?: { color: ColorSpec };
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
  ctx.globalAlpha = p.core.alpha;
  ctx.fillStyle = resolveColor(p.core.color, theme);
  blobPath(ctx, group, p.core.grow ?? 0);
  ctx.fill();
  if (p.inner) {
    ctx.globalAlpha = p.inner.alpha;
    ctx.fillStyle = resolveColor(p.inner.color, theme);
    blobPath(ctx, group, p.inner.grow);
    ctx.fill();
  }
  if (p.fords) {
    const fords = group.filter(d => d.shallow);
    if (fords.length) {
      ctx.globalAlpha = p.fords.alpha;
      ctx.fillStyle = resolveColor(p.fords.color, theme);
      blobPath(ctx, fords, p.fords.grow);
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
    ctx.fillStyle = resolveColor(p.pads.color, theme);
    ctx.globalAlpha = 0.7;
    for (const w of group) {
      if (w.shallow) continue;
      const n = 2 + (((w.pos.x * 73 + w.pos.y * 97) >>> 0) % 3);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (w.pos.x % 6.283);
        const lx = w.pos.x + Math.cos(a) * (w.radius + 7);
        const ly = w.pos.y + Math.sin(a) * (w.radius + 7);
        for (let j = 0; j < 3; j++) {
          const off = (j - 1) * 4;
          ctx.beginPath();
          ctx.arc(lx + Math.cos(a + Math.PI / 2) * off, ly + Math.sin(a + Math.PI / 2) * off, 3, 0, Math.PI * 2);
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
  if (p.tufts) {
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = resolveColor(p.tufts.color, theme);
    ctx.lineWidth = 1.5;
    for (const g of group) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + g.pos.x;
        const gx = g.pos.x + Math.cos(a) * g.radius * 0.5;
        const gy = g.pos.y + Math.sin(a) * g.radius * 0.5;
        ctx.beginPath();
        ctx.moveTo(gx, gy + 3); ctx.lineTo(gx - 2, gy - 4);
        ctx.moveTo(gx, gy + 3); ctx.lineTo(gx + 2, gy - 5);
        ctx.stroke();
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

/** Leafy stipple cover you can vanish into (brush). */
const brush: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec };
  const { ctx, theme } = env;
  for (const b of group) {
    ctx.save();
    ctx.translate(b.pos.x, b.pos.y);
    if (b.rot !== undefined) ctx.rotate(b.rot);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = resolveColor(p.color, theme, '#2c4424');
    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#1a2414';
    const sp = b.radius * 0.25;
    for (let dx = -b.radius; dx < b.radius; dx += sp) {
      for (let dy = -b.radius; dy < b.radius; dy += sp) {
        const ds = 1.5 + ((((dx * 13 + dy * 7 + b.pos.x + b.pos.y) % 2.5) + 2.5) % 2.5);
        ctx.beginPath();
        ctx.arc(dx, dy, ds, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, b.radius - 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
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
  campfire, groundShadow, brush, tentacleField, pentagram, door, breach,
  landmass, beacon, fallback,
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

/** A data-registered canopy kind with no bespoke crown: a translucent disc. */
const discCrown: CanopyPainter = (env, o, alpha) => {
  const { ctx, theme } = env;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.tree ?? theme.obstacle;
  ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, o.radius, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
};

export const CANOPY_PAINTERS: Record<string, CanopyPainter> = {
  bramble, palmCrown, mushroomCrown, discCrown,
};
