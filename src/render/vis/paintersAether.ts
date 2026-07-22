// ---------------------------------------------------------------------------
// AETHERIAL PAINTERS — the cloud-realm kit's brushes, registered into the
// open PAINTERS record from OUTSIDE the library (the paintersGloam contract:
// a biome kit brings its own looks, no painters.ts edit). Side-effect
// imported by the renderer beside the library itself.
//
// The palette discipline: cloud-stuff is WHITE ON WHITE — form comes from
// blue-grey shadow underbellies and warm sunlit crowns, never outlines. The
// built things (statues, pillars, the gate) are marble + aurum: pale stone,
// thin gold, and a glow the light layer finishes.
// ---------------------------------------------------------------------------

import { PAINTERS, resolveColor, type ColorSpec, type GroupPainter } from './painters';
import { hash01, shade, withAlpha } from './color';

/** A CLOUD BILLOW — a heaped, sunlit mound of cloud-stuff: overlapping soft
 *  lobes, shadowed on the underside, crowned bright. The shelf's boulder. */
const cloudBillow: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { body?: ColorSpec; shadow?: ColorSpec; crown?: ColorSpec };
  const { ctx, theme } = env;
  const body = resolveColor(p.body, theme, '#e7ecf7');
  const shadow = resolveColor(p.shadow, theme, '#a9b6d4');
  const crown = resolveColor(p.crown, theme, '#fdfdff');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 17 + o.pos.y * 13) | 0) >>> 0;
    const lobes = 4 + Math.floor(hash01(seed, 1) * 3);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Shadow underbelly first: the mound sits ON something.
    ctx.fillStyle = withAlpha(shadow, 0.8);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.22, r * 1.02, r * 0.66, 0, 0, Math.PI * 2);
    ctx.fill();
    // The heap: lobes clustered off-center, bigger toward the middle.
    for (let i = 0; i < lobes; i++) {
      const a = hash01(seed, 3 + i) * Math.PI * 2;
      const d = (0.16 + hash01(seed, 9 + i) * 0.38) * r;
      const lr = r * (0.4 + hash01(seed, 15 + i) * 0.3);
      const lx = Math.cos(a) * d, ly = Math.sin(a) * d * 0.7 - r * 0.08;
      ctx.fillStyle = shade(body, -0.05 + hash01(seed, 21 + i) * 0.1);
      ctx.beginPath();
      ctx.ellipse(lx, ly, lr, lr * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The sunlit crown: one bright lobe riding the top of the pile.
    ctx.fillStyle = withAlpha(crown, 0.9);
    ctx.beginPath();
    ctx.ellipse(-r * 0.12, -r * 0.3, r * 0.5, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

/** An AETHER CRYSTAL — a splay of luminous shards leaning out of the cloud,
 *  each facet split light/dark down its spine. The light layer supplies the
 *  actual radiance (DOODAD_VISUALS.light). */
const aetherCrystal: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { body?: ColorSpec; deep?: ColorSpec; gleam?: ColorSpec };
  const { ctx, theme } = env;
  const body = resolveColor(p.body, theme, '#bcd6ff');
  const deep = resolveColor(p.deep, theme, '#6c86c8');
  const gleam = resolveColor(p.gleam, theme, '#ffffff');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 23 + o.pos.y * 7) | 0) >>> 0;
    const shards = 3 + Math.floor(hash01(seed, 1) * 3);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // A soft mist skirt where the shards meet the cloud.
    ctx.fillStyle = withAlpha(deep, 0.28);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.18, r * 0.95, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < shards; i++) {
      const a = (i / shards) * Math.PI * 2 + hash01(seed, 2 + i) * 0.8;
      const len = r * (0.72 + hash01(seed, 8 + i) * 0.55);
      const w = r * (0.16 + hash01(seed, 14 + i) * 0.12);
      const tx = Math.cos(a) * len, ty = Math.sin(a) * len * 0.85 - r * 0.1;
      const bx = Math.cos(a + Math.PI / 2) * w, by = Math.sin(a + Math.PI / 2) * w;
      // Dark facet / lit facet, split down the shard's spine.
      ctx.fillStyle = shade(deep, hash01(seed, 20 + i) * 0.12);
      ctx.beginPath();
      ctx.moveTo(-bx * 0.6, -by * 0.6);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx * 0.6, by * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(body, hash01(seed, 26 + i) * 0.1);
      ctx.beginPath();
      ctx.moveTo(-bx * 0.6, -by * 0.6);
      ctx.lineTo(tx, ty);
      ctx.lineTo(-bx * 0.2 + tx * 0.2, -by * 0.2 + ty * 0.2);
      ctx.closePath();
      ctx.fill();
      // The gleam: a thin bright line up the lit edge.
      ctx.strokeStyle = withAlpha(gleam, 0.75);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-bx * 0.3, -by * 0.3);
      ctx.lineTo(tx * 0.92, ty * 0.92);
      ctx.stroke();
    }
    ctx.restore();
  }
};

/** A SERAPH STATUE — pale marble on a plinth: a robed figure, wings folded
 *  back, head bowed over crossed hands. Weathered gold leaf at the wing
 *  edges. Reads top-down as plinth + shoulders + the wing sweep. */
const seraphStatue: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { marble?: ColorSpec; shadow?: ColorSpec; gold?: ColorSpec };
  const { ctx, theme } = env;
  const marble = resolveColor(p.marble, theme, '#e3e2dc');
  const dark = resolveColor(p.shadow, theme, '#9a9aa4');
  const gold = resolveColor(p.gold, theme, '#d8b56a');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 29 + o.pos.y * 11) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? (hash01(seed, 1) - 0.5) * 0.9);
    // The plinth: a squared base, bevel-lit on one corner.
    ctx.fillStyle = shade(dark, -0.08);
    ctx.fillRect(-r * 0.62, -r * 0.62, r * 1.24, r * 1.24);
    ctx.fillStyle = marble;
    ctx.fillRect(-r * 0.52, -r * 0.52, r * 1.04, r * 1.04);
    ctx.fillStyle = withAlpha(shade(marble, 0.12), 0.9);
    ctx.fillRect(-r * 0.52, -r * 0.52, r * 1.04, r * 0.2);
    // The wing sweep: two long folded arcs trailing one way.
    for (const s of [-1, 1]) {
      ctx.fillStyle = shade(marble, s < 0 ? -0.06 : 0.03);
      ctx.beginPath();
      ctx.ellipse(-r * 0.34, s * r * 0.22, r * 0.62, r * 0.2, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      // Gold leaf at the trailing edge, mostly weathered off.
      ctx.strokeStyle = withAlpha(gold, 0.6);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(-r * 0.34, s * r * 0.22, r * 0.6, r * 0.185, s * 0.28, 2.6, 4.0);
      ctx.stroke();
    }
    // Shoulders + the bowed head.
    ctx.fillStyle = shade(marble, 0.05);
    ctx.beginPath();
    ctx.ellipse(r * 0.08, 0, r * 0.3, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(marble, 0.12);
    ctx.beginPath();
    ctx.arc(r * 0.24, 0, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
    // The halo ring, gold, slightly askew — the one thing time hasn't dulled.
    ctx.strokeStyle = withAlpha(gold, 0.85);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(r * 0.24, 0, r * 0.2, r * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
};

/** A HARP PILLAR — a slender fluted column strung with light: the arcade the
 *  wind plays. Strings shimmer on the sim clock. */
const harpPillar: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { marble?: ColorSpec; string?: ColorSpec; gold?: ColorSpec };
  const { ctx, theme, time } = env;
  const marble = resolveColor(p.marble, theme, '#e6e5df');
  const string = resolveColor(p.string, theme, '#ffe9a8');
  const gold = resolveColor(p.gold, theme, '#d8b56a');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 31 + o.pos.y * 19) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Base disc + fluting: a column seen from above, ribs radiating.
    ctx.fillStyle = shade(marble, -0.18);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = marble;
    ctx.beginPath();
    ctx.arc(-r * 0.08, -r * 0.08, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(shade(marble, -0.3), 0.7);
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
      ctx.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
      ctx.stroke();
    }
    // The strings: a chord of taut lines across one face, shimmering.
    const shimmer = 0.5 + Math.sin(time * 2.2 + seed) * 0.25;
    ctx.strokeStyle = withAlpha(string, shimmer);
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const off = -r * 0.45 + i * r * 0.3;
      ctx.beginPath();
      ctx.moveTo(off, -r * 0.95);
      ctx.lineTo(off * 0.6, r * 0.95);
      ctx.stroke();
    }
    // A gold capital ring.
    ctx.strokeStyle = withAlpha(gold, 0.8);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-r * 0.08, -r * 0.08, r * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
};

/** A PRAYER BELL — a small bronze bell hung in a marble yoke, its pull-cord
 *  trailing. Sways a whisper on the sim clock. */
const prayerBell: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { bronze?: ColorSpec; marble?: ColorSpec; cord?: ColorSpec };
  const { ctx, theme, time } = env;
  const bronze = resolveColor(p.bronze, theme, '#b9935a');
  const marble = resolveColor(p.marble, theme, '#e0dfd8');
  const cord = resolveColor(p.cord, theme, '#c8d4ea');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 13 + o.pos.y * 29) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(o.rot ?? hash01(seed, 1) * Math.PI * 2);
    // The yoke: two marble posts + the lintel.
    ctx.fillStyle = marble;
    ctx.fillRect(-r * 0.7, -r * 0.16, r * 0.24, r * 0.32);
    ctx.fillRect(r * 0.46, -r * 0.16, r * 0.24, r * 0.32);
    ctx.fillStyle = shade(marble, -0.12);
    ctx.fillRect(-r * 0.7, -r * 0.1, r * 1.4, r * 0.2);
    // The bell: a bronze dome swaying between them.
    const sway = Math.sin(time * 1.4 + seed) * r * 0.06;
    ctx.fillStyle = bronze;
    ctx.beginPath();
    ctx.arc(sway, 0, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(bronze, 0.25);
    ctx.beginPath();
    ctx.arc(sway - r * 0.1, -r * 0.1, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // The clapper cord trailing off the rim.
    ctx.strokeStyle = withAlpha(cord, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sway, r * 0.3);
    ctx.quadraticCurveTo(sway + r * 0.3, r * 0.6, sway + r * 0.2, r * 0.9);
    ctx.stroke();
    ctx.restore();
  }
};

/** THE ASCENDANT GATE — the realm gate at a shelf's far end: two marble
 *  posts leaning into a broken arch, the span between them filled with
 *  slow-breathing light. The dwell ring and the light layer finish it. */
const ascendantGate: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { marble?: ColorSpec; light?: ColorSpec; gold?: ColorSpec };
  const { ctx, theme, time } = env;
  const marble = resolveColor(p.marble, theme, '#e8e7e1');
  const light = resolveColor(p.light, theme, '#ffeeb8');
  const gold = resolveColor(p.gold, theme, '#d8b56a');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 37 + o.pos.y * 17) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The threshold slab.
    ctx.fillStyle = withAlpha(shade(marble, -0.22), 0.9);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.15, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    // The light in the span: layered breathing lobes.
    const breathe = 0.75 + Math.sin(time * 1.1 + seed) * 0.25;
    for (let i = 3; i >= 1; i--) {
      ctx.fillStyle = withAlpha(light, 0.16 * breathe * i);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.08, r * (0.28 * i), r * (0.2 * i), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The two posts, leaning toward each other.
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * r * 0.72, 0);
      ctx.rotate(-s * 0.14);
      ctx.fillStyle = shade(marble, s < 0 ? -0.05 : 0.04);
      ctx.fillRect(-r * 0.14, -r * 0.6, r * 0.28, r * 1.2);
      ctx.fillStyle = withAlpha(gold, 0.75);
      ctx.fillRect(-r * 0.14, -r * 0.6, r * 0.28, r * 0.1);
      ctx.restore();
    }
    // The broken arch stones, hanging where the span used to be.
    ctx.fillStyle = shade(marble, 0.08);
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.5;
      const fx = Math.cos(a) * r * 0.8;
      const fy = Math.sin(a) * r * 0.55 - r * 0.14;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(a + Math.PI / 2 + hash01(seed, 5 + i) * 0.2);
      ctx.fillRect(-r * 0.12, -r * 0.07, r * 0.24, r * 0.14);
      ctx.restore();
    }
    ctx.restore();
  }
};

/** A SKY GEYSER — the surface-side mouth of the Ascent: a stone-lipped vent
 *  over restless water, breathing a column of spray on a slow cycle. The
 *  ERUPTION visual rides the dwell/launch; this is the standing tell. */
const skyGeyser: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { stone?: ColorSpec; water?: ColorSpec; spray?: ColorSpec };
  const { ctx, theme, time } = env;
  const stone = resolveColor(p.stone, theme, '#8a8d96');
  const water = resolveColor(p.water, theme, '#7fc4d8');
  const spray = resolveColor(p.spray, theme, '#eef6fb');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 41 + o.pos.y * 23) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The mineral terrace: rings of pale stone stained by the spray.
    for (let i = 3; i >= 1; i--) {
      ctx.fillStyle = shade(stone, 0.06 * i - 0.1);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * (0.45 + i * 0.22), r * (0.36 + i * 0.18), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The vent pool, deep-bright.
    ctx.fillStyle = water;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.4, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    // The breath: a spray column gathering and sighing on a slow cycle.
    const cycle = (Math.sin(time * 0.8 + seed) + 1) / 2;
    const puff = 0.25 + cycle * 0.75;
    for (let i = 0; i < 4; i++) {
      const a = hash01(seed, 3 + i) * Math.PI * 2 + time * 0.3;
      const d = r * 0.15 * i * puff;
      ctx.fillStyle = withAlpha(spray, (0.5 - i * 0.1) * puff);
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * d * 0.4, -d * 0.5,
        r * (0.2 + i * 0.12) * puff, r * (0.14 + i * 0.1) * puff, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Rim droplets flicking off the terrace.
    ctx.fillStyle = withAlpha(spray, 0.7 * puff);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + time * 1.7 + seed;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.6, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

/** THE SPIRE OF DAWN — the High Heavens' monument: concentric marble tiers
 *  climbing to a needle that holds a standing lance of light. Top-down: the
 *  tiers read as rings, the needle as a bright heart, the lance as a slow
 *  halo-flare the light layer finishes. */
const spireOfDawn: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { marble?: ColorSpec; gold?: ColorSpec; light?: ColorSpec };
  const { ctx, theme, time } = env;
  const marble = resolveColor(p.marble, theme, '#eceade');
  const gold = resolveColor(p.gold, theme, '#d8b56a');
  const light = resolveColor(p.light, theme, '#fff2c8');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 43 + o.pos.y * 29) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The stepped tiers: each ring lit on its sun side, seamed in gold.
    for (let i = 4; i >= 1; i--) {
      const tr = r * (0.24 + i * 0.19);
      ctx.fillStyle = shade(marble, 0.02 * (4 - i) - 0.08);
      ctx.beginPath();
      ctx.arc(0, 0, tr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = withAlpha(shade(marble, 0.14), 0.75);
      ctx.beginPath();
      ctx.arc(-tr * 0.18, -tr * 0.18, tr * 0.82, Math.PI * 0.85, Math.PI * 1.85);
      ctx.arc(0, 0, tr, Math.PI * 1.85, Math.PI * 0.85, true);
      ctx.fill();
      ctx.strokeStyle = withAlpha(gold, 0.6);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, tr, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Buttress fins between the outer tiers.
    ctx.fillStyle = shade(marble, -0.16);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + hash01(seed, 2) * 0.5;
      ctx.save();
      ctx.rotate(a);
      ctx.fillRect(r * 0.62, -r * 0.05, r * 0.34, r * 0.1);
      ctx.restore();
    }
    // The needle heart + the standing lance (a breathing flare).
    const breathe = 0.7 + Math.sin(time * 1.3 + seed) * 0.3;
    for (let i = 3; i >= 1; i--) {
      ctx.fillStyle = withAlpha(light, 0.18 * breathe * i);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.1 * i, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

// ===========================================================================
// THE DRIFTWAYS KIT (aether_drift) — wind furniture. Everything here reads
// MOTION: streamers and chimes lean one seeded prevailing way and flutter on
// the frame clock, so even the still ground says which way the sky is going.
// ===========================================================================

/** A ZEPHYR TOTEM — a carved wind-spirit pole trailing pale streamers. */
const zephyrTotem: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wood?: ColorSpec; carve?: ColorSpec; streamer?: ColorSpec };
  const { ctx, theme, time } = env;
  const wood = resolveColor(p.wood, theme, '#b9c4dc');
  const carve = resolveColor(p.carve, theme, '#7f8db4');
  const streamer = resolveColor(p.streamer, theme, '#bfe8f4');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 19 + o.pos.y * 11) | 0) >>> 0;
    const wind = hash01(seed, 1) * Math.PI * 2; // the prevailing lean
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Footing shadow + the pole seen from above: a ringed disc.
    ctx.fillStyle = withAlpha(carve, 0.4);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.16, r * 0.8, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2);
    ctx.fill();
    // Carved rings: the spirit's spiraling grooves.
    ctx.strokeStyle = carve;
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(0, 0, r * (0.18 + k * 0.14), wind + k, wind + k + Math.PI * 1.4);
      ctx.stroke();
    }
    // The crown notch: a pale carved eye looking downwind.
    ctx.fillStyle = shade(wood, 0.18);
    ctx.beginPath();
    ctx.arc(Math.cos(wind) * r * 0.2, Math.sin(wind) * r * 0.2, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    // Streamers: two or three ribbons flowing downwind, fluttering.
    const n = 2 + Math.floor(hash01(seed, 4) * 2);
    for (let k = 0; k < n; k++) {
      const flut = Math.sin(time * (2.2 + k * 0.7) + seed + k * 2.1) * 0.22;
      const a = wind + (k - (n - 1) / 2) * 0.34 + flut * 0.4;
      const len = r * (1.5 + hash01(seed, 8 + k) * 0.9);
      const mx = Math.cos(a + flut * 0.5) * len * 0.55, my = Math.sin(a + flut * 0.5) * len * 0.55;
      const ex = Math.cos(a) * len, ey = Math.sin(a) * len;
      ctx.strokeStyle = withAlpha(streamer, 0.85 - k * 0.14);
      ctx.lineCap = 'round';
      ctx.lineWidth = 2.4 - k * 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
      ctx.quadraticCurveTo(mx, my, ex, ey + Math.sin(time * 3 + k) * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
};

/** A SKY LANTERN — a tethered paper lantern bobbing on the wind: warm light
 *  on a leash (the light layer supplies the radiance). */
const skyLantern: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { paper?: ColorSpec; frame?: ColorSpec; glow?: ColorSpec };
  const { ctx, theme, time } = env;
  const paper = resolveColor(p.paper, theme, '#ffe6c0');
  const frame = resolveColor(p.frame, theme, '#c88a4a');
  const glow = resolveColor(p.glow, theme, '#ffd27f');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 29 + o.pos.y * 17) | 0) >>> 0;
    const bobX = Math.sin(time * 1.1 + seed) * r * 0.18;
    const bobY = Math.sin(time * 1.4 + seed * 1.7) * r * 0.14;
    const lx = bobX + r * 0.2, ly = -r * 0.7 + bobY; // floats up-right of its stake
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The stake + tether.
    ctx.fillStyle = shade(frame, -0.25);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(frame, 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(lx * 0.4, ly * 0.55, lx, ly);
    ctx.stroke();
    // The lantern: glow halo, paper body, ribs, a warm heart.
    ctx.fillStyle = withAlpha(glow, 0.18);
    ctx.beginPath();
    ctx.arc(lx, ly, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = paper;
    ctx.beginPath();
    ctx.ellipse(lx, ly, r * 0.46, r * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(frame, 0.8);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(lx, ly, r * 0.46, r * 0.56, 0, 0, Math.PI * 2);
    ctx.moveTo(lx - r * 0.46, ly);
    ctx.lineTo(lx + r * 0.46, ly);
    ctx.stroke();
    ctx.fillStyle = withAlpha(glow, 0.9);
    ctx.beginPath();
    ctx.arc(lx, ly + r * 0.08, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

/** An AEOLIAN CHIME STAND — two posts, a lintel, and a rank of swaying
 *  tubes: the wind plays the zone's score. */
const chimeStand: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { frame?: ColorSpec; chime?: ColorSpec; cord?: ColorSpec };
  const { ctx, theme, time } = env;
  const frame = resolveColor(p.frame, theme, '#e6e5df');
  const chime = resolveColor(p.chime, theme, '#d8e8f4');
  const cord = resolveColor(p.cord, theme, '#8a90a8');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 13 + o.pos.y * 23) | 0) >>> 0;
    const rot = hash01(seed, 1) * Math.PI;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    ctx.rotate(rot);
    // Posts + lintel (seen from above: a thin bar between two feet).
    ctx.fillStyle = shade(frame, -0.2);
    ctx.beginPath();
    ctx.arc(-r * 0.85, 0, r * 0.2, 0, Math.PI * 2);
    ctx.arc(r * 0.85, 0, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = frame;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, 0);
    ctx.lineTo(r * 0.85, 0);
    ctx.stroke();
    // The tubes: hung in a rank, each swaying to its own beat.
    const n = 4 + Math.floor(hash01(seed, 3) * 2);
    for (let k = 0; k < n; k++) {
      const x = -r * 0.66 + (k / (n - 1)) * r * 1.32;
      const sway = Math.sin(time * (1.8 + k * 0.33) + seed + k) * r * 0.12;
      const len = r * (0.34 + hash01(seed, 6 + k) * 0.3);
      ctx.strokeStyle = withAlpha(cord, 0.8);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + sway, len * 0.4);
      ctx.stroke();
      ctx.strokeStyle = shade(chime, hash01(seed, 12 + k) * 0.12 - 0.02);
      ctx.lineCap = 'round';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x + sway, len * 0.4);
      ctx.lineTo(x + sway * 1.5, len * 0.4 + len);
      ctx.stroke();
    }
    ctx.restore();
  }
};

/** A GALE VANE — a weathervane arrow leaning hard into the prevailing run:
 *  the drift's direction, posted. */
const galeVane: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { pole?: ColorSpec; vane?: ColorSpec; tail?: ColorSpec };
  const { ctx, theme, time } = env;
  const pole = resolveColor(p.pole, theme, '#9aa4c0');
  const vane = resolveColor(p.vane, theme, '#ffd27f');
  const tail = resolveColor(p.tail, theme, '#dce6f2');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 31 + o.pos.y * 7) | 0) >>> 0;
    const dir = hash01(seed, 1) * Math.PI * 2 + Math.sin(time * 0.9 + seed) * 0.08;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The pole footing.
    ctx.fillStyle = shade(pole, -0.2);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(dir);
    // The shaft, the head, the split tail feathers.
    ctx.strokeStyle = pole;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, 0);
    ctx.lineTo(r * 0.62, 0);
    ctx.stroke();
    ctx.fillStyle = vane;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(r * 0.5, -r * 0.22);
    ctx.lineTo(r * 0.5, r * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = withAlpha(tail, 0.9);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, 0);
      ctx.lineTo(-r * 1.06, s * r * 0.26);
      ctx.lineTo(-r * 0.58, s * r * 0.08);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
};

/** CLOUD CORAL — wind-sculpted vapor-stone: stacked crescent shelf-fins
 *  fanned downwind, shadowed beneath, rim-lit above. The drift's reef. */
const cloudCoral: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { body?: ColorSpec; shade?: ColorSpec; rim?: ColorSpec };
  const { ctx, theme } = env;
  const body = resolveColor(p.body, theme, '#e4ebf6');
  const dark = resolveColor(p.shade, theme, '#a2b2d2');
  const rim = resolveColor(p.rim, theme, '#fdfdff');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 37 + o.pos.y * 3) | 0) >>> 0;
    const wind = hash01(seed, 1) * Math.PI * 2;
    const fins = 3 + Math.floor(hash01(seed, 2) * 3);
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Root shadow.
    ctx.fillStyle = withAlpha(dark, 0.7);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.18, r * 0.9, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    // Fins: crescents fanned downwind, each smaller and paler than the last.
    for (let k = fins - 1; k >= 0; k--) {
      const a = wind + (k - (fins - 1) / 2) * 0.5;
      const d = r * (0.12 + k * 0.16);
      const fr = r * (0.72 - k * 0.1) * (0.8 + hash01(seed, 6 + k) * 0.35);
      const fx = Math.cos(a) * d, fy = Math.sin(a) * d * 0.8;
      ctx.fillStyle = shade(body, -0.06 + k * 0.045);
      ctx.beginPath();
      ctx.ellipse(fx, fy, fr, fr * 0.62, a, 0, Math.PI * 2);
      ctx.fill();
      // The lit rim on the windward crest.
      ctx.strokeStyle = withAlpha(rim, 0.7 - k * 0.1);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(fx, fy - fr * 0.12, fr * 0.85, fr * 0.5, a, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }
    ctx.restore();
  }
};

/** THE SPIRE OF GALES — the Driftways monument: tiered marble crowned with
 *  a great vane and long streamers running the prevailing way. */
const spireOfGales: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { marble?: ColorSpec; gold?: ColorSpec; streamer?: ColorSpec };
  const { ctx, theme, time } = env;
  const marble = resolveColor(p.marble, theme, '#e6e5df');
  const gold = resolveColor(p.gold, theme, '#d8b56a');
  const streamer = resolveColor(p.streamer, theme, '#bfe8f4');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 11 + o.pos.y * 29) | 0) >>> 0;
    const wind = hash01(seed, 1) * Math.PI * 2;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Tiers: three stacked discs, lit-side split like the dawn spire.
    for (let k = 0; k < 3; k++) {
      const tr = r * (1 - k * 0.28);
      ctx.fillStyle = shade(marble, -0.14 + k * 0.05);
      ctx.beginPath();
      ctx.arc(0, 0, tr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = withAlpha(shade(marble, 0.12), 0.75);
      ctx.beginPath();
      ctx.arc(-tr * 0.16, -tr * 0.16, tr * 0.84, Math.PI * 0.85, Math.PI * 1.85);
      ctx.arc(0, 0, tr, Math.PI * 1.85, Math.PI * 0.85, true);
      ctx.fill();
      ctx.strokeStyle = withAlpha(gold, 0.55);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, tr, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The crown vane: a gold arrow riding the wind's set.
    ctx.save();
    ctx.rotate(wind + Math.sin(time * 0.8 + seed) * 0.06);
    ctx.strokeStyle = shade(gold, -0.1);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.34, 0);
    ctx.lineTo(r * 0.3, 0);
    ctx.stroke();
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(r * 0.5, 0);
    ctx.lineTo(r * 0.24, -r * 0.12);
    ctx.lineTo(r * 0.24, r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Long streamers off the crown, fluttering downwind.
    for (let k = 0; k < 4; k++) {
      const flut = Math.sin(time * (1.9 + k * 0.5) + seed + k * 1.7) * 0.18;
      const a = wind + (k - 1.5) * 0.22 + flut * 0.5;
      const len = r * (1.7 + hash01(seed, 9 + k) * 0.8);
      ctx.strokeStyle = withAlpha(streamer, 0.75 - k * 0.12);
      ctx.lineCap = 'round';
      ctx.lineWidth = 2.2 - k * 0.35;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4);
      ctx.quadraticCurveTo(Math.cos(a + flut) * len * 0.55, Math.sin(a + flut) * len * 0.55,
        Math.cos(a) * len, Math.sin(a) * len + Math.sin(time * 2.6 + k) * 2.5);
      ctx.stroke();
    }
    ctx.restore();
  }
};

/** A VOTIVE BANK — tiers of offered candles: a dark frame holding ranked
 *  wax lights, each flame swaying on its own clock. The light layer carries
 *  the true glow (DOODAD_VISUALS.light rides the radiance lerp); this paint
 *  is the furniture and the honest little fires. */
const votiveBank: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { wax?: ColorSpec; frame?: ColorSpec; flame?: ColorSpec };
  const { ctx, theme, time } = env;
  const wax = resolveColor(p.wax, theme, '#f4ecd8');
  const frame = resolveColor(p.frame, theme, '#7a6844');
  const flame = resolveColor(p.flame, theme, '#ffd890');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 19 + o.pos.y * 11) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The rack: two shallow tiers, the rear one raised.
    ctx.fillStyle = frame;
    ctx.fillRect(-r, -r * 0.16, r * 2, r * 0.5);
    ctx.fillStyle = shade(frame, -0.18);
    ctx.fillRect(-r * 0.92, -r * 0.52, r * 1.84, r * 0.34);
    // Candles: ranked stubs of uneven burn, a flame atop each.
    for (let tier = 0; tier < 2; tier++) {
      const n = 4 + Math.floor(hash01(seed, tier) * 3);
      const ty = tier === 0 ? -r * 0.02 : -r * 0.42;
      for (let i = 0; i < n; i++) {
        const cxp = -r * 0.8 + (i + 0.5) * (r * 1.6 / n);
        const hgt = r * (0.22 + hash01(seed, 7 + tier * 9 + i) * 0.26);
        ctx.fillStyle = shade(wax, -0.04 + hash01(seed, 20 + i) * 0.08);
        ctx.fillRect(cxp - r * 0.05, ty - hgt, r * 0.1, hgt);
        const sway = Math.sin(time * (2.4 + hash01(seed, 30 + i) * 1.8) + i * 1.7) * r * 0.03;
        ctx.fillStyle = withAlpha(flame, 0.9);
        ctx.beginPath();
        ctx.ellipse(cxp + sway, ty - hgt - r * 0.07, r * 0.045, r * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
};

/** THE EMPTY THRONE — the truest seat, unoccupied: a stepped dais, a tall
 *  gold-rimmed back, arms squared — and nothing seated in it. The vacancy IS
 *  the statement; a soft column of light (the light layer) stands where the
 *  occupant will not. */
const emptyThrone: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { stone?: ColorSpec; gold?: ColorSpec; shade?: ColorSpec };
  const { ctx, theme } = env;
  const stone = resolveColor(p.stone, theme, '#f4efe2');
  const gold = resolveColor(p.gold, theme, '#ffd97a');
  const dark = resolveColor(p.shade, theme, '#b8a878');
  for (const o of group) {
    const r = o.radius;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // Dais: two worn steps.
    ctx.fillStyle = withAlpha(dark, 0.55);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.34, r * 1.25, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = withAlpha(shade(stone, -0.08), 0.9);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.28, r * 1.0, r * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    // The high back: a tall tapered slab, gold-rimmed.
    ctx.fillStyle = shade(stone, 0.04);
    ctx.beginPath();
    ctx.moveTo(-r * 0.52, r * 0.05);
    ctx.lineTo(-r * 0.4, -r * 1.35);
    ctx.quadraticCurveTo(0, -r * 1.62, r * 0.4, -r * 1.35);
    ctx.lineTo(r * 0.52, r * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(gold, 0.9);
    ctx.lineWidth = Math.max(1.6, r * 0.07);
    ctx.stroke();
    // The seat and its arms — squared, waiting.
    ctx.fillStyle = shade(stone, -0.12);
    ctx.fillRect(-r * 0.42, -r * 0.12, r * 0.84, r * 0.34);
    ctx.fillStyle = shade(stone, -0.02);
    ctx.fillRect(-r * 0.56, -r * 0.2, r * 0.16, r * 0.5);
    ctx.fillRect(r * 0.4, -r * 0.2, r * 0.16, r * 0.5);
    // The gold sun-disc where a head would rest — over nobody.
    ctx.strokeStyle = withAlpha(gold, 0.8);
    ctx.lineWidth = Math.max(1.2, r * 0.05);
    ctx.beginPath();
    ctx.arc(0, -r * 1.02, r * 0.26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
};

/** A PIPE ORGAN — the choir's engine: a dark wind-chest under ranked pale
 *  pipes rising to the center, every mouth ringed gold. Static; the singing
 *  is the zone's own (puzzle refrains, the lyrist's aura). */
const pipeOrgan: GroupPainter = (env, group, def) => {
  const p = (def.params ?? {}) as { pipes?: ColorSpec; chest?: ColorSpec; gold?: ColorSpec };
  const { ctx, theme } = env;
  const pipes = resolveColor(p.pipes, theme, '#d8ccae');
  const chest = resolveColor(p.chest, theme, '#584430');
  const gold = resolveColor(p.gold, theme, '#c8a44a');
  for (const o of group) {
    const r = o.radius;
    const seed = ((o.pos.x * 13 + o.pos.y * 29) | 0) >>> 0;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    // The wind-chest: a stout case with a gold keyline.
    ctx.fillStyle = chest;
    ctx.fillRect(-r, -r * 0.1, r * 2, r * 0.62);
    ctx.strokeStyle = withAlpha(gold, 0.7);
    ctx.lineWidth = Math.max(1.2, r * 0.05);
    ctx.strokeRect(-r * 0.94, -r * 0.04, r * 1.88, r * 0.5);
    // Ranked pipes: tallest at center, mouths ringed gold.
    const n = 7 + (seed % 2) * 2;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const cxp = -r * 0.86 + t * r * 1.72;
      const hgt = r * (0.7 + Math.sin(Math.PI * t) * 0.85 + hash01(seed, 4 + i) * 0.08);
      const w = r * 0.16;
      ctx.fillStyle = shade(pipes, -0.06 + Math.sin(Math.PI * t) * 0.1);
      ctx.fillRect(cxp - w / 2, -r * 0.1 - hgt, w, hgt);
      ctx.fillStyle = withAlpha(gold, 0.85);
      ctx.fillRect(cxp - w / 2, -r * 0.1 - hgt, w, r * 0.06);
    }
    ctx.restore();
  }
};

PAINTERS.spireOfDawn = spireOfDawn;
PAINTERS.cloudBillow = cloudBillow;
PAINTERS.aetherCrystal = aetherCrystal;
PAINTERS.seraphStatue = seraphStatue;
PAINTERS.harpPillar = harpPillar;
PAINTERS.prayerBell = prayerBell;
PAINTERS.ascendantGate = ascendantGate;
PAINTERS.skyGeyser = skyGeyser;
PAINTERS.zephyrTotem = zephyrTotem;
PAINTERS.skyLantern = skyLantern;
PAINTERS.chimeStand = chimeStand;
PAINTERS.galeVane = galeVane;
PAINTERS.cloudCoral = cloudCoral;
PAINTERS.spireOfGales = spireOfGales;
PAINTERS.votiveBank = votiveBank;
PAINTERS.emptyThrone = emptyThrone;
PAINTERS.pipeOrgan = pipeOrgan;
