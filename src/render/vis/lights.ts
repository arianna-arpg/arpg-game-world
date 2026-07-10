// ---------------------------------------------------------------------------
// THE LIGHT LAYER — a low-res darkness buffer modulated by the day/night
// cycle (plus an optional per-zone ambient floor), punched through by every
// light source in view, then stretched over the scene; an additive bloom
// pass on top makes emissives glow. Sources are DATA: doodad kinds declare
// light in DOODAD_VISUALS, projectiles/flashes/exits contribute their own
// colors, and the hero carries a lantern-glow after dark. Nothing here
// enumerates kinds.
//
// Deliberately cheap: the buffer renders at a fraction of the screen, light
// counts are capped, and everything skips when the scene is fully lit.
// ---------------------------------------------------------------------------

import type { World } from '../../engine/world';
import { dayCycle } from '../../world/daynight';
import type { Doodad } from '../../engine/levelgen';
import { GridWalkField } from '../../world/gridWalk';
import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import { ORB_DEFS } from '../../data/orbs';
import { withAlpha } from './color';
import { resolveColor } from './painters';
import { litPolygon, polygonPath } from './sight';
import { baked, drawGlow } from './sprites';
import { VIS_CFG } from './visConfig';

interface LightSource {
  x: number; y: number; r: number;
  color: string;
  intensity: number;
  /** Wall-occluded reach (vis/sight.ts); absent = plain disc. */
  poly?: { x: number; y: number }[];
}

/** Cached wall-occlusion polygon of a STATIC light (a doodad, an exit): the
 *  source never moves and the walls only change when the walk grid repaints,
 *  so the 48-ray march re-runs only on a grid version bump — not per frame,
 *  which at the 72-light cap was ~3,500 ray marches a frame in a walled zone. */
interface PolyCacheEntry { v: number; poly: { x: number; y: number }[] | null }

export class LightLayer {
  private buf = document.createElement('canvas');
  private bctx = this.buf.getContext('2d')!;
  private lights: LightSource[] = [];
  private polyCache = new WeakMap<object, PolyCacheEntry>();
  /** This frame's resolved ambient darkness (rendered + reusable by callers). */
  ambient = 0;

  /** The darkness punch profile is one fixed falloff scaled by intensity —
   *  baked once; per-light rendering is a destination-out blit. */
  private punchSprite(): HTMLCanvasElement {
    return baked('lightPunch', 64, 64, (ctx) => {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 32);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.478)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-32, -32, 64, 64);
    });
  }

  /** A static source's occlusion poly, re-marched only when the grid repaints. */
  private staticPoly(world: World, key: object, x: number, y: number, r: number):
    { x: number; y: number }[] | undefined {
    const ver = world.walk instanceof GridWalkField ? world.walk.version : 0;
    const hit = this.polyCache.get(key);
    if (hit && hit.v === ver) return hit.poly ?? undefined;
    const poly = litPolygon(world, x, y, r);
    this.polyCache.set(key, { v: ver, poly });
    return poly ?? undefined;
  }

  /** Gather every light in view. Call AFTER the doodad cull (the culled map
   *  is the view-clipped set) and BEFORE render(). */
  collect(world: World, culled: ReadonlyMap<string, readonly Doodad[]>,
    camX: number, camY: number, vw: number, vh: number): void {
    this.lights.length = 0;
    this.ambient = this.ambientDark(world);
    const cap = VIS_CFG.lights.maxLights;
    // Fully lit scene → only bloom draws (intensity ≥ 0.25); dimmer lights
    // can't render at all this frame, so don't collect (or march rays for) them.
    const minIntensity = this.ambient <= 0.02 ? 0.25 : 0.01;
    const inView = (x: number, y: number, r: number): boolean =>
      x + r > camX && x - r < camX + vw && y + r > camY && y - r < camY + vh;
    const push = (x: number, y: number, r: number, color: string, intensity: number,
      polyKey?: object, polyR?: number): LightSource | null => {
      if (this.lights.length >= cap || intensity < minIntensity || r <= 1) return null;
      if (!inView(x, y, r)) return null;
      const L: LightSource = { x, y, r, color, intensity: Math.min(1, intensity) };
      // WALL OCCLUSION: the light's true reach against sight-blocking cells —
      // glow pools at a wall instead of punching through it (null = open
      // ground, keep the plain disc). Static sources ride the version cache
      // (marched at their widest reach, polyR); movers (projectiles, flashes,
      // the hero) re-march live — they're few.
      L.poly = polyKey
        ? this.staticPoly(world, polyKey, x, y, polyR ?? r)
        : litPolygon(world, x, y, r) ?? undefined;
      this.lights.push(L);
      return L;
    };

    // MOVERS FIRST: the hero's lantern, combat flashes and projectiles must
    // never be starved out of the cap by a field of emissive terrain (a lava
    // carpet used to eat all 72 slots before the lantern got its turn).
    if (this.ambient > 0.1 && !world.player.dead) {
      push(world.player.pos.x, world.player.pos.y, VIS_CFG.lights.heroRadius,
        '#ffe8c0', Math.min(0.9, this.ambient + 0.15));
    }
    for (const f of world.flashes) {
      const k = f.maxLife > 0 ? f.life / f.maxLife : 0;
      push(f.pos.x, f.pos.y, f.radius * 1.5, f.color, 0.5 * k);
    }
    for (const p of world.projectiles) {
      push(p.pos.x, p.pos.y, p.radius * 8, p.color, 0.3);
    }
    // Orb kinds that declare a light carry a real candle (wakeflames in the
    // dark) — movers like projectiles, fading out with their last seconds.
    for (const o of world.orbs) {
      const r = ORB_DEFS[o.kind]?.light;
      if (!r) continue;
      push(o.pos.x, o.pos.y, r, ORB_DEFS[o.kind].color,
        0.4 * Math.min(1, o.life / 2));
    }

    // Zone exits breathe their accent so the way out reads in the dark.
    for (const e of world.exits) {
      push(e.pos.x, e.pos.y, 85, world.zone.theme.accent, 0.3, e);
    }

    // Doodad emissives — declared per kind in DOODAD_VISUALS.light.
    const t = world.time;
    for (const [kind, list] of culled) {
      const spec = DOODAD_VISUALS[kind]?.light;
      if (!spec) continue;
      const color = resolveColor(spec.color, world.zone.theme);
      for (const d of list) {
        const r = spec.radius < 0 ? -spec.radius * d.radius : spec.radius;
        const flick = spec.flicker
          ? 0.82 + 0.18 * Math.sin(t * spec.flicker + d.pos.x * 0.13) : 1;
        // The occlusion poly caches at the UN-flickered reach (its widest);
        // the flicker animates brightness + blit size, not the ray march.
        push(d.pos.x, d.pos.y, r * flick, color, spec.intensity * flick, d, r);
      }
    }
  }

  /** Composite the darkness + bloom over the drawn world. Call with the
   *  UNTRANSFORMED context (screen space), after the world layer. */
  render(ctx: CanvasRenderingContext2D, camX: number, camY: number,
    zoom: number, w: number, h: number): void {
    const dark = this.ambient;
    if (dark <= 0.02) {
      // Fully lit: no darkness pass; still bloom strong emissives faintly so
      // lava mouths and crystals read even at noon.
      this.bloom(ctx, camX, camY, zoom, 0.35);
      return;
    }
    const scale = VIS_CFG.lights.scale;
    const bw = Math.max(2, Math.ceil(w * scale)), bh = Math.max(2, Math.ceil(h * scale));
    if (this.buf.width !== bw || this.buf.height !== bh) {
      this.buf.width = bw; this.buf.height = bh;
    }
    const b = this.bctx;
    b.globalCompositeOperation = 'source-over';
    b.clearRect(0, 0, bw, bh);
    // The night itself: a cold, slightly blue dark (never pure black — the
    // world stays readable, it just stops being day).
    b.fillStyle = `rgba(6,8,18,${dark.toFixed(3)})`;
    b.fillRect(0, 0, bw, bh);
    // Punch the lights through — one baked falloff sprite, alpha-scaled per
    // light (the profile's two live stops both scale with intensity, so a
    // single sprite replaces a per-light per-frame gradient allocation).
    b.globalCompositeOperation = 'destination-out';
    const punch = this.punchSprite();
    const k = zoom * scale;
    for (const L of this.lights) {
      const sx = (L.x - camX) * k, sy = (L.y - camY) * k, sr = Math.max(1, L.r * k);
      if (L.poly) {
        b.save();
        b.clip(polygonPath(L.poly, x => (x - camX) * k, y => (y - camY) * k));
      }
      b.globalAlpha = Math.min(1, L.intensity * 1.15);
      b.drawImage(punch, sx - sr, sy - sr, sr * 2, sr * 2);
      if (L.poly) b.restore();
    }
    b.globalAlpha = 1;
    b.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.buf, 0, 0, bw, bh, 0, 0, w, h);
    ctx.restore();
    this.bloom(ctx, camX, camY, zoom, VIS_CFG.lights.bloomAlpha * (0.5 + dark * 0.5));
  }

  /** Additive color bloom on strong sources — the emissive shimmer. */
  private bloom(ctx: CanvasRenderingContext2D, camX: number, camY: number,
    zoom: number, strength: number): void {
    if (strength <= 0.02) return;
    for (const L of this.lights) {
      if (L.intensity < 0.25) continue;
      const sx = (L.x - camX) * zoom, sy = (L.y - camY) * zoom;
      if (L.poly) {
        ctx.save();
        ctx.clip(polygonPath(L.poly, x => (x - camX) * zoom, y => (y - camY) * zoom));
        drawGlow(ctx, sx, sy, L.r * zoom * 0.6, L.color, strength * L.intensity * 0.5);
        ctx.restore();
      } else {
        drawGlow(ctx, sx, sy, L.r * zoom * 0.6, L.color, strength * L.intensity * 0.5);
      }
    }
  }

  /** How dark the world is right now: the night curve, lifted by a zone's
   *  own ambient floor (caves are dark at noon), tempered where another
   *  system owns the dark (the Descent's survival vignette). */
  private ambientDark(world: World): number {
    const night = 1 - dayCycle(world.time).light;
    // Ease the curve so dusk arrives gently and deep night lands hard.
    // Per-biome depth: a canopied forest's night is not a steppe's
    // (ZoneTheme.nightDark overrides the global lever).
    let dark = (world.zone.theme.nightDark ?? VIS_CFG.lights.nightDark)
      * night * night * (3 - 2 * night);
    const floor = world.zone.theme.ambientDark;
    if (floor !== undefined) dark = Math.max(dark, floor);
    if (world.descentView()) dark = Math.min(dark, 0.12);
    return Math.min(0.92, dark);
  }
}

/** Small helper for callers that only need a wash: rgba of the night tint. */
export function nightTint(alpha: number): string {
  return withAlpha('#0c1028', alpha);
}
