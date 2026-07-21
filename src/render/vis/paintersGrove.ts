// ---------------------------------------------------------------------------
// GROVE-COUNTRY PAINTERS — the Grove kit's brushes (the firefly country:
// lantern-flora and the hollow way down), registered into the open PAINTERS
// record from OUTSIDE the library (the paintersGarden contract: a biome kit
// brings its own looks, no painters.ts edit). Side-effect imported by the
// renderer beside the library itself. Time-free by construction so the kit
// bakes where it can — glow lives on the LIGHT LAYER (lantern_bloom's
// radiance-breathing row), never in the stroke. No gradients anywhere (the
// NaN-gradient doctrine: flat fills and arcs cannot throw).
// ---------------------------------------------------------------------------

import { PAINTERS, labelRevealed, resolveColor, type ColorSpec, type GroupPainter } from './painters';
import { hash01, shade, withAlpha } from './color';

/** THE HOLLOW BOLE — a great tree long dead and open at the root: a
 *  blackened drum of old bark, broken growth rings, buttress roots, one
 *  doorway-dark mouth at the south face and the faint cold gleam of what
 *  lives further down. The grove's way DOWN (the sidezone trigger wears
 *  it; the mound_gate label contract close-up — never baked, the label is
 *  a live read). */
const hollowBole: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { bark?: ColorSpec; gleam?: ColorSpec; label?: string };
  const { ctx, theme } = env;
  const bark = resolveColor(p.bark, theme, '#4a3a26');
  const gleam = resolveColor(p.gleam, theme, '#b8e88f');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 17 + o.pos.y * 29) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The drum: a lobed round of old bark.
    ctx.fillStyle = bark;
    ctx.beginPath();
    const lobes = 9;
    for (let i = 0; i <= lobes; i++) {
      const a = (i / lobes) * Math.PI * 2;
      const rr = r * (0.92 + hash01(seed, 10 + (i % lobes)) * 0.14);
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(bark, -0.3);
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.stroke();
    // Growth rings, broken — dead wood remembers unevenly.
    ctx.strokeStyle = withAlpha(shade(bark, -0.22), 0.8);
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const rr = r * (0.72 - i * 0.16);
      const a0 = hash01(seed, 30 + i) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(0, 0, rr, a0, a0 + Math.PI * (1.1 + hash01(seed, 40 + i) * 0.7));
      ctx.stroke();
    }
    // Buttress roots flaring past the rim.
    ctx.strokeStyle = shade(bark, -0.12);
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + hash01(seed, 50 + i) * 0.5;
      const reach = 1.1 + hash01(seed, 60 + i) * 0.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
      ctx.lineTo(Math.cos(a) * r * reach, Math.sin(a) * r * reach);
      ctx.stroke();
    }
    // The mouth: doorway-dark at the south face, gleam-dotted within —
    // the den's promise, kept by the light layer's own row.
    ctx.fillStyle = shade(bark, -0.62);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.5, r * 0.42, r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(bark, 0.2), 0.8);
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.5, r * 0.44, r * 0.36, 0, Math.PI * 0.95, Math.PI * 2.05);
    ctx.stroke();
    ctx.fillStyle = withAlpha(gleam, 0.8);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc((hash01(seed, 70 + i) - 0.5) * r * 0.5,
        r * 0.5 + (hash01(seed, 80 + i) - 0.4) * r * 0.3,
        Math.max(0.8, r * 0.035), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (p.label && labelRevealed(env, o.pos)) {
      ctx.save();
      ctx.fillStyle = '#d8d4c8';
      ctx.font = '11px Verdana';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, o.pos.x, o.pos.y + r + 14);
      ctx.restore();
    }
  }
};

PAINTERS.hollowBole = hollowBole;
