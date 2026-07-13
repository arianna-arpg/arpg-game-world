// ---------------------------------------------------------------------------
// GLOAMWOOD PAINTERS — the haunted-wood kit's brushes, registered into the
// open PAINTERS record from OUTSIDE the library (the registry is mutable
// data: a biome kit brings its own looks, no painters.ts edit — the same
// contract registerFogBank/registerRegion keep). Side-effect imported by the
// renderer beside the library itself.
// ---------------------------------------------------------------------------

import { PAINTERS, resolveColor, type ColorSpec, type GroupPainter } from './painters';
import { hash01, shade, withAlpha } from './color';

/** A PUMPKIN PATCH — plump ribbed gourds on a vine tangle; params.lit carves
 *  a grinning face (the doodad's light spec does the actual glowing) and
 *  params.n pins the count (a lone jack-o'-lantern is n: 1). */
const gourds: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as {
    color?: ColorSpec; stem?: ColorSpec; vine?: ColorSpec; glow?: ColorSpec;
    lit?: boolean; n?: number;
  };
  const { ctx, theme } = env;
  const body = resolveColor(p.color, theme, '#c8681e');
  const stem = resolveColor(p.stem, theme, '#5a6a30');
  const vine = resolveColor(p.vine, theme, '#3c4a26');
  const glow = resolveColor(p.glow, theme, '#ffb44a');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 17 + o.pos.y * 13) | 0) >>> 0;
    const n = p.n ?? (2 + Math.floor(hash01(seed, 1) * 3));
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The vine tangle under everything: a few lazy arcs through the patch.
    if (n > 1) {
      ctx.strokeStyle = withAlpha(vine, 0.7);
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        const a0 = hash01(seed, 20 + i) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a0) * r * 0.2, Math.sin(a0) * r * 0.2,
          r * (0.4 + hash01(seed, 30 + i) * 0.5), a0, a0 + 2.2);
        ctx.stroke();
      }
    }
    for (let i = 0; i < n; i++) {
      const a = hash01(seed, 2 + i) * Math.PI * 2;
      const d = n === 1 ? 0 : (0.25 + hash01(seed, 8 + i) * 0.6) * r;
      const gx = Math.cos(a) * d;
      const gy = Math.sin(a) * d;
      const gr = r * (n === 1 ? 0.82 : 0.3 + hash01(seed, 14 + i) * 0.22);
      // The body: a squat ellipse, ribbed by darker lobe seams.
      ctx.fillStyle = shade(body, -0.08 + hash01(seed, 40 + i) * 0.16);
      ctx.beginPath();
      ctx.ellipse(gx, gy, gr, gr * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha(shade(body, -0.4), 0.8);
      ctx.lineWidth = 1;
      for (let s = -1; s <= 1; s++) {
        ctx.beginPath();
        ctx.ellipse(gx + s * gr * 0.34, gy, gr * 0.3, gr * 0.78, 0, -1.2, 1.2);
        ctx.stroke();
      }
      // Stem stub, kinked the way stems are.
      ctx.strokeStyle = stem;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gx, gy - gr * 0.7);
      ctx.lineTo(gx + gr * 0.16, gy - gr * 1.02);
      ctx.stroke();
      // The carved face: triangle eyes + a gap-toothed grin. Only the LIT
      // kind wears it; the light layer supplies the candle.
      if (p.lit) {
        ctx.fillStyle = glow;
        const e = gr * 0.2;
        ctx.beginPath();
        ctx.moveTo(gx - e * 1.5, gy - e * 0.4); ctx.lineTo(gx - e * 0.5, gy - e * 0.4); ctx.lineTo(gx - e, gy - e * 1.3); ctx.closePath();
        ctx.moveTo(gx + e * 1.5, gy - e * 0.4); ctx.lineTo(gx + e * 0.5, gy - e * 0.4); ctx.lineTo(gx + e, gy - e * 1.3); ctx.closePath();
        ctx.fill();
        for (let t = 0; t < 4; t++) {
          ctx.fillRect(gx - e * 1.6 + t * e * 0.85, gy + e * (t % 2 ? 0.5 : 0.7), e * 0.6, e * 0.5);
        }
      }
    }
    ctx.restore();
  }
};

/** A GIBBET — post, reaching arm, and the hanging cage swaying on the sim
 *  clock, bone hints inside. The hanged road's furniture (top-down idiom:
 *  footprint post, beam reaching over, the cage a barred ring at its end). */
const gibbet: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; iron?: ColorSpec; bone?: ColorSpec };
  const { ctx, theme, time } = env;
  const wood = resolveColor(p.wood, theme, '#4c3e2c');
  const iron = resolveColor(p.iron, theme, '#3a3d44');
  const bone = resolveColor(p.bone, theme, '#c9bda2');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 23 + o.pos.y * 7) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? hash01(seed, 1) * Math.PI * 2);
    // The post's footprint + the arm reaching over the road.
    ctx.fillStyle = shade(wood, -0.3);
    ctx.beginPath();
    ctx.arc(-r * 0.5, 0, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(wood, -0.15);
    ctx.fillRect(-r * 0.5, -r * 0.08, r * 1.1, r * 0.16);
    // The chain: two links from arm's end to the cage ring.
    const sway = Math.sin(time * 0.9 + seed) * r * 0.08;
    const cx = r * 0.62 + sway;
    const cy = r * 0.1;
    ctx.strokeStyle = withAlpha(iron, 0.9);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(r * 0.58, -r * 0.02);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    // The cage: a barred ring, one door bar sprung.
    const cr = r * 0.34;
    ctx.strokeStyle = iron;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + hash01(seed, 3) * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * cr * 0.3, cy + Math.sin(a) * cr * 0.3);
      ctx.lineTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr);
      ctx.stroke();
    }
    // What the crows left: a pale bundle against the bars.
    ctx.fillStyle = withAlpha(bone, 0.85);
    ctx.beginPath();
    ctx.ellipse(cx - cr * 0.2, cy + cr * 0.15, cr * 0.34, cr * 0.22,
      hash01(seed, 5) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

PAINTERS.gourds = gourds;
PAINTERS.gibbet = gibbet;
