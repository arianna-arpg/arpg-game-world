import { withVisibilityComposite } from './visibilityComposite';
import { beginVisibilityFrame, visibilityDiagnosticsEnabled, visibilityRecord, visibilityMask } from './visibilityDiagnostics';
import { visibilityRaster, type VisibilityRasterView } from './visibilityRaster';
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
// transient combat lights are capped, static geometry is cached, and the
// darkness sheet skips when the scene is fully lit.
// ---------------------------------------------------------------------------

import type { World } from '../../engine/world';
import { presenceProfile } from '../../data/skillPresenceVisuals';
import { dayCycle, sceneSkyTime } from '../../world/daynight';
import type { Doodad } from '../../engine/levelgen';
import { lightReach, wellDimScale } from '../../engine/lightwells';
import { STATUS_DEFS } from '../../engine/status';
import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import { MONSTERS } from '../../data/monsters';
import { ORB_DEFS } from '../../data/orbs';
import { courtLord } from '../../packages/courts';
import { registerDoodadFamily } from '../../engine/doodadFamilies';
import { withAlpha } from './color';
import { resolveColor } from './painters';
import { LightSightCache, litPolygon, polyMinEnd, worldPolyPath } from './sight';
import { baked, glowSprite } from './sprites';
import { VIS_CFG } from './visConfig';
import { drawReadableLightMask } from './readableLight';
import type { CombatRect } from './combatFocus';
import { storyPointVisible } from './storyVisibility';

// The cluster cache re-derives only when a LIGHT-bearing doodad changes —
// the exact filter zoneClusters gathers with (scoped invalidation:
// engine/doodadFamilies.ts). Corpse mints, drying non-lit dress and the
// like no longer rebuild the lit field every churn frame.
registerDoodadFamily('light', (k) => !!DOODAD_VISUALS[k]?.light);

interface LightSource {
  x: number; y: number; r: number;
  color: string;
  intensity: number;
  /** Wall-occluded reach (vis/sight.ts); absent = plain disc. */
  poly?: { x: number; y: number }[];
}

/** One clustered STATIC emissive source: same-kind emissive doodads binned
 *  once per zone into aggregates (a lava sea's ~3,000 disc lights collapse
 *  to a few dozen pool glows). Two problems die at once: the per-frame light
 *  count stops fighting the cap, and the capped SELECTION stops reshuffling
 *  as the camera pans — the winking, "strange" light field over dense lava
 *  was cap eviction in cull order, not flicker. */
interface LightCluster {
  tier: number;
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
  private polyCache = new LightSightCache();
  /** Static-emissive clusters, rebuilt when the zone's doodad list changes.
   *  Keyed on identity + length + the mutation rev: the rev catches IN-PLACE
   *  flips (a pooled well attached to an authored doodad at zone load or by
   *  wire adoption) that would otherwise leave the doodad baked bright in a
   *  cluster while it ALSO draws as a live dimming well. */
  private clusters: LightCluster[] = [];
  private clustersByRegion = new Map<string, { sig: number; count: number; clusters: LightCluster[] }>();
  private clustersFor: unknown = null;
  private clustersLen = -1;
  private clustersRev = -1;
  private clustersTier = -1;
  /** This frame's resolved ambient darkness (rendered + reusable by callers). */
  ambient = 0;

  /** Bin every light-carrying doodad kind into cluster aggregates (bin size
   *  VIS_CFG.lights.clusterBin): centroid position, a radius that covers
   *  every member's own glow, the kind's color/intensity/flicker. Isolated
   *  sources (a lone campfire) become 1:1 clusters — one uniform path.
   *  Partitioned per `d.regionId` so background neighbor streaming keeps
   *  existing `LightCluster` object identities (and their cached raycast polys!)
   *  warm in every unchanged region. */
  private zoneClusters(world: World, stacks: Parameters<typeof storyPointVisible>[3]): LightCluster[] {
    const rev = world.doodadFamilyRev('light');
    if (this.clustersFor === world.doodads && this.clustersLen === world.doodads.length
      && this.clustersRev === rev && this.clustersTier === world.player.tier) {
      return this.clusters;
    }
    const tierChanged = this.clustersTier !== world.player.tier;
    this.clustersFor = world.doodads;
    this.clustersLen = world.doodads.length;
    this.clustersRev = rev;
    this.clustersTier = world.player.tier;
    if (tierChanged) this.clustersByRegion.clear();

    const bin = VIS_CFG.lights.clusterBin;
    type RegGather = { sig: number; count: number; items: Doodad[] };
    const byReg = new Map<string, RegGather>();
    for (const d of world.doodads) {
      const spec = DOODAD_VISUALS[d.kind]?.light;
      if (!spec || d.felled || d.well) continue;
      if (!storyPointVisible(world, d.pos, d.tier ?? 0, stacks)) continue;
      const rk = d.regionId ?? '';
      let g = byReg.get(rk);
      if (!g) { g = { sig: 2166136261, count: 0, items: [] }; byReg.set(rk, g); }
      g.count++;
      g.sig = Math.imul(g.sig ^ (Math.round(d.pos.x * 8) | 0), 16777619) >>> 0;
      g.sig = Math.imul(g.sig ^ (Math.round(d.pos.y * 8) | 0), 16777619) >>> 0;
      g.sig = Math.imul(g.sig ^ (Math.round(d.radius * 8) | 0), 16777619) >>> 0;
      g.items.push(d);
    }

    for (const oldKey of [...this.clustersByRegion.keys()]) {
      if (!byReg.has(oldKey)) this.clustersByRegion.delete(oldKey);
    }

    type Acc = { tier: number; sx: number; sy: number; n: number; members: { x: number; y: number; lr: number }[];
      color: string; intensity: number; flicker?: number;
      radiance?: { at0?: number; at1?: number } };
    this.clusters = [];
    for (const [rk, g] of byReg) {
      const prev = this.clustersByRegion.get(rk);
      if (prev && prev.count === g.count && prev.sig === g.sig) {
        this.clusters.push(...prev.clusters);
        continue;
      }
      const bins = new Map<string, Acc>();
      for (const d of g.items) {
        const spec = DOODAD_VISUALS[d.kind]!.light!;
        const lr = spec.radius < 0 ? -spec.radius * d.radius : spec.radius;
        const key = `${d.kind}|${d.tier ?? 0}|${Math.floor(d.pos.x / bin)},${Math.floor(d.pos.y / bin)}`;
        let acc = bins.get(key);
        if (!acc) {
          const th = d.regionTheme ?? world.zone.theme;
          acc = { tier: d.tier ?? 0, sx: 0, sy: 0, n: 0, members: [],
            color: resolveColor(spec.color, th),
            intensity: spec.intensity, flicker: spec.flicker, radiance: spec.radiance };
          bins.set(key, acc);
        }
        acc.sx += d.pos.x; acc.sy += d.pos.y; acc.n++;
        acc.members.push({ x: d.pos.x, y: d.pos.y, lr });
      }
      const regClusters: LightCluster[] = [];
      for (const acc of bins.values()) {
        const cx = acc.sx / acc.n, cy = acc.sy / acc.n;
        let r = 0;
        for (const m of acc.members) {
          r = Math.max(r, Math.hypot(m.x - cx, m.y - cy) + m.lr);
        }
        regClusters.push({ tier: acc.tier, x: cx, y: cy, r, color: acc.color, intensity: acc.intensity,
          flicker: acc.flicker, radiance: acc.radiance });
      }
      this.clustersByRegion.set(rk, { sig: g.sig, count: g.count, clusters: regClusters });
      this.clusters.push(...regClusters);
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

  /** Reuse source geometry until terrain, source position, reach or floor changes. */
  private staticPoly(world: World, key: object, x: number, y: number, r: number, tier: number):
    { x: number; y: number }[] | undefined {
    return this.polyCache.read(world, key, x, y, r, tier) ?? undefined;
  }

  /** Gather every light in view. Call AFTER the doodad cull (the culled map
   *  is the view-clipped set) and BEFORE render(). */
  collect(world: World, culled: ReadonlyMap<string, readonly Doodad[]>,
    camX: number, camY: number, vw: number, vh: number): void {
    const started = visibilityDiagnosticsEnabled ? performance.now() : 0;
    beginVisibilityFrame(world, { x:camX, y:camY, w:vw, h:vh });
    this.lights.length = 0;
    const stacks = world.zone.tiers?.interior ? world.storeyedStructures() : [];
    this.ambient = this.ambientDark(world);
    let transientCount = 0;
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
    // THE SHARE LAW (VIS_CFG.lights.share): each MOVER class spends its own
    // lane of the budget — a volley of thirty lava orbs can no longer evict
    // the terrain clusters collected after it (the winking lava sea was cap
    // starvation by class, not flicker). Unshared classes pass undefined.
    const share = VIS_CFG.lights.share as Record<string, number | undefined>;
    const used: Record<string, number> = {};
    const push = (x: number, y: number, r: number, color: string, intensity: number,
      polyKey?: object, polyR?: number, cls?: string, tier = 0): LightSource | null => {
      if (![x, y, r, intensity].every(Number.isFinite) || intensity < minIntensity || r <= 1) return null;
      if (cls !== undefined && (transientCount >= VIS_CFG.lights.maxLights
        || (used[cls] ?? 0) >= (share[cls] ?? Infinity))) return null;
      if (!inView(x, y, r)) return null;
      if (cls !== undefined) { used[cls] = (used[cls] ?? 0) + 1; transientCount++; }
      const L: LightSource = { x, y, r, color, intensity: Math.min(1, intensity) };
      // WALL OCCLUSION: the light's true reach against sight-blocking cells —
      // glow pools at a wall instead of punching through it (null = open
      // ground, keep the plain disc). Static sources ride the version cache
      // (marched at their widest reach, polyR). Moving sources invalidate on
      // actual position/range changes; a stationary caster pays no recast.
      L.poly = polyKey
        ? this.staticPoly(world, polyKey, x, y, polyR ?? r, tier)
        : litPolygon(world, x, y, r, tier) ?? undefined;
      this.lights.push(L);
      return L;
    };

    // Persistent lights have independent spatial admission. Combat flashes
    // and projectile lights spend only their own transient budgets.
    // COUCH: every local hero carries the lantern (couchHeroes degenerates to
    // [player] outside couch play — the solo path is byte-identical).
    if (this.ambient > 0.1) {
      for (const hero of (world.couchActive() ? world.couchHeroes() : [world.player])) {
        if (hero.dead || !storyPointVisible(world, hero.pos, hero.tier, stacks)) continue;
        push(hero.pos.x, hero.pos.y, VIS_CFG.lights.heroRadius,
          '#ffe8c0', Math.min(0.9, this.ambient + 0.15) * Math.min(1, (this.ambient - 0.1) / 0.1),
          hero, VIS_CFG.lights.heroRadius, undefined, hero.tier);
      }
    }
    // Newest-first: under the class share the FRESH explosion keeps its
    // light — the near-spent ember is the one that yields.
    for (let i = world.flashes.length - 1; i >= 0; i--) {
      const f = world.flashes[i];
      if (!inView(f.pos.x, f.pos.y, f.radius * 1.5)) continue;
      if (f.recoveryCueTier !== undefined && !storyPointVisible(world, f.pos, f.recoveryCueTier, stacks)) continue;
      if (f.haze || f.departure || f.cosmeticMotif || f.lightning || f.movement
        || f.fx?.startsWith('skillPresence:') && !(f.fx.startsWith('skillPresence:pulse:') && presenceProfile(f.fx.split(':')[2])?.family === 'storm')
        || f.fx?.startsWith('skillSelf:') && !f.fx.startsWith('skillSelf:burst:')
        || f.fx?.startsWith('skillMove:') && !f.fx.startsWith('skillMove:impact:')) continue; // decorative trails never displace combat lights
      const k = f.maxLife > 0 ? f.life / f.maxLife : 0;
      push(f.pos.x, f.pos.y, f.radius * 1.5, f.color, 0.5 * k, f, undefined, 'flashes', f.recoveryCueTier ?? world.spoilStoryAt(f.pos));
    }
    for (const p of world.projectiles) {
      if (!inView(p.pos.x, p.pos.y, p.radius * 8)) continue;
      if (!storyPointVisible(world, p.pos, p.tier ?? 0, stacks)) continue;
      push(p.pos.x, p.pos.y, p.radius * 8, p.color, 0.3, p, undefined, 'projectiles', p.tier ?? 0);
    }
    // Orb kinds that declare a light carry a real candle (wakeflames in the
    // dark) — movers like projectiles, fading out with their last seconds.
    for (const o of world.orbs) {
      const r = ORB_DEFS[o.kind]?.light;
      if (!r || !inView(o.pos.x, o.pos.y, r)) continue;
      if (!storyPointVisible(world, o.pos, o.tier ?? world.spoilStoryAt(o.pos), stacks)) continue;
      push(o.pos.x, o.pos.y, r, ORB_DEFS[o.kind].color,
        0.4 * Math.min(1, o.life / 2), o, undefined, 'orbs', o.tier ?? world.spoilStoryAt(o.pos));
    }
    // GLOWING BODIES (MonsterDef.light — the firefly fabric)
    for (const a of world.actors) {
      if (a.dead) continue;
      const spec = a.carriedLamp ?? (a.defId ? MONSTERS[a.defId]?.light : undefined);
      if (!spec) continue;
      const maxR = (spec.radius < 0 ? -spec.radius * a.radius : spec.radius) * 1.25;
      if (!inView(a.pos.x, a.pos.y, maxR)) continue;
      if (!storyPointVisible(world, a.pos, a.tier, stacks)) continue;
      const br = breathe(spec.radiance);
      if (br <= 0.02) continue;
      if (a.statuses.some(s => STATUS_DEFS[s.id]?.conceals)) continue;
      const flick = spec.flicker
        ? 0.82 + 0.18 * Math.sin(world.time * spec.flicker + a.id * 0.61) : 1;
      const baseR = spec.radius < 0 ? -spec.radius * a.radius : spec.radius;
      const r = baseR * flick * br;
      push(a.pos.x, a.pos.y, r, resolveColor(spec.color, world.zone.theme),
        spec.intensity * flick * br, a, baseR * 1.2, undefined, a.tier);
    }

    // POOLED LIGHTWELLS (engine/lightwells.ts) — survival infrastructure,
    // independent of transient combat admission. Reach + intensity resolve through lightReach /
    // wellDimScale — THE resolver the engine's residence test also rides,
    // so the pool of light the player sees is exactly the ground that
    // feeds them (drawn == tested). Position is static: the occlusion poly
    // caches per grid version at the UN-dimmed reach (its widest).
    for (const d of world.lightwellDoodads()) {
      if (!storyPointVisible(world, d.pos, d.tier ?? 0, stacks)) continue;
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
        spec.intensity * dim * flick * br, d, baseR, undefined, d.tier ?? 0);
    }

    // Zone exits breathe their accent so the way out reads in the dark.
    for (const e of world.exits) {
      if (!storyPointVisible(world, e.pos, world.spoilStoryAt(e.pos), stacks)) continue;
      push(e.pos.x, e.pos.y, 85, world.zone.theme.accent, 0.3, e, undefined, undefined, world.spoilStoryAt(e.pos));
    }

    // OPEN ENCOUNTER FIELDS (the breach): the tear's own unlight pools over
    // the uncovered ground — lord-tinted where a court rolled — and a
    // standing court door burns like the threshold it is. Movers (the ring
    // breathes every frame), so they live-march like flashes do.
    const EC = VIS_CFG.lights.encounter;
    for (const enc of world.encountersView()) {
      if (!storyPointVisible(world, enc.pos, world.spoilStoryAt(enc.pos), stacks)) continue;
      if (enc.phase === 'open' || enc.phase === 'collapsing') {
        const c = (enc.lordId ? courtLord(enc.lordId)?.color : undefined) ?? enc.def.trigger.color;
        push(enc.pos.x, enc.pos.y, Math.min(enc.radius, EC.radiusCap), c, EC.intensity, enc, undefined, undefined, world.spoilStoryAt(enc.pos));
      } else if (enc.phase === 'door' && enc.doorAt) {
        const c = (enc.lordId ? courtLord(enc.lordId)?.color : undefined) ?? enc.def.trigger.color;
        push(enc.doorAt.x, enc.doorAt.y, EC.doorRadius, c, EC.doorIntensity, enc, undefined, undefined, world.spoilStoryAt(enc.doorAt));
      }
    }

    // Doodad emissives — declared per kind in DOODAD_VISUALS.light, served
    // as per-zone CLUSTERS (see zoneClusters) so a poured lava sea reads as
    // a few dozen stable pool glows instead of thousands of cap-fighting
    // point lights. The legacy per-disc path stays behind the config lever.
    const t = world.time;
    if (VIS_CFG.lights.cluster) {
      // Persistent terrain is view-culled, never evicted by transient combat
      // or a quantized camera ranking. Its terrain polygons remain cached.
      const cands: { c: LightCluster; r: number; k: number }[] = [];
      for (const c of this.zoneClusters(world, stacks)) {
        const br = breathe(c.radiance);
        if (br <= 0.02) continue;
        const flick = c.flicker
          ? 0.82 + 0.18 * Math.sin(t * c.flicker + c.x * 0.13) : 1;
        const rr = c.r * flick * br;
        if (!inView(c.x, c.y, rr)) continue;
        cands.push({ c, r: rr, k: flick * br });
      }
      for (const cd of cands) {
        // The occlusion poly caches at the UN-flickered, UN-breathed reach
        // (its widest); flicker + breath animate brightness + blit size,
        // never the ray march.
        push(cd.c.x, cd.c.y, cd.r, cd.c.color, cd.c.intensity * cd.k, cd.c, cd.c.r, undefined, cd.c.tier);
      }
    } else {
      for (const [kind, list] of culled) {
        const spec = DOODAD_VISUALS[kind]?.light;
        if (!spec) continue;
        const br = breathe(spec.radiance);
        if (br <= 0.02) continue;
        const color = resolveColor(spec.color, world.zone.theme);
        for (const d of list) {
          if (d.felled || !storyPointVisible(world, d.pos, d.tier ?? 0, stacks)) continue;
          const r = spec.radius < 0 ? -spec.radius * d.radius : spec.radius;
          const flick = spec.flicker
            ? 0.82 + 0.18 * Math.sin(t * spec.flicker + d.pos.x * 0.13) : 1;
          push(d.pos.x, d.pos.y, r * flick * br, color, spec.intensity * flick * br, d, r, undefined, d.tier ?? 0);
        }
      }
    }
    if (visibilityDiagnosticsEnabled) visibilityRecord('lighting', { collectMs:performance.now()-started,
      ambient:this.ambient, total:this.lights.length, transient:transientCount,
      sources:this.lights.map(l=>({x:l.x,y:l.y,r:l.r,intensity:l.intensity,clipped:!!l.poly})) });
  }

  /** Composite the darkness + bloom over the drawn world. Call with the
   *  UNTRANSFORMED context (screen space), after the world layer. */
  render(ctx: CanvasRenderingContext2D, camX: number, camY: number,
    zoom: number, w: number, h: number, readable: readonly CombatRect[] = [], rasterView?: VisibilityRasterView): void {
    withVisibilityComposite(ctx, () => {
      this.renderLayer(ctx, camX, camY, zoom, w, h, readable, rasterView);
    });
  }

  private renderLayer(ctx: CanvasRenderingContext2D, camX: number, camY: number,
    zoom: number, w: number, h: number, readable: readonly CombatRect[], rasterView?: VisibilityRasterView): void {
    const started = visibilityDiagnosticsEnabled ? performance.now() : 0;
    const dark = this.ambient;
    if (dark <= 0.02) {
      // Fully lit: no darkness pass; still bloom strong emissives faintly so
      // lava mouths and crystals read even at noon.
      this.bloom(ctx, camX, camY, zoom, 0.35);
      if (visibilityDiagnosticsEnabled) visibilityRecord('lightDrawMs', performance.now()-started);
      return;
    }
    const { width:bw, height:bh, k } = visibilityRaster(w,h,zoom,VIS_CFG.lights.scale,rasterView);
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
    for (const L of this.lights) {
      const sr = Math.max(1, L.r * k);
      const needsClip = !!L.poly && polyMinEnd(L.poly) < L.r;
      if (needsClip) {
        b.save();
        b.setTransform(k, 0, 0, k, -camX * k, -camY * k);
        b.clip(worldPolyPath(L.poly!));
        b.setTransform(1, 0, 0, 1, 0, 0);
      }
      const sx = (L.x - camX) * k, sy = (L.y - camY) * k;
      b.globalAlpha = Math.min(1, L.intensity * 1.15);
      b.drawImage(punch, sx - sr, sy - sr, sr * 2, sr * 2);
      if (needsClip) b.restore();
    }
    drawReadableLightMask(b, readable, dark, camX, camY, k);
    b.globalAlpha = 1;
    b.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.buf, 0, 0, bw, bh, 0, 0, w, h);
    ctx.restore();
    this.bloom(ctx, camX, camY, zoom, VIS_CFG.lights.bloomAlpha * (0.5 + dark * 0.5));
    if (visibilityDiagnosticsEnabled) {
      visibilityRecord("lightDrawMs", performance.now()-started);
      visibilityMask("lightMask",this.buf);
    }
  }

  /** Additive color bloom on strong sources — batches unclipped glows into a
   *  single `'lighter'` pass and skips 1080p polygon clips whenever `L.poly`
   *  stays beyond the `0.6 * L.r` bloom radius. */
  private bloom(ctx: CanvasRenderingContext2D, camX: number, camY: number,
    zoom: number, strength: number): void {
    if (strength <= 0.02 || !this.lights.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    let anyClipped = false;
    for (let i = 0; i < this.lights.length; i++) {
      const L = this.lights[i];
      if (L.intensity < 0.25) continue;
      const bloomWorldR = L.r * 0.6;
      if (L.poly && polyMinEnd(L.poly) < bloomWorldR) {
        anyClipped = true;
        continue;
      }
      const sx = (L.x - camX) * zoom, sy = (L.y - camY) * zoom;
      const br = bloomWorldR * zoom;
      const alpha = strength * L.intensity * 0.5 * Math.min(1, (L.intensity - 0.25) / 0.1);
      ctx.globalAlpha = alpha;
      ctx.drawImage(glowSprite(L.color), sx - br, sy - br, br * 2, br * 2);
    }
    if (anyClipped) {
      for (let i = 0; i < this.lights.length; i++) {
        const L = this.lights[i];
        if (L.intensity < 0.25) continue;
        const bloomWorldR = L.r * 0.6;
        if (!L.poly || polyMinEnd(L.poly) >= bloomWorldR) continue;
        const sx = (L.x - camX) * zoom, sy = (L.y - camY) * zoom;
        const br = bloomWorldR * zoom;
        const alpha = strength * L.intensity * 0.5 * Math.min(1, (L.intensity - 0.25) / 0.1);
        ctx.save();
        ctx.setTransform(zoom, 0, 0, zoom, -camX * zoom, -camY * zoom);
        ctx.clip(worldPolyPath(L.poly));
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = alpha;
        ctx.drawImage(glowSprite(L.color), sx - br, sy - br, br * 2, br * 2);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /** How dark the world is right now: the night curve, lifted by a zone's
   *  own ambient floor (caves are dark at noon), tempered where another
   *  system owns the dark (the Descent's survival vignette). */
  private ambientDark(world: World): number {
    const night = 1 - dayCycle(sceneSkyTime(world)).light;
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
