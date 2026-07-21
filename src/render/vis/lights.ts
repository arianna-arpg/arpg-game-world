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
import { lightReach, wellDimScale } from '../../engine/lightwells';
import { GridWalkField } from '../../world/gridWalk';
import { STATUS_DEFS } from '../../engine/status';
import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import { MONSTERS } from '../../data/monsters';
import { ORB_DEFS } from '../../data/orbs';
import { courtLord } from '../../packages/courts';
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

/** One clustered STATIC emissive source: same-kind emissive doodads binned
 *  once per zone into aggregates (a lava sea's ~3,000 disc lights collapse
 *  to a few dozen pool glows). Two problems die at once: the per-frame light
 *  count stops fighting the cap, and the capped SELECTION stops reshuffling
 *  as the camera pans — the winking, "strange" light field over dense lava
 *  was cap eviction in cull order, not flicker. */
interface LightCluster {
  x: number; y: number; r: number;
  color: string; intensity: number; flicker?: number;
  /** THE BREATHING LIGHT (LightSpec.radiance) carried onto the cluster —
   *  applied at collect, never baked, so lamps swell and die with the sky. */
  radiance?: { at0?: number; at1?: number };
}

export class LightLayer {
  private buf = document.createElement('canvas');
  private bctx = this.buf.getContext('2d')!;
  private lights: LightSource[] = [];
  private polyCache = new WeakMap<object, PolyCacheEntry>();
  /** Static-emissive clusters, rebuilt when the zone's doodad list changes.
   *  Keyed on identity + length + the mutation rev: the rev catches IN-PLACE
   *  flips (a pooled well attached to an authored doodad at zone load or by
   *  wire adoption) that would otherwise leave the doodad baked bright in a
   *  cluster while it ALSO draws as a live dimming well. */
  private clusters: LightCluster[] = [];
  private clustersFor: unknown = null;
  private clustersLen = -1;
  private clustersRev = -1;
  /** This frame's resolved ambient darkness (rendered + reusable by callers). */
  ambient = 0;

  /** Bin every light-carrying doodad kind into cluster aggregates (bin size
   *  VIS_CFG.lights.clusterBin): centroid position, a radius that covers
   *  every member's own glow, the kind's color/intensity/flicker. Isolated
   *  sources (a lone campfire) become 1:1 clusters — one uniform path. */
  private zoneClusters(world: World): LightCluster[] {
    if (this.clustersFor === world.doodads && this.clustersLen === world.doodads.length
      && this.clustersRev === world.doodadsVersion()) {
      return this.clusters;
    }
    this.clustersFor = world.doodads;
    this.clustersLen = world.doodads.length;
    this.clustersRev = world.doodadsVersion();
    const bin = VIS_CFG.lights.clusterBin;
    type Acc = { sx: number; sy: number; n: number; members: { x: number; y: number; lr: number }[];
      color: string; intensity: number; flicker?: number;
      radiance?: { at0?: number; at1?: number } };
    const bins = new Map<string, Acc>();
    for (const d of world.doodads) {
      const spec = DOODAD_VISUALS[d.kind]?.light;
      if (!spec) continue;
      // Pooled LIGHTWELLS dim per frame — this cache (keyed on list identity
      // + length only) cannot see that, so they bypass clustering entirely
      // and push as live individually-resolved lights in collect().
      if (d.well) continue;
      const lr = spec.radius < 0 ? -spec.radius * d.radius : spec.radius;
      const key = `${d.kind}|${Math.floor(d.pos.x / bin)},${Math.floor(d.pos.y / bin)}`;
      let acc = bins.get(key);
      if (!acc) {
        acc = { sx: 0, sy: 0, n: 0, members: [],
          color: resolveColor(spec.color, world.zone.theme),
          intensity: spec.intensity, flicker: spec.flicker, radiance: spec.radiance };
        bins.set(key, acc);
      }
      acc.sx += d.pos.x; acc.sy += d.pos.y; acc.n++;
      acc.members.push({ x: d.pos.x, y: d.pos.y, lr });
    }
    this.clusters = [];
    for (const acc of bins.values()) {
      const cx = acc.sx / acc.n, cy = acc.sy / acc.n;
      let r = 0;
      for (const m of acc.members) {
        r = Math.max(r, Math.hypot(m.x - cx, m.y - cy) + m.lr);
      }
      this.clusters.push({ x: cx, y: cy, r, color: acc.color, intensity: acc.intensity,
        flicker: acc.flicker, radiance: acc.radiance });
    }
    return this.clusters;
  }

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
    // THE BREATHING LIGHT (LightSpec.radiance): reach + punch lerped on the
    // sky's radiance — nocturnal lamps swell as the light dies, diurnal
    // gleams the other way; under shelter the flat cave twilight holds them
    // half-lit. One sky sample a frame; composes with flicker exactly as
    // flicker composes with the base. A fully-breathed-out lamp skips.
    const skyRad = world.radiance();
    const breathe = (rz?: { at0?: number; at1?: number }): number =>
      rz ? (rz.at0 ?? 1) + ((rz.at1 ?? 1) - (rz.at0 ?? 1)) * skyRad : 1;
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
    // COUCH: every local hero carries the lantern (couchHeroes degenerates to
    // [player] outside couch play — the solo path is byte-identical).
    if (this.ambient > 0.1) {
      for (const hero of (world.couchActive() ? world.couchHeroes() : [world.player])) {
        if (hero.dead) continue;
        push(hero.pos.x, hero.pos.y, VIS_CFG.lights.heroRadius,
          '#ffe8c0', Math.min(0.9, this.ambient + 0.15));
      }
    }
    for (const f of world.flashes) {
      if (f.haze) continue; // refraction, not emission — a haze ring casts no glow
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
    // GLOWING BODIES (MonsterDef.light — the firefly fabric): kin that
    // carry their own lamp join the layer as MOVERS, live-marched like the
    // hero's lantern and pushed here so terrain emissives can never starve
    // them out of the cap. Dead bodies shed nothing; a concealed body
    // (StatusDef.conceals — the swallowed) keeps its light swallowed too.
    for (const a of world.actors) {
      if (a.dead || !a.defId) continue;
      const spec = MONSTERS[a.defId]?.light;
      if (!spec) continue;
      const br = breathe(spec.radiance);
      if (br <= 0.02) continue;
      if (a.statuses.some(s => STATUS_DEFS[s.id]?.conceals)) continue;
      const flick = spec.flicker
        ? 0.82 + 0.18 * Math.sin(world.time * spec.flicker + a.id * 0.61) : 1;
      const r = (spec.radius < 0 ? -spec.radius * a.radius : spec.radius) * flick * br;
      push(a.pos.x, a.pos.y, r, resolveColor(spec.color, world.zone.theme),
        spec.intensity * flick * br);
    }

    // POOLED LIGHTWELLS (engine/lightwells.ts) — survival infrastructure,
    // pushed right after the movers so terrain emissives can never starve
    // them out of the cap. Reach + intensity resolve through lightReach /
    // wellDimScale — THE resolver the engine's residence test also rides,
    // so the pool of light the player sees is exactly the ground that
    // feeds them (drawn == tested). Position is static: the occlusion poly
    // caches per grid version at the UN-dimmed reach (its widest).
    for (const d of world.lightwellDoodads()) {
      if (!d.well) continue; // steady rows stay clustered
      const spec = DOODAD_VISUALS[d.kind]?.light;
      if (!spec) continue;
      const reach = lightReach(d);
      if (reach === null || reach <= 0) continue;
      const dim = wellDimScale(d);
      const br = breathe(spec.radiance);
      if (br <= 0.02) continue;
      const flick = spec.flicker
        ? 0.82 + 0.18 * Math.sin(world.time * spec.flicker + d.pos.x * 0.13) : 1;
      const baseR = spec.radius < 0 ? -spec.radius * d.radius : spec.radius;
      push(d.pos.x, d.pos.y, reach * flick * br, resolveColor(spec.color, world.zone.theme),
        spec.intensity * dim * flick * br, d, baseR);
    }

    // Zone exits breathe their accent so the way out reads in the dark.
    for (const e of world.exits) {
      push(e.pos.x, e.pos.y, 85, world.zone.theme.accent, 0.3, e);
    }

    // OPEN ENCOUNTER FIELDS (the breach): the tear's own unlight pools over
    // the uncovered ground — lord-tinted where a court rolled — and a
    // standing court door burns like the threshold it is. Movers (the ring
    // breathes every frame), so they live-march like flashes do.
    const EC = VIS_CFG.lights.encounter;
    for (const enc of world.encountersView()) {
      if (enc.phase === 'open' || enc.phase === 'collapsing') {
        const c = (enc.lordId ? courtLord(enc.lordId)?.color : undefined) ?? enc.def.trigger.color;
        push(enc.pos.x, enc.pos.y, Math.min(enc.radius, EC.radiusCap), c, EC.intensity);
      } else if (enc.phase === 'door' && enc.doorAt) {
        const c = (enc.lordId ? courtLord(enc.lordId)?.color : undefined) ?? enc.def.trigger.color;
        push(enc.doorAt.x, enc.doorAt.y, EC.doorRadius, c, EC.doorIntensity);
      }
    }

    // Doodad emissives — declared per kind in DOODAD_VISUALS.light, served
    // as per-zone CLUSTERS (see zoneClusters) so a poured lava sea reads as
    // a few dozen stable pool glows instead of thousands of cap-fighting
    // point lights. The legacy per-disc path stays behind the config lever.
    const t = world.time;
    if (VIS_CFG.lights.cluster) {
      for (const c of this.zoneClusters(world)) {
        const br = breathe(c.radiance);
        if (br <= 0.02) continue;
        const flick = c.flicker
          ? 0.82 + 0.18 * Math.sin(t * c.flicker + c.x * 0.13) : 1;
        // The occlusion poly caches at the UN-flickered, UN-breathed reach
        // (its widest); flicker + breath animate brightness + blit size,
        // never the ray march.
        push(c.x, c.y, c.r * flick * br, c.color, c.intensity * flick * br, c, c.r);
      }
    } else {
      for (const [kind, list] of culled) {
        const spec = DOODAD_VISUALS[kind]?.light;
        if (!spec) continue;
        const br = breathe(spec.radiance);
        if (br <= 0.02) continue;
        const color = resolveColor(spec.color, world.zone.theme);
        for (const d of list) {
          const r = spec.radius < 0 ? -spec.radius * d.radius : spec.radius;
          const flick = spec.flicker
            ? 0.82 + 0.18 * Math.sin(t * spec.flicker + d.pos.x * 0.13) : 1;
          push(d.pos.x, d.pos.y, r * flick * br, color, spec.intensity * flick * br, d, r);
        }
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
    // THE GLOAMING: the dark that EATS light — deeper than any natural hour,
    // even at noon. One eased scalar from the engine (gloom × its ceiling).
    const gloom = world.gloomDarkness();
    if (gloom > 0) dark = Math.max(dark, gloom);
    if (world.descentView()) dark = Math.min(dark, 0.12);
    return Math.min(0.92, dark);
  }
}

/** Small helper for callers that only need a wash: rgba of the night tint. */
export function nightTint(alpha: number): string {
  return withAlpha('#0c1028', alpha);
}
