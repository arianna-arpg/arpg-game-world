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

PAINTERS.cloudBillow = cloudBillow;
PAINTERS.aetherCrystal = aetherCrystal;
PAINTERS.seraphStatue = seraphStatue;
PAINTERS.harpPillar = harpPillar;
PAINTERS.prayerBell = prayerBell;
PAINTERS.ascendantGate = ascendantGate;
PAINTERS.skyGeyser = skyGeyser;
