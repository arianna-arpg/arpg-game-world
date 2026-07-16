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

/** A FEEDING STAKE — the Court's larder-post: a leaning stake, an iron
 *  shackle swaying on its short chain, and the ground under it stained the
 *  colour the Court leaves. The feast lane's furniture. */
const feedingStake: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; iron?: ColorSpec; stain?: ColorSpec };
  const { ctx, theme, time } = env;
  const wood = resolveColor(p.wood, theme, '#4c3a2c');
  const iron = resolveColor(p.iron, theme, '#3a3d44');
  const stain = resolveColor(p.stain, theme, '#4a1620');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 19 + o.pos.y * 11) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? hash01(seed, 1) * Math.PI * 2);
    // The stain first: what the ground kept.
    ctx.fillStyle = withAlpha(stain, 0.45);
    ctx.beginPath();
    ctx.ellipse(r * 0.1, 0, r * 1.15, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    // The stake: a driven post's footprint and its lean.
    ctx.strokeStyle = shade(wood, -0.1);
    ctx.lineWidth = Math.max(2, r * 0.3);
    ctx.beginPath();
    ctx.moveTo(-r * 0.15, 0);
    ctx.lineTo(r * 0.55, 0);
    ctx.stroke();
    ctx.fillStyle = shade(wood, -0.25);
    ctx.beginPath();
    ctx.arc(-r * 0.15, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    // The shackle: an iron ring on a short chain, swaying on the sim clock.
    const sway = Math.sin(time * 1.1 + seed) * r * 0.1;
    const cx = r * 0.62 + sway, cy = r * 0.12;
    ctx.strokeStyle = withAlpha(iron, 0.95);
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(r * 0.4, 0); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
};

/** A COACH WRECK — the Court's carriage after somebody's noon: a charred
 *  lacquer box down on a snapped axle, one tall wheel leaning free, the
 *  lamp iron that didn't burn. A reclaimed feeding ground's headstone. */
const coachWreck: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { char?: ColorSpec; wood?: ColorSpec; iron?: ColorSpec };
  const { ctx, theme } = env;
  const char = resolveColor(p.char, theme, '#241f22');
  const wood = resolveColor(p.wood, theme, '#3c3230');
  const iron = resolveColor(p.iron, theme, '#3a3d44');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 13 + o.pos.y * 29) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? hash01(seed, 1) * Math.PI * 2);
    // The body: a lacquer-black box, one corner caved in.
    ctx.fillStyle = char;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.5);
    ctx.lineTo(r * 0.7, -r * 0.55);
    ctx.lineTo(r * 0.9, r * 0.15);
    ctx.lineTo(r * 0.55, r * 0.52);
    ctx.lineTo(-r * 0.8, r * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(char, 0.25), 0.7);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Sprung plank seams across the roof.
    ctx.strokeStyle = withAlpha(shade(wood, 0.18), 0.55);
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const x = -r * 0.6 + i * r * 0.45 + hash01(seed, 4 + i) * r * 0.1;
      ctx.beginPath();
      ctx.moveTo(x, -r * 0.45);
      ctx.lineTo(x + r * 0.08, r * 0.42);
      ctx.stroke();
    }
    // The freed wheel, leaning where it rolled: rim + spokes.
    const wx = -r * (0.95 + hash01(seed, 2) * 0.25);
    const wy = r * (0.3 - hash01(seed, 3) * 0.6);
    const wr = r * 0.42;
    ctx.strokeStyle = iron;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + hash01(seed, 6) * 0.8;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr);
      ctx.stroke();
    }
    // A cold lamp, fallen forward — the glass dark.
    ctx.fillStyle = withAlpha(iron, 0.9);
    ctx.fillRect(r * 0.62, -r * 0.2, r * 0.16, r * 0.24);
    ctx.restore();
  }
};

/** DRAINED HUSKS — the feast's leavings: whole bodies folded where they
 *  knelt, bled to wax. Deliberately NOT a bone pile — these are recent,
 *  and the two dark points at the throat say exactly what happened. */
const drainedHusk: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { skin?: ColorSpec; shade?: ColorSpec };
  const { ctx, theme } = env;
  const skin = resolveColor(p.skin, theme, '#cfc4bd');
  const dim = resolveColor(p.shade, theme, '#8a7a80');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 31 + o.pos.y * 17) | 0) >>> 0;
    const n = 1 + Math.floor(hash01(seed, 1) * 2);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(hash01(seed, 2) * Math.PI * 2);
    for (let i = 0; i < n; i++) {
      const off = i === 0 ? 0 : r * 0.55;
      const ox = Math.cos(hash01(seed, 3 + i) * Math.PI * 2) * off;
      const oy = Math.sin(hash01(seed, 5 + i) * Math.PI * 2) * off;
      const br = r * (n === 1 ? 0.72 : 0.5 + hash01(seed, 7 + i) * 0.16);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(hash01(seed, 9 + i) * Math.PI * 2);
      // The folded body: torso curl, head turned away, legs drawn up.
      ctx.fillStyle = withAlpha(skin, 0.95);
      ctx.beginPath();
      ctx.ellipse(0, 0, br, br * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = withAlpha(skin, 0.9);
      ctx.beginPath();
      ctx.arc(br * 0.75, br * 0.1, br * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-br * 0.5, br * 0.35, br * 0.45, br * 0.2, 0.6, 0, Math.PI * 2);
      ctx.fill();
      // The grey where the blood should be.
      ctx.strokeStyle = withAlpha(dim, 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, br * 0.98, br * 0.53, 0, 0.4, 2.2);
      ctx.stroke();
      // Two small dark points at the throat.
      ctx.fillStyle = withAlpha('#5a2430', 0.9);
      ctx.beginPath(); ctx.arc(br * 0.52, br * 0.02, br * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(br * 0.62, br * 0.1, br * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
};

PAINTERS.gourds = gourds;
PAINTERS.gibbet = gibbet;
PAINTERS.feedingStake = feedingStake;
PAINTERS.coachWreck = coachWreck;
PAINTERS.drainedHusk = drainedHusk;
