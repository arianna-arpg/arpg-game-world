// ---------------------------------------------------------------------------
// SEA PAINTERS — the ship-deck kit's brushes (masts, bulwark rails, lashed
// cargo) and the GHOST HULL sighted at open sea, registered into the open
// PAINTERS record from OUTSIDE the library (the paintersGloam contract: a kit
// brings its own looks, no painters.ts edit). Side-effect imported by the
// renderer beside the library itself.
// ---------------------------------------------------------------------------

import { PAINTERS, resolveColor, type ColorSpec, type GroupPainter } from './painters';
import { hash01, shade, withAlpha } from './color';

/** A SHIP'S MAST from above: the great oak foot, a full crossed yard with the
 *  sail FURLED along it (bundled canvas lobes), stay-lines running off to the
 *  rigging. The deck's vertical told flat — read the yard's angle and you know
 *  which way she once ran. params: wood, canvas, angle (radians; default rolls
 *  per instance around athwartships). */
const shipMast: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; canvas?: ColorSpec; angle?: number };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#3a2c1e');
  const canvas = resolveColor(p.canvas, theme, '#8a9a94');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 13 + o.pos.y * 31) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    const yardA = p.angle ?? (Math.PI / 2 + (hash01(seed, 1) - 0.5) * 0.35);
    ctx.rotate(yardA);
    // Stay-lines first, under everything: four taut threads to the deck.
    ctx.strokeStyle = withAlpha(shade(wood, 0.25), 0.5);
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.6;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * (1.5 + hash01(seed, 4 + i) * 0.5), Math.sin(a) * r * (1.5 + hash01(seed, 4 + i) * 0.5));
      ctx.stroke();
    }
    // The yard: one long spar athwart the mast.
    ctx.strokeStyle = shade(wood, -0.05);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.beginPath(); ctx.moveTo(-r * 1.55, 0); ctx.lineTo(r * 1.55, 0); ctx.stroke();
    // The furled sail: canvas bundled under the yard in sagging lobes.
    ctx.fillStyle = withAlpha(canvas, 0.85);
    for (let i = 0; i < 5; i++) {
      const x = -r * 1.3 + (i / 4) * r * 2.6;
      const sag = r * (0.16 + hash01(seed, 10 + i) * 0.12);
      ctx.beginPath();
      ctx.ellipse(x, sag * 0.5, r * 0.3, sag, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = withAlpha(shade(canvas, -0.3), 0.7);
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const x = -r * 1.05 + (i / 3) * r * 2.1;
      ctx.beginPath(); ctx.moveTo(x, -r * 0.06); ctx.lineTo(x, r * 0.3); ctx.stroke();
    }
    // The mast itself: a ringed oak foot standing proud of the yard.
    ctx.fillStyle = wood;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = withAlpha(shade(wood, 0.3), 0.9);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = withAlpha(shade(wood, -0.25), 0.8);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = shade(wood, 0.18);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.lineCap = 'butt';
    ctx.restore();
  }
};

/** A BULWARK RAIL segment: a run of weathered gunwale plank on stanchion
 *  posts, laid along the instance's rotation — the deck's rim drawn in
 *  furniture (the wall behind it does the actual blocking). params: wood. */
const shipRail: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#4a3826');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 11 + o.pos.y * 23) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // The cap rail: one long plank.
    ctx.strokeStyle = shade(wood, 0.06);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, r * 0.22);
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    // A parallel shadow line gives it thickness.
    ctx.strokeStyle = withAlpha(shade(wood, -0.3), 0.7);
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath(); ctx.moveTo(-r, r * 0.14); ctx.lineTo(r, r * 0.14); ctx.stroke();
    // Stanchion posts under the cap.
    ctx.fillStyle = shade(wood, -0.12);
    const posts = 3;
    for (let i = 0; i < posts; i++) {
      const x = -r * 0.8 + (i / (posts - 1)) * r * 1.6 + (hash01(seed, i) - 0.5) * r * 0.08;
      ctx.beginPath(); ctx.arc(x, r * 0.06, Math.max(1.4, r * 0.11), 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'butt';
    ctx.restore();
  }
};

/** LASHED CARGO: a stack of crates and a barrel roped down where the crew
 *  left them — deck clutter that reads as freight, not furniture.
 *  params: wood, rope. */
const cargoStack: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; rope?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#4c3a26');
  const rope = resolveColor(p.rope, theme, '#8a7a56');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 19 + o.pos.y * 7) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? hash01(seed, 1) * Math.PI * 2);
    // Two crates, slightly skewed against each other.
    for (let i = 0; i < 2; i++) {
      const cw = r * (0.62 - i * 0.12);
      const off = (i === 0 ? -1 : 1) * r * 0.28;
      ctx.save();
      ctx.translate(off, (hash01(seed, 3 + i) - 0.5) * r * 0.3);
      ctx.rotate((hash01(seed, 6 + i) - 0.5) * 0.5);
      ctx.fillStyle = shade(wood, i === 0 ? 0 : 0.08);
      ctx.fillRect(-cw, -cw, cw * 2, cw * 2);
      ctx.strokeStyle = withAlpha(shade(wood, -0.28), 0.85);
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-cw, -cw, cw * 2, cw * 2);
      // The lashing: a rope cross over the lid.
      ctx.strokeStyle = withAlpha(rope, 0.8);
      ctx.lineWidth = Math.max(1, cw * 0.12);
      ctx.beginPath(); ctx.moveTo(-cw, 0); ctx.lineTo(cw, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -cw); ctx.lineTo(0, cw); ctx.stroke();
      ctx.restore();
    }
    // The barrel leaning on the stack.
    const bx = r * 0.55, by = r * 0.45;
    ctx.fillStyle = shade(wood, -0.06);
    ctx.beginPath(); ctx.arc(bx, by, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = withAlpha(shade(wood, 0.25), 0.8);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(bx, by, r * 0.3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, r * 0.18, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
};

/** THE GHOST HULL — the Wraithsail sighted at open sea: an intact ship told
 *  in cold light — pointed hull, planked deck, three masts with tattered
 *  luminous canvas — translucent enough that the water reads through her.
 *  The doodad's `light` spec does the actual glowing; this paints the bones.
 *  params: hull, sail, glow. */
const ghostHull: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { hull?: ColorSpec; sail?: ColorSpec; glow?: ColorSpec };
  const { ctx, theme } = env;
  const hull = resolveColor(p.hull, theme, '#2c4a4e');
  const sail = resolveColor(p.sail, theme, '#9adcd8');
  const glow = resolveColor(p.glow, theme, '#7ad8d8');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 29 + o.pos.y * 17) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // The hull: a long pointed form, bow at +X, stern squared.
    const L = r * 1.5, B = r * 0.55;
    ctx.fillStyle = withAlpha(hull, 0.55);
    ctx.beginPath();
    ctx.moveTo(L, 0);
    ctx.quadraticCurveTo(L * 0.4, -B, -L * 0.7, -B * 0.85);
    ctx.quadraticCurveTo(-L * 0.95, -B * 0.5, -L * 0.95, 0);
    ctx.quadraticCurveTo(-L * 0.95, B * 0.5, -L * 0.7, B * 0.85);
    ctx.quadraticCurveTo(L * 0.4, B, L, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(glow, 0.85);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // Deck planks: faint long grain lines bow to stern.
    ctx.strokeStyle = withAlpha(shade(hull, 0.35), 0.4);
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-L * 0.85, i * B * 0.32);
      ctx.lineTo(L * 0.8, i * B * 0.26);
      ctx.stroke();
    }
    // Three masts with yards and TATTERED sails: torn luminous triangles.
    for (let m = 0; m < 3; m++) {
      const mx = L * (0.5 - m * 0.55);
      ctx.fillStyle = withAlpha(shade(hull, 0.5), 0.9);
      ctx.beginPath(); ctx.arc(mx, 0, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withAlpha(sail, 0.55);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(mx, -B * 0.95); ctx.lineTo(mx, B * 0.95); ctx.stroke();
      // Sail sheets: ragged panels hung off the yard, holes torn by seeds.
      ctx.fillStyle = withAlpha(sail, 0.28);
      for (const s of [-1, 1]) {
        const sw = B * (0.55 + hash01(seed, 40 + m * 2 + (s > 0 ? 1 : 0)) * 0.3);
        ctx.beginPath();
        ctx.moveTo(mx, s * B * 0.1);
        ctx.lineTo(mx - r * (0.3 + hash01(seed, 50 + m) * 0.2), s * sw);
        ctx.lineTo(mx + r * (0.18 + hash01(seed, 60 + m) * 0.14), s * sw * 0.8);
        ctx.closePath();
        ctx.fill();
      }
    }
    // The cold lamps: two points of the ghost light at bow and stern.
    ctx.fillStyle = withAlpha(glow, 0.95);
    for (const lx of [L * 0.88, -L * 0.85]) {
      ctx.beginPath(); ctx.arc(lx, 0, r * 0.06, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
};

/** THE SOUL FERRY — the Pale Ferry of the River of Souls, drawn whole from
 *  above: a flat-bottomed funeral barge whose BOARDS are the track rider's
 *  exact rect surface (params deckHw/deckHh — drawn == tested == carried),
 *  low gunwales, a prow lantern, lashed coffin-freight amidships, and THE
 *  FERRYMAN at the stern — a hooded nobody with a punt pole, part of the
 *  vessel itself (the ferry cannot be destroyed, so neither can he).
 *  Bow at +X (orient 'lane'). params: deckHw, deckHh, hull, boards, trim,
 *  glow, lantern. */
const soulFerry: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as {
    deckHw?: number; deckHh?: number; hull?: ColorSpec; boards?: ColorSpec;
    trim?: ColorSpec; glow?: ColorSpec; lantern?: ColorSpec;
  };
  const { ctx, theme } = env;
  const hull = resolveColor(p.hull, theme, '#243640');
  const boards = resolveColor(p.boards, theme, '#3c4c54');
  const trim = resolveColor(p.trim, theme, '#cfc8b4');
  const glow = resolveColor(p.glow, theme, '#9fd8ec');
  const lantern = resolveColor(p.lantern, theme, '#ffe0b0');
  for (const o of group) {
    const hw = p.deckHw ?? o.radius;
    const hh = p.deckHh ?? o.radius * 0.48;
    const t = env.time ?? 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // The pale wake: a luminous waterline ring the hull rides in.
    ctx.strokeStyle = withAlpha(glow, 0.3);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(hw + 16, 0);
    ctx.quadraticCurveTo(hw * 0.5, -hh - 8, -hw - 10, -hh * 0.7);
    ctx.quadraticCurveTo(-hw - 15, 0, -hw - 10, hh * 0.7);
    ctx.quadraticCurveTo(hw * 0.5, hh + 8, hw + 16, 0);
    ctx.stroke();
    // The hull: deck rect swelled to a barge — pointed bow past +hw, squared
    // stern transom. The DECK (the tested rect) sits wholly inside.
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(hw + 14, 0);
    ctx.quadraticCurveTo(hw, -hh - 3, hw * 0.45, -hh - 3);
    ctx.lineTo(-hw + 6, -hh - 3);
    ctx.quadraticCurveTo(-hw - 8, -hh - 3, -hw - 8, 0);
    ctx.quadraticCurveTo(-hw - 8, hh + 3, -hw + 6, hh + 3);
    ctx.lineTo(hw * 0.45, hh + 3);
    ctx.quadraticCurveTo(hw, hh + 3, hw + 14, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(glow, 0.75);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // The boards: long deck planks bow → stern, a shade lighter than the
    // hull, seamed at the beam-joints so the great deck reads BUILT.
    ctx.fillStyle = boards;
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
    ctx.strokeStyle = withAlpha(shade(boards, -0.3), 0.6);
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-hw + 4, i * hh * 0.22);
      ctx.lineTo(hw - 4, i * hh * 0.22);
      ctx.stroke();
    }
    ctx.strokeStyle = withAlpha(shade(boards, -0.4), 0.45);
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * hw * 0.28, -hh + 3);
      ctx.lineTo(i * hw * 0.28, hh - 3);
      ctx.stroke();
    }
    // Gunwale trim with BOARDING GAPS amidship on both rails — the gangway
    // breaks where the piers meet her (the rail tells you where to step).
    ctx.strokeStyle = withAlpha(trim, 0.8);
    ctx.lineWidth = 2.6;
    const gapC = -hw * 0.05, gapW = hw * 0.16;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(-hw, s * hh); ctx.lineTo(gapC - gapW, s * hh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gapC + gapW, s * hh); ctx.lineTo(hw, s * hh); ctx.stroke();
      // Gap posts: a pale stanchion at either side of each gangway break.
      ctx.fillStyle = trim;
      ctx.beginPath(); ctx.arc(gapC - gapW, s * hh, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(gapC + gapW, s * hh, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(-hw, -hh); ctx.lineTo(-hw, hh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hw, -hh); ctx.lineTo(hw, hh); ctx.stroke();
    // THE WHEELHOUSE astern: a low cabin with a pale-lit window — the
    // ferryman's post stands before it.
    ctx.fillStyle = shade(hull, 0.12);
    ctx.fillRect(-hw * 0.86, -hh * 0.42, hw * 0.3, hh * 0.84);
    ctx.strokeStyle = withAlpha(trim, 0.6);
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-hw * 0.86, -hh * 0.42, hw * 0.3, hh * 0.84);
    ctx.fillStyle = withAlpha(glow, 0.5 + 0.1 * Math.sin(t * 2.2));
    ctx.fillRect(-hw * 0.78, -hh * 0.12, hw * 0.1, hh * 0.24);
    // TWO LANTERN MASTS on the centerline: ringed feet, pale lamps aloft.
    for (const mx of [hw * 0.34, -hw * 0.28]) {
      ctx.fillStyle = shade(hull, 0.3);
      ctx.beginPath(); ctx.arc(mx, 0, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withAlpha(trim, 0.7);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(mx, 0, 6.5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = withAlpha(glow, 0.85);
      ctx.beginPath(); ctx.arc(mx, 0, 2.6 + Math.sin(t * 4 + mx) * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withAlpha(glow, 0.25);
      ctx.beginPath(); ctx.arc(mx, 0, 11, 0, Math.PI * 2); ctx.stroke();
    }
    // LASHED FREIGHT in four stations — coffin-crates and a barrel ring,
    // the cover a fighting line works around.
    const freight = [
      { x: hw * 0.58, y: -hh * 0.42, r: 0.06 }, { x: hw * 0.12, y: hh * 0.44, r: -0.1 },
      { x: -hw * 0.12, y: -hh * 0.46, r: 0.12 }, { x: -hw * 0.5, y: hh * 0.4, r: -0.06 },
    ];
    for (const f of freight) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.r);
      ctx.fillStyle = shade(hull, 0.22);
      ctx.beginPath();
      ctx.moveTo(-hw * 0.1, -hh * 0.14);
      ctx.lineTo(hw * 0.08, -hh * 0.18);
      ctx.lineTo(hw * 0.12, 0);
      ctx.lineTo(hw * 0.08, hh * 0.18);
      ctx.lineTo(-hw * 0.1, hh * 0.14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = withAlpha(trim, 0.55);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -hh * 0.18); ctx.lineTo(0, hh * 0.18); ctx.stroke();
      ctx.restore();
    }
    // The prow lantern: the one warm point aboard, out past the stem.
    ctx.strokeStyle = shade(hull, 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hw * 0.86, 0); ctx.lineTo(hw + 8, 0); ctx.stroke();
    ctx.fillStyle = withAlpha(lantern, 0.95);
    ctx.beginPath(); ctx.arc(hw + 9, 0, 3.8 + Math.sin(t * 5) * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = withAlpha(lantern, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(hw + 9, 0, 7, 0, Math.PI * 2); ctx.stroke();
    // THE FERRYMAN: hooded before the wheelhouse, his punt pole trailing
    // aft — he leans into the stroke on a slow clock (the one living line
    // aboard; part of the vessel, indestructible because he is not a body).
    const lean = Math.sin(t * 0.9) * 0.16;
    ctx.save();
    ctx.translate(-hw * 0.64, 0);
    ctx.rotate(lean);
    ctx.strokeStyle = withAlpha(trim, 0.85);
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(-hw * 0.3, hh * 0.85); ctx.stroke();
    ctx.fillStyle = withAlpha(shade(hull, -0.35), 0.95);
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 7.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = withAlpha(glow, 0.8);
    ctx.beginPath(); ctx.arc(2.6, 0, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
  }
};

/** A SPIRIT GATE — the dock's arch, read from above as two heavy posts and a
 *  double lintel athwart the walk, a pale glow strung between them: pass
 *  beneath and you stand on ferry ground. params: post, lintel, glow. */
const spiritGate: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { post?: ColorSpec; lintel?: ColorSpec; glow?: ColorSpec };
  const { ctx, theme } = env;
  const post = resolveColor(p.post, theme, '#3a4650');
  const lintel = resolveColor(p.lintel, theme, '#54646e');
  const glow = resolveColor(p.glow, theme, '#9fd8ec');
  for (const o of group) {
    const r = o.radius;
    const t = env.time ?? 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate((o.dir ?? o.rot ?? 0) + Math.PI / 2); // posts athwart the walk
    // The strung glow: a faint breathing veil between the posts.
    const breathe = 0.16 + 0.08 * Math.sin(t * 1.4 + o.pos.x * 0.01);
    ctx.strokeStyle = withAlpha(glow, breathe);
    ctx.lineWidth = r * 0.5;
    ctx.beginPath(); ctx.moveTo(-r * 0.72, 0); ctx.lineTo(r * 0.72, 0); ctx.stroke();
    // Double lintel: the upper beam sweeps wider (the torii read, flattened).
    ctx.strokeStyle = lintel;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2.5, r * 0.14);
    ctx.beginPath(); ctx.moveTo(-r * 1.02, 0); ctx.lineTo(r * 1.02, 0); ctx.stroke();
    ctx.strokeStyle = shade(lintel, -0.2);
    ctx.lineWidth = Math.max(1.6, r * 0.09);
    ctx.beginPath(); ctx.moveTo(-r * 0.8, r * 0.2); ctx.lineTo(r * 0.8, r * 0.2); ctx.stroke();
    // The posts: two ringed feet.
    for (const s of [-1, 1]) {
      ctx.fillStyle = post;
      ctx.beginPath(); ctx.arc(s * r * 0.78, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withAlpha(shade(post, 0.35), 0.9);
      ctx.lineWidth = 1.3;
      ctx.stroke();
      // A pale flame cupped on each post head.
      ctx.fillStyle = withAlpha(glow, 0.85);
      ctx.beginPath(); ctx.arc(s * r * 0.78, 0, r * 0.07 + Math.sin(t * 4 + s) * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'butt';
    ctx.restore();
  }
};

/** A CANDLE RAFT — a little woven float set adrift with its grave-candles
 *  still burning: lashed reed planks, two or three wax stubs, one warm
 *  gutter of flame. The river's own funerary litter. params: wood, wax,
 *  flame. */
const candleRaft: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; wax?: ColorSpec; flame?: ColorSpec };
  const { ctx, theme } = env;
  const wood = resolveColor(p.wood, theme, '#4a4234');
  const wax = resolveColor(p.wax, theme, '#e8e0cc');
  const flame = resolveColor(p.flame, theme, '#ffd898');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 23 + o.pos.y * 41) | 0) >>> 0;
    const t = env.time ?? 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(hash01(seed, 1) * Math.PI * 2);
    // A soft ripple ring where the raft sits the water.
    ctx.strokeStyle = withAlpha(wax, 0.18);
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2); ctx.stroke();
    // Lashed reed planks.
    ctx.strokeStyle = wood;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, r * 0.3);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, i * r * 0.34);
      ctx.lineTo(r * 0.85, i * r * 0.34);
      ctx.stroke();
    }
    ctx.strokeStyle = withAlpha(shade(wood, 0.3), 0.7);
    ctx.lineWidth = 1;
    for (const s of [-0.5, 0.5]) {
      ctx.beginPath(); ctx.moveTo(s * r, -r * 0.5); ctx.lineTo(s * r, r * 0.5); ctx.stroke();
    }
    // The candles: wax stubs + one live flame (the others guttered dark).
    const n = 2 + (hash01(seed, 2) > 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const a = hash01(seed, 3 + i) * Math.PI * 2;
      const cx = Math.cos(a) * r * 0.35, cy = Math.sin(a) * r * 0.3;
      ctx.fillStyle = wax;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2); ctx.fill();
      if (i === 0) {
        ctx.fillStyle = withAlpha(flame, 0.95);
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.09 + Math.sin(t * 6 + seed) * 0.4, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = withAlpha(shade(wood, -0.3), 0.9);
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.05, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.lineCap = 'butt';
    ctx.restore();
  }
};

/** A BONE PIER plank — pale weathered boards lashed over rib joists, laid
 *  along the instance's dir (the causeway plank's funerary cousin).
 *  params: bone, lash. */
const bonePier: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { bone?: ColorSpec; lash?: ColorSpec };
  const { ctx, theme } = env;
  const bone = resolveColor(p.bone, theme, '#cfc8b4');
  const lash = resolveColor(p.lash, theme, '#5a5040');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 31 + o.pos.y * 13) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate((o.dir ?? o.rot ?? 0) + Math.PI / 2); // boards across the walk
    // Three boards, slightly staggered, a shade apart.
    for (let i = -1; i <= 1; i++) {
      const off = (hash01(seed, 4 + i) - 0.5) * r * 0.14;
      ctx.strokeStyle = shade(bone, i * 0.08 - hash01(seed, 8 + i) * 0.12);
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(3, r * 0.34);
      ctx.beginPath();
      ctx.moveTo(-r * 0.95 + off, i * r * 0.36);
      ctx.lineTo(r * 0.95 + off, i * r * 0.36);
      ctx.stroke();
    }
    // The rib joist peeking out both ends, and the lashings.
    ctx.strokeStyle = withAlpha(shade(bone, -0.25), 0.8);
    ctx.lineWidth = Math.max(1.6, r * 0.1);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(0, r * 0.6); ctx.stroke();
    ctx.strokeStyle = withAlpha(lash, 0.75);
    ctx.lineWidth = 1.2;
    for (const s of [-0.55, 0.55]) {
      ctx.beginPath(); ctx.moveTo(s * r, -r * 0.5); ctx.lineTo(s * r, r * 0.5); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.restore();
  }
};

PAINTERS.shipMast = shipMast;
PAINTERS.shipRail = shipRail;
PAINTERS.cargoStack = cargoStack;
PAINTERS.ghostHull = ghostHull;
PAINTERS.soulFerry = soulFerry;
PAINTERS.spiritGate = spiritGate;
PAINTERS.candleRaft = candleRaft;
PAINTERS.bonePier = bonePier;
