// ---------------------------------------------------------------------------
// THE CREEP LAYER — the render half of the creep fabric (engine/creep.ts).
//
// Draws each source's living membrane from the SAME geometry the gameplay
// hit-test reads: one baked skin sprite per source personality (rim traced
// by the shared creepRimMul at full reach; scaling the blit preserves the
// shape exactly, so the front's growth/recoil is free), breathing on the
// warren's shared heartbeat, with one live pulse front riding heart→rim.
// Ground, so it draws under doodads and actors (between the flux layer and
// the doodad pass). View-culled by source bound; ablatable as pass 'creep'.
//
// The bake: membrane body (inner thickness highlight, translucent skirt
// past the cover profile's bodyFrac), the rim LIP (a welt where skin grips
// stone — soft glow under a crisp line), vein filaments walking heart→rim
// with occasional branches, and SPARSE glow freckles. All palette from the
// CreepDef; all counts deterministic from the source's own seed.
// ---------------------------------------------------------------------------

import type { CreepField, CreepSource } from '../../engine/creep';
import { rimMulOf, CREEP_CFG } from '../../engine/creep';
import { VIS_CFG } from './visConfig';
import { shade, withAlpha } from './color';
import { heartbeat } from './painters';
import { registerVisCache } from './caches';
import { releaseCanvas } from './sprites';

const BAKES = new Map<string, HTMLCanvasElement>();

/** Evict the oldest skin, RELEASING its store (membranes are the big bakes
 *  — a grown source's skin runs to whole-megabyte canvases; left to the GC
 *  they are exactly the surfaces a long session drowns in). */
function evictOldestBake(): void {
  const oldest = BAKES.keys().next().value;
  if (oldest === undefined) return;
  const victim = BAKES.get(oldest);
  if (victim) releaseCanvas(victim);
  BAKES.delete(oldest);
}

registerVisCache({
  id: 'creepSkins',
  count: () => BAKES.size,
  bytes: () => { let b = 0; for (const c of BAKES.values()) b += c.width * c.height * 4; return b; },
  // Skins key on source personalities — zone-local by construction, so a
  // swap clears wholesale (a re-entered zone re-bakes the same skins
  // deterministically from the same seeds).
  onZoneSwap: () => { if (VIS_CFG.memory.creepClearOnSwap) { for (const c of BAKES.values()) releaseCanvas(c); BAKES.clear(); } },
  onRunSwap: () => { for (const c of BAKES.values()) releaseCanvas(c); BAKES.clear(); },
});

/** Tiny deterministic stream for bake-time rolls (never Math.random —
 *  a source's skin must look the same every frame and every visit). */
function bakeRng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 0xffffffff;
  };
}

function rimPath(c: CanvasRenderingContext2D, src: CreepSource, cx: number, cy: number, reach: number): void {
  const STEPS = 72;
  c.beginPath();
  for (let i = 0; i <= STEPS; i++) {
    const ang = (i / STEPS) * Math.PI * 2;
    const r = reach * rimMulOf(src, ang);
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
}

/** A stretched crest's baked stretch factor (1 for everything round —
 *  classic sources of a stretched DEF stay round too; only a marching run
 *  wears the ellipse, exactly as rimMulOf reads it). */
function stretchOf(src: CreepSource): number {
  return src.front ? Math.max(0.5, src.def.front?.stretch ?? 1) : 1;
}

/** Fill the current path with the current style, mapping the FILL through
 *  the crest's ellipse (about the bearing axis) so a radial gradient's
 *  falloff rides the stretched body instead of pinching at the across-rim.
 *  Canvas paths keep the coordinates they were traced with — only the
 *  gradient is remapped, so the boundary stays rimMulOf's exact product. */
function fillStretched(c: CanvasRenderingContext2D, src: CreepSource, cx: number, cy: number): void {
  const st = stretchOf(src);
  if (st === 1 || !src.front) { c.fill(); return; }
  c.save();
  c.translate(cx, cy);
  c.rotate(src.front.bearing);
  c.scale(1, st);
  c.rotate(-src.front.bearing);
  c.translate(-cx, -cy);
  c.fill();
  c.restore();
}

/** The front skins — the same rim truth in two new keys. WATER: layered
 *  translucent swell with concentric surge bands and pale spume flecks
 *  toward the rim (no veins, no welt — a crest, not an organism). BLAZE:
 *  a white-hot heart falling through ember to char at the skirt, spark
 *  freckles thickening rimward, short flame tongues licking past the
 *  body line. Palette entirely from the CreepDef fields. */
function frontSkinSprite(
  c: CanvasRenderingContext2D,
  src: CreepSource,
  cx: number,
  cy: number,
  pal: { color: string; rim: string; glow: string; alpha: number },
): void {
  const rng = bakeRng(src.seed);
  const body = CREEP_CFG.bodyFrac;
  let harmSum = 0;
  for (const h of src.harm) harmSum += h.a;
  const R = src.maxReach;

  rimPath(c, src, cx, cy, R);
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, R * (1 + harmSum));
  if (src.def.skin === 'water') {
    g.addColorStop(0, withAlpha(shade(pal.color, 0.18), pal.alpha * 0.9));
    g.addColorStop(0.55, withAlpha(pal.color, pal.alpha));
    g.addColorStop(Math.min(0.98, body), withAlpha(shade(pal.color, 0.06), pal.alpha * 0.94));
    g.addColorStop(1, withAlpha(shade(pal.color, 0.3), pal.alpha * 0.45));
  } else {
    g.addColorStop(0, withAlpha(shade(pal.glow, 0.35), pal.alpha));
    g.addColorStop(0.3, withAlpha(pal.glow, pal.alpha * 0.96));
    g.addColorStop(Math.min(0.95, body * 0.8), withAlpha(pal.color, pal.alpha * 0.92));
    g.addColorStop(1, withAlpha(shade(pal.color, -0.35), pal.alpha * 0.4));
  }
  c.fillStyle = g;
  fillStretched(c, src, cx, cy);

  if (src.def.skin === 'water') {
    // Surge bands: concentric swells riding the same rim function, denser
    // toward the crest's face — the water reads as MOVING mass, not dye.
    for (let b = 0; b < 4; b++) {
      const f = 0.3 + b * 0.19 + rng() * 0.05;
      rimPath(c, src, cx, cy, R * f);
      c.strokeStyle = withAlpha(shade(pal.color, 0.22 + b * 0.05), 0.16 + b * 0.05);
      c.lineWidth = 5 - b * 0.8;
      c.stroke();
    }
    // Spume: pale flecks crowding the rim third.
    const flecks = Math.min(40, Math.round(R / 5));
    for (let i = 0; i < flecks; i++) {
      const ang = rng() * Math.PI * 2;
      const f = 0.62 + Math.sqrt(rng()) * 0.34;
      const r = R * rimMulOf(src, ang) * f;
      c.fillStyle = withAlpha(pal.rim, 0.22 + rng() * 0.3);
      c.beginPath();
      c.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 0.8 + rng() * 1.8, 0, Math.PI * 2);
      c.fill();
    }
    // The waterline: one crisp pale edge, no organism welt.
    rimPath(c, src, cx, cy, R);
    c.strokeStyle = withAlpha(pal.rim, 0.6);
    c.lineWidth = 2.4;
    c.stroke();
  } else {
    // Flame tongues: short licks past the body line, brightest at the base.
    const tongues = 10 + Math.floor(rng() * 5);
    c.lineCap = 'round';
    for (let i = 0; i < tongues; i++) {
      const ang = (i / tongues) * Math.PI * 2 + rng() * 0.5;
      const base = R * rimMulOf(src, ang) * (body - 0.06 + rng() * 0.08);
      const len = R * (0.1 + rng() * 0.14);
      const sway = (rng() - 0.5) * 0.5;
      const x0 = cx + Math.cos(ang) * base, y0 = cy + Math.sin(ang) * base;
      const x1 = cx + Math.cos(ang + sway * 0.3) * (base + len);
      const y1 = cy + Math.sin(ang + sway * 0.3) * (base + len);
      c.strokeStyle = withAlpha(pal.glow, 0.5);
      c.lineWidth = 4.4;
      c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0 + (x1 - x0) * 0.5, y0 + (y1 - y0) * 0.5, x1, y1); c.stroke();
      c.strokeStyle = withAlpha(shade(pal.glow, 0.3), 0.8);
      c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0 + (x1 - x0) * 0.5, y0 + (y1 - y0) * 0.5, x1, y1); c.stroke();
    }
    // Sparks: freckles thickening rimward (the blaze sheds outward).
    const sparks = Math.min(48, Math.round(R / 4));
    for (let i = 0; i < sparks; i++) {
      const ang = rng() * Math.PI * 2;
      const f = 0.3 + Math.sqrt(rng()) * 0.64;
      const r = R * rimMulOf(src, ang) * f;
      const nr = 0.7 + rng() * 1.4;
      c.fillStyle = withAlpha(shade(pal.glow, 0.4), 0.25);
      c.beginPath(); c.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, nr * 2.2, 0, Math.PI * 2); c.fill();
      c.fillStyle = withAlpha(shade(pal.glow, 0.55), 0.85);
      c.beginPath(); c.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, nr, 0, Math.PI * 2); c.fill();
    }
    // The fire line: a hot double rim.
    rimPath(c, src, cx, cy, R);
    c.strokeStyle = withAlpha(pal.rim, 0.3);
    c.lineWidth = 6;
    c.stroke();
    rimPath(c, src, cx, cy, R);
    c.strokeStyle = withAlpha(pal.rim, 0.75);
    c.lineWidth = 2;
    c.stroke();
  }
}

/** Bake one source's full-grown skin. Keyed on the personality, not the
 *  live front — growth just scales the blit. */
function membraneSprite(src: CreepSource): HTMLCanvasElement {
  const key = `${src.def.id}:${src.seed}:${Math.round(src.maxReach)}`;
  let spr = BAKES.get(key);
  if (spr) return spr;
  const cfg = VIS_CFG.creep;
  const d = CREEP_CFG.def;
  const color = src.def.color ?? d.color;
  const rim = src.def.rim ?? d.rim;
  const vein = src.def.vein ?? d.vein;
  const glow = src.def.glow ?? d.glow;
  const alpha = src.def.alpha ?? d.alpha;
  let harmSum = 0;
  for (const h of src.harm) harmSum += h.a;
  // A stretched crest bakes on a canvas sized by its ACROSS axis (× 1 for
  // everything round — the classic size to the byte).
  const ceil = src.maxReach * (1 + harmSum) * Math.max(1, stretchOf(src)) + cfg.bakePad;
  const size = Math.max(2, Math.ceil(ceil * 2));
  spr = document.createElement('canvas');
  spr.width = size;
  spr.height = size;
  const c = spr.getContext('2d')!;
  const cx = size / 2, cy = size / 2;
  const rng = bakeRng(src.seed);
  const body = CREEP_CFG.bodyFrac;

  // SKIN FAMILIES (CreepDef.skin): 'water' and 'blaze' bake their own
  // grammar below and return early — the classic membrane path underneath
  // is untouched, so every legacy row bakes byte-identically.
  if (src.def.skin === 'water' || src.def.skin === 'blaze') {
    frontSkinSprite(c, src, cx, cy, { color, rim, glow, alpha });
    if (BAKES.size >= cfg.maxBakes) evictOldestBake();
    BAKES.set(key, spr);
    return spr;
  }

  // The skin: full-strength body out to bodyFrac (the cover profile's
  // plateau), a thinning translucent skirt to the rim. The heart carries a
  // faint thickness highlight — membranes are deepest where they started.
  rimPath(c, src, cx, cy, src.maxReach);
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, src.maxReach * (1 + harmSum));
  g.addColorStop(0, withAlpha(shade(color, 0.1), alpha));
  g.addColorStop(Math.min(0.95, body * 0.55), withAlpha(color, alpha));
  g.addColorStop(Math.min(0.98, body), withAlpha(color, alpha * 0.92));
  g.addColorStop(1, withAlpha(shade(color, -0.12), alpha * 0.3));
  c.fillStyle = g;
  fillStretched(c, src, cx, cy);

  // Vein filaments: heart→rim walks with a little wander and the odd
  // branch — a soft glow under-stroke, then the dark core line.
  const veinN = Math.round(
    (src.def.veins?.[0] ?? d.veins[0])
    + rng() * ((src.def.veins?.[1] ?? d.veins[1]) - (src.def.veins?.[0] ?? d.veins[0])));
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (let i = 0; i < veinN; i++) {
    const bearing = (i / veinN) * Math.PI * 2 + rng() * 1.1;
    const endFrac = 0.68 + rng() * 0.24;
    const segs = 3 + Math.floor(rng() * 2);
    const pts: { x: number; y: number }[] = [{ x: cx + (rng() - 0.5) * 8, y: cy + (rng() - 0.5) * 8 }];
    for (let sIdx = 1; sIdx <= segs; sIdx++) {
      const f = (sIdx / segs) * endFrac;
      const wobble = (rng() - 0.5) * 0.5;
      const r = src.maxReach * rimMulOf(src, bearing + wobble * 0.3) * f;
      pts.push({ x: cx + Math.cos(bearing + wobble) * r, y: cy + Math.sin(bearing + wobble) * r });
    }
    const trace = (): void => {
      c.beginPath();
      c.moveTo(pts[0].x, pts[0].y);
      for (let p = 1; p < pts.length; p++) {
        const prev = pts[p - 1], cur = pts[p];
        c.quadraticCurveTo(prev.x, prev.y, (prev.x + cur.x) / 2, (prev.y + cur.y) / 2);
      }
      c.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    };
    trace();
    c.strokeStyle = withAlpha(glow, cfg.veinGlow * 0.5);
    c.lineWidth = 4.6;
    c.stroke();
    trace();
    c.strokeStyle = withAlpha(vein, 0.85);
    c.lineWidth = 1.7;
    c.stroke();
    // One short side-branch, sometimes — enough to read grown, not drawn.
    if (rng() < 0.35 && pts.length > 2) {
      const at = pts[1 + Math.floor(rng() * (pts.length - 2))];
      const bAng = bearing + (rng() < 0.5 ? 1 : -1) * (0.5 + rng() * 0.5);
      const bLen = src.maxReach * (0.1 + rng() * 0.12);
      c.beginPath();
      c.moveTo(at.x, at.y);
      c.lineTo(at.x + Math.cos(bAng) * bLen, at.y + Math.sin(bAng) * bLen);
      c.strokeStyle = withAlpha(vein, 0.6);
      c.lineWidth = 1.2;
      c.stroke();
    }
  }

  // Glow freckles: sparse, sqrt-spread across the body, none past the
  // skirt. The unease is in the noticing, not the counting.
  const nodes = Math.min(26, Math.round((src.def.nodes ?? d.nodes) * (src.maxReach / 14)));
  for (let i = 0; i < nodes; i++) {
    const ang = rng() * Math.PI * 2;
    const f = Math.sqrt(rng()) * body * 0.94;
    const r = src.maxReach * rimMulOf(src, ang) * f;
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    const nr = 1.2 + rng() * 1.5;
    c.fillStyle = withAlpha(glow, 0.14);
    c.beginPath();
    c.arc(x, y, nr * 2.4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = withAlpha(glow, 0.55);
    c.beginPath();
    c.arc(x, y, nr, 0, Math.PI * 2);
    c.fill();
  }

  // The rim LIP: a soft welt glow under a crisp line — where skin grips
  // stone. Drawn last so it rides over skirt and veins alike.
  rimPath(c, src, cx, cy, src.maxReach);
  c.strokeStyle = withAlpha(rim, 0.22);
  c.lineWidth = 6.5;
  c.stroke();
  rimPath(c, src, cx, cy, src.maxReach);
  c.strokeStyle = withAlpha(rim, 0.7);
  c.lineWidth = 2.2;
  c.stroke();

  if (BAKES.size >= cfg.maxBakes) evictOldestBake();
  BAKES.set(key, spr);
  return spr;
}

/** Draw the living membrane. Runs inside the world transform, between the
 *  flux layer and the doodad pass (ground: under doodads and actors). */
export function drawCreepLayer(
  ctx: CanvasRenderingContext2D,
  creep: CreepField,
  time: number,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
): void {
  const cfg = VIS_CFG.creep;
  const d = CREEP_CFG.def;
  const pad = cfg.cullPad;
  for (const s of creep.sources) {
    if (s.cur <= CREEP_CFG.minReach || s.maxReach <= 0) continue;
    if (s.pos.x + s.bound < camX - pad || s.pos.x - s.bound > camX + vw + pad
      || s.pos.y + s.bound < camY - pad || s.pos.y - s.bound > camY + vh + pad) continue;

    // A yielding front carves live way discs out of its DRAWN skin — the
    // very list the cover mask reads, so the dry deck on screen is the
    // dry deck in the hit test.
    const run = s.front;
    const clipWays = run && s.def.front?.yieldWays && run.nearWays.length > 0;
    if (clipWays) {
      ctx.save();
      const clip = new Path2D();
      const b = s.bound + 8;
      clip.rect(s.pos.x - b, s.pos.y - b, b * 2, b * 2);
      for (const w of run!.nearWays) {
        clip.moveTo(w.x + w.r, w.y);
        clip.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      }
      ctx.clip(clip, 'evenodd');
    }

    const spr = membraneSprite(s);
    const pulse = s.def.pulse ?? d.pulse;
    const hb = heartbeat(time * pulse + s.phase);
    const scale = (s.cur / s.maxReach) * (1 + cfg.breathe * (hb - 0.35));
    const half = (spr.width / 2) * scale;
    ctx.drawImage(spr, s.pos.x - half, s.pos.y - half, half * 2, half * 2);

    // The live pulse: one front riding heart→rim, brightest on the lub.
    // Kept inside the body plateau so a circular ring never pokes past a
    // lobed rim.
    const cycle = (time * cfg.pulseSpeed * pulse + s.phase * 0.17) % 1;
    const lobing = s.def.lobing ?? d.lobing;
    // A sub-1 stretch narrows the across-rim — the circular pulse stays
    // inside it (× 1 for everything round and every stretch ≥ 1).
    const rPulse = cycle * s.cur * (1 - lobing * 0.62) * Math.min(1, stretchOf(s));
    const a = cfg.pulseAlpha * hb * Math.min(1, s.cur / s.maxReach);
    if (rPulse > 6 && a > 0.01) {
      ctx.globalAlpha = a * (1 - cycle * 0.6);
      ctx.strokeStyle = s.def.glow ?? d.glow;
      ctx.lineWidth = cfg.pulseWidth * (0.7 + 0.6 * (1 - cycle));
      ctx.beginPath();
      ctx.arc(s.pos.x, s.pos.y, rPulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // THE LEADING EDGE (CreepDef.edge): the advance telegraphs itself — a
    // bright arc riding the live rim on the bearing side plus direction
    // streaks running ahead, so which way the danger moves reads at a
    // glance from a screen away.
    if (run && s.def.edge) drawLeadingEdge(ctx, s, run.bearing, time);

    if (clipWays) ctx.restore();
  }
}

/** The leading-edge telegraph. All geometry from the live rim (rimAt's
 *  truth at the CURRENT front), all palette from the row's edge fields —
 *  foam shimmers, flame flickers, both shapes shared. */
function drawLeadingEdge(
  ctx: CanvasRenderingContext2D,
  s: CreepSource,
  bearing: number,
  time: number,
): void {
  const cfg = VIS_CFG.creep.edge;
  const e = s.def.edge!;
  const half = cfg.arc;
  const STEPS = 26;
  const flick = e.style === 'flame' ? 0.75 + 0.25 * Math.sin(time * 11 + s.phase * 3) : 1;
  const width = (e.width ?? cfg.width) * flick;

  // The arc: traced along the live rim across the bearing's spread.
  ctx.beginPath();
  for (let i = 0; i <= STEPS; i++) {
    const ang = bearing - half + (i / STEPS) * half * 2;
    const r = s.cur * rimMulOf(s, ang);
    const x = s.pos.x + Math.cos(ang) * r;
    const y = s.pos.y + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineCap = 'round';
  ctx.globalAlpha = cfg.alpha * 0.45 * flick;
  ctx.strokeStyle = e.color;
  ctx.lineWidth = width * 2.6;
  ctx.stroke();
  ctx.globalAlpha = cfg.alpha * flick;
  ctx.lineWidth = width;
  ctx.stroke();

  // Direction streaks: short runners breaking ahead of the rim, cycling
  // outward on their own clocks — foam thrown forward, sparks on the wind.
  ctx.lineWidth = e.style === 'flame' ? 1.6 : 2.2;
  for (let i = 0; i < cfg.streaks; i++) {
    const f = i / cfg.streaks;
    const ang = bearing + (f - 0.5) * half * 1.5;
    const cyc = (time * cfg.streakSpeed + f * 7.13 + s.phase) % 1;
    const r0 = s.cur * rimMulOf(s, ang);
    const runOut = cfg.streakLen * (0.6 + f * 0.8);
    const x0 = s.pos.x + Math.cos(ang) * (r0 + cyc * runOut);
    const y0 = s.pos.y + Math.sin(ang) * (r0 + cyc * runOut);
    ctx.globalAlpha = cfg.alpha * (1 - cyc) * 0.9;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + Math.cos(bearing) * cfg.streakLen * 0.4, y0 + Math.sin(bearing) * cfg.streakLen * 0.4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
