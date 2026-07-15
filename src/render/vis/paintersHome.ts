// ---------------------------------------------------------------------------
// HOME PAINTERS — the hearth-and-bed kit's brushes (the Waking House wave),
// registered into the open PAINTERS record from OUTSIDE the library, exactly
// as the Gloamwood kit does. Side-effect imported by the renderer.
//
// Top-down doctrine holds: these draw GROUND FOOTPRINTS (the hit-surface
// contract) — a bed is its frame's slab, a shelf its board's shadow-width,
// never a sprite-height façade. bed/stool/shelf/rug are time-free and tagged
// bakeWhole:'static' in their visual rows; the hearth's flame reads env.time
// and stays live (one per home — the light layer does the real glowing).
// ---------------------------------------------------------------------------

import { PAINTERS, resolveColor, type ColorSpec, type GroupPainter } from './painters';
import { hash01, shade, withAlpha } from './color';

/** A BED — timber frame, straw mattress, wool blanket pulled to the foot,
 *  pillow at the head. Drawn headboard-north (axis-pinned like its surface:
 *  orient 'fixed'); footprint 1.44r × 2.1r, the rule's slab as drawn. */
const bed: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as {
    frame?: ColorSpec; straw?: ColorSpec; wool?: ColorSpec; pillow?: ColorSpec;
  };
  const { ctx, theme } = env;
  const frame = resolveColor(p.frame, theme, '#5c4630');
  const straw = resolveColor(p.straw, theme, '#a89058');
  const wool = resolveColor(p.wool, theme, '#7a4a3a');
  const pillow = resolveColor(p.pillow, theme, '#cabb9a');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 19 + o.pos.y * 11) | 0) >>> 0;
    const hw = r * 0.72, hh = r * 1.05;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The frame: a plank slab a shade deeper than the floor it stands on,
    // headboard thickened across the top edge.
    ctx.fillStyle = frame;
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
    ctx.fillStyle = shade(frame, -0.22);
    ctx.fillRect(-hw, -hh, hw * 2, r * 0.22);
    // The mattress inset, straw-toned, with a few pressed seams.
    const mx = hw * 0.82, mTop = -hh + r * 0.26, mBot = hh - r * 0.12;
    ctx.fillStyle = straw;
    ctx.fillRect(-mx, mTop, mx * 2, mBot - mTop);
    ctx.strokeStyle = withAlpha(shade(straw, -0.3), 0.5);
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const sy = mTop + (mBot - mTop) * (0.3 + 0.22 * i + hash01(seed, 3 + i) * 0.05);
      ctx.beginPath();
      ctx.moveTo(-mx * 0.9, sy);
      ctx.lineTo(mx * 0.9, sy);
      ctx.stroke();
    }
    // The blanket: wool pulled up from the foot, its hem a lighter fold —
    // someone slept here and left it thrown back (the waking, drawn).
    const hemY = mTop + (mBot - mTop) * (0.42 + hash01(seed, 9) * 0.08);
    ctx.fillStyle = wool;
    ctx.fillRect(-mx, hemY, mx * 2, mBot - hemY);
    ctx.fillStyle = shade(wool, 0.18);
    ctx.fillRect(-mx, hemY, mx * 2, r * 0.1);
    // The pillow, dented off-center toward where the sleeper rolled out.
    ctx.fillStyle = pillow;
    ctx.beginPath();
    ctx.ellipse(-hw * 0.1 + hash01(seed, 5) * hw * 0.2, mTop + r * 0.24,
      hw * 0.52, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(pillow, -0.35), 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
};

/** The HEARTH — a fieldstone horseshoe open to the south, embers breathing
 *  in its mouth, two small flame licks on the sim clock. LIVE by design
 *  (time-driven): one hearth per home, so no bake is owed. The doodad's
 *  light row carries the actual room-glow. */
const hearth: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as {
    stone?: ColorSpec; mouth?: ColorSpec; ember?: ColorSpec; flame?: ColorSpec;
  };
  const { ctx, theme, time } = env;
  const stone = resolveColor(p.stone, theme, '#6a6258');
  const mouth = resolveColor(p.mouth, theme, '#241a12');
  const ember = resolveColor(p.ember, theme, '#ff9a48');
  const flame = resolveColor(p.flame, theme, '#ffc878');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 29 + o.pos.y * 17) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The firebox floor: soot over stone, so the stones ring something.
    ctx.fillStyle = mouth;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.06, r * 0.62, r * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
    // The ember bed: a warm heap pulsing on slow breath.
    const breath = 0.75 + 0.25 * Math.sin(time * 2.1 + seed);
    ctx.fillStyle = withAlpha(ember, 0.55 + 0.3 * breath);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.4, r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    // Two flame licks, out of phase — small: a kept fire, not a blaze.
    ctx.fillStyle = withAlpha(flame, 0.85);
    for (let i = 0; i < 2; i++) {
      const fx = (i === 0 ? -1 : 1) * r * 0.14;
      const lick = Math.max(0, Math.sin(time * 3.4 + i * 2.1 + seed));
      const fh = r * (0.18 + 0.2 * lick);
      ctx.beginPath();
      ctx.moveTo(fx - r * 0.09, r * 0.12);
      ctx.quadraticCurveTo(fx + (i === 0 ? -1 : 1) * r * 0.06, r * 0.12 - fh * 1.6, fx + r * 0.02, r * 0.12 - fh);
      ctx.quadraticCurveTo(fx + r * 0.1, r * 0.12 - fh * 0.4, fx + r * 0.09, r * 0.12);
      ctx.closePath();
      ctx.fill();
    }
    // The fieldstone horseshoe: rounded stones stacked around the back arc,
    // mouth open south toward the room. Seeded sizes so no two hearths match.
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI; // π..2π: the back half
      const sr = r * (0.2 + hash01(seed, 10 + i) * 0.08);
      const sx = Math.cos(a) * r * 0.62;
      const sy = Math.sin(a) * r * 0.5 + r * 0.02;
      ctx.fillStyle = shade(stone, -0.12 + hash01(seed, 20 + i) * 0.24);
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr, sr * 0.82, hash01(seed, 30 + i) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

/** A STOOL — three-legged seat by the fire: a worn round top, leg nubs
 *  peeking past the rim, one ring of grain. */
const stool: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#6a5438');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 13 + o.pos.y * 31) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Leg nubs first, under the seat's rim.
    ctx.fillStyle = shade(wood, -0.35);
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i / 3) * Math.PI * 2 + hash01(seed, 1) * 0.5;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    // The seat: a hand-smoothed disc, one grain ring, a lighter sat-shine.
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(wood, -0.3), 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = withAlpha(shade(wood, 0.16), 0.5);
    ctx.beginPath();
    ctx.ellipse(-r * 0.14, -r * 0.14, r * 0.3, r * 0.22, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

/** A SHELF — a wall board holding jars and one small keepsake: wide, shallow,
 *  axis-pinned to hug the wall behind it (surface orient 'fixed'). */
const shelf: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; jars?: ColorSpec; keepsake?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#5c4630');
  const jars = resolveColor(p.jars, theme, '#8a9a74');
  const keepsake = resolveColor(p.keepsake, theme, '#caa85e');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 37 + o.pos.y * 7) | 0) >>> 0;
    const hw = r * 0.95, hh = r * 0.34;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The board and its bracket shadows.
    ctx.fillStyle = wood;
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
    ctx.fillStyle = shade(wood, -0.28);
    ctx.fillRect(-hw * 0.72, hh * 0.35, hw * 0.16, hh * 0.6);
    ctx.fillRect(hw * 0.56, hh * 0.35, hw * 0.16, hh * 0.6);
    // Jars in a family line — the pantry's little congregation.
    const n = 2 + ((hash01(seed, 2) * 2) | 0);
    for (let i = 0; i < n; i++) {
      const jx = -hw * 0.55 + (i / Math.max(1, n - 1)) * hw * 0.9 + hash01(seed, 4 + i) * r * 0.08;
      const jr = r * (0.14 + hash01(seed, 8 + i) * 0.07);
      ctx.fillStyle = shade(jars, -0.15 + hash01(seed, 12 + i) * 0.3);
      ctx.beginPath();
      ctx.ellipse(jx, -hh * 0.1, jr, jr * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = withAlpha(shade(jars, 0.3), 0.8);
      ctx.beginPath();
      ctx.ellipse(jx, -hh * 0.1 - jr * 0.85, jr * 0.5, jr * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // One keepsake, end of the row: somebody's small bright thing.
    ctx.fillStyle = keepsake;
    ctx.beginPath();
    ctx.arc(hw * 0.62, -hh * 0.05, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

/** A RUG — a woven walkable decal: rounded weave, border band, a diamond
 *  motif, thread fringes on the short ends. Pure ground (order under
 *  everything standing); collision never knew it existed. */
const rug: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { weave?: ColorSpec; border?: ColorSpec; motif?: ColorSpec };
  const { ctx, theme } = env;
  const weave = resolveColor(p.weave, theme, '#7a4a3a');
  const border = resolveColor(p.border, theme, '#caa85e');
  const motif = resolveColor(p.motif, theme, '#3e4e5e');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 41 + o.pos.y * 23) | 0) >>> 0;
    const hw = r * 1.05, hh = r * 0.72;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate((hash01(seed, 1) - 0.5) * 0.1); // laid by hand, not by rule
    // The weave, worn lighter mid-field where feet cross it.
    ctx.fillStyle = weave;
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
    ctx.fillStyle = withAlpha(shade(weave, 0.14), 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, hw * 0.5, hh * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    // Border band + the diamond at its heart.
    ctx.strokeStyle = withAlpha(border, 0.9);
    ctx.lineWidth = Math.max(1.5, r * 0.09);
    ctx.strokeRect(-hw * 0.82, -hh * 0.76, hw * 1.64, hh * 1.52);
    ctx.strokeStyle = withAlpha(motif, 0.85);
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath();
    ctx.moveTo(0, -hh * 0.4);
    ctx.lineTo(hw * 0.3, 0);
    ctx.lineTo(0, hh * 0.4);
    ctx.lineTo(-hw * 0.3, 0);
    ctx.closePath();
    ctx.stroke();
    // Fringes off the short ends: a few loose threads each.
    ctx.strokeStyle = withAlpha(border, 0.6);
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const fy = -hh * 0.8 + (i / 4) * hh * 1.6;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sgn * hw, fy);
        ctx.lineTo(sgn * (hw + r * 0.12), fy + (hash01(seed, 6 + i) - 0.5) * r * 0.08);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
};

PAINTERS.bed = bed;
PAINTERS.hearth = hearth;
PAINTERS.stool = stool;
PAINTERS.shelf = shelf;
PAINTERS.rug = rug;
