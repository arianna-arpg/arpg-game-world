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
import { hash01, mix, shade, withAlpha } from './color';
import { materialOf, rampOf, type Ramp } from './materials';
import { litPolygon, polygonPath } from './sight';
import { baked, drawShadow } from './sprites';
import { VIS_CFG } from './visConfig';

export interface PaintEnv {
  ctx: CanvasRenderingContext2D;
  theme: ZoneTheme;
  /** The sim clock (deterministic anims; never performance.now()). */
  time: number;
  world: World;
}

/** '#hex' literal or 'theme:key' / 'theme:key|#fallback'. */
export type ColorSpec = string;

/** Is a labeled doodad's TEXT revealed? Text under an UNSEEN layer stays
 *  unseen: a roofed label draws only while the local hero shares its roof —
 *  the same interior-reveal rule the roof pass follows, so a hatch's name
 *  never advertises through a wall. Open-air labels always draw. */
export function labelRevealed(env: PaintEnv, pos: { x: number; y: number }): boolean {
  const w = env.world;
  const roof = w.roofedStructureAt(pos);
  return roof === null || roof === w.roofedStructureAt(w.player.pos);
}

export function resolveColor(spec: ColorSpec | undefined, theme: ZoneTheme, fallback = '#9a9aa0'): string {
  if (!spec) return fallback;
  if (!spec.startsWith('theme:')) return spec;
  const [key, fb] = spec.slice(6).split('|');
  const v = (theme as unknown as Record<string, string | undefined>)[key];
  return v ?? fb ?? fallback;
}

/** Resolve a color ONLY if the spec actually yields one: a 'theme:key' with no
 *  fallback resolves to undefined when the theme lacks the key. Biome-conditional
 *  accents ride this — moss on grove stone simply skips in the desert instead of
 *  painting the grey placeholder. */
export function resolveColorOpt(spec: ColorSpec | undefined, theme: ZoneTheme): string | undefined {
  if (!spec) return undefined;
  if (!spec.startsWith('theme:')) return spec;
  const [key, fb] = spec.slice(6).split('|');
  return (theme as unknown as Record<string, string | undefined>)[key] ?? fb ?? undefined;
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
  /** TERRAIN BLEND — mesh this ground-family kind into the land around it.
   *  The group's merged silhouette grows soft rings outward (feather world
   *  units) fading from `strength` to nothing, so a gravel road beds into
   *  the terrain instead of reading as a chain of stamped circles. Pure
   *  data per kind: a bog melds harder than grass, grass harder than
   *  gravel. Painted UNDER the kind's own painter.
   *  `mode` picks the silhouette: 'blob' (default) merges the discs as an
   *  organic patch — pools, grass, mud; 'path' strokes round-capped
   *  segments through CONSECUTIVE discs — the smooth band a chained stamp
   *  (a road) actually means, with breaks wherever the chain truly gaps.
   *  Beds are static, so they BAKE into the floor chunks by default
   *  (VIS_CFG.ground.bakeBlend); `live` opts a kind back into the per-frame
   *  pass — for a future kind whose bed must move or breathe. */
  blend?: { strength: number; feather: number; color: ColorSpec; mode?: 'blob' | 'path'; live?: boolean };
  /** Soft contact shadow under each doodad (alpha multiplier). */
  shadow?: number;
  /** DIRECTIONAL day-cycle shadow (sunCast): the body's cast reach as a
   *  multiplier on its radius. Trees stretch long; stones squat. */
  longShadow?: number;
  /** Emissive light contributed to the light layer. */
  light?: LightSpec;
  /** Canopy crown painter (occluding kinds draw this ABOVE actors). */
  canopy?: { painter: string; params?: Record<string, unknown> };
  /** Whole-doodad sprite baking for GROUND kinds whose painter is time-free
   *  ('static': brush clumps) or whose only time input is sway ('sway':
   *  ferns — baked at rest, swayed by a whole-sprite shear at blit). The
   *  painter still authors every pixel (wholeKindSprite runs it at bake);
   *  this flag only moves WHEN it runs. */
  bakeWhole?: 'static' | 'sway';
}

// --- Shared path helpers -----------------------------------------------------

function blobPath(ctx: CanvasRenderingContext2D, group: readonly Doodad[], grow = 0): void {
  ctx.beginPath();
  for (const d of group) {
    ctx.moveTo(d.pos.x + d.radius + grow, d.pos.y);
    ctx.arc(d.pos.x, d.pos.y, Math.max(0.1, d.radius + grow), 0, Math.PI * 2);
  }
}

/** Stroke round-capped segments through CONSECUTIVE discs — the smooth band
 *  a chained stamp (a road) means. Per-segment width follows the two discs'
 *  radii (+grow); a jump wider than a body-and-a-half is a REAL gap (or a
 *  cull gap, or the next chain of the same kind) and breaks the stroke. */
export function pathBand(ctx: CanvasRenderingContext2D, group: readonly Doodad[], grow = 0): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < group.length; i++) {
    const a = group[i], b = group[i + 1];
    if (!b || Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y) > (a.radius + b.radius) * 1.35) {
      // Chain end (or lone disc): a round dot keeps the band's terminus soft.
      ctx.lineWidth = 0.1;
      ctx.beginPath();
      ctx.arc(a.pos.x, a.pos.y, Math.max(0.1, a.radius + grow), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.lineWidth = Math.max(0.2, a.radius + b.radius + grow * 2);
    ctx.beginPath();
    ctx.moveTo(a.pos.x, a.pos.y);
    ctx.lineTo(b.pos.x, b.pos.y);
    ctx.stroke();
  }
}

// --- Cached gradient pool ------------------------------------------------------
// createRadialGradient per frame is an allocation + parse the hot painters
// (pods breathing every frame in bog country) cannot afford. Gradients are
// plain paint objects, reusable across frames ON THE SAME CONTEXT and they
// live in the CURRENT TRANSFORM at fill time — so local-space gradients pool
// perfectly. Keyed by full geometry+stops signature; callers quantize any
// breathing radii so a pulsing bulb cycles 2-3 entries instead of minting
// forever. Stops build lazily (only on a miss).
const gradPools = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasGradient>>();

export function cachedRadial(ctx: CanvasRenderingContext2D, key: string,
  x0: number, y0: number, r0: number, x1: number, y1: number, r1: number,
  stops: () => [number, string][]): CanvasGradient {
  let pool = gradPools.get(ctx);
  if (!pool) { pool = new Map(); gradPools.set(ctx, pool); }
  let g = pool.get(key);
  if (!g) {
    g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    for (const [at, col] of stops()) g.addColorStop(at, col);
    if (pool.size > 512) pool.clear(); // palette shift / zone churn resets
    pool.set(key, g);
  }
  return g;
}

/** THE BLEND UNDERLAY (DoodadVisualDef.blend): paints a group's merged
 *  silhouette as stacked outward rings — a discrete gradient from `strength`
 *  at the body to nothing at `feather` — so ground kinds MESH into the
 *  terrain. 'blob' mode reuses blobPath (organic patches); 'path' mode rides
 *  pathBand (chained stamps read as one smooth band). Runs before the kind's
 *  own painter; the painter details over the bed. */
export function paintBlendUnderlay(env: PaintEnv, group: readonly Doodad[],
  def: DoodadVisualDef): void {
  const b = def.blend;
  if (!b || b.strength <= 0) return;
  const { ctx, theme } = env;
  const RINGS = 4;
  const color = resolveColor(b.color, theme);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.globalAlpha = b.strength / RINGS;
  for (let k = RINGS; k >= 1; k--) {
    const grow = b.feather * (k / RINGS);
    if (b.mode === 'path') {
      pathBand(ctx, group, grow);
    } else {
      blobPath(ctx, group, grow);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
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

// --- Per-disc SPRITE BAKES ----------------------------------------------------
// The liquid painter used to allocate canvas gradients PER DISC PER FRAME
// (melt hearts, crawl glows, ford melds) and rasterize crust polygons inside a
// merged clip of the whole group — measured at ~170ms/frame on a caldera whose
// spiral pours ~2,600 lava discs. Every periodic look here is a fixed alpha
// PROFILE scaled by a scalar, so it bakes once (vis/sprites.ts LRU) and the
// runtime becomes drawImage-per-disc with globalAlpha carrying the animation.

/** A radial alpha-falloff disc of `color`: stops are [t, alphaFrac] pairs.
 *  Unit sprite (64px), blit scaled; animate via ctx.globalAlpha. */
function alphaDiscSprite(color: string, stops: readonly (readonly [number, number])[], key: string): HTMLCanvasElement {
  return baked(`ad|${key}|${color}`, 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 32);
    for (const [t, a] of stops) g.addColorStop(t, withAlpha(color, a));
    ctx.fillStyle = g;
    ctx.fillRect(-32, -32, 64, 64);
  });
}

/** How many seeded looks each per-disc bake family rolls: enough that no two
 *  neighbouring discs visibly repeat, few enough that the LRU stays warm. */
const DISC_VARIANTS = 12;

/** One lava disc's crust plates — fill and burning-seam stroke share the
 *  geometry; the caller decides which to emit. Original per-disc seeding, so
 *  a poured flow never tiles. Drawn only at BAKE time (inside the union
 *  clip), where its polygon raster is paid once per chunk, not per frame. */
function meltCrustPlates(ctx: CanvasRenderingContext2D, d: Doodad,
  mode: 'fill' | 'stroke'): void {
  const seed = ((d.pos.x * 7 + d.pos.y * 13) | 0) >>> 0;
  for (let i = 0; i < 3 + (seed % 3); i++) {
    const a = hash01(i, seed) * Math.PI * 2;
    const dd = Math.sqrt(hash01(i, seed + 7)) * d.radius * 0.7;
    const cx = d.pos.x + Math.cos(a) * dd, cy = d.pos.y + Math.sin(a) * dd;
    const pr = d.radius * (0.2 + hash01(i, seed + 11) * 0.22);
    ctx.beginPath();
    for (let k = 0; k <= 7; k++) {
      const ka = (k / 7) * Math.PI * 2;
      const kr = pr * (0.78 + 0.22 * Math.abs(Math.sin(ka * 2.5 + i + seed)));
      const px = cx + Math.cos(ka) * kr, py = cy + Math.sin(ka) * kr;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (mode === 'fill') ctx.fill(); else ctx.stroke();
  }
}

/** One whole grass/hedgerow tuft (5 clumps × 5 blades + chance flowers),
 *  variant-seeded and radius-bucketed. Sway rides a whole-sprite shear at
 *  draw time — one drawImage per tuft instead of 25 stroked curves. */
function tuftSprite(base: string, lit: string, flower: string | null,
  variant: number, r: number): HTMLCanvasElement {
  return baked(`tuft|${variant}|${r}|${base}|${flower ?? ''}`, r * 2 + 26, r * 2 + 26, (ctx) => {
    const seed = 104729 * (variant + 1);
    ctx.lineCap = 'round';
    const clumps = 5;
    for (let i = 0; i < clumps; i++) {
      const a = (i / clumps) * Math.PI * 2 + hash01(i, seed);
      const cx = Math.cos(a) * r * (0.3 + hash01(i, seed + 3) * 0.35);
      const cy = Math.sin(a) * r * (0.3 + hash01(i, seed + 5) * 0.35);
      for (let b = 0; b < 5; b++) {
        const off = (b - 2) * 1.7;
        const h = 5 + hash01(b, seed + i) * 4;
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = b % 2 ? base : lit;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(cx + off, cy + 3);
        ctx.quadraticCurveTo(cx + off, cy - h * 0.5, cx + off + (b - 2) * 0.8, cy - h);
        ctx.stroke();
      }
      if (flower && hash01(i, seed + 11) > 0.72) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = flower;
        ctx.beginPath();
        ctx.arc(cx, cy - 7, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  });
}

/** LILY PADS are static geometry (seeded off the pool's own discs), but they
 *  were re-derived per frame with an O(group²) coastline test — ~900k hypots
 *  a frame on an isle. Computed once per pool disc against the FULL kind
 *  group (culling can hide a neighbour and fake a coastline) and cached. */
interface PadSpot { x: number; y: number; r: number; dark: boolean; notch: number }
const padCache = new WeakMap<Doodad, PadSpot[]>();
const fullGroupCache = new WeakMap<readonly Doodad[], Map<string, Doodad[]>>();

function fullKindGroup(world: World, kind: string): Doodad[] {
  let m = fullGroupCache.get(world.doodads);
  if (!m) { m = new Map(); fullGroupCache.set(world.doodads, m); }
  let list = m.get(kind);
  if (!list) {
    list = world.doodads.filter(d => d.kind === kind);
    m.set(kind, list);
  }
  return list;
}

function padsOf(world: World, w: Doodad): PadSpot[] {
  const hit = padCache.get(w);
  if (hit) return hit;
  const group = fullKindGroup(world, w.kind);
  const out: PadSpot[] = [];
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
      out.push({
        x: px + Math.cos(a + Math.PI / 2) * off,
        y: py + Math.sin(a + Math.PI / 2) * off,
        r: 2.8 + hash01(i * 5 + j, seed) * 1.9,
        dark: j % 2 === 0,
        notch: a + Math.PI + (hash01(j, seed + i) - 0.5),
      });
    }
  }
  padCache.set(w, out);
  return out;
}

// --- LIQUID / GROUND BLOBS ---------------------------------------------------

export interface LiquidParams {
  /** Rim pass (grown silhouette under the core). */
  rim?: { color: ColorSpec; alpha: number; grow: number };
  /** The body fill. `grow` shrinks/grows PER DISC before the union: keep it
   *  ≥ 0 on poured kinds — a negative grow pulls lattice cells apart and the
   *  one body fragments into visible circles (use `heart` for inset tones). */
  core: { color: ColorSpec; alpha: number; grow?: number };
  /** An inset pass — same per-disc grow hazard as `core`: poured kinds
   *  should reach for `heart` instead of a negative grow. */
  inner?: { color: ColorSpec; alpha: number; grow: number };
  /** Soft murk WELLS: seeded, jittered radial lightening per disc, blitted
   *  inside the merged-silhouette clip at bake time — the union-safe inset
   *  that `core.grow < 0` used to fake on big single discs. The jitter keeps
   *  a pour's checker lattice from ever reading as a dot grid. */
  heart?: { color: ColorSpec; alpha?: number };
  /** Expanding rings over deep liquid (water). */
  ripples?: { color: ColorSpec };
  /** Drifting sine squiggles (bog murk): a GROUP pass — world-anchored rows
   *  clipped to the merged body, so a poured lattice never reads as circles
   *  and a whole marsh costs ONE stroke (the per-disc rows were the seam-
   *  revealing cousin of the ice sheen's per-disc storm). */
  squiggles?: { color: ColorSpec; spacing?: number; amp?: number };
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
  /** A slow swelling bubble that POPS on its cycle (bog). `density` scales
   *  each disc's chance of hosting one by its AREA, so a poured lattice
   *  breathes a few scattered wells — never one bubble per lattice cell. */
  bubbles?: { color: ColorSpec; density?: number };
  /** Wet darker blotches (mud). */
  blotch?: { color: ColorSpec };
  /** Pale floating scum patches (swamp). */
  scum?: { color: ColorSpec };
  /** Wet specular glints (gore). */
  glisten?: { color: ColorSpec };
  /** MOLTEN treatment (lava): per-well hot hearts glowing up through the
   *  body, under seeded dark crust PLATES with melt seams burning at their
   *  edges — pack ice over fire, spanning the merged flow. */
  melt?: { hot: ColorSpec; crust: ColorSpec };
  /** EMBER BED (cinder): dense coal glints across the merged body, each
   *  pulsing on its own clock, brightest at the bed's heart. */
  embers?: { color: ColorSpec; density?: number };
}

/** The STATIC body of a liquid group — rim silhouette, core fill, inset pass.
 *  Time-free, so it bakes into the ground chunks by default (the merged
 *  union path of a big pool rasterized most of the screen TWICE a frame;
 *  an isle's water ring alone measured ~17ms). Exported for the chunk
 *  baker; the live painter calls it only when baking is off (or a kind
 *  opts out via params.liveBody). */
export function paintLiquidBody(env: PaintEnv, group: readonly Doodad[],
  def: DoodadVisualDef): void {
  const p = (def.params ?? {}) as unknown as LiquidParams;
  const { ctx, theme } = env;
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
  ctx.globalAlpha = 1;
}

/** Should this liquid kind's body render live (not baked)? One shared gate
 *  for the painter and the chunk baker so they can never both (or neither)
 *  paint it. */
export function liquidBodyIsLive(def: DoodadVisualDef): boolean {
  return !VIS_CFG.ground.bakeLiquidBody || !!(def.params as { liveBody?: boolean } | undefined)?.liveBody;
}

/** EVERYTHING about a liquid group that never moves: the body fills, the
 *  ford melds, and the molten crust (plates + seams + heart BASE glow, all
 *  inside the merged-silhouette clip — pack ice over fire, one body). The
 *  chunk baker calls this once per repaint; only the pulse/crawl/sparkle
 *  layers stay per-frame. */
export function paintLiquidStatics(env: PaintEnv, group: readonly Doodad[],
  def: DoodadVisualDef): void {
  const p = (def.params ?? {}) as unknown as LiquidParams;
  const { ctx, theme } = env;
  paintLiquidBody(env, group, def);
  if (p.fords) {
    const coreCol = resolveColor(p.core.color, theme);
    const fordCol = p.fords.lighten !== undefined
      ? shade(coreCol, p.fords.lighten)
      : resolveColor(p.fords.color, theme, coreCol);
    const spr = alphaDiscSprite(fordCol, [[0, 1], [0.62, 0.75], [1, 0]], 'ford');
    ctx.globalAlpha = p.fords.alpha;
    for (const d of group) {
      if (!d.shallow) continue;
      const r = Math.max(4, d.radius + (p.fords.grow ?? 0));
      ctx.drawImage(spr, d.pos.x - r, d.pos.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }
  if (p.heart) {
    // Murk wells: jittered soft lightening per disc, clipped to the merged
    // body — organic mottling over a pour, a soft heart on a lone stamp.
    const spr = alphaDiscSprite(resolveColor(p.heart.color, theme), [[0, 1], [1, 0]], 'heart');
    ctx.save();
    blobPath(ctx, group);
    ctx.clip();
    ctx.globalAlpha = p.heart.alpha ?? 0.3;
    for (const d of group) {
      const seed = ((d.pos.x * 7 + d.pos.y * 11) | 0) >>> 0;
      const r = d.radius * (0.8 + hash01(seed, 3) * 0.5);
      const x = d.pos.x + (hash01(seed, 7) - 0.5) * d.radius * 0.6;
      const y = d.pos.y + (hash01(seed, 11) - 0.5) * d.radius * 0.6;
      ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  if (p.melt) {
    const hot = resolveColor(p.melt.hot, theme);
    const crust = resolveColor(p.melt.crust, theme);
    ctx.save();
    blobPath(ctx, group);
    ctx.clip();
    // Heart BASE glow (the live pass breathes 0..0.3 on top → 0.35..0.65,
    // the original pulse band).
    const heart = alphaDiscSprite(hot, [[0, 1], [1, 0]], 'meltH');
    ctx.globalAlpha = 0.35;
    for (const d of group) {
      const r = d.radius * 0.95;
      ctx.drawImage(heart, d.pos.x - r, d.pos.y - r, r * 2, r * 2);
    }
    // Crust plates spanning the flow, their edges burning at rest strength.
    ctx.globalAlpha = 1;
    ctx.fillStyle = withAlpha(crust, 0.85);
    for (const d of group) meltCrustPlates(ctx, d, 'fill');
    ctx.strokeStyle = withAlpha(hot, 0.35);
    ctx.lineWidth = 1.4;
    for (const d of group) meltCrustPlates(ctx, d, 'stroke');
    ctx.restore();
  }
}

const liquid: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as LiquidParams;
  const { ctx, theme, time } = env;
  // Body + fords + molten crust normally bake with the floor chunks; a kind
  // that opted out (params.liveBody) — or a bakeLiquidBody=false fallback —
  // paints them here, exactly as the chunk baker would.
  if (liquidBodyIsLive(def)) paintLiquidStatics(env, group, def);
  const coreCol = resolveColor(p.core.color, theme);
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
    // Murk strands: WORLD-anchored sine rows clipped to the merged body —
    // every disc of a poured marsh shares the same continuous strands, so
    // the lattice never shows, and the whole group is one path + one stroke
    // (row/sample positions quantize to absolute world coords, so panning
    // the cull window never re-phases them).
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const d of group) {
      x0 = Math.min(x0, d.pos.x - d.radius); y0 = Math.min(y0, d.pos.y - d.radius);
      x1 = Math.max(x1, d.pos.x + d.radius); y1 = Math.max(y1, d.pos.y + d.radius);
    }
    const S = p.squiggles.spacing ?? 32, amp = p.squiggles.amp ?? 2.6;
    ctx.save();
    blobPath(ctx, group);
    ctx.clip();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = resolveColor(p.squiggles.color, theme);
    ctx.lineWidth = 1.2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const xq0 = Math.floor(x0 / 8) * 8;
    for (let yy = (Math.floor(y0 / S) + 0.5) * S; yy <= y1; yy += S) {
      const k = Math.round(yy / S);
      for (let x = xq0; x <= x1 + 8; x += 8) {
        const wy = yy + Math.sin(x * 0.12 + time * 1.5 + k * 1.7) * amp;
        if (x === xq0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
      }
    }
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  if (p.pads && p.pads.biomes.includes(env.world.zone.biome ?? '')) {
    // Lily pads live on the COASTLINE: candidate rim spots that face open
    // ground (the point just outside is covered by NO other disc of this
    // body) grow a pad clump. The coastline derivation is static per pool,
    // so it computes ONCE per disc (against the FULL kind group — see
    // padsOf) and per-frame work is just the cached spots' fills.
    const padCol = resolveColor(p.pads.color, theme);
    const padLit = shade(padCol, 0.14);
    for (const w of group) {
      if (w.shallow) continue;
      for (const s of padsOf(env.world, w)) {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = s.dark ? padLit : padCol;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        // The notch: a thin wedge of open water cut toward the deep.
        ctx.fillStyle = coreCol;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + Math.cos(s.notch - 0.3) * s.r * 1.1, s.y + Math.sin(s.notch - 0.3) * s.r * 1.1);
        ctx.lineTo(s.x + Math.cos(s.notch + 0.3) * s.r * 1.1, s.y + Math.sin(s.notch + 0.3) * s.r * 1.1);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  if (p.emberPulse) {
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(time * 1.9);
    ctx.fillStyle = resolveColor(p.emberPulse.color, theme);
    blobPath(ctx, group, -8);
    ctx.fill();
  }
  if (p.melt) {
    // MOLTEN PULSE: the hearts' baked base glow (chunk statics) breathes up
    // and down here — a soft-edged radial blit per disc whose alpha rides
    // the old pulse band (0.35 base + 0..0.3 live = 0.35..0.65). The crust
    // plates and seams are baked; only the fire moves.
    const hot = resolveColor(p.melt.hot, theme);
    const heart = alphaDiscSprite(hot, [[0, 1], [1, 0]], 'meltH');
    for (const d of group) {
      const a = 0.15 + 0.15 * Math.sin(time * 1.3 + d.pos.x * 0.02);
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      const r = d.radius * 0.95;
      ctx.drawImage(heart, d.pos.x - r, d.pos.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }
  if (p.embers) {
    // EMBER BED: a cooling coal field — dense little glints, each on its
    // own clock, brightest toward each well's heart. Glints sit within
    // their own disc by construction, so no merged-group clip is needed.
    const col = resolveColor(p.embers.color, theme);
    for (const d of group) {
      const seed = ((d.pos.x * 11 + d.pos.y * 3) | 0) >>> 0;
      const n = Math.max(6, Math.round(d.radius * (p.embers.density ?? 0.3)));
      for (let i = 0; i < n; i++) {
        const a = hash01(i, seed) * Math.PI * 2;
        const dd = Math.sqrt(hash01(i, seed + 7)) * d.radius * 0.9;
        const beat = 0.5 + 0.5 * Math.sin(time * (0.8 + hash01(i, seed + 11) * 1.6) + i * 2.1);
        ctx.globalAlpha = Math.max(0, 0.2 + 0.6 * beat * (1 - dd / (d.radius * 1.1)));
        ctx.fillStyle = i % 4 ? col : shade(col, 0.3);
        ctx.beginPath();
        ctx.arc(d.pos.x + Math.cos(a) * dd, d.pos.y + Math.sin(a) * dd,
          0.8 + hash01(i, seed + 13) * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
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
    // Ice: diagonal glass bands sliding slowly — the frozen mirror. Drawn
    // per GROUP, not per disc: a few long diagonal bands sweep the whole
    // clipped sheet at CONSTANT cost. The old per-disc version (2 gradient
    // allocations + fills per disc per frame) turned a frozen RIVER — one
    // group, hundreds of lattice discs — into a per-frame stroke storm; the
    // harness caught it as a tundra hitch cluster.
    const col = resolveColor(p.glassSheen.color, theme);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const d of group) {
      x0 = Math.min(x0, d.pos.x - d.radius); y0 = Math.min(y0, d.pos.y - d.radius);
      x1 = Math.max(x1, d.pos.x + d.radius); y1 = Math.max(y1, d.pos.y + d.radius);
    }
    const span = Math.max(x1 - x0, y1 - y0);
    const bands = Math.min(4, 2 + (span > 600 ? 1 : 0) + (span > 1400 ? 1 : 0));
    ctx.save();
    blobPath(ctx, group);
    ctx.clip();
    ctx.lineCap = 'round';
    ctx.strokeStyle = col;
    // Bands run along the (1,1) diagonal and drift across the sheet's
    // anti-diagonal extent; each keeps its own phase.
    const reach = (x1 - x0) + (y1 - y0);
    for (let k = 0; k < bands; k++) {
      const drift = ((time * 26 + k * reach / bands + x0 * 0.3) % reach);
      const bx = x0 + drift, by = y1 - drift;
      ctx.beginPath();
      ctx.moveTo(bx - span, by - span);
      ctx.lineTo(bx + span, by + span);
      ctx.globalAlpha = 0.06;
      ctx.lineWidth = 30;
      ctx.stroke();
      ctx.globalAlpha = 0.08;
      ctx.lineWidth = 12;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  if (p.crawl) {
    // Molten crawl: glow blobs orbiting slowly beneath the crust — a baked
    // radial falloff blitted twice per disc (orbit ≤ 0.82r keeps it inside).
    const col = resolveColor(p.crawl.color, theme);
    const spr = alphaDiscSprite(col, [[0, 0.4], [1, 0]], 'crawl');
    ctx.globalAlpha = 1;
    for (const d of group) {
      for (let k = 0; k < 2; k++) {
        const a = time * (0.22 + k * 0.13) * (k % 2 ? -1 : 1) + d.pos.x * 0.02 + k * 2.6;
        const ox = d.pos.x + Math.cos(a) * d.radius * 0.42;
        const oy = d.pos.y + Math.sin(a) * d.radius * 0.42;
        const rr = d.radius * 0.4;
        ctx.drawImage(spr, ox - rr, oy - rr, rr * 2, rr * 2);
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
    // The bog breathes: a bubble swells on its own clock, POPS (a fading
    // ring), and starts again. Host discs pass an AREA-scaled seeded roll —
    // a lone big stamp keeps its bubble, a poured lattice breathes a few
    // scattered wells instead of one ring per checker cell.
    const col = resolveColor(p.bubbles.color, theme);
    const dens = p.bubbles.density ?? 0.35;
    for (const d of group) {
      const seed = ((d.pos.x * 3 + d.pos.y * 13) | 0) >>> 0;
      if (hash01(seed, 29) > (d.radius * d.radius * dens) / 3200) continue;
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
    // RICH TUFTS: clumps of curved blades, two-tone, gently SWAYING. Each
    // tuft is a baked variant sprite (see tuftSprite) and the sway rides a
    // whole-sprite shear — one blit per tuft instead of 25 stroked curves
    // per tuft per frame, which is what dragged the Fields' hedgerows down.
    const base = resolveColor(p.tufts.color, theme);
    const lit = shade(base, 0.22);
    const flower = p.tufts.flower ? resolveColor(p.tufts.flower, theme) : null;
    ctx.globalAlpha = 1;
    for (const g of group) {
      const seed = ((g.pos.x * 13 + g.pos.y * 5) | 0) >>> 0;
      const rq = Math.max(6, Math.round(g.radius / 4) * 4); // radius bucket
      const spr = tuftSprite(base, lit, flower, seed % DISC_VARIANTS, rq);
      const sway = Math.sin(time * 1.7 + g.pos.x * 0.05) * 1.6;
      const half = spr.width / 2;
      // Mirroring (not rotating — blades must stay upright) breaks repeats.
      const flip = hash01(seed, 3) > 0.5 ? -1 : 1;
      ctx.save();
      ctx.translate(g.pos.x, g.pos.y);
      ctx.transform(flip, 0, -sway / 12, 1, 0, 0);      // the lean (blade-tip px → shear)
      ctx.drawImage(spr, -half, -half);
      ctx.restore();
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

// --- THE ROCK GRAMMAR ---------------------------------------------------------
// Rocks stopped being circles. Every stone rolls a deterministic FORM from its
// position — mono boulder, split pair, or a clustered outcrop with shoulder
// stones — builds an angular low-frequency silhouette, and shades it facet by
// facet against the one shared sun (VIS_CFG.lightAngle). Everything else is a
// composable accent on params, each one CHANCE-ROLLED per stone so no two
// neighbours dress alike: strata bedding, fracture seams, mineral grain, moss
// and lichen (theme-gated — they skip biomes without the key), quartz glints,
// barnacle crusts, wet surf-shine, pebble skirts, and a snow cap that follows
// World.snowCover. One painter, every biome's stone: a new rock look is a
// params row, never new code.

export interface RockParams {
  color: ColorSpec;
  edge?: ColorSpec;
  material?: string;
  /** Facet light/shadow swing multiplier (spires push past 1). */
  contrast?: number;
  /** Chance a stone renders as a split pair / shoulder outcrop (default 0.45). */
  cluster?: number;
  /** PINNACLE mode: one tight body, harder apex light, a bright sun-catch. */
  spire?: boolean;
  /** Sedimentary bedding bands (~30% of stones). */
  strata?: { color?: ColorSpec; alpha?: number };
  /** Dark fracture seams (approximate count per stone). */
  cracks?: number;
  /** Mineral stipple. */
  grain?: boolean;
  /** Soft moss blotches hugging the shade side (~55% of stones where the
   *  theme resolves the color). */
  moss?: { color: ColorSpec };
  /** Pale lichen rosettes on the weather side (~40% of stones). */
  lichen?: { color?: ColorSpec };
  /** Crusted tide-line rings on the low side (sea stones). */
  barnacle?: ColorSpec;
  /** A glinting mineral vein catching the light on a slow cycle (~18%). */
  quartz?: { color?: ColorSpec };
  /** Wet specular arcs (surf-washed stone). */
  wet?: boolean;
  /** Ground-contact scatter: a dust shadow + pebbles tying the stone down. */
  skirt?: { color?: ColorSpec; alpha?: number };
  /** Snow settles on the crown as World.snowCover builds — taiga stones whiten
   *  under a falling front and shed it again as the melt runs. */
  snowCap?: { color?: ColorSpec };
}

interface RockBody { cx: number; cy: number; r: number; seed: number; squash: number }

/** Trace one stone's silhouette path and return its rim points. Low-frequency
 *  bulges + per-vert jitter: craggy but MASSIVE — never star-spiky. */
function traceRock(ctx: CanvasRenderingContext2D, b: RockBody): { x: number; y: number }[] {
  const verts = 9 + (b.seed % 3);
  const bulgeA = hash01(b.seed, 51) * Math.PI * 2;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < verts; i++) {
    const a = (i / verts) * Math.PI * 2;
    const bulge = 0.11 * Math.sin(a * 2 + bulgeA) + 0.07 * Math.sin(a * 3 - bulgeA * 1.7);
    const jit = (hash01(i, b.seed) - 0.5) * 0.18;
    const rr = b.r * (0.88 + bulge + jit);
    pts.push({ x: b.cx + Math.cos(a) * rr, y: b.cy + Math.sin(a) * rr * b.squash });
  }
  ctx.beginPath();
  pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.closePath();
  return pts;
}

/** One stone body: silhouette, sun-keyed facets, ridge seams, apex sun-catch,
 *  rim stroke. Returns the rim points for accent placement. */
function drawRockBody(ctx: CanvasRenderingContext2D, b: RockBody, ramp: Ramp,
  edge: string, contrast: number, spire: boolean): { x: number; y: number }[] {
  const pts = traceRock(ctx, b);
  ctx.fillStyle = ramp.base;
  ctx.fill();
  // FACETS: wedges from a sun-side apex, each toned by its outward bearing —
  // the up-left faces catch light, the down-right faces fall into shade.
  const L = VIS_CFG.lightAngle;
  const ax = b.cx + Math.cos(L) * b.r * (spire ? 0.14 : 0.28);
  const ay = b.cy + Math.sin(L) * b.r * (spire ? 0.14 : 0.28) * b.squash;
  for (let i = 0; i < pts.length; i++) {
    const v0 = pts[i], v1 = pts[(i + 1) % pts.length];
    const mid = Math.atan2((v0.y + v1.y) / 2 - b.cy, (v0.x + v1.x) / 2 - b.cx);
    const lit = Math.cos(mid - L) + (hash01(i, b.seed + 7) - 0.5) * 0.55;
    ctx.fillStyle = shade(ramp.base, lit * (lit >= 0 ? 0.2 : 0.26) * contrast);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(v0.x, v0.y);
    ctx.lineTo(v1.x, v1.y);
    ctx.closePath();
    ctx.fill();
  }
  // Ridge seams running off the apex, then the crown's bright sun-catch.
  ctx.strokeStyle = withAlpha(ramp.outline, 0.3);
  ctx.lineWidth = 1;
  for (let i = 0; i < pts.length; i += 3) {
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
  }
  ctx.fillStyle = withAlpha(ramp.highlight, spire ? 0.5 : 0.26);
  ctx.beginPath();
  ctx.ellipse(ax, ay, b.r * (spire ? 0.3 : 0.24), b.r * (spire ? 0.2 : 0.16) * b.squash, L, 0, Math.PI * 2);
  ctx.fill();
  traceRock(ctx, b);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  return pts;
}

const boulder: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as RockParams;
  const { ctx, theme, time, world } = env;
  const base = resolveColor(p.color, theme);
  const ramp = rampOf(base, materialOf(p.material ?? 'stone'));
  const edgeCol = p.edge ? resolveColor(p.edge, theme) : withAlpha(ramp.outline, 0.9);
  const contrast = p.contrast ?? 1;
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    if (o.rot !== undefined) ctx.rotate(o.rot);
    const squash = 0.86 + hash01(seed, 3) * 0.14;
    // Dust skirt under everything: the stone sits IN the ground, not on it.
    if (p.skirt) {
      ctx.globalAlpha = p.skirt.alpha ?? 0.16;
      ctx.fillStyle = p.skirt.color ? resolveColor(p.skirt.color, theme) : shade(base, -0.4);
      ctx.beginPath();
      ctx.ellipse(0, o.radius * 0.06, o.radius * 1.12, o.radius * 0.98, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // FORM ROLL: mono boulder / split pair / shoulder outcrop.
    const roll = hash01(seed, 91);
    const clusterChance = p.spire ? 0 : (p.cluster ?? 0.45);
    const bodies: RockBody[] = [];
    if (roll < clusterChance * 0.4 && o.radius > 12) {
      const a = hash01(seed, 27) * Math.PI * 2;
      const g = o.radius * 0.34;
      bodies.push({ cx: Math.cos(a) * g, cy: Math.sin(a) * g, r: o.radius * 0.64, seed, squash });
      bodies.push({ cx: -Math.cos(a) * g, cy: -Math.sin(a) * g, r: o.radius * 0.52, seed: seed + 13, squash });
    } else if (roll < clusterChance && o.radius > 14) {
      bodies.push({ cx: -o.radius * 0.12, cy: -o.radius * 0.08, r: o.radius * 0.72, seed, squash });
      const sats = 2 + (seed % 2);
      for (let i = 0; i < sats; i++) {
        const a = hash01(i, seed + 41) * Math.PI * 2;
        const d = o.radius * (0.62 + hash01(i, seed + 47) * 0.16);
        bodies.push({
          cx: Math.cos(a) * d, cy: Math.sin(a) * d,
          r: o.radius * (0.24 + hash01(i, seed + 53) * 0.14), seed: seed + i * 7 + 3, squash,
        });
      }
    } else {
      bodies.push({ cx: 0, cy: 0, r: o.radius * (p.spire ? 0.9 : 0.94), seed, squash });
    }
    let mainPts: { x: number; y: number }[] = [];
    bodies.forEach((b, bi) => {
      const pts = drawRockBody(ctx, b, ramp, edgeCol, contrast * (bi === 0 ? 1 : 0.85), !!p.spire);
      if (bi === 0) mainPts = pts;
    });
    const main = bodies[0];
    // --- Accents (main body only; each chance-rolled per stone) -----------
    if (p.strata && main.r > 10 && hash01(seed, 101) < 0.3) {
      ctx.save();
      traceRock(ctx, main);
      ctx.clip();
      const sc = p.strata.color ? resolveColor(p.strata.color, theme) : shade(base, -0.3);
      const sa = hash01(seed, 61) * Math.PI;
      ctx.strokeStyle = withAlpha(sc, p.strata.alpha ?? 0.3);
      ctx.lineWidth = Math.max(1.2, main.r * 0.08);
      for (let k = -2; k <= 2; k++) {
        const off = k * main.r * 0.3 + (hash01(k + 2, seed + 67) - 0.5) * main.r * 0.12;
        const px = Math.cos(sa + Math.PI / 2) * off, py = Math.sin(sa + Math.PI / 2) * off;
        ctx.beginPath();
        ctx.moveTo(main.cx + px - Math.cos(sa) * main.r * 1.1, main.cy + py - Math.sin(sa) * main.r * 1.1);
        ctx.quadraticCurveTo(main.cx + px + Math.cos(sa + Math.PI / 2) * main.r * 0.12,
          main.cy + py + Math.sin(sa + Math.PI / 2) * main.r * 0.12,
          main.cx + px + Math.cos(sa) * main.r * 1.1, main.cy + py + Math.sin(sa) * main.r * 1.1);
        ctx.stroke();
      }
      ctx.restore();
    }
    const crackN = Math.round((p.cracks ?? 0) * (0.4 + hash01(seed, 71) * 1.3));
    if (crackN > 0 && mainPts.length) {
      ctx.strokeStyle = withAlpha(ramp.outline, 0.55);
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      for (let i = 0; i < crackN; i++) {
        const start = mainPts[(seed + i * 4) % mainPts.length];
        let x = start.x, y = start.y;
        let ang = Math.atan2(main.cy - y, main.cx - x);
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 3; s++) {
          ang += (hash01(i * 5 + s, seed + 77) - 0.5) * 1.2;
          x += Math.cos(ang) * main.r * 0.3;
          y += Math.sin(ang) * main.r * 0.3;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        if (hash01(i, seed + 83) > 0.6) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(ang + 1.1) * main.r * 0.18, y + Math.sin(ang + 1.1) * main.r * 0.18);
          ctx.stroke();
        }
      }
    }
    if (p.grain && main.r > 8) {
      ctx.save();
      traceRock(ctx, main);
      ctx.clip();
      const n = Math.min(18, Math.max(5, Math.round(main.r * 0.55)));
      for (let i = 0; i < n; i++) {
        const a = hash01(i, seed + 111) * Math.PI * 2;
        const d = Math.sqrt(hash01(i, seed + 117)) * main.r * 0.85;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = i % 2 ? shade(base, 0.3) : shade(base, -0.32);
        ctx.fillRect(main.cx + Math.cos(a) * d, main.cy + Math.sin(a) * d, 1.2, 1.2);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    if (p.moss && main.r > 9 && hash01(seed, 121) < 0.55) {
      const mc = resolveColorOpt(p.moss.color, theme);
      if (mc) {
        const shadeSide = VIS_CFG.lightAngle + Math.PI;
        for (let i = 0; i < 2 + (seed % 2); i++) {
          const a = shadeSide + (hash01(i, seed + 127) - 0.5) * 1.8;
          const d = main.r * (0.4 + hash01(i, seed + 131) * 0.4);
          ctx.globalAlpha = 0.42;
          ctx.fillStyle = mc;
          ctx.beginPath();
          ctx.ellipse(main.cx + Math.cos(a) * d, main.cy + Math.sin(a) * d * squash,
            main.r * (0.2 + hash01(i, seed + 137) * 0.16), main.r * 0.14,
            hash01(i, seed + 139) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        // A velvet fringe where the stone meets the ground on the shade side.
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = mc;
        ctx.lineWidth = Math.max(1.4, main.r * 0.1);
        ctx.beginPath();
        ctx.arc(main.cx, main.cy, main.r * 0.86, shadeSide - 0.7, shadeSide + 0.7);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    if (p.lichen && main.r > 9 && hash01(seed, 151) < 0.4) {
      const lc = resolveColor(p.lichen.color, theme, '#aab89a');
      for (let i = 0; i < 2 + (seed % 3); i++) {
        const a = hash01(i, seed + 157) * Math.PI * 2;
        const d = Math.sqrt(hash01(i, seed + 163)) * main.r * 0.6;
        const cx = main.cx + Math.cos(a) * d, cy = main.cy + Math.sin(a) * d;
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = lc;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.1, 0, Math.PI * 2);
        ctx.fill();
        for (let k = 0; k < 5; k++) {
          const ka = (k / 5) * Math.PI * 2 + i;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ka) * 2.4, cy + Math.sin(ka) * 2.4, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    if (p.quartz && main.r > 10 && hash01(seed, 171) < 0.18) {
      const qc = resolveColor(p.quartz.color, theme, ramp.highlight);
      const a0 = hash01(seed, 177) * Math.PI * 2;
      let x = main.cx + Math.cos(a0) * main.r * 0.7, y = main.cy + Math.sin(a0) * main.r * 0.7 * squash;
      let ang = a0 + Math.PI;
      ctx.strokeStyle = withAlpha(qc, 0.32 + 0.24 * Math.sin(time * 1.1 + seed));
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 3; s++) {
        ang += (hash01(s, seed + 181) - 0.5) * 0.9;
        x += Math.cos(ang) * main.r * 0.42;
        y += Math.sin(ang) * main.r * 0.42;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    if (p.barnacle) {
      const bc = resolveColor(p.barnacle, theme);
      const n = 4 + (seed % 4);
      for (let i = 0; i < n; i++) {
        const a = Math.PI / 2 + (hash01(i, seed + 191) - 0.5) * 2;
        const d = main.r * (0.55 + hash01(i, seed + 197) * 0.32);
        const cx = main.cx + Math.cos(a) * d, cy = main.cy + Math.sin(a) * d * squash;
        const br = 1.2 + hash01(i, seed + 199) * 1.4;
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = bc;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, br, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = shade(bc, -0.3);
        ctx.beginPath();
        ctx.arc(cx, cy, br * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (p.wet) {
      ctx.strokeStyle = withAlpha('#eef8ff', 0.28);
      ctx.lineCap = 'round';
      for (const f of [0.56, 0.74]) {
        ctx.lineWidth = Math.max(1.2, main.r * 0.07);
        ctx.beginPath();
        ctx.arc(main.cx, main.cy, main.r * f, VIS_CFG.lightAngle - 0.7, VIS_CFG.lightAngle + 0.5);
        ctx.stroke();
      }
    }
    if (p.snowCap) {
      const cover = world.snowCover;
      if (cover > 0.04) {
        const sc = resolveColor(p.snowCap.color, theme, '#edf5fb');
        ctx.save();
        traceRock(ctx, main);
        ctx.clip();
        const L = VIS_CFG.lightAngle;
        const sx = main.cx + Math.cos(L) * main.r * 0.32;
        const sy = main.cy + Math.sin(L) * main.r * 0.32 * squash;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, main.r * 1.02);
        g.addColorStop(0, withAlpha(sc, 0.85 * cover));
        g.addColorStop(0.6, withAlpha(sc, 0.5 * cover));
        g.addColorStop(1, withAlpha(sc, 0));
        ctx.fillStyle = g;
        ctx.fillRect(main.cx - main.r, main.cy - main.r, main.r * 2, main.r * 2);
        ctx.restore();
      }
    }
    // Skirt pebbles last: loose change scattered at the foot.
    if (p.skirt && o.radius > 10) {
      const n = 3 + (seed % 4);
      for (let i = 0; i < n; i++) {
        const a = hash01(i, seed + 211) * Math.PI * 2;
        const d = o.radius * (0.95 + hash01(i, seed + 217) * 0.18);
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = shade(base, hash01(i, seed + 223) * 0.36 - 0.16);
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, 1.5 + hash01(i, seed + 227) * 1.6,
          1.1 + hash01(i, seed + 229), a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
};

/** A CAIRN — somebody STACKED these: courses of rounded stones tightening to a
 *  lit capstone. Deliberately regular against the rock grammar's wild outcrops —
 *  a waymark on moors, passes and pilgrim roads. */
const cairnPainter: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec; edge?: ColorSpec };
  const { ctx, theme } = env;
  const base = resolveColor(p.color, theme, theme.obstacle);
  const ramp = rampOf(base, materialOf('stone'));
  const edge = p.edge ? resolveColor(p.edge, theme) : ramp.outline;
  for (const o of group) {
    const seed = ((o.pos.x * 11 + o.pos.y * 3) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    if (o.rot !== undefined) ctx.rotate(o.rot);
    // Courses climb inward — higher stones draw LIGHTER (closer to the sun).
    const courses: { n: number; ring: number; r: number; tone: string }[] = [
      { n: 4 + (seed % 2), ring: o.radius * 0.56, r: o.radius * 0.4, tone: shade(ramp.base, -0.08) },
      { n: 3, ring: o.radius * 0.27, r: o.radius * 0.36, tone: shade(ramp.base, 0.07) },
      { n: 1, ring: 0, r: o.radius * 0.34, tone: shade(ramp.base, 0.2) },
    ];
    courses.forEach((c, ci) => {
      for (let i = 0; i < c.n; i++) {
        const a = (i / c.n) * Math.PI * 2 + ci * 0.6 + hash01(i, seed + ci) * 0.3;
        const x = Math.cos(a) * c.ring, y = Math.sin(a) * c.ring;
        const rr = c.r * (0.85 + hash01(i * 3 + ci, seed) * 0.3);
        ctx.fillStyle = shade(c.tone, (hash01(i, seed + ci * 7) - 0.5) * 0.1);
        ctx.beginPath();
        ctx.ellipse(x, y, rr, rr * 0.84, a, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = withAlpha(edge, 0.7);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    });
    // The capstone's sun-catch: this pile was BALANCED, and it shows.
    ctx.strokeStyle = withAlpha(ramp.highlight, 0.6);
    ctx.lineWidth = Math.max(1.2, o.radius * 0.08);
    ctx.beginPath();
    ctx.arc(0, 0, o.radius * 0.26, VIS_CFG.lightAngle - 0.9, VIS_CFG.lightAngle + 0.7);
    ctx.stroke();
    ctx.restore();
  }
};

/** SCREE — a walkable spill of weather-rounded gravel: the mountain's loose
 *  change. Two-tone pebbles with sun-side crescents over a faint bed wash —
 *  rounder and denser than masonry rubble; natural where rubble is ruin. */
const scree: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec };
  const { ctx, theme } = env;
  const base = resolveColor(p.color, theme, theme.obstacle);
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = shade(base, -0.25);
  blobPath(ctx, group, 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (const d of group) {
    const seed = ((d.pos.x * 29 + d.pos.y * 11) | 0) >>> 0;
    const n = Math.min(22, Math.max(6, Math.round(d.radius * 0.38)));
    for (let i = 0; i < n; i++) {
      const a = hash01(i, seed) * Math.PI * 2;
      const dd = Math.sqrt(hash01(i, seed + 5)) * d.radius * 0.9;
      const x = d.pos.x + Math.cos(a) * dd, y = d.pos.y + Math.sin(a) * dd;
      const pr = 1.6 + hash01(i, seed + 9) * 2.6;
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = shade(base, hash01(i, seed + 13) * 0.36 - 0.14);
      ctx.beginPath();
      ctx.ellipse(x, y, pr, pr * 0.8, a, 0, Math.PI * 2);
      ctx.fill();
      if (pr > 2.6) {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = shade(base, 0.3);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(x, y, pr * 0.6, VIS_CFG.lightAngle - 0.8, VIS_CFG.lightAngle + 0.6);
        ctx.stroke();
      }
    }
    // Fine grit between the stones.
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = shade(base, -0.3);
    for (let i = 0; i < n >> 1; i++) {
      const a = hash01(i, seed + 31) * Math.PI * 2;
      const dd = Math.sqrt(hash01(i, seed + 37)) * d.radius * 0.85;
      ctx.fillRect(d.pos.x + Math.cos(a) * dd, d.pos.y + Math.sin(a) * dd, 1.1, 1.1);
    }
    ctx.globalAlpha = 1;
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
  /** Light MOTES rising off the crystals, each on its own cycle (the
   *  Descent's light spots — any glowing kind may opt in). */
  motes?: { color: ColorSpec; count?: number };
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
    if (p.motes) {
      // Motes drift up off the facets, brightest mid-rise, reborn each cycle.
      const col = resolveColor(p.motes.color, theme);
      const seed = ((o.pos.x * 11 + o.pos.y * 5) | 0) >>> 0;
      ctx.fillStyle = col;
      for (let i = 0; i < (p.motes.count ?? 4); i++) {
        const period = 2.2 + hash01(i, seed) * 1.8;
        const cyc = ((time + hash01(i, seed + 3) * period) / period) % 1;
        const a = hash01(i, seed + 7) * Math.PI * 2;
        const dd = o.radius * (0.3 + hash01(i, seed + 11) * 0.6);
        ctx.globalAlpha = 0.7 * Math.sin(cyc * Math.PI);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * dd, Math.sin(a) * dd - cyc * o.radius * 1.1,
          0.9 + hash01(i, seed + 13) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

export interface VentParams {
  rim: ColorSpec; throat: ColorSpec; hot: ColorSpec; core: ColorSpec;
}

/** Molten vents: obsidian rim, pulsing throat, bright core. */
/** VENTS — a CRATER, not circles-in-circles: a scorched apron fan, a
 *  form-rolled crust rim of wedge slabs, a throat that falls away down a
 *  real depth gradient to the melt breathing at the bottom, crawl-flecks
 *  orbiting in it, spatter freckles cooling on the apron. Geysers wear the
 *  same bones in spring-water colors; palettes stay pure params. */
const vent: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as VentParams;
  const { ctx, theme, time } = env;
  const rimCol = resolveColor(p.rim, theme);
  const throatCol = resolveColor(p.throat, theme);
  const hotCol = resolveColor(p.hot, theme);
  const coreCol = resolveColor(p.core, theme);
  for (const v of group) {
    const seed = ((v.pos.x * 13 + v.pos.y * 7) | 0) >>> 0;
    const r = v.radius;
    const glow = 0.5 + 0.5 * Math.sin(time * 3.3 + seed * 0.1);
    ctx.save();
    ctx.translate(v.pos.x, v.pos.y);
    // Scorched apron fanning out around the mouth.
    const ag = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.6);
    ag.addColorStop(0, withAlpha(shade(rimCol, -0.2), 0.35));
    ag.addColorStop(1, withAlpha(shade(rimCol, -0.2), 0));
    ctx.fillStyle = ag;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.fill();
    // Cooled spatter freckles on the apron.
    for (let i = 0; i < 4 + (seed % 3); i++) {
      const a = hash01(i, seed + 61) * Math.PI * 2;
      const d = r * (1.15 + hash01(i, seed + 67) * 0.45);
      ctx.fillStyle = withAlpha(shade(hotCol, -0.25), 0.5);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1 + hash01(i, seed + 71) * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // The crust rim: a jagged ring of heaved slabs, seamed into wedges.
    const verts = 11 + (seed % 3);
    const rimPts: { x: number; y: number }[] = [];
    for (let i = 0; i < verts; i++) {
      const a = (i / verts) * Math.PI * 2;
      const rr = r * (1.06 + hash01(i, seed) * 0.22);
      rimPts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr });
    }
    ctx.fillStyle = shade(rimCol, 0.08);
    ctx.beginPath();
    rimPts.forEach((pt, i) => { if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); });
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(rimCol, -0.5), 0.9);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // Wedge seams radiating across the rim ring.
    ctx.strokeStyle = withAlpha(shade(rimCol, -0.45), 0.55);
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 6 + (seed % 3); i++) {
      const a = hash01(i, seed + 17) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88);
      ctx.lineTo(Math.cos(a) * r * 1.24, Math.sin(a) * r * 1.24);
      ctx.stroke();
    }
    // The THROAT: rock lip falling away to the melt at the bottom.
    const tg = ctx.createRadialGradient(0, 0, r * 0.06, 0, 0, r * 0.92);
    tg.addColorStop(0, hotCol);
    tg.addColorStop(0.34, shade(hotCol, -0.3));
    tg.addColorStop(0.72, throatCol);
    tg.addColorStop(1, shade(throatCol, 0.22));
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2); ctx.fill();
    // Crawl-flecks orbiting slowly in the melt.
    for (let k = 0; k < 3; k++) {
      const a = time * (0.3 + k * 0.14) * (k % 2 ? -1 : 1) + hash01(k, seed + 23) * Math.PI * 2;
      const d = r * (0.14 + hash01(k, seed + 29) * 0.18);
      ctx.globalAlpha = 0.4 + 0.4 * glow;
      ctx.fillStyle = shade(hotCol, 0.25);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(1, r * 0.05), 0, Math.PI * 2);
      ctx.fill();
    }
    // The breathing core — and its white-hot pinprick.
    ctx.globalAlpha = 0.45 + 0.5 * glow;
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.3);
    cg.addColorStop(0, coreCol);
    cg.addColorStop(1, withAlpha(coreCol, 0));
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.5 + 0.45 * glow;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, Math.max(1, r * 0.05), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

export interface PodParams {
  body: ColorSpec; glow: ColorSpec;
  aspectY: number; glowY: number; glowR: number; pulseRate: number;
  /** Horizontal band seams (a woven hive says 3); disables mottle. */
  bands?: number;
  /** Vein tracery crawling the membrane (flesh pods). */
  veins?: ColorSpec;
}

/** PODS — one membrane, five biomes: a bulb that BREATHES (the whole body
 *  swells on its pulse), shaded to a sun-side pole, seated by a basal
 *  collar with root ticks, mottled or banded or veined by params, its glow
 *  an internal gradient shining THROUGH the skin instead of a pasted disc.
 *  Serves spore pods, flesh pods, gas bladders, burst sacs, beehives. */
const pod: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as PodParams;
  const { ctx, theme, time } = env;
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    const pulse = 0.5 + 0.5 * Math.sin(time * p.pulseRate + seed * 0.1);
    const body = resolveColor(p.body, theme);
    const glowCol = resolveColor(p.glow, theme);
    const r = o.radius * (0.97 + 0.05 * pulse); // the whole bulb breathes
    const ry = r * p.aspectY;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // Basal collar: the pod is rooted, not resting.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = shade(body, -0.45);
    ctx.beginPath();
    ctx.ellipse(0, ry * 0.55, r * 0.78, ry * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = withAlpha(shade(body, -0.4), 0.8);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.2, r * 0.07);
    for (let i = 0; i < 3; i++) {
      const a = Math.PI * 0.5 + (i - 1) * 0.7 + (hash01(i, seed) - 0.5) * 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * ry * 0.6);
      ctx.lineTo(Math.cos(a) * r * (0.95 + hash01(i, seed + 7) * 0.2),
        Math.sin(a) * ry * (0.95 + hash01(i, seed + 7) * 0.2));
      ctx.stroke();
    }
    // The membrane: a sun-poled gradient over the whole bulb. POOLED (the
    // breathing radius quantizes to whole px, so a pulsing pod cycles a few
    // cached gradients instead of allocating two per frame).
    const L = VIS_CFG.lightAngle;
    const rq = Math.round(r), ryq = Math.round(ry);
    const px = Math.round(Math.cos(L) * rq * 0.3), py = Math.round(Math.sin(L) * ryq * 0.3);
    const mg = cachedRadial(ctx, `pod|${body}|${rq}|${ryq}`,
      px, py, 0, 0, 0, Math.max(rq, ryq),
      () => [[0, shade(body, 0.2)], [0.62, body], [1, shade(body, -0.3)]]);
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2); ctx.fill();
    // Mottle blotches — unless the skin is woven in bands.
    if (!p.bands) {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = shade(body, -0.35);
      for (let i = 0; i < 3 + (seed % 3); i++) {
        const a = hash01(i, seed + 11) * Math.PI * 2;
        const d = Math.sqrt(hash01(i, seed + 13)) * 0.7;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * r * d, Math.sin(a) * ry * d,
          r * (0.12 + hash01(i, seed + 17) * 0.12), r * 0.1,
          hash01(i, seed + 19) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else {
      // Woven courses following the bulb's curve.
      ctx.strokeStyle = withAlpha(shade(body, -0.32), 0.8);
      ctx.lineWidth = Math.max(1, r * 0.06);
      for (let i = 1; i <= p.bands; i++) {
        const f = -1 + (i / (p.bands + 1)) * 2;
        const w = Math.sqrt(Math.max(0.08, 1 - f * f));
        ctx.beginPath();
        ctx.ellipse(0, ry * f, r * w, ry * 0.1 * w, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Vein tracery crawling up from the collar.
    if (p.veins) {
      const vc = resolveColorOpt(p.veins, theme);
      if (vc) {
        ctx.strokeStyle = withAlpha(vc, 0.5 + 0.2 * pulse);
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const a0 = Math.PI * 0.5 + (i - 1) * 0.8;
          let x = Math.cos(a0) * r * 0.7, y = Math.sin(a0) * ry * 0.7;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let s = 0; s < 3; s++) {
            x += (hash01(i * 3 + s, seed + 23) - 0.5) * r * 0.4;
            y -= ry * 0.34;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    }
    // The glow INSIDE the membrane — light through skin, not a pasted disc.
    // POOLED with the pulse factored into globalAlpha (profile baked at the
    // pulse-1 peak; 0.588+0.412·pulse reproduces the old stop-0 curve
    // exactly, the mid stop lands within a few percent — invisible in play).
    const gyq = Math.round(ry * p.glowY);
    const grq = Math.max(1, Math.round(r * p.glowR * 1.5));
    const gg = cachedRadial(ctx, `podglow|${glowCol}|${grq}|${gyq}`,
      0, gyq, 0, 0, gyq, grq,
      () => [[0, withAlpha(glowCol, 0.85)], [0.6, withAlpha(glowCol, 0.33)], [1, withAlpha(glowCol, 0)]]);
    ctx.fillStyle = gg;
    ctx.globalAlpha = 0.588 + 0.412 * pulse;
    ctx.beginPath(); ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Wet sheen on the sun side, and the rim holding it all in.
    ctx.strokeStyle = withAlpha('#ffffff', 0.25);
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.8, ry * 0.8, 0, L - 0.7, L + 0.4);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(shade(body, -0.5), 0.8);
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
};

/** GLOW CAPS — real little mushrooms lit from within, seen from above: a
 *  domed cap over a ring of gill-light escaping under the rim, a bright
 *  pole where the flesh runs thinnest, spore motes drifting up on the
 *  breath. The big halo wash is GONE — the light LAYER carries the ambient
 *  glow now (the entry's light spec), so the pulse reads at parity with
 *  every other emissive in the fabric. */
const dome: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { halo?: ColorSpec; cap?: ColorSpec };
  const { ctx, theme, time } = env;
  const glowCol = resolveColor(p.halo, theme, '#c8ffa0');
  const capCol = resolveColor(p.cap, theme, '#8fd06f');
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    const r = o.radius;
    const breath = 0.5 + 0.5 * Math.sin(time * 1.8 + seed * 0.1);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // A cluster: one proud cap and 1-2 buttons huddling at its foot.
    const buttons = 1 + (seed % 2);
    const capAt = (cx: number, cy: number, cr: number, ci: number): void => {
      // Gill-light escaping under the rim — the mushroom's own lamp.
      const ug = ctx.createRadialGradient(cx, cy, cr * 0.55, cx, cy, cr * 1.35);
      ug.addColorStop(0, withAlpha(glowCol, 0.34 + 0.2 * breath));
      ug.addColorStop(1, withAlpha(glowCol, 0));
      ctx.fillStyle = ug;
      ctx.beginPath(); ctx.arc(cx, cy, cr * 1.35, 0, Math.PI * 2); ctx.fill();
      // Gill spokes at the rim, back-lit.
      ctx.strokeStyle = withAlpha(glowCol, 0.55 + 0.25 * breath);
      ctx.lineWidth = Math.max(0.8, cr * 0.07);
      const gills = Math.max(7, Math.round(cr / 2.4));
      for (let g = 0; g < gills; g++) {
        const a = (g / gills) * Math.PI * 2 + ci;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * cr * 0.8, cy + Math.sin(a) * cr * 0.8);
        ctx.lineTo(cx + Math.cos(a) * cr * 1.02, cy + Math.sin(a) * cr * 1.02);
        ctx.stroke();
      }
      // The dome, translucent flesh over the light.
      const L = VIS_CFG.lightAngle;
      const px = cx + Math.cos(L) * cr * 0.2, py = cy + Math.sin(L) * cr * 0.2;
      const dg = ctx.createRadialGradient(px, py, 0, cx, cy, cr);
      dg.addColorStop(0, shade(capCol, 0.3));
      dg.addColorStop(0.6, capCol);
      dg.addColorStop(1, shade(capCol, -0.26));
      ctx.fillStyle = dg;
      ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withAlpha(shade(capCol, -0.5), 0.75);
      ctx.lineWidth = 1;
      ctx.stroke();
      // The thin crown where the inner light bleeds through, breathing.
      ctx.globalAlpha = 0.35 + 0.35 * breath;
      ctx.fillStyle = glowCol;
      ctx.beginPath(); ctx.arc(px, py, cr * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    };
    capAt(0, 0, r * 0.78, 0);
    for (let i = 0; i < buttons; i++) {
      const a = hash01(i, seed + 31) * Math.PI * 2;
      capAt(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78, r * (0.3 + hash01(i, seed + 37) * 0.12), i + 1);
    }
    // Spore motes drifting up on the breath.
    for (let i = 0; i < 2; i++) {
      const cyc = (time * 0.4 + hash01(i, seed + 41)) % 1;
      ctx.globalAlpha = (1 - cyc) * 0.6;
      ctx.fillStyle = glowCol;
      ctx.beginPath();
      ctx.arc(Math.sin(time * 1.3 + i * 2.4) * r * 0.4, -cyc * r * 1.6, 1 + (1 - cyc), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

// --- The bone vocabulary ------------------------------------------------------
// One long bone: a capsule shaft with a sun-lit edge and a settled shadow edge,
// knobbed epiphyses at both ends, hairline weather cracks. Every bone painter
// builds from this so the `bone` MATERIAL ramp (cool shadows, crack texture)
// reads on the floor exactly as it does on skeleton bodies.

function drawLongBone(ctx: CanvasRenderingContext2D, ramp: Ramp, seed: number,
  x0: number, y0: number, x1: number, y1: number, w: number): void {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2);
  const L = VIS_CFG.lightAngle;
  // Which long edge faces the sun decides where the light lands.
  const lit = Math.cos(ang + Math.PI / 2 - L) >= 0 ? 1 : -1;
  ctx.lineCap = 'round';
  ctx.strokeStyle = ramp.base;
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = withAlpha(ramp.light, 0.8);
  ctx.lineWidth = Math.max(1, w * 0.3);
  ctx.beginPath();
  ctx.moveTo(x0 + px * lit * w * 0.26, y0 + py * lit * w * 0.26);
  ctx.lineTo(x1 + px * lit * w * 0.26, y1 + py * lit * w * 0.26);
  ctx.stroke();
  ctx.strokeStyle = withAlpha(ramp.shadow, 0.7);
  ctx.lineWidth = Math.max(1, w * 0.26);
  ctx.beginPath();
  ctx.moveTo(x0 - px * lit * w * 0.28, y0 - py * lit * w * 0.28);
  ctx.lineTo(x1 - px * lit * w * 0.28, y1 - py * lit * w * 0.28);
  ctx.stroke();
  // Knobbed epiphyses: paired lobes at each end, the sunward lobe brighter.
  for (const [ex, ey, s] of [[x0, y0, 1], [x1, y1, -1]] as const) {
    for (const k of [-1, 1]) {
      ctx.fillStyle = shade(ramp.base, k === lit ? 0.14 : -0.04);
      ctx.beginPath();
      ctx.arc(ex + px * k * w * 0.34 - Math.cos(ang) * s * w * 0.1,
        ey + py * k * w * 0.34 - Math.sin(ang) * s * w * 0.1,
        w * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Weather cracks ticking across the shaft (the material's word made visible).
  if (hash01(seed, 5) < 0.6) {
    ctx.strokeStyle = withAlpha(ramp.outline, 0.5);
    ctx.lineWidth = 0.9;
    const n = 1 + (seed % 2);
    for (let i = 0; i < n; i++) {
      const f = 0.28 + hash01(i, seed + 9) * 0.44;
      const cx = x0 + (x1 - x0) * f, cy = y0 + (y1 - y0) * f;
      ctx.beginPath();
      ctx.moveTo(cx - px * w * 0.4, cy - py * w * 0.4);
      ctx.lineTo(cx + px * w * (0.1 + hash01(i, seed + 11) * 0.3), cy + py * w * 0.42);
      ctx.stroke();
    }
  }
}

/** A weathered skull lying where it rolled: dome with a sun-side lift, jaw
 *  shelf, eye pits under the brow, a wandering suture crack. */
function drawSkull(ctx: CanvasRenderingContext2D, ramp: Ramp, seed: number,
  cx: number, cy: number, r: number, rot: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = ramp.base;
  ctx.beginPath(); ctx.ellipse(0, -r * 0.12, r, r * 0.88, 0, 0, Math.PI * 2); ctx.fill();
  const L = VIS_CFG.lightAngle;
  ctx.fillStyle = withAlpha(ramp.light, 0.6);
  ctx.beginPath();
  ctx.ellipse(Math.cos(L) * r * 0.3, -r * 0.12 + Math.sin(L) * r * 0.26,
    r * 0.5, r * 0.38, L, 0, Math.PI * 2);
  ctx.fill();
  // Jaw shelf tucked below the dome.
  ctx.fillStyle = shade(ramp.base, -0.06);
  ctx.beginPath(); ctx.ellipse(0, r * 0.6, r * 0.54, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
  // The face: eye pits, nasal notch, suture.
  ctx.fillStyle = withAlpha(ramp.outline, 0.9);
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(k * r * 0.34, r * 0.04, r * 0.19, r * 0.23, k * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(0, r * 0.36, r * 0.09, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = withAlpha(ramp.outline, 0.45);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.4);
  ctx.quadraticCurveTo((hash01(seed, 3) - 0.5) * r * 0.5, -r * 0.72, r * 0.42, -r * 0.34);
  ctx.stroke();
  ctx.strokeStyle = withAlpha(ramp.outline, 0.7);
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.ellipse(0, -r * 0.12, r, r * 0.88, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** Loose bone chips scattered round a remains pile — ties it into the ground. */
function drawBoneChips(ctx: CanvasRenderingContext2D, ramp: Ramp, seed: number,
  r: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = hash01(i, seed + 211) * Math.PI * 2;
    const d = r * (0.55 + hash01(i, seed + 217) * 0.55);
    ctx.fillStyle = shade(ramp.base, hash01(i, seed + 223) * 0.3 - 0.18);
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d,
      1.4 + hash01(i, seed + 227) * 1.6, 1 + hash01(i, seed + 229) * 0.8,
      a, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** BONE REMAINS — every pile FORM-ROLLS its own account of the dead: scattered
 *  long-bones, a crossed pair beneath a skull, a half-buried rib sprawl, or the
 *  classic spine-and-crossbars. All of it shades through the `bone` material
 *  ramp, so the cracked, cool-shadowed identity skeletons wear extends to the
 *  floor they fell on. */
const bones: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec; material?: string };
  const { ctx, theme } = env;
  const col = resolveColor(p.color, theme, '#d8cdb8');
  const ramp = rampOf(col, materialOf(p.material ?? 'bone'));
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // Dust shadow first: the remains settled here a long time ago.
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = shade(col, -0.5);
    ctx.beginPath(); ctx.ellipse(0, r * 0.08, r * 1.05, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    const roll = hash01(seed, 91);
    if (roll < 0.3) {
      // SCATTER: long bones flung at angles, chips between them.
      const n = 2 + (seed % 2);
      for (let i = 0; i < n; i++) {
        const a = hash01(i, seed + 31) * Math.PI * 2;
        const cx = (hash01(i, seed + 37) - 0.5) * r * 0.9;
        const cy = (hash01(i, seed + 41) - 0.5) * r * 0.9;
        const len = r * (0.55 + hash01(i, seed + 43) * 0.35);
        drawLongBone(ctx, ramp, seed + i * 17,
          cx - Math.cos(a) * len, cy - Math.sin(a) * len,
          cx + Math.cos(a) * len, cy + Math.sin(a) * len,
          Math.max(2.6, r * 0.22));
      }
      drawBoneChips(ctx, ramp, seed, r, 3 + (seed % 3));
    } else if (roll < 0.56) {
      // MEMENTO MORI: a crossed pair under a skull, staring at the sky.
      const a = hash01(seed, 47) * Math.PI;
      for (const k of [-1, 1]) {
        const ba = a + k * 0.42;
        drawLongBone(ctx, ramp, seed + k * 23,
          -Math.cos(ba) * r * 0.82, -Math.sin(ba) * r * 0.82,
          Math.cos(ba) * r * 0.82, Math.sin(ba) * r * 0.82,
          Math.max(2.6, r * 0.2));
      }
      drawSkull(ctx, ramp, seed, 0, -r * 0.18, r * 0.52, (hash01(seed, 53) - 0.5) * 0.8);
      drawBoneChips(ctx, ramp, seed, r, 2 + (seed % 2));
    } else if (roll < 0.78) {
      // RIB SPRAWL: a half-buried spine arc with rib hooks fading into the dirt.
      const bend = (hash01(seed, 57) - 0.5) * 0.8;
      ctx.strokeStyle = ramp.base;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2.4, r * 0.16);
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, bend * r * 0.5);
      ctx.quadraticCurveTo(0, -bend * r, r * 0.85, bend * r * 0.5);
      ctx.stroke();
      ctx.strokeStyle = withAlpha(ramp.shadow, 0.6);
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, bend * r * 0.5 + r * 0.05);
      ctx.quadraticCurveTo(0, -bend * r + r * 0.05, r * 0.8, bend * r * 0.5 + r * 0.05);
      ctx.stroke();
      const ribs = 4 + (seed % 2);
      for (let i = 0; i < ribs; i++) {
        const f = -0.7 + (i / (ribs - 1)) * 1.4;
        const sx = f * r * 0.8;
        const sy = (1 - Math.abs(f) / 0.9) * -bend * r + Math.abs(f) * bend * r * 0.4;
        const side = i % 2 ? 1 : -1;
        const len = r * (0.5 - Math.abs(f) * 0.22) * (0.8 + hash01(i, seed + 61) * 0.4);
        const tone = shade(ramp.base, (hash01(i, seed + 67) - 0.6) * 0.16);
        ctx.strokeStyle = tone;
        ctx.lineWidth = Math.max(1.8, r * 0.11);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + side * len * 0.4, sy + len * 0.65, sx + side * len * 0.72, sy + len);
        ctx.stroke();
        // Lit crest on the sun side of each hoop.
        ctx.strokeStyle = withAlpha(ramp.light, 0.5);
        ctx.lineWidth = Math.max(0.8, r * 0.04);
        ctx.beginPath();
        ctx.moveTo(sx, sy - r * 0.03);
        ctx.quadraticCurveTo(sx + side * len * 0.4, sy + len * 0.62 - r * 0.03,
          sx + side * len * 0.7, sy + len * 0.96);
        ctx.stroke();
      }
      drawBoneChips(ctx, ramp, seed, r, 2 + (seed % 3));
    } else {
      // THE CLASSIC: spine and crossbars — the original field marker, now
      // built from real long bones instead of flat strokes.
      const w = Math.max(2.8, r * 0.24);
      drawLongBone(ctx, ramp, seed, 0, -r * 0.92, 0, r * 0.92, w);
      drawLongBone(ctx, ramp, seed + 7, -r * 0.66, -r * 0.4, r * 0.66, -r * 0.4, w * 0.86);
      drawLongBone(ctx, ramp, seed + 13, -r * 0.6, r * 0.16, r * 0.6, r * 0.16, w * 0.8);
      drawBoneChips(ctx, ramp, seed, r, 2 + (seed % 2));
    }
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

/** Pulsing star-flakes + hopping spark ticks (static blooms). The GLOW is
 *  the light layer's job (LightSpec, flicker at parity with every emissive)
 *  — the old painted halo disc doubled it as a flat geometric circle. */
const sparkle: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { fill?: ColorSpec; edge?: ColorSpec };
  const { ctx, theme, time } = env;
  for (const o of group) {
    const r = o.radius, pulse = 0.55 + 0.45 * Math.sin(time * 3 + o.pos.x * 0.05);
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    ctx.save();
    ctx.globalAlpha = 0.6 + 0.35 * pulse;
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
    // Spark ticks hopping around the flakes, each on its own clock.
    for (let i = 0; i < 3; i++) {
      const ph = time * (1.3 + hash01(i, seed) * 1.4) + i * 2.1;
      const a = hash01(i, seed + 5) * Math.PI * 2 + ph * 0.7;
      const dd = r * (0.75 + 0.45 * Math.sin(ph));
      const x = o.pos.x + Math.cos(a) * dd, y = o.pos.y + Math.sin(a) * dd;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(ph * 2.3);
      ctx.beginPath();
      ctx.moveTo(x - 2, y); ctx.lineTo(x + 2, y);
      ctx.moveTo(x, y - 2); ctx.lineTo(x, y + 2);
      ctx.stroke();
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

/** A POOL OF POWER: a dark opening ringed by rim stones, skinned with a
 *  luminous breathing film and slow rising motes — the extraction seam's
 *  well, and any future font of anything (ley pools, blood springs) via the
 *  color params. `spent: true` stills it: the film drains, cracks radiate,
 *  the motes die — the same geometry, emptied (the ward-seal doctrine). */
const marrowWell: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec; rim?: ColorSpec; spent?: boolean };
  const { ctx, theme, time } = env;
  const col = resolveColor(p.color, theme, '#a5e3b4');
  const rim = resolveColor(p.rim, theme, '#4a5648');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The opening — dark water-table black, slightly oval (a ground feature).
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#050a08';
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.82, 0, 0, Math.PI * 2); ctx.fill();
    if (!p.spent) {
      // The living film: a breathing sheet of marrow-light + a brighter core.
      const pulse = 0.5 + 0.5 * Math.sin(time * 1.6 + seed % 7);
      ctx.globalAlpha = 0.30 + 0.22 * pulse;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.86, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.35 + 0.3 * pulse;
      ctx.fillStyle = shade(col, 0.35);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.38, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      // Rising motes, each on its own clock, drifting up and dying.
      for (let i = 0; i < 4; i++) {
        const ph = (time * (0.5 + hash01(i, seed) * 0.5) + hash01(i, seed + 3)) % 1;
        const mx = (hash01(i, seed + 9) - 0.5) * r * 1.1;
        ctx.globalAlpha = (1 - ph) * 0.5;
        ctx.fillStyle = shade(col, 0.5);
        ctx.beginPath(); ctx.arc(mx, -ph * r * 1.5, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // Spent: a dry pan with radiating cracks — the scar remembers the shape.
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = shade(rim, -0.25);
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        const a = hash01(i, seed) * Math.PI * 2;
        const len = r * (0.5 + hash01(i, seed + 4) * 0.45);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.16);
        ctx.lineTo(Math.cos(a + 0.25) * len, Math.sin(a + 0.25) * len * 0.82);
        ctx.stroke();
      }
    }
    // Rim stones: a broken ring of worn stone lips (shared by both faces).
    ctx.globalAlpha = 0.95;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + hash01(i, seed + 11) * 0.4;
      const sr = 2.2 + hash01(i, seed + 13) * 2.4;
      ctx.fillStyle = shade(rim, hash01(i, seed + 17) * 0.3 - 0.1);
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r, Math.sin(a) * r * 0.82, sr, sr * 0.75, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

/** Swaying translucent kelp blades. */
/** KELP STANDS (and reed beds, params.reed): tapered RIBBON blades — two
 *  curved edges filled, a lit midrib, a slow current sway. Kelp floats gas
 *  bladders where the blade narrows; reeds stand straighter, thinner, and
 *  carry cattail seed heads at the tip. One painter, both waterlines. */
const kelp: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec; reed?: boolean; bladder?: ColorSpec };
  const { ctx, theme, time } = env;
  const col = resolveColor(p.color, theme, '#2f7a4a');
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Root shadow tying the stand into its bed.
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = shade(col, -0.5);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.42, r * 0.8, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.85;
    const blades = 3 + (seed % 3);
    for (let i = 0; i < blades; i++) {
      const bx = ((i + 0.5) / blades - 0.5) * r * 1.3 + (hash01(i, seed) - 0.5) * r * 0.2;
      const len = r * (p.reed ? 0.95 + hash01(i, seed + 7) * 0.45 : 0.85 + hash01(i, seed + 7) * 0.55);
      const sway = Math.sin(time * (p.reed ? 1.1 : 1.6) + seed * 0.1 + i * 1.7) * r * (p.reed ? 0.07 : 0.19);
      const w0 = r * (p.reed ? 0.045 : 0.085 + hash01(i, seed + 11) * 0.04);
      const tone = shade(col, (hash01(i, seed + 13) - 0.4) * 0.3);
      const baseY = r * 0.42;
      const tipX = bx + sway, tipY = baseY - len;
      const cX = bx + sway * 0.5, cY = baseY - len * 0.55;
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.moveTo(bx - w0, baseY);
      ctx.quadraticCurveTo(cX - w0 * 0.8, cY, tipX, tipY);
      ctx.quadraticCurveTo(cX + w0 * 0.8, cY, bx + w0, baseY);
      ctx.closePath();
      ctx.fill();
      // The lit midrib running up the blade.
      ctx.strokeStyle = withAlpha(shade(col, 0.3), 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, baseY - r * 0.03);
      ctx.quadraticCurveTo(cX, cY, tipX, tipY);
      ctx.stroke();
      if (p.reed) {
        // Cattail seed head nodding at the tip.
        ctx.fillStyle = shade('#8a6a42', hash01(i, seed + 17) * 0.2 - 0.1);
        ctx.beginPath();
        ctx.ellipse(tipX, tipY + r * 0.07, r * 0.05, r * 0.13, sway * 0.03, 0, Math.PI * 2);
        ctx.fill();
      } else if (i % 2 === 0) {
        // A gas bladder float where the blade narrows.
        const bl = resolveColor(p.bladder, theme, shade(col, 0.42));
        ctx.fillStyle = withAlpha(bl, 0.9);
        ctx.beginPath();
        ctx.arc(bx + sway * 0.55, baseY - len * 0.6, Math.max(1.4, r * 0.055), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

/** CORAL HEADS — every head FORM-ROLLS its colony: a recursive STAGHORN
 *  antler (knob tips, polyp specks), a BRAIN boule scored with meander
 *  grooves, or a GORGONIAN FAN (spokes laced by concentric ribs). Two hue
 *  families roll per head so a reef never reads monochrome. */
const coral: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { base?: ColorSpec; branch?: ColorSpec; branch2?: ColorSpec };
  const { ctx, theme } = env;
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    const r = o.radius;
    const baseCol = resolveColor(p.base, theme, '#16323c');
    const br = hash01(seed, 5) < 0.6
      ? resolveColor(p.branch, theme, '#e87aa0')
      : resolveColor(p.branch2, theme, '#e8b06a');
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // The reef base: a knobby dark mound the colony grew over.
    ctx.fillStyle = baseCol;
    ctx.beginPath();
    for (let k = 0; k <= 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const rr = r * 0.68 * (0.86 + 0.14 * Math.abs(Math.sin(a * 3 + seed)));
      const x = Math.cos(a) * rr, y = r * 0.12 + Math.sin(a) * rr * 0.82;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(baseCol, -0.45), 0.8);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    const form = hash01(seed, 9);
    if (form < 0.45) {
      // STAGHORN: recursive antlers off three main stems.
      ctx.lineCap = 'round';
      const drawBranch = (x: number, y: number, a: number, len: number, w: number, depth: number): void => {
        const nx = x + Math.cos(a) * len, ny = y + Math.sin(a) * len;
        ctx.strokeStyle = shade(br, -depth * 0.08);
        ctx.lineWidth = Math.max(1.2, w);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
        if (depth < 2) {
          drawBranch(nx, ny, a - 0.5 - hash01(depth, seed + 21) * 0.3, len * 0.62, w * 0.66, depth + 1);
          drawBranch(nx, ny, a + 0.45 + hash01(depth, seed + 23) * 0.3, len * 0.62, w * 0.66, depth + 1);
        } else {
          // Knob tip catching the light.
          ctx.fillStyle = shade(br, 0.32);
          ctx.beginPath(); ctx.arc(nx, ny, Math.max(1.2, w * 0.55), 0, Math.PI * 2); ctx.fill();
        }
      };
      const stems = 3;
      for (let i = 0; i < stems; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.62 + (hash01(i, seed + 27) - 0.5) * 0.3;
        drawBranch(Math.cos(a) * r * 0.2, r * 0.1 + Math.sin(a) * r * 0.2, a,
          r * (0.4 + hash01(i, seed + 31) * 0.14), Math.max(2, r * 0.14), 0);
      }
      // Polyp specks feeding along the arms.
      ctx.fillStyle = withAlpha(shade(br, 0.5), 0.8);
      for (let i = 0; i < 6 + (seed % 4); i++) {
        const a = -Math.PI / 2 + (hash01(i, seed + 37) - 0.5) * 2.2;
        const d = r * (0.3 + hash01(i, seed + 41) * 0.6);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, r * 0.1 + Math.sin(a) * d, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (form < 0.75) {
      // BRAIN: a boule scored by meander grooves.
      const cy = -r * 0.08, cr = r * 0.58;
      ctx.fillStyle = shade(br, -0.06);
      ctx.beginPath(); ctx.arc(0, cy, cr, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(0, cy, cr, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = withAlpha(shade(br, -0.48), 0.75);
      ctx.lineWidth = Math.max(1, r * 0.05);
      const rows = 4 + (seed % 3);
      for (let i = 0; i < rows; i++) {
        const gy = cy - cr + ((i + 0.5) / rows) * cr * 2;
        ctx.beginPath();
        for (let s = 0; s <= 10; s++) {
          const gx = -cr + (s / 10) * cr * 2;
          const wob = Math.sin(s * 1.9 + i * 2.3 + seed) * r * 0.05;
          if (s === 0) ctx.moveTo(gx, gy + wob); else ctx.lineTo(gx, gy + wob);
        }
        ctx.stroke();
      }
      ctx.restore();
      // Sun-catch on the boule's crown.
      const L = VIS_CFG.lightAngle;
      ctx.strokeStyle = withAlpha(shade(br, 0.4), 0.55);
      ctx.lineWidth = Math.max(1.2, r * 0.07);
      ctx.beginPath();
      ctx.arc(0, cy, cr * 0.82, L - 0.8, L + 0.8);
      ctx.stroke();
    } else {
      // GORGONIAN FAN: spokes laced with concentric ribs.
      const ox = 0, oy = r * 0.24;
      const spokes = 5 + (seed % 3);
      const span = 1.7;
      ctx.lineCap = 'round';
      for (let i = 0; i < spokes; i++) {
        const a = -Math.PI / 2 + (i / (spokes - 1) - 0.5) * span;
        const len = r * (0.85 + hash01(i, seed + 47) * 0.25);
        ctx.strokeStyle = shade(br, (hash01(i, seed + 51) - 0.5) * 0.16);
        ctx.lineWidth = Math.max(1.2, r * 0.05);
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + Math.cos(a) * len, oy + Math.sin(a) * len);
        ctx.stroke();
        ctx.fillStyle = shade(br, 0.34);
        ctx.beginPath();
        ctx.arc(ox + Math.cos(a) * len, oy + Math.sin(a) * len, Math.max(1, r * 0.04), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = withAlpha(shade(br, -0.2), 0.7);
      ctx.lineWidth = 1;
      for (const f of [0.45, 0.7, 0.92]) {
        ctx.beginPath();
        ctx.arc(ox, oy, r * f, -Math.PI / 2 - span / 2, -Math.PI / 2 + span / 2);
        ctx.stroke();
      }
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
  const p = (def.params ?? {}) as { fill?: ColorSpec; line?: ColorSpec; rot?: boolean };
  const { ctx, theme } = env;
  const fill = resolveColor(p.fill, theme, '#5e4730');
  const line = resolveColor(p.line, theme, '#3c2c1c');
  for (const b of group) {
    const seed = ((b.pos.x * 13 + b.pos.y * 7) | 0) >>> 0;
    ctx.save();
    ctx.translate(b.pos.x, b.pos.y);
    ctx.rotate(b.dir ?? 0);
    ctx.fillStyle = p.rot ? shade(fill, (hash01(seed, 3) - 0.6) * 0.16) : fill;
    ctx.fillRect(-b.radius, -b.radius * 0.82, b.radius * 2, b.radius * 1.64);
    // Worn mid-track.
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = shade(fill, 0.2);
    ctx.fillRect(-b.radius, -b.radius * 0.3, b.radius * 2, b.radius * 0.6);
    ctx.globalAlpha = 1;
    // ROT: boards missing over the dark, split seams, moss creeping the rail.
    if (p.rot) {
      const gaps = 1 + (seed % 2);
      for (let i = 0; i < gaps; i++) {
        const gx = -b.radius + (0.18 + hash01(i, seed + 7) * 0.6) * b.radius * 2;
        const gw = b.radius * (0.1 + hash01(i, seed + 11) * 0.12);
        ctx.fillStyle = withAlpha('#07070c', 0.88);
        ctx.fillRect(gx, -b.radius * 0.82, gw, b.radius * 1.64);
      }
      ctx.strokeStyle = withAlpha(shade(fill, -0.5), 0.8);
      ctx.lineWidth = 1;
      const sx = -b.radius + hash01(seed, 17) * b.radius * 1.6;
      ctx.beginPath();
      ctx.moveTo(sx, -b.radius * 0.7);
      ctx.lineTo(sx + b.radius * 0.3, b.radius * (0.2 + hash01(seed, 19) * 0.5));
      ctx.stroke();
      const mossCol = resolveColorOpt('theme:tree', theme);
      if (mossCol && hash01(seed, 23) < 0.55) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = mossCol;
        for (let i = 0; i < 3; i++) {
          const mx = -b.radius + hash01(i, seed + 29) * b.radius * 2;
          ctx.beginPath();
          ctx.ellipse(mx, b.radius * (0.6 + hash01(i, seed + 31) * 0.2) * (i % 2 ? 1 : -1),
            2.2 + hash01(i, seed + 37) * 2, 1.4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
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

/** Palisade wall posts — material-aware built segments: timber posts wear
 *  vertical grain and a sun-lit cap; stone courses wear running-bond seams.
 *  Per-post weathering off the position hash, so a wall run reads as many
 *  hands' work instead of one tiling texture. */
const palisade: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { fill?: ColorSpec; edge?: ColorSpec; material?: string };
  const { ctx, theme } = env;
  const fill = resolveColor(p.fill, theme, '#5e4c34');
  const mat = p.material ?? 'wood';
  const ramp = rampOf(fill, materialOf(mat));
  const edgeCol = p.edge ? resolveColor(p.edge, theme) : withAlpha(ramp.outline, 0.95);
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    const r = o.radius;
    const x0 = o.pos.x - r * 0.85, y0 = o.pos.y - r * 0.85, s = r * 1.7;
    // Weathered base tone: no two segments quite match.
    ctx.fillStyle = shade(ramp.base, (hash01(seed, 3) - 0.5) * 0.12);
    ctx.fillRect(x0, y0, s, s);
    // Sun-lit cap along the top, settled shadow along the foot.
    ctx.fillStyle = withAlpha(ramp.light, 0.75);
    ctx.fillRect(x0, y0, s, s * 0.24);
    ctx.fillStyle = withAlpha(ramp.shadow, 0.55);
    ctx.fillRect(x0, y0 + s * 0.8, s, s * 0.2);
    if (mat === 'stone') {
      // Running-bond seams: a mid course line, verticals staggered per segment.
      ctx.strokeStyle = withAlpha(ramp.outline, 0.5);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + s * 0.52); ctx.lineTo(x0 + s, y0 + s * 0.52);
      const stagger = (seed % 2) ? 0.33 : 0.62;
      ctx.moveTo(x0 + s * stagger, y0 + s * 0.24); ctx.lineTo(x0 + s * stagger, y0 + s * 0.52);
      ctx.moveTo(x0 + s * (1.02 - stagger), y0 + s * 0.52); ctx.lineTo(x0 + s * (1.02 - stagger), y0 + s);
      ctx.stroke();
    } else {
      // Timber grain: vertical strokes wandering slightly off-plumb.
      ctx.strokeStyle = withAlpha(ramp.outline, 0.3);
      ctx.lineWidth = 1;
      const n = 2 + (seed % 2);
      for (let i = 0; i < n; i++) {
        const gx = x0 + s * ((i + 0.7) / (n + 0.6));
        ctx.beginPath();
        ctx.moveTo(gx, y0 + s * 0.26);
        ctx.quadraticCurveTo(gx + (hash01(i, seed + 7) - 0.5) * s * 0.14, y0 + s * 0.6, gx, y0 + s * 0.96);
        ctx.stroke();
      }
    }
    // A weather crack on the odd post.
    if (hash01(seed, 51) < 0.3) {
      ctx.strokeStyle = withAlpha(ramp.outline, 0.55);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x0 + s * hash01(seed, 57), y0 + s * 0.3);
      ctx.lineTo(x0 + s * (hash01(seed, 57) + (hash01(seed, 61) - 0.5) * 0.3), y0 + s * (0.6 + hash01(seed, 67) * 0.3));
      ctx.stroke();
    }
    ctx.strokeStyle = edgeCol;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, s, s);
  }
};

export interface ChasmParams {
  /** Lip stone ringing the drop. */
  rim?: { color?: ColorSpec; alpha?: number; grow?: number };
  /** The dark itself. */
  core: { color: ColorSpec };
  /** A descending shelf terrace between lip and dark (0 to skip, default 1). */
  bands?: number;
  /** Ground-fracture cracks radiating out from the lip. */
  cracks?: { color?: ColorSpec; chance?: number };
  /** Broken slabs left overhanging the drop (~30% of mouths). */
  ledges?: { color?: ColorSpec };
  /** Slow pale breath drifting deep inside (big drops only). */
  mist?: { color?: ColorSpec; alpha?: number };
  /** Faint pulsing inner glow — the unnatural pits say so themselves. */
  glow?: { color: ColorSpec; alpha?: number };
}

/** CHASMS — a real drop instead of a flat disc: lip stone, a descending shelf
 *  terrace, per-well depth gradients pulling the eye down, fracture cracks
 *  radiating into the ground, chance-rolled overhang slabs, and a slow mist
 *  breathing far below. Merged-blob silhouettes throughout, so a chasm CHAIN
 *  reads as one wound and never as stamped circles. */
const chasmPit: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as ChasmParams;
  const { ctx, theme, time } = env;
  const coreCol = resolveColor(p.core.color, theme);
  const rimCol = resolveColor(p.rim?.color, theme, shade(coreCol, 0.4));
  const rimGrow = p.rim?.grow ?? 6;
  // The lip: weathered stone ringing the whole merged silhouette.
  if (p.rim) {
    ctx.globalAlpha = p.rim.alpha ?? 0.5;
    ctx.fillStyle = rimCol;
    blobPath(ctx, group, rimGrow);
    ctx.fill();
  }
  // One descending shelf between lip and dark — the ground stepping down.
  const bands = p.bands ?? 1;
  for (let k = 0; k < bands; k++) {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = mix(rimCol, coreCol, (k + 1) / (bands + 1));
    blobPath(ctx, group, rimGrow * (1 - (k + 1) / (bands + 1)));
    ctx.fill();
  }
  // The dark, full blocking silhouette.
  ctx.globalAlpha = 1;
  ctx.fillStyle = coreCol;
  blobPath(ctx, group, 0);
  ctx.fill();
  // Per-well detail.
  for (const d of group) {
    const seed = ((d.pos.x * 13 + d.pos.y * 7) | 0) >>> 0;
    const r = d.radius;
    // Depth well: the center falls further than the walls around it.
    const dg = ctx.createRadialGradient(d.pos.x, d.pos.y, 0, d.pos.x, d.pos.y, r * 0.85);
    dg.addColorStop(0, withAlpha('#000000', 0.7));
    dg.addColorStop(1, withAlpha('#000000', 0));
    ctx.fillStyle = dg;
    ctx.beginPath(); ctx.arc(d.pos.x, d.pos.y, r * 0.85, 0, Math.PI * 2); ctx.fill();
    // Fracture cracks running out into the ground that failed.
    if (p.cracks && hash01(seed, 21) < (p.cracks.chance ?? 0.5)) {
      const cc = p.cracks.color ? resolveColor(p.cracks.color, theme) : withAlpha(shade(rimCol, -0.35), 0.5);
      ctx.strokeStyle = cc;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      const n = 2 + (seed % 2);
      for (let i = 0; i < n; i++) {
        const a0 = hash01(i, seed + 27) * Math.PI * 2;
        let x = d.pos.x + Math.cos(a0) * (r + rimGrow * 0.6);
        let y = d.pos.y + Math.sin(a0) * (r + rimGrow * 0.6);
        let ang = a0;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 2; s++) {
          ang += (hash01(i * 3 + s, seed + 31) - 0.5) * 1.0;
          x += Math.cos(ang) * r * (0.2 + hash01(s, seed + 37) * 0.16);
          y += Math.sin(ang) * r * (0.2 + hash01(s, seed + 37) * 0.16);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    // An overhang slab somebody will trust one day.
    if (p.ledges && hash01(seed, 41) < 0.3 && r > 20) {
      const lc = p.ledges.color ? resolveColor(p.ledges.color, theme) : shade(rimCol, 0.08);
      const a = hash01(seed, 47) * Math.PI * 2;
      const bx = d.pos.x + Math.cos(a) * r * 0.92, by = d.pos.y + Math.sin(a) * r * 0.92;
      const inx = -Math.cos(a), iny = -Math.sin(a);
      const w = r * (0.16 + hash01(seed, 53) * 0.1), len = r * (0.22 + hash01(seed, 57) * 0.14);
      // Its shadow on the void below first, then the slab.
      ctx.fillStyle = withAlpha('#000000', 0.5);
      ctx.beginPath();
      ctx.ellipse(bx + inx * len * 0.7 + w * 0.2, by + iny * len * 0.7 + w * 0.3, len * 0.7, w * 0.9, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lc;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a + Math.PI / 2) * w, by + Math.sin(a + Math.PI / 2) * w);
      ctx.lineTo(bx - Math.cos(a + Math.PI / 2) * w, by - Math.sin(a + Math.PI / 2) * w);
      ctx.lineTo(bx + inx * len - Math.cos(a + Math.PI / 2) * w * 0.55, by + iny * len - Math.sin(a + Math.PI / 2) * w * 0.55);
      ctx.lineTo(bx + inx * len + Math.cos(a + Math.PI / 2) * w * 0.55, by + iny * len + Math.sin(a + Math.PI / 2) * w * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = withAlpha(shade(lc, -0.45), 0.8);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // The breath of the deep: pale mist crossing the well, slowly.
    if (p.mist && r > 34) {
      const mc = resolveColor(p.mist.color, theme, '#8a92a2');
      const ma = p.mist.alpha ?? 0.06;
      for (let i = 0; i < 2; i++) {
        const cyc = (time * 0.05 + hash01(i, seed + 61)) % 1;
        const mx = d.pos.x + Math.cos(cyc * Math.PI * 2) * r * 0.4;
        const my = d.pos.y + Math.sin(cyc * Math.PI * 2 + i * 2.4) * r * 0.34;
        const mg = ctx.createRadialGradient(mx, my, 0, mx, my, r * 0.42);
        mg.addColorStop(0, withAlpha(mc, ma * (0.7 + 0.3 * Math.sin(time * 0.7 + i))));
        mg.addColorStop(1, withAlpha(mc, 0));
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(mx, my, r * 0.42, 0, Math.PI * 2); ctx.fill();
      }
    }
    // The unnatural pits glow, faintly, from below.
    if (p.glow) {
      const gc = resolveColor(p.glow.color, theme);
      const pulse = 0.6 + 0.4 * Math.sin(time * 1.1 + seed * 0.1);
      const gg = ctx.createRadialGradient(d.pos.x, d.pos.y, 0, d.pos.x, d.pos.y, r * 0.6);
      gg.addColorStop(0, withAlpha(gc, (p.glow.alpha ?? 0.12) * pulse));
      gg.addColorStop(1, withAlpha(gc, 0));
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(d.pos.x, d.pos.y, r * 0.6, 0, Math.PI * 2); ctx.fill();
    }
  }
};

export interface CragParams {
  color: ColorSpec;
  edge?: ColorSpec;
  material?: string;
  /** Flank band width before the plateau top (world units, default 7). */
  inset?: number;
  contrast?: number;
  /** Sedimentary banding along the leeward flank (~30% of crowns). */
  strata?: { color?: ColorSpec; alpha?: number };
  /** Approximate plateau fracture count per crown. */
  cracks?: number;
  /** Shade-side moss (theme-gated — skips biomes without the key). */
  moss?: { color: ColorSpec };
  /** Scree pebbles shed at the foot. */
  skirt?: { color?: ColorSpec; alpha?: number };
  /** Snow settling on the plateau as World.snowCover builds. */
  snowCap?: { color?: ColorSpec };
}

/** CLIFF MASSES — the chasm's inverse, drawn RAISED: a sun-thrown ground
 *  shadow, a shaded flank band under an inset plateau bevel, lit and sunk
 *  rims keyed to the shared sun (interior crowns read as summit domes along
 *  the ridge), leeward flank striations, and chance-rolled accents through
 *  the material ramp. Merged-blob passes throughout, so a wandering cliff
 *  chain reads as ONE crag and never as stamped circles. */
const cliffMass: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as CragParams;
  const { ctx, theme, world } = env;
  const base = resolveColor(p.color, theme, theme.obstacle ?? '#5a5248');
  const ramp = rampOf(base, materialOf(p.material ?? 'stone'));
  const edgeCol = p.edge ? resolveColor(p.edge, theme) : withAlpha(ramp.outline, 0.95);
  const contrast = p.contrast ?? 1;
  const inset = p.inset ?? 7;
  const L = VIS_CFG.lightAngle;
  // Ground shadow thrown away from the sun: the mass STANDS on the land.
  ctx.save();
  ctx.translate(-Math.cos(L) * 7, -Math.sin(L) * 7);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#000000';
  blobPath(ctx, group, 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
  // The EDGE as a merged fill ring (a STROKE would outline every disc and
  // give the stamped-circles read back — fills merge, strokes don't).
  ctx.fillStyle = edgeCol;
  blobPath(ctx, group, 0);
  ctx.fill();
  // The FLANK: the rock face you see past the top's edge.
  ctx.fillStyle = shade(ramp.base, -0.2 * contrast);
  blobPath(ctx, group, -1.6);
  ctx.fill();
  // The PLATEAU: the lit top, inset — the bevel that says RAISED.
  ctx.fillStyle = ramp.base;
  blobPath(ctx, group, -inset);
  ctx.fill();
  for (const d of group) {
    const seed = ((d.pos.x * 13 + d.pos.y * 7) | 0) >>> 0;
    const r = Math.max(2, d.radius - inset);
    // Sun-keyed rims: a lit crescent sunward, a sunk crescent leeward.
    ctx.strokeStyle = withAlpha(ramp.light, 0.4 * contrast);
    ctx.lineWidth = Math.max(1.5, d.radius * 0.09);
    ctx.beginPath();
    ctx.arc(d.pos.x, d.pos.y, r * 0.94, L - 1.0, L + 1.0);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(ramp.shadow, 0.35 * contrast);
    ctx.beginPath();
    ctx.arc(d.pos.x, d.pos.y, r * 0.94, L + Math.PI - 0.9, L + Math.PI + 0.9);
    ctx.stroke();
    // Leeward FLANK STRIATIONS: carved seams down the shaded face.
    ctx.strokeStyle = withAlpha(ramp.outline, 0.4);
    ctx.lineWidth = 1.1;
    const seams = 2 + (seed % 3);
    for (let i = 0; i < seams; i++) {
      const a = L + Math.PI + (hash01(i, seed + 17) - 0.5) * 1.6;
      ctx.beginPath();
      ctx.moveTo(d.pos.x + Math.cos(a) * r, d.pos.y + Math.sin(a) * r);
      ctx.lineTo(d.pos.x + Math.cos(a) * (d.radius - 1), d.pos.y + Math.sin(a) * (d.radius - 1));
      ctx.stroke();
    }
    // Sedimentary banding riding the leeward flank.
    if (p.strata && hash01(seed, 101) < 0.3) {
      const sc = p.strata.color ? resolveColor(p.strata.color, theme) : shade(base, -0.34);
      ctx.strokeStyle = withAlpha(sc, p.strata.alpha ?? 0.4);
      ctx.lineWidth = Math.max(1, d.radius * 0.045);
      for (const f of [0.985, 0.93]) {
        ctx.beginPath();
        ctx.arc(d.pos.x, d.pos.y, r + (d.radius - r) * f, L + Math.PI - 1.1, L + Math.PI + 1.1);
        ctx.stroke();
      }
    }
    // Plateau fractures wandering in from the rim.
    const crackN = Math.round((p.cracks ?? 0) * (0.4 + hash01(seed, 71) * 1.3));
    if (crackN > 0) {
      ctx.strokeStyle = withAlpha(ramp.outline, 0.5);
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      for (let i = 0; i < crackN; i++) {
        const a0 = hash01(i, seed + 77) * Math.PI * 2;
        let x = d.pos.x + Math.cos(a0) * r * 0.9, y = d.pos.y + Math.sin(a0) * r * 0.9;
        let ang = a0 + Math.PI;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 3; s++) {
          ang += (hash01(i * 5 + s, seed + 83) - 0.5) * 1.2;
          x += Math.cos(ang) * r * 0.26;
          y += Math.sin(ang) * r * 0.26;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    // Moss hugging the shade side, where the biome grows any.
    if (p.moss && hash01(seed, 121) < 0.5) {
      const mc = resolveColorOpt(p.moss.color, theme);
      if (mc) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = mc;
        for (let i = 0; i < 2 + (seed % 2); i++) {
          const a = L + Math.PI + (hash01(i, seed + 127) - 0.5) * 1.6;
          const dd = r * (0.55 + hash01(i, seed + 131) * 0.35);
          ctx.beginPath();
          ctx.ellipse(d.pos.x + Math.cos(a) * dd, d.pos.y + Math.sin(a) * dd,
            r * (0.16 + hash01(i, seed + 137) * 0.12), r * 0.1,
            hash01(i, seed + 139) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    // Scree shed at the foot.
    if (p.skirt && hash01(seed, 211) < 0.55) {
      const n = 3 + (seed % 3);
      for (let i = 0; i < n; i++) {
        const a = hash01(i, seed + 217) * Math.PI * 2;
        const dd = d.radius * (1.02 + hash01(i, seed + 223) * 0.14);
        ctx.globalAlpha = p.skirt.alpha ?? 0.75;
        ctx.fillStyle = shade(base, hash01(i, seed + 227) * 0.36 - 0.2);
        ctx.beginPath();
        ctx.ellipse(d.pos.x + Math.cos(a) * dd, d.pos.y + Math.sin(a) * dd,
          1.5 + hash01(i, seed + 229) * 1.6, 1.1 + hash01(i, seed + 231), a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Snow settles on the plateau as the cover builds.
    if (p.snowCap) {
      const cover = world.snowCover;
      if (cover > 0.04) {
        const sc = resolveColor(p.snowCap.color, theme, '#edf5fb');
        const sx = d.pos.x + Math.cos(L) * r * 0.3, sy = d.pos.y + Math.sin(L) * r * 0.3;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        g.addColorStop(0, withAlpha(sc, 0.85 * cover));
        g.addColorStop(0.6, withAlpha(sc, 0.5 * cover));
        g.addColorStop(1, withAlpha(sc, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(d.pos.x, d.pos.y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
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

export interface CaveMouthParams {
  /** Brow/jamb stone color (default the biome's own obstacle rock). */
  color?: ColorSpec;
  edge?: ColorSpec;
  material?: string;
  /** Interior torch-glow licking the throat wall. */
  glow?: ColorSpec;
  /** Underground black at the center of the throat. */
  throat?: ColorSpec;
  /** Chance a mouth renders as a jumbled rockfall ring instead of a browed
   *  arch (default 0.35). */
  tumble?: number;
  /** Stalactite fangs hanging into the opening (~55% of mouths). */
  teeth?: { color?: ColorSpec };
  /** Fallen threshold stones at the approach (~60%). */
  rubble?: { color?: ColorSpec };
  /** Hanging growth trailing over the lip — theme-gated, so verdant biomes
   *  drape their caves and deserts stay bare (~45%). */
  vines?: { color?: ColorSpec };
  label?: string;
}

/** CAVE MOUTHS — geology, not an icon: every entrance FORM-ROLLS its portal
 *  (a browed arch of real form-rolled stones, or a tumbled rockfall ring), the
 *  throat falls away down a true depth gradient with torchlight licking up
 *  from below, and chance-rolled accents (stalactite fangs, threshold rubble,
 *  theme-gated hanging vines) dress each one differently. Same entry, every
 *  biome, no two mouths alike. */
const caveMouth: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as CaveMouthParams;
  const { ctx, theme, time } = env;
  const base = resolveColor(p.color, theme, theme.obstacle ?? '#6a625a');
  const ramp = rampOf(base, materialOf(p.material ?? 'stone'));
  const edgeCol = p.edge ? resolveColor(p.edge, theme) : withAlpha(ramp.outline, 0.9);
  const glowCol = resolveColor(p.glow, theme, '#caa860');
  const throatCol = resolveColor(p.throat, theme, '#0a0a0c');
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    const r = o.radius;
    const flick = 0.85 + 0.15 * Math.sin(time * 5 + o.pos.x);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Threshold apron: worn dust fanning from the mouth, seating it in the land.
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = shade(base, -0.35);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.3, r * 1.5, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // THE THROAT: underground black swallowing a rim-lifted edge — the hole
    // reads round because its rim remembers the daylight.
    const tg = ctx.createRadialGradient(0, r * 0.1, r * 0.12, 0, 0, r);
    tg.addColorStop(0, throatCol);
    tg.addColorStop(0.7, throatCol);
    tg.addColorStop(1, shade(throatCol, 0.3));
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // Torchlight from somewhere below, licking up the near throat wall.
    ctx.globalAlpha = 0.22 + 0.12 * flick;
    const gg = ctx.createRadialGradient(0, r * 0.3, 0, 0, r * 0.3, r * 0.85);
    gg.addColorStop(0, glowCol);
    gg.addColorStop(1, withAlpha(glowCol, 0));
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // The overhang's bite: a deep shadow arc under the top rim.
    ctx.strokeStyle = withAlpha('#000000', 0.5);
    ctx.lineWidth = r * 0.3;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.82, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke();
    // Stalactite fangs hanging into the opening.
    if (p.teeth && hash01(seed, 141) < 0.55) {
      const tc = p.teeth.color ? resolveColor(p.teeth.color, theme) : shade(base, -0.22);
      const n = 2 + (seed % 3);
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (1.2 + ((i + 0.5) / n) * 0.6) + (hash01(i, seed + 147) - 0.5) * 0.14;
        const bx = Math.cos(a) * r * 0.92, by = Math.sin(a) * r * 0.92;
        const len = r * (0.26 + hash01(i, seed + 151) * 0.22);
        const wid = r * (0.09 + hash01(i, seed + 157) * 0.05);
        ctx.fillStyle = tc;
        ctx.beginPath();
        ctx.moveTo(bx - wid, by);
        ctx.lineTo(bx + wid, by);
        ctx.lineTo(bx + (hash01(i, seed + 163) - 0.5) * wid, by + len);
        ctx.closePath();
        ctx.fill();
        // The fang's lit flank catches the interior glow.
        ctx.strokeStyle = withAlpha(glowCol, 0.28 * flick);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + wid * 0.6, by + len * 0.16);
        ctx.lineTo(bx + (hash01(i, seed + 163) - 0.5) * wid * 0.8, by + len * 0.88);
        ctx.stroke();
      }
    }
    // FORM ROLL: a browed arch of real stones, or a tumbled rockfall ring.
    const squash = 0.86 + hash01(seed, 3) * 0.14;
    const bodies: RockBody[] = [];
    if (hash01(seed, 91) < (p.tumble ?? 0.35)) {
      const n = 4 + (seed % 3);
      for (let i = 0; i < n; i++) {
        // Ring the top arc only — the approach side stays open.
        const a = Math.PI + ((i + 0.5) / n) * Math.PI + (hash01(i, seed + 27) - 0.5) * 0.22;
        const d = r * (0.94 + hash01(i, seed + 31) * 0.14);
        bodies.push({
          cx: Math.cos(a) * d, cy: Math.sin(a) * d * 0.92,
          r: r * (0.3 + hash01(i, seed + 37) * 0.18), seed: seed + i * 7 + 3, squash,
        });
      }
    } else {
      // One heavy brow over the crown, a jamb stone at each shoulder.
      bodies.push({ cx: 0, cy: -r * 0.82, r: r * 0.62, seed, squash: squash * 0.72 });
      bodies.push({ cx: -r * 0.92, cy: -r * 0.18, r: r * 0.4, seed: seed + 13, squash });
      bodies.push({ cx: r * 0.92, cy: -r * 0.18, r: r * 0.38, seed: seed + 29, squash });
    }
    for (const b of bodies) drawRockBody(ctx, b, ramp, edgeCol, 1, false);
    // Threshold rubble: what the mountain shed onto the doorstep.
    if (p.rubble && hash01(seed, 171) < 0.6) {
      const rc = p.rubble.color ? resolveColor(p.rubble.color, theme) : base;
      const n = 2 + (seed % 3);
      for (let i = 0; i < n; i++) {
        const a = Math.PI * 0.5 + (hash01(i, seed + 177) - 0.5) * 1.6;
        const d = r * (1.0 + hash01(i, seed + 181) * 0.35);
        ctx.fillStyle = shade(rc, hash01(i, seed + 187) * 0.3 - 0.2);
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d * 0.9,
          1.8 + hash01(i, seed + 191) * 2.6, 1.4 + hash01(i, seed + 193) * 1.8,
          a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Hanging growth over the lip — only where the biome grows any.
    if (p.vines && hash01(seed, 201) < 0.45) {
      const vc = resolveColorOpt(p.vines.color, theme);
      if (vc) {
        ctx.strokeStyle = withAlpha(vc, 0.75);
        ctx.lineCap = 'round';
        const n = 3 + (seed % 3);
        for (let i = 0; i < n; i++) {
          const a = Math.PI * (1.14 + ((i + 0.5) / n) * 0.72);
          const bx = Math.cos(a) * r * 0.98, by = Math.sin(a) * r * 0.98;
          const len = r * (0.3 + hash01(i, seed + 207) * 0.34);
          const sway = Math.sin(time * 0.8 + i * 2.1 + seed) * r * 0.03;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx + sway, by + len * 0.6, bx + sway * 1.6, by + len);
          ctx.stroke();
          ctx.fillStyle = withAlpha(vc, 0.75);
          ctx.beginPath();
          ctx.arc(bx + sway * 1.6, by + len, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    if (p.label && labelRevealed(env, o.pos)) {
      ctx.fillStyle = '#d8d4c8';
      ctx.font = '11px Verdana';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, 0, r + 14);
    }
    ctx.restore();
  }
};

/** Campfires + braziers: a fire-ring of jittered stones (or an iron bowl,
 *  params.bowl) round a char bed and crossed ember-cracked logs, petal flame
 *  licks wheeling over a molten core, live ember motes spiraling off — and a
 *  warm ground halo that CLIPS to the lit polygon (vis/sight.ts), so the glow
 *  pools against a wall instead of melting into or through it. */
const campfire: GroupPainter = (env, group, def) => {
  const { ctx, world, time, theme } = env;
  const p = (def.params ?? {}) as { bowl?: boolean; flame?: ColorSpec };
  // FLAME family: one param retints the whole fire (halo, licks, core, embers)
  // — soulfire braziers, witch-lights. Unset = the classic warm hexes verbatim.
  const fl = p.flame ? resolveColor(p.flame, theme) : null;
  const F = (dflt: string, lift: number): string => (fl ? shade(fl, lift) : dflt);
  for (const o of group) {
    const R = o.radius;
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    const flick = 0.82 + 0.12 * Math.sin(time * 11 + o.pos.x * 0.7)
      + 0.06 * Math.sin(time * 23.7 + o.pos.y);
    // Warm ground halo, pooled at the walls.
    const haloR = R * 2.3;
    const poly = litPolygon(world, o.pos.x, o.pos.y, haloR);
    ctx.save();
    if (poly) ctx.clip(polygonPath(poly));
    const g = ctx.createRadialGradient(o.pos.x, o.pos.y, R * 0.3, o.pos.x, o.pos.y, haloR * flick);
    g.addColorStop(0, withAlpha(F('#ffae52', 0.12), 0.26 * flick));
    g.addColorStop(0.6, withAlpha(F('#ff8838', 0), 0.12 * flick));
    g.addColorStop(1, withAlpha(F('#ff8838', 0), 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, haloR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (p.bowl) {
      // The brazier: an iron fire-bowl — dark basin, riveted rim.
      ctx.fillStyle = '#1c1a18';
      ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, R * 1.02, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4a4440';
      ctx.lineWidth = Math.max(2, R * 0.22);
      ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, R * 0.92, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#5c5650';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        ctx.beginPath();
        ctx.arc(o.pos.x + Math.cos(a) * R * 0.92, o.pos.y + Math.sin(a) * R * 0.92,
          R * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // The fire-ring: tone-jittered stones, each its own shape and set.
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + hash01(i, seed) * 0.5;
        const sr = R * (0.17 + hash01(i, seed + 3) * 0.09);
        const sx = o.pos.x + Math.cos(a) * R * 0.98, sy = o.pos.y + Math.sin(a) * R * 0.98;
        ctx.fillStyle = shade('#6a6058', (hash01(i, seed + 5) - 0.5) * 0.3);
        ctx.beginPath();
        ctx.ellipse(sx, sy, sr * 1.2, sr, a, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = withAlpha('#241f1a', 0.7);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // Char bed + crossed logs, ember cracks glowing along them.
      ctx.fillStyle = '#241d16';
      ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, R * 0.72, 0, Math.PI * 2); ctx.fill();
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI + 0.35 + hash01(i, seed + 9) * 0.3;
        ctx.strokeStyle = '#3a2c1e';
        ctx.lineWidth = Math.max(2.5, R * 0.2);
        ctx.beginPath();
        ctx.moveTo(o.pos.x - Math.cos(a) * R * 0.58, o.pos.y - Math.sin(a) * R * 0.58);
        ctx.lineTo(o.pos.x + Math.cos(a) * R * 0.58, o.pos.y + Math.sin(a) * R * 0.58);
        ctx.stroke();
        ctx.strokeStyle = withAlpha(F('#ff6a2a', -0.08), 0.4 + 0.4 * flick);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(o.pos.x - Math.cos(a) * R * 0.3, o.pos.y - Math.sin(a) * R * 0.3);
        ctx.lineTo(o.pos.x + Math.cos(a) * R * 0.34, o.pos.y + Math.sin(a) * R * 0.34);
        ctx.stroke();
      }
    }
    // The flame: petal licks wheeling round a molten core (top-down).
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + time * (0.8 + (i % 2) * 0.35);
      const lick = 0.55 + 0.45 * Math.sin(time * 9 + i * 2.1);
      const lr = R * (0.26 + 0.28 * lick) * flick;
      const lx = o.pos.x + Math.cos(a) * R * 0.22, ly = o.pos.y + Math.sin(a) * R * 0.22;
      ctx.globalAlpha = 0.5 + 0.3 * lick;
      ctx.fillStyle = i % 2 ? F('#ff8838', 0) : F('#ffb84a', 0.18);
      ctx.beginPath();
      ctx.ellipse(lx, ly, lr, lr * 0.62, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = F('#ffd24a', 0.35);
    ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, R * 0.3 * flick, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = withAlpha(F('#fff4c8', 0.75), 0.9);
    ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, R * 0.15 * flick, 0, Math.PI * 2); ctx.fill();
    // Live embers: motes spiral off the fire and die (deterministic phases).
    for (let i = 0; i < 6; i++) {
      const phase = (time * (0.35 + hash01(i, seed + 21) * 0.25) + i / 6) % 1;
      const ea = hash01(i, seed + 17) * Math.PI * 2 + time * 0.4 + phase * 1.8;
      const ed = R * (0.35 + phase * 1.5);
      ctx.globalAlpha = (1 - phase) * (0.55 + 0.35 * flick);
      ctx.fillStyle = phase < 0.4 ? F('#ffc25e', 0.25) : F('#ff7a3a', -0.02);
      ctx.beginPath();
      ctx.arc(o.pos.x + Math.cos(ea) * ed, o.pos.y + Math.sin(ea) * ed,
        1.1 + (1 - phase) * 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
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

export interface VineMatParams {
  /** The tangle bed the weave sits on. */
  mat?: ColorSpec;
  /** Creeper strand stroke (a darker sibling alternates). */
  strand?: ColorSpec;
  /** Leaf fill (the lit tone derives). */
  leaf?: ColorSpec;
  /** Chance-rolled blooms riding the weave — pure data accent. */
  bloom?: { color: ColorSpec; chance?: number };
}

/** A VINE MAT — the jungle wall you fire through: a lobed tangle bed, a
 *  woven ring of creeper strands with tendrils curling out past the rim,
 *  leaf pairs riding the weave. Replaces the last flat gradient-disc look
 *  (a single liquid disc drew the thicket's mat as a geometric circle).
 *  Seeded per disc so no two mats repeat; fully static, so bakeWhole blits
 *  it — tendril reach stays inside the bake frame (≤ 1.6 × radius). */
const vineMat: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as VineMatParams;
  const { ctx, theme } = env;
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    const mat = resolveColor(p.mat, theme, '#1f3a1c');
    const strand = resolveColor(p.strand, theme, '#3a6428');
    const leaf = resolveColor(p.leaf, theme, '#4a7a30');
    const leafLit = shade(leaf, 0.2);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    if (o.rot !== undefined) ctx.rotate(o.rot);
    // The tangle bed: a lobed dark mass — never a geometric circle.
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = mat;
    ctx.beginPath();
    const lobes = 9;
    for (let k = 0; k <= lobes; k++) {
      const a = (k / lobes) * Math.PI * 2;
      const rr = r * (0.72 + 0.2 * Math.abs(Math.sin(a * 2.7 + seed % 7)) + hash01(k % lobes, seed) * 0.1);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.quadraticCurveTo(Math.cos(a - 0.35) * rr * 1.14, Math.sin(a - 0.35) * rr * 1.14, x, y);
    }
    ctx.closePath();
    ctx.fill();
    // Shadowed heart — depth under the weave.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = shade(mat, -0.4);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
    // THE WEAVE: creeper strands looping through the mat, the first two
    // escaping the rim as curling tendrils (the tangle's proof it GROWS).
    ctx.globalAlpha = 1;
    ctx.lineCap = 'round';
    const strands = 5 + (seed % 2);
    for (let i = 0; i < strands; i++) {
      const a0 = (i / strands) * Math.PI * 2 + hash01(i, seed + 3) * 1.2;
      const esc = i < 2;
      const reach = r * (esc ? 1.2 + hash01(i, seed + 5) * 0.25 : 0.8 + hash01(i, seed + 5) * 0.15);
      const cx = Math.cos(a0 + 1.1) * r * (0.65 + hash01(i, seed + 7) * 0.3);
      const cy = Math.sin(a0 + 1.1) * r * (0.65 + hash01(i, seed + 9) * 0.3);
      ctx.strokeStyle = i % 2 ? strand : shade(strand, -0.18);
      ctx.lineWidth = Math.max(1.4, r * 0.07);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a0 + 2.4) * r * 0.4, Math.sin(a0 + 2.4) * r * 0.4);
      ctx.quadraticCurveTo(cx, cy, Math.cos(a0) * reach, Math.sin(a0) * reach);
      ctx.stroke();
      if (esc) {
        // The tendril CURL: a hook spiraling off the strand's end.
        ctx.lineWidth = Math.max(1, r * 0.045);
        ctx.beginPath();
        ctx.arc(Math.cos(a0) * reach + Math.cos(a0 + 1.2) * r * 0.09,
          Math.sin(a0) * reach + Math.sin(a0 + 1.2) * r * 0.09,
          r * 0.09, a0 - 2.6, a0 + 1.8);
        ctx.stroke();
      }
    }
    // Leaf pairs riding the weave (+ chance-rolled blooms).
    const leaves = 9 + (seed % 4);
    for (let i = 0; i < leaves; i++) {
      const a = hash01(i, seed + 17) * Math.PI * 2;
      const dd = r * (0.3 + hash01(i, seed + 19) * 0.62);
      const lx = Math.cos(a) * dd, ly = Math.sin(a) * dd;
      const rot = hash01(i, seed + 23) * Math.PI * 2;
      const lr = r * (0.1 + hash01(i, seed + 29) * 0.06);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = i % 3 ? leaf : leafLit;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(lx + Math.cos(rot + s * 0.9) * lr, ly + Math.sin(rot + s * 0.9) * lr,
          lr, lr * 0.45, rot + s * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p.bloom && hash01(i, seed + 31) < (p.bloom.chance ?? 0.12)) {
        ctx.fillStyle = resolveColor(p.bloom.color, theme);
        ctx.beginPath();
        ctx.arc(lx, ly, Math.max(1.2, lr * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

export interface BrushParams {
  color?: ColorSpec;
  /** DISCRETE LEAF OVERLAY: pointed ovals with midribs scattered over the
   *  lobes — the high-frequency texture tree crowns deliberately LACK, so a
   *  bush clumped against a canopy still reads as a bush. Count multiplier
   *  (default 1; 0 disables). */
  leaves?: number;
  /** Woody sprigs poking through the silhouette (default on). */
  sprigs?: boolean;
  /** Berry clusters: chance-rolled per bush (chance defaults to 0.55). */
  berries?: { color: ColorSpec; chance?: number };
}

/** A TRUE BUSH — overlapping scallop-edged leaf lobes with vein strokes,
 *  sun-side highlights and a shadowed heart you can vanish into, finished
 *  with DISCRETE LEAVES, poking sprigs and (sometimes) berries. Reads LEAFY
 *  and LOW at a glance: never a bog, never a slime — and never a canopy. */
const brush: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as BrushParams;
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
    // WOODY SPRIGS: thin twigs breaking the silhouette — proof of a shrub's
    // branching body under the leaves (crowns float; bushes GROW).
    if (p.sprigs !== false) {
      ctx.strokeStyle = withAlpha('#4a3a24', 0.75);
      ctx.lineCap = 'round';
      const sprigs = 3 + (seed % 3);
      for (let i = 0; i < sprigs; i++) {
        const a = (i / sprigs) * Math.PI * 2 + hash01(i, seed + 31) * 1.2;
        const r0 = b.radius * 0.45, r1 = b.radius * (0.98 + hash01(i, seed + 37) * 0.18);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        const ex = Math.cos(a) * r1, ey = Math.sin(a) * r1;
        ctx.quadraticCurveTo(Math.cos(a + 0.12) * r1 * 0.7, Math.sin(a + 0.12) * r1 * 0.7, ex, ey);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + Math.cos(a + 0.9) * b.radius * 0.12, ey + Math.sin(a + 0.9) * b.radius * 0.12);
        ctx.stroke();
      }
    }
    // THE LEAF OVERLAY: discrete pointed ovals with midribs, angled outward —
    // the detail frequency that separates a shrub from a distant crown.
    const leafMul = p.leaves ?? 1;
    if (leafMul > 0) {
      const n = Math.round((7 + (seed % 5)) * leafMul * Math.min(1.6, b.radius / 22));
      for (let i = 0; i < n; i++) {
        const a = hash01(i, seed + 41) * Math.PI * 2;
        const d = b.radius * (0.3 + Math.sqrt(hash01(i, seed + 43)) * 0.62);
        const lx = Math.cos(a) * d, ly = Math.sin(a) * d;
        const la = a + (hash01(i, seed + 47) - 0.5) * 0.9; // points outward-ish
        const len = b.radius * (0.24 + hash01(i, seed + 53) * 0.14);
        const wid = len * 0.42;
        const tone = i % 3 === 0 ? lobeLight : i % 3 === 1 ? base : shade(base, -0.1);
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(la);
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.5, -wid, len, 0);
        ctx.quadraticCurveTo(len * 0.5, wid, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = withAlpha(shade(tone, 0.3), 0.7);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(len * 0.08, 0);
        ctx.lineTo(len * 0.9, 0);
        ctx.stroke();
        ctx.restore();
      }
    }
    // BERRIES: bright clustered dots with a glint — the forager's tell.
    if (p.berries && hash01(seed, 61) < (p.berries.chance ?? 0.55)) {
      const bc = resolveColor(p.berries.color, theme, '#c8425a');
      const clusters = 2 + (seed % 2);
      for (let c = 0; c < clusters; c++) {
        const a = hash01(c, seed + 67) * Math.PI * 2;
        const d = b.radius * (0.34 + hash01(c, seed + 71) * 0.34);
        const cx = Math.cos(a) * d, cy = Math.sin(a) * d;
        const dots = 3 + ((seed + c) % 3);
        for (let k = 0; k < dots; k++) {
          const ka = hash01(k, seed + c * 7 + 73) * Math.PI * 2;
          const kd = hash01(k, seed + c * 7 + 79) * b.radius * 0.12;
          const bx = cx + Math.cos(ka) * kd, by = cy + Math.sin(ka) * kd;
          const br = 1.3 + hash01(k, seed + c + 83) * 0.9;
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = k % 3 ? bc : shade(bc, -0.18);
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

/** A FERN CLUMP — arching fronds of paired leaflets shrinking to the tip,
 *  swaying on a slow breath. The understory's OWN silhouette: feathery where
 *  bushes are lobed and grass is bladed — three floras, three reads. */
const fern: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec };
  const { ctx, theme, time } = env;
  const base = resolveColor(p.color, theme, theme.tree ?? '#2c4424');
  ctx.lineCap = 'round';
  for (const o of group) {
    const seed = ((o.pos.x * 19 + o.pos.y * 7) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    if (o.rot !== undefined) ctx.rotate(o.rot);
    // A dark rooting heart so the clump sits in the ground.
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = shade(base, -0.45);
    ctx.beginPath();
    ctx.arc(0, 0, o.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    const fronds = 5 + (seed % 3);
    for (let i = 0; i < fronds; i++) {
      const a = (i / fronds) * Math.PI * 2 + hash01(i, seed) * 0.7;
      const len = o.radius * (0.72 + hash01(i, seed + 5) * 0.36);
      const sway = Math.sin(time * 1.3 + o.pos.x * 0.03 + i * 1.9) * 0.1;
      const tone = i % 2 ? base : shade(base, 0.14);
      // The rachis: a curved spine bowing outward.
      const steps = 6;
      let px = 0, py = 0;
      const pts: { x: number; y: number; t: number }[] = [{ x: 0, y: 0, t: 0 }];
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const ang = a + sway + t * 0.5 * (hash01(i, seed + 9) - 0.5);
        px = Math.cos(ang) * len * t;
        py = Math.sin(ang) * len * t;
        pts.push({ x: px, y: py, t });
      }
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = shade(tone, -0.2);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      pts.forEach((q, qi) => { if (qi === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); });
      ctx.stroke();
      // Paired leaflets, longest mid-frond, vanishing at the tip.
      ctx.strokeStyle = tone;
      for (let s = 1; s < steps; s++) {
        const q = pts[s], q2 = pts[s + 1];
        const da = Math.atan2(q2.y - q.y, q2.x - q.x);
        const ll = len * 0.16 * Math.sin(Math.PI * Math.min(1, q.t + 0.15)) * (1 - q.t * 0.4);
        ctx.lineWidth = 1.1;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(q.x + Math.cos(da + side * 1.15) * ll, q.y + Math.sin(da + side * 1.15) * ll);
          ctx.stroke();
        }
      }
      // An unfurling fiddlehead on the youngest frond.
      if (i === fronds - 1) {
        ctx.strokeStyle = shade(tone, 0.24);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1.6, len * 0.07), 0, Math.PI * 1.5);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

/** THE BUTTRESS ROOT — a great tree's anchor fins heaved out of the loam:
 *  4-6 tapered woody blades radiating from a low heart, each a curved wedge
 *  with a sun-keyed ridge highlight, bark seams along the flanks, and moss
 *  eating the shade side. The jungle's low solid (blocks feet, not arrows) —
 *  and any future mangrove/swamp giant says different params. */
const buttressRoot: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { bark?: ColorSpec; moss?: ColorSpec };
  const { ctx, theme } = env;
  const bark = resolveColor(p.bark, theme, '#4a3a24');
  const moss = resolveColor(p.moss, theme, theme.tree ?? '#2c4424');
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 29) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? hash01(seed, 1) * Math.PI * 2);
    // The heart: a low rounded stump-knee the fins grow from.
    ctx.fillStyle = shade(bark, -0.3);
    ctx.beginPath();
    ctx.arc(0, 0, o.radius * 0.34, 0, Math.PI * 2);
    ctx.fill();
    const fins = 4 + (seed % 3);
    for (let i = 0; i < fins; i++) {
      const a = (i / fins) * Math.PI * 2 + hash01(i, seed + 3) * 0.5;
      const len = o.radius * (0.8 + hash01(i, seed + 7) * 0.35);
      const half = 0.34 + hash01(i, seed + 11) * 0.12; // fin's angular half-width at the heart
      const bow = (hash01(i, seed + 13) - 0.5) * 0.5;  // each blade leans its own way
      const tipA = a + bow * 0.4;
      const tip = { x: Math.cos(tipA) * len, y: Math.sin(tipA) * len };
      const bl = { x: Math.cos(a - half) * o.radius * 0.3, y: Math.sin(a - half) * o.radius * 0.3 };
      const br = { x: Math.cos(a + half) * o.radius * 0.3, y: Math.sin(a + half) * o.radius * 0.3 };
      // Sun-keyed faces: the fin's two flanks read as lit + shaded wood.
      const litSide = Math.cos(a - Math.PI * 0.75) > 0 ? 0.16 : -0.1;
      ctx.fillStyle = shade(bark, litSide);
      ctx.beginPath();
      ctx.moveTo(bl.x, bl.y);
      ctx.quadraticCurveTo((bl.x + tip.x) * 0.5 + Math.cos(a + Math.PI / 2) * bow * len * 0.5,
        (bl.y + tip.y) * 0.5 + Math.sin(a + Math.PI / 2) * bow * len * 0.5, tip.x, tip.y);
      ctx.quadraticCurveTo((br.x + tip.x) * 0.55, (br.y + tip.y) * 0.55, br.x, br.y);
      ctx.closePath();
      ctx.fill();
      // The ridge line: a bright spine along the blade's crest.
      ctx.strokeStyle = shade(bark, 0.28);
      ctx.lineWidth = 1.1;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo((bl.x + br.x) * 0.5, (bl.y + br.y) * 0.5);
      ctx.lineTo(tip.x * 0.94, tip.y * 0.94);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Moss creeps up the shade flank of the older fins.
      if (hash01(i, seed + 17) < 0.55) {
        ctx.fillStyle = moss;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(tip.x * 0.42 + Math.cos(a + Math.PI / 2) * 2, tip.y * 0.42 + Math.sin(a + Math.PI / 2) * 2,
          Math.max(1.6, o.radius * 0.12 * hash01(i, seed + 19) + 1.4), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }
};

// --- THE FUNGAL KIT -----------------------------------------------------------
// Mycelia's identity vocabulary: the floor is a NETWORK (hyphae with nutrient
// pulses traveling the strands), the walls grow SHELVES, and the fairy rings
// crowd with speckled TOADSTOOLS. Every color is a param — any biome can grow
// its own fungus by saying different words.

/** THE HYPHAL NETWORK — the mycelial mat as living tissue: a translucent loam
 *  wash, branching luminous filaments crawling out of each disc's heart, and
 *  bright PULSES traveling the strands — nutrients on the move. The fungal
 *  floor becomes a circuit you can read. */
const hyphae: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { base?: ColorSpec; strand?: ColorSpec; pulse?: ColorSpec };
  const { ctx, theme, time } = env;
  const baseCol = resolveColor(p.base, theme, '#6fae4a');
  const strandCol = resolveColor(p.strand, theme, '#9fd47a');
  const pulseCol = resolveColor(p.pulse, theme, '#d8ffb0');
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = shade(baseCol, -0.4);
  blobPath(ctx, group, 3);
  ctx.fill();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = baseCol;
  blobPath(ctx, group, -4);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  for (const d of group) {
    const seed = ((d.pos.x * 23 + d.pos.y * 9) | 0) >>> 0;
    const strands = Math.min(12, Math.max(4, Math.round(d.radius / 9)));
    for (let i = 0; i < strands; i++) {
      const a0 = (i / strands) * Math.PI * 2 + hash01(i, seed) * 0.8;
      const pts: { x: number; y: number }[] = [{
        x: d.pos.x + Math.cos(a0) * d.radius * 0.1,
        y: d.pos.y + Math.sin(a0) * d.radius * 0.1,
      }];
      let ang = a0;
      for (let s = 0; s < 3; s++) {
        ang += (hash01(i * 5 + s, seed + 7) - 0.5) * 0.9;
        pts.push({
          x: pts[s].x + Math.cos(ang) * d.radius * 0.27,
          y: pts[s].y + Math.sin(ang) * d.radius * 0.27,
        });
      }
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = strandCol;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      pts.forEach((q, qi) => { if (qi === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); });
      ctx.stroke();
      // One fork off the elbow, thinner.
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(pts[2].x, pts[2].y);
      ctx.lineTo(pts[2].x + Math.cos(ang + 1) * d.radius * 0.18,
        pts[2].y + Math.sin(ang + 1) * d.radius * 0.18);
      ctx.stroke();
      // THE PULSE: a bright nutrient packet sliding root-to-tip on its own clock.
      const cyc = (time * (0.22 + hash01(i, seed + 11) * 0.18) + hash01(i, seed + 13)) % 1;
      const fs = cyc * (pts.length - 1);
      const si = Math.min(pts.length - 2, Math.floor(fs));
      const ft = fs - si;
      const px = pts[si].x + (pts[si + 1].x - pts[si].x) * ft;
      const py = pts[si].y + (pts[si + 1].y - pts[si].y) * ft;
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = pulseCol;
      ctx.beginPath();
      ctx.arc(px, py, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(px, py, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
};

/** BRACKET SHELVES — half-disc fungal steps fanned off a woody heart, each
 *  growth-ringed like the tree it ate, rim-lit by a faint breathing glow. */
const shelfFungus: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; shelf?: ColorSpec; ring?: ColorSpec; glow?: ColorSpec };
  const { ctx, theme, time } = env;
  const wood = resolveColor(p.wood, theme, '#4a3626');
  const shelf = resolveColor(p.shelf, theme, '#c8a05a');
  const ring = resolveColor(p.ring, theme, '#8a6a3a');
  const glow = resolveColor(p.glow, theme, '#e8c87f');
  for (const o of group) {
    const seed = ((o.pos.x * 17 + o.pos.y * 5) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    if (o.rot !== undefined) ctx.rotate(o.rot);
    // The woody heart the shelves stepped out of.
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.arc(0, 0, o.radius * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(wood, -0.4), 0.8);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    const shelves = 3 + (seed % 3);
    const breathe = 0.5 + 0.5 * Math.sin(time * 1.4 + o.pos.x * 0.05);
    for (let i = 0; i < shelves; i++) {
      const a = (i / shelves) * Math.PI * 2 + hash01(i, seed) * 0.6;
      const sr = o.radius * (0.42 + hash01(i, seed + 5) * 0.24);
      const sx = Math.cos(a) * o.radius * 0.32, sy = Math.sin(a) * o.radius * 0.32;
      // The bracket: a D-shaped half-disc opening outward.
      ctx.fillStyle = shade(shelf, (hash01(i, seed + 9) - 0.5) * 0.2);
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr, sr * 0.66, a, -Math.PI / 2, Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = withAlpha(shade(shelf, -0.45), 0.8);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      // Growth bands following the rim.
      ctx.strokeStyle = withAlpha(ring, 0.7);
      ctx.lineWidth = 1;
      for (const f of [0.72, 0.45]) {
        ctx.beginPath();
        ctx.ellipse(sx, sy, sr * f, sr * f * 0.66, a, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      }
      // The lip's living glow.
      ctx.globalAlpha = 0.25 + 0.3 * breathe;
      ctx.strokeStyle = glow;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr * 0.94, sr * 0.62, a, -Math.PI / 2.4, Math.PI / 2.4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
};

/** A TOADSTOOL CLUMP — little speckled caps huddling two-to-four: the fairy
 *  ring's citizens. Cap tone jitters per cap; specks ring the crown. */
const toadstools: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { cap?: ColorSpec; speck?: ColorSpec };
  const { ctx, theme } = env;
  const cap = resolveColor(p.cap, theme, '#b8434e');
  const speck = resolveColor(p.speck, theme, '#f0e6d8');
  for (const o of group) {
    const seed = ((o.pos.x * 7 + o.pos.y * 19) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    const n = 2 + (seed % 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash01(i, seed) * 1.1;
      const d = i === 0 ? 0 : o.radius * (0.4 + hash01(i, seed + 3) * 0.3);
      const cr = o.radius * (0.3 + hash01(i, seed + 7) * 0.16);
      const cx = Math.cos(a) * d, cy = Math.sin(a) * d;
      // A true little DOME: bright pole falling to a shaded rim (the same
      // read as the giant caps, several sizes down), rimmed dark.
      const tone = shade(cap, (hash01(i, seed + 9) - 0.4) * 0.24);
      const L = VIS_CFG.lightAngle;
      const px = cx + Math.cos(L) * cr * 0.24, py = cy + Math.sin(L) * cr * 0.24;
      const dg = ctx.createRadialGradient(px, py, 0, cx, cy, cr);
      dg.addColorStop(0, shade(tone, 0.28));
      dg.addColorStop(0.6, tone);
      dg.addColorStop(1, shade(tone, -0.3));
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha(shade(cap, -0.5), 0.75);
      ctx.lineWidth = 1;
      ctx.stroke();
      // The warts.
      ctx.fillStyle = speck;
      const specks = 3 + ((seed + i) % 3);
      for (let k = 0; k < specks; k++) {
        const ka = hash01(k, seed + i * 11) * Math.PI * 2;
        const kd = Math.sqrt(hash01(k, seed + i * 13)) * cr * 0.7;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ka) * kd, cy + Math.sin(ka) * kd, 0.5 + cr * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
};

// --- THE FLESH KIT ------------------------------------------------------------
// The warren is ONE CREATURE, and everything here says so: membranes breathe
// and veins pulse to the SAME shared heartbeat, eye stalks track the hero,
// rib arches remember a tenant, tooth rows remember a mouth. All palette on
// params — any organic horror biome can borrow the vocabulary.

/** The warren's shared pulse: a lub-dub heartbeat on one clock — two beats
 *  per cycle, the second softer. Everything living here throbs to the SAME
 *  heart, which is the unsettling part. (Exported: the creep layer breathes
 *  on this clock too — one organism, one pulse.) */
export function heartbeat(t: number, rate = 0.85): number {
  const c = (t * rate) % 1;
  const beat = (at: number, w: number, amp: number): number => {
    const d = (c - at) / w;
    return amp * Math.exp(-d * d * 4);
  };
  return Math.min(1, beat(0.12, 0.09, 1) + beat(0.34, 0.11, 0.55));
}

/** LIVING MEMBRANE — a stretched skin sheet breathing to the shared
 *  heartbeat: striations radiating from a puckered sphincter heart, a welt
 *  rim, one wet sheen. Ground you'd rather not stand on. */
const membrane: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { skin?: ColorSpec; rim?: ColorSpec; stria?: ColorSpec };
  const { ctx, theme, time } = env;
  const skin = resolveColor(p.skin, theme, '#7a2a38');
  const rim = resolveColor(p.rim, theme, '#8a3848');
  const stria = resolveColor(p.stria, theme, '#4a0f1c');
  const hb = heartbeat(time);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = rim;
  blobPath(ctx, group, 3);
  ctx.fill();
  ctx.globalAlpha = 0.3 + 0.12 * hb; // the sheet TIGHTENS on the beat
  ctx.fillStyle = skin;
  blobPath(ctx, group, -3);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (const d of group) {
    const seed = ((d.pos.x * 27 + d.pos.y * 13) | 0) >>> 0;
    // Striations: stretched tissue fanning out of the pucker.
    ctx.strokeStyle = withAlpha(stria, 0.35);
    ctx.lineWidth = 1.2;
    const rays = Math.max(7, Math.round(d.radius / 7));
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + hash01(i, seed) * 0.4;
      const r0 = d.radius * 0.16, r1 = d.radius * (0.68 + hash01(i, seed + 5) * 0.2);
      ctx.beginPath();
      ctx.moveTo(d.pos.x + Math.cos(a) * r0, d.pos.y + Math.sin(a) * r0);
      ctx.quadraticCurveTo(
        d.pos.x + Math.cos(a + 0.14) * r1 * 0.6, d.pos.y + Math.sin(a + 0.14) * r1 * 0.6,
        d.pos.x + Math.cos(a) * r1, d.pos.y + Math.sin(a) * r1);
      ctx.stroke();
    }
    // The pucker: concentric wrinkle rings closing on a dark heart.
    ctx.strokeStyle = withAlpha(stria, 0.55);
    for (const f of [0.16, 0.11, 0.06]) {
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(d.pos.x, d.pos.y, d.radius * f * (1 + hb * 0.12), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = withAlpha('#2a060c', 0.8);
    ctx.beginPath();
    ctx.arc(d.pos.x, d.pos.y, d.radius * 0.035 + 1, 0, Math.PI * 2);
    ctx.fill();
    // One wet sheen arc.
    ctx.globalAlpha = 0.14 + 0.1 * hb;
    ctx.strokeStyle = '#f0c8cc';
    ctx.lineWidth = Math.max(1.4, d.radius * 0.05);
    ctx.beginPath();
    ctx.arc(d.pos.x, d.pos.y, d.radius * 0.5, VIS_CFG.lightAngle - 0.7, VIS_CFG.lightAngle + 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
};

/** VEIN CLUSTERS — vessels branching off a heart-node, the PULSE riding them
 *  outward on the same lub-dub the membranes breathe to. The floor has a
 *  circulatory system, and you can watch it work. */
const veins: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { vessel?: ColorSpec; pulse?: ColorSpec; node?: ColorSpec };
  const { ctx, theme, time } = env;
  const vessel = resolveColor(p.vessel, theme, '#5a1522');
  const pulseCol = resolveColor(p.pulse, theme, '#ff7a86');
  const nodeCol = resolveColor(p.node, theme, '#6a1a28');
  const hb = heartbeat(time);
  const cyc = (time * 0.85) % 1; // the front's travel clock — one heart, one wave
  ctx.lineCap = 'round';
  for (const d of group) {
    const seed = ((d.pos.x * 31 + d.pos.y * 7) | 0) >>> 0;
    const vesselsN = 4 + (seed % 3);
    const paths: { x: number; y: number }[][] = [];
    for (let i = 0; i < vesselsN; i++) {
      const a0 = (i / vesselsN) * Math.PI * 2 + hash01(i, seed) * 0.7;
      const pts: { x: number; y: number }[] = [{ x: d.pos.x, y: d.pos.y }];
      let ang = a0;
      for (let s = 0; s < 3; s++) {
        ang += (hash01(i * 7 + s, seed + 9) - 0.5) * 0.8;
        pts.push({
          x: pts[s].x + Math.cos(ang) * d.radius * 0.3,
          y: pts[s].y + Math.sin(ang) * d.radius * 0.3,
        });
      }
      paths.push(pts);
      // The vessel: thick near the node, tapering out, one fork.
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = vessel;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.stroke();
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(pts[2].x, pts[2].y);
      ctx.lineTo(pts[3].x, pts[3].y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pts[2].x, pts[2].y);
      ctx.lineTo(pts[2].x + Math.cos(ang + 1) * d.radius * 0.18,
        pts[2].y + Math.sin(ang + 1) * d.radius * 0.18);
      ctx.stroke();
    }
    // The heart-node, swelling on the beat.
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = nodeCol;
    ctx.beginPath();
    ctx.arc(d.pos.x, d.pos.y, d.radius * 0.13 * (1 + hb * 0.3), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = shade(nodeCol, 0.35);
    ctx.beginPath();
    ctx.arc(d.pos.x - d.radius * 0.03, d.pos.y - d.radius * 0.03, d.radius * 0.05, 0, Math.PI * 2);
    ctx.fill();
    // THE PULSE FRONT: each thump radiates node → tips along every vessel.
    for (let i = 0; i < paths.length; i++) {
      const pts = paths[i];
      const fs = cyc * (pts.length - 1);
      const si = Math.min(pts.length - 2, Math.floor(fs));
      const ft = fs - si;
      const px = pts[si].x + (pts[si + 1].x - pts[si].x) * ft;
      const py = pts[si].y + (pts[si + 1].y - pts[si].y) * ft;
      ctx.globalAlpha = 0.5 * hb + 0.08;
      ctx.fillStyle = pulseCol;
      ctx.beginPath();
      ctx.arc(px, py, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.14 * hb;
      ctx.beginPath();
      ctx.arc(px, py, 4.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
};

/** AN EYE STALK — the warren looks back: a fleshy nub whose iris TRACKS the
 *  hero live, blinking on its own clock, bloodshot at the edges. The flesh
 *  biome's signature "this place is one creature" tell. */
const eyeStalk: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { flesh?: ColorSpec; sclera?: ColorSpec; iris?: ColorSpec };
  const { ctx, theme, time, world } = env;
  const flesh = resolveColor(p.flesh, theme, '#8a3848');
  const sclera = resolveColor(p.sclera, theme, '#e8dcd0');
  const iris = resolveColor(p.iris, theme, '#d8b04a');
  const hero = world.player;
  for (const o of group) {
    const seed = ((o.pos.x * 9 + o.pos.y * 23) | 0) >>> 0;
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The stalk nub: stacked flesh rolls with wrinkle rings.
    ctx.fillStyle = shade(flesh, -0.12);
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(flesh, -0.5), 0.8);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = flesh;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(flesh, -0.4), 0.6);
    ctx.lineWidth = 1;
    for (const f of [0.86, 0.62]) {
      ctx.beginPath();
      ctx.arc(0, 0, r * f, 0.4, 2.4);
      ctx.stroke();
    }
    // The eye. Blink rides its own clock; the iris rides the hero.
    const blinkCyc = (time * 0.32 + hash01(seed, 5)) % 1;
    const lid = blinkCyc > 0.92 ? Math.sin(((blinkCyc - 0.92) / 0.08) * Math.PI) : 0;
    ctx.fillStyle = sclera;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Bloodshot squiggles creeping in from the rim.
    ctx.strokeStyle = withAlpha('#b83a42', 0.55);
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      const a = hash01(i, seed + 11) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.48, Math.sin(a) * r * 0.48);
      ctx.quadraticCurveTo(Math.cos(a + 0.3) * r * 0.36, Math.sin(a + 0.3) * r * 0.36,
        Math.cos(a + 0.1) * r * 0.26, Math.sin(a + 0.1) * r * 0.26);
      ctx.stroke();
    }
    // Iris + pupil, offset toward whoever's watching it back.
    const la = Math.atan2(hero.pos.y - o.pos.y, hero.pos.x - o.pos.x);
    const ix = Math.cos(la) * r * 0.16, iy = Math.sin(la) * r * 0.16;
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.arc(ix, iy, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#14080a';
    ctx.beginPath();
    ctx.arc(ix, iy, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = withAlpha('#ffffff', 0.85);
    ctx.beginPath();
    ctx.arc(ix - r * 0.06, iy - r * 0.07, r * 0.045, 0, Math.PI * 2);
    ctx.fill();
    // The lid: flesh sweeping over the eye mid-blink.
    if (lid > 0.02) {
      ctx.fillStyle = flesh;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.5 * (1 - lid), r * 0.52, r * 0.52 * lid, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

/** RIB ARCHES — the last tenant's cage jutting from the meat: paired bone
 *  hoops with knuckled ends, aged down the middle. */
const ribArch: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { bone?: ColorSpec; material?: string };
  const { ctx, theme } = env;
  const bone = resolveColor(p.bone, theme, '#d8cdb8');
  const ramp = rampOf(bone, materialOf(p.material ?? 'bone'));
  for (const o of group) {
    const seed = ((o.pos.x * 5 + o.pos.y * 17) | 0) >>> 0;
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    ctx.lineCap = 'round';
    const ribs = 2 + (seed % 2);
    for (let i = 0; i < ribs; i++) {
      const off = (i - (ribs - 1) / 2) * r * 0.62;
      const rr = r * (0.72 - Math.abs(i - (ribs - 1) / 2) * 0.14);
      const tone = shade(ramp.base, (hash01(i, seed) - 0.6) * 0.16);
      ctx.strokeStyle = tone;
      ctx.lineWidth = Math.max(3, r * 0.16);
      ctx.beginPath();
      ctx.arc(off, 0, rr, Math.PI * 0.82, Math.PI * 2.18);
      ctx.stroke();
      // Aged shadow along each hoop (the ramp's cool bone shadow).
      ctx.strokeStyle = withAlpha(ramp.shadow, 0.55);
      ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.beginPath();
      ctx.arc(off, r * 0.04, rr, Math.PI * 0.9, Math.PI * 2.1);
      ctx.stroke();
      // A lit crest where the hoop faces the sun.
      const L = VIS_CFG.lightAngle;
      ctx.strokeStyle = withAlpha(ramp.light, 0.55);
      ctx.lineWidth = Math.max(1, r * 0.045);
      ctx.beginPath();
      ctx.arc(off, -r * 0.03, rr, L - 0.55, L + 0.55);
      ctx.stroke();
      // Knuckled ends where the bone sinks back into the floor.
      ctx.fillStyle = shade(tone, 0.12);
      for (const ea of [Math.PI * 0.82, Math.PI * 2.18]) {
        ctx.beginPath();
        ctx.arc(off + Math.cos(ea) * rr, Math.sin(ea) * rr, Math.max(2, r * 0.1), 0, Math.PI * 2);
        ctx.fill();
      }
      // Weather cracks ticking across the hoop.
      if (hash01(i, seed + 73) < 0.45) {
        const ca = Math.PI * (1.1 + hash01(i, seed + 79) * 0.8);
        ctx.strokeStyle = withAlpha(ramp.outline, 0.5);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(off + Math.cos(ca) * (rr - r * 0.09), Math.sin(ca) * (rr - r * 0.09));
        ctx.lineTo(off + Math.cos(ca) * (rr + r * 0.09), Math.sin(ca) * (rr + r * 0.09));
        ctx.stroke();
      }
    }
    ctx.restore();
  }
};

/** A TOOTH ROW — enamel cones erupting along an arc of raw gum: the floor
 *  remembering it has a mouth somewhere. One is always cracked. */
const teethRow: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { gum?: ColorSpec; enamel?: ColorSpec; material?: string };
  const { ctx, theme } = env;
  const gum = resolveColor(p.gum, theme, '#6a1a28');
  const eRamp = rampOf(resolveColor(p.enamel, theme, '#e8e0d0'), materialOf(p.material ?? 'bone'));
  const enamel = eRamp.base;
  for (const o of group) {
    const seed = ((o.pos.x * 21 + o.pos.y * 3) | 0) >>> 0;
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // The gum bed: a raw ridge following the arc.
    const a0 = -Math.PI * 0.55, a1 = Math.PI * 0.55;
    ctx.strokeStyle = gum;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(5, r * 0.34);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.66, a0, a1);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(shade(gum, -0.4), 0.7);
    ctx.lineWidth = Math.max(1.4, r * 0.07);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, a0, a1);
    ctx.stroke();
    // The teeth: cones leaning inward, one of them cracked short.
    const teeth = 5 + (seed % 3);
    const cracked = seed % teeth;
    for (let i = 0; i < teeth; i++) {
      const a = a0 + ((i + 0.5) / teeth) * (a1 - a0);
      const bx = Math.cos(a) * r * 0.66, by = Math.sin(a) * r * 0.66;
      const len = r * (i === cracked ? 0.2 : 0.4 + hash01(i, seed) * 0.14);
      const wid = r * 0.13;
      const tx = bx - Math.cos(a) * len, ty = by - Math.sin(a) * len;
      ctx.fillStyle = i % 2 ? enamel : shade(enamel, -0.08);
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a + Math.PI / 2) * wid, by + Math.sin(a + Math.PI / 2) * wid);
      ctx.lineTo(bx - Math.cos(a + Math.PI / 2) * wid, by - Math.sin(a + Math.PI / 2) * wid);
      ctx.lineTo(tx, ty);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = withAlpha(eRamp.outline, 0.6);
      ctx.lineWidth = 0.9;
      ctx.stroke();
      if (i !== cracked) {
        ctx.strokeStyle = withAlpha(eRamp.highlight, 0.75);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx + Math.cos(a) * len * 0.2, ty + Math.sin(a) * len * 0.2);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
};

// THE CAUL KIT — the flesh kit's biomechanical sibling (the Giger key):
// hard black chitin where the warren is wet meat, cold violet light where
// the warren glows ember. Same shared heartbeat, same "all palette on
// params" contract — any invaded biome can borrow the vocabulary.

/** CHITIN FINS — angular black blade-plates heaved out of the ground in
 *  overlapping rows, glossed by the chitin material ramp: hell's bone
 *  replaced by something harder that grew on purpose. */
const chitinFin: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { plate?: ColorSpec; rim?: ColorSpec; material?: string };
  const { ctx, theme } = env;
  const ramp = rampOf(resolveColor(p.plate, theme, '#2c2136'), materialOf(p.material ?? 'chitin'));
  const rim = resolveColor(p.rim, theme, '#6a5478');
  for (const o of group) {
    const seed = ((o.pos.x * 17 + o.pos.y * 29) | 0) >>> 0;
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? (hash01(1, seed) - 0.5) * 0.9);
    const blades = 2 + (seed % 3);
    for (let i = 0; i < blades; i++) {
      const bx = (i - (blades - 1) / 2) * r * 0.62;
      const h = r * (0.85 + hash01(i, seed) * 0.5);
      const w = r * (0.34 + hash01(i, seed + 3) * 0.14);
      const lean = (hash01(i, seed + 7) - 0.5) * 0.5;
      // The blade: an angular sail — base chord, one hard back edge, a
      // notched leading edge (two facets so the light can pick a side).
      const tipX = bx + Math.sin(lean) * h * 0.6, tipY = -h;
      const notchX = bx + w * 0.55, notchY = -h * 0.45;
      ctx.fillStyle = i % 2 ? ramp.base : ramp.shadow;
      ctx.beginPath();
      ctx.moveTo(bx - w, 0);
      ctx.lineTo(bx - w * 0.5, -h * 0.3);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(notchX, notchY);
      ctx.lineTo(bx + w, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = withAlpha(ramp.outline, 0.85);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      // The lit facet: the leading edge catches the world's one light.
      ctx.fillStyle = withAlpha(ramp.highlight, 0.5);
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(notchX, notchY);
      ctx.lineTo(bx + w, 0);
      ctx.lineTo(bx + w * 0.72, 0);
      ctx.lineTo(notchX - w * 0.2, notchY + h * 0.06);
      ctx.closePath();
      ctx.fill();
      // One gloss streak down the back edge + the rim welt at the root.
      ctx.strokeStyle = withAlpha(ramp.highlight, 0.9);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.5, -h * 0.3);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.strokeStyle = withAlpha(rim, 0.5);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(bx - w, 0);
      ctx.lineTo(bx + w, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
};

/** THE BLACK UMBILIC — a great twisted cable rising out of frame, seen
 *  top-down: a coiled trunk of braided cords over a rootlet skirt, one dim
 *  ring of light where it meets the floor. It goes somewhere. Nobody asks. */
const umbilic: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { cord?: ColorSpec; rim?: ColorSpec; glow?: ColorSpec };
  const { ctx, theme, time } = env;
  const cord = resolveColor(p.cord, theme, '#241a2c');
  const rim = resolveColor(p.rim, theme, '#5a4468');
  const glow = resolveColor(p.glow, theme, '#8a6ab0');
  const hb = heartbeat(time, 0.6);
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 23) | 0) >>> 0;
    const r = o.radius;
    // Rootlet skirt: tapering cords gripping the floor.
    ctx.lineCap = 'round';
    const roots = 7 + (seed % 3);
    for (let i = 0; i < roots; i++) {
      const a = (i / roots) * Math.PI * 2 + hash01(i, seed) * 0.5;
      const len = r * (0.5 + hash01(i, seed + 4) * 0.45);
      ctx.strokeStyle = withAlpha(shade(cord, -0.15), 0.8);
      ctx.lineWidth = Math.max(2, r * 0.09);
      ctx.beginPath();
      ctx.moveTo(o.pos.x + Math.cos(a) * r * 0.7, o.pos.y + Math.sin(a) * r * 0.7);
      ctx.quadraticCurveTo(
        o.pos.x + Math.cos(a + 0.2) * r * 1.05, o.pos.y + Math.sin(a + 0.2) * r * 1.05,
        o.pos.x + Math.cos(a + 0.12) * (r * 0.7 + len), o.pos.y + Math.sin(a + 0.12) * (r * 0.7 + len));
      ctx.stroke();
    }
    // The trunk: stacked discs darkening inward (a column read from above).
    for (const [f, t] of [[1, -0.2], [0.82, 0], [0.62, 0.1], [0.4, 0.22]] as const) {
      ctx.fillStyle = shade(cord, t);
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y, r * f, 0, Math.PI * 2);
      ctx.fill();
    }
    // The braid: spiral cords wound around the trunk — phase creeps so the
    // cable is ALIVE, far too slowly to ever catch it moving.
    const twist = time * 0.03 + hash01(3, seed) * 6;
    ctx.strokeStyle = withAlpha(rim, 0.4);
    ctx.lineWidth = Math.max(1.4, r * 0.07);
    for (let i = 0; i < 4; i++) {
      const a = twist + (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y, r * 0.72, a, a + 1.1);
      ctx.stroke();
    }
    // The floor weld: a dim pulse ring — the cable is a vessel, and it's on.
    ctx.strokeStyle = withAlpha(glow, 0.16 + 0.1 * hb);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, r * 0.95, 0, Math.PI * 2);
    ctx.stroke();
    // Rim light on the lit side.
    ctx.strokeStyle = withAlpha(rim, 0.7);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, r * 0.99, VIS_CFG.lightAngle - 1.1, VIS_CFG.lightAngle + 0.9);
    ctx.stroke();
  }
};

/** THE MAW PIT — an orifice in the floor: a dark gullet ringed by inward
 *  teeth, breathing on the shared heartbeat. The doodad-effect maw_reel is
 *  the verb; this is the face it wears. */
const mawPit: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { gum?: ColorSpec; enamel?: ColorSpec; gullet?: ColorSpec };
  const { ctx, theme, time } = env;
  const gum = resolveColor(p.gum, theme, '#4a2438');
  const eRamp = rampOf(resolveColor(p.enamel, theme, '#c8bfae'), materialOf('bone'));
  const gullet = resolveColor(p.gullet, theme, '#0a060e');
  const hb = heartbeat(time, 0.7);
  for (const o of group) {
    const seed = ((o.pos.x * 19 + o.pos.y * 11) | 0) >>> 0;
    const r = o.radius * (1 + hb * 0.035); // the gape breathes
    // The lip: a raw welt ring bedding the pit into the floor.
    ctx.fillStyle = withAlpha(gum, 0.55);
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, r * 1.12, 0, Math.PI * 2);
    ctx.fill();
    // The gullet: down, and down.
    const g = ctx.createRadialGradient(o.pos.x, o.pos.y, r * 0.1, o.pos.x, o.pos.y, r);
    g.addColorStop(0, gullet);
    g.addColorStop(0.65, shade(gum, -0.45));
    g.addColorStop(1, gum);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, r, 0, Math.PI * 2);
    ctx.fill();
    // The teeth: cones leaning INTO the hole, staggered heights, one gap
    // (every mouth has a story).
    const teeth = 9 + (seed % 4);
    const gap = seed % teeth;
    for (let i = 0; i < teeth; i++) {
      if (i === gap) continue;
      const a = (i / teeth) * Math.PI * 2 + hash01(i, seed) * 0.14;
      const bx = o.pos.x + Math.cos(a) * r * 0.94, by = o.pos.y + Math.sin(a) * r * 0.94;
      const len = r * (0.3 + hash01(i, seed + 5) * 0.18);
      const wid = r * 0.09;
      const tx = bx - Math.cos(a) * len, ty = by - Math.sin(a) * len;
      ctx.fillStyle = i % 2 ? eRamp.base : eRamp.shadow;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a + Math.PI / 2) * wid, by + Math.sin(a + Math.PI / 2) * wid);
      ctx.lineTo(bx - Math.cos(a + Math.PI / 2) * wid, by - Math.sin(a + Math.PI / 2) * wid);
      ctx.lineTo(tx, ty);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = withAlpha(eRamp.outline, 0.5);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    // One wet sheen on the lit inner wall.
    ctx.globalAlpha = 0.16 + 0.1 * hb;
    ctx.strokeStyle = '#d8c8dc';
    ctx.lineWidth = Math.max(1.6, r * 0.07);
    ctx.beginPath();
    ctx.arc(o.pos.x, o.pos.y, r * 0.72, VIS_CFG.lightAngle - 0.8, VIS_CFG.lightAngle + 0.6);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
};

/** HEAT SHIMMER — wavering desert air: rising serpentine heat-lines and a
 *  faint hot lens over the ground. Barely-there by design; the sunscorch
 *  stacks it feeds are the teeth (World.updateHeat). */
const shimmer: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec };
  const { ctx, time } = env;
  const col = resolveColor(p.color, env.theme, '#ffe8c0');
  // The hot lens: a soft warm wash that marks the field's true extent —
  // constant falloff, so it bakes once and blits per disc.
  const lens = alphaDiscSprite(col, [[0, 0.11], [0.2, 0.11], [1, 0]], 'lens');
  for (const d of group) {
    ctx.globalAlpha = 1;
    ctx.drawImage(lens, d.pos.x - d.radius, d.pos.y - d.radius, d.radius * 2, d.radius * 2);
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
  // Bed + worn center (the two-pass rim/core). A 'path'-blended kind draws
  // both as ROUND-CAPPED BANDS through the chain (pathBand) — one continuous
  // road, never a caterpillar of discs; other users keep the blob fill.
  const band = def.blend?.mode === 'path';
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = base;
  ctx.strokeStyle = base;
  if (band) pathBand(ctx, group); else { blobPath(ctx, group); ctx.fill(); }
  ctx.globalAlpha = 0.45;
  const worn = shade(base, 0.16);
  ctx.fillStyle = worn;
  ctx.strokeStyle = worn;
  if (band) pathBand(ctx, group, -7); else { blobPath(ctx, group, -7); ctx.fill(); }
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

/** CROWD ROW — a bench of spectators on the colosseum stands, facing `rot`
 *  (the pit): two staggered ranks of heads over a bench strip, every head
 *  bobbing on its own beat, torches of excitement in the theme's accent.
 *  Respects `wilt` (the transient fade — the stands EMPTY when the crown
 *  falls: rows sink and thin as their ttl runs). Params: bench, skins[],
 *  garb[], accent. */
const crowdRow: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { bench?: string; skins?: string[]; garb?: string[]; accent?: string };
  const { ctx, theme, time } = env;
  const bench = resolveColor(p.bench, theme, '#4a3f30');
  const skins = p.skins ?? ['#d8b090', '#c89a74', '#a87858', '#8a6248'];
  const garb = p.garb ?? ['#7a4a3a', '#5a6a44', '#4a5a7a', '#7a6a3a', '#6a4a6a'];
  const accent = resolveColor(p.accent, theme, '#e8c85a');
  for (const o of group) {
    const seed = ((o.pos.x * 19 + o.pos.y * 3) | 0) >>> 0;
    const R = o.radius;
    const fade = 1 - (o.wilt ?? 0);          // the dispersal: rows thin + sink
    if (fade <= 0.02) continue;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate((o.rot ?? 0) + Math.PI / 2);  // bench runs perpendicular to the facing
    ctx.globalAlpha = 0.85 * fade;
    // The bench strip.
    ctx.fillStyle = bench;
    ctx.fillRect(-R, -R * 0.16, R * 2, R * 0.34);
    // Two staggered ranks of heads, bobbing (the near rank leans toward the pit).
    for (let rank = 0; rank < 2; rank++) {
      const n = 4 - rank;
      for (let i = 0; i < n; i++) {
        const hx = -R + R * 2 * ((i + 0.5 + rank * 0.5) / (n + rank * 0.5));
        const phase = hash01(i + rank * 7, seed) * Math.PI * 2;
        const bob = Math.sin(time * (1.6 + hash01(i, seed + 5) * 1.2) + phase) * 1.6;
        const hy = -R * 0.3 - rank * R * 0.34 + bob * fade + (1 - fade) * R * 0.5;
        const hr = R * (0.13 + hash01(i + rank * 3, seed + 9) * 0.035);
        ctx.globalAlpha = (rank === 0 ? 0.95 : 0.8) * fade;
        // Garb (shoulders) then the head.
        ctx.fillStyle = garb[(seed + i * 5 + rank * 11) % garb.length];
        ctx.beginPath(); ctx.ellipse(hx, hy + hr * 0.9, hr * 1.4, hr * 0.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = skins[(seed + i * 7 + rank * 13) % skins.length];
        ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
      }
    }
    // A raised favor now and then — the crowd's colors catching light.
    if (hash01(3, seed) > 0.55) {
      const wave = Math.sin(time * 2.2 + seed * 0.2);
      ctx.globalAlpha = (0.4 + 0.3 * wave) * fade;
      ctx.fillStyle = accent;
      ctx.fillRect(-R * 0.1, -R * 0.72 - wave * 2, R * 0.2, R * 0.3);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
};

/** LEY CHANNEL — a flowing energy conduit underfoot (the leyline kit): a dark
 *  groove, a bright CORE line whose dashes stream along the channel (animated
 *  dashOffset — the current visibly FLOWS), soft side-glow. Faces its `rot`
 *  (formations lay chains with rot:'chain', so runs read as one leyline).
 *  Params: color (the element — author 'theme:accent' and every themed face
 *  tints it free), depth (groove tone). */
const leyLine: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: string; depth?: string };
  const { ctx, theme, time } = env;
  const col = resolveColor(p.color, theme, '#60d0ff');
  const depth = resolveColor(p.depth, theme, '#05080c');
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 31) | 0) >>> 0;
    const R = o.radius;
    const L = R * 2.2, W = Math.max(6, R * 0.34);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // The groove: a dark bed the current runs in.
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = depth;
    ctx.beginPath(); ctx.ellipse(0, 0, L / 2, W, 0, 0, Math.PI * 2); ctx.fill();
    // Side-glow pooling out of the channel.
    const grad = ctx.createRadialGradient(0, 0, W * 0.4, 0, 0, L * 0.52);
    grad.addColorStop(0, withAlpha(col, 0.16));
    grad.addColorStop(1, withAlpha(col, 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(0, 0, L * 0.52, W * 2.1, 0, 0, Math.PI * 2); ctx.fill();
    // The current: a streaming dashed core + a faint steady rail.
    ctx.strokeStyle = withAlpha(col, 0.35);
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.lineTo(L / 2, 0); ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([9, 13]);
    ctx.lineDashOffset = -time * 34 - (seed % 22); // the flow (seed staggers runs)
    ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.lineTo(L / 2, 0); ctx.stroke();
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
    // Breathing motes drifting the channel.
    for (let i = 0; i < 2; i++) {
      const f = ((time * 0.22 + i * 0.5 + (seed % 7) * 0.1) % 1);
      ctx.globalAlpha = 0.5 * Math.sin(f * Math.PI);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(-L / 2 + L * f, 0, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
};

/** BONE PILE / MOUND — the ossuary's heaped dead: irregular strata mounding
 *  toward a pale crown, skulls half-sunk in the drift, stray ribs arcing off
 *  the slope. One painter serves drift-piles and true dunes alike (the radius
 *  scales the detail counts). Params: bone (base), dark (hollows), skulls. */
const bonePile: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { bone?: string; dark?: string; skulls?: number };
  const { ctx, theme } = env;
  const bone = resolveColor(p.bone, theme, '#cfc4a8');
  const dark = resolveColor(p.dark, theme, '#6a604e');
  for (const o of group) {
    const seed = ((o.pos.x * 11 + o.pos.y * 29) | 0) >>> 0;
    const R = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Strata: three irregular lobes climbing to the crown, lighter as they rise.
    for (let s = 0; s < 3; s++) {
      const f = 1 - s * 0.3;
      const verts = 9 + (seed + s) % 3;
      ctx.beginPath();
      for (let i = 0; i <= verts; i++) {
        const a = (i / verts) * Math.PI * 2;
        const rr = R * f * (0.86 + hash01(i + s * 31, seed) * 0.26);
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.82 - s * R * 0.1;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = shade(bone, -0.34 + s * 0.17);
      ctx.fill();
      ctx.strokeStyle = shade(dark, s * 0.1);
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Skulls half-buried in the drift (eye sockets toward the viewer).
    const skulls = Math.max(1, Math.round((p.skulls ?? 3) * (R / 36)));
    for (let i = 0; i < skulls; i++) {
      const a = hash01(i, seed + 7) * Math.PI * 2;
      const d = R * (0.25 + hash01(i, seed + 13) * 0.5);
      const sx = Math.cos(a) * d, sy = Math.sin(a) * d * 0.8 - R * 0.08;
      const sr = R * (0.1 + hash01(i, seed + 17) * 0.05);
      ctx.fillStyle = shade(bone, 0.22);
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shade(dark, -0.25);
      ctx.beginPath();
      ctx.arc(sx - sr * 0.34, sy - sr * 0.08, sr * 0.22, 0, Math.PI * 2);
      ctx.arc(sx + sr * 0.34, sy - sr * 0.08, sr * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    // Stray ribs arcing off the slope.
    ctx.strokeStyle = shade(bone, 0.12);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    const ribs = 2 + (seed % 3);
    for (let i = 0; i < ribs; i++) {
      const a = hash01(i, seed + 23) * Math.PI * 2;
      const d = R * (0.6 + hash01(i, seed + 29) * 0.3);
      const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.82;
      ctx.beginPath();
      ctx.arc(x, y, R * 0.2, a - 0.4, a + 1.3);
      ctx.stroke();
    }
    ctx.restore();
  }
};

/** OSSUARY NICHE — a reliquary shelf-wall from above: a thick coursed bar of
 *  stacked long bones, a skull row set down its spine, darker mortar seams and
 *  end caps. Faces its `rot` (formations lay them with rot:'chain', so rows
 *  read as corridors). Params: bone, dark, skulls (row density). */
const boneShelf: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { bone?: string; dark?: string; skulls?: number };
  const { ctx, theme } = env;
  const bone = resolveColor(p.bone, theme, '#c9bda0');
  const dark = resolveColor(p.dark, theme, '#57503f');
  for (const o of group) {
    const seed = ((o.pos.x * 23 + o.pos.y * 7) | 0) >>> 0;
    const R = o.radius;
    const L = R * 1.9, W = R * 0.92; // the shelf bar: long along the row
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // Footing shadow-pan, then the bar body.
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = shade(dark, -0.4);
    ctx.beginPath(); ctx.ellipse(0, 0, L * 0.6, W * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = shade(bone, -0.1);
    ctx.beginPath();
    ctx.roundRect(-L / 2, -W / 2, L, W, W * 0.2);
    ctx.fill();
    ctx.strokeStyle = shade(dark, 0.05);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Long-bone courses: lengthwise seams with knuckle ends per course.
    const courses = 3;
    for (let cI = 0; cI < courses; cI++) {
      const y = -W / 2 + W * ((cI + 0.5) / courses);
      ctx.strokeStyle = shade(dark, 0.18);
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-L / 2 + 3, y); ctx.lineTo(L / 2 - 3, y); ctx.stroke();
      ctx.globalAlpha = 1;
      // Knuckle nubs punctuating the course (stacked femur ends).
      const nubs = 3 + ((seed + cI) % 2);
      for (let i = 0; i < nubs; i++) {
        const x = -L / 2 + L * ((i + 0.5 + hash01(i, seed + cI * 13) * 0.3) / nubs);
        ctx.fillStyle = shade(bone, 0.16);
        ctx.beginPath(); ctx.arc(x, y - W / (courses * 2) * 0.5, W * 0.07, 0, Math.PI * 2); ctx.fill();
      }
    }
    // The skull row down the spine.
    const skulls = Math.max(2, Math.round((p.skulls ?? 4) * (R / 22)));
    for (let i = 0; i < skulls; i++) {
      const x = -L / 2 + L * ((i + 0.5) / skulls) + (hash01(i, seed + 41) - 0.5) * 4;
      const sr = W * (0.16 + hash01(i, seed + 43) * 0.04);
      ctx.fillStyle = shade(bone, 0.26);
      ctx.beginPath(); ctx.arc(x, 0, sr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shade(dark, -0.2);
      ctx.beginPath();
      ctx.arc(x - sr * 0.35, -sr * 0.1, sr * 0.24, 0, Math.PI * 2);
      ctx.arc(x + sr * 0.35, -sr * 0.1, sr * 0.24, 0, Math.PI * 2);
      ctx.fill();
    }
    // End caps: the row's darker binding posts.
    ctx.fillStyle = shade(dark, 0.12);
    ctx.fillRect(-L / 2 - 1.5, -W / 2, 3.5, W);
    ctx.fillRect(L / 2 - 2, -W / 2, 3.5, W);
    ctx.restore();
  }
};

/** ARENA WARD SEALS (data/arenas.ts) — the ritual anchors gating a realm's
 *  boss. A ground sigil: scorched pan, twin rune rings (the outer binding
 *  slowly orbits), a bound star rolled five- or six-pointed per seal, and a
 *  breathing ember heart. `broken: true` params draw the shattered face —
 *  greyed, still, cracked through, heart dark. */
const wardSeal: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { ring?: string; sigil?: string; ember?: string; broken?: boolean };
  const { ctx, theme, time } = env;
  const broken = !!p.broken;
  const ring = resolveColor(p.ring, theme, broken ? '#584f46' : '#c8763a');
  const sigil = resolveColor(p.sigil, theme, broken ? '#463f38' : '#ffb066');
  const ember = resolveColor(p.ember, theme, '#ff9a50');
  for (const o of group) {
    const seed = ((o.pos.x * 17 + o.pos.y * 5) | 0) >>> 0;
    const R = o.radius;
    const pulse = broken ? 0 : 0.5 + 0.5 * Math.sin(time * 2.6 + seed * 0.13);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Scorched pan under the sigil.
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = shade(ring, -0.7);
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.2, R * 0.98, 0, 0, Math.PI * 2); ctx.fill();
    // Twin rune rings — the dashed binding orbits while the seal lives.
    ctx.globalAlpha = broken ? 0.5 : 0.7 + 0.25 * pulse;
    ctx.strokeStyle = ring; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 6]); ctx.lineDashOffset = broken ? 0 : -time * 9;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.76, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // The bound star — five or six points, no two rites alike.
    const n = 5 + (seed % 2);
    const rot = hash01(seed, 7) * Math.PI * 2;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      pts.push({ x: Math.cos(a) * R * 0.72, y: Math.sin(a) * R * 0.72 });
    }
    ctx.strokeStyle = sigil; ctx.lineWidth = 1.8;
    ctx.globalAlpha = broken ? 0.4 : 0.55 + 0.35 * pulse;
    ctx.beginPath();
    if (n === 5) {
      for (let k = 0; k <= 5; k++) { const pt = pts[[0, 2, 4, 1, 3][k % 5]]; if (k === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); }
    } else {
      for (const tri of [[0, 2, 4], [1, 3, 5]]) {
        ctx.moveTo(pts[tri[0]].x, pts[tri[0]].y);
        ctx.lineTo(pts[tri[1]].x, pts[tri[1]].y);
        ctx.lineTo(pts[tri[2]].x, pts[tri[2]].y);
        ctx.closePath();
      }
    }
    ctx.stroke();
    if (broken) {
      // Cracked through: two dead fracture strokes across the face.
      ctx.strokeStyle = shade(ring, -0.3); ctx.lineWidth = 2.2; ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(-R * 0.9, -R * 0.28); ctx.lineTo(-R * 0.2, 0); ctx.lineTo(R * 0.85, R * 0.4);
      ctx.moveTo(-R * 0.35, R * 0.8); ctx.lineTo(0, R * 0.1); ctx.lineTo(R * 0.3, -R * 0.85);
      ctx.stroke();
      // The heart, gone dark.
      ctx.globalAlpha = 0.8; ctx.fillStyle = shade(ring, -0.75);
      ctx.beginPath(); ctx.arc(0, 0, R * 0.2, 0, Math.PI * 2); ctx.fill();
    } else {
      // The ember heart, breathing.
      const hg = ctx.createRadialGradient(0, 0, R * 0.04, 0, 0, R * 0.4);
      hg.addColorStop(0, withAlpha(ember, 0.85));
      hg.addColorStop(1, withAlpha(ember, 0));
      ctx.globalAlpha = 0.55 + 0.4 * pulse;
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = ember;
      ctx.beginPath(); ctx.arc(0, 0, R * (0.09 + 0.03 * pulse), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
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

export interface BreachParams {
  /** The molten tear color. */
  edge?: ColorSpec;
  /** Charred crust-stone color heaved up round the wound (default a scorched
   *  take on the biome's own rock). */
  rock?: ColorSpec;
  /** Crust-stone material (default 'ember' — cracked skin over inner glow). */
  material?: string;
  /** The underworld black at the center. */
  throat?: ColorSpec;
  /** Approximate radiating ground-crack count (default 5). */
  cracks?: number;
  /** Rising ember motes (default on; pass null-ish color off via 0 count). */
  motes?: { color?: ColorSpec; count?: number };
  label?: string;
}

/** THE BREACH — the torn way into the Underworld, drawn like a wound the
 *  ground can't close: a form-rolled tear over a molten under-rim, heaved
 *  ember-crusted slag stones, ground cracks radiating heat-light, and embers
 *  forever drifting up out of the dark. Dwell at the lip to cross. */
const breach: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as BreachParams;
  const { ctx, theme, time } = env;
  const edge = resolveColor(p.edge, theme, '#d84a2a');
  const throatCol = resolveColor(p.throat, theme, '#0a0508');
  const rockBase = p.rock ? resolveColor(p.rock, theme) : shade(resolveColor('theme:obstacle', theme, '#4a4442'), -0.35);
  const rockRamp = rampOf(rockBase, materialOf(p.material ?? 'ember'));
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    const r = o.radius;
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.8 + seed * 0.1);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Scorch halo: the ground round the wound burnt bare.
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = shade(throatCol, 0.12);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.45, r * 1.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Radiating ground cracks, lit from below and breathing with the pulse.
    const crackN = Math.max(0, Math.round((p.cracks ?? 5) * (0.7 + hash01(seed, 11) * 0.6)));
    ctx.lineCap = 'round';
    for (let i = 0; i < crackN; i++) {
      const a0 = hash01(i, seed + 17) * Math.PI * 2;
      let x = Math.cos(a0) * r * 0.72, y = Math.sin(a0) * r * 0.62;
      let ang = a0;
      ctx.strokeStyle = withAlpha(edge, 0.24 + 0.3 * pulse * hash01(i, seed + 19));
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const segs = 2 + (i % 2);
      for (let s = 0; s < segs; s++) {
        ang += (hash01(i * 3 + s, seed + 23) - 0.5) * 1.1;
        x += Math.cos(ang) * r * (0.3 + hash01(s, seed + 29) * 0.2);
        y += Math.sin(ang) * r * (0.24 + hash01(s, seed + 31) * 0.16);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // The TEAR: a form-rolled ragged polygon — no two breaches rip alike.
    const verts = 8 + (seed % 4);
    const rim: { x: number; y: number }[] = [];
    for (let i = 0; i < verts; i++) {
      const a = (i / verts) * Math.PI * 2;
      const rr = r * (0.62 + hash01(i, seed + 37) * 0.36);
      rim.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr * 0.72 });
    }
    const tracePath = () => {
      ctx.beginPath();
      rim.forEach((v, i) => { if (i === 0) ctx.moveTo(v.x, v.y); else ctx.lineTo(v.x, v.y); });
      ctx.closePath();
    };
    // Molten under-rim first: the wound's heat bleeding past its lip.
    tracePath();
    ctx.strokeStyle = withAlpha(edge, 0.3 + 0.25 * pulse);
    ctx.lineWidth = 6 + pulse * 3;
    ctx.stroke();
    // The drop itself: a depth gradient falling to underworld black.
    const dg = ctx.createRadialGradient(0, 0, r * 0.08, 0, 0, r * 0.9);
    dg.addColorStop(0, throatCol);
    dg.addColorStop(0.62, throatCol);
    dg.addColorStop(1, shade(edge, -0.55));
    tracePath();
    ctx.fillStyle = dg;
    ctx.fill();
    // The living edge: bright tear-line, pulsing.
    tracePath();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.6 + pulse * 1.8;
    ctx.globalAlpha = 0.55 + 0.4 * pulse;
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Heaved slag stones crusting the rim — ember-cracked, form-rolled.
    const stoneN = 2 + (seed % 3);
    for (let i = 0; i < stoneN; i++) {
      const a = hash01(i, seed + 43) * Math.PI * 2;
      const d = r * (0.86 + hash01(i, seed + 47) * 0.22);
      drawRockBody(ctx, {
        cx: Math.cos(a) * d, cy: Math.sin(a) * d * 0.74,
        r: r * (0.16 + hash01(i, seed + 53) * 0.12),
        seed: seed + i * 11 + 5, squash: 0.9,
      }, rockRamp, withAlpha(rockRamp.outline, 0.9), 1.1, false);
      // Each stone's wound-side face catches the glow.
      ctx.fillStyle = withAlpha(edge, 0.16 + 0.14 * pulse);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d * 0.88, Math.sin(a) * d * 0.64, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    // The molten heart, breathing under everything that fell in.
    ctx.globalAlpha = 0.18 + 0.2 * pulse;
    const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.42);
    hg.addColorStop(0, shade(edge, 0.25));
    hg.addColorStop(1, withAlpha(edge, 0));
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Embers drifting up out of the dark, forever.
    const moteN = p.motes?.count ?? 5;
    const moteCol = resolveColor(p.motes?.color, theme, shade(edge, 0.3));
    for (let i = 0; i < moteN; i++) {
      const cyc = (time * (0.16 + hash01(i, seed + 61) * 0.12) + hash01(i, seed + 67)) % 1;
      const mx = (hash01(i, seed + 71) - 0.5) * r * 1.1 + Math.sin(time * 1.7 + i * 2.3) * r * 0.06;
      const my = r * 0.5 - cyc * r * 1.6;
      ctx.globalAlpha = (1 - cyc) * 0.7;
      ctx.fillStyle = moteCol;
      ctx.beginPath();
      ctx.arc(mx, my, 1 + (1 - cyc) * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (p.label) {
      ctx.textAlign = 'center';
      ctx.font = '9px Verdana';
      ctx.fillStyle = '#d88a6a';
      ctx.fillText(p.label, 0, r + 14);
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

/** The SURVEY SPIRE (the 'beacon' zone objective): a stepped stone plinth, a
 *  tapered needle, and the scrying gem at its tip. One painter, two dressings:
 *  `lit: false` is the dormant monument (a slow dull glint — something sleeps
 *  in the stone); `lit: true` blazes — halo breathing wide, a light shaft up
 *  the needle, spark motes ringing the tip. The engine swaps the doodad KIND
 *  (survey_spire → survey_spire_lit) at full charge; both kinds land here. */
const surveySpire: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { stone?: ColorSpec; gem?: ColorSpec; lit?: boolean };
  const { ctx, theme, time } = env;
  const stone = resolveColor(p.stone, theme, '#646c7a');
  const gem = resolveColor(p.gem, theme, '#8fd4ff');
  for (const o of group) {
    const r = o.radius;
    const pulse = p.lit
      ? 0.55 + 0.45 * Math.sin(time * 3.1 + o.pos.x * 0.013)
      : 0.35 + 0.25 * Math.sin(time * 1.1 + o.pos.x * 0.013);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Lit ground halo under everything (the banked light spilling out).
    if (p.lit) {
      ctx.globalAlpha = 0.10 + 0.10 * pulse;
      ctx.fillStyle = gem;
      ctx.beginPath(); ctx.arc(0, 0, r * (2.4 + pulse * 0.8), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Stepped plinth: two weathered discs.
    ctx.fillStyle = shade(stone, -0.25);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = stone;
    ctx.beginPath(); ctx.arc(0, -r * 0.12, r * 0.66, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // The needle: a tall taper up-screen, lit on its left face.
    const h = r * 2.9;
    ctx.fillStyle = shade(stone, 0.08);
    ctx.beginPath();
    ctx.moveTo(0, -h); ctx.lineTo(r * 0.30, -r * 0.2); ctx.lineTo(-r * 0.30, -r * 0.2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = shade(stone, 0.45);
    ctx.beginPath();
    ctx.moveTo(0, -h); ctx.lineTo(-r * 0.30, -r * 0.2); ctx.lineTo(-r * 0.06, -r * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    // Rune seams up the taper — they catch the gem's tint as it wakes.
    ctx.strokeStyle = withAlpha(gem, p.lit ? 0.5 + 0.4 * pulse : 0.25 + 0.2 * pulse);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.92); ctx.lineTo(0, -r * 0.3);
    ctx.moveTo(-r * 0.12, -h * 0.55); ctx.lineTo(r * 0.12, -h * 0.55);
    ctx.moveTo(-r * 0.09, -h * 0.34); ctx.lineTo(r * 0.09, -h * 0.34);
    ctx.stroke();
    // The scrying gem at the tip.
    const gr = r * (p.lit ? 0.34 : 0.26) + pulse * r * 0.08;
    if (p.lit) {
      ctx.globalAlpha = 0.30 + 0.25 * pulse;
      ctx.fillStyle = gem;
      ctx.beginPath(); ctx.arc(0, -h, gr * 2.6, 0, Math.PI * 2); ctx.fill();
      // Spark motes ringing the tip.
      ctx.globalAlpha = 0.75;
      for (let k = 0; k < 3; k++) {
        const a = time * 1.7 + k * (Math.PI * 2 / 3) + o.pos.y * 0.01;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * gr * 3.1, -h + Math.sin(a) * gr * 1.6, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = p.lit ? 0.95 : 0.5 + 0.3 * pulse;
    ctx.fillStyle = gem;
    ctx.beginPath(); ctx.arc(0, -h, gr, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
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

/** THE TOWN FOUNTAIN — ringed stone basin, living water, a soft sparkle. */
const fountain: GroupPainter = (env, group) => {
  const { ctx, time } = env;
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Outer rim → walk ledge → water.
    ctx.fillStyle = '#5c564a';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2e2a22';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#6c6656';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1d4254';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2); ctx.fill();
    // Center plinth + upwelling shimmer rings.
    ctx.fillStyle = '#565044';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = withAlpha('#bfe8f4', 0.5);
    ctx.lineWidth = 1.4;
    for (let k = 0; k < 2; k++) {
      const rr = ((time * 0.35 + k * 0.5) % 1) * r * 0.44 + r * 0.18;
      ctx.globalAlpha = 0.5 * (1 - (rr - r * 0.18) / (r * 0.48));
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
    }
    // Sparkle glints hopping around the water.
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e8f6ff';
    for (let i = 0; i < 3; i++) {
      const a = time * 0.8 + i * 2.1;
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(time * 5 + i * 2);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

/** A village WELL: stone ring over the dark shaft, crossbar + bucket rope. */
const well: GroupPainter = (env, group) => {
  const { ctx } = env;
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    ctx.fillStyle = '#5a544a';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2c2822';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Stone segmenting.
    ctx.strokeStyle = withAlpha('#2c2822', 0.6);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.fillStyle = '#060a10';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.fill();
    // Crossbar + the rope into the dark.
    ctx.strokeStyle = '#4a3826';
    ctx.lineWidth = Math.max(2, r * 0.14);
    ctx.beginPath(); ctx.moveTo(-r * 1.05, 0); ctx.lineTo(r * 1.05, 0); ctx.stroke();
    ctx.strokeStyle = '#8a7a5c';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.18, r * 0.3); ctx.stroke();
    ctx.restore();
  }
};

/** A LANTERN POST — the town's standing warmth (light layer carries the glow). */
const lanternPost: GroupPainter = (env, group) => {
  const { ctx, time } = env;
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The warm pool the lamp throws (the light layer amplifies at night).
    const flick = 0.9 + 0.1 * Math.sin(time * 6 + o.pos.x);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.6 * flick);
    g.addColorStop(0, withAlpha('#ffd898', 0.22));
    g.addColorStop(1, withAlpha('#ffd898', 0));
    ctx.fillStyle = g;
    ctx.fillRect(-r * 2.8, -r * 2.8, r * 5.6, r * 5.6);
    // Post base + arm + the lamp box.
    ctx.fillStyle = '#2e2a26';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2e2a26';
    ctx.lineWidth = Math.max(2, r * 0.18);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.75, -r * 0.4); ctx.stroke();
    ctx.fillStyle = '#3a342c';
    ctx.fillRect(r * 0.55, -r * 0.62, r * 0.42, r * 0.46);
    ctx.fillStyle = `rgba(255,220,150,${0.75 + 0.25 * Math.sin(time * 6 + o.pos.x)})`;
    ctx.fillRect(r * 0.62, -r * 0.55, r * 0.28, r * 0.32);
    ctx.restore();
  }
};

/** A BENCH: two worn planks on stone feet. */
const bench: GroupPainter = (env, group) => {
  const { ctx } = env;
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    ctx.fillStyle = '#4a4038';
    ctx.fillRect(-r * 0.95, -r * 0.42, r * 0.24, r * 0.84);
    ctx.fillRect(r * 0.71, -r * 0.42, r * 0.24, r * 0.84);
    for (const off of [-0.18, 0.14]) {
      ctx.fillStyle = off < 0 ? '#6a5a40' : '#75644a';
      ctx.fillRect(-r, r * off, r * 2, r * 0.26);
      ctx.strokeStyle = withAlpha('#2c2418', 0.8);
      ctx.lineWidth = 1;
      ctx.strokeRect(-r, r * off, r * 2, r * 0.26);
    }
    ctx.restore();
  }
};

/** A MARKET STALL: trader's table under a striped awning. */
const marketStall: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { stripe?: ColorSpec };
  const { ctx, theme } = env;
  const stripe = resolveColor(p.stripe, theme, '#a84a3a');
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // The table peeking out front.
    ctx.fillStyle = '#5c4a32';
    ctx.fillRect(r * 0.3, -r * 0.7, r * 0.55, r * 1.4);
    // The awning: striped canopy with a scalloped front edge.
    const stripes = 5;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 ? '#e8dcc2' : stripe;
      ctx.fillRect(-r * 0.9, -r * 0.85 + (i / stripes) * r * 1.7, r * 1.1, r * 1.7 / stripes + 0.5);
    }
    ctx.strokeStyle = withAlpha('#2c2013', 0.8);
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-r * 0.9, -r * 0.85, r * 1.1, r * 1.7);
    // Scallops on the leading edge.
    ctx.fillStyle = stripe;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(r * 0.2, -r * 0.85 + (i + 0.5) * r * 0.425, r * 0.1, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

/** A BROKEN CART: tilted bed, spilled boards, one wheel off and resting. */
const brokenCart: GroupPainter = (env, group) => {
  const { ctx } = env;
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate((o.rot ?? 0) + 0.22); // always slumped a little off-true
    // The bed.
    ctx.fillStyle = '#5a4630';
    ctx.fillRect(-r * 0.8, -r * 0.5, r * 1.6, r);
    ctx.strokeStyle = '#2c2013';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-r * 0.8, -r * 0.5, r * 1.6, r);
    for (let x = -r * 0.5; x < r * 0.8; x += r * 0.32) {
      ctx.beginPath(); ctx.moveTo(x, -r * 0.5); ctx.lineTo(x, r * 0.5); ctx.stroke();
    }
    // The surviving wheel + the one that rolled off.
    ctx.strokeStyle = '#3a2c1c';
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath(); ctx.arc(-r * 0.85, r * 0.35, r * 0.3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 1.05, r * 0.55, r * 0.3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.75, r * 0.25); ctx.lineTo(r * 1.35, r * 0.85);
    ctx.moveTo(r * 1.35, r * 0.25); ctx.lineTo(r * 0.75, r * 0.85);
    ctx.stroke();
    // A spilled board.
    ctx.fillStyle = '#4c3a26';
    ctx.save();
    ctx.rotate(-0.5);
    ctx.fillRect(-r * 1.15, r * 0.4, r * 0.7, r * 0.16);
    ctx.restore();
    ctx.restore();
  }
};

/** The SCARECROW: cross-frame, straw head, a coat the wind never fills. */
const scarecrow: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { coat?: ColorSpec };
  const { ctx, theme, time } = env;
  const coat = resolveColor(p.coat, theme, '#5a4a5e');
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // Cross arms + the coat draped square.
    ctx.strokeStyle = '#4a3826';
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 1.1, 0); ctx.lineTo(r * 1.1, 0); ctx.stroke();
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.14);
    ctx.lineTo(r * 0.85, -r * 0.14);
    ctx.lineTo(r * 0.55, r * 0.5);
    ctx.lineTo(-r * 0.55, r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha('#241c26', 0.8);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Straw head + hat brim; a few straws poking loose, twitching.
    ctx.fillStyle = '#c8a85c';
    ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6c34';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.4 + Math.sin(time * 2 + i) * 0.06;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.28, -r * 0.3 + Math.sin(a) * r * 0.28);
      ctx.lineTo(Math.cos(a) * r * 0.48, -r * 0.3 + Math.sin(a) * r * 0.48);
      ctx.stroke();
    }
    ctx.strokeStyle = '#3a2e1c';
    ctx.lineWidth = Math.max(1.5, r * 0.1);
    ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.38, -Math.PI * 0.95, -Math.PI * 0.05); ctx.stroke();
    ctx.restore();
  }
};

/** A rolled HAY BALE with binding straps. */
const hayBale: GroupPainter = (env, group) => {
  const { ctx } = env;
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    const trace = (): void => { ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.75, 0, 0, Math.PI * 2); };
    trace();
    ctx.fillStyle = '#b89a4e';
    ctx.fill();
    ctx.strokeStyle = '#6c5626';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // The roll: concentric swirl.
    ctx.strokeStyle = withAlpha('#8a6c2e', 0.7);
    ctx.lineWidth = 1.2;
    for (const f of [0.66, 0.36]) {
      ctx.beginPath(); ctx.ellipse(0, 0, r * f, r * f * 0.75, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // Straps.
    ctx.strokeStyle = withAlpha('#4c3a1a', 0.85);
    ctx.lineWidth = Math.max(1.5, r * 0.09);
    for (const x of [-r * 0.4, r * 0.4]) {
      ctx.beginPath(); ctx.moveTo(x, -r * 0.72); ctx.lineTo(x, r * 0.72); ctx.stroke();
    }
    ctx.restore();
  }
};

/** Clay POTS huddled together (markets, crypts, kitchens of the dead). */
const potCluster: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { clay?: ColorSpec; lid?: ColorSpec };
  const { ctx, theme } = env;
  const clay = resolveColor(p.clay, theme, '#9a6a44');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 3 + o.pos.y * 7) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    const n = 2 + (seed % 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash01(i, seed) * 1.2;
      const d = i === 0 ? 0 : r * 0.5;
      const pr = r * (0.4 + hash01(i, seed + 3) * 0.18);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      ctx.fillStyle = shade(clay, hash01(i, seed + 7) * 0.2 - 0.06);
      ctx.beginPath(); ctx.arc(x, y, pr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withAlpha(shade(clay, -0.45), 0.85);
      ctx.lineWidth = 1.3;
      ctx.stroke();
      if (p.lid) {
        // SEALED: a lid disc with a knob — grave clay keeps its own counsel.
        const lid = resolveColor(p.lid, theme);
        ctx.fillStyle = shade(lid, hash01(i, seed + 9) * 0.14 - 0.04);
        ctx.beginPath(); ctx.arc(x, y, pr * 0.66, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = withAlpha(shade(lid, -0.4), 0.8);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = shade(lid, 0.18);
        ctx.beginPath(); ctx.arc(x, y, pr * 0.16, 0, Math.PI * 2); ctx.fill();
      } else {
        // The mouth ring.
        ctx.strokeStyle = withAlpha(shade(clay, -0.3), 0.7);
        ctx.beginPath(); ctx.arc(x, y, pr * 0.5, 0, Math.PI * 2); ctx.stroke();
      }
      // A lip highlight either way.
      ctx.strokeStyle = withAlpha(shade(clay, 0.3), 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x - pr * 0.2, y - pr * 0.2, pr * 0.62, -2.4, -1.1); ctx.stroke();
    }
    ctx.restore();
  }
};

/** RUBBLE: walkable ruin-scatter — angular masonry chips underfoot. */
const rubble: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { stone?: ColorSpec };
  const { ctx, theme } = env;
  const stone = resolveColor(p.stone, theme, theme.obstacle);
  ctx.save();
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 5) | 0) >>> 0;
    const n = Math.max(4, Math.round(o.radius * 0.22));
    for (let i = 0; i < n; i++) {
      const a = hash01(i, seed) * Math.PI * 2;
      const d = Math.sqrt(hash01(i, seed + 3)) * o.radius * 0.9;
      const x = o.pos.x + Math.cos(a) * d, y = o.pos.y + Math.sin(a) * d;
      const s = 2.5 + hash01(i, seed + 7) * 4.5;
      const rot = hash01(i, seed + 11) * Math.PI;
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = shade(stone, hash01(i, seed + 13) * 0.24 - 0.08);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillRect(-s / 2, -s / 3, s, s * 0.66);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
};

/** A BANNER POST: a pole flying somebody's cloth (faction-tintable). */
const bannerPost: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { cloth?: ColorSpec };
  const { ctx, theme, time } = env;
  const cloth = resolveColor(p.cloth, theme, theme.accent);
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.fillStyle = '#3a3028';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2); ctx.fill();
    // The cloth streams with the moment (a lazy ripple even in calm).
    const sway = Math.sin(time * 1.8 + o.pos.x * 0.05) * r * 0.2;
    ctx.fillStyle = withAlpha(cloth, 0.92);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.1);
    ctx.quadraticCurveTo(r * 0.7, -r * 0.35 + sway * 0.5, r * 1.35, -r * 0.15 + sway);
    ctx.lineTo(r * 1.28, r * 0.12 + sway);
    ctx.quadraticCurveTo(r * 0.65, r * 0.2 + sway * 0.4, 0, r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(cloth, -0.4), 0.7);
    ctx.lineWidth = 1;
    ctx.stroke();
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

interface HatchParams {
  wood?: ColorSpec; seam?: ColorSpec; frame?: ColorSpec; ring?: ColorSpec;
  label?: string;
}

/** A CELLAR HATCH: a plank trapdoor set flush in the floor — wooden leaves in
 *  a shadowed frame, a cross-batten, an iron pull-ring. The quiet door down. */
const hatch: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as HatchParams;
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#5c4630');
  const seam = resolveColor(p.seam, theme, '#3a2c1c');
  const frame = resolveColor(p.frame, theme, '#2e2418');
  const ring = resolveColor(p.ring, theme, '#8a8578');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The frame: the dark rebate the leaves sit into.
    ctx.fillStyle = frame;
    ctx.fillRect(-r, -r * 0.82, r * 2, r * 1.64);
    // Plank leaves, each its own weathered tone.
    const n = 4;
    const pw = (r * 2 - 4) / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = shade(wood, (hash01(i, seed) - 0.5) * 0.16);
      ctx.fillRect(-r + 2 + i * pw, -r * 0.82 + 2, pw - 1, r * 1.64 - 4);
    }
    // Seams: the frame line + the cross-batten holding the leaves.
    ctx.strokeStyle = seam;
    ctx.lineWidth = 1;
    ctx.strokeRect(-r + 2, -r * 0.82 + 2, r * 2 - 4, r * 1.64 - 4);
    ctx.fillStyle = withAlpha(seam, 0.9);
    ctx.fillRect(-r + 2, -1.4, r * 2 - 4, 2.6);
    // The iron pull-ring, resting toward the near edge.
    ctx.strokeStyle = ring;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.24, 0, Math.PI * 2); ctx.stroke();
    if (p.label && labelRevealed(env, o.pos)) {
      ctx.fillStyle = '#d8d4c8';
      ctx.font = '11px Verdana';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, 0, r + 14);
    }
    ctx.restore();
  }
};

/** Standing-object contact shadows, driven by DoodadVisualDef.shadow. */
export function paintGroupShadows(env: PaintEnv, group: readonly Doodad[], alphaMul: number): void {
  for (const d of group) drawShadow(env.ctx, d.pos.x, d.pos.y, d.radius, alphaMul);
}

/** A WEATHERED STATUE: square plinth, the figure's shoulder-and-head mass
 *  off-centre the way old monuments lean, moss creeping up the north face. */
const statue: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { stone?: ColorSpec; moss?: ColorSpec };
  const { ctx, theme } = env;
  const stone = resolveColor(p.stone, theme, '#8a8578');
  const moss = resolveColor(p.moss, theme, '#5a6e42');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 17 + o.pos.y * 5) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // The plinth: two stacked squares, the lower a shade darker.
    ctx.fillStyle = shade(stone, -0.3);
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = shade(stone, -0.1);
    ctx.fillRect(-r * 0.74, -r * 0.74, r * 1.48, r * 1.48);
    ctx.strokeStyle = withAlpha(shade(stone, -0.5), 0.8);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-r * 0.74, -r * 0.74, r * 1.48, r * 1.48);
    // The figure's mass: shoulders + head, leaning as the ground let it.
    const lean = (hash01(1, seed) - 0.5) * r * 0.3;
    ctx.fillStyle = shade(stone, 0.12);
    ctx.beginPath();
    ctx.ellipse(lean * 0.4, 0, r * 0.46, r * 0.34, hash01(2, seed) * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(stone, 0.24);
    ctx.beginPath();
    ctx.arc(lean, -r * 0.08, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Moss holds the sunless corner.
    ctx.fillStyle = withAlpha(moss, 0.55);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-r * 0.5 + hash01(i + 3, seed) * r * 0.5, -r * 0.55 + hash01(i + 9, seed) * r * 0.5,
        r * (0.1 + hash01(i + 5, seed) * 0.1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

/** A WAYSHRINE: a stone niche with a pitched cap and the votive candle the
 *  road still keeps lit (the glow itself rides the def's LightSpec). */
const wayshrine: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { stone?: ColorSpec; roof?: ColorSpec; flame?: ColorSpec };
  const { ctx, theme, time } = env;
  const stone = resolveColor(p.stone, theme, '#7e7668');
  const roof = resolveColor(p.roof, theme, '#4e4438');
  const flame = resolveColor(p.flame, theme, '#ffd890');
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // Stone body + the niche's shadowed mouth.
    ctx.fillStyle = shade(stone, -0.12);
    ctx.fillRect(-r * 0.62, -r * 0.7, r * 1.24, r * 1.4);
    ctx.fillStyle = withAlpha('#141210', 0.75);
    ctx.fillRect(-r * 0.3, -r * 0.16, r * 0.6, r * 0.62);
    // The pitched cap: two shaded slopes meeting on a ridge.
    ctx.fillStyle = shade(roof, 0.1);
    ctx.fillRect(-r * 0.78, -r * 0.86, r * 0.78, r * 0.38);
    ctx.fillStyle = shade(roof, -0.16);
    ctx.fillRect(0, -r * 0.86, r * 0.78, r * 0.38);
    ctx.strokeStyle = withAlpha(shade(roof, -0.45), 0.9);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-r * 0.78, -r * 0.86, r * 1.56, r * 0.38);
    // The candle: a breathing pinpoint in the niche.
    const breathe = 0.75 + Math.sin(time * 5.1 + o.pos.x) * 0.25;
    ctx.fillStyle = withAlpha(flame, 0.9 * breathe);
    ctx.beginPath();
    ctx.arc(0, r * 0.12, r * 0.1 * (0.8 + breathe * 0.3), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

/** THE GALLOWS: platform boards, the post's shadowed bulk, and a crossbeam
 *  reaching out with its rope stilled mid-sway. Grim road punctuation. */
const gallows: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; rope?: ColorSpec };
  const { ctx, theme, time } = env;
  const wood = resolveColor(p.wood, theme, '#5c4a34');
  const rope = resolveColor(p.rope, theme, '#a89468');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 13 + o.pos.y * 11) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // The platform: weathered boards, gaps where feet learned the drop.
    const n = 5;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = shade(wood, -0.05 + (hash01(i, seed) - 0.5) * 0.18);
      ctx.fillRect(-r + i * (r * 2 / n) + 1, -r * 0.8, r * 2 / n - 2, r * 1.6);
    }
    ctx.strokeStyle = withAlpha(shade(wood, -0.5), 0.7);
    ctx.lineWidth = 1;
    ctx.strokeRect(-r, -r * 0.8, r * 2, r * 1.6);
    // Post + crossbeam, top-down: the beam reaches over the trap.
    ctx.fillStyle = shade(wood, -0.35);
    ctx.beginPath();
    ctx.arc(-r * 0.55, 0, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(wood, -0.22);
    ctx.fillRect(-r * 0.55, -r * 0.09, r * 1.15, r * 0.18);
    // The rope: a loop drifting a hand's width in whatever wind there is.
    const sway = Math.sin(time * 1.3 + seed) * r * 0.06;
    ctx.strokeStyle = withAlpha(rope, 0.9);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(r * 0.42 + sway, r * 0.05, r * 0.13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
};

/** A FISHING RACK: two posts, rails between, split fish drying tail-up —
 *  the coast's pantry, hung out where the wind does the work. */
const fishingRack: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; fish?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#6a5a40');
  const fish = resolveColor(p.fish, theme, '#b0a284');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 19 + o.pos.y * 7) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // End posts + the two rails they carry.
    ctx.fillStyle = shade(wood, -0.3);
    ctx.beginPath(); ctx.arc(-r, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = shade(wood, 0.05);
    ctx.lineWidth = 2.2;
    for (const y of [-r * 0.16, r * 0.16]) {
      ctx.beginPath(); ctx.moveTo(-r, y); ctx.lineTo(r, y); ctx.stroke();
    }
    // The catch: tapered splits hung along the rails, no two the same size.
    const count = 4 + (seed % 3);
    for (let i = 0; i < count; i++) {
      const x = -r * 0.8 + (i / (count - 1)) * r * 1.6;
      const y = (i % 2 === 0 ? -1 : 1) * r * 0.16;
      const len = r * (0.26 + hash01(i, seed) * 0.14);
      ctx.fillStyle = shade(fish, (hash01(i + 4, seed) - 0.5) * 0.2);
      ctx.beginPath();
      ctx.ellipse(x, y + len * 0.5, r * 0.09, len * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

/** A CHARCOAL MOUND: the burner's turf-clad kiln — a dark dome seamed with
 *  ember cracks that breathe while the burn holds (glow rides the LightSpec). */
const kilnMound: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { earth?: ColorSpec; ember?: ColorSpec };
  const { ctx, theme, time } = env;
  const earth = resolveColor(p.earth, theme, '#3c342a');
  const ember = resolveColor(p.ember, theme, '#ff9a48');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 23 + o.pos.y * 3) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The turf dome, darkest at the crown where the smoke hole vents.
    ctx.fillStyle = shade(earth, -0.05);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade(earth, -0.3);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = withAlpha('#100c08', 0.85);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2); ctx.fill();
    // Ember seams: radial cracks that brighten and dim with the burn.
    const pulse = 0.55 + Math.sin(time * 2.3 + seed) * 0.3;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + hash01(i, seed) * 0.7;
      ctx.strokeStyle = withAlpha(ember, (0.35 + hash01(i + 5, seed) * 0.4) * pulse);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
      ctx.lineTo(Math.cos(a + 0.25) * r * (0.6 + hash01(i + 2, seed) * 0.3),
        Math.sin(a + 0.25) * r * (0.6 + hash01(i + 2, seed) * 0.3));
      ctx.stroke();
    }
    ctx.restore();
  }
};

// --- The hell-steppes kit ------------------------------------------------------

export interface FinBladeParams {
  color?: ColorSpec;
  material?: string;
  /** An ember seam bleeding up the concave face — the heat below showing through. */
  emberEdge?: { color: ColorSpec; alpha?: number };
}

/** HELL FINS — curved basalt horn-blades heaved out of the scorch (the outer
 *  steppes' skyline): a swept claw silhouette hooked left or right by seed,
 *  facet-shaded against the shared sun, growth ridges following the curl, a
 *  heaved rubble footing — and, where the params say so, an ember seam on the
 *  concave face. The doodad's rot only LEANS the blade (these stand). */
const finBlade: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as FinBladeParams;
  const { ctx, theme } = env;
  const base = resolveColor(p.color, theme, '#241318');
  const ramp = rampOf(base, materialOf(p.material ?? 'stone'));
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    const r = o.radius;
    const h = r * (2.0 + hash01(seed, 13) * 0.9);
    const curl = r * (0.8 + hash01(seed, 17) * 0.55);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(Math.sin(o.rot ?? 0) * 0.16);
    if (hash01(seed, 19) < 0.5) ctx.scale(-1, 1); // hooks break both ways
    // Root footing: heaved rubble the blade erupted through.
    ctx.fillStyle = ramp.shadow;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.92, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    const horn = (): void => {
      ctx.beginPath();
      ctx.moveTo(-r * 0.66, r * 0.08);
      ctx.quadraticCurveTo(-r * 0.78, -h * 0.62, -r * 0.16 + curl * 0.35, -h * 0.98);
      ctx.quadraticCurveTo(curl * 0.95, -h * 1.04, curl, -h * 0.82);
      ctx.quadraticCurveTo(r * 0.34, -h * 0.48, r * 0.6, r * 0.06);
      ctx.closePath();
    };
    ctx.fillStyle = ramp.base;
    horn();
    ctx.fill();
    // Facets vs the shared sun: windward face lit, lee face sunk.
    ctx.save();
    horn();
    ctx.clip();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = ramp.light;
    ctx.fillRect(-r * 1.3, -h * 1.15, r * 0.95, h * 1.3);
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = ramp.shadow;
    ctx.fillRect(r * 0.1, -h * 1.15, r * 1.4, h * 1.3 + r);
    ctx.restore();
    // Growth ridges sweeping with the curl.
    ctx.strokeStyle = withAlpha(ramp.outline, 0.45);
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.62 + i * r * 0.28, r * 0.02);
      ctx.quadraticCurveTo(-r * 0.3 + i * r * 0.14, -h * (0.52 + i * 0.03),
        curl * (0.42 + i * 0.16), -h * (0.86 - i * 0.06));
      ctx.stroke();
    }
    horn();
    ctx.strokeStyle = withAlpha(ramp.outline, 0.9);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    if (p.emberEdge) {
      ctx.strokeStyle = withAlpha(resolveColor(p.emberEdge.color, theme), p.emberEdge.alpha ?? 0.5);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(r * 0.54, r * 0.02);
      ctx.quadraticCurveTo(r * 0.32, -h * 0.48, curl * 0.9, -h * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }
};

export interface ImpalerParams {
  wood?: ColorSpec;
  husk?: ColorSpec;
  wrap?: ColorSpec;
}

/** IMPALER STAKES — a leaning sharpened shaft and the dried husk the legions
 *  left on it: slumped remains at two-thirds height, arms surrendered to
 *  gravity, wrappings trailing below. Grim silhouette dressing — bone-dry,
 *  long past gore. The rot only leans the stake. */
const impaler: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as ImpalerParams;
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#382018');
  const husk = resolveColor(p.husk, theme, '#191013');
  const wrap = resolveColor(p.wrap, theme, '#3a3026');
  for (const o of group) {
    const seed = ((o.pos.x * 11 + o.pos.y * 5) | 0) >>> 0;
    const r = o.radius;
    const h = r * (3.1 + hash01(seed, 3) * 0.9);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(Math.sin(o.rot ?? 0) * 0.24);
    // Packed spoil at the foot.
    ctx.fillStyle = shade(wood, -0.45);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.7, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    // The shaft, tapering to the point; sun catches its left face and the tip.
    const wBase = r * 0.3, wTip = r * 0.08;
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.moveTo(-wBase / 2, 0);
    ctx.lineTo(-wTip / 2, -h);
    ctx.lineTo(wTip / 2, -h);
    ctx.lineTo(wBase / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(wood, -0.5), 0.8);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = withAlpha(shade(wood, 0.3), 0.6);
    ctx.beginPath();
    ctx.moveTo(-wBase / 2, 0);
    ctx.lineTo(-wTip / 2, -h);
    ctx.lineTo(0, -h);
    ctx.lineTo(-wBase / 6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(wood, 0.45);
    ctx.beginPath();
    ctx.moveTo(-wTip, -h);
    ctx.lineTo(0, -h - r * 0.34);
    ctx.lineTo(wTip, -h);
    ctx.closePath();
    ctx.fill();
    // THE HUSK: torso mass, a dropped head, hanging arms.
    const hy = -h * (0.58 + hash01(seed, 7) * 0.12);
    ctx.fillStyle = husk;
    ctx.beginPath();
    ctx.ellipse(0, hy, r * 0.5, r * 0.72, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.18, hy - r * 0.66, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = husk;
    ctx.lineWidth = r * 0.16;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.34, hy - r * 0.2);
      ctx.quadraticCurveTo(s * r * (0.5 + hash01(seed + s + 1, 11) * 0.14), hy + r * 0.5,
        s * r * 0.3, hy + r * 0.95);
      ctx.stroke();
    }
    // Wrappings trailing in the wind that isn't there.
    ctx.strokeStyle = withAlpha(wrap, 0.8);
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.1 + i * r * 0.2, hy + r * 0.4);
      ctx.quadraticCurveTo(r * (0.4 + i * 0.2), hy + r * (0.9 + i * 0.3),
        r * (0.2 + i * 0.3), hy + r * (1.4 + i * 0.2));
      ctx.stroke();
    }
    ctx.restore();
  }
};

export interface GroundChainParams {
  iron?: ColorSpec;
  rust?: ColorSpec;
  plate?: ColorSpec;
}

/** TITAN CHAINS — a bolted anchor plate and a run of massive links marching
 *  off toward whatever they hold below: drawn flat on the floor (the doodad's
 *  rot IS the run's bearing), links alternating aspect like a chain laid
 *  down, rust blooming at the welds, the last link half-swallowed by the
 *  crust. */
const groundChain: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as GroundChainParams;
  const { ctx, theme } = env;
  const iron = resolveColor(p.iron, theme, '#3c3a40');
  const rust = resolveColor(p.rust, theme, '#7a3a1e');
  const plate = resolveColor(p.plate, theme, '#2c2a30');
  for (const o of group) {
    const seed = ((o.pos.x * 17 + o.pos.y * 3) | 0) >>> 0;
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // The anchor plate: bolted iron biting the crust.
    ctx.fillStyle = withAlpha('#000000', 0.28);
    ctx.beginPath();
    ctx.ellipse(2, 3, r * 0.5, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    const pw = r * 0.72, ph = r * 0.6;
    ctx.fillStyle = plate;
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.strokeStyle = withAlpha(shade(plate, -0.5), 0.9);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
    ctx.fillStyle = shade(plate, 0.3);
    for (const [bx, by] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      ctx.beginPath();
      ctx.arc(bx * pw * 0.32, by * ph * 0.3, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    // The run: links tapering off along the bearing, sagging with the ground.
    const links = 5 + (seed % 3);
    let x = pw / 2 + r * 0.18;
    for (let i = 0; i < links; i++) {
      const t = i / Math.max(1, links - 1);
      const lr = r * (0.34 - t * 0.08);
      const y = Math.sin(i * 1.7 + hash01(i, seed) * 2) * r * 0.14;
      const upright = i % 2 === 0;
      ctx.globalAlpha = i === links - 1 ? 0.55 : 1; // the last link sinks in
      ctx.strokeStyle = hash01(i, seed + 23) < 0.4 ? mix(iron, rust, 0.55) : iron;
      ctx.lineWidth = lr * 0.5;
      ctx.beginPath();
      ctx.ellipse(x + lr, y, lr, lr * (upright ? 0.62 : 0.36), 0, 0, Math.PI * 2);
      ctx.stroke();
      // A lit crescent on each link's sunward rim.
      ctx.strokeStyle = withAlpha(shade(iron, 0.4), 0.5);
      ctx.lineWidth = lr * 0.18;
      ctx.beginPath();
      ctx.ellipse(x + lr, y, lr, lr * (upright ? 0.62 : 0.36), 0, Math.PI * 1.1, Math.PI * 1.7);
      ctx.stroke();
      x += lr * (upright ? 1.5 : 1.72);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

export interface StairFlightParams {
  stone?: ColorSpec;
  edge?: ColorSpec;
  /** Treads in the flight (default 7). */
  treads?: number;
  /** Ember light seeping from the riser seams. */
  glow?: { color: ColorSpec; alpha?: number };
}

/** GATE STAIRS — a broad flight descending along the doodad's rot: treads
 *  step darker as they drop, risers cut hard seam shadows, low stringer curbs
 *  flank the run, and the last tread feathers into the ground it arrives on.
 *  Pseudo-elevation for the top-down camera — the descent reads at a glance,
 *  coming or going. */
const stairFlight: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as unknown as StairFlightParams;
  const { ctx, theme } = env;
  const stone = resolveColor(p.stone, theme, '#4a4550');
  const edgeCol = resolveColor(p.edge, theme, '#16131d');
  for (const o of group) {
    const r = o.radius;
    const L = r * 2.0;  // the run, along the descent
    const W = r * 1.42; // width across
    const n = Math.max(3, p.treads ?? 7);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0); // +x = down the stairs
    // The cut: a hard shadow under the whole run so it sits INTO the ground.
    ctx.fillStyle = withAlpha('#000000', 0.32);
    ctx.fillRect(-L / 2 - 2, -W / 2 - 3, L + 6, W + 6);
    // Treads, stepping darker as they descend.
    const tw = L / n;
    for (let i = 0; i < n; i++) {
      const x0 = -L / 2 + i * tw;
      const t = i / (n - 1);
      ctx.fillStyle = mix(shade(stone, 0.22), shade(stone, -0.5), t);
      ctx.fillRect(x0, -W / 2, tw + 0.5, W);
      // The lip catches light; the riser under it cuts shadow.
      ctx.fillStyle = withAlpha(shade(stone, 0.5), 0.5 * (1 - t * 0.6));
      ctx.fillRect(x0, -W / 2, 1.6, W);
      ctx.fillStyle = withAlpha(edgeCol, 0.85);
      ctx.fillRect(x0 + tw - 1.4, -W / 2, 1.4, W);
      if (p.glow) {
        ctx.fillStyle = withAlpha(resolveColor(p.glow.color, theme),
          (p.glow.alpha ?? 0.2) * (0.4 + t * 0.6));
        ctx.fillRect(x0 + tw - 2.2, -W / 2 + 2, 0.9, W - 4);
      }
    }
    // Stringer curbs: low stone rails flanking the run.
    for (const s of [-1, 1]) {
      const sy = s > 0 ? W / 2 : -W / 2 - 4.5;
      ctx.fillStyle = shade(stone, -0.18);
      ctx.fillRect(-L / 2 - 2, sy, L + 4, 4.5);
      ctx.fillStyle = withAlpha(shade(stone, 0.34), 0.6);
      ctx.fillRect(-L / 2 - 2, sy, L + 4, 1.3);
    }
    // The arrival: the last tread feathers into the field.
    const fg = ctx.createLinearGradient(L / 2, 0, L / 2 + r * 0.5, 0);
    fg.addColorStop(0, withAlpha(shade(stone, -0.5), 0.5));
    fg.addColorStop(1, withAlpha(shade(stone, -0.5), 0));
    ctx.fillStyle = fg;
    ctx.fillRect(L / 2, -W / 2, r * 0.5, W);
    ctx.restore();
  }
};

// --- THE RIVER-OF-FLAME KIT (hell's artery: the forge, the toll, the road) -------

/** A BONE-PYRE burning pale: a mounded heap of the counted dead, soul-fire
 *  standing off it — the banks keep their own lights. Colors are params so a
 *  future rite can burn any shade (default: cold soulfire over old bone). */
const pyre: GroupPainter = (env, group, def) => {
  const { ctx, world, time, theme } = env;
  const p = (def.params ?? {}) as { flame?: ColorSpec; bone?: ColorSpec };
  const flame = resolveColor(p.flame, theme, '#9fd4ff');
  const bone = resolveColor(p.bone, theme, '#cfc4ac');
  for (const o of group) {
    const R = o.radius;
    const seed = ((o.pos.x * 17 + o.pos.y * 5) | 0) >>> 0;
    const flick = 0.8 + 0.14 * Math.sin(time * 9 + seed * 0.13) + 0.06 * Math.sin(time * 21 + o.pos.y);
    // Pale halo, pooled at the walls (the campfire discipline).
    const haloR = R * 2.1;
    const poly = litPolygon(world, o.pos.x, o.pos.y, haloR);
    ctx.save();
    if (poly) ctx.clip(polygonPath(poly));
    const g = ctx.createRadialGradient(o.pos.x, o.pos.y, R * 0.3, o.pos.x, o.pos.y, haloR * flick);
    g.addColorStop(0, withAlpha(flame, 0.2 * flick));
    g.addColorStop(1, withAlpha(flame, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, haloR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Char bed, then the mounded dead: lumps shading paler toward the crown.
    ctx.fillStyle = '#1c1512';
    ctx.beginPath(); ctx.ellipse(o.pos.x, o.pos.y + R * 0.12, R * 1.02, R * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 7; i++) {
      const a = hash01(i, seed) * Math.PI * 2;
      const d = (0.15 + hash01(i, seed + 2) * 0.55) * R;
      const lr = R * (0.24 + hash01(i, seed + 4) * 0.2) * (1 - d / (R * 1.6));
      const lx = o.pos.x + Math.cos(a) * d, ly = o.pos.y + Math.sin(a) * d * 0.55 - (0.5 - d / (R * 1.4)) * R * 0.34;
      ctx.fillStyle = shade(bone, -0.28 + (1 - d / R) * 0.3 + (hash01(i, seed + 6) - 0.5) * 0.14);
      ctx.beginPath(); ctx.ellipse(lx, ly, lr * 1.25, lr * 0.85, a, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withAlpha('#241d16', 0.5); ctx.lineWidth = 1; ctx.stroke();
    }
    // Soul-fire tongues off the crown — cold light, no smoke.
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.42 + 0.1 * Math.sin(time * 5 + i * 2.1 + seed);
      const fh = R * (0.7 + 0.28 * Math.sin(time * 7.3 + i * 1.7 + seed * 0.31));
      const bx = o.pos.x + (i - 1) * R * 0.24, by = o.pos.y - R * 0.4;
      ctx.fillStyle = withAlpha(flame, (0.34 + 0.2 * flick) * (1 - i * 0.18));
      ctx.beginPath();
      ctx.moveTo(bx - R * 0.14, by);
      ctx.quadraticCurveTo(bx + Math.cos(a) * fh * 0.4, by + Math.sin(a) * fh * 0.7, bx + Math.cos(a) * fh * 0.2, by + Math.sin(a) * fh);
      ctx.quadraticCurveTo(bx + R * 0.1, by + Math.sin(a) * fh * 0.5, bx + R * 0.14, by);
      ctx.closePath(); ctx.fill();
    }
  }
};

/** A GIBBET CAGE on a leaning post — the river's toll. The cage sways on its
 *  chain; a faint pale wisp still burns inside (the brittle rule pops it). */
const hangingCage: GroupPainter = (env, group, def) => {
  const { ctx, time, theme } = env;
  const p = (def.params ?? {}) as { iron?: ColorSpec; wisp?: ColorSpec; wood?: ColorSpec };
  const iron = resolveColor(p.iron, theme, '#2a2622');
  const wisp = resolveColor(p.wisp, theme, '#9fd4ff');
  const wood = resolveColor(p.wood, theme, '#33201a');
  for (const o of group) {
    const seed = ((o.pos.x * 7 + o.pos.y * 13) | 0) >>> 0;
    const r = o.radius;
    const h = r * (3.4 + hash01(seed, 2) * 0.7);
    const lean = (hash01(seed, 5) - 0.5) * 0.3;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(lean);
    // Post + arm (the impaler's shaft grammar, with a gallows crook).
    ctx.strokeStyle = wood; ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2.5, r * 0.3);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.lineTo(r * 1.1, -h + r * 0.18); ctx.stroke();
    ctx.strokeStyle = withAlpha(shade(wood, 0.3), 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-r * 0.08, 0); ctx.lineTo(-r * 0.08, -h); ctx.stroke();
    // The cage swings from the arm's end — chain, ribs, and what's left inside.
    const sway = Math.sin(time * 1.1 + seed * 0.37) * 0.09;
    ctx.translate(r * 1.1, -h + r * 0.18);
    ctx.rotate(sway);
    const cw = r * 0.62, chh = r * 1.05, top = r * 0.5;
    ctx.strokeStyle = shade(iron, 0.12); ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) { // chain links
      ctx.beginPath(); ctx.ellipse(0, top * (0.2 + i * 0.3), r * 0.07, r * 0.11, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // Wisp glow THROUGH the bars first, so the iron reads in front of it.
    const wa = 0.22 + 0.14 * Math.sin(time * 2.3 + seed * 0.61);
    const g = ctx.createRadialGradient(0, top + chh * 0.55, 0, 0, top + chh * 0.55, cw * 1.5);
    g.addColorStop(0, withAlpha(wisp, wa));
    g.addColorStop(1, withAlpha(wisp, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, top + chh * 0.55, cw * 1.5, 0, Math.PI * 2); ctx.fill();
    // The cage: crown ring, rib bars meeting at the foot, a girdle band.
    ctx.strokeStyle = iron; ctx.lineWidth = Math.max(1.6, r * 0.12);
    ctx.beginPath(); ctx.ellipse(0, top, cw * 0.72, cw * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cw * 0.34, top + cw * 0.1);
      ctx.quadraticCurveTo(i * cw * 0.5, top + chh * 0.55, 0, top + chh);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(0, top + chh * 0.52, cw * 0.56, cw * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
};

/** A LEGION WAR-BANNER: scorched pole, ragged pennant combing in the heat,
 *  a lit glyph smouldering on the cloth. Cloth/trim/glyph are params — every
 *  legion flies its own colors off one painter. */
const warBanner: GroupPainter = (env, group, def) => {
  const { ctx, time, theme } = env;
  const p = (def.params ?? {}) as { cloth?: ColorSpec; pole?: ColorSpec; glyph?: ColorSpec };
  const cloth = resolveColor(p.cloth, theme, '#6e1418');
  const pole = resolveColor(p.pole, theme, '#241a14');
  const glyph = resolveColor(p.glyph, theme, '#ff8a4a');
  for (const o of group) {
    const seed = ((o.pos.x * 19 + o.pos.y * 3) | 0) >>> 0;
    const r = o.radius;
    const h = r * (3.6 + hash01(seed, 1) * 0.8);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate((hash01(seed, 7) - 0.5) * 0.14);
    // Footing spoil + the pole with its cross-arm.
    ctx.fillStyle = shade(pole, -0.3);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.6, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pole; ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2.5, r * 0.24);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.stroke();
    ctx.lineWidth = Math.max(2, r * 0.18);
    ctx.beginPath(); ctx.moveTo(-r * 0.95, -h + r * 0.3); ctx.lineTo(r * 0.95, -h + r * 0.3); ctx.stroke();
    // The pennant: hangs from the arm, torn hem, a slow heat-comb wave.
    const wv = Math.sin(time * 1.6 + seed * 0.41) * r * 0.12;
    const top = -h + r * 0.34, drop = r * 1.7, wHalf = r * 0.88;
    ctx.fillStyle = cloth;
    ctx.beginPath();
    ctx.moveTo(-wHalf, top);
    ctx.lineTo(wHalf, top);
    ctx.lineTo(wHalf * 0.9 + wv, top + drop * 0.72);
    // Torn hem: three tongues, each combed by the wave.
    for (let i = 2; i >= -2; i -= 2) {
      ctx.lineTo(i * wHalf * 0.33 + wv * (1 + 0.3 * i), top + drop * (0.95 + hash01(i + 3, seed) * 0.12));
      ctx.lineTo((i - 1) * wHalf * 0.33 + wv, top + drop * 0.78);
    }
    ctx.lineTo(-wHalf * 0.9 + wv * 0.6, top + drop * 0.72);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = withAlpha(shade(cloth, -0.4), 0.8); ctx.lineWidth = 1; ctx.stroke();
    // Sun side + the smouldering glyph.
    ctx.fillStyle = withAlpha(shade(cloth, 0.25), 0.5);
    ctx.beginPath(); ctx.moveTo(-wHalf, top); ctx.lineTo(-wHalf * 0.2, top); ctx.lineTo(-wHalf * 0.3 + wv * 0.5, top + drop * 0.7); ctx.lineTo(-wHalf * 0.85 + wv * 0.6, top + drop * 0.6); ctx.closePath(); ctx.fill();
    const ga = 0.5 + 0.3 * Math.sin(time * 3.1 + seed * 0.53);
    ctx.strokeStyle = withAlpha(glyph, ga); ctx.lineWidth = Math.max(1.2, r * 0.09);
    ctx.beginPath();
    ctx.moveTo(-r * 0.22 + wv * 0.4, top + drop * 0.28);
    ctx.lineTo(r * 0.2 + wv * 0.4, top + drop * 0.4);
    ctx.moveTo(r * 0.18 + wv * 0.4, top + drop * 0.24);
    ctx.lineTo(-r * 0.18 + wv * 0.4, top + drop * 0.46);
    ctx.stroke();
    ctx.restore();
  }
};

/** THE HELLFORGE: the demons' great forge-altar — a slag plinth, the iron
 *  mass, an ember throat that breathes, chain draped off its horn. The
 *  terminus monument of the River of Flame (one per landing; spacing keeps
 *  it singular). */
const hellforge: GroupPainter = (env, group, def) => {
  const { ctx, world, time, theme } = env;
  const p = (def.params ?? {}) as { iron?: ColorSpec; ember?: ColorSpec };
  const iron = resolveColor(p.iron, theme, '#1c1714');
  const ember = resolveColor(p.ember, theme, '#ff6a22');
  for (const o of group) {
    const R = o.radius;
    const seed = ((o.pos.x * 29 + o.pos.y * 11) | 0) >>> 0;
    const breathe = 0.75 + 0.2 * Math.sin(time * 2.2 + seed * 0.19) + 0.05 * Math.sin(time * 9.7);
    // Forge-light halo, pooled at the walls.
    const haloR = R * 2.6;
    const poly = litPolygon(world, o.pos.x, o.pos.y, haloR);
    ctx.save();
    if (poly) ctx.clip(polygonPath(poly));
    const g = ctx.createRadialGradient(o.pos.x, o.pos.y, R * 0.4, o.pos.x, o.pos.y, haloR * breathe);
    g.addColorStop(0, withAlpha(ember, 0.24 * breathe));
    g.addColorStop(1, withAlpha(ember, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, haloR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The slag plinth: a heaped dark base, cooled runnels streaking it.
    ctx.fillStyle = '#14100d';
    ctx.beginPath(); ctx.ellipse(0, R * 0.18, R * 1.05, R * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = withAlpha(shade(ember, -0.25), 0.35);
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      const a = hash01(i, seed) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.5, R * 0.1 + Math.sin(a) * R * 0.2);
      ctx.lineTo(Math.cos(a) * R * 1.0, R * 0.22 + Math.sin(a) * R * 0.4);
      ctx.stroke();
    }
    // The iron mass: beveled block + the horn, edges catching the throat-light.
    const bw = R * 1.3, bh = R * 1.0, topY = -R * 0.9;
    ctx.fillStyle = iron;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.5, R * 0.05);
    ctx.lineTo(-bw * 0.42, topY);
    ctx.lineTo(bw * 0.34, topY);
    ctx.lineTo(bw * 0.62, topY + bh * 0.24); // the horn's shoulder
    ctx.lineTo(bw * 0.95, topY + bh * 0.16); // the horn
    ctx.lineTo(bw * 0.88, topY + bh * 0.38);
    ctx.lineTo(bw * 0.5, topY + bh * 0.44);
    ctx.lineTo(bw * 0.44, R * 0.05);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade(iron, 0.35); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = withAlpha(shade(iron, 0.5), 0.35);
    ctx.beginPath(); ctx.moveTo(-bw * 0.42, topY); ctx.lineTo(bw * 0.34, topY); ctx.lineTo(bw * 0.3, topY + bh * 0.1); ctx.lineTo(-bw * 0.38, topY + bh * 0.1); ctx.closePath(); ctx.fill();
    // The ember throat: a breathing maw in the block's face.
    const tg = ctx.createRadialGradient(-bw * 0.02, topY + bh * 0.62, 0, -bw * 0.02, topY + bh * 0.62, R * 0.52 * breathe);
    tg.addColorStop(0, withAlpha('#fff3c8', 0.9 * breathe));
    tg.addColorStop(0.35, withAlpha(ember, 0.8 * breathe));
    tg.addColorStop(1, withAlpha(ember, 0));
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.ellipse(-bw * 0.02, topY + bh * 0.62, R * 0.46, R * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    // Sparks climbing off the throat.
    for (let i = 0; i < 3; i++) {
      const ph = (time * (0.7 + i * 0.23) + hash01(i, seed) * 7) % 1;
      ctx.fillStyle = withAlpha('#ffd9a0', (1 - ph) * 0.8);
      ctx.beginPath();
      ctx.arc(-bw * 0.02 + Math.sin((time + i) * 3.1) * R * 0.16, topY + bh * 0.5 - ph * R * 1.1, Math.max(0.8, R * 0.04 * (1 - ph)), 0, Math.PI * 2);
      ctx.fill();
    }
    // Chain off the horn (the hell_chain grammar, hung).
    ctx.strokeStyle = shade(iron, 0.2); ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(bw * 0.9, topY + bh * (0.42 + i * 0.14), R * 0.05, R * 0.08, 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
};

// --- THE BOUNDARY-GATE KIT (enclave façades: the mouth a walled biome shows) ----

/** A MONUMENTAL ARCH spanning a gate mouth: jamb stacks, a voussoir curve,
 *  the keystone, chains off the soffit, and a cold under-glow breathing in
 *  the opening. rot aligns the span across the throat; every color is a
 *  param so each enclave's stone answers its own biome. */
const gateArch: GroupPainter = (env, group, def) => {
  const { ctx, time, theme } = env;
  const p = (def.params ?? {}) as { stone?: ColorSpec; edge?: ColorSpec; glow?: ColorSpec };
  const stone = resolveColor(p.stone, theme, '#211d2b');
  const edge = resolveColor(p.edge, theme, '#3d3750');
  const glow = resolveColor(p.glow, theme, '#7de84a');
  for (const o of group) {
    const R = o.radius; // half-span of the mouth
    const seed = ((o.pos.x * 31 + o.pos.y * 7) | 0) >>> 0;
    const breathe = 0.65 + 0.25 * Math.sin(time * 1.7 + seed * 0.23);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // The cold light standing in the opening (under the arch, over the lane).
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.1 * breathe);
    g.addColorStop(0, withAlpha(glow, 0.22 * breathe));
    g.addColorStop(1, withAlpha(glow, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.1, R * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    // Jamb stacks at both ends of the span: coursed blocks, sun-caught edges.
    for (const s of [-1, 1]) {
      const jx = s * R;
      ctx.fillStyle = stone;
      ctx.beginPath();
      ctx.roundRect(jx - R * 0.16, -R * 0.5, R * 0.32, R * 1.0, 3);
      ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.strokeStyle = withAlpha(shade(stone, 0.35), 0.7);
      ctx.lineWidth = 1;
      for (let c = -1; c <= 1; c++) {
        ctx.beginPath();
        ctx.moveTo(jx - R * 0.15, c * R * 0.26);
        ctx.lineTo(jx + R * 0.15, c * R * 0.26 + (hash01(c + 2, seed) - 0.5) * 2);
        ctx.stroke();
      }
    }
    // The SPAN: a heavy lintel bowing over the mouth (top-down foreshortening:
    // an arc bowed "north" in local space), voussoir ticks, the keystone.
    const bow = R * 0.55;
    ctx.strokeStyle = stone;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(6, R * 0.3);
    ctx.beginPath();
    ctx.moveTo(-R, -R * 0.1);
    ctx.quadraticCurveTo(0, -bow - R * 0.1, R, -R * 0.1);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(edge, 0.9);
    ctx.lineWidth = 1.2;
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const ax = -R + 2 * R * t;
      const ay = -R * 0.1 - (4 * bow * t * (1 - t)) * 0.5; // along the quad curve
      const na = Math.atan2(-(1 - 2 * t) * bow, R); // curve normal-ish
      ctx.beginPath();
      ctx.moveTo(ax - Math.sin(na) * R * 0.14, ay - Math.cos(na) * R * 0.14);
      ctx.lineTo(ax + Math.sin(na) * R * 0.14, ay + Math.cos(na) * R * 0.14);
      ctx.stroke();
    }
    ctx.fillStyle = shade(stone, 0.25);
    ctx.beginPath();
    ctx.roundRect(-R * 0.13, -bow - R * 0.24, R * 0.26, R * 0.3, 2);
    ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.stroke();
    // Chains off the soffit — the toll's hooks, swaying a breath.
    ctx.strokeStyle = shade(stone, 0.45);
    ctx.lineWidth = 1.3;
    for (const s of [-0.45, 0.45]) {
      const sway = Math.sin(time * 1.3 + s * 5 + seed * 0.31) * R * 0.04;
      for (let l = 0; l < 3; l++) {
        ctx.beginPath();
        ctx.ellipse(s * R + sway * (l / 3), -R * 0.06 + l * R * 0.09, R * 0.03, R * 0.045, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
};

/** A TORTURE RACK: the frame, the rollers, the straps — and the stain
 *  beneath it. Inert furniture that makes a hall confess what it is. */
const tortureRack: GroupPainter = (env, group, def) => {
  const { ctx, theme } = env;
  const p = (def.params ?? {}) as { wood?: ColorSpec; iron?: ColorSpec; stain?: ColorSpec };
  const wood = resolveColor(p.wood, theme, '#2e2118');
  const iron = resolveColor(p.iron, theme, '#3a3630');
  const stain = resolveColor(p.stain, theme, '#3a0a12');
  for (const o of group) {
    const seed = ((o.pos.x * 13 + o.pos.y * 17) | 0) >>> 0;
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // The stain first — older than the frame's current tenant.
    ctx.fillStyle = withAlpha(stain, 0.55);
    ctx.beginPath();
    ctx.ellipse(r * 0.15, r * 0.2, r * 0.8, r * 0.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // The bed: two long rails + cross-slats.
    const L = r * 1.5, W = r * 0.8;
    ctx.strokeStyle = wood; ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(3, r * 0.18);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(-L / 2, s * W / 2); ctx.lineTo(L / 2, s * W / 2); ctx.stroke();
    }
    ctx.lineWidth = Math.max(2, r * 0.11);
    for (let i = 0; i < 4; i++) {
      const x = -L / 2 + (i + 0.5) * (L / 4);
      ctx.strokeStyle = shade(wood, (hash01(i, seed) - 0.5) * 0.2);
      ctx.beginPath(); ctx.moveTo(x, -W / 2); ctx.lineTo(x + r * 0.05, W / 2); ctx.stroke();
    }
    // Rollers at both ends + the crank cross.
    ctx.strokeStyle = iron;
    ctx.lineWidth = Math.max(2.5, r * 0.14);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * L / 2, -W / 2 - r * 0.1); ctx.lineTo(s * L / 2, W / 2 + r * 0.1); ctx.stroke();
    }
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(L / 2 + r * 0.16, -r * 0.22); ctx.lineTo(L / 2 + r * 0.16, r * 0.22); ctx.stroke();
    ctx.beginPath(); ctx.arc(L / 2 + r * 0.16, 0, r * 0.1, 0, Math.PI * 2); ctx.stroke();
    // Straps: taut lines toward the head roller.
    ctx.strokeStyle = withAlpha(shade(wood, 0.4), 0.8);
    ctx.lineWidth = 1.2;
    for (const s of [-0.3, 0.3]) {
      ctx.beginPath(); ctx.moveTo(-L * 0.2, s * W); ctx.lineTo(-L / 2, s * W * 0.4); ctx.stroke();
    }
    ctx.restore();
  }
};

export const PAINTERS: Record<string, GroupPainter> = {
  liquid, chasmPit, cliffMass, mound, boulder, cairn: cairnPainter, scree,
  shard, vent, pod, dome, bones, slab, sparkle, platformRing, marrowWell,
  kelp, coral, sapling, plank, dock, palisade, windowSlit, caveMouth, hatch,
  campfire, groundShadow, trunk, brush, fern, vineMat, gravelPath, shimmer, fogFloor,
  hyphae, shelfFungus, toadstools,
  membrane, veins, eyeStalk, ribArch, teethRow,
  chitinFin, umbilic, mawPit,
  finBlade, impaler, groundChain, stairFlight,
  cactus, web, deadTree, stump, log, snowman, signpost, firewoodPile,
  fountain, well, lanternPost, bench, marketStall, brokenCart,
  scarecrow, hayBale, potCluster, rubble, bannerPost,
  statue, wayshrine, gallows, fishingRack, kilnMound,
  tentacleField, pentagram, wardSeal, bonePile, boneShelf, leyLine, crowdRow, door, breach, landmass, beacon, surveySpire, fallback,
  pyre, hangingCage, warBanner, hellforge,
  gateArch, tortureRack, buttressRoot,
};

// --- CANOPY CROWN PAINTERS (drawn ABOVE actors, proximity-faded) -------------

export type CanopyPainter = (env: PaintEnv, o: Doodad, alpha: number, params: Record<string, unknown>) => void;

/** The BRAMBLE MASS — a thicket's crown as a real tangle: scallop-lobed
 *  silhouette (seeded, no two alike), crossing vine strokes bowing out past
 *  the rim, thorn barbs studding the outer arcs, chance-rolled dark berry
 *  clusters, a sun-side dapple. Briarwood crowns ride the same painter a
 *  size up. Everything multiplies the walk-under fade alpha. */
const bramble: CanopyPainter = (env, o, alpha, params) => {
  const p = params as {
    fill?: ColorSpec; edge?: ColorSpec; spine?: ColorSpec;
    thorns?: boolean; berries?: { color?: ColorSpec; chance?: number };
  };
  const { ctx, theme } = env;
  const fill = resolveColor(p.fill, theme, '#2c4424');
  const edge = resolveColor(p.edge, theme, 'rgba(0,0,0,0.4)');
  const spine = resolveColor(p.spine, theme, shade(fill, 0.28));
  const seed = ((o.pos.x * 11 + o.pos.y * 5) | 0) >>> 0;
  ctx.save();
  ctx.translate(o.pos.x, o.pos.y);
  if (o.rot !== undefined) ctx.rotate(o.rot);
  ctx.globalAlpha = alpha;
  // Under-heart: the tangle's own dark depth.
  ctx.fillStyle = shade(fill, -0.42);
  ctx.beginPath();
  ctx.arc(0, 0, o.radius * 0.88, 0, Math.PI * 2);
  ctx.fill();
  // Scalloped tangle lobes ringing the mass.
  const lobes = 6 + (seed % 3);
  const lobe = (lx: number, ly: number, lr: number, tone: string): void => {
    ctx.fillStyle = tone;
    ctx.beginPath();
    for (let k = 0; k <= 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const rr = lr * (0.82 + 0.18 * Math.abs(Math.sin(a * 3 + lx + ly)));
      const x = lx + Math.cos(a) * rr, y = ly + Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.quadraticCurveTo(lx + Math.cos(a - 0.4) * rr * 1.08, ly + Math.sin(a - 0.4) * rr * 1.08, x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(fill, -0.52), 0.4);
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2 + hash01(i, seed) * 0.5;
    const d = o.radius * (0.5 + hash01(i, seed + 7) * 0.14);
    lobe(Math.cos(a) * d, Math.sin(a) * d,
      o.radius * (0.36 + hash01(i, seed + 11) * 0.14),
      i % 2 ? fill : shade(fill, -0.13));
  }
  lobe(-o.radius * 0.08, -o.radius * 0.08, o.radius * 0.46, shade(fill, 0.04));
  // THE TANGLE: vine strokes crossing the mass and bowing out past the rim —
  // the thicket escaping itself.
  ctx.lineCap = 'round';
  const vines = 8 + (seed % 4);
  for (let i = 0; i < vines; i++) {
    const a0 = hash01(i, seed + 31) * Math.PI * 2;
    const a1 = a0 + 1.6 + hash01(i, seed + 37) * 2.2;
    const r0 = o.radius * (0.2 + hash01(i, seed + 41) * 0.55);
    const r1 = o.radius * (0.2 + hash01(i, seed + 43) * 0.6);
    const mid = (a0 + a1) / 2;
    const bow = o.radius * (0.88 + hash01(i, seed + 53) * 0.3);
    ctx.strokeStyle = withAlpha(i % 3 ? shade(fill, -0.32) : spine, 0.75);
    ctx.lineWidth = 1.2 + hash01(i, seed + 47) * 1.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
    ctx.quadraticCurveTo(Math.cos(mid) * bow, Math.sin(mid) * bow,
      Math.cos(a1) * r1, Math.sin(a1) * r1);
    ctx.stroke();
  }
  // THORNS: barbs studding the outer arcs.
  if (p.thorns !== false) {
    ctx.fillStyle = withAlpha(shade(fill, 0.45), 0.9);
    const n = 7 + (seed % 4);
    for (let i = 0; i < n; i++) {
      const a = hash01(i, seed + 61) * Math.PI * 2;
      const rr = o.radius * (0.84 + hash01(i, seed + 67) * 0.2);
      const bx = Math.cos(a) * rr, by = Math.sin(a) * rr;
      const ta = a + (hash01(i, seed + 71) - 0.5) * 1.0;
      const len = o.radius * 0.1;
      const px = Math.cos(ta + Math.PI / 2) * len * 0.32;
      const py = Math.sin(ta + Math.PI / 2) * len * 0.32;
      ctx.beginPath();
      ctx.moveTo(bx - px, by - py);
      ctx.lineTo(bx + px, by + py);
      ctx.lineTo(bx + Math.cos(ta) * len, by + Math.sin(ta) * len);
      ctx.closePath();
      ctx.fill();
    }
  }
  // BERRIES: dark clusters where the sun reaches (chance-rolled).
  if (p.berries && hash01(seed, 81) < (p.berries.chance ?? 0.35)) {
    const bc = resolveColor(p.berries.color, theme, '#3a1830');
    const clusters = 2 + (seed % 2);
    for (let c = 0; c < clusters; c++) {
      const a = VIS_CFG.lightAngle + (hash01(c, seed + 87) - 0.5) * 1.8;
      const d = o.radius * (0.42 + hash01(c, seed + 91) * 0.3);
      const cx = Math.cos(a) * d, cy = Math.sin(a) * d;
      for (let k = 0; k < 4 + (c % 2); k++) {
        const ka = hash01(k, seed + c * 13 + 97) * Math.PI * 2;
        const kd = hash01(k, seed + c * 13 + 101) * o.radius * 0.08;
        const bx2 = cx + Math.cos(ka) * kd, by2 = cy + Math.sin(ka) * kd;
        ctx.fillStyle = bc;
        ctx.beginPath(); ctx.arc(bx2, by2, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = withAlpha('#ffffff', 0.4);
        ctx.beginPath(); ctx.arc(bx2 - 0.5, by2 - 0.5, 0.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // Sun-side dapple + the mass's outer edge.
  ctx.globalAlpha = alpha * 0.28;
  ctx.fillStyle = shade(fill, 0.32);
  ctx.beginPath();
  ctx.ellipse(Math.cos(VIS_CFG.lightAngle) * o.radius * 0.34,
    Math.sin(VIS_CFG.lightAngle) * o.radius * 0.34,
    o.radius * 0.5, o.radius * 0.36, VIS_CFG.lightAngle, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, o.radius * 0.97, 0, Math.PI * 2);
  ctx.stroke();
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

/** Fungal crowns (giant mushroom / fruiting tower) — the whole palette rides
 *  params now (cap/glow/stalk/speck), plus GILL fringes under each rim and
 *  wart SPECKS on the dome: one crown painter, every biome's mushroom. */
const mushroomCrown: CanopyPainter = (env, o, alpha, params) => {
  const p = params as {
    caps?: number; cap?: ColorSpec; glow?: ColorSpec; stalk?: ColorSpec;
    speck?: ColorSpec; specks?: boolean; gills?: boolean;
  };
  const { ctx, theme, time } = env;
  const caps = p.caps ?? 1;
  const capCol = resolveColor(p.cap, theme, '#5a8a3a');
  const glowCol = resolveColor(p.glow, theme, '#8fd06f');
  const gillCol = shade(resolveColor(p.stalk, theme, '#3a2a5a'), 0.3);
  const seed = ((o.pos.x * 13 + o.pos.y * 11) | 0) >>> 0;
  const breath = 0.55 + 0.35 * Math.sin(time * 1.6 + o.pos.x * 0.04);
  ctx.save();
  ctx.translate(o.pos.x, o.pos.y);
  // The CAP ITSELF is the canopy, seen from ABOVE: a shaded dome with its
  // gill spokes peeking past the rim and the bioluminescence seeping out
  // under the edge. The stalk lives on the GROUND (the trunk painter) —
  // nothing floats on top of anything.
  const drawCap = (cx: number, cy: number, cr: number, ci: number): void => {
    // Under-rim bloom: the light escaping the gills.
    ctx.globalAlpha = alpha * (0.16 + 0.12 * breath);
    const ug = ctx.createRadialGradient(cx, cy, cr * 0.7, cx, cy, cr * 1.25);
    ug.addColorStop(0, withAlpha(glowCol, 0.5));
    ug.addColorStop(1, withAlpha(glowCol, 0));
    ctx.fillStyle = ug;
    ctx.beginPath(); ctx.arc(cx, cy, cr * 1.25, 0, Math.PI * 2); ctx.fill();
    // Gill spokes peeking past the dome's rim.
    if (p.gills !== false) {
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = gillCol;
      ctx.lineWidth = Math.max(1, cr * 0.05);
      const gills = Math.max(9, Math.round(cr / 3.2));
      for (let g = 0; g < gills; g++) {
        const a = (g / gills) * Math.PI * 2 + ci * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * cr * 0.84, cy + Math.sin(a) * cr * 0.84);
        ctx.lineTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr);
        ctx.stroke();
      }
    }
    // The dome: bright pole offset sunward, falling to a shaded rim.
    ctx.globalAlpha = alpha;
    const L = VIS_CFG.lightAngle;
    const px = cx + Math.cos(L) * cr * 0.22, py = cy + Math.sin(L) * cr * 0.22;
    const dg = ctx.createRadialGradient(px, py, 0, cx, cy, cr);
    dg.addColorStop(0, shade(capCol, 0.24));
    dg.addColorStop(0.62, capCol);
    dg.addColorStop(1, shade(capCol, -0.3));
    ctx.fillStyle = dg;
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = withAlpha(shade(capCol, -0.5), 0.8);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // Wart specks riding the dome.
    if (p.specks) {
      const sc = resolveColor(p.speck, theme, '#e8f2da');
      ctx.fillStyle = withAlpha(sc, 0.85);
      const n = 4 + ((seed + ci * 7) % 4);
      for (let k = 0; k < n; k++) {
        const ka = hash01(k, seed + ci * 17) * Math.PI * 2;
        const kd = Math.sqrt(hash01(k, seed + ci * 19)) * cr * 0.72;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(ka) * kd, cy + Math.sin(ka) * kd,
          cr * 0.07 + 0.6, cr * 0.05 + 0.5, ka, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The glow bleeding through the dome's thin crown.
    ctx.globalAlpha = alpha * (0.2 + 0.18 * breath);
    ctx.fillStyle = glowCol;
    ctx.beginPath(); ctx.arc(px, py, cr * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha;
  };
  if (caps <= 1) {
    drawCap(0, 0, o.radius * 0.96, 0);
  } else {
    // A fruiting TOWER from above: the big crown, smaller caps stepping off.
    drawCap(0, 0, o.radius * 0.8, 0);
    for (let i = 1; i < caps; i++) {
      const a = hash01(i, seed + 29) * Math.PI * 2;
      const d = o.radius * (0.55 + 0.14 * i);
      drawCap(Math.cos(a) * d, Math.sin(a) * d, o.radius * (0.46 - i * 0.08), i);
    }
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
  // CANOPY DAPPLE: soft dark wells where the crown opens toward the floor —
  // the broad low-frequency depth a BUSH deliberately lacks (bushes carry
  // discrete leaf detail instead; that contrast is the clump-clarity rule).
  for (let i = 0; i < 3 + (seed % 3); i++) {
    const a = hash01(i, seed + 91) * Math.PI * 2;
    const d = Math.sqrt(hash01(i, seed + 97)) * o.radius * 0.6;
    ctx.globalAlpha = alpha * 0.22;
    ctx.fillStyle = shade(base, -0.55);
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d,
      o.radius * (0.12 + hash01(i, seed + 101) * 0.1), o.radius * 0.09,
      hash01(i, seed + 103) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = alpha;
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
  // Billow falloffs are constant profiles scaled by alpha — baked sprites
  // (see alphaDiscSprite), so the swirl costs six blits, not six gradient
  // allocations per bank per frame.
  const billow = alphaDiscSprite(col, [[0, 0.34], [0.7, 0.16], [1, 0]], 'fogB');
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + time * (0.1 + hash01(i, seed) * 0.08) * (i % 2 ? 1 : -1);
    const d = o.radius * 0.42 * breathe;
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    const r = o.radius * (0.5 + hash01(i, seed + 3) * 0.22) * breathe;
    ctx.drawImage(billow, x - r, y - r, r * 2, r * 2);
  }
  // A brighter core wisp so the bank reads as weather, not a paint smear.
  const core = alphaDiscSprite(shade(col, 0.25), [[0, 0.2], [1, 0]], 'fogC');
  const cr = o.radius * 0.5 * breathe;
  ctx.drawImage(core, -cr, -cr, cr * 2, cr * 2);
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

/** The KELP CROWN — a giant kelp's frond whorl riding the canopy pass: two
 *  LAYERS of tapered ribbon fronds (broad dark unders, bright narrow overs)
 *  radiating off-phase from the stipe, each swaying on its own current beat,
 *  the whole crown drifting slowly. The gaps BETWEEN ribbons are the design:
 *  the forest hides what stands in it in glimpses, never behind a solid
 *  disc — and the walk-under fade opens it the moment you step beneath. */
const kelpCrown: CanopyPainter = (env, o, alpha, params) => {
  const p = params as { color?: ColorSpec; rib?: ColorSpec; bladder?: ColorSpec };
  const { ctx, theme, time } = env;
  const base = resolveColor(p.color, theme, '#2f7a4a');
  const rib = resolveColor(p.rib, theme, shade(base, 0.34));
  const seed = ((o.pos.x * 7 + o.pos.y * 13) | 0) >>> 0;
  ctx.save();
  ctx.translate(o.pos.x, o.pos.y);
  ctx.rotate(Math.sin(time * 0.3 + seed * 0.1) * 0.06 + hash01(seed, 3) * Math.PI * 2);
  // The frond MAT first: a translucent scalloped under-disc that gives the
  // crown its mass — the ribbons above leave glimpse-gaps only at the rim.
  ctx.globalAlpha = alpha * 0.38;
  ctx.fillStyle = shade(base, -0.32);
  ctx.beginPath();
  for (let k = 0; k <= 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const rr = o.radius * 0.78 * (0.86 + 0.14 * Math.abs(Math.sin(a * 3 + seed)));
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  const frond = (a: number, len: number, w0: number, tone: string, sway: number, la: number): void => {
    const tipA = a + sway;
    const tx = Math.cos(tipA) * len, ty = Math.sin(tipA) * len;
    const cx = Math.cos(a + sway * 0.5) * len * 0.55, cy = Math.sin(a + sway * 0.5) * len * 0.55;
    const px = Math.cos(a + Math.PI / 2) * w0, py = Math.sin(a + Math.PI / 2) * w0;
    ctx.globalAlpha = la;
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.moveTo(px * 0.5, py * 0.5);
    ctx.quadraticCurveTo(cx + px * 0.7, cy + py * 0.7, tx, ty);
    ctx.quadraticCurveTo(cx - px * 0.7, cy - py * 0.7, -px * 0.5, -py * 0.5);
    ctx.closePath();
    ctx.fill();
    // The midrib catching what light gets down here.
    ctx.strokeStyle = withAlpha(rib, 0.55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(cx, cy, tx, ty);
    ctx.stroke();
  };
  // Under-layer: broad dark fronds.
  const under = 7 + (seed % 2);
  for (let i = 0; i < under; i++) {
    const a = (i / under) * Math.PI * 2 + hash01(i, seed) * 0.4;
    frond(a, o.radius * (0.82 + hash01(i, seed + 7) * 0.25),
      o.radius * (0.24 + hash01(i, seed + 11) * 0.06),
      shade(base, -0.3 + (hash01(i, seed + 13) - 0.5) * 0.1),
      Math.sin(time * 0.9 + i * 1.9 + seed) * 0.14, alpha * 0.85);
  }
  // Over-layer: brighter ribbons, off-phase.
  const over = 8 + (seed % 3);
  for (let i = 0; i < over; i++) {
    const a = (i / over) * Math.PI * 2 + 0.32 + hash01(i, seed + 17) * 0.4;
    frond(a, o.radius * (0.6 + hash01(i, seed + 19) * 0.32),
      o.radius * (0.16 + hash01(i, seed + 23) * 0.05),
      shade(base, 0.06 + (hash01(i, seed + 29) - 0.5) * 0.14),
      Math.sin(time * 1.15 + i * 2.3 + seed * 0.7) * 0.18, alpha);
  }
  // Gas bladders crowding the crown's heart.
  const bl = resolveColor(p.bladder, theme, shade(base, 0.45));
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = bl;
  for (let i = 0; i < 3 + (seed % 3); i++) {
    const a = hash01(i, seed + 31) * Math.PI * 2;
    const d = o.radius * (0.12 + hash01(i, seed + 37) * 0.2);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1.6 + hash01(i, seed + 41) * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
};

/** THE LIANA CURTAIN — a bough slung across the lane trailing hanging vine
 *  strands: bodies part it (walk-through), eyes do not (its rule blocks
 *  sight), and the occlude fade IS the parting — the strands ghost open for
 *  whoever stands beneath. Strands sway live off-phase; paired leaves ride
 *  each fall; a chance bloom hangs where the light never reaches. */
const lianaCurtain: CanopyPainter = (env, o, alpha, params) => {
  const p = params as { vine?: ColorSpec; leaf?: ColorSpec; bloom?: ColorSpec };
  const { ctx, theme, time } = env;
  const vine = resolveColor(p.vine, theme, shade(theme.tree ?? '#2c4424', -0.12));
  const leaf = resolveColor(p.leaf, theme, shade(theme.tree ?? '#2c4424', 0.2));
  const seed = ((o.pos.x * 11 + o.pos.y * 23) | 0) >>> 0;
  ctx.save();
  ctx.translate(o.pos.x, o.pos.y);
  ctx.rotate(o.rot ?? hash01(seed, 1) * Math.PI);
  ctx.lineCap = 'round';
  // The bough: the dark bar the curtain hangs from.
  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = shade(vine, -0.35);
  ctx.lineWidth = Math.max(2.4, o.radius * 0.1);
  ctx.beginPath();
  ctx.moveTo(-o.radius, 0);
  ctx.quadraticCurveTo(0, -o.radius * 0.14, o.radius, 0);
  ctx.stroke();
  // The strands: each falls from its own point on the bough, bows with its
  // own sway phase, and carries paired leaves sized to its reach.
  const strands = 7 + (seed % 4);
  for (let i = 0; i < strands; i++) {
    const t = (i + 0.5) / strands;
    const x0 = -o.radius + t * o.radius * 2;
    const fall = o.radius * (0.55 + hash01(i, seed + 5) * 0.6);
    const sway = Math.sin(time * 1.1 + i * 1.7 + seed * 0.3) * o.radius * 0.07;
    const tone = i % 2 ? vine : shade(vine, 0.12);
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = tone;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.quadraticCurveTo(x0 + sway * 0.6, fall * 0.55, x0 + sway, fall);
    ctx.stroke();
    // Leaf pairs down the fall.
    ctx.fillStyle = leaf;
    const leaves = 2 + (((seed >> i) & 3) % 2);
    for (let l = 1; l <= leaves; l++) {
      const lt = l / (leaves + 1);
      const lx = x0 + sway * lt * lt, ly = fall * lt;
      const ls = Math.max(1.5, o.radius * 0.07 * (1 - lt * 0.3));
      ctx.globalAlpha = alpha * 0.8;
      ctx.beginPath();
      ctx.ellipse(lx - ls, ly, ls, ls * 0.5, 0.6, 0, Math.PI * 2);
      ctx.ellipse(lx + ls, ly + 1, ls, ls * 0.5, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // The one hanging bloom a curtain sometimes keeps.
    if (p.bloom && hash01(i, seed + 27) < 0.12) {
      ctx.fillStyle = resolveColor(p.bloom, theme, '#c8b0e0');
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath();
      ctx.arc(x0 + sway, fall + 2, Math.max(1.8, o.radius * 0.06), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
};

export const CANOPY_PAINTERS: Record<string, CanopyPainter> = {
  bramble, palmCrown, mushroomCrown, discCrown, leafCrown, pineCrown, fogCloud,
  kelpCrown, lianaCurtain,
};

/** Canopy painters whose pixels are a pure function of (radius, position
 *  seed, params, theme) — no `time` reads — and so bake to variant sprites
 *  (see crownSprite). fogCloud swirls and kelpCrown sways stay live; a new
 *  static painter earns baking by joining this list. A deep forest holds
 *  300-600 crowns in a fullscreen viewport and repainting their lobed
 *  silhouettes live every frame WAS the forest FPS drop — the only per-frame
 *  variable, the veil/proximity fade, is exactly what globalAlpha on a
 *  cached blit expresses. */
export const CANOPY_STATIC: Record<string, boolean> = {
  bramble: true, discCrown: true, leafCrown: true, pineCrown: true,
};

/** Stable small integer for a params object (registry defs are singletons) —
 *  folds param identity into bake keys without stringifying per frame. */
const paramsIds = new WeakMap<object, number>();
let nextParamsId = 1;
function paramsIdOf(p: object): number {
  let id = paramsIds.get(p);
  if (!id) { id = nextParamsId++; paramsIds.set(p, id); }
  return id;
}

/** Theme identity token for bake keys: the palette inputs crown/foliage
 *  painters actually resolve against. */
function themeTokenOf(theme: ZoneTheme): string {
  return `${theme.tree ?? ''}~${theme.grass ?? ''}~${theme.floor}`;
}

const CROWN_VARIANTS = 8;

/** Per-crown variant pick — hash01 (not raw modulo) so lattice-planted
 *  forests can't alias into repeats (the lava-crust tiling lesson). */
export function crownVariantOf(o: Doodad): number {
  return (hash01(o.pos.x * 0.7311, o.pos.y * 0.3917) * CROWN_VARIANTS) | 0;
}

/** Fetch-or-bake one crown sprite by running the REAL canopy painter once
 *  with a fake origin doodad whose position encodes the variant — the
 *  painter's own seed math mints the look, so baked crowns are pixel-true
 *  to the live ones with zero painter changes. */
export function crownSprite(name: string, painter: CanopyPainter, theme: ZoneTheme,
  params: Record<string, unknown>, radius: number, variant: number): HTMLCanvasElement {
  const rq = Math.max(8, Math.round(radius / 5) * 5); // 5px radius buckets
  const size = rq * 2 * 1.5;                          // vines/thorns overreach the disc
  const key = `crown|${name}|${paramsIdOf(params)}|${variant}|${rq}|${themeTokenOf(theme)}`;
  return baked(key, size, size, (ctx) => {
    const fake = {
      kind: '__bake', radius: rq,
      pos: { x: variant * 1327.31 + 11.7, y: variant * 883.57 + 5.3 },
    } as unknown as Doodad;
    // The painter translates to o.pos itself — cancel it so the crown lands
    // at the (already centered) bake origin. time:0 / world:null are safe:
    // static painters read neither (that is what CANOPY_STATIC asserts).
    ctx.translate(-fake.pos.x, -fake.pos.y);
    painter({ ctx, theme, time: 0, world: null as unknown as World }, fake, 1, params);
  });
}

/** Fetch-or-bake a whole GROUND doodad sprite (brush clumps, fern whorls)
 *  through its real group painter — same fake-doodad trick as crownSprite.
 *  Used by the renderer for kinds tagged DoodadVisualDef.bakeWhole. */
export function wholeKindSprite(def: DoodadVisualDef, theme: ZoneTheme,
  radius: number, variant: number): HTMLCanvasElement {
  const painter = PAINTERS[def.painter] ?? PAINTERS.fallback;
  const rq = Math.max(6, Math.round(radius / 4) * 4);
  const size = rq * 2 * 1.7; // fern fronds arc past the disc
  const key = `wk|${def.painter}|${paramsIdOf(def)}|${variant}|${rq}|${themeTokenOf(theme)}`;
  return baked(key, size, size, (ctx) => {
    const fake = {
      kind: '__bake', radius: rq,
      pos: { x: variant * 1531.77 + 7.9, y: variant * 691.13 + 3.1 },
    } as unknown as Doodad;
    ctx.translate(-fake.pos.x, -fake.pos.y);
    painter({ ctx, theme, time: 0, world: null as unknown as World }, [fake], def);
  });
}

/** Painters that draw sun-anchored or upright (ignore o.rot): their baked
 *  blits must not rotate either — a trunk's lit edge would spin off the
 *  global light, a reed stand's blades would tip sideways off the fake-2D
 *  upright convention. */
const PAINTER_IGNORES_ROT: Record<string, boolean> = { trunk: true, kelp: true };

/** Blit a bakeWhole kind group: one image per doodad, sway (if declared) as
 *  a whole-sprite shear — the tuft recipe, generalized to any ground kind
 *  whose painter is time-free (or whose only time input is sway). */
export function paintBakedWhole(env: PaintEnv, group: readonly Doodad[],
  def: DoodadVisualDef): void {
  const { ctx, theme, time } = env;
  const sway = def.bakeWhole === 'sway';
  const spins = !PAINTER_IGNORES_ROT[def.painter];
  ctx.globalAlpha = 1;
  for (const o of group) {
    const variant = (hash01(o.pos.x * 0.531, o.pos.y * 0.877) * CROWN_VARIANTS) | 0;
    const spr = wholeKindSprite(def, theme, o.radius, variant);
    const rq = Math.max(6, Math.round(o.radius / 4) * 4);
    const scale = o.radius / rq;
    const half = (spr.width / 2) * scale;
    const rot = spins && o.rot !== undefined ? o.rot : 0;
    if (rot === 0 && !sway) {
      // Fast path: most doodads need no transform at all — one blit.
      ctx.drawImage(spr, o.pos.x - half, o.pos.y - half, spr.width * scale, spr.height * scale);
      continue;
    }
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    if (sway) {
      const s = Math.sin(time * 1.6 + o.pos.x * 0.05) * 1.4;
      ctx.transform(1, 0, -s / 12, 1, 0, 0);
    }
    if (rot !== 0) ctx.rotate(rot);
    ctx.drawImage(spr, -half, -half, spr.width * scale, spr.height * scale);
    ctx.restore();
  }
}
