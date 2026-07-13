// ---------------------------------------------------------------------------
// THE UNDERSTORY — what lies far BELOW the ground you stand on.
//
// Every gap in a vertical zone (the `window` region cells the ground baker
// punches clear) looks DOWN onto the world beneath. This layer paints that
// view, drawn each frame UNDER the ground chunks so it shows only through
// the holes. Three sources, best-first:
//
//   • LIVE CAPTURE — while the departure zone is still materialized (the
//     launch windup), snapshot its exact hazed aerial: floor + mottle,
//     region cells, every doodad, every runtime change. Keyed by the
//     destination id; requested via TraversalCapture.
//   • HEADLESS CAPTURE — no live capture around? Mint the below zone's
//     layout deterministically from its own def (generateLayout — the same
//     recipe a real visit runs) and paint the same aerial. Serves BOTH
//     anchored shelves re-entered later (ZoneDef.below → a 1:1 window on
//     the anchor) AND the Nether tie (World.skyBelowDef — the whole
//     resolved surface zone STRETCHED beneath the realm zone, so flying
//     the realm north shows the world's north sliding past below, and the
//     proportional fall lands you on the very ground you saw).
//   • CLOUD-SEA (ZoneTheme.understory:'cloudsea') — no land below at all:
//     the endless sunlit deck, procedural, drifting. Also the last-resort
//     fallback (a field/boundless zone below that can't mint headlessly).
//
// Cloud SHADOWS drift across whichever floor shows. Knobs in
// VIS_CFG.understory; ablate pass name 'understory'.
// ---------------------------------------------------------------------------

import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import type { ZoneDef, ZoneTheme } from '../../data/zones';
import { generateLayout, type Doodad } from '../../engine/levelgen';
import type { World } from '../../engine/world';
import type { TraversalCapture } from '../../engine/traversal';
import { Rng } from '../../core/rng';
import { PORTAL_EDGE_INSET } from '../../engine/worldgen';
import { exitInside } from '../../world/shape';
import { GridWalkField } from '../../world/gridWalk';
import { regionKind } from '../../world/regions';
import { mix, shade, valueNoise, withAlpha } from './color';
import { releaseCanvas } from './sprites';
import { VIS_ABLATE, VIS_CFG } from './visConfig';

interface UnderstorySnap {
  img: HTMLCanvasElement;
  /** World dims the snap draws across in the CURRENT zone (its dest rect). */
  w: number;
  h: number;
}

/** Everything the aerial painter reads — built from the LIVE world (launch
 *  capture) or from a headless generateLayout of the below zone's def. */
interface UnderScene {
  theme: ZoneTheme;
  arenaW: number;
  arenaH: number;
  doodads: readonly Doodad[];
  walk: GridWalkField | null;
  structures: readonly { rect?: { x: number; y: number; w: number; h: number } }[];
}

/** The far-below tint family a doodad kind falls into, resolved against the
 *  BELOW zone's theme — silhouettes, not portraits (haze eats detail). */
function doodadTint(kind: string, theme: ZoneTheme): { color: string; alpha: number; grow: number } | null {
  if (DOODAD_VISUALS[kind]?.canopy) return { color: theme.tree ?? '#2e4422', alpha: 0.85, grow: 1.7 };
  if (kind.includes('water') || kind === 'shallows') return { color: theme.water ?? '#1d4254', alpha: 0.9, grow: 1.15 };
  if (kind === 'lava' || kind.includes('ember') || kind === 'cinder') return { color: theme.lava ?? '#7a2a12', alpha: 0.9, grow: 1.1 };
  if (kind === 'mud' || kind === 'bog' || kind === 'swamp') return { color: theme.mud ?? '#332a1c', alpha: 0.7, grow: 1.1 };
  if (kind === 'grass' || kind === 'brush' || kind === 'reeds' || kind === 'flowers') return { color: theme.grass ?? '#546038', alpha: 0.5, grow: 1.2 };
  if (kind === 'road') return { color: theme.road ?? '#4c4130', alpha: 0.8, grow: 1 };
  if (kind === 'sand') return { color: theme.sand ?? '#c9b280', alpha: 0.6, grow: 1.1 };
  if (kind === 'chasm' || kind === 'void_chasm') return { color: '#07070c', alpha: 0.9, grow: 1 };
  const rule = DOODAD_VISUALS[kind];
  if (!rule) return null;
  return { color: theme.obstacle ?? '#3a3a3a', alpha: 0.75, grow: 1 };
}

export class UnderstoryLayer {
  /** Snapshots keyed by the zone id they hang UNDER (small LRU). */
  private snaps = new Map<string, UnderstorySnap>();
  /** Zone ids whose headless mint failed — don't retry every frame. */
  private declined = new Set<string>();

  has(key: string): boolean { return this.snaps.has(key); }

  /** Capture the live world's given rect as `key`'s far-below view. Called by
   *  the renderer during a launch windup — the one moment the departure zone
   *  is still fully materialized (runtime changes and all). */
  capture(world: World, req: TraversalCapture): void {
    const scene: UnderScene = {
      theme: world.zone.theme,
      arenaW: world.arena.w, arenaH: world.arena.h,
      doodads: world.doodads,
      walk: world.walk instanceof GridWalkField ? world.walk : null,
      structures: (world.structures ?? []) as UnderScene['structures'],
    };
    this.stash(req.key, this.paintScene(scene, req.ox, req.oy, req.w, req.h), req.w, req.h);
  }

  /** Stand the below-view up WITHOUT a live capture: mint the below zone's
   *  layout headlessly from its def (deterministic — the same recipe a real
   *  visit runs) and paint the aerial. Anchored (ZoneDef.below): a 1:1
   *  window centered on the anchor. Over-tied (World.skyBelowDef): the WHOLE
   *  below zone, stretched under this one (the Nether-tie view the
   *  proportional fall agrees with). One-time cost at first draw. */
  private ensureBelow(world: World): void {
    const zone = world.zone;
    if (this.snaps.has(zone.id) || this.declined.has(zone.id)) return;
    const anchored = zone.below ?? null;
    const belowDef: ZoneDef | null = anchored
      ? world.zoneMap[anchored.zoneId] ?? null
      : world.skyBelowDef();
    if (!belowDef) return; // nothing below — cloudsea handles it
    // Field megazones need the live web; boundless zones have no fixed
    // layout — both decline to the cloud sea rather than lie.
    if (belowDef.field || belowDef.boundless) { this.declined.add(zone.id); return; }
    const scene = this.headlessScene(belowDef);
    if (!scene) { this.declined.add(zone.id); return; }
    if (anchored) {
      this.stash(zone.id, this.paintScene(scene,
        anchored.ax - zone.size.w / 2, anchored.ay - zone.size.h / 2,
        zone.size.w, zone.size.h), zone.size.w, zone.size.h);
    } else {
      // Stretch: the whole world-below fills the realm zone's own rect.
      this.stash(zone.id, this.paintScene(scene, 0, 0, scene.arenaW, scene.arenaH),
        zone.size.w, zone.size.h);
    }
  }

  /** Mint a zone's layout headlessly for painting — the genqa idiom: its own
   *  def, its own seed, portal pixels from the same side/at math placeExit
   *  runs. Entry sits at center (only the portal-clear splice reads it; the
   *  aerial can't see that detail through the haze). */
  private headlessScene(def: ZoneDef): UnderScene | null {
    try {
      const arena = { w: def.size.w, h: def.size.h };
      const bounds = { w: arena.w, h: arena.h, shape: def.shape ?? 'rect' as const };
      const inset = PORTAL_EDGE_INSET;
      const exits = def.exits.map(e => {
        const t = e.at ?? 0.5;
        const edge = e.side === 'n' ? { x: Math.min(Math.max(arena.w * t, inset), arena.w - inset), y: inset }
          : e.side === 's' ? { x: Math.min(Math.max(arena.w * t, inset), arena.w - inset), y: arena.h - inset }
          : e.side === 'w' ? { x: inset, y: Math.min(Math.max(arena.h * t, inset), arena.h - inset) }
          : { x: arena.w - inset, y: Math.min(Math.max(arena.h * t, inset), arena.h - inset) };
        return exitInside(edge, bounds);
      });
      const layout = generateLayout(def, arena,
        new Rng((def.seed ?? 1) >>> 0),
        { x: arena.w / 2, y: arena.h / 2 }, exits);
      return {
        theme: def.theme,
        arenaW: arena.w, arenaH: arena.h,
        doodads: layout.doodads,
        walk: layout.walk instanceof GridWalkField ? layout.walk : null,
        structures: (layout.structures ?? []) as UnderScene['structures'],
      };
    } catch (e) {
      console.warn(`[understory] headless mint of '${def.id}' declined:`, e);
      return null;
    }
  }

  private stash(key: string, img: HTMLCanvasElement, w: number, h: number): void {
    this.snaps.set(key, { img, w, h });
    const CFG = VIS_CFG.understory;
    while (this.snaps.size > CFG.maxSnaps) {
      const oldest = this.snaps.keys().next().value;
      if (oldest === undefined) break;
      const old = this.snaps.get(oldest);
      if (old) releaseCanvas(old.img);
      this.snaps.delete(oldest);
    }
  }

  /** Paint the given window of a scene as a hazed aerial. */
  private paintScene(scene: UnderScene, ox: number, oy: number, w: number, h: number): HTMLCanvasElement {
    const CFG = VIS_CFG.understory;
    const scale = Math.min(CFG.scale, CFG.maxDim / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(2, Math.ceil(w * scale));
    c.height = Math.max(2, Math.ceil(h * scale));
    const ctx = c.getContext('2d')!;
    const theme = scene.theme;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-ox, -oy);

    // Only the LAND paints — a window wider than the zone below leaves the
    // overhang transparent, so the draw pass's open sky shows past the
    // land's true edge instead of a floor-tinted phantom continent.
    const bx0 = Math.max(ox, 0), by0 = Math.max(oy, 0);
    const bx1 = Math.min(ox + w, scene.arenaW);
    const by1 = Math.min(oy + h, scene.arenaH);
    if (bx1 <= bx0 || by1 <= by0) { ctx.restore(); return c; }
    ctx.beginPath();
    ctx.rect(bx0, by0, bx1 - bx0, by1 - by0);
    ctx.clip();

    // The land: base floor + a coarse read of its palette mottle.
    ctx.fillStyle = theme.floor;
    ctx.fillRect(ox, oy, w, h);
    const gs = theme.ground ?? {};
    const pal = gs.palette && gs.palette.length >= 2 ? gs.palette : null;
    const step = 24 / Math.min(1, scale * 4); // coarse cells — an aerial, not a floor
    const ns = VIS_CFG.ground.noiseScale / (gs.scale ?? 1);
    for (let y = by0; y < by1; y += step) {
      for (let x = bx0; x < bx1; x += step) {
        const n = Math.max(0, Math.min(1, 0.5 + (valueNoise(x * ns, y * ns, 7) - 0.5) * 2.4));
        if (pal) {
          const t = n * (pal.length - 1);
          const i = Math.min(pal.length - 2, Math.floor(t));
          ctx.fillStyle = mix(pal[i], pal[i + 1], t - i);
          ctx.globalAlpha = (gs.alpha ?? 0.5) * 0.9;
        } else {
          ctx.fillStyle = n < 0.5 ? shade(theme.floor, -0.12) : shade(theme.floor, 0.1);
          ctx.globalAlpha = 0.4;
        }
        ctx.fillRect(x, y, step + 0.5, step + 0.5);
      }
    }
    ctx.globalAlpha = 1;

    // Region cells (grid zones): walls and painted grounds at their true tones.
    const wf = scene.walk;
    if (wf) {
      const cell = wf.cell;
      const gx0 = Math.max(0, Math.floor(bx0 / cell)), gx1 = Math.min(wf.cols - 1, Math.floor(bx1 / cell));
      const gy0 = Math.max(0, Math.floor(by0 / cell)), gy1 = Math.min(wf.rows - 1, Math.floor(by1 / cell));
      const wallFill = theme.wall ?? theme.obstacle ?? '#101014';
      for (let gy = gy0; gy <= gy1; gy++) {
        for (let gx = gx0; gx <= gx1; gx++) {
          const id = wf.regionAt((gx + 0.5) * cell, (gy + 0.5) * cell);
          if (id === 'ground') continue;
          const def = regionKind(id);
          const fill = def?.visual && !def.visual.window ? def.visual.fill
            : !def?.walkable ? wallFill : null;
          if (!fill) continue;
          ctx.fillStyle = fill;
          ctx.globalAlpha = def?.visual?.alpha ?? 1;
          ctx.fillRect(gx * cell, gy * cell, cell + 0.5, cell + 0.5);
        }
      }
      ctx.globalAlpha = 1;
    }

    // Structures: far-below slabs.
    for (const s of scene.structures) {
      const r = s.rect;
      if (!r) continue;
      ctx.fillStyle = withAlpha(theme.wall ?? theme.obstacle, 0.75);
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }

    // Doodads: grounds first (they lie flat), then everything standing.
    const flat: Doodad[] = [], tall: Doodad[] = [];
    for (const d of scene.doodads) {
      if (d.pos.x + d.radius < bx0 || d.pos.x - d.radius > bx1
        || d.pos.y + d.radius < by0 || d.pos.y - d.radius > by1) continue;
      (DOODAD_VISUALS[d.kind]?.canopy ? tall : flat).push(d);
    }
    for (const list of [flat, tall]) {
      for (const d of list) {
        const tint = doodadTint(d.kind, theme);
        if (!tint) continue;
        ctx.fillStyle = tint.color;
        ctx.globalAlpha = tint.alpha;
        ctx.beginPath();
        ctx.arc(d.pos.x, d.pos.y, d.radius * tint.grow, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // The haze of altitude, baked: a cool wash + a drink of the color.
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = `rgba(128,128,128,${CFG.desat})`;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = withAlpha(CFG.haze, CFG.hazeAlpha);
    ctx.fillRect(0, 0, c.width, c.height);
    return c;
  }

  /** Draw the far-below view across the visible rect (world space, called
   *  inside drawFloor BEFORE the ground chunks). Returns false when this zone
   *  has no understory at all (normal zones — zero cost). */
  draw(ctx: CanvasRenderingContext2D, world: World,
    camX: number, camY: number, vw: number, vh: number, time: number): boolean {
    const zone = world.zone;
    const tied = !!zone.below || !!world.skyBelowDef?.();
    if (!tied && zone.theme.understory !== 'cloudsea') return false;
    if (VIS_ABLATE.has('understory')) return false;
    if (tied) this.ensureBelow(world);
    const snap = this.snaps.get(zone.id);
    const sea = !snap; // no land resolved/painted — the endless deck
    const CFG = VIS_CFG.understory;

    // The open sky behind everything (falls away past the land's window).
    ctx.fillStyle = CFG.sky;
    ctx.fillRect(camX, camY, vw, vh);

    const ccx = camX + vw / 2, ccy = camY + vh / 2;
    if (snap) {
      // Parallax: the land far below slides slower than the shelf — anchored
      // at the camera center so alignment holds where you look.
      const pf = CFG.parallax;
      ctx.save();
      ctx.translate(ccx * (1 - pf), ccy * (1 - pf));
      ctx.scale(pf, pf);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(snap.img, 0, 0, snap.img.width, snap.img.height, 0, 0, snap.w, snap.h);
      ctx.restore();
    } else if (sea) {
      // The endless cloud sea: two octaves of drifting billows, lit from above.
      const pf = CFG.seaParallax;
      const ox = ccx * (1 - pf), oy = ccy * (1 - pf);
      const cellPx = 130;
      const x0 = Math.floor((camX - ox) / pf / cellPx) - 1, x1 = Math.ceil((camX - ox + vw) / pf / cellPx) + 1;
      const y0 = Math.floor((camY - oy) / pf / cellPx) - 1, y1 = Math.ceil((camY - oy + vh) / pf / cellPx) + 1;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(pf, pf);
      const drift = time * 6;
      for (let gy = y0; gy <= y1; gy++) {
        for (let gx = x0; gx <= x1; gx++) {
          const n = valueNoise(gx * 0.9 + drift * 0.004, gy * 0.9, 811);
          const m = valueNoise(gx * 0.31 - drift * 0.002, gy * 0.31, 977);
          const px = gx * cellPx + (n - 0.5) * 90 + drift;
          const py = gy * cellPx + (m - 0.5) * 90;
          const r = cellPx * (0.55 + n * 0.7);
          ctx.fillStyle = mix(CFG.seaDark, CFG.seaLight, Math.min(1, m * 1.35));
          ctx.globalAlpha = 0.5 + m * 0.4;
          ctx.beginPath();
          ctx.ellipse(px, py, r * 1.25, r * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Cloud shadows crossing the land below — the sky is a living thing.
    ctx.save();
    ctx.fillStyle = '#0a0e1a';
    for (let i = 0; i < CFG.shadows; i++) {
      const sp = 14 + i * 7;
      const sx = ((time * sp + i * 977) % (vw + 900)) - 450 + camX;
      const sy = camY + ((i * 431) % vh);
      ctx.globalAlpha = CFG.shadowAlpha;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 320 + i * 60, 170 + i * 30, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    return true;
  }
}
