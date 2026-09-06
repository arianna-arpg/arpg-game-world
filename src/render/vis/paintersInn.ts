// ---------------------------------------------------------------------------
// INN PAINTERS — THE INN KIT's brushes (the inn wave, 2026-09-05): the
// hearth-and-bed kit grown into a public house's furniture, registered into
// the open PAINTERS record from OUTSIDE the library exactly as the home kit
// does. Side-effect imported by the renderer.
//
// Top-down doctrine holds: every brush draws a GROUND FOOTPRINT (the
// hit-surface contract — a counter is its plank run, a chest its lid, a
// board its two posts and the face between them), never a sprite-height
// façade. All are time-free and tagged bakeWhole:'static' in their visual
// rows; the candle's warmth is the light layer's, the painter draws only the
// tell. Colors resolve through the visual row's params with warm inn-wood
// defaults, so one params row re-dresses any piece for any country.
// ---------------------------------------------------------------------------

import { PAINTERS, resolveColor, type ColorSpec, type GroupPainter } from './painters';
import { hash01, shade, withAlpha } from './color';

/** A TAVERN TABLE — a round plank top, the grain running one way, the
 *  evening's mugs and a plate left where the drinkers sat. Chairs are their
 *  own cells (the 'c' char), so a table reads alone or ringed. */
const tavernTable: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; mug?: ColorSpec; ale?: ColorSpec; plate?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#6a5238');
  const mug = resolveColor(p.mug, theme, '#9a948a');
  const ale = resolveColor(p.ale, theme, '#b8842e');
  const plate = resolveColor(p.plate, theme, '#c8bca0');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 23 + o.pos.y * 13) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The top: a hand-planed disc, a shade lighter than the boards below it.
    ctx.fillStyle = wood;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = withAlpha(shade(wood, -0.35), 0.9);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Plank grain: three chords across, clipped to the disc.
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = withAlpha(shade(wood, -0.2), 0.55);
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      const y = i * r * 0.42 + (hash01(seed, 2 + i) - 0.5) * r * 0.08;
      ctx.beginPath(); ctx.moveTo(-r, y); ctx.lineTo(r, y); ctx.stroke();
    }
    ctx.restore();
    // What the evening left: one or two mugs (pewter rim, ale within), a plate.
    const n = 1 + ((hash01(seed, 7) * 2) | 0);
    for (let i = 0; i < n; i++) {
      const a = hash01(seed, 10 + i) * Math.PI * 2;
      const d = r * (0.3 + hash01(seed, 14 + i) * 0.3);
      const mx = Math.cos(a) * d, my = Math.sin(a) * d;
      ctx.fillStyle = mug;
      ctx.beginPath(); ctx.arc(mx, my, r * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ale;
      ctx.beginPath(); ctx.arc(mx, my, r * 0.085, 0, Math.PI * 2); ctx.fill();
    }
    if (hash01(seed, 20) > 0.4) {
      const a = hash01(seed, 21) * Math.PI * 2;
      ctx.fillStyle = plate;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.17, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withAlpha(shade(plate, -0.3), 0.7);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }
};

/** A CHAIR — a stool's worn disc with a back rail along its north edge
 *  (axis-pinned: pulled up to whatever it faces south). */
const chair: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; cushion?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#6a5438');
  const cushion = resolveColor(p.cushion, theme, '#7a4a3a');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 7 + o.pos.y * 29) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The seat: a square-ish pad, a cushion worn where somebody sat.
    ctx.fillStyle = wood;
    ctx.fillRect(-r * 0.7, -r * 0.55, r * 1.4, r * 1.25);
    ctx.fillStyle = withAlpha(cushion, 0.75);
    ctx.fillRect(-r * 0.5, -r * 0.3, r, r * 0.85);
    ctx.fillStyle = withAlpha(shade(cushion, 0.18), 0.4);
    ctx.beginPath();
    ctx.ellipse((hash01(seed, 1) - 0.5) * r * 0.2, r * 0.1, r * 0.3, r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    // The back rail: a thicker bar across the north edge, two upright nubs.
    ctx.fillStyle = shade(wood, -0.28);
    ctx.fillRect(-r * 0.75, -r * 0.72, r * 1.5, r * 0.26);
    ctx.fillStyle = shade(wood, 0.12);
    ctx.beginPath(); ctx.arc(-r * 0.62, -r * 0.6, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.62, -r * 0.6, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
};

/** A BAR COUNTER — one plank run, drawn the full cell wide so a chain of
 *  cells reads as one bar: a lighter top face, a darker front apron toward
 *  the room (south), a mug and a rag left along it. */
const barCounter: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; top?: ColorSpec; mug?: ColorSpec; cloth?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#5c4630');
  const top = resolveColor(p.top, theme, '#7a6040');
  const mug = resolveColor(p.mug, theme, '#9a948a');
  const cloth = resolveColor(p.cloth, theme, '#c8c0a8');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 31 + o.pos.y * 3) | 0) >>> 0;
    const hw = r * 1.0, hh = r * 0.42;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The apron (the whole slab), then the top face inset from the south lip.
    ctx.fillStyle = wood;
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
    ctx.fillStyle = top;
    ctx.fillRect(-hw, -hh, hw * 2, hh * 1.4);
    ctx.strokeStyle = withAlpha(shade(top, -0.3), 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-hw, -hh * 0.2); ctx.lineTo(hw, -hh * 0.2); ctx.stroke();
    // Along the bar: a mug here, a folded rag there — seeded so no two runs match.
    if (hash01(seed, 3) > 0.45) {
      const mx = (hash01(seed, 4) - 0.5) * hw * 1.2;
      ctx.fillStyle = mug;
      ctx.beginPath(); ctx.arc(mx, -hh * 0.35, r * 0.13, 0, Math.PI * 2); ctx.fill();
    }
    if (hash01(seed, 5) > 0.6) {
      const cx = (hash01(seed, 6) - 0.5) * hw * 1.1;
      ctx.fillStyle = withAlpha(cloth, 0.9);
      ctx.fillRect(cx - r * 0.2, -hh * 0.7, r * 0.4, r * 0.24);
    }
    ctx.restore();
  }
};

/** A KEG — a cask racked on its side, long east-west: staves along it, two
 *  dark hoops across, the tap at its head. */
const keg: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; hoop?: ColorSpec; tap?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#6a4e30');
  const hoop = resolveColor(p.hoop, theme, '#3a3632');
  const tap = resolveColor(p.tap, theme, '#8a8070');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 11 + o.pos.y * 37) | 0) >>> 0;
    const hw = r * 0.9, hh = r * 0.55;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The belly: a rounded slab, bulged at the middle.
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.moveTo(-hw, -hh * 0.8);
    ctx.quadraticCurveTo(0, -hh * 1.15, hw, -hh * 0.8);
    ctx.lineTo(hw, hh * 0.8);
    ctx.quadraticCurveTo(0, hh * 1.15, -hw, hh * 0.8);
    ctx.closePath();
    ctx.fill();
    // Staves: lines along the length.
    ctx.strokeStyle = withAlpha(shade(wood, -0.3), 0.6);
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(-hw * 0.95, i * hh * 0.5); ctx.lineTo(hw * 0.95, i * hh * 0.5); ctx.stroke();
    }
    // Hoops: two dark bands across.
    ctx.fillStyle = hoop;
    ctx.fillRect(-hw * 0.5 - r * 0.07, -hh * 1.05, r * 0.14, hh * 2.1);
    ctx.fillRect(hw * 0.5 - r * 0.07, -hh * 1.05, r * 0.14, hh * 2.1);
    // The head + its tap.
    ctx.fillStyle = shade(wood, -0.18);
    ctx.fillRect(hw * 0.86, -hh * 0.8, hw * 0.14, hh * 1.6);
    ctx.fillStyle = tap;
    ctx.beginPath(); ctx.arc(hw * 0.96, hh * 0.15 + (hash01(seed, 1) - 0.5) * hh * 0.2, r * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
};

/** A DRESSER — a chest of drawers hugging its wall (wide, shallow, axis-
 *  pinned): drawer seams, brass knobs, something folded on top. */
const dresser: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; knob?: ColorSpec; cloth?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#5c4630');
  const knob = resolveColor(p.knob, theme, '#caa85e');
  const cloth = resolveColor(p.cloth, theme, '#a8b8c0');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 41 + o.pos.y * 5) | 0) >>> 0;
    const hw = r * 0.95, hh = r * 0.4;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.fillStyle = wood;
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
    ctx.fillStyle = shade(wood, 0.1);
    ctx.fillRect(-hw, -hh, hw * 2, hh * 0.5);
    // Three drawers' worth of seams along the front, knobs at each.
    ctx.strokeStyle = withAlpha(shade(wood, -0.4), 0.8);
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const x = -hw + (i / 3) * hw * 2;
      ctx.beginPath(); ctx.moveTo(x, -hh * 0.5); ctx.lineTo(x, hh); ctx.stroke();
    }
    ctx.fillStyle = knob;
    for (let i = 0; i < 3; i++) {
      const x = -hw + ((i + 0.5) / 3) * hw * 2;
      ctx.beginPath(); ctx.arc(x, hh * 0.3, r * 0.07, 0, Math.PI * 2); ctx.fill();
    }
    // Somebody's folded shirt, or a towel, left on top.
    if (hash01(seed, 2) > 0.3) {
      const cx = (hash01(seed, 3) - 0.5) * hw * 0.9;
      ctx.fillStyle = withAlpha(cloth, 0.9);
      ctx.fillRect(cx - r * 0.24, -hh * 0.95, r * 0.48, hh * 0.7);
      ctx.strokeStyle = withAlpha(shade(cloth, -0.3), 0.6);
      ctx.beginPath(); ctx.moveTo(cx - r * 0.24, -hh * 0.6); ctx.lineTo(cx + r * 0.24, -hh * 0.6); ctx.stroke();
    }
    ctx.restore();
  }
};

/** A LINEN CHEST — a lidded box, iron-banded, its hasp toward the room. */
const linenChest: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; band?: ColorSpec; hasp?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#5a4028');
  const band = resolveColor(p.band, theme, '#3a3632');
  const hasp = resolveColor(p.hasp, theme, '#caa85e');
  for (const o of group) {
    const r = o.radius;
    const hw = r * 0.8, hh = r * 0.55;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The lid: two planks meeting at a ridge seam.
    ctx.fillStyle = wood;
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
    ctx.fillStyle = shade(wood, 0.12);
    ctx.fillRect(-hw, -hh, hw * 2, hh);
    ctx.strokeStyle = withAlpha(shade(wood, -0.4), 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0); ctx.stroke();
    // Iron bands over the lid, the hasp at the front.
    ctx.fillStyle = band;
    ctx.fillRect(-hw * 0.55 - r * 0.06, -hh, r * 0.12, hh * 2);
    ctx.fillRect(hw * 0.55 - r * 0.06, -hh, r * 0.12, hh * 2);
    ctx.fillStyle = hasp;
    ctx.fillRect(-r * 0.08, hh * 0.45, r * 0.16, hh * 0.45);
    ctx.restore();
  }
};

/** A CANDLE STAND — an iron tripod's small dark disc, the candle's pale
 *  stub, and its flame drawn as a warm tear over a soft halo (the light
 *  layer carries the real glow and the flicker). */
const candleStand: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { iron?: ColorSpec; wax?: ColorSpec; flame?: ColorSpec };
  const { ctx, theme } = env;
  const iron = resolveColor(p.iron, theme, '#3a3632');
  const wax = resolveColor(p.wax, theme, '#e8dcc0');
  const flame = resolveColor(p.flame, theme, '#ffd090');
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The halo on the boards.
    ctx.fillStyle = withAlpha(flame, 0.14);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.fill();
    // Three feet, the stem.
    ctx.fillStyle = iron;
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36, r * 0.11, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
    // The candle and its flame.
    ctx.fillStyle = wax;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = withAlpha(flame, 0.95);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.14, -r * 0.14, 0, r * 0.02);
    ctx.quadraticCurveTo(-r * 0.14, -r * 0.14, 0, -r * 0.42);
    ctx.fill();
    ctx.restore();
  }
};

/** A WASHSTAND — a round stand, the basin's rim and its still water, the
 *  ewer set beside. */
const washstand: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; basin?: ColorSpec; water?: ColorSpec; ewer?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#6a5438');
  const basin = resolveColor(p.basin, theme, '#d8d0c0');
  const water = resolveColor(p.water, theme, '#5a86a0');
  const ewer = resolveColor(p.ewer, theme, '#c8c0b0');
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.fillStyle = wood;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = withAlpha(shade(wood, -0.35), 0.8);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // The basin, offset a touch west; the water within.
    ctx.fillStyle = basin;
    ctx.beginPath(); ctx.arc(-r * 0.12, 0, r * 0.46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = withAlpha(water, 0.85);
    ctx.beginPath(); ctx.arc(-r * 0.12, 0, r * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = withAlpha('#ffffff', 0.35);
    ctx.beginPath(); ctx.ellipse(-r * 0.22, -r * 0.1, r * 0.12, r * 0.06, -0.6, 0, Math.PI * 2); ctx.fill();
    // The ewer: a small jug and its handle.
    ctx.fillStyle = ewer;
    ctx.beginPath(); ctx.arc(r * 0.46, r * 0.22, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = withAlpha(shade(ewer, -0.4), 0.9);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(r * 0.46, r * 0.22, r * 0.3, -0.5, 0.9); ctx.stroke();
    ctx.restore();
  }
};

/** A COAT RACK — a post seen end-on, the cloaks hung round it in two
 *  colors, a hat on the hook that faced the door. */
const coatRack: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; cloak?: ColorSpec; cloak2?: ColorSpec; hat?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#4c3a28');
  const cloak = resolveColor(p.cloak, theme, '#3e4a5e');
  const cloak2 = resolveColor(p.cloak2, theme, '#5a3a30');
  const hat = resolveColor(p.hat, theme, '#2e2418');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 17 + o.pos.y * 19) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Cloaks: draped rounded shapes fanned from the post.
    const n = 2 + ((hash01(seed, 1) * 2) | 0);
    for (let i = 0; i < n; i++) {
      const a = hash01(seed, 2) * Math.PI * 2 + (i / n) * Math.PI * 2;
      ctx.fillStyle = withAlpha(i % 2 ? cloak2 : cloak, 0.92);
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.42, r * 0.3, a, 0, Math.PI * 2);
      ctx.fill();
    }
    // The post's end, the hat set on it.
    ctx.fillStyle = wood;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hat;
    ctx.beginPath(); ctx.arc(r * 0.08, -r * 0.08, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade(hat, 0.25);
    ctx.beginPath(); ctx.arc(r * 0.08, -r * 0.08, r * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
};

/** A PLANTER — a plank flower box (wide, shallow): dark soil, leaves, and
 *  blooms in two colors, seeded so each doorstep flowers its own way. */
const planter: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; soil?: ColorSpec; leaf?: ColorSpec; bloom?: ColorSpec; bloom2?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#5c4630');
  const soil = resolveColor(p.soil, theme, '#2c2218');
  const leaf = resolveColor(p.leaf, theme, '#4e6a34');
  const bloom = resolveColor(p.bloom, theme, '#d86a5a');
  const bloom2 = resolveColor(p.bloom2, theme, '#e8c04a');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 3 + o.pos.y * 47) | 0) >>> 0;
    const hw = r * 1.0, hh = r * 0.5;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.fillStyle = wood;
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
    ctx.fillStyle = soil;
    ctx.fillRect(-hw * 0.88, -hh * 0.7, hw * 1.76, hh * 1.4);
    // Leaves first, blooms over them.
    for (let i = 0; i < 5; i++) {
      const x = -hw * 0.7 + (i / 4) * hw * 1.4 + (hash01(seed, 10 + i) - 0.5) * r * 0.1;
      const y = (hash01(seed, 20 + i) - 0.5) * hh * 0.8;
      ctx.fillStyle = shade(leaf, -0.15 + hash01(seed, 30 + i) * 0.3);
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.2, r * 0.13, hash01(seed, 40 + i) * Math.PI, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 4; i++) {
      const x = -hw * 0.6 + (i / 3) * hw * 1.2 + (hash01(seed, 50 + i) - 0.5) * r * 0.16;
      const y = (hash01(seed, 60 + i) - 0.5) * hh * 0.7;
      ctx.fillStyle = hash01(seed, 70 + i) > 0.5 ? bloom : bloom2;
      ctx.beginPath(); ctx.arc(x, y, r * 0.11, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
};

/** THE NOTICE BOARD — the bounty board as a board: two posts, the plank
 *  face between them under a narrow rain cap, and the writs pinned on it,
 *  each its own scrap of parchment at its own careless angle. Axis-pinned
 *  (the face runs east-west, read from the south). */
const noticeBoard: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; cap?: ColorSpec; paper?: ColorSpec; paper2?: ColorSpec; pin?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#5c4630');
  const cap = resolveColor(p.cap, theme, '#3a2c1c');
  const paper = resolveColor(p.paper, theme, '#e4d8b4');
  const paper2 = resolveColor(p.paper2, theme, '#d4c49c');
  const pin = resolveColor(p.pin, theme, '#c8402c');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 53 + o.pos.y * 9) | 0) >>> 0;
    const hw = r * 1.0, hh = r * 0.34;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The posts, end-on, either side.
    ctx.fillStyle = shade(wood, -0.3);
    ctx.beginPath(); ctx.arc(-hw * 0.92, 0, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hw * 0.92, 0, r * 0.16, 0, Math.PI * 2); ctx.fill();
    // The face: planks, a grain line, the cap along the north edge.
    ctx.fillStyle = wood;
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
    ctx.strokeStyle = withAlpha(shade(wood, -0.3), 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-hw * 0.95, 0); ctx.lineTo(hw * 0.95, 0); ctx.stroke();
    ctx.fillStyle = cap;
    ctx.fillRect(-hw * 1.04, -hh - r * 0.1, hw * 2.08, r * 0.12);
    // The writs: three or four scraps, pinned, each a little askew.
    const n = 3 + ((hash01(seed, 1) * 2) | 0);
    for (let i = 0; i < n; i++) {
      const x = -hw * 0.72 + (i / (n - 1)) * hw * 1.44 + (hash01(seed, 4 + i) - 0.5) * r * 0.1;
      const y = (hash01(seed, 8 + i) - 0.5) * hh * 0.6;
      const w = r * (0.2 + hash01(seed, 12 + i) * 0.1), h = r * (0.26 + hash01(seed, 16 + i) * 0.14);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((hash01(seed, 20 + i) - 0.5) * 0.35);
      ctx.fillStyle = i % 2 ? paper2 : paper;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = withAlpha('#3a2c1c', 0.45);
      ctx.lineWidth = 0.8;
      for (let l = 0; l < 3; l++) {
        const ly = -h * 0.28 + l * h * 0.28;
        ctx.beginPath(); ctx.moveTo(-w * 0.32, ly); ctx.lineTo(w * 0.32, ly); ctx.stroke();
      }
      ctx.fillStyle = pin;
      ctx.beginPath(); ctx.arc(0, -h * 0.42, r * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
};

/** A WALL LANTERN — the bracket reaching off the wall's outer face (north
 *  of the doodad: it hangs from the wall it is placed a step outside of),
 *  the lantern's iron cage and warm glass at its end, and the glow pooled
 *  on the ground beneath (the light layer carries the real reach). */
const wallLantern: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { iron?: ColorSpec; glass?: ColorSpec; flame?: ColorSpec };
  const { ctx, theme } = env;
  const iron = resolveColor(p.iron, theme, '#3a3632');
  const glass = resolveColor(p.glass, theme, '#ffd898');
  const flame = resolveColor(p.flame, theme, '#ffb050');
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The pool of light on the step.
    ctx.fillStyle = withAlpha(glass, 0.16);
    ctx.beginPath(); ctx.arc(0, r * 0.3, r * 1.6, 0, Math.PI * 2); ctx.fill();
    // The bracket: an iron arm from the wall (north) with a small scroll.
    ctx.strokeStyle = iron;
    ctx.lineWidth = Math.max(1.5, r * 0.22);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.7);
    ctx.lineTo(0, -r * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-r * 0.22, -r * 0.45, r * 0.24, 0, Math.PI * 1.5);
    ctx.stroke();
    // The cage: a squared iron frame, the glass warm inside, the flame.
    ctx.fillStyle = withAlpha(glass, 0.85);
    ctx.fillRect(-r * 0.5, -r * 0.45, r, r * 0.9);
    ctx.strokeStyle = iron;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-r * 0.5, -r * 0.45, r, r * 0.9);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.45); ctx.lineTo(0, r * 0.45); ctx.stroke();
    ctx.fillStyle = flame;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.16, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    // The cap.
    ctx.fillStyle = iron;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.45); ctx.lineTo(0, -r * 0.72); ctx.lineTo(r * 0.6, -r * 0.45);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
};

/** THE STAIRWAY — a flight climbing toward `rot` (the storey fabric's link
 *  cells run under it): two stringers, treads whose nosings catch the light
 *  and darken toward the top, newel posts at the foot, a banister along
 *  both sides. The footprint is the doodad's disc squared — 2r wide, ~2.1r
 *  long — so a 2×2-cell flight fills its cells. */
const stairway: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; tread?: ColorSpec; dark?: ColorSpec; rail?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#6a5238');
  const tread = resolveColor(p.tread, theme, '#7c6242');
  const dark = resolveColor(p.dark, theme, '#2a1e14');
  const rail = resolveColor(p.rail, theme, '#4c3a28');
  for (const o of group) {
    const r = o.radius;
    const hw = r * 0.96, hl = r * 1.04; // half width across the flight, half length along it
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // rot points UP the flight; the painter's +x is "up", so rotate to it.
    ctx.rotate((o.rot ?? -Math.PI / 2));
    // The stringers + the carriage: the whole slab in the wood, a darker
    // shadow band gathering toward the top (the flight climbs out of view).
    ctx.fillStyle = wood;
    ctx.fillRect(-hl, -hw, hl * 2, hw * 2);
    const g = ctx.createLinearGradient(-hl, 0, hl, 0);
    g.addColorStop(0, withAlpha(dark, 0));
    g.addColorStop(1, withAlpha(dark, 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(-hl, -hw, hl * 2, hw * 2);
    // Treads: bars across the flight, each with a lit nosing on its low side
    // and a riser shadow on its high side.
    const n = 7;
    const step = (hl * 2) / n;
    for (let i = 0; i < n; i++) {
      const x0 = -hl + i * step;
      const t = i / (n - 1);
      ctx.fillStyle = shade(tread, -0.05 - t * 0.28);
      ctx.fillRect(x0 + step * 0.08, -hw * 0.86, step * 0.84, hw * 1.72);
      ctx.fillStyle = withAlpha(shade(tread, 0.28 - t * 0.2), 0.8);
      ctx.fillRect(x0 + step * 0.08, -hw * 0.86, step * 0.16, hw * 1.72);
      ctx.fillStyle = withAlpha(dark, 0.55);
      ctx.fillRect(x0 + step * 0.86, -hw * 0.86, step * 0.14, hw * 1.72);
    }
    // Banisters along both sides, newel posts at the foot, a cap at the head.
    ctx.strokeStyle = rail;
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath(); ctx.moveTo(-hl, -hw * 0.92); ctx.lineTo(hl, -hw * 0.92); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-hl, hw * 0.92); ctx.lineTo(hl, hw * 0.92); ctx.stroke();
    ctx.fillStyle = shade(rail, 0.15);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(-hl + r * 0.12, s * hw * 0.92, r * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hl - r * 0.1, s * hw * 0.92, r * 0.12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
};

PAINTERS.tavernTable = tavernTable;
PAINTERS.chair = chair;
PAINTERS.barCounter = barCounter;
PAINTERS.keg = keg;
PAINTERS.dresser = dresser;
PAINTERS.linenChest = linenChest;
PAINTERS.candleStand = candleStand;
PAINTERS.washstand = washstand;
PAINTERS.coatRack = coatRack;
PAINTERS.planter = planter;
PAINTERS.noticeBoard = noticeBoard;
PAINTERS.wallLantern = wallLantern;
PAINTERS.stairway = stairway;
