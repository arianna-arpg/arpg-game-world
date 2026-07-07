// ---------------------------------------------------------------------------
// ICON GENERATOR — paints build/icon.png (512×512 RGBA) from pure math: a
// dark rounded plate, a gold ring broken open at the bottom (the HOLLOW),
// and teal ripples spilling out of the gap (the WAKE). Zero dependencies —
// scene → per-pixel signed-distance fields → hand-rolled PNG chunks + zlib.
//
// electron-builder derives every platform format from this one PNG (win .ico,
// linux icon set). Deterministic: same script, same bytes — the committed
// build/icon.png only changes when the art math does. Re-run: `npm run icon`.
// ---------------------------------------------------------------------------

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZE = 512;

// ------------------------------------------------------------------- palette
const PLATE_TOP = [0x14, 0x14, 0x1e];   // matches the game's panel palette
const PLATE_BOT = [0x0a, 0x0a, 0x0e];
const GOLD = [0xc8, 0xa8, 0x4b];        // --gold
const TEAL = [0x4f, 0xd8, 0xc8];        // the wake

// ---------------------------------------------------------------- SDF helpers
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** 1.5px anti-alias band around a coverage edge (positive = covered). */
const aa = (x) => { const t = clamp01(x / 1.5 + 0.5); return t * t * (3 - 2 * t); };
const smooth = (lo, hi, x) => { const t = clamp01((x - lo) / (hi - lo)); return t * t * (3 - 2 * t); };
/** Signed distance to a rounded rect centered at 0 (negative inside). */
function sdRoundRect(x, y, hx, hy, r) {
  const qx = Math.abs(x) - (hx - r), qy = Math.abs(y) - (hy - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}
/** Absolute angular distance a↔b in radians (wrap-safe). */
const angDist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

// ------------------------------------------------------------------ the scene
// Screen coords: y grows DOWN, so atan2 angle π/2 points at the plate bottom.
const RING = { cx: 256, cy: 218, R: 116, w: 27, gapAt: Math.PI / 2, gapHalf: 0.5 };
const WAKE = [
  { cy: 320, R: 148, w: 11, a: 0.85 },
  { cy: 320, R: 192, w: 9, a: 0.55 },
  { cy: 320, R: 236, w: 7, a: 0.32 },
];
const WAKE_SPAN = { from: Math.PI * 0.32, to: Math.PI * 0.68 }; // lower arc window

/** Straight-alpha src-over: dst ← src OVER dst. */
function over(dst, r, g, b, a) {
  if (a <= 0) return;
  const outA = a + dst[3] * (1 - a);
  if (outA <= 0) { dst[0] = dst[1] = dst[2] = dst[3] = 0; return; }
  dst[0] = (r * a + dst[0] * dst[3] * (1 - a)) / outA;
  dst[1] = (g * a + dst[1] * dst[3] * (1 - a)) / outA;
  dst[2] = (b * a + dst[2] * dst[3] * (1 - a)) / outA;
  dst[3] = outA;
}

function paint(px, py) {
  const p = [0, 0, 0, 0]; // straight-alpha working pixel

  // 1. Plate: rounded square, vertical gradient, transparent corners.
  const sd = sdRoundRect(px - 256, py - 256, 236, 236, 64);
  const plate = aa(-sd);
  if (plate <= 0) return p;
  const t = clamp01((py - 20) / 472);
  over(p,
    PLATE_TOP[0] + (PLATE_BOT[0] - PLATE_TOP[0]) * t,
    PLATE_TOP[1] + (PLATE_BOT[1] - PLATE_TOP[1]) * t,
    PLATE_TOP[2] + (PLATE_BOT[2] - PLATE_TOP[2]) * t,
    plate);

  // 2. Void glow: a faint teal breath inside the ring.
  const dRing = Math.hypot(px - RING.cx, py - RING.cy);
  if (dRing < RING.R) {
    const g = (1 - dRing / RING.R) ** 2 * 0.20;
    over(p, TEAL[0], TEAL[1], TEAL[2], g * plate);
  }

  // 3. Wake ripples: concentric arcs radiating from below the gap.
  for (const arc of WAKE) {
    const d = Math.hypot(px - 256, py - arc.cy);
    const band = aa(arc.w / 2 - Math.abs(d - arc.R));
    if (band <= 0) continue;
    const ang = Math.atan2(py - arc.cy, px - 256);
    const inSpan = smooth(WAKE_SPAN.from - 0.10, WAKE_SPAN.from + 0.10, ang)
      * (1 - smooth(WAKE_SPAN.to - 0.10, WAKE_SPAN.to + 0.10, ang));
    if (inSpan <= 0) continue;
    over(p, TEAL[0], TEAL[1], TEAL[2], band * inSpan * arc.a * plate);
  }

  // 4. The hollow ring: gold band, top-lit, broken open at the bottom where
  //    the wake spills out.
  const band = aa(RING.w / 2 - Math.abs(dRing - RING.R));
  if (band > 0) {
    const ang = Math.atan2(py - RING.cy, px - RING.cx);
    const cut = smooth(RING.gapHalf - 0.09, RING.gapHalf + 0.09, angDist(ang, RING.gapAt));
    if (cut > 0) {
      const lit = 1 + 0.18 * -Math.sin(ang); // brighter toward the top
      over(p,
        Math.min(255, GOLD[0] * lit), Math.min(255, GOLD[1] * lit), Math.min(255, GOLD[2] * lit),
        band * cut * plate);
    }
  }

  // 5. Plate border: a quiet gold rim.
  over(p, GOLD[0], GOLD[1], GOLD[2], 0.45 * aa(2 - Math.abs(sd)) * plate);
  return p;
}

// ------------------------------------------------------------------ PNG bytes
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  return c;
});
function crc32(buf) {
  let c = ~0;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  const row = y * (SIZE * 4 + 1);
  raw[row] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    const [r, g, b, a] = paint(x + 0.5, y + 0.5);
    const o = row + 1 + x * 4;
    raw[o] = Math.round(r); raw[o + 1] = Math.round(g);
    raw[o + 2] = Math.round(b); raw[o + 3] = Math.round(a * 255);
  }
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'build', 'icon.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`icon: wrote ${out} (${png.length} bytes)`);
