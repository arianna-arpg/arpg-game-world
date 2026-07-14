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
import { creepRimMul, CREEP_CFG } from '../../engine/creep';
import { VIS_CFG } from './visConfig';
import { shade, withAlpha } from './color';
import { heartbeat } from './painters';

const BAKES = new Map<string, HTMLCanvasElement>();

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
    const r = reach * creepRimMul(src.harm, ang);
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
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
  const ceil = src.maxReach * (1 + harmSum) + cfg.bakePad;
  const size = Math.max(2, Math.ceil(ceil * 2));
  spr = document.createElement('canvas');
  spr.width = size;
  spr.height = size;
  const c = spr.getContext('2d')!;
  const cx = size / 2, cy = size / 2;
  const rng = bakeRng(src.seed);
  const body = CREEP_CFG.bodyFrac;

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
  c.fill();

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
      const r = src.maxReach * creepRimMul(src.harm, bearing + wobble * 0.3) * f;
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
    const r = src.maxReach * creepRimMul(src.harm, ang) * f;
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

  if (BAKES.size >= cfg.maxBakes) {
    const oldest = BAKES.keys().next().value;
    if (oldest !== undefined) BAKES.delete(oldest);
  }
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
    const rPulse = cycle * s.cur * (1 - lobing * 0.62);
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
  }
}
