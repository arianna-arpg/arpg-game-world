// ---------------------------------------------------------------------------
// GARDEN-COUNTRY PAINTERS — the Garden kit's brushes (the bug-high country:
// blossom crowns the size of oaks, the Tender's relics, the colony's earth),
// registered into the open PAINTERS record from OUTSIDE the library (the
// paintersGloam contract: a biome kit brings its own looks, no painters.ts
// edit). Side-effect imported by the renderer beside the library itself.
// Every brush here is TIME-FREE by construction so the whole kit bakes —
// glow lives on the light layer, sway on the canopy fade, never in the
// stroke. No gradients anywhere (the NaN-gradient doctrine: gradients are
// the one throwing sink; flat fills and arcs cannot).
// ---------------------------------------------------------------------------

import {
  CANOPY_PAINTERS, CANOPY_STATIC, PAINTERS, labelRevealed, resolveColor,
  type CanopyPainter, type ColorSpec, type GroupPainter,
} from './painters';
import { hash01, shade, withAlpha } from './color';

/** THE BLOOM CROWN — a giant flower head seen from above: one ring of fat
 *  petals (two on the grand stalks) around a seeded heart disc. At bug
 *  height this is the tree canopy of the country — same veil, same fade,
 *  utterly different silhouette from every leaf crown in the game. Pure
 *  function of (pos seed, radius, params, theme) → CANOPY_STATIC bakes it. */
const bloomCrown: CanopyPainter = (env, o, alpha, params) => {
  const p = params as {
    petal?: ColorSpec; petal2?: ColorSpec; heart?: ColorSpec;
    petals?: number; rows?: number; notch?: number;
  };
  const { ctx, theme } = env;
  const seed = ((o.pos.x * 13 + o.pos.y * 31) | 0) >>> 0;
  const petal = resolveColor(p.petal, theme, '#e08ab8');
  const petal2 = resolveColor(p.petal2, theme, shade(resolveColor(p.petal, theme, '#e08ab8'), -0.14));
  const heart = resolveColor(p.heart, theme, '#e8c84a');
  const n = Math.max(5, Math.round(p.petals ?? (7 + Math.floor(hash01(seed, 1) * 3))));
  const rows = Math.max(1, Math.round(p.rows ?? 1));
  const r = o.radius;
  ctx.save();
  ctx.translate(o.pos.x, o.pos.y);
  ctx.globalAlpha = alpha;
  ctx.rotate(hash01(seed, 2) * Math.PI * 2);
  for (let row = rows - 1; row >= 0; row--) {
    const rr = r * (1 - row * 0.3);
    const tone = row === 0 ? petal : petal2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + row * (Math.PI / n);
      const wob = 0.88 + hash01(seed, 10 + row * 32 + i) * 0.24;
      const tipR = rr * wob;
      const halfW = (Math.PI / n) * 0.82;
      ctx.fillStyle = shade(tone, (i % 2 ? 0.05 : -0.04) + hash01(seed, 40 + i) * 0.06);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - halfW) * rr * 0.3, Math.sin(a - halfW) * rr * 0.3);
      ctx.quadraticCurveTo(
        Math.cos(a - halfW * 0.7) * tipR, Math.sin(a - halfW * 0.7) * tipR,
        Math.cos(a) * tipR * (1 - (p.notch ?? 0) * 0.18), Math.sin(a) * tipR * (1 - (p.notch ?? 0) * 0.18));
      ctx.quadraticCurveTo(
        Math.cos(a + halfW * 0.7) * tipR, Math.sin(a + halfW * 0.7) * tipR,
        Math.cos(a + halfW) * rr * 0.3, Math.sin(a + halfW) * rr * 0.3);
      ctx.closePath();
      ctx.fill();
      // A crease down each petal so the crown reads lobed, not blobbed.
      ctx.strokeStyle = withAlpha(shade(tone, -0.28), 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * rr * 0.34, Math.sin(a) * rr * 0.34);
      ctx.lineTo(Math.cos(a) * tipR * 0.9, Math.sin(a) * tipR * 0.9);
      ctx.stroke();
    }
  }
  // The heart: a seeded disc of florets — dotted, never gradient-glowed.
  const hr = r * 0.34;
  ctx.fillStyle = heart;
  ctx.beginPath(); ctx.arc(0, 0, hr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = withAlpha(shade(heart, -0.3), 0.85);
  const dots = 8 + Math.floor(hash01(seed, 3) * 5);
  for (let i = 0; i < dots; i++) {
    const da = hash01(seed, 60 + i) * Math.PI * 2;
    const dr = Math.sqrt(hash01(seed, 90 + i)) * hr * 0.75;
    ctx.beginPath(); ctx.arc(Math.cos(da) * dr, Math.sin(da) * dr, Math.max(1, hr * 0.09), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
};

/** THE TENDER'S RELICS — the giant gardener's dropped tools, one painter,
 *  four forms (params.form): 'can' a watering can lying on its side,
 *  'jar' a bell jar (glass dome — see-through by law, so only rim + shine),
 *  'trowel' a half-buried blade, 'idol' the hooded Tender figure the
 *  garden folk raise from a seed-scale guess at their absent giant. */
const gardenRelic: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as {
    form?: 'can' | 'jar' | 'trowel' | 'idol';
    metal?: ColorSpec; glass?: ColorSpec; stone?: ColorSpec; label?: string;
  };
  const { ctx, theme } = env;
  const metal = resolveColor(p.metal, theme, '#7a8a8e');
  const glass = resolveColor(p.glass, theme, '#cfe6e2');
  const stone = resolveColor(p.stone, theme, '#9a9284');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 23 + o.pos.y * 7) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? hash01(seed, 1) * Math.PI * 2);
    const form = p.form ?? 'can';
    if (form === 'can') {
      // The drum on its side, seam-banded; spout and loop handle read the
      // silhouette at a glance. Verdigris blooms where the rain sat.
      ctx.fillStyle = metal;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = shade(metal, -0.25); ctx.lineWidth = Math.max(1.5, r * 0.05);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-r * 0.2, 0, r * 0.4, r * 0.44, 0, -1.4, 1.4); ctx.stroke();
      // Spout: a tapering arm out the facing end, rose flared.
      ctx.strokeStyle = shade(metal, -0.1); ctx.lineWidth = Math.max(2, r * 0.16);
      ctx.beginPath(); ctx.moveTo(r * 0.6, -r * 0.08); ctx.lineTo(r * 1.28, -r * 0.42); ctx.stroke();
      ctx.fillStyle = shade(metal, 0.08);
      ctx.beginPath(); ctx.arc(r * 1.3, -r * 0.44, r * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = withAlpha(shade(metal, -0.45), 0.8);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(r * 1.3 + Math.cos(a) * r * 0.08, -r * 0.44 + Math.sin(a) * r * 0.08, r * 0.025, 0, Math.PI * 2); ctx.fill();
      }
      // Loop handle over the drum; a verdigris stain patch.
      ctx.strokeStyle = shade(metal, -0.2); ctx.lineWidth = Math.max(1.5, r * 0.09);
      ctx.beginPath(); ctx.ellipse(-r * 0.62, 0, r * 0.26, r * 0.34, 0, -1.6, 1.6); ctx.stroke();
      ctx.fillStyle = withAlpha('#5a8a6a', 0.5);
      ctx.beginPath(); ctx.ellipse(r * 0.18, r * 0.22, r * 0.22, r * 0.13, 0.5, 0, Math.PI * 2); ctx.fill();
    } else if (form === 'jar') {
      // Glass reads as its RIM and its shine — the dome itself stays air
      // (the rule wears blocksShot:false, so the look must promise it).
      ctx.fillStyle = withAlpha(glass, 0.16);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withAlpha(glass, 0.85); ctx.lineWidth = Math.max(2, r * 0.07);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = withAlpha('#ffffff', 0.5); ctx.lineWidth = Math.max(1.5, r * 0.05);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.7, -2.4, -1.1); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.52, 0.6, 1.3); ctx.stroke();
      // The lifting knob, dead center — the one solid thing about it.
      ctx.fillStyle = withAlpha(glass, 0.9);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withAlpha(shade(glass, -0.3), 0.9); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2); ctx.stroke();
    } else if (form === 'trowel') {
      // Blade half in the soil at a dig angle, wooden grip skyward.
      ctx.fillStyle = withAlpha('#241e14', 0.5);
      ctx.beginPath(); ctx.ellipse(r * 0.2, r * 0.1, r * 0.6, r * 0.3, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shade(metal, 0.05);
      ctx.beginPath();
      ctx.moveTo(r * 0.9, 0);
      ctx.quadraticCurveTo(r * 0.3, -r * 0.42, -r * 0.25, -r * 0.18);
      ctx.lineTo(-r * 0.25, r * 0.18);
      ctx.quadraticCurveTo(r * 0.3, r * 0.42, r * 0.9, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade(metal, -0.35); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(r * 0.85, 0); ctx.lineTo(-r * 0.2, 0); ctx.stroke();
      ctx.strokeStyle = '#6a5636'; ctx.lineWidth = Math.max(2.5, r * 0.16); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.3, 0); ctx.lineTo(-r * 0.85, 0); ctx.stroke();
    } else {
      // The idol: a hooded figure of stacked garden stone, moss-shouldered —
      // the Tender as the small lives remember someone that tall.
      ctx.fillStyle = withAlpha('#141810', 0.45);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.62, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = stone;
      ctx.beginPath(); ctx.ellipse(-r * 0.1, 0, r * 0.52, r * 0.44, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shade(stone, 0.12);
      ctx.beginPath(); ctx.arc(r * 0.28, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
      // The hood's shadowed face-slot, aimed along rot.
      ctx.fillStyle = shade(stone, -0.5);
      ctx.beginPath(); ctx.ellipse(r * 0.4, 0, r * 0.12, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = withAlpha('#5a7a44', 0.6);
      ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.2, r * 0.18, r * 0.1, 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (p.label && labelRevealed(env, o.pos)) {
      ctx.save();
      ctx.fillStyle = '#d8d4c8'; ctx.font = '11px Verdana'; ctx.textAlign = 'center';
      ctx.fillText(p.label, o.pos.x, o.pos.y + r + 14);
      ctx.restore();
    }
  }
};

/** A TRELLIS FRAME — the Tender's lattice, bug-high: two rails and a
 *  diagonal weave, runner vines threading the squares. Oriented by rot so
 *  rows read as ROWS. Shots thread the lattice (the rule says so); the look
 *  promises it by staying mostly air. */
const trellisFrame: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; vine?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#8a6f46');
  const vine = resolveColor(p.vine, theme, '#4a7a34');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 19 + o.pos.y * 3) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // Rails top and bottom of the long axis.
    ctx.strokeStyle = shade(wood, -0.1);
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.beginPath(); ctx.moveTo(-r, -r * 0.34); ctx.lineTo(r, -r * 0.34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r, r * 0.34); ctx.lineTo(r, r * 0.34); ctx.stroke();
    // The diagonal weave, both hands.
    ctx.lineWidth = Math.max(1.2, r * 0.05);
    ctx.strokeStyle = withAlpha(wood, 0.85);
    const step = Math.max(8, r * 0.3);
    for (let x = -r; x <= r; x += step) {
      ctx.beginPath(); ctx.moveTo(x - r * 0.2, r * 0.34); ctx.lineTo(x + r * 0.2, -r * 0.34); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + r * 0.2, r * 0.34); ctx.lineTo(x - r * 0.2, -r * 0.34); ctx.stroke();
    }
    // Runner vines claim a stretch each — leaf dots on a lazy line.
    ctx.strokeStyle = withAlpha(vine, 0.9);
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    const v0 = -r + hash01(seed, 1) * r;
    ctx.beginPath();
    ctx.moveTo(v0, r * 0.34);
    ctx.quadraticCurveTo(v0 + r * 0.3, 0, v0 + r * 0.2, -r * 0.34);
    ctx.stroke();
    ctx.fillStyle = vine;
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      ctx.beginPath();
      ctx.arc(v0 + t * r * 0.24 + Math.sin(t * 5 + seed) * r * 0.06, r * 0.34 - t * r * 0.68, Math.max(1.5, r * 0.06), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

/** WAX COMB — the colony's cell-work grown over a wall or floor patch: a
 *  seeded hex lattice in an oval, a few cells capped proud, a few open dark.
 *  The formicary's dressing and the skep's spilled work both wear it. */
const waxComb: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wax?: ColorSpec; cap?: ColorSpec };
  const { ctx, theme } = env;
  const wax = resolveColor(p.wax, theme, '#c8a24a');
  const cap = resolveColor(p.cap, theme, '#e8cf7a');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 29 + o.pos.y * 13) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? hash01(seed, 1) * Math.PI * 2);
    ctx.fillStyle = shade(wax, -0.22);
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.78, 0, 0, Math.PI * 2); ctx.fill();
    const cell = Math.max(4, r * 0.24);
    const w = cell * 1.732;
    let k = 0;
    for (let gy = -r; gy <= r; gy += cell * 1.5) {
      const odd = Math.round(gy / (cell * 1.5)) % 2 !== 0;
      for (let gx = -r; gx <= r; gx += w) {
        const cx = gx + (odd ? w / 2 : 0), cy = gy;
        if ((cx * cx) / (r * r) + (cy * cy) / (r * 0.78 * r * 0.78) > 0.8) continue;
        k++;
        const roll = hash01(seed, 100 + k);
        ctx.fillStyle = roll < 0.2 ? shade(wax, -0.5) : roll > 0.82 ? cap : wax;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          const px = cx + Math.cos(a) * cell * 0.52, py = cy + Math.sin(a) * cell * 0.52;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = withAlpha(shade(wax, -0.4), 0.7);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore();
  }
};

/** A DEW BEAD — one held raindrop, bug-huge: a glass ball on the ground,
 *  all rim-shine and a caught fleck of sky. No gradients (the doctrine);
 *  the wet gleam is two arcs and a window square. */
const dewBead: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { water?: ColorSpec };
  const { ctx, theme } = env;
  const water = resolveColor(p.water, theme, '#9ed4e8');
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.fillStyle = withAlpha(shade(water, -0.35), 0.55);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = withAlpha(water, 0.5);
    ctx.beginPath(); ctx.arc(-r * 0.12, -r * 0.12, r * 0.82, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = withAlpha('#ffffff', 0.75);
    ctx.lineWidth = Math.max(1.5, r * 0.09);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.86, -2.6, -1.2); ctx.stroke();
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0.5, 1.4); ctx.stroke();
    // The caught window of sky.
    ctx.fillStyle = withAlpha('#ffffff', 0.85);
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.34, r * 0.16, r * 0.1, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

/** THE MOUND SPIRE — the colony's chimney: stacked earthen lobes tapering
 *  as they climb, vent-dark at the crown, the worked soil striped with
 *  carry-lines. The gate variant (params.mouth) opens a doorway-dark arch
 *  at the foot and names itself when near. */
const moundSpire: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { earth?: ColorSpec; mouth?: boolean; label?: string };
  const { ctx, theme } = env;
  const earth = resolveColor(p.earth, theme, '#8a6a46');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 37 + o.pos.y * 11) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Skirt of spilled tailings.
    ctx.fillStyle = shade(earth, -0.2);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.06, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
    // Stacked lobes, each offset a little — the spire read from above.
    const tiers = 3 + Math.floor(hash01(seed, 1) * 2);
    for (let i = 0; i < tiers; i++) {
      const t = i / Math.max(1, tiers - 1);
      const lr = r * (0.92 - t * 0.5);
      const ox = (hash01(seed, 5 + i) - 0.5) * r * 0.24 * (1 - t);
      const oy = (hash01(seed, 15 + i) - 0.5) * r * 0.24 * (1 - t);
      ctx.fillStyle = shade(earth, -0.05 + t * 0.16);
      ctx.beginPath(); ctx.arc(ox, oy, lr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withAlpha(shade(earth, -0.35), 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ox, oy, lr, hash01(seed, 25 + i) * 6, hash01(seed, 25 + i) * 6 + 2.2); ctx.stroke();
    }
    // The crown vent, always dark.
    ctx.fillStyle = shade(earth, -0.62);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
    if (p.mouth) {
      // The gate: a doorway-dark arch at the skirt's south face.
      ctx.fillStyle = shade(earth, -0.58);
      ctx.beginPath(); ctx.ellipse(0, r * 0.62, r * 0.34, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withAlpha(shade(earth, 0.18), 0.8);
      ctx.lineWidth = Math.max(1.5, r * 0.06);
      ctx.beginPath(); ctx.ellipse(0, r * 0.62, r * 0.36, r * 0.28, 0, Math.PI * 0.9, Math.PI * 2.1); ctx.stroke();
    }
    ctx.restore();
    if (p.label && labelRevealed(env, o.pos)) {
      ctx.save();
      ctx.fillStyle = '#d8d4c8'; ctx.font = '11px Verdana'; ctx.textAlign = 'center';
      ctx.fillText(p.label, o.pos.x, o.pos.y + r + 14);
      ctx.restore();
    }
  }
};

PAINTERS.gardenRelic = gardenRelic;
PAINTERS.trellisFrame = trellisFrame;
PAINTERS.waxComb = waxComb;
PAINTERS.dewBead = dewBead;
PAINTERS.moundSpire = moundSpire;

CANOPY_PAINTERS.bloomCrown = bloomCrown;
// Time-free by construction (pos-seeded, params, theme) — the crown bakes.
CANOPY_STATIC.bloomCrown = true;
