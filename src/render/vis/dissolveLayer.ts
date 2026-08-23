// ---------------------------------------------------------------------------
// THE DISSOLVE LAYER — the drawn half of THE DISSOLUTION GRAMMAR (pure leaf:
// engine/dissolve.ts; design: docs/design/dissolution.md; engine doc:
// docs/engine/dissolution.md). THE FRAGMENT ENGINE: at a break the layer
// obtains the body's BITMAP (the sprite bake cache for bakeWhole kinds — the
// exact variant the player was looking at; a one-shot paint of the kind's own
// painter at the break instant for live-painted kinds), cuts it by the seeded
// fragment mask the spec names, and animates the pieces for the motion's life
// off the pure kinematics — every pose a function of (seed, age), nothing
// stored, nothing on the wire. Then the DEBRIS doodad (already standing since
// the break instant — the engine's law) fades IN as the pieces land, and
// leaves later through the soft-dry ease (vis/dressFade.ts).
//
// Cost: zero while World.dissolves is empty (the renderer gates on the list
// length); per live break N clipped drawImage calls per frame (N = the piece
// count, 1–13); bitmaps build ONCE per record and release with it (the cache
// steward trims the lot at zone/run boundaries). The concurrency cap lives
// engine-side (DISSOLVE_CFG.maxLive — past it no record exists to draw).
//
// Also here, because they are the grammar's own pieces and ride existing open
// registries: the `litter` DEBRIS PAINTER (one painter, a `shape` per
// material) registered into PAINTERS, and the three break VOICES (dust /
// sparkle / wetpop) registered into THE EFFECT VOICE — one accent channel,
// never a second flash system.
// ---------------------------------------------------------------------------

import {
  dissolveCells, dissolveCrackLines, dissolvePose, dissolveSettleAlpha, dissolveStrikeUnit,
  type DissolveCell,
} from '../../engine/dissolve';
import type { DissolveBreak, World } from '../../engine/world';
import type { Doodad } from '../../engine/levelgen';
import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import {
  PAINTERS, resolveColor, wholeKindSprite, wholeSpriteSpins, wholeVariantOf,
  type ColorSpec, type DoodadVisualDef, type GroupPainter, type PaintEnv,
} from './painters';
import { VIS_CFG } from './visConfig';
import { registerVisCache } from './caches';
import { releaseCanvas } from './sprites';
import { registerEffectVoice } from './effectVoice';
import { hash01, shade, withAlpha } from './color';

// --- THE FRAGMENT SET (per live record) --------------------------------------

interface FragSet {
  /** The body's bitmap (null = nothing to draw: no visual row / paint threw). */
  bmp: HTMLCanvasElement | null;
  /** Half-size of the blit in WORLD units (the bitmap is drawn centered on
   *  the body's seat at 2×half square). */
  half: number;
  /** The blit's own rotation (a bakeWhole sprite spins by the instance rot;
   *  a one-shot paint already wears it — 0). */
  rot: number;
  /** Whether this layer owns the canvas (one-shot paints release with the
   *  record; bake-cache sprites belong to the sprite steward). */
  owned: boolean;
  cells: DissolveCell[];
  /** The strike point in body units (clamped inside). */
  strike: { x: number; y: number };
}

const frags = new Map<DissolveBreak, FragSet>();

function releaseSet(fs: FragSet): void {
  if (fs.owned && fs.bmp) releaseCanvas(fs.bmp);
  fs.bmp = null;
}

function clearAll(): void {
  for (const fs of frags.values()) releaseSet(fs);
  frags.clear();
}

registerVisCache({
  id: 'dissolveFrags',
  count: () => frags.size,
  bytes: () => { let b = 0; for (const f of frags.values()) if (f.owned && f.bmp) b += f.bmp.width * f.bmp.height * 4; return b; },
  onZoneSwap: clearAll,
  onRunSwap: clearAll,
});

/** Drop sets whose record the engine has pruned (one cheap sweep per frame
 *  while anything is cached — the live list is tiny). */
function sweep(live: readonly DissolveBreak[]): void {
  if (!frags.size) return;
  const keep = new Set<DissolveBreak>(live);
  for (const [rec, fs] of frags) {
    if (!keep.has(rec)) { releaseSet(fs); frags.delete(rec); }
  }
}

/** THE BITMAP — the body AS IT STOOD. bakeWhole kinds: the bake cache's own
 *  sprite at the exact variant paintBakedWhole blits (wholeVariantOf). Live-
 *  painted kinds: a one-shot paint of the kind's painter into an offscreen
 *  canvas at the break instant (time = the break's clock, the real world for
 *  painters that read it), the fake-doodad-at-its-own-seat trick so every
 *  position-seeded detail matches what the player saw. */
function acquire(world: World, rec: DissolveBreak): { bmp: HTMLCanvasElement; half: number; rot: number; owned: boolean } | null {
  const def: DoodadVisualDef | undefined = DOODAD_VISUALS[rec.kind];
  if (!def) return null;
  const fake = {
    pos: { x: rec.pos.x, y: rec.pos.y }, radius: rec.radius, kind: rec.kind,
    ...(rec.rot !== undefined ? { rot: rec.rot } : {}),
    ...(rec.dir !== undefined ? { dir: rec.dir } : {}),
    ...(rec.tier !== undefined ? { tier: rec.tier } : {}),
  } as Doodad;
  if (def.bakeWhole && VIS_CFG.ground.bakeDoodads) {
    const spr = wholeKindSprite(def, world.zone.theme, rec.radius, wholeVariantOf(fake));
    const rq = Math.max(6, Math.round(rec.radius / 4) * 4);
    const scale = rec.radius / rq;
    return {
      bmp: spr, half: (spr.width / 2) * scale,
      rot: wholeSpriteSpins(def) && rec.rot !== undefined ? rec.rot : 0,
      owned: false,
    };
  }
  if (typeof document === 'undefined') return null; // headless: nothing draws
  const scope = rec.spec.scope;
  const size = Math.max(8, Math.ceil(rec.radius * scope * 2));
  const res = VIS_CFG.dissolve.bitmapRes;
  const c = document.createElement('canvas');
  c.width = Math.ceil(size * res);
  c.height = Math.ceil(size * res);
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.scale(res, res);
  ctx.translate(size / 2 - rec.pos.x, size / 2 - rec.pos.y);
  const env: PaintEnv = { ctx, theme: world.zone.theme, time: rec.at, world };
  const painter = PAINTERS[def.painter] ?? PAINTERS.fallback;
  try {
    painter(env, [fake], def);
  } catch {
    releaseCanvas(c);
    return null;
  }
  return { bmp: c, half: size / 2, rot: 0, owned: true };
}

function build(world: World, rec: DissolveBreak): FragSet {
  const got = acquire(world, rec);
  const strike = dissolveStrikeUnit(rec.pos.x, rec.pos.y, rec.radius, rec.strike.x, rec.strike.y);
  const cells = dissolveCells(rec.spec, rec.seed, strike);
  return {
    bmp: got?.bmp ?? null, half: got?.half ?? 0, rot: got?.rot ?? 0, owned: got?.owned ?? false,
    cells, strike,
  };
}

// --- THE DRAW ------------------------------------------------------------------

/** Draw every live break's fragments (call after the doodad pass — the pieces
 *  fly over the ground and the standing furniture, under bodies). Zero cost
 *  when World.dissolves is empty. */
export function drawDissolves(ctx: CanvasRenderingContext2D, world: World,
  camX: number, camY: number, vw: number, vh: number): void {
  const recs = world.dissolves;
  sweep(recs);
  if (!recs.length) return;
  const cfg = VIS_CFG.dissolve;
  const L = camX - 80, T = camY - 80, R = camX + vw + 80, B = camY + vh + 80;
  for (const rec of recs) {
    const reach = rec.radius * (rec.spec.scope + rec.spec.fling * rec.spec.life + 0.5);
    if (rec.pos.x + reach < L || rec.pos.x - reach > R || rec.pos.y + reach < T || rec.pos.y - reach > B) continue;
    let fs = frags.get(rec);
    if (!fs) { fs = build(world, rec); frags.set(rec, fs); }
    if (!fs.bmp) continue;
    const age = Math.max(0, rec.maxLife - rec.life);
    const r = rec.radius;
    const cells = fs.cells;
    const n = cells.length;
    const chip = (r * 0.5) / Math.sqrt(Math.max(1, n));
    for (let i = 0; i < n; i++) {
      const pose = dissolvePose(rec.spec, cells, i, rec.seed, age, r, fs.strike);
      if (pose.alpha <= cfg.skipBelow) continue;
      const cell = cells[i];
      const px = rec.pos.x + cell.cx * r, py = rec.pos.y + cell.cy * r;
      // A faint ground shadow under the flying piece — it reads as LIFTED.
      if (cfg.fragmentShadow > 0 && rec.spec.motion !== 'dissolve') {
        ctx.globalAlpha = cfg.fragmentShadow * pose.alpha;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(px + pose.dx, py + pose.dy + chip * 0.5, chip * pose.sx, chip * 0.55 * pose.sy, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.save();
      ctx.globalAlpha = pose.alpha;
      ctx.translate(px + pose.dx, py + pose.dy);
      if (pose.shear) ctx.transform(1, 0, pose.shear, 1, 0, 0);
      if (pose.rot) ctx.rotate(pose.rot);
      if (pose.sx !== 1 || pose.sy !== 1) ctx.scale(pose.sx, pose.sy);
      ctx.translate(-px, -py);
      // The cell's clip (body frame, world coords).
      ctx.beginPath();
      const pts = cell.pts;
      for (let k = 0; k < pts.length; k++) {
        const x = rec.pos.x + pts[k].x * r, y = rec.pos.y + pts[k].y * r;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.clip();
      // The body's bitmap, centered on its seat, at its own rotation.
      if (fs.rot) {
        ctx.translate(rec.pos.x, rec.pos.y);
        ctx.rotate(fs.rot);
        ctx.drawImage(fs.bmp, -fs.half, -fs.half, fs.half * 2, fs.half * 2);
      } else {
        ctx.drawImage(fs.bmp, rec.pos.x - fs.half, rec.pos.y - fs.half, fs.half * 2, fs.half * 2);
      }
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

/** THE SETTLE: the debris' drawn alpha while its break's fragments still fly
 *  (0 at the instant → 1 as the pieces land); 1 for any piece with no live
 *  break. The renderer multiplies the debris' face by it. */
export function dissolveDebrisAlpha(d: Doodad, world: World): number {
  const recs = world.dissolves;
  if (!recs.length) return 1;
  for (const rec of recs) {
    if (rec.debris === d) return dissolveSettleAlpha(Math.max(0, rec.maxLife - rec.life), rec.maxLife);
  }
  return 1;
}

/** THE PRE-CRACK: every dwell-gated breakable mid-press draws its crack arms
 *  growing from the stand point over the dwell (World.dissolveCrackView — the
 *  creak made visible; no text). Empty view = no cost. */
export function drawDissolveCracks(ctx: CanvasRenderingContext2D, world: World): void {
  const rows = world.dissolveCrackView();
  if (!rows.length) return;
  const cfg = VIS_CFG.dissolve.crack;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const row of rows) {
    const d = row.d;
    const r = d.radius;
    const from = dissolveStrikeUnit(d.pos.x, d.pos.y, r, row.from.x, row.from.y);
    const lines = dissolveCrackLines(row.seed, row.frac, from);
    const w = Math.max(1, Math.min(3, cfg.width * (r / 24)));
    const a = cfg.alpha * (0.35 + 0.65 * row.frac);
    for (const pts of lines) {
      // A pale lip beside the dark line — the crack reads on dark stone too.
      ctx.strokeStyle = cfg.highlight;
      ctx.lineWidth = w + 1.2;
      ctx.globalAlpha = a * 0.6;
      ctx.beginPath();
      for (let k = 0; k < pts.length; k++) {
        const x = d.pos.x + pts[k].x * r + 0.8, y = d.pos.y + pts[k].y * r + 0.8;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = w;
      ctx.globalAlpha = a;
      ctx.beginPath();
      for (let k = 0; k < pts.length; k++) {
        const x = d.pos.x + pts[k].x * r, y = d.pos.y + pts[k].y * r;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

// --- THE DEBRIS PAINTER (`litter`) ------------------------------------------

const TAU = Math.PI * 2;

/** LITTER — what a break leaves: one painter, a `shape` per material so the
 *  pile reads as what broke (clay SHERDS, glass GLINTS, rock SCREE, wood
 *  SPLINTERS, wet PULP). Seeded per seat, time-free. */
const litter: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec; shape?: 'sherd' | 'glint' | 'scree' | 'splinter' | 'pulp' };
  const { ctx, theme } = env;
  const base = resolveColor(p.color, theme, theme.obstacle);
  const shape = p.shape ?? 'scree';
  const L = VIS_CFG.dissolve.litter;
  for (const d of group) {
    const seed = ((d.pos.x * 17 + d.pos.y * 23) | 0) >>> 0;
    // The ground's dusting under the pile (pulp leaves a wet ring instead).
    ctx.globalAlpha = shape === 'pulp' ? 0.2 : 0.12;
    ctx.fillStyle = shade(base, shape === 'pulp' ? -0.35 : -0.25);
    ctx.beginPath();
    ctx.ellipse(d.pos.x, d.pos.y, d.radius * 1.02, d.radius * 0.86, 0, 0, TAU);
    ctx.fill();
    const n = Math.min(26, Math.max(5, Math.round(d.radius * L.density)));
    for (let i = 0; i < n; i++) {
      const a = hash01(i, seed) * TAU;
      const dd = Math.sqrt(hash01(i, seed + 5)) * d.radius * 0.92;
      const x = d.pos.x + Math.cos(a) * dd, y = d.pos.y + Math.sin(a) * dd;
      const s = L.size[0] + hash01(i, seed + 9) * (L.size[1] - L.size[0]);
      const rot = hash01(i, seed + 13) * Math.PI;
      const tone = shade(base, hash01(i, seed + 17) * 0.36 - 0.16);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      switch (shape) {
        case 'sherd': {
          // A curved wedge of pot wall: a lit face, a dark broken edge.
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = tone;
          ctx.beginPath();
          ctx.moveTo(-s, -s * 0.4);
          ctx.quadraticCurveTo(0, -s * 0.9, s, -s * 0.35);
          ctx.lineTo(s * 0.55, s * 0.5);
          ctx.lineTo(-s * 0.6, s * 0.45);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 0.7;
          ctx.strokeStyle = shade(base, -0.45);
          ctx.lineWidth = 0.8;
          ctx.stroke();
          break;
        }
        case 'glint': {
          // A diamond of glass/ice; now and then a white spark on it.
          ctx.globalAlpha = 0.82;
          ctx.fillStyle = tone;
          ctx.beginPath();
          ctx.moveTo(0, -s * 0.9);
          ctx.lineTo(s * 0.55, 0);
          ctx.lineTo(0, s * 0.9);
          ctx.lineTo(-s * 0.55, 0);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = shade(base, 0.45);
          ctx.lineWidth = 0.7;
          ctx.stroke();
          if (hash01(i, seed + 21) > 0.62) {
            ctx.globalAlpha = L.glintAlpha;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(-s * 0.5, 0); ctx.lineTo(s * 0.5, 0);
            ctx.moveTo(0, -s * 0.5); ctx.lineTo(0, s * 0.5);
            ctx.stroke();
          }
          break;
        }
        case 'splinter': {
          // A long thin sliver of wood, grain-dark.
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = tone;
          ctx.fillRect(-s * 1.4, -s * 0.26, s * 2.8, s * 0.52);
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = shade(base, -0.4);
          ctx.fillRect(-s * 1.4, -s * 0.06, s * 2.8, s * 0.12);
          break;
        }
        case 'pulp': {
          // A soft wet clot, darker at the heart.
          ctx.globalAlpha = 0.62;
          ctx.fillStyle = tone;
          ctx.beginPath();
          ctx.ellipse(0, 0, s * 1.1, s * 0.8, 0, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = shade(base, -0.35);
          ctx.beginPath();
          ctx.ellipse(s * 0.15, s * 0.1, s * 0.45, s * 0.35, 0, 0, TAU);
          ctx.fill();
          break;
        }
        default: {
          // Scree: a rounded stone with a lit rim (the scree painter's word).
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = tone;
          ctx.beginPath();
          ctx.ellipse(0, 0, s, s * 0.8, 0, 0, TAU);
          ctx.fill();
          if (s > 2.6) {
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = shade(base, 0.3);
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.6, VIS_CFG.lightAngle - 0.8, VIS_CFG.lightAngle + 0.6);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
};
PAINTERS.litter = litter;

// --- THE BREAK VOICES (registered into THE EFFECT VOICE) --------------------

/** Position-derived seed — the drawFlash haze idiom (same flash, same
 *  scatter on every frame of its life). */
function flashSeed(f: { pos: { x: number; y: number } }): number {
  return ((f.pos.x * 13 + f.pos.y * 7) | 0) >>> 0;
}
function sv(seed: number, i: number, salt: number): number {
  return hash01(i + 1, salt + 1, seed);
}

/** 'dust' — a low settling breath and a few grit flecks (crumble, give way,
 *  ceramic): no plume, no hot core — the fragments are the show; this is the
 *  ground remembering the fall. */
registerEffectVoice('dust', (ctx, f, t) => {
  const cfg = VIS_CFG.dissolve.voices.dust;
  const seed = flashSeed(f);
  const k = 1 - t;
  const ease = 1 - (1 - k) * (1 - k);
  const R = f.radius * cfg.scale;
  const dustA = Math.min(t, k) * 2 * cfg.alpha;
  if (dustA > 0.01) {
    ctx.strokeStyle = withAlpha(shade(f.color, -0.3), dustA);
    ctx.lineWidth = Math.max(2, R * 0.18);
    ctx.beginPath();
    ctx.arc(f.pos.x, f.pos.y + 3, R * (0.28 + 0.5 * ease), Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, R * 0.1);
    ctx.strokeStyle = withAlpha(shade(f.color, -0.15), dustA * 0.6);
    ctx.beginPath();
    ctx.arc(f.pos.x, f.pos.y + 1, R * (0.18 + 0.38 * ease), Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  ctx.fillStyle = withAlpha(shade(f.color, -0.4), t * 0.7);
  for (let i = 0; i < cfg.flecks; i++) {
    const ang = (sv(seed, i, 1) - 0.5) * 2.6 + Math.PI / 2; // down-biased
    const reach = R * (0.3 + 0.5 * sv(seed, i, 2));
    const dd = reach * ease;
    ctx.beginPath();
    ctx.arc(f.pos.x + Math.cos(ang) * dd, f.pos.y + Math.sin(ang) * dd * 0.6, 1 + 1.2 * sv(seed, i, 3), 0, TAU);
    ctx.fill();
  }
});

/** 'sparkle' — glints radiating and a cold wink at the seat (glass, crystal,
 *  ice): the light off the edges, not the edges themselves. */
registerEffectVoice('sparkle', (ctx, f, t) => {
  const cfg = VIS_CFG.dissolve.voices.sparkle;
  const seed = flashSeed(f);
  const k = 1 - t;
  const ease = 1 - (1 - k) * (1 - k);
  const R = f.radius * cfg.scale;
  // The wink: bright at birth, gone by mid-life.
  const wink = t * t * cfg.winkAlpha;
  if (wink > 0.01) {
    ctx.fillStyle = withAlpha(shade(f.color, 0.7), wink);
    ctx.beginPath();
    ctx.arc(f.pos.x, f.pos.y, Math.max(1, R * 0.22 * (1 - k * 0.6)), 0, TAU);
    ctx.fill();
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < cfg.glints; i++) {
    const ang = sv(seed, i, 4) * TAU;
    const reach = R * (0.35 + 0.75 * sv(seed, i, 5));
    const d1 = reach * (0.25 + 0.75 * ease);
    const x = f.pos.x + Math.cos(ang) * d1, y = f.pos.y + Math.sin(ang) * d1 + ease * ease * 6;
    const s = 1.2 + 2 * sv(seed, i, 6);
    ctx.strokeStyle = withAlpha(i % 3 === 0 ? '#ffffff' : shade(f.color, 0.5), t * 0.85);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
});

/** 'wetpop' — a wet ring widening and droplets thrown out that fall back
 *  (pods, sacs, caps): a skin letting go, not a detonation. */
registerEffectVoice('wetpop', (ctx, f, t) => {
  const cfg = VIS_CFG.dissolve.voices.wetpop;
  const seed = flashSeed(f);
  const k = 1 - t;
  const ease = 1 - (1 - k) * (1 - k);
  const R = f.radius * cfg.scale;
  const ringA = t * cfg.ringAlpha;
  if (ringA > 0.01) {
    ctx.strokeStyle = withAlpha(shade(f.color, 0.15), ringA);
    ctx.lineWidth = Math.max(1.5, R * 0.12 * (1 - 0.6 * ease));
    ctx.beginPath();
    ctx.ellipse(f.pos.x, f.pos.y, R * (0.3 + 0.7 * ease), R * (0.22 + 0.5 * ease), 0, 0, TAU);
    ctx.stroke();
  }
  for (let i = 0; i < cfg.drops; i++) {
    const ang = sv(seed, i, 7) * TAU;
    const reach = R * (0.35 + 0.6 * sv(seed, i, 8));
    const up = R * 0.35 * sv(seed, i, 9);
    // An arc: out along the angle, up then back down (gravity over the life).
    const dd = reach * ease;
    const lift = up * Math.sin(Math.min(1, k * 1.1) * Math.PI);
    const x = f.pos.x + Math.cos(ang) * dd, y = f.pos.y + Math.sin(ang) * dd * 0.7 - lift;
    ctx.fillStyle = withAlpha(shade(f.color, 0.3), t * 0.8);
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + 1.4 * sv(seed, i, 10), 0, TAU);
    ctx.fill();
  }
});
