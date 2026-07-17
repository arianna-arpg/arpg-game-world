// ---------------------------------------------------------------------------
// HALLOW-COUNTRY PAINTERS — the Gloamwood country kit's brushes (the harvest
// rim, the estate deeps, and the manor's rooms), registered into the open
// PAINTERS record from OUTSIDE the library (the paintersGloam contract: a
// biome kit brings its own looks, no painters.ts edit). Side-effect imported
// by the renderer beside the library itself. Every brush here is TIME-FREE by
// construction so the whole kit bakes (bakeWhole:'static') — the candle
// glow lives on the light layer, never in the stroke.
// ---------------------------------------------------------------------------

import { PAINTERS, labelRevealed, resolveColor, type ColorSpec, type GroupPainter } from './painters';
import { hash01, shade, withAlpha } from './color';

/** A LANTERN TOTEM — carved gourds stacked on a stake, the top one grinning.
 *  The Carven Court's boundary-marker: a leaning tower read from above as a
 *  run of shrinking gourds, each ribbed, the crown carved and glowing. */
const gourdTotem: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { color?: ColorSpec; stake?: ColorSpec; glow?: ColorSpec; tiers?: number };
  const { ctx, theme } = env;
  const body = resolveColor(p.color, theme, '#c8681e');
  const stake = resolveColor(p.stake, theme, '#4c3e2c');
  const glow = resolveColor(p.glow, theme, '#ffb44a');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 17 + o.pos.y * 29) | 0) >>> 0;
    const tiers = p.tiers ?? (2 + Math.floor(hash01(seed, 1) * 2));
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? hash01(seed, 2) * Math.PI * 2);
    // The stake's shadowed foot, and the lean the stack follows.
    ctx.fillStyle = shade(stake, -0.25);
    ctx.beginPath();
    ctx.arc(-r * 0.3, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < tiers; i++) {
      const t = i / Math.max(1, tiers - 1);
      const gx = -r * 0.3 + t * r * 0.75;
      const gr = r * (0.62 - t * 0.24);
      ctx.fillStyle = shade(body, -0.12 + hash01(seed, 4 + i) * 0.2 + t * 0.06);
      ctx.beginPath();
      ctx.ellipse(gx, 0, gr, gr * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha(shade(body, -0.4), 0.8);
      ctx.lineWidth = 1;
      for (let s = -1; s <= 1; s++) {
        ctx.beginPath();
        ctx.ellipse(gx + s * gr * 0.32, 0, gr * 0.28, gr * 0.8, 0, -1.2, 1.2);
        ctx.stroke();
      }
      // Only the crown wears the face: triangle eyes, a saw grin.
      if (i === tiers - 1) {
        ctx.fillStyle = glow;
        const e = gr * 0.24;
        ctx.beginPath();
        ctx.moveTo(gx - e * 1.4, -e * 0.5); ctx.lineTo(gx - e * 0.4, -e * 0.5); ctx.lineTo(gx - e * 0.9, -e * 1.4); ctx.closePath();
        ctx.moveTo(gx + e * 1.4, -e * 0.5); ctx.lineTo(gx + e * 0.4, -e * 0.5); ctx.lineTo(gx + e * 0.9, -e * 1.4); ctx.closePath();
        ctx.fill();
        for (let m = 0; m < 3; m++) {
          ctx.fillRect(gx - e * 1.2 + m * e * 0.9, e * (m % 2 ? 0.45 : 0.65), e * 0.55, e * 0.45);
        }
      }
    }
    ctx.restore();
  }
};

/** A WICKER EFFIGY — the harvest-man: a woven withy body, arms splayed on
 *  the cross-pole, head a bound sheaf. The fields' patron scarecrow-god;
 *  params.lit sets embers smouldering in the weave. */
const wickerEffigy: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { withy?: ColorSpec; bind?: ColorSpec; ember?: ColorSpec; lit?: boolean };
  const { ctx, theme } = env;
  const withy = resolveColor(p.withy, theme, '#6a5636');
  const bind = resolveColor(p.bind, theme, '#3c3222');
  const ember = resolveColor(p.ember, theme, '#e86830');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 23 + o.pos.y * 19) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? hash01(seed, 1) * Math.PI * 2);
    // The body: a bundled trunk, woven — long strokes with a waist bind.
    ctx.strokeStyle = withy;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const off = (i - 2.5) * r * 0.12;
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, off + hash01(seed, 3 + i) * r * 0.06);
      ctx.quadraticCurveTo(0, off * 1.5, r * 0.55, off * 0.7);
      ctx.stroke();
    }
    // The cross-pole: arms splayed wide of the trunk.
    ctx.strokeStyle = shade(withy, -0.18);
    ctx.lineWidth = Math.max(2, r * 0.14);
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.85);
    ctx.lineTo(-r * 0.1, r * 0.85);
    ctx.stroke();
    // Waist and wrist bindings.
    ctx.strokeStyle = bind;
    ctx.lineWidth = 2.4;
    for (const [bx, by] of [[0, 0], [-0.1, -0.7], [-0.1, 0.7]] as const) {
      ctx.beginPath();
      ctx.arc(bx * r, by * r, r * 0.14, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The head: a bound sheaf forward of the trunk.
    ctx.fillStyle = shade(withy, 0.12);
    ctx.beginPath();
    ctx.ellipse(r * 0.62, 0, r * 0.26, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    // Embers riding the weave — the lit kind smoulders (light spec glows).
    if (p.lit) {
      ctx.fillStyle = withAlpha(ember, 0.9);
      for (let i = 0; i < 4; i++) {
        const a = hash01(seed, 10 + i) * Math.PI * 2;
        const d = (0.2 + hash01(seed, 20 + i) * 0.4) * r;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
};

/** A RAIL FENCE — a split-rail run: two sagging rails between end posts.
 *  Chain formations lay these along field lines (rot follows the chain). */
const railFence: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#55432e');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 13 + o.pos.y * 7) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // End posts.
    ctx.fillStyle = shade(wood, -0.25);
    ctx.beginPath(); ctx.arc(-r * 0.92, 0, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.92, 0, r * 0.12, 0, Math.PI * 2); ctx.fill();
    // Two rails, each with its own sag; one may have slipped.
    const slipped = hash01(seed, 1) < 0.22;
    for (let i = 0; i < 2; i++) {
      const off = (i - 0.5) * r * 0.22;
      const sag = (0.06 + hash01(seed, 3 + i) * 0.08) * r * (i === 1 && slipped ? 3.2 : 1);
      ctx.strokeStyle = shade(wood, -0.05 + i * 0.12);
      ctx.lineWidth = Math.max(1.6, r * 0.09);
      ctx.beginPath();
      ctx.moveTo(-r * 0.88, off);
      ctx.quadraticCurveTo(0, off + sag, r * 0.88, off);
      ctx.stroke();
    }
    ctx.restore();
  }
};

/** AN IRON FENCE — the estate's wrought boundary: a dark rail picketed with
 *  spear-tipped bars between stone piers. Chain formations lay the lanes. */
const ironFence: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { iron?: ColorSpec; stone?: ColorSpec };
  const { ctx, theme } = env;
  const iron = resolveColor(p.iron, theme, '#2e3138');
  const stone = resolveColor(p.stone, theme, '#5a5750');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 11 + o.pos.y * 31) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // Stone piers at the ends.
    ctx.fillStyle = stone;
    ctx.fillRect(-r * 1.0, -r * 0.14, r * 0.22, r * 0.28);
    ctx.fillRect(r * 0.78, -r * 0.14, r * 0.22, r * 0.28);
    // The top rail.
    ctx.strokeStyle = iron;
    ctx.lineWidth = Math.max(1.6, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, 0);
    ctx.lineTo(r * 0.8, 0);
    ctx.stroke();
    // Pickets: short bars with spearhead ticks; one may lean, rusted loose.
    const leanAt = Math.floor(hash01(seed, 1) * 7);
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 7; i++) {
      const x = -r * 0.72 + (i / 6) * r * 1.44;
      const lean = i === leanAt ? (hash01(seed, 2) - 0.5) * r * 0.16 : 0;
      ctx.beginPath();
      ctx.moveTo(x, -r * 0.16);
      ctx.lineTo(x + lean, r * 0.16);
      ctx.stroke();
      // Spearhead.
      ctx.beginPath();
      ctx.moveTo(x - r * 0.04, -r * 0.13);
      ctx.lineTo(x, -r * 0.24);
      ctx.lineTo(x + r * 0.04, -r * 0.13);
      ctx.closePath();
      ctx.fillStyle = iron;
      ctx.fill();
    }
    ctx.restore();
  }
};

/** A LYCH GATE — the corpse-road's roofed gateway: two heavy posts under a
 *  shingled saddle, the bier shelf between. The way in is under the roof. */
const lychGate: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; roof?: ColorSpec; ridge?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#463828');
  const roof = resolveColor(p.roof, theme, '#3a3f46');
  const ridge = resolveColor(p.ridge, theme, '#565c66');
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // Post feet either side of the way.
    ctx.fillStyle = shade(wood, -0.2);
    ctx.beginPath(); ctx.arc(0, -r * 0.78, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, r * 0.78, r * 0.18, 0, Math.PI * 2); ctx.fill();
    // The saddle roof spanning them: a slate lozenge, ridge down its spine.
    ctx.fillStyle = withAlpha(roof, 0.92);
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.95);
    ctx.lineTo(r * 0.55, -r * 0.95);
    ctx.lineTo(r * 0.62, r * 0.95);
    ctx.lineTo(-r * 0.62, r * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ridge;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(0, r * 0.9);
    ctx.stroke();
    // Shingle courses off the ridge.
    ctx.strokeStyle = withAlpha(shade(roof, -0.25), 0.7);
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const x = (i / 3.5) * r * 0.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * x, -r * 0.9);
        ctx.lineTo(s * (x + r * 0.05), r * 0.9);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
};

/** DEAD TOPIARY — the garden's clipped beast gone to wire: a shaped body
 *  that still holds its geometry, leggy sprigs escaping the silhouette. */
const deadTopiary: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { leaf?: ColorSpec; sprig?: ColorSpec };
  const { ctx, theme } = env;
  const leaf = resolveColor(p.leaf, theme, '#2c3a2a');
  const sprig = resolveColor(p.sprig, theme, '#55503a');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 19 + o.pos.y * 23) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? hash01(seed, 1) * Math.PI * 2);
    // The kept geometry: two clipped drums, still readable as a shape
    // somebody MEANT — a beast rearing, if you squint at dusk.
    ctx.fillStyle = shade(leaf, -0.08 + hash01(seed, 2) * 0.1);
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, 0, r * 0.62, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.48, -r * 0.1, r * 0.32, r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    // Clip lines: the shears' flat passes.
    ctx.strokeStyle = withAlpha(shade(leaf, -0.35), 0.8);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-r * 0.75, -r * 0.28); ctx.lineTo(r * 0.3, -r * 0.34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.3); ctx.lineTo(r * 0.28, r * 0.34); ctx.stroke();
    // What escaped: wiry sprigs past the silhouette.
    ctx.strokeStyle = withAlpha(sprig, 0.9);
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const a = hash01(seed, 5 + i) * Math.PI * 2;
      const d = r * (0.45 + hash01(seed, 12 + i) * 0.25);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * d * 0.7, Math.sin(a) * d * 0.7);
      ctx.lineTo(Math.cos(a) * (d + r * 0.3), Math.sin(a) * (d + r * 0.3));
      ctx.stroke();
    }
    ctx.restore();
  }
};

/** DUST-SHEETED FURNITURE — the house put to sleep: a pale drape over
 *  something shaped, folds running to the hem. Some of the sheets move. */
const dustSheet: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { sheet?: ColorSpec; fold?: ColorSpec };
  const { ctx, theme } = env;
  const sheet = resolveColor(p.sheet, theme, '#b8b2a4');
  const fold = resolveColor(p.fold, theme, '#7e7a6e');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 7 + o.pos.y * 37) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? hash01(seed, 1) * Math.PI * 2);
    // The draped mass: a lumpy rounded body — the thing beneath suggests
    // its corners without ever naming itself.
    ctx.fillStyle = withAlpha(sheet, 0.96);
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.4);
    ctx.quadraticCurveTo(-r * 0.2, -r * (0.75 + hash01(seed, 2) * 0.2), r * 0.5, -r * 0.55);
    ctx.quadraticCurveTo(r * 0.95, -r * 0.1, r * 0.75, r * 0.45);
    ctx.quadraticCurveTo(r * 0.1, r * (0.72 + hash01(seed, 3) * 0.2), -r * 0.6, r * 0.5);
    ctx.quadraticCurveTo(-r * 1.0, r * 0.05, -r * 0.85, -r * 0.4);
    ctx.closePath();
    ctx.fill();
    // The hem's wave at the floor.
    ctx.strokeStyle = withAlpha(fold, 0.7);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = r * (0.78 + Math.sin(a * 3 + seed) * 0.08);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.72;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    // Folds running off the high point.
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = hash01(seed, 5 + i) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.1);
      ctx.quadraticCurveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.4,
        Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.6);
      ctx.stroke();
    }
    ctx.restore();
  }
};

/** A CANDELABRA — a branched stand, three stems, wax run down the arms.
 *  The flame itself is the light layer's; the paint keeps the warm tips. */
const candelabra: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { metal?: ColorSpec; wax?: ColorSpec; flame?: ColorSpec };
  const { ctx, theme } = env;
  const metal = resolveColor(p.metal, theme, '#6a5a30');
  const wax = resolveColor(p.wax, theme, '#d8d0b8');
  const flame = resolveColor(p.flame, theme, '#ffc860');
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Base foot.
    ctx.fillStyle = shade(metal, -0.2);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Three branched arms.
    ctx.strokeStyle = metal;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r * 0.55, y = Math.sin(a) * r * 0.55;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.15, x, y);
      ctx.stroke();
      // Candle stub + warm tip.
      ctx.fillStyle = wax;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = withAlpha(flame, 0.95);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

/** A STANDING PORTRAIT — a gilt frame leant against whatever held it last;
 *  the sitter's pale oval watches out of the varnish dark. */
const standingPortrait: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { frame?: ColorSpec; canvas?: ColorSpec; face?: ColorSpec };
  const { ctx, theme } = env;
  const frame = resolveColor(p.frame, theme, '#8a6a32');
  const canvas = resolveColor(p.canvas, theme, '#181410');
  const face = resolveColor(p.face, theme, '#c8bca8');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 41 + o.pos.y * 11) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? hash01(seed, 1) * Math.PI * 2);
    // The frame: a gilt rect, corner bosses.
    ctx.fillStyle = frame;
    ctx.fillRect(-r * 0.7, -r * 0.5, r * 1.4, r * 1.0);
    ctx.fillStyle = canvas;
    ctx.fillRect(-r * 0.55, -r * 0.36, r * 1.1, r * 0.72);
    ctx.fillStyle = shade(frame, 0.2);
    for (const [cx, cy] of [[-0.7, -0.5], [0.7, -0.5], [-0.7, 0.5], [0.7, 0.5]] as const) {
      ctx.beginPath();
      ctx.arc(cx * r * 0.96, cy * r * 0.92, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    // The sitter: a pale oval and the two darker places where it looks.
    ctx.fillStyle = withAlpha(face, 0.85);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.04, r * 0.18, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = withAlpha(canvas, 0.9);
    ctx.beginPath(); ctx.arc(-r * 0.06, -r * 0.08, r * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.06, -r * 0.08, r * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
};

/** A BANQUET TABLE — the long table still laid: runner, settings, goblets,
 *  chairs pushed back the way the diners left them. One arrangement, one
 *  piece — the hall's centerpiece read whole from above. */
const banquetTable: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; runner?: ColorSpec; plate?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#4a382a');
  const runner = resolveColor(p.runner, theme, '#4a1a24');
  const plate = resolveColor(p.plate, theme, '#b8b2a0');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 17 + o.pos.y * 43) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // Chairs first, under the table's shadowed edge: squares pushed back.
    ctx.fillStyle = shade(wood, -0.22);
    const seats = 3;
    for (let i = 0; i < seats; i++) {
      const x = -r * 0.6 + (i / (seats - 1)) * r * 1.2;
      for (const s of [-1, 1]) {
        const pushed = hash01(seed, 5 + i * 2 + (s > 0 ? 1 : 0)) * r * 0.14;
        ctx.fillRect(x - r * 0.09, s * (r * 0.42 + pushed) - r * 0.09, r * 0.18, r * 0.18);
      }
    }
    // The board: a long plank top with end aprons.
    ctx.fillStyle = wood;
    ctx.fillRect(-r * 0.95, -r * 0.32, r * 1.9, r * 0.64);
    ctx.strokeStyle = withAlpha(shade(wood, 0.18), 0.6);
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = -r * 0.32 + (i / 4) * r * 0.64;
      ctx.beginPath(); ctx.moveTo(-r * 0.93, y); ctx.lineTo(r * 0.93, y); ctx.stroke();
    }
    // The runner down the middle.
    ctx.fillStyle = withAlpha(runner, 0.9);
    ctx.fillRect(-r * 0.9, -r * 0.09, r * 1.8, r * 0.18);
    // Settings: plates flanking the runner, a goblet or two still standing.
    ctx.fillStyle = plate;
    for (let i = 0; i < seats; i++) {
      const x = -r * 0.6 + (i / (seats - 1)) * r * 1.2;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x, s * r * 0.21, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = shade(plate, -0.3);
    ctx.beginPath();
    ctx.arc(r * (hash01(seed, 2) - 0.5) * 1.2, r * 0.12, r * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

/** A GRANDFATHER CLOCK — the tall case against its wall: hood, trunk,
 *  the pale face and its stopped hands. It knows what hour it kept. */
const caseClock: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { case?: ColorSpec; face?: ColorSpec; hand?: ColorSpec };
  const { ctx, theme } = env;
  const body = resolveColor(p.case, theme, '#3e2e20');
  const face = resolveColor(p.face, theme, '#d8d0b8');
  const hand = resolveColor(p.hand, theme, '#2a2118');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 53 + o.pos.y * 17) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // The case: trunk rect, wider hood block at the head.
    ctx.fillStyle = body;
    ctx.fillRect(-r * 0.38, -r * 0.85, r * 0.76, r * 1.7);
    ctx.fillStyle = shade(body, 0.12);
    ctx.fillRect(-r * 0.46, -r * 0.95, r * 0.92, r * 0.42);
    // The face and the hour it stopped at.
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(0, -r * 0.72, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hand;
    ctx.lineWidth = 1.4;
    const stopped = hash01(seed, 1) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.72);
    ctx.lineTo(Math.cos(stopped) * r * 0.18, -r * 0.72 + Math.sin(stopped) * r * 0.18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.72);
    ctx.lineTo(Math.cos(stopped + 2.2) * r * 0.11, -r * 0.72 + Math.sin(stopped + 2.2) * r * 0.11);
    ctx.stroke();
    // The pendulum door's glass slit, the bob a still glint behind it.
    ctx.fillStyle = withAlpha('#10141c', 0.85);
    ctx.fillRect(-r * 0.14, -r * 0.28, r * 0.28, r * 0.92);
    ctx.fillStyle = withAlpha('#c8b060', 0.8);
    ctx.beginPath();
    ctx.arc(0, r * 0.3, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

/** A STANDING MIRROR — the cheval glass: an oval that holds more dark than
 *  the room gives it. The frame leans; the glass never quite faces you. */
const standingMirror: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { frame?: ColorSpec; glass?: ColorSpec; glint?: ColorSpec };
  const { ctx, theme } = env;
  const frame = resolveColor(p.frame, theme, '#5a4a2c');
  const glass = resolveColor(p.glass, theme, '#0e1418');
  const glint = resolveColor(p.glint, theme, '#8fb0c0');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 37 + o.pos.y * 23) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? hash01(seed, 1) * Math.PI * 2);
    // The stand's feet.
    ctx.strokeStyle = shade(frame, -0.2);
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-r * 0.35, -r * 0.4); ctx.lineTo(-r * 0.35, r * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.35, -r * 0.4); ctx.lineTo(r * 0.35, r * 0.4); ctx.stroke();
    // The oval: frame ring, then the glass dark.
    ctx.strokeStyle = frame;
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.42, r * 0.66, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.36, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // One long cold glint across it.
    ctx.strokeStyle = withAlpha(glint, 0.5);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, -r * 0.42);
    ctx.lineTo(r * 0.14, r * 0.34);
    ctx.stroke();
    ctx.restore();
  }
};

/** A STAIR FLIGHT — steps rising into the house's dark: treads narrowing
 *  toward the landing, newel posts at the foot. The way UP (or down);
 *  params.label names the destination (roof-gated like every doorway). */
const stairFlight: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; dark?: ColorSpec; runner?: ColorSpec; label?: string };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#4c3a28');
  const dark = resolveColor(p.dark, theme, '#0a0808');
  const runner = resolveColor(p.runner, theme, '#4a1a24');
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // Where the stairs go: the dark past the top tread.
    ctx.fillStyle = dark;
    ctx.fillRect(r * 0.4, -r * 0.5, r * 0.55, r * 1.0);
    // Treads: bars narrowing toward the dark.
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const x = -r * 0.75 + t * r * 1.1;
      const hh = r * (0.62 - t * 0.14);
      ctx.fillStyle = shade(wood, -0.05 - t * 0.22);
      ctx.fillRect(x, -hh, r * 0.2, hh * 2);
    }
    // The runner up the middle.
    ctx.fillStyle = withAlpha(runner, 0.75);
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, -r * 0.16);
    ctx.lineTo(r * 0.4, -r * 0.1);
    ctx.lineTo(r * 0.4, r * 0.1);
    ctx.lineTo(-r * 0.75, r * 0.16);
    ctx.closePath();
    ctx.fill();
    // Newel posts at the foot.
    ctx.fillStyle = shade(wood, 0.1);
    ctx.beginPath(); ctx.arc(-r * 0.8, -r * 0.62, r * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-r * 0.8, r * 0.62, r * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // The destination, named upright regardless of the flight's turn.
    if (p.label && labelRevealed(env, o.pos)) {
      ctx.save();
      ctx.translate(o.pos.x, o.pos.y);
      ctx.fillStyle = '#d8d4c8';
      ctx.font = '11px Verdana';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, 0, r + 14);
      ctx.restore();
    }
  }
};

PAINTERS.gourdTotem = gourdTotem;
PAINTERS.wickerEffigy = wickerEffigy;
PAINTERS.railFence = railFence;
PAINTERS.ironFence = ironFence;
PAINTERS.lychGate = lychGate;
PAINTERS.deadTopiary = deadTopiary;
PAINTERS.dustSheet = dustSheet;
PAINTERS.candelabra = candelabra;
PAINTERS.standingPortrait = standingPortrait;
PAINTERS.banquetTable = banquetTable;
PAINTERS.caseClock = caseClock;
PAINTERS.standingMirror = standingMirror;
PAINTERS.stairFlight = stairFlight;
