// ---------------------------------------------------------------------------
// THE UNDERSTORY — what lies far BELOW the ground you stand on.
//
// A cloud shelf hangs directly above the zone its geyser erupted from; every
// gap in the clouds (the `window` region cells the ground baker punches
// clear) looks DOWN onto that land. This layer paints that view, drawn each
// frame UNDER the ground chunks so it shows only through the holes:
//
//   • SNAPSHOT mode — while the departure zone is still live (the launch
//     windup), the renderer captures a hazed aerial of it: floor + mottle,
//     region cells, every doodad as its far-below silhouette. Keyed by the
//     destination zone id; drawn with a gentle parallax so the land slides
//     against the shelf as the camera moves — the read that you are HIGH.
//   • CLOUD-SEA mode (ZoneTheme.understory:'cloudsea') — no land below, only
//     the endless sunlit deck: procedural billows, drifting, lit from above.
//     Also the fallback when a shelf's snapshot never existed (a dev jump,
//     a resumed run) — the dream doesn't apologize.
//
// Cloud SHADOWS drift across whichever floor shows. Knobs in
// VIS_CFG.understory; ablate pass name 'understory'.
// ---------------------------------------------------------------------------

import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import type { World } from '../../engine/world';
import type { TraversalCapture } from '../../engine/traversal';
import { GridWalkField } from '../../world/gridWalk';
import { regionKind } from '../../world/regions';
import { mix, shade, valueNoise, withAlpha } from './color';
import { releaseCanvas } from './sprites';
import { VIS_ABLATE, VIS_CFG } from './visConfig';

interface UnderstorySnap {
  img: HTMLCanvasElement;
  /** Canvas px per world unit. */
  scale: number;
  /** World dims of the captured window (== the shelf's arena dims). */
  w: number;
  h: number;
}

/** The far-below tint family a doodad kind falls into, resolved against the
 *  DEPARTURE zone's theme — silhouettes, not portraits (haze eats detail). */
function doodadTint(kind: string, theme: World['zone']['theme']): { color: string; alpha: number; grow: number } | null {
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
  /** Snapshots keyed by DESTINATION zone id (small LRU). */
  private snaps = new Map<string, UnderstorySnap>();

  has(key: string): boolean { return this.snaps.has(key); }

  /** Capture the live world's given rect as `key`'s far-below view. Called by
   *  the renderer during a launch windup — the one moment the departure zone
   *  is still fully materialized. One-time cost, hidden under the cinematic. */
  capture(world: World, req: TraversalCapture): void {
    const CFG = VIS_CFG.understory;
    const scale = Math.min(CFG.scale, CFG.maxDim / Math.max(req.w, req.h));
    const c = document.createElement('canvas');
    c.width = Math.max(2, Math.ceil(req.w * scale));
    c.height = Math.max(2, Math.ceil(req.h * scale));
    const ctx = c.getContext('2d')!;
    const theme = world.zone.theme;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-req.ox, -req.oy);

    // Only the LAND paints — a shelf window wider than the zone below leaves
    // the overhang transparent, so the draw pass's open sky shows past the
    // land's true edge instead of a floor-tinted phantom continent.
    const bx0 = Math.max(req.ox, 0), by0 = Math.max(req.oy, 0);
    const bx1 = Math.min(req.ox + req.w, world.arena.w);
    const by1 = Math.min(req.oy + req.h, world.arena.h);
    if (bx1 <= bx0 || by1 <= by0) { ctx.restore(); this.snaps.set(req.key, { img: c, scale, w: req.w, h: req.h }); return; }
    ctx.beginPath();
    ctx.rect(bx0, by0, bx1 - bx0, by1 - by0);
    ctx.clip();

    // The land: base floor + a coarse read of its palette mottle.
    ctx.fillStyle = theme.floor;
    ctx.fillRect(req.ox, req.oy, req.w, req.h);
    const gs = theme.ground ?? {};
    const pal = gs.palette && gs.palette.length >= 2 ? gs.palette : null;
    const step = 24 / Math.min(1, scale * 4); // coarse cells — an aerial, not a floor
    const ns = VIS_CFG.ground.noiseScale / (gs.scale ?? 1);
    for (let y = req.oy; y < req.oy + req.h; y += step) {
      for (let x = req.ox; x < req.ox + req.w; x += step) {
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
    const wf = world.walk instanceof GridWalkField ? world.walk : null;
    if (wf) {
      const cell = wf.cell;
      const gx0 = Math.max(0, Math.floor(req.ox / cell)), gx1 = Math.min(wf.cols - 1, Math.floor((req.ox + req.w) / cell));
      const gy0 = Math.max(0, Math.floor(req.oy / cell)), gy1 = Math.min(wf.rows - 1, Math.floor((req.oy + req.h) / cell));
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
    for (const s of world.structures ?? []) {
      const r = (s as { rect?: { x: number; y: number; w: number; h: number } }).rect;
      if (!r) continue;
      ctx.fillStyle = withAlpha(theme.wall ?? theme.obstacle, 0.75);
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }

    // Doodads: grounds first (they lie flat), then everything standing.
    const flat: typeof world.doodads = [], tall: typeof world.doodads = [];
    for (const d of world.doodads) {
      if (d.pos.x + d.radius < req.ox || d.pos.x - d.radius > req.ox + req.w
        || d.pos.y + d.radius < req.oy || d.pos.y - d.radius > req.oy + req.h) continue;
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

    this.snaps.set(req.key, { img: c, scale, w: req.w, h: req.h });
    while (this.snaps.size > CFG.maxSnaps) {
      const oldest = this.snaps.keys().next().value;
      if (oldest === undefined) break;
      const old = this.snaps.get(oldest);
      if (old) releaseCanvas(old.img);
      this.snaps.delete(oldest);
    }
  }

  /** Draw the far-below view across the visible rect (world space, called
   *  inside drawFloor BEFORE the ground chunks). Returns false when this zone
   *  has no understory at all (normal zones — zero cost). */
  draw(ctx: CanvasRenderingContext2D, world: World,
    camX: number, camY: number, vw: number, vh: number, time: number): boolean {
    const zone = world.zone;
    const snap = zone.below ? this.snaps.get(zone.id) : undefined;
    const sea = zone.theme.understory === 'cloudsea' || (!!zone.below && !snap);
    if (!snap && !sea) return false;
    if (VIS_ABLATE.has('understory')) return false;
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
    } else {
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
