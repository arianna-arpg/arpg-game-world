// ---------------------------------------------------------------------------
// WARFRONT-COUNTRY PAINTERS — the Warfront kit's brushes (the Underworld's
// ACTIVE front: Bhorog's siege-works), registered into the open PAINTERS
// record from OUTSIDE the library (the paintersGarden contract: a biome kit
// brings its own looks, no painters.ts edit). Side-effect imported by the
// renderer beside the library itself. Time-free by construction so the kit
// bakes where it can — ember glow lives on the LIGHT LAYER (the visuals
// rows), never in the stroke. No gradients anywhere (the NaN-gradient
// doctrine: flat fills and arcs cannot throw).
// ---------------------------------------------------------------------------

import { PAINTERS, resolveColor, type ColorSpec, type GroupPainter } from './painters';
import { hash01, shade, withAlpha } from './color';

/** THE SHELL POCK — a fresh blast crater at walking scale: scorched bowl,
 *  a raised ejecta rim, radial scorch streaks thrown past it. The Warfront's
 *  signature ground texture — strewn at generation for the OLD war, planted
 *  live by impact dress for the one happening to you (both draw this). */
const shellPock: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { char?: ColorSpec; rim?: ColorSpec; ember?: ColorSpec };
  const { ctx, theme } = env;
  const char = resolveColor(p.char, theme, '#241d1a');
  const rim = resolveColor(p.rim, theme, '#4a3a2c');
  const ember = resolveColor(p.ember, theme, '#b8502a');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 13 + o.pos.y * 31) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // Ejecta streaks: thrown earth past the rim, uneven by seed.
    ctx.strokeStyle = withAlpha(shade(rim, -0.15), 0.7);
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + hash01(seed, 10 + i) * 0.9;
      const reach = r * (1.15 + hash01(seed, 20 + i) * 0.45);
      ctx.lineWidth = Math.max(1.2, r * (0.07 + hash01(seed, 30 + i) * 0.06));
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
      ctx.lineTo(Math.cos(a) * reach, Math.sin(a) * reach);
      ctx.stroke();
    }
    // The rim: a lobed ring of churned earth.
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(1.6, r * 0.18);
    ctx.beginPath();
    const lobes = 8;
    for (let i = 0; i <= lobes; i++) {
      const a = (i / lobes) * Math.PI * 2;
      const rr = r * (0.88 + hash01(seed, 40 + (i % lobes)) * 0.16);
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.stroke();
    // The bowl: scorched dark, deepest at heart.
    ctx.fillStyle = char;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(char, -0.35);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    // A dying ember seam — banked heat, not a light source.
    ctx.strokeStyle = withAlpha(ember, 0.35 + hash01(seed, 5) * 0.25);
    ctx.lineWidth = Math.max(0.8, r * 0.05);
    const a0 = hash01(seed, 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, a0, a0 + Math.PI * (0.4 + hash01(seed, 7) * 0.5));
    ctx.stroke();
    ctx.restore();
  }
};

/** THE GABION — a siege-basket: woven wicker drum packed with earth and
 *  rubble, the engineers' instant rampart. Trench lines and gun pits are
 *  rows of these. */
const gabion: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wicker?: ColorSpec; earth?: ColorSpec };
  const { ctx, theme } = env;
  const wicker = resolveColor(p.wicker, theme, '#5a4632');
  const earth = resolveColor(p.earth, theme, '#403228');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 23 + o.pos.y * 7) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The packed fill.
    ctx.fillStyle = earth;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    ctx.fill();
    // Rubble heads poking from the fill.
    ctx.fillStyle = shade(earth, 0.18);
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc((hash01(seed, 10 + i) - 0.5) * r * 1.1,
        (hash01(seed, 20 + i) - 0.5) * r * 1.1,
        Math.max(1.2, r * (0.12 + hash01(seed, 30 + i) * 0.1)), 0, Math.PI * 2);
      ctx.fill();
    }
    // The weave: the wicker band, dashed to read as basketwork.
    ctx.strokeStyle = wicker;
    ctx.lineWidth = Math.max(2, r * 0.2);
    ctx.setLineDash([Math.max(2, r * 0.24), Math.max(1.5, r * 0.13)]);
    ctx.lineDashOffset = hash01(seed, 3) * 10;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = shade(wicker, -0.35);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
};

/** THE SHOT PILE — hellstone ammunition pyramided beside the guns, each
 *  ball seamed with banked ember (the shotHopper part painter's ground
 *  twin — gun and dump read as one arsenal at a glance). */
const shotPile: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { stone?: ColorSpec; ember?: ColorSpec };
  const { ctx, theme } = env;
  const stone = resolveColor(p.stone, theme, '#2a2226');
  const ember = resolveColor(p.ember, theme, '#ff7a3a');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 11 + o.pos.y * 19) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Base course + crown: nested spheres reading as a pyramid from above.
    const balls: Array<[number, number, number]> = [];
    const n = 3 + Math.floor(hash01(seed, 1) * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash01(seed, 2) * 0.8;
      balls.push([Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.38]);
    }
    balls.push([0, 0, r * 0.42]); // the crown ball
    for (const [bx, by, br] of balls) {
      ctx.fillStyle = stone;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = shade(stone, -0.4);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = withAlpha(ember, 0.55);
      ctx.lineWidth = Math.max(0.8, br * 0.22);
      const a0 = hash01(((bx * 7 + by * 3) | 0) + seed, 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(bx, by, br * 0.55, a0, a0 + Math.PI * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }
};

/** THE SIEGE WRECK — an engine that lost its argument: skids snapped out
 *  of true, the arm thrown clear, strap-plates scattered. The old war's
 *  furniture (the standing Bale Trebuchet is a MONSTER — this is what it
 *  leaves; the silhouettes rhyme so both read at a glance). */
const siegeWreck: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { timber?: ColorSpec; char?: ColorSpec; iron?: ColorSpec };
  const { ctx, theme } = env;
  const timber = resolveColor(p.timber, theme, '#4a3626');
  const char = resolveColor(p.char, theme, '#241d1a');
  const iron = resolveColor(p.iron, theme, '#55505c');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 29 + o.pos.y * 13) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? 0);
    // Scorch shadow under the wreck.
    ctx.fillStyle = withAlpha(char, 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.05, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // The skids: two runners, one kicked off-axis.
    ctx.strokeStyle = timber;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2.5, r * 0.16);
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.4); ctx.lineTo(r * 0.8, -r * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.35);
    ctx.lineTo(r * 0.55, r * 0.62);
    ctx.stroke();
    // The snapped arm thrown across, its break charred.
    const aa = 0.5 + hash01(seed, 3) * 0.6;
    ctx.strokeStyle = shade(timber, 0.12);
    ctx.lineWidth = Math.max(2.2, r * 0.13);
    ctx.beginPath();
    ctx.moveTo(-Math.cos(aa) * r * 0.7, -Math.sin(aa) * r * 0.7);
    ctx.lineTo(Math.cos(aa) * r * 0.55, Math.sin(aa) * r * 0.55);
    ctx.stroke();
    ctx.fillStyle = char;
    ctx.beginPath();
    ctx.arc(Math.cos(aa) * r * 0.55, Math.sin(aa) * r * 0.55, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    // Scattered strap-plates.
    ctx.fillStyle = iron;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc((hash01(seed, 10 + i) - 0.5) * r * 1.5,
        (hash01(seed, 20 + i) - 0.5) * r * 1.2,
        Math.max(1.2, r * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

/** THE WAR STANDARD — Bhorog's mark planted in taken ground: an iron-shod
 *  pole, the pennon streaming at a seed-picked set (baked, so it holds),
 *  a sigil plate at the foot. Columns muster to these; roads wear rows of
 *  them. (demon_banner is invasion WEATHER-dress — this is the country's
 *  own furniture; the two never share a zone's meaning.) */
const warStandard: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { cloth?: ColorSpec; pole?: ColorSpec; sigil?: ColorSpec };
  const { ctx, theme } = env;
  const cloth = resolveColor(p.cloth, theme, '#8a3a2a');
  const pole = resolveColor(p.pole, theme, '#3a3026');
  const sigil = resolveColor(p.sigil, theme, '#e8c060');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 19 + o.pos.y * 23) | 0) >>> 0;
    const stream = hash01(seed, 1) * Math.PI * 2;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Trampled ring at the foot.
    ctx.strokeStyle = withAlpha(shade(pole, -0.2), 0.45);
    ctx.lineWidth = Math.max(1.2, r * 0.12);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    // The pennon: a long tapering stream from the pole head.
    ctx.fillStyle = cloth;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const px = Math.cos(stream), py = Math.sin(stream);
    const nx = -py, ny = px;
    ctx.lineTo(px * r * 0.6 + nx * r * 0.42, py * r * 0.6 + ny * r * 0.42);
    ctx.lineTo(px * r * 2.1 + nx * r * 0.1, py * r * 2.1 + ny * r * 0.1);
    ctx.lineTo(px * r * 1.6 - nx * r * 0.28, py * r * 1.6 - ny * r * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(cloth, -0.3);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    // A notch torn from the fly end.
    ctx.fillStyle = withAlpha(shade(cloth, -0.5), 0.9);
    ctx.beginPath();
    ctx.moveTo(px * r * 2.1 + nx * r * 0.1, py * r * 2.1 + ny * r * 0.1);
    ctx.lineTo(px * r * 1.82, py * r * 1.82);
    ctx.lineTo(px * r * 1.6 - nx * r * 0.28, py * r * 1.6 - ny * r * 0.28);
    ctx.closePath();
    ctx.fill();
    // The pole and its iron shoe.
    ctx.fillStyle = pole;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, r * 0.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = shade(pole, -0.35);
    ctx.lineWidth = 1;
    ctx.stroke();
    // The sigil plate: Bhorog's Ξ — three bars south of the pole shoe.
    ctx.strokeStyle = withAlpha(sigil, 0.9);
    ctx.lineWidth = Math.max(1, r * 0.07);
    for (const dy of [-1, 0, 1]) {
      const sy = r * 0.55 + dy * r * 0.16;
      ctx.beginPath();
      ctx.moveTo(-r * 0.26, sy);
      ctx.lineTo(r * 0.26, sy);
      ctx.stroke();
    }
    ctx.restore();
  }
};

PAINTERS.shellPock = shellPock;
PAINTERS.gabion = gabion;
PAINTERS.shotPile = shotPile;
PAINTERS.siegeWreck = siegeWreck;
PAINTERS.warStandard = warStandard;
